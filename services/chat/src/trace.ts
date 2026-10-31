import { types } from 'node:util';
import type { StreamFrame } from './cag.js';
import type { Provider } from './config.js';
import { PRICE_VERSION } from './chat-pricing.js';
import { ServiceError } from './errors.js';

export type TraceStage =
  | 'context'
  | 'routing'
  | 'retrieval'
  | 'budget'
  | 'mcp'
  | 'provider'
  | 'validation'
  | 'settlement';

export type TraceState = 'started' | 'completed' | 'failed' | 'cancelled';

export type TraceCode =
  | 'unavailable'
  | 'invalid_request'
  | 'session_expired'
  | 'rate_limited'
  | 'budget_exhausted'
  | 'deadline_exceeded'
  | 'upstream_failure'
  | 'validation_failed'
  | 'request_conflict';

export type ToolName = 'search_public_evidence' | 'get_case_study' | 'compare_job_requirements';
export type RoutingMode = 'general' | 'portfolio_cag' | 'portfolio_rag' | 'portfolio_mcp';
export type RoutingModeInput = RoutingMode | 'cag_only' | 'rag' | 'mcp' | 'rag_and_mcp';
export type RetrievalMode = 'hybrid' | 'deterministic_only' | 'cag_only' | 'degraded' | 'skipped';
export type RetrievalModeInput = RetrievalMode | 'vector' | 'lexical' | 'cag_fallback';
export type McpMethod = 'initialize' | 'tools/list' | 'tools/call';
export type ToolOutcome = 'completed' | 'error' | 'timeout' | 'skipped';
export type ToolOutcomeInput = ToolOutcome | 'matched' | 'empty';

export interface TracePoint {
  stage: TraceStage;
  state: TraceState;
  elapsedMs: number | null;
  durationMs?: number;
  replayed?: boolean;
  attempt?: number;
  provider?: Provider;
  model?: string;
  corpusVersion?: string;
  claimCount?: number;
  routingMode?: RoutingMode;
  needsRetrieval?: boolean;
  requestedTools?: ToolName[];
  indexVersion?: string;
  retrievalMode?: RetrievalMode;
  embeddingModel?: 'text-embedding-3-small';
  matchedCount?: number;
  toolCallId?: string;
  toolName?: ToolName;
  mcpMethod?: McpMethod;
  toolOutcome?: ToolOutcome;
  reservedMicros?: number;
  chargedMicros?: number;
  priceVersion?: string;
  usageStatus?: 'known' | 'unknown';
  inputTokens?: number | null;
  outputTokens?: number | null;
  cacheReadInputTokens?: number | null;
  cacheWriteInputTokens?: number | null;
  reasoningOutputTokens?: number | null;
  providerRequestId?: string;
  gatewayRequestId?: string;
  code?: string;
}

export interface SettlementSummary {
  reservedMicros: number;
  chargedMicros: number;
  priceVersion: string;
}

export const STAGE_FIELDS: Readonly<Record<TraceStage, readonly string[]>> = Object.freeze({
  context: Object.freeze(['stage', 'state', 'elapsedMs', 'durationMs', 'replayed', 'corpusVersion', 'claimCount', 'code']),
  routing: Object.freeze([
    'stage',
    'state',
    'elapsedMs',
    'durationMs',
    'replayed',
    'routingMode',
    'needsRetrieval',
    'requestedTools',
    'code'
  ]),
  retrieval: Object.freeze([
    'stage',
    'state',
    'elapsedMs',
    'durationMs',
    'replayed',
    'corpusVersion',
    'indexVersion',
    'retrievalMode',
    'embeddingModel',
    'matchedCount',
    'code'
  ]),
  budget: Object.freeze(['stage', 'state', 'elapsedMs', 'durationMs', 'replayed', 'reservedMicros', 'priceVersion', 'code']),
  mcp: Object.freeze([
    'stage',
    'state',
    'elapsedMs',
    'durationMs',
    'replayed',
    'attempt',
    'toolCallId',
    'toolName',
    'mcpMethod',
    'toolOutcome',
    'code'
  ]),
  provider: Object.freeze([
    'stage',
    'state',
    'elapsedMs',
    'durationMs',
    'replayed',
    'attempt',
    'provider',
    'model',
    'reservedMicros',
    'chargedMicros',
    'usageStatus',
    'inputTokens',
    'outputTokens',
    'cacheReadInputTokens',
    'cacheWriteInputTokens',
    'reasoningOutputTokens',
    'providerRequestId',
    'gatewayRequestId',
    'code'
  ]),
  validation: Object.freeze([
    'stage',
    'state',
    'elapsedMs',
    'durationMs',
    'replayed',
    'attempt',
    'provider',
    'model',
    'corpusVersion',
    'claimCount',
    'code'
  ]),
  settlement: Object.freeze([
    'stage',
    'state',
    'elapsedMs',
    'durationMs',
    'replayed',
    'reservedMicros',
    'chargedMicros',
    'priceVersion',
    'code'
  ])
});

const contracts = require('../../../chat/contracts/index.cjs') as {
  assertValid(name: string, value: unknown): unknown;
};
const corpusArtifact = require('../../../chat/knowledge/corpus.json') as {
  corpusVersion: string;
  claims: ReadonlyArray<{ id: string }>;
  sources: ReadonlyArray<{ id: string }>;
};

const DEFAULT_CORPUS_VERSION = corpusArtifact.corpusVersion;
const APPROVED_CLAIM_IDS = new Set(corpusArtifact.claims.map(claim => claim.id));
const APPROVED_SOURCE_IDS = new Set(corpusArtifact.sources.map(source => source.id));
const MAX_MATCHED_COUNT = corpusArtifact.claims.length;
const FORBIDDEN_IDENTIFIER_PATTERN = /canary-|^(?:https?|wss?|ftp|file|data|javascript):|^(?:sk-|rk-|pk-|AKIA|ASIA|Bearer)/i;

function failTraceValidation(): never {
  throw new ServiceError('ANSWER_VALIDATION_FAILED', 502);
}

function isSafePlainObject(value: unknown, seen = new Set<unknown>()): value is Record<string, unknown> {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value) || types.isProxy(value) || seen.has(value)) {
      return false;
    }
    const proto = Object.getPrototypeOf(value);
    if ((proto !== Object.prototype && proto !== null) || Object.getOwnPropertySymbols(value).length > 0) {
      return false;
    }
    seen.add(value);
    try {
      const descriptors = Object.getOwnPropertyDescriptors(value);
      for (const [key, desc] of Object.entries(descriptors)) {
        if (key === '__proto__' || 'get' in desc || 'set' in desc || !desc.enumerable) return false;
        const fieldValue = desc.value;
        if (Array.isArray(fieldValue)) {
          if (
            types.isProxy(fieldValue) ||
            Object.getPrototypeOf(fieldValue) !== Array.prototype ||
            Object.getOwnPropertySymbols(fieldValue).length > 0
          ) {
            return false;
          }
          const arrayDescs = Object.getOwnPropertyDescriptors(fieldValue);
          if (Object.keys(arrayDescs).length !== fieldValue.length + 1) return false;
          for (let i = 0; i < fieldValue.length; i += 1) {
            const itemDesc = arrayDescs[i];
            if (!itemDesc || 'get' in itemDesc || 'set' in itemDesc || !itemDesc.enumerable) return false;
            if (itemDesc.value !== null && typeof itemDesc.value === 'object' && !isSafePlainObject(itemDesc.value, seen)) {
              return false;
            }
          }
        } else if (fieldValue !== null && typeof fieldValue === 'object' && !isSafePlainObject(fieldValue, seen)) {
          return false;
        }
      }
      return true;
    } finally {
      seen.delete(value);
    }
  } catch {
    return false;
  }
}

function assertAllowedInput(value: unknown, allowedKeys: readonly string[]): Record<string, unknown> {
  if (!isSafePlainObject(value)) failTraceValidation();
  for (const key of Object.keys(value)) {
    if (!allowedKeys.includes(key)) failTraceValidation();
  }
  return value;
}

function assertCleanIdentifiers(point: TracePoint): void {
  for (const field of ['indexVersion', 'priceVersion', 'providerRequestId', 'gatewayRequestId', 'toolCallId'] as const) {
    const val = point[field];
    if (val !== undefined && (typeof val !== 'string' || FORBIDDEN_IDENTIFIER_PATTERN.test(val))) {
      failTraceValidation();
    }
  }
}

function validateEvidenceRefs(claimIds?: ReadonlyArray<string>, sourceIds?: ReadonlyArray<string>, matchedCount?: number): void {
  if (claimIds !== undefined) {
    if (
      !Array.isArray(claimIds) ||
      types.isProxy(claimIds) ||
      claimIds.length > MAX_MATCHED_COUNT ||
      new Set(claimIds).size !== claimIds.length ||
      (matchedCount !== undefined && claimIds.length > matchedCount) ||
      claimIds.some(id => typeof id !== 'string' || !APPROVED_CLAIM_IDS.has(id))
    ) {
      failTraceValidation();
    }
  }
  if (sourceIds !== undefined) {
    if (
      !Array.isArray(sourceIds) ||
      types.isProxy(sourceIds) ||
      sourceIds.length > APPROVED_SOURCE_IDS.size ||
      new Set(sourceIds).size !== sourceIds.length ||
      sourceIds.some(id => typeof id !== 'string' || !APPROVED_SOURCE_IDS.has(id))
    ) {
      failTraceValidation();
    }
  }
}

function stageKeyFor(point: Pick<TracePoint, 'stage' | 'attempt' | 'toolCallId' | 'mcpMethod'>): string {
  if (point.stage === 'provider' || point.stage === 'validation') {
    return `${point.stage}-${point.attempt ?? 1}`;
  }
  if (point.stage === 'mcp') {
    return `mcp-${point.toolCallId ?? point.mcpMethod ?? (point.attempt ?? 1)}`;
  }
  return point.stage;
}

function normalizeRoutingMode(mode: unknown): RoutingMode {
  switch (mode) {
    case 'general':
      return 'general';
    case 'portfolio_cag':
    case 'cag_only':
      return 'portfolio_cag';
    case 'portfolio_rag':
    case 'rag':
      return 'portfolio_rag';
    case 'portfolio_mcp':
    case 'mcp':
    case 'rag_and_mcp':
      return 'portfolio_mcp';
    default:
      failTraceValidation();
  }
}

function normalizeRetrievalMode(mode: unknown, allowSkipped = false): RetrievalMode {
  switch (mode) {
    case 'hybrid':
    case 'vector':
      return 'hybrid';
    case 'deterministic_only':
    case 'lexical':
      return 'deterministic_only';
    case 'cag_only':
    case 'cag_fallback':
      return 'cag_only';
    case 'degraded':
      return 'degraded';
    case 'skipped':
      if (!allowSkipped) failTraceValidation();
      return 'skipped';
    default:
      failTraceValidation();
  }
}

function normalizeToolOutcome(outcome: unknown, forFailure = false): ToolOutcome {
  if (forFailure) {
    if (outcome === undefined || outcome === 'error') return 'error';
    if (outcome === 'timeout') return 'timeout';
    failTraceValidation();
  }
  switch (outcome) {
    case undefined:
    case 'completed':
    case 'matched':
    case 'empty':
      return 'completed';
    case 'skipped':
      return 'skipped';
    default:
      failTraceValidation();
  }
}

export function validateTrace(points: unknown): TracePoint[] {
  try {
    if (!Array.isArray(points) || types.isProxy(points) || points.length > 24) throw new Error();
    let elapsed = 0;
    const stages = new Map<string, TracePoint['state']>();
    const stageStartElapsed = new Map<string, number>();
    for (const raw of points) {
      if (!isSafePlainObject(raw)) throw new Error();
      contracts.assertValid('traceData', raw);
      const point = raw as unknown as TracePoint;
      const allowedFields = STAGE_FIELDS[point.stage];
      if (!allowedFields || Object.keys(raw).some(key => !allowedFields.includes(key))) throw new Error();
      assertCleanIdentifiers(point);
      if (point.stage === 'retrieval' && point.matchedCount !== undefined) {
        if (!Number.isSafeInteger(point.matchedCount) || point.matchedCount < 0 || point.matchedCount > MAX_MATCHED_COUNT) {
          throw new Error();
        }
      }
      if (point.provider === 'openai' && point.model !== undefined && point.model !== 'gpt-6-luna') throw new Error();
      if (point.provider === 'anthropic' && point.model !== undefined && point.model !== 'claude-haiku-5-5') throw new Error();

      const key = stageKeyFor(point);
      const previous = stages.get(key);
      if (
        (previous && previous !== 'started') ||
        (previous === 'started' && point.state === 'started') ||
        (!previous && ['provider', 'validation', 'mcp'].includes(point.stage) && point.state !== 'started')
      ) {
        throw new Error();
      }
      if (point.stage === 'retrieval') {
        if (point.retrievalMode === 'skipped') {
          if (previous !== undefined || point.state !== 'completed' || point.matchedCount !== 0 || point.durationMs !== undefined) {
            throw new Error();
          }
        } else if ((point.state === 'failed' || point.state === 'cancelled') && previous !== 'started') {
          throw new Error();
        }
      }

      if (point.elapsedMs !== null) {
        const startedElapsed = stageStartElapsed.get(key) ?? 0;
        if (
          point.elapsedMs < elapsed ||
          (point.durationMs ?? 0) > point.elapsedMs ||
          (previous === 'started' && (point.durationMs ?? 0) > point.elapsedMs - startedElapsed)
        ) {
          throw new Error();
        }
        elapsed = point.elapsedMs;
        if (point.state === 'started') {
          stageStartElapsed.set(key, point.elapsedMs);
        }
      }
      if (point.chargedMicros !== undefined && point.reservedMicros !== undefined && point.chargedMicros > point.reservedMicros) {
        throw new Error();
      }
      stages.set(key, point.state);
    }
    return structuredClone(points) as TracePoint[];
  } catch {
    failTraceValidation();
  }
}

export function validateSettlement(value: unknown): SettlementSummary {
  try {
    if (
      !isSafePlainObject(value) ||
      Object.keys(value).sort().join(',') !== 'chargedMicros,priceVersion,reservedMicros'
    ) {
      throw new Error();
    }
    const point = {
      stage: 'settlement' as const,
      state: 'completed' as const,
      elapsedMs: null,
      ...value,
      replayed: true
    };
    contracts.assertValid('traceData', point);
    assertCleanIdentifiers(point as unknown as TracePoint);
    const summary = value as unknown as SettlementSummary;
    if (summary.chargedMicros > summary.reservedMicros) throw new Error();
    return { ...summary };
  } catch {
    failTraceValidation();
  }
}

export class TraceRecorder {
  protected readonly startedAt: number;
  protected readonly points: TracePoint[] = [];
  protected readonly stageStartTimes = new Map<string, { timestamp: number; elapsedMs: number }>();

  constructor(protected readonly now: () => number = Date.now) {
    this.startedAt = now();
  }

  timestamp(): number {
    return this.now();
  }

  duration(startedAt: number): number {
    return Math.max(0, Math.min(60000, Math.round(this.now() - startedAt)));
  }

  protected nextElapsedMs(): number {
    const previous = this.points.at(-1)?.elapsedMs ?? 0;
    const rawElapsed = Math.max(0, Math.round(this.now() - this.startedAt));
    return Math.max(previous, rawElapsed);
  }

  add(value: Omit<TracePoint, 'elapsedMs'>): TracePoint {
    if (!isSafePlainObject(value)) failTraceValidation();
    const elapsedMs = this.nextElapsedMs();
    const key = stageKeyFor(value);
    const started = this.stageStartTimes.get(key);
    const adjustedDuration =
      value.durationMs !== undefined && started && value.state !== 'started'
        ? Math.min(value.durationMs, Math.max(0, elapsedMs - started.elapsedMs))
        : value.durationMs;
    const point: TracePoint = {
      ...value,
      ...(adjustedDuration === undefined ? {} : { durationMs: adjustedDuration }),
      elapsedMs
    };
    const checked = validateTrace([...this.points, point]);
    const committed = checked.at(-1)!;
    this.points.push(committed);
    if (committed.state === 'started' && committed.elapsedMs !== null) {
      this.stageStartTimes.set(key, { timestamp: this.now(), elapsedMs: committed.elapsedMs });
    }
    return structuredClone(committed);
  }

  snapshot(): TracePoint[] {
    return structuredClone(this.points);
  }
}

export interface TraceCollectorOptions {
  requestId?: string;
  generation?: string;
  now?: () => number;
  nextSeq?: () => number;
  corpusVersion?: string;
}

const DEFAULT_REQUEST_ID = '11111111-1111-4111-8111-111111111111';
const DEFAULT_GENERATION = '22222222-2222-4222-8222-222222222222';

export class TraceCollector extends TraceRecorder {
  private readonly requestId: string;
  private readonly generation: string;
  private readonly corpusVersion: string;
  private readonly nextSeqFn?: () => number;
  private seq = 0;
  private retrievalSkippedFlag = false;
  private readonly mcpStarts = new Map<
    string,
    { mcpMethod: McpMethod; toolCallId?: string; toolName?: ToolName; attempt?: 1 | 2; timestamp: number; elapsedMs: number }
  >();
  private readonly recordedFrames: StreamFrame[] = [];

  constructor(options: TraceCollectorOptions | (() => number) = {}) {
    const resolved = typeof options === 'function' ? { now: options } : options;
    super(resolved.now ?? Date.now);
    this.requestId = resolved.requestId ?? DEFAULT_REQUEST_ID;
    this.generation = resolved.generation ?? DEFAULT_GENERATION;
    this.corpusVersion = resolved.corpusVersion ?? DEFAULT_CORPUS_VERSION;
    this.nextSeqFn = resolved.nextSeq;
    contracts.assertValid('uuid', this.requestId);
    contracts.assertValid('uuid', this.generation);
    contracts.assertValid('corpusVersion', this.corpusVersion);
  }

  private allocateSeq(): number {
    if (this.nextSeqFn) return this.nextSeqFn();
    this.seq += 1;
    return this.seq;
  }

  private emitPoint(raw: Omit<TracePoint, 'elapsedMs'>, explicitDurationMs?: number): StreamFrame {
    const elapsedMs = this.nextElapsedMs();
    const key = stageKeyFor(raw);
    const started = this.stageStartTimes.get(key);
    let durationMs = explicitDurationMs;
    if (durationMs === undefined && started && raw.state !== 'started') {
      const rawDuration = Math.max(0, Math.round(this.now() - started.timestamp));
      durationMs = Math.max(0, Math.min(rawDuration, elapsedMs - started.elapsedMs));
    }
    const candidate: TracePoint = {
      ...raw,
      ...(durationMs === undefined ? {} : { durationMs }),
      elapsedMs
    };
    const checked = validateTrace([...this.points, candidate]);
    const committed = checked.at(-1)!;
    this.points.push(committed);
    if (committed.state === 'started' && committed.elapsedMs !== null) {
      this.stageStartTimes.set(key, { timestamp: this.now(), elapsedMs: committed.elapsedMs });
    }
    const frame: StreamFrame = {
      schemaVersion: '1.0.0',
      requestId: this.requestId,
      generation: this.generation,
      seq: this.allocateSeq(),
      event: 'trace',
      data: structuredClone(committed)
    };
    contracts.assertValid('streamEvent', frame);
    this.recordedFrames.push(structuredClone(frame));
    return structuredClone(frame);
  }

  routingStarted(input: { durationMs?: never } = {}): StreamFrame {
    assertAllowedInput(input, []);
    return this.emitPoint({ stage: 'routing', state: 'started' });
  }

  routingCompleted(input: {
    routingMode: RoutingModeInput;
    needsRetrieval: boolean;
    requestedTools?: ReadonlyArray<ToolName>;
    durationMs?: number;
  }): StreamFrame {
    assertAllowedInput(input, ['routingMode', 'needsRetrieval', 'requestedTools', 'durationMs']);
    if (typeof input.needsRetrieval !== 'boolean') failTraceValidation();
    const routingMode = normalizeRoutingMode(input.routingMode);
    let requestedTools: ToolName[] | undefined;
    if (input.requestedTools !== undefined) {
      if (!Array.isArray(input.requestedTools) || types.isProxy(input.requestedTools)) failTraceValidation();
      requestedTools = [...input.requestedTools];
    }
    return this.emitPoint(
      {
        stage: 'routing',
        state: 'completed',
        routingMode,
        needsRetrieval: input.needsRetrieval,
        ...(requestedTools && requestedTools.length > 0 ? { requestedTools } : {})
      },
      input.durationMs
    );
  }

  retrievalStarted(input: {
    retrievalMode: RetrievalModeInput;
    indexVersion?: string;
    embeddingModel?: 'text-embedding-3-small';
  }): StreamFrame {
    assertAllowedInput(input, ['retrievalMode', 'indexVersion', 'embeddingModel']);
    if (this.retrievalSkippedFlag || this.stageStartTimes.has('retrieval') || this.points.some(p => p.stage === 'retrieval')) {
      failTraceValidation();
    }
    const retrievalMode = normalizeRetrievalMode(input.retrievalMode, false);
    return this.emitPoint({
      stage: 'retrieval',
      state: 'started',
      retrievalMode,
      ...(input.indexVersion === undefined ? {} : { indexVersion: input.indexVersion }),
      ...(input.embeddingModel === undefined ? {} : { embeddingModel: input.embeddingModel })
    });
  }

  retrievalCompleted(input: {
    durationMs?: number;
    indexVersion: string;
    retrievalMode: RetrievalModeInput;
    embeddingModel?: 'text-embedding-3-small';
    matchedCount: number;
    corpusVersion?: string;
    claimIds?: ReadonlyArray<string>;
    sourceIds?: ReadonlyArray<string>;
  }): StreamFrame {
    assertAllowedInput(input, [
      'durationMs',
      'indexVersion',
      'retrievalMode',
      'embeddingModel',
      'matchedCount',
      'corpusVersion',
      'claimIds',
      'sourceIds'
    ]);
    if (this.retrievalSkippedFlag || !this.stageStartTimes.has('retrieval')) {
      failTraceValidation();
    }
    if (typeof input.indexVersion !== 'string' || !input.indexVersion.length) failTraceValidation();
    validateEvidenceRefs(input.claimIds, input.sourceIds, input.matchedCount);
    const retrievalMode = normalizeRetrievalMode(input.retrievalMode, false);
    return this.emitPoint(
      {
        stage: 'retrieval',
        state: 'completed',
        indexVersion: input.indexVersion,
        retrievalMode,
        matchedCount: input.matchedCount,
        corpusVersion: input.corpusVersion ?? this.corpusVersion,
        ...(input.embeddingModel === undefined ? {} : { embeddingModel: input.embeddingModel })
      },
      input.durationMs
    );
  }

  retrievalFailed(input: {
    durationMs?: number;
    indexVersion?: string;
    retrievalMode?: RetrievalModeInput;
    embeddingModel?: 'text-embedding-3-small';
    code: TraceCode;
  }): StreamFrame {
    assertAllowedInput(input, ['durationMs', 'indexVersion', 'retrievalMode', 'embeddingModel', 'code']);
    if (this.retrievalSkippedFlag || !this.stageStartTimes.has('retrieval')) {
      failTraceValidation();
    }
    const retrievalMode = input.retrievalMode === undefined ? undefined : normalizeRetrievalMode(input.retrievalMode, false);
    return this.emitPoint(
      {
        stage: 'retrieval',
        state: 'failed',
        code: input.code,
        ...(input.indexVersion === undefined ? {} : { indexVersion: input.indexVersion }),
        ...(retrievalMode === undefined ? {} : { retrievalMode }),
        ...(input.embeddingModel === undefined ? {} : { embeddingModel: input.embeddingModel })
      },
      input.durationMs
    );
  }

  retrievalSkipped(input: {
    retrievalMode?: RetrievalModeInput;
    indexVersion?: string;
    corpusVersion?: string;
  } = {}): StreamFrame {
    assertAllowedInput(input, ['retrievalMode', 'indexVersion', 'corpusVersion']);
    if (this.retrievalSkippedFlag || this.stageStartTimes.has('retrieval') || this.points.some(p => p.stage === 'retrieval')) {
      failTraceValidation();
    }
    if (input.retrievalMode !== undefined) {
      normalizeRetrievalMode(input.retrievalMode, true);
    }
    this.retrievalSkippedFlag = true;
    return this.emitPoint({
      stage: 'retrieval',
      state: 'completed',
      retrievalMode: 'skipped',
      matchedCount: 0,
      corpusVersion: input.corpusVersion ?? this.corpusVersion,
      ...(input.indexVersion === undefined ? {} : { indexVersion: input.indexVersion })
    });
  }

  mcpStarted(input: {
    mcpMethod: McpMethod;
    toolCallId?: string;
    toolName?: ToolName;
    attempt?: 1 | 2;
  }): StreamFrame {
    assertAllowedInput(input, ['mcpMethod', 'toolCallId', 'toolName', 'attempt']);
    const key = stageKeyFor({ stage: 'mcp', ...input });
    if (this.mcpStarts.has(key)) failTraceValidation();
    const frame = this.emitPoint({
      stage: 'mcp',
      state: 'started',
      mcpMethod: input.mcpMethod,
      ...(input.toolCallId === undefined ? {} : { toolCallId: input.toolCallId }),
      ...(input.toolName === undefined ? {} : { toolName: input.toolName }),
      ...(input.attempt === undefined ? {} : { attempt: input.attempt })
    });
    const startedPoint = frame.data as TracePoint;
    this.mcpStarts.set(key, {
      mcpMethod: input.mcpMethod,
      toolCallId: input.toolCallId,
      toolName: input.toolName,
      attempt: input.attempt,
      timestamp: this.now(),
      elapsedMs: startedPoint.elapsedMs ?? 0
    });
    return frame;
  }

  mcpCompleted(input: {
    durationMs?: number;
    mcpMethod: McpMethod;
    toolCallId?: string;
    toolName?: ToolName;
    toolOutcome?: ToolOutcomeInput;
    claimIds?: ReadonlyArray<string>;
    sourceIds?: ReadonlyArray<string>;
    attempt?: 1 | 2;
  }): StreamFrame {
    assertAllowedInput(input, [
      'durationMs',
      'mcpMethod',
      'toolCallId',
      'toolName',
      'toolOutcome',
      'claimIds',
      'sourceIds',
      'attempt'
    ]);
    const key = stageKeyFor({ stage: 'mcp', ...input });
    const started = this.mcpStarts.get(key);
    if (!started || started.mcpMethod !== input.mcpMethod || started.toolName !== input.toolName || started.toolCallId !== input.toolCallId) {
      failTraceValidation();
    }
    validateEvidenceRefs(input.claimIds, input.sourceIds);
    const toolOutcome = normalizeToolOutcome(input.toolOutcome, false);
    return this.emitPoint(
      {
        stage: 'mcp',
        state: 'completed',
        mcpMethod: input.mcpMethod,
        toolOutcome,
        ...(input.toolCallId === undefined ? {} : { toolCallId: input.toolCallId }),
        ...(input.toolName === undefined ? {} : { toolName: input.toolName }),
        ...(input.attempt === undefined ? {} : { attempt: input.attempt })
      },
      input.durationMs
    );
  }

  mcpFailed(input: {
    durationMs?: number;
    mcpMethod: McpMethod;
    toolCallId?: string;
    toolName?: ToolName;
    toolOutcome?: 'error' | 'timeout';
    code: TraceCode;
    attempt?: 1 | 2;
  }): StreamFrame {
    assertAllowedInput(input, ['durationMs', 'mcpMethod', 'toolCallId', 'toolName', 'toolOutcome', 'code', 'attempt']);
    const key = stageKeyFor({ stage: 'mcp', ...input });
    const started = this.mcpStarts.get(key);
    if (!started || started.mcpMethod !== input.mcpMethod || started.toolName !== input.toolName || started.toolCallId !== input.toolCallId) {
      failTraceValidation();
    }
    const toolOutcome = normalizeToolOutcome(input.toolOutcome, true);
    return this.emitPoint(
      {
        stage: 'mcp',
        state: 'failed',
        mcpMethod: input.mcpMethod,
        toolOutcome,
        code: input.code,
        ...(input.toolCallId === undefined ? {} : { toolCallId: input.toolCallId }),
        ...(input.toolName === undefined ? {} : { toolName: input.toolName }),
        ...(input.attempt === undefined ? {} : { attempt: input.attempt })
      },
      input.durationMs
    );
  }

  contextCompleted(input: { durationMs?: number; corpusVersion?: string; claimCount: number }): StreamFrame {
    assertAllowedInput(input, ['durationMs', 'corpusVersion', 'claimCount']);
    return this.emitPoint(
      {
        stage: 'context',
        state: 'completed',
        corpusVersion: input.corpusVersion ?? this.corpusVersion,
        claimCount: input.claimCount
      },
      input.durationMs
    );
  }

  budgetCompleted(input: { durationMs?: number; reservedMicros: number; priceVersion?: string }): StreamFrame {
    assertAllowedInput(input, ['durationMs', 'reservedMicros', 'priceVersion']);
    return this.emitPoint(
      {
        stage: 'budget',
        state: 'completed',
        reservedMicros: input.reservedMicros,
        priceVersion: input.priceVersion ?? PRICE_VERSION
      },
      input.durationMs
    );
  }

  providerStarted(input: {
    attempt?: 1 | 2;
    provider: Provider;
    model?: string;
    reservedMicros?: number;
  }): StreamFrame {
    assertAllowedInput(input, ['attempt', 'provider', 'model', 'reservedMicros']);
    const model = input.model ?? (input.provider === 'openai' ? 'gpt-6-luna' : 'claude-haiku-5-5');
    return this.emitPoint({
      stage: 'provider',
      state: 'started',
      attempt: input.attempt ?? 1,
      provider: input.provider,
      model,
      ...(input.reservedMicros === undefined ? {} : { reservedMicros: input.reservedMicros })
    });
  }

  providerCompleted(input: {
    attempt?: 1 | 2;
    provider: Provider;
    model?: string;
    durationMs?: number;
    reservedMicros?: number;
    chargedMicros?: number;
    usageStatus?: 'known' | 'unknown';
    inputTokens?: number | null;
    outputTokens?: number | null;
    cacheReadInputTokens?: number | null;
    cacheWriteInputTokens?: number | null;
    reasoningOutputTokens?: number | null;
    providerRequestId?: string;
    gatewayRequestId?: string;
  }): StreamFrame {
    assertAllowedInput(input, [
      'attempt',
      'provider',
      'model',
      'durationMs',
      'reservedMicros',
      'chargedMicros',
      'usageStatus',
      'inputTokens',
      'outputTokens',
      'cacheReadInputTokens',
      'cacheWriteInputTokens',
      'reasoningOutputTokens',
      'providerRequestId',
      'gatewayRequestId'
    ]);
    const attempt = input.attempt ?? 1;
    const model = input.model ?? (input.provider === 'openai' ? 'gpt-6-luna' : 'claude-haiku-5-5');
    return this.emitPoint(
      {
        stage: 'provider',
        state: 'completed',
        attempt,
        provider: input.provider,
        model,
        ...(input.reservedMicros === undefined ? {} : { reservedMicros: input.reservedMicros }),
        ...(input.chargedMicros === undefined ? {} : { chargedMicros: input.chargedMicros }),
        ...(input.usageStatus === undefined ? {} : { usageStatus: input.usageStatus }),
        ...(input.inputTokens === undefined ? {} : { inputTokens: input.inputTokens }),
        ...(input.outputTokens === undefined ? {} : { outputTokens: input.outputTokens }),
        ...(input.cacheReadInputTokens === undefined ? {} : { cacheReadInputTokens: input.cacheReadInputTokens }),
        ...(input.cacheWriteInputTokens === undefined ? {} : { cacheWriteInputTokens: input.cacheWriteInputTokens }),
        ...(input.reasoningOutputTokens === undefined ? {} : { reasoningOutputTokens: input.reasoningOutputTokens }),
        ...(input.providerRequestId === undefined ? {} : { providerRequestId: input.providerRequestId }),
        ...(input.gatewayRequestId === undefined ? {} : { gatewayRequestId: input.gatewayRequestId })
      },
      input.durationMs
    );
  }

  providerFailed(input: {
    attempt?: 1 | 2;
    provider: Provider;
    model?: string;
    durationMs?: number;
    reservedMicros?: number;
    chargedMicros?: number;
    usageStatus?: 'known' | 'unknown';
    code: TraceCode;
    providerRequestId?: string;
    gatewayRequestId?: string;
  }): StreamFrame {
    assertAllowedInput(input, [
      'attempt',
      'provider',
      'model',
      'durationMs',
      'reservedMicros',
      'chargedMicros',
      'usageStatus',
      'code',
      'providerRequestId',
      'gatewayRequestId'
    ]);
    const attempt = input.attempt ?? 1;
    const model = input.model ?? (input.provider === 'openai' ? 'gpt-6-luna' : 'claude-haiku-5-5');
    return this.emitPoint(
      {
        stage: 'provider',
        state: 'failed',
        attempt,
        provider: input.provider,
        model,
        code: input.code,
        ...(input.reservedMicros === undefined ? {} : { reservedMicros: input.reservedMicros }),
        ...(input.chargedMicros === undefined ? {} : { chargedMicros: input.chargedMicros }),
        ...(input.usageStatus === undefined ? {} : { usageStatus: input.usageStatus }),
        ...(input.providerRequestId === undefined ? {} : { providerRequestId: input.providerRequestId }),
        ...(input.gatewayRequestId === undefined ? {} : { gatewayRequestId: input.gatewayRequestId })
      },
      input.durationMs
    );
  }

  validationStarted(input: { attempt?: 1 | 2; provider?: Provider; model?: string } = {}): StreamFrame {
    assertAllowedInput(input, ['attempt', 'provider', 'model']);
    const attempt = input.attempt ?? 1;
    return this.emitPoint({
      stage: 'validation',
      state: 'started',
      attempt,
      ...(input.provider === undefined ? {} : { provider: input.provider }),
      ...(input.model === undefined ? {} : { model: input.model })
    });
  }

  validationCompleted(input: {
    attempt?: 1 | 2;
    provider?: Provider;
    model?: string;
    durationMs?: number;
    corpusVersion?: string;
    claimCount?: number;
  } = {}): StreamFrame {
    assertAllowedInput(input, ['attempt', 'provider', 'model', 'durationMs', 'corpusVersion', 'claimCount']);
    const attempt = input.attempt ?? 1;
    const key = `validation-${attempt}`;
    if (!this.stageStartTimes.has(key)) {
      this.validationStarted({
        attempt,
        ...(input.provider === undefined ? {} : { provider: input.provider }),
        ...(input.model === undefined ? {} : { model: input.model })
      });
    }
    return this.emitPoint(
      {
        stage: 'validation',
        state: 'completed',
        attempt,
        ...(input.provider === undefined ? {} : { provider: input.provider }),
        ...(input.model === undefined ? {} : { model: input.model }),
        ...(input.corpusVersion === undefined ? {} : { corpusVersion: input.corpusVersion }),
        ...(input.claimCount === undefined ? {} : { claimCount: input.claimCount })
      },
      input.durationMs
    );
  }

  validationFailed(input: {
    attempt?: 1 | 2;
    provider?: Provider;
    model?: string;
    durationMs?: number;
    code: TraceCode;
  }): StreamFrame {
    assertAllowedInput(input, ['attempt', 'provider', 'model', 'durationMs', 'code']);
    const attempt = input.attempt ?? 1;
    const key = `validation-${attempt}`;
    if (!this.stageStartTimes.has(key)) {
      this.validationStarted({
        attempt,
        ...(input.provider === undefined ? {} : { provider: input.provider }),
        ...(input.model === undefined ? {} : { model: input.model })
      });
    }
    return this.emitPoint(
      {
        stage: 'validation',
        state: 'failed',
        attempt,
        code: input.code,
        ...(input.provider === undefined ? {} : { provider: input.provider }),
        ...(input.model === undefined ? {} : { model: input.model })
      },
      input.durationMs
    );
  }

  settlementCompleted(input: {
    durationMs?: number;
    reservedMicros: number;
    chargedMicros: number;
    priceVersion?: string;
  }): StreamFrame {
    assertAllowedInput(input, ['durationMs', 'reservedMicros', 'chargedMicros', 'priceVersion']);
    return this.emitPoint(
      {
        stage: 'settlement',
        state: 'completed',
        reservedMicros: input.reservedMicros,
        chargedMicros: input.chargedMicros,
        priceVersion: input.priceVersion ?? PRICE_VERSION
      },
      input.durationMs
    );
  }

  settlementFailed(input: {
    durationMs?: number;
    code: TraceCode;
    reservedMicros?: number;
    chargedMicros?: number;
    priceVersion?: string;
  }): StreamFrame {
    assertAllowedInput(input, ['durationMs', 'code', 'reservedMicros', 'chargedMicros', 'priceVersion']);
    return this.emitPoint(
      {
        stage: 'settlement',
        state: 'failed',
        code: input.code,
        ...(input.reservedMicros === undefined ? {} : { reservedMicros: input.reservedMicros }),
        ...(input.chargedMicros === undefined ? {} : { chargedMicros: input.chargedMicros }),
        ...(input.priceVersion === undefined ? {} : { priceVersion: input.priceVersion })
      },
      input.durationMs
    );
  }

  frames(): StreamFrame[] {
    return structuredClone(this.recordedFrames);
  }

  replayFrames(
    saved?: ReadonlyArray<TracePoint | StreamFrame>,
    settlement?: SettlementSummary
  ): StreamFrame[] {
    const rawPoints: TracePoint[] =
      saved === undefined
        ? this.snapshot()
        : saved.map(item => {
            if (!isSafePlainObject(item)) failTraceValidation();
            if ('event' in item && item.event === 'trace' && isSafePlainObject(item.data)) {
              return structuredClone(item.data) as unknown as TracePoint;
            }
            return structuredClone(item) as unknown as TracePoint;
          });

    const validated = validateTrace(rawPoints).map(point => ({
      ...point,
      elapsedMs: point.elapsedMs ?? null,
      replayed: true
    }));

    if (settlement !== undefined) {
      const checkedSettlement = validateSettlement(settlement);
      if (validated.length >= 24 || validated.some(point => point.stage === 'settlement')) {
        failTraceValidation();
      }
      validated.push({
        stage: 'settlement',
        state: 'completed',
        elapsedMs: null,
        replayed: true,
        ...checkedSettlement
      });
    }

    const checkedReplay = validateTrace(validated);
    return checkedReplay.map((point, index) => {
      const frame: StreamFrame = {
        schemaVersion: '1.0.0',
        requestId: this.requestId,
        generation: this.generation,
        seq: index + 1,
        event: 'trace',
        data: point
      };
      contracts.assertValid('streamEvent', frame);
      return frame;
    });
  }
}
