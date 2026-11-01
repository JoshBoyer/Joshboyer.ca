import { authorised, failure, hmacKey, readBody, signedHeaders, streamBody, toBase64Url, validatedConfig,
  type Dependencies, type Env } from './worker.js';

const encoder = new TextEncoder();
const ACCESS_COOKIE = '__Host-jb_chat_access';
const SESSION_COOKIE = '__Host-jb_chat';
export const DEFAULT_JOSH_VOICE_ID = '2ccxXaT9cMefjPlK2Pwn';
export const ASSET_TYPES: Readonly<Record<string, string>> = Object.freeze(Object.assign(Object.create(null) as Record<string, string>, {
  '/chat-assistant.css': 'text/css; charset=utf-8',
  '/chat-assistant.js': 'text/javascript; charset=utf-8',
  '/chat-request-details.js': 'text/javascript; charset=utf-8',
  '/chat-evidence.json': 'application/json; charset=utf-8',
  '/assets/fonts/manrope-latin.woff2': 'font/woff2',
  '/assets/fonts/plus-jakarta-sans-latin.woff2': 'font/woff2',
  '/assets/fonts/ibm-plex-mono-400-latin.woff2': 'font/woff2',
  '/assets/personal/josh-portrait-smiling.jpg': 'image/jpeg',
  '/assets/optimized-extra/personal/josh-portrait-vest-640.webp': 'image/webp',
  '/assets/personal/josh-avatar-idle.mp4': 'video/mp4',
  '/assets/personal/josh-intro-voice.mp3': 'audio/mpeg'
}));
export const ASSETS = new Set(Object.keys(ASSET_TYPES));
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self' wss://api.elevenlabs.io; img-src 'self'; media-src 'self' blob:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";

function cookie(request: Request, name: string): string | undefined {
  const raw = request.headers.get('Cookie') ?? '';
  // eslint-disable-next-line no-control-regex -- Reject control characters in Cookie header.
  if (/[\u0000-\u001f\u007f]/.test(raw)) return '';
  const matches = raw.split(';').map(part => part.trim()).filter(part => part.startsWith(name + '='));
  if (matches.length === 0) return undefined;
  if (matches.length > 1) return '';
  return matches[0]!.slice(name.length + 1);
}

async function mac(secret: string, value: string): Promise<string> {
  return toBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(encoder.encode(secret)), encoder.encode(value))));
}

async function access(request: Request, secret: string, nowMs: number): Promise<boolean> {
  const value = cookie(request, ACCESS_COOKIE);
  const parts = value?.match(/^([0-9]{10})\.([A-Za-z0-9_-]{43})$/);
  const expiresAtMs = parts ? Number(parts[1]) * 1000 : 0;
  if (!parts || expiresAtMs <= nowMs || expiresAtMs > nowMs + 3_600_000) return false;
  return authorised('Bearer ' + parts[2], await mac(secret, 'private-access-v1:' + parts[1]));
}

function secure(response: Response, csp = CSP, contentType?: string): Response {
  const result = new Response(response.body, response);
  if (contentType) result.headers.set('Content-Type', contentType);
  result.headers.set('Cache-Control', 'private, no-store');
  result.headers.set('X-Content-Type-Options', 'nosniff');
  result.headers.set('Referrer-Policy', 'no-referrer');
  result.headers.set('Content-Security-Policy', csp);
  result.headers.set('X-Frame-Options', 'DENY');
  result.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  result.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return result;
}

function unavailable(): Response {
  return secure(new Response(JSON.stringify({ schemaVersion: '1.0.0', error: { code: 'unavailable', retryable: false } }), {
    status: 404,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  }));
}

function login(): Response {
  const nonce = toBase64Url(crypto.getRandomValues(new Uint8Array(24)));
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Private chat preview · Josh Boyer</title>
<style nonce="${nonce}">body{color:#edf5f2;background:#101d1b;font:18px system-ui;margin:0;padding:8vh 7vw}main{max-width:32rem;margin:auto}label,input,button{display:block}input,button{box-sizing:border-box;width:100%;padding:14px;margin-top:12px;border-radius:8px;font:inherit}input{background:#20312e;color:#fff;border:1px solid #68867a}button{background:#cbed87;border:0;color:#10201a;cursor:pointer}small{color:#bdd0c7}#status{min-height:2em}</style>
<main><small>JOSH BOYER / PRIVATE PREVIEW</small><h1>Portfolio chat</h1><p>This preview requires your private access token.</p><form><label for="token">Access token</label><input id="token" type="password" autocomplete="off" required spellcheck="false"><button>Open private preview</button><p id="status" role="status"></p></form></main>
<script nonce="${nonce}">document.querySelector('form').addEventListener('submit',async event=>{event.preventDefault();const input=document.querySelector('#token');const token=input.value;input.value='';const status=document.querySelector('#status');status.textContent='Checking access…';try{const response=await fetch('/api/chat/access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token}),credentials:'same-origin'});if(!response.ok)throw new Error();location.reload();}catch{status.textContent='Access could not be verified. Check the token and try again.'}});</script></html>`;
  return secure(new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }), CSP.replace("script-src 'self'", `script-src 'nonce-${nonce}'`).replace("style-src 'self'", `style-src 'nonce-${nonce}'`));
}

function voiceRoute(method: string, path: string): boolean {
  return (method === 'GET' && path === '/api/chat/voice/status') ||
    (method === 'POST' && (path === '/api/chat/voice/tts' || path === '/api/chat/voice/stt' || path === '/api/chat/voice/live-session'));
}

const MAX_VOICE_JSON_BYTES = 65_536;
const MAX_VOICE_AUDIO_STREAM_BYTES = 8 * 1024 * 1024;
const MAX_VOICE_POSTS_PER_MINUTE = 30;
const voiceRateWindows = new Map<string, number[]>();

function checkVoiceRateLimit(visitorKey: string, nowMs: number): boolean {
  const cutoff = nowMs - 60_000;
  const recent = (voiceRateWindows.get(visitorKey) ?? []).filter(ts => ts > cutoff);
  if (recent.length >= MAX_VOICE_POSTS_PER_MINUTE) {
    voiceRateWindows.set(visitorKey, recent);
    return false;
  }
  recent.push(nowMs);
  voiceRateWindows.set(visitorKey, recent);
  if (voiceRateWindows.size > 256) {
    for (const [k, list] of voiceRateWindows.entries()) {
      if (list.every(ts => ts <= cutoff)) voiceRateWindows.delete(k);
    }
  }
  return true;
}

async function readBoundedResponseJson(response: Response, signal: AbortSignal, maximum = MAX_VOICE_JSON_BYTES): Promise<unknown> {
  const declaredLength = response.headers.get('Content-Length');
  if (declaredLength && (!/^[0-9]+$/.test(declaredLength) || Number(declaredLength) > maximum)) {
    throw new RangeError('Response limit');
  }
  if (!response.body) throw new Error('Empty upstream body');
  const reader = response.body.getReader();
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
        throw new RangeError('Response limit');
      }
      chunks.push(next.value);
    }
  } finally {
    signal.removeEventListener('abort', abort);
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

function streamBoundedAudio(body: ReadableStream<Uint8Array>, maxBytes = MAX_VOICE_AUDIO_STREAM_BYTES): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  let total = 0;
  return new ReadableStream({
    async pull(controller) {
      try {
        const next = await reader.read();
        if (next.done) {
          controller.close();
          return;
        }
        total += next.value.byteLength;
        if (total > maxBytes) {
          await reader.cancel().catch(() => undefined);
          controller.error(new RangeError('Audio stream exceeded maximum size'));
          return;
        }
        controller.enqueue(next.value);
      } catch (err) {
        controller.error(err);
      }
    },
    async cancel() {
      await reader.cancel().catch(() => undefined);
    }
  });
}

function isValidElevenLabsSignedUrl(candidate: string, apiKey: string): boolean {
  // eslint-disable-next-line no-control-regex -- Reject control characters in signed WebSocket URL.
  if (!candidate || candidate.length > 2048 || /[\u0000-\u001f\u007f\s]/.test(candidate)) return false;
  if ((apiKey && candidate.includes(apiKey)) || /xi-api-key/i.test(candidate)) return false;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'wss:' &&
      parsed.hostname === 'api.elevenlabs.io' &&
      parsed.port === '' &&
      !parsed.username &&
      !parsed.password &&
      parsed.pathname === '/v1/convai/conversation';
  } catch {
    return false;
  }
}

async function handleVoiceRoute(request: Request, path: string, env: Env, dependencies: Dependencies): Promise<Response> {
  const apiKey = (env.ELEVENLABS_API_KEY ?? '').trim();
  const configuredVoice = (env.ELEVENLABS_VOICE_ID ?? '').trim();
  const voiceId = /^[A-Za-z0-9]{15,32}$/.test(configuredVoice) ? configuredVoice : DEFAULT_JOSH_VOICE_ID;
  const agentId = (env.ELEVENLABS_AGENT_ID ?? '').trim();
  const fetcher = dependencies.fetcher ?? fetch;
  const nowMs = (dependencies.now ?? Date.now)();

  if (path === '/api/chat/voice/status') {
    const isEnabled = Boolean(apiKey);
    const isLive = Boolean(apiKey && agentId);
    return secure(new Response(JSON.stringify({
      schemaVersion: '1.0.0',
      available: isEnabled,
      enabled: isEnabled,
      voiceId,
      tts: isEnabled,
      stt: isEnabled,
      ttsModel: 'eleven_v4_turbo',
      sttModel: 'scribe_v1',
      liveEnabled: isLive,
      liveConversationalAi: isLive
    }), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }));
  }

  if (!apiKey) return secure(failure(503, 'VOICE_NOT_CONFIGURED'));
  const rateKey = cookie(request, ACCESS_COOKIE) ?? 'anonymous';
  if (!checkVoiceRateLimit(rateKey, nowMs)) return secure(failure(429, 'RATE_LIMITED'));

  if (path === '/api/chat/voice/tts') {
    try {
      const bytes = await readBody(request, AbortSignal.timeout(10000), 4096);
      const parsed: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
      if (typeof parsed !== 'object' || !parsed || Array.isArray(parsed)) return secure(failure(400, 'INVALID_REQUEST'));
      for (const k of Object.keys(parsed)) {
        if (k !== 'text' && k !== 'voiceId') return secure(failure(400, 'INVALID_REQUEST'));
      }
      const rawText = typeof (parsed as { text?: unknown }).text === 'string' ? (parsed as { text: string }).text : '';
      if (!rawText || rawText.includes('\u0000') || rawText.length > 1600) return secure(failure(400, 'INVALID_REQUEST'));
      const cleanText = rawText.replace(/\s+/g, ' ').trim();
      if (!cleanText) return secure(failure(400, 'INVALID_REQUEST'));
      const rawVoiceId = (parsed as { voiceId?: unknown }).voiceId;
      if (rawVoiceId !== undefined && (typeof rawVoiceId !== 'string' || !/^[A-Za-z0-9]{15,32}$/.test(rawVoiceId) ||
          (rawVoiceId !== voiceId && rawVoiceId !== DEFAULT_JOSH_VOICE_ID && rawVoiceId !== '0iNRfr49ogpb5IWbQqiC'))) {
        return secure(failure(400, 'INVALID_REQUEST'));
      }
      const targetVoiceId = typeof rawVoiceId === 'string' ? rawVoiceId : voiceId;
      const upstream = await fetcher(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(targetVoiceId)}/stream?output_format=mp3_44100_192`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
            Accept: 'audio/mpeg'
          },
          body: JSON.stringify({
            text: cleanText,
            model_id: 'eleven_v4_turbo'
          }),
          redirect: 'manual',
          signal: AbortSignal.timeout(25000)
        }
      );
      if (upstream.status !== 200 || !upstream.body) return secure(failure(502, 'VOICE_UPSTREAM_FAILED'));
      return secure(new Response(streamBoundedAudio(upstream.body), {
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg' }
      }), CSP, 'audio/mpeg');
    } catch (error) {
      return secure(failure(error instanceof RangeError ? 413 : 502, 'VOICE_UPSTREAM_FAILED'));
    }
  }

  if (path === '/api/chat/voice/stt') {
    try {
      const bytes = await readBody(request, AbortSignal.timeout(15000), 1_500_000);
      if (bytes.byteLength === 0) return secure(failure(400, 'INVALID_REQUEST'));
      const contentType = (request.headers.get('Content-Type') ?? '').toLowerCase();
      let audioBytes: Uint8Array<ArrayBuffer>;
      let mimeType = 'audio/webm';
      if (contentType.startsWith('audio/')) {
        audioBytes = bytes;
        mimeType = contentType.split(';')[0]!.trim() || 'audio/webm';
      } else {
        const parsed: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
        if (typeof parsed !== 'object' || !parsed || Array.isArray(parsed)) return secure(failure(400, 'INVALID_REQUEST'));
        for (const k of Object.keys(parsed)) {
          if (k !== 'audioBase64' && k !== 'mimeType') return secure(failure(400, 'INVALID_REQUEST'));
        }
        const audioBase64 = typeof (parsed as { audioBase64?: unknown }).audioBase64 === 'string'
          ? (parsed as { audioBase64: string }).audioBase64.trim()
          : '';
        if (typeof (parsed as { mimeType?: unknown }).mimeType === 'string') {
          const candidateMime = (parsed as { mimeType: string }).mimeType.split(';')[0]!.trim().toLowerCase();
          if (/^audio\/(?:webm|ogg|mp4|wav|mpeg)$/.test(candidateMime)) mimeType = candidateMime;
        }
        if (!audioBase64 || audioBase64.length > 1_400_000) return secure(failure(400, 'INVALID_REQUEST'));
        const binaryStr = atob(audioBase64);
        audioBytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i += 1) audioBytes[i] = binaryStr.charCodeAt(i);
      }
      const ext = mimeType.includes('wav') ? 'wav' : mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
      const formData = new FormData();
      formData.append('file', new Blob([audioBytes], { type: mimeType }), `speech.${ext}`);
      formData.append('model_id', 'scribe_v1');
      formData.append('tag_audio_events', 'false');
      const sttSignal = AbortSignal.timeout(15000);
      const upstream = await fetcher('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: { 'xi-api-key': apiKey },
        body: formData,
        redirect: 'manual',
        signal: sttSignal
      });
      if (upstream.status !== 200) return secure(failure(502, 'VOICE_STT_FAILED'));
      const data = await readBoundedResponseJson(upstream, sttSignal) as { text?: unknown; language_code?: unknown };
      const text = typeof data?.text === 'string' ? data.text.trim().slice(0, 2000) : '';
      return secure(new Response(JSON.stringify({
        schemaVersion: '1.0.0',
        text,
        languageCode: typeof data?.language_code === 'string' ? data.language_code : 'en'
      }), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }));
    } catch (error) {
      return secure(failure(error instanceof RangeError ? 413 : 502, 'VOICE_STT_FAILED'));
    }
  }

  if (path === '/api/chat/voice/live-session') {
    if (!agentId || !/^[A-Za-z0-9_-]{10,64}$/.test(agentId)) return secure(failure(503, 'LIVE_AGENT_NOT_CONFIGURED'));
    try {
      await readBody(request, AbortSignal.timeout(5000), 1024);
      const liveSignal = AbortSignal.timeout(10000);
      const upstream = await fetcher(
        `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${encodeURIComponent(agentId)}`,
        {
          method: 'GET',
          headers: { 'xi-api-key': apiKey },
          redirect: 'manual',
          signal: liveSignal
        }
      );
      if (upstream.status !== 200) {
        if (upstream.status === 401 || upstream.status === 403) {
          const fallbackUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${encodeURIComponent(agentId)}`;
          if (!isValidElevenLabsSignedUrl(fallbackUrl, apiKey)) return secure(failure(502, 'LIVE_SESSION_FAILED'));
          return secure(new Response(JSON.stringify({
            schemaVersion: '1.0.0',
            signedUrl: fallbackUrl,
            voiceId,
            authMode: 'public_agent_fallback'
          }), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }));
        }
        return secure(failure(502, 'LIVE_SESSION_FAILED'));
      }
      const data = await readBoundedResponseJson(upstream, liveSignal) as { signed_url?: unknown };
      if (typeof data?.signed_url !== 'string' || !isValidElevenLabsSignedUrl(data.signed_url, apiKey)) {
        return secure(failure(502, 'LIVE_SESSION_FAILED'));
      }
      return secure(new Response(JSON.stringify({
        schemaVersion: '1.0.0',
        signedUrl: data.signed_url,
        voiceId,
        authMode: 'signed_url'
      }), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }));
    } catch (error) {
      return secure(failure(error instanceof RangeError ? 413 : 502, 'LIVE_SESSION_FAILED'));
    }
  }

  return unavailable();
}

function route(method: string, path: string): boolean {
  return (method === 'GET' && path === '/api/chat/config') ||
    ((method === 'POST' || method === 'DELETE') && path === '/api/chat/session') ||
    (method === 'POST' && path === '/api/chat/messages') ||
    (method === 'POST' && /^\/api\/chat\/requests\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/cancel$/.test(path));
}

export async function privateChat(request: Request, env: Env, dependencies: Dependencies = {}): Promise<Response> {
  const url = new URL(request.url);
  // eslint-disable-next-line no-control-regex -- Reject control characters, percent-encoding, backslashes, and prototype segments.
  if (url.search || url.hash || /%|\\|[\u0000-\u001f\u007f]/.test(url.pathname) ||
      url.pathname.split('/').some(part => part === '.' || part === '..' || part === '__proto__')) {
    return unavailable();
  }
  if (env.CHAT_PRIVATE_ENABLED !== 'true' || env.PUBLIC_CHAT_ENABLED === 'true') return unavailable();
  if (/^\/api\/chat\/_/i.test(url.pathname)) return unavailable();
  let config: ReturnType<typeof validatedConfig>;
  try { config = validatedConfig(env); } catch { return secure(failure(503, 'NOT_CONFIGURED')); }
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) return secure(failure(403, 'HTTPS_REQUIRED'));
  const nowMs = (dependencies.now ?? Date.now)();
  const now = Math.floor(nowMs / 1000);
  const isRead = request.method === 'GET' || request.method === 'HEAD';
  const rawContentType = request.headers.get('Content-Type') ?? '';
  const validWriteContentType = /^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(rawContentType) ||
    (url.pathname === '/api/chat/voice/stt' && /^audio\/(?:webm|ogg|mp4|wav|mpeg)(?:\s*;.*)?$/i.test(rawContentType));
  if (!isRead && (request.headers.get('Origin') !== url.origin ||
      ['cross-site', 'none'].includes(request.headers.get('Sec-Fetch-Site') ?? '') ||
      !validWriteContentType ||
      request.headers.has('Content-Encoding'))) return secure(failure(403, 'REQUEST_REJECTED'));

  if (url.pathname === '/api/chat/access') {
    if (request.method !== 'POST') return secure(failure(405, 'METHOD_NOT_ALLOWED'));
    try {
      const bytes = await readBody(request, AbortSignal.timeout(5000), 256);
      const body: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
      if (typeof body !== 'object' || !body || Array.isArray(body) || Object.keys(body).join() !== 'token' ||
          typeof (body as { token?: unknown }).token !== 'string' ||
          !await authorised('Bearer ' + (body as { token: string }).token, config.token)) return secure(failure(401, 'UNAUTHORISED'));
      const expiry = String(now + 3600);
      const value = expiry + '.' + await mac(config.token, 'private-access-v1:' + expiry);
      return secure(new Response('{"ok":true}', { headers: { 'Content-Type': 'application/json',
        'Set-Cookie': `${ACCESS_COOKIE}=${value}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=3600` } }));
    } catch (error) { return secure(failure(error instanceof RangeError ? 413 : 400, 'INVALID_REQUEST')); }
  }

  const assets = env.CHAT_ASSETS ?? env.ASSETS;
  const authenticated = await access(request, config.token, nowMs);
  if (url.pathname === '/chat-preview' || url.pathname === '/chat-preview.html' || url.pathname === '/') {
    if (!isRead) return secure(failure(405, 'METHOD_NOT_ALLOWED'));
    if (!authenticated) return login();
    if (!assets) return secure(failure(503, 'ASSETS_UNAVAILABLE'));
    return secure(await assets.fetch(new Request(new URL('/chat-preview.html', url), { method: request.method })));
  }
  if (Object.hasOwn(ASSET_TYPES, url.pathname)) {
    if (!isRead) return secure(failure(405, 'METHOD_NOT_ALLOWED'));
    if (!authenticated) return secure(failure(401, 'UNAUTHORISED'));
    if (!assets) return secure(failure(503, 'ASSETS_UNAVAILABLE'));
    const assetResponse = await assets.fetch(new Request(url, { method: request.method }));
    if (assetResponse.status === 404) return unavailable();
    return secure(assetResponse, CSP, ASSET_TYPES[url.pathname]);
  }
  if (voiceRoute(request.method, url.pathname)) {
    if (!authenticated) return secure(failure(401, 'UNAUTHORISED'));
    return handleVoiceRoute(request, url.pathname, env, dependencies);
  }
  if (!route(request.method, url.pathname)) return unavailable();
  if (!authenticated) return secure(failure(401, 'UNAUTHORISED'));

  const controller = new AbortController();
  const abort = () => controller.abort();
  request.signal.addEventListener('abort', abort, { once: true });
  if (request.signal.aborted) controller.abort();
  const timer = setTimeout(abort, dependencies.timeoutMs ?? 55000);
  const cleanup = () => { clearTimeout(timer); request.signal.removeEventListener('abort', abort); };
  try {
    const body = await readBody(request, controller.signal, 12288);
    if (isRead && body.length) { cleanup(); return secure(failure(400, 'INVALID_REQUEST')); }
    const session = cookie(request, SESSION_COOKIE);
    if (session !== undefined && !/^[A-Za-z0-9_-]{43}$/.test(session)) { cleanup(); return secure(failure(401, 'INVALID_SESSION')); }
    const visitor = await mac(config.token, 'private-visitor-v1');
    const headers = await signedHeaders(body, config.keyring, String(now), dependencies.nonce?.() ?? crypto.randomUUID(),
      request.method, url.pathname, `private:${visitor}:${session ?? '-'}`);
    const upstream = await (dependencies.fetcher ?? fetch)(config.origin + url.pathname, {
      method: request.method, headers, ...(isRead ? {} : { body }), redirect: 'manual', signal: controller.signal
    });
    const contentType = upstream.headers.get('Content-Type') ?? '';
    if (upstream.status < 200 || upstream.status >= 500 || upstream.status >= 300 && upstream.status < 400 ||
        !/^(?:application\/json|text\/event-stream)(?:;|$)/i.test(contentType) || !upstream.body) {
      void upstream.body?.cancel().catch(() => undefined); cleanup(); return secure(failure(502, 'UPSTREAM_REJECTED'));
    }
    const responseHeaders = new Headers({ 'Content-Type': contentType });
    const sessionCookie = upstream.headers.get('Set-Cookie');
    if (sessionCookie) {
      if (!/^__Host-jb_chat=(?:[A-Za-z0-9_-]{43})?; Path=\/; Secure; HttpOnly; SameSite=Strict; Max-Age=(?:86400|0)$/.test(sessionCookie)) {
        void upstream.body.cancel().catch(() => undefined); cleanup(); return secure(failure(502, 'INVALID_SESSION'));
      }
      responseHeaders.set('Set-Cookie', sessionCookie);
    }
    return secure(new Response(streamBody(upstream.body, controller, cleanup), { status: upstream.status, headers: responseHeaders }));
  } catch (error) {
    cleanup();
    return secure(failure(controller.signal.aborted ? 504 : error instanceof RangeError ? 413 : 502, 'CHAT_UNAVAILABLE'));
  }
}
