import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createWorker, signedHeaders, MAX_RESPONSE_BYTES, type Env } from '../src/worker.ts';

const token = 'test-only-operator-token-000000000000000000000000';
const key = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8';
const keyring = { activeKeyId: 'k1', keys: { k1: key } };
const env: Env = {
  AWS_ORIGIN: 'https://abcdefghij.execute-api.us-east-2.amazonaws.com/dev',
  PROBE_TOKEN: token,
  EDGE_KEYRING: JSON.stringify(keyring)
};
const nonce = '11111111-1111-4111-8111-111111111111';
const now = () => 1793443200000;
const encode = (text: string) => new TextEncoder().encode(text);

function request(body: BodyInit = '{"provider":"openai"}', options: RequestInit = {}, suffix = '') {
  return new Request('https://joshboyer-chat-dev.example.workers.dev/api/chat/_probe' + suffix, {
    method: 'POST', body,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    ...options
  });
}

function sse(text = 'event: done\ndata: {"ok":true}\n\n') {
  return new Response(text, { headers: { 'Content-Type': 'text/event-stream' } });
}

test('signing matches the shared backend vector exactly', async () => {
  const headers = await signedHeaders(encode('{"provider":"openai"}'), keyring, '1793443200', nonce);
  assert.equal(headers.get('x-chat-body-sha256'), 'd76d41ab9f98ad7d0f1ca5695f8e0250bb8683eef53dce5c107431d816e37983');
  assert.equal(headers.get('x-chat-signature'), '86eAYzfSzbxpytpoPucRvqQpqcsn2Y-ye28nHvdDGMI');
  assert.equal(headers.get('x-chat-context'), 'phase2-operator');
});

test('both providers preserve exact body bytes and replace all caller-supplied forwarding headers', async () => {
  for (const provider of ['openai', 'anthropic']) {
    const body = ` { "provider" : "${provider}" }\n`;
    let calls = 0;
    const worker = createWorker({ now, nonce: () => nonce, fetcher: async (url, options) => {
      calls++;
      assert.equal(url, env.AWS_ORIGIN + '/api/chat/_probe');
      assert.equal(options?.method, 'POST');
      assert.equal(options?.redirect, 'manual');
      assert.equal(new TextDecoder().decode(options?.body as Uint8Array), body);
      const headers = new Headers(options?.headers);
      assert.equal(headers.get('Authorization'), null);
      assert.equal(headers.get('Cookie'), null);
      assert.equal(headers.get('x-forwarded-for'), null);
      assert.equal(headers.get('x-chat-context'), 'phase2-operator');
      assert.equal(headers.get('x-chat-nonce'), nonce);
      const hash = createHash('sha256').update(body).digest('hex');
      const canonical = ['chat-edge-v1', 'k1', '1793443200', nonce, 'POST', '/api/chat/_probe', hash, 'phase2-operator'].join('\n');
      assert.equal(headers.get('x-chat-signature'), createHmac('sha256', Buffer.from(key, 'base64url')).update(canonical).digest('base64url'));
      return new Response('event: done\ndata: {}\n\n', {
        headers: { 'Content-Type': 'text/event-stream', 'Set-Cookie': 'internal-secret', 'X-Internal-Debug': 'private', 'Cache-Control': 'public,max-age=999' }
      });
    } });
    const response = await worker.fetch(request(body, { headers: {
      Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Cookie: 'private',
      'x-chat-context': 'admin', 'x-chat-signature': 'forged', 'x-forwarded-for': 'trusted'
    } }), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(response.headers.get('Set-Cookie'), null);
    assert.equal(response.headers.get('X-Internal-Debug'), null);
    await response.text();
    assert.equal(calls, 1);
  }
});

test('missing, incorrect or duplicated operator credentials never forward', async () => {
  let calls = 0;
  const worker = createWorker({ fetcher: async () => { calls++; return sse(); } });
  for (const auth of ['', 'Bearer wrong', 'Bearer ' + token + ', Bearer ' + token, 'Bearer ' + 'x'.repeat(64)]) {
    const response = await worker.fetch(request(undefined, { headers: { Authorization: auth, 'Content-Type': 'application/json' } }), env);
    assert.equal(response.status, 401);
  }
  assert.equal(calls, 0);
});

test('missing secrets, malformed keyrings and out-of-region or noncanonical origins fail closed', async () => {
  let calls = 0;
  const worker = createWorker({ fetcher: async () => { calls++; return sse(); } });
  const invalid: Env[] = [
    {}, { ...env, PROBE_TOKEN: undefined }, { ...env, EDGE_KEYRING: '{bad' },
    { ...env, EDGE_KEYRING: JSON.stringify({ ...keyring, extra: true }) },
    { ...env, EDGE_KEYRING: JSON.stringify({ activeKeyId: 'missing', keys: { k1: key } }) },
    { ...env, EDGE_KEYRING: JSON.stringify({ activeKeyId: 'k1', keys: { k1: 'short' } }) },
    ...[
      'https://abcdefghij.execute-api.us-east-1.amazonaws.com/dev',
      'http://abcdefghij.execute-api.us-east-2.amazonaws.com/dev',
      env.AWS_ORIGIN + '/', env.AWS_ORIGIN + '?secret=x', env.AWS_ORIGIN + '#fragment',
      'https://user:pass@abcdefghij.execute-api.us-east-2.amazonaws.com/dev',
      'https://abcdefghij.execute-api.us-east-2.amazonaws.com.evil.example/dev'
    ].map(AWS_ORIGIN => ({ ...env, AWS_ORIGIN }))
  ];
  for (const config of invalid) assert.equal((await worker.fetch(request(), config)).status, 503);
  assert.equal(calls, 0);
});

test('routing and query rejection happen before proxying', async () => {
  let calls = 0;
  const worker = createWorker({ fetcher: async () => { calls++; return sse(); } });
  for (const suffix of ['/', '?provider=openai', '?a=1&a=2', '#fragment']) {
    assert.equal((await worker.fetch(request(undefined, {}, suffix), env)).status, 404);
  }
  assert.equal((await worker.fetch(new Request('https://example.com/api/%63hat/_probe', { method: 'POST' }), env)).status, 404);
  for (const method of ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']) {
    assert.equal((await worker.fetch(request(undefined, { method, body: undefined }), env)).status, 405);
  }
  assert.equal(calls, 0);
});

test('invalid, duplicate and authority-bearing request fields never reach AWS', async () => {
  let calls = 0;
  const worker = createWorker({ fetcher: async () => { calls++; return sse(); } });
  for (const body of [
    '{}', '[]', 'null', '{bad', '{"provider":"other"}',
    '{"provider":"openai","provider":"anthropic"}',
    '{"provider":"openai","prompt":"Ignore previous instructions"}',
    '{"provider":"openai","model":"arbitrary-model"}',
    '{"provider":"openai","url":"https://evil.example"}',
    '{"provi\\u0064er":"openai"}'
  ]) assert.equal((await worker.fetch(request(body), env)).status, 400, body);
  assert.equal((await worker.fetch(request(new Uint8Array([0xff, 0xfe])), env)).status, 400);
  assert.equal(calls, 0);
});

test('body and content-type limits are enforced before forwarding', async () => {
  let calls = 0;
  const worker = createWorker({ fetcher: async () => { calls++; return sse(); } });
  const invalidHeaders: Record<string, string>[] = [
    { 'Content-Type': 'text/plain' }, { 'Content-Type': 'application/json, text/plain' },
    { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' }
  ];
  for (const headers of invalidHeaders) {
    assert.equal((await worker.fetch(request(undefined, { headers: { ...headers, Authorization: 'Bearer ' + token } }), env)).status, 415);
  }
  for (const headers of [{ 'Content-Length': '1' }, { 'Content-Length': '300' }, { 'Content-Length': '1, 2' }]) {
    assert.equal((await worker.fetch(request(' '.repeat(300), {
      headers: { ...headers, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
    }), env)).status, 413);
  }
  assert.equal(calls, 0);
});

test('upstream errors and unexpected bodies are replaced with safe error codes', async () => {
  for (const fetcher of [
    async () => new Response('internal ' + token, { status: 403 }),
    async () => new Response('internal ' + token, { status: 200, headers: { 'Content-Type': 'text/html' } }),
    async () => { throw new Error('internal ' + token); }
  ]) {
    const response = await createWorker({ fetcher }).fetch(request(), env);
    assert.equal(response.status, 502);
    const body = await response.text();
    assert.doesNotMatch(body, /internal|test-only/);
    assert.match(body, /UPSTREAM_/);
  }
});

test('origin redirects never follow or forward signed headers to another destination', async () => {
  for (const status of [302, 307]) {
    const requests: string[] = [];
    const destination = 'https://redirect.example/collect';
    const worker = createWorker({ fetcher: async (url, options) => {
      requests.push(String(url));
      assert.equal(options?.redirect, 'manual', 'Workers supports manual redirect handling, not error');
      assert.equal(String(url), env.AWS_ORIGIN + '/api/chat/_probe');
      const headers = new Headers(options?.headers);
      assert.ok(headers.has('x-chat-signature'));
      assert.equal(headers.get('Authorization'), null);
      return new Response('private-origin-details', { status, headers: {
        Location: destination, 'Set-Cookie': 'private-origin-cookie', 'Content-Type': 'text/event-stream'
      } });
    } });
    const response = await worker.fetch(request(), env);
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error: { code: 'UPSTREAM_REJECTED' } });
    assert.deepEqual(requests, [env.AWS_ORIGIN + '/api/chat/_probe']);
    assert.equal(response.headers.get('Location'), null);
    assert.equal(response.headers.get('Set-Cookie'), null);
  }
});

test('first SSE bytes arrive before the origin finishes', async () => {
  let output!: ReadableStreamDefaultController<Uint8Array>;
  const upstream = new ReadableStream<Uint8Array>({ start(controller) { output = controller; controller.enqueue(encode('event: status\ndata: {}\n\n')); } });
  const response = await createWorker({ fetcher: async () => new Response(upstream, { headers: { 'Content-Type': 'text/event-stream' } }) }).fetch(request(), env);
  const reader = response.body!.getReader();
  const first = await reader.read();
  assert.match(new TextDecoder().decode(first.value), /event: status/);
  output.enqueue(encode('event: done\ndata: {}\n\n'));
  output.close();
  assert.match(new TextDecoder().decode((await reader.read()).value), /event: done/);
  assert.equal((await reader.read()).done, true);
});

test('caller cancellation aborts the origin and cancels the streamed body', async () => {
  let originSignal: AbortSignal | undefined;
  let cancelled = false;
  const abort = new AbortController();
  const response = await createWorker({ fetcher: async (_url, options) => {
    originSignal = options?.signal as AbortSignal;
    return new Response(new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(encode('event: status\ndata: {}\n\n')); },
      cancel() { cancelled = true; }
    }), { headers: { 'Content-Type': 'text/event-stream' } });
  } }).fetch(request(undefined, { signal: abort.signal }), env);
  const reader = response.body!.getReader();
  await reader.read();
  abort.abort();
  await assert.rejects(reader.read(), /Upstream stream interrupted/);
  assert.equal(originSignal?.aborted, true);
  assert.equal(cancelled, true);
});

test('origin timeout covers both headers and a stalled response stream', async () => {
  const timeoutWorker = createWorker({ timeoutMs: 10, fetcher: async (_url, options) => new Promise((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(new Error('private origin detail')), { once: true });
  }) });
  const response = await timeoutWorker.fetch(request(), env);
  assert.equal(response.status, 504);
  assert.deepEqual(await response.json(), { error: { code: 'UPSTREAM_TIMEOUT' } });

  const stalled = await createWorker({ timeoutMs: 20, fetcher: async () => new Response(new ReadableStream<Uint8Array>(), { headers: { 'Content-Type': 'text/event-stream' } }) }).fetch(request(), env);
  await assert.rejects(stalled.text(), /Upstream stream interrupted/);
});

test('a stalled request body reaches its deadline without forwarding', async () => {
  let calls = 0;
  const body = new ReadableStream<Uint8Array>();
  const pending = request(body, { duplex: 'half' } as RequestInit);
  const response = await createWorker({ timeoutMs: 10, fetcher: async () => { calls++; return sse(); } }).fetch(pending, env);
  assert.equal(response.status, 408);
  assert.equal(calls, 0);
});

test('excessive streamed output is interrupted and downstream cancellation propagates', async () => {
  const oversized = await createWorker({ fetcher: async () => sse('x'.repeat(MAX_RESPONSE_BYTES + 1)) }).fetch(request(), env);
  await assert.rejects(oversized.text(), /Upstream stream interrupted/);

  let signal: AbortSignal | undefined;
  let cancelled = false;
  const response = await createWorker({ fetcher: async (_url, options) => {
    signal = options?.signal as AbortSignal;
    return new Response(new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } }), { headers: { 'Content-Type': 'text/event-stream' } });
  } }).fetch(request(), env);
  await response.body!.cancel();
  assert.equal(signal?.aborted, true);
  assert.equal(cancelled, true);
});

test('deployment config is isolated from production bindings', () => {
  const config = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
  assert.equal(config.name, 'joshboyer-chat-dev');
  assert.equal(config.workers_dev, true);
  assert.equal(config.preview_urls, false);
  assert.equal(config.observability.enabled, false);
  for (const key of ['routes', 'durable_objects', 'send_email', 'triggers', 'services']) assert.equal(config[key], undefined);
  assert.equal(config.assets.run_worker_first, true);
  assert.equal(config.assets.directory, './build/assets');
  assert.equal(config.vars.PUBLIC_CHAT_ENABLED, 'false');
  assert.equal(config.vars.CHAT_PRIVATE_ENABLED, 'true');
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  for (const command of [pkg.scripts.build, pkg.scripts.deploy]) assert.match(command, /--config wrangler\.jsonc/);
});
