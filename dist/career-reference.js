/* Career overview: live text, interactive layer telemetry, and native disclosures around a conceptual illustration. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CareerReference = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ICONS = {
    hardware: '<rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><circle cx="7" cy="7" r="1"/><circle cx="7" cy="17" r="1"/><path d="M11 7h6M11 17h6"/>',
    domain: '<path d="m12 3 7 3v5.5c0 4.8-7 8.5-7 8.5s-7-3.7-7-8.5V6l7-3Z"/><path d="m9 12 2 2 4-4"/>',
    cloud: '<path d="M6.5 18h11a4 4 0 0 0 .4-7.98A5.5 5.5 0 0 0 7.2 8.5 4.5 4.5 0 0 0 6.5 18Z"/>',
    data: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>',
    code: '<path d="m8 6-6 6 6 6M16 6l6 6-6 6M14 3l-4 18"/>',
    infinity: '<path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8Z"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z"/>',
    nodes: '<circle cx="12" cy="5" r="2.5"/><circle cx="6" cy="17" r="2.5"/><circle cx="18" cy="17" r="2.5"/><path d="M10.7 7.2 7.3 14.8M13.3 7.2l3.4 7.6M8.5 17h7"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    chevLeft: '<path d="m14 6-6 6 6 6"/>',
    chevRight: '<path d="m10 6 6 6-6 6"/>',
    extlink: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    play: '<path d="m9 5 10 7-10 7V5Z"/>',
    people: '<circle cx="9" cy="7" r="3"/><path d="M3 20v-2a5 5 0 0 1 10 0v2"/><circle cx="17" cy="8" r="2.5"/><path d="M15 20v-1.5a4 4 0 0 1 6 0V20"/>',
    growth: '<path d="M4 21v-5h3v5M10 21V10h3v11M16 21V4h3v17"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.code}</svg>`;

  const CHAPTERS = Object.freeze([
    {
      id: "hardware",
      theme: "metal",
      milestoneLabel: "HARDWARE & SUPPORT",
      period: "2006 – 2009",
      title: "Hardware & Support",
      icon: "hardware",
      image: "builds/cr-card-1-hardware.png",
      detailImage: "builds/cr-detail-1-dell.png",
      detailAlt: "Dell hardware diagnostics and enterprise workstation components",
      description: "Hands-on foundations in hardware, networks and technical support.",
      tags: ["Hardware", "Networking", "Support"],
      narrativeHtml: "I started my career with <strong>hands-on hardware diagnostics</strong> and client support at Dell Canada and OptiPlex. This built a strong foundation in <strong>hardware, networking and infrastructure</strong>, along with practical problem-solving and customer communication. I then moved to Harris Computer Services, expanding into <strong>network operations</strong> and repeatable infrastructure migrations for business clients.",
      detail: "Dell Canada, September 2006–2007: Latitude and OptiPlex diagnosis and client support. Harris Computer Services, 2007–2009: network operations and repeatable infrastructure migrations.",
      highlights: [
        ["wrench", "Hardware diagnostics and repair"],
        ["nodes", "Network operations and monitoring"],
        ["hardware", "Infrastructure migrations"],
        ["people", "Client support and escalation"]
      ],
      projectCards: [
        { slug: "dell", thumb: "assets/builds/cr-proj-1-dell.png", title: "Dell Canada Support Operations", summary: "Hardware diagnostics, desktop and server support across business clients." },
        { slug: "foundations", thumb: "assets/builds/cr-proj-2-harris.png", title: "Harris Infrastructure Migrations", summary: "Network upgrades and repeatable migration processes for client environments." }
      ],
      links: [["dell", "Dell hardware support"], ["foundations", "Harris infrastructure migrations"]]
    },
    {
      id: "insurance",
      theme: "gold",
      milestoneLabel: "INSURANCE SYSTEMS",
      period: "2009 – 2022",
      title: "Insurance Systems",
      icon: "domain",
      image: "builds/cr-card-2-insurance.png",
      detailImage: "proj-banner-headquarters.jpg",
      detailAlt: "Grenville Mutual Insurance headquarters infrastructure and policy integration systems",
      description: "Underwriting rules, broker integration, infrastructure and reporting.",
      tags: ["Integration", "Rules", "P&C"],
      narrativeHtml: "At Grenville Mutual Insurance (2009–2022), my responsibilities grew from <strong>headquarters infrastructure and virtualization</strong> into <strong>P&amp;C insurance systems analysis</strong>, underwriting rules, broker integrations and management reporting. I designed and implemented <strong>rating and renewal eligibility rules</strong> and SOAP/XML and REST broker workflows.",
      detail: "At Grenville Mutual Insurance, infrastructure and systems responsibilities grew into insurance analysis, rating and underwriting rules, broker integrations and reporting. The formal analyst transition remains unresolved between 2014 and 2016.",
      highlights: [
        ["domain", "Underwriting and renewal rules"],
        ["nodes", "Broker SOAP/XML & REST integration"],
        ["hardware", "Headquarters infrastructure & ESXi"],
        ["data", "Operational & management reporting"]
      ],
      projectCards: [
        { slug: "renewals", thumb: "assets/optimized/proj-banner-renewals-1376.webp", title: "Renewal Eligibility & Underwriting Rules", summary: "Automated renewal validation and human exception routing across policy lines." },
        { slug: "headquarters", thumb: "assets/optimized-extra/proj-banner-headquarters-1376.webp", title: "Headquarters Infrastructure & Move", summary: "End-to-end network, power resilience and blade-to-ESXi transition." }
      ],
      links: [["renewals", "Renewal eligibility and rules"], ["inquiry", "Broker policy inquiry"], ["headquarters", "Headquarters infrastructure"]]
    },
    {
      id: "solutions",
      theme: "blue",
      milestoneLabel: "AI & SOLUTION DESIGN",
      period: "2022 – Present",
      title: "AI & Solution Design",
      icon: "cloud",
      image: "builds/cr-card-3-ai.png",
      detailImage: "proj-banner-nexus.jpg",
      detailAlt: "Enterprise solution design and NEXUS multi-agent orchestration architecture",
      description: "Claims integration, solution design and independent AI orchestration through NEXUS.",
      tags: ["Solution Design", "AI Agents", "Data"],
      narrativeHtml: "At Medavie (2022–Present), my professional work connects <strong>provider integration solution review</strong>, synchronization and field-mapping requirements, <strong>production-adopted takeover-history tooling</strong> and reporting continuity analysis. Alongside this work, I independently architected and built <strong>NEXUS</strong> as my current AI orchestration capstone.",
      detail: "Professional work at Medavie covers claims requirements, provider-integration solution review, production-adopted takeover tooling and reporting analysis. NEXUS is a separate, current independent capstone; its development is not a Medavie project or a historical job title.",
      highlights: [
        ["nodes", "Provider integration solution review"],
        ["code", "Production Excel VBA takeover tooling"],
        ["data", "SQL & reporting continuity analysis"],
        ["cloud", "Independent NEXUS AI orchestration"]
      ],
      projectCards: [
        { slug: "claims", thumb: "assets/optimized-extra/proj-banner-claims-1376.webp", title: "Provider Integration & Solution Review", summary: "Mapping, synchronization requirements and live integration support at Medavie." },
        { slug: "takeover", thumb: "assets/optimized-extra/proj-banner-takeover-1376.webp", title: "Takeover-History Validation Tooling", summary: "Production-adopted Excel VBA add-in for validation, XML batches and reconciliation." }
      ],
      links: [["claims", "Provider integration review"], ["takeover", "Takeover-history tooling"], ["nexus", "Independent NEXUS platform"]]
    },
    {
      id: "learning",
      theme: "teal",
      milestoneLabel: "ALWAYS LEARNING",
      period: "Ongoing",
      title: "Learning & Building",
      icon: "infinity",
      image: "builds/cr-card-4-learning.png",
      detailImage: "career-design.jpg",
      detailAlt: "Hands-on design, fabrication and independent software experimentation",
      description: "New tools, same curiosity. Connecting experience to the next problem.",
      tags: ["Exploration", "Making", "Iteration"],
      narrativeHtml: "Curiosity stays practical when you build with your hands. From <strong>NEXUS</strong> (my current independent AI orchestration capstone) to <strong>LOWKEY</strong> local voice transcription and <strong>Workshop42</strong> physical fabrication and electronics, independent projects let me test new ideas directly and bring stronger instincts back to complex systems.",
      detail: "Independent work keeps the learning practical. NEXUS is the current capstone; Workshop42 and LOWKEY remain historical or personal evidence alongside the professional career.",
      highlights: [
        ["cloud", "NEXUS independent AI capstone"],
        ["code", "LOWKEY local voice transcription"],
        ["wrench", "Workshop42 physical fabrication"],
        ["infinity", "Continuous hands-on iteration"]
      ],
      projectCards: [
        { slug: "nexus", thumb: "assets/optimized-extra/proj-banner-nexus-1376.webp", title: "NEXUS AI Orchestration Capstone", summary: "Independent multi-agent architecture with scoped context and governed routing." },
        { slug: "workshop42", thumb: "assets/optimized-extra/apex-1200.webp", title: "Workshop42 & LOWKEY Builds", summary: "Physical woodworking/CNC builds and local-first Whisper voice utilities." }
      ],
      links: [["nexus", "Explore NEXUS"], ["workshop42", "Workshop42 physical builds"], ["lowkey", "LOWKEY local transcription"]]
    }
  ]);

  const CAPABILITIES = Object.freeze([
    { id: "business", title: "Business & Delivery", icon: "people", theme: "violet", groups: ["collaboration", "domain"], evidence: "Requirements → solution design", href: "?cat=business#skills" },
    { id: "insurance", title: "Domain Expertise", icon: "domain", theme: "blue", groups: ["domain"], evidence: "Insurance since 2009", href: "?cat=insurance#skills" },
    { id: "data", title: "Integration & Data", icon: "data", theme: "cyan", groups: ["technical", "tools"], evidence: "Mappings · interfaces · SQL", href: "?cat=data#skills" },
    { id: "infrastructure", title: "Engineering", icon: "code", theme: "teal", groups: ["technical", "tools"], evidence: "Systems · networks · tooling", href: "?cat=infrastructure#skills" },
    { id: "ai", title: "AI & Automation", icon: "cloud", theme: "violet", groups: ["ai", "technical"], evidence: "Independent NEXUS work", href: "?cat=ai#skills" }
  ]);

  const HEX_GROUPS = Object.freeze({
    ai: "ai technical",
    infrastructure: "technical tools",
    data: "technical tools",
    insurance: "domain collaboration",
    development: "technical tools ai",
    nexus: "all technical domain ai tools collaboration"
  });

  function hexagon(x, y, label, category, theme, symbol) {
    const outerPts = [[0,-46],[40,-23],[40,23],[0,46],[-40,23],[-40,-23]].map(p => `${p[0]+x},${p[1]+y}`).join(" ");
    const innerPts = [[0,-39],[34,-19.5],[34,19.5],[0,39],[-34,19.5],[-34,-19.5]].map(p => `${p[0]+x},${p[1]+y}`).join(" ");
    const groups = HEX_GROUPS[category] || "all";
    const isHub = category === "nexus";
    return `<a href="${isHub ? "#projects/nexus" : `?cat=${category}#skills`}" aria-label="Explore ${label}" data-hex-cat="${category}" data-hex-groups="${groups}" class="cr-hex theme-${theme}${isHub ? " is-hub" : ""}"><polygon class="cr-hex-outer" points="${outerPts}"/><polygon class="cr-hex-inner" points="${innerPts}"/><svg x="${x-12}" y="${y-26}" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[symbol]}</svg><text x="${x}" y="${y+16}" text-anchor="middle">${label}</text></a>`;
  }

  function renderConstellationSynapses() {
    const [hx, hy] = [180, 136];
    const nodes = [
      ["ai", 180, 48, "#bd8bff"],
      ["infrastructure", 96, 92, "#55e6ca"],
      ["data", 264, 92, "#53d8ff"],
      ["insurance", 96, 179, "#ffd05b"],
      ["development", 264, 179, "#bd8bff"]
    ];
    const lerp = (a, b, t) => (a + (b - a) * t).toFixed(1);
    const spokes = nodes.map(([id, nx, ny, color], idx) => {
      const x1 = lerp(nx, hx, 0.34);
      const y1 = lerp(ny, hy, 0.34);
      const x2 = lerp(nx, hx, 0.66);
      const y2 = lerp(ny, hy, 0.66);
      const mx = lerp(nx, hx, 0.5);
      const my = lerp(ny, hy, 0.5);
      return `
        <g class="cr-synapse-group" data-synapse-cat="${id}" data-synapse-groups="${HEX_GROUPS[id] || "all"}">
          <line class="cr-synapse-base" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />
          <line class="cr-synapse-pulse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="--pulse-color:${color};--pulse-delay:${(idx * 0.45).toFixed(2)}s" />
          <circle class="cr-synapse-joint" cx="${mx}" cy="${my}" r="2.8" style="fill:${color}" />
        </g>
      `;
    }).join("");
    return `<g class="cr-hex-synapses" aria-hidden="true">${spokes}</g>`;
  }

  function render(timelineHtml, options = {}) {
    const omitSkills = options && typeof options === "object" && "omitSkills" in options
      ? Boolean(options.omitSkills)
      : true;
    const impactRows = [
      ["cloud", "violet", "solutions", "Business Impact", "AI, automation and solution design"],
      ["people", "blue", "insurance", "Domain Expertise", "Insurance, claims and enterprise systems"],
      ["data", "cyan", "insurance", "Integration & Data", "Interfaces, data mapping and reporting"],
      ["code", "teal", "hardware", "Engineering", "Infrastructure, networks and technical foundations"]
    ];

    const skillsSectionHtml = omitSkills
      ? ""
      : `
        <section class="cr-skills" aria-labelledby="cr-skills-heading">
          <div class="cr-skills-copy"><p class="cr-kicker"><span class="cr-kicker-dot" aria-hidden="true"></span>04 / SKILLS &amp; CAPABILITIES</p><h2 id="cr-skills-heading">Bringing layers <em>together.</em></h2><p>Business context, technical depth, and practical delivery — connected through experience.</p><div class="cr-filters" role="group" aria-label="Filter capability areas">${[["all", "All skills"], ["technical", "Technical"], ["domain", "Domain"], ["ai", "AI & emerging"], ["tools", "Tools"], ["collaboration", "Collaboration"]].map(([id, label]) => `<button type="button" data-cr-filter="${id}" aria-pressed="${id === "all"}">${label}</button>`).join("")}</div></div>
          <div class="cr-constellation"><svg viewBox="0 0 360 240" role="group" aria-label="Connected capability areas">${hexagon(180, 48, "AI & Automation", "ai", "violet", "cloud")}${hexagon(96, 92, "Engineering", "infrastructure", "teal", "code")}${hexagon(264, 92, "Data & Integration", "data", "cyan", "data")}${hexagon(96, 179, "Insurance Domain", "insurance", "gold", "domain")}${hexagon(264, 179, "Platform Design", "development", "violet", "hardware")}${hexagon(180, 136, "NEXUS", "nexus", "cyan", "infinity")}${renderConstellationSynapses()}</svg><span>Different experiences. A stronger whole.</span></div>
          <div class="cr-evidence"><p class="cr-kicker">SKILLS IN PRACTICE</p><ul>${CAPABILITIES.map(c => `<li data-cr-capability="${c.groups.join(" ")}" data-cr-cap-id="${c.id}" class="theme-${c.theme}"><a href="${c.href}">${icon(c.icon)}<span><strong>${c.title}</strong><small>${c.evidence}</small></span>${icon("arrow")}</a></li>`).join("")}</ul><p class="cr-filter-status" role="status" aria-live="polite"></p></div>
          <aside class="cr-compound"><div class="cr-compound-top">${icon("growth")}<span class="cr-compound-badge">SINCE SEPT 2006</span></div><strong>20+ <span>Years</span></strong><p>of compounding experience, applied to what’s next.</p><a href="#home-connect"><span>Build a tailored résumé</span>${icon("arrow")}</a></aside>
        </section>`;

    return `
      <div class="career-reference" data-active-layer="hardware">
        <header class="cr-hero" data-cr-hero>
          <div class="cr-intro">
            <p class="cr-kicker"><span class="cr-kicker-dot" aria-hidden="true" hidden></span><span class="cr-kicker-num" hidden>03 / </span>CAREER JOURNEY</p>
            <h1 id="cr-hero-title" tabindex="-1">From the <span class="cr-hl-metal">metal</span> to the <span class="cr-hl-cloud">cloud.</span></h1>
            <p class="cr-lead">A continuous journey combining hands-on infrastructure, domain expertise, solution design and AI to build practical systems.</p>
            <dl class="cr-metrics" aria-label="Career at a glance" hidden>
              <div><dt>20+</dt><dd>Years in tech<small>Since Sept 2006</small></dd></div>
              <div><dt>3</dt><dd>Career chapters<small>Built in layers</small></dd></div>
              <div><dt>${icon("infinity")}</dt><dd>Always learning<small>Still building</small></dd></div>
              <div><dt>1</dt><dd>Unifying vision<small>Practical solutions</small></dd></div>
            </dl>
          </div>
          <aside class="cr-hero-aside" aria-label="Career chapters overview">
            <p class="cr-aside-copy">Four chapters. One continuous path.<br>Each stage built on the last, shaping how I solve problems today.</p>
            <button type="button" class="cr-explore-timeline-btn" data-cr-open-archive>
              <span>Explore the full timeline</span>
              <span aria-hidden="true">&rarr;</span>
            </button>
          </aside>
          <div class="cr-art" data-cr-art role="img" aria-label="Conceptual illustration: hardware and support form the foundation, insurance systems the middle layer, and AI and solution design the upper layer." hidden>
            <div class="cr-art-aura" aria-hidden="true"></div>
            <div class="cr-art-stage">
              <img src="assets/career-layers-v1.webp" width="1200" height="800" alt="" loading="lazy" decoding="async" fetchpriority="low">
              <svg class="cr-art-telemetry" viewBox="0 0 1200 800" aria-hidden="true">
                <defs>
                  <linearGradient id="cr-ascent-grad" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stop-color="#55e6ca" stop-opacity="0.85"/>
                    <stop offset="50%" stop-color="#52bcff" stop-opacity="0.9"/>
                    <stop offset="100%" stop-color="#bd8bff" stop-opacity="0.95"/>
                  </linearGradient>
                </defs>
                <g class="cr-ascent-conduits">
                  <path class="cr-conduit-track" d="M350 610 L350 420 L350 220" />
                  <path class="cr-conduit-pulse" d="M350 610 L350 420 L350 220" style="--delay:0s" />
                  <path class="cr-conduit-track" d="M600 690 L600 475 L600 255" />
                  <path class="cr-conduit-pulse" d="M600 690 L600 475 L600 255" style="--delay:0.8s" />
                  <path class="cr-conduit-track" d="M850 600 L850 415 L850 215" />
                  <path class="cr-conduit-pulse" d="M850 600 L850 415 L850 215" style="--delay:1.6s" />
                </g>
                <g class="cr-floor-beacons">
                  <circle class="cr-beacon theme-violet" cx="600" cy="255" r="6" />
                  <circle class="cr-beacon theme-blue" cx="600" cy="475" r="6" />
                  <circle class="cr-beacon theme-teal" cx="600" cy="690" r="6" />
                </g>
              </svg>
            </div>
            <span class="cr-art-caption">CONCEPTUAL ILLUSTRATION</span>
          </div>
          <ul class="cr-impact" aria-label="How the layers connect" hidden>
            ${impactRows.map(([symbol, theme, layerId, title, copy]) => `<li class="theme-${theme}" data-cr-layer-trigger="${layerId}" tabindex="0"><span class="cr-impact-icon">${icon(symbol)}</span><div><strong>${title.replaceAll("&", "&amp;")}</strong><p>${copy}</p></div></li>`).join("")}
          </ul>
        </header>

        <section class="cr-journey" aria-label="Career chapters" id="career-reference-chapters" tabindex="-1">
          <div class="cr-v2-timeline" aria-hidden="true">
            <span class="cr-v2-timeline-line"></span>
          </div>
          <ol class="cr-milestones">
            ${CHAPTERS.map((c, i) => `<li class="theme-${c.theme}${i === 0 ? " is-active" : ""}" data-cr-milestone="${c.id}" data-cr-layer-trigger="${c.id}" tabindex="0" role="button" aria-pressed="${i === 0 ? "true" : "false"}" aria-controls="career-chapter-details" aria-label="Open chapter ${i + 1}: ${c.title}"><span class="cr-node" aria-hidden="true"><span class="cr-node-core"></span></span><span class="cr-node-stem" aria-hidden="true"></span><div class="cr-milestone-copy"><strong>${i + 1}. ${c.milestoneLabel.replaceAll("&", "&amp;")}</strong><span>${c.period}</span></div></li>`).join("")}
          </ol>
          <div class="cr-chapter-cards">
            ${CHAPTERS.map((c, i) => `<article class="cr-chapter theme-${c.theme}${i === 0 ? " is-selected" : ""}" data-cr-chapter-card="${c.id}" data-cr-layer-trigger="${c.id}" data-cr-layer-hover="${c.id}" tabindex="0" role="button" aria-pressed="${i === 0 ? "true" : "false"}"><div class="cr-chapter-main"><span class="cr-chapter-thumb"><img src="assets/${c.image}" width="148" height="224" loading="lazy" alt=""></span><span class="cr-chapter-copy"><span class="cr-chapter-icon" aria-hidden="true">${icon(c.icon)}</span><span class="cr-period">${c.period}</span><strong>${c.title.replaceAll("&", "&amp;")}</strong><span class="cr-description">${c.description}</span><span class="cr-tags">${c.tags.map(t => `<span>${t.replaceAll("&", "&amp;")}</span>`).join("")}</span></span></div><div class="cr-chapter-footer"><span class="cr-card-status" data-cr-card-status>${i === 0 ? "Selected" : "Explore"}</span><span class="cr-card-line" aria-hidden="true"></span><span class="cr-card-arrow" aria-hidden="true">${icon("arrow")}</span></div></article>`).join("")}
          </div>
          <div class="cr-selected-chapter-panel" id="career-chapter-details" data-cr-selected-panel data-panel-theme="metal">
            ${CHAPTERS.map((c, i) => `
              <article class="cr-detail-pane theme-${c.theme}" data-cr-detail-pane="${c.id}"${i === 0 ? "" : " hidden"}>
                <div class="cr-detail-media">
                  <img src="assets/${c.detailImage}" width="600" height="498" loading="lazy" alt="${c.detailAlt}">
                </div>
                <div class="cr-detail-body">
                  <div class="cr-detail-header">
                    <div class="cr-detail-title-group">
                      <span class="cr-detail-icon-box" aria-hidden="true">${icon(c.icon)}</span>
                      <div class="cr-detail-headings">
                        <span class="cr-detail-period">${c.period}</span>
                        <h3 class="cr-detail-title">${c.title.replaceAll("&", "&amp;")}</h3>
                      </div>
                    </div>
                    <div class="cr-detail-controls">
                      <span class="cr-chapter-counter" data-cr-chapter-counter>Chapter ${i + 1} of ${CHAPTERS.length}</span>
                      <button type="button" class="cr-chapter-step-btn" data-cr-chapter-step="-1" aria-label="Previous chapter">${icon("chevLeft")}</button>
                      <button type="button" class="cr-chapter-step-btn" data-cr-chapter-step="1" aria-label="Next chapter">${icon("chevRight")}</button>
                    </div>
                  </div>
                  <p class="cr-detail-narrative">${c.narrativeHtml}</p>
                  <ul class="cr-detail-highlights" aria-label="${c.title.replaceAll("&", "&amp;")} highlights">
                    ${c.highlights.map(([hlIcon, hlText]) => `<li><span class="cr-hl-icon" aria-hidden="true">${icon(hlIcon)}</span><span class="cr-hl-text">${hlText.replaceAll("&", "&amp;")}</span></li>`).join("")}
                  </ul>
                  <div class="cr-detail-projects">
                    <p class="cr-detail-projects-kicker">KEY PROJECTS FROM THIS CHAPTER</p>
                    <div class="cr-detail-projects-grid">
                      ${c.projectCards.map(p => `<a class="cr-detail-proj-card" href="#projects/${p.slug}" data-home-select-build="${p.slug}"><span class="cr-detail-proj-thumb"><img src="${p.thumb}" width="124" height="88" loading="lazy" alt=""></span><span class="cr-detail-proj-copy"><strong>${p.title.replaceAll("&", "&amp;")}</strong><span>${p.summary.replaceAll("&", "&amp;")}</span></span><span class="cr-detail-proj-ext" aria-hidden="true">${icon("extlink")}</span></a>`).join("")}
                    </div>
                  </div>
                </div>
              </article>
            `).join("")}
          </div>
        </section>${skillsSectionHtml}
        <details class="cr-archive"><summary><span>Explore the full career timeline</span><span class="cr-archive-cta">Inspect 4 chapters &amp; 13 case links ${icon("arrow")}</span></summary><div class="career-body-wrap">${timelineHtml}</div></details>
      </div>`;
  }

  function mount(section) {
    const rootEl = section.querySelector(".career-reference") || section;
    const reducedMotion = () => typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function setActiveLayer(layerId) {
      if (!layerId) return;
      rootEl.setAttribute("data-active-layer", layerId);
    }

    function activateChapterCard(chapterId, shouldScroll = false) {
      if (!chapterId) return;
      const chapterObj = CHAPTERS.find(c => c.id === chapterId) || CHAPTERS[0];
      setActiveLayer(chapterObj.id);

      section.querySelectorAll("[data-cr-milestone]").forEach(ms => {
        const isCurrent = ms.getAttribute("data-cr-milestone") === chapterObj.id;
        ms.classList.toggle("is-active", isCurrent);
        ms.setAttribute("aria-pressed", String(isCurrent));
      });

      section.querySelectorAll("[data-cr-chapter-card]").forEach(card => {
        const isSelected = card.getAttribute("data-cr-chapter-card") === chapterObj.id;
        card.classList.toggle("is-selected", isSelected);
        card.setAttribute("aria-pressed", isSelected ? "true" : "false");
        const statusEl = card.querySelector("[data-cr-card-status]");
        if (statusEl) statusEl.textContent = isSelected ? "Selected" : "Explore";
      });

      const panelEl = section.querySelector("[data-cr-selected-panel]");
      if (panelEl) {
        panelEl.setAttribute("data-panel-theme", chapterObj.theme);
        panelEl.querySelectorAll("[data-cr-detail-pane]").forEach(pane => {
          pane.hidden = pane.getAttribute("data-cr-detail-pane") !== chapterObj.id;
        });
        if (shouldScroll) {
          panelEl.scrollIntoView({
            behavior: reducedMotion() ? "instant" : "smooth",
            block: "nearest"
          });
        }
      }
    }

    section.addEventListener("pointerover", event => {
      const hex = event.target.closest("[data-hex-cat]");
      if (hex) {
        const cat = hex.getAttribute("data-hex-cat");
        rootEl.setAttribute("data-hover-hex", cat || "");
      }
      const capRow = event.target.closest("[data-cr-cap-id]");
      if (capRow) {
        const capId = capRow.getAttribute("data-cr-cap-id");
        rootEl.setAttribute("data-hover-hex", capId || "");
      }
    });

    section.addEventListener("pointerout", event => {
      if (event.target.closest("[data-hex-cat], [data-cr-cap-id]")) {
        rootEl.removeAttribute("data-hover-hex");
      }
    });

    section.addEventListener("click", event => {
      const openArchiveBtn = event.target.closest("[data-cr-open-archive]");
      if (openArchiveBtn) {
        const archiveEl = section.querySelector(".cr-archive");
        if (archiveEl) {
          archiveEl.open = true;
          archiveEl.scrollIntoView({
            behavior: reducedMotion() ? "instant" : "smooth",
            block: "start"
          });
        }
        return;
      }

      const stepBtn = event.target.closest("[data-cr-chapter-step]");
      if (stepBtn) {
        const delta = parseInt(stepBtn.getAttribute("data-cr-chapter-step") || "1", 10) || 1;
        const currentId = rootEl.getAttribute("data-active-layer") || "hardware";
        const currentIdx = Math.max(0, CHAPTERS.findIndex(c => c.id === currentId));
        const nextIdx = (currentIdx + delta + CHAPTERS.length) % CHAPTERS.length;
        activateChapterCard(CHAPTERS[nextIdx].id, false);
        return;
      }

      const filter = event.target.closest("[data-cr-filter]");
      if (filter) {
        const value = filter.dataset.crFilter;
        section.querySelectorAll("[data-cr-filter]").forEach(button => button.setAttribute("aria-pressed", String(button === filter)));
        let count = 0;
        section.querySelectorAll("[data-cr-capability]").forEach(row => {
          row.hidden = value !== "all" && !row.dataset.crCapability.split(" ").includes(value);
          if (!row.hidden) count++;
        });
        section.querySelectorAll("[data-hex-groups], [data-synapse-groups]").forEach(node => {
          const groups = (node.getAttribute("data-hex-groups") || node.getAttribute("data-synapse-groups") || "").split(" ");
          const active = value === "all" || groups.includes("all") || groups.includes(value);
          node.setAttribute("data-filter-dim", active ? "false" : "true");
        });
        const statusEl = section.querySelector(".cr-filter-status");
        if (statusEl) statusEl.textContent = `${count} capability ${count === 1 ? "area" : "areas"} shown.`;
        return;
      }

      const layerTrigger = event.target.closest("[data-cr-layer-trigger]");
      if (layerTrigger && !event.target.closest("a")) {
        const chapterId = layerTrigger.getAttribute("data-cr-layer-trigger");
        const isFromHero = Boolean(layerTrigger.closest(".cr-hero"));
        activateChapterCard(chapterId, isFromHero);
        return;
      }
    });

    section.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const trigger = event.target.closest("[data-cr-milestone], [data-cr-chapter-card], .cr-impact li[data-cr-layer-trigger]");
      if (trigger && !event.target.closest("a, button")) {
        event.preventDefault();
        const id = trigger.getAttribute("data-cr-milestone") || trigger.getAttribute("data-cr-chapter-card") || trigger.getAttribute("data-cr-layer-trigger");
        activateChapterCard(id, Boolean(trigger.closest(".cr-hero")));
      }
    });
  }

  return Object.freeze({ render, mount, CHAPTERS, CAPABILITIES });
});
