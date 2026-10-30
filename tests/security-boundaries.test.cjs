'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const { createContactService, CONTACT_LIMITS, validateContactPayload } = require('../lib/contact-service.cjs');
const valid = { name: 'Local test', email: 'test@example.com', message: 'Mocked transport only.' };
const retired = ['/api/twin', '/api/twin/status', '/api/twin/chat', '/api/twin/stt', '/api/twin/tts', '/api/twin/live-session', '/api/twin/voice-turn', '/api/twin/clear', '/api/twin/v1/chat/completions', '/api/explore', '/api/config', '/api/%74win/chat', '/API/TWIN/chat', '/twin-drawer.js', '/twin-voice.js', '/josh-3d-avatar.js', '/twin-context.json', '/career-guide-ui.js'];

test('production wrapper blocks every retired method before provider, state or asset dispatch', async () => {
  let legacyCalls = 0, assets = 0, contacts = 0;
  const source = fs.readFileSync(path.join(__dirname, '../worker.mjs'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/^export \{PortfolioState\}.*;\r?\n/gm, '')
    .replace('export default', 'globalThis.handler =');
  const context = { Response, Request, Headers, URL,
    files: JSON.parse(fs.readFileSync(path.join(__dirname, '../public-manifest.json'))),
    previous: { fetch() { legacyCalls++; throw new Error('Unexpected provider dispatch'); } },
    contact() { contacts++; return new Response('mock-contact'); },
    byteRange() { throw new Error('Unexpected range request'); }, mediaSlice() {} };
  vm.createContext(context); vm.runInContext(source, context);
  const env = { ASSETS: { fetch() { assets++; return new Response('mock-asset'); } } };
  const ctx = { waitUntil() {}, passThroughOnException() {} };
  for (const route of retired) for (const method of ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']) {
    const res = await context.handler.fetch(new Request('https://joshboyer.ca' + route, { method }), env, ctx);
    assert.equal(res.status, 410, method + ' ' + route);
    assert.equal(res.headers.get('Cache-Control'), 'no-store');
  }
  assert.equal(legacyCalls, 0); assert.equal(assets, 0); assert.equal(contacts, 0);
  assert.equal((await context.handler.fetch(new Request('https://joshboyer.ca/'), env, ctx)).status, 200);
  assert.equal((await context.handler.fetch(new Request('https://joshboyer.ca/api/contact', { method: 'POST' }), env, ctx)).status, 200);
  assert.equal(assets, 1); assert.equal(contacts, 1);
});

test('local server and standalone Pages handler keep retired APIs inaccessible', async () => {
  const corePath = require.resolve('../lib/twin-server-core.cjs');
  const { server } = require('../serve.cjs');
  assert.equal(require.cache[corePath], undefined, 'Serving the portfolio must not initialize the old AI core');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    for (const route of retired) for (const method of ['GET', 'HEAD', 'POST', 'OPTIONS']) {
      const res = await fetch(base + route, { method });
      assert.equal(res.status, 410, method + ' ' + route);
      assert.equal(res.headers.get('Cache-Control'), 'no-store'); await res.arrayBuffer();
    }
    for (const [headers, status] of [[{Origin: 'https://hostile.example', 'Content-Type': 'application/json'}, 403], [{'Content-Type': 'text/plain'}, 415]]) {
      const res = await fetch(base + '/api/contact', { method: 'POST', headers, body: JSON.stringify(valid) });
      assert.equal(res.status, status); await res.arrayBuffer();
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
  const { onRequest } = await import(pathToFileURL(path.join(__dirname, '../functions/api/twin/[[route]].js')).href);
  for (const method of ['GET', 'POST', 'OPTIONS']) {
    const res = await onRequest({ request: new Request('https://joshboyer.ca/api/twin/chat', { method }),
      env: new Proxy({}, { get() { throw new Error('Must not access provider configuration'); } }) });
    assert.equal(res.status, 410); assert.equal((await res.json()).error.code, 'TWIN_REMOVED');
  }
});

test('header fields reject all ASCII controls before delivery', () => {
  for (const field of ['name', 'email']) for (const code of [...Array(32).keys(), 127]) {
    assert.equal(validateContactPayload({ ...valid, [field]: 'A' + String.fromCharCode(code) + 'test@example.com' }).ok, false, field + ':' + code);
  }
});

test('contact limiter bounds address cardinality, retains established limits and recovers after expiry', async () => {
  let now = 1000, sends = 0;
  const service = createContactService({ nowFn: () => now, sendMailFn: async () => { sends++; return { id: 'mock' }; } });
  // An unconfigured transport avoids generating any mail while exercising the real limiter.
  const bounded = createContactService({ nowFn: () => now, env: {} });
  for (let i = 0; i < CONTACT_LIMITS.maxRateLimitClients; i++) {
    assert.equal((await bounded.handleSubmission({ body: valid, clientIp: 'mock-' + i })).status, 503);
  }
  assert.equal((await bounded.handleSubmission({ body: valid, clientIp: 'overflow' })).status, 429);
  now += CONTACT_LIMITS.rateLimitWindowMs + 1;
  assert.equal((await bounded.handleSubmission({ body: valid, clientIp: 'new-client' })).status, 503);
  for (let i = 0; i < CONTACT_LIMITS.rateLimitMaxRequests; i++) assert.equal((await service.handleSubmission({ body: valid, clientIp: 'one-client' })).status, 200);
  assert.equal((await service.handleSubmission({ body: valid, clientIp: 'one-client' })).status, 429);
  assert.equal(sends, 2 * CONTACT_LIMITS.rateLimitMaxRequests);
});

test('HTTP email transports set an abort deadline and refuse credential-bearing redirects', async () => {
  for (const env of [
    { CONTACT_EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'mock-key' },
    { CONTACT_EMAIL_PROVIDER: 'sendgrid', SENDGRID_API_KEY: 'mock-key' },
    { CONTACT_EMAIL_PROVIDER: 'mailchannels', MAILCHANNELS_ENABLED: 'true' },
    { CONTACT_EMAIL_PROVIDER: 'webhook', CONTACT_WEBHOOK_URL: 'https://mock.invalid/send' }
  ]) {
    let calls = 0;
    const service = createContactService({ env, fetchImpl: async (url, options) => {
      calls++; assert.equal(options.redirect, 'error'); assert.ok(options.signal instanceof AbortSignal);
      throw Object.assign(new Error('mock abort; no network'), { name: 'AbortError' });
    } });
    assert.equal((await service.handleSubmission({ body: valid })).status, 502); assert.equal(calls, 1);
  }
});
