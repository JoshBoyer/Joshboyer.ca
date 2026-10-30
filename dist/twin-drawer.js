/* Context-Aware Governed Digital Twin Slide-Over Drawer for JoshBoyer.ca
 * Integrates:
 *  - Server-side /api/twin/chat (OpenAI / Gemini / Claude + Session Working Memory)
 *  - Local deterministic fallback via CareerGuide & ResumeEngine
 *  - ElevenLabs Voice (Scribe STT, Flash v2.5 TTS, and Live Conversational AI via TwinVoice)
 *  - Real-time UI Co-Navigation (#projects/* case studies & 3D Hero Workbench tiers)
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.TwinDrawer = api;
    if (typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => api.mount(), { once: true });
      } else {
        api.mount();
      }
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  let mounted = false;
  let isOpen = false;
  let evidenceData = null;
  let twinContext = null;
  let localSession = null;
  let sessionToken = '';
  let activeTier = null;
  let autoSpeak = true;
  let isRecording = false;
  let isLiveCallActive = false;
  let serverCapabilities = {
    reachable: false,
    mode: 'rule-based',
    llmProvider: 'local-deterministic',
    voice: { sttEnabled: true, ttsEnabled: true, liveAgentEnabled: true },
    turnsUsed: 0,
    turnsLimit: 8
  };

  const el = (tag, text, cls) => {
    const n = document.createElement(tag);
    if (text !== undefined && text !== null) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  };

  function currentRouteHash() {
    if (typeof window === 'undefined') return '#home';
    const h = (window.location.hash || '#home').replace(/\/+$/, '');
    return h || '#home';
  }

  function getRouteContext(hash = currentRouteHash()) {
    if (!twinContext || !twinContext.routeContexts) {
      return {
        label: 'Portfolio Overview',
        starters: [
          'Walk me through your career arc from hardware to AI.',
          'How did your fail-first renewal rules work at Grenville?',
          'Tell me about discovering the Cognos ETL feed at Medavie.'
        ]
      };
    }
    return twinContext.routeContexts[hash] || twinContext.routeContexts['#home'];
  }

  function executeUiClientTool(toolName, params = {}) {
    if (typeof window === 'undefined') return 'No window';
    if (toolName === 'open_case_study' && params.route) {
      window.location.hash = params.route;
      return `Opened ${params.route}`;
    }
    if (toolName === 'focus_workbench_layer' && params.tier) {
      const tierNum = Number(params.tier);
      activeTier = tierNum;
      const tierBtn = document.querySelector(`[data-phase-go="${tierNum - 1}"], [data-tier-index="${tierNum - 1}"]`);
      if (tierBtn) tierBtn.click();
      return `Focused Workbench Tier ${tierNum}`;
    }
    return 'Completed';
  }

  function mount() {
    if (mounted || typeof document === 'undefined' || !document.body) return;
    // Only mount the floating drawer on index.html (not inside /career-guide or /resume)
    if (document.body.classList.contains('guide-tool') || document.getElementById('twin-drawer')) return;
    mounted = true;

    // 1. Floating Action Pill (FAB) — no duplicate button in the top-right header
    const fab = el('button', undefined, 'twin-fab');
    fab.id = 'twin-launcher-btn';
    fab.type = 'button';
    fab.setAttribute('aria-label', 'Ask Josh’s AI Representative');
    fab.setAttribute('aria-haspopup', 'dialog');
    fab.setAttribute('aria-controls', 'twin-drawer');
    fab.innerHTML = `
      <img src="assets/optimized/personal/josh-avatar-3d-smile-144.webp" alt="" class="twin-fab-avatar">
      <div class="twin-fab-copy">
        <strong class="twin-fab-title">Ask Josh's AI</strong>
        <span class="twin-fab-subtitle" data-twin-fab-subtitle>How can I help?</span>
      </div>
      <span class="twin-fab-chat-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
      </span>
    `;
    fab.addEventListener('click', () => openDrawer());
    document.body.appendChild(fab);
    // Contextual Subtitle on Scroll per Section + Auto-hide FAB when Mega Footer is in view
    const syncFooterFabVisibility = () => {
      const footerEl = document.getElementById('home-connect');
      if (footerEl) {
        const fRect = footerEl.getBoundingClientRect();
        fab.classList.toggle('is-footer-visible', fRect.top < window.innerHeight - 100);
      }
    };
    syncFooterFabVisibility();
    window.addEventListener('scroll', () => {
      syncFooterFabVisibility();
      const subEl = document.querySelector('[data-twin-fab-subtitle]');
      if (!subEl) return;
      if (document.body.getAttribute('data-active-route') === 'home') {
        subEl.textContent = 'How can I help?';
        return;
      }
      const y = window.scrollY;
      if (y < 700) {
        subEl.textContent = 'Ask about this work';
      } else if (y < 1600) {
        subEl.textContent = 'Ask about these projects';
      } else if (y < 2300) {
        subEl.textContent = 'Explore my career';
      } else if (y < 3000) {
        subEl.textContent = 'Explain capabilities';
      } else if (y < 3400) {
        subEl.textContent = 'Ask about my background';
      } else {
        subEl.textContent = 'How can I help?';
      }
    }, { passive: true });


    // 3. Backdrop & Drawer DOM
    const backdrop = el('div', undefined, 'twin-backdrop');
    backdrop.id = 'twin-backdrop';
    backdrop.hidden = true;
    backdrop.addEventListener('click', () => closeDrawer());

    const drawer = el('aside', undefined, 'twin-drawer');
    drawer.id = 'twin-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'false');
    drawer.setAttribute('aria-labelledby', 'twin-drawer-title');
    drawer.hidden = true;

    // Header
    const header = el('header', undefined, 'twin-drawer-header');
    const titleWrap = el('div', undefined, 'twin-drawer-title-wrap');
    const title = el('h2', 'Josh Boyer · Digital Twin');
    title.id = 'twin-drawer-title';
    title.tabIndex = -1;
    const subtitle = el('p', undefined, 'twin-drawer-subtitle');
    const modePill = el('span', 'Governed Evidence Twin', 'twin-mode-pill');
    modePill.id = 'twin-mode-pill';
    const turnNote = el('span', '0 / 8 turns');
    turnNote.id = 'twin-turn-count';
    subtitle.append(modePill, turnNote);
    titleWrap.append(title, subtitle);

    const closeBtn = el('button', '✕', 'twin-close-btn');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close Digital Twin drawer');
    closeBtn.addEventListener('click', () => closeDrawer());
    header.append(titleWrap, closeBtn);

    // Context & Voice Controls Bar
    const contextBar = el('div', undefined, 'twin-context-bar');
    const contextLabel = el('div', undefined, 'twin-context-label');
    contextLabel.id = 'twin-context-label';
    contextLabel.innerHTML = 'Context: <strong>Portfolio Overview</strong>';

    const voiceControls = el('div', undefined, 'twin-voice-controls');
    const autoSpeakBtn = el('button', undefined, 'twin-voice-btn');
    autoSpeakBtn.id = 'twin-autospeak-btn';
    autoSpeakBtn.type = 'button';
    autoSpeakBtn.setAttribute('aria-pressed', 'true');
    autoSpeakBtn.title = 'Automatically speak twin replies using ElevenLabs TTS (or browser voice fallback)';
    autoSpeakBtn.textContent = '🔊 Voice On';
    autoSpeakBtn.addEventListener('click', () => {
      autoSpeak = !autoSpeak;
      autoSpeakBtn.setAttribute('aria-pressed', String(autoSpeak));
      autoSpeakBtn.textContent = autoSpeak ? '🔊 Voice On' : '🔈 Voice Off';
      if (!autoSpeak && root.TwinVoice) root.TwinVoice.stopSpeaking();
    });

    const liveCallBtn = el('button', undefined, 'twin-voice-btn is-live-call');
    liveCallBtn.id = 'twin-live-call-btn';
    liveCallBtn.type = 'button';
    liveCallBtn.setAttribute('aria-pressed', 'false');
    liveCallBtn.title = 'Start two-way live voice conversation via ElevenLabs Conversational AI';
    liveCallBtn.textContent = '🎙️ Live Call';
    liveCallBtn.addEventListener('click', () => toggleLiveCall());

    voiceControls.append(autoSpeakBtn, liveCallBtn);
    contextBar.append(contextLabel, voiceControls);

    // Conversation Body
    const body = el('div', undefined, 'twin-drawer-body');
    body.id = 'twin-drawer-body';
    body.setAttribute('role', 'log');
    body.setAttribute('aria-live', 'polite');

    // Active Live Call Stage Banner (visible during a live voice call)
    const liveStage = el('section', undefined, 'twin-live-stage');
    liveStage.id = 'twin-live-stage';
    liveStage.hidden = true;
    const liveOrb = el('div', '🎙️', 'twin-live-orb');
    liveOrb.id = 'twin-live-orb';
    const liveMeta = el('div', undefined, 'twin-live-stage-meta');
    const liveStageTitle = el('strong', 'Live Voice Call · Josh’s Digital Twin');
    liveStageTitle.id = 'twin-live-stage-title';
    const liveStageStatus = el('span', 'Connecting to ElevenLabs Conversational AI…');
    liveStageStatus.id = 'twin-live-stage-status';
    liveMeta.append(liveStageTitle, liveStageStatus);
    const liveEndBtn = el('button', '⏹ End Call', 'twin-live-end-btn');
    liveEndBtn.id = 'twin-live-end-btn';
    liveEndBtn.type = 'button';
    liveEndBtn.addEventListener('click', () => toggleLiveCall());
    liveStage.append(liveOrb, liveMeta, liveEndBtn);
    body.appendChild(liveStage);

    const welcomeCard = el('section', undefined, 'twin-welcome-card');
    welcomeCard.id = 'twin-welcome-card';
    welcomeCard.append(
      el('h3', 'Ask me about my work, architecture decisions, or role fit.'),
      el('p', 'Every answer is grounded in my approved career corpus (2006–present) with inspectable evidence receipts and explicit boundaries—just like NEXUS.')
    );

    const liveCtaRow = el('div', undefined, 'twin-live-cta-row');
    const liveCtaText = el('div', undefined, 'twin-live-cta-text');
    liveCtaText.append(
      el('strong', 'Prefer talking out loud?'),
      el('span', 'Two-way real-time voice via ElevenLabs Conversational AI')
    );
    const startCallCta = el('button', '🎙️ Start Live Call', 'twin-start-call-cta');
    startCallCta.id = 'twin-welcome-live-btn';
    startCallCta.type = 'button';
    startCallCta.addEventListener('click', () => toggleLiveCall());
    liveCtaRow.append(liveCtaText, startCallCta);
    welcomeCard.appendChild(liveCtaRow);

    const startersBox = el('div', undefined, 'twin-starters');
    startersBox.id = 'twin-starters';
    welcomeCard.appendChild(startersBox);
    body.appendChild(welcomeCard);

    const logContainer = el('div', undefined, 'twin-log-items');
    logContainer.id = 'twin-log-items';
    body.appendChild(logContainer);

    // Footer Composer
    const footer = el('div', undefined, 'twin-drawer-footer');

    // Optional Job Posting Accordion inside Drawer
    const postingDetails = el('details', undefined, 'twin-posting-drawer');
    postingDetails.id = 'twin-posting-drawer';
    const postingSummary = el('summary', '+ Compare a job posting or generate a tailored resume');
    const postingTextarea = el('textarea');
    postingTextarea.id = 'twin-posting-input';
    postingTextarea.maxLength = 12000;
    postingTextarea.placeholder = 'Paste a job description (20–12,000 chars) to compare against my verified experience or generate a canonical resume…';
    const postingActions = el('div', undefined, 'twin-posting-actions');
    const compareBtn = el('button', 'Compare job fit');
    compareBtn.type = 'button';
    compareBtn.addEventListener('click', () => submitTurn('compare_job'));
    const prepResumeBtn = el('button', 'Prepare tailored resume');
    prepResumeBtn.type = 'button';
    prepResumeBtn.addEventListener('click', () => submitTurn('prepare_resume'));
    const samplePostingBtn = el('button', 'Load example posting');
    samplePostingBtn.type = 'button';
    samplePostingBtn.addEventListener('click', () => {
      postingTextarea.value = 'Senior Solutions & Integration Analyst: Insurance workflows, SOAP and REST APIs, XML schema mapping, SQL financial reconciliation, and provider data synchronization. Kafka and AWS certification preferred.';
    });
    const openBuilderBtn = el('button', 'Generate Role Brief');
    openBuilderBtn.type = 'button';
    openBuilderBtn.addEventListener('click', () => {
      try {
        if (typeof sessionStorage !== 'undefined' && postingTextarea.value.trim()) {
          sessionStorage.setItem('josh_twin_resume_handoff', JSON.stringify({
            posting: postingTextarea.value.trim(),
            profile: 'auto'
          }));
        }
      } catch {}
      submitTurn('prepare_resume');
    });
    postingActions.append(compareBtn, prepResumeBtn, samplePostingBtn, openBuilderBtn);
    postingDetails.append(postingSummary, postingTextarea, postingActions);

    const form = el('form', undefined, 'twin-composer-form');
    form.id = 'twin-composer-form';
    form.addEventListener('submit', e => {
      e.preventDefault();
      submitTurn('explore_evidence');
    });

    const composerRow = el('div', undefined, 'twin-composer-row');
    const input = el('textarea', undefined, 'twin-input');
    input.id = 'twin-question-input';
    input.rows = 2;
    input.maxLength = 1000;
    input.placeholder = 'Ask about a project, technical tradeoff, or experience…';
    input.setAttribute('aria-label', 'Ask Josh’s Digital Twin a question');
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitTurn('explore_evidence');
      }
    });

    const micBtn = el('button', '🎤', 'twin-mic-btn');
    micBtn.id = 'twin-mic-btn';
    micBtn.type = 'button';
    micBtn.title = 'Push-to-talk voice input (ElevenLabs Scribe STT or browser speech recognition)';
    micBtn.setAttribute('aria-label', 'Record voice question');
    micBtn.addEventListener('click', () => toggleMicRecording());

    const sendBtn = el('button', 'Send', 'twin-send-btn');
    sendBtn.id = 'twin-send-btn';
    sendBtn.type = 'submit';

    composerRow.append(input, micBtn, sendBtn);
    form.appendChild(composerRow);

    const statusLine = el('div', undefined, 'twin-meta-bar');
    const statusText = el('span', 'Ready · Grounded in dataset 2026-10-15.3');
    statusText.id = 'twin-status-text';
    const metaRight = el('div');
    const clearBtn = el('button', 'Clear');
    clearBtn.type = 'button';
    clearBtn.addEventListener('click', () => clearSession());
    const fullGuideLink = el('a', 'Career section →');
    fullGuideLink.href = '#career';
    fullGuideLink.style.marginLeft = '12px';
    fullGuideLink.addEventListener('click', () => closeDrawer());
    metaRight.append(clearBtn, fullGuideLink);
    statusLine.append(statusText, metaRight);

    footer.append(postingDetails, form, statusLine);
    drawer.append(header, contextBar, body, footer);
    document.body.append(backdrop, drawer);

    // Listen to route changes and Esc key
    window.addEventListener('hashchange', () => refreshRouteContext());
    window.addEventListener('popstate', () => refreshRouteContext());
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isOpen) {
        closeDrawer();
      }
    });

    // Listen for clicks on 3D Hero Workbench tiers to keep activeTier synced
    document.addEventListener('click', e => {
      const target = e.target?.closest ? e.target : null;
      if (!target) return;
      const phaseBtn = target.closest('[data-phase-go]');
      if (phaseBtn) {
        activeTier = Number(phaseBtn.getAttribute('data-phase-go')) + 1;
        refreshRouteContext();
      }
    });

    bootstrapData();
  }

  async function bootstrapData() {
    try {
      const [ctxRes, evRes] = await Promise.all([
        fetch('twin-context.json', { credentials: 'same-origin' }),
        fetch('career-evidence.v3.json', { credentials: 'same-origin' })
      ]);
      if (ctxRes.ok) twinContext = await ctxRes.json();
      if (evRes.ok) {
        evidenceData = await evRes.json();
        if (root.CareerGuide) localSession = root.CareerGuide.createSession(evidenceData);
      }
    } catch {}

    try {
      const stRes = await fetch('/api/twin/status', { credentials: 'same-origin' });
      if (stRes.ok) {
        const st = await stRes.json();
        serverCapabilities.reachable = true;
        serverCapabilities.mode = st.mode || 'rule-based';
        serverCapabilities.llmProvider = st.llmProvider || 'local-deterministic';
        serverCapabilities.voice = st.voice || { sttEnabled: false, ttsEnabled: false, liveAgentEnabled: false };
        serverCapabilities.turnsUsed = st.session?.turnsUsed || 0;
        serverCapabilities.turnsLimit = st.session?.turnsLimit || 8;
        sessionToken = st.session?.sessionToken || '';
        updateHeaderStatus();

        // Restore any recent exchanges from this browser's session cookie
        if (Array.isArray(st.session?.recentExchanges) && st.session.recentExchanges.length) {
          const logContainer = document.getElementById('twin-log-items');
          if (logContainer && !logContainer.children.length) {
            for (const ex of st.session.recentExchanges) {
              appendRestoredExchange(ex);
            }
          }
        }
      }
    } catch {
      serverCapabilities.reachable = false;
    }

    refreshRouteContext();
  }

  function updateHeaderStatus() {
    const modePill = document.getElementById('twin-mode-pill');
    const turnNote = document.getElementById('twin-turn-count');
    if (modePill) {
      modePill.textContent = serverCapabilities.mode === 'ai'
        ? `Governed AI · ${serverCapabilities.llmProvider}`
        : 'Governed Evidence Twin';
    }
    if (turnNote) {
      turnNote.textContent = `${serverCapabilities.turnsUsed} / ${serverCapabilities.turnsLimit} turns`;
    }
  }

  function refreshRouteContext() {
    const hash = currentRouteHash();
    const ctx = getRouteContext(hash);
    const labelEl = document.getElementById('twin-context-label');
    if (labelEl) {
      labelEl.innerHTML = '';
      labelEl.append(
        document.createTextNode('Context: '),
        el('strong', ctx.label || 'Portfolio Overview')
      );
    }

    const startersBox = document.getElementById('twin-starters');
    if (startersBox && ctx.starters) {
      startersBox.replaceChildren();
      for (const s of ctx.starters) {
        const chip = el('button', s, 'twin-starter-chip');
        chip.type = 'button';
        chip.addEventListener('click', () => {
          const input = document.getElementById('twin-question-input');
          if (input) input.value = s;
          submitTurn('explore_evidence');
        });
        startersBox.appendChild(chip);
      }
    }

    // Inject contextual "Ask my Digital Twin about this case" inside #project-detail when viewing a case study
    const detailSection = document.getElementById('project-detail');
    if (detailSection && !detailSection.hidden && hash.startsWith('#projects/')) {
      if (!detailSection.querySelector('.twin-case-callout')) {
        const callout = el('div', undefined, 'twin-case-callout');
        callout.append(
          el('p', `Have a question about the decisions, architecture, or boundaries in ${ctx.label}?`),
          (() => {
            const btn = el('button', 'Ask Josh’s Digital Twin →');
            btn.type = 'button';
            btn.addEventListener('click', () => {
              openDrawer();
              const input = document.getElementById('twin-question-input');
              if (input && ctx.starters?.[0] && !input.value.trim()) {
                input.value = ctx.starters[0];
              }
            });
            return btn;
          })()
        );
        const detailEnd = detailSection.querySelector('.detail-end');
        if (detailEnd) detailSection.insertBefore(callout, detailEnd);
        else detailSection.appendChild(callout);
      }
    }
  }

  function openDrawer(prefillQuestion) {
    const drawer = document.getElementById('twin-drawer');
    const backdrop = document.getElementById('twin-backdrop');
    if (!drawer || !backdrop) return;
    isOpen = true;
    drawer.hidden = false;
    backdrop.hidden = false;
    refreshRouteContext();
    const input = document.getElementById('twin-question-input');
    if (prefillQuestion && input) {
      input.value = prefillQuestion;
    }
    setTimeout(() => {
      if (input) input.focus();
    }, 30);
  }

  function closeDrawer() {
    const drawer = document.getElementById('twin-drawer');
    const backdrop = document.getElementById('twin-backdrop');
    if (!drawer || !backdrop) return;
    isOpen = false;
    drawer.hidden = true;
    backdrop.hidden = true;
    if (root.TwinVoice) {
      root.TwinVoice.stopSpeaking();
      root.TwinVoice.stopRecording();
    }
  }

  function setStatus(text) {
    const s = document.getElementById('twin-status-text');
    if (s) s.textContent = text;
  }

  function appendRestoredExchange(ex) {
    const logContainer = document.getElementById('twin-log-items');
    if (!logContainer) return;
    const u = el('div', ex.question, 'twin-msg-user');
    const r = el('article', undefined, 'twin-msg-reply');
    const prose = el('div', undefined, 'twin-reply-prose');
    prose.appendChild(el('p', ex.spokenSummary));
    r.appendChild(prose);
    logContainer.append(u, r);
  }

  function renderReplyCard(userText, response, { skipAutoSpeak = false } = {}) {
    const logContainer = document.getElementById('twin-log-items');
    const body = document.getElementById('twin-drawer-body');
    if (!logContainer) return;

    const u = userText ? el('div', userText, 'twin-msg-user') : null;
    const r = el('article', undefined, 'twin-msg-reply');

    const headerRow = el('div', undefined, 'twin-msg-reply-header');
    headerRow.appendChild(el('h4', response.heading || 'Josh Boyer'));

    const speakText = response.spokenSummary || response.replyMarkdown || response.intro || '';
    if (speakText && root.TwinVoice) {
      const speakBtn = el('button', '🔊 Listen', 'twin-speak-reply-btn');
      speakBtn.type = 'button';
      speakBtn.addEventListener('click', () => {
        root.TwinVoice.speak(speakText, {
          serverTtsEnabled: true,
          voiceId: '2ccxXaT9cMefjPlK2Pwn',
          onStart: () => { speakBtn.textContent = '⏹ Stop'; },
          onEnd: () => { speakBtn.textContent = '🔊 Listen'; }
        });
      });
      headerRow.appendChild(speakBtn);
    }
    r.appendChild(headerRow);

    const prose = el('div', undefined, 'twin-reply-prose');
    const rawProse = response.replyMarkdown || response.intro || '';
    for (const para of rawProse.split(/\n{2,}/)) {
      const cleanPara = para.replace(/\*\*([^*]+)\*\*/g, '$1').trim();
      if (cleanPara) prose.appendChild(el('p', cleanPara));
    }
    r.appendChild(prose);

    // Prepared Resume Download (when action === 'prepare_resume' or 'compare_job')
    if (response.resumeText || response.kind === 'fit' || response.kind === 'resume') {
      if (response.resumeText) {
        const resDetails = el('details', undefined, 'twin-receipts-details');
        resDetails.open = true;
        resDetails.append(
          el('summary', 'Tailored Canonical Resume Preview'),
          (() => {
            const pre = el('pre', response.resumeText);
            pre.style.fontSize = '11px';
            pre.style.whiteSpace = 'pre-wrap';
            pre.style.background = '#f5f8fc';
            pre.style.padding = '10px';
            pre.style.borderRadius = '6px';
            return pre;
          })()
        );
        r.appendChild(resDetails);
      }
      const handoffBtn = el('button', '→ Connect About This Role', 'twin-nav-pill');
      handoffBtn.type = 'button';
      handoffBtn.style.marginTop = '8px';
      handoffBtn.addEventListener('click', () => {
        closeDrawer();
        window.location.hash = '#home-connect';
      });
      r.appendChild(handoffBtn);
    }

    // Co-Navigation Pills (Cases & Workbench Layers)
    const routes = Array.isArray(response.caseRoutes) ? response.caseRoutes : [];
    const tiers = Array.isArray(response.workbenchTiers) ? response.workbenchTiers : [];
    if (routes.length || tiers.length) {
      const navRow = el('div', undefined, 'twin-nav-pills');
      for (const route of routes) {
        const rCtx = twinContext?.routeContexts?.[route];
        const pill = el('button', `↗ ${rCtx?.label || route}`, 'twin-nav-pill');
        pill.type = 'button';
        pill.addEventListener('click', () => {
          window.location.hash = route;
        });
        navRow.appendChild(pill);
      }
      for (const tNum of tiers) {
        const tObj = twinContext?.workbenchTiers?.find(t => t.tier === Number(tNum));
        if (tObj) {
          const pill = el('button', `Layer ${tObj.code}`, 'twin-nav-pill');
          pill.type = 'button';
          pill.addEventListener('click', () => {
            window.location.hash = '#home';
            executeUiClientTool('focus_workbench_layer', { tier: tNum });
          });
          navRow.appendChild(pill);
        }
      }
      r.appendChild(navRow);
    }

    // Expandable Evidence Receipts
    const chunks = Array.isArray(response.chunks) ? response.chunks : [];
    const quals = Array.isArray(response.qualifications) ? response.qualifications : [];
    if (chunks.length || quals.length) {
      const receipts = el('details', undefined, 'twin-receipts-details');
      receipts.appendChild(
        el('summary', `Inspect ${chunks.length} Evidence Receipt${chunks.length === 1 ? '' : 's'}${quals.length ? ` · ${quals.length} Boundary Note${quals.length === 1 ? '' : 's'}` : ''}`)
      );
      for (const c of chunks) {
        const card = el('div', undefined, 'twin-receipt-card');
        card.append(
          el('strong', c.title),
          el('div', `${c.employer} · ${c.period} [${c.id}]`, 'twin-receipt-meta'),
          el('div', c.text)
        );
        if (Array.isArray(c.limits) && c.limits.length) {
          card.appendChild(el('div', `Boundary: ${c.limits.join(' ')}`, 'twin-receipt-limit'));
        }
        receipts.appendChild(card);
      }
      for (const q of quals) {
        const qCard = el('div', undefined, 'twin-receipt-card');
        qCard.append(
          el('strong', `Qualification to confirm: ${q.label}`),
          el('div', q.note, 'twin-receipt-limit')
        );
        receipts.appendChild(qCard);
      }
      r.appendChild(receipts);
    }

    // Update Follow-Up Starters
    if (Array.isArray(response.followUpSuggestions) && response.followUpSuggestions.length) {
      const startersBox = document.getElementById('twin-starters');
      if (startersBox) {
        startersBox.replaceChildren();
        for (const s of response.followUpSuggestions) {
          const chip = el('button', s, 'twin-starter-chip');
          chip.type = 'button';
          chip.addEventListener('click', () => {
            const input = document.getElementById('twin-question-input');
            if (input) input.value = s;
            submitTurn('explore_evidence');
          });
          startersBox.appendChild(chip);
        }
      }
    }

    if (u) logContainer.append(u, r);
    else logContainer.appendChild(r);
    if (body) body.scrollTop = body.scrollHeight;

    if (autoSpeak && !skipAutoSpeak && !isLiveCallActive && speakText && root.TwinVoice) {
      root.TwinVoice.speak(speakText, {
        serverTtsEnabled: true,
        voiceId: '2ccxXaT9cMefjPlK2Pwn'
      });
    }
  }

  async function submitTurn(action = 'explore_evidence') {
    const input = document.getElementById('twin-question-input');
    const postingInput = document.getElementById('twin-posting-input');
    const sendBtn = document.getElementById('twin-send-btn');
    if (!input) return;

    const question = input.value.trim();
    const posting = postingInput ? postingInput.value.trim() : '';

    if (action === 'explore_evidence' && question.length < 3) {
      setStatus('Ask at least 3 characters or click a starter question.');
      input.focus();
      return;
    }
    if (action !== 'explore_evidence' && posting.length < 20) {
      const postingDetails = document.getElementById('twin-posting-drawer');
      if (postingDetails) postingDetails.open = true;
      setStatus('Paste at least 20 characters of a job posting first.');
      if (postingInput) postingInput.focus();
      return;
    }

    if (sendBtn) sendBtn.disabled = true;
    setStatus('Synthesizing grounded response…');

    const displayPrompt = action === 'compare_job'
      ? (question || 'Compare attached job posting with your experience')
      : action === 'prepare_resume'
        ? (question || 'Prepare a tailored canonical resume for this posting')
        : question;

    try {
      const res = await fetch('/api/twin/chat', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          question,
          posting,
          profile: 'auto',
          activeRoute: currentRouteHash(),
          activeTier,
          sessionToken
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Could not process question.');
      }
      sessionToken = data.sessionToken || sessionToken;
      serverCapabilities.turnsUsed = data.turnsUsed ?? (serverCapabilities.turnsUsed + 1);
      serverCapabilities.mode = data.mode === 'ai' ? 'ai' : serverCapabilities.mode;
      updateHeaderStatus();
      if (action === 'explore_evidence') input.value = '';
      renderReplyCard(displayPrompt, data);
      setStatus(`Answered (${data.mode === 'ai' ? data.provider : 'Grounded Rule Engine'}) · ${data.turnsRemaining ?? 0} turns left`);
    } catch (err) {
      // Offline / static server fallback via local CareerGuide
      if (evidenceData && localSession) {
        try {
          const fallbackRes = localSession.send({
            action,
            question: question || 'Tell me about Josh',
            posting,
            profile: 'auto',
            datasetVersion: evidenceData.datasetVersion
          });
          serverCapabilities.turnsUsed = localSession.turns;
          updateHeaderStatus();
          if (action === 'explore_evidence') input.value = '';
          renderReplyCard(displayPrompt, fallbackRes);
          setStatus(`Answered via local browser engine · ${8 - localSession.turns} turns left`);
        } catch (localErr) {
          setStatus(localErr.message || err.message);
        }
      } else {
        setStatus(err.message || 'Unable to reach Digital Twin.');
      }
    } finally {
      if (sendBtn) sendBtn.disabled = serverCapabilities.turnsUsed >= serverCapabilities.turnsLimit;
    }
  }

  async function clearSession() {
    if (root.TwinVoice) {
      root.TwinVoice.stopSpeaking();
      root.TwinVoice.stopRecording();
      root.TwinVoice.stopLiveCall();
    }
    const logContainer = document.getElementById('twin-log-items');
    if (logContainer) logContainer.replaceChildren();
    if (localSession) localSession.clear();
    serverCapabilities.turnsUsed = 0;
    try {
      const res = await fetch('/api/twin/clear', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (res.ok) {
        const d = await res.json();
        sessionToken = d.sessionToken || '';
      }
    } catch {}
    updateHeaderStatus();
    const sendBtn = document.getElementById('twin-send-btn');
    if (sendBtn) sendBtn.disabled = false;
    refreshRouteContext();
    setStatus('Conversation cleared. Start a fresh question.');
  }

  async function toggleMicRecording() {
    if (!root.TwinVoice) return;
    const micBtn = document.getElementById('twin-mic-btn');
    const input = document.getElementById('twin-question-input');
    if (isRecording) {
      root.TwinVoice.stopRecording();
      isRecording = false;
      if (micBtn) {
        micBtn.classList.remove('is-recording');
        micBtn.textContent = '🎤';
      }
      return;
    }

    isRecording = true;
    if (micBtn) {
      micBtn.classList.add('is-recording');
      micBtn.textContent = '⏹';
    }
    setStatus(serverCapabilities.voice.sttEnabled ? 'Listening (ElevenLabs Scribe)… Click ⏹ when done speaking' : 'Listening (Browser STT)… Speak your question');

    await root.TwinVoice.startRecording({
      serverSttEnabled: serverCapabilities.voice.sttEnabled,
      onInterim: text => {
        if (input) input.value = text;
      },
      onResult: text => {
        if (input) input.value = text;
        submitTurn('explore_evidence');
      },
      onError: err => {
        setStatus(err.message || 'Microphone error.');
      },
      onStop: () => {
        isRecording = false;
        if (micBtn) {
          micBtn.classList.remove('is-recording');
          micBtn.textContent = '🎤';
        }
      }
    });
  }

  function syncLiveCallUi(active, statusLabel, state = 'idle') {
    const liveBtn = document.getElementById('twin-live-call-btn');
    const welcomeLiveBtn = document.getElementById('twin-welcome-live-btn');
    const liveStage = document.getElementById('twin-live-stage');
    const liveStageStatus = document.getElementById('twin-live-stage-status');
    const liveOrb = document.getElementById('twin-live-orb');

    if (liveBtn) {
      liveBtn.classList.toggle('is-active', active);
      liveBtn.setAttribute('aria-pressed', String(active));
      liveBtn.innerHTML = active
        ? `<span class="twin-voice-wave" aria-hidden="true"><i></i><i></i><i></i></span> End Call`
        : '🎙️ Live Call';
    }
    if (welcomeLiveBtn) {
      welcomeLiveBtn.textContent = active ? '⏹ End Live Call' : '🎙️ Start Live Call';
    }
    if (liveStage) {
      liveStage.hidden = !active;
    }
    if (liveStageStatus && statusLabel) {
      liveStageStatus.textContent = statusLabel;
    }
    if (liveOrb) {
      liveOrb.classList.toggle('is-speaking', state === 'speaking');
      liveOrb.textContent = state === 'speaking' ? '🔊' : '🎙️';
    }
  }

  async function toggleLiveCall() {
    if (!root.TwinVoice) return;
    const body = document.getElementById('twin-drawer-body');

    if (isLiveCallActive) {
      root.TwinVoice.stopLiveCall();
      isLiveCallActive = false;
      syncLiveCallUi(false, 'Live Voice Call ended.', 'ended');
      setStatus('Live Voice Call ended.');
      return;
    }

    isLiveCallActive = true;
    syncLiveCallUi(true, 'Connecting to ElevenLabs Conversational AI…', 'connecting');
    if (body) body.scrollTop = 0;

    await root.TwinVoice.startLiveCall({
      activeRoute: currentRouteHash(),
      activeTier,
      sessionToken,
      onStatusChange: (state, label) => {
        setStatus(label);
        syncLiveCallUi(isLiveCallActive, label, state);
      },
      onTranscript: ({ role, text }) => {
        const logContainer = document.getElementById('twin-log-items');
        if (!logContainer || !text) return;
        if (role === 'user') {
          logContainer.appendChild(el('div', `🎙️ ${text}`, 'twin-msg-user'));
          if (body) body.scrollTop = body.scrollHeight;
        } else {
          renderReplyCard(null, {
            heading: 'Josh Boyer · Live Voice',
            replyMarkdown: text,
            spokenSummary: text,
            chunks: [],
            qualifications: [],
            caseRoutes: [],
            workbenchTiers: []
          }, { skipAutoSpeak: true });
        }
      },
      onClientTool: (toolName, params) => executeUiClientTool(toolName, params),
      onError: err => {
        setStatus(err.message);
        syncLiveCallUi(true, err.message, 'error');
      },
      onClose: () => {
        isLiveCallActive = false;
        syncLiveCallUi(false, 'Live Voice Call ended.', 'ended');
      }
    });
  }

  return Object.freeze({
    mount,
    openDrawer,
    closeDrawer,
    submitTurn,
    clearSession
  });
});
