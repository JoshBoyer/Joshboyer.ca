'use strict';

const { performance } = require('node:perf_hooks');

const MODELS = Object.freeze({ openai: 'gpt-6-luna', anthropic: 'claude-haiku-5-5' });
const MAX_RESPONSE_BYTES = 65536;
const DEADLINE_MS = 30000;
const URL_PATTERN = /^https:\/\/joshboyer-chat-dev\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.workers\.dev\/api\/chat\/_probe$/;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43,128}$/;

class ProbeError extends Error {
  constructor(code, httpStatus) {
    super(code);
    this.name = 'ProbeError';
    this.code = code;
    if (Number.isInteger(httpStatus) && httpStatus >= 100 && httpStatus <= 599) this.httpStatus = httpStatus;
  }
}

function requireCondition(condition, code = 'INVALID_STREAM') {
  if (!condition) throw new ProbeError(code);
}

function configuration(url, token) {
  requireCondition(typeof url === 'string' && URL_PATTERN.test(url), 'INVALID_PROBE_URL');
  requireCondition(typeof token === 'string' && TOKEN_PATTERN.test(token), 'INVALID_PROBE_TOKEN');
}

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function fields(value, required, optional = []) {
  return record(value) && required.every(key => Object.hasOwn(value, key)) &&
    Object.keys(value).every(key => required.includes(key) || optional.includes(key));
}

function count(value) { return Number.isSafeInteger(value) && value >= 0; }

function numericDetails(value, depth = 0) {
  if (value === null) return true;
  if (!record(value) || depth > 3 || Object.keys(value).length > 24) return false;
  return Object.entries(value).every(([key, child]) => /^[a-z][a-z0-9_]{0,63}$/.test(key) &&
    (count(child) || record(child) && numericDetails(child, depth + 1)));
}

function sanitiseUsage(value) {
  const names = ['status', 'inputTokens', 'outputTokens', 'totalTokens', 'cacheReadInputTokens',
    'cacheWriteInputTokens', 'reasoningOutputTokens', 'providerDetails'];
  requireCondition(fields(value, names), 'INVALID_USAGE');
  requireCondition(value.status === 'known', 'USAGE_UNAVAILABLE');
  requireCondition(['inputTokens', 'outputTokens', 'totalTokens'].every(key => count(value[key])) &&
    value.totalTokens === value.inputTokens + value.outputTokens &&
    ['cacheReadInputTokens', 'cacheWriteInputTokens', 'reasoningOutputTokens'].every(key => value[key] === null || count(value[key])) &&
    (value.cacheReadInputTokens ?? 0) <= value.inputTokens &&
    (value.cacheWriteInputTokens ?? 0) <= value.inputTokens &&
    (value.reasoningOutputTokens ?? 0) <= value.outputTokens && numericDetails(value.providerDetails), 'INVALID_USAGE');
  // Keep the fixed numeric counters; never copy arbitrary provider field names into receipts.
  return Object.fromEntries(names.filter(key => key !== 'providerDetails').map(key => [key, value[key]]));
}

function parseProbeStream(text, provider) {
  const normalised = text.replace(/\r\n/g, '\n');
  requireCondition(normalised.endsWith('\n\n'));
  const frames = normalised.slice(0, -2).split('\n\n');
  requireCondition(frames.length === 3);
  const parsed = frames.map(frame => {
    const lines = frame.split('\n');
    requireCondition(lines.length === 2 && /^event: (status|result|done|error)$/.test(lines[0]) && lines[1].startsWith('data: '));
    let data;
    try { data = JSON.parse(lines[1].slice(6)); } catch { throw new ProbeError('INVALID_STREAM'); }
    return { event: lines[0].slice(7), data };
  });
  const [status, result, done] = parsed;
  requireCondition(status.event === 'status' && fields(status.data, ['phase', 'provider']) &&
    status.data.phase === 'provider' && status.data.provider === provider);
  requireCondition(done.event === 'done' && fields(done.data, ['ok']) && typeof done.data.ok === 'boolean');
  if (result.event === 'error') {
    requireCondition(fields(result.data, ['code', 'chargeStatus']) && typeof result.data.code === 'string' &&
      ['unknown', 'not_started'].includes(result.data.chargeStatus) && done.data.ok === false);
    throw new ProbeError('PROVIDER_REPORTED_FAILURE');
  }
  requireCondition(result.event === 'result' && done.data.ok === true);
  const data = result.data;
  requireCondition(fields(data, ['provider', 'model', 'text', 'finishReason', 'usage'], ['providerRequestId', 'gatewayRequestId']) &&
    data.provider === provider && data.model === MODELS[provider] && data.text === 'OK' &&
    data.finishReason === (provider === 'openai' ? 'completed' : 'end_turn'));
  const receipt = { status: 'passed', provider, model: data.model, usage: sanitiseUsage(data.usage) };
  for (const key of ['providerRequestId', 'gatewayRequestId']) {
    if (Object.hasOwn(data, key)) {
      requireCondition(typeof data[key] === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(data[key]));
      receipt[key] = data[key];
    }
  }
  return receipt;
}

async function deadline(operation, timeoutMs) {
  requireCondition(Number.isInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= DEADLINE_MS, 'INVALID_DEADLINE');
  const controller = new AbortController();
  let timer;
  const expired = new Promise((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new ProbeError('PROBE_DEADLINE')); }, timeoutMs);
  });
  try { return await Promise.race([operation(controller.signal), expired]); }
  catch (error) {
    if (controller.signal.aborted) throw new ProbeError('PROBE_DEADLINE');
    if (error instanceof ProbeError) throw error;
    throw new ProbeError('PROBE_UNAVAILABLE');
  } finally { clearTimeout(timer); controller.abort(); }
}

function cancelBody(response) { void response.body?.cancel().catch(() => {}); }

async function readStream(response, signal, onFirstByte) {
  const length = response.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_RESPONSE_BYTES)) {
    cancelBody(response);
    throw new ProbeError('RESPONSE_TOO_LARGE');
  }
  requireCondition(response.body, 'INVALID_STREAM');
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', abort, { once: true });
  try {
    while (true) {
      signal.throwIfAborted();
      const next = await reader.read();
      signal.throwIfAborted();
      if (next.done) break;
      if (!next.value.byteLength) continue;
      if (!size) onFirstByte();
      size += next.value.byteLength;
      requireCondition(size <= MAX_RESPONSE_BYTES, 'RESPONSE_TOO_LARGE');
      chunks.push(next.value);
    }
    try { return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)); }
    catch { throw new ProbeError('INVALID_STREAM'); }
  } finally {
    signal.removeEventListener('abort', abort);
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

async function runProbe({ provider, url, token, fetchImpl = fetch, now = () => performance.now(), timeoutMs = DEADLINE_MS }) {
  configuration(url, token);
  requireCondition(Object.hasOwn(MODELS, provider), 'INVALID_PROVIDER');
  const started = now();
  let firstByte;
  return deadline(async signal => {
    const response = await fetchImpl(url, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }), signal, redirect: 'error'
    });
    if (response.status !== 200) { cancelBody(response); throw new ProbeError('UNEXPECTED_HTTP_STATUS', response.status); }
    if (!/^text\/event-stream(?:;|$)/i.test(response.headers.get('content-type') ?? '')) {
      cancelBody(response); throw new ProbeError('INVALID_STREAM');
    }
    const text = await readStream(response, signal, () => { firstByte = now(); });
    const receipt = parseProbeStream(text, provider);
    const finished = now();
    requireCondition(Number.isFinite(started) && Number.isFinite(firstByte) && Number.isFinite(finished) &&
      firstByte >= started && finished >= firstByte, 'INVALID_TIMING');
    return { ...receipt, latencyMs: { firstByte: Math.round(firstByte - started), total: Math.round(finished - started) } };
  }, timeoutMs);
}

async function runNegativeChecks({ url, token, fetchImpl = fetch, timeoutMs = DEADLINE_MS }) {
  configuration(url, token);
  const wrongToken = (token[0] === 'A' ? 'B' : 'A') + token.slice(1);
  const cases = [
    { name: 'missing_auth', url, expected: 401 },
    { name: 'wrong_auth', url, token: wrongToken, expected: 401 },
    { name: 'unlisted_path', url: url.replace(/\/_probe$/, '/_not_a_route'), token, expected: 404 }
  ];
  const receipts = [];
  for (const check of cases) {
    receipts.push(await deadline(async signal => {
      const headers = { 'Content-Type': 'application/json' };
      if (check.token) headers.Authorization = `Bearer ${check.token}`;
      const response = await fetchImpl(check.url, {
        method: 'POST', headers, body: '{"provider":"openai"}', signal, redirect: 'error'
      });
      cancelBody(response);
      if (response.status !== check.expected) throw new ProbeError('NEGATIVE_CHECK_FAILED', response.status);
      return { status: 'passed', check: check.name, httpStatus: response.status, evidence: 'observed_http_only' };
    }, timeoutMs));
  }
  return receipts;
}

async function runFromEnvironment({ env = process.env, args = process.argv.slice(2), fetchImpl = fetch } = {}) {
  requireCondition(args.length === 0 || args.length === 1 && args[0] === '--negative', 'INVALID_ARGUMENTS');
  const options = { url: env.JOSH_CHAT_PROBE_URL, token: env.JOSH_CHAT_PROBE_TOKEN, fetchImpl };
  configuration(options.url, options.token);
  if (args[0] === '--negative') return { status: 'passed', checks: await runNegativeChecks(options) };
  const probes = [];
  // Sequential calls keep this an intentional two-request operator check.
  for (const provider of Object.keys(MODELS)) probes.push(await runProbe({ ...options, provider }));
  return { status: 'passed', probes };
}

if (require.main === module) {
  runFromEnvironment().then(receipt => process.stdout.write(JSON.stringify(receipt) + '\n')).catch(error => {
    const safe = error instanceof ProbeError ? error : new ProbeError('PROBE_UNAVAILABLE');
    process.stderr.write(JSON.stringify({ status: 'failed', code: safe.code, ...(safe.httpStatus ? { httpStatus: safe.httpStatus } : {}) }) + '\n');
    process.exitCode = 1;
  });
}

module.exports = { MODELS, ProbeError, runProbe, runNegativeChecks, runFromEnvironment, parseProbeStream };
