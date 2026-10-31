'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validate, createEventValidator, renderAnswer, SCHEMA_VERSION } = require('../chat/contracts/index.cjs');
const corpus = require('../chat/knowledge/corpus.json');
const tsx = require('../services/chat/node_modules/tsx/dist/cjs/api/index.cjs');
const { STAGE_FIELDS, TraceCollector, validateTrace } = tsx.require('../services/chat/src/trace.ts', __filename);

const requestId = '11111111-1111-4111-8111-111111111111';
const generation = '22222222-2222-4222-8222-222222222222';
const canary = 'CANARY-A20-TRACE-SECRET';
const provider = (state, elapsedMs, extra = {}) => ({stage:'provider',state,elapsedMs,attempt:1,provider:'openai',model:'gpt-6-luna',...extra});
const frame = (seq, data, event = 'trace') => ({schemaVersion:SCHEMA_VERSION,requestId,generation,seq,event,data});
const validator = () => createEventValidator({requestId,generation,corpus});

test('trace schema accepts bounded public metadata and rejects private/freeform fields', () => {
  assert.equal(validate('traceData', provider('completed', 120, {durationMs:100,inputTokens:2000,outputTokens:80,usageStatus:'known',providerRequestId:'req_example'})).valid, true);
  for (const extra of [{prompt:'secret'}, {headers:{}}, {reasoning:'private'}, {durationMs:-1}, {inputTokens:1.5},
    {providerRequestId:'https://example.com/key'}, {code:'private stack trace'}, {attempt:3}, {model:'unapproved-model'}, {elapsedMs:60001}]) {
    assert.equal(validate('traceData', provider('completed',120,extra)).valid,false);
  }
});

test('trace stage-specific receipts and replay timing are explicit', () => {
  assert.equal(validate('traceData',{stage:'context',state:'completed',elapsedMs:5}).valid,false);
  assert.equal(validate('traceData',{stage:'budget',state:'completed',elapsedMs:5}).valid,false);
  assert.equal(validate('traceData',{stage:'settlement',state:'completed',elapsedMs:null,reservedMicros:100,chargedMicros:50,priceVersion:'v1'}).valid,false);
  assert.equal(validate('traceData',{stage:'settlement',state:'completed',elapsedMs:null,replayed:true,reservedMicros:100,chargedMicros:50,priceVersion:'v1'}).valid,true);
});

test('trace stages require proper transitions and monotonic observed timing', () => {
  const stream = validator();
  assert.throws(()=>stream.accept(frame(1,provider('completed',10))));
  stream.accept(frame(1,provider('started',10)));
  assert.throws(()=>stream.accept(frame(2,provider('started',15))));
  assert.throws(()=>stream.accept(frame(2,provider('completed',9))));
  assert.throws(()=>stream.accept(frame(2,provider('completed',20,{durationMs:21}))));
  assert.throws(()=>stream.accept(frame(2,provider('completed',20,{provider:'anthropic'}))));
  stream.accept(frame(2,provider('completed',20,{durationMs:10})));
  assert.throws(()=>stream.accept(frame(3,provider('failed',25))));
});

test('traces cannot assert excess settlement or follow canonical answers, terminal events or clear', () => {
  const stream = validator();
  assert.throws(()=>stream.accept(frame(1,{stage:'settlement',state:'completed',elapsedMs:20,reservedMicros:100,chargedMicros:101,priceVersion:'v1'})));
  const answer = renderAnswer({schemaVersion:SCHEMA_VERSION,corpusVersion:corpus.corpusVersion,claimIds:[corpus.claims[0].id],noticeCodes:[]},corpus);
  stream.accept(frame(1,answer.blocks[0],'answer_block'));
  assert.throws(()=>stream.accept(frame(2,provider('started',20))));
  const closed = validator(); closed.accept(frame(1,{code:'unavailable',retryable:true},'error'));
  assert.throws(()=>closed.accept(frame(2,provider('started',20))));
  const revoked = validator(); revoked.revoke(); assert.throws(()=>revoked.accept(frame(1,provider('started',20))));
});

test('trace identity is bound to the same request and generation as the answer', () => {
  const stream = validator();
  assert.throws(()=>stream.accept({...frame(1,provider('started',0)),requestId:generation}));
  assert.throws(()=>stream.accept({...frame(1,provider('started',0)),generation:requestId}));
  stream.accept(frame(1,provider('started',0)));
});

test('canonical answer cannot pass while a measured stage remains running', () => {
  const stream = validator();
  stream.accept(frame(1,provider('started',0)));
  const answer = renderAnswer({schemaVersion:SCHEMA_VERSION,corpusVersion:corpus.corpusVersion,claimIds:[corpus.claims[0].id],noticeCodes:[]},corpus);
  assert.throws(()=>stream.accept(frame(2,answer.blocks[0],'answer_block')));
  stream.accept(frame(2,provider('completed',5,{durationMs:5})));
  stream.accept(frame(3,answer.blocks[0],'answer_block'));
});

test('8-stage TraceCollector lifecycle with repeatable mcp calls and fallback attempts validates end-to-end', () => {
  let clock = 1000;
  const collector = new TraceCollector({
    requestId,
    generation,
    now: () => clock,
    corpusVersion: corpus.corpusVersion
  });

  clock += 2;
  collector.routingCompleted({
    routingMode: 'rag_and_mcp',
    needsRetrieval: true,
    requestedTools: ['search_public_evidence', 'get_case_study']
  });

  clock += 3;
  collector.retrievalStarted({
    retrievalMode: 'hybrid',
    indexVersion: 'idx-2026-10-31',
    embeddingModel: 'text-embedding-3-small'
  });
  clock += 20;
  collector.retrievalCompleted({
    indexVersion: 'idx-2026-10-31',
    retrievalMode: 'hybrid',
    embeddingModel: 'text-embedding-3-small',
    matchedCount: 2,
    claimIds: [corpus.claims[0].id, corpus.claims[1].id],
    sourceIds: [corpus.sources[0].id]
  });

  clock += 1;
  collector.mcpStarted({ mcpMethod: 'initialize' });
  clock += 5;
  collector.mcpCompleted({ mcpMethod: 'initialize', toolOutcome: 'completed' });

  clock += 1;
  collector.mcpStarted({ mcpMethod: 'tools/call', toolCallId: 'tool-1', toolName: 'search_public_evidence', attempt: 1 });
  clock += 12;
  collector.mcpCompleted({ mcpMethod: 'tools/call', toolCallId: 'tool-1', toolName: 'search_public_evidence', toolOutcome: 'matched', attempt: 1 });

  clock += 1;
  collector.mcpStarted({ mcpMethod: 'tools/call', toolCallId: 'tool-2', toolName: 'get_case_study', attempt: 1 });
  clock += 15;
  collector.mcpCompleted({ mcpMethod: 'tools/call', toolCallId: 'tool-2', toolName: 'get_case_study', toolOutcome: 'completed', attempt: 1 });

  clock += 2;
  collector.contextCompleted({ corpusVersion: corpus.corpusVersion, claimCount: 7 });
  clock += 2;
  collector.budgetCompleted({ reservedMicros: 21608, priceVersion: '2026-10-31-standard-conversation-v2' });

  clock += 1;
  collector.providerStarted({ attempt: 1, provider: 'openai', model: 'gpt-6-luna', reservedMicros: 10804 });
  clock += 30;
  collector.providerFailed({ attempt: 1, provider: 'openai', model: 'gpt-6-luna', chargedMicros: 10804, usageStatus: 'unknown', code: 'upstream_failure' });

  clock += 1;
  collector.providerStarted({ attempt: 2, provider: 'anthropic', model: 'claude-haiku-5-5', reservedMicros: 10804 });
  clock += 40;
  collector.providerCompleted({ attempt: 2, provider: 'anthropic', model: 'claude-haiku-5-5', chargedMicros: 180, usageStatus: 'known', inputTokens: 800, outputTokens: 45 });

  clock += 1;
  collector.validationStarted({ attempt: 1, provider: 'openai', model: 'gpt-6-luna' });
  clock += 2;
  collector.validationFailed({ attempt: 1, provider: 'openai', model: 'gpt-6-luna', code: 'validation_failed' });

  clock += 1;
  collector.validationStarted({ attempt: 2, provider: 'anthropic', model: 'claude-haiku-5-5' });
  clock += 2;
  collector.validationCompleted({ attempt: 2, provider: 'anthropic', model: 'claude-haiku-5-5', corpusVersion: corpus.corpusVersion, claimCount: 1 });

  clock += 3;
  collector.settlementCompleted({ reservedMicros: 21608, chargedMicros: 10984, priceVersion: '2026-10-31-standard-conversation-v2' });

  const stream = validator();
  for (const item of collector.frames()) {
    assert.equal(stream.accept(item), true);
  }

  const replayed = collector.replayFrames();
  assert.equal(replayed.length, collector.frames().length);
  assert.ok(replayed.every(item => item.data.replayed === true));
  const replayStream = validator();
  for (const item of replayed) {
    assert.equal(replayStream.accept(item), true);
  }
});

test('cag_only turn with skipped retrieval and 3-point boundaries (elapsedMs 0/60000/60001, matchedCount 0/14/15) and canary rejection', () => {
  let clock = 500;
  const cagCollector = new TraceCollector({ requestId, generation, now: () => clock });
  cagCollector.routingCompleted({ routingMode: 'cag_only', needsRetrieval: false, requestedTools: [] });
  const skipped = cagCollector.retrievalSkipped({ retrievalMode: 'cag_fallback', indexVersion: 'idx-v1' });
  assert.equal(skipped.data.retrievalMode, 'skipped');
  assert.equal(skipped.data.matchedCount, 0);
  assert.throws(() => cagCollector.retrievalCompleted({ indexVersion: 'idx-v1', retrievalMode: 'hybrid', matchedCount: 1 }));
  assert.throws(() => cagCollector.mcpCompleted({ mcpMethod: 'initialize', toolOutcome: 'completed' }));

  for (const [elapsedMs, ok] of [[-1, false], [0, true], [1, true], [59999, true], [60000, true], [60001, false]]) {
    const point = { stage: 'routing', state: 'completed', elapsedMs, routingMode: 'general', needsRetrieval: false };
    if (ok) assert.equal(validateTrace([point]).length, 1);
    else assert.throws(() => validateTrace([point]));
  }

  for (const [matchedCount, ok] of [[-1, false], [0, true], [1, true], [13, true], [14, true], [15, false]]) {
    const points = [
      { stage: 'retrieval', state: 'started', elapsedMs: 1, retrievalMode: 'hybrid', indexVersion: 'idx-1' },
      { stage: 'retrieval', state: 'completed', elapsedMs: 10, durationMs: 9, retrievalMode: 'hybrid', indexVersion: 'idx-1', matchedCount, corpusVersion: corpus.corpusVersion }
    ];
    if (ok) assert.equal(validateTrace(points).length, 2);
    else assert.throws(() => validateTrace(points));
  }

  assert.equal(Object.keys(STAGE_FIELDS).length, 8);
  const unstartedRetrievalCollector = new TraceCollector({ requestId, generation, now: () => clock });
  assert.throws(() => unstartedRetrievalCollector.retrievalCompleted({ indexVersion: 'idx-v1', retrievalMode: 'hybrid', matchedCount: 1 }));
  assert.throws(() => validateTrace([{ stage: 'routing', state: 'completed', elapsedMs: 1, routingMode: 'general', needsRetrieval: false, reservedMicros: 100 }]));
  assert.throws(() => validateTrace([{ stage: 'retrieval', state: 'started', elapsedMs: 1, retrievalMode: 'hybrid', indexVersion: canary }]));
  assert.throws(() => cagCollector.contextCompleted({ corpusVersion: corpus.corpusVersion, claimCount: 7, prompt: canary }));
  assert.throws(() => validateTrace([{ stage: 'routing', state: 'completed', elapsedMs: 1, routingMode: 'general', needsRetrieval: false, secret: canary }]));
  assert.ok(!JSON.stringify(cagCollector.frames()).includes(canary));
});
