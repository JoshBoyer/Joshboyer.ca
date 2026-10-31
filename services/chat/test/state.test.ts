import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  ACTIVE_LEASE_MS,
  AwsChatState,
  MAX_PROVIDER_RESERVATION_MICROS,
  MAX_TRACE_BYTES,
  MAX_TRACE_FRAMES,
  SESSION_MS
} from '../src/state.js';

const corpus = require('../../../chat/knowledge/corpus.json') as { corpusVersion: string };
const visitorId = 'private-visitor-test-0001';
const signal = new AbortController().signal;
const requestId = '11111111-1111-4111-8111-111111111111';
const generation = '22222222-2222-4222-8222-222222222222';
const credential = 'a'.repeat(43);

test('state limits reject non-integer, negative and enlarged allowances before database access', () => {
  for (const monthlyBudgetMicros of [-1, 0.5, 25_000_001, Number.NaN]) {
    assert.throws(() => new AwsChatState({ tableName: 'test-state', limits: { monthlyBudgetMicros } }));
  }
  for (const dailyVisitorTurns of [0, 17, 1.5]) {
    assert.throws(() => new AwsChatState({ tableName: 'test-state', limits: { dailyVisitorTurns } }));
  }
  assert.throws(() => new AwsChatState({ tableName: 'test-state', limits: { providerBudgetMicros: { openai: 1.5, anthropic: 1 } } }));
});

test('session secrets are random and only hashes are persisted; writes require non-existing keys', async () => {
  const writes: Array<{ input: Record<string, unknown> }> = [];
  const client = { async send(command: { input: Record<string, unknown> }) { writes.push(command); return {}; } } as unknown as DynamoDBClient;
  const store = new AwsChatState({ tableName: 'test-state' }, client, () => 1_800_000_000_000);
  const first = await store.openSession({ visitorId }, signal);
  const second = await store.openSession({ visitorId }, signal);
  assert.match(first.credential, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(first.credential, second.credential);
  assert.notEqual(first.session.generation, second.session.generation);
  assert.equal(first.session.id, createHash('sha256').update(first.credential).digest('hex'));
  assert.equal(first.session.expiresAt, 1_800_086_400_000);
  assert.equal(first.session.remainingTurns, 8);
  assert.ok(!JSON.stringify(writes).includes(first.credential));
  assert.ok(!JSON.stringify(writes).includes(visitorId));
  assert.equal(writes[0]?.input.ConditionExpression, 'attribute_not_exists(pk)');
});

test('invalid identity and message bounds fail before database I/O', async () => {
  let calls = 0;
  const client = { async send() { calls++; throw new Error('must not run'); } } as unknown as DynamoDBClient;
  const store = new AwsChatState({ tableName: 'test-state' }, client);
  await assert.rejects(store.openSession({ visitorId: 'x' }, signal), { code: 'INVALID_REQUEST' });
  await assert.rejects(store.requireSession({ visitorId, credential: 'x' }, signal), { code: 'SESSION_EXPIRED' });
  await assert.rejects(store.beginTurn({
    identity: { visitorId, credential }, requestId: 'invalid', digest: 'a'.repeat(64),
    reservations: { openai: 1, anthropic: 1 }, priceVersion: 'test', text: 'hello'
  }, signal), { code: 'INVALID_REQUEST' });
  await assert.rejects(store.beginTurn({
    identity: { visitorId, credential }, requestId, digest: 'a'.repeat(64),
    reservations: { openai: 1, anthropic: 1 }, priceVersion: 'test', text: 'é'.repeat(4097)
  }, signal), { code: 'INVALID_REQUEST' });
  assert.equal(calls, 0);
});
test('persistence failures are redacted and never retried by the state layer', async () => {
  let calls = 0;
  const client = { async send() { calls++; throw new Error('private-key-and-input'); } } as unknown as DynamoDBClient;
  const store = new AwsChatState({ tableName: 'test-state' }, client);
  await assert.rejects(store.openSession({ visitorId }, signal), { code: 'STATE_UNAVAILABLE', message: 'STATE_UNAVAILABLE' });
  assert.equal(calls, 1);
});

test('multi-component reservation ceiling and breakdown metadata validate before database I/O', async () => {
  assert.equal(MAX_PROVIDER_RESERVATION_MICROS, 25_000);
  let calls = 0;
  const client = { async send() { calls++; throw new Error('must not run'); } } as unknown as DynamoDBClient;
  const store = new AwsChatState({ tableName: 'test-state' }, client);
  const baseTurnInput = {
    identity: { visitorId, credential },
    requestId,
    digest: 'a'.repeat(64),
    reservations: { openai: 11_060, anthropic: 10_804 },
    priceVersion: '2026-10-31-standard-conversation-v2',
    text: 'Compare my requirements against Josh portfolio.'
  };

  // Per-turn provider reservation ceiling (> 25,000 micros) fails before DB I/O
  await assert.rejects(store.beginTurn({
    ...baseTurnInput,
    reservations: { openai: 25_001, anthropic: 10_804 }
  }, signal), { code: 'INVALID_REQUEST' });

  // Mismatched or negative reservationComponents fail before DB I/O
  for (const badComponents of [
    { embeddingMicros: 255, openaiGenerationMicros: 10_804, anthropicGenerationMicros: 10_804 },
    { embeddingMicros: 256, openaiGenerationMicros: 10_804, anthropicGenerationMicros: 10_800 },
    { embeddingMicros: -1, openaiGenerationMicros: 11_061, anthropicGenerationMicros: 10_804 },
    { embeddingMicros: 1.5, openaiGenerationMicros: 11_058.5, anthropicGenerationMicros: 10_804 },
    { embeddingMicros: 256, openaiGenerationMicros: 10_804, anthropicGenerationMicros: 10_804, prompt: 'CANARY-A12-PROMPT-991' } as unknown as Record<string, number>
  ]) {
    await assert.rejects(store.beginTurn({
      ...baseTurnInput,
      reservationComponents: badComponents
    }, signal), { code: 'INVALID_REQUEST' });
  }

  // Invalid chargeComponents fail before DB I/O in completeTurn and failTurn
  const turn = {
    sessionId: createHash('sha256').update(credential).digest('hex'),
    requestId,
    generation,
    digest: 'a'.repeat(64),
    reservations: { openai: 11_060, anthropic: 10_804 },
    priceVersion: '2026-10-31-standard-conversation-v2',
    month: '2026-10',
    status: 'pending' as const
  };
  for (const badCharges of [
    { embeddingMicros: 100, generationMicros: 200 },
    { embeddingMicros: -1, generationMicros: 10 },
    { embeddingMicros: 10, generationMicros: 20, mcpCalls: 5 },
    { embeddingMicros: 10, generationMicros: 20, retrievalMatched: 17 },
    { embeddingMicros: 10, generationMicros: 20, jobText: 'CANARY-A12-JOBTEXT-993' } as unknown as Record<string, number>
  ]) {
    await assert.rejects(store.completeTurn({
      turn,
      actualCosts: { openai: 200, anthropic: 50 },
      chargeComponents: badCharges,
      result: { kind: 'cancelled' }
    }, signal), { code: 'INVALID_REQUEST' });
    await assert.rejects(store.failTurn({
      turn,
      actualCosts: { openai: 200, anthropic: 50 },
      chargeComponents: badCharges,
      code: 'upstream_failure',
      retryable: true
    }, signal), { code: 'INVALID_REQUEST' });
  }
  assert.equal(calls, 0);
});
test('3-point time boundaries for session expiry and active turn lease expiry are deterministic', async () => {
  assert.equal(SESSION_MS, 86_400_000);
  assert.equal(ACTIVE_LEASE_MS, 120_000);
  const startMs = 1_800_000_000_000;
  const sessionExpiresAt = startMs + SESSION_MS;
  const leaseExpiresAt = startMs + ACTIVE_LEASE_MS;
  let currentNow = startMs;
  const sessionId = createHash('sha256').update(credential).digest('hex');
  const visitorHash = createHash('sha256').update(visitorId).digest('hex');

  const client = {
    async send(command: { input?: { Key?: Record<string, { S?: string }> } }) {
      const pk = command.input?.Key?.pk?.S ?? '';
      if (pk.startsWith('SESSION#')) {
        return {
          Item: {
            pk: { S: `SESSION#${sessionId}` },
            sk: { S: 'STATE' },
            visitorHash: { S: visitorHash },
            generation: { S: generation },
            expiresMs: { N: String(sessionExpiresAt) },
            turns: { N: '1' },
            history: { S: '[]' },
            revoked: { BOOL: false },
            activeRequestId: { S: requestId },
            activeUntil: { N: String(leaseExpiresAt) }
          }
        };
      }
      return {
        Item: {
          pk: { S: `REQUEST#${sessionId}` },
          sk: { S: requestId },
          sessionId: { S: sessionId },
          visitorHash: { S: visitorHash },
          requestId: { S: requestId },
          generation: { S: generation },
          digest: { S: 'a'.repeat(64) },
          reservations: { S: JSON.stringify({ openai: 400, anthropic: 600 }) },
          priceVersion: { S: 'test-v1' },
          month: { S: '2026-10' },
          status: { S: 'pending' },
          cancelRequested: { BOOL: false },
          published: { BOOL: false }
        }
      };
    }
  } as unknown as DynamoDBClient;

  const store = new AwsChatState({ tableName: 'test-state' }, client, () => currentNow);
  const identity = { visitorId, credential };
  const turn = {
    sessionId,
    requestId,
    generation,
    digest: 'a'.repeat(64),
    reservations: { openai: 400, anthropic: 600 },
    priceVersion: 'test-v1',
    month: '2026-10',
    status: 'pending' as const
  };

  // Active turn lease 3-point check: leaseExpiresAt - 1, leaseExpiresAt, leaseExpiresAt + 1
  currentNow = leaseExpiresAt - 1;
  assert.equal(await store.isCancelled(turn, signal), false);
  currentNow = leaseExpiresAt;
  assert.equal(await store.isCancelled(turn, signal), true);
  currentNow = leaseExpiresAt + 1;
  assert.equal(await store.isCancelled(turn, signal), true);

  // Session expiry 3-point check: sessionExpiresAt - 1, sessionExpiresAt, sessionExpiresAt + 1
  currentNow = sessionExpiresAt - 1;
  const activeSession = await store.requireSession(identity, signal);
  assert.equal(activeSession.expiresAt, sessionExpiresAt);
  currentNow = sessionExpiresAt;
  await assert.rejects(store.requireSession(identity, signal), { code: 'SESSION_EXPIRED' });
  currentNow = sessionExpiresAt + 1;
  await assert.rejects(store.requireSession(identity, signal), { code: 'SESSION_EXPIRED' });
});

test('8-stage trace validation and MAX_TRACE_FRAMES=24 / MAX_TRACE_BYTES=16384 limits fail closed on invalid or oversized traces', async () => {
  assert.equal(MAX_TRACE_FRAMES, 24);
  assert.equal(MAX_TRACE_BYTES, 16_384);
  let calls = 0;
  const client = { async send() { calls++; throw new Error('must not run'); } } as unknown as DynamoDBClient;
  const store = new AwsChatState({ tableName: 'test-state' }, client);
  const turn = {
    sessionId: createHash('sha256').update(credential).digest('hex'),
    requestId,
    generation,
    digest: 'a'.repeat(64),
    reservations: { openai: 11_060, anthropic: 10_804 },
    priceVersion: '2026-10-31-standard-conversation-v2',
    month: '2026-10',
    status: 'pending' as const
  };

  const valid16Frame8StageTrace = [
    { stage: 'context', state: 'completed', elapsedMs: 2, durationMs: 2, corpusVersion: corpus.corpusVersion, claimCount: 16 },
    { stage: 'routing', state: 'completed', elapsedMs: 5, durationMs: 3, routingMode: 'portfolio_mcp', needsRetrieval: true, requestedTools: ['search_public_evidence', 'get_case_study'] },
    { stage: 'budget', state: 'completed', elapsedMs: 8, durationMs: 3, reservedMicros: 21_864, priceVersion: '2026-10-31-standard-conversation-v2' },
    { stage: 'retrieval', state: 'started', elapsedMs: 10 },
    { stage: 'retrieval', state: 'completed', elapsedMs: 25, durationMs: 15, retrievalMode: 'hybrid', matchedCount: 4, corpusVersion: corpus.corpusVersion, embeddingModel: 'text-embedding-3-small', indexVersion: 'idx-v1' },
    { stage: 'mcp', state: 'started', elapsedMs: 26, mcpMethod: 'initialize' },
    { stage: 'mcp', state: 'completed', elapsedMs: 30, durationMs: 4, mcpMethod: 'initialize', toolOutcome: 'completed' },
    { stage: 'mcp', state: 'started', elapsedMs: 31, mcpMethod: 'tools/list' },
    { stage: 'mcp', state: 'completed', elapsedMs: 35, durationMs: 4, mcpMethod: 'tools/list', toolOutcome: 'completed' },
    { stage: 'mcp', state: 'started', elapsedMs: 36, mcpMethod: 'tools/call', toolName: 'search_public_evidence', toolCallId: 'tool-001' },
    { stage: 'mcp', state: 'completed', elapsedMs: 50, durationMs: 14, mcpMethod: 'tools/call', toolName: 'search_public_evidence', toolCallId: 'tool-001', toolOutcome: 'completed' },
    { stage: 'mcp', state: 'started', elapsedMs: 51, mcpMethod: 'tools/call', toolName: 'get_case_study', toolCallId: 'tool-002' },
    { stage: 'mcp', state: 'completed', elapsedMs: 65, durationMs: 14, mcpMethod: 'tools/call', toolName: 'get_case_study', toolCallId: 'tool-002', toolOutcome: 'completed' },
    { stage: 'provider', state: 'started', elapsedMs: 66, attempt: 1, provider: 'openai', model: 'gpt-6-luna', reservedMicros: 10_804 },
    { stage: 'provider', state: 'completed', elapsedMs: 120, durationMs: 54, attempt: 1, provider: 'openai', model: 'gpt-6-luna', usageStatus: 'known', inputTokens: 400, outputTokens: 80, chargedMicros: 120 },
    { stage: 'validation', state: 'started', elapsedMs: 121, attempt: 1 },
    { stage: 'validation', state: 'completed', elapsedMs: 125, durationMs: 4, attempt: 1, corpusVersion: corpus.corpusVersion, claimCount: 2 }
  ];

  // > 24 trace frames must fail before DB I/O
  const tooManyFrames = Array.from({ length: 25 }, (_, idx) => ({
    stage: 'mcp',
    state: idx % 2 === 0 ? 'started' : 'completed',
    elapsedMs: idx + 1,
    mcpMethod: 'tools/call',
    toolName: 'search_public_evidence',
    toolCallId: `call_${Math.floor(idx / 2) + 1}`
  }));
  await assert.rejects(store.completeTurn({
    turn,
    actualCosts: { openai: 135, anthropic: 0 },
    result: { kind: 'cancelled', trace: tooManyFrames }
  }, signal), { code: 'INVALID_REQUEST' });

  // Invalid mcp transition (completed without started) and unapproved tool name must fail before DB I/O
  await assert.rejects(store.completeTurn({
    turn,
    actualCosts: { openai: 135, anthropic: 0 },
    result: {
      kind: 'cancelled',
      trace: [
        ...valid16Frame8StageTrace,
        { stage: 'mcp', state: 'completed', elapsedMs: 130, mcpMethod: 'tools/call', toolName: 'compare_job_requirements', toolCallId: 'tool-unstarted' }
      ]
    }
  }, signal), { code: 'INVALID_REQUEST' });

  await assert.rejects(store.completeTurn({
    turn,
    actualCosts: { openai: 135, anthropic: 0 },
    result: {
      kind: 'cancelled',
      trace: [
        { stage: 'mcp', state: 'started', elapsedMs: 1, mcpMethod: 'tools/call', toolName: 'aws_admin', toolCallId: 'tool-bad' }
      ]
    }
  }, signal), { code: 'INVALID_REQUEST' });
  assert.equal(calls, 0);

  // Valid 17-frame 8-stage trace passes validation and proceeds to DB read
  await assert.rejects(store.completeTurn({
    turn,
    actualCosts: { openai: 135, anthropic: 0 },
    result: { kind: 'cancelled', trace: valid16Frame8StageTrace }
  }, signal), { code: 'STATE_UNAVAILABLE' });
  assert.equal(calls, 1);
});

test('adversarial inputs, privacy guard and seeded property checks reject forbidden ledger fields and canaries', async () => {
  let calls = 0;
  const canaryPrompt = 'CANARY-A12-PROMPT-991';
  const canaryReply = 'CANARY-A12-REPLY-992';
  const canaryJob = 'CANARY-A12-JOBTEXT-993';
  const client = { async send() { calls++; throw new Error(canaryPrompt); } } as unknown as DynamoDBClient;
  const store = new AwsChatState({ tableName: 'test-state' }, client);
  const turn = {
    sessionId: createHash('sha256').update(credential).digest('hex'),
    requestId,
    generation,
    digest: 'a'.repeat(64),
    reservations: { openai: 11_060, anthropic: 10_804 },
    priceVersion: '2026-10-31-standard-conversation-v2',
    month: '2026-10',
    status: 'pending' as const
  };

  for (const forbiddenPayload of [
    { kind: 'answer', answer: { blocks: [] }, prompt: canaryPrompt },
    { kind: 'answer', answer: { blocks: [] }, jobText: canaryJob },
    { kind: 'answer', answer: { blocks: [] }, query: canaryPrompt },
    { kind: 'answer', answer: { blocks: [] }, toolArgs: { jobText: canaryJob } },
    { kind: 'answer', answer: { blocks: [] }, toolOutput: { text: canaryReply } },
    { kind: 'answer', answer: { blocks: [], jobText: canaryJob } },
    JSON.parse(`{"kind":"cancelled","__proto__":{"canary":"${canaryPrompt}"}}`)
  ]) {
    await assert.rejects(store.completeTurn({
      turn,
      actualCosts: { openai: 10, anthropic: 0 },
      result: forbiddenPayload
    }, signal), error => {
      assert.equal((error as { code?: string }).code, 'INVALID_REQUEST');
      assert.ok(!String(error).includes(canaryPrompt));
      assert.ok(!String(error).includes(canaryReply));
      assert.ok(!String(error).includes(canaryJob));
      return true;
    });
  }

  // Throwing getter and Proxy traps on result and reservationComponents
  const throwingResult = { kind: 'cancelled' };
  Object.defineProperty(throwingResult, 'answer', {
    enumerable: true,
    get() { throw new Error(canaryReply); }
  });
  await assert.rejects(store.completeTurn({
    turn,
    actualCosts: { openai: 10, anthropic: 0 },
    result: throwingResult
  }, signal), error => {
    assert.equal((error as { code?: string }).code, 'INVALID_REQUEST');
    assert.ok(!String(error).includes(canaryReply));
    return true;
  });

  // Deterministic seeded property test (seed = 0xA1202026, 100 iterations)
  let seed = 0xA1202026;
  const nextRand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  for (let i = 0; i < 100; i++) {
    const emb = nextRand() % 500;
    const genOpenai = (nextRand() % 10_000) + 1;
    const genAnthropic = nextRand() % 10_000;
    const mismatch = (nextRand() % 10) + 1;
    await assert.rejects(store.beginTurn({
      identity: { visitorId, credential },
      requestId,
      digest: 'a'.repeat(64),
      reservations: { openai: emb + genOpenai, anthropic: genAnthropic },
      reservationComponents: {
        embeddingMicros: emb + mismatch,
        openaiGenerationMicros: genOpenai,
        anthropicGenerationMicros: genAnthropic
      },
      priceVersion: 'test-v1',
      text: 'property check'
    }, signal), { code: 'INVALID_REQUEST' });
  }
  assert.equal(calls, 0);
});
