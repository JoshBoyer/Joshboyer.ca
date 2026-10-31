import type { NonceStore, SecretReader } from './aws.js';
import type { Config } from './config.js';
import { parseKeyring, verifiedBody, verifyEnvelope, type RequestEvent } from './envelope.js';
import { ServiceError } from './errors.js';

export interface VerifiedChatRequest {
  method: string;
  path: string;
  bodyBytes: Uint8Array;
  visitorId: string;
  sessionToken?: string;
}

export async function authenticateChat(event: RequestEvent, config: Config,
  dependencies: { secrets: SecretReader; nonces: NonceStore; now?: () => number },
  signal: AbortSignal): Promise<VerifiedChatRequest> {
  if (process.env.CHAT_PRIVATE_ENABLED !== 'true' || process.env.PUBLIC_CHAT_ENABLED === 'true') {
    throw new ServiceError('CHAT_DISABLED', 503);
  }
  const now = dependencies.now ?? Date.now;
  const keyring = parseKeyring(await dependencies.secrets.read(config.edgeSecretArn, signal));
  const envelope = verifyEnvelope(event, keyring, Math.floor(now() / 1000));
  if (event.path === '/api/chat/_probe') throw new ServiceError('UNAUTHORISED', 403);
  const bodyBytes = verifiedBody(event, envelope);
  await dependencies.nonces.consume(config.stateTable, envelope, Math.floor(now() / 1000), signal);
  const [, visitorId, sessionToken] = envelope.context.split(':');
  return { method: event.httpMethod!, path: event.path!, bodyBytes, visitorId: visitorId!,
    ...(sessionToken === '-' ? {} : { sessionToken }) };
}
