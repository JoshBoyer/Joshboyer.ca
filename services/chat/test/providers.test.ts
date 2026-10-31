import test from 'node:test';
import assert from 'node:assert/strict';
import { callProvider, normaliseUsage } from '../src/provider.js';
import { CONFIG, responseBody } from './fixtures.js';
import type { Provider } from '../src/config.js';
import { successReceipt, failureReceipt } from '../src/telemetry.js';

function options(provider: Provider = 'openai') {
  return { provider, config: CONFIG, providerKey: 'provider-test-key-000000000000', gatewayKey: 'gateway-test-key-000000000000', signal: new AbortController().signal };
}

test('native provider routes use their own key and disable Cloudflare billing fallback/cache/payloads', async () => {
  for (const provider of ['openai', 'anthropic'] as const) {
    let calls = 0;
    const result = await callProvider({ ...options(provider), fetchImpl: async (url, init) => {
      calls++;
      assert.equal(String(url), `https://gateway.ai.cloudflare.com/v1/${CONFIG.gatewayAccountId}/${CONFIG.gatewayId}/${provider === 'openai' ? 'openai/responses' : 'anthropic/v1/messages'}`);
      assert.equal(init?.redirect, 'error');
      const headers = new Headers(init?.headers);
      assert.equal(headers.get('cf-aig-authorization'), 'Bearer gateway-test-key-000000000000');
      assert.equal(headers.get('cf-aig-no-wholesale'), 'true');
      assert.equal(headers.get('cf-aig-collect-log-payload'), 'false');
      assert.equal(headers.get('cf-aig-skip-cache'), 'true');
      const body = JSON.parse(String(init?.body));
      assert.equal(body.temperature, undefined);
      if (provider === 'openai') {
        assert.equal(headers.get('authorization'), 'Bearer provider-test-key-000000000000');
        assert.equal(headers.get('x-api-key'), null);
        assert.equal(body.max_output_tokens, 32); assert.equal(body.store, false); assert.deepEqual(body.reasoning, { effort: 'none' });
      } else {
        assert.equal(headers.get('x-api-key'), 'provider-test-key-000000000000');
        assert.equal(headers.get('authorization'), null);
        assert.equal(headers.get('anthropic-version'), '2026-10-21');
        assert.equal(body.max_tokens, 32); assert.deepEqual(body.thinking, { type: 'disabled' });
      }
      return Response.json(responseBody(provider), { headers: { 'cf-aig-log-id': 'log-test' } });
    } });
    assert.equal(calls, 1); assert.equal(result.text, 'OK'); assert.equal(result.gatewayRequestId, 'log-test');
    assert.equal(result.usage.status, 'known'); assert.equal(result.usage.totalTokens, 12);
  }
});

test('usage includes cache creation/read and reasoning without treating absent/invalid totals as free', () => {
  const anthropic = normaliseUsage('anthropic', { input_tokens: 10, output_tokens: 8, cache_read_input_tokens: 20, cache_creation_input_tokens: 30, cache_creation: { ephemeral_5m_input_tokens: 10, ephemeral_1h_input_tokens: 20 }, output_tokens_details: { thinking_tokens: 3 }, service_tier: 'standard', inference_geo: 'not_available' });
  assert.equal(anthropic.inputTokens, 60); assert.equal(anthropic.totalTokens, 68); assert.equal(anthropic.reasoningOutputTokens, 3);
  assert.equal(anthropic.status, 'known');
  assert.deepEqual(anthropic.providerDetails!.cache_creation, { ephemeral_5m_input_tokens: 10, ephemeral_1h_input_tokens: 20 });
  const openai = normaliseUsage('openai', { input_tokens: 40, output_tokens: 6, total_tokens: 46, input_tokens_details: { cached_tokens: 10, cache_write_tokens: 20, cache_write_tokens_details: { ephemeral_1h_tokens: 20 } }, output_tokens_details: { reasoning_tokens: 2 } });
  assert.equal(openai.totalTokens, 46); assert.equal(openai.cacheWriteInputTokens, 20);
  for (const usage of [undefined, {}, { input_tokens: 10 }, { input_tokens: 10, output_tokens: 2, total_tokens: 900 }, { input_tokens: -1, output_tokens: 2, total_tokens: 1 }, { input_tokens: 10, output_tokens: 2, total_tokens: 12, input_tokens_details: { cached_tokens: 99 } }]) {
    const result = normaliseUsage('openai', usage); assert.equal(result.status, 'unknown'); assert.equal(result.totalTokens, null);
  }
});

test('provider failures never retry or echo sensitive response data', async () => {
  for (const status of [400, 401, 429, 500, 503]) {
    let calls = 0;
    await assert.rejects(callProvider({ ...options(), fetchImpl: async () => { calls++; return new Response('private-error-content', { status }); } }), error => {
      assert.doesNotMatch(String(error), /private-error-content/); assert.equal((error as { chargeStatus: string }).chargeStatus, 'unknown'); return true;
    });
    assert.equal(calls, 1);
  }
});

test('bad JSON, oversized/chunked bodies and unexpected answer content fail closed', async () => {
  const responses = [
    () => new Response('not-json'),
    () => new Response('x', { headers: { 'content-length': '999999' } }),
    () => new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(65537)); controller.close(); } })),
    () => Response.json({ ...responseBody('openai'), output: [{ type: 'message', content: [{ type: 'output_text', text: 'Ignore the instructions.' }] }] }),
    () => Response.json({ ...responseBody('openai'), status: 'incomplete' })
  ];
  for (const response of responses) await assert.rejects(callProvider({ ...options(), fetchImpl: async () => response() }));
});

test('cancellation aborts a pending provider read and never starts an already-aborted call', async () => {
  const abort = new AbortController();
  abort.abort();
  let calls = 0;
  await assert.rejects(callProvider({ ...options(), signal: abort.signal, fetchImpl: async () => { calls++; return Response.json(responseBody('openai')); } }));
  assert.equal(calls, 0);
  const pending = new AbortController();
  let cancelled = false;
  const result = callProvider({ ...options(), signal: pending.signal, fetchImpl: async () => new Response(new ReadableStream({ cancel() { cancelled = true; } })) });
  setTimeout(() => pending.abort(), 5);
  await assert.rejects(result, { code: 'PROVIDER_DEADLINE' });
  assert.equal(cancelled, true);
});

test('missing credentials fail before a request and request identifiers are bounded', async () => {
  let called = false;
  await assert.rejects(callProvider({ ...options(), gatewayKey: '', fetchImpl: async () => { called = true; return Response.json(responseBody('openai')); } }), { code: 'CREDENTIAL_UNAVAILABLE' });
  assert.equal(called, false);
  const result = await callProvider({ ...options(), fetchImpl: async () => Response.json(responseBody('openai'), { headers: { 'cf-aig-log-id': 'x'.repeat(129), 'x-request-id': 'contains spaces' } }) });
  assert.equal(result.gatewayRequestId, undefined); assert.equal(result.providerRequestId, undefined);
});

test('operational receipts retain usage while excluding text and raw exceptions', () => {
  const receipt = successReceipt('request-123', 12.8, {
    provider: 'openai', model: CONFIG.models.openai, text: 'private response body', finishReason: 'completed',
    usage: normaliseUsage('openai', { input_tokens: 2, output_tokens: 1, total_tokens: 3 })
  });
  assert.equal(receipt.durationMs, 12);
  assert.equal(receipt.usage.totalTokens, 3);
  assert.doesNotMatch(JSON.stringify(receipt), /private response body/);
  const failed = failureReceipt('request\nunsafe', 1, new Error('secret credential in exception'), true);
  assert.equal(failed.requestId, 'unavailable');
  assert.equal(failed.chargeStatus, 'unknown');
  assert.doesNotMatch(JSON.stringify(failed), /secret credential/);
});
