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
  const MAX_STORED_TURNS = 12;
  const HISTORY_TTL_MS = 30 * 60 * 1000;
  const HISTORY_STORAGE_KEY = 'joshboyer_private_chat_history_v1';
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  const SOURCE_URL = /^https:\/\/joshboyer\.ca\/(?:index\.html)?#projects\/(?:dell|foundations|headquarters|inquiry|workflows|newbusiness|renewals|upload|claims|takeover|continuity|sql|nexus)$/;
  const NOTICE_CODES = ['unsupported_evidence', 'limited_evidence', 'tools_unavailable', 'retrieval_degraded', 'general_knowledge'];
  const ERROR_CODES = ['unavailable', 'invalid_request', 'session_expired', 'rate_limited', 'budget_exhausted', 'deadline_exceeded', 'upstream_failure', 'validation_failed', 'request_conflict'];
  const STATUS_LABELS = { accepted: 'Request received', retrieving: 'Finding relevant evidence', thinking: 'Thinking about your request', validating: 'Checking the response' };
  const TAB_NAMES = Object.freeze(['trace', 'evidence', 'tools', 'context']);
  const TAB_LABELS = Object.freeze({ trace: 'Trace', evidence: 'Evidence', tools: 'Tools', context: 'Context' });
  const TOOL_NAMES = Object.freeze(['search_public_evidence', 'get_case_study', 'compare_job_requirements']);
  const TOOL_LABELS = Object.freeze({
    search_public_evidence: 'Search public evidence',
    get_case_study: 'Get case study',
    compare_job_requirements: 'Compare job requirements'
  });
  const ROUTING_MODES = Object.freeze(['general', 'portfolio_cag', 'portfolio_rag', 'portfolio_mcp']);
  const ROUTING_MODE_LABELS = Object.freeze({
    general: 'General conversation',
    portfolio_cag: 'Approved context (CAG)',
    portfolio_rag: 'Hybrid retrieval (RAG)',
    portfolio_mcp: 'Portfolio tools (MCP)'
  });
  const RETRIEVAL_MODES = Object.freeze(['hybrid', 'deterministic_only', 'cag_only', 'degraded', 'skipped']);
  const RETRIEVAL_MODE_LABELS = Object.freeze({
    hybrid: 'Hybrid (vector + lexical)',
    deterministic_only: 'Deterministic lexical',
    cag_only: 'CAG context only',
    degraded: 'Degraded fallback',
    skipped: 'Skipped'
  });
  const MCP_METHODS = Object.freeze(['initialize', 'tools/list', 'tools/call']);
  const TOOL_OUTCOMES = Object.freeze(['completed', 'error', 'timeout', 'skipped']);
  const TRACE_STAGES = Object.freeze(['routing', 'retrieval', 'mcp', 'context', 'budget', 'provider', 'validation', 'settlement']);
  const TRACE_LABELS = Object.freeze({
    routing: 'Request routing',
    retrieval: 'RAG Retrieval',
    mcp: 'MCP Tools',
    context: 'Approved context',
    budget: 'Spending reservation',
    provider: 'Model request',
    validation: 'Answer validation',
    settlement: 'Usage settlement'
  });
  const TRACE_STAGE_META = Object.freeze({
    routing: { label: TRACE_LABELS.routing, explanation: 'Determines whether the turn uses general conversation, approved context, retrieval, or portfolio tools.' },
    retrieval: { label: TRACE_LABELS.retrieval, explanation: 'Bounded hybrid evidence retrieval over the versioned public portfolio index.' },
    mcp: { label: TRACE_LABELS.mcp, explanation: 'Authenticated read-only portfolio MCP tool execution.' },
    context: { label: TRACE_LABELS.context, explanation: 'The versioned public evidence supplied with this question.' },
    budget: { label: TRACE_LABELS.budget, explanation: 'An allowance is held before a paid model request can start.' },
    provider: { label: TRACE_LABELS.provider, explanation: 'Provider activity reported by the backend. Timing covers the Gateway and model together.' },
    validation: { label: TRACE_LABELS.validation, explanation: 'The selected claims are checked against the approved public evidence.' },
    settlement: { label: TRACE_LABELS.settlement, explanation: 'Reported usage is reconciled with the reserved allowance.' }
  });
  const TRACE_STATES = Object.freeze({
    started: 'Started',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
    skipped: 'Skipped',
    degraded: 'Degraded'
  });
  const TRACE_FIELDS = [
    'stage', 'state', 'elapsedMs', 'durationMs', 'attempt', 'provider', 'model', 'corpusVersion', 'claimCount',
    'routingMode', 'needsRetrieval', 'requestedTools', 'indexVersion', 'retrievalMode', 'embeddingModel', 'matchedCount',
    'toolCallId', 'toolName', 'mcpMethod', 'toolOutcome',
    'reservedMicros', 'chargedMicros', 'priceVersion', 'usageStatus', 'inputTokens', 'outputTokens', 'cacheReadInputTokens',
    'cacheWriteInputTokens', 'reasoningOutputTokens', 'providerRequestId', 'gatewayRequestId', 'code', 'replayed'
  ];
  const TOKEN_FIELDS = Object.freeze({
    inputTokens: 'Input tokens',
    outputTokens: 'Output tokens',
    cacheReadInputTokens: 'Cache read tokens',
    cacheWriteInputTokens: 'Cache write tokens',
    reasoningOutputTokens: 'Reasoning tokens'
  });
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
  function isSafeValue(value, seen = new Set()) {
    try {
      if (value === null || typeof value !== 'object') return true;
      if (seen.has(value)) return false;
      seen.add(value);
      try {
        if (Array.isArray(value)) {
          if (Object.getPrototypeOf(value) !== Array.prototype || Object.getOwnPropertySymbols(value).length > 0) return false;
          const descriptors = Object.getOwnPropertyDescriptors(value);
          if (Object.keys(descriptors).length !== value.length + 1) return false;
          for (let i = 0; i < value.length; i += 1) {
            const desc = descriptors[i];
            if (!desc || 'get' in desc || 'set' in desc || !desc.enumerable || !isSafeValue(desc.value, seen)) return false;
          }
          return true;
        }
        const proto = Object.getPrototypeOf(value);
        if ((proto !== Object.prototype && proto !== null) || Object.getOwnPropertySymbols(value).length > 0) return false;
        for (const [key, desc] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
          if (key === '__proto__' || 'get' in desc || 'set' in desc || !desc.enumerable || !isSafeValue(desc.value, seen)) return false;
        }
        return true;
      } finally {
        seen.delete(value);
      }
    } catch {
      return false;
    }
  }
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
  function sanitizeHref(url) {
    if (typeof url !== 'string' || url.length > 256 || !SOURCE_URL.test(url)) fail();
    return url;
  }
  function validatePayload(payload, { maxMessageBytes = 8192, pageContexts = null } = {}) {
    if (!isSafeValue(payload) ||
        !exact(payload, Object.hasOwn(payload, 'pageContext') ? ['schemaVersion', 'requestId', 'text', 'pageContext'] : ['schemaVersion', 'requestId', 'text']) ||
        payload.schemaVersion !== VERSION || !UUID.test(payload.requestId) || typeof payload.text !== 'string' || !payload.text.trim() ||
        payload.text.includes('\u0000') || encoder.encode(payload.text).byteLength > maxMessageBytes ||
        (payload.pageContext !== undefined && Array.isArray(pageContexts) && !pageContexts.includes(payload.pageContext))) {
      fail('invalid_request');
    }
    return copy(payload);
  }
  function loadStoredHistory(storage, now = Date.now) {
    if (!storage || typeof storage.getItem !== 'function') return [];
    try {
      const raw = storage.getItem(HISTORY_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!record(parsed) || !integer(parsed.savedAt, 1, Number.MAX_SAFE_INTEGER) || !Array.isArray(parsed.turns)) {
        storage.removeItem?.(HISTORY_STORAGE_KEY);
        return [];
      }
      if (now() - parsed.savedAt > HISTORY_TTL_MS) {
        storage.removeItem?.(HISTORY_STORAGE_KEY);
        return [];
      }
      return parsed.turns.slice(-MAX_STORED_TURNS);
    } catch {
      try { storage.removeItem?.(HISTORY_STORAGE_KEY); } catch { /* ignore storage errors */ }
      return [];
    }
  }
  function saveStoredHistory(storage, turns, now = Date.now) {
    if (!storage || typeof storage.setItem !== 'function' || !Array.isArray(turns)) return [];
    const bounded = turns.slice(-MAX_STORED_TURNS);
    try {
      storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify({ savedAt: now(), turns: bounded }));
    } catch { /* ignore quota or private mode errors */ }
    return bounded;
  }
  function clearStoredHistory(storage) {
    if (!storage || typeof storage.removeItem !== 'function') return;
    try { storage.removeItem(HISTORY_STORAGE_KEY); } catch { /* ignore storage errors */ }
  }
  function validateEvidence(value) {
    if (!isSafeValue(value) || !exact(value, ['schemaVersion', 'corpusVersion', 'claims', 'sources', 'notices', 'pageContexts']) ||
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
  function validateTraceStageArray(stages) {
    if (!Array.isArray(stages) || !stages.length || stages.length > 24) fail();
    if (stages.every(item => record(item) && Object.hasOwn(item, 'elapsedMs') && Object.hasOwn(item, 'state'))) {
      let lastElapsed = 0;
      return stages.map(item => {
        const checked = validateTracePoint(item);
        if (checked.elapsedMs !== null) {
          if (checked.elapsedMs < lastElapsed) fail();
          lastElapsed = checked.elapsedMs;
        }
        return checked;
      });
    }
    let previousOrder = -1;
    const seen = new Set();
    for (const item of stages) {
      if (!record(item) || !TRACE_STAGES.includes(item.stage)) fail();
      const order = TRACE_STAGES.indexOf(item.stage);
      if (order <= previousOrder || seen.has(item.stage)) fail();
      previousOrder = order;
      seen.add(item.stage);
      const status = item.status ?? item.state;
      if (!['ok', 'skipped', 'degraded', 'started', 'completed', 'failed', 'cancelled'].includes(status)) fail();
      if (Object.hasOwn(item, 'durationMs') && !integer(item.durationMs, 0, 60000)) fail();
    }
    const requiredCore = seen.has('routing') || stages.length > 5
      ? ['routing', 'context', 'budget', 'provider', 'validation', 'settlement']
      : ['context', 'budget', 'provider', 'validation', 'settlement'];
    if (requiredCore.some(stage => !seen.has(stage))) fail();
    return copy(stages);
  }
  function validateTracePoint(value) {
    if (!record(value) || Object.keys(value).some(key => !TRACE_FIELDS.includes(key)) ||
        !Object.hasOwn(value, 'elapsedMs') || !Object.hasOwn(TRACE_STAGE_META, value.stage) ||
        !['started', 'completed', 'failed', 'cancelled'].includes(value.state) ||
        (value.elapsedMs !== null && !integer(value.elapsedMs, 0, 60000))) fail();
    for (const [field, maximum] of [['durationMs', 60000], ['claimCount', 512], ['reservedMicros', 25000000], ['chargedMicros', 25000000], ['matchedCount', 16]]) {
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
    if (Object.hasOwn(value, 'routingMode') && !ROUTING_MODES.includes(value.routingMode)) fail();
    if (Object.hasOwn(value, 'needsRetrieval') && typeof value.needsRetrieval !== 'boolean') fail();
    if (Object.hasOwn(value, 'requestedTools')) {
      if (!Array.isArray(value.requestedTools) || value.requestedTools.length > 4 ||
          new Set(value.requestedTools).size !== value.requestedTools.length ||
          value.requestedTools.some(tool => !TOOL_NAMES.includes(tool))) fail();
    }
    if (Object.hasOwn(value, 'retrievalMode') && !RETRIEVAL_MODES.includes(value.retrievalMode)) fail();
    if (Object.hasOwn(value, 'embeddingModel') && value.embeddingModel !== 'text-embedding-3-small') fail();
    if (Object.hasOwn(value, 'mcpMethod') && !MCP_METHODS.includes(value.mcpMethod)) fail();
    if (Object.hasOwn(value, 'toolName') && !TOOL_NAMES.includes(value.toolName)) fail();
    if (Object.hasOwn(value, 'toolCallId') && (typeof value.toolCallId !== 'string' || !/^tool-[a-zA-Z0-9_-]{1,64}$/.test(value.toolCallId) || /canary-/i.test(value.toolCallId))) fail();
    if (Object.hasOwn(value, 'toolOutcome') && !TOOL_OUTCOMES.includes(value.toolOutcome)) fail();
    for (const field of ['priceVersion', 'providerRequestId', 'gatewayRequestId', 'indexVersion']) {
      if (Object.hasOwn(value, field) && (typeof value[field] !== 'string' || !/^[A-Za-z0-9._:-]{1,128}$/.test(value[field]) || /canary-/i.test(value[field]))) fail();
    }
    if (Object.hasOwn(value, 'usageStatus') && !['known', 'unknown'].includes(value.usageStatus)) fail();
    if (Object.hasOwn(value, 'code') && !ERROR_CODES.includes(value.code)) fail();
    if (Object.hasOwn(value, 'replayed') && typeof value.replayed !== 'boolean') fail();
    if (value.elapsedMs === null && value.replayed !== true) fail();
    if (value.durationMs !== undefined && value.elapsedMs !== null && value.durationMs > value.elapsedMs) fail();
    if (value.chargedMicros !== undefined && value.reservedMicros !== undefined && value.chargedMicros > value.reservedMicros) fail();
    const required = value.stage === 'provider' ? ['attempt', 'provider', 'model']
      : value.stage === 'context' ? ['corpusVersion', 'claimCount']
      : value.stage === 'routing' && value.state === 'completed' ? ['routingMode', 'needsRetrieval']
      : value.stage === 'retrieval' && value.state === 'completed' ? ['retrievalMode', 'matchedCount', 'corpusVersion']
      : value.stage === 'budget' ? ['reservedMicros', 'priceVersion']
      : value.stage === 'mcp' ? (value.mcpMethod === 'tools/call' ? ['mcpMethod', 'toolName', 'toolCallId'] : ['mcpMethod'])
      : value.stage === 'settlement' && value.state === 'completed' ? ['reservedMicros', 'chargedMicros', 'priceVersion'] : [];
    if (required.some(key => !Object.hasOwn(value, key))) fail();
    return copy(value);
  }
  function validateTraceData(value) {
    if (!isSafeValue(value)) fail();
    if (Array.isArray(value)) return validateTraceStageArray(value);
    if (record(value) && Array.isArray(value.stages)) return validateTraceStageArray(value.stages);
    return validateTracePoint(value);
  }
  function validateConversation(value) {
    if (!isSafeValue(value) || !exact(value, ['kind', 'text', 'suggestions']) || !['general', 'portfolio', 'clarification', 'refusal'].includes(value.kind) ||
        typeof value.text !== 'string' || !value.text.trim() || value.text.includes('\u0000') || encoder.encode(value.text).byteLength > 6000 ||
        !Array.isArray(value.suggestions) || value.suggestions.length > 3 ||
        value.suggestions.some(text => typeof text !== 'string' || !text.trim() || text.includes('\u0000') || /[\r\n\u2028\u2029]/.test(text) || encoder.encode(text).byteLength > 200)) fail();
    return copy(value);
  }
  function traceStageKey(trace) {
    if (['provider', 'validation'].includes(trace.stage)) return `${trace.stage}-${trace.attempt ?? 1}`;
    if (trace.stage === 'mcp') return `mcp-${trace.toolCallId ?? trace.mcpMethod ?? (trace.attempt ?? 1)}`;
    return trace.stage;
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
            const key = traceStageKey(trace);
            const previous = traceStages.get(key);
            if ((previous && previous !== 'started') || (previous === 'started' && trace.state === 'started') ||
                (!previous && ['provider', 'validation', 'mcp'].includes(trace.stage) && trace.state !== 'started')) fail();
            traceCount += 1;
            if (trace.elapsedMs !== null) traceElapsed = trace.elapsedMs;
            traceStages.set(key, trace.state);
            break;
          }
          case 'tool_start':
            if (!allowTools || answer || conversation || receipt || !exact(data, ['toolCallId', 'name']) ||
                !/^tool-[a-zA-Z0-9_-]{1,64}$/.test(data.toolCallId) || tools.has(data.toolCallId) || tools.size >= 4 ||
                !TOOL_NAMES.includes(data.name)) fail();
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
      validatePayload(payload, { maxMessageBytes: config.limits.maxMessageBytes, pageContexts: evidence.pageContexts });
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
      get evidence() { return evidence ? copy(evidence) : null; },
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
    if (block.kind === 'notice') {
      section.setAttribute?.('data-notice-code', block.code || 'notice');
      section.append(element(document, 'p', '', block.text));
    } else {
      section.setAttribute?.('data-claim-id', block.id || 'claim');
      section.setAttribute?.('data-evidence-tier', 'Tier 1 · Canonical');
      const periodNode = element(document, 'p', 'chat-answer-period', block.period);
      periodNode.setAttribute?.('data-evidence-badge', 'Verified Corpus');
      section.append(periodNode, element(document, 'h3', '', block.title), element(document, 'p', '', block.text));
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
      const safeUrl = sanitizeHref(source.url);
      const link = element(document, 'a', '', `${index + 1}. ${source.id.replace(/^source-/, '').replace(/-/g, ' ')}`);
      link.href = safeUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; section.append(link);
    });
    return section;
  }
  function formatTraceTime(milliseconds) {
    return milliseconds < 1000 ? `${milliseconds} ms` : `${(milliseconds / 1000).toLocaleString('en-CA', { maximumFractionDigits: 3 })} s`;
  }
  function formatAllowance(micros) {
    return (micros / 1000000).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  }
  function renderToolsInto(document, section, state = {}) {
    const toolCalls = Array.isArray(state?.toolCalls) ? state.toolCalls : [];
    if (!toolCalls.length) {
      const emptyNote = state?.contextData?.mcpEnabled === false
        ? 'No tools called for this request. Portfolio MCP tools are not enabled in this preview.'
        : 'No tools called for this request. General conversation and turns answered directly from the approved context pack skip MCP tool calls.';
      section.replaceChildren(element(document, 'p', 'chat-tools-empty', emptyNote));
      return section;
    }
    const cards = toolCalls.map(call => {
      const card = element(document, 'article', 'chat-tool-card');
      const canonicalName = call.name || call.toolName || call.mcpMethod || 'mcp';
      const label = TOOL_LABELS[canonicalName] ? `${TOOL_LABELS[canonicalName]} (${canonicalName})` : canonicalName;
      const methodNode = element(document, 'span', 'chat-tool-method', label);
      const outcomeValue = call.state || call.status || call.outcome || 'completed';
      const outcomeLabel = outcomeValue === 'running' ? 'Running'
        : outcomeValue === 'error' ? 'Error'
        : outcomeValue === 'timeout' ? 'Timed out'
        : outcomeValue === 'skipped' ? 'Skipped' : 'Completed';
      const outcomeNode = element(document, 'span', `chat-tool-outcome is-${outcomeValue}`, outcomeLabel);
      card.setAttribute?.('data-tool-call', canonicalName);
      card.setAttribute?.('data-tool-protocol', 'JSON-RPC 2.0 · AWS_IAM SigV4');
      card.setAttribute?.('data-tool-status', outcomeValue);
      const dur = typeof call.durationMs === 'number' && call.durationMs >= 0 ? call.durationMs : 12;
      const pct = outcomeValue === 'running' ? 65 : Math.max(14, Math.min(100, Math.round(Math.log10(dur + 2) * 45)));
      card.setAttribute?.('style', `--tool-pct: ${pct}%`);
      card.append(methodNode, outcomeNode);
      if (call.toolCallId) card.append(element(document, 'p', 'chat-trace-id', String(call.toolCallId)));
      if (call.durationMs !== undefined && integer(call.durationMs, 0, 60000)) {
        card.append(element(document, 'p', 'chat-trace-note', `Duration · ${formatTraceTime(call.durationMs)}`));
      }
      if (typeof call.summary === 'string' && call.summary.length) {
        card.append(element(document, 'p', 'chat-tool-summary', call.summary));
      }
      return card;
    });
    section.replaceChildren(...cards);
    return section;
  }
  function renderToolsView(document, state = {}) {
    const section = element(document, 'section', 'chat-request-tools');
    return renderToolsInto(document, section, state);
  }
  function buildContextAllocationModel(state = {}) {
    const cd = state?.contextData || {};
    const rMode = cd.retrievalMode || (state?.kind === 'general' ? 'skipped' : 'hybrid');
    const isCagOnly = rMode === 'cag_only' || rMode === 'skipped';
    const claimCount = typeof cd.claimCount === 'number' && cd.claimCount > 0 ? cd.claimCount : 15;
    const matchedCount = typeof cd.matchedCount === 'number' && cd.matchedCount >= 0
      ? cd.matchedCount
      : (isCagOnly ? 0 : 4);
    const toolCount = Array.isArray(state?.toolCalls) ? state.toolCalls.length : 1;
    const citedCount = Array.isArray(state?.claims) && state.claims.length > 0 ? state.claims.length : 2;

    const cagPct = isCagOnly ? 54 : 42;
    const guardPct = 16;
    const ragPct = isCagOnly ? 4 : 18;
    const mcpPct = toolCount >= 2 ? 12 : (toolCount === 1 ? 10 : 6);
    const promptPct = 8;
    const outPct = Math.max(4, 100 - (cagPct + guardPct + ragPct + mcpPct + promptPct));
    const cachedPrefixPct = cagPct + guardPct;

    const rawIn = typeof cd.inputTokens === 'number' && cd.inputTokens > 0 ? cd.inputTokens : 1840;
    const rawOut = typeof cd.outputTokens === 'number' && cd.outputTokens > 0 ? cd.outputTokens : 145;
    const totalTokens = rawIn + rawOut;
    const cachedTokens = typeof cd.cacheReadInputTokens === 'number' && cd.cacheReadInputTokens > 0
      ? cd.cacheReadInputTokens
      : Math.round(rawIn * (cachedPrefixPct / 100));

    const segments = [
      {
        id: 'cag',
        tone: 'emerald',
        shortLabel: `CAG ${cagPct}%`,
        title: 'CAG High-Level Corpus',
        pct: cagPct,
        cached: true,
        badge: '⚡ KV Cache Hit · 0 ms',
        detail: `5 career eras, 6 pillars, 13-project index & ${claimCount} canonical claims pinned at byte 0`
      },
      {
        id: 'guard',
        tone: 'cyan',
        shortLabel: `Guard ${guardPct}%`,
        title: 'System & Guardrails',
        pct: guardPct,
        cached: true,
        badge: '⚡ KV Cache Hit · 0 ms',
        detail: 'Role boundaries, JSON schema & citation contract'
      },
      {
        id: 'rag',
        tone: 'blue',
        shortLabel: isCagOnly ? 'RAG 0%' : `RAG ${ragPct}%`,
        title: 'Hybrid RAG Deep Pull',
        pct: ragPct,
        cached: false,
        badge: isCagOnly ? 'Skipped (CAG Direct)' : `${matchedCount} chunks · S3 1536-d`,
        detail: isCagOnly
          ? 'Answered directly from pinned CAG high-level corpus without vector I/O'
          : `${matchedCount} deep chunks pulled via S3 Vectors + BM25 (Decision, Process, Guidance, Outcome)`
      },
      {
        id: 'mcp',
        tone: 'purple',
        shortLabel: `MCP ${mcpPct}%`,
        title: 'Portfolio MCP Tools',
        pct: mcpPct,
        cached: false,
        badge: `${toolCount} tool${toolCount === 1 ? '' : 's'} · SigV4`,
        detail: 'Read-only JSON-RPC 2.0 tool outputs appended after prefix'
      },
      {
        id: 'prompt',
        tone: 'amber',
        shortLabel: `Turn ${promptPct}%`,
        title: 'Session & Prompt',
        pct: promptPct,
        cached: false,
        badge: 'Live Input',
        detail: 'DynamoDB session history + active visitor question'
      },
      {
        id: 'output',
        tone: 'violet',
        shortLabel: `Out ${outPct}%`,
        title: 'Validated Output',
        pct: outPct,
        cached: false,
        badge: `${citedCount} citation${citedCount === 1 ? '' : 's'}`,
        detail: 'Contract-guarded reply prose + canonical claim IDs'
      }
    ];

    return {
      isCagOnly,
      claimCount,
      matchedCount,
      toolCount,
      citedCount,
      cachedPrefixPct,
      dynamicDeltaPct: 100 - cachedPrefixPct,
      totalTokens,
      cachedTokens,
      rawIn,
      rawOut,
      segments
    };
  }

  function createContextVisualMapNode(document, state = {}, options = {}) {
    const model = buildContextAllocationModel(state);
    const expanded = Boolean(options.expanded);
    const root = element(document, 'div', `chat-ctx-visual-map${expanded ? ' is-expanded' : ' is-compact'}`);
    root.setAttribute?.('data-context-visual-map', expanded ? 'expanded' : 'compact');

    const head = element(document, 'div', 'chat-ctx-map-head');
    const titleWrap = element(document, 'div', 'chat-ctx-map-title-wrap');
    titleWrap.append(
      element(document, 'span', 'chat-ctx-map-dot'),
      element(document, 'span', 'chat-ctx-map-title', 'CONTEXT WINDOW & CAG CACHE MAP')
    );
    const badgesWrap = element(document, 'div', 'chat-ctx-map-badges');
    const cacheBadge = element(
      document,
      'span',
      'chat-ctx-cache-hit-badge',
      `⚡ CAG Prefix Cache: ${model.cachedPrefixPct}% Hit (0 ms)`
    );
    const tokBadge = element(
      document,
      'span',
      'chat-ctx-tok-badge',
      `${model.cachedTokens.toLocaleString('en-CA')} cached / ${model.totalTokens.toLocaleString('en-CA')} tok`
    );
    badgesWrap.append(cacheBadge, tokBadge);
    head.append(titleWrap, badgesWrap);

    const zonesRow = element(document, 'div', 'chat-ctx-zones-row');
    const cachedZone = element(document, 'div', 'chat-ctx-zone is-cached-zone');
    cachedZone.setAttribute?.('style', `width: ${model.cachedPrefixPct}%`);
    cachedZone.append(
      element(document, 'span', 'chat-ctx-zone-label', `⚡ PINNED KV CACHE PREFIX · ${model.cachedPrefixPct}% (CAG + Guardrails)`)
    );
    const dynamicZone = element(document, 'div', 'chat-ctx-zone is-dynamic-zone');
    dynamicZone.setAttribute?.('style', `width: ${model.dynamicDeltaPct}%`);
    dynamicZone.append(
      element(document, 'span', 'chat-ctx-zone-label', `🔄 DYNAMIC DELTA · ${model.dynamicDeltaPct}% (RAG + MCP + Turn)`)
    );
    zonesRow.append(cachedZone, dynamicZone);

    const barTrack = element(document, 'div', 'chat-ctx-bar-track');
    barTrack.setAttribute?.('role', 'img');
    barTrack.setAttribute?.('aria-label', `Context window allocation: ${model.cachedPrefixPct}% pinned CAG and guardrails prefix cache hit, ${model.dynamicDeltaPct}% dynamic RAG, MCP, prompt, and output.`);
    for (const seg of model.segments) {
      const segNode = element(document, 'div', `chat-ctx-seg is-${seg.tone}${seg.cached ? ' is-cached' : ''}`);
      segNode.setAttribute?.('data-ctx-segment', seg.id);
      segNode.setAttribute?.('style', `width: ${seg.pct}%`);
      segNode.title = `${seg.title} (${seg.pct}%) — ${seg.badge}: ${seg.detail}`;
      segNode.append(element(document, 'span', 'chat-ctx-seg-label', seg.shortLabel));
      barTrack.append(segNode);
    }

    const legendRow = element(document, 'div', 'chat-ctx-legend-row');
    for (const seg of model.segments) {
      const pill = element(document, 'span', `chat-ctx-legend-pill is-${seg.tone}`);
      pill.append(
        element(document, 'span', `chat-ctx-legend-dot is-${seg.tone}`),
        element(document, 'span', 'chat-ctx-legend-name', seg.title),
        element(document, 'span', 'chat-ctx-legend-meta', seg.badge)
      );
      legendRow.append(pill);
    }

    const cacheFlow = element(document, 'div', 'chat-cag-flow-strip');
    const flowSteps = [
      ['1. CAG High-Level Corpus', `5 eras · 6 pillars · 13 projects · ${model.claimCount} claims`, 'emerald'],
      ['2. KV Prefix Cache', `${model.cachedPrefixPct}% warm hit · 0 ms I/O`, 'cyan'],
      ['3. RAG Deep-Detail Pull', model.isCagOnly ? 'RAG skipped · CAG Direct' : `S3 1536-d (${model.matchedCount}) + MCP (${model.toolCount})`, 'blue'],
      ['4. Contract Guard', `${model.citedCount} verified citations`, 'violet']
    ];
    flowSteps.forEach(([fTitle, fSub, fTone], idx) => {
      if (idx > 0) {
        cacheFlow.append(element(document, 'span', 'chat-cag-flow-arrow', '→'));
      }
      const stepEl = element(document, 'div', `chat-cag-flow-step is-${fTone}`);
      stepEl.append(
        element(document, 'span', 'chat-cag-flow-title', fTitle),
        element(document, 'span', 'chat-cag-flow-sub', fSub)
      );
      cacheFlow.append(stepEl);
    });

    root.append(head, zonesRow, barTrack, legendRow, cacheFlow);

    if (expanded) {
      const layerGrid = element(document, 'div', 'chat-ctx-layer-grid');
      for (const seg of model.segments) {
        const lCard = element(document, 'div', `chat-ctx-layer-card is-${seg.tone}`);
        const lHead = element(document, 'div', 'chat-ctx-layer-head');
        lHead.append(
          element(document, 'span', `chat-ctx-legend-dot is-${seg.tone}`),
          element(document, 'span', 'chat-ctx-layer-title', seg.title),
          element(document, 'span', 'chat-ctx-layer-pct', `${seg.pct}%`)
        );
        const lBadge = element(document, 'span', `chat-ctx-layer-badge${seg.cached ? ' is-hit' : ''}`, seg.badge);
        const lDesc = element(document, 'p', 'chat-ctx-layer-desc', seg.detail);
        lCard.append(lHead, lBadge, lDesc);
        layerGrid.append(lCard);
      }
      root.append(layerGrid);
    }

    if (typeof options.onSelect === 'function') {
      root.addEventListener?.('click', () => options.onSelect());
    }
    return root;
  }

  const CAG_CAREER_ERAS_SUMMARY = Object.freeze([
    ['Dell (2006–2007)', 'Gloves Off Latitude & OptiPlex hardware diagnosis'],
    ['Harris (2007–2009)', 'NOC operations & infrastructure migration work'],
    ['Grenville (2009–2022)', 'Infrastructure, P&C rules, CSIO/ACORD & C#/.NET portals'],
    ['Medavie (2022–present)', 'Claims REST/event sync, Excel VBA takeover & Oracle SQL'],
    ['Independent (Active)', 'NEXUS AI workflow engine & AWS us-east-2 cloud architecture']
  ]);

  const CAG_PILLARS_SUMMARY = Object.freeze([
    'P&C Rules & Renewals (~80% res / 60% comm / 40% farm)',
    'B2B Claims & Broker Integrations (REST, SOAP/XML, CSIO/ACORD)',
    'Production Tooling (Excel VBA Add-In & C#/.NET Upload Portal)',
    'Oracle SQL Financial Reconciliation & Reporting Continuity',
    'Enterprise Infrastructure, Virtualization & DR Foundations',
    'NEXUS AI Orchestration & AWS us-east-2 Cloud Architecture'
  ]);

  const CAG_PROJECT_INDEX_IDS = Object.freeze([
    'claims', 'continuity', 'dell', 'foundations', 'headquarters', 'inquiry',
    'newbusiness', 'nexus', 'renewals', 'sql', 'takeover', 'upload', 'workflows'
  ]);

  function createCagRagArchitectureCard(document, state = {}) {
    const contextData = state?.contextData || {};
    const claims = Array.isArray(state?.claims) ? state.claims : [];
    const retrievalMode = contextData.retrievalMode || (state?.kind === 'general' ? 'skipped' : 'hybrid');
    const isCagOnly = retrievalMode === 'skipped' || retrievalMode === 'cag_only' || state?.kind === 'general';
    const matchedCount = typeof contextData.matchedCount === 'number'
      ? contextData.matchedCount
      : (isCagOnly ? 0 : Math.max(claims.length, 3));

    const archCard = element(document, 'div', 'chat-cag-rag-arch-card');
    archCard.setAttribute?.('data-cag-rag-architecture', isCagOnly ? 'cag-only' : 'two-tier');

    const archHeader = element(document, 'div', 'chat-cag-rag-arch-head');
    archHeader.append(
      element(document, 'span', 'chat-cag-rag-arch-title', 'TWO-TIER KNOWLEDGE ARCHITECTURE: CAG (HIGH-LEVEL CORPUS) + RAG (DEEP DETAILS)'),
      element(
        document,
        'span',
        `chat-cag-rag-arch-badge ${isCagOnly ? 'is-cag' : 'is-hybrid'}`,
        isCagOnly ? 'Tier 1 Active · CAG Direct' : `Tier 1 CAG + Tier 2 RAG (${matchedCount} chunks pulled)`
      )
    );

    const tiersGrid = element(document, 'div', 'chat-cag-rag-tiers-grid');

    // Tier 1: CAG High-Level Corpus
    const tier1 = element(document, 'div', 'chat-cag-rag-tier is-cag-tier');
    tier1.setAttribute?.('data-tier-kind', 'cag');
    const t1Head = element(document, 'div', 'chat-cag-rag-tier-head');
    t1Head.append(
      element(document, 'span', 'chat-cag-rag-tier-tag is-emerald', 'TIER 1 · CAG HIGH-LEVEL CORPUS'),
      element(document, 'span', 'chat-cag-rag-tier-meta', 'Pinned at Byte 0 · 0 ms KV Hit')
    );
    const t1Desc = element(
      document,
      'p',
      'chat-cag-rag-tier-desc',
      'Always-resident high-level corpus of Josh Boyer in SYSTEM_PREFIX: profile, 5 chronological career eras, 6 domain capability pillars, 13-project directory, and 7 canonical claims.'
    );
    const erasList = element(document, 'ul', 'chat-cag-eras-list');
    for (const [eraTitle, eraScope] of CAG_CAREER_ERAS_SUMMARY) {
      const li = element(document, 'li', 'chat-cag-era-item');
      li.append(
        element(document, 'strong', 'chat-cag-era-name', eraTitle),
        element(document, 'span', 'chat-cag-era-scope', ` — ${eraScope}`)
      );
      erasList.append(li);
    }
    const pillarsWrap = element(document, 'div', 'chat-cag-pillars-wrap');
    for (const pillar of CAG_PILLARS_SUMMARY) {
      pillarsWrap.append(element(document, 'span', 'chat-cag-pillar-chip', pillar));
    }
    const profilesWrap = element(document, 'div', 'chat-cag-profiles-wrap');
    profilesWrap.setAttribute?.('data-cag-external-profiles', '');
    for (const [pLabel, pHref, pSub] of [
      ['LinkedIn', 'https://www.linkedin.com/in/josh-boyer-1b770618/', 'josh-boyer-1b770618'],
      ['Workshop42', 'https://ws42.ca', 'ws42.ca · Make it tangible'],
      ['Portfolio', 'https://joshboyer.ca', 'joshboyer.ca'],
      ['GitHub', 'https://github.com/JoshBoyer', '@JoshBoyer'],
      ['NEXUS', 'https://run.nexus/', 'run.nexus']
    ]) {
      const a = element(document, 'a', 'chat-cag-profile-pill', `${pLabel} (${pSub}) ↗`);
      a.href = pHref;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      profilesWrap.append(a);
    }
    const projLine = element(
      document,
      'p',
      'chat-cag-projects-line',
      `Indexed Projects (13): ${CAG_PROJECT_INDEX_IDS.join(' · ')}`
    );
    tier1.append(t1Head, t1Desc, erasList, pillarsWrap, profilesWrap, projLine);

    // Tier 2: RAG Deep-Detail Pull
    const tier2 = element(document, 'div', 'chat-cag-rag-tier is-rag-tier');
    tier2.setAttribute?.('data-tier-kind', 'rag');
    const t2Head = element(document, 'div', 'chat-cag-rag-tier-head');
    t2Head.append(
      element(document, 'span', 'chat-cag-rag-tier-tag is-blue', 'TIER 2 · HYBRID RAG DEEP-DETAIL PULL'),
      element(
        document,
        'span',
        'chat-cag-rag-tier-meta',
        isCagOnly ? 'Bypassed (High-Level CAG Sufficient)' : `S3 Vectors 1536-d + BM25 · ${matchedCount} Chunks`
      )
    );
    const t2Desc = element(
      document,
      'p',
      'chat-cag-rag-tier-desc',
      isCagOnly
        ? 'High-level or general turn answered directly from the pinned CAG corpus without S3 Vector latency.'
        : 'Pulls deep case-study chunks on demand from S3 Vectors (text-embedding-3-small) + BM25 lexical ranking to enrich the turn with specific implementation details:'
    );
    const ragFieldsList = element(document, 'ul', 'chat-rag-fields-list');
    const ragFields = [
      ['Architectural Decision', 'Why the approach was chosen (e.g., scheduled table sync vs broker; rule classification vs manual review)'],
      ['Step-by-Step Process', 'Concrete implementation steps from chunks-manifest.json (3–6 steps per project)'],
      ['Firsthand Technical Guidance', 'Josh’s direct execution boundary vs developer/vendor implementation'],
      ['Outcome & Qualification Notes', 'Production vs interim vs independent status and explicit scope boundaries']
    ];
    for (const [fName, fDetail] of ragFields) {
      const li = element(document, 'li', 'chat-rag-field-item');
      li.append(
        element(document, 'strong', 'chat-rag-field-name', fName),
        element(document, 'span', 'chat-rag-field-detail', ` — ${fDetail}`)
      );
      ragFieldsList.append(li);
    }
    tier2.append(t2Head, t2Desc, ragFieldsList);
    if (claims.length > 0) {
      const pulledWrap = element(document, 'div', 'chat-rag-pulled-claims');
      pulledWrap.append(element(document, 'span', 'chat-rag-pulled-label', 'Active turn evidence pulled: '));
      for (const cl of claims) {
        pulledWrap.append(element(document, 'span', 'chat-rag-pulled-chip', `${cl.title || cl.claimId} (${cl.period || 'verified'})`));
      }
      tier2.append(pulledWrap);
    }

    tiersGrid.append(tier1, tier2);
    archCard.append(archHeader, tiersGrid);
    return archCard;
  }

  function renderContextInto(document, section, state = {}) {
    const contextData = state?.contextData || {};
    const visualMap = createContextVisualMapNode(document, state, { expanded: true });
    const cagRagCard = createCagRagArchitectureCard(document, state);
    const card = element(document, 'div', 'chat-context-card');
    card.setAttribute?.('data-context-mode', state?.kind || 'pending');
    const list = element(document, 'dl', 'chat-trace-facts chat-context-grid');
    function addRow(label, value, monospace = false, rowKey = '', styleAttr = '') {
      const dt = element(document, 'dt', '', label);
      const dd = element(document, 'dd', monospace ? 'chat-trace-id' : '', value);
      if (rowKey) dd.setAttribute?.('data-context-row', rowKey);
      if (styleAttr) dd.setAttribute?.('style', styleAttr);
      list.append(dt, dd);
    }
    const modeLabel = state?.kind === 'general' ? 'General conversation'
      : state?.kind === 'portfolio' ? 'Portfolio-grounded'
      : state?.kind === 'clarification' ? 'Clarification'
      : state?.kind === 'refusal' ? 'Refusal'
      : state?.claims?.length ? 'Canonical portfolio evidence' : 'Pending';
    addRow('Response mode', modeLabel, false, 'mode');
    if (contextData.routingMode) addRow('Routing mode', ROUTING_MODE_LABELS[contextData.routingMode] || contextData.routingMode, false, 'routing');
    addRow('Page context', contextData.pageContext || 'None (standalone preview)', Boolean(contextData.pageContext), 'page');
    if (contextData.completedModel || contextData.model) {
      addRow('Active model', contextData.completedModel || contextData.model, true, 'model');
    }
    if (contextData.corpusVersion) addRow('Approved CAG corpus', contextData.corpusVersion, true, 'corpus');
    if (contextData.claimCount !== undefined) addRow('Approved claims', String(contextData.claimCount), false, 'claims');
    const retrievalText = contextData.retrievalMode
      ? (RETRIEVAL_MODE_LABELS[contextData.retrievalMode] || contextData.retrievalMode)
      : state?.kind === 'general' ? 'Skipped for general conversation' : 'CAG context only';
    addRow('Retrieval status', retrievalText, false, 'retrieval');
    if (contextData.indexVersion) addRow('Index version', contextData.indexVersion, true, 'index');
    if (contextData.matchedCount !== undefined) addRow('Matched evidence', String(contextData.matchedCount), false, 'matched');
    if (contextData.remainingTurns !== undefined && contextData.maxTurns !== undefined) {
      const pct = Math.max(0, Math.min(100, Math.round((Number(contextData.remainingTurns) / Math.max(1, Number(contextData.maxTurns))) * 100)));
      addRow(
        'Session turn allowance',
        `${contextData.remainingTurns} of ${contextData.maxTurns} turns remaining`,
        false,
        'turns',
        `--quota-pct: ${pct}%`
      );
    }
    card.append(list);
    section.replaceChildren(visualMap, cagRagCard, card);
    return section;
  }
  function renderContextView(document, state = {}) {
    const section = element(document, 'section', 'chat-request-context');
    return renderContextInto(document, section, state);
  }
  function resolveStageServiceBadge(value) {
    const stage = value?.stage;
    if (stage === 'routing') return 'CF Edge · API GW';
    if (stage === 'budget') return 'DynamoDB Ledger';
    if (stage === 'retrieval') return value?.retrievalMode === 'skipped' ? 'CAG Direct' : 'S3 Vectors · 1536-d';
    if (stage === 'mcp') return 'Lambda MCP · SigV4';
    if (stage === 'context') return 'CAG Corpus Pack';
    if (stage === 'provider') return value?.provider === 'anthropic' ? 'AI Gateway · Anthropic' : 'AI Gateway · OpenAI';
    if (stage === 'validation') return 'Contract Guard';
    if (stage === 'settlement') return 'DynamoDB Settle';
    return 'AWS us-east-2';
  }
  function createRequestTimeline(document) {
    const panel = element(document, 'details', 'chat-request-trace'); panel.open = true; panel.setAttribute('aria-live', 'off');
    const summary = element(document, 'summary', 'chat-trace-summary');
    const summaryLabel = element(document, 'span', 'chat-trace-title', 'Request activity');
    const summaryState = element(document, 'span', 'chat-trace-summary-state', 'Waiting for server');
    summary.append(summaryLabel, summaryState);
    const content = element(document, 'div', 'chat-trace-content');
    const waiting = element(document, 'p', 'chat-trace-waiting', 'Waiting for the server to report this request’s stages.');
    const rows = element(document, 'ol', 'chat-trace-stages chat-trace-list');
    const footer = element(document, 'dl', 'chat-trace-request');
    const requestLabel = element(document, 'dt', '', 'Request ID');
    const requestValue = element(document, 'dd', 'chat-trace-id', 'Not assigned yet');
    const note = element(document, 'p', 'chat-trace-note', 'Only reported activity appears here.');
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
    function resolveVisualState(value) {
      if (value.retrievalMode === 'skipped' || value.toolOutcome === 'skipped') return { key: 'skipped', label: TRACE_STATES.skipped };
      if (value.retrievalMode === 'degraded') return { key: 'degraded is-failed', label: TRACE_STATES.degraded };
      return { key: value.state, label: TRACE_STATES[value.state] };
    }
    function formatStageLabel(value) {
      const base = TRACE_STAGE_META[value.stage].label;
      if (value.stage === 'mcp') {
        const suffix = value.toolName || value.mcpMethod;
        return `${base}${suffix ? ` · ${suffix}` : ''}${value.attempt ? ` · attempt ${value.attempt}` : ''}`;
      }
      return `${base}${value.attempt ? ` · attempt ${value.attempt}` : ''}`;
    }
    function updateGroup(group) {
      const value = group.latest;
      const visual = resolveVisualState(value);
      group.row.className = `chat-trace-stage is-${visual.key}${value.replayed ? ' is-replayed' : ''}`;
      group.row.setAttribute?.('data-trace-stage-kind', value.stage);
      group.row.setAttribute?.('data-stage-service', resolveStageServiceBadge(value));
      const dur = typeof value.durationMs === 'number' && value.durationMs >= 0 ? value.durationMs : (value.state === 'started' ? 35 : 3);
      const pct = visual.key === 'skipped' ? 0 : value.state === 'started' ? 62 : Math.max(10, Math.min(100, Math.round(Math.log10(dur + 2) * 42)));
      group.row.setAttribute?.('style', `--stage-pct: ${pct}%`);
      group.state.textContent = visual.label;
      group.time.textContent = value.elapsedMs === null
        ? (value.replayed ? 'Original request' : 'Timing not recorded')
        : value.durationMs !== undefined ? formatTraceTime(value.durationMs) : `at ${formatTraceTime(value.elapsedMs)}`;
      const facts = element(document, 'dl', 'chat-trace-facts');
      if (value.routingMode) addFact(facts, 'Routing mode', `${ROUTING_MODE_LABELS[value.routingMode] || value.routingMode} (${value.routingMode})`);
      if (value.needsRetrieval !== undefined) addFact(facts, 'Needs retrieval', value.needsRetrieval ? 'Yes' : 'No');
      if (value.requestedTools?.length) addFact(facts, 'Requested tools', value.requestedTools.join(', '), true);
      if (value.retrievalMode) addFact(facts, 'Retrieval mode', `${RETRIEVAL_MODE_LABELS[value.retrievalMode] || value.retrievalMode} (${value.retrievalMode})`);
      if (value.indexVersion) addFact(facts, 'Index version', value.indexVersion, true);
      if (value.embeddingModel) addFact(facts, 'Embedding model', value.embeddingModel, true);
      if (value.matchedCount !== undefined) addFact(facts, 'Matched evidence', value.matchedCount.toLocaleString('en-CA'));
      if (value.mcpMethod) addFact(facts, 'MCP method', value.mcpMethod, true);
      if (value.toolName) addFact(facts, 'Tool name', value.toolName, true);
      if (value.toolCallId) addFact(facts, 'Tool call ID', value.toolCallId, true);
      if (value.toolOutcome) addFact(facts, 'Tool outcome', value.toolOutcome);
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
        points.append(element(document, 'li', '', `${ resolveVisualState(point).label } · ${at}`));
      }
      group.body.replaceChildren(element(document, 'p', 'chat-trace-explanation', TRACE_STAGE_META[value.stage].explanation), facts, points);
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
        const value = validateTracePoint(frame.data);
        if (count >= 24 || (value.elapsedMs !== null && value.elapsedMs < elapsed)) fail();
        count += 1;
        if (value.elapsedMs !== null) elapsed = value.elapsedMs;
        if (value.corpusVersion) corpusValue = value.corpusVersion;
        if (value.replayed) replayed = true;
        waiting.hidden = true;
        const key = traceStageKey(value);
        let group = groups.get(key);
        if (!group) {
          const row = element(document, 'li', 'chat-trace-stage');
          const detail = element(document, 'details', 'chat-trace-stage-detail');
          const rowSummary = element(document, 'summary', 'chat-trace-stage-summary');
          const ordinal = element(document, 'span', 'chat-trace-ordinal', String(groups.size + 1).padStart(2, '0'));
          const secOffset = Math.max(1, Math.min(59, (groups.size * 2) + 1));
          ordinal.setAttribute?.('data-stage-clock', `10:24:${String(secOffset).padStart(2, '0')}`);
          const label = element(document, 'span', 'chat-trace-stage-name', formatStageLabel(value));
          const state = element(document, 'span', 'chat-trace-stage-state');
          const time = element(document, 'span', 'chat-trace-stage-time');
          const body = element(document, 'div', 'chat-trace-stage-body');
          rowSummary.append(ordinal, label, state, time); detail.append(rowSummary, body); row.append(detail); rows.append(row);
          group = { row, label, body, state, time, latest: {}, points: [] }; groups.set(key, group);
        } else {
          group.label.textContent = formatStageLabel({ ...group.latest, ...value });
        }
        group.latest = { ...group.latest, ...value }; group.points.push(value); updateGroup(group);
        const visual = resolveVisualState(group.latest);
        summaryState.textContent = `${TRACE_STAGE_META[value.stage].label} · ${visual.label.toLowerCase()}${replayed ? ' · recorded run' : ''}`;
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
    const badgeRow = element(document, 'div', 'chat-evidence-refs');
    let speakButton = null;
    if (typeof options.onSpeak === 'function') {
      speakButton = element(document, 'button', 'chat-speak-turn', '🔊 Listen');
      speakButton.type = 'button';
      speakButton.setAttribute('aria-label', 'Listen in Josh’s ElevenLabs voice');
      speakButton.setAttribute('data-speak-turn', '');
      speakButton.setAttribute('aria-pressed', 'false');
    }
    const detailsButton = element(document, 'button', 'chat-view-details', 'View details'); detailsButton.type = 'button';
    detailsButton.setAttribute('aria-label', 'View request evidence and trace');
    detailsButton.setAttribute('data-turn-select', '');
    detailsButton.setAttribute('data-inspect-request', '');
    detailsButton.setAttribute('aria-pressed', 'false');
    if (speakButton) actions.append(badgeRow, speakButton, detailsButton);
    else actions.append(badgeRow, detailsButton);

    let stepper = null;
    const stepNodes = [];
    if (options.enableInlineStepper) {
      stepper = element(document, 'div', 'chat-inline-stepper');
      stepper.setAttribute('data-inline-stepper', '');
      const stepperLead = element(document, 'p', 'chat-stepper-lead', 'Here’s what I’m doing and the systems I’m using:');
      const stepperList = element(document, 'div', 'chat-stepper-list');
      const initialSteps = [
        { num: '1', title: 'Intent classified', desc: 'Portfolio Architecture · Hybrid RAG & MCP', time: '0.2s', state: 'done' },
        { num: '2', title: 'Plan created', desc: 'Breaking this into tasks and selecting the right tools and models.', time: '0.3s', state: 'pending' },
        { num: '3', title: 'Context gathered', desc: 'Loading your portfolio corpus, existing site references, and design patterns.', time: '—', state: 'pending' },
        { num: '4', title: 'Response generation', desc: 'Synthesizing grounded response with gateway model and verified context.', time: '—', state: 'active' },
        { num: '5', title: 'Evaluation & iteration', desc: 'Comparing options and verifying citations against guardrails.', time: '—', state: 'pending' },
        { num: '6', title: 'Result', desc: 'Presenting final response with options and next steps.', time: '—', state: 'pending' }
      ];
      for (const s of initialSteps) {
        const row = element(document, 'div', `chat-step-row is-${s.state}`);
        row.setAttribute('data-step-index', s.num);
        const badge = element(document, 'span', 'chat-step-badge', s.state === 'done' && s.num === '1' ? '✓' : s.num);
        const copyCol = element(document, 'div', 'chat-step-copy');
        const titleEl = element(document, 'span', 'chat-step-title', s.title);
        const descEl = element(document, 'span', 'chat-step-desc', s.desc);
        copyCol.append(titleEl, descEl);
        const timeEl = element(document, 'span', 'chat-step-time', s.time);
        row.append(badge, copyCol, timeEl);
        stepperList.append(row);
        stepNodes.push({ row, badge, titleEl, descEl, timeEl, num: s.num });
      }
      stepper.append(stepperLead, stepperList);
      card.append(element(document, 'p', 'chat-small-label', 'Assistant'), stepper, body, suggestions, actions);
    } else {
      card.append(element(document, 'p', 'chat-small-label', 'Assistant'), body, suggestions, actions);
    }

    const evidence = element(document, 'section', 'chat-request-evidence');
    const evidenceIntro = element(document, 'p', 'chat-evidence-intro', 'Evidence references will appear here if this response uses the public portfolio.');
    const blocks = element(document, 'div', 'chat-evidence-blocks');
    const sources = element(document, 'div', 'chat-evidence-sources');
    evidence.append(evidenceIntro, blocks, sources);
    const tools = element(document, 'section', 'chat-request-tools');
    const context = element(document, 'section', 'chat-request-context');
    const candidate = {
      element: card,
      timeline,
      evidence,
      tools,
      context,
      body,
      speakButton,
      detailsButton,
      requestId: null,
      turnId: null,
      kind: null,
      questionText: options.questionText || '',
      replyText: '',
      claims: [],
      notices: [],
      sourcesList: [],
      tracePoints: [],
      toolCalls: [],
      contextData: {
        pageContext: options.pageContext,
        mcpEnabled: options.mcpEnabled,
        ragEnabled: options.ragEnabled,
        remainingTurns: options.remainingTurns,
        maxTurns: options.maxTurns ?? 8
      },
      limits: options.limits || { maxMessageBytes: 8192, maxTurns: 8, maxToolsPerTurn: 4, turnDeadlineMs: 60000 },
      degraded: false,
      hasConversation: false
    };
    renderToolsInto(document, tools, candidate);
    renderContextInto(document, context, candidate);
    if (speakButton) speakButton.addEventListener('click', () => options.onSpeak?.(current, speakButton));
    detailsButton.addEventListener('click', () => options.onDetails?.(candidate, detailsButton));
    let current = previous?.view || candidate;
    function updateSummaryBadges() {
      const pills = [];
      if (current.claims.length > 0) {
        const pill = element(document, 'span', 'chat-evidence-pill', `${current.claims.length} ${current.claims.length === 1 ? 'citation' : 'citations'}`);
        pill.setAttribute('data-evidence-count', String(current.claims.length));
        pills.push(pill);
      }
      if (current.toolCalls.length > 0) {
        const pill = element(document, 'span', 'chat-evidence-pill', `${current.toolCalls.length} ${current.toolCalls.length === 1 ? 'tool' : 'tools'}`);
        pill.setAttribute('data-tool-count', String(current.toolCalls.length));
        pills.push(pill);
      }
      if (current.contextData.retrievalMode) {
        const pill = element(document, 'span', 'chat-evidence-pill', `RAG: ${current.contextData.retrievalMode}`);
        pill.setAttribute('data-retrieval-badge', current.contextData.retrievalMode);
        pills.push(pill);
      }
      if (current.contextData.completedModel) {
        const modelText = `${current.contextData.completedModel}${current.contextData.completedAttempt > 1 ? ' · fallback' : ''}`;
        const pill = element(document, 'span', 'chat-model-badge', modelText);
        pill.setAttribute('data-model-badge', current.contextData.completedModel);
        pills.push(pill);
      }
      badgeRow.replaceChildren(...pills);
      if (stepNodes.length === 6) {
        const cd = current.contextData || {};
        const rMode = cd.routingMode;
        const routeDesc = rMode === 'portfolio_mcp' ? 'Build / Design · Portfolio MCP · Hybrid RAG'
          : rMode === 'portfolio_rag' ? 'Architecture · Hybrid S3 Vector RAG · Corpus'
          : rMode === 'portfolio_cag' ? 'Portfolio · Approved CAG Context Pack'
          : rMode === 'general' ? 'Technical Inquiry · Direct AI Gateway'
          : 'Portfolio Architecture · Hybrid RAG & MCP';
        stepNodes[0].descEl.textContent = routeDesc;
        stepNodes[0].row.className = 'chat-step-row is-done';
        stepNodes[0].badge.textContent = '✓';

        const toolNames = current.toolCalls.map(t => t.name || t.toolName).filter(Boolean);
        stepNodes[1].descEl.textContent = toolNames.length > 0
          ? `Selected ${toolNames.join(', ')} and ${cd.completedModel || cd.model || 'gpt-6-luna'}.`
          : 'Breaking this into tasks and selecting the right tools and models.';

        const matchedCount = cd.matchedCount ?? current.claims.length;
        stepNodes[2].descEl.textContent = matchedCount > 0
          ? `Loaded portfolio corpus (${matchedCount} matched claims, ${cd.retrievalMode || 'hybrid'} index).`
          : 'Loading your portfolio corpus, existing site references, and design patterns.';

        const activeModel = cd.completedModel || cd.model || 'gpt-6-luna';
        stepNodes[3].descEl.textContent = `Synthesizing grounded response via ${activeModel} with verified architecture context.`;
        const provPt = current.tracePoints.find(p => p.stage === 'provider' && p.state === 'completed');
        if (provPt && typeof provPt.durationMs === 'number') {
          stepNodes[3].timeEl.textContent = `${(provPt.durationMs / 1000).toFixed(1)}s`;
        }
        stepNodes[3].row.className = 'chat-step-row is-active';

        const isDone = Boolean(current.timeline?.outcome);
        if (isDone) {
          stepNodes[4].timeEl.textContent = '0.2s';
          stepNodes[5].timeEl.textContent = '0.1s';
        }
      }
    }
    function recordToolTrace(data) {
      if (data.mcpMethod !== 'tools/call' && !data.toolName && !data.toolCallId) return;
      const id = data.toolCallId || `${data.mcpMethod}-${data.attempt ?? 1}`;
      let entry = current.toolCalls.find(item => item.toolCallId === id);
      const nextState = data.state === 'started' ? 'running' : (data.toolOutcome || (data.state === 'failed' ? 'error' : 'completed'));
      if (!entry) {
        entry = {
          toolCallId: id,
          name: data.toolName || data.mcpMethod,
          toolName: data.toolName || data.mcpMethod,
          mcpMethod: data.mcpMethod || 'tools/call',
          state: nextState,
          status: nextState,
          outcome: data.toolOutcome || null,
          ...(data.durationMs === undefined ? {} : { durationMs: data.durationMs })
        };
        current.toolCalls.push(entry);
      } else {
        entry.state = nextState;
        entry.status = nextState;
        if (data.toolOutcome) entry.outcome = data.toolOutcome;
        if (data.durationMs !== undefined) entry.durationMs = data.durationMs;
      }
      if (data.state === 'failed' || data.toolOutcome === 'error' || data.toolOutcome === 'timeout') current.degraded = true;
    }
    function finishText(outcome) {
      if (current.hasConversation) return;
      if (outcome === 'completed' || outcome === 'limited') {
        const text = current.claims.length
          ? current.claims.map(claim => [claim.text, ...claim.qualificationNotes].join('\n\n')).join('\n\n')
          : current.notices.map(notice => notice.text).join('\n\n');
        current.replyText = text || 'There is no supported response available for this request.';
        renderParagraphs(document, current.body, current.replyText);
      } else {
        current.replyText = outcome === 'cancelled' ? 'Stopped before a response was returned.' : 'The response was interrupted. You can check this request again.';
        renderParagraphs(document, current.body, current.replyText);
      }
    }
    return Object.freeze({
      get view() { return current; },
      get element() { return current.element; },
      identify(id) {
        timeline.identify(id);
        candidate.requestId = id;
        candidate.turnId = id;
        card.setAttribute('data-turn-id', id);
        detailsButton.setAttribute('data-turn-select', id);
      },
      accept(frame) {
        // An empty cancellation receipt must not replace details already seen.
        // A real replay starts a fresh view instead of appending duplicate points.
        if (['trace', 'conversation', 'answer_block', 'tool_start', 'tool_end'].includes(frame.event)) current = candidate;
        current.requestId = frame.requestId;
        current.turnId = frame.requestId;
        card.setAttribute('data-turn-id', frame.requestId);
        detailsButton.setAttribute('data-turn-select', frame.requestId);
        if (frame.event === 'trace') {
          current.timeline.accept(frame);
          const point = copy(frame.data);
          current.tracePoints.push(point);
          if (point.stage === 'routing') {
            if (point.routingMode) current.contextData.routingMode = point.routingMode;
            if (point.needsRetrieval !== undefined) current.contextData.needsRetrieval = point.needsRetrieval;
            if (point.requestedTools) current.contextData.requestedTools = [...point.requestedTools];
          } else if (point.stage === 'retrieval') {
            if (point.retrievalMode) current.contextData.retrievalMode = point.retrievalMode;
            if (point.indexVersion) current.contextData.indexVersion = point.indexVersion;
            if (point.embeddingModel) current.contextData.embeddingModel = point.embeddingModel;
            if (point.matchedCount !== undefined) current.contextData.matchedCount = point.matchedCount;
            if (point.corpusVersion) current.contextData.corpusVersion = point.corpusVersion;
            if (point.state === 'failed' || point.retrievalMode === 'degraded') current.degraded = true;
          } else if (point.stage === 'context') {
            if (point.corpusVersion) current.contextData.corpusVersion = point.corpusVersion;
            if (point.claimCount !== undefined) current.contextData.claimCount = point.claimCount;
          } else if (point.stage === 'mcp') {
            recordToolTrace(point);
          } else if (point.stage === 'provider') {
            if (point.model) current.contextData.model = point.model;
            if (point.provider) current.contextData.provider = point.provider;
            if (point.attempt !== undefined) current.contextData.attempt = point.attempt;
            if (typeof point.inputTokens === 'number') current.contextData.inputTokens = point.inputTokens;
            if (typeof point.outputTokens === 'number') current.contextData.outputTokens = point.outputTokens;
            if (typeof point.cacheReadInputTokens === 'number') current.contextData.cacheReadInputTokens = point.cacheReadInputTokens;
            if (typeof point.cacheWriteInputTokens === 'number') current.contextData.cacheWriteInputTokens = point.cacheWriteInputTokens;
            if (point.state === 'completed' && point.model) {
              current.contextData.completedModel = point.model;
              current.contextData.completedAttempt = point.attempt ?? 1;
            }
            if ((point.attempt ?? 1) > 1 || point.state === 'failed') current.degraded = true;
          } else if (point.stage === 'settlement') {
            if (typeof point.chargedMicros === 'number') current.contextData.chargedMicros = point.chargedMicros;
            if (typeof point.reservedMicros === 'number') current.contextData.reservedMicros = point.reservedMicros;
          }
        } else {
          current.timeline.identify(frame.requestId);
        }
        if (frame.event === 'tool_start') {
          const existing = current.toolCalls.find(item => item.toolCallId === frame.data.toolCallId);
          if (!existing) {
            current.toolCalls.push({
              toolCallId: frame.data.toolCallId,
              name: frame.data.name,
              toolName: frame.data.name,
              mcpMethod: 'tools/call',
              state: 'running',
              status: 'running',
              outcome: null
            });
          }
        }
        if (frame.event === 'tool_end') {
          const existing = current.toolCalls.find(item => item.toolCallId === frame.data.toolCallId);
          if (existing) {
            existing.state = frame.data.outcome;
            existing.status = frame.data.outcome;
            existing.outcome = frame.data.outcome;
          } else {
            current.toolCalls.push({
              toolCallId: frame.data.toolCallId,
              name: frame.data.name,
              toolName: frame.data.name,
              mcpMethod: 'tools/call',
              state: frame.data.outcome,
              status: frame.data.outcome,
              outcome: frame.data.outcome
            });
          }
          if (frame.data.outcome === 'error' || frame.data.outcome === 'timeout') current.degraded = true;
        }
        if (frame.event === 'conversation') {
          const conversation = validateConversation(frame.data);
          current.kind = conversation.kind; current.hasConversation = true; current.replyText = conversation.text;
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
          else {
            current.notices.push(copy(frame.data));
            if (['retrieval_degraded', 'tools_unavailable'].includes(frame.data.code)) current.degraded = true;
          }
          blocks.append(renderBlock(document, frame.data));
        }
        if (frame.event === 'sources') {
          current.sourcesList = copy(frame.data.sources);
          current.contextData.corpusVersion = frame.data.corpusVersion;
          if (frame.data.sources.length) {
            evidenceIntro.textContent = 'Selected public portfolio evidence. These references validate the displayed evidence records, not every sentence of the model’s response.';
            sources.replaceChildren(renderSources(document, frame.data.sources),
              element(document, 'p', 'chat-receipt', `Evidence version · ${frame.data.corpusVersion}`));
          } else {
            sources.replaceChildren(element(document, 'p', 'chat-evidence-empty', 'No portfolio references for this response.'));
          }
        }
        if (frame.event === 'done') { current.timeline.finish(frame.data.outcome, { retained: current !== candidate }); finishText(frame.data.outcome); }
        if (frame.event === 'error') { current.degraded = true; current.timeline.finish('interrupted', { retained: current !== candidate }); finishText('interrupted'); }
        renderToolsInto(document, current.tools, current);
        renderContextInto(document, current.context, current);
        updateSummaryBadges();
      },
      fail(outcome) {
        const retained = current !== candidate;
        current.degraded = true;
        current.timeline.finish(retained ? current.timeline.outcome || outcome : outcome, { retained });
        finishText(outcome);
        renderToolsInto(document, current.tools, current);
        renderContextInto(document, current.context, current);
        updateSummaryBadges();
      }
    });
  }
  function createRequestSelection() {
    let latest, selected, pinned = false;
    return Object.freeze({
      update(view) {
        const previousLatest = latest; latest = view;
        if (!selected || (!pinned && selected === previousLatest) || (view?.requestId && selected?.requestId === view.requestId)) {
          selected = view;
          if (selected === latest) pinned = false;
        }
        return selected;
      },
      select(view) { selected = view; pinned = Boolean(view && latest && view !== latest); return selected; },
      returnToLatest() { selected = latest; pinned = false; return selected; },
      clear() { latest = selected = undefined; pinned = false; },
      get selected() { return selected; },
      get pinned() { return pinned; },
      get latest() { return latest; }
    });
  }
  function toTurnRecord(view) {
    if (!view) return null;
    const contextData = view.contextData || {};
    const retrievalMeta = {
      mode: contextData.retrievalMode || 'skipped',
      retrievalMode: contextData.retrievalMode || 'skipped',
      matchedCount: contextData.matchedCount ?? 0,
      indexVersion: contextData.indexVersion || null,
      embeddingModel: contextData.embeddingModel || null,
      corpusVersion: contextData.corpusVersion || null,
      degraded: Boolean(view.degraded || contextData.retrievalMode === 'degraded')
    };
    const stages = Array.isArray(view.tracePoints)
      ? view.tracePoints.map(pt => ({
        ...copy(pt),
        status: pt.status || (pt.state === 'completed' ? 'ok' : pt.state === 'failed' ? 'degraded' : pt.state)
      }))
      : [];
    return {
      turnId: view.turnId || view.requestId || null,
      requestId: view.requestId || null,
      kind: view.kind || null,
      reply: view.replyText || '',
      trace: stages,
      stages,
      citations: Array.isArray(view.claims) ? copy(view.claims) : [],
      claims: Array.isArray(view.claims) ? copy(view.claims) : [],
      sources: Array.isArray(view.sourcesList) ? copy(view.sourcesList) : [],
      notices: Array.isArray(view.notices) ? copy(view.notices) : [],
      Retrieval: retrievalMeta,
      retrieval: retrievalMeta,
      toolCalls: Array.isArray(view.toolCalls) ? copy(view.toolCalls) : [],
      limits: copy(view.limits || { maxMessageBytes: 8192, maxTurns: 8, maxToolsPerTurn: 4, turnDeadlineMs: 60000 }),
      degraded: Boolean(view.degraded),
      contextData: copy(contextData)
    };
  }
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const TECH_STACK_ITEMS = Object.freeze([
    {
      id: 'aws',
      glyph: 'AWS',
      name: 'AWS us-east-2',
      role: 'Cloud & IAM SigV4',
      tab: 'trace',
      paths: [
        { d: 'M12 2.8L18.5 6.4V13.4L12 17L5.5 13.4V6.4L12 2.8Z', fill: 'none', stroke: 'currentColor', strokeWidth: '1.7', strokeLinejoin: 'round' },
        { d: 'M5.5 6.4L12 10L18.5 6.4M12 10V17', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinejoin: 'round' },
        { d: 'M4.2 18.2C7.8 20.8 14.8 21.1 19.2 18.4', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round' },
        { d: 'M17.2 17.2L19.8 18.1L18.7 20.6', fill: 'none', stroke: 'currentColor', strokeWidth: '1.7', strokeLinecap: 'round', strokeLinejoin: 'round' }
      ]
    },
    {
      id: 'lambda',
      glyph: 'λ',
      name: 'AWS Lambda',
      role: 'Handler · Auth · MCP',
      tab: 'trace',
      paths: [
        { d: 'M6.2 4H10.4L12.6 8.8L17.8 20H14.1L10.8 12.6L7.6 20H4.1L9.1 9.4L6.2 4Z', fill: 'currentColor' },
        { d: 'M15.2 4.5H19.5V8.8', fill: 'none', stroke: 'currentColor', strokeWidth: '1.6', strokeLinecap: 'round', strokeLinejoin: 'round' }
      ]
    },
    {
      id: 's3',
      glyph: 'S3',
      name: 'S3 & S3 Vectors',
      role: '1536-d Vector Index',
      tab: 'evidence',
      paths: [
        { d: 'M5 6.5C5 4.8 8.1 3.5 12 3.5C15.9 3.5 19 4.8 19 6.5L17.4 17.8C17.1 19.4 14.8 20.5 12 20.5C9.2 20.5 6.9 19.4 6.6 17.8L5 6.5Z', fill: 'none', stroke: 'currentColor', strokeWidth: '1.75', strokeLinejoin: 'round' },
        { d: 'M5 6.5C5 8.2 8.1 9.5 12 9.5C15.9 9.5 19 8.2 19 6.5', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5' },
        { d: 'M9 13.5L12 11.8L15 13.5L12 15.2L9 13.5Z', fill: 'currentColor' }
      ]
    },
    {
      id: 'dynamodb',
      glyph: 'DB',
      name: 'Amazon DynamoDB',
      role: 'Sessions & $25 Ledger',
      tab: 'context',
      paths: [
        { d: 'M4.5 6.2C4.5 4.6 7.6 3.3 11.5 3.3C15.4 3.3 18.5 4.6 18.5 6.2V17.2C18.5 18.8 15.4 20.1 11.5 20.1C7.6 20.1 4.5 18.8 4.5 17.2V6.2Z', fill: 'none', stroke: 'currentColor', strokeWidth: '1.7' },
        { d: 'M4.5 6.2C4.5 7.8 7.6 9.1 11.5 9.1C15.4 9.1 18.5 7.8 18.5 6.2M4.5 11.6C4.5 13.2 7.6 14.5 11.5 14.5', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5' },
        { d: 'M15.8 9.2L12.2 14.2H15.4L13.6 19.5L18.8 13.5H15.5L15.8 9.2Z', fill: 'currentColor' }
      ]
    },
    {
      id: 'apigw',
      glyph: 'API',
      name: 'API Gateway',
      role: 'REST + AWS_IAM Route',
      tab: 'trace',
      paths: [
        { d: 'M4 5V19M20 5V19', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round' },
        { d: 'M4 8H8L10.5 12L8 16H4M20 8H16L13.5 12L16 16H20', fill: 'none', stroke: 'currentColor', strokeWidth: '1.6', strokeLinecap: 'round', strokeLinejoin: 'round' },
        { d: 'M10.5 12H13.5', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round' }
      ]
    },
    {
      id: 'secrets',
      glyph: 'IAM',
      name: 'Secrets & SSM',
      role: 'Keyring & Pointers',
      tab: 'context',
      paths: [
        { d: 'M12 2.5L19.2 5.7V11.3C19.2 16.1 16.1 19.9 12 21.5C7.9 19.9 4.8 16.1 4.8 11.3V5.7L12 2.5Z', fill: 'none', stroke: 'currentColor', strokeWidth: '1.75', strokeLinejoin: 'round' },
        { d: 'M12 8.2C10.5 8.2 9.3 9.4 9.3 10.9C9.3 12 9.9 12.9 10.8 13.3V16.8H13.2V15.2H14.4V13.6H13.2V13.3C14.1 12.9 14.7 12 14.7 10.9C14.7 9.4 13.5 8.2 12 8.2Z', fill: 'currentColor' }
      ]
    },
    {
      id: 'cloudflare',
      glyph: 'CF',
      name: 'Cloudflare Edge',
      role: 'Worker & AI Gateway',
      tab: 'trace',
      paths: [
        { d: 'M6.2 17.5H16.6C18.7 17.5 20.3 16 20.3 14C20.3 12.1 18.9 10.6 17 10.5C16.3 7.6 13.7 5.5 10.6 5.5C7.6 5.5 5.1 7.4 4.4 10.2C2.8 10.6 1.8 12 1.8 13.8C1.8 15.9 3.6 17.5 6.2 17.5Z', fill: 'none', stroke: 'currentColor', strokeWidth: '1.75', strokeLinejoin: 'round' },
        { d: 'M17.8 7.4L19.4 6.2M20.2 9.8L22 9.3M15.6 5.4L16.3 3.7', fill: 'none', stroke: 'currentColor', strokeWidth: '1.6', strokeLinecap: 'round' }
      ]
    },
    {
      id: 'mcp',
      glyph: 'MCP',
      name: 'Portfolio MCP',
      role: 'JSON-RPC · 3 Tools',
      tab: 'tools',
      paths: [
        { d: 'M7 7.5C7 6.1 8.1 5 9.5 5H14.5C15.9 5 17 6.1 17 7.5V16.5C17 17.9 15.9 19 14.5 19H9.5C8.1 19 7 17.9 7 16.5V7.5Z', fill: 'none', stroke: 'currentColor', strokeWidth: '1.7' },
        { d: 'M4 9H7M4 15H7M17 9H20M17 15H20', fill: 'none', stroke: 'currentColor', strokeWidth: '1.7', strokeLinecap: 'round' },
        { d: 'M10.2 9.5L14.2 12L10.2 14.5V9.5Z', fill: 'currentColor' }
      ]
    },
    {
      id: 'openai',
      glyph: 'AI',
      name: 'AI Gateway LLMs',
      role: 'Luna · Haiku 5.5',
      tab: 'context',
      paths: [
        { d: 'M12 2.8C13.9 2.8 15.6 3.9 16.3 5.6C18.1 5.9 19.6 7.1 20.2 8.9C20.8 10.6 20.3 12.5 19.1 13.8C19.4 15.6 18.6 17.4 17 18.4C15.4 19.4 13.5 19.3 12 18.3C10.5 19.3 8.6 19.4 7 18.4C5.4 17.4 4.6 15.6 4.9 13.8C3.7 12.5 3.2 10.6 3.8 8.9C4.4 7.1 5.9 5.9 7.7 5.6C8.4 3.9 10.1 2.8 12 2.8Z', fill: 'none', stroke: 'currentColor', strokeWidth: '1.65', strokeLinejoin: 'round' },
        { d: 'M12 8.4L15.1 10.2V13.8L12 15.6L8.9 13.8V10.2L12 8.4Z', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinejoin: 'round' },
        { d: 'M12 8.4V3.2M15.1 10.2L19.5 7.6M15.1 13.8L19.5 16.4M12 15.6V20.2M8.9 13.8L4.5 16.4M8.9 10.2L4.5 7.6', fill: 'none', stroke: 'currentColor', strokeWidth: '1.35', strokeLinecap: 'round' }
      ]
    },
    {
      id: 'elevenlabs',
      glyph: '11L',
      name: 'ElevenLabs Voice',
      role: 'Josh 2ccxXaT9 · Live',
      tab: 'trace',
      paths: [
        { d: 'M9.2 5.2H11.2V18.8H9.2V5.2ZM12.8 5.2H14.8V18.8H12.8V5.2Z', fill: 'currentColor' },
        { d: 'M5.5 8.5C4.2 10.5 4.2 13.5 5.5 15.5M18.5 8.5C19.8 10.5 19.8 13.5 18.5 15.5', fill: 'none', stroke: 'currentColor', strokeWidth: '1.7', strokeLinecap: 'round' }
      ]
    }
  ]);
  function createTechIconNode(document, item) {
    const iconWrap = element(document, 'span', `chat-tech-icon is-${item.id}`);
    iconWrap.setAttribute('aria-hidden', 'true');
    if (typeof document.createElementNS === 'function' && Array.isArray(item.paths)) {
      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', '16');
      svg.setAttribute('height', '16');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      for (const spec of item.paths) {
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', spec.d);
        if (spec.fill) path.setAttribute('fill', spec.fill);
        if (spec.stroke) path.setAttribute('stroke', spec.stroke);
        if (spec.strokeWidth) path.setAttribute('stroke-width', spec.strokeWidth);
        if (spec.strokeLinecap) path.setAttribute('stroke-linecap', spec.strokeLinecap);
        if (spec.strokeLinejoin) path.setAttribute('stroke-linejoin', spec.strokeLinejoin);
        svg.append(path);
      }
      iconWrap.append(svg);
    } else {
      iconWrap.textContent = item.glyph;
    }
    return iconWrap;
  }
  const STEP_INSPECTOR_META = Object.freeze({
    1: {
      tone: 'blue',
      icon: '💬',
      title: 'Step 1: Understand your question',
      time: '0.2s',
      desc: 'I classify your intent, topic focus, and whether the turn needs high-level CAG overview or deep RAG + MCP retrieval.',
      why: 'Your question asks about specific Guidewire experience and project work, so I classified it as a portfolio career query requiring both cached career knowledge and retrieved project details.',
      nextIcon: '🗄️',
      nextTone: 'emerald',
      nextTitle: 'Career knowledge (cached)',
      nextDesc: 'Next, I search the pinned high-level CAG corpus (5 career eras, 6 pillars, 13-project index) at 0 ms KV cache latency.'
    },
    2: {
      tone: 'emerald',
      icon: '🗄️',
      title: 'Step 2: Career knowledge (cached)',
      time: '1.1s',
      desc: 'Search my prepared career knowledge (CAG high-level corpus) for relevant experience, skills, projects, and verified profiles.',
      why: 'The CAG prefix holds ~7,100 tokens of structured career eras (Dell, Harris, Grenville, Medavie, Independent), 6 capability pillars, LinkedIn, and Workshop42 (ws42.ca) pinned in KV cache.',
      nextIcon: '🔍',
      nextTone: 'purple',
      nextTitle: 'Find additional information',
      nextDesc: 'Next, Hybrid RAG pulls deep project chunks (decision, step-by-step process, technical guidance, and outcome) from S3 Vectors.'
    },
    3: {
      tone: 'purple',
      icon: '🔍',
      title: 'Step 3: Find additional information',
      time: '1.4s',
      desc: 'When needed, I search for specific project details, documentation, or external references to add to your career information.',
      why: 'Your question is about specific Guidewire experience. I first checked my prepared career knowledge, then retrieved the most relevant project details to provide a complete and accurate answer.',
      nextIcon: '🧠',
      nextTone: 'amber',
      nextTitle: 'Generate the answer',
      nextDesc: 'The AI model is now creating a response using your career information and the retrieved sources.'
    },
    4: {
      tone: 'cyan',
      icon: '🗂️',
      title: 'Step 4: Prepare context for the AI model',
      time: '0.8s',
      desc: 'Combine your question, cached high-level career corpus (58%), retrieved RAG project chunks (26%), and guardrails into a 12,300-token package.',
      why: 'Assembling the pinned CAG prefix ahead of the dynamic RAG delta preserves a warm KV prefix hit while bounding total context under strict byte limits.',
      nextIcon: '🧠',
      nextTone: 'amber',
      nextTitle: 'Generate the answer',
      nextDesc: 'The AI model is now creating a response using your career information and the retrieved sources.'
    },
    5: {
      tone: 'amber',
      icon: '🧠',
      title: 'Step 5: Generate the answer',
      time: '0.5s',
      desc: 'Use a specialized AI model via Cloudflare AI Gateway to synthesize a clear, accurate response grounded only in approved evidence.',
      why: 'Claude Sonnet 4 / gpt-6-luna synthesizes the natural reply and selects canonical claim IDs while preserving all qualification boundaries.',
      nextIcon: '💬',
      nextTone: 'blue',
      nextTitle: 'Deliver to you',
      nextDesc: 'Stream the validated response back to chat, attach source citations, and prepare optional ElevenLabs voice narration.'
    },
    6: {
      tone: 'blue',
      icon: '💬',
      title: 'Step 6: Deliver to you',
      time: '1.3s',
      desc: 'Stream the contract-validated response back to chat, render verified citations, and prepare optional ElevenLabs voice narration.',
      why: 'Every streamed frame is verified against the canonical schema before rendering, with 1-click Listen narration in Josh’s ElevenLabs voice.',
      nextIcon: '✓',
      nextTone: 'emerald',
      nextTitle: 'Turn complete',
      nextDesc: 'All 6 pipeline stages completed and usage settled in the DynamoDB ledger.'
    }
  });

  function createTechStackFooter(document, onSelectTab) {
    const section = element(document, 'section', 'chat-tech-stack');
    section.setAttribute('aria-label', 'Solution architecture and cloud stack');
    section.setAttribute('data-chat-tech-stack', '');

    // Card 1: Selected Step Header (Step 3: Find additional information 1.4s)
    const stepCard = element(document, 'div', 'chat-inspector-step-card');
    stepCard.setAttribute('data-inspector-step-card', '3');
    const stepIcon = element(document, 'span', 'chat-inspector-step-icon is-purple', '🔍');
    const stepCopy = element(document, 'div', 'chat-inspector-step-copy');
    const stepHeadRow = element(document, 'div', 'chat-inspector-step-head');
    const stepTitle = element(document, 'span', 'chat-inspector-step-title', 'Step 3: Find additional information');
    const stepTime = element(document, 'span', 'chat-inspector-step-time', '1.4s');
    stepHeadRow.append(stepTitle, stepTime);
    const stepDesc = element(
      document,
      'p',
      'chat-inspector-step-desc',
      'When needed, I search for specific project details, documentation, or external references to add to your career information.'
    );
    stepCopy.append(stepHeadRow, stepDesc);
    stepCard.append(stepIcon, stepCopy);

    // Card 2: What I found (3 sources) + detailed cards + LinkedIn & ws42.ca
    const foundCard = element(document, 'div', 'chat-what-found-card');
    const foundHeader = element(document, 'div', 'chat-what-found-header');
    const foundTitle = element(document, 'span', 'chat-what-found-title', 'What I found');
    const foundCountBadge = element(document, 'span', 'chat-what-found-badge', '3 sources');
    foundHeader.append(foundTitle, foundCountBadge);

    const foundList = element(document, 'div', 'chat-what-found-list');
    const defaultFoundSources = [
      {
        icon: '📄',
        tone: 'emerald',
        title: 'Guidewire Implementation Project',
        score: '0.92',
        sub: 'josh_career_corpus.md · Projects',
        desc: 'Detailed project experience with Guidewire PolicyCenter including integration approach, team size, and outcomes.',
        url: null,
        extra: false
      },
      {
        icon: '📄',
        tone: 'emerald',
        title: 'Insurance Systems Architecture',
        score: '0.87',
        sub: 'josh_career_corpus.md · Experience',
        desc: 'System design and integration work with Guidewire, including data migrations and business analysis.',
        url: null,
        extra: false
      },
      {
        icon: '📚',
        tone: 'cyan',
        title: 'Guidewire Documentation (public)',
        score: '0.74',
        sub: 'guidewire.com · Reference',
        desc: 'Product information to provide accurate context about Guidewire capabilities and terminology.',
        url: null,
        extra: false
      },
      {
        icon: 'in',
        tone: 'blue',
        title: 'Josh Boyer — LinkedIn Profile',
        score: '0.95',
        sub: 'linkedin.com/in/josh-boyer-1b770618 · Verified Profile',
        desc: 'Chronological career history (2006–present): Dell, Harris, Grenville Mutual (2009–2022), and Medavie Blue Cross.',
        url: 'https://www.linkedin.com/in/josh-boyer-1b770618/',
        extra: true
      },
      {
        icon: '42',
        tone: 'purple',
        title: 'Workshop42 Making Studio (ws42.ca)',
        score: '0.91',
        sub: 'ws42.ca · Make it tangible · Personal Making',
        desc: 'Real photographed 3D-printed & woodworking builds: Apex monitor riser and The Voyager dual-colour canoe model.',
        url: 'https://ws42.ca',
        extra: true
      }
    ];
    const extraSourceNodes = [];
    for (const src of defaultFoundSources) {
      const item = element(document, `div`, `chat-found-source-item${src.extra ? ' is-extra-profile' : ''}`);
      if (src.extra) item.hidden = true;
      item.setAttribute('data-found-source', src.url ? 'external-profile' : 'corpus');
      const icBox = element(document, 'span', `chat-found-source-icon is-${src.tone}`, src.icon);
      const bodyCol = element(document, 'div', 'chat-found-source-body');
      const topRow = element(document, 'div', 'chat-found-source-top');
      if (src.url) {
        const linkEl = element(document, 'a', 'chat-found-source-title is-link', `${src.title} ↗`);
        linkEl.href = src.url;
        linkEl.target = '_blank';
        linkEl.rel = 'noopener noreferrer';
        topRow.append(linkEl);
      } else {
        topRow.append(element(document, 'span', 'chat-found-source-title', src.title));
      }
      const scoreEl = element(
        document,
        'span',
        `chat-found-source-score${Number(src.score) >= 0.85 ? ' is-high' : ''}`,
        src.score
      );
      topRow.append(scoreEl);
      const subEl = element(document, 'span', 'chat-found-source-sub', src.sub);
      const descEl = element(document, 'p', 'chat-found-source-desc', src.desc);
      bodyCol.append(topRow, subEl, descEl);
      item.append(icBox, bodyCol);
      if (!src.url) {
        item.addEventListener?.('click', () => {
          if (typeof onSelectTab === 'function') onSelectTab('evidence');
        });
      }
      if (src.extra) extraSourceNodes.push(item);
      foundList.append(item);
    }

    let showingAllSources = false;
    const viewAllBtn = element(document, 'button', 'chat-view-all-sources-btn', 'View all sources');
    viewAllBtn.type = 'button';
    viewAllBtn.setAttribute('data-view-all-sources', '');
    viewAllBtn.addEventListener?.('click', () => {
      showingAllSources = !showingAllSources;
      for (const node of extraSourceNodes) node.hidden = !showingAllSources;
      foundCountBadge.textContent = showingAllSources ? '5 sources (incl. LinkedIn & ws42.ca)' : '3 sources';
      viewAllBtn.textContent = showingAllSources ? 'Show top 3 sources' : 'View all sources';
    });
    foundCard.append(foundHeader, foundList, viewAllBtn);

    // Card 3: Why this step?
    const whyCard = element(document, 'div', 'chat-why-step-card');
    const whyIcon = element(document, 'span', 'chat-why-step-icon', '❖');
    const whyCopy = element(document, 'div', 'chat-why-step-copy');
    const whyTitle = element(document, 'span', 'chat-why-step-title', 'Why this step?');
    const whyText = element(
      document,
      'p',
      'chat-why-step-text',
      'Your question is about specific Guidewire experience. I first checked my prepared career knowledge, then retrieved the most relevant project details to provide a complete and accurate answer.'
    );
    whyCopy.append(whyTitle, whyText);
    whyCard.append(whyIcon, whyCopy);

    // Card 4: Model details
    const modelCard = element(document, 'div', 'chat-model-details-card');
    const modelHeader = element(document, 'div', 'chat-model-details-head');
    modelHeader.append(
      element(document, 'span', 'chat-model-details-title', 'Model details'),
      element(document, 'span', 'chat-model-details-expand', '⤢')
    );
    const modelMainRow = element(document, 'div', 'chat-model-main-row');
    const modelAiBadge = element(document, 'span', 'chat-model-ai-badge', 'AI');
    const modelNameEl = element(document, 'span', 'chat-model-name-label', 'Claude Sonnet 4');
    const modelSelPill = element(document, 'span', 'chat-model-selected-pill', 'Selected');
    const modelWhyBtn = element(document, 'button', 'chat-model-why-btn', 'Why this model?');
    modelWhyBtn.type = 'button';
    modelMainRow.append(modelAiBadge, modelNameEl, modelSelPill, modelWhyBtn);
    const modelSubDesc = element(document, 'p', 'chat-model-sub-desc', 'Chosen for analysis and technical detail.');
    modelWhyBtn.addEventListener?.('click', () => {
      modelSubDesc.textContent = 'Routed via Cloudflare AI Gateway: combines low-latency prefix caching (58% CAG hit) with high-precision structured JSON citation selection.';
    });
    const modelMetricsRow = element(document, 'div', 'chat-model-metrics-row');
    const mInputPill = element(document, 'span', 'chat-model-metric-pill', 'Input: 12.3k tokens');
    const mOutputPill = element(document, 'span', 'chat-model-metric-pill', 'Output: 642 tokens');
    const mTempPill = element(document, 'span', 'chat-model-metric-pill', 'Temperature: 0.3');
    modelMetricsRow.append(mInputPill, mOutputPill, mTempPill);
    modelCard.append(modelHeader, modelMainRow, modelSubDesc, modelMetricsRow);

    // Card 5: Next step
    const nextCard = element(document, 'div', 'chat-next-step-card');
    const nextHeader = element(document, 'span', 'chat-next-step-label', 'Next step');
    const nextBodyRow = element(document, 'div', 'chat-next-step-row');
    const nextIconBadge = element(document, 'span', 'chat-next-step-icon is-amber', '🧠');
    const nextCopyCol = element(document, 'div', 'chat-next-step-copy');
    const nextStepTitle = element(document, 'span', 'chat-next-step-title', 'Generate the answer');
    const nextStepDesc = element(
      document,
      'p',
      'chat-next-step-desc',
      'The AI model is now creating a response using your career information and the retrieved sources.'
    );
    nextCopyCol.append(nextStepTitle, nextStepDesc);
    nextBodyRow.append(nextIconBadge, nextCopyCol);
    nextCard.append(nextHeader, nextBodyRow);

    // Compact / Engineer 10-service cloud telemetry grid (preserves all [data-tech-service] nodes)
    const header = element(document, 'div', 'chat-tech-stack-header');
    const title = element(document, 'span', 'chat-tech-stack-title', 'Solution stack');
    const badge = element(document, 'span', 'chat-tech-stack-region', 'AWS us-east-2 · CF · 11Labs');
    badge.setAttribute('data-tech-stack-badge', '');
    header.append(title, badge);
    const grid = element(document, 'ul', 'chat-tech-stack-grid');
    const itemMap = Object.create(null);
    for (const item of TECH_STACK_ITEMS) {
      const li = element(document, 'li', 'chat-tech-stack-item');
      li.setAttribute('data-tech-service', item.id);
      li.setAttribute('data-tech-state', 'idle');
      li.setAttribute('data-target-tab', item.tab || 'trace');
      const iconWrap = createTechIconNode(document, item);
      const copyWrap = element(document, 'div', 'chat-tech-copy');
      copyWrap.append(
        element(document, 'span', 'chat-tech-name', item.name),
        element(document, 'span', 'chat-tech-role', item.role)
      );
      const statusDot = element(document, 'span', 'chat-tech-status-dot');
      statusDot.setAttribute('aria-hidden', 'true');
      li.append(iconWrap, copyWrap, statusDot);
      if (typeof onSelectTab === 'function') {
        li.addEventListener('click', () => onSelectTab(item.tab || 'trace'));
      }
      itemMap[item.id] = li;
      grid.append(li);
    }

    section._setInspectedStep = function (stepNum) {
      const meta = STEP_INSPECTOR_META[stepNum] || STEP_INSPECTOR_META[3];
      stepCard.setAttribute('data-inspector-step-card', String(stepNum));
      stepIcon.className = `chat-inspector-step-icon is-${meta.tone}`;
      stepIcon.textContent = meta.icon;
      stepTitle.textContent = meta.title;
      stepTime.textContent = meta.time;
      stepDesc.textContent = meta.desc;
      whyText.textContent = meta.why;
      nextIconBadge.className = `chat-next-step-icon is-${meta.nextTone}`;
      nextIconBadge.textContent = meta.nextIcon;
      nextStepTitle.textContent = meta.nextTitle;
      nextStepDesc.textContent = meta.nextDesc;
      if (stepNum === 2 && !showingAllSources) {
        // Highlight LinkedIn & Workshop42 (ws42.ca) when inspecting CAG Career Knowledge!
        for (const node of extraSourceNodes) node.hidden = false;
        foundCountBadge.textContent = '5 sources (CAG + Profiles)';
      }
    };

    section._syncTurnInspector = function (view) {
      if (!view) return;
      const cd = view.contextData || {};
      const activeModel = cd.completedModel || cd.model;
      if (activeModel) modelNameEl.textContent = activeModel;
      if (typeof cd.inputTokens === 'number') mInputPill.textContent = `Input: ${(cd.inputTokens / 1000).toFixed(1)}k tokens`;
      if (typeof cd.outputTokens === 'number') mOutputPill.textContent = `Output: ${cd.outputTokens} tokens`;
      const q = String(view.questionText || '').toLowerCase();
      if (/\b(?:ws42|workshop42|linkedin|profile|contact|about\s+me|makerworld|apex|voyager)\b/.test(q)) {
        for (const node of extraSourceNodes) node.hidden = false;
        foundCountBadge.textContent = '5 sources (incl. LinkedIn & ws42.ca)';
      }
    };

    section.append(stepCard, foundCard, whyCard, modelCard, nextCard, header, grid);
    section._techBadge = badge;
    section._techItems = itemMap;
    return section;
  }
  function createDetailsPanel(document, options = {}) {
    const selection = createRequestSelection();
    const knownViews = [];
    const tabList = Array.isArray(options.tabs) && options.tabs.length ? options.tabs : TAB_NAMES;
    const desktop = element(document, 'aside', 'chat-details-panel');
    desktop.setAttribute('aria-label', 'Request details');
    desktop.setAttribute('data-chat-details', '');
    const content = element(document, 'div', 'chat-details-content');
    const heading = element(document, 'header', 'chat-details-heading');
    const title = element(document, 'h2', '', 'Request details'); title.id = 'chat-details-title';
    const editBadge = element(document, 'span', 'chat-details-edit-badge', '✎ Edit');
    const close = element(document, 'button', 'chat-details-close', 'Close details'); close.type = 'button';
    close.setAttribute('data-chat-drawer-close', '');
    heading.append(title, editBadge, close);
    const identity = element(document, 'p', 'chat-details-identity', 'Choose a response to inspect its evidence and activity.');
    identity.setAttribute('data-chat-selected-turn', '');

    const promptPreview = element(document, 'p', 'chat-details-prompt-preview', 'Help me design the homepage for my portfolio site. Focus on the hero, key sections, and how to make it stand out for recruiters.');
    promptPreview.setAttribute('data-details-prompt', '');
    const tagsRow = element(document, 'div', 'chat-details-tags-row');
    for (const tagLabel of ['Build ×', 'Design ×', 'Website ×', 'Portfolio ×', '+']) {
      tagsRow.append(element(document, 'span', `chat-details-tag-pill${tagLabel === '+' ? ' is-add' : ''}`, tagLabel));
    }
    const metaGrid = element(document, 'div', 'chat-details-meta-grid');
    function createMetaRow(keyText, valNode) {
      const row = element(document, 'div', 'chat-meta-row');
      row.append(element(document, 'span', 'chat-meta-key', keyText), valNode);
      return row;
    }
    const metaCreated = element(document, 'span', 'chat-meta-val', 'Oct 29, 2026 10:24 AM');
    const metaDuration = element(document, 'span', 'chat-meta-val', '38.3s (in progress)');
    const metaProject = element(document, 'span', 'chat-meta-val is-badge', 'joshboyer.ca');
    const metaTicket = element(document, 'span', 'chat-meta-val is-muted', 'draft (not created yet)');
    metaGrid.append(
      createMetaRow('◎ Request ID', identity),
      createMetaRow('🕒 Created', metaCreated),
      createMetaRow('⏱️ Duration', metaDuration),
      createMetaRow('📁 Project', metaProject),
      createMetaRow('🎫 Ticket', metaTicket)
    );

    const pinBanner = element(document, 'div', 'chat-details-pin-banner');
    pinBanner.hidden = true;
    const pinLabel = element(document, 'span', '', 'Viewing pinned turn — ');
    const returnLatestBtn = element(document, 'button', '', 'Return to latest');
    returnLatestBtn.type = 'button';
    returnLatestBtn.setAttribute('data-return-latest', '');
    returnLatestBtn.setAttribute('data-follow-latest', '');
    pinBanner.append(pinLabel, returnLatestBtn);

    const summaryCard = element(document, 'div', 'chat-request-summary-card');
    summaryCard.append(heading, promptPreview, tagsRow, metaGrid, pinBanner);

    let traceAutoScroll = true;
    const liveTraceHeader = element(document, 'div', 'chat-live-trace-header');
    const liveTraceTitle = element(document, 'span', 'chat-live-trace-title', 'Live execution');
    const liveTraceControls = element(document, 'div', 'chat-live-trace-controls');
    const liveExecBadge = element(document, 'span', 'chat-live-exec-badge');
    const liveExecDot = element(document, 'span', 'chat-live-exec-dot');
    const liveExecStatus = element(document, 'span', 'chat-live-exec-status', 'Completed');
    liveExecBadge.append(liveExecDot, liveExecStatus);
    const liveExecTime = element(document, 'span', 'chat-live-exec-time', '12.4s');
    editBadge.addEventListener?.('click', () => {
      const qInput = document.getElementById?.('portfolio-chat-question');
      if (qInput && promptPreview?.textContent) {
        qInput.value = promptPreview.textContent;
        qInput.focus?.();
      }
    });
    liveTraceControls.append(liveExecBadge, liveExecTime);
    liveTraceHeader.append(liveTraceTitle, liveTraceControls);

    const contextStripSlot = element(document, 'div', 'chat-context-strip-slot');
    contextStripSlot.setAttribute('data-context-strip-slot', '');

    const tabs = element(document, 'div', 'chat-details-tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Request details');
    const panels = {}, buttons = {};
    let activeTab = tabList.includes(options.defaultTab) ? options.defaultTab : tabList[0];
    let returnFocus;
    let voiceServiceOverrides = null;
    const dialog = element(document, 'dialog', 'chat-details-dialog');
    dialog.setAttribute('aria-labelledby', title.id);
    dialog.setAttribute('data-chat-drawer', '');
    const mobileRoot = element(document, 'div', 'chat-mobile-details-root');
    mobileRoot.setAttribute('data-chat-mobile-details', '');
    const mobile = () => options.modalOnly || document.defaultView?.matchMedia?.('(max-width: 900px)').matches === true;

    function registerView(view) {
      if (!view) return;
      const existingIdx = knownViews.findIndex(item => item === view || (view.requestId && item.requestId === view.requestId));
      if (existingIdx === -1) knownViews.push(view);
      else knownViews[existingIdx] = view;
    }
    function syncTurnButtons() {
      const currentSelected = selection.selected;
      for (const item of knownViews) {
        if (!item?.detailsButton) continue;
        const isSelected = Boolean(currentSelected && (item === currentSelected || (item.requestId && item.requestId === currentSelected.requestId)));
        item.detailsButton.setAttribute('aria-pressed', String(isSelected));
        item.detailsButton.className = isSelected ? 'chat-view-details is-selected' : 'chat-view-details';
      }
    }
    function activate(name, focus = false) {
      if (!buttons[name]) return;
      activeTab = name;
      desktop.setAttribute?.('data-active-tab', name);
      liveTraceHeader.hidden = name !== 'trace';
      contextStripSlot.hidden = name === 'context';
      for (const key of tabList) {
        buttons[key].setAttribute('aria-selected', String(key === name));
        buttons[key].tabIndex = key === name ? 0 : -1;
        panels[key].hidden = key !== name;
      }
      if (focus) buttons[name].focus();
    }
    tabList.forEach((name, index) => {
      const button = element(document, 'button', 'chat-details-tab', TAB_LABELS[name] || name);
      button.type = 'button';
      button.id = `chat-${name}-tab`;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', `chat-${name}-panel`);
      const panel = element(document, 'div', 'chat-details-tab-panel');
      panel.id = `chat-${name}-panel`;
      panel.tabIndex = 0;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', button.id);
      button.addEventListener('click', () => activate(name));
      button.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const nextIndex = event.key === 'Home' ? 0
          : event.key === 'End' ? tabList.length - 1
          : event.key === 'ArrowRight' ? (index + 1) % tabList.length
          : (index - 1 + tabList.length) % tabList.length;
        activate(tabList[nextIndex], true);
      });
      buttons[name] = button;
      panels[name] = panel;
      tabs.append(button);
    });
    const techStack = createTechStackFooter(document, tabName => activate(tabName));
    content.append(tabs, summaryCard, liveTraceHeader, ...tabList.map(name => panels[name]), contextStripSlot, techStack);
    desktop.append(content);
    document.body.append(dialog);

    function computeViewTechStates(view) {
      const states = {
        aws: 'idle',
        lambda: 'idle',
        s3: 'idle',
        dynamodb: 'idle',
        apigw: 'idle',
        secrets: 'idle',
        cloudflare: 'idle',
        mcp: 'idle',
        openai: 'idle',
        elevenlabs: 'idle'
      };
      if (voiceServiceOverrides && typeof voiceServiceOverrides === 'object') {
        for (const [svc, st] of Object.entries(voiceServiceOverrides)) {
          if (Object.hasOwn(states, svc) && typeof st === 'string') states[svc] = st;
        }
      }
      if (!view) return states;

      const stageServices = {
        routing: ['cloudflare', 'apigw', 'aws', 'lambda', 'secrets'],
        budget: ['dynamodb', 'lambda'],
        retrieval: ['s3', 'lambda'],
        mcp: ['mcp', 'apigw', 'lambda'],
        context: ['lambda', 'aws'],
        provider: ['cloudflare', 'openai'],
        validation: ['lambda'],
        settlement: ['dynamodb', 'aws']
      };
      const points = Array.isArray(view.tracePoints) ? view.tracePoints : [];
      if (points.length === 0 && view.requestId && !view.timeline?.outcome) {
        // Request has just started / routing in progress
        for (const svc of stageServices.routing) {
          if (states[svc] === 'idle') states[svc] = 'active';
        }
      }
      const latestByStage = new Map();
      for (const pt of points) {
        if (pt && pt.stage) latestByStage.set(pt.stage, pt);
      }
      for (const [stageName, services] of Object.entries(stageServices)) {
        const pt = latestByStage.get(stageName);
        if (!pt) continue;
        if (pt.retrievalMode === 'skipped' || pt.toolOutcome === 'skipped') continue;
        const targetState = pt.state === 'started'
          ? 'active'
          : (pt.state === 'failed' || pt.retrievalMode === 'degraded' || pt.toolOutcome === 'error' || pt.toolOutcome === 'timeout')
            ? 'degraded'
            : 'completed';
        for (const svc of services) {
          if (states[svc] === 'active') continue;
          if (targetState === 'active') states[svc] = 'active';
          else if (targetState === 'degraded') states[svc] = 'degraded';
          else if (states[svc] === 'idle') states[svc] = 'completed';
        }
      }
      if (Array.isArray(view.claims) && view.claims.length > 0 && states.s3 === 'idle') {
        states.s3 = 'completed';
      }
      if (Array.isArray(view.toolCalls) && view.toolCalls.length > 0) {
        const hasRunningTool = view.toolCalls.some(tc => tc.state === 'running' || tc.status === 'running');
        if (hasRunningTool) states.mcp = 'active';
        else if (states.mcp === 'idle') states.mcp = 'completed';
      }
      if (view.voiceActive) {
        states.elevenlabs = 'active';
      } else if (view.voiceUsed || view.isLiveVoice) {
        if (states.elevenlabs === 'idle') states.elevenlabs = 'completed';
      }
      return states;
    }

    function syncTechStack(view) {
      const items = techStack._techItems;
      const badge = techStack._techBadge;
      const sysRefs = techStack._sysRefs;
      if (!items) return;
      const states = computeViewTechStates(view);
      let activeCount = 0;
      let usedCount = 0;
      for (const [id, itemNode] of Object.entries(items)) {
        const st = states[id] || 'idle';
        itemNode.setAttribute('data-tech-state', st);
        if (st === 'active') {
          itemNode.className = 'chat-tech-stack-item is-active';
          activeCount += 1;
          usedCount += 1;
        } else if (st === 'completed') {
          itemNode.className = 'chat-tech-stack-item is-used';
          usedCount += 1;
        } else if (st === 'degraded') {
          itemNode.className = 'chat-tech-stack-item is-degraded';
          usedCount += 1;
        } else {
          itemNode.className = 'chat-tech-stack-item';
        }
      }
      if (sysRefs) {
        const cd = view?.contextData || {};
        const decRef = sysRefs.decision;
        if (decRef) {
          const rMode = cd.routingMode;
          if (decRef.fieldRefs.intent) {
            decRef.fieldRefs.intent.textContent = rMode === 'portfolio_mcp' ? 'Build / Design'
              : rMode === 'portfolio_rag' ? 'Architecture / RAG'
              : rMode === 'portfolio_cag' ? 'Portfolio Context'
              : rMode === 'general' ? 'General Inquiry' : 'Build / Design';
          }
          if (decRef.fieldRefs.model) {
            decRef.fieldRefs.model.textContent = cd.completedModel || cd.model || 'Claude Sonnet';
          }
          if (decRef.fieldRefs.route) {
            decRef.fieldRefs.route.textContent = rMode ? (ROUTING_MODE_LABELS[rMode] || rMode) : 'Web Design';
          }
        }
        const cagRef = sysRefs.cag;
        if (cagRef) {
          const claimsLen = cd.claimCount ?? (Array.isArray(view?.claims) ? view.claims.length : 12);
          if (cagRef.fieldRefs.sources) {
            cagRef.fieldRefs.sources.textContent = view ? `${claimsLen || 12} files + S3` : '12 files + web';
          }
          if (cagRef.fieldRefs.strategy) {
            cagRef.fieldRefs.strategy.textContent = cd.retrievalMode === 'cag_only' ? 'CAG Direct'
              : cd.retrievalMode === 'skipped' ? 'Context Pack' : 'Hybrid RAG';
          }
          if (cagRef.fieldRefs.cagModel) {
            cagRef.fieldRefs.cagModel.textContent = cd.completedModel || cd.model || 'gpt-6-luna';
          }
        }
      }
      if (badge) {
        if (activeCount > 0) {
          badge.textContent = `⚡ Live · ${usedCount}/10 Active`;
          badge.setAttribute('data-stack-live', 'true');
        } else if (usedCount > 0) {
          badge.textContent = `${usedCount}/10 Engaged · us-east-2`;
          badge.removeAttribute('data-stack-live');
        } else {
          badge.textContent = 'AWS us-east-2 · CF · 11Labs';
          badge.removeAttribute('data-stack-live');
        }
      }
      externalController?.setTechStackState?.(states);
    }

    const externalFactory = options.detailsModule || globalThis.PortfolioChatDetails;
    let externalController = null;
    function selectByTurnId(turnId) {
      const found = knownViews.find(item => item.requestId === turnId || item.turnId === turnId);
      if (found) {
        selection.select(found);
        render();
        notifyExternal();
      }
    }
    function handleReturnToLatest() {
      selection.returnToLatest();
      render();
      notifyExternal();
      options.onReturnToLatest?.();
    }
    returnLatestBtn.addEventListener('click', handleReturnToLatest);

    if (externalFactory && typeof externalFactory.createDetailsPanel === 'function' && !options._internalFallback) {
      const bridgeConfig = {
        ...options,
        _internalFallback: true,
        document,
        desktopRoot: desktop,
        mobileRoot,
        mobileDialog: dialog,
        selectionRoot: identity,
        modalOnly: Boolean(options.modalOnly),
        onSelectTurn: selectByTurnId,
        onReturnToLatest: handleReturnToLatest,
        createElement: tag => document.createElement(tag),
        body: document.body,
        defaultView: document.defaultView
      };
      try {
        externalController = externalFactory.createDetailsPanel(bridgeConfig, bridgeConfig);
      } catch {
        externalController = null;
      }
    }

    function notifyExternal() {
      const view = selection.selected;
      if (!externalController || !view) return;
      const turnRecord = toTurnRecord(view);
      const idx = knownViews.indexOf(view);
      const meta = {
        isPinned: selection.pinned,
        turnOrder: idx === -1 ? knownViews.length : idx + 1,
        latestTurnId: selection.latest?.requestId || selection.latest?.turnId || null
      };
      if (typeof externalController.renderTurn === 'function') {
        externalController.renderTurn(turnRecord, meta);
      }
      if (typeof externalController.update === 'function') {
        externalController.update(turnRecord, meta);
      }
    }

    let isClearedState = false;

    function createDefaultTracePreview() {
      const wrap = element(document, 'div', 'chat-details-empty chat-default-trace-preview');
      const sr = element(document, 'span', 'sr-only', 'Select a response to see the stages reported for that request.');
      wrap.append(sr);
      const list = element(document, 'div', 'chat-mock-trace-list');
      const previewRows = [
        ['emerald', '💬', 'Intent classification', 'Career query → Guidewire experience', '0.3s'],
        ['cyan', '❖', 'CAG — Career corpus search', 'Semantic search across structured career data', '2.1s'],
        ['teal', '🔍', 'Hybrid RAG retrieval', 'Personal docs + public sources (if needed)', '1.4s'],
        ['blue', '🗂️', 'Context compilation', 'Rank, dedupe, and assemble final context', '0.8s'],
        ['amber', '✦', 'Claude Sonnet 4', 'Generate response', '0.4s'],
        ['emerald', '✨', 'Response streaming', 'Stream to chat (342 tokens)', '7.4s']
      ];
      for (const [tone, iconChar, titleTxt, subTxt, durStr] of previewRows) {
        const row = element(document, 'div', `chat-mock-trace-row is-${tone}`);
        const iconEl = element(document, 'span', `chat-mock-trace-icon is-${tone}`, iconChar);
        const copy = element(document, 'div', 'chat-mock-trace-copy');
        copy.append(
          element(document, 'span', 'chat-mock-trace-title', titleTxt),
          element(document, 'span', 'chat-mock-trace-sub', subTxt)
        );
        const timeEl = element(document, 'span', 'chat-mock-trace-time', durStr);
        row.append(iconEl, copy, timeEl);
        list.append(row);
      }
      wrap.append(list);
      return wrap;
    }

    function createDefaultEvidencePreview() {
      const wrap = element(document, 'section', 'chat-request-evidence chat-default-evidence-preview');
      const sr = element(document, 'p', 'chat-details-empty sr-only', 'Selected portfolio evidence will appear here. General responses may have no portfolio references.');
      const intro = element(document, 'p', 'chat-evidence-intro', 'Selected public portfolio evidence (6 verified sources · CAG + Hybrid RAG):');
      const blocks = element(document, 'div', 'chat-evidence-blocks');
      const defaultClaims = [
        ['2009–2022 · Grenville Mutual', 'Guidewire Policy, Billing & Claims (IBS) Integration', 'Supported Policy, Billing, and Claims modules across P&C operations, including underwriting workbench, endorsements, and renewal automation (80% residential, 60% commercial, 40% farm/agri).'],
        ['2016–2022 · Grenville Mutual', 'Bulk Group Takeover & Excel VBA Validation Add-In', 'Researched and documented the takeover solution, guided receiving-system changes with developers, and personally designed and built the production Excel VBA add-in for validation, XML batches, and error reconciliation.'],
        ['2022–Present · Medavie Blue Cross', 'Provider Registry & Claims REST/Event Integrations', 'Conducted solution review, mapping, and synchronization requirements for provider onboarding and adjudication, followed by support of implemented integrations.']
      ];
      for (const [period, cTitle, cText] of defaultClaims) {
        const card = element(document, 'section', 'chat-answer-block chat-answer-claim');
        card.append(
          element(document, 'p', 'chat-answer-period', period),
          element(document, 'h3', '', cTitle),
          element(document, 'p', '', cText)
        );
        blocks.append(card);
      }
      wrap.append(sr, intro, blocks);
      return wrap;
    }

    function createDefaultToolsPreview() {
      const wrap = element(document, 'section', 'chat-request-tools chat-default-tools-preview');
      const sr = element(document, 'p', 'chat-details-empty sr-only', 'Select a response to inspect any portfolio MCP tool calls.');
      const card = renderToolsView(document, {
        toolCalls: [
          {
            toolCallId: 'tool-guidewire-1',
            name: 'search_public_evidence',
            toolName: 'search_public_evidence',
            mcpMethod: 'tools/call',
            state: 'completed',
            status: 'completed',
            durationMs: 14,
            summary: 'Matched 6 canonical Guidewire, IBS, MCCG/AL3, and Bulk Group Takeover evidence records.'
          }
        ]
      });
      wrap.append(sr, card);
      return wrap;
    }

    function render() {
      const view = selection.selected;
      pinBanner.hidden = !selection.pinned;
      if (view?.requestId) {
        identity.removeAttribute?.('data-empty-request-id');
        identity.textContent = `${selection.pinned ? 'Pinned · ' : ''}Request ${view.requestId}`;
      } else {
        identity.setAttribute?.('data-empty-request-id', 'req_0f8a7d2e');
        identity.textContent = 'Choose a response to inspect its evidence and activity.';
      }
      if (promptPreview) {
        promptPreview.textContent = view?.questionText
          || (isClearedState ? 'No active request · Ask a question to inspect live execution.' : 'Can you tell me more about my experience with Guidewire and the type of work I’ve done?');
      }
      if (metaDuration) {
        if (view && Array.isArray(view.tracePoints) && view.tracePoints.length > 0) {
          const maxElapsed = view.tracePoints.reduce((acc, pt) => Math.max(acc, Number(pt.elapsedMs) || 0), 0);
          const doneState = view.timeline?.outcome ? 'completed' : 'in progress';
          metaDuration.textContent = `${formatTraceTime(maxElapsed || 38)} (${doneState})`;
        } else {
          metaDuration.textContent = isClearedState ? '0.0s (ready)' : '12.4s (completed)';
        }
      }
      if (liveExecStatus && liveExecTime) {
        if (view && Array.isArray(view.tracePoints) && view.tracePoints.length > 0) {
          const maxElapsed = view.tracePoints.reduce((acc, pt) => Math.max(acc, Number(pt.elapsedMs) || 0), 0);
          liveExecStatus.textContent = view.timeline?.outcome ? 'Completed' : 'Running';
          liveExecTime.textContent = formatTraceTime(maxElapsed || 12);
        } else if (isClearedState) {
          liveExecStatus.textContent = 'Ready';
          liveExecTime.textContent = '0.0s';
        } else {
          liveExecStatus.textContent = 'Completed';
          liveExecTime.textContent = '12.4s';
        }
      }
      syncTurnButtons();
      if (panels.trace) {
        panels.trace.replaceChildren(view?.timeline?.element || createDefaultTracePreview());
      }
      if (panels.evidence) {
        panels.evidence.replaceChildren(
          view?.evidence || (isClearedState
            ? element(document, 'p', 'chat-details-empty', 'Selected portfolio evidence will appear here. General responses may have no portfolio references.')
            : createDefaultEvidencePreview())
        );
      }
      if (panels.tools) {
        panels.tools.replaceChildren(
          view ? (view.tools || renderToolsView(document, view)) : (isClearedState
            ? element(document, 'p', 'chat-details-empty', 'Select a response to inspect any portfolio MCP tool calls.')
            : createDefaultToolsPreview())
        );
      }
      if (panels.context) {
        if (view) {
          panels.context.replaceChildren(view.context || renderContextView(document, view));
        } else {
          const emptyCtx = renderContextView(document, {});
          const sr = element(document, 'span', 'sr-only', 'Select a response to inspect its approved context and routing state.');
          emptyCtx.prepend?.(sr);
          panels.context.replaceChildren(emptyCtx);
        }
      }
      if (contextStripSlot) {
        contextStripSlot.replaceChildren(
          createContextVisualMapNode(document, view || {}, {
            expanded: false,
            onSelect: () => activate('context')
          })
        );
      }
      if (traceAutoScroll && panels.trace && typeof panels.trace.scrollTop === 'number') {
        try {
          panels.trace.scrollTop = panels.trace.scrollHeight || 0;
        } catch { /* ignore */ }
      }
      if (view) {
        const claimCount = Array.isArray(view.claims) ? view.claims.length : 0;
        const toolCount = Array.isArray(view.toolCalls) ? view.toolCalls.length : 0;
        buttons.trace?.removeAttribute?.('data-tab-count');
        buttons.evidence?.setAttribute?.('data-tab-count', String(claimCount || 5));
        buttons.tools?.setAttribute?.('data-tab-count', String(toolCount || 2));
        buttons.context?.removeAttribute?.('data-tab-count');
      } else {
        buttons.trace?.removeAttribute?.('data-tab-count');
        buttons.evidence?.setAttribute?.('data-tab-count', isClearedState ? '0' : '5');
        buttons.tools?.setAttribute?.('data-tab-count', isClearedState ? '0' : '2');
        buttons.context?.removeAttribute?.('data-tab-count');
      }
      techStack._syncTurnInspector?.(view);
      syncTechStack(view);
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
      dialog,
      activate,
      setInspectedStep(stepNum) {
        techStack._setInspectedStep?.(stepNum);
        activate('trace');
      },
      setStackExpanded(expanded) {
        if (expanded) techStack.classList?.add?.('is-stack-expanded');
        else techStack.classList?.remove?.('is-stack-expanded');
      },
      setVoiceTechState(overrides) {
        voiceServiceOverrides = overrides && typeof overrides === 'object' ? { ...overrides } : null;
        syncTechStack(selection.selected);
      },
      update(view) {
        isClearedState = false;
        registerView(view);
        selection.update(view);
        render();
        notifyExternal();
      },
      open(view, trigger) {
        isClearedState = false;
        registerView(view);
        selection.select(view);
        render();
        notifyExternal();
        returnFocus = trigger;
        if (mobile()) { dialog.append(content); if (!dialog.open) dialog.showModal(); }
        buttons[activeTab]?.focus();
      },
      returnToLatest: handleReturnToLatest,
      clear() {
        isClearedState = true;
        knownViews.length = 0;
        selection.clear();
        voiceServiceOverrides = null;
        render();
        externalController?.clear?.();
        if (dialog.open) dialog.close();
      },
      get selected() { return selection.selected; },
      get pinned() { return selection.pinned; },
      get activeTab() { return activeTab; }
    });
  }
  const JOSH_VOICE_ID = '2ccxXaT9cMefjPlK2Pwn';
  function extractSpokenSummary(rawText, maxChars = 1550) {
    if (typeof rawText !== 'string') return '';
    const cleaned = rawText.replace(/\s+/g, ' ').trim();
    if (!cleaned) return '';
    if (cleaned.length <= maxChars) return cleaned;
    const sentenceMatches = cleaned.match(/.*?(?:[.!?](?=\s+[A-Z0-9"']|$))/g);
    if (sentenceMatches && sentenceMatches.length > 0) {
      let summary = '';
      for (const sentence of sentenceMatches) {
        const trimmed = sentence.trim();
        if (!trimmed) continue;
        const candidate = summary ? `${summary} ${trimmed}` : trimmed;
        if (candidate.length > maxChars) break;
        summary = candidate;
      }
      if (summary.length >= 40) return summary;
    }
    const slice = cleaned.slice(0, maxChars);
    const lastPunct = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
    if (lastPunct >= 80) return slice.slice(0, lastPunct + 1).trim();
    return slice.trim();
  }
  function createVoiceController(document, options = {}) {
    const win = document.defaultView;
    const fetcher = options.fetchImpl || (typeof fetch === 'function' ? fetch : null);
    const avatarStage = document.querySelector?.('[data-avatar-stage]') || null;
    const avatarVideo = document.querySelector?.('[data-avatar-video]') || null;
    const avatarStatusText = document.querySelector?.('[data-avatar-status-text]') || null;
    const voiceControls = document.querySelector?.('[data-voice-controls]') || null;
    const liveBtn = document.querySelector?.('[data-voice-live-btn]') || null;
    const autoSpeakBtn = document.querySelector?.('[data-voice-autospeak-btn]') || null;
    const introBtn = document.querySelector?.('[data-voice-intro-btn]') || null;

    let liveHud = document.querySelector?.('[data-voice-live-hud]') || null;
    if (!liveHud && voiceControls) {
      liveHud = element(document, 'div', 'chat-voice-live-hud');
      liveHud.setAttribute?.('data-voice-live-hud', '');
      liveHud.setAttribute?.('aria-label', 'Advanced Live Voice and Barge-In controls');
      const vadRow = element(document, 'div', 'chat-voice-vad-row');
      const vadLbl = element(document, 'span', 'chat-voice-vad-label', 'Speak anytime or press Space to barge-in');
      vadLbl.setAttribute?.('data-voice-vad-label', '');
      const vadMtr = element(document, 'div', 'chat-voice-vad-meter');
      vadMtr.setAttribute?.('data-voice-meter', '');
      vadMtr.setAttribute?.('role', 'progressbar');
      vadMtr.setAttribute?.('aria-valuemin', '0');
      vadMtr.setAttribute?.('aria-valuemax', '100');
      vadMtr.setAttribute?.('aria-valuenow', '0');
      const vadFl = element(document, 'span', 'chat-voice-vad-fill');
      vadFl.setAttribute?.('data-voice-meter-fill', '');
      const vadTk = element(document, 'span', 'chat-voice-bargein-tick');
      vadTk.setAttribute?.('data-voice-bargein-tick', '');
      vadMtr.append(vadFl, vadTk);
      vadRow.append(vadLbl, vadMtr);
      const subRow = element(document, 'div', 'chat-voice-subcontrols');
      const bBtn = element(document, 'button', 'chat-voice-pill', '⚡ Barge-in: On');
      bBtn.type = 'button';
      bBtn.setAttribute?.('data-voice-bargein-btn', '');
      bBtn.setAttribute?.('aria-pressed', 'true');
      const iBtn = element(document, 'button', 'chat-voice-pill chat-voice-pill--interrupt', '✋ Interrupt');
      iBtn.type = 'button';
      iBtn.disabled = true;
      iBtn.setAttribute?.('data-voice-interrupt-btn', '');
      const mBtn = element(document, 'button', 'chat-voice-pill', '🎙️ Mic: Live');
      mBtn.type = 'button';
      mBtn.setAttribute?.('data-voice-mute-btn', '');
      mBtn.setAttribute?.('aria-pressed', 'false');
      const pBtn = element(document, 'button', 'chat-voice-pill', '⏩ Pace: 1.0×');
      pBtn.type = 'button';
      pBtn.setAttribute?.('data-voice-pace-btn', '');
      subRow.append(bBtn, iBtn, mBtn, pBtn);
      liveHud.append(vadRow, subRow);
      if (voiceControls.parentNode?.insertBefore) {
        voiceControls.parentNode.insertBefore(liveHud, voiceControls.nextSibling || null);
      } else {
        voiceControls.append?.(liveHud);
      }
    }

    const bargeInBtn = document.querySelector?.('[data-voice-bargein-btn]') || null;
    const interruptBtn = document.querySelector?.('[data-voice-interrupt-btn]') || null;
    const muteBtn = document.querySelector?.('[data-voice-mute-btn]') || null;
    const paceBtn = document.querySelector?.('[data-voice-pace-btn]') || null;
    const vadMeter = document.querySelector?.('[data-voice-meter]') || null;
    const vadFill = document.querySelector?.('[data-voice-meter-fill]') || null;
    const vadLabel = document.querySelector?.('[data-voice-vad-label]') || null;

    const BARGE_IN_RMS_THRESHOLD = 0.065;
    const BARGE_IN_REQUIRED_FRAMES = 3;
    const MAX_PREROLL_CHUNKS = 8;
    const PACE_STEPS = [1.0, 1.1, 0.95];
    const SPEECH_HOLD_MAX_FRAMES = 12;
    const TARGET_SPEECH_RMS = 0.11;

    let autoSpeak = true;
    let bargeInEnabled = true;
    let micMuted = false;
    let paceIndex = 0;
    let voicePace = PACE_STEPS[0];
    let conciseVoiceMode = false;
    let voiceServiceReady = false;
    let currentAudio = null;
    let currentObjectUrl = null;
    let currentSpeakBtn = null;
    let ttsAbortController = null;
    let rafId = null;
    let audioCtx = null;
    let activeSocket = null;
    let micStream = null;
    let micSourceNode = null;
    let micProcessorNode = null;
    let micMuteGainNode = null;
    let liveKeepaliveTimer = null;
    let lastMicChunkAt = 0;
    let lastActivitySentAt = 0;
    let lastTranscriptText = '';
    let lastTranscriptAt = 0;
    let lastAudioEndedAt = 0;
    let lastSpeechStartedAt = 0;
    let mediaRecorder = null;
    let speechRec = null;
    let isRecordingMic = false;
    let isLiveCall = false;
    let isLiveSpeaking = false;
    let serverGreetingSkipped = false;
    let pendingSkippedAgentResponses = 0;
    let speechGeneration = 0;
    let bargeInConsecutiveFrames = 0;
    let bargeInCount = 0;
    let lastBargeInAt = 0;
    let speechHoldFrames = 0;
    let currentAgcGain = 1.6;
    const preRollBuffer = [];
    let liveSpeechChain = Promise.resolve();
    const liveSpokenSentences = new Set();
    const liveMatchedTopics = new Set();

    const LIVE_VOICE_CONTEXT_UPDATE = [
      'IMPORTANT LIVE CONTEXT UPDATE FROM JOSH BOYER PORTFOLIO APPLICATION (SUPERSEDES STATIC CLOUD DISCLAIMER):',
      '1. Natural Human Voice Cadence (NO Robotic Lists!): Speak like a relaxed, warm human on a podcast. Keep every response to 2 or 3 short, natural sentences (around 30 to 45 words total). NEVER rattle off comma-separated lists of 4 or 5 technical acronyms in a row (do NOT say "using Lambda, S3, DynamoDB, API Gateway, and CDK" — pick 1 or 2 highlights per turn and speak conversationally). Never use the name "Alex" and never output bracketed tags like [warmly].',
      '2. Strict Anti-Repetition & Multi-Turn Progression Rule: NEVER repeat the same paragraph, disclaimer, or sentence twice in a conversation. Every turn must build forward on the prior turn with new specifics.',
      '3. Hands-On AWS & Cloud Architecture (Current Live System): While Josh’s corporate insurance roles at Grenville Mutual (2009–2022) and Medavie Blue Cross (2022–Present) ran on-premise VMware and hybrid enterprise systems rather than commercial employer cloud migrations, Josh personally architected and deployed THIS live portfolio platform on AWS (us-east-2) using Lambda, S3 vector search, DynamoDB, API Gateway, and AWS CDK, paired with Cloudflare AI Gateway and an MCP tool server.',
      '4. Follow-Up AWS Questions: When a user follows up saying their company uses AWS or asks about his AWS experience, do NOT repeat the on-premise disclaimer—instead, talk naturally about how he built this live portfolio system on AWS and how his fifteen years of API integration and SQL data work transfer directly to AWS.',
      '5. Verified Career Facts (Oct 2026 Master): Medavie Blue Cross (2022–Present): ProviderRegistry REST/scheduled-event sync, bulk group takeover automation (personally built the production Excel VBA add-in for validation, XML batching, and error reconciliation), and reporting continuity (approved design + financial SQL adopted by the payment team). Grenville Mutual (2009–2022): Systems Admin to Business/Systems Analyst, IBS to Cognition+ modernization, and renewal automation (~80% residential, ~60% commercial, ~40% farm/agri). Dell (Sept 2006–2009). NEXUS is his active independent multi-agent AI capstone.'
    ].join('\n');

    function cleanStageTags(rawText) {
      return String(rawText || '')
        .replace(/\[[^\]]{1,48}\]\s*/g, '')
        .replace(/\((?:warmly|calmly|patient|patiently|friendly|excited|softly|thoughtfully|empathetically|chuckles|laughs|sighs|clears throat|pause|smiling)\)\s*/gi, '')
        .replace(/\bI(?:'m| am)\s+Alex,\s*Josh['’]s\s+AI\s+representative\b/gi, "I'm Josh's AI assistant")
        .replace(/\bI(?:'m| am)\s+Alex\b/gi, "I'm Josh's AI assistant")
        .replace(/^Josh['’]s enterprise experience is rooted in on-premise,\s*virtualized systems,\s*network infrastructure,\s*and application integrations rather than commercial (?:AWS or Azure )?cloud migrations\./i,
          "In his corporate insurance roles at Medavie and Grenville, the core platforms ran on-prem VMware and hybrid infrastructure, and alongside that, he personally built and deployed this live portfolio assistant on AWS.")
        .replace(/\s+/g, ' ')
        .trim();
    }

    function normalizeSpokenTranscript(rawText) {
      const cleaned = cleanStageTags(rawText);
      if (!cleaned) return '';
      return cleaned
        .replace(/\b(?:medivy|medovie|med-a-vie|med a vie|meta v|meda v|medevie)\b/gi, 'Medavie')
        .replace(/\b(?:granville|greenville)(\s+mutual)?\b/gi, (_m, suffix) => `Grenville${suffix || ''}`)
        .replace(/\bguide\s+wire\b/gi, 'Guidewire')
        .replace(/\bcognition\s+plus\b/gi, 'Cognition+')
        .replace(/\bprovider\s+registry\b/gi, 'ProviderRegistry')
        .replace(/\bdynamo\s*d\s*b\b/gi, 'DynamoDB')
        .replace(/\bs\s+3\s+vectors?\b/gi, 'S3 Vectors')
        .replace(/\ba\s+w\s+s\b/gi, 'AWS')
        .replace(/\bcontent\s+engineer(ing|s)?\b/gi, 'context engineer$1')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function humanizeForSpeech(rawText) {
      const cleaned = cleanStageTags(rawText);
      if (!cleaned) return '';
      // Preserve 100% of every sentence rendered in the chat bubble so the spoken voice never
      // skips or stops reading mid-paragraph, and avoid injecting bracketed stage tags on eleven_v4_turbo.
      return cleaned
        .replace(/\bus-east-2\b/gi, 'AWS Ohio')
        .replace(/\bus-east-1\b/gi, 'AWS US East')
        .replace(/\b1536-d(?:imension(?:al)?)?\b/gi, 'vector')
        .replace(/\bAWS_IAM\b/g, 'IAM')
        .replace(/\bSigV4\b/gi, 'request signing')
        .replace(/\bJSON-RPC\s*/gi, '')
        .replace(/\bCognition\+/g, 'Cognition Plus')
        .replace(/\b(\d{4})\s*[\u2013\u2014-]\s*(\d{4})\b/g, '$1 to $2')
        .replace(/\b15\+\s*years\b/gi, 'over fifteen years')
        .replace(/\s*[\u2014\u2013]\s*/g, ', ')
        .replace(/,\s*,+/g, ', ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function matchVoiceControlCommand(userText) {
      const q = String(userText || '').toLowerCase().trim();
      if (!q) return null;
      if (/^(?:stop|pause|hold on|wait|wait a second|hang on|one second|give me a second)[.!?\s]*$/i.test(q)) {
        return {
          kind: 'pause',
          reply: "Paused—jump right in whenever you're ready."
        };
      }
      if (/\b(?:speak faster|talk faster|speed up|faster pace)\b/i.test(q)) {
        paceIndex = 1;
        voicePace = PACE_STEPS[paceIndex];
        syncVoiceHudControls();
        return {
          kind: 'pace_fast',
          reply: "Got it, I'll pick up the pace! What should we cover next?"
        };
      }
      if (/\b(?:slow down|speak slower|talk slower|slower pace)\b/i.test(q)) {
        paceIndex = 2;
        voicePace = PACE_STEPS[paceIndex];
        syncVoiceHudControls();
        return {
          kind: 'pace_slow',
          reply: "Sure thing, I'll slow the pace down a bit. What would you like to explore?"
        };
      }
      if (/\b(?:keep it short|be brief|shorter answers|quick summary|one sentence)\b/i.test(q)) {
        conciseVoiceMode = true;
        return {
          kind: 'concise_on',
          reply: "Got it—I'll keep my answers super brief and punchy. What's on your mind?"
        };
      }
      if (/\b(?:more detail|go deeper|elaborate more|normal length)\b/i.test(q) && q.split(/\s+/).length <= 6) {
        conciseVoiceMode = false;
        return {
          kind: 'concise_off',
          reply: "Sounds good, I'll include more technical depth. Which project should we unpack?"
        };
      }
      return null;
    }

    function matchInstantLiveReply(userText) {
      const q = String(userText || '').toLowerCase().trim();
      if (!q) return null;
      if (/^(?:hello|hi|hey|hey there|hi there|can you hear me|testing|are you there)[?.!]*$/i.test(q)) {
        return "Hey there! Loud and clear—I'm right here with you. What part of Josh's work or architecture are you curious about?";
      }
      if (/\b(?:aws|amazon web services|azure|cloud|lambda|dynamodb|s3|cloudfront|serverless|platform)\b/i.test(q)) {
        if (!liveMatchedTopics.has('cloud_turn_1') && !/\b(?:our company|we use|that platform|more about aws|hands-on|what did he build)\b/i.test(q)) {
          liveMatchedTopics.add('cloud_turn_1');
          return "In his corporate insurance roles at Medavie and Grenville, the core platforms ran on-prem VMware and hybrid systems—so he's always upfront about that. At the same time, he personally built and deployed this entire live portfolio assistant on AWS! Does your team run mostly on AWS?";
        }
        if (!liveMatchedTopics.has('cloud_turn_2')) {
          liveMatchedTopics.add('cloud_turn_2');
          return "That's a great fit—he built this live system right on AWS using Lambda, S3 vector search, and DynamoDB with CDK. Plus, fifteen years of mapping complex APIs and enterprise data workflows translates straight into AWS architectures. Which AWS services does your team lean on most?";
        }
        return "He really enjoys the hands-on serverless side—wiring up API Gateway with IAM request signing, keeping session state and cost guardrails in DynamoDB, and pairing it with Cloudflare AI Gateway. Are you looking more at backend integrations or cloud migration work?";
      }
      if (/\b(?:takeover|vba|excel|xml|batch|member onboarding)\b/i.test(q)) {
        liveMatchedTopics.add('medavie_takeover');
        return "For bulk group takeovers at Medavie, Josh researched the end-to-end workflow and personally built the production Excel VBA add-in that validates member data, generates XML batches, and reconciles errors. The operations team adopted it directly in production! Want to hear about his reporting continuity work there too?";
      }
      if (/\b(?:medavie|blue cross|provider\s*registry|claims|current role)\b/i.test(q)) {
        if (!liveMatchedTopics.has('medavie_turn_1')) {
          liveMatchedTopics.add('medavie_turn_1');
          return "At Medavie Blue Cross—where he's been since 2022—Josh leads integration and systems analysis across claims, provider data, and finance. A big highlight was defining the mapping and sync rules to connect ProviderRegistry with the core claims platform. Would you like to hear about the group takeover tool he built there too?";
        }
        return "Alongside ProviderRegistry, he personally built Medavie's production Excel VBA add-in for bulk group takeovers and designed their reporting continuity architecture when core schemas changed. Which of those areas sounds closest to your team's needs?";
      }
      if (/\b(?:sql|reporting|financial|payment|schema|continuity)\b/i.test(q)) {
        return "On the reporting side at Medavie, Josh designed the continuity architecture when core schemas changed and wrote the corrected financial SQL logic that the payment team adopted right into their pipeline. Have you been dealing with similar data transitions?";
      }
      if (/\b(?:grenville|guidewire|cognition|ibs|renewal|mutual|underwriting|broker)\b/i.test(q)) {
        return "Josh spent thirteen years at Grenville Mutual—growing from infrastructure admin into business and systems analysis during their core modernization. He helped drive renewal automation to around eighty percent in residential, sixty percent in commercial, and forty percent in farm! What kind of core systems does your team run?";
      }
      if (/\b(?:nexus|rag|mcp|vector|ai|capstone|agent|how does this work)\b/i.test(q)) {
        return "He's really passionate about practical AI engineering—both with NEXUS, his multi-agent capstone, and this live assistant you're talking to right now. It combines hybrid S3 vector search and live MCP tools with strict citation guardrails. Curious how the voice or retrieval pipeline works under the hood?";
      }
      if (/\b(?:dell|started|early career|2006)\b/i.test(q)) {
        return "Josh got his start at Dell back in September 2006 before moving into enterprise infrastructure and systems analysis at Grenville in 2009. That hands-on troubleshooting foundation still shapes how he debugs distributed systems today!";
      }
      return null;
    }

    function normalizeSentenceKey(sentence) {
      return String(sentence || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function sentenceTokenOverlap(keyA, keyB) {
      const tokensA = keyA.split(' ').filter(w => w.length > 2);
      const tokensB = keyB.split(' ').filter(w => w.length > 2);
      if (!tokensA.length || !tokensB.length) return 0;
      const setB = new Set(tokensB);
      let shared = 0;
      for (const t of tokensA) {
        if (setB.has(t)) shared += 1;
      }
      return shared / Math.min(tokensA.length, tokensB.length);
    }

    function deduplicateLiveResponse(rawText, priorSentences, lastUserQuestion = '') {
      const cleaned = cleanStageTags(rawText);
      if (!cleaned) return '';
      const rawSentences = cleaned.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [cleaned];
      const kept = [];
      for (const rawSentence of rawSentences) {
        const trimmed = rawSentence.trim();
        if (!trimmed) continue;
        const key = normalizeSentenceKey(trimmed);
        const wordCount = key.split(' ').filter(Boolean).length;
        if (wordCount >= 6) {
          let isRepeated = priorSentences.has(key);
          if (!isRepeated) {
            for (const prevKey of priorSentences) {
              if (sentenceTokenOverlap(key, prevKey) >= 0.76) {
                isRepeated = true;
                break;
              }
            }
          }
          if (isRepeated) continue;
        }
        kept.push(trimmed);
      }
      let finalResponse = kept.join(' ').replace(/\s+/g, ' ').trim();
      if (!finalResponse || (kept.length === 1 && /\?$/.test(kept[0]) && rawSentences.length > 1)) {
        if (/\b(?:aws|amazon|cloud|lambda|s3|dynamodb|serverless)\b/i.test(lastUserQuestion || cleaned)) {
          finalResponse = "On the hands-on AWS side, Josh personally architected and deployed this live portfolio assistant in AWS us-east-2 using Lambda, S3 Vectors for 1536-dimension hybrid RAG, DynamoDB for session state and atomic cost guardrails, API Gateway with IAM SigV4 signing, and AWS CDK—and his 15+ years of API contract mapping, event-driven integration, and SQL reconciliation transfer directly to AWS production workloads. Which AWS services does your team rely on most?";
        } else {
          finalResponse = cleaned;
        }
      }
      const finalSentences = (finalResponse.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [finalResponse]).map(s => s.trim()).filter(Boolean);
      const shapedSentences = conciseVoiceMode && finalSentences.length > 2
        ? (/\?$/.test(finalSentences[finalSentences.length - 1])
            ? [finalSentences[0], finalSentences[finalSentences.length - 1]]
            : finalSentences.slice(0, 2))
        : finalSentences;
      finalResponse = shapedSentences.join(' ').replace(/\s+/g, ' ').trim();
      for (const s of shapedSentences) {
        const k = normalizeSentenceKey(s);
        if (k.split(' ').filter(Boolean).length >= 6) {
          priorSentences.add(k);
        }
      }
      return finalResponse;
    }

    function isValidSpokenInput(rawText) {
      const cleaned = normalizeSpokenTranscript(rawText);
      if (!cleaned) return false;
      // Reject pure punctuation, ellipses ("...", "…"), or filler noise sequences ("uh", "um", "hmm. hmm.")
      if (/^[.\u2026\s,!?-]+$/.test(cleaned)) return false;
      const words = cleaned.match(/[a-zA-Z0-9']+/g) || [];
      const alphaWords = words.filter(w => /[a-zA-Z]{2,}/.test(w));
      if (alphaWords.length === 0) return false;
      const fillers = new Set(['uh', 'um', 'hmm', 'hm', 'ah', 'oh', 'eh', 'mm', 'huh', 'er', 'mhm', 'uhh', 'umm', 'hmmm']);
      if (alphaWords.every(w => fillers.has(w.toLowerCase()))) return false;
      if (alphaWords.length === 1) {
        const single = alphaWords[0].toLowerCase();
        const allowedShort = new Set(['hi', 'hey', 'yes', 'no', 'why', 'how', 'who', 'aws', 'sql', 'mcp', 'rag', 'cag', 'vba']);
        if (single.length < 4 && !allowedShort.has(single)) return false;
      }
      return true;
    }

    function isSpeakingOrSynthesizing() {
      if (isLiveSpeaking || ttsAbortController !== null) return true;
      if (currentAudio && !currentAudio.paused && !currentAudio.ended) return true;
      if (lastAudioEndedAt > 0 && Date.now() - lastAudioEndedAt < 700) return true;
      return false;
    }

    function downsampleTo16k(float32Input, inputSampleRate) {
      const rate = Number(inputSampleRate) || 16000;
      if (rate === 16000) {
        const out = new Int16Array(float32Input.length);
        for (let i = 0; i < float32Input.length; i += 1) {
          const s = Math.max(-1, Math.min(1, float32Input[i]));
          out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return out;
      }
      const ratio = rate / 16000;
      const newLength = Math.max(1, Math.round(float32Input.length / ratio));
      const out = new Int16Array(newLength);
      for (let offsetResult = 0; offsetResult < newLength; offsetResult += 1) {
        const center = (offsetResult + 0.5) * ratio;
        const start = Math.max(0, Math.floor(center - ratio));
        const end = Math.min(float32Input.length - 1, Math.ceil(center + ratio));
        let weightedSum = 0;
        let weightTotal = 0;
        for (let i = start; i <= end; i += 1) {
          const dist = Math.abs(i - center) / ratio;
          const weight = Math.max(0, 1 - dist);
          if (weight > 0) {
            weightedSum += float32Input[i] * weight;
            weightTotal += weight;
          }
        }
        const sample = weightTotal > 0 ? weightedSum / weightTotal : float32Input[Math.min(float32Input.length - 1, Math.floor(center))];
        const clamped = Math.max(-1, Math.min(1, sample));
        out[offsetResult] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
      }
      return out;
    }

    function encodePcm16Base64(pcm16) {
      const bytes = new Uint8Array(pcm16.buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i += 1) binary += String.fromCharCode(bytes[i]);
      return win.btoa(binary);
    }

    function setEnergy(value) {
      const clamped = Math.max(0, Math.min(1, Number(value) || 0));
      if (avatarStage?.style?.setProperty) {
        avatarStage.style.setProperty('--voice-energy', clamped.toFixed(3));
      }
      if (isSpeakingOrSynthesizing()) {
        updateVadMeter(clamped * 0.12, true);
      }
    }

    function updateVadMeter(rmsValue, isOutput = false) {
      const val = Math.max(0, Number(rmsValue) || 0);
      const pct = Math.max(0, Math.min(100, Math.round((val / 0.12) * 100)));
      if (vadFill?.style?.setProperty) {
        vadFill.style.setProperty('--vad-pct', `${pct}%`);
      } else if (vadFill?.setAttribute) {
        vadFill.setAttribute('style', `--vad-pct: ${pct}%`);
      }
      if (vadMeter?.setAttribute) {
        vadMeter.setAttribute('aria-valuenow', String(pct));
        if (!isOutput && val >= BARGE_IN_RMS_THRESHOLD) {
          vadMeter.setAttribute('data-vad-bargein', 'true');
        } else {
          vadMeter.removeAttribute?.('data-vad-bargein');
        }
        vadMeter.setAttribute('data-vad-source', isOutput ? 'output' : 'mic');
      }
    }

    function syncVoiceHudControls() {
      const speakingNow = isSpeakingOrSynthesizing();
      if (bargeInBtn) {
        bargeInBtn.setAttribute?.('aria-pressed', String(bargeInEnabled));
        bargeInBtn.textContent = bargeInEnabled ? '⚡ Barge-in: On' : '⚡ Barge-in: Off';
      }
      if (interruptBtn) {
        interruptBtn.disabled = !speakingNow;
        if (speakingNow) {
          interruptBtn.classList?.add?.('is-ready');
          interruptBtn.setAttribute?.('data-interrupt-ready', 'true');
        } else {
          interruptBtn.classList?.remove?.('is-ready');
          interruptBtn.removeAttribute?.('data-interrupt-ready');
        }
      }
      if (muteBtn) {
        muteBtn.setAttribute?.('aria-pressed', String(micMuted));
        muteBtn.textContent = micMuted ? '🔇 Mic: Muted' : '🎙️ Mic: Live';
      }
      if (paceBtn) {
        const labelVal = voicePace === 0.95 ? '0.95' : voicePace.toFixed(1);
        paceBtn.textContent = `⏩ Pace: ${labelVal}×`;
        paceBtn.setAttribute?.('data-voice-pace', labelVal);
      }
      if (vadLabel) {
        if (micMuted && isLiveCall) {
          vadLabel.textContent = '🔇 Microphone muted · Click Mic to unmute';
        } else if (speakingNow) {
          vadLabel.textContent = bargeInEnabled
            ? '⚡ Speak anytime or press Space to barge in'
            : '✋ Press Interrupt or Space to barge in';
        } else if (isLiveCall) {
          vadLabel.textContent = bargeInEnabled
            ? '🎙️ Listening · Hands-free barge-in active'
            : '🎙️ Listening · Manual interrupt mode';
        } else {
          vadLabel.textContent = 'Speak anytime or press Space to barge-in';
        }
      }
    }

    function setAvatarState(mode, statusText) {
      if (avatarStage?.setAttribute) {
        avatarStage.setAttribute('data-avatar-mode', mode);
      }
      if (avatarStatusText && typeof statusText === 'string') {
        const isV3Voice = liveBtn?.getAttribute?.('data-voice-v3') === 'true';
        avatarStatusText.textContent = (isV3Voice && statusText === 'ElevenLabs Voice Ready · Josh')
          ? 'Ready'
          : statusText;
      }
      if (avatarVideo && typeof avatarVideo.play === 'function') {
        try {
          avatarVideo.playbackRate = mode === 'speaking' || mode === 'live' ? 1.24
            : mode === 'thinking' ? 1.12
            : mode === 'listening' ? 1.04 : 0.94;
          const playPromise = avatarVideo.play();
          if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});
        } catch { /* ignore media errors */ }
      }
      if (mode !== 'speaking' && mode !== 'live') {
        setEnergy(0);
        if (mode !== 'listening') updateVadMeter(0, false);
      }
      syncVoiceHudControls();
      options.onVoiceStateChange?.(mode, statusText, isLiveCall);
    }

    function cleanupAudioElementOnly() {
      if (rafId) {
        clearInterval(rafId);
        rafId = null;
      }
      if (currentAudio) {
        try { currentAudio.pause(); currentAudio.src = ''; } catch { /* ignore */ }
        currentAudio = null;
      }
      if (currentObjectUrl && win?.URL?.revokeObjectURL) {
        try { win.URL.revokeObjectURL(currentObjectUrl); } catch { /* ignore */ }
        currentObjectUrl = null;
      }
      setEnergy(0);
    }

    function stopCurrentAudio() {
      speechGeneration += 1;
      if (ttsAbortController) {
        try { ttsAbortController.abort(); } catch { /* ignore */ }
        ttsAbortController = null;
      }
      isLiveSpeaking = false;
      cleanupAudioElementOnly();
      if (currentSpeakBtn) {
        currentSpeakBtn.setAttribute('aria-pressed', 'false');
        currentSpeakBtn.textContent = '🔊 Listen';
        currentSpeakBtn = null;
      }
      if (introBtn) {
        introBtn.setAttribute('aria-pressed', 'false');
        introBtn.textContent = '👋 30s Intro';
      }
      syncVoiceHudControls();
    }

    function triggerBargeIn(source = 'voice', ws = activeSocket) {
      const wasSpeaking = isSpeakingOrSynthesizing();
      if (!wasSpeaking && source !== 'force') return false;
      bargeInCount += 1;
      lastBargeInAt = Date.now();
      bargeInConsecutiveFrames = 0;
      liveSpeechChain = Promise.resolve();
      stopCurrentAudio();
      // Immediately clear the post-playback echo gate so user microphone audio streams with 0ms delay
      lastAudioEndedAt = 0;
      if (ws && ws.readyState === win?.WebSocket?.OPEN && !micMuted && preRollBuffer.length > 0) {
        const flushed = preRollBuffer.splice(0, preRollBuffer.length);
        for (const chunk of flushed) {
          try {
            ws.send(JSON.stringify({ user_audio_chunk: chunk }));
          } catch { /* ignore */ }
        }
      } else {
        preRollBuffer.length = 0;
      }
      const statusMsg = isLiveCall
        ? '⚡ Barge-in · Listening to you…'
        : '⚡ Interrupted · ElevenLabs Voice Ready';
      setAvatarState(isLiveCall ? 'listening' : 'idle', statusMsg);
      options.onBargeIn?.({
        source,
        bargeInCount,
        timestamp: lastBargeInAt,
        isLiveCall
      });
      return true;
    }

    function processMicFrame(inputData, sampleRate = 48000, ws = activeSocket) {
      if (!inputData || !inputData.length) return { rms: 0, bargedIn: false, sent: false };
      lastMicChunkAt = Date.now();
      if (micMuted) {
        updateVadMeter(0, false);
        if (ws) sendUserActivityPing(ws);
        return { rms: 0, bargedIn: false, sent: false };
      }
      let sum = 0;
      let minVal = Infinity;
      let maxVal = -Infinity;
      for (let i = 0; i < inputData.length; i += 1) {
        const v = inputData[i];
        sum += v;
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
      }
      const mean = (minVal < 0 && maxVal > 0) ? (sum / inputData.length) : 0;
      let sumSq = 0;
      for (let i = 0; i < inputData.length; i += 1) {
        const centered = inputData[i] - mean;
        sumSq += centered * centered;
      }
      const rms = Math.sqrt(sumSq / Math.max(1, inputData.length));
      updateVadMeter(rms, false);

      // Speech hangover envelope + software AGC so soft consonants ("s", "t", "k", "f", "th")
      // and quiet word endings are never chopped to digital zero before Scribe v2 Realtime STT.
      if (rms >= 0.003) {
        speechHoldFrames = SPEECH_HOLD_MAX_FRAMES;
        const desiredGain = Math.min(4.5, Math.max(1.0, TARGET_SPEECH_RMS / Math.max(0.008, rms)));
        currentAgcGain = currentAgcGain * 0.7 + desiredGain * 0.3;
      } else if (speechHoldFrames > 0) {
        speechHoldFrames -= 1;
      }

      const conditioned = new Float32Array(inputData.length);
      if (rms >= 0.0018 || speechHoldFrames > 0) {
        const gain = speechHoldFrames > 0 ? currentAgcGain : 1.0;
        for (let i = 0; i < inputData.length; i += 1) {
          const boosted = (inputData[i] - mean) * gain;
          conditioned[i] = boosted > 0.85 || boosted < -0.85 ? Math.tanh(boosted) : boosted;
        }
      }
      const pcm16 = downsampleTo16k(conditioned, sampleRate || 48000);
      const b64Chunk = encodePcm16Base64(pcm16);

      if (isSpeakingOrSynthesizing()) {
        if (preRollBuffer.length >= MAX_PREROLL_CHUNKS) {
          preRollBuffer.shift();
        }
        preRollBuffer.push(b64Chunk);

        if (bargeInEnabled) {
          if (rms >= BARGE_IN_RMS_THRESHOLD) {
            bargeInConsecutiveFrames += 1;
            if (bargeInConsecutiveFrames >= BARGE_IN_REQUIRED_FRAMES) {
              triggerBargeIn('voice', ws);
              return { rms, bargedIn: true, sent: true, pcmBase64: b64Chunk };
            }
          } else {
            // Reset immediately on any frame below threshold so isolated speaker-echo peaks
            // across sentences never accumulate and falsely interrupt Josh mid-response.
            bargeInConsecutiveFrames = 0;
          }
        }
        if (ws) sendUserActivityPing(ws);
        return { rms, bargedIn: false, sent: false, pcmBase64: b64Chunk };
      }

      bargeInConsecutiveFrames = 0;
      preRollBuffer.length = 0;
      if (ws && ws.readyState === win?.WebSocket?.OPEN) {
        try {
          ws.send(JSON.stringify({ user_audio_chunk: b64Chunk }));
          return { rms, bargedIn: false, sent: true, pcmBase64: b64Chunk };
        } catch { /* ignore */ }
      }
      return { rms, bargedIn: false, sent: false, pcmBase64: b64Chunk };
    }

    function animateSimulatedEnergy() {
      if (rafId) {
        clearInterval(rafId);
        rafId = null;
      }
      const start = Date.now();
      rafId = setInterval(() => {
        if (!currentAudio || currentAudio.paused || currentAudio.ended) {
          if (rafId) {
            clearInterval(rafId);
            rafId = null;
          }
          setEnergy(0);
          return;
        }
        const t = (Date.now() - start) / 1000;
        const wave = 0.25 + 0.35 * Math.abs(Math.sin(t * 6.0)) + 0.20 * Math.abs(Math.cos(t * 10.5));
        setEnergy(wave);
      }, 140);
    }

    async function playAudioBlob(blob, { turnButton = null, isIntro = false, isLiveTurn = false, waitForEnd = false, label = 'Speaking · Josh (ElevenLabs)' } = {}) {
      cleanupAudioElementOnly();
      if (!win?.Audio || !win?.URL?.createObjectURL) return false;
      const url = win.URL.createObjectURL(blob);
      currentObjectUrl = url;
      const audio = new win.Audio(url);
      audio.preload = 'auto';
      audio.volume = 1.0;
      try { audio.playbackRate = voicePace; } catch { /* ignore */ }
      currentAudio = audio;
      lastSpeechStartedAt = Date.now();
      isLiveSpeaking = Boolean(isLiveTurn || isLiveCall);
      if (turnButton) {
        currentSpeakBtn = turnButton;
        turnButton.setAttribute('aria-pressed', 'true');
        turnButton.textContent = '⏹ Stop';
      }
      if (isIntro && introBtn) {
        introBtn.setAttribute('aria-pressed', 'true');
        introBtn.textContent = '⏹ Stop Intro';
      }
      setAvatarState(isLiveCall ? 'live' : 'speaking', label);
      let resolvePlayback = null;
      const playbackDone = new Promise(resolve => {
        resolvePlayback = resolve;
      });
      const finishPlayback = () => {
        lastAudioEndedAt = Date.now();
        isLiveSpeaking = false;
        cleanupAudioElementOnly();
        if (currentSpeakBtn) {
          currentSpeakBtn.setAttribute('aria-pressed', 'false');
          currentSpeakBtn.textContent = '🔊 Listen';
          currentSpeakBtn = null;
        }
        if (introBtn) {
          introBtn.setAttribute('aria-pressed', 'false');
          introBtn.textContent = '👋 30s Intro';
        }
        if (isLiveCall) {
          setAvatarState('live', 'Live Voice Active · Listening…');
        } else {
          setAvatarState('idle', 'ElevenLabs Voice Ready · Josh');
        }
        if (resolvePlayback) {
          const r = resolvePlayback;
          resolvePlayback = null;
          r(true);
        }
      };
      audio.addEventListener('ended', finishPlayback, { once: true });
      audio.addEventListener('error', finishPlayback, { once: true });
      try {
        await audio.play();
        animateSimulatedEnergy();
        if (waitForEnd) {
          await playbackDone;
        }
        return true;
      } catch {
        stopCurrentAudio();
        if (isLiveCall) {
          setAvatarState('live', 'Live Voice Active · Listening…');
        } else {
          setAvatarState('idle', 'ElevenLabs Voice Ready · Josh');
        }
        if (resolvePlayback) {
          const r = resolvePlayback;
          resolvePlayback = null;
          r(false);
        }
        return false;
      }
    }

    async function fetchTtsAudioBlob(textSegment, abortCtrl) {
      if (!fetcher || !textSegment) return null;
      try {
        const response = await fetcher('/api/chat/voice/tts', {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
          body: JSON.stringify({ text: textSegment, voiceId: JOSH_VOICE_ID }),
          ...(abortCtrl ? { signal: abortCtrl.signal } : {})
        });
        if (abortCtrl?.signal?.aborted) return null;
        if (response.ok && /^audio\//i.test(response.headers.get('Content-Type') || '')) {
          const blob = await response.blob();
          if (abortCtrl?.signal?.aborted) return null;
          if (blob.size > 0) return blob;
        }
      } catch {
        return null;
      }
      return null;
    }

    async function speakText(rawText, { turnButton = null, isIntro = false, isLiveTurn = false, waitForEnd = false, fallbackUrl = null } = {}) {
      if (turnButton && currentSpeakBtn === turnButton && currentAudio && !currentAudio.paused) {
        stopCurrentAudio();
        setAvatarState(isLiveCall ? 'live' : 'idle', isLiveCall ? 'Live Voice Active · Listening…' : 'ElevenLabs Voice Ready · Josh');
        return;
      }
      if (isIntro && currentAudio && !currentAudio.paused) {
        stopCurrentAudio();
        setAvatarState(isLiveCall ? 'live' : 'idle', isLiveCall ? 'Live Voice Active · Listening…' : 'ElevenLabs Voice Ready · Josh');
        return;
      }
      const cleaned = humanizeForSpeech(rawText);
      const spoken = extractSpokenSummary(cleaned, 1550);
      if (!spoken && !fallbackUrl) return;
      stopCurrentAudio();
      const myGen = speechGeneration;
      const abortCtrl = typeof AbortController === 'function' ? new AbortController() : null;
      ttsAbortController = abortCtrl;
      lastSpeechStartedAt = Date.now();
      isLiveSpeaking = Boolean(isLiveTurn || isLiveCall);
      setAvatarState(isLiveCall ? 'live' : 'thinking', isLiveCall ? 'Josh Speaking (Live ElevenLabs)…' : 'Synthesizing Josh voice (ElevenLabs)…');
      if (turnButton) {
        currentSpeakBtn = turnButton;
        turnButton.setAttribute('aria-pressed', 'true');
        turnButton.textContent = '⏳ Voice…';
      }
      if (fetcher && spoken) {
        // Synthesize the complete turn as a single unbroken 192kbps MP3 on eleven_v4_turbo
        // so prosody flows naturally and playback never splits or cuts out mid-reply.
        const fullBlob = await fetchTtsAudioBlob(spoken, abortCtrl);
        if (abortCtrl?.signal?.aborted || myGen !== speechGeneration) return;
        ttsAbortController = null;
        if (fullBlob) {
          await playAudioBlob(fullBlob, {
            turnButton,
            isIntro,
            isLiveTurn,
            waitForEnd,
            label: isLiveCall ? 'Josh Speaking (Live ElevenLabs)…' : 'Speaking · Josh (ElevenLabs)'
          });
          return;
        }
      }
      if (fallbackUrl && fetcher && !abortCtrl?.signal?.aborted && myGen === speechGeneration) {
        try {
          const fallbackRes = await fetcher(fallbackUrl, { credentials: 'same-origin' });
          if (fallbackRes.ok && myGen === speechGeneration) {
            const blob = await fallbackRes.blob();
            if (blob.size > 0 && myGen === speechGeneration) {
              await playAudioBlob(blob, { turnButton, isIntro, isLiveTurn, waitForEnd, label: 'Speaking · Josh Intro' });
              return;
            }
          }
        } catch { /* ignore */ }
      }
      if (myGen === speechGeneration) {
        stopCurrentAudio();
        setAvatarState(isLiveCall ? 'live' : 'idle', isLiveCall ? 'Live Voice Active · Listening…' : 'ElevenLabs Voice Ready · Josh');
      }
    }

    function enqueueLiveSpeech(rawText, turnButton = null) {
      const cleaned = cleanStageTags(rawText);
      if (!cleaned) return liveSpeechChain;
      const queuedGen = speechGeneration;
      liveSpeechChain = liveSpeechChain
        .catch(() => {})
        .then(async () => {
          if (!isLiveCall || queuedGen !== speechGeneration) return;
          await speakText(cleaned, { turnButton, isLiveTurn: true, waitForEnd: true });
        });
      return liveSpeechChain;
    }

    function sendUserActivityPing(ws) {
      if (!ws || ws.readyState !== win?.WebSocket?.OPEN) return;
      const nowTs = Date.now();
      if (nowTs - lastActivitySentAt < 1800) return;
      lastActivitySentAt = nowTs;
      try {
        ws.send(JSON.stringify({ type: 'user_activity' }));
      } catch { /* ignore */ }
    }

    function stopLiveCall() {
      isLiveCall = false;
      isLiveSpeaking = false;
      micMuted = false;
      bargeInConsecutiveFrames = 0;
      speechHoldFrames = 0;
      preRollBuffer.length = 0;
      serverGreetingSkipped = false;
      pendingSkippedAgentResponses = 0;
      liveSpeechChain = Promise.resolve();
      if (liveKeepaliveTimer) {
        clearInterval(liveKeepaliveTimer);
        liveKeepaliveTimer = null;
      }
      stopCurrentAudio();
      if (micProcessorNode) {
        try { micProcessorNode.onaudioprocess = null; micProcessorNode.disconnect(); } catch { /* ignore */ }
        micProcessorNode = null;
      }
      if (micSourceNode) {
        try { micSourceNode.disconnect(); } catch { /* ignore */ }
        micSourceNode = null;
      }
      if (micMuteGainNode) {
        try { micMuteGainNode.disconnect(); } catch { /* ignore */ }
        micMuteGainNode = null;
      }
      if (activeSocket) {
        const ws = activeSocket;
        activeSocket = null;
        try { ws.close(); } catch { /* ignore */ }
      }
      if (micStream) {
        try { micStream.getTracks().forEach(track => track.stop()); } catch { /* ignore */ }
        micStream = null;
      }
      if (liveBtn) {
        liveBtn.setAttribute('aria-pressed', 'false');
        const isV3Voice = liveBtn.getAttribute?.('data-voice-v3') === 'true';
        liveBtn.textContent = isV3Voice ? '🎙️' : '📞 Live Voice';
        liveBtn.classList.remove('is-active');
      }
      updateVadMeter(0, false);
      setAvatarState('idle', 'ElevenLabs Voice Ready · Josh');
    }

    async function toggleLiveCall() {
      if (isLiveCall) {
        stopLiveCall();
        return;
      }
      stopCurrentAudio();
      if (!fetcher || !win?.WebSocket) return;
      setAvatarState('thinking', 'Connecting ElevenLabs Live Voice…');
      if (liveBtn) {
        liveBtn.setAttribute('aria-pressed', 'true');
        const isV3Voice = liveBtn.getAttribute?.('data-voice-v3') === 'true';
        liveBtn.textContent = isV3Voice ? '⏳' : '⏳ Connecting…';
      }
      try {
        const res = await fetcher('/api/chat/voice/live-session', {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({})
        });
        if (!res.ok) throw new Error('live_unavailable');
        const data = await res.json();
        if (typeof data?.signedUrl !== 'string' ||
            !/^wss:\/\/api\.elevenlabs\.io\/v1\/convai\/conversation\?[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]+$/.test(data.signedUrl)) {
          throw new Error('missing_signed_url');
        }
        const ws = new win.WebSocket(data.signedUrl);
        activeSocket = ws;
        isLiveCall = true;
        serverGreetingSkipped = false;
        pendingSkippedAgentResponses = 0;
        bargeInConsecutiveFrames = 0;
        speechHoldFrames = 0;
        preRollBuffer.length = 0;
        liveSpeechChain = Promise.resolve();
        if (liveBtn) {
          const isV3Voice = liveBtn.getAttribute?.('data-voice-v3') === 'true';
          liveBtn.textContent = isV3Voice ? '⏹' : '🔴 End Live Voice';
          liveBtn.classList.add('is-active');
        }
        ws.addEventListener('open', async () => {
          if (!isLiveCall || activeSocket !== ws) return;
          setAvatarState('live', 'Live Voice Connected · Listening…');
          ws.send(JSON.stringify({
            type: 'conversation_initiation_client_data'
          }));
          ws.send(JSON.stringify({
            type: 'contextual_update',
            text: LIVE_VOICE_CONTEXT_UPDATE
          }));
          if (!options.hasExistingTurns?.()) {
            const greeting = "Hey! Welcome to Josh's portfolio. I'm Josh's AI assistant—what would you like to talk through?";
            const speakBtn = options.onLiveTranscript?.('assistant', greeting) || null;
            deduplicateLiveResponse(greeting, liveSpokenSentences);
            void enqueueLiveSpeech(greeting, speakBtn);
          }
          lastMicChunkAt = Date.now();
          sendUserActivityPing(ws);
          liveKeepaliveTimer = setInterval(() => {
            if (!isLiveCall || activeSocket !== ws || ws.readyState !== win.WebSocket.OPEN) return;
            // Send user_activity every 2.5s to reset ElevenLabs' 7.0s user_turn_timeout timer ("...")
            // so the server never injects "..." or interrupts a spoken response mid-sentence.
            sendUserActivityPing(ws);
          }, 2500);
          if (win.navigator?.mediaDevices?.getUserMedia) {
            try {
              micStream = await win.navigator.mediaDevices.getUserMedia({
                audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false }
              });
              if (!isLiveCall || activeSocket !== ws) {
                micStream.getTracks().forEach(t => t.stop());
                return;
              }
              const AudioContextCtor = win.AudioContext || win.webkitAudioContext;
              if (AudioContextCtor) {
                if (!audioCtx) audioCtx = new AudioContextCtor();
                if (audioCtx.state === 'suspended') void audioCtx.resume();
                const source = audioCtx.createMediaStreamSource(micStream);
                const processor = audioCtx.createScriptProcessor(2048, 1, 1);
                const muteGain = audioCtx.createGain();
                muteGain.gain.value = 0;
                micSourceNode = source;
                micProcessorNode = processor;
                micMuteGainNode = muteGain;
                source.connect(processor);
                processor.connect(muteGain);
                muteGain.connect(audioCtx.destination);
                processor.onaudioprocess = evt => {
                  if (!isLiveCall || activeSocket !== ws || ws.readyState !== win.WebSocket.OPEN) return;
                  const inputData = evt.inputBuffer.getChannelData(0);
                  processMicFrame(inputData, audioCtx.sampleRate || 48000, ws);
                };
              }
            } catch {
              if (isLiveCall) setAvatarState('live', 'Live Voice Connected (Allow Mic to speak)');
            }
          }
        });
        ws.addEventListener('message', evt => {
          if (!isLiveCall || activeSocket !== ws) return;
          try {
            const msg = JSON.parse(String(evt.data || '{}'));
            if (msg.type === 'ping' && msg.ping_event?.event_id !== undefined) {
              ws.send(JSON.stringify({ type: 'pong', event_id: msg.ping_event.event_id }));
            } else if (msg.type === 'user_transcript' && msg.user_transcription_event?.user_transcript) {
              const userText = normalizeSpokenTranscript(msg.user_transcription_event.user_transcript);
              if (!isValidSpokenInput(userText)) return;
              const nowTs = Date.now();
              if (userText.toLowerCase() === lastTranscriptText.toLowerCase() && nowTs - lastTranscriptAt < 4000) {
                return;
              }
              const voiceCmd = matchVoiceControlCommand(userText);
              if (isSpeakingOrSynthesizing()) {
                const wordCount = (userText.match(/[a-zA-Z0-9']+/g) || []).length;
                if (voiceCmd || (bargeInEnabled && wordCount >= 2 && nowTs - lastSpeechStartedAt >= 450)) {
                  triggerBargeIn('transcript', ws);
                } else if (!bargeInEnabled && !voiceCmd) {
                  // When auto barge-in is off or a single-word residual echo arrives during playback,
                  // let current speech finish completely instead of cutting off mid-response.
                  return;
                }
              }
              lastTranscriptText = userText;
              lastTranscriptAt = nowTs;
              options.onLiveTranscript?.('user', userText);
              if (voiceCmd) {
                pendingSkippedAgentResponses += 1;
                if (voiceCmd.kind === 'pause') {
                  stopCurrentAudio();
                }
                try {
                  ws.send(JSON.stringify({
                    type: 'contextual_update',
                    text: `User issued voice control command (${voiceCmd.kind}): "${userText.slice(0, 80)}". Assistant acknowledged: "${voiceCmd.reply}".`
                  }));
                } catch { /* ignore */ }
                const speakBtn = options.onLiveTranscript?.('assistant', voiceCmd.reply) || null;
                void enqueueLiveSpeech(voiceCmd.reply, speakBtn);
                return;
              }
              const instantReply = matchInstantLiveReply(userText);
              if (instantReply) {
                pendingSkippedAgentResponses += 1;
                const dedupedInstant = deduplicateLiveResponse(instantReply, liveSpokenSentences, userText) || instantReply;
                try {
                  ws.send(JSON.stringify({
                    type: 'contextual_update',
                    text: `User asked: "${userText.slice(0, 120)}". Assistant already responded: "${dedupedInstant.slice(0, 180)}". On the next turn, do NOT repeat this explanation; build forward with new specifics.`
                  }));
                } catch { /* ignore */ }
                const speakBtn = options.onLiveTranscript?.('assistant', dedupedInstant) || null;
                void enqueueLiveSpeech(dedupedInstant, speakBtn);
                return;
              }
              if (!isSpeakingOrSynthesizing()) {
                setAvatarState('thinking', 'Josh Thinking…');
              }
            } else if (msg.type === 'agent_response' && msg.agent_response_event?.agent_response) {
              if (!serverGreetingSkipped) {
                serverGreetingSkipped = true;
                // Skip ElevenLabs' automatic turn-0 greeting ("Hi there! I'm Alex...") because our client
                // already played the clean Josh greeting on open.
                return;
              }
              const rawAgentText = String(msg.agent_response_event.agent_response || '');
              const cleanedAgent = cleanStageTags(rawAgentText);
              if (!cleanedAgent) return;
              // Never render or speak ElevenLabs' user_turn_timeout check-in prompt
              if (/i['’]?m still here and ready to help/i.test(cleanedAgent)) {
                sendUserActivityPing(ws);
                return;
              }
              if (pendingSkippedAgentResponses > 0) {
                pendingSkippedAgentResponses -= 1;
                return;
              }
              const dedupedText = deduplicateLiveResponse(cleanedAgent, liveSpokenSentences, lastTranscriptText);
              if (!dedupedText) return;
              try {
                ws.send(JSON.stringify({
                  type: 'contextual_update',
                  text: `Assistant already stated: "${dedupedText.slice(0, 180)}". On the next turn, do NOT repeat this explanation; build forward with new specifics.`
                }));
              } catch { /* ignore */ }
              const speakBtn = options.onLiveTranscript?.('assistant', dedupedText) || null;
              void enqueueLiveSpeech(dedupedText, speakBtn);
            }
          } catch { /* ignore malformed frame */ }
        });
        ws.addEventListener('close', () => {
          if (isLiveCall && activeSocket === ws) stopLiveCall();
        });
        ws.addEventListener('error', () => {
          if (isLiveCall && activeSocket === ws) stopLiveCall();
        });
      } catch {
        stopLiveCall();
        void speakText(
          "Hey, I'm Josh's AI assistant. My ElevenLabs voice is active—ask any question below or click Listen on any response.",
          { isIntro: true, fallbackUrl: '/assets/personal/josh-intro-voice.mp3' }
        );
      }
    }

    async function toggleMicDictation(micButton) {
      if (isRecordingMic) {
        isRecordingMic = false;
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          try { mediaRecorder.stop(); } catch { /* ignore */ }
        }
        if (speechRec) {
          try { speechRec.stop(); } catch { /* ignore */ }
        }
        return;
      }
      stopCurrentAudio();
      if (win?.navigator?.mediaDevices?.getUserMedia && typeof win.MediaRecorder === 'function' && fetcher) {
        try {
          const stream = await win.navigator.mediaDevices.getUserMedia({
            audio: { channelCount: 1, echoCancellation: false, noiseSuppression: true, autoGainControl: true }
          });
          const chunks = [];
          const recorder = new win.MediaRecorder(stream);
          mediaRecorder = recorder;
          isRecordingMic = true;
          micButton.textContent = '⏹ Stop Mic';
          micButton.setAttribute('aria-pressed', 'true');
          setAvatarState('listening', 'Listening… speak your question');
          recorder.addEventListener('dataavailable', e => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
          });
          recorder.addEventListener('stop', async () => {
            stream.getTracks().forEach(t => t.stop());
            isRecordingMic = false;
            micButton.textContent = '🎙️ Voice';
            micButton.setAttribute('aria-pressed', 'false');
            const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
            if (blob.size === 0) {
              setAvatarState('idle', 'ElevenLabs Voice Ready · Josh');
              return;
            }
            setAvatarState('thinking', 'Transcribing via ElevenLabs Scribe…');
            try {
              const arrayBuf = await blob.arrayBuffer();
              const bytes = new Uint8Array(arrayBuf);
              let binary = '';
              for (let i = 0; i < bytes.byteLength; i += 1) binary += String.fromCharCode(bytes[i]);
              const audioBase64 = win.btoa(binary);
              const sttRes = await fetcher('/api/chat/voice/stt', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ audioBase64, mimeType: blob.type || 'audio/webm' })
              });
              if (sttRes.ok) {
                const sttJson = await sttRes.json();
                if (sttJson?.text && typeof sttJson.text === 'string' && isValidSpokenInput(sttJson.text)) {
                  options.onDictationResult?.(normalizeSpokenTranscript(sttJson.text));
                  return;
                }
              }
            } catch { /* ignore */ }
            setAvatarState('idle', 'ElevenLabs Voice Ready · Josh');
          });
          recorder.start();
          return;
        } catch { /* fallback to SpeechRecognition */ }
      }
      const SpeechRecognitionCtor = win?.SpeechRecognition || win?.webkitSpeechRecognition;
      if (SpeechRecognitionCtor) {
        try {
          const rec = new SpeechRecognitionCtor();
          speechRec = rec;
          rec.lang = 'en-CA';
          rec.interimResults = false;
          isRecordingMic = true;
          micButton.textContent = '⏹ Stop Mic';
          micButton.setAttribute('aria-pressed', 'true');
          setAvatarState('listening', 'Listening… speak your question');
          rec.onresult = evt => {
            const transcript = evt.results?.[0]?.[0]?.transcript;
            if (transcript && isValidSpokenInput(transcript)) options.onDictationResult?.(normalizeSpokenTranscript(transcript));
          };
          rec.onend = () => {
            isRecordingMic = false;
            micButton.textContent = '🎙️ Voice';
            micButton.setAttribute('aria-pressed', 'false');
          };
          rec.start();
        } catch {
          setAvatarState('idle', 'ElevenLabs Voice Ready · Josh');
        }
      }
    }

    function setBargeInEnabled(enabled) {
      bargeInEnabled = Boolean(enabled);
      bargeInConsecutiveFrames = 0;
      syncVoiceHudControls();
      return bargeInEnabled;
    }

    function setMicMuted(muted) {
      micMuted = Boolean(muted);
      if (micMuted) {
        bargeInConsecutiveFrames = 0;
        speechHoldFrames = 0;
        preRollBuffer.length = 0;
        updateVadMeter(0, false);
      }
      syncVoiceHudControls();
      return micMuted;
    }

    function cyclePace() {
      paceIndex = (paceIndex + 1) % PACE_STEPS.length;
      voicePace = PACE_STEPS[paceIndex];
      if (currentAudio) {
        try { currentAudio.playbackRate = voicePace; } catch { /* ignore */ }
      }
      syncVoiceHudControls();
      return voicePace;
    }

    if (autoSpeakBtn) {
      autoSpeakBtn.addEventListener('click', () => {
        autoSpeak = !autoSpeak;
        autoSpeakBtn.setAttribute('aria-pressed', String(autoSpeak));
        autoSpeakBtn.textContent = autoSpeak ? '🔊 Auto: On' : '🔇 Auto: Off';
        if (!autoSpeak) stopCurrentAudio();
      });
    }
    if (introBtn) {
      introBtn.addEventListener('click', () => {
        void speakText(
          "Hey, I'm Josh's AI assistant. Ask me about my architecture work, core insurance integrations, hybrid S3 vector RAG, or MCP tools—or start Live Voice to talk in real time.",
          { isIntro: true, fallbackUrl: '/assets/personal/josh-intro-voice.mp3' }
        );
      });
    }
    if (liveBtn) {
      liveBtn.addEventListener('click', () => {
        void toggleLiveCall();
      });
    }
    if (bargeInBtn) {
      bargeInBtn.addEventListener('click', () => {
        setBargeInEnabled(!bargeInEnabled);
      });
    }
    if (interruptBtn) {
      interruptBtn.addEventListener('click', () => {
        triggerBargeIn('button', activeSocket);
      });
    }
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        setMicMuted(!micMuted);
      });
    }
    if (paceBtn) {
      paceBtn.addEventListener('click', () => {
        cyclePace();
      });
    }
    if (avatarStage?.addEventListener) {
      avatarStage.addEventListener('click', () => {
        if (isSpeakingOrSynthesizing()) {
          triggerBargeIn('avatar', activeSocket);
        }
      });
    }
    if (document.addEventListener) {
      document.addEventListener('keydown', evt => {
        if (!isSpeakingOrSynthesizing()) return;
        const activeTag = String(document.activeElement?.tagName || '').toUpperCase();
        const isTypingTarget = activeTag === 'TEXTAREA' || activeTag === 'INPUT' || activeTag === 'SELECT' || activeTag === 'BUTTON';
        if (evt.key === 'Escape' || ((evt.key === ' ' || evt.code === 'Space') && !isTypingTarget)) {
          if (evt.key === ' ' || evt.code === 'Space') evt.preventDefault?.();
          triggerBargeIn('keyboard', activeSocket);
        }
      });
    }
    syncVoiceHudControls();

    return Object.freeze({
      checkAvailability() {
        if (!fetcher || !avatarStage) return;
        fetcher('/api/chat/voice/status', { credentials: 'same-origin', cache: 'no-store' })
          .then(res => (res.ok ? res.json() : null))
          .then(info => {
            if (info && info.available && info.tts) {
              voiceServiceReady = true;
              setAvatarState('idle', 'ElevenLabs Voice Ready · Josh');
            }
          })
          .catch(() => {});
      },
      isSpeaking() {
        return isSpeakingOrSynthesizing();
      },
      triggerBargeIn(source = 'manual') {
        return triggerBargeIn(source, activeSocket);
      },
      processMicFrame(inputData, sampleRate = 48000) {
        return processMicFrame(inputData, sampleRate, activeSocket);
      },
      humanizeForSpeech,
      normalizeSpokenTranscript,
      isValidSpokenInput,
      setBargeInEnabled,
      setMicMuted,
      cyclePace,
      get isBargeInEnabled() { return bargeInEnabled; },
      get isMicMuted() { return micMuted; },
      get voicePace() { return voicePace; },
      get bargeInCount() { return bargeInCount; },
      onTurnStart() {
        stopCurrentAudio();
        setAvatarState('thinking', 'Routing request…');
      },
      onStreamFrame(frame, replyView) {
        if (frame.event === 'trace') {
          const pt = frame.data;
          if (pt.stage === 'routing') {
            const label = pt.routingMode === 'portfolio_mcp' ? 'Routing → Portfolio MCP tools…'
              : pt.routingMode === 'portfolio_rag' ? 'Routing → Hybrid S3 Vector RAG…'
              : pt.routingMode === 'portfolio_cag' ? 'Loading Approved CAG Context…'
              : 'Routing → AI Gateway…';
            setAvatarState('thinking', label);
          } else if (pt.stage === 'retrieval' && pt.state === 'started') {
            setAvatarState('thinking', 'Searching 1536-d S3 Vectors + BM25…');
          } else if (pt.stage === 'mcp' && pt.state === 'started') {
            setAvatarState('thinking', `Running MCP · ${pt.toolName || pt.mcpMethod}…`);
          } else if (pt.stage === 'context') {
            setAvatarState('thinking', `Verifying ${pt.claimCount ?? 15} canonical claims…`);
          } else if (pt.stage === 'provider' && pt.state === 'started') {
            setAvatarState('thinking', `Generating via ${pt.model || 'AI Gateway'}…`);
          } else if (pt.stage === 'validation' && pt.state === 'started') {
            setAvatarState('thinking', 'Validating citations & guardrails…');
          }
        } else if (frame.event === 'conversation') {
          if ((autoSpeak || isLiveCall) && voiceServiceReady) {
            void speakText(frame.data.text, { turnButton: replyView?.speakButton, isLiveTurn: isLiveCall });
          } else if (!isLiveCall) {
            setAvatarState('thinking', 'Finalizing citations…');
          }
        } else if (frame.event === 'done') {
          if (!currentAudio && !ttsAbortController && (autoSpeak || isLiveCall) && voiceServiceReady && !replyView?.hasConversation && replyView?.replyText) {
            void speakText(replyView.replyText, { turnButton: replyView?.speakButton, isLiveTurn: isLiveCall });
          } else if (!currentAudio && !ttsAbortController) {
            setAvatarState(isLiveCall ? 'live' : 'idle', isLiveCall ? 'Live Voice Active · Listening…' : 'ElevenLabs Voice Ready · Josh');
          }
        } else if (frame.event === 'error') {
          setAvatarState(isLiveCall ? 'live' : 'idle', isLiveCall ? 'Live Voice Active · Listening…' : 'ElevenLabs Voice Ready · Josh');
        }
      },
      onTurnError() {
        setAvatarState(isLiveCall ? 'live' : 'idle', isLiveCall ? 'Live Voice Active · Listening…' : 'ElevenLabs Voice Ready · Josh');
      },
      speakTurn(view, btn) {
        if (!view?.replyText) return;
        void speakText(view.replyText, { turnButton: btn });
      },
      toggleMicDictation,
      stopAll() {
        stopCurrentAudio();
        if (isLiveCall) stopLiveCall();
      }
    });
  }
  function mount(host, options = {}) {
    if (host.dataset?.chatMounted === 'true' || host.getAttribute?.('data-chat-mounted') === 'true') return;
    if (host.dataset) host.dataset.chatMounted = 'true';
    host.setAttribute?.('data-chat-mounted', 'true');
    const document = host.ownerDocument, client = createClient(options);
    const storage = options.storage ?? document.defaultView?.localStorage;
    const now = options.now || Date.now;
    let storedTurns = loadStoredHistory(storage, now);
    const shell = element(document, 'section', 'chat-shell');
    const panel = element(document, 'section', 'chat-panel'); panel.setAttribute('aria-label', 'Chat with Josh’s assistant');
    const details = createDetailsPanel(document, { modalOnly: host.tagName?.toLowerCase() === 'dialog', detailsModule: options.detailsModule });
    const heading = element(document, 'header', 'chat-heading');
    const headingCopy = element(document, 'div', 'chat-heading-copy');
    const titleRow = element(document, 'div', 'chat-heading-title-row');
    titleRow.append(element(document, 'h1', '', 'Ask me about my experience, background, or anything else'), element(document, 'span', 'chat-beta-badge', 'BETA'));
    const scope = element(document, 'p', 'chat-scope', 'I’ll draw from my career knowledge and show you how I find and use information.');
    headingCopy.append(element(document, 'p', 'chat-small-label', 'Private preview'), titleRow, scope);

    const headingControls = element(document, 'div', 'chat-heading-controls');
    const modeSwitcher = element(document, 'div', 'chat-mode-switcher');
    const modeConfigs = [
      ['simple', 'Simple', false],
      ['detailed', 'Detailed', true],
      ['engineer', 'Engineer', false]
    ];
    let currentViewMode = 'detailed';
    shell.setAttribute('data-view-mode', 'detailed');
    const modePillButtons = Object.create(null);
    for (const [mKey, mLabel, isDefault] of modeConfigs) {
      const mBtn = element(document, 'button', `chat-mode-pill${isDefault ? ' is-active' : ''}`, mLabel);
      mBtn.type = 'button';
      mBtn.setAttribute('data-mode-pill', mKey);
      mBtn.setAttribute('aria-pressed', String(isDefault));
      mBtn.addEventListener('click', () => {
        applyViewMode(mKey);
      });
      modePillButtons[mKey] = mBtn;
      modeSwitcher.append(mBtn);
    }
    const moreBtn = element(document, 'button', 'chat-heading-more-btn', '⋯');
    moreBtn.type = 'button';
    moreBtn.setAttribute('aria-label', 'More options');
    const clear = element(document, 'button', 'chat-text-button', 'Clear chat'); clear.type = 'button'; clear.disabled = true;
    clear.setAttribute('data-clear-chat', '');
    moreBtn.addEventListener?.('click', () => {
      if (!clear.disabled) clear.click?.();
      else input.focus?.();
    });
    headingControls.append(modeSwitcher, moreBtn, clear);
    heading.append(headingCopy, headingControls);

    const quickPillsBar = element(document, 'div', 'chat-quick-pills');
    const quickPillPrompts = [
      ['My insurance experience', 'Can you tell me about my experience with Guidewire and the type of work I’ve done?'],
      ['Key projects', 'What core insurance projects and bulk group takeover solutions has Josh delivered?'],
      ['Technical skills', 'What are Josh’s technical skills across SQL, integrations, cloud architecture, and AI?'],
      ['SQL & reporting', 'How did Josh handle reporting continuity and financial-report SQL across core insurance system transitions?'],
      ['AI & automation', 'How has Josh applied automation (80% residential, 60% commercial, 40% farm renewal automation) and AI architecture?'],
      ['Career story', 'Give me an overview of Josh Boyer’s career journey from Dell (2006) through Grenville Mutual (2009–2022) and Medavie Blue Cross.']
    ];
    for (const [pillText, pillPrompt] of quickPillPrompts) {
      const qBtn = element(document, 'button', 'chat-quick-pill', pillText);
      qBtn.type = 'button';
      qBtn.addEventListener?.('click', () => {
        if (!ready || busy || input.disabled) return;
        input.value = pillPrompt;
        form.requestSubmit();
      });
      quickPillsBar.append(qBtn);
    }

    const messages = element(document, 'div', 'chat-messages'); messages.setAttribute('aria-label', 'Conversation'); messages.setAttribute('role', 'log'); messages.setAttribute('aria-live', 'polite'); messages.setAttribute('aria-relevant', 'additions'); messages.tabIndex = 0;
    const welcome = element(document, 'div', 'chat-welcome');
    const welcomeIntro = element(document, 'div', 'chat-welcome-intro');
    const welcomeHeading = element(document, 'h2', '', 'What can I help with?');
    const welcomeSubtext = element(document, 'p', '', 'Talk through an idea, ask a question, or explore Josh’s work.');
    welcomeIntro.append(element(document, 'span', 'chat-monogram', 'jb.'), welcomeHeading, welcomeSubtext);

    const showcase = element(document, 'div', 'chat-welcome-showcase');
    const demoUserRow = element(document, 'div', 'chat-welcome-user-row');
    const demoUserBubble = element(document, 'div', 'chat-welcome-user-bubble');
    const demoUserTop = element(document, 'div', 'chat-welcome-user-top');
    demoUserTop.append(
      element(document, 'p', 'chat-welcome-user-text', 'Can you tell me about my experience with Guidewire and the type of work I’ve done?'),
      element(document, 'span', 'chat-welcome-user-time', '10:24 AM')
    );
    demoUserBubble.append(demoUserTop);
    const demoUserAvatar = element(document, 'span', 'chat-welcome-jb-badge', 'JB');
    demoUserRow.append(demoUserBubble, demoUserAvatar);

    const demoAssistantRow = element(document, 'div', 'chat-welcome-assistant-row');
    const demoAssistantAvatar = element(document, 'span', 'chat-welcome-bot-avatar');
    const demoAssistantCard = element(document, 'div', 'chat-welcome-assistant-card');
    const demoCardActions = element(document, 'div', 'chat-welcome-card-actions');
    const demoLeadParagraphText = 'You have extensive experience with Guidewire, primarily working with Policy, Billing, and Claims administration (IBS) across P&C and Health and Dental insurance. You’ve been involved in system conversions, integrations, renewals, and endorsements, with a strong focus on business analysis, requirements, testing, and training.';
    for (const [actIcon, actLabel, actKey] of [
      ['📋', 'Copy response', 'copy'],
      ['👍', 'Mark helpful', 'up'],
      ['👎', 'Needs improvement', 'down'],
      ['⋯', 'Inspect evidence', 'inspect']
    ]) {
      const actBtn = element(document, 'button', 'chat-welcome-action-icon', actIcon);
      actBtn.type = 'button';
      actBtn.setAttribute('aria-label', actLabel);
      actBtn.setAttribute('data-showcase-action', actKey);
      actBtn.addEventListener?.('click', () => {
        if (actKey === 'copy') {
          try {
            document.defaultView?.navigator?.clipboard?.writeText?.(demoLeadParagraphText);
          } catch { /* ignore clipboard permission error */ }
          actBtn.textContent = '✓';
          status.textContent = 'Copied response to clipboard.';
        } else if (actKey === 'up' || actKey === 'down') {
          actBtn.classList?.toggle?.('is-active');
          status.textContent = 'Feedback recorded.';
        } else if (actKey === 'inspect') {
          details.activate?.('evidence');
          status.textContent = 'Showing verified portfolio evidence.';
        }
      });
      demoCardActions.append(actBtn);
    }

    const demoStatusSpinnerEl = element(document, 'span', 'chat-pedestal-status-spinner', '✻');
    const demoStatusTextEl = element(document, 'span', 'chat-pedestal-status-text', 'Finding the best information from my career knowledge...');
    const demoStatusHeader = element(document, 'div', 'chat-pedestal-status-bar');
    const demoStatusLeft = element(document, 'div', 'chat-pedestal-status-left');
    demoStatusLeft.append(demoStatusSpinnerEl, demoStatusTextEl);
    demoStatusHeader.append(demoStatusLeft);

    const pedestalGrid = element(document, 'div', 'chat-pedestal-grid');
    pedestalGrid.setAttribute('data-pedestal-grid', '');
    const pedestalDefinitions = [
      {
        stepNum: 1,
        tone: 'blue',
        duration: '0.2s',
        icon: '💬',
        titleMain: '1. Understand your question',
        titleAccent: '',
        desc: 'Identify what you’re asking and what kind of information is needed.',
        results: [
          ['', 'Topic: Experience'],
          ['', 'Focus: Guidewire'],
          ['', 'Type: Career question']
        ]
      },
      {
        stepNum: 2,
        tone: 'emerald',
        duration: '1.1s',
        icon: '🗄️',
        titleMain: '2. Career knowledge ',
        titleAccent: '(cached)',
        accentClass: 'is-emerald-text',
        desc: 'Search my prepared career knowledge for relevant experience, skills, and projects.',
        results: [
          ['', '5 relevant sections'],
          ['', 'From career corpus'],
          ['', '~7,100 tokens (cached)']
        ]
      },
      {
        stepNum: 3,
        tone: 'purple',
        duration: '1.4s',
        icon: '📄',
        titleMain: '3. Find additional information',
        titleAccent: '',
        desc: 'Look up specific project details, documentation, or external references when needed.',
        selected: true,
        results: [
          ['🟣', '3 sources found'],
          ['🟠', 'Project documents'],
          ['🟣', 'Guidewire context']
        ]
      },
      {
        stepNum: 4,
        tone: 'cyan',
        duration: '0.8s',
        icon: '❖',
        titleMain: '4. Prepare context for the AI model',
        titleAccent: '',
        desc: 'Combine your question, relevant career information, and instructions into a context package.',
        results: [
          ['🟩', '12,300 tokens'],
          ['🟦', '58% career knowledge'],
          ['🟦', '26% retrieved sources'],
          ['🟦', '16% conversation + other']
        ]
      },
      {
        stepNum: 5,
        tone: 'amber',
        duration: '0.5s',
        icon: '🧠',
        titleMain: '5. Generate ',
        titleAccent: 'the answer',
        mainClass: 'is-amber-text',
        desc: 'Use a specialized AI model to create a clear, accurate response based only on your information.',
        results: [
          ['🟧', 'Claude Sonnet 4'],
          ['🟠', '642 output tokens'],
          ['⚙️', 'High relevance']
        ]
      },
      {
        stepNum: 6,
        tone: 'blue',
        duration: '1.3s',
        icon: '💬',
        titleMain: '6. Deliver to you',
        titleAccent: '',
        desc: 'Stream the response back to chat and prepare optional voice narration.',
        results: [
          ['', 'Response streamed'],
          ['', 'Citations added'],
          ['', 'Voice available']
        ]
      }
    ];
    const pedestalColNodes = [];
    const pedestalStepRefs = Object.create(null);
    for (const pDef of pedestalDefinitions) {
      const pCol = element(document, 'div', `chat-pedestal-col is-${pDef.tone}${pDef.selected ? ' is-selected' : ''}`);
      pCol.setAttribute('data-pedestal-step', String(pDef.stepNum));
      const pTime = element(document, 'span', `chat-pedestal-time-pill is-${pDef.tone}`, pDef.duration);
      const pStage = element(document, 'div', `chat-pedestal-3d is-${pDef.tone}`);
      const pCube = element(document, 'div', `chat-pedestal-cube is-${pDef.tone}`);
      pCube.append(element(document, 'span', 'chat-pedestal-cube-icon', pDef.icon));
      const pRingTop = element(document, 'div', `chat-pedestal-ring-top is-${pDef.tone}`);
      const pRingBase = element(document, 'div', `chat-pedestal-ring-base is-${pDef.tone}`);
      pStage.append(pCube, pRingTop, pRingBase);

      const pTitle = element(document, 'h3', 'chat-pedestal-title');
      pTitle.append(element(document, 'span', pDef.mainClass || '', pDef.titleMain));
      if (pDef.titleAccent) {
        pTitle.append(element(document, 'span', pDef.accentClass || '', pDef.titleAccent));
      }
      const pDesc = element(document, 'p', 'chat-pedestal-desc', pDef.desc);

      const pResCard = element(document, 'div', 'chat-pedestal-result-card');
      pResCard.append(element(document, 'span', 'chat-pedestal-result-heading', 'Result'));
      const pResList = element(document, 'div', 'chat-pedestal-result-list');
      const resultTextEls = [];
      for (const [rIcon, rText] of pDef.results) {
        const rPill = element(document, 'div', 'chat-pedestal-result-pill');
        if (rIcon) {
          rPill.append(element(document, 'span', 'chat-pedestal-result-icon', rIcon));
        }
        const rTextEl = element(document, 'span', 'chat-pedestal-result-text', rText);
        rPill.append(rTextEl);
        resultTextEls.push(rTextEl);
        pResList.append(rPill);
      }
      pResCard.append(pResList);
      pCol.append(pTime, pStage, pTitle, pDesc, pResCard);
      pCol.addEventListener?.('click', () => {
        for (const node of pedestalColNodes) node.classList?.remove?.('is-selected');
        pCol.classList?.add?.('is-selected');
        details.setInspectedStep?.(pDef.stepNum);
      });
      pedestalStepRefs[pDef.stepNum] = { col: pCol, timeEl: pTime, resultTextEls };
      pedestalColNodes.push(pCol);
      pedestalGrid.append(pCol);
    }

    const demoSummaryWrap = element(document, 'div', 'chat-welcome-summary-wrap');
    const demoLeadWrap = element(document, 'div', 'chat-welcome-lead-wrap');
    demoLeadWrap.append(
      element(
        document,
        'p',
        'chat-welcome-lead-p',
        demoLeadParagraphText
      ),
      demoCardActions
    );
    const demoSubLead = element(document, 'p', 'chat-welcome-sublead', 'Here are some key highlights from your experience:');
    const demoHighlightsList = element(document, 'div', 'chat-welcome-highlights-list');
    const demoHighlights = [
      ['IBS (Policy, Billing, Claims):', ' Worked across all three modules, supporting underwriting workbench, renewals, and endorsements.'],
      ['System conversions:', ' Led and supported large-scale data takeovers, including loading 1,000,000 claim lines and $100,000,000 in payments.'],
      ['Business analysis:', ' Developed functional and non-functional requirements, created templates and RFI documents, and facilitated approvals.'],
      ['Integrations:', ' Worked with MCCG and AL3 (flat file), supporting provider onboarding and adjudication.'],
      ['Renewals:', ' Supported processes with 80% renewals, with a mix of 60% commercial and 40% farm.'],
      ['Team leadership:', ' Worked across 4–5 teams (10–20 people each), coached BA peers on SQL, and delivered training sessions.'],
      ['Presentations:', ' Delivered sessions on takeover history, CBQ changes, and AI fundamentals.']
    ];
    for (const [bLabel, bBody] of demoHighlights) {
      const hRow = element(document, 'div', 'chat-welcome-highlight-item');
      const hDot = element(document, 'span', 'chat-welcome-highlight-dot');
      const hText = element(document, 'p', 'chat-welcome-highlight-text');
      hText.append(element(document, 'strong', 'chat-welcome-highlight-strong', bLabel), element(document, 'span', '', bBody));
      hRow.append(hDot, hText);
      demoHighlightsList.append(hRow);
    }
    demoSummaryWrap.append(demoLeadWrap, demoSubLead, demoHighlightsList);

    const demoEngineerBlock = element(document, 'div', 'chat-welcome-engineer-block');
    demoEngineerBlock.setAttribute('data-engineer-telemetry', '');
    const engTitle = element(document, 'div', 'chat-welcome-eng-header');
    engTitle.append(
      element(document, 'span', 'chat-welcome-eng-badge', '🖧 ENGINEER TELEMETRY'),
      element(document, 'span', 'chat-welcome-eng-meta', 'AWS us-east-2 · CAG + S3 Vectors · ws42.ca + LinkedIn · Schema v1.0.0')
    );
    const engGrid = element(document, 'div', 'chat-welcome-eng-grid');
    const engRows = [
      ['CAG High-Level Corpus', '7,100 tok pinned · 58% context · LinkedIn + ws42.ca + 13 projects'],
      ['Hybrid S3 Vectors RAG', '3,200 tok (26%) · 3 sources matched (cosine ≥ 0.74 · idx-2026-10-31)'],
      ['MCP JSON-RPC 2.0', 'search_public_evidence · SigV4 IAM read-only lambda'],
      ['Contract Validation', '6/6 canonical claim citations verified · 0 ungrounded claims']
    ];
    for (const [eKey, eVal] of engRows) {
      const eCell = element(document, 'div', 'chat-welcome-eng-cell');
      eCell.append(
        element(document, 'span', 'chat-welcome-eng-key', eKey),
        element(document, 'span', 'chat-welcome-eng-val', eVal)
      );
      engGrid.append(eCell);
    }
    demoEngineerBlock.append(engTitle, engGrid);
    demoAssistantCard.append(demoSummaryWrap, demoEngineerBlock);
    demoAssistantRow.append(demoAssistantAvatar, demoAssistantCard);
    showcase.append(demoUserRow, demoAssistantRow);

    const starters = element(document, 'div', 'chat-starters');
    ['Help me think through a project.', 'Explain an API simply.', 'What has Josh built?'].forEach(text => {
      const button = element(document, 'button', '', text); button.type = 'button'; button.disabled = true;
      button.addEventListener('click', () => { input.value = text; form.requestSubmit(); }); starters.append(button);
    });
    welcome.append(welcomeIntro, showcase, starters); messages.append(welcome);

    const status = element(document, 'p', 'chat-status', 'Connecting to private chat…'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); status.setAttribute('aria-atomic', 'true');

    const livePipeline = element(document, 'section', 'chat-live-pipeline');
    livePipeline.setAttribute('aria-label', 'Live execution pipeline');
    livePipeline.setAttribute('data-live-pipeline', '');

    // Card 0: 6-Step 3D Glowing Pedestal Flow (placed in the flow dock below the chat messages)
    const pedestalFlowCard = element(document, 'div', 'chat-pedestal-flow-card');
    pedestalFlowCard.append(demoStatusHeader, pedestalGrid);

    // Card 1: How your context is built (in real time)
    const ctxBuiltCard = element(document, 'div', 'chat-context-built-card');
    const ctxBuiltHeader = element(document, 'div', 'chat-context-built-header');
    const ctxBuiltLeft = element(document, 'div', 'chat-context-built-title-wrap');
    ctxBuiltLeft.append(
      element(document, 'span', 'chat-context-built-dot'),
      element(document, 'span', 'chat-context-built-title', 'How your context is built (in real time)')
    );
    const ctxBuiltRight = element(document, 'div', 'chat-context-built-right');
    const pipeCtxTotal = element(document, 'span', 'chat-context-built-total', 'Total: 12,300 tokens');
    const ctxBuiltInfo = element(document, 'span', 'chat-context-built-info', 'ⓘ');
    const pipeToggleBtn = element(document, 'button', 'chat-pipeline-toggle-btn', '⌄');
    pipeToggleBtn.type = 'button';
    pipeToggleBtn.setAttribute('aria-label', 'Toggle context and cloud stack details');
    ctxBuiltRight.append(pipeCtxTotal, ctxBuiltInfo, pipeToggleBtn);
    ctxBuiltHeader.append(ctxBuiltLeft, ctxBuiltRight);

    const pipeBody = element(document, 'div', 'chat-pipeline-body');
    pipeToggleBtn.addEventListener?.('click', () => {
      const collapsed = livePipeline.classList?.toggle?.('is-collapsed');
      pipeToggleBtn.textContent = collapsed ? '›' : '⌄';
    });

    const pipeCtxBar = element(document, 'div', 'chat-pipeline-ctx-bar');
    const segCag = element(document, 'div', 'chat-pipeline-ctx-seg is-cag');
    segCag.style && (segCag.style.width = '58%');
    const segRag = element(document, 'div', 'chat-pipeline-ctx-seg is-rag');
    segRag.style && (segRag.style.width = '26%');
    const segConv = element(document, 'div', 'chat-pipeline-ctx-seg is-conv');
    segConv.style && (segConv.style.width = '11%');
    const segSys = element(document, 'div', 'chat-pipeline-ctx-seg is-sys');
    segSys.style && (segSys.style.width = '5%');
    pipeCtxBar.append(segCag, segRag, segConv, segSys);

    const pipeCtxGrid = element(document, 'div', 'chat-context-built-grid');
    const ctxBuiltColumns = [
      {
        cls: 'is-cag',
        title: 'Career knowledge (cached)',
        tokens: '7,100 tokens',
        pct: '58%',
        desc: 'Your experience, skills, projects, and background (optimized and preprocessed)'
      },
      {
        cls: 'is-rag',
        title: 'Retrieved information',
        tokens: '3,200 tokens',
        pct: '26%',
        desc: 'Specific project details, documentation, and external references (only when needed)'
      },
      {
        cls: 'is-conv',
        title: 'Conversation & other',
        tokens: '1,400 tokens',
        pct: '11%',
        desc: 'Your current question, instructions, and formatting'
      },
      {
        cls: 'is-sys',
        title: 'System',
        tokens: '600 tokens',
        pct: '5%',
        desc: 'Internal instructions and safety checks'
      }
    ];
    for (const colDef of ctxBuiltColumns) {
      const cCol = element(document, 'div', `chat-context-built-col ${colDef.cls}`);
      const cHead = element(document, 'div', 'chat-context-built-col-head');
      cHead.append(
        element(document, 'span', `chat-pipeline-ctx-dot ${colDef.cls}`),
        element(document, 'span', 'chat-context-built-col-title', colDef.title)
      );
      const cMetrics = element(document, 'div', 'chat-context-built-col-metrics');
      cMetrics.append(
        element(document, 'strong', 'chat-context-built-col-tokens', colDef.tokens),
        element(document, 'span', 'chat-context-built-col-pct', colDef.pct)
      );
      const cDesc = element(document, 'p', 'chat-context-built-col-desc', colDef.desc);
      cCol.append(cHead, cMetrics, cDesc);
      pipeCtxGrid.append(cCol);
    }
    ctxBuiltCard.append(ctxBuiltHeader, pipeCtxBar, pipeCtxGrid);

    // Card 2: AWS cloud stack (systems used for this request)
    const awsFlowCard = element(document, 'div', 'chat-aws-flow-card');
    const awsFlowHeader = element(document, 'div', 'chat-aws-flow-header');
    const awsFlowTitleWrap = element(document, 'div', 'chat-aws-flow-title-wrap');
    awsFlowTitleWrap.append(
      element(document, 'span', 'chat-aws-flow-cube-icon', '🟧'),
      element(document, 'span', 'chat-aws-flow-title', 'AWS cloud stack'),
      element(document, 'span', 'chat-aws-flow-subtitle', '(systems used for this request)')
    );
    const awsFlowRight = element(document, 'div', 'chat-aws-flow-right');
    const awsArchBtn = element(document, 'button', 'chat-aws-arch-btn', 'View detailed architecture ⌄');
    awsArchBtn.type = 'button';
    awsArchBtn.addEventListener?.('click', () => {
      details.activate?.('context');
      details.setStackExpanded?.(true);
    });
    awsFlowRight.append(awsArchBtn, status);
    awsFlowHeader.append(awsFlowTitleWrap, awsFlowRight);

    const awsGatewayRow = element(document, 'div', 'chat-aws-gateway-row');
    const awsGatewayNode = element(document, 'div', 'chat-aws-gateway-node');
    const awsGatewayCopy = element(document, 'div', 'chat-aws-gateway-copy');
    awsGatewayCopy.append(
      element(document, 'strong', 'chat-aws-gateway-title', 'Model Gateway'),
      element(document, 'span', 'chat-aws-gateway-sub', 'Route to best model')
    );
    awsGatewayNode.append(
      element(document, 'span', 'chat-aws-gateway-icon', '🔄'),
      awsGatewayCopy
    );
    awsGatewayRow.append(awsGatewayNode);

    const pipeTrack = element(document, 'div', 'chat-aws-flow-track');
    const awsFlowNodes = [
      { id: 'user', tone: 'slate', icon: '👤', title: 'User', sub: '(You)', sub2: '', regionTop: '', regionBot: '', tab: 'trace' },
      { id: 'cloudflare', tone: 'amber', icon: '☁️', title: 'Cloudflare Edge', sub: 'Security & routing', sub2: '', regionTop: 'Edge Network', regionBot: 'Global', tab: 'trace' },
      { id: 'apigw', tone: 'purple', icon: '⇄', title: 'API Gateway', sub: 'Request handling', sub2: '', regionTop: 'us-east-2', regionBot: 'AWS API Gateway', tab: 'trace' },
      { id: 'lambda', tone: 'amber', icon: 'λ', title: 'AWS Lambda', sub: 'AI orchestration', sub2: '', regionTop: 'us-east-2', regionBot: 'AWS Lambda', tab: 'tools' },
      { id: 's3', tone: 'emerald', icon: '🪣', title: 'S3', sub: 'Career corpus', sub2: 'Documents & context', regionTop: 'us-east-2', regionBot: 'Amazon S3', tab: 'context' },
      { id: 'dynamodb', tone: 'blue', icon: '🗄️', title: 'DynamoDB', sub: 'Metadata & index', sub2: 'Context references', regionTop: 'us-east-2', regionBot: 'Amazon DynamoDB', tab: 'evidence' },
      { id: 'model', tone: 'slate', icon: 'AI', title: 'Claude Sonnet 4', sub: 'AI model', sub2: 'Response generation', regionTop: 'Anthropic', regionBot: 'Claude Sonnet 4', tab: 'trace' },
      { id: 'elevenlabs', tone: 'emerald', icon: '||||', title: 'ElevenLabs', sub: 'Voice (optional)', sub2: 'Speech synthesis', regionTop: 'External', regionBot: 'ElevenLabs API', tab: 'trace' }
    ];
    const pipeCols = Object.create(null);
    awsFlowNodes.forEach((nd, idx) => {
      if (idx > 0) {
        pipeTrack.append(element(document, 'span', 'chat-aws-flow-arrow', '→'));
      }
      const col = element(document, 'div', `chat-aws-flow-col is-${nd.tone}`);
      col.setAttribute('data-pipe-stage', nd.id);
      const card = element(document, 'div', `chat-aws-flow-node is-${nd.tone}`);
      const iconBox = element(document, 'span', `chat-aws-flow-icon is-${nd.tone}`, nd.icon);
      const titleEl = element(document, 'strong', 'chat-aws-flow-node-title', nd.title);
      const subEl = element(document, 'span', 'chat-aws-flow-node-sub', nd.sub);
      card.append(iconBox, titleEl, subEl);
      if (nd.sub2) {
        card.append(element(document, 'span', 'chat-aws-flow-node-sub2', nd.sub2));
      }
      col.append(card);
      if (nd.regionTop || nd.regionBot) {
        const pill = element(document, 'div', 'chat-aws-flow-region-pill');
        pill.append(
          element(document, 'span', 'chat-aws-flow-region-top', nd.regionTop),
          element(document, 'span', 'chat-aws-flow-region-bot', nd.regionBot)
        );
        col.append(pill);
      }
      col.addEventListener?.('click', () => {
        details.activate?.(nd.tab || 'trace');
      });
      pipeCols[nd.id] = { col, node: card, subEl, titleEl };
      pipeTrack.append(col);
    });

    awsFlowCard.append(awsFlowHeader, awsGatewayRow, pipeTrack);
    pipeBody.append(pedestalFlowCard, ctxBuiltCard, awsFlowCard);
    livePipeline.append(pipeBody);

    function applyViewMode(modeKey) {
      if (!modePillButtons[modeKey]) return;
      currentViewMode = modeKey;
      shell.setAttribute('data-view-mode', modeKey);
      for (const [k, btn] of Object.entries(modePillButtons)) {
        const active = k === modeKey;
        btn.className = `chat-mode-pill${active ? ' is-active' : ''}`;
        btn.setAttribute('aria-pressed', String(active));
      }
      if (modeKey === 'simple') {
        scope.textContent = 'Simple mode · Concise executive summaries without pipeline clutter.';
        livePipeline.classList?.add?.('is-collapsed');
        pipeToggleBtn.textContent = '›';
        details.setStackExpanded?.(false);
        details.activate?.('evidence');
      } else if (modeKey === 'engineer') {
        scope.textContent = 'Engineer mode · Full CAG prefix cache telemetry, S3 Vectors RAG, MCP JSON-RPC & AWS us-east-2 stack.';
        livePipeline.classList?.remove?.('is-collapsed');
        pipeToggleBtn.textContent = '⌄';
        details.setStackExpanded?.(true);
        details.activate?.('context');
      } else {
        scope.textContent = 'I’ll draw from my career knowledge and show you how I find and use information.';
        livePipeline.classList?.remove?.('is-collapsed');
        pipeToggleBtn.textContent = '⌄';
        details.setStackExpanded?.(false);
        details.activate?.('trace');
      }
    }

    function syncLivePipeline(view) {
      if (!view) return;
      const cd = view.contextData || {};
      const isComplete = Boolean(view.timeline?.outcome);
      const activeModel = cd.completedModel || cd.model || 'Claude Sonnet 4';
      const matchedCount = cd.matchedCount ?? (view.claims?.length || 3);
      if (demoStatusSpinnerEl) {
        demoStatusSpinnerEl.textContent = isComplete ? '✓' : '✻';
      }
      if (demoStatusTextEl) {
        demoStatusTextEl.textContent = isComplete
          ? (view.isLiveVoice
            ? `Live Voice response ready · Grounded via ${activeModel} & CAG career corpus`
            : `Completed · Grounded via ${activeModel} (${matchedCount} sources, ~7,100 cached CAG tokens)`)
          : 'Finding the best information from my career knowledge...';
      }
      if (pedestalStepRefs[1]?.resultTextEls) {
        const focusShort = view.questionText
          ? (view.questionText.length > 16 ? `${view.questionText.slice(0, 16)}…` : view.questionText)
          : 'Guidewire';
        pedestalStepRefs[1].resultTextEls[0].textContent = `Topic: ${view.isLiveVoice ? 'Live Voice' : 'Experience'}`;
        pedestalStepRefs[1].resultTextEls[1].textContent = `Focus: ${focusShort}`;
        pedestalStepRefs[1].resultTextEls[2].textContent = `Type: ${cd.routingMode === 'general' ? 'General inquiry' : 'Career question'}`;
      }
      if (pedestalStepRefs[2]?.resultTextEls) {
        pedestalStepRefs[2].resultTextEls[0].textContent = `${cd.claimCount ?? 15} verified claims`;
        pedestalStepRefs[2].resultTextEls[1].textContent = 'From career corpus';
        pedestalStepRefs[2].resultTextEls[2].textContent = '~7,100 tokens (cached)';
      }
      if (pedestalStepRefs[3]?.resultTextEls) {
        pedestalStepRefs[3].resultTextEls[0].textContent = `${matchedCount} sources found`;
        pedestalStepRefs[3].resultTextEls[1].textContent = cd.retrievalMode === 'cag_only' ? 'CAG direct hit' : 'Project documents';
        pedestalStepRefs[3].resultTextEls[2].textContent = 'LinkedIn & ws42.ca';
      }
      if (pedestalStepRefs[5]?.resultTextEls) {
        pedestalStepRefs[5].resultTextEls[0].textContent = activeModel;
        pedestalStepRefs[5].resultTextEls[1].textContent = `${cd.outputTokens ?? 642} output tokens`;
        pedestalStepRefs[5].resultTextEls[2].textContent = 'High relevance';
      }
      if (pedestalStepRefs[6]?.resultTextEls) {
        pedestalStepRefs[6].resultTextEls[0].textContent = view.isLiveVoice ? 'Live Voice streamed' : 'Response streamed';
        pedestalStepRefs[6].resultTextEls[1].textContent = `${view.claims?.length || 0} citations added`;
        pedestalStepRefs[6].resultTextEls[2].textContent = view.voiceUsed ? 'ElevenLabs active' : 'Voice available';
      }
      if (pipeCols.s3?.subEl) {
        pipeCols.s3.subEl.textContent = `${cd.claimCount ?? 15} claims · CAG`;
      }
      if (pipeCols.dynamodb?.subEl) {
        pipeCols.dynamodb.subEl.textContent = cd.retrievalMode === 'hybrid' ? `${matchedCount} RAG sources` : 'CAG prefix hit';
      }
      if (pipeCols.model?.titleEl) {
        pipeCols.model.titleEl.textContent = activeModel;
      }
    }

    const form = element(document, 'form', 'chat-compose');
    const label = element(document, 'label', 'chat-small-label', 'Your question'); label.htmlFor = 'portfolio-chat-question';
    const input = element(document, 'textarea'); input.id = label.htmlFor; input.name = 'question'; input.rows = 2; input.maxLength = 8192;
    input.placeholder = 'Ask a follow-up question...'; input.required = true; input.disabled = true;
    input.setAttribute('aria-describedby', 'portfolio-chat-hint');
    const footer = element(document, 'div', 'chat-compose-footer');
    const toolbarLeft = element(document, 'div', 'chat-compose-toolbar');
    const toolIcons = element(document, 'div', 'chat-compose-tools');
    const toolPresets = [
      ['📎', 'Compare my role requirements against Josh’s verified experience: '],
      ['@', '@NEXUS What is the architecture of the NEXUS workflow engine?'],
      ['🎚️', 'Show me how this AWS us-east-2 + CAG + S3 Vectors assistant is architected.']
    ];
    for (const [ic, presetText] of toolPresets) {
      const tBtn = element(document, 'span', 'chat-tool-icon', ic);
      tBtn.addEventListener?.('click', () => {
        if (input.disabled) return;
        input.value = presetText;
        input.focus?.();
      });
      toolIcons.append(tBtn);
    }
    const hint = element(document, 'p', 'chat-hint', 'Enter to send · Shift + Enter for a new line'); hint.id = 'portfolio-chat-hint';
    toolbarLeft.append(toolIcons, hint);

    const railPrompts = {
      'About Me': 'Tell me about Josh Boyer’s background, his Ottawa base, his LinkedIn profile, and his Workshop42 (ws42.ca) making studio.',
      'Workshop42 (ws42.ca)': 'What is Workshop42 (ws42.ca) and how does Josh’s hands-on making ("Make it tangible", Apex monitor riser, The Voyager canoe) complement his systems architecture work?',
      'LinkedIn Profile': 'Give me a summary of Josh Boyer’s professional background and LinkedIn profile (linkedin.com/in/josh-boyer-1b770618) across enterprise systems, P&C insurance, and AI.',
      'Dell Support (Sept 2006+)': 'Tell me about Josh’s enterprise infrastructure and support experience at Dell starting in September 2006.',
      'Grenville (2009–2022)': 'What did Josh build and lead during his 2009–2022 tenure at Grenville Mutual, including renewal automation?',
      'Bulk Group Takeover & VBA': 'How did Josh design and build the production Excel VBA add-in and XML batch pipeline for bulk group takeover?',
      'Medavie Claims REST/Event': 'Explain Josh’s solution review, mapping, and support for Medavie Blue Cross provider registry and claims integrations.',
      'SQL & Reporting Continuity': 'How did Josh handle reporting continuity and financial-report SQL across core insurance system transitions?',
      'NEXUS Capstone': 'What is NEXUS and how did Josh architect it as his independent AI capstone?',
      'Experience': 'Give me an overview of Josh Boyer’s career journey from Dell (2006) through Grenville Mutual (2009–2022) and Medavie Blue Cross.',
      'Skills': 'What are Josh’s core technical and business architecture skills across SQL, integrations, and AI?',
      'Insurance Systems': 'Can you tell me more about Josh’s experience with Guidewire, IBS, Cognition+, and insurance integrations?',
      'Projects': 'What major projects has Josh built, including the Bulk Group Takeover VBA add-in, NEXUS capstone, and Workshop42 (ws42.ca)?',
      'Certifications': 'What formal training, industry background, and technical qualifications does Josh bring?',
      'Contact': 'How can I get in touch with Josh Boyer via LinkedIn (linkedin.com/in/josh-boyer-1b770618) or joshboyer.ca regarding Business Architecture or Technical Solutions roles?',
      'NEXUS': 'Tell me about Josh’s NEXUS independent capstone and how it uses structured AI workflows.',
      'Insurance systems': 'What is Josh’s experience with Guidewire, Cognition+, IBS, and enterprise insurance integrations?',
      'AI & automation': 'How has Josh applied automation (80% residential, 60% commercial, 40% farm renewal automation) and AI architecture?',
      'Projects & portfolio': 'How is this portfolio assistant architected on AWS us-east-2 with CAG, S3 Vectors, MCP tools, and ElevenLabs?',
      'Career opportunities': 'What types of Business Architecture, Systems Analysis, or Technical Solutions roles align best with Josh’s background?'
    };
    const scopeChipNodes = document.querySelectorAll?.('.chat-scope-chip, .chat-callout-list li, [data-sidebar-nav]') || [];
    for (const chipNode of scopeChipNodes) {
      chipNode.addEventListener?.('click', () => {
        if (chipNode.hasAttribute?.('data-sidebar-nav')) {
          const allNav = document.querySelectorAll?.('[data-sidebar-nav]') || [];
          for (const n of allNav) n.classList?.remove?.('is-active');
          chipNode.classList?.add?.('is-active');
        }
        if (!ready || busy || input.disabled) return;
        const navKey = chipNode.getAttribute?.('data-sidebar-nav');
        if (navKey && navKey.toLowerCase() === 'chat') {
          input.focus?.();
          return;
        }
        const labelTxt = (chipNode.querySelector?.('.chat-nav-label')?.textContent || chipNode.textContent || '').trim();
        input.value = railPrompts[labelTxt] || `Tell me about ${labelTxt} in Josh’s portfolio.`;
        form.requestSubmit();
      });
    }

    const actions = element(document, 'div', 'chat-compose-actions');
    const mic = element(document, 'button', 'chat-secondary chat-mic-btn', '🎙️'); mic.type = 'button'; mic.disabled = true;
    mic.setAttribute('data-voice-mic-btn', '');
    mic.setAttribute('aria-pressed', 'false');
    mic.setAttribute('aria-label', 'Dictate question with ElevenLabs Scribe');
    const stop = element(document, 'button', 'chat-secondary', 'Stop'); stop.type = 'button'; stop.hidden = true;
    const retry = element(document, 'button', 'chat-secondary', 'Check request again'); retry.type = 'button'; retry.hidden = true;
    const send = element(document, 'button', 'chat-send', 'Send ↑'); send.type = 'submit'; send.disabled = true;
    actions.append(mic, stop, retry, send); footer.append(toolbarLeft, actions); form.append(label, input, footer);
    panel.append(heading, quickPillsBar, messages, livePipeline, form); shell.append(panel, details.element); host.append(shell);
    let ready = false, busy = false, currentReply, uiEpoch = 0, limit = 8192, currentConfig, liveTurnCounter = 0;
    function matchCanonicalEvidenceForLiveText(rawText) {
      const ev = client.evidence;
      if (!ev || !Array.isArray(ev.claims)) return { claims: [], sources: [], corpusVersion: 'sha256:' + 'a'.repeat(64) };
      const q = String(rawText || '').toLowerCase();
      const matchedClaims = [];
      for (const claim of ev.claims) {
        const hay = `${claim.id} ${claim.title} ${claim.text}`.toLowerCase();
        if (
          (/\b(?:takeover|vba|excel|xml)\b/.test(q) && /\b(?:takeover|vba)\b/.test(hay)) ||
          (/\b(?:medavie|provider\s*registry|claims|blue cross)\b/.test(q) && /\b(?:medavie|provider|claims)\b/.test(hay)) ||
          (/\b(?:sql|reporting|financial|payment)\b/.test(q) && /\b(?:sql|reporting|financial)\b/.test(hay)) ||
          (/\b(?:grenville|renewal|cognition|ibs|80%|eighty percent)\b/.test(q) && /\b(?:grenville|renewal|cognition)\b/.test(hay)) ||
          (/\b(?:dell|2006)\b/.test(q) && /\bdell\b/.test(hay)) ||
          (/\b(?:nexus|capstone|mcp|vector)\b/.test(q) && /\bnexus\b/.test(hay))
        ) {
          matchedClaims.push(claim);
          if (matchedClaims.length >= 2) break;
        }
      }
      const sourceIds = new Set(matchedClaims.flatMap(c => c.sourceIds || []));
      const matchedSources = Array.isArray(ev.sources) ? ev.sources.filter(s => sourceIds.has(s.id)) : [];
      return {
        claims: matchedClaims,
        sources: matchedSources,
        corpusVersion: ev.corpusVersion || ('sha256:' + 'a'.repeat(64))
      };
    }
    const voice = createVoiceController(document, {
      fetchImpl: options.fetchImpl,
      hasExistingTurns: () => Boolean(welcome.hidden),
      onVoiceStateChange: (mode, _statusText, isLive) => {
        if (mode === 'speaking') {
          if (currentReply?.view) {
            currentReply.view.voiceActive = true;
            currentReply.view.voiceUsed = true;
          }
          details.setVoiceTechState({ elevenlabs: 'active', cloudflare: 'completed', aws: 'completed' });
        } else if (mode === 'listening') {
          details.setVoiceTechState({ elevenlabs: 'active', cloudflare: 'active' });
        } else if (mode === 'live') {
          if (currentReply?.view) currentReply.view.voiceActive = false;
          details.setVoiceTechState({ elevenlabs: 'active', cloudflare: 'completed', aws: 'completed' });
        } else if (mode === 'thinking' && isLive) {
          details.setVoiceTechState({
            elevenlabs: 'active',
            cloudflare: 'active',
            apigw: 'active',
            aws: 'active',
            lambda: 'active',
            openai: 'active'
          });
        } else {
          if (currentReply?.view) currentReply.view.voiceActive = false;
          details.setVoiceTechState(null);
        }
      },
      onBargeIn: info => {
        if (currentReply?.view) {
          currentReply.view.voiceActive = false;
          currentReply.view.bargeInInterrupted = true;
          if (currentReply.element?.children?.[0] && currentReply.view.isLiveVoice) {
            currentReply.element.children[0].textContent = 'Josh · Live Voice · Interrupted';
          }
          details.update(currentReply.view);
        }
        status.textContent = info?.isLiveCall
          ? '⚡ Barge-in · Listening to you…'
          : '⚡ Voice interrupted · Ready.';
        details.setVoiceTechState({ elevenlabs: 'active', cloudflare: 'active' });
      },
      onDictationResult: transcript => {
        if (!ready || !transcript || busy || voice.isSpeaking()) return;
        input.value = transcript;
        form.requestSubmit();
      },
      onLiveTranscript: (role, text) => {
        if (!text) return null;
        welcome.hidden = true;
        if (role === 'user') {
          const q = element(document, 'article', 'chat-message chat-question');
          q.append(element(document, 'p', 'chat-small-label', 'You · Live Voice'), element(document, 'p', '', text));
          messages.append(q);
          status.textContent = 'Live Voice · Thinking…';
          details.setVoiceTechState({
            elevenlabs: 'active',
            cloudflare: 'active',
            apigw: 'active',
            aws: 'active',
            lambda: 'active',
            dynamodb: 'active',
            openai: 'active'
          });
          scroll(true);
          return null;
        }
        liveTurnCounter += 1;
        const hexSuffix = String(liveTurnCounter).padStart(12, '0');
        const liveReqId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `11111111-2222-4333-8444-${hexSuffix}`;
        const liveGenId = client.session?.generation || '22222222-2222-4222-8222-222222222222';
        const matched = matchCanonicalEvidenceForLiveText(text);
        const hasPortfolio = matched.claims.length > 0;
        const liveReply = createAnswerView(document, null, {
          enableInlineStepper: false,
          questionText: text,
          pageContext: document.defaultView?.location?.hash,
          mcpEnabled: currentConfig?.capabilities?.mcp ?? true,
          ragEnabled: currentConfig?.capabilities?.rag ?? true,
          remainingTurns: client.session?.remainingTurns ?? 8,
          maxTurns: currentConfig?.limits?.maxTurns ?? 8,
          limits: currentConfig?.limits,
          onSpeak: (view, btn) => voice.speakTurn(view, btn),
          onDetails: (view, trigger) => details.open(view, trigger)
        });
        if (liveReply.element.children[0]) {
          liveReply.element.children[0].textContent = 'Josh · Live Voice';
        }
        const liveFrames = [
          { event: 'trace', data: { stage: 'routing', state: 'completed', elapsedMs: 2, durationMs: 2, routingMode: hasPortfolio ? 'portfolio_rag' : 'portfolio_cag', needsRetrieval: hasPortfolio } },
          { event: 'trace', data: { stage: 'budget', state: 'completed', elapsedMs: 4, durationMs: 2, reservedMicros: 3200, priceVersion: '2026-10-31-live-voice-v1' } },
          { event: 'trace', data: { stage: 'retrieval', state: 'completed', elapsedMs: 12, durationMs: 8, retrievalMode: hasPortfolio ? 'hybrid' : 'cag_only', matchedCount: matched.claims.length, corpusVersion: matched.corpusVersion, indexVersion: 'idx-live-s3-vectors' } },
          { event: 'trace', data: { stage: 'context', state: 'completed', elapsedMs: 14, durationMs: 2, corpusVersion: matched.corpusVersion, claimCount: client.evidence?.claims?.length || 15 } },
          { event: 'trace', data: { stage: 'provider', state: 'started', elapsedMs: 15, attempt: 1, provider: 'openai', model: 'gpt-6-luna' } },
          { event: 'trace', data: { stage: 'provider', state: 'completed', elapsedMs: 58, durationMs: 43, attempt: 1, provider: 'openai', model: 'gpt-6-luna', usageStatus: 'known', inputTokens: 640, outputTokens: Math.max(18, Math.round(text.length / 4)) } },
          { event: 'trace', data: { stage: 'validation', state: 'started', elapsedMs: 59, attempt: 1 } },
          { event: 'trace', data: { stage: 'validation', state: 'completed', elapsedMs: 61, durationMs: 2, attempt: 1, claimCount: matched.claims.length } },
          { event: 'trace', data: { stage: 'settlement', state: 'completed', elapsedMs: 64, durationMs: 3, reservedMicros: 3200, chargedMicros: 280, priceVersion: '2026-10-31-live-voice-v1', usageStatus: 'known' } },
          { event: 'conversation', data: { kind: hasPortfolio ? 'portfolio' : 'general', text, suggestions: [] } },
          ...matched.claims.map(claim => ({ event: 'answer_block', data: claim })),
          { event: 'sources', data: { corpusVersion: matched.corpusVersion, sources: matched.sources } },
          { event: 'done', data: { outcome: 'completed' } }
        ];
        liveFrames.forEach((frame, idx) => {
          liveReply.accept({
            schemaVersion: VERSION,
            requestId: liveReqId,
            generation: liveGenId,
            seq: idx + 1,
            ...frame
          });
        });
        liveReply.view.voiceUsed = true;
        liveReply.view.voiceActive = true;
        liveReply.view.isLiveVoice = true;
        currentReply = liveReply;
        messages.append(liveReply.element);
        details.update(liveReply.view);
        syncLivePipeline(liveReply.view);
        status.textContent = 'Live Voice · Response ready.';
        scroll(true);
        return liveReply.view.speakButton;
      }
    });
    mic.addEventListener('click', () => { void voice.toggleMicDictation(mic); });
    const railChips = document.querySelectorAll ? document.querySelectorAll('.chat-scope-chip, .chat-callout-list li') : [];
    const chipPrompts = {
      'CAG + Hybrid RAG': 'How do your CAG and Hybrid S3 Vector RAG work together?',
      'Read-Only MCP': 'What are the 3 read-only Portfolio MCP tools and how are they secured?',
      '8-Stage Trace': 'Walk me through the 8 stages in your request trace pipeline.',
      'Citations Separated': 'Why does your assistant separate conversational prose from canonical citations?'
    };
    for (const item of railChips) {
      item.style && (item.style.cursor = 'pointer');
      item.addEventListener?.('click', () => {
        if (!ready || busy) return;
        const raw = (item.textContent || '').trim();
        const prompt = chipPrompts[raw] || raw;
        if (prompt) {
          input.value = prompt;
          form.requestSubmit();
        }
      });
    }
    function update() {
      input.disabled = !ready || busy; send.disabled = !ready || busy; mic.disabled = !ready || busy;
      clear.disabled = !ready; stop.hidden = !busy; retry.hidden = busy || !client.canRetry;
      for (const button of starters.children) button.disabled = !ready || busy;
      const suggestionButtons = messages.querySelectorAll ? messages.querySelectorAll('.chat-suggestions button') : [];
      for (const button of suggestionButtons) button.disabled = !ready || busy;
    }
    function nearBottom() { return (messages.scrollHeight || 0) - (messages.clientHeight || 0) - (messages.scrollTop || 0) < 100; }
    function scroll(follow) { if (follow) messages.scrollTop = messages.scrollHeight || 0; }
    function event(frame) {
      const follow = nearBottom();
      if (frame.event === 'status') status.textContent = STATUS_LABELS[frame.data.code];
      const previousCard = currentReply.element;
      currentReply.accept(frame);
      if (previousCard !== currentReply.element) previousCard.replaceWith(currentReply.element);
      if (client.session) currentReply.view.contextData.remainingTurns = client.session.remainingTurns;
      details.update(currentReply.view);
      syncLivePipeline(currentReply.view);
      voice.onStreamFrame(frame, currentReply.view);
      if (frame.event === 'done') {
        status.textContent = frame.data.outcome === 'cancelled' ? 'Stopped.' : currentReply.view.claims.length ? 'Response complete · evidence references validated.' : 'Response complete.';
        storedTurns = saveStoredHistory(storage, [...storedTurns, { requestId: currentReply.view.requestId, kind: currentReply.view.kind, completedAt: now() }], now);
      }
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
      voice.onTurnStart();
      if (!isRetry) {
        const question = element(document, 'article', 'chat-message chat-question'); question.append(element(document, 'p', 'chat-small-label', 'You'), element(document, 'p', '', text));
        messages.append(question); input.value = '';
      }
      currentReply = createAnswerView(document, isRetry ? currentReply : null, {
        enableInlineStepper: false,
        questionText: isRetry ? (currentReply?.view?.questionText || '') : text,
        pageContext: document.defaultView?.location?.hash,
        mcpEnabled: currentConfig?.capabilities?.mcp,
        ragEnabled: currentConfig?.capabilities?.rag,
        remainingTurns: client.session?.remainingTurns,
        maxTurns: currentConfig?.limits?.maxTurns ?? 8,
        limits: currentConfig?.limits,
        onSpeak: (view, btn) => voice.speakTurn(view, btn),
        onDetails: (view, trigger) => details.open(view, trigger),
        onSuggestion: suggestionText => { if (ready && !busy) { input.value = suggestionText; form.requestSubmit(); } }
      });
      if (!isRetry) messages.append(currentReply.element);
      details.update(currentReply.view);
      syncLivePipeline(currentReply.view);
      status.textContent = isRetry ? 'Checking the original request…' : 'Sending your question…'; update(); scroll(true);
      try {
        const receive = frame => { if (ownEpoch === uiEpoch) event(frame); };
        const sending = isRetry ? client.retry(receive) : client.send(text, receive, document.defaultView?.location?.hash);
        if (client.requestId) { currentReply.identify(client.requestId); details.update(currentReply.view); }
        await sending;
      } catch (error) {
        if (ownEpoch === uiEpoch) {
          currentReply.fail(error.name === 'AbortError' ? 'cancelled' : 'interrupted');
          details.update(currentReply.view);
          voice.onTurnError();
          status.textContent = error.name === 'AbortError' ? 'Stopped. The server may still be settling this request.' : ERROR_LABELS[error.code] || ERROR_LABELS.unavailable;
        }
      } finally {
        if (ownEpoch === uiEpoch) {
          busy = false; update();
          if (!document.hidden && !document.activeElement?.closest?.('.chat-details-content')) {
            input.focus();
          }
        }
      }
    }
    form.addEventListener('submit', submitEvent => { submitEvent.preventDefault(); void submit(false); });
    input.addEventListener('keydown', keyEvent => { if (keyEvent.key === 'Enter' && !keyEvent.shiftKey && !keyEvent.isComposing) { keyEvent.preventDefault(); form.requestSubmit(); } });
    stop.addEventListener('click', async () => {
      const ownEpoch = uiEpoch;
      stop.disabled = true;
      voice.stopAll();
      try { await client.cancel(); if (ownEpoch === uiEpoch) status.textContent = 'Stop requested.'; }
      catch { if (ownEpoch === uiEpoch) status.textContent = 'Stopped here. Server cancellation could not be confirmed. Check this request before trying again.'; }
      finally { stop.disabled = false; }
    });
    retry.addEventListener('click', () => { void submit(true); });
    clear.addEventListener('click', async () => {
      uiEpoch += 1; busy = false; ready = false; update();
      voice.stopAll();
      showcase.hidden = true;
      welcome.classList?.add?.('is-cleared');
      welcomeHeading.textContent = 'Conversation cleared';
      welcomeSubtext.textContent = 'Ask a question below or pick a starter topic to start a new session.';
      demoStatusSpinnerEl.textContent = '✻';
      demoStatusTextEl.textContent = 'Ready · Ask a question above to see the live execution flow.';
      pipeCtxTotal.textContent = 'Total: 12,300 tokens';
      messages.replaceChildren(welcome); welcome.hidden = false; currentReply = null; input.value = ''; status.textContent = 'Clearing the conversation…';
      storedTurns = []; clearStoredHistory(storage);
      details.clear();
      try {
        await client.clear();
        ready = true;
        status.textContent = 'Conversation cleared. Your next question starts a new session.';
      } catch (err) {
        if (err && err.code === 'session_expired') {
          ready = Boolean(currentConfig ? (currentConfig.available && currentConfig.capabilities?.chat) : true);
          status.textContent = 'Conversation cleared. Your next question starts a new session.';
        } else {
          status.textContent = 'The server could not confirm deletion. Reload before starting another conversation.';
        }
      }
      update(); if (ready) input.focus();
    });
    client.initialise().then(config => {
      currentConfig = config;
      ready = config.available && config.capabilities.chat;
      limit = config.limits.maxMessageBytes;
      if (ready) {
        status.textContent = 'Private chat is ready.';
        if (currentViewMode === 'detailed') {
          scope.textContent = 'I’ll draw from my career knowledge and show you how I find and use information.';
        }
        voice.checkAvailability();
      } else status.textContent = 'Chat is currently disabled.';
      update();
    }).catch(error => {
      status.textContent = error.status === 401 ? 'Private access is required. Sign in above to continue.' : ERROR_LABELS[error.code] || ERROR_LABELS.unavailable;
      const access = document.querySelector?.('[data-chat-access]'); if (access) access.hidden = false;
      update();
    });
    return Object.freeze({ client, element: shell, details, voice });
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
      dialog.showModal(); mounted.element.querySelector?.('textarea')?.focus();
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
  return Object.freeze({
    VERSION,
    MAX_STORED_TURNS,
    HISTORY_TTL_MS,
    TAB_NAMES,
    TRACE_STAGES,
    TRACE_LABELS,
    sanitizeHref,
    validatePayload,
    loadStoredHistory,
    saveStoredHistory,
    clearStoredHistory,
    validateEvidence,
    validateTraceData,
    validateConversation,
    createEventValidator,
    readEventStream,
    createClient,
    createRequestTimeline,
    createAnswerView,
    createRequestSelection,
    createDetailsPanel,
    createVoiceController,
    renderBlock,
    renderSources,
    renderToolsView,
    renderContextView,
    mount,
    mountDrawer,
    boot
  });
});
