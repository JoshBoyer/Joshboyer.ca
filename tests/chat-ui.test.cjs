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
  constructor(tag, document) { this.tag = tag; this.ownerDocument = document; this.children = []; this.textContent = ''; this.attributes = {}; this.events = {}; }
  append(...nodes) { for (const node of nodes) { node.remove(); this.children.push(node); node.parentNode = this; } }
  replaceChildren(...nodes) { for (const node of this.children) node.parentNode = null; this.children = []; this.append(...nodes); }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this); this.parentNode = null; }
  setAttribute(name, value) { this.attributes[name] = value; }
  hasAttribute(name) { return Object.hasOwn(this.attributes, name); }
  removeAttribute(name) { delete this.attributes[name]; }
  addEventListener(name, callback) { (this.events[name] ||= []).push(callback); }
  dispatch(name, event = {}) { for (const callback of this.events[name] || []) callback({ preventDefault() {}, ...event }); }
  focus() { this.ownerDocument.activeElement = this; }
  showModal() { this.open = true; }
  close() { this.open = false; this.dispatch('close'); }
  get isConnected() { return this.tag === 'body' || this.parentNode?.isConnected === true; }
  getAttribute(name) { return this.attributes[name] ?? null; }
  replaceWith(node) {
    if (!this.parentNode) return;
    const index = this.parentNode.children.indexOf(this);
    if (index !== -1) {
      node.remove();
      this.parentNode.children.splice(index, 1, node);
      node.parentNode = this.parentNode;
      this.parentNode = null;
    }
  }
  set innerHTML(_) { throw new Error('HTML injection sink'); }
  set outerHTML(_) { throw new Error('HTML injection sink'); }
  insertAdjacentHTML() { throw new Error('HTML injection sink'); }
}
const testDocument = (mobile = false) => {
  const media = { matches: mobile, addEventListener() {} };
  const document = { defaultView: { matchMedia: () => media } };
  document.createElement = tag => new TestNode(tag, document);
  document.body = document.createElement('body');
  return document;
};
const nodeText = node => [node.textContent, ...node.children.map(nodeText)].join(' ');
function descendants(node) { return [node, ...node.children.flatMap(descendants)]; }

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
  const text = nodeText(retry.view.timeline.element);
  for (const expected of ['Approved context', 'Spending reservation', 'Model request', 'gpt-6-luna', 'Stopped · last reported activity']) assert.ok(text.includes(expected), expected);
  assert.doesNotMatch(text, /No trace recorded|chat-answer-block/);
  assert.doesNotMatch(nodeText(retry.element), /Request activity|Spending reservation/);
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
  assert.equal(countClass(replay.view.timeline.element, 'chat-trace-points'), 5);
  assert.equal(countClass(replay.view.evidence, 'chat-answer-block chat-answer-claim'), 1);
  assert.equal(nodeText(replay.view.timeline.element).split('req_example123').length - 1, 1);
  assert.match(nodeText(replay.view.timeline.element), /Complete · recorded run/);
});

test('conversation is plain chat prose; canonical evidence and traces never appear inside the chat bubble', () => {
  const document = testDocument();
  const reply = chat.createAnswerView(document);
  const history = traceFrames();
  const conversation = { schemaVersion: '1.0.0', requestId, generation, seq: 8, event: 'conversation',
    data: { kind: 'portfolio', text: 'Josh has worked on insurance integrations.\n\nWould you like to explore that work?', suggestions: ['Tell me more.'] } };
  const events = [...history.slice(0, 7), conversation, ...history.slice(7).map(frame => ({ ...frame, seq: frame.seq + 1 }))];
  const validate = validator();
  for (const frame of events) { validate.accept(frame); reply.accept(frame); }
  const inline = nodeText(reply.element);
  assert.match(inline, /Josh has worked on insurance integrations/);
  assert.match(inline, /View details/);
  assert.doesNotMatch(inline, /Request activity|Gateway request ID|Spending reservation|PUBLIC SOURCES|Selected public portfolio evidence/);
  assert.ok(!descendants(reply.element).some(node => /chat-answer-block|chat-sources|chat-request-trace/.test(node.className || '')));
  assert.match(nodeText(reply.view.evidence), /Selected public portfolio evidence/);
  assert.match(nodeText(reply.view.timeline.element), /Gateway request ID/);
});

test('general responses permit empty portfolio references and honestly display their general-knowledge note in Evidence', () => {
  const notice = evidence.notices.find(value => value.code === 'general_knowledge');
  assert.ok(notice);
  const events = [
    { event: 'conversation', data: { kind: 'general', text: 'An API is a way for one program to ask another program for something.', suggestions: [] } },
    { event: 'answer_block', data: notice },
    { event: 'sources', data: { corpusVersion: evidence.corpusVersion, sources: [] } },
    { event: 'done', data: { outcome: 'completed' } }
  ].map((frame, index) => ({ schemaVersion: '1.0.0', requestId, generation, seq: index + 1, ...frame }));
  const reply = chat.createAnswerView(testDocument()), clientValidation = validator();
  const serverValidation = contracts.createEventValidator({ requestId, generation, corpus });
  for (const frame of events) { serverValidation.accept(frame); clientValidation.accept(frame); reply.accept(frame); }
  assert.match(nodeText(reply.element), /one program to ask another/);
  assert.doesNotMatch(nodeText(reply.element), /No live sources|No portfolio references|Request activity/);
  assert.match(nodeText(reply.view.evidence), /No portfolio references/);
  assert.match(nodeText(reply.view.evidence), /No live sources were retrieved/);
});

test('older canonical-only replies remain readable without inline evidence cards or trace data', () => {
  const reply = chat.createAnswerView(testDocument());
  for (const frame of frames()) reply.accept(frame);
  assert.ok(nodeText(reply.element).includes(evidence.claims[0].text));
  assert.ok(!descendants(reply.element).some(node => /chat-answer-block|chat-sources|chat-request-trace/.test(node.className || '')));
  assert.match(nodeText(reply.view.evidence), /Selected public portfolio evidence/);
  assert.match(nodeText(reply.view.timeline.element), /No trace recorded/);
});

test('conversation guards bound UTF-8, reject hidden payloads and prevent premature or duplicate narratives', () => {
  const valid = { kind: 'general', text: 'A useful answer.', suggestions: ['Show me an example.'] };
  for (const invalid of [
    { ...valid, hiddenPrompt: 'leak' }, { ...valid, kind: 'admin' }, { ...valid, text: 'é'.repeat(3001) },
    { ...valid, text: ' ' }, { ...valid, suggestions: ['é'.repeat(101)] }, { ...valid, suggestions: ['a', 'b', 'c', 'd'] }
  ]) assert.throws(() => chat.validateConversation(invalid));
  const premature = validator(); premature.accept({ ...traceFrames()[2], seq: 1 });
  const frame = { schemaVersion: '1.0.0', requestId, generation, seq: 2, event: 'conversation', data: valid };
  assert.throws(() => premature.accept(frame));
  const check = validator(); check.accept({ ...frame, seq: 1 });
  assert.throws(() => check.accept(frame));
  assert.throws(() => check.accept({ ...traceFrames()[0], seq: 2 }));
});

test('conversation markup and suggestions remain text, without model-supplied links or HTML', () => {
  const document = testDocument(); let suggested;
  const reply = chat.createAnswerView(document, null, { onSuggestion: text => { suggested = text; } });
  reply.accept({ schemaVersion: '1.0.0', requestId, generation, seq: 1, event: 'conversation', data: {
    kind: 'general', text: '<img src=x onerror=alert(1)>\n\nhttps://untrusted.example/', suggestions: ['<script>example</script>']
  } });
  assert.match(nodeText(reply.element), /<img src=x onerror=alert\(1\)>/);
  assert.ok(!descendants(reply.element).some(node => ['a', 'img', 'script'].includes(node.tag)));
  const suggestion = descendants(reply.element).find(node => node.tag === 'button' && node.textContent.includes('<script>'));
  suggestion.dispatch('click'); assert.equal(suggested, '<script>example</script>');
});

test('request selection follows live activity but preserves manual inspection of an older request', () => {
  const selection = chat.createRequestSelection();
  const older = { requestId }, current = { requestId: generation }, following = { requestId: '33333333-3333-4333-8333-333333333333' };
  assert.equal(selection.update(older), older);
  assert.equal(selection.update(current), current);
  selection.select(older); assert.equal(selection.pinned, true);
  assert.equal(selection.update(following), older);
  selection.select(following); assert.equal(selection.pinned, false);
  const replay = { requestId: following.requestId };
  assert.equal(selection.update(replay), replay);
  selection.clear(); assert.equal(selection.selected, undefined);
});

test('details use accessible Evidence/Trace tabs and a native mobile dialog with focus return', () => {
  const document = testDocument(true), details = chat.createDetailsPanel(document);
  document.body.append(details.element);
  const reply = chat.createAnswerView(document); reply.identify(requestId);
  const trigger = reply.view.detailsButton; document.body.append(trigger);
  details.update(reply.view); details.open(reply.view, trigger);
  const dialog = document.body.children.find(node => node.tag === 'dialog');
  assert.equal(dialog.open, true);
  const nodes = descendants(dialog), tabs = nodes.filter(node => node.attributes.role === 'tab');
  assert.equal(tabs.length, 4);
  assert.deepEqual(tabs.map(tab => tab.textContent), ['Trace', 'Evidence', 'Tools', 'Context']);
  assert.equal(tabs[0].attributes['aria-selected'], 'true');
  const tracePanel = nodes.find(node => node.id === 'chat-trace-panel'); assert.equal(tracePanel.hidden, false);
  tabs[0].dispatch('keydown', { key: 'ArrowRight' });
  assert.equal(tabs[1].attributes['aria-selected'], 'true'); assert.equal(document.activeElement, tabs[1]);
  const evidencePanel = nodes.find(node => node.id === 'chat-evidence-panel'); assert.equal(evidencePanel.hidden, false);
  tabs[1].dispatch('keydown', { key: 'End' });
  assert.equal(tabs[3].attributes['aria-selected'], 'true'); assert.equal(document.activeElement, tabs[3]);
  const contextPanel = nodes.find(node => node.id === 'chat-context-panel'); assert.equal(contextPanel.hidden, false);
  tabs[3].dispatch('keydown', { key: 'Home' });
  assert.equal(tabs[0].attributes['aria-selected'], 'true'); assert.equal(document.activeElement, tabs[0]);
  dialog.close(); assert.equal(document.activeElement, trigger);
  assert.ok(descendants(details.element).includes(tracePanel));
  details.clear(); assert.equal(details.selected, undefined);
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

test('8-stage trace validation and timeline rendering support routing, retrieval, mcp, skipped, ok and degraded statuses', () => {
  assert.deepEqual(chat.TRACE_STAGES, ['routing', 'retrieval', 'mcp', 'context', 'budget', 'provider', 'validation', 'settlement']);
  assert.equal(chat.TRACE_LABELS.retrieval, 'RAG Retrieval');
  assert.equal(chat.TRACE_LABELS.mcp, 'MCP Tools');

  const eightStagePoints = [
    { stage: 'routing', state: 'completed', elapsedMs: 2, routingMode: 'portfolio_mcp', needsRetrieval: true, requestedTools: ['search_public_evidence', 'get_case_study'] },
    { stage: 'retrieval', state: 'started', elapsedMs: 4, retrievalMode: 'hybrid', indexVersion: 'idx-2026-10-31', embeddingModel: 'text-embedding-3-small' },
    { stage: 'retrieval', state: 'completed', elapsedMs: 18, durationMs: 14, retrievalMode: 'hybrid', indexVersion: 'idx-2026-10-31', embeddingModel: 'text-embedding-3-small', matchedCount: 2, corpusVersion: corpus.corpusVersion },
    { stage: 'mcp', state: 'started', elapsedMs: 19, mcpMethod: 'initialize' },
    { stage: 'mcp', state: 'completed', elapsedMs: 23, durationMs: 4, mcpMethod: 'initialize', toolOutcome: 'completed' },
    { stage: 'mcp', state: 'started', elapsedMs: 24, mcpMethod: 'tools/call', toolCallId: 'tool-1', toolName: 'search_public_evidence', attempt: 1 },
    { stage: 'mcp', state: 'completed', elapsedMs: 36, durationMs: 12, mcpMethod: 'tools/call', toolCallId: 'tool-1', toolName: 'search_public_evidence', toolOutcome: 'completed', attempt: 1 },
    { stage: 'context', state: 'completed', elapsedMs: 38, corpusVersion: corpus.corpusVersion, claimCount: corpus.claims.length },
    { stage: 'budget', state: 'completed', elapsedMs: 40, reservedMicros: 6400, priceVersion: 'prices-v2' },
    { stage: 'provider', state: 'started', elapsedMs: 42, attempt: 1, provider: 'openai', model: 'gpt-6-luna' },
    { stage: 'provider', state: 'completed', elapsedMs: 242, durationMs: 200, attempt: 1, provider: 'openai', model: 'gpt-6-luna', usageStatus: 'known', inputTokens: 1400, outputTokens: 90 },
    { stage: 'validation', state: 'started', elapsedMs: 243, attempt: 1 },
    { stage: 'validation', state: 'completed', elapsedMs: 245, durationMs: 2, attempt: 1, claimCount: 1 },
    { stage: 'settlement', state: 'completed', elapsedMs: 250, durationMs: 5, reservedMicros: 6400, chargedMicros: 520, priceVersion: 'prices-v2', usageStatus: 'known' }
  ];

  const streamCheck = chat.createEventValidator({ requestId, generation, evidence, allowTools: true });
  const serverCheck = contracts.createEventValidator({ requestId, generation, corpus });
  const timeline = chat.createRequestTimeline(testDocument());
  for (const [index, data] of eightStagePoints.entries()) {
    assert.deepEqual(chat.validateTraceData(data), data);
    const frame = { schemaVersion: '1.0.0', requestId, generation, seq: index + 1, event: 'trace', data };
    serverCheck.accept(frame);
    streamCheck.accept(frame);
    timeline.accept(frame);
  }
  timeline.finish('completed');
  const renderedText = nodeText(timeline.element);
  for (const expected of ['Request routing', 'RAG Retrieval', 'MCP Tools', 'search_public_evidence', 'idx-2026-10-31', 'text-embedding-3-small', 'Approved context', 'Spending reservation', 'Model request', 'Answer validation', 'Usage settlement']) {
    assert.ok(renderedText.includes(expected), `missing ${expected}`);
  }

  // Skipped and degraded retrieval rendering + stage summary array validation
  const skippedTimeline = chat.createRequestTimeline(testDocument());
  skippedTimeline.accept({
    schemaVersion: '1.0.0', requestId, generation, seq: 1, event: 'trace',
    data: { stage: 'retrieval', state: 'completed', elapsedMs: 3, retrievalMode: 'skipped', matchedCount: 0, corpusVersion: corpus.corpusVersion }
  });
  assert.match(nodeText(skippedTimeline.element), /Skipped/);
  assert.ok(descendants(skippedTimeline.element).some(node => /is-skipped/.test(node.className || '')));

  const degradedTimeline = chat.createRequestTimeline(testDocument());
  degradedTimeline.accept({
    schemaVersion: '1.0.0', requestId, generation, seq: 1, event: 'trace',
    data: { stage: 'retrieval', state: 'completed', elapsedMs: 5, retrievalMode: 'degraded', matchedCount: 1, corpusVersion: corpus.corpusVersion }
  });
  assert.match(nodeText(degradedTimeline.element), /Degraded/);
  assert.ok(descendants(degradedTimeline.element).some(node => /is-degraded|is-failed/.test(node.className || '')));

  const phase4Summary = [
    { stage: 'routing', status: 'ok', durationMs: 2 },
    { stage: 'retrieval', status: 'skipped', durationMs: 0 },
    { stage: 'mcp', status: 'degraded', durationMs: 12 },
    { stage: 'context', status: 'ok', durationMs: 1 },
    { stage: 'budget', status: 'ok', durationMs: 2 },
    { stage: 'provider', status: 'ok', durationMs: 180 },
    { stage: 'validation', status: 'ok', durationMs: 2 },
    { stage: 'settlement', status: 'ok', durationMs: 4 }
  ];
  assert.equal(chat.validateTraceData(phase4Summary).length, 8);

  // 3-point boundaries and negative trace stage checks
  for (const [matchedCount, valid] of [[-1, false], [0, true], [1, true], [15, true], [16, true], [17, false]]) {
    const candidate = { stage: 'retrieval', state: 'completed', elapsedMs: 10, retrievalMode: 'hybrid', matchedCount, corpusVersion: corpus.corpusVersion };
    if (valid) assert.equal(chat.validateTraceData(candidate).matchedCount, matchedCount);
    else assert.throws(() => chat.validateTraceData(candidate));
  }
  for (const invalid of [
    { stage: 'routing', state: 'completed', elapsedMs: 1, routingMode: 'invalid_mode', needsRetrieval: false },
    { stage: 'routing', state: 'completed', elapsedMs: 1, routingMode: 'general' },
    { stage: 'retrieval', state: 'completed', elapsedMs: 1, retrievalMode: 'hybrid', matchedCount: 2 },
    { stage: 'mcp', state: 'started', elapsedMs: 1 },
    { stage: 'mcp', state: 'started', elapsedMs: 1, mcpMethod: 'tools/call', toolName: 'search_public_evidence' },
    { stage: 'mcp', state: 'started', elapsedMs: 1, mcpMethod: 'tools/call', toolCallId: 'tool-1', toolName: 'aws_admin' },
    [{ stage: 'settlement', status: 'ok', durationMs: 1 }, { stage: 'routing', status: 'ok', durationMs: 1 }]
  ]) {
    assert.throws(() => chat.validateTraceData(invalid));
  }
});

test('older-turn selection pinning via [data-turn-select] and unpinning via [data-return-latest] across turns', () => {
  const document = testDocument(false);
  const details = chat.createDetailsPanel(document);
  document.body.append(details.element);

  const requestId1 = '11111111-1111-4111-8111-111111111111';
  const requestId2 = '22222222-2222-4222-8222-222222222222';
  const turn1 = chat.createAnswerView(document, null, { onDetails: (view, trigger) => details.open(view, trigger) });
  const turn2 = chat.createAnswerView(document, null, { onDetails: (view, trigger) => details.open(view, trigger) });

  for (const frame of traceFrames().map(f => ({ ...f, requestId: requestId1 }))) turn1.accept(frame);
  details.update(turn1.view);
  assert.equal(details.selected, turn1.view);
  assert.equal(details.pinned, false);
  assert.equal(turn1.view.detailsButton.getAttribute('aria-pressed'), 'true');
  assert.ok(turn1.view.detailsButton.getAttribute('data-turn-select') !== null);

  for (const frame of traceFrames().map(f => ({ ...f, requestId: requestId2 }))) turn2.accept(frame);
  details.update(turn2.view);
  assert.equal(details.selected, turn2.view);
  assert.equal(details.pinned, false);
  assert.equal(turn1.view.detailsButton.getAttribute('aria-pressed'), 'false');
  assert.equal(turn2.view.detailsButton.getAttribute('aria-pressed'), 'true');

  // Click [data-turn-select] on Turn 1 to pin Details to Turn 1
  turn1.view.detailsButton.dispatch('click');
  assert.equal(details.selected, turn1.view);
  assert.equal(details.pinned, true);
  assert.equal(turn1.view.detailsButton.getAttribute('aria-pressed'), 'true');
  assert.equal(turn2.view.detailsButton.getAttribute('aria-pressed'), 'false');
  assert.match(nodeText(details.element), new RegExp(requestId1));
  assert.match(nodeText(details.element), /Viewing pinned turn/);

  const returnLatestButton = descendants(details.element).find(node => node.getAttribute?.('data-return-latest') !== null);
  assert.ok(returnLatestButton, 'expected [data-return-latest] button when pinned');
  const pinBanner = descendants(details.element).find(node => (node.className || '').includes('chat-details-pin-banner'));
  assert.equal(pinBanner.hidden, false);

  // Clicking [data-return-latest] unpins and returns Details to Turn 2
  returnLatestButton.dispatch('click');
  assert.equal(details.selected, turn2.view);
  assert.equal(details.pinned, false);
  assert.equal(pinBanner.hidden, true);
  assert.equal(turn1.view.detailsButton.getAttribute('aria-pressed'), 'false');
  assert.equal(turn2.view.detailsButton.getAttribute('aria-pressed'), 'true');
  assert.match(nodeText(details.element), new RegExp(requestId2));
});

test('delegation to globalThis.PortfolioChatDetails passes DOM roots, callbacks and canonical turn payload', () => {
  const createdConfigs = [];
  const renderedTurns = [];
  const previousGlobal = globalThis.PortfolioChatDetails;
  globalThis.PortfolioChatDetails = {
    createDetailsPanel(options) {
      createdConfigs.push(options);
      return {
        renderTurn(turnRecord, meta) {
          renderedTurns.push({ turnRecord, meta });
        }
      };
    }
  };
  try {
    const document = testDocument(false);
    const details = chat.createDetailsPanel(document);
    assert.equal(createdConfigs.length, 1);
    const cfg = createdConfigs[0];
    assert.ok(cfg.desktopRoot);
    assert.equal(cfg.desktopRoot.getAttribute('data-chat-details'), '');
    assert.ok(cfg.mobileRoot);
    assert.ok(cfg.mobileDialog);
    assert.equal(cfg.mobileDialog.getAttribute('data-chat-drawer'), '');
    assert.ok(cfg.selectionRoot);
    assert.equal(cfg.selectionRoot.getAttribute('data-chat-selected-turn'), '');
    assert.equal(typeof cfg.onSelectTurn, 'function');
    assert.equal(typeof cfg.onReturnToLatest, 'function');

    const turn1 = chat.createAnswerView(document, null, { onDetails: (view, trigger) => details.open(view, trigger) });
    const degradedNotice = evidence.notices.find(item => item.code === 'retrieval_degraded');
    const answer = contracts.renderAnswer({ schemaVersion: '1.0.0', corpusVersion: corpus.corpusVersion, claimIds: [corpus.claims[0].id], noticeCodes: ['retrieval_degraded'] }, corpus);
    const turn1Frames = [
      { event: 'trace', data: { stage: 'routing', state: 'completed', elapsedMs: 1, routingMode: 'portfolio_mcp', needsRetrieval: true, requestedTools: ['search_public_evidence'] } },
      { event: 'trace', data: { stage: 'retrieval', state: 'started', elapsedMs: 2, retrievalMode: 'degraded', indexVersion: 'idx-v1', embeddingModel: 'text-embedding-3-small' } },
      { event: 'trace', data: { stage: 'retrieval', state: 'completed', elapsedMs: 12, durationMs: 10, retrievalMode: 'degraded', indexVersion: 'idx-v1', embeddingModel: 'text-embedding-3-small', matchedCount: 1, corpusVersion: corpus.corpusVersion } },
      { event: 'trace', data: { stage: 'mcp', state: 'started', elapsedMs: 13, mcpMethod: 'tools/call', toolCallId: 'tool-1', toolName: 'search_public_evidence', attempt: 1 } },
      { event: 'tool_start', data: { toolCallId: 'tool-1', name: 'search_public_evidence' } },
      { event: 'tool_end', data: { toolCallId: 'tool-1', name: 'search_public_evidence', outcome: 'completed' } },
      { event: 'trace', data: { stage: 'mcp', state: 'completed', elapsedMs: 25, durationMs: 12, mcpMethod: 'tools/call', toolCallId: 'tool-1', toolName: 'search_public_evidence', toolOutcome: 'completed', attempt: 1 } },
      { event: 'trace', data: { stage: 'context', state: 'completed', elapsedMs: 26, corpusVersion: corpus.corpusVersion, claimCount: corpus.claims.length } },
      { event: 'trace', data: { stage: 'budget', state: 'completed', elapsedMs: 27, reservedMicros: 3200, priceVersion: 'prices-v1' } },
      { event: 'trace', data: { stage: 'provider', state: 'started', elapsedMs: 28, attempt: 1, provider: 'openai', model: 'gpt-6-luna' } },
      { event: 'trace', data: { stage: 'provider', state: 'completed', elapsedMs: 128, durationMs: 100, attempt: 1, provider: 'openai', model: 'gpt-6-luna', usageStatus: 'known', inputTokens: 900, outputTokens: 50 } },
      { event: 'trace', data: { stage: 'validation', state: 'started', elapsedMs: 129, attempt: 1 } },
      { event: 'trace', data: { stage: 'validation', state: 'completed', elapsedMs: 131, durationMs: 2, attempt: 1, claimCount: 1 } },
      { event: 'trace', data: { stage: 'settlement', state: 'completed', elapsedMs: 135, durationMs: 4, reservedMicros: 3200, chargedMicros: 410, priceVersion: 'prices-v1', usageStatus: 'known' } },
      { event: 'conversation', data: { kind: 'portfolio', text: 'Here is the verified portfolio evidence.', suggestions: [] } },
      { event: 'answer_block', data: answer.blocks[0] },
      { event: 'answer_block', data: degradedNotice },
      { event: 'sources', data: { corpusVersion: corpus.corpusVersion, sources: answer.sources } },
      { event: 'done', data: { outcome: 'completed' } }
    ].map((item, idx) => ({ schemaVersion: '1.0.0', requestId, generation, seq: idx + 1, ...item }));

    for (const frame of turn1Frames) turn1.accept(frame);
    details.update(turn1.view);

    assert.ok(renderedTurns.length >= 1);
    const lastCall = renderedTurns.at(-1);
    assert.equal(lastCall.meta.isPinned, false);
    assert.equal(lastCall.meta.latestTurnId, requestId);
    assert.equal(lastCall.turnRecord.requestId, requestId);
    assert.equal(lastCall.turnRecord.degraded, true);
    assert.equal(lastCall.turnRecord.citations.length, 1);
    assert.equal(lastCall.turnRecord.toolCalls.length, 1);
    assert.equal(lastCall.turnRecord.toolCalls[0].name, 'search_public_evidence');
    assert.equal(lastCall.turnRecord.Retrieval.retrievalMode, 'degraded');
    assert.equal(lastCall.turnRecord.Retrieval.matchedCount, 1);
    assert.equal(lastCall.turnRecord.Retrieval.indexVersion, 'idx-v1');
    assert.ok(lastCall.turnRecord.limits.maxTurns > 0);
    assert.ok(lastCall.turnRecord.trace.some(stage => stage.stage === 'mcp'));

    // Verify turn footer summary badges on turn1
    const turnBadges = descendants(turn1.element);
    assert.ok(turnBadges.some(node => node.getAttribute?.('data-evidence-count') === '1'));
    assert.ok(turnBadges.some(node => node.getAttribute?.('data-tool-count') === '1'));
    assert.ok(turnBadges.some(node => node.getAttribute?.('data-retrieval-badge') === 'degraded'));
    assert.ok(turnBadges.some(node => node.getAttribute?.('data-model-badge') === 'gpt-6-luna'));
  } finally {
    if (previousGlobal === undefined) delete globalThis.PortfolioChatDetails;
    else globalThis.PortfolioChatDetails = previousGlobal;
  }
});

test('canary and XSS payloads in assistant reply, citation title and tool summary render strictly via textContent without leaks', () => {
  const canary = 'CANARY_UI_9f8a7b6c4d2e';
  const xss = '<img src=x onerror=alert(1)>';
  const document = testDocument(false);

  const reply = chat.createAnswerView(document);
  reply.accept({
    schemaVersion: '1.0.0', requestId, generation, seq: 1, event: 'conversation',
    data: { kind: 'general', text: `Reply ${canary} ${xss}`, suggestions: [`Chip ${xss}`] }
  });
  const claimBlock = {
    ...evidence.claims[0],
    title: `Title ${canary} ${xss}`,
    text: `Claim text ${xss}`,
    qualificationNotes: [`Note ${canary} ${xss}`]
  };
  const renderedClaim = chat.renderBlock(document, claimBlock);
  const renderedTools = chat.renderToolsView(document, {
    toolCalls: [{ toolCallId: 'tool-1', name: 'search_public_evidence', state: 'completed', durationMs: 12, summary: `Tool summary ${canary} ${xss}` }]
  });

  for (const root of [reply.element, renderedClaim, renderedTools]) {
    const allNodes = descendants(root);
    assert.ok(!allNodes.some(node => ['img', 'script', 'iframe', 'svg'].includes(node.tag)));
    for (const node of allNodes) {
      for (const [attrName, attrVal] of Object.entries(node.attributes || {})) {
        assert.ok(!String(attrVal).includes(canary), `canary leaked into attribute ${attrName}`);
        assert.ok(!String(attrVal).includes('onerror'), `XSS attribute leaked into ${attrName}`);
      }
    }
  }
  assert.ok(nodeText(reply.element).includes(`Reply ${canary} ${xss}`));
  assert.ok(nodeText(renderedClaim).includes(`Title ${canary} ${xss}`));
  assert.ok(nodeText(renderedTools).includes(`Tool summary ${canary} ${xss}`));

  // Verify sanitizeHref and validatePayload and localStorage history TTL boundaries
  assert.equal(chat.sanitizeHref(evidence.sources[0].url), evidence.sources[0].url);
  for (const hostileUrl of [
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'https://joshboyer.ca@evil.example/#projects/dell',
    'https://evil-joshboyer.ca/#projects/dell',
    `https://joshboyer.ca/#projects/dell?leak=${canary}`
  ]) {
    assert.throws(() => chat.sanitizeHref(hostileUrl));
  }
  assert.equal(chat.MAX_STORED_TURNS, 12);
  assert.equal(chat.HISTORY_TTL_MS, 1800000);

  // 3-point time boundary on localStorage history TTL (window-1, window, window+1 ms) and turn cap (11, 12, 13)
  const storeMap = new Map();
  const mockStorage = {
    getItem: key => storeMap.get(key) ?? null,
    setItem: (key, val) => storeMap.set(key, String(val)),
    removeItem: key => storeMap.delete(key)
  };
  const baseTime = 1700000000000;
  const turns13 = Array.from({ length: 13 }, (_, idx) => ({ requestId: `turn-${idx + 1}`, kind: 'general', completedAt: baseTime + idx }));
  chat.saveStoredHistory(mockStorage, turns13.slice(0, 11), () => baseTime);
  assert.equal(chat.loadStoredHistory(mockStorage, () => baseTime).length, 11);
  chat.saveStoredHistory(mockStorage, turns13.slice(0, 12), () => baseTime);
  assert.equal(chat.loadStoredHistory(mockStorage, () => baseTime).length, 12);
  chat.saveStoredHistory(mockStorage, turns13, () => baseTime);
  const loadedAtBefore = chat.loadStoredHistory(mockStorage, () => baseTime + chat.HISTORY_TTL_MS - 1);
  assert.equal(loadedAtBefore.length, 12);
  assert.equal(loadedAtBefore[0].requestId, 'turn-2');
  const loadedAtExact = chat.loadStoredHistory(mockStorage, () => baseTime + chat.HISTORY_TTL_MS);
  assert.equal(loadedAtExact.length, 12);
  const loadedAfterExpiry = chat.loadStoredHistory(mockStorage, () => baseTime + chat.HISTORY_TTL_MS + 1);
  assert.equal(loadedAfterExpiry.length, 0);

  // Hostile objects: throwing getters, Proxies, __proto__, NUL/CRLF, and seeded fuzz test (seed=0x20261031)
  const throwingGetter = {};
  Object.defineProperty(throwingGetter, 'stage', {
    enumerable: true,
    get() { throw new Error(`Getter leak ${canary}`); }
  });
  const protoPoison = JSON.parse(`{"stage":"routing","state":"completed","elapsedMs":1,"routingMode":"general","needsRetrieval":false,"__proto__":{"leak":"${canary}"}}`);
  const inherited = Object.assign(Object.create({ secret: canary }), {
    schemaVersion: '1.0.0', requestId, text: 'Valid question'
  });
  for (const fn of [
    () => chat.validateTraceData(throwingGetter),
    () => chat.validateTraceData(protoPoison),
    () => chat.validatePayload(inherited),
    () => chat.validatePayload({ schemaVersion: '1.0.0', requestId, text: `Hello\u0000${canary}` }),
    () => chat.validateConversation({ kind: 'general', text: `Hello\u0000${canary}`, suggestions: [] }),
    () => chat.validateConversation({ kind: 'general', text: 'Valid', suggestions: [`Line1\r\n${canary}`] })
  ]) {
    assert.throws(fn, err => {
      assert.ok(!String(err.message).includes(canary), 'error message must never leak canary');
      return true;
    });
  }

  let seed = 0x20261031;
  const nextRand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  for (let i = 0; i < 60; i += 1) {
    const r = nextRand();
    const fuzzTrace = {
      stage: ['routing', 'retrieval', 'mcp', 'invalid_stage'][r % 4],
      state: ['started', 'completed', 'failed'][r % 3],
      elapsedMs: (r % 70000) - 5000,
      indexVersion: r % 2 === 0 ? `idx-${r}` : `idx-${canary}`
    };
    let firstOutcome;
    try {
      firstOutcome = JSON.stringify(chat.validateTraceData(fuzzTrace));
    } catch (err) {
      assert.ok(!String(err.message).includes(canary));
      firstOutcome = `ERR:${err.code}`;
    }
    let secondOutcome;
    try {
      secondOutcome = JSON.stringify(chat.validateTraceData(fuzzTrace));
    } catch (err) {
      secondOutcome = `ERR:${err.code}`;
    }
    assert.equal(firstOutcome, secondOutcome, `fuzz iteration ${i} (seed=0x20261031) must be deterministic`);
  }
});

test('real PortfolioChatDetails integration preserves desktop #chat-trace-panel DOM, single 4-tab mobile drawer, and [data-chat-drawer-close]', () => {
  const realDetailsModule = require('../dist/chat-request-details.js');
  const previousGlobal = globalThis.PortfolioChatDetails;
  globalThis.PortfolioChatDetails = realDetailsModule;
  try {
    // 1. Desktop (D-01): #chat-trace-panel inside [data-chat-details] keeps its child .chat-trace-list after details.update(view)
    const desktopDoc = testDocument(false);
    const desktopDetails = chat.createDetailsPanel(desktopDoc);
    const turnDesktop = chat.createAnswerView(desktopDoc, null, { onDetails: (view, trigger) => desktopDetails.open(view, trigger) });
    for (const frame of traceFrames()) turnDesktop.accept(frame);
    desktopDetails.update(turnDesktop.view);

    const desktopNodes = descendants(desktopDetails.element);
    const tracePanel = desktopNodes.find(node => node.id === 'chat-trace-panel');
    assert.ok(tracePanel, '#chat-trace-panel must exist inside [data-chat-details]');
    assert.ok(tracePanel.children.length > 0, '#chat-trace-panel must keep its timeline child after details.update(view)');
    const traceLists = descendants(tracePanel).filter(node => String(node.className || '').includes('chat-trace-list'));
    assert.ok(traceLists.length > 0, '#chat-trace-panel must contain .chat-trace-list');
    assert.match(nodeText(tracePanel), /Approved context|Spending reservation|Usage settlement/);

    // 2. Mobile drawer (D-02 & D-03): opening mobile drawer renders exactly 4 [role="tab"] buttons (no duplicate 8-tab surface) and close button has [data-chat-drawer-close]
    const mobileDoc = testDocument(true);
    const mobileDetails = chat.createDetailsPanel(mobileDoc);
    const turnMobile = chat.createAnswerView(mobileDoc, null, { onDetails: (view, trigger) => mobileDetails.open(view, trigger) });
    for (const frame of traceFrames()) turnMobile.accept(frame);
    mobileDetails.open(turnMobile.view, turnMobile.view.detailsButton);

    assert.equal(mobileDetails.dialog.open, true);
    const dialogNodes = descendants(mobileDetails.dialog);
    const dialogTabs = dialogNodes.filter(node => node.getAttribute?.('role') === 'tab');
    assert.equal(dialogTabs.length, 4, 'mobile drawer must contain exactly 4 [role="tab"] buttons');
    const closeBtn = dialogNodes.find(node => String(node.className || '').includes('chat-details-close'));
    assert.ok(closeBtn, 'mobile drawer must contain .chat-details-close button');
    assert.equal(closeBtn.getAttribute('data-chat-drawer-close'), '');
    const mobileTracePanel = dialogNodes.find(node => node.id === 'chat-trace-panel');
    assert.ok(mobileTracePanel && mobileTracePanel.children.length > 0, 'mobile #chat-trace-panel must remain populated');
  } finally {
    if (previousGlobal === undefined) delete globalThis.PortfolioChatDetails;
    else globalThis.PortfolioChatDetails = previousGlobal;
  }
});