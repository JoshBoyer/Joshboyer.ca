'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const chat = require('../dist/chat-assistant.js');
const contracts = require('../chat/contracts/index.cjs');
const corpus = require('../chat/knowledge/corpus.json');
const { clientEvidence } = require('../tools/build-chat-client.cjs');
const evidence = clientEvidence(corpus);
const requestId = '11111111-1111-4111-8111-111111111111';
const generation = '22222222-2222-4222-8222-222222222222';
const jsonResponse = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const config = {
  schemaVersion: '1.0.0', available: true,
  capabilities: { chat: true, cag: true, rag: false, mcp: false, voice: false },
  limits: { maxMessageBytes: 8192, maxTurns: 8, maxToolsPerTurn: 0, turnDeadlineMs: 60000 }
};
const session = { schemaVersion: '1.0.0', generation, expiresAt: Date.now() + 3600000, remainingTurns: 8 };
function frames() {
  const answer = contracts.renderAnswer({ schemaVersion: '1.0.0', corpusVersion: corpus.corpusVersion, claimIds: [corpus.claims[0].id], noticeCodes: [] }, corpus);
  return [
    { event: 'status', data: { code: 'accepted' } },
    { event: 'answer_block', data: answer.blocks[0] },
    { event: 'sources', data: { corpusVersion: corpus.corpusVersion, sources: answer.sources } },
    { event: 'done', data: { outcome: 'completed' } }
  ].map((value, index) => ({ schemaVersion: '1.0.0', requestId, generation, seq: index + 1, ...value }));
}
function validator() { return chat.createEventValidator({ requestId, generation, evidence }); }
function streamResponse(value = frames(), options = {}) {
  let encoded = value.map(frame => `event: ${frame.event}\ndata: ${JSON.stringify(frame)}\n\n`).join('');
  if (options.crlf) encoded = encoded.replaceAll('\n', '\r\n');
  const bytes = new TextEncoder().encode(encoded);
  return new Response(new ReadableStream({ start(controller) {
    const width = options.width || bytes.length;
    for (let offset = 0; offset < bytes.length; offset += width) controller.enqueue(bytes.slice(offset, offset + width));
    controller.close();
  } }), { headers: { 'Content-Type': 'text/event-stream; charset=utf-8' } });
}

function traceFrames() {
  const trace = [
    { stage: 'context', state: 'completed', elapsedMs: 2, corpusVersion: corpus.corpusVersion, claimCount: corpus.claims.length },
    { stage: 'budget', state: 'completed', elapsedMs: 5, reservedMicros: 3200, priceVersion: 'prices-v1' },
    { stage: 'provider', state: 'started', elapsedMs: 7, attempt: 1, provider: 'openai', model: 'gpt-6-luna' },
    { stage: 'provider', state: 'completed', elapsedMs: 307, durationMs: 300, attempt: 1, provider: 'openai', model: 'gpt-6-luna',
      usageStatus: 'known', inputTokens: 1250, outputTokens: 60, cacheReadInputTokens: 1200, cacheWriteInputTokens: null,
      reasoningOutputTokens: 0, providerRequestId: 'req_example123', gatewayRequestId: 'gateway-123' },
    { stage: 'validation', state: 'started', elapsedMs: 307, attempt: 1 },
    { stage: 'validation', state: 'completed', elapsedMs: 309, durationMs: 2, attempt: 1, claimCount: 1 },
    { stage: 'settlement', state: 'completed', elapsedMs: 315, durationMs: 6, reservedMicros: 3200, chargedMicros: 450, priceVersion: 'prices-v1', usageStatus: 'known' }
  ];
  return [...trace.map(data => ({ event: 'trace', data })), ...frames().slice(1).map(({ event, data }) => ({ event, data }))]
    .map((value, index) => ({ schemaVersion: '1.0.0', requestId, generation, seq: index + 1, ...value }));
}

class TestNode {
  constructor(tag) { this.tag = tag; this.children = []; this.textContent = ''; this.attributes = {}; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute(name, value) { this.attributes[name] = value; }
  set innerHTML(_) { throw new Error('HTML injection sink'); }
}
const testDocument = () => ({ createElement: tag => new TestNode(tag) });
const nodeText = node => [node.textContent, ...node.children.map(nodeText)].join(' ');

test('browser projection contains exactly canonical public display fields and is fresh', () => {
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(__dirname, '../dist/chat-evidence.json'), 'utf8')), evidence);
  assert.equal(evidence.claims.length, corpus.claims.length);
  assert.deepEqual(Object.keys(evidence).sort(), ['schemaVersion', 'corpusVersion', 'claims', 'sources', 'notices', 'pageContexts'].sort());
  assert.doesNotMatch(JSON.stringify(evidence), /inputPath|reviewedSourceCommit|knowledge\/|source-documents|\.env/);
  for (const claim of evidence.claims) {
    assert.equal(contracts.validate('claimBlock', claim).valid, true);
  }
});

test('browser validator accepts the shared contract frames and snapshots trusted evidence', () => {
  const copied = structuredClone(evidence);
  const check = chat.createEventValidator({ requestId, generation, evidence: copied });
  copied.claims[0].text = 'changed after validation';
  for (const frame of frames()) check.accept(frame);
  assert.equal(check.terminal, true);
  assert.throws(() => check.accept(frames()[0]));
});

test('browser rejects fabricated words with a valid claim ID, unsafe links, unknown fields and stale receipts', () => {
  const original = frames();
  for (const corrupt of [
    event => { event.data.text += ' Certified AWS architect.'; },
    event => { event.data.title = 'Chief architect'; },
    event => { event.data.extra = '<script>throw 1</script>'; },
    event => { event.data.qualificationNotes = []; }
  ]) {
    const check = validator(), changed = structuredClone(original[1]); corrupt(changed);
    check.accept(original[0]); assert.throws(() => check.accept(changed));
  }
  const check = validator(); check.accept(original[0]); check.accept(original[1]);
  const changed = structuredClone(original[2]); changed.data.sources[0].url = 'javascript:alert(1)';
  assert.throws(() => check.accept(changed));
  changed.data.sources = original[2].data.sources; changed.data.corpusVersion = `sha256:${'0'.repeat(64)}`;
  assert.throws(() => check.accept(changed));
});

test('browser enforces generation, sequence, no late frames and no unavailable tools', () => {
  const original = frames();
  assert.throws(() => validator().accept({ ...original[0], seq: 2 }));
  assert.throws(() => validator().accept({ ...original[0], generation: requestId }));
  assert.throws(() => validator().accept({ ...original[0], event: 'tool_start', data: { name: 'search_public_evidence', toolCallId: 'tool-1' } }));
  const check = validator(); check.revoke(); assert.throws(() => check.accept(original[0]));
  const missingSources = validator(); missingSources.accept(original[0]); missingSources.accept(original[1]);
  assert.throws(() => missingSources.accept({ ...original[3], seq: 3 }));
});

test('browser trace validation accepts the shared contract and preserves actual measurements', async () => {
  const current = traceFrames(), browserCheck = validator();
  const serverCheck = contracts.createEventValidator({ requestId, generation, corpus });
  for (const frame of current) {
    serverCheck.accept(frame);
    assert.deepEqual(browserCheck.accept(frame), frame);
  }
  const received = [];
  await chat.readEventStream(streamResponse(current, { width: 7 }), { validator: validator(), onEvent: frame => received.push(frame) });
  assert.deepEqual(received, current);
});

test('trace data rejects extra payloads, missing details, invalid models, cost overflow and fabricated timing', () => {
  const valid = traceFrames()[3].data;
  for (const changed of [
    { ...valid, prompt: 'untrusted private text' }, { ...valid, headers: { authorization: 'secret' } },
    { ...valid, inputTokens: 1000001 }, { ...valid, cacheReadInputTokens: '1200' },
    { ...valid, model: 'unexpected-model' }, { ...valid, provider: 'anthropic' },
    { ...valid, providerRequestId: '<img src=x>' }, { ...valid, gatewayRequestId: 'x'.repeat(129) },
    { ...valid, elapsedMs: -1 }, { ...valid, elapsedMs: 100, durationMs: 101 },
    { ...valid, elapsedMs: null }, { ...valid, elapsedMs: null, replayed: false },
    { stage: 'provider', state: 'started', elapsedMs: 0 },
    { stage: 'context', state: 'completed', elapsedMs: 0 },
    { stage: 'budget', state: 'completed', elapsedMs: 0, reservedMicros: 1 },
    { stage: 'settlement', state: 'completed', elapsedMs: 0, reservedMicros: 10, chargedMicros: 11, priceVersion: 'v1' },
    { stage: 'budget', state: 'completed', elapsedMs: 0, reservedMicros: 25000001, priceVersion: 'v1' }
  ]) assert.throws(() => chat.validateTraceData(changed));
  const replay = { ...valid, elapsedMs: null, replayed: true };
  assert.deepEqual(chat.validateTraceData(replay), replay);
});

test('trace stages reject time reversal, terminal duplication, unstarted providers and late output', () => {
  const first = traceFrames()[0];
  const check = validator(); check.accept(first);
  assert.throws(() => check.accept({ ...traceFrames()[1], data: { ...traceFrames()[1].data, elapsedMs: 1 } }));
  assert.throws(() => check.accept({ ...first, seq: 2 }));
  assert.throws(() => validator().accept({ ...traceFrames()[3], seq: 1 }));
  const afterAnswer = validator(); afterAnswer.accept(frames()[0]); afterAnswer.accept(frames()[1]);
  assert.throws(() => afterAnswer.accept({ ...first, seq: 3 }));
  const afterSources = validator(); for (const item of frames().slice(0, 3)) afterSources.accept(item);
  assert.throws(() => afterSources.accept({ ...first, seq: 4 }));
  const afterDone = validator(); for (const item of frames()) afterDone.accept(item);
  assert.throws(() => afterDone.accept({ ...first, seq: 5 }));
});

test('unfinished trace stages cannot publish answers or successful completion; cancellation and errors remain valid', () => {
  const started = { ...traceFrames()[2], seq: 1 };
  const answer = { ...frames()[1], seq: 2 };
  const done = { ...frames()[3], seq: 2 };
  const check = validator(); check.accept(started);
  assert.throws(() => check.accept(answer));
  assert.throws(() => check.accept(done));
  const server = contracts.createEventValidator({ requestId, generation, corpus }); server.accept(started);
  assert.throws(() => server.accept(answer));
  const cancelled = validator(); cancelled.accept(started);
  assert.doesNotThrow(() => cancelled.accept({ ...done, data: { outcome: 'cancelled' } }));
  const errored = validator(); errored.accept(started);
  assert.doesNotThrow(() => errored.accept({ ...done, event: 'error', data: { code: 'upstream_failure', retryable: true } }));
});

test('fallback provider and validation attempts stay separate and replayed settlement has no invented time', () => {
  const check = validator();
  const data = [
    { stage: 'provider', state: 'started', elapsedMs: 0, provider: 'openai', model: 'gpt-6-luna', attempt: 1 },
    { stage: 'provider', state: 'completed', elapsedMs: 20, provider: 'openai', model: 'gpt-6-luna', attempt: 1 },
    { stage: 'validation', state: 'started', elapsedMs: 20, attempt: 1 },
    { stage: 'validation', state: 'failed', elapsedMs: 21, attempt: 1, code: 'validation_failed' },
    { stage: 'provider', state: 'started', elapsedMs: 22, provider: 'anthropic', model: 'claude-haiku-5-5', attempt: 2 },
    { stage: 'provider', state: 'completed', elapsedMs: 50, provider: 'anthropic', model: 'claude-haiku-5-5', attempt: 2 },
    { stage: 'validation', state: 'started', elapsedMs: 50, attempt: 2 },
    { stage: 'validation', state: 'completed', elapsedMs: 51, attempt: 2 },
    { stage: 'settlement', state: 'completed', elapsedMs: null, replayed: true, reservedMicros: 3000, chargedMicros: 900, priceVersion: 'v1' }
  ];
  const timeline = chat.createRequestTimeline(testDocument());
  for (const [index, value] of data.entries()) {
    const frame = { schemaVersion: '1.0.0', requestId, generation, seq: index + 1, event: 'trace', data: value };
    check.accept(frame); timeline.accept(frame);
  }
  timeline.finish('completed');
  const text = nodeText(timeline.element);
  assert.match(text, /Model request · attempt 1/); assert.match(text, /Model request · attempt 2/);
  assert.match(text, /Answer validation · attempt 1/); assert.match(text, /Answer validation · attempt 2/);
  assert.match(text, /Recorded on original request/); assert.match(text, /Replayed from the original request/);
  assert.match(text, /Complete · recorded run/);
});

test('request timeline presents actual tokens, cache usage, costs, identifiers and local disclosure controls', () => {
  const timeline = chat.createRequestTimeline(testDocument());
  timeline.identify(requestId);
  for (const frame of traceFrames().filter(frame => frame.event === 'trace')) timeline.accept(frame);
  timeline.finish('completed');
  const text = nodeText(timeline.element);
  for (const expected of ['Request activity', requestId, 'OpenAI', 'gpt-6-luna', 'Gateway + model duration', '300 ms', '1,250', '1,200',
    'Cache read tokens', 'Cache write tokens', 'Not reported', 'Reasoning tokens', 'req_example123', 'gateway-123',
    'Reserved allowance (USD)', '0.0032', 'Settled allowance (USD)', '0.00045', corpus.corpusVersion]) assert.ok(text.includes(expected), expected);
  const disclosures = [];
  function collect(node) { if (node.tag === 'details') disclosures.push(node); node.children.forEach(collect); }
  collect(timeline.element);
  assert.equal(disclosures.length, 6);
  assert.equal(timeline.element.open, true);
  assert.equal(timeline.element.attributes['aria-live'], 'off');
  assert.throws(() => timeline.accept(traceFrames()[0]));
  const old = chat.createRequestTimeline(testDocument()); old.finish('completed');
  assert.equal(old.element.open, false); assert.match(nodeText(old.element), /No trace recorded/);
});

test('unknown trace usage stays unknown rather than being rendered as zero tokens', () => {
  const timeline = chat.createRequestTimeline(testDocument());
  timeline.accept({ ...traceFrames()[2], data: { ...traceFrames()[2].data, usageStatus: 'unknown', inputTokens: null, outputTokens: null } });
  const text = nodeText(timeline.element);
  assert.match(text, /Not reported; reservation remains counted/);
  assert.match(text, /Input tokens Not reported/);
  assert.doesNotMatch(text, /Input tokens 0/);
});

test('provider allowance is explicitly an estimate until a completed settlement is reported', () => {
  const timeline = chat.createRequestTimeline(testDocument());
  timeline.accept({ ...traceFrames()[3], data: { ...traceFrames()[3].data, reservedMicros: 3200, chargedMicros: 450 } });
  const estimated = nodeText(timeline.element);
  assert.match(estimated, /Estimated usage allowance \(USD\) 0\.00045/);
  assert.doesNotMatch(estimated, /Settled allowance/);
  timeline.accept(traceFrames()[6]);
  assert.match(nodeText(timeline.element), /Settled allowance \(USD\) 0\.00045/);
});

test('SSE parser handles split UTF-8 and CRLF frames, rejecting incomplete and oversized streams', async () => {
  const accepted = [];
  await chat.readEventStream(streamResponse(frames(), { width: 1, crlf: true }), { validator: validator(), onEvent: event => accepted.push(event) });
  assert.deepEqual(accepted, frames());
  await assert.rejects(chat.readEventStream(streamResponse(frames().slice(0, 2)), { validator: validator(), onEvent() {} }));
  const oversized = new Response(`data: ${'a'.repeat(65537)}`, { headers: { 'Content-Type': 'text/event-stream' } });
  await assert.rejects(chat.readEventStream(oversized, { validator: validator(), onEvent() {} }));
  const wrong = new Response('event: error\ndata: ' + JSON.stringify(frames()[0]) + '\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
  await assert.rejects(chat.readEventStream(wrong, { validator: validator(), onEvent() {} }));
});

test('client sends only the declared message and retries an interrupted request with the same ID', async () => {
  const sent = [];
  let attempt = 0;
  const client = chat.createClient({ uuid: () => requestId, fetchImpl: async (url, options) => {
    if (url.endsWith('/config')) return jsonResponse(config);
    if (url === '/chat-evidence.json') return jsonResponse(evidence);
    if (url.endsWith('/session')) return jsonResponse(session);
    assert.equal(url, '/api/chat/messages'); sent.push(options);
    return streamResponse(++attempt === 1 ? frames().slice(0, 2) : frames());
  } });
  await client.initialise();
  await assert.rejects(client.send('Tell me about Josh.', () => {}, '#projects/dell'));
  assert.equal(sent.length, 1); assert.equal(client.canRetry, true);
  await client.retry(() => {});
  assert.equal(sent.length, 2); assert.equal(sent[0].body, sent[1].body);
  assert.deepEqual(JSON.parse(sent[0].body), { schemaVersion: '1.0.0', requestId, text: 'Tell me about Josh.', pageContext: '#projects/dell' });
  assert.equal(sent[0].credentials, 'same-origin'); assert.equal(sent[0].redirect, 'error');
  assert.equal(client.canRetry, false);
});

test('client rejects oversized UTF-8 before inference and expired sessions without reissuing credentials', async () => {
  const calls = [];
  const client = chat.createClient({ uuid: () => requestId, now: () => session.expiresAt + 1, fetchImpl: async url => {
    calls.push(url);
    if (url.endsWith('/config')) return jsonResponse(config);
    if (url === '/chat-evidence.json') return jsonResponse(evidence);
    return jsonResponse(session);
  } });
  await client.initialise();
  await assert.rejects(client.send('é'.repeat(4097), () => {}), { code: 'invalid_request' });
  await assert.rejects(client.send('Hello', () => {}), { code: 'session_expired' });
  assert.equal(calls.filter(url => url.endsWith('/session')).length, 1);
  assert.equal(calls.includes('/api/chat/messages'), false);
});

test('client recognises running retries and structured budget errors without a new request ID', async () => {
  let attempt = 0;
  const payloads = [];
  const client = chat.createClient({ uuid: () => requestId, fetchImpl: async (url, options) => {
    if (url.endsWith('/config')) return jsonResponse(config);
    if (url === '/chat-evidence.json') return jsonResponse(evidence);
    if (url.endsWith('/session')) return jsonResponse(session);
    payloads.push(options.body);
    return ++attempt === 1
      ? jsonResponse({ schemaVersion: '1.0.0', requestId, generation, status: 'running' }, 202)
      : jsonResponse({ schemaVersion: '1.0.0', error: { code: 'budget_exhausted', retryable: false } }, 429);
  } });
  await client.initialise();
  await assert.rejects(client.send('Hello', () => {}), { code: 'request_conflict', status: 202 });
  assert.equal(client.canRetry, true);
  await assert.rejects(client.retry(() => {}), { code: 'budget_exhausted', status: 429 });
  assert.equal(payloads[0], payloads[1]);
});

test('clear revokes a pending stream immediately and rejects late browser output', async () => {
  let continueStream, reachedMessage;
  const messageStarted = new Promise(resolve => { reachedMessage = resolve; });
  const unblock = new Promise(resolve => { continueStream = resolve; });
  const displayed = [];
  const calls = [];
  const client = chat.createClient({ uuid: () => requestId, fetchImpl: async (url, options) => {
    calls.push([url, options]);
    if (url.endsWith('/config')) return jsonResponse(config);
    if (url === '/chat-evidence.json') return jsonResponse(evidence);
    if (url.endsWith('/session')) return jsonResponse(options.method === 'DELETE' ? { schemaVersion: '1.0.0', cleared: true } : session);
    reachedMessage(); await unblock; return streamResponse();
  } });
  await client.initialise();
  const sending = client.send('Hello', frame => displayed.push(frame));
  await messageStarted; await client.clear(); continueStream();
  await assert.rejects(sending, { name: 'AbortError' });
  assert.equal(displayed.length, 0); assert.equal(client.session, null); assert.equal(client.canRetry, false);
  assert.deepEqual(JSON.parse(calls.find(([, options]) => options.method === 'DELETE')[1].body), {});
});

test('clear prevents a late session response from reviving its generation', async () => {
  let release, started;
  const entered = new Promise(resolve => { started = resolve; });
  const response = new Promise(resolve => { release = resolve; });
  const client = chat.createClient({ fetchImpl: async (url, options) => {
    if (url.endsWith('/config')) return jsonResponse(config);
    if (url === '/chat-evidence.json') return jsonResponse(evidence);
    if (options.method === 'DELETE') return jsonResponse({ schemaVersion: '1.0.0', cleared: true });
    started(); await response; return jsonResponse(session);
  } });
  const initialising = client.initialise();
  await entered; await client.clear(); release();
  await assert.rejects(initialising, { name: 'AbortError' }); assert.equal(client.session, null);
});

test('cancel posts the owned request ID and does not silently replay inference', async () => {
  let started;
  const entered = new Promise(resolve => { started = resolve; });
  const calls = [];
  const client = chat.createClient({ uuid: () => requestId, fetchImpl: async (url, options) => {
    calls.push(url);
    if (url.endsWith('/config')) return jsonResponse(config);
    if (url === '/chat-evidence.json') return jsonResponse(evidence);
    if (url.endsWith('/session')) return jsonResponse(session);
    if (url.endsWith('/cancel')) return jsonResponse({ schemaVersion: '1.0.0', requestId, status: 'requested' });
    started();
    return new Response(new ReadableStream({ pull() { return new Promise(() => {}); } }), { headers: { 'Content-Type': 'text/event-stream' } });
  } });
  await client.initialise(); const sending = client.send('Hello', () => {});
  await entered; await client.cancel();
  await assert.rejects(sending, { name: 'AbortError' });
  assert.equal(calls.filter(url => url === '/api/chat/messages').length, 1);
  assert.equal(calls.at(-1), `/api/chat/requests/${requestId}/cancel`);
});

test('cancel then terminal-only retry preserves the last reported trace and the original request', async () => {
  const document = testDocument(), original = chat.createAnswerView(document);
  const payloads = [];
  let reported, simulatedProviderDispatches = 0;
  const partialReported = new Promise(resolve => { reported = resolve; });
  const partial = traceFrames().slice(0, 3);
  const client = chat.createClient({ uuid: () => requestId, fetchImpl: async (url, options) => {
    if (url.endsWith('/config')) return jsonResponse(config);
    if (url === '/chat-evidence.json') return jsonResponse(evidence);
    if (url.endsWith('/session')) return jsonResponse(session);
    if (url.endsWith('/cancel')) return jsonResponse({ schemaVersion: '1.0.0', requestId, status: 'requested' });
    payloads.push(options.body);
    if (payloads.length === 1) {
      simulatedProviderDispatches += 1;
      return new Response(new ReadableStream({
        start(controller) {
          for (const frame of partial) controller.enqueue(new TextEncoder().encode(`event: ${frame.event}\ndata: ${JSON.stringify(frame)}\n\n`));
        },
        pull() { return new Promise(() => {}); }
      }), { headers: { 'Content-Type': 'text/event-stream' } });
    }
    // The server's cancelled request ledger returns a terminal receipt only.
    return streamResponse([{ schemaVersion: '1.0.0', requestId, generation, seq: 1, event: 'done', data: { outcome: 'cancelled' } }]);
  } });
  await client.initialise();
  const sending = client.send('Tell me about the work.', frame => {
    original.accept(frame); if (frame.seq === 3) reported();
  });
  await partialReported; await client.cancel();
  await assert.rejects(sending, { name: 'AbortError' }); original.fail('cancelled');
  const priorElement = original.element;
  const retry = chat.createAnswerView(document, original);
  assert.equal(retry.element, priorElement);
  await client.retry(frame => retry.accept(frame));
  assert.equal(retry.element, priorElement);
  const text = nodeText(retry.element);
  for (const expected of ['Approved context', 'Spending reservation', 'Model request', 'gpt-6-luna', 'Stopped · last reported activity']) assert.ok(text.includes(expected), expected);
  assert.doesNotMatch(text, /No trace recorded|chat-answer-block/);
  assert.equal(retry.view.timeline.outcome, 'cancelled');
  assert.equal(simulatedProviderDispatches, 1);
  assert.equal(payloads.length, 2); assert.equal(payloads[0], payloads[1]);
  assert.equal(client.canRetry, false);
  const cancelled = validator(); cancelled.accept({ schemaVersion: '1.0.0', requestId, generation, seq: 1, event: 'done', data: { outcome: 'cancelled' } });
  assert.throws(() => cancelled.accept({ ...frames()[1], seq: 2 }));
});

test('a completed replay replaces the previous view and never duplicates trace points or answers', () => {
  const document = testDocument(), original = chat.createAnswerView(document);
  for (const frame of traceFrames()) original.accept(frame);
  const priorElement = original.element;
  const replay = chat.createAnswerView(document, original);
  assert.equal(replay.element, priorElement);
  for (const frame of traceFrames()) replay.accept(frame.event === 'trace' ? { ...frame, data: { ...frame.data, replayed: true } } : frame);
  assert.notEqual(replay.element, priorElement);
  function countClass(node, className) {
    return (node.className === className ? 1 : 0) + node.children.reduce((sum, child) => sum + countClass(child, className), 0);
  }
  assert.equal(countClass(replay.element, 'chat-trace-points'), 5);
  assert.equal(countClass(replay.element, 'chat-answer-block chat-answer-claim'), 1);
  assert.equal(nodeText(replay.element).split('req_example123').length - 1, 1);
  assert.match(nodeText(replay.element), /Complete · recorded run/);
});

test('safe rendering treats even markup-shaped canonical text as text', () => {
  class Node {
    constructor(tag) { this.tag = tag; this.children = []; this.textContent = ''; }
    append(...nodes) { this.children.push(...nodes); }
    set innerHTML(_) { throw new Error('HTML injection sink'); }
  }
  const document = { createElement: tag => new Node(tag) };
  const block = { ...evidence.claims[0], text: '<img src=x onerror=alert(1)>', qualificationNotes: ['<script>bad()</script>'] };
  const rendered = chat.renderBlock(document, block);
  assert.equal(rendered.children[2].textContent, block.text);
  assert.equal(rendered.children[3].children[0].textContent, block.qualificationNotes[0]);
  assert.throws(() => chat.renderSources(document, [{ id: 'source-x', url: 'javascript:alert(1)' }]));
  const sources = chat.renderSources(document, evidence.sources.slice(0, 1));
  assert.equal(sources.children[1].rel, 'noopener noreferrer');
});
