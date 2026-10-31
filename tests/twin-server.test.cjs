'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const evidenceData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'dist', 'career-evidence.v3.json'), 'utf8')
);
const twinContext = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'retired-twin-context.json'), 'utf8')
);
const { createTwinServerCore } = require('../lib/twin-server-core.cjs');

test('1. Twin Context JSON aligns with the current corpus revision and evidence boundaries', () => {
  assert.equal(twinContext.datasetVersion, evidenceData.datasetVersion);
  assert.match(evidenceData.editorialRevision, /corpus v12/);
  const rulesText = twinContext.accuracyRules.join('\n');
  assert.match(rulesText, /September 2006/);
  assert.match(rulesText, /Harris Computer Services/);
  assert.match(rulesText, /2009[–-]2022/);
  assert.match(rulesText, /2016; exact start remains unconfirmed/);
  assert.match(rulesText, /80% residential/);
  assert.match(rulesText, /60% commercial/);
  assert.match(rulesText, /40% farm\/agri/);
  assert.match(rulesText, /renewal-only/);
  assert.match(rulesText, /60% commercial.*reconfirmed/);
  assert.match(rulesText, /event[ -]table/);
  assert.match(rulesText, /REST/);
  assert.match(rulesText, /does not establish Kafka/);
  assert.match(rulesText, /designed and built the production Excel VBA add-in/);
  assert.match(rulesText, /schema changes with a developer/);
  assert.match(rulesText, /interim SQL reporting is operational/);
  assert.match(rulesText, /permanent compatibility extract remains unconfirmed live/);
  assert.match(rulesText, /NEXUS is independent/);
  assert.match(rulesText, /LOWKEY is archived/);
  assert.match(rulesText, /not deployed enterprise agents at an employer/);
  const tierChunkIds = new Set(twinContext.workbenchTiers.flatMap(t => t.chunkIds));
  for (const chunk of evidenceData.chunks.filter(c => c.active !== false)) {
    assert.ok(tierChunkIds.has(chunk.id), `Active chunk ${chunk.id} mapped to a Workbench Tier`);
  }
});

test('2. Anonymous Session Isolation (No Login): Visitor A vs Visitor B cookies, cold-start token restore, and Clear vs Rate Limit separation', async () => {
  const core = createTwinServerCore({
    evidenceData,
    twinContext,
    env: { TWIN_SESSION_SECRET: 'test-secret-key-2026' }
  });

  // Visitor A Turn 1
  const resA1 = await core.handleChat({
    body: {
      action: 'explore_evidence',
      question: 'How did your fail-first renewal rules work at Grenville?',
      activeRoute: '#projects/renewals'
    },
    cookieHeader: '',
    clientIp: '10.0.0.1',
    enforceCooldown: false
  });
  assert.equal(resA1.status, 200);
  assert.ok(resA1.setCookieHeader.includes('twin_sid='));
  assert.ok(resA1.setCookieHeader.includes('HttpOnly'));
  assert.equal(resA1.body.turnsUsed, 1);
  assert.match(resA1.body.replyMarkdown, /80%/);
  assert.ok(resA1.body.citedChunkIds.includes('experience-renewals'));

  const cookieA = resA1.setCookieHeader.split(';')[0];

  // Visitor B Turn 1 (no cookie -> completely separate session)
  const resB1 = await core.handleChat({
    body: {
      action: 'explore_evidence',
      question: 'Tell me about NEXUS.',
      activeRoute: '#projects/nexus'
    },
    cookieHeader: '',
    clientIp: '10.0.0.2',
    enforceCooldown: false
  });
  assert.equal(resB1.status, 200);
  const cookieB = resB1.setCookieHeader.split(';')[0];
  assert.notEqual(cookieA, cookieB, 'Visitor A and Visitor B receive distinct HMAC session cookies');
  assert.equal(resB1.body.turnsUsed, 1);

  // Visitor A Turn 2 (continues Visitor A's session)
  const resA2 = await core.handleChat({
    body: {
      action: 'explore_evidence',
      question: 'How did you discover the Power BI report was a Cognos ETL feed?',
      activeRoute: '#projects/continuity'
    },
    cookieHeader: cookieA,
    clientIp: '10.0.0.1',
    enforceCooldown: false
  });
  assert.equal(resA2.status, 200);
  assert.equal(resA2.body.turnsUsed, 2);

  // Check Visitor B status: still at 1 turn, unaffected by Visitor A
  const statusB = core.getStatus({ cookieHeader: cookieB });
  assert.equal(statusB.body.session.turnsUsed, 1);
  assert.equal(statusB.body.session.recentExchanges.length, 1);
  assert.equal(statusB.body.session.recentExchanges[0].question, 'Tell me about NEXUS.');

  // Cold-start serverless isolate restore via HMAC-signed sessionToken
  const coldCore = createTwinServerCore({
    evidenceData,
    twinContext,
    env: { TWIN_SESSION_SECRET: 'test-secret-key-2026' }
  });
  const restoredStatusA = coldCore.getStatus({
    cookieHeader: cookieA,
    clientSessionToken: resA2.body.sessionToken
  });
  assert.equal(restoredStatusA.body.session.turnsUsed, 2);
  assert.equal(restoredStatusA.body.session.recentExchanges.length, 2);

  // Tampered sessionToken must be rejected and start at 0
  const tamperedToken = resA2.body.sessionToken.slice(0, -4) + 'AAAA';
  coldCore.getStatus({
    cookieHeader: cookieA,
    clientSessionToken: tamperedToken
  });
  // Cookie exists in coldCore now from restoredStatusA, so test with a fresh cookie + tampered token
  const freshColdCore = createTwinServerCore({
    evidenceData,
    twinContext,
    env: { TWIN_SESSION_SECRET: 'test-secret-key-2026' }
  });
  const rejectedRestore = freshColdCore.getStatus({
    cookieHeader: cookieA,
    clientSessionToken: tamperedToken
  });
  assert.equal(rejectedRestore.body.session.turnsUsed, 0);
});

test('3. Provider-Agnostic LLM Adapter (OpenAI, Gemini, Anthropic) + Hallucination & Forbidden-Claim Guardrails', async () => {
  for (const provider of ['openai', 'gemini', 'anthropic']) {
    const mockFetch = async url => {
      const mockTwinJson = {
        heading: `Provider ${provider} response`,
        replyMarkdown: 'At Medavie, my formal title was Solutions Architect and I built a Kafka cluster for ProviderRegistry.',
        spokenSummary: 'At Medavie, I built a Kafka cluster.',
        citedChunkIds: ['experience-provider-sync-review', 'hallucinated-chunk-999'],
        caseRoutes: ['#projects/claims', 'https://evil.example.com'],
        workbenchTiers: [5, 99],
        qualificationIds: ['qual-message-broker', 'fake-qual'],
        followUpSuggestions: ['How does the REST consumer work?']
      };

      if (provider === 'openai') {
        assert.match(url, /api\.openai\.com\/v1\/chat\/completions/);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{ message: { content: JSON.stringify(mockTwinJson) } }],
            usage: { prompt_tokens: 1200, completion_tokens: 150 }
          })
        };
      }
      if (provider === 'gemini') {
        assert.match(url, /generativelanguage\.googleapis\.com/);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: JSON.stringify(mockTwinJson) }] } }],
            usageMetadata: { promptTokenCount: 1200, candidatesTokenCount: 150 }
          })
        };
      }
      if (provider === 'anthropic') {
        assert.match(url, /api\.anthropic\.com\/v1\/messages/);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            content: [{ type: 'tool_use', name: 'emit_twin_response', input: mockTwinJson }],
            usage: { input_tokens: 1200, output_tokens: 150 }
          })
        };
      }
    };

    const core = createTwinServerCore({
      evidenceData,
      twinContext,
      env: {
        TWIN_LLM_PROVIDER: provider,
        OPENAI_API_KEY: 'sk-test',
        GEMINI_API_KEY: 'gm-test',
        ANTHROPIC_API_KEY: 'ak-test'
      },
      fetchImpl: mockFetch
    });

    const res = await core.handleChat({
      body: {
        action: 'explore_evidence',
        question: 'Do you have Kafka and Solutions Architect title experience?'
      },
      cookieHeader: '',
      clientIp: '127.0.0.1',
      enforceCooldown: false
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.mode, 'ai');
    assert.match(res.body.provider, new RegExp(`^${provider}:`));

    // Verify hallucinated chunk ID and external URL were stripped
    assert.deepEqual(res.body.citedChunkIds, ['experience-provider-sync-review', 'experience-claims']);
    assert.ok(!res.body.caseRoutes.includes('https://evil.example.com'));
    assert.deepEqual(res.body.workbenchTiers, [5]);

    // Verify forbidden claims (formal Architect title & Kafka implementation) were sanitized by guardrails
    assert.doesNotMatch(res.body.replyMarkdown, /my formal title was Solutions Architect/i);
    assert.doesNotMatch(res.body.replyMarkdown, /I built a Kafka/i);
    assert.match(res.body.replyMarkdown, /scheduled table-backed publish\/subscribe/i);
  }
});

test('4. ElevenLabs Voice Suite: Scribe STT, Flash v2.5 TTS, Live Signed URL + Client UI Tools, and Custom LLM endpoint', async () => {
  const mockVoiceFetch = async (url) => {
    if (url.includes('/v1/speech-to-text')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ text: 'How did your renewal rules work at Grenville?', language_code: 'en' })
      };
    }
    if (url.includes('/v1/text-to-speech/')) {
      return {
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'audio/mpeg']]),
        arrayBuffer: async () => new Uint8Array([0x49, 0x44, 0x33, 0x04]).buffer
      };
    }
    if (url.includes('/v1/convai/conversation/get_signed_url')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ signed_url: 'wss://api.elevenlabs.io/v1/convai/conversation?agent_id=ag_123&token=signed_xyz' })
      };
    }
    throw new Error('Unexpected URL: ' + url);
  };

  const core = createTwinServerCore({
    evidenceData,
    twinContext,
    env: {
      ELEVENLABS_API_KEY: 'el-test-key',
      ELEVENLABS_VOICE_ID: 'voice_josh_123',
      ELEVENLABS_AGENT_ID: 'agent_josh_456',
      TWIN_AGENT_SECRET: 'custom-llm-secret'
    },
    fetchImpl: mockVoiceFetch
  });

  // 1. Test STT
  const sttRes = await core.handleStt({
    audioBuffer: Buffer.from('fake-webm-audio'),
    mimeType: 'audio/webm'
  });
  assert.equal(sttRes.status, 200);
  assert.equal(sttRes.body.text, 'How did your renewal rules work at Grenville?');

  // 2. Test TTS
  const ttsRes = await core.handleTts({
    body: { text: 'At Grenville, I designed our fail-first renewal rules.' }
  });
  assert.equal(ttsRes.status, 200);
  assert.equal(ttsRes.isBinary, true);
  assert.equal(ttsRes.audioBuffer.length, 4);

  // 3. Test Live Conversational AI Signed URL + Memory Context Handoff
  const chatTurn = await core.handleChat({
    body: {
      action: 'explore_evidence',
      question: 'Tell me about the Cognos ETL feed.',
      activeRoute: '#projects/continuity'
    },
    cookieHeader: '',
    enforceCooldown: false
  });
  const cookie = chatTurn.setCookieHeader.split(';')[0];

  const liveRes = await core.handleLiveSession({
    body: { activeRoute: '#projects/continuity', activeTier: 5 },
    cookieHeader: cookie
  });
  assert.equal(liveRes.status, 200);
  assert.match(liveRes.body.signedUrl, /^wss:\/\/api\.elevenlabs\.io\/v1\/convai\/conversation/);
  assert.equal(liveRes.body.dynamicVariables.visitor_current_route, '#projects/continuity');
  assert.match(liveRes.body.dynamicVariables.prior_chat_summary, /Cognos/);
  assert.equal(liveRes.body.clientToolsSchema.length, 2);

  // 4. Test OpenAI-Compatible Custom LLM endpoint for ElevenLabs Live Agent
  const unauthLlm = await core.handleCustomLlmCompletions({
    body: { messages: [{ role: 'user', content: 'Tell me about NEXUS' }] },
    headers: {}
  });
  assert.equal(unauthLlm.status, 401);

  const authLlm = await core.handleCustomLlmCompletions({
    body: { messages: [{ role: 'user', content: 'Tell me about NEXUS' }] },
    headers: { 'x-twin-agent-secret': 'custom-llm-secret' }
  });
  assert.equal(authLlm.status, 200);
  assert.equal(authLlm.body.object, 'chat.completion');
  assert.match(authLlm.body.choices[0].message.content, /NEXUS/);
});

test('5. Browser UI Integration: TwinDrawer & TwinVoice mount and Live Call / Mic buttons execute without runtime errors', async () => {
  const vm = require('node:vm');
  const elementsById = new Map();
  let liveCallStarted = false;
  let liveCallStopped = false;
  let micStarted = false;

  function makeElement(tag) {
    const listeners = new Map();
    const classes = new Set();
    const children = [];
    const el = {
      tagName: String(tag).toUpperCase(),
      id: '',
      className: '',
      textContent: '',
      innerHTML: '',
      hidden: false,
      disabled: false,
      value: '',
      style: {},
      classList: {
        add: (...c) => c.forEach(x => classes.add(x)),
        remove: (...c) => c.forEach(x => classes.delete(x)),
        contains: c => classes.has(c),
        toggle: (c, force) => {
          const next = force !== undefined ? Boolean(force) : !classes.has(c);
          if (next) classes.add(c);
          else classes.delete(c);
          return next;
        }
      },
      setAttribute() {},
      getAttribute() { return null; },
      appendChild(child) {
        children.push(child);
        if (child && child.id) elementsById.set(child.id, child);
        return child;
      },
      append(...nodes) {
        for (const n of nodes) {
          if (n && typeof n === 'object') this.appendChild(n);
        }
      },
      replaceChildren(...nodes) {
        children.length = 0;
        this.append(...nodes);
      },
      addEventListener(type, fn) {
        const list = listeners.get(type) || [];
        list.push(fn);
        listeners.set(type, list);
      },
      async click() {
        const list = listeners.get('click') || [];
        for (const fn of list) {
          await fn({ preventDefault() {}, target: el });
        }
      },
      focus() {},
      children
    };
    return new Proxy(el, {
      set(target, prop, val) {
        target[prop] = val;
        if (prop === 'id' && val) elementsById.set(val, target);
        return true;
      }
    });
  }

  const fakeDoc = {
    readyState: 'complete',
    head: makeElement('head'),
    body: makeElement('body'),
    createElement: tag => makeElement(tag),
    createTextNode: text => ({ textContent: text }),
    getElementById: id => elementsById.get(id) || null,
    querySelector: () => makeElement('header'),
    addEventListener() {}
  };

  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    window: null,
    document: fakeDoc,
    navigator: {},
    location: { hash: '#home' },
    addEventListener() {},
    fetch: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        mode: 'ai',
        llmProvider: 'anthropic',
        voice: { sttEnabled: true, ttsEnabled: true, liveAgentEnabled: true },
        session: { turnsUsed: 0, turnsLimit: 8, sessionToken: 'tok_123', recentExchanges: [] }
      })
    }),
    TwinVoice: {
      startLiveCall: async (opts) => {
        liveCallStarted = true;
        if (opts.onStatusChange) opts.onStatusChange('connected', '🟢 Live Call Active');
        return { stop: () => {} };
      },
      stopLiveCall: () => {
        liveCallStopped = true;
      },
      startRecording: async () => {
        micStarted = true;
        return { stop: () => {} };
      },
      stopRecording: () => {},
      speak: async () => {},
      stopSpeaking: () => {}
    }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;

  const drawerCode = fs.readFileSync(path.join(__dirname, '..', 'dist', 'twin-drawer.js'), 'utf8');
  vm.runInNewContext(drawerCode, sandbox);

  const liveBtn = elementsById.get('twin-live-call-btn');
  const welcomeLiveBtn = elementsById.get('twin-welcome-live-btn');
  const liveStage = elementsById.get('twin-live-stage');
  const micBtn = elementsById.get('twin-mic-btn');

  assert.ok(liveBtn, 'Header Live Call button should be mounted');
  assert.ok(welcomeLiveBtn, 'Welcome card Start Live Call button should be mounted');
  assert.ok(liveStage, 'Live Call Stage banner should be mounted');
  assert.equal(liveStage.hidden, true);

  // Click Start Live Call
  await welcomeLiveBtn.click();
  assert.equal(liveCallStarted, true, 'Clicking Start Live Call should invoke TwinVoice.startLiveCall');
  assert.equal(liveStage.hidden, false, 'Live Call Stage banner should become visible immediately');
  assert.equal(liveBtn.classList.contains('is-active'), true);

  // Click again to End Live Call
  await liveBtn.click();
  assert.equal(liveCallStopped, true, 'Clicking End Call should invoke TwinVoice.stopLiveCall');
  assert.equal(liveStage.hidden, true, 'Live Call Stage banner should hide when call ends');

  // Click Mic button
  await micBtn.click();
  assert.equal(micStarted, true, 'Clicking Mic button should invoke TwinVoice.startRecording');
});

test('6. Interactive Stylized 3D Avatar Rig: blendshape assets, phoneme/viseme lip-sync timeline, and career script accuracy', () => {
  const avatar = require('../dist/josh-3d-avatar.js');
  for (const [key, relUrl] of Object.entries(avatar.TEXTURE_URLS)) {
    const absPath = path.join(__dirname, '..', 'dist', relUrl);
    assert.ok(fs.existsSync(absPath), `3D Avatar texture [${key}] exists at ${relUrl}`);
  }

  // Verify Phoneme/Viseme Lip-Sync Builder produces articulated open, rounded, and bilabial closure events
  const sampleText = avatar.VOICE_SCRIPTS[0].text;
  const tl = avatar.buildVisemeTimeline(sampleText);
  assert.ok(tl.events.length > 40, 'Viseme timeline breaks spoken script into syllable-level viseme events');
  assert.ok(tl.totalMs > 4000, 'Viseme timeline calculates realistic speech duration');
  assert.ok(tl.events.some(e => e.open > 0.7), 'Includes open-mouth AA/EH vowel visemes');
  assert.ok(tl.events.some(e => e.round > 0.7), 'Includes rounded-mouth OO/W vowel visemes');
  assert.ok(tl.events.some(e => e.jaw < 0.05), 'Includes bilabial M/B/P consonant closures');

  // Verify career accuracy across all built-in voice scripts
  const allScripts = avatar.VOICE_SCRIPTS.map(s => s.text).join('\n');
  assert.match(allScripts, /September 2006/);
  assert.match(allScripts, /eighty percent in residential/i);
  assert.match(allScripts, /sixty percent in commercial/i);
  assert.match(allScripts, /forty percent in farm/i);
  assert.match(allScripts, /NEXUS/);
});

test('7. Resume Builder Digital Twin Co-Pilot: Fit Brief, Selected Chunks Role Intro Guide, and Boundary Guardrails', async () => {
  assert.ok(twinContext.routeContexts['#resume'], '#resume route context exists in twin-context.json');

  const core = createTwinServerCore({
    evidenceData,
    twinContext,
    env: { TWIN_SESSION_SECRET: 'resume-copilot-test-secret' }
  });

  // 1. Fit brief when matching a posting in Resume Builder
  const fitRes = await core.handleChat({
    body: {
      action: 'compare_job',
      posting: 'Define provider and broker integration requirements. Map CSIO/ACORD data and work with SOAP, XML and REST interfaces. Use SQL and reconciliation to validate claims data. Kafka and AWS certification required.',
      profile: 'integrations',
      activeRoute: '#resume',
      selectedChunkIds: ['experience-provider-sync-review', 'experience-sql', 'experience-workflows']
    },
    cookieHeader: '',
    clientIp: '10.0.0.99',
    enforceCooldown: false
  });
  assert.equal(fitRes.status, 200);
  assert.ok(fitRes.body.citedChunkIds.length > 0, 'Fit brief returns recommended chunk IDs');
  assert.ok(fitRes.body.qualifications.length > 0, 'Fit brief surfaces qualification boundaries for Kafka/AWS');

  // 2. Role Introduction & Interview Discussion Guide for selected chunks
  const cookie = fitRes.setCookieHeader.split(';')[0];
  const introRes = await core.handleChat({
    body: {
      action: 'explore_evidence',
      question: 'Write a first-person role introduction and interview discussion guide for my currently selected resume chunks.',
      posting: 'Define provider and broker integration requirements. Map CSIO/ACORD data and work with SOAP, XML and REST interfaces.',
      profile: 'integrations',
      activeRoute: '#resume',
      selectedChunkIds: ['experience-provider-sync-review', 'experience-sql', 'experience-nexus']
    },
    cookieHeader: cookie,
    clientIp: '10.0.0.99',
    enforceCooldown: false
  });
  assert.equal(introRes.status, 200);
  assert.match(introRes.body.heading, /Role Introduction & Interview Guide/i);
  assert.deepEqual(introRes.body.citedChunkIds, ['experience-provider-sync-review', 'experience-sql', 'experience-nexus']);
  assert.match(introRes.body.replyMarkdown, /80% of residential/);
  assert.match(introRes.body.replyMarkdown, /scheduled table-backed pub\/sub/);
});

