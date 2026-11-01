'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const detailsModulePath = path.join(__dirname, '../dist/chat-request-details.js');
const PortfolioChatDetails = require(detailsModulePath);

// Simulation harness: deterministic in-memory DOM node model for Node.js unit verification.
// Explicitly labeled SIMULATION of browser DOM per user_global §3.
class SimNode {
  constructor(tag, ownerDocument) {
    this.tag = String(tag).toLowerCase();
    this.tagName = this.tag.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.parentNode = null;
    this._textContent = '';
    this.attributes = Object.create(null);
    this.events = Object.create(null);
    this.dataset = Object.create(null);
    this.className = '';
    this.id = '';
    this.tabIndex = -1;
    this.hidden = false;
    this.open = false;
  }

  get textContent() {
    if (this.children.length === 0) return this._textContent;
    return this._textContent + this.children.map(child => child.textContent).join('');
  }

  set textContent(value) {
    this._textContent = value === null || value === undefined ? '' : String(value);
    for (const child of this.children) child.parentNode = null;
    this.children = [];
  }

  set innerHTML(_) {
    throw new Error('Unsafe HTML sink innerHTML is prohibited');
  }

  set outerHTML(_) {
    throw new Error('Unsafe HTML sink outerHTML is prohibited');
  }

  insertAdjacentHTML() {
    throw new Error('Unsafe HTML sink insertAdjacentHTML is prohibited');
  }

  append(...nodes) {
    for (const node of nodes) {
      if (!node) continue;
      if (typeof node.remove === 'function') node.remove();
      this.children.push(node);
      node.parentNode = this;
    }
  }

  appendChild(node) {
    this.append(node);
    return node;
  }

  replaceChildren(...nodes) {
    for (const child of this.children) child.parentNode = null;
    this.children = [];
    this._textContent = '';
    this.append(...nodes);
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.children = this.parentNode.children.filter(child => child !== this);
      this.parentNode = null;
    }
  }

  setAttribute(name, value) {
    const str = String(value);
    this.attributes[name] = str;
    if (name === 'id') this.id = str;
    if (name === 'class') this.className = str;
    if (name === 'hidden') this.hidden = true;
    if (name.startsWith('data-')) {
      const camel = name.slice(5).replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
      this.dataset[camel] = str;
    }
  }

  getAttribute(name) {
    if (name === 'id' && this.id) return this.id;
    if (name === 'class' && this.className) return this.className;
    return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
  }

  hasAttribute(name) {
    if (name === 'hidden') return this.hidden === true || Object.prototype.hasOwnProperty.call(this.attributes, 'hidden');
    return Object.prototype.hasOwnProperty.call(this.attributes, name);
  }

  removeAttribute(name) {
    delete this.attributes[name];
    if (name === 'hidden') this.hidden = false;
    if (name.startsWith('data-')) {
      const camel = name.slice(5).replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
      delete this.dataset[camel];
    }
  }

  addEventListener(name, callback) {
    (this.events[name] ||= []).push(callback);
  }

  dispatch(name, eventInit = {}) {
    let defaultPrevented = false;
    const event = {
      type: name,
      target: eventInit.target || this,
      currentTarget: this,
      preventDefault() { defaultPrevented = true; },
      stopPropagation() { event._stopped = true; },
      get defaultPrevented() { return defaultPrevented; },
      ...eventInit
    };
    for (const callback of this.events[name] || []) {
      callback(event);
    }
    return event;
  }

  click() {
    return this.dispatch('click');
  }

  focus() {
    if (this.ownerDocument) this.ownerDocument.activeElement = this;
  }

  showModal() {
    this.open = true;
    this.setAttribute('open', '');
  }

  close() {
    this.open = false;
    this.removeAttribute('open');
    this.dispatch('close');
  }

  get isConnected() {
    return this.tag === 'body' || this.parentNode?.isConnected === true;
  }

  querySelectorAll(selector) {
    return queryAll(this, selector);
  }

  querySelector(selector) {
    return queryAll(this, selector)[0] || null;
  }
}

function matchesSingleSelector(node, part) {
  if (!node || !part) return false;
  let remaining = part.trim();
  if (!remaining) return false;

  const attrRegex = /\[([a-zA-Z0-9_-]+)(?:="([^"]*)")?\]/g;
  let match;
  while ((match = attrRegex.exec(remaining)) !== null) {
    const attrName = match[1];
    const attrVal = match[2];
    const actual = node.getAttribute(attrName);
    if (attrVal === undefined) {
      if (actual === null && !node.hasAttribute(attrName)) return false;
    } else if (actual !== attrVal) {
      return false;
    }
  }
  remaining = remaining.replace(attrRegex, '');

  const idMatch = remaining.match(/#([a-zA-Z0-9_-]+)/);
  if (idMatch) {
    if ((node.id || node.getAttribute('id')) !== idMatch[1]) return false;
    remaining = remaining.replace(idMatch[0], '');
  }

  const classMatches = [...remaining.matchAll(/\.([a-zA-Z0-9_-]+)/g)];
  if (classMatches.length > 0) {
    const classList = String(node.className || node.getAttribute('class') || '').split(/\s+/).filter(Boolean);
    for (const cm of classMatches) {
      if (!classList.includes(cm[1])) return false;
    }
    remaining = remaining.replace(/\.[a-zA-Z0-9_-]+/g, '');
  }

  if (remaining) {
    if (node.tag !== remaining.toLowerCase()) return false;
  }
  return true;
}

function matchesSelectorChain(node, chainParts) {
  if (!matchesSingleSelector(node, chainParts[chainParts.length - 1])) return false;
  let current = node.parentNode;
  for (let i = chainParts.length - 2; i >= 0; i--) {
    while (current && !matchesSingleSelector(current, chainParts[i])) {
      current = current.parentNode;
    }
    if (!current) return false;
    current = current.parentNode;
  }
  return true;
}

function descendants(node) {
  const result = [];
  for (const child of node.children || []) {
    result.push(child, ...descendants(child));
  }
  return result;
}

function queryAll(rootNode, selector) {
  const groups = String(selector).split(',').map(s => s.trim()).filter(Boolean);
  const all = descendants(rootNode);
  return all.filter(node =>
    groups.some(group => {
      const chain = group.split(/\s+/).filter(Boolean);
      return matchesSelectorChain(node, chain);
    })
  );
}

function createSimDocument(viewportWidth = 1440) {
  let width = viewportWidth;
  const listeners = [];
  const mediaQuery = query => {
    const maxMatch = String(query).match(/max-width:\s*(\d+)px/);
    const limit = maxMatch ? Number(maxMatch[1]) : 900;
    return {
      get matches() {
        return width <= limit;
      },
      addEventListener(name, cb) {
        if (name === 'change') listeners.push({ limit, cb });
      }
    };
  };
  const doc = {
    activeElement: null,
    defaultView: {
      matchMedia: mediaQuery,
      get innerWidth() {
        return width;
      }
    },
    setViewportWidth(newWidth) {
      width = newWidth;
      for (const entry of listeners) {
        entry.cb({ matches: width <= entry.limit });
      }
    },
    createElement(tag) {
      return new SimNode(tag, doc);
    },
    querySelectorAll(selector) {
      return queryAll(doc.body, selector);
    },
    querySelector(selector) {
      return queryAll(doc.body, selector)[0] || null;
    }
  };
  doc.body = doc.createElement('body');
  return doc;
}

function buildPhase4Turn(overrides = {}) {
  return {
    requestId: '11111111-1111-4111-8111-111111111111',
    sessionId: '22222222-2222-4222-8222-222222222222',
    contextPackVersion: 'sha256:f42b9375285ed967b92742982e8c0c2de1692c3d29dadb71ff5e44089cffd9cf',
    providerUsed: 'openai',
    modelUsed: 'gpt-6-luna',
    fallbackUsed: false,
    degraded: {
      active: false,
      reasonCode: null
    },
    retrieval: {
      mode: 'hybrid',
      indexVersion: 'idx-v1-20261031',
      chunkCount: 2
    },
    trace: {
      contextPackVersion: 'sha256:f42b9375285ed967b92742982e8c0c2de1692c3d29dadb71ff5e44089cffd9cf',
      stages: [
        { stage: 'routing', status: 'ok', durationMs: 3, detail: 'Routed to portfolio_rag with MCP case study lookup.' },
        { stage: 'retrieval', status: 'ok', durationMs: 38, detail: 'Hybrid retrieval matched 2 canonical chunks.' },
        { stage: 'mcp', status: 'ok', durationMs: 44, detail: 'Invoked get_case_study over authenticated MCP transport.' },
        { stage: 'context', status: 'ok', durationMs: 2, detail: 'Assembled CAG context pack and retrieved evidence.' },
        { stage: 'budget', status: 'ok', durationMs: 5, detail: 'Reserved 3200 micro-USD across generation and embedding budgets.' },
        { stage: 'provider', status: 'ok', durationMs: 290, detail: 'OpenAI gpt-6-luna completed via Cloudflare AI Gateway.' },
        { stage: 'validation', status: 'ok', durationMs: 4, detail: 'Validated citations and qualification notes against canonical corpus.' },
        { stage: 'settlement', status: 'ok', durationMs: 6, detail: 'Settled 510 micro-USD against reservation.' }
      ]
    },
    citations: [
      {
        id: 'claim-takeover-vba',
        title: 'Guidewire Takeover & Excel VBA Validation Add-In',
        tier: 1,
        sourcePath: '2016–2022 · Grenville Mutual',
        excerpt: 'Josh researched and documented the solution, guided receiving-system changes with developers, and personally designed and built the production Excel VBA add-in.',
        url: 'https://joshboyer.ca/#projects/takeover'
      },
      {
        id: 'claim-nexus-capstone',
        title: 'NEXUS Independent AI Capstone',
        tier: 1,
        sourcePath: '2025–2026 · Independent',
        excerpt: 'NEXUS is the current independent capstone architecture demonstrating scoped context and guardrailed routing.',
        url: '/#projects/nexus'
      }
    ],
    toolCalls: [
      {
        tool: 'get_case_study',
        status: 'ok',
        durationMs: 44,
        inputSummary: 'projectId=takeover',
        resultCount: 1
      },
      {
        tool: 'search_public_evidence',
        status: 'ok',
        durationMs: 19,
        inputSummary: 'facets=[integrations,xml], limit=3',
        resultCount: 2
      }
    ],
    limits: {
      remainingTurns: 7,
      sessionTurnLimit: 8,
      cooldownSeconds: 0,
      budgetStatus: 'ok'
    },
    ...overrides
  };
}

test('RL-01 & RL-02 & RL-03: module exports frozen surface on globalThis.PortfolioChatDetails and contains zero unsafe DOM sinks or mockup fabrications', () => {
  assert.ok(PortfolioChatDetails, 'PortfolioChatDetails must be exported');
  assert.equal(globalThis.PortfolioChatDetails, PortfolioChatDetails);
  assert.deepEqual(PortfolioChatDetails.TABS, ['trace', 'evidence', 'tools', 'context']);
  assert.equal(Object.isFrozen(PortfolioChatDetails.TABS), true);

  const expectedStages = ['routing', 'retrieval', 'mcp', 'context', 'budget', 'provider', 'validation', 'settlement'];
  assert.ok(PortfolioChatDetails.STAGE_LABELS, 'STAGE_LABELS must be exported');
  for (const stage of expectedStages) {
    assert.equal(typeof PortfolioChatDetails.STAGE_LABELS[stage], 'string', `Missing stage label for ${stage}`);
    assert.ok(PortfolioChatDetails.STAGE_LABELS[stage].length > 0);
  }

  for (const fnName of ['createDetailsPanel', 'renderTurn', 'renderDetailsPanel', 'createRequestSelection', 'createRequestTimeline', 'renderBlock', 'renderSources']) {
    assert.equal(typeof PortfolioChatDetails[fnName], 'function', `Expected function ${fnName}`);
  }

  const source = fs.readFileSync(detailsModulePath, 'utf8');
  for (const forbiddenSink of ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'eval(', 'new Function']) {
    assert.equal(source.includes(forbiddenSink), false, `Forbidden DOM/code sink found in source: ${forbiddenSink}`);
  }
  for (const forbiddenMockup of [/\bJEV\b/i, /Claude 3\.8 Sonnet/i, /Web search/i, /1,000,000\+/i, /\$100,000,000/i]) {
    assert.doesNotMatch(source, forbiddenMockup);
  }
});

test('RL-04, RL-05, RL-06, RL-07, RL-08: renders all 4 WAI-ARIA tabs (Trace, Evidence, Tools, Context) with canonical 8-stage telemetry', () => {
  const doc = createSimDocument(1440);
  const container = doc.createElement('aside');
  doc.body.append(container);

  const panel = PortfolioChatDetails.createDetailsPanel({ document: doc, container });
  // Supply stages in non-canonical order to verify canonical ordering enforcement
  const turn = buildPhase4Turn();
  turn.trace.stages = [...turn.trace.stages].reverse();

  panel.renderTurn(turn);

  const tablist = container.querySelector('[role="tablist"]');
  assert.ok(tablist, 'Must render role="tablist"');
  assert.equal(tablist.getAttribute('aria-label'), 'Request telemetry views');

  const tabs = container.querySelectorAll('[role="tab"]');
  assert.equal(tabs.length, 4);
  assert.deepEqual(tabs.map(t => t.getAttribute('data-details-tab')), ['trace', 'evidence', 'tools', 'context']);
  assert.equal(tabs[0].getAttribute('aria-selected'), 'true');
  assert.equal(tabs[0].tabIndex, 0);
  for (let i = 1; i < 4; i++) {
    assert.equal(tabs[i].getAttribute('aria-selected'), 'false');
    assert.equal(tabs[i].tabIndex, -1);
  }

  const panels = container.querySelectorAll('[role="tabpanel"]');
  assert.equal(panels.length, 4);
  assert.deepEqual(panels.map(p => p.getAttribute('data-details-panel')), ['trace', 'evidence', 'tools', 'context']);
  assert.equal(panels[0].hidden, false);
  assert.equal(panels[1].hidden, true);
  assert.equal(panels[2].hidden, true);
  assert.equal(panels[3].hidden, true);

  // Tab 1: Trace
  const traceItems = panels[0].querySelectorAll('.chat-trace-item');
  assert.equal(traceItems.length, 8, 'Must render all 8 canonical trace stages');
  assert.deepEqual(
    traceItems.map(item => item.getAttribute('data-trace-stage')),
    ['routing', 'retrieval', 'mcp', 'context', 'budget', 'provider', 'validation', 'settlement']
  );
  for (const item of traceItems) {
    const badge = item.querySelector('.chat-trace-badge--ok');
    assert.ok(badge, `Expected .chat-trace-badge--ok on stage ${item.getAttribute('data-trace-stage')}`);
  }
  assert.match(panels[0].textContent, /290 ms/);
  assert.match(panels[0].textContent, /Routed to portfolio_rag with MCP case study lookup\./);

  // Tab 2: Evidence
  panel.setActiveTab('evidence');
  assert.equal(panel.getActiveTab(), 'evidence');
  assert.equal(panels[0].hidden, true);
  assert.equal(panels[1].hidden, false);
  assert.match(panels[1].textContent, /Canonical corpus evidence — distinct from model-written reply prose/);
  assert.match(panels[1].textContent, /hybrid/);
  assert.match(panels[1].textContent, /idx-v1-20261031/);
  assert.match(panels[1].textContent, /claim-takeover-vba/);
  assert.match(panels[1].textContent, /Guidewire Takeover & Excel VBA Validation Add-In/);
  assert.match(panels[1].textContent, /Tier 1/);
  assert.match(panels[1].textContent, /2016–2022 · Grenville Mutual/);
  const links = panels[1].querySelectorAll('a');
  assert.equal(links.length, 2);
  assert.equal(links[0].href, 'https://joshboyer.ca/#projects/takeover');
  assert.equal(links[0].rel, 'noopener noreferrer');
  assert.equal(links[1].href, '/#projects/nexus');

  // Tab 3: Tools
  panel.setActiveTab('tools');
  assert.equal(panel.getActiveTab(), 'tools');
  assert.equal(panels[2].hidden, false);
  assert.match(panels[2].textContent, /get_case_study/);
  assert.match(panels[2].textContent, /44 ms/);
  assert.match(panels[2].textContent, /projectId=takeover/);
  assert.match(panels[2].textContent, /search_public_evidence/);
  assert.match(panels[2].textContent, /facets=\[integrations,xml\], limit=3/);

  // Tab 4: Context
  panel.setActiveTab('context');
  assert.equal(panel.getActiveTab(), 'context');
  assert.equal(panels[3].hidden, false);
  assert.match(panels[3].textContent, /sha256:f42b9375285ed967b92742982e8c0c2de1692c3d29dadb71ff5e44089cffd9cf/);
  assert.match(panels[3].textContent, /11111111-1111-4111-8111-111111111111/);
  assert.match(panels[3].textContent, /22222222-2222-4222-8222-222222222222/);
  assert.match(panels[3].textContent, /openai/);
  assert.match(panels[3].textContent, /gpt-6-luna/);
  assert.match(panels[3].textContent, /false/);
  assert.match(panels[3].textContent, /7/);
  assert.match(panels[3].textContent, /8/);
  assert.match(panels[3].textContent, /0s/);
  assert.match(panels[3].textContent, /ok/);
});

test('RL-05, RL-06, RL-07: renders truthful skipped stages, degraded reason banner, and empty states for citations and tools', () => {
  const doc = createSimDocument(1440);
  const container = doc.createElement('aside');
  doc.body.append(container);
  const panel = PortfolioChatDetails.createDetailsPanel({ document: doc, container });

  const generalTurn = buildPhase4Turn({
    fallbackUsed: true,
    providerUsed: 'anthropic',
    modelUsed: 'claude-haiku-5-5',
    degraded: {
      active: true,
      reasonCode: 'retrieval_degraded'
    },
    retrieval: {
      mode: 'skipped',
      indexVersion: 'none',
      chunkCount: 0
    },
    trace: {
      stages: [
        { stage: 'routing', status: 'ok', durationMs: 2, detail: 'Routed to general conversation.' },
        { stage: 'retrieval', status: 'skipped', durationMs: 0, detail: 'Skipped retrieval for general conversation.' },
        { stage: 'mcp', status: 'skipped', durationMs: 0, detail: 'Skipped MCP tools for general conversation.' },
        { stage: 'context', status: 'ok', durationMs: 1, detail: 'Loaded base guardrails.' },
        { stage: 'budget', status: 'ok', durationMs: 4, detail: 'Reserved generation allowance.' },
        { stage: 'provider', status: 'degraded', durationMs: 410, detail: 'Primary timed out; fallback claude-haiku-5-5 succeeded.' },
        { stage: 'validation', status: 'ok', durationMs: 2, detail: 'Validated general conversation response.' },
        { stage: 'settlement', status: 'failed', durationMs: 12, detail: 'Settlement recorded unknown usage retention.' }
      ]
    },
    citations: [],
    toolCalls: []
  });

  panel.renderTurn(generalTurn);

  const tracePanel = container.querySelector('[data-details-panel="trace"]');
  const degradedBanner = tracePanel.querySelector('[data-degraded-banner]');
  assert.ok(degradedBanner, 'Expected degraded banner when turn.degraded.active === true');
  assert.match(degradedBanner.textContent, /retrieval_degraded/);

  assert.ok(tracePanel.querySelector('[data-trace-stage="retrieval"] .chat-trace-badge--skipped'));
  assert.ok(tracePanel.querySelector('[data-trace-stage="mcp"] .chat-trace-badge--skipped'));
  assert.ok(tracePanel.querySelector('[data-trace-stage="provider"] .chat-trace-badge--degraded'));
  assert.ok(tracePanel.querySelector('[data-trace-stage="settlement"] .chat-trace-badge--failed'));

  const evidencePanel = container.querySelector('[data-details-panel="evidence"]');
  assert.match(evidencePanel.textContent, /Canonical corpus evidence — distinct from model-written reply prose/);
  assert.match(evidencePanel.textContent, /No canonical evidence chunks were cited for this turn\./);
  assert.equal(evidencePanel.querySelectorAll('[data-citation-id]').length, 0);

  const toolsPanel = container.querySelector('[data-details-panel="tools"]');
  assert.match(toolsPanel.textContent, /No MCP tools were invoked for this request\./);
  assert.equal(toolsPanel.querySelectorAll('.chat-tool-card').length, 0);
});

test('RL-04: keyboard navigation (ArrowRight, ArrowLeft, Home, End) moves focus, roving tabIndex, and active panel', () => {
  const doc = createSimDocument(1440);
  const container = doc.createElement('aside');
  doc.body.append(container);
  const panel = PortfolioChatDetails.createDetailsPanel({ document: doc, container });
  panel.renderTurn(buildPhase4Turn());

  const tabs = container.querySelectorAll('[role="tab"]');
  const panels = container.querySelectorAll('[role="tabpanel"]');

  tabs[0].focus();
  assert.equal(doc.activeElement, tabs[0]);

  // ArrowRight: trace (0) -> evidence (1)
  tabs[0].dispatch('keydown', { key: 'ArrowRight' });
  assert.equal(panel.getActiveTab(), 'evidence');
  assert.equal(doc.activeElement, tabs[1]);
  assert.equal(tabs[1].tabIndex, 0);
  assert.equal(tabs[0].tabIndex, -1);
  assert.equal(panels[1].hidden, false);
  assert.equal(panels[0].hidden, true);

  // ArrowRight: evidence (1) -> tools (2)
  tabs[1].dispatch('keydown', { key: 'ArrowRight' });
  assert.equal(panel.getActiveTab(), 'tools');
  assert.equal(doc.activeElement, tabs[2]);

  // ArrowRight: tools (2) -> context (3)
  tabs[2].dispatch('keydown', { key: 'ArrowRight' });
  assert.equal(panel.getActiveTab(), 'context');
  assert.equal(doc.activeElement, tabs[3]);

  // ArrowRight wrap: context (3) -> trace (0)
  tabs[3].dispatch('keydown', { key: 'ArrowRight' });
  assert.equal(panel.getActiveTab(), 'trace');
  assert.equal(doc.activeElement, tabs[0]);

  // ArrowLeft wrap: trace (0) -> context (3)
  tabs[0].dispatch('keydown', { key: 'ArrowLeft' });
  assert.equal(panel.getActiveTab(), 'context');
  assert.equal(doc.activeElement, tabs[3]);

  // Home: context (3) -> trace (0)
  tabs[3].dispatch('keydown', { key: 'Home' });
  assert.equal(panel.getActiveTab(), 'trace');
  assert.equal(doc.activeElement, tabs[0]);

  // End: trace (0) -> context (3)
  tabs[0].dispatch('keydown', { key: 'End' });
  assert.equal(panel.getActiveTab(), 'context');
  assert.equal(doc.activeElement, tabs[3]);
});

test('RL-05: older-turn pinning displays pin banner and [data-return-latest] button invokes callback and unpins', () => {
  const doc = createSimDocument(1440);
  const container = doc.createElement('aside');
  doc.body.append(container);

  let returnedToLatest = 0;
  const panel = PortfolioChatDetails.createDetailsPanel({
    document: doc,
    container,
    onReturnLatest: () => { returnedToLatest += 1; }
  });

  const turn1 = buildPhase4Turn({ requestId: '11111111-1111-4111-8111-111111111111' });
  const turn2 = buildPhase4Turn({ requestId: '33333333-3333-4333-8333-333333333333' });

  panel.renderTurn(turn1, { isPinned: false });
  assert.equal(container.querySelector('[data-return-latest]'), null);

  panel.renderTurn(turn2, { isPinned: false });
  // Now user pins older turn1
  panel.renderTurn(turn1, {
    isPinned: true,
    onReturnLatest: () => {
      returnedToLatest += 10;
    }
  });

  const tracePanel = container.querySelector('[data-details-panel="trace"]');
  const returnBtn = tracePanel.querySelector('[data-return-latest]');
  assert.ok(returnBtn, 'Expected [data-return-latest] button when isPinned === true');
  assert.match(returnBtn.textContent, /Return to latest response/);

  returnBtn.click();
  assert.equal(returnedToLatest, 11);
});

test('RL-09: mobile drawer (<dialog class="chat-drawer" data-chat-drawer>) syncs all 4 tabs across 3-point 899/900/901px boundary and closes on Escape or [data-chat-drawer-close]', () => {
  // 3-point boundary check: 899px (mobile), 900px (mobile), 901px (desktop)
  for (const [width, expectedMobile] of [[899, true], [900, true], [901, false]]) {
    const boundaryDoc = createSimDocument(width);
    const boundaryPanel = PortfolioChatDetails.createDetailsPanel(boundaryDoc);
    const trigger = boundaryDoc.createElement('button');
    boundaryDoc.body.append(boundaryPanel.element, trigger);
    const turn = buildPhase4Turn();
    boundaryPanel.open(turn, trigger);
    assert.equal(Boolean(boundaryPanel.dialog.open), expectedMobile, `Viewport ${width}px dialog.open must be ${expectedMobile}`);
    if (boundaryPanel.dialog.open) boundaryPanel.dialog.close();
  }

  // Explicit <dialog class="chat-drawer" data-chat-drawer> with [data-chat-mobile-details] and [data-chat-drawer-close]
  const doc = createSimDocument(390);
  const desktopContainer = doc.createElement('aside');
  const drawerDialog = doc.createElement('dialog');
  drawerDialog.className = 'chat-drawer';
  drawerDialog.setAttribute('data-chat-drawer', '');
  const closeBtn = doc.createElement('button');
  closeBtn.setAttribute('data-chat-drawer-close', '');
  const mobileDetails = doc.createElement('div');
  mobileDetails.setAttribute('data-chat-mobile-details', '');
  drawerDialog.append(closeBtn, mobileDetails);
  doc.body.append(desktopContainer, drawerDialog);

  const triggerBtn = doc.createElement('button');
  doc.body.append(triggerBtn);

  const panel = PortfolioChatDetails.createDetailsPanel({
    document: doc,
    container: desktopContainer,
    mobileContainer: mobileDetails,
    drawerDialog
  });

  panel.renderTurn(buildPhase4Turn());
  panel.syncMobileDrawer({ open: true, trigger: triggerBtn });
  assert.equal(drawerDialog.open, true);

  const mobileTabs = mobileDetails.querySelectorAll('[role="tab"]');
  assert.equal(mobileTabs.length, 4);
  assert.deepEqual(mobileTabs.map(t => t.getAttribute('data-details-tab')), ['trace', 'evidence', 'tools', 'context']);

  // Switching tab inside mobile drawer updates active tab state
  mobileTabs[2].click();
  assert.equal(panel.getActiveTab(), 'tools');
  const mobileToolsPanel = mobileDetails.querySelector('[data-details-panel="tools"]');
  assert.equal(mobileToolsPanel.hidden, false);
  assert.match(mobileToolsPanel.textContent, /get_case_study/);

  // Closing via Escape keydown on dialog
  drawerDialog.dispatch('keydown', { key: 'Escape' });
  assert.equal(drawerDialog.open, false);
  assert.equal(doc.activeElement, triggerBtn);

  // Re-open and close via [data-chat-drawer-close] button click
  panel.syncMobileDrawer({ open: true, trigger: triggerBtn });
  assert.equal(drawerDialog.open, true);
  closeBtn.click();
  assert.equal(drawerDialog.open, false);
  assert.equal(doc.activeElement, triggerBtn);
});

test('RL-03: backwards-compatible createRequestTimeline and createRequestSelection support 8-stage SSE frames and replay', () => {
  const doc = createSimDocument(1440);
  const timeline = PortfolioChatDetails.createRequestTimeline(doc);
  const reqId = '11111111-1111-4111-8111-111111111111';
  const genId = '22222222-2222-4222-8222-222222222222';
  const corpusVersion = 'sha256:' + 'a'.repeat(64);

  const frames = [
    { stage: 'context', state: 'completed', elapsedMs: 1, corpusVersion, claimCount: 14 },
    { stage: 'routing', state: 'completed', elapsedMs: 3, durationMs: 2, routingMode: 'portfolio_mcp', needsRetrieval: true, requestedTools: ['get_case_study'] },
    { stage: 'retrieval', state: 'completed', elapsedMs: 25, durationMs: 22, retrievalMode: 'hybrid', matchedCount: 3, corpusVersion, indexVersion: 'idx-1', embeddingModel: 'text-embedding-3-small' },
    { stage: 'budget', state: 'completed', elapsedMs: 28, durationMs: 3, reservedMicros: 3200, priceVersion: 'prices-v1' },
    { stage: 'mcp', state: 'started', elapsedMs: 30, mcpMethod: 'tools/call', toolName: 'get_case_study', toolCallId: 'tool-1' },
    { stage: 'mcp', state: 'completed', elapsedMs: 65, durationMs: 35, mcpMethod: 'tools/call', toolName: 'get_case_study', toolCallId: 'tool-1', toolOutcome: 'completed' },
    { stage: 'provider', state: 'started', elapsedMs: 66, attempt: 1, provider: 'openai', model: 'gpt-6-luna' },
    { stage: 'provider', state: 'completed', elapsedMs: 266, durationMs: 200, attempt: 1, provider: 'openai', model: 'gpt-6-luna', usageStatus: 'known', inputTokens: 900, outputTokens: 80 },
    { stage: 'validation', state: 'started', elapsedMs: 267, attempt: 1 },
    { stage: 'validation', state: 'completed', elapsedMs: 270, durationMs: 3, attempt: 1, claimCount: 1 },
    { stage: 'settlement', state: 'completed', elapsedMs: 275, durationMs: 5, reservedMicros: 3200, chargedMicros: 450, priceVersion: 'prices-v1', usageStatus: 'known' }
  ];

  frames.forEach((data, idx) => {
    timeline.accept({ schemaVersion: '1.0.0', requestId: reqId, generation: genId, seq: idx + 1, event: 'trace', data });
  });
  timeline.finish('completed');
  assert.equal(timeline.outcome, 'completed');
  assert.match(timeline.element.textContent, /get_case_study/);
  assert.match(timeline.element.textContent, /portfolio_mcp/);
  assert.match(timeline.element.textContent, /gpt-6-luna/);
});

test('RL-02 & RL-10: adversarial inputs, XSS markup, javascript: URLs, prototype pollution, throwing getters, and CANARY_DETAILS secrets fail closed', () => {
  const canary = 'CANARY_DETAILS_9f8e7d6c_SECRET';
  const doc = createSimDocument(1440);
  const container = doc.createElement('aside');
  doc.body.append(container);
  const panel = PortfolioChatDetails.createDetailsPanel({ document: doc, container });

  const hostileCitation = {
    id: 'claim-xss-test',
    title: '<script>alert(1)</script><img src=x onerror=alert(1)>',
    tier: 1,
    sourcePath: '<b>2020</b>',
    excerpt: `<svg onload=alert(1)>Safe excerpt text</svg> ${canary}`,
    url: 'javascript:alert(1)'
  };
  Object.defineProperty(hostileCitation, 'secretGetter', {
    enumerable: true,
    get() {
      throw new Error(canary);
    }
  });

  const hostileTurn = buildPhase4Turn({
    rawPrompt: canary,
    systemPrompt: canary,
    privateReasoning: canary,
    apiKey: `sk-proj-${canary}00000000000000000000`,
    requestId: canary,
    sessionId: `session-${canary}`,
    contextPackVersion: `version-${canary}`,
    providerUsed: canary,
    modelUsed: canary,
    degraded: {
      active: true,
      reasonCode: `reason-${canary}`
    },
    citations: [
      hostileCitation,
      {
        id: 'claim-data-url',
        title: 'Data URL attempt',
        tier: 2,
        sourcePath: '2021',
        excerpt: 'Data URL test',
        url: 'data:text/html,<script>alert(1)</script>'
      },
      {
        id: 'claim-userinfo-url',
        title: 'Userinfo URL attempt',
        tier: 2,
        sourcePath: '2021',
        excerpt: 'Userinfo URL test',
        url: 'https://joshboyer.ca@evil.example/#projects/nexus'
      },
      {
        id: 'claim-valid-url',
        title: 'Valid HTTPS URL',
        tier: 1,
        sourcePath: '2022',
        excerpt: 'Canonical excerpt',
        url: 'https://joshboyer.ca/#projects/nexus'
      }
    ],
    toolCalls: [
      {
        tool: '<script>evilTool()</script>',
        status: 'ok',
        durationMs: 12,
        inputSummary: `<script>alert(1)</script> ${canary}`,
        resultCount: 1,
        jobText: canary
      }
    ]
  });

  // Seeded fuzzing (seed=0x20261031) across 60 hostile variations
  let seed = 0x20261031;
  const nextRand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  const tokens = ['\u0000', '\r\n', '\u2028', '\u2029', '<script>alert(1)</script>', 'javascript:alert(1)', '__proto__', canary];

  for (let i = 0; i < 60; i++) {
    const token = tokens[nextRand() % tokens.length];
    const fuzzed = {
      ...hostileTurn,
      trace: {
        stages: [{ stage: 'routing', status: token, durationMs: -5, detail: `Detail ${token}` }]
      }
    };
    assert.doesNotThrow(() => panel.renderTurn(fuzzed));
  }

  panel.renderTurn(hostileTurn);

  // Verify zero <script>, <img>, <svg>, or <b> elements were created
  for (const tag of ['script', 'img', 'svg', 'b']) {
    assert.equal(container.querySelectorAll(tag).length, 0, `Must never create <${tag}> DOM elements from untrusted text`);
  }

  // Verify literal textContent rendering for <script>alert(1)</script>
  const evidencePanel = container.querySelector('[data-details-panel="evidence"]');
  assert.ok(evidencePanel.textContent.includes('<script>alert(1)</script>'));

  // Verify javascript:, data:, and userinfo URLs were rejected, leaving only the 1 valid https:// URL
  const renderedLinks = evidencePanel.querySelectorAll('a');
  assert.equal(renderedLinks.length, 1);
  assert.equal(renderedLinks[0].href, 'https://joshboyer.ca/#projects/nexus');

  // Verify canary appears NOWHERE in any textContent or attribute across the entire DOM tree
  const allNodes = [container, ...descendants(container)];
  for (const node of allNodes) {
    assert.equal(String(node._textContent || '').includes(canary), false, `Canary leaked in textContent of <${node.tag}>`);
    for (const [attrName, attrVal] of Object.entries(node.attributes)) {
      assert.equal(String(attrVal).includes(canary), false, `Canary leaked in attribute ${attrName} of <${node.tag}>`);
    }
  }
});

test('RL-03 & RL-05: standalone renderTurn(container, turn, state), clear(), object-map stages, and 3-point numeric boundaries', () => {
  const doc = createSimDocument(1440);
  const container = doc.createElement('aside');
  doc.body.append(container);

  const mapTurn = buildPhase4Turn({
    trace: {
      stages: {
        routing: { status: 'ok', durationMs: 0, detail: 'Boundary 0 ms' },
        retrieval: { status: 'ok', durationMs: 1, detail: 'Boundary 1 ms' },
        mcp: { status: 'skipped', durationMs: -1, detail: 'Boundary -1 ms clamped to 0 ms' },
        context: { status: 'ok', durationMs: 59999, detail: 'Boundary 59999 ms' },
        budget: { status: 'ok', durationMs: 60000, detail: 'Boundary 60000 ms' },
        provider: { status: 'degraded', durationMs: 60001, detail: 'Boundary 60001 ms clamped to 60000 ms' },
        validation: { status: 'ok', durationMs: 2, detail: 'Validated' },
        settlement: { status: 'ok', durationMs: 3, detail: 'Settled' }
      }
    },
    limits: {
      remainingTurns: 0,
      sessionTurnLimit: 8,
      cooldownSeconds: 15,
      budgetStatus: 'warning'
    }
  });

  const controller = PortfolioChatDetails.renderTurn(container, mapTurn, { isPinned: false });
  assert.equal(controller.getActiveTab(), 'trace');
  assert.equal(
    container.querySelector('[data-trace-stage="routing"] [data-stage-duration]').textContent,
    '0 ms'
  );
  assert.equal(
    container.querySelector('[data-trace-stage="retrieval"] [data-stage-duration]').textContent,
    '1 ms'
  );
  assert.equal(
    container.querySelector('[data-trace-stage="mcp"] [data-stage-duration]').textContent,
    '0 ms'
  );
  assert.equal(
    container.querySelector('[data-trace-stage="context"] [data-stage-duration]').textContent,
    '59999 ms'
  );
  assert.equal(
    container.querySelector('[data-trace-stage="budget"] [data-stage-duration]').textContent,
    '60000 ms'
  );
  assert.equal(
    container.querySelector('[data-trace-stage="provider"] [data-stage-duration]').textContent,
    '60000 ms'
  );

  controller.setActiveTab('context');
  assert.equal(controller.getActiveTab(), 'context');
  // Re-rendering via standalone renderTurn on the same container preserves activeTab
  PortfolioChatDetails.renderTurn(container, buildPhase4Turn());
  assert.equal(controller.getActiveTab(), 'context');

  // Clear resets selection and returns truthful empty states
  controller.clear();
  assert.equal(controller.selected, undefined);
  assert.match(container.querySelector('[data-details-identity]').textContent, /Choose a response to inspect/);
  assert.match(container.querySelector('[data-details-panel="tools"]').textContent, /No MCP tools were invoked for this request\./);
});

test('D-02 regression: turn.trace passed as an array of { stage, state: "completed", durationMs } points (or turn.tracePoints) renders stages as ok, degraded, or skipped truthfully', () => {
  const doc = createSimDocument(1440);
  const container = doc.createElement('aside');
  doc.body.append(container);
  const panel = PortfolioChatDetails.createDetailsPanel({ document: doc, container });

  const sseTraceArrayTurn = buildPhase4Turn({
    trace: [
      { stage: 'routing', state: 'completed', elapsedMs: 2, durationMs: 2, routingMode: 'portfolio_mcp', needsRetrieval: true },
      { stage: 'retrieval', state: 'started', elapsedMs: 3, retrievalMode: 'hybrid' },
      { stage: 'retrieval', state: 'completed', elapsedMs: 17, durationMs: 14, retrievalMode: 'hybrid', matchedCount: 2 },
      { stage: 'mcp', state: 'started', elapsedMs: 18, mcpMethod: 'tools/call', toolName: 'get_case_study', toolCallId: 'tool-1' },
      { stage: 'mcp', state: 'completed', elapsedMs: 50, durationMs: 32, mcpMethod: 'tools/call', toolName: 'get_case_study', toolCallId: 'tool-1', toolOutcome: 'completed' },
      { stage: 'context', state: 'completed', elapsedMs: 52, durationMs: 2, claimCount: 14 },
      { stage: 'budget', state: 'completed', elapsedMs: 55, durationMs: 3, reservedMicros: 3200, priceVersion: 'prices-v1' },
      { stage: 'provider', state: 'started', elapsedMs: 56, attempt: 1, provider: 'openai', model: 'gpt-6-luna' },
      { stage: 'provider', state: 'completed', elapsedMs: 256, durationMs: 200, attempt: 1, provider: 'openai', model: 'gpt-6-luna' },
      { stage: 'validation', state: 'completed', elapsedMs: 259, durationMs: 3, attempt: 1, claimCount: 1 },
      { stage: 'settlement', state: 'completed', elapsedMs: 264, durationMs: 5, reservedMicros: 3200, chargedMicros: 450, priceVersion: 'prices-v1' }
    ]
  });

  panel.renderTurn(sseTraceArrayTurn);

  const traceItems = container.querySelectorAll('.chat-trace-item');
  assert.equal(traceItems.length, 8);
  for (const item of traceItems) {
    const stageName = item.getAttribute('data-trace-stage');
    assert.equal(item.getAttribute('data-trace-status'), 'ok', `Stage ${stageName} must be ok when state is completed`);
    assert.ok(item.querySelector('.chat-trace-badge--ok'), `Expected .chat-trace-badge--ok on stage ${stageName}`);
  }
  assert.equal(
    container.querySelector('[data-trace-stage="provider"] [data-stage-duration]').textContent,
    '200 ms'
  );
  assert.equal(
    container.querySelector('[data-trace-stage="mcp"] [data-stage-duration]').textContent,
    '32 ms'
  );

  // Also verify retrievalMode: 'degraded' and toolOutcome: 'skipped' inside tracePoints array
  const mixedTracePointsTurn = buildPhase4Turn({
    trace: undefined,
    tracePoints: [
      { stage: 'routing', state: 'completed', elapsedMs: 1, durationMs: 1, routingMode: 'portfolio_rag', needsRetrieval: true },
      { stage: 'retrieval', state: 'completed', elapsedMs: 9, durationMs: 8, retrievalMode: 'degraded', matchedCount: 1 },
      { stage: 'mcp', state: 'completed', elapsedMs: 10, durationMs: 0, mcpMethod: 'tools/list', toolOutcome: 'skipped' },
      { stage: 'context', state: 'completed', elapsedMs: 11, durationMs: 1, claimCount: 14 },
      { stage: 'budget', state: 'completed', elapsedMs: 13, durationMs: 2, reservedMicros: 3200, priceVersion: 'prices-v1' },
      { stage: 'provider', state: 'completed', elapsedMs: 113, durationMs: 100, attempt: 1, provider: 'openai', model: 'gpt-6-luna' },
      { stage: 'validation', state: 'completed', elapsedMs: 115, durationMs: 2, attempt: 1, claimCount: 1 },
      { stage: 'settlement', state: 'completed', elapsedMs: 118, durationMs: 3, reservedMicros: 3200, chargedMicros: 410, priceVersion: 'prices-v1' }
    ]
  });

  panel.update(mixedTracePointsTurn);
  assert.equal(
    container.querySelector('[data-trace-stage="retrieval"]').getAttribute('data-trace-status'),
    'degraded'
  );
  assert.equal(
    container.querySelector('[data-trace-stage="mcp"]').getAttribute('data-trace-status'),
    'skipped'
  );
  assert.equal(
    container.querySelector('[data-trace-stage="provider"]').getAttribute('data-trace-status'),
    'ok'
  );
});

test('D-01 regression: update(view) and chat-assistant bridge never steal mounted view.timeline.element or view.evidence or duplicate mobile details content', () => {
  const doc = createSimDocument(1440);
  const externalTraceHost = doc.createElement('div');
  externalTraceHost.id = 'chat-trace-panel';
  const externalEvidenceHost = doc.createElement('div');
  externalEvidenceHost.id = 'chat-evidence-panel';
  const panelContainer = doc.createElement('aside');
  doc.body.append(externalTraceHost, externalEvidenceHost, panelContainer);

  const timelineEl = doc.createElement('details');
  timelineEl.className = 'chat-request-trace';
  const stageRow = doc.createElement('li');
  stageRow.className = 'chat-trace-stage is-completed';
  stageRow.textContent = 'Request routing Completed';
  timelineEl.append(stageRow);
  externalTraceHost.append(timelineEl);

  const evidenceEl = doc.createElement('div');
  evidenceEl.className = 'chat-evidence-view';
  evidenceEl.textContent = 'Selected public portfolio evidence.';
  externalEvidenceHost.append(evidenceEl);

  const panel = PortfolioChatDetails.createDetailsPanel({ document: doc, container: panelContainer });
  const liveView = {
    requestId: '11111111-1111-4111-8111-111111111111',
    timeline: { element: timelineEl },
    evidence: evidenceEl,
    tracePoints: [
      { stage: 'routing', state: 'completed', elapsedMs: 2, durationMs: 2, routingMode: 'general', needsRetrieval: false }
    ],
    claims: [],
    toolCalls: [],
    contextData: { routingMode: 'general' }
  };

  panel.update(liveView);
  assert.equal(timelineEl.parentNode, externalTraceHost, 'update(view) must never steal timeline.element from its existing parentNode');
  assert.equal(externalTraceHost.children.includes(timelineEl), true);
  assert.equal(evidenceEl.parentNode, externalEvidenceHost, 'update(view) must never steal view.evidence from its existing parentNode');
  assert.equal(externalEvidenceHost.children.includes(evidenceEl), true);

  // Also verify real bridge integration with dist/chat-assistant.js on desktop (1280px) and mobile (390px)
  const chatAssistant = require('../dist/chat-assistant.js');
  const corpus = require('../chat/knowledge/corpus.json');
  const reqId = '11111111-1111-4111-8111-111111111111';
  const genId = '22222222-2222-4222-8222-222222222222';

  for (const width of [1280, 390]) {
    const bridgeDoc = createSimDocument(width);
    const assistantDetails = chatAssistant.createDetailsPanel(bridgeDoc, { detailsModule: PortfolioChatDetails });
    bridgeDoc.body.append(assistantDetails.element);

    const reply = chatAssistant.createAnswerView(bridgeDoc, null, {
      onDetails: (v, trigger) => assistantDetails.open(v, trigger)
    });
    const frames = [
      { event: 'trace', data: { stage: 'routing', state: 'completed', elapsedMs: 2, durationMs: 2, routingMode: 'general', needsRetrieval: false } },
      { event: 'trace', data: { stage: 'retrieval', state: 'completed', elapsedMs: 3, durationMs: 1, retrievalMode: 'skipped', matchedCount: 0, corpusVersion: corpus.corpusVersion } },
      { event: 'trace', data: { stage: 'context', state: 'completed', elapsedMs: 4, durationMs: 1, corpusVersion: corpus.corpusVersion, claimCount: corpus.claims.length } },
      { event: 'trace', data: { stage: 'budget', state: 'completed', elapsedMs: 6, durationMs: 2, reservedMicros: 3200, priceVersion: 'prices-v1' } },
      { event: 'trace', data: { stage: 'provider', state: 'started', elapsedMs: 7, attempt: 1, provider: 'openai', model: 'gpt-6-luna' } },
      { event: 'trace', data: { stage: 'provider', state: 'completed', elapsedMs: 107, durationMs: 100, attempt: 1, provider: 'openai', model: 'gpt-6-luna', usageStatus: 'known', inputTokens: 500, outputTokens: 40 } },
      { event: 'trace', data: { stage: 'validation', state: 'started', elapsedMs: 108, attempt: 1 } },
      { event: 'trace', data: { stage: 'validation', state: 'completed', elapsedMs: 110, durationMs: 2, attempt: 1, claimCount: 0 } },
      { event: 'trace', data: { stage: 'settlement', state: 'completed', elapsedMs: 114, durationMs: 4, reservedMicros: 3200, chargedMicros: 310, priceVersion: 'prices-v1', usageStatus: 'known' } },
      { event: 'conversation', data: { kind: 'general', text: 'Here is a general explanation.', suggestions: [] } },
      { event: 'sources', data: { corpusVersion: corpus.corpusVersion, sources: [] } },
      { event: 'done', data: { outcome: 'completed' } }
    ].map((f, idx) => ({ schemaVersion: '1.0.0', requestId: reqId, generation: genId, seq: idx + 1, ...f }));

    for (const frame of frames) {
      reply.accept(frame);
      assistantDetails.update(reply.view);
    }

    const trigger = reply.view.detailsButton;
    bridgeDoc.body.append(trigger);
    assistantDetails.open(reply.view, trigger);

    const activeSurface = width <= 900 ? assistantDetails.dialog : assistantDetails.element;
    const tracePanel = activeSurface.querySelector('#chat-trace-panel');
    assert.ok(tracePanel, `Expected #chat-trace-panel in active surface at width=${width}`);
    assert.equal(
      reply.view.timeline.element.parentNode,
      tracePanel,
      `reply.view.timeline.element must remain mounted in #chat-trace-panel at width=${width}`
    );
    assert.ok(
      tracePanel.querySelectorAll('.chat-trace-stage').length >= 7,
      `#chat-trace-panel must retain rendered trace stage rows at width=${width}`
    );

    if (width <= 900) {
      const dialogContents = assistantDetails.dialog.querySelectorAll('.chat-details-content');
      assert.equal(dialogContents.length, 1, 'Mobile dialog must contain only a single .chat-details-content surface');
    }
  }
});

test('UI telemetry & Solution Stack live lighting: lights up engaged services, switches tabs on click, and populates stage/tab badges', () => {
  const doc = createSimDocument(1440);
  const container = doc.createElement('aside');
  doc.body.append(container);
  const panel = PortfolioChatDetails.createDetailsPanel({ document: doc, container });

  // Initially all 10 stack components are idle
  const stackItems = container.querySelectorAll('.chat-tech-stack-item');
  assert.equal(stackItems.length, 10);
  for (const item of stackItems) {
    assert.equal(item.getAttribute('data-tech-state'), 'idle');
  }

  // Render an in-flight turn where retrieval is started and routing/budget are completed
  panel.renderTurn({
    requestId: 'req-live-stack-01',
    stages: [
      { stage: 'routing', status: 'ok', durationMs: 2 },
      { stage: 'budget', status: 'ok', durationMs: 3 },
      { stage: 'retrieval', status: 'started', durationMs: 0 },
      { stage: 'mcp', status: 'pending', durationMs: 0 }
    ],
    citations: [],
    tools: []
  });

  const s3Item = container.querySelector('[data-tech-service="s3"]');
  const awsItem = container.querySelector('[data-tech-service="aws"]');
  const ddbItem = container.querySelector('[data-tech-service="dynamodb"]');
  const mcpItem = container.querySelector('[data-tech-service="mcp"]');
  const elevenItem = container.querySelector('[data-tech-service="elevenlabs"]');

  assert.equal(s3Item.getAttribute('data-tech-state'), 'active', 'S3 must be active while retrieval stage is started');
  assert.equal(s3Item.className.includes('is-active'), true);
  assert.equal(awsItem.getAttribute('data-tech-state'), 'active', 'AWS must be active while a stage is in flight');
  assert.equal(ddbItem.getAttribute('data-tech-state'), 'completed', 'DynamoDB must be completed after budget stage completes');
  assert.equal(mcpItem.getAttribute('data-tech-state'), 'idle', 'MCP must remain idle while pending');
  assert.equal(
    container.querySelector('.chat-tech-stack-region').getAttribute('data-stack-live'),
    'true',
    'Header region badge must show data-stack-live="true" while any service is active'
  );

  // Complete the turn with citations and MCP tools
  panel.renderTurn(buildPhase4Turn());
  assert.equal(s3Item.getAttribute('data-tech-state'), 'completed');
  assert.equal(s3Item.className.includes('is-used'), true);
  assert.equal(mcpItem.getAttribute('data-tech-state'), 'completed');
  assert.equal(
    container.querySelector('[data-tech-service="openai"]').getAttribute('data-tech-state'),
    'completed'
  );

  // Voice override lights up ElevenLabs in real time
  panel.setTechStackState({ elevenlabs: 'active', cloudflare: 'active' });
  assert.equal(elevenItem.getAttribute('data-tech-state'), 'active');
  assert.equal(elevenItem.className.includes('is-active'), true);
  panel.setTechStackState({ elevenlabs: 'completed', cloudflare: null });
  assert.equal(elevenItem.getAttribute('data-tech-state'), 'completed');

  // Verify tab counter attributes (preserving exact tab.textContent)
  assert.equal(container.querySelector('[data-details-tab="trace"]').textContent, 'Trace');
  assert.equal(container.querySelector('[data-details-tab="trace"]').getAttribute('data-tab-count'), '8');
  assert.equal(container.querySelector('[data-details-tab="evidence"]').getAttribute('data-tab-count'), '2');
  assert.equal(container.querySelector('[data-details-tab="tools"]').getAttribute('data-tab-count'), '2');

  // Verify stage service badge and proportional bar on trace items
  const providerStage = container.querySelector('[data-trace-stage="provider"]');
  assert.equal(providerStage.getAttribute('data-stage-service'), 'CF AI Gateway · LLM');
  assert.ok(providerStage.getAttribute('style').includes('--stage-pct:'));

  // Clicking a Solution Stack item switches to its associated tab
  s3Item.click();
  assert.equal(panel.getActiveTab(), 'evidence');
  mcpItem.click();
  assert.equal(panel.getActiveTab(), 'tools');
  ddbItem.click();
  assert.equal(panel.getActiveTab(), 'context');
});

test('Live Voice advanced controls & Barge-In: sustained user speech interrupts playback, pre-roll flushes, and HUD controls toggle barge-in/mute/pace', async () => {
  const chatAssistant = require('../dist/chat-assistant.js');
  const doc = createSimDocument(1440);
  doc.defaultView.btoa = str => Buffer.from(str, 'binary').toString('base64');

  const stage = doc.createElement('div');
  stage.setAttribute('data-avatar-stage', '');
  const statusText = doc.createElement('span');
  statusText.setAttribute('data-avatar-status-text', '');
  const voiceControls = doc.createElement('div');
  voiceControls.setAttribute('data-voice-controls', '');
  doc.body.append(stage, statusText, voiceControls);

  const bargeInEvents = [];
  let resolveTtsFetch;
  const voice = chatAssistant.createVoiceController(doc, {
    fetchImpl: () => new Promise(resolve => { resolveTtsFetch = resolve; }),
    onBargeIn: evt => bargeInEvents.push(evt)
  });

  // Auto-mounted Live Voice HUD controls must exist
  const hud = doc.querySelector('[data-voice-live-hud]');
  assert.ok(hud, 'Expected [data-voice-live-hud] to be auto-mounted next to [data-voice-controls]');
  const bargeInBtn = doc.querySelector('[data-voice-bargein-btn]');
  const interruptBtn = doc.querySelector('[data-voice-interrupt-btn]');
  const muteBtn = doc.querySelector('[data-voice-mute-btn]');
  const paceBtn = doc.querySelector('[data-voice-pace-btn]');
  assert.equal(voice.isBargeInEnabled, true);
  assert.equal(interruptBtn.disabled, true, 'Interrupt button must be disabled while idle');

  // Start speaking a turn (TTS synthesis in progress -> voice.isSpeaking() === true)
  const speakBtn = doc.createElement('button');
  voice.speakTurn({ replyText: 'Josh architected this live portfolio platform on AWS us-east-2.' }, speakBtn);
  assert.equal(voice.isSpeaking(), true);
  assert.equal(interruptBtn.disabled, false, 'Interrupt button must enable while speaking/synthesizing');

  // Low-level speaker bleed (RMS 0.015 < 0.052 threshold) or a single transient spike must NOT trigger barge-in
  const bleedFrame = new Float32Array(256).fill(0.015);
  const loudFrame = new Float32Array(256).fill(0.085);
  assert.equal(voice.processMicFrame(bleedFrame, 16000).bargedIn, false);
  assert.equal(voice.processMicFrame(loudFrame, 16000).bargedIn, false);
  assert.equal(voice.processMicFrame(bleedFrame, 16000).bargedIn, false);
  assert.equal(voice.isSpeaking(), true, 'Transient 1-frame spike must not falsely barge in');

  // 3 consecutive frames of intentional user speech (RMS 0.085 >= 0.052) must trigger acoustic barge-in
  assert.equal(voice.processMicFrame(loudFrame, 16000).bargedIn, false);
  assert.equal(voice.processMicFrame(loudFrame, 16000).bargedIn, false);
  const thirdFrame = voice.processMicFrame(loudFrame, 16000);
  assert.equal(thirdFrame.bargedIn, true, '3 consecutive speech frames must trigger acoustic barge-in');
  assert.equal(voice.isSpeaking(), false, 'Playback/synthesis must stop immediately on barge-in');
  assert.equal(voice.bargeInCount, 1);
  assert.equal(bargeInEvents.length, 1);
  assert.equal(bargeInEvents[0].source, 'voice');

  // Toggling Barge-in Off prevents automatic voice barge-in, while manual Interrupt button still barges in
  bargeInBtn.click();
  assert.equal(voice.isBargeInEnabled, false);
  assert.equal(bargeInBtn.getAttribute('aria-pressed'), 'false');

  voice.speakTurn({ replyText: 'Second spoken turn with auto barge-in disabled.' }, speakBtn);
  assert.equal(voice.isSpeaking(), true);
  voice.processMicFrame(loudFrame, 16000);
  voice.processMicFrame(loudFrame, 16000);
  assert.equal(voice.processMicFrame(loudFrame, 16000).bargedIn, false, 'Auto barge-in must not fire when disabled');
  assert.equal(voice.isSpeaking(), true);

  // Clicking manual Interrupt button barges in immediately
  interruptBtn.click();
  assert.equal(voice.isSpeaking(), false, 'Manual interrupt button must halt speech immediately');
  assert.equal(voice.bargeInCount, 2);
  assert.equal(bargeInEvents[1].source, 'button');

  // Mute and Pace controls cycle deterministically
  muteBtn.click();
  assert.equal(voice.isMicMuted, true);
  assert.equal(muteBtn.getAttribute('aria-pressed'), 'true');
  assert.equal(voice.voicePace, 1.0);
  paceBtn.click();
  assert.equal(voice.voicePace, 1.1);
  paceBtn.click();
  assert.equal(voice.voicePace, 0.95);
  paceBtn.click();
  assert.equal(voice.voicePace, 1.0);
  if (resolveTtsFetch) resolveTtsFetch({ ok: false });
});

test('Voice full-response speech preservation & STT conditioning: never drops sentence 3 after the red line, resets non-consecutive speaker bleed, preserves soft consonants via AGC hangover, and normalizes domain transcripts', async () => {
  const chatAssistant = require('../dist/chat-assistant.js');
  const doc = createSimDocument(1440);
  doc.defaultView.btoa = str => Buffer.from(str, 'binary').toString('base64');

  const stage = doc.createElement('div');
  stage.setAttribute('data-avatar-stage', '');
  const statusText = doc.createElement('span');
  statusText.setAttribute('data-avatar-status-text', '');
  const voiceControls = doc.createElement('div');
  voiceControls.setAttribute('data-voice-controls', '');
  doc.body.append(stage, statusText, voiceControls);

  const ttsBodies = [];
  let resolveTtsFetch;
  const voice = chatAssistant.createVoiceController(doc, {
    fetchImpl: (_url, opts) => {
      ttsBodies.push(JSON.parse(opts.body));
      return new Promise(resolve => { resolveTtsFetch = resolve; });
    }
  });

  // 1. Exact 4-sentence reply from live screenshot must preserve 100% of all 4 sentences (including sentence 3 after the red line)
  const exactFourSentenceReply =
    'Josh has spent about twenty years moving from hands-on infrastructure and systems administration into complex insurance integrations and functional analysis. ' +
    'He currently works at Medavie Blue Cross on claims processing and provider registry synchronization, and he’s actively building NEXUS, an independent AI workflow engine. ' +
    'He focuses on bridging business needs with deep technical design, especially in solutions architecture and integration roles. ' +
    'What kind of work or projects are you looking into today?';

  const spokenText = voice.humanizeForSpeech(exactFourSentenceReply);
  assert.ok(
    spokenText.includes('He focuses on bridging business needs with deep technical design, especially in solutions architecture and integration roles.'),
    'humanizeForSpeech must never drop Sentence 3 after the red line'
  );
  assert.ok(
    spokenText.includes('What kind of work or projects are you looking into today?'),
    'humanizeForSpeech must preserve the closing question'
  );
  assert.equal(spokenText.includes('[warmly]'), false, 'humanizeForSpeech must not inject [warmly] stage tags');
  assert.equal(spokenText.includes('[curious]'), false, 'humanizeForSpeech must not inject [curious] stage tags');

  const speakBtn = doc.createElement('button');
  voice.speakTurn({ replyText: exactFourSentenceReply }, speakBtn);
  assert.equal(ttsBodies.length, 1);
  assert.ok(
    ttsBodies[0].text.includes('He focuses on bridging business needs with deep technical design, especially in solutions architecture and integration roles.'),
    'TTS payload must include Sentence 3 in full'
  );

  // 2. Non-consecutive speaker bleed peaks ([loud, loud, quiet, loud, loud]) must reset bargeInConsecutiveFrames to 0 and NEVER cut off speech
  const bleedFrame = new Float32Array(256).fill(0.015);
  const loudFrame = new Float32Array(256).fill(0.085);
  assert.equal(voice.processMicFrame(loudFrame, 16000).bargedIn, false);
  assert.equal(voice.processMicFrame(loudFrame, 16000).bargedIn, false);
  assert.equal(voice.processMicFrame(bleedFrame, 16000).bargedIn, false, 'Quiet frame must reset bargeInConsecutiveFrames to 0');
  assert.equal(voice.processMicFrame(loudFrame, 16000).bargedIn, false);
  assert.equal(voice.processMicFrame(loudFrame, 16000).bargedIn, false, '2 loud frames after a quiet frame must not accumulate to 4 and barge in');
  assert.equal(voice.isSpeaking(), true, 'Non-consecutive speaker bleed spikes must never interrupt active playback');

  if (resolveTtsFetch) resolveTtsFetch({ ok: false });
  voice.triggerBargeIn('manual');

  // 3. Software AGC + 12-frame speech hangover must preserve soft trailing consonants (rms = 0.004) after speech onset instead of zeroing them out
  const vowelFrame = new Float32Array(256);
  const softConsonantFrame = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    vowelFrame[i] = (i % 2 === 0 ? 1 : -1) * 0.025;
    softConsonantFrame[i] = (i % 2 === 0 ? 1 : -1) * 0.004;
  }
  voice.processMicFrame(vowelFrame, 16000);
  const trailingResult = voice.processMicFrame(softConsonantFrame, 16000);
  const decodedTrailing = Buffer.from(trailingResult.pcmBase64, 'base64');
  let nonZeroSamples = 0;
  for (let i = 0; i < decodedTrailing.length; i += 2) {
    if (decodedTrailing.readInt16LE(i) !== 0) nonZeroSamples++;
  }
  assert.ok(nonZeroSamples > 200, `Trailing consonant frame during speech hangover must not be gated to zero (got ${nonZeroSamples} non-zero samples)`);

  // 4. Transcript normalization and multi-word filler rejection
  assert.equal(voice.isValidSpokenInput('Hmm. Hmm.'), false, 'Must reject multi-word filler sequences');
  assert.equal(voice.isValidSpokenInput('Uh, um...'), false, 'Must reject multi-word hesitation fillers');
  assert.equal(voice.isValidSpokenInput('Just tell me a little bit.'), true, 'Must accept genuine conversational turns');

  const normalized = voice.normalizeSpokenTranscript(
    'Tell me about Medivy Blue Cross, Granville Mutual, Cognition plus, S 3 Vectors, Dynamo D B, and content engineering.'
  );
  assert.match(normalized, /Medavie Blue Cross/);
  assert.match(normalized, /Grenville Mutual/);
  assert.match(normalized, /Cognition\+/);
  assert.match(normalized, /S3 Vectors/);
  assert.match(normalized, /DynamoDB/);
  assert.match(normalized, /context engineering/i);
});
