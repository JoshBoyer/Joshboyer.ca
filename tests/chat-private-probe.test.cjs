'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { PREVIEW_ORIGIN, QUESTION, runPrivateProbe, runFromEnvironment, parseStream } = require('../tools/probe-chat-private.cjs');
const { renderAnswer } = require('../chat/contracts/index.cjs');
const corpus = require('../chat/knowledge/corpus.json');

const TOKEN = 'private-test-' + 'a'.repeat(43);
const REQUEST = '11111111-1111-4111-8111-111111111111';
const GENERATION = '22222222-2222-4222-8222-222222222222';
const SESSION = 's'.repeat(43);
const COOKIE = `${'1999999999'}.${'c'.repeat(43)}`;
const answer = renderAnswer({ schemaVersion: '1.0.0', corpusVersion: corpus.corpusVersion,
  claimIds: ['claim-experience-nexus'], noticeCodes: [] }, corpus);

function stream({ altered = false, crlf = false } = {}) {
  const records = [
    { event: 'status', data: { code: 'accepted' } },
    ...answer.blocks.map(data => ({ event: 'answer_block', data: altered ? { ...data, text: 'Invented certification.' } : data })),
    { event: 'sources', data: { corpusVersion: corpus.corpusVersion, sources: answer.sources } },
    { event: 'done', data: { outcome: 'completed' } }
  ];
  const text = records.map((record, index) => `event: ${record.event}\ndata: ${JSON.stringify({ schemaVersion: '1.0.0', requestId: REQUEST,
    generation: GENERATION, seq: index + 1, ...record })}\n\n`).join('');
  return crlf ? text.replace(/\n/g, '\r\n') : text;
}

function fixture(options = {}) {
  const calls = [], pauses = [];
  let paid = 0, cleared = false;
  const dependencies = {
    url: PREVIEW_ORIGIN, token: TOKEN, uuid: () => REQUEST,
    sleep: async ms => { pauses.push({ ms, calls: calls.length }); },
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      assert.equal(new URL(url).origin, PREVIEW_ORIGIN);
      assert.equal(init.redirect, 'error');
      assert.equal(init.headers.Origin, PREVIEW_ORIGIN);
      assert.ok(init.signal instanceof AbortSignal);
      assert.ok(!url.includes(TOKEN));
      if (options.networkFailure) throw new Error('raw-secret-' + TOKEN);
      const route = new URL(url).pathname;
      if (route === '/api/chat/access') {
        assert.deepEqual(JSON.parse(init.body), { token: TOKEN });
        return Response.json({ ok: true }, { headers: { 'Set-Cookie': `__Host-jb_chat_access=${COOKIE}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=3600` } });
      }
      if (route === '/api/chat/config') {
        if (!init.headers.Cookie) return Response.json({ error: { code: 'UNAUTHORISED' } }, { status: 401 });
        return Response.json({ schemaVersion: '1.0.0', available: true,
          capabilities: { chat: true, cag: true, rag: !!options.badCapabilities, mcp: false, voice: false },
          limits: { maxMessageBytes: 8192, maxTurns: 8, maxToolsPerTurn: 0, turnDeadlineMs: 50000 } });
      }
      if (route === '/api/chat/session' && init.method === 'POST') {
        return Response.json({ schemaVersion: '1.0.0', generation: GENERATION, expiresAt: 2000000000000, remainingTurns: 8 },
          { headers: { 'Set-Cookie': `__Host-jb_chat=${SESSION}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=86400` } });
      }
      if (route === '/api/chat/session' && init.method === 'DELETE') {
        cleared = true;
        return Response.json({ schemaVersion: '1.0.0', cleared: true },
          { headers: { 'Set-Cookie': '__Host-jb_chat=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0' } });
      }
      if (route === '/api/chat/messages') {
        assert.match(init.headers.Cookie, /__Host-jb_chat=/);
        const body = JSON.parse(init.body);
        if (cleared) return Response.json({ error: { code: 'session_expired' } }, { status: 401 });
        if (Object.hasOwn(body, 'history')) return Response.json({ error: { code: 'invalid_request' } }, { status: 400 });
        if (body.text !== QUESTION) return Response.json({ error: { code: 'request_conflict' } }, { status: 409 });
        paid++;
        if (options.chatStatus) return Response.json({ error: TOKEN }, { status: options.chatStatus });
        if (options.largeResponse) return new Response('x'.repeat(65537), { headers: { 'Content-Type': 'text/event-stream' } });
        return new Response(stream({ altered: options.altered, crlf: paid > 1 }), { headers: { 'Content-Type': 'text/event-stream' } });
      }
      throw new Error('Unexpected test request');
    }
  };
  return { dependencies, calls, pauses, get paid() { return paid; }, get cleared() { return cleared; } };
}

test('private smoke verifies one new request, exact replay, strict cookies, canonical sources and revocation', async () => {
  const f = fixture();
  const receipt = await runPrivateProbe(f.dependencies);
  assert.equal(receipt.status, 'passed');
  assert.equal(receipt.chat.requestId, REQUEST);
  assert.deepEqual(receipt.chat.claimIds, ['claim-experience-nexus']);
  assert.equal(receipt.replay.sameCanonicalAnswer, true);
  assert.equal(receipt.cleanup, 'session_cleared');
  assert.equal(f.calls.length, 10);
  assert.equal(f.pauses.length, 9);
  assert.ok(f.pauses.every(pause => pause.ms === 1100));
  const messageCalls = f.calls.filter(call => call.url.endsWith('/messages') && JSON.parse(call.init.body).text === QUESTION && !Object.hasOwn(JSON.parse(call.init.body), 'history'));
  assert.equal(messageCalls.length, 3); // Original, identical retry and the rejected old session.
  assert.deepEqual(JSON.parse(messageCalls[0].init.body), JSON.parse(messageCalls[1].init.body));
  assert.ok(!JSON.stringify(receipt).includes(TOKEN));
  assert.ok(!JSON.stringify(receipt).includes(SESSION));
  assert.ok(!JSON.stringify(receipt).includes(COOKIE));
  assert.ok(!JSON.stringify(receipt).includes(answer.blocks[0].text));
});

test('invalid destinations, tokens and arguments fail before network access', async () => {
  const f = fixture();
  for (const url of ['https://example.com', PREVIEW_ORIGIN + '/', PREVIEW_ORIGIN + '/chat-preview', PREVIEW_ORIGIN.replace('https:', 'http:')]) {
    await assert.rejects(runPrivateProbe({ ...f.dependencies, url }), { code: 'INVALID_PREVIEW_URL' });
  }
  await assert.rejects(runPrivateProbe({ ...f.dependencies, token: 'short' }), { code: 'INVALID_PROBE_TOKEN' });
  await assert.rejects(runFromEnvironment({ args: ['--token', TOKEN], env: {}, ...f.dependencies }), { code: 'INVALID_ARGUMENTS' });
  assert.equal(f.calls.length, 0);
});

test('tampered prose, wrong identities, missing terminal records and invalid event order are rejected', () => {
  assert.throws(() => parseStream(stream({ altered: true }), REQUEST, GENERATION), { code: 'INVALID_STREAM' });
  assert.throws(() => parseStream(stream(), REQUEST, REQUEST), { code: 'INVALID_STREAM' });
  assert.throws(() => parseStream(stream().replace('"seq":2', '"seq":9'), REQUEST, GENERATION), { code: 'INVALID_STREAM' });
  assert.throws(() => parseStream(stream().split('event: done')[0], REQUEST, GENERATION), { code: 'INCOMPLETE_STREAM' });
});

test('unexpected chat status and oversized or fabricated answers trigger session cleanup with redacted errors', async () => {
  for (const options of [{ chatStatus: 502 }, { largeResponse: true }, { altered: true }]) {
    const f = fixture(options);
    let failure;
    try { await runPrivateProbe(f.dependencies); } catch (error) { failure = error; }
    assert.ok(failure);
    assert.equal(f.cleared, true);
    assert.equal(failure.receipt.cleanup, 'session_cleared');
    assert.ok(!JSON.stringify(failure.receipt).includes(TOKEN));
    assert.ok(!JSON.stringify(failure.receipt).includes(SESSION));
    assert.ok(!JSON.stringify(failure.receipt).includes('Invented certification'));
  }
});

test('raw transport exceptions never become receipt messages', async () => {
  const f = fixture({ networkFailure: true });
  await assert.rejects(runPrivateProbe(f.dependencies), error => {
    assert.equal(error.message, 'PROBE_UNAVAILABLE');
    assert.equal(error.receipt.cleanup, 'not_created');
    assert.ok(!JSON.stringify(error.receipt).includes(TOKEN));
    return true;
  });
});

test('unexpected public capabilities abort before session or billable messages', async () => {
  const f = fixture({ badCapabilities: true });
  await assert.rejects(runPrivateProbe(f.dependencies), { code: 'UNEXPECTED_CAPABILITIES' });
  assert.equal(f.calls.filter(call => call.url.endsWith('/messages')).length, 0);
});
