'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const root = process.env.PORTFOLIO_REVIEW_ROOT || path.resolve(__dirname, '..');

test('R65-R66: Top Featured Builds card hosts category-only filters and manual all-builds rail with prev/next buttons', () => {
  const js = fs.readFileSync(path.join(root, 'dist/architect-workbench.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'dist/architect-workbench.css'), 'utf8');

  // R65: Filter pills and search/sort controls are placed inside the top .home-featured-work-grid card
  const topGridStart = js.indexOf('<div class="home-sum-inner home-featured-work-grid">');
  const bottomWrapStart = js.indexOf('<div class="home-sum-inner home-section-drawer-wrap home-explore-builds-wrap">');
  assert.ok(topGridStart > 0 && bottomWrapStart > topGridStart, 'Top .home-featured-work-grid must precede bottom .home-explore-builds-wrap');

  const topGridHtml = js.slice(topGridStart, bottomWrapStart);
  assert.match(topGridHtml, /class="home-fw-rail-col"/, 'Top grid must contain .home-fw-rail-col');
  assert.match(topGridHtml, /class="home-fw-top-controls"/, 'Top grid must contain .home-fw-top-controls bar');
  assert.match(topGridHtml, /class="eb-filter-row"/, 'Filter pills (.eb-filter-row) must be inside the top card');
  for (const cat of ['all', 'professional', 'independent', 'insurance', 'data', 'infra', 'web']) {
    assert.match(topGridHtml, new RegExp(`data-eb-filter="${cat}"`), `Top card filter bar must include data-eb-filter="${cat}"`);
  }
  assert.doesNotMatch(topGridHtml, /data-eb-search/, 'Search was intentionally removed');
  assert.doesNotMatch(topGridHtml, /data-eb-filter-reset/, 'Redundant reset was intentionally removed');
  assert.doesNotMatch(topGridHtml, /data-eb-sort/, 'Sort was intentionally removed');

  // R66: Top rail stage has < (prev), rotating rail track for all builds, and > (next)
  assert.match(topGridHtml, /data-fw-rail-prev/, 'Top rail must have previous (<) button [data-fw-rail-prev]');
  assert.match(topGridHtml, /data-fw-rotating-rail/, 'Top rail must have rotating rail container [data-fw-rotating-rail]');
  assert.match(topGridHtml, /data-fw-rail-next/, 'Top rail must have next (>) button [data-fw-rail-next]');

  // renderExploreBuildsWorkbench renders all filtered builds into [data-fw-rotating-rail]
  assert.match(js, /const\s+railEl\s*=\s*document\.querySelector\("\[data-fw-rotating-rail\]"\)/, 'renderExploreBuildsWorkbench must query [data-fw-rotating-rail]');
  assert.match(js, /data-fw-rail-card="\$\{proj\.slug\}"/, 'Top rotating rail must render cards for every filtered project in list');
  assert.match(css, /#home-featured-projects\s+\.home-fw-rotating-rail\b/, 'CSS must style .home-fw-rotating-rail');
  assert.match(css, /#home-featured-projects\s+\.fw-rail-nav-btn\b/, 'CSS must style .fw-rail-nav-btn (< and > buttons)');
  assert.match(css, /#home-featured-projects\s+\.home-fw-secondary-card\.is-selected\b/, 'CSS must highlight the selected build card in the top rotating rail');
});

test('R66: Top rotating rail auto-rotation and manual step logic obeys 3-point time boundaries and handles hostile inputs', () => {
  const js = fs.readFileSync(path.join(root, 'dist/architect-workbench.js'), 'utf8');

  assert.match(js, /const\s+FW_RAIL_ROTATE_MS\s*=\s*4500;/, 'FW_RAIL_ROTATE_MS must be defined as 4500ms');
  assert.match(js, /function\s+getNextBuildRotationIndex\s*\(/, 'getNextBuildRotationIndex helper must exist in architect-workbench.js');

  const fnStart = js.indexOf('function getNextBuildRotationIndex(');
  const fnEnd = js.indexOf('function getExploreBuildDisplay(', fnStart);
  assert.ok(fnStart > 0 && fnEnd > fnStart, 'getNextBuildRotationIndex must precede getExploreBuildDisplay');
  const fnSource = js.slice(fnStart, fnEnd);
  const getNextBuildRotationIndex = new Function(`${fnSource}; return getNextBuildRotationIndex;`)();

  // Manual step wrap-around boundaries (16 builds: 0..15)
  assert.equal(getNextBuildRotationIndex(0, 16, 1, 0, 4500, false), 1);
  assert.equal(getNextBuildRotationIndex(15, 16, 1, 0, 4500, false), 0, 'Next from last build wraps to 0');
  assert.equal(getNextBuildRotationIndex(0, 16, -1, 0, 4500, false), 15, 'Prev from first build wraps to 15');

  // 3-point time boundaries at 4500ms, 9000ms, and 72000ms (full 16-card cycle)
  assert.equal(getNextBuildRotationIndex(0, 16, 0, 4499, 4500, false), 0, '4499ms (window - 1ms) stays at index 0');
  assert.equal(getNextBuildRotationIndex(0, 16, 0, 4500, 4500, false), 1, '4500ms (exact window) advances to index 1');
  assert.equal(getNextBuildRotationIndex(0, 16, 0, 4501, 4500, false), 1, '4501ms (window + 1ms) is at index 1');

  assert.equal(getNextBuildRotationIndex(0, 16, 0, 8999, 4500, false), 1, '8999ms stays at index 1');
  assert.equal(getNextBuildRotationIndex(0, 16, 0, 9000, 4500, false), 2, '9000ms advances to index 2');
  assert.equal(getNextBuildRotationIndex(0, 16, 0, 9001, 4500, false), 2, '9001ms is at index 2');

  assert.equal(getNextBuildRotationIndex(0, 16, 0, 71999, 4500, false), 15, '71999ms is at index 15');
  assert.equal(getNextBuildRotationIndex(0, 16, 0, 72000, 4500, false), 0, '72000ms wraps cleanly to index 0');
  assert.equal(getNextBuildRotationIndex(0, 16, 0, 72001, 4500, false), 0, '72001ms is at index 0');

  // Paused state & hostile inputs
  assert.equal(getNextBuildRotationIndex(4, 16, 0, 9000, 4500, true), 4, 'Paused rotation does not advance');
  assert.equal(getNextBuildRotationIndex(NaN, 16, 0, 4500, 4500, false), 1);
  assert.equal(getNextBuildRotationIndex(-5, 16, 0, 0, 4500, false), 0);
  assert.equal(getNextBuildRotationIndex(3, 0, 1, 4500, 4500, false), 0, 'Empty list returns 0 safely');
  assert.equal(getNextBuildRotationIndex(2, 16, 0, -500, 4500, false), 2, 'Negative elapsed time does not advance');
});

test('R67-R68: Bottom card hides redundant mini-strip and displays enlarged selected build showcase with gallery and header controls', async () => {
  const js = fs.readFileSync(path.join(root, 'dist/architect-workbench.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'dist/architect-workbench.css'), 'utf8');

  // R67: Redundant bottom header row and 6-card mini strip are hidden in #home-builds-drawer
  const bottomWrapStart = js.indexOf('<div class="home-sum-inner home-section-drawer-wrap home-explore-builds-wrap">');
  const bottomWrapEnd = js.indexOf('<!-- Hidden legacy carousel stage preserved for script compatibility -->', bottomWrapStart);
  const bottomHtml = js.slice(bottomWrapStart, bottomWrapEnd);
  assert.match(bottomHtml, /<div class="eb-header-row"[^>]*hidden/, 'Redundant .eb-header-row in bottom card must be hidden');
  assert.match(bottomHtml, /<div class="eb-strip-outer"[^>]*hidden/, 'Redundant .eb-strip-outer in bottom card must be hidden');

  // R68: Selected build preview panel has visible gallery thumbnails and visible top-right counter + step + case study CTA
  const renderFnStart = js.indexOf('function renderExploreBuildsWorkbench(');
  const renderFnEnd = js.indexOf('const homeSection = document.querySelector', renderFnStart);
  const renderFnCode = js.slice(renderFnStart, renderFnEnd);

  assert.match(renderFnCode, /<div class="eb-preview-gallery-row" role="group"/, '.eb-preview-gallery-row must be unhidden in selected build display');
  assert.doesNotMatch(renderFnCode, /<div class="eb-preview-gallery-row"\s+hidden/, '.eb-preview-gallery-row must not have hidden attribute');
  assert.match(renderFnCode, /<div class="eb-preview-top-right">/, '.eb-preview-top-right (counter, prev/next, View full case study CTA) must be unhidden');
  assert.doesNotMatch(renderFnCode, /<div class="eb-preview-top-right"\s+hidden/, '.eb-preview-top-right must not have hidden attribute');

  // Enlarged bottom card CSS dimensions
  assert.match(css, /#home-featured-projects\s+\.eb-preview-panel\s*\{[^}]*grid-template-columns:\s*minmax\(360px,\s*440px\)\s+minmax\(0,\s*1fr\)\s*!important/, 'Bottom preview panel must use enlarged media + detail column proportions');
  assert.match(css, /#home-featured-projects\s+\.eb-preview-main-img-wrap\s*\{[^}]*min-height:\s*260px\s*!important/, 'Bottom preview image must have enlarged min-height: 260px');
  assert.match(css, /#home-featured-projects\s+\.eb-preview-title\s*\{[^}]*font-size:\s*clamp\(1\.45rem,\s*1\.9vw,\s*1\.75rem\)\s*!important/, 'Bottom preview title must have enlarged clamp(1.45rem, 1.9vw, 1.75rem) font-size');
  assert.match(css, /#home-featured-projects\s+\.eb-preview-lead\s*\{[^}]*font-size:\s*0\.95rem\s*!important/, 'Bottom preview lead paragraph must have enlarged 0.95rem font-size');

  // Live HTTP & canary check against serve.cjs
  const { server } = require(path.join(root, 'serve.cjs'));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const canary = 'CANARY-RAIL-7d9e2a1b';
  try {
    const get = (reqPath) => new Promise((resolve, reject) => {
      http.get({ hostname: '127.0.0.1', port, path: reqPath, headers: { 'X-Canary': canary } }, res => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
      }).on('error', reject);
    });
    const [resJs, resCss] = await Promise.all([
      get('/architect-workbench.js?probe=' + canary),
      get('/architect-workbench.css?probe=' + canary)
    ]);
    assert.equal(resJs.status, 200);
    assert.equal(resCss.status, 200);
    assert.match(resJs.body, /data-fw-rotating-rail/);
    assert.match(resCss.body, /\.home-fw-rotating-rail/);
    assert.doesNotMatch(resJs.body, new RegExp(canary));
    assert.doesNotMatch(resCss.body, new RegExp(canary));
  } finally {
    await new Promise(r => server.close(r));
  }
});
