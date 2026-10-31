import type { Provider } from './config.js';
import { ServiceError } from './errors.js';

export interface TracePoint {
  stage: 'context' | 'budget' | 'provider' | 'validation' | 'settlement';
  state: 'started' | 'completed' | 'failed' | 'cancelled';
  elapsedMs: number | null;
  durationMs?: number;
  attempt?: number;
  provider?: Provider;
  model?: string;
  corpusVersion?: string;
  claimCount?: number;
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
  replayed?: boolean;
}

export interface SettlementSummary { reservedMicros: number; chargedMicros: number; priceVersion: string }
const contracts = require('../../../chat/contracts/index.cjs') as { assertValid(name: string, value: unknown): unknown };

export function validateTrace(points: unknown): TracePoint[] {
  try {
    if (!Array.isArray(points) || points.length > 24) throw new Error();
    let elapsed = 0;
    const stages = new Map<string, TracePoint['state']>();
    for (const point of points) {
      contracts.assertValid('traceData', point);
      if (point.elapsedMs !== null) {
        if (point.elapsedMs < elapsed || (point.durationMs ?? 0) > point.elapsedMs) throw new Error();
        elapsed = point.elapsedMs;
      }
      if (point.chargedMicros !== undefined && point.reservedMicros !== undefined && point.chargedMicros > point.reservedMicros) throw new Error();
      const key = ['provider', 'validation'].includes(point.stage) ? `${point.stage}-${point.attempt ?? 1}` : point.stage;
      const previous = stages.get(key);
      if (previous && previous !== 'started' || previous === 'started' && point.state === 'started' ||
          !previous && ['provider', 'validation'].includes(point.stage) && point.state !== 'started') throw new Error();
      stages.set(key, point.state);
    }
    return structuredClone(points) as TracePoint[];
  } catch { throw new ServiceError('ANSWER_VALIDATION_FAILED', 502); }
}

export function validateSettlement(value: unknown): SettlementSummary {
  try {
    const point = { stage: 'settlement', state: 'completed', elapsedMs: null,
      ...(value as Record<string, unknown>), replayed: true };
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        Object.keys(value).sort().join(',') !== 'chargedMicros,priceVersion,reservedMicros') throw new Error();
    contracts.assertValid('traceData', point);
    const summary = value as SettlementSummary;
    if (summary.chargedMicros > summary.reservedMicros) throw new Error();
    return { ...summary };
  } catch { throw new ServiceError('ANSWER_VALIDATION_FAILED', 502); }
}

export class TraceRecorder {
  private readonly startedAt: number;
  private readonly points: TracePoint[] = [];
  constructor(private readonly now: () => number = Date.now) { this.startedAt = now(); }
  timestamp(): number { return this.now(); }
  duration(startedAt: number): number { return Math.max(0, Math.min(60000, Math.round(this.now() - startedAt))); }
  add(value: Omit<TracePoint, 'elapsedMs'>): TracePoint {
    const previous = this.points.at(-1)?.elapsedMs ?? 0;
    const point = { ...value, elapsedMs: Math.max(previous, this.duration(this.startedAt)) };
    const checked = validateTrace([...this.points, point]);
    this.points.push(checked.at(-1)!);
    return structuredClone(point);
  }
  snapshot(): TracePoint[] { return structuredClone(this.points); }
}
