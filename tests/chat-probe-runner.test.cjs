'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { MODELS, runProbe, runNegativeChecks, runFromEnvironment, parseProbeStream } = require('../tools/probe-chat-cloud.cjs');

const url = 'https://joshboyer-chat-dev.example-subdomain.workers.dev/api/chat/_probe';
const token = 'test-only-operator-token-000000000000000000000000';
const usage = { status: 'known', inputTokens: 10, outputTokens: 2, totalTokens: 12,
  cacheReadInputTokens: 0, cacheWriteInputTokens: 0, reasoningOutputTokens: 0, providerDetails: { input_tokens: 10, output_tokens: 2 } };
const frame = (event, data) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

function stream(provider = 'openai', change = {}) {
  return frame('status', { phase: 'provider', provider }) + frame('result', {
    provider, model: MODELS[provider], text: 'OK', finishReason: provider === 'openai' ? 'completed' : 'end_turn', usage,
    providerRequestId: 'provider-request', gatewayRequestId: 'gateway-request', ...change
  }) + frame('done', { ok: true });
}
const response = text => new Response(text, { headers: { 'content-type': 'text/event-stream; charset=utf-8' } });

test('positive checks are sequential fixed requests and receipts contain only safe fields', async () => {
  const calls = [];
  let active = false;
  const result = await runFromEnvironment({ env: { JOSH_CHAT_PROBE_URL: url, JOSH_CHAT_PROBE_TOKEN: token }, args: [], fetchImpl: async (target, options) => {
    assert.equal(active, false); active = true;
    assert.equal(target, url); assert.equal(options.method, 'POST'); assert.equal(options.redirect, 'error');
    assert.deepEqual(options.headers, { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
    assert.ok(options.signal instanceof AbortSignal);
    const { provider } = JSON.parse(options.body); calls.push(provider);
    assert.equal(options.body, JSON.stringify({ provider }));
    return response(new ReadableStream({ async start(controller) {
      await new Promise(resolve => setImmediate(resolve));
      controller.enqueue(Buffer.from(stream(provider)));
      controller.close();
      active = false;
    } }));
  } });
  assert.deepEqual(calls, ['openai', 'anthropic']);
  for (const receipt of result.probes) {
    assert.equal(receipt.status, 'passed'); assert.equal(receipt.usage.totalTokens, 12);
    assert.equal(receipt.usage.providerDetails, undefined);
    assert.ok(receipt.latencyMs.total >= receipt.latencyMs.firstByte);
  }
  assert.doesNotMatch(JSON.stringify(result), /Reply|Authorization|test-only|"text"|workers\.dev|providerDetails/);
});

test('unapproved destinations, tokens, arguments and providers fail before network access', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; throw new Error('network'); };
  for (const invalid of [url.replace('https:', 'http:'), url + '?x=1', url + '#fragment', url + '/', url.replace('.workers.dev', '.workers.dev.evil.example'), url.replace('joshboyer-chat-dev.', 'production.'), url.replace('https://', 'https://user@')]) {
    await assert.rejects(runProbe({ provider: 'openai', url: invalid, token, fetchImpl }), { code: 'INVALID_PROBE_URL' });
  }
  for (const invalid of ['', 'short', token + '\n', token + ' ']) await assert.rejects(runProbe({ provider: 'openai', url, token: invalid, fetchImpl }), { code: 'INVALID_PROBE_TOKEN' });
  await assert.rejects(runProbe({ provider: 'other', url, token, fetchImpl }), { code: 'INVALID_PROVIDER' });
  await assert.rejects(runFromEnvironment({ args: ['--unknown'], fetchImpl }), { code: 'INVALID_ARGUMENTS' });
  assert.equal(calls, 0);
});

test('a failed positive probe stops the sequence without retry or fallback', async () => {
  let calls = 0;
  await assert.rejects(runFromEnvironment({
    env: { JOSH_CHAT_PROBE_URL: url, JOSH_CHAT_PROBE_TOKEN: token }, args: [],
    fetchImpl: async () => { calls++; return new Response('private failure', { status: 503 }); }
  }), { code: 'UNEXPECTED_HTTP_STATUS', httpStatus: 503 });
  assert.equal(calls, 1);
});

test('strict SSE rejects unexpected frames, incomplete completion and altered results', () => {
  const valid = stream();
  for (const text of [
    valid.replace('event: status', 'event: surprise'), valid.replace(frame('done', { ok: true }), ''),
    valid + frame('done', { ok: true }), valid.slice(0, -1), valid.replace('data: ', 'id: 1\ndata: '),
    valid.replace('event: result', 'event: done'), valid.replace('data: {', 'data: invalid{'),
    stream('openai', { text: 'private-unexpected-response' }), stream('openai', { model: 'different-model' }),
    stream('openai', { provider: 'anthropic' }), stream('openai', { extra: 'private-response' }),
    stream('openai', { gatewayRequestId: 'private response spaces' }), stream('openai', { finishReason: 'incomplete' })
  ]) assert.throws(() => parseProbeStream(text, 'openai'), { code: 'INVALID_STREAM' });
  assert.equal(parseProbeStream(valid.replace(/\n/g, '\r\n'), 'openai').status, 'passed');
});

test('unknown or inconsistent usage cannot produce a successful receipt', () => {
  assert.throws(() => parseProbeStream(stream('openai', { usage: { ...usage, status: 'unknown' } }), 'openai'), { code: 'USAGE_UNAVAILABLE' });
  for (const bad of [{ ...usage, totalTokens: 999 }, { ...usage, inputTokens: null }, { ...usage, reasoningOutputTokens: 3 }, { ...usage, providerDetails: { private_value: 'secret' } }]) {
    assert.throws(() => parseProbeStream(stream('openai', { usage: bad }), 'openai'), { code: 'INVALID_USAGE' });
  }
});

test('provider and transport failures do not echo response text, headers or exceptions', async () => {
  const failure = frame('status', { phase: 'provider', provider: 'openai' }) +
    frame('error', { code: 'private-provider-error', chargeStatus: 'unknown' }) + frame('done', { ok: false });
  await assert.rejects(runProbe({ provider: 'openai', url, token, fetchImpl: async () => response(failure) }), { code: 'PROVIDER_REPORTED_FAILURE' });
  for (const fetchImpl of [async () => new Response('private-raw-body', { status: 503 }), async () => { throw new Error(token + url); }]) {
    await assert.rejects(runProbe({ provider: 'openai', url, token, fetchImpl }), error => {
      assert.doesNotMatch(JSON.stringify(error) + error.message, /private-raw-body|test-only|workers\.dev/);
      return true;
    });
  }
});

test('first-byte timing spans chunked reads and UTF-8 decoding rejects malformed bytes', async () => {
  let time = 100;
  const bytes = Buffer.from(stream());
  let step = 0;
  const result = await runProbe({ provider: 'openai', url, token, now: () => time, fetchImpl: async () => response(new ReadableStream({
    pull(controller) {
      if (step === 0) { time = 105; controller.enqueue(bytes.subarray(0, 15)); }
      else if (step === 1) { time = 110; controller.enqueue(bytes.subarray(15)); }
      else { time = 115; controller.close(); }
      step++;
    }
  })) });
  assert.ok(result.latencyMs.firstByte >= 5); assert.equal(result.latencyMs.total, 15);
  await assert.rejects(runProbe({ provider: 'openai', url, token, fetchImpl: async () => response(new Uint8Array([0xff])) }), { code: 'INVALID_STREAM' });
});

test('oversized declared and chunked responses are cancelled', async () => {
  await assert.rejects(runProbe({ provider: 'openai', url, token, fetchImpl: async () => new Response('x', { headers: { 'content-type': 'text/event-stream', 'content-length': '65537' } }) }), { code: 'RESPONSE_TOO_LARGE' });
  let cancelled = false;
  await assert.rejects(runProbe({ provider: 'openai', url, token, fetchImpl: async () => response(new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(65537)); }, cancel() { cancelled = true; }
  })) }), { code: 'RESPONSE_TOO_LARGE' });
  assert.equal(cancelled, true);
});

test('deadline covers both fetch and stalled response streaming without retries', async () => {
  let calls = 0, signal, cancelled = false;
  await assert.rejects(runProbe({ provider: 'openai', url, token, timeoutMs: 10, fetchImpl: async (_url, options) => {
    calls++; signal = options.signal;
    return new Promise(() => {});
  } }), { code: 'PROBE_DEADLINE' });
  assert.equal(calls, 1); assert.equal(signal.aborted, true);
  await assert.rejects(runProbe({ provider: 'openai', url, token, timeoutMs: 10, fetchImpl: async () => response(new ReadableStream({ cancel() { cancelled = true; } })) }), { code: 'PROBE_DEADLINE' });
  assert.equal(cancelled, true);
});

test('negative checks observe HTTP rejection only and never expose operator credentials', async () => {
  const seen = [];
  const checks = await runNegativeChecks({ url, token, fetchImpl: async (target, options) => {
    seen.push({ target, auth: options.headers.Authorization });
    assert.equal(options.redirect, 'error');
    return new Response('untrusted-private-error', { status: target === url ? 401 : 404 });
  } });
  assert.equal(seen[0].auth, undefined);
  assert.notEqual(seen[1].auth, 'Bearer ' + token);
  assert.equal(seen[2].auth, 'Bearer ' + token);
  assert.ok(seen[2].target.endsWith('/api/chat/_not_a_route'));
  assert.deepEqual(checks.map(check => check.httpStatus), [401, 401, 404]);
  assert.ok(checks.every(check => check.evidence === 'observed_http_only'));
  assert.doesNotMatch(JSON.stringify(checks), /untrusted|test-only|Bearer|providerCalls/);
  await assert.rejects(runNegativeChecks({ url, token, fetchImpl: async () => new Response('', { status: 200 }) }), { code: 'NEGATIVE_CHECK_FAILED' });
});
