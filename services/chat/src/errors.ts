export type ChargeStatus = 'not_started' | 'unknown';

export class ServiceError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly chargeStatus: ChargeStatus = 'not_started'
  ) {
    super(code);
    this.name = 'ServiceError';
  }
}

export function safeError(error: unknown, started = false): ServiceError {
  return error instanceof ServiceError ? error : new ServiceError('SERVICE_UNAVAILABLE', 503, started ? 'unknown' : 'not_started');
}

export function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
