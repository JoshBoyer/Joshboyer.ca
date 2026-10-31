import test from 'node:test';
import assert from 'node:assert/strict';
import { callProvider, normaliseUsage } from '../src/provider.js';
import { callChatProvider, callEmbedding, embeddingReceipt, normaliseEmbeddingUsage } from '../src/chat-provider.js';
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODELS, MODELS, loadConfig, type Provider } from '../src/config.js';
import { CONFIG, ENV, responseBody } from './fixtures.js';
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

function validVector(seed = 0): number[] {
  return Array.from({ length: EMBEDDING_DIMENSIONS }, (_, i) => Number((((i + seed) % 97) * 0.001 - 0.048).toFixed(6)));
}

test('Phase 4 config preserves defaults and validates optional S3, S3 Vectors and MCP settings', () => {
  assert.deepEqual(MODELS, { openai: ['gpt-6-luna'], anthropic: ['claude-haiku-5-5'] });
  assert.deepEqual(EMBEDDING_MODELS, { openai: ['text-embedding-3-small'] });
  assert.equal(EMBEDDING_DIMENSIONS, 1536);

  const base = loadConfig(ENV);
  assert.equal(base.embeddingModel, 'text-embedding-3-small');
  assert.equal(base.evidenceBucket, undefined);
  assert.equal(base.vectorBucket, undefined);
  assert.equal(base.vectorIndex, undefined);
  assert.equal(base.mcpEndpoint, undefined);

  const full = loadConfig({
    ...ENV,
    EMBEDDING_MODEL: 'text-embedding-3-small',
    EVIDENCE_BUCKET_NAME: 'joshboyer-chat-dev-099256072947-us-east-2',
    VECTOR_BUCKET_NAME: 'joshboyer-chat-dev-vectors-us-east-2',
    VECTOR_INDEX_NAME: 'portfolio-public.v1_index-2026',
    MCP_ENDPOINT_URL: 'https://a1b2c3d4e5.execute-api.us-east-2.amazonaws.com/dev/api/chat/_mcp'
  });
  assert.equal(full.embeddingModel, 'text-embedding-3-small');
  assert.equal(full.evidenceBucket, 'joshboyer-chat-dev-099256072947-us-east-2');
  assert.equal(full.vectorBucket, 'joshboyer-chat-dev-vectors-us-east-2');
  assert.equal(full.vectorIndex, 'portfolio-public.v1_index-2026');
  assert.equal(full.mcpEndpoint, 'https://a1b2c3d4e5.execute-api.us-east-2.amazonaws.com/dev/api/chat/_mcp');

  const invalidConfigs: Array<Record<string, string>> = [
    { EMBEDDING_MODEL: 'text-embedding-ada-002' },
    { OPENAI_EMBEDDING_MODEL: 'text-embedding-3-large' },
    { EMBEDDING_MODEL: '' },
    { EVIDENCE_BUCKET_NAME: '' },
    { EVIDENCE_BUCKET_NAME: 'Upper-Case-Bucket' },
    { EVIDENCE_BUCKET_NAME: 'ab' },
    { EVIDENCE_BUCKET_NAME: 'bucket..traversal' },
    { VECTOR_BUCKET_NAME: 'bucket.with.dots' },
    { VECTOR_BUCKET_NAME: '-leading-hyphen' },
    { VECTOR_INDEX_NAME: 'index/with/slash' },
    { VECTOR_INDEX_NAME: 'index..dots' },
    { MCP_ENDPOINT_URL: 'http://a1b2c3d4e5.execute-api.us-east-2.amazonaws.com/dev/api/chat/_mcp' },
    { MCP_ENDPOINT_URL: 'https://a1b2c3d4e5.execute-api.us-east-1.amazonaws.com/dev/api/chat/_mcp' },
    { MCP_ENDPOINT_URL: 'https://evil.example.com/dev/api/chat/_mcp' },
    { MCP_ENDPOINT_URL: 'https://a1b2c3d4e5.execute-api.us-east-2.amazonaws.com/prod/api/chat/_mcp' }
  ];
  for (const bad of invalidConfigs) {
    assert.throws(() => loadConfig({ ...ENV, ...bad }), { code: 'CONFIGURATION_UNAVAILABLE' }, `Expected rejection for ${JSON.stringify(bad)}`);
  }
});

test('callEmbedding routes exclusively through Cloudflare AI Gateway with strict headers and 1536 float dimensions', async () => {
  let calls = 0;
  const vector = validVector(1);
  const result = await callEmbedding({
    config: CONFIG,
    apiKey: 'openai-test-key-0000000000000000',
    gatewayToken: 'gateway-test-key-0000000000000000',
    input: 'What did Josh build for claims history loading?',
    signal: new AbortController().signal
  }, async (url, init) => {
    calls++;
    assert.equal(String(url), `https://gateway.ai.cloudflare.com/v1/${CONFIG.gatewayAccountId}/${CONFIG.gatewayId}/openai/embeddings`);
    assert.equal(init?.method, 'POST');
    assert.equal(init?.redirect, 'error');
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('authorization'), 'Bearer openai-test-key-0000000000000000');
    assert.equal(headers.get('cf-aig-authorization'), 'Bearer gateway-test-key-0000000000000000');
    assert.equal(headers.get('cf-aig-no-wholesale'), 'true');
    assert.equal(headers.get('cf-aig-cache-ttl'), '0');
    assert.equal(headers.get('cf-aig-skip-cache'), 'true');
    assert.equal(headers.get('cf-aig-collect-log-payload'), 'false');
    assert.equal(headers.get('cf-aig-max-attempts'), '1');
    assert.equal(headers.get('cf-aig-request-timeout'), '15000');
    const rawHeaders = init?.headers as Record<string, string>;
    assert.equal(rawHeaders['cf-aig-Cache-Ttl'], '0');
    assert.equal(rawHeaders['cf-aig-Skip-Cache'], 'true');
    assert.equal(rawHeaders['cf-aig-Collect-Log-Payload'], 'false');
    assert.equal(rawHeaders['cf-aig-Max-Attempts'], '1');
    assert.equal(rawHeaders['cf-aig-Request-Timeout'], '15000');
    const body = JSON.parse(String(init?.body));
    assert.deepEqual(body, {
      model: 'text-embedding-3-small',
      input: 'What did Josh build for claims history loading?',
      dimensions: 1536,
      encoding_format: 'float'
    });
    return Response.json({
      object: 'list',
      model: 'text-embedding-3-small',
      data: [{ object: 'embedding', index: 0, embedding: vector }],
      usage: { prompt_tokens: 9, total_tokens: 9 }
    }, { headers: { 'x-request-id': 'emb-req-1', 'cf-aig-log-id': 'cf-emb-log-1' } });
  });

  assert.equal(calls, 1);
  assert.equal(result.model, 'text-embedding-3-small');
  assert.equal(result.dimensions, 1536);
  assert.deepEqual(result.embedding, vector);
  assert.deepEqual(result.embeddings, [vector]);
  assert.equal(result.usage.status, 'known');
  assert.equal(result.usage.promptTokens, 9);
  assert.equal(result.usage.totalTokens, 9);
  assert.equal(result.providerRequestId, 'emb-req-1');
  assert.equal(result.gatewayRequestId, 'cf-emb-log-1');
});

test('callEmbedding enforces 3-point UTF-8 input boundaries (8191/8192/8193 bytes and batch 31/32/33 & 65535/65536/65537 bytes)', async () => {
  const vector = validVector(2);
  const okFetch: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body)) as { input: string | string[] };
    const count = Array.isArray(body.input) ? body.input.length : 1;
    return Response.json({
      model: 'text-embedding-3-small',
      data: Array.from({ length: count }, (_, index) => {
        const itemIndex = count - 1 - index;
        return { index: itemIndex, embedding: validVector(itemIndex) };
      }),
      usage: { prompt_tokens: count * 10, total_tokens: count * 10 }
    });
  };

  for (const byteLen of [8191, 8192]) {
    // Include multi-byte UTF-8 ('é' is 2 bytes) to verify byte-length rather than char-length enforcement
    const input = 'é'.repeat(100) + 'a'.repeat(byteLen - 200);
    assert.equal(Buffer.byteLength(input, 'utf8'), byteLen);
    const res = await callEmbedding({
      config: CONFIG, apiKey: 'openai-test-key-0000000000000000', gatewayToken: 'gateway-test-key-0000000000000000', input
    }, okFetch);
    assert.equal(res.embedding.length, 1536);
  }

  let fetchCalls = 0;
  const overSingle = 'é'.repeat(100) + 'a'.repeat(8193 - 200);
  assert.equal(Buffer.byteLength(overSingle, 'utf8'), 8193);
  await assert.rejects(
    callEmbedding({
      config: CONFIG, apiKey: 'openai-test-key-0000000000000000', gatewayToken: 'gateway-test-key-0000000000000000', input: overSingle
    }, async () => { fetchCalls++; return Response.json({}); }),
    { code: 'INVALID_REQUEST', status: 400, chargeStatus: 'not_started' }
  );
  assert.equal(fetchCalls, 0);

  // Batch count 3-point boundary: 31, 32 pass; 33 and 0 fail before fetch
  for (const batchCount of [31, 32]) {
    const batch = Array.from({ length: batchCount }, (_, i) => `chunk-${i}`);
    const res = await callEmbedding({
      config: CONFIG, apiKey: 'openai-test-key-0000000000000000', gatewayToken: 'gateway-test-key-0000000000000000', input: batch
    }, okFetch);
    assert.equal(res.embeddings.length, batchCount);
    // Verify out-of-order response items were sorted by index
    assert.deepEqual(res.embeddings[0], validVector(0));
    assert.deepEqual(res.embeddings[batchCount - 1], validVector(batchCount - 1));
  }

  for (const badBatch of [[], Array.from({ length: 33 }, (_, i) => `chunk-${i}`)]) {
    await assert.rejects(
      callEmbedding({
        config: CONFIG, apiKey: 'openai-test-key-0000000000000000', gatewayToken: 'gateway-test-key-0000000000000000', input: badBatch
      }, async () => { fetchCalls++; return Response.json({}); }),
      { code: 'INVALID_REQUEST', status: 400, chargeStatus: 'not_started' }
    );
  }
  assert.equal(fetchCalls, 0);

  // Batch total UTF-8 byte boundary: 65535 and 65536 pass; 65537 fails
  const makeBatchOfTotalBytes = (totalBytes: number): string[] => {
    const items: string[] = [];
    let remaining = totalBytes;
    while (remaining > 0) {
      const size = Math.min(2048, remaining);
      items.push('x'.repeat(size));
      remaining -= size;
    }
    return items;
  };
  for (const totalBytes of [65535, 65536]) {
    const batch = makeBatchOfTotalBytes(totalBytes);
    assert.equal(batch.reduce((sum, s) => sum + Buffer.byteLength(s, 'utf8'), 0), totalBytes);
    const res = await callEmbedding({
      config: CONFIG, apiKey: 'openai-test-key-0000000000000000', gatewayToken: 'gateway-test-key-0000000000000000', input: batch
    }, okFetch);
    assert.equal(res.embeddings.length, batch.length);
  }
  const overBatch = makeBatchOfTotalBytes(65537);
  assert.equal(overBatch.reduce((sum, s) => sum + Buffer.byteLength(s, 'utf8'), 0), 65537);
  await assert.rejects(
    callEmbedding({
      config: CONFIG, apiKey: 'openai-test-key-0000000000000000', gatewayToken: 'gateway-test-key-0000000000000000', input: overBatch
    }, async () => { fetchCalls++; return Response.json({}); }),
    { code: 'INVALID_REQUEST', status: 400, chargeStatus: 'not_started' }
  );
  assert.equal(fetchCalls, 0);
  void vector;
});

test('callEmbedding enforces response byte caps, finite 1536-float vectors, usage normalization and canary non-leakage', async () => {
  const canary = 'CANARY-A06-SECRET-99182';
  const vector = validVector(3);
  const baseBody = JSON.stringify({
    model: 'text-embedding-3-small',
    data: [{ index: 0, embedding: vector }],
    usage: { prompt_tokens: 5, total_tokens: 5 }
  });

  // 3-point response byte cap for single query: 65535 and 65536 pass; 65537 fails
  for (const targetBytes of [65535, 65536]) {
    const padded = baseBody + ' '.repeat(targetBytes - Buffer.byteLength(baseBody, 'utf8'));
    assert.equal(Buffer.byteLength(padded, 'utf8'), targetBytes);
    const res = await callEmbedding({
      config: CONFIG, apiKey: 'openai-test-key-0000000000000000', gatewayToken: 'gateway-test-key-0000000000000000', input: 'valid query'
    }, async () => new Response(padded, { status: 200, headers: { 'content-length': String(targetBytes) } }));
    assert.equal(res.embedding.length, 1536);
  }

  const overResponse = baseBody + ' '.repeat(65537 - Buffer.byteLength(baseBody, 'utf8'));
  await assert.rejects(
    callEmbedding({
      config: CONFIG, apiKey: 'openai-test-key-0000000000000000', gatewayToken: 'gateway-test-key-0000000000000000', input: 'valid query'
    }, async () => new Response(overResponse, { status: 200 })),
    { code: 'PROVIDER_RESPONSE_INVALID', status: 502, chargeStatus: 'unknown' }
  );

  // Batch response byte cap: 524288 passes; 524289 fails
  const batchPadded = baseBody + ' '.repeat(524288 - Buffer.byteLength(baseBody, 'utf8'));
  const batchRes = await callEmbedding({
    config: CONFIG, apiKey: 'openai-test-key-0000000000000000', gatewayToken: 'gateway-test-key-0000000000000000', input: ['valid query']
  }, async () => new Response(batchPadded, { status: 200 }));
  assert.equal(batchRes.embeddings.length, 1);

  const batchOver = baseBody + ' '.repeat(524289 - Buffer.byteLength(baseBody, 'utf8'));
  await assert.rejects(
    callEmbedding({
      config: CONFIG, apiKey: 'openai-test-key-0000000000000000', gatewayToken: 'gateway-test-key-0000000000000000', input: ['valid query']
    }, async () => new Response(batchOver, { status: 200 })),
    { code: 'PROVIDER_RESPONSE_INVALID', status: 502, chargeStatus: 'unknown' }
  );

  // Reject wrong dimension count, NaN/Infinity/non-numbers, wrong model, missing data, duplicate batch index
  const badPayloads: unknown[] = [
    { model: 'text-embedding-ada-002', data: [{ index: 0, embedding: vector }], usage: { prompt_tokens: 5, total_tokens: 5 } },
    { model: 'text-embedding-3-small', data: [{ index: 0, embedding: vector.slice(0, 1535) }], usage: { prompt_tokens: 5, total_tokens: 5 } },
    { model: 'text-embedding-3-small', data: [{ index: 0, embedding: [...vector, 0.1] }], usage: { prompt_tokens: 5, total_tokens: 5 } },
    { model: 'text-embedding-3-small', data: [{ index: 0, embedding: [null, ...vector.slice(1)] }], usage: { prompt_tokens: 5, total_tokens: 5 } },
    { model: 'text-embedding-3-small', data: [{ index: 0, embedding: ['0.1', ...vector.slice(1)] }], usage: { prompt_tokens: 5, total_tokens: 5 } },
    { model: 'text-embedding-3-small', data: [], usage: { prompt_tokens: 5, total_tokens: 5 } }
  ];
  for (const payload of badPayloads) {
    await assert.rejects(
      callEmbedding({
        config: CONFIG, apiKey: 'openai-test-key-0000000000000000', gatewayToken: 'gateway-test-key-0000000000000000', input: 'valid query'
      }, async () => Response.json(payload)),
      { code: 'PROVIDER_RESPONSE_INVALID', status: 502, chargeStatus: 'unknown' }
    );
  }

  // Raw JSON 1e309 / -1e309 parses to Infinity / -Infinity in V8; must be rejected by Number.isFinite
  for (const nonFiniteLiteral of ['1e309', '-1e309']) {
    const rawInfiniteJson = `{"model":"text-embedding-3-small","data":[{"index":0,"embedding":[${nonFiniteLiteral},${vector.slice(1).join(',')}]}],"usage":{"prompt_tokens":5,"total_tokens":5}}`;
    await assert.rejects(
      callEmbedding({
        config: CONFIG, apiKey: 'openai-test-key-0000000000000000', gatewayToken: 'gateway-test-key-0000000000000000', input: 'valid query'
      }, async () => new Response(rawInfiniteJson, { status: 200 })),
      { code: 'PROVIDER_RESPONSE_INVALID', status: 502, chargeStatus: 'unknown' }
    );
  }

  // Duplicate index in batch response must fail closed
  await assert.rejects(
    callEmbedding({
      config: CONFIG, apiKey: 'openai-test-key-0000000000000000', gatewayToken: 'gateway-test-key-0000000000000000', input: ['first', 'second']
    }, async () => Response.json({
      model: 'text-embedding-3-small',
      data: [{ index: 0, embedding: vector }, { index: 0, embedding: vector }],
      usage: { prompt_tokens: 10, total_tokens: 10 }
    })),
    { code: 'PROVIDER_RESPONSE_INVALID', status: 502, chargeStatus: 'unknown' }
  );

  // Usage normalization on HTTP 200: missing or invalid usage sets status = 'unknown'
  for (const badUsage of [undefined, {}, { prompt_tokens: 5 }, { prompt_tokens: 5, total_tokens: 6 }, { prompt_tokens: 0, total_tokens: 0 }, { prompt_tokens: -1, total_tokens: -1 }]) {
    const res = await callEmbedding({
      config: CONFIG, apiKey: 'openai-test-key-0000000000000000', gatewayToken: 'gateway-test-key-0000000000000000', input: 'valid query'
    }, async () => Response.json({ model: 'text-embedding-3-small', data: [{ index: 0, embedding: vector }], usage: badUsage }));
    assert.equal(res.usage.status, 'unknown');
    assert.equal(res.usage.totalTokens, null);
    assert.equal(res.usage.promptTokens, null);
  }
  assert.equal(normaliseEmbeddingUsage({ prompt_tokens: 12, total_tokens: 12 }).status, 'known');

  // Canary non-leakage in errors and receipts
  await assert.rejects(
    callEmbedding({
      config: CONFIG, apiKey: `key-${canary}-00000000`, gatewayToken: `gw-${canary}-00000000`, input: `Query with ${canary}`
    }, async () => new Response(`Upstream error ${canary}`, { status: 500, headers: { 'x-request-id': `bad header ${canary}` } })),
    error => {
      assert.ok(!JSON.stringify(error).includes(canary));
      assert.ok(!String(error).includes(canary));
      const receipt = embeddingReceipt('req-1', 15, error, true);
      assert.ok(!JSON.stringify(receipt).includes(canary));
      return true;
    }
  );
  const okReceipt = embeddingReceipt('req-1', 10, batchRes, true);
  assert.ok(!JSON.stringify(okReceipt).includes(String(vector[0])));
});

test('callChatProvider normalizes explicit safety refusals from both OpenAI and Anthropic without echoing provider refusal text', async () => {
  const canary = 'CANARY-A06-SECRET-99182';
  for (const provider of ['openai', 'anthropic'] as const) {
    const res = await callChatProvider({
      provider,
      config: CONFIG,
      providerKey: 'provider-test-key-000000000000',
      gatewayKey: 'gateway-test-key-000000000000',
      userContext: '{"question":"test"}',
      signal: new AbortController().signal,
      fetchImpl: async () => Response.json(provider === 'openai' ? {
        model: CONFIG.models.openai,
        status: 'completed',
        output: [{ type: 'message', content: [{ type: 'refusal', refusal: `Provider secret refusal ${canary}` }] }],
        usage: { input_tokens: 12, output_tokens: 4, total_tokens: 16 }
      } : {
        model: CONFIG.models.anthropic,
        stop_reason: 'refusal',
        content: [{ type: 'text', text: `Anthropic refusal ${canary}` }],
        usage: { input_tokens: 12, output_tokens: 4 }
      })
    });
    const parsed = JSON.parse(res.text) as { kind: string; text: string; claimIds: string[] };
    assert.equal(parsed.kind, 'refusal');
    assert.deepEqual(parsed.claimIds, []);
    assert.ok(!res.text.includes(canary));
  }
});
