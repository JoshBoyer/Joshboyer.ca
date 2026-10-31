'use strict';

const { randomUUID, createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { assertValid, createEventValidator } = require('../chat/contracts/index.cjs');
const corpus = require('../chat/knowledge/corpus.json');

const PREVIEW_ORIGIN = 'https://joshboyer-chat-dev.boyer-josh1985.workers.dev';
const QUESTION = "Tell me about Josh's NEXUS project.";
const MAX_BYTES = 65536;
const DEADLINE_MS = 60000;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43,128}$/;

class PrivateProbeError extends Error {
  constructor(code, httpStatus) {
    super(code);
    this.name = 'PrivateProbeError';
    this.code = code;
    if (Number.isInteger(httpStatus) && httpStatus >= 100 && httpStatus <= 599) this.httpStatus = httpStatus;
  }
}

function requireCondition(condition, code = 'INVALID_RESPONSE', status) {
  if (!condition) throw new PrivateProbeError(code, status);
}

async function deadline(operation, timeoutMs) {
  const controller = new AbortController();
  let timer;
  const expired = new Promise((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new PrivateProbeError('PROBE_DEADLINE')); }, timeoutMs);
  });
  try { return await Promise.race([operation(controller.signal), expired]); }
  catch (error) {
    if (controller.signal.aborted) throw new PrivateProbeError('PROBE_DEADLINE');
    if (error instanceof PrivateProbeError) throw error;
    throw new PrivateProbeError('PROBE_UNAVAILABLE');
  } finally { clearTimeout(timer); controller.abort(); }
}

async function boundedText(response, signal, firstByte) {
  const length = response.headers.get('Content-Length');
  if (length && (!/^[0-9]+$/.test(length) || Number(length) > MAX_BYTES)) {
    await response.body?.cancel(); throw new PrivateProbeError('RESPONSE_TOO_LARGE');
  }
  requireCondition(response.body, 'MISSING_RESPONSE_BODY');
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  const abort = () => { void reader.cancel().catch(() => undefined); };
  signal.addEventListener('abort', abort, { once: true });
  try {
    while (true) {
      signal.throwIfAborted();
      const item = await reader.read();
      signal.throwIfAborted();
      if (item.done) break;
      if (!size && item.value.byteLength) firstByte?.();
      size += item.value.byteLength;
      requireCondition(size <= MAX_BYTES, 'RESPONSE_TOO_LARGE');
      chunks.push(item.value);
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
  } finally {
    signal.removeEventListener('abort', abort);
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

function parseStream(text, requestId, generation) {
  const normalised = text.replace(/\r\n/g, '\n');
  requireCondition(normalised.endsWith('\n\n'), 'INVALID_STREAM');
  const records = normalised.slice(0, -2).split('\n\n');
  requireCondition(records.length >= 3 && records.length <= 96, 'INVALID_STREAM');
  const validator = createEventValidator({ requestId, generation, corpus });
  const blocks = [], sources = [];
  let outcome;
  try {
    for (const record of records) {
      const lines = record.split('\n');
      requireCondition(lines.length === 2 && /^event: [a-z_]+$/.test(lines[0]) && lines[1].startsWith('data: '), 'INVALID_STREAM');
      const frame = JSON.parse(lines[1].slice(6));
      requireCondition(frame.event === lines[0].slice(7), 'INVALID_STREAM');
      validator.accept(frame);
      if (frame.event === 'answer_block') blocks.push(frame.data);
      if (frame.event === 'sources') sources.push(...frame.data.sources);
      if (frame.event === 'done') outcome = frame.data.outcome;
      requireCondition(frame.event !== 'error', 'CHAT_REPORTED_FAILURE');
    }
  } catch (error) {
    if (error instanceof PrivateProbeError) throw error;
    throw new PrivateProbeError('INVALID_STREAM');
  }
  requireCondition(validator.state.terminal && ['completed', 'limited'].includes(outcome), 'INCOMPLETE_STREAM');
  const claimIds = blocks.filter(block => block.kind === 'claim').map(block => block.claimId);
  requireCondition(claimIds.includes('claim-experience-nexus'), 'EXPECTED_EVIDENCE_MISSING');
  return { requestId, generation, corpusVersion: corpus.corpusVersion, claimIds, outcome, eventCount: records.length,
    canonicalDigest: createHash('sha256').update(JSON.stringify({ blocks, sources })).digest('hex') };
}

function acceptCookies(headers, jar) {
  const values = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [headers.get('Set-Cookie')].filter(Boolean);
  for (const value of values) {
    const match = /^(?<name>__Host-jb_chat_access|__Host-jb_chat)=(?<value>[^;]*); Path=\/; Secure; HttpOnly; SameSite=Strict; Max-Age=(?<age>3600|86400|0)$/.exec(value);
    requireCondition(match, 'INVALID_SESSION_COOKIE');
    const { name, value: credential, age } = match.groups;
    if (age === '0') { requireCondition(credential === '', 'INVALID_SESSION_COOKIE'); jar.delete(name); continue; }
    requireCondition(name === '__Host-jb_chat_access' ? /^[0-9]{10}\.[A-Za-z0-9_-]{43}$/.test(credential) && age === '3600' : /^[A-Za-z0-9_-]{43}$/.test(credential) && age === '86400', 'INVALID_SESSION_COOKIE');
    jar.set(name, credential);
  }
}

async function runPrivateProbe({ url, token, fetchImpl = fetch, sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
  now = () => performance.now(), uuid = randomUUID, timeoutMs = DEADLINE_MS } = {}) {
  requireCondition(url === PREVIEW_ORIGIN, 'INVALID_PREVIEW_URL');
  requireCondition(typeof token === 'string' && TOKEN_PATTERN.test(token), 'INVALID_PROBE_TOKEN');
  requireCondition(Number.isInteger(timeoutMs) && timeoutMs >= 1 && timeoutMs <= DEADLINE_MS, 'INVALID_DEADLINE');
  const jar = new Map(), checks = [];
  let calls = 0, opened = false, cleared = false, chat, replay, failure;
  const cookieHeader = () => [...jar].map(([name, value]) => `${name}=${value}`).join('; ');

  async function request(name, method, route, body, expectedStatus, options = {}) {
    if (calls++) await sleep(1100);
    return deadline(async signal => {
      const started = now(); let firstByte;
      const headers = { Origin: url, 'Content-Type': 'application/json', Accept: options.stream ? 'text/event-stream' : 'application/json' };
      const cookies = options.cookies === undefined ? cookieHeader() : options.cookies;
      if (cookies) headers.Cookie = cookies;
      const response = await fetchImpl(url + route, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal, redirect: 'error' });
      if (response.status !== expectedStatus) {
        await response.body?.cancel(); throw new PrivateProbeError('UNEXPECTED_HTTP_STATUS', response.status);
      }
      const contentType = response.headers.get('Content-Type') ?? '';
      requireCondition(options.stream ? /^text\/event-stream(?:;|$)/i.test(contentType) : /^application\/json(?:;|$)/i.test(contentType), 'INVALID_CONTENT_TYPE');
      const text = await boundedText(response, signal, () => { firstByte = now(); });
      acceptCookies(response.headers, jar);
      checks.push({ check: name, status: 'passed', httpStatus: response.status });
      if (options.stream) {
        const parsed = parseStream(text, options.requestId, options.generation);
        return { ...parsed, latencyMs: { firstByte: Math.round(firstByte - started), total: Math.round(now() - started) } };
      }
      try { return JSON.parse(text); } catch { throw new PrivateProbeError('INVALID_JSON'); }
    }, timeoutMs);
  }

  try {
    await request('private_gate', 'GET', '/api/chat/config', undefined, 401, { cookies: '' });
    await request('login', 'POST', '/api/chat/access', { token }, 200);
    requireCondition(jar.has('__Host-jb_chat_access'), 'MISSING_ACCESS_COOKIE');
    const config = await request('config', 'GET', '/api/chat/config', undefined, 200);
    try { assertValid('configResponse', config); } catch { throw new PrivateProbeError('INVALID_CONFIG'); }
    requireCondition(config.available && config.capabilities.chat && config.capabilities.cag && !config.capabilities.rag && !config.capabilities.mcp && !config.capabilities.voice && config.limits.maxToolsPerTurn === 0, 'UNEXPECTED_CAPABILITIES');
    const session = await request('session', 'POST', '/api/chat/session', {}, 200);
    try { assertValid('sessionResponse', session); } catch { throw new PrivateProbeError('INVALID_SESSION'); }
    requireCondition(jar.has('__Host-jb_chat'), 'MISSING_SESSION_COOKIE');
    opened = true;
    const oldCookie = cookieHeader();
    const requestId = uuid();
    try { assertValid('uuid', requestId); } catch { throw new PrivateProbeError('INVALID_REQUEST_ID'); }
    const message = { schemaVersion: '1.0.0', requestId, text: QUESTION };
    await request('invalid_extra_field', 'POST', '/api/chat/messages', { ...message, history: [] }, 400);
    chat = await request('grounded_answer', 'POST', '/api/chat/messages', message, 200,
      { stream: true, requestId, generation: session.generation });
    replay = await request('identical_retry', 'POST', '/api/chat/messages', message, 200,
      { stream: true, requestId, generation: session.generation });
    requireCondition(chat.canonicalDigest === replay.canonicalDigest, 'REPLAY_CHANGED');
    await request('changed_payload_conflict', 'POST', '/api/chat/messages', { ...message, text: 'Different question.' }, 409);
    const clear = await request('clear', 'DELETE', '/api/chat/session', {}, 200);
    try { assertValid('clearResponse', clear); } catch { throw new PrivateProbeError('INVALID_CLEAR'); }
    cleared = true;
    requireCondition(!jar.has('__Host-jb_chat'), 'SESSION_COOKIE_NOT_CLEARED');
    await request('revoked_session', 'POST', '/api/chat/messages', message, 401, { cookies: oldCookie });
    const publicChat = ({ canonicalDigest: _digest, ...value }) => value;
    return { schemaVersion: '1.0.0', status: 'passed', origin: url, checks,
      chat: publicChat(chat), replay: { ...publicChat(replay), sameCanonicalAnswer: true },
      billingEvidence: 'one_new_request_id_replayed; confirm provider invocation count in AWS ledger', cleanup: 'session_cleared' };
  } catch (error) {
    const safe = error instanceof PrivateProbeError ? error : new PrivateProbeError('PROBE_UNAVAILABLE');
    safe.receipt = { schemaVersion: '1.0.0', status: 'failed', origin: url, checks, code: safe.code,
      ...(safe.httpStatus ? { httpStatus: safe.httpStatus } : {}), cleanup: opened && !cleared ? 'pending' : cleared ? 'session_cleared' : 'not_created' };
    failure = safe;
    throw safe;
  } finally {
    if (opened && !cleared) {
      try {
        await request('cleanup', 'DELETE', '/api/chat/session', {}, 200);
        cleared = true;
      } catch { /* A failed cleanup is recorded without leaking the session credential. */ }
    }
    if (failure) failure.receipt.cleanup = cleared ? 'session_cleared' : opened ? 'failed' : 'not_created';
    jar.clear();
  }
}

async function runFromEnvironment({ env = process.env, args = process.argv.slice(2), ...dependencies } = {}) {
  requireCondition(args.length === 0 || args.length === 2 && args[0] === '--output', 'INVALID_ARGUMENTS');
  const output = args[1];
  requireCondition(output === undefined || typeof output === 'string' && output.endsWith('.json') && !/[\r\n\0]/.test(output), 'INVALID_OUTPUT_PATH');
  let receipt;
  try {
    receipt = await runPrivateProbe({ url: env.JOSH_CHAT_PREVIEW_URL, token: env.JOSH_CHAT_PROBE_TOKEN, ...dependencies });
  } catch (error) {
    if (output && error instanceof PrivateProbeError && error.receipt) await fs.writeFile(path.resolve(output), JSON.stringify(error.receipt, null, 2) + '\n', { mode: 0o600 });
    throw error;
  }
  if (output) await fs.writeFile(path.resolve(output), JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600 });
  return receipt;
}

if (require.main === module) {
  runFromEnvironment().then(receipt => process.stdout.write(JSON.stringify(receipt) + '\n')).catch(error => {
    const safe = error instanceof PrivateProbeError ? error : new PrivateProbeError('PROBE_UNAVAILABLE');
    process.stderr.write(JSON.stringify(safe.receipt ?? { status: 'failed', code: safe.code }) + '\n');
    process.exitCode = 1;
  });
}

module.exports = { PREVIEW_ORIGIN, QUESTION, PrivateProbeError, runPrivateProbe, runFromEnvironment, parseStream };
