import { createHash } from 'node:crypto';
import type { Config, Provider } from './config.js';
import { credential } from './config.js';
import type { SecretReader } from './aws.js';
import { ServiceError, record } from './errors.js';
import { assertContract, buildUserContext, CAG_CLAIM_IDS, CAG_VERSION, frameBuilder, validateMessage, validateSavedAnswer, validateSavedReply,
  renderSelection, type ConversationReply, type MessageRequest, type RenderedAnswer } from './cag.js';
import { callChatProvider, providerBody, type ChatProviderResult } from './chat-provider.js';
import { PRICE_VERSION, reserveCosts, usageAllowance } from './chat-pricing.js';
import type { Fetch } from './provider.js';
import type { ChatStateStore, Identity, Session, Turn } from './state.js';
import { TraceRecorder, validateSettlement, validateTrace, type SettlementSummary, type TracePoint } from './trace.js';

export interface VerifiedChatRequest {
  method: string; path: string; bodyBytes: Uint8Array; visitorId: string; sessionToken?: string;
}
export interface ChatSettings { primaryProvider: Provider; fallbackEnabled: boolean; turnDeadlineMs: number }
export const DEFAULT_CHAT_SETTINGS: ChatSettings = { primaryProvider: 'openai', fallbackEnabled: true, turnDeadlineMs: 50000 };
export interface ChatDependencies {
  state: ChatStateStore; secrets: SecretReader; fetchImpl?: Fetch; settings?: ChatSettings;
  receipt?: (value: ChatReceipt) => void;
  now?: () => number;
}
export interface ChatReceipt {
  requestId: string; provider: Provider; model: string; priceVersion: string; allowanceMicros: number;
  usage: ChatProviderResult['usage']; outcome: 'completed' | 'failed'; providerRequestId?: string; gatewayRequestId?: string;
}
export interface ChatResponse { statusCode: number; body?: unknown; events?: AsyncIterable<string>; sessionToken?: string; clearSession?: boolean }
type PublicErrorCode = 'unavailable' | 'invalid_request' | 'session_expired' | 'rate_limited' | 'budget_exhausted' |
  'deadline_exceeded' | 'upstream_failure' | 'validation_failed' | 'request_conflict';
type SavedResult = ({ kind: 'answer'; answer: RenderedAnswer; reply?: ConversationReply } | { kind: 'error'; code: PublicErrorCode; retryable: boolean } | { kind: 'cancelled' }) &
  { trace?: TracePoint[]; settlement?: SettlementSummary };
const publicErrors = new Set<PublicErrorCode>(['unavailable', 'invalid_request', 'session_expired', 'rate_limited', 'budget_exhausted',
  'deadline_exceeded', 'upstream_failure', 'validation_failed', 'request_conflict']);

export function publicChatError(error: unknown): { code: PublicErrorCode; retryable: boolean; statusCode: number } {
  const code = error instanceof ServiceError ? error.code : '';
  const statusCode = error instanceof ServiceError ? error.status : 503;
  const mapped: PublicErrorCode = code === 'INVALID_REQUEST' ? 'invalid_request' : code === 'SESSION_EXPIRED' ? 'session_expired' :
    code === 'RATE_LIMITED' ? 'rate_limited' : code === 'BUDGET_EXHAUSTED' ? 'budget_exhausted' :
    ['REQUEST_CONFLICT', 'REQUEST_ACTIVE'].includes(code) ? 'request_conflict' :
    ['PROVIDER_DEADLINE', 'CHAT_DEADLINE'].includes(code) ? 'deadline_exceeded' :
    code === 'ANSWER_VALIDATION_FAILED' ? 'validation_failed' : code.startsWith('PROVIDER_') ? 'upstream_failure' : 'unavailable';
  return { code: mapped, retryable: ['unavailable', 'rate_limited', 'deadline_exceeded', 'upstream_failure'].includes(mapped), statusCode };
}

function parseBody(bytes: Uint8Array): unknown {
  if (bytes.byteLength > 12288) throw new ServiceError('INVALID_REQUEST', 413);
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown; }
  catch { throw new ServiceError('INVALID_REQUEST', 400); }
}

function identityFor(request: VerifiedChatRequest): Identity {
  if (!request.sessionToken) throw new ServiceError('SESSION_EXPIRED', 401);
  return { visitorId: request.visitorId, credential: request.sessionToken };
}

function sessionBody(session: Session): unknown {
  const body = { schemaVersion: '1.0.0', generation: session.generation, expiresAt: session.expiresAt, remainingTurns: session.remainingTurns };
  assertContract('sessionResponse', body);
  return body;
}

function savedResult(value: unknown): SavedResult {
  const details = record(value) ? {
    ...(value.trace === undefined ? {} : { trace: validateTrace(value.trace) }),
    ...(value.settlement === undefined ? {} : { settlement: validateSettlement(value.settlement) })
  } : {};
  if (details.settlement && ((details.trace?.length ?? 0) > 23 || details.trace?.some(point => point.stage === 'settlement'))) throw new ServiceError('ANSWER_VALIDATION_FAILED', 502);
  if (record(value) && value.kind === 'answer') return { kind: 'answer', answer: validateSavedAnswer(value.answer),
    ...(value.reply === undefined ? {} : { reply: validateSavedReply(value.reply) }), ...details };
  if (record(value) && value.kind === 'cancelled') return { kind: 'cancelled', ...details };
  if (record(value) && value.kind === 'error' && typeof value.code === 'string' && publicErrors.has(value.code as PublicErrorCode) && typeof value.retryable === 'boolean') {
    return { kind: 'error', code: value.code as PublicErrorCode, retryable: value.retryable, ...details };
  }
  throw new ServiceError('ANSWER_VALIDATION_FAILED', 502);
}

async function alive(state: ChatStateStore, identity: Identity, generation: string): Promise<boolean> {
  try { return (await state.requireSession(identity, AbortSignal.timeout(3000))).generation === generation; }
  catch { return false; }
}

async function* resultFrames(result: SavedResult, turn: Turn, identity: Identity, state: ChatStateStore,
  frame: ReturnType<typeof frameBuilder>, replay = true): AsyncGenerator<string> {
  if (replay && !(result.kind === 'cancelled' && await state.isCancelled(turn, AbortSignal.timeout(3000)))) {
    for (const point of result.trace ?? []) {
      if (!await alive(state, identity, turn.generation) || await state.isCancelled(turn, AbortSignal.timeout(3000))) return;
      yield frame('trace', point);
    }
    if (result.settlement) {
      if (!await alive(state, identity, turn.generation) || await state.isCancelled(turn, AbortSignal.timeout(3000))) return;
      yield frame('trace', { stage: 'settlement', state: 'completed', elapsedMs: null, replayed: true, ...result.settlement });
    }
  }
  if (result.kind === 'answer') {
    if (result.reply) {
      if (!await alive(state, identity, turn.generation) || await state.isCancelled(turn, AbortSignal.timeout(3000))) return;
      yield frame('conversation', result.reply);
    }
    for (const block of result.answer.blocks) {
      if (!await alive(state, identity, turn.generation) || await state.isCancelled(turn, AbortSignal.timeout(3000))) return;
      yield frame('answer_block', block);
    }
    if (!await alive(state, identity, turn.generation) || await state.isCancelled(turn, AbortSignal.timeout(3000))) return;
    yield frame('sources', { corpusVersion: result.answer.corpusVersion, sources: result.answer.sources });
    if (!await alive(state, identity, turn.generation) || await state.isCancelled(turn, AbortSignal.timeout(3000))) return;
    yield frame('done', { outcome: result.answer.blocks.some(block => block.kind === 'notice' && block.code !== 'general_knowledge') ? 'limited' : 'completed' });
  } else if (await alive(state, identity, turn.generation)) {
    if (result.kind === 'cancelled') yield frame('done', { outcome: 'cancelled' });
    else yield frame('error', { code: result.code, retryable: result.retryable });
  }
}

async function* runTurn(input: {
  identity: Identity; turn: Turn; session: Session; message: MessageRequest; userContext: string;
  providers: Provider[]; keys: Record<Provider, string>; gatewayKey: string; config: Config;
  dependencies: ChatDependencies; outerSignal: AbortSignal; settings: ChatSettings; trace: TraceRecorder;
}): AsyncGenerator<string> {
  const { turn, identity, dependencies, outerSignal, settings, trace } = input;
  const frame = frameBuilder(turn.requestId, turn.generation);
  const controller = new AbortController();
  const abort = () => controller.abort();
  outerSignal.addEventListener('abort', abort, { once: true });
  if (outerSignal.aborted) abort();
  let cancelled = false, deadline = false, polling = false;
  const timer = setTimeout(() => { deadline = true; abort(); }, settings.turnDeadlineMs);
  const poll = setInterval(() => {
    if (polling || controller.signal.aborted) return;
    polling = true;
    void dependencies.state.isCancelled(turn, AbortSignal.timeout(2500)).then(value => {
      if (value) { cancelled = true; abort(); }
    }).catch(abort).finally(() => { polling = false; });
  }, 1000);
  const costs = { openai: 0, anthropic: 0 };
  let result: SavedResult | undefined;
  let settlementPoint: TracePoint | undefined;
  const emitTrace = async (point: TracePoint) => {
    if (!await alive(dependencies.state, identity, turn.generation) || await dependencies.state.isCancelled(turn, AbortSignal.timeout(3000))) {
      cancelled = true; controller.abort(); throw new ServiceError('CHAT_CANCELLED', 409);
    }
    return frame('trace', point);
  };
  try {
    if (!await alive(dependencies.state, identity, turn.generation) || await dependencies.state.isCancelled(turn, controller.signal)) {
      cancelled = true; throw new ServiceError('CHAT_CANCELLED', 409);
    }
    controller.signal.throwIfAborted();
    yield frame('status', { code: 'accepted' });
    for (const point of trace.snapshot()) yield await emitTrace(point);
    yield frame('status', { code: 'thinking' });
    let lastError: unknown;
    for (const [index, provider] of input.providers.entries()) {
      controller.signal.throwIfAborted();
      if (await dependencies.state.isCancelled(turn, controller.signal)) { cancelled = true; break; }
      const details = { attempt: index + 1, provider, model: input.config.models[provider] };
      let providerStarted = trace.timestamp();
      yield await emitTrace(trace.add({ stage: 'provider', state: 'started', ...details, reservedMicros: turn.reservations[provider] }));
      controller.signal.throwIfAborted();
      providerStarted = trace.timestamp();
      // Once dispatch is attempted, the whole reservation remains charged unless
      // bounded, validated usage proves a lower amount. Transport failure is ambiguous.
      costs[provider] = turn.reservations[provider];
      let providerCompleted = false;
      try {
        const response = await callChatProvider({ provider, config: input.config, providerKey: input.keys[provider],
          gatewayKey: input.gatewayKey, userContext: input.userContext, signal: controller.signal, fetchImpl: dependencies.fetchImpl });
        providerCompleted = true;
        costs[provider] = usageAllowance(response.usage);
        const usageCount = (value: number | null) => value !== null && Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000 ? value : null;
        yield await emitTrace(trace.add({ stage: 'provider', state: 'completed', ...details, durationMs: trace.duration(providerStarted),
          usageStatus: response.usage.status, inputTokens: usageCount(response.usage.inputTokens), outputTokens: usageCount(response.usage.outputTokens),
          cacheReadInputTokens: usageCount(response.usage.cacheReadInputTokens), cacheWriteInputTokens: usageCount(response.usage.cacheWriteInputTokens),
          reasoningOutputTokens: usageCount(response.usage.reasoningOutputTokens), chargedMicros: costs[provider],
          ...(response.providerRequestId ? { providerRequestId: response.providerRequestId } : {}),
          ...(response.gatewayRequestId ? { gatewayRequestId: response.gatewayRequestId } : {}) }));
        let validationStarted = trace.timestamp();
        yield await emitTrace(trace.add({ stage: 'validation', state: 'started', ...details }));
        validationStarted = trace.timestamp();
        let validationCompleted = false;
        try {
          const rendered = renderSelection(response.text);
          result = { kind: 'answer', answer: rendered.answer, reply: rendered.reply };
          validationCompleted = true;
          yield await emitTrace(trace.add({ stage: 'validation', state: 'completed', ...details,
            durationMs: trace.duration(validationStarted), corpusVersion: CAG_VERSION,
            claimCount: result.answer.blocks.filter(block => block.kind === 'claim').length }));
          dependencies.receipt?.({ requestId: turn.requestId, provider, model: response.model, priceVersion: PRICE_VERSION,
            allowanceMicros: costs[provider], usage: response.usage, outcome: 'completed',
            providerRequestId: response.providerRequestId, gatewayRequestId: response.gatewayRequestId });
          break;
        } catch (error) {
          if (!validationCompleted) {
            cancelled ||= outerSignal.aborted || await dependencies.state.isCancelled(turn, AbortSignal.timeout(3000)).catch(() => false);
            yield await emitTrace(trace.add({ stage: 'validation', state: cancelled ? 'cancelled' : 'failed', ...details,
              durationMs: trace.duration(validationStarted), ...(cancelled ? {} : { code: publicChatError(error).code }) }));
          }
          dependencies.receipt?.({ requestId: turn.requestId, provider, model: response.model, priceVersion: PRICE_VERSION,
            allowanceMicros: costs[provider], usage: response.usage, outcome: 'failed',
            providerRequestId: response.providerRequestId, gatewayRequestId: response.gatewayRequestId });
          throw error;
        }
      } catch (error) {
        lastError = error;
        if (!providerCompleted) {
          cancelled ||= outerSignal.aborted || await dependencies.state.isCancelled(turn, AbortSignal.timeout(3000)).catch(() => false);
          yield await emitTrace(trace.add({ stage: 'provider', state: cancelled ? 'cancelled' : 'failed', ...details,
            durationMs: trace.duration(providerStarted), usageStatus: 'unknown', chargedMicros: costs[provider],
            ...(cancelled ? {} : { code: publicChatError(deadline ? new ServiceError('CHAT_DEADLINE', 504) : error).code }) }));
        }
      }
    }
    if (!result) throw lastError ?? new ServiceError('CHAT_CANCELLED', 409);
    controller.signal.throwIfAborted();
    if (await dependencies.state.isCancelled(turn, controller.signal)) { cancelled = true; throw new ServiceError('CHAT_CANCELLED', 409); }
    yield frame('status', { code: 'validating' });
  } catch (error) {
    result = cancelled ? { kind: 'cancelled' } : (() => {
      const failure = publicChatError(deadline ? new ServiceError('CHAT_DEADLINE', 504) : error);
      return { kind: 'error', code: failure.code, retryable: failure.retryable } as const;
    })();
  } finally {
    clearTimeout(timer); clearInterval(poll);
    outerSignal.removeEventListener('abort', abort);
    controller.abort();
    // Settlement must survive browser disconnection and request cancellation.
    // Failure leaves the conservative reservation in the durable ledger.
    if (!result) result = { kind: 'error', code: 'unavailable', retryable: true };
    const settlement = { reservedMicros: turn.reservations.openai + turn.reservations.anthropic,
      chargedMicros: costs.openai + costs.anthropic, priceVersion: PRICE_VERSION };
    result = { ...result, trace: trace.snapshot(), settlement };
    const settlementStarted = trace.timestamp();
    try {
      const completion = await dependencies.state.completeTurn({ turn, actualCosts: costs, result,
        ...(result.kind === 'answer' ? { historyEntry: { text: input.message.text, result } } : {}) }, AbortSignal.timeout(5000));
      if (!completion.published) result = { kind: 'cancelled' };
      else settlementPoint = trace.add({ stage: 'settlement', state: 'completed', durationMs: trace.duration(settlementStarted), ...settlement });
    } catch {
      result = { kind: 'error', code: 'unavailable', retryable: true };
      settlementPoint = trace.add({ stage: 'settlement', state: 'failed', durationMs: trace.duration(settlementStarted), code: 'unavailable' });
    }
  }
  if (!outerSignal.aborted) {
    if (settlementPoint && await alive(dependencies.state, identity, turn.generation) && !await dependencies.state.isCancelled(turn, AbortSignal.timeout(3000))) {
      yield frame('trace', settlementPoint);
    }
    yield* resultFrames(result, turn, identity, dependencies.state, frame, false);
  }
}

export async function prepareChat(request: VerifiedChatRequest, config: Config, dependencies: ChatDependencies,
  signal: AbortSignal): Promise<ChatResponse> {
  const settings = dependencies.settings ?? DEFAULT_CHAT_SETTINGS;
  if (!['openai', 'anthropic'].includes(settings.primaryProvider) || typeof settings.fallbackEnabled !== 'boolean' ||
      !Number.isInteger(settings.turnDeadlineMs) || settings.turnDeadlineMs < 100 || settings.turnDeadlineMs > 50000) throw new ServiceError('CONFIGURATION_UNAVAILABLE', 503);
  if (request.method === 'GET' && request.path === '/api/chat/config') {
    const body = { schemaVersion: '1.0.0', available: true, capabilities: { chat: true, cag: true, rag: false, mcp: false, voice: false },
      limits: { maxMessageBytes: 8192, maxTurns: 8, maxToolsPerTurn: 0, turnDeadlineMs: settings.turnDeadlineMs } };
    assertContract('configResponse', body);
    return { statusCode: 200, body };
  }
  if (request.method === 'POST' && request.path === '/api/chat/session') {
    assertContract('emptyRequest', parseBody(request.bodyBytes));
    const opened = await dependencies.state.openSession({ visitorId: request.visitorId, credential: request.sessionToken }, signal);
    return { statusCode: 200, body: sessionBody(opened.session), sessionToken: opened.credential };
  }
  const identity = identityFor(request);
  if (request.method === 'DELETE' && request.path === '/api/chat/session') {
    assertContract('emptyRequest', parseBody(request.bodyBytes));
    await dependencies.state.clear(identity, signal);
    return { statusCode: 200, body: { schemaVersion: '1.0.0', cleared: true }, clearSession: true };
  }
  const cancelMatch = /^\/api\/chat\/requests\/([0-9a-f-]+)\/cancel$/.exec(request.path);
  if (request.method === 'POST' && cancelMatch) {
    assertContract('emptyRequest', parseBody(request.bodyBytes));
    assertContract('cancelRequest', { requestId: cancelMatch[1] });
    const status = await dependencies.state.cancel(identity, cancelMatch[1]!, signal);
    return { statusCode: 200, body: { schemaVersion: '1.0.0', requestId: cancelMatch[1], status } };
  }
  if (request.method !== 'POST' || request.path !== '/api/chat/messages') throw new ServiceError('INVALID_REQUEST', 404);
  const trace = new TraceRecorder(dependencies.now);
  const message = validateMessage(parseBody(request.bodyBytes));
  const digest = createHash('sha256').update(JSON.stringify({ text: message.text, pageContext: message.pageContext ?? null })).digest('hex');
  const previous = await dependencies.state.findTurn(identity, message.requestId, digest, signal);
  if (previous?.kind === 'running') return { statusCode: 202, body: { schemaVersion: '1.0.0', requestId: message.requestId, generation: previous.turn.generation, status: 'running' } };
  if (previous?.kind === 'finished') return { statusCode: 200, events: resultFrames(savedResult(previous.turn.result), previous.turn, identity,
    dependencies.state, frameBuilder(message.requestId, previous.turn.generation)) };
  const session = await dependencies.state.requireSession(identity, signal);
  const contextStarted = trace.timestamp();
  const userContext = buildUserContext(message, session.history);
  const providers: Provider[] = settings.fallbackEnabled ? [settings.primaryProvider, settings.primaryProvider === 'openai' ? 'anthropic' : 'openai'] : [settings.primaryProvider];
  // All size and credential checks precede reservation; no unavailable provider
  // can silently switch to Cloudflare billing or to a direct provider endpoint.
  providers.forEach(provider => providerBody(provider, config, userContext));
  trace.add({ stage: 'context', state: 'completed', durationMs: trace.duration(contextStarted), corpusVersion: CAG_VERSION, claimCount: CAG_CLAIM_IDS.length });
  const keys: Record<Provider, string> = { openai: '', anthropic: '' };
  const gatewayKey = credential(await dependencies.secrets.read(config.gatewaySecretArn, signal));
  await Promise.all(providers.map(async provider => { keys[provider] = credential(await dependencies.secrets.read(config.providerSecretArns[provider], signal)); }));
  const budgetStarted = trace.timestamp();
  const start = await dependencies.state.beginTurn({ identity, requestId: message.requestId, digest,
    reservations: reserveCosts(providers), priceVersion: PRICE_VERSION, text: message.text }, signal);
  if (start.kind === 'running') return { statusCode: 202, body: { schemaVersion: '1.0.0', requestId: message.requestId, generation: start.turn.generation, status: 'running' } };
  if (start.kind === 'finished') {
    return { statusCode: 200, events: resultFrames(savedResult(start.turn.result), start.turn, identity, dependencies.state,
      frameBuilder(message.requestId, start.turn.generation)) };
  }
  trace.add({ stage: 'budget', state: 'completed', durationMs: trace.duration(budgetStarted),
    reservedMicros: start.turn.reservations.openai + start.turn.reservations.anthropic, priceVersion: PRICE_VERSION });
  // A prior turn can finish between the initial read and lock acquisition.
  // Use the committed history returned with our new lock, never the stale copy.
  const committedContext = buildUserContext(message, start.session.history);
  try { providers.forEach(provider => providerBody(provider, config, committedContext)); }
  catch (error) {
    const failure = publicChatError(error);
    await dependencies.state.completeTurn({ turn: start.turn, actualCosts: { openai: 0, anthropic: 0 },
      result: { kind: 'error', code: failure.code, retryable: failure.retryable } }, AbortSignal.timeout(5000));
    throw error;
  }
  return { statusCode: 200, events: runTurn({ identity, turn: start.turn, session: start.session, message, userContext: committedContext,
    providers, keys, gatewayKey, config, dependencies, outerSignal: signal, settings, trace }) };
}
