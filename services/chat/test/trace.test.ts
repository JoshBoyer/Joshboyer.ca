import test from 'node:test';
import assert from 'node:assert/strict';
import { CAG_CLAIM_IDS, CAG_VERSION, corpus, type StreamFrame } from '../src/cag.js';
import { MAX_PROVIDER_RESERVATION_MICROS, PRICE_VERSION } from '../src/chat-pricing.js';
import { ServiceError } from '../src/errors.js';
import {
  STAGE_FIELDS,
  TraceCollector,
  TraceRecorder,
  validateSettlement,
  validateTrace,
  type TracePoint
} from '../src/trace.js';
import { CONFIG } from './fixtures.js';

const contracts = require('../../../chat/contracts/index.cjs') as {
  SCHEMA_VERSION: string;
  validate(name: string, value: unknown): { valid: boolean; errors: unknown[] };
  createEventValidator(options: { requestId: string; generation: string; corpus: unknown }): {
    accept(event: StreamFrame): boolean;
  };
  renderAnswer(selection: unknown, corpusValue: unknown): {
    corpusVersion: string;
    blocks: unknown[];
    sources: unknown[];
  };
};

const REQUEST_ID = '11111111-1111-4111-8111-111111111111';
const GENERATION = '22222222-2222-4222-8222-222222222222';
const CANARY = 'CANARY-A20-TRACE-SECRET';

function createClock(initial = 1000) {
  let current = initial;
  return {
    now: () => current,
    advance(ms: number) {
      current += ms;
      return current;
    },
    set(value: number) {
      current = value;
      return current;
    }
  };
}

function assertValidationFailed(fn: () => unknown, message?: string) {
  assert.throws(
    fn,
    (error: unknown) => {
      assert.ok(error instanceof ServiceError, message ?? 'Expected ServiceError');
      assert.equal(error.code, 'ANSWER_VALIDATION_FAILED');
      assert.equal(error.status, 502);
      assert.ok(!JSON.stringify(error).includes(CANARY), 'Error must never leak canary');
      assert.ok(!String(error.message).includes(CANARY), 'Error message must never leak canary');
      return true;
    },
    message
  );
}

test('full 8-stage trace lifecycle emits truthful monotonic frames accepted by createEventValidator', () => {
  const clock = createClock(5000);
  const collector = new TraceCollector({
    requestId: REQUEST_ID,
    generation: GENERATION,
    now: clock.now,
    corpusVersion: CAG_VERSION
  });

  clock.advance(2);
  const routingFrame = collector.routingCompleted({
    routingMode: 'rag_and_mcp',
    needsRetrieval: true,
    requestedTools: ['search_public_evidence', 'get_case_study']
  });
  assert.equal((routingFrame.data as TracePoint).stage, 'routing');
  assert.equal((routingFrame.data as TracePoint).state, 'completed');
  assert.equal((routingFrame.data as TracePoint).routingMode, 'portfolio_mcp');
  assert.equal((routingFrame.data as TracePoint).needsRetrieval, true);
  assert.deepEqual((routingFrame.data as TracePoint).requestedTools, ['search_public_evidence', 'get_case_study']);

  clock.advance(3);
  const retrievalStart = collector.retrievalStarted({
    retrievalMode: 'hybrid',
    indexVersion: 'idx-2026-10-31-v1',
    embeddingModel: 'text-embedding-3-small'
  });
  assert.equal((retrievalStart.data as TracePoint).stage, 'retrieval');
  assert.equal((retrievalStart.data as TracePoint).state, 'started');

  clock.advance(25);
  const retrievalDone = collector.retrievalCompleted({
    indexVersion: 'idx-2026-10-31-v1',
    retrievalMode: 'hybrid',
    embeddingModel: 'text-embedding-3-small',
    matchedCount: 3,
    claimIds: [CAG_CLAIM_IDS[0]!, CAG_CLAIM_IDS[1]!],
    sourceIds: ['source-dell']
  });
  assert.equal((retrievalDone.data as TracePoint).stage, 'retrieval');
  assert.equal((retrievalDone.data as TracePoint).state, 'completed');
  assert.equal((retrievalDone.data as TracePoint).durationMs, 25);
  assert.equal((retrievalDone.data as TracePoint).matchedCount, 3);
  assert.equal((retrievalDone.data as TracePoint).corpusVersion, CAG_VERSION);

  clock.advance(4);
  collector.mcpStarted({ mcpMethod: 'initialize' });
  clock.advance(8);
  collector.mcpCompleted({ mcpMethod: 'initialize', toolOutcome: 'completed' });

  clock.advance(2);
  collector.mcpStarted({
    mcpMethod: 'tools/call',
    toolCallId: 'tool-call-1',
    toolName: 'search_public_evidence',
    attempt: 1
  });
  clock.advance(18);
  const mcpCallDone = collector.mcpCompleted({
    mcpMethod: 'tools/call',
    toolCallId: 'tool-call-1',
    toolName: 'search_public_evidence',
    toolOutcome: 'matched',
    claimIds: [CAG_CLAIM_IDS[0]!],
    sourceIds: ['source-dell'],
    attempt: 1
  });
  assert.equal((mcpCallDone.data as TracePoint).durationMs, 18);
  assert.equal((mcpCallDone.data as TracePoint).toolOutcome, 'completed');

  clock.advance(3);
  collector.contextCompleted({
    durationMs: 2,
    corpusVersion: CAG_VERSION,
    claimCount: CAG_CLAIM_IDS.length
  });

  clock.advance(4);
  collector.budgetCompleted({
    durationMs: 3,
    reservedMicros: MAX_PROVIDER_RESERVATION_MICROS * 2,
    priceVersion: PRICE_VERSION
  });

  clock.advance(2);
  collector.providerStarted({
    attempt: 1,
    provider: 'openai',
    model: CONFIG.models.openai,
    reservedMicros: MAX_PROVIDER_RESERVATION_MICROS
  });
  clock.advance(110);
  collector.providerCompleted({
    attempt: 1,
    provider: 'openai',
    model: CONFIG.models.openai,
    usageStatus: 'known',
    inputTokens: 1200,
    outputTokens: 95,
    cacheReadInputTokens: 512,
    cacheWriteInputTokens: 0,
    reasoningOutputTokens: 0,
    chargedMicros: 300,
    providerRequestId: 'req_openai_1',
    gatewayRequestId: 'gw_cf_1'
  });

  clock.advance(1);
  collector.validationStarted({ attempt: 1, provider: 'openai', model: CONFIG.models.openai });
  clock.advance(3);
  collector.validationCompleted({
    attempt: 1,
    provider: 'openai',
    model: CONFIG.models.openai,
    corpusVersion: CAG_VERSION,
    claimCount: 1
  });

  clock.advance(5);
  collector.settlementCompleted({
    durationMs: 4,
    reservedMicros: MAX_PROVIDER_RESERVATION_MICROS * 2,
    chargedMicros: 300,
    priceVersion: PRICE_VERSION
  });

  const emitted = collector.frames();
  assert.equal(emitted.length, 14);
  const stages = emitted.map(item => `${(item.data as TracePoint).stage}:${(item.data as TracePoint).state}`);
  assert.deepEqual(stages, [
    'routing:completed',
    'retrieval:started',
    'retrieval:completed',
    'mcp:started',
    'mcp:completed',
    'mcp:started',
    'mcp:completed',
    'context:completed',
    'budget:completed',
    'provider:started',
    'provider:completed',
    'validation:started',
    'validation:completed',
    'settlement:completed'
  ]);

  const validator = contracts.createEventValidator({ requestId: REQUEST_ID, generation: GENERATION, corpus });
  for (const frame of emitted) {
    assert.equal(validator.accept(frame), true);
  }
  const answer = contracts.renderAnswer({
    schemaVersion: contracts.SCHEMA_VERSION,
    corpusVersion: CAG_VERSION,
    claimIds: [CAG_CLAIM_IDS[0]],
    noticeCodes: []
  }, corpus);
  let seq = emitted.length;
  assert.equal(validator.accept({
    schemaVersion: '1.0.0', requestId: REQUEST_ID, generation: GENERATION, seq: ++seq,
    event: 'answer_block', data: answer.blocks[0]
  }), true);
  assert.equal(validator.accept({
    schemaVersion: '1.0.0', requestId: REQUEST_ID, generation: GENERATION, seq: ++seq,
    event: 'sources', data: { corpusVersion: CAG_VERSION, sources: answer.sources }
  }), true);
  assert.equal(validator.accept({
    schemaVersion: '1.0.0', requestId: REQUEST_ID, generation: GENERATION, seq: ++seq,
    event: 'done', data: { outcome: 'completed' }
  }), true);
});

test('repeatable mcp calls and provider/validation fallback attempts track independent durations and outcomes', () => {
  const clock = createClock(0);
  const collector = new TraceCollector({ requestId: REQUEST_ID, generation: GENERATION, now: clock.now });

  clock.advance(1);
  collector.routingCompleted({
    routingMode: 'mcp',
    needsRetrieval: false,
    requestedTools: ['search_public_evidence', 'get_case_study', 'compare_job_requirements']
  });

  clock.advance(2);
  collector.mcpStarted({ mcpMethod: 'initialize' });
  clock.advance(5);
  collector.mcpCompleted({ mcpMethod: 'initialize', toolOutcome: 'completed' });

  clock.advance(1);
  collector.mcpStarted({ mcpMethod: 'tools/list' });
  clock.advance(4);
  collector.mcpCompleted({ mcpMethod: 'tools/list', toolOutcome: 'completed' });

  clock.advance(2);
  collector.mcpStarted({
    mcpMethod: 'tools/call',
    toolCallId: 'tool-search-1',
    toolName: 'search_public_evidence',
    attempt: 1
  });
  clock.advance(12);
  const searchFrame = collector.mcpCompleted({
    mcpMethod: 'tools/call',
    toolCallId: 'tool-search-1',
    toolName: 'search_public_evidence',
    toolOutcome: 'empty',
    attempt: 1
  });
  assert.equal((searchFrame.data as TracePoint).durationMs, 12);
  assert.equal((searchFrame.data as TracePoint).toolOutcome, 'completed');

  clock.advance(1);
  collector.mcpStarted({
    mcpMethod: 'tools/call',
    toolCallId: 'tool-case-2',
    toolName: 'get_case_study',
    attempt: 1
  });
  clock.advance(19);
  const caseFrame = collector.mcpFailed({
    mcpMethod: 'tools/call',
    toolCallId: 'tool-case-2',
    toolName: 'get_case_study',
    toolOutcome: 'error',
    code: 'upstream_failure',
    attempt: 1
  });
  assert.equal((caseFrame.data as TracePoint).state, 'failed');
  assert.equal((caseFrame.data as TracePoint).durationMs, 19);
  assert.equal((caseFrame.data as TracePoint).code, 'upstream_failure');

  clock.advance(2);
  collector.providerStarted({ attempt: 1, provider: 'openai', model: 'gpt-6-luna', reservedMicros: MAX_PROVIDER_RESERVATION_MICROS });
  clock.advance(45);
  collector.providerFailed({
    attempt: 1,
    provider: 'openai',
    model: 'gpt-6-luna',
    chargedMicros: MAX_PROVIDER_RESERVATION_MICROS,
    usageStatus: 'unknown',
    code: 'upstream_failure'
  });

  clock.advance(2);
  collector.providerStarted({ attempt: 2, provider: 'anthropic', model: 'claude-haiku-5-5', reservedMicros: MAX_PROVIDER_RESERVATION_MICROS });
  clock.advance(80);
  collector.providerCompleted({
    attempt: 2,
    provider: 'anthropic',
    model: 'claude-haiku-5-5',
    usageStatus: 'known',
    inputTokens: 900,
    outputTokens: 60,
    chargedMicros: 210
  });

  clock.advance(1);
  collector.validationStarted({ attempt: 1, provider: 'openai', model: 'gpt-6-luna' });
  clock.advance(2);
  collector.validationFailed({ attempt: 1, provider: 'openai', model: 'gpt-6-luna', code: 'validation_failed' });

  clock.advance(1);
  collector.validationStarted({ attempt: 2, provider: 'anthropic', model: 'claude-haiku-5-5' });
  clock.advance(3);
  collector.validationCompleted({
    attempt: 2,
    provider: 'anthropic',
    model: 'claude-haiku-5-5',
    corpusVersion: CAG_VERSION,
    claimCount: 1
  });

  clock.advance(4);
  collector.settlementFailed({ durationMs: 4, code: 'unavailable' });

  const validator = contracts.createEventValidator({ requestId: REQUEST_ID, generation: GENERATION, corpus });
  for (const frame of collector.frames()) {
    assert.equal(validator.accept(frame), true);
  }
});

test('cag_only turn supports skipped or omitted retrieval without fabricating completed retrieval or mcp stages', () => {
  const clock = createClock(100);
  const skippedCollector = new TraceCollector({ requestId: REQUEST_ID, generation: GENERATION, now: clock.now });

  clock.advance(1);
  const routeFrame = skippedCollector.routingCompleted({
    routingMode: 'cag_only',
    needsRetrieval: false,
    requestedTools: []
  });
  assert.equal((routeFrame.data as TracePoint).routingMode, 'portfolio_cag');
  assert.equal((routeFrame.data as TracePoint).needsRetrieval, false);

  clock.advance(1);
  const skipFrame = skippedCollector.retrievalSkipped({
    retrievalMode: 'cag_fallback',
    indexVersion: 'idx-cag-only'
  });
  assert.equal((skipFrame.data as TracePoint).stage, 'retrieval');
  assert.equal((skipFrame.data as TracePoint).retrievalMode, 'skipped');
  assert.equal((skipFrame.data as TracePoint).matchedCount, 0);
  assert.equal((skipFrame.data as TracePoint).durationMs, undefined);

  // Never allow a skipped retrieval to transition to completed or failed
  assertValidationFailed(() => skippedCollector.retrievalCompleted({
    indexVersion: 'idx-cag-only',
    retrievalMode: 'hybrid',
    matchedCount: 2
  }));
  assertValidationFailed(() => skippedCollector.retrievalFailed({
    code: 'upstream_failure'
  }));
  // Never allow mcpCompleted without mcpStarted
  assertValidationFailed(() => skippedCollector.mcpCompleted({
    mcpMethod: 'tools/call',
    toolCallId: 'tool-1',
    toolName: 'get_case_study',
    toolOutcome: 'matched'
  }));

  clock.advance(2);
  skippedCollector.contextCompleted({ corpusVersion: CAG_VERSION, claimCount: CAG_CLAIM_IDS.length });
  clock.advance(2);
  skippedCollector.budgetCompleted({ reservedMicros: MAX_PROVIDER_RESERVATION_MICROS, priceVersion: PRICE_VERSION });
  clock.advance(2);
  skippedCollector.providerStarted({ attempt: 1, provider: 'openai', model: 'gpt-6-luna' });
  clock.advance(40);
  skippedCollector.providerCompleted({ attempt: 1, provider: 'openai', model: 'gpt-6-luna', chargedMicros: 120 });
  clock.advance(2);
  skippedCollector.validationCompleted({ attempt: 1, corpusVersion: CAG_VERSION, claimCount: 1 });
  clock.advance(3);
  skippedCollector.settlementCompleted({
    reservedMicros: MAX_PROVIDER_RESERVATION_MICROS,
    chargedMicros: 120,
    priceVersion: PRICE_VERSION
  });

  const frames = skippedCollector.frames();
  assert.ok(!frames.some(frame => (frame.data as TracePoint).stage === 'mcp'));
  assert.equal(
    frames.filter(frame => (frame.data as TracePoint).stage === 'retrieval' && (frame.data as TracePoint).retrievalMode !== 'skipped').length,
    0
  );
  const validator = contracts.createEventValidator({ requestId: REQUEST_ID, generation: GENERATION, corpus });
  for (const frame of frames) {
    assert.equal(validator.accept(frame), true);
  }

  // Omitted retrieval and mcp on cag_only turn
  const omittedCollector = new TraceCollector({ requestId: REQUEST_ID, generation: GENERATION, now: clock.now });
  // Cannot complete retrieval if retrieval was never started
  assertValidationFailed(() => omittedCollector.retrievalCompleted({
    indexVersion: 'idx-1',
    retrievalMode: 'hybrid',
    matchedCount: 1
  }));
  omittedCollector.routingCompleted({ routingMode: 'cag_only', needsRetrieval: false, requestedTools: [] });
  omittedCollector.contextCompleted({ corpusVersion: CAG_VERSION, claimCount: CAG_CLAIM_IDS.length });
  omittedCollector.budgetCompleted({ reservedMicros: MAX_PROVIDER_RESERVATION_MICROS, priceVersion: PRICE_VERSION });
  assert.deepEqual(
    omittedCollector.frames().map(frame => (frame.data as TracePoint).stage),
    ['routing', 'context', 'budget']
  );
});

test('replayFrames preserves exact 8-stage order and fields, sets replayed: true, and sets elapsedMs: null only when timing is absent', () => {
  const clock = createClock(2000);
  const collector = new TraceCollector({ requestId: REQUEST_ID, generation: GENERATION, now: clock.now });

  clock.advance(1);
  collector.routingCompleted({ routingMode: 'rag', needsRetrieval: true, requestedTools: ['search_public_evidence'] });
  clock.advance(2);
  collector.retrievalStarted({ retrievalMode: 'vector', indexVersion: 'idx-1', embeddingModel: 'text-embedding-3-small' });
  clock.advance(15);
  collector.retrievalCompleted({ indexVersion: 'idx-1', retrievalMode: 'vector', embeddingModel: 'text-embedding-3-small', matchedCount: 2 });
  clock.advance(1);
  collector.mcpStarted({ mcpMethod: 'tools/call', toolCallId: 'tool-1', toolName: 'search_public_evidence' });
  clock.advance(10);
  collector.mcpCompleted({ mcpMethod: 'tools/call', toolCallId: 'tool-1', toolName: 'search_public_evidence', toolOutcome: 'matched' });
  clock.advance(1);
  collector.contextCompleted({ corpusVersion: CAG_VERSION, claimCount: CAG_CLAIM_IDS.length });
  clock.advance(2);
  collector.budgetCompleted({ reservedMicros: 10000, priceVersion: PRICE_VERSION });
  clock.advance(1);
  collector.providerStarted({ attempt: 1, provider: 'openai', model: 'gpt-6-luna' });
  clock.advance(50);
  collector.providerCompleted({ attempt: 1, provider: 'openai', model: 'gpt-6-luna', chargedMicros: 200 });
  clock.advance(1);
  collector.validationStarted({ attempt: 1 });
  clock.advance(2);
  collector.validationCompleted({ attempt: 1, corpusVersion: CAG_VERSION, claimCount: 2 });
  clock.advance(3);
  collector.settlementCompleted({ reservedMicros: 10000, chargedMicros: 200, priceVersion: PRICE_VERSION });

  const original = collector.frames();
  const replayed = collector.replayFrames();
  assert.equal(replayed.length, original.length);
  for (let i = 0; i < original.length; i += 1) {
    const origPoint = original[i]!.data as TracePoint;
    const replayPoint = replayed[i]!.data as TracePoint;
    assert.equal(replayPoint.replayed, true);
    assert.equal(replayPoint.elapsedMs, origPoint.elapsedMs);
    assert.deepEqual(replayPoint, { ...origPoint, replayed: true });
    assert.equal(replayed[i]!.seq, i + 1);
  }

  // Also test replay with legacy settlement lacking timing (elapsedMs: null)
  const withoutSettlement = collector.snapshot().slice(0, -1);
  const legacyReplay = collector.replayFrames(withoutSettlement, {
    reservedMicros: 10000,
    chargedMicros: 200,
    priceVersion: PRICE_VERSION
  });
  assert.equal(legacyReplay.length, original.length);
  const lastReplay = legacyReplay.at(-1)!.data as TracePoint;
  assert.equal(lastReplay.stage, 'settlement');
  assert.equal(lastReplay.replayed, true);
  assert.equal(lastReplay.elapsedMs, null);
  assert.equal(lastReplay.durationMs, undefined);

  const validator = contracts.createEventValidator({ requestId: REQUEST_ID, generation: GENERATION, corpus });
  for (const frame of legacyReplay) {
    assert.equal(validator.accept(frame), true);
  }
});

test('clock jitter and 3-point boundaries for elapsedMs (0, 60000, 60001) and matchedCount (0, 14, 15)', () => {
  // 1. Clock jitter: backwards jump between stages and during a stage
  const jitterClock = createClock(1000);
  const jitterCollector = new TraceCollector({ requestId: REQUEST_ID, generation: GENERATION, now: jitterClock.now });
  jitterClock.set(1050);
  jitterCollector.routingCompleted({ routingMode: 'rag', needsRetrieval: true, requestedTools: [] });
  // Jitter backwards before retrievalStarted
  jitterClock.set(1030);
  const rStart = jitterCollector.retrievalStarted({ retrievalMode: 'hybrid', indexVersion: 'idx-1' });
  assert.equal((rStart.data as TracePoint).elapsedMs, 50);
  // Advance to 1060: raw duration from 1030 is 30, but elapsedMs - startedElapsedMs is 60 - 50 = 10
  jitterClock.set(1060);
  const rDone = jitterCollector.retrievalCompleted({ indexVersion: 'idx-1', retrievalMode: 'hybrid', matchedCount: 1 });
  assert.equal((rDone.data as TracePoint).elapsedMs, 60);
  assert.ok(((rDone.data as TracePoint).durationMs ?? 0) <= 10);

  const jitterStream = contracts.createEventValidator({ requestId: REQUEST_ID, generation: GENERATION, corpus });
  for (const frame of jitterCollector.frames()) {
    assert.equal(jitterStream.accept(frame), true);
  }

  // 2. 3-point boundary for elapsedMs: -1 (reject), 0 (pass), 1 (pass), 59999 (pass), 60000 (pass), 60001 (reject)
  for (const [elapsedMs, valid] of [[-1, false], [0, true], [1, true], [59999, true], [60000, true], [60001, false]] as const) {
    const point = {
      stage: 'routing' as const,
      state: 'completed' as const,
      elapsedMs,
      routingMode: 'general' as const,
      needsRetrieval: false
    };
    if (valid) {
      assert.equal(validateTrace([point]).length, 1, `Expected elapsedMs=${elapsedMs} to pass`);
    } else {
      assertValidationFailed(() => validateTrace([point]), `Expected elapsedMs=${elapsedMs} to fail`);
    }
  }

  // Also test collector clock at 0, 60000, and 60001
  const boundaryClock = createClock(1000);
  const boundaryCollector = new TraceCollector({ requestId: REQUEST_ID, generation: GENERATION, now: boundaryClock.now });
  const atZero = boundaryCollector.routingCompleted({ routingMode: 'cag_only', needsRetrieval: false, requestedTools: [] });
  assert.equal((atZero.data as TracePoint).elapsedMs, 0);
  boundaryClock.set(61000); // elapsedMs = 60000
  const atLimit = boundaryCollector.contextCompleted({ corpusVersion: CAG_VERSION, claimCount: 7 });
  assert.equal((atLimit.data as TracePoint).elapsedMs, 60000);
  boundaryClock.set(61001); // elapsedMs = 60001 -> must fail closed
  assertValidationFailed(() => boundaryCollector.budgetCompleted({ reservedMicros: 100, priceVersion: PRICE_VERSION }));

  // 3. 3-point boundary for matchedCount: -1 (reject), 0 (pass), 1 (pass), 13 (pass), 14 (pass), 15 (reject)
  for (const [matchedCount, valid] of [[-1, false], [0, true], [1, true], [13, true], [14, true], [15, false]] as const) {
    const c = createClock(0);
    const col = new TraceCollector({ requestId: REQUEST_ID, generation: GENERATION, now: c.now });
    col.retrievalStarted({ retrievalMode: 'hybrid', indexVersion: 'idx-1' });
    c.advance(10);
    if (valid) {
      const done = col.retrievalCompleted({ indexVersion: 'idx-1', retrievalMode: 'hybrid', matchedCount });
      assert.equal((done.data as TracePoint).matchedCount, matchedCount);
    } else {
      assertValidationFailed(
        () => col.retrievalCompleted({ indexVersion: 'idx-1', retrievalMode: 'hybrid', matchedCount }),
        `Expected matchedCount=${matchedCount} to fail`
      );
    }
  }

  // 4. 3-point boundary for durationMs relative to elapsedMs - startedElapsedMs (14, 15, 16 when started=10, completed=25)
  for (const [durationMs, valid] of [[14, true], [15, true], [16, false]] as const) {
    const points = [
      { stage: 'retrieval', state: 'started', elapsedMs: 10, retrievalMode: 'hybrid', indexVersion: 'idx-1' },
      {
        stage: 'retrieval',
        state: 'completed',
        elapsedMs: 25,
        durationMs,
        retrievalMode: 'hybrid',
        indexVersion: 'idx-1',
        matchedCount: 2,
        corpusVersion: CAG_VERSION
      }
    ];
    if (valid) {
      assert.equal(validateTrace(points).length, 2, `Expected durationMs=${durationMs} to pass`);
    } else {
      assertValidationFailed(() => validateTrace(points), `Expected durationMs=${durationMs} to fail`);
    }
  }
});

test('hostile and canary inputs in unexpected or known fields are rejected before emission without leaking secrets', () => {
  const clock = createClock(0);
  const collector = new TraceCollector({ requestId: REQUEST_ID, generation: GENERATION, now: clock.now });

  // Unexpected fields carrying canary on each stage method
  assertValidationFailed(() =>
    collector.routingCompleted({
      routingMode: 'cag_only',
      needsRetrieval: false,
      requestedTools: [],
      prompt: CANARY
    } as unknown as Parameters<TraceCollector['routingCompleted']>[0])
  );
  assertValidationFailed(() =>
    collector.retrievalStarted({
      retrievalMode: 'hybrid',
      indexVersion: 'idx-1',
      query: CANARY
    } as unknown as Parameters<TraceCollector['retrievalStarted']>[0])
  );
  assertValidationFailed(() =>
    collector.mcpStarted({
      mcpMethod: 'tools/call',
      toolCallId: 'tool-1',
      toolName: 'compare_job_requirements',
      jobText: CANARY
    } as unknown as Parameters<TraceCollector['mcpStarted']>[0])
  );

  // Known fields stuffed with canary, URLs, or unapproved identifiers
  assertValidationFailed(() =>
    collector.retrievalStarted({
      retrievalMode: 'hybrid',
      indexVersion: CANARY
    })
  );
  assertValidationFailed(() =>
    collector.retrievalStarted({
      retrievalMode: 'hybrid',
      indexVersion: 'https://evil.example/idx'
    })
  );
  assertValidationFailed(() =>
    collector.mcpStarted({
      mcpMethod: 'tools/call',
      toolCallId: `tool-${CANARY}`,
      toolName: 'get_case_study'
    })
  );

  // Start a valid retrieval & mcp to test completed/failed canary rejection
  collector.retrievalStarted({ retrievalMode: 'hybrid', indexVersion: 'idx-clean' });
  assertValidationFailed(() =>
    collector.retrievalCompleted({
      indexVersion: 'idx-clean',
      retrievalMode: 'hybrid',
      matchedCount: 1,
      claimIds: [`claim-${CANARY.toLowerCase()}`]
    })
  );
  assertValidationFailed(() =>
    collector.retrievalCompleted({
      indexVersion: 'idx-clean',
      retrievalMode: 'hybrid',
      matchedCount: 1,
      sourceIds: [`source-${CANARY.toLowerCase()}`]
    })
  );
  assertValidationFailed(() =>
    collector.retrievalCompleted({
      indexVersion: 'idx-clean',
      retrievalMode: 'hybrid',
      matchedCount: 1,
      chunkText: CANARY
    } as unknown as Parameters<TraceCollector['retrievalCompleted']>[0])
  );

  // Throwing getter & Proxy & prototype pollution
  const throwingInput = Object.defineProperty(
    { routingMode: 'cag_only', needsRetrieval: false, requestedTools: [] },
    'routingMode',
    {
      enumerable: true,
      get() {
        throw new Error(CANARY);
      }
    }
  );
  assertValidationFailed(() =>
    collector.routingCompleted(throwingInput as Parameters<TraceCollector['routingCompleted']>[0])
  );

  const proxyInput = new Proxy(
    { routingMode: 'cag_only' as const, needsRetrieval: false, requestedTools: [] as const },
    {}
  );
  assertValidationFailed(() => collector.routingCompleted(proxyInput));

  const protoInput = JSON.parse(
    `{"routingMode":"cag_only","needsRetrieval":false,"requestedTools":[],"__proto__":{"secret":"${CANARY}"}}`
  );
  assertValidationFailed(() => collector.routingCompleted(protoInput));

  // Cross-stage field allowlist enforcement in STAGE_FIELDS / validateTrace
  assert.ok(Object.keys(STAGE_FIELDS).length === 8);
  assertValidationFailed(() =>
    validateTrace([
      {
        stage: 'routing',
        state: 'completed',
        elapsedMs: 1,
        routingMode: 'general',
        needsRetrieval: false,
        reservedMicros: 100
      }
    ])
  );
  assertValidationFailed(() =>
    validateTrace([
      {
        stage: 'mcp',
        state: 'started',
        elapsedMs: 1,
        mcpMethod: 'initialize',
        routingMode: 'general'
      }
    ])
  );

  // Seeded deterministic property check (seed = 0xA2020261)
  let seed = 0xa2020261;
  const nextRand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  const stageList = Object.keys(STAGE_FIELDS);
  for (let i = 0; i < 120; i += 1) {
    const stage = stageList[nextRand() % stageList.length];
    const hostilePoint = {
      stage,
      state: 'completed',
      elapsedMs: nextRand() % 100,
      indexVersion: `${CANARY}-${i}`,
      extraCanary: CANARY
    };
    assertValidationFailed(
      () => validateTrace([hostilePoint]),
      `Seed=0xA2020261 iteration=${i} stage=${stage}`
    );
  }

  assert.ok(!JSON.stringify(collector.frames()).includes(CANARY));
  assert.ok(!JSON.stringify(collector.snapshot()).includes(CANARY));
});
