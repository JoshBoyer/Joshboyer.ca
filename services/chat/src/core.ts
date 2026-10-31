import { credential, type Config, type Provider } from './config.js';
import { parseKeyring, verifiedBody, verifyEnvelope, type RequestEvent } from './envelope.js';
import { ServiceError, safeError } from './errors.js';
import { callProvider, type Fetch, type ProbeResult } from './provider.js';
import type { NonceStore, SecretReader } from './aws.js';

export interface Dependencies {
  secrets: SecretReader;
  nonces: NonceStore;
  now?: () => number;
  fetchImpl?: Fetch;
}
export interface PreparedProbe { provider: Provider; run(): Promise<ProbeResult> }

export async function prepareProbe(event: RequestEvent, config: Config, dependencies: Dependencies, signal: AbortSignal): Promise<PreparedProbe> {
  const now = Math.floor((dependencies.now ?? Date.now)() / 1000);
  const keyring = parseKeyring(await dependencies.secrets.read(config.edgeSecretArn, signal));
  const envelope = verifyEnvelope(event, keyring, now);
  const bytes = verifiedBody(event, envelope);
  // A single literal field also rejects duplicate JSON keys and hidden options.
  const match = /^[\x20\t\r\n]*\{[\x20\t\r\n]*"provider"[\x20\t\r\n]*:[\x20\t\r\n]*"(openai|anthropic)"[\x20\t\r\n]*\}[\x20\t\r\n]*$/.exec(bytes.toString('utf8'));
  if (!match) throw new ServiceError('INVALID_REQUEST', 400);
  const provider = match[1] as Provider;
  const [providerValue, gatewayValue] = await Promise.all([
    dependencies.secrets.read(config.providerSecretArns[provider], signal),
    dependencies.secrets.read(config.gatewaySecretArn, signal)
  ]);
  const providerKey = credential(providerValue);
  const gatewayKey = credential(gatewayValue);
  // Recheck freshness after I/O; it cannot turn an expired envelope into authority.
  const finalNow = Math.floor((dependencies.now ?? Date.now)() / 1000);
  verifyEnvelope(event, keyring, finalNow);
  await dependencies.nonces.consume(config.stateTable, envelope, finalNow, signal);
  let started = false;
  return { provider, async run() {
    if (started) throw new ServiceError('PROBE_ALREADY_STARTED', 409);
    started = true;
    return callProvider({ provider, config, providerKey, gatewayKey, signal, fetchImpl: dependencies.fetchImpl });
  } };
}

export interface ProbeFrame { event: 'status' | 'result' | 'done' | 'error'; data: unknown }

export async function* probeFrames(probe: PreparedProbe): AsyncGenerator<string> {
  const frame = (event: ProbeFrame['event'], data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  yield frame('status', { phase: 'provider', provider: probe.provider });
  try {
    const result = await probe.run();
    yield frame('result', result);
    yield frame('done', { ok: true });
  } catch (error) {
    const failure = safeError(error, true);
    yield frame('error', { code: failure.code, chargeStatus: failure.chargeStatus });
    yield frame('done', { ok: false });
  }
}
