import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createWorker, type Env } from '../src/worker.js';
import { ASSET_TYPES } from '../src/private-chat.js';
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

test('allowlisted static assets require operator cookie and preserve binary portrait bytes without UTF-8 corruption', async () => {
  assert.equal(ASSET_TYPES['/chat-assistant.css'], 'text/css; charset=utf-8');
  assert.equal(ASSET_TYPES['/chat-assistant.js'], 'text/javascript; charset=utf-8');
  assert.equal(ASSET_TYPES['/chat-request-details.js'], 'text/javascript; charset=utf-8');
  assert.equal(ASSET_TYPES['/chat-evidence.json'], 'application/json; charset=utf-8');
  assert.equal(ASSET_TYPES['/assets/personal/josh-portrait-smiling.jpg'], 'image/jpeg');
  assert.equal(ASSET_TYPES['/assets/optimized-extra/personal/josh-portrait-vest-640.webp'], 'image/webp');

  const jpgBytes = new Uint8Array(readFileSync(fileURLToPath(new URL('../../../dist/assets/personal/josh-portrait-smiling.jpg', import.meta.url))));
  const webpBytes = new Uint8Array(readFileSync(fileURLToPath(new URL('../../../dist/assets/optimized-extra/personal/josh-portrait-vest-640.webp', import.meta.url))));
  const detailsJsBytes = new Uint8Array(new TextEncoder().encode('globalThis.PortfolioChatDetails = {};\n'));

  let assetCalls = 0;
  let originCalls = 0;
  const assetPayloads: Record<string, Uint8Array<ArrayBuffer>> = {
    '/chat-request-details.js': detailsJsBytes,
    '/assets/personal/josh-portrait-smiling.jpg': jpgBytes,
    '/assets/optimized-extra/personal/josh-portrait-vest-640.webp': webpBytes
  };
  const assetEnv: Env = {
    ...env,
    CHAT_ASSETS: undefined,
    ASSETS: {
      async fetch(req: Request) {
        assetCalls++;
        const pathname = new URL(req.url).pathname;
        const payload = assetPayloads[pathname];
        if (!payload) return new Response('Not found', { status: 404 });
        return new Response(payload);
      }
    }
  };

  const worker = createWorker({ fetcher: async () => { originCalls++; throw new Error('Unexpected origin call'); } });

  for (const path of Object.keys(assetPayloads)) {
    const unauth = await worker.fetch(request(path), assetEnv);
    assert.equal(unauth.status, 401, `Unauthenticated ${path} must return 401`);
  }
  assert.equal(assetCalls, 0);
  assert.equal(originCalls, 0);

  const cookies = await login(worker);
  for (const [path, expectedBytes] of Object.entries(assetPayloads)) {
    const res = await worker.fetch(request(path, 'GET', undefined, cookies), assetEnv);
    assert.equal(res.status, 200, `Authenticated ${path} must return 200`);
    assert.equal(res.headers.get('Content-Type'), ASSET_TYPES[path]);
    assert.equal(res.headers.get('Cache-Control'), 'private, no-store');
    assert.equal(res.headers.get('X-Robots-Tag'), 'noindex, nofollow, noarchive');
    assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff');
    const actualBytes = new Uint8Array(await res.arrayBuffer());
    assert.equal(Buffer.compare(Buffer.from(actualBytes), Buffer.from(expectedBytes)), 0, `Binary byte mismatch for ${path}`);
  }
  assert.equal(assetCalls, 3);
  assert.equal(originCalls, 0);

  for (const unapproved of ['/assets/personal/josh-curiosity-seated-sketching.png', '/assets/personal/other.jpg', '/JOSH-BOYER-PORTFOLIO-CORPUS.md']) {
    const denied = await worker.fetch(request(unapproved, 'GET', undefined, cookies), assetEnv);
    assert.equal(denied.status, 404, unapproved);
    assert.deepEqual(await denied.json(), { schemaVersion: '1.0.0', error: { code: 'unavailable', retryable: false } });
  }
  assert.equal(assetCalls, 3);
  assert.equal(originCalls, 0);
});

test('internal routes /api/chat/_mcp and /api/chat/_probe are strictly denied at private edge with and without operator cookie', async () => {
  let originCalls = 0;
  const worker = createWorker({ fetcher: async () => { originCalls++; return Response.json({ ok: true }); } });
  const cookies = await login(worker);
  const fullCookies = `${cookies}; __Host-jb_chat=${'s'.repeat(43)}`;

  for (const path of ['/api/chat/_mcp', '/api/chat/_probe', '/api/chat/_mcp/tools', '/api/chat/_internal']) {
    for (const method of ['GET', 'POST', 'DELETE']) {
      for (const cookieHeader of [undefined, cookies, fullCookies]) {
        const res = await worker.fetch(request(path, method, method === 'GET' ? undefined : { jsonrpc: '2.0' }, cookieHeader, {
          Authorization: 'Bearer ' + token
        }), env);
        assert.equal(res.status, 404, `${method} ${path} (cookie=${Boolean(cookieHeader)})`);
        assert.match(res.headers.get('Cache-Control') ?? '', /no-store/);
        assert.deepEqual(await res.json(), { schemaVersion: '1.0.0', error: { code: 'unavailable', retryable: false } });
      }
    }
  }
  assert.equal(originCalls, 0);
});

test('access cookie enforces exact 3-point millisecond expiry boundary (expiresAt - 1, expiresAt, expiresAt + 1)', async () => {
  let now = 1_800_000_000_000;
  let originCalls = 0;
  const worker = createWorker({
    now: () => now,
    fetcher: async () => {
      originCalls++;
      return Response.json({ schemaVersion: '1.0.0', available: true });
    }
  });
  const cookies = await login(worker);
  const expirySeconds = Number(cookies.split('=')[1]!.split('.')[0]);
  const expiresAtMs = expirySeconds * 1000;
  assert.equal(expiresAtMs, 1_800_003_600_000);

  now = expiresAtMs - 1;
  const beforeAsset = await worker.fetch(request('/chat-request-details.js', 'GET', undefined, cookies), env);
  assert.equal(beforeAsset.status, 200);
  await beforeAsset.text();
  const beforeApi = await worker.fetch(request('/api/chat/config', 'GET', undefined, cookies), env);
  assert.equal(beforeApi.status, 200);
  await beforeApi.json();
  assert.equal(originCalls, 1);

  now = expiresAtMs;
  const exactAsset = await worker.fetch(request('/chat-request-details.js', 'GET', undefined, cookies), env);
  assert.equal(exactAsset.status, 401);
  await exactAsset.text();
  const exactApi = await worker.fetch(request('/api/chat/config', 'GET', undefined, cookies), env);
  assert.equal(exactApi.status, 401);
  await exactApi.text();
  assert.equal(originCalls, 1);

  now = expiresAtMs + 1;
  const afterAsset = await worker.fetch(request('/chat-request-details.js', 'GET', undefined, cookies), env);
  assert.equal(afterAsset.status, 401);
  await afterAsset.text();
  const afterApi = await worker.fetch(request('/api/chat/config', 'GET', undefined, cookies), env);
  assert.equal(afterApi.status, 401);
  await afterApi.text();
  assert.equal(originCalls, 1);

  now = 1_800_000_000_000 - 1;
  const futureDated = await worker.fetch(request('/api/chat/config', 'GET', undefined, cookies), env);
  assert.equal(futureDated.status, 401);
  await futureDated.text();
  assert.equal(originCalls, 1);
});

test('hostile path, header and cookie inputs and seeded fuzz inputs fail closed without origin calls or canary leakage', async () => {
  const canary = 'CANARY-A14-TOKEN-771';
  let originCalls = 0;
  const worker = createWorker({ fetcher: async () => { originCalls++; throw new Error(canary); } });
  const cookies = await login(worker);

  const hostilePaths = [
    '/api/chat/%2e%2e/session',
    '/api/chat/%252e%252e/session',
    '/api/chat/..%2fsession',
    '/api/chat/..',
    '/api/chat/%00',
    '/api/chat/%0d%0a',
    '/__proto__',
    '/api/chat/__proto__',
    `/chat-request-details.js?canary=${canary}`,
    `/api/chat/config#${canary}`,
    '/api/chat\\messages'
  ];
  for (const path of hostilePaths) {
    const res = await worker.fetch(new Request(origin + path, {
      method: 'GET',
      headers: { Origin: origin, Cookie: cookies, 'X-Canary': canary }
    }), env);
    assert.equal(res.status, 404, path);
    const body = await res.text();
    assert.ok(!body.includes(canary), `Canary leaked in body for ${path}`);
    assert.ok(!body.includes(token), `Operator token leaked in body for ${path}`);
    assert.ok(!JSON.stringify([...res.headers]).includes(canary), `Canary leaked in headers for ${path}`);
  }

  const hostileCookies = [
    `__Host-jb_chat_access=${canary}`,
    `__Host-jb_chat_access=1800003600.${canary}`,
    `${cookies}; ${cookies}`,
    `${cookies}; __Host-jb_chat=__proto__`,
    `${cookies}; __Host-jb_chat=${canary}`,
    `${cookies}; __Host-jb_chat=${'s'.repeat(43)}; __Host-jb_chat=${'b'.repeat(43)}`
  ];
  for (const badCookie of hostileCookies) {
    const res = await worker.fetch(request('/api/chat/session', 'POST', {}, badCookie, { 'X-Canary': canary }), env);
    assert.equal(res.status, 401, badCookie);
    const body = await res.text();
    assert.ok(!body.includes(canary));
    assert.ok(!body.includes(token));
    assert.ok(!JSON.stringify([...res.headers]).includes(canary));
  }

  // Deterministic seeded property test (seed = 0x20261031):
  // Invariant: never throws unclassified error, never calls origin, never emits canary or operator token, same input -> same output.
  let seed = 0x20261031;
  const nextRand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  const alphabet = ['..', '%2e%2e', '%00', '%0d%0a', '__proto__', 'constructor', '_mcp', '_probe', '\\', '?', '#', canary];
  for (let i = 0; i < 60; i++) {
    const seg1 = alphabet[nextRand() % alphabet.length]!;
    const seg2 = alphabet[nextRand() % alphabet.length]!;
    const cookieVal = `${seg1}=${canary}; __Host-jb_chat_access=${seg2}`;
    const targetUrl = `${origin}/api/chat/${encodeURIComponent(seg1)}/${encodeURIComponent(seg2)}`;
    const req1 = new Request(targetUrl, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: cookieVal }, body: JSON.stringify({ canary }) });
    const req2 = new Request(targetUrl, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: cookieVal }, body: JSON.stringify({ canary }) });
    const res1 = await worker.fetch(req1, env);
    const res2 = await worker.fetch(req2, env);
    const text1 = await res1.text();
    const text2 = await res2.text();
    assert.equal(res1.status, res2.status);
    assert.equal(text1, text2);
    assert.ok([401, 403, 404].includes(res1.status), `Unexpected status ${res1.status} on seed iteration ${i}`);
    assert.ok(!text1.includes(canary));
    assert.ok(!text1.includes(token));
    assert.ok(!JSON.stringify([...res1.headers]).includes(canary));
  }
  assert.equal(originCalls, 0);
});

test('ElevenLabs Josh voice routes (2ccxXaT9cMefjPlK2Pwn) require operator cookie, stream TTS/STT/Live session, and never leak API keys or canaries', async () => {
  const voiceCanary = 'CANARY-11LABS-SECRET-882';
  const calls: Array<{ url: string; method: string; headers: Headers; body: string }> = [];
  const worker = createWorker({
    fetcher: async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const headers = new Headers(init?.headers);
      let bodyText = '';
      if (typeof init?.body === 'string') bodyText = init.body;
      calls.push({ url, method: init?.method || 'GET', headers, body: bodyText });
      if (url.includes('/v1/text-to-speech/2ccxXaT9cMefjPlK2Pwn/stream')) {
        return new Response(new Uint8Array([0xff, 0xfb, 0x90, 0x64]), {
          status: 200,
          headers: { 'Content-Type': 'audio/mpeg' }
        });
      }
      if (url.includes('/v1/convai/conversation/get_signed_url')) {
        return new Response(JSON.stringify({ signed_url: 'wss://api.elevenlabs.io/v1/convai/conversation?agent_id=agent_1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(voiceCanary, { status: 502 });
    }
  });

  const voiceEnv = {
    ...env,
    ELEVENLABS_API_KEY: voiceCanary,
    ELEVENLABS_VOICE_ID: '2ccxXaT9cMefjPlK2Pwn',
    ELEVENLABS_AGENT_ID: 'agent_6001k8gbbfvffr9b2k2772k61ef2'
  };

  // 1. Unauthenticated requests fail closed with 401
  const unauthStatus = await worker.fetch(request('/api/chat/voice/status', 'GET'), voiceEnv);
  assert.equal(unauthStatus.status, 401);
  const unauthTts = await worker.fetch(request('/api/chat/voice/tts', 'POST', { text: 'Hello' }), voiceEnv);
  assert.equal(unauthTts.status, 401);
  assert.equal(calls.length, 0);

  // 2. Authenticated GET /api/chat/voice/status
  const cookies = await login(worker);
  const statusRes = await worker.fetch(request('/api/chat/voice/status', 'GET', undefined, cookies), voiceEnv);
  assert.equal(statusRes.status, 200);
  const statusJson = await statusRes.json() as Record<string, unknown>;
  assert.equal(statusJson.voiceId, '2ccxXaT9cMefjPlK2Pwn');
  assert.equal(statusJson.ttsModel, 'eleven_v4_turbo');
  assert.equal(statusJson.tts, true);
  assert.equal(statusJson.liveConversationalAi, true);
  assert.ok(!JSON.stringify(statusJson).includes(voiceCanary));

  // 3. Authenticated POST /api/chat/voice/tts uses Josh voice ID 2ccxXaT9cMefjPlK2Pwn & eleven_v4_turbo
  const ttsRes = await worker.fetch(
    request('/api/chat/voice/tts', 'POST', { text: 'Josh built the production Excel VBA takeover add-in.' }, cookies),
    voiceEnv
  );
  assert.equal(ttsRes.status, 200);
  assert.equal(ttsRes.headers.get('Content-Type'), 'audio/mpeg');
  const audioBytes = new Uint8Array(await ttsRes.arrayBuffer());
  assert.deepEqual([...audioBytes], [0xff, 0xfb, 0x90, 0x64]);
  assert.equal(calls.length, 1);
  assert.ok(calls[0]!.url.includes('/v1/text-to-speech/2ccxXaT9cMefjPlK2Pwn/stream?output_format=mp3_44100_192'));
  assert.equal(calls[0]!.headers.get('xi-api-key'), voiceCanary);
  assert.equal(JSON.parse(calls[0]!.body).model_id, 'eleven_v4_turbo');

  // 4. Authenticated POST /api/chat/voice/live-session returns signed WebSocket URL
  const liveRes = await worker.fetch(request('/api/chat/voice/live-session', 'POST', {}, cookies), voiceEnv);
  assert.equal(liveRes.status, 200);
  const liveJson = await liveRes.json() as Record<string, unknown>;
  assert.equal(liveJson.voiceId, '2ccxXaT9cMefjPlK2Pwn');
  assert.ok(String(liveJson.signedUrl).startsWith('wss://api.elevenlabs.io/v1/convai/conversation'));
  assert.ok(!JSON.stringify(liveJson).includes(voiceCanary));

  // 5. Hostile TTS inputs (empty text, NUL byte, oversized text, non-Josh voiceId, extra keys) fail closed with 400
  for (const badBody of [
    { text: '' },
    { text: 'Hello\u0000world' },
    { text: 'a'.repeat(1601) },
    { text: 'Hi', voiceId: '../bad' },
    { text: 'Hi', voiceId: 'OtherVoice1234567890' },
    { text: 'Hi', extraKey: 'forbidden' }
  ]) {
    const badRes = await worker.fetch(request('/api/chat/voice/tts', 'POST', badBody, cookies), voiceEnv);
    assert.equal(badRes.status, 400);
    assert.equal(badRes.headers.get('X-Frame-Options'), 'DENY');
    assert.ok(badRes.headers.get('Content-Security-Policy')?.includes("default-src 'none'"));
    const errText = await badRes.text();
    assert.ok(!errText.includes(voiceCanary));
  }

  // 6. Authenticated POST /api/chat/voice/stt accepts both JSON { audioBase64, mimeType } and raw audio/webm, and rejects hostile signed_url
  let sttUpstreamMode: 'ok' | 'redirect' = 'ok';
  let liveUpstreamUrl = 'wss://api.elevenlabs.io/v1/convai/conversation?agent_id=agent_1';
  const sttWorker = createWorker({
    fetcher: async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      assert.equal(init?.redirect, 'manual');
      if (url.includes('/v1/speech-to-text')) {
        if (sttUpstreamMode === 'redirect') {
          return new Response(null, { status: 302, headers: { Location: 'https://evil.example/steal' } });
        }
        return new Response(JSON.stringify({ text: 'Tell me about Medavie Blue Cross.', language_code: 'en' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (url.includes('/v1/convai/conversation/get_signed_url')) {
        return new Response(JSON.stringify({ signed_url: liveUpstreamUrl }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(voiceCanary, { status: 502 });
    }
  });
  const sttCookies = await login(sttWorker);

  const sttJsonRes = await sttWorker.fetch(
    request('/api/chat/voice/stt', 'POST', { audioBase64: btoa('fake-webm-bytes'), mimeType: 'audio/webm' }, sttCookies),
    voiceEnv
  );
  assert.equal(sttJsonRes.status, 200);
  const sttJsonBody = await sttJsonRes.json() as Record<string, unknown>;
  assert.equal(sttJsonBody.text, 'Tell me about Medavie Blue Cross.');

  const sttRawReq = new Request(`${origin}/api/chat/voice/stt`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Sec-Fetch-Site': 'same-origin',
      'Content-Type': 'audio/webm;codecs=opus',
      Cookie: sttCookies
    },
    body: new Uint8Array([0x1a, 0x45, 0xdf, 0xa3])
  });
  const sttRawRes = await sttWorker.fetch(sttRawReq, voiceEnv);
  assert.equal(sttRawRes.status, 200);

  sttUpstreamMode = 'redirect';
  const sttRedirectRes = await sttWorker.fetch(
    request('/api/chat/voice/stt', 'POST', { audioBase64: btoa('fake-webm-bytes') }, sttCookies),
    voiceEnv
  );
  assert.equal(sttRedirectRes.status, 502);

  for (const badSignedUrl of [
    'wss://api.elevenlabs.io/evil/path',
    'wss://api.elevenlabs.io:8443/v1/convai/conversation',
    'wss://user:pass@api.elevenlabs.io/v1/convai/conversation',
    `wss://api.elevenlabs.io/v1/convai/conversation?key=${voiceCanary}`,
    'wss://api.elevenlabs.io/v1/convai/conversation?xi-api-key=leak'
  ]) {
    liveUpstreamUrl = badSignedUrl;
    const badLiveRes = await sttWorker.fetch(request('/api/chat/voice/live-session', 'POST', {}, sttCookies), voiceEnv);
    assert.equal(badLiveRes.status, 502, `Expected 502 for hostile signed_url: ${badSignedUrl}`);
  }
});
