import { authorised, failure, hmacKey, readBody, signedHeaders, streamBody, toBase64Url, validatedConfig,
  type Dependencies, type Env } from './worker.js';

const encoder = new TextEncoder();
const ACCESS_COOKIE = '__Host-jb_chat_access';
const SESSION_COOKIE = '__Host-jb_chat';
export const ASSET_TYPES: Readonly<Record<string, string>> = Object.freeze(Object.assign(Object.create(null) as Record<string, string>, {
  '/chat-assistant.css': 'text/css; charset=utf-8',
  '/chat-assistant.js': 'text/javascript; charset=utf-8',
  '/chat-request-details.js': 'text/javascript; charset=utf-8',
  '/chat-evidence.json': 'application/json; charset=utf-8',
  '/assets/fonts/manrope-latin.woff2': 'font/woff2',
  '/assets/fonts/plus-jakarta-sans-latin.woff2': 'font/woff2',
  '/assets/fonts/ibm-plex-mono-400-latin.woff2': 'font/woff2',
  '/assets/personal/josh-portrait-smiling.jpg': 'image/jpeg',
  '/assets/optimized-extra/personal/josh-portrait-vest-640.webp': 'image/webp'
}));
export const ASSETS = new Set(Object.keys(ASSET_TYPES));
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";

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
  try { config = validatedConfig(env); } catch { return failure(503, 'NOT_CONFIGURED'); }
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) return failure(403, 'HTTPS_REQUIRED');
  const nowMs = (dependencies.now ?? Date.now)();
  const now = Math.floor(nowMs / 1000);
  const isRead = request.method === 'GET' || request.method === 'HEAD';
  if (!isRead && (request.headers.get('Origin') !== url.origin ||
      ['cross-site', 'none'].includes(request.headers.get('Sec-Fetch-Site') ?? '') ||
      !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('Content-Type') ?? '') ||
      request.headers.has('Content-Encoding'))) return failure(403, 'REQUEST_REJECTED');

  if (url.pathname === '/api/chat/access') {
    if (request.method !== 'POST') return failure(405, 'METHOD_NOT_ALLOWED');
    try {
      const bytes = await readBody(request, AbortSignal.timeout(5000), 256);
      const body: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
      if (typeof body !== 'object' || !body || Array.isArray(body) || Object.keys(body).join() !== 'token' ||
          typeof (body as { token?: unknown }).token !== 'string' ||
          !await authorised('Bearer ' + (body as { token: string }).token, config.token)) return failure(401, 'UNAUTHORISED');
      const expiry = String(now + 3600);
      const value = expiry + '.' + await mac(config.token, 'private-access-v1:' + expiry);
      return secure(new Response('{"ok":true}', { headers: { 'Content-Type': 'application/json',
        'Set-Cookie': `${ACCESS_COOKIE}=${value}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=3600` } }));
    } catch (error) { return failure(error instanceof RangeError ? 413 : 400, 'INVALID_REQUEST'); }
  }

  const assets = env.CHAT_ASSETS ?? env.ASSETS;
  const authenticated = await access(request, config.token, nowMs);
  if (url.pathname === '/chat-preview' || url.pathname === '/chat-preview.html' || url.pathname === '/') {
    if (!isRead) return failure(405, 'METHOD_NOT_ALLOWED');
    if (!authenticated) return login();
    if (!assets) return failure(503, 'ASSETS_UNAVAILABLE');
    return secure(await assets.fetch(new Request(new URL('/chat-preview.html', url), { method: request.method })));
  }
  if (Object.hasOwn(ASSET_TYPES, url.pathname)) {
    if (!isRead) return failure(405, 'METHOD_NOT_ALLOWED');
    if (!authenticated) return failure(401, 'UNAUTHORISED');
    if (!assets) return failure(503, 'ASSETS_UNAVAILABLE');
    const assetResponse = await assets.fetch(new Request(url, { method: request.method }));
    if (assetResponse.status === 404) return unavailable();
    return secure(assetResponse, CSP, ASSET_TYPES[url.pathname]);
  }
  if (!route(request.method, url.pathname)) return unavailable();
  if (!authenticated) return failure(401, 'UNAUTHORISED');

  const controller = new AbortController();
  const abort = () => controller.abort();
  request.signal.addEventListener('abort', abort, { once: true });
  if (request.signal.aborted) controller.abort();
  const timer = setTimeout(abort, dependencies.timeoutMs ?? 55000);
  const cleanup = () => { clearTimeout(timer); request.signal.removeEventListener('abort', abort); };
  try {
    const body = await readBody(request, controller.signal, 12288);
    if (isRead && body.length) { cleanup(); return failure(400, 'INVALID_REQUEST'); }
    const session = cookie(request, SESSION_COOKIE);
    if (session !== undefined && !/^[A-Za-z0-9_-]{43}$/.test(session)) { cleanup(); return failure(401, 'INVALID_SESSION'); }
    const visitor = await mac(config.token, 'private-visitor-v1');
    const headers = await signedHeaders(body, config.keyring, String(now), dependencies.nonce?.() ?? crypto.randomUUID(),
      request.method, url.pathname, `private:${visitor}:${session ?? '-'}`);
    const upstream = await (dependencies.fetcher ?? fetch)(config.origin + url.pathname, {
      method: request.method, headers, ...(isRead ? {} : { body }), redirect: 'manual', signal: controller.signal
    });
    const contentType = upstream.headers.get('Content-Type') ?? '';
    if (upstream.status < 200 || upstream.status >= 500 || upstream.status >= 300 && upstream.status < 400 ||
        !/^(?:application\/json|text\/event-stream)(?:;|$)/i.test(contentType) || !upstream.body) {
      void upstream.body?.cancel().catch(() => undefined); cleanup(); return failure(502, 'UPSTREAM_REJECTED');
    }
    const responseHeaders = new Headers({ 'Content-Type': contentType });
    const sessionCookie = upstream.headers.get('Set-Cookie');
    if (sessionCookie) {
      if (!/^__Host-jb_chat=(?:[A-Za-z0-9_-]{43})?; Path=\/; Secure; HttpOnly; SameSite=Strict; Max-Age=(?:86400|0)$/.test(sessionCookie)) {
        void upstream.body.cancel().catch(() => undefined); cleanup(); return failure(502, 'INVALID_SESSION');
      }
      responseHeaders.set('Set-Cookie', sessionCookie);
    }
    return secure(new Response(streamBody(upstream.body, controller, cleanup), { status: upstream.status, headers: responseHeaders }));
  } catch (error) {
    cleanup();
    return failure(controller.signal.aborted ? 504 : error instanceof RangeError ? 413 : 502, 'CHAT_UNAVAILABLE');
  }
}
