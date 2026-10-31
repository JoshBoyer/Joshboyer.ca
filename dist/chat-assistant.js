/* Private portfolio chat. The browser displays only canonical public evidence. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.PortfolioChat = api;
    if (root.document) {
      const start = () => api.boot(root.document);
      if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, { once: true });
      else start();
    }
  }
})(globalThis, function () {
  'use strict';
  const VERSION = '1.0.0';
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  const SOURCE_URL = /^https:\/\/joshboyer\.ca\/(?:index\.html)?#projects\/(?:dell|foundations|headquarters|inquiry|workflows|newbusiness|renewals|upload|claims|takeover|continuity|sql|nexus)$/;
  const NOTICE_CODES = ['unsupported_evidence', 'limited_evidence', 'tools_unavailable', 'retrieval_degraded', 'general_knowledge'];
  const ERROR_CODES = ['unavailable', 'invalid_request', 'session_expired', 'rate_limited', 'budget_exhausted', 'deadline_exceeded', 'upstream_failure', 'validation_failed', 'request_conflict'];
  const STATUS_LABELS = { accepted: 'Request received', retrieving: 'Finding relevant evidence', thinking: 'Thinking about your request', validating: 'Checking the response' };
  const TRACE_STAGES = Object.freeze({
    context: { label: 'Approved context', explanation: 'The versioned public evidence supplied with this question.' },
    budget: { label: 'Spending reservation', explanation: 'An allowance is held before a paid model request can start.' },
    provider: { label: 'Model request', explanation: 'Provider activity reported by the backend. Timing covers the Gateway and model together.' },
    validation: { label: 'Answer validation', explanation: 'The selected claims are checked against the approved public evidence.' },
    settlement: { label: 'Usage settlement', explanation: 'Reported usage is reconciled with the reserved allowance.' }
  });
  const TRACE_STATES = Object.freeze({ started: 'Started', completed: 'Completed', failed: 'Failed', cancelled: 'Cancelled' });
  const TRACE_FIELDS = ['stage', 'state', 'elapsedMs', 'durationMs', 'attempt', 'provider', 'model', 'corpusVersion', 'claimCount',
    'reservedMicros', 'chargedMicros', 'priceVersion', 'usageStatus', 'inputTokens', 'outputTokens', 'cacheReadInputTokens',
    'cacheWriteInputTokens', 'reasoningOutputTokens', 'providerRequestId', 'gatewayRequestId', 'code', 'replayed'];
  const TOKEN_FIELDS = Object.freeze({ inputTokens: 'Input tokens', outputTokens: 'Output tokens', cacheReadInputTokens: 'Cache read tokens',
    cacheWriteInputTokens: 'Cache write tokens', reasoningOutputTokens: 'Reasoning tokens' });
  const ERROR_LABELS = {
    unavailable: 'Chat is unavailable. Try again later.',
    invalid_request: 'Check your question and try again.',
    session_expired: 'This conversation has expired. Clear it to start again.',
    rate_limited: 'The chat limit has been reached. Please wait before trying again.',
    budget_exhausted: 'The chat spending allowance has been reached. Please try again later.',
    deadline_exceeded: 'The answer took too long. You can check this request again.',
    upstream_failure: 'The model service could not finish this request.',
    validation_failed: 'The answer could not be verified against the approved evidence.',
    request_conflict: 'This request is already running or cannot be repeated with different text.'
  };
  const encoder = new TextEncoder();
  const record = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
  const exact = (value, keys) => record(value) && Object.keys(value).sort().join(',') === keys.slice().sort().join(',');
  const copy = value => JSON.parse(JSON.stringify(value));
  function fail(code = 'validation_failed', status = 0) {
    const error = new Error(ERROR_LABELS[code] || ERROR_LABELS.unavailable);
    error.code = code;
    error.status = status;
    throw error;
  }
  function equal(left, right) {
    if (left === right) return true;
    if (Array.isArray(left) && Array.isArray(right)) return left.length === right.length && left.every((value, index) => equal(value, right[index]));
    if (!record(left) || !record(right)) return false;
    const keys = Object.keys(left);
    return keys.length === Object.keys(right).length && keys.every(key => Object.hasOwn(right, key) && equal(left[key], right[key]));
  }
  function validateEvidence(value) {
    if (!exact(value, ['schemaVersion', 'corpusVersion', 'claims', 'sources', 'notices', 'pageContexts']) ||
        value.schemaVersion !== VERSION || !/^sha256:[0-9a-f]{64}$/.test(value.corpusVersion) ||
        !Array.isArray(value.claims) || value.claims.length > 512 || !Array.isArray(value.sources) || value.sources.length > 128 ||
        !Array.isArray(value.notices) || value.notices.length !== NOTICE_CODES.length || !Array.isArray(value.pageContexts)) fail();
    const sources = new Map();
    for (const source of value.sources) {
      if (!exact(source, ['id', 'url', 'revision']) || typeof source.id !== 'string' || !/^[a-z][a-z0-9-]{0,127}$/.test(source.id) ||
          typeof source.url !== 'string' || source.url.length > 256 || !SOURCE_URL.test(source.url) ||
          typeof source.revision !== 'string' || !source.revision.length || source.revision.length > 128 || sources.has(source.id)) fail();
      sources.set(source.id, source);
    }
    const claims = new Set();
    for (const claim of value.claims) {
      if (!exact(claim, ['kind', 'claimId', 'title', 'period', 'text', 'qualificationNotes', 'sourceIds']) || claim.kind !== 'claim' ||
          typeof claim.claimId !== 'string' || !/^claim-[a-z0-9-]{1,122}$/.test(claim.claimId) || claims.has(claim.claimId) ||
          typeof claim.title !== 'string' || !claim.title.length || claim.title.length > 256 ||
          typeof claim.period !== 'string' || !claim.period.length || claim.period.length > 128 ||
          typeof claim.text !== 'string' || !claim.text.length || claim.text.length > 4096 ||
          !Array.isArray(claim.qualificationNotes) || claim.qualificationNotes.length > 16 ||
          claim.qualificationNotes.some(note => typeof note !== 'string' || !note.length || note.length > 2048) ||
          !Array.isArray(claim.sourceIds) || !claim.sourceIds.length || claim.sourceIds.length > 16 ||
          new Set(claim.sourceIds).size !== claim.sourceIds.length || claim.sourceIds.some(id => !sources.has(id))) fail();
      claims.add(claim.claimId);
    }
    const notices = new Set();
    for (const notice of value.notices) {
      if (!exact(notice, ['kind', 'code', 'text']) || notice.kind !== 'notice' || !NOTICE_CODES.includes(notice.code) || notices.has(notice.code) ||
          typeof notice.text !== 'string' || !notice.text.length || notice.text.length > 512) fail();
      notices.add(notice.code);
    }
    if (value.pageContexts.some(context => typeof context !== 'string' || !/^#(?:home|career|skills|projects(?:\/(?:dell|foundations|headquarters|inquiry|workflows|newbusiness|renewals|upload|claims|takeover|continuity|sql|nexus))?)$/.test(context))) fail();
    return copy(value);
  }
  function validateTraceData(value) {
    if (!record(value) || Object.keys(value).some(key => !TRACE_FIELDS.includes(key)) ||
        !Object.hasOwn(value, 'elapsedMs') || !Object.hasOwn(TRACE_STAGES, value.stage) || !Object.hasOwn(TRACE_STATES, value.state) ||
        (value.elapsedMs !== null && !integer(value.elapsedMs, 0, 60000))) fail();
    for (const [field, maximum] of [['durationMs', 60000], ['claimCount', 512], ['reservedMicros', 25000000], ['chargedMicros', 25000000]]) {
      if (Object.hasOwn(value, field) && !integer(value[field], 0, maximum)) fail();
    }
    if (Object.hasOwn(value, 'attempt') && !integer(value.attempt, 1, 2)) fail();
    for (const field of Object.keys(TOKEN_FIELDS)) {
      if (Object.hasOwn(value, field) && value[field] !== null && !integer(value[field], 0, 1000000)) fail();
    }
    if (Object.hasOwn(value, 'provider') && !['openai', 'anthropic'].includes(value.provider)) fail();
    if (Object.hasOwn(value, 'model') && !['gpt-6-luna', 'claude-haiku-5-5'].includes(value.model)) fail();
    if (value.provider && value.model && (value.provider === 'openai') !== (value.model === 'gpt-6-luna')) fail();
    if (Object.hasOwn(value, 'corpusVersion') && (typeof value.corpusVersion !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(value.corpusVersion))) fail();
    for (const field of ['priceVersion', 'providerRequestId', 'gatewayRequestId']) {
      if (Object.hasOwn(value, field) && (typeof value[field] !== 'string' || !/^[A-Za-z0-9._:-]{1,128}$/.test(value[field]))) fail();
    }
    if (Object.hasOwn(value, 'usageStatus') && !['known', 'unknown'].includes(value.usageStatus)) fail();
    if (Object.hasOwn(value, 'code') && !ERROR_CODES.includes(value.code)) fail();
    if (Object.hasOwn(value, 'replayed') && typeof value.replayed !== 'boolean') fail();
    if (value.elapsedMs === null && value.replayed !== true) fail();
    if (value.durationMs !== undefined && value.elapsedMs !== null && value.durationMs > value.elapsedMs) fail();
    if (value.chargedMicros !== undefined && value.reservedMicros !== undefined && value.chargedMicros > value.reservedMicros) fail();
    const required = value.stage === 'provider' ? ['attempt', 'provider', 'model']
      : value.stage === 'context' ? ['corpusVersion', 'claimCount']
      : value.stage === 'budget' ? ['reservedMicros', 'priceVersion']
      : value.stage === 'settlement' && value.state === 'completed' ? ['reservedMicros', 'chargedMicros', 'priceVersion'] : [];
    if (required.some(key => !Object.hasOwn(value, key))) fail();
    return copy(value);
  }
  function validateConversation(value) {
    if (!exact(value, ['kind', 'text', 'suggestions']) || !['general', 'portfolio', 'clarification', 'refusal'].includes(value.kind) ||
        typeof value.text !== 'string' || !value.text.trim() || encoder.encode(value.text).byteLength > 6000 ||
        !Array.isArray(value.suggestions) || value.suggestions.length > 3 ||
        value.suggestions.some(text => typeof text !== 'string' || !text.trim() || encoder.encode(text).byteLength > 200)) fail();
    return copy(value);
  }
  function createEventValidator({ requestId, generation, evidence, allowTools = false }) {
    if (!UUID.test(requestId) || !UUID.test(generation)) fail();
    const approved = validateEvidence(evidence);
    const claims = new Map(approved.claims.map(claim => [claim.claimId, claim]));
    const notices = new Map(approved.notices.map(notice => [notice.code, notice]));
    const sources = new Map(approved.sources.map(source => [source.id, source]));
    const selectedClaims = new Set(), selectedNotices = new Set(), selectedSources = new Set();
    const tools = new Map(), pendingTools = new Set();
    const traceStages = new Map();
    let sequence = 1, terminal = false, revoked = false, receipt = false, answer = false, conversation = false, traceCount = 0, traceElapsed = 0;
    return Object.freeze({
      accept(frame) {
        if (revoked || terminal || !exact(frame, ['schemaVersion', 'requestId', 'generation', 'seq', 'event', 'data']) ||
            frame.schemaVersion !== VERSION || frame.requestId !== requestId || frame.generation !== generation ||
            frame.seq !== sequence || !integer(frame.seq, 1, 96) || !record(frame.data)) fail();
        const data = frame.data;
        switch (frame.event) {
          case 'status':
            if (answer || conversation || receipt || !exact(data, ['code']) || !Object.hasOwn(STATUS_LABELS, data.code)) fail();
            break;
          case 'conversation':
            validateConversation(data);
            if (conversation || answer || receipt || pendingTools.size || [...traceStages.values()].includes('started')) fail();
            conversation = true;
            break;
          case 'trace': {
            const trace = validateTraceData(data);
            if (answer || conversation || receipt || traceCount >= 24 || (trace.elapsedMs !== null && trace.elapsedMs < traceElapsed) ||
                (trace.corpusVersion && trace.corpusVersion !== approved.corpusVersion)) fail();
            const key = ['provider', 'validation'].includes(trace.stage) ? `${trace.stage}-${trace.attempt ?? 1}` : trace.stage;
            const previous = traceStages.get(key);
            if ((previous && previous !== 'started') || (previous === 'started' && trace.state === 'started') ||
                (!previous && ['provider', 'validation'].includes(trace.stage) && trace.state !== 'started')) fail();
            traceCount += 1;
            if (trace.elapsedMs !== null) traceElapsed = trace.elapsedMs;
            traceStages.set(key, trace.state);
            break;
          }
          case 'tool_start':
            if (!allowTools || answer || conversation || receipt || !exact(data, ['toolCallId', 'name']) ||
                !/^tool-[a-zA-Z0-9_-]{1,64}$/.test(data.toolCallId) || tools.has(data.toolCallId) || tools.size >= 4 ||
                !['search_public_evidence', 'get_case_study', 'compare_job_requirements'].includes(data.name)) fail();
            tools.set(data.toolCallId, data.name); pendingTools.add(data.toolCallId);
            break;
          case 'tool_end':
            if (!allowTools || !exact(data, ['toolCallId', 'name', 'outcome']) || !pendingTools.has(data.toolCallId) ||
                tools.get(data.toolCallId) !== data.name || !['completed', 'error', 'timeout'].includes(data.outcome)) fail();
            pendingTools.delete(data.toolCallId);
            break;
          case 'answer_block': {
            if (receipt || pendingTools.size || [...traceStages.values()].includes('started')) fail();
            const canonical = data.kind === 'claim' ? claims.get(data.claimId) : notices.get(data.code);
            if (!canonical || !equal(data, canonical)) fail();
            if (data.kind === 'claim') {
              if (selectedClaims.has(data.claimId) || selectedClaims.size >= 8) fail();
              selectedClaims.add(data.claimId); data.sourceIds.forEach(id => selectedSources.add(id));
            } else {
              if (selectedNotices.has(data.code) || selectedNotices.size >= 3) fail();
              selectedNotices.add(data.code);
            }
            answer = true;
            break;
          }
          case 'sources':
            if ((!answer && !conversation) || receipt || !exact(data, ['corpusVersion', 'sources']) || data.corpusVersion !== approved.corpusVersion ||
                !equal(data.sources, [...selectedSources].map(id => sources.get(id)))) fail();
            receipt = true;
            break;
          case 'done':
            if (!exact(data, ['outcome']) || !['completed', 'limited', 'cancelled'].includes(data.outcome) ||
                (data.outcome !== 'cancelled' && ((!answer && !conversation) || !receipt || pendingTools.size || [...traceStages.values()].includes('started')))) fail();
            terminal = true;
            break;
          case 'error':
            if (!exact(data, ['code', 'retryable']) || !ERROR_CODES.includes(data.code) || typeof data.retryable !== 'boolean') fail();
            terminal = true;
            break;
          default: fail();
        }
        sequence += 1;
        return copy(frame);
      },
      revoke() { revoked = true; },
      get terminal() { return terminal; }
    });
  }
  async function readJson(response, limit = 131072) {
    if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('Content-Type') || '')) fail();
    const bytes = await readBytes(response.body, limit);
    try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { fail(); }
  }
  async function readBytes(stream, limit) {
    if (!stream) fail();
    const reader = stream.getReader(), chunks = [];
    let size = 0;
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        size += next.value.byteLength;
        if (size > limit) fail();
        chunks.push(next.value);
      }
    } catch (error) {
      await reader.cancel().catch(() => {});
      throw error;
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return bytes;
  }
  async function readEventStream(response, { validator, onEvent, signal }) {
    if (!response.body || !/^text\/event-stream(?:\s*;|$)/i.test(response.headers.get('Content-Type') || '')) fail();
    const reader = response.body.getReader(), decoder = new TextDecoder('utf-8', { fatal: true });
    let buffer = '', total = 0;
    const aborted = () => { validator.revoke(); void reader.cancel().catch(() => {}); };
    signal?.addEventListener('abort', aborted, { once: true });
    function dispatch(raw) {
      if (!raw.trim()) return;
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      if (encoder.encode(raw).byteLength > 65536) fail();
      let event, data = [];
      for (const line of raw.split('\n')) {
        if (!line || line.startsWith(':')) continue;
        if (line.startsWith('event:') && event === undefined) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
        else fail();
      }
      if (!data.length) { if (event !== undefined) fail(); return; }
      let frame;
      try { frame = JSON.parse(data.join('\n')); } catch { fail(); }
      if (event !== undefined && event !== frame.event) fail();
      onEvent(validator.accept(frame));
    }
    try {
      while (true) {
        if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
        const next = await reader.read();
        if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
        if (next.done) { buffer += decoder.decode(); break; }
        total += next.value.byteLength;
        if (total > 262144) fail();
        buffer += decoder.decode(next.value, { stream: true });
        buffer = buffer.replace(/\r\n/g, '\n');
        let boundary;
        while ((boundary = buffer.indexOf('\n\n')) !== -1) {
          const raw = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2); dispatch(raw);
        }
        if (encoder.encode(buffer).byteLength > 65536) fail();
      }
      if (buffer.trim()) fail();
      if (!validator.terminal) fail('upstream_failure');
    } catch (error) {
      validator.revoke(); await reader.cancel().catch(() => {}); throw error;
    } finally { signal?.removeEventListener('abort', aborted); reader.releaseLock(); }
  }
  function configValue(value) {
    if (!exact(value, ['schemaVersion', 'available', 'capabilities', 'limits']) || value.schemaVersion !== VERSION || typeof value.available !== 'boolean' ||
        !exact(value.capabilities, ['chat', 'cag', 'rag', 'mcp', 'voice']) || value.capabilities.voice !== false ||
        ['chat', 'cag', 'rag', 'mcp'].some(key => typeof value.capabilities[key] !== 'boolean') ||
        !exact(value.limits, ['maxMessageBytes', 'maxTurns', 'maxToolsPerTurn', 'turnDeadlineMs']) ||
        !integer(value.limits.maxMessageBytes, 1, 8192) || !integer(value.limits.maxTurns, 1, 8) ||
        !integer(value.limits.maxToolsPerTurn, 0, 4) || !integer(value.limits.turnDeadlineMs, 1, 60000)) fail();
    return value;
  }
  function sessionValue(value) {
    if (!exact(value, ['schemaVersion', 'generation', 'expiresAt', 'remainingTurns']) || value.schemaVersion !== VERSION ||
        !UUID.test(value.generation) || !integer(value.expiresAt, 1, Number.MAX_SAFE_INTEGER) || !integer(value.remainingTurns, 0, 8)) fail();
    return value;
  }
  function responseErrorCode(value) {
    if (!record(value)) return undefined;
    return value.code || (record(value.error) ? value.error.code : value.error);
  }
  function createClient(options = {}) {
    const fetcher = options.fetchImpl || fetch;
    const now = options.now || Date.now;
    const uuid = options.uuid || (() => crypto.randomUUID());
    let config, evidence, session, active, lastRequest, epoch = 0;
    async function request(path, method = 'GET', body, signal) {
      const headers = { Accept: 'application/json' };
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      const response = await fetcher(path, { method, headers, credentials: 'same-origin', cache: 'no-store', redirect: 'error',
        ...(body === undefined ? {} : { body: JSON.stringify(body) }), ...(signal ? { signal } : {}) });
      if (!response.ok) {
        let code;
        try { code = responseErrorCode(await readJson(response, 8192)); } catch { /* Never echo server error text. */ }
        fail(ERROR_CODES.includes(code) ? code : response.status === 429 ? 'rate_limited' : response.status === 409 ? 'request_conflict' : response.status === 401 ? 'session_expired' : 'unavailable', response.status);
      }
      return response;
    }
    async function ensureSession(expectedEpoch = epoch) {
      if (session && session.expiresAt <= now()) fail('session_expired');
      if (!session) {
        const created = sessionValue(await readJson(await request('/api/chat/session', 'POST', {}), 8192));
        if (expectedEpoch !== epoch) throw new DOMException('Cancelled', 'AbortError');
        session = created;
      }
      return session;
    }
    async function run(payload, onEvent, isRetry) {
      if (active) fail('request_conflict');
      if (!config?.available || !config.capabilities.chat || !evidence) fail('unavailable');
      if (!exact(payload, Object.hasOwn(payload, 'pageContext') ? ['schemaVersion', 'requestId', 'text', 'pageContext'] : ['schemaVersion', 'requestId', 'text']) ||
          payload.schemaVersion !== VERSION || !UUID.test(payload.requestId) || typeof payload.text !== 'string' || !payload.text.trim() ||
          encoder.encode(payload.text).byteLength > config.limits.maxMessageBytes ||
          (payload.pageContext !== undefined && !evidence.pageContexts.includes(payload.pageContext))) fail('invalid_request');
      const operation = { controller: new AbortController(), epoch, request: copy(payload), validator: null };
      active = operation;
      lastRequest = copy(payload);
      try {
        const current = await ensureSession(operation.epoch);
        if (operation.epoch !== epoch || operation.controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        if (!isRetry && current.remainingTurns <= 0) fail('rate_limited');
        const validator = createEventValidator({ requestId: payload.requestId, generation: current.generation, evidence, allowTools: config.capabilities.mcp });
        operation.validator = validator;
        const response = await fetcher('/api/chat/messages', {
          method: 'POST', headers: { Accept: 'text/event-stream', 'Content-Type': 'application/json' },
          credentials: 'same-origin', cache: 'no-store', redirect: 'error', body: JSON.stringify(payload), signal: operation.controller.signal
        });
        if (!response.ok) {
          let code;
          try { code = responseErrorCode(await readJson(response, 8192)); } catch { /* Error responses contain no displayable prose. */ }
          fail(ERROR_CODES.includes(code) ? code : response.status === 429 ? 'rate_limited' : response.status === 409 ? 'request_conflict' : response.status === 401 ? 'session_expired' : 'unavailable', response.status);
        }
        if (response.status === 202) {
          const pending = await readJson(response, 8192);
          if (!exact(pending, ['schemaVersion', 'requestId', 'generation', 'status']) || pending.schemaVersion !== VERSION ||
              pending.requestId !== payload.requestId || pending.generation !== current.generation || pending.status !== 'running') fail();
          fail('request_conflict', 202);
        }
        let streamFailure;
        await readEventStream(response, { validator, signal: operation.controller.signal, onEvent(frame) {
          if (operation.epoch !== epoch || active !== operation) return;
          if (frame.event === 'error') streamFailure = frame.data;
          if (frame.event === 'done' && frame.data.outcome !== 'cancelled' && !isRetry) current.remainingTurns = Math.max(0, current.remainingTurns - 1);
          onEvent(frame);
        } });
        if (streamFailure) fail(streamFailure.code);
        lastRequest = null;
      } finally { if (active === operation) active = null; }
    }
    return Object.freeze({
      async initialise() {
        const operationEpoch = epoch;
        config = configValue(await readJson(await request('/api/chat/config'), 8192));
        if (!config.available || !config.capabilities.chat) return copy(config);
        evidence = validateEvidence(await readJson(await request('/chat-evidence.json')));
        if (operationEpoch !== epoch) fail('unavailable');
        await ensureSession(operationEpoch);
        return copy(config);
      },
      send(text, onEvent, pageContext) {
        return run({ schemaVersion: VERSION, requestId: uuid(), text, ...(evidence?.pageContexts.includes(pageContext) ? { pageContext } : {}) }, onEvent, false);
      },
      retry(onEvent) { if (!lastRequest) fail('invalid_request'); return run(copy(lastRequest), onEvent, true); },
      async cancel() {
        const operation = active;
        if (!operation) return;
        operation.validator?.revoke();
        operation.controller.abort();
        const result = await readJson(await request(`/api/chat/requests/${operation.request.requestId}/cancel`, 'POST', {}), 8192);
        if (!exact(result, ['schemaVersion', 'requestId', 'status']) || result.schemaVersion !== VERSION || result.requestId !== operation.request.requestId ||
            !['requested', 'already_finished'].includes(result.status)) fail();
        return result;
      },
      async clear() {
        epoch += 1;
        active?.validator?.revoke(); active?.controller.abort(); active = null;
        lastRequest = null; session = null;
        const result = await readJson(await request('/api/chat/session', 'DELETE', {}), 8192);
        if (!exact(result, ['schemaVersion', 'cleared']) || result.schemaVersion !== VERSION || result.cleared !== true) fail();
      },
      get session() { return session ? copy(session) : null; },
      get requestId() { return active?.request.requestId || lastRequest?.requestId || null; },
      get canRetry() { return !!lastRequest && !active; }
    });
  }
  function element(document, name, className, text) {
    const node = document.createElement(name);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function renderBlock(document, block) {
    const section = element(document, 'section', `chat-answer-block chat-answer-${block.kind}`);
    if (block.kind === 'notice') section.append(element(document, 'p', '', block.text));
    else {
      section.append(element(document, 'p', 'chat-answer-period', block.period), element(document, 'h3', '', block.title), element(document, 'p', '', block.text));
      if (block.qualificationNotes.length) {
        const notes = element(document, 'ul', 'chat-qualifications');
        block.qualificationNotes.forEach(note => notes.append(element(document, 'li', '', note)));
        section.append(notes);
      }
    }
    return section;
  }
  function renderSources(document, sources) {
    const section = element(document, 'div', 'chat-sources');
    section.append(element(document, 'p', 'chat-small-label', sources.length ? 'Public sources' : 'No supported source for this claim'));
    sources.forEach((source, index) => {
      if (!SOURCE_URL.test(source.url)) fail();
      const link = element(document, 'a', '', `${index + 1}. ${source.id.replace(/^source-/, '').replace(/-/g, ' ')}`);
      link.href = source.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; section.append(link);
    });
    return section;
  }
  function formatTraceTime(milliseconds) {
    return milliseconds < 1000 ? `${milliseconds} ms` : `${(milliseconds / 1000).toLocaleString('en-CA', { maximumFractionDigits: 3 })} s`;
  }
  function formatAllowance(micros) {
    return (micros / 1000000).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  }
  function createRequestTimeline(document) {
    const panel = element(document, 'details', 'chat-request-trace'); panel.open = true; panel.setAttribute('aria-live', 'off');
    const summary = element(document, 'summary', 'chat-trace-summary');
    const summaryLabel = element(document, 'span', 'chat-trace-title', 'Request activity');
    const summaryState = element(document, 'span', 'chat-trace-summary-state', 'Waiting for server');
    summary.append(summaryLabel, summaryState);
    const content = element(document, 'div', 'chat-trace-content');
    const waiting = element(document, 'p', 'chat-trace-waiting', 'Waiting for the server to report this request’s stages.');
    const rows = element(document, 'ol', 'chat-trace-stages');
    const footer = element(document, 'dl', 'chat-trace-request');
    const requestLabel = element(document, 'dt', '', 'Request ID');
    const requestValue = element(document, 'dd', 'chat-trace-id', 'Not assigned yet');
    const note = element(document, 'p', 'chat-trace-note', 'Only reported activity appears here. Retrieval and tools are not enabled in this preview.');
    footer.append(requestLabel, requestValue); content.append(waiting, rows, footer, note); panel.append(summary, content);
    const groups = new Map();
    let count = 0, elapsed = 0, requestId, finished = false, corpusValue, replayed = false, finalOutcome;
    function identify(id) {
      if (!UUID.test(id) || (requestId && requestId !== id)) fail();
      requestId = id; requestValue.textContent = id;
    }
    function addFact(list, label, value, monospace = false) {
      list.append(element(document, 'dt', '', label), element(document, 'dd', monospace ? 'chat-trace-id' : '', value));
    }
    function updateGroup(group) {
      const value = group.latest;
      group.row.className = `chat-trace-stage is-${value.state}`;
      group.state.textContent = TRACE_STATES[value.state];
      group.time.textContent = value.elapsedMs === null
        ? (value.replayed ? 'Original request' : 'Timing not recorded')
        : value.durationMs !== undefined ? formatTraceTime(value.durationMs) : `at ${formatTraceTime(value.elapsedMs)}`;
      const facts = element(document, 'dl', 'chat-trace-facts');
      if (value.provider) addFact(facts, 'Provider', value.provider === 'openai' ? 'OpenAI' : 'Anthropic');
      if (value.model) addFact(facts, 'Model', value.model, true);
      if (value.attempt !== undefined) addFact(facts, 'Attempt', String(value.attempt));
      if (value.elapsedMs !== null) addFact(facts, 'Reported at', `${formatTraceTime(value.elapsedMs)} from request start`);
      else addFact(facts, 'Timing', value.replayed ? 'Recorded on original request' : 'Not recorded');
      if (value.durationMs !== undefined) addFact(facts, value.stage === 'provider' ? 'Gateway + model duration' : 'Stage duration', formatTraceTime(value.durationMs));
      if (value.corpusVersion) addFact(facts, 'Evidence version', value.corpusVersion, true);
      if (value.claimCount !== undefined) addFact(facts, 'Approved claims', value.claimCount.toLocaleString('en-CA'));
      if (value.reservedMicros !== undefined) addFact(facts, 'Reserved allowance (USD)', formatAllowance(value.reservedMicros));
      if (value.chargedMicros !== undefined) {
        const allowanceLabel = value.stage === 'settlement' && value.state === 'completed' ? 'Settled allowance (USD)' : 'Estimated usage allowance (USD)';
        addFact(facts, allowanceLabel, formatAllowance(value.chargedMicros));
      }
      if (value.priceVersion) addFact(facts, 'Price version', value.priceVersion, true);
      if (value.usageStatus) addFact(facts, 'Usage', value.usageStatus === 'known' ? 'Reported by provider' : 'Not reported; reservation remains counted');
      for (const [key, label] of Object.entries(TOKEN_FIELDS)) {
        if (Object.hasOwn(value, key) || value.usageStatus) addFact(facts, label, value[key] === null || value[key] === undefined ? 'Not reported' : value[key].toLocaleString('en-CA'));
      }
      if (value.providerRequestId) addFact(facts, 'Provider request ID', value.providerRequestId, true);
      if (value.gatewayRequestId) addFact(facts, 'Gateway request ID', value.gatewayRequestId, true);
      if (value.code) addFact(facts, 'Outcome', ERROR_LABELS[value.code]);
      if (value.replayed) addFact(facts, 'Record', 'Replayed from the original request');
      const points = element(document, 'ol', 'chat-trace-points');
      for (const point of group.points) {
        const at = point.elapsedMs === null ? (point.replayed ? 'recorded on original request' : 'timing not recorded') : `at ${formatTraceTime(point.elapsedMs)}`;
        points.append(element(document, 'li', '', `${TRACE_STATES[point.state]} · ${at}`));
      }
      group.body.replaceChildren(element(document, 'p', 'chat-trace-explanation', TRACE_STAGES[value.stage].explanation), facts, points);
      if (value.reservedMicros !== undefined || value.chargedMicros !== undefined) {
        group.body.append(element(document, 'p', 'chat-trace-ledger-note', 'Amounts are application ledger estimates, not provider invoices.'));
      }
    }
    return Object.freeze({
      element: panel,
      identify,
      accept(frame) {
        if (finished || frame.event !== 'trace') fail();
        identify(frame.requestId);
        const value = validateTraceData(frame.data);
        if (count >= 24 || (value.elapsedMs !== null && value.elapsedMs < elapsed)) fail();
        count += 1;
        if (value.elapsedMs !== null) elapsed = value.elapsedMs;
        if (value.corpusVersion) corpusValue = value.corpusVersion;
        if (value.replayed) replayed = true;
        waiting.hidden = true;
        const key = ['provider', 'validation'].includes(value.stage) ? `${value.stage}-${value.attempt ?? 1}` : value.stage;
        let group = groups.get(key);
        if (!group) {
          const row = element(document, 'li', 'chat-trace-stage');
          const detail = element(document, 'details', 'chat-trace-stage-detail');
          const rowSummary = element(document, 'summary', 'chat-trace-stage-summary');
          const ordinal = element(document, 'span', 'chat-trace-ordinal', String(groups.size + 1).padStart(2, '0'));
          const label = element(document, 'span', 'chat-trace-stage-name', `${TRACE_STAGES[value.stage].label}${value.attempt ? ` · attempt ${value.attempt}` : ''}`);
          const state = element(document, 'span', 'chat-trace-stage-state');
          const time = element(document, 'span', 'chat-trace-stage-time');
          const body = element(document, 'div', 'chat-trace-stage-body');
          rowSummary.append(ordinal, label, state, time); detail.append(rowSummary, body); row.append(detail); rows.append(row);
          group = { row, body, state, time, latest: {}, points: [] }; groups.set(key, group);
        }
        group.latest = { ...group.latest, ...value }; group.points.push(value); updateGroup(group);
        summaryState.textContent = `${TRACE_STAGES[value.stage].label} · ${TRACE_STATES[value.state].toLowerCase()}${replayed ? ' · recorded run' : ''}`;
      },
      finish(outcome, { retained = false } = {}) {
        finished = true;
        finalOutcome = outcome;
        summaryState.textContent = outcome === 'completed' || outcome === 'limited' ? 'Complete' : outcome === 'cancelled' ? 'Stopped' : 'Interrupted';
        if (replayed) summaryState.textContent += ' · recorded run';
        if (retained && count) {
          summaryState.textContent += ' · last reported activity';
          note.textContent = 'This check returned no additional stage details. The last reported activity is preserved here; it does not indicate that work is still running.';
        }
        if (!count) {
          waiting.textContent = 'No stage details were recorded for this request.';
          summaryState.textContent = 'No trace recorded'; panel.open = false;
        }
        if (corpusValue) {
          addFact(footer, 'Evidence version', corpusValue, true);
          corpusValue = undefined;
        }
      },
      get outcome() { return finalOutcome; }
    });
  }
  function renderParagraphs(document, host, text) {
    host.replaceChildren(...text.split(/\n\s*\n/).map(paragraph => element(document, 'p', '', paragraph)));
  }
  function createAnswerView(document, previous, options = {}) {
    const card = element(document, 'article', 'chat-message chat-answer');
    const timeline = createRequestTimeline(document);
    const body = element(document, 'div', 'chat-answer-text'); renderParagraphs(document, body, 'Thinking…');
    const suggestions = element(document, 'div', 'chat-suggestions');
    const actions = element(document, 'div', 'chat-response-actions');
    const detailsButton = element(document, 'button', 'chat-view-details', 'View details'); detailsButton.type = 'button';
    detailsButton.setAttribute('aria-label', 'View request evidence and trace');
    actions.append(detailsButton);
    card.append(element(document, 'p', 'chat-small-label', 'Assistant'), body, suggestions, actions);
    const evidence = element(document, 'section', 'chat-request-evidence');
    const evidenceIntro = element(document, 'p', 'chat-evidence-intro', 'Evidence references will appear here if this response uses the public portfolio.');
    const blocks = element(document, 'div', 'chat-evidence-blocks');
    const sources = element(document, 'div', 'chat-evidence-sources');
    evidence.append(evidenceIntro, blocks, sources);
    const candidate = { element: card, timeline, evidence, body, detailsButton, requestId: null, kind: null, claims: [], notices: [], hasConversation: false };
    detailsButton.addEventListener('click', () => options.onDetails?.(candidate, detailsButton));
    let current = previous?.view || candidate;
    function finishText(outcome) {
      if (current.hasConversation) return;
      if (outcome === 'completed' || outcome === 'limited') {
        const text = current.claims.length
          ? current.claims.map(claim => [claim.text, ...claim.qualificationNotes].join('\n\n')).join('\n\n')
          : current.notices.map(notice => notice.text).join('\n\n');
        renderParagraphs(document, current.body, text || 'There is no supported response available for this request.');
      } else renderParagraphs(document, current.body, outcome === 'cancelled' ? 'Stopped before a response was returned.' : 'The response was interrupted. You can check this request again.');
    }
    return Object.freeze({
      get view() { return current; },
      get element() { return current.element; },
      identify(id) { timeline.identify(id); candidate.requestId = id; },
      accept(frame) {
        // An empty cancellation receipt must not replace details already seen.
        // A real replay starts a fresh view instead of appending duplicate points.
        if (['trace', 'conversation', 'answer_block'].includes(frame.event)) current = candidate;
        current.requestId = frame.requestId;
        if (frame.event === 'trace') current.timeline.accept(frame);
        else current.timeline.identify(frame.requestId);
        if (frame.event === 'conversation') {
          const conversation = validateConversation(frame.data);
          current.kind = conversation.kind; current.hasConversation = true;
          renderParagraphs(document, current.body, conversation.text);
          suggestions.replaceChildren(...conversation.suggestions.map(text => {
            const button = element(document, 'button', '', text); button.type = 'button';
            button.addEventListener('click', () => options.onSuggestion?.(text)); return button;
          }));
          evidenceIntro.textContent = conversation.kind === 'general'
            ? 'This is a general response. It does not cite Josh’s portfolio.'
            : conversation.kind === 'portfolio' ? 'Selected public portfolio evidence for this response.' : 'No portfolio evidence has been cited for this response.';
        }
        if (frame.event === 'answer_block') {
          if (frame.data.kind === 'claim') current.claims.push(copy(frame.data));
          else current.notices.push(copy(frame.data));
          blocks.append(renderBlock(document, frame.data));
        }
        if (frame.event === 'sources') {
          if (frame.data.sources.length) {
            evidenceIntro.textContent = 'Selected public portfolio evidence. These references validate the displayed evidence records, not every sentence of the model’s response.';
            sources.replaceChildren(renderSources(document, frame.data.sources),
              element(document, 'p', 'chat-receipt', `Evidence version · ${frame.data.corpusVersion}`));
          } else {
            sources.replaceChildren(element(document, 'p', 'chat-evidence-empty', 'No portfolio references for this response.'));
          }
        }
        if (frame.event === 'done') { current.timeline.finish(frame.data.outcome, { retained: current !== candidate }); finishText(frame.data.outcome); }
        if (frame.event === 'error') { current.timeline.finish('interrupted', { retained: current !== candidate }); finishText('interrupted'); }
      },
      fail(outcome) {
        const retained = current !== candidate;
        current.timeline.finish(retained ? current.timeline.outcome || outcome : outcome, { retained });
        finishText(outcome);
      }
    });
  }
  function createRequestSelection() {
    let latest, selected, pinned = false;
    return Object.freeze({
      update(view) {
        const previousLatest = latest; latest = view;
        if (!selected || (!pinned && selected === previousLatest) || (view.requestId && selected.requestId === view.requestId)) selected = view;
        return selected;
      },
      select(view) { selected = view; pinned = view !== latest; return selected; },
      clear() { latest = selected = undefined; pinned = false; },
      get selected() { return selected; },
      get pinned() { return pinned; }
    });
  }
  function createDetailsPanel(document, options = {}) {
    const selection = createRequestSelection();
    const desktop = element(document, 'aside', 'chat-details-panel'); desktop.setAttribute('aria-label', 'Request details');
    const content = element(document, 'div', 'chat-details-content');
    const heading = element(document, 'header', 'chat-details-heading');
    const title = element(document, 'h2', '', 'Request details'); title.id = 'chat-details-title';
    const close = element(document, 'button', 'chat-details-close', 'Close details'); close.type = 'button';
    heading.append(title, close);
    const identity = element(document, 'p', 'chat-details-identity', 'Choose a response to inspect its evidence and activity.');
    const tabs = element(document, 'div', 'chat-details-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Request details');
    const panels = {}, buttons = {};
    let activeTab = 'evidence', returnFocus, renderedView;
    const dialog = element(document, 'dialog', 'chat-details-dialog'); dialog.setAttribute('aria-labelledby', title.id);
    const mobile = () => options.modalOnly || document.defaultView?.matchMedia?.('(max-width: 900px)').matches === true;
    function activate(name, focus = false) {
      activeTab = name;
      for (const key of ['evidence', 'trace']) {
        buttons[key].setAttribute('aria-selected', String(key === name)); buttons[key].tabIndex = key === name ? 0 : -1;
        panels[key].hidden = key !== name;
      }
      if (focus) buttons[name].focus();
    }
    for (const name of ['evidence', 'trace']) {
      const button = element(document, 'button', '', name === 'evidence' ? 'Evidence' : 'Trace'); button.type = 'button';
      button.id = `chat-${name}-tab`; button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', `chat-${name}-panel`);
      const panel = element(document, 'div', 'chat-details-tab-panel'); panel.id = `chat-${name}-panel`; panel.tabIndex = 0;
      panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', button.id);
      button.addEventListener('click', () => activate(name));
      button.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault(); activate(event.key === 'Home' ? 'evidence' : event.key === 'End' ? 'trace' : name === 'evidence' ? 'trace' : 'evidence', true);
      });
      buttons[name] = button; panels[name] = panel; tabs.append(button);
    }
    content.append(heading, identity, tabs, panels.evidence, panels.trace); desktop.append(content); document.body.append(dialog);
    function render() {
      const view = selection.selected;
      identity.textContent = view?.requestId ? `Request ${view.requestId}` : 'Choose a response to inspect its evidence and activity.';
      if (view && view === renderedView) return;
      renderedView = view;
      panels.evidence.replaceChildren(view?.evidence || element(document, 'p', 'chat-details-empty', 'Selected portfolio evidence will appear here. General responses may have no portfolio references.'));
      panels.trace.replaceChildren(view?.timeline.element || element(document, 'p', 'chat-details-empty', 'Select a response to see the stages reported for that request.'));
    }
    function restore() {
      desktop.append(content);
      if (returnFocus?.isConnected) returnFocus.focus();
    }
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', restore);
    document.defaultView?.matchMedia?.('(max-width: 900px)').addEventListener('change', event => {
      if (!event.matches && !options.modalOnly && dialog.open) dialog.close();
    });
    activate(activeTab); render();
    return Object.freeze({
      element: desktop,
      update(view) { selection.update(view); if (selection.selected === view) render(); },
      open(view, trigger) {
        selection.select(view); render(); returnFocus = trigger;
        if (mobile()) { dialog.append(content); if (!dialog.open) dialog.showModal(); }
        buttons[activeTab].focus();
      },
      clear() { selection.clear(); render(); if (dialog.open) dialog.close(); },
      get selected() { return selection.selected; }
    });
  }
  function mount(host, options = {}) {
    if (host.dataset.chatMounted === 'true') return;
    host.dataset.chatMounted = 'true';
    const document = host.ownerDocument, client = createClient(options);
    const shell = element(document, 'section', 'chat-shell');
    const panel = element(document, 'section', 'chat-panel'); panel.setAttribute('aria-label', 'Chat with Josh’s assistant');
    const details = createDetailsPanel(document, { modalOnly: host.tagName?.toLowerCase() === 'dialog' });
    const heading = element(document, 'header', 'chat-heading');
    const headingCopy = element(document, 'div');
    headingCopy.append(element(document, 'p', 'chat-small-label', 'Private preview'), element(document, 'h1', '', 'Josh’s assistant'));
    const clear = element(document, 'button', 'chat-text-button', 'Clear chat'); clear.type = 'button'; clear.disabled = true;
    heading.append(headingCopy, clear);
    const scope = element(document, 'p', 'chat-scope', 'General help, with Josh’s public portfolio when it is relevant.');
    const messages = element(document, 'div', 'chat-messages'); messages.setAttribute('aria-label', 'Conversation'); messages.setAttribute('role', 'log'); messages.setAttribute('aria-live', 'polite'); messages.setAttribute('aria-relevant', 'additions'); messages.tabIndex = 0;
    const welcome = element(document, 'div', 'chat-welcome');
    welcome.append(element(document, 'span', 'chat-monogram', 'jb.'), element(document, 'h2', '', 'What can I help with?'), element(document, 'p', '', 'Talk through an idea, ask a question, or explore Josh’s work.'));
    const starters = element(document, 'div', 'chat-starters');
    ['Help me think through a project.', 'Explain an API simply.', 'What has Josh built?'].forEach(text => {
      const button = element(document, 'button', '', text); button.type = 'button'; button.disabled = true;
      button.addEventListener('click', () => { input.value = text; form.requestSubmit(); }); starters.append(button);
    });
    welcome.append(starters); messages.append(welcome);
    const status = element(document, 'p', 'chat-status', 'Connecting to private chat…'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); status.setAttribute('aria-atomic', 'true');
    const form = element(document, 'form', 'chat-compose');
    const label = element(document, 'label', 'chat-small-label', 'Your question'); label.htmlFor = 'portfolio-chat-question';
    const input = element(document, 'textarea'); input.id = label.htmlFor; input.name = 'question'; input.rows = 3; input.maxLength = 8192;
    input.placeholder = 'Ask a question or share an idea…'; input.required = true; input.disabled = true;
    input.setAttribute('aria-describedby', 'portfolio-chat-hint');
    const footer = element(document, 'div', 'chat-compose-footer');
    const hint = element(document, 'p', 'chat-hint', 'Enter to send · Shift + Enter for a new line'); hint.id = 'portfolio-chat-hint';
    const actions = element(document, 'div', 'chat-compose-actions');
    const stop = element(document, 'button', 'chat-secondary', 'Stop'); stop.type = 'button'; stop.hidden = true;
    const retry = element(document, 'button', 'chat-secondary', 'Check request again'); retry.type = 'button'; retry.hidden = true;
    const send = element(document, 'button', 'chat-send', 'Send question ↗'); send.type = 'submit'; send.disabled = true;
    actions.append(stop, retry, send); footer.append(hint, actions); form.append(label, input, footer);
    panel.append(heading, scope, messages, status, form); shell.append(panel, details.element); host.append(shell);
    let ready = false, busy = false, currentReply, uiEpoch = 0, limit = 8192;
    function update() {
      input.disabled = !ready || busy; send.disabled = !ready || busy;
      clear.disabled = !ready; stop.hidden = !busy; retry.hidden = busy || !client.canRetry;
      for (const button of starters.children) button.disabled = !ready || busy;
      for (const button of messages.querySelectorAll('.chat-suggestions button')) button.disabled = !ready || busy;
    }
    function nearBottom() { return messages.scrollHeight - messages.clientHeight - messages.scrollTop < 100; }
    function scroll(follow) { if (follow) messages.scrollTop = messages.scrollHeight; }
    function event(frame) {
      const follow = nearBottom();
      if (frame.event === 'status') status.textContent = STATUS_LABELS[frame.data.code];
      const previousCard = currentReply.element;
      currentReply.accept(frame);
      if (previousCard !== currentReply.element) previousCard.replaceWith(currentReply.element);
      details.update(currentReply.view);
      if (frame.event === 'done') status.textContent = frame.data.outcome === 'cancelled' ? 'Stopped.' : currentReply.view.claims.length ? 'Response complete · evidence references validated.' : 'Response complete.';
      if (frame.event === 'error') status.textContent = ERROR_LABELS[frame.data.code];
      scroll(follow);
    }
    async function submit(isRetry) {
      if (!ready || busy) return;
      const text = input.value.trim();
      if (!isRetry && (!text || encoder.encode(text).byteLength > limit)) {
        status.textContent = `Use a question of up to ${limit.toLocaleString('en-CA')} UTF-8 bytes.`; input.focus(); return;
      }
      const ownEpoch = ++uiEpoch;
      busy = true; retry.hidden = true; welcome.hidden = true;
      if (!isRetry) {
        const question = element(document, 'article', 'chat-message chat-question'); question.append(element(document, 'p', 'chat-small-label', 'You'), element(document, 'p', '', text));
        messages.append(question); input.value = '';
      }
      currentReply = createAnswerView(document, isRetry ? currentReply : null, {
        onDetails: (view, trigger) => details.open(view, trigger),
        onSuggestion: text => { if (ready && !busy) { input.value = text; form.requestSubmit(); } }
      });
      if (!isRetry) messages.append(currentReply.element);
      details.update(currentReply.view);
      status.textContent = isRetry ? 'Checking the original request…' : 'Sending your question…'; update(); scroll(true);
      try {
        const receive = frame => { if (ownEpoch === uiEpoch) event(frame); };
        const sending = isRetry ? client.retry(receive) : client.send(text, receive, document.defaultView?.location.hash);
        if (client.requestId) { currentReply.identify(client.requestId); details.update(currentReply.view); }
        await sending;
      } catch (error) {
        if (ownEpoch === uiEpoch) {
          currentReply.fail(error.name === 'AbortError' ? 'cancelled' : 'interrupted');
          details.update(currentReply.view);
          status.textContent = error.name === 'AbortError' ? 'Stopped. The server may still be settling this request.' : ERROR_LABELS[error.code] || ERROR_LABELS.unavailable;
        }
      } finally {
        if (ownEpoch === uiEpoch) {
          busy = false; update();
          if (!document.hidden && !document.activeElement?.closest?.('.chat-details-content')) input.focus();
        }
      }
    }
    form.addEventListener('submit', event => { event.preventDefault(); void submit(false); });
    input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); form.requestSubmit(); } });
    stop.addEventListener('click', async () => {
      const ownEpoch = uiEpoch;
      stop.disabled = true;
      try { await client.cancel(); if (ownEpoch === uiEpoch) status.textContent = 'Stop requested.'; }
      catch { if (ownEpoch === uiEpoch) status.textContent = 'Stopped here. Server cancellation could not be confirmed. Check this request before trying again.'; }
      finally { stop.disabled = false; }
    });
    retry.addEventListener('click', () => { void submit(true); });
    clear.addEventListener('click', async () => {
      uiEpoch += 1; busy = false; ready = false; update();
      messages.replaceChildren(welcome); welcome.hidden = false; currentReply = null; input.value = ''; status.textContent = 'Clearing the conversation…';
      details.clear();
      try { await client.clear(); ready = true; status.textContent = 'Conversation cleared. Your next question starts a new session.'; }
      catch { status.textContent = 'The server could not confirm deletion. Reload before starting another conversation.'; }
      update(); if (ready) input.focus();
    });
    client.initialise().then(config => {
      ready = config.available && config.capabilities.chat;
      limit = config.limits.maxMessageBytes;
      if (ready) {
        status.textContent = 'Private chat is ready.';
        scope.textContent = 'General help, with Josh’s public portfolio when it is relevant. Details stay beside the conversation.';
      } else status.textContent = 'Chat is currently disabled.';
      update();
    }).catch(error => {
      status.textContent = error.status === 401 ? 'Private access is required. Sign in above to continue.' : ERROR_LABELS[error.code] || ERROR_LABELS.unavailable;
      const access = document.querySelector('[data-chat-access]'); if (access) access.hidden = false;
      update();
    });
    return Object.freeze({ client, element: shell });
  }
  function mountDrawer(trigger, options = {}) {
    const document = trigger.ownerDocument;
    let dialog, mounted;
    trigger.addEventListener('click', () => {
      if (!dialog) {
        dialog = element(document, 'dialog', 'chat-dialog'); dialog.setAttribute('aria-label', 'Portfolio assistant');
        const close = element(document, 'button', 'chat-dialog-close', 'Close chat'); close.type = 'button';
        close.addEventListener('click', () => dialog.close()); dialog.append(close); document.body.append(dialog);
        mounted = mount(dialog, options);
        dialog.addEventListener('close', () => trigger.focus());
      }
      dialog.showModal(); mounted.element.querySelector('textarea')?.focus();
    });
  }
  function boot(document) {
    for (const host of document.querySelectorAll('[data-chat-preview]')) mount(host);
    for (const trigger of document.querySelectorAll('[data-open-portfolio-chat]')) mountDrawer(trigger);
    const access = document.querySelector('[data-chat-access]');
    if (access) access.addEventListener('submit', async event => {
      event.preventDefault();
      const field = access.querySelector('input'), button = access.querySelector('button'), status = access.querySelector('[role="status"]');
      const token = field.value; field.value = ''; button.disabled = true; status.textContent = 'Checking private access…';
      try {
        const response = await fetch('/api/chat/access', { method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
        if (!response.ok) throw new Error();
        document.defaultView.location.reload();
      } catch { status.textContent = 'Access was not granted. Check the private token and try again.'; button.disabled = false; field.focus(); }
    });
  }
  return Object.freeze({ VERSION, validateEvidence, validateTraceData, validateConversation, createEventValidator, readEventStream, createClient, createRequestTimeline, createAnswerView, createRequestSelection, createDetailsPanel, renderBlock, renderSources, mount, mountDrawer, boot });
});
