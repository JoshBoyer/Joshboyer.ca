import { createHash, randomBytes, randomUUID } from 'node:crypto';
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
export interface Turn {
  sessionId: string; requestId: string; generation: string; digest: string;
  reservations: Record<Provider, number>; priceVersion: string; month: string;
  status: 'pending' | 'finished'; result?: unknown;
}
export interface StateLimits {
  monthlyBudgetMicros: number;
  providerBudgetMicros: Record<Provider, number>;
  dailyVisitorTurns: number;
}
export interface BeginTurnInput {
  identity: Identity; requestId: string; digest: string; reservations: Record<Provider, number>;
  priceVersion: string; text: string;
}
export interface CompleteTurnInput {
  turn: Turn; actualCosts: Record<Provider, number>; result: unknown; historyEntry?: HistoryEntry;
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
}

export const DEFAULT_STATE_LIMITS: StateLimits = {
  monthlyBudgetMicros: 25_000_000,
  providerBudgetMicros: { openai: 25_000_000, anthropic: 25_000_000 },
  dailyVisitorTurns: 16
};

const SESSION_MS = 24 * 60 * 60 * 1000;
const ACTIVE_LEASE_MS = 120_000;
const LEDGER_SECONDS = 100 * 24 * 60 * 60;
const PROVIDERS = ['openai', 'anthropic'] as const;
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

function costs(value: Record<Provider, number>): void {
  if (!value || Object.keys(value).sort().join(',') !== 'anthropic,openai' ||
      PROVIDERS.some(provider => !Number.isSafeInteger(value[provider]) || value[provider] < 0 || value[provider] > 25_000_000)) {
    throw new ServiceError('INVALID_REQUEST', 400);
  }
}

function serialise(value: unknown, bytes: number): string {
  let encoded: string | undefined;
  try { encoded = JSON.stringify(value); } catch { /* Fail closed below. */ }
  if (typeof encoded !== 'string' || Buffer.byteLength(encoded) > bytes) throw new ServiceError('INVALID_REQUEST', 400);
  return encoded;
}

function storedResult(value: unknown): { full: string; retained: string; digest: string } {
  const full = serialise(value, 65_536);
  // Free-written replies can echo visitor input. Retain them only in session
  // history, which clear removes; the longer-lived ledger keeps public evidence.
  const retained = record(value) ? { ...value } : value;
  if (record(retained)) delete retained.reply;
  return { full, retained: serialise(retained, 65_536), digest: hash(full) };
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
  return {
    sessionId: string(row, 'sessionId'), requestId: string(row, 'requestId'),
    generation: string(row, 'generation'), digest: string(row, 'digest'), reservations,
    priceVersion: string(row, 'priceVersion'), month: string(row, 'month'), status,
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
    costs(this.limits.providerBudgetMicros);
    if (!Number.isSafeInteger(this.limits.monthlyBudgetMicros) || this.limits.monthlyBudgetMicros < 0 ||
        this.limits.monthlyBudgetMicros > 25_000_000 || !Number.isSafeInteger(this.limits.dailyVisitorTurns) ||
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
        const result = storedResult(entry.result);
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
    costs(input.actualCosts);
    const encodedResult = storedResult(input.result);
    const row = await this.read(`REQUEST#${input.turn.sessionId}`, input.turn.requestId, signal);
    if (!row || string(row, 'generation') !== input.turn.generation || string(row, 'digest') !== input.turn.digest) throw new ServiceError('REQUEST_CONFLICT', 409);
    const authoritative = turnView(row);
    if (PROVIDERS.some(provider => input.actualCosts[provider] > authoritative.reservations[provider])) throw new ServiceError('INVALID_REQUEST', 400);
    if (authoritative.status === 'pending') {
      const refunds = PROVIDERS.map(provider => authoritative.reservations[provider] - input.actualCosts[provider]);
      const items: TransactWriteItem[] = [{ Update: {
        TableName: this.table, Key: key(`REQUEST#${authoritative.sessionId}`, authoritative.requestId),
        UpdateExpression: 'SET #status = :finished, #result = :result, resultDigest = :resultDigest, actualCosts = :actual',
        ConditionExpression: '#status = :pending AND generation = :generation AND digest = :digest',
        ExpressionAttributeNames: { '#status': 'status', '#result': 'result' },
        ExpressionAttributeValues: {
          ':finished': s('finished'), ':pending': s('pending'), ':result': s(encodedResult.retained),
          ':resultDigest': s(encodedResult.digest), ':actual': s(serialise(input.actualCosts, 256)),
          ':generation': s(authoritative.generation), ':digest': s(authoritative.digest)
        }
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
          ConditionExpression: 'generation = :generation AND expiresMs > :now AND revoked = :false AND activeRequestId = :request',
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
      // Cancellation or clear can win after settlement. Release only this turn's lock, never restore history.
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
