/* Static portfolio navigation and progressive scroll depth. No services required. */
(() => {
  "use strict";

  const stateKey = "joshBoyerPortfolio";
  const pages = Array.from(document.querySelectorAll("section[data-page]"));
  const detail = document.getElementById("project-detail");
  const menu = document.getElementById("primary-nav");
  const menuToggle = document.getElementById("menu-toggle");
  const scene = document.getElementById("hero-journey");
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const projectNames = {"nexus":"NEXUS","lowkey":"LOWKEY","workshop42":"Workshop42","dell":"Dell Latitude and OptiPlex support","foundations":"Small Business Server swing migrations","headquarters":"Headquarters infrastructure and move","inquiry":"Broker policy inquiry","newbusiness":"Auto and residential new-business integration","workflows":"Commercial quoting and broker integration","changes":"Policy-change comparison and validation","renewals":"Renewal eligibility and exception routing","upload":"Document upload into policy records","claims":"Provider data for claims adjudication","takeover":"Takeover-history validation and XML loading","continuity":"Preserving a daily claims reporting feed","sql":"Claims SQL and financial reconciliation"};
  const projectFilters = Array.from(document.querySelectorAll("[data-project-filter]"));
  const projectGroups = Array.from(document.querySelectorAll("[data-project-group]"));
  const pageTitles = {
    home: "Josh Boyer — Automation, Integration & AI",
    projects: "Projects — Josh Boyer",
    career: "Career — Josh Boyer",
    skills: "Skills — Josh Boyer",
    about: "About — Josh Boyer"
  };
  const sectionTargets = {
    home: "#hero-journey",
    projects: "#home-featured-projects",
    career: "#home-career-section",
    skills: "#home-skills-section",
    about: "#home-about-section"
  };
  let currentRoute = null;
  let projectsScrollY = 0;
  let closingProject = false;

  function scrollToSectionForPage(pageKey, behavior = motionPreference.matches ? "instant" : "smooth") {
    if (!pageKey || pageKey === "home") {
      window.scrollTo({ top: 0, left: 0, behavior });
      return null;
    }
    const sel = sectionTargets[pageKey];
    const targetEl = sel ? document.querySelector(sel) : null;
    if (!targetEl) return null;
    const isMobile = (window.innerWidth || 1024) <= 768;
    const headerOffset = isMobile ? 72 : 64;
    const rect = targetEl.getBoundingClientRect();
    const destY = Math.max(0, Math.round((window.scrollY || 0) + rect.top - headerOffset));
    window.scrollTo({ top: destY, left: 0, behavior });
    focusHeading(targetEl);
    return targetEl;
  }

  function parseRoute(hash) {
    const key = (hash || "#home").slice(1).replace(/\/+$/, "");
    if (Object.hasOwn(pageTitles, key)) return { key, page: key, hash: `#${key}` };
    const match = /^projects\/([a-z0-9-]+)$/.exec(key);
    if (match && Object.hasOwn(projectNames,match[1])) return { key, page: "projects", project: match[1], hash: `#${key}` };
    return { key: "home", page: "home", hash: "#home" };
  }

  function entryState() {
    const value = window.history.state;
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function metadata(route = currentRoute) {
    const value = entryState()[stateKey];
    return value && value.route === route?.key ? value : null;
  }

  function replaceMetadata(values, hash = window.location.hash) {
    window.history.replaceState({ ...entryState(), [stateKey]: values }, "", hash);
  }

  function setMenu(open, returnFocus = false) {
    if (!menu || !menuToggle) return;
    menu.classList.toggle("is-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    if (returnFocus) menuToggle.focus();
  }

  function focusHeading(container) {
    const heading = container?.querySelector("[data-route-heading], h1, h2");
    if (!heading) return;
    if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }

  function scheduleDepth() { globalThis.CareerTreeView?.refresh(); }

  function renderRoute(event) {
    const livePages = Array.from(document.querySelectorAll("section[data-page]"));
    const liveNavigation = Array.from(document.querySelectorAll("[data-nav]"));
    let route = parseRoute(window.location.hash);
    const template = route.project && document.getElementById(`project-${route.project}`);
    // A missing optional project template must never leave an empty detail page.
    if (route.project && (!detail || !template?.content)) {
      route = parseRoute("#projects");
    }
    if (window.location.hash !== route.hash) {
      replaceMetadata({ route: route.key, projectsScrollY }, route.hash);
    }
    if (currentRoute?.key === route.key) return;

    const previousRoute = currentRoute;
    const saved = metadata(route);
    if (!saved) replaceMetadata({ route: route.key, projectsScrollY, openedFromProjects: false });
    const returningFromDetail = Boolean(previousRoute?.project && !route.project && (event?.type === "popstate" || route.page === "projects"));
    if (returningFromDetail && Number.isFinite(saved?.projectsScrollY) && saved.projectsScrollY > 0) {
      projectsScrollY = Math.max(0, saved.projectsScrollY);
    }
    currentRoute = route;
    closingProject = false;
    setMenu(false);

    for (const page of livePages) page.hidden = page.dataset.page !== "home";
    if (detail) {
      detail.hidden = true;
      detail.replaceChildren();
    }
    for (const link of liveNavigation) {
      const isCurrent = link.getAttribute("href") === `#${route.page}` && (!link.getAttribute("data-nav") || link.getAttribute("data-nav") === route.page || link.getAttribute("data-nav") === "");
      link.classList.toggle("active", isCurrent);
      link.classList.toggle("is-active", isCurrent);
      if (isCurrent) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
    document.title = route.project ? `${projectNames[route.project]} — Projects — Josh Boyer` : pageTitles[route.page];
    const homePage = livePages.find(page => page.dataset.page === "home");
    if (route.project) {
      const scrollBehavior = previousRoute && !motionPreference.matches ? "smooth" : "instant";
      requestAnimationFrame(() => {
        const previewEl = document.querySelector("#home-builds-drawer") || document.querySelector("#home-featured-projects");
        if (previewEl) {
          const isMobile = (window.innerWidth || 1024) <= 768;
          const headerOffset = isMobile ? 72 : 64;
          const rect = previewEl.getBoundingClientRect();
          const destY = Math.max(0, Math.round((window.scrollY || 0) + rect.top - headerOffset));
          window.scrollTo({ top: destY, left: 0, behavior: scrollBehavior });
        } else {
          scrollToSectionForPage("projects", scrollBehavior);
        }
      });
    } else if (returningFromDetail && projectsScrollY > 0) {
      focusHeading(homePage);
      window.scrollTo({ top: projectsScrollY, left: 0, behavior: "instant" });
    } else if (route.page !== "home") {
      const scrollBehavior = previousRoute && !previousRoute.project && !motionPreference.matches ? "smooth" : "instant";
      requestAnimationFrame(() => {
        scrollToSectionForPage(route.page, scrollBehavior);
      });
    } else {
      focusHeading(homePage);
      if (previousRoute) {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: previousRoute.project || motionPreference.matches ? "instant" : "smooth"
        });
      }
    }
    scheduleDepth();
    window.dispatchEvent(new CustomEvent("portfolio:routechange", { detail: route }));
  }

  function navigate(hash) {
    const route = parseRoute(hash);
    if (currentRoute?.key === route.key) {
      setMenu(false, menuToggle?.getAttribute("aria-expanded") === "true");
      scrollToSectionForPage(route.page, motionPreference.matches ? "instant" : "smooth");
      window.dispatchEvent(new CustomEvent("portfolio:routechange", { detail: route }));
      return;
    }
    setMenu(false);
    const openedFromProjects = Boolean(route.project && currentRoute && !currentRoute.project);
    if (currentRoute && !currentRoute.project) {
      projectsScrollY = Math.max(0, window.scrollY);
      replaceMetadata({ ...metadata(), route: currentRoute.key, projectsScrollY });
    }
    const targetUrl = route.page !== "skills" && window.location.search
      ? `${window.location.pathname}${route.hash}`
      : route.hash;
    window.history.pushState({ [stateKey]: { route: route.key, openedFromProjects, projectsScrollY } }, "", targetUrl);
    renderRoute();
  }

  function closeProject() {
    // History traversal is asynchronous in browsers; a double click must close once.
    if (!currentRoute?.project || closingProject) return;
    closingProject = true;
    if (metadata()?.openedFromProjects) window.history.back();
    else window.location.hash = "#projects";
  }

  menuToggle?.addEventListener("click", () => {
    setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
  });

  document.addEventListener("click", event => {
    if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target?.closest ? event.target : event.target?.parentElement;
    if (!target) return;
    const projectFilter = target.closest("[data-project-filter]");
    if (projectFilter) {
      const selected = projectFilter.getAttribute("data-project-filter");
      for (const button of projectFilters) button.setAttribute("aria-pressed",String(button === projectFilter));
      for (const group of projectGroups) group.hidden = selected !== "all" && group.getAttribute("data-project-group") !== selected;
      return;
    }
    const close = target.closest("[data-close-project]");
    if (close) {
      event.preventDefault();
      closeProject();
      return;
    }
    const waypoint = target.closest("[data-waypoint]");
    if (waypoint) {
      // In-page waypoints must not replace the hash used by the page router.
      event.preventDefault();
      const id = (waypoint.getAttribute("data-waypoint") || "").replace(/^#/, "");
      const destination = document.getElementById(id);
      const home = pages.find(page => page.dataset.page === "home");
      if (destination && !currentRoute?.project && home && !home.hidden && home.contains(destination)) {
        if (destination === scene && !motionPreference.matches) {
          const bounds = scene.getBoundingClientRect();
          window.scrollTo({ top: window.scrollY + bounds.top, left: 0, behavior: "smooth" });
          scheduleDepth();
        } else {
          destination.scrollIntoView({ behavior: motionPreference.matches ? "instant" : "smooth", block: destination === scene ? "start" : "center" });
        }
        if (!destination.hasAttribute("tabindex")) destination.setAttribute("tabindex", "-1");
        destination.focus({ preventScroll: true });
      }
      return;
    }
    const link = target.closest("a[href]");
    if (!link || link.hasAttribute("download") || (link.getAttribute("target") && link.getAttribute("target") !== "_self")) return;
    const hash = link.getAttribute("href");
    if (hash === "#main") {
      const main = document.getElementById("main");
      if (main) {
        event.preventDefault();
        setMenu(false);
        if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
        main.focus({ preventScroll: true });
        main.scrollIntoView({ behavior: "instant", block: "start" });
      }
      return;
    }
    if (hash === "#home-connect") {
      event.preventDefault();
      setMenu(false);
      if (currentRoute?.project) navigate("#home");
      requestAnimationFrame(() => {
        const connectEl = document.getElementById("home-connect");
        if (connectEl) {
          connectEl.scrollIntoView({ behavior: motionPreference.matches ? "instant" : "smooth", block: "start" });
        }
      });
      return;
    }
    if (!/^#(?:home|career|skills|about|projects(?:\/[a-z0-9-]+)?)\/?$/.test(hash || "")) return;
    event.preventDefault();
    navigate(hash);
  });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    if (menuToggle?.getAttribute("aria-expanded") === "true") {
      event.preventDefault();
      setMenu(false, true);
    } else if (currentRoute?.project) {
      event.preventDefault();
      closeProject();
    }
  });

  window.addEventListener("popstate", renderRoute);
  window.addEventListener("hashchange", renderRoute);
  window.addEventListener("scroll", () => {
    if (!currentRoute?.project) projectsScrollY = Math.max(0, window.scrollY);
    scheduleDepth();
  }, { passive: true });
  window.addEventListener("resize", () => {scheduleDepth();}, { passive: true });
  document.fonts?.ready?.then(() => {scheduleDepth();});
  if (motionPreference.addEventListener) motionPreference.addEventListener("change", scheduleDepth);
  else motionPreference.addListener(scheduleDepth);
  if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
  setMenu(false);
  renderRoute();
})();
