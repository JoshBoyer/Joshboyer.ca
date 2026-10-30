'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { SESSION_KEY, LIMITS, shouldShow, create } = require('../dist/loading-splash.js');

class Element extends EventTarget {
  constructor(tag = 'DIV') { super(); this.tagName = tag; this.attributes = new Map(); this.isConnected = true; this.open = false; this.classes = new Set(); this.classList = { add: name => this.classes.add(name) }; }
  getAttribute(name) { return this.attributes.get(name) || null; }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  hasAttribute(name) { return this.attributes.has(name); }
  getClientRects() { return this.isConnected ? [{}] : []; }
  focus() { this.focused = true; }
  showModal() { this.open = true; }
  close() { this.open = false; this.dispatchEvent(new Event('close')); }
  remove() { this.isConnected = false; }
}
function setup(options = {}) {
  const clock = new Map(), frames = []; let sequence = 0;
  const win = new EventTarget();
  win.location = { hash: options.hash || '' }; win.navigator = { connection: options.connection };
  win.CustomEvent = CustomEvent;
  win.setTimeout = (handler, delay) => { clock.set(++sequence, { handler, delay }); return sequence; };
  win.clearTimeout = id => clock.delete(id);
  win.requestAnimationFrame = handler => frames.push(handler);
  const doc = new EventTarget(), main = new Element('MAIN'), heading = new Element('H1');
  doc.body = new Element('BODY'); doc.activeElement = doc.body; doc.visibilityState = 'visible';
  doc.querySelectorAll = () => [heading]; doc.getElementById = () => main;
  const dialog = new Element('DIALOG'), enter = new Element('BUTTON'), video = new Element('VIDEO');
  let paused = 0, loads = 0, plays = 0;
  video.setAttribute('data-splash-src', 'assets/splash.mp4');
  video.pause = () => paused++; video.load = () => loads++;
  video.play = () => { plays++; return options.rejectPlay ? Promise.reject(new Error('blocked')) : Promise.resolve(); };
  const motion = new EventTarget(); motion.matches = !!options.reducedMotion;
  const entries = new Map(options.seen ? [[SESSION_KEY, 'seen']] : []);
  const storage = { getItem: key => { if (options.storageError) throw Error('storage'); return entries.get(key); }, setItem: (key, value) => entries.set(key, value) };
  const reasons = []; doc.addEventListener('portfolio:intro-dismissed', e => reasons.push(e.detail.reason));
  const controller = create({ window: win, document: doc, dialog, video, enter, storage, motion });
  return { controller, win, doc, dialog, video, enter, heading, main, motion, entries, reasons, clock,
    paint() { for (let frame = 0; frame < 2; frame++) for (const handler of frames.splice(0)) handler(); },
    counts: () => ({ paused, loads, plays }),
    tick(delay) { const matches = [...clock.entries()].filter(([, task]) => task.delay === delay); for (const [id, task] of matches) { if (clock.has(id)) { clock.delete(id); task.handler(); } } }
  };
}
test('only first home visit on suitable connection is eligible', () => {
  assert.equal(shouldShow({}), true); assert.equal(shouldShow({ hash: '#home' }), true);
  for (const options of [{ seen: true }, { hash: '#about' }, { reducedMotion: true }, { connection: { saveData: true } }, ...['slow-2g', '2g', '3g'].map(effectiveType => ({ connection: { effectiveType } }))]) assert.equal(shouldShow(options), false);
});
test('bypassed sessions never start or acquire a modal', () => {
  for (const options of [{ seen: true }, { reducedMotion: true }, { hash: '#about' }, { storageError: true }, { connection: { saveData: true } }]) {
    const f = setup(options); assert.equal(f.dialog.isConnected, false); assert.equal(f.counts().plays, 0); assert.equal(f.clock.size, 0);
  }
});
test('starts muted inline, remembers session and focuses immediate exit', () => {
  const f = setup(); assert.equal(f.dialog.open, true); assert.equal(f.enter.focused, true);
  assert.equal(f.video.muted, true); assert.equal(f.video.defaultMuted, true); assert.equal(f.video.playsInline, true);
  assert.equal(f.entries.get(SESSION_KEY), 'seen'); assert.equal(f.counts().plays, 1);
});
test('button and Escape dismiss, free media and restore visible focus', () => {
  for (const action of ['button', 'escape']) {
    const f = setup(); f.video.setAttribute('src', 'assets/splash.mp4');
    if (action === 'button') f.enter.dispatchEvent(new Event('click'));
    else { const event = new Event('cancel', { cancelable: true }); f.dialog.dispatchEvent(event); assert.equal(event.defaultPrevented, true); }
    assert.equal(f.dialog.classes.has('is-leaving'), false);
    f.paint(); assert.equal(f.dialog.classes.has('is-leaving'), true); f.tick(LIMITS.fade);
    assert.equal(f.dialog.open, false); assert.equal(f.dialog.isConnected, false); assert.equal(f.video.hasAttribute('src'), false);
    assert.equal(f.heading.focused, true); assert.equal(f.clock.size, 0); assert.equal(f.counts().loads, 1);
  }
});
test('normal ending fades once and cannot affect page later', () => {
  const f = setup(); f.video.dispatchEvent(new Event('playing')); f.tick(LIMITS.startup);
  assert.equal(f.controller.active(), true); f.video.dispatchEvent(new Event('ended')); f.paint(); f.tick(LIMITS.fade);
  f.enter.dispatchEvent(new Event('click')); f.tick(LIMITS.visible);
  assert.deepEqual(f.reasons, ['ended']); assert.equal(f.clock.size, 0);
});
test('startup, stalled playback, errors and hard deadline always release dialog', () => {
  for (const mode of ['startup', 'waiting', 'error', 'deadline']) {
    const f = setup();
    if (mode !== 'startup') f.video.dispatchEvent(new Event('playing'));
    if (mode === 'waiting') f.video.dispatchEvent(new Event('waiting'));
    if (mode === 'error') f.video.dispatchEvent(new Event('error'));
    if (mode === 'deadline') { f.tick(LIMITS.visible); f.paint(); f.tick(LIMITS.fade); } else f.tick(LIMITS.startup);
    assert.equal(f.dialog.isConnected, false, mode); assert.equal(f.clock.size, 0, mode);
  }
});
test('autoplay rejection exits without waiting for deadline', async () => {
  const f = setup({ rejectPlay: true }); await Promise.resolve();
  assert.deepEqual(f.reasons, ['autoplay-rejected']); assert.equal(f.dialog.isConnected, false);
});
test('unsupported media tries the compatibility file once, then fails safely', () => {
  const f = setup(); f.video.setAttribute('data-splash-fallback','fallback.webm');
  f.video.dispatchEvent(new Event('error'));
  assert.equal(f.video.src,'fallback.webm'); assert.equal(f.counts().plays,2); assert.equal(f.dialog.isConnected,true);
  f.video.dispatchEvent(new Event('error'));
  assert.equal(f.dialog.isConnected,false); assert.equal(f.counts().plays,2); assert.equal(f.clock.size,0);
});
test('pagehide during fade cleans up immediately, preventing a frozen BFCache dialog', () => {
  const f = setup(); f.enter.dispatchEvent(new Event('click')); f.win.dispatchEvent(new Event('pagehide'));
  assert.equal(f.dialog.isConnected, false); assert.equal(f.clock.size, 0); assert.deepEqual(f.reasons, ['pagehide']);
  assert.notEqual(f.heading.focused, true);
});
test('hidden tabs and changed reduced-motion preference immediately release video', () => {
  for (const mode of ['hidden', 'motion']) {
    const f = setup();
    if (mode === 'hidden') { f.doc.visibilityState = 'hidden'; f.doc.dispatchEvent(new Event('visibilitychange')); }
    else { f.motion.matches = true; f.motion.dispatchEvent(new Event('change')); }
    assert.equal(f.dialog.isConnected, false); assert.equal(f.clock.size, 0);
  }
});
