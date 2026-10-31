import test from 'node:test';
import assert from 'node:assert/strict';
import { CAG_CLAIM_IDS, CAG_VERSION, SYSTEM_PREFIX, MAX_PROVIDER_REQUEST_BYTES, renderSelection, type StreamFrame } from '../src/cag.js';
import { providerBody, callChatProvider } from '../src/chat-provider.js';
import { MAX_PROVIDER_RESERVATION_MICROS, PRICE_VERSION, reserveCosts, usageAllowance } from '../src/chat-pricing.js';
import { prepareChat, type ChatDependencies, type VerifiedChatRequest, type ChatResponse, type ChatReceipt } from '../src/chat.js';
import { ServiceError } from '../src/errors.js';
import type { BeginTurnInput, ChatStateStore, CompleteTurnInput, Identity, Session, Turn } from '../src/state.js';
import { normaliseUsage } from '../src/provider.js';
import { validateTrace, TraceRecorder } from '../src/trace.js';
import { CONFIG, fixtures } from './fixtures.js';

const REQUEST_ID = '11111111-1111-4111-8111-111111111111';
const GENERATION = '22222222-2222-4222-8222-222222222222';
const TOKEN = 'a'.repeat(43), VISITOR = 'b'.repeat(43);
const selected = () => ({ schemaVersion: '1.0.0', corpusVersion: CAG_VERSION, claimIds: [CAG_CLAIM_IDS[0]], noticeCodes: [] });

class MemoryState implements ChatStateStore {
  valid = true; cancelled = false; denied = false; begins = 0; completed: CompleteTurnInput[] = [];
  session: Session = { id: 'session', generation: GENERATION, expiresAt: Date.now() + 86400000, remainingTurns: 8, history: [] };
  turn?: Turn;
  async openSession() { return { credential: TOKEN, session: this.session }; }
  async requireSession(_identity?: Identity) { if (!this.valid) throw new ServiceError('SESSION_EXPIRED', 401); return this.session; }
  async findTurn(_identity: Identity, _requestId: string, digest: string) {
    await this.requireSession();
    if (!this.turn) return undefined;
    if (this.turn.digest !== digest) throw new ServiceError('REQUEST_CONFLICT', 409);
    return { kind: this.turn.status === 'finished' ? 'finished' as const : 'running' as const, session: this.session, turn: this.turn };
  }
  async beginTurn(input: BeginTurnInput) {
    if (this.denied) throw new ServiceError('BUDGET_EXHAUSTED', 429);
    if (this.turn) {
      if (this.turn.digest !== input.digest) throw new ServiceError('REQUEST_CONFLICT', 409);
      return { kind: this.turn.status === 'finished' ? 'finished' as const : 'running' as const, session: this.session, turn: this.turn };
    }
    this.begins++;
    this.turn = { sessionId: 'session', requestId: input.requestId, generation: GENERATION, digest: input.digest,
      reservations: input.reservations, priceVersion: input.priceVersion, month: '2026-10', status: 'pending' };
    return { kind: 'started' as const, session: this.session, turn: this.turn };
  }
  async isCancelled() { return this.cancelled || !this.valid; }
  async completeTurn(input: CompleteTurnInput) {
    this.completed.push(input);
    this.turn = { ...input.turn, status: 'finished', result: input.result };
    if (input.historyEntry && this.valid && !this.cancelled) this.session.history.push(input.historyEntry);
    return { published: this.valid && !this.cancelled };
  }
  async cancel() { this.cancelled = true; return 'requested' as const; }
  async clear() { this.valid = false; this.cancelled = true; this.session.history = []; }
}

function request(text = 'Tell me about Dell.'): VerifiedChatRequest {
  return { method: 'POST', path: '/api/chat/messages', visitorId: VISITOR, sessionToken: TOKEN,
    bodyBytes: Buffer.from(JSON.stringify({ schemaVersion: '1.0.0', requestId: REQUEST_ID, text })) };
}
async function frames(response: ChatResponse): Promise<StreamFrame[]> {
  const values: StreamFrame[] = [];
  for await (const chunk of response.events ?? []) values.push(JSON.parse(chunk.split('\ndata: ')[1]!.trim()) as StreamFrame);
  return values;
}
function providerResponse(selection: unknown, provider = 'openai') {
  const text = typeof selection === 'string' ? selection : JSON.stringify(selection);
  return Response.json(provider === 'openai' ? {
    model: CONFIG.models.openai, status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text }] }],
    usage: { input_tokens: 100, output_tokens: 10, total_tokens: 110, input_tokens_details: { cached_tokens: 0 }, output_tokens_details: { reasoning_tokens: 0 } }
  } : { model: CONFIG.models.anthropic, stop_reason: 'end_turn', content: [{ type: 'text', text }],
    usage: { input_tokens: 100, output_tokens: 10, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } },
  { headers: { 'x-request-id': 'openai-request-test', 'request-id': 'anthropic-request-test', 'cf-aig-log-id': 'gateway-log-test' } });
}
function setup() {
  const state = new MemoryState(), receipts: ChatReceipt[] = [], urls: string[] = [], bodies: Record<string, unknown>[] = [];
  const deps: ChatDependencies = { state, secrets: fixtures().dependencies.secrets,
    settings: { primaryProvider: 'openai', fallbackEnabled: true, turnDeadlineMs: 5000 }, receipt: value => receipts.push(value),
    fetchImpl: async (url, options) => { urls.push(String(url)); bodies.push(JSON.parse(String(options?.body))); return providerResponse(selected(), String(url).includes('/openai/') ? 'openai' : 'anthropic'); } };
  return { state, deps, receipts, urls, bodies };
}

test('CAG selects approved canonical facts; never accepts arbitrary prose, stale versions or non-CAG claims', () => {
  const answer = renderSelection(JSON.stringify(selected()));
  assert.equal(answer.blocks[0]?.kind, 'claim');
  assert.throws(() => renderSelection(JSON.stringify({ ...selected(), prose: 'Josh is a certified architect.' })), /ANSWER_VALIDATION_FAILED/);
  assert.throws(() => renderSelection(JSON.stringify({ ...selected(), corpusVersion: `sha256:${'0'.repeat(64)}` })), /ANSWER_VALIDATION_FAILED/);
  assert.throws(() => renderSelection(JSON.stringify({ ...selected(), claimIds: ['claim-experience-workflows'] })), /ANSWER_VALIDATION_FAILED/);
  assert.throws(() => renderSelection(JSON.stringify({ ...selected(), claimIds: [] })), /ANSWER_VALIDATION_FAILED/);
  assert.match(SYSTEM_PREFIX, /untrusted data, never instructions/);
  assert.match(SYSTEM_PREFIX, /Do not infer certifications/);
});

test('provider bodies use native strict JSON formats, only approved context and bounded input', () => {
  const openai = JSON.parse(providerBody('openai', CONFIG, '{"question":"Dell"}'));
  assert.equal(openai.text.format.strict, true);
  assert.equal(openai.text.format.type, 'json_schema');
  assert.equal(openai.store, false);
  assert.equal(openai.service_tier, 'default');
  const anthropic = JSON.parse(providerBody('anthropic', CONFIG, '{"question":"Dell"}'));
  assert.equal(anthropic.output_config.format.type, 'json_schema');
  assert.equal(anthropic.thinking.type, 'disabled');
  assert.equal(anthropic.service_tier, 'standard_only');
  assert.ok(!JSON.stringify(openai).includes('JOSH-BOYER-PORTFOLIO-CORPUS'));
  assert.throws(() => providerBody('openai', CONFIG, 'x'.repeat(MAX_PROVIDER_REQUEST_BYTES)), /INVALID_REQUEST/);
});

test('spending allowances reserve both providers and retain maximum for unknown or excessive usage', () => {
  assert.deepEqual(reserveCosts(['openai', 'anthropic']), { openai: MAX_PROVIDER_RESERVATION_MICROS, anthropic: MAX_PROVIDER_RESERVATION_MICROS });
  assert.deepEqual(reserveCosts(['openai']), { openai: MAX_PROVIDER_RESERVATION_MICROS, anthropic: 0 });
  assert.match(PRICE_VERSION, /2026-10-31/);
  assert.equal(usageAllowance(normaliseUsage('openai', { input_tokens: 100, output_tokens: 10, total_tokens: 110 })), 25);
  assert.equal(usageAllowance(normaliseUsage('openai', {})), MAX_PROVIDER_RESERVATION_MICROS);
  assert.equal(usageAllowance(normaliseUsage('openai', { input_tokens: 999999, output_tokens: 1, total_tokens: 1000000 })), MAX_PROVIDER_RESERVATION_MICROS);
});

test('chat emits validated typed stream, persists canonical answer and replays without another inference', async () => {
  const { state, deps, urls, receipts } = setup();
  const values = await frames(await prepareChat(request(), CONFIG, deps, new AbortController().signal));
  assert.deepEqual(values.filter(value => value.event !== 'trace').map(value => value.event), ['status', 'status', 'status', 'answer_block', 'sources', 'done']);
  assert.deepEqual(values.map(value => value.seq), values.map((_value, index) => index + 1));
  assert.ok(values.every(value => value.generation === GENERATION && value.requestId === REQUEST_ID));
  assert.equal(state.completed.length, 1);
  assert.equal(state.completed[0]?.actualCosts.openai, 25);
  assert.equal(state.completed[0]?.actualCosts.anthropic, 0);
  assert.equal(state.session.history.length, 1);
  assert.equal(receipts.length, 1);
  assert.ok(!JSON.stringify(receipts).includes('Tell me'));
  const replay = await frames(await prepareChat(request(), CONFIG, deps, new AbortController().signal));
  assert.deepEqual(replay.filter(value => value.event !== 'trace').map(value => value.event), ['answer_block', 'sources', 'done']);
  assert.equal(urls.length, 1);
  assert.equal(state.begins, 1);
  await assert.rejects(prepareChat(request('Different content'), CONFIG, deps, new AbortController().signal), /REQUEST_CONFLICT/);
  assert.equal(urls.length, 1);
});

test('running identical request reports existing state without a second paid run', async () => {
  const { deps, urls } = setup();
  await prepareChat(request(), CONFIG, deps, new AbortController().signal);
  const again = await prepareChat(request(), CONFIG, deps, new AbortController().signal);
  assert.equal(again.statusCode, 202);
  assert.equal((again.body as { status: string }).status, 'running');
  assert.equal(urls.length, 0);
});

test('model sees committed history returned after lock acquisition', async () => {
  const { deps, state, bodies } = setup();
  const original = state.beginTurn.bind(state);
  state.beginTurn = async input => {
    state.session.history.push({ text: 'Previous turn committed during lock acquisition', result: { kind: 'answer', answer: renderSelection(JSON.stringify(selected())) } });
    return original(input);
  };
  await frames(await prepareChat(request(), CONFIG, deps, new AbortController().signal));
  assert.match(JSON.stringify(bodies), /Previous turn committed during lock acquisition/);
});

test('completed retries replay without provider credentials or rebuilding expanded history', async () => {
  const { deps, state, urls } = setup();
  await frames(await prepareChat(request(), CONFIG, deps, new AbortController().signal));
  state.session.history = Array.from({ length: 8 }, () => ({ text: '\u0000'.repeat(8192), result: {} }));
  deps.secrets = { async read() { throw new ServiceError('CREDENTIAL_UNAVAILABLE', 503); } };
  const replay = await frames(await prepareChat(request(), CONFIG, deps, new AbortController().signal));
  assert.equal(replay.find(value => value.event === 'answer_block')?.event, 'answer_block');
  assert.equal(replay.at(-1)?.event, 'done');
  assert.equal(urls.length, 1);
});

test('invalid input, exhausted allowance, cross-session expiry and unavailable credentials fail before provider calls', async () => {
  for (const failure of ['input', 'budget', 'session', 'secrets'] as const) {
    const { deps, urls, state } = setup();
    const input = request();
    if (failure === 'input') input.bodyBytes = Buffer.from(JSON.stringify({ schemaVersion: '1.0.0', requestId: REQUEST_ID, text: 'hello', history: [] }));
    if (failure === 'budget') state.denied = true;
    if (failure === 'session') state.valid = false;
    if (failure === 'secrets') deps.secrets = { async read() { throw new ServiceError('CREDENTIAL_UNAVAILABLE', 503); } };
    await assert.rejects(prepareChat(input, CONFIG, deps, new AbortController().signal));
    assert.equal(urls.length, 0);
    assert.equal(state.completed.length, 0);
  }
});

test('one fallback consumes two reservations and keeps unknown primary charge', async () => {
  const { deps, state } = setup(); let calls = 0;
  deps.fetchImpl = async () => { calls++; if (calls === 1) throw new Error('network'); return providerResponse(selected(), 'anthropic'); };
  const values = await frames(await prepareChat(request(), CONFIG, deps, new AbortController().signal));
  assert.equal(values.at(-1)?.event, 'done');
  assert.equal(calls, 2);
  assert.equal(state.completed[0]?.actualCosts.openai, MAX_PROVIDER_RESERVATION_MICROS);
  assert.equal(state.completed[0]?.actualCosts.anthropic, 25);
});

test('provider failure terminates with an error and charges both uncertain attempts only once', async () => {
  const { deps, state } = setup(); let calls = 0;
  deps.fetchImpl = async () => { calls++; return new Response('', { status: 503 }); };
  const values = await frames(await prepareChat(request(), CONFIG, deps, new AbortController().signal));
  assert.equal(values.at(-1)?.event, 'error');
  assert.equal(values.filter(value => value.event === 'done').length, 0);
  assert.equal(calls, 2);
  assert.deepEqual(state.completed[0]?.actualCosts, reserveCosts(['openai', 'anthropic']));
});

test('invented provider prose never reaches the stream; validation failure preserves reported usage', async () => {
  const { deps, state } = setup();
  deps.settings!.fallbackEnabled = false;
  deps.fetchImpl = async () => providerResponse({ ...selected(), prose: 'AWS certified architect with 100% automation.' });
  const values = await frames(await prepareChat(request(), CONFIG, deps, new AbortController().signal));
  assert.equal(values.at(-1)?.event, 'error');
  assert.ok(values.every(value => value.event !== 'answer_block'));
  assert.ok(!JSON.stringify(values).includes('certified'));
  assert.equal(state.completed[0]?.actualCosts.openai, 25);
  assert.equal(state.session.history.length, 0);
});

test('clear during inference discards late answer but settles provider cost independently', async () => {
  const { deps, state } = setup();
  deps.fetchImpl = async () => { await state.clear(); return providerResponse(selected()); };
  const values = await frames(await prepareChat(request(), CONFIG, deps, new AbortController().signal));
  assert.deepEqual(values.filter(value => value.event !== 'trace').map(value => value.event), ['status', 'status']);
  assert.ok(values.filter(value => value.event === 'trace').every(value => (value.data as { state: string }).state !== 'completed' ||
    ['context', 'budget'].includes((value.data as { stage: string }).stage)));
  assert.equal(state.completed[0]?.actualCosts.openai, 25);
  assert.equal(state.session.history.length, 0);
});

test('deadline aborts provider, suppresses fallback, and retains dispatched reservation', async () => {
  const { deps, state } = setup(); let calls = 0;
  deps.settings!.turnDeadlineMs = 100;
  deps.fetchImpl = async (_url, options) => { calls++; return new Promise((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }); };
  const values = await frames(await prepareChat(request(), CONFIG, deps, new AbortController().signal));
  assert.equal(calls, 1);
  assert.equal((values.at(-1)?.data as { code: string }).code, 'deadline_exceeded');
  assert.equal(state.completed[0]?.actualCosts.openai, MAX_PROVIDER_RESERVATION_MICROS);
  assert.equal(state.completed[0]?.actualCosts.anthropic, 0);
});

test('ending stream before inference releases reservation and leaves no stored history', async () => {
  const { deps, state, urls } = setup();
  const response = await prepareChat(request(), CONFIG, deps, new AbortController().signal);
  const stream = response.events![Symbol.asyncIterator]();
  await stream.next();
  await stream.return?.();
  assert.equal(urls.length, 0);
  assert.deepEqual(state.completed[0]?.actualCosts, { openai: 0, anthropic: 0 });
  assert.equal(state.session.history.length, 0);
});

test('private route responses use exact public schemas with no credentials in JSON', async () => {
  const { deps } = setup(); const signal = new AbortController().signal;
  const config = await prepareChat({ ...request(), method: 'GET', path: '/api/chat/config', bodyBytes: new Uint8Array() }, CONFIG, deps, signal);
  assert.deepEqual((config.body as { capabilities: unknown }).capabilities, { chat: true, cag: true, rag: false, mcp: false, voice: false });
  const session = await prepareChat({ ...request(), path: '/api/chat/session', bodyBytes: Buffer.from('{}') }, CONFIG, deps, signal);
  assert.equal(session.sessionToken, TOKEN);
  assert.ok(!JSON.stringify(session.body).includes(TOKEN));
  const cancel = await prepareChat({ ...request(), path: `/api/chat/requests/${REQUEST_ID}/cancel`, bodyBytes: Buffer.from('{}') }, CONFIG, deps, signal);
  assert.deepEqual(cancel.body, { schemaVersion: '1.0.0', requestId: REQUEST_ID, status: 'requested' });
  const clear = await prepareChat({ ...request(), method: 'DELETE', path: '/api/chat/session', bodyBytes: Buffer.from('{}') }, CONFIG, deps, signal);
  assert.equal(clear.clearSession, true);
  assert.deepEqual(clear.body, { schemaVersion: '1.0.0', cleared: true });
});

test('provider transports use only Gateway, disable billing fallback, redirects and payload logs', async () => {
  const { deps } = setup();
  for (const provider of ['openai', 'anthropic'] as const) {
    let called = false;
    await callChatProvider({ provider, config: CONFIG, providerKey: 'a'.repeat(32), gatewayKey: 'b'.repeat(32),
      userContext: '{}', signal: new AbortController().signal, fetchImpl: async (url, options) => {
        called = true;
        assert.match(String(url), /^https:\/\/gateway\.ai\.cloudflare\.com\/v1\//);
        assert.equal(options?.redirect, 'error');
        const headers = new Headers(options?.headers);
        assert.equal(headers.get('cf-aig-no-wholesale'), 'true');
        assert.equal(headers.get('cf-aig-collect-log-payload'), 'false');
        assert.equal(headers.get('cf-aig-skip-cache'), 'true');
        return providerResponse(selected(), provider);
      } });
    assert.equal(called, true);
  }
});

test('refused, oversized and mismatched model responses cannot become answers', async () => {
  const options = { provider: 'openai' as const, config: CONFIG, providerKey: 'a'.repeat(32), gatewayKey: 'b'.repeat(32), userContext: '{}', signal: new AbortController().signal };
  for (const response of [
    Response.json({ model: 'other', status: 'completed', output: [] }),
    Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'no' }] }] }),
    new Response('x'.repeat(65537))
  ]) await assert.rejects(callChatProvider({ ...options, fetchImpl: async () => response }));
});

test('observable traces precede canonical answers and preserve actual usage, context, reservations and provider receipts', async () => {
  const { deps, state } = setup();
  const values = await frames(await prepareChat(request(), CONFIG, deps, new AbortController().signal));
  const traces = values.filter(value => value.event === 'trace').map(value => value.data) as import('../src/trace.js').TracePoint[];
  assert.deepEqual(traces.map(point => `${point.stage}:${point.state}`), [
    'context:completed', 'budget:completed', 'provider:started', 'provider:completed',
    'validation:started', 'validation:completed', 'settlement:completed'
  ]);
  const firstAnswer = values.findIndex(value => value.event === 'answer_block');
  assert.ok(values.every((value, index) => value.event !== 'trace' || index < firstAnswer));
  assert.ok(traces.every((point, index) => index === 0 || point.elapsedMs! >= traces[index - 1]!.elapsedMs!));
  assert.ok(traces.every(point => point.elapsedMs! >= (point.durationMs ?? 0)));
  assert.equal(traces[0]?.corpusVersion, CAG_VERSION);
  assert.equal(traces[0]?.claimCount, CAG_CLAIM_IDS.length);
  assert.equal(traces[1]?.reservedMicros, MAX_PROVIDER_RESERVATION_MICROS * 2);
  assert.deepEqual({ provider: traces[3]?.provider, model: traces[3]?.model, attempt: traces[3]?.attempt,
    input: traces[3]?.inputTokens, output: traces[3]?.outputTokens, cache: traces[3]?.cacheReadInputTokens,
    providerId: traces[3]?.providerRequestId, gatewayId: traces[3]?.gatewayRequestId },
  { provider: 'openai', model: CONFIG.models.openai, attempt: 1, input: 100, output: 10, cache: 0,
    providerId: 'openai-request-test', gatewayId: 'gateway-log-test' });
  assert.equal(traces[6]?.chargedMicros, 25);
  const saved = state.completed[0]?.result as { trace: unknown[]; settlement: unknown };
  assert.deepEqual(saved.trace, traces.slice(0, -1));
  assert.deepEqual(saved.settlement, { reservedMicros: MAX_PROVIDER_RESERVATION_MICROS * 2, chargedMicros: 25, priceVersion: PRICE_VERSION });
  assert.ok(!JSON.stringify(traces).includes('Tell me'));
  assert.ok(!JSON.stringify(traces).includes('test-key'));
});

test('retries replay original traces without new inference and label unrecorded settlement timing', async () => {
  const { deps, urls } = setup();
  const original = await frames(await prepareChat(request(), CONFIG, deps, new AbortController().signal));
  const repeated = await frames(await prepareChat(request(), CONFIG, deps, new AbortController().signal));
  const firstTrace = original.filter(value => value.event === 'trace').map(value => value.data);
  const retryTrace = repeated.filter(value => value.event === 'trace').map(value => value.data) as import('../src/trace.js').TracePoint[];
  assert.deepEqual(retryTrace.slice(0, -1), firstTrace.slice(0, -1));
  assert.equal(retryTrace.at(-1)?.stage, 'settlement');
  assert.equal(retryTrace.at(-1)?.elapsedMs, null);
  assert.equal(retryTrace.at(-1)?.durationMs, undefined);
  assert.equal(retryTrace.at(-1)?.replayed, true);
  assert.equal(urls.length, 1);
});

test('fallback traces show each actual provider attempt and independent validation result', async () => {
  const { deps } = setup(); let calls = 0;
  deps.fetchImpl = async () => ++calls === 1 ? providerResponse({ ...selected(), injected: 'invented prose' }) : providerResponse(selected(), 'anthropic');
  const values = await frames(await prepareChat(request(), CONFIG, deps, new AbortController().signal));
  const traces = values.filter(value => value.event === 'trace').map(value => value.data) as import('../src/trace.js').TracePoint[];
  assert.deepEqual(traces.filter(point => point.stage === 'provider').map(point => [point.attempt, point.provider, point.state]),
    [[1, 'openai', 'started'], [1, 'openai', 'completed'], [2, 'anthropic', 'started'], [2, 'anthropic', 'completed']]);
  assert.deepEqual(traces.filter(point => point.stage === 'validation').map(point => [point.attempt, point.state]),
    [[1, 'started'], [1, 'failed'], [2, 'started'], [2, 'completed']]);
  assert.equal(calls, 2);
  assert.equal(values.at(-1)?.event, 'done');
  assert.ok(!JSON.stringify(traces).includes('invented prose'));
});

test('failed provider trace retains uncertain allowance and failure code without exception text', async () => {
  const { deps } = setup();
  deps.settings!.fallbackEnabled = false;
  deps.fetchImpl = async () => { throw new Error('provider-secret-must-never-display'); };
  const values = await frames(await prepareChat(request(), CONFIG, deps, new AbortController().signal));
  const traces = values.filter(value => value.event === 'trace').map(value => value.data) as import('../src/trace.js').TracePoint[];
  const failed = traces.find(point => point.stage === 'provider' && point.state === 'failed');
  assert.equal(failed?.usageStatus, 'unknown');
  assert.equal(failed?.chargedMicros, MAX_PROVIDER_RESERVATION_MICROS);
  assert.equal(failed?.code, 'upstream_failure');
  assert.ok(!JSON.stringify(values).includes('provider-secret'));
});

test('failed durable settlement never emits a completed settlement or answer', async () => {
  const { deps, state } = setup();
  state.completeTurn = async () => { throw new ServiceError('STATE_UNAVAILABLE', 503); };
  const values = await frames(await prepareChat(request(), CONFIG, deps, new AbortController().signal));
  const traces = values.filter(value => value.event === 'trace').map(value => value.data) as import('../src/trace.js').TracePoint[];
  assert.ok(!traces.some(point => point.stage === 'settlement' && point.state === 'completed'));
  assert.equal(traces.at(-1)?.stage, 'settlement');
  assert.equal(traces.at(-1)?.state, 'failed');
  assert.ok(values.every(value => value.event !== 'answer_block'));
  assert.equal(values.at(-1)?.event, 'error');
});

test('older saved results replay without traces while tampered traces fail closed', async () => {
  const { deps, state, urls } = setup();
  await frames(await prepareChat(request(), CONFIG, deps, new AbortController().signal));
  const saved = state.turn!.result as { trace?: unknown[]; settlement?: unknown };
  delete saved.trace; delete saved.settlement;
  const old = await frames(await prepareChat(request(), CONFIG, deps, new AbortController().signal));
  assert.deepEqual(old.map(value => value.event), ['answer_block', 'sources', 'done']);
  saved.trace = [{ stage: 'context', state: 'completed', elapsedMs: 0, corpusVersion: CAG_VERSION, claimCount: 7, prompt: 'must not display' }];
  await assert.rejects(prepareChat(request(), CONFIG, deps, new AbortController().signal), /ANSWER_VALIDATION_FAILED/);
  assert.equal(urls.length, 1);
});

test('trace validation rejects excessive payloads and non-monotonic timing', () => {
  const valid = { stage: 'budget', state: 'completed', elapsedMs: 10, reservedMicros: 20, priceVersion: PRICE_VERSION };
  assert.throws(() => validateTrace(Array.from({ length: 25 }, () => valid)), /ANSWER_VALIDATION_FAILED/);
  assert.throws(() => validateTrace([valid, { ...valid, elapsedMs: 9 }]), /ANSWER_VALIDATION_FAILED/);
  let clock = 100;
  const recorder = new TraceRecorder(() => clock);
  recorder.add({ stage: 'budget', state: 'completed', reservedMicros: 20, priceVersion: PRICE_VERSION });
  clock = 99;
  assert.equal(recorder.add({ stage: 'context', state: 'completed', corpusVersion: CAG_VERSION, claimCount: 7 }).elapsedMs, 0);
  assert.throws(() => validateTrace([{ stage: 'provider', state: 'completed', elapsedMs: 1, provider: 'openai', model: CONFIG.models.openai, attempt: 1 }]), /ANSWER_VALIDATION_FAILED/);
  assert.throws(() => validateTrace([{ ...valid, durationMs: 20 }]), /ANSWER_VALIDATION_FAILED/);
});

test('cancellation and clear suppress late trace replay', async () => {
  const { deps, state } = setup();
  deps.settings!.fallbackEnabled = false;
  deps.fetchImpl = async () => { state.cancelled = true; throw new Error('cancelled'); };
  const original = await frames(await prepareChat(request(), CONFIG, deps, new AbortController().signal));
  assert.equal(original.at(-1)?.event, 'done');
  const replay = await frames(await prepareChat(request(), CONFIG, deps, new AbortController().signal));
  assert.deepEqual(replay.map(value => value.event), ['done']);
  await state.clear();
  await assert.rejects(prepareChat(request(), CONFIG, deps, new AbortController().signal), /SESSION_EXPIRED/);
});

test('trace authority-check failure aborts the turn without spending a fallback invocation', async () => {
  const { deps, state } = setup();
  let failNextRead = false, calls = 0;
  const requireSession = state.requireSession.bind(state);
  state.requireSession = async identity => {
    if (failNextRead) { failNextRead = false; throw new ServiceError('STATE_UNAVAILABLE', 503); }
    return requireSession(identity);
  };
  deps.fetchImpl = async () => { calls++; failNextRead = true; return providerResponse(selected()); };
  const values = await frames(await prepareChat(request(), CONFIG, deps, new AbortController().signal));
  assert.equal(calls, 1);
  assert.equal(state.completed[0]?.actualCosts.anthropic, 0);
  assert.ok(values.every(value => value.event !== 'answer_block'));
});
