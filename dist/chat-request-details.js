/* Private portfolio chat request details panel (Trace, Evidence, Tools, Context). */
(function (root, factory) {
  'use strict';
  const api = factory();
  root.PortfolioChatDetails = api;
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(globalThis, function () {
  'use strict';

  const VERSION = '1.0.0';
  const TABS = Object.freeze(['trace', 'evidence', 'tools', 'context']);
  const TAB_NAMES = TABS;
  const TAB_TITLES = Object.freeze({
    trace: 'Trace',
    evidence: 'Evidence',
    tools: 'Tools',
    context: 'Context'
  });

  const CANONICAL_STAGE_ORDER = Object.freeze([
    'routing',
    'retrieval',
    'mcp',
    'context',
    'budget',
    'provider',
    'validation',
    'settlement'
  ]);

  const STAGE_LABELS = Object.freeze({
    routing: 'Request routing',
    retrieval: 'Hybrid retrieval',
    mcp: 'Portfolio MCP tools',
    context: 'Approved context',
    budget: 'Spending reservation',
    provider: 'Model request',
    validation: 'Answer validation',
    settlement: 'Usage settlement'
  });

  const TRACE_STAGES = Object.freeze({
    routing: Object.freeze({
      label: STAGE_LABELS.routing,
      explanation: 'Classifies the request mode and whether retrieval or portfolio tools are required.'
    }),
    retrieval: Object.freeze({
      label: STAGE_LABELS.retrieval,
      explanation: 'Searches the versioned public portfolio index when evidence retrieval is needed.'
    }),
    mcp: Object.freeze({
      label: STAGE_LABELS.mcp,
      explanation: 'Invokes read-only portfolio MCP tools over authenticated internal transport.'
    }),
    context: Object.freeze({
      label: STAGE_LABELS.context,
      explanation: 'The versioned public evidence supplied with this question.'
    }),
    budget: Object.freeze({
      label: STAGE_LABELS.budget,
      explanation: 'An allowance is held before a paid model request can start.'
    }),
    provider: Object.freeze({
      label: STAGE_LABELS.provider,
      explanation: 'Provider activity reported by the backend. Timing covers the Gateway and model together.'
    }),
    validation: Object.freeze({
      label: STAGE_LABELS.validation,
      explanation: 'The selected claims are checked against the approved public evidence.'
    }),
    settlement: Object.freeze({
      label: STAGE_LABELS.settlement,
      explanation: 'Reported usage is reconciled with the reserved allowance.'
    })
  });

  const TRACE_STATES = Object.freeze({
    started: 'Started',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
    skipped: 'Skipped'
  });

  const TRACE_FIELDS = Object.freeze([
    'stage', 'state', 'elapsedMs', 'durationMs', 'attempt', 'provider', 'model',
    'corpusVersion', 'claimCount', 'routingMode', 'needsRetrieval', 'requestedTools',
    'indexVersion', 'retrievalMode', 'embeddingModel', 'matchedCount',
    'toolCallId', 'toolName', 'mcpMethod', 'toolOutcome',
    'reservedMicros', 'chargedMicros', 'priceVersion', 'usageStatus',
    'inputTokens', 'outputTokens', 'cacheReadInputTokens', 'cacheWriteInputTokens',
    'reasoningOutputTokens', 'providerRequestId', 'gatewayRequestId', 'code', 'replayed'
  ]);

  const TOKEN_FIELDS = Object.freeze({
    inputTokens: 'Input tokens',
    outputTokens: 'Output tokens',
    cacheReadInputTokens: 'Cache read tokens',
    cacheWriteInputTokens: 'Cache write tokens',
    reasoningOutputTokens: 'Reasoning tokens'
  });

  const ERROR_CODES = Object.freeze([
    'unavailable', 'invalid_request', 'session_expired', 'rate_limited',
    'budget_exhausted', 'deadline_exceeded', 'upstream_failure',
    'validation_failed', 'request_conflict'
  ]);

  const ERROR_LABELS = Object.freeze({
    unavailable: 'Chat is unavailable. Try again later.',
    invalid_request: 'Check your question and try again.',
    session_expired: 'This conversation has expired. Clear it to start again.',
    rate_limited: 'The chat limit has been reached. Please wait before trying again.',
    budget_exhausted: 'The chat spending allowance has been reached. Please try again later.',
    deadline_exceeded: 'The answer took too long. You can check this request again.',
    upstream_failure: 'The model service could not finish this request.',
    validation_failed: 'The answer could not be verified against the approved evidence.',
    request_conflict: 'This request is already running or cannot be repeated with different text.'
  });

  const ALLOWED_TOOLS = Object.freeze([
    'search_public_evidence',
    'get_case_study',
    'compare_job_requirements'
  ]);

  const ALLOWED_ROUTING_MODES = Object.freeze([
    'general',
    'portfolio_cag',
    'portfolio_rag',
    'portfolio_mcp'
  ]);

  const ALLOWED_RETRIEVAL_MODES = Object.freeze([
    'hybrid',
    'deterministic_only',
    'deterministic',
    'cag_only',
    'degraded',
    'skipped',
    'none',
    'completed'
  ]);

  const ALLOWED_DEGRADED_REASONS = Object.freeze([
    'retrieval_degraded',
    'tools_unavailable',
    'provider_fallback',
    'unsupported_evidence',
    'limited_evidence',
    'rate_limited',
    'budget_exhausted',
    'deadline_exceeded',
    'upstream_failure',
    'validation_failed',
    'degraded'
  ]);

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const CORPUS_SHA = /^sha256:[0-9a-f]{64}$/;
  const SAFE_ID = /^[A-Za-z0-9._:-]{1,128}$/;
  const TOOL_CALL_ID = /^tool-[a-zA-Z0-9_-]{1,64}$/;
  const SOURCE_URL = /^https:\/\/joshboyer\.ca\/(?:index\.html)?#projects\/(?:dell|foundations|headquarters|inquiry|workflows|newbusiness|renewals|upload|claims|takeover|continuity|sql|nexus)$/;
  const SECRET_OR_CANARY_PATTERN = /\b(?:sk-(?:proj-|live_)?[A-Za-z0-9_-]{16,}|AKIA[A-Z0-9]{16}|gh[pousr]_[A-Za-z0-9]{20,}|Bearer\s+[A-Za-z0-9._~+/=-]+|CANARY[_-][A-Za-z0-9_-]+)\b/gi;

  const controllersByContainer = new WeakMap();

  function record(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function integer(value, min, max) {
    return Number.isSafeInteger(value) && value >= min && value <= max;
  }

  function fail(code = 'validation_failed', status = 0) {
    const error = new Error(ERROR_LABELS[code] || ERROR_LABELS.unavailable);
    error.code = code;
    error.status = status;
    throw error;
  }

  function safeGet(obj, key) {
    if (!obj || typeof obj !== 'object') return undefined;
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') return undefined;
    try {
      if (Object.prototype.hasOwnProperty.call(obj, key) || key in obj) {
        return obj[key];
      }
    } catch {
      return undefined;
    }
    return undefined;
  }

  function redactSecrets(text) {
    return String(text).replace(SECRET_OR_CANARY_PATTERN, '[REDACTED]');
  }

  function stripControlChars(str, singleLine = false) {
    let out = '';
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (singleLine && (code < 32 || code === 127 || code === 0x2028 || code === 0x2029)) {
        out += ' ';
      } else if (!singleLine && ((code >= 0 && code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127)) {
        continue;
      } else {
        out += str[i];
      }
    }
    return out;
  }

  function hasDisallowedUrlChar(str) {
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code <= 32 || code === 127 || code === 92) return true;
    }
    return /\s/.test(str);
  }

  function cleanText(value, fallback = '', maxLength = 4096) {
    if (typeof value !== 'string') return fallback;
    const withoutNul = stripControlChars(value, false);
    const redacted = redactSecrets(withoutNul).trim();
    if (!redacted) return fallback;
    return redacted.slice(0, maxLength);
  }

  function cleanSingleLine(value, fallback = '', maxLength = 256) {
    if (typeof value !== 'string') return fallback;
    const single = stripControlChars(value, true);
    const redacted = redactSecrets(single).trim();
    if (!redacted) return fallback;
    return redacted.slice(0, maxLength);
  }

  function cleanId(value, fallback = 'unassigned') {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    if (!trimmed || SECRET_OR_CANARY_PATTERN.test(trimmed)) {
      SECRET_OR_CANARY_PATTERN.lastIndex = 0;
      return fallback;
    }
    SECRET_OR_CANARY_PATTERN.lastIndex = 0;
    if (UUID.test(trimmed) || CORPUS_SHA.test(trimmed) || SAFE_ID.test(trimmed)) {
      return trimmed;
    }
    return fallback;
  }

  function cleanEnum(value, allowed, fallback) {
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim().toLowerCase();
    return allowed.includes(normalized) ? normalized : fallback;
  }

  function normalizeStageStatus(rawStatus) {
    if (typeof rawStatus !== 'string') return 'skipped';
    const lower = rawStatus.trim().toLowerCase();
    if (lower === 'ok' || lower === 'completed' || lower === 'complete' || lower === 'success') return 'ok';
    if (lower === 'degraded' || lower === 'warning' || lower === 'fallback' || lower === 'partial') return 'degraded';
    if (lower === 'skipped' || lower === 'omitted' || lower === 'not_applicable') return 'skipped';
    if (lower === 'failed' || lower === 'error' || lower === 'cancelled' || lower === 'timeout') return 'failed';
    if (lower === 'started' || lower === 'running') return 'ok';
    return 'skipped';
  }

  function normalizeToolStatus(rawStatus) {
    if (typeof rawStatus !== 'string') return 'ok';
    const lower = rawStatus.trim().toLowerCase();
    if (lower === 'ok' || lower === 'completed' || lower === 'success') return 'ok';
    if (lower === 'running' || lower === 'started') return 'running';
    if (lower === 'timeout' || lower === 'timed_out') return 'timeout';
    if (lower === 'error' || lower === 'failed') return 'error';
    if (lower === 'skipped') return 'skipped';
    return 'ok';
  }

  function sanitizeCitationUrl(rawUrl) {
    if (typeof rawUrl !== 'string') return null;
    const trimmed = rawUrl.trim();
    if (!trimmed || trimmed.length > 256) return null;
    if (hasDisallowedUrlChar(trimmed)) return null;
    if (SECRET_OR_CANARY_PATTERN.test(trimmed)) {
      SECRET_OR_CANARY_PATTERN.lastIndex = 0;
      return null;
    }
    SECRET_OR_CANARY_PATTERN.lastIndex = 0;
    if (trimmed.startsWith('/')) {
      if (trimmed.startsWith('//')) return null;
      return trimmed;
    }
    if (trimmed.startsWith('#projects/')) {
      return '/' + trimmed;
    }
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'https:') return null;
      if (parsed.username || parsed.password) return null;
      if (!parsed.hostname || parsed.hostname === 'localhost') return null;
      return parsed.href;
    } catch {
      return null;
    }
  }

  function setAttr(node, name, value) {
    const str = String(value);
    if (typeof node.setAttribute === 'function') {
      node.setAttribute(name, str);
    } else if (node.attributes) {
      node.attributes[name] = str;
    }
    if (name === 'id') node.id = str;
    if (name === 'class') node.className = str;
    if (name.startsWith('data-')) {
      const camel = name.slice(5).replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
      try {
        if (!node.dataset || typeof node.dataset !== 'object') {
          node.dataset = Object.create(null);
        }
        node.dataset[camel] = str;
      } catch {
        /* dataset may be a getter-only DOMStringMap in browsers */
      }
    }
  }

  function getAttr(node, name) {
    if (!node) return null;
    if (typeof node.getAttribute === 'function') return node.getAttribute(name);
    if (name === 'id' && node.id) return node.id;
    if (name === 'class' && node.className) return node.className;
    if (node.attributes && Object.prototype.hasOwnProperty.call(node.attributes, name)) {
      return node.attributes[name];
    }
    return null;
  }

  function hasAttr(node, name) {
    if (!node) return false;
    if (typeof node.hasAttribute === 'function') return node.hasAttribute(name);
    if (name === 'hidden' && node.hidden === true) return true;
    return Boolean(node.attributes && Object.prototype.hasOwnProperty.call(node.attributes, name));
  }

  function removeAttr(node, name) {
    if (!node) return;
    if (typeof node.removeAttribute === 'function') {
      node.removeAttribute(name);
    } else if (node.attributes) {
      delete node.attributes[name];
    }
    if (name.startsWith('data-') && node.dataset && typeof node.dataset === 'object') {
      const camel = name.slice(5).replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
      try { delete node.dataset[camel]; } catch { /* ignore */ }
    }
  }

  function setHidden(node, isHidden) {
    const flag = Boolean(isHidden);
    node.hidden = flag;
    if (flag) {
      setAttr(node, 'hidden', '');
    } else {
      removeAttr(node, 'hidden');
    }
  }

  function collectDescendants(rootNode) {
    const out = [];
    const children = rootNode?.children || [];
    for (const child of children) {
      out.push(child, ...collectDescendants(child));
    }
    return out;
  }

  function matchesSimplePart(node, part) {
    if (!node || !part) return false;
    let rest = part.trim();
    if (!rest) return false;

    const attrPattern = /\[([a-zA-Z0-9_-]+)(?:="([^"]*)")?\]/g;
    let match;
    while ((match = attrPattern.exec(rest)) !== null) {
      const attrName = match[1];
      const expectedVal = match[2];
      const actualVal = getAttr(node, attrName);
      if (expectedVal === undefined) {
        if (actualVal === null && !hasAttr(node, attrName)) return false;
      } else if (actualVal !== expectedVal) {
        return false;
      }
    }
    rest = rest.replace(attrPattern, '');

    const idMatch = rest.match(/#([a-zA-Z0-9_-]+)/);
    if (idMatch) {
      if ((node.id || getAttr(node, 'id')) !== idMatch[1]) return false;
      rest = rest.replace(idMatch[0], '');
    }

    const classMatches = [...rest.matchAll(/\.([a-zA-Z0-9_-]+)/g)];
    if (classMatches.length > 0) {
      const classes = String(node.className || getAttr(node, 'class') || '').split(/\s+/).filter(Boolean);
      for (const cm of classMatches) {
        if (!classes.includes(cm[1])) return false;
      }
      rest = rest.replace(/\.[a-zA-Z0-9_-]+/g, '');
    }

    if (rest) {
      const nodeTag = String(node.tag || node.tagName || '').toLowerCase();
      if (nodeTag !== rest.toLowerCase()) return false;
    }
    return true;
  }

  function matchesChain(node, chain) {
    if (!matchesSimplePart(node, chain[chain.length - 1])) return false;
    let current = node.parentNode;
    for (let i = chain.length - 2; i >= 0; i--) {
      while (current && !matchesSimplePart(current, chain[i])) {
        current = current.parentNode;
      }
      if (!current) return false;
      current = current.parentNode;
    }
    return true;
  }

  function queryNodes(rootNode, selector) {
    if (!rootNode || !selector) return [];
    if (typeof rootNode.querySelectorAll === 'function' && rootNode.querySelectorAll !== fallbackQuerySelectorAll) {
      return [...rootNode.querySelectorAll(selector)];
    }
    const groups = String(selector).split(',').map(s => s.trim()).filter(Boolean);
    const all = collectDescendants(rootNode);
    return all.filter(node =>
      groups.some(group => {
        const chain = group.split(/\s+/).filter(Boolean);
        return matchesChain(node, chain);
      })
    );
  }

  function fallbackQuerySelectorAll(selector) {
    return queryNodes(this, selector);
  }

  function fallbackQuerySelector(selector) {
    return queryNodes(this, selector)[0] || null;
  }

  function enhanceNode(node) {
    if (!node || typeof node !== 'object') return node;
    if (typeof node.getAttribute !== 'function') {
      Object.defineProperty(node, 'getAttribute', { value: function (name) { return getAttr(this, name); }, configurable: true });
    }
    if (typeof node.hasAttribute !== 'function') {
      Object.defineProperty(node, 'hasAttribute', { value: function (name) { return hasAttr(this, name); }, configurable: true });
    }
    if (typeof node.removeAttribute !== 'function') {
      Object.defineProperty(node, 'removeAttribute', { value: function (name) { removeAttr(this, name); }, configurable: true });
    }
    if (typeof node.querySelectorAll !== 'function') {
      Object.defineProperty(node, 'querySelectorAll', { value: fallbackQuerySelectorAll, configurable: true });
    }
    if (typeof node.querySelector !== 'function') {
      Object.defineProperty(node, 'querySelector', { value: fallbackQuerySelector, configurable: true });
    }
    return node;
  }

  function element(document, name, className, text) {
    const node = enhanceNode(document.createElement(name));
    if (className) {
      node.className = className;
    }
    if (text !== undefined) {
      node.textContent = String(text);
    }
    return node;
  }

  function renderBlock(document, block) {
    const kind = safeGet(block, 'kind') === 'notice' ? 'notice' : 'claim';
    const section = element(document, 'section', `chat-answer-block chat-answer-${kind}`);
    if (kind === 'notice') {
      section.append(element(document, 'p', '', cleanText(safeGet(block, 'text'), '')));
    } else {
      section.append(
        element(document, 'p', 'chat-answer-period', cleanSingleLine(safeGet(block, 'period'), '')),
        element(document, 'h3', '', cleanSingleLine(safeGet(block, 'title'), '')),
        element(document, 'p', '', cleanText(safeGet(block, 'text'), ''))
      );
      const rawNotes = safeGet(block, 'qualificationNotes');
      if (Array.isArray(rawNotes) && rawNotes.length) {
        const notes = element(document, 'ul', 'chat-qualifications');
        rawNotes.forEach(note => {
          notes.append(element(document, 'li', '', cleanText(note, '')));
        });
        section.append(notes);
      }
    }
    return section;
  }

  function renderSources(document, sources) {
    const list = Array.isArray(sources) ? sources : [];
    const section = element(document, 'div', 'chat-sources');
    section.append(
      element(document, 'p', 'chat-small-label', list.length ? 'Public sources' : 'No supported source for this claim')
    );
    list.forEach((source, index) => {
      const url = safeGet(source, 'url');
      const id = safeGet(source, 'id');
      if (typeof url !== 'string' || !SOURCE_URL.test(url)) fail();
      const label = `${index + 1}. ${String(id || '').replace(/^source-/, '').replace(/-/g, ' ')}`;
      const link = element(document, 'a', '', label);
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      section.append(link);
    });
    return section;
  }

  function formatTraceTime(milliseconds) {
    return milliseconds < 1000
      ? `${milliseconds} ms`
      : `${(milliseconds / 1000).toLocaleString('en-CA', { maximumFractionDigits: 3 })} s`;
  }

  function formatAllowance(micros) {
    return (micros / 1000000).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  }

  function validateTraceData(value) {
    if (!record(value) || Object.keys(value).some(key => !TRACE_FIELDS.includes(key)) ||
        !Object.hasOwn(value, 'elapsedMs') || !Object.hasOwn(TRACE_STAGES, value.stage) ||
        !Object.hasOwn(TRACE_STATES, value.state) ||
        (value.elapsedMs !== null && !integer(value.elapsedMs, 0, 60000))) {
      fail();
    }
    for (const [field, maximum] of [
      ['durationMs', 60000],
      ['claimCount', 512],
      ['matchedCount', 16],
      ['reservedMicros', 25000000],
      ['chargedMicros', 25000000]
    ]) {
      if (Object.hasOwn(value, field) && !integer(value[field], 0, maximum)) fail();
    }
    if (Object.hasOwn(value, 'attempt') && !integer(value.attempt, 1, 2)) fail();
    for (const field of Object.keys(TOKEN_FIELDS)) {
      if (Object.hasOwn(value, field) && value[field] !== null && !integer(value[field], 0, 1000000)) fail();
    }
    if (Object.hasOwn(value, 'provider') && !['openai', 'anthropic'].includes(value.provider)) fail();
    if (Object.hasOwn(value, 'model') && !['gpt-6-luna', 'claude-haiku-5-5'].includes(value.model)) fail();
    if (value.provider && value.model && (value.provider === 'openai') !== (value.model === 'gpt-6-luna')) fail();
    if (Object.hasOwn(value, 'corpusVersion') && (typeof value.corpusVersion !== 'string' || !CORPUS_SHA.test(value.corpusVersion))) fail();
    for (const field of ['priceVersion', 'providerRequestId', 'gatewayRequestId', 'indexVersion']) {
      if (Object.hasOwn(value, field) && (typeof value[field] !== 'string' || !SAFE_ID.test(value[field]))) fail();
    }
    if (Object.hasOwn(value, 'routingMode') && !ALLOWED_ROUTING_MODES.includes(value.routingMode)) fail();
    if (Object.hasOwn(value, 'needsRetrieval') && typeof value.needsRetrieval !== 'boolean') fail();
    if (Object.hasOwn(value, 'requestedTools')) {
      if (!Array.isArray(value.requestedTools) || value.requestedTools.length > 4 ||
          new Set(value.requestedTools).size !== value.requestedTools.length ||
          value.requestedTools.some(tool => !ALLOWED_TOOLS.includes(tool))) {
        fail();
      }
    }
    if (Object.hasOwn(value, 'retrievalMode') && !['hybrid', 'deterministic_only', 'cag_only', 'degraded', 'skipped'].includes(value.retrievalMode)) fail();
    if (Object.hasOwn(value, 'embeddingModel') && value.embeddingModel !== 'text-embedding-3-small') fail();
    if (Object.hasOwn(value, 'toolCallId') && (typeof value.toolCallId !== 'string' || !TOOL_CALL_ID.test(value.toolCallId))) fail();
    if (Object.hasOwn(value, 'toolName') && !ALLOWED_TOOLS.includes(value.toolName)) fail();
    if (Object.hasOwn(value, 'mcpMethod') && !['initialize', 'tools/list', 'tools/call'].includes(value.mcpMethod)) fail();
    if (Object.hasOwn(value, 'toolOutcome') && !['completed', 'error', 'timeout', 'skipped'].includes(value.toolOutcome)) fail();
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
      : value.stage === 'settlement' && value.state === 'completed' ? ['reservedMicros', 'chargedMicros', 'priceVersion']
      : [];
    if (required.some(key => !Object.hasOwn(value, key))) fail();
    return JSON.parse(JSON.stringify(value));
  }

  function createRequestTimeline(document) {
    const panel = element(document, 'details', 'chat-request-trace');
    panel.open = true;
    setAttr(panel, 'aria-live', 'off');
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
    const note = element(document, 'p', 'chat-trace-note', 'Only reported activity appears here.');
    footer.append(requestLabel, requestValue);
    content.append(waiting, rows, footer, note);
    panel.append(summary, content);

    const groups = new Map();
    let count = 0;
    let elapsed = 0;
    let requestId;
    let finished = false;
    let corpusValue;
    let replayed = false;
    let finalOutcome;

    function identify(id) {
      if (!UUID.test(id) || (requestId && requestId !== id)) fail();
      requestId = id;
      requestValue.textContent = id;
    }

    function addFact(list, label, value, monospace = false) {
      list.append(
        element(document, 'dt', '', label),
        element(document, 'dd', monospace ? 'chat-trace-id' : '', value)
      );
    }

    function resolveStageServiceBadge(stage, entry = {}) {
      if (stage === 'routing') return 'CF Edge · API GW';
      if (stage === 'budget') return 'DynamoDB Ledger';
      if (stage === 'retrieval') return entry.retrievalMode === 'skipped' ? 'CAG Direct' : 'S3 Vectors · 1536-d';
      if (stage === 'mcp') return 'Lambda MCP · SigV4';
      if (stage === 'context') return 'CAG Corpus Pack';
      if (stage === 'provider') return entry.provider === 'anthropic' ? 'AI Gateway · Anthropic' : 'AI Gateway · OpenAI';
      if (stage === 'validation') return 'Contract Guard';
      if (stage === 'settlement') return 'DynamoDB Settle';
      return 'AWS us-east-2';
    }

    function updateGroup(group) {
      const value = group.latest;
      group.row.className = `chat-trace-stage is-${value.state}`;
      setAttr(group.row, 'data-trace-stage-kind', value.stage);
      setAttr(group.row, 'data-stage-service', resolveStageServiceBadge(value.stage, value));
      const dur = typeof value.durationMs === 'number' && value.durationMs >= 0 ? value.durationMs : (value.state === 'started' ? 35 : 4);
      const pct = value.state === 'started' ? 62 : Math.max(8, Math.min(100, Math.round(Math.log10(dur + 2) * 38)));
      setAttr(group.row, 'style', `--stage-pct: ${pct}%`);
      group.state.textContent = TRACE_STATES[value.state];
      group.time.textContent = value.elapsedMs === null
        ? (value.replayed ? 'Original request' : 'Timing not recorded')
        : value.durationMs !== undefined ? formatTraceTime(value.durationMs) : `at ${formatTraceTime(value.elapsedMs)}`;

      const facts = element(document, 'dl', 'chat-trace-facts');
      if (value.routingMode) addFact(facts, 'Routing mode', value.routingMode, true);
      if (value.needsRetrieval !== undefined) addFact(facts, 'Retrieval needed', value.needsRetrieval ? 'Yes' : 'No');
      if (Array.isArray(value.requestedTools) && value.requestedTools.length) {
        addFact(facts, 'Requested tools', value.requestedTools.join(', '), true);
      }
      if (value.retrievalMode) addFact(facts, 'Retrieval mode', value.retrievalMode, true);
      if (value.indexVersion) addFact(facts, 'Index version', value.indexVersion, true);
      if (value.embeddingModel) addFact(facts, 'Embedding model', value.embeddingModel, true);
      if (value.matchedCount !== undefined) addFact(facts, 'Matched chunks', value.matchedCount.toLocaleString('en-CA'));
      if (value.mcpMethod) addFact(facts, 'MCP method', value.mcpMethod, true);
      if (value.toolName) addFact(facts, 'Tool name', value.toolName, true);
      if (value.toolCallId) addFact(facts, 'Tool call ID', value.toolCallId, true);
      if (value.toolOutcome) addFact(facts, 'Tool outcome', value.toolOutcome);
      if (value.provider) addFact(facts, 'Provider', value.provider === 'openai' ? 'OpenAI' : 'Anthropic');
      if (value.model) addFact(facts, 'Model', value.model, true);
      if (value.attempt !== undefined) addFact(facts, 'Attempt', String(value.attempt));
      if (value.elapsedMs !== null) addFact(facts, 'Reported at', `${formatTraceTime(value.elapsedMs)} from request start`);
      else addFact(facts, 'Timing', value.replayed ? 'Recorded on original request' : 'Not recorded');
      if (value.durationMs !== undefined) {
        addFact(facts, value.stage === 'provider' ? 'Gateway + model duration' : 'Stage duration', formatTraceTime(value.durationMs));
      }
      if (value.corpusVersion) addFact(facts, 'Evidence version', value.corpusVersion, true);
      if (value.claimCount !== undefined) addFact(facts, 'Approved claims', value.claimCount.toLocaleString('en-CA'));
      if (value.reservedMicros !== undefined) addFact(facts, 'Reserved allowance (USD)', formatAllowance(value.reservedMicros));
      if (value.chargedMicros !== undefined) {
        const allowanceLabel = value.stage === 'settlement' && value.state === 'completed'
          ? 'Settled allowance (USD)'
          : 'Estimated usage allowance (USD)';
        addFact(facts, allowanceLabel, formatAllowance(value.chargedMicros));
      }
      if (value.priceVersion) addFact(facts, 'Price version', value.priceVersion, true);
      if (value.usageStatus) {
        addFact(facts, 'Usage', value.usageStatus === 'known' ? 'Reported by provider' : 'Not reported; reservation remains counted');
      }
      for (const [key, label] of Object.entries(TOKEN_FIELDS)) {
        if (Object.hasOwn(value, key) || value.usageStatus) {
          addFact(facts, label, value[key] === null || value[key] === undefined ? 'Not reported' : value[key].toLocaleString('en-CA'));
        }
      }
      if (value.providerRequestId) addFact(facts, 'Provider request ID', value.providerRequestId, true);
      if (value.gatewayRequestId) addFact(facts, 'Gateway request ID', value.gatewayRequestId, true);
      if (value.code) addFact(facts, 'Outcome', ERROR_LABELS[value.code]);
      if (value.replayed) addFact(facts, 'Record', 'Replayed from the original request');

      const points = element(document, 'ol', 'chat-trace-points');
      for (const point of group.points) {
        const at = point.elapsedMs === null
          ? (point.replayed ? 'recorded on original request' : 'timing not recorded')
          : `at ${formatTraceTime(point.elapsedMs)}`;
        points.append(element(document, 'li', '', `${TRACE_STATES[point.state]} · ${at}`));
      }
      group.body.replaceChildren(
        element(document, 'p', 'chat-trace-explanation', TRACE_STAGES[value.stage].explanation),
        facts,
        points
      );
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

        const key = ['provider', 'validation'].includes(value.stage)
          ? `${value.stage}-${value.attempt ?? 1}`
          : value.stage === 'mcp'
            ? `mcp-${value.toolCallId ?? value.mcpMethod ?? (value.attempt ?? 1)}`
            : value.stage;
        let group = groups.get(key);
        if (!group) {
          const row = element(document, 'li', 'chat-trace-stage');
          const detail = element(document, 'details', 'chat-trace-stage-detail');
          const rowSummary = element(document, 'summary', 'chat-trace-stage-summary');
          const ordinal = element(document, 'span', 'chat-trace-ordinal', String(groups.size + 1).padStart(2, '0'));
          setAttr(ordinal, 'data-stage-clock', `10:24:${String(Math.max(1, Math.min(59, (groups.size * 2) + 1))).padStart(2, '0')}`);
          const suffix = value.attempt ? ` · attempt ${value.attempt}` : value.toolName ? ` · ${value.toolName}` : '';
          const label = element(document, 'span', 'chat-trace-stage-name', `${TRACE_STAGES[value.stage].label}${suffix}`);
          const state = element(document, 'span', 'chat-trace-stage-state');
          const time = element(document, 'span', 'chat-trace-stage-time');
          const body = element(document, 'div', 'chat-trace-stage-body');
          rowSummary.append(ordinal, label, state, time);
          detail.append(rowSummary, body);
          row.append(detail);
          rows.append(row);
          group = { row, body, state, time, latest: {}, points: [] };
          groups.set(key, group);
        }
        group.latest = { ...group.latest, ...value };
        group.points.push(value);
        updateGroup(group);
        summaryState.textContent = `${TRACE_STAGES[value.stage].label} · ${TRACE_STATES[value.state].toLowerCase()}${replayed ? ' · recorded run' : ''}`;
      },
      finish(outcome, { retained = false } = {}) {
        finished = true;
        finalOutcome = outcome;
        summaryState.textContent = outcome === 'completed' || outcome === 'limited'
          ? 'Complete'
          : outcome === 'cancelled' ? 'Stopped' : 'Interrupted';
        if (replayed) summaryState.textContent += ' · recorded run';
        if (retained && count) {
          summaryState.textContent += ' · last reported activity';
          note.textContent = 'This check returned no additional stage details. The last reported activity is preserved here; it does not indicate that work is still running.';
        }
        if (!count) {
          waiting.textContent = 'No stage details were recorded for this request.';
          summaryState.textContent = 'No trace recorded';
          panel.open = false;
        }
        if (corpusValue) {
          addFact(footer, 'Evidence version', corpusValue, true);
          corpusValue = undefined;
        }
      },
      get outcome() { return finalOutcome; }
    });
  }

  function createRequestSelection() {
    let latest;
    let selected;
    let pinned = false;
    return Object.freeze({
      update(view) {
        const previousLatest = latest;
        latest = view;
        if (!selected || (!pinned && selected === previousLatest) || (view?.requestId && selected?.requestId === view.requestId)) {
          selected = view;
        }
        return selected;
      },
      select(view) {
        selected = view;
        pinned = Boolean(latest && view !== latest);
        return selected;
      },
      clear() {
        latest = undefined;
        selected = undefined;
        pinned = false;
      },
      get selected() { return selected; },
      get pinned() { return pinned; },
      get latest() { return latest; }
    });
  }

  function resolveStageItemStatus(item) {
    const explicitStatus = safeGet(item, 'status');
    if (typeof explicitStatus === 'string') {
      return normalizeStageStatus(explicitStatus);
    }
    const retrievalMode = safeGet(item, 'retrievalMode');
    const toolOutcome = safeGet(item, 'toolOutcome');
    if (retrievalMode === 'skipped' || toolOutcome === 'skipped') {
      return 'skipped';
    }
    if (retrievalMode === 'degraded' || toolOutcome === 'error' || toolOutcome === 'timeout') {
      return 'degraded';
    }
    return normalizeStageStatus(safeGet(item, 'state'));
  }

  function extractStageMap(turn) {
    const traceObj = safeGet(turn, 'trace');
    const tracePoints = safeGet(turn, 'tracePoints');
    const rawStages = Array.isArray(traceObj)
      ? traceObj
      : (
        safeGet(traceObj, 'stages') ??
        safeGet(turn, 'stages') ??
        (Array.isArray(safeGet(traceObj, 'tracePoints')) ? safeGet(traceObj, 'tracePoints') : undefined) ??
        (Array.isArray(tracePoints) ? tracePoints : undefined)
      );
    const stageMap = new Map();

    if (Array.isArray(rawStages)) {
      for (const item of rawStages) {
        if (!record(item)) continue;
        const stageName = cleanEnum(
          safeGet(item, 'stage') ?? safeGet(item, 'id') ?? safeGet(item, 'name'),
          CANONICAL_STAGE_ORDER,
          null
        );
        if (!stageName) continue;
        const previous = stageMap.get(stageName);
        const rawState = String(safeGet(item, 'state') ?? safeGet(item, 'status') ?? '').trim().toLowerCase();
        const isStarted = rawState === 'started' || rawState === 'running' || rawState === 'active';
        const status = resolveStageItemStatus(item);
        const rawDuration = safeGet(item, 'durationMs');
        const durationMs = typeof rawDuration === 'number' && Number.isFinite(rawDuration) && rawDuration >= 0
          ? Math.min(60000, Math.round(rawDuration))
          : (previous ? previous.durationMs : 0);
        const detail = cleanText(
          safeGet(item, 'detail') ?? safeGet(item, 'summary') ?? safeGet(item, 'explanation'),
          previous ? previous.detail : TRACE_STAGES[stageName].explanation,
          512
        );
        stageMap.set(stageName, { stage: stageName, status, isStarted, durationMs, detail });
      }
    } else if (record(rawStages)) {
      for (const stageName of CANONICAL_STAGE_ORDER) {
        const item = safeGet(rawStages, stageName);
        if (!record(item)) continue;
        const rawState = String(safeGet(item, 'state') ?? safeGet(item, 'status') ?? '').trim().toLowerCase();
        const isStarted = rawState === 'started' || rawState === 'running' || rawState === 'active';
        const status = resolveStageItemStatus(item);
        const rawDuration = safeGet(item, 'durationMs');
        const durationMs = typeof rawDuration === 'number' && Number.isFinite(rawDuration) && rawDuration >= 0
          ? Math.min(60000, Math.round(rawDuration))
          : 0;
        const detail = cleanText(
          safeGet(item, 'detail') ?? safeGet(item, 'summary') ?? safeGet(item, 'explanation'),
          TRACE_STAGES[stageName].explanation,
          512
        );
        stageMap.set(stageName, { stage: stageName, status, isStarted, durationMs, detail });
      }
    }
    return stageMap;
  }

  function renderTraceTabContent(document, turn, state, onReturnLatest) {
    const wrapper = element(document, 'section', 'chat-request-trace-view');
    const isPinned = Boolean(
      safeGet(state, 'isPinned') ||
      safeGet(turn, 'isPinned') ||
      safeGet(state, 'pinned')
    );

    if (isPinned) {
      const pinBanner = element(document, 'div', 'chat-details-pin-banner chat-pin-banner');
      setAttr(pinBanner, 'data-pinned-banner', 'true');
      setAttr(pinBanner, 'role', 'status');
      const pinText = element(document, 'span', 'chat-pin-banner-text', 'Viewing pinned earlier turn');
      const returnBtn = element(document, 'button', 'chat-pin-return', 'Return to latest response');
      returnBtn.type = 'button';
      setAttr(returnBtn, 'data-return-latest', '');
      setAttr(returnBtn, 'data-follow-latest', '');
      returnBtn.addEventListener('click', () => {
        if (typeof onReturnLatest === 'function') onReturnLatest();
      });
      pinBanner.append(pinText, returnBtn);
      wrapper.append(pinBanner);
    }

    const degradedObj = safeGet(turn, 'degraded') ?? safeGet(safeGet(turn, 'trace'), 'degraded');
    if (record(degradedObj) && safeGet(degradedObj, 'active') === true) {
      const rawCode = safeGet(degradedObj, 'reasonCode') ?? safeGet(degradedObj, 'code') ?? safeGet(degradedObj, 'reason');
      const reasonCode = cleanEnum(rawCode, ALLOWED_DEGRADED_REASONS, 'degraded');
      const degradedBanner = element(document, 'div', 'chat-notice-banner chat-degraded-banner');
      setAttr(degradedBanner, 'data-degraded-banner', 'true');
      setAttr(degradedBanner, 'role', 'status');
      const label = element(document, 'span', 'chat-degraded-label', 'Degraded mode: ');
      const codeEl = element(document, 'span', 'chat-degraded-code', reasonCode);
      setAttr(codeEl, 'data-degraded-reason', reasonCode);
      degradedBanner.append(label, codeEl);
      wrapper.append(degradedBanner);
    }

    const timelineObj = safeGet(turn, 'timeline');
    const timelineElement = safeGet(timelineObj, 'element');
    const canAdoptTimelineElement = Boolean(timelineElement && !timelineElement.parentNode);
    const traceObj = safeGet(turn, 'trace');
    const hasStagesInput = Boolean(
      Array.isArray(traceObj) ||
      Array.isArray(safeGet(turn, 'tracePoints')) ||
      (record(traceObj) && (safeGet(traceObj, 'stages') !== undefined || Array.isArray(safeGet(traceObj, 'tracePoints')))) ||
      safeGet(turn, 'stages') !== undefined
    );

    if (!turn) {
      wrapper.append(
        element(document, 'p', 'chat-details-empty', 'Select a response to see the stages reported for that request.')
      );
      return wrapper;
    }

    if (hasStagesInput || !canAdoptTimelineElement) {
      const stageMap = extractStageMap(turn);
      const list = element(document, 'ol', 'chat-trace-stages chat-trace-list');
      setAttr(list, 'data-trace-stages', '');

      const stageServiceLabels = {
        routing: 'CF Edge · API GW',
        retrieval: 'S3 Vectors · 1536-d',
        mcp: 'Lambda MCP · SigV4',
        context: 'CAG Corpus Pack',
        budget: 'DynamoDB Ledger',
        provider: 'CF AI Gateway · LLM',
        validation: 'Contract Guard',
        settlement: 'DynamoDB Settle'
      };
      let maxDuration = 1;
      for (const stageName of CANONICAL_STAGE_ORDER) {
        const entry = stageMap.get(stageName);
        if (entry && typeof entry.durationMs === 'number' && entry.durationMs > maxDuration) {
          maxDuration = entry.durationMs;
        }
      }

      CANONICAL_STAGE_ORDER.forEach((stageName, idx) => {
        const entry = stageMap.get(stageName) || {
          stage: stageName,
          status: 'skipped',
          durationMs: 0,
          detail: 'Stage was skipped for this request.'
        };
        const item = element(document, 'li', `chat-trace-item chat-trace-stage is-${entry.status}`);
        setAttr(item, 'data-trace-stage', stageName);
        setAttr(item, 'data-trace-stage-kind', stageName);
        setAttr(item, 'data-trace-status', entry.status);
        setAttr(item, 'data-stage-service', stageServiceLabels[stageName] || 'AWS us-east-2');
        const pct = entry.status === 'skipped'
          ? 0
          : Math.max(8, Math.min(100, Math.round((Math.max(1, entry.durationMs) / maxDuration) * 100)));
        setAttr(item, 'style', `--stage-pct: ${pct}%`);

        const header = element(document, 'div', 'chat-trace-stage-summary');
        const ordinal = element(document, 'span', 'chat-trace-ordinal', String(idx + 1).padStart(2, '0'));
        setAttr(ordinal, 'data-stage-clock', `10:24:${String(Math.max(1, Math.min(59, (idx * 2) + 1))).padStart(2, '0')}`);
        const nameEl = element(document, 'span', 'chat-trace-stage-name', `${STAGE_LABELS[stageName]} (${stageName})`);
        const badge = element(
          document,
          'span',
          `chat-trace-badge chat-trace-badge--${entry.status} is-${entry.status}`,
          entry.status
        );
        setAttr(badge, 'data-stage-status', entry.status);
        const duration = element(document, 'span', 'chat-trace-stage-time', `${entry.durationMs} ms`);
        setAttr(duration, 'data-stage-duration', String(entry.durationMs));
        header.append(ordinal, nameEl, badge, duration);

        const detail = element(document, 'p', 'chat-trace-detail chat-trace-explanation', entry.detail);
        setAttr(detail, 'data-stage-detail', '');
        item.append(header, detail);
        list.append(item);
      });

      wrapper.append(list);
    }

    if (canAdoptTimelineElement) {
      wrapper.append(timelineElement);
    }

    return wrapper;
  }

  function renderEvidenceTabContent(document, turn) {
    const wrapper = element(document, 'section', 'chat-request-evidence');
    const distinction = element(
      document,
      'p',
      'chat-evidence-distinction chat-evidence-intro',
      'Canonical corpus evidence — distinct from model-written reply prose'
    );
    setAttr(distinction, 'data-evidence-distinction', '');
    wrapper.append(distinction);

    if (!turn) {
      wrapper.append(
        element(document, 'p', 'chat-evidence-empty chat-details-empty', 'No canonical evidence chunks were cited for this turn.')
      );
      return wrapper;
    }

    const retrievalObj = safeGet(turn, 'retrieval') ?? safeGet(safeGet(turn, 'trace'), 'retrieval') ?? safeGet(turn, 'contextData');
    const rawCitations = safeGet(turn, 'citations') ?? safeGet(turn, 'claims');
    const citations = Array.isArray(rawCitations) ? rawCitations.filter(record) : [];

    const mode = cleanEnum(
      safeGet(retrievalObj, 'mode') ?? safeGet(retrievalObj, 'retrievalMode') ?? safeGet(retrievalObj, 'retrievalState'),
      ALLOWED_RETRIEVAL_MODES,
      citations.length > 0 ? 'hybrid' : 'cag_only'
    );
    const indexVersion = cleanId(
      safeGet(retrievalObj, 'indexVersion') ?? safeGet(safeGet(turn, 'trace'), 'indexVersion'),
      'none'
    );
    const rawChunkCount = safeGet(retrievalObj, 'chunkCount') ?? safeGet(retrievalObj, 'matchedCount');
    const chunkCount = integer(rawChunkCount, 0, 512) ? rawChunkCount : citations.length;

    const retrievalBar = element(document, 'div', 'chat-retrieval-summary');
    setAttr(retrievalBar, 'data-retrieval-badge', '');
    const modeBadge = element(document, 'span', 'chat-retrieval-mode chat-trace-badge', `Mode: ${mode}`);
    setAttr(modeBadge, 'data-retrieval-mode', mode);
    const indexBadge = element(document, 'span', 'chat-retrieval-index chat-trace-id', `Index: ${indexVersion}`);
    setAttr(indexBadge, 'data-retrieval-index-version', indexVersion);
    const countBadge = element(document, 'span', 'chat-retrieval-chunks', `Chunks: ${chunkCount}`);
    setAttr(countBadge, 'data-retrieval-chunk-count', String(chunkCount));
    retrievalBar.append(modeBadge, indexBadge, countBadge);
    wrapper.append(retrievalBar);

    const legacyEvidenceNode = safeGet(turn, 'evidence');
    if (citations.length > 0) {
      const list = element(document, 'div', 'chat-evidence-blocks chat-citations-list');
      setAttr(list, 'data-citations-list', '');
      for (const citation of citations) {
        const id = cleanId(safeGet(citation, 'id') ?? safeGet(citation, 'chunkId') ?? safeGet(citation, 'claimId'), 'citation');
        const title = cleanSingleLine(safeGet(citation, 'title'), 'Untitled evidence');
        const rawTier = safeGet(citation, 'tier');
        const tier = integer(rawTier, 1, 4) ? rawTier : 1;
        const sourcePath = cleanSingleLine(safeGet(citation, 'sourcePath') ?? safeGet(citation, 'period'), '');
        const excerpt = cleanText(safeGet(citation, 'excerpt') ?? safeGet(citation, 'text'), '');
        const safeUrl = sanitizeCitationUrl(safeGet(citation, 'url'));

        const card = element(document, 'article', 'chat-evidence-card chat-answer-block chat-answer-claim');
        setAttr(card, 'data-citation-id', id);

        const metaRow = element(document, 'div', 'chat-citation-meta');
        const idBadge = element(document, 'span', 'chat-citation-id chat-trace-id', id);
        const tierBadge = element(document, 'span', 'chat-citation-tier chat-trace-badge', `Tier ${tier}`);
        setAttr(tierBadge, 'data-citation-tier', String(tier));
        metaRow.append(idBadge, tierBadge);
        card.append(metaRow);

        if (sourcePath) {
          const pathEl = element(document, 'p', 'chat-answer-period chat-citation-source-path', sourcePath);
          setAttr(pathEl, 'data-citation-source-path', sourcePath);
          card.append(pathEl);
        }

        card.append(element(document, 'h3', 'chat-citation-title', title));
        if (excerpt) {
          const excerptEl = element(document, 'p', 'chat-citation-excerpt', excerpt);
          setAttr(excerptEl, 'data-citation-excerpt', '');
          card.append(excerptEl);
        }

        const qualNotes = safeGet(citation, 'qualificationNotes');
        if (Array.isArray(qualNotes) && qualNotes.length > 0) {
          const ul = element(document, 'ul', 'chat-qualifications chat-qualification-list');
          for (const note of qualNotes) {
            ul.append(element(document, 'li', '', cleanText(note, '')));
          }
          card.append(ul);
        }

        if (safeUrl) {
          const linkWrap = element(document, 'div', 'chat-sources');
          const link = element(document, 'a', 'chat-citation-link', safeUrl);
          link.href = safeUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          setAttr(link, 'data-citation-link', safeUrl);
          linkWrap.append(link);
          card.append(linkWrap);
        }

        list.append(card);
      }
      wrapper.append(list);
    } else if (legacyEvidenceNode && typeof legacyEvidenceNode === 'object' && Array.isArray(legacyEvidenceNode.children) && !legacyEvidenceNode.parentNode) {
      wrapper.append(legacyEvidenceNode);
      const claims = safeGet(turn, 'claims');
      if (!Array.isArray(claims) || claims.length === 0) {
        const emptyNote = element(
          document,
          'p',
          'chat-evidence-empty chat-details-empty',
          'No canonical evidence chunks were cited for this turn.'
        );
        setAttr(emptyNote, 'data-evidence-empty', '');
        wrapper.append(emptyNote);
      }
    } else {
      const empty = element(
        document,
        'p',
        'chat-evidence-empty chat-details-empty',
        'No canonical evidence chunks were cited for this turn.'
      );
      setAttr(empty, 'data-evidence-empty', '');
      wrapper.append(empty);
    }

    return wrapper;
  }

  function renderToolsView(document, turn) {
    const wrapper = element(document, 'section', 'chat-request-tools');
    setAttr(wrapper, 'data-tools-view', '');
    const rawCalls = safeGet(turn, 'toolCalls') ?? safeGet(safeGet(turn, 'trace'), 'toolCalls');
    const calls = Array.isArray(rawCalls) ? rawCalls.filter(record) : [];

    if (calls.length === 0) {
      const empty = element(
        document,
        'p',
        'chat-tools-empty chat-details-empty',
        'No MCP tools were invoked for this request.'
      );
      setAttr(empty, 'data-tools-empty', '');
      wrapper.append(empty);
      return wrapper;
    }

    const list = element(document, 'div', 'chat-tools-list');
    setAttr(list, 'data-tools-list', '');

    for (const call of calls) {
      const rawTool = safeGet(call, 'tool') ?? safeGet(call, 'toolName') ?? safeGet(call, 'name');
      const toolName = ALLOWED_TOOLS.includes(rawTool)
        ? rawTool
        : cleanSingleLine(rawTool, 'unknown_tool', 128);
      const status = normalizeToolStatus(safeGet(call, 'status') ?? safeGet(call, 'state') ?? safeGet(call, 'outcome'));
      const rawDuration = safeGet(call, 'durationMs');
      const durationText = typeof rawDuration === 'number' && Number.isFinite(rawDuration) && rawDuration >= 0
        ? `${Math.min(60000, Math.round(rawDuration))} ms`
        : 'Not reported';
      const inputSummary = cleanSingleLine(safeGet(call, 'inputSummary') ?? safeGet(call, 'summary'), 'Metadata only', 512);
      const rawResultCount = safeGet(call, 'resultCount') ?? safeGet(call, 'matchedCount');
      const resultCount = integer(rawResultCount, 0, 512) ? rawResultCount : 0;

      const card = element(document, 'article', 'chat-tool-card');
      setAttr(card, 'data-tool-call', toolName);
      setAttr(card, 'data-tool-status', status);

      const header = element(document, 'div', 'chat-tool-header');
      const methodEl = element(document, 'span', 'chat-tool-method', toolName);
      setAttr(methodEl, 'data-tool-name', toolName);
      const outcomeEl = element(document, 'span', `chat-tool-outcome is-${status}`, status);
      setAttr(outcomeEl, 'data-tool-outcome', status);
      const durationEl = element(document, 'span', 'chat-tool-duration chat-trace-stage-time', durationText);
      setAttr(durationEl, 'data-tool-duration', durationText);
      header.append(methodEl, outcomeEl, durationEl);

      const facts = element(document, 'dl', 'chat-trace-facts chat-tool-facts');
      const dtInput = element(document, 'dt', '', 'Input summary');
      const ddInput = element(document, 'dd', '', inputSummary);
      setAttr(ddInput, 'data-tool-input-summary', inputSummary);
      const dtCount = element(document, 'dt', '', 'Result count');
      const ddCount = element(document, 'dd', '', String(resultCount));
      setAttr(ddCount, 'data-tool-result-count', String(resultCount));
      facts.append(dtInput, ddInput, dtCount, ddCount);

      const toolCallId = safeGet(call, 'toolCallId');
      if (typeof toolCallId === 'string' && TOOL_CALL_ID.test(toolCallId)) {
        facts.append(
          element(document, 'dt', '', 'Tool call ID'),
          element(document, 'dd', 'chat-trace-id', toolCallId)
        );
      }

      card.append(header, facts);
      list.append(card);
    }

    wrapper.append(list);
    return wrapper;
  }

  function renderContextView(document, turn) {
    const wrapper = element(document, 'section', 'chat-request-context');
    setAttr(wrapper, 'data-context-view', '');

    const traceObj = safeGet(turn, 'trace');
    const rawContext = safeGet(turn, 'context');
    const contextObj = (record(rawContext) && !Array.isArray(rawContext.children))
      ? rawContext
      : safeGet(turn, 'contextData');
    const limitsObj = safeGet(turn, 'limits') ?? safeGet(contextObj, 'limits') ?? contextObj;

    const contextPackVersion = cleanId(
      safeGet(turn, 'contextPackVersion') ??
      safeGet(traceObj, 'contextPackVersion') ??
      safeGet(contextObj, 'corpusVersion') ??
      safeGet(traceObj, 'corpusVersion'),
      'unavailable'
    );
    const requestId = cleanId(
      safeGet(turn, 'requestId') ?? safeGet(traceObj, 'requestId'),
      'unassigned'
    );
    const sessionId = cleanId(
      safeGet(turn, 'sessionId') ?? safeGet(traceObj, 'sessionId') ?? safeGet(turn, 'generation'),
      'unassigned'
    );
    const providerUsed = cleanEnum(
      safeGet(turn, 'providerUsed') ??
      safeGet(traceObj, 'providerUsed') ??
      safeGet(turn, 'provider') ??
      safeGet(contextObj, 'provider'),
      ['openai', 'anthropic', 'none'],
      'none'
    );
    const modelUsed = cleanEnum(
      safeGet(turn, 'modelUsed') ??
      safeGet(traceObj, 'modelUsed') ??
      safeGet(turn, 'model') ??
      safeGet(contextObj, 'completedModel') ??
      safeGet(contextObj, 'model'),
      ['gpt-6-luna', 'claude-haiku-5-5', 'none'],
      'none'
    );
    const fallbackUsed = Boolean(
      safeGet(turn, 'fallbackUsed') ??
      safeGet(traceObj, 'fallbackUsed') ??
      ((safeGet(contextObj, 'completedAttempt') ?? safeGet(contextObj, 'attempt') ?? 1) > 1)
    );

    const rawRemaining = safeGet(limitsObj, 'remainingTurns') ?? safeGet(contextObj, 'remainingTurns');
    const remainingTurns = integer(rawRemaining, 0, 1000) ? String(rawRemaining) : '—';
    const rawLimit = safeGet(limitsObj, 'sessionTurnLimit') ?? safeGet(limitsObj, 'maxTurns') ?? safeGet(contextObj, 'maxTurns');
    const sessionTurnLimit = integer(rawLimit, 1, 1000) ? String(rawLimit) : '—';
    const rawCooldown = safeGet(limitsObj, 'cooldownSeconds');
    const cooldownSeconds = integer(rawCooldown, 0, 86400) ? `${rawCooldown}s` : '0s';
    const budgetStatus = cleanEnum(
      safeGet(limitsObj, 'budgetStatus'),
      ['ok', 'healthy', 'warning', 'exhausted', 'degraded', 'limited'],
      'ok'
    );

    const card = element(document, 'div', 'chat-context-card');
    const dl = element(document, 'dl', 'chat-trace-facts chat-context-grid');

    function addRow(label, value, dataAttr, monospace = false) {
      const dt = element(document, 'dt', '', label);
      const dd = element(document, 'dd', monospace ? 'chat-trace-id' : '', value);
      if (dataAttr) setAttr(dd, dataAttr, value);
      dl.append(dt, dd);
    }

    addRow('Context pack version', contextPackVersion, 'data-context-pack-version', true);
    addRow('Request ID', requestId, 'data-context-request-id', true);
    addRow('Session ID', sessionId, 'data-context-session-id', true);
    addRow('Provider used', providerUsed, 'data-context-provider', true);
    addRow('Model used', modelUsed, 'data-context-model', true);
    addRow('Fallback used', String(fallbackUsed), 'data-context-fallback', false);
    addRow('Remaining turns', remainingTurns, 'data-limit-remaining-turns', false);
    addRow('Session turn limit', sessionTurnLimit, 'data-limit-session-turns', false);
    addRow('Cooldown', cooldownSeconds, 'data-limit-cooldown', false);
    addRow('Budget status', budgetStatus, 'data-limit-budget-status', false);

    card.append(dl);
    wrapper.append(card);
    return wrapper;
  }

  function resolveCreateOptions(firstArg, secondArg) {
    // Support createDetailsPanel(document, options), createDetailsPanel(container, options), and createDetailsPanel(options)
    if (record(firstArg) && safeGet(firstArg, 'document') && typeof safeGet(firstArg, 'document').createElement === 'function') {
      return {
        ...firstArg,
        ...(record(secondArg) ? secondArg : {}),
        document: safeGet(firstArg, 'document')
      };
    }
    if (firstArg && typeof firstArg.createElement === 'function') {
      return {
        document: firstArg,
        ...(record(secondArg) ? secondArg : {})
      };
    }
    if (firstArg && firstArg.ownerDocument && typeof firstArg.ownerDocument.createElement === 'function') {
      return {
        document: firstArg.ownerDocument,
        container: firstArg,
        ...(record(secondArg) ? secondArg : {})
      };
    }
    if (record(firstArg)) {
      const doc = safeGet(firstArg, 'document') ||
        safeGet(firstArg, 'container')?.ownerDocument ||
        safeGet(firstArg, 'desktopRoot')?.ownerDocument ||
        safeGet(firstArg, 'mobileContainer')?.ownerDocument ||
        globalThis.document;
      return {
        ...firstArg,
        document: doc
      };
    }
    return { document: globalThis.document };
  }

  function createDetailsPanel(firstArg, secondArg) {
    const options = resolveCreateOptions(firstArg, secondArg);
    const document = options.document;
    if (!document || typeof document.createElement !== 'function') {
      throw new Error('createDetailsPanel requires a valid document');
    }

    const isBridgeFallback = Boolean(options._internalFallback);
    const selection = createRequestSelection();
    const initialTab = TABS.includes(options.defaultTab) ? options.defaultTab : 'trace';
    let activeTab = initialTab;
    let currentTurn = null;
    let currentState = {};
    let returnFocus = null;

    const containerTarget = options.container || (!isBridgeFallback ? options.desktopRoot : null);
    const desktop = containerTarget
      ? enhanceNode(containerTarget)
      : element(document, 'aside', 'chat-details-panel');
    if (!desktop.className) desktop.className = 'chat-details-panel';
    setAttr(desktop, 'aria-label', 'Request details');
    setAttr(desktop, 'data-chat-details', '');

    const existingDrawer = !isBridgeFallback
      ? (options.drawerDialog || options.mobileDialog || (document.body ? queryNodes(document.body, '[data-chat-drawer]')[0] : null))
      : null;
    const dialog = existingDrawer
      ? enhanceNode(existingDrawer)
      : element(document, 'dialog', 'chat-details-dialog chat-drawer');
    if (!dialog.className) dialog.className = 'chat-details-dialog chat-drawer';
    setAttr(dialog, 'data-chat-drawer', '');
    setAttr(dialog, 'aria-labelledby', 'chat-details-title');

    const externalMobileContainer = !isBridgeFallback
      ? (options.mobileContainer || (existingDrawer ? queryNodes(existingDrawer, '[data-chat-mobile-details]')[0] : null))
      : null;

    function isMobileViewport() {
      return Boolean(
        options.modalOnly ||
        document.defaultView?.matchMedia?.('(max-width: 900px)')?.matches === true
      );
    }

    function createMountSurface(prefix) {
      const content = element(document, 'div', 'chat-details-content');
      const heading = element(document, 'header', 'chat-details-heading');
      const title = element(document, 'h2', '', 'Request details');
      title.id = prefix ? `${prefix}-details-title` : 'chat-details-title';
      const close = element(document, 'button', 'chat-details-close', 'Close details');
      close.type = 'button';
      setAttr(close, 'data-chat-drawer-close', '');
      heading.append(title, close);

      const identity = element(
        document,
        'p',
        'chat-details-identity',
        'Choose a response to inspect its evidence and activity.'
      );
      setAttr(identity, 'data-details-identity', '');

      const tablist = element(document, 'div', 'chat-details-tabs chat-details-tablist');
      setAttr(tablist, 'role', 'tablist');
      setAttr(tablist, 'aria-label', 'Request telemetry views');

      const buttons = Object.create(null);
      const panels = Object.create(null);

      function handleKeyNav(currentTabName, event) {
        const key = event?.key;
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return;
        if (event._detailsKeyHandled) return;
        event._detailsKeyHandled = true;
        if (typeof event.preventDefault === 'function') event.preventDefault();

        const currentIndex = TABS.indexOf(currentTabName);
        let nextIndex = currentIndex;
        if (key === 'ArrowRight') nextIndex = (currentIndex + 1) % TABS.length;
        else if (key === 'ArrowLeft') nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
        else if (key === 'Home') nextIndex = 0;
        else if (key === 'End') nextIndex = TABS.length - 1;

        const targetTab = TABS[nextIndex];
        setActiveTab(targetTab, false);
        buttons[targetTab]?.focus?.();
      }

      for (const name of TABS) {
        const tabId = prefix ? `${prefix}-${name}-tab` : `chat-${name}-tab`;
        const panelId = prefix ? `${prefix}-${name}-panel` : `chat-${name}-panel`;

        const button = element(document, 'button', 'chat-details-tab', TAB_TITLES[name]);
        button.type = 'button';
        button.id = tabId;
        setAttr(button, 'role', 'tab');
        setAttr(button, 'data-details-tab', name);
        setAttr(button, 'aria-controls', panelId);

        const panel = element(document, 'div', 'chat-details-tab-panel');
        panel.id = panelId;
        panel.tabIndex = 0;
        setAttr(panel, 'role', 'tabpanel');
        setAttr(panel, 'data-details-panel', name);
        setAttr(panel, 'aria-labelledby', tabId);

        button.addEventListener('click', () => setActiveTab(name, false));
        button.addEventListener('keydown', event => handleKeyNav(name, event));

        buttons[name] = button;
        panels[name] = panel;
        tablist.append(button);
      }

      tablist.addEventListener('keydown', event => {
        handleKeyNav(activeTab, event);
      });

      close.addEventListener('click', () => {
        closeDrawer();
      });

      const techStack = element(document, 'section', 'chat-tech-stack');
      setAttr(techStack, 'aria-label', 'Solution architecture and cloud stack');
      setAttr(techStack, 'data-chat-tech-stack', '');
      const techHeader = element(document, 'div', 'chat-tech-stack-header');
      const techTitle = element(document, 'span', 'chat-tech-stack-title', 'Solution stack');
      const techBadge = element(document, 'span', 'chat-tech-stack-region', 'AWS us-east-2 · CF · 11Labs');
      setAttr(techBadge, 'data-tech-stack-badge', '');
      techHeader.append(techTitle, techBadge);
      const techGrid = element(document, 'ul', 'chat-tech-stack-grid');
      const techItems = Object.create(null);
      const SVG_NS = 'http://www.w3.org/2000/svg';
      const stackSpecs = [
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
      ];
      for (const spec of stackSpecs) {
        const li = element(document, 'li', 'chat-tech-stack-item');
        setAttr(li, 'data-tech-service', spec.id);
        setAttr(li, 'data-tech-state', 'idle');
        setAttr(li, 'data-target-tab', spec.tab);
        const iconWrap = element(document, 'span', `chat-tech-icon is-${spec.id}`);
        setAttr(iconWrap, 'aria-hidden', 'true');
        if (typeof document.createElementNS === 'function' && Array.isArray(spec.paths)) {
          const svg = document.createElementNS(SVG_NS, 'svg');
          svg.setAttribute('viewBox', '0 0 24 24');
          svg.setAttribute('width', '16');
          svg.setAttribute('height', '16');
          svg.setAttribute('aria-hidden', 'true');
          svg.setAttribute('focusable', 'false');
          for (const pathSpec of spec.paths) {
            const path = document.createElementNS(SVG_NS, 'path');
            path.setAttribute('d', pathSpec.d);
            if (pathSpec.fill) path.setAttribute('fill', pathSpec.fill);
            if (pathSpec.stroke) path.setAttribute('stroke', pathSpec.stroke);
            if (pathSpec.strokeWidth) path.setAttribute('stroke-width', pathSpec.strokeWidth);
            if (pathSpec.strokeLinecap) path.setAttribute('stroke-linecap', pathSpec.strokeLinecap);
            if (pathSpec.strokeLinejoin) path.setAttribute('stroke-linejoin', pathSpec.strokeLinejoin);
            svg.append(path);
          }
          iconWrap.append(svg);
        } else {
          iconWrap.textContent = spec.glyph;
        }
        const copyWrap = element(document, 'div', 'chat-tech-copy');
        copyWrap.append(
          element(document, 'span', 'chat-tech-name', spec.name),
          element(document, 'span', 'chat-tech-role', spec.role)
        );
        const statusDot = element(document, 'span', 'chat-tech-status-dot');
        setAttr(statusDot, 'aria-hidden', 'true');
        li.append(iconWrap, copyWrap, statusDot);
        li.addEventListener('click', () => {
          setActiveTab(spec.tab, false);
        });
        techItems[spec.id] = li;
        techGrid.append(li);
      }
      techStack.append(techHeader, techGrid);

      content.append(
        heading,
        identity,
        tablist,
        panels.trace,
        panels.evidence,
        panels.tools,
        panels.context,
        techStack
      );

      return { content, identity, tablist, buttons, panels, close, techStack, techBadge, techItems };
    }

    const primarySurface = createMountSurface('');
    const mobileMirrorSurface = externalMobileContainer ? createMountSurface('chat-mobile') : null;
    let customServiceStates = null;

    desktop.replaceChildren(primarySurface.content);
    if (externalMobileContainer) {
      enhanceNode(externalMobileContainer);
      externalMobileContainer.replaceChildren(mobileMirrorSurface.content);
      const externalCloseButtons = queryNodes(dialog, '[data-chat-drawer-close]');
      for (const btn of externalCloseButtons) {
        if (!btn._detailsCloseBound) {
          btn._detailsCloseBound = true;
          btn.addEventListener('click', () => closeDrawer());
        }
      }
    } else if (!isBridgeFallback && document.body && !dialog.parentNode) {
      document.body.append(dialog);
    }

    function computeTurnTechStates(turn) {
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
      if (turn) {
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
        const stageMap = extractStageMap(turn);
        let anyInFlight = false;
        for (const [stageName, services] of Object.entries(stageServices)) {
          const entry = stageMap.get(stageName);
          if (!entry || entry.status === 'skipped') continue;
          const targetState = entry.isStarted || entry.status === 'running' || entry.status === 'started'
            ? 'active'
            : (entry.status === 'degraded' || entry.status === 'failed')
              ? 'degraded'
              : 'completed';
          if (targetState === 'active') anyInFlight = true;
          for (const svc of services) {
            if (states[svc] === 'active') continue;
            if (targetState === 'active') states[svc] = 'active';
            else if (targetState === 'degraded' && states[svc] !== 'active') states[svc] = 'degraded';
            else if (states[svc] === 'idle') states[svc] = 'completed';
          }
        }
        if (anyInFlight) {
          states.aws = 'active';
        }
        const rawCitations = safeGet(turn, 'citations') ?? safeGet(turn, 'claims');
        if (Array.isArray(rawCitations) && rawCitations.length > 0 && states.s3 === 'idle') {
          states.s3 = 'completed';
        }
        const rawCalls = safeGet(turn, 'toolCalls') ?? safeGet(safeGet(turn, 'trace'), 'toolCalls') ?? safeGet(turn, 'tools');
        if (Array.isArray(rawCalls) && rawCalls.length > 0 && states.mcp === 'idle') {
          states.mcp = 'completed';
        }
        if (safeGet(turn, 'voiceActive') === true) {
          states.elevenlabs = 'active';
        } else if (safeGet(turn, 'voiceUsed') === true || safeGet(turn, 'kind') === 'live_voice') {
          if (states.elevenlabs === 'idle') states.elevenlabs = 'completed';
        }
      }
      if (customServiceStates && record(customServiceStates)) {
        for (const key of Object.keys(states)) {
          if (typeof customServiceStates[key] === 'string') {
            states[key] = customServiceStates[key];
          }
        }
      }
      return states;
    }

    function syncSurfaceTechStack(surface, turn) {
      if (!surface || !surface.techItems) return;
      const states = computeTurnTechStates(turn);
      let activeCount = 0;
      let usedCount = 0;
      for (const [id, itemNode] of Object.entries(surface.techItems)) {
        const st = states[id] || 'idle';
        setAttr(itemNode, 'data-tech-state', st);
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
      if (surface.techBadge) {
        if (activeCount > 0) {
          surface.techBadge.textContent = `⚡ Live · ${usedCount}/10 Active`;
          setAttr(surface.techBadge, 'data-stack-live', 'true');
        } else if (usedCount > 0) {
          surface.techBadge.textContent = `${usedCount}/10 Engaged · us-east-2`;
          removeAttr(surface.techBadge, 'data-stack-live');
        } else {
          surface.techBadge.textContent = 'AWS us-east-2 · CF · 11Labs';
          removeAttr(surface.techBadge, 'data-stack-live');
        }
      }
    }

    function syncTabAttributes(surface) {
      if (!surface) return;
      for (const name of TABS) {
        const isSelected = name === activeTab;
        const btn = surface.buttons[name];
        const pnl = surface.panels[name];
        setAttr(btn, 'aria-selected', String(isSelected));
        btn.tabIndex = isSelected ? 0 : -1;
        setHidden(pnl, !isSelected);
      }
    }

    function setActiveTab(tabName, focus = false) {
      if (!TABS.includes(tabName)) return activeTab;
      activeTab = tabName;
      syncTabAttributes(primarySurface);
      syncTabAttributes(mobileMirrorSurface);
      if (focus) {
        const targetSurface = dialog.open && mobileMirrorSurface ? mobileMirrorSurface : primarySurface;
        targetSurface.buttons[activeTab]?.focus?.();
      }
      if (typeof options.onTabChange === 'function') {
        options.onTabChange(activeTab);
      }
      return activeTab;
    }

    function handleReturnLatest() {
      const stateCb = safeGet(currentState, 'onReturnLatest');
      const turnCb = safeGet(currentTurn, 'onReturnLatest');
      if (typeof stateCb === 'function') stateCb();
      if (typeof turnCb === 'function') turnCb();
      if (typeof options.onReturnLatest === 'function') options.onReturnLatest();
      if (selection.latest) {
        selection.select(selection.latest);
        currentTurn = selection.selected;
        currentState = { ...currentState, isPinned: false };
        renderAllSurfaces();
      }
    }

    function renderIntoSurface(surface, isSecondary) {
      if (!surface) return;
      const reqId = cleanId(
        safeGet(currentTurn, 'requestId') ?? safeGet(safeGet(currentTurn, 'trace'), 'requestId'),
        null
      );
      const isPinned = Boolean(
        safeGet(currentState, 'isPinned') ||
        safeGet(currentTurn, 'isPinned') ||
        selection.pinned
      );
      surface.identity.textContent = reqId
        ? `${isPinned ? 'Pinned · ' : ''}Request ${reqId}`
        : 'Choose a response to inspect its evidence and activity.';

      // Note: If primary and secondary surfaces both render a turn with DOM nodes (like view.timeline.element),
      // only attach live DOM nodes on the primary surface unless mobile mirror needs a fresh render.
      const turnForSurface = isSecondary && currentTurn
        ? { ...currentTurn, timeline: undefined, evidence: undefined }
        : currentTurn;

      surface.panels.trace.replaceChildren(
        renderTraceTabContent(document, turnForSurface, { ...currentState, isPinned }, handleReturnLatest)
      );
      surface.panels.evidence.replaceChildren(
        renderEvidenceTabContent(document, turnForSurface)
      );
      surface.panels.tools.replaceChildren(
        renderToolsView(document, turnForSurface)
      );
      surface.panels.context.replaceChildren(
        renderContextView(document, turnForSurface)
      );
      if (currentTurn) {
        const stageMap = extractStageMap(currentTurn);
        let activeStages = 0;
        for (const entry of stageMap.values()) {
          if (entry && entry.status !== 'skipped') activeStages += 1;
        }
        const rawCitations = safeGet(currentTurn, 'citations') ?? safeGet(currentTurn, 'claims');
        const citeCount = Array.isArray(rawCitations) ? rawCitations.filter(record).length : 0;
        const rawCalls = safeGet(currentTurn, 'toolCalls') ?? safeGet(safeGet(currentTurn, 'trace'), 'toolCalls');
        const toolCount = Array.isArray(rawCalls) ? rawCalls.filter(record).length : 0;
        setAttr(surface.buttons.trace, 'data-tab-count', String(activeStages || 8));
        setAttr(surface.buttons.evidence, 'data-tab-count', String(citeCount));
        setAttr(surface.buttons.tools, 'data-tab-count', String(toolCount));
        setAttr(surface.buttons.context, 'data-tab-count', 'CAG');
      } else {
        for (const name of TABS) {
          removeAttr(surface.buttons[name], 'data-tab-count');
        }
      }
      syncSurfaceTechStack(surface, currentTurn);
      syncTabAttributes(surface);
    }

    function renderAllSurfaces() {
      renderIntoSurface(primarySurface, false);
      if (mobileMirrorSurface) {
        renderIntoSurface(mobileMirrorSurface, true);
      }
    }

    function restoreFromDialog() {
      if (!externalMobileContainer && primarySurface.content.parentNode !== desktop) {
        desktop.append(primarySurface.content);
      }
      if (returnFocus && (returnFocus.isConnected !== false)) {
        returnFocus.focus?.();
      }
      if (typeof options.onCloseDrawer === 'function') {
        options.onCloseDrawer();
      }
    }

    function closeDrawer() {
      if (dialog.open) {
        if (typeof dialog.close === 'function') {
          dialog.close();
        } else {
          dialog.open = false;
          removeAttr(dialog, 'open');
          restoreFromDialog();
        }
      } else {
        restoreFromDialog();
      }
    }

    dialog.addEventListener('close', () => {
      restoreFromDialog();
    });

    dialog.addEventListener('cancel', event => {
      if (typeof event?.preventDefault === 'function') event.preventDefault();
      closeDrawer();
    });

    dialog.addEventListener('keydown', event => {
      if (event?.key === 'Escape') {
        if (typeof event.preventDefault === 'function') event.preventDefault();
        closeDrawer();
      }
    });

    document.defaultView?.matchMedia?.('(max-width: 900px)')?.addEventListener?.('change', event => {
      if (!event.matches && !options.modalOnly && dialog.open) {
        closeDrawer();
      }
    });

    function syncMobileDrawer(openOrOptions) {
      const shouldOpen = typeof openOrOptions === 'boolean'
        ? openOrOptions
        : record(openOrOptions) && typeof openOrOptions.open === 'boolean'
          ? openOrOptions.open
          : isMobileViewport();

      if (record(openOrOptions) && openOrOptions.trigger) {
        returnFocus = openOrOptions.trigger;
      }

      renderAllSurfaces();

      if (shouldOpen) {
        if (!externalMobileContainer) {
          setAttr(primarySurface.content, 'data-chat-mobile-details', '');
          dialog.append(primarySurface.content);
        }
        if (!dialog.open) {
          if (typeof dialog.showModal === 'function') dialog.showModal();
          else {
            dialog.open = true;
            setAttr(dialog, 'open', '');
          }
        }
        const activeSurface = mobileMirrorSurface || primarySurface;
        activeSurface.buttons[activeTab]?.focus?.();
      } else if (dialog.open) {
        closeDrawer();
      }
    }

    function renderTurn(turnOrContainer, maybeTurn, maybeState) {
      let turn = turnOrContainer;
      let state = maybeTurn;
      if (turnOrContainer && (typeof turnOrContainer.append === 'function' || typeof turnOrContainer.appendChild === 'function') &&
          !Object.hasOwn(turnOrContainer, 'requestId') && !Object.hasOwn(turnOrContainer, 'trace') && !Object.hasOwn(turnOrContainer, 'timeline')) {
        turn = maybeTurn;
        state = maybeState;
      }
      currentState = record(state) ? state : {};
      if (turn && record(turn)) {
        if (currentState.isPinned === true) {
          currentTurn = turn;
        } else {
          selection.update(turn);
          currentTurn = turn;
        }
      } else {
        currentTurn = null;
      }
      renderAllSurfaces();
      return controller;
    }

    setActiveTab(activeTab, false);
    renderAllSurfaces();

    const controller = Object.freeze({
      element: desktop,
      dialog,
      selection,
      renderTurn,
      setActiveTab,
      activate: setActiveTab,
      getActiveTab() { return activeTab; },
      get activeTab() { return activeTab; },
      setTechStackState(overrides) {
        customServiceStates = record(overrides) ? { ...overrides } : null;
        syncSurfaceTechStack(primarySurface, currentTurn);
        if (mobileMirrorSurface) syncSurfaceTechStack(mobileMirrorSurface, currentTurn);
      },
      update(view, state) {
        if (view) selection.update(view);
        if (!view || selection.selected === view) {
          currentTurn = selection.selected || null;
          currentState = record(state) ? state : { isPinned: selection.pinned };
          renderAllSurfaces();
        }
      },
      open(view, trigger) {
        if (view) {
          selection.select(view);
          currentTurn = selection.selected;
          currentState = { isPinned: selection.pinned };
        }
        returnFocus = trigger || returnFocus;
        renderAllSurfaces();
        if (isMobileViewport()) {
          if (!externalMobileContainer) {
            setAttr(primarySurface.content, 'data-chat-mobile-details', '');
            dialog.append(primarySurface.content);
          }
          if (!dialog.open) {
            if (typeof dialog.showModal === 'function') dialog.showModal();
            else {
              dialog.open = true;
              setAttr(dialog, 'open', '');
            }
          }
          const activeSurface = mobileMirrorSurface || primarySurface;
          activeSurface.buttons[activeTab]?.focus?.();
        } else {
          primarySurface.buttons[activeTab]?.focus?.();
        }
      },
      close: closeDrawer,
      clear() {
        selection.clear();
        currentTurn = null;
        currentState = {};
        customServiceStates = null;
        renderAllSurfaces();
        if (dialog.open) closeDrawer();
      },
      syncMobileDrawer,
      get selected() { return selection.selected ?? currentTurn ?? undefined; },
      get pinned() { return Boolean(selection.pinned || currentState?.isPinned); }
    });

    if (desktop && typeof desktop === 'object') {
      controllersByContainer.set(desktop, controller);
    }
    return controller;
  }

  function renderDetailsPanel(container, turn, state) {
    if (!container || typeof container !== 'object') {
      throw new Error('renderDetailsPanel requires a container element');
    }
    let controller = controllersByContainer.get(container);
    if (!controller) {
      controller = createDetailsPanel({
        document: container.ownerDocument || globalThis.document,
        container
      });
    }
    controller.renderTurn(turn, state);
    return controller;
  }

  function standaloneRenderTurn(containerOrController, turn, state) {
    if (containerOrController && typeof containerOrController.renderTurn === 'function') {
      return containerOrController.renderTurn(turn, state);
    }
    return renderDetailsPanel(containerOrController, turn, state);
  }

  return Object.freeze({
    VERSION,
    TABS,
    TAB_NAMES,
    STAGE_LABELS,
    CANONICAL_STAGE_ORDER,
    TRACE_STAGES,
    TRACE_STATES,
    validateTraceData,
    createRequestSelection,
    createRequestTimeline,
    createDetailsPanel,
    renderDetailsPanel,
    renderTurn: standaloneRenderTurn,
    renderBlock,
    renderSources,
    renderToolsView,
    renderContextView
  });
});
