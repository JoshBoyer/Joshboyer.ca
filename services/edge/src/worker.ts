import { privateChat } from './private-chat.js';

export interface Env {
  AWS_ORIGIN?: string;
  PROBE_TOKEN?: string;
  EDGE_KEYRING?: string;
  CHAT_PRIVATE_ENABLED?: string;
  PROBE_ENABLED?: string;
  PUBLIC_CHAT_ENABLED?: string;
  CHAT_ASSETS?: { fetch(request: Request): Promise<Response> };
  ASSETS?: { fetch(request: Request): Promise<Response> };
}

export interface Keyring {
  activeKeyId: string;
  keys: Record<string, string>;
}

export interface Dependencies {
  fetcher?: typeof fetch;
  now?: () => number;
  nonce?: () => string;
  timeoutMs?: number;
}

export const PROBE_PATH = '/api/chat/_probe';
export const MAX_BODY_BYTES = 256;
export const MAX_RESPONSE_BYTES = 65536;
const encoder = new TextEncoder();

export function failure(status: number, code: string): Response {
  return new Response(JSON.stringify({ error: { code } }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeKey(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]{43,86}$/.test(value)) throw new Error('Invalid key');
  const raw = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
  const bytes = Uint8Array.from(raw, character => character.charCodeAt(0));
  if (bytes.length < 32 || bytes.length > 64 || toBase64Url(bytes) !== value) throw new Error('Invalid key');
  return bytes;
}

function parseKeyring(serialised: string): Keyring {
  if (serialised.length > 512) throw new Error('Invalid keyring');
  const value: unknown = JSON.parse(serialised);
  if (!isRecord(value) || Object.keys(value).sort().join(',') !== 'activeKeyId,keys' ||
      typeof value.activeKeyId !== 'string' || !isRecord(value.keys)) throw new Error('Invalid keyring');
  const entries = Object.entries(value.keys);
  if (entries.length < 1 || entries.length > 2 || !Object.hasOwn(value.keys, value.activeKeyId)) throw new Error('Invalid keyring');
  for (const [id, key] of entries) {
    if (!/^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(id) || typeof key !== 'string') throw new Error('Invalid keyring');
    decodeKey(key);
  }
  return value as unknown as Keyring;
}

export function validatedConfig(env: Env): { origin: string; token: string; keyring: Keyring } {
  if (!env.AWS_ORIGIN || !/^https:\/\/[a-z0-9]{10}\.execute-api\.us-east-2\.amazonaws\.com\/dev$/.test(env.AWS_ORIGIN) ||
      !env.PROBE_TOKEN || !/^[A-Za-z0-9_-]{43,128}$/.test(env.PROBE_TOKEN) || !env.EDGE_KEYRING) {
    throw new Error('Invalid configuration');
  }
  return { origin: env.AWS_ORIGIN, token: env.PROBE_TOKEN, keyring: parseKeyring(env.EDGE_KEYRING) };
}

export async function hmacKey(bytes: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function authorised(header: string | null, expected: string): Promise<boolean> {
  if (!header || !/^Bearer [A-Za-z0-9_-]{43,128}$/.test(header)) return false;
  const candidate = header.slice(7);
  // Let Web Crypto compare MACs instead of comparing secret strings in JavaScript.
  const label = encoder.encode('portfolio-phase2-operator');
  const expectedKey = await hmacKey(encoder.encode(expected));
  const candidateKey = await hmacKey(encoder.encode(candidate));
  const tag = await crypto.subtle.sign('HMAC', expectedKey, label);
  return crypto.subtle.verify('HMAC', candidateKey, tag, label);
}

export async function signedHeaders(body: Uint8Array<ArrayBuffer>, keyring: Keyring, timestamp: string, nonce: string,
  method = 'POST', path = PROBE_PATH, context = 'phase2-operator'): Promise<Headers> {
  const keyId = keyring.activeKeyId;
  const key = keyring.keys[keyId];
  if (!key || !/^[1-9][0-9]{8,10}$/.test(timestamp) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(nonce)) throw new Error('Invalid envelope');
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', body));
  const bodyHash = [...digest].map(byte => byte.toString(16).padStart(2, '0')).join('');
  const envelope = ['chat-edge-v1', keyId, timestamp, nonce, method, path, bodyHash, context].join('\n');
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(decodeKey(key)), encoder.encode(envelope));
  return new Headers({
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
    'x-chat-key-id': keyId,
    'x-chat-timestamp': timestamp,
    'x-chat-nonce': nonce,
    'x-chat-body-sha256': bodyHash,
    'x-chat-context': context,
    'x-chat-signature': toBase64Url(new Uint8Array(signature))
  });
}

export async function readBody(request: Request, signal: AbortSignal, maximum = MAX_BODY_BYTES): Promise<Uint8Array<ArrayBuffer>> {
  const declaredLength = request.headers.get('Content-Length');
  if (declaredLength && (!/^[0-9]+$/.test(declaredLength) || Number(declaredLength) > maximum)) throw new RangeError('Body limit');
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  const abort = () => { void reader.cancel().catch(() => undefined); };
  signal.addEventListener('abort', abort, { once: true });
  try {
    while (true) {
      if (signal.aborted) throw new Error('Aborted');
      const next = await reader.read();
      if (signal.aborted) throw new Error('Aborted');
      if (next.done) break;
      length += next.value.byteLength;
      if (length > maximum) {
        void reader.cancel().catch(() => undefined);
        throw new RangeError('Body limit');
      }
      chunks.push(next.value);
    }
  } finally {
    signal.removeEventListener('abort', abort);
    reader.releaseLock();
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
  return body;
}

export function streamBody(body: ReadableStream<Uint8Array>, controller: AbortController, cleanup: () => void): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  let length = 0;
  let ended = false;
  let abort: () => void;
  const finish = () => {
    ended = true;
    controller.signal.removeEventListener('abort', abort);
    cleanup();
  };
  return new ReadableStream({
    start(output) {
      abort = () => {
        if (ended) return;
        finish();
        void reader.cancel().catch(() => undefined);
        output.error(new Error('Upstream stream interrupted'));
      };
      controller.signal.addEventListener('abort', abort, { once: true });
      if (controller.signal.aborted) abort();
    },
    async pull(output) {
      try {
        const next = await reader.read();
        if (ended) return;
        if (next.done) { finish(); output.close(); return; }
        length += next.value.byteLength;
        if (length > MAX_RESPONSE_BYTES) { controller.abort(); return; }
        output.enqueue(next.value);
      } catch {
        if (ended) return;
        finish();
        output.error(new Error('Upstream stream interrupted'));
      }
    },
    async cancel() {
      finish();
      controller.abort();
      await reader.cancel().catch(() => undefined);
    }
  });
}

export function createWorker(dependencies: Dependencies = {}) {
  const fetcher = dependencies.fetcher ?? fetch;
  const now = dependencies.now ?? Date.now;
  const nonce = dependencies.nonce ?? (() => crypto.randomUUID());
  const timeoutMs = dependencies.timeoutMs ?? 25000;
  return {
    async fetch(request: Request, env: Env): Promise<Response> {
      const url = new URL(request.url);
      if (url.pathname !== PROBE_PATH || env.PROBE_ENABLED === 'false' || (env.CHAT_PRIVATE_ENABLED === 'true' && env.PROBE_ENABLED !== 'true')) {
        return privateChat(request, env, dependencies);
      }
      if (url.pathname !== PROBE_PATH || url.search || url.hash) return failure(404, 'NOT_FOUND');
      if (request.method !== 'POST') return failure(405, 'METHOD_NOT_ALLOWED');
      let config: ReturnType<typeof validatedConfig>;
      try { config = validatedConfig(env); } catch { return failure(503, 'NOT_CONFIGURED'); }
      if (!await authorised(request.headers.get('Authorization'), config.token)) return failure(401, 'UNAUTHORISED');
      if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('Content-Type') ?? '') ||
          request.headers.has('Content-Encoding')) return failure(415, 'UNSUPPORTED_MEDIA_TYPE');

      const controller = new AbortController();
      const abort = () => controller.abort();
      request.signal.addEventListener('abort', abort, { once: true });
      if (request.signal.aborted) controller.abort();
      const timer = setTimeout(abort, timeoutMs);
      const cleanup = () => { clearTimeout(timer); request.signal.removeEventListener('abort', abort); };
      let forwarded = false;
      try {
        const body = await readBody(request, controller.signal);
        let text: string;
        try { text = new TextDecoder('utf-8', { fatal: true }).decode(body); } catch { cleanup(); return failure(400, 'INVALID_REQUEST'); }
        // This fixed probe deliberately has a single literal field: duplicate or escaped keys are not accepted.
        if (!/^[ \t\r\n]*\{[ \t\r\n]*"provider"[ \t\r\n]*:[ \t\r\n]*"(?:openai|anthropic)"[ \t\r\n]*\}[ \t\r\n]*$/.test(text)) {
          cleanup(); return failure(400, 'INVALID_REQUEST');
        }
        const headers = await signedHeaders(body, config.keyring, String(Math.floor(now() / 1000)), nonce());
        if (controller.signal.aborted) throw new Error('Aborted');
        forwarded = true;
        const upstream = await fetcher(config.origin + PROBE_PATH, {
          // Workers rejects redirect: 'error' before sending; manual keeps signed headers on the fixed origin.
          method: 'POST', headers, body, signal: controller.signal, redirect: 'manual'
        });
        if (upstream.status !== 200 || !/^text\/event-stream(?:;|$)/i.test(upstream.headers.get('Content-Type') ?? '') || !upstream.body) {
          void upstream.body?.cancel().catch(() => undefined);
          cleanup(); return failure(502, 'UPSTREAM_REJECTED');
        }
        return new Response(streamBody(upstream.body, controller, cleanup), {
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
          }
        });
      } catch (error) {
        cleanup();
        if (controller.signal.aborted) return failure(forwarded ? 504 : 408, forwarded ? 'UPSTREAM_TIMEOUT' : 'REQUEST_TIMEOUT');
        if (error instanceof RangeError) return failure(413, 'REQUEST_TOO_LARGE');
        return failure(502, 'UPSTREAM_UNAVAILABLE');
      }
    }
  };
}

export default createWorker();
