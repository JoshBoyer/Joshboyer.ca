'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('R58-R64: Portfolio Typography Refresh — Plus Jakarta Sans, Manrope, IBM Plex Mono, Global Tokens, Rhythm & WOFF2 Delivery', async (t) => {
  const stylesCss = fs.readFileSync(path.join(root, 'dist/styles.css'), 'utf8');
  const wbCss = fs.readFileSync(path.join(root, 'dist/architect-workbench.css'), 'utf8');
  const crCss = fs.readFileSync(path.join(root, 'dist/career-reference.css'), 'utf8');
  const resumeCss = fs.readFileSync(path.join(root, 'dist/resume.css'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
  const resumeHtml = fs.readFileSync(path.join(root, 'dist/resume.html'), 'utf8');

  const expectedFonts = [
    'plus-jakarta-sans-latin.woff2',
    'manrope-latin.woff2',
    'ibm-plex-mono-400-latin.woff2',
    'ibm-plex-mono-500-latin.woff2',
    'ibm-plex-mono-600-latin.woff2'
  ];

  await t.test('1. Self-hosted WOFF2 font files exist with valid wOF2 headers and @font-face swap declarations', () => {
    for (const file of expectedFonts) {
      const fullPath = path.join(root, 'dist/assets/fonts', file);
      assert.ok(fs.existsSync(fullPath), `Font file dist/assets/fonts/${file} must exist`);
      const buf = fs.readFileSync(fullPath);
      assert.ok(buf.length > 10000, `Font file ${file} must be non-empty (>10 KB)`);
      assert.equal(buf.subarray(0, 4).toString('ascii'), 'wOF2', `Font file ${file} must have wOF2 magic header`);
    }

    // @font-face declarations in dist/styles.css with font-display: swap
    assert.match(stylesCss, /@font-face\s*\{[^}]*font-family:\s*"Plus Jakarta Sans"[^}]*plus-jakarta-sans-latin\.woff2[^}]*font-display:\s*swap/);
    assert.match(stylesCss, /@font-face\s*\{[^}]*font-family:\s*"Manrope"[^}]*manrope-latin\.woff2[^}]*font-display:\s*swap/);
    assert.match(stylesCss, /@font-face\s*\{[^}]*font-family:\s*"IBM Plex Mono"[^}]*ibm-plex-mono-400-latin\.woff2[^}]*font-display:\s*swap/);
    assert.match(stylesCss, /@font-face\s*\{[^}]*font-family:\s*"IBM Plex Mono"[^}]*ibm-plex-mono-500-latin\.woff2[^}]*font-display:\s*swap/);
    assert.match(stylesCss, /@font-face\s*\{[^}]*font-family:\s*"IBM Plex Mono"[^}]*ibm-plex-mono-600-latin\.woff2[^}]*font-display:\s*swap/);

    // HTML preload links for primary WOFF2 fonts
    for (const [name, html] of [['index.html', indexHtml], ['resume.html', resumeHtml]]) {
      assert.match(html, /href="assets\/fonts\/plus-jakarta-sans-latin\.woff2"\s+as="font"\s+type="font\/woff2"\s+crossorigin/, `${name} must preload plus-jakarta-sans-latin.woff2`);
      assert.match(html, /href="assets\/fonts\/manrope-latin\.woff2"\s+as="font"\s+type="font\/woff2"\s+crossorigin/, `${name} must preload manrope-latin.woff2`);
    }
  });

  await t.test('2. Global typography tokens (--font-display, --font-body, --font-mono, scale & rhythm tokens) are defined in :root', () => {
    for (const [label, css] of [['styles.css', stylesCss], ['architect-workbench.css', wbCss]]) {
      assert.match(css, /--font-display:\s*"Plus Jakarta Sans",\s*sans-serif;/, `${label} must define --font-display`);
      assert.match(css, /--font-body:\s*"Manrope",\s*sans-serif;/, `${label} must define --font-body`);
      assert.match(css, /--font-mono:\s*"IBM Plex Mono",\s*monospace;/, `${label} must define --font-mono`);
      assert.match(css, /--text-hero:\s*clamp\(2\.75rem,\s*4\.5vw,\s*4\.5rem\);/, `${label} must define --text-hero`);
      assert.match(css, /--text-section:\s*clamp\(2rem,\s*3vw,\s*3rem\);/, `${label} must define --text-section`);
      assert.match(css, /--text-card-title:\s*1\.125rem;/, `${label} must define --text-card-title`);
      assert.match(css, /--text-body:\s*1rem;/, `${label} must define --text-body`);
      assert.match(css, /--text-small:\s*0\.875rem;/, `${label} must define --text-small`);
      assert.match(css, /--text-label:\s*0\.75rem;/, `${label} must define --text-label`);
    }
  });

  await t.test('3. Hero typography applies Plus Jakarta Sans weight 800, line-height 1.05, letter-spacing -0.035em, and improved kicker hierarchy', () => {
    const typoRefreshIdx = wbCss.indexOf('/* ==========================================================================\n   PORTFOLIO TYPOGRAPHY REFRESH — PREMIUM DESIGN SYSTEM (R58–R64)');
    assert.ok(typoRefreshIdx > 0, 'Portfolio Typography Refresh block must exist in dist/architect-workbench.css');
    const refreshCss = wbCss.slice(typoRefreshIdx);

    // Hero main phrase: Plus Jakarta Sans (--font-display), weight 800, line-height 1.05, letter-spacing -0.035em
    assert.match(
      refreshCss,
      /\.career-hero\s+h1\s+\.hero-tier-main\s*\{[\s\S]*?font-family:\s*var\(--font-display\)\s*!important;[\s\S]*?font-weight:\s*800\s*!important;[\s\S]*?line-height:\s*1\.05\s*!important;[\s\S]*?letter-spacing:\s*-0\.035em\s*!important/
    );

    // Hero introductory kicker: Plus Jakarta Sans (--font-display), weight 600, line-height 1.08
    assert.match(
      refreshCss,
      /\.career-hero\s+h1\s+\.hero-tier-kicker\s*\{[\s\S]*?font-family:\s*var\(--font-display\)\s*!important;[\s\S]*?font-weight:\s*600\s*!important;[\s\S]*?line-height:\s*1\.08\s*!important/
    );

    // Hero lead paragraph: Manrope (--font-body), line-height 1.58 (within 1.5-1.65)
    assert.match(
      refreshCss,
      /\.career-hero\s+\.hero-copy-col\s+\.hero-lead\s*\{[\s\S]*?font-family:\s*var\(--font-body\)\s*!important;[\s\S]*?line-height:\s*1\.58\s*!important/
    );
  });

  await t.test('4. Consistent typography across Navigation, Featured Builds, Career Timeline, Skills & Graph, About Me, and Contact/Footer', () => {
    const typoRefreshIdx = wbCss.indexOf('/* ==========================================================================\n   PORTFOLIO TYPOGRAPHY REFRESH — PREMIUM DESIGN SYSTEM (R58–R64)');
    assert.ok(typoRefreshIdx > 0);
    const refreshCss = wbCss.slice(typoRefreshIdx);

    // Navigation & Header: Manrope Semibold (600)
    assert.match(refreshCss, /#primary-nav\s+a[\s\S]*?font-family:\s*var\(--font-body\)\s*!important;[\s\S]*?font-weight:\s*600\s*!important/);

    // Section Headings: Plus Jakarta Sans (--font-display), line-height 1.16 (within 1.15-1.25)
    assert.match(refreshCss, /#home-sum-proj-heading[\s\S]*?font-family:\s*var\(--font-display\)\s*!important;[\s\S]*?line-height:\s*1\.16\s*!important/);

    // Card Headings across Builds, Career, Skills, About, and Footer: Plus Jakarta Sans (--font-display), line-height 1.28 (within 1.25-1.35)
    for (const sel of ['.fw-primary-title', '.fw-secondary-title', '.eb-card-title', '.cr-card-title', '.sk-v5-domain-title', '.about-pillar-title', '.about-step-title', '.jb-fp-card__title']) {
      assert.ok(refreshCss.includes(sel), `Card heading selector ${sel} must be governed by --font-display`);
    }
    assert.match(refreshCss, /line-height:\s*1\.28\s*!important/);

    // Technical accents & dates: IBM Plex Mono (--font-mono), line-height 1.38 (within 1.3-1.5)
    for (const monoSel of ['.eb-preview-counter', '.cr-node-years', '.cr-card-years', '.cr-detail-years', '.cr-arch-years', '.jb-footer-kicker', '.jb-footer-motto']) {
      assert.ok(refreshCss.includes(monoSel), `Technical/date selector ${monoSel} must be governed by --font-mono`);
    }
    assert.match(refreshCss, /font-family:\s*var\(--font-mono\)\s*!important/);
    assert.match(refreshCss, /line-height:\s*1\.38\s*!important/);

    // Career Reference & Resume CSS also wire --font-display, --font-body, and --font-mono
    assert.match(crCss, /var\(--font-display/);
    assert.match(crCss, /var\(--font-mono/);
    assert.match(resumeCss, /var\(--font-display/);
    assert.match(resumeCss, /var\(--font-mono/);
  });

  await t.test('5. Real HTTP server (serve.cjs) serves WOFF2 fonts with Content-Type font/woff2, 3-point byte range boundaries, and canary non-leakage', async () => {
    const { server } = require(path.join(root, 'serve.cjs'));
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    const port = server.address().port;

    const reqHttp = (reqPath, headers = {}) =>
      new Promise((resolve, reject) => {
        const req = http.request(
          {
            hostname: '127.0.0.1',
            port,
            path: reqPath,
            method: 'GET',
            headers: { Connection: 'close', ...headers }
          },
          res => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
          }
        );
        req.on('error', reject);
        req.end();
      });

    try {
      const canary = 'CANARY-TYPO-FONT-998877';
      for (const file of expectedFonts) {
        const res = await reqHttp(`/assets/fonts/${file}?probe=${canary}`, { 'X-Canary': canary });
        assert.equal(res.status, 200, `Expected 200 OK for /assets/fonts/${file}`);
        assert.equal(res.headers['content-type'], 'font/woff2');
        assert.equal(res.headers['x-content-type-options'], 'nosniff');
        assert.equal(res.body.subarray(0, 4).toString('ascii'), 'wOF2');
        assert.doesNotMatch(JSON.stringify(res.headers), new RegExp(canary));
      }

      // 3-point HTTP Range boundary on plus-jakarta-sans-latin.woff2 (size-2, size-1, size)
      const pjsSize = fs.statSync(path.join(root, 'dist/assets/fonts/plus-jakarta-sans-latin.woff2')).size;
      const rBefore = await reqHttp('/assets/fonts/plus-jakarta-sans-latin.woff2', { Range: `bytes=0-${pjsSize - 2}` });
      const rExact = await reqHttp('/assets/fonts/plus-jakarta-sans-latin.woff2', { Range: `bytes=0-${pjsSize - 1}` });
      const rAfter = await reqHttp('/assets/fonts/plus-jakarta-sans-latin.woff2', { Range: `bytes=0-${pjsSize}` });

      assert.equal(rBefore.status, 206);
      assert.equal(rBefore.body.length, pjsSize - 1);
      assert.equal(rExact.status, 206);
      assert.equal(rExact.body.length, pjsSize);
      assert.equal(rAfter.status, 416);
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});
