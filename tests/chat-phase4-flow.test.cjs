'use strict';
/* global document, window */

/**
 * Cross-System Browser Functional Qualification — Phase 4 (A21)
 *
 * Drives a real headless Chromium browser via Playwright against the private
 * preview shell (`/chat-preview`), client runtime (`/chat-assistant.js` +
 * `/chat-request-details.js`), binary portrait assets, and contract-validated
 * 8-stage Phase 4 SSE event streams across Desktop (1440x900) and Mobile (390x844).
 *
 * Simulation boundary:
 * - Browser rendering, DOM layout, CSS media queries (`max-width: 900px`),
 *   `<dialog showModal()>`, keyboard focus management, `fetch`, `ReadableStream`
 *   SSE parsing, and `localStorage` run in a REAL headless Chromium process.
 * - The local HTTP server validates every request and SSE frame through the
 *   repository's real `chat/contracts/index.cjs` (`assertValid`, `renderAnswer`,
 *   `createEventValidator`) and canonical `chat/knowledge/corpus.json`.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const contracts = require('../chat/contracts/index.cjs');
const corpus = require('../chat/knowledge/corpus.json');

const REPO_ROOT = path.resolve(__dirname, '..');
const DIST_ROOT = path.join(REPO_ROOT, 'dist');
const PREVIEW_HTML_PATH = path.join(REPO_ROOT, 'services', 'edge', 'chat-preview.html');

const OPERATOR_TOKEN = 'operator-preview-token-phase4-qualification-0001';
const CANARY_BROWSER_SECRET = 'CANARY-BROWSER-SECRET-99182';
const PHASE4_PRICE_VERSION = '2026-10-31-phase4-rag-mcp-v1';
const INDEX_VERSION = '2026-10-31-v12-r1';

const STATIC_ASSETS = Object.freeze({
  '/chat-assistant.css': {
    file: path.join(DIST_ROOT, 'chat-assistant.css'),
    type: 'text/css; charset=utf-8'
  },
  '/chat-assistant.js': {
    file: path.join(DIST_ROOT, 'chat-assistant.js'),
    type: 'text/javascript; charset=utf-8'
  },
  '/chat-request-details.js': {
    file: path.join(DIST_ROOT, 'chat-request-details.js'),
    type: 'text/javascript; charset=utf-8'
  },
  '/chat-evidence.json': {
    file: path.join(DIST_ROOT, 'chat-evidence.json'),
    type: 'application/json; charset=utf-8'
  },
  '/assets/fonts/manrope-latin.woff2': {
    file: path.join(DIST_ROOT, 'assets/fonts/manrope-latin.woff2'),
    type: 'font/woff2'
  },
  '/assets/fonts/plus-jakarta-sans-latin.woff2': {
    file: path.join(DIST_ROOT, 'assets/fonts/plus-jakarta-sans-latin.woff2'),
    type: 'font/woff2'
  },
  '/assets/fonts/ibm-plex-mono-400-latin.woff2': {
    file: path.join(DIST_ROOT, 'assets/fonts/ibm-plex-mono-400-latin.woff2'),
    type: 'font/woff2'
  },
  '/assets/jb-mark.svg': {
    file: path.join(DIST_ROOT, 'assets/jb-mark.svg'),
    type: 'image/svg+xml'
  },
  '/assets/jb-logo-transparent.png': {
    file: path.join(DIST_ROOT, 'assets/jb-logo-transparent.png'),
    type: 'image/png'
  },
  '/assets/personal/josh-portrait-main.jpg': {
    file: path.join(DIST_ROOT, 'assets/personal/josh-portrait-main.jpg'),
    type: 'image/jpeg'
  },
  '/assets/personal/josh-portrait-smiling.jpg': {
    file: path.join(DIST_ROOT, 'assets/personal/josh-portrait-smiling.jpg'),
    type: 'image/jpeg'
  },
  '/assets/skills-mountain-horizon-bg.jpg': {
    file: path.join(DIST_ROOT, 'assets/skills-mountain-horizon-bg.jpg'),
    type: 'image/jpeg'
  },
  '/assets/personal/josh-avatar-idle.mp4': {
    file: path.join(DIST_ROOT, 'assets/personal/josh-avatar-idle.mp4'),
    type: 'video/mp4'
  },
  '/assets/personal/josh-intro-voice.mp3': {
    file: path.join(DIST_ROOT, 'assets/personal/josh-intro-voice.mp3'),
    type: 'audio/mpeg'
  },
  '/assets/optimized-extra/personal/josh-portrait-vest-640.webp': {
    file: path.join(DIST_ROOT, 'assets/optimized-extra/personal/josh-portrait-vest-640.webp'),
    type: 'image/webp'
  }
});

function loadPlaywrightChromium() {
  const candidates = ['playwright-core', 'playwright'];
  const npxCacheRoot = path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx');
  if (fs.existsSync(npxCacheRoot)) {
    for (const entry of fs.readdirSync(npxCacheRoot)) {
      const candidatePath = path.join(npxCacheRoot, entry, 'node_modules', 'playwright-core');
      if (fs.existsSync(candidatePath)) {
        candidates.push(candidatePath);
      }
    }
  }

  let playwrightModule = null;
  for (const modPath of candidates) {
    try {
      playwrightModule = require(modPath);
      break;
    } catch {
      // Try next candidate
    }
  }
  if (!playwrightModule || !playwrightModule.chromium) {
    throw new Error('playwright-core is required to run real headless Chromium qualification tests.');
  }

  let executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '';
  if (!executablePath || !fs.existsSync(executablePath)) {
    const msPlaywrightRoot = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
    if (fs.existsSync(msPlaywrightRoot)) {
      const dirs = fs.readdirSync(msPlaywrightRoot).filter(d => d.startsWith('chromium-')).sort().reverse();
      for (const dir of dirs) {
        const winExe = path.join(msPlaywrightRoot, dir, 'chrome-win64', 'chrome.exe');
        const linuxExe = path.join(msPlaywrightRoot, dir, 'chrome-linux', 'chrome');
        if (fs.existsSync(winExe)) {
          executablePath = winExe;
          break;
        }
        if (fs.existsSync(linuxExe)) {
          executablePath = linuxExe;
          break;
        }
      }
    }
  }

  return {
    chromium: playwrightModule.chromium,
    executablePath: executablePath || undefined
  };
}

function parseCookies(cookieHeader) {
  const map = new Map();
  if (!cookieHeader) return map;
  for (const part of String(cookieHeader).split(';')) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq > 0) {
      map.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
    }
  }
  return map;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', chunk => {
      total += chunk.length;
      if (total > 12288) {
        reject(new Error('Body too large'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function buildPhase4Stream({ requestId, generation, messageText, mode }) {
  const validator = contracts.createEventValidator({ requestId, generation, corpus });
  let seq = 0;
  const frames = [];

  function pushFrame(event, data) {
    const frame = {
      schemaVersion: '1.0.0',
      requestId,
      generation,
      seq: ++seq,
      event,
      data
    };
    validator.accept(frame);
    frames.push(`event: ${event}\ndata: ${JSON.stringify(frame)}\n\n`);
  }

  const cleanReqPrefix = requestId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 12) || 'req';

  if (mode === 'portfolio_mcp') {
    const toolCallId1 = `tool-${cleanReqPrefix}-1`;
    const toolCallId2 = `tool-${cleanReqPrefix}-2`;

    pushFrame('status', { code: 'accepted' });
    pushFrame('trace', {
      stage: 'routing',
      state: 'completed',
      elapsedMs: 2,
      durationMs: 2,
      routingMode: 'portfolio_mcp',
      needsRetrieval: true,
      requestedTools: ['get_case_study', 'search_public_evidence']
    });
    pushFrame('trace', {
      stage: 'budget',
      state: 'completed',
      elapsedMs: 5,
      durationMs: 3,
      reservedMicros: 21864,
      priceVersion: PHASE4_PRICE_VERSION
    });
    pushFrame('status', { code: 'thinking' });
    pushFrame('trace', {
      stage: 'retrieval',
      state: 'started',
      elapsedMs: 7,
      retrievalMode: 'hybrid',
      embeddingModel: 'text-embedding-3-small'
    });
    pushFrame('trace', {
      stage: 'retrieval',
      state: 'completed',
      elapsedMs: 18,
      durationMs: 11,
      retrievalMode: 'hybrid',
      matchedCount: 4,
      corpusVersion: corpus.corpusVersion,
      indexVersion: INDEX_VERSION,
      embeddingModel: 'text-embedding-3-small'
    });
    pushFrame('trace', {
      stage: 'mcp',
      state: 'started',
      elapsedMs: 20,
      attempt: 1,
      mcpMethod: 'tools/call',
      toolName: 'get_case_study',
      toolCallId: toolCallId1
    });
    pushFrame('trace', {
      stage: 'mcp',
      state: 'completed',
      elapsedMs: 29,
      durationMs: 9,
      attempt: 1,
      mcpMethod: 'tools/call',
      toolName: 'get_case_study',
      toolCallId: toolCallId1,
      toolOutcome: 'completed'
    });
    pushFrame('trace', {
      stage: 'mcp',
      state: 'started',
      elapsedMs: 31,
      attempt: 2,
      mcpMethod: 'tools/call',
      toolName: 'search_public_evidence',
      toolCallId: toolCallId2
    });
    pushFrame('trace', {
      stage: 'mcp',
      state: 'completed',
      elapsedMs: 41,
      durationMs: 10,
      attempt: 2,
      mcpMethod: 'tools/call',
      toolName: 'search_public_evidence',
      toolCallId: toolCallId2,
      toolOutcome: 'completed'
    });
    pushFrame('trace', {
      stage: 'context',
      state: 'completed',
      elapsedMs: 44,
      durationMs: 3,
      corpusVersion: corpus.corpusVersion,
      claimCount: 19
    });
    pushFrame('trace', {
      stage: 'provider',
      state: 'started',
      elapsedMs: 46,
      attempt: 1,
      provider: 'openai',
      model: 'gpt-6-luna',
      reservedMicros: 10804
    });
    pushFrame('trace', {
      stage: 'provider',
      state: 'completed',
      elapsedMs: 92,
      durationMs: 46,
      attempt: 1,
      provider: 'openai',
      model: 'gpt-6-luna',
      usageStatus: 'known',
      inputTokens: 100,
      outputTokens: 10,
      cacheReadInputTokens: 0,
      cacheWriteInputTokens: 0,
      reasoningOutputTokens: 0,
      chargedMicros: 25,
      providerRequestId: 'openai-req-p4-browser-01',
      gatewayRequestId: 'cf-gw-p4-browser-01'
    });
    pushFrame('trace', {
      stage: 'validation',
      state: 'started',
      elapsedMs: 94,
      attempt: 1,
      provider: 'openai',
      model: 'gpt-6-luna'
    });
    pushFrame('trace', {
      stage: 'validation',
      state: 'completed',
      elapsedMs: 97,
      durationMs: 3,
      attempt: 1,
      provider: 'openai',
      model: 'gpt-6-luna',
      corpusVersion: corpus.corpusVersion,
      claimCount: 2
    });
    pushFrame('status', { code: 'validating' });
    pushFrame('trace', {
      stage: 'settlement',
      state: 'completed',
      elapsedMs: 102,
      durationMs: 5,
      reservedMicros: 21864,
      chargedMicros: 29,
      priceVersion: PHASE4_PRICE_VERSION
    });

    const rendered = contracts.renderAnswer(
      {
        schemaVersion: '1.0.0',
        corpusVersion: corpus.corpusVersion,
        claimIds: ['claim-experience-takeover', 'claim-experience-claims'],
        noticeCodes: []
      },
      corpus
    );

    pushFrame('conversation', {
      kind: 'portfolio',
      text: 'Josh personally designed and built the production Excel VBA add-in for claims-history validation, XML batch preparation and error reconciliation, and defined provider mappings and scheduled synchronization requirements for Medavie claims adjudication.',
      suggestions: ['How does the Excel VBA add-in handle error reconciliation?']
    });
    for (const block of rendered.blocks) {
      pushFrame('answer_block', block);
    }
    pushFrame('sources', {
      corpusVersion: rendered.corpusVersion,
      sources: rendered.sources
    });
    pushFrame('done', { outcome: 'completed' });
    return frames.join('');
  }

  if (mode === 'degraded_fallback') {
    const toolCallId1 = `tool-${cleanReqPrefix}-1`;

    pushFrame('status', { code: 'accepted' });
    pushFrame('trace', {
      stage: 'routing',
      state: 'completed',
      elapsedMs: 2,
      durationMs: 2,
      routingMode: 'portfolio_mcp',
      needsRetrieval: true,
      requestedTools: ['get_case_study']
    });
    pushFrame('trace', {
      stage: 'budget',
      state: 'completed',
      elapsedMs: 5,
      durationMs: 3,
      reservedMicros: 21864,
      priceVersion: PHASE4_PRICE_VERSION
    });
    pushFrame('status', { code: 'thinking' });
    pushFrame('trace', {
      stage: 'retrieval',
      state: 'started',
      elapsedMs: 7,
      retrievalMode: 'hybrid',
      embeddingModel: 'text-embedding-3-small'
    });
    pushFrame('trace', {
      stage: 'retrieval',
      state: 'failed',
      elapsedMs: 15,
      durationMs: 8,
      retrievalMode: 'degraded',
      embeddingModel: 'text-embedding-3-small',
      code: 'unavailable'
    });
    pushFrame('trace', {
      stage: 'mcp',
      state: 'started',
      elapsedMs: 17,
      attempt: 1,
      mcpMethod: 'tools/call',
      toolName: 'get_case_study',
      toolCallId: toolCallId1
    });
    pushFrame('trace', {
      stage: 'mcp',
      state: 'failed',
      elapsedMs: 25,
      durationMs: 8,
      attempt: 1,
      mcpMethod: 'tools/call',
      toolName: 'get_case_study',
      toolCallId: toolCallId1,
      toolOutcome: 'error',
      code: 'upstream_failure'
    });
    pushFrame('trace', {
      stage: 'context',
      state: 'completed',
      elapsedMs: 28,
      durationMs: 3,
      corpusVersion: corpus.corpusVersion,
      claimCount: 15
    });
    pushFrame('trace', {
      stage: 'provider',
      state: 'started',
      elapsedMs: 30,
      attempt: 1,
      provider: 'openai',
      model: 'gpt-6-luna',
      reservedMicros: 10804
    });
    pushFrame('trace', {
      stage: 'provider',
      state: 'failed',
      elapsedMs: 50,
      durationMs: 20,
      attempt: 1,
      provider: 'openai',
      model: 'gpt-6-luna',
      usageStatus: 'unknown',
      chargedMicros: 10804,
      code: 'upstream_failure'
    });
    pushFrame('trace', {
      stage: 'provider',
      state: 'started',
      elapsedMs: 52,
      attempt: 2,
      provider: 'anthropic',
      model: 'claude-haiku-5-5',
      reservedMicros: 10804
    });
    pushFrame('trace', {
      stage: 'provider',
      state: 'completed',
      elapsedMs: 90,
      durationMs: 38,
      attempt: 2,
      provider: 'anthropic',
      model: 'claude-haiku-5-5',
      usageStatus: 'known',
      inputTokens: 100,
      outputTokens: 10,
      cacheReadInputTokens: 0,
      cacheWriteInputTokens: 0,
      reasoningOutputTokens: 0,
      chargedMicros: 25,
      providerRequestId: 'anthropic-req-p4-browser-02',
      gatewayRequestId: 'cf-gw-p4-browser-02'
    });
    pushFrame('trace', {
      stage: 'validation',
      state: 'started',
      elapsedMs: 92,
      attempt: 2,
      provider: 'anthropic',
      model: 'claude-haiku-5-5'
    });
    pushFrame('trace', {
      stage: 'validation',
      state: 'completed',
      elapsedMs: 95,
      durationMs: 3,
      attempt: 2,
      provider: 'anthropic',
      model: 'claude-haiku-5-5',
      corpusVersion: corpus.corpusVersion,
      claimCount: 1
    });
    pushFrame('status', { code: 'validating' });
    pushFrame('trace', {
      stage: 'settlement',
      state: 'completed',
      elapsedMs: 100,
      durationMs: 5,
      reservedMicros: 21864,
      chargedMicros: 10833,
      priceVersion: PHASE4_PRICE_VERSION
    });

    const rendered = contracts.renderAnswer(
      {
        schemaVersion: '1.0.0',
        corpusVersion: corpus.corpusVersion,
        claimIds: ['claim-experience-takeover'],
        noticeCodes: ['retrieval_degraded', 'tools_unavailable']
      },
      corpus
    );

    pushFrame('conversation', {
      kind: 'portfolio',
      text: 'Using the approved core portfolio context while search and tools are degraded: Josh designed and built the production Excel VBA add-in for claims-history validation and XML batch preparation.',
      suggestions: []
    });
    for (const block of rendered.blocks) {
      pushFrame('answer_block', block);
    }
    pushFrame('sources', {
      corpusVersion: rendered.corpusVersion,
      sources: rendered.sources
    });
    pushFrame('done', { outcome: 'limited' });
    return frames.join('');
  }

  // Default: 'general' mode
  pushFrame('status', { code: 'accepted' });
  pushFrame('trace', {
    stage: 'routing',
    state: 'completed',
    elapsedMs: 2,
    durationMs: 2,
    routingMode: 'general',
    needsRetrieval: false
  });
  pushFrame('trace', {
    stage: 'budget',
    state: 'completed',
    elapsedMs: 4,
    durationMs: 2,
    reservedMicros: 21608,
    priceVersion: PHASE4_PRICE_VERSION
  });
  pushFrame('status', { code: 'thinking' });
  pushFrame('trace', {
    stage: 'retrieval',
    state: 'completed',
    elapsedMs: 6,
    retrievalMode: 'skipped',
    matchedCount: 0,
    corpusVersion: corpus.corpusVersion
  });
  pushFrame('trace', {
    stage: 'context',
    state: 'completed',
    elapsedMs: 8,
    durationMs: 2,
    corpusVersion: corpus.corpusVersion,
    claimCount: 15
  });
  pushFrame('trace', {
    stage: 'provider',
    state: 'started',
    elapsedMs: 10,
    attempt: 1,
    provider: 'openai',
    model: 'gpt-6-luna',
    reservedMicros: 10804
  });
  pushFrame('trace', {
    stage: 'provider',
    state: 'completed',
    elapsedMs: 45,
    durationMs: 35,
    attempt: 1,
    provider: 'openai',
    model: 'gpt-6-luna',
    usageStatus: 'known',
    inputTokens: 80,
    outputTokens: 18,
    cacheReadInputTokens: 0,
    cacheWriteInputTokens: 0,
    reasoningOutputTokens: 0,
    chargedMicros: 25,
    providerRequestId: 'openai-req-p4-browser-gen',
    gatewayRequestId: 'cf-gw-p4-browser-gen'
  });
  pushFrame('trace', {
    stage: 'validation',
    state: 'started',
    elapsedMs: 47,
    attempt: 1,
    provider: 'openai',
    model: 'gpt-6-luna'
  });
  pushFrame('trace', {
    stage: 'validation',
    state: 'completed',
    elapsedMs: 50,
    durationMs: 3,
    attempt: 1,
    provider: 'openai',
    model: 'gpt-6-luna',
    corpusVersion: corpus.corpusVersion,
    claimCount: 0
  });
  pushFrame('status', { code: 'validating' });
  pushFrame('trace', {
    stage: 'settlement',
    state: 'completed',
    elapsedMs: 54,
    durationMs: 4,
    reservedMicros: 21608,
    chargedMicros: 25,
    priceVersion: PHASE4_PRICE_VERSION
  });

  const rendered = contracts.renderAnswer(
    {
      schemaVersion: '1.0.0',
      corpusVersion: corpus.corpusVersion,
      claimIds: [],
      noticeCodes: ['general_knowledge']
    },
    corpus
  );

  pushFrame('conversation', {
    kind: 'general',
    text: 'HTTP/2 multiplexing interleaves frames from multiple logical streams over a single TCP connection so application-layer responses do not block behind a slow stream.',
    suggestions: ['How does QUIC eliminate transport-layer head-of-line blocking?']
  });
  for (const block of rendered.blocks) {
    pushFrame('answer_block', block);
  }
  pushFrame('sources', {
    corpusVersion: rendered.corpusVersion,
    sources: rendered.sources
  });
  pushFrame('done', { outcome: 'completed' });
  return frames.join('');
}

async function withPhase4BrowserServer(run) {
  let sessionGeneration = randomUUID();
  let remainingTurns = 8;
  let clearedCount = 0;
  const receivedMessages = [];

  const server = http.createServer((req, res) => {
    res.setHeader('Connection', 'close');
    void (async () => {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      const pathname = url.pathname;
      const cookies = parseCookies(req.headers.cookie);
      const isAuthenticated = cookies.get('jb_preview_access') === 'granted';

      // Internal and unapproved routes fail closed with 404
      if (
        pathname.startsWith('/api/chat/_') ||
        pathname.startsWith('/__private/chat')
      ) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ schemaVersion: '1.0.0', error: { code: 'unavailable', retryable: false } }));
        return;
      }

      if (pathname === '/api/chat/access' && req.method === 'POST') {
        const body = await readJsonBody(req);
        if (!body || body.token !== OPERATOR_TOKEN) {
          res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ schemaVersion: '1.0.0', error: { code: 'unavailable', retryable: false } }));
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Set-Cookie': 'jb_preview_access=granted; Path=/; HttpOnly; SameSite=Strict'
        });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      if (pathname === '/chat-preview' || pathname === '/chat-preview.html' || pathname === '/') {
        const htmlBytes = fs.readFileSync(PREVIEW_HTML_PATH);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlBytes);
        return;
      }

      if (Object.hasOwn(STATIC_ASSETS, pathname)) {
        const asset = STATIC_ASSETS[pathname];
        const bytes = fs.readFileSync(asset.file);
        res.writeHead(200, { 'Content-Type': asset.type });
        res.end(bytes);
        return;
      }

      // All /api/chat/* endpoints require authentication
      if (!isAuthenticated) {
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ schemaVersion: '1.0.0', error: { code: 'unavailable', retryable: false } }));
        return;
      }

      if (pathname === '/api/chat/config' && req.method === 'GET') {
        const configBody = {
          schemaVersion: '1.0.0',
          available: true,
          capabilities: { chat: true, cag: true, rag: true, mcp: true, voice: false },
          limits: { maxMessageBytes: 8192, maxTurns: 8, maxToolsPerTurn: 2, turnDeadlineMs: 50000 }
        };
        contracts.assertValid('configResponse', configBody);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(configBody));
        return;
      }

      if (pathname === '/api/chat/session' && req.method === 'POST') {
        const body = await readJsonBody(req);
        contracts.assertValid('emptyRequest', body);
        const sessionBody = {
          schemaVersion: '1.0.0',
          generation: sessionGeneration,
          expiresAt: Date.now() + 86400000,
          remainingTurns
        };
        contracts.assertValid('sessionResponse', sessionBody);
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Set-Cookie': 'jb_chat_session=active; Path=/; HttpOnly; SameSite=Strict'
        });
        res.end(JSON.stringify(sessionBody));
        return;
      }

      if (pathname === '/api/chat/session' && req.method === 'DELETE') {
        const body = await readJsonBody(req);
        contracts.assertValid('emptyRequest', body);
        clearedCount += 1;
        sessionGeneration = randomUUID();
        remainingTurns = 8;
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Set-Cookie': 'jb_chat_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'
        });
        res.end(JSON.stringify({ schemaVersion: '1.0.0', cleared: true }));
        return;
      }

      if (pathname === '/api/chat/messages' && req.method === 'POST') {
        const body = await readJsonBody(req);
        contracts.assertValid('messageRequest', body);
        receivedMessages.push(body);
        remainingTurns = Math.max(0, remainingTurns - 1);

        const lower = body.text.toLowerCase();
        const mode = lower.includes('degraded')
          ? 'degraded_fallback'
          : (lower.includes('http/2') || lower.includes('multiplexing'))
            ? 'general'
            : 'portfolio_mcp';

        const ssePayload = buildPhase4Stream({
          requestId: body.requestId,
          generation: sessionGeneration,
          messageText: body.text,
          mode
        });

        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'private, no-store'
        });
        res.end(ssePayload);
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ schemaVersion: '1.0.0', error: { code: 'unavailable', retryable: false } }));
    })();
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const { chromium, executablePath } = loadPlaywrightChromium();
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {})
  });

  try {
    await run({
      baseUrl,
      browser,
      receivedMessages,
      getClearedCount: () => clearedCount
    });
  } finally {
    await browser.close();
    server.closeAllConnections?.();
    await new Promise(resolve => server.close(resolve));
  }
}

test('Phase 4 Browser Flow 1 (Desktop 1440x900): operator login, portrait loading, RAG+MCP turn, 4-tab Request Details, general turn, turn pinning, return-to-latest, and session clear', async () => {
  await withPhase4BrowserServer(async ({ baseUrl, browser, receivedMessages, getClearedCount }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    // 1. Verify internal/unapproved routes fail closed (404) and unauthenticated config returns 401
    const unauthConfig = await page.request.get(`${baseUrl}/api/chat/config`);
    assert.equal(unauthConfig.status(), 401);
    const blockedMcp = await page.request.post(`${baseUrl}/api/chat/_mcp`, {
      data: { jsonrpc: '2.0', id: 1, method: 'tools/list' }
    });
    assert.equal(blockedMcp.status(), 404);
    const blockedProbe = await page.request.post(`${baseUrl}/api/chat/_probe`, {
      data: { provider: 'openai' }
    });
    assert.equal(blockedProbe.status(), 404);
    const blockedPrivate = await page.request.get(`${baseUrl}/__private/chat`);
    assert.equal(blockedPrivate.status(), 404);

    // 2. Navigate to /chat-preview while unauthenticated -> token form [data-chat-access] becomes visible
    await page.goto(`${baseUrl}/chat-preview`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-chat-access]:not([hidden])');
    const initialStatus = await page.textContent('.chat-status');
    assert.equal(initialStatus, 'Private access is required. Sign in above to continue.');

    // Verify portrait image in the left identity rail loaded with natural dimensions > 0
    const portraitLoaded = await page.evaluate(() => {
      const img = document.querySelector('.chat-identity-portrait');
      return Boolean(img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
    });
    assert.equal(portraitLoaded, true);

    // 3. Submit operator token in [data-chat-access] -> reloads into authenticated chat session
    await page.fill('#chat-preview-token', OPERATOR_TOKEN);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('[data-chat-access] button[type="submit"]')
    ]);
    await page.waitForFunction(
      () => document.querySelector('.chat-status')?.textContent === 'Private chat is ready.'
    );

    // 4. Turn 1: Submit Portfolio RAG + MCP question
    const turn1Question = "Tell me about Josh's claims-history loading Excel VBA add-in and Medavie provider sync.";
    await page.fill('#portfolio-chat-question', turn1Question);
    await page.click('.chat-compose button.chat-send[type="submit"]');

    await page.waitForFunction(
      () => document.querySelector('.chat-status')?.textContent === 'Response complete · evidence references validated.'
    );
    assert.equal(receivedMessages.length, 1);
    const turn1RequestId = receivedMessages[0].requestId;

    // Verify Turn 1 center conversation card & footer badges
    const turn1Card = page.locator(`.chat-answer[data-turn-id="${turn1RequestId}"]`);
    await assert.doesNotReject(() => turn1Card.waitFor({ state: 'visible' }));
    const turn1Prose = await turn1Card.locator('.chat-answer-text').textContent();
    assert.ok(turn1Prose.includes('Excel VBA add-in'));
    assert.equal(await turn1Card.locator('[data-evidence-count]').getAttribute('data-evidence-count'), '2');
    assert.equal(await turn1Card.locator('[data-tool-count]').getAttribute('data-tool-count'), '2');
    assert.equal(await turn1Card.locator('[data-retrieval-badge]').getAttribute('data-retrieval-badge'), 'hybrid');
    assert.equal(await turn1Card.locator('[data-model-badge]').getAttribute('data-model-badge'), 'gpt-6-luna');

    // Verify right-hand Request Details panel is visible on Desktop and tracks Turn 1
    const detailsIdentity = await page.textContent('[data-chat-selected-turn]');
    assert.equal(detailsIdentity, `Request ${turn1RequestId}`);
    const pinBannerHiddenTurn1 = await page.$eval('.chat-details-pin-banner', el => el.hidden);
    assert.equal(pinBannerHiddenTurn1, true);

    // Tab 1: Trace — verify all 8 Phase 4 stages render in order (with 2 MCP tool attempts = 9 rows)
    const traceStageNames = await page.$$eval(
      '#chat-trace-panel .chat-trace-stage .chat-trace-stage-name',
      els => els.map(el => el.textContent.trim())
    );
    assert.deepEqual(traceStageNames, [
      'Request routing',
      'Spending reservation',
      'RAG Retrieval',
      'MCP Tools · get_case_study · attempt 1',
      'MCP Tools · search_public_evidence · attempt 2',
      'Approved context',
      'Model request · attempt 1',
      'Answer validation · attempt 1',
      'Usage settlement'
    ]);
    const tracePanelText = await page.textContent('#chat-trace-panel');
    assert.ok(tracePanelText.includes('Portfolio tools (MCP) (portfolio_mcp)'));
    assert.ok(tracePanelText.includes('Hybrid (vector + lexical) (hybrid)'));
    assert.ok(tracePanelText.includes(INDEX_VERSION));
    assert.ok(tracePanelText.includes('0.021864'));
    assert.ok(tracePanelText.includes('0.000029'));

    // Tab 2: Evidence — click Evidence tab and verify canonical claims, qualification notes, and source links
    await page.click('#chat-evidence-tab');
    assert.equal(await page.getAttribute('#chat-evidence-tab', 'aria-selected'), 'true');
    assert.equal(await page.$eval('#chat-evidence-panel', el => el.hidden), false);
    const evidenceText = await page.textContent('#chat-evidence-panel');
    assert.ok(evidenceText.includes('Excel VBA add-in'));
    assert.ok(
      evidenceText.includes('Requirements, mappings and support do not imply sole service development or a Kafka implementation.')
    );
    const sourceHrefs = await page.$$eval('#chat-evidence-panel .chat-sources a', links => links.map(a => a.href));
    assert.deepEqual(sourceHrefs, [
      'https://joshboyer.ca/#projects/takeover',
      'https://joshboyer.ca/#projects/claims'
    ]);

    // Tab 3: Tools — click Tools tab and verify both MCP tool calls
    await page.click('#chat-tools-tab');
    assert.equal(await page.getAttribute('#chat-tools-tab', 'aria-selected'), 'true');
    const toolMethods = await page.$$eval('#chat-tools-panel .chat-tool-method', els => els.map(e => e.textContent.trim()));
    assert.deepEqual(toolMethods, [
      'Get case study (get_case_study)',
      'Search public evidence (search_public_evidence)'
    ]);
    const toolOutcomes = await page.$$eval('#chat-tools-panel .chat-tool-outcome', els => els.map(e => e.textContent.trim()));
    assert.deepEqual(toolOutcomes, ['Completed', 'Completed']);

    // Tab 4: Context — click Context tab and verify routing, retrieval, index version, matched count, and remaining turns
    await page.click('#chat-context-tab');
    assert.equal(await page.getAttribute('#chat-context-tab', 'aria-selected'), 'true');
    const contextText = await page.textContent('#chat-context-panel');
    assert.ok(contextText.includes('Portfolio-grounded'));
    assert.ok(contextText.includes('Portfolio tools (MCP)'));
    assert.ok(contextText.includes('Hybrid (vector + lexical)'));
    assert.ok(contextText.includes(INDEX_VERSION));
    assert.ok(contextText.includes('8 of 8 turns remaining'));

    // 5. Turn 2: Submit General conversation question -> Request Details follows latest automatically
    await page.fill(
      '#portfolio-chat-question',
      'Explain how HTTP/2 multiplexing prevents head-of-line blocking.'
    );
    await page.click('.chat-compose button.chat-send[type="submit"]');

    await page.waitForFunction(
      () => document.querySelectorAll('.chat-answer').length === 2 &&
        document.querySelector('.chat-status')?.textContent === 'Response complete.'
    );
    assert.equal(receivedMessages.length, 2);
    const turn2RequestId = receivedMessages[1].requestId;
    assert.notEqual(turn2RequestId, turn1RequestId);

    const turn2Card = page.locator(`.chat-answer[data-turn-id="${turn2RequestId}"]`);
    assert.equal(await turn2Card.locator('[data-retrieval-badge]').getAttribute('data-retrieval-badge'), 'skipped');
    assert.equal(await turn2Card.locator('[data-model-badge]').getAttribute('data-model-badge'), 'gpt-6-luna');
    assert.equal(await turn2Card.locator('[data-evidence-count]').count(), 0);
    assert.equal(await turn2Card.locator('[data-tool-count]').count(), 0);

    // Verify Request Details automatically moved to Turn 2
    assert.equal(await page.textContent('[data-chat-selected-turn]'), `Request ${turn2RequestId}`);
    const turn2ContextText = await page.textContent('#chat-context-panel');
    assert.ok(turn2ContextText.includes('General conversation'));
    assert.ok(turn2ContextText.includes('Skipped'));
    assert.ok(turn2ContextText.includes('7 of 8 turns remaining'));

    // 6. Pin Turn 1 via its [data-turn-select] button and verify pin banner + Turn 1 telemetry
    await page.click(`button[data-turn-select="${turn1RequestId}"]`);
    assert.equal(await page.textContent('[data-chat-selected-turn]'), `Pinned · Request ${turn1RequestId}`);
    assert.equal(await page.$eval('.chat-details-pin-banner', el => el.hidden), false);
    assert.equal(await page.getAttribute(`button[data-turn-select="${turn1RequestId}"]`, 'aria-pressed'), 'true');
    assert.equal(await page.getAttribute(`button[data-turn-select="${turn2RequestId}"]`, 'aria-pressed'), 'false');

    const pinnedContextText = await page.textContent('#chat-context-panel');
    assert.ok(pinnedContextText.includes('Portfolio-grounded'));
    assert.ok(pinnedContextText.includes('Portfolio tools (MCP)'));

    // 7. Click [data-return-latest] -> unpins and returns Request Details to Turn 2
    await page.click('button[data-return-latest]');
    assert.equal(await page.textContent('[data-chat-selected-turn]'), `Request ${turn2RequestId}`);
    assert.equal(await page.$eval('.chat-details-pin-banner', el => el.hidden), true);
    assert.equal(await page.getAttribute(`button[data-turn-select="${turn2RequestId}"]`, 'aria-pressed'), 'true');

    // 7b. Verify Simple / Engineer / Detailed mode pills transform the live DOM in Chromium
    await page.click('button[data-mode-pill="simple"]');
    assert.equal(await page.getAttribute('.chat-shell', 'data-view-mode'), 'simple');
    assert.equal(await page.$eval('[data-live-pipeline]', el => el.classList.contains('is-collapsed')), true);
    assert.equal(await page.getAttribute('.chat-details-panel', 'data-active-tab'), 'evidence');

    await page.click('button[data-mode-pill="engineer"]');
    assert.equal(await page.getAttribute('.chat-shell', 'data-view-mode'), 'engineer');
    assert.equal(await page.$eval('[data-live-pipeline]', el => el.classList.contains('is-collapsed')), false);
    assert.equal(await page.$eval('.chat-tech-stack', el => el.classList.contains('is-stack-expanded')), true);
    assert.equal(await page.getAttribute('.chat-details-panel', 'data-active-tab'), 'context');

    await page.click('button[data-mode-pill="detailed"]');
    assert.equal(await page.getAttribute('.chat-shell', 'data-view-mode'), 'detailed');
    assert.equal(await page.getAttribute('.chat-details-panel', 'data-active-tab'), 'trace');

    // 8. Click "Clear chat" -> invokes DELETE /api/chat/session, clears DOM turns, hides showcase, and clears localStorage
    await page.click('.chat-heading .chat-text-button');
    await page.waitForFunction(
      () => document.querySelector('.chat-status')?.textContent === 'Conversation cleared. Your next question starts a new session.'
    );
    assert.equal(getClearedCount(), 1);
    assert.equal(await page.locator('.chat-answer').count(), 0);
    assert.equal(await page.$eval('.chat-welcome', el => el.hidden), false);
    assert.equal(await page.$eval('.chat-welcome', el => el.classList.contains('is-cleared')), true);
    assert.equal(await page.$eval('.chat-welcome-showcase', el => el.hidden), true);
    const storedAfterClear = await page.evaluate(() => localStorage.getItem('joshboyer_private_chat_history_v1'));
    assert.equal(storedAfterClear, null);

    await context.close();
  });
});

test('Phase 4 Browser Flow 2 (Mobile 390x844): degraded S3/MCP + Anthropic fallback turn, modal <dialog data-chat-drawer> lifecycle, keyboard tab navigation, Escape close, focus restoration, and canary redaction', async () => {
  await withPhase4BrowserServer(async ({ baseUrl, browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();

    // Sign in via API on the page context and open /chat-preview at 390x844
    await page.goto(`${baseUrl}/chat-preview`, { waitUntil: 'networkidle' });
    await page.fill('#chat-preview-token', OPERATOR_TOKEN);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('[data-chat-access] button[type="submit"]')
    ]);
    await page.waitForFunction(
      () => document.querySelector('.chat-status')?.textContent === 'Private chat is ready.'
    );

    // Submit degraded / fallback turn
    await page.fill(
      '#portfolio-chat-question',
      'Test degraded retrieval and MCP fallback for policy takeover.'
    );
    await page.click('.chat-compose button.chat-send[type="submit"]');

    await page.waitForFunction(
      () => document.querySelector('.chat-status')?.textContent === 'Response complete · evidence references validated.'
    );

    // Verify fallback model badge ("claude-haiku-5-5 · fallback") and degraded retrieval badge ("RAG: degraded")
    const modelBadgeText = await page.textContent('[data-model-badge]');
    assert.equal(modelBadgeText, 'claude-haiku-5-5 · fallback');
    assert.equal(await page.getAttribute('[data-retrieval-badge]', 'data-retrieval-badge'), 'degraded');

    // Click "View details" on mobile (390x844 <= 900px) -> opens <dialog data-chat-drawer> modal
    await page.click('button[data-turn-select]');
    const isDialogOpen = await page.$eval('dialog[data-chat-drawer]', el => el.open);
    assert.equal(isDialogOpen, true);

    // Verify focus is on #chat-trace-tab inside the open mobile dialog and navigate tabs with ArrowRight / End / Home
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'chat-trace-tab');
    const traceText = await page.textContent('dialog[data-chat-drawer] #chat-trace-panel');
    assert.ok(traceText.includes('Degraded'));
    assert.ok(traceText.includes('claude-haiku-5-5'));

    // ArrowRight -> Evidence tab
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'chat-evidence-tab');
    assert.equal(await page.getAttribute('#chat-evidence-tab', 'aria-selected'), 'true');
    const evidenceNotices = await page.textContent('dialog[data-chat-drawer] #chat-evidence-panel');
    assert.ok(evidenceNotices.includes('Search is running with reduced capability'));
    assert.ok(evidenceNotices.includes('The portfolio tools are unavailable'));

    // ArrowRight -> Tools tab
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'chat-tools-tab');
    const toolsText = await page.textContent('dialog[data-chat-drawer] #chat-tools-panel');
    assert.ok(toolsText.includes('Get case study (get_case_study)'));
    assert.ok(toolsText.includes('Error'));

    // End -> Context tab, Home -> Trace tab
    await page.keyboard.press('End');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'chat-context-tab');
    await page.keyboard.press('Home');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'chat-trace-tab');

    // Press Escape -> closes <dialog data-chat-drawer> and restores focus to the trigger button[data-turn-select]
    await page.keyboard.press('Escape');
    const isDialogClosed = await page.$eval('dialog[data-chat-drawer]', el => el.open);
    assert.equal(isDialogClosed, false);
    const focusedHasTurnSelect = await page.evaluate(
      () => document.activeElement?.hasAttribute('data-turn-select') === true
    );
    assert.equal(focusedHasTurnSelect, true);

    // Exercise PortfolioChatDetails.renderDetailsPanel directly in Chromium with a hostile canary + javascript: URL
    const canaryCheck = await page.evaluate(canary => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      window.PortfolioChatDetails.renderDetailsPanel(host, {
        requestId: '11111111-2222-4333-8444-555555555555',
        degraded: { active: true, reasonCode: 'retrieval_degraded' },
        citations: [
          {
            id: 'claim-experience-takeover',
            title: `Takeover ${canary}`,
            excerpt: `Excerpt with secret ${canary}`,
            url: 'javascript:alert(1)'
          }
        ],
        toolCalls: [
          {
            tool: 'get_case_study',
            status: 'ok',
            durationMs: 12,
            inputSummary: `Summary ${canary}`
          }
        ]
      });
      const html = host.innerHTML;
      const hasUnsafeLink = Boolean(host.querySelector('a[href^="javascript:"]'));
      const hasDegradedBanner = Boolean(host.querySelector('[data-degraded-banner="true"]'));
      host.remove();
      return {
        leakedCanary: html.includes(canary),
        redactedPresent: html.includes('[REDACTED]'),
        hasUnsafeLink,
        hasDegradedBanner
      };
    }, CANARY_BROWSER_SECRET);

    assert.equal(canaryCheck.leakedCanary, false);
    assert.equal(canaryCheck.redactedPresent, true);
    assert.equal(canaryCheck.hasUnsafeLink, false);
    assert.equal(canaryCheck.hasDegradedBanner, true);

    await context.close();
  });
});
