import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { types } from 'node:util';
import {
  DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand, TransactWriteItemsCommand,
  type AttributeValue, type TransactWriteItem
} from '@aws-sdk/client-dynamodb';
import { REGION, type Provider } from './config.js';
import { ServiceError, record } from './errors.js';

export interface Identity { visitorId: string; credential: string }
export interface HistoryEntry { text: string; result: unknown; requestId?: string }
export interface Session {
  id: string; generation: string; expiresAt: number; remainingTurns: number; history: HistoryEntry[];
}
export interface ReservationComponents {
  embeddingMicros?: number;
  openaiGenerationMicros?: number;
  anthropicGenerationMicros?: number;
}
export interface ChargeComponents {
  embeddingMicros?: number;
  generationMicros?: number;
  mcpCalls?: number;
  retrievalMatched?: number;
}
export interface Turn {
  sessionId: string; requestId: string; generation: string; digest: string;
  reservations: Record<Provider, number>; priceVersion: string; month: string;
  status: 'pending' | 'finished'; result?: unknown;
  reservationComponents?: ReservationComponents;
  actualCosts?: Record<Provider, number>;
  chargeComponents?: ChargeComponents;
}
export type RequestRecord = Turn;
export interface StateLimits {
  monthlyBudgetMicros: number;
  providerBudgetMicros: Record<Provider, number>;
  dailyVisitorTurns: number;
}
export interface BeginTurnInput {
  identity: Identity; requestId: string; digest: string; reservations: Record<Provider, number>;
  priceVersion: string; text: string;
  reservationComponents?: ReservationComponents;
}
export type TurnInput = BeginTurnInput;
export interface CompleteTurnInput {
  turn: Turn; actualCosts: Record<Provider, number>; charges?: Record<Provider, number>;
  chargeComponents?: ChargeComponents; result: unknown; historyEntry?: HistoryEntry;
}
export type SettlementInput = CompleteTurnInput;
export interface FailTurnInput {
  turn: Turn; actualCosts?: Record<Provider, number>; charges?: Record<Provider, number>;
  chargeComponents?: ChargeComponents; result?: unknown; code?: string; retryable?: boolean;
  trace?: unknown[]; settlement?: unknown;
}
export interface ChatStateStore {
  openSession(input: { visitorId: string; credential?: string }, signal: AbortSignal): Promise<{ credential: string; session: Session }>;
  requireSession(identity: Identity, signal: AbortSignal): Promise<Session>;
  findTurn(identity: Identity, requestId: string, digest: string, signal: AbortSignal): Promise<{ kind: 'running' | 'finished'; session: Session; turn: Turn } | undefined>;
  beginTurn(input: BeginTurnInput, signal: AbortSignal): Promise<{ kind: 'started' | 'running' | 'finished'; session: Session; turn: Turn }>;
  isCancelled(turn: Turn, signal: AbortSignal): Promise<boolean>;
  completeTurn(input: CompleteTurnInput, signal: AbortSignal): Promise<{ published: boolean }>;
  cancel(identity: Identity, requestId: string, signal: AbortSignal): Promise<'requested' | 'already_finished'>;
  clear(identity: Identity, signal: AbortSignal): Promise<void>;
  failTurn?(input: FailTurnInput, signal: AbortSignal): Promise<{ published: boolean }>;
  cancelTurn?(identity: Identity, requestId: string, signal: AbortSignal): Promise<'requested' | 'already_finished'>;
  getRequest?(identity: Identity, requestId: string, digestOrSignal: string | AbortSignal, signal?: AbortSignal): Promise<{ kind: 'running' | 'finished'; session: Session; turn: Turn } | undefined>;
}

export const MAX_MONTHLY_BUDGET_MICROS = 25_000_000;
export const MAX_PROVIDER_RESERVATION_MICROS = 25_000;
export const MAX_TRACE_FRAMES = 24;
export const MAX_TRACE_BYTES = 16_384;
export const SESSION_MS = 24 * 60 * 60 * 1000;
export const ACTIVE_LEASE_MS = 120_000;
export const LEDGER_SECONDS = 100 * 24 * 60 * 60;

export const DEFAULT_STATE_LIMITS: StateLimits = {
  monthlyBudgetMicros: MAX_MONTHLY_BUDGET_MICROS,
  providerBudgetMicros: { openai: MAX_MONTHLY_BUDGET_MICROS, anthropic: MAX_MONTHLY_BUDGET_MICROS },
  dailyVisitorTurns: 16
};

const PROVIDERS = ['openai', 'anthropic'] as const;
const DEFAULT_TRACE_UUID = '00000000-0000-4000-8000-000000000000';
const ALLOWED_RESULT_KEYS = new Set(['kind', 'answer', 'reply', 'code', 'retryable', 'trace', 'settlement']);
const FORBIDDEN_LEDGER_KEYS = new Set([
  'reply', 'prompt', 'rawPrompt', 'systemPrompt', 'userContext', 'visitorText',
  'pendingText', 'jobText', 'query', 'toolArgs', 'toolInput', 'toolOutput', 'retrievedChunks', 'passages'
]);
const ALLOWED_RESERVATION_COMPONENT_KEYS = new Set(['embeddingMicros', 'openaiGenerationMicros', 'anthropicGenerationMicros']);
const ALLOWED_CHARGE_COMPONENT_KEYS = new Set(['embeddingMicros', 'generationMicros', 'mcpCalls', 'retrievalMatched']);

const contracts = require('../../../chat/contracts/index.cjs') as {
  createEventValidator(options: { requestId: string; generation: string; corpus: unknown }): {
    accept(event: {
      schemaVersion: '1.0.0';
      requestId: string;
      generation: string;
      seq: number;
      event: 'trace';
      data: unknown;
    }): boolean;
  };
};
const corpus = require('../../../chat/knowledge/corpus.json') as { corpusVersion: string };

type Row = Record<string, AttributeValue>;
const s = (value: string): AttributeValue => ({ S: value });
const n = (value: number): AttributeValue => ({ N: String(value) });
const key = (pk: string, sk: string): Row => ({ pk: s(pk), sk: s(sk) });
const hash = (value: string): string => createHash('sha256').update(value).digest('hex');
const string = (row: Row, name: string): string => {
  const value = row[name]?.S;
  if (typeof value !== 'string') throw new ServiceError('STATE_UNAVAILABLE', 503);
  return value;
};
const number = (row: Row, name: string): number => {
  const value = Number(row[name]?.N);
  if (!Number.isSafeInteger(value) || value < 0) throw new ServiceError('STATE_UNAVAILABLE', 503);
  return value;
};
const json = <T>(row: Row, name: string): T => {
  try { return JSON.parse(string(row, name)) as T; } catch { throw new ServiceError('STATE_UNAVAILABLE', 503); }
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const visitor = /^[A-Za-z0-9_-]{16,128}$/;
const credential = /^[A-Za-z0-9_-]{43}$/;

function isSafeValue(value: unknown, seen = new Set<unknown>()): boolean {
  try {
    if (value === null || typeof value !== 'object') return true;
    if (types.isProxy(value) || seen.has(value)) return false;
    seen.add(value);
    try {
      if (Array.isArray(value)) {
        if (Object.getPrototypeOf(value) !== Array.prototype || Object.getOwnPropertySymbols(value).length > 0) return false;
        const descriptors = Object.getOwnPropertyDescriptors(value);
        if (Object.keys(descriptors).length !== value.length + 1) return false;
        for (let i = 0; i < value.length; i += 1) {
          const desc = descriptors[i];
          if (!desc || 'get' in desc || 'set' in desc || !desc.enumerable || !isSafeValue(desc.value, seen)) return false;
        }
        return true;
      }
      const proto = Object.getPrototypeOf(value);
      if ((proto !== Object.prototype && proto !== null) || Object.getOwnPropertySymbols(value).length > 0) return false;
      for (const [k, desc] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
        if (k === '__proto__' || 'get' in desc || 'set' in desc || !desc.enumerable || !isSafeValue(desc.value, seen)) return false;
      }
      return true;
    } finally {
      seen.delete(value);
    }
  } catch {
    return false;
  }
}

function costs(value: Record<Provider, number>, ceiling = MAX_PROVIDER_RESERVATION_MICROS): void {
  if (!value || !isSafeValue(value) || Object.keys(value).sort().join(',') !== 'anthropic,openai' ||
      PROVIDERS.some(provider => !Number.isSafeInteger(value[provider]) || value[provider] < 0 || value[provider] > ceiling)) {
    throw new ServiceError('INVALID_REQUEST', 400);
  }
}

function validateReservationComponents(
  components: ReservationComponents | undefined,
  reservations: Record<Provider, number>
): ReservationComponents | undefined {
  if (components === undefined) return undefined;
  if (!record(components) || !isSafeValue(components)) throw new ServiceError('INVALID_REQUEST', 400);
  const keys = Object.keys(components);
  if (keys.length === 0 || keys.some(k => !ALLOWED_RESERVATION_COMPONENT_KEYS.has(k))) {
    throw new ServiceError('INVALID_REQUEST', 400);
  }
  const check = (val: unknown): number => {
    if (val === undefined) return 0;
    if (typeof val !== 'number' || !Number.isSafeInteger(val) || val < 0 || val > MAX_PROVIDER_RESERVATION_MICROS) {
      throw new ServiceError('INVALID_REQUEST', 400);
    }
    return val;
  };
  const embeddingMicros = check(components.embeddingMicros);
  const openaiGenerationMicros = check(components.openaiGenerationMicros);
  const anthropicGenerationMicros = check(components.anthropicGenerationMicros);
  if (embeddingMicros + openaiGenerationMicros !== reservations.openai || anthropicGenerationMicros !== reservations.anthropic) {
    throw new ServiceError('INVALID_REQUEST', 400);
  }
  return {
    ...(components.embeddingMicros !== undefined ? { embeddingMicros } : {}),
    ...(components.openaiGenerationMicros !== undefined ? { openaiGenerationMicros } : {}),
    ...(components.anthropicGenerationMicros !== undefined ? { anthropicGenerationMicros } : {})
  };
}

function validateChargeComponents(
  components: ChargeComponents | undefined,
  actualCosts: Record<Provider, number>
): ChargeComponents | undefined {
  if (components === undefined) return undefined;
  if (!record(components) || !isSafeValue(components)) throw new ServiceError('INVALID_REQUEST', 400);
  const keys = Object.keys(components);
  if (keys.length === 0 || keys.some(k => !ALLOWED_CHARGE_COMPONENT_KEYS.has(k))) {
    throw new ServiceError('INVALID_REQUEST', 400);
  }
  const check = (val: unknown, max: number): number => {
    if (val === undefined) return 0;
    if (typeof val !== 'number' || !Number.isSafeInteger(val) || val < 0 || val > max) {
      throw new ServiceError('INVALID_REQUEST', 400);
    }
    return val;
  };
  const maxTotal = MAX_PROVIDER_RESERVATION_MICROS * PROVIDERS.length;
  const embeddingMicros = check(components.embeddingMicros, maxTotal);
  const generationMicros = check(components.generationMicros, maxTotal);
  const mcpCalls = check(components.mcpCalls, 4);
  const retrievalMatched = check(components.retrievalMatched, 16);
  if (embeddingMicros + generationMicros > actualCosts.openai + actualCosts.anthropic) {
    throw new ServiceError('INVALID_REQUEST', 400);
  }
  return {
    ...(components.embeddingMicros !== undefined ? { embeddingMicros } : {}),
    ...(components.generationMicros !== undefined ? { generationMicros } : {}),
    ...(components.mcpCalls !== undefined ? { mcpCalls } : {}),
    ...(components.retrievalMatched !== undefined ? { retrievalMatched } : {})
  };
}

function serialise(value: unknown, bytes: number): string {
  let encoded: string | undefined;
  try { encoded = JSON.stringify(value); } catch { /* Fail closed below. */ }
  if (typeof encoded !== 'string' || Buffer.byteLength(encoded) > bytes) throw new ServiceError('INVALID_REQUEST', 400);
  return encoded;
}

function assertLedgerPrivacy(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) assertLedgerPrivacy(item);
    return;
  }
  for (const [k, v] of Object.entries(value)) {
    if (FORBIDDEN_LEDGER_KEYS.has(k)) throw new ServiceError('INVALID_REQUEST', 400);
    assertLedgerPrivacy(v);
  }
}

function validateResultTrace(trace: unknown, requestId: string, generation: string): void {
  if (!Array.isArray(trace) || trace.length > MAX_TRACE_FRAMES) throw new ServiceError('INVALID_REQUEST', 400);
  serialise(trace, MAX_TRACE_BYTES);
  const traceRequestId = uuid.test(requestId) ? requestId : DEFAULT_TRACE_UUID;
  const traceGeneration = uuid.test(generation) ? generation : DEFAULT_TRACE_UUID;
  let validator: ReturnType<typeof contracts.createEventValidator>;
  try {
    validator = contracts.createEventValidator({ requestId: traceRequestId, generation: traceGeneration, corpus });
  } catch {
    throw new ServiceError('INVALID_REQUEST', 400);
  }
  for (const [index, point] of trace.entries()) {
    if (!record(point)) throw new ServiceError('INVALID_REQUEST', 400);
    const candidate = Object.keys(point).sort().join(',') === 'stage,state' &&
      point.stage === 'context' && point.state === 'completed'
      ? { stage: 'context', state: 'completed', elapsedMs: 0, corpusVersion: corpus.corpusVersion, claimCount: 0 }
      : point;
    try {
      validator.accept({
        schemaVersion: '1.0.0',
        requestId: traceRequestId,
        generation: traceGeneration,
        seq: index + 1,
        event: 'trace',
        data: candidate
      });
    } catch {
      throw new ServiceError('INVALID_REQUEST', 400);
    }
  }
}

function storedResult(value: unknown, context?: { requestId: string; generation: string }): { full: string; retained: string; digest: string } {
  if (!isSafeValue(value)) throw new ServiceError('INVALID_REQUEST', 400);
  const full = serialise(value, 65_536);
  if (record(value)) {
    for (const k of Object.keys(value)) {
      if (!ALLOWED_RESULT_KEYS.has(k)) throw new ServiceError('INVALID_REQUEST', 400);
    }
    if (value.trace !== undefined) {
      validateResultTrace(value.trace, context?.requestId ?? DEFAULT_TRACE_UUID, context?.generation ?? DEFAULT_TRACE_UUID);
    }
  }
  // Free-written replies can echo visitor input. Retain them only in session
  // history, which clear removes; the longer-lived ledger keeps public evidence.
  const retained = record(value) ? { ...value } : value;
  if (record(retained)) delete retained.reply;
  assertLedgerPrivacy(retained);
  return { full, retained: serialise(retained, 65_536), digest: hash(full) };
}

function assertDurableRequestWriteSafe(expressionValues: Row, retainedJson: string): void {
  let parsed: unknown;
  try { parsed = JSON.parse(retainedJson); } catch { throw new ServiceError('INVALID_REQUEST', 400); }
  if (record(parsed) && Object.hasOwn(parsed, 'reply')) throw new ServiceError('INVALID_REQUEST', 400);
  assertLedgerPrivacy(parsed);
  for (const k of Object.keys(expressionValues)) {
    if ([':reply', ':text', ':pendingText', ':history', ':prompt', ':jobText'].includes(k)) {
      throw new ServiceError('INVALID_REQUEST', 400);
    }
  }
}

function sameResult(row: Row, result: ReturnType<typeof storedResult>): boolean {
  return row.resultDigest?.S === undefined
    ? string(row, 'result') === result.full
    : row.resultDigest.S === result.digest && string(row, 'result') === result.retained;
}

function conditional(error: unknown): boolean {
  return error instanceof Error && ['ConditionalCheckFailedException', 'TransactionCanceledException'].includes(error.name);
}

function sessionView(id: string, row: Row): Session {
  const turns = number(row, 'turns');
  const history = json<HistoryEntry[]>(row, 'history');
  if (turns > 8 || !Array.isArray(history) || history.length > 8) throw new ServiceError('STATE_UNAVAILABLE', 503);
  return { id, generation: string(row, 'generation'), expiresAt: number(row, 'expiresMs'), remainingTurns: 8 - turns, history };
}

function turnView(row: Row): Turn {
  const reservations = json<Record<Provider, number>>(row, 'reservations');
  costs(reservations);
  const status = string(row, 'status');
  if (status !== 'pending' && status !== 'finished') throw new ServiceError('STATE_UNAVAILABLE', 503);
  const reservationComponents = row.reservationComponents?.S
    ? validateReservationComponents(json<ReservationComponents>(row, 'reservationComponents'), reservations)
    : undefined;
  const actualCosts = row.actualCosts?.S ? json<Record<Provider, number>>(row, 'actualCosts') : undefined;
  if (actualCosts) costs(actualCosts);
  const chargeComponents = row.chargeComponents?.S && actualCosts
    ? validateChargeComponents(json<ChargeComponents>(row, 'chargeComponents'), actualCosts)
    : undefined;
  return {
    sessionId: string(row, 'sessionId'), requestId: string(row, 'requestId'),
    generation: string(row, 'generation'), digest: string(row, 'digest'), reservations,
    priceVersion: string(row, 'priceVersion'), month: string(row, 'month'), status,
    ...(reservationComponents ? { reservationComponents } : {}),
    ...(actualCosts ? { actualCosts } : {}),
    ...(chargeComponents ? { chargeComponents } : {}),
    ...(status === 'finished' ? { result: json<unknown>(row, 'result') } : {})
  };
}

// Reservations include unsettled calls, so process failure cannot refund uncertain charges.
export class AwsChatState implements ChatStateStore {
  private readonly table: string;
  private readonly limits: StateLimits;

  constructor(
    options: { tableName: string; limits?: Partial<StateLimits> },
    private readonly client = new DynamoDBClient({ region: REGION, maxAttempts: 1 }),
    private readonly now: () => number = Date.now
  ) {
    if (!/^[A-Za-z0-9_.-]{3,255}$/.test(options.tableName)) throw new ServiceError('CONFIGURATION_UNAVAILABLE', 503);
    this.table = options.tableName;
    this.limits = { ...DEFAULT_STATE_LIMITS, ...options.limits };
    costs(this.limits.providerBudgetMicros, MAX_MONTHLY_BUDGET_MICROS);
    if (!Number.isSafeInteger(this.limits.monthlyBudgetMicros) || this.limits.monthlyBudgetMicros < 0 ||
        this.limits.monthlyBudgetMicros > MAX_MONTHLY_BUDGET_MICROS || !Number.isSafeInteger(this.limits.dailyVisitorTurns) ||
        this.limits.dailyVisitorTurns < 1 || this.limits.dailyVisitorTurns > 16) throw new ServiceError('CONFIGURATION_UNAVAILABLE', 503);
  }

  private async read(pk: string, sk: string, signal: AbortSignal): Promise<Row | undefined> {
    signal.throwIfAborted();
    try {
      return (await this.client.send(new GetItemCommand({ TableName: this.table, Key: key(pk, sk), ConsistentRead: true }), { abortSignal: signal })).Item;
    } catch { throw new ServiceError('STATE_UNAVAILABLE', 503); }
  }

  private identify(identity: Identity): { id: string; visitorHash: string } {
    if (!identity || !visitor.test(identity.visitorId) || !credential.test(identity.credential)) throw new ServiceError('SESSION_EXPIRED', 401);
    return { id: hash(identity.credential), visitorHash: hash(identity.visitorId) };
  }

  private async authorised(identity: Identity, signal: AbortSignal, allowExpired = false): Promise<{ id: string; row: Row }> {
    const { id, visitorHash } = this.identify(identity);
    const row = await this.read(`SESSION#${id}`, 'STATE', signal);
    if (!row || string(row, 'visitorHash') !== visitorHash || row.revoked?.BOOL ||
        (!allowExpired && number(row, 'expiresMs') <= this.now())) throw new ServiceError('SESSION_EXPIRED', 401);
    return { id, row };
  }

  async openSession(input: { visitorId: string; credential?: string }, signal: AbortSignal): Promise<{ credential: string; session: Session }> {
    if (!visitor.test(input.visitorId)) throw new ServiceError('INVALID_REQUEST', 400);
    if (input.credential) return { credential: input.credential, session: await this.requireSession({ visitorId: input.visitorId, credential: input.credential }, signal) };
    const token = randomBytes(32).toString('base64url');
    const id = hash(token);
    const expiresMs = this.now() + SESSION_MS;
    const row: Row = {
      ...key(`SESSION#${id}`, 'STATE'), visitorHash: s(hash(input.visitorId)), generation: s(randomUUID()),
      expiresMs: n(expiresMs), expiresAt: n(Math.ceil(expiresMs / 1000)), turns: n(0), history: s('[]'), revoked: { BOOL: false }
    };
    try {
      await this.client.send(new PutItemCommand({ TableName: this.table, Item: row, ConditionExpression: 'attribute_not_exists(pk)' }), { abortSignal: signal });
    } catch { throw new ServiceError('STATE_UNAVAILABLE', 503); }
    return { credential: token, session: sessionView(id, row) };
  }

  async requireSession(identity: Identity, signal: AbortSignal): Promise<Session> {
    const { id, row } = await this.authorised(identity, signal);
    return sessionView(id, row);
  }

  private async replay(id: string, generation: string, requestId: string, digest: string, history: HistoryEntry[], signal: AbortSignal): Promise<Turn | undefined> {
    const row = await this.read(`REQUEST#${id}`, requestId, signal);
    if (!row) return undefined;
    if (string(row, 'generation') !== generation || string(row, 'digest') !== digest) throw new ServiceError('REQUEST_CONFLICT', 409);
    const turn = turnView(row);
    if (turn.status === 'finished' && row.published?.BOOL && !row.cancelRequested?.BOOL) {
      const entry = history.find(item => item.requestId === requestId);
      if (entry && row.resultDigest?.S) {
        const result = storedResult(entry.result, { requestId, generation });
        if (!sameResult(row, result)) throw new ServiceError('STATE_UNAVAILABLE', 503);
        return { ...turn, result: entry.result };
      }
    }
    return turn;
  }

  async findTurn(identity: Identity, requestId: string, digest: string, signal: AbortSignal): Promise<{ kind: 'running' | 'finished'; session: Session; turn: Turn } | undefined> {
    if (!uuid.test(requestId) || !/^[a-f0-9]{64}$/.test(digest)) throw new ServiceError('INVALID_REQUEST', 400);
    const session = await this.requireSession(identity, signal);
    const turn = await this.replay(session.id, session.generation, requestId, digest, session.history, signal);
    return turn ? { kind: turn.status === 'pending' ? 'running' : 'finished', session, turn } : undefined;
  }

  async getRequest(
    identity: Identity,
    requestId: string,
    digestOrSignal: string | AbortSignal,
    maybeSignal?: AbortSignal
  ): Promise<{ kind: 'running' | 'finished'; session: Session; turn: Turn } | undefined> {
    if (typeof digestOrSignal === 'string') {
      if (!maybeSignal) throw new ServiceError('INVALID_REQUEST', 400);
      return this.findTurn(identity, requestId, digestOrSignal, maybeSignal);
    }
    if (!uuid.test(requestId)) throw new ServiceError('INVALID_REQUEST', 400);
    const session = await this.requireSession(identity, digestOrSignal);
    const row = await this.read(`REQUEST#${session.id}`, requestId, digestOrSignal);
    if (!row) return undefined;
    const turn = await this.replay(session.id, session.generation, requestId, string(row, 'digest'), session.history, digestOrSignal);
    return turn ? { kind: turn.status === 'pending' ? 'running' : 'finished', session, turn } : undefined;
  }

  private budgetChange(month: string, scope: string, amount: number, limit: number, expiresAt: number): TransactWriteItem {
    return { Update: {
      TableName: this.table, Key: key(`BUDGET#${month}`, scope),
      UpdateExpression: 'SET used = if_not_exists(used, :zero) + :amount, expiresAt = :expiry',
      ConditionExpression: 'attribute_not_exists(used) OR used <= :ceiling',
      ExpressionAttributeValues: { ':zero': n(0), ':amount': n(amount), ':ceiling': n(limit - amount), ':expiry': n(expiresAt) }
    } };
  }

  async beginTurn(input: BeginTurnInput, signal: AbortSignal): Promise<{ kind: 'started' | 'running' | 'finished'; session: Session; turn: Turn }> {
    costs(input.reservations);
    const reservationComponents = validateReservationComponents(input.reservationComponents, input.reservations);
    if (!uuid.test(input.requestId) || !/^[a-f0-9]{64}$/.test(input.digest) ||
        !/^[A-Za-z0-9_.:-]{1,128}$/.test(input.priceVersion) || typeof input.text !== 'string' ||
        !input.text.trim() || Buffer.byteLength(input.text) > 8192) throw new ServiceError('INVALID_REQUEST', 400);
    const { id, row } = await this.authorised(input.identity, signal);
    const session = sessionView(id, row);
    const existing = await this.replay(id, session.generation, input.requestId, input.digest, session.history, signal);
    if (existing) return { kind: existing.status === 'pending' ? 'running' : 'finished', session, turn: existing };
    const now = this.now();
    const month = new Date(now).toISOString().slice(0, 7);
    const day = new Date(now).toISOString().slice(0, 10);
    const expiresAt = Math.ceil(now / 1000) + LEDGER_SECONDS;
    const total = input.reservations.openai + input.reservations.anthropic;
    if (total <= 0 || total > this.limits.monthlyBudgetMicros || PROVIDERS.some(provider => input.reservations[provider] > this.limits.providerBudgetMicros[provider])) {
      throw new ServiceError('BUDGET_EXHAUSTED', 429);
    }
    const ledger: Row = {
      ...key(`REQUEST#${id}`, input.requestId), sessionId: s(id), visitorHash: row.visitorHash!,
      requestId: s(input.requestId), generation: s(session.generation), digest: s(input.digest),
      reservations: s(serialise(input.reservations, 256)), priceVersion: s(input.priceVersion), month: s(month),
      ...(reservationComponents ? { reservationComponents: s(serialise(reservationComponents, 256)) } : {}),
      status: s('pending'), cancelRequested: { BOOL: false }, published: { BOOL: false }, expiresAt: n(expiresAt)
    };
    const items: TransactWriteItem[] = [
      { Update: {
        TableName: this.table, Key: key(`SESSION#${id}`, 'STATE'),
        UpdateExpression: 'SET turns = turns + :one, activeRequestId = :request, activeUntil = :until, pendingText = :text',
        ConditionExpression: 'generation = :generation AND expiresMs > :now AND revoked = :false AND turns < :max AND (attribute_not_exists(activeRequestId) OR activeUntil <= :now)',
        ExpressionAttributeValues: {
          ':one': n(1), ':request': s(input.requestId), ':until': n(now + ACTIVE_LEASE_MS), ':text': s(input.text),
          ':generation': s(session.generation), ':now': n(now), ':false': { BOOL: false }, ':max': n(8)
        }
      } },
      { Put: { TableName: this.table, Item: ledger, ConditionExpression: 'attribute_not_exists(pk)' } },
      this.budgetChange(month, 'ALL', total, this.limits.monthlyBudgetMicros, expiresAt),
      ...PROVIDERS.filter(provider => input.reservations[provider] > 0).map(provider => this.budgetChange(month, provider, input.reservations[provider], this.limits.providerBudgetMicros[provider], expiresAt)),
      { Update: {
        TableName: this.table, Key: key(`VISITOR#${hash(input.identity.visitorId)}`, day),
        UpdateExpression: 'SET turns = if_not_exists(turns, :zero) + :one, expiresAt = :expiry',
        ConditionExpression: 'attribute_not_exists(turns) OR turns < :max',
        ExpressionAttributeValues: { ':zero': n(0), ':one': n(1), ':max': n(this.limits.dailyVisitorTurns), ':expiry': n(expiresAt) }
      } }
    ];
    try {
      await this.client.send(new TransactWriteItemsCommand({ TransactItems: items }), { abortSignal: signal });
    } catch (error) {
      if (!conditional(error)) throw new ServiceError('STATE_UNAVAILABLE', 503);
      // A racing identical request may have won. Read its durable receipt before classifying denial.
      const current = await this.authorised(input.identity, signal);
      const replay = await this.replay(id, string(current.row, 'generation'), input.requestId, input.digest,
        sessionView(id, current.row).history, signal);
      if (replay) return { kind: replay.status === 'pending' ? 'running' : 'finished', session: sessionView(id, current.row), turn: replay };
      if (number(current.row, 'turns') >= 8) throw new ServiceError('RATE_LIMITED', 429);
      if (current.row.activeRequestId && number(current.row, 'activeUntil') > this.now()) throw new ServiceError('REQUEST_ACTIVE', 409);
      const daily = await this.read(`VISITOR#${hash(input.identity.visitorId)}`, day, signal);
      if (daily && number(daily, 'turns') >= this.limits.dailyVisitorTurns) throw new ServiceError('RATE_LIMITED', 429);
      const counters = await Promise.all(['ALL', ...PROVIDERS].map(scope => this.read(`BUDGET#${month}`, scope, signal)));
      if ((counters[0] ? number(counters[0], 'used') : 0) + total > this.limits.monthlyBudgetMicros ||
          PROVIDERS.some((provider, index) => (counters[index + 1] ? number(counters[index + 1]!, 'used') : 0) + input.reservations[provider] > this.limits.providerBudgetMicros[provider])) {
        throw new ServiceError('BUDGET_EXHAUSTED', 429);
      }
      throw new ServiceError('STATE_UNAVAILABLE', 503);
    }
    // A previous turn may have finished between our initial read and lock acquisition.
    // Re-read committed history after acquiring the lock before supplying model context.
    return { kind: 'started', session: await this.requireSession(input.identity, signal), turn: turnView(ledger) };
  }

  async isCancelled(turn: Turn, signal: AbortSignal): Promise<boolean> {
    const [session, ledger] = await Promise.all([
      this.read(`SESSION#${turn.sessionId}`, 'STATE', signal), this.read(`REQUEST#${turn.sessionId}`, turn.requestId, signal)
    ]);
    if (!session || !ledger || session.revoked?.BOOL || ledger.cancelRequested?.BOOL ||
        string(session, 'generation') !== turn.generation || number(session, 'expiresMs') <= this.now()) return true;
    return string(ledger, 'status') === 'pending' &&
      (session.activeRequestId?.S !== turn.requestId || number(session, 'activeUntil') <= this.now());
  }

  async completeTurn(input: CompleteTurnInput, signal: AbortSignal): Promise<{ published: boolean }> {
    const actualCosts = input.actualCosts ?? input.charges!;
    costs(actualCosts);
    if (input.charges && (input.charges.openai !== actualCosts.openai || input.charges.anthropic !== actualCosts.anthropic)) {
      throw new ServiceError('INVALID_REQUEST', 400);
    }
    const chargeComponents = validateChargeComponents(input.chargeComponents, actualCosts);
    const encodedResult = storedResult(input.result, { requestId: input.turn.requestId, generation: input.turn.generation });
    const row = await this.read(`REQUEST#${input.turn.sessionId}`, input.turn.requestId, signal);
    if (!row || string(row, 'generation') !== input.turn.generation || string(row, 'digest') !== input.turn.digest) throw new ServiceError('REQUEST_CONFLICT', 409);
    const authoritative = turnView(row);
    if (PROVIDERS.some(provider => actualCosts[provider] > authoritative.reservations[provider])) throw new ServiceError('INVALID_REQUEST', 400);
    if (authoritative.status === 'pending') {
      const refunds = PROVIDERS.map(provider => authoritative.reservations[provider] - actualCosts[provider]);
      const expressionValues: Row = {
        ':finished': s('finished'), ':pending': s('pending'), ':result': s(encodedResult.retained),
        ':resultDigest': s(encodedResult.digest), ':actual': s(serialise(actualCosts, 256)),
        ...(chargeComponents ? { ':chargeComponents': s(serialise(chargeComponents, 256)) } : {}),
        ':generation': s(authoritative.generation), ':digest': s(authoritative.digest)
      };
      assertDurableRequestWriteSafe(expressionValues, encodedResult.retained);
      const updateSet = 'SET #status = :finished, #result = :result, resultDigest = :resultDigest, actualCosts = :actual' +
        (chargeComponents ? ', chargeComponents = :chargeComponents' : '');
      const items: TransactWriteItem[] = [{ Update: {
        TableName: this.table, Key: key(`REQUEST#${authoritative.sessionId}`, authoritative.requestId),
        UpdateExpression: updateSet,
        ConditionExpression: '#status = :pending AND generation = :generation AND digest = :digest',
        ExpressionAttributeNames: { '#status': 'status', '#result': 'result' },
        ExpressionAttributeValues: expressionValues
      } }];
      for (const [scope, refund] of [['ALL', refunds[0]! + refunds[1]!], ...PROVIDERS.map((provider, index) => [provider, refunds[index]!] as const)] as const) {
        if (!refund) continue;
        items.push({ Update: {
          TableName: this.table, Key: key(`BUDGET#${authoritative.month}`, scope),
          UpdateExpression: 'SET used = used - :refund', ConditionExpression: 'used >= :refund',
          ExpressionAttributeValues: { ':refund': n(refund) }
        } });
      }
      try {
        await this.client.send(new TransactWriteItemsCommand({ TransactItems: items }), { abortSignal: signal });
      } catch (error) {
        if (!conditional(error)) throw new ServiceError('STATE_UNAVAILABLE', 503);
        const settled = await this.read(`REQUEST#${authoritative.sessionId}`, authoritative.requestId, signal);
        if (!settled || string(settled, 'status') !== 'finished') throw new ServiceError('STATE_UNAVAILABLE', 503);
        if (!sameResult(settled, encodedResult)) return { published: false };
      }
    } else if (!sameResult(row, encodedResult)) return { published: false };

    const session = await this.read(`SESSION#${authoritative.sessionId}`, 'STATE', signal);
    if (!session || session.revoked?.BOOL || string(session, 'generation') !== authoritative.generation ||
        number(session, 'expiresMs') <= this.now() || session.activeRequestId?.S !== authoritative.requestId) return { published: false };
    let history = json<HistoryEntry[]>(session, 'history');
    if (input.historyEntry) {
      if (input.historyEntry.text !== session.pendingText?.S || serialise(input.historyEntry.result, 65_536) !== encodedResult.full) throw new ServiceError('INVALID_REQUEST', 400);
      history = [...history, { ...input.historyEntry, requestId: authoritative.requestId }];
    }
    if (history.length > 8) throw new ServiceError('STATE_UNAVAILABLE', 503);
    try {
      await this.client.send(new TransactWriteItemsCommand({ TransactItems: [
        { Update: {
          TableName: this.table, Key: key(`SESSION#${authoritative.sessionId}`, 'STATE'),
          UpdateExpression: 'SET history = :history REMOVE activeRequestId, activeUntil, pendingText',
          ConditionExpression: 'generation = :generation AND expiresMs > :now AND activeUntil > :now AND revoked = :false AND activeRequestId = :request',
          ExpressionAttributeValues: {
            ':history': s(serialise(history, 300_000)), ':generation': s(authoritative.generation),
            ':now': n(this.now()), ':false': { BOOL: false }, ':request': s(authoritative.requestId)
          }
        } },
        { Update: {
          TableName: this.table, Key: key(`REQUEST#${authoritative.sessionId}`, authoritative.requestId),
          UpdateExpression: 'SET published = :true',
          ConditionExpression: '#status = :finished AND cancelRequested = :false',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: { ':finished': s('finished'), ':true': { BOOL: true }, ':false': { BOOL: false } }
        } }
      ] }), { abortSignal: signal });
      return { published: true };
    } catch (error) {
      if (!conditional(error)) throw new ServiceError('STATE_UNAVAILABLE', 503);
      // Cancellation, lease expiry or clear can win after settlement. Release only this turn's lock, never restore history.
      try {
        await this.client.send(new UpdateItemCommand({
          TableName: this.table, Key: key(`SESSION#${authoritative.sessionId}`, 'STATE'),
          UpdateExpression: 'REMOVE activeRequestId, activeUntil, pendingText',
          ConditionExpression: 'activeRequestId = :request AND generation = :generation',
          ExpressionAttributeValues: { ':request': s(authoritative.requestId), ':generation': s(authoritative.generation) }
        }), { abortSignal: signal });
      } catch (releaseError) { if (!conditional(releaseError)) throw new ServiceError('STATE_UNAVAILABLE', 503); }
      return { published: false };
    }
  }

  async failTurn(input: FailTurnInput, signal: AbortSignal): Promise<{ published: boolean }> {
    const actualCosts = input.actualCosts ?? input.charges;
    if (!actualCosts) throw new ServiceError('INVALID_REQUEST', 400);
    const result = input.result ?? {
      kind: 'error',
      code: input.code ?? 'unavailable',
      retryable: input.retryable ?? true,
      ...(input.trace !== undefined ? { trace: input.trace } : {}),
      ...(input.settlement !== undefined ? { settlement: input.settlement } : {})
    };
    return this.completeTurn({
      turn: input.turn,
      actualCosts,
      ...(input.charges ? { charges: input.charges } : {}),
      ...(input.chargeComponents ? { chargeComponents: input.chargeComponents } : {}),
      result
    }, signal);
  }

  async cancel(identity: Identity, requestId: string, signal: AbortSignal): Promise<'requested' | 'already_finished'> {
    if (!uuid.test(requestId)) throw new ServiceError('INVALID_REQUEST', 400);
    const { id, visitorHash } = this.identify(identity);
    const row = await this.read(`REQUEST#${id}`, requestId, signal);
    if (!row || string(row, 'visitorHash') !== visitorHash) throw new ServiceError('SESSION_EXPIRED', 401);
    try {
      await this.client.send(new UpdateItemCommand({
        TableName: this.table, Key: key(`REQUEST#${id}`, requestId),
        UpdateExpression: 'SET cancelRequested = :true', ConditionExpression: 'visitorHash = :visitor',
        ExpressionAttributeValues: { ':true': { BOOL: true }, ':visitor': s(visitorHash) }
      }), { abortSignal: signal });
    } catch { throw new ServiceError('STATE_UNAVAILABLE', 503); }
    return string(row, 'status') === 'finished' ? 'already_finished' : 'requested';
  }

  async cancelTurn(identity: Identity, requestId: string, signal: AbortSignal): Promise<'requested' | 'already_finished'> {
    return this.cancel(identity, requestId, signal);
  }

  async clear(identity: Identity, signal: AbortSignal): Promise<void> {
    const { id, visitorHash } = this.identify(identity);
    try {
      await this.client.send(new UpdateItemCommand({
        TableName: this.table, Key: key(`SESSION#${id}`, 'STATE'),
        UpdateExpression: 'SET revoked = :true, generation = :generation, history = :empty REMOVE activeRequestId, activeUntil, pendingText',
        ConditionExpression: 'visitorHash = :visitor',
        ExpressionAttributeValues: { ':true': { BOOL: true }, ':generation': s(randomUUID()), ':empty': s('[]'), ':visitor': s(visitorHash) }
      }), { abortSignal: signal });
    } catch (error) {
      if (conditional(error)) throw new ServiceError('SESSION_EXPIRED', 401);
      throw new ServiceError('STATE_UNAVAILABLE', 503);
    }
  }
}
