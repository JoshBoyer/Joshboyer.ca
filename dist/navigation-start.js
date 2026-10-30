(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else api.start(root);
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  function start(win) {
    // A fresh incoming anchor and Back/Forward are deliberate navigation.
    // Only a browser reload should discard the section in the current URL.
    const navigation = win.performance?.getEntriesByType?.('navigation')?.[0];
    if (navigation?.type !== 'reload') return false;
    const state = win.history.state;
    const nextState = state && typeof state === 'object' && !Array.isArray(state) ? { ...state } : {};
    delete nextState.joshBoyerPortfolio;
    win.history.scrollRestoration = 'manual';
    win.history.replaceState(nextState, '', win.location.pathname + win.location.search + '#home');
    const top = () => win.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    top();
    win.requestAnimationFrame(top);
    if (win.document.readyState !== 'complete') win.addEventListener('load', top, { once: true });
    return true;
  }
  return { start };
});
