'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const career = require('../dist/career-reference.js');
const { server } = require('../serve.cjs');

const root = path.resolve(__dirname, '..');

function httpGet(port, reqPath, method = 'GET', headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: reqPath,
        method,
        headers: { Connection: 'close', ...headers }
      },
      res => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8')
          })
        );
      }
    );
    req.on('error', reject);
    req.end();
  });
}

test('every career chapter evidence link resolves to an approved case template', () => {
  const html = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
  const slugs = new Set([...html.matchAll(/<template id="project-([^"]+)"/g)].map(match => match[1]));
  for (const chapter of career.CHAPTERS) {
    for (const [slug] of chapter.links) assert.ok(slugs.has(slug), `${chapter.id}: missing evidence ${slug}`);
    for (const p of chapter.projectCards) assert.ok(slugs.has(p.slug), `${chapter.id}: missing projectCard slug ${p.slug}`);
  }
});

test('R1 & R24–R26: CareerReference renders V2 03 / Career Journey 2-column hero, straight 4-node timeline track, 4 chapter selector cards, master-detail panel, and timeline archive on the Home page without duplicate 04 / Skills section', () => {
  const sentinelTimeline = '<div id="home-career-timeline" class="career-body-grid is-home-embedded">TIMELINE_SENTINEL</div>';
  const rendered = career.render(sentinelTimeline, { omitSkills: true });

  // R24: Top 2-column header & straight 4-node horizontal timeline track
  assert.match(rendered, /03 \/ <\/span>CAREER JOURNEY/);
  assert.match(rendered, /data-active-layer="hardware"/);
  assert.match(rendered, /id="cr-hero-title"[^>]*>From the <span class="cr-hl-metal">metal<\/span> to the <span class="cr-hl-cloud">cloud\.<\/span><\/h1>/);
  assert.match(rendered, /A continuous journey combining hands-on infrastructure, domain expertise, solution design and AI to build practical systems\./);
  assert.match(rendered, /class="cr-hero-aside"/);
  assert.match(rendered, /Four chapters\. One continuous path\.<br>Each stage built on the last, shaping how I solve problems today\./);
  assert.match(rendered, /class="cr-explore-timeline-btn"\s+data-cr-open-archive[\s\S]*?<span>Explore the full timeline<\/span>/);
  assert.doesNotMatch(rendered, /class="cr-actions"|data-cr-explore|data-cr-story|Explore the journey/);
  assert.match(rendered, /class="cr-metrics"/);
  assert.match(rendered, /assets\/career-layers-v1\.webp/);
  assert.match(rendered, /class="cr-journey"/);
  assert.match(rendered, /class="cr-v2-timeline"/);
  assert.match(rendered, /class="cr-milestones"/);
  assert.match(rendered, /1\. HARDWARE &amp; SUPPORT/);
  assert.match(rendered, /2\. INSURANCE SYSTEMS/);
  assert.match(rendered, /3\. AI &amp; SOLUTION DESIGN/);
  assert.match(rendered, /4\. ALWAYS LEARNING/);

  // R25 & R35–R37: 4 interactive chapter selector cards row with Hero-aligned themes (hardware=metal, insurance=gold, solutions=blue, learning=teal)
  assert.match(rendered, /class="cr-chapter-cards"/);
  const expectedThemes = {
    hardware: 'metal',
    insurance: 'gold',
    solutions: 'blue',
    learning: 'teal'
  };
  for (const chapter of career.CHAPTERS) {
    assert.equal(chapter.theme, expectedThemes[chapter.id], `${chapter.id} theme must be ${expectedThemes[chapter.id]}`);
    assert.match(rendered, new RegExp(`class="cr-chapter theme-${expectedThemes[chapter.id]}[^"]*"\\s+data-cr-chapter-card="${chapter.id}"`));
    assert.match(rendered, new RegExp(`class="theme-${expectedThemes[chapter.id]}[^"]*"\\s+data-cr-milestone="${chapter.id}"`));
    assert.match(rendered, new RegExp(`class="cr-detail-pane theme-${expectedThemes[chapter.id]}"\\s+data-cr-detail-pane="${chapter.id}"`));
  }
  assert.match(rendered, /src="assets\/builds\/cr-card-1-hardware\.png"/);
  assert.match(rendered, /src="assets\/builds\/cr-card-2-insurance\.png"/);
  assert.match(rendered, /src="assets\/builds\/cr-card-3-ai\.png"/);
  assert.match(rendered, /src="assets\/builds\/cr-card-4-learning\.png"/);
  assert.match(rendered, /<span class="cr-card-status" data-cr-card-status>Selected<\/span>/);
  assert.match(rendered, /<span class="cr-card-status" data-cr-card-status>Explore<\/span>/);

  // R26 & R37: Bottom full-width selected chapter master-detail panel starts on metal theme for Chapter 1 (hardware)
  assert.match(rendered, /class="cr-selected-chapter-panel"\s+id="career-chapter-details"\s+data-cr-selected-panel\s+data-panel-theme="metal"/);
  const crCssText = fs.readFileSync(path.join(root, 'dist/career-reference.css'), 'utf8');
  assert.match(crCssText, /#home-career-section\s+\.theme-metal\s*\{\s*--theme:\s*#cbd5e1;\s*--accent:\s*#cbd5e1;\s*\}/);
  assert.match(crCssText, /#home-career-section\s+\.theme-gold\s*\{\s*--theme:\s*#fbbf24;\s*--accent:\s*#fbbf24;\s*\}/);
  assert.match(crCssText, /#home-career-section\s+\.theme-blue\s*\{\s*--theme:\s*#38bdf8;\s*--accent:\s*#38bdf8;\s*\}/);
  assert.match(crCssText, /#home-career-section\s+\.theme-teal\s*\{\s*--theme:\s*#2dd4bf;\s*--accent:\s*#2dd4bf;\s*\}/);
  assert.match(crCssText, /#home-career-section\s+\.cr-intro\s+#cr-hero-title\s+\.cr-hl-metal\s*\{[^}]*color:\s*#cbd5e1\s*!important/);
  assert.match(crCssText, /#home-career-section\s+\.cr-intro\s+#cr-hero-title\s+\.cr-hl-cloud\s*\{[^}]*color:\s*#29b6f6\s*!important/);
  assert.match(rendered, /src="assets\/builds\/cr-detail-1-dell\.png"/);
  assert.match(rendered, /<span class="cr-chapter-counter" data-cr-chapter-counter>Chapter 1 of 4<\/span>/);
  assert.match(rendered, /data-cr-chapter-step="-1"/);
  assert.match(rendered, /data-cr-chapter-step="1"/);
  assert.match(rendered, /I started my career with <strong>hands-on hardware diagnostics<\/strong> and client support at Dell Canada and OptiPlex\./);
  assert.match(rendered, /Hardware diagnostics and repair/);
  assert.match(rendered, /Network operations and monitoring/);
  assert.match(rendered, /Infrastructure migrations/);
  assert.match(rendered, /Client support and escalation/);
  assert.match(rendered, /<p class="cr-detail-projects-kicker">KEY PROJECTS FROM THIS CHAPTER<\/p>/);
  assert.match(rendered, /src="assets\/builds\/cr-proj-1-dell\.png"/);
  assert.match(rendered, /<strong>Dell Canada Support Operations<\/strong>/);
  assert.match(rendered, /src="assets\/builds\/cr-proj-2-harris\.png"/);
  assert.match(rendered, /<strong>Harris Infrastructure Migrations<\/strong>/);

  assert.match(rendered, /<details class="cr-archive">/);
  assert.match(rendered, /Explore the full career timeline/);
  assert.match(rendered, /TIMELINE_SENTINEL/);
  assert.doesNotMatch(rendered, /class="cr-skills"|04 \/ SKILLS &amp; CAPABILITIES/);

  // Verify architect-workbench.js mounts CareerReference inside #home-career-section
  const wbJs = fs.readFileSync(path.join(root, 'dist/architect-workbench.js'), 'utf8');
  const homeCareerIdx = wbJs.indexOf('id="home-career-section"');
  assert.ok(homeCareerIdx > 0, '#home-career-section must exist on the Home page');
  assert.match(wbJs, /window\.CareerReference\.render\(\s*buildCareerWorkbenchGridHtml\(true\)/);
  assert.match(wbJs, /window\.CareerReference\.mount\(\s*homeCareerSection\s*\)/);
  assert.doesNotMatch(wbJs, /<span class="hl-white">Twenty years<\/span>/);
});

test('R2 & R3: Single-page consolidation keeps section[data-page="home"] active for #home, #projects, #career, #skills, and #about while opening #project-detail for #projects/<slug>', async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  try {
    const [resApp, resWb, resCr, resCrCss, resWbCss] = await Promise.all([
      httpGet(port, '/app.js'),
      httpGet(port, '/architect-workbench.js'),
      httpGet(port, '/career-reference.js'),
      httpGet(port, '/career-reference.css'),
      httpGet(port, '/architect-workbench.css')
    ]);
    assert.equal(resApp.status, 200);
    assert.equal(resWb.status, 200);
    assert.equal(resCr.status, 200);
    assert.equal(resCrCss.status, 200);
    assert.equal(resWbCss.status, 200);

    const appJs = resApp.body;
    const wbJs = resWb.body;
    const crCss = resCrCss.body;
    const wbCss = resWbCss.body;

    // 1. app.js keeps section[data-page="home"] visible for all top-level section routes (home, projects, career, skills, about)
    assert.match(appJs, /sectionTargets\s*=\s*\{/);
    assert.match(appJs, /projects:\s*"#home-featured-projects"/);
    assert.match(appJs, /career:\s*"#home-career-section"/);
    assert.match(appJs, /skills:\s*"#home-skills-section"/);
    assert.match(appJs, /about:\s*"#home-about-section"/);
    assert.match(appJs, /page\.dataset\.page\s*!==\s*"home"/);

    // 2. architect-workbench.js embeds full Builds explorer, CareerReference, Skills Explorer, and About Story on Home
    assert.match(wbJs, /data-home-builds-drawer/);
    assert.match(wbJs, /data-home-skills-drawer/);
    assert.match(wbJs, /data-home-about-drawer/);
    assert.match(wbJs, /buildSkillsWorkbenchBodyHtml\(true\)/);

    // 3. syncProjectRouteView in architect-workbench.js never hides section[data-page="home"] or drops body[data-active-route="home"] on #career, #skills, #projects, or #about
    assert.doesNotMatch(wbJs, /sec\.hidden\s*=\s*sec\.getAttribute\("data-page"\)\s*!==\s*"career"/);
    assert.doesNotMatch(wbJs, /sec\.hidden\s*=\s*sec\.getAttribute\("data-page"\)\s*!==\s*"skills"/);
    assert.doesNotMatch(wbJs, /routeMode\s*=\s*"(?:projects|career|skills|about)"/);
    assert.match(wbJs, /document\.body\.setAttribute\("data-active-section",\s*activeTabId\)/);
    assert.match(wbJs, /window\.addEventListener\("portfolio:routechange",\s*syncProjectRouteView\)/);
    assert.match(wbJs, /window\.addEventListener\("portfolio:routechange",\s*onNavigationScrollGuard\)/);

    // 4. CSS visibility guard: neither #home-career-section [data-home-career-workbench] nor #home-skills-section [data-home-skills-workbench] may be display: none
    assert.doesNotMatch(wbCss, /#home-career-section\s+\[data-home-career-workbench\]\s*\{\s*display:\s*none/i);
    assert.doesNotMatch(wbCss, /#home-skills-section\s+\[data-home-skills-workbench\]\s*\{\s*display:\s*none/i);
    assert.match(wbCss, /#home-career-section\s+\[data-home-career-workbench\]\s*\{\s*display:\s*block\s*!important/i);
    assert.match(wbCss, /#home-skills-section\s+\[data-home-skills-workbench\]\s*\{\s*display:\s*block\s*!important/i);
    assert.match(crCss, /#home-career-section\s+\[data-home-career-workbench\],\s*#home-career-section\s+\.career-reference\s*\{\s*display:\s*block\s*!important/i);

    // 5. Career header background box (.cr-hero::before) is removed and #home-career-section .career-reference has transparent background and isolation: auto
    assert.match(crCss, /\.cr-hero::before\s*\{\s*content:\s*none\s*!important;\s*display:\s*none\s*!important;\s*background:\s*none\s*!important;/i);
    assert.doesNotMatch(crCss, /\.cr-hero::before\s*\{[^}]*career-dark-3floor-hero\.jpg/i);
    assert.match(crCss, /#home-career-section\s+\.career-reference\s*\{[^}]*background:\s*transparent\s*!important;[^}]*isolation:\s*auto\s*!important;/i);
    assert.match(crCss, /#home-career-section\s+\.cr-hero\s*\{\s*background:\s*transparent\s*!important;/i);
  } finally {
    await new Promise(r => server.close(r));
  }
});

test('R1–R4 & R24–R26: career.mount(section) DOM interaction, 3-point chapter step wrap-around boundaries, and adversarial canary containment (seed=0x20261028)', async () => {
  // 1. Exercise real career.mount(section) against a live DOM tree built from career.CHAPTERS
  function buildCareerDomForMount() {
    const listeners = {};
    const makeNode = (attrs = {}, parent = null) => {
      const classes = new Set((attrs.className || '').split(/\s+/).filter(Boolean));
      const attrMap = { ...attrs };
      const node = {
        parent,
        tagName: attrs.tagName || 'div',
        open: Boolean(attrs.open),
        hidden: Boolean(attrs.hidden),
        textContent: attrs.textContent || '',
        dataset: attrs.dataset || {},
        scrollCalls: 0,
        scrollIntoView() { this.scrollCalls++; },
        getAttribute(name) { return Object.prototype.hasOwnProperty.call(attrMap, name) ? attrMap[name] : null; },
        setAttribute(name, val) { attrMap[name] = String(val); },
        removeAttribute(name) { delete attrMap[name]; },
        classList: {
          toggle(cls, force) {
            const on = force === undefined ? !classes.has(cls) : Boolean(force);
            if (on) classes.add(cls); else classes.delete(cls);
            return on;
          },
          contains(cls) { return classes.has(cls); }
        },
        closest(selector) {
          let cur = this;
          const parts = selector.split(',').map(s => s.trim());
          while (cur) {
            for (const part of parts) {
              if (part === 'a' && cur.tagName === 'a') return cur;
              if (part === 'button' && cur.tagName === 'button') return cur;
              if (part === '.cr-hero' && cur.classList && cur.classList.contains('cr-hero')) return cur;
              const attrMatch = part.match(/^\[([a-z0-9-]+)(?:="([^"]+)")?\]$/i);
              if (attrMatch) {
                const val = cur.getAttribute && cur.getAttribute(attrMatch[1]);
                if (val !== null && (attrMatch[2] === undefined || val === attrMatch[2])) return cur;
              }
            }
            cur = cur.parent;
          }
          return null;
        },
        querySelector(sel) {
          if (sel === '[data-cr-card-status]') return this.statusNode || null;
          return null;
        },
        querySelectorAll(sel) {
          if (sel === '[data-cr-detail-pane]') return panes;
          return [];
        }
      };
      return node;
    };

    const rootEl = makeNode({ 'data-active-layer': 'hardware', className: 'career-reference' });
    const heroEl = makeNode({ className: 'cr-hero' }, rootEl);
    const openArchiveBtn = makeNode({ tagName: 'button', 'data-cr-open-archive': '' }, heroEl);
    const archiveEl = makeNode({ className: 'cr-archive', open: false }, rootEl);
    const stepPrevBtn = makeNode({ tagName: 'button', 'data-cr-chapter-step': '-1' }, rootEl);
    const stepNextBtn = makeNode({ tagName: 'button', 'data-cr-chapter-step': '1' }, rootEl);

    const milestones = career.CHAPTERS.map((c, i) =>
      makeNode({
        className: `theme-${c.theme}${i === 0 ? ' is-active' : ''}`,
        'data-cr-milestone': c.id,
        'data-cr-layer-trigger': c.id
      }, rootEl)
    );

    const cards = career.CHAPTERS.map((c, i) => {
      const card = makeNode({
        className: `cr-chapter theme-${c.theme}${i === 0 ? ' is-selected' : ''}`,
        'data-cr-chapter-card': c.id,
        'data-cr-layer-trigger': c.id,
        'aria-pressed': i === 0 ? 'true' : 'false'
      }, rootEl);
      card.statusNode = makeNode({ 'data-cr-card-status': '', textContent: i === 0 ? 'Selected' : 'Explore' }, card);
      return card;
    });

    const panes = career.CHAPTERS.map((c, i) =>
      makeNode({
        className: `cr-detail-pane theme-${c.theme}`,
        'data-cr-detail-pane': c.id,
        hidden: i !== 0
      }, rootEl)
    );
    const panelEl = makeNode({ 'data-cr-selected-panel': '', 'data-panel-theme': 'metal' }, rootEl);

    const section = {
      addEventListener(type, fn) { listeners[type] = fn; },
      dispatch(type, event) { if (listeners[type]) listeners[type](event); },
      querySelector(sel) {
        if (sel === '.career-reference') return rootEl;
        if (sel === '.cr-archive') return archiveEl;
        if (sel === '[data-cr-selected-panel]') return panelEl;
        return null;
      },
      querySelectorAll(sel) {
        if (sel === '[data-cr-milestone]') return milestones;
        if (sel === '[data-cr-chapter-card]') return cards;
        return [];
      }
    };

    career.mount(section);
    return { section, rootEl, archiveEl, openArchiveBtn, stepPrevBtn, stepNextBtn, milestones, cards, panes, panelEl, makeNode };
  }

  const dom = buildCareerDomForMount();

  // Verify 3-point chapter index wrap-around boundaries via [data-cr-chapter-step]:
  // Boundary point 1 (index 0 - 1 => wraps to index 3 'learning' / teal):
  dom.section.dispatch('click', { target: dom.stepPrevBtn });
  assert.equal(dom.rootEl.getAttribute('data-active-layer'), 'learning', 'index 0 step -1 wraps to learning (index 3)');
  assert.equal(dom.panelEl.getAttribute('data-panel-theme'), 'teal');
  assert.equal(dom.panes[3].hidden, false);
  assert.equal(dom.panes[0].hidden, true);
  assert.equal(dom.cards[3].statusNode.textContent, 'Selected');
  assert.equal(dom.cards[0].statusNode.textContent, 'Explore');

  // Boundary point 2 (index 3 + 1 => wraps to index 0 'hardware' / metal):
  dom.section.dispatch('click', { target: dom.stepNextBtn });
  assert.equal(dom.rootEl.getAttribute('data-active-layer'), 'hardware', 'index 3 step +1 wraps to hardware (index 0)');
  assert.equal(dom.panelEl.getAttribute('data-panel-theme'), 'metal');
  assert.equal(dom.panes[0].hidden, false);
  assert.equal(dom.panes[3].hidden, true);

  // Boundary point 3 (index 0 + 1 => advances to index 1 'insurance' / gold):
  dom.section.dispatch('click', { target: dom.stepNextBtn });
  assert.equal(dom.rootEl.getAttribute('data-active-layer'), 'insurance', 'index 0 step +1 advances to insurance (index 1)');
  assert.equal(dom.panelEl.getAttribute('data-panel-theme'), 'gold');
  assert.equal(dom.panes[1].hidden, false);
  assert.equal(dom.cards[1].getAttribute('aria-pressed'), 'true');
  assert.equal(dom.cards[0].getAttribute('aria-pressed'), 'false');
  assert.equal(dom.milestones[1].classList.contains('is-active'), true);
  assert.equal(dom.milestones[0].classList.contains('is-active'), false);

  // Verify clicking a chapter card directly selects that chapter ('solutions' / blue):
  dom.section.dispatch('click', { target: dom.cards[2] });
  assert.equal(dom.rootEl.getAttribute('data-active-layer'), 'solutions');
  assert.equal(dom.panelEl.getAttribute('data-panel-theme'), 'blue');
  assert.equal(dom.panes[2].hidden, false);

  // Verify keyboard activation (Enter / Space) on a milestone or card, and ignore non-activation keys / inner links:
  let prevented = 0;
  dom.section.dispatch('keydown', { key: 'Enter', target: dom.milestones[0], preventDefault() { prevented++; } });
  assert.equal(prevented, 1);
  assert.equal(dom.rootEl.getAttribute('data-active-layer'), 'hardware');
  dom.section.dispatch('keydown', { key: ' ', target: dom.cards[3], preventDefault() { prevented++; } });
  assert.equal(prevented, 2);
  assert.equal(dom.rootEl.getAttribute('data-active-layer'), 'learning');
  dom.section.dispatch('keydown', { key: 'Escape', target: dom.milestones[1], preventDefault() { prevented++; } });
  assert.equal(prevented, 2, 'Escape key must not trigger chapter activation');
  const innerLink = dom.makeNode({ tagName: 'a' }, dom.cards[0]);
  dom.section.dispatch('keydown', { key: 'Enter', target: innerLink, preventDefault() { prevented++; } });
  assert.equal(prevented, 2, 'Enter on inner <a> must not be hijacked');

  // Verify clicking [data-cr-open-archive] opens .cr-archive and scrolls to it:
  assert.equal(dom.archiveEl.open, false);
  dom.section.dispatch('click', { target: dom.openArchiveBtn });
  assert.equal(dom.archiveEl.open, true);
  assert.equal(dom.archiveEl.scrollCalls, 1);

  // 2. Deterministic seeded property test (seed=0x20261028) on career.render(timelineHtml, options)
  // Invariant: same input always yields identical output, never throws on hostile/inherited options, and omitSkills=true never emits .cr-skills
  let seed = 0x20261028;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed;
  };
  for (let i = 0; i < 12; i++) {
    const token = `TIMELINE_${nextRand().toString(16)}`;
    const outA = career.render(token, { omitSkills: true });
    const outB = career.render(token, { omitSkills: true });
    assert.equal(outA, outB, 'career.render must be deterministic for identical inputs');
    assert.ok(outA.includes(token), 'career.render must preserve timelineHtml slot');
    assert.ok(!outA.includes('class="cr-skills"'), 'omitSkills=true must never emit .cr-skills');
  }
  const withSkills = career.render('SLOT', { omitSkills: false });
  assert.match(withSkills, /class="cr-skills"/, 'omitSkills=false preserves .cr-skills compatibility');

  // 3. Adversarial canary & hostile input verification over HTTP
  const canary = 'CANARY-SINGLEPAGE-7c3d9a12';
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  try {
    const hostileResponses = await Promise.all([
      httpGet(port, `/career-reference.js?probe=${canary}`, 'GET', { 'X-Canary': canary }),
      httpGet(port, `/career-reference.css?probe=${canary}`, 'GET', { 'X-Canary': canary }),
      httpGet(port, `/app.js?probe=${canary}`, 'GET', { 'X-Canary': canary }),
      httpGet(port, `/..%2fknowledge%2fcareer%2fPORTFOLIO-CONTENT-REVIEW-2026-10-28.md?c=${canary}`, 'GET', { 'X-Canary': canary }),
      httpGet(port, `/career-reference.js`, 'POST', { 'X-Canary': canary }),
      httpGet(port, `/%E0%A4%A?c=${canary}`, 'GET', { 'X-Canary': canary })
    ]);
    assert.equal(hostileResponses[0].status, 200);
    assert.equal(hostileResponses[1].status, 200);
    assert.equal(hostileResponses[2].status, 200);
    assert.equal(hostileResponses[3].status, 403);
    assert.equal(hostileResponses[4].status, 405);
    assert.equal(hostileResponses[5].status, 400);

    for (const res of hostileResponses) {
      assert.doesNotMatch(res.body, new RegExp(canary), 'Canary must never leak into response body');
      assert.doesNotMatch(JSON.stringify(res.headers), new RegExp(canary), 'Canary must never leak into response headers');
    }
  } finally {
    await new Promise(r => server.close(r));
  }
});
