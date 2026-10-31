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
  function renderContextInto(document, section, state = {}) {
    const contextData = state?.contextData || {};
    const card = element(document, 'div', 'chat-context-card');
    const list = element(document, 'dl', 'chat-trace-facts chat-context-grid');
    function addRow(label, value, monospace = false) {
      list.append(element(document, 'dt', '', label), element(document, 'dd', monospace ? 'chat-trace-id' : '', value));
    }
    const modeLabel = state?.kind === 'general' ? 'General conversation'
      : state?.kind === 'portfolio' ? 'Portfolio-grounded'
      : state?.kind === 'clarification' ? 'Clarification'
      : state?.kind === 'refusal' ? 'Refusal'
      : state?.claims?.length ? 'Canonical portfolio evidence' : 'Pending';
    addRow('Response mode', modeLabel);
    if (contextData.routingMode) addRow('Routing mode', ROUTING_MODE_LABELS[contextData.routingMode] || contextData.routingMode);
    addRow('Page context', contextData.pageContext || 'None (standalone preview)', Boolean(contextData.pageContext));
    if (contextData.corpusVersion) addRow('Approved CAG corpus', contextData.corpusVersion, true);
    if (contextData.claimCount !== undefined) addRow('Approved claims', String(contextData.claimCount));
    const retrievalText = contextData.retrievalMode
      ? (RETRIEVAL_MODE_LABELS[contextData.retrievalMode] || contextData.retrievalMode)
      : state?.kind === 'general' ? 'Skipped for general conversation' : 'CAG context only';
    addRow('Retrieval status', retrievalText);
    if (contextData.indexVersion) addRow('Index version', contextData.indexVersion, true);
    if (contextData.matchedCount !== undefined) addRow('Matched evidence', String(contextData.matchedCount));
    if (contextData.remainingTurns !== undefined && contextData.maxTurns !== undefined) {
      addRow('Session turn allowance', `${contextData.remainingTurns} of ${contextData.maxTurns} turns remaining`);
    }
    card.append(list);
    section.replaceChildren(card);
    return section;
  }
  function renderContextView(document, state = {}) {
    const section = element(document, 'section', 'chat-request-context');
    return renderContextInto(document, section, state);
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
    const detailsButton = element(document, 'button', 'chat-view-details', 'View details'); detailsButton.type = 'button';
    detailsButton.setAttribute('aria-label', 'View request evidence and trace');
    detailsButton.setAttribute('data-turn-select', '');
    detailsButton.setAttribute('data-inspect-request', '');
    detailsButton.setAttribute('aria-pressed', 'false');
    actions.append(badgeRow, detailsButton);
    card.append(element(document, 'p', 'chat-small-label', 'Assistant'), body, suggestions, actions);
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
      detailsButton,
      requestId: null,
      turnId: null,
      kind: null,
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
            if (point.state === 'completed' && point.model) {
              current.contextData.completedModel = point.model;
              current.contextData.completedAttempt = point.attempt ?? 1;
            }
            if ((point.attempt ?? 1) > 1 || point.state === 'failed') current.degraded = true;
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
      paths: [
        { d: 'M12 2.5L20 7.1V16.4L12 21L4 16.4V7.1L12 2.5Z', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinejoin: 'round' },
        { d: 'M4 7.1L12 11.7L20 7.1M12 11.7V21', fill: 'none', stroke: 'currentColor', strokeWidth: '1.6', strokeLinejoin: 'round' }
      ]
    },
    {
      id: 'lambda',
      glyph: 'λ',
      name: 'AWS Lambda',
      role: 'Handler · Auth · MCP',
      paths: [
        { d: 'M7 4.5H10.6L17.5 19.5H13.9L11.6 14.2L9.1 19.5H5.7L9.9 10.8L7 4.5Z', fill: 'currentColor' }
      ]
    },
    {
      id: 's3',
      glyph: 'S3',
      name: 'S3 & S3 Vectors',
      role: '1536-d Vector Index',
      paths: [
        { d: 'M5.5 6.5C5.5 4.8 8.4 3.5 12 3.5C15.6 3.5 18.5 4.8 18.5 6.5L17 17.5C17 19.2 14.8 20.5 12 20.5C9.2 20.5 7 19.2 7 17.5L5.5 6.5Z', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinejoin: 'round' },
        { d: 'M5.5 6.5C5.5 8.2 8.4 9.5 12 9.5C15.6 9.5 18.5 8.2 18.5 6.5', fill: 'none', stroke: 'currentColor', strokeWidth: '1.6' }
      ]
    },
    {
      id: 'dynamodb',
      glyph: 'DB',
      name: 'Amazon DynamoDB',
      role: 'Sessions & $25 Ledger',
      paths: [
        { d: 'M4.5 6.5C4.5 4.8 7.9 3.5 12 3.5C16.1 3.5 19.5 4.8 19.5 6.5V17.5C19.5 19.2 16.1 20.5 12 20.5C7.9 20.5 4.5 19.2 4.5 17.5V6.5Z', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8' },
        { d: 'M4.5 12C4.5 13.7 7.9 15 12 15C16.1 15 19.5 13.7 19.5 12', fill: 'none', stroke: 'currentColor', strokeWidth: '1.6' },
        { d: 'M13.2 7.2L10.2 12.2H13L11.2 16.8', fill: 'none', stroke: 'currentColor', strokeWidth: '1.6', strokeLinecap: 'round', strokeLinejoin: 'round' }
      ]
    },
    {
      id: 'apigw',
      glyph: 'API',
      name: 'API Gateway',
      role: 'REST + AWS_IAM Route',
      paths: [
        { d: 'M7.5 7L3.5 12L7.5 17M16.5 7L20.5 12L16.5 17', fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' },
        { d: 'M13.5 5.5L10.5 18.5', fill: 'none', stroke: 'currentColor', strokeWidth: '1.7', strokeLinecap: 'round' }
      ]
    },
    {
      id: 'secrets',
      glyph: 'IAM',
      name: 'Secrets & SSM',
      role: 'Keyring & Pointers',
      paths: [
        { d: 'M12 2.8L19 5.8V11.4C19 16 15.9 19.7 12 21.2C8.1 19.7 5 16 5 11.4V5.8L12 2.8Z', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinejoin: 'round' },
        { d: 'M12 9.5C10.9 9.5 10 10.4 10 11.5C10 12.3 10.5 13 11.2 13.3V15.8H12.8V13.3C13.5 13 14 12.3 14 11.5C14 10.4 13.1 9.5 12 9.5Z', fill: 'currentColor' }
      ]
    },
    {
      id: 'cloudflare',
      glyph: 'CF',
      name: 'Cloudflare Edge',
      role: 'Worker & AI Gateway',
      paths: [
        { d: 'M6.8 17.5H17.8C19.8 17.5 21.2 16.1 21.2 14.2C21.2 12.4 19.9 11 18.1 10.9C17.5 7.9 14.9 5.8 11.8 5.8C8.9 5.8 6.4 7.7 5.7 10.4C3.9 10.7 2.8 12.2 2.8 14C2.8 16 4.5 17.5 6.8 17.5Z', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinejoin: 'round' }
      ]
    },
    {
      id: 'mcp',
      glyph: 'MCP',
      name: 'Portfolio MCP',
      role: 'JSON-RPC · 3 Tools',
      paths: [
        { d: 'M12 6.5V12M12 12L7.2 16.2M12 12L16.8 16.2', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round' },
        { d: 'M12 4.5C13.1 4.5 14 5.4 14 6.5C14 7.6 13.1 8.5 12 8.5C10.9 8.5 10 7.6 10 6.5C10 5.4 10.9 4.5 12 4.5ZM6 15.5C7.1 15.5 8 16.4 8 17.5C8 18.6 7.1 19.5 6 19.5C4.9 19.5 4 18.6 4 17.5C4 16.4 4.9 15.5 6 15.5ZM18 15.5C19.1 15.5 20 16.4 20 17.5C20 18.6 19.1 19.5 18 19.5C16.9 19.5 16 18.6 16 17.5C16 16.4 16.9 15.5 18 15.5Z', fill: 'currentColor' }
      ]
    },
    {
      id: 'openai',
      glyph: 'AI',
      name: 'OpenAI Primary',
      role: 'Luna + 1536-d Embed',
      paths: [
        { d: 'M12 3L14.2 9.8L21 12L14.2 14.2L12 21L9.8 14.2L3 12L9.8 9.8L12 3Z', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinejoin: 'round' }
      ]
    },
    {
      id: 'anthropic',
      glyph: 'CL',
      name: 'Anthropic Guard',
      role: 'Haiku 5.5 Fallback',
      paths: [
        { d: 'M8.5 18.5L12 5.5L15.5 18.5M6.2 18.5L9.8 5.5M14.2 5.5L17.8 18.5M7.8 14.5H16.2', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }
      ]
    }
  ]);
  function createTechIconNode(document, item) {
    const iconWrap = element(document, 'span', `chat-tech-icon is-${item.id}`);
    iconWrap.setAttribute('aria-hidden', 'true');
    if (typeof document.createElementNS === 'function' && Array.isArray(item.paths)) {
      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', '15');
      svg.setAttribute('height', '15');
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
  function createTechStackFooter(document) {
    const section = element(document, 'section', 'chat-tech-stack');
    section.setAttribute('aria-label', 'Solution architecture and cloud stack');
    section.setAttribute('data-chat-tech-stack', '');
    const header = element(document, 'div', 'chat-tech-stack-header');
    const title = element(document, 'span', 'chat-tech-stack-title', 'Solution stack');
    const badge = element(document, 'span', 'chat-tech-stack-region', 'AWS us-east-2 · Cloudflare · MCP');
    header.append(title, badge);
    const grid = element(document, 'ul', 'chat-tech-stack-grid');
    for (const item of TECH_STACK_ITEMS) {
      const li = element(document, 'li', 'chat-tech-stack-item');
      li.setAttribute('data-tech-service', item.id);
      const iconWrap = createTechIconNode(document, item);
      const copyWrap = element(document, 'div', 'chat-tech-copy');
      copyWrap.append(
        element(document, 'span', 'chat-tech-name', item.name),
        element(document, 'span', 'chat-tech-role', item.role)
      );
      li.append(iconWrap, copyWrap);
      grid.append(li);
    }
    section.append(header, grid);
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
    const close = element(document, 'button', 'chat-details-close', 'Close details'); close.type = 'button';
    close.setAttribute('data-chat-drawer-close', '');
    heading.append(title, close);
    const identity = element(document, 'p', 'chat-details-identity', 'Choose a response to inspect its evidence and activity.');
    identity.setAttribute('data-chat-selected-turn', '');
    const pinBanner = element(document, 'div', 'chat-details-pin-banner');
    pinBanner.hidden = true;
    const pinLabel = element(document, 'span', '', 'Viewing pinned turn — ');
    const returnLatestBtn = element(document, 'button', '', 'Return to latest');
    returnLatestBtn.type = 'button';
    returnLatestBtn.setAttribute('data-return-latest', '');
    returnLatestBtn.setAttribute('data-follow-latest', '');
    pinBanner.append(pinLabel, returnLatestBtn);
    const tabs = element(document, 'div', 'chat-details-tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Request details');
    const panels = {}, buttons = {};
    let activeTab = tabList.includes(options.defaultTab) ? options.defaultTab : tabList[0];
    let returnFocus;
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
    const techStack = createTechStackFooter(document);
    content.append(heading, identity, pinBanner, tabs, ...tabList.map(name => panels[name]), techStack);
    desktop.append(content);
    document.body.append(dialog);

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

    function render() {
      const view = selection.selected;
      pinBanner.hidden = !selection.pinned;
      identity.textContent = view?.requestId
        ? `${selection.pinned ? 'Pinned · ' : ''}Request ${view.requestId}`
        : 'Choose a response to inspect its evidence and activity.';
      syncTurnButtons();
      if (panels.trace) {
        panels.trace.replaceChildren(view?.timeline?.element || element(document, 'p', 'chat-details-empty', 'Select a response to see the stages reported for that request.'));
      }
      if (panels.evidence) {
        panels.evidence.replaceChildren(view?.evidence || element(document, 'p', 'chat-details-empty', 'Selected portfolio evidence will appear here. General responses may have no portfolio references.'));
      }
      if (panels.tools) {
        panels.tools.replaceChildren(view ? (view.tools || renderToolsView(document, view)) : element(document, 'p', 'chat-details-empty', 'Select a response to inspect any portfolio MCP tool calls.'));
      }
      if (panels.context) {
        panels.context.replaceChildren(view ? (view.context || renderContextView(document, view)) : element(document, 'p', 'chat-details-empty', 'Select a response to inspect its approved context and routing state.'));
      }
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
      update(view) {
        registerView(view);
        selection.update(view);
        render();
        notifyExternal();
      },
      open(view, trigger) {
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
        knownViews.length = 0;
        selection.clear();
        render();
        externalController?.clear?.();
        if (dialog.open) dialog.close();
      },
      get selected() { return selection.selected; },
      get pinned() { return selection.pinned; },
      get activeTab() { return activeTab; }
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
    let ready = false, busy = false, currentReply, uiEpoch = 0, limit = 8192, currentConfig;
    function update() {
      input.disabled = !ready || busy; send.disabled = !ready || busy;
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
      if (!isRetry) {
        const question = element(document, 'article', 'chat-message chat-question'); question.append(element(document, 'p', 'chat-small-label', 'You'), element(document, 'p', '', text));
        messages.append(question); input.value = '';
      }
      currentReply = createAnswerView(document, isRetry ? currentReply : null, {
        pageContext: document.defaultView?.location?.hash,
        mcpEnabled: currentConfig?.capabilities?.mcp,
        ragEnabled: currentConfig?.capabilities?.rag,
        remainingTurns: client.session?.remainingTurns,
        maxTurns: currentConfig?.limits?.maxTurns ?? 8,
        limits: currentConfig?.limits,
        onDetails: (view, trigger) => details.open(view, trigger),
        onSuggestion: suggestionText => { if (ready && !busy) { input.value = suggestionText; form.requestSubmit(); } }
      });
      if (!isRetry) messages.append(currentReply.element);
      details.update(currentReply.view);
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
          status.textContent = error.name === 'AbortError' ? 'Stopped. The server may still be settling this request.' : ERROR_LABELS[error.code] || ERROR_LABELS.unavailable;
        }
      } finally {
        if (ownEpoch === uiEpoch) {
          busy = false; update();
          if (!document.hidden && !document.activeElement?.closest?.('.chat-details-content')) input.focus();
        }
      }
    }
    form.addEventListener('submit', submitEvent => { submitEvent.preventDefault(); void submit(false); });
    input.addEventListener('keydown', keyEvent => { if (keyEvent.key === 'Enter' && !keyEvent.shiftKey && !keyEvent.isComposing) { keyEvent.preventDefault(); form.requestSubmit(); } });
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
      storedTurns = []; clearStoredHistory(storage);
      details.clear();
      try { await client.clear(); ready = true; status.textContent = 'Conversation cleared. Your next question starts a new session.'; }
      catch { status.textContent = 'The server could not confirm deletion. Reload before starting another conversation.'; }
      update(); if (ready) input.focus();
    });
    client.initialise().then(config => {
      currentConfig = config;
      ready = config.available && config.capabilities.chat;
      limit = config.limits.maxMessageBytes;
      if (ready) {
        status.textContent = 'Private chat is ready.';
        scope.textContent = 'General help, with Josh’s public portfolio when it is relevant. Details stay beside the conversation.';
      } else status.textContent = 'Chat is currently disabled.';
      update();
    }).catch(error => {
      status.textContent = error.status === 401 ? 'Private access is required. Sign in above to continue.' : ERROR_LABELS[error.code] || ERROR_LABELS.unavailable;
      const access = document.querySelector?.('[data-chat-access]'); if (access) access.hidden = false;
      update();
    });
    return Object.freeze({ client, element: shell, details });
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
    renderBlock,
    renderSources,
    renderToolsView,
    renderContextView,
    mount,
    mountDrawer,
    boot
  });
});
