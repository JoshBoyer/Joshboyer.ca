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
