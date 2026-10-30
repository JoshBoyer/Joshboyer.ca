(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else {
    root.PortfolioLoadingSplash = api;
    api.mount(root, root.document);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SESSION_KEY = "joshboyer:intro:dc9fd45e:v1";
  const LIMITS = { startup: 1200, visible: 5500, fade: 600 };

  function shouldShow({ hash = "", reducedMotion = false, connection, seen = false }) {
    return (!hash || hash === "#home") && !reducedMotion && !seen && !connection?.saveData &&
      !/^(slow-2g|2g|3g)$/.test(connection?.effectiveType || "") &&
      !(connection?.downlink > 0 && connection.downlink <= 1.5);
  }

  function create({ window: win, document: doc, dialog, video, enter, storage, motion }) {
    let active = false, closing = false, finished = false;
    let startupTimer = null;
    let attempt = 0, fallbackUsed = false;
    const timers = new Set(), removers = [];
    const previousFocus = doc.activeElement;
    function listen(target, name, handler) {
      target.addEventListener(name, handler);
      removers.push(() => target.removeEventListener(name, handler));
    }
    function schedule(handler, delay) {
      const id = win.setTimeout(() => { timers.delete(id); handler(); }, delay);
      timers.add(id);
      return id;
    }
    function clear(id) { if (id !== null) { win.clearTimeout(id); timers.delete(id); } }
    function clearWork() {
      for (const id of timers) win.clearTimeout(id);
      timers.clear();
      for (const remove of removers.splice(0)) remove();
    }
    function finish(reason) {
      if (finished) return;
      finished = true;
      active = false;
      clearWork();
      try { video.pause(); video.removeAttribute("src"); video.load(); } catch (_) {}
      try { if (dialog.open) dialog.close(); } catch (_) {}
      dialog.remove();
      doc.dispatchEvent(new win.CustomEvent("portfolio:intro-dismissed", { detail: { reason } }));
      if (reason !== "pagehide" && doc.visibilityState !== "hidden") {
        let target = previousFocus;
        if (!target || target === doc.body || !target.isConnected || !target.getClientRects().length) {
          target = [...doc.querySelectorAll("#main h1")].find(el => el.getClientRects().length) || doc.getElementById("main");
        }
        if (target) {
          if (!target.hasAttribute("tabindex") && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
        }
      }
    }
    function dismiss(reason = "skip", animate = true) {
      if (closing || finished) return;
      closing = true;
      for (const id of timers) win.clearTimeout(id);
      timers.clear();
      if (animate && !motion.matches) {
        const fade = () => {
          if (finished) return;
          dialog.classList.add("is-leaving");
          schedule(() => finish(reason), LIMITS.fade);
        };
        // Let the static homepage paint under the held video frame before
        // dissolving both the dialog and its backdrop together.
        if (typeof win.requestAnimationFrame === "function") {
          win.requestAnimationFrame(() => win.requestAnimationFrame(fade));
        } else fade();
      } else finish(reason);
    }
    function playSource(src) {
      const currentAttempt = ++attempt;
      video.src = src;
      const promise = video.play();
      if (promise?.catch) promise.catch(error => {
        if (finished || currentAttempt !== attempt) return;
        if (error?.name === "NotSupportedError" && useFallback()) return;
        dismiss("autoplay-rejected", false);
      });
    }
    function useFallback() {
      const src = video.getAttribute("data-splash-fallback");
      if (fallbackUsed || !src || finished) return false;
      fallbackUsed = true;
      clear(startupTimer);
      startupTimer = schedule(() => dismiss("slow-media", false), LIMITS.startup);
      try { playSource(src); } catch (_) { dismiss("media-error", false); }
      return true;
    }

    let seen;
    try { seen = storage.getItem(SESSION_KEY) === "seen"; } catch (_) { dialog.remove(); return { active: () => false, dismiss }; }
    if (!shouldShow({ hash: win.location.hash, reducedMotion: motion.matches, connection: win.navigator?.connection, seen }) ||
        doc.visibilityState === "hidden" || typeof dialog.showModal !== "function") {
      dialog.remove();
      return { active: () => false, dismiss };
    }
    try { storage.setItem(SESSION_KEY, "seen"); } catch (_) { dialog.remove(); return { active: () => false, dismiss }; }
    try {
      dialog.showModal();
      active = true;
      enter.focus({ preventScroll: true });
      listen(enter, "click", () => dismiss("skip"));
      listen(dialog, "cancel", event => { event.preventDefault(); event.stopPropagation(); dismiss("escape"); });
      listen(dialog, "close", () => finish("closed"));
      listen(video, "ended", () => dismiss("ended"));
      listen(video, "error", () => { if (!useFallback()) dismiss("media-error", false); });
      listen(video, "playing", () => { clear(startupTimer); startupTimer = null; });
      listen(video, "waiting", () => {
        clear(startupTimer);
        startupTimer = schedule(() => dismiss("slow-media", false), LIMITS.startup);
      });
      listen(motion, "change", () => { if (motion.matches) finish("reduced-motion"); });
      listen(win, "pagehide", () => finish("pagehide"));
      listen(doc, "visibilitychange", () => { if (doc.visibilityState === "hidden") finish("hidden"); });
      schedule(() => dismiss("deadline"), LIMITS.visible);
      startupTimer = schedule(() => dismiss("slow-media", false), LIMITS.startup);
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.preload = "auto";
      playSource(video.getAttribute("data-splash-src"));
    } catch (_) { finish("unavailable"); }
    return { active: () => active, dismiss };
  }

  function mount(win, doc) {
    const dialog = doc.getElementById("loading-splash");
    if (!dialog) return;
    try {
      return create({ window: win, document: doc, dialog,
        video: dialog.querySelector("video"), enter: dialog.querySelector("button"),
        storage: win.sessionStorage, motion: win.matchMedia("(prefers-reduced-motion: reduce)") });
    } catch (_) { try { dialog.close(); } catch (_) {} dialog.remove(); }
  }
  return { SESSION_KEY, LIMITS, shouldShow, create, mount };
});
