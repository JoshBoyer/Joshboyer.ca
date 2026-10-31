import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { PROBE_PATH } from './config.js';
import { ServiceError, record } from './errors.js';

export interface RequestEvent {
  httpMethod?: string;
  path?: string;
  headers?: Record<string, string | undefined> | null;
  multiValueHeaders?: Record<string, string[] | undefined> | null;
  queryStringParameters?: Record<string, string | undefined> | null;
  multiValueQueryStringParameters?: Record<string, string[] | undefined> | null;
  body?: string | null;
  isBase64Encoded?: boolean;
}

export interface Keyring { activeKeyId: string; keys: Record<string, Buffer> }
export interface Envelope { keyId: string; nonce: string; timestamp: number; bodyHash: string }
export const HEADER_NAMES = ['x-chat-key-id', 'x-chat-timestamp', 'x-chat-nonce', 'x-chat-body-sha256', 'x-chat-context', 'x-chat-signature'] as const;

function deny(): never { throw new ServiceError('UNAUTHORISED', 403); }

export function parseKeyring(value: string): Keyring {
  try {
    const data: unknown = JSON.parse(value);
    if (!record(data) || Object.keys(data).sort().join(',') !== 'activeKeyId,keys' ||
        typeof data.activeKeyId !== 'string' || !record(data.keys)) throw new Error();
    const keys: Record<string, Buffer> = Object.create(null) as Record<string, Buffer>;
    const entries = Object.entries(data.keys);
    if (entries.length < 1 || entries.length > 2) throw new Error();
    for (const [id, encoded] of entries) {
      if (!/^[A-Za-z0-9_-]{1,32}$/.test(id) || typeof encoded !== 'string' || !/^[A-Za-z0-9_-]{43,86}$/.test(encoded)) throw new Error();
      const bytes = Buffer.from(encoded, 'base64url');
      if (bytes.length < 32 || bytes.length > 64 || bytes.toString('base64url') !== encoded) throw new Error();
      keys[id] = bytes;
    }
    if (!Object.hasOwn(keys, data.activeKeyId)) throw new Error();
    return { activeKeyId: data.activeKeyId, keys };
  } catch {
    throw new ServiceError('CREDENTIAL_UNAVAILABLE', 503);
  }
}

export function oneHeader(event: RequestEvent, name: string): string {
  const singles = Object.entries(event.headers ?? {}).filter(([key]) => key.toLowerCase() === name);
  const multiples = Object.entries(event.multiValueHeaders ?? {}).filter(([key]) => key.toLowerCase() === name);
  if (singles.length > 1 || multiples.length > 1) deny();
  const single = singles[0]?.[1];
  const multi = multiples[0]?.[1];
  if (multiples.length && (!multi || multi.length !== 1 || typeof multi[0] !== 'string')) deny();
  if (single !== undefined && multi && single !== multi[0]) deny();
  const value = multi?.[0] ?? single;
  if (typeof value !== 'string' || value.includes(',') || /[\r\n]/.test(value)) deny();
  return value;
}

export function assertRoute(event: RequestEvent): void {
  if (event.httpMethod !== 'POST' || event.path !== PROBE_PATH ||
      Object.keys(event.queryStringParameters ?? {}).length || Object.keys(event.multiValueQueryStringParameters ?? {}).length) deny();
}

export function canonicalEnvelope(keyId: string, timestamp: string, nonce: string, bodyHash: string): string {
  return ['chat-edge-v1', keyId, timestamp, nonce, 'POST', PROBE_PATH, bodyHash, 'phase2-operator'].join('\n');
}

export function verifyEnvelope(event: RequestEvent, keyring: Keyring, nowSeconds: number): Envelope {
  assertRoute(event);
  const values = HEADER_NAMES.map(name => oneHeader(event, name));
  const [keyId, timestampText, nonce, bodyHash, context, signature] = values as [string, string, string, string, string, string];
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(keyId) || !/^\d{10}$/.test(timestampText) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(nonce) ||
      !/^[0-9a-f]{64}$/.test(bodyHash) || context !== 'phase2-operator' || !/^[A-Za-z0-9_-]{43}$/.test(signature)) deny();
  const timestamp = Number(timestampText);
  if (nowSeconds - timestamp > 60 || timestamp - nowSeconds > 5 || !Number.isSafeInteger(nowSeconds)) deny();
  const key = keyring.keys[keyId];
  if (!key) deny();
  const supplied = Buffer.from(signature, 'base64url');
  const expected = createHmac('sha256', key).update(canonicalEnvelope(keyId, timestampText, nonce, bodyHash)).digest();
  if (supplied.toString('base64url') !== signature || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) deny();
  return { keyId, nonce, timestamp, bodyHash };
}

export function verifiedBody(event: RequestEvent, envelope: Envelope): Buffer {
  if (typeof event.body !== 'string' || event.body.length > 1024) throw new ServiceError('INVALID_REQUEST', 400);
  let bytes: Buffer;
  if (event.isBase64Encoded) {
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(event.body)) throw new ServiceError('INVALID_REQUEST', 400);
    bytes = Buffer.from(event.body, 'base64');
    if (bytes.toString('base64') !== event.body) throw new ServiceError('INVALID_REQUEST', 400);
  } else bytes = Buffer.from(event.body, 'utf8');
  if (bytes.length > 256) throw new ServiceError('INVALID_REQUEST', 400);
  const actual = createHash('sha256').update(bytes).digest('hex');
  if (actual !== envelope.bodyHash) deny();
  if (oneHeader(event, 'content-type').toLowerCase() !== 'application/json') throw new ServiceError('INVALID_REQUEST', 415);
  return bytes;
}
