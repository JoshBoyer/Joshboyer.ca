import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorker, type Env } from '../src/worker.js';
import { parseKeyring, verifyEnvelope, verifiedBody } from '../../chat/src/envelope.js';

const token = 't'.repeat(43);
const keyring = JSON.stringify({ activeKeyId: 'k1', keys: { k1: Buffer.alloc(32, 4).toString('base64url') } });
const origin = 'https://private.example';
const env: Env = { AWS_ORIGIN: 'https://abcdefghij.execute-api.us-east-2.amazonaws.com/dev', PROBE_TOKEN: token,
  EDGE_KEYRING: keyring, CHAT_PRIVATE_ENABLED: 'true', PUBLIC_CHAT_ENABLED: 'false',
  CHAT_ASSETS: { async fetch() { return new Response('<html>private preview</html>', { headers: { 'Content-Type': 'text/html' } }); } } };
function request(path: string, method = 'GET', body?: unknown, cookies?: string, extra: Record<string, string> = {}) {
  return new Request(origin + path, { method,
    headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookies ? { Cookie: cookies } : {}), ...extra },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function login(worker: ReturnType<typeof createWorker>) {
  const response = await worker.fetch(request('/api/chat/access', 'POST', { token }), env);
  assert.equal(response.status, 200);
  const cookie = response.headers.get('Set-Cookie')!;
  assert.match(cookie, /; Path=\/; Secure; HttpOnly; SameSite=Strict; Max-Age=3600$/);
  return cookie.split(';')[0]!;
}

test('private gate denies routes and assets before any origin request', async () => {
  let calls = 0;
  const worker = createWorker({ fetcher: async () => { calls++; throw new Error(); } });
  for (const path of ['/api/chat/config', '/chat-assistant.js', '/chat-evidence.json']) {
    assert.equal((await worker.fetch(request(path), env)).status, 401);
  }
  assert.equal((await worker.fetch(request('/api/chat/messages', 'POST', {}), env)).status, 401);
  assert.equal((await worker.fetch(request('/chat-preview'), env)).status, 200);
  assert.equal(calls, 0);
  assert.equal((await worker.fetch(request('/chat-preview'), { ...env, PUBLIC_CHAT_ENABLED: 'true' })).status, 404);
});

test('access exchange is exact-origin, bounded and never echoes or stores the operator token', async () => {
  const worker = createWorker();
  assert.equal((await worker.fetch(request('/api/chat/access', 'POST', { token }, undefined, { Origin: 'https://evil.example' }), env)).status, 403);
  assert.equal((await worker.fetch(request('/api/chat/access', 'POST', { token: 'wrong' }), env)).status, 401);
  assert.equal((await worker.fetch(request('/api/chat/access', 'POST', { token, extra: true }), env)).status, 401);
  assert.equal((await worker.fetch(request('/api/chat/access', 'POST', { token: 't'.repeat(300) }), env)).status, 413);
  const cookies = await login(worker);
  assert.ok(!cookies.includes(token));
  const page = await worker.fetch(request('/chat-preview', 'GET', undefined, cookies), env);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /private preview/);
  assert.match(page.headers.get('Content-Security-Policy')!, /frame-ancestors 'none'/);
  assert.equal(page.headers.get('Cache-Control'), 'private, no-store');
});

test('signed chat forwarding binds visitor, session, method and exact body without forwarding browser headers', async () => {
  let captured: { url: string; init?: RequestInit } | undefined;
  const now = 1_800_000_000_000;
  const worker = createWorker({ now: () => now, fetcher: async (url, init) => {
    captured = { url: String(url), init };
    return Response.json({ ok: true });
  } });
  const cookies = await login(worker);
  const response = await worker.fetch(request('/api/chat/session', 'POST', {}, cookies + '; __Host-jb_chat=' + 's'.repeat(43), {
    Authorization: 'Bearer evil', 'x-chat-context': 'evil', 'x-chat-signature': 'evil'
  }), env);
  assert.equal(response.status, 200);
  assert.ok(captured);
  await response.json();
  assert.equal(captured.init!.redirect, 'manual');
  const headers = Object.fromEntries(new Headers(captured.init!.headers));
  assert.equal(headers.authorization, undefined);
  assert.equal(headers.cookie, undefined);
  const event = { httpMethod: 'POST', path: '/api/chat/session', headers, body: '{}', isBase64Encoded: false };
  const envelope = verifyEnvelope(event, parseKeyring(keyring), now / 1000);
  assert.match(envelope.context, /^private:[A-Za-z0-9_-]{43}:s{43}$/);
  assert.equal(verifiedBody(event, envelope).toString(), '{}');
  assert.throws(() => verifyEnvelope({ ...event, path: '/api/chat/messages' }, parseKeyring(keyring), now / 1000));
  assert.throws(() => verifiedBody({ ...event, body: '{"x":1}' }, envelope));
});

test('tampered or expired access cookies, cross-site posts, redirects and unknown routes fail closed', async () => {
  let now = 1_800_000_000_000;
  let calls = 0;
  const worker = createWorker({ now: () => now, fetcher: async () => { calls++; return new Response(null, { status: 307, headers: { Location: 'https://evil.example' } }); } });
  const cookies = await login(worker);
  assert.equal((await worker.fetch(request('/api/chat/config', 'GET', undefined, cookies + 'x'), env)).status, 401);
  assert.equal((await worker.fetch(request('/api/chat/messages', 'POST', {}, cookies, { 'Sec-Fetch-Site': 'cross-site' }), env)).status, 403);
  assert.equal((await worker.fetch(request('/api/chat/private-admin', 'POST', {}, cookies), env)).status, 404);
  assert.equal(calls, 0);
  assert.equal((await worker.fetch(request('/api/chat/config', 'GET', undefined, cookies), env)).status, 502);
  assert.equal(calls, 1);
  now += 3_601_000;
  assert.equal((await worker.fetch(request('/api/chat/config', 'GET', undefined, cookies), env)).status, 401);
});
