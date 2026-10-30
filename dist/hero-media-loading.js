(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.HeroMediaLoading = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function canWarm(connection, reducedMotion) {
    if (reducedMotion || connection?.saveData) return false;
    if (/^(slow-2g|2g|3g)$/.test(connection?.effectiveType || "")) return false;
    return !(connection?.downlink > 0 && connection.downlink <= 1.5);
  }

  function create({ video, image, window: win, document: doc, isHome = () => true }) {
    const motion = win.matchMedia?.("(prefers-reduced-motion: reduce)");
    const connection = win.navigator?.connection;
    let criticalReady = false, requested = false, disposed = false, queued = false;
    let idleId = null, timerId = null;
    let inViewport = !win.IntersectionObserver;
    const observed = image?.closest?.(".career-hero") || image;
    const observer = win.IntersectionObserver && observed ? new win.IntersectionObserver(entries => {
      inViewport = entries.some(entry => entry.isIntersecting);
      reconsider();
    }) : null;
    observer?.observe(observed);

    function cancelPending() {
      if (idleId !== null) win.cancelIdleCallback?.(idleId);
      if (timerId !== null) win.clearTimeout(timerId);
      idleId = timerId = null;
      queued = false;
    }

    function ensureSource(preloadMode = "metadata") {
      const src = video.getAttribute("data-story-src");
      if (src && video.getAttribute("src") !== src) {
        video.preload = preloadMode;
        video.setAttribute("src", src);
        video.load();
      } else if (preloadMode === "auto" && video.preload !== "auto") {
        video.preload = "auto";
      }
      return video;
    }

    function eligible() {
      return !disposed && !requested && criticalReady && doc.visibilityState !== "hidden" &&
        !doc.querySelector?.("#loading-splash[open]") && inViewport && isHome() && canWarm(connection, motion?.matches);
    }

    function queueWarm() {
      if (!eligible() || queued) return;
      queued = true;
      const warm = () => {
        queued = false;
        idleId = timerId = null;
        if (eligible()) ensureSource("metadata");
      };
      if (win.requestIdleCallback) idleId = win.requestIdleCallback(warm);
      else timerId = win.setTimeout(warm, 1500);
    }

    async function afterPageReady() {
      if (image) {
        if (!image.complete) {
          await new Promise(resolve => {
            const done = () => {
              image.removeEventListener("load", done);
              image.removeEventListener("error", done);
              resolve();
            };
            image.addEventListener("load", done, { once: true });
            image.addEventListener("error", done, { once: true });
          });
        }
        if (!image.naturalWidth) return;
        try { await image.decode?.(); } catch (_) { return; }
      }
      criticalReady = true;
      queueWarm();
    }

    function reconsider() {
      if (!eligible()) cancelPending();
      else queueWarm();
    }

    function dispose() {
      disposed = true;
      observer?.disconnect();
      cancelPending();
      win.removeEventListener("load", afterPageReady);
      win.removeEventListener("hashchange", reconsider);
      win.removeEventListener("pagehide", dispose);
      doc.removeEventListener("visibilitychange", reconsider);
      doc.removeEventListener("portfolio:intro-dismissed", reconsider);
      connection?.removeEventListener?.("change", reconsider);
      motion?.removeEventListener?.("change", reconsider);
    }

    if (doc.readyState === "complete") void afterPageReady();
    else win.addEventListener("load", afterPageReady, { once: true });
    win.addEventListener("hashchange", reconsider);
    win.addEventListener("pagehide", dispose, { once: true });
    doc.addEventListener("visibilitychange", reconsider);
    doc.addEventListener("portfolio:intro-dismissed", reconsider);
    connection?.addEventListener?.("change", reconsider);
    motion?.addEventListener?.("change", reconsider);

    return {
      request() { requested = true; cancelPending(); return ensureSource("auto"); },
      dispose
    };
  }

  return { canWarm, create };
});
