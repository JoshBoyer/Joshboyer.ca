'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const repo = process.env.PORTFOLIO_TEST_REPO || path.resolve(__dirname, '..');
const hero = require(path.join(repo, 'dist/hero-media-loading.js'));
const splash = require(path.join(repo, 'dist/loading-splash.js'));
const settle = () => new Promise(resolve => setImmediate(resolve));

function events(fields = {}) {
  return Object.assign(new EventTarget(), fields);
}
function heroFixture({ connection = {}, fallbackTimer = false, decode } = {}) {
  let sequence = 0, loads = 0, plays = 0;
  const pending = new Map(), cancelled = [], attrs = new Map([['data-story-src', 'portrait.mp4']]);
  const video = { getAttribute: key => attrs.get(key) || null, setAttribute: (key, value) => attrs.set(key, value), load() { loads++; }, play() { plays++; } };
  const stage = {};
  const image = events({ complete: true, naturalWidth: 390, closest: () => stage, decode: decode || (() => Promise.resolve()) });
  const doc = events({ readyState: 'complete', visibilityState: 'visible', querySelector: () => null });
  const motion = events({ matches: false });
  const conn = events(connection);
  const queue = fn => { const id = ++sequence; pending.set(id, fn); return id; };
  const cancel = id => { cancelled.push(id); pending.delete(id); };
  let observer;
  class Observer {
    constructor(callback) { this.callback = callback; this.disconnects = 0; observer = this; }
    observe(target) { this.target = target; }
    disconnect() { this.disconnects++; }
    intersect(visible) { this.callback([{ target: this.target, isIntersecting: visible }]); }
  }
  const win = events({ navigator: { connection: conn }, matchMedia: () => motion, IntersectionObserver: Observer, setTimeout: queue, clearTimeout: cancel });
  if (!fallbackTimer) Object.assign(win, { requestIdleCallback: queue, cancelIdleCallback: cancel });
  const controller = hero.create({ video, image, window: win, document: doc });
  return { controller, observer, win, doc, motion, conn, pending, cancelled, attrs, video,
    counts: () => ({ loads, plays }),
    runPending() { for (const [id, callback] of [...pending]) { pending.delete(id); callback(); } }
  };
}

for (const fallbackTimer of [false, true]) {
  test(`leaving hero cancels ${fallbackTimer ? 'timer' : 'idle'} warming; reentry resumes once`, async () => {
    const f = heroFixture({ fallbackTimer });
    await settle();
    assert.equal(f.pending.size, 0, 'initial unobserved/offscreen hero must not download');
    f.observer.intersect(true);
    assert.equal(f.pending.size, 1);
    const staleWork = [...f.pending.values()][0];
    f.observer.intersect(false);
    assert.equal(f.pending.size, 0);
    assert.equal(f.cancelled.length, 1);
    staleWork(); // Even a callback already handed to the scheduler must respect current visibility.
    assert.deepEqual(f.counts(), { loads: 0, plays: 0 });
    assert.equal(f.attrs.has('src'), false);
    f.observer.intersect(true);
    f.observer.intersect(true);
    assert.equal(f.pending.size, 1, 'repeated intersection notifications must not duplicate warming');
    f.runPending();
    assert.deepEqual(f.counts(), { loads: 1, plays: 0 });
    assert.equal(f.video.preload, 'metadata');
    f.controller.dispose();
  });
}

test('explicit Watch acquires selected media offscreen despite Save-Data, without autoplay', async () => {
  const f = heroFixture({ connection: { saveData: true, effectiveType: '3g', downlink: 1 } });
  await settle();
  assert.equal(f.pending.size, 0);
  assert.equal(f.attrs.has('src'), false);
  assert.equal(f.controller.request(), f.video);
  assert.equal(f.attrs.get('src'), 'portrait.mp4');
  assert.equal(f.video.preload, 'auto');
  assert.deepEqual(f.counts(), { loads: 1, plays: 0 });
  f.observer.intersect(true);
  f.conn.saveData = false; f.conn.effectiveType = '4g'; f.conn.downlink = 10;
  f.conn.dispatchEvent(new Event('change'));
  await settle(); f.runPending();
  f.controller.request();
  assert.deepEqual(f.counts(), { loads: 1, plays: 0 }, 'explicit ownership must not be replaced or downloaded twice');
  f.controller.dispose();
});

test('explicit Watch cancels already scheduled background warming', async () => {
  const f = heroFixture();
  await settle(); f.observer.intersect(true);
  assert.equal(f.pending.size, 1);
  const staleWork = [...f.pending.values()][0];
  f.controller.request();
  assert.equal(f.pending.size, 0);
  staleWork();
  assert.equal(f.video.preload, 'auto');
  assert.deepEqual(f.counts(), { loads: 1, plays: 0 });
  f.controller.dispose();
});

test('dispose disconnects observation and prevents queued callbacks or later events warming media', async () => {
  const f = heroFixture();
  await settle(); f.observer.intersect(true);
  const staleWork = [...f.pending.values()][0];
  f.controller.dispose();
  assert.equal(f.observer.disconnects, 1);
  assert.equal(f.pending.size, 0);
  staleWork(); f.observer.intersect(true);
  for (const [target, type] of [[f.win, 'hashchange'], [f.doc, 'visibilitychange'], [f.doc, 'portfolio:intro-dismissed'], [f.conn, 'change'], [f.motion, 'change']]) target.dispatchEvent(new Event(type));
  await settle(); f.runPending();
  assert.deepEqual(f.counts(), { loads: 0, plays: 0 });
  assert.equal(f.attrs.has('src'), false);
});

test('pagehide disconnects the observer and a late poster decode cannot schedule warming', async () => {
  let resolveDecode;
  const f = heroFixture({ decode: () => new Promise(resolve => { resolveDecode = resolve; }) });
  f.observer.intersect(true);
  f.win.dispatchEvent(new Event('pagehide'));
  assert.equal(f.observer.disconnects, 1);
  resolveDecode(); await settle(); f.runPending();
  assert.equal(f.pending.size, 0);
  assert.deepEqual(f.counts(), { loads: 0, plays: 0 });
});

class Element extends EventTarget {
  constructor(tagName = 'DIV') { super(); Object.assign(this, { tagName, isConnected: true, open: false, attrs: new Map(), classList: { add() {} } }); }
  getAttribute(key) { return this.attrs.get(key) || null; }
  setAttribute(key, value) { this.attrs.set(key, value); }
  hasAttribute(key) { return this.attrs.has(key); }
  removeAttribute(key) { this.attrs.delete(key); }
  remove() { this.isConnected = false; }
  showModal() { this.open = true; }
  close() { this.open = false; this.dispatchEvent(new Event('close')); }
  focus() {}
  getClientRects() { return this.isConnected ? [{}] : []; }
}
function splashFixture({ connection = {}, hidden = false } = {}) {
  let plays = 0, acquisitions = 0, storageWrites = 0, sequence = 0;
  const scheduled = new Map(), values = new Map();
  const win = events({ location: { hash: '' }, navigator: { connection }, CustomEvent, setTimeout(fn) { scheduled.set(++sequence, fn); return sequence; }, clearTimeout(id) { scheduled.delete(id); }, requestAnimationFrame() {} });
  const body = new Element('BODY');
  const doc = events({ body, activeElement: body, visibilityState: hidden ? 'hidden' : 'visible', querySelectorAll: () => [], getElementById: () => null });
  const dialog = new Element('DIALOG'), video = new Element('VIDEO'), enter = new Element('BUTTON');
  video.setAttribute('data-splash-src', 'intro.mp4');
  Object.defineProperty(video, 'src', { set(value) { acquisitions++; video.setAttribute('src', value); }, get() { return video.getAttribute('src'); } });
  Object.assign(video, { play() { plays++; return Promise.resolve(); }, pause() {}, load() {} });
  const storage = { getItem: key => values.get(key), setItem(key, value) { storageWrites++; values.set(key, value); } };
  const controller = splash.create({ window: win, document: doc, dialog, video, enter, storage, motion: events({ matches: false }) });
  return { win, doc, dialog, video, values, scheduled, controller, counts: () => ({ plays, acquisitions, storageWrites }) };
}

test('known downlink through 1.5 Mbps skips splash without consuming first-visit eligibility', () => {
  for (const downlink of [0.1, 1, 1.5]) {
    const f = splashFixture({ connection: { effectiveType: '4g', downlink } });
    assert.equal(f.dialog.isConnected, false, `downlink=${downlink}`);
    assert.equal(f.controller.active(), false);
    assert.deepEqual(f.counts(), { plays: 0, acquisitions: 0, storageWrites: 0 });
    assert.equal(f.values.has(splash.SESSION_KEY), false);
    assert.equal(f.scheduled.size, 0);
  }
});

test('unknown or faster downlink preserves eligible introduction behavior', () => {
  for (const downlink of [undefined, 0, 1.5001]) {
    const f = splashFixture({ connection: { effectiveType: '4g', downlink } });
    assert.equal(f.dialog.open, true, `downlink=${downlink}`);
    assert.deepEqual(f.counts(), { plays: 1, acquisitions: 1, storageWrites: 1 });
    assert.equal(f.values.get(splash.SESSION_KEY), 'seen');
    f.win.dispatchEvent(new Event('pagehide'));
  }
});

test('initially hidden page never acquires or plays splash and leaves session unseen', () => {
  const f = splashFixture({ hidden: true, connection: { effectiveType: '4g', downlink: 10 } });
  assert.equal(f.dialog.isConnected, false);
  assert.deepEqual(f.counts(), { plays: 0, acquisitions: 0, storageWrites: 0 });
  assert.equal(f.values.has(splash.SESSION_KEY), false);
  assert.equal(f.scheduled.size, 0);
  f.doc.visibilityState = 'visible'; f.doc.dispatchEvent(new Event('visibilitychange'));
  assert.deepEqual(f.counts(), { plays: 0, acquisitions: 0, storageWrites: 0 }, 'becoming visible must not revive a discarded modal');
});
