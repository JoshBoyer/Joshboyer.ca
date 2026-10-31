import type { ProbeResult } from './provider.js';
import { safeError } from './errors.js';

function id(value: string): string { return /^[A-Za-z0-9-]{1,128}$/.test(value) ? value : 'unavailable'; }

export function successReceipt(requestId: string, durationMs: number, result: ProbeResult) {
  return {
    event: 'provider_probe', requestId: id(requestId), outcome: 'completed',
    durationMs: Math.max(0, Math.floor(durationMs)), provider: result.provider, model: result.model,
    usage: result.usage, providerRequestId: result.providerRequestId, gatewayRequestId: result.gatewayRequestId
  };
}

export function failureReceipt(requestId: string, durationMs: number, error: unknown, started: boolean) {
  const failure = safeError(error, started);
  return {
    event: 'provider_probe', requestId: id(requestId), outcome: started ? 'failed' : 'rejected',
    durationMs: Math.max(0, Math.floor(durationMs)), code: failure.code, chargeStatus: failure.chargeStatus
  };
}
