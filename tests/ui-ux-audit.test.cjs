'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const { server } = require('../serve.cjs');
const careerRef = require('../dist/career-reference.js');

function requestBuffer(port, reqPath, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port, path: reqPath, headers: { Connection: 'close', ...extraHeaders } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
  });
}

test('R70-R78: Full-Site UI/UX Audit Fixes — Asset Integrity, Skip-Link Containment, Responsive Grid Fit, Touch Targets & Contrast', async (t) => {
  const stylesCss = fs.readFileSync(path.join(root, 'dist/styles.css'), 'utf8');
  const wbCss = fs.readFileSync(path.join(root, 'dist/architect-workbench.css'), 'utf8');
  const crCss = fs.readFileSync(path.join(root, 'dist/career-reference.css'), 'utf8');
  const crJs = fs.readFileSync(path.join(root, 'dist/career-reference.js'), 'utf8');
  const resumeCss = fs.readFileSync(path.join(root, 'dist/resume.css'), 'utf8');

  await t.test('R70: Career section Chapter 4 project card thumbnails all exist on disk and serve HTTP 200 (zero broken 404 images)', async () => {
    assert.ok(!crJs.includes('proj-banner-workshop42.jpg'), 'career-reference.js must not reference non-existent assets/proj-banner-workshop42.jpg');

    const chapters = careerRef.CHAPTERS;
    assert.equal(chapters.length, 4, 'Must have 4 career chapters');
    const learningChapter = chapters.find((c) => c.id === 'learning');
    assert.ok(learningChapter, 'Chapter 4 (learning) must exist');
    const workshopCard = learningChapter.projectCards.find((p) => p.slug === 'workshop42');
    assert.ok(workshopCard, 'Workshop42 project card must exist in Chapter 4');
    assert.equal(workshopCard.thumb, 'assets/optimized-extra/apex-1200.webp', 'Workshop42 project card must use existing assets/optimized-extra/apex-1200.webp thumbnail');

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    try {
      for (const ch of chapters) {
        const imgFile = path.join(root, 'dist/assets', ch.image);
        const detailImgFile = path.join(root, 'dist/assets', ch.detailImage);
        assert.ok(fs.existsSync(imgFile), `Chapter ${ch.id} image ${ch.image} must exist`);
        assert.ok(fs.existsSync(detailImgFile), `Chapter ${ch.id} detailImage ${ch.detailImage} must exist`);

        for (const card of ch.projectCards || []) {
          const thumbDiskPath = path.join(root, 'dist', card.thumb);
          assert.ok(fs.existsSync(thumbDiskPath), `Chapter ${ch.id} card ${card.slug} thumb ${card.thumb} must exist on disk`);
          const res = await requestBuffer(port, '/' + card.thumb.replace(/^\/+/, ''));
          assert.equal(res.status, 200, `GET /${card.thumb} must return HTTP 200`);
          assert.ok(res.body.length > 1000, `GET /${card.thumb} must return a valid image payload (>1KB)`);
        }
      }

      // 3-point byte-range boundary check (size-2, size-1, size) and adversarial canary check on assets/optimized-extra/apex-1200.webp
      const apexStat = fs.statSync(path.join(root, 'dist/assets/optimized-extra/apex-1200.webp'));
      const size = apexStat.size;
      const canary = 'CANARY-AUDIT-778899aa';
      const [rBefore, rExact, rAfter] = await Promise.all([
        requestBuffer(port, `/assets/optimized-extra/apex-1200.webp?canary=${canary}`, { Range: `bytes=0-${size - 2}`, 'X-Canary': canary }),
        requestBuffer(port, `/assets/optimized-extra/apex-1200.webp?canary=${canary}`, { Range: `bytes=0-${size - 1}`, 'X-Canary': canary }),
        requestBuffer(port, `/assets/optimized-extra/apex-1200.webp?canary=${canary}`, { Range: `bytes=${size}-${size}`, 'X-Canary': canary })
      ]);
      assert.equal(rBefore.status, 206, 'Range 0..(size-2) must return 206 Partial Content');
      assert.equal(rBefore.body.length, size - 1);
      assert.equal(rExact.status, 206, 'Range 0..(size-1) must return 206 Partial Content');
      assert.equal(rExact.body.length, size);
      assert.equal(rAfter.status, 416, 'Range size..size must return 416 Range Not Satisfiable');
      for (const r of [rBefore, rExact, rAfter]) {
        assert.ok(!JSON.stringify(r.headers).includes(canary), 'Canary must never leak in response headers');
        assert.ok(!r.body.toString('utf8').includes(canary), 'Canary must never leak in response body');
      }
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await t.test('R71: .skip-link is strictly hidden off-screen when unfocused and cleanly revealed on :focus / :focus-visible', () => {
    assert.match(
      stylesCss,
      /\.skip-link:not\(:focus\):not\(:focus-visible\)\s*\{[^}]*top:\s*-120px[^}]*opacity:\s*0[^}]*pointer-events:\s*none/,
      'dist/styles.css must hide .skip-link off-screen with opacity:0 and pointer-events:none when unfocused'
    );
    assert.match(
      wbCss,
      /\.skip-link:not\(:focus\):not\(:focus-visible\)\s*\{[\s\S]*?top:\s*-120px\s*!important;[\s\S]*?opacity:\s*0\s*!important;[\s\S]*?pointer-events:\s*none\s*!important/,
      'dist/architect-workbench.css must enforce off-screen .skip-link containment when unfocused'
    );
    assert.match(
      wbCss,
      /\.skip-link:focus,\s*\.skip-link:focus-visible\s*\{[\s\S]*?top:\s*12px\s*!important;[\s\S]*?opacity:\s*1\s*!important;[\s\S]*?pointer-events:\s*auto\s*!important/,
      'dist/architect-workbench.css must reveal .skip-link cleanly on :focus / :focus-visible'
    );
  });

  await t.test('R72: About Josh 3-column desktop stage fits 1280px-1440px viewports without right-column clipping while preserving 3D perspective tilt', () => {
    assert.match(
      wbCss,
      /#home-about-section\s+\.about-top-three-col-stage\s*\{[\s\S]*?grid-template-columns:\s*minmax\(280px,\s*1fr\)\s+minmax\(540px,\s*1\.85fr\)\s+minmax\(290px,\s*1\.02fr\)\s*!important;[\s\S]*?gap:\s*clamp\(24px,\s*2\.8vw,\s*48px\)\s*!important/,
      'About Josh .about-top-three-col-stage must use responsive minmax(280px, 1fr) minmax(540px, 1.85fr) minmax(290px, 1.02fr) columns so all 3 columns fit within 1440px desktop viewports'
    );
    // Verify 3D perspective tilt is preserved
    assert.match(
      wbCss,
      /#home-about-section\s+\.about-prog-photo\.is-tilted-left\s*\{[\s\S]*?transform:\s*perspective\(660px\)\s+rotateY\(14\.5deg\)\s*!important/
    );
    assert.match(
      wbCss,
      /#home-about-section\s+\.about-prog-photo\.is-tilted-right\s*\{[\s\S]*?transform:\s*perspective\(660px\)\s+rotateY\(-14\.5deg\)\s*!important/
    );
  });

  await t.test('R73: Skills section prevents mobile 390px horizontal overflow on .sk-v5-title-line2 and prevents desktop metric card cramping', () => {
    assert.match(
      wbCss,
      /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?#home-skills-section\s+\.sk-v5-title-line1,\s*#home-skills-section\s+\.sk-v5-title-line2\s*\{[\s\S]*?white-space:\s*normal\s*!important/,
      'Skills title lines must allow wrapping (white-space: normal !important) at <=900px so "Connected. Amplified. Expanding." never overflows 390px mobile screens'
    );
    assert.match(
      wbCss,
      /#home-skills-section\s+\.sk-v5-metric-card\s*\{[\s\S]*?padding:\s*15px\s+16px\s*!important/,
      'Skills desktop metric cards must use balanced 15px 16px padding so "Real-world / Solutions that scale" has breathing room'
    );
  });

  await t.test('R74: Career section on mobile (<=768px) provides horizontal container padding, a 2x2 .cr-milestones grid, and >=34px chapter step buttons', () => {
    assert.match(
      crCss,
      /#home-career-section\s+\.cr-chapter-step-btn\s*\{[\s\S]*?width:\s*34px\s*!important;[\s\S]*?height:\s*34px\s*!important/,
      '.cr-chapter-step-btn must have 34x34px hit target dimensions'
    );
    assert.match(
      crCss,
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?#home-career-section\s+\.cr-milestones\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)\s*!important/,
      'Mobile #home-career-section .cr-milestones must switch to a 2x2 grid at <=768px so Node 4 is never clipped'
    );
    assert.match(
      crCss,
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?#home-career-section\s+\.career-reference\s*\{[\s\S]*?padding-inline:\s*18px\s*!important/,
      'Mobile #home-career-section .career-reference must include horizontal padding-inline: 18px !important'
    );
  });

  await t.test('R75 & R76: Mega Footer tech pill sizing ("Google Cloud" unclipped), interactive hit target floors, and scroll-jump stability', () => {
    assert.match(
      wbCss,
      /#home-connect\.jb-mega-footer\s+\.jb-tech-pill\s*\{[\s\S]*?padding:\s*0\s+7px;[\s\S]*?gap:\s*5\.5px;[\s\S]*?font-size:\s*10\.8px;/,
      'Mega Footer .jb-tech-pill must use compact 0 7px padding and 10.8px font-size so "Google Cloud" is not clipped'
    );
    assert.match(
      wbCss,
      /#home-connect\.jb-mega-footer\s+\.jb-fp-view-all\s*\{[\s\S]*?min-height:\s*32px;/,
      'Mega Footer .jb-fp-view-all must have min-height: 32px hit target'
    );
    assert.match(
      wbCss,
      /#home-connect\.jb-mega-footer\s+\.jb-footer-legal-nav\s+a\s*\{[\s\S]*?min-height:\s*32px;/,
      'Mega Footer legal links must have min-height: 32px hit target'
    );
    assert.match(
      wbCss,
      /body\[data-active-route\]\s+#home-career-section,[\s\S]*?content-visibility:\s*visible\s*!important;/,
      'Below-the-fold sections must use content-visibility: visible !important for deterministic anchor scroll offsets'
    );
    assert.match(
      wbCss,
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?#home-featured-projects\s+\.eb-preview-subtabs\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)\s*!important/,
      'Mobile Featured Builds .eb-preview-subtabs must use a 2-column grid at <=768px so "My contribution" and all 6 subtabs are never clipped'
    );
  });

  await t.test('R77: resume.css .copilot-avatar meets WCAG AA contrast (>=4.5:1) and step/badge pills meet >=11px UI text floor', () => {
    assert.ok(
      !resumeCss.includes('linear-gradient(135deg, #0755ff 0%, #1d8bff 100%)'),
      'dist/resume.css must not use low-contrast #1d8bff gradient endpoint on .copilot-avatar with white text'
    );
    assert.match(
      resumeCss,
      /\.copilot-avatar\s*\{[\s\S]*?background:\s*linear-gradient\(135deg,\s*#0755ff\s+0%,\s*#1d4ed8\s+100%\);/,
      '.copilot-avatar must use WCAG AA compliant #0755ff -> #1d4ed8 gradient with #ffffff text'
    );
    assert.match(
      resumeCss,
      /\.section-step-pill\s*\{[\s\S]*?font-size:\s*11px;/,
      '.section-step-pill must be at least 11px'
    );
    assert.match(
      resumeCss,
      /\.copilot-fit-badge\s*\{[\s\S]*?font-size:\s*11px;/,
      '.copilot-fit-badge must be at least 11px'
    );
  });

  await t.test('R80: Global vertical rhythm & section padding harmonization across Desktop (>=1181px), Tablet (769px-1180px), and Mobile (<=768px)', () => {
    assert.match(
      crCss,
      /#home-career-section\.home-sum-career,\s*#home-career-section\.home-career-compact-showcase\s*\{\s*padding:\s*58px\s+0\s+52px\s*!important;\s*\}/,
      'dist/career-reference.css must set Desktop #home-career-section padding to 58px 0 52px !important instead of clobbering with 28px 0 32px'
    );
    assert.match(
      crCss,
      /@media\s*\(min-width:\s*769px\)\s*and\s*\(max-width:\s*1180px\)\s*\{[\s\S]*?#home-career-section\.home-sum-career,\s*#home-career-section\.home-career-compact-showcase\s*\{\s*padding:\s*48px\s+0\s+48px\s*!important;/,
      'dist/career-reference.css must set Tablet (769px-1180px) #home-career-section padding to 48px 0 48px !important'
    );
    assert.match(
      crCss,
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?#home-career-section\.home-sum-career,\s*#home-career-section\.home-career-compact-showcase\s*\{\s*padding:\s*40px\s+0\s+44px\s*!important;/,
      'dist/career-reference.css must set Mobile (<=768px) #home-career-section padding to 40px 0 44px !important'
    );
    assert.match(
      wbCss,
      /@media\s*\(min-width:\s*1181px\)\s*\{[\s\S]*?#home-skills-section\.home-sum-skills,\s*#home-skills-section\[data-skills-theme="dark"\]\.home-sum-skills\s*\{\s*padding:\s*64px\s+0\s+68px\s*!important;/,
      'Desktop (>=1181px) #home-skills-section[data-skills-theme="dark"].home-sum-skills must have 64px 0 68px !important vertical rhythm'
    );
    assert.match(
      wbCss,
      /@media\s*\(min-width:\s*1181px\)\s*\{[\s\S]*?#home-about-section\.home-sum-about,\s*body\[data-active-route="home"\]\s+#home-about-section\.home-sum-about\s*\{\s*padding:\s*64px\s+0\s+68px\s*!important;/,
      'Desktop (>=1181px) #home-about-section.home-sum-about must harmonize to 64px 0 68px !important vertical rhythm'
    );
    assert.match(
      wbCss,
      /@media\s*\(min-width:\s*769px\)\s*and\s*\(max-width:\s*1180px\)\s*\{[\s\S]*?#home-skills-section\.home-sum-skills,\s*#home-skills-section\[data-skills-theme="dark"\]\.home-sum-skills\s*\{\s*padding:\s*52px\s+0\s+56px\s*!important;/,
      'Tablet (769px-1180px) #home-skills-section[data-skills-theme="dark"].home-sum-skills must have 52px 0 56px !important vertical rhythm'
    );
    assert.match(
      wbCss,
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?#home-skills-section\.home-sum-skills,\s*#home-skills-section\[data-skills-theme="dark"\]\.home-sum-skills\s*\{\s*padding:\s*40px\s+0\s+48px\s*!important;/,
      'Mobile (<=768px) #home-skills-section[data-skills-theme="dark"].home-sum-skills must have 40px 0 48px !important vertical rhythm'
    );
  });

  await t.test('R81 & R83: Career section horizontal gutters on Desktop/Tablet (>=769px) and internal vertical rhythm', () => {
    assert.match(
      crCss,
      /@media\s*\(min-width:\s*769px\)\s*\{[\s\S]*?#home-career-section\s+\.career-reference\s*\{\s*padding-inline:\s*clamp\(24px,\s*4vw,\s*48px\)\s*!important;/,
      'Desktop/Tablet (>=769px) #home-career-section .career-reference must enforce horizontal gutters via padding-inline: clamp(24px, 4vw, 48px) !important'
    );
    assert.match(
      crCss,
      /#home-career-section\s+\.cr-v2-timeline\s*\{\s*margin:\s*12px\s+0\s+0\s*!important;/,
      '#home-career-section .cr-v2-timeline must have 12px top margin for breathing room below .cr-hero'
    );
    assert.match(
      crCss,
      /#home-career-section\s+\.cr-selected-chapter-panel\s*\{\s*margin-top:\s*18px\s*!important;/,
      '#home-career-section .cr-selected-chapter-panel must have 18px top margin below chapter cards'
    );
  });

  await t.test('R82: Featured Builds search input width (unclipped placeholder), compact stacked intro padding, and responsive rotating rail columns', () => {
    assert.match(
      wbCss,
      /@media\s*\(min-width:\s*1181px\)\s*\{[\s\S]*?#home-featured-projects\s+\.home-fw-top-controls\s+\.eb-search-wrap\s*\{\s*width:\s*158px\s*!important;\s*min-width:\s*148px\s*!important;/,
      'Desktop .eb-search-wrap must be at least 158px wide so "Search projects..." placeholder is never truncated'
    );
    assert.match(
      wbCss,
      /@media\s*\(max-width:\s*1180px\)\s*\{[\s\S]*?#home-featured-projects\s+\.home-fw-intro-col\s*\{\s*padding:\s*4px\s+12px\s+8px\s+8px\s*!important;/,
      'Tablet/Mobile (<=1180px) .home-fw-intro-col must eliminate the 42px bottom padding gap when stacked above the filter bar'
    );
    assert.match(
      wbCss,
      /@media\s*\(min-width:\s*769px\)\s*and\s*\(max-width:\s*1180px\)\s*\{[\s\S]*?#home-featured-projects\s+\.home-fw-rotating-rail\s*\{\s*grid-auto-columns:\s*calc\(\(100%\s*-\s*14px\)\s*\/\s*2\)\s*!important;/,
      'Tablet (769px-1180px) .home-fw-rotating-rail must display 2 cards per view instead of 3 cramped cards'
    );
    assert.match(
      wbCss,
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?#home-featured-projects\s+\.home-fw-rotating-rail\s*\{\s*grid-auto-columns:\s*100%\s*!important;/,
      'Mobile (<=768px) .home-fw-rotating-rail must display 1 full-width card per view'
    );
  });

  await t.test('R84 & R85: About Josh Tablet/Mobile rhythm & 18px mobile gutters, and Mega Footer Tablet card & bottom-bar responsiveness', () => {
    assert.match(
      wbCss,
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?#home-about-section\s+\.home-sum-about-cinematic-layout\s*\{\s*width:\s*calc\(100%\s*-\s*36px\)\s*!important;/,
      'Mobile (<=768px) #home-about-section .home-sum-about-cinematic-layout must use calc(100% - 36px) for 18px left/right gutters matching Hero, Career, and Skills'
    );
    assert.match(
      wbCss,
      /@media\s*\(min-width:\s*769px\)\s*and\s*\(max-width:\s*1180px\)\s*\{[\s\S]*?#home-connect\.jb-mega-footer\s+\.jb-footer-bottom-center\s*\{[\s\S]*?order:\s*3\s*!important;\s*width:\s*100%\s*!important;/,
      'Tablet (769px-1180px) Mega Footer bottom bar must wrap .jb-footer-bottom-center onto a full-width centered row so the motto does not wrap into narrow vertical stacks'
    );
  });
});
