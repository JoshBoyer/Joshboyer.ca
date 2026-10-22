/* Career overview: live text and native disclosures around a conceptual illustration. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CareerReference = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ICONS = {
    hardware: '<rect x="4" y="3" width="16" height="7" rx="2"/><rect x="4" y="14" width="16" height="7" rx="2"/><path d="M8 6.5h.01M8 17.5h.01M12 6.5h4M12 17.5h4"/>',
    domain: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
    cloud: '<path d="M7 19h11a4 4 0 0 0 0-8 6 6 0 0 0-11-3 5.5 5.5 0 0 0 0 11Z"/>',
    data: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>',
    code: '<path d="m8 6-6 6 6 6M16 6l6 6-6 6M14 3l-4 18"/>',
    infinity: '<path d="M12 12C7 4 2 7 2 12s5 8 10 0 10-5 10 0-5 8-10 0Z"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    play: '<path d="m9 5 10 7-10 7V5Z"/>',
    people: '<circle cx="12" cy="7" r="3"/><path d="M6 21v-3a6 6 0 0 1 12 0v3M4 7a3 3 0 0 0 0 6M20 7a3 3 0 0 1 0 6"/>',
    growth: '<path d="M4 21v-5h3v5M10 21V10h3v11M16 21V4h3v17"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.code}</svg>`;

  const CHAPTERS = Object.freeze([
    { id: "hardware", theme: "teal", period: "2006 – 2009", title: "Hardware & Support", icon: "hardware", image: "proj-banner-dell.jpg", description: "Hands-on foundations in hardware, networks and technical support.", tags: ["Infrastructure", "Systems", "Support"], detail: "Dell Canada, September 2006–2007: Latitude and OptiPlex diagnosis and client support. Harris / Ottawa Computer Services, 2007–2009: network operations and repeatable infrastructure migrations.", links: [["dell", "Dell hardware support"], ["foundations", "Harris infrastructure migrations"]] },
    { id: "insurance", theme: "blue", period: "2009 – 2022", title: "Insurance Systems", icon: "domain", image: "proj-banner-headquarters.jpg", description: "Underwriting rules, broker integration, headquarters infrastructure and reporting.", tags: ["Integration", "Rules", "P&C"], detail: "At Grenville Mutual Insurance, infrastructure and systems responsibilities grew into insurance analysis, rating and underwriting rules, broker integrations and reporting. The formal analyst transition remains unresolved between 2014 and 2016.", links: [["renewals", "Renewal eligibility and rules"], ["inquiry", "Broker policy inquiry"], ["headquarters", "Headquarters infrastructure"]] },
    { id: "solutions", theme: "violet", period: "2022 – Present", title: "AI & Solution Design", icon: "cloud", image: "proj-banner-nexus.jpg", description: "Claims integration at Medavie. Independent AI orchestration through NEXUS.", tags: ["Solution Design", "AI Agents", "Data"], detail: "Professional work at Medavie covers claims requirements, provider-integration solution review, production-adopted takeover tooling and reporting analysis. NEXUS is a separate, current independent capstone; its development is not a Medavie project or a historical job title.", links: [["claims", "Provider integration review"], ["takeover", "Takeover-history tooling"], ["nexus", "Independent NEXUS platform"]] },
    { id: "learning", theme: "gold", period: "Ongoing", title: "Learning & Building", icon: "infinity", image: "career-design.jpg", description: "New tools, same curiosity. Connecting experience to the next problem.", tags: ["Exploration", "Making", "Iteration"], detail: "Independent work keeps the learning practical. NEXUS is the current capstone; Workshop42 and LOWKEY remain historical or personal evidence alongside the professional career.", links: [["nexus", "Explore NEXUS"], ["workshop42", "Workshop42 physical builds"], ["lowkey", "LOWKEY local transcription"]] }
  ]);

  const CAPABILITIES = Object.freeze([
    { id: "business", title: "Business & Delivery", icon: "people", theme: "violet", groups: ["collaboration", "domain"], evidence: "Requirements → solution design", href: "?cat=business#skills" },
    { id: "insurance", title: "Domain Expertise", icon: "domain", theme: "blue", groups: ["domain"], evidence: "Insurance since 2009", href: "?cat=insurance#skills" },
    { id: "data", title: "Integration & Data", icon: "data", theme: "cyan", groups: ["technical", "tools"], evidence: "Mappings · interfaces · SQL", href: "?cat=data#skills" },
    { id: "infrastructure", title: "Engineering", icon: "code", theme: "teal", groups: ["technical", "tools"], evidence: "Systems · networks · tooling", href: "?cat=infrastructure#skills" },
    { id: "ai", title: "AI & Automation", icon: "cloud", theme: "violet", groups: ["ai", "technical"], evidence: "Independent NEXUS work", href: "?cat=ai#skills" }
  ]);

  function hexagon(x, y, label, category, theme, symbol) {
    const points = [[0,-47],[41,-23.5],[41,23.5],[0,47],[-41,23.5],[-41,-23.5]].map(p => `${p[0]+x},${p[1]+y}`).join(" ");
    return `<a href="${category === "nexus" ? "#projects/nexus" : `?cat=${category}#skills`}" aria-label="Explore ${label}" class="cr-hex theme-${theme}"><polygon points="${points}"/><svg x="${x-12}" y="${y-26}" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[symbol]}</svg><text x="${x}" y="${y+16}" text-anchor="middle">${label}</text></a>`;
  }

  function render(timelineHtml) {
    return `
      <div class="career-reference">
        <header class="cr-hero">
          <div class="cr-intro">
            <p class="cr-kicker">03 / CAREER JOURNEY</p>
            <h1 tabindex="-1">From hardware<br>to <em>intelligent systems.</em></h1>
            <p class="cr-lead">A continuous journey across infrastructure, insurance systems and AI — each layer building on the last.</p>
            <div class="cr-actions">
              <button type="button" class="cr-primary" data-cr-explore>Explore the journey ${icon("arrow")}</button>
              <button type="button" class="cr-secondary" data-cr-story>${icon("play")} Watch the story</button>
            </div>
            <dl class="cr-metrics" aria-label="Career at a glance">
              <div><dt>20+</dt><dd>Years in tech<small>Since Sept 2006</small></dd></div>
              <div><dt>3</dt><dd>Career chapters<small>Built in layers</small></dd></div>
              <div><dt>${icon("infinity")}</dt><dd>Always learning<small>Still building</small></dd></div>
              <div><dt>1</dt><dd>Unifying vision<small>Practical solutions</small></dd></div>
            </dl>
          </div>
          <div class="cr-art" role="img" aria-label="Conceptual illustration: hardware and support form the foundation, insurance systems the middle layer, and AI and solution design the upper layer.">
            <img src="assets/career-layers-v1.webp" width="1200" height="800" alt="" fetchpriority="high">
            <span class="cr-floor-label cr-floor-ai">AI &amp; SOLUTION DESIGN</span>
            <span class="cr-floor-label cr-floor-insurance">INSURANCE SYSTEMS</span>
            <span class="cr-floor-label cr-floor-hardware">HARDWARE &amp; SUPPORT</span>
            <span class="cr-art-caption">CONCEPTUAL ILLUSTRATION</span>
          </div>
          <ul class="cr-impact" aria-label="How the layers connect">
            ${[["cloud","violet","Business Impact","AI, automation and solution design"],["people","blue","Domain Expertise","Insurance, claims and enterprise systems"],["data","cyan","Integration & Data","Interfaces, data mapping and reporting"],["code","teal","Engineering","Infrastructure, networks and technical foundations"]].map(([symbol,theme,title,copy]) => `<li class="theme-${theme}"><span class="cr-impact-icon">${icon(symbol)}</span><div><strong>${title.replaceAll("&","&amp;")}</strong><p>${copy}</p></div></li>`).join("")}
          </ul>
        </header>

        <section class="cr-journey" aria-label="Career chapters" id="career-reference-chapters" tabindex="-1">
          <div class="cr-wave" aria-hidden="true"><svg viewBox="0 0 1200 40" preserveAspectRatio="none"><defs><linearGradient id="cr-wave-colour"><stop stop-color="#45e6c9"/><stop offset=".35" stop-color="#32b9ff"/><stop offset=".68" stop-color="#bc7aff"/><stop offset="1" stop-color="#ffd05b"/></linearGradient></defs><path d="M0 24C90 0 180 40 300 20S480 40 600 22 780 42 900 20 1110 30 1200 15"/></svg></div>
          <ol class="cr-milestones">
            ${CHAPTERS.map((c,i) => `<li class="theme-${c.theme}"><span class="cr-node" aria-hidden="true"></span>${icon(c.icon)}<div><strong>${i+1}. ${c.id === "learning" ? "Always Learning" : c.title}</strong><span>${c.period}</span><p>${c.description}</p></div></li>`).join("")}
          </ol>
          <div class="cr-chapter-cards">
            ${CHAPTERS.map(c => `<details class="cr-chapter theme-${c.theme}" name="career-chapter"><summary><img src="assets/${c.image}" width="100" height="120" loading="lazy" alt=""><span class="cr-chapter-copy"><span class="cr-period">${c.period}</span><strong>${c.title}</strong><span class="cr-description">${c.description}</span><span class="cr-tags">${c.tags.map(t=>`<span>${t}</span>`).join("")}</span></span><span class="cr-card-arrow" aria-hidden="true">${icon("arrow")}</span></summary><div class="cr-chapter-detail"><p>${c.detail}</p>${c.links.map(([slug,title])=>`<a href="#projects/${slug}">${title} ${icon("arrow")}</a>`).join("")}</div></details>`).join("")}
          </div>
        </section>

        <section class="cr-skills" aria-labelledby="cr-skills-heading">
          <div class="cr-skills-copy"><p class="cr-kicker">04 / SKILLS &amp; CAPABILITIES</p><h2 id="cr-skills-heading">Bringing layers <em>together.</em></h2><p>Business context, technical depth, and practical delivery — connected through experience.</p><div class="cr-filters" role="group" aria-label="Filter capability areas">${[["all","All skills"],["technical","Technical"],["domain","Domain"],["ai","AI & emerging"],["tools","Tools"],["collaboration","Collaboration"]].map(([id,label])=>`<button type="button" data-cr-filter="${id}" aria-pressed="${id === "all"}">${label}</button>`).join("")}</div></div>
          <div class="cr-constellation"><svg viewBox="0 0 360 240" role="group" aria-label="Connected capability areas">${hexagon(180,48,"AI & Automation","ai","violet","cloud")}${hexagon(96,92,"Engineering","infrastructure","teal","code")}${hexagon(264,92,"Data & Integration","data","cyan","data")}${hexagon(96,179,"Insurance Domain","insurance","gold","domain")}${hexagon(264,179,"Platform Design","development","violet","hardware")}${hexagon(180,136,"NEXUS","nexus","cyan","infinity")}</svg><span>Different experiences. A stronger whole.</span></div>
          <div class="cr-evidence"><p class="cr-kicker">SKILLS IN PRACTICE</p><ul>${CAPABILITIES.map(c=>`<li data-cr-capability="${c.groups.join(" ")}" class="theme-${c.theme}"><a href="${c.href}">${icon(c.icon)}<span><strong>${c.title}</strong><small>${c.evidence}</small></span>${icon("arrow")}</a></li>`).join("")}</ul><p class="cr-filter-status" role="status" aria-live="polite"></p></div>
          <aside class="cr-compound">${icon("growth")}<strong>20+ <span>Years</span></strong><p>of compounding experience, applied to what’s next.</p><a href="resume.html">Build a tailored résumé ${icon("arrow")}</a></aside>
        </section>
        <details class="cr-archive"><summary>Explore the full career timeline ${icon("arrow")}</summary><div class="career-body-wrap">${timelineHtml}</div></details>
      </div>`;
  }

  function mount(section) {
    section.addEventListener("click", event => {
      const filter = event.target.closest("[data-cr-filter]");
      if (filter) {
        const value = filter.dataset.crFilter;
        section.querySelectorAll("[data-cr-filter]").forEach(button => button.setAttribute("aria-pressed", String(button === filter)));
        let count = 0;
        section.querySelectorAll("[data-cr-capability]").forEach(row => {
          row.hidden = value !== "all" && !row.dataset.crCapability.split(" ").includes(value);
          if (!row.hidden) count++;
        });
        section.querySelector(".cr-filter-status").textContent = `${count} capability ${count === 1 ? "area" : "areas"} shown.`;
      }
      if (event.target.closest("[data-cr-explore]")) {
        const chapters = section.querySelector(".cr-journey");
        chapters.focus({preventScroll:true});
        chapters.scrollIntoView({behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block:"start"});
      }
      if (event.target.closest("[data-cr-story]")) {
        window.location.hash = "#home";
        requestAnimationFrame(() => document.querySelector("[data-home-watch-story]")?.click());
      }
    });
  }
  return Object.freeze({render, mount, CHAPTERS, CAPABILITIES});
});
