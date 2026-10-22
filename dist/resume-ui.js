/* All job text stays in memory and is rendered as text, never markup or instructions. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const engine = window.ResumeEngine;
  const posting = $('job-posting'), profile = $('role-focus');
  let data = null, result = null, resume = null, selected = new Set();
  const example = 'Illustrative posting: Insurance integration analyst\nDefine provider and broker integration requirements.\nMap CSIO/ACORD data and work with SOAP, XML and REST interfaces.\nUse SQL and reconciliation to validate claims data.\nGive technical guidance to vendor and delivery teams.\nAWS certification required.';
  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function showError(id, message) { $(id).textContent = message; $(id).hidden = !message; }
  function exportState(enabled) {
    for (const id of ['text-export', 'print-resume', 'selection-export']) $(id).disabled = !enabled;
  }
  function syncPostingCount() {
    $('posting-count').textContent = posting.value.length.toLocaleString('en-US') + ' / 12,000 characters';
  }
  function invalidate(message = '') {
    result = null; resume = null; selected.clear();
    $('match-results').hidden = true; $('resume-preview').hidden = true;
    $('resume-preview').replaceChildren(); $('tool-status').textContent = message;
    showError('posting-error', ''); showError('selection-error', '');
    posting.removeAttribute('aria-invalid'); exportState(false);
    syncPostingCount();
  }
  const chunkById = id => data.chunks.find(c => c.id === id);
  const facetNames = ids => ids.map(id => data.facets.find(f => f.id === id).label).join(', ');
  function sourceLink(sourceId, text) {
    const source = data.sources.find(s => s.id === sourceId);
    const a = el('a', text || sourceId); a.href = source.path; return a;
  }
  function renderResume() {
    const paper = $('resume-preview'); paper.replaceChildren();
    showError('selection-error', '');
    $('selection-count').textContent = selected.size + ' selected · maximum 8';
    if (!selected.size) {
      resume = null; paper.hidden = true; exportState(false);
      showError('selection-error', 'Choose at least one evidence chunk to create the resume.');
      $('preview-link').hidden = true; return;
    }
    resume = engine.compose(data, result, [...selected]);
    $('preview-link').hidden = false; paper.hidden = false; exportState(true);
    const name = el('h2', resume.name); name.id = 'resume-name'; paper.append(name, el('p', resume.positioning, 'resume-position'));
    paper.append(el('h3', 'Professional summary'), el('p', resume.summary), el('h3', 'Selected areas of experience'), el('p', resume.focus.join(' · ')), el('h3', 'Professional experience'));
    function bullets(chunks) {
      const list = el('ul');
      for (const c of chunks) { const li = el('li', c.resumeText); li.append(el('span', c.id, 'chunk-reference')); list.append(li); }
      return list;
    }
    for (const role of resume.roles) {
      paper.append(el('h4', role.employer + ' · ' + role.period), el('p', role.title, 'role-title'));
      if (role.chunks.length) paper.append(bullets(role.chunks)); else paper.append(el('p', role.scope));
    }
    if (resume.independent.length) {
      paper.append(el('h3', 'Independent projects'));
      for (const c of resume.independent) paper.append(el('h4', c.title + ' · ' + c.period), bullets([c]));
    }
    paper.append(el('h3', 'Evidence references'));
    const refs = el('div', undefined, 'resume-references');
    refs.append(el('p', 'Prewritten public career evidence. IDs identify sources; they are not external certifications.'));
    for (const id of resume.sourceRefs) { refs.append(sourceLink(id)); refs.append(document.createTextNode(' ')); }
    refs.append(el('p', 'Evidence ' + resume.versions.dataset + ' · Ranking ' + resume.versions.ranking + ' · Template ' + resume.versions.template)); paper.append(refs);
  }
  function renderResults() {
    $('match-results').hidden = false;
    const related = result.requirements.filter(r => r.evidenceIds.length).length;
    const focus = data.profiles.find(p => p.id === result.profileId).label;
    $('match-summary').textContent = focus + ' emphasis. ' + related + ' of ' + result.requirements.length + ' posting lines have related topics; ' + result.unrecognizedRequirementIds.length + ' have no recognized topic. Every requirement still needs human review.';
    const qlist = $('qualification-list'); qlist.replaceChildren();
    for (const id of result.qualificationIds) {
      const q = data.qualificationCatalog.find(x => x.id === id), li = el('li');
      li.append(el('strong', q.label + ': '), document.createTextNode(q.note)); qlist.append(li);
    }
    $('qualification-notes').hidden = !result.qualificationIds.length;
    const mapping = $('requirement-mapping'); mapping.replaceChildren();
    for (const row of result.requirements) {
      const li = el('li'), source = el('div'), matches = el('div');
      source.append(el('p', row.text), el('p', row.facets.length ? 'Related topics: ' + facetNames(row.facets) : 'No recognized topic. Review this requirement directly.', 'mapping-caption'));
      for (const id of row.evidenceIds) { const c = chunkById(id); matches.append(sourceLink(c.sourceRefs[0], c.title + ' · ' + c.id)); }
      if (!row.evidenceIds.length) matches.append(el('p', 'No approved evidence selected for this line.'));
      if (row.qualifications.length) matches.append(el('p', 'Additional qualification requires confirmation; see notes above.', 'mapping-caption'));
      li.append(source, matches); mapping.append(li);
    }
    const options = $('evidence-options'); options.replaceChildren();
    for (const rank of result.ranked) {
      const c = chunkById(rank.id), role = data.roles.find(r => r.id === c.roleId);
      const row = el('div', undefined, 'evidence-option'), main = el('div'), reason = el('div', undefined, 'reason-copy');
      const label = el('label'), checkbox = el('input'); checkbox.type = 'checkbox'; checkbox.checked = selected.has(c.id); checkbox.value = c.id; checkbox.setAttribute('aria-describedby', 'reason-' + c.id);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked && selected.size >= engine.MAX_SELECTION) { checkbox.checked = false; showError('selection-error', 'Choose at most eight chunks. Remove one before adding another.'); return; }
        if (checkbox.checked) selected.add(c.id); else selected.delete(c.id);
        renderResume(); $('tool-status').textContent = 'Resume updated: ' + selected.size + ' evidence chunks selected.';
      });
      label.append(checkbox, el('span', c.title));
      main.append(label, el('p', role.employer + ' · ' + c.period + (c.kind === 'project' ? ' · Independent project' : ''), 'evidence-meta'), el('p', c.resumeText));
      reason.id = 'reason-' + c.id;
      reason.append(el('p', 'Related topics: ' + facetNames(rank.matchedFacets) + '. Score ' + rank.score + ' = topic points ' + rank.keywordPoints + ' + emphasis points ' + rank.profilePoints + '. Priority ' + rank.priority + '; stable ID ' + rank.id + '.'));
      const details = el('details'); details.append(el('summary', 'Decision, process and qualifications'), el('p', c.decision));
      const steps = el('ol'); for (const step of c.process) steps.append(el('li', step)); details.append(steps, el('p', 'Technical guidance: ' + c.technicalGuidance), el('p', 'Outcome: ' + c.outcome));
      const notes = el('ul'); for (const note of [...role.qualificationNotes, ...c.qualificationNotes]) notes.append(el('li', note)); details.append(notes, el('p', 'Source confidence: approved public account; not independent certification.'));
      for (const id of c.sourceRefs) details.append(sourceLink(id, 'Read the approved case study')); reason.append(details);
      row.append(main, reason); options.append(row);
    }
    renderResume();
    if (!result.ranked.length) $('tool-status').textContent = 'No recognized evidence connection. Try more specific responsibilities, or read the portfolio directly. No resume was generated.';
    else $('tool-status').textContent = 'Matched approved evidence. Review the qualifications and selection before exporting.';
    $('match-title').focus({preventScroll:true});
    $('match-results').scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block:'start'});
  }
  $('posting-form').addEventListener('submit', event => {
    event.preventDefault();
    syncPostingCount();
    if (!data) return;
    try { result = engine.build(data, posting.value, profile.value); selected = new Set(result.selectedIds); showError('posting-error', ''); posting.removeAttribute('aria-invalid'); renderResults(); }
    catch (error) { invalidate(); showError('posting-error', error.message); posting.setAttribute('aria-invalid', 'true'); posting.focus(); }
  });
  posting.addEventListener('input', () => invalidate('Posting changed. Match evidence to refresh the resume.'));
  profile.addEventListener('change', () => invalidate('Emphasis changed. Match evidence to refresh the resume.'));
  posting.addEventListener('paste', event => {
    const text = event.clipboardData?.getData('text');
    if (text !== undefined && posting.value.length - (posting.selectionEnd - posting.selectionStart) + text.length > engine.LIMIT) {
      event.preventDefault(); invalidate(); showError('posting-error', 'That paste exceeds 12,000 characters. Shorten it first; no text was truncated.'); posting.setAttribute('aria-invalid', 'true');
    }
  });
  $('example-button').addEventListener('click', () => { posting.value = example; invalidate('Example posting loaded. Choose Match evidence to try it.'); posting.focus(); });
  $('clear-button').addEventListener('click', () => { posting.value = ''; profile.value = 'auto'; invalidate('Posting and selection cleared.'); posting.focus(); });
  $('preview-link').addEventListener('click', () => { if (resume) $('resume-preview').focus({preventScroll:true}); });
  function download(filename, type, text) {
    const url = URL.createObjectURL(new Blob([text], {type})), a = el('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $('text-export').addEventListener('click', () => { if (resume) { download('Josh-Boyer-tailored-resume.txt', 'text/plain;charset=utf-8', engine.toText(resume)); $('tool-status').textContent = 'Resume download requested. Your browser controls the saved location.'; } });
  $('selection-export').addEventListener('click', () => {
    if (!resume) return;
    const record = { datasetVersion: result.datasetVersion, rankingVersion: result.rankingVersion, templateVersion: result.templateVersion, profileId: result.profileId, profileChoice: result.profileChoice, summaryId: resume.summaryId, selectedIds: resume.selectedIds,
      selection: result.ranked.filter(x => selected.has(x.id)), sourceRefs: resume.sourceRefs, qualificationsToConfirm: result.qualificationIds, unrecognizedLineCount: result.unrecognizedRequirementIds.length, note:'Job text excluded. Evidence links and qualification notes remain in the versioned dataset.' };
    download('Josh-Boyer-resume-selection.json', 'application/json', JSON.stringify(record, null, 2) + '\n'); $('tool-status').textContent = 'Selection JSON download requested; job text is excluded.';
  });
  $('print-resume').addEventListener('click', () => { if (resume) window.print(); });
  // Native history may restore form values after pageshow. Reconcile on the next
  // frame without storing the posting or carrying an old selection across pages.
  window.addEventListener('pageshow', () => {
    requestAnimationFrame(() => {
      if (posting.value) invalidate('Restored posting. Match evidence to build the resume again.');
      else syncPostingCount();
    });
  });
  fetch('career-evidence.v3.json', {credentials:'same-origin', redirect:'error'}).then(response => {
    if (!response.ok) throw new Error('The approved evidence could not be loaded. Reload the page to try again.');
    return response.json();
  }).then(value => {
    engine.validate(value); data = value; $('match-button').disabled = false;
    $('data-version').textContent = 'Evidence ' + data.datasetVersion + ' · Ranking ' + data.rankingVersion + ' · Template ' + data.templateVersion;
  }).catch(() => { $('data-version').textContent = 'Evidence unavailable.'; showError('posting-error', 'The approved evidence could not be loaded or validated. Reload the page to try again.'); });
})();
