/* Versioned, deterministic selection of approved text. No inference or network access. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ResumeEngine = api;
})(globalThis, function () {
  'use strict';
  const LIMIT = 12000, MAX_REQUIREMENTS = 80, MAX_SELECTION = 8;
  const versions = Object.freeze({ ranking: 'rank-1', template: 'resume-1' });
  const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  const normalize = text => text.normalize('NFKC').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/\r\n?/g, '\n').trim();
  const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const contains = (text, alias) => new RegExp('(^|[^a-z0-9])' + escapeRegex(alias) + '(?=$|[^a-z0-9])', 'i').test(text);
  function validate(data) {
    if (!data || data.schemaVersion !== '1.0.0' || data.rankingVersion !== versions.ranking || data.templateVersion !== versions.template) throw new Error('The evidence and matching versions are incompatible. Reload the page.');
    for (const key of ['roles', 'facets', 'profiles', 'summaries', 'sections', 'qualificationCatalog', 'sources', 'chunks']) {
      if (!Array.isArray(data[key]) || !data[key].length) throw new Error('The approved evidence is incomplete.');
      const ids = data[key].map(x => x.id);
      if (ids.some(id => typeof id !== 'string') || new Set(ids).size !== ids.length) throw new Error('The approved evidence has invalid identifiers.');
    }
    for (const chunk of data.chunks) {
      if (!data.roles.some(role => role.id === chunk.roleId) || !chunk.sourceRefs.length || chunk.sourceRefs.some(id => !data.sources.some(s => s.id === id)) || chunk.tags.some(tag => !data.facets.some(f => f.id === tag)) || typeof chunk.resumeText !== 'string' || !Number.isFinite(chunk.priority)) throw new Error('A career chunk has invalid references.');
    }
    for (const source of data.sources) if (!/^index\.html#projects\/[a-z0-9-]+$/.test(source.path)) throw new Error('An evidence link is outside the approved portfolio.');
    return true;
  }
  function requirements(text) {
    if (typeof text !== 'string' || text.length > LIMIT) throw new Error('Use at most 12,000 characters. Shorten the posting and try again.');
    const clean = normalize(text);
    if (clean.length > LIMIT) throw new Error('Use at most 12,000 characters. Shorten the posting and try again.');
    if (clean.length < 20) throw new Error('Paste at least 20 characters from a job posting, then match the evidence.');
    const lines = clean.split(/\n+|[;]+|(?<=[.!?])\s+(?=[A-Z])/).map(x => x.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean);
    if (lines.length > MAX_REQUIREMENTS) throw new Error('Use at most 80 requirement lines or sentences. Remove boilerplate and try again.');
    return lines;
  }
  function build(data, text, profileChoice = 'auto') {
    validate(data);
    if (profileChoice !== 'auto' && !data.profiles.some(p => p.id === profileChoice)) throw new Error('Choose one of the available role focuses.');
    const lines = requirements(text);
    const rows = lines.map((text, i) => ({ id: 'requirement-' + String(i + 1).padStart(3, '0'), text,
      facets: data.facets.filter(f => f.aliases.some(alias => contains(text, alias))).map(f => f.id),
      qualifications: data.qualificationCatalog.filter(q => q.active !== false && q.aliases.some(alias => contains(text, alias))).map(q => q.id)
    }));
    const counts = {};
    for (const row of rows) for (const id of row.facets) counts[id] = (counts[id] || 0) + 1;
    const profile = profileChoice === 'auto' ? [...data.profiles].sort((a, b) => {
      const weight = p => Object.entries(p.facetWeights).reduce((n, [id, w]) => n + (counts[id] || 0) * w, 0);
      return weight(b) - weight(a) || cmp(a.id, b.id);
    })[0] : data.profiles.find(p => p.id === profileChoice);
    const ranked = data.chunks.filter(chunk => chunk.active !== false).map(chunk => {
      const matchedFacets = chunk.tags.filter(id => counts[id]);
      const keywordPoints = matchedFacets.reduce((n, id) => n + Math.min(counts[id], 3) * 10, 0);
      const profilePoints = chunk.tags.reduce((n, id) => n + (profile.facetWeights[id] || 0), 0);
      return { id: chunk.id, matchedFacets, keywordPoints, profilePoints, score: keywordPoints + profilePoints, priority: chunk.priority };
    }).filter(x => x.matchedFacets.length).sort((a, b) => b.score - a.score || b.priority - a.priority || cmp(a.id, b.id));
    for (const row of rows) row.evidenceIds = ranked.filter(rank => rank.matchedFacets.some(id => row.facets.includes(id))).slice(0, 3).map(x => x.id);
    return { datasetVersion: data.datasetVersion, rankingVersion: versions.ranking, templateVersion: versions.template,
      profileId: profile.id, profileChoice, requirements: rows, ranked, selectedIds: ranked.slice(0, 6).map(x => x.id),
      qualificationIds: data.qualificationCatalog.filter(q => rows.some(row => row.qualifications.includes(q.id))).map(q => q.id),
      unrecognizedRequirementIds: rows.filter(row => !row.facets.length).map(row => row.id)
    };
  }
  function compose(data, result, selectedIds = result.selectedIds) {
    validate(data);
    if (result.datasetVersion !== data.datasetVersion || result.rankingVersion !== versions.ranking || result.templateVersion !== versions.template) throw new Error('The selection belongs to a different evidence version. Match the posting again.');
    if (!Array.isArray(selectedIds) || !selectedIds.length || selectedIds.length > MAX_SELECTION || new Set(selectedIds).size !== selectedIds.length || selectedIds.some(id => !result.ranked.some(r => r.id === id))) throw new Error('Select between one and eight matching evidence chunks.');
    const selected = result.ranked.filter(r => selectedIds.includes(r.id)).map(r => data.chunks.find(c => c.id === r.id));
    const summary = data.summaries.find(s => s.profileId === result.profileId);
    const facets = data.facets.filter(f => selected.some(c => c.tags.includes(f.id)) && result.ranked.some(r => selectedIds.includes(r.id) && r.matchedFacets.includes(f.id))).map(f => f.label);
    const roles = [...data.roles].filter(r => r.id !== 'role-independent').sort((a, b) => b.sort - a.sort).map(role => ({...role, chunks: selected.filter(c => c.roleId === role.id)}));
    return { name: data.person.name, positioning: data.person.positioning, summary: summary.text, summaryId: summary.id,
      focus: facets, roles, independent: selected.filter(c => c.roleId === 'role-independent'),
      selectedIds: selected.map(c => c.id), sourceRefs: [...new Set([...summary.sourceRefs, ...selected.flatMap(c => c.sourceRefs)])].sort(cmp),
      versions: { dataset: data.datasetVersion, ranking: versions.ranking, template: versions.template }
    };
  }
  function toText(resume) {
    const lines = [resume.name, resume.positioning, '', 'PROFESSIONAL SUMMARY', resume.summary, '', 'SELECTED AREAS OF EXPERIENCE', resume.focus.join(' · '), '', 'PROFESSIONAL EXPERIENCE'];
    for (const role of resume.roles) {
      lines.push('', role.employer + ' | ' + role.period, role.title);
      if (role.chunks.length) for (const c of role.chunks) lines.push('- ' + c.resumeText + ' [' + c.id + ']');
      else lines.push(role.scope);
    }
    if (resume.independent.length) {
      lines.push('', 'INDEPENDENT PROJECTS');
      for (const c of resume.independent) lines.push('', c.title + ' | ' + c.period, '- ' + c.resumeText + ' [' + c.id + ']');
    }
    lines.push('', 'EVIDENCE REFERENCES', 'Approved public portfolio case summaries. Evidence IDs identify the selected prewritten chunks; they are not external certifications.', ...resume.sourceRefs,
      '', 'Evidence ' + resume.versions.dataset + ' | Ranking ' + resume.versions.ranking + ' | Template ' + resume.versions.template);
    return lines.join('\n');
  }
  return Object.freeze({ LIMIT, MAX_REQUIREMENTS, MAX_SELECTION, versions, validate, requirements, build, compose, toText, contains });
});
