/* Interactive Resume Builder & Governed Digital Twin Co-Pilot
 * - Preserves 100% deterministic matching and canonical resume composition via ResumeEngine
 * - Wires in Josh's Governed Digital Twin (/api/twin/chat + TwinVoice + local CareerGuide fallback)
 *   to explain role fit, candidly address qualification boundaries, co-curate evidence chunks,
 *   and generate a companion first-person Role Introduction & Interview Guide.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const engine = window.ResumeEngine;
  const guideEngine = window.CareerGuide;
  const voice = window.TwinVoice;
  const posting = $('job-posting'), profile = $('role-focus');

  let data = null;
  let result = null;
  let resume = null;
  let selected = new Set();
  let twinRecommendedIds = new Set();
  let localGuideSession = null;
  let sessionToken = '';
  let autoSpeak = false;
  let isRecording = false;
  let isLiveCallActive = false;
  let lastFitBriefSpoken = '';
  let lastCompanionBriefText = '';

  let serverCapabilities = {
    reachable: false,
    mode: 'rule-based',
    llmProvider: 'local-deterministic',
    voice: { sttEnabled: true, ttsEnabled: true, liveAgentEnabled: true },
    turnsUsed: 0,
    turnsLimit: 8
  };

  const ARCHETYPES = {
    'insurance-integration': {
      focus: 'insurance',
      text: [
        'Illustrative posting: Insurance Integration & Rules Analyst',
        'Define provider and broker integration requirements across policy, billing and claims.',
        'Map CSIO/ACORD data and work with SOAP, XML and REST interfaces.',
        'Design and validate P&C rating, underwriting and renewal eligibility business rules.',
        'Use SQL and reconciliation to validate claims and financial data.',
        'Give technical guidance to vendor and delivery teams.',
        'AWS certification required.'
      ].join('\n')
    },
    'claims-sql': {
      focus: 'integrations',
      text: [
        'Illustrative posting: Senior Enterprise Claims & Data Integration Analyst',
        'Review provider synchronization requirements and REST data contracts for claims adjudication.',
        'Validate prior takeover claims history and design repeatable XML batch loading and reconciliation tooling.',
        'Analyze downstream ETL flat-file feeds and reporting continuity for enterprise clients.',
        'Write SQL queries to reconcile claims adjudication records against financial reports.',
        'Collaborate with solution architects and developers on gap analysis and specifications.',
        'Kafka streaming experience preferred.'
      ].join('\n')
    },
    'solutions-ai': {
      focus: 'solutions',
      text: [
        'Illustrative posting: Technical Solutions & Systems Generalist',
        'Bridge business requirements, current-state system analysis, and practical solution design.',
        'Diagnose complex cross-system dependencies across infrastructure, APIs, and business workflows.',
        'Build repeatable validation tools, C#/.NET or web utilities, and clear technical specifications.',
        'Apply governed AI context compilation, model routing, and verifiable evaluation receipts to software workflows.',
        'Work directly with stakeholders, vendors, and engineering teams from discovery through delivery.'
      ].join('\n')
    }
  };

  const example = ARCHETYPES['insurance-integration'].text;

  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined && text !== null) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function showError(id, message) {
    const node = $(id);
    if (!node) return;
    node.textContent = message;
    node.hidden = !message;
  }

  function exportState(enabled) {
    for (const id of ['text-export', 'print-resume', 'selection-export', 'copy-resume-btn', 'generate-intro-btn']) {
      const btn = $(id);
      if (btn) btn.disabled = !enabled;
    }
  }

  function estimateLines(text) {
    const clean = (text || '').trim();
    if (!clean) return 0;
    return clean
      .split(/\n+|[;]+|(?<=[.!?])\s+(?=[A-Z])/)
      .map(x => x.replace(/^\s*[-*•]\s*/, '').trim())
      .filter(Boolean).length;
  }

  function syncPostingCount() {
    if ($('posting-count')) {
      $('posting-count').textContent = posting.value.length.toLocaleString('en-US') + ' / 12,000 characters';
    }
    if ($('posting-line-estimate')) {
      const lines = estimateLines(posting.value);
      $('posting-line-estimate').textContent = lines + (lines === 1 ? ' requirement line detected' : ' requirement lines detected');
    }
  }

  function updateStepper(activeStep) {
    const steps = document.querySelectorAll('#resume-stepper .resume-step');
    steps.forEach(stepEl => {
      const num = Number(stepEl.getAttribute('data-step-nav'));
      stepEl.classList.toggle('is-active', num === activeStep);
      stepEl.classList.toggle('is-complete', num < activeStep || (result && selected.size > 0 && num <= 4));
    });

    const s1 = $('step-1-meta');
    const s2 = $('step-2-meta');
    const s3 = $('step-3-meta');
    const s4 = $('step-4-meta');

    if (s1) {
      const lines = estimateLines(posting.value);
      s1.textContent = lines ? `${lines} lines · ${profile.value === 'auto' ? 'Auto emphasis' : profile.value}` : 'Paste requirements or pick a template';
    }
    if (s2) {
      if (result) {
        const rel = result.requirements.filter(r => r.evidenceIds.length).length;
        s2.textContent = `${rel}/${result.requirements.length} lines matched · ${result.qualificationIds.length} boundary notes`;
      } else {
        s2.textContent = 'Awaiting posting match';
      }
    }
    if (s3) {
      s3.textContent = result
        ? `${selected.size} of ${result.ranked.length} matched chunks selected`
        : 'Select 1–8 verified chunks';
    }
    if (s4) {
      s4.textContent = resume
        ? `Ready (${resume.selectedIds.length} chunks · ${resume.sourceRefs.length} sources)`
        : 'Preview, print PDF, or copy';
    }
  }

  function invalidate(message = '') {
    result = null;
    resume = null;
    selected.clear();
    twinRecommendedIds.clear();
    if ($('match-results')) $('match-results').hidden = true;
    if ($('resume-preview')) {
      $('resume-preview').hidden = true;
      $('resume-preview').replaceChildren();
    }
    if ($('twin-companion-brief')) $('twin-companion-brief').hidden = true;
    if ($('tool-status')) $('tool-status').textContent = message;
    showError('posting-error', '');
    showError('selection-error', '');
    posting.removeAttribute('aria-invalid');
    exportState(false);
    syncPostingCount();
    updateStepper(1);
    renderCopilotStarters();
  }

  const chunkById = id => data.chunks.find(c => c.id === id);
  const facetNames = ids => ids.map(id => data.facets.find(f => f.id === id).label).join(', ');

  function sourceLink(sourceId, text) {
    const source = data.sources.find(s => s.id === sourceId);
    const a = el('a', text || sourceId);
    a.href = source.path;
    return a;
  }

  function renderMatchTelemetry() {
    const container = $('match-telemetry');
    if (!container || !result || !data) return;
    container.replaceChildren();
    const related = result.requirements.filter(r => r.evidenceIds.length).length;
    const focusLabel = data.profiles.find(p => p.id === result.profileId)?.label || 'Auto';

    const stats = [
      { value: `${related} / ${result.requirements.length}`, label: 'Posting lines with related evidence' },
      { value: `${selected.size} / ${engine.MAX_SELECTION}`, label: 'Canonical chunks in active resume' },
      { value: String(result.qualificationIds.length), label: 'Qualifications / boundaries to confirm' },
      { value: focusLabel, label: 'Active role emphasis profile' }
    ];

    for (const st of stats) {
      const card = el('div', undefined, 'telemetry-stat-card');
      card.append(el('strong', st.value), el('span', st.label));
      container.appendChild(card);
    }
  }

  function renderResume() {
    const paper = $('resume-preview');
    paper.replaceChildren();
    showError('selection-error', '');
    $('selection-count').textContent = selected.size + ' selected · maximum 8';
    renderMatchTelemetry();

    if (!selected.size) {
      resume = null;
      paper.hidden = true;
      exportState(false);
      showError('selection-error', 'Choose at least one evidence chunk to create the resume.');
      $('preview-link').hidden = true;
      updateStepper(3);
      return;
    }

    // Preserve ranked order when composing selected chunks
    const orderedSelectedIds = result.ranked.filter(r => selected.has(r.id)).map(r => r.id);
    resume = engine.compose(data, result, orderedSelectedIds);
    $('preview-link').hidden = false;
    paper.hidden = false;
    exportState(true);
    updateStepper(4);

    const name = el('h2', resume.name);
    name.id = 'resume-name';
    paper.append(name, el('p', resume.positioning, 'resume-position'));
    paper.append(
      el('h3', 'Professional summary'),
      el('p', resume.summary),
      el('h3', 'Selected areas of experience'),
      el('p', resume.focus.join(' · ')),
      el('h3', 'Professional experience')
    );

    function bullets(chunks) {
      const list = el('ul');
      for (const c of chunks) {
        const li = el('li', c.resumeText);
        li.append(el('span', c.id, 'chunk-reference'));
        list.append(li);
      }
      return list;
    }

    for (const role of resume.roles) {
      paper.append(el('h4', role.employer + ' · ' + role.period), el('p', role.title, 'role-title'));
      if (role.chunks.length) paper.append(bullets(role.chunks));
      else paper.append(el('p', role.scope));
    }

    if (resume.independent.length) {
      paper.append(el('h3', 'Independent projects'));
      for (const c of resume.independent) {
        paper.append(el('h4', c.title + ' · ' + c.period), bullets([c]));
      }
    }

    paper.append(el('h3', 'Evidence references'));
    const refs = el('div', undefined, 'resume-references');
    refs.append(el('p', 'Prewritten public career evidence. IDs identify sources; they are not external certifications.'));
    for (const id of resume.sourceRefs) {
      refs.append(sourceLink(id));
      refs.append(document.createTextNode(' '));
    }
    refs.append(el('p', 'Evidence ' + resume.versions.dataset + ' · Ranking ' + resume.versions.ranking + ' · Template ' + resume.versions.template));
    paper.append(refs);
  }

  function renderEvidenceOptions() {
    const options = $('evidence-options');
    if (!options || !result || !data) return;
    options.replaceChildren();

    const maxScore = Math.max(1, ...result.ranked.map(r => r.score));

    for (const rank of result.ranked) {
      const c = chunkById(rank.id);
      const role = data.roles.find(r => r.id === c.roleId);
      const isSelected = selected.has(c.id);
      const isTwinPick = twinRecommendedIds.has(c.id);

      const row = el('div', undefined, 'evidence-option' + (isSelected ? ' is-selected' : ''));
      const main = el('div');
      const reason = el('div', undefined, 'reason-copy');

      const label = el('label');
      const checkbox = el('input');
      checkbox.type = 'checkbox';
      checkbox.checked = isSelected;
      checkbox.value = c.id;
      checkbox.setAttribute('aria-describedby', 'reason-' + c.id);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked && selected.size >= engine.MAX_SELECTION) {
          checkbox.checked = false;
          showError('selection-error', 'Choose at most eight chunks. Remove one before adding another.');
          return;
        }
        if (checkbox.checked) selected.add(c.id);
        else selected.delete(c.id);
        row.classList.toggle('is-selected', checkbox.checked);
        renderResume();
        $('tool-status').textContent = 'Resume updated: ' + selected.size + ' evidence chunks selected.';
      });

      const titleSpan = el('span', c.title);
      if (isTwinPick) {
        const badge = el('span', '✦ Twin Pick', 'twin-pick-badge');
        titleSpan.appendChild(badge);
      }
      label.append(checkbox, titleSpan);

      const metaLine = el('p', role.employer + ' · ' + c.period + (c.kind === 'project' ? ' · Independent project' : ''), 'evidence-meta');
      const bulletCopy = el('p', c.resumeText, 'evidence-main-bullet');

      const cardActions = el('div', undefined, 'evidence-card-actions');
      const askChunkBtn = el('button', 'Ask Twin about this work →', 'ask-twin-inline-btn');
      askChunkBtn.type = 'button';
      askChunkBtn.addEventListener('click', () => {
        askCopilotQuestion(
          `Tell me the story behind "${c.title}" at ${role.employer} (${c.period}) and why it matters for this role.`,
          'explore_evidence'
        );
      });
      cardActions.appendChild(askChunkBtn);

      main.append(label, metaLine, bulletCopy, cardActions);

      reason.id = 'reason-' + c.id;
      const meterWrap = el('div', undefined, 'score-meter-wrap');
      const meterTrack = el('div', undefined, 'score-meter-track');
      const meterFill = el('div', undefined, 'score-meter-fill');
      meterFill.style.width = Math.min(100, Math.round((rank.score / maxScore) * 100)) + '%';
      meterTrack.appendChild(meterFill);
      meterWrap.append(
        meterTrack,
        el('span', `Score ${rank.score} (Topics ${rank.keywordPoints} + Emphasis ${rank.profilePoints})`, 'score-meter-label')
      );
      reason.appendChild(meterWrap);

      reason.append(
        el('p', 'Related topics: ' + facetNames(rank.matchedFacets) + '. Priority ' + rank.priority + '; stable ID ' + rank.id + '.')
      );

      const details = el('details');
      details.append(el('summary', 'Decision, process and qualifications'), el('p', c.decision));
      const steps = el('ol');
      for (const step of c.process) steps.append(el('li', step));
      details.append(steps, el('p', 'Technical guidance: ' + c.technicalGuidance), el('p', 'Outcome: ' + c.outcome));
      const notes = el('ul');
      for (const note of [...role.qualificationNotes, ...c.qualificationNotes]) notes.append(el('li', note));
      details.append(notes, el('p', 'Source confidence: approved public account; not independent certification.'));
      for (const id of c.sourceRefs) details.append(sourceLink(id, 'Read the approved case study'));
      reason.append(details);

      row.append(main, reason);
      options.append(row);
    }
  }

  function applySelectionIds(newIds, statusMessage) {
    if (!result) return;
    const validRankedSet = new Set(result.ranked.map(r => r.id));
    const filtered = newIds.filter(id => validRankedSet.has(id)).slice(0, engine.MAX_SELECTION);
    if (!filtered.length) return;
    selected = new Set(filtered);
    renderEvidenceOptions();
    renderResume();
    if (statusMessage && $('tool-status')) {
      $('tool-status').textContent = statusMessage;
    }
  }

  function renderResults() {
    $('match-results').hidden = false;
    const related = result.requirements.filter(r => r.evidenceIds.length).length;
    const focus = data.profiles.find(p => p.id === result.profileId).label;
    $('match-summary').textContent =
      focus +
      ' emphasis. ' +
      related +
      ' of ' +
      result.requirements.length +
      ' posting lines have related topics; ' +
      result.unrecognizedRequirementIds.length +
      ' have no recognized topic. Every requirement still needs human review.';

    const qlist = $('qualification-list');
    qlist.replaceChildren();
    for (const id of result.qualificationIds) {
      const q = data.qualificationCatalog.find(x => x.id === id);
      const li = el('li');
      li.append(el('strong', q.label + ': '), document.createTextNode(q.note));
      qlist.append(li);
    }
    $('qualification-notes').hidden = !result.qualificationIds.length;

    const mapping = $('requirement-mapping');
    mapping.replaceChildren();
    for (const row of result.requirements) {
      const li = el('li');
      const source = el('div');
      const matches = el('div');

      source.append(
        el('p', row.text),
        el(
          'p',
          row.facets.length
            ? 'Related topics: ' + facetNames(row.facets)
            : 'No recognized topic. Review this requirement directly.',
          'mapping-caption'
        )
      );

      const reqActions = el('div', undefined, 'req-row-actions');
      const askReqBtn = el('button', 'Ask Josh’s Twin how I’d approach this →', 'ask-twin-inline-btn');
      askReqBtn.type = 'button';
      askReqBtn.addEventListener('click', () => {
        askCopilotQuestion(
          `Requirement line: "${row.text.slice(0, 260)}" — How does your experience connect to this requirement, and what boundaries should we note?`,
          'explore_evidence'
        );
      });
      reqActions.appendChild(askReqBtn);
      source.appendChild(reqActions);

      for (const id of row.evidenceIds) {
        const c = chunkById(id);
        matches.append(sourceLink(c.sourceRefs[0], c.title + ' · ' + c.id));
      }
      if (!row.evidenceIds.length) {
        matches.append(el('p', 'No approved evidence selected for this line.'));
      }
      if (row.qualifications.length) {
        matches.append(el('p', 'Additional qualification requires confirmation; see notes above.', 'mapping-caption'));
      }
      li.append(source, matches);
      mapping.append(li);
    }

    renderEvidenceOptions();
    renderResume();
    renderCopilotStarters();

    if (!result.ranked.length) {
      $('tool-status').textContent =
        'No recognized evidence connection. Try more specific responsibilities, or read the portfolio directly. No resume was generated.';
    } else {
      $('tool-status').textContent = 'Matched approved evidence. Review the qualifications, Twin Fit Brief, and selection before exporting.';
    }


  }

  /* ==========================================================================
     DIGITAL TWIN CO-PILOT INTEGRATION
     ========================================================================== */
  function setCopilotStatus(text) {
    const node = $('copilot-status');
    if (node) node.textContent = text;
  }

  function updateCopilotHeader() {
    const modePill = $('copilot-mode-pill');
    const turnCount = $('copilot-turn-count');
    if (modePill) {
      modePill.textContent =
        serverCapabilities.mode === 'ai'
          ? `Governed AI · ${serverCapabilities.llmProvider}`
          : 'Governed Evidence Twin';
    }
    if (turnCount) {
      turnCount.textContent = `${serverCapabilities.turnsUsed} / ${serverCapabilities.turnsLimit} turns`;
    }
  }

  function renderCopilotStarters() {
    const box = $('copilot-starters');
    if (!box) return;
    box.replaceChildren();

    let starters = [
      'Which evidence chunks best highlight your integration and SQL work?',
      'How do your insurance rules at Grenville connect to Medavie claims work?',
      'How should we frame your architecture work without claiming a formal Architect title?'
    ];

    if (result && data) {
      const dynStarters = [];
      if (result.qualificationIds.length) {
        const firstQual = data.qualificationCatalog.find(q => q.id === result.qualificationIds[0]);
        if (firstQual) {
          dynStarters.push(`How do you address the "${firstQual.label}" boundary in an interview?`);
        }
      }
      if (selected.size) {
        dynStarters.push('Write a first-person role introduction and interview discussion guide for my selected chunks.');
      }
      dynStarters.push('Which 4 to 6 chunks make the strongest focused resume for this posting?');
      starters = dynStarters.slice(0, 3);
    }

    for (const promptText of starters) {
      const chip = el('button', promptText, 'copilot-starter-chip');
      chip.type = 'button';
      chip.addEventListener('click', () => {
        askCopilotQuestion(promptText, 'explore_evidence');
      });
      box.appendChild(chip);
    }
  }

  async function callTwinEndpoint(action, questionText) {
    const currentPosting = posting.value.trim();
    const currentProfile = profile.value || 'auto';
    const currentSelected = [...selected];

    try {
      const res = await fetch('/api/twin/chat', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          question: questionText,
          posting: currentPosting,
          profile: currentProfile,
          activeRoute: '#resume',
          selectedChunkIds: currentSelected,
          sessionToken
        })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'Could not reach Twin server.');
      sessionToken = payload.sessionToken || sessionToken;
      serverCapabilities.turnsUsed = payload.turnsUsed ?? (serverCapabilities.turnsUsed + 1);
      if (payload.mode === 'ai') serverCapabilities.mode = 'ai';
      updateCopilotHeader();
      return payload;
    } catch (err) {
      // Offline / static fallback using CareerGuide + deterministic first-person synthesis
      if (data && guideEngine && localGuideSession) {
        const fallback = localGuideSession.send({
          action,
          question: questionText || 'Compare this posting with Josh’s approved experience.',
          posting: currentPosting,
          profile: currentProfile,
          datasetVersion: data.datasetVersion
        });
        serverCapabilities.turnsUsed = localGuideSession.turns;
        updateCopilotHeader();
        const citedIds = (fallback.chunks || []).map(c => c.id);
        return {
          ...fallback,
          mode: 'rule-based-local',
          provider: 'local-browser-engine',
          citedChunkIds: citedIds,
          replyMarkdown: fallback.intro,
          spokenSummary: fallback.intro
        };
      }
      throw err;
    }
  }

  async function requestTwinFitBrief() {
    if (!posting.value.trim() || posting.value.trim().length < 20) return;
    const badge = $('copilot-fit-badge');
    const heading = $('copilot-fit-heading');
    const prose = $('copilot-fit-prose');
    const actions = $('copilot-fit-actions');
    const speakBtn = $('copilot-speak-brief-btn');

    if (badge) badge.textContent = 'ANALYZING POSTING FIT…';
    setCopilotStatus('Josh’s Twin is reviewing the posting against approved evidence…');

    try {
      const reply = await callTwinEndpoint(
        'compare_job',
        'Analyze how my approved experience fits this job posting, highlight the strongest evidence chunks to include in the resume, and candidly note any qualifications to confirm.'
      );

      // Record Twin's recommended chunks
      const recommended = [
        ...(Array.isArray(reply.citedChunkIds) ? reply.citedChunkIds : []),
        ...(Array.isArray(reply.selectedIds) ? reply.selectedIds : [])
      ];
      twinRecommendedIds = new Set(recommended.slice(0, 6));
      renderEvidenceOptions();

      if (badge) {
        badge.textContent =
          reply.mode === 'ai' ? `TWIN FIT BRIEF · ${reply.provider}` : 'TWIN FIT BRIEF · VERIFIED CORPUS';
      }
      if (heading) {
        heading.textContent = reply.heading || 'My Role-Fit & Boundary Assessment';
      }
      if (prose) {
        prose.replaceChildren();
        const rawText = reply.replyMarkdown || reply.intro || '';
        for (const para of rawText.split(/\n{2,}/)) {
          const clean = para.replace(/\*\*([^*]+)\*\*/g, '$1').trim();
          if (clean) prose.appendChild(el('p', clean));
        }
      }

      lastFitBriefSpoken = reply.spokenSummary || reply.replyMarkdown || reply.intro || '';
      if (speakBtn) {
        speakBtn.hidden = !lastFitBriefSpoken;
      }
      if (actions) {
        actions.hidden = false;
        const applyBtn = $('copilot-apply-picks-btn');
        if (applyBtn && twinRecommendedIds.size) {
          applyBtn.textContent = `✦ Apply Twin’s Recommended Chunks (${twinRecommendedIds.size})`;
        }
      }

      setCopilotStatus(`Fit brief ready · ${reply.turnsRemaining ?? (8 - serverCapabilities.turnsUsed)} turns remaining`);
      if (autoSpeak && !isLiveCallActive && lastFitBriefSpoken && voice) {
        voice.speak(lastFitBriefSpoken, { serverTtsEnabled: true });
      }
    } catch (err) {
      if (badge) badge.textContent = 'DETERMINISTIC MATCH READY';
      setCopilotStatus(err.message || 'Ready');
    }
  }

  function appendCopilotReply(questionText, reply) {
    const log = $('copilot-log');
    if (!log) return;

    if (questionText) {
      log.appendChild(el('div', questionText, 'copilot-msg-user'));
    }

    const card = el('article', undefined, 'copilot-msg-reply');
    const head = el('div', undefined, 'copilot-msg-reply-head');
    head.appendChild(el('h4', reply.heading || 'Josh Boyer · Digital Twin'));

    const speakText = reply.spokenSummary || reply.replyMarkdown || reply.intro || '';
    if (speakText && voice) {
      const listenBtn = el('button', '🔊 Listen', 'copilot-mini-btn');
      listenBtn.type = 'button';
      listenBtn.addEventListener('click', () => {
        voice.speak(speakText, {
          serverTtsEnabled: true,
          onStart: () => { listenBtn.textContent = '⏹ Stop'; },
          onEnd: () => { listenBtn.textContent = '🔊 Listen'; }
        });
      });
      head.appendChild(listenBtn);
    }
    card.appendChild(head);

    const rawText = reply.replyMarkdown || reply.intro || '';
    for (const para of rawText.split(/\n{2,}/)) {
      const clean = para.replace(/\*\*([^*]+)\*\*/g, '$1').trim();
      if (clean) card.appendChild(el('p', clean));
    }

    // If this reply cites chunks that exist in the current ranked result (or dataset), offer 1-click sync into the resume!
    const citedIds = Array.isArray(reply.citedChunkIds) ? reply.citedChunkIds : [];
    if (citedIds.length && result) {
      const rankedIds = new Set(result.ranked.map(r => r.id));
      const applicableIds = citedIds.filter(id => rankedIds.has(id));
      if (applicableIds.length) {
        const syncBar = el('div', undefined, 'copilot-chunk-Sync-bar');
        const syncBtn = el(
          'button',
          `✦ Ensure these ${applicableIds.length} chunk${applicableIds.length === 1 ? '' : 's'} are in resume`,
          'copilot-action-primary'
        );
        syncBtn.type = 'button';
        syncBtn.addEventListener('click', () => {
          const merged = [...new Set([...applicableIds, ...selected])].slice(0, engine.MAX_SELECTION);
          applySelectionIds(merged, `Added Twin's cited evidence (${applicableIds.join(', ')}) to the resume preview.`);
        });
        syncBar.appendChild(syncBtn);
        card.appendChild(syncBar);
      }
    }

    log.appendChild(card);
    log.scrollTop = log.scrollHeight;

    if (autoSpeak && !isLiveCallActive && speakText && voice) {
      voice.speak(speakText, { serverTtsEnabled: true });
    }
  }

  async function askCopilotQuestion(questionText, action = 'explore_evidence', { renderAsCompanionBrief = false } = {}) {
    const input = $('copilot-input');
    const sendBtn = $('copilot-send-btn');
    const q = (questionText !== undefined ? questionText : input?.value || '').trim();
    if (q.length < 3) {
      setCopilotStatus('Ask at least 3 characters or choose a prompt chip.');
      if (input) input.focus();
      return;
    }

    const copilotEl = $('twin-copilot');
    if (copilotEl && window.innerWidth < 1024 && !renderAsCompanionBrief) {
      copilotEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    if (sendBtn) sendBtn.disabled = true;
    setCopilotStatus('Josh’s Twin is synthesizing a grounded answer…');

    try {
      const reply = await callTwinEndpoint(action, q);
      if (input && questionText === undefined) input.value = '';
      appendCopilotReply(q, reply);

      if (renderAsCompanionBrief) {
        const compBox = $('twin-companion-brief');
        const compBody = $('companion-brief-body');
        const compTitle = $('companion-brief-title');
        if (compBox && compBody) {
          compBox.hidden = false;
          if (compTitle && reply.heading) compTitle.textContent = reply.heading;
          compBody.replaceChildren();
          const raw = reply.replyMarkdown || reply.intro || '';
          lastCompanionBriefText = raw.replace(/\*\*([^*]+)\*\*/g, '$1').trim();
          for (const para of lastCompanionBriefText.split(/\n{2,}/)) {
            if (para.trim()) compBody.appendChild(el('p', para.trim()));
          }
          compBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }

      setCopilotStatus(`Answered · ${reply.turnsRemaining ?? (8 - serverCapabilities.turnsUsed)} turns remaining`);
    } catch (err) {
      setCopilotStatus(err.message || 'Could not process question.');
    } finally {
      if (sendBtn) sendBtn.disabled = serverCapabilities.turnsUsed >= serverCapabilities.turnsLimit;
    }
  }

  /* ==========================================================================
     EVENT LISTENERS & WORKFLOW WIRING
     ========================================================================== */
  $('posting-form').addEventListener('submit', event => {
    event.preventDefault();
    syncPostingCount();
    if (!data) return;
    try {
      result = engine.build(data, posting.value, profile.value);
      selected = new Set(result.selectedIds);
      twinRecommendedIds = new Set(result.selectedIds.slice(0, 4));
      showError('posting-error', '');
      posting.removeAttribute('aria-invalid');
      renderResults();
      $('match-title').focus({ preventScroll: true });
      $('match-results').scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        block: 'start'
      });
    } catch (error) {
      invalidate();
      showError('posting-error', error.message);
      posting.setAttribute('aria-invalid', 'true');
      posting.focus();
    }
  });

  posting.addEventListener('input', () => invalidate('Posting changed. Match evidence to refresh the resume.'));
  profile.addEventListener('change', () => invalidate('Emphasis changed. Match evidence to refresh the resume.'));
  posting.addEventListener('paste', event => {
    const text = event.clipboardData?.getData('text');
    if (text !== undefined && posting.value.length - (posting.selectionEnd - posting.selectionStart) + text.length > engine.LIMIT) {
      event.preventDefault();
      invalidate();
      showError('posting-error', 'That paste exceeds 12,000 characters. Shorten it first; no text was truncated.');
      posting.setAttribute('aria-invalid', 'true');
    }
  });

  $('example-button').addEventListener('click', () => {
    posting.value = example;
    profile.value = 'auto';
    invalidate('Example posting loaded. Choose Match evidence & consult Twin to try it.');
    posting.focus();
  });

  // Role Archetype Quick-Loaders
  document.querySelectorAll('[data-archetype]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-archetype');
      const arch = ARCHETYPES[key];
      if (!arch) return;
      document.querySelectorAll('[data-archetype]').forEach(b => b.classList.toggle('is-active', b === btn));
      posting.value = arch.text;
      profile.value = arch.focus;
      invalidate(`Loaded "${btn.textContent}" template.`);
      if (data) {
        $('posting-form').requestSubmit();
      }
    });
  });

  $('clear-button').addEventListener('click', () => {
    posting.value = '';
    profile.value = 'auto';
    document.querySelectorAll('[data-archetype]').forEach(b => b.classList.remove('is-active'));
    invalidate('Posting and selection cleared.');
    posting.focus();
  });

  $('preview-link').addEventListener('click', () => {
    if (resume) $('resume-preview').focus({ preventScroll: true });
  });

  // Curation Toolbar Presets
  document.querySelectorAll('#curation-toolbar [data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!result || !data) return;
      const preset = btn.getAttribute('data-preset');
      document.querySelectorAll('#curation-toolbar [data-preset]').forEach(b => b.classList.toggle('is-active', b === btn));

      if (preset === 'default') {
        applySelectionIds(result.selectedIds, 'Restored top deterministic evidence selection.');
      } else if (preset === 'twin') {
        const picks = twinRecommendedIds.size
          ? [...new Set([...twinRecommendedIds, ...result.selectedIds])].slice(0, 6)
          : result.selectedIds;
        applySelectionIds(picks, 'Applied Josh’s Digital Twin recommended evidence selection.');
      } else if (preset === 'medavie') {
        const medavieRanked = result.ranked
          .filter(r => chunkById(r.id)?.roleId === 'role-medavie')
          .map(r => r.id);
        const others = result.ranked.map(r => r.id).filter(id => !medavieRanked.includes(id));
        applySelectionIds([...medavieRanked, ...others].slice(0, 6), 'Prioritized Medavie claims, integration, and SQL evidence chunks.');
      } else if (preset === 'grenville') {
        const grenvilleRanked = result.ranked
          .filter(r => chunkById(r.id)?.roleId === 'role-grenville')
          .map(r => r.id);
        const others = result.ranked.map(r => r.id).filter(id => !grenvilleRanked.includes(id));
        applySelectionIds([...grenvilleRanked, ...others].slice(0, 6), 'Prioritized Grenville P&C rules, broker workflows, and infrastructure chunks.');
      } else if (preset === 'nexus') {
        const hasNexusInRanked = result.ranked.some(r => r.id === 'experience-nexus');
        if (hasNexusInRanked) {
          const next = [...new Set(['experience-nexus', ...selected])].slice(0, engine.MAX_SELECTION);
          applySelectionIds(next, 'Included NEXUS independent capstone in the active resume selection.');
        } else {
          $('tool-status').textContent = 'Note: Add AI, governance, or software engineering keywords to the posting to match the NEXUS chunk.';
        }
      }
    });
  });

  // Co-Pilot Action Buttons
  if ($('copilot-apply-picks-btn')) {
    $('copilot-apply-picks-btn').addEventListener('click', () => {
      if (!result) return;
      const picks = twinRecommendedIds.size
        ? [...new Set([...twinRecommendedIds, ...result.selectedIds.slice(0, 3)])].slice(0, 6)
        : result.selectedIds;
      applySelectionIds(picks, 'Applied Josh’s Digital Twin recommended evidence selection to the resume.');
    });
  }

  function triggerRoleIntroGuide() {
    askCopilotQuestion(
      'Write a first-person role introduction and interview discussion guide for my currently selected resume chunks.',
      'explore_evidence',
      { renderAsCompanionBrief: true }
    );
  }

  if ($('copilot-intro-guide-btn')) {
    $('copilot-intro-guide-btn').addEventListener('click', triggerRoleIntroGuide);
  }
  if ($('generate-intro-btn')) {
    $('generate-intro-btn').addEventListener('click', triggerRoleIntroGuide);
  }
  if ($('ask-twin-gaps-btn')) {
    $('ask-twin-gaps-btn').addEventListener('click', () => {
      requestTwinFitBrief();
      $('twin-copilot')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }
  if ($('ask-twin-qualifications-btn')) {
    $('ask-twin-qualifications-btn').addEventListener('click', () => {
      if (!result || !result.qualificationIds.length) return;
      const labels = result.qualificationIds
        .map(id => data.qualificationCatalog.find(q => q.id === id)?.label)
        .filter(Boolean)
        .join(', ');
      askCopilotQuestion(
        `How should we address these qualification boundaries from the posting (${labels}) while highlighting your closest verified experience?`,
        'explore_evidence'
      );
    });
  }

  if ($('copilot-speak-brief-btn')) {
    $('copilot-speak-brief-btn').addEventListener('click', () => {
      const btn = $('copilot-speak-brief-btn');
      if (!lastFitBriefSpoken || !voice) return;
      voice.speak(lastFitBriefSpoken, {
        serverTtsEnabled: true,
        onStart: () => { btn.textContent = '⏹ Stop'; },
        onEnd: () => { btn.textContent = '🔊 Listen'; }
      });
    });
  }

  if ($('companion-speak-btn')) {
    $('companion-speak-btn').addEventListener('click', () => {
      const btn = $('companion-speak-btn');
      if (!lastCompanionBriefText || !voice) return;
      voice.speak(lastCompanionBriefText, {
        serverTtsEnabled: true,
        onStart: () => { btn.textContent = '⏹ Stop'; },
        onEnd: () => { btn.textContent = '🔊 Listen'; }
      });
    });
  }
  if ($('companion-copy-btn')) {
    $('companion-copy-btn').addEventListener('click', async () => {
      if (!lastCompanionBriefText) return;
      try {
        await navigator.clipboard.writeText(lastCompanionBriefText);
        $('companion-copy-btn').textContent = '✓ Copied';
        setTimeout(() => { $('companion-copy-btn').textContent = 'Copy brief'; }, 1800);
      } catch {}
    });
  }
  if ($('companion-close-btn')) {
    $('companion-close-btn').addEventListener('click', () => {
      $('twin-companion-brief').hidden = true;
    });
  }

  if ($('copilot-form')) {
    $('copilot-form').addEventListener('submit', e => {
      e.preventDefault();
      askCopilotQuestion(undefined, 'explore_evidence');
    });
  }
  if ($('copilot-input')) {
    $('copilot-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        askCopilotQuestion(undefined, 'explore_evidence');
      }
    });
  }

  if ($('copilot-clear-btn')) {
    $('copilot-clear-btn').addEventListener('click', async () => {
      if (voice) {
        voice.stopSpeaking();
        voice.stopRecording();
        voice.stopLiveCall();
      }
      if ($('copilot-log')) $('copilot-log').replaceChildren();
      if (localGuideSession) localGuideSession.clear();
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
      updateCopilotHeader();
      if ($('copilot-send-btn')) $('copilot-send-btn').disabled = false;
      setCopilotStatus('Co-pilot conversation reset.');
    });
  }

  // Co-Pilot Voice Controls (Auto-Speak, Push-to-Talk Mic, and Two-Way Live Voice Call)
  if ($('copilot-autospeak-btn')) {
    $('copilot-autospeak-btn').addEventListener('click', () => {
      autoSpeak = !autoSpeak;
      const btn = $('copilot-autospeak-btn');
      btn.setAttribute('aria-pressed', String(autoSpeak));
      btn.textContent = autoSpeak ? '🔊 Voice On' : '🔈 Voice Off';
      if (!autoSpeak && voice) voice.stopSpeaking();
    });
  }

  if ($('copilot-mic-btn')) {
    $('copilot-mic-btn').addEventListener('click', async () => {
      if (!voice) return;
      const micBtn = $('copilot-mic-btn');
      const input = $('copilot-input');
      if (isRecording) {
        voice.stopRecording();
        isRecording = false;
        micBtn.classList.remove('is-recording');
        micBtn.textContent = '🎤';
        return;
      }
      isRecording = true;
      micBtn.classList.add('is-recording');
      micBtn.textContent = '⏹';
      setCopilotStatus('Listening… Speak your question about the posting or resume');
      await voice.startRecording({
        serverSttEnabled: serverCapabilities.voice.sttEnabled,
        onInterim: text => { if (input) input.value = text; },
        onResult: text => {
          if (input) input.value = text;
          askCopilotQuestion(text, 'explore_evidence');
        },
        onError: err => setCopilotStatus(err.message || 'Microphone error.'),
        onStop: () => {
          isRecording = false;
          micBtn.classList.remove('is-recording');
          micBtn.textContent = '🎤';
        }
      });
    });
  }

  function syncCopilotLiveUi(active, statusLabel, state = 'idle') {
    const liveBtn = $('copilot-live-call-btn');
    const stage = $('copilot-live-stage');
    const stageStatus = $('copilot-live-status');
    const orb = $('copilot-live-orb');
    if (liveBtn) {
      liveBtn.classList.toggle('is-active', active);
      liveBtn.setAttribute('aria-pressed', String(active));
      liveBtn.textContent = active ? '⏹ End Call' : '🎙️ Live Call';
    }
    if (stage) stage.hidden = !active;
    if (stageStatus && statusLabel) stageStatus.textContent = statusLabel;
    if (orb) orb.classList.toggle('is-speaking', state === 'speaking');
  }

  async function toggleCopilotLiveCall() {
    if (!voice) return;
    if (isLiveCallActive) {
      voice.stopLiveCall();
      isLiveCallActive = false;
      syncCopilotLiveUi(false, 'Live voice call ended.');
      setCopilotStatus('Live voice call ended.');
      return;
    }
    isLiveCallActive = true;
    syncCopilotLiveUi(true, 'Connecting to ElevenLabs Conversational AI…', 'connecting');
    await voice.startLiveCall({
      activeRoute: '#resume',
      activeTier: 5,
      sessionToken,
      onStatusChange: (state, label) => {
        setCopilotStatus(label);
        if (state === 'ended' || state === 'error') {
          isLiveCallActive = false;
          syncCopilotLiveUi(false, label, state);
        } else {
          syncCopilotLiveUi(true, label, state);
        }
      },
      onTranscript: ({ role, text }) => {
        if (!text) return;
        if (role === 'user') {
          const log = $('copilot-log');
          if (log) {
            log.appendChild(el('div', `🎙️ ${text}`, 'copilot-msg-user'));
            log.scrollTop = log.scrollHeight;
          }
        } else {
          appendCopilotReply('', {
            heading: 'Josh Boyer (Live Voice)',
            replyMarkdown: text,
            spokenSummary: text,
            citedChunkIds: []
          });
        }
      },
      onError: err => {
        setCopilotStatus(err.message || 'Live voice unavailable.');
      }
    });
  }

  if ($('copilot-live-call-btn')) {
    $('copilot-live-call-btn').addEventListener('click', toggleCopilotLiveCall);
  }
  if ($('copilot-live-end-btn')) {
    $('copilot-live-end-btn').addEventListener('click', toggleCopilotLiveCall);
  }

  // Export Actions
  function download(filename, type, text) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = el('a');
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  $('text-export').addEventListener('click', () => {
    if (resume) {
      download('Josh-Boyer-tailored-resume.txt', 'text/plain;charset=utf-8', engine.toText(resume));
      $('tool-status').textContent = 'Resume download requested. Your browser controls the saved location.';
    }
  });

  if ($('copy-resume-btn')) {
    $('copy-resume-btn').addEventListener('click', async () => {
      if (!resume) return;
      try {
        await navigator.clipboard.writeText(engine.toText(resume));
        $('copy-resume-btn').textContent = '✓ Copied to clipboard';
        $('tool-status').textContent = 'Canonical resume text copied to clipboard.';
        setTimeout(() => { $('copy-resume-btn').textContent = 'Copy resume text'; }, 2000);
      } catch {
        $('tool-status').textContent = 'Clipboard permission unavailable; use Download .txt instead.';
      }
    });
  }

  $('selection-export').addEventListener('click', () => {
    if (!resume) return;
    const record = {
      datasetVersion: result.datasetVersion,
      rankingVersion: result.rankingVersion,
      templateVersion: result.templateVersion,
      profileId: result.profileId,
      profileChoice: result.profileChoice,
      summaryId: resume.summaryId,
      selectedIds: resume.selectedIds,
      selection: result.ranked.filter(x => selected.has(x.id)),
      sourceRefs: resume.sourceRefs,
      qualificationsToConfirm: result.qualificationIds,
      unrecognizedLineCount: result.unrecognizedRequirementIds.length,
      note: 'Job text excluded. Evidence links and qualification notes remain in the versioned dataset.'
    };
    download('Josh-Boyer-resume-selection.json', 'application/json', JSON.stringify(record, null, 2) + '\n');
    $('tool-status').textContent = 'Selection JSON download requested; job text is excluded.';
  });

  $('print-resume').addEventListener('click', () => {
    if (resume) window.print();
  });

  window.addEventListener('pageshow', () => {
    requestAnimationFrame(() => {
      if (posting.value && !result) invalidate('Restored posting. Match evidence to build the resume again.');
      else syncPostingCount();
    });
  });

  // Bootstrap Evidence Dataset, Twin Status, and Optional Cross-Page Session Handoff
  fetch('career-evidence.v3.json', { credentials: 'same-origin', redirect: 'error' })
    .then(response => {
      if (!response.ok) throw new Error('The approved evidence could not be loaded. Reload the page to try again.');
      return response.json();
    })
    .then(value => {
      engine.validate(value);
      data = value;
      if (guideEngine) localGuideSession = guideEngine.createSession(data);
      $('match-button').disabled = false;
      $('data-version').textContent =
        'Evidence ' + data.datasetVersion + ' · Ranking ' + data.rankingVersion + ' · Template ' + data.templateVersion;
      renderCopilotStarters();

      // Check for cross-page handoff from the portfolio Digital Twin drawer
      try {
        const rawHandoff = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('josh_twin_resume_handoff') : null;
        if (rawHandoff) {
          sessionStorage.removeItem('josh_twin_resume_handoff');
          const parsed = JSON.parse(rawHandoff);
          if (parsed && typeof parsed.posting === 'string' && parsed.posting.trim().length >= 20) {
            posting.value = parsed.posting.trim();
            if (parsed.profile && ['auto', 'insurance', 'integrations', 'solutions'].includes(parsed.profile)) {
              profile.value = parsed.profile;
            }
            syncPostingCount();
            result = engine.build(data, posting.value, profile.value);
            const handoffIds = Array.isArray(parsed.selectedIds)
              ? parsed.selectedIds.filter(id => result.ranked.some(r => r.id === id))
              : [];
            selected = new Set(handoffIds.length ? handoffIds.slice(0, engine.MAX_SELECTION) : result.selectedIds);
            twinRecommendedIds = new Set(selected);
            renderResults();
          }
        }
      } catch {}
    })
    .catch(() => {
      $('data-version').textContent = 'Evidence unavailable.';
      showError('posting-error', 'The approved evidence could not be loaded or validated. Reload the page to try again.');
    });

  // Fetch Digital Twin server capabilities & session status
  Promise.resolve(null)
    .then(r => (r?.ok ? r.json() : null))
    .then(st => {
      if (!st) return;
      serverCapabilities.reachable = true;
      serverCapabilities.mode = st.mode || 'rule-based';
      serverCapabilities.llmProvider = st.llmProvider || 'local-deterministic';
      serverCapabilities.voice = st.voice || { sttEnabled: false, ttsEnabled: false, liveAgentEnabled: false };
      serverCapabilities.turnsUsed = st.session?.turnsUsed || 0;
      serverCapabilities.turnsLimit = st.session?.turnsLimit || 8;
      sessionToken = st.session?.sessionToken || '';
      updateCopilotHeader();
    })
    .catch(() => {});
})();
