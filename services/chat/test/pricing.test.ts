import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClient,
  ScanCommand
} from '@aws-sdk/client-dynamodb';
import { INPUT_TOKEN_ALLOWANCE, MAX_OUTPUT_TOKENS } from '../src/cag.js';
import { normaliseEmbeddingUsage, type EmbeddingUsage } from '../src/chat-provider.js';
import { normaliseUsage, type Usage } from '../src/provider.js';
import { AwsChatState } from '../src/state.js';
import { validateSettlement } from '../src/trace.js';
import {
  EMBEDDING_RATE_MICROS_PER_1K,
  EMBEDDING_TOKEN_ALLOWANCE,
  MAX_EMBEDDING_RESERVATION_MICROS,
  MAX_GENERATION_RESERVATION_MICROS,
  MAX_INGESTION_CALLS,
  MAX_INGESTION_CHUNKS,
  MAX_INGESTION_RESERVATION_MICROS,
  MAX_INGESTION_UTF8_BYTES,
  MAX_OPENAI_TURN_RESERVATION_MICROS,
  MAX_PROVIDER_RESERVATION_MICROS,
  MAX_TURN_RESERVATION_MICROS,
  PHASE4_PRICE_VERSION,
  PRICE_VERSION,
  embeddingUsageAllowance,
  estimateIngestionAllowance,
  planTurnReservation,
  reserveCosts,
  settleTurnCharges,
  usageAllowance
} from '../src/chat-pricing.js';
import * as budgetPolicy from '../src/budget-policy.js';

const dynamoEndpoint = process.env.CHAT_TEST_DYNAMODB_ENDPOINT ?? 'http://127.0.0.1:8008';
if (!/^http:\/\/127\.0\.0\.1:\d{2,5}$/.test(dynamoEndpoint)) {
  throw new Error('CHAT_TEST_DYNAMODB_ENDPOINT must be loopback HTTP.');
}
const dynamoClient = new DynamoDBClient({
  endpoint: dynamoEndpoint,
  region: 'us-east-2',
  maxAttempts: 1,
  credentials: { accessKeyId: 'localonly', secretAccessKey: 'localonly' }
});
test.after(() => dynamoClient.destroy());

function knownGenUsage(inputTokens: number, outputTokens: number): Usage {
  return normaliseUsage('openai', {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: inputTokens + outputTokens
  });
}

function knownEmbUsage(tokens: number): EmbeddingUsage {
  if (tokens === 0) {
    return { status: 'known', promptTokens: 0, inputTokens: 0, totalTokens: 0 };
  }
  return normaliseEmbeddingUsage({ prompt_tokens: tokens, total_tokens: tokens });
}

test('chat-pricing re-exports budget-policy and preserves 100% backwards compatibility with Phase 3 constants and callers', () => {
  assert.equal(PRICE_VERSION, '2026-10-31-standard-conversation-v2');
  assert.equal(PHASE4_PRICE_VERSION, '2026-10-31-phase4-rag-mcp-v1');
  assert.equal(MAX_PROVIDER_RESERVATION_MICROS, 10_804);
  assert.equal(MAX_GENERATION_RESERVATION_MICROS, 10_804);
  assert.equal(EMBEDDING_TOKEN_ALLOWANCE, 8_192);
  assert.equal(EMBEDDING_RATE_MICROS_PER_1K, 32);
  assert.equal(MAX_EMBEDDING_RESERVATION_MICROS, 256);
  assert.equal(MAX_OPENAI_TURN_RESERVATION_MICROS, 11_060);
  assert.equal(MAX_TURN_RESERVATION_MICROS, 21_864);
  assert.equal(MAX_INGESTION_CHUNKS, 64);
  assert.equal(MAX_INGESTION_UTF8_BYTES, 65_536);
  assert.equal(MAX_INGESTION_CALLS, 2);
  assert.equal(MAX_INGESTION_RESERVATION_MICROS, 512);

  assert.equal(budgetPolicy.PRICE_VERSION, PRICE_VERSION);
  assert.equal(budgetPolicy.PHASE4_PRICE_VERSION, PHASE4_PRICE_VERSION);
  assert.equal(budgetPolicy.planTurnReservation, planTurnReservation);
  assert.equal(budgetPolicy.settleTurnCharges, settleTurnCharges);
  assert.equal(budgetPolicy.embeddingUsageAllowance, embeddingUsageAllowance);
  assert.equal(budgetPolicy.estimateIngestionAllowance, estimateIngestionAllowance);

  assert.deepEqual(reserveCosts(['openai', 'anthropic']), { openai: 10_804, anthropic: 10_804 });
  assert.deepEqual(reserveCosts(['openai']), { openai: 10_804, anthropic: 0 });
  assert.deepEqual(reserveCosts(['anthropic']), { openai: 0, anthropic: 10_804 });
  assert.deepEqual(reserveCosts(['openai', 'anthropic'], { needsEmbedding: true }), { openai: 11_060, anthropic: 10_804 });
});

test('planTurnReservation computes exact multi-component reservations for cag_only (21,608) and rag/rag_and_mcp (21,864)', () => {
  const cagPlan = planTurnReservation({ needsEmbedding: false });
  assert.deepEqual(cagPlan, {
    reservations: { openai: 10_804, anthropic: 10_804 },
    reservationComponents: {
      embeddingMicros: 0,
      openaiGenerationMicros: 10_804,
      anthropicGenerationMicros: 10_804
    },
    totalReservedMicros: 21_608,
    priceVersion: PHASE4_PRICE_VERSION
  });

  const ragPlan = planTurnReservation({ needsEmbedding: true });
  assert.deepEqual(ragPlan, {
    reservations: { openai: 11_060, anthropic: 10_804 },
    reservationComponents: {
      embeddingMicros: 256,
      openaiGenerationMicros: 10_804,
      anthropicGenerationMicros: 10_804
    },
    totalReservedMicros: 21_864,
    priceVersion: PHASE4_PRICE_VERSION
  });

  const openaiOnlyRag = planTurnReservation({ providers: ['openai'], needsEmbedding: true });
  assert.deepEqual(openaiOnlyRag, {
    reservations: { openai: 11_060, anthropic: 0 },
    reservationComponents: {
      embeddingMicros: 256,
      openaiGenerationMicros: 10_804,
      anthropicGenerationMicros: 0
    },
    totalReservedMicros: 11_060,
    priceVersion: PHASE4_PRICE_VERSION
  });

  const anthropicPrimaryRag = planTurnReservation({ providers: ['anthropic'], needsEmbedding: true });
  assert.deepEqual(anthropicPrimaryRag, {
    reservations: { openai: 256, anthropic: 10_804 },
    reservationComponents: {
      embeddingMicros: 256,
      openaiGenerationMicros: 0,
      anthropicGenerationMicros: 10_804
    },
    totalReservedMicros: 11_060,
    priceVersion: PHASE4_PRICE_VERSION
  });
});

test('embeddingUsageAllowance and usageAllowance enforce 3-point token boundaries and retain full reservation on unknown/excessive usage', () => {
  // Undispatched embedding always charges 0
  assert.equal(embeddingUsageAllowance(knownEmbUsage(500), false), 0);
  assert.equal(embeddingUsageAllowance(undefined, false), 0);
  assert.equal(embeddingUsageAllowance(null, false), 0);

  // Dispatched embedding 3-point boundaries at 0, 8191, 8192, 8193 and intermediate rates
  assert.equal(embeddingUsageAllowance({ status: 'known', inputTokens: -1, promptTokens: -1, totalTokens: -1 }, true), 256);
  assert.equal(embeddingUsageAllowance(knownEmbUsage(0), true), 1);
  assert.equal(embeddingUsageAllowance(knownEmbUsage(1), true), 1);
  assert.equal(embeddingUsageAllowance(knownEmbUsage(31), true), 1);
  assert.equal(embeddingUsageAllowance(knownEmbUsage(32), true), 2);
  assert.equal(embeddingUsageAllowance(knownEmbUsage(100), true), 4);
  assert.equal(embeddingUsageAllowance(knownEmbUsage(7968), true), 255);
  assert.equal(embeddingUsageAllowance(knownEmbUsage(8000), true), 256);
  assert.equal(embeddingUsageAllowance(knownEmbUsage(8191), true), 256);
  assert.equal(embeddingUsageAllowance(knownEmbUsage(8192), true), 256);
  assert.equal(embeddingUsageAllowance(knownEmbUsage(8193), true), 256);

  // Dispatched embedding with unknown, null, float, NaN, Infinity or mismatched usage retains full 256 micro-USD (SR-5)
  for (const invalidEmb of [
    undefined,
    null,
    { status: 'unknown' as const, inputTokens: 10, promptTokens: 10, totalTokens: 10 },
    { status: 'known' as const, inputTokens: null, promptTokens: 10, totalTokens: 10 },
    { status: 'known' as const, inputTokens: 10.5, promptTokens: 10.5, totalTokens: 10.5 },
    { status: 'known' as const, inputTokens: Number.NaN, promptTokens: Number.NaN, totalTokens: Number.NaN },
    { status: 'known' as const, inputTokens: Number.POSITIVE_INFINITY, promptTokens: null, totalTokens: null },
    { status: 'known' as const, inputTokens: 10, promptTokens: 12, totalTokens: 10 },
    { status: 'known' as const, inputTokens: 10, promptTokens: 10, totalTokens: 12 }
  ]) {
    assert.equal(embeddingUsageAllowance(invalidEmb, true), MAX_EMBEDDING_RESERVATION_MICROS);
  }

  // Generation input token 3-point boundary: INPUT_TOKEN_ALLOWANCE - 1 (50,175), INPUT_TOKEN_ALLOWANCE (50,176), INPUT_TOKEN_ALLOWANCE + 1 (50,177)
  assert.equal(INPUT_TOKEN_ALLOWANCE, 50_176);
  assert.equal(usageAllowance(knownGenUsage(INPUT_TOKEN_ALLOWANCE - 1, 0)), 10_035);
  assert.equal(usageAllowance(knownGenUsage(INPUT_TOKEN_ALLOWANCE, 0)), 10_036);
  assert.equal(usageAllowance(knownGenUsage(INPUT_TOKEN_ALLOWANCE + 1, 0)), MAX_PROVIDER_RESERVATION_MICROS);

  assert.equal(usageAllowance(knownGenUsage(INPUT_TOKEN_ALLOWANCE - 1, MAX_OUTPUT_TOKENS)), 10_803);
  assert.equal(usageAllowance(knownGenUsage(INPUT_TOKEN_ALLOWANCE, MAX_OUTPUT_TOKENS)), 10_804);
  assert.equal(usageAllowance(knownGenUsage(INPUT_TOKEN_ALLOWANCE + 1, MAX_OUTPUT_TOKENS)), 10_804);

  // Generation output token 3-point boundary: MAX_OUTPUT_TOKENS - 1 (1,535), MAX_OUTPUT_TOKENS (1,536), MAX_OUTPUT_TOKENS + 1 (1,537)
  assert.equal(MAX_OUTPUT_TOKENS, 1_536);
  assert.equal(usageAllowance(knownGenUsage(0, MAX_OUTPUT_TOKENS - 1)), 768);
  assert.equal(usageAllowance(knownGenUsage(0, MAX_OUTPUT_TOKENS)), 768);
  assert.equal(usageAllowance(knownGenUsage(0, MAX_OUTPUT_TOKENS + 1)), MAX_PROVIDER_RESERVATION_MICROS);

  // Invalid or unknown generation usage retains 10,804 micro-USD
  assert.equal(usageAllowance(normaliseUsage('openai', {})), MAX_PROVIDER_RESERVATION_MICROS);
  assert.equal(usageAllowance(normaliseUsage('openai', { input_tokens: -1, output_tokens: 1, total_tokens: 0 })), MAX_PROVIDER_RESERVATION_MICROS);
});

test('settleTurnCharges enforces SR-3 through SR-7 across all 5 turn settlement scenarios plus refusal-without-fallback', () => {
  // Scenario 1: cag_only primary success (embeddingDispatched: false, OpenAI known usage -> Anthropic refunded 10,804)
  const cagPlan = planTurnReservation({ needsEmbedding: false });
  const s1 = settleTurnCharges({
    plan: cagPlan,
    embeddingDispatched: false,
    attempts: [
      { provider: 'openai', dispatched: true, usage: knownGenUsage(100, 10) },
      { provider: 'anthropic', dispatched: false }
    ]
  });
  assert.deepEqual(s1.actualCosts, { openai: 25, anthropic: 0 });
  assert.deepEqual(s1.refunds, { openai: 10_779, anthropic: 10_804 });
  assert.deepEqual(s1.chargeComponents, {
    embeddingMicros: 0,
    generationMicros: 25,
    mcpCalls: 0,
    retrievalMatched: 0
  });
  assert.equal(s1.totalReservedMicros, 21_608);
  assert.equal(s1.totalChargedMicros, 25);
  assert.equal(s1.totalRefundedMicros, 21_583);
  assert.deepEqual(s1.settlement, {
    reservedMicros: 21_608,
    chargedMicros: 25,
    priceVersion: PHASE4_PRICE_VERSION
  });

  // Scenario 2: rag_and_mcp primary success (embeddingDispatched: true known usage + OpenAI known usage -> unused OpenAI + all Anthropic refunded)
  const ragPlan = planTurnReservation({ needsEmbedding: true });
  const s2 = settleTurnCharges({
    plan: ragPlan,
    embeddingDispatched: true,
    embeddingUsage: knownEmbUsage(50), // ceil(50 * 32 / 1000) = 2 micro-USD
    attempts: [
      { provider: 'openai', dispatched: true, usage: knownGenUsage(1_000, 200) }, // ceil((1000*200 + 200*500)/1000) = 300 micro-USD
      { provider: 'anthropic', dispatched: false }
    ],
    mcpCalls: 2,
    retrievalMatched: 4
  });
  assert.deepEqual(s2.actualCosts, { openai: 302, anthropic: 0 });
  assert.deepEqual(s2.refunds, { openai: 10_758, anthropic: 10_804 });
  assert.deepEqual(s2.chargeComponents, {
    embeddingMicros: 2,
    generationMicros: 300,
    mcpCalls: 2,
    retrievalMatched: 4
  });
  assert.equal(s2.totalReservedMicros, 21_864);
  assert.equal(s2.totalChargedMicros, 302);
  assert.equal(s2.totalRefundedMicros, 21_562);

  // Scenario 3: Embedding fails with timeout (embeddingDispatched: true, usage: undefined) before generation is dispatched
  const s3 = settleTurnCharges({
    plan: ragPlan,
    embeddingDispatched: true,
    embeddingUsage: undefined,
    attempts: [
      { provider: 'openai', dispatched: false },
      { provider: 'anthropic', dispatched: false }
    ],
    mcpCalls: 0,
    retrievalMatched: 0
  });
  assert.deepEqual(s3.actualCosts, { openai: 256, anthropic: 0 });
  assert.deepEqual(s3.refunds, { openai: 10_804, anthropic: 10_804 });
  assert.deepEqual(s3.chargeComponents, {
    embeddingMicros: 256,
    generationMicros: 0,
    mcpCalls: 0,
    retrievalMatched: 0
  });
  assert.equal(s3.totalChargedMicros, 256);
  assert.equal(s3.totalRefundedMicros, 21_608);

  // Scenario 4a: Primary generation fails with unknown usage + fallback succeeds with known usage (known embedding usage)
  const s4 = settleTurnCharges({
    plan: ragPlan,
    embeddingDispatched: true,
    embeddingUsage: knownEmbUsage(50), // 2 micro-USD
    attempts: [
      { provider: 'openai', dispatched: true, usage: undefined }, // retains 10,804 micro-USD
      { provider: 'anthropic', dispatched: true, usage: knownGenUsage(100, 10) } // 25 micro-USD
    ],
    mcpCalls: 1,
    retrievalMatched: 3
  });
  assert.deepEqual(s4.actualCosts, { openai: 10_806, anthropic: 25 });
  assert.deepEqual(s4.refunds, { openai: 254, anthropic: 10_779 });
  assert.deepEqual(s4.chargeComponents, {
    embeddingMicros: 2,
    generationMicros: 10_829,
    mcpCalls: 1,
    retrievalMatched: 3
  });
  assert.equal(s4.totalChargedMicros, 10_831);
  assert.equal(s4.totalRefundedMicros, 11_033);

  // Scenario 4b: Primary generation fails with unknown usage + fallback succeeds with known usage (retained 256 embedding usage)
  const s4b = settleTurnCharges({
    plan: ragPlan,
    embeddingDispatched: true,
    embeddingUsage: undefined, // retains 256 micro-USD
    attempts: [
      { provider: 'openai', dispatched: true, usage: undefined }, // retains 10,804 micro-USD
      { provider: 'anthropic', dispatched: true, usage: knownGenUsage(100, 10) } // 25 micro-USD
    ],
    mcpCalls: 1,
    retrievalMatched: 3
  });
  assert.deepEqual(s4b.actualCosts, { openai: 11_060, anthropic: 25 });
  assert.deepEqual(s4b.refunds, { openai: 0, anthropic: 10_779 });
  assert.deepEqual(s4b.chargeComponents, {
    embeddingMicros: 256,
    generationMicros: 10_829,
    mcpCalls: 1,
    retrievalMatched: 3
  });
  assert.equal(s4b.totalChargedMicros, 11_085);
  assert.equal(s4b.totalRefundedMicros, 10_779);

  // Scenario 5: Both providers (and embedding) fail with unknown usage -> retains full 21,864 micro-USD (0 refund)
  const s5 = settleTurnCharges({
    plan: ragPlan,
    embeddingDispatched: true,
    embeddingUsage: null,
    attempts: [
      { provider: 'openai', dispatched: true, usage: null },
      { provider: 'anthropic', dispatched: true, usage: normaliseUsage('anthropic', {}) }
    ],
    mcpCalls: 2,
    retrievalMatched: 0
  });
  assert.deepEqual(s5.actualCosts, { openai: 11_060, anthropic: 10_804 });
  assert.deepEqual(s5.refunds, { openai: 0, anthropic: 0 });
  assert.deepEqual(s5.chargeComponents, {
    embeddingMicros: 256,
    generationMicros: 21_608,
    mcpCalls: 2,
    retrievalMatched: 0
  });
  assert.equal(s5.totalChargedMicros, 21_864);
  assert.equal(s5.totalRefundedMicros, 0);

  // Scenario 6: Primary safety refusal settles primary actual usage and refunds 100% of undispatched fallback
  const s6 = settleTurnCharges({
    plan: ragPlan,
    embeddingDispatched: true,
    embeddingUsage: knownEmbUsage(12), // 1 micro-USD
    attempts: [
      { provider: 'openai', dispatched: true, usage: knownGenUsage(12, 4) }, // ceil((12*200 + 4*500)/1000) = 5 micro-USD
      { provider: 'anthropic', dispatched: false }
    ]
  });
  assert.deepEqual(s6.actualCosts, { openai: 6, anthropic: 0 });
  assert.deepEqual(s6.refunds, { openai: 11_054, anthropic: 10_804 });
  assert.equal(s6.totalChargedMicros, 6);
  assert.equal(s6.totalRefundedMicros, 21_858);
});

test('estimateIngestionAllowance validates 3-point boundaries for chunkCount (1..64), totalUtf8Bytes (1..65536), and maxCalls (1..2)', () => {
  // Canonical 14-chunk manifest estimate
  const canonical = estimateIngestionAllowance({ chunkCount: 14, totalUtf8Bytes: 18_400 });
  assert.equal(canonical.chunkCount, 14);
  assert.equal(canonical.totalUtf8Bytes, 18_400);
  assert.equal(canonical.requiredCalls, 1);
  assert.equal(canonical.maxCalls, 1);
  assert.equal(canonical.reservedMicros, 256);
  assert.equal(canonical.maxAllowedMicros, 512);
  assert.ok(canonical.estimatedMicros >= 1 && canonical.estimatedMicros <= 256);
  assert.equal(canonical.priceVersion, PHASE4_PRICE_VERSION);

  // chunkCount 3-point boundaries: 0 fails; 1, 32, 33, 63, 64 pass; 65 fails
  for (const validChunks of [1, 32, 33, 63, 64]) {
    const est = estimateIngestionAllowance({ chunkCount: validChunks, totalUtf8Bytes: 2_048 });
    assert.equal(est.chunkCount, validChunks);
    assert.equal(est.requiredCalls, validChunks <= 32 ? 1 : 2);
    assert.ok(est.estimatedMicros >= 1 && est.estimatedMicros <= 512);
    assert.ok(est.reservedMicros <= 512);
  }
  for (const invalidChunks of [-1, 0, 65, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => estimateIngestionAllowance({ chunkCount: invalidChunks, totalUtf8Bytes: 1_024 }),
      { code: 'INVALID_REQUEST', status: 400 }
    );
  }

  // totalUtf8Bytes 3-point boundaries: 0 fails; 1, 65535, 65536 pass; 65537 fails
  for (const validBytes of [1, 65_535, 65_536]) {
    const est = estimateIngestionAllowance({ chunkCount: 32, totalUtf8Bytes: validBytes, maxCalls: 2 });
    assert.equal(est.totalUtf8Bytes, validBytes);
    assert.ok(est.estimatedMicros >= 1 && est.estimatedMicros <= 512);
    assert.equal(est.reservedMicros, 512);
  }
  for (const invalidBytes of [-1, 0, 65_537, 100.25, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => estimateIngestionAllowance({ chunkCount: 14, totalUtf8Bytes: invalidBytes }),
      { code: 'INVALID_REQUEST', status: 400 }
    );
  }

  // maxCalls 3-point boundaries: 0 fails; 1, 2 pass; 3 fails; 33 chunks with maxCalls: 1 fails closed
  assert.equal(estimateIngestionAllowance({ chunkCount: 32, totalUtf8Bytes: 4_096, maxCalls: 1 }).reservedMicros, 256);
  assert.equal(estimateIngestionAllowance({ chunkCount: 64, totalUtf8Bytes: 65_536, maxCalls: 2 }).reservedMicros, 512);
  for (const badCalls of [-1, 0, 3, 1.5, Number.NaN]) {
    assert.throws(
      () => estimateIngestionAllowance({ chunkCount: 14, totalUtf8Bytes: 4_096, maxCalls: badCalls }),
      { code: 'INVALID_REQUEST', status: 400 }
    );
  }
  assert.throws(
    () => estimateIngestionAllowance({ chunkCount: 33, totalUtf8Bytes: 4_096, maxCalls: 1 }),
    { code: 'INVALID_REQUEST', status: 400 }
  );
});

test('adversarial inputs, unreserved dispatch, prototype tricks, throwing getters and canaries fail closed without leaking secrets', () => {
  const canary = 'CANARY-A13-SECRET-7812c409';
  const ragPlan = planTurnReservation({ needsEmbedding: true });
  const cagPlan = planTurnReservation({ needsEmbedding: false });

  // Throwing getter on usage objects must not throw or leak canary; must retain full reservation
  const throwingUsage = {};
  Object.defineProperty(throwingUsage, 'status', {
    enumerable: true,
    get() {
      throw new Error(`Getter explosion ${canary}`);
    }
  });
  assert.equal(usageAllowance(throwingUsage as Usage), MAX_PROVIDER_RESERVATION_MICROS);
  assert.equal(embeddingUsageAllowance(throwingUsage as EmbeddingUsage, true), MAX_EMBEDDING_RESERVATION_MICROS);

  const proxyUsage = new Proxy(knownGenUsage(10, 5), {});
  assert.equal(usageAllowance(proxyUsage), MAX_PROVIDER_RESERVATION_MICROS);
  const proxyEmb = new Proxy(knownEmbUsage(10), {});
  assert.equal(embeddingUsageAllowance(proxyEmb, true), MAX_EMBEDDING_RESERVATION_MICROS);

  // Unreserved embedding dispatch on cag_only plan must fail closed (SR-1)
  assert.throws(
    () =>
      settleTurnCharges({
        plan: cagPlan,
        embeddingDispatched: true,
        embeddingUsage: knownEmbUsage(10),
        attempts: [{ provider: 'openai', dispatched: true, usage: knownGenUsage(10, 5) }]
      }),
    { code: 'INVALID_REQUEST', status: 400 }
  );

  // Unreserved provider generation dispatch must fail closed (SR-1)
  const openaiOnlyPlan = planTurnReservation({ providers: ['openai'], needsEmbedding: false });
  assert.throws(
    () =>
      settleTurnCharges({
        plan: openaiOnlyPlan,
        embeddingDispatched: false,
        attempts: [{ provider: 'anthropic', dispatched: true, usage: knownGenUsage(10, 5) }]
      }),
    { code: 'INVALID_REQUEST', status: 400 }
  );

  // Duplicate provider in attempts must fail closed
  assert.throws(
    () =>
      settleTurnCharges({
        plan: ragPlan,
        embeddingDispatched: false,
        attempts: [
          { provider: 'openai', dispatched: true, usage: knownGenUsage(10, 5) },
          { provider: 'openai', dispatched: true, usage: knownGenUsage(10, 5) }
        ]
      }),
    { code: 'INVALID_REQUEST', status: 400 }
  );

  // Tampered reservation plan or hostile options must fail closed without leaking canary
  const hostilePlan = JSON.parse(`{"reservations":{"openai":100,"anthropic":100},"reservationComponents":{"embeddingMicros":256,"openaiGenerationMicros":10804,"anthropicGenerationMicros":10804},"totalReservedMicros":200,"priceVersion":"${canary}"}`) as typeof ragPlan;
  assert.throws(
    () => settleTurnCharges({ plan: hostilePlan, embeddingDispatched: false, attempts: [] }),
    error => {
      assert.ok(!JSON.stringify(error).includes(canary));
      assert.ok(!String(error).includes(canary));
      return true;
    }
  );

  for (const badOptions of [
    null,
    undefined,
    new Proxy({ needsEmbedding: true }, {}),
    JSON.parse('{"needsEmbedding":true,"__proto__":{"polluted":true}}'),
    { needsEmbedding: 'yes' },
    { needsEmbedding: false, providers: [] },
    { needsEmbedding: false, providers: ['openai', 'openai'] },
    { needsEmbedding: false, providers: [`aws_admin_${canary}`] }
  ]) {
    assert.throws(
      () => planTurnReservation(badOptions as never),
      error => {
        assert.ok(!JSON.stringify(error).includes(canary));
        assert.ok(!String(error).includes(canary));
        return true;
      }
    );
  }
});

test('seeded property/fuzz test (seed=0x20261031) across 250 random usage combinations proves budget invariants', () => {
  let state = 0x20261031 >>> 0;
  const nextUint32 = (): number => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  };
  const nextInt = (min: number, max: number): number => min + (nextUint32() % (max - min + 1));

  for (let i = 0; i < 250; i++) {
    const needsEmbedding = (nextUint32() & 1) === 1;
    const providerMode = nextUint32() % 3;
    const providers =
      providerMode === 0 ? (['openai', 'anthropic'] as const) : providerMode === 1 ? (['openai'] as const) : (['anthropic'] as const);
    const plan = planTurnReservation({ providers, needsEmbedding });

    const embeddingDispatched = needsEmbedding ? (nextUint32() & 1) === 1 : false;
    const embRoll = nextUint32() % 6;
    const embeddingUsage: EmbeddingUsage | null | undefined =
      embRoll === 0
        ? undefined
        : embRoll === 1
          ? null
          : embRoll === 2
            ? { status: 'unknown', promptTokens: null, inputTokens: null, totalTokens: null }
            : embRoll === 3
              ? knownEmbUsage(nextInt(0, EMBEDDING_TOKEN_ALLOWANCE))
              : embRoll === 4
                ? knownEmbUsage(nextInt(EMBEDDING_TOKEN_ALLOWANCE + 1, EMBEDDING_TOKEN_ALLOWANCE + 5000))
                : { status: 'known', promptTokens: -5, inputTokens: -5, totalTokens: -5 };

    const attempts = providers.map(provider => {
      const dispatched = (nextUint32() & 1) === 1;
      const uRoll = nextUint32() % 6;
      const usage: Usage | null | undefined =
        uRoll === 0
          ? undefined
          : uRoll === 1
            ? null
            : uRoll === 2
              ? normaliseUsage(provider, {})
              : uRoll === 3
                ? knownGenUsage(nextInt(0, INPUT_TOKEN_ALLOWANCE), nextInt(0, MAX_OUTPUT_TOKENS))
                : uRoll === 4
                  ? knownGenUsage(nextInt(INPUT_TOKEN_ALLOWANCE + 1, INPUT_TOKEN_ALLOWANCE + 10_000), nextInt(0, MAX_OUTPUT_TOKENS + 500))
                  : knownGenUsage(0, MAX_OUTPUT_TOKENS + nextInt(1, 2_000));
      return { provider, dispatched, usage };
    });

    const mcpCalls = nextInt(0, 4);
    const retrievalMatched = nextInt(0, 14);
    const settled = settleTurnCharges({
      plan,
      embeddingDispatched,
      embeddingUsage,
      attempts,
      mcpCalls,
      retrievalMatched
    });

    for (const provider of ['openai', 'anthropic'] as const) {
      const actual = settled.actualCosts[provider];
      const refund = settled.refunds[provider];
      const reserved = plan.reservations[provider];
      assert.equal(Number.isSafeInteger(actual), true, `iter=${i} provider=${provider} actual not integer`);
      assert.equal(Number.isSafeInteger(refund), true, `iter=${i} provider=${provider} refund not integer`);
      assert.ok(actual >= 0 && actual <= reserved, `iter=${i} provider=${provider} actual=${actual} reserved=${reserved}`);
      assert.ok(refund >= 0 && refund <= reserved, `iter=${i} provider=${provider} refund=${refund} reserved=${reserved}`);
      assert.equal(actual + refund, reserved, `iter=${i} provider=${provider} conservation failed`);
    }

    assert.equal(Number.isSafeInteger(settled.totalChargedMicros), true);
    assert.equal(Number.isSafeInteger(settled.totalRefundedMicros), true);
    assert.equal(settled.totalChargedMicros, settled.actualCosts.openai + settled.actualCosts.anthropic);
    assert.equal(settled.totalRefundedMicros, settled.refunds.openai + settled.refunds.anthropic);
    assert.equal(settled.totalChargedMicros + settled.totalRefundedMicros, plan.totalReservedMicros);
    assert.equal(settled.chargeComponents.embeddingMicros + settled.chargeComponents.generationMicros, settled.totalChargedMicros);
    assert.equal(settled.settlement.reservedMicros, plan.totalReservedMicros);
    assert.equal(settled.settlement.chargedMicros, settled.totalChargedMicros);
  }
});

test('DynamoDB: planTurnReservation and settleTurnCharges commit atomically via AwsChatState, enforce concurrent budget ceilings, and leak zero canaries', async () => {
  const tableName = `chat-pricing-test-${randomUUID()}`;
  const signal = new AbortController().signal;
  const fixedNow = Date.UTC(2026, 9, 31, 15, 0, 0);
  const canary = 'CANARY-A13-SECRET-7812c409';

  await dynamoClient.send(
    new CreateTableCommand({
      TableName: tableName,
      BillingMode: 'PAY_PER_REQUEST',
      AttributeDefinitions: [
        { AttributeName: 'pk', AttributeType: 'S' },
        { AttributeName: 'sk', AttributeType: 'S' }
      ],
      KeySchema: [
        { AttributeName: 'pk', KeyType: 'HASH' },
        { AttributeName: 'sk', KeyType: 'RANGE' }
      ]
    })
  );

  try {
    // Allow exactly 1 full RAG+MCP turn reservation (21,864 micro-USD) in the monthly budget
    const limits = {
      monthlyBudgetMicros: MAX_TURN_RESERVATION_MICROS,
      providerBudgetMicros: { openai: MAX_OPENAI_TURN_RESERVATION_MICROS, anthropic: MAX_GENERATION_RESERVATION_MICROS },
      dailyVisitorTurns: 16
    };
    const storeA = new AwsChatState({ tableName, limits }, dynamoClient, () => fixedNow);
    const storeB = new AwsChatState({ tableName, limits }, dynamoClient, () => fixedNow);

    const openedA = await storeA.openSession({ visitorId: 'private-visitor-pricing-a' }, signal);
    const openedB = await storeB.openSession({ visitorId: 'private-visitor-pricing-b' }, signal);
    const identityA = { visitorId: 'private-visitor-pricing-a', credential: openedA.credential };
    const identityB = { visitorId: 'private-visitor-pricing-b', credential: openedB.credential };

    const plan = planTurnReservation({ needsEmbedding: true });
    assert.equal(plan.totalReservedMicros, 21_864);

    const textA = `Compare Josh's renewal automation with ${canary}`;
    const textB = 'What did Josh build for claims history loading?';
    const digestA = createHash('sha256').update(textA).digest('hex');
    const digestB = createHash('sha256').update(textB).digest('hex');

    // Concurrent reservation race: only 1 of the 2 independent sessions can reserve 21,864 micro-USD
    const [resA, resB] = await Promise.allSettled([
      storeA.beginTurn(
        {
          identity: identityA,
          requestId: randomUUID(),
          digest: digestA,
          reservations: plan.reservations,
          priceVersion: plan.priceVersion,
          text: textA
        },
        signal
      ),
      storeB.beginTurn(
        {
          identity: identityB,
          requestId: randomUUID(),
          digest: digestB,
          reservations: plan.reservations,
          priceVersion: plan.priceVersion,
          text: textB
        },
        signal
      )
    ]);

    const fulfilled = [resA, resB].filter(
      (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof storeA.beginTurn>>> => r.status === 'fulfilled'
    );
    const rejected = [resA, resB].filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.equal((rejected[0]!.reason as { code?: string }).code, 'BUDGET_EXHAUSTED');

    const winner = fulfilled[0]!.value;
    const winnerText = winner.turn.digest === digestA ? textA : textB;

    // Verify full 21,864 reservation is recorded before settlement
    const preRows = (await dynamoClient.send(new ScanCommand({ TableName: tableName, ConsistentRead: true }))).Items ?? [];
    assert.equal(preRows.find(r => r.pk?.S === 'BUDGET#2026-10' && r.sk?.S === 'ALL')?.used?.N, '21864');
    assert.equal(preRows.find(r => r.pk?.S === 'BUDGET#2026-10' && r.sk?.S === 'openai')?.used?.N, '11060');
    assert.equal(preRows.find(r => r.pk?.S === 'BUDGET#2026-10' && r.sk?.S === 'anthropic')?.used?.N, '10804');

    // Settle turn charges and verify trace settlement contract compatibility
    const settled = settleTurnCharges({
      plan,
      embeddingDispatched: true,
      embeddingUsage: knownEmbUsage(50), // 2 micro-USD
      attempts: [
        { provider: 'openai', dispatched: true, usage: knownGenUsage(1_000, 200) }, // 300 micro-USD
        { provider: 'anthropic', dispatched: false }
      ],
      mcpCalls: 2,
      retrievalMatched: 4
    });
    assert.deepEqual(validateSettlement(settled.settlement), settled.settlement);

    const turnResult = {
      kind: 'answer',
      answer: { schemaVersion: '1.0.0', corpusVersion: 'sha256:test', blocks: [], sources: [] },
      reply: { kind: 'portfolio', text: `Reply mentioning ${canary}`, suggestions: [] },
      settlement: settled.settlement
    };

    const completion = await storeA.completeTurn(
      {
        turn: winner.turn,
        actualCosts: settled.actualCosts,
        result: turnResult,
        historyEntry: { text: winnerText, result: turnResult }
      },
      signal
    );
    assert.equal(completion.published, true);

    // Duplicate completeTurn must not refund a second time
    await storeA.completeTurn(
      {
        turn: winner.turn,
        actualCosts: settled.actualCosts,
        result: turnResult
      },
      signal
    );

    const postRows = (await dynamoClient.send(new ScanCommand({ TableName: tableName, ConsistentRead: true }))).Items ?? [];
    assert.equal(postRows.find(r => r.pk?.S === 'BUDGET#2026-10' && r.sk?.S === 'ALL')?.used?.N, '302');
    assert.equal(postRows.find(r => r.pk?.S === 'BUDGET#2026-10' && r.sk?.S === 'openai')?.used?.N, '302');
    assert.equal(postRows.find(r => r.pk?.S === 'BUDGET#2026-10' && r.sk?.S === 'anthropic')?.used?.N, '0');

    // Verify 100-day REQUEST# ledger and BUDGET#/VISITOR# rows contain zero occurrences of the canary
    const durableNonSessionRows = postRows.filter(r => !r.pk?.S?.startsWith('SESSION#'));
    assert.ok(!JSON.stringify(durableNonSessionRows).includes(canary));
  } finally {
    await dynamoClient.send(new DeleteTableCommand({ TableName: tableName }));
  }
});
