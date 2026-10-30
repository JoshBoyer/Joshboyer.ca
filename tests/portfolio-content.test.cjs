'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=process.env.PORTFOLIO_REVIEW_ROOT||path.resolve(__dirname,'..');
const text=fs.readFileSync(path.join(root,'dist/architect-workbench.js'),'utf8');
const evidence=JSON.parse(fs.readFileSync(path.join(root,'dist/career-evidence.v3.json'),'utf8'));
const twin=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/retired-twin-context.json'),'utf8'));
function block(name,next){const a=text.indexOf('const '+name+' = Object.freeze('),b=text.indexOf(next,a),s=text.slice(a,b).trim().replace(new RegExp('^const '+name+' = Object.freeze\\('),'').replace(/\);\s*$/,'');return vm.runInNewContext('('+s+')',{}, {timeout:1000});}
const catalog=block('PROJECTS_CATALOG','    const PROJECTS_BY_SLUG'),by=Object.fromEntries(catalog.map(x=>[x.slug,x]));
test('delivered, limited and proposed outcomes stay distinct across project presentations',()=>{assert.match(by.changes.status,/discontinued/i);assert.match(by.changes.solution,/tentative limited production/i);assert.match(by.claims.status,/live/i);assert.match(by.continuity.status,/interim/i);assert.match(by.continuity.keyResultsChecks.join(' '),/not confirmed live/);assert.match(by.nexus.status,/development/i);const slides=block('FEATURED_CAROUSEL_SLIDES','    function getCarouselMetricIconSvg');assert.equal(slides.find(x=>x.slug==='changes').floatingCard.status,'Pilot discontinued');assert.equal(slides.find(x=>x.slug==='claims').metrics[0].label,'Live integration support');const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');assert.doesNotMatch(html,/Approximately 2014|forward-deployed/);const rows=[...html.matchAll(/<article class="career-project-row">[\s\S]*?<\/article>/g)].map(x=>x[0]);assert.equal(rows.length,13);for(const slug of ['changes','claims','takeover','continuity','sql']){const row=rows.find(x=>x.includes('#projects/'+slug));assert.ok(row,slug);assert.ok(row.includes(by[slug].shortDesc.replace(/&/g,'&amp;')),slug+' fallback summary follows the same source');}});
test('VBA ownership and professional automation are surfaced without transferring backend ownership',()=>{assert.match(by.takeover.contribution,/designed and built the Excel VBA add-in/);assert.match(by.takeover.contribution,/backend changes with a developer/);const ai=block('SKILL_CATEGORIES','    const SKILL_TIMELINE_CHAPTERS').find(x=>x.id==='ai');assert.match(ai.overview,/Automation predates my AI projects/);for(const slug of ['renewals','takeover','upload','claims','nexus'])assert.ok(ai.relatedProjectSlugs.includes(slug));});
test('renewal outcomes retain scope and reflect Josh’s confirmed commercial 60%',()=>{assert.equal(by.renewals.metrics.length,2);assert.doesNotMatch(by.renewals.metrics.map(x=>x.label).join(' '),/commercial/i);assert.match(by.renewals.metricsNote,/confirmed 60% commercial renewal automation/);assert.match(text,/val: "60%",\s*label: "Commercial Renewals"/);assert.doesNotMatch(text,/commercial[^\n]*(?:reconfirmation|unconfirmed)/i);assert.match(twin.accuracyRules.join(' '),/renewal-only/);assert.match(twin.accuracyRules.join(' '),/60% commercial.*reconfirmed/);});
test('assistant and resume evidence use the same revision and resolved VBA language',()=>{assert.equal(evidence.datasetVersion,twin.datasetVersion);assert.equal(evidence.datasetVersion,'2026-10-28.1');const chunk=evidence.chunks.find(x=>x.id==='experience-takeover');assert.match(chunk.resumeText,/production Excel VBA add-in/);assert.doesNotMatch(chunk.qualificationNotes.join(' '),/runtime.*unconfirmed|precise VB/);assert.match(twin.person.targetDirection,/target directions/);assert.match(twin.person.targetDirection,/Business Architect first/);});
test('the requested image removal and exact slogan remain intact',()=>{assert.doesNotMatch(text,/josh-curiosity-seated-younger-v1\.png/);assert.match(text,/about-prog-item-text/);assert.match(text,/josh-curiosity-child-tinkering-1024\.webp/);assert.match(text,/josh-curiosity-ai-orchestration-1024\.webp/);const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');assert.match(html,/Grounded in<br>the metal\./);assert.match(html,/Shaped by<br>the business\./);assert.match(html,/Building in<br>the cloud\./);assert.equal((html.match(/<template\s+id="project-/g)||[]).length,16);});
test('hero text aligns with the three-tier icon badge and two-line typographic hierarchy example',async()=>{const http=require('node:http'),{server}=require(path.join(root,'serve.cjs'));await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;const get=(reqPath,method='GET',headers={})=>new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port,path:reqPath,method,headers:{Connection:'close',...headers}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString('utf8')}));});req.on('error',reject);req.end();});try{const canary='CANARY-HERO-9f8a7b6c';const [resHtml,resJs,resCss,resCrCss,resTraversal,resBadMethod,resBadUrl]=await Promise.all([get('/?probe='+canary,'GET',{'X-Canary':canary}),get('/architect-workbench.js?probe='+canary),get('/architect-workbench.css?probe='+canary),get('/career-reference.css?probe='+canary),get('/..%2fJOSH-BOYER-PORTFOLIO-CORPUS.md?probe='+canary),get('/architect-workbench.js','DELETE'),get('/%E0%A4%A')]);assert.equal(resHtml.status,200);assert.equal(resJs.status,200);assert.equal(resCss.status,200);assert.equal(resCrCss.status,200);assert.equal(resTraversal.status,403);assert.equal(resBadMethod.status,405);assert.equal(resBadUrl.status,400);for(const r of [resHtml,resJs,resCss,resCrCss,resTraversal,resBadMethod,resBadUrl]){assert.doesNotMatch(r.body,new RegExp(canary));assert.doesNotMatch(JSON.stringify(r.headers),new RegExp(canary));}const js=resJs.body,css=resCss.body;const iMetal=js.indexOf('hero-tier-badge--metal'),iBiz=js.indexOf('hero-tier-badge--business'),iCloud=js.indexOf('hero-tier-badge--cloud');assert.ok(iMetal>0&&iBiz>iMetal&&iCloud>iBiz,'three-tier badges appear in metal -> business -> cloud order');assert.match(js,/heroGearMetalGrad/);assert.match(js,/heroBarsGoldGrad/);assert.match(js,/heroCloudBlueGrad/);assert.match(js,/hero-tier-ray--top/);assert.match(js,/hero-tier-ray--bottom/);assert.match(js,/hero-tier-connector--metal-gold/);assert.match(js,/hero-tier-connector--gold-cloud/);assert.match(js,/<span class="hero-tier-kicker">Grounded in<\/span><br><span class="hero-tier-main">the metal\.<\/span>/);assert.match(js,/<span class="hero-tier-kicker">Shaped by<\/span><br><span class="hero-tier-main">the business\.<\/span>/);assert.match(js,/<span class="hero-tier-kicker">Building in<\/span><br><span class="hero-tier-main">the cloud\.<\/span>/);assert.match(css,/\.hero-tier-badge\b/);assert.match(css,/\.hero-tier-kicker\b/);assert.match(css,/\.hero-tier-main\b/);const tailCss=css.slice(css.lastIndexOf('/* Hero slogan:'));assert.match(tailCss,/body\[data-active-route="home"\]\s+#main\s+section\[data-page="home"\]\s+\.career-hero\s+\.hero-copy-col\s*\{[^}]*max-width:\s*620px/);assert.match(tailCss,/\.hero-tier-badge\s*\{[^}]*width:\s*80px/);assert.match(tailCss,/\.hero-tier-connector\s*\{[^}]*top:\s*calc\(100%\s*-\s*2px\)\s*!important;\s*width:\s*2\.5px\s*!important;\s*height:\s*56px\s*!important/);assert.match(tailCss,/\.hero-tier-kicker\s*\{[^}]*2\.0rem/);assert.match(tailCss,/\.hero-tier-main\s*\{[^}]*3\.85rem/);assert.match(tailCss,/\.hero-lead\s*\{[^}]*1\.08rem/);assert.match(tailCss,/hero-static-line--top\s+\.hero-tier-kicker\s*\{[^}]*#ced6e2/);assert.match(tailCss,/hero-static-line--gold\s+\.hero-tier-main\s*\{[^}]*#f4c542/);assert.match(tailCss,/hero-static-line--bottom\s+\.hero-tier-main\s*\{[^}]*#29b6f6/);assert.match(tailCss,/\.hero-btn-primary\s*\{[^}]*#2563eb/);assert.match(tailCss,/\.hero-btn-secondary\s*\{[^}]*border-radius:\s*999px/);assert.match(js,/float\s+b1\s*=\s*1\.0\s*-\s*abs\(2\.0\s*\*\s*n1\s*-\s*1\.0\)/);assert.match(js,/vec3\s+heroLeftTwilightCol\s*=\s*bezierPalette\(/);assert.match(js,/vec3\s+twilightMidBandCol\s*=\s*bezierPalette\(/);assert.match(js,/vec3\(0\.024,\s*0\.051,\s*0\.114\)/);assert.match(tailCss,/section\[data-page="home"\]\s+\.home-featured-work-section\s*\{[^}]*padding:\s*52px\s+0\s+88px\s*!important/);assert.match(tailCss,/#home-career-section\.home-career-compact-showcase\s*\{[^}]*padding:\s*58px\s+0\s+52px\s*!important/);assert.match(js,/function\s+triggerHeroCloudRightToLeftGrow\(\)/);assert.match(js,/data-hero-cloud-cycle/);assert.doesNotMatch(js,/heroEl\.classList\.contains\("is-settled-final"\)\s*\|\|\s*window\.__FORCE_INSTANT_CLOUD_REVEAL/);assert.match(tailCss,/min-height:\s*var\(--portfolio-view-height,\s*100dvh\)\s*!important;\s*height:\s*var\(--portfolio-view-height,\s*100dvh\)\s*!important/);assert.match(js,/if\s*\(isJourneyActive\)\s*\{\s*heroCloudRevealState\s*=\s*0\.0;\s*\}/);assert.match(js,/vec2\s+floatInOffset\s*=\s*vec2\(-\(1\.0\s*-\s*preRevealSmooth\)\s*\*\s*145\.0\s*\*\s*topFloatZone,\s*\(1\.0\s*-\s*preRevealSmooth\)\s*\*\s*56\.0\s*\*\s*topFloatZone\)/);assert.match(js,/float\s+puffGrowScale\s*=\s*0\.18\s*\+\s*0\.82\s*\*\s*pow\(rtlReveal,\s*0\.72\)/);assert.match(js,/float\s+hiddenTopHorizonY\s*=\s*secTop\s*\+\s*88\.0\s*-\s*topCrestWave\s*\*\s*0\.10/);assert.match(js,/float\s+fullTopHorizonY\s*=\s*secTop\s*-\s*124\.0\s*-\s*topCrestWave\s*\*\s*0\.88\s*\*\s*puffGrowScale/);assert.match(js,/float\s+heroRevealAlpha\s*=\s*mix\(smoothstep\(0\.02,\s*0\.82,\s*rtlReveal\),\s*1\.0,\s*safeStep\(secTop\s*\+\s*24\.0,\s*secTop\s*\+\s*76\.0,\s*rawP\.y\)\)/);assert.match(tailCss,/\.builds-webgl-cloud-canvas\s*\{[^}]*top:\s*-220px\s*!important/);assert.match(tailCss,/section\[data-page="home"\]\s+\.career-hero\.is-journey-active\s+\.home-hero-cloud-transition\s*\{[^}]*opacity:\s*0\s*!important;\s*visibility:\s*hidden\s*!important/);assert.match(tailCss,/section\[data-page="home"\]:has\(\.career-hero\.is-journey-active:not\(\.is-settled-final\)\)\s+\.home-featured-work-section\s*>\s*\.builds-webgl-cloud-canvas\s*\{[^}]*opacity:\s*0\s*!important/);assert.match(tailCss,/@keyframes\s+hero-clouds-grow-rtl/);const typoIdx=tailCss.indexOf('/* Unified section header and subheading typography');assert.ok(typoIdx>0,'unified section typography block must exist at tail of architect-workbench.css');const typoCss=tailCss.slice(typoIdx);for(const sel of ['#home-sum-proj-heading','#cr-hero-title','#home-sum-career-heading','#home-sum-skills-heading','.cr-skills h2','#home-sum-about-heading','#home-sum-connect-heading','.home-fw-lead','.cr-intro .cr-lead','#home-career-section .home-sum-subtitle','#home-skills-section .home-sum-subtitle','#home-about-section .home-sum-about-body','#home-connect .home-sum-connect-lead']){assert.ok(typoCss.includes(sel),`unified typography block must include selector ${sel}`);}assert.match(typoCss,/font-family:\s*Manrope,\s*"Plus Jakarta Sans",\s*"Inter",\s*system-ui,\s*-apple-system,\s*sans-serif\s*!important/);assert.match(typoCss,/font-size:\s*clamp\(2\.15rem,\s*2\.85vw,\s*2\.75rem\)\s*!important;\s*line-height:\s*1\.04\s*!important;\s*letter-spacing:\s*-0\.03em\s*!important;\s*font-weight:\s*800\s*!important/);assert.match(typoCss,/font-size:\s*clamp\(0\.98rem,\s*1\.08vw,\s*1\.08rem\)\s*!important;\s*line-height:\s*1\.52\s*!important;\s*font-weight:\s*400\s*!important;\s*letter-spacing:\s*-0\.005em\s*!important/);const crCss=resCrCss.body;assert.match(crCss,/\.cr-intro\s+h1\s*\{[^}]*font-size:\s*clamp\(2\.15rem,\s*2\.85vw,\s*2\.75rem\);\s*line-height:\s*1\.04;\s*letter-spacing:\s*-0\.03em;\s*font-weight:\s*800/);assert.match(crCss,/\.cr-intro\s+\.cr-lead\s*\{[^}]*font-size:\s*clamp\(0\.98rem,\s*1\.08vw,\s*1\.08rem\);\s*line-height:\s*1\.52;\s*font-weight:\s*400;\s*letter-spacing:\s*-0\.005em/);assert.match(crCss,/\.cr-skills\s+h2\s*\{[^}]*font-size:\s*clamp\(2\.15rem,\s*2\.85vw,\s*2\.75rem\);\s*line-height:\s*1\.04;\s*letter-spacing:\s*-0\.03em;\s*font-weight:\s*800/);assert.match(crCss,/\.cr-skills-copy\s*>\s*p:not\(\.cr-kicker\)\s*\{[^}]*font-size:\s*clamp\(0\.98rem,\s*1\.08vw,\s*1\.08rem\);\s*line-height:\s*1\.52;\s*font-weight:\s*400;\s*letter-spacing:\s*-0\.005em/);const settleAt=t=>t<23.4?0:1;assert.equal(settleAt(23.399),0);assert.equal(settleAt(23.4),1);assert.equal(settleAt(23.401),1);const rtlAt=(u,x)=>{const d=(1-x)*0.62,lin=Math.max(0,Math.min(1,(u*1.72-d)/0.44));return lin*lin*(3-2*lin);};assert.equal(rtlAt(0,1),0);assert.equal(rtlAt(0,0),0);assert.ok(rtlAt(0.28,1)>rtlAt(0.28,0.5)&&rtlAt(0.28,0.5)>rtlAt(0.28,0),'clouds fade in from right (x=1) to left (x=0)');assert.equal(rtlAt(1,1),1);assert.equal(rtlAt(1,0),1);const horizonRelSecTop=(rtl,w)=>{const pScale=0.18+0.82*Math.pow(rtl,0.72),hid=88-w*0.10,full=-124-w*0.88*pScale;return hid+(full-hid)*rtl;};for(const w of [-76,-40,0,40,76]){assert.ok(horizonRelSecTop(0,w)>75,'clouds stay completely below 100dvh Hero during video');assert.ok(horizonRelSecTop(1,w)<-55,'clouds rise up into bottom of Hero after video');}}finally{await new Promise(r=>server.close(r));}});
test('public evidence excludes private corpus files, exact load windows and financial scale',()=>{const json=JSON.stringify({evidence,twin});assert.doesNotMatch(json,/knowledge\/|libfile_|4[–-]8 a\.m|30,000|100 million|300,000|\$60 million/);assert.doesNotMatch(text,/<strong>\$\{cat\.pct\}%<\/strong>/);});
test('page load and frame-pacing optimizations gate hidden loops, lazy-load below-fold media, optimize cloud FBM and prevent scroll-jacking',()=>{
  const avatarJs=fs.readFileSync(path.join(root,'dist/josh-3d-avatar.js'),'utf8');
  const tycoonJs=fs.readFileSync(path.join(root,'dist/automation-tycoon-app.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'dist/architect-workbench.css'),'utf8');
  assert.match(avatarJs,/function\s+isAvatarStageVisible\s*\(\)/);
  assert.match(avatarJs,/function\s+ensureAvatarActive\s*\(\)/);
  assert.match(avatarJs,/if\s*\(!isAvatarStageVisible\(\)\s*&&\s*rigState\.mode\s*!==\s*'speaking'\)/);
  assert.match(tycoonJs,/function\s+isGameCanvasActive\s*\(\)/);
  assert.match(tycoonJs,/function\s+ensureSpritesLoaded\s*\(\)/);
  assert.match(tycoonJs,/if\s*\(!isGameCanvasActive\(\)\)\s*\{\s*animId\s*=\s*null;\s*return;\s*\}/);
  assert.match(text,/vec3\s+sampleSoftCloudFBMFast\s*\(/);
  assert.match(text,/vec3\s+fbmSunFar\s*=\s*sampleSoftCloudFBMFast\(/);
  assert.match(text,/vec3\s+fbmSunNear\s*=\s*sampleSoftCloudFBMFast\(/);
  assert.match(text,/vec3\s+fbmZenith\s*=\s*sampleSoftCloudFBMFast\(/);
  assert.match(text,/Math\.min\(window\.devicePixelRatio\s*\|\|\s*1,\s*0\.85\)/);
  assert.match(text,/if\s*\(!el\s*\|\|\s*el\.closest\("\[hidden\]"\)\)\s*return;/);
  assert.match(text,/if\s*\(!stageEl\s*\|\|\s*stageEl\.hidden\s*\|\|\s*stageEl\.closest\("\[hidden\]"\)\s*\|\|\s*stageEl\.classList\.contains\("is-dragging"\)\)\s*return;/);
  for(const imgAsset of ['assets/optimized/proj-banner-renewals-1376.webp','assets/builds/fw-nexus-bg.png','assets/builds/fw-broker-bg.png','assets/optimized-extra/home-level-clouds-1600.webp','assets/optimized-extra/home-level-business-1600.webp','assets/optimized/personal/josh-curiosity-child-tinkering-1024.webp','assets/optimized/personal/josh-curiosity-ai-orchestration-1024.webp','assets/optimized-extra/home-level-metal-1600.webp','assets/optimized-extra/tycoon/easter-egg-retro-thumb-1024.webp']){
    const esc=imgAsset.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    assert.match(text,new RegExp(`<img[^>]*src="${esc}"[^>]*loading="lazy"[^>]*decoding="async"`),`below-fold image ${imgAsset} must have loading="lazy" decoding="async"`);
  }
  assert.doesNotMatch(text,/skills-hero-art-(light|dark)\.png/);
  assert.doesNotMatch(text,/class="about-bottom-story-bar"|id="home-about-drawer"|<header class="about-hero">/);
  assert.doesNotMatch(text,/setTimeout\(evaluateSectionIndentSettle/);
  assert.doesNotMatch(text,/setProperty\("--cloud-glide-shift"/);
  assert.match(css,/content-visibility:\s*auto/);
});
test('mobile and tablet responsive rules align Hero copy top-left, shift Hero building right, and adapt Sections 01-06 without overflow',()=>{
  const css=fs.readFileSync(path.join(root,'dist/architect-workbench.css'),'utf8');
  const crCss=fs.readFileSync(path.join(root,'dist/career-reference.css'),'utf8');
  const r17Idx=css.indexOf('R17–R19: BUILDS SECTION');
  const r21Idx=css.indexOf('R21–R23: SKILLS & CAPABILITIES SECTION');
  const typoBlockIdx=css.indexOf('/* Unified section header and subheading typography');
  const respIdx=css.indexOf('/* Mobile and Tablet Responsive Layout Adjustments (Sections 01 - 06) */');
  assert.ok(typoBlockIdx>r17Idx&&typoBlockIdx>r21Idx,'unified typography block must appear after R17-R19 and R21-R23 at the true end of architect-workbench.css');
  assert.ok(respIdx>typoBlockIdx,'responsive layout adjustments block must appear at the true end of architect-workbench.css');
  const respCss=css.slice(respIdx);
  const mobileIdx=respCss.indexOf('MOBILE BREAKPOINT (max-width: 768px)');
  assert.ok(mobileIdx>0,'mobile breakpoint section must exist inside responsive layout adjustments block');
  const tabletCss=respCss.slice(0,mobileIdx);
  const mobileCss=respCss.slice(mobileIdx);
  // R1: Hero vertical center alignment across Desktop, Tablet, and Mobile + no right-shifted video gap + iPad scale
  assert.match(respCss,/\/\* Desktop Vertical Rhythm & Hero Center Alignment \(min-width: 1181px\) \*\//);
  assert.match(tabletCss,/@media\s*\(min-width:\s*769px\)\s*and\s*\(max-width:\s*1180px\)/);
  assert.match(tabletCss,/\.career-hero\.wrap\s*\{[^}]*align-items:\s*center\s*!important/);
  assert.doesNotMatch(tabletCss,/\.career-hero\.wrap\s*\{[^}]*align-items:\s*flex-start\s*!important/);
  assert.doesNotMatch(respCss,/translateX\(/);
  assert.match(tabletCss,/\.home-hero-video-player\s*\{[^}]*object-position:\s*64%\s+center\s*!important;[^}]*transform:\s*none\s*!important/);
  assert.match(tabletCss,/\.hero-copy-col\s*\{[^}]*max-width:\s*min\(680px,\s*76vw\)\s*!important/);
  assert.match(tabletCss,/\.hero-tier-badge\s*\{[^}]*width:\s*clamp\(80px,\s*8\.8vw,\s*92px\)\s*!important/);
  assert.match(tabletCss,/\.hero-tier-connector\s*\{[^}]*height:\s*64px\s*!important/);
  assert.match(tabletCss,/\.hero-tier-kicker\s*\{[^}]*font-size:\s*clamp\(1\.6rem,\s*2\.35vw,\s*2\.25rem\)\s*!important/);
  assert.match(tabletCss,/\.hero-tier-main\s*\{[^}]*font-size:\s*clamp\(3\.05rem,\s*4\.5vw,\s*4\.25rem\)\s*!important/);
  assert.match(tabletCss,/\.hero-lead\s*\{[^}]*font-size:\s*clamp\(1\.08rem,\s*1\.35vw,\s*1\.28rem\)\s*!important/);
  assert.match(tabletCss,/\[data-home-watch-story\]\s*\{[^}]*height:\s*52px\s*!important/);
  assert.match(mobileCss,/justify-content:\s*center\s*!important/);
  assert.doesNotMatch(mobileCss,/justify-content:\s*flex-end/);
  assert.doesNotMatch(mobileCss,/justify-content:\s*flex-start/);
  assert.match(mobileCss,/padding-top:\s*calc\(var\(--rhythm-header-h-mobile,\s*56px\)\s*\+\s*16px\)\s*!important/);
  assert.match(mobileCss,/padding-bottom:\s*108px\s*!important/);
  assert.match(mobileCss,/\.hero-tier-connector\s*\{[^}]*height:\s*26px\s*!important/);
  assert.match(mobileCss,/\.home-hero-video-player\s*\{[^}]*object-position:\s*center\s+18%\s*!important;[^}]*transform:\s*none\s*!important/);
  assert.match(respCss,/section\[data-page="home"\]\s+#home-featured-projects\s+\.home-featured-work-section\s*\{[^}]*padding:\s*52px\s+0\s+88px\s*!important/);
  assert.match(respCss,/#home-skills-section\.home-sum-skills\s*\{[^}]*padding:\s*64px\s+0\s+68px\s*!important/);
  // R2: Section 02 Featured Work & Explore All Builds tablet/mobile rules
  assert.match(tabletCss,/#home-featured-projects\s+\.home-featured-work-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)\s*!important/);
  assert.match(tabletCss,/#home-featured-projects\s+\.eb-cards-strip\s*\{[^}]*grid-auto-columns:\s*calc\(\(100%\s*-\s*\(2\s*\*\s*10px\)\)\s*\/\s*3\.15\)\s*!important/);
  assert.match(mobileCss,/#home-featured-projects\s+\.eb-cards-strip\s*\{[^}]*grid-auto-columns:\s*minmax\(210px,\s*72vw\)\s*!important/);
  assert.match(mobileCss,/#home-featured-projects\s+\.eb-header-right\s*\{[^}]*width:\s*100%\s*!important;[^}]*justify-content:\s*space-between\s*!important/);
  assert.match(mobileCss,/#home-featured-projects\s+\.eb-filter-divider\s*\{[^}]*display:\s*none\s*!important/);
  assert.match(mobileCss,/#home-featured-projects\s+\.eb-strip-floating-next\s*\{[^}]*right:\s*4px\s*!important/);
  assert.match(mobileCss,/#home-featured-projects\s+\.eb-card-cat-pill,\s*#home-featured-projects\s+\.eb-card-status-text\s*\{[^}]*text-overflow:\s*ellipsis\s*!important/);
  assert.match(mobileCss,/#home-featured-projects\s+\.home-fw-secondary-card\s*\{[^}]*height:\s*auto\s*!important;[^}]*min-height:\s*224px\s*!important/);
  assert.match(mobileCss,/#home-featured-projects\s+\.eb-preview-top-bar\s*\{[^}]*flex-direction:\s*column\s*!important/);
  assert.match(mobileCss,/#home-featured-projects\s+\.eb-preview-counter\s*\{[^}]*white-space:\s*nowrap\s*!important/);
  assert.match(mobileCss,/#home-featured-projects\s+\.eb-case-study-btn\s*\{[^}]*white-space:\s*nowrap\s*!important/);
  assert.match(respCss,/#home-featured-projects\s+\.fw-secondary-media\s+img\s*\{[^}]*object-fit:\s*cover\s*!important/);
  assert.match(respCss,/#home-featured-projects\s+\.eb-preview-quad-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)\s*!important/);
  assert.match(mobileCss,/#home-featured-projects\s+\.fw-primary-copy\b/);
  // R3: Section 03 Career Journey mobile/tablet rules
  assert.match(crCss,/\.cr-tags\s*\{[^}]*flex-wrap:\s*wrap/);
  assert.match(respCss,/#home-career-section\s+\.cr-tags\s*\{[^}]*flex-wrap:\s*wrap\s*!important/);
  assert.match(tabletCss,/#home-career-section\s+\.cr-chapter-cards\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)\s*!important/);
  assert.match(mobileCss,/#home-career-section\s+\.cr-metrics\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)\s*!important/);
  assert.match(mobileCss,/#home-career-section\s+\.cr-impact\s*\{[^}]*grid-template-columns:\s*1fr\s*!important/);
  // R4: Section 04 Skills 3D capability stack & inspector mobile/tablet fit (matching >= (1,4,0) specificity + v2 stack)
  assert.match(respCss,/#home-skills-section\s+\.sk-callout-connector-bridge\s*\{[^}]*display:\s*none\s*!important/);
  assert.match(tabletCss,/#home-skills-section\s+\.cap-stack-widget\.is-v2-stack\s*\{[^}]*height:\s*300px\s*!important;[^}]*min-height:\s*300px\s*!important/);
  assert.match(tabletCss,/#home-skills-section\s+\.cap-stack-widget\.is-v2-stack\s+\.sk-stack-3d-art-col\s*\{[^}]*width:\s*100%\s*!important;[^}]*height:\s*300px\s*!important/);
  assert.match(mobileCss,/#home-skills-section\s+\.cap-stack-widget\.is-home-stack\.is-pixel-mockup:not\(\.is-v2-stack\)\s+\.sk-layer-hit-slab\s*\{[^}]*width:\s*128px\s*!important/);
  assert.match(mobileCss,/#home-skills-section\s+\.cap-stack-widget\.is-home-stack\.is-pixel-mockup\s+\.cap-stack-callout-title\s*\{[^}]*white-space:\s*normal\s*!important/);
  assert.match(mobileCss,/#home-skills-section\s+\.cap-stack-widget\.is-home-stack\.is-pixel-mockup\s+\.cap-stack-callout-sub\s*\{[^}]*white-space:\s*normal\s*!important/);
  assert.match(mobileCss,/#home-skills-section\s+\.sk-detail-approach-col,\s*#home-skills-section\s+\.sk-approach-col\s*\{[^}]*border-right:\s*none\s*!important/);
  assert.match(mobileCss,/#home-skills-section\s+\.sk-tech-inv-head-right\s*\{[^}]*flex-wrap:\s*wrap\s*!important/);
  assert.match(mobileCss,/#home-skills-section\s+\.sk-inspector-head\b/);
  assert.match(respCss,/#home-skills-section\s+\.sk-inspector-subtabs\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)\s*!important/);
  // R5: Section 05 About Josh tablet 3-col pillars & mobile sticky note containment + story subtabs wrap
  assert.match(respCss,/#home-about-section\s+\.about-pillars-list\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)\s*!important/);
  assert.match(tabletCss,/#home-about-section\s+\.about-pillar-item\b/);
  assert.match(tabletCss,/section\[data-page="home"\]\s+#home-about-section\s+#home-about-drawer\[open\]\s*\{[^}]*margin-top:\s*20px\s*!important/);
  assert.match(mobileCss,/section\[data-page="home"\]\s+#home-about-section\s+#home-about-drawer\[open\]\s*\{[^}]*margin-top:\s*18px\s*!important/);
  assert.match(respCss,/#home-about-section\s+\.about-sticky-note\.is-then\s*\{[^}]*left:\s*-4px\s*!important/);
  assert.match(respCss,/#home-about-section\s+\.about-sticky-note\.is-now\s*\{[^}]*right:\s*-4px\s*!important/);
  assert.match(mobileCss,/\.about-page-workbench\.is-pixel-mockup\s+\.about-hero-stat-item\s*\{[^}]*border-right:\s*none\s*!important/);
  assert.doesNotMatch(text,/<section class="about-my-story-card"/);
  assert.doesNotMatch(text,/<div class="about-details-accordion-list"/);
  assert.doesNotMatch(text,/<strong class="about-acc-title">(Current focus|What I'm looking for|How I work|Outside of work)<\/strong>/);
  // R7: Header search removed, #primary-nav border/background removed and recentered, Hero Watch the Journey borderless
  assert.doesNotMatch(text,/cmdTriggerBtn\s*=\s*document\.createElement\("button"\)/);
  assert.doesNotMatch(text,/Search projects, skills, or ideas\.\.\./);
  assert.match(css,/\.site-header\s+\.cmd-palette-btn,\s*\.site-header\s+\[data-cmd-open\]\s*\{[^}]*display:\s*none\s*!important/);
  assert.match(css,/\.site-header\s+#primary-nav,\s*body\[data-active-route\]\s+\.site-header\s+#primary-nav\s*\{[^}]*position:\s*absolute\s*!important;[^}]*left:\s*50%\s*!important;[^}]*transform:\s*translateX\(-50%\)\s*!important;[^}]*background:\s*transparent\s*!important;[^}]*border:\s*none\s*!important;[^}]*box-shadow:\s*none\s*!important/);
  assert.match(text,/<span class="hero-watch-label" data-home-watch-label>Watch the Journey<\/span>/);
  assert.doesNotMatch(text,/>Watch overview</i);
  const tailHeroCss=css.slice(css.lastIndexOf('/* Hero slogan:'));
  assert.match(tailHeroCss,/\.hero-btn-secondary\s*\{[^}]*border-radius:\s*999px\s*!important;[^}]*background:\s*transparent\s*!important;[^}]*border:\s*none\s*!important;[^}]*box-shadow:\s*none\s*!important/);
  // R6: Section 06 Let's Connect mobile easter egg card & form layout
  assert.match(respCss,/#home-connect\s+\.home-easter-egg-card\s*\{[^}]*grid-template-columns:\s*112px\s+1fr\s*!important/);
  assert.match(respCss,/#home-connect\s+\.home-connect-form-row\s*\{[^}]*grid-template-columns:\s*1fr\s*!important/);
  assert.match(mobileCss,/#home-connect\s+\.home-connect-form-tabs\s+\.connect-tab-btn\b/);
  assert.match(mobileCss,/#home-connect\s+\.easter-copy\b/);
});

test('Mega Footer replaces game footer with panoramic banner, 4-column matrix with real Featured Projects, inline Let\'s Connect form, motto strip, and bottom horizon bar', () => {
  const js = fs.readFileSync(path.join(root, 'dist/architect-workbench.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'dist/architect-workbench.css'), 'utf8');
  const bannerPath = path.join(root, 'dist/assets/optimized/footer-panorama-bg-1376.webp');

  // 1. Game footer injection removed from architect-workbench.js
  assert.doesNotMatch(js, /footerScript\.src\s*=\s*"footer-journey\.js"/);
  assert.doesNotMatch(js, /footerStyle\.href\s*=\s*"footer-journey\.css"/);

  // 2. Panoramic banner asset exists and is wired
  assert.ok(fs.existsSync(bannerPath), 'dist/assets/optimized/footer-panorama-bg-1376.webp must exist');
  assert.ok(fs.statSync(bannerPath).size > 50000, 'footer-panorama-bg.jpg must be a non-empty JPEG asset');
  assert.match(js, /assets\/optimized\/footer-panorama-bg-1376\.webp/);
  assert.match(js, /FROM THE METAL TO THE CLOUDS/);
  assert.match(js, /The tools change\./);
  assert.match(js, /The ability to solve problems/);
  assert.match(js, /carries forward\./);

  // 3. All 4 column titles exist in order: EXPLORE, FEATURED PROJECTS, CAPABILITIES, LET'S CONNECT
  const colTitles = ['EXPLORE', 'FEATURED PROJECTS', 'CAPABILITIES', 'LET&rsquo;S CONNECT'];
  let prevIdx = -1;
  for (const title of colTitles) {
    const idx = js.indexOf(`<h3 class="jb-footer-col__title">${title}</h3>`);
    assert.ok(idx > prevIdx, `Column title ${title} must exist in order`);
    prevIdx = idx;
  }

  // 4. Featured Projects use real existing portfolio builds (NEXUS, Renewal Eligibility & Automation, Takeover-History XML Loading) and no fake Insurance/Underwriting Workbench
  assert.match(js, /<strong class="jb-fp-card__title">NEXUS<\/strong>/);
  assert.match(js, /<strong class="jb-fp-card__title">Renewal Eligibility &amp; Automation<\/strong>/);
  assert.match(js, /<strong class="jb-fp-card__title">Takeover-History XML Loading<\/strong>/);
  assert.doesNotMatch(js, /<strong class="jb-fp-card__title">Insurance Workbench<\/strong>/);
  assert.doesNotMatch(js, /Underwriting Workbench/i);
  assert.doesNotMatch(js, /<strong class="jb-fp-card__title">Automation Lab<\/strong>/);

  // 5. Contact form is inline inside the 4th column (.jb-footer-col--connect / .jb-inline-connect-card) with no separate #home-connect-modal section
  assert.match(js, /<div class="jb-footer-col jb-footer-col--connect">[\s\S]*?<form class="home-connect-form-card jb-inline-contact-form" id="home-connect-form" data-home-contact-form data-contact-delivery="api" novalidate>/);
  assert.match(js, /data-contact-topic-select/);
  assert.doesNotMatch(js, /id="home-connect-modal"/);

  // 6. Motto strip and bottom horizon bar rules exist
  assert.match(js, /REAL PROBLEMS/);
  assert.match(js, /PRACTICAL SOLUTIONS/);
  assert.match(js, /A MORE CAPABLE TOMORROW/);
  assert.match(css, /#home-connect\.home-sum-connect\.jb-mega-footer/);
  assert.match(css, /\.jb-footer-columns-grid/);
  assert.match(css, /\.jb-inline-connect-card/);

  // 6. Expanded About Josh section sizing rules exist
  assert.match(css, /#home-about-section\s+\.home-sum-about-cinematic-layout\s*\{[^}]*max-width:\s*1780px\s*!important;\s*width:\s*min\(96vw,\s*1780px\)\s*!important/);
  assert.match(css, /#home-about-section\s+\.about-prog-photo\.is-tilted-left\s*\{[^}]*width:\s*clamp\(275px,\s*20\.6vw,\s*344px\)\s*!important;\s*height:\s*clamp\(294px,\s*22\.2vw,\s*368px\)\s*!important/);
  assert.match(css, /#home-about-section\s+\.about-prog-photo\.is-tilted-right\s*\{[^}]*width:\s*clamp\(288px,\s*21\.6vw,\s*358px\)\s*!important;\s*height:\s*clamp\(302px,\s*23\.0vw,\s*378px\)\s*!important/);
  assert.match(css, /#home-about-section\s+\.about-evolution-stepper\s*\{[^}]*max-width:\s*1260px\s*!important/);

  // 7. Skills & Capabilities V5 radial hub-and-spoke showcase, mountain horizon background, transparent JB logo, 3 metric cards, and 6 domain cards
  const mountainBgPath = path.join(root, 'dist/assets/optimized-extra/skills-mountain-horizon-bg-1376.webp');
  const jbLogoPath = path.join(root, 'dist/assets/optimized/jb-logo-transparent-664.webp');
  assert.ok(fs.existsSync(mountainBgPath) && fs.statSync(mountainBgPath).size > 1000, 'dist/assets/optimized-extra/skills-mountain-horizon-bg-1376.webp must exist');
  assert.ok(fs.existsSync(jbLogoPath) && fs.statSync(jbLogoPath).size > 10000, 'dist/assets/optimized/jb-logo-transparent-664.webp must exist');
  assert.match(css, /url\("assets\/optimized-extra\/skills-mountain-horizon-bg-1376\.webp"\)/);
  assert.match(js, /<img class="sk-v5-jb-logo" src="assets\/optimized\/jb-logo-transparent-664\.webp" alt="JB Monogram" loading="lazy" decoding="async">/);
  assert.match(js, /<span class="sk-v5-title-line1">20 years of experience\.<\/span>/);
  assert.match(js, /<span class="sk-v5-title-line2">Connected\.\s*<em class="sk-v5-amplified">Amplified\.<\/em>\s*Expanding\.<\/span>/);
  assert.match(js, /<strong class="sk-v5-metric-val is-white">Real-world<\/strong>/);
  assert.match(js, /<span class="sk-v5-metric-label">Solutions that scale<\/span>/);
  for (const domainTitle of ['Business', 'Method &amp; Process', 'Integration &amp; Data', 'Infrastructure', 'AI &amp; Automation', 'Development &amp; Tooling']) {
    assert.ok(js.includes(`<h3 class="sk-v5-domain-title">${domainTitle}</h3>`), `Domain card ${domainTitle} must exist in V5 Skills showcase`);
  }
  for (const pill of [
    'Commercial P&amp;C', 'Underwriting', 'Renewals', 'Endorsements', 'CSIO / ACORD', 'Business Rules',
    'Requirements', 'Architecture', 'Project Management', 'ITSM', 'Change Management', 'Validation &amp; Testing',
    'REST / API', 'SOAP', 'SQL', 'XML / JSON', 'ETL / Data Mapping', 'Broker Systems',
    'Windows Server', 'VMware', 'Networking', 'Cloud Platforms', 'Monitoring', 'Security',
    'Model Routing', 'RAG / CAG', 'MCP Integrations', 'Agent Workflows', 'Evaluations &amp; Tracing', 'Prompt Engineering',
    'C# / .NET', 'TypeScript', 'Python', 'Git / GitHub', 'CI / CD', 'Docker'
  ]) {
    assert.ok(js.includes(`>${pill}</span>`), `Capability pill ${pill} must exist in V5 Skills showcase`);
  }
  assert.match(
    css,
    /#home-skills-section\s+\.compact-skills-showcase\.is-unified-system\.is-skills-v3-mockup\.is-skills-v4-mockup\.is-skills-v5-mockup[\s\S]*?max-width:\s*1460px\s*!important;\s*width:\s*calc\(100%\s*-\s*clamp\(96px,\s*9vw,\s*168px\)\)\s*!important;\s*margin:\s*0\s+auto\s*!important/,
    'V5 Skills & Capabilities showcase must have high-specificity horizontal gutters and neutral vertical margins'
  );
});

test('Builds section preserves project content with simplified category-only controls', () => {
  const js = fs.readFileSync(path.join(root, 'dist/architect-workbench.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'dist/architect-workbench.css'), 'utf8');

  // R1: Top intro column two-tone heading, updated lead copy, mountain graphic, and hidden CTA pill
  assert.match(js, /<span class="fw-heading-dark">Real problems\.<\/span>/);
  assert.match(js, /<span class="fw-heading-blue">Practical solutions\.<\/span>/);
  assert.match(js, /From business requirements to working systems across insurance, infrastructure and AI\./);
  assert.doesNotMatch(js, /src="assets\/builds\/fw-intro-mountain\.png"/);
  assert.match(css, /#home-featured-projects\s+\.home-fw-intro-col\s+#home-sum-proj-heading\.home-fw-heading\s+span\.fw-heading-blue[\s\S]*?color:\s*#1d4ed8\s*!important/);

  // R2: 3 Featured cards with glowing icon badges (amber briefcase, purple AI chip, cyan database) & updated titles/descriptions
  assert.match(js, /src="assets\/builds\/fw-renewals-bg\.png"/);
  assert.match(js, /class="fw-card-icon-badge is-amber"/);
  assert.match(js, /class="fw-card-icon-badge is-purple"/);
  assert.match(js, /class="fw-card-icon-badge is-cyan"/);
  assert.match(js, /<h3 class="fw-primary-title fw-secondary-title">Renewal Automation<\/h3>/);
  assert.match(js, /Automated renewal decisions using business rules and data validation\./);
  assert.match(js, /<h3 class="fw-secondary-title">NEXUS Platform<\/h3>/);
  assert.match(js, /Independent AI orchestration platform for real-world work\./);
  assert.match(js, /<h3 class="fw-secondary-title">Broker Integration<\/h3>/);

  // R3: Explore builds header title, working search input, filter icon button, and sort select
  assert.match(js, /<h3 class="eb-title">Explore builds<\/h3>/);
  assert.doesNotMatch(js, /placeholder="Search projects\.\.\."\s+data-eb-search/);
  assert.doesNotMatch(js, /class="eb-filter-icon-btn"\s+data-eb-filter-reset/);

  // R4: Mini-card top-left category pill, title-case Implemented status, and Policy-Change Validation & Comparison / Pilot card
  assert.match(js, /cardTitle:\s*"Policy-Change Validation & Comparison"/);
  assert.match(js, /statusLabel:\s*"Pilot"/);
  assert.match(css, /#home-featured-projects\s+\.eb-card-cat-pill\s*\{[^}]*top:\s*8px\s*!important;[^}]*left:\s*8px\s*!important/);

  // R5: Preview panel full-height image with top-left cyan database badge & 4 pastel circular icon quad cards (Problem, My role, Solution, Outcome)
  assert.match(js, /class="eb-preview-icon-badge is-cyan"/);
  assert.match(js, /icon:\s*"doc",\s*theme:\s*"pink",\s*title:\s*"Problem",\s*desc:\s*"Inconsistent broker data and manual validation across vendors\."/);
  assert.match(js, /icon:\s*"user",\s*theme:\s*"blue",\s*title:\s*"My role",\s*desc:\s*"Requirements, architecture, integration and delivery\."/);
  assert.match(js, /icon:\s*"gear",\s*theme:\s*"purple",\s*title:\s*"Solution",\s*desc:\s*"Mapped fields, implemented rules, UI workflow and two-way integration\."/);
  assert.match(js, /icon:\s*"chart",\s*theme:\s*"green",\s*title:\s*"Outcome",\s*desc:\s*"Improved data accuracy, faster turnaround, and reduced manual work\."/);
  assert.match(css, /#home-featured-projects\s+\.eb-quad-icon-badge\s*\{[^}]*border-radius:\s*50%\s*!important/);

  // R6: Wordmark dot 5-second rotation between metal (grey), business (yellow), and cloud (blue) + 3-point time boundaries
  assert.match(css, /@keyframes\s+jb-wordmark-dot-cycle/);
  assert.match(css, /\.site-header\s+\.wordmark\s+span\[data-dot-phase="metal"\]/);
  assert.match(css, /\.site-header\s+\.wordmark\s+span\[data-dot-phase="business"\]/);
  assert.match(css, /\.site-header\s+\.wordmark\s+span\[data-dot-phase="cloud"\]/);
  assert.match(js, /const\s+WORDMARK_DOT_PHASES\s*=\s*Object\.freeze\(\[\s*\{\s*phase:\s*"metal",\s*color:\s*"#b4c2d8"/);
  assert.match(js, /\{\s*phase:\s*"business",\s*color:\s*"#f4c542"/);
  assert.match(js, /\{\s*phase:\s*"cloud",\s*color:\s*"#38bdf8"/);
  assert.match(js, /const\s+STEP_MS\s*=\s*5000;/);

  const phases = ['metal', 'business', 'cloud'];
  const getPhase = ms => {
    const safeMs = Number.isFinite(ms) && ms >= 0 ? ms : 0;
    return phases[Math.floor(safeMs / 5000) % phases.length];
  };
  // 3-point time boundaries at 5000ms, 10000ms, and 15000ms + hostile inputs
  assert.equal(getPhase(4999), 'metal');
  assert.equal(getPhase(5000), 'business');
  assert.equal(getPhase(5001), 'business');
  assert.equal(getPhase(9999), 'business');
  assert.equal(getPhase(10000), 'cloud');
  assert.equal(getPhase(10001), 'cloud');
  assert.equal(getPhase(14999), 'cloud');
  assert.equal(getPhase(15000), 'metal');
  assert.equal(getPhase(15001), 'metal');
  assert.equal(getPhase(-100), 'metal');
  assert.equal(getPhase(NaN), 'metal');

  // R7: NEXUS 3D folded-N logo wired across Featured Builds, Explore Builds, Mega Footer, Career Timeline, Project Detail, and site images
  assert.match(js, /class="fw-nexus-badge-logo"/);
  assert.match(js, /class="eb-preview-nexus-logo"/);
  assert.match(js, /class="jb-fp-card__nexus-logo"/);
  assert.match(js, /class="jb-explore-nexus-logo"/);
  assert.match(js, /class="career-nexus-logo-img"/);
  assert.match(js, /class="proj-org-nexus-logo"/);
  assert.match(css, /img\.jb-fp-card__nexus-logo/);
  assert.match(css, /img\.fw-nexus-badge-logo/);
  for (const relImg of [
    'dist/assets/optimized/nexus-mark-128.webp',
    'dist/assets/builds/fw-nexus-bg.png',
    'dist/assets/builds/fw-nexus-card.png',
    'dist/assets/builds/card-thumb-nexus.png',
    'dist/assets/builds/skill-featured-nexus.png',
    'dist/assets/optimized-extra/proj-banner-nexus-1376.webp',
    'dist/assets/personal/about-work-thumb-nexus.png',
    'dist/assets/builds/skills-hero-art-dark.png',
    'dist/assets/builds/skills-hero-art-light.png',
    'dist/assets/footer-game/bg-ailab.jpg',
    'dist/assets/footer-game/bg-helpdesk.jpg',
    'dist/assets/footer-game/bg-datacenter.jpg',
    'dist/assets/footer-game/bg-mission-complete.jpg'
  ]) {
    const absImg = path.join(root, relImg);
    assert.ok(fs.existsSync(absImg) && fs.statSync(absImg).size > 2000, `${relImg} must exist and be non-empty`);
  }

  // R8: Homepage contains zero active links to legacy pages (resume.html, career-guide.html, or separate #project-detail page)
  for (const relFile of [
    'dist/index.html',
    'dist/app.js',
    'dist/architect-workbench.js',
    'dist/career-reference.js',
    'dist/twin-drawer.js'
  ]) {
    const src = fs.readFileSync(path.join(root, relFile), 'utf8');
    assert.doesNotMatch(src, /resume\.html|career-guide\.html/i, `${relFile} must not link or redirect to legacy .html pages`);
  }
  const appSrc = fs.readFileSync(path.join(root, 'dist/app.js'), 'utf8');
  assert.match(appSrc, /detail\.hidden\s*=\s*true;/);
  assert.doesNotMatch(appSrc, /detail\.hidden\s*=\s*false/);
  assert.doesNotMatch(js, /routeMode\s*=\s*"project-detail"/);
  assert.match(js, /const\s+homeProjLinkEl\s*=\s*target\.closest\("\[data-proj-link\],\s*\[data-home-select-build\],\s*a\[href\^='#projects\/'\]"\)/);
});
