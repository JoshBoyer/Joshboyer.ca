'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { server } = require('../serve.cjs');

const root = path.resolve(__dirname, '..');

const EXPECTED_ASSETS = Object.freeze([
  {
    route: '/assets/personal/josh-curiosity-child-tinkering.png',
    relPath: 'dist/assets/personal/josh-curiosity-child-tinkering.png',
    contentType: 'image/png',
    format: 'png',
    width: 1024,
    height: 1024,
    byteLength: 2379331,
    sha256: '8ec7982098de6dd6e71c1e1fbf2b124739f2507430c5392ed9ed2949d3e98ea3'
  },
  {
    route: '/assets/personal/josh-curiosity-ai-orchestration.png',
    relPath: 'dist/assets/personal/josh-curiosity-ai-orchestration.png',
    contentType: 'image/png',
    format: 'png',
    width: 1024,
    height: 1024,
    byteLength: 2069405,
    sha256: 'c6b5432b21ad42d4fa915e1018db2945648b7aa8c7e7fe76533affe6e7095bdb'
  },
  {
    route: '/assets/personal/josh-portrait-vest.jpg',
    relPath: 'dist/assets/personal/josh-portrait-vest.jpg',
    contentType: 'image/jpeg',
    format: 'jpeg',
    width: 896,
    height: 1200,
    byteLength: 650554,
    sha256: '52435892bedb4df5282f620abf4152202417c86e8dd29e8e6808cf4fbfe2b725'
  }
]);

function parsePngDimensions(buf) {
  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.ok(buf.length >= 24, 'PNG buffer must contain signature and IHDR');
  assert.deepEqual(buf.subarray(0, 8), pngSig, 'Invalid PNG signature');
  assert.equal(buf.subarray(12, 16).toString('ascii'), 'IHDR', 'First PNG chunk must be IHDR');
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20)
  };
}

function parseJpegDimensions(buf) {
  assert.ok(buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8, 'Invalid JPEG SOI marker');
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = buf[offset + 1];
    if (marker === 0xff) {
      offset++;
      continue;
    }
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const len = buf.readUInt16BE(offset + 2);
    if (marker === 0xc0 || marker === 0xc2) {
      return {
        height: buf.readUInt16BE(offset + 5),
        width: buf.readUInt16BE(offset + 7),
        components: buf[offset + 9]
      };
    }
    offset += 2 + len;
  }
  throw new Error('No JPEG SOF0/SOF2 marker found');
}

function httpRequest(port, reqPath, method = 'GET', headers = {}) {
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
            body: Buffer.concat(chunks)
          })
        );
      }
    );
    req.on('error', reject);
    req.end();
  });
}

test('About Me sections wire and serve the improved childhood and adult portraits with verified binary dimensions and hashes', async () => {
  const wbText = fs.readFileSync(path.join(root, 'dist/architect-workbench.js'), 'utf8');
  const homeAboutStart = wbText.indexOf('id="home-about-section"');
  const homeAboutEnd = wbText.indexOf('</section>', homeAboutStart);
  assert.ok(homeAboutStart > 0 && homeAboutEnd > homeAboutStart, '#home-about-section block must exist');
  const homeAboutBlock = wbText.slice(homeAboutStart, homeAboutEnd);
  assert.match(homeAboutBlock, /<img\s+src="assets\/optimized\/personal\/josh-curiosity-child-tinkering-1024\.webp"/);
  assert.match(homeAboutBlock, /<img\s+src="assets\/optimized\/personal\/josh-curiosity-ai-orchestration-1024\.webp"/);

  const aboutDataStart = wbText.indexOf('const ABOUT_PAGE_DATA = Object.freeze(');
  const aboutDataEnd = wbText.indexOf('    if (aboutPageSection) {', aboutDataStart);
  assert.ok(aboutDataStart > 0 && aboutDataEnd > aboutDataStart, 'ABOUT_PAGE_DATA block must exist');
  const aboutDataBlock = wbText.slice(aboutDataStart, aboutDataEnd);
  assert.match(aboutDataBlock, /"portraitSrc":\s*"assets\/optimized-extra\/personal\/josh-portrait-vest-896\.webp"/);

  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  try {
    for (const spec of EXPECTED_ASSETS) {
      const diskBuf = fs.readFileSync(path.join(root, spec.relPath));
      const res = await httpRequest(port, spec.route, 'GET');
      assert.equal(res.status, 200, `${spec.route} HTTP status`);
      assert.equal(res.headers['content-type'], spec.contentType, `${spec.route} Content-Type`);
      assert.equal(res.headers['x-content-type-options'], 'nosniff');
      assert.equal(res.headers['referrer-policy'], 'no-referrer');
      assert.equal(res.headers['cache-control'], 'no-store');
      assert.equal(res.body.length, spec.byteLength, `${spec.route} byte length`);
      assert.deepEqual(res.body, diskBuf, `${spec.route} matches disk bytes`);

      const sha = crypto.createHash('sha256').update(res.body).digest('hex');
      assert.equal(sha, spec.sha256, `${spec.route} SHA-256 digest`);

      const dims = spec.format === 'png' ? parsePngDimensions(res.body) : parseJpegDimensions(res.body);
      assert.equal(dims.width, spec.width, `${spec.route} width`);
      assert.equal(dims.height, spec.height, `${spec.route} height`);
    }
  } finally {
    await new Promise(r => server.close(r));
  }
});

test('About Me portrait HTTP byte-range 3-point upper boundary (size-2, size-1, size) and adversarial canary containment (seed=0x20261028)', async () => {
  const canary = 'CANARY-ABOUT-PORTRAIT-4e8a2c91';
  const vestSpec = EXPECTED_ASSETS[2];
  const childSpec = EXPECTED_ASSETS[0];
  const childDisk = fs.readFileSync(path.join(root, childSpec.relPath));

  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  try {
    // 3-point upper byte-range boundary on josh-portrait-vest.jpg (last valid byte index = byteLength - 1)
    const lastIdx = vestSpec.byteLength - 1;
    const [rBefore, rExact, rAfter] = await Promise.all([
      httpRequest(port, vestSpec.route, 'GET', { Range: `bytes=0-${lastIdx - 1}` }),
      httpRequest(port, vestSpec.route, 'GET', { Range: `bytes=0-${lastIdx}` }),
      httpRequest(port, vestSpec.route, 'GET', { Range: `bytes=0-${lastIdx + 1}` })
    ]);
    assert.equal(rBefore.status, 206, 'window-1 (size-2) must return 206');
    assert.equal(rBefore.body.length, vestSpec.byteLength - 1);
    assert.equal(rExact.status, 206, 'exact window (size-1) must return 206');
    assert.equal(rExact.body.length, vestSpec.byteLength);
    assert.equal(rAfter.status, 416, 'window+1 (size) must fail closed with 416');
    assert.equal(rAfter.headers['content-range'], `bytes */${vestSpec.byteLength}`);

    // Hostile methods, path traversal, malformed encodings, and canary injection
    const hostileCases = await Promise.all([
      httpRequest(port, `${childSpec.route}?leak=${canary}`, 'POST', { 'X-Canary': canary }),
      httpRequest(port, `${childSpec.route}?leak=${canary}`, 'DELETE', { Cookie: `s=${canary}` }),
      httpRequest(port, `/assets/personal/..%2f..%2f..%2fJOSH-BOYER-PORTFOLIO-CORPUS.md?c=${canary}`, 'GET', { 'X-Canary': canary }),
      httpRequest(port, `/assets/personal/%E0%A4%A?c=${canary}`, 'GET', { 'X-Canary': canary }),
      httpRequest(port, `/assets/personal/nonexistent-${canary}.png`, 'GET', { 'X-Canary': canary }),
      httpRequest(port, vestSpec.route, 'GET', { Range: `bytes=500-100`, 'X-Canary': canary }),
      httpRequest(port, vestSpec.route, 'GET', { Range: `bytes=${canary}`, 'X-Canary': canary })
    ]);
    assert.equal(hostileCases[0].status, 405);
    assert.equal(hostileCases[1].status, 405);
    assert.equal(hostileCases[2].status, 403);
    assert.equal(hostileCases[3].status, 400);
    assert.equal(hostileCases[4].status, 404);
    assert.equal(hostileCases[5].status, 416);
    assert.equal(hostileCases[6].status, 416);

    for (const res of hostileCases) {
      assert.doesNotMatch(res.body.toString('utf8'), new RegExp(canary), 'Canary must never appear in response body');
      assert.doesNotMatch(JSON.stringify(res.headers), new RegExp(canary), 'Canary must never appear in response headers');
    }

    // Seeded property fuzz test (seed=0x20261028, 40 iterations) over valid and hostile Range headers
    let seed = 0x20261028 >>> 0;
    const nextRand = () => {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      return seed / 0x100000000;
    };

    for (let i = 0; i < 40; i++) {
      const mode = i % 2 === 0 ? 'valid' : 'invalid';
      if (mode === 'valid') {
        const start = Math.floor(nextRand() * (childSpec.byteLength - 256));
        const end = start + Math.floor(nextRand() * Math.min(512, childSpec.byteLength - 1 - start));
        const r = await httpRequest(port, childSpec.route, 'GET', {
          Range: `bytes=${start}-${end}`,
          'X-Canary': canary
        });
        assert.equal(r.status, 206, `seed=0x20261028 iter=${i} valid range ${start}-${end}`);
        assert.deepEqual(r.body, childDisk.subarray(start, end + 1));
        assert.doesNotMatch(JSON.stringify(r.headers), new RegExp(canary));
      } else {
        const start = Math.floor(nextRand() * 10000) + 500;
        const end = Math.floor(nextRand() * 400);
        const r = await httpRequest(port, childSpec.route, 'GET', {
          Range: `bytes=${start}-${end}`,
          'X-Canary': canary
        });
        assert.equal(r.status, 416, `seed=0x20261028 iter=${i} inverted range ${start}-${end}`);
        assert.equal(r.body.length, 0);
        assert.doesNotMatch(JSON.stringify(r.headers), new RegExp(canary));
      }
    }
  } finally {
    await new Promise(r => server.close(r));
  }
});

test('About Josh 3-column perspective diptych, 4-node evolution stepper, bottom story bar thumbnails, and Featured Work expanded sizing', async () => {
  const wbText = fs.readFileSync(path.join(root, 'dist/architect-workbench.js'), 'utf8');
  const wbCss = fs.readFileSync(path.join(root, 'dist/architect-workbench.css'), 'utf8');

  const homeAboutStart = wbText.indexOf('id="home-about-section"');
  const homeAboutEnd = wbText.indexOf('</section>', homeAboutStart);
  assert.ok(homeAboutStart > 0 && homeAboutEnd > homeAboutStart, '#home-about-section must exist');
  const homeAboutBlock = wbText.slice(homeAboutStart, homeAboutEnd);

  // Left column: eyebrow rule, two-tone title, handwritten callout + yellow underline
  assert.match(homeAboutBlock, /class="about-eyebrow-rule"/);
  assert.match(homeAboutBlock, /<span class="about-title-dark">Curiosity<\/span><br>\s*<span class="about-title-accent">built this\.<\/span>/);
  assert.match(homeAboutBlock, /class="about-handwritten-callout"/);
  assert.match(homeAboutBlock, /Same curiosity\.<br><strong>Bigger possibilities\.<\/strong>/);
  assert.match(homeAboutBlock, /class="about-handwritten-underline"/);

  // Center stage: THEN & NOW sticky notes, single bottom curved arrow per note (R32: extra side arrows removed), bridge script (R33: strange gears/wrench icon removed), and tilted photos
  assert.match(homeAboutBlock, /<strong class="about-sticky-title">THEN<\/strong>\s*<span class="about-sticky-text">Take things<br>apart\.<\/span>/);
  assert.match(homeAboutBlock, /<strong class="about-sticky-title">NOW<\/strong>\s*<span class="about-sticky-text">Build<br>what's next\.<\/span>/);
  assert.match(homeAboutBlock, /class="about-sticky-arrow is-then-bottom"/);
  assert.match(homeAboutBlock, /class="about-sticky-arrow is-now-bottom"/);
  assert.doesNotMatch(homeAboutBlock, /is-then-right|is-now-left/);
  assert.match(homeAboutBlock, /class="about-prog-bridge about-prog-item-text"/);
  assert.match(homeAboutBlock, /<span>SAME<\/span>\s*<span>CURIOSITY<\/span>\s*<span>DIFFERENT<\/span>\s*<span>SCALE\.<\/span>/);
  assert.doesNotMatch(homeAboutBlock, /class="about-bridge-gears-svg"/);
  assert.match(homeAboutBlock, /class="about-prog-photo is-tilted-left"/);
  assert.match(homeAboutBlock, /class="about-prog-photo is-tilted-right"/);

  // Right column: 3 pillar badges with titles & descriptions
  assert.match(homeAboutBlock, /<strong class="about-pillar-title">Take things apart<\/strong>\s*<p class="about-pillar-desc">Understand how systems work at the smallest level\.<\/p>/);
  assert.match(homeAboutBlock, /<strong class="about-pillar-title">Solve real problems<\/strong>\s*<p class="about-pillar-desc">Apply hands-on thinking to business, infrastructure and integrations\.<\/p>/);
  assert.match(homeAboutBlock, /<strong class="about-pillar-title">Build what's next<\/strong>\s*<p class="about-pillar-desc">Turn experience into AI-powered solutions and orchestration\.<\/p>/);

  // R34: Bottom 4-node evolution rail is static, has no connecting track lines, uses SVG icons for each point, and has all 4 nodes activated
  assert.doesNotMatch(homeAboutBlock, /about-stepper-track|data-about-step-fill/);
  assert.doesNotMatch(homeAboutBlock, /<button[^>]*class="about-step-node/);
  assert.doesNotMatch(wbText, /target\.closest\("\[data-about-step\]"\)/);
  for (const [idx, title] of [[0, 'Curiosity'], [1, 'Problem-solving'], [2, 'Systems thinking'], [3, "Building what's next"]]) {
    assert.match(homeAboutBlock, new RegExp(`<div class="about-step-node is-active"[^>]*data-about-step="${idx}"[^>]*>\\s*<span class="about-step-icon[^"]*"[^>]*>\\s*<svg[\\s\\S]*?<\\/svg>\\s*<\\/span>\\s*<strong class="about-step-title">${title}<\\/strong>`));
  }

  // R27: Bottom "More About My Story" bar (.about-bottom-story-bar) and "About Me" (.about-hero / #home-about-drawer) sections are removed
  assert.doesNotMatch(homeAboutBlock, /class="about-bottom-story-bar"|More About My Story|Watch the story|Explore the full story/);
  assert.doesNotMatch(homeAboutBlock, /id="home-about-drawer"|data-home-about-drawer|is-about-drawer-wrap|data-home-about-body/);
  assert.doesNotMatch(wbText, /<span class="about-hl-white">Curious by nature\.<\/span>/);
  assert.doesNotMatch(wbText, /<span class="about-hl-cyan">Builder at heart\.<\/span>/);

  // CSS rules for About perspective diptych and Featured Work & Explore All Builds mockup alignment
  assert.match(wbCss, /#home-about-section\s+\.about-prog-photo\.is-tilted-left\s*\{[^}]*perspective\(660px\)\s+rotateY\(14\.5deg\)/);
  assert.match(wbCss, /#home-about-section\s+\.about-prog-photo\.is-tilted-right\s*\{[^}]*perspective\(660px\)\s+rotateY\(-14\.5deg\)/);
  assert.match(wbCss, /#home-featured-projects\s+\.home-featured-work-grid\s*\{[^}]*max-width:\s*1680px\s*!important;\s*width:\s*min\(94vw,\s*1680px\)\s*!important/);
  assert.match(wbCss, /#home-featured-projects\s+\.home-fw-primary-card\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1\.15fr\)\s+minmax\(0,\s*1fr\)\s*!important/);
  assert.match(wbCss, /#home-featured-projects\s+\.fw-primary-media\s*\{[^}]*min-height:\s*228px\s*!important/);
  assert.match(wbCss, /#home-featured-projects\s+\.fw-secondary-media\s*\{[^}]*position:\s*absolute\s*!important;[^}]*height:\s*100%\s*!important/);
  assert.match(wbCss, /#home-featured-projects\s+\.home-explore-builds-card\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.97\)\s*!important/);

  // Section 02 (Featured Work & Explore All Builds) markup & master-detail workbench verification (R17–R19)
  assert.match(wbText, /<p class="home-sum-eyebrow is-cyan">FEATURED BUILDS<\/p>/);
  assert.match(wbText, /<p class="home-fw-lead">A selection of projects showing end-to-end delivery &mdash; from business requirements to working systems\.<\/p>/);
  assert.match(wbText, /<span>View all \$\{PROJECTS_CATALOG\.length\} builds<\/span>/);
  assert.match(wbText, /<span class="fw-card-top-pill">Insurance Automation<\/span>/);
  assert.match(wbText, /<span class="fw-card-top-pill">AI Orchestration<\/span>/);
  assert.match(wbText, /<span class="fw-card-top-pill">System Integration<\/span>/);
  assert.match(wbText, /class="fw-eligible-checklist-card"/);
  assert.match(wbText, /<strong>Eligible<\/strong>/);
  assert.match(wbText, /src="assets\/builds\/fw-nexus-bg\.png"/);
  assert.match(wbText, /src="assets\/builds\/fw-broker-bg\.png"/);
  assert.match(wbText, /class="home-explore-builds-card"\s+id="home-builds-drawer"\s+data-home-builds-drawer/);
  assert.match(wbText, /<h3 class="eb-title">Explore all builds<\/h3>/);
  assert.match(wbText, /projects and case studies<\/span><span class="eb-subtitle-hint" hidden> &middot; Select a project to see the details<\/span>/);
  assert.match(wbText, /data-eb-filter="all"[^>]*>All \(\$\{PROJECTS_CATALOG\.length\}\)</);
  assert.match(wbText, /data-eb-filter="professional"[^>]*>Professional \(\$\{countByCat\("professional"\)\}\)</);
  assert.match(wbText, /data-eb-filter="independent"[^>]*>Independent \(\$\{countByCat\("independent"\)\}\)</);
  assert.match(wbText, /data-eb-filter="insurance"[^>]*>Insurance \(\$\{countByCat\("insurance"\)\}\)</);
  assert.match(wbText, /data-eb-filter="data"[^>]*>Integration &amp; Data \(\$\{countByCat\("data"\)\}\)</);
  assert.match(wbText, /data-eb-filter="infra"[^>]*>Infrastructure \(\$\{countByCat\("infra"\)\}\)</);
  assert.match(wbText, /data-eb-filter="web"[^>]*>Web &amp; Tools \(\$\{countByCat\("web"\)\}\)</);
  assert.match(wbText, /Commercial Quoting & Broker Integration/);
  assert.match(wbText, /Authenticated Document Upload Portal/);
  assert.match(wbText, /Policy-Change Comparison & Validation/);
  assert.match(wbText, /Pilot \(discontinued\)/);
  assert.match(wbText, /Broker Policy Inquiry & Document Access/);
  assert.match(wbText, /Modern Dev Environment/);
  assert.match(wbText, /Rating Data Pipeline & Reporting/);
  assert.match(wbText, /title:\s*"Connected broker inputs",\s*desc:\s*"CSIO\/XML payloads to rating and underwriting rules\."/);
  assert.match(wbText, /title:\s*"Implemented rules",\s*desc:\s*"Commercial rating\/underwriting with consistent validation\."/);
  assert.match(wbText, /title:\s*"Two-way integration",\s*desc:\s*"Mapped fields across vendors using CSIO\/ACORD\."/);
  assert.match(wbText, /title:\s*"Improved data accuracy",\s*desc:\s*"Reduced manual validation and faster turnaround\."/);
  assert.match(wbText, /id:\s*"overview",\s*label:\s*"Overview"/);
  assert.match(wbText, /id:\s*"problem",\s*label:\s*"Problem"/);
  assert.match(wbText, /id:\s*"contribution",\s*label:\s*"My contribution"/);
  assert.match(wbText, /id:\s*"solution",\s*label:\s*"Solution"/);
  assert.match(wbText, /id:\s*"outcome",\s*label:\s*"Outcome"/);
  assert.match(wbText, /id:\s*"tech",\s*label:\s*"Tech & tools"/);
  assert.match(wbText, /<h5 class="eb-details-heading">Key details<\/h5>/);
  assert.doesNotMatch(wbText, /<span>View full case study<\/span>\s*<span aria-hidden="true">&rarr;<\/span>/);
  assert.match(wbText, /<strong>View code \/ artefacts<\/strong>/);
  assert.match(wbCss, /#home-featured-projects\s+\.eb-preview-panel\s*\{[^}]*grid-template-columns:\s*292px\s+minmax\(0,\s*1fr\)\s*!important/);
  assert.match(wbCss, /#home-featured-projects\s+\.eb-preview-quad-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)\s*!important/);

  // R41–R46: Section 04 (Skills & Capabilities) V4 Interactive Knowledge Graph, Capability Inspector Panel, 6-Column Capability Strip, and 2-Row Tools & Platforms Bar over Server Room Still
  assert.match(wbText, /SKILLS &amp; CAPABILITIES/);
  assert.match(wbText, /<span class="sk-v3-title-top">20 years of experience\.<\/span>/);
  assert.match(wbText, /<span class="sk-v3-title-gradient">Connected\.\s*Amplified\.\s*Expanding\.<\/span>/);
  assert.match(wbText, /My experience provides the judgment\. AI expands what I can execute\. Together, they let me work across more technologies, solve complex problems faster, and turn ideas into real-world solutions\./);
  assert.match(wbText, /Years of experience/);
  assert.match(wbText, /Business, systems and infrastructure/);
  assert.match(wbText, /Capability multiplier/);
  assert.match(wbText, /Faster learning and implementation/);
  assert.match(wbText, /Expanding toolkit/);
  assert.match(wbText, /Continuously growing across technologies and domains/);
  assert.match(wbText, /The tools change\./);
  assert.match(wbText, /The ability to <strong>solve<br>problems carries forward\.<\/strong>/);

  // R42: Interactive Knowledge Graph panel, filter tabs, search input, legend, central Systems Thinking hub + 6 capability hubs + leaf pills
  assert.match(wbText, /Interactive Knowledge Graph/);
  assert.match(wbText, /Explore how my skills, experience and technologies connect\./);
  for (const f of ["all", "capabilities", "technologies", "domains", "projects"]) {
    assert.match(wbText, new RegExp(`data-sk-graph-filter="${f}"`), `Graph filter ${f} must exist`);
  }
  assert.match(wbText, /placeholder="Search skills, tools or domains\.\.\."/);
  assert.match(wbText, /Core Skills/);
  assert.match(wbText, /\(Systems Thinking\)/);
  assert.match(wbText, /Business Domain/);
  assert.match(wbText, /Process \/ Method/);
  assert.match(wbText, /AI Capability/);
  assert.match(wbText, /Tool \/ Platform/);
  assert.match(wbText, /Primary connection/);
  assert.match(wbText, /Related connection/);
  assert.match(wbText, /data-sk-hub="core"/);
  assert.match(wbText, /data-sk-hub="\$\{hub\.id\}"/);
  for (const hub of ["core", "insurance", "integration", "infrastructure", "solution", "ai", "development"]) {
    assert.match(wbText, new RegExp(`\\{\\s*id:\\s*"${hub}",\\s*label:`), `Knowledge graph hub ${hub} must exist in HOME_SKILLS_V4_GRAPH_HUBS`);
  }

  // R43: Right-hand Capability Inspector panel (Overview / Skills / Tools / Projects tabs, Key Skills, Related Capabilities, Representative Work)
  assert.match(wbText, /data-sk-inspector-panel/);
  assert.match(wbText, /Key Skills/);
  assert.match(wbText, /Related Capabilities/);
  assert.match(wbText, /Representative Work/);
  assert.match(wbText, /Nexus — AI Workforce OS/);
  assert.match(wbText, /Multi-agent orchestration with JEV decision runtime/);
  assert.match(wbText, /Context Engine &amp; Skills|Context Engine & Skills/);
  assert.match(wbText, /Agentic Browser Extension/);

  // R44: 6-Column Capability Cards Row (with skill/tool/project counts and 4 tech icon badges per card)
  assert.match(wbText, /title:\s*"AI & Automation"[\s\S]*?desc:\s*"Designing and building practical AI solutions with real-world context, tools and governance\."/);
  assert.match(wbText, /title:\s*"Systems Integration"[\s\S]*?desc:\s*"Connecting applications and data across diverse systems and business environments\."/);
  assert.match(wbText, /title:\s*"Insurance & Business"[\s\S]*?desc:\s*"Deep domain knowledge of P&C insurance systems, processes and real-world requirements\."/);
  assert.match(wbText, /cardTitle:\s*"Infrastructure & Ops"[\s\S]*?desc:\s*"Hands-on experience with infrastructure, networking and operational environments\."/);
  assert.match(wbText, /title:\s*"Solution Design & Delivery"[\s\S]*?desc:\s*"Turning complex requirements into practical, scalable solutions\."/);
  assert.match(wbText, /title:\s*"Development & Tooling"[\s\S]*?desc:\s*"Building, automating and supporting software solutions and tools\."/);
  assert.match(wbCss, /#home-skills-section\s+\.sk-v3-cards-grid\s*\{[^}]*grid-template-columns:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\)\s*!important/);

  // R45: Tools & Platforms 2-row bar (19 brands across 2 rows)
  assert.match(wbText, /<strong class="sk-v3-platforms-title">Tools &amp; Platforms<\/strong>/);
  assert.match(wbText, /Key technologies I work with across projects and builds\./);
  for (const brand of ["Microsoft", "Google Cloud", "Cloudflare", "GitHub", "Docker", "Docker Hub", "Render", "Depot", "OVH", "Anthropic", "OpenAI", "Gemini", "OpenRouter", "Postman", "Kafka", "RabbitMQ", "Prometheus", "Grafana", "OpenTelemetry"]) {
    assert.match(wbText, new RegExp(`<span>${brand}<\\/span>`), `Tools & Platforms bar must include ${brand}`);
  }

  // R38–R46: Single continuous basement-level server room still (assets/home-level-metal.jpg) as the background for Section 04 (Skills & Capabilities)
  const skillsSectionBlock = wbText.slice(
    wbText.indexOf('id="home-skills-section"'),
    wbText.indexOf('<!-- SECTION 05 / ABOUT -->')
  );
  assert.match(
    skillsSectionBlock,
    /<div class="home-skills-level-backdrop" aria-hidden="true">\s*<img src="assets\/optimized-extra\/home-level-metal-1600\.webp" alt="" loading="lazy" decoding="async">\s*<div class="home-skills-level-scrim"><\/div>\s*<\/div>/,
    '#home-skills-section must render .home-skills-level-backdrop with assets/home-level-metal.jpg'
  );
  assert.match(
    wbCss,
    /#home-skills-section\s+\.home-skills-level-backdrop\s*\{[^}]*position:\s*absolute\s*!important;[^}]*inset:\s*0\s*!important/,
    '#home-skills-section .home-skills-level-backdrop must cover the full skills section'
  );

  // R14 & R27: "More About My Story" bar, "About Me" hero ("Curious by nature. Builder at heart."), "My story" card & 4 accordion bars are removed
  assert.doesNotMatch(wbText, /<header class="about-hero">/);
  assert.doesNotMatch(wbText, /<section class="about-my-story-card"/);
  assert.doesNotMatch(wbText, /<h2 id="about-story-heading" class="about-story-main-title">My story<\/h2>/);
  assert.doesNotMatch(wbText, /<div class="about-details-accordion-list"/);
  assert.doesNotMatch(wbText, /<strong class="about-acc-title">(Current focus|What I'm looking for|How I work|Outside of work)<\/strong>/);
  assert.match(wbCss, /#home-about-section\s+\.about-bottom-story-bar,\s*#home-about-section\s+#home-about-drawer\s*\{[^}]*display:\s*none\s*!important/);

  // Verify the 4 story thumbnail PNGs and the Builds & Skills section PNG assets are served over HTTP with 200 OK and valid PNG headers
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  try {
    for (let i = 1; i <= 4; i++) {
      const route = `/assets/personal/about-story-thumb${i}.png`;
      const res = await httpRequest(port, route, 'GET');
      assert.equal(res.status, 200, `${route} status`);
      assert.equal(res.headers['content-type'], 'image/png');
      const dims = parsePngDimensions(res.body);
      assert.ok(dims.width >= 80 && dims.height >= 50, `${route} dimensions ${dims.width}x${dims.height}`);
    }
    const buildRoutes = [
      ['/assets/builds/fw-nexus-bg.png', 200, 150],
      ['/assets/builds/fw-broker-bg.png', 200, 150],
      ['/assets/builds/card-thumb-1-quoting.png', 120, 50],
      ['/assets/builds/card-thumb-2-upload.png', 120, 50],
      ['/assets/builds/card-thumb-3-changes.png', 120, 50],
      ['/assets/builds/card-thumb-4-inquiry.png', 120, 50],
      ['/assets/builds/card-thumb-5-devenv.png', 120, 50],
      ['/assets/builds/card-thumb-6-pipeline.png', 120, 50],
      ['/assets/builds/preview-main-quoting.png', 200, 100],
      ['/assets/builds/preview-gal-1.png', 40, 30],
      ['/assets/builds/preview-gal-2.png', 40, 30],
      ['/assets/builds/preview-gal-3.png', 40, 30],
      ['/assets/builds/preview-gal-4.png', 40, 30],
      ['/assets/builds/skills-3d-stack.png', 300, 500],
      ['/assets/builds/skills-3d-stack-v2.png', 500, 650],
      ['/assets/builds/skills-hero-art-light.png', 500, 200],
      ['/assets/builds/skills-hero-art-dark.png', 500, 200],
      ['/assets/builds/skills-practice-renewals.png', 180, 60],
      ['/assets/builds/skill-featured-nexus.png', 200, 100],
      ['/assets/builds/card-thumb-nexus.png', 200, 80],
      ['/assets/builds/card-thumb-sk-upload.png', 200, 80],
      ['/assets/builds/card-thumb-sk-changes.png', 200, 80],
      ['/assets/builds/cr-card-1-hardware.png', 120, 180],
      ['/assets/builds/cr-card-2-insurance.png', 120, 180],
      ['/assets/builds/cr-card-3-ai.png', 120, 180],
      ['/assets/builds/cr-card-4-learning.png', 120, 180],
      ['/assets/builds/cr-detail-1-dell.png', 500, 400],
      ['/assets/builds/cr-proj-1-dell.png', 100, 70],
      ['/assets/builds/cr-proj-2-harris.png', 100, 70],
      ['/assets/personal/about-details-hero-bg.png', 1000, 240],
      ['/assets/personal/about-hobby-1-woodworking.png', 200, 80],
      ['/assets/personal/about-hobby-2-canoe.png', 200, 80],
      ['/assets/personal/about-hobby-3-lake.png', 200, 80],
      ['/assets/personal/about-work-thumb-nexus.png', 120, 80],
      ['/assets/personal/about-work-thumb-quoting.png', 120, 80],
      ['/assets/personal/about-work-thumb-upload.png', 120, 80]
    ];
    for (const [route, minW, minH] of buildRoutes) {
      const res = await httpRequest(port, route, 'GET');
      assert.equal(res.status, 200, `${route} status`);
      assert.equal(res.headers['content-type'], 'image/png');
      const dims = parsePngDimensions(res.body);
      assert.ok(dims.width >= minW && dims.height >= minH, `${route} dimensions ${dims.width}x${dims.height}`);
    }
    // 3-point byte-range boundary (size-2, size-1, size) and hostile canary check on /assets/builds/fw-nexus-bg.png
    const nexusDisk = fs.readFileSync(path.join(root, 'dist/assets/builds/fw-nexus-bg.png'));
    const nLen = nexusDisk.length;
    const buildsCanary = 'CANARY-BUILDS-20261028';
    const [bBefore, bExact, bAfter, bHostile] = await Promise.all([
      httpRequest(port, '/assets/builds/fw-nexus-bg.png', 'GET', { Range: `bytes=0-${nLen - 2}` }),
      httpRequest(port, '/assets/builds/fw-nexus-bg.png', 'GET', { Range: `bytes=0-${nLen - 1}` }),
      httpRequest(port, '/assets/builds/fw-nexus-bg.png', 'GET', { Range: `bytes=0-${nLen}` }),
      httpRequest(port, `/assets/builds/..%2f..%2f..%2fAGENTS.md?c=${buildsCanary}`, 'GET', { 'X-Canary': buildsCanary })
    ]);
    assert.equal(bBefore.status, 206);
    assert.equal(bBefore.body.length, nLen - 1);
    assert.equal(bExact.status, 206);
    assert.equal(bExact.body.length, nLen);
    assert.equal(bAfter.status, 416);
    assert.equal(bHostile.status, 403);
    assert.doesNotMatch(bHostile.body.toString('utf8'), new RegExp(buildsCanary));
    assert.doesNotMatch(JSON.stringify(bHostile.headers), new RegExp(buildsCanary));

    // 3-point byte-range boundary (size-2, size-1, size) and hostile canary check on /assets/personal/about-details-hero-bg.png
    const aboutBgDisk = fs.readFileSync(path.join(root, 'dist/assets/personal/about-details-hero-bg.png'));
    const aLen = aboutBgDisk.length;
    const aboutDetailsCanary = 'CANARY-ABOUT-DETAILS-20261028';
    const [aBefore, aExact, aAfter, aHostile] = await Promise.all([
      httpRequest(port, '/assets/personal/about-details-hero-bg.png', 'GET', { Range: `bytes=0-${aLen - 2}` }),
      httpRequest(port, '/assets/personal/about-details-hero-bg.png', 'GET', { Range: `bytes=0-${aLen - 1}` }),
      httpRequest(port, '/assets/personal/about-details-hero-bg.png', 'GET', { Range: `bytes=0-${aLen}` }),
      httpRequest(port, `/assets/personal/..%2f..%2f..%2fJOSH-BOYER-PORTFOLIO-CORPUS.md?c=${aboutDetailsCanary}`, 'GET', { 'X-Canary': aboutDetailsCanary })
    ]);
    assert.equal(aBefore.status, 206);
    assert.equal(aBefore.body.length, aLen - 1);
    assert.equal(aExact.status, 206);
    assert.equal(aExact.body.length, aLen);
    assert.equal(aAfter.status, 416);
    assert.equal(aHostile.status, 403);
    assert.doesNotMatch(aHostile.body.toString('utf8'), new RegExp(aboutDetailsCanary));
    assert.doesNotMatch(JSON.stringify(aHostile.headers), new RegExp(aboutDetailsCanary));

    // 3-point byte-range boundary (size-2, size-1, size) and hostile canary check on /assets/builds/skills-3d-stack-v2.png
    const skV2Disk = fs.readFileSync(path.join(root, 'dist/assets/builds/skills-3d-stack-v2.png'));
    const skV2Len = skV2Disk.length;
    const skV2Canary = 'CANARY-SKILLS-V2-20261028';
    const [sBefore, sExact, sAfter, sHostile] = await Promise.all([
      httpRequest(port, '/assets/builds/skills-3d-stack-v2.png', 'GET', { Range: `bytes=0-${skV2Len - 2}` }),
      httpRequest(port, '/assets/builds/skills-3d-stack-v2.png', 'GET', { Range: `bytes=0-${skV2Len - 1}` }),
      httpRequest(port, '/assets/builds/skills-3d-stack-v2.png', 'GET', { Range: `bytes=0-${skV2Len}` }),
      httpRequest(port, `/assets/builds/..%2f..%2f..%2fAGENTS.md?c=${skV2Canary}`, 'GET', { 'X-Canary': skV2Canary })
    ]);
    assert.equal(sBefore.status, 206);
    assert.equal(sBefore.body.length, skV2Len - 1);
    assert.equal(sExact.status, 206);
    assert.equal(sExact.body.length, skV2Len);
    assert.equal(sAfter.status, 416);
    assert.equal(sHostile.status, 403);
    assert.doesNotMatch(sHostile.body.toString('utf8'), new RegExp(skV2Canary));
    assert.doesNotMatch(JSON.stringify(sHostile.headers), new RegExp(skV2Canary));

    // 3-point byte-range boundary (size-2, size-1, size) and hostile canary check on /assets/builds/cr-detail-1-dell.png
    const crDellDisk = fs.readFileSync(path.join(root, 'dist/assets/builds/cr-detail-1-dell.png'));
    const crDellLen = crDellDisk.length;
    const crV2Canary = 'CANARY-CAREER-V2-20261028';
    const [cBefore, cExact, cAfter, cHostile] = await Promise.all([
      httpRequest(port, '/assets/builds/cr-detail-1-dell.png', 'GET', { Range: `bytes=0-${crDellLen - 2}` }),
      httpRequest(port, '/assets/builds/cr-detail-1-dell.png', 'GET', { Range: `bytes=0-${crDellLen - 1}` }),
      httpRequest(port, '/assets/builds/cr-detail-1-dell.png', 'GET', { Range: `bytes=0-${crDellLen}` }),
      httpRequest(port, `/assets/builds/..%2f..%2f..%2fAGENTS.md?c=${crV2Canary}`, 'GET', { 'X-Canary': crV2Canary })
    ]);
    assert.equal(cBefore.status, 206);
    assert.equal(cBefore.body.length, crDellLen - 1);
    assert.equal(cExact.status, 206);
    assert.equal(cExact.body.length, crDellLen);
    assert.equal(cAfter.status, 416);
    assert.equal(cHostile.status, 403);
    assert.doesNotMatch(cHostile.body.toString('utf8'), new RegExp(crV2Canary));
    assert.doesNotMatch(JSON.stringify(cHostile.headers), new RegExp(crV2Canary));

    // R38: 3-point byte-range boundary (size-2, size-1, size) and hostile canary check on /assets/home-level-metal.jpg
    const metalDisk = fs.readFileSync(path.join(root, 'dist/assets/home-level-metal.jpg'));
    const mLen = metalDisk.length;
    const metalCanary = 'CANARY-SKILLS-METAL-20261028';
    const [mFull, mBefore, mExact, mAfter, mHostile] = await Promise.all([
      httpRequest(port, '/assets/home-level-metal.jpg', 'GET'),
      httpRequest(port, '/assets/home-level-metal.jpg', 'GET', { Range: `bytes=0-${mLen - 2}` }),
      httpRequest(port, '/assets/home-level-metal.jpg', 'GET', { Range: `bytes=0-${mLen - 1}` }),
      httpRequest(port, '/assets/home-level-metal.jpg', 'GET', { Range: `bytes=0-${mLen}` }),
      httpRequest(port, `/assets/..%2f..%2fAGENTS.md?c=${metalCanary}`, 'GET', { 'X-Canary': metalCanary })
    ]);
    assert.equal(mFull.status, 200);
    assert.equal(mFull.headers['content-type'], 'image/jpeg');
    assert.equal(mFull.body[0], 0xff);
    assert.equal(mFull.body[1], 0xd8);
    assert.equal(mBefore.status, 206);
    assert.equal(mBefore.body.length, mLen - 1);
    assert.equal(mExact.status, 206);
    assert.equal(mExact.body.length, mLen);
    assert.equal(mAfter.status, 416);
    assert.equal(mHostile.status, 403);
    assert.doesNotMatch(mHostile.body.toString('utf8'), new RegExp(metalCanary));
    assert.doesNotMatch(JSON.stringify(mHostile.headers), new RegExp(metalCanary));

    // R47–R50: Multi-resolution & vector JB Brand Mark assets, lightweight browser tab icons, header wordmark-logo, and Mega Footer monogram
    const readPngDims = (relPath) => {
      const buf = fs.readFileSync(path.join(root, relPath));
      assert.equal(buf[0], 0x89, `${relPath} must have PNG header`);
      assert.equal(buf[1], 0x50);
      assert.equal(buf[2], 0x4e);
      assert.equal(buf[3], 0x47);
      assert.equal(buf[25], 6, `${relPath} must be RGBA colorType=6 with alpha transparency`);
      return {
        size: buf.length,
        width: buf.readUInt32BE(16),
        height: buf.readUInt32BE(20)
      };
    };

    const fav16 = readPngDims('dist/assets/favicon-16.png');
    assert.equal(fav16.width, 16);
    assert.equal(fav16.height, 16);
    assert.ok(fav16.size > 200 && fav16.size < 4096, `favicon-16.png must be compact (<4KB), got ${fav16.size}`);

    const fav32 = readPngDims('dist/assets/favicon-32.png');
    assert.equal(fav32.width, 32);
    assert.equal(fav32.height, 32);
    assert.ok(fav32.size > 400 && fav32.size < 6144, `favicon-32.png must be compact (<6KB), got ${fav32.size}`);

    const appleTouch = readPngDims('dist/assets/apple-touch-icon.png');
    assert.equal(appleTouch.width, 180);
    assert.equal(appleTouch.height, 180);
    assert.ok(appleTouch.size > 5000 && appleTouch.size < 65536, `apple-touch-icon.png size out of range: ${appleTouch.size}`);

    const headerMark = readPngDims('dist/assets/jb-mark-header.png');
    assert.equal(headerMark.width, 96);
    assert.equal(headerMark.height, 80);
    assert.ok(headerMark.size > 2000 && headerMark.size < 32768, `jb-mark-header.png must be compact (<32KB), got ${headerMark.size}`);

    const footerMark = readPngDims('dist/assets/jb-mark.png');
    assert.equal(footerMark.width, 220);
    assert.equal(footerMark.height, 184);
    assert.ok(footerMark.size > 8000 && footerMark.size < 98304, `jb-mark.png must be <96KB, got ${footerMark.size}`);

    for (const svgRel of ['dist/assets/favicon.svg', 'dist/assets/jb-mark.svg']) {
      const svgText = fs.readFileSync(path.join(root, svgRel), 'utf8');
      assert.ok(svgText.length > 500 && svgText.length < 10240, `${svgRel} must be a compact vector SVG (<10KB), got ${svgText.length}`);
      assert.match(svgText, /id="jbSilver"/);
      assert.match(svgText, /id="jbArc"/);
      assert.doesNotMatch(svgText, /data:image\//, `${svgRel} must be pure vector without embedded raster data URLs`);
    }

    // R48 & R49: Verify index.html, resume.html, and career-guide.html wire size-specific tab icons and header .wordmark-logo
    // The retired career-guide page intentionally has no interactive header or preloads.
    for (const htmlRel of ['dist/index.html', 'dist/resume.html']) {
      const htmlText = fs.readFileSync(path.join(root, htmlRel), 'utf8');
      assert.match(htmlText, /<link rel="icon" type="image\/png" sizes="32x32" href="assets\/favicon-32\.png">/);
      assert.match(htmlText, /<link rel="icon" type="image\/png" sizes="16x16" href="assets\/favicon-16\.png">/);
      assert.match(htmlText, /<link rel="icon" href="assets\/favicon\.svg" type="image\/svg\+xml">/);
      assert.match(htmlText, /<link rel="apple-touch-icon" sizes="180x180" href="assets\/apple-touch-icon\.png">/);
      assert.match(htmlText, /<a class="wordmark"[^>]*><img class="wordmark-logo" src="assets\/jb-mark-header\.png" width="38" height="32" alt="" aria-hidden="true" decoding="async">Josh Boyer<span>\.<\/span><\/a>/);
    }

    // R50: Verify Mega Footer uses assets/jb-mark.png instead of old blocky placeholder SVG
    assert.match(wbText, /<img class="jb-footer-monogram" src="assets\/jb-mark\.png" width="78" height="65" alt="JB brand mark" loading="lazy" decoding="async">/);
    assert.doesNotMatch(wbText, /id="jbMonoBlueGrad"/);
    assert.match(wbCss, /\.site-header \.wordmark \.wordmark-logo\s*\{[\s\S]*?width:\s*36px !important;[\s\S]*?height:\s*30px !important;/);
    assert.match(wbCss, /#home-connect\.jb-mega-footer \.jb-footer-monogram\s*\{[\s\S]*?width:\s*78px !important;[\s\S]*?height:\s*65px !important;/);

    // 3-point HTTP Range boundary (size-2, size-1, size) and hostile canary check on /assets/favicon-32.png and /assets/jb-mark.png
    const fav32Disk = fs.readFileSync(path.join(root, 'dist/assets/favicon-32.png'));
    const f32Len = fav32Disk.length;
    const jbCanary = 'CANARY-JB-MARK-20261029';
    const [fFull, fBefore, fExact, fAfter, fHostile] = await Promise.all([
      httpRequest(port, '/assets/favicon-32.png', 'GET'),
      httpRequest(port, '/assets/favicon-32.png', 'GET', { Range: `bytes=0-${f32Len - 2}` }),
      httpRequest(port, '/assets/favicon-32.png', 'GET', { Range: `bytes=0-${f32Len - 1}` }),
      httpRequest(port, '/assets/favicon-32.png', 'GET', { Range: `bytes=0-${f32Len}` }),
      httpRequest(port, `/assets/..%2f..%2fAGENTS.md?c=${jbCanary}`, 'GET', { 'X-Canary': jbCanary })
    ]);
    assert.equal(fFull.status, 200);
    assert.equal(fFull.headers['content-type'], 'image/png');
    assert.equal(fBefore.status, 206);
    assert.equal(fBefore.body.length, f32Len - 1);
    assert.equal(fExact.status, 206);
    assert.equal(fExact.body.length, f32Len);
    assert.equal(fAfter.status, 416);
    assert.equal(fHostile.status, 403);
    assert.doesNotMatch(fHostile.body.toString('utf8'), new RegExp(jbCanary));
    assert.doesNotMatch(JSON.stringify(fHostile.headers), new RegExp(jbCanary));
  } finally {
    await new Promise(r => server.close(r));
  }
});
