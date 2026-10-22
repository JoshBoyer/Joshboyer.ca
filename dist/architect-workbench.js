/* Mobile-Friendly Cinematic 3D Exploded-View Hero & Timeline Videos with Single-Active Popout Card Below Each Video. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.ArchitectWorkbench = api;
    api.mount();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ARCH_NODES = Object.freeze([
    {
      id: "support",
      code: "01 · Support",
      label: "Hardware & First-Call Resolution",
      period: "Dell · 2006–2007",
      phaseIndex: 0,
      caseRoute: "#projects/dell",
      status: "Foundation",
      summary: "Started on Dell's Gloves Off team—taking the time to diagnose the real hardware or software fault on the first call so clients didn't have to call back."
    },
    {
      id: "systems",
      code: "02 · Systems",
      label: "Networks & Server Migrations",
      period: "Harris · 2007–2009",
      phaseIndex: 1,
      caseRoute: "#projects/foundations",
      status: "Repeatable Delivery",
      summary: "Moved from support into server racks, firewalls, and repeatable Small Business Server migrations—separating email, identity, and network roles without downtime."
    },
    {
      id: "infrastructure",
      code: "03 · Infrastructure",
      label: "Headquarters Build & Virtualization",
      period: "Grenville · 2009–2022",
      phaseIndex: 2,
      caseRoute: "#projects/headquarters",
      status: "Delivered Move",
      summary: "Guided headquarters infrastructure from floorplan design through the physical move—covering networking, AV, security, cooling, backup power, and VMware virtualization."
    },
    {
      id: "analysis",
      code: "04 · Analysis & Design",
      label: "Broker Workflows, Rules & Integrations",
      period: "Grenville · Mid-2010s–2022",
      phaseIndex: 3,
      caseRoute: "#projects/workflows",
      status: "Production Systems",
      summary: "Designed and implemented P&C rating, underwriting, and renewal rules—connecting broker portals and desktop tools so standard policies processed automatically and exceptions reached underwriters."
    },
    {
      id: "solutions",
      code: "05 · Architecture",
      label: "Claims Integration, SQL & Continuity",
      period: "Medavie · 2022–present",
      phaseIndex: 4,
      caseRoute: "#projects/claims",
      status: "Current Work",
      summary: "Connecting provider registries, takeover claims history, financial SQL reconciliation, and daily reporting feeds so critical operations stay accurate while systems evolve."
    },
    {
      id: "nexus",
      code: "06 · AI Governance",
      label: "NEXUS — Governed AI Work System",
      period: "Capstone · Active Development",
      phaseIndex: 5,
      caseRoute: "#projects/nexus",
      status: "Active Capstone",
      summary: "My independent software capstone: applying 20 years of systems, rules, and verification experience to make AI-assisted work predictable, reviewable, and recoverable."
    }
  ]);

  /* 12 Interactive 3D Parts ordered from BOTTOM (Layer 01: Support) to TOP (Layer 06: AI Governance)
     mapped directly onto the 1536x1024 Cinematic Exploded-View Hero Video.
     Zero overlapping popups: only ONE popout card is shown below the video at a time! */
  const HERO_ASCENT_TIERS = Object.freeze([
    {
      tierIndex: 0,
      num: "01",
      pillLabel: "Hardware",
      kicker: "01 · HARDWARE",
      eraKey: "metal",
      eraCode: "M",
      eraName: "THE METAL",
      eraYears: "2006",
      eraOrg: "Dell Technologies",
      focusTranslateY: -34.5,
      shortTitle: "Understanding how technology works.",
      cardTags: "Compute · Diagnostics · Endpoints",
      title: "Hardware Foundations & Fault Isolation",
      sub: "Dell · Latitude, OptiPlex & Board Diagnostics",
      inspectorTitle: "Understanding How Technology Works",
      inspectorLead: "Starting on Dell's Gloves Off support team gave me a permanent habit: isolate the real fault at the physical and component level rather than treating symptoms.",
      accentTheme: "metal",
      explodeY: 0,
      anchorTopPct: 89.2,
      clipPath: "polygon(47.5% 86.2%, 82% 80.0%, 82% 99.5%, 13% 99.5%, 13% 80.0%)",
      iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4"/></svg>`,
      highlights: [
        { icon: "cpu", title: "Component-level fault isolation", sub: "Motherboard, PSU, thermal and bus diagnostics across business laptops and desktops" },
        { icon: "check", title: "First-call resolution focus", sub: "Dell Gloves Off team empowered to spend the time needed to solve the root issue" },
        { icon: "wrench", title: "Structured troubleshooting discipline", sub: "Separating hardware failure from OS, driver and network configuration faults" },
        { icon: "shield", title: "Operational reliability mindset", sub: "Seeing firsthand how physical failure modes cascade into higher software layers" }
      ],
      projects: [
        { icon: "folder", title: "Dell Latitude & OptiPlex Support", sub: "Gloves Off hardware escalation and root-cause fault isolation (2006)" },
        { icon: "folder", title: "Workstation & Field Rollouts", sub: "Corporate desktop, laptop and peripheral lifecycle replacements" }
      ],
      technologies: [
        { icon: "code", title: "Enterprise Endpoints", sub: "Dell Latitude, OptiPlex, BIOS/POST diagnostics, modular chassis repair" },
        { icon: "code", title: "Hardware Architecture", sub: "Power rails, thermal assemblies, SATA/RAID storage, PCIe & memory buses" }
      ],
      featuredProject: {
        badge: "DELL · 2006",
        title: "Gloves Off Hardware Support & Root-Cause Diagnostics",
        desc: "Supported commercial Latitude laptops and OptiPlex desktops with the mandate to stay with the client, isolate the real hardware fault and reduce repeat callbacks.",
        stats: [
          { val: "Gloves Off", label: "Escalation team" },
          { val: "First-call", label: "Resolution focus" },
          { val: "Root-cause", label: "Component isolation" }
        ],
        href: "#projects/dell"
      }
    },
    {
      tierIndex: 1,
      num: "02",
      pillLabel: "Systems",
      kicker: "02 · SYSTEMS",
      eraKey: "metal",
      eraCode: "M",
      eraName: "THE METAL",
      eraYears: "2007 – 2009",
      eraOrg: "Harris Computer Services",
      focusTranslateY: -21.5,
      shortTitle: "Making technology work reliably.",
      cardTags: "AD · Exchange · Firewalls · Migrations",
      title: "Systems Administration & Service Dependencies",
      sub: "AD, Exchange, File/Print, BES, Firewalls & Migrations",
      inspectorTitle: "Making Systems Operate Reliably",
      inspectorLead: "From NOC monitoring to administering Active Directory, Exchange, file/print, BlackBerry Enterprise Server and firewalls—learning how core services depend on one another.",
      accentTheme: "metal",
      explodeY: 0,
      anchorTopPct: 77.4,
      clipPath: "polygon(47.5% 73.2%, 82% 67.5%, 82% 79.5%, 47.5% 86.4%, 13% 79.5%, 13% 67.5%)",
      iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>`,
      highlights: [
        { icon: "server", title: "Repeatable SBS swing migrations", sub: "Staged Active Directory, Exchange and data transitions into separated server roles" },
        { icon: "shield", title: "Identity, mail & mobile administration", sub: "Active Directory, Group Policy, Exchange, File/Print and BlackBerry Enterprise Server" },
        { icon: "network", title: "Firewalls, switches & assessments", sub: "Client environment assessments, rack installations and managed network cutovers" },
        { icon: "check", title: "Zero-surprise cutover planning", sub: "Mapping service dependencies before touching live production servers" }
      ],
      projects: [
        { icon: "folder", title: "Repeatable Server Swing Migrations", sub: "Harris Computer Services — decoupling bundled SBS into dedicated roles (2007–2009)" },
        { icon: "folder", title: "NOC & Multi-Client Systems Support", sub: "Monitoring, firewall/switch administration and rack deployments" }
      ],
      technologies: [
        { icon: "code", title: "Directory & Messaging", sub: "Active Directory, Group Policy (GPO), Microsoft Exchange, BES, File/Print" },
        { icon: "code", title: "Network & Security", sub: "Firewalls, VLAN switching, DNS/DHCP, staged swing-migration runbooks" }
      ],
      featuredProject: {
        badge: "HARRIS · 2007–2009",
        title: "Repeatable Small Business Server Swing Migrations",
        desc: "Transitioned coupled Small Business Server environments into separated Active Directory and Exchange servers while preserving live identity, mail and file continuity.",
        stats: [
          { val: "Staged", label: "Swing methodology" },
          { val: "AD + Mail", label: "Role separation" },
          { val: "Repeatable", label: "Client runbooks" }
        ],
        href: "#projects/foundations"
      }
    },
    {
      tierIndex: 2,
      num: "03",
      pillLabel: "Infrastructure",
      kicker: "03 · INFRASTRUCTURE",
      eraKey: "metal-business",
      eraCode: "M→B",
      eraName: "METAL → BUSINESS",
      eraYears: "2009 – 2022",
      eraOrg: "Grenville Mutual",
      focusTranslateY: -7.5,
      shortTitle: "Building the environments technology depends on.",
      cardTags: "Racks · Virtualization · Power · Scale",
      title: "Enterprise Infrastructure & Virtualization",
      sub: "Grenville · 42U Racks, Cat6A, Assessments, UPS & ESXi",
      inspectorTitle: "Building Resilient Environments",
      inspectorLead: "Taking a new corporate headquarters from technical design through build and physical move—connecting networking, security, cooling, resilient power and ESXi virtualization.",
      accentTheme: "metal-blue",
      explodeY: 0,
      anchorTopPct: 65.0,
      clipPath: "polygon(47.5% 58.2%, 82% 53.5%, 82% 66.2%, 47.5% 73.5%, 13% 66.2%, 13% 53.5%)",
      iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z"/><path d="M12 12 4 7.5M12 12l8-4.5M12 12v9"/></svg>`,
      highlights: [
        { icon: "building", title: "Headquarters technical build & move", sub: "End-to-end design and transition across networking, AV, physical security and cooling" },
        { icon: "bolt", title: "Resilient power & facility continuity", sub: "UPS battery sizing and standby generator considerations integrated into the plan" },
        { icon: "layers", title: "Bare-metal blade centre to VMware ESXi", sub: "Consolidating physical blade servers into a resilient virtualized hypervisor cluster" },
        { icon: "check", title: "Physical-to-operational alignment", sub: "Ensuring facility infrastructure matched how the insurance business actually operated" }
      ],
      projects: [
        { icon: "folder", title: "Headquarters Technical Build & Move", sub: "Grenville Mutual Insurance — greenfield facility infrastructure & cutover" },
        { icon: "folder", title: "Blade Centre to ESXi Virtualization", sub: "Datacenter consolidation and high-availability host transition" }
      ],
      technologies: [
        { icon: "code", title: "Virtualization & Compute", sub: "VMware ESXi, blade centre hardware, SAN storage, 42U rack architecture" },
        { icon: "code", title: "Facility & Network", sub: "Structured Cat6A cabling, UPS & generator power continuity, HVAC cooling, AV/security" }
      ],
      featuredProject: {
        badge: "GRENVILLE · 2009–2022",
        title: "Headquarters Infrastructure Design, Build & Virtualization",
        desc: "Led the technical infrastructure design, build and physical move for Grenville's headquarters while transitioning bare-metal blade servers to VMware ESXi.",
        stats: [
          { val: "HQ Move", label: "Design to cutover" },
          { val: "UPS + Gen", label: "Resilient power" },
          { val: "ESXi", label: "Virtualization" }
        ],
        href: "#projects/headquarters"
      }
    },
    {
      tierIndex: 3,
      num: "04",
      pillLabel: "Integration",
      kicker: "04 · INTEGRATION",
      eraKey: "business",
      eraCode: "B",
      eraName: "THE BUSINESS",
      eraYears: "Mid-2010s – 2022",
      eraOrg: "Grenville Mutual",
      focusTranslateY: 6.5,
      shortTitle: "Connecting systems, data and processes.",
      cardTags: "APIs · Data Flows · Automation",
      title: "Insurance Rules & Broker Platform Integration",
      sub: "Grenville · P&C Rules, SOAP/XML, CSIO & REST APIs",
      inspectorTitle: "Connecting Systems, Data & Business Rules",
      inspectorLead: "Personally designing and implementing P&C rating, underwriting and renewal rules while connecting broker portals and BMS platforms across SOAP/XML, CSIO and REST interfaces.",
      accentTheme: "blue",
      explodeY: 0,
      anchorTopPct: 50.6,
      clipPath: "polygon(47.5% 43.2%, 82% 39.2%, 82% 51.8%, 47.5% 58.5%, 13% 51.8%, 13% 39.2%)",
      iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
      highlights: [
        { icon: "bolt", title: "Renewal eligibility & exception routing", sub: "~80% residential, ~60% commercial, ~40% farm renewal automation (user-reported)" },
        { icon: "code", title: "P&C rating & underwriting rule design", sub: "Personal design and implementation of policy inquiry, new business and change rules" },
        { icon: "network", title: "Broker BMS & portal integrations", sub: "Mapping CSIO/ACORD payloads across SOAP/XML, REST and Bravado/Bravado1 bridges" },
        { icon: "check", title: "Actionable validation & human referral", sub: "Shaping clear portal messages so brokers could self-correct or refer edge cases" }
      ],
      projects: [
        { icon: "folder", title: "Renewal Rules & Exception Framework", sub: "Separating straight-through eligible renewals from human underwriter review" },
        { icon: "folder", title: "Broker Workflows: Inquiry, New Business & Changes", sub: "End-to-end SOAP/XML and REST payload mapping across TAM and Epic" }
      ],
      technologies: [
        { icon: "code", title: "Integration Protocols", sub: "SOAP/XML, REST APIs, CSIO / ACORD standards, Bravado/Bravado1, authenticated upload" },
        { icon: "code", title: "Underwriting & Policy Logic", sub: "Residential, Commercial & Farm/Agri rating rules, change comparison, eligibility gates" }
      ],
      featuredProject: {
        badge: "GRENVILLE · 2010s–2022",
        title: "Renewal Automation & Underwriting Exception Routing",
        desc: "Designed and implemented renewal eligibility rules that automated standard renewals while routing complex risks to human underwriters with clear reasons.",
        stats: [
          { val: "~80%", label: "Residential renewals" },
          { val: "~60%", label: "Commercial renewals" },
          { val: "~40%", label: "Farm/Agri (user-reported)" }
        ],
        href: "#projects/renewals"
      }
    },
    {
      tierIndex: 4,
      num: "05",
      pillLabel: "Solutions",
      kicker: "05 · SOLUTIONS",
      eraKey: "business",
      eraCode: "B",
      eraName: "THE BUSINESS",
      eraYears: "2022 – Present",
      eraOrg: "Medavie",
      focusTranslateY: 20.5,
      shortTitle: "Designing solutions to business problems.",
      cardTags: "Analysis · Architecture · Delivery",
      title: "Enterprise Claims Solution Design",
      sub: "Medavie · Provider Sync, Takeover XML, SQL & ETL",
      inspectorTitle: "Designing Solutions to Business Problems",
      inspectorLead: "Looking beyond the initial request to uncover missed requirements, map complex provider and claims data flows, and guide practical delivery with engineering and business teams.",
      accentTheme: "blue",
      explodeY: 0,
      anchorTopPct: 35.8,
      clipPath: "polygon(47.5% 27.5%, 82% 24.5%, 82% 37.2%, 47.5% 43.5%, 13% 37.2%, 13% 24.5%)",
      iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2Z"/></svg>`,
      highlights: [
        { icon: "network", title: "Provider registry synchronization", sub: "Solution review, gap analysis, field mappings and scheduled event-table REST sync requirements" },
        { icon: "wrench", title: "Production takeover-history XML tooling", sub: "Researched, documented and guided Excel/VB/XML tooling to validate prior-insurer history" },
        { icon: "database", title: "Hand-written claims SQL & reconciliation", sub: "Querying complex claims schemas to verify financial reports and isolate edge-case discrepancies" },
        { icon: "layers", title: "ETL reporting-continuity discovery", sub: "Uncovered that a 'reporting' request was a daily ETL feed; completed continuity mapping" }
      ],
      projects: [
        { icon: "folder", title: "Provider Registry Integration & Sync", sub: "Medavie — solution review, mapping and scheduled synchronization requirements" },
        { icon: "folder", title: "Reporting Continuity & ETL Discovery", sub: "Completed analysis/design preserving downstream daily feeds during platform change" }
      ],
      technologies: [
        { icon: "code", title: "Claims & Data Architecture", sub: "Hand-written SQL, XML schema validation, Excel/VB tooling, financial reconciliation" },
        { icon: "code", title: "Enterprise Integration Design", sub: "REST consumers, scheduled event tables, B2B provider mappings, ETL continuity specs" }
      ],
      featuredProject: {
        badge: "MEDAVIE · 2022–PRESENT",
        title: "Provider Registry Integration & ETL Continuity Analysis",
        desc: "Worked alongside architects on provider synchronization mappings and uncovered hidden daily ETL dependencies to keep downstream client feeds intact during change.",
        stats: [
          { val: "REST + Sync", label: "Provider mapping" },
          { val: "Daily ETL", label: "Continuity design" },
          { val: "SQL", label: "Claims verification" }
        ],
        href: "#projects/claims"
      }
    },
    {
      tierIndex: 5,
      num: "06",
      pillLabel: "Business Outcomes",
      kicker: "06 · BUSINESS OUTCOMES",
      eraKey: "cloud",
      eraCode: "C",
      eraName: "THE CLOUDS & AI",
      eraYears: "Today",
      eraOrg: "Cloud, AI & NEXUS",
      focusTranslateY: 32.5,
      shortTitle: "Turning technology into measurable value.",
      cardTags: "Strategy · Efficiency · Risk · Growth",
      title: "Business Outcomes & Governed AI",
      sub: "Continuity, Reconciliation & Governed AI (NEXUS)",
      inspectorTitle: "Creating Business Value with Technology",
      inspectorLead: "I focus on applying technology to solve real business problems — improving efficiency, reducing operational risk, protecting data continuity and enabling governed AI workflows.",
      accentTheme: "green",
      explodeY: 0,
      anchorTopPct: 20.5,
      clipPath: "polygon(13% 1%, 82% 1%, 82% 21.2%, 47.5% 27.8%, 13% 21.2%)",
      iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18"/><rect x="5" y="14" width="3" height="6" rx="0.6"/><rect x="10.5" y="10" width="3" height="10" rx="0.6"/><rect x="16" y="6" width="3" height="14" rx="0.6"/><path d="M5 10 10.5 6l3.5 2 5-5"/><path d="M15.5 3H19v3.5"/></svg>`,
      highlights: [
        { icon: "check", title: "Financial reconciliation & data integrity", sub: "Validating prior-insurer takeover history and balancing financial reports before go-live" },
        { icon: "chart", title: "Claims & underwriting process efficiency", sub: "Automating standard policy renewals and streamlining complex claims-history onboarding" },
        { icon: "cloud", title: "End-to-end architectural continuity", sub: "Protecting downstream B2B, provider and ETL consumers while core platforms evolve" },
        { icon: "sparkle", title: "Governed AI-assisted workflows (NEXUS)", sub: "Scoped context, explainable routing and recoverable execution in active development" }
      ],
      projects: [
        { icon: "folder", title: "Takeover-History XML & Reconciliation Tooling", sub: "Medavie — production/team-adopted tooling for clean group claims onboarding" },
        { icon: "folder", title: "NEXUS — Governed AI Work System", sub: "Independent capstone applying architectural boundaries to AI execution" }
      ],
      technologies: [
        { icon: "code", title: "Governance & Verification", sub: "Scoped AI context (NEXUS), deterministic validation gates, audit-ready SQL reconciliation" },
        { icon: "code", title: "Full-Stack Perspective", sub: "Hardware → Systems → Infrastructure → Integration → Solutions → Business Value" }
      ],
      featuredProject: {
        badge: "INSURANCE · 2022–PRESENT",
        title: "Takeover-History XML Tooling & Financial Reconciliation",
        desc: "Researched, documented and guided development of a production Excel/VB/XML tool to validate inconsistent takeover history and reconcile financial reports.",
        stats: [
          { val: "Production", label: "Team-adopted tool" },
          { val: "XML + SQL", label: "Validated & reconciled" },
          { val: "NEXUS", label: "Governed AI capstone" }
        ],
        href: "#projects/takeover"
      }
    }
  ]);

  /* 12 Interactive 3D Parts ordered strictly from BOTTOM (Tier 01: Support) to TOP (Tier 06: AI Governance)
     mapped directly onto the 1536x1024 6-Tier Exploded Architectural Tower. */
  const EXPLODED_PARTS = Object.freeze([
    {
      id: "laptops",
      num: "01",
      tierIndex: 0,
      layerNum: "Tier 01 · Foundation (Bottom)",
      code: "01 · Latitude Laptops",
      title: "Latitude Laptops & Component Fault Isolation",
      period: "Dell · 2006–2007",
      phaseIndex: 0,
      caseRoute: "#projects/dell",
      archNodeId: "support",
      pinX: 755,
      pinY: 832,
      hitR: 68,
      motionType: "laptop",
      summary: "Bottom of the stack: diagnosed business Latitude laptop faults across LCD panels, system boards, copper thermal modules, and driver trees on Dell's Gloves Off team.",
      whatIDid: "Mobile hardware & OS fault isolation without rushing clients off the phone"
    },
    {
      id: "desktops",
      num: "02",
      tierIndex: 0,
      layerNum: "Tier 01 · Foundation (Bottom)",
      code: "01 · OptiPlex & Boards",
      title: "OptiPlex Desktops, PSU Rails & Motherboards",
      period: "Dell · 2006–2007",
      phaseIndex: 0,
      caseRoute: "#projects/dell",
      archNodeId: "support",
      pinX: 1011,
      pinY: 806,
      altPinX: 927,
      altPinY: 842,
      hitR: 72,
      motionType: "desktop",
      summary: "Hands-on OptiPlex desktop diagnostics—tracing power supply rails, SATA/IDE storage buses, RAM seating, and motherboard POST codes to resolve faults on the first call.",
      whatIDid: "Component-level desktop diagnostics, hardware isolation & first-call resolution"
    },
    {
      id: "rack",
      num: "03",
      tierIndex: 1,
      layerNum: "Tier 02 · Systems & Networks",
      code: "02 · Assessments, Firewalls & Migrations",
      title: "Environment Assessments, Firewalls & Swing Migrations",
      period: "Harris · 2007–2009",
      phaseIndex: 1,
      caseRoute: "#projects/foundations",
      archNodeId: "systems",
      pinX: 875,
      pinY: 734,
      hitR: 70,
      motionType: "tower",
      summary: "Conducted client environment assessments, configured firewalls and VLAN switches, and executed staged Small Business Server swing migrations without downtime.",
      whatIDid: "Client infrastructure assessments, firewall/VLAN switching & staged server swing migrations"
    },
    {
      id: "servers",
      num: "04",
      tierIndex: 1,
      layerNum: "Tier 02 · Systems & Networks",
      code: "02 · AD, Exchange, File/Print & BES",
      title: "Systems Admin: Active Directory, Exchange, File/Print & BES",
      period: "Harris & Grenville · 2007–2022",
      phaseIndex: 1,
      caseRoute: "#projects/foundations",
      archNodeId: "systems",
      pinX: 1015,
      pinY: 678,
      altPinX: 731,
      altPinY: 678,
      hitR: 74,
      motionType: "tower",
      summary: "Hands-on systems administration across Active Directory, Group Policy, Microsoft Exchange, file and print servers, and BlackBerry Enterprise Server (BES) on separated rack infrastructure.",
      whatIDid: "Administered & migrated AD, GPO, Exchange, file/print services & BlackBerry BES"
    },
    {
      id: "ports",
      num: "05",
      tierIndex: 2,
      layerNum: "Tier 03 · HQ Infrastructure",
      code: "03 · 42U Racks & Cat6A",
      title: "42U Server Racks, Cat6A Cabling, AV & Security",
      period: "Grenville HQ Move · ~2014",
      phaseIndex: 2,
      caseRoute: "#projects/headquarters",
      archNodeId: "infrastructure",
      pinX: 765,
      pinY: 556,
      hitR: 72,
      motionType: "tower",
      summary: "Designed and built physical headquarters infrastructure from floorplan to move-in—covering 42U server racks, braided Cat6A patch panels, PoE switching, AV, and door security.",
      whatIDid: "Mapped floorplan data drops, PoE switch ports, AV rooms & security wiring"
    },
    {
      id: "ups",
      num: "06",
      tierIndex: 2,
      layerNum: "Tier 03 · HQ Infrastructure",
      code: "03 · UPS & Generator Power",
      title: "Resilient UPS Battery & Standby Generator Power",
      period: "Grenville HQ Move · ~2014",
      phaseIndex: 2,
      caseRoute: "#projects/headquarters",
      archNodeId: "infrastructure",
      pinX: 991,
      pinY: 552,
      hitR: 66,
      motionType: "tower",
      summary: "Integrated conditioned UPS battery backup and facility standby generator transfer requirements into the server room plan so cooling and core infrastructure stayed online.",
      whatIDid: "Planned rack & room UPS runtime capacity and standby generator continuity"
    },
    {
      id: "generator",
      num: "07",
      tierIndex: 2,
      layerNum: "Tier 03 · HQ Infrastructure",
      code: "03 · VMware ESXi Cluster",
      title: "Bare-Metal Blade Centre to VMware ESXi Transition",
      period: "Grenville · 2009–2022",
      phaseIndex: 2,
      caseRoute: "#projects/headquarters",
      archNodeId: "infrastructure",
      pinX: 1081,
      pinY: 530,
      hitR: 66,
      motionType: "tower",
      summary: "Consolidated physical blade servers onto a virtualized VMware ESXi cluster—carrying a deep understanding of physical-to-virtual dependencies into systems analysis.",
      whatIDid: "Migrated bare-metal blade centre workloads onto VMware ESXi hypervisors"
    },
    {
      id: "integrations",
      num: "08",
      tierIndex: 3,
      layerNum: "Tier 04 · Rules & Broker APIs",
      code: "04 · Broker XML & REST",
      title: "Broker Portal & BMS Integrations (SOAP/XML & REST)",
      period: "Grenville · Mid-2010s–2022",
      phaseIndex: 3,
      caseRoute: "#projects/workflows",
      archNodeId: "analysis",
      pinX: 759,
      pinY: 406,
      hitR: 72,
      motionType: "tower",
      summary: "Connected external broker portals and TAM/Epic desktop systems across SOAP/XML, CSIO/ACORD standards, REST APIs, and an authenticated C#/.NET adjuster document upload portal.",
      whatIDid: "Mapped broker payloads, diagnosed interface faults & built C#/.NET upload tooling"
    },
    {
      id: "analysis",
      num: "09",
      tierIndex: 3,
      layerNum: "Tier 04 · Rules & Broker APIs",
      code: "04 · Underwriting Rules",
      title: "P&C Rating, Underwriting & Auto-Renewal Rules Engine",
      period: "Grenville · Mid-2010s–2022",
      phaseIndex: 3,
      caseRoute: "#projects/renewals",
      archNodeId: "analysis",
      pinX: 875,
      pinY: 404,
      altPinX: 979,
      altPinY: 396,
      hitR: 78,
      motionType: "tower",
      summary: "Personally designed and implemented P&C rating, underwriting, and renewal rules—automating ~80% residential, ~60% commercial, and ~40% farm renewals while routing exceptions to underwriters.",
      whatIDid: "Personally designed and implemented P&C rating, eligibility & renewal rules"
    },
    {
      id: "design",
      num: "10",
      tierIndex: 4,
      layerNum: "Tier 05 · Claims Architecture",
      code: "05 · Takeover XML & Balancing",
      title: "Takeover-History XML Tooling & Financial Reconciliation",
      period: "Medavie · 2022–present",
      phaseIndex: 4,
      caseRoute: "#projects/takeover",
      archNodeId: "solutions",
      pinX: 875,
      pinY: 316,
      hitR: 72,
      motionType: "tower",
      summary: "Researched, documented, and guided a production Excel/VB/XML tool for prior-insurer takeover claims history, alongside hand-written SQL to reconcile claims against financial reports.",
      whatIDid: "Guided production Excel/XML takeover tooling & claims-to-financial reconciliation"
    },
    {
      id: "architecture",
      num: "11",
      tierIndex: 4,
      layerNum: "Tier 05 · Claims Architecture",
      code: "05 · Claims SQL & Daily ETL",
      title: "Provider Sync, Claims SQL & Daily ETL Continuity",
      period: "Medavie · 2022–present",
      phaseIndex: 4,
      caseRoute: "#projects/continuity",
      archNodeId: "solutions",
      pinX: 971,
      pinY: 262,
      altPinX: 779,
      altPinY: 262,
      hitR: 76,
      motionType: "tower",
      summary: "Reviewed provider registry sync mappings and uncovered a hidden daily COBOL/InterBlue flat-file ETL integration behind a 'reporting' request—designing its migration continuity.",
      whatIDid: "Provider sync mapping review, claims SQL analysis & daily ETL continuity design"
    },
    {
      id: "ai-governance",
      num: "12",
      tierIndex: 5,
      layerNum: "Tier 06 · Capstone Crown (Top)",
      code: "06 · Governed AI (NEXUS)",
      title: "NEXUS — Governed AI Orchestration & Verification",
      period: "Capstone · Active Development",
      phaseIndex: 5,
      caseRoute: "#projects/nexus",
      archNodeId: "nexus",
      pinX: 875,
      pinY: 118,
      hitR: 86,
      motionType: "crown",
      summary: "At the crown of the stack, NEXUS brings 20 years of hardware, infrastructure, rules, and data architecture together to make AI-assisted work scoped, explainable, and recoverable.",
      whatIDid: "Built scoped context assembly, explainable model routing & verification receipts"
    }
  ]);

  /* Dedicated 3D Exploded-View Cinematic Videos (1264x848) & Single-Active Popout Inspector
     for each of the 5 Timeline Chapters. */
  const TIMELINE_EXPLODED_SCENES = Object.freeze({
    support: {
      videoMp4: "assets/timeline-support.mp4",
      videoWebm: "assets/timeline-support.webm",
      poster: "assets/timeline-support.png",
      caption: "Interactive 3D Exploded View · Tap or hover any Latitude or OptiPlex component",
      parts: [
        {
          id: "sup-display",
          pinX: 265,
          pinY: 275,
          hitR: 76,
          code: "1 · Latitude Display",
          title: "Latitude Display & Video Signal Isolation",
          detail: "Diagnosed screen flicker, backlight inverters, and video ribbon cables on the first call so technicians or clients replaced the exact part needed."
        },
        {
          id: "sup-cooling",
          pinX: 345,
          pinY: 445,
          hitR: 72,
          code: "2 · Keyboard & Thermal",
          title: "Thermal Management & Input Deck Diagnostics",
          detail: "Isolated thermal shutdowns, copper heat-pipe/fan faults, and keyboard/touchpad controller issues across Dell Latitude business laptops."
        },
        {
          id: "sup-mobo",
          pinX: 410,
          pinY: 635,
          hitR: 78,
          code: "3 · Laptop System Board",
          title: "System Board, Wireless Card & Driver Tree",
          detail: "Traced device-tree conflicts, Mini-PCI wireless cards, and chipset drivers before ever recommending a motherboard replacement."
        },
        {
          id: "sup-psu",
          pinX: 785,
          pinY: 315,
          hitR: 76,
          code: "4 · OptiPlex Power (PSU)",
          title: "OptiPlex Power Supply & Voltage Rails",
          detail: "Verified PSU rail stability, diagnostic LED codes, and internal power cabling when corporate desktops failed to boot."
        },
        {
          id: "sup-drives",
          pinX: 985,
          pinY: 335,
          hitR: 74,
          code: "5 · SATA Drives & RAM",
          title: "Storage Bays, SATA Channels & Memory Modules",
          detail: "Guided systematic RAM seating and SATA storage checks to separate physical media faults from operating system corruption."
        },
        {
          id: "sup-pci",
          pinX: 835,
          pinY: 505,
          hitR: 82,
          code: "6 · First-Call Fix",
          title: "Dell 'Gloves Off' First-Call Resolution",
          detail: "Took the time needed on the first call to solve the real hardware or software problem completely—preventing repeat callbacks."
        }
      ]
    },
    systems: {
      videoMp4: "assets/timeline-systems.mp4",
      videoWebm: "assets/timeline-systems.webm",
      poster: "assets/timeline-systems.png",
      caption: "Interactive 3D Exploded View · Tap or hover any server or migration stage",
      parts: [
        {
          id: "sys-sbs",
          pinX: 245,
          pinY: 535,
          hitR: 88,
          code: "1 · Combined SBS Server",
          title: "Outgrowing Combined Small Business Server (SBS)",
          detail: "Growing businesses had Active Directory, Exchange email, and files tightly coupled on a single server—making direct upgrades risky."
        },
        {
          id: "sys-switch",
          pinX: 555,
          pinY: 235,
          hitR: 78,
          code: "2 · Core Switch & Firewall",
          title: "Core Firewalls, Switches & NOC Connectivity",
          detail: "Configured and maintained client and internal firewalls, managed VLAN switches, and NOC monitoring nodes so office traffic stayed rock-solid."
        },
        {
          id: "sys-swing",
          pinX: 645,
          pinY: 445,
          hitR: 84,
          code: "3 · Swing Migration Bridge",
          title: "Repeatable Staged Swing Migration Process",
          detail: "Introduced a temporary staging server to hold Active Directory roles and replicate live data cleanly before cutting over to new hardware."
        },
        {
          id: "sys-ad",
          pinX: 985,
          pinY: 325,
          hitR: 88,
          code: "4 · Active Directory Host",
          title: "Dedicated Active Directory & Identity Server",
          detail: "Separated user authentication, security groups, and Group Policy onto dedicated server infrastructure without resetting user passwords."
        },
        {
          id: "sys-exchange",
          pinX: 865,
          pinY: 515,
          hitR: 88,
          code: "5 · Exchange Mail Server",
          title: "Dedicated Exchange & Mobile Email Server",
          detail: "Migrated live mailboxes and BlackBerry Enterprise Server connections onto separated infrastructure so business email never went dark."
        }
      ]
    },
    infrastructure: {
      videoMp4: "assets/timeline-infrastructure.mp4",
      videoWebm: "assets/timeline-infrastructure.webm",
      poster: "assets/timeline-infrastructure.png",
      caption: "Interactive 3D Exploded View · Tap or hover any headquarters infrastructure part",
      parts: [
        {
          id: "inf-floorplan",
          pinX: 165,
          pinY: 465,
          hitR: 88,
          code: "1 · Floorplan & Ports",
          title: "Headquarters Floorplan, AV & Security Planning",
          detail: "Worked from architectural drawings through construction to place every desk network/phone drop, meeting-room AV connection, and badge-access door."
        },
        {
          id: "inf-patch",
          pinX: 405,
          pinY: 515,
          hitR: 74,
          code: "2 · 24-Port Patch Panel",
          title: "Structured Cabling & Patch Panel Termination",
          detail: "Organized and tested every floor port back to the server room patch panels and PoE switches so move-in day worked smoothly."
        },
        {
          id: "inf-rack",
          pinX: 525,
          pinY: 535,
          hitR: 84,
          code: "3 · 42U Rack & Blades",
          title: "42U Server Rack, Blade Center & Cooling Louvers",
          detail: "Designed the physical server room layout—balancing rack density, blade server heat output, and dedicated cooling airflow."
        },
        {
          id: "inf-esxi",
          pinX: 635,
          pinY: 175,
          hitR: 84,
          code: "4 · VMware ESXi Cluster",
          title: "Bare-Metal Blade Transition to VMware ESXi",
          detail: "Transitioned workloads from bare-metal blade servers into a virtualized VMware ESXi environment for faster recovery and cleaner maintenance."
        },
        {
          id: "inf-ups",
          pinX: 885,
          pinY: 495,
          hitR: 78,
          code: "5 · UPS Battery Backup",
          title: "Server Room UPS Battery Conditioning",
          detail: "Integrated battery backup capacity to keep core switches, storage, and hypervisors online cleanly through utility power dips."
        },
        {
          id: "inf-gen",
          pinX: 1025,
          pinY: 435,
          hitR: 78,
          code: "6 · Standby Generator",
          title: "Standby Generator & Outage Resilience",
          detail: "Accounted for standby generator and transfer switch power in the HQ infrastructure plan so both servers and cooling survived extended outages."
        }
      ]
    },
    analysis: {
      videoMp4: "assets/timeline-analysis.mp4",
      videoWebm: "assets/timeline-analysis.webm",
      poster: "assets/timeline-analysis.png",
      caption: "Interactive 3D Exploded View · Tap or hover any underwriting rule or broker path",
      parts: [
        {
          id: "ana-intake",
          pinX: 235,
          pinY: 295,
          hitR: 84,
          code: "1 · Broker Portal Intake",
          title: "Broker Quoting, Inquiry & Policy Change Inputs",
          detail: "Directed UI and workflow updates so broker screens captured the exact risk details needed before rating and underwriting rules ran."
        },
        {
          id: "ana-payloads",
          pinX: 215,
          pinY: 635,
          hitR: 86,
          code: "2 · XML & CSIO Payloads",
          title: "Broker Payloads (SOAP/XML, REST & CSIO/ACORD)",
          detail: "Mapped and transformed fields between broker desktop tools (TAM/Epic via Bravado), CSIO standards, and proprietary policy backend fields."
        },
        {
          id: "ana-diamond",
          pinX: 632,
          pinY: 415,
          hitR: 90,
          code: "3 · Underwriting Rules",
          title: "Personal Design & Implementation of Policy Rules",
          detail: "Personally designed and implemented P&C rating, underwriting, and renewal rules across residential, commercial, farm, and auto lines."
        },
        {
          id: "ana-renew",
          pinX: 985,
          pinY: 215,
          hitR: 88,
          code: "4 · Auto-Renewal Path",
          title: "Straight-Through Renewal Automation",
          detail: "Classified eligible standard renewals to process automatically (~80% residential, ~60% commercial, ~40% farm; user-reported) without manual touch."
        },
        {
          id: "ana-refer",
          pinX: 865,
          pinY: 515,
          hitR: 88,
          code: "5 · Human Review Dock",
          title: "Actionable Messages & Underwriter Exception Routing",
          detail: "Preserved human insurance judgment for complex cases—giving brokers and underwriters clear, specific reasons whenever a policy required review."
        }
      ]
    },
    solutions: {
      videoMp4: "assets/timeline-solutions.mp4",
      videoWebm: "assets/timeline-solutions.webm",
      poster: "assets/timeline-solutions.png",
      caption: "Interactive 3D Exploded View · Tap or hover any claims, SQL or continuity module",
      parts: [
        {
          id: "sol-takeover",
          pinX: 255,
          pinY: 465,
          hitR: 88,
          code: "1 · Takeover XML Tool",
          title: "Production Takeover-History Validation & XML Tooling",
          detail: "Researched, documented, and guided an Excel/VB/XML tool that validates messy prior-insurer spreadsheets and transforms them into clean adjudication XML."
        },
        {
          id: "sol-sql",
          pinX: 515,
          pinY: 335,
          hitR: 84,
          code: "2 · Claims SQL Silos",
          title: "Hand-Written Claims SQL & Data Analysis",
          detail: "Write complex SQL directly against claims tables to trace adjudication behavior, verify edge cases, and inspect how real production data is structured."
        },
        {
          id: "sol-recon",
          pinX: 735,
          pinY: 415,
          hitR: 84,
          code: "3 · Financial Balancing",
          title: "Claims-to-Financial Report Reconciliation",
          detail: "Analyzed report logic and built reconciliation checks so claims extracts balance accurately against the financial reporting they feed."
        },
        {
          id: "sol-provider",
          pinX: 985,
          pinY: 235,
          hitR: 86,
          code: "4 · Provider Sync",
          title: "Provider Integration Review & Field Mappings",
          detail: "Worked alongside architects on solution review, gap analysis, field mappings, and scheduled synchronization requirements for healthcare provider data."
        },
        {
          id: "sol-continuity",
          pinX: 875,
          pinY: 515,
          hitR: 88,
          code: "5 · Daily ETL Continuity",
          title: "Uncovering & Preserving a Daily ETL Reporting Feed",
          detail: "Recognized that a 'reporting' request was actually a daily COBOL/Interblue flat-file ETL integration feeding client Cognos reports—and mapped its migration continuity."
        }
      ]
    }
  });

  const SCENE_WAYPOINTS = Object.freeze({
    support: { height: 300, waypoints: [] },
    systems: { height: 268, waypoints: [] },
    infrastructure: { height: 291, waypoints: [] },
    analysis: { height: 297, waypoints: [] },
    solutions: { height: 380, waypoints: [] }
  });

  const PROJECT_METADATA = Object.freeze({
    dell: {
      layer: "infra",
      layerLabel: "Hardware & Support",
      statusLabel: "Production Support",
      statusClass: "status-prod"
    },
    foundations: {
      layer: "infra",
      layerLabel: "Systems & Networks",
      statusLabel: "Repeatable Migration",
      statusClass: "status-prod"
    },
    headquarters: {
      layer: "infra",
      layerLabel: "Infrastructure & Move",
      statusLabel: "Delivered Move & VM",
      statusClass: "status-prod"
    },
    inquiry: {
      layer: "payloads",
      layerLabel: "Broker Integration",
      statusLabel: "Production Integration",
      statusClass: "status-prod"
    },
    newbusiness: {
      layer: "rules",
      layerLabel: "Underwriting Rules",
      statusLabel: "Production Rules & UI",
      statusClass: "status-prod"
    },
    workflows: {
      layer: "payloads",
      layerLabel: "Broker Integration",
      statusLabel: "Production Integration",
      statusClass: "status-prod"
    },
    changes: {
      layer: "rules",
      layerLabel: "Underwriting Rules",
      statusLabel: "Production Rules & UI",
      statusClass: "status-prod"
    },
    renewals: {
      layer: "rules",
      layerLabel: "Underwriting Rules",
      statusLabel: "Production Rules",
      statusClass: "status-prod"
    },
    upload: {
      layer: "payloads",
      layerLabel: "Broker Integration",
      statusLabel: "Delivered Application",
      statusClass: "status-prod"
    },
    claims: {
      layer: "payloads",
      layerLabel: "Claims & Integration",
      statusLabel: "Solution Review & Mapping",
      statusClass: "status-design"
    },
    takeover: {
      layer: "data",
      layerLabel: "Claims Data & SQL",
      statusLabel: "Production / Team-Adopted",
      statusClass: "status-prod"
    },
    continuity: {
      layer: "data",
      layerLabel: "Claims Data & SQL",
      statusLabel: "Completed Analysis/Design",
      statusClass: "status-design"
    },
    sql: {
      layer: "data",
      layerLabel: "Claims Data & SQL",
      statusLabel: "Hands-on SQL & Balancing",
      statusClass: "status-prod"
    },
    nexus: {
      layer: "ai",
      layerLabel: "AI & Governed Systems",
      statusLabel: "Active Capstone",
      statusClass: "status-prod"
    },
    lowkey: {
      layer: "ai",
      layerLabel: "AI & Governed Systems",
      statusLabel: "Personal Build",
      statusClass: "status-design"
    },
    workshop42: {
      layer: "infra",
      layerLabel: "Hardware & Lab",
      statusLabel: "Personal Hardware Lab",
      statusClass: "status-prod"
    }
  });

  function mount() {
    if (typeof document === "undefined") return null;

    let activePartIndex = 0; // Start at Bottom Foundation (Tier 01 · Support) and climb bottom-to-top!
    let heroUserLocked = false;
    let activeLayerFilter = "all";
    let searchQuery = "";
    let cmdOpen = false;
    let cmdSelectedIndex = 0;
    const allLeaderUpdaters = [];

    // 1. Mount Clean Quick-Search Button in Header
    const header = document.querySelector(".site-header");
    const resumeLink = header?.querySelector("[data-resume-link]");
    let cmdTriggerBtn = null;

    if (header && !header.querySelector(".header-telemetry-controls")) {
      const primaryNav = header.querySelector("#primary-nav");
      if (primaryNav && !primaryNav.querySelector("[data-extra-nav]")) {
        const projectsLink = primaryNav.querySelector('a[href="#projects"]');
        if (projectsLink) {
          projectsLink.textContent = "Builds";
        }
        const careerLink = document.createElement("a");
        careerLink.href = "#career";
        careerLink.setAttribute("data-nav", "career");
        careerLink.setAttribute("data-extra-nav", "career");
        careerLink.textContent = "Career";
        if (projectsLink && projectsLink.nextSibling) {
          primaryNav.insertBefore(careerLink, projectsLink.nextSibling);
        } else {
          primaryNav.append(careerLink);
        }

        const skillsLink = document.createElement("a");
        skillsLink.href = "#skills";
        skillsLink.setAttribute("data-nav", "skills");
        skillsLink.setAttribute("data-extra-nav", "skills");
        skillsLink.textContent = "Skills";
        if (careerLink.nextSibling) {
          primaryNav.insertBefore(skillsLink, careerLink.nextSibling);
        } else {
          primaryNav.append(skillsLink);
        }
      }

      const menuToggleBtn = header.querySelector("#menu-toggle");
      const menuSvg = menuToggleBtn?.querySelector("svg");
      if (menuSvg) {
        menuSvg.innerHTML = `<path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`;
      }

      const controls = document.createElement("div");
      controls.className = "header-telemetry-controls";

      cmdTriggerBtn = document.createElement("button");
      cmdTriggerBtn.type = "button";
      cmdTriggerBtn.className = "cmd-palette-btn";
      cmdTriggerBtn.setAttribute("data-cmd-open", "");
      cmdTriggerBtn.setAttribute("aria-label", "Search builds, skills, or ideas");
      cmdTriggerBtn.innerHTML = `<svg class="cmd-search-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3 3"/></svg><span>Search builds, skills, or ideas...</span><span class="cmd-kbd-group"><kbd class="cmd-kbd">CTRL</kbd><kbd class="cmd-kbd">K</kbd></span>`;

      const globalMuteBtn = document.createElement("button");
      globalMuteBtn.type = "button";
      globalMuteBtn.className = "header-global-mute-btn";
      globalMuteBtn.setAttribute("data-global-audio-mute", "");
      globalMuteBtn.setAttribute("aria-pressed", "false");
      globalMuteBtn.setAttribute("aria-label", "Mute all site audio");
      globalMuteBtn.setAttribute("title", "Mute / Unmute All Audio");
      globalMuteBtn.innerHTML = `
        <span class="header-global-mute-icon" data-global-mute-icon aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polygon points="9 5 5.5 8 3 8 3 12 5.5 12 9 15 9 5" fill="currentColor" stroke="none"/><path d="M12.2 7.6a3.4 3.4 0 0 1 0 4.8"/><path d="M14.6 5.4a6.5 6.5 0 0 1 0 9.2"/></svg>
        </span>
        <span class="sr-only" data-global-mute-label>Mute All Audio</span>
      `;

      const storyBtn = document.createElement("a");
      storyBtn.className = "header-story-btn";
      storyBtn.href = "#about";
      storyBtn.innerHTML = `<span>Let&rsquo;s Connect</span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10m-4-4 4 4-4 4"/></svg>`;

      controls.append(cmdTriggerBtn, globalMuteBtn, storyBtn);
      if (resumeLink) {
        header.insertBefore(controls, resumeLink);
      } else {
        header.append(controls);
      }

      if (!header.querySelector(".mobile-top-tab-strip")) {
        const mobileTabStrip = document.createElement("nav");
        mobileTabStrip.className = "mobile-top-tab-strip";
        mobileTabStrip.setAttribute("aria-label", "Mobile section navigation");
        mobileTabStrip.innerHTML = `
          <a href="#home" data-mobile-tab="home">Home</a>
          <a href="#projects" data-mobile-tab="projects">Builds</a>
          <a href="#career" data-mobile-tab="career">Career</a>
          <a href="#skills" data-mobile-tab="skills">Skills</a>
          <a href="#about" data-mobile-tab="about">About</a>
        `;
        header.append(mobileTabStrip);
      }
    }

    // 2. Mount Static Visual Hero matching Desktop & Mobile reference designs 1:1
    const heroSection = document.querySelector(".career-hero");
    const heroCopyCol = document.querySelector(".career-hero > div:first-child");
    if (heroCopyCol) heroCopyCol.classList.add("hero-copy-col");
    const heroActions = heroCopyCol?.querySelector(".hero-actions");
    const heroStage = document.querySelector(".solution-visual");
    const heroVideo = heroStage?.querySelector(".hero-video");

    let syncConnectionsStage = null;
    let getConnStageData = null;
    let renderHeroBadgeStrip = null;
    let getHeroImpactIcon = null;
    let getHeroCalloutIcon = null;
    let refreshHeroDashboardFn = null;

    // Clean up any legacy dynamic elements
    heroCopyCol?.querySelector(".hero-scratch")?.remove();
    heroCopyCol?.querySelector(".hero-insert")?.remove();
    heroCopyCol?.querySelector(".hero-value-pillars")?.remove();
    heroCopyCol?.querySelector(".hero-three-pillars")?.remove();
    heroSection?.querySelector(".hero-mobile-pillars")?.remove();
    heroSection?.querySelector(".hero-bottom-metrics")?.remove();
    heroSection?.querySelector(".home-hero-backdrop")?.remove();

    // Update Left Column (Eyebrow, 3-line Headline, Lead paragraph, 2 Pill CTAs, 3 Bottom Pillars)
    const kickerEl = heroCopyCol?.querySelector(".hero-ascent-kicker");
    if (kickerEl) {
      kickerEl.textContent = "INFRASTRUCTURE · INSURANCE · AI";
    }

    const heroH1 = heroCopyCol?.querySelector("h1");
    if (heroH1) {
      heroH1.innerHTML = `
        <span class="hero-static-line hero-static-line--top">Grounded in the Metal.</span>
        <span class="hero-static-line hero-static-line--bottom">Shaped by the Business.</span>
        <span class="hero-static-line hero-static-line--gold">Building in the Cloud.</span>
      `;
    }

    const heroLead = heroCopyCol?.querySelector(".hero-lead");
    if (heroLead) {
      heroLead.textContent = "20 years of turning complex problems into practical solutions across infrastructure, insurance and AI.";
    }

    if (heroActions) {
      heroActions.innerHTML = `
        <a class="hero-btn-primary" href="#projects">
          <span>Explore my work</span>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 4 4 4-4 4"/></svg>
        </a>
        <button type="button" class="hero-btn-secondary" data-home-watch-story>
          <span class="hero-play-circle" aria-hidden="true">
            <svg viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 4.2v7.6L12 8 5.5 4.2z"/></svg>
          </span>
          <span class="hero-watch-copy">
            <span class="hero-watch-label" data-home-watch-label>Watch the story</span>
          </span>
        </button>
      `;
    }

    if (heroCopyCol && !heroCopyCol.querySelector(".hero-three-pillars")) {
      const pillarsEl = document.createElement("div");
      pillarsEl.className = "hero-three-pillars";
      pillarsEl.setAttribute("aria-label", "Core capability pillars");
      pillarsEl.innerHTML = `
        <a class="hero-pillar-col" href="#career" data-pillar-link="infrastructure">
          <span class="hero-pillar-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="6.5" rx="1.6"/>
              <rect x="3" y="13.5" width="18" height="6.5" rx="1.6"/>
              <circle cx="7" cy="7.25" r="1" fill="currentColor"/>
              <circle cx="7" cy="16.75" r="1" fill="currentColor"/>
              <path d="M11 7.25h6M11 16.75h6"/>
            </svg>
          </span>
          <strong class="hero-pillar-title">Infrastructure</strong>
          <span class="hero-pillar-desc">Hardware, networks, systems, migrations.</span>
        </a>
        <a class="hero-pillar-col" href="#projects" data-pillar-link="insurance">
          <span class="hero-pillar-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
          </span>
          <strong class="hero-pillar-title">Insurance</strong>
          <span class="hero-pillar-desc">Underwriting, claims, rules, integration.</span>
        </a>
        <a class="hero-pillar-col" href="#projects/nexus" data-pillar-link="ai">
          <span class="hero-pillar-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04Z"/>
              <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04Z"/>
            </svg>
          </span>
          <strong class="hero-pillar-title">AI &amp; Automation</strong>
          <span class="hero-pillar-desc">NEXUS, agents, orchestration, results.</span>
        </a>
      `;
      heroCopyCol.append(pillarsEl);
    }

    heroSection?.querySelector(".home-journey-overlay")?.remove();
    heroSection?.querySelector(".home-hero-video-controls")?.remove();

    const HOME_JOURNEY_LEVELS = [
      {
        id: "metal",
        stepNum: "01",
        stepShort: "The Metal",
        start: 0.0,
        end: 6.8,
        climbStart: 5.5,
        theme: "white",
        kicker: "LEVEL 01 · 2006 – 2014 · INFRASTRUCTURE & SYSTEMS",
        titleLine1: "Grounded in",
        titleAccent: "the metal.",
        body: "Enterprise hardware diagnosis at Dell, NOC operations and Small Business Server swing migrations at Harris, and building Grenville's headquarters datacentre & VMware ESXi cluster.",
        exploreHref: "#career",
        exploreChapter: "metal",
        pills: [
          {
            label: "Hardware Diagnosis",
            icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="5" y="5" width="10" height="10" rx="2"/><path d="M8 2v3M12 2v3M8 15v3M12 15v3M2 8h3M2 12h3M15 8h3M15 12h3"/></svg>`
          },
          {
            label: "Active Directory & Exchange",
            icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="14" height="5" rx="1.4"/><rect x="3" y="12" width="14" height="5" rx="1.4"/><circle cx="6" cy="5.5" r="0.9" fill="currentColor"/><circle cx="6" cy="14.5" r="0.9" fill="currentColor"/></svg>`
          },
          {
            label: "42U Datacentre & ESXi",
            icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M10 2 3 6v8l7 4 7-4V6l-7-4Z"/><path d="m3 6 7 4 7-4M10 10v8"/></svg>`
          }
        ],
        hudVisualSvg: `
          <svg class="journey-hud-map-svg" viewBox="0 0 260 156" fill="none">
            <defs>
              <linearGradient id="hudMetalRackGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.32"/>
                <stop offset="100%" stop-color="#0284c7" stop-opacity="0.08"/>
              </linearGradient>
            </defs>
            <!-- Subtle CAD Telemetry Grid -->
            <path d="M12 24h236M12 56h236M12 88h236M12 120h236M52 12v132M104 12v132M156 12v132M208 12v132" stroke="rgba(56,189,248,0.10)" stroke-width="1"/>
            <!-- Left 42U Rack Bay -->
            <rect x="22" y="18" width="54" height="118" rx="5" fill="url(#hudMetalRackGrad)" stroke="rgba(56,189,248,0.55)" stroke-width="1.3"/>
            <rect x="28" y="26" width="42" height="10" rx="2" fill="rgba(15,23,42,0.85)" stroke="rgba(56,189,248,0.45)"/>
            <rect x="28" y="41" width="42" height="10" rx="2" fill="rgba(15,23,42,0.85)" stroke="rgba(56,189,248,0.45)"/>
            <rect x="28" y="56" width="42" height="10" rx="2" fill="rgba(15,23,42,0.85)" stroke="rgba(244,197,66,0.65)"/>
            <rect x="28" y="71" width="42" height="10" rx="2" fill="rgba(15,23,42,0.85)" stroke="rgba(56,189,248,0.45)"/>
            <rect x="28" y="86" width="42" height="10" rx="2" fill="rgba(15,23,42,0.85)" stroke="rgba(56,189,248,0.45)"/>
            <rect x="28" y="101" width="42" height="10" rx="2" fill="rgba(15,23,42,0.85)" stroke="rgba(52,211,153,0.55)"/>
            <circle cx="33" cy="31" r="1.8" fill="#38bdf8"/><circle cx="39" cy="31" r="1.8" fill="#38bdf8"/>
            <circle cx="33" cy="61" r="1.8" fill="#f4c542"/><circle cx="39" cy="61" r="1.8" fill="#38bdf8"/>
            <circle cx="33" cy="106" r="1.8" fill="#34d399"/><circle cx="39" cy="106" r="1.8" fill="#38bdf8"/>
            <!-- Optical Fiber Uplinks to ESXi Cluster Nodes -->
            <path d="M76 46 C108 46, 114 34, 142 34" stroke="#38bdf8" stroke-width="1.8" stroke-dasharray="3 2"/>
            <path d="M76 76 C108 76, 114 76, 142 76" stroke="#f4c542" stroke-width="2"/>
            <path d="M76 106 C108 106, 114 118, 142 118" stroke="#38bdf8" stroke-width="1.8"/>
            <!-- Right Virtualized ESXi & VLAN Core Nodes -->
            <rect x="142" y="20" width="96" height="30" rx="5" fill="rgba(12,24,46,0.88)" stroke="rgba(56,189,248,0.55)" stroke-width="1.2"/>
            <circle cx="156" cy="35" r="4" fill="#38bdf8"/>
            <path d="M168 31h52M168 39h36" stroke="rgba(226,232,240,0.78)" stroke-width="2" stroke-linecap="round"/>
            <rect x="142" y="61" width="96" height="30" rx="5" fill="rgba(12,24,46,0.88)" stroke="rgba(244,197,66,0.65)" stroke-width="1.2"/>
            <circle cx="156" cy="76" r="4" fill="#f4c542"/>
            <path d="M168 72h56M168 80h40" stroke="rgba(226,232,240,0.82)" stroke-width="2" stroke-linecap="round"/>
            <rect x="142" y="102" width="96" height="30" rx="5" fill="rgba(12,24,46,0.88)" stroke="rgba(52,211,153,0.55)" stroke-width="1.2"/>
            <circle cx="156" cy="117" r="4" fill="#34d399"/>
            <path d="M168 113h48M168 121h32" stroke="rgba(226,232,240,0.75)" stroke-width="2" stroke-linecap="round"/>
          </svg>
        `,
        hudTelemetry: {
          header: "Core Infrastructure",
          subHeader: "HQ Datacentre",
          bigValue: "42U",
          bars: [38, 48, 56, 66, 74, 84, 96, 88],
          highlightBar: 6,
          rows: [
            { label: "VMware ESXi", pct: 92, val: "HA Cluster" },
            { label: "SBS Swing", pct: 85, val: "Zero-Loss" }
          ]
        },
        flowNodes: [
          {
            label: "Dell Hardware",
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></svg>`
          },
          {
            label: "SBS Migrations",
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="6" rx="1.6"/><rect x="3" y="14" width="18" height="6" rx="1.6"/><path d="M7 7h.01M7 17h.01M11 7h6M11 17h6"/></svg>`
          },
          {
            label: "42U Datacentre",
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 6h6M9 10h6M9 14h6M9 18h2"/></svg>`
          },
          {
            label: "VMware ESXi",
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z"/><path d="m3 7 9 5 9-5M12 12v10"/></svg>`
          }
        ],
        bottomMetrics: [
          {
            tone: "white",
            val: "Dell",
            label: "Latitude & OptiPlex Support",
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M18 9h4"/></svg>`
          },
          {
            tone: "white",
            val: "SBS Swing",
            label: "AD & Exchange Migrations",
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>`
          },
          {
            tone: "white",
            val: "42U",
            label: "HQ Datacentre Build",
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 6h6M9 10h6M9 14h6"/></svg>`
          },
          {
            tone: "white",
            val: "VLAN & VPN",
            label: "Segmented Core Network",
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>`
          },
          {
            tone: "white",
            val: "VMware ESXi",
            label: "Virtualized Server Cluster",
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M10.5 7 6.5 15.8M13.5 7l4 8.8M7.5 18h9"/></svg>`
          }
        ]
      },
      {
        id: "business",
        stepNum: "02",
        stepShort: "The Business",
        start: 6.8,
        end: 14.4,
        climbStart: 13.0,
        theme: "gold",
        kicker: "LEVEL 02 · 2014 – 2022 · INSURANCE & INTEGRATION",
        titleLine1: "Shaped by",
        titleAccent: "the business.",
        body: "Connecting broker workflows, CSIO/XML schemas and underwriting rules at Grenville Mutual — automating ~80% residential, ~60% commercial and ~40% farm renewals.",
        exploreHref: "#projects/grenville-automated-underwriting",
        exploreChapter: "business",
        pills: [
          {
            label: "P&C Underwriting Rules",
            icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="10" cy="4.5" r="2.2"/><circle cx="5" cy="15" r="2.2"/><circle cx="15" cy="15" r="2.2"/><path d="M8.8 6.4 6 13M11.2 6.4 14 13M7.2 15h5.6"/></svg>`
          },
          {
            label: "Broker Portals & CSIO/XML",
            icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="3" width="12" height="14" rx="2"/><path d="M7.5 3v2h5V3M7 9h6M7 12.5h4"/></svg>`
          },
          {
            label: "Renewal Automation",
            icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="10" cy="10" r="7"/><path d="m10 10 3.2-2.6"/><circle cx="10" cy="10" r="1.2" fill="currentColor"/></svg>`
          }
        ],
        hudVisualSvg: `
          <svg class="journey-hud-map-svg" viewBox="0 0 260 156" fill="none">
            <defs>
              <linearGradient id="hudCanMapFill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#f4c542" stop-opacity="0.34"/>
                <stop offset="45%" stop-color="#60a5fa" stop-opacity="0.26"/>
                <stop offset="100%" stop-color="#1e3a8a" stop-opacity="0.22"/>
              </linearGradient>
              <radialGradient id="hudMapGlow" cx="50%" cy="55%" r="52%">
                <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.24"/>
                <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
              </radialGradient>
            </defs>
            <ellipse cx="130" cy="86" rx="112" ry="62" fill="url(#hudMapGlow)"/>
            <!-- Stylized Canada / Ontario Broker Territory Silhouette & Regional Grid -->
            <path d="M28 96 L36 62 L58 48 L78 52 L94 38 L118 42 L132 58 L142 74 L158 62 L176 48 L198 56 L216 74 L232 96 L218 112 L194 108 L174 128 L152 122 L134 108 L108 112 L74 108 L46 104 Z"
              fill="url(#hudCanMapFill)" stroke="rgba(147,197,253,0.68)" stroke-width="1.3" stroke-linejoin="round"/>
            <!-- Internal Province / Territory Boundary Lines -->
            <path d="M58 48 L54 104 M84 48 L82 108 M112 42 L110 112 M142 74 L138 110 M176 52 L166 122"
              stroke="rgba(148,163,184,0.28)" stroke-width="0.9" stroke-dasharray="2 2"/>
            <!-- Illuminated Broker Network Arcs -->
            <path d="M52 94 Q98 66 154 114" stroke="#f4c542" stroke-width="1.5" fill="none" opacity="0.85"/>
            <path d="M88 96 Q128 74 172 118" stroke="#38bdf8" stroke-width="1.6" fill="none" opacity="0.9"/>
            <path d="M122 98 Q154 80 198 102" stroke="#38bdf8" stroke-width="1.4" fill="none" opacity="0.8"/>
            <!-- Glowing Broker Node Pins -->
            <circle cx="52" cy="94" r="3" fill="#f4c542"/><circle cx="52" cy="94" r="6" stroke="#f4c542" stroke-opacity="0.45"/>
            <circle cx="88" cy="96" r="2.8" fill="#38bdf8"/>
            <circle cx="122" cy="98" r="2.8" fill="#38bdf8"/>
            <circle cx="154" cy="114" r="3.5" fill="#f4c542"/><circle cx="154" cy="114" r="7.5" stroke="#f4c542" stroke-opacity="0.55"/>
            <circle cx="172" cy="118" r="3.2" fill="#38bdf8"/><circle cx="172" cy="118" r="6.5" stroke="#38bdf8" stroke-opacity="0.5"/>
            <circle cx="198" cy="102" r="2.8" fill="#60a5fa"/>
          </svg>
        `,
        hudTelemetry: {
          header: "Broker Renewals",
          subHeader: "Automated",
          bigValue: "~80%",
          bars: [32, 42, 48, 56, 68, 76, 94, 82],
          highlightBar: 6,
          rows: [
            { label: "Commercial", pct: 60, val: "~60%" },
            { label: "Farm", pct: 40, val: "~40%" }
          ]
        },
        flowNodes: [
          {
            label: "Brokers",
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
          },
          {
            label: "CSIO/XML",
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="m10 13-2 2 2 2M14 13l2 2-2 2"/></svg>`
          },
          {
            label: "Underwriting Rules",
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`
          },
          {
            label: "Renewals",
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
          }
        ],
        bottomMetrics: [
          {
            tone: "gold",
            val: "~80%",
            label: "Residential Renewals",
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
          },
          {
            tone: "gold",
            val: "~60%",
            label: "Commercial Renewals",
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></svg>`
          },
          {
            tone: "gold",
            val: "~40%",
            label: "Farm Renewals",
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`
          },
          {
            tone: "gold",
            val: "Faster",
            label: "Broker Workflows",
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`
          },
          {
            tone: "gold",
            val: "Connected",
            label: "Brokers, Rules & Systems",
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M10.5 7 6.5 15.8M13.5 7l4 8.8M7.5 18h9"/></svg>`
          }
        ]
      },
      {
        id: "clouds",
        stepNum: "03",
        stepShort: "The Cloud",
        start: 14.4,
        end: 23.4,
        climbStart: 20.8,
        theme: "cyan",
        kicker: "LEVEL 03 · 2022 – PRESENT · ENTERPRISE CLAIMS & AI",
        titleLine1: "Building in",
        titleAccent: "the cloud.",
        body: "Enterprise health & dental claims analysis, provider registry synchronization and SQL reconciliation at Medavie Blue Cross — while architecting NEXUS for governed AI orchestration.",
        exploreHref: "#projects/nexus",
        exploreChapter: "clouds",
        pills: [
          {
            label: "Medavie Claims & SQL",
            icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7"><ellipse cx="10" cy="4.5" rx="6" ry="2.3"/><path d="M4 4.5v5c0 1.27 2.69 2.3 6 2.3s6-1.03 6-2.3v-5"/><path d="M4 9.5v5c0 1.27 2.69 2.3 6 2.3s6-1.03 6-2.3v-5"/></svg>`
          },
          {
            label: "Provider Integration",
            icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 10a6 6 0 0 1 10.3-4.2L16 7.5M16 4v3.5h-3.5M16 10a6 6 0 0 1-10.3 4.2L4 12.5M4 16v-3.5h3.5"/></svg>`
          },
          {
            label: "NEXUS AI Platform",
            icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="10" cy="10" r="3"/><circle cx="4" cy="5" r="1.8"/><circle cx="16" cy="5" r="1.8"/><circle cx="4" cy="15" r="1.8"/><circle cx="16" cy="15" r="1.8"/><path d="M5.5 6.2 7.8 8.2M14.5 6.2 12.2 8.2M5.5 13.8l2.3-2M14.5 13.8l-2.3-2"/></svg>`
          }
        ],
        hudVisualSvg: `
          <svg class="journey-hud-map-svg" viewBox="0 0 260 156" fill="none">
            <defs>
              <radialGradient id="hudNexusCore" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.45"/>
                <stop offset="55%" stop-color="#10b981" stop-opacity="0.14"/>
                <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
              </radialGradient>
            </defs>
            <circle cx="130" cy="78" r="68" fill="url(#hudNexusCore)"/>
            <circle cx="130" cy="78" r="56" stroke="rgba(56,189,248,0.28)" stroke-width="1" stroke-dasharray="3 3"/>
            <circle cx="130" cy="78" r="38" stroke="rgba(52,211,153,0.42)" stroke-width="1.2"/>
            <circle cx="130" cy="78" r="20" stroke="rgba(56,189,248,0.65)" stroke-width="1.4"/>
            <!-- Radial Agent & Claims Sync Spokes -->
            <path d="M130 22v112M74 78h112M90 38l80 80M170 38l-80 80" stroke="rgba(56,189,248,0.26)" stroke-width="1"/>
            <!-- Outer Agent & Provider Nodes -->
            <circle cx="130" cy="22" r="4.5" fill="#38bdf8"/>
            <circle cx="186" cy="78" r="4.5" fill="#34d399"/>
            <circle cx="130" cy="134" r="4.5" fill="#38bdf8"/>
            <circle cx="74" cy="78" r="4.5" fill="#f4c542"/>
            <circle cx="90" cy="38" r="3.5" fill="#34d399"/>
            <circle cx="170" cy="38" r="3.5" fill="#f4c542"/>
            <circle cx="170" cy="118" r="3.5" fill="#38bdf8"/>
            <circle cx="90" cy="118" r="3.5" fill="#34d399"/>
            <!-- Central Glowing NEXUS Core -->
            <circle cx="130" cy="78" r="8" fill="#ffffff" stroke="#38bdf8" stroke-width="3"/>
          </svg>
        `,
        hudTelemetry: {
          header: "Claims & AI Systems",
          subHeader: "Orchestration",
          bigValue: "NEXUS",
          bars: [44, 52, 64, 72, 80, 88, 96, 90],
          highlightBar: 6,
          rows: [
            { label: "Provider Sync", pct: 88, val: "Event+REST" },
            { label: "Claims SQL", pct: 92, val: "Reconciled" }
          ]
        },
        flowNodes: [
          {
            label: "Provider Sync",
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>`
          },
          {
            label: "Claims SQL",
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/></svg>`
          },
          {
            label: "NEXUS Agents",
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04Z"/></svg>`
          },
          {
            label: "Governed Output",
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>`
          }
        ],
        bottomMetrics: [
          {
            tone: "cyan",
            val: "REST + Events",
            label: "Provider Registry Sync",
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/></svg>`
          },
          {
            tone: "cyan",
            val: "Claims SQL",
            label: "Financial Reconciliation",
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/></svg>`
          },
          {
            tone: "cyan",
            val: "Continuity",
            label: "Reporting Analysis & Design",
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>`
          },
          {
            tone: "cyan",
            val: "NEXUS",
            label: "Multi-Agent Orchestration",
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="m6.7 7.3 3.2 2.7m4.2 0 3.2-2.7M6.7 16.7l3.2-2.7m4.2 0 3.2 2.7"/></svg>`
          },
          {
            tone: "cyan",
            val: "Governed",
            label: "Scoped Context & Receipts",
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>`
          }
        ]
      }
    ];

    function renderVolumetricCloudBeltsHtml(prefix = "hero-cloud") {
      return `
          <!-- Shared SVG filter definitions for uneven, multi-depth realistic cloud edges that dissolve into air -->
          <svg class="hero-cloud-defs-svg" width="0" height="0" focusable="false" aria-hidden="true" stroke="none" stroke-width="0">
            <defs>
              <!-- Layer 1 (Distant Shadowed Cloud Bank): High fractal turbulence for ragged, wind-torn distant cloud edges -->
              <filter id="${prefix}-wisp-filter" filterUnits="userSpaceOnUse" x="-360" y="-140" width="4560" height="460" color-interpolation-filters="sRGB">
                <feGaussianBlur in="SourceGraphic" stdDeviation="16 12" result="softField"/>
                <feTurbulence type="fractalNoise" baseFrequency="0.0055 0.012" numOctaves="5" seed="29" result="warpNoise"/>
                <feDisplacementMap in="softField" in2="warpNoise" scale="52" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
                <feGaussianBlur in="displaced" stdDeviation="12 9" result="mist"/>
                <feGaussianBlur in="displaced" stdDeviation="5 4" result="core"/>
                <feMerge>
                  <feMergeNode in="mist"/>
                  <feMergeNode in="core"/>
                </feMerge>
              </filter>

              <!-- Layer 2 (Midground Sculpted Cumulus): Crisp fractal billow displacement for realistic cauliflower cloud tops -->
              <filter id="${prefix}-cumulus-filter" filterUnits="userSpaceOnUse" x="-360" y="-140" width="4560" height="460" color-interpolation-filters="sRGB">
                <feGaussianBlur in="SourceGraphic" stdDeviation="12 9" result="softField"/>
                <feTurbulence type="fractalNoise" baseFrequency="0.0075 0.015" numOctaves="5" seed="17" result="warpNoise"/>
                <feDisplacementMap in="softField" in2="warpNoise" scale="42" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
                <feGaussianBlur in="displaced" stdDeviation="10 7" result="mist"/>
                <feGaussianBlur in="displaced" stdDeviation="4 3" result="core"/>
                <feMerge>
                  <feMergeNode in="mist"/>
                  <feMergeNode in="core"/>
                </feMerge>
              </filter>

              <!-- Layer 3 (Foreground Sunlit Cumulus Crest): Detailed organic vapor edge dissolving into pure #ffffff base -->
              <filter id="${prefix}-front-filter" filterUnits="userSpaceOnUse" x="-360" y="-140" width="4560" height="460" color-interpolation-filters="sRGB">
                <feGaussianBlur in="SourceGraphic" stdDeviation="10 8" result="softField"/>
                <feTurbulence type="fractalNoise" baseFrequency="0.009 0.018" numOctaves="5" seed="7" result="warpNoise"/>
                <feDisplacementMap in="softField" in2="warpNoise" scale="34" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
                <feGaussianBlur in="displaced" stdDeviation="8 6" result="mist"/>
                <feGaussianBlur in="displaced" stdDeviation="3.5 2.5" result="core"/>
                <feMerge>
                  <feMergeNode in="mist"/>
                  <feMergeNode in="core"/>
                </feMerge>
              </filter>

              <!-- Depth Plane 1 Gradient: Pure white translucent upper-atmosphere vapor (zero grey tint at seam) -->
              <radialGradient id="${prefix}-puff-back" cx="50%" cy="68%" r="58%" fx="50%" fy="62%">
                <stop offset="0%" stop-color="#ffffff" stop-opacity="0.68"/>
                <stop offset="38%" stop-color="#ffffff" stop-opacity="0.42"/>
                <stop offset="72%" stop-color="#ffffff" stop-opacity="0.16"/>
                <stop offset="95%" stop-color="#ffffff" stop-opacity="0"/>
                <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
              </radialGradient>

              <!-- Depth Plane 2 Gradient: Luminous pure-white midground cumulus domes -->
              <radialGradient id="${prefix}-puff-mid" cx="50%" cy="70%" r="58%" fx="48%" fy="64%">
                <stop offset="0%" stop-color="#ffffff" stop-opacity="0.88"/>
                <stop offset="40%" stop-color="#ffffff" stop-opacity="0.60"/>
                <stop offset="74%" stop-color="#ffffff" stop-opacity="0.24"/>
                <stop offset="95%" stop-color="#ffffff" stop-opacity="0"/>
                <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
              </radialGradient>

              <!-- Depth Plane 3 Gradient: Sunlit foreground white cumulus billows -->
              <radialGradient id="${prefix}-puff-front" cx="50%" cy="74%" r="60%" fx="50%" fy="68%">
                <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
                <stop offset="48%" stop-color="#ffffff" stop-opacity="0.84"/>
                <stop offset="78%" stop-color="#ffffff" stop-opacity="0.34"/>
                <stop offset="96%" stop-color="#ffffff" stop-opacity="0"/>
                <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
              </radialGradient>
            </defs>
          </svg>

          <!-- Layer 1 (Back Depth Plane): Cool slate-silver distant cloud towers, ragged wisps, and deep sky valleys -->
          <div class="hero-cloud-belt hero-cloud-belt--back">
            <svg class="hero-cloud-span" viewBox="0 0 3840 270" preserveAspectRatio="none" stroke="none" stroke-width="0">
              <g filter="url(#${prefix}-wisp-filter)" fill="url(#${prefix}-puff-back)" stroke="none" stroke-width="0">
                <!-- Tile A (0..1920): Asymmetric towering cumulus clusters + deep open troughs + detached high wisps -->
                <!-- Cluster 1: Tall left-of-center cumulus tower rising to y=32 -->
                <ellipse cx="-30" cy="215" rx="165" ry="62"/>
                <ellipse cx="115" cy="168" rx="195" ry="96"/>
                <ellipse cx="235" cy="118" rx="165" ry="102"/>
                <ellipse cx="330" cy="152" rx="180" ry="88"/>
                <ellipse cx="205" cy="78" rx="115" ry="52"/>
                <!-- Valley 1 (x=460..720): Low translucent mist trough + detached floating wisp -->
                <ellipse cx="520" cy="232" rx="150" ry="44"/>
                <ellipse cx="640" cy="138" rx="110" ry="28"/>
                <ellipse cx="685" cy="238" rx="145" ry="40"/>
                <!-- Cluster 2: Massive billowing anvil mass (x=820..1260) rising to y=24 -->
                <ellipse cx="860" cy="174" rx="185" ry="86"/>
                <ellipse cx="1015" cy="112" rx="210" ry="108"/>
                <ellipse cx="1135" cy="96" rx="175" ry="96"/>
                <ellipse cx="1065" cy="64" rx="135" ry="48"/>
                <ellipse cx="1265" cy="164" rx="190" ry="84"/>
                <!-- Valley 2 (x=1390..1610): Deep open sky trough -->
                <ellipse cx="1455" cy="234" rx="155" ry="42"/>
                <ellipse cx="1550" cy="152" rx="95" ry="24"/>
                <!-- Cluster 3: Right ridge climbing toward seam (x=1640..1920) -->
                <ellipse cx="1695" cy="182" rx="185" ry="78"/>
                <ellipse cx="1815" cy="144" rx="165" ry="92"/>
                <ellipse cx="1890" cy="215" rx="165" ry="62"/>

                <!-- Tile B (+1920px exact shift) -->
                <ellipse cx="2035" cy="168" rx="195" ry="96"/>
                <ellipse cx="2155" cy="118" rx="165" ry="102"/>
                <ellipse cx="2250" cy="152" rx="180" ry="88"/>
                <ellipse cx="2125" cy="78" rx="115" ry="52"/>
                <ellipse cx="2440" cy="232" rx="150" ry="44"/>
                <ellipse cx="2560" cy="138" rx="110" ry="28"/>
                <ellipse cx="2605" cy="238" rx="145" ry="40"/>
                <ellipse cx="2780" cy="174" rx="185" ry="86"/>
                <ellipse cx="2935" cy="112" rx="210" ry="108"/>
                <ellipse cx="3055" cy="96" rx="175" ry="96"/>
                <ellipse cx="2985" cy="64" rx="135" ry="48"/>
                <ellipse cx="3185" cy="164" rx="190" ry="84"/>
                <ellipse cx="3375" cy="234" rx="155" ry="42"/>
                <ellipse cx="3470" cy="152" rx="95" ry="24"/>
                <ellipse cx="3615" cy="182" rx="185" ry="78"/>
                <ellipse cx="3735" cy="144" rx="165" ry="92"/>
                <ellipse cx="3810" cy="215" rx="165" ry="62"/>
                <ellipse cx="3955" cy="168" rx="195" ry="96"/>
              </g>
            </svg>
          </div>

          <!-- Layer 2 (Midground Depth Plane): Pearl-and-silver sculpted cumulus domes offset against Layer 1 -->
          <div class="hero-cloud-belt hero-cloud-belt--mid">
            <svg class="hero-cloud-span" viewBox="0 0 3840 270" preserveAspectRatio="none" stroke="none" stroke-width="0">
              <g filter="url(#${prefix}-cumulus-filter)" fill="url(#${prefix}-puff-mid)" stroke="none" stroke-width="0">
                <!-- Tile A (0..1920): Offset peaks and valleys creating multi-plane parallax depth -->
                <ellipse cx="-40" cy="178" rx="175" ry="82"/>
                <ellipse cx="75" cy="146" rx="160" ry="92"/>
                <!-- Deep trough at x=210..390 where Layer 1 tower rises behind! -->
                <ellipse cx="265" cy="228" rx="145" ry="48"/>
                <!-- Tall Midground Tower at x=430..740 rising into Layer 1's valley! -->
                <ellipse cx="455" cy="176" rx="170" ry="84"/>
                <ellipse cx="585" cy="122" rx="190" ry="104"/>
                <ellipse cx="665" cy="94" rx="135" ry="68"/>
                <ellipse cx="735" cy="164" rx="175" ry="86"/>
                <!-- Midground Trough at x=880..1080 -->
                <ellipse cx="945" cy="224" rx="155" ry="52"/>
                <ellipse cx="1055" cy="236" rx="135" ry="42"/>
                <!-- Steep Billow Bank at x=1180..1580 -->
                <ellipse cx="1215" cy="182" rx="165" ry="78"/>
                <ellipse cx="1355" cy="128" rx="195" ry="102"/>
                <ellipse cx="1445" cy="102" rx="140" ry="66"/>
                <ellipse cx="1545" cy="168" rx="175" ry="84"/>
                <!-- Trough & Right Crest (x=1680..1920) -->
                <ellipse cx="1715" cy="226" rx="145" ry="48"/>
                <ellipse cx="1880" cy="178" rx="175" ry="82"/>

                <!-- Tile B (+1920px exact shift) -->
                <ellipse cx="1995" cy="146" rx="160" ry="92"/>
                <ellipse cx="2185" cy="228" rx="145" ry="48"/>
                <ellipse cx="2375" cy="176" rx="170" ry="84"/>
                <ellipse cx="2505" cy="122" rx="190" ry="104"/>
                <ellipse cx="2585" cy="94" rx="135" ry="68"/>
                <ellipse cx="2655" cy="164" rx="175" ry="86"/>
                <ellipse cx="2865" cy="224" rx="155" ry="52"/>
                <ellipse cx="2975" cy="236" rx="135" ry="42"/>
                <ellipse cx="3135" cy="182" rx="165" ry="78"/>
                <ellipse cx="3275" cy="128" rx="195" ry="102"/>
                <ellipse cx="3365" cy="102" rx="140" ry="66"/>
                <ellipse cx="3465" cy="168" rx="175" ry="84"/>
                <ellipse cx="3635" cy="226" rx="145" ry="48"/>
                <ellipse cx="3800" cy="178" rx="175" ry="82"/>
                <ellipse cx="3915" cy="146" rx="160" ry="92"/>
              </g>
            </svg>
          </div>

          <!-- Layer 3 (Foreground Depth Plane): Bright sunlit white cumulus crests with dramatic peaks & valleys (zero rect bands) -->
          <div class="hero-cloud-belt hero-cloud-belt--front">
            <svg class="hero-cloud-span" viewBox="0 0 3840 270" preserveAspectRatio="none" stroke="none" stroke-width="0">
              <g filter="url(#${prefix}-front-filter)" fill="url(#${prefix}-puff-front)" stroke="none" stroke-width="0">
                <!-- Tile A (0..1920): Uneven foreground cloud domes + continuous lower bed at cy=245..262 -->
                <!-- Foreground Peak 1 (x=60..340) -->
                <ellipse cx="0" cy="238" rx="185" ry="58"/>
                <ellipse cx="145" cy="182" rx="175" ry="88"/>
                <ellipse cx="235" cy="148" rx="135" ry="78"/>
                <ellipse cx="335" cy="198" rx="165" ry="74"/>
                <!-- Foreground Valley 1 (x=420..680) -->
                <ellipse cx="485" cy="246" rx="195" ry="48"/>
                <ellipse cx="635" cy="236" rx="175" ry="56"/>
                <!-- Foreground Peak 2 (x=740..1120) -->
                <ellipse cx="795" cy="192" rx="170" ry="82"/>
                <ellipse cx="925" cy="136" rx="185" ry="98"/>
                <ellipse cx="1015" cy="118" rx="125" ry="68"/>
                <ellipse cx="1095" cy="176" rx="175" ry="86"/>
                <!-- Foreground Valley 2 (x=1200..1460) -->
                <ellipse cx="1265" cy="244" rx="190" ry="50"/>
                <ellipse cx="1415" cy="232" rx="175" ry="58"/>
                <!-- Foreground Peak 3 (x=1520..1820) -->
                <ellipse cx="1565" cy="178" rx="180" ry="88"/>
                <ellipse cx="1675" cy="144" rx="145" ry="82"/>
                <ellipse cx="1785" cy="202" rx="170" ry="72"/>
                <ellipse cx="1920" cy="238" rx="185" ry="58"/>

                <!-- Tile B (+1920px exact shift) -->
                <ellipse cx="2065" cy="182" rx="175" ry="88"/>
                <ellipse cx="2155" cy="148" rx="135" ry="78"/>
                <ellipse cx="2255" cy="198" rx="165" ry="74"/>
                <ellipse cx="2405" cy="246" rx="195" ry="48"/>
                <ellipse cx="2555" cy="236" rx="175" ry="56"/>
                <ellipse cx="2715" cy="192" rx="170" ry="82"/>
                <ellipse cx="2845" cy="136" rx="185" ry="98"/>
                <ellipse cx="2935" cy="118" rx="125" ry="68"/>
                <ellipse cx="3015" cy="176" rx="175" ry="86"/>
                <ellipse cx="3185" cy="244" rx="190" ry="50"/>
                <ellipse cx="3335" cy="232" rx="175" ry="58"/>
                <ellipse cx="3485" cy="178" rx="180" ry="88"/>
                <ellipse cx="3595" cy="144" rx="145" ry="82"/>
                <ellipse cx="3705" cy="202" rx="170" ry="72"/>
                <ellipse cx="3840" cy="238" rx="185" ry="58"/>
              </g>
            </svg>
          </div>
      `;
    }

    function renderBuildsStageCloudWeaveHtml(prefix = "builds-stage") {
      return `
        <svg class="builds-cloud-defs-svg" width="0" height="0" focusable="false" aria-hidden="true" stroke="none" stroke-width="0">
          <defs>
            <!-- Filter 1: Deep Macro Cloud Stratus-Cumulus Sheet (large uneven soft edges across full stage) -->
            <filter id="${prefix}-deep-cumulus" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
              <feGaussianBlur in="SourceGraphic" stdDeviation="16 11" result="smoothField"/>
              <feTurbulence type="fractalNoise" baseFrequency="0.0032 0.0075" numOctaves="5" seed="19" result="fbmNoise"/>
              <feDisplacementMap data-cloud-disp-map="cumulus" data-base-scale="96" in="smoothField" in2="fbmNoise" scale="96" xChannelSelector="R" yChannelSelector="G" result="billowed"/>
              <feGaussianBlur in="billowed" stdDeviation="14 10" result="vaporMist"/>
              <feGaussianBlur in="billowed" stdDeviation="6 4.5" result="vaporCore"/>
              <feColorMatrix data-cloud-alpha-matrix="cumulus" data-base-slope="1.24" data-base-intercept="-0.08" in="fbmNoise" type="matrix" values="
                0 0 0 0 1
                0 0 0 0 1
                0 0 0 0 1
                0 0 0 1.24 -0.08
              " result="wispMask"/>
              <feComposite in="vaporCore" in2="wispMask" operator="in" result="wispyCore"/>
              <feMerge>
                <feMergeNode in="vaporMist"/>
                <feMergeNode in="wispyCore"/>
              </feMerge>
            </filter>

            <!-- Filter 2: Wide Atmospheric Mist Sheet (long flowing uneven mist banks that advance/recede in depth) -->
            <filter id="${prefix}-wind-stratus" x="-35%" y="-35%" width="170%" height="170%" color-interpolation-filters="sRGB">
              <feGaussianBlur in="SourceGraphic" stdDeviation="18 10" result="stretchedField"/>
              <feTurbulence type="fractalNoise" baseFrequency="0.0026 0.0085" numOctaves="5" seed="67" result="shearNoise"/>
              <feDisplacementMap data-cloud-disp-map="stratus" data-base-scale="88" in="stretchedField" in2="shearNoise" scale="88" xChannelSelector="R" yChannelSelector="G" result="sheared"/>
              <feGaussianBlur in="sheared" stdDeviation="15 9" result="airVeil"/>
              <feGaussianBlur in="sheared" stdDeviation="6.5 4" result="filament"/>
              <feColorMatrix data-cloud-alpha-matrix="stratus" data-base-slope="1.20" data-base-intercept="-0.10" in="shearNoise" type="matrix" values="
                0 0 0 0 1
                0 0 0 0 1
                0 0 0 0 1
                0 0 0 1.20 -0.10
              " result="filamentAlpha"/>
              <feComposite in="filament" in2="filamentAlpha" operator="in" result="wispyFilament"/>
              <feMerge>
                <feMergeNode in="airVeil"/>
                <feMergeNode in="wispyFilament"/>
              </feMerge>
            </filter>

            <!-- Filter 3: Gossamer Foreground Mist Veil (ultra-wide, soft uneven mist sheet with zero localized blotches) -->
            <filter id="${prefix}-wisp-weave" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
              <feGaussianBlur in="SourceGraphic" stdDeviation="16 10" result="smoothField"/>
              <feTurbulence type="fractalNoise" baseFrequency="0.0030 0.0080" numOctaves="5" seed="42" result="wispNoise"/>
              <feDisplacementMap data-cloud-disp-map="wisp" data-base-scale="82" in="smoothField" in2="wispNoise" scale="82" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
              <feGaussianBlur in="displaced" stdDeviation="14 8" result="mist"/>
              <feGaussianBlur in="displaced" stdDeviation="6 4" result="crest"/>
              <feColorMatrix data-cloud-alpha-matrix="wisp" data-base-slope="1.18" data-base-intercept="-0.12" in="wispNoise" type="matrix" values="
                0 0 0 0 1
                0 0 0 0 1
                0 0 0 0 1
                0 0 0 1.18 -0.12
              " result="tendrilAlpha"/>
              <feComposite in="crest" in2="tendrilAlpha" operator="in" result="featheredCrest"/>
              <feMerge>
                <feMergeNode in="mist"/>
                <feMergeNode in="featheredCrest"/>
              </feMerge>
            </filter>

            <!-- Layered Mist Sheet Gradients: UserSpaceOnUse guarantees 0% opacity before left/right SVG edges -->
            <linearGradient id="${prefix}-mist-sheet-bright" gradientUnits="userSpaceOnUse" x1="100" y1="150" x2="2300" y2="850">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
              <stop offset="8%" stop-color="#ffffff" stop-opacity="0"/>
              <stop offset="22%" stop-color="#ffffff" stop-opacity="0.90"/>
              <stop offset="50%" stop-color="#ffffff" stop-opacity="1"/>
              <stop offset="78%" stop-color="#ffffff" stop-opacity="0.90"/>
              <stop offset="92%" stop-color="#ffffff" stop-opacity="0"/>
              <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
            </linearGradient>

            <linearGradient id="${prefix}-mist-sheet-shadow" gradientUnits="userSpaceOnUse" x1="100" y1="200" x2="2300" y2="800">
              <stop offset="0%" stop-color="#a8ccf0" stop-opacity="0"/>
              <stop offset="8%" stop-color="#a8ccf0" stop-opacity="0"/>
              <stop offset="22%" stop-color="#a5caf0" stop-opacity="0.78"/>
              <stop offset="50%" stop-color="#bad7f6" stop-opacity="0.88"/>
              <stop offset="78%" stop-color="#a5caf0" stop-opacity="0.78"/>
              <stop offset="92%" stop-color="#a8ccf0" stop-opacity="0"/>
              <stop offset="100%" stop-color="#a8ccf0" stop-opacity="0"/>
            </linearGradient>

            <linearGradient id="${prefix}-mist-sheet-depth" gradientUnits="userSpaceOnUse" x1="100" y1="800" x2="2300" y2="200">
              <stop offset="0%" stop-color="#b4d3f4" stop-opacity="0"/>
              <stop offset="8%" stop-color="#b4d3f4" stop-opacity="0"/>
              <stop offset="22%" stop-color="#bdd9f7" stop-opacity="0.76"/>
              <stop offset="52%" stop-color="#ffffff" stop-opacity="0.96"/>
              <stop offset="78%" stop-color="#b8d6f5" stop-opacity="0.74"/>
              <stop offset="92%" stop-color="#ffffff" stop-opacity="0"/>
              <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
            </linearGradient>

            <radialGradient id="${prefix}-puff-sunlit" cx="50%" cy="48%" r="50%">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0.98"/>
              <stop offset="48%" stop-color="#ffffff" stop-opacity="0.82"/>
              <stop offset="80%" stop-color="#f0f7ff" stop-opacity="0.36"/>
              <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
            </radialGradient>

            <radialGradient id="${prefix}-puff-ambient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#afd0f2" stop-opacity="0.82"/>
              <stop offset="52%" stop-color="#c8e0f9" stop-opacity="0.54"/>
              <stop offset="84%" stop-color="#e8f3fd" stop-opacity="0.20"/>
              <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
            </radialGradient>

            <radialGradient id="${prefix}-puff-wisp" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0.76"/>
              <stop offset="50%" stop-color="#f4f9ff" stop-opacity="0.48"/>
              <stop offset="82%" stop-color="#e0effc" stop-opacity="0.18"/>
              <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
            </radialGradient>
          </defs>
        </svg>

        <!-- PLANE 1: SINGLE GIANT CLOUD INTERIOR WITH LAYERED FULL-SPAN MIST SHEETS (z-index: 1) -->
        <div class="carousel-clouds-behind" aria-hidden="true">
          <!-- Depth Layer 1 (Deepest Cloud Bed): Full-section billowing cloud shadow & sunlit interior -->
          <div class="builds-cloud-formation builds-cloud--stage-sea">
            <svg viewBox="0 0 2400 1100" preserveAspectRatio="none" stroke="none" stroke-width="0">
              <g filter="url(#${prefix}-deep-cumulus)" stroke="none" stroke-width="0">
                <path data-cloud-parcel="0" data-parcel-mass="0.96" fill="url(#${prefix}-mist-sheet-shadow)"
                  d="M -180 520 C 80 210, 420 140, 780 290 C 1120 430, 1440 130, 1810 250 C 2110 350, 2340 190, 2580 460 C 2620 780, 2290 960, 1910 850 C 1520 740, 1210 980, 820 860 C 440 740, 120 940, -180 730 Z"/>
                <path data-cloud-parcel="1" data-parcel-mass="0.90" fill="url(#${prefix}-mist-sheet-bright)"
                  d="M -120 450 C 220 190, 590 380, 990 210 C 1390 50, 1780 330, 2150 180 C 2410 90, 2560 350, 2490 650 C 2170 840, 1750 660, 1330 820 C 910 970, 490 710, -120 690 Z"/>
              </g>
            </svg>
          </div>

          <!-- Depth Layer 2 (Upper-Canopy Mist Bank): Wide uneven sunlit mist sheet drifting & breathing in Z-depth -->
          <div class="builds-cloud-formation builds-cloud--top-crown">
            <svg viewBox="0 0 2400 1000" preserveAspectRatio="none" stroke="none" stroke-width="0">
              <g filter="url(#${prefix}-wind-stratus)" stroke="none" stroke-width="0">
                <path data-cloud-parcel="0" data-parcel-mass="0.88" fill="url(#${prefix}-mist-sheet-bright)"
                  d="M -140 340 C 190 110, 530 290, 890 140 C 1250 10, 1590 260, 1950 110 C 2230 20, 2460 200, 2540 430 C 2280 610, 1910 460, 1530 600 C 1150 740, 770 490, 410 630 C 110 730, -80 570, -140 340 Z"/>
                <path data-cloud-parcel="1" data-parcel-mass="0.82" fill="url(#${prefix}-mist-sheet-shadow)"
                  d="M -100 240 C 260 90, 640 230, 1020 110 C 1400 0, 1760 190, 2140 90 C 2380 40, 2520 180, 2480 360 C 2180 490, 1820 350, 1420 470 C 1020 590, 620 390, 240 490 C -20 550, -120 410, -100 240 Z"/>
              </g>
            </svg>
          </div>

          <!-- Depth Layer 3 (Advancing Mid-Cloud Mist Sheet A): Full-span undulating vapor layer moving forward/backward -->
          <div class="builds-cloud-formation builds-cloud--left-wing-back">
            <svg viewBox="0 0 2400 1000" preserveAspectRatio="none" stroke="none" stroke-width="0">
              <g filter="url(#${prefix}-wind-stratus)" stroke="none" stroke-width="0">
                <path data-cloud-parcel="0" data-parcel-mass="0.84" fill="url(#${prefix}-mist-sheet-depth)"
                  d="M -160 470 C 170 250, 550 450, 930 260 C 1310 80, 1690 370, 2050 220 C 2330 120, 2520 330, 2540 590 C 2240 770, 1850 590, 1470 760 C 1090 920, 670 670, 310 800 C 10 880, -140 680, -160 470 Z"/>
                <path data-cloud-parcel="1" data-parcel-mass="0.76" fill="url(#${prefix}-mist-sheet-bright)"
                  d="M -120 560 C 240 380, 620 540, 1010 390 C 1400 240, 1780 480, 2160 350 C 2410 270, 2540 450, 2510 680 C 2190 830, 1810 690, 1410 830 C 1010 960, 610 740, 210 850 C -50 910, -140 740, -120 560 Z"/>
              </g>
            </svg>
          </div>

          <!-- Depth Layer 4 (Counter-Phase Mid-Cloud Mist Sheet B): Cross-drifting full-width mist layer -->
          <div class="builds-cloud-formation builds-cloud--right-upper-back">
            <svg viewBox="0 0 2400 1000" preserveAspectRatio="none" stroke="none" stroke-width="0">
              <g filter="url(#${prefix}-wind-stratus)" stroke="none" stroke-width="0">
                <path data-cloud-parcel="0" data-parcel-mass="0.82" fill="url(#${prefix}-mist-sheet-shadow)"
                  d="M -140 510 C 230 350, 590 170, 990 330 C 1390 490, 1750 180, 2130 340 C 2390 450, 2540 290, 2560 570 C 2280 790, 1890 890, 1490 710 C 1090 540, 710 830, 330 680 C 30 560, -120 710, -140 510 Z"/>
                <path data-cloud-parcel="1" data-parcel-mass="0.78" fill="url(#${prefix}-mist-sheet-bright)"
                  d="M -100 390 C 280 220, 670 390, 1070 240 C 1470 90, 1850 320, 2210 190 C 2440 110, 2560 290, 2520 510 C 2210 670, 1830 520, 1430 670 C 1030 810, 630 590, 230 710 C -40 780, -130 580, -100 390 Z"/>
              </g>
            </svg>
          </div>

          <!-- Depth Layer 5 (Lower Cloud Base Mist Sheet): Wide uneven cloud floor -->
          <div class="builds-cloud-formation builds-cloud--left-base-back">
            <svg viewBox="0 0 2400 950" preserveAspectRatio="none" stroke="none" stroke-width="0">
              <g filter="url(#${prefix}-deep-cumulus)" stroke="none" stroke-width="0">
                <path data-cloud-parcel="0" data-parcel-mass="0.88" fill="url(#${prefix}-mist-sheet-bright)"
                  d="M -160 540 C 190 350, 570 510, 970 350 C 1370 190, 1750 450, 2130 310 C 2390 220, 2540 420, 2560 710 C 2220 910, 1780 790, 1340 910 C 900 1020, 440 820, -160 810 Z"/>
                <path data-cloud-parcel="1" data-parcel-mass="0.80" fill="url(#${prefix}-mist-sheet-depth)"
                  d="M -140 660 C 220 490, 610 640, 1010 490 C 1410 340, 1790 570, 2170 440 C 2420 360, 2550 530, 2530 790 C 2190 940, 1790 830, 1370 930 C 950 1020, 510 860, -140 870 Z"/>
              </g>
            </svg>
          </div>
        </div>

        <!-- PLANE 2: CONTINUOUS FOREGROUND MIST SHEETS (z-index: 3)
             Wide, full-stage uneven mist layers that drift and breathe forward/backward in depth
             across the side peek cards without any localized blotches -->
        <div class="carousel-clouds-inweaved" aria-hidden="true">
          <!-- 2A. Primary Full-Span Foreground Mist Sheet -->
          <div class="builds-cloud-wisp builds-wisp--cross-stream">
            <svg viewBox="0 0 2400 1000" preserveAspectRatio="none" stroke="none" stroke-width="0">
              <g filter="url(#${prefix}-wisp-weave)" stroke="none" stroke-width="0">
                <path data-cloud-parcel="0" data-parcel-mass="0.62" fill="url(#${prefix}-mist-sheet-bright)"
                  d="M -160 420 C 190 220, 550 390, 930 230 C 1310 80, 1690 340, 2070 190 C 2350 90, 2520 300, 2560 540 C 2260 730, 1880 570, 1480 730 C 1080 880, 680 640, 300 770 C 10 860, -140 650, -160 420 Z"/>
                <path data-cloud-parcel="1" data-parcel-mass="0.56" fill="url(#${prefix}-mist-sheet-depth)"
                  d="M -140 580 C 230 410, 620 560, 1020 400 C 1420 240, 1800 480, 2180 340 C 2430 250, 2550 430, 2530 680 C 2210 840, 1820 700, 1420 840 C 1020 970, 620 760, 220 860 C -40 920, -140 760, -140 580 Z"/>
              </g>
            </svg>
          </div>

          <!-- 2B. Secondary Counter-Drifting Foreground Mist Sheet (moves in opposite Z-depth phase) -->
          <div class="builds-cloud-wisp builds-wisp--left-mid">
            <svg viewBox="0 0 2400 1000" preserveAspectRatio="none" stroke="none" stroke-width="0">
              <g filter="url(#${prefix}-wind-stratus)" stroke="none" stroke-width="0">
                <path data-cloud-parcel="0" data-parcel-mass="0.58" fill="url(#${prefix}-mist-sheet-bright)"
                  d="M -160 520 C 210 350, 610 190, 1020 350 C 1430 500, 1790 220, 2160 370 C 2410 470, 2540 330, 2560 610 C 2240 820, 1840 900, 1440 740 C 1040 590, 660 840, 280 700 C -20 590, -140 730, -160 520 Z"/>
              </g>
            </svg>
          </div>
        </div>
      `;
    }

    function renderBuildsLoopCloudWeaveHtml() {
      return "";
    }

    if (heroSection && !heroSection.querySelector(".home-hero-backdrop")) {
      const portraitMq = window.matchMedia
        ? window.matchMedia("(max-width: 768px), (max-aspect-ratio: 4/5)")
        : null;
      const isPortraitMobile = Boolean(portraitMq && portraitMq.matches);
      const initialVideoSrc = isPortraitMobile
        ? "assets/home-hero-video-mobile.mp4"
        : "assets/home-hero-video.mp4";
      const initialPosterSrc = isPortraitMobile
        ? "assets/home-hero-final-frame-mobile.jpg"
        : "assets/home-hero-final-frame.jpg";

      const backdropEl = document.createElement("div");
      backdropEl.className = "home-hero-backdrop";
      backdropEl.setAttribute("aria-hidden", "true");
      backdropEl.innerHTML = `
        <picture class="home-hero-final-picture">
          <source media="(max-width: 768px), (max-aspect-ratio: 4/5)" srcset="assets/home-hero-final-frame-mobile.jpg">
          <img class="home-hero-final-img" src="assets/home-hero-final-frame.jpg" alt="">
        </picture>
        <video
          class="home-hero-loop-player"
          src="assets/home-hero-loop-mobile.mp4"
          poster="assets/home-hero-final-frame-mobile.jpg"
          loop
          muted
          playsinline
          preload="${isPortraitMobile ? "auto" : "metadata"}"
        ></video>
        <video
          class="home-hero-video-player"
          src="${initialVideoSrc}"
          poster="${initialPosterSrc}"
          autoplay
          muted
          playsinline
          preload="auto"
        ></video>
        <audio
          class="home-hero-clouds-audio"
          data-home-level-audio="clouds"
          src="assets/clouds.mp3?v=5"
          loop
          preload="auto"
        ></audio>
        <audio
          class="home-level-digital-office-audio"
          data-home-level-audio="digital-office"
          src="assets/level-digital-office.mp3?v=5"
          loop
          preload="auto"
        ></audio>
        <audio
          class="home-level-office-audio"
          data-home-level-audio="office"
          src="assets/level-office.mp3?v=5"
          loop
          preload="auto"
        ></audio>
        <audio
          class="home-level-server-audio"
          data-home-level-audio="server"
          src="assets/level-server.mp3?v=5"
          loop
          preload="auto"
        ></audio>
        <div class="home-hero-scrim" data-home-hero-scrim></div>
        <div class="home-hero-cloud-transition" aria-hidden="true">
          ${renderVolumetricCloudBeltsHtml("hero-cloud")}
        </div>
      `;
      heroSection.append(backdropEl);

      function renderJourneyPillsHtml(lvl) {
        return lvl.pills
          .map(
            p => `
              <span class="journey-overlay-pill">
                <span class="journey-pill-icon" aria-hidden="true">${p.icon}</span>
                <span class="journey-pill-label">${p.label}</span>
              </span>
            `
          )
          .join("");
      }

      function renderJourneyHudTelemetryHtml(lvl) {
        const t = lvl.hudTelemetry;
        const barsHtml = t.bars
          .map(
            (h, i) =>
              `<span class="journey-hud-bar ${i === t.highlightBar ? "is-highlight" : ""}" style="height:${h}%"></span>`
          )
          .join("");
        const rowsHtml = t.rows
          .map(
            r => `
              <div class="journey-hud-row">
                <span class="journey-hud-row-label">${r.label}</span>
                <span class="journey-hud-row-track"><i style="width:${r.pct}%"></i></span>
                <strong class="journey-hud-row-val">${r.val}</strong>
              </div>
            `
          )
          .join("");
        return `
          <div class="journey-hud-tel-head">${t.header}</div>
          <div class="journey-hud-tel-sub">${t.subHeader}</div>
          <div class="journey-hud-tel-main">
            <strong class="journey-hud-big-val">${t.bigValue}</strong>
            <div class="journey-hud-bars" aria-hidden="true">${barsHtml}</div>
          </div>
          <div class="journey-hud-rows">${rowsHtml}</div>
        `;
      }

      function renderJourneyFlowNodesHtml(lvl) {
        return lvl.flowNodes
          .map(
            (n, i) => `
              <div class="journey-flow-node journey-flow-node--${i}">
                <span class="journey-flow-node-icon" aria-hidden="true">${n.icon}</span>
                <span class="journey-flow-node-label">${n.label}</span>
              </div>
            `
          )
          .join("");
      }

      function renderJourneyBottomMetricsHtml(lvl) {
        return lvl.bottomMetrics
          .map(
            m => `
              <div class="journey-bottom-metric-item">
                <span class="journey-bottom-metric-ring tone-${m.tone}" aria-hidden="true">${m.icon}</span>
                <div class="journey-bottom-metric-copy">
                  <strong>${m.val}</strong>
                  <span>${m.label}</span>
                </div>
              </div>
            `
          )
          .join("");
      }

      // Synchronized Journey Level Overlay shown as the camera travels through Levels 01 -> 02 -> 03
      const journeyOverlayEl = document.createElement("div");
      journeyOverlayEl.className = "home-journey-overlay";
      journeyOverlayEl.setAttribute("data-home-journey-overlay", "");
      journeyOverlayEl.setAttribute("aria-live", "polite");
      journeyOverlayEl.innerHTML = `
        <div class="journey-stage-grid">
          <div class="journey-left-col" data-journey-card-stage="${HOME_JOURNEY_LEVELS[0].id}" data-theme="${HOME_JOURNEY_LEVELS[0].theme}">
            <div class="journey-overlay-card">
              <p class="journey-overlay-kicker" data-journey-kicker>${HOME_JOURNEY_LEVELS[0].kicker}</p>
              <h2 class="journey-overlay-title">
                <span class="journey-title-line1" data-journey-title-1>${HOME_JOURNEY_LEVELS[0].titleLine1}</span>
                <span class="journey-title-accent" data-journey-title-accent>${HOME_JOURNEY_LEVELS[0].titleAccent}</span>
              </h2>
              <p class="journey-overlay-body" data-journey-body>${HOME_JOURNEY_LEVELS[0].body}</p>
              <div class="journey-overlay-pills" data-journey-pills>
                ${renderJourneyPillsHtml(HOME_JOURNEY_LEVELS[0])}
              </div>
              <div class="journey-cta-row">
                <a class="journey-explore-btn" href="${HOME_JOURNEY_LEVELS[0].exploreHref}" data-journey-explore data-theme="${HOME_JOURNEY_LEVELS[0].theme}" data-button-stage="${HOME_JOURNEY_LEVELS[0].id}">
                  <span>Explore This Chapter</span>
                  <span class="journey-explore-arrow" aria-hidden="true">&rarr;</span>
                </a>
                <button type="button" class="journey-secondary-btn" data-home-video-skip aria-label="Skip to final hero view">
                  <span>Skip to final view</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="journey-bottom-metrics-wrap">
          <div class="journey-bottom-metrics" data-journey-bottom-metrics>
            ${renderJourneyBottomMetricsHtml(HOME_JOURNEY_LEVELS[0])}
          </div>
        </div>
      `;
      heroSection.append(journeyOverlayEl);

      // Video player controls during active journey fly-through (chapter-segmented timeline scrubber + 3 circular icon buttons)
      const controlsEl = document.createElement("div");
      controlsEl.className = "home-hero-video-controls";
      controlsEl.innerHTML = `
        <div class="home-video-bottom-player-dock">
          <div class="home-video-scrubber-bar" data-home-video-scrubber role="slider" tabindex="0" aria-label="Story video timeline" aria-valuemin="0" aria-valuemax="23.4" aria-valuenow="0">
            <div class="home-video-scrubber-chapters" role="tablist" aria-label="Career journey video chapters">
              ${HOME_JOURNEY_LEVELS.map((lvl, idx) => {
                const segWeight = (((lvl.end - lvl.start) / 23.4) * 100).toFixed(2);
                return `
                  <button type="button" role="tab" aria-selected="${idx === 0 ? "true" : "false"}" class="journey-step-btn scrubber-chapter-seg ${idx === 0 ? "is-active" : ""}" style="flex: ${segWeight} 1 0%;" data-journey-seek="${lvl.start}" data-journey-step="${lvl.id}">
                    <div class="journey-step-top scrubber-chapter-head">
                      <span class="journey-step-num">${lvl.stepNum}</span>
                      <span class="journey-step-label">${lvl.stepShort}</span>
                    </div>
                    <div class="journey-step-track scrubber-chapter-track" aria-hidden="true">
                      <div class="journey-step-fill scrubber-chapter-fill" data-journey-fill="${lvl.id}"></div>
                    </div>
                  </button>
                `;
              }).join("")}
            </div>
          </div>

          <div class="home-video-circle-btn-row" role="group" aria-label="Video playback controls">
            <button type="button" class="home-video-circle-btn" data-home-video-pause aria-pressed="false" aria-label="Pause story video" title="Pause / Resume">
              <span class="home-video-circle-icon" data-home-pause-icon aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="currentColor" stroke="none"><rect x="5.5" y="4.5" width="3" height="11" rx="1"/><rect x="11.5" y="4.5" width="3" height="11" rx="1"/></svg>
              </span>
              <span class="sr-only" data-home-pause-label>Pause</span>
            </button>

            <button type="button" class="home-video-circle-btn" data-home-video-mute aria-label="Toggle story audio" title="Mute / Unmute Audio">
              <span class="home-video-circle-icon" data-home-mute-icon aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="9 5 5.5 8 3 8 3 12 5.5 12 9 15 9 5" fill="currentColor" stroke="none"/>
                  <line x1="16.5" y1="7.5" x2="12.5" y2="12.5"/>
                  <line x1="12.5" y1="7.5" x2="16.5" y2="12.5"/>
                </svg>
              </span>
              <span class="sr-only" data-home-mute-label>Unmute Audio</span>
            </button>

            <button type="button" class="home-video-circle-btn" data-home-video-skip aria-label="Skip to final hero view" title="Skip to final view">
              <span class="home-video-circle-icon" aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="5 4.5 12.8 10 5 15.5" fill="currentColor" stroke="none"/>
                  <line x1="15" y1="5" x2="15" y2="15"/>
                </svg>
              </span>
              <span class="sr-only">Skip to final view</span>
            </button>
          </div>
        </div>
      `;
      const journeyBottomWrapEl = journeyOverlayEl.querySelector(".journey-bottom-metrics-wrap");
      if (journeyBottomWrapEl) {
        journeyBottomWrapEl.append(controlsEl);
      } else {
        heroSection.append(controlsEl);
      }

      const vidEl = backdropEl.querySelector(".home-hero-video-player");
      const loopVidEl = backdropEl.querySelector(".home-hero-loop-player");
      const cloudsAudioEl = backdropEl.querySelector('[data-home-level-audio="clouds"]');
      const digitalOfficeAudioEl = backdropEl.querySelector('[data-home-level-audio="digital-office"]');
      const officeAudioEl = backdropEl.querySelector('[data-home-level-audio="office"]');
      const serverAudioEl = backdropEl.querySelector('[data-home-level-audio="server"]');
      const levelAudioTracks = [
        { id: "clouds", el: cloudsAudioEl, maxVol: 0.095, curVol: 0, targetVol: 0 },
        { id: "digital-office", el: digitalOfficeAudioEl, maxVol: 0.088, curVol: 0, targetVol: 0 },
        { id: "office", el: officeAudioEl, maxVol: 0.088, curVol: 0, targetVol: 0 },
        { id: "server", el: serverAudioEl, maxVol: 0.082, curVol: 0, targetVol: 0 }
      ].filter(t => Boolean(t.el));
      if (vidEl) {
        vidEl.volume = 0.45;
      }
      let levelAudioFadeRafId = 0;

      const globalMuteBtnEl = document.querySelector("[data-global-audio-mute]");
      const globalMuteIconEl = globalMuteBtnEl ? globalMuteBtnEl.querySelector("[data-global-mute-icon]") : null;
      const globalMuteLabelEl = globalMuteBtnEl ? globalMuteBtnEl.querySelector("[data-global-mute-label]") : null;
      const watchLabelEl = heroSection.querySelector("[data-home-watch-label]");
      const pauseBtnEl = controlsEl.querySelector("[data-home-video-pause]");
      const pauseIconEl = controlsEl.querySelector("[data-home-pause-icon]");
      const pauseLabelEl = controlsEl.querySelector("[data-home-pause-label]");
      const muteBtnEl = controlsEl.querySelector("[data-home-video-mute]");
      const muteIconEl = controlsEl.querySelector("[data-home-mute-icon]");
      const muteLabelEl = controlsEl.querySelector("[data-home-mute-label]");
      const progressFillEl = controlsEl.querySelector("[data-home-video-progress-fill]");
      const scrubberEl = controlsEl.querySelector("[data-home-video-scrubber]");
      const journeyLeftColEl = journeyOverlayEl.querySelector(".journey-left-col");
      const journeyCardEl = journeyOverlayEl.querySelector(".journey-overlay-card");
      const journeyRightSceneEl = journeyOverlayEl.querySelector("[data-journey-right-scene]");
      const journeyKickerEl = journeyOverlayEl.querySelector("[data-journey-kicker]");
      const journeyTitle1El = journeyOverlayEl.querySelector("[data-journey-title-1]");
      const journeyTitleAccentEl = journeyOverlayEl.querySelector("[data-journey-title-accent]");
      const journeyBodyEl = journeyOverlayEl.querySelector("[data-journey-body]");
      const journeyPillsEl = journeyOverlayEl.querySelector("[data-journey-pills]");
      const journeyExploreEl = journeyOverlayEl.querySelector("[data-journey-explore]");
      const journeyHudVisualEl = journeyOverlayEl.querySelector("[data-journey-hud-visual]");
      const journeyHudTelemetryEl = journeyOverlayEl.querySelector("[data-journey-hud-telemetry]");
      const journeyFlowNodesEl = journeyOverlayEl.querySelector("[data-journey-flow-nodes]");
      const journeyBottomMetricsEl = journeyOverlayEl.querySelector("[data-journey-bottom-metrics]");

      let isGlobalAudioMuted = false;
      levelAudioTracks.forEach(t => {
        const cloneEl = t.el.cloneNode(false);
        cloneEl.removeAttribute("data-home-level-audio");
        cloneEl.setAttribute("data-home-level-audio-overlap", t.id);
        backdropEl.append(cloneEl);
        t.elB = cloneEl;
        t.activeSlot = 0;
        t.el.loop = false;
        t.el.volume = 0;
        t.elB.loop = false;
        t.elB.volume = 0;
      });

      function startMobileAmbientLoopIfApplicable() {
        const isPortraitNow = Boolean(portraitMq && portraitMq.matches);
        if (isPortraitNow && loopVidEl) {
          loopVidEl.muted = true;
          try {
            loopVidEl.currentTime = 0;
          } catch (_) {}
          const lp = loopVidEl.play();
          if (lp && typeof lp.then === "function") {
            lp.then(() => {
              heroSection.classList.add("is-loop-active");
            }).catch(() => {});
          } else {
            heroSection.classList.add("is-loop-active");
          }
        }
      }

      function stopMobileAmbientLoop() {
        heroSection.classList.remove("is-loop-active");
        if (loopVidEl) {
          try {
            loopVidEl.pause();
          } catch (_) {}
        }
      }

      function syncPauseButtonState() {
        const isPaused = Boolean(vidEl && vidEl.paused);
        if (pauseBtnEl) {
          pauseBtnEl.setAttribute("aria-pressed", isPaused ? "true" : "false");
          pauseBtnEl.setAttribute("aria-label", isPaused ? "Resume story video" : "Pause story video");
          pauseBtnEl.setAttribute("title", isPaused ? "Resume" : "Pause");
          pauseBtnEl.classList.toggle("is-paused", isPaused);
        }
        if (pauseIconEl) {
          pauseIconEl.innerHTML = isPaused
            ? `<svg viewBox="0 0 20 20" fill="currentColor" stroke="none"><polygon points="6.5 4.5 15.5 10 6.5 15.5"/></svg>`
            : `<svg viewBox="0 0 20 20" fill="currentColor" stroke="none"><rect x="5.5" y="4.5" width="3" height="11" rx="1"/><rect x="11.5" y="4.5" width="3" height="11" rx="1"/></svg>`;
        }
        if (pauseLabelEl) {
          pauseLabelEl.textContent = isPaused ? "Resume" : "Pause";
        }
      }

      const ICON_AUDIO_MUTED_SVG = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><polygon points="9 5 5.5 8 3 8 3 12 5.5 12 9 15 9 5" fill="currentColor" stroke="none"/><line x1="16.5" y1="7.5" x2="12.5" y2="12.5"/><line x1="12.5" y1="7.5" x2="16.5" y2="12.5"/></svg>`;
      const ICON_AUDIO_UNMUTED_SVG = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><polygon points="9 5 5.5 8 3 8 3 12 5.5 12 9 15 9 5" fill="currentColor" stroke="none"/><path d="M12.2 7.6a3.4 3.4 0 0 1 0 4.8"/><path d="M14.6 5.4a6.5 6.5 0 0 1 0 9.2"/></svg>`;

      function smoothZoneStep(edge0, edge1, x) {
        const span = Math.max(0.001, edge1 - edge0);
        const u = Math.max(0, Math.min(1, (x - edge0) / span));
        return u * u * (3 - 2 * u);
      }

      const LOOP_OVERLAP_SEC = 2.4;

      function pauseAndResetAudioEl(el) {
        if (!el) return;
        el.volume = 0;
        if (!el.paused) {
          try {
            el.pause();
          } catch (_) {}
        }
        try {
          el.currentTime = 0;
        } catch (_) {}
      }

      function stepLevelAudioCrossfadeRaf() {
        levelAudioFadeRafId = 0;
        let needsNextTick = false;

        levelAudioTracks.forEach(t => {
          const elA = t.el;
          const elB = t.elB;
          if (!elA || !elB) return;
          elA.muted = Boolean(isGlobalAudioMuted);
          elB.muted = Boolean(isGlobalAudioMuted);

          if (isGlobalAudioMuted) {
            t.curVol = 0;
            pauseAndResetAudioEl(elA);
            pauseAndResetAudioEl(elB);
            return;
          }

          const diff = t.targetVol - t.curVol;
          if (Math.abs(diff) > 0.0002) {
            t.curVol += diff * 0.045;
            needsNextTick = true;
          } else {
            t.curVol = t.targetVol;
          }

          const baseVol = Math.max(0, Math.min(1, t.curVol));
          if (baseVol > 0.0005) {
            needsNextTick = true;
            let primaryEl = t.activeSlot === 0 ? elA : elB;
            let secondaryEl = t.activeSlot === 0 ? elB : elA;

            if (primaryEl.paused) {
              try {
                if (primaryEl.ended || primaryEl.currentTime >= (primaryEl.duration || 10) - 0.2) {
                  primaryEl.currentTime = 0;
                }
              } catch (_) {}
              const p = primaryEl.play();
              if (p && typeof p.catch === "function") {
                p.catch(() => {});
              }
            }

            const dur = primaryEl.duration;
            const cur = primaryEl.currentTime;
            if (Number.isFinite(dur) && dur > LOOP_OVERLAP_SEC * 2 && Number.isFinite(cur)) {
              const overlapStart = dur - LOOP_OVERLAP_SEC;
              if (cur >= overlapStart) {
                if (secondaryEl.paused) {
                  try {
                    secondaryEl.currentTime = 0;
                  } catch (_) {}
                  const p2 = secondaryEl.play();
                  if (p2 && typeof p2.catch === "function") {
                    p2.catch(() => {});
                  }
                }
                const u = Math.max(0, Math.min(1, (cur - overlapStart) / LOOP_OVERLAP_SEC));
                const fadeOut = Math.cos(u * Math.PI * 0.5);
                const fadeIn = Math.sin(u * Math.PI * 0.5);
                primaryEl.volume = Math.max(0, Math.min(1, baseVol * fadeOut));
                secondaryEl.volume = Math.max(0, Math.min(1, baseVol * fadeIn));

                if (u >= 0.985 || primaryEl.ended) {
                  pauseAndResetAudioEl(primaryEl);
                  t.activeSlot = 1 - t.activeSlot;
                  secondaryEl.volume = baseVol;
                }
              } else {
                primaryEl.volume = baseVol;
                if (!secondaryEl.paused) {
                  pauseAndResetAudioEl(secondaryEl);
                }
              }
            } else {
              primaryEl.volume = baseVol;
            }
          } else {
            pauseAndResetAudioEl(elA);
            pauseAndResetAudioEl(elB);
          }
        });

        if (needsNextTick && typeof requestAnimationFrame === "function") {
          levelAudioFadeRafId = requestAnimationFrame(stepLevelAudioCrossfadeRaf);
        }
      }

      function syncCloudsLoopPlayback() {
        if (!levelAudioTracks.length) return;
        const homePageEl = document.querySelector('section[data-page="home"]');
        const isHomeActive = !homePageEl || !homePageEl.hidden;
        const isAfterVideo =
          heroSection.classList.contains("is-settled-final") ||
          heroSection.classList.contains("use-static-fallback");

        if (!isHomeActive || !isAfterVideo || isGlobalAudioMuted) {
          levelAudioTracks.forEach(t => {
            t.targetVol = 0;
            t.el.muted = Boolean(isGlobalAudioMuted);
            if (t.elB) t.elB.muted = Boolean(isGlobalAudioMuted);
          });
          if (!levelAudioFadeRafId && typeof requestAnimationFrame === "function") {
            levelAudioFadeRafId = requestAnimationFrame(stepLevelAudioCrossfadeRaf);
          } else {
            stepLevelAudioCrossfadeRaf();
          }
          return;
        }

        // Smoothly flow the Clouds air loop in as the video's own ending air sound tails off (26.6s -> 29.8s)
        let postVideoFlowFactor = 1;
        if (
          vidEl &&
          !vidEl.paused &&
          !vidEl.ended &&
          !heroSection.classList.contains("use-static-fallback")
        ) {
          const vidT = vidEl.currentTime || 0;
          postVideoFlowFactor = smoothZoneStep(26.6, 29.8, vidT);
        }

        const scrollY = window.scrollY || window.pageYOffset || 0;
        const vh = Math.max(480, window.innerHeight || 800);
        const focusY = scrollY + vh * 0.45;
        const halfBand = Math.max(160, vh * 0.28);

        const careerSecEl = document.getElementById("home-career-section");
        const skillsSecEl = document.getElementById("home-skills-section");
        const aboutSecEl = document.getElementById("home-about-section") || document.querySelector(".home-sum-about");
        const connectSecEl = document.getElementById("home-connect");

        let b1 = 1520;
        if (careerSecEl) {
          const r1 = careerSecEl.getBoundingClientRect();
          if (r1.height > 0) b1 = scrollY + r1.top;
        }

        let b2 = b1 + 880;
        if (skillsSecEl) {
          const r2 = skillsSecEl.getBoundingClientRect();
          if (r2.height > 0) b2 = Math.max(b1 + 320, scrollY + r2.top);
        }

        let b3 = b2 + 920;
        const groundStartEl = aboutSecEl || connectSecEl;
        if (groundStartEl) {
          const r3 = groundStartEl.getBoundingClientRect();
          if (r3.height > 0) b3 = Math.max(b2 + 320, scrollY + r3.top);
        }

        // Partition of unity across the 4 building zones as the user travels down #home:
        // 1. Clouds (Hero + 02 Featured Builds) -> b1
        // 2. Digital Office (03 Career Journey / Upper Floor) -> b2
        // 3. Business Office (04 Skills & Focus / Middle Floor) -> b3
        // 4. Server Room (05 About + 06 Let's Build Something Useful / Ground Floor)
        const t1 = smoothZoneStep(b1 - halfBand, b1 + halfBand, focusY);
        const t2 = smoothZoneStep(b2 - halfBand, b2 + halfBand, focusY);
        const t3 = smoothZoneStep(b3 - halfBand, b3 + halfBand, focusY);

        const weights = {
          "clouds": (1 - t1) * postVideoFlowFactor,
          "digital-office": t1 * (1 - t2),
          "office": t2 * (1 - t3),
          "server": t3
        };

        levelAudioTracks.forEach(t => {
          const w = Math.max(0, Math.min(1, weights[t.id] || 0));
          t.targetVol = w > 0.005 ? t.maxVol * w : 0;
        });

        if (!levelAudioFadeRafId && typeof requestAnimationFrame === "function") {
          levelAudioFadeRafId = requestAnimationFrame(stepLevelAudioCrossfadeRaf);
        } else {
          stepLevelAudioCrossfadeRaf();
        }
      }

      function syncMuteButtonState() {
        const isAfterVideo =
          heroSection.classList.contains("is-settled-final") ||
          heroSection.classList.contains("use-static-fallback");
        const isVideoMuted = Boolean(!vidEl || vidEl.muted || isGlobalAudioMuted);
        const isEffectiveMuted = isAfterVideo ? Boolean(isGlobalAudioMuted) : isVideoMuted;

        if (muteBtnEl) {
          muteBtnEl.setAttribute("aria-pressed", !isVideoMuted ? "true" : "false");
          muteBtnEl.setAttribute("aria-label", isVideoMuted ? "Unmute story audio" : "Mute story audio");
          muteBtnEl.setAttribute("title", isVideoMuted ? "Unmute Audio" : "Mute Audio");
          muteBtnEl.classList.toggle("is-unmuted", !isVideoMuted);
        }
        if (muteIconEl) {
          muteIconEl.innerHTML = isVideoMuted ? ICON_AUDIO_MUTED_SVG : ICON_AUDIO_UNMUTED_SVG;
        }
        if (muteLabelEl) {
          muteLabelEl.textContent = isVideoMuted ? "Unmute Audio" : "Mute Audio";
        }

        if (globalMuteBtnEl) {
          globalMuteBtnEl.setAttribute("aria-pressed", isEffectiveMuted ? "true" : "false");
          globalMuteBtnEl.setAttribute("aria-label", isEffectiveMuted ? "Unmute all site audio" : "Mute all site audio");
          globalMuteBtnEl.setAttribute("title", isEffectiveMuted ? "Unmute All Audio" : "Mute All Audio");
          globalMuteBtnEl.classList.toggle("is-muted", isEffectiveMuted);
          globalMuteBtnEl.classList.toggle("is-unmuted", !isEffectiveMuted);
        }
        if (globalMuteIconEl) {
          globalMuteIconEl.innerHTML = isEffectiveMuted ? ICON_AUDIO_MUTED_SVG : ICON_AUDIO_UNMUTED_SVG;
        }
        if (globalMuteLabelEl) {
          globalMuteLabelEl.textContent = isEffectiveMuted ? "Unmute All Audio" : "Mute All Audio";
        }
        syncCloudsLoopPlayback();
      }

      function toggleGlobalAudioMute() {
        const isAfterVideo =
          heroSection.classList.contains("is-settled-final") ||
          heroSection.classList.contains("use-static-fallback");
        if (!isAfterVideo && vidEl && vidEl.muted && !isGlobalAudioMuted) {
          isGlobalAudioMuted = false;
          vidEl.muted = false;
        } else {
          isGlobalAudioMuted = !isGlobalAudioMuted;
          if (vidEl) {
            vidEl.muted = isGlobalAudioMuted;
          }
        }
        document.querySelectorAll("audio, video").forEach(mediaEl => {
          if (mediaEl === loopVidEl) {
            mediaEl.muted = true;
            return;
          }
          if (isGlobalAudioMuted) {
            mediaEl.muted = true;
          } else if (mediaEl === vidEl || mediaEl.hasAttribute("data-home-level-audio")) {
            mediaEl.muted = false;
          }
        });
        syncMuteButtonState();
      }

      if (globalMuteBtnEl) {
        globalMuteBtnEl.addEventListener("click", ev => {
          ev.preventDefault();
          toggleGlobalAudioMute();
        });
      }

      const unlockCloudsAudioOnGesture = () => {
        if (!isGlobalAudioMuted) {
          syncCloudsLoopPlayback();
        }
      };
      window.addEventListener("pointerdown", unlockCloudsAudioOnGesture, { passive: true });
      window.addEventListener("keydown", unlockCloudsAudioOnGesture, { passive: true });
      window.addEventListener("touchstart", unlockCloudsAudioOnGesture, { passive: true });
      window.addEventListener("hashchange", syncCloudsLoopPlayback, { passive: true });

      if (portraitMq && vidEl && typeof portraitMq.addEventListener === "function") {
        portraitMq.addEventListener("change", ev => {
          const nextVideo = ev.matches
            ? "assets/home-hero-video-mobile.mp4"
            : "assets/home-hero-video.mp4";
          const nextPoster = ev.matches
            ? "assets/home-hero-final-frame-mobile.jpg"
            : "assets/home-hero-final-frame.jpg";
          if (!ev.matches) {
            stopMobileAmbientLoop();
          } else if (heroSection.classList.contains("is-settled-final")) {
            startMobileAmbientLoopIfApplicable();
          }
          if (vidEl.getAttribute("src") !== nextVideo) {
            const savedTime = vidEl.currentTime || 0;
            const wasPaused = vidEl.paused;
            vidEl.setAttribute("poster", nextPoster);
            vidEl.setAttribute("src", nextVideo);
            vidEl.load();
            vidEl.addEventListener(
              "loadedmetadata",
              () => {
                try {
                  vidEl.currentTime = Math.min(savedTime, (vidEl.duration || 30) - 0.1);
                } catch (_) {}
                if (!wasPaused) {
                  vidEl.play().catch(() => {});
                }
              },
              { once: true }
            );
          }
        });
      }

      let currentJourneyStageId = "metal";
      let journeySwapTimeoutId = null;
      let lastAriaNowStr = "";
      let lastActiveStepIdx = -1;
      let videoProgressRafId = 0;
      let lastSampledVideoTime = 0;
      let lastSampledPerfTime = typeof performance !== "undefined" ? performance.now() : 0;

      const stepDomCache = HOME_JOURNEY_LEVELS.map(lvl => ({
        lvl,
        btn: heroSection.querySelector(`[data-journey-step="${lvl.id}"]`),
        fill: heroSection.querySelector(`[data-journey-fill="${lvl.id}"]`)
      }));

      const JOURNEY_BUTTON_PALETTES = {
        metal: {
          top: [232, 238, 246],
          bot: [196, 206, 220],
          solid: [213, 221, 232],
          glow: [196, 206, 220, 0.34]
        },
        business: {
          top: [248, 212, 92],
          bot: [234, 179, 46],
          solid: [244, 197, 66],
          glow: [244, 197, 66, 0.36]
        },
        clouds: {
          top: [103, 212, 252],
          bot: [14, 165, 233],
          solid: [56, 189, 248],
          glow: [56, 189, 248, 0.38]
        }
      };

      function lerpChannel(a, b, u) {
        return Math.round(a + (b - a) * u);
      }

      function applyJourneyButtonDiagonalWaveToYellow(rawProgress) {
        if (!journeyExploreEl) return;
        const u = Math.max(0, Math.min(1, rawProgress));
        const s = u * u * (3 - 2 * u);
        // Sweep a 45deg (bottom-left -> top-right) gradient wave from Cloud blue (#38bdf8) to Business yellow (#f8d45c / #eab32e)
        const waveStop = (-28 + s * 156).toFixed(1);
        const crestStart = Math.max(0, Math.min(100, Number(waveStop) - 18)).toFixed(1);
        const crestMid = Math.max(0, Math.min(100, Number(waveStop))).toFixed(1);
        const crestEnd = Math.max(0, Math.min(100, Number(waveStop) + 22)).toFixed(1);
        const glwR = lerpChannel(56, 244, s);
        const glwG = lerpChannel(189, 197, s);
        const glwB = lerpChannel(248, 66, s);
        journeyExploreEl.style.background = `linear-gradient(45deg, #eab32e 0%, #f8d45c ${crestStart}%, #fef08a ${crestMid}%, #67d4fc ${crestEnd}%, #0ea5e9 100%) #f4c542`;
        journeyExploreEl.style.backgroundColor = s > 0.5 ? "#f4c542" : "#38bdf8";
        journeyExploreEl.style.boxShadow = `0 8px 24px rgba(${glwR}, ${glwG}, ${glwB}, 0.38)`;
      }

      function applyJourneyButtonClimbBlend(stageId, nextStageId, rawProgress) {
        if (!journeyExploreEl) return;
        if (!nextStageId || rawProgress <= 0.001) {
          if (journeyExploreEl.style.background) {
            journeyExploreEl.style.background = "";
            journeyExploreEl.style.backgroundColor = "";
            journeyExploreEl.style.boxShadow = "";
          }
          return;
        }
        const p0 = JOURNEY_BUTTON_PALETTES[stageId] || JOURNEY_BUTTON_PALETTES.metal;
        const p1 = JOURNEY_BUTTON_PALETTES[nextStageId] || p0;
        const u = Math.max(0, Math.min(1, rawProgress));
        const s = u * u * (3 - 2 * u);
        const topR = lerpChannel(p0.top[0], p1.top[0], s);
        const topG = lerpChannel(p0.top[1], p1.top[1], s);
        const topB = lerpChannel(p0.top[2], p1.top[2], s);
        const botR = lerpChannel(p0.bot[0], p1.bot[0], s);
        const botG = lerpChannel(p0.bot[1], p1.bot[1], s);
        const botB = lerpChannel(p0.bot[2], p1.bot[2], s);
        const solR = lerpChannel(p0.solid[0], p1.solid[0], s);
        const solG = lerpChannel(p0.solid[1], p1.solid[1], s);
        const solB = lerpChannel(p0.solid[2], p1.solid[2], s);
        const glwR = lerpChannel(p0.glow[0], p1.glow[0], s);
        const glwG = lerpChannel(p0.glow[1], p1.glow[1], s);
        const glwB = lerpChannel(p0.glow[2], p1.glow[2], s);
        const glwA = (p0.glow[3] + (p1.glow[3] - p0.glow[3]) * s).toFixed(3);
        journeyExploreEl.style.background = `linear-gradient(180deg, rgb(${topR}, ${topG}, ${topB}) 0%, rgb(${botR}, ${botG}, ${botB}) 100%) rgb(${solR}, ${solG}, ${solB})`;
        journeyExploreEl.style.backgroundColor = `rgb(${solR}, ${solG}, ${solB})`;
        journeyExploreEl.style.boxShadow = `0 8px 24px rgba(${glwR}, ${glwG}, ${glwB}, ${glwA})`;
      }

      function applyJourneyLevelDom(activeLvl) {
        if (journeyLeftColEl) {
          journeyLeftColEl.setAttribute("data-journey-card-stage", activeLvl.id);
          journeyLeftColEl.setAttribute("data-theme", activeLvl.theme);
        }
        if (journeyRightSceneEl) {
          journeyRightSceneEl.setAttribute("data-theme", activeLvl.theme);
        }
        if (journeyKickerEl) journeyKickerEl.textContent = activeLvl.kicker;
        if (journeyTitle1El) journeyTitle1El.textContent = activeLvl.titleLine1;
        if (journeyTitleAccentEl) journeyTitleAccentEl.textContent = activeLvl.titleAccent;
        if (journeyBodyEl) journeyBodyEl.textContent = activeLvl.body;
        if (journeyPillsEl) {
          journeyPillsEl.innerHTML = renderJourneyPillsHtml(activeLvl);
        }
        if (journeyExploreEl) {
          journeyExploreEl.setAttribute("href", activeLvl.exploreHref || "#career");
          journeyExploreEl.setAttribute("data-theme", activeLvl.theme);
          journeyExploreEl.setAttribute("data-button-stage", activeLvl.id);
          applyJourneyButtonClimbBlend(activeLvl.id, null, 0);
        }
        if (journeyHudVisualEl) {
          journeyHudVisualEl.innerHTML = activeLvl.hudVisualSvg;
        }
        if (journeyHudTelemetryEl) {
          journeyHudTelemetryEl.innerHTML = renderJourneyHudTelemetryHtml(activeLvl);
        }
        if (journeyFlowNodesEl) {
          journeyFlowNodesEl.innerHTML = renderJourneyFlowNodesHtml(activeLvl);
        }
        if (journeyBottomMetricsEl) {
          journeyBottomMetricsEl.innerHTML = renderJourneyBottomMetricsHtml(activeLvl);
        }
      }

      function updateJourneyOverlayForTime(t, immediate = false) {
        let activeIdx = 0;
        for (let i = 0; i < HOME_JOURNEY_LEVELS.length; i++) {
          if (t >= HOME_JOURNEY_LEVELS[i].start) {
            activeIdx = i;
          }
        }
        const activeLvl = HOME_JOURNEY_LEVELS[activeIdx];
        const nextLvl = activeIdx < HOME_JOURNEY_LEVELS.length - 1 ? HOME_JOURNEY_LEVELS[activeIdx + 1] : null;
        const btnBlendLead = 0.42;
        const btnBlendStart = activeLvl.end - btnBlendLead;
        if (nextLvl && !immediate && t >= btnBlendStart && t < activeLvl.end) {
          applyJourneyButtonClimbBlend(activeLvl.id, nextLvl.id, (t - btnBlendStart) / btnBlendLead);
        } else {
          applyJourneyButtonClimbBlend(activeLvl.id, null, 0);
        }

        // Sub-pixel 60fps/120fps progression for bottom timeline scrubber & chapter step bars
        const overallPct = Math.max(0, Math.min(100, (t / 23.4) * 100));
        if (progressFillEl) {
          progressFillEl.style.width = `${overallPct.toFixed(4)}%`;
        }
        if (scrubberEl) {
          const ariaStr = t.toFixed(1);
          if (ariaStr !== lastAriaNowStr) {
            lastAriaNowStr = ariaStr;
            scrubberEl.setAttribute("aria-valuenow", ariaStr);
          }
        }

        const stepIdxChanged = activeIdx !== lastActiveStepIdx;
        if (stepIdxChanged) {
          lastActiveStepIdx = activeIdx;
        }

        for (let idx = 0; idx < stepDomCache.length; idx++) {
          const { lvl, btn, fill } = stepDomCache[idx];
          if (btn && stepIdxChanged) {
            btn.classList.toggle("is-active", idx === activeIdx);
            btn.classList.toggle("is-complete", idx < activeIdx);
            btn.setAttribute("aria-selected", idx === activeIdx ? "true" : "false");
          }
          if (fill) {
            let pct = 0;
            if (idx < activeIdx) pct = 100;
            else if (idx === activeIdx) {
              const span = Math.max(0.1, lvl.end - lvl.start);
              pct = Math.max(0, Math.min(100, ((t - lvl.start) / span) * 100));
            }
            fill.style.width = `${pct.toFixed(3)}%`;
          }
        }

        // Pre-fade out the outgoing chapter during the final 0.55s of its camera climb so chapters never overlap or snap
        const isApproachingBoundary =
          !immediate &&
          activeIdx < HOME_JOURNEY_LEVELS.length - 1 &&
          t >= activeLvl.end - 0.55 &&
          t < activeLvl.end;
        const isApproachingFinalSettle =
          !immediate &&
          activeIdx === HOME_JOURNEY_LEVELS.length - 1 &&
          t >= activeLvl.end - 0.65 &&
          t < activeLvl.end;

        journeyOverlayEl.classList.toggle("is-ending-fade", isApproachingFinalSettle);

        // Swap left copy and bottom metrics when crossing a level boundary
        if (currentJourneyStageId !== activeLvl.id && journeyCardEl) {
          const wasPreFaded = journeyCardEl.classList.contains("is-pre-fading");
          currentJourneyStageId = activeLvl.id;
          if (journeySwapTimeoutId) {
            clearTimeout(journeySwapTimeoutId);
            journeySwapTimeoutId = null;
          }

          if (immediate || wasPreFaded) {
            journeyCardEl.classList.remove("is-pre-fading");
            if (journeyBottomMetricsEl) journeyBottomMetricsEl.classList.remove("is-pre-fading");
            journeyCardEl.classList.add("is-transitioning");
            if (journeyBottomMetricsEl) journeyBottomMetricsEl.classList.add("is-transitioning");
            applyJourneyLevelDom(activeLvl);
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                journeyCardEl.classList.remove("is-transitioning");
                if (journeyBottomMetricsEl) journeyBottomMetricsEl.classList.remove("is-transitioning");
              });
            });
          } else {
            journeyCardEl.classList.add("is-transitioning");
            if (journeyRightSceneEl) journeyRightSceneEl.classList.add("is-transitioning");
            if (journeyBottomMetricsEl) journeyBottomMetricsEl.classList.add("is-transitioning");

            journeySwapTimeoutId = setTimeout(() => {
              journeySwapTimeoutId = null;
              applyJourneyLevelDom(activeLvl);
              requestAnimationFrame(() => {
                journeyCardEl.classList.remove("is-transitioning", "is-pre-fading");
                if (journeyRightSceneEl) journeyRightSceneEl.classList.remove("is-transitioning");
                if (journeyBottomMetricsEl) {
                  journeyBottomMetricsEl.classList.remove("is-transitioning", "is-pre-fading");
                }
              });
            }, 340);
          }
        } else if (!journeySwapTimeoutId && journeyCardEl) {
          journeyCardEl.classList.toggle("is-pre-fading", isApproachingBoundary);
          if (journeyBottomMetricsEl) {
            journeyBottomMetricsEl.classList.toggle("is-pre-fading", isApproachingBoundary);
          }
        }
      }

      function syncHomeVideoHeaderState() {
        const isJourneyPlaying =
          heroSection.classList.contains("is-journey-active") &&
          !heroSection.classList.contains("is-settled-final") &&
          !heroSection.classList.contains("use-static-fallback");
        const isNearTop = (window.scrollY || window.pageYOffset || 0) < 48;
        const hideHeaderNav = Boolean(isJourneyPlaying && isNearTop);
        document.body.classList.toggle("is-home-video-playing", hideHeaderNav);

        const siteHeaderEl = document.querySelector(".site-header");
        if (siteHeaderEl) {
          siteHeaderEl
            .querySelectorAll("#primary-nav, .header-telemetry-controls, #menu-toggle, .mobile-top-tab-strip")
            .forEach(el => {
              if (hideHeaderNav) {
                el.setAttribute("inert", "");
                el.setAttribute("aria-hidden", "true");
              } else {
                el.removeAttribute("inert");
                el.removeAttribute("aria-hidden");
              }
            });
        }

        // Keep inactive hero layer out of keyboard Tab order and assistive tree
        if (journeyOverlayEl) {
          if (isJourneyPlaying) {
            journeyOverlayEl.removeAttribute("inert");
            journeyOverlayEl.setAttribute("aria-hidden", "false");
          } else {
            journeyOverlayEl.setAttribute("inert", "");
            journeyOverlayEl.setAttribute("aria-hidden", "true");
          }
        }
        if (heroCopyCol) {
          if (isJourneyPlaying) {
            heroCopyCol.setAttribute("inert", "");
            heroCopyCol.setAttribute("aria-hidden", "true");
          } else {
            heroCopyCol.removeAttribute("inert");
            heroCopyCol.setAttribute("aria-hidden", "false");
          }
        }
        syncCloudsLoopPlayback();
      }

      window.addEventListener("scroll", syncHomeVideoHeaderState, { passive: true });

      function anchorVideoProgressClock(explicitTime) {
        lastSampledVideoTime = typeof explicitTime === "number" ? explicitTime : (vidEl ? (vidEl.currentTime || 0) : 0);
        lastSampledPerfTime = typeof performance !== "undefined" ? performance.now() : Date.now();
      }

      function stopVideoProgressRafLoop() {
        if (videoProgressRafId) {
          cancelAnimationFrame(videoProgressRafId);
          videoProgressRafId = 0;
        }
      }

      let finalBtnWaveRafId = 0;

      function getHeroWaveSettleTriggerTime() {
        return Boolean(portraitMq && portraitMq.matches) ? 24.85 : 25.45;
      }

      function sampleDiagonalStopPair(pos) {
        const t = pos <= 0.5 ? pos * 2 : (pos - 0.5) * 2;
        const blue =
          pos <= 0.5
            ? [lerpChannel(14, 56, t), lerpChannel(165, 189, t), lerpChannel(233, 248, t)]
            : [lerpChannel(56, 103, t), lerpChannel(189, 212, t), lerpChannel(248, 252, t)];
        const gold =
          pos <= 0.5
            ? [lerpChannel(234, 242, t), lerpChannel(179, 194, t), lerpChannel(46, 65, t)]
            : [lerpChannel(242, 247, t), lerpChannel(194, 209, t), lerpChannel(65, 84, t)];
        return { blue, gold };
      }

      function applyHeroButtonDiagonalWaveStyle(btnEl, rawProgress) {
        if (!btnEl) return;
        const u = Math.max(0, Math.min(1, rawProgress));
        if (u >= 0.9995) {
          btnEl.style.removeProperty("background");
          btnEl.style.removeProperty("background-color");
          btnEl.style.removeProperty("box-shadow");
          return;
        }
        // Quintic smoothstep so acceleration at u=0 and deceleration at u=1 have zero velocity/curvature jump
        const s = u * u * u * (u * (u * 6 - 15) + 10);
        const waveWidth = 0.58;
        const stopPositions = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
        const gradientStops = stopPositions.map(pos => {
          const { blue, gold } = sampleDiagonalStopPair(pos);
          const localLinear = Math.max(0, Math.min(1, (s * (1 + waveWidth) - pos) / waveWidth));
          const w = localLinear * localLinear * (3 - 2 * localLinear);
          const crestLift = 4 * w * (1 - w);
          const r = Math.min(255, lerpChannel(blue[0], gold[0], w) + Math.round(26 * crestLift));
          const g = Math.min(255, lerpChannel(blue[1], gold[1], w) + Math.round(24 * crestLift));
          const b = Math.min(255, lerpChannel(blue[2], gold[2], w) + Math.round(14 * crestLift));
          return `rgb(${r}, ${g}, ${b}) ${(pos * 100).toFixed(1)}%`;
        });

        const midR = lerpChannel(56, 244, s);
        const midG = lerpChannel(189, 197, s);
        const midB = lerpChannel(248, 66, s);
        const blurPx = (24 - 2 * s).toFixed(2);
        const glwAlpha = (0.36 - 0.08 * s).toFixed(3);

        btnEl.style.setProperty(
          "background",
          `linear-gradient(45deg, ${gradientStops.join(", ")}) rgb(${midR}, ${midG}, ${midB})`,
          "important"
        );
        btnEl.style.setProperty("background-color", `rgb(${midR}, ${midG}, ${midB})`, "important");
        btnEl.style.setProperty(
          "box-shadow",
          `0 8px ${blurPx}px rgba(${midR}, ${midG}, ${midB}, ${glwAlpha})`,
          "important"
        );
      }

      function triggerFinalHeroButtonWaveSettle() {
        const finalPrimaryBtn = heroSection.querySelector(".hero-btn-primary");
        if (!finalPrimaryBtn) return;
        if (finalBtnWaveRafId) {
          cancelAnimationFrame(finalBtnWaveRafId);
          finalBtnWaveRafId = 0;
        }
        finalPrimaryBtn.classList.remove("is-awaiting-wave-settle", "is-wave-settling");
        void finalPrimaryBtn.offsetWidth;
        finalPrimaryBtn.classList.add("is-wave-settling");
        const startPerf = typeof performance !== "undefined" ? performance.now() : Date.now();
        const durationMs = 1350;
        applyHeroButtonDiagonalWaveStyle(finalPrimaryBtn, 0);
        const stepWave = now => {
          finalBtnWaveRafId = 0;
          const tNow = typeof now === "number" ? now : Date.now();
          const u = Math.max(0, Math.min(1, (tNow - startPerf) / durationMs));
          applyHeroButtonDiagonalWaveStyle(finalPrimaryBtn, u);
          if (u < 1) {
            finalBtnWaveRafId = requestAnimationFrame(stepWave);
          } else {
            finalPrimaryBtn.classList.remove("is-wave-settling");
          }
        };
        if (typeof requestAnimationFrame === "function") {
          finalBtnWaveRafId = requestAnimationFrame(stepWave);
        } else {
          applyHeroButtonDiagonalWaveStyle(finalPrimaryBtn, 1);
          finalPrimaryBtn.classList.remove("is-wave-settling");
        }
      }

      function clearFinalHeroButtonWaveClasses() {
        if (finalBtnWaveRafId) {
          cancelAnimationFrame(finalBtnWaveRafId);
          finalBtnWaveRafId = 0;
        }
        const finalPrimaryBtn = heroSection.querySelector(".hero-btn-primary");
        if (!finalPrimaryBtn) return;
        finalPrimaryBtn.classList.remove("is-awaiting-wave-settle", "is-wave-settling");
        finalPrimaryBtn.style.removeProperty("background");
        finalPrimaryBtn.style.removeProperty("background-color");
        finalPrimaryBtn.style.removeProperty("box-shadow");
      }

      function tickVideoProgressRaf(now) {
        videoProgressRafId = 0;
        if (!vidEl || heroSection.classList.contains("use-static-fallback")) {
          return;
        }

        const rawT = vidEl.currentTime || 0;
        if (Math.abs(rawT - lastSampledVideoTime) > 0.0004) {
          lastSampledVideoTime = rawT;
          lastSampledPerfTime = now;
        }

        let smoothT = rawT;
        if (!vidEl.paused && !vidEl.ended && vidEl.readyState >= 2) {
          const dt = Math.min(0.055, Math.max(0, (now - lastSampledPerfTime) / 1000)) * (vidEl.playbackRate || 1);
          smoothT = lastSampledVideoTime + dt;
        }

        if (!heroSection.classList.contains("is-settled-final")) {
          if (smoothT < 23.4) {
            updateJourneyOverlayForTime(smoothT);
            if (!vidEl.paused && !vidEl.ended) {
              videoProgressRafId = requestAnimationFrame(tickVideoProgressRaf);
            }
          } else {
            revealFinalHeroCopy();
          }
          return;
        }

        const finalPrimaryBtn = heroSection.querySelector(".hero-btn-primary");
        if (finalPrimaryBtn && finalPrimaryBtn.classList.contains("is-awaiting-wave-settle")) {
          if (smoothT >= getHeroWaveSettleTriggerTime() || vidEl.ended) {
            triggerFinalHeroButtonWaveSettle();
          } else if (!vidEl.paused && !vidEl.ended) {
            videoProgressRafId = requestAnimationFrame(tickVideoProgressRaf);
          }
        }
      }

      function startVideoProgressRafLoop() {
        anchorVideoProgressClock();
        if (!videoProgressRafId && typeof requestAnimationFrame === "function") {
          videoProgressRafId = requestAnimationFrame(tickVideoProgressRaf);
        }
      }

      function revealFinalHeroCopy(immediateWave = false) {
        stopVideoProgressRafLoop();
        heroSection.classList.remove("is-journey-active");
        heroSection.classList.add("is-settled-final");
        const finalPrimaryBtn = heroSection.querySelector(".hero-btn-primary");
        const curT = vidEl ? vidEl.currentTime || 0 : 0;
        const triggerT = getHeroWaveSettleTriggerTime();
        if (
          finalPrimaryBtn &&
          !immediateWave &&
          vidEl &&
          !vidEl.paused &&
          !vidEl.ended &&
          curT < triggerT
        ) {
          finalPrimaryBtn.classList.remove("is-wave-settling");
          finalPrimaryBtn.classList.add("is-awaiting-wave-settle");
          startVideoProgressRafLoop();
        } else if (finalPrimaryBtn) {
          triggerFinalHeroButtonWaveSettle();
        }
        controlsEl.hidden = true;
        if (watchLabelEl) watchLabelEl.textContent = "Watch the story";
        syncHomeVideoHeaderState();
        syncMuteButtonState();
      }

      function settleHeroImmediateFallback() {
        revealFinalHeroCopy(true);
        clearFinalHeroButtonWaveClasses();
        stopMobileAmbientLoop();
        heroSection.classList.add("use-static-fallback");
        if (vidEl) {
          vidEl.muted = true;
          try {
            vidEl.pause();
          } catch (_) {}
        }
        syncHomeVideoHeaderState();
        syncMuteButtonState();
      }

      if (vidEl) {
        const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduceMotion) {
          settleHeroImmediateFallback();
        } else {
          heroSection.classList.add("is-journey-active");
          controlsEl.hidden = false;
          anchorVideoProgressClock(0);
          updateJourneyOverlayForTime(0);
          syncHomeVideoHeaderState();

          vidEl.addEventListener("timeupdate", () => {
            const t = vidEl.currentTime || 0;
            anchorVideoProgressClock(t);

            if (t < 23.4) {
              if (!heroSection.classList.contains("is-settled-final")) {
                heroSection.classList.add("is-journey-active");
                updateJourneyOverlayForTime(t);
                syncHomeVideoHeaderState();
                if (!vidEl.paused && !vidEl.ended && !videoProgressRafId) {
                  videoProgressRafId = requestAnimationFrame(tickVideoProgressRaf);
                }
              }
            } else {
              // At 23.4s the camera clears the sunset clouds and begins pulling back on the full 3-floor building:
              // smoothly crossfade from the Journey Chapter Overlay to the settled final Hero copy,
              // restore header opacity to 100%, and hold the hero button on Cloud Blue until just before camera motion stops.
              if (!heroSection.classList.contains("is-settled-final")) {
                revealFinalHeroCopy();
              } else {
                if (t >= getHeroWaveSettleTriggerTime()) {
                  const finalPrimaryBtn = heroSection.querySelector(".hero-btn-primary");
                  if (finalPrimaryBtn && finalPrimaryBtn.classList.contains("is-awaiting-wave-settle")) {
                    triggerFinalHeroButtonWaveSettle();
                  }
                }
                syncCloudsLoopPlayback();
              }
            }
          });

          vidEl.addEventListener("play", () => {
            syncPauseButtonState();
            startVideoProgressRafLoop();
          });
          vidEl.addEventListener("playing", startVideoProgressRafLoop);
          vidEl.addEventListener("seeked", () => {
            anchorVideoProgressClock();
            if (!vidEl.paused) startVideoProgressRafLoop();
          });
          vidEl.addEventListener("pause", () => {
            syncPauseButtonState();
            stopVideoProgressRafLoop();
          });

          vidEl.addEventListener("ended", () => {
            stopVideoProgressRafLoop();
            if (!heroSection.classList.contains("is-settled-final")) {
              revealFinalHeroCopy(true);
            } else {
              const finalPrimaryBtn = heroSection.querySelector(".hero-btn-primary");
              if (finalPrimaryBtn && finalPrimaryBtn.classList.contains("is-awaiting-wave-settle")) {
                triggerFinalHeroButtonWaveSettle();
              }
            }
            if (vidEl) {
              vidEl.muted = true;
            }
            syncCloudsLoopPlayback();
            startMobileAmbientLoopIfApplicable();
          });

          vidEl.addEventListener("error", () => {
            settleHeroImmediateFallback();
          });

          const playPromise = vidEl.play();
          if (playPromise && typeof playPromise.then === "function") {
            playPromise
              .then(() => {
                startVideoProgressRafLoop();
              })
              .catch(() => {
                settleHeroImmediateFallback();
              });
          } else {
            startVideoProgressRafLoop();
          }
          syncPauseButtonState();
          syncMuteButtonState();
        }
      }

      // Smooth pointer-drag scrubbing on the timeline bar
      if (scrubberEl && vidEl) {
        let isScrubDragging = false;
        const seekScrubberAtClientX = (clientX, immediateFlag) => {
          const rect = scrubberEl.getBoundingClientRect();
          if (rect.width <= 0) return;
          const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
          const targetTime = ratio * 23.2;
          stopMobileAmbientLoop();
          clearFinalHeroButtonWaveClasses();
          heroSection.classList.remove("is-settled-final", "use-static-fallback");
          heroSection.classList.add("is-journey-active");
          controlsEl.hidden = false;
          vidEl.currentTime = targetTime;
          anchorVideoProgressClock(targetTime);
          updateJourneyOverlayForTime(targetTime, immediateFlag);
          syncHomeVideoHeaderState();
        };

        scrubberEl.addEventListener("pointerdown", ev => {
          if (ev.button && ev.button !== 0) return;
          isScrubDragging = true;
          try {
            scrubberEl.setPointerCapture(ev.pointerId);
          } catch (_) {}
          seekScrubberAtClientX(ev.clientX, true);
        });

        scrubberEl.addEventListener("pointermove", ev => {
          if (!isScrubDragging) return;
          seekScrubberAtClientX(ev.clientX, true);
        });

        const endScrubDrag = ev => {
          if (!isScrubDragging) return;
          isScrubDragging = false;
          try {
            scrubberEl.releasePointerCapture(ev.pointerId);
          } catch (_) {}
          if (!vidEl.paused) {
            startVideoProgressRafLoop();
          }
        };
        scrubberEl.addEventListener("pointerup", endScrubDrag);
        scrubberEl.addEventListener("pointercancel", endScrubDrag);
      }

      heroSection.addEventListener("click", ev => {
        const scrubberClick = ev.target.closest("[data-home-video-scrubber]");
        if (scrubberClick && vidEl) {
          ev.preventDefault();
          const rect = scrubberClick.getBoundingClientRect();
          if (rect.width > 0) {
            const ratio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
            const targetTime = ratio * 23.2;
            stopMobileAmbientLoop();
            clearFinalHeroButtonWaveClasses();
            heroSection.classList.remove("is-settled-final", "use-static-fallback");
            heroSection.classList.add("is-journey-active");
            controlsEl.hidden = false;
            vidEl.currentTime = targetTime;
            anchorVideoProgressClock(targetTime);
            updateJourneyOverlayForTime(targetTime, true);
            syncHomeVideoHeaderState();
            if (!vidEl.paused) {
              startVideoProgressRafLoop();
            }
          }
          return;
        }

        const seekBtn = ev.target.closest("[data-journey-seek]");
        if (seekBtn && vidEl) {
          ev.preventDefault();
          const targetTime = parseFloat(seekBtn.getAttribute("data-journey-seek") || "0");
          stopMobileAmbientLoop();
          clearFinalHeroButtonWaveClasses();
          heroSection.classList.remove("is-settled-final", "use-static-fallback");
          heroSection.classList.add("is-journey-active");
          controlsEl.hidden = false;
          vidEl.currentTime = targetTime;
          anchorVideoProgressClock(targetTime);
          updateJourneyOverlayForTime(targetTime);
          syncHomeVideoHeaderState();
          vidEl.play().then(() => startVideoProgressRafLoop()).catch(() => {});
          syncPauseButtonState();
          return;
        }

        const watchBtn = ev.target.closest("[data-home-watch-story]");
        if (watchBtn && vidEl) {
          ev.preventDefault();
          stopMobileAmbientLoop();
          clearFinalHeroButtonWaveClasses();
          heroSection.classList.remove("is-settled-final", "use-static-fallback");
          heroSection.classList.add("is-journey-active");
          controlsEl.hidden = false;
          currentJourneyStageId = "";
          vidEl.playbackRate = 1;
          vidEl.currentTime = 0;
          vidEl.muted = Boolean(isGlobalAudioMuted);
          anchorVideoProgressClock(0);
          updateJourneyOverlayForTime(0);
          syncHomeVideoHeaderState();
          syncMuteButtonState();
          if (watchLabelEl) watchLabelEl.textContent = "Playing story...";
          const p = vidEl.play();
          if (p && typeof p.then === "function") {
            p.then(() => {
              startVideoProgressRafLoop();
            }).catch(() => {
              vidEl.muted = true;
              syncMuteButtonState();
              vidEl.play().then(() => startVideoProgressRafLoop()).catch(() => settleHeroImmediateFallback());
            });
          } else {
            startVideoProgressRafLoop();
          }
          syncPauseButtonState();
          return;
        }

        const pauseBtn = ev.target.closest("[data-home-video-pause]");
        if (pauseBtn && vidEl) {
          ev.preventDefault();
          if (vidEl.paused) {
            vidEl.play().catch(() => {});
          } else {
            vidEl.pause();
          }
          syncPauseButtonState();
          return;
        }

        const muteBtn = ev.target.closest("[data-home-video-mute]");
        if (muteBtn && vidEl) {
          ev.preventDefault();
          toggleGlobalAudioMute();
          return;
        }

        const skipBtn = ev.target.closest("[data-home-video-skip]");
        if (skipBtn) {
          ev.preventDefault();
          if (typeof skipBtn.blur === "function") skipBtn.blur();
          if (vidEl) {
            vidEl.muted = true;
            try {
              if (vidEl.duration && vidEl.currentTime < 26.8) {
                vidEl.currentTime = 26.8;
              }
            } catch (_) {}
          }
          revealFinalHeroCopy(true);
          startMobileAmbientLoopIfApplicable();
          syncMuteButtonState();
        }
      });
    }

    if (heroStage) {
      heroStage.hidden = true;
    }



    // 3. Technology & Platform Vector Logo Library
    const TECH_BADGE_ICONS = Object.freeze({
      sql: `<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5.5" rx="7.5" ry="3" fill="#0078d4"/><path d="M4.5 5.5v6c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-6" fill="#0078d4" fill-opacity="0.22" stroke="#0078d4" stroke-width="1.7"/><path d="M4.5 11.5v6.5c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-6.5" fill="#0755ff" fill-opacity="0.18" stroke="#0755ff" stroke-width="1.7"/><ellipse cx="12" cy="5.5" rx="7.5" ry="3" fill="none" stroke="#005ba1" stroke-width="1.7"/></svg>`,
      xml: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="3.5" width="20" height="17" rx="3.5" fill="#f97316" fill-opacity="0.14" stroke="#ea580c" stroke-width="1.6"/><path d="M8.5 9L5 12l3.5 3M15.5 9L19 12l-3.5 3M13.2 8l-2.4 8" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      csharp: `<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12,2 20.5,7 20.5,17 12,22 3.5,17 3.5,7" fill="#68217a"/><path d="M10.5 8.8a3.5 3.5 0 1 0 0 6.4" fill="none" stroke="#ffffff" stroke-width="2.1" stroke-linecap="round"/><path d="M13.8 9.2v5.6M16.4 9.2v5.6M12.7 10.9h4.8M12.7 13.1h4.8" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round"/></svg>`,
      dotnet: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="3.5" width="20" height="17" rx="3.5" fill="#512bd4"/><circle cx="5.6" cy="15.2" r="1.2" fill="#ffffff"/><path d="M8.5 16V8.5l4.6 7.5V8.5M15.8 8.5h4.2M15.8 12.2h3.4M15.8 16h4.2M15.8 8.5V16" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      rest: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="6.5" r="2.6" fill="#059669"/><circle cx="18" cy="6.5" r="2.6" fill="#0755ff"/><circle cx="12" cy="17.5" r="2.8" fill="#00a8e8"/><path d="M8.4 7.4l7.2 0M7.4 8.8l3.4 6.4M16.6 8.8l-3.4 6.4" stroke="#0755ff" stroke-width="1.8" stroke-linecap="round"/></svg>`,
      soap: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2.5" fill="#0284c7" fill-opacity="0.14" stroke="#0284c7" stroke-width="1.7"/><path d="M3.5 6.5l8.5 6 8.5-6" stroke="#0284c7" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 15.5h8" stroke="#0755ff" stroke-width="1.7" stroke-linecap="round"/></svg>`,
      js: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="3" fill="#f7df1e"/><path d="M10.5 11v5.2c0 1.2-.8 1.8-1.9 1.8-.9 0-1.5-.4-1.8-1M14.5 16.8c.5.7 1.3 1.2 2.4 1.2 1.2 0 2-.6 2-1.5 0-1-.8-1.4-2.1-1.9-1.1-.4-1.8-1-1.8-2 0-1 .8-1.7 2-1.7.9 0 1.6.3 2 .9" stroke="#111827" stroke-width="1.8" stroke-linecap="round"/></svg>`,
      web: `<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="4,3 20,3 18.5,19 12,21.5 5.5,19" fill="#7952b3"/><path d="M8.5 8h7l-.5 4h-5l.3 3 1.7.6 1.7-.6.2-1.5" stroke="#ffffff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      excel: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" fill="#107c41"/><path d="M12 3v18M12 8h9M12 13h9M12 18h9" stroke="#ffffff" stroke-opacity="0.35" stroke-width="1.3"/><path d="M6.2 8.5l4.4 7M10.6 8.5l-4.4 7" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/></svg>`,
      vb: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="3.5" width="19" height="17" rx="3" fill="#00539c"/><path d="M5.5 8.5l2.6 7 2.6-7M13.2 8.5v7h2.8a1.8 1.8 0 0 0 0-3.5h-2.8h2.6a1.7 1.7 0 0 0 0-3.5h-2.6z" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
      csio: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l8 3.5v5.5c0 5-3.4 8.8-8 10-4.6-1.2-8-5-8-10V6l8-3.5z" fill="#0755ff" fill-opacity="0.15" stroke="#0755ff" stroke-width="1.7"/><path d="M8.5 12l2.3 2.3 4.8-4.8" stroke="#0755ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      al3: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="4" rx="1" fill="#0284c7"/><rect x="3" y="10" width="14" height="4" rx="1" fill="#0755ff"/><rect x="3" y="16" width="18" height="4" rx="1" fill="#059669"/></svg>`,
      bms: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="7" height="14" rx="1.5" fill="#0755ff" fill-opacity="0.18" stroke="#0755ff" stroke-width="1.6"/><rect x="14.5" y="5" width="7" height="14" rx="1.5" fill="#059669" fill-opacity="0.18" stroke="#059669" stroke-width="1.6"/><path d="M9.5 9.5h5M9.5 14.5h5" stroke="#0755ff" stroke-width="1.8" stroke-linecap="round"/></svg>`,
      rules: `<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12,2.5 21.5,12 12,21.5 2.5,12" fill="#0755ff" fill-opacity="0.16" stroke="#0755ff" stroke-width="1.8"/><circle cx="12" cy="12" r="2.6" fill="#0755ff"/></svg>`,
      etl: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h11l3 5-3 5H3l3-5-3-5z" fill="#0284c7" fill-opacity="0.18" stroke="#0284c7" stroke-width="1.7"/><path d="M14 7h4l3 5-3 5h-4" stroke="#059669" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      cognos: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="#0f62fe" fill-opacity="0.14" stroke="#0f62fe" stroke-width="1.7"/><path d="M8 15v-4M12 15V8M16 15v-6" stroke="#0f62fe" stroke-width="2.2" stroke-linecap="round"/></svg>`,
      powerbi: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="12" width="4" height="8" rx="1" fill="#e6ad10"/><rect x="10" y="8" width="4" height="12" rx="1" fill="#f2c811"/><rect x="16" y="4" width="4" height="16" rx="1" fill="#f59e0b"/></svg>`,
      recon: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M5 7h14M5 7l-2.5 6h5L5 7zM19 7l-2.5 6h5L19 7z" stroke="#059669" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="#059669" fill-opacity="0.16"/></svg>`,
      vmware: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="11" height="11" rx="2.2" fill="none" stroke="#0078d4" stroke-width="2"/><rect x="10" y="9" width="11" height="11" rx="2.2" fill="#00a8e8" fill-opacity="0.18" stroke="#0755ff" stroke-width="2"/></svg>`,
      windows: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8.2" height="8.2" fill="#0078d4"/><rect x="12.8" y="3" width="8.2" height="8.2" fill="#0078d4"/><rect x="3" y="12.8" width="8.2" height="8.2" fill="#0078d4"/><rect x="12.8" y="12.8" width="8.2" height="8.2" fill="#0078d4"/></svg>`,
      ad: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2.5" fill="#0755ff"/><circle cx="6" cy="18" r="2.5" fill="#00a8e8"/><circle cx="18" cy="18" r="2.5" fill="#00a8e8"/><path d="M12 7.5v4.5M12 12L6 15.5M12 12l6 3.5" stroke="#0755ff" stroke-width="1.8" stroke-linecap="round"/></svg>`,
      exchange: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.5" fill="#0078d4"/><path d="M4.5 6.5l7.5 5.5 7.5-5.5" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      bes: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="7" r="1.8" fill="#090e1a"/><circle cx="12" cy="7" r="1.8" fill="#090e1a"/><circle cx="18" cy="7" r="1.8" fill="#090e1a"/><circle cx="6" cy="12" r="1.8" fill="#0755ff"/><circle cx="12" cy="12" r="1.8" fill="#0755ff"/><circle cx="18" cy="12" r="1.8" fill="#0755ff"/><circle cx="9" cy="17" r="1.8" fill="#090e1a"/><circle cx="15" cy="17" r="1.8" fill="#090e1a"/></svg>`,
      network: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="7" width="19" height="10" rx="2" fill="#0755ff" fill-opacity="0.14" stroke="#0755ff" stroke-width="1.7"/><circle cx="6.5" cy="12" r="1.3" fill="#059669"/><circle cx="10.2" cy="12" r="1.3" fill="#059669"/><circle cx="13.9" cy="12" r="1.3" fill="#00a8e8"/><path d="M17.5 10v4" stroke="#0755ff" stroke-width="1.8" stroke-linecap="round"/></svg>`,
      power: `<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="13,2 5,13.5 11.5,13.5 10.5,22 19,10.5 12.5,10.5" fill="#f59e0b" stroke="#d97706" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
      hardware: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="#0755ff" fill-opacity="0.15" stroke="#0755ff" stroke-width="1.7"/><rect x="9" y="9" width="6" height="6" rx="1" fill="#0755ff"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" stroke="#0755ff" stroke-width="1.6" stroke-linecap="round"/></svg>`,
      ts: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="3" fill="#3178c6"/><path d="M6.2 10h6M9.2 10v8M14 16.8c.5.6 1.3 1 2.3 1 1.2 0 2-.5 2-1.4 0-.9-.7-1.3-2-1.8-1.2-.4-1.9-1-1.9-2 0-1 .8-1.7 2-1.7.9 0 1.6.3 2 .8" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/></svg>`,
      react: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="2" fill="#087ea4"/><ellipse cx="12" cy="12" rx="9" ry="3.6" fill="none" stroke="#087ea4" stroke-width="1.5"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" fill="none" stroke="#087ea4" stroke-width="1.5"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)" fill="none" stroke="#087ea4" stroke-width="1.5"/></svg>`,
      node: `<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12,2 20.5,7 20.5,17 12,22 3.5,17 3.5,7" fill="#339933"/><path d="M9 15V9l6 6V9" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      postgres: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="3" width="19" height="18" rx="3.5" fill="#336791"/><ellipse cx="12" cy="8" rx="5.5" ry="2.2" fill="none" stroke="#ffffff" stroke-width="1.6"/><path d="M6.5 8v7c0 1.2 2.5 2.2 5.5 2.2s5.5-1 5.5-2.2V8" fill="none" stroke="#ffffff" stroke-width="1.6"/></svg>`,
      redis: `<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12,3 21,7.5 12,12 3,7.5" fill="#dc382d"/><polyline points="3,12 12,16.5 21,12" fill="none" stroke="#dc382d" stroke-width="2" stroke-linecap="round"/><polyline points="3,16 12,20.5 21,16" fill="none" stroke="#b91c1c" stroke-width="2" stroke-linecap="round"/></svg>`,
      openapi: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="#6ba539" fill-opacity="0.16" stroke="#6ba539" stroke-width="1.8"/><path d="M8.5 12h7M12 8.5v7" stroke="#6ba539" stroke-width="2" stroke-linecap="round"/></svg>`,
      rust: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.5" fill="#090e1a" fill-opacity="0.12" stroke="#090e1a" stroke-width="2" stroke-dasharray="3 2"/><path d="M9.5 15V9h3a2 2 0 0 1 0 4h-3m3 0l2.2 2" stroke="#090e1a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    });

    function renderBadgeStripHtml(badges, extraClass = "") {
      if (!badges || !badges.length) return "";
      const items = badges.map(b => {
        const svg = TECH_BADGE_ICONS[b.icon] || TECH_BADGE_ICONS.hardware;
        return `<span class="tech-logo-badge">${svg}<span>${b.label}</span></span>`;
      }).join("");
      return `<div class="stage-tech-logos ${extraClass}" aria-label="Technologies and platforms used">${items}</div>`;
    }

    // 3B. Callout & Impact Vector Icon Library for Connections Workbench
    const CALLOUT_ICONS = Object.freeze({
      display: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="3.5" width="19" height="13" rx="2"/><path d="M8 20.5h8M12 16.5v4"/></svg>`,
      keyboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M18 12h.01M10 12h4M7 15h10"/></svg>`,
      thermal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2a4.5 4.5 0 0 0 0 9 4.5 4.5 0 0 1 0 9 10 10 0 1 0 0-18Z"/><path d="M2 12a4.5 4.5 0 0 0 9 0 4.5 4.5 0 0 1 9 0"/></svg>`,
      memory: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="10" rx="1.5"/><path d="M6 10v2M10 10v2M14 10v2M18 10v2M5 16v2.5M9 16v2.5M15 16v2.5M19 16v2.5"/></svg>`,
      motherboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/></svg>`,
      storage: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5.5" rx="7.5" ry="3"/><path d="M4.5 5.5v6c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-6"/><path d="M4.5 11.5v6.5c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-6.5"/></svg>`,
      chassis: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z"/></svg>`,
      power: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
      windows: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>`,
      exchange: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3.5 6.5 8.5 6 8.5-6"/></svg>`,
      printer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/></svg>`,
      shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5 19.5 6v5.5c0 5-3.3 8.8-7.5 10-4.2-1.2-7.5-5-7.5-10V6L12 2.5Z"/><path d="m9 12 2 2 4.2-4.2"/></svg>`,
      cloud: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H7a5 5 0 0 1-.5-9.97A6.5 6.5 0 0 1 19 10.5a4.25 4.25 0 0 1-1.5 8.5Z"/></svg>`,
      layers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2.5 2 7.5 12 12.5 22 7.5 12 2.5"/><polyline points="2 12.5 12 17.5 22 12.5"/><polyline points="2 17 12 22 22 17"/></svg>`,
      network: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2.5" width="6" height="5" rx="1"/><rect x="2.5" y="16.5" width="6" height="5" rx="1"/><rect x="15.5" y="16.5" width="6" height="5" rx="1"/><path d="M12 7.5v4.5M5.5 16.5V12h13v4.5"/></svg>`,
      server: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="3" width="19" height="7" rx="1.8"/><rect x="2.5" y="14" width="19" height="7" rx="1.8"/><circle cx="6.5" cy="6.5" r="1"/><circle cx="6.5" cy="17.5" r="1"/><path d="M10.5 6.5h7M10.5 17.5h7"/></svg>`,
      people: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6" rx="0.6"/><rect x="12" y="8" width="3" height="10" rx="0.6"/><rect x="17" y="5" width="3" height="13" rx="0.6"/></svg>`,
      trend: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
      dollar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15 9.5a2.5 2.5 0 0 0-2.5-2h-1A2.5 2.5 0 0 0 9 10c0 1.5 1.5 2 3 2.5s3 1 3 2.5a2.5 2.5 0 0 1-2.5 2h-1A2.5 2.5 0 0 1 9 15M12 5.5v13"/></svg>`,
      target: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><polygon points="12 7 13.5 10.3 17 10.8 14.5 13.2 15.1 16.7 12 15 8.9 16.7 9.5 13.2 7 10.8 10.5 10.3 12 7"/></svg>`
    });

    const IMPACT_ICONS = Object.freeze({
      clock: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6.2"/><path d="M8 4.8V8l2.2 1.4"/></svg>`,
      refresh: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 8a5.5 5.5 0 0 1 9.3-4l1.2 1.2M13.5 8a5.5 5.5 0 0 1-9.3 4L3 10.8"/><path d="M13 2.8v2.4h-2.4M3 13.2v-2.4h2.4"/></svg>`,
      star: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6.2"/><polygon points="8 4.5 9 6.8 11.5 7.1 9.7 8.8 10.1 11.2 8 10 5.9 11.2 6.3 8.8 4.5 7.1 7 6.8 8 4.5"/></svg>`,
      up: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6.2"/><path d="M8 11V5.2M5.7 7.4 8 5.1l2.3 2.3"/></svg>`
    });

    // 3C. Unified 6-Stage "A career built through connections." Workbench Data Model
    const CONNECTIONS_STAGES = Object.freeze([
      {
        idx: 0,
        num: "01",
        pillLabel: "Hardware",
        railYear: "2006",
        railTitle: "Support",
        railLogo: "assets/dell-official.svg",
        railLogoAlt: "Dell Technologies",
        railIconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`,
        kicker: "01 · HARDWARE",
        headline: "Start with the real problem.",
        subtitle: "Hardware support taught me to diagnose, fix and explain technology at the physical level — a foundation that still helps me design reliable solutions today.",
        image: "assets/timeline-support.png",
        defaultCalloutIdx: 4,
        isoAccent: "#10b981",
        isoSecondary: "#00c3ff",
        isoRimPath: "M 500,590 L 856,396 L 500,224 L 144,396 Z",
        isoCoreX: 498,
        isoCoreTopY: 36,
        isoCoreBaseY: 342,
        isoTraces: [
          "M 248,308 L 348,362 L 484,458",
          "M 498,342 L 618,382 L 642,348",
          "M 498,342 L 388,242 L 492,196",
          "M 498,342 L 725,286 L 612,216",
          "M 326,386 L 484,458 L 602,418"
        ],
        takeawayIcon: "bulb",
        takeawayLabel: "What I learned",
        takeawayText: "How hardware, drivers and operating systems work together — and how to isolate the root cause before escalating or replacing parts.",
        contributions: [
          "Component-level fault isolation across Dell Latitude laptops.",
          "Diagnosed PSU voltage rails, SATA/IDE storage buses, RAM seating and motherboard POST codes.",
          "Resolved first-call issues and reduced repeat callbacks.",
          "Explained technical findings clearly to clients and colleagues."
        ],
        timeframe: {
          years: "2006",
          org: "Dell Technologies",
          sub: "Gloves Off team support"
        },
        impact: [
          { icon: "clock", text: "Faster resolution times" },
          { icon: "refresh", text: "Fewer repeat callbacks" },
          { icon: "star", text: "Higher customer satisfaction" }
        ],
        techBadges: [
          { icon: "hardware", label: "Dell Latitude & OptiPlex" },
          { icon: "windows", label: "Windows OS & Drivers" },
          { icon: "network", label: "SATA / PCIe / Memory Bus" },
          { icon: "power", label: "PSU & Voltage Rails" },
          { icon: "csio", label: "Gloves Off · First-Call Fix" }
        ],
        callouts: [
          {
            code: "1 · DISPLAY ASSEMBLY",
            cardTitle: "Display Assembly",
            cardSub: "LCD panels, cables, hinges",
            icon: "display",
            posStyle: "right: 1.5%; top: 8%;",
            linePoints: "780,78 705,78 642,342",
            pinX: 642,
            pinY: 342,
            inspectorTitle: "LCD Display Panel, Backlight & LVDS Ribbon Diagnostics",
            inspectorDesc: "Isolated dim, flickering, or dead laptop screens between the LCD panel, inverter/backlight assembly, hinge ribbon cable, and onboard graphics controller."
          },
          {
            code: "2 · KEYBOARD & INPUT",
            cardTitle: "Keyboard & Input",
            cardSub: "Keyboards, touchpads, peripherals",
            icon: "keyboard",
            posStyle: "right: 1.5%; top: 76%;",
            linePoints: "780,520 685,520 598,415",
            pinX: 598,
            pinY: 415,
            inspectorTitle: "Keyboard Matrix, Touchpad & Chassis Input Isolation",
            inspectorDesc: "Guided commercial clients through ribbon-connector reseating, keyboard matrix checks, and docking-station peripheral isolation on Latitude laptops."
          },
          {
            code: "3 · THERMAL & OPTIPLEX",
            cardTitle: "Thermal System",
            cardSub: "Fans, heat pipes, thermal modules",
            icon: "thermal",
            posStyle: "left: 1.5%; top: 8%;",
            linePoints: "220,78 310,78 388,242",
            pinX: 388,
            pinY: 242,
            inspectorTitle: "Copper Heat-Pipe, Blower & OptiPlex Thermal Diagnostics",
            inspectorDesc: "Identified thermal throttling, fan bearing failures, and heat-sink contact faults causing intermittent shutdowns under corporate workloads."
          },
          {
            code: "4 · MEMORY DIAGNOSTICS",
            cardTitle: "Memory",
            cardSub: "RAM installation and diagnostics",
            icon: "memory",
            posStyle: "left: 1.5%; top: 53%;",
            linePoints: "220,368 275,368 326,386",
            pinX: 326,
            pinY: 386,
            inspectorTitle: "SODIMM & Desktop Memory Bus Verification",
            inspectorDesc: "Verified dual-channel RAM seating, isolated single-stick memory errors, and resolved blue-screen address faults before dispatching hardware."
          },
          {
            code: "5 · LAPTOP SYSTEM BOARD",
            cardTitle: "Motherboard",
            cardSub: "Chipsets, onboard devices, ports",
            icon: "motherboard",
            posStyle: "left: 1.5%; top: 76%;",
            linePoints: "220,520 365,520 484,458",
            pinX: 484,
            pinY: 458,
            inspectorTitle: "System Board, Wireless Card & Driver Tree",
            inspectorDesc: "Traced device-tree conflicts, Mini-PCI wireless cards, and chipset drivers before recommending a motherboard replacement."
          },
          {
            code: "6 · STORAGE & DRIVES",
            cardTitle: "Storage",
            cardSub: "SATA/SSD, drive replacement",
            icon: "storage",
            posStyle: "right: 1.5%; top: 31%;",
            linePoints: "780,222 752,222 725,286",
            pinX: 725,
            pinY: 286,
            inspectorTitle: "SATA/IDE Storage Bus & Drive Diagnostics",
            inspectorDesc: "Ran drive sector diagnostics, isolated controller vs. disk faults, and guided non-destructive recovery steps for corporate laptop and desktop users."
          },
          {
            code: "7 · CHASSIS & CORE BUS",
            cardTitle: "Chassis",
            cardSub: "Physical assembly and repair",
            icon: "chassis",
            posStyle: "right: 1.5%; top: 53%;",
            linePoints: "780,368 625,368 498,332",
            pinX: 498,
            pinY: 332,
            inspectorTitle: "Physical Chassis Assembly & Field Repair Alignment",
            inspectorDesc: "Prepared accurate component replacement notes so field technicians arrived with the exact chassis, bezel, or system-board assembly required."
          },
          {
            code: "8 · POWER & VOLTAGE RAILS",
            cardTitle: "Power",
            cardSub: "PSU, battery, charging, power rails",
            icon: "power",
            posStyle: "left: 1.5%; top: 31%;",
            linePoints: "220,222 235,222 248,308",
            pinX: 248,
            pinY: 308,
            inspectorTitle: "PSU Voltage Rails, Battery & Charging Circuitry",
            inspectorDesc: "Diagnosed AC adapter sense pins, lithium-ion charging rails, and OptiPlex desktop power supply units to isolate no-POST power failures."
          }
        ],
        relatedProjects: [
          {
            thumb: "assets/timeline-support.png",
            thumbPos: "62% 54%",
            title: "Dell Latitude Hardware Support",
            desc: "First-call diagnostics and repairs for enterprise laptops.",
            href: "#projects/dell"
          },
          {
            thumb: "assets/timeline-support.png",
            thumbPos: "38% 42%",
            title: "OptiPlex Desktop Repair",
            desc: "Motherboard, PSU and component replacements.",
            href: "#projects/dell"
          },
          {
            thumb: "assets/timeline-support.png",
            thumbPos: "72% 46%",
            title: "Storage & Drive Diagnostics",
            desc: "SATA/IDE drive testing and data recovery support.",
            href: "#projects/dell"
          }
        ]
      },
      {
        idx: 1,
        num: "02",
        pillLabel: "Systems",
        railYear: "2007–2009",
        railTitle: "Systems",
        railLogo: "assets/harris-computer-services.svg",
        railLogoAlt: "Harris Computer Services",
        railIconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>`,
        kicker: "02 · SYSTEMS",
        headline: "Making technology work reliably.",
        subtitle: "I moved from individual devices to complete systems — deploying, managing and supporting the core platforms businesses depend on every day.",
        image: "assets/timeline-systems.png",
        defaultCalloutIdx: 0,
        isoAccent: "#0755ff",
        isoSecondary: "#00c3ff",
        isoRimPath: "M 498,592 L 856,386 L 502,216 L 142,388 Z",
        isoCoreX: 498,
        isoCoreTopY: 36,
        isoCoreBaseY: 356,
        isoTraces: [
          "M 342,235 L 498,356 L 608,228",
          "M 225,332 L 462,482 L 605,432",
          "M 498,356 L 678,268 L 748,308",
          "M 462,482 L 498,356 L 342,235"
        ],
        takeawayIcon: "bulb",
        takeawayLabel: "What I learned",
        takeawayText: "How core business services depend on each other, and how to plan migrations with minimal disruption.",
        contributions: [
          "Administered and migrated Active Directory, Group Policy, Microsoft Exchange, file & print servers, and BlackBerry Enterprise Server (BES).",
          "Built server environments for small and mid-sized businesses.",
          "Developed repeatable migration processes to separate combined SBS services.",
          "Managed client environments, client and internal firewalls, and VLAN switching."
        ],
        timeframe: {
          years: "2007 – 2009",
          org: "Harris Computer Services",
          sub: "Small Business Clients"
        },
        impact: [
          { icon: "clock", text: "Improved reliability" },
          { icon: "refresh", text: "Reduced downtime" },
          { icon: "up", text: "Enabled business growth" }
        ],
        techBadges: [
          { icon: "windows", label: "Windows Server" },
          { icon: "ad", label: "Active Directory & GPO" },
          { icon: "exchange", label: "Microsoft Exchange" },
          { icon: "bes", label: "BlackBerry BES" },
          { icon: "al3", label: "File & Print Services" },
          { icon: "network", label: "Firewalls & VLANs" }
        ],
        callouts: [
          {
            code: "1 · COMBINED SBS SERVER",
            cardTitle: "Active Directory",
            cardSub: "Identity, Group Policy, user management",
            icon: "windows",
            posStyle: "left: 1.5%; top: 12%;",
            linePoints: "220,110 295,110 342,235",
            pinX: 342,
            pinY: 235,
            inspectorTitle: "Outgrowing Combined Small Business Server (SBS)",
            inspectorDesc: "Growing businesses had Active Directory, Exchange email, and files tightly coupled on a single server—making direct upgrades risky."
          },
          {
            code: "2 · MICROSOFT EXCHANGE",
            cardTitle: "Microsoft Exchange",
            cardSub: "Email, calendaring, shared resources",
            icon: "exchange",
            posStyle: "right: 1.5%; top: 10%;",
            linePoints: "780,95 685,95 608,228",
            pinX: 608,
            pinY: 228,
            inspectorTitle: "Dedicated Exchange Mail & BlackBerry Enterprise Server",
            inspectorDesc: "Transitioned live mailboxes, public folders, mail routing, and BlackBerry Enterprise Server (BES) synchronization onto dedicated messaging hardware."
          },
          {
            code: "3 · FILE & PRINT SERVICES",
            cardTitle: "File & Print Services",
            cardSub: "File sharing, print management",
            icon: "printer",
            posStyle: "right: 1.5%; top: 42%;",
            linePoints: "780,295 762,295 748,308",
            pinX: 748,
            pinY: 308,
            inspectorTitle: "Dedicated File Shares, Permissions & Print Servers",
            inspectorDesc: "Separated shared network drives and print queues onto dedicated Windows Server instances while preserving NTFS permissions and drive mappings."
          },
          {
            code: "4 · APPLICATION STORAGE",
            cardTitle: "Server Storage",
            cardSub: "Shared data, backups, server arrays",
            icon: "storage",
            posStyle: "left: 1.5%; top: 42%;",
            linePoints: "220,295 450,295 678,268",
            pinX: 678,
            pinY: 268,
            inspectorTitle: "Server Storage Arrays & Staged Data Cutover",
            inspectorDesc: "Planned storage capacity, RAID arrays, and staged swing-migration sync passes so client data remained intact through weekend cutovers."
          },
          {
            code: "5 · CLIENT ENVIRONMENTS",
            cardTitle: "Client Environments",
            cardSub: "Windows deployments, updates, support",
            icon: "display",
            posStyle: "left: 1.5%; top: 72%;",
            linePoints: "220,490 222,415 225,332",
            pinX: 225,
            pinY: 332,
            inspectorTitle: "NOC Monitoring, Assessments & Client Workstations",
            inspectorDesc: "Installed, updated, and replaced NOC monitoring nodes, performed client environment assessments, and supported workstation deployments."
          },
          {
            code: "6 · NETWORK & SECURITY",
            cardTitle: "Network & Security",
            cardSub: "Firewalls, VLANs, access control",
            icon: "shield",
            posStyle: "right: 1.5%; top: 72%;",
            linePoints: "780,490 695,490 605,432",
            pinX: 605,
            pinY: 432,
            inspectorTitle: "Client & Internal Firewalls, Switches & Server Racks",
            inspectorDesc: "Built server racks and configured client and internal firewalls, managed switches, and secure site connectivity across SMB client environments."
          }
        ],
        relatedProjects: [
          {
            thumb: "assets/timeline-systems.png",
            thumbPos: "62% 38%",
            title: "SBS to Multi-Server Migration",
            desc: "Separated AD, Exchange and file/print to dedicated servers.",
            href: "#projects/foundations"
          },
          {
            thumb: "assets/timeline-systems.png",
            thumbPos: "32% 45%",
            title: "Client Environment Builds",
            desc: "Assessed, deployed and configured Windows server & client environments.",
            href: "#projects/foundations"
          },
          {
            thumb: "assets/timeline-systems.png",
            thumbPos: "55% 68%",
            title: "Firewall & Rack Implementation",
            desc: "Configured client and internal firewalls, switches and server racks.",
            href: "#projects/foundations"
          }
        ]
      },
      {
        idx: 2,
        num: "03",
        pillLabel: "Infrastructure",
        railYear: "2009 onward",
        railTitle: "Infrastructure",
        railLogo: "assets/grenville-official.png",
        railLogoAlt: "Grenville Mutual Insurance",
        railIconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="7" rx="1.8"/><rect x="2" y="14" width="20" height="7" rx="1.8"/><circle cx="6" cy="6.5" r="1"/><circle cx="6" cy="17.5" r="1"/><path d="M10 6.5h8M10 17.5h8"/></svg>`,
        kicker: "03 · INFRASTRUCTURE",
        headline: "Building the environments technology depends on.",
        subtitle: "I designed, built and supported the headquarters infrastructure that keeps the business running — from structured cabling, power and cooling to VMware ESXi virtualization.",
        image: "assets/timeline-infrastructure.png",
        defaultCalloutIdx: 1,
        isoAccent: "#0755ff",
        isoSecondary: "#00c3ff",
        isoRimPath: "M 498,584 L 848,388 L 500,224 L 152,388 Z",
        isoCoreX: 498,
        isoCoreTopY: 36,
        isoCoreBaseY: 328,
        isoTraces: [
          "M 348,332 L 498,328 L 708,336",
          "M 312,432 L 495,468 L 708,336",
          "M 235,305 L 348,332 L 495,468",
          "M 498,328 L 605,268 L 792,286"
        ],
        takeawayIcon: "gear",
        takeawayLabel: "What I built",
        takeawayText: "A stable, secure and scalable headquarters and virtualized server environment that reduced hardware footprint, simplified management and gave the business room to grow.",
        contributions: [
          "Designed and implemented VMware ESXi environment from bare-metal blade servers.",
          "Took corporate headquarters technical infrastructure from design through build and physical move.",
          "Accounted for networking, meeting-room AV, physical security, and server-room cooling.",
          "Integrated conditioned UPS battery backup and standby generator considerations.",
          "Coordinated network, storage and security dependencies with minimal downtime."
        ],
        timeframe: {
          years: "2009 – 2022",
          org: "Grenville Mutual",
          sub: "Insurance"
        },
        impact: [
          { icon: "up", text: "Improved reliability" },
          { icon: "up", text: "Consolidated blade footprint" },
          { icon: "up", text: "Simplified management" },
          { icon: "up", text: "Enabled future growth" }
        ],
        techBadges: [
          { icon: "vmware", label: "VMware ESXi" },
          { icon: "windows", label: "Windows Server" },
          { icon: "hardware", label: "Blade Centre & 42U Racks" },
          { icon: "network", label: "Cat6A & Switches" },
          { icon: "power", label: "UPS & Standby Generator" },
          { icon: "csio", label: "AV & Door Security" }
        ],
        callouts: [
          {
            code: "1 · HQ INFRASTRUCTURE CONTINUITY",
            cardTitle: "Continuity & Growth",
            cardSub: "HQ cutover, scalable foundation",
            icon: "cloud",
            posStyle: "left: 1.5%; top: 7%;",
            linePoints: "220,72 385,72 498,252",
            pinX: 498,
            pinY: 252,
            inspectorTitle: "Headquarters Infrastructure Design, Build & Cutover",
            inspectorDesc: "Took the corporate headquarters technical infrastructure from initial floorplan design through construction, physical move, and live cutover."
          },
          {
            code: "2 · DATACENTRE MODERNIZATION",
            cardTitle: "Virtualization",
            cardSub: "VMware ESXi consolidation",
            icon: "layers",
            posStyle: "right: 1.5%; top: 53%;",
            linePoints: "780,368 742,368 708,336",
            pinX: 708,
            pinY: 336,
            inspectorTitle: "From Physical Blade Centre to VMware ESXi",
            inspectorDesc: "Planned and executed the transition from a physical blade server environment to a virtualized VMware ESXi infrastructure, improving reliability, scalability and manageability."
          },
          {
            code: "3 · NETWORKING & CABLING",
            cardTitle: "Networking",
            cardSub: "Switches, VLANs, Cat6A cabling",
            icon: "network",
            posStyle: "right: 1.5%; top: 76%;",
            linePoints: "780,520 625,520 495,468",
            pinX: 495,
            pinY: 468,
            inspectorTitle: "Structured Cat6A Cabling, Patch Panels & Switching",
            inspectorDesc: "Designed workstation data/VoIP drops, patch-panel terminations, and core/edge switching across the new headquarters building."
          },
          {
            code: "4 · COMPUTE & BLADE SYSTEMS",
            cardTitle: "Compute",
            cardSub: "42U racks, blade server chassis",
            icon: "server",
            posStyle: "left: 1.5%; top: 53%;",
            linePoints: "220,368 290,368 348,332",
            pinX: 348,
            pinY: 332,
            inspectorTitle: "42U Server Racks & Blade Centre Consolidation",
            inspectorDesc: "Built out the 42U server cabinets and migrated workloads from bare-metal blade servers into consolidated virtual hosts."
          },
          {
            code: "5 · POWER & COOLING",
            cardTitle: "Power & Cooling",
            cardSub: "UPS, generator, server HVAC",
            icon: "power",
            posStyle: "left: 1.5%; top: 76%;",
            linePoints: "220,520 272,520 312,432",
            pinX: 312,
            pinY: 432,
            inspectorTitle: "Conditioned UPS, Standby Generator & Server-Room HVAC",
            inspectorDesc: "Accounted for dedicated server-room cooling, conditioned UPS battery backup, and facility standby generator failover requirements."
          },
          {
            code: "6 · SECURITY & ACCESS",
            cardTitle: "Security",
            cardSub: "Physical access, firewalls, AV",
            icon: "shield",
            posStyle: "right: 1.5%; top: 7%;",
            linePoints: "780,72 685,72 605,268",
            pinX: 605,
            pinY: 268,
            inspectorTitle: "Physical Door Security, Firewalls & Boardroom AV",
            inspectorDesc: "Integrated badge-access door security, network firewall boundaries, and meeting-room AV systems into the headquarters build."
          },
          {
            code: "7 · STORAGE & BACKUP",
            cardTitle: "Storage",
            cardSub: "Shared arrays, backup, recovery",
            icon: "storage",
            posStyle: "right: 1.5%; top: 30%;",
            linePoints: "780,218 786,218 792,286",
            pinX: 792,
            pinY: 286,
            inspectorTitle: "Shared Datastore Arrays & Disaster Recovery Readiness",
            inspectorDesc: "Configured shared storage for VMware ESXi hosts and standardized backup and recovery procedures for core insurance systems."
          },
          {
            code: "8 · PHYSICAL INFRASTRUCTURE",
            cardTitle: "Physical Infrastructure",
            cardSub: "Racks, cabling, operations desk",
            icon: "server",
            posStyle: "left: 1.5%; top: 30%;",
            linePoints: "220,218 228,218 235,305",
            pinX: 235,
            pinY: 305,
            inspectorTitle: "End-to-End Physical Server Room & Operations Buildout",
            inspectorDesc: "Delivered a clean, maintainable server room layout where power, cooling, cabling, and virtualization worked together from day one."
          }
        ],
        relatedProjects: [
          {
            thumb: "assets/timeline-infrastructure.png",
            thumbPos: "38% 46%",
            title: "Datacentre & HQ Buildout",
            desc: "42U racks, structured cabling, patch panels, AV and security.",
            href: "#projects/headquarters"
          },
          {
            thumb: "assets/timeline-infrastructure.png",
            thumbPos: "70% 48%",
            title: "Blade-to-ESXi Virtualization",
            desc: "Consolidated physical blade servers into VMware ESXi.",
            href: "#projects/headquarters"
          },
          {
            thumb: "assets/timeline-infrastructure.png",
            thumbPos: "35% 65%",
            title: "Power, Cooling & DR Planning",
            desc: "UPS, standby generator and server-room HVAC requirements.",
            href: "#projects/headquarters"
          }
        ]
      },
      {
        idx: 3,
        num: "04",
        pillLabel: "Integration",
        railYear: "Mid-2010s–2022",
        railTitle: "Integration",
        railLogo: "assets/grenville-official.png",
        railLogoAlt: "Grenville Mutual Insurance",
        railIconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
        kicker: "04 · INTEGRATION",
        headline: "Connecting systems, data and processes.",
        subtitle: "I personally designed and implemented P&C rating, underwriting and renewal rules while connecting broker portals and BMS platforms across SOAP/XML, CSIO and REST interfaces.",
        image: "assets/timeline-analysis.png",
        defaultCalloutIdx: 0,
        isoAccent: "#0755ff",
        isoSecondary: "#10b981",
        isoRimPath: "M 498,588 L 856,392 L 500,218 L 144,392 Z",
        isoCoreX: 498,
        isoCoreTopY: 36,
        isoCoreBaseY: 336,
        isoTraces: [
          "M 232,298 L 368,248 L 592,285",
          "M 342,395 L 495,452 L 665,375",
          "M 368,248 L 498,336 L 768,302",
          "M 232,298 L 342,395 L 498,336"
        ],
        takeawayIcon: "bulb",
        takeawayLabel: "What I built",
        takeawayText: "Deterministic P&C rating, underwriting and renewal rules connected across broker BMS platforms and portals — automating standard cases while routing exceptions to underwriters.",
        contributions: [
          "Personally designed and implemented P&C rating, underwriting and renewal eligibility rules.",
          "Automated ~80% of residential, ~60% of commercial, and ~40% of farm/agri renewals (user-reported, renewal-only).",
          "Mapped and diagnosed SOAP/XML, CSIO/ACORD, AL3 and REST payloads across TAM and Epic (Bravado/Bravado1).",
          "Built a C#/.NET, JavaScript and Bootstrap portal for authenticated adjuster document uploads via REST APIs."
        ],
        timeframe: {
          years: "2010s – 2022",
          org: "Grenville Mutual",
          sub: "Analysis, Rules & Integration"
        },
        impact: [
          { icon: "up", text: "~80% residential renewal automation" },
          { icon: "up", text: "~60% commercial & ~40% farm renewals" },
          { icon: "up", text: "Clear underwriter exception routing" },
          { icon: "up", text: "Actionable broker validation messages" }
        ],
        techBadges: [
          { icon: "rules", label: "P&C Rules Engine" },
          { icon: "xml", label: "SOAP / XML & CSIO" },
          { icon: "rest", label: "REST APIs" },
          { icon: "csharp", label: "C# / .NET" },
          { icon: "js", label: "JavaScript & Bootstrap" },
          { icon: "bms", label: "TAM & Epic (Bravado)" }
        ],
        callouts: [
          {
            code: "1 · UNDERWRITING & RATING ENGINE",
            cardTitle: "Underwriting Rules",
            cardSub: "P&C rating, eligibility, validation",
            icon: "layers",
            posStyle: "left: 1.5%; top: 10%;",
            linePoints: "220,95 305,95 368,248",
            pinX: 368,
            pinY: 248,
            inspectorTitle: "Personal Design & Implementation of P&C Policy Rules",
            inspectorDesc: "Personally designed and implemented residential, auto, commercial, and farm rating and underwriting rules across inquiry, new business, endorsements, and renewals."
          },
          {
            code: "2 · BROKER PORTAL INTAKE",
            cardTitle: "Broker Portal & UI",
            cardSub: "Inquiry, quoting, policy changes",
            icon: "display",
            posStyle: "left: 1.5%; top: 41%;",
            linePoints: "220,285 226,285 232,298",
            pinX: 232,
            pinY: 298,
            inspectorTitle: "Broker Inquiry, New Business & Policy-Change Workflows",
            inspectorDesc: "Directed UI changes to capture missing risk details and shaped actionable portal validation messages so brokers could self-correct, refer, or bind."
          },
          {
            code: "3 · SOAP/XML & CSIO PAYLOADS",
            cardTitle: "CSIO & XML Payloads",
            cardSub: "SOAP/XML, REST, TAM & Epic BMS",
            icon: "network",
            posStyle: "left: 1.5%; top: 72%;",
            linePoints: "220,490 290,490 342,395",
            pinX: 342,
            pinY: 395,
            inspectorTitle: "Cross-System Payload Mapping (SOAP/XML, CSIO & REST)",
            inspectorDesc: "Mapped and transformed fields across CSIO/ACORD standards, Bravado/Bravado1 bridges, and proprietary backend schemas—tracing malformed XML with custom log tools."
          },
          {
            code: "4 · AUTO-RENEWAL PATH",
            cardTitle: "Renewal Automation",
            cardSub: "~80% Res · ~60% Comm · ~40% Farm",
            icon: "trend",
            posStyle: "right: 1.5%; top: 10%;",
            linePoints: "780,95 675,95 592,285",
            pinX: 592,
            pinY: 285,
            inspectorTitle: "Straight-Through Renewal Eligibility Automation",
            inspectorDesc: "Classified eligible standard renewals for straight-through processing: approximately 80% residential, 60% commercial, and 40% farm/agri (user-reported, renewal-only)."
          },
          {
            code: "5 · HUMAN EXCEPTION ROUTING",
            cardTitle: "Exception Referral",
            cardSub: "Clear routing for underwriter review",
            icon: "shield",
            posStyle: "right: 1.5%; top: 41%;",
            linePoints: "780,285 774,285 768,302",
            pinX: 768,
            pinY: 302,
            inspectorTitle: "Structured Underwriter Referral for Complex Risks",
            inspectorDesc: "Preserved human insurance judgment by routing non-standard risks and threshold exceptions to underwriters with explicit rule-trigger reasons."
          },
          {
            code: "6 · DOCUMENT UPLOAD PORTAL",
            cardTitle: "Document Upload",
            cardSub: "C#/.NET, JS, Bootstrap & REST API",
            icon: "storage",
            posStyle: "right: 1.5%; top: 72%;",
            linePoints: "780,490 625,490 495,452",
            pinX: 495,
            pinY: 452,
            inspectorTitle: "Authenticated Adjuster Document Upload Web App",
            inspectorDesc: "Built a production C#/.NET, JavaScript, and Bootstrap web portal allowing external adjusters to upload claim documents and images directly into policy records via REST."
          }
        ],
        relatedProjects: [
          {
            thumb: "assets/timeline-analysis.png",
            thumbPos: "60% 42%",
            title: "Renewal Eligibility & Exceptions",
            desc: "~80% residential, ~60% commercial, ~40% farm renewal automation.",
            href: "#projects/renewals"
          },
          {
            thumb: "assets/timeline-analysis.png",
            thumbPos: "35% 42%",
            title: "Commercial Quoting & Workflows",
            desc: "SOAP/XML, CSIO and REST broker integrations across TAM & Epic.",
            href: "#projects/workflows"
          },
          {
            thumb: "assets/timeline-analysis.png",
            thumbPos: "50% 68%",
            title: "Adjuster Document Upload Portal",
            desc: "Authenticated C#/.NET, JS and REST web portal tied to policy records.",
            href: "#projects/upload"
          }
        ]
      },
      {
        idx: 4,
        num: "05",
        pillLabel: "Solutions",
        railYear: "2022–present",
        railTitle: "Solutions",
        railLogo: "assets/medavie-official.svg",
        railLogoAlt: "Medavie",
        railIconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2Z"/></svg>`,
        kicker: "05 · SOLUTIONS",
        headline: "Designing solutions to business problems.",
        subtitle: "I moved beyond individual systems to design and guide end-to-end solutions — combining people, processes and technology to solve real insurance and claims challenges.",
        image: "assets/timeline-solutions.png",
        defaultCalloutIdx: 0,
        isoAccent: "#00c3ff",
        isoSecondary: "#0755ff",
        isoRimPath: "M 498,582 L 856,374 L 500,192 L 144,374 Z",
        isoCoreX: 498,
        isoCoreTopY: 36,
        isoCoreBaseY: 292,
        isoTraces: [
          "M 272,248 L 412,192 L 498,292",
          "M 498,292 L 608,208 L 732,316",
          "M 272,248 L 458,402 L 732,316",
          "M 412,192 L 498,292 L 458,402"
        ],
        takeawayIcon: "bulb",
        takeawayLabel: "What I delivered",
        takeawayText: "Practical solutions that connected people, processes and technology — enabling validated takeover onboarding, provider sync mappings, SQL reconciliation, and daily ETL continuity.",
        contributions: [
          "Worked alongside architects on ProviderRegistry solution review, gap analysis, field mappings and scheduled REST sync requirements.",
          "Researched, documented and guided development of a production Excel/VB/XML tool for prior-insurer takeover history.",
          "Wrote hand-written claims SQL to trace report logic and reconcile financial reports against claims data.",
          "Uncovered that a 'Power BI report' request was a daily COBOL/InterBlue flat-file ETL feed; completed REST continuity design."
        ],
        timeframe: {
          years: "2022 – Present",
          org: "Medavie",
          sub: "Claims & Provider Solutions"
        },
        impact: [
          { icon: "up", text: "Production takeover XML tool" },
          { icon: "up", text: "Improved claims data accuracy" },
          { icon: "up", text: "Reduced manual reconciliation" },
          { icon: "up", text: "Lower operational cutover risk" },
          { icon: "up", text: "Preserved daily ETL continuity" }
        ],
        techBadges: [
          { icon: "sql", label: "SQL Server" },
          { icon: "etl", label: "Daily ETL Continuity" },
          { icon: "rest", label: "APIs (REST / Scheduled Sync)" },
          { icon: "xml", label: "XML / XSD" },
          { icon: "excel", label: "Excel / VB Tooling" },
          { icon: "recon", label: "Reconciliation" }
        ],
        callouts: [
          {
            code: "1 · INSURANCE PROVIDER & TAKEOVER",
            cardTitle: "Business Need",
            cardSub: "Stabilize, integrate and validate claims & provider data",
            icon: "target",
            posStyle: "left: 1.5%; top: 72%;",
            linePoints: "220,490 365,490 498,292",
            pinX: 498,
            pinY: 292,
            inspectorTitle: "Medavie – Provider Sync & Takeover Tooling",
            inspectorDesc: "Reviewed provider synchronization architecture and guided production Excel/VB/XML tooling to validate and reconcile prior-insurer takeover history."
          },
          {
            code: "2 · STAKEHOLDER ALIGNMENT",
            cardTitle: "People",
            cardSub: "Teams, stakeholders, adoption",
            icon: "people",
            posStyle: "left: 1.5%; top: 41%;",
            linePoints: "220,285 248,285 272,248",
            pinX: 272,
            pinY: 248,
            inspectorTitle: "Supporting Onboarding Teams & Architects",
            inspectorDesc: "Researched the business problem, documented the solution, guided developer implementation, and directly supported onboarding users."
          },
          {
            code: "3 · CLAIMS & FINANCIAL WORKFLOWS",
            cardTitle: "Process",
            cardSub: "Claims, policy, financial reconciliation",
            icon: "thermal",
            posStyle: "left: 1.5%; top: 10%;",
            linePoints: "220,95 335,95 412,192",
            pinX: 412,
            pinY: 192,
            inspectorTitle: "Hand-Written Claims SQL & Financial Balancing",
            inspectorDesc: "Wrote complex hand-written SQL to trace claims adjudication logic and balance loaded takeover history against financial reporting totals."
          },
          {
            code: "4 · SYSTEMS & DATA INTEGRATION",
            cardTitle: "Technology",
            cardSub: "SQL, XML, REST, scheduled sync",
            icon: "layers",
            posStyle: "right: 1.5%; top: 10%;",
            linePoints: "780,95 685,95 608,208",
            pinX: 608,
            pinY: 208,
            inspectorTitle: "ProviderRegistry Event Table & REST Sync Mappings",
            inspectorDesc: "Performed solution review, gap analysis, and field mappings for scheduled table-backed provider event publishing and REST retrieval."
          },
          {
            code: "5 · VALIDATION & CONTINUITY",
            cardTitle: "Governance",
            cardSub: "Schema validation, ETL continuity",
            icon: "shield",
            posStyle: "right: 1.5%; top: 41%;",
            linePoints: "780,285 755,285 732,316",
            pinX: 732,
            pinY: 316,
            inspectorTitle: "Daily ETL Reporting Continuity vs. Modernization",
            inspectorDesc: "Uncovered that a 'reporting' request was a daily COBOL/InterBlue flat-file ETL feed into client Cognos analytics; completed the REST continuity design."
          },
          {
            code: "6 · MEASURABLE DELIVERY OUTCOMES",
            cardTitle: "Delivery Outcomes",
            cardSub: "Efficiency · Accuracy · Risk Reduction",
            icon: "chart",
            posStyle: "right: 1.5%; top: 72%;",
            linePoints: "780,490 615,490 458,402",
            pinX: 458,
            pinY: 402,
            inspectorTitle: "Practical Tooling & Verified Data Integrity",
            inspectorDesc: "Reduced manual spreadsheet transformation, caught data discrepancies before batch loads, and protected downstream client reporting contracts."
          }
        ],
        relatedProjects: [
          {
            thumb: "assets/timeline-solutions.png",
            thumbPos: "42% 35%",
            title: "Takeover Reconciliation Tool",
            desc: "Production Excel/VB/XML claim validation and financial reconciliation.",
            href: "#projects/takeover"
          },
          {
            thumb: "assets/timeline-solutions.png",
            thumbPos: "52% 48%",
            title: "Provider Data Integration",
            desc: "Solution review, field mappings and scheduled REST sync requirements.",
            href: "#projects/claims"
          },
          {
            thumb: "assets/timeline-solutions.png",
            thumbPos: "68% 42%",
            title: "Daily ETL Reporting Continuity",
            desc: "Completed analysis and REST mapping to preserve a daily client feed.",
            href: "#projects/continuity"
          }
        ]
      },
      {
        idx: 5,
        num: "06",
        pillLabel: "Business Outcomes",
        railYear: "2022–present",
        railTitle: "Business Outcomes",
        railSub: "Across roles & projects",
        railIconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>`,
        kicker: "06 · BUSINESS OUTCOMES",
        headline: "Turning technology into measurable value.",
        subtitle: "I combine technical depth with business understanding to deliver practical, measurable outcomes — improving operations, reducing risk, and enabling growth.",
        image: "assets/timeline-outcomes.png",
        defaultCalloutIdx: 0,
        isoAccent: "#10b981",
        isoSecondary: "#00e5a3",
        isoRimPath: "M 498,582 L 856,396 L 500,224 L 144,396 Z",
        isoGrowthArrowPath: "M 326,356 L 442,272 L 494,302 L 648,148",
        isoTraces: [
          "M 318,288 L 428,342 L 498,392",
          "M 498,392 L 658,312 L 562,208",
          "M 465,482 L 498,392 L 428,342"
        ],
        takeawayIcon: "bulb",
        takeawayLabel: "Business impact",
        takeawayText: "Enabled reliable enterprise transitions, high-volume renewal automation, accurate takeover onboarding, and governed AI execution (NEXUS) with minimal disruption to business operations.",
        contributions: [
          "Delivered production takeover-history validation and reconciliation tooling adopted by the onboarding team.",
          "Automated standard policy renewals (~80% residential, ~60% commercial, ~40% farm user-reported) while routing exceptions to underwriters.",
          "Preserved downstream B2B, broker and daily ETL reporting continuity across platform transitions.",
          "Building NEXUS as an independent capstone with scoped context, explainable routing and verification receipts."
        ],
        timeframe: {
          years: "2006 – Present",
          org: "Dell · Harris · Grenville · Medavie",
          sub: "Plus NEXUS Independent Capstone"
        },
        impact: [
          { icon: "up", text: "Faster provider & group onboarding" },
          { icon: "up", text: "Improved claims & financial accuracy" },
          { icon: "up", text: "Reduced manual reconciliation" },
          { icon: "up", text: "Lower operational & cutover risk" },
          { icon: "up", text: "Governed AI execution (NEXUS)" }
        ],
        techBadges: [
          { icon: "sql", label: "SQL Server" },
          { icon: "etl", label: "ETL Continuity" },
          { icon: "rest", label: "APIs (REST / SOAP)" },
          { icon: "xml", label: "XML / XSD" },
          { icon: "recon", label: "Data Reconciliation" },
          { icon: "ts", label: "NEXUS (TypeScript / React)" }
        ],
        callouts: [
          {
            code: "1 · OPERATIONAL EFFICIENCY",
            cardTitle: "Operational Efficiency",
            cardSub: "Automate, simplify, reduce manual work",
            icon: "chart",
            posStyle: "right: 1.5%; top: 10%;",
            linePoints: "780,95 665,95 562,208",
            pinX: 562,
            pinY: 208,
            inspectorTitle: "Medavie Takeover Tooling & Grenville Renewal Automation",
            inspectorDesc: "Automated ~80% residential, ~60% commercial, and ~40% farm renewals at Grenville, and delivered production Excel/VB/XML takeover tooling at Medavie."
          },
          {
            code: "2 · COST & TIME OPTIMIZATION",
            cardTitle: "Cost Optimization",
            cardSub: "Right-size infrastructure and workflows",
            icon: "dollar",
            posStyle: "left: 1.5%; top: 41%;",
            linePoints: "220,285 335,285 428,342",
            pinX: 428,
            pinY: 342,
            inspectorTitle: "Blade-to-ESXi Consolidation & First-Call Resolution",
            inspectorDesc: "From first-call hardware resolution on Dell's Gloves Off team to consolidating bare-metal blade servers into VMware ESXi at Grenville."
          },
          {
            code: "3 · RISK REDUCTION & AUDITABILITY",
            cardTitle: "Risk Reduction",
            cardSub: "Improve data accuracy, validation & audit",
            icon: "shield",
            posStyle: "left: 1.5%; top: 10%;",
            linePoints: "220,95 275,95 318,288",
            pinX: 318,
            pinY: 288,
            inspectorTitle: "Catching Discrepancies Before They Reach Production",
            inspectorDesc: "Combining XSD schema validation, hand-written claims SQL reconciliation, and explicit underwriter referral rules to prevent production defects."
          },
          {
            code: "4 · SCALE, CONTINUITY & NEXUS",
            cardTitle: "Scale & Growth",
            cardSub: "Enable new capabilities & governed AI",
            icon: "trend",
            posStyle: "right: 1.5%; top: 72%;",
            linePoints: "780,490 625,490 498,392",
            pinX: 498,
            pinY: 392,
            inspectorTitle: "NEXUS — Governed AI Capstone in Active Development",
            inspectorDesc: "Applying 20 years of systems and rules discipline to AI orchestration: scoped context, constraint-aware routing, recoverable execution, and verification receipts."
          },
          {
            code: "5 · BETTER CUSTOMER OUTCOMES",
            cardTitle: "Better Customer Outcomes",
            cardSub: "Faster service, fewer errors, continuity",
            icon: "people",
            posStyle: "left: 1.5%; top: 72%;",
            linePoints: "220,490 355,490 465,482",
            pinX: 465,
            pinY: 482,
            inspectorTitle: "Protecting Client & Broker Continuity During Change",
            inspectorDesc: "Whether executing staged SBS swing migrations or preserving a daily COBOL/InterBlue ETL feed into Cognos, downstream users stay running."
          },
          {
            code: "6 · PEOPLE ENABLEMENT",
            cardTitle: "People Enablement",
            cardSub: "Give teams the tools and data to succeed",
            icon: "people",
            posStyle: "right: 1.5%; top: 41%;",
            linePoints: "780,285 715,285 658,312",
            pinX: 658,
            pinY: 312,
            inspectorTitle: "Actionable Broker Portal Messages & Team-Adopted Tools",
            inspectorDesc: "Building clear portal validation messages, adjuster upload portals, and XML validation tools that empower underwriters, brokers, and analysts."
          }
        ],
        relatedProjects: [
          {
            thumb: "assets/timeline-solutions.png",
            thumbPos: "42% 35%",
            title: "Takeover Validation Platform",
            desc: "Production Excel/VB/XML claim validation and batch reconciliation.",
            href: "#projects/takeover"
          },
          {
            thumb: "assets/timeline-analysis.png",
            thumbPos: "60% 42%",
            title: "Renewal Automation Engine",
            desc: "~80% res, ~60% comm, ~40% farm renewal automation & referral.",
            href: "#projects/renewals"
          },
          {
            thumb: "assets/nexus-governed-work-v1.png",
            thumbPos: "50% 50%",
            title: "NEXUS — Governed AI Capstone",
            desc: "Scoped context, explainable routing and verification receipts.",
            href: "#projects/nexus"
          }
        ]
      }
    ]);

    getConnStageData = function (idx) {
      return CONNECTIONS_STAGES[idx] || CONNECTIONS_STAGES[0];
    };
    renderHeroBadgeStrip = renderBadgeStripHtml;
    getHeroImpactIcon = function (key) {
      return IMPACT_ICONS[key] || IMPACT_ICONS.up;
    };
    getHeroCalloutIcon = function (key) {
      return CALLOUT_ICONS[key] || CALLOUT_ICONS.motherboard;
    };
    if (refreshHeroDashboardFn) {
      refreshHeroDashboardFn();
    }

    // Mount the 3-Column Interactive Connections Workbench inside .career-scroll-stage as a Scroll-Based Slideshow
    const journeySection = document.getElementById("hero-journey");
    const introBar = journeySection?.querySelector(".career-introduction");
    if (journeySection && introBar && !journeySection.querySelector(".connections-workbench")) {
      const scrollStage = journeySection.querySelector(".career-scroll-stage") || journeySection;

      // 1. Re-structure .career-introduction so Row 1 has Title (left) + 6 Pill Tabs (right), and Row 2 has the full-width subtitle
      const introTextWrap = introBar.querySelector("div");
      const introH2 = introBar.querySelector("h2");
      const introP = introBar.querySelector("p");

      const topTabs = document.createElement("div");
      topTabs.className = "conn-top-tabs";
      topTabs.setAttribute("role", "tablist");
      topTabs.setAttribute("aria-label", "Career stages");
      topTabs.innerHTML = CONNECTIONS_STAGES.map(s => `
        <button type="button" role="tab" class="conn-top-pill" data-conn-stage="${s.idx}" aria-selected="${s.idx === 0 ? "true" : "false"}">
          <span class="conn-pill-num">${s.num}</span>
          <span class="conn-pill-label">${s.pillLabel}</span>
        </button>
      `).join("");

      if (introTextWrap && introH2 && introP) {
        const topRow = document.createElement("div");
        topRow.className = "conn-intro-top-row";
        topRow.append(introH2, topTabs);
        introTextWrap.innerHTML = "";
        introTextWrap.append(topRow, introP);
      } else {
        introBar.append(topTabs);
      }

      // 2. Build the 3-Column Interactive Connections Workbench
      const workbench = document.createElement("div");
      workbench.className = "connections-workbench";
      workbench.innerHTML = `
        <aside class="conn-rail" aria-label="Career timeline stages">
          <div class="conn-rail-line" aria-hidden="true">
            <div class="conn-rail-line-fill" data-conn-rail-fill></div>
          </div>
          <div class="conn-rail-list">
            ${CONNECTIONS_STAGES.map(s => `
              <button type="button" class="conn-rail-card" data-conn-rail="${s.idx}">
                <span class="conn-rail-dot" aria-hidden="true"></span>
                <span class="conn-rail-icon" aria-hidden="true">${s.railIconSvg}</span>
                <span class="conn-rail-body">
                  <span class="conn-rail-year">${s.railYear}</span>
                  <strong class="conn-rail-title">${s.railTitle}</strong>
                  ${s.railLogo
                    ? `<img class="conn-rail-logo ${s.idx === 1 ? "harris-logo" : ""}" src="${s.railLogo}" alt="${s.railLogoAlt}" loading="lazy">`
                    : `<span class="conn-rail-sub">${s.railSub || ""}</span>`
                  }
                </span>
              </button>
            `).join("")}
          </div>
        </aside>

        <div class="conn-stage-center" data-conn-center-anim>
          <header class="conn-stage-header">
            <span class="conn-stage-kicker" data-conn-kicker>01 &middot; HARDWARE</span>
            <h3 class="conn-stage-headline" data-conn-headline>Start with the real problem.</h3>
            <p class="conn-stage-subtitle" data-conn-subtitle></p>
          </header>

          <div class="conn-visual-canvas" data-conn-canvas>
            <div class="conn-iso-stage-mover">
              <div class="conn-ghost-tier conn-ghost-tier--above" data-conn-ghost-above aria-hidden="true">
                <img class="conn-ghost-img" data-conn-ghost-above-img src="assets/timeline-systems.png" alt="">
              </div>
              <img class="conn-stage-img" data-conn-img src="assets/timeline-support.png" alt="Interactive 3D stage architecture">
              <div class="conn-ghost-tier conn-ghost-tier--below" data-conn-ghost-below aria-hidden="true">
                <img class="conn-ghost-img" data-conn-ghost-below-img src="assets/timeline-systems.png" alt="">
              </div>
              <svg class="conn-iso-fx-svg" viewBox="0 0 1000 660" preserveAspectRatio="none" aria-hidden="true" data-conn-fx-svg></svg>
            </div>
            <svg class="conn-leader-svg" viewBox="0 0 1000 660" preserveAspectRatio="none" aria-hidden="true" data-conn-svg></svg>
            <div class="conn-callouts-layer" data-conn-callouts></div>
          </div>

          <div class="conn-related-block">
            <h4 class="conn-related-heading">Related Projects</h4>
            <div class="conn-related-strip-wrap">
              <button type="button" class="conn-related-nav conn-related-nav--prev" data-conn-step="-1" aria-label="Previous stage">&lsaquo;</button>
              <div class="conn-related-grid" data-conn-related></div>
              <button type="button" class="conn-related-nav conn-related-nav--next" data-conn-step="1" aria-label="Next stage">&rsaquo;</button>
            </div>
          </div>
        </div>

        <aside class="conn-inspector-card" data-conn-insp-anim aria-live="polite">
          <div class="conn-insp-top">
            <span class="conn-insp-code" data-conn-part-code>5 &middot; LAPTOP SYSTEM BOARD</span>
            <div class="conn-insp-stepper">
              <button type="button" class="conn-part-btn" data-conn-part-step="-1" aria-label="Previous highlight">&lsaquo;</button>
              <span class="conn-part-count" data-conn-part-count>5 / 8</span>
              <button type="button" class="conn-part-btn" data-conn-part-step="1" aria-label="Next highlight">&rsaquo;</button>
            </div>
          </div>

          <h4 class="conn-insp-title" data-conn-part-title></h4>
          <p class="conn-insp-desc" data-conn-part-desc></p>

          <div class="conn-takeaway-box">
            <span class="conn-takeaway-icon" data-conn-takeaway-icon aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2Z"/></svg>
            </span>
            <div class="conn-takeaway-body">
              <strong data-conn-takeaway-label>What I learned</strong>
              <p data-conn-takeaway-text></p>
            </div>
          </div>

          <div class="conn-contrib-section">
            <h5 class="conn-sub-heading">Key contributions</h5>
            <ul class="conn-contrib-list" data-conn-contribs></ul>
          </div>

          <div class="conn-meta-grid">
            <div class="conn-timeframe-col">
              <span class="conn-meta-label">Timeframe</span>
              <strong class="conn-meta-years" data-conn-years></strong>
              <span class="conn-meta-org" data-conn-org></span>
              <span class="conn-meta-sub" data-conn-org-sub></span>
            </div>
            <div class="conn-impact-col">
              <span class="conn-meta-label">Impact</span>
              <ul class="conn-impact-list" data-conn-impacts></ul>
            </div>
          </div>

          <div class="conn-tech-section">
            <h5 class="conn-sub-heading">Technologies &amp; Standards</h5>
            <div data-conn-tech></div>
          </div>
        </aside>
      `;

      // Wrap .career-introduction and .connections-workbench inside a single sticky viewport container inside .career-scroll-stage
      const stickyViewport = document.createElement("div");
      stickyViewport.className = "conn-sticky-viewport";
      scrollStage.insertBefore(stickyViewport, introBar);
      stickyViewport.append(introBar, workbench);
      journeySection.classList.add("has-connections-workbench");

      let activeConnStageIdx = 0;
      let activeConnPartIdx = CONNECTIONS_STAGES[0].defaultCalloutIdx || 0;
      let pinnedScrollStage = null;
      let pinStageTimer = null;

      const topPillBtns = Array.from(topTabs.querySelectorAll("[data-conn-stage]"));
      const railCardBtns = Array.from(workbench.querySelectorAll("[data-conn-rail]"));
      const railFillEl = workbench.querySelector("[data-conn-rail-fill]");
      const centerAnimEl = workbench.querySelector("[data-conn-center-anim]");
      const inspAnimEl = workbench.querySelector("[data-conn-insp-anim]");
      const kickerEl = workbench.querySelector("[data-conn-kicker]");
      const headlineEl = workbench.querySelector("[data-conn-headline]");
      const subtitleEl = workbench.querySelector("[data-conn-subtitle]");
      const canvasEl = workbench.querySelector("[data-conn-canvas]");
      const stageImgEl = workbench.querySelector("[data-conn-img]");
      const ghostAboveEl = workbench.querySelector("[data-conn-ghost-above]");
      const ghostAboveImgEl = workbench.querySelector("[data-conn-ghost-above-img]");
      const ghostBelowEl = workbench.querySelector("[data-conn-ghost-below]");
      const ghostBelowImgEl = workbench.querySelector("[data-conn-ghost-below-img]");
      const fxSvgEl = workbench.querySelector("[data-conn-fx-svg]");
      const svgEl = workbench.querySelector("[data-conn-svg]");
      const calloutsEl = workbench.querySelector("[data-conn-callouts]");
      const relatedEl = workbench.querySelector("[data-conn-related]");

      const partCodeEl = workbench.querySelector("[data-conn-part-code]");
      const partCountEl = workbench.querySelector("[data-conn-part-count]");
      const partTitleEl = workbench.querySelector("[data-conn-part-title]");
      const partDescEl = workbench.querySelector("[data-conn-part-desc]");
      const takeawayIconEl = workbench.querySelector("[data-conn-takeaway-icon]");
      const takeawayLabelEl = workbench.querySelector("[data-conn-takeaway-label]");
      const takeawayTextEl = workbench.querySelector("[data-conn-takeaway-text]");
      const contribsEl = workbench.querySelector("[data-conn-contribs]");
      const yearsEl = workbench.querySelector("[data-conn-years]");
      const orgEl = workbench.querySelector("[data-conn-org]");
      const orgSubEl = workbench.querySelector("[data-conn-org-sub]");
      const impactsEl = workbench.querySelector("[data-conn-impacts]");
      const techEl = workbench.querySelector("[data-conn-tech]");

      const BULB_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2Z"/></svg>`;
      const GEAR_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>`;

      function renderIsoFxSvg(stage, activePart) {
        if (!fxSvgEl) return;
        const accent = stage.isoAccent || "#0755ff";
        const secondary = stage.isoSecondary || "#00c3ff";
        const coreX = stage.isoCoreX || 498;
        const coreBaseY = stage.isoCoreBaseY || 320;
        const tracesHtml = (stage.isoTraces || []).map((d, i) => `
          <path class="conn-iso-trace-base" d="${d}" stroke="${accent}" />
          <path class="conn-iso-trace-packet" d="${d}" stroke="${i % 2 === 0 ? secondary : accent}" style="animation-delay:${(i * -0.85).toFixed(2)}s;" />
        `).join("");

        // Upper core continuation + ghosted upper platform silhouette (feathered so it never hard-cuts at the top)
        const upperTowerGhostHtml = `
          <g class="conn-iso-ghost-upper" opacity="0.78">
            <path d="M 500,136 L 692,42 L 500,-38 L 308,42 Z" fill="url(#connGhostUpperPlate)" stroke="url(#connGhostUpperStroke)" stroke-width="1.6" stroke-dasharray="6 5" />
            <path d="M 308,42 L 308,54 L 500,148 L 692,54 L 692,42" fill="none" stroke="url(#connGhostUpperStroke)" stroke-width="2.2" />
            <rect x="${coreX - 18}" y="-28" width="36" height="${coreBaseY + 28}" fill="url(#connUpperCoreShaft)" />
            <line class="conn-iso-core-glow" x1="${coreX}" y1="${coreBaseY}" x2="${coreX}" y2="-24" stroke="url(#connUpperCoreLine)" />
            <line class="conn-iso-core-stream" x1="${coreX}" y1="${coreBaseY}" x2="${coreX}" y2="-24" stroke="url(#connUpperCoreLine)" />
            <ellipse class="conn-iso-core-ring" cx="${coreX}" cy="${coreBaseY}" rx="28" ry="14" stroke="${secondary}" />
            <ellipse class="conn-iso-core-ring" cx="${coreX}" cy="76" rx="22" ry="11" stroke="${secondary}" opacity="0.45" />
          </g>
        `;

        // Lower core continuation + ghosted lower platform silhouette below the active platform
        const lowerTowerGhostHtml = `
          <g class="conn-iso-ghost-lower" opacity="0.88">
            <path d="M 500,664 L 734,544 L 500,446 L 266,544 Z" fill="url(#connGhostLowerPlate)" stroke="url(#connGhostLowerStroke)" stroke-width="1.8" stroke-dasharray="7 5" />
            <path d="M 266,544 L 266,558 L 500,678 L 734,558 L 734,544" fill="none" stroke="url(#connGhostLowerStroke)" stroke-width="2.5" />
            <rect x="${coreX - 19}" y="510" width="38" height="165" fill="url(#connLowerCoreShaft)" />
            <line class="conn-iso-core-glow" x1="${coreX}" y1="670" x2="${coreX}" y2="510" stroke="url(#connLowerCoreLine)" />
            <line class="conn-iso-core-stream" x1="${coreX}" y1="670" x2="${coreX}" y2="510" stroke="url(#connLowerCoreLine)" />
            <ellipse class="conn-iso-core-ring" cx="${coreX}" cy="524" rx="24" ry="12" stroke="${secondary}" opacity="0.55" />
            <ellipse class="conn-iso-core-ring" cx="${coreX}" cy="596" rx="30" ry="15" stroke="${accent}" opacity="0.42" />
          </g>
        `;

        const coreOrGrowthHtml = stage.isoGrowthArrowPath
          ? `
            ${lowerTowerGhostHtml}
            <path class="conn-iso-growth-glow" d="${stage.isoGrowthArrowPath}" stroke="${accent}" />
            <path class="conn-iso-growth-pulse" d="${stage.isoGrowthArrowPath}" stroke="#ffffff" />
          `
          : `
            ${upperTowerGhostHtml}
            ${lowerTowerGhostHtml}
          `;

        const nodesHtml = stage.callouts.map((c, idx) => {
          const isCur = idx === activeConnPartIdx;
          return `
            <g class="conn-iso-node ${isCur ? "is-active" : ""}" data-conn-fx-node="${idx}">
              <ellipse class="conn-iso-node-base" cx="${c.pinX}" cy="${c.pinY}" rx="${isCur ? 22 : 11}" ry="${isCur ? 12 : 6}" stroke="${isCur ? accent : secondary}" />
              ${isCur ? `
                <ellipse class="conn-iso-radar-wave" cx="${c.pinX}" cy="${c.pinY}" rx="28" ry="15" stroke="${accent}" />
                <ellipse class="conn-iso-radar-wave conn-iso-radar-wave--delayed" cx="${c.pinX}" cy="${c.pinY}" rx="28" ry="15" stroke="${secondary}" />
                <line class="conn-iso-pin-beam" x1="${c.pinX}" y1="${c.pinY}" x2="${c.pinX}" y2="${Math.max(24, c.pinY - 52)}" stroke="${accent}" />
              ` : ""}
            </g>
          `;
        }).join("");

        fxSvgEl.innerHTML = `
          <defs>
            <filter id="connIsoGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="connUpperCoreShaft" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stop-color="${secondary}" stop-opacity="0.28" />
              <stop offset="65%" stop-color="${accent}" stop-opacity="0.14" />
              <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="connUpperCoreLine" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
              <stop offset="70%" stop-color="${secondary}" stop-opacity="0.55" />
              <stop offset="100%" stop-color="${secondary}" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="connGhostUpperPlate" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stop-color="${accent}" stop-opacity="0.09" />
              <stop offset="100%" stop-color="${secondary}" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="connGhostUpperStroke" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stop-color="${secondary}" stop-opacity="0.45" />
              <stop offset="75%" stop-color="${accent}" stop-opacity="0.18" />
              <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="connLowerCoreShaft" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${secondary}" stop-opacity="0.34" />
              <stop offset="65%" stop-color="${accent}" stop-opacity="0.16" />
              <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="connLowerCoreLine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
              <stop offset="68%" stop-color="${secondary}" stop-opacity="0.6" />
              <stop offset="100%" stop-color="${secondary}" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="connGhostLowerPlate" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${accent}" stop-opacity="0.11" />
              <stop offset="100%" stop-color="${secondary}" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="connGhostLowerStroke" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${secondary}" stop-opacity="0.52" />
              <stop offset="72%" stop-color="${accent}" stop-opacity="0.22" />
              <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
            </linearGradient>
          </defs>
          <g filter="url(#connIsoGlow)">
            ${tracesHtml}
            ${coreOrGrowthHtml}
            ${nodesHtml}
          </g>
        `;
      }

      function updateLeaderLinesGeometry() {
        if (!canvasEl || !svgEl || !calloutsEl) return;
        const stage = CONNECTIONS_STAGES[activeConnStageIdx] || CONNECTIONS_STAGES[0];
        const canvasRect = canvasEl.getBoundingClientRect();
        if (canvasRect.width < 40 || canvasRect.height < 40) return;

        const cards = Array.from(calloutsEl.querySelectorAll("[data-conn-callout]"));
        cards.forEach((cardEl, idx) => {
          const c = stage.callouts[idx];
          const groupEl = svgEl.querySelector(`[data-conn-leader="${idx}"]`);
          if (!c || !groupEl) return;

          const r = cardEl.getBoundingClientRect();
          const leftSvg = ((r.left - canvasRect.left) / canvasRect.width) * 1000;
          const rightSvg = ((r.right - canvasRect.left) / canvasRect.width) * 1000;
          const topSvg = ((r.top - canvasRect.top) / canvasRect.height) * 660;
          const bottomSvg = ((r.bottom - canvasRect.top) / canvasRect.height) * 660;
          const midX = (leftSvg + rightSvg) * 0.5;
          const midY = (topSvg + bottomSvg) * 0.5;

          let sx = midX;
          let sy = midY;
          let elbowX = midX;
          let elbowY = midY;

          if (midX < 360) {
            sx = Math.round(rightSvg);
            sy = Math.round(midY);
            elbowX = Math.round(sx + Math.max(18, (c.pinX - sx) * 0.36));
            elbowY = sy;
          } else if (midX > 640) {
            sx = Math.round(leftSvg);
            sy = Math.round(midY);
            elbowX = Math.round(sx - Math.max(18, (sx - c.pinX) * 0.36));
            elbowY = sy;
          } else if (midY < 330) {
            sx = Math.round(midX);
            sy = Math.round(bottomSvg);
            elbowX = sx;
            elbowY = Math.round(sy + Math.max(16, (c.pinY - sy) * 0.42));
          } else {
            sx = Math.round(midX);
            sy = Math.round(topSvg);
            elbowX = sx;
            elbowY = Math.round(sy - Math.max(16, (sy - c.pinY) * 0.42));
          }

          const pts = `${sx},${sy} ${elbowX},${elbowY} ${c.pinX},${c.pinY}`;
          const pathD = `M ${sx},${sy} L ${elbowX},${elbowY} L ${c.pinX},${c.pinY}`;

          const lineEl = groupEl.querySelector(".conn-leader-line");
          const pulseEl = groupEl.querySelector(".conn-leader-pulse");
          const startEl = groupEl.querySelector(".conn-leader-start");
          if (lineEl) lineEl.setAttribute("points", pts);
          if (pulseEl) pulseEl.setAttribute("d", pathD);
          if (startEl) {
            startEl.setAttribute("cx", String(sx));
            startEl.setAttribute("cy", String(sy));
          }
        });
      }

      function renderConnectionsWorkbench(stageChanged, slideDirection = 1) {
        const stage = CONNECTIONS_STAGES[activeConnStageIdx] || CONNECTIONS_STAGES[0];
        const part = stage.callouts[activeConnPartIdx] || stage.callouts[0];
        const aboveStage = CONNECTIONS_STAGES[activeConnStageIdx < CONNECTIONS_STAGES.length - 1 ? activeConnStageIdx + 1 : activeConnStageIdx - 1] || CONNECTIONS_STAGES[0];
        const belowStage = CONNECTIONS_STAGES[activeConnStageIdx > 0 ? activeConnStageIdx - 1 : 1] || CONNECTIONS_STAGES[0];

        topPillBtns.forEach((btn, i) => {
          const isCur = i === activeConnStageIdx;
          btn.classList.toggle("is-active", isCur);
          btn.setAttribute("aria-selected", isCur ? "true" : "false");
        });

        railCardBtns.forEach((btn, i) => {
          const isCur = i === activeConnStageIdx;
          const isReached = i <= activeConnStageIdx;
          btn.classList.toggle("is-active", isCur);
          btn.classList.toggle("is-reached", isReached);
          btn.setAttribute("aria-current", isCur ? "step" : "false");
        });

        if (stageChanged) {
          if (centerAnimEl && inspAnimEl) {
            centerAnimEl.classList.remove("conn-slide-in-up", "conn-slide-in-down");
            inspAnimEl.classList.remove("conn-slide-in-up", "conn-slide-in-down");
            void centerAnimEl.offsetWidth;
            const animClass = slideDirection >= 0 ? "conn-slide-in-up" : "conn-slide-in-down";
            centerAnimEl.classList.add(animClass);
            inspAnimEl.classList.add(animClass);
          }

          if (kickerEl) kickerEl.textContent = stage.kicker;
          if (headlineEl) headlineEl.textContent = stage.headline;
          if (subtitleEl) subtitleEl.textContent = stage.subtitle;
          if (stageImgEl) {
            stageImgEl.setAttribute("src", stage.image);
            stageImgEl.setAttribute("alt", `${stage.pillLabel} — ${stage.headline}`);
          }
          if (ghostAboveImgEl && aboveStage) {
            ghostAboveImgEl.setAttribute("src", aboveStage.image);
          }
          if (ghostBelowImgEl && belowStage) {
            ghostBelowImgEl.setAttribute("src", belowStage.image);
          }
          if (ghostAboveEl) {
            ghostAboveEl.classList.toggle("is-apex-stage", activeConnStageIdx === CONNECTIONS_STAGES.length - 1);
          }

          if (svgEl) {
            svgEl.innerHTML = stage.callouts.map((c, idx) => {
              const firstPt = (c.linePoints || "").split(" ")[0] || `${c.pinX},${c.pinY}`;
              const [sx, sy] = firstPt.split(",");
              const d = "M " + (c.linePoints || `${c.pinX},${c.pinY}`).split(" ").join(" L ");
              return `
                <g class="conn-leader-group ${idx === activeConnPartIdx ? "is-active" : ""}" data-conn-leader="${idx}">
                  <polyline class="conn-leader-line" points="${c.linePoints}" />
                  <path class="conn-leader-pulse" d="${d}" style="animation-delay:${(idx * -0.45).toFixed(2)}s;" />
                  <circle class="conn-leader-start" cx="${sx}" cy="${sy}" r="3.2" />
                  <circle class="conn-leader-ring" cx="${c.pinX}" cy="${c.pinY}" r="9" />
                  <circle class="conn-leader-dot" cx="${c.pinX}" cy="${c.pinY}" r="4.2" />
                </g>
              `;
            }).join("");
          }

          if (calloutsEl) {
            calloutsEl.innerHTML = stage.callouts.map((c, idx) => `
              <button type="button" class="conn-callout-card ${idx === activeConnPartIdx ? "is-active" : ""}" data-conn-callout="${idx}" style="${c.posStyle}">
                <span class="conn-callout-icon" aria-hidden="true">${CALLOUT_ICONS[c.icon] || CALLOUT_ICONS.motherboard}</span>
                <span class="conn-callout-text">
                  <strong>${c.cardTitle}</strong>
                  <span>${c.cardSub}</span>
                </span>
              </button>
            `).join("");

            calloutsEl.querySelectorAll("[data-conn-callout]").forEach(btn => {
              const cIdx = parseInt(btn.getAttribute("data-conn-callout") || "0", 10);
              btn.addEventListener("pointerenter", () => {
                activeConnPartIdx = cIdx;
                renderConnectionsWorkbench(false);
              });
              btn.addEventListener("click", () => {
                activeConnPartIdx = cIdx;
                renderConnectionsWorkbench(false);
              });
            });
          }

          renderIsoFxSvg(stage, part);
          window.requestAnimationFrame(updateLeaderLinesGeometry);

          if (relatedEl) {
            relatedEl.innerHTML = stage.relatedProjects.map(rp => `
              <a class="conn-related-card" href="${rp.href}">
                <div class="conn-related-thumb">
                  <img src="${rp.thumb}" alt="" style="object-position:${rp.thumbPos || "50% 50%"};" loading="lazy">
                </div>
                <div class="conn-related-body">
                  <strong class="conn-related-title">${rp.title}</strong>
                  <span class="conn-related-desc">${rp.desc}</span>
                  <span class="conn-related-link">View details <span aria-hidden="true">&rarr;</span></span>
                </div>
              </a>
            `).join("");
          }

          if (takeawayIconEl) {
            takeawayIconEl.innerHTML = stage.takeawayIcon === "gear" ? GEAR_SVG : BULB_SVG;
          }
          if (takeawayLabelEl) takeawayLabelEl.textContent = stage.takeawayLabel;
          if (takeawayTextEl) takeawayTextEl.textContent = stage.takeawayText;

          if (contribsEl) {
            contribsEl.innerHTML = stage.contributions.map(item => `
              <li>
                <span class="conn-check-icon" aria-hidden="true">
                  <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7.5" fill="#0755ff"/><path d="m4.8 8.2 2.1 2.2 4.4-4.6" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </span>
                <span>${item}</span>
              </li>
            `).join("");
          }

          if (yearsEl) yearsEl.textContent = stage.timeframe.years;
          if (orgEl) orgEl.textContent = stage.timeframe.org;
          if (orgSubEl) orgSubEl.textContent = stage.timeframe.sub;

          if (impactsEl) {
            impactsEl.innerHTML = stage.impact.map(imp => {
              const iconSvg = IMPACT_ICONS[imp.icon] || IMPACT_ICONS.up;
              return `
                <li>
                  <span class="conn-impact-icon" aria-hidden="true">${iconSvg}</span>
                  <span>${imp.text}</span>
                </li>
              `;
            }).join("");
          }

          if (techEl) {
            techEl.innerHTML = renderBadgeStripHtml(stage.techBadges, "conn-tech-badges");
          }
        } else {
          svgEl?.querySelectorAll("[data-conn-leader]").forEach((g, idx) => {
            g.classList.toggle("is-active", idx === activeConnPartIdx);
          });
          calloutsEl?.querySelectorAll("[data-conn-callout]").forEach((b, idx) => {
            b.classList.toggle("is-active", idx === activeConnPartIdx);
          });
          renderIsoFxSvg(stage, part);
          updateLeaderLinesGeometry();
        }

        if (partCodeEl) partCodeEl.textContent = part.code;
        if (partCountEl) partCountEl.textContent = `${activeConnPartIdx + 1} / ${stage.callouts.length}`;
        if (partTitleEl) partTitleEl.textContent = part.inspectorTitle;
        if (partDescEl) partDescEl.textContent = part.inspectorDesc;
      }

      window.addEventListener("resize", () => {
        window.requestAnimationFrame(updateLeaderLinesGeometry);
      }, { passive: true });

      // Gentle auto-cycle of active component highlight when user isn't hovering
      let isHoveringWorkbench = false;
      workbench.addEventListener("pointerenter", () => { isHoveringWorkbench = true; });
      workbench.addEventListener("pointerleave", () => { isHoveringWorkbench = false; });
      setInterval(() => {
        if (isHoveringWorkbench || document.hidden) return;
        const rect = workbench.getBoundingClientRect();
        if (rect.bottom < 120 || rect.top > window.innerHeight - 120) return;
        const stage = CONNECTIONS_STAGES[activeConnStageIdx] || CONNECTIONS_STAGES[0];
        activeConnPartIdx = (activeConnPartIdx + 1) % stage.callouts.length;
        renderConnectionsWorkbench(false);
      }, 3800);

      function scrollToStagePosition(stageIdx) {
        if (window.innerWidth <= 768) return;
        const stageRect = scrollStage.getBoundingClientRect();
        const stickyTop = 68;
        const viewportAvail = Math.max(420, window.innerHeight - stickyTop);
        const span = Math.max(1, stageRect.height - viewportAvail);
        const targetProgress = (stageIdx + 0.35) / CONNECTIONS_STAGES.length;
        const targetScrollY = window.scrollY + stageRect.top - stickyTop + (targetProgress * span);
        window.scrollTo({ top: targetScrollY, behavior: "smooth" });
      }

      function selectConnStage(nextStageIdx, opts = {}) {
        const clamped = (nextStageIdx + CONNECTIONS_STAGES.length) % CONNECTIONS_STAGES.length;
        const dir = clamped >= activeConnStageIdx ? 1 : -1;
        const changed = clamped !== activeConnStageIdx;
        activeConnStageIdx = clamped;
        activeConnPartIdx = CONNECTIONS_STAGES[activeConnStageIdx].defaultCalloutIdx || 0;

        if (opts.fromUserClick) {
          pinnedScrollStage = clamped;
          if (pinStageTimer) clearTimeout(pinStageTimer);
          pinStageTimer = setTimeout(() => {
            pinnedScrollStage = null;
          }, 850);
          if (opts.scroll) {
            scrollToStagePosition(clamped);
          }
        }

        if (railFillEl) {
          const pct = (clamped / Math.max(1, CONNECTIONS_STAGES.length - 1)) * 100;
          railFillEl.style.width = `${pct.toFixed(1)}%`;
          railFillEl.style.height = "100%";
        }

        renderConnectionsWorkbench(changed || opts.forceRender, dir);
      }

      // Scroll-Driven Slideshow Sync with .career-scroll-stage
      let scrollTicking = false;
      function updateFromScroll() {
        scrollTicking = false;
        if (window.innerWidth <= 768) return;
        const stageRect = scrollStage.getBoundingClientRect();
        const stickyTop = 68;
        const viewportAvail = Math.max(420, window.innerHeight - stickyTop);
        const span = Math.max(1, stageRect.height - viewportAvail);
        const rawProgress = Math.max(0, Math.min(1, (stickyTop - stageRect.top) / span));

        if (railFillEl && pinnedScrollStage === null) {
          railFillEl.style.width = `${(rawProgress * 100).toFixed(1)}%`;
          railFillEl.style.height = "100%";
        }

        if (pinnedScrollStage !== null) return;

        const scaled = rawProgress * CONNECTIONS_STAGES.length;
        const candidate = Math.min(CONNECTIONS_STAGES.length - 1, Math.floor(scaled));
        if (candidate !== activeConnStageIdx) {
          const boundary = candidate > activeConnStageIdx ? candidate : activeConnStageIdx;
          if (Math.abs(scaled - boundary) >= 0.04 || rawProgress <= 0.01 || rawProgress >= 0.99) {
            const dir = candidate >= activeConnStageIdx ? 1 : -1;
            activeConnStageIdx = candidate;
            activeConnPartIdx = CONNECTIONS_STAGES[activeConnStageIdx].defaultCalloutIdx || 0;
            renderConnectionsWorkbench(true, dir);
          }
        }
      }

      window.addEventListener("scroll", () => {
        if (!scrollTicking) {
          scrollTicking = true;
          window.requestAnimationFrame(updateFromScroll);
        }
      }, { passive: true });

      syncConnectionsStage = function (idx) {
        selectConnStage(idx, { fromUserClick: true, scroll: false, forceRender: true });
      };

      topPillBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          const sIdx = parseInt(btn.getAttribute("data-conn-stage") || "0", 10);
          selectConnStage(sIdx, { fromUserClick: true, scroll: true });
        });
      });

      railCardBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          const sIdx = parseInt(btn.getAttribute("data-conn-rail") || "0", 10);
          selectConnStage(sIdx, { fromUserClick: true, scroll: true });
        });
      });

      workbench.querySelectorAll("[data-conn-step]").forEach(btn => {
        btn.addEventListener("click", () => {
          const delta = parseInt(btn.getAttribute("data-conn-step") || "1", 10);
          selectConnStage(activeConnStageIdx + delta, { fromUserClick: true, scroll: true });
        });
      });

      workbench.querySelectorAll("[data-conn-part-step]").forEach(btn => {
        btn.addEventListener("click", () => {
          const stage = CONNECTIONS_STAGES[activeConnStageIdx] || CONNECTIONS_STAGES[0];
          const delta = parseInt(btn.getAttribute("data-conn-part-step") || "1", 10);
          activeConnPartIdx = (activeConnPartIdx + delta + stage.callouts.length) % stage.callouts.length;
          renderConnectionsWorkbench(false);
        });
      });

      renderConnectionsWorkbench(true, 1);
      updateFromScroll();
    }

    const PROJECT_TECH_BADGES = Object.freeze({
      dell: [
        { icon: "hardware", label: "Latitude & OptiPlex" },
        { icon: "windows", label: "Windows OS" },
        { icon: "power", label: "PSU & Hardware Diagnostics" }
      ],
      foundations: [
        { icon: "windows", label: "Windows SBS / Server" },
        { icon: "ad", label: "Active Directory & GPO" },
        { icon: "exchange", label: "Exchange Server" },
        { icon: "bes", label: "BlackBerry BES" },
        { icon: "network", label: "Firewalls & Switches" }
      ],
      headquarters: [
        { icon: "vmware", label: "VMware ESXi" },
        { icon: "network", label: "Cat6A / PoE / VLAN" },
        { icon: "power", label: "UPS & Standby Generator" },
        { icon: "csio", label: "AV & Door Security" }
      ],
      inquiry: [
        { icon: "xml", label: "XML" },
        { icon: "soap", label: "SOAP" },
        { icon: "rest", label: "REST API" },
        { icon: "csio", label: "CSIO / ACORD" },
        { icon: "al3", label: "PDF / eDocs" }
      ],
      newbusiness: [
        { icon: "rules", label: "P&C Rating & Underwriting Rules" },
        { icon: "xml", label: "XML Payloads" },
        { icon: "bms", label: "Broker Portal Messaging" }
      ],
      workflows: [
        { icon: "xml", label: "XML" },
        { icon: "soap", label: "SOAP" },
        { icon: "rest", label: "REST" },
        { icon: "csio", label: "CSIO / ACORD" },
        { icon: "al3", label: "AL3 & eDocs" },
        { icon: "bms", label: "TAM & Epic (Bravado)" },
        { icon: "rules", label: "Commercial Quoting Rules" }
      ],
      changes: [
        { icon: "rules", label: "Endorsement & Validation Rules" },
        { icon: "xml", label: "XML" },
        { icon: "csio", label: "CSIO / ACORD Mappings" }
      ],
      renewals: [
        { icon: "rules", label: "Renewal Eligibility Rules (~80% / ~60% / ~40%)" },
        { icon: "bms", label: "Exception Referral Routing" }
      ],
      upload: [
        { icon: "csharp", label: "C#" },
        { icon: "dotnet", label: ".NET" },
        { icon: "rest", label: "REST API" },
        { icon: "js", label: "JavaScript" },
        { icon: "web", label: "Bootstrap / HTML5 / CSS3" }
      ],
      claims: [
        { icon: "rest", label: "REST API Retrieval" },
        { icon: "sql", label: "Scheduled Event Table" },
        { icon: "csio", label: "ProviderRegistry Mappings" }
      ],
      takeover: [
        { icon: "xml", label: "XML Schema (XSD)" },
        { icon: "excel", label: "Excel Validation Template" },
        { icon: "vb", label: "VB Script" },
        { icon: "recon", label: "Batch Load Reconciliation" }
      ],
      continuity: [
        { icon: "rest", label: "REST Export Design" },
        { icon: "etl", label: "COBOL / InterBlue Flat-File ETL" },
        { icon: "cognos", label: "IBM Cognos (Downstream)" },
        { icon: "powerbi", label: "Power BI (Proposal)" }
      ],
      sql: [
        { icon: "sql", label: "Hand-Written SQL" },
        { icon: "recon", label: "Financial & Claims Reconciliation" },
        { icon: "cognos", label: "Report Logic Analysis" }
      ],
      nexus: [
        { icon: "ts", label: "TypeScript" },
        { icon: "react", label: "React / Vite" },
        { icon: "node", label: "Node.js" },
        { icon: "postgres", label: "PostgreSQL" },
        { icon: "redis", label: "Redis" },
        { icon: "openapi", label: "OpenAPI & WebSockets" }
      ]
    });

    // 4. Unified 16-Project Catalog for Home Featured Section, Projects Explorer (#projects) & Detail Workbench (#projects/<slug>)
    const PROJECTS_CATALOG = Object.freeze([
      {
        slug: "renewals",
        title: "Renewal Eligibility & Underwriting Automation",
        shortTitle: "Renewal Eligibility & Underwriting Automation",
        badgeType: "PROFESSIONAL",
        detailBadge: "PROFESSIONAL WORK",
        org: "Grenville",
        period: "Within Grenville tenure (2009–2022)",
        sidebarSub: "Grenville · 2009 – 2022",
        banner: "assets/proj-banner-renewals.jpg",
        shortDesc: "Designed and implemented automated renewal workflows with business rules, validation and exception routing for P&C lines.",
        heroDesc: "Designed and implemented automated renewal workflows with business rules, validation and exception handling across residential, commercial and farm/agri lines.",
        featured: true,
        featuredOrder: 1,
        status: "Implemented",
        chapterLabel: "Shaped by the business",
        impactScore: 100,
        complexityScore: 96,
        yearSort: 2020,
        categories: ["professional", "insurance", "ai"],
        cardTags: ["Insurance", "Underwriting", "Business Rules", "Automation"],
        heroTags: ["Insurance", "Underwriting", "Business Rules", "Automation", "Integration"],
        allTags: ["AI", "Insurance", "SQL", "Integration", "Automation", "Business Rules", "Underwriting"],
        metrics: [
          { val: "~80%", label: "Residential" },
          { val: "~60%", label: "Commercial" },
          { val: "~40%", label: "Farm / Agri" }
        ],
        metricsNote: "Approximate firsthand-reported renewal automation rates; complex cases continued to route to underwriters.",
        glance: {
          employer: "Grenville Mutual Insurance",
          period: "Within Grenville tenure (2009–2022)",
          domain: "P&C Insurance · Personal, Commercial & Farm Renewals",
          previewDomain: "P&C Insurance · Underwriting · Renewals",
          role: "Analysis · Rule Design · Implementation · Support",
          previewRole: "Analysis, rule design, implementation and ongoing support",
          team: "Business analysts · Underwriters · Developers · QA",
          technologies: "Business rules · Validation · Integration · SQL · APIs",
          outcome: "Automated standard renewals with explicit underwriter exception routing",
          previewOutcome: "Approximate firsthand-reported renewal automation (~80% res, ~60% comm, ~40% farm) with human review for exceptions."
        },
        problem: "Renewal processes were manual, inconsistent and time-consuming. Underwriters spent significant time reviewing standard low-risk renewals, while complex exceptions needed clearer routing criteria across residential, commercial and farm/agri lines.",
        previewProblem: "Manual renewal review consumed underwriter capacity on standard risks across P&C lines.",
        solution: "Designed and implemented automated renewal eligibility workflows using business rules, validation and core-system integration. Eligible standard policies renewed automatically while exceptions routed to underwriters with clear reasons.",
        previewSolution: "Implemented line-specific renewal eligibility rules with explicit exception referral to human underwriters.",
        contribution: "Personally designed the renewal eligibility framework and implemented rating and underwriting rules across residential, commercial and farm/agri lines, defining clear referral gates for human review.",
        lessons: "Automating insurance decisions succeeds when the boundary between straight-through eligibility and human judgment is explicit, inspectable and tailored to each line of business.",
        keyResultsMetrics: [
          { val: "~80%", text: "Residential renewals automated (user-reported)" },
          { val: "~60%", text: "Commercial renewals automated (user-reported)" },
          { val: "~40%", text: "Farm / Agri renewals automated (user-reported)" }
        ],
        keyResultsChecks: [
          "Approximate firsthand-reported renewal-only automation rates",
          "Consistent rule evaluation across P&C lines",
          "Explicit exception routing so complex cases reached underwriters"
        ],
        techStackTiles: [
          { icon: "sql", label: "SQL" },
          { icon: "rulesEngine", label: "Business Rules Engine" },
          { icon: "apis", label: "Integration (APIs)" },
          { icon: "validation", label: "Data Validation" },
          { icon: "reporting", label: "Reporting (Cognos)" }
        ],
        relatedSlugs: ["newbusiness", "changes"],
        timeline: [
          { years: "Phase 1", text: "Requirements and line-of-business analysis", theme: "green" },
          { years: "Phase 2", text: "Eligibility rule design and implementation", theme: "teal" },
          { years: "Phase 3", text: "Line tuning and ongoing operational support", theme: "blue" }
        ],
        floatingHeroCard: {
          title: "Conceptual Illustration · Renewal Gate",
          status: "Eligible for Auto-Renewal",
          rows: [
            { label: "Risk Profile", val: "Standard" },
            { label: "Property Data", val: "Verified" },
            { label: "Claims History", val: "Clear" },
            { label: "Exception Check", val: "Passed" }
          ],
          cta: "Auto-Renew or Refer →"
        }
      },
      {
        slug: "newbusiness",
        title: "Broker-Native New Business Integration",
        shortTitle: "Broker-Native New Business Integration",
        badgeType: "PROFESSIONAL",
        detailBadge: "PROFESSIONAL WORK",
        org: "Grenville",
        period: "Within Grenville tenure (2009–2022)",
        sidebarSub: "Grenville · 2009 – 2022",
        banner: "assets/proj-banner-newbusiness.jpg",
        shortDesc: "Connected broker workflows to insurance rules, validation, referral and binding decisions.",
        heroDesc: "Connected broker portal and desktop workflows to P&C rating, underwriting validation, referral routing and binding decisions.",
        featured: true,
        featuredOrder: 2,
        status: "Implemented",
        chapterLabel: "Shaped by the business",
        impactScore: 95,
        complexityScore: 92,
        yearSort: 2019,
        categories: ["professional", "insurance", "data"],
        cardTags: ["Integration", "Business Rules", "Solution Design"],
        heroTags: ["Integration", "Business Rules", "Solution Design", "Underwriting", "SOAP / REST"],
        allTags: ["Insurance", "Integration", "Automation", "Business Rules"],
        metrics: [],
        glance: {
          employer: "Grenville Mutual Insurance",
          period: "Within Grenville tenure (2009–2022)",
          domain: "P&C Insurance · Broker New Business",
          previewDomain: "P&C Insurance · Broker New Business",
          role: "Requirements · Field Mapping · Rules Implementation",
          previewRole: "Requirements, field/value mapping, UI specifications and rules implementation",
          team: "Business analysts · Broker/portal vendors · Developers · Underwriters",
          technologies: "CSIO / ACORD XML · SOAP / REST · Rules Engine · Broker Portal",
          outcome: "Actionable correction, referral and bind decisions in broker workflows",
          previewOutcome: "Connected broker inputs to validation, referral and binding decisions."
        },
        problem: "A new-business workflow cannot rate or underwrite a risk properly if the broker interface fails to collect required risk inputs. Submissions arrived with missing or mismatched fields across broker-management systems.",
        previewProblem: "Broker submissions lacked required risk inputs or failed validation across system boundaries.",
        solution: "Defined requirements and field/value mappings, personally implemented P&C rating and underwriting rules, and helped shape the rules-to-portal messaging framework for correction, referral or binding alongside vendor/developer UI implementation.",
        previewSolution: "Connected broker inputs and CSIO/XML payloads to rating/underwriting rules and actionable portal messages.",
        contribution: "Defined business requirements, field/value mappings and UI specifications, personally implemented rating and underwriting rules, and diagnosed SOAP/XML and REST broker payloads while vendors/developers implemented portal UI code.",
        lessons: "Effective integration is more than transport—it requires preserving business meaning across the interface so users know exactly what to fix or when a risk needs underwriter review.",
        keyResultsMetrics: [
          { val: "2-Way", text: "Upload & download payload mapping" },
          { val: "3-Path", text: "Self-correct, refer or bind responses" }
        ],
        keyResultsChecks: [
          "Captured required auto & residential risk inputs upfront",
          "Aligned CSIO/ACORD payloads with backend policy fields",
          "Separated new-business rules cleanly from renewals & endorsements"
        ],
        techStackTiles: [
          { icon: "rulesEngine", label: "Business Rules Engine" },
          { icon: "apis", label: "SOAP / REST APIs" },
          { icon: "validation", label: "CSIO / XML Validation" },
          { icon: "sql", label: "Policy Data Mapping" },
          { icon: "reporting", label: "Broker Portal Specs" }
        ],
        relatedSlugs: ["renewals", "workflows"],
        timeline: [
          { years: "Phase 1", text: "Auto & residential rule design", theme: "green" },
          { years: "Phase 2", text: "Broker portal & BMS payload mapping", theme: "teal" },
          { years: "Phase 3", text: "REST backend transition & refinement", theme: "blue" }
        ]
      },
      {
        slug: "takeover",
        title: "Takeover-History Validation and XML Loading",
        shortTitle: "Takeover-History XML Loading",
        badgeType: "PROFESSIONAL",
        detailBadge: "PROFESSIONAL WORK",
        org: "Medavie",
        period: "2022 – Present",
        sidebarSub: "Medavie · 2022 – Present",
        banner: "assets/proj-banner-takeover.jpg",
        shortDesc: "Researched, documented and guided Excel/VB/XML tooling for validation, transformation, batch loading and reconciliation.",
        heroDesc: "Researched, documented and guided production-adopted Excel/VB/XML tooling to transform inconsistent takeover claims history into validated adjudication XML.",
        featured: true,
        featuredOrder: 3,
        status: "Production tool",
        chapterLabel: "Shaped by the business",
        impactScore: 94,
        complexityScore: 90,
        yearSort: 2023,
        categories: ["professional", "insurance", "data", "tools"],
        cardTags: ["SQL", "ETL", "Excel/VB", "Data Quality"],
        heroTags: ["SQL", "ETL", "Excel/VB", "Data Quality", "XML Schema"],
        allTags: ["Insurance", "SQL", "Tools", "Data Engineering", "Integration"],
        metrics: [],
        glance: {
          employer: "Medavie Blue Cross",
          period: "2022 – Present",
          domain: "Health & Dental Claims · Group Takeover",
          previewDomain: "Group Claims · Takeover History Onboarding",
          role: "Solution Research · Documentation · Development Guidance · Support",
          previewRole: "Researched and documented solution, guided development & supported users",
          team: "Functional analysts · Developers · Claims operations",
          technologies: "Excel · VB · XML Schema (XSD) · Batch Load · Reconciliation",
          outcome: "Production, team-adopted onboarding and reconciliation workflow",
          previewOutcome: "Turned inconsistent prior-carrier spreadsheets into validated XML loads."
        },
        problem: "When a group changes insurers, prior claim history arrives in inconsistent spreadsheets or tables extracted from PDFs, while the receiving claims adjudication system requires a strict XML structure to enforce benefit maximums.",
        previewProblem: "Inconsistent prior-insurer spreadsheets caused manual transformation bottlenecks and load errors.",
        solution: "Researched and documented the end-to-end solution, guided schema/solution alignment and development of an Excel/VB validation and XML generation tool, and supported operational users through batch loading and reconciliation.",
        previewSolution: "Guided a structured Excel/VB validation and XML transformation workflow with pre-load and post-load reconciliation.",
        contribution: "Researched and documented the solution, defined validation and XML mapping rules, guided tool development and schema alignment alongside developers, and supported claims operations adopting the tool in production.",
        lessons: "Catching formatting and domain mismatches inside a familiar spreadsheet workbench before generating XML prevents batch load failures and gives operations confidence in the loaded balances.",
        keyResultsMetrics: [
          { val: "XSD", text: "Pre-load XML schema validation" },
          { val: "Adopted", text: "Production team onboarding workflow" }
        ],
        keyResultsChecks: [
          "Adopted by claims onboarding team in production",
          "Validated messy spreadsheet inputs before XML generation",
          "Reconciled loaded benefit totals against source carrier files"
        ],
        techStackTiles: [
          { icon: "validation", label: "XML / XSD Validation" },
          { icon: "rulesEngine", label: "Excel / VB Tooling" },
          { icon: "sql", label: "SQL Verification" },
          { icon: "apis", label: "Batch ETL Load" },
          { icon: "reporting", label: "Reconciliation" }
        ],
        relatedSlugs: ["claims", "continuity"],
        timeline: [
          { years: "Phase 1", text: "Takeover data & XSD gap analysis", theme: "green" },
          { years: "Phase 2", text: "Excel/VB validation & XML tooling guidance", theme: "teal" },
          { years: "Phase 3", text: "Team adoption & reconciliation support", theme: "blue" }
        ]
      },
      {
        slug: "nexus",
        title: "NEXUS — AI Orchestration Platform",
        shortTitle: "NEXUS — AI Orchestration Platform",
        badgeType: "INDEPENDENT",
        detailBadge: "INDEPENDENT BUILD",
        org: "NEXUS",
        period: "Active development",
        sidebarSub: "Independent · Active build",
        banner: "assets/proj-banner-nexus.jpg",
        shortDesc: "Independent multi-agent platform for planning, execution and evaluation with scoped context and audit receipts.",
        heroDesc: "An independent AI-assisted work platform in active development — combining scoped context compilation, constraint-aware routing, durable execution and evaluation receipts.",
        featured: true,
        featuredOrder: 6,
        status: "Active development",
        chapterLabel: "Building in the cloud",
        impactScore: 98,
        complexityScore: 99,
        yearSort: 2025,
        categories: ["independent", "ai", "tools"],
        cardTags: ["AI Agents", "Orchestration", "TypeScript"],
        heroTags: ["AI Agents", "Orchestration", "TypeScript", "PostgreSQL", "Evaluation"],
        allTags: ["AI", "Automation", "Web", "Tools"],
        metrics: [],
        glance: {
          employer: "Independent Capstone (run.nexus)",
          period: "Active development",
          domain: "AI Orchestration · Governed Software Delivery",
          previewDomain: "AI Systems · Multi-Agent Orchestration",
          role: "Creator · Systems Designer · Full-Stack Developer",
          previewRole: "Independent architecture, design and full-stack implementation",
          team: "Independent Capstone Project",
          technologies: "TypeScript · React/Vite · Node.js · PostgreSQL · Redis · OpenAPI",
          outcome: "Active technical capstone demonstrating governed AI orchestration",
          previewOutcome: "Scoped context, explainable routing and recoverable execution with full audit receipts."
        },
        problem: "Useful AI-assisted work requires more than an unconstrained chat prompt. Without scoped context, explicit plan review, permissioned execution and verifiable receipts, multi-step AI tasks quickly drift or become impossible to audit.",
        previewProblem: "Unconstrained AI prompts lack scoped context, explainable routing and auditable execution receipts.",
        solution: "Building NEXUS as an independent governed AI work platform that compiles scoped project context, separates planning from execution, routes tasks across models with explicit constraints, and records deterministic and semantic evaluation receipts.",
        previewSolution: "Designed a headless TypeScript orchestration core with React/Vite workbench, durable Node execution and evaluation receipts.",
        contribution: "Independently architecting and implementing the scoped context compiler, constraint-aware model router, durable command runner, and receipt verification pipeline.",
        lessons: "Applying enterprise systems discipline—explicit boundaries, state recovery and audit trails—turns probabilistic LLM capabilities into a dependable engineering workbench.",
        keyResultsMetrics: [
          { val: "4-Stage", text: "Context · Plan · Execute · Verify loop" },
          { val: "Durable", text: "Recoverable process execution" }
        ],
        keyResultsChecks: [
          "Scoped context compilation with source receipts",
          "Constraint-aware, inspectable model routing",
          "Deterministic & semantic outcome evaluation"
        ],
        techStackTiles: [
          { icon: "rulesEngine", label: "TypeScript Core" },
          { icon: "apis", label: "OpenAPI & WebSockets" },
          { icon: "sql", label: "PostgreSQL & Redis" },
          { icon: "validation", label: "Evaluation Receipts" },
          { icon: "reporting", label: "React / Vite UI" }
        ],
        relatedSlugs: ["lowkey", "renewals"],
        timeline: [
          { years: "Foundation", text: "Context compilation & graph schema", theme: "green" },
          { years: "Core Engine", text: "Model routing & durable Node runner", theme: "teal" },
          { years: "Active Build", text: "Evaluation receipts & workbench UI", theme: "blue" }
        ]
      },
      {
        slug: "continuity",
        title: "Claims Reporting & Data Continuity",
        shortTitle: "Claims Reporting & Data Continuity",
        badgeType: "PROFESSIONAL",
        detailBadge: "PROFESSIONAL WORK",
        org: "Medavie",
        period: "2022 – Present",
        sidebarSub: "Medavie · 2022 – Present",
        banner: "assets/proj-banner-continuity.jpg",
        shortDesc: "Uncovered a hidden daily flat-file ETL dependency and completed continuity analysis/design for claims migration.",
        heroDesc: "Traced a supposed reporting request to a daily legacy flat-file ETL pipeline and completed the end-to-end continuity analysis and mapping for claims migration.",
        featured: false,
        featuredOrder: 7,
        status: "Design completed; modernization proposed",
        chapterLabel: "Shaped by the business",
        impactScore: 92,
        complexityScore: 91,
        yearSort: 2024,
        categories: ["professional", "insurance", "data"],
        cardTags: ["SQL", "Cognos", "Data Models", "Reporting"],
        heroTags: ["SQL", "Cognos", "Data Models", "Reporting", "ETL Continuity"],
        allTags: ["Insurance", "SQL", "Data Engineering", "Reporting", "Integration"],
        metrics: [],
        glance: {
          employer: "Medavie Blue Cross",
          period: "2022 – Present",
          domain: "Enterprise Claims · ETL & Client Reporting",
          previewDomain: "Claims Data · Daily ETL & Cognos Continuity",
          role: "Current-State Analysis · Continuity Mapping · Modernization Proposal",
          previewRole: "Current-state analysis, field mapping and modernization proposal",
          team: "Functional analysts · Data engineering · Solution architects",
          technologies: "SQL · Legacy COBOL/InterBlue Flat-File ETL · Cognos · REST Design",
          outcome: "Completed continuity analysis/design; service implementation unconfirmed; modernization proposed",
          previewOutcome: "Completed analysis and continuity mapping for the daily client reporting data contract."
        },
        problem: "What was initially assigned as a simple Power BI report turned out to be a daily flat-file ETL feed through legacy COBOL/InterBlue that powered a client's downstream IBM Cognos reporting.",
        previewProblem: "A supposed report assignment was actually a daily flat-file ETL integration feeding client Cognos analytics.",
        solution: "Performed current-state analysis of the legacy extract, completed field-by-field continuity mapping from the new adjudication platform to preserve the daily contract, and proposed a modern reporting exchange option.",
        previewSolution: "Completed the analysis and continuity mapping to preserve the daily flat-file contract while proposing a modern exchange.",
        contribution: "Investigated the legacy COBOL/InterBlue pipeline, documented downstream field dependencies, completed the REST-to-flat-file continuity mapping design, and shaped the modernization proposal (service implementation and go-live remain unconfirmed).",
        lessons: "Always inspect what downstream consumers actually do with a data feed before replacing it—preserving operational continuity comes first, modernization second.",
        keyResultsMetrics: [
          { val: "Daily", text: "Flat-file ETL contract mapped" },
          { val: "2-Track", text: "Continuity design + modern proposal" }
        ],
        keyResultsChecks: [
          "Identified hidden daily ETL dependency during analysis",
          "Completed field-level continuity mapping specification",
          "Proposed modern reporting exchange path (implementation unconfirmed)"
        ],
        techStackTiles: [
          { icon: "sql", label: "SQL Analysis" },
          { icon: "apis", label: "Legacy Flat-File ETL" },
          { icon: "reporting", label: "Reporting (Cognos)" },
          { icon: "validation", label: "Continuity Mapping" },
          { icon: "rulesEngine", label: "Modernization Design" }
        ],
        relatedSlugs: ["sql", "takeover"],
        timeline: [
          { years: "Discovery", text: "Uncovered daily COBOL/InterBlue ETL feed", theme: "green" },
          { years: "Design", text: "Completed continuity mapping analysis", theme: "teal" },
          { years: "Proposal", text: "Shaped modern reporting exchange option", theme: "blue" }
        ]
      },
      {
        slug: "headquarters",
        title: "Headquarters Infrastructure and Move",
        shortTitle: "Headquarters Infrastructure & Move",
        badgeType: "PROFESSIONAL",
        detailBadge: "PROFESSIONAL WORK",
        org: "Grenville",
        period: "Within Grenville tenure (2009–2022)",
        sidebarSub: "Grenville · 2009 – 2022",
        banner: "assets/proj-banner-headquarters.jpg",
        shortDesc: "Planned, built and supported corporate headquarters infrastructure from design through physical move and VMware ESXi virtualization.",
        heroDesc: "Guided corporate headquarters technical infrastructure from design through build and physical move — spanning networking, AV, security, cooling, backup power and VMware ESXi virtualization.",
        featured: true,
        featuredOrder: 5,
        status: "Implemented",
        chapterLabel: "Grounded in the metal",
        impactScore: 91,
        complexityScore: 89,
        yearSort: 2014,
        categories: ["professional", "infra"],
        cardTags: ["Infrastructure", "Identity", "Security", "Virtualization"],
        heroTags: ["Infrastructure", "Identity", "Security", "Virtualization", "Resilient Power"],
        allTags: ["Infrastructure", "Insurance", "Tools"],
        metrics: [],
        glance: {
          employer: "Grenville Mutual Insurance",
          period: "Within Grenville tenure (2009–2022); exact move year not confirmed",
          domain: "Corporate Infrastructure · Virtualization · Facilities IT",
          previewDomain: "Enterprise Infrastructure · Datacentre & HQ Move",
          role: "Technical Design · Infrastructure Build · Virtualization",
          previewRole: "Systems administration, technical design and physical move execution",
          team: "IT operations · Facilities · Contractors · Network vendors",
          technologies: "VMware ESXi · 42U Racks · Cat6A / VLANs · UPS & Generator · AV & Security",
          outcome: "Implemented headquarters transition and blade-to-ESXi consolidation",
          previewOutcome: "Delivered a resilient headquarters buildout and virtualized server environment."
        },
        problem: "A corporate headquarters move brings networking, server racks, cooling, resilient power, physical door security and boardroom AV into a single cutover where everything must work reliably.",
        previewProblem: "Moving a corporate headquarters required coordinating physical power, cooling, cabling and server virtualization without business disruption.",
        solution: "Worked from initial technical floorplan design through construction and move-in, integrating conditioned UPS and standby generator power, structured cabling, and transitioning bare-metal blade servers to VMware ESXi.",
        previewSolution: "Connected physical facility constraints with virtualized VMware ESXi compute, resilient power and structured networking.",
        contribution: "Planned and executed the technical infrastructure build and move, coordinated vendor installations for cooling, UPS/generator and security, and migrated bare-metal blades to ESXi.",
        lessons: "Physical and operational dependencies—power, cooling, cabling and identity—are the foundation every higher-level software architecture relies on.",
        keyResultsMetrics: [
          { val: "ESXi", text: "Bare-metal blade virtualization" },
          { val: "End-to-End", text: "Design through physical move" }
        ],
        keyResultsChecks: [
          "End-to-end networking, AV, security & cooling design",
          "Integrated UPS and standby generator power resilience",
          "Consolidated physical blade centre onto VMware ESXi"
        ],
        techStackTiles: [
          { icon: "rulesEngine", label: "VMware ESXi" },
          { icon: "apis", label: "VLANs & Cat6A" },
          { icon: "validation", label: "UPS & Generator" },
          { icon: "sql", label: "SAN & Server Racks" },
          { icon: "reporting", label: "AV & Door Security" }
        ],
        relatedSlugs: ["foundations", "dell"],
        timeline: [
          { years: "Planning", text: "Floorplan, power, cooling & network specs", theme: "green" },
          { years: "Build & Move", text: "Racks, cabling, AV, security & cutover", theme: "teal" },
          { years: "Virtualization", text: "Bare-metal blade transition to ESXi", theme: "blue" }
        ]
      },
      {
        slug: "workflows",
        title: "Commercial Quoting & Broker Integration",
        shortTitle: "Commercial Quoting & Broker Integration",
        badgeType: "PROFESSIONAL",
        detailBadge: "PROFESSIONAL WORK",
        org: "Grenville",
        period: "Within Grenville tenure (2009–2022)",
        sidebarSub: "Grenville · 2009 – 2022",
        banner: "assets/proj-banner-workflows.jpg",
        shortDesc: "Designed commercial quoting rules, CSIO/ACORD payload mappings and two-way broker integration workflows.",
        heroDesc: "Connected commercial quoting requirements, CSIO/ACORD payload transformations and backend underwriting rules across TAM and Epic broker integrations.",
        featured: false,
        featuredOrder: 8,
        status: "Implemented",
        chapterLabel: "Shaped by the business",
        impactScore: 89,
        complexityScore: 93,
        yearSort: 2018,
        categories: ["professional", "insurance", "data"],
        cardTags: ["Integration", "CSIO / ACORD", "Commercial Lines", "XML"],
        heroTags: ["Commercial Quoting", "CSIO / ACORD", "SOAP / REST", "Business Rules"],
        allTags: ["Insurance", "Integration", "Automation", "Data Engineering"],
        metrics: [],
        glance: {
          employer: "Grenville Mutual Insurance",
          period: "Within Grenville tenure (2009–2022)",
          domain: "P&C Insurance · Commercial Quoting & BMS",
          previewDomain: "Commercial Lines · Broker Integration",
          role: "Policy Rules Implementation · Mapping & Specification",
          previewRole: "Core policy rules implementation, CSIO mapping and vendor coordination",
          team: "Business analysts · Broker vendors (TAM/Epic/Bravado) · Underwriters",
          technologies: "CSIO / ACORD · XML · AL3 · eDocs · SOAP / REST · Rules Engine",
          outcome: "Two-way broker upload/download and commercial quoting rules",
          previewOutcome: "Aligned broker payloads and UI stages with proprietary backend insurance rules."
        },
        problem: "Commercial quoting and broker upload/download workflows crossed multiple vendor platforms (TAM, Epic via Bravado) where incomplete risk inputs or mismatched codes broke downstream rating.",
        previewProblem: "Commercial broker payloads and UI stages needed consistent risk mapping and rule validation across vendors.",
        solution: "Designed and implemented rating and underwriting rules, mapped CSIO/ACORD fields across upload and download flows, and specified UI stages to capture complete commercial risk data.",
        previewSolution: "Implemented commercial rating/underwriting rules and two-way CSIO/ACORD field transformations.",
        contribution: "Personally implemented policy rating and underwriting rules and defined the field/value mappings and UI specifications connecting broker desktop/portal workflows to backend decisions.",
        lessons: "Two-way integration requires treating both upload requests and download documents (eDocs/AL3/XML) as a single coherent conversation with the broker.",
        keyResultsMetrics: [
          { val: "CSIO", text: "Upload & download payload mapping" },
          { val: "Multi-Line", text: "Auto, residential, farm & commercial" }
        ],
        keyResultsChecks: [
          "Implemented commercial quoting validation & rating rules",
          "Mapped TAM & Epic broker flows through Bravado",
          "Supported XML, eDocs and historical AL3 standards"
        ],
        techStackTiles: [
          { icon: "rulesEngine", label: "Commercial Rules" },
          { icon: "apis", label: "CSIO / ACORD XML" },
          { icon: "validation", label: "TAM & Epic BMS" },
          { icon: "sql", label: "Field Mappings" },
          { icon: "reporting", label: "eDocs & PDFs" }
        ],
        relatedSlugs: ["newbusiness", "changes"],
        timeline: [
          { years: "Phase 1", text: "Upload/download CSIO & XML mappings", theme: "green" },
          { years: "Phase 2", text: "Commercial quoting rules & UI specs", theme: "teal" },
          { years: "Phase 3", text: "REST backend & ongoing enhancements", theme: "blue" }
        ]
      },
      {
        slug: "changes",
        title: "Policy-Change Comparison & Validation",
        shortTitle: "Policy-Change Comparison & Validation",
        badgeType: "PROFESSIONAL",
        detailBadge: "PROFESSIONAL WORK",
        org: "Grenville",
        period: "Within Grenville tenure (2009–2022)",
        sidebarSub: "Grenville · 2009 – 2022",
        banner: "assets/proj-banner-changes.jpg",
        shortDesc: "Built endorsement comparison workflows and context-aware validation rules that showed policy changes before submission.",
        heroDesc: "Designed policy-change comparison workflows and contextual validation rules that distinguished endorsements from new business and renewals.",
        featured: false,
        featuredOrder: 9,
        status: "Implemented",
        chapterLabel: "Shaped by the business",
        impactScore: 86,
        complexityScore: 88,
        yearSort: 2017,
        categories: ["professional", "insurance"],
        cardTags: ["Endorsements", "Validation", "UI Design", "Business Rules"],
        heroTags: ["Endorsements", "Change Comparison", "Validation", "Business Rules"],
        allTags: ["Insurance", "Automation", "Web"],
        metrics: [],
        glance: {
          employer: "Grenville Mutual Insurance",
          period: "Within Grenville tenure (2009–2022)",
          domain: "P&C Insurance · Policy Endorsements",
          previewDomain: "P&C Insurance · Policy Changes",
          role: "Analysis · Policy Rules · UI/Integration Design",
          previewRole: "Analysis, policy rules implementation and change-comparison design",
          team: "Business analysts · Developers · Underwriters",
          technologies: "Policy Rules Engine · XML Mappings · Broker Portal UI",
          outcome: "Clear pre-submission change comparison and contextual validation",
          previewOutcome: "Let users inspect proposed policy changes before submission with transaction-specific rules."
        },
        problem: "Mid-term policy changes alter risk and rating differently than new business or renewals. Brokers needed to see exactly what was changing before submitting, and rules had to validate the delta in context.",
        previewProblem: "Policy endorsements required pre-submission comparison and rules distinct from new business.",
        solution: "Worked on a policy-change comparison interface and implemented contextual validation and rating rules that separated proposed changes from committed policy state.",
        previewSolution: "Combined visual before/after change comparison with endorsement-specific rating and referral rules.",
        contribution: "Designed and implemented endorsement validation and rating rules, mapped payload fields, and helped shape the pre-submission comparison workflow.",
        lessons: "Showing users a clear before-and-after delta before they commit a transaction prevents accidental coverage errors and reduces downstream underwriting reversals.",
        keyResultsMetrics: [
          { val: "Pre-Submit", text: "Side-by-side change comparison" },
          { val: "Contextual", text: "Endorsement-specific rule evaluation" }
        ],
        keyResultsChecks: [
          "Separated proposed change deltas from active policy records",
          "Distinguished endorsement rules from new business & renewals",
          "Returned actionable correction, referral or bind messages"
        ],
        techStackTiles: [
          { icon: "rulesEngine", label: "Endorsement Rules" },
          { icon: "validation", label: "Delta Validation" },
          { icon: "apis", label: "Broker Payloads" },
          { icon: "reporting", label: "Comparison UI" },
          { icon: "sql", label: "Policy State" }
        ],
        relatedSlugs: ["workflows", "renewals"],
        timeline: [
          { years: "Analysis", text: "Endorsement workflow & rule scoping", theme: "green" },
          { years: "Delivery", text: "Change comparison UI & rule implementation", theme: "teal" },
          { years: "Support", text: "Ongoing rule tuning across P&C lines", theme: "blue" }
        ]
      },
      {
        slug: "inquiry",
        title: "Broker Policy Inquiry & Document Access",
        shortTitle: "Broker Policy Inquiry",
        badgeType: "PROFESSIONAL",
        detailBadge: "PROFESSIONAL WORK",
        org: "Grenville",
        period: "Within Grenville tenure (2009–2022)",
        sidebarSub: "Grenville · 2009 – 2022",
        banner: "assets/proj-banner-inquiry.jpg",
        shortDesc: "Connected broker inquiry workflows to policy, billing and claims data plus downloadable PDF documents.",
        heroDesc: "Mapped and tested broker policy, billing and claims inquiry interfaces with downloadable PDF documents across SOAP/XML and REST.",
        featured: false,
        featuredOrder: 10,
        status: "Implemented",
        chapterLabel: "Shaped by the business",
        impactScore: 84,
        complexityScore: 82,
        yearSort: 2015,
        categories: ["professional", "insurance", "data"],
        cardTags: ["SOAP / REST", "CSIO", "Broker Portal", "eDocs"],
        heroTags: ["Broker Inquiry", "SOAP / XML", "REST", "PDF / eDocs"],
        allTags: ["Insurance", "Integration", "Web"],
        metrics: [],
        glance: {
          employer: "Grenville Mutual Insurance",
          period: "Within Grenville tenure (2009–2022)",
          domain: "P&C Insurance · Policy, Billing & Claims Inquiry",
          previewDomain: "P&C Insurance · Broker Inquiry",
          role: "Business Analysis · Mappings · Integration Testing",
          previewRole: "Mockups, field mappings, request diagnosis and integration testing",
          team: "Business analysts · Broker vendors · Developers",
          technologies: "SOAP / XML · REST · CSIO / ACORD · PDF / eDocs",
          outcome: "Reliable policy, billing and claims lookup inside broker workflows",
          previewOutcome: "Delivered accurate policy, billing and claims inquiry with downloadable PDFs."
        },
        problem: "Brokers needed immediate access to policy, billing and claims details—along with downloadable PDFs—directly inside their own workflows without losing field meaning across system boundaries.",
        previewProblem: "Policy, billing and claims lookups had to cross vendor boundaries cleanly and include downloadable PDFs.",
        solution: "Created UI mockups and CSIO/proprietary field mappings, diagnosed SOAP/XML and REST requests, and tested end-to-end policy, billing and claims inquiry responses.",
        previewSolution: "Connected broker inquiry requests to backend policy, billing, claims and PDF document services.",
        contribution: "Produced mockups and field mappings, diagnosed integration requests across broker vendors, and verified downloadable policy, billing and claims PDFs.",
        lessons: "Even a read-only inquiry is a business contract: field labels, status codes and documents must match how the broker actually serves the policyholder.",
        keyResultsMetrics: [
          { val: "3-in-1", text: "Policy, billing & claims inquiry" },
          { val: "PDF", text: "Direct document & eDocs retrieval" }
        ],
        keyResultsChecks: [
          "Mapped CSIO/ACORD and proprietary backend fields",
          "Supported desktop SOAP/XML and modern REST endpoints",
          "Verified downloadable policy, billing and claims PDFs"
        ],
        techStackTiles: [
          { icon: "apis", label: "SOAP & REST" },
          { icon: "validation", label: "CSIO Mappings" },
          { icon: "reporting", label: "PDF / eDocs" },
          { icon: "sql", label: "Policy & Claims Data" },
          { icon: "rulesEngine", label: "Inquiry Testing" }
        ],
        relatedSlugs: ["newbusiness", "upload"],
        timeline: [
          { years: "Design", text: "Inquiry mockups & field mapping specs", theme: "green" },
          { years: "Integration", text: "SOAP/XML & PDF document retrieval", theme: "teal" },
          { years: "Evolution", text: "REST backend transition & vendor testing", theme: "blue" }
        ]
      },
      {
        slug: "upload",
        title: "Authenticated Document Upload Portal",
        shortTitle: "Document Upload into Policy Records",
        badgeType: "PROFESSIONAL",
        detailBadge: "PROFESSIONAL WORK",
        org: "Grenville",
        period: "Approx. 2018",
        sidebarSub: "Grenville · ~2018",
        banner: "assets/proj-banner-upload.jpg",
        shortDesc: "Built a C#/.NET and REST portal for external adjusters to submit documents directly into policy records, plus log diagnostic tooling.",
        heroDesc: "Developed an authenticated C#/.NET and REST submission portal placing adjuster documents directly into backend policy records, paired with internal log diagnostics.",
        featured: false,
        featuredOrder: 11,
        status: "Implemented",
        chapterLabel: "Shaped by the business",
        impactScore: 87,
        complexityScore: 86,
        yearSort: 2018,
        categories: ["professional", "insurance", "web", "tools"],
        cardTags: ["C# / .NET", "REST API", "JavaScript", "Support Tooling"],
        heroTags: ["C# / .NET", "REST API", "Bootstrap", "Operational Logging"],
        allTags: ["Insurance", "Integration", "Web", "Tools"],
        metrics: [],
        glance: {
          employer: "Grenville Mutual Insurance",
          period: "Approx. 2018 (within Grenville tenure)",
          domain: "P&C Insurance · Claims & Underwriting Documents",
          previewDomain: "P&C Insurance · Document Intake Portal",
          role: "Systems Analyst · Hands-On Developer",
          previewRole: "Hands-on C#/.NET developer, REST integration and support tooling",
          team: "Systems analyst / developer · Operations · External adjusters",
          technologies: "C# · .NET · REST APIs · JavaScript · HTML/CSS · Bootstrap",
          outcome: "Production portal replacing ad-hoc email with direct record placement",
          previewOutcome: "Replaced fragmented email attachments with authenticated REST placement into policy records."
        },
        problem: "External insurance adjusters were submitting supporting documents and photos via ad-hoc email, leaving files fragmented outside the target policy-management records.",
        previewProblem: "Ad-hoc email submissions left adjuster documents disconnected from backend policy records.",
        solution: "Built an authenticated C#/.NET web portal using backend REST APIs to place documents and images directly into policy records, and built an internal log search tool to diagnose upload/download issues.",
        previewSolution: "Delivered a C#/.NET + REST upload portal with operational logging and an internal troubleshooting tool.",
        contribution: "Personally developed the C#/.NET and Bootstrap portal, integrated proprietary REST APIs, implemented operational logging, and built the internal log-diagnosis tool.",
        lessons: "Pairing a new external integration with internal log-search tooling turns support from guesswork into fast, repeatable root-cause resolution.",
        keyResultsMetrics: [
          { val: ".NET + REST", text: "Direct backend record attachment" },
          { val: "Built-In", text: "Internal log search & diagnostics" }
        ],
        keyResultsChecks: [
          "Replaced ad-hoc email workflow for external adjusters",
          "Attached quotes, photos and PDFs directly to policy records",
          "Empowered support with self-service log search tooling"
        ],
        techStackTiles: [
          { icon: "rulesEngine", label: "C# / .NET" },
          { icon: "apis", label: "REST APIs" },
          { icon: "reporting", label: "Bootstrap / JS" },
          { icon: "validation", label: "Auth & Logging" },
          { icon: "sql", label: "Log Search Tool" }
        ],
        relatedSlugs: ["inquiry", "takeover"],
        timeline: [
          { years: "Portal Build", text: "C#/.NET & Bootstrap adjuster portal", theme: "green" },
          { years: "REST Placement", text: "Direct backend policy record attachment", theme: "teal" },
          { years: "Diagnostics", text: "Internal log retrieval & search tool", theme: "blue" }
        ]
      },
      {
        slug: "claims",
        title: "Provider Data for Claims Adjudication",
        shortTitle: "Provider Data for Claims Adjudication",
        badgeType: "PROFESSIONAL",
        detailBadge: "PROFESSIONAL WORK",
        org: "Medavie",
        period: "2022 – Present",
        sidebarSub: "Medavie · 2022 – Present",
        banner: "assets/proj-banner-claims.jpg",
        shortDesc: "Solution review, field mappings and scheduled synchronization requirements for provider data in claims adjudication.",
        heroDesc: "Defined provider integration requirements, gap analysis and field mappings connecting source provider registries to claims adjudication via scheduled event tables and REST.",
        featured: true,
        featuredOrder: 4,
        status: "Solution review & requirements",
        chapterLabel: "Shaped by the business",
        impactScore: 88,
        complexityScore: 87,
        yearSort: 2023,
        categories: ["professional", "insurance", "data"],
        cardTags: ["REST API", "Data Mapping", "Claims", "Solution Review"],
        heroTags: ["Provider Registry", "REST Consumer", "Scheduled Sync", "Field Mapping"],
        allTags: ["Insurance", "SQL", "Integration", "Data Engineering"],
        metrics: [],
        glance: {
          employer: "Medavie Blue Cross",
          period: "2022 – Present",
          domain: "Health & Dental Claims · Provider Registry",
          previewDomain: "Claims Adjudication · Provider Sync",
          role: "Functional Analyst · Solution Review & Mapping",
          previewRole: "Solution review, gap analysis, field mappings and sync requirements",
          team: "Functional analysts · Solution architects · Integration developers",
          technologies: "REST API Consumer · Scheduled Event Table · Field & Value Mappings",
          outcome: "Clear provider synchronization requirements and cross-system mappings",
          previewOutcome: "Aligned provider registry records with claims adjudication requirements."
        },
        problem: "Claims adjudication depends on accurate provider credentials, specialties and status across source and consumer systems. Mismatched fields or timing gaps cause adjudication delays.",
        previewProblem: "Adjudication systems needed reliable provider data mappings and scheduled synchronization requirements.",
        solution: "Reviewed the proposed architecture alongside solution architects, performed source-to-target gap analysis, and documented field mappings and scheduled event-table / REST synchronization requirements.",
        previewSolution: "Defined source-to-target provider field mappings and scheduled event-table / REST retrieval requirements.",
        contribution: "Conducted solution reviews, authored provider data mappings, and specified synchronization requirements between the provider source and claims adjudication (without claiming real-time broker implementation).",
        lessons: "Clear field-level contracts and well-defined scheduled synchronization states keep multi-system claims adjudication predictable without over-engineering.",
        keyResultsMetrics: [
          { val: "REST + SQL", text: "Scheduled event table & API retrieval" },
          { val: "End-to-End", text: "Source-to-adjudication field mapping" }
        ],
        keyResultsChecks: [
          "Completed provider registry gap analysis alongside architects",
          "Defined source-to-consumer field and status mappings",
          "Specified scheduled event-table & REST sync behavior"
        ],
        techStackTiles: [
          { icon: "apis", label: "REST Retrieval" },
          { icon: "sql", label: "Event Table Sync" },
          { icon: "validation", label: "Field Mappings" },
          { icon: "rulesEngine", label: "Gap Analysis" },
          { icon: "reporting", label: "Claims Adjudication" }
        ],
        relatedSlugs: ["takeover", "sql"],
        timeline: [
          { years: "Review", text: "Architecture & source-system gap analysis", theme: "green" },
          { years: "Mapping", text: "Provider field & status transformations", theme: "teal" },
          { years: "Sync Spec", text: "Scheduled event table & REST requirements", theme: "blue" }
        ]
      },
      {
        slug: "sql",
        title: "Claims SQL & Financial Reconciliation",
        shortTitle: "Claims SQL & Financial Reconciliation",
        badgeType: "PROFESSIONAL",
        detailBadge: "PROFESSIONAL WORK",
        org: "Medavie",
        period: "2022 – Present",
        sidebarSub: "Medavie · 2022 – Present",
        banner: "assets/proj-banner-sql.jpg",
        shortDesc: "Hand-written SQL queries, financial report logic analysis and claims reconciliation across enterprise databases.",
        heroDesc: "Wrote complex hand-written SQL to trace financial report logic, isolate discrepancies and reconcile claims data against downstream accounting reports.",
        featured: false,
        featuredOrder: 12,
        status: "Implemented",
        chapterLabel: "Shaped by the business",
        impactScore: 88,
        complexityScore: 89,
        yearSort: 2024,
        categories: ["professional", "insurance", "data"],
        cardTags: ["SQL", "Reconciliation", "Financial Reporting", "Claims"],
        heroTags: ["Hand-Written SQL", "Financial Reconciliation", "Report Logic", "Data Quality"],
        allTags: ["Insurance", "SQL", "Data Engineering", "Reporting"],
        metrics: [],
        glance: {
          employer: "Medavie Blue Cross",
          period: "2022 – Present",
          domain: "Enterprise Claims · Financial Reporting & Balancing",
          previewDomain: "Claims Data · SQL & Financial Balancing",
          role: "Functional Analyst · SQL & Reconciliation Lead",
          previewRole: "Hand-written SQL queries, report logic analysis and financial balancing",
          team: "Functional analysts · Finance & reporting teams · Data engineers",
          technologies: "Hand-Written SQL · Relational Schemas · Financial Report Logic · Reconciliation",
          outcome: "Verified claims-to-finance report logic and balanced extract totals",
          previewOutcome: "Traced complex report rules in SQL so claims extracts reconciled with financial reporting."
        },
        problem: "Claims reporting must balance accurately against the financial reporting it feeds. When complex multi-table joins, reversals and cutoffs interact, discrepancies require deep SQL inspection.",
        previewProblem: "Claims extracts and financial reports required deep SQL analysis to reconcile complex edge cases.",
        solution: "Wrote hand-crafted analytical SQL across claims tables, reverse-engineered existing report logic, and built repeatable reconciliation queries to verify balances across system transitions.",
        previewSolution: "Used hand-written SQL to trace report rules, isolate edge-case variances and verify financial alignment.",
        contribution: "Personally wrote the diagnostic and reconciliation SQL queries, documented financial report business logic, and validated extract accuracy.",
        lessons: "Reading and writing the actual SQL behind a financial report is the fastest way to uncover unspoken business assumptions and edge-case rules.",
        keyResultsMetrics: [
          { val: "SQL", text: "Direct relational query verification" },
          { val: "Balanced", text: "Claims-to-finance report alignment" }
        ],
        keyResultsChecks: [
          "Traced multi-table claims and financial reporting logic",
          "Isolated reversal, cutoff and status edge cases in SQL",
          "Supported continuity and migration verification"
        ],
        techStackTiles: [
          { icon: "sql", label: "Hand-Written SQL" },
          { icon: "validation", label: "Financial Balancing" },
          { icon: "reporting", label: "Report Logic" },
          { icon: "rulesEngine", label: "Edge-Case Analysis" },
          { icon: "apis", label: "Data Extracts" }
        ],
        relatedSlugs: ["continuity", "takeover"],
        timeline: [
          { years: "Analysis", text: "Deconstructed legacy financial report logic", theme: "green" },
          { years: "SQL Queries", text: "Built diagnostic & balancing SQL scripts", theme: "teal" },
          { years: "Verification", text: "Reconciled claims extracts with finance", theme: "blue" }
        ]
      },
      {
        slug: "foundations",
        title: "Small Business Server Swing Migrations",
        shortTitle: "SBS Swing Migrations & Systems",
        badgeType: "PROFESSIONAL",
        detailBadge: "PROFESSIONAL WORK",
        org: "Harris",
        period: "2007 – 2009",
        sidebarSub: "Harris · 2007 – 2009",
        banner: "assets/proj-banner-foundations.jpg",
        shortDesc: "Developed a repeatable swing-migration process separating combined Small Business Server environments into dedicated Active Directory and Exchange servers.",
        heroDesc: "Built client server racks, firewalls and networks at Harris, and developed a repeatable SBS swing-migration process preserving live email, identity and data.",
        featured: false,
        featuredOrder: 13,
        status: "Implemented",
        chapterLabel: "Grounded in the metal",
        impactScore: 85,
        complexityScore: 85,
        yearSort: 2008,
        categories: ["professional", "infra"],
        cardTags: ["Active Directory", "Exchange", "Server Racks", "Networking"],
        heroTags: ["Swing Migration", "Active Directory", "Exchange", "Firewalls & VLANs"],
        allTags: ["Infrastructure", "Tools"],
        metrics: [],
        glance: {
          employer: "Harris Computer Services",
          period: "2007 – 2009",
          domain: "Managed IT · Server & Network Infrastructure",
          previewDomain: "Enterprise Systems · Server & Identity Migrations",
          role: "NOC & Project Technician",
          previewRole: "NOC support, rack builds, firewall/switch configuration and SBS swing migrations",
          team: "Infrastructure project technicians · NOC engineers · SMB clients",
          technologies: "Windows Server · Small Business Server · Active Directory · Exchange · BES · Firewalls",
          outcome: "Repeatable swing-migration methodology preserving data, email and identity",
          previewOutcome: "Moved growing clients off combined SBS onto separated server infrastructure cleanly."
        },
        problem: "Growing businesses were outgrowing Microsoft Small Business Server, where Active Directory, Exchange email and file services were tightly coupled on one machine—making upgrades risky.",
        previewProblem: "Combined Small Business Server environments made separating Active Directory and Exchange risky for live clients.",
        solution: "Developed a repeatable staged swing-migration process to transition identity (Active Directory/GPO), Exchange mailboxes, BlackBerry Enterprise Server and file shares onto separated servers.",
        previewSolution: "Created a repeatable staged swing-migration process that preserved domain identity, email and data.",
        contribution: "Progressed from NOC monitoring to full rack builds, firewall/switch setups, and executing repeatable SBS swing migrations for client environments.",
        lessons: "Understanding how identity, DNS, mail routing and storage depend on each other makes complex multi-server cutovers predictable and calm.",
        keyResultsMetrics: [
          { val: "Staged", text: "Repeatable swing-migration process" },
          { val: "Full-Stack", text: "Racks, firewalls, AD & Exchange" }
        ],
        keyResultsChecks: [
          "Preserved Active Directory SIDs, GPOs and Exchange mailboxes",
          "Built client server racks, switches and firewall perimeters",
          "Supported internal Harris firewalls, switches and servers"
        ],
        techStackTiles: [
          { icon: "rulesEngine", label: "Active Directory" },
          { icon: "apis", label: "Exchange & BES" },
          { icon: "validation", label: "Firewalls & Switches" },
          { icon: "sql", label: "Server Racks" },
          { icon: "reporting", label: "Swing Migration" }
        ],
        relatedSlugs: ["headquarters", "dell"],
        timeline: [
          { years: "2007", text: "NOC monitoring & corporate support", theme: "green" },
          { years: "2008", text: "Client rack builds, switches & firewalls", theme: "teal" },
          { years: "2008 – 2009", text: "Repeatable SBS swing migrations", theme: "blue" }
        ]
      },
      {
        slug: "dell",
        title: "Dell Latitude & OptiPlex Hardware Support",
        shortTitle: "Dell Hardware & First-Call Support",
        badgeType: "PROFESSIONAL",
        detailBadge: "PROFESSIONAL WORK",
        org: "Dell",
        period: "Sept 2006 – 2007",
        sidebarSub: "Dell · 2006 – 2007",
        banner: "assets/proj-banner-dell.jpg",
        shortDesc: "Latitude and OptiPlex hardware support on Dell's Gloves Off team—spending the time needed to isolate the fault on the first call and reduce callbacks.",
        heroDesc: "Supported commercial Latitude laptops and OptiPlex desktops on Dell's Gloves Off team, focusing on thorough root-cause diagnosis and first-call resolution.",
        featured: false,
        featuredOrder: 14,
        status: "Implemented",
        chapterLabel: "Grounded in the metal",
        impactScore: 82,
        complexityScore: 78,
        yearSort: 2006,
        categories: ["professional", "infra"],
        cardTags: ["Hardware", "Diagnostics", "First-Call Resolution", "Support"],
        heroTags: ["Dell Gloves Off", "Latitude & OptiPlex", "Hardware Diagnostics", "Root-Cause Fix"],
        allTags: ["Infrastructure", "Tools"],
        metrics: [],
        glance: {
          employer: "Dell Canada",
          period: "September 2006 – 2007",
          domain: "Commercial Hardware Support · Latitude & OptiPlex",
          previewDomain: "Enterprise Endpoints · Hardware Diagnostics",
          role: "Technical Support Specialist (Gloves Off Team)",
          previewRole: "Component-level hardware troubleshooting and client resolution",
          team: "Dell Gloves Off support team · Field dispatch technicians",
          technologies: "Dell Latitude · OptiPlex · System Boards · PSU / Thermal / Bus Diagnostics",
          outcome: "First-call resolution focus and reduced repeat client callbacks",
          previewOutcome: "Isolated root-cause hardware faults on the first call so clients didn't have to call back."
        },
        problem: "A hardware fault is disruptive enough without rushing the user off the phone and forcing repeat callbacks when a symptom returns.",
        previewProblem: "Rushed call-handle targets often treated symptoms instead of isolating the true hardware fault.",
        solution: "Worked on Dell's Gloves Off team, where we were empowered to spend the time required with the client to isolate motherboard, power, thermal or storage faults on the first call.",
        previewSolution: "Combined methodical component-level isolation with clear client communication to resolve faults on the first call.",
        contribution: "Diagnosed Latitude and OptiPlex hardware failures, guided clients through verification steps, and prepared accurate dispatch specifications.",
        lessons: "Start with the real problem, verify the physical evidence, and keep the person on the other end of the system in view—a habit that still guides my architecture work today.",
        keyResultsMetrics: [
          { val: "Gloves Off", text: "First-call root-cause mandate" },
          { val: "Sept 2006", text: "Foundation of technology career" }
        ],
        keyResultsChecks: [
          "Component-level fault isolation on Latitude & OptiPlex",
          "Reduced repeat callbacks through thorough first-call diagnosis",
          "Clear translation between technical faults and user impact"
        ],
        techStackTiles: [
          { icon: "rulesEngine", label: "System Boards" },
          { icon: "validation", label: "POST & BIOS" },
          { icon: "sql", label: "SATA / Storage" },
          { icon: "apis", label: "PSU & Thermal" },
          { icon: "reporting", label: "First-Call Fix" }
        ],
        relatedSlugs: ["foundations", "headquarters"],
        timeline: [
          { years: "Sept 2006", text: "Joined Dell commercial hardware support", theme: "green" },
          { years: "Gloves Off", text: "Empowered first-call root-cause resolution", theme: "teal" },
          { years: "2007", text: "Transitioned into NOC & server systems at Harris", theme: "blue" }
        ]
      },
      {
        slug: "lowkey",
        title: "LOWKEY — Local Speech-to-Text Input",
        shortTitle: "LOWKEY — Local Speech Input",
        badgeType: "INDEPENDENT",
        detailBadge: "INDEPENDENT BUILD",
        org: "Personal",
        period: "Independent Build",
        sidebarSub: "Independent · Local AI",
        banner: "assets/lowkey-local-speech-v1.png",
        shortDesc: "On-device speech recognition connected directly to everyday text input across Windows (Rust / Tauri 2) and Android (Kotlin IME).",
        heroDesc: "Local speech-to-text inference using sherpa-onnx / Parakeet with a dedicated Rust worker on Windows and a native Kotlin keyboard on Android.",
        featured: false,
        featuredOrder: 15,
        status: "Implemented",
        chapterLabel: "Building in the cloud",
        impactScore: 86,
        complexityScore: 90,
        yearSort: 2024,
        categories: ["independent", "ai", "web", "tools"],
        cardTags: ["Local AI", "Rust / Tauri 2", "Android IME", "ONNX"],
        heroTags: ["Local Speech AI", "Rust / Tauri 2", "sherpa-onnx", "Kotlin Android IME"],
        allTags: ["AI", "Automation", "Web", "Tools"],
        metrics: [],
        glance: {
          employer: "Independent Project",
          period: "Historical / Personal Build",
          domain: "On-Device AI · Speech-to-Text & Native Input",
          previewDomain: "Local AI Inference · Desktop & Mobile Input",
          role: "Creator & Developer",
          previewRole: "End-to-end Rust/Tauri, TypeScript and Kotlin Android IME development",
          team: "Independent Build",
          technologies: "Rust · Tauri 2 · React / TypeScript · sherpa-onnx / Parakeet · Kotlin Android IME",
          outcome: "Local phrase capture and on-device decoding into native text fields",
          previewOutcome: "Connected local ONNX speech models directly to Windows and Android text entry."
        },
        problem: "Cloud voice dictation adds latency and sends audio off-device, and often stays trapped inside a separate app instead of typing directly where you already work.",
        previewProblem: "Voice input needed to run locally on-device and type directly into native Windows and Android inputs.",
        solution: "Built LOWKEY around AudioWorklet capture, Silero phrase detection, and cached sherpa-onnx / Parakeet models in a Rust / Tauri 2 desktop app and Kotlin Android IME.",
        previewSolution: "Combined Silero VAD and local Parakeet ONNX models with native Windows and Android keyboard injection.",
        contribution: "Built the Rust worker pipeline, Tauri 2 desktop interface, local vocabulary correction flow, and Android input method service.",
        lessons: "Running quantized models locally (110M CTC and 0.6B v3 TDT INT8) makes voice input feel like a natural extension of the operating system.",
        keyResultsMetrics: [
          { val: "On-Device", text: "Local sherpa-onnx / Parakeet decoding" },
          { val: "2-Platform", text: "Windows Tauri 2 + Android Kotlin IME" }
        ],
        keyResultsChecks: [
          "AudioWorklet capture with Silero VAD phrase detection",
          "Cached 110M CTC & 0.6B v3 TDT INT8 local models",
          "Custom dictionary & vocabulary correction pipeline"
        ],
        techStackTiles: [
          { icon: "rulesEngine", label: "Rust & Tauri 2" },
          { icon: "apis", label: "sherpa-onnx" },
          { icon: "validation", label: "Silero VAD" },
          { icon: "reporting", label: "React / TS" },
          { icon: "sql", label: "Kotlin Android IME" }
        ],
        relatedSlugs: ["nexus", "workshop42"],
        timeline: [
          { years: "Prototype", text: "AudioWorklet & Silero VAD capture", theme: "green" },
          { years: "Desktop", text: "Rust / Tauri 2 local ONNX worker", theme: "teal" },
          { years: "Mobile", text: "Kotlin Android keyboard IME", theme: "blue" }
        ]
      },
      {
        slug: "workshop42",
        title: "Workshop42 — Physical Design & Fabrication",
        shortTitle: "Workshop42 — Physical Builds",
        badgeType: "INDEPENDENT",
        detailBadge: "INDEPENDENT BUILD",
        org: "Workshop42",
        period: "Independent Studio",
        sidebarSub: "Independent · ws42.ca",
        banner: "assets/apex.jpg",
        shortDesc: "Tangible industrial design and multi-material 3D-printed objects—including the Apex monitor riser and The Voyager canoe model.",
        heroDesc: "Designing and fabricating physical objects that combine CAD precision, multi-color 3D printing and woodworking at Workshop42 (ws42.ca).",
        featured: false,
        featuredOrder: 16,
        status: "Implemented",
        chapterLabel: "Grounded in the metal",
        impactScore: 83,
        complexityScore: 80,
        yearSort: 2024,
        categories: ["independent", "web", "tools"],
        cardTags: ["CAD & 3D Printing", "Product Design", "MakerWorld", "Hardware"],
        heroTags: ["Workshop42", "CAD & Fabrication", "Apex Monitor Riser", "The Voyager"],
        allTags: ["Web", "Tools"],
        metrics: [],
        glance: {
          employer: "Workshop42 (ws42.ca)",
          period: "Ongoing Personal Studio",
          domain: "Physical Product Design · Additive Manufacturing",
          previewDomain: "Industrial Design · 3D Printing & Woodwork",
          role: "Designer & Maker",
          previewRole: "CAD modeling, structural prototyping, print optimization and photography",
          team: "Independent Studio",
          technologies: "CAD Modeling · Multi-Material FDM Printing · Wood & Composite Joinery",
          outcome: "Published community models on MakerWorld and ws42.ca",
          previewOutcome: "Designed functional desktop hardware and scale models photographed as built."
        },
        problem: "Digital systems aren't the only place where structure, tolerances and human ergonomics matter—physical workspace tools benefit from the same iterative design loop.",
        previewProblem: "Bringing iterative engineering tolerances and clean aesthetics into physical objects.",
        solution: "Created Workshop42 to design, prototype and share tangible builds—like the Apex monitor riser (printed structural legs with a hardwood shelf) and The Voyager dual-color floating canoe model.",
        previewSolution: "Designed and fabricated multi-material physical objects published on MakerWorld and ws42.ca.",
        contribution: "Modeled parts in CAD, tuned print orientation and structural infill for load-bearing strength, and published print profiles.",
        lessons: "Physical fabrication reinforces a core engineering truth: tolerances, material constraints and simplicity determine whether a design holds up in the real world.",
        keyResultsMetrics: [
          { val: "Apex", text: "Printed legs + wooden shelf riser" },
          { val: "Voyager", text: "Dual-color floating canoe model" }
        ],
        keyResultsChecks: [
          "Published print-ready models on MakerWorld",
          "Combined 3D-printed structural geometry with wood",
          "Photographed and documented real physical builds"
        ],
        techStackTiles: [
          { icon: "rulesEngine", label: "CAD Modeling" },
          { icon: "validation", label: "Structural Fit" },
          { icon: "apis", label: "Multi-Color Print" },
          { icon: "reporting", label: "MakerWorld" },
          { icon: "sql", label: "ws42.ca" }
        ],
        relatedSlugs: ["nexus", "lowkey"],
        timeline: [
          { years: "CAD", text: "Parametric modeling & tolerance testing", theme: "green" },
          { years: "Fabrication", text: "Multi-color printing & wood assembly", theme: "teal" },
          { years: "Release", text: "Published on MakerWorld & ws42.ca", theme: "blue" }
        ]
      }
    ]);

    const PROJECTS_BY_SLUG = Object.freeze(
      PROJECTS_CATALOG.reduce((acc, p) => {
        acc[p.slug] = p;
        return acc;
      }, {})
    );

    const countByCat = catId => catId === "all" ? PROJECTS_CATALOG.length : PROJECTS_CATALOG.filter(p => p.categories.includes(catId)).length;

    const CATEGORY_DEFS = Object.freeze([
      { id: "all", label: "All Builds", count: countByCat("all"), icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="5.5" height="5.5" rx="1.2"/><rect x="11.5" y="3" width="5.5" height="5.5" rx="1.2"/><rect x="3" y="11.5" width="5.5" height="5.5" rx="1.2"/><rect x="11.5" y="11.5" width="5.5" height="5.5" rx="1.2"/></svg>` },
      { id: "professional", label: "Professional Work", count: countByCat("professional"), icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.5" y="6" width="15" height="11" rx="2"/><path d="M7 6V4.5A1.5 1.5 0 0 1 8.5 3h3A1.5 1.5 0 0 1 13 4.5V6"/></svg>` },
      { id: "independent", label: "Independent Builds", count: countByCat("independent"), icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 2.5a5 5 0 0 0-3 9v2a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2a5 5 0 0 0-3-9Z"/><path d="M8 17h4"/></svg>` },
      { id: "insurance", label: "Insurance", count: countByCat("insurance"), icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 2.5 16.5 5v4.5c0 4.2-2.8 7.4-6.5 8.5-3.7-1.1-6.5-4.3-6.5-8.5V5L10 2.5Z"/></svg>` },
      { id: "data", label: "Integration & Data", count: countByCat("data"), icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><ellipse cx="10" cy="5" rx="6" ry="2.5"/><path d="M4 5v5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V5"/><path d="M4 10v5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5"/></svg>` },
      { id: "infra", label: "Infrastructure", count: countByCat("infra"), icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="14" height="5.5" rx="1.2"/><rect x="3" y="11.5" width="14" height="5.5" rx="1.2"/><circle cx="6" cy="5.75" r="0.8" fill="currentColor"/><circle cx="6" cy="14.25" r="0.8" fill="currentColor"/></svg>` },
      { id: "ai", label: "AI & Automation", count: countByCat("ai"), icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 2v3M10 15v3M2 10h3M15 10h3M4.9 4.9l2.1 2.1M13 13l2.1 2.1M15.1 4.9 13 7M7 13l-2.1 2.1"/><circle cx="10" cy="10" r="3"/></svg>` },
      { id: "web", label: "Web & Tools", count: countByCat("web"), icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.5" y="3.5" width="15" height="13" rx="2"/><path d="M2.5 7.5h15M7 12l-2 2 2 2M13 12l2 2-2 2"/></svg>` }
    ]);

    const STACK_TILE_SVGS = Object.freeze({
      sql: `<svg viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="8" fill="#e0f2fe"/><ellipse cx="14" cy="9" rx="6.5" ry="2.6" stroke="#0284c7" stroke-width="1.8"/><path d="M7.5 9v5c0 1.4 2.9 2.6 6.5 2.6s6.5-1.2 6.5-2.6V9" stroke="#0284c7" stroke-width="1.8"/><path d="M7.5 14v5c0 1.4 2.9 2.6 6.5 2.6s6.5-1.2 6.5-2.6v-5" stroke="#0284c7" stroke-width="1.8"/></svg>`,
      rulesEngine: `<svg viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="8" fill="#fee2e2"/><path d="M8 10h12M8 14h12M8 18h12" stroke="#ef4444" stroke-width="1.8" stroke-linecap="round"/><circle cx="11" cy="10" r="2" fill="#ffffff" stroke="#ef4444" stroke-width="1.8"/><circle cx="17" cy="14" r="2" fill="#ffffff" stroke="#ef4444" stroke-width="1.8"/><circle cx="12" cy="18" r="2" fill="#ffffff" stroke="#ef4444" stroke-width="1.8"/></svg>`,
      apis: `<svg viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="8" fill="#dbeafe"/><circle cx="9" cy="10" r="2.3" stroke="#2563eb" stroke-width="1.8"/><circle cx="19" cy="10" r="2.3" stroke="#2563eb" stroke-width="1.8"/><circle cx="14" cy="19" r="2.3" stroke="#2563eb" stroke-width="1.8"/><path d="M11.2 10.6h5.6M10.4 12l2.5 5M17.6 12l-2.5 5" stroke="#2563eb" stroke-width="1.7" stroke-linecap="round"/></svg>`,
      validation: `<svg viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="8" fill="#e0e7ff"/><path d="M14 6.5 20.5 9v4.8c0 4.2-2.8 7.3-6.5 8.7-3.7-1.4-6.5-4.5-6.5-8.7V9L14 6.5Z" stroke="#2563eb" stroke-width="1.8"/><path d="m11.3 14.2 1.9 1.9 3.8-3.8" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      reporting: `<svg viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="8" fill="#f3e8ff"/><rect x="6.5" y="7.5" width="15" height="13" rx="2.2" stroke="#9333ea" stroke-width="1.8"/><path d="M10.5 16.5v-3M14 16.5v-5.5M17.5 16.5v-4" stroke="#9333ea" stroke-width="2" stroke-linecap="round"/></svg>`
    });

    let activeProjectCategory = "all";
    let activeProjectSort = "featured";
    let activeProjectTag = "";
    let activeProjectSearch = "";
    let activeProjectViewMode = "grid";
    let selectedPreviewSlug = "renewals";
    let activePreviewTab = "overview";
    let activeHomeCategory = "all";

    function renderProjectCardHtml(proj, opts = {}) {
      const isSelected = opts.selectable && proj.slug === selectedPreviewSlug;
      const badgeClass = proj.badgeType === "INDEPENDENT" ? "proj-badge-independent" : "proj-badge-professional";
      const metricsHtml = proj.metrics && proj.metrics.length
        ? `
          <div class="proj-card-metrics">
            ${proj.metrics.map(m => `
              <div class="proj-card-metric-box">
                <strong>${m.val}</strong>
                <span>${m.label}</span>
              </div>
            `).join("")}
          </div>
        `
        : "";
      const tagsHtml = (proj.cardTags || []).slice(0, 3).map(t => `<span class="proj-card-tag">${t}</span>`).join("");

      return `
        <article class="proj-modern-card ${isSelected ? "is-selected" : ""}" data-proj-card="${proj.slug}">
          <a class="proj-card-banner-link" href="#projects/${proj.slug}" data-proj-link="${proj.slug}" aria-label="Open ${proj.title}">
            <img class="proj-card-banner-img" src="${proj.banner}" alt="${proj.title}" loading="lazy">
            <span class="proj-card-badge ${badgeClass}">${proj.badgeType}</span>
            <span class="proj-card-org">${proj.org}</span>
          </a>
          <div class="proj-card-body">
            <div class="proj-card-title-row">
              <h3 class="proj-card-title">
                <a href="#projects/${proj.slug}" data-proj-link="${proj.slug}">${proj.title}</a>
              </h3>
              <a class="proj-card-chevron" href="#projects/${proj.slug}" data-proj-link="${proj.slug}" aria-label="View ${proj.title}">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 4 4 4-4 4"/></svg>
              </a>
            </div>
            <p class="proj-card-desc">${proj.shortDesc}</p>
            ${metricsHtml}
            <div class="proj-card-tags">${tagsHtml}</div>
          </div>
        </article>
      `;
    }

    // 4A. Build Home Summarized Overview Sections (02 Featured Projects, 03 Career Journey, 04 Skills & Focus, 05 About, 06 Connect & Contact Form)
    const homeSection = document.querySelector('section[data-page="home"]');
    if (homeSection && !homeSection.querySelector(".home-summary-workbench")) {
      const homeSummaryEl = document.createElement("div");
      homeSummaryEl.className = "home-summary-workbench";
      homeSummaryEl.id = "home-featured-projects";
      homeSummaryEl.innerHTML = `
        <!-- SECTION 02 / FEATURED BUILDS CAROUSEL -->
        <section class="projects-carousel-section home-projects-carousel" aria-labelledby="home-sum-proj-heading" data-carousel-section tabindex="0">
          <canvas class="builds-webgl-cloud-canvas builds-webgl-cloud-canvas--back" data-builds-webgl-clouds="back" aria-hidden="true"></canvas>
          <canvas class="builds-webgl-cloud-canvas builds-webgl-cloud-canvas--front" data-builds-webgl-clouds="front" aria-hidden="true"></canvas>
          <div class="home-carousel-header">
            <div class="home-carousel-header-left">
              <p class="home-carousel-eyebrow">02 / FEATURED BUILDS</p>
              <h2 id="home-sum-proj-heading" class="home-carousel-title">Work that solves <span class="projects-carousel-gradient">real problems.</span></h2>
              <p class="home-carousel-subtitle">A mix of enterprise experience and independent builds.</p>
            </div>
            <a class="home-carousel-viewall" href="#projects">View all builds <span aria-hidden="true">&rarr;</span></a>
          </div>
          <div class="projects-carousel-stage" data-carousel-stage="home-stage"></div>
          <div class="projects-carousel-pagination-bar" data-carousel-pagination-bar>
            <div class="projects-carousel-dots" role="tablist" aria-label="Featured build slides" data-carousel-dots></div>
            <button type="button" class="carousel-autoplay-btn" data-carousel-autoplay-toggle aria-pressed="false" aria-label="Pause carousel auto-cycle" title="Pause auto-cycle (also pauses on hover)">
              <span class="carousel-autoplay-icon" data-carousel-autoplay-icon aria-hidden="true">
                <svg viewBox="0 0 16 16" fill="currentColor"><rect x="4" y="3.2" width="2.6" height="9.6" rx="0.8"/><rect x="9.4" y="3.2" width="2.6" height="9.6" rx="0.8"/></svg>
              </span>
              <span class="carousel-autoplay-label" data-carousel-autoplay-label>Pause</span>
            </button>
          </div>
        </section>

        <!-- UNIFIED CAREER (03) & SKILLS (04) SHARED TWO-UPPER-LEVELS BACKGROUND ZONE -->
        <div class="home-career-skills-unified-zone" data-cloud-glide-zone="career-skills">
          <div class="home-projects-bottom-cloud-transition" aria-hidden="true">
            ${renderVolumetricCloudBeltsHtml("proj-bottom-cloud")}
          </div>
          <div class="home-sum-level-backdrop home-sum-level-backdrop--two-upper-levels" aria-hidden="true">
            <div class="upper-levels-cutaway-frame">
              <img class="upper-levels-cutaway-img" src="assets/home-hero-final-frame.jpg" alt="" loading="lazy">
            </div>
            <div class="upper-level-floor upper-level-floor--clouds">
              <img src="assets/home-level-clouds.jpg" alt="" loading="lazy">
            </div>
            <div class="upper-level-floor upper-level-floor--business">
              <img src="assets/home-level-business.jpg" alt="" loading="lazy">
            </div>
            <div class="home-sum-level-scrim"></div>
          </div>

          <!-- SECTION 03 / CAREER JOURNEY (Compact 2-Column Showcase + 4 Era Cards + S-Wave Track) -->
          <section class="home-sum-section home-sum-career home-career-compact-showcase" id="home-career-section" aria-labelledby="home-sum-career-heading">
            <div class="home-sum-inner">
              <div class="home-career-compact-grid">
                <!-- Left Column: Narrative + CTAs -->
                <div class="home-career-compact-intro">
                  <p class="home-sum-eyebrow is-cyan">03 / CAREER JOURNEY</p>
                  <h2 id="home-sum-career-heading" class="home-career-stacked-title">
                    <span class="hl-white">Grounded in the metal.</span>
                    <span class="hl-gold">Shaped by the business.</span>
                    <span class="hl-white">Building in the cloud.</span>
                  </h2>
                  <p class="home-career-compact-lead">A continuous journey across infrastructure, insurance systems and AI &mdash; each layer building on the last.</p>
                  <div class="home-career-compact-actions">
                    <a class="home-skills-gold-cta" href="#career">
                      <span>View Full Timeline</span>
                      <span aria-hidden="true">&rarr;</span>
                    </a>
                    <button type="button" class="home-skills-watch-btn" data-career-watch-story>
                      <span class="home-skills-watch-ring" aria-hidden="true">&#9654;</span>
                      <span>Watch 1 min overview</span>
                    </button>
                  </div>
                </div>

                <!-- Right Column: 4 Era Cards + Glowing S-Wave Timeline Track -->
                <div class="home-career-compact-stage">
                  <div class="home-career-era-cards" role="list">
                    <!-- Card 1: 2006 - 2009 -->
                    <a class="home-career-era-card theme-blue" href="#career" data-home-career-step="metal" role="listitem">
                      <span class="era-card-years">2006 &ndash; 2009</span>
                      <h3 class="era-card-title">Hardware &amp; Support</h3>
                      <div class="era-card-thumb">
                        <img src="assets/proj-banner-headquarters.jpg" alt="Datacentre server racks and hardware infrastructure" loading="lazy">
                      </div>
                      <p class="era-card-desc">Dell Canada &mdash; hardware, support and technical foundations.</p>
                      <div class="era-card-pills">
                        <span>Infrastructure</span>
                        <span>Systems</span>
                        <span>Support</span>
                      </div>
                    </a>

                    <!-- Card 2: 2009 - 2022 -->
                    <a class="home-career-era-card theme-amber" href="#career" data-home-career-step="business" role="listitem">
                      <span class="era-card-years">2009 &ndash; 2022</span>
                      <h3 class="era-card-title">Insurance Systems</h3>
                      <div class="era-card-thumb">
                        <img src="assets/proj-banner-renewals.jpg" alt="Residential insurance property and underwriting rules" loading="lazy">
                      </div>
                      <p class="era-card-desc">Underwriting rules, broker integration, headquarters build and reporting.</p>
                      <div class="era-card-pills">
                        <span>Claims</span>
                        <span>Integration</span>
                        <span>P&amp;C</span>
                      </div>
                    </a>

                    <!-- Card 3: 2022 - Present -->
                    <a class="home-career-era-card theme-purple" href="#career" data-home-career-step="clouds" role="listitem">
                      <span class="era-card-years">2022 &ndash; Present</span>
                      <h3 class="era-card-title">AI &amp; Solution Design</h3>
                      <div class="era-card-thumb">
                        <img src="assets/proj-banner-nexus.jpg" alt="Enterprise claims analytics and NEXUS AI orchestration" loading="lazy">
                      </div>
                      <p class="era-card-desc">Enterprise claims analysis (Medavie) and AI orchestration (NEXUS).</p>
                      <div class="era-card-pills">
                        <span>AI Agents</span>
                        <span>Platform Design</span>
                        <span>Data</span>
                      </div>
                    </a>

                    <!-- Card 4: Always -->
                    <a class="home-career-era-card theme-emerald" href="#career" data-home-career-step="all" role="listitem">
                      <span class="era-card-years">Always</span>
                      <h3 class="era-card-title">Learning &amp; Building</h3>
                      <div class="era-card-thumb">
                        <img src="assets/personal/about-mechanical-pencils.jpg" alt="Curiosity, precision engineering and continuous building" loading="lazy">
                      </div>
                      <p class="era-card-desc">New tools, same curiosity, bigger possibilities.</p>
                      <div class="era-card-pills">
                        <span>Exploration</span>
                        <span>Open Source</span>
                        <span>Innovation</span>
                      </div>
                    </a>
                  </div>

                  <!-- Glowing Multi-Color S-Wave Track + 4 Nodes + Bottom Callouts -->
                  <div class="home-career-wave-track" aria-hidden="true">
                    <svg class="home-career-wave-svg" viewBox="0 0 1000 56" preserveAspectRatio="none" fill="none">
                      <defs>
                        <linearGradient id="careerWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.25"/>
                          <stop offset="12.5%" stop-color="#38bdf8"/>
                          <stop offset="37.5%" stop-color="#f4c542"/>
                          <stop offset="62.5%" stop-color="#a855f7"/>
                          <stop offset="87.5%" stop-color="#10b981"/>
                          <stop offset="100%" stop-color="#10b981" stop-opacity="0.25"/>
                        </linearGradient>
                      </defs>
                      <path d="M 0 36 C 60 36, 90 22, 125 22 C 190 22, 310 38, 375 38 C 440 38, 560 22, 625 22 C 690 22, 810 38, 875 38 C 915 38, 955 28, 1000 28" stroke="url(#careerWaveGrad)" stroke-width="4" stroke-linecap="round"/>
                    </svg>

                    <div class="home-career-wave-nodes">
                      <div class="wave-node-col theme-blue">
                        <span class="wave-node-ring"><span class="wave-node-dot"></span></span>
                        <div class="wave-node-label">
                          <span class="wave-node-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3.5" width="18" height="5" rx="1.4"/><rect x="3" y="9.5" width="18" height="5" rx="1.4"/><rect x="3" y="15.5" width="18" height="5" rx="1.4"/><circle cx="6.5" cy="6" r=".8" fill="currentColor"/><circle cx="6.5" cy="12" r=".8" fill="currentColor"/><circle cx="6.5" cy="18" r=".8" fill="currentColor"/></svg>
                          </span>
                          <strong>Grounded<br>in the metal.</strong>
                        </div>
                      </div>

                      <div class="wave-node-col theme-amber">
                        <span class="wave-node-ring"><span class="wave-node-dot"></span></span>
                        <div class="wave-node-label">
                          <span class="wave-node-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.8 19 5.8v5.6c0 5-3.2 8.6-7 10-3.8-1.4-7-5-7-10V5.8l7-3Z"/><circle cx="12" cy="11" r="2.2"/></svg>
                          </span>
                          <strong>Shaped<br>by the business.</strong>
                        </div>
                      </div>

                      <div class="wave-node-col theme-purple">
                        <span class="wave-node-ring"><span class="wave-node-dot"></span></span>
                        <div class="wave-node-label">
                          <span class="wave-node-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6.5 19h11a4.5 4.5 0 0 0 .7-8.9A6 6 0 0 0 6.8 8.2 4.5 4.5 0 0 0 6.5 19Z"/></svg>
                          </span>
                          <strong>Building<br>in the cloud.</strong>
                        </div>
                      </div>

                      <div class="wave-node-col theme-emerald">
                        <span class="wave-node-ring"><span class="wave-node-dot"></span></span>
                        <div class="wave-node-label">
                          <span class="wave-node-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><path d="M18.2 8c-2 0-3.4 1.5-6.2 5-2.8-3.5-4.2-5-6.2-5a4 4 0 0 0 0 8c2 0 3.4-1.5 6.2-5 2.8 3.5 4.2 5 6.2 5a4 4 0 0 0 0-8Z"/></svg>
                          </span>
                          <strong>Always<br>learning.</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Hidden legacy container kept empty so homepage Career section stays compact -->
              <div class="home-embedded-career-workbench" data-home-career-workbench hidden></div>
            </div>
          </section>

          <!-- SECTION 04 / SKILLS & FOCUS (Unified Redesign inside the same shared background zone) -->
          <section class="home-sum-section home-sum-skills" id="home-skills-section" aria-labelledby="home-sum-skills-heading">
            <div class="home-sum-inner home-skills-unified-hero" data-home-skills-hero></div>
            <div class="home-sum-inner home-embedded-skills-workbench" data-home-skills-workbench hidden></div>
          </section>
        </div>

        <!-- SECTION 05 / ABOUT -->
        <section class="home-sum-section home-sum-about" id="home-about-section" aria-labelledby="home-sum-about-heading">
          <div class="home-sum-inner home-sum-about-layout">
            <div class="home-sum-about-copy">
              <p class="home-sum-eyebrow">05 / ABOUT</p>
              <h2 id="home-sum-about-heading" class="home-sum-title">Curious by nature. Builder at heart.</h2>
              <p class="home-sum-about-body">I've always liked taking things apart to understand how they work &mdash; from toys and mechanical pencils as a kid to complex systems and AI today. I enjoy turning messy problems into clear plans and working with people to make useful things.</p>
              <a class="home-sum-link" href="#about">More about me <span aria-hidden="true">&rarr;</span></a>
            </div>

            <div class="home-sum-about-photos">
              <a class="home-sum-photo-card" href="#about" aria-label="About Josh — Early curiosity and taking things apart">
                <img src="assets/personal/about-kid-tinkering.jpg" alt="Taking apart electronics as a kid to see how they work" loading="lazy">
              </a>
              <a class="home-sum-photo-card" href="#about" aria-label="About Josh — Mechanical pencils and precision mechanisms">
                <img src="assets/personal/about-mechanical-pencils.jpg" alt="Disassembled mechanical pencils and internal components on a wooden desk" loading="lazy">
              </a>
              <a class="home-sum-photo-card" href="#about" aria-label="About Josh Boyer">
                <img src="assets/personal/josh-portrait-smiling.jpg" alt="Portrait of Josh Boyer smiling" loading="lazy">
              </a>
            </div>
          </div>
        </section>

        <!-- SECTION 06 / LET'S BUILD SOMETHING USEFUL + CONTACT FORM FOR CONNECTIONS -->
        <section class="home-sum-connect" id="home-connect" aria-labelledby="home-sum-connect-heading">
          <div class="home-sum-connect-backdrop" aria-hidden="true">
            <img src="assets/home-level-metal.jpg" alt="" loading="lazy">
            <div class="home-sum-connect-scrim"></div>
          </div>

          <div class="home-sum-inner home-sum-connect-layout">
            <div class="home-sum-connect-left">
              <p class="home-sum-eyebrow home-sum-eyebrow--light">06 / LET'S BUILD SOMETHING USEFUL</p>
              <h2 id="home-sum-connect-heading" class="home-sum-connect-title">Open to opportunities and collaborations.</h2>
              <p class="home-sum-connect-lead">Whether it's insurance, integration, infrastructure or AI &mdash; I'm always interested in solving real problems with good people.</p>

              <div class="home-sum-connect-pillars">
                <div class="home-sum-connect-pillar">
                  <span class="home-sum-connect-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>
                  </span>
                  <strong>20+</strong>
                  <span>Years in tech<br>(16 in insurance)</span>
                </div>

                <div class="home-sum-connect-pillar">
                  <span class="home-sum-connect-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/><line x1="14" y1="4" x2="10" y2="20"/></svg>
                  </span>
                  <strong>Real-world</strong>
                  <span>Enterprise &amp; hands-on experience</span>
                </div>

                <div class="home-sum-connect-pillar">
                  <span class="home-sum-connect-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </span>
                  <strong>Builder,</strong>
                  <span>problem solver,<br>team player</span>
                </div>
              </div>

              <div class="home-sum-connect-ctas">
                <a class="home-connect-primary-btn" href="#home-connect-form" data-home-focus-contact>
                  <span>Let's connect</span>
                  <span aria-hidden="true">&rarr;</span>
                </a>
                <a class="home-connect-secondary-btn" href="resume.html">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><rect x="3.5" y="2.5" width="13" height="15" rx="2"/><path d="M7 6.5h6M7 10h6M7 13.5h4"/></svg>
                  <span>Tailored R&eacute;sum&eacute;</span>
                </a>
              </div>
            </div>

            <div class="home-sum-connect-right">
              <form class="home-connect-form-card" id="home-connect-form" data-home-contact-form novalidate>
                <div class="home-connect-form-header">
                  <div>
                    <span class="home-connect-form-kicker">DIRECT CONNECTION</span>
                    <h3>Send a connection note</h3>
                  </div>
                  <span class="home-connect-status-pill">Ottawa &middot; Remote / Hybrid</span>
                </div>

                <div class="home-connect-form-row">
                  <label class="home-connect-field">
                    <span>Your name</span>
                    <input type="text" name="name" placeholder="Alex Morgan" required autocomplete="name" data-contact-name>
                  </label>
                  <label class="home-connect-field">
                    <span>Email or LinkedIn</span>
                    <input type="text" name="contact" placeholder="alex@company.com" required autocomplete="email" data-contact-reply>
                  </label>
                </div>

                <div class="home-connect-field">
                  <span>What are we connecting about?</span>
                  <div class="home-connect-topic-pills" role="group" aria-label="Connection topic">
                    <button type="button" class="home-topic-pill is-active" aria-pressed="true" data-contact-topic="Solution Architecture">Solution Architecture</button>
                    <button type="button" class="home-topic-pill" aria-pressed="false" data-contact-topic="Insurance & Integration">Insurance &amp; Integration</button>
                    <button type="button" class="home-topic-pill" aria-pressed="false" data-contact-topic="AI & Automation">AI &amp; Automation</button>
                    <button type="button" class="home-topic-pill" aria-pressed="false" data-contact-topic="Collaboration">Collaboration</button>
                  </div>
                </div>

                <label class="home-connect-field">
                  <span>Message or problem context</span>
                  <textarea name="message" rows="3" placeholder="Tell me a bit about the team, role, or problem you're working on..." required data-contact-message></textarea>
                </label>

                <div class="home-connect-form-footer">
                  <button type="submit" class="home-connect-submit-btn">
                    <span>Prepare &amp; Send Connection</span>
                    <span aria-hidden="true">&rarr;</span>
                  </button>
                  <span class="home-connect-privacy-note">Formats a ready-to-send note &amp; copies to your clipboard.</span>
                </div>

                <div class="home-connect-feedback" data-contact-feedback hidden aria-live="polite"></div>
              </form>
            </div>
          </div>
        </section>
      `;
      homeSection.append(homeSummaryEl);
    }

    function renderHomeFeaturedCards() {}

    // 4B. Build the Projects Carousel + Chronological Collection on section[data-page="projects"]
    const FEATURED_CAROUSEL_SLIDES = Object.freeze([
      {
        slug: "renewals",
        featuredRank: 1,
        eyebrowType: "PROFESSIONAL WORK",
        employerOrProduct: "Grenville Mutual Insurance",
        title: "Renewal Eligibility & Underwriting Automation",
        titleLead: "Renewal Eligibility & Underwriting",
        titleAccent: "Automation",
        peekBadge: "FEATURED",
        peekBadgeTheme: "amber",
        peekTitle: "Renewal Eligibility & Automation",
        peekDesc: "Designed and implemented automated renewal workflows with business rules, validation and exception routing for P&C lines.",
        stripBadge: "FEATURED",
        stripBadgeTheme: "amber",
        stripTitle: "Renewal Eligibility & Underwriting Automation",
        stripSub: "Grenville Mutual Insurance",
        summary: "Designed and implemented automated renewal workflows with business rules, validation and exception handling for P&C lines.",
        banner: "assets/proj-banner-renewals.jpg",
        tags: ["Insurance", "Underwriting", "Business Rules", "Automation", "Integration"],
        metrics: [
          {
            val: "~80%",
            label: "Residential",
            sub: "Approx. user-reported renewal-only automation",
            icon: "trend",
            theme: "emerald",
            gaugePct: 80
          },
          {
            val: "~60%",
            label: "Commercial",
            sub: "Approx. user-reported renewal-only automation",
            icon: "clock",
            theme: "blue",
            gaugePct: 60
          },
          {
            val: "~40%",
            label: "Farm / Agri",
            sub: "Approx. user-reported renewal-only automation",
            icon: "db",
            theme: "amber",
            gaugePct: 40
          }
        ],
        metricsQualifier: "Approx. user-reported renewal-only automation · exceptions refer to underwriters",
        floatingCard: {
          title: "Renewal Decision",
          badge: "Conceptual illustration",
          status: "Eligible for Auto-Renewal",
          statusTheme: "green",
          gaugeVal: "80%",
          gaugeLabel: "Res. Renewal",
          gaugePct: 80,
          gaugeTheme: "emerald",
          rows: [
            { icon: "user", label: "Risk Profile", val: "Low", theme: "green" },
            { icon: "shield", label: "Property Data", val: "Verified", theme: "green" },
            { icon: "home", label: "Claims History", val: "Clear", theme: "green" },
            { icon: "doc", label: "Business Rules", val: "Passed", theme: "green" }
          ]
        },
        secondaryHud: {
          title: "Risk Analysis",
          gaugePct: 84,
          items: [
            "Roof condition",
            "Proximity to water",
            "Vegetation risk",
            "Claims history",
            "Compliance"
          ],
          pill: "Medium Risk"
        },
        quickFacts: {
          role: "Framework design & hands-on P&C rating and underwriting rules implementation",
          period: "Within Grenville tenure (2009–2022) · exact project dates not established",
          deliverable: "Line-specific renewal eligibility classification with deliberate underwriter referral paths"
        }
      },
      {
        slug: "nexus",
        featuredRank: 2,
        eyebrowType: "INDEPENDENT BUILD",
        employerOrProduct: "Independent Capstone",
        title: "NEXUS — AI Orchestration Platform",
        titleLead: "NEXUS — AI",
        titleAccent: "Orchestration Platform",
        peekBadge: "INDEPENDENT BUILD",
        peekBadgeTheme: "cyan",
        peekTitle: "NEXUS — AI Orchestration Platform",
        peekDesc: "Building a multi-agent platform for planning, execution and evaluation.",
        stripBadge: "AI PLATFORM",
        stripBadgeTheme: "blue",
        stripTitle: "NEXUS — AI Orchestration Platform",
        stripSub: "Independent Build",
        summary: "Building an independent multi-agent platform for planning, scoped context compilation, execution and evaluation.",
        banner: "assets/proj-banner-nexus.jpg",
        tags: ["AI Agents", "Orchestration", "TypeScript", "Scoped Context", "Evaluation"],
        metrics: [
          {
            val: "Active",
            label: "Independent Build",
            sub: "Current technical capstone · not an employer product",
            icon: "trend",
            theme: "emerald",
            gaugePct: 96
          },
          {
            val: "4-Stage",
            label: "Context · Plan · Run",
            sub: "Scoped context compilation & durable runner",
            icon: "clock",
            theme: "blue",
            gaugePct: 92
          },
          {
            val: "Receipts",
            label: "Evaluation Gates",
            sub: "Deterministic + semantic LLM verification",
            icon: "db",
            theme: "amber",
            gaugePct: 94
          }
        ],
        metricsQualifier: "Independent platform in active development · not an employer product",
        floatingCard: {
          title: "NEXUS Orchestration Run",
          badge: "Conceptual illustration",
          status: "Scoped Context & Plan Verified",
          statusTheme: "blue",
          gaugeVal: "4/4",
          gaugeLabel: "Gate Stages",
          gaugePct: 98,
          gaugeTheme: "blue",
          rows: [
            { icon: "user", label: "Context Bundle", val: "Scoped", theme: "blue" },
            { icon: "shield", label: "Model Routing", val: "Constrained", theme: "blue" },
            { icon: "home", label: "Node Execution", val: "Recoverable", theme: "green" },
            { icon: "doc", label: "Audit Receipt", val: "Recorded", theme: "green" }
          ]
        },
        secondaryHud: {
          title: "Verification Gates",
          gaugePct: 96,
          items: [
            "Scoped context packet",
            "DAG dependency check",
            "Tool-call sandbox",
            "Deterministic assertions",
            "Receipt persisted"
          ],
          pill: "Run Verified"
        },
        quickFacts: {
          role: "Independent architecture, design & full-stack TypeScript/React/Node implementation",
          period: "Active development (2022–Present alongside employment)",
          deliverable: "Headless orchestration core, React/Vite workbench, durable runner & evaluation gates"
        }
      },
      {
        slug: "takeover",
        featuredRank: 3,
        eyebrowType: "PROFESSIONAL WORK",
        employerOrProduct: "Medavie Blue Cross",
        title: "Takeover-History Validation & XML Loading",
        titleLead: "Takeover-History Validation &",
        titleAccent: "XML Loading",
        peekBadge: "DATA & ETL",
        peekBadgeTheme: "emerald",
        peekTitle: "Takeover-History & XML Loading",
        peekDesc: "Researched, documented and guided reusable Excel/VB/XML tooling for validation, batch preparation and reconciliation.",
        stripBadge: "DATA & ETL",
        stripBadgeTheme: "emerald",
        stripTitle: "Takeover-History Validation & XML Loading",
        stripSub: "Medavie Blue Cross",
        summary: "Researched, documented and guided production-adopted Excel/VB/XML tooling for validation, transformation, batch preparation and error reconciliation.",
        banner: "assets/proj-banner-takeover.jpg",
        tags: ["Health & Dental", "Excel / VB", "XML Schema", "ETL", "Reconciliation"],
        metrics: [
          {
            val: "Prod",
            label: "Team-Adopted",
            sub: "Reusable onboarding tool adopted by team",
            icon: "trend",
            theme: "emerald",
            gaugePct: 95
          },
          {
            val: "Excel/VB",
            label: "Validation Rules",
            sub: "Pre-load data checks & transformation",
            icon: "clock",
            theme: "blue",
            gaugePct: 90
          },
          {
            val: "XML/XSD",
            label: "Batch Balancing",
            sub: "Schema-aligned adjudication load & reconciliation",
            icon: "db",
            theme: "amber",
            gaugePct: 94
          }
        ],
        metricsQualifier: "Solution research, documentation & tooling guidance · schema updates coded by dev team",
        floatingCard: {
          title: "Takeover XML Load",
          badge: "Conceptual illustration",
          status: "Validated for Batch Load",
          statusTheme: "green",
          gaugeVal: "XSD",
          gaugeLabel: "Schema Match",
          gaugePct: 95,
          gaugeTheme: "emerald",
          rows: [
            { icon: "user", label: "Prior-Carrier File", val: "Normalized", theme: "green" },
            { icon: "shield", label: "Excel / VB Checks", val: "Passed", theme: "green" },
            { icon: "home", label: "XML Schema (XSD)", val: "Matched", theme: "green" },
            { icon: "doc", label: "Benefit Balances", val: "Reconciled", theme: "green" }
          ]
        },
        secondaryHud: {
          title: "Batch Reconciliation",
          gaugePct: 94,
          items: [
            "Member ID mapping",
            "Benefit accumulator totals",
            "Prior-carrier codes",
            "XSD schema compliance",
            "Exception log clean"
          ],
          pill: "Batch Ready"
        },
        quickFacts: {
          role: "Solution research, gap documentation, development guidance & end-user Excel/VB tooling",
          period: "Within Medavie tenure (2022–Present) · exact project date not established",
          deliverable: "Production-adopted onboarding template generating validated adjudication XML"
        }
      },
      {
        slug: "newbusiness",
        featuredRank: 4,
        eyebrowType: "PROFESSIONAL WORK",
        employerOrProduct: "Grenville Mutual Insurance",
        title: "Broker-Native New Business Integration",
        titleLead: "Broker-Native New Business",
        titleAccent: "Integration",
        peekBadge: "INTEGRATION",
        peekBadgeTheme: "purple",
        peekTitle: "Broker-Native Integration",
        peekDesc: "Connected broker workflows with real-time validation and insurance rules.",
        stripBadge: "INTEGRATION",
        stripBadgeTheme: "purple",
        stripTitle: "Broker-Native Business Integration",
        stripSub: "Insurance Systems",
        summary: "Connected broker workflows with P&C rating, underwriting validation, correction guidance, referral routing and binding decisions.",
        banner: "assets/proj-banner-newbusiness.jpg",
        tags: ["Insurance", "Broker Workflows", "CSIO / XML", "Business Rules", "Integration"],
        metrics: [
          {
            val: "Specs",
            label: "UI & Workflow",
            sub: "Requirements alongside vendor/dev portal UI",
            icon: "trend",
            theme: "emerald",
            gaugePct: 92
          },
          {
            val: "CSIO/XML",
            label: "Field Mapping",
            sub: "Broker BMS payload & value translation",
            icon: "clock",
            theme: "blue",
            gaugePct: 94
          },
          {
            val: "3-Path",
            label: "Correct · Refer · Bind",
            sub: "Actionable portal feedback & routing",
            icon: "db",
            theme: "amber",
            gaugePct: 90
          }
        ],
        metricsQualifier: "Requirements, mapping & rules implementation alongside vendor/developer UI",
        floatingCard: {
          title: "Broker Submission Gate",
          badge: "Conceptual illustration",
          status: "Eligible to Bind or Refer",
          statusTheme: "green",
          gaugeVal: "3-Path",
          gaugeLabel: "Rule Gate",
          gaugePct: 93,
          gaugeTheme: "emerald",
          rows: [
            { icon: "user", label: "Broker Payload", val: "CSIO / XML", theme: "blue" },
            { icon: "shield", label: "Required Inputs", val: "Complete", theme: "green" },
            { icon: "home", label: "Rating & Rules", val: "Evaluated", theme: "green" },
            { icon: "doc", label: "Portal Message", val: "Actionable", theme: "green" }
          ]
        },
        secondaryHud: {
          title: "Submission Checks",
          gaugePct: 92,
          items: [
            "CSIO XML schema valid",
            "Coverage limits aligned",
            "Underwriting rules pass",
            "Correction hints mapped",
            "Bind / refer decision"
          ],
          pill: "Portal Ready"
        },
        quickFacts: {
          role: "Requirements, field/value mapping, UI specifications & hands-on P&C rules implementation",
          period: "Within Grenville tenure (2009–2022) · overlapping broker integration stream",
          deliverable: "Rules-to-portal messaging framework for correction, underwriter referral or bind"
        }
      },
      {
        slug: "continuity",
        featuredRank: 5,
        eyebrowType: "PROFESSIONAL WORK",
        employerOrProduct: "Medavie Blue Cross",
        title: "Claims Reporting & Data Continuity",
        titleLead: "Claims Reporting &",
        titleAccent: "Data Continuity",
        peekBadge: "ETL & REPORTING",
        peekBadgeTheme: "emerald",
        peekTitle: "Claims Reporting & Continuity",
        peekDesc: "Uncovered a hidden daily flat-file ETL dependency and completed continuity analysis and mapping.",
        stripBadge: "ETL & REPORTING",
        stripBadgeTheme: "emerald",
        stripTitle: "Claims Reporting & Data Continuity",
        stripSub: "Medavie Blue Cross",
        summary: "Traced a supposed reporting request to a daily legacy flat-file ETL pipeline and completed the end-to-end continuity analysis and mapping for claims migration.",
        banner: "assets/proj-banner-continuity.jpg",
        tags: ["SQL", "Cognos", "Flat-File ETL", "Continuity Design", "Reporting"],
        metrics: [
          {
            val: "Daily",
            label: "Flat-File Contract",
            sub: "Legacy COBOL/InterBlue extract traced & mapped",
            icon: "trend",
            theme: "emerald",
            gaugePct: 92
          },
          {
            val: "Cognos",
            label: "Downstream Feed",
            sub: "Preserved client reporting data dependencies",
            icon: "clock",
            theme: "blue",
            gaugePct: 88
          },
          {
            val: "2-Track",
            label: "Continuity + Modern",
            sub: "Design completed · modernization proposed",
            icon: "db",
            theme: "amber",
            gaugePct: 86
          }
        ],
        metricsQualifier: "Completed analysis & continuity design · service implementation unconfirmed · modernization proposed",
        floatingCard: {
          title: "ETL Continuity Spec",
          badge: "Conceptual illustration",
          status: "Continuity Mapping Complete",
          statusTheme: "blue",
          gaugeVal: "Daily",
          gaugeLabel: "ETL Contract",
          gaugePct: 91,
          gaugeTheme: "blue",
          rows: [
            { icon: "user", label: "Legacy Extract", val: "COBOL / Flat-File", theme: "blue" },
            { icon: "shield", label: "Field Mapping", val: "Completed", theme: "green" },
            { icon: "home", label: "Client Cognos", val: "Preserved", theme: "green" },
            { icon: "doc", label: "Modernization", val: "Proposed", theme: "blue" }
          ]
        },
        secondaryHud: {
          title: "Continuity Checkpoints",
          gaugePct: 90,
          items: [
            "Hidden ETL dependency found",
            "Source-to-flat-file mapping",
            "Downstream Cognos fields",
            "REST extract design",
            "Modernization proposal"
          ],
          pill: "Design Complete"
        },
        quickFacts: {
          role: "Current-state investigation, field-by-field continuity mapping & modernization proposal",
          period: "Within Medavie tenure (2022–Present) · service implementation & go-live unconfirmed",
          deliverable: "End-to-end REST-to-flat-file continuity specification & modern reporting exchange proposal"
        }
      },
      {
        slug: "claims",
        featuredRank: 6,
        eyebrowType: "PROFESSIONAL WORK",
        employerOrProduct: "Medavie Blue Cross",
        title: "Provider Data for Claims Adjudication",
        titleLead: "Provider Data for",
        titleAccent: "Claims Adjudication",
        peekBadge: "SOLUTION REVIEW",
        peekBadgeTheme: "purple",
        peekTitle: "Provider Data Synchronization",
        peekDesc: "Solution review, gap analysis, field mappings and scheduled synchronization requirements.",
        stripBadge: "PROVIDER SYNC",
        stripBadgeTheme: "purple",
        stripTitle: "Provider Data for Claims Adjudication",
        stripSub: "Medavie Blue Cross",
        summary: "Defined provider integration requirements, gap analysis and field mappings connecting source provider registries to claims adjudication via scheduled event tables and REST.",
        banner: "assets/proj-banner-claims.jpg",
        tags: ["Provider Registry", "REST Consumer", "Scheduled Sync", "Field Mapping", "Claims"],
        metrics: [
          {
            val: "Review",
            label: "Architecture & Gaps",
            sub: "Reviewed integration design alongside architects",
            icon: "trend",
            theme: "emerald",
            gaugePct: 88
          },
          {
            val: "Mapping",
            label: "Source-to-Claims",
            sub: "Provider credentials, specialty & status rules",
            icon: "clock",
            theme: "blue",
            gaugePct: 90
          },
          {
            val: "REST+SQL",
            label: "Scheduled Sync",
            sub: "Event-table & REST retrieval requirements",
            icon: "db",
            theme: "amber",
            gaugePct: 87
          }
        ],
        metricsQualifier: "Solution review, mapping & sync requirements · scheduled event table & REST consumer",
        floatingCard: {
          title: "Provider Sync Spec",
          badge: "Conceptual illustration",
          status: "Requirements & Mappings Defined",
          statusTheme: "blue",
          gaugeVal: "Sync",
          gaugeLabel: "Event + REST",
          gaugePct: 88,
          gaugeTheme: "blue",
          rows: [
            { icon: "user", label: "Provider Source", val: "Registry Mapped", theme: "green" },
            { icon: "shield", label: "Trigger Model", val: "Event Table", theme: "blue" },
            { icon: "home", label: "Consumer Fetch", val: "REST Retrieval", theme: "blue" },
            { icon: "doc", label: "Adjudication", val: "Aligned", theme: "green" }
          ]
        },
        secondaryHud: {
          title: "Alignment Scope",
          gaugePct: 88,
          items: [
            "Architecture gap analysis",
            "Specialty & license codes",
            "Effective status windows",
            "Scheduled event table spec",
            "REST consumer payload"
          ],
          pill: "Spec Reviewed"
        },
        quickFacts: {
          role: "Functional analyst conducting solution review, gap analysis, field mappings & sync requirements",
          period: "Within Medavie tenure (2022–Present)",
          deliverable: "Source-to-adjudication provider field mappings & scheduled event-table/REST requirements"
        }
      },
      {
        slug: "sql",
        featuredRank: 7,
        eyebrowType: "PROFESSIONAL WORK",
        employerOrProduct: "Medavie Blue Cross",
        title: "Claims SQL & Financial Reconciliation",
        titleLead: "Claims SQL & Financial",
        titleAccent: "Reconciliation",
        peekBadge: "SQL & FINANCE",
        peekBadgeTheme: "emerald",
        peekTitle: "Claims SQL & Reconciliation",
        peekDesc: "Hand-written SQL queries, financial report logic analysis and claims reconciliation.",
        stripBadge: "SQL & FINANCE",
        stripBadgeTheme: "emerald",
        stripTitle: "Claims SQL & Financial Reconciliation",
        stripSub: "Medavie Blue Cross",
        summary: "Wrote complex hand-written SQL to trace financial report logic, isolate discrepancies and reconcile claims data against downstream accounting reports.",
        banner: "assets/proj-banner-sql.jpg",
        tags: ["Hand-Written SQL", "Reconciliation", "Financial Reporting", "Claims Data", "Data Quality"],
        metrics: [
          {
            val: "SQL",
            label: "Hand-Written Queries",
            sub: "Direct multi-table relational analysis",
            icon: "trend",
            theme: "emerald",
            gaugePct: 94
          },
          {
            val: "Logic",
            label: "Report Deconstruction",
            sub: "Traced reversals, cutoffs & status rules",
            icon: "clock",
            theme: "blue",
            gaugePct: 90
          },
          {
            val: "Balanced",
            label: "Finance Alignment",
            sub: "Reconciled claims extracts with accounting",
            icon: "db",
            theme: "amber",
            gaugePct: 92
          }
        ],
        metricsQualifier: "Hands-on diagnostic & reconciliation SQL across enterprise claims and finance tables",
        floatingCard: {
          title: "SQL Ledger Balance",
          badge: "Conceptual illustration",
          status: "Extracts Reconciled to Finance",
          statusTheme: "green",
          gaugeVal: "100%",
          gaugeLabel: "Rule Trace",
          gaugePct: 93,
          gaugeTheme: "emerald",
          rows: [
            { icon: "user", label: "Claims Joins", val: "Multi-Table SQL", theme: "blue" },
            { icon: "shield", label: "Reversal Logic", val: "Isolated", theme: "green" },
            { icon: "home", label: "Cutoff Windows", val: "Verified", theme: "green" },
            { icon: "doc", label: "Finance Totals", val: "Balanced", theme: "green" }
          ]
        },
        secondaryHud: {
          title: "Reconciliation Checks",
          gaugePct: 92,
          items: [
            "Multi-table relational joins",
            "Void & reversal handling",
            "Financial cutoff alignment",
            "Variance root-cause trace",
            "Extract totals balanced"
          ],
          pill: "Ledger Verified"
        },
        quickFacts: {
          role: "Personally wrote diagnostic/reconciliation SQL and documented financial report business logic",
          period: "Within Medavie tenure (2022–Present)",
          deliverable: "Repeatable SQL reconciliation scripts and verified claims-to-finance report rules"
        }
      },
      {
        slug: "workflows",
        featuredRank: 8,
        eyebrowType: "PROFESSIONAL WORK",
        employerOrProduct: "Grenville Mutual Insurance",
        title: "Commercial Quoting & Broker Integration",
        titleLead: "Commercial Quoting &",
        titleAccent: "Broker Integration",
        peekBadge: "COMMERCIAL P&C",
        peekBadgeTheme: "purple",
        peekTitle: "Commercial Quoting & BMS",
        peekDesc: "Designed commercial quoting rules, CSIO/ACORD payload mappings and two-way broker integration.",
        stripBadge: "COMMERCIAL P&C",
        stripBadgeTheme: "purple",
        stripTitle: "Commercial Quoting & Broker Integration",
        stripSub: "Grenville Mutual Insurance",
        summary: "Connected commercial quoting requirements, CSIO/ACORD payload transformations and backend underwriting rules across TAM and Epic broker integrations.",
        banner: "assets/proj-banner-workflows.jpg",
        tags: ["Commercial Lines", "CSIO / ACORD", "XML & eDocs", "Business Rules", "TAM & Epic"],
        metrics: [
          {
            val: "2-Way",
            label: "Upload & Download",
            sub: "Bidirectional BMS request & document flows",
            icon: "trend",
            theme: "emerald",
            gaugePct: 91
          },
          {
            val: "CSIO",
            label: "XML · eDocs · AL3",
            sub: "Cross-vendor payload & value mappings",
            icon: "clock",
            theme: "blue",
            gaugePct: 93
          },
          {
            val: "4-Line",
            label: "Auto · Res · Farm · Comm",
            sub: "Personally implemented core P&C rules",
            icon: "db",
            theme: "amber",
            gaugePct: 89
          }
        ],
        metricsQualifier: "Core policy rules implementation, CSIO mapping & vendor coordination (TAM/Epic/Bravado)",
        floatingCard: {
          title: "Commercial Quote Gate",
          badge: "Conceptual illustration",
          status: "Two-Way BMS Flow Validated",
          statusTheme: "green",
          gaugeVal: "2-Way",
          gaugeLabel: "CSIO / XML",
          gaugePct: 91,
          gaugeTheme: "emerald",
          rows: [
            { icon: "user", label: "Broker System", val: "TAM / Epic", theme: "blue" },
            { icon: "shield", label: "CSIO Mapping", val: "Aligned", theme: "green" },
            { icon: "home", label: "Commercial Rules", val: "Evaluated", theme: "green" },
            { icon: "doc", label: "eDocs / AL3", val: "Delivered", theme: "green" }
          ]
        },
        secondaryHud: {
          title: "Broker Integration Scope",
          gaugePct: 91,
          items: [
            "Commercial risk inputs",
            "CSIO / ACORD XML mapping",
            "Bravado / BMS routing",
            "Rating & referral rules",
            "eDocs & AL3 download"
          ],
          pill: "BMS Connected"
        },
        quickFacts: {
          role: "Personally implemented policy rating/underwriting rules and defined CSIO mappings & UI stages",
          period: "Within Grenville tenure (2009–2022)",
          deliverable: "Two-way broker upload/download mappings and commercial quoting rule engine logic"
        }
      },
      {
        slug: "upload",
        featuredRank: 9,
        eyebrowType: "PROFESSIONAL WORK",
        employerOrProduct: "Grenville Mutual Insurance",
        title: "Authenticated Document Upload Portal",
        titleLead: "Authenticated Document",
        titleAccent: "Upload Portal",
        peekBadge: "C# / .NET + REST",
        peekBadgeTheme: "cyan",
        peekTitle: "Document Upload Portal",
        peekDesc: "Built a C#/.NET and REST portal for external adjusters to attach documents directly into policy records.",
        stripBadge: "C# / .NET PORTAL",
        stripBadgeTheme: "blue",
        stripTitle: "Authenticated Document Upload Portal",
        stripSub: "Grenville · Approx. 2018",
        summary: "Developed an authenticated C#/.NET and REST submission portal placing adjuster documents directly into backend policy records, paired with internal log diagnostics.",
        banner: "assets/proj-banner-upload.jpg",
        tags: ["C# / .NET", "REST API", "Bootstrap / JS", "Operational Logging", "Support Tooling"],
        metrics: [
          {
            val: ".NET",
            label: "Authenticated Portal",
            sub: "Replaced ad-hoc adjuster email attachments",
            icon: "trend",
            theme: "emerald",
            gaugePct: 90
          },
          {
            val: "REST",
            label: "Direct Record Attach",
            sub: "Placed PDFs & photos into policy records",
            icon: "clock",
            theme: "blue",
            gaugePct: 92
          },
          {
            val: "Log Tool",
            label: "Support Diagnostics",
            sub: "Built-in internal log search & triage utility",
            icon: "db",
            theme: "amber",
            gaugePct: 88
          }
        ],
        metricsQualifier: "Hands-on C#/.NET, Bootstrap & REST implementation · Approx. 2018 within Grenville tenure",
        floatingCard: {
          title: "Document Intake Gate",
          badge: "Conceptual illustration",
          status: "Attached to Policy Record",
          statusTheme: "green",
          gaugeVal: "REST",
          gaugeLabel: "Direct Attach",
          gaugePct: 90,
          gaugeTheme: "emerald",
          rows: [
            { icon: "user", label: "Adjuster Auth", val: "Verified", theme: "green" },
            { icon: "shield", label: "File Payload", val: "PDF / Photos", theme: "blue" },
            { icon: "home", label: "REST Placement", val: "Policy Record", theme: "green" },
            { icon: "doc", label: "Diagnostic Log", val: "Indexed", theme: "green" }
          ]
        },
        secondaryHud: {
          title: "Portal & Log Checks",
          gaugePct: 89,
          items: [
            "Authenticated adjuster session",
            "Policy record lookup",
            "REST attachment commit",
            "Operational event logging",
            "Support log-search query"
          ],
          pill: "Portal Live"
        },
        quickFacts: {
          role: "Personally developed the C#/.NET & Bootstrap portal, REST integration and internal log-search tool",
          period: "Approx. 2018 (within Grenville 2009–2022 tenure)",
          deliverable: "Production adjuster upload portal and internal support log diagnostic utility"
        }
      },
      {
        slug: "changes",
        featuredRank: 10,
        eyebrowType: "PROFESSIONAL WORK",
        employerOrProduct: "Grenville Mutual Insurance",
        title: "Policy-Change Comparison & Validation",
        titleLead: "Policy-Change Comparison &",
        titleAccent: "Validation",
        peekBadge: "ENDORSEMENTS",
        peekBadgeTheme: "amber",
        peekTitle: "Policy-Change Validation",
        peekDesc: "Built endorsement comparison workflows and context-aware validation rules before submission.",
        stripBadge: "ENDORSEMENTS",
        stripBadgeTheme: "amber",
        stripTitle: "Policy-Change Comparison & Validation",
        stripSub: "Grenville Mutual Insurance",
        summary: "Designed policy-change comparison workflows and contextual validation rules that distinguished endorsements from new business and renewals.",
        banner: "assets/proj-banner-changes.jpg",
        tags: ["Endorsements", "Delta Comparison", "Validation Rules", "Broker Portal", "P&C Insurance"],
        metrics: [
          {
            val: "Pre-Submit",
            label: "Delta Comparison",
            sub: "Side-by-side before/after policy state view",
            icon: "trend",
            theme: "emerald",
            gaugePct: 88
          },
          {
            val: "Context",
            label: "Endorsement Rules",
            sub: "Distinct from new business & renewal gates",
            icon: "clock",
            theme: "blue",
            gaugePct: 90
          },
          {
            val: "3-Path",
            label: "Correct · Refer · Bind",
            sub: "Transaction-specific portal feedback",
            icon: "db",
            theme: "amber",
            gaugePct: 87
          }
        ],
        metricsQualifier: "Endorsement rule implementation, payload mapping & pre-submission comparison design",
        floatingCard: {
          title: "Endorsement Delta Gate",
          badge: "Conceptual illustration",
          status: "Change Delta Validated",
          statusTheme: "green",
          gaugeVal: "Delta",
          gaugeLabel: "Before / After",
          gaugePct: 88,
          gaugeTheme: "emerald",
          rows: [
            { icon: "user", label: "Baseline State", val: "Active Policy", theme: "blue" },
            { icon: "shield", label: "Proposed Delta", val: "Isolated", theme: "green" },
            { icon: "home", label: "Context Rules", val: "Endorsement", theme: "green" },
            { icon: "doc", label: "Submission Path", val: "Ready to Bind", theme: "green" }
          ]
        },
        secondaryHud: {
          title: "Delta Verification",
          gaugePct: 88,
          items: [
            "Active vs. proposed diff",
            "Effective date validation",
            "Coverage limit delta check",
            "Endorsement rule context",
            "Underwriter referral gate"
          ],
          pill: "Delta Verified"
        },
        quickFacts: {
          role: "Analysis, endorsement validation/rating rules implementation & change-comparison design",
          period: "Within Grenville tenure (2009–2022)",
          deliverable: "Pre-submission policy change comparison workflow & endorsement-specific rule set"
        }
      },
      {
        slug: "inquiry",
        featuredRank: 11,
        eyebrowType: "PROFESSIONAL WORK",
        employerOrProduct: "Grenville Mutual Insurance",
        title: "Broker Policy Inquiry & Document Access",
        titleLead: "Broker Policy Inquiry &",
        titleAccent: "Document Access",
        peekBadge: "SOAP / REST",
        peekBadgeTheme: "cyan",
        peekTitle: "Broker Policy Inquiry",
        peekDesc: "Connected broker inquiry workflows to policy, billing and claims data plus downloadable PDFs.",
        stripBadge: "SOAP / REST",
        stripBadgeTheme: "blue",
        stripTitle: "Broker Policy Inquiry & Document Access",
        stripSub: "Grenville Mutual Insurance",
        summary: "Mapped and tested broker policy, billing and claims inquiry interfaces with downloadable PDF documents across SOAP/XML and REST.",
        banner: "assets/proj-banner-inquiry.jpg",
        tags: ["Broker Inquiry", "SOAP / XML", "REST API", "CSIO / ACORD", "PDF / eDocs"],
        metrics: [
          {
            val: "3-in-1",
            label: "Policy · Billing · Claims",
            sub: "Unified lookup inside broker workflows",
            icon: "trend",
            theme: "emerald",
            gaugePct: 86
          },
          {
            val: "SOAP/REST",
            label: "Cross-Vendor APIs",
            sub: "Desktop BMS & portal endpoint support",
            icon: "clock",
            theme: "blue",
            gaugePct: 85
          },
          {
            val: "PDF/eDocs",
            label: "Document Access",
            sub: "Direct policy, billing & claims PDFs",
            icon: "db",
            theme: "amber",
            gaugePct: 88
          }
        ],
        metricsQualifier: "UI mockups, CSIO/proprietary field mappings, payload diagnosis & end-to-end testing",
        floatingCard: {
          title: "Broker Inquiry Response",
          badge: "Conceptual illustration",
          status: "Policy, Billing & PDFs Ready",
          statusTheme: "green",
          gaugeVal: "3-in-1",
          gaugeLabel: "Lookup API",
          gaugePct: 86,
          gaugeTheme: "blue",
          rows: [
            { icon: "user", label: "Policy & Coverages", val: "Mapped", theme: "green" },
            { icon: "shield", label: "Billing & Balances", val: "Synchronized", theme: "green" },
            { icon: "home", label: "Claims Status", val: "Returned", theme: "green" },
            { icon: "doc", label: "PDF / eDocs", val: "Downloadable", theme: "blue" }
          ]
        },
        secondaryHud: {
          title: "Inquiry Contract Checks",
          gaugePct: 86,
          items: [
            "CSIO / proprietary mapping",
            "SOAP XML request trace",
            "REST endpoint response",
            "Billing & claims status",
            "PDF document stream"
          ],
          pill: "Inquiry Ready"
        },
        quickFacts: {
          role: "Mockups, CSIO/proprietary field mappings, SOAP/REST diagnosis & integration testing",
          period: "Within Grenville tenure (2009–2022)",
          deliverable: "Unified policy, billing and claims broker inquiry with downloadable PDF retrieval"
        }
      },
      {
        slug: "headquarters",
        featuredRank: 12,
        eyebrowType: "PROFESSIONAL WORK",
        employerOrProduct: "Grenville Mutual Insurance",
        title: "Headquarters Infrastructure & Move",
        titleLead: "Headquarters Infrastructure &",
        titleAccent: "Physical Move",
        peekBadge: "INFRASTRUCTURE",
        peekBadgeTheme: "cyan",
        peekTitle: "HQ Infrastructure & Move",
        peekDesc: "Planned, built and supported corporate headquarters infrastructure and VMware ESXi virtualization.",
        stripBadge: "INFRASTRUCTURE",
        stripBadgeTheme: "blue",
        stripTitle: "Headquarters Infrastructure & Move",
        stripSub: "Grenville Mutual Insurance",
        summary: "Guided corporate headquarters technical infrastructure from design through build and physical move — spanning networking, AV, security, cooling, backup power and VMware ESXi virtualization.",
        banner: "assets/proj-banner-headquarters.jpg",
        tags: ["VMware ESXi", "42U Racks & SAN", "UPS & Generator", "Cat6A / VLANs", "Physical Security"],
        metrics: [
          {
            val: "ESXi",
            label: "Blade Virtualization",
            sub: "Consolidated bare-metal blades onto VMware",
            icon: "trend",
            theme: "emerald",
            gaugePct: 93
          },
          {
            val: "UPS+Gen",
            label: "Resilient Power",
            sub: "Conditioned backup power & datacentre cooling",
            icon: "clock",
            theme: "blue",
            gaugePct: 91
          },
          {
            val: "End-to-End",
            label: "Floorplan to Cutover",
            sub: "Racks, cabling, VLANs, AV & door security",
            icon: "db",
            theme: "amber",
            gaugePct: 90
          }
        ],
        metricsQualifier: "Within Grenville tenure (2009–2022) · exact building move year not confirmed",
        floatingCard: {
          title: "HQ Cutover Telemetry",
          badge: "Conceptual illustration",
          status: "Datacentre & ESXi Online",
          statusTheme: "green",
          gaugeVal: "ESXi",
          gaugeLabel: "Cluster Live",
          gaugePct: 92,
          gaugeTheme: "emerald",
          rows: [
            { icon: "user", label: "Compute Cluster", val: "VMware ESXi", theme: "green" },
            { icon: "shield", label: "Facility Power", val: "UPS + Generator", theme: "green" },
            { icon: "home", label: "Network Core", val: "Cat6A / VLANs", theme: "blue" },
            { icon: "doc", label: "Security & AV", val: "Integrated", theme: "green" }
          ]
        },
        secondaryHud: {
          title: "Facility Readiness",
          gaugePct: 91,
          items: [
            "Server room cooling & racks",
            "Conditioned UPS + generator",
            "Blade-to-ESXi migration",
            "Structured cabling & Wi-Fi",
            "Key-card access & boardroom AV"
          ],
          pill: "Cutover Complete"
        },
        quickFacts: {
          role: "Technical infrastructure design, vendor coordination, physical move execution & ESXi virtualization",
          period: "Within Grenville tenure (2009–2022) · exact move year unconfirmed",
          deliverable: "New corporate datacentre buildout, resilient power/cooling and virtualized ESXi compute"
        }
      },
      {
        slug: "foundations",
        featuredRank: 13,
        eyebrowType: "PROFESSIONAL WORK",
        employerOrProduct: "Harris Computer Services",
        title: "Small Business Server Swing Migrations",
        titleLead: "Small Business Server",
        titleAccent: "Swing Migrations",
        peekBadge: "SYSTEMS & AD",
        peekBadgeTheme: "emerald",
        peekTitle: "SBS Swing Migrations",
        peekDesc: "Repeatable swing-migration process separating combined SBS into dedicated AD and Exchange servers.",
        stripBadge: "SYSTEMS & AD",
        stripBadgeTheme: "emerald",
        stripTitle: "SBS Swing Migrations & Systems",
        stripSub: "Harris · 2007 – 2009",
        summary: "Built client server racks, firewalls and networks at Harris, and developed a repeatable SBS swing-migration process preserving live email, identity and data.",
        banner: "assets/proj-banner-foundations.jpg",
        tags: ["Swing Migration", "Active Directory", "Exchange & BES", "Server Racks", "Firewalls"],
        metrics: [
          {
            val: "Staged",
            label: "Swing Migration",
            sub: "Separated coupled SBS without identity loss",
            icon: "trend",
            theme: "emerald",
            gaugePct: 88
          },
          {
            val: "AD+Exch",
            label: "Identity & Mail Split",
            sub: "Preserved SIDs, GPOs, mailboxes & BES",
            icon: "clock",
            theme: "blue",
            gaugePct: 86
          },
          {
            val: "Full-Stack",
            label: "Racks & Firewalls",
            sub: "NOC monitoring to full client rack builds",
            icon: "db",
            theme: "amber",
            gaugePct: 85
          }
        ],
        metricsQualifier: "Harris Computer Services (2007–2009) · NOC & infrastructure project technician",
        floatingCard: {
          title: "Swing Cutover Gate",
          badge: "Conceptual illustration",
          status: "AD & Exchange Separated",
          statusTheme: "green",
          gaugeVal: "Staged",
          gaugeLabel: "Zero SID Loss",
          gaugePct: 87,
          gaugeTheme: "emerald",
          rows: [
            { icon: "user", label: "Active Directory", val: "SIDs & GPOs Kept", theme: "green" },
            { icon: "shield", label: "Exchange & BES", val: "Mailboxes Live", theme: "green" },
            { icon: "home", label: "Server Racks", val: "Separated Hosts", theme: "blue" },
            { icon: "doc", label: "Firewall / VLAN", val: "Cutover Clean", theme: "green" }
          ]
        },
        secondaryHud: {
          title: "Migration Stages",
          gaugePct: 86,
          items: [
            "Staging DC replication",
            "FSMO role transfer",
            "Exchange mailbox move",
            "File share & DNS cutover",
            "Legacy SBS decommission"
          ],
          pill: "Cutover Verified"
        },
        quickFacts: {
          role: "NOC & Project Technician executing rack builds, firewall setups and repeatable SBS swing migrations",
          period: "2007 – 2009 (Harris Computer Services)",
          deliverable: "Repeatable staged swing-migration process separating SBS into dedicated AD and Exchange servers"
        }
      },
      {
        slug: "dell",
        featuredRank: 14,
        eyebrowType: "PROFESSIONAL WORK",
        employerOrProduct: "Dell Canada",
        title: "Dell Latitude & OptiPlex Hardware Support",
        titleLead: "Dell Latitude & OptiPlex",
        titleAccent: "Hardware Support",
        peekBadge: "GLOVES OFF TEAM",
        peekBadgeTheme: "amber",
        peekTitle: "Dell Hardware Support",
        peekDesc: "Commercial Latitude and OptiPlex diagnostics on Dell's Gloves Off first-call resolution team.",
        stripBadge: "HARDWARE",
        stripBadgeTheme: "amber",
        stripTitle: "Dell Hardware & First-Call Support",
        stripSub: "Dell · Sept 2006 – 2007",
        summary: "Supported commercial Latitude laptops and OptiPlex desktops on Dell's Gloves Off team, focusing on thorough root-cause diagnosis and first-call resolution.",
        banner: "assets/proj-banner-dell.jpg",
        tags: ["Dell Gloves Off", "Latitude & OptiPlex", "Hardware Diagnostics", "First-Call Fix", "System Boards"],
        metrics: [
          {
            val: "1st-Call",
            label: "Gloves Off Mandate",
            sub: "Empowered to stay until fault was isolated",
            icon: "trend",
            theme: "emerald",
            gaugePct: 88
          },
          {
            val: "Hardware",
            label: "Latitude & OptiPlex",
            sub: "Motherboard, PSU, thermal & storage isolation",
            icon: "clock",
            theme: "blue",
            gaugePct: 84
          },
          {
            val: "Sept 2006",
            label: "Career Foundation",
            sub: "Grounded in physical evidence & user empathy",
            icon: "db",
            theme: "amber",
            gaugePct: 82
          }
        ],
        metricsQualifier: "Dell Canada (September 2006–2007) · commercial hardware support specialist",
        floatingCard: {
          title: "Hardware Fault Isolation",
          badge: "Conceptual illustration",
          status: "Root Cause Isolated on 1st Call",
          statusTheme: "green",
          gaugeVal: "1st-Call",
          gaugeLabel: "Gloves Off",
          gaugePct: 86,
          gaugeTheme: "emerald",
          rows: [
            { icon: "user", label: "Commercial Line", val: "Latitude / OptiPlex", theme: "blue" },
            { icon: "shield", label: "POST & Bus Test", val: "Diagnosed", theme: "green" },
            { icon: "home", label: "Fault Component", val: "Isolated", theme: "green" },
            { icon: "doc", label: "Field Dispatch", val: "Exact Part Spec", theme: "green" }
          ]
        },
        secondaryHud: {
          title: "Diagnostic Protocol",
          gaugePct: 85,
          items: [
            "POST & diagnostic LEDs",
            "System board & power rails",
            "Thermal & fan telemetry",
            "SATA / drive verification",
            "First-call dispatch spec"
          ],
          pill: "Fault Isolated"
        },
        quickFacts: {
          role: "Technical Support Specialist on Dell's Gloves Off commercial resolution team",
          period: "September 2006 – 2007 (Dell Canada)",
          deliverable: "Component-level fault isolation and reduced repeat callbacks for commercial clients"
        }
      },
      {
        slug: "lowkey",
        featuredRank: 15,
        eyebrowType: "INDEPENDENT BUILD",
        employerOrProduct: "Independent Build",
        title: "LOWKEY — Local Speech-to-Text Input",
        titleLead: "LOWKEY — Local",
        titleAccent: "Speech-to-Text Input",
        peekBadge: "LOCAL AI",
        peekBadgeTheme: "cyan",
        peekTitle: "LOWKEY — Local Speech Input",
        peekDesc: "On-device speech recognition across Windows (Rust / Tauri 2) and Android (Kotlin IME).",
        stripBadge: "LOCAL AI",
        stripBadgeTheme: "blue",
        stripTitle: "LOWKEY — Local Speech Input",
        stripSub: "Independent · Rust & Kotlin",
        summary: "Local speech-to-text inference using sherpa-onnx / Parakeet with a dedicated Rust worker on Windows and a native Kotlin keyboard on Android.",
        banner: "assets/lowkey-local-speech-v1.png",
        tags: ["Local Speech AI", "Rust / Tauri 2", "sherpa-onnx", "Kotlin Android IME", "Silero VAD"],
        metrics: [
          {
            val: "On-Device",
            label: "Local ONNX Inference",
            sub: "Zero cloud audio upload · private decoding",
            icon: "trend",
            theme: "emerald",
            gaugePct: 92
          },
          {
            val: "2-OS",
            label: "Windows + Android",
            sub: "Tauri 2 desktop worker & Kotlin Android IME",
            icon: "clock",
            theme: "blue",
            gaugePct: 90
          },
          {
            val: "INT8/CTC",
            label: "Parakeet Models",
            sub: "Cached 110M CTC & 0.6B v3 TDT local models",
            icon: "db",
            theme: "amber",
            gaugePct: 88
          }
        ],
        metricsQualifier: "Historical / personal independent build · exact release date not established",
        floatingCard: {
          title: "Local Speech Pipeline",
          badge: "Conceptual illustration",
          status: "On-Device Decoding Active",
          statusTheme: "blue",
          gaugeVal: "Local",
          gaugeLabel: "ONNX Worker",
          gaugePct: 91,
          gaugeTheme: "blue",
          rows: [
            { icon: "user", label: "Audio Capture", val: "Silero VAD", theme: "green" },
            { icon: "shield", label: "Inference Engine", val: "sherpa-onnx", theme: "blue" },
            { icon: "home", label: "Desktop Worker", val: "Rust / Tauri 2", theme: "blue" },
            { icon: "doc", label: "Mobile Input", val: "Kotlin IME", theme: "green" }
          ]
        },
        secondaryHud: {
          title: "Voice Input Pipeline",
          gaugePct: 90,
          items: [
            "AudioWorklet PCM capture",
            "Silero VAD phrase boundary",
            "Parakeet INT8 / CTC decode",
            "Custom vocabulary fixups",
            "Native OS keystroke inject"
          ],
          pill: "Zero-Cloud AI"
        },
        quickFacts: {
          role: "Creator & developer building the Rust/Tauri 2 worker, React/TS UI and Kotlin Android IME",
          period: "Historical / personal build · exact date not established",
          deliverable: "Cross-platform local speech-to-text input method for Windows and Android"
        }
      },
      {
        slug: "workshop42",
        featuredRank: 16,
        eyebrowType: "INDEPENDENT BUILD",
        employerOrProduct: "Workshop42 (ws42.ca)",
        title: "Workshop42 — Physical Design & Fabrication",
        titleLead: "Workshop42 — Physical",
        titleAccent: "Design & Fabrication",
        peekBadge: "CAD & 3D PRINT",
        peekBadgeTheme: "amber",
        peekTitle: "Workshop42 — Physical Builds",
        peekDesc: "Tangible industrial design and multi-material 3D-printed objects at Workshop42 (ws42.ca).",
        stripBadge: "CAD & 3D PRINT",
        stripBadgeTheme: "amber",
        stripTitle: "Workshop42 — Physical Builds",
        stripSub: "Independent · ws42.ca",
        summary: "Designing and fabricating physical objects that combine CAD precision, multi-color 3D printing and woodworking at Workshop42 (ws42.ca).",
        banner: "assets/apex.jpg",
        tags: ["Workshop42", "CAD & Fabrication", "Apex Monitor Riser", "The Voyager", "MakerWorld"],
        metrics: [
          {
            val: "Apex",
            label: "Monitor Riser",
            sub: "3D-printed structural legs + hardwood shelf",
            icon: "trend",
            theme: "emerald",
            gaugePct: 86
          },
          {
            val: "Voyager",
            label: "Floating Canoe",
            sub: "Dual-color hydrodynamic scale model",
            icon: "clock",
            theme: "blue",
            gaugePct: 84
          },
          {
            val: "ws42.ca",
            label: "MakerWorld Studio",
            sub: "Published print profiles & real build photos",
            icon: "db",
            theme: "amber",
            gaugePct: 85
          }
        ],
        metricsQualifier: "Ongoing personal design studio (ws42.ca) · photographed as built",
        floatingCard: {
          title: "Fabrication Spec",
          badge: "Photographed as built",
          status: "Published on MakerWorld & ws42.ca",
          statusTheme: "green",
          gaugeVal: "CAD",
          gaugeLabel: "Multi-Material",
          gaugePct: 86,
          gaugeTheme: "emerald",
          rows: [
            { icon: "user", label: "Primary Build", val: "Apex Riser", theme: "green" },
            { icon: "shield", label: "Scale Model", val: "The Voyager", theme: "blue" },
            { icon: "home", label: "Joinery & Fit", val: "Print + Wood", theme: "green" },
            { icon: "doc", label: "Community", val: "MakerWorld", theme: "green" }
          ]
        },
        secondaryHud: {
          title: "Physical Engineering",
          gaugePct: 85,
          items: [
            "Parametric CAD modeling",
            "Load-bearing infill tuning",
            "Wood-to-print tolerances",
            "Multi-color AMS slicing",
            "Photographed real builds"
          ],
          pill: "Built & Shared"
        },
        quickFacts: {
          role: "Designer & maker handling CAD modeling, structural prototyping, print profiles & photography",
          period: "Ongoing personal studio · exact start date not established",
          deliverable: "Functional desktop hardware and scale models published on MakerWorld and ws42.ca"
        }
      }
    ]);

    function getCarouselMetricIconSvg(iconKey) {
      if (iconKey === "clock") {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/></svg>`;
      }
      if (iconKey === "db") {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5.5" rx="7.5" ry="3"/><path d="M4.5 5.5v6c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-6"/><path d="M4.5 11.5v6c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-6"/></svg>`;
      }
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>`;
    }

    function getCarouselHudRowIconSvg(iconKey) {
      if (iconKey === "user") {
        return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="5.2" r="2.4"/><path d="M3.2 13.5c.5-2.3 2.3-3.6 4.8-3.6s4.3 1.3 4.8 3.6"/></svg>`;
      }
      if (iconKey === "shield") {
        return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2 13 4v4c0 3.2-2.1 5.4-5 6.3C5.1 13.4 3 11.2 3 8V4l5-2Z"/><path d="m6 8 1.4 1.4L10.3 6.5"/></svg>`;
      }
      if (iconKey === "home") {
        return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 7.2 8 2.5l5.5 4.7"/><path d="M4.2 6.2v6.8h7.6V6.2"/></svg>`;
      }
      return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="2.2" width="10" height="11.6" rx="1.5"/><path d="M5.5 5.8h5M5.5 8.5h5M5.5 11.2h3"/></svg>`;
    }

    const CHRONO_META_BY_SLUG = Object.freeze({
      nexus: {
        railTop: "2022",
        railBottom: "Present",
        railNote: "Active build",
        nodeTheme: "green",
        sortYear: 2026,
        curatedRank: 1,
        unestablishedDate: false,
        statusBadge: "Active Development",
        metaRows: [
          { icon: "status", label: "Status", val: "Active Development", highlight: "green" },
          { icon: "role", label: "My role", val: "Architecture · Full-Stack Dev" }
        ]
      },
      renewals: {
        railTop: "2009",
        railBottom: "2022",
        railNote: "Grenville tenure",
        nodeTheme: "blue",
        sortYear: 2021,
        curatedRank: 2,
        unestablishedDate: false,
        statusBadge: "Delivered",
        metaRows: [
          { icon: "org", label: "Employer", val: "Grenville · Delivered" },
          { icon: "outcome", label: "Outcome", val: "~80% / ~60% / ~40% renewal-only" }
        ]
      },
      takeover: {
        railTop: "2022",
        railBottom: "Present",
        railNote: "Medavie tenure",
        nodeTheme: "purple",
        sortYear: 2024,
        curatedRank: 3,
        unestablishedDate: false,
        statusBadge: "Production tool",
        metaRows: [
          { icon: "org", label: "Employer", val: "Medavie · Production tool" },
          { icon: "outcome", label: "Outcome", val: "Repeatable Excel/VB/XML loads" }
        ]
      },
      continuity: {
        railTop: "2022",
        railBottom: "Present",
        railNote: "Medavie tenure",
        nodeTheme: "purple",
        sortYear: 2024,
        curatedRank: 4,
        unestablishedDate: false,
        statusBadge: "Design completed",
        metaRows: [
          { icon: "org", label: "Employer", val: "Medavie · Design completed" },
          { icon: "outcome", label: "Outcome", val: "REST-to-legacy ETL continuity design" }
        ]
      },
      claims: {
        railTop: "2022",
        railBottom: "Present",
        railNote: "Medavie tenure",
        nodeTheme: "purple",
        sortYear: 2023,
        curatedRank: 5,
        unestablishedDate: false,
        statusBadge: "Solution review & requirements",
        metaRows: [
          { icon: "org", label: "Employer", val: "Medavie · Solution review" },
          { icon: "outcome", label: "Outcome", val: "Event-table & REST sync mappings" }
        ]
      },
      sql: {
        railTop: "2022",
        railBottom: "Present",
        railNote: "Medavie tenure",
        nodeTheme: "purple",
        sortYear: 2023,
        curatedRank: 6,
        unestablishedDate: false,
        statusBadge: "Delivered",
        metaRows: [
          { icon: "org", label: "Employer", val: "Medavie · Delivered" },
          { icon: "outcome", label: "Outcome", val: "Hand-written SQL & finance balancing" }
        ]
      },
      newbusiness: {
        railTop: "2009",
        railBottom: "2022",
        railNote: "Grenville tenure",
        nodeTheme: "blue",
        sortYear: 2020,
        curatedRank: 7,
        unestablishedDate: false,
        statusBadge: "Delivered",
        metaRows: [
          { icon: "org", label: "Employer", val: "Grenville · Delivered" },
          { icon: "outcome", label: "Outcome", val: "Rules, mappings & portal bind/refer" }
        ]
      },
      workflows: {
        railTop: "2009",
        railBottom: "2022",
        railNote: "Grenville tenure",
        nodeTheme: "blue",
        sortYear: 2019,
        curatedRank: 8,
        unestablishedDate: false,
        statusBadge: "Delivered",
        metaRows: [
          { icon: "org", label: "Employer", val: "Grenville · Delivered" },
          { icon: "outcome", label: "Outcome", val: "Commercial rules & CSIO mappings" }
        ]
      },
      upload: {
        railTop: "Approx.",
        railBottom: "2018",
        railNote: "Grenville tenure",
        nodeTheme: "blue",
        sortYear: 2018,
        curatedRank: 9,
        unestablishedDate: false,
        statusBadge: "Delivered",
        metaRows: [
          { icon: "org", label: "Employer", val: "Grenville · Production tool" },
          { icon: "outcome", label: "Outcome", val: "C#/.NET + REST upload & log tool" }
        ]
      },
      changes: {
        railTop: "2009",
        railBottom: "2022",
        railNote: "Grenville tenure",
        nodeTheme: "blue",
        sortYear: 2017,
        curatedRank: 10,
        unestablishedDate: false,
        statusBadge: "Delivered",
        metaRows: [
          { icon: "org", label: "Employer", val: "Grenville · Delivered" },
          { icon: "outcome", label: "Outcome", val: "Pre-submit delta & endorsement rules" }
        ]
      },
      inquiry: {
        railTop: "2009",
        railBottom: "2022",
        railNote: "Grenville tenure",
        nodeTheme: "blue",
        sortYear: 2016,
        curatedRank: 11,
        unestablishedDate: false,
        statusBadge: "Delivered",
        metaRows: [
          { icon: "org", label: "Employer", val: "Grenville · Delivered" },
          { icon: "outcome", label: "Outcome", val: "Policy, billing, claims & PDF lookup" }
        ]
      },
      headquarters: {
        railTop: "2009",
        railBottom: "2022",
        railNote: "Move year unconfirmed",
        nodeTheme: "teal",
        sortYear: 2014,
        curatedRank: 12,
        unestablishedDate: false,
        statusBadge: "Delivered",
        metaRows: [
          { icon: "org", label: "Employer", val: "Grenville · Delivered" },
          { icon: "outcome", label: "Outcome", val: "HQ infrastructure move & ESXi transition" }
        ]
      },
      foundations: {
        railTop: "2007",
        railBottom: "2009",
        railNote: "Harris tenure",
        nodeTheme: "teal",
        sortYear: 2008,
        curatedRank: 13,
        unestablishedDate: false,
        statusBadge: "Delivered",
        metaRows: [
          { icon: "org", label: "Employer", val: "Harris · Delivered" },
          { icon: "outcome", label: "Outcome", val: "Repeatable SBS swing migrations" }
        ]
      },
      dell: {
        railTop: "Sept 2006",
        railBottom: "2007",
        railNote: "Dell tenure",
        nodeTheme: "slate",
        sortYear: 2006,
        curatedRank: 14,
        unestablishedDate: false,
        statusBadge: "Delivered",
        metaRows: [
          { icon: "org", label: "Employer", val: "Dell Canada · Delivered" },
          { icon: "outcome", label: "Outcome", val: "Gloves Off first-call fault diagnosis" }
        ]
      },
      lowkey: {
        railTop: "Date not",
        railBottom: "established",
        railNote: "Historical build",
        nodeTheme: "green",
        sortYear: 2005,
        curatedRank: 15,
        unestablishedDate: true,
        statusBadge: "Historical build",
        metaRows: [
          { icon: "status", label: "Status", val: "Historical / Personal Build", highlight: "blue" },
          { icon: "role", label: "Stack", val: "Rust / Tauri 2 · Kotlin IME · ONNX" }
        ]
      },
      workshop42: {
        railTop: "Date not",
        railBottom: "established",
        railNote: "Personal studio",
        nodeTheme: "green",
        sortYear: 2004,
        curatedRank: 16,
        unestablishedDate: true,
        statusBadge: "Personal studio",
        metaRows: [
          { icon: "status", label: "Status", val: "Ongoing Personal Studio", highlight: "blue" },
          { icon: "role", label: "Focus", val: "CAD · 3D Printing · Woodwork" }
        ]
      }
    });

    const CHRONO_TYPE_FILTERS = Object.freeze([
      { id: "all", label: "All Builds", count: PROJECTS_CATALOG.length, icon: CATEGORY_DEFS[0].icon },
      { id: "professional", label: "Professional Work", count: countByCat("professional"), icon: CATEGORY_DEFS[1].icon },
      { id: "independent", label: "Independent Builds", count: countByCat("independent"), icon: CATEGORY_DEFS[2].icon }
    ]);

    const CHRONO_TOPIC_FILTERS = Object.freeze([
      { id: "insurance", label: "Insurance", count: countByCat("insurance"), icon: CATEGORY_DEFS[3].icon },
      { id: "data", label: "Integration & Data", count: countByCat("data"), icon: CATEGORY_DEFS[4].icon },
      { id: "infra", label: "Infrastructure", count: countByCat("infra"), icon: CATEGORY_DEFS[5].icon },
      { id: "web", label: "Web & Tools", count: countByCat("web"), icon: CATEGORY_DEFS[7].icon }
    ]);

    let activeCarouselIndex = 0;
    let carouselQuickFactsOpen = false;
    let activeChronoType = "all";
    let activeChronoTopic = "";
    let activeChronoSort = "newest";

    const projectsPageSection = document.querySelector('section[data-page="projects"]');
    if (projectsPageSection && !projectsPageSection.querySelector(".projects-explorer-workbench")) {
      activeProjectViewMode = "timeline";
      const explorerRoot = document.createElement("div");
      explorerRoot.className = "projects-explorer-workbench projects-carousel-timeline-shell";
      explorerRoot.innerHTML = `
        <section class="projects-carousel-section" aria-label="Featured builds carousel" data-carousel-section tabindex="0">
          <header class="projects-carousel-intro">
            <p class="projects-carousel-kicker">BUILDS</p>
            <h1 tabindex="-1">Real problems. <span class="projects-carousel-gradient">Practical solutions.</span></h1>
            <p class="projects-carousel-lead">A collection of professional work and independent builds, from the datacenter to the business to the clouds.</p>
          </header>
          <div class="projects-carousel-stage" data-carousel-stage="page-stage"></div>
          <div class="projects-carousel-pagination-bar" data-carousel-pagination-bar>
            <div class="projects-carousel-dots" role="tablist" aria-label="Featured build slides" data-carousel-dots></div>
            <button type="button" class="carousel-autoplay-btn" data-carousel-autoplay-toggle aria-pressed="false" aria-label="Pause carousel auto-cycle" title="Pause auto-cycle (also pauses on hover)">
              <span class="carousel-autoplay-icon" data-carousel-autoplay-icon aria-hidden="true">
                <svg viewBox="0 0 16 16" fill="currentColor"><rect x="4" y="3.2" width="2.6" height="9.6" rx="0.8"/><rect x="9.4" y="3.2" width="2.6" height="9.6" rx="0.8"/></svg>
              </span>
              <span class="carousel-autoplay-label" data-carousel-autoplay-label>Pause</span>
            </button>
          </div>
          <div class="projects-carousel-strip-wrap">
            <div class="projects-carousel-strip" role="list" aria-label="Featured builds quick switcher" data-carousel-strip></div>
          </div>
        </section>

        <div class="projects-chrono-body">
          <div class="projects-chrono-toolbar" role="region" aria-label="Filter, search and sort chronological build collection">
            <!-- Mobile Filter Section Header & 2-Row Compact Pills (Screen 1) -->
            <div class="chrono-mobile-filter-header">
              <h2 class="chrono-mobile-section-title">All Builds</h2>
              <button type="button" class="chrono-mobile-view-all" data-proj-clear-filters>View all</button>
            </div>

            <div class="chrono-mobile-search-row">
              <div class="chrono-mobile-search-input-wrap">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4.5 4.5"/></svg>
                <input type="search" class="chrono-mobile-search-field" data-proj-search-input placeholder="Search projects, skills or keywords..." aria-label="Search projects, skills or keywords">
              </div>
              <button type="button" class="chrono-mobile-filter-icon-btn" data-chrono-mobile-sort-toggle aria-label="Toggle sort order" title="Toggle sort order">
                <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 5h12M3 9h12M3 13h12"/><circle cx="6.5" cy="5" r="1.6" fill="#ffffff"/><circle cx="11.5" cy="9" r="1.6" fill="#ffffff"/><circle cx="7.5" cy="13" r="1.6" fill="#ffffff"/></svg>
              </button>
            </div>

            <div class="chrono-mobile-pills-rows" role="group" aria-label="Mobile project filters">
              <div class="chrono-mobile-pill-row">
                <button type="button" class="chrono-mobile-pill is-active" data-chrono-type="all">All</button>
                <button type="button" class="chrono-mobile-pill" data-chrono-type="professional">Professional</button>
                <button type="button" class="chrono-mobile-pill" data-chrono-type="independent">Independent</button>
              </div>
              <div class="chrono-mobile-pill-row">
                <button type="button" class="chrono-mobile-pill is-topic" data-chrono-topic="insurance">Insurance</button>
                <button type="button" class="chrono-mobile-pill is-topic" data-chrono-topic="data">Data &amp; Integration</button>
                <button type="button" class="chrono-mobile-pill is-topic" data-chrono-topic="ai">AI &amp; Automation</button>
              </div>
            </div>

            <div class="projects-chrono-filters-row">
              <div class="chrono-filter-group" role="group" aria-label="Project type filter">
                ${CHRONO_TYPE_FILTERS.map(f => `
                  <button type="button" class="chrono-filter-pill ${f.id === "all" ? "is-active" : ""}" data-chrono-type="${f.id}">
                    <span class="chrono-pill-icon" aria-hidden="true">${f.icon}</span>
                    <span>${f.label}</span>
                    <span class="chrono-pill-count">(${f.count})</span>
                  </button>
                `).join("")}
              </div>

              <span class="chrono-filter-divider" aria-hidden="true"></span>

              <div class="chrono-filter-group" role="group" aria-label="Project topic filter">
                ${CHRONO_TOPIC_FILTERS.map(f => `
                  <button type="button" class="chrono-filter-pill is-topic-pill" data-chrono-topic="${f.id}">
                    <span class="chrono-pill-icon" aria-hidden="true">${f.icon}</span>
                    <span>${f.label}</span>
                    <span class="chrono-pill-count">(${f.count})</span>
                  </button>
                `).join("")}
              </div>

              <div class="chrono-toolbar-right">
                <label class="chrono-sort-wrap">
                  <span class="sr-only">Sort chronological projects</span>
                  <select class="chrono-sort-select" data-proj-sort-select aria-label="Sort chronological projects">
                    <option value="newest" selected>Newest first</option>
                    <option value="oldest">Oldest first</option>
                  </select>
                </label>

                <div class="chrono-view-toggles" role="group" aria-label="Chronological view mode">
                  <button type="button" class="chrono-view-btn is-active" aria-pressed="true" data-proj-view="timeline" aria-label="Timeline cards view" title="Timeline cards view">
                    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="2.5" y="2.5" width="5" height="5" rx="1"/><rect x="10.5" y="2.5" width="5" height="5" rx="1"/><rect x="2.5" y="10.5" width="5" height="5" rx="1"/><rect x="10.5" y="10.5" width="5" height="5" rx="1"/></svg>
                  </button>
                  <button type="button" class="chrono-view-btn" aria-pressed="false" data-proj-view="list" aria-label="Compact list view" title="Compact list view">
                    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M3 4.5h12M3 9h12M3 13.5h12"/></svg>
                  </button>
                </div>
              </div>
            </div>

            <div class="projects-chrono-status-row">
              <p class="chrono-status-summary" data-chrono-status-summary>
                <strong>Selected work</strong> &middot; Showing all 16 case studies in chronological index. Timeline placement reflects career chapter or employer tenure where exact project release dates are not established.
              </p>
              <div class="chrono-status-right">
                <div class="chrono-search-box">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4.5 4.5"/></svg>
                  <input type="search" class="chrono-search-input" data-proj-search-input placeholder="Filter collection..." aria-label="Search chronological project collection">
                </div>
                <button type="button" class="chrono-clear-filters-btn" data-proj-clear-filters hidden>Clear filters <span aria-hidden="true">↺</span></button>
              </div>
            </div>
          </div>

          <!-- Mobile Timeline Header Row (Screen 2: All Projects (16) | Newest first ↑↓) -->
          <div class="chrono-mobile-list-subheader">
            <div class="chrono-mobile-count-title">
              <strong>All Projects</strong> <span data-chrono-mobile-count>(16)</span>
            </div>
            <button type="button" class="chrono-mobile-sort-trigger" data-chrono-mobile-sort-toggle>
              <span data-chrono-mobile-sort-label>Newest first</span>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3v10m-2.5-7.5L5 3l2.5 2.5M11 13V3m-2.5 7.5L11 13l2.5-2.5"/></svg>
            </button>
          </div>

          <div class="projects-chrono-collection" data-proj-cards-grid></div>

          <aside class="projects-chrono-end-cta" aria-label="Career journey and resume builder">
            <div>
              <h2>Want the full career progression behind these projects?</h2>
              <p>Explore the three-level architecture story (Grounded in the metal · Shaped by the business · Building in the cloud) or build a role-focused resume.</p>
            </div>
            <div class="projects-chrono-end-actions">
              <a class="chrono-end-btn-primary" href="#career">Explore Career Page <span aria-hidden="true">&rarr;</span></a>
              <a class="chrono-end-btn-secondary" href="resume.html">Tailored Resume Builder</a>
            </div>
          </aside>
        </div>
      `;
      projectsPageSection.prepend(explorerRoot);
    }

    let lastCarouselSlideDir = "initial";
    let carouselAnimTimers = [];
    let carouselLiveScanTimer = null;
    let isCarouselHovered = false;
    let isCarouselAutoPaused = false;
    let carouselAutoElapsedMs = 0;
    let lastCarouselAutoTickPerf = typeof performance !== "undefined" ? performance.now() : Date.now();
    const CAROUSEL_AUTO_CYCLE_MS = 5400;

    function syncCarouselAutoplayUi() {
      const pauseSvg = `<svg viewBox="0 0 16 16" fill="currentColor"><rect x="4" y="3.2" width="2.6" height="9.6" rx="0.8"/><rect x="9.4" y="3.2" width="2.6" height="9.6" rx="0.8"/></svg>`;
      const playSvg = `<svg viewBox="0 0 16 16" fill="currentColor"><polygon points="4.6 3.1 13.1 8 4.6 12.9"/></svg>`;
      const ratio = Math.max(0, Math.min(1, carouselAutoElapsedMs / CAROUSEL_AUTO_CYCLE_MS));
      const pct = ratio * 100;
      document.querySelectorAll("[data-carousel-pagination-bar]").forEach(barEl => {
        barEl.classList.toggle("is-auto-paused", isCarouselAutoPaused);
        barEl.classList.toggle("is-hover-paused", isCarouselHovered && !isCarouselAutoPaused);
        barEl.style.setProperty("--carousel-auto-progress", `${pct.toFixed(1)}%`);
        barEl.style.setProperty("--carousel-auto-scale", ratio.toFixed(4));
      });
      document.querySelectorAll("[data-carousel-autoplay-toggle]").forEach(btnEl => {
        btnEl.setAttribute("aria-pressed", isCarouselAutoPaused ? "true" : "false");
        btnEl.setAttribute(
          "aria-label",
          isCarouselAutoPaused ? "Resume carousel auto-cycle" : "Pause carousel auto-cycle"
        );
        btnEl.setAttribute(
          "title",
          isCarouselAutoPaused ? "Resume auto-cycle" : "Pause auto-cycle (also pauses on hover)"
        );
        btnEl.classList.toggle("is-paused", isCarouselAutoPaused);
        btnEl.classList.toggle("is-hover-holding", isCarouselHovered && !isCarouselAutoPaused);
        const iconEl = btnEl.querySelector("[data-carousel-autoplay-icon]");
        const labelEl = btnEl.querySelector("[data-carousel-autoplay-label]");
        if (iconEl) iconEl.innerHTML = isCarouselAutoPaused ? playSvg : pauseSvg;
        if (labelEl) {
          labelEl.textContent = isCarouselAutoPaused
            ? "Play"
            : isCarouselHovered
              ? "Hold"
              : "Pause";
        }
      });
    }

    window.__joshToggleCarouselAutoplay = function toggleCarouselAutoplay() {
      isCarouselAutoPaused = !isCarouselAutoPaused;
      lastCarouselAutoTickPerf = typeof performance !== "undefined" ? performance.now() : Date.now();
      syncCarouselAutoplayUi();
    };

    function stepCarouselSlide(delta, fromAuto = false) {
      const total = FEATURED_CAROUSEL_SLIDES.length;
      if (!total) return;
      carouselAutoElapsedMs = 0;
      lastCarouselAutoTickPerf = typeof performance !== "undefined" ? performance.now() : Date.now();
      lastCarouselSlideDir = delta >= 0 ? "next" : "prev";
      activeCarouselIndex = (activeCarouselIndex + delta + total) % total;
      carouselQuickFactsOpen = false;
      renderFeaturedCarousel(lastCarouselSlideDir);
      syncCarouselAutoplayUi();
    }

    function goToCarouselSlide(idx) {
      const total = FEATURED_CAROUSEL_SLIDES.length;
      if (!Number.isFinite(idx) || idx < 0 || idx >= total || idx === activeCarouselIndex) return;
      carouselAutoElapsedMs = 0;
      lastCarouselAutoTickPerf = typeof performance !== "undefined" ? performance.now() : Date.now();
      const forwardDist = (idx - activeCarouselIndex + total) % total;
      const backwardDist = (activeCarouselIndex - idx + total) % total;
      lastCarouselSlideDir = forwardDist <= backwardDist ? "next" : "prev";
      activeCarouselIndex = idx;
      carouselQuickFactsOpen = false;
      renderFeaturedCarousel(lastCarouselSlideDir);
      syncCarouselAutoplayUi();
    }

    // Horizontal wheel/trackpad scroll, pointer drag, touch swipe, and auto-rotation with pause on hover
    const CAROUSEL_HOVER_PAUSE_SELECTOR =
      ".carousel-active-card, .carousel-peek-card, .carousel-nav-arrow, .projects-carousel-pagination-bar, .carousel-strip-card";
    document.querySelectorAll("[data-carousel-section]").forEach(sectionEl => {
      if (sectionEl.dataset.hscrollBound === "true") return;
      sectionEl.dataset.hscrollBound = "true";
      let wheelAccumX = 0;
      let wheelCooldownUntil = 0;
      let wheelResetTimer = null;

      sectionEl.addEventListener("pointerover", e => {
        const overInteractive = Boolean(e.target && e.target.closest && e.target.closest(CAROUSEL_HOVER_PAUSE_SELECTOR));
        if (overInteractive !== isCarouselHovered) {
          isCarouselHovered = overInteractive;
          lastCarouselAutoTickPerf = typeof performance !== "undefined" ? performance.now() : Date.now();
          syncCarouselAutoplayUi();
        }
      });
      sectionEl.addEventListener("pointerleave", () => {
        if (isCarouselHovered) {
          isCarouselHovered = false;
          lastCarouselAutoTickPerf = typeof performance !== "undefined" ? performance.now() : Date.now();
          syncCarouselAutoplayUi();
        }
      });

      sectionEl.addEventListener("wheel", e => {
        const horizDelta = Math.abs(e.deltaX) > Math.abs(e.deltaY)
          ? e.deltaX
          : (e.shiftKey ? e.deltaY : 0);
        if (Math.abs(horizDelta) < 4) return;

        // Prevent browser back/forward gesture when horizontally scrolling inside the carousel
        e.preventDefault();
        const now = Date.now();
        if (now < wheelCooldownUntil) return;

        wheelAccumX += horizDelta;
        if (wheelResetTimer) clearTimeout(wheelResetTimer);
        wheelResetTimer = setTimeout(() => {
          wheelAccumX = 0;
        }, 180);

        if (Math.abs(wheelAccumX) >= 48) {
          const step = wheelAccumX > 0 ? 1 : -1;
          wheelAccumX = 0;
          wheelCooldownUntil = now + 420;
          stepCarouselSlide(step);
        }
      }, { passive: false });
    });

    if (window.__joshCarouselAutoRotateTimer) {
      clearInterval(window.__joshCarouselAutoRotateTimer);
      window.__joshCarouselAutoRotateTimer = null;
    }
    window.__joshCarouselAutoRotateTimer = setInterval(() => {
      const nowPerf = typeof performance !== "undefined" ? performance.now() : Date.now();
      const dt = Math.min(250, Math.max(0, nowPerf - lastCarouselAutoTickPerf));
      lastCarouselAutoTickPerf = nowPerf;

      if (isCarouselAutoPaused || isCarouselHovered || document.hidden) {
        syncCarouselAutoplayUi();
        return;
      }

      // Check if any carousel section on the active route is currently visible in the viewport
      let visibleCarouselEl = null;
      document.querySelectorAll("[data-carousel-section]").forEach(secEl => {
        if (visibleCarouselEl) return;
        const pageSec = secEl.closest("section[data-page]");
        if (pageSec && pageSec.hidden) return;
        const stageEl = secEl.querySelector("[data-carousel-stage]");
        if (stageEl && stageEl.classList.contains("is-dragging")) return;
        const rect = secEl.getBoundingClientRect();
        if (rect.height > 0 && rect.bottom > 90 && rect.top < (window.innerHeight || 900) - 90) {
          visibleCarouselEl = secEl;
        }
      });

      if (!visibleCarouselEl) return;

      carouselAutoElapsedMs += dt;
      if (carouselAutoElapsedMs >= CAROUSEL_AUTO_CYCLE_MS) {
        carouselAutoElapsedMs = 0;
        stepCarouselSlide(1, true);
      } else {
        syncCarouselAutoplayUi();
      }
    }, 80);

    document.querySelectorAll("[data-carousel-stage]").forEach(stageEl => {
      if (stageEl.dataset.swipeBound === "true") return;
      stageEl.dataset.swipeBound = "true";

      let touchStartX = null;
      let touchStartY = null;
      stageEl.addEventListener("touchstart", e => {
        if (e.touches && e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      }, { passive: true });
      stageEl.addEventListener("touchend", e => {
        if (touchStartX === null || !e.changedTouches || !e.changedTouches.length) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = touchStartY !== null ? e.changedTouches[0].clientY - touchStartY : 0;
        touchStartX = null;
        touchStartY = null;
        if (Math.abs(dx) > 38 && Math.abs(dx) > Math.abs(dy)) {
          stepCarouselSlide(dx < 0 ? 1 : -1);
        }
      }, { passive: true });

      // Desktop/pointer horizontal drag support with live card displacement
      let dragPointerId = null;
      let dragStartX = 0;
      let dragDeltaX = 0;
      let didDragMove = false;

      stageEl.addEventListener("pointerdown", e => {
        if (e.pointerType === "touch" || e.button !== 0) return;
        if (e.target.closest("a, button")) return;
        dragPointerId = e.pointerId;
        dragStartX = e.clientX;
        dragDeltaX = 0;
        didDragMove = false;
        stageEl.classList.add("is-dragging");
      });

      stageEl.addEventListener("pointermove", e => {
        if (dragPointerId === null || e.pointerId !== dragPointerId) return;
        dragDeltaX = e.clientX - dragStartX;
        if (Math.abs(dragDeltaX) > 6) {
          didDragMove = true;
          const clamped = Math.max(-110, Math.min(110, dragDeltaX * 0.45));
          stageEl.style.setProperty("--carousel-drag-x", `${clamped.toFixed(1)}px`);
        }
      });

      const finishPointerDrag = e => {
        if (dragPointerId === null || (e && e.pointerId !== undefined && e.pointerId !== dragPointerId)) return;
        dragPointerId = null;
        stageEl.classList.remove("is-dragging");
        stageEl.style.removeProperty("--carousel-drag-x");
        if (didDragMove && Math.abs(dragDeltaX) > 48) {
          stepCarouselSlide(dragDeltaX < 0 ? 1 : -1);
        }
        dragDeltaX = 0;
      };

      stageEl.addEventListener("pointerup", finishPointerDrag);
      stageEl.addEventListener("pointercancel", finishPointerDrag);
      stageEl.addEventListener("pointerleave", finishPointerDrag);
    });

    function animateCarouselSlideElements(slideDir = "initial") {
      carouselAnimTimers.forEach(t => clearTimeout(t));
      carouselAnimTimers = [];
      if (carouselLiveScanTimer) {
        clearInterval(carouselLiveScanTimer);
        carouselLiveScanTimer = null;
      }

      const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const isSlideSwitch = slideDir === "next" || slideDir === "prev";

      // 1. Animate numeric values in .carousel-metric-main strong (e.g. ~80%, ~60%, ~40%, 4-Stage)
      document.querySelectorAll("[data-carousel-metric-val]").forEach((el, idx) => {
        if (el.closest(".carousel-transition-ghost")) return;
        const finalStr = el.getAttribute("data-carousel-metric-val") || "";
        const numMatch = finalStr.match(/^([^0-9]*)(\d+)(.*)$/);
        if (!numMatch || prefersReduced || isSlideSwitch) {
          el.textContent = finalStr;
          return;
        }
        const prefix = numMatch[1] || "";
        const targetNum = parseInt(numMatch[2], 10);
        const suffix = numMatch[3] || "";
        if (!Number.isFinite(targetNum) || targetNum <= 0) {
          el.textContent = finalStr;
          return;
        }

        const duration = 820;
        const delay = idx * 110;
        const startTime = performance.now() + delay;

        function tick(now) {
          if (!el.isConnected) return;
          if (now < startTime) {
            el.textContent = `${prefix}0${suffix}`;
            requestAnimationFrame(tick);
            return;
          }
          const progress = Math.min(1, (now - startTime) / duration);
          const eased = 1 - Math.pow(1 - progress, 3);
          const currentVal = Math.round(targetNum * eased);
          el.textContent = progress < 1 ? `${prefix}${currentVal}${suffix}` : finalStr;
          if (progress < 1) {
            requestAnimationFrame(tick);
          }
        }
        requestAnimationFrame(tick);
      });

      // 2. Sequential state evaluation & live telemetry animation inside Floating Decision Card & Secondary HUD
      document.querySelectorAll("[data-carousel-stage]").forEach(stageEl => {
        const liveCard = stageEl.querySelector(".carousel-center-wrap > .carousel-active-card:not(.carousel-transition-ghost)") || stageEl;
        const statusBanner = liveCard.querySelector(".carousel-decision-status");
        const decisionRows = Array.from(liveCard.querySelectorAll(".carousel-decision-row"));
        const hudItems = Array.from(liveCard.querySelectorAll(".carousel-sec-hud-list li"));
        const hudPill = liveCard.querySelector(".carousel-sec-hud-pill");
        const gaugeFills = Array.from(liveCard.querySelectorAll(".carousel-metric-gauge-fill, .sec-hud-meter-fill"));
        const radialArcs = Array.from(liveCard.querySelectorAll(".decision-gauge-arc"));

        if (prefersReduced || isSlideSwitch) {
          if (statusBanner) statusBanner.classList.add("is-verified");
          decisionRows.forEach(r => r.classList.add("is-verified"));
          hudItems.forEach(li => li.classList.add("is-verified"));
          if (hudPill) hudPill.classList.add("is-verified");
          gaugeFills.forEach(gf => gf.classList.add("is-filled"));
          radialArcs.forEach(arc => arc.classList.add("is-filled"));
          return;
        }

        gaugeFills.forEach((gf, idx) => {
          gf.classList.remove("is-filled");
          const gt = setTimeout(() => {
            gf.classList.add("is-filled");
          }, 90 + idx * 95);
          carouselAnimTimers.push(gt);
        });

        radialArcs.forEach(arc => {
          const targetOffset = arc.getAttribute("data-gauge-offset") || "18";
          arc.style.strokeDashoffset = "110";
          const rt = setTimeout(() => {
            arc.style.strokeDashoffset = targetOffset;
            arc.classList.add("is-filled");
          }, 120);
          carouselAnimTimers.push(rt);
        });

        if (statusBanner) {
          statusBanner.classList.remove("is-verified");
          statusBanner.classList.add("is-evaluating");
        }

        decisionRows.forEach((row, i) => {
          row.classList.remove("is-verified", "is-live-scan");
          row.classList.add("is-evaluating");
          const t = setTimeout(() => {
            row.classList.remove("is-evaluating");
            row.classList.add("is-verified");
          }, 150 + i * 135);
          carouselAnimTimers.push(t);
        });

        const statusTimer = setTimeout(() => {
          if (statusBanner) {
            statusBanner.classList.remove("is-evaluating");
            statusBanner.classList.add("is-verified");
          }
        }, 180 + decisionRows.length * 135);
        carouselAnimTimers.push(statusTimer);

        hudItems.forEach((li, i) => {
          li.classList.remove("is-verified", "is-live-scan");
          li.classList.add("is-evaluating");
          const t = setTimeout(() => {
            li.classList.remove("is-evaluating");
            li.classList.add("is-verified");
          }, 220 + i * 115);
          carouselAnimTimers.push(t);
        });

        if (hudPill) {
          hudPill.classList.remove("is-verified");
          const pillTimer = setTimeout(() => {
            hudPill.classList.add("is-verified");
          }, 260 + hudItems.length * 115);
          carouselAnimTimers.push(pillTimer);
        }
      });

      // 3. Continuous ambient live telemetry scan cycle across verified HUD states
      if (!prefersReduced) {
        let scanStep = 0;
        const startLoopTimer = setTimeout(() => {
          carouselLiveScanTimer = setInterval(() => {
            document.querySelectorAll("[data-carousel-stage]").forEach(stageEl => {
              const rows = Array.from(stageEl.querySelectorAll(".carousel-decision-row"));
              const checks = Array.from(stageEl.querySelectorAll(".carousel-sec-hud-list li"));
              if (rows.length) {
                rows.forEach((r, idx) => r.classList.toggle("is-live-scan", idx === (scanStep % rows.length)));
              }
              if (checks.length) {
                checks.forEach((c, idx) => c.classList.toggle("is-live-scan", idx === (scanStep % checks.length)));
              }
            });
            scanStep += 1;
          }, 1800);
        }, 1100);
        carouselAnimTimers.push(startLoopTimer);
      }
    }

    function renderFeaturedCarousel(slideDir = lastCarouselSlideDir) {
      const stageEls = document.querySelectorAll("[data-carousel-stage]");
      const dotsEls = document.querySelectorAll("[data-carousel-dots]");
      const stripEls = document.querySelectorAll("[data-carousel-strip]");
      if (!stageEls.length || !dotsEls.length) return;

      const total = FEATURED_CAROUSEL_SLIDES.length;
      const activeSlide = FEATURED_CAROUSEL_SLIDES[activeCarouselIndex] || FEATURED_CAROUSEL_SLIDES[0];
      const prevIdx = (activeCarouselIndex - 1 + total) % total;
      const nextIdx = (activeCarouselIndex + 1) % total;
      const prevSlide = FEATURED_CAROUSEL_SLIDES[prevIdx];
      const nextSlide = FEATURED_CAROUSEL_SLIDES[nextIdx];

      const fc = activeSlide.floatingCard;
      const sh = activeSlide.secondaryHud;
      const radialPct = fc.gaugePct || 90;
      const radialOffset = Math.round(110 - (110 * radialPct) / 100);
      const quickFactsHtml = carouselQuickFactsOpen
        ? `
          <div class="carousel-quick-facts-drawer" role="region" aria-label="Quick facts for ${activeSlide.title}">
            <div class="qf-grid">
              <div>
                <span>My Role &amp; Contribution</span>
                <strong>${activeSlide.quickFacts.role}</strong>
              </div>
              <div>
                <span>Period &amp; Date Confidence</span>
                <strong>${activeSlide.quickFacts.period}</strong>
              </div>
              <div>
                <span>Primary Deliverable</span>
                <strong>${activeSlide.quickFacts.deliverable}</strong>
              </div>
            </div>
          </div>
        `
        : "";

      const mobileTypeText = activeSlide.eyebrowType === "INDEPENDENT BUILD" ? "Independent Build" : "Professional Work";
      const mobilePrimaryTag = (activeSlide.tags && activeSlide.tags[0]) || "Systems";
      const topPillLabel = activeSlide.featuredRank <= 4 ? "FEATURED BUILD" : `BUILD ${activeCarouselIndex + 1} / ${total}`;

      const buildPeekContentHtml = (slide, isPrev) => `
        <div class="carousel-peek-content">
          <div class="carousel-peek-topline ${isPrev ? "is-prev-line" : "is-next-line"}">
            ${isPrev ? `<span aria-hidden="true">&larr;</span><span>PREVIOUS</span>` : `<span>NEXT</span><span aria-hidden="true">&rarr;</span>`}
          </div>
          <div class="carousel-peek-body">
            <span class="carousel-peek-badge theme-${slide.peekBadgeTheme || (isPrev ? "purple" : "cyan")}">${slide.peekBadge || slide.eyebrowType}</span>
            <h3>${slide.peekTitle || slide.title}</h3>
            <p>${slide.peekDesc}</p>
            <span class="carousel-peek-circle">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="${isPrev ? "M12.5 8h-9m4-4-4 4 4 4" : "M3.5 8h9m-4-4 4 4-4 4"}"/></svg>
            </span>
          </div>
        </div>
      `;

      const buildPeekCardInnerHtml = (slide, isPrev) => `
        <img class="carousel-peek-bg" src="${slide.banner}" alt="" loading="lazy">
        <div class="carousel-peek-overlay"></div>
        ${buildPeekContentHtml(slide, isPrev)}
      `;

      const buildCenterWrapInnerHtml = () => `
        <button type="button" class="carousel-nav-arrow is-prev" data-carousel-step="-1" aria-label="Previous featured build">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.5 5-5 5 5 5"/></svg>
        </button>

        <article class="carousel-active-card" data-slide-dir="${slideDir}" aria-roledescription="slide" aria-label="${activeCarouselIndex + 1} of ${total}: ${activeSlide.title}">
          <div class="carousel-active-media-top">
            <img class="carousel-active-bg" src="${activeSlide.banner}" alt="${activeSlide.title} (conceptual illustration)" fetchpriority="high">
            <div class="carousel-active-scrim"></div>
            <span class="carousel-mobile-featured-badge" aria-hidden="true">${activeSlide.featuredRank <= 4 ? "FEATURED" : activeSlide.stripBadge}</span>
            <span class="carousel-slide-counter" aria-hidden="true">${activeCarouselIndex + 1} / ${total}</span>
            <div class="carousel-mobile-photo-badges" aria-hidden="true">
              <span class="cm-photo-badge-type ${activeSlide.eyebrowType === "INDEPENDENT BUILD" ? "is-ind" : "is-pro"}">${mobileTypeText}</span>
              <span class="cm-photo-badge-cat">${mobilePrimaryTag}</span>
            </div>
          </div>

          <div class="carousel-active-grid">
            <div class="carousel-active-copy">
              <div class="carousel-eyebrow-row">
                <span class="carousel-featured-pill">${topPillLabel}</span>
                <span class="carousel-type-pill ${activeSlide.eyebrowType === "INDEPENDENT BUILD" ? "is-independent" : "is-professional"}">${activeSlide.eyebrowType}</span>
                <span class="carousel-org-pill">${activeSlide.employerOrProduct}</span>
              </div>

              <h2 class="carousel-active-title" tabindex="-1">
                <span class="carousel-title-lead">${activeSlide.titleLead || activeSlide.title}</span>
                ${activeSlide.titleAccent ? `<span class="carousel-title-accent">${activeSlide.titleAccent}</span>` : ""}
              </h2>
              <p class="carousel-active-summary">${activeSlide.summary}</p>

              <div class="carousel-tags-row" aria-label="Project context tags">
                ${activeSlide.tags.map(t => `<span class="carousel-context-tag">${t}</span>`).join("")}
              </div>

              <div class="carousel-bottom-bar">
                <div class="carousel-metrics-group">
                  <div class="carousel-metrics-row">
                    ${activeSlide.metrics.map(m => `
                      <div class="carousel-metric-item theme-${m.theme || "emerald"}">
                        <div class="carousel-metric-head">
                          <span class="carousel-metric-icon theme-${m.theme || "emerald"}" aria-hidden="true">${getCarouselMetricIconSvg(m.icon)}</span>
                          <div class="carousel-metric-main">
                            <strong data-carousel-metric-val="${m.val}">${m.val}</strong>
                            <span>${m.label}</span>
                          </div>
                        </div>
                      </div>
                    `).join("")}
                  </div>
                </div>

                <div class="carousel-cta-group">
                  <a class="carousel-btn-primary" href="#projects/${activeSlide.slug}" data-proj-link="${activeSlide.slug}">
                    <span class="cta-desktop-text">View build</span>
                    <span class="cta-mobile-text">View case study</span>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8h9m-4-4 4 4-4 4"/></svg>
                  </a>
                </div>
              </div>
            </div>

            <div class="carousel-active-visual-col" aria-hidden="true">
              <div class="carousel-decision-card">
                <div class="carousel-decision-head">
                  <div class="carousel-decision-head-copy">
                    <strong>${fc.title}</strong>
                  </div>
                </div>
                <div class="carousel-decision-status theme-${fc.statusTheme}">
                  <span class="decision-check-badge">✓</span>
                  <span>${fc.status}</span>
                </div>
                <div class="carousel-decision-rows">
                  ${fc.rows.slice(0, 3).map(r => `
                    <div class="carousel-decision-row">
                      <span class="decision-row-key">
                        <span>${r.label}</span>
                      </span>
                      <strong class="decision-row-val theme-${r.theme}">${r.val}</strong>
                    </div>
                  `).join("")}
                </div>
              </div>

              ${sh ? `
                <div class="carousel-secondary-hud">
                  <div class="carousel-sec-hud-title">${sh.title}</div>
                  <ul class="carousel-sec-hud-list">
                    ${sh.items.slice(0, 3).map(item => `
                      <li>
                        <span class="sec-hud-check">✓</span>
                        <span>${item}</span>
                      </li>
                    `).join("")}
                  </ul>
                </div>
              ` : ""}
            </div>
          </div>
        </article>

        <button type="button" class="carousel-nav-arrow is-next" data-carousel-step="1" aria-label="Next featured build">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 5 5 5-5 5"/></svg>
        </button>
      `;

      const measureSlotBox = (node, stageRoot) => {
        if (!node || !stageRoot) return { left: 0, top: 0, width: 0, height: 0 };
        let x = 0;
        let y = 0;
        let cur = node;
        while (cur && cur !== stageRoot && cur instanceof HTMLElement) {
          x += cur.offsetLeft || 0;
          y += cur.offsetTop || 0;
          cur = cur.offsetParent;
        }
        return {
          left: x,
          top: y,
          width: node.offsetWidth || 0,
          height: node.offsetHeight || 0
        };
      };

      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const shouldMorphSlots =
        !prefersReducedMotion &&
        (slideDir === "next" || slideDir === "prev") &&
        typeof Element !== "undefined" &&
        typeof Element.prototype.animate === "function";

      stageEls.forEach((el, sIdx) => {
        if (typeof el._carouselCleanup === "function") {
          el._carouselCleanup();
        }

        const prefix = el.getAttribute("data-carousel-stage") === "home-stage" ? "home-stage-cloud" : `page-stage-cloud-${sIdx}`;
        let prevSlot = el.querySelector(".carousel-peek-card.is-prev");
        let centerWrap = el.querySelector(".carousel-center-wrap");
        let nextSlot = el.querySelector(".carousel-peek-card.is-next");

        if (!prevSlot || !centerWrap || !nextSlot) {
          el.innerHTML = `
            ${renderBuildsStageCloudWeaveHtml(prefix)}
            <div class="carousel-peek-card is-prev" data-carousel-goto="${prevIdx}" aria-hidden="true">
              ${buildPeekCardInnerHtml(prevSlide, true)}
            </div>
            <div class="carousel-center-wrap">
              ${buildCenterWrapInnerHtml()}
            </div>
            <div class="carousel-peek-card is-next" data-carousel-goto="${nextIdx}" aria-hidden="true">
              ${buildPeekCardInnerHtml(nextSlide, false)}
            </div>
          `;
          return;
        }

        const oldActiveCard = centerWrap.querySelector(".carousel-active-card");
        const prevBox = shouldMorphSlots ? measureSlotBox(prevSlot, el) : null;
        const activeBox = shouldMorphSlots && oldActiveCard ? measureSlotBox(oldActiveCard, el) : null;
        const nextBox = shouldMorphSlots ? measureSlotBox(nextSlot, el) : null;

        const isNext = slideDir === "next";
        const canAnimateDesktopSlots =
          shouldMorphSlots &&
          activeBox &&
          activeBox.width > 0 &&
          prevBox &&
          prevBox.width > 0 &&
          nextBox &&
          nextBox.width > 0;
        const canAnimateMobileSlots =
          shouldMorphSlots &&
          activeBox &&
          activeBox.width > 0 &&
          (!prevBox || prevBox.width === 0);

        let exitingPeekGhost = null;
        let activeToPeekGhost = null;
        let mobileOutGhost = null;

        if (canAnimateDesktopSlots) {
          const sourceExitPeek = isNext ? prevSlot : nextSlot;
          exitingPeekGhost = sourceExitPeek.cloneNode(true);
          exitingPeekGhost.removeAttribute("data-carousel-goto");
          exitingPeekGhost.setAttribute("aria-hidden", "true");

          activeToPeekGhost = oldActiveCard.cloneNode(true);
          activeToPeekGhost.setAttribute("aria-hidden", "true");
          activeToPeekGhost.querySelectorAll("[id], [data-carousel-quick-facts], [data-proj-link]").forEach(node => {
            node.removeAttribute("id");
            node.removeAttribute("data-carousel-quick-facts");
            node.removeAttribute("data-proj-link");
          });
        } else if (canAnimateMobileSlots && oldActiveCard) {
          mobileOutGhost = oldActiveCard.cloneNode(true);
          mobileOutGhost.setAttribute("aria-hidden", "true");
          mobileOutGhost.querySelectorAll("[id], [data-carousel-quick-facts], [data-proj-link], [data-carousel-metric-val]").forEach(node => {
            node.removeAttribute("id");
            node.removeAttribute("data-carousel-quick-facts");
            node.removeAttribute("data-proj-link");
            node.removeAttribute("data-carousel-metric-val");
          });
        }

        // Update the 3 live slots in place (keeping the SVG Cloud Weave untouched)
        prevSlot.setAttribute("data-carousel-goto", String(prevIdx));
        prevSlot.innerHTML = buildPeekCardInnerHtml(prevSlide, true);

        centerWrap.innerHTML = buildCenterWrapInnerHtml();

        nextSlot.setAttribute("data-carousel-goto", String(nextIdx));
        nextSlot.innerHTML = buildPeekCardInnerHtml(nextSlide, false);

        const newActiveCard = centerWrap.querySelector(".carousel-active-card");

        if (canAnimateDesktopSlots && newActiveCard && exitingPeekGhost && activeToPeekGhost) {
          const newActiveBox = measureSlotBox(newActiveCard, el);
          const DURATION = 680;
          const EASING = "cubic-bezier(0.32, 0.72, 0, 1)";
          const CROSSFADE_EASING = "ease-in-out";
          const PEEK_PREV_T = "perspective(1050px) rotateY(17deg) scale(0.96)";
          const PEEK_NEXT_T = "perspective(1050px) rotateY(-17deg) scale(0.96)";
          const ACTIVE_REST_T = "perspective(1050px) rotateY(0deg) scale(1)";

          const runningAnims = [];
          const destPeekSlot = isNext ? prevSlot : nextSlot;
          const destPeekBox = isNext ? prevBox : nextBox;
          const srcPeekBox = isNext ? nextBox : prevBox;
          const enteringPeekSlot = isNext ? nextSlot : prevSlot;

          // 1. Outgoing far peek card recedes into outer mist
          const exitStartBox = isNext ? prevBox : nextBox;
          exitingPeekGhost.classList.add("carousel-transition-ghost", "is-slot-morphing");
          Object.assign(exitingPeekGhost.style, {
            position: "absolute",
            left: `${exitStartBox.left}px`,
            top: `${exitStartBox.top}px`,
            width: `${exitStartBox.width}px`,
            height: `${exitStartBox.height}px`,
            zIndex: "3",
            transformOrigin: isNext ? "right center" : "left center"
          });
          el.appendChild(exitingPeekGhost);

          runningAnims.push(
            exitingPeekGhost.animate(
              [
                {
                  transform: isNext ? PEEK_PREV_T : PEEK_NEXT_T,
                  opacity: 0.9,
                  filter: "blur(0px)"
                },
                {
                  transform: isNext
                    ? "translate3d(-175px, 0, 0) perspective(1050px) rotateY(28deg) scale(0.82)"
                    : "translate3d(175px, 0, 0) perspective(1050px) rotateY(-28deg) scale(0.82)",
                  opacity: 0,
                  filter: "blur(3px)"
                }
              ],
              { duration: DURATION, easing: EASING, fill: "forwards" }
            )
          );

          // 2. Old Active Card shrinks, tilts in 3D, and slides into Destination Peek Slot
          destPeekSlot.classList.add("is-slot-morphing", "is-slot-hidden-target");

          activeToPeekGhost.classList.add("carousel-transition-ghost", "is-slot-morphing");
          Object.assign(activeToPeekGhost.style, {
            position: "absolute",
            left: `${activeBox.left}px`,
            top: `${activeBox.top}px`,
            width: `${activeBox.width}px`,
            height: `${activeBox.height}px`,
            minHeight: "0px",
            zIndex: "5",
            transformOrigin: isNext ? "right center" : "left center"
          });

          const ghostActiveGrid = activeToPeekGhost.querySelector(".carousel-active-grid");
          if (ghostActiveGrid) {
            ghostActiveGrid.style.width = `${activeBox.width}px`;
            ghostActiveGrid.style.minWidth = `${activeBox.width}px`;
          }

          const destSlideData = isNext ? prevSlide : nextSlide;
          const ghostPeekLayer = document.createElement("div");
          ghostPeekLayer.className = "carousel-morph-peek-layer";
          ghostPeekLayer.innerHTML = buildPeekContentHtml(destSlideData, isNext);
          activeToPeekGhost.appendChild(ghostPeekLayer);
          el.appendChild(activeToPeekGhost);

          const dxToPeek = destPeekBox.left - activeBox.left;
          const dyToPeek = destPeekBox.top - activeBox.top;

          runningAnims.push(
            activeToPeekGhost.animate(
              [
                {
                  transform: `translate3d(0px, 0px, 0px) ${ACTIVE_REST_T}`,
                  width: `${activeBox.width}px`,
                  height: `${activeBox.height}px`,
                  borderRadius: "22px",
                  opacity: 1,
                  borderColor: "rgba(125, 211, 252, 0.72)",
                  boxShadow: "0 0 34px rgba(56, 189, 248, 0.32), 0 26px 64px rgba(2, 6, 23, 0.72)"
                },
                {
                  transform: `translate3d(${dxToPeek}px, ${dyToPeek}px, 0px) ${isNext ? PEEK_PREV_T : PEEK_NEXT_T}`,
                  width: `${destPeekBox.width}px`,
                  height: `${destPeekBox.height}px`,
                  borderRadius: "18px",
                  opacity: 0.9,
                  borderColor: "rgba(148, 163, 184, 0.3)",
                  boxShadow: "0 20px 44px rgba(2, 6, 23, 0.65)"
                }
              ],
              { duration: DURATION, easing: EASING, fill: "forwards" }
            )
          );

          if (ghostActiveGrid) {
            runningAnims.push(
              ghostActiveGrid.animate(
                [
                  { opacity: 1, transform: "scale(1)" },
                  { opacity: 0, transform: "scale(0.92)", offset: 0.58 },
                  { opacity: 0, transform: "scale(0.88)" }
                ],
                { duration: DURATION, easing: CROSSFADE_EASING, fill: "forwards" }
              )
            );
          }

          runningAnims.push(
            ghostPeekLayer.animate(
              [
                { opacity: 0, transform: "translateY(8px)" },
                { opacity: 0, transform: "translateY(8px)", offset: 0.38 },
                { opacity: 1, transform: "translateY(0px)" }
              ],
              { duration: DURATION, easing: CROSSFADE_EASING, fill: "forwards" }
            )
          );

          const ghostBg = activeToPeekGhost.querySelector(".carousel-active-bg");
          if (ghostBg) {
            runningAnims.push(
              ghostBg.animate(
                [
                  { filter: "brightness(0.88) saturate(1.06)" },
                  { filter: "brightness(0.42) saturate(0.9)" }
                ],
                { duration: DURATION, easing: CROSSFADE_EASING, fill: "forwards" }
              )
            );
          }

          // 3. Incoming Peek Card untwists, expands, and slides into Center Main Slot
          centerWrap.style.height = `${newActiveBox.height}px`;
          newActiveCard.classList.add("is-slot-morphing");
          Object.assign(newActiveCard.style, {
            position: "absolute",
            left: "0px",
            top: "0px",
            width: `${newActiveBox.width}px`,
            height: `${newActiveBox.height}px`,
            minHeight: "0px",
            zIndex: "6",
            transformOrigin: isNext ? "left center" : "right center"
          });

          const liveActiveGrid = newActiveCard.querySelector(".carousel-active-grid");
          if (liveActiveGrid) {
            liveActiveGrid.style.width = `${newActiveBox.width}px`;
            liveActiveGrid.style.minWidth = `${newActiveBox.width}px`;
          }

          const incomingPeekLayer = document.createElement("div");
          incomingPeekLayer.className = "carousel-morph-peek-layer";
          incomingPeekLayer.innerHTML = buildPeekContentHtml(activeSlide, !isNext);
          newActiveCard.appendChild(incomingPeekLayer);

          const dxFromPeek = srcPeekBox.left - newActiveBox.left;
          const dyFromPeek = srcPeekBox.top - newActiveBox.top;

          const mainMorphAnim = newActiveCard.animate(
            [
              {
                transform: `translate3d(${dxFromPeek}px, ${dyFromPeek}px, 0px) ${isNext ? PEEK_NEXT_T : PEEK_PREV_T}`,
                width: `${srcPeekBox.width}px`,
                height: `${srcPeekBox.height}px`,
                borderRadius: "18px",
                opacity: 0.94,
                borderColor: "rgba(148, 163, 184, 0.35)",
                boxShadow: "0 20px 44px rgba(2, 6, 23, 0.65)"
              },
              {
                transform: `translate3d(0px, 0px, 0px) ${ACTIVE_REST_T}`,
                width: `${newActiveBox.width}px`,
                height: `${newActiveBox.height}px`,
                borderRadius: "22px",
                opacity: 1,
                borderColor: "rgba(125, 211, 252, 0.72)",
                boxShadow: "0 0 34px rgba(56, 189, 248, 0.32), 0 26px 64px rgba(2, 6, 23, 0.72)"
              }
            ],
            { duration: DURATION, easing: EASING, fill: "forwards" }
          );
          runningAnims.push(mainMorphAnim);

          runningAnims.push(
            incomingPeekLayer.animate(
              [
                { opacity: 1, transform: "translateY(0px)" },
                { opacity: 0, transform: "translateY(-8px)", offset: 0.52 },
                { opacity: 0, transform: "translateY(-8px)" }
              ],
              { duration: DURATION, easing: CROSSFADE_EASING, fill: "forwards" }
            )
          );

          if (liveActiveGrid) {
            runningAnims.push(
              liveActiveGrid.animate(
                [
                  { opacity: 0, transform: "translateY(10px)" },
                  { opacity: 0, transform: "translateY(10px)", offset: 0.32 },
                  { opacity: 1, transform: "translateY(0px)" }
                ],
                { duration: DURATION, easing: CROSSFADE_EASING, fill: "forwards" }
              )
            );
          }

          const liveBg = newActiveCard.querySelector(".carousel-active-bg");
          if (liveBg) {
            runningAnims.push(
              liveBg.animate(
                [
                  { filter: "brightness(0.42) saturate(0.9)" },
                  { filter: "brightness(0.88) saturate(1.06)" }
                ],
                { duration: DURATION, easing: CROSSFADE_EASING, fill: "forwards" }
              )
            );
          }

          // 4. New Far Peek Card glides in from outer mist into Source Peek Slot
          enteringPeekSlot.classList.add("is-slot-morphing");
          enteringPeekSlot.style.height = `${srcPeekBox.height}px`;
          enteringPeekSlot.style.transformOrigin = isNext ? "left center" : "right center";
          runningAnims.push(
            enteringPeekSlot.animate(
              [
                {
                  transform: isNext
                    ? "translate3d(175px, 0, 0) perspective(1050px) rotateY(-28deg) scale(0.82)"
                    : "translate3d(-175px, 0, 0) perspective(1050px) rotateY(28deg) scale(0.82)",
                  opacity: 0,
                  filter: "blur(3px)"
                },
                {
                  transform: isNext ? PEEK_NEXT_T : PEEK_PREV_T,
                  opacity: 0.9,
                  filter: "blur(0px)"
                }
              ],
              { duration: DURATION, easing: EASING, fill: "forwards" }
            )
          );

          let cleanedUp = false;
          let fallbackCleanupTimer = null;
          const cleanupDesktopMorph = () => {
            if (cleanedUp) return;
            cleanedUp = true;
            if (fallbackCleanupTimer) {
              clearTimeout(fallbackCleanupTimer);
              fallbackCleanupTimer = null;
            }
            runningAnims.forEach(a => {
              try {
                a.cancel();
              } catch (_e) {}
            });
            if (exitingPeekGhost && exitingPeekGhost.parentNode) exitingPeekGhost.remove();
            if (activeToPeekGhost && activeToPeekGhost.parentNode) activeToPeekGhost.remove();
            if (incomingPeekLayer && incomingPeekLayer.parentNode) incomingPeekLayer.remove();

            destPeekSlot.classList.remove("is-slot-morphing", "is-slot-hidden-target");
            destPeekSlot.style.opacity = "";
            destPeekSlot.style.pointerEvents = "";

            enteringPeekSlot.classList.remove("is-slot-morphing");
            enteringPeekSlot.style.height = "";
            enteringPeekSlot.style.transformOrigin = "";

            centerWrap.style.height = "";
            newActiveCard.classList.remove("is-slot-morphing");
            Object.assign(newActiveCard.style, {
              position: "",
              left: "",
              top: "",
              width: "",
              height: "",
              minHeight: "",
              zIndex: "",
              transformOrigin: ""
            });
            if (liveActiveGrid) {
              liveActiveGrid.style.width = "";
              liveActiveGrid.style.minWidth = "";
            }
            el._carouselCleanup = null;
          };

          fallbackCleanupTimer = setTimeout(cleanupDesktopMorph, DURATION + 60);
          el._carouselCleanup = cleanupDesktopMorph;
          mainMorphAnim.onfinish = cleanupDesktopMorph;
          mainMorphAnim.oncancel = cleanupDesktopMorph;
        } else if (canAnimateMobileSlots && newActiveCard && mobileOutGhost) {
          const DURATION = 820;
          const SLIDE_EASING = "cubic-bezier(0.25, 0.8, 0.25, 1)";
          const FADE_EASING = "cubic-bezier(0.37, 0, 0.63, 1)";
          const runningAnims = [];

          // Lock wrapper & card height so neither the Main Card nor the Sub-Cards strip jumps by even 1px
          centerWrap.style.height = `${activeBox.height}px`;
          centerWrap.style.minHeight = `${activeBox.height}px`;
          newActiveCard.style.height = `${activeBox.height}px`;
          newActiveCard.style.minHeight = `${activeBox.height}px`;

          mobileOutGhost.classList.add("carousel-transition-ghost", "is-slot-morphing");
          Object.assign(mobileOutGhost.style, {
            position: "absolute",
            left: "0px",
            top: "0px",
            width: `${activeBox.width}px`,
            height: `${activeBox.height}px`,
            minHeight: `${activeBox.height}px`,
            zIndex: "auto",
            pointerEvents: "none"
          });
          centerWrap.appendChild(mobileOutGhost);

          newActiveCard.classList.add("is-slot-morphing");
          newActiveCard.style.zIndex = "auto";

          // 1. Keep .carousel-active-media-top (z-index: 4) seated in the stationary u_mainCard window
          // so the WebGL cloud wreath (z-index: 8) never loses its dark card backing or exposes --back clouds.
          const outMedia = mobileOutGhost.querySelector(".carousel-active-media-top");
          const outBg = mobileOutGhost.querySelector(".carousel-active-bg");
          const inMedia = newActiveCard.querySelector(".carousel-active-media-top");
          const inBg = newActiveCard.querySelector(".carousel-active-bg");

          if (inMedia) {
            inMedia.style.opacity = "1";
          }
          if (outMedia) {
            runningAnims.push(
              outMedia.animate(
                [
                  { opacity: 1 },
                  { opacity: 0 }
                ],
                { duration: DURATION, easing: FADE_EASING, fill: "forwards" }
              )
            );
          }
          if (outBg) {
            runningAnims.push(
              outBg.animate(
                [
                  { transform: "translate3d(0px, 0px, 0px) scale(1.02)" },
                  { transform: `translate3d(${isNext ? -46 : 46}px, 0px, 0px) scale(1.06)` }
                ],
                { duration: DURATION, easing: SLIDE_EASING, fill: "forwards" }
              )
            );
          }
          if (inBg) {
            runningAnims.push(
              inBg.animate(
                [
                  { transform: `translate3d(${isNext ? 46 : -46}px, 0px, 0px) scale(1.06)` },
                  { transform: "translate3d(0px, 0px, 0px) scale(1.02)" }
                ],
                { duration: DURATION, easing: SLIDE_EASING, fill: "forwards" }
              )
            );
          }

          // 2. Smoothly glide & crossfade .carousel-active-grid (z-index: 12) WITHIN the card bounds
          // so text and HUD cards never fly outside the card over the white clouds.
          const outGrid = mobileOutGhost.querySelector(".carousel-active-grid");
          const inGrid = newActiveCard.querySelector(".carousel-active-grid");
          let mobInAnim = null;

          if (outGrid) {
            runningAnims.push(
              outGrid.animate(
                [
                  { transform: "translate3d(0px, 0px, 0px) scale(1)", opacity: 1 },
                  { transform: `translate3d(${isNext ? -34 : 34}px, 0px, 0px) scale(0.99)`, opacity: 0, offset: 0.50 },
                  { transform: `translate3d(${isNext ? -42 : 42}px, 0px, 0px) scale(0.985)`, opacity: 0 }
                ],
                { duration: DURATION, easing: FADE_EASING, fill: "forwards" }
              )
            );
          }
          if (inGrid) {
            mobInAnim = inGrid.animate(
              [
                { transform: `translate3d(${isNext ? 42 : -42}px, 0px, 0px) scale(0.985)`, opacity: 0 },
                { transform: `translate3d(${isNext ? 30 : -30}px, 0px, 0px) scale(0.992)`, opacity: 0, offset: 0.24 },
                { transform: "translate3d(0px, 0px, 0px) scale(1)", opacity: 1 }
              ],
              { duration: DURATION, easing: SLIDE_EASING, fill: "forwards" }
            );
            runningAnims.push(mobInAnim);
          }

          let cleanedUp = false;
          let fallbackMobileTimer = null;
          const cleanupMobileMorph = () => {
            if (cleanedUp) return;
            cleanedUp = true;
            if (fallbackMobileTimer) {
              clearTimeout(fallbackMobileTimer);
              fallbackMobileTimer = null;
            }
            runningAnims.forEach(a => {
              try {
                a.cancel();
              } catch (_e) {}
            });
            if (mobileOutGhost && mobileOutGhost.parentNode) mobileOutGhost.remove();
            centerWrap.style.height = "";
            centerWrap.style.minHeight = "";
            newActiveCard.classList.remove("is-slot-morphing");
            newActiveCard.removeAttribute("data-slide-dir");
            newActiveCard.style.height = "";
            newActiveCard.style.minHeight = "";
            newActiveCard.style.zIndex = "";
            if (inMedia) inMedia.style.opacity = "";
            el._carouselCleanup = null;
          };

          fallbackMobileTimer = setTimeout(cleanupMobileMorph, DURATION + 60);
          el._carouselCleanup = cleanupMobileMorph;
          if (mobInAnim) {
            mobInAnim.onfinish = cleanupMobileMorph;
            mobInAnim.oncancel = cleanupMobileMorph;
          }
        }
      });

      const dotsHtml = FEATURED_CAROUSEL_SLIDES.map((s, idx) => `
        <button type="button" role="tab" aria-selected="${idx === activeCarouselIndex ? "true" : "false"}" class="carousel-dot-btn ${idx === activeCarouselIndex ? "is-active" : ""}" data-carousel-dot="${idx}" aria-label="Go to featured project ${idx + 1} of ${total}: ${s.title}" ${idx === activeCarouselIndex ? 'aria-current="true"' : ""}></button>
      `).join("");
      dotsEls.forEach(el => {
        el.innerHTML = dotsHtml;
      });

      if (stripEls.length) {
        const stripOrder = [0, 3, 1, 2];
        const stripHtml = stripOrder.map(slideIdx => {
          const s = FEATURED_CAROUSEL_SLIDES[slideIdx];
          if (!s) return "";
          const isCurrent = slideIdx === activeCarouselIndex;
          const m0 = (s.metrics && s.metrics[0]) || { val: "Live", label: "Verified", gaugePct: 90, theme: "emerald" };
          return `
            <div class="carousel-strip-card ${isCurrent ? "is-active" : ""}" role="listitem" data-carousel-goto="${slideIdx}" tabindex="0" aria-label="Select featured slide: ${s.stripTitle}">
              <div class="carousel-strip-thumb">
                <img src="${s.banner}" alt="" loading="lazy">
              </div>
              <div class="carousel-strip-copy">
                <div class="strip-badge-metric-row">
                  <span class="carousel-strip-badge theme-${s.stripBadgeTheme || "amber"}">${s.stripBadge}</span>
                  <span class="strip-mini-metric">${m0.val} ${m0.label}</span>
                </div>
                <strong>${s.stripTitle}</strong>
                <span>${s.stripSub}</span>
                <div class="strip-mini-gauge" aria-hidden="true">
                  <span class="strip-mini-gauge-fill theme-${m0.theme || "emerald"}" style="width:${m0.gaugePct || 88}%"></span>
                </div>
              </div>
              <a class="carousel-strip-go" href="#projects/${s.slug}" data-proj-link="${s.slug}" aria-label="Open ${s.stripTitle} case study" title="Open case study">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8h9m-4-4 4 4-4 4"/></svg>
              </a>
            </div>
          `;
        }).join("");
        stripEls.forEach(el => {
          el.innerHTML = stripHtml;
        });
      }

      const loopTrackEls = document.querySelectorAll("[data-home-projects-loop-track]");
      if (loopTrackEls.length) {
        const sortedAll = PROJECTS_CATALOG.slice().sort((a, b) => {
          const ma = CHRONO_META_BY_SLUG[a.slug] || { sortYear: a.yearSort || 2015, curatedRank: 99, unestablishedDate: false };
          const mb = CHRONO_META_BY_SLUG[b.slug] || { sortYear: b.yearSort || 2015, curatedRank: 99, unestablishedDate: false };
          if (ma.unestablishedDate !== mb.unestablishedDate) {
            return ma.unestablishedDate ? 1 : -1;
          }
          if (ma.sortYear !== mb.sortYear) return mb.sortYear - ma.sortYear;
          return ma.curatedRank - mb.curatedRank;
        });

        const buildLoopPassHtml = isDuplicatePass =>
          sortedAll
            .map(proj => {
              const meta = CHRONO_META_BY_SLUG[proj.slug] || {
                railTop: proj.period || "",
                railBottom: "",
                railNote: proj.org || "",
                nodeTheme: "blue"
              };
              const featuredIdx = FEATURED_CAROUSEL_SLIDES.findIndex(s => s.slug === proj.slug);
              const slideData = featuredIdx >= 0 ? FEATURED_CAROUSEL_SLIDES[featuredIdx] : null;
              const isCurrentFeatured = featuredIdx >= 0 && featuredIdx === activeCarouselIndex;
              const isTopFour = slideData && slideData.featuredRank <= 4;
              const m0 = (slideData && slideData.metrics && slideData.metrics[0]) || {
                val: (proj.keyResultsMetrics && proj.keyResultsMetrics[0] && proj.keyResultsMetrics[0].val) || "Live",
                label: (proj.cardTags && proj.cardTags[0]) || "System",
                gaugePct: proj.impactScore || 88,
                theme: "emerald"
              };
              const dateMain =
                meta.railTop === "Date not"
                  ? "Date not established"
                  : meta.railTop === "Approx."
                  ? `Approx. ${meta.railBottom}`
                  : meta.railBottom
                  ? `${meta.railTop} – ${meta.railBottom}`
                  : meta.railTop;
              const badgeTheme =
                isTopFour
                  ? "amber"
                  : proj.badgeType === "INDEPENDENT"
                  ? "blue"
                  : meta.nodeTheme === "purple"
                  ? "emerald"
                  : meta.nodeTheme === "teal"
                  ? "blue"
                  : "purple";
              const badgeLabel =
                isTopFour
                  ? "FEATURED"
                  : (slideData && slideData.stripBadge) || (proj.cardTags && proj.cardTags[0]) || proj.org;
              const subLabel = `${proj.org} · ${(proj.cardTags && proj.cardTags[0]) || "Systems"}`;

              return `
                <div class="home-loop-project-item" ${isDuplicatePass ? 'aria-hidden="true"' : 'role="listitem"'}>
                  <div
                    class="carousel-strip-card home-loop-card ${isCurrentFeatured ? "is-active" : ""}"
                    ${featuredIdx >= 0 ? `data-carousel-goto="${featuredIdx}"` : `data-proj-link="${proj.slug}"`}
                    ${isDuplicatePass ? 'tabindex="-1"' : 'tabindex="0"'}
                    aria-label="${proj.shortTitle || proj.title} (${dateMain})"
                  >
                    <div class="carousel-strip-thumb">
                      <img src="${proj.banner}" alt="" loading="lazy">
                    </div>
                    <div class="carousel-strip-copy">
                      <div class="strip-badge-metric-row">
                        <span class="carousel-strip-badge theme-${badgeTheme}">${badgeLabel}</span>
                        <span class="strip-mini-metric">${m0.val} · ${m0.label}</span>
                      </div>
                      <strong>${proj.shortTitle || proj.title}</strong>
                      <span>${subLabel}</span>
                      <div class="strip-mini-gauge" aria-hidden="true">
                        <span class="strip-mini-gauge-fill theme-${m0.theme || "emerald"}" style="width:${m0.gaugePct || 88}%"></span>
                      </div>
                    </div>
                    <a
                      class="carousel-strip-go"
                      href="#projects/${proj.slug}"
                      data-proj-link="${proj.slug}"
                      ${isDuplicatePass ? 'tabindex="-1"' : ""}
                      aria-label="Open ${proj.shortTitle || proj.title} case study"
                      title="Open case study"
                    >
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8h9m-4-4 4 4-4 4"/></svg>
                    </a>
                  </div>

                  <div class="home-loop-date-rail">
                    <div class="home-loop-rail-line-row" aria-hidden="true">
                      <span class="home-loop-rail-dot theme-${meta.nodeTheme || "blue"}"></span>
                      <span class="home-loop-rail-line"></span>
                    </div>
                    <div class="home-loop-date-copy">
                      <strong class="home-loop-date-main">${dateMain}</strong>
                      <span class="home-loop-date-note">${meta.railNote || proj.org}</span>
                    </div>
                  </div>
                </div>
              `;
            })
            .join("");

        loopTrackEls.forEach(trackEl => {
          if (!trackEl.hasAttribute("data-loop-initialized")) {
            trackEl.innerHTML = buildLoopPassHtml(false) + buildLoopPassHtml(true);
            trackEl.setAttribute("data-loop-initialized", "true");
          } else {
            // Update active state in place without resetting marquee animation
            trackEl.querySelectorAll(".home-loop-card[data-carousel-goto]").forEach(cardEl => {
              const idx = Number(cardEl.getAttribute("data-carousel-goto"));
              cardEl.classList.toggle("is-active", idx === activeCarouselIndex);
            });
          }
        });
      }

      animateCarouselSlideElements(slideDir);
    }

    function getChronoMetaIconSvg(iconName) {
      if (iconName === "status") {
        return `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="9" r="6.5"/><path d="m6.3 9.2 1.8 1.8 3.6-3.6"/></svg>`;
      }
      if (iconName === "type") {
        return `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="9 2.2 2.5 5.8 9 9.4 15.5 5.8 9 2.2"/><polyline points="2.5 9.4 9 13 15.5 9.4"/><polyline points="2.5 12.6 9 16.2 15.5 12.6"/></svg>`;
      }
      if (iconName === "role") {
        return `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="6.2" r="2.6"/><path d="M3.8 15.2v-1.1a3.8 3.8 0 0 1 3.8-3.8h2.8a3.8 3.8 0 0 1 3.8 3.8v1.1"/></svg>`;
      }
      if (iconName === "org") {
        return `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.2" y="2.8" width="11.6" height="12.4" rx="1.4"/><path d="M6.5 6h1.8M9.7 6h1.8M6.5 9h1.8M9.7 9h1.8M7.8 15.2v-3h2.4v3"/></svg>`;
      }
      if (iconName === "period") {
        return `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.8" y="4" width="12.4" height="11.2" rx="1.8"/><path d="M2.8 7.5h12.4M6 2.3v2.6M12 2.3v2.6"/></svg>`;
      }
      return `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="9" r="6.5"/><circle cx="9" cy="9" r="2.6"/></svg>`;
    }

    function getFilteredProjectsList() {
      const q = activeProjectSearch.trim().toLowerCase();
      let list = PROJECTS_CATALOG.filter(p => {
        const matchesType = activeChronoType === "all" || p.categories.includes(activeChronoType);
        const matchesTopic = !activeChronoTopic || p.categories.includes(activeChronoTopic);
        const matchesTag = !activeProjectTag || (p.allTags || []).includes(activeProjectTag) || (p.cardTags || []).includes(activeProjectTag);
        const matchesQuery = !q ||
          p.title.toLowerCase().includes(q) ||
          p.shortDesc.toLowerCase().includes(q) ||
          (p.previewProblem || "").toLowerCase().includes(q) ||
          (p.previewSolution || "").toLowerCase().includes(q) ||
          p.org.toLowerCase().includes(q) ||
          (p.cardTags || []).some(t => t.toLowerCase().includes(q)) ||
          (p.glance?.technologies || "").toLowerCase().includes(q);
        return matchesType && matchesTopic && matchesTag && matchesQuery;
      });

      list = list.slice().sort((a, b) => {
        const ma = CHRONO_META_BY_SLUG[a.slug] || { sortYear: a.yearSort || 2015, curatedRank: 99, unestablishedDate: false };
        const mb = CHRONO_META_BY_SLUG[b.slug] || { sortYear: b.yearSort || 2015, curatedRank: 99, unestablishedDate: false };
        // Keep Date-not-established records in their own trailing group so dates are never fabricated
        if (ma.unestablishedDate !== mb.unestablishedDate) {
          return ma.unestablishedDate ? 1 : -1;
        }
        if (activeChronoSort === "oldest") {
          if (ma.sortYear !== mb.sortYear) return ma.sortYear - mb.sortYear;
          return ma.curatedRank - mb.curatedRank;
        }
        if (ma.sortYear !== mb.sortYear) return mb.sortYear - ma.sortYear;
        return ma.curatedRank - mb.curatedRank;
      });

      return list;
    }

    function renderChronologicalRowHtml(proj) {
      const meta = CHRONO_META_BY_SLUG[proj.slug] || {
        railTop: proj.period,
        railBottom: "",
        railNote: "",
        nodeTheme: "blue",
        statusBadge: proj.status || "Delivered",
        metaRows: [
          { icon: "org", label: "Employer", val: proj.org },
          { icon: "outcome", label: "Outcome", val: proj.glance?.outcome || "" }
        ]
      };
      const isIndependent = proj.badgeType === "INDEPENDENT";
      const typeLabel = isIndependent ? "INDEPENDENT BUILD" : "PROFESSIONAL WORK";
      const mobileShortBadge = isIndependent ? "Independent" : "Professional";
      const tags = (proj.cardTags || []).slice(0, 3);
      const mobileBottomTags = (proj.cardTags || []).slice(0, 3);
      const slideMatch = FEATURED_CAROUSEL_SLIDES.find(s => s.slug === proj.slug);
      const slideMetrics = (slideMatch && slideMatch.metrics) || [];
      const fcGauge = (slideMatch && slideMatch.floatingCard) || {
        gaugeVal: "Live",
        gaugeLabel: "Verified",
        gaugePct: proj.impactScore || 88,
        gaugeTheme: "emerald"
      };
      const chronoRadialOffset = Math.round(110 - (110 * (fcGauge.gaugePct || 88)) / 100);

      return `
        <div class="chrono-timeline-row theme-${meta.nodeTheme}" data-chrono-row="${proj.slug}">
          <div class="chrono-rail-col" aria-hidden="true">
            <div class="chrono-rail-dates">
              <strong class="chrono-date-top">${meta.railTop}</strong>
              ${meta.railBottom ? `<span class="chrono-date-bottom">${meta.railBottom}</span>` : ""}
              ${meta.railNote ? `<small class="chrono-date-note">${meta.railNote}</small>` : ""}
            </div>
            <div class="chrono-rail-track">
              <span class="chrono-rail-node theme-${meta.nodeTheme}"></span>
            </div>
          </div>

          <a class="chrono-project-card" href="#projects/${proj.slug}" data-proj-link="${proj.slug}" aria-label="${proj.title} — ${typeLabel} (${proj.org})">
            <div class="chrono-card-media">
              <img src="${proj.banner}" alt="${proj.title} (conceptual illustration)" loading="lazy">
              <div class="chrono-media-gauge-badge" aria-hidden="true">
                <svg viewBox="0 0 44 44" class="chrono-media-gauge-svg">
                  <circle class="chrono-gauge-track" cx="22" cy="22" r="17.5" />
                  <circle class="chrono-gauge-arc theme-${fcGauge.gaugeTheme || "emerald"}" cx="22" cy="22" r="17.5" stroke-dasharray="110" stroke-dashoffset="${chronoRadialOffset}" />
                </svg>
                <div class="chrono-media-gauge-copy">
                  <strong>${fcGauge.gaugeVal}</strong>
                  <span>${fcGauge.gaugeLabel}</span>
                </div>
              </div>
            </div>

            <div class="chrono-card-center">
              <div class="chrono-card-pills">
                <span class="chrono-type-badge ${isIndependent ? "is-independent" : "is-professional"}">${typeLabel}</span>
                ${tags.map(t => `<span class="chrono-topic-chip">${t}</span>`).join("")}
              </div>

              <div class="chrono-mobile-top-badge-row" aria-hidden="true">
                <span class="chrono-mobile-soft-badge ${isIndependent ? "is-ind" : "is-pro"}">${mobileShortBadge}</span>
                <span class="chrono-mobile-inline-chevron">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 4 4 4-4 4"/></svg>
                </span>
              </div>

              <h3 class="chrono-card-title">${proj.title}</h3>

              <p class="chrono-card-desc">
                <span class="chrono-sentence-problem">${proj.previewProblem || proj.shortDesc}</span>
                <span class="chrono-sentence-outcome">${proj.previewSolution || ""}</span>
              </p>

              ${slideMetrics.length ? `
                <div class="chrono-card-metrics-strip" aria-hidden="true">
                  ${slideMetrics.map(m => `
                    <div class="chrono-mini-metric-chip theme-${m.theme || "emerald"}">
                      <div class="chrono-mini-metric-top">
                        <strong>${m.val}</strong>
                        <span>${m.label}</span>
                      </div>
                      <div class="chrono-mini-metric-bar">
                        <span class="chrono-mini-metric-fill theme-${m.theme || "emerald"}" style="width:${m.gaugePct || 86}%"></span>
                      </div>
                    </div>
                  `).join("")}
                </div>
              ` : ""}

              <p class="chrono-mobile-short-desc">${proj.shortDesc}</p>
            </div>

            <div class="chrono-mobile-bottom-tags" aria-hidden="true">
              ${mobileBottomTags.map(t => `<span class="chrono-mobile-tag-pill">${t}</span>`).join("")}
            </div>

            <div class="chrono-card-meta-box">
              ${meta.metaRows.map(row => `
                <div class="chrono-meta-item">
                  <span class="chrono-meta-icon" aria-hidden="true">${getChronoMetaIconSvg(row.icon)}</span>
                  <div class="chrono-meta-text">
                    <span class="chrono-meta-label">${row.label}</span>
                    <strong class="chrono-meta-val ${row.highlight ? `is-${row.highlight}` : ""}">${row.val}</strong>
                  </div>
                </div>
              `).join("")}
            </div>

            <div class="chrono-card-chevron-col" aria-hidden="true">
              <span class="chrono-chevron-circle">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 4 4 4-4 4"/></svg>
              </span>
            </div>
          </a>
        </div>
      `;
    }

    function renderProjectsPreviewPanel() {
      // No-op in Carousel + Chronological layout
    }

    function renderProjectsExplorerGrid() {
      const gridEl = document.querySelector("[data-proj-cards-grid]");
      if (!gridEl) return;
      const list = getFilteredProjectsList();
      gridEl.classList.toggle("is-compact-list", activeProjectViewMode === "list");

      const statusEl = document.querySelector("[data-chrono-status-summary]");
      const clearBtn = document.querySelector(".chrono-clear-filters-btn");
      const mobileCountEl = document.querySelector("[data-chrono-mobile-count]");
      const mobileSortLabelEl = document.querySelector("[data-chrono-mobile-sort-label]");
      const hasActiveFilters = activeChronoType !== "all" || Boolean(activeChronoTopic) || Boolean(activeProjectSearch.trim());

      if (clearBtn) {
        clearBtn.hidden = !hasActiveFilters;
      }
      if (mobileCountEl) {
        mobileCountEl.textContent = `(${list.length})`;
      }
      if (mobileSortLabelEl) {
        mobileSortLabelEl.textContent = activeChronoSort === "oldest" ? "Oldest first" : "Newest first";
      }

      if (statusEl) {
        const sortLabel = activeChronoSort === "oldest" ? "oldest first" : "newest first";
        statusEl.innerHTML = `<strong>Selected work</strong> &middot; Showing ${list.length} of ${PROJECTS_CATALOG.length} case studies in chronological index (${sortLabel}). Timeline placement reflects career chapter or employer tenure where exact project release dates are not established.`;
      }

      if (list.length === 0) {
        gridEl.innerHTML = `
          <div class="proj-empty-state">
            <p>No projects matched your current filter or search query.</p>
            <button type="button" class="proj-reset-btn" data-proj-clear-filters>Clear filters</button>
          </div>
        `;
      } else {
        gridEl.innerHTML = list.map(p => renderChronologicalRowHtml(p)).join("");
      }
    }

    renderFeaturedCarousel();
    renderProjectsExplorerGrid();

    // 4C. Build Rich Individual Project Detail Workbench inside #project-detail (Matching Reference Image 2)
    const detailSection = document.getElementById("project-detail");
    let activeDetailTab = "overview";
    let activeVisualSlide = 0;

    function buildVisualShowcaseHtml(proj) {
      if (proj.slug === "renewals" || proj.categories.includes("insurance")) {
        return `
          <div class="proj-visuals-split">
            <div>
              <div class="proj-visual-mock-ui">
                <div class="mock-ui-sidebar">
                  <div class="mock-ui-nav-item"><span class="mock-dot"></span> Dashboard</div>
                  <div class="mock-ui-nav-item is-active"><span class="mock-dot"></span> Renewals</div>
                  <div class="mock-ui-nav-item"><span class="mock-dot"></span> Policies</div>
                  <div class="mock-ui-nav-item"><span class="mock-dot"></span> Exceptions</div>
                  <div class="mock-ui-nav-item"><span class="mock-dot"></span> Reports</div>
                </div>
                <div class="mock-ui-table-wrap">
                  <table class="mock-ui-table">
                    <thead>
                      <tr>
                        <th>Policy</th>
                        <th>Status</th>
                        <th>Risk Score</th>
                        <th>Rules</th>
                        <th>Decision</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>P-100234</strong></td>
                        <td>Active</td>
                        <td>Low</td>
                        <td>Pass</td>
                        <td><span class="mock-pill mock-pill-green">Auto-Renew</span></td>
                      </tr>
                      <tr>
                        <td><strong>P-100235</strong></td>
                        <td>Active</td>
                        <td>Low</td>
                        <td>Pass</td>
                        <td><span class="mock-pill mock-pill-green">Auto-Renew</span></td>
                      </tr>
                      <tr>
                        <td><strong>P-100236</strong></td>
                        <td>Active</td>
                        <td class="mock-text-amber">Medium</td>
                        <td>Review</td>
                        <td><span class="mock-pill mock-pill-red">Exception</span></td>
                      </tr>
                      <tr>
                        <td><strong>P-100237</strong></td>
                        <td>Active</td>
                        <td class="mock-text-red">High</td>
                        <td>Review</td>
                        <td><span class="mock-pill mock-pill-red">Exception</span></td>
                      </tr>
                      <tr>
                        <td><strong>P-100238</strong></td>
                        <td>Active</td>
                        <td>Low</td>
                        <td>Pass</td>
                        <td><span class="mock-pill mock-pill-green">Auto-Renew</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <p class="proj-visual-caption">Conceptual illustration — reconstructed decision queue illustrating straight-through renewal vs. exception referral.</p>
            </div>

            <div>
              <div class="proj-visual-flowchart">
                <div class="flowchart-badge">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="8" r="3"/><path d="M8 2v2M8 12v2M2 8h2M12 8h2"/></svg>
                  <span>Illustrative workflow · Rule Engine</span>
                </div>
                <svg class="flowchart-svg" viewBox="0 0 460 220" aria-label="Illustrative rule engine decision flow diagram">
                  <defs>
                    <marker id="fcArrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                      <path d="M 0 1 L 7 4 L 0 7 z" fill="#94a3b8"/>
                    </marker>
                  </defs>
                  <!-- Connectors -->
                  <path d="M 230 38 L 230 52 M 95 52 L 365 52 M 95 52 L 95 66 M 230 52 L 230 66 M 365 52 L 365 66" stroke="#cbd5e1" stroke-width="1.6" fill="none"/>
                  <path d="M 95 94 L 95 108 M 230 94 L 230 108 M 365 94 L 365 108 M 95 108 L 365 108 M 230 108 L 230 120" stroke="#cbd5e1" stroke-width="1.6" fill="none" marker-end="url(#fcArrow)"/>
                  <path d="M 230 148 L 230 162" stroke="#cbd5e1" stroke-width="1.6" fill="none" marker-end="url(#fcArrow)"/>
                  <path d="M 182 184 L 122 184" stroke="#10b981" stroke-width="1.6" fill="none" marker-end="url(#fcArrow)"/>
                  <path d="M 278 184 L 336 184" stroke="#f87171" stroke-width="1.6" fill="none" marker-end="url(#fcArrow)"/>

                  <!-- Top Node: Policy Data -->
                  <rect x="175" y="10" width="110" height="28" rx="6" fill="#eff6ff" stroke="#93c5fd" stroke-width="1.4"/>
                  <text x="230" y="28" text-anchor="middle" fill="#1e3a8a" font-size="11.5" font-weight="700">Policy Data</text>

                  <!-- 3 Mid Nodes -->
                  <rect x="38" y="66" width="114" height="28" rx="6" fill="#f0f9ff" stroke="#bae6fd" stroke-width="1.4"/>
                  <text x="95" y="84" text-anchor="middle" fill="#0369a1" font-size="11" font-weight="600">Property Risk</text>

                  <rect x="173" y="66" width="114" height="28" rx="6" fill="#f0f9ff" stroke="#bae6fd" stroke-width="1.4"/>
                  <text x="230" y="84" text-anchor="middle" fill="#0369a1" font-size="11" font-weight="600">Claims History</text>

                  <rect x="308" y="66" width="114" height="28" rx="6" fill="#f0f9ff" stroke="#bae6fd" stroke-width="1.4"/>
                  <text x="365" y="84" text-anchor="middle" fill="#0369a1" font-size="11" font-weight="600">Business Rules</text>

                  <!-- Validation Node -->
                  <rect x="175" y="120" width="110" height="28" rx="6" fill="#eff6ff" stroke="#93c5fd" stroke-width="1.4"/>
                  <text x="230" y="138" text-anchor="middle" fill="#1e3a8a" font-size="11.5" font-weight="700">Validation</text>

                  <!-- Diamond: Eligible? -->
                  <polygon points="230,162 278,184 230,206 182,184" fill="#dcfce7" stroke="#4ade80" stroke-width="1.5"/>
                  <text x="230" y="188" text-anchor="middle" fill="#065f46" font-size="10.5" font-weight="700">Eligible?</text>

                  <!-- Yes / No Labels -->
                  <rect x="140" y="175" width="26" height="16" rx="3" fill="#ffffff"/>
                  <text x="153" y="186" text-anchor="middle" fill="#059669" font-size="9.5" font-weight="700">Yes</text>

                  <rect x="294" y="175" width="22" height="16" rx="3" fill="#ffffff"/>
                  <text x="305" y="186" text-anchor="middle" fill="#dc2626" font-size="9.5" font-weight="700">No</text>

                  <!-- Auto-Renew Pill -->
                  <rect x="26" y="170" width="92" height="28" rx="7" fill="#10b981"/>
                  <text x="72" y="188" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="700">Auto-Renew</text>

                  <!-- Send to Underwriter Pill -->
                  <rect x="340" y="170" width="108" height="28" rx="7" fill="#fee2e2" stroke="#fca5a5" stroke-width="1.4"/>
                  <text x="394" y="188" text-anchor="middle" fill="#b91c1c" font-size="10.2" font-weight="700">Send to Underwriter</text>
                </svg>
              </div>
              <p class="proj-visual-caption">Illustrative workflow — rule evaluation and human exception routing diagram.</p>
            </div>
          </div>
        `;
      }

      return `
        <div class="proj-visuals-split">
          <div>
            <div class="proj-visual-banner-preview">
              <img src="${proj.banner}" alt="${proj.title}" loading="lazy">
            </div>
            <p class="proj-visual-caption">Conceptual illustration — visual representation of ${proj.title}.</p>
          </div>
          <div>
            <div class="proj-visual-flowchart">
              <div class="flowchart-badge">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="8" r="3"/><path d="M8 2v2M8 12v2M2 8h2M12 8h2"/></svg>
                <span>Illustrative workflow · System Flow</span>
              </div>
              <svg class="flowchart-svg" viewBox="0 0 460 220" aria-label="Illustrative system workflow diagram">
                <rect x="165" y="14" width="130" height="30" rx="6" fill="#eff6ff" stroke="#93c5fd" stroke-width="1.4"/>
                <text x="230" y="33" text-anchor="middle" fill="#1e3a8a" font-size="11.5" font-weight="700">${proj.org} Source</text>
                <path d="M 230 44 L 230 74" stroke="#94a3b8" stroke-width="1.6"/>
                <rect x="145" y="74" width="170" height="32" rx="6" fill="#f0f9ff" stroke="#bae6fd" stroke-width="1.4"/>
                <text x="230" y="94" text-anchor="middle" fill="#0369a1" font-size="11" font-weight="700">${(proj.cardTags && proj.cardTags[0]) || "Core Validation"}</text>
                <path d="M 230 106 L 230 136" stroke="#94a3b8" stroke-width="1.6"/>
                <rect x="135" y="136" width="190" height="34" rx="7" fill="#dcfce7" stroke="#4ade80" stroke-width="1.5"/>
                <text x="230" y="157" text-anchor="middle" fill="#065f46" font-size="11.5" font-weight="700">${proj.status || "Implemented"}</text>
              </svg>
            </div>
            <p class="proj-visual-caption">Illustrative workflow — conceptual system boundary and verification steps.</p>
          </div>
        </div>
      `;
    }

    function renderProjectDetailWorkbench(slug) {
      if (!detailSection) return;
      const proj = PROJECTS_BY_SLUG[slug];
      if (!proj) return;

      const featuredList = PROJECTS_CATALOG.filter(p => p.featured).slice().sort((a, b) => a.featuredOrder - b.featuredOrder);
      const badgeClass = proj.badgeType === "INDEPENDENT" ? "proj-badge-independent" : "proj-badge-professional";

      const slideMatch = FEATURED_CAROUSEL_SLIDES.find(s => s.slug === proj.slug);
      const effectiveFloatingCard = proj.floatingHeroCard || (slideMatch && slideMatch.floatingCard
        ? {
            title: `${slideMatch.floatingCard.badge || "Conceptual Illustration"} · ${slideMatch.floatingCard.title}`,
            status: slideMatch.floatingCard.status,
            rows: slideMatch.floatingCard.rows.map(r => ({ label: r.label, val: r.val })),
            cta: (slideMatch.secondaryHud && slideMatch.secondaryHud.pill) ? `${slideMatch.secondaryHud.pill} ✓` : "Verified →",
            gaugeVal: slideMatch.floatingCard.gaugeVal || "100%",
            gaugeLabel: slideMatch.floatingCard.gaugeLabel || "Verified",
            gaugePct: slideMatch.floatingCard.gaugePct || 90,
            gaugeTheme: slideMatch.floatingCard.gaugeTheme || "emerald"
          }
        : null);
      const detailRadialOffset = effectiveFloatingCard
        ? Math.round(110 - (110 * (effectiveFloatingCard.gaugePct || 85)) / 100)
        : 22;

      const floatingHeroCardHtml = effectiveFloatingCard
        ? `
          <div class="proj-hero-decision-card">
            <div class="decision-card-header-row">
              <div class="decision-card-header">${effectiveFloatingCard.title}</div>
              <div class="carousel-decision-gauge theme-${effectiveFloatingCard.gaugeTheme || "emerald"} is-detail-gauge" aria-hidden="true">
                <svg viewBox="0 0 44 44" class="decision-gauge-svg">
                  <circle class="decision-gauge-track" cx="22" cy="22" r="17.5" />
                  <circle class="decision-gauge-arc is-filled" cx="22" cy="22" r="17.5" stroke-dasharray="110" stroke-dashoffset="${detailRadialOffset}" />
                </svg>
                <div class="decision-gauge-center">
                  <strong>${effectiveFloatingCard.gaugeVal || "80%"}</strong>
                  <span>${effectiveFloatingCard.gaugeLabel || "Verified"}</span>
                </div>
              </div>
            </div>
            <div class="decision-card-status">
              <span class="decision-status-check" aria-hidden="true">✓</span>
              <span>${effectiveFloatingCard.status}</span>
            </div>
            <div class="decision-card-rows">
              ${effectiveFloatingCard.rows.map(r => `
                <div class="decision-card-row">
                  <span class="decision-row-label">${r.label}</span>
                  <strong class="decision-row-val">${r.val}</strong>
                </div>
              `).join("")}
            </div>
            <div class="decision-card-btn">${effectiveFloatingCard.cta}</div>
          </div>
        `
        : "";

      const effectiveMetrics = (proj.metrics && proj.metrics.length)
        ? proj.metrics
        : (slideMatch && slideMatch.metrics ? slideMatch.metrics : []);
      const effectiveMetricsNote = proj.metricsNote || (slideMatch && slideMatch.metricsQualifier) || "";

      const glanceMetricsHtml = effectiveMetrics.length
        ? `
          <div class="proj-glance-metrics">
            ${effectiveMetrics.map(m => `
              <div class="proj-card-metric-box">
                <strong>${m.val}</strong>
                <span>${m.label}</span>
                ${m.gaugePct ? `
                  <div class="proj-glance-gauge-track" aria-hidden="true">
                    <span class="proj-glance-gauge-fill theme-${m.theme || "emerald"}" style="width:${m.gaugePct}%"></span>
                  </div>
                ` : ""}
              </div>
            `).join("")}
          </div>
          ${effectiveMetricsNote ? `<p class="proj-visual-caption" style="margin-top:6px;">${effectiveMetricsNote}</p>` : ""}
        `
        : "";

      const relatedProjects = (proj.relatedSlugs || [])
        .map(s => PROJECTS_BY_SLUG[s])
        .filter(Boolean);

      let tabThreeCardsHtml = `
        <div class="proj-summary-cards-grid">
          <article class="proj-summary-card">
            <div class="proj-summary-card-head">
              <span class="proj-summary-icon theme-red" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>
              </span>
              <h3>The problem</h3>
            </div>
            <p>${proj.problem}</p>
          </article>

          <article class="proj-summary-card">
            <div class="proj-summary-card-head">
              <span class="proj-summary-icon theme-green" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2Z"/></svg>
              </span>
              <h3>How it worked</h3>
            </div>
            <p>${proj.solution}</p>
          </article>

          <article class="proj-summary-card">
            <div class="proj-summary-card-head">
              <span class="proj-summary-icon theme-blue" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6" rx="0.6"/><rect x="12" y="8" width="3" height="10" rx="0.6"/><rect x="17" y="5" width="3" height="13" rx="0.6"/></svg>
              </span>
              <h3>Outcome &amp; evidence</h3>
            </div>
            <div class="proj-results-metrics-list">
              ${(proj.keyResultsMetrics || []).map(km => `
                <div class="proj-result-metric-line">
                  <strong>${km.val}</strong>
                  <span>${km.text}</span>
                </div>
              `).join("")}
            </div>
            <ul class="proj-results-checks-list">
              ${(proj.keyResultsChecks || []).map(chk => `
                <li>
                  <span class="proj-check-badge" aria-hidden="true">✓</span>
                  <span>${chk}</span>
                </li>
              `).join("")}
            </ul>
          </article>
        </div>
      `;

      if (activeDetailTab === "contribution") {
        tabThreeCardsHtml = `
          <div class="proj-summary-cards-grid">
            <article class="proj-summary-card">
              <div class="proj-summary-card-head">
                <span class="proj-summary-icon theme-blue" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>
                </span>
                <h3>My contribution</h3>
              </div>
              <p>${proj.contribution}</p>
            </article>
            <article class="proj-summary-card">
              <div class="proj-summary-card-head">
                <span class="proj-summary-icon theme-green" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2Z"/></svg>
                </span>
                <h3>How it worked</h3>
              </div>
              <p>${proj.solution}</p>
            </article>
            <article class="proj-summary-card">
              <div class="proj-summary-card-head">
                <span class="proj-summary-icon theme-red" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.5 19.5 6v5.5c0 5-3.3 8.8-7.5 10-4.2-1.2-7.5-5-7.5-10V6L12 2.5Z"/></svg>
                </span>
                <h3>What I learned</h3>
              </div>
              <p>${proj.lessons}</p>
            </article>
          </div>
        `;
      } else if (activeDetailTab === "technical" || activeDetailTab === "lessons") {
        tabThreeCardsHtml = `
          <div class="proj-summary-cards-grid">
            <article class="proj-summary-card">
              <div class="proj-summary-card-head">
                <span class="proj-summary-icon theme-blue" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2.5 2 7.5 12 12.5 22 7.5 12 2.5"/><polyline points="2 12.5 12 17.5 22 12.5"/></svg>
                </span>
                <h3>Systems &amp; methods</h3>
              </div>
              <p><strong>Technologies:</strong> ${proj.glance.technologies}</p>
              <p style="margin-top:8px;">${proj.contribution}</p>
            </article>
            <article class="proj-summary-card">
              <div class="proj-summary-card-head">
                <span class="proj-summary-icon theme-green" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2Z"/></svg>
                </span>
                <h3>What I learned</h3>
              </div>
              <p>${proj.lessons}</p>
            </article>
            <article class="proj-summary-card">
              <div class="proj-summary-card-head">
                <span class="proj-summary-icon theme-blue" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6" rx="0.6"/><rect x="12" y="8" width="3" height="10" rx="0.6"/><rect x="17" y="5" width="3" height="13" rx="0.6"/></svg>
                </span>
                <h3>Outcome &amp; evidence</h3>
              </div>
              <ul class="proj-results-checks-list">
                ${(proj.keyResultsChecks || []).map(chk => `
                  <li>
                    <span class="proj-check-badge" aria-hidden="true">✓</span>
                    <span>${chk}</span>
                  </li>
                `).join("")}
              </ul>
            </article>
          </div>
        `;
      }

      const mobileTypePillText = proj.badgeType === "INDEPENDENT" ? "Independent Build" : "Professional Work";
      const mobilePrimaryCat = (proj.cardTags && proj.cardTags[0]) || "Systems";
      const cm = CHRONO_META_BY_SLUG[proj.slug];
      const mobilePeriodText = cm ? (cm.railBottom ? `${cm.railTop} – ${cm.railBottom.replace(/^–\s*/, "")}` : cm.railTop) : (proj.period || "");
      const mobileTechPills = Array.from(new Set([...(proj.heroTags || []), ...(proj.cardTags || []), ...(proj.allTags || [])])).slice(0, 7);
      const mobileCheckItems = [
        ...(proj.keyResultsMetrics || []).map(km => `<strong>${km.val}</strong> ${km.text.charAt(0).toLowerCase() + km.text.slice(1)}`),
        ...(proj.keyResultsChecks || [])
      ];

      let mobileTabBodyHtml = `
        <article class="pm-detail-card">
          <div class="pm-card-head">
            <span class="pm-card-icon theme-red" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>
            </span>
            <h3>The problem</h3>
          </div>
          <p>${proj.problem}</p>
        </article>

        <article class="pm-detail-card">
          <div class="pm-card-head">
            <span class="pm-card-icon theme-green" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2Z"/></svg>
            </span>
            <h3>The solution</h3>
          </div>
          <p>${proj.solution}</p>
        </article>

        <article class="pm-detail-card">
          <div class="pm-card-head">
            <span class="pm-card-icon theme-blue" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6" rx="0.6"/><rect x="12" y="8" width="3" height="10" rx="0.6"/><rect x="17" y="5" width="3" height="13" rx="0.6"/></svg>
            </span>
            <h3>Key results</h3>
          </div>
          <ul class="pm-results-checklist">
            ${mobileCheckItems.map(item => `
              <li>
                <span class="pm-check-circle" aria-hidden="true">✓</span>
                <span>${item}</span>
              </li>
            `).join("")}
          </ul>
        </article>

        <article class="pm-detail-card">
          <div class="pm-card-head">
            <span class="pm-card-icon theme-blue" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>
            </span>
            <h3>Technologies &amp; tools</h3>
          </div>
          <div class="pm-tech-pills">
            ${mobileTechPills.map(t => `<span class="pm-tech-pill">${t}</span>`).join("")}
          </div>
        </article>
      `;

      if (activeDetailTab === "contribution") {
        mobileTabBodyHtml = `
          <article class="pm-detail-card">
            <div class="pm-card-head">
              <span class="pm-card-icon theme-blue" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>
              </span>
              <h3>My role &amp; contribution</h3>
            </div>
            <p>${proj.contribution}</p>
          </article>
          <article class="pm-detail-card">
            <div class="pm-card-head">
              <span class="pm-card-icon theme-green" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2Z"/></svg>
              </span>
              <h3>What I learned</h3>
            </div>
            <p>${proj.lessons}</p>
          </article>
        `;
      } else if (activeDetailTab === "technical") {
        mobileTabBodyHtml = `
          <article class="pm-detail-card">
            <div class="pm-card-head">
              <span class="pm-card-icon theme-green" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2Z"/></svg>
              </span>
              <h3>Approach &amp; systems</h3>
            </div>
            <p>${proj.solution}</p>
            <p style="margin-top:8px;"><strong>Technologies:</strong> ${proj.glance.technologies}</p>
          </article>
          <article class="pm-detail-card">
            <div class="pm-card-head">
              <span class="pm-card-icon theme-blue" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/></svg>
              </span>
              <h3>Technologies &amp; tools</h3>
            </div>
            <div class="pm-tech-pills">
              ${mobileTechPills.map(t => `<span class="pm-tech-pill">${t}</span>`).join("")}
            </div>
          </article>
        `;
      } else if (activeDetailTab === "results") {
        mobileTabBodyHtml = `
          <article class="pm-detail-card">
            <div class="pm-card-head">
              <span class="pm-card-icon theme-blue" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6" rx="0.6"/><rect x="12" y="8" width="3" height="10" rx="0.6"/><rect x="17" y="5" width="3" height="13" rx="0.6"/></svg>
              </span>
              <h3>Key results &amp; evidence</h3>
            </div>
            <ul class="pm-results-checklist">
              ${mobileCheckItems.map(item => `
                <li>
                  <span class="pm-check-circle" aria-hidden="true">✓</span>
                  <span>${item}</span>
                </li>
              `).join("")}
            </ul>
          </article>
        `;
      }

      detailSection.innerHTML = `
        <div class="proj-detail-shell" data-upgraded-detail="${proj.slug}">
          <nav class="proj-detail-breadcrumb" aria-label="Breadcrumb">
            <a class="proj-detail-back-link" href="#projects" data-close-project><span aria-hidden="true">&larr;</span> All projects</a>
            <span class="proj-breadcrumb-sep" aria-hidden="true">/</span>
            <strong class="proj-breadcrumb-current">${proj.title}</strong>
          </nav>

          <!-- Mobile Detail View (Matching Screen 3 of media_1792428783700_817de206.png 1:1) -->
          <div class="proj-mobile-detail-view">
            <div class="proj-mobile-top-photo">
              <img src="${proj.banner}" alt="${proj.title} (conceptual illustration)">
              <span class="proj-mobile-photo-counter" aria-hidden="true">1 / 8</span>
            </div>

            <div class="proj-mobile-white-header">
              <div class="pm-badges-row">
                <span class="pm-badge-type ${proj.badgeType === "INDEPENDENT" ? "is-ind" : "is-pro"}">${mobileTypePillText}</span>
                <span class="pm-badge-cat">${mobilePrimaryCat}</span>
                <span class="pm-badge-period">${mobilePeriodText}</span>
              </div>

              <h1 class="pm-title">${proj.title}</h1>
              <p class="pm-subtitle">${proj.heroDesc}</p>

              ${proj.metrics && proj.metrics.length ? `
                <div class="pm-metrics-strip">
                  ${proj.metrics.map(m => `
                    <div class="pm-metric-col">
                      <strong>${m.val}</strong>
                      <span>${m.label}</span>
                    </div>
                  `).join("")}
                </div>
              ` : ""}

              <div class="pm-underline-tabs" role="tablist" aria-label="Project sections">
                <button type="button" class="pm-tab-btn ${activeDetailTab === "overview" ? "is-active" : ""}" data-detail-tab="overview">Overview</button>
                <button type="button" class="pm-tab-btn ${activeDetailTab === "contribution" ? "is-active" : ""}" data-detail-tab="contribution">My Role</button>
                <button type="button" class="pm-tab-btn ${activeDetailTab === "technical" ? "is-active" : ""}" data-detail-tab="technical">Approach</button>
                <button type="button" class="pm-tab-btn ${activeDetailTab === "results" ? "is-active" : ""}" data-detail-tab="results">Results</button>
              </div>
            </div>

            <div class="pm-cards-stack">
              ${mobileTabBodyHtml}
            </div>
          </div>

          <div class="proj-detail-workbench">
            <aside class="proj-detail-sidebar" aria-label="Projects navigation">
              <h2 class="proj-detail-sidebar-title">Projects</h2>
              <div class="proj-detail-search-wrap">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4.5 4.5"/></svg>
                <input type="search" placeholder="Search projects..." data-detail-sidebar-search aria-label="Search projects">
              </div>

              <nav class="proj-detail-cat-list" aria-label="Project categories">
                ${CATEGORY_DEFS.map(cat => `
                  <a href="#projects" class="proj-detail-cat-item ${ (cat.id === "professional" && proj.badgeType === "PROFESSIONAL") || (cat.id === "independent" && proj.badgeType === "INDEPENDENT") ? "is-active" : "" }" data-detail-jump-cat="${cat.id}">
                    <span class="proj-cat-icon" aria-hidden="true">${cat.icon}</span>
                    <span class="proj-cat-label">${cat.label}</span>
                    <span class="proj-cat-count">${cat.count}</span>
                  </a>
                `).join("")}
              </nav>

              <div class="proj-detail-featured-box">
                <h3 class="proj-detail-featured-heading">Featured</h3>
                <div class="proj-detail-featured-list">
                  ${featuredList.map(fp => `
                    <a href="#projects/${fp.slug}" class="proj-detail-featured-item ${fp.slug === proj.slug ? "is-active" : ""}">
                      <img src="${fp.banner}" alt="" loading="lazy">
                      <div>
                        <strong>${fp.shortTitle}</strong>
                        <span>${fp.sidebarSub}</span>
                      </div>
                    </a>
                  `).join("")}
                </div>
              </div>

              <a class="proj-detail-all-btn" href="#projects">View all projects <span aria-hidden="true">&rarr;</span></a>
            </aside>

            <div class="proj-detail-main">
              <div class="proj-detail-top-grid">
                <div class="proj-detail-hero-banner" style="background-image: linear-gradient(95deg, rgba(9, 14, 26, 0.84) 0%, rgba(9, 14, 26, 0.56) 52%, rgba(9, 14, 26, 0.18) 100%), url('${proj.banner}');">
                  <div class="proj-hero-left-content">
                    <div class="proj-hero-top-pills">
                      <span class="proj-card-badge ${badgeClass}">${proj.detailBadge}</span>
                      <span class="proj-card-org">${proj.org}</span>
                    </div>
                    <h1 tabindex="-1">${proj.title}</h1>
                    <p class="proj-hero-subtitle">${proj.heroDesc}</p>
                    <div class="proj-hero-tags">
                      ${(proj.heroTags || []).map(t => `<span class="proj-hero-tag-pill">${t}</span>`).join("")}
                    </div>
                    <div class="proj-hero-mobile-metrics">${glanceMetricsHtml}</div>
                  </div>
                  ${floatingHeroCardHtml}
                </div>

                <aside class="proj-glance-card" aria-label="Project at a glance">
                  <h2>Project at a glance</h2>
                  <dl class="proj-glance-list">
                    <div class="proj-glance-row">
                      <span class="proj-meta-icon" aria-hidden="true">
                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="3" width="13" height="14" rx="1.5"/><path d="M7 6.5h2M11 6.5h2M7 10h2M11 10h2M8.5 17v-3.5h3V17"/></svg>
                      </span>
                      <div>
                        <dt>Organization</dt>
                        <dd>${proj.glance.employer}</dd>
                      </div>
                    </div>
                    <div class="proj-glance-row">
                      <span class="proj-meta-icon" aria-hidden="true">
                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4.5" width="14" height="12.5" rx="2"/><path d="M3 8.5h14M6.5 2.5v3M13.5 2.5v3"/></svg>
                      </span>
                      <div>
                        <dt>Period</dt>
                        <dd>${proj.glance.period}</dd>
                      </div>
                    </div>
                    <div class="proj-glance-row">
                      <span class="proj-meta-icon" aria-hidden="true">
                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="7.5" cy="7" r="2.8"/><path d="M2.5 16v-1.2a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4V16"/><circle cx="14" cy="7.5" r="2.2"/><path d="M17.5 16v-1a3.2 3.2 0 0 0-2.5-3.1"/></svg>
                      </span>
                      <div>
                        <dt>Domain</dt>
                        <dd>${proj.glance.domain}</dd>
                      </div>
                    </div>
                    <div class="proj-glance-row">
                      <span class="proj-meta-icon" aria-hidden="true">
                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="3"/></svg>
                      </span>
                      <div>
                        <dt>My role</dt>
                        <dd>${proj.glance.role}</dd>
                      </div>
                    </div>
                    <div class="proj-glance-row">
                      <span class="proj-meta-icon" aria-hidden="true">
                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="10 2.5 2.5 6.5 10 10.5 17.5 6.5 10 2.5"/><polyline points="2.5 10.5 10 14.5 17.5 10.5"/><polyline points="2.5 14 10 18 17.5 14"/></svg>
                      </span>
                      <div>
                        <dt>Status</dt>
                        <dd>${proj.status || "Implemented"}</dd>
                      </div>
                    </div>
                    <div class="proj-glance-row">
                      <span class="proj-meta-icon" aria-hidden="true">
                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3.5h8v4.5a4 4 0 0 1-8 0V3.5Z"/><path d="M6 5H3.5v1.5a2.5 2.5 0 0 0 2.5 2.5M14 5h2.5v1.5A2.5 2.5 0 0 1 14 9M10 12v4M7 16h6"/></svg>
                      </span>
                      <div>
                        <dt>Career chapter</dt>
                        <dd><a href="#career" style="color:#2563eb;font-weight:700;text-decoration:none;">${proj.chapterLabel || "Shaped by the business"}</a></dd>
                      </div>
                    </div>
                  </dl>
                  ${glanceMetricsHtml}
                </aside>
              </div>

              <div class="proj-detail-tabs" role="tablist" aria-label="Project sections">
                <button type="button" class="proj-detail-tab ${activeDetailTab === "overview" ? "is-active" : ""}" data-detail-tab="overview">Overview</button>
                <button type="button" class="proj-detail-tab ${activeDetailTab === "contribution" ? "is-active" : ""}" data-detail-tab="contribution">My Contribution</button>
                <button type="button" class="proj-detail-tab ${activeDetailTab === "results" ? "is-active" : ""}" data-detail-tab="results">Outcome &amp; Evidence</button>
                <button type="button" class="proj-detail-tab ${activeDetailTab === "technical" ? "is-active" : ""}" data-detail-tab="technical">Systems &amp; Methods</button>
                <button type="button" class="proj-detail-tab ${activeDetailTab === "lessons" ? "is-active" : ""}" data-detail-tab="lessons">What I Learned</button>
              </div>

              ${tabThreeCardsHtml}

              <section class="proj-visuals-section" aria-label="Illustrative workflow and conceptual visuals">
                <h2>Illustrative workflow &amp; conceptual visuals</h2>
                <div class="proj-visuals-carousel">
                  <button type="button" class="proj-visual-nav proj-visual-prev" data-visual-step="-1" aria-label="Previous visual">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m10 4-4 4 4 4"/></svg>
                  </button>
                  ${buildVisualShowcaseHtml(proj)}
                  <button type="button" class="proj-visual-nav proj-visual-next" data-visual-step="1" aria-label="Next visual">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 4 4 4-4 4"/></svg>
                  </button>
                </div>
                <div class="proj-visuals-dots" aria-hidden="true">
                  ${[0, 1, 2, 3, 4].map(i => `<span class="proj-visual-dot ${i === activeVisualSlide ? "is-active" : ""}"></span>`).join("")}
                </div>
              </section>

              <div class="proj-bottom-three-grid">
                <section class="proj-bottom-card" aria-label="Technical stack">
                  <h3>Technical stack</h3>
                  <div class="proj-tech-tiles-row">
                    ${(proj.techStackTiles || []).map(tile => `
                      <div class="proj-tech-tile">
                        <span class="proj-tech-tile-icon" aria-hidden="true">${STACK_TILE_SVGS[tile.icon] || STACK_TILE_SVGS.sql}</span>
                        <span class="proj-tech-tile-label">${tile.label}</span>
                      </div>
                    `).join("")}
                  </div>
                </section>

                <section class="proj-bottom-card" aria-label="Related projects">
                  <h3>Related projects</h3>
                  <div class="proj-related-list">
                    ${relatedProjects.map(rp => `
                      <a class="proj-related-item" href="#projects/${rp.slug}">
                        <img src="${rp.banner}" alt="" loading="lazy">
                        <div class="proj-related-copy">
                          <strong>${rp.shortTitle}</strong>
                          <span>${rp.shortDesc}</span>
                        </div>
                        <span class="proj-related-chevron" aria-hidden="true">
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 4 4 4-4 4"/></svg>
                        </span>
                      </a>
                    `).join("")}
                  </div>
                </section>

                <section class="proj-bottom-card" aria-label="Project context and phases">
                  <h3>Project context &amp; phases</h3>
                  <div class="proj-timeline-list">
                    <div class="proj-timeline-spine" aria-hidden="true"></div>
                    ${(proj.timeline || []).map(tl => `
                      <div class="proj-timeline-row theme-${tl.theme}">
                        <span class="proj-timeline-node" aria-hidden="true"></span>
                        <span class="proj-timeline-years">${tl.years}</span>
                        <strong class="proj-timeline-text">${tl.text}</strong>
                      </div>
                    `).join("")}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // 4D. Build Dedicated Career Page Workbench (#career -> section[data-page="career"])
    const mainContentEl = document.getElementById("main") || document.querySelector("main");
    let careerPageSection = document.querySelector('section[data-page="career"]');
    let activeCareerChapter = "all";
    let activeCareerViewMode = "timeline";
    const expandedCareerEntries = new Set();

    const CAREER_ENTRIES = Object.freeze([
      {
        id: "medavie-nexus",
        period: "2022 – Present",
        railChapterLine1: "Building",
        railChapterLine2: "in the cloud.",
        railTheme: "green",
        title: "AI & Solution Design",
        orgBadge: "Independent (NEXUS)",
        chapterId: "clouds",
        thumb: "assets/proj-banner-nexus.jpg",
        isNexusThumb: true,
        tags: ["AI Agents", "Platform Design", "Claims & ETL", "Automation"],
        shortDesc: "Designing and building a multi-agent AI orchestration platform for real work (NEXUS), alongside enterprise health/dental claims analysis and integration design at Medavie.",
        summary: "Connecting enterprise health/dental claims analysis and integration design at Medavie Blue Cross with independent multi-agent AI orchestration in NEXUS.",
        workstreams: [
          {
            heading: "Professional — Medavie Blue Cross (2022–present)",
            body: "Functional analyst on enterprise health/dental claims and related integrations: researching and guiding production Excel/VB/XML takeover-history tooling, reviewing provider data synchronization requirements alongside solution architects, tracing daily flat-file ETL reporting continuity, and writing complex SQL to reconcile claims and financial reports."
          },
          {
            heading: "Independent — NEXUS (active development)",
            body: "Designing and building an independent multi-agent AI orchestration platform and technical capstone featuring scoped context compilation, constraint-aware routing, durable Node.js execution and deterministic/semantic evaluation receipts. Also built LOWKEY (local speech-to-text) and Workshop42."
          }
        ],
        bullets: [
          "Guided production-adopted Excel/VB/XML validation and reconciliation tooling for group takeover claims history",
          "Defined provider registry field mappings and scheduled event-table / REST synchronization requirements",
          "Uncovered a hidden daily COBOL/InterBlue flat-file ETL dependency and completed continuity mapping design",
          "Architected NEXUS around scoped context, explicit plan/execute separation, and auditable receipts"
        ],
        cases: [
          { label: "NEXUS — AI Orchestration Platform", href: "#projects/nexus" },
          { label: "Takeover-History XML Loading", href: "#projects/takeover" },
          { label: "Provider Data for Claims Adjudication", href: "#projects/claims" },
          { label: "Claims Reporting & Data Continuity", href: "#projects/continuity" },
          { label: "Claims SQL & Financial Reconciliation", href: "#projects/sql" }
        ]
      },
      {
        id: "grenville",
        period: "2009 – 2022",
        railChapterLine1: "Shaped by",
        railChapterLine2: "the business.",
        railTheme: "blue",
        title: "Insurance Systems & Solutions",
        orgBadge: "Grenville Mutual Insurance",
        chapterId: "business",
        thumb: "assets/proj-banner-renewals.jpg",
        tags: ["Underwriting", "Claims", "Integration", "SQL", "Reporting"],
        shortDesc: "Underwriting, claims, data integration and reporting solutions. Connected business requirements with technical design and implementation.",
        summary: "Progressed across a thirteen-year tenure at Grenville Mutual Insurance (2009–2022) from systems administration and corporate headquarters infrastructure into business/systems analysis, underwriting and rating rules, broker integrations and enterprise reporting (formal analyst transition between 2014 and 2016), continuing into enterprise health/dental claims at Medavie (2022–present).",
        workstreams: [
          {
            heading: "Underwriting Rules & Broker Integrations",
            body: "Personally designed and implemented P&C rating, underwriting and renewal eligibility rules across residential (~80% automated), commercial (~60%) and farm/agri (~40%) lines (approximate firsthand-reported renewal rates), while routing complex exceptions to human underwriters."
          },
          {
            heading: "Broker Workflows, Portal Tooling & Reporting",
            body: "Connected broker portals and desktop BMS workflows (TAM/Epic via Bravado) across SOAP/XML, CSIO/ACORD and REST, built an authenticated C#/.NET adjuster document upload portal, and delivered SQL/SSRS/Cognos reporting."
          }
        ],
        bullets: [
          "Automated standard renewals (~80% residential, ~60% commercial, ~40% farm/agri; user-reported) with structured underwriter referral paths",
          "Implemented new-business, commercial quoting, policy-change comparison and policy/billing/claims inquiry rules",
          "Developed enterprise reporting across SQL, SSRS and IBM Cognos"
        ],
        cases: [
          { label: "Renewal Eligibility & Underwriting Automation", href: "#projects/renewals" },
          { label: "Broker-Native New Business Integration", href: "#projects/newbusiness" },
          { label: "Commercial Quoting & Broker Integration", href: "#projects/workflows" },
          { label: "Policy-Change Comparison & Validation", href: "#projects/changes" },
          { label: "Authenticated Document Upload Portal", href: "#projects/upload" }
        ]
      },
      {
        id: "harris",
        period: "2007 – 2009",
        railChapterLine1: "Systems &",
        railChapterLine2: "infrastructure.",
        railTheme: "purple",
        title: "Enterprise Environments",
        orgBadge: "Harris / Ottawa Computer Services",
        chapterId: "metal",
        thumb: "assets/proj-banner-headquarters.jpg",
        tags: ["Infrastructure", "Networks", "Identity", "Security"],
        shortDesc: "Servers, networks and identity migrations. Supported and improved enterprise infrastructure and system reliability.",
        summary: "Progressed from Network Operations Centre (NOC) technician to infrastructure project technician at Harris / Ottawa Computer Services (2007–2009), supporting client and internal infrastructure and developing repeatable migrations.",
        workstreams: [],
        bullets: [
          "Administered Windows Server, Active Directory, Group Policy, Microsoft Exchange, File/Print and BlackBerry Enterprise Server (BES)",
          "Developed a repeatable staged Small Business Server (SBS) swing-migration methodology preserving live identity, email and data",
          "Supported connected network, email and identity services through client infrastructure projects and migrations"
        ],
        cases: [
          { label: "Headquarters Infrastructure and Move", href: "#projects/headquarters" },
          { label: "Small Business Server Swing Migrations", href: "#projects/foundations" }
        ]
      },
      {
        id: "dell",
        period: "Sept 2006 – 2007",
        railChapterLine1: "Grounded",
        railChapterLine2: "in the metal.",
        railTheme: "slate",
        title: "Hardware & Technical Support",
        orgBadge: "Dell Canada",
        chapterId: "metal",
        thumb: "assets/timeline-support.png",
        tags: ["Hardware", "Support", "Windows", "Troubleshooting"],
        shortDesc: "Corporate hardware support for Latitude and OptiPlex. Technical diagnostics, root-cause isolation and user support.",
        summary: "Started in commercial Latitude and OptiPlex hardware support in September 2006 and joined Dell's Gloves Off team — empowered to stay with the client, isolate the real root-cause hardware or software fault on the first call, and reduce repeat callbacks.",
        workstreams: [],
        bullets: [
          "Component-level fault isolation across Latitude laptops and OptiPlex desktops (system boards, power rails, thermal assemblies, storage buses)",
          "First-call resolution focus on the Gloves Off escalation team rather than rushed script handling",
          "Built the foundational troubleshooting discipline that underpins all later infrastructure and architecture work"
        ],
        cases: [
          { label: "Dell Latitude & OptiPlex Hardware Support", href: "#projects/dell" }
        ]
      }
    ]);

    const CAREER_SKILLS = Object.freeze([
      { id: "insurance", label: "Insurance Domain", badge: "16+ yrs · P&C + Claims", pct: 90, theme: "green" },
      { id: "data", label: "Integration & Data", badge: "APIs · ETL · SQL · CSIO", pct: 88, theme: "blue" },
      { id: "infrastructure", label: "Infrastructure & Systems", badge: "20+ yrs · Core Foundation", pct: 85, theme: "blue" },
      { id: "business", label: "Business & Delivery", badge: "Solution Design & Specs", pct: 85, theme: "indigo" },
      { id: "ai", label: "AI & Automation", badge: "NEXUS & Local ONNX", pct: 80, theme: "purple" },
      { id: "development", label: "Development & Engineering", badge: "TS · Node · C#/.NET · Rust", pct: 75, theme: "blue" }
    ]);

    function renderCareerEntriesHtml() {
      const filtered = CAREER_ENTRIES.filter(entry => {
        if (activeCareerChapter === "all") return true;
        if (activeCareerChapter === "metal") return entry.chapterId === "metal";
        return entry.chapterId === activeCareerChapter;
      });
      return filtered.map((entry, idx) => {
        const isExpanded = activeCareerViewMode === "list" || expandedCareerEntries.has(entry.id);
        const isLast = idx === filtered.length - 1;
        return `
          <div class="career-tl-row theme-${entry.railTheme} ${isLast ? "is-last" : ""}" data-career-row="${entry.id}">
            <div class="career-tl-rail">
              <span class="career-tl-node theme-${entry.railTheme}" aria-hidden="true"></span>
              <div class="career-tl-meta">
                <span class="career-tl-period">${entry.period}</span>
                <strong class="career-tl-chapter theme-${entry.railTheme}">
                  <span>${entry.railChapterLine1}</span>
                  <span>${entry.railChapterLine2}</span>
                </strong>
              </div>
            </div>

            <article class="career-tl-card ${isExpanded ? "is-expanded" : ""}" data-career-entry="${entry.id}" data-entry-chapter="${entry.chapterId}">
              <div class="career-tl-card-main" role="button" tabindex="0" data-career-toggle-entry="${entry.id}" aria-expanded="${isExpanded ? "true" : "false"}">
                <div class="career-tl-thumb-wrap ${entry.isNexusThumb ? "is-nexus-thumb" : ""}">
                  <img src="${entry.thumb}" alt="${entry.title}" loading="lazy">
                  ${entry.isNexusThumb ? `<span class="career-nexus-monogram" aria-hidden="true">N</span>` : ""}
                </div>
                <div class="career-tl-card-body">
                  <div class="career-tl-top-row">
                    <div class="career-tl-title-group">
                      <h3 class="career-tl-title">${entry.title}</h3>
                      <span class="career-tl-org-badge">${entry.orgBadge}</span>
                    </div>
                    <div class="career-tl-tags">
                      ${entry.tags.slice(0, 3).map(t => `<span class="career-tl-tag">${t}</span>`).join("")}
                    </div>
                  </div>
                  <p class="career-tl-short-desc">${entry.shortDesc}</p>
                </div>
                <span class="career-tl-chevron" aria-hidden="true">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 4 4 4-4 4"/></svg>
                </span>
              </div>

              <div class="career-tl-drawer" ${isExpanded ? "" : "hidden"}>
                <p class="career-entry-summary">${entry.summary}</p>
                ${entry.workstreams && entry.workstreams.length ? `
                  <div class="career-entry-workstreams">
                    ${entry.workstreams.map(ws => `
                      <div class="career-workstream-box">
                        <h4>${ws.heading}</h4>
                        <p>${ws.body}</p>
                      </div>
                    `).join("")}
                  </div>
                ` : ""}
                <ul class="career-entry-bullets">
                  ${entry.bullets.map(b => `<li>${b}</li>`).join("")}
                </ul>
                <div class="career-entry-cases">
                  ${entry.cases.map(c => `<a class="career-case-link" href="${c.href}">${c.label} <span aria-hidden="true">&rarr;</span></a>`).join("")}
                </div>
              </div>
            </article>
          </div>
        `;
      }).join("");
    }

    function buildCareerWorkbenchGridHtml(isHomeEmbedded) {
      const gridIdAttr = isHomeEmbedded ? 'id="home-career-timeline"' : 'id="career-timeline"';
      const timelineIdAttr = isHomeEmbedded ? 'id="home-career-timeline-section"' : 'id="career-timeline-section"';
      const rightColIdAttr = isHomeEmbedded ? 'id="home-career-capabilities"' : 'id="career-capabilities"';
      const skillsCardIdAttr = isHomeEmbedded ? 'id="home-career-skills-card"' : 'id="career-skills-card"';
      const indCardIdAttr = isHomeEmbedded ? 'id="home-career-industries-card"' : 'id="career-industries-card"';
      const skillsLinkAttrs = isHomeEmbedded
        ? 'href="#home-skills-section" data-home-scroll-skills'
        : 'href="#skills"';
      const connectLinkAttrs = isHomeEmbedded
        ? 'href="#home-connect" data-home-focus-contact'
        : 'href="#about"';

      return `
        <div class="career-body-grid ${isHomeEmbedded ? "is-home-embedded" : ""}" ${gridIdAttr}>
          <!-- Left Sidebar Navigation (Chapter Filters & Direct Links) -->
          <aside class="career-left-sidebar" aria-label="Career chapter filters">
            <div class="career-left-nav-card">
              <h2 class="career-left-heading">Chapters</h2>
              <nav class="career-side-nav">
                <button type="button" class="career-side-link is-active" data-career-chapter="all">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="5.5" height="5.5" rx="1.2"/><rect x="11.5" y="3" width="5.5" height="5.5" rx="1.2"/><rect x="3" y="11.5" width="5.5" height="5.5" rx="1.2"/><rect x="11.5" y="11.5" width="5.5" height="5.5" rx="1.2"/></svg>
                  <span>All Chapters</span>
                </button>
                <button type="button" class="career-side-link" data-career-chapter="clouds">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5.5 15h9.2a3.3 3.3 0 0 0 .5-6.5A4.5 4.5 0 0 0 7.2 6.8 3.6 3.6 0 0 0 5.5 14"/></svg>
                  <span>Building in the Cloud</span>
                </button>
                <button type="button" class="career-side-link" data-career-chapter="business">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 2.5 16 5v4.5c0 4-2.6 7-6 8.2-3.4-1.2-6-4.2-6-8.2V5l6-2.5Z"/></svg>
                  <span>Shaped by the Business</span>
                </button>
                <button type="button" class="career-side-link" data-career-chapter="metal">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3.5" width="14" height="5" rx="1.2"/><rect x="3" y="11.5" width="14" height="5" rx="1.2"/><circle cx="6" cy="6" r="0.8" fill="currentColor"/><circle cx="6" cy="14" r="0.8" fill="currentColor"/></svg>
                  <span>Grounded in the Metal</span>
                </button>
                <a class="career-side-link" ${skillsLinkAttrs}>
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10" cy="10" r="3"/><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4"/></svg>
                  <span>Skills Workbench</span>
                </a>
                <a class="career-side-link" href="resume.html">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 3.5v9m0 0-3-3m3 3 3-3M4 14.5v1A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5v-1"/></svg>
                  <span>Tailored R&eacute;sum&eacute;</span>
                </a>
              </nav>

              <div class="career-sidebar-cta-box">
                <strong>Interested in working together?</strong>
                <p>I&rsquo;m open to remote or hybrid opportunities.</p>
                <a class="career-sidebar-connect-btn" ${connectLinkAttrs}>
                  <span>Let&rsquo;s Connect</span>
                  <span aria-hidden="true">&rarr;</span>
                </a>
              </div>
            </div>
          </aside>

          <!-- Center Column: Career Timeline -->
          <section class="career-timeline-col" ${timelineIdAttr} aria-label="Chronological career journey">
            <div class="career-timeline-header">
              <div>
                <div class="career-timeline-title-row">
                  <h2>Career Timeline</h2>
                  ${activeCareerChapter !== "all" ? `<button type="button" class="career-clear-chap-btn" data-career-chapter="all">Show all chapters &times;</button>` : ""}
                </div>
                <p class="career-timeline-sub">A chronological view of my professional journey, showing how each chapter builds on the last.</p>
              </div>
              <div class="career-view-toggle" role="group" aria-label="Timeline view mode">
                <button type="button" class="career-view-btn is-active" data-career-view="timeline">Timeline View</button>
                <button type="button" class="career-view-btn" data-career-view="list">List View</button>
              </div>
            </div>

            <div class="career-entries-stack" data-career-entries-stack>
              ${renderCareerEntriesHtml()}
            </div>
          </section>

          <!-- Right Column: Key Skills & Expertise + Industries -->
          <aside class="career-right-sidebar" ${rightColIdAttr} aria-label="Key skills and industries">
            <section class="career-skills-card" ${skillsCardIdAttr}>
              <div class="career-skills-header">
                <h2>Key Skills &amp; Expertise</h2>
                <a class="career-skills-all-link" ${skillsLinkAttrs}>View all skills <span aria-hidden="true">&rarr;</span></a>
              </div>
              <div class="career-skills-list">
                ${CAREER_SKILLS.map(s => `
                  <a class="career-skill-row" href="?cat=${s.id}#skills" data-skills-deep-link="${s.id}" style="text-decoration:none; color:inherit; display:block;">
                    <div class="career-skill-top">
                      <strong>${s.label}</strong>
                      <span>${s.badge}</span>
                    </div>
                    <div class="career-skill-track" aria-hidden="true">
                      <div class="career-skill-fill theme-${s.theme}" data-skill-bar-target="${s.pct}" style="width: ${s.pct}%"></div>
                    </div>
                  </a>
                `).join("")}
              </div>
            </section>

            <section class="career-industries-card" ${indCardIdAttr}>
              <h2>Industries</h2>
              <div class="career-industries-grid">
                <div class="career-industry-pill theme-blue">
                  <span class="industry-pill-icon" aria-hidden="true">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 2.5 16 5v4.5c0 4-2.6 7-6 8.2-3.4-1.2-6-4.2-6-8.2V5l6-2.5Z"/><path d="m7.5 10 1.8 1.8 3.4-3.4"/></svg>
                  </span>
                  <strong>P&amp;C Insurance</strong>
                </div>
                <div class="career-industry-pill theme-green">
                  <span class="industry-pill-icon" aria-hidden="true">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 16.8s-6-3.8-6-8.2a3.5 3.5 0 0 1 6-2.4 3.5 3.5 0 0 1 6 2.4c0 4.4-6 8.2-6 8.2Z"/></svg>
                  </span>
                  <strong>Health &amp; Dental</strong>
                </div>
                <div class="career-industry-pill theme-indigo">
                  <span class="industry-pill-icon" aria-hidden="true">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 16.5h14M5 16.5V8M9 16.5V5M13 16.5V10M16 16.5V6.5"/></svg>
                  </span>
                  <strong>Financial Services</strong>
                </div>
                <div class="career-industry-pill theme-purple">
                  <span class="industry-pill-icon" aria-hidden="true">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5.5" y="5.5" width="9" height="9" rx="1.8"/><path d="M8 2.5v3M12 2.5v3M8 14.5v3M12 14.5v3M2.5 8h3M2.5 12h3M14.5 8h3M14.5 12h3"/></svg>
                  </span>
                  <strong>Technology</strong>
                </div>
              </div>
            </section>
          </aside>
        </div>
      `;
    }

    const homeCareerWorkbenchEl = document.querySelector("[data-home-career-workbench]");
    if (homeCareerWorkbenchEl) {
      homeCareerWorkbenchEl.innerHTML = "";
      homeCareerWorkbenchEl.hidden = true;
    }

    if (mainContentEl && !careerPageSection) {
      careerPageSection = document.createElement("section");
      careerPageSection.className = "page";
      careerPageSection.setAttribute("data-page", "career");
      careerPageSection.hidden = true;
      careerPageSection.innerHTML = window.CareerReference.render(buildCareerWorkbenchGridHtml(false));
      mainContentEl.append(careerPageSection);
      window.CareerReference.mount(careerPageSection);
    }

    // 4D-2. Unified Portfolio Skills Experience — Shared Capability Model & Interactive Components
    let skillsPageSection = document.querySelector('section[data-page="skills"]');
    let activeSkillCategory = "infrastructure";
    let hoveredSkillCategory = null;
    let compactSkillsLockedCat = null; // null = State 1 (Default Compact) / State 2 (Hover); string = State 3 (Selected) / State 4 (Connections)
    let compactSkillsDockView = "selected"; // "selected" | "connections"
    let activeSkillFilter = "all";
    let activeSkillViewMode = "cards"; // "cards" | "map" | "timeline"
    let activeSkillSearch = "";
    let activeSkillDetailTab = "all"; // "all" | "skills" | "tools" | "projects" | "career" | "connections"
    let activeSkillHighlightTag = "";
    let activeSkillTimelineChapter = "all"; // "all" | "metal" | "business" | "clouds" | "always"
    let mobileSkillDrilldownId = null;
    let mobileSkillDrillTab = "overview";

    const SKILL_CATEGORIES = Object.freeze([
      {
        id: "infrastructure",
        stackOrder: 1,
        stackLayerName: "Infrastructure & Systems",
        stackCallout: "Infrastructure",
        stackSub: "Servers, networks, virtualization & resilience",
        title: "Infrastructure & Systems",
        shortLabel: "Infrastructure",
        pct: 85,
        evidenceBadge: "20+ yrs · Core Foundation",
        evidenceContext: "Relative focus & 20+ years hands-on depth since Sept 2006",
        theme: "blue",
        accentHex: "#38bdf8",
        filterGroup: "technical",
        heroDesc: "Cloud, on-prem, virtualization, identity and resilience.",
        cardDesc: "Servers, networks, virtualization, identity and security.",
        drillDesc: "Hardware, operating systems, networks, virtualization and security. The foundation for everything else.",
        thumb: "assets/proj-banner-headquarters.jpg",
        cardPills: ["Windows", "Linux", "Networking", "VMware ESXi"],
        extraCount: 6,
        overview: "Twenty years of hands-on infrastructure experience—from Dell commercial hardware diagnostics and Harris NOC/server migrations to Grenville's headquarters datacentre, VMware ESXi virtualization, Active Directory and network security.",
        keySkills: ["Windows", "Linux", "VMware", "Active Directory", "Networking", "Security", "Virtualization", "Resilience", "System Design"],
        tools: ["Windows Server", "Linux", "Active Directory", "VMware ESXi", "Group Policy", "Exchange", "Docker", "Firewalls & VPN", "DNS / DHCP / VLANs", "UPS & Generator Power"],
        toolBars: [
          { name: "Windows Server", pct: 90, badge: "WS", theme: "amber" },
          { name: "Active Directory & GPO", pct: 88, badge: "AD", theme: "blue" },
          { name: "Linux & Self-Hosting", pct: 85, badge: "LX", theme: "amber" },
          { name: "VMware ESXi", pct: 82, badge: "VM", theme: "cyan" },
          { name: "Networking & Firewalls", pct: 82, badge: "NW", theme: "teal" },
          { name: "Docker & Containers", pct: 78, badge: "DK", theme: "blue" }
        ],
        relatedCapabilityIds: ["development", "data", "business"],
        relatedConnections: [
          { id: "development", label: "Development & Engineering", reason: "Active Directory, Windows/Linux servers, Docker and Tauri runtimes host and secure custom applications." },
          { id: "data", label: "Integration & Data", reason: "Database hosts, segmented VLANs, VPNs and scheduled jobs sustain high-availability ETL and APIs." },
          { id: "business", label: "Business & Delivery", reason: "Resilient infrastructure, UPS/generator continuity and DR planning protect daily business operations." }
        ],
        relatedProjectSlugs: ["headquarters", "foundations", "dell"],
        relatedCareerChapters: ["metal", "business", "always"],
        project: {
          title: "Headquarters Infrastructure & Systems",
          mobTitle: "Headquarters Infrastructure & Systems",
          meta: "Grenville Mutual · 2009 – 2022",
          mobMeta: "Grenville Mutual · 2009 – 2022",
          desc: "Server room, cooling/UPS/generator continuity, network security and bare-metal to VMware ESXi transition.",
          thumb: "assets/proj-banner-headquarters.jpg",
          tags: ["Infrastructure", "VMware ESXi", "Resilience"],
          href: "#projects/headquarters"
        },
        workflow: ["Diagnose & Baseline", "Design Topology", "Stage & Migrate", "Verify Resilience"]
      },
      {
        id: "data",
        stackOrder: 3,
        stackLayerName: "Integration & Data",
        stackCallout: "Data & Integration",
        stackSub: "APIs, ETL pipelines, SQL & reporting continuity",
        title: "Integration & Data",
        shortLabel: "Data & Integration",
        pct: 88,
        evidenceBadge: "APIs · ETL · SQL · CSIO",
        evidenceContext: "Relative focus across enterprise SQL, XML/CSIO & REST/SOAP pipelines",
        theme: "cyan",
        accentHex: "#10b981",
        filterGroup: "technical",
        heroDesc: "APIs, ETL, SQL reconciliation and reporting continuity.",
        cardDesc: "Databases, ETL, APIs and reporting solutions.",
        drillDesc: "Relational databases, ETL pipelines, XML/REST/SOAP contracts and financial reporting continuity.",
        thumb: "assets/proj-banner-takeover.jpg",
        cardPills: ["SQL", "ETL", "APIs", "Reporting"],
        extraCount: 6,
        overview: "Designing reliable contracts between systems—from SOAP/REST and CSIO XML broker integrations to scheduled provider synchronization, production Excel/VB/XML takeover loading and legacy COBOL/InterBlue daily ETL continuity into Cognos.",
        keySkills: ["SQL", "ETL", "Reporting", "REST APIs", "SOAP / XML", "CSIO Standards", "Data Mapping", "Reconciliation", "Schema Validation"],
        tools: ["SQL", "XML / XSD", "REST APIs", "SOAP", "CSIO XML", "Cognos Reporting", "Excel / VB Tooling", "PostgreSQL", "Flat-File ETL", "Reconciliation"],
        toolBars: [
          { name: "SQL & Reconciliation", pct: 90, badge: "SQ", theme: "cyan" },
          { name: "XML / CSIO Schemas", pct: 88, badge: "XM", theme: "blue" },
          { name: "REST & SOAP APIs", pct: 85, badge: "AP", theme: "blue" },
          { name: "Excel / VB Tooling", pct: 85, badge: "VB", theme: "emerald" },
          { name: "ETL & Cognos Feeds", pct: 82, badge: "ET", theme: "amber" },
          { name: "PostgreSQL", pct: 78, badge: "PG", theme: "blue" }
        ],
        relatedCapabilityIds: ["insurance", "development", "ai", "business"],
        relatedConnections: [
          { id: "insurance", label: "Insurance Domain", reason: "Underwriting, broker quoting and claims payloads depend on accurate CSIO XML, SOAP/REST and SQL mappings." },
          { id: "development", label: "Development & Engineering", reason: "C#/.NET services, SQL scripts and Excel/VB/XML utilities enforce schema validation and reconciliation." },
          { id: "ai", label: "AI & Automation", reason: "Structured data contracts and deterministic verification gates ground multi-agent orchestration." },
          { id: "business", label: "Business & Delivery", reason: "Field-level mapping specs and financial reconciliation preserve reporting continuity during platform change." }
        ],
        relatedProjectSlugs: ["takeover", "continuity", "sql", "inquiry"],
        relatedCareerChapters: ["business", "clouds", "always"],
        project: {
          title: "Takeover-History XML Loading",
          mobTitle: "Takeover-History XML Loading",
          meta: "Medavie Blue Cross · 2022 – Present",
          mobMeta: "Medavie Blue Cross · 2022 – Present",
          desc: "Production Excel/VB/XML validation and generation workflow with downstream financial reconciliation.",
          thumb: "assets/proj-banner-takeover.jpg",
          tags: ["SQL", "XML", "Reconciliation"],
          href: "#projects/takeover"
        },
        workflow: ["Inspect Payloads", "Map Schemas & Rules", "Validate & Transform", "Reconcile Totals"]
      },
      {
        id: "insurance",
        stackOrder: 5,
        stackLayerName: "Insurance Domain",
        stackCallout: "Domain Expertise",
        stackSub: "P&C underwriting, broker workflows & claims rules",
        title: "Insurance Domain",
        shortLabel: "Insurance Domain",
        pct: 90,
        evidenceBadge: "16+ yrs · P&C + Health/Dental",
        evidenceContext: "Relative focus across P&C (2009–2022) & Health/Dental claims (2022–Present)",
        theme: "amber",
        accentHex: "#f4c542",
        filterGroup: "domain",
        heroDesc: "Underwriting, claims, broker workflows and policy rules.",
        cardDesc: "Underwriting, claims, P&C and health/dental rules.",
        drillDesc: "Property & Casualty underwriting, broker workflows, health/dental claims adjudication and benefit rules.",
        thumb: "assets/proj-banner-renewals.jpg",
        cardPills: ["Claims", "Underwriting", "Rules", "Policy"],
        extraCount: 6,
        overview: "Deep insurance domain fluency since 2009 across Property & Casualty (residential, commercial, farm/agri underwriting, renewals, broker portals) and Health & Dental benefits (claims adjudication, provider registry sync, group takeover).",
        keySkills: ["Claims", "Underwriting", "Rules", "Policy", "P&C Renewals", "Health & Dental", "Broker Workflows", "Endorsements", "Provider Registry"],
        tools: ["P&C Policy Admin", "Underwriting Rules", "Claims Adjudication", "ProviderRegistry", "CSIO Standards", "Broker Portals", "Renewal Eligibility", "Group Takeover", "Endorsement Diff"],
        toolBars: [
          { name: "P&C Underwriting Rules", pct: 92, badge: "UW", theme: "amber" },
          { name: "Broker Portal Workflows", pct: 90, badge: "BP", theme: "blue" },
          { name: "Renewal Eligibility", pct: 90, badge: "RN", theme: "emerald" },
          { name: "Health & Dental Claims", pct: 88, badge: "CL", theme: "cyan" },
          { name: "Provider Registry Sync", pct: 85, badge: "PR", theme: "blue" },
          { name: "Group Benefit Takeover", pct: 85, badge: "GT", theme: "purple" }
        ],
        relatedCapabilityIds: ["data", "business", "development"],
        relatedConnections: [
          { id: "data", label: "Integration & Data", reason: "Policy, billing, provider and claims rules execute across two-way broker XML/SOAP/REST and ETL pipelines." },
          { id: "business", label: "Business & Delivery", reason: "Collaborating directly with underwriters, brokers and adjusters turns complex policy rules into clear specs." },
          { id: "development", label: "Development & Engineering", reason: "Rule engines, endorsement delta comparators and adjuster upload portals codify domain workflows." }
        ],
        relatedProjectSlugs: ["renewals", "newbusiness", "workflows", "claims"],
        relatedCareerChapters: ["business", "clouds"],
        project: {
          title: "Renewal Eligibility & Underwriting Automation",
          mobTitle: "Renewal Eligibility & Automation",
          meta: "Grenville Mutual · 2009 – 2022",
          mobMeta: "Grenville Mutual · 2009 – 2022",
          desc: "Rule-driven renewal eligibility (~80% residential, ~60% commercial, ~40% farm/agri user-reported renewal automation).",
          thumb: "assets/proj-banner-renewals.jpg",
          tags: ["Underwriting", "P&C Rules", "Renewals"],
          href: "#projects/renewals"
        },
        workflow: ["Policy & Claim Rules", "Eligibility Logic", "Straight-Through Flow", "Exception Routing"]
      },
      {
        id: "ai",
        stackOrder: 4,
        stackLayerName: "AI & Automation",
        stackCallout: "AI & Automation",
        stackSub: "Multi-agent orchestration, context & evaluation",
        title: "AI & Automation",
        shortLabel: "AI & Automation",
        pct: 80,
        evidenceBadge: "NEXUS · Multi-Agent & Local AI",
        evidenceContext: "Relative focus across NEXUS orchestration, context compilation & LOWKEY ONNX",
        theme: "purple",
        accentHex: "#a855f7",
        filterGroup: "tools",
        heroDesc: "Agents, orchestration, context compilation and evaluation.",
        cardDesc: "Multi-agent orchestration, context compilation and evaluation.",
        drillDesc: "Multi-agent orchestration, scoped context compilation, model routing and practical workflow automation.",
        thumb: "assets/proj-banner-nexus.jpg",
        cardPills: ["Agents", "LLMs", "Automation", "Evaluation"],
        extraCount: 6,
        overview: "Building governed multi-agent orchestration, scoped context compilation, constraint-aware model routing and human-reviewed execution across NEXUS and local on-device voice inference in LOWKEY.",
        keySkills: ["Agents", "LLMs", "Automation", "Evaluation", "Context Compilation", "Model Routing", "Human-in-the-Loop", "Orchestration", "Local Inference"],
        tools: ["Claude", "OpenAI", "Gemini", "Scoped Context Compilation", "Model Routing", "Playwright", "Whisper ONNX", "Human-in-the-Loop", "Node.js Orchestration", "GitHub"],
        toolBars: [
          { name: "Multi-Agent Orchestration", pct: 85, badge: "NX", theme: "purple" },
          { name: "Claude / OpenAI / Gemini", pct: 85, badge: "LM", theme: "blue" },
          { name: "Scoped Context & Routing", pct: 82, badge: "CX", theme: "cyan" },
          { name: "Playwright Automation", pct: 80, badge: "PW", theme: "emerald" },
          { name: "Local Voice Inference (ONNX)", pct: 78, badge: "LK", theme: "blue" },
          { name: "Workflow Automation", pct: 80, badge: "WF", theme: "amber" }
        ],
        relatedCapabilityIds: ["business", "data", "development", "infrastructure"],
        relatedConnections: [
          { id: "business", label: "Business & Delivery", reason: "Solution design decomposes complex goals into governed agent roles, quality gates and human review." },
          { id: "data", label: "Integration & Data", reason: "Scoped context packets, structured schemas and verification logs prevent agent drift." },
          { id: "development", label: "Development & Engineering", reason: "Built with TypeScript, React, Node.js, Rust/Tauri and local ONNX runtime pipelines." },
          { id: "infrastructure", label: "Infrastructure & Systems", reason: "Local hardware execution, GPU/CPU resource budgeting and isolated process sandboxes." }
        ],
        relatedProjectSlugs: ["nexus", "lowkey", "workshop42"],
        relatedCareerChapters: ["clouds", "always"],
        project: {
          title: "NEXUS — AI Orchestration Platform",
          mobTitle: "NEXUS — AI Orchestration Platform",
          meta: "Independent · Active Development",
          mobMeta: "Independent · Active Development",
          desc: "Multi-agent platform for planning, execution and evaluation.",
          thumb: "assets/proj-banner-nexus.jpg",
          isNexus: true,
          tags: ["AI Agents", "Platform", "Automation"],
          href: "#projects/nexus"
        },
        workflow: ["Problem", "Design & Plan", "Build & Automate", "Evaluate & Improve"]
      },
      {
        id: "development",
        stackOrder: 2,
        stackLayerName: "Development & Engineering",
        stackCallout: "Engineering",
        stackSub: "TypeScript, Node.js, C#/.NET, Rust/Tauri & SQL",
        title: "Development & Engineering",
        shortLabel: "Development",
        pct: 75,
        evidenceBadge: "TS · Node · C#/.NET · Rust",
        evidenceContext: "Relative focus across web portals, desktop apps & production tooling",
        theme: "emerald",
        accentHex: "#22d3ee",
        filterGroup: "technical",
        heroDesc: "TypeScript, Node.js, C#/.NET, Rust/Tauri and modern toolchains.",
        cardDesc: "TypeScript, Node.js, C#/.NET, Rust/Tauri and modern toolchains.",
        drillDesc: "Full-stack web, desktop and enterprise tooling across TypeScript, Node.js, C#/.NET, Rust/Tauri and SQL.",
        thumb: "assets/proj-banner-newbusiness.jpg",
        cardPills: ["TypeScript", "Node.js", "C#", ".NET"],
        extraCount: 6,
        overview: "Full-stack application and tooling engineering across web, desktop and enterprise environments—from TypeScript/React/Node.js in NEXUS and Rust/Tauri in LOWKEY to C#/.NET adjuster portals and Excel/VB/XML utilities.",
        keySkills: ["TypeScript", "Node.js", "React", "C#", ".NET", "Rust / Tauri", "SQL", "Excel / VB / XML", "Web Portals"],
        tools: ["TypeScript", "JavaScript", "React", "Node.js", "C# / .NET", "Rust", "Tauri", "SQL", "Excel / VB / XML", "HTML / CSS"],
        toolBars: [
          { name: "TypeScript & JavaScript", pct: 80, badge: "TS", theme: "blue" },
          { name: "Node.js & React", pct: 78, badge: "ND", theme: "emerald" },
          { name: "SQL Query Engineering", pct: 88, badge: "SQ", theme: "cyan" },
          { name: "C# / .NET Web Portals", pct: 75, badge: "C#", theme: "purple" },
          { name: "Rust & Tauri Desktop", pct: 70, badge: "RS", theme: "amber" },
          { name: "Excel / VB / XML Tooling", pct: 85, badge: "VB", theme: "emerald" }
        ],
        relatedCapabilityIds: ["infrastructure", "data", "ai", "insurance"],
        relatedConnections: [
          { id: "infrastructure", label: "Infrastructure & Systems", reason: "OS internals, networking, authentication and runtime packaging underpin reliable software." },
          { id: "data", label: "Integration & Data", reason: "REST/SOAP clients, SQL queries and XML generators turn integration specs into working code." },
          { id: "ai", label: "AI & Automation", reason: "Full-stack TypeScript/Node.js and Rust/Tauri engineering power NEXUS and LOWKEY." },
          { id: "insurance", label: "Insurance Domain", reason: "Custom C#/.NET portals, endorsement comparators and takeover tools solve frontline underwriting & claims needs." }
        ],
        relatedProjectSlugs: ["upload", "changes", "nexus", "lowkey"],
        relatedCareerChapters: ["metal", "business", "clouds", "always"],
        project: {
          title: "Authenticated Document Upload Portal",
          mobTitle: "Authenticated Document Upload Portal",
          meta: "Grenville Mutual · 2009 – 2022",
          mobMeta: "Grenville Mutual · 2009 – 2022",
          desc: "External adjuster document and media upload portal in C#/.NET, JavaScript and Bootstrap integrated with policy records.",
          thumb: "assets/proj-banner-newbusiness.jpg",
          tags: ["C# / .NET", "JavaScript", "Web"],
          href: "#projects/upload"
        },
        workflow: ["Requirements", "Architecture & API", "Implement & Test", "Ship & Support"]
      },
      {
        id: "business",
        stackOrder: 6,
        stackLayerName: "Business & Delivery / Solution Design",
        stackCallout: "Business Impact",
        stackSub: "Solution design, functional analysis & execution",
        title: "Business & Delivery",
        shortLabel: "Solution Design",
        pct: 85,
        evidenceBadge: "Solution Design & Delivery",
        evidenceContext: "Relative focus across functional analysis, solution review & stakeholder delivery",
        theme: "sky",
        accentHex: "#60a5fa",
        filterGroup: "soft",
        heroDesc: "From idea to production — functional analysis and solution design.",
        cardDesc: "Analysis, solution design, requirements and execution.",
        drillDesc: "Functional analysis, solution design, stakeholder alignment and end-to-end delivery across technical and business teams.",
        thumb: "assets/proj-banner-continuity.jpg",
        cardPills: ["Strategy", "Architecture", "Delivery", "Docs"],
        extraCount: 6,
        overview: "Translating ambiguous operational problems into structured functional specifications, field mappings, acceptance criteria and stakeholder-ready solutions across underwriters, brokers, claims teams and engineers.",
        keySkills: ["Strategy", "Architecture", "Delivery", "Docs", "Functional Analysis", "Solution Design", "Requirements", "Stakeholder Alignment", "UAT & QA"],
        tools: ["Functional Analysis", "Solution Design", "Requirements Specs", "Field Mapping", "Stakeholder Workshops", "Agile Delivery", "UAT & Reconciliation", "Process Modeling", "Documentation", "Continuity Planning"],
        toolBars: [
          { name: "Functional Analysis", pct: 92, badge: "FA", theme: "blue" },
          { name: "Solution Design & Review", pct: 90, badge: "SD", theme: "cyan" },
          { name: "Requirements & Mapping", pct: 90, badge: "RM", theme: "emerald" },
          { name: "Stakeholder Alignment", pct: 88, badge: "SA", theme: "amber" },
          { name: "Cross-Team Delivery", pct: 85, badge: "CD", theme: "blue" },
          { name: "Continuity Planning", pct: 85, badge: "CP", theme: "purple" }
        ],
        relatedCapabilityIds: ["insurance", "data", "ai", "infrastructure", "development"],
        relatedConnections: [
          { id: "insurance", label: "Insurance Domain", reason: "Bridges underwriters, brokers and claims operations with engineering teams to deliver measurable outcomes." },
          { id: "data", label: "Integration & Data", reason: "Defines source-to-target mappings, synchronization rules and reconciliation checkpoints." },
          { id: "ai", label: "AI & Automation", reason: "Shapes multi-agent orchestration around clear problem decomposition and human-reviewed quality gates." },
          { id: "infrastructure", label: "Infrastructure & Systems", reason: "Grounds solution designs in real operational constraints, security and cutover continuity." }
        ],
        relatedProjectSlugs: ["continuity", "claims", "renewals", "newbusiness"],
        relatedCareerChapters: ["business", "clouds", "always"],
        project: {
          title: "Claims Reporting & Data Continuity",
          mobTitle: "Claims Reporting & Data Continuity",
          meta: "Medavie Blue Cross · 2022 – Present",
          mobMeta: "Medavie Blue Cross · 2022 – Present",
          desc: "End-to-end analysis and solution design preserving daily claims flat-file ETL continuity into Cognos reporting.",
          thumb: "assets/proj-banner-continuity.jpg",
          tags: ["Analysis", "Solution Design", "Continuity"],
          href: "#projects/continuity"
        },
        workflow: ["Discover & Listen", "Define Contracts", "Align Teams", "Validate Outcomes"]
      }
    ]);

    const SKILL_TIMELINE_CHAPTERS = Object.freeze([
      {
        id: "metal",
        years: "2006 – 2009 (+ HQ Build)",
        chapterTitle: "Grounded in the Metal",
        roleTitle: "Hardware, NOC & Infrastructure",
        orgs: "Dell Canada (Sept 2006 – 2009) · Harris Computer Systems · Early Grenville HQ",
        theme: "blue",
        summary: "Built foundational diagnostic discipline on Dell Latitude/OptiPlex commercial hardware, Harris NOC monitoring and zero-downtime SBS swing migrations, and Grenville's 42U datacentre & VMware ESXi virtualization.",
        primaryCapabilities: ["infrastructure", "development"],
        capabilityPills: [
          { catId: "infrastructure", label: "Infrastructure & Systems", tone: "blue" },
          { catId: "infrastructure", label: "Active Directory & Exchange", tone: "blue" },
          { catId: "infrastructure", label: "VMware ESXi & VLANs", tone: "cyan" },
          { catId: "development", label: "Diagnostic Scripting & Tooling", tone: "emerald" }
        ],
        projectSlugs: ["dell", "foundations", "headquarters"]
      },
      {
        id: "business",
        years: "2009 – 2022",
        chapterTitle: "Shaped by the Business",
        roleTitle: "Insurance Systems & Integration",
        orgs: "Grenville Mutual Insurance (Infrastructure → Business Systems Analyst)",
        theme: "amber",
        summary: "Combined infrastructure fluency with deep P&C insurance domain knowledge—designing renewal eligibility automation (~80% residential, ~60% commercial, ~40% farm/agri user-reported renewal-only), two-way broker CSIO/XML integration and C#/.NET portals.",
        primaryCapabilities: ["insurance", "data", "business", "development", "infrastructure"],
        capabilityPills: [
          { catId: "insurance", label: "Insurance Domain (P&C)", tone: "amber" },
          { catId: "data", label: "Integration & Data (CSIO / SOAP / REST)", tone: "cyan" },
          { catId: "business", label: "Business & Delivery / Specs", tone: "amber" },
          { catId: "development", label: "C# / .NET & Endorsement Tooling", tone: "emerald" }
        ],
        projectSlugs: ["renewals", "newbusiness", "workflows", "changes", "inquiry", "upload"]
      },
      {
        id: "clouds",
        years: "2022 – Present",
        chapterTitle: "Building in the Cloud",
        roleTitle: "Enterprise Claims Analysis & AI Orchestration",
        orgs: "Medavie Blue Cross · Independent Capstone (NEXUS)",
        theme: "emerald",
        summary: "Applies 20 years of systems thinking to enterprise health/dental claims adjudication, provider data synchronization, production takeover XML tooling, ETL reporting continuity and multi-agent AI orchestration in NEXUS.",
        primaryCapabilities: ["ai", "business", "data", "insurance", "development"],
        capabilityPills: [
          { catId: "ai", label: "AI & Automation (NEXUS)", tone: "purple" },
          { catId: "business", label: "Solution Design & Continuity", tone: "sky" },
          { catId: "data", label: "Claims SQL & Takeover XML", tone: "cyan" },
          { catId: "insurance", label: "Health & Dental Claims", tone: "amber" },
          { catId: "development", label: "TypeScript / Node.js / Rust", tone: "emerald" }
        ],
        projectSlugs: ["nexus", "claims", "takeover", "continuity", "sql"]
      },
      {
        id: "always",
        years: "Always",
        chapterTitle: "Always Learning & Building",
        roleTitle: "Ongoing Exploration Across Disciplines",
        orgs: "NEXUS · LOWKEY (Rust/Tauri/ONNX) · Workshop42",
        theme: "purple",
        summary: "Earlier capabilities never disappeared—hardware realism, SQL/XML precision, insurance domain rules and solution design now compound inside modern AI orchestration and local-first software.",
        primaryCapabilities: ["ai", "development", "infrastructure", "data", "insurance", "business"],
        capabilityPills: [
          { catId: "ai", label: "Multi-Agent Orchestration", tone: "purple" },
          { catId: "development", label: "Rust / Tauri / TypeScript", tone: "emerald" },
          { catId: "infrastructure", label: "Local ONNX & Self-Hosted Systems", tone: "blue" },
          { catId: "business", label: "End-to-End Product Architecture", tone: "sky" }
        ],
        projectSlugs: ["nexus", "lowkey", "workshop42"]
      }
    ]);

    function getSkillCatIconSvg(catId) {
      if (catId === "infrastructure") {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3.5" width="18" height="5" rx="1.4"/><rect x="3" y="9.5" width="18" height="5" rx="1.4"/><rect x="3" y="15.5" width="18" height="5" rx="1.4"/><circle cx="6.5" cy="6" r=".9" fill="currentColor"/><circle cx="6.5" cy="12" r=".9" fill="currentColor"/><circle cx="6.5" cy="18" r=".9" fill="currentColor"/><path d="M11 6h7M11 12h7M11 18h7"/></svg>`;
      }
      if (catId === "data") {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5.5" rx="7.5" ry="3"/><path d="M4.5 5.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6"/><path d="M4.5 11.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6"/></svg>`;
      }
      if (catId === "insurance") {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.8 19 5.8v5.6c0 5-3.2 8.6-7 10-3.8-1.4-7-5-7-10V5.8l7-3Z"/><path d="m9 12 2 2 4-4"/></svg>`;
      }
      if (catId === "ai") {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2.3"/><circle cx="6" cy="17" r="2.3"/><circle cx="18" cy="17" r="2.3"/><circle cx="12" cy="12" r="2"/><path d="M12 7.3V10M10.3 13.2 7.8 15.3M13.7 13.2l2.5 2.1"/></svg>`;
      }
      if (catId === "development") {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 8-4.5 4L8 16M16 8l4.5 4-4.5 4M13.5 5l-3 14"/></svg>`;
      }
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16"/><rect x="6" y="12" width="3" height="8" rx="0.8"/><rect x="11" y="8" width="3" height="12" rx="0.8"/><rect x="16" y="4" width="3" height="16" rx="0.8"/></svg>`;
    }

    // Reusable Component 1: Interactive Exploded Isometric Capability Stack (6 layers from bottom to top)
    // Layer order bottom-to-top per spec: 1. Infrastructure -> 2. Development -> 3. Integration & Data -> 4. AI & Automation -> 5. Insurance Domain -> 6. Business & Solution Design
    const STACK_LAYERS_TOP_TO_BOTTOM = Object.freeze([
      {
        id: "business",
        num: "06",
        label: "Business & Solution Design",
        callout: "Business Impact",
        shortDesc: "Functional analysis, solution design & stakeholder alignment",
        theme: "amber",
        stroke: "#f4c542",
        fillTop: "rgba(244, 197, 66, 0.24)",
        fillSide: "rgba(217, 119, 6, 0.38)",
        glyphSvg: `<rect x="122" y="13" width="6" height="11" rx="1" fill="#fde047"/><rect x="131" y="8" width="6" height="16" rx="1" fill="#facc15"/><rect x="140" y="3" width="7" height="21" rx="1" fill="#fef08a"/><rect x="150" y="10" width="6" height="14" rx="1" fill="#f59e0b"/><polygon points="108,22 140,8 172,22 140,34" fill="rgba(250,204,21,0.22)" stroke="#fde047" stroke-width="1.3"/>`
      },
      {
        id: "insurance",
        num: "05",
        label: "Insurance Domain",
        callout: "Domain Expertise",
        shortDesc: "P&C underwriting, broker workflows & health/dental claims rules",
        theme: "gold",
        stroke: "#fbbf24",
        fillTop: "rgba(245, 158, 11, 0.20)",
        fillSide: "rgba(180, 83, 9, 0.34)",
        glyphSvg: `<polygon points="118,22 118,12 130,6 142,12 142,22" fill="rgba(251,191,36,0.34)" stroke="#fde68a" stroke-width="1.3"/><rect x="145" y="10" width="14" height="13" rx="1.2" fill="rgba(245,158,11,0.35)" stroke="#fcd34d" stroke-width="1.3"/><path d="M126 16 l3 3 l5-5" stroke="#fef08a" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
      },
      {
        id: "ai",
        num: "04",
        label: "AI & Automation",
        callout: "AI & Automation",
        shortDesc: "Governed multi-agent orchestration, context compilation & evaluation",
        theme: "purple",
        stroke: "#c084fc",
        fillTop: "rgba(168, 85, 247, 0.24)",
        fillSide: "rgba(109, 40, 217, 0.38)",
        glyphSvg: `<polygon points="140,5 158,14 140,23 122,14" fill="rgba(192,132,252,0.36)" stroke="#e9d5ff" stroke-width="1.5"/><circle cx="140" cy="14" r="4" fill="#f3e8ff"/><circle cx="116" cy="19" r="2.6" fill="#c084fc"/><circle cx="164" cy="19" r="2.6" fill="#c084fc"/><line x1="120" y1="18" x2="136" y2="15" stroke="#e9d5ff" stroke-width="1.2"/><line x1="160" y1="18" x2="144" y2="15" stroke="#e9d5ff" stroke-width="1.2"/>`
      },
      {
        id: "data",
        num: "03",
        label: "Integration & Data",
        callout: "Data & Integration",
        shortDesc: "REST/SOAP APIs, CSIO XML, SQL reconciliation & ETL feeds",
        theme: "cyan",
        stroke: "#38bdf8",
        fillTop: "rgba(14, 165, 233, 0.24)",
        fillSide: "rgba(2, 132, 199, 0.38)",
        glyphSvg: `<path d="M126 21h28a6.5 6.5 0 0 0 1-12.8 8.5 8.5 0 0 0-16.2-2.2A6.5 6.5 0 0 0 126 21Z" fill="rgba(125,211,252,0.42)" stroke="#bae6fd" stroke-width="1.5"/><ellipse cx="115" cy="19" rx="7" ry="3" fill="rgba(52,211,153,0.35)" stroke="#6ee7b7" stroke-width="1.2"/>`
      },
      {
        id: "development",
        num: "02",
        label: "Development & Engineering",
        stackCallout: "Engineering",
        callout: "Engineering",
        shortDesc: "TypeScript, Node.js, C#/.NET, Rust/Tauri & SQL toolchains",
        theme: "emerald",
        stroke: "#2dd4bf",
        fillTop: "rgba(20, 184, 166, 0.22)",
        fillSide: "rgba(15, 118, 110, 0.38)",
        glyphSvg: `<path d="M128 12 l-8 6 l8 6 M152 12 l8 6 l-8 6 M143 10 l-6 16" stroke="#99f6e4" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
      },
      {
        id: "infrastructure",
        num: "01",
        label: "Infrastructure & Systems",
        callout: "Infrastructure",
        shortDesc: "Hardware diagnostics, servers, VMware ESXi, AD & networks",
        theme: "metal",
        stroke: "#60a5fa",
        fillTop: "rgba(59, 130, 246, 0.20)",
        fillSide: "rgba(30, 58, 138, 0.42)",
        glyphSvg: `<rect x="116" y="8" width="21" height="16" rx="1.6" fill="rgba(148,163,184,0.32)" stroke="#cbd5e1" stroke-width="1.3"/><rect x="141" y="8" width="21" height="16" rx="1.6" fill="rgba(148,163,184,0.32)" stroke="#cbd5e1" stroke-width="1.3"/><circle cx="121" cy="12" r="1.3" fill="#38bdf8"/><circle cx="121" cy="17" r="1.3" fill="#34d399"/><circle cx="146" cy="12" r="1.3" fill="#38bdf8"/><circle cx="146" cy="17" r="1.3" fill="#f4c542"/>`
      }
    ]);

    const COMPACT_DOCK_META = Object.freeze({
      infrastructure: {
        id: "infrastructure",
        title: "Infrastructure & Systems",
        theme: "blue",
        shortDesc: "Hardware diagnostics, servers, virtualization, networks and resilience.",
        thumb: "assets/proj-banner-headquarters.jpg",
        keyTools: ["Windows Server", "VMware ESXi", "Active Directory", "Linux", "VLANs & VPN", "+6"],
        realExamples: [
          "HQ server room, SAN & VMware ESXi transition",
          "Repeatable zero-downtime SBS swing migrations",
          "Dell Gloves Off commercial hardware diagnostics"
        ],
        focusAreas: ["Virtualization", "Active Directory", "Networking", "Hardware Diag", "DR & Continuity"],
        experienceItems: [
          "20+ years starting Sept 2006 at Dell",
          "Harris NOC & SBS swing migrations",
          "Grenville HQ buildout & ESXi transition",
          "Firewalls, SAN, UPS & generator resilience"
        ],
        connectsWith: [
          { id: "development", title: "Development & Eng.", sub: "OS & runtime hosting", theme: "emerald" },
          { id: "data", title: "Integration & Data", sub: "Data platforms & VPNs", theme: "cyan" },
          { id: "business", title: "Business & Delivery", sub: "Cutover & DR continuity", theme: "sky" },
          { id: "ai", title: "AI & Automation", sub: "Local ONNX execution", theme: "purple" }
        ],
        relatedSlugs: ["headquarters", "foundations", "dell"]
      },
      data: {
        id: "data",
        title: "Integration & Data",
        theme: "cyan",
        shortDesc: "APIs, ETL, data models and reporting solutions.",
        thumb: "assets/proj-banner-takeover.jpg",
        keyTools: ["SQL", "ETL", "APIs", "CSIO XML", "Reporting", "+6"],
        realExamples: [
          "Claims data integration & SQL reconciliation",
          "Reporting pipelines & daily flat-file ETL design",
          "Two-way broker SOAP/REST & CSIO XML APIs"
        ],
        focusAreas: ["Claims SQL", "REST & SOAP", "CSIO / XML", "ETL Pipelines", "Reconciliation"],
        experienceItems: [
          "Two-way broker CSIO & portal APIs",
          "Provider registry event-table & REST sync",
          "Hand-written claims SQL reconciliation",
          "Takeover-history XML validation tooling"
        ],
        connectsWith: [
          { id: "insurance", title: "Insurance Domain", sub: "Claims & rules", theme: "amber" },
          { id: "ai", title: "AI & Automation", sub: "Data for agents", theme: "purple" },
          { id: "infrastructure", title: "Infrastructure", sub: "Data platforms", theme: "blue" },
          { id: "business", title: "Business & Delivery", sub: "Reporting & insights", theme: "sky" }
        ],
        relatedSlugs: ["claims", "sql", "takeover"]
      },
      insurance: {
        id: "insurance",
        title: "Insurance Domain",
        theme: "amber",
        shortDesc: "Underwriting, claims, P&C and health/dental rules.",
        thumb: "assets/proj-banner-renewals.jpg",
        keyTools: ["Underwriting", "Claims", "CSIO XML", "Broker Portals", "Policy Rules", "+6"],
        realExamples: [
          "Renewal automation (~80% res / ~60% comm / ~40% farm)",
          "Broker-native new business & quoting workflows",
          "Health & dental provider data adjudication"
        ],
        focusAreas: ["Claims", "Underwriting", "Policy", "Rules & Edits", "Data Mapping"],
        experienceItems: [
          "16+ years in insurance (since 2009)",
          "P&C and health/dental systems",
          "Broker workflows & portal specs",
          "Rules and integration"
        ],
        connectsWith: [
          { id: "data", title: "Integration & Data", sub: "Payloads & ETL", theme: "cyan" },
          { id: "business", title: "Business & Delivery", sub: "Underwriting specs", theme: "sky" },
          { id: "development", title: "Development & Eng.", sub: "Portals & comparators", theme: "emerald" },
          { id: "ai", title: "AI & Automation", sub: "Governed workflows", theme: "purple" }
        ],
        relatedSlugs: ["renewals", "newbusiness", "workflows"]
      },
      ai: {
        id: "ai",
        title: "AI & Automation",
        theme: "purple",
        shortDesc: "Agents, orchestration, context compilation and evaluation.",
        thumb: "assets/proj-banner-nexus.jpg",
        keyTools: ["LLMs", "Agents", "Context", "Node.js", "Evaluation", "+6"],
        realExamples: [
          "NEXUS multi-agent orchestration platform",
          "Scoped context & explainable model routing",
          "LOWKEY local ONNX voice-to-text pipeline"
        ],
        focusAreas: ["Multi-Agent", "Scoped Context", "Model Routing", "Evaluation", "Local ONNX"],
        experienceItems: [
          "Active independent capstone: NEXUS",
          "Separated plan, review & execution",
          "Recoverable Node.js execution state",
          "Local Rust/Tauri & Whisper ONNX"
        ],
        connectsWith: [
          { id: "development", title: "Development & Eng.", sub: "TS, Node & Rust/Tauri", theme: "emerald" },
          { id: "data", title: "Integration & Data", sub: "Structured context", theme: "cyan" },
          { id: "business", title: "Business & Delivery", sub: "Human review gates", theme: "sky" },
          { id: "infrastructure", title: "Infrastructure", sub: "Local runtime hosts", theme: "blue" }
        ],
        relatedSlugs: ["nexus", "lowkey", "renewals"]
      },
      development: {
        id: "development",
        title: "Development & Engineering",
        theme: "emerald",
        shortDesc: "TypeScript, Node.js, C#/.NET, Rust/Tauri, SQL and practical tooling.",
        thumb: "assets/proj-banner-newbusiness.jpg",
        keyTools: ["TypeScript", "Node.js", "C# / .NET", "Rust / Tauri", "SQL", "+6"],
        realExamples: [
          "NEXUS full-stack TypeScript & Node.js runtime",
          "C#/.NET authenticated adjuster upload portal",
          "Production Excel/VB/XML takeover tooling"
        ],
        focusAreas: ["TypeScript / JS", "C# / .NET Web", "Rust & Tauri", "SQL Queries", "XML / VB Tools"],
        experienceItems: [
          "Full-stack web & desktop apps",
          "C#/.NET adjuster document upload",
          "Endorsement comparison & validation",
          "Team-adopted XML generation utilities"
        ],
        connectsWith: [
          { id: "infrastructure", title: "Infrastructure", sub: "OS, auth & hosting", theme: "blue" },
          { id: "data", title: "Integration & Data", sub: "APIs, SQL & XML", theme: "cyan" },
          { id: "ai", title: "AI & Automation", sub: "Agent harnesses", theme: "purple" },
          { id: "insurance", title: "Insurance Domain", sub: "Frontline workflow tools", theme: "amber" }
        ],
        relatedSlugs: ["upload", "changes", "takeover"]
      },
      business: {
        id: "business",
        title: "Business & Delivery",
        theme: "sky",
        shortDesc: "Functional analysis, solution design, requirements and execution.",
        thumb: "assets/proj-banner-continuity.jpg",
        keyTools: ["Solution Design", "Analysis", "Field Mapping", "Requirements", "UAT & QA", "+6"],
        realExamples: [
          "Claims reporting & ETL continuity design",
          "Provider registry solution review & mappings",
          "Renewal & broker underwriting rule specs"
        ],
        focusAreas: ["Solution Design", "Requirements", "Field Mapping", "Stakeholders", "UAT & Continuity"],
        experienceItems: [
          "Bridging business & technical teams",
          "Source-to-target field mapping specs",
          "Completed reporting continuity design",
          "Production rollout & user support"
        ],
        connectsWith: [
          { id: "insurance", title: "Insurance Domain", sub: "Underwriting & claims", theme: "amber" },
          { id: "data", title: "Integration & Data", sub: "Contracts & reconciliation", theme: "cyan" },
          { id: "ai", title: "AI & Automation", sub: "Decomposition & gates", theme: "purple" },
          { id: "infrastructure", title: "Infrastructure", sub: "Operational continuity", theme: "blue" }
        ],
        relatedSlugs: ["continuity", "claims", "renewals"]
      }
    });

    function renderInteractiveCapabilityStackHtml(contextMode) {
      const focusId = hoveredSkillCategory || compactSkillsLockedCat || (contextMode === "page" ? activeSkillCategory : null);
      const focusedCat = focusId ? (SKILL_CATEGORIES.find(c => c.id === focusId) || SKILL_CATEGORIES[0]) : null;
      const isHome = contextMode === "home";

      return `
        <div class="cap-stack-widget ${isHome ? "is-home-stack" : "is-page-stack"}" data-cap-stack-widget data-active-layer="${focusId || "none"}">
          <div class="cap-stack-stage" role="group" aria-label="Interactive six-layer capability architecture stack">
            <!-- Vertical Illuminated Conduit Beam -->
            <div class="cap-stack-core-beam" aria-hidden="true"></div>

            <div class="cap-stack-layers-list">
              ${STACK_LAYERS_TOP_TO_BOTTOM.map(layer => {
                let stateCls = "is-resting";
                if (focusedCat) {
                  const isSelected = layer.id === focusedCat.id;
                  const isRelated = focusedCat.relatedCapabilityIds.includes(layer.id);
                  stateCls = isSelected ? "is-selected" : (isRelated ? "is-connected" : "is-dimmed");
                }
                return `
                  <button
                    type="button"
                    class="cap-stack-layer theme-${layer.theme} ${stateCls}"
                    data-skills-stack-layer="${layer.id}"
                    data-compact-skill-tile="${layer.id}"
                    aria-pressed="${layer.id === compactSkillsLockedCat ? "true" : "false"}"
                    aria-label="Layer ${layer.num}: ${layer.label} — ${layer.shortDesc}"
                  >
                    <!-- Isometric 3D Platform Slab SVG -->
                    <span class="cap-stack-slab-wrap" aria-hidden="true">
                      <svg class="cap-stack-slab-svg" viewBox="0 0 260 44" fill="none">
                        <!-- Slab Drop Glow & Side Extrusion -->
                        <polygon class="slab-extrusion" points="28,22 130,40 232,22 232,28 130,44 28,28" fill="${layer.fillSide}" stroke="${layer.stroke}" stroke-opacity="0.6" stroke-width="1"/>
                        <!-- Isometric Top Diamond Platform -->
                        <polygon class="slab-surface" points="130,4 232,22 130,40 28,22" fill="${layer.fillTop}" stroke="${layer.stroke}" stroke-width="1.5"/>
                        <!-- Inner Grid Lines -->
                        <line x1="79" y1="13" x2="181" y2="31" stroke="${layer.stroke}" stroke-opacity="0.22" stroke-width="0.8"/>
                        <line x1="181" y1="13" x2="79" y2="31" stroke="${layer.stroke}" stroke-opacity="0.22" stroke-width="0.8"/>
                        <!-- Layer Icon / Miniature Illustration (centered around x=130) -->
                        <g transform="translate(-10, -2)">${layer.glyphSvg}</g>
                      </svg>
                    </span>

                    <!-- Right Callout Leader & Label -->
                    <span class="cap-stack-callout">
                      <span class="cap-stack-callout-dot" aria-hidden="true"></span>
                      <span class="cap-stack-callout-line" aria-hidden="true"></span>
                      <span class="cap-stack-callout-copy">
                        <strong class="cap-stack-callout-title">${layer.callout}</strong>
                      </span>
                    </span>
                  </button>
                `;
              }).join("")}
            </div>
          </div>
        </div>
      `;
    }

    // Reusable Component 2: Compact 3x2 Capability Tiles (matching reference image order, 2-line title + short subtitle + bottom bar)
    const TOP_SPOTLIGHT_CARDS = Object.freeze([
      { id: "infrastructure", line1: "Infrastructure", line2: "& Systems", desc: "Cloud, on-prem, networks and security.", theme: "blue" },
      { id: "data", line1: "Integration", line2: "& Data", desc: "APIs, ETL and reporting solutions.", theme: "cyan" },
      { id: "insurance", line1: "Insurance", line2: "Domain", desc: "Underwriting, claims, P&C and health/dental.", theme: "amber" },
      { id: "ai", line1: "AI &", line2: "Automation", desc: "Agents, orchestration and evaluation.", theme: "purple" },
      { id: "development", line1: "Development", line2: "& Engineering", desc: "TypeScript, Node.js, C#/.NET and tooling.", theme: "emerald" },
      { id: "business", line1: "Business", line2: "& Delivery", desc: "Analysis, solution design and execution.", theme: "sky" }
    ]);

    function renderTopCapabilityCardsHtml() {
      const focusId = hoveredSkillCategory || compactSkillsLockedCat || "infrastructure";
      return `
        <div class="home-sum-skills-cards cap-overview-cards-grid" role="list" aria-label="Six complementary capability categories">
          ${TOP_SPOTLIGHT_CARDS.map(card => {
            const isAct = card.id === focusId;
            const isLocked = card.id === compactSkillsLockedCat;
            return `
              <button
                type="button"
                class="home-sum-skill-card cap-spotlight-card theme-${card.theme} ${isAct ? "is-active" : ""} ${isLocked ? "is-locked" : ""}"
                data-compact-skill-tile="${card.id}"
                data-skills-select-cat="${card.id}"
                aria-pressed="${isLocked ? "true" : "false"}"
                role="listitem"
              >
                <span class="home-sum-skill-icon theme-${card.theme}" aria-hidden="true">
                  ${getSkillCatIconSvg(card.id)}
                </span>
                <h3>
                  <span>${card.line1}</span>
                  <span>${card.line2}</span>
                </h3>
                <p class="cap-spotlight-desc">${card.desc}</p>
                <span class="cap-spotlight-accent-bar theme-${card.theme}" aria-hidden="true"></span>
              </button>
            `;
          }).join("")}
        </div>
      `;
    }

    // 4-State Compact Bottom Dock (Featured Layer / Hover | Selected Details | Connections View | Compact Stats)
    function renderCompactSkillsDockHtml() {
      const activeId = hoveredSkillCategory || compactSkillsLockedCat || "infrastructure";
      const meta = COMPACT_DOCK_META[activeId] || COMPACT_DOCK_META.infrastructure;
      const relatedProjs = meta.relatedSlugs.map(s => PROJECTS_BY_SLUG[s]).filter(Boolean);

      // Optional Compact 4-Pillar Stats View (when user clicks "× Compact")
      if (compactSkillsDockView === "stats") {
        return `
          <div class="compact-skills-dock-inner is-state-default" data-dock-state="default">
            <div class="compact-dock-mode-bar">
              <button type="button" class="compact-dock-mode-btn" data-compact-dock-mode="featured">Featured Layer</button>
              <button type="button" class="compact-dock-mode-btn" data-compact-dock-mode="selected">Selected Details</button>
              <button type="button" class="compact-dock-mode-btn" data-compact-dock-mode="connections">Connections View</button>
              <button type="button" class="compact-dock-mode-btn is-active" data-compact-dock-mode="stats">Compact Stats</button>
            </div>
            <div class="compact-skills-stats-row">
              <div class="compact-skill-stat">
                <span class="compact-stat-icon theme-blue" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="4" width="18" height="17" rx="2.5"/><path d="M8 2v4M16 2v4M3 9h18"/></svg>
                </span>
                <div class="compact-stat-copy">
                  <strong>20+</strong>
                  <span>Years Experience</span>
                </div>
              </div>

              <div class="compact-skill-stat">
                <span class="compact-stat-icon theme-cyan" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></svg>
                </span>
                <div class="compact-stat-copy">
                  <strong>6</strong>
                  <span>Core Capabilities</span>
                </div>
              </div>

              <div class="compact-skill-stat">
                <span class="compact-stat-icon theme-amber" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 2 20 6.5v11L12 22 4 17.5v-11L12 2Z"/><path d="M4 6.5 12 11l8-4.5M12 11v11"/></svg>
                </span>
                <div class="compact-stat-copy">
                  <strong>30+</strong>
                  <span>Key Tools &amp; Platforms</span>
                </div>
              </div>

              <div class="compact-skill-stat">
                <span class="compact-stat-icon theme-emerald" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M4 20h16"/><rect x="6" y="13" width="3" height="7" rx="0.8"/><rect x="11" y="9" width="3" height="11" rx="0.8"/><rect x="16" y="5" width="3" height="15" rx="0.8"/></svg>
                </span>
                <div class="compact-stat-copy">
                  <strong>Real Impact</strong>
                  <span>Across Insurance &amp; Technology</span>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      // State 4: CONNECTIONS VIEW — Connects With 2x2 grid + Key Tools + Real Examples
      if (compactSkillsLockedCat && compactSkillsDockView === "connections") {
        return `
          <div class="compact-skills-dock-inner is-state-connections theme-${meta.theme}" data-dock-state="connections">
            <div class="compact-dock-mode-bar">
              <button type="button" class="compact-dock-mode-btn" data-compact-dock-mode="featured">Featured Layer</button>
              <button type="button" class="compact-dock-mode-btn" data-compact-dock-mode="selected">Selected Details</button>
              <button type="button" class="compact-dock-mode-btn is-active" data-compact-dock-mode="connections">Connections View</button>
              <button type="button" class="compact-dock-mode-btn is-reset" data-compact-dock-mode="stats" aria-label="Show compact stats">&times; Compact</button>
            </div>
            <div class="compact-dock-connections-grid">
              <div class="compact-dock-lead">
                <div class="compact-dock-thumb">
                  <img src="${meta.thumb}" alt="${meta.title}" loading="lazy">
                </div>
                <div class="compact-dock-lead-copy">
                  <strong>${meta.title}</strong>
                  <p>${meta.shortDesc}</p>
                </div>
              </div>

              <div class="compact-dock-col">
                <span class="compact-dock-col-label">Connects With</span>
                <div class="compact-dock-connects-grid">
                  ${meta.connectsWith.map(conn => `
                    <button type="button" class="compact-conn-mini-card theme-${conn.theme}" data-skills-select-cat="${conn.id}">
                      <span class="compact-conn-mini-icon theme-${conn.theme}" aria-hidden="true">${getSkillCatIconSvg(conn.id)}</span>
                      <span class="compact-conn-mini-text">
                        <strong>${conn.title}</strong>
                        <small>${conn.sub}</small>
                      </span>
                    </button>
                  `).join("")}
                </div>
              </div>

              <div class="compact-dock-col">
                <span class="compact-dock-col-label">Key Tools</span>
                <div class="compact-dock-pills">
                  ${meta.keyTools.map(t => `<span class="compact-dock-pill ${t.startsWith("+") ? "is-more" : ""}">${t}</span>`).join("")}
                </div>
              </div>

              <div class="compact-dock-col">
                <span class="compact-dock-col-label">Real Examples</span>
                <ul class="compact-dock-bullets">
                  ${meta.realExamples.map(ex => `<li>${ex}</li>`).join("")}
                </ul>
              </div>

              <a class="compact-dock-chevron-link" href="?cat=${meta.id}#skills" data-skills-deep-link="${meta.id}" aria-label="Explore ${meta.title} in full Skills Explorer">
                <span aria-hidden="true">&rarr;</span>
              </a>
            </div>
          </div>
        `;
      }

      // State 3: SELECTED DETAILS — Thumbnail + Badge + Focus Areas + Experience + Related Projects
      if (compactSkillsLockedCat && compactSkillsDockView === "selected") {
        return `
          <div class="compact-skills-dock-inner is-state-selected theme-${meta.theme}" data-dock-state="selected">
            <div class="compact-dock-mode-bar">
              <button type="button" class="compact-dock-mode-btn" data-compact-dock-mode="featured">Featured Layer</button>
              <button type="button" class="compact-dock-mode-btn is-active" data-compact-dock-mode="selected">Selected Details</button>
              <button type="button" class="compact-dock-mode-btn" data-compact-dock-mode="connections">Connections View</button>
              <button type="button" class="compact-dock-mode-btn is-reset" data-compact-dock-mode="stats" aria-label="Show compact stats">&times; Compact</button>
            </div>
            <div class="compact-dock-selected-grid">
              <div class="compact-dock-lead">
                <div class="compact-dock-thumb">
                  <img src="${meta.thumb}" alt="${meta.title}" loading="lazy">
                </div>
                <div class="compact-dock-lead-copy">
                  <span class="compact-dock-cat-badge theme-${meta.theme}">${meta.title}</span>
                  <p>${meta.shortDesc}</p>
                </div>
              </div>

              <div class="compact-dock-col">
                <span class="compact-dock-col-label">Focus Areas</span>
                <div class="compact-dock-pills">
                  ${meta.focusAreas.map(f => `<span class="compact-dock-pill">${f}</span>`).join("")}
                </div>
              </div>

              <div class="compact-dock-col">
                <span class="compact-dock-col-label">Experience</span>
                <ul class="compact-dock-exp-list">
                  ${meta.experienceItems.map(item => `
                    <li>
                      <span class="compact-exp-dot" aria-hidden="true">&#10003;</span>
                      <span>${item}</span>
                    </li>
                  `).join("")}
                </ul>
              </div>

              <div class="compact-dock-col">
                <span class="compact-dock-col-label">Related Projects</span>
                <div class="compact-dock-proj-links">
                  ${relatedProjs.map(p => `
                    <a class="compact-dock-proj-link" href="#projects/${p.slug}">
                      <span class="compact-proj-link-dot" aria-hidden="true"></span>
                      <span>${p.shortTitle || p.title}</span>
                    </a>
                  `).join("")}
                </div>
              </div>

              <a class="compact-dock-chevron-link" href="?cat=${meta.id}#skills" data-skills-deep-link="${meta.id}" aria-label="Explore ${meta.title} in full Skills Explorer">
                <span aria-hidden="true">&rarr;</span>
              </a>
            </div>
          </div>
        `;
      }

      // Default Featured Layer / Hover Strip (matching reference image: Featured Layer + Key Tools + Recent Projects + Connects With)
      return `
        <div class="compact-skills-dock-inner is-state-featured theme-${meta.theme}" data-dock-state="featured">
          <div class="compact-dock-featured-grid">
            <div class="compact-dock-lead is-featured-lead">
              <div class="compact-dock-thumb is-featured-thumb">
                <img src="${meta.thumb}" alt="${meta.title}" loading="lazy">
              </div>
              <div class="compact-dock-lead-copy">
                <span class="compact-dock-featured-pill theme-${meta.theme}">Featured Layer</span>
                <strong>${meta.title}</strong>
                <p>${meta.shortDesc}</p>
              </div>
              <a class="compact-dock-chevron-link is-circle-arrow" href="?cat=${meta.id}#skills" data-skills-deep-link="${meta.id}" aria-label="Explore ${meta.title} in full Skills Explorer">
                <span aria-hidden="true">&rarr;</span>
              </a>
            </div>

            <div class="compact-dock-col">
              <span class="compact-dock-col-label">Key Tools</span>
              <div class="compact-dock-pills">
                ${meta.keyTools.map(t => `<span class="compact-dock-pill ${t.startsWith("+") ? "is-more" : ""}">${t}</span>`).join("")}
              </div>
            </div>

            <div class="compact-dock-col">
              <span class="compact-dock-col-label">Recent Projects</span>
              <div class="compact-dock-proj-links">
                ${relatedProjs.map(p => `
                  <a class="compact-dock-proj-link" href="#projects/${p.slug}">
                    <span class="compact-proj-mini-box" aria-hidden="true">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2.5" y="3" width="11" height="10" rx="1.8"/><path d="M5 6.5h6M5 9.5h4"/></svg>
                    </span>
                    <span>${p.shortTitle || p.title}</span>
                  </a>
                `).join("")}
              </div>
            </div>

            <div class="compact-dock-col">
              <span class="compact-dock-col-label">Connects With</span>
              <div class="compact-dock-conn-rows">
                ${meta.connectsWith.slice(0, 3).map(conn => `
                  <button type="button" class="compact-dock-conn-row theme-${conn.theme}" data-skills-select-cat="${conn.id}">
                    <span class="compact-conn-row-icon theme-${conn.theme}" aria-hidden="true">${getSkillCatIconSvg(conn.id)}</span>
                    <span>${conn.title}</span>
                  </button>
                `).join("")}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    function buildSkillsProficiencyStripHtml() {
      return "";
    }

    function buildHomeSkillsHeroHtml() {
      return `
        <div class="compact-skills-showcase">
          <div class="home-skills-hero-grid">
            <!-- A. Narrative Introduction -->
            <div class="home-sum-skills-intro">
              <p class="home-sum-eyebrow">04 / SKILLS &amp; FOCUS</p>
              <h2 id="home-sum-skills-heading" class="home-sum-title">
                <span>Bringing layers</span>
                <span class="hl-business">together.</span>
              </h2>
              <p class="home-sum-subtitle">Business context, technical depth, and practical execution.</p>
              <div class="home-skills-intro-actions">
                <a class="home-skills-gold-cta" href="#skills">
                  <span>Explore My Capabilities</span>
                  <span aria-hidden="true">&rarr;</span>
                </a>
                <button type="button" class="home-skills-watch-btn" data-skills-watch-overview>
                  <span class="home-skills-watch-ring" aria-hidden="true">&#9654;</span>
                  <span>Watch 30s overview</span>
                </button>
              </div>
            </div>

            <!-- C. Capability Overview (6 Compact 3x2 Capability Tiles) -->
            <div class="home-skills-center-cards">
              ${renderTopCapabilityCardsHtml(true)}
            </div>

            <!-- B. Interactive Capability Stack -->
            <div class="home-skills-right-stack">
              ${renderInteractiveCapabilityStackHtml("home")}
            </div>
          </div>

          <!-- D. Compact 4-State Bottom Dock (Default Stats | Hover | Selected | Connections) -->
          <div class="compact-skills-dock" data-compact-skills-dock aria-live="polite">
            ${renderCompactSkillsDockHtml()}
          </div>
        </div>
      `;
    }

    function getFilteredSkillCategories() {
      const q = activeSkillSearch.trim().toLowerCase();
      return SKILL_CATEGORIES.filter(cat => {
        if (activeSkillFilter === "technical" && !["infrastructure", "data", "development"].includes(cat.id)) return false;
        if (activeSkillFilter === "domain" && !["insurance", "data", "business"].includes(cat.id)) return false;
        if (activeSkillFilter === "tools" && !["ai", "infrastructure", "data", "development"].includes(cat.id)) return false;
        if (activeSkillFilter === "soft" && !["business", "insurance"].includes(cat.id)) return false;
        if (!q) return true;
        const haystack = [
          cat.title,
          cat.cardDesc,
          cat.overview,
          ...cat.cardPills,
          ...cat.keySkills,
          ...cat.tools,
          cat.project.title
        ].join(" ").toLowerCase();
        return haystack.includes(q);
      });
    }

    // Reusable Component 3: Interactive Capability Map (Network Graph + Connection Inspector)
    function renderCapabilityMapHtml() {
      const activeCat = SKILL_CATEGORIES.find(c => c.id === activeSkillCategory) || SKILL_CATEGORIES[3];
      const connectedIds = new Set(activeCat.relatedCapabilityIds);

      // Coordinates in a 680x390 SVG coordinate space with Solution Design / Business at the hub (340, 195)
      const nodeCoords = {
        business: { x: 340, y: 200, hub: true },
        insurance: { x: 128, y: 145 },
        infrastructure: { x: 148, y: 315 },
        data: { x: 470, y: 325 },
        ai: { x: 545, y: 195 },
        development: { x: 340, y: 68 }
      };

      const edges = [
        ["business", "insurance"],
        ["business", "ai"],
        ["business", "data"],
        ["business", "infrastructure"],
        ["business", "development"],
        ["insurance", "data"],
        ["data", "development"],
        ["ai", "data"],
        ["infrastructure", "development"],
        ["infrastructure", "data"],
        ["ai", "development"]
      ];

      return `
        <div class="cap-map-view" aria-label="Interactive Capability Network Map">
          <div class="cap-map-header-bar">
            <div>
              <h3>Map View (Connections)</h3>
              <p>Interactive network showing how capabilities connect in real solutions. Select any node to inspect its relationships.</p>
            </div>
          </div>

          <div class="cap-map-layout">
            <!-- Left Interactive Network Canvas -->
            <div class="cap-map-stage">
              <svg class="cap-map-svg" viewBox="0 0 680 390" fill="none" aria-hidden="true">
                <defs>
                  <radialGradient id="capMapHubGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.28"/>
                    <stop offset="100%" stop-color="#071122" stop-opacity="0"/>
                  </radialGradient>
                </defs>
                <circle cx="340" cy="200" r="155" fill="url(#capMapHubGlow)"/>
                <circle cx="340" cy="200" r="125" stroke="rgba(148, 163, 184, 0.14)" stroke-dasharray="4 6" stroke-width="1.2"/>

                ${edges.map(([aId, bId]) => {
                  const ptA = nodeCoords[aId];
                  const ptB = nodeCoords[bId];
                  const isHighlighted =
                    (aId === activeCat.id && connectedIds.has(bId)) ||
                    (bId === activeCat.id && connectedIds.has(aId));
                  const mx = (ptA.x + ptB.x) / 2;
                  const my = (ptA.y + ptB.y) / 2 - 14;
                  return `
                    <path
                      class="cap-map-edge ${isHighlighted ? "is-active" : ""}"
                      d="M ${ptA.x} ${ptA.y} Q ${mx} ${my} ${ptB.x} ${ptB.y}"
                      stroke="${isHighlighted ? activeCat.accentHex : "rgba(148, 163, 184, 0.22)"}"
                      stroke-width="${isHighlighted ? "2.6" : "1.3"}"
                    />
                  `;
                }).join("")}
              </svg>

              <div class="cap-map-nodes" role="group" aria-label="Capability network nodes">
                ${SKILL_CATEGORIES.map(cat => {
                  const pos = nodeCoords[cat.id] || { x: 340, y: 195 };
                  const leftPct = ((pos.x / 680) * 100).toFixed(1);
                  const topPct = ((pos.y / 390) * 100).toFixed(1);
                  const isSelected = cat.id === activeCat.id;
                  const isConnected = connectedIds.has(cat.id);
                  const nodeState = isSelected ? "is-selected" : (isConnected ? "is-connected" : "is-muted");
                  return `
                    <button
                      type="button"
                      class="cap-map-node theme-${cat.theme} ${pos.hub ? "is-hub" : ""} ${nodeState}"
                      style="left:${leftPct}%; top:${topPct}%;"
                      data-skills-select-cat="${cat.id}"
                      aria-pressed="${isSelected ? "true" : "false"}"
                    >
                      <span class="cap-map-node-ring" aria-hidden="true">
                        ${getSkillCatIconSvg(cat.id)}
                      </span>
                      <span class="cap-map-node-label">${cat.shortLabel}</span>
                    </button>
                  `;
                }).join("")}
              </div>
            </div>

            <!-- Right Connection Inspector Panel -->
            <aside class="cap-map-inspector" aria-live="polite">
              <div class="cap-map-insp-head">
                <span class="skills-strip-icon theme-${activeCat.theme}" aria-hidden="true">${getSkillCatIconSvg(activeCat.id)}</span>
                <div>
                  <h4>${activeCat.title}</h4>
                  <span>connects with ${activeCat.relatedConnections.length} complementary layers:</span>
                </div>
              </div>
              <ul class="cap-map-insp-list">
                ${activeCat.relatedConnections.map(conn => `
                  <li>
                    <button type="button" class="cap-map-conn-jump" data-skills-select-cat="${conn.id}">
                      <strong>${conn.label} &rarr;</strong>
                      <span>${conn.reason}</span>
                    </button>
                  </li>
                `).join("")}
              </ul>
              <div class="cap-map-insp-footer">
                <button type="button" class="cap-map-scroll-detail-btn" data-skills-scroll-detail>
                  <span>Inspect ${activeCat.shortLabel} Applied Evidence</span>
                  <span aria-hidden="true">&darr;</span>
                </button>
              </div>
            </aside>
          </div>
        </div>
      `;
    }

    // Reusable Component 4: Interactive Timeline View (Career-to-Skills Progression)
    function renderCapabilityTimelineHtml() {
      return `
        <div class="cap-timeline-view" aria-label="Capability Timeline View — Career Integration">
          <div class="cap-timeline-header-bar">
            <div>
              <h3>Timeline View (Career Integration)</h3>
              <p>How capabilities developed and accumulated across career chapters&mdash;earlier foundations compound into later work.</p>
            </div>
            <div class="cap-timeline-chapter-pills" role="group" aria-label="Filter timeline by career chapter">
              <button type="button" class="cap-tl-filter-btn ${activeSkillTimelineChapter === "all" ? "is-active" : ""}" data-skills-tl-chapter="all">All Chapters</button>
              ${SKILL_TIMELINE_CHAPTERS.map(ch => `
                <button type="button" class="cap-tl-filter-btn ${activeSkillTimelineChapter === ch.id ? "is-active" : ""}" data-skills-tl-chapter="${ch.id}">${ch.chapterTitle}</button>
              `).join("")}
            </div>
          </div>

          <!-- Horizontal Illuminated Progression Rail -->
          <div class="cap-timeline-columns" role="list">
            ${SKILL_TIMELINE_CHAPTERS.map(ch => {
              const isHighlighted = activeSkillTimelineChapter === "all" || activeSkillTimelineChapter === ch.id;
              const matchesActiveSkill = ch.primaryCapabilities.includes(activeSkillCategory);
              return `
                <article
                  class="cap-timeline-col theme-${ch.theme} ${isHighlighted ? "is-highlighted" : "is-dimmed"} ${matchesActiveSkill ? "has-active-skill" : ""}"
                  role="listitem"
                >
                  <div class="cap-tl-rail-node" aria-hidden="true">
                    <span class="cap-tl-dot theme-${ch.theme}"></span>
                    <span class="cap-tl-line"></span>
                  </div>

                  <div class="cap-tl-meta">
                    <span class="cap-tl-years">${ch.years}</span>
                    <h4>${ch.roleTitle}</h4>
                    <span class="cap-tl-chapter-tag">${ch.chapterTitle}</span>
                    <p class="cap-tl-orgs">${ch.orgs}</p>
                  </div>

                  <p class="cap-tl-summary">${ch.summary}</p>

                  <div class="cap-tl-pills" role="group" aria-label="Capabilities developed in ${ch.chapterTitle}">
                    ${ch.capabilityPills.map(pill => `
                      <button
                        type="button"
                        class="cap-tl-skill-pill tone-${pill.tone} ${pill.catId === activeSkillCategory ? "is-selected" : ""}"
                        data-skills-select-cat="${pill.catId}"
                      >
                        <span>${pill.label}</span>
                      </button>
                    `).join("")}
                  </div>

                  <div class="cap-tl-projects">
                    <span class="cap-tl-proj-label">Documented Evidence:</span>
                    <div class="cap-tl-proj-links">
                      ${ch.projectSlugs.map(slug => {
                        const p = PROJECTS_BY_SLUG[slug];
                        if (!p) return "";
                        return `<a class="cap-tl-proj-link" href="#projects/${p.slug}">${p.shortTitle || p.title} &rarr;</a>`;
                      }).join("")}
                    </div>
                  </div>
                </article>
              `;
            }).join("")}
          </div>
        </div>
      `;
    }

    function renderSkillsMainContainerHtml() {
      if (activeSkillViewMode === "map" || activeSkillFilter === "map") {
        return renderCapabilityMapHtml();
      }
      if (activeSkillViewMode === "timeline") {
        return renderCapabilityTimelineHtml();
      }

      const cats = getFilteredSkillCategories();
      if (!cats.length) {
        return `
          <div class="skills-empty-state">
            <p>No capability categories matched <strong>"${activeSkillSearch}"</strong>.</p>
            <button type="button" class="skills-reset-btn" data-skills-reset-all>Show all 6 capabilities</button>
          </div>
        `;
      }

      return `
        <div class="skills-cat-grid" role="list" aria-label="Capability categories">
          ${cats.map(cat => {
            const isSelected = cat.id === activeSkillCategory;
            return `
              <article
                class="skills-cat-card theme-${cat.theme} ${isSelected ? "is-selected" : ""}"
                data-skills-select-cat="${cat.id}"
                role="button"
                tabindex="0"
                aria-pressed="${isSelected ? "true" : "false"}"
              >
                <div class="skills-cat-card-top">
                  <div class="skills-cat-thumb-wrap">
                    <img src="${cat.thumb}" alt="${cat.title}" loading="lazy">
                  </div>
                  <div class="skills-cat-card-copy">
                    <div class="skills-cat-title-row">
                      <h3>${cat.title}</h3>
                      <span class="skills-cat-chevron" aria-hidden="true">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 4 4 4-4 4"/></svg>
                      </span>
                    </div>
                    <p>${cat.cardDesc}</p>
                  </div>
                </div>
                <div class="skills-cat-pills">
                  ${cat.cardPills.map(p => `<span class="skills-cat-pill">${p}</span>`).join("")}
                  <span class="skills-cat-pill is-count">+${cat.extraCount}</span>
                </div>
              </article>
            `;
          }).join("")}
        </div>
      `;
    }

    // Reusable Component 5: Applied Experience / Detail View (Category Expanded)
    function renderSkillsExpandedDetailHtml() {
      const cat = SKILL_CATEGORIES.find(c => c.id === activeSkillCategory) || SKILL_CATEGORIES[0];
      const relatedProjects = (cat.relatedProjectSlugs || [])
        .map(slug => PROJECTS_BY_SLUG[slug])
        .filter(Boolean);
      const relatedChapters = SKILL_TIMELINE_CHAPTERS.filter(ch =>
        (cat.relatedCareerChapters || []).includes(ch.id)
      );
      const circumference = (2 * Math.PI * 22).toFixed(2);
      const dashOffset = (circumference * (1 - cat.pct / 100)).toFixed(2);

      const showSkills = activeSkillDetailTab === "all" || activeSkillDetailTab === "skills" || activeSkillDetailTab === "tools";
      const showProjects = activeSkillDetailTab === "all" || activeSkillDetailTab === "projects";
      const showCareer = activeSkillDetailTab === "all" || activeSkillDetailTab === "career" || activeSkillDetailTab === "connections";

      return `
        <div class="cap-detail-view">
          <div class="cap-detail-top-bar">
            <div class="cap-detail-top-left">
              <span class="cap-detail-eyebrow">DETAIL VIEW (CATEGORY EXPANDED) &middot; APPLIED EXPERIENCE</span>
              <h2>${cat.title} &mdash; Tools, Capabilities &amp; Documented Evidence</h2>
            </div>
            <div class="cap-detail-top-actions">
              <button type="button" class="cap-detail-all-btn" data-skills-reset-all>
                <span>All 6 Categories</span>
                <span aria-hidden="true">&uarr;</span>
              </button>
              <a class="cap-detail-page-link" href="?cat=${cat.id}#skills" data-skills-deep-link="${cat.id}">
                <span>Open Full Capability View</span>
                <span aria-hidden="true">&rarr;</span>
              </a>
            </div>
          </div>

          <!-- Hero Banner inside Detail Card (Matching Reference Image Bottom-Right Panel) -->
          <div class="cap-detail-hero-box">
            <div class="cap-detail-hero-thumb">
              <img src="${cat.thumb}" alt="${cat.title}" loading="lazy">
            </div>
            <div class="cap-detail-hero-copy">
              <div class="cap-detail-badge-row">
                <span class="cap-detail-layer-pill theme-${cat.theme}">Layer 0${cat.stackOrder} &middot; ${cat.evidenceBadge}</span>
                <span class="cap-detail-context-note">${cat.evidenceContext}</span>
              </div>
              <h3>${cat.title}</h3>
              <p>${cat.overview}</p>
            </div>
            <div class="cap-detail-gauge-box" title="${cat.evidenceContext}">
              <svg class="cap-detail-gauge-svg" viewBox="0 0 54 54" aria-hidden="true">
                <circle cx="27" cy="27" r="22" stroke="rgba(148,163,184,0.2)" stroke-width="4" fill="none"/>
                <circle cx="27" cy="27" r="22" stroke="${cat.accentHex}" stroke-width="4.2" stroke-linecap="round" fill="none" stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}" transform="rotate(-90 27 27)"/>
              </svg>
              <div class="cap-detail-gauge-label">
                <strong>${cat.pct}%</strong>
                <span>Relative Focus</span>
              </div>
            </div>
          </div>

          <!-- Interactive Detail Sub-Tabs -->
          <div class="cap-detail-tabs" role="tablist" aria-label="Applied experience evidence sections">
            <button type="button" role="tab" aria-selected="${activeSkillDetailTab === "all" ? "true" : "false"}" class="cap-detail-tab ${activeSkillDetailTab === "all" ? "is-active" : ""}" data-skills-detail-tab="all">All Evidence</button>
            <button type="button" role="tab" aria-selected="${activeSkillDetailTab === "skills" ? "true" : "false"}" class="cap-detail-tab ${activeSkillDetailTab === "skills" ? "is-active" : ""}" data-skills-detail-tab="skills">&bull; Skills (${cat.keySkills.length})</button>
            <button type="button" role="tab" aria-selected="${activeSkillDetailTab === "tools" ? "true" : "false"}" class="cap-detail-tab ${activeSkillDetailTab === "tools" ? "is-active" : ""}" data-skills-detail-tab="tools">&bull; Tools &amp; Platforms (${cat.tools.length})</button>
            <button type="button" role="tab" aria-selected="${activeSkillDetailTab === "projects" ? "true" : "false"}" class="cap-detail-tab ${activeSkillDetailTab === "projects" ? "is-active" : ""}" data-skills-detail-tab="projects">&bull; Case Studies &amp; Projects (${relatedProjects.length})</button>
            <button type="button" role="tab" aria-selected="${activeSkillDetailTab === "career" ? "true" : "false"}" class="cap-detail-tab ${activeSkillDetailTab === "career" ? "is-active" : ""}" data-skills-detail-tab="career">&bull; Career Chapters &amp; Related Layers</button>
          </div>

          <!-- 1. Skills & Tools Interactive Tag Cloud -->
          ${showSkills ? `
            <div class="cap-detail-pills-section">
              <div class="cap-detail-pills-row" aria-label="Core skills">
                <span class="cap-detail-row-label">Skills:</span>
                ${cat.keySkills.map(s => {
                  const isHi = activeSkillHighlightTag.toLowerCase() === s.toLowerCase();
                  return `<button type="button" class="cap-detail-tag-btn is-skill ${isHi ? "is-active" : ""}" data-skills-tag-highlight="${s}">${s}</button>`;
                }).join("")}
              </div>
              <div class="cap-detail-pills-row" aria-label="Tools and platforms">
                <span class="cap-detail-row-label">Tools:</span>
                ${cat.tools.map(t => {
                  const isHi = activeSkillHighlightTag.toLowerCase() === t.toLowerCase();
                  return `<button type="button" class="cap-detail-tag-btn is-tool ${isHi ? "is-active" : ""}" data-skills-tag-highlight="${t}">${t}</button>`;
                }).join("")}
              </div>
            </div>
          ` : ""}

          <!-- 2. Applied Case Studies & Portfolio Projects -->
          ${showProjects ? `
            <div class="cap-detail-projects-section">
              <h4 class="cap-detail-subhead">Applied Projects &amp; Case Studies (${relatedProjects.length})</h4>
              <div class="cap-detail-projects-grid">
                ${relatedProjects.map(proj => `
                  <a class="cap-detail-project-card" href="#projects/${proj.slug}">
                    <div class="cap-detail-proj-thumb">
                      <img src="${proj.banner || proj.bannerImg || cat.thumb}" alt="${proj.title}" loading="lazy">
                    </div>
                    <div class="cap-detail-proj-body">
                      <div class="cap-detail-proj-meta-row">
                        <span class="cap-detail-proj-org">${proj.org || proj.glance?.employer || "Portfolio"}</span>
                        <span class="cap-detail-proj-years">${proj.period || proj.sidebarSub || ""}</span>
                      </div>
                      <strong>${proj.title}</strong>
                      <p>${proj.shortDesc || proj.heroDesc || ""}</p>
                      <div class="cap-detail-proj-tags">
                        ${(proj.cardTags || proj.heroTags || []).slice(0, 4).map(t => `<span>${t}</span>`).join("")}
                      </div>
                    </div>
                    <span class="cap-detail-proj-arrow" aria-hidden="true">&rsaquo;</span>
                  </a>
                `).join("")}
              </div>
            </div>
          ` : ""}

          <!-- 3. Connected Capabilities, Career Chapters & Execution Workflow -->
          ${showCareer ? `
            <div class="cap-detail-bottom-grid">
              <div class="cap-detail-box">
                <h4 class="cap-detail-subhead">Connected Capabilities</h4>
                <div class="cap-detail-conn-list">
                  ${cat.relatedConnections.map(conn => `
                    <button type="button" class="cap-detail-conn-pill" data-skills-select-cat="${conn.id}">
                      <strong>${conn.label} &rarr;</strong>
                      <span>${conn.reason}</span>
                    </button>
                  `).join("")}
                </div>
              </div>

              <div class="cap-detail-box">
                <h4 class="cap-detail-subhead">Career Chapters &amp; Execution Flow</h4>
                <div class="cap-detail-chapters-row">
                  ${relatedChapters.map(ch => `
                    <a class="cap-detail-chap-chip theme-${ch.theme}" href="#career">
                      <strong>${ch.chapterTitle}</strong>
                      <span>${ch.years} &middot; ${ch.roleTitle}</span>
                    </a>
                  `).join("")}
                </div>
                <div class="skills-exp-workflow" role="list" aria-label="How I apply ${cat.title}">
                  ${cat.workflow.map((step, i) => `
                    <div class="skills-workflow-step" role="listitem">
                      <span>${step}</span>
                    </div>
                    ${i < cat.workflow.length - 1 ? `<span class="skills-workflow-arrow" aria-hidden="true">&rarr;</span>` : ""}
                  `).join("")}
                </div>
              </div>
            </div>
          ` : ""}
        </div>
      `;
    }

    function renderSkillsMobileDrilldownHtml() {
      const cat = SKILL_CATEGORIES.find(c => c.id === mobileSkillDrilldownId) || SKILL_CATEGORIES[0];
      const relatedProjects = (cat.relatedProjectSlugs || [])
        .map(slug => PROJECTS_BY_SLUG[slug])
        .filter(Boolean);
      return `
        <div class="skills-mob-drilldown">
          <div class="skills-mob-back-bar">
            <button type="button" class="skills-mob-back-btn" data-skills-mob-back>
              <span aria-hidden="true">&larr;</span>
              <span>All Capabilities</span>
            </button>
          </div>

          <div class="skills-mob-drill-hero">
            <img class="skills-mob-drill-bg" src="${cat.thumb}" alt="" aria-hidden="true">
            <div class="skills-mob-drill-scrim" aria-hidden="true"></div>
            <div class="skills-mob-drill-content">
              <span class="skills-strip-icon theme-${cat.theme}" aria-hidden="true">${getSkillCatIconSvg(cat.id)}</span>
              <h2>${cat.title}</h2>
              <p>${cat.drillDesc}</p>
              <span class="cap-detail-layer-pill theme-${cat.theme}">Layer 0${cat.stackOrder} &middot; ${cat.evidenceBadge}</span>
            </div>
          </div>

          <section class="skills-mob-card">
            <div class="skills-mob-card-head">
              <h3>Key skills &amp; tools</h3>
            </div>
            <div class="skills-mob-key-pills">
              ${cat.keySkills.concat(cat.tools.slice(0, 5)).map(s => `<span class="skills-cat-pill">${s}</span>`).join("")}
            </div>
          </section>

          <section class="skills-mob-card">
            <div class="skills-mob-card-head">
              <h3>Connected capabilities</h3>
            </div>
            <div class="cap-detail-conn-list">
              ${cat.relatedConnections.map(conn => `
                <button type="button" class="cap-detail-conn-pill" data-skills-mob-open="${conn.id}">
                  <strong>${conn.label} &rarr;</strong>
                  <span>${conn.reason}</span>
                </button>
              `).join("")}
            </div>
          </section>

          <section class="skills-mob-card">
            <div class="skills-mob-card-head">
              <h3>Applied case studies (${relatedProjects.length})</h3>
              <a class="skills-mob-view-all" href="#projects">View all &rarr;</a>
            </div>
            <div class="skills-mob-projects-stack">
              ${relatedProjects.map(proj => `
                <a class="skills-mob-rel-project" href="#projects/${proj.slug}">
                  <div class="skills-mob-rel-thumb">
                    <img src="${proj.banner || proj.bannerImg || cat.thumb}" alt="${proj.title}" loading="lazy">
                  </div>
                  <div class="skills-mob-rel-body">
                    <div class="skills-mob-rel-title-row">
                      <strong>${proj.shortTitle || proj.title}</strong>
                      <span aria-hidden="true">&rsaquo;</span>
                    </div>
                    <span class="skills-mob-rel-meta">${proj.org || proj.glance?.employer || "Portfolio"} &middot; ${proj.period || proj.sidebarSub || ""}</span>
                  </div>
                </a>
              `).join("")}
            </div>
          </section>
        </div>
      `;
    }

    const skillBarAnimHandles = new WeakMap();

    function animateSkillProgressBars(containerEl) {
      if (!containerEl || typeof window === "undefined") return;
      const prevHandle = skillBarAnimHandles.get(containerEl);
      if (prevHandle) cancelAnimationFrame(prevHandle);

      const bars = Array.from(containerEl.querySelectorAll("[data-skill-bar-target]"));
      const pcts = Array.from(containerEl.querySelectorAll("[data-skill-pct-target]"));
      if (!bars.length && !pcts.length) return;

      const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduceMotion || typeof requestAnimationFrame !== "function") {
        bars.forEach(bar => {
          const target = Number(bar.getAttribute("data-skill-bar-target")) || 0;
          bar.style.transition = "";
          bar.style.width = `${target}%`;
        });
        pcts.forEach(lbl => {
          const target = Number(lbl.getAttribute("data-skill-pct-target")) || 0;
          lbl.textContent = `${target}%`;
        });
        return;
      }

      bars.forEach(bar => {
        bar.style.transition = "none";
        bar.style.width = "0%";
      });
      pcts.forEach(lbl => {
        lbl.textContent = "0%";
      });

      const durationMs = 950;
      const staggerMs = 55;
      const maxStaggerMs = 300;
      const startTime = performance.now();

      function step(now) {
        const elapsed = now - startTime;
        let allComplete = true;

        bars.forEach((bar, idx) => {
          const target = Number(bar.getAttribute("data-skill-bar-target")) || 0;
          const delay = Math.min(idx * staggerMs, maxStaggerMs);
          const localElapsed = Math.max(0, elapsed - delay);
          const progress = Math.min(1, localElapsed / durationMs);
          if (progress < 1) allComplete = false;
          const eased = 1 - Math.pow(1 - progress, 3);
          const currentWidth = progress >= 1 ? target : +(target * eased).toFixed(2);
          bar.style.width = `${currentWidth}%`;
        });

        pcts.forEach((lbl, idx) => {
          const target = Number(lbl.getAttribute("data-skill-pct-target")) || 0;
          const delay = Math.min(idx * staggerMs, maxStaggerMs);
          const localElapsed = Math.max(0, elapsed - delay);
          const progress = Math.min(1, localElapsed / durationMs);
          if (progress < 1) allComplete = false;
          const eased = 1 - Math.pow(1 - progress, 3);
          const currentVal = progress >= 1 ? target : Math.round(target * eased);
          lbl.textContent = `${currentVal}%`;
        });

        if (!allComplete) {
          const nextId = requestAnimationFrame(step);
          skillBarAnimHandles.set(containerEl, nextId);
        } else {
          bars.forEach(bar => {
            bar.style.transition = "";
          });
          skillBarAnimHandles.delete(containerEl);
        }
      }

      const firstId = requestAnimationFrame(step);
      skillBarAnimHandles.set(containerEl, firstId);
    }

    function syncStackVisualStateOnly() {
      const focusId = hoveredSkillCategory || compactSkillsLockedCat;
      const focusedCat = focusId ? (SKILL_CATEGORIES.find(c => c.id === focusId) || SKILL_CATEGORIES[0]) : null;

      document.querySelectorAll("[data-cap-stack-widget]").forEach(widget => {
        widget.setAttribute("data-active-layer", focusId || "none");
        widget.querySelectorAll("[data-skills-stack-layer]").forEach(btn => {
          const lId = btn.getAttribute("data-skills-stack-layer");
          if (!focusedCat) {
            btn.classList.remove("is-selected", "is-connected", "is-dimmed");
            btn.classList.add("is-resting");
            btn.setAttribute("aria-pressed", "false");
          } else {
            const isSelected = lId === focusedCat.id;
            const isRelated = focusedCat.relatedCapabilityIds.includes(lId);
            btn.classList.remove("is-resting");
            btn.classList.toggle("is-selected", isSelected);
            btn.classList.toggle("is-connected", !isSelected && isRelated);
            btn.classList.toggle("is-dimmed", !isSelected && !isRelated);
            btn.setAttribute("aria-pressed", lId === compactSkillsLockedCat ? "true" : "false");
          }
        });
      });

      document.querySelectorAll(".home-sum-skill-card[data-compact-skill-tile]").forEach(btn => {
        const tileId = btn.getAttribute("data-compact-skill-tile");
        const isSel = Boolean(focusId) && tileId === focusId;
        const isLocked = Boolean(compactSkillsLockedCat) && tileId === compactSkillsLockedCat;
        btn.classList.toggle("is-active", isSel);
        btn.classList.toggle("is-locked", isLocked);
        btn.setAttribute("aria-pressed", isLocked ? "true" : "false");
      });

      const activeDockId = hoveredSkillCategory || compactSkillsLockedCat || "infrastructure";
      const activeDockKey = `${activeDockId}:${compactSkillsDockView === "stats" ? "stats" : (compactSkillsLockedCat ? compactSkillsDockView : "featured")}`;
      let dockHtml = null;
      document.querySelectorAll("[data-compact-skills-dock]").forEach(dock => {
        if (dock.getAttribute("data-rendered-key") !== activeDockKey || !dock.children.length) {
          if (dockHtml === null) {
            dockHtml = renderCompactSkillsDockHtml();
          }
          dock.innerHTML = dockHtml;
          dock.setAttribute("data-rendered-key", activeDockKey);
        }
      });
    }

    function refreshSkillsWorkbenchUI() {
      syncStackVisualStateOnly();

      const mainHtml = renderSkillsMainContainerHtml();
      document.querySelectorAll("[data-skills-main-container]").forEach(el => {
        el.innerHTML = mainHtml;
      });
      const expandedHtml = renderSkillsExpandedDetailHtml();
      document.querySelectorAll("[data-skills-expanded-panel]").forEach(el => {
        el.innerHTML = expandedHtml;
      });
      document.querySelectorAll("[data-skills-filter]").forEach(btn => {
        const isAct = btn.getAttribute("data-skills-filter") === activeSkillFilter;
        btn.classList.toggle("is-active", isAct);
        btn.setAttribute("aria-pressed", isAct ? "true" : "false");
      });
      document.querySelectorAll("[data-skills-view]").forEach(btn => {
        const isAct = btn.getAttribute("data-skills-view") === activeSkillViewMode;
        btn.classList.toggle("is-active", isAct);
        btn.setAttribute("aria-selected", isAct ? "true" : "false");
      });

      // Update URL query parameters when on #skills route
      if (document.body.getAttribute("data-active-route") === "skills" && typeof window.history?.replaceState === "function") {
        const params = new URLSearchParams(window.location.search || "");
        params.set("cat", activeSkillCategory);
        if (activeSkillViewMode !== "cards") params.set("view", activeSkillViewMode);
        else params.delete("view");
        const nextUrl = `${window.location.pathname}?${params.toString()}#skills`;
        window.history.replaceState(window.history.state, "", nextUrl);
      }

      document.querySelectorAll(".skills-mobile-workbench").forEach(mobWb => {
        const mobDrillWrap = mobWb.querySelector("[data-skills-mob-drill-wrap]");
        const mobOverviewWrap = mobWb.querySelector("[data-skills-mob-overview-wrap]");
        const mobMainSlot = mobWb.querySelector("[data-skills-mob-main-slot]");
        const parentSec = mobWb.closest("section[data-page]");
        const heroEl = parentSec ? parentSec.querySelector(".skills-page-hero") : null;
        if (mobMainSlot) {
          mobMainSlot.innerHTML = activeSkillViewMode === "map" ? renderCapabilityMapHtml() : (activeSkillViewMode === "timeline" ? renderCapabilityTimelineHtml() : `
            <div class="skills-mob-cat-pills-grid">
              ${SKILL_CATEGORIES.map(cat => `
                <button type="button" class="skills-mob-cat-btn ${cat.id === activeSkillCategory ? "is-active" : ""}" data-skills-mob-open="${cat.id}">
                  <span class="skills-strip-icon theme-${cat.theme}" aria-hidden="true">${getSkillCatIconSvg(cat.id)}</span>
                  <div class="skills-mob-cat-copy">
                    <strong>${cat.shortLabel}</strong>
                    <span>${cat.evidenceBadge}</span>
                  </div>
                </button>
              `).join("")}
            </div>
          `);
        }
        if (mobDrillWrap && mobOverviewWrap) {
          if (mobileSkillDrilldownId) {
            mobDrillWrap.hidden = false;
            mobDrillWrap.innerHTML = renderSkillsMobileDrilldownHtml();
            mobOverviewWrap.hidden = true;
            if (heroEl) heroEl.classList.add("is-mob-drilldown-hidden");
          } else {
            mobDrillWrap.hidden = true;
            mobOverviewWrap.hidden = false;
            if (heroEl) heroEl.classList.remove("is-mob-drilldown-hidden");
          }
        }
      });
    }

    function buildSkillsWorkbenchBodyHtml(isHomeEmbedded) {
      const detailIdAttr = isHomeEmbedded ? 'id="home-skills-expanded-detail"' : 'id="skills-expanded-detail"';
      return `
        <!-- Desktop & Tablet Unified Dark-Glass Capability Explorer -->
        <div class="skills-desktop-workbench ${isHomeEmbedded ? "is-home-embedded" : ""}">
          <div class="skills-workbench-card">
            <!-- Left Sidebar: Skills Explorer -->
            <aside class="skills-explorer-sidebar" aria-label="Skills Explorer filters">
              <h2 class="skills-explorer-title">Skills Explorer</h2>
              <div class="skills-search-box">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3 3"/></svg>
                <input type="search" data-skills-search placeholder="Search skills, tools, or keywords..." aria-label="Search skills, tools, or keywords">
              </div>
              <nav class="skills-filter-nav" aria-label="Skill category filters">
                <button type="button" class="skills-filter-btn is-active" data-skills-filter="all" aria-pressed="true">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="6" height="6" rx="1.4"/><rect x="11" y="3" width="6" height="6" rx="1.4"/><rect x="3" y="11" width="6" height="6" rx="1.4"/><rect x="11" y="11" width="6" height="6" rx="1.4"/></svg>
                  <span>All Capabilities</span>
                </button>
                <button type="button" class="skills-filter-btn" data-skills-filter="technical" aria-pressed="false">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6.5 6.5-3.5 3.5 3.5 3.5M13.5 6.5l3.5 3.5-3.5 3.5M11 4.5l-2 11"/></svg>
                  <span>Technical</span>
                </button>
                <button type="button" class="skills-filter-btn" data-skills-filter="domain" aria-pressed="false">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 2.5 16 5v4.5c0 4-2.6 7-6 8.2-3.4-1.2-6-4.2-6-8.2V5l6-2.5Z"/></svg>
                  <span>Domain / Insurance</span>
                </button>
                <button type="button" class="skills-filter-btn" data-skills-filter="tools" aria-pressed="false">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="14" height="12" rx="2"/><path d="M3 8h14M7 12h3"/></svg>
                  <span>Tools &amp; Platforms</span>
                </button>
                <button type="button" class="skills-filter-btn" data-skills-filter="soft" aria-pressed="false">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="7.5" cy="7" r="2.5"/><circle cx="13" cy="8" r="2"/><path d="M3 16v-1.2a4.2 4.2 0 0 1 8.4 0V16"/><path d="M12 16v-1a3.2 3.2 0 0 1 5.5-2.2"/></svg>
                  <span>Business &amp; Delivery</span>
                </button>
                <button type="button" class="skills-filter-btn" data-skills-filter="map" aria-pressed="false">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10" cy="4.5" r="2"/><circle cx="4.5" cy="14.5" r="2"/><circle cx="15.5" cy="14.5" r="2"/><path d="M8.8 6.2 5.6 12.8M11.2 6.2l3.2 6.6M6.5 14.5h7"/></svg>
                  <span>Capability Map</span>
                </button>
                <button type="button" class="skills-filter-btn" data-skills-filter="timeline" aria-pressed="false">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="4" cy="10" r="2"/><circle cx="10" cy="10" r="2"/><circle cx="16" cy="10" r="2"/><path d="M6 10h2M12 10h2"/></svg>
                  <span>Career Timeline</span>
                </button>
              </nav>

              <div class="skills-sidebar-talk-box">
                <span class="skills-talk-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0 0 12 2Z"/></svg>
                </span>
                <div>
                  <p>Looking for a specific skill or technology?</p>
                  <a class="skills-talk-link" href="#home-connect" data-home-focus-contact>Let&rsquo;s Talk &rarr;</a>
                </div>
              </div>

              <a class="skills-pdf-btn" href="resume.html">
                <span>Tailored R&eacute;sum&eacute;</span>
                <span aria-hidden="true">&rarr;</span>
              </a>
            </aside>

            <!-- Right Main Area: Skill Categories / Map / Timeline -->
            <div class="skills-categories-main">
              <div class="skills-categories-header">
                <div>
                  <h2>Skill Categories</h2>
                  <p>Explore my skills by category. Select any category to inspect tools, case studies and real examples.</p>
                </div>
                <div class="skills-view-toggle-wrap">
                  <span class="skills-view-label">View as:</span>
                  <div class="skills-view-toggle" role="tablist" aria-label="Capability Explorer view mode">
                    <button type="button" role="tab" aria-selected="true" class="skills-view-btn is-active" data-skills-view="cards">Cards</button>
                    <button type="button" role="tab" aria-selected="false" class="skills-view-btn" data-skills-view="map">Map</button>
                    <button type="button" role="tab" aria-selected="false" class="skills-view-btn" data-skills-view="timeline">Timeline</button>
                  </div>
                </div>
              </div>

              <div data-skills-main-container>
                ${renderSkillsMainContainerHtml()}
              </div>
            </div>
          </div>

          <!-- Section 3: Applied Experience / Detail View (Category Expanded) -->
          <section class="skills-expanded-detail-card" ${detailIdAttr} data-skills-expanded-detail data-skills-expanded-panel aria-live="polite">
            ${renderSkillsExpandedDetailHtml()}
          </section>
        </div>

        <!-- Mobile Responsive Workbench (<= 768px) -->
        <div class="skills-mobile-workbench ${isHomeEmbedded ? "is-home-embedded" : ""}">
          <div data-skills-mob-overview-wrap>
            <section class="skills-mob-card">
              <div class="skills-mob-card-head">
                <h2>Capability Explorer</h2>
                <div class="skills-view-toggle is-mobile-toggle" role="tablist" aria-label="Mobile capability view mode">
                  <button type="button" role="tab" aria-selected="${activeSkillViewMode === "cards" ? "true" : "false"}" class="skills-view-btn ${activeSkillViewMode === "cards" ? "is-active" : ""}" data-skills-view="cards">Cards</button>
                  <button type="button" role="tab" aria-selected="${activeSkillViewMode === "map" ? "true" : "false"}" class="skills-view-btn ${activeSkillViewMode === "map" ? "is-active" : ""}" data-skills-view="map">Map</button>
                  <button type="button" role="tab" aria-selected="${activeSkillViewMode === "timeline" ? "true" : "false"}" class="skills-view-btn ${activeSkillViewMode === "timeline" ? "is-active" : ""}" data-skills-view="timeline">Timeline</button>
                </div>
              </div>
              <div class="skills-mob-main-slot" data-skills-mob-main-slot>
                ${activeSkillViewMode === "map" ? renderCapabilityMapHtml() : (activeSkillViewMode === "timeline" ? renderCapabilityTimelineHtml() : `
                  <div class="skills-mob-cat-pills-grid">
                    ${SKILL_CATEGORIES.map(cat => `
                      <button type="button" class="skills-mob-cat-btn ${cat.id === activeSkillCategory ? "is-active" : ""}" data-skills-mob-open="${cat.id}">
                        <span class="skills-strip-icon theme-${cat.theme}" aria-hidden="true">${getSkillCatIconSvg(cat.id)}</span>
                        <div class="skills-mob-cat-copy">
                          <strong>${cat.shortLabel}</strong>
                          <span>${cat.evidenceBadge}</span>
                        </div>
                      </button>
                    `).join("")}
                  </div>
                `)}
              </div>
            </section>
          </div>

          <div data-skills-mob-drill-wrap hidden></div>
        </div>
      `;
    }

    const homeSkillsHeroEl = document.querySelector("[data-home-skills-hero]");
    if (homeSkillsHeroEl) {
      homeSkillsHeroEl.innerHTML = buildHomeSkillsHeroHtml();
    }

    const homeSkillsWorkbenchEl = document.querySelector("[data-home-skills-workbench]");
    if (homeSkillsWorkbenchEl) {
      homeSkillsWorkbenchEl.innerHTML = "";
      homeSkillsWorkbenchEl.hidden = true;
    }

    if (homeSection) {
      animateSkillProgressBars(homeSection);
    }

    if (mainContentEl && !skillsPageSection) {
      skillsPageSection = document.createElement("section");
      skillsPageSection.className = "page";
      skillsPageSection.setAttribute("data-page", "skills");
      skillsPageSection.hidden = true;
      skillsPageSection.innerHTML = `
        <div class="skills-page-workbench">
          <header class="skills-page-hero">
            <div class="skills-hero-bg-layer" aria-hidden="true">
              <img src="assets/career-dark-3floor-hero.jpg" alt="">
              <div class="skills-hero-scrim"></div>
            </div>

            <div class="skills-page-hero-inner">
              <div class="compact-skills-showcase is-skills-page-showcase">
                <div class="skills-page-hero-grid is-unified-skills-hero">
                  <!-- Left Column: Section 1 Hero Narrative -->
                  <div class="skills-hero-copy-col">
                    <p class="skills-page-eyebrow">04 / SKILLS &amp; CAPABILITY ARCHITECTURE</p>
                    <h1 class="skills-page-headline" tabindex="-1">
                      <span class="skills-hl-white">The systems behind</span>
                      <span class="skills-hl-gold">the solutions.</span>
                    </h1>
                    <p class="skills-page-lead">Explore the capabilities, tools, domain knowledge, and practical experience I bring together to solve complex problems.</p>
                    <div class="skills-page-ctas">
                      <a class="home-skills-gold-cta" href="#projects">
                        <span>Explore Case Studies</span>
                        <span aria-hidden="true">&rarr;</span>
                      </a>
                      <a class="skills-cta-secondary" href="#career">
                        <span class="skills-play-badge" aria-hidden="true">
                          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 4.2v7.6L12 8 5.5 4.2z"/></svg>
                        </span>
                        <span>See Career Journey</span>
                      </a>
                    </div>
                  </div>

                  <!-- Center Column: 6 Compact 3x2 Capability Cards -->
                  <div class="skills-page-hero-cards-col">
                    ${renderTopCapabilityCardsHtml(false)}
                  </div>

                  <!-- Right Column: Shared Interactive Capability Stack -->
                  <div class="skills-page-hero-stack-col">
                    ${renderInteractiveCapabilityStackHtml("page")}
                  </div>
                </div>

                <!-- 4-State Compact Bottom Dock -->
                <div class="compact-skills-dock" data-compact-skills-dock aria-live="polite">
                  ${renderCompactSkillsDockHtml()}
                </div>
              </div>
            </div>
          </header>

          <div class="skills-body-wrap">
            ${buildSkillsWorkbenchBodyHtml(false)}
          </div>
        </div>
      `;
      mainContentEl.append(skillsPageSection);
    }

    // 4E. Build Dedicated About Page Workbench (#about -> section[data-page="about"])
    const aboutPageSection = document.querySelector('section[data-page="about"]');
    let activeAboutLightboxIdx = -1;
    let lastAboutLightboxTrigger = null;

    const canonicalNexus = PROJECTS_BY_SLUG["nexus"] || {
      slug: "nexus",
      title: "NEXUS — AI Orchestration Platform",
      href: "#projects/nexus"
    };

    const ABOUT_PAGE_DATA = Object.freeze({
      hero: {
        eyebrow: "ABOUT ME",
        headline: [
          { text: "Curious by nature.", cls: "about-hl-white" },
          { text: "Builder at heart.", cls: "about-hl-cyan" },
          { text: "Always learning.", cls: "about-hl-gold" }
        ],
        introduction:
          "I'm a technology generalist who likes getting close to the real problem—understanding the people, the systems and the details that make a solution work. My experience spans 20+ years across hands-on infrastructure, insurance systems, integration and enterprise analysis. Today, I also build independent AI-powered tools that bring those lessons together.",
        portraitSrc: "assets/personal/josh-portrait-vest.jpg",
        portraitAlt: "Portrait of Josh Boyer in a navy vest and plaid shirt.",
        portraitCaption: "Ottawa, Ontario",
        motifs: [
          {
            id: "clouds",
            title: "Building in the cloud.",
            sub: "AI orchestration, modern platforms and practical solutions.",
            theme: "clouds"
          },
          {
            id: "business",
            title: "Shaped by the business.",
            sub: "Insurance systems, real problems and measurable impact.",
            theme: "business"
          },
          {
            id: "metal",
            title: "Grounded in the metal.",
            sub: "Hardware, infrastructure and real-world systems.",
            theme: "metal"
          }
        ]
      },
      story: [
        {
          id: "systems",
          heading: "Grounded in the metal",
          body: "Started at Dell (Sept 2006) in Gloves Off commercial hardware diagnostics, then grew at Harris (2007–2009) from NOC operations to full server racks, firewalls and Small Business Server swing migrations.",
          linkLabel: "Explore Career timeline",
          linkHref: "#career"
        },
        {
          id: "business",
          heading: "Shaped by the business",
          body: "Across Grenville Mutual (2009–2022) and Medavie Blue Cross (2022–present), connected headquarters infrastructure, P&C underwriting and renewal rules, broker integrations, health/dental claims data and reporting continuity.",
          linkLabel: "Selected case studies",
          linkHref: "#projects"
        },
        {
          id: "building",
          heading: "Building in the cloud",
          body: "Independently designing and building <strong>NEXUS</strong> — an actively evolving AI orchestration platform combining scoped context compilation, constraint-aware model routing and human-reviewed execution.",
          linkLabel: "Read the NEXUS case study",
          linkHref: "#projects/nexus"
        }
      ],
      quickFacts: [
        {
          id: "location",
          icon: "pin",
          label: "Location",
          value: "Ottawa, Ontario, Canada"
        },
        {
          id: "experience",
          icon: "briefcase",
          label: "Experience",
          value: "20+ years in technology · Since Sept 2006"
        },
        {
          id: "domain",
          icon: "shield",
          label: "Insurance",
          value: "P&C and health/dental · Since 2009"
        },
        {
          id: "focus",
          icon: "target",
          label: "Focus",
          value: "Solution design, integration, SQL & AI"
        },
        {
          id: "style",
          icon: "users",
          label: "Work style",
          value: "Hands-on, collaborative, always learning"
        },
        {
          id: "currently",
          icon: "bolt",
          label: "Currently",
          value: "Functional Analyst · Building NEXUS"
        }
      ],
      principles: [
        {
          id: "problem",
          icon: "target",
          theme: "rose",
          title: "Understand the real problem",
          explanation: "Investigate the actual consumer, dependency or failure rather than stopping at the initial request."
        },
        {
          id: "connect",
          icon: "book",
          theme: "blue",
          title: "Connect business and implementation",
          explanation: "Preserve business meaning across requirements, interfaces and systems."
        },
        {
          id: "people",
          icon: "users",
          theme: "green",
          title: "Build for the people using it",
          explanation: "Make correction, referral, operational support and handoffs usable."
        },
        {
          id: "making",
          icon: "spark",
          theme: "amber",
          title: "Keep learning by making",
          explanation: "Apply experience to independent builds, physical fabrication and AI experiments."
        }
      ],
      personal: [
        {
          id: "apex",
          title: "Apex monitor riser",
          tag: "Workshop42 · 3D print & wood",
          description: "Printed legs meet a wooden shelf. A practical desktop object shaped around structure, space and everyday use.",
          src: "assets/apex.jpg",
          alt: "Apex monitor riser with black, brown and red printed legs under a wooden shelf",
          href: "https://makerworld.com/en/models/2241447-apex-monitor-riser",
          linkLabel: "View Apex on MakerWorld ↗",
          external: true
        },
        {
          id: "voyager",
          title: "The Voyager canoe model",
          tag: "Workshop42 · Dual-color CAD",
          description: "A dual-color printed floating canoe model exploring shape, construction and the pleasure of making.",
          src: "assets/voyager.jpg",
          alt: "Red and yellow Voyager canoe models with white gunwales and seats",
          href: "https://makerworld.com/en/models/1758264-the-voyager-a-floating-canoe-model-quick-print",
          linkLabel: "View Voyager on MakerWorld ↗",
          external: true
        },
        {
          id: "algonquin",
          title: "Barron Canyon · Algonquin",
          tag: "Architecture notes outdoors",
          description: "Stepping away from the desk to sketch agent harnesses, workflow diagrams and system architecture.",
          src: "assets/personal/barron-canyon-about.png",
          alt: "Josh seated with notes and a laptop in a Barron Canyon composition.",
          href: "#projects/nexus",
          linkLabel: "Explore NEXUS architecture →",
          external: false
        },
        {
          id: "bonecho",
          title: "Joe Perry Lake · Bon Echo",
          tag: "Ontario canoe country",
          description: "Canoeing and quiet reflection in Ontario's backcountry parks — the real-world inspiration behind the Voyager model.",
          src: "assets/footer/Joe-Perry-Lake-footer-one-sun.png",
          alt: "Canoe resting on the shore of Joe Perry Lake in Bon Echo at sunset",
          href: "https://ws42.ca",
          linkLabel: "Visit Workshop42 (ws42.ca) ↗",
          external: true
        }
      ],
      explorations: [
        { icon: "cpu", text: "Multi-agent AI orchestration & context compilation (NEXUS)" },
        { icon: "mic", text: "Local on-device speech recognition (LOWKEY · Rust/Tauri & Android IME)" },
        { icon: "cube", text: "CAD modeling, woodworking & 3D fabrication at Workshop42" },
        { icon: "db", text: "Tracing legacy SQL, XML & flat-file ETL dependencies" },
        { icon: "compass", text: "Backcountry canoeing in Algonquin & Bon Echo" }
      ],
      lookingFor: [
        {
          icon: "bulb",
          title: "Interesting problems",
          desc: "Complex systems, integration and solution architecture with real-world impact."
        },
        {
          icon: "team",
          title: "Collaborative teams",
          desc: "People who value practical solutions, clear requirements and shared ownership."
        },
        {
          icon: "growth",
          title: "Growth and learning",
          desc: "Forward-deployed, hands-on work connecting business context with modern AI and software."
        }
      ],
      currentFocus: {
        projectId: canonicalNexus.slug,
        title: "NEXUS",
        subtitle: "Independent AI orchestration platform · Active development",
        summary:
          "Independently designing and building NEXUS in active development — implementing scoped context compilation, constraint-aware model routing, separated plan/review/execution and recoverable Node.js execution.",
        caseHref: canonicalNexus.href || "#projects/nexus",
        liveHref: "https://run.nexus/"
      }
    });

    function getAboutFactIconSvg(type) {
      if (type === "pin") {
        return `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 17.5s-5.5-4.6-5.5-9.2a5.5 5.5 0 1 1 11 0c0 4.6-5.5 9.2-5.5 9.2Z"/><circle cx="10" cy="8.3" r="2"/></svg>`;
      }
      if (type === "briefcase") {
        return `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.8" y="6" width="14.4" height="10.5" rx="2"/><path d="M7 6V4.5A1.5 1.5 0 0 1 8.5 3h3A1.5 1.5 0 0 1 13 4.5V6M2.8 10.5h14.4"/></svg>`;
      }
      if (type === "shield") {
        return `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 2.5 16 5v4.5c0 4-2.6 7-6 8.2-3.4-1.2-6-4.2-6-8.2V5l6-2.5Z"/><path d="m7.5 10 1.8 1.8 3.4-3.4"/></svg>`;
      }
      if (type === "target") {
        return `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="3.5"/><circle cx="10" cy="10" r="1" fill="currentColor"/></svg>`;
      }
      if (type === "users") {
        return `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="7.5" cy="7" r="2.6"/><circle cx="13.2" cy="7.8" r="2.1"/><path d="M2.8 16.2v-1.2a4.4 4.4 0 0 1 8.8 0v1.2"/><path d="M12.2 16.2v-1a3.4 3.4 0 0 1 5 0v1"/></svg>`;
      }
      if (type === "bolt") {
        return `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 2.5 4.8 11h4.6l-.9 6.5L15.2 9h-4.6L11 2.5Z"/></svg>`;
      }
      if (type === "book") {
        return `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 4.5A2.5 2.5 0 0 1 5.5 2H10v14H5.5A2.5 2.5 0 0 0 3 18.5v-14Zm14 0A2.5 2.5 0 0 0 14.5 2H10v14h4.5a2.5 2.5 0 0 1 2.5 2.5v-14Z"/></svg>`;
      }
      if (type === "spark") {
        return `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m10 2.5 1.9 4.8 4.8 1.9-4.8 1.9-1.9 4.8-1.9-4.8-4.8-1.9 4.8-1.9L10 2.5Z"/></svg>`;
      }
      if (type === "cpu") {
        return `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="5" width="10" height="10" rx="2"/><path d="M8 2.5v2.5M12 2.5v2.5M8 15v2.5M12 15v2.5M2.5 8H5M2.5 12H5M15 8h2.5M15 12h2.5"/></svg>`;
      }
      if (type === "mic") {
        return `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="7.2" y="2.8" width="5.6" height="9" rx="2.8"/><path d="M4.8 9.5a5.2 5.2 0 0 0 10.4 0M10 14.8v2.7M7 17.5h6"/></svg>`;
      }
      if (type === "cube") {
        return `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 2.5 16.5 6v8L10 17.5 3.5 14V6L10 2.5Z"/><path d="M3.5 6 10 9.6 16.5 6M10 9.6v7.9"/></svg>`;
      }
      if (type === "tool") {
        return `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12.5 6.2a3.8 3.8 0 0 0 4.5 4.5l-6.6 6.6a1.8 1.8 0 0 1-2.5-2.5l6.6-6.6a3.8 3.8 0 0 0-2-2Z"/></svg>`;
      }
      if (type === "db") {
        return `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><ellipse cx="10" cy="5" rx="6" ry="2.4"/><path d="M4 5v10c0 1.3 2.7 2.4 6 2.4s6-1.1 6-2.4V5"/><path d="M4 10c0 1.3 2.7 2.4 6 2.4s6-1.1 6-2.4"/></svg>`;
      }
      return `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10" cy="10" r="7.2"/><path d="m12.8 7.2-1.8 4.6-4.6 1.8 1.8-4.6 4.6-1.8Z"/></svg>`;
    }

    if (aboutPageSection && !aboutPageSection.querySelector(".about-page-workbench")) {
      // Preserve existing static children in hidden container so nothing is lost
      Array.from(aboutPageSection.children).forEach(child => {
        child.hidden = true;
      });

      const aboutWorkbench = document.createElement("div");
      aboutWorkbench.className = "about-page-workbench";
      aboutWorkbench.innerHTML = `
        <!-- 2.2 Full-Bleed Dark Editorial Hero -->
        <header class="about-hero">
          <div class="about-hero-backdrop" aria-hidden="true">
            <img src="assets/personal/josh-about-skyline-bg.jpg" alt="">
            <div class="about-hero-scrim"></div>
          </div>

          <div class="about-hero-inner">
            <!-- Left Column: Seamless Portrait Zone on Desktop / Top Banner on Mobile -->
            <figure class="about-hero-portrait-card">
              <div class="about-hero-portrait-frame">
                <img
                  src="${ABOUT_PAGE_DATA.hero.portraitSrc}"
                  alt="${ABOUT_PAGE_DATA.hero.portraitAlt}"
                  width="223"
                  height="323"
                  fetchpriority="high"
                >
              </div>
            </figure>

            <!-- Center Column: Headline, Approved First-Person Intro & Working CTAs -->
            <div class="about-hero-copy">
              <p class="about-hero-eyebrow">${ABOUT_PAGE_DATA.hero.eyebrow}</p>
              <h1 class="about-hero-headline" tabindex="-1">
                ${ABOUT_PAGE_DATA.hero.headline.map(line => `<span class="${line.cls}">${line.text}</span>`).join("")}
              </h1>
              <p class="about-hero-lead">${ABOUT_PAGE_DATA.hero.introduction}</p>
              <div class="about-hero-ctas">
                <a class="about-btn-primary" href="#about-connect" data-about-scroll-connect>
                  <span>Let's Connect</span>
                  <span aria-hidden="true">&rarr;</span>
                </a>
                <a class="about-btn-secondary" href="resume.html">
                  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path d="M9 3v8.5m0 0-3-3m3 3 3-3M3.5 14.5h11"/></svg>
                  <span>Tailored R&eacute;sum&eacute;</span>
                </a>
                <a class="about-btn-tertiary" href="#projects">
                  <span>Explore my work</span>
                  <span aria-hidden="true">&rarr;</span>
                </a>
              </div>
            </div>

            <!-- Right Column: Compact Supporting Motif Rail Card (matching 3-floor architectural order) -->
            <aside class="about-hero-motif-rail" aria-label="Three-part career signature">
              <div class="about-motif-card">
                <div class="about-motif-row motif-clouds">
                  <span class="about-motif-icon icon-clouds" aria-hidden="true">
                    <svg viewBox="0 0 36 28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 23h16.5a5.5 5.5 0 0 0 .9-10.9A7.5 7.5 0 0 0 13 9.2 6 6 0 0 0 10 21"/></svg>
                  </span>
                  <div class="about-motif-text">
                    <strong>Building in the cloud.</strong>
                    <span>AI orchestration, modern platforms and practical solutions.</span>
                  </div>
                </div>

                <div class="about-motif-row motif-business">
                  <span class="about-motif-icon icon-business" aria-hidden="true">
                    <svg viewBox="0 0 36 28" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="9" r="3.6"/><circle cx="10" cy="11.5" r="2.8"/><circle cx="26" cy="11.5" r="2.8"/><path d="M11.5 22v-1.8a5.5 5.5 0 0 1 13 0V22"/><path d="M5 22v-1.2a4.2 4.2 0 0 1 5.5-4"/><path d="M31 22v-1.2a4.2 4.2 0 0 0-5.5-4"/></svg>
                  </span>
                  <div class="about-motif-text">
                    <strong>Shaped by the business.</strong>
                    <span>Insurance systems, real problems and measurable impact.</span>
                  </div>
                </div>

                <div class="about-motif-row motif-metal">
                  <span class="about-motif-icon icon-metal" aria-hidden="true">
                    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="24" height="6.5" rx="1.8"/><rect x="4" y="12.8" width="24" height="6.5" rx="1.8"/><rect x="4" y="21.5" width="24" height="6.5" rx="1.8"/><circle cx="8.5" cy="7.2" r="1" fill="currentColor"/><circle cx="8.5" cy="16" r="1" fill="currentColor"/><circle cx="8.5" cy="24.8" r="1" fill="currentColor"/><path d="M14 7.2h9M14 16h9M14 24.8h9"/></svg>
                  </span>
                  <div class="about-motif-text">
                    <strong>Grounded in the metal.</strong>
                    <span>Hardware, infrastructure and real-world systems.</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </header>

        <!-- Below-the-Fold Editorial Bento Grid -->
        <div class="about-body-wrap">
          <!-- ROW 1: My Story | Same Curiosity. Bigger Tools. | Quick Facts -->
          <div class="about-grid-row1">
            <!-- 2.3 My Story -->
            <section class="about-card about-story-card" aria-labelledby="about-story-heading">
              <div class="about-card-header">
                <span class="about-header-icon icon-blue" aria-hidden="true">
                  <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M3 5a2.5 2.5 0 0 1 2.5-2.5H11v15H5.5A2.5 2.5 0 0 0 3 20V5Zm16 0a2.5 2.5 0 0 0-2.5-2.5H11v15h5.5A2.5 2.5 0 0 1 19 20V5Z"/></svg>
                </span>
                <h2 id="about-story-heading">My story</h2>
              </div>

              <div class="about-story-blocks">
                ${ABOUT_PAGE_DATA.story.map(block => `
                  <div class="about-story-block">
                    <p><strong>${block.heading}:</strong> ${block.body}</p>
                    <a class="about-inline-link" href="${block.linkHref}">${block.linkLabel} <span aria-hidden="true">&rarr;</span></a>
                  </div>
                `).join("")}
              </div>
            </section>

            <!-- Center Visual Feature: Same curiosity. Bigger tools. -->
            <section class="about-card about-visual-feature-card" aria-label="From systems foundations to AI orchestration">
              <div class="about-visual-stage">
                <img src="assets/proj-banner-nexus.jpg" alt="Dual-monitor software architecture and NEXUS orchestration setup" loading="lazy">
                <div class="about-visual-screen-n" aria-hidden="true">
                  <span>N</span>
                </div>
                <div class="about-visual-overlay">
                  <span class="about-visual-kicker">Editorial Synthesis &middot; Systems to Solutions</span>
                  <h3>Same curiosity. Bigger tools.</h3>
                  <p>From hardware diagnostics and local servers to enterprise insurance integration and governed AI orchestration &mdash; the goal is still solving the real problem.</p>
                </div>
              </div>
            </section>

            <!-- Quick Facts -->
            <aside class="about-card about-facts-card" aria-labelledby="about-facts-heading">
              <div class="about-card-header">
                <span class="about-header-icon icon-blue" aria-hidden="true">
                  <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="11" cy="7.5" r="3.5"/><path d="M4.5 19v-1.5a6.5 6.5 0 0 1 13 0V19"/></svg>
                </span>
                <h2 id="about-facts-heading">Quick facts</h2>
              </div>

              <dl class="about-facts-list">
                ${ABOUT_PAGE_DATA.quickFacts.map(fact => `
                  <div class="about-fact-row">
                    <dt>
                      <span class="about-fact-icon" aria-hidden="true">${getAboutFactIconSvg(fact.icon)}</span>
                      <span>${fact.label}</span>
                    </dt>
                    <dd>${fact.value}</dd>
                  </div>
                `).join("")}
              </dl>
            </aside>
          </div>

          <!-- ROW 2: What Drives Me (2x2 Principles) | Outside of Work (Workshop42 Lightbox Gallery) | What I Enjoy Exploring -->
          <div class="about-grid-row2">
            <!-- 2.4 Principles / What drives me -->
            <section class="about-card about-drives-card" aria-labelledby="about-drives-heading">
              <div class="about-card-header">
                <span class="about-header-icon icon-rose" aria-hidden="true">
                  <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M11 19s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 18 9c0 5.4-7 10-7 10Z"/></svg>
                </span>
                <h2 id="about-drives-heading">What drives me</h2>
              </div>

              <div class="about-principles-grid">
                ${ABOUT_PAGE_DATA.principles.map(p => `
                  <article class="about-principle-box theme-${p.theme}">
                    <span class="about-principle-icon theme-${p.theme}" aria-hidden="true">${getAboutFactIconSvg(p.icon)}</span>
                    <h3>${p.title}</h3>
                    <p>${p.explanation}</p>
                  </article>
                `).join("")}
              </div>
            </section>

            <!-- 2.5 Outside of work (Workshop42 & Authentic Corpus Photos) -->
            <section class="about-card about-outside-card" aria-labelledby="about-outside-heading">
              <div class="about-card-header about-card-header--split">
                <div class="about-card-header-left">
                  <span class="about-header-icon icon-blue" aria-hidden="true">
                    <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.9"><path d="m3 18 5.5-8 4 5.5 3-4L19 18H3Z"/><circle cx="15.5" cy="6.5" r="2"/></svg>
                  </span>
                  <h2 id="about-outside-heading">Outside of work</h2>
                </div>
                <a class="about-ws42-badge" href="https://ws42.ca" target="_blank" rel="noopener noreferrer">
                  <span>Workshop42 &middot; ws42.ca</span>
                  <span aria-hidden="true">&#8599;</span>
                  <span class="sr-only"> (opens in a new tab)</span>
                </a>
              </div>

              <div class="about-gallery-strip" role="list" aria-label="Workshop42 making projects and Ontario outdoors">
                ${ABOUT_PAGE_DATA.personal.map((item, idx) => `
                  <button
                    type="button"
                    class="about-gallery-item"
                    data-about-lightbox-open="${idx}"
                    aria-label="Inspect photo: ${item.title}"
                  >
                    <img src="${item.src}" alt="${item.alt}" loading="lazy">
                    <span class="about-gallery-caption">
                      <strong>${item.title}</strong>
                      <small>${item.tag}</small>
                    </span>
                  </button>
                `).join("")}
              </div>

              <div class="about-outside-footer">
                <p>Physical design, 3D printing and woodworking projects at <a href="https://ws42.ca" target="_blank" rel="noopener noreferrer">Workshop42<span class="sr-only"> (opens in a new tab)</span></a>, alongside time outdoors in Ontario canoe country.</p>
                <a class="about-inline-link" href="#projects/workshop42">View Workshop42 case study <span aria-hidden="true">&rarr;</span></a>
              </div>
            </section>

            <!-- Hands-on Explorations (Corpus-verified list) -->
            <section class="about-card about-enjoy-card" aria-labelledby="about-enjoy-heading">
              <div class="about-card-header">
                <span class="about-header-icon icon-blue" aria-hidden="true">
                  <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="5" width="16" height="12" rx="3"/><path d="M7.5 11h3M9 9.5v3M13.5 10h.01M15.5 12h.01"/></svg>
                </span>
                <h2 id="about-enjoy-heading">A few things I enjoy</h2>
              </div>

              <ul class="about-enjoy-list">
                ${ABOUT_PAGE_DATA.explorations.map(item => `
                  <li>
                    <span class="about-enjoy-icon" aria-hidden="true">${getAboutFactIconSvg(item.icon)}</span>
                    <span>${item.text}</span>
                  </li>
                `).join("")}
              </ul>
            </section>
          </div>

          <!-- ROW 3: Let's Connect | What I'm Looking For | Current Focus (NEXUS) -->
          <div class="about-grid-row3" id="about-connect">
            <!-- 2.7 Contact / Let's connect -->
            <section class="about-card about-connect-card" aria-labelledby="about-connect-heading">
              <div class="about-card-header">
                <span class="about-header-icon icon-blue" aria-hidden="true">
                  <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M4 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H8l-4.5 3v-3H4A1.5 1.5 0 0 1 2.5 15V7A1.5 1.5 0 0 1 4 5.5Z"/></svg>
                </span>
                <h2 id="about-connect-heading">Have a problem worth solving? Let's talk.</h2>
              </div>

              <p class="about-connect-copy">I'm always open to conversations about technical solutions architecture, forward-deployed engineering, insurance systems, data integration or where practical AI is headed next.</p>

              <div class="about-connect-actions">
                <a class="about-connect-btn-primary" href="resume.html">
                  <span>Build a Tailored R&eacute;sum&eacute;</span>
                  <span aria-hidden="true">&rarr;</span>
                </a>
                <a class="about-connect-btn-secondary" href="#projects">
                  <span>Explore Case Studies</span>
                  <span aria-hidden="true">&rarr;</span>
                </a>
              </div>
            </section>

            <!-- What I'm looking for -->
            <section class="about-card about-looking-card" aria-labelledby="about-looking-heading">
              <div class="about-card-header">
                <span class="about-header-icon icon-blue" aria-hidden="true">
                  <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="7" cy="14" r="3.2"/><circle cx="15" cy="14" r="3.2"/><path d="M7 10.8V6.5a1.5 1.5 0 0 1 3 0v4.3M15 10.8V6.5a1.5 1.5 0 0 0-3 0v4.3M10 9.5h2"/></svg>
                </span>
                <h2 id="about-looking-heading">What I'm looking for</h2>
              </div>

              <div class="about-looking-grid">
                ${ABOUT_PAGE_DATA.lookingFor.map(item => `
                  <article class="about-looking-item">
                    <span class="about-looking-icon" aria-hidden="true">
                      ${item.icon === "bulb"
                        ? `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7.5 14.5h5M8.2 17h3.6M10 2.5a5.5 5.5 0 0 0-3.2 10c.5.4.8 1 .8 1.6h4.8c0-.6.3-1.2.8-1.6a5.5 5.5 0 0 0-3.2-10Z"/></svg>`
                        : item.icon === "team"
                        ? `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="7.5" cy="7" r="2.5"/><circle cx="13" cy="7.5" r="2"/><path d="M3 16v-1.2a4.2 4.2 0 0 1 8.4 0V16"/><path d="M12 16v-1a3.2 3.2 0 0 1 5 0v1"/></svg>`
                        : `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 16.5h14M5.5 14l3.5-3.5 2.5 2.5 4-4.5M12.5 8.5h3v3"/></svg>`
                      }
                    </span>
                    <div class="about-looking-text">
                      <h3>${item.title}</h3>
                      <p>${item.desc}</p>
                    </div>
                  </article>
                `).join("")}
              </div>
            </section>

            <!-- 2.6 Currently exploring (Canonical NEXUS reference) -->
            <section class="about-card about-focus-card" aria-labelledby="about-focus-heading">
              <div class="about-card-header">
                <span class="about-header-icon icon-blue" aria-hidden="true">
                  <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="11" cy="11" r="3"/><path d="M11 2.5v2.2M11 17.3v2.2M2.5 11h2.2M17.3 11h2.2M5 5l1.6 1.6M15.4 15.4 17 17M17 5l-1.6 1.6M6.6 15.4 5 17"/></svg>
                </span>
                <h2 id="about-focus-heading">Current focus</h2>
              </div>

              <p class="about-focus-copy">${ABOUT_PAGE_DATA.currentFocus.summary}</p>

              <div class="about-focus-links">
                <a class="about-nexus-pill-card" href="${ABOUT_PAGE_DATA.currentFocus.caseHref}">
                  <span class="about-nexus-badge" aria-hidden="true">N</span>
                  <span class="about-nexus-meta">
                    <strong>${ABOUT_PAGE_DATA.currentFocus.title}</strong>
                    <span>${ABOUT_PAGE_DATA.currentFocus.subtitle}</span>
                  </span>
                  <span class="about-nexus-arrow" aria-hidden="true">&rsaquo;</span>
                </a>
                <a class="about-nexus-ext-link" href="${ABOUT_PAGE_DATA.currentFocus.liveHref}" target="_blank" rel="noopener noreferrer">
                  <span>Live destination: run.nexus</span>
                  <span aria-hidden="true">&#8599;</span>
                  <span class="sr-only"> (opens in a new tab)</span>
                </a>
              </div>
            </section>
          </div>
        </div>

        <!-- Accessible Lightbox Modal for Outside of Work Gallery -->
        <div class="about-lightbox-backdrop" data-about-lightbox hidden role="dialog" aria-modal="true" aria-labelledby="about-lb-title">
          <div class="about-lightbox-dialog">
            <div class="about-lightbox-top">
              <div class="about-lightbox-heading">
                <span class="about-lightbox-tag" data-about-lb-tag>Workshop42</span>
                <h3 id="about-lb-title" data-about-lb-title>Apex monitor riser</h3>
              </div>
              <button type="button" class="about-lightbox-close" data-about-lightbox-close aria-label="Close photo viewer">&times;</button>
            </div>
            <div class="about-lightbox-media">
              <button type="button" class="about-lightbox-nav prev" data-about-lightbox-step="-1" aria-label="Previous photo">&lsaquo;</button>
              <img data-about-lb-img src="assets/apex.jpg" alt="">
              <button type="button" class="about-lightbox-nav next" data-about-lightbox-step="1" aria-label="Next photo">&rsaquo;</button>
            </div>
            <div class="about-lightbox-footer">
              <p data-about-lb-desc></p>
              <a class="about-lightbox-link" data-about-lb-link href="https://ws42.ca" target="_blank" rel="noopener noreferrer">Visit Workshop42 &#8599;</a>
            </div>
          </div>
        </div>
      `;
      aboutPageSection.append(aboutWorkbench);
    }

    function updateAboutLightbox(idx) {
      const lb = document.querySelector("[data-about-lightbox]");
      if (!lb) return;
      const total = ABOUT_PAGE_DATA.personal.length;
      if (idx < 0 || idx >= total) {
        lb.hidden = true;
        activeAboutLightboxIdx = -1;
        if (lastAboutLightboxTrigger && typeof lastAboutLightboxTrigger.focus === "function") {
          lastAboutLightboxTrigger.focus();
        }
        return;
      }
      activeAboutLightboxIdx = idx;
      const item = ABOUT_PAGE_DATA.personal[idx];
      lb.hidden = false;
      const img = lb.querySelector("[data-about-lb-img]");
      const title = lb.querySelector("[data-about-lb-title]");
      const tag = lb.querySelector("[data-about-lb-tag]");
      const desc = lb.querySelector("[data-about-lb-desc]");
      const link = lb.querySelector("[data-about-lb-link]");
      if (img) {
        img.src = item.src;
        img.alt = item.alt;
      }
      if (title) title.textContent = item.title;
      if (tag) tag.textContent = item.tag;
      if (desc) desc.textContent = item.description;
      if (link) {
        link.href = item.href;
        link.textContent = item.linkLabel;
        if (item.external) {
          link.setAttribute("target", "_blank");
          link.setAttribute("rel", "noopener noreferrer");
        } else {
          link.removeAttribute("target");
          link.removeAttribute("rel");
        }
      }
      const closeBtn = lb.querySelector("[data-about-lightbox-close]");
      if (closeBtn) closeBtn.focus();
    }

    function syncProjectRouteView() {
      const hash = (window.location.hash || "#home").slice(1).replace(/\/+$/, "");
      const match = /^projects\/([a-z0-9-]+)$/.exec(hash);

      let activeTabId = "home";
      let routeMode = "home";
      if (match && PROJECTS_BY_SLUG[match[1]]) {
        activeTabId = "projects";
        routeMode = "project-detail";
      } else if (hash === "projects") {
        activeTabId = "projects";
        routeMode = "projects";
      } else if (hash === "career") {
        activeTabId = "career";
        routeMode = "career";
      } else if (hash === "skills") {
        activeTabId = "skills";
        routeMode = "skills";
      } else if (hash === "about") {
        activeTabId = "about";
        routeMode = "about";
      }
      document.body.setAttribute("data-active-route", routeMode);
      document.querySelectorAll("[data-mobile-tab]").forEach(a => {
        const isCurrent = a.getAttribute("data-mobile-tab") === activeTabId;
        a.classList.toggle("is-active", isCurrent);
      });

      if (hash === "career") {
        const wasCareerHidden = !careerPageSection || careerPageSection.hidden;
        document.querySelectorAll("[data-page]").forEach(sec => {
          sec.hidden = sec.getAttribute("data-page") !== "career";
        });
        document.querySelectorAll("#primary-nav a").forEach(a => {
          const isCareer = a.getAttribute("href") === "#career" && a.getAttribute("data-nav") === "career";
          a.classList.toggle("active", isCareer);
          if (isCareer) a.setAttribute("aria-current", "page");
          else a.removeAttribute("aria-current");
        });
        if (wasCareerHidden && careerPageSection) {
          animateSkillProgressBars(careerPageSection);
        }
        return;
      } else if (careerPageSection && !careerPageSection.hidden) {
        careerPageSection.hidden = true;
      }

      if (hash === "skills") {
        const wasSkillsHidden = !skillsPageSection || skillsPageSection.hidden;
        const searchParams = new URLSearchParams(window.location.search || "");
        const catParam = searchParams.get("cat");
        const viewParam = searchParams.get("view");
        let needsSkillsRefresh = false;
        if (catParam && SKILL_CATEGORIES.some(c => c.id === catParam)) {
          activeSkillCategory = catParam;
          if (window.matchMedia("(max-width: 768px)").matches) {
            mobileSkillDrilldownId = catParam;
          }
          needsSkillsRefresh = true;
        }
        if (viewParam && ["cards", "map", "timeline"].includes(viewParam)) {
          activeSkillViewMode = viewParam;
          if (viewParam === "map") activeSkillFilter = "map";
          else if (viewParam === "timeline") activeSkillFilter = "timeline";
          else if (activeSkillFilter === "map" || activeSkillFilter === "timeline") activeSkillFilter = "all";
          needsSkillsRefresh = true;
        }
        if (needsSkillsRefresh) {
          refreshSkillsWorkbenchUI();
        }
        document.querySelectorAll("[data-page]").forEach(sec => {
          sec.hidden = sec.getAttribute("data-page") !== "skills";
        });
        document.querySelectorAll("#primary-nav a").forEach(a => {
          const isSkills = a.getAttribute("href") === "#skills" && a.getAttribute("data-nav") === "skills";
          a.classList.toggle("active", isSkills);
          if (isSkills) a.setAttribute("aria-current", "page");
          else a.removeAttribute("aria-current");
        });
        if (wasSkillsHidden && skillsPageSection) {
          animateSkillProgressBars(skillsPageSection);
        }
        return;
      } else if (skillsPageSection && !skillsPageSection.hidden) {
        skillsPageSection.hidden = true;
      }

      if (hash === "about") {
        document.querySelectorAll("#primary-nav a").forEach(a => {
          const isAbout = a.getAttribute("href") === "#about" && !a.hasAttribute("data-extra-nav");
          a.classList.toggle("active", isAbout);
          if (isAbout) a.setAttribute("aria-current", "page");
          else a.removeAttribute("aria-current");
        });
      } else {
        document.querySelectorAll('#primary-nav a[href="#about"]').forEach(a => {
          a.classList.remove("active");
        });
      }

      if (match && PROJECTS_BY_SLUG[match[1]]) {
        const slug = match[1];
        if (detailSection && !detailSection.querySelector(`[data-upgraded-detail="${slug}"]`)) {
          activeDetailTab = "overview";
          renderProjectDetailWorkbench(slug);
        }
      }
    }

    if (detailSection && typeof MutationObserver !== "undefined") {
      const detailObserver = new MutationObserver(() => {
        syncProjectRouteView();
      });
      detailObserver.observe(detailSection, { childList: true, attributes: true, attributeFilter: ["hidden"] });
    }
    window.addEventListener("hashchange", syncProjectRouteView);
    window.addEventListener("popstate", syncProjectRouteView);
    syncProjectRouteView();

    // 5. Quick-Find Command Palette Modal (Ctrl+K)
    const cmdBackdrop = document.createElement("div");
    cmdBackdrop.className = "cmd-palette-backdrop";
    cmdBackdrop.hidden = true;
    cmdBackdrop.innerHTML = `
      <div class="cmd-palette-dialog" role="dialog" aria-modal="true" aria-label="Quick Find">
        <div class="cmd-input-bar">
          <span>Find</span>
          <input type="search" data-cmd-input placeholder="Search experience, case studies, or build a tailored resume..." aria-label="Search portfolio">
          <button type="button" class="xray-drawer-toggle" data-cmd-close>ESC</button>
        </div>
        <ul class="cmd-results" data-cmd-results role="listbox"></ul>
        <div class="cmd-footer">
          <span>↑↓ Navigate · Enter Open · Esc Close</span>
          <span>Josh Boyer — Portfolio Quick Find</span>
        </div>
      </div>
    `;
    document.body.append(cmdBackdrop);

    const cmdInput = cmdBackdrop.querySelector("[data-cmd-input]");
    const cmdResults = cmdBackdrop.querySelector("[data-cmd-results]");

    const CMD_ITEMS = [
      { title: "Build a Tailored Resume", sub: "Generate a role-focused resume from Josh's verified experience", tag: "Resume Builder", url: "resume.html" },
      { title: "Skills & Capabilities Workbench", sub: "Explore Infrastructure, Data, Insurance Domain, AI & Automation, Development & Delivery", tag: "Skills", href: "#skills" },
      { title: "Renewal Eligibility & Underwriting Automation", sub: "Grenville · ~80% residential, ~60% commercial, ~40% farm renewal automation", tag: "Grenville", href: "#projects/renewals" },
      { title: "Broker-Native New Business Integration", sub: "Grenville · Broker inputs, UI specs & rating/underwriting rules", tag: "Grenville", href: "#projects/newbusiness" },
      { title: "Takeover-History XML Loading", sub: "Medavie · Production Excel/VB/XML validation & reconciliation tooling", tag: "Medavie", href: "#projects/takeover" },
      { title: "NEXUS — AI Orchestration Platform", sub: "Active capstone: scoped context, explainable routing, recoverable execution", tag: "Capstone", href: "#projects/nexus" },
      { title: "Claims Reporting & Data Continuity", sub: "Medavie · Legacy daily data feed continuity analysis & design", tag: "Medavie", href: "#projects/continuity" },
      { title: "Headquarters Infrastructure & Systems", sub: "Grenville · Networking, AV, security, cooling, UPS & ESXi transition", tag: "Grenville", href: "#projects/headquarters" },
      { title: "Commercial Quoting & Broker Integration", sub: "Grenville · Broker quoting rules, data transformation & portal messages", tag: "Grenville", href: "#projects/workflows" },
      { title: "Policy-Change Comparison & Validation", sub: "Grenville · Endorsement comparison & context validation", tag: "Grenville", href: "#projects/changes" },
      { title: "Broker Policy Inquiry", sub: "Grenville · Policy, billing, claims & PDF retrieval across systems", tag: "Grenville", href: "#projects/inquiry" },
      { title: "Document Upload into Policy Records", sub: "Grenville · Authenticated external adjuster submission workflow", tag: "Grenville", href: "#projects/upload" },
      { title: "Provider Data for Claims Adjudication", sub: "Medavie · Solution review, field mappings & synchronization requirements", tag: "Medavie", href: "#projects/claims" },
      { title: "Claims SQL & Financial Reconciliation", sub: "Medavie · Hand-written SQL, financial report logic & balancing", tag: "Medavie", href: "#projects/sql" },
      { title: "Small Business Server Swing Migrations", sub: "Harris · Repeatable staged Active Directory & Exchange migrations", tag: "Harris", href: "#projects/foundations" },
      { title: "Dell Latitude & OptiPlex Support", sub: "Dell · Gloves Off hardware diagnosis & first-call resolution focus", tag: "Dell", href: "#projects/dell" },
      { title: "About Josh Boyer & Experience Chronology", sub: "Personal story, background & full career timeline", tag: "About", href: "#about" }
    ];

    function getFilteredCmdItems() {
      const q = (cmdInput?.value || "").trim().toLowerCase();
      if (!q) return CMD_ITEMS;
      return CMD_ITEMS.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.sub.toLowerCase().includes(q) ||
        item.tag.toLowerCase().includes(q)
      );
    }

    function renderCmdResults() {
      const items = getFilteredCmdItems();
      if (cmdSelectedIndex >= items.length) cmdSelectedIndex = 0;
      cmdResults.innerHTML = items.map((item, i) => `
        <li role="option" aria-selected="${i === cmdSelectedIndex}">
          <button type="button" class="cmd-item-btn" aria-selected="${i === cmdSelectedIndex}" data-cmd-idx="${i}">
            <div>
              <span class="cmd-item-title">${item.title}</span>
              <span class="cmd-item-sub">${item.sub}</span>
            </div>
            <span class="cmd-item-tag">${item.tag}</span>
          </button>
        </li>
      `).join("");
    }

    function setCmdOpen(open) {
      cmdOpen = open;
      cmdBackdrop.hidden = !open;
      if (open) {
        cmdSelectedIndex = 0;
        if (cmdInput) {
          cmdInput.value = "";
          renderCmdResults();
          cmdInput.focus();
        }
      } else {
        cmdTriggerBtn?.focus();
      }
    }

    function executeCmdItem(item) {
      if (!item) return;
      setCmdOpen(false);
      if (item.action) {
        item.action();
      } else if (item.url) {
        window.location.href = item.url;
      } else if (item.href) {
        window.location.hash = item.href;
      }
    }

    function syncChronoFilterPills() {
      document.querySelectorAll("[data-chrono-type]").forEach(btn => {
        const t = btn.getAttribute("data-chrono-type") || "all";
        const isActive = t === "all" ? (activeChronoType === "all" && !activeChronoTopic) : activeChronoType === t;
        btn.classList.toggle("is-active", isActive);
      });
      document.querySelectorAll("[data-chrono-topic]").forEach(btn => {
        const top = btn.getAttribute("data-chrono-topic") || "";
        btn.classList.toggle("is-active", Boolean(activeChronoTopic) && activeChronoTopic === top);
      });
    }

    document.addEventListener("click", event => {
      const target = event.target?.closest ? event.target : event.target?.parentElement;
      if (!target) return;

      // Home smooth scroll to embedded Skills Workbench
      if (target.closest("[data-home-scroll-skills]")) {
        const homeSkillsEl = document.getElementById("home-skills-section");
        if (homeSkillsEl && document.body.getAttribute("data-active-route") === "home") {
          event.preventDefault();
          homeSkillsEl.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }

      // Home Career Summary 4-Step cards -> filter embedded Career Timeline right below
      const homeCareerStep = target.closest("[data-home-career-step]");
      if (homeCareerStep && document.body.getAttribute("data-active-route") === "home") {
        const chap = homeCareerStep.getAttribute("data-home-career-step") || "all";
        const homeCareerTimelineEl = document.getElementById("home-career-timeline");
        if (homeCareerTimelineEl) {
          event.preventDefault();
          activeCareerChapter = chap;
          document.querySelectorAll(".career-floor-overlay[data-career-chapter]").forEach(btn => {
            btn.classList.toggle("is-active", activeCareerChapter !== "all" && btn.getAttribute("data-career-chapter") === activeCareerChapter);
          });
          document.querySelectorAll(".career-side-link[data-career-chapter]").forEach(btn => {
            btn.classList.toggle("is-active", btn.getAttribute("data-career-chapter") === activeCareerChapter);
          });
          const entriesHtml = renderCareerEntriesHtml();
          document.querySelectorAll("[data-career-entries-stack]").forEach(el => {
            el.innerHTML = entriesHtml;
          });
          document.querySelectorAll(".career-timeline-title-row").forEach(row => {
            row.innerHTML = `
              <h2>Career Timeline</h2>
              ${activeCareerChapter !== "all" ? `<button type="button" class="career-clear-chap-btn" data-career-chapter="all">Show all chapters &times;</button>` : ""}
            `;
          });
          homeCareerTimelineEl.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }

      // Watch 30s overview button in Compact Skills Showcase
      if (target.closest("[data-skills-watch-overview]")) {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
        const storyBtn = document.querySelector("[data-home-watch-story]");
        if (storyBtn) {
          storyBtn.click();
        }
        return;
      }

      // Compact Skills Dock mode toggle (Selected Details vs Connections View)
      const dockModeBtn = target.closest("[data-compact-dock-mode]");
      if (dockModeBtn) {
        event.preventDefault();
        compactSkillsDockView = dockModeBtn.getAttribute("data-compact-dock-mode") || "selected";
        hoveredSkillCategory = null;
        syncStackVisualStateOnly();
        return;
      }

      // Compact Skills Dock reset to State 1 (Default Compact View)
      if (target.closest("[data-compact-dock-reset]")) {
        event.preventDefault();
        compactSkillsLockedCat = null;
        compactSkillsDockView = "selected";
        hoveredSkillCategory = null;
        syncStackVisualStateOnly();
        return;
      }

      // Compact Skills Tile or Stack Layer click -> cycle State 3 (Selected) -> State 4 (Connections) -> State 1 (Default)
      const compactTileBtn = target.closest("[data-compact-skill-tile]");
      if (compactTileBtn) {
        event.preventDefault();
        const catId = compactTileBtn.getAttribute("data-compact-skill-tile") || "infrastructure";
        const isConnMiniCard = compactTileBtn.classList.contains("compact-conn-mini-card");
        if (isConnMiniCard) {
          compactSkillsLockedCat = catId;
          compactSkillsDockView = "connections";
        } else if (compactSkillsLockedCat !== catId) {
          compactSkillsLockedCat = catId;
          compactSkillsDockView = "selected";
        } else if (compactSkillsDockView === "selected") {
          compactSkillsDockView = "connections";
        } else {
          compactSkillsLockedCat = null;
          compactSkillsDockView = "selected";
        }
        activeSkillCategory = catId;
        hoveredSkillCategory = null;
        refreshSkillsWorkbenchUI();
        return;
      }

      // Skills Page deep link with URL query parameter (?cat=<id>#skills)
      const skillDeepLink = target.closest("[data-skills-deep-link]");
      if (skillDeepLink) {
        const catId = skillDeepLink.getAttribute("data-skills-deep-link") || "infrastructure";
        event.preventDefault();
        activeSkillCategory = catId;
        compactSkillsLockedCat = catId;
        hoveredSkillCategory = null;
        if (window.matchMedia("(max-width: 768px)").matches) {
          mobileSkillDrilldownId = catId;
          mobileSkillDrillTab = "overview";
        }
        try {
          window.history.pushState(null, "", `?cat=${encodeURIComponent(catId)}#skills`);
        } catch (_err) {
          window.location.hash = "#skills";
        }
        refreshSkillsWorkbenchUI();
        window.dispatchEvent(new HashChangeEvent("hashchange"));
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      // Skills Page category selection (Explorer 2x3 category cards, Map nodes, Timeline pills)
      const skillCatBtn = target.closest("[data-skills-select-cat]");
      if (skillCatBtn) {
        const catId = skillCatBtn.getAttribute("data-skills-select-cat") || "infrastructure";
        activeSkillCategory = catId;
        compactSkillsLockedCat = catId;
        hoveredSkillCategory = null;
        if (document.body.getAttribute("data-active-route") === "skills") {
          try {
            const sp = new URLSearchParams(window.location.search || "");
            sp.set("cat", catId);
            window.history.replaceState(null, "", `?${sp.toString()}#skills`);
          } catch (_err) {}
        }
        if (window.matchMedia("(max-width: 768px)").matches) {
          mobileSkillDrilldownId = catId;
          mobileSkillDrillTab = "overview";
          refreshSkillsWorkbenchUI();
          if (!skillCatBtn.matches("a[href]")) {
            const mobWb = skillCatBtn.closest(".skills-mobile-workbench");
            if (mobWb) {
              mobWb.scrollIntoView({ behavior: "smooth", block: "start" });
            } else {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }
        } else {
          refreshSkillsWorkbenchUI();
        }
        if (!skillCatBtn.matches("a[href]")) {
          return;
        }
      }

      // Skills Applied Experience detail sub-tabs (All Evidence | Skills | Tools | Projects | Chapters)
      const skillDetailTabBtn = target.closest("[data-skills-detail-tab]");
      if (skillDetailTabBtn) {
        activeSkillDetailTab = skillDetailTabBtn.getAttribute("data-skills-detail-tab") || "all";
        refreshSkillsWorkbenchUI();
        return;
      }

      // Skills Timeline chapter filter pills
      const skillTlChapBtn = target.closest("[data-skills-tl-chapter]");
      if (skillTlChapBtn) {
        const chId = skillTlChapBtn.getAttribute("data-skills-tl-chapter") || "all";
        activeSkillTimelineChapter = (chId !== "all" && activeSkillTimelineChapter === chId) ? "all" : chId;
        refreshSkillsWorkbenchUI();
        return;
      }

      // Skills Tag Highlight pill inside Applied Experience
      const skillTagBtn = target.closest("[data-skills-tag-highlight]");
      if (skillTagBtn) {
        const tagVal = skillTagBtn.getAttribute("data-skills-tag-highlight") || "";
        activeSkillHighlightTag = activeSkillHighlightTag === tagVal ? "" : tagVal;
        refreshSkillsWorkbenchUI();
        return;
      }

      // Skills Reset All Filters button
      if (target.closest("[data-skills-reset-all]")) {
        activeSkillFilter = "all";
        activeSkillViewMode = "cards";
        activeSkillSearch = "";
        activeSkillDetailTab = "all";
        activeSkillTimelineChapter = "all";
        activeSkillHighlightTag = "";
        document.querySelectorAll("[data-skills-search]").forEach(inp => { inp.value = ""; });
        refreshSkillsWorkbenchUI();
        return;
      }

      // Skills smooth scroll to Applied Experience Detail Panel
      const scrollDetailBtn = target.closest("[data-skills-scroll-detail]");
      if (scrollDetailBtn) {
        event.preventDefault();
        const scopeRoot = scrollDetailBtn.closest("#home-skills-section") || scrollDetailBtn.closest("#skills-page-section") || document;
        const detailEl = scopeRoot.querySelector("[data-skills-expanded-detail]");
        if (detailEl) {
          detailEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return;
      }

      // Home Contact Form topic pills
      const contactTopicBtn = target.closest("[data-contact-topic]");
      if (contactTopicBtn) {
        event.preventDefault();
        const group = contactTopicBtn.closest(".home-connect-topic-pills");
        if (group) {
          group.querySelectorAll("[data-contact-topic]").forEach(btn => {
            const isAct = btn === contactTopicBtn;
            btn.classList.toggle("is-active", isAct);
            btn.setAttribute("aria-pressed", isAct ? "true" : "false");
          });
        }
        return;
      }

      // Home smooth scroll & focus on Contact Form
      if (target.closest("[data-home-focus-contact]") || (target.closest(".header-story-btn") && document.body.getAttribute("data-active-route") === "home")) {
        const connectEl = document.getElementById("home-connect");
        if (connectEl) {
          event.preventDefault();
          connectEl.scrollIntoView({ behavior: "smooth", block: "start" });
          setTimeout(() => {
            const nameInp = document.querySelector("[data-contact-name]");
            if (nameInp) nameInp.focus({ preventScroll: true });
          }, 420);
          return;
        }
      }

      // Skills Page left sidebar filter buttons
      const skillFilterBtn = target.closest("[data-skills-filter]");
      if (skillFilterBtn) {
        const f = skillFilterBtn.getAttribute("data-skills-filter") || "all";
        activeSkillFilter = f;
        if (f === "map") {
          activeSkillViewMode = "map";
        } else if (f === "timeline") {
          activeSkillViewMode = "timeline";
        } else {
          if (activeSkillViewMode === "map" || activeSkillViewMode === "timeline") {
            activeSkillViewMode = "cards";
          }
          if (SKILL_CATEGORIES.some(c => c.id === f)) {
            activeSkillCategory = f;
          }
        }
        refreshSkillsWorkbenchUI();
        return;
      }

      // Skills Page View as: Cards | Map | Timeline toggle
      const skillViewBtn = target.closest("[data-skills-view]");
      if (skillViewBtn) {
        activeSkillViewMode = skillViewBtn.getAttribute("data-skills-view") || "cards";
        if (activeSkillViewMode === "map") {
          activeSkillFilter = "map";
        } else if (activeSkillViewMode === "timeline") {
          activeSkillFilter = "timeline";
        } else if (activeSkillFilter === "map" || activeSkillFilter === "timeline") {
          activeSkillFilter = "all";
        }
        refreshSkillsWorkbenchUI();
        return;
      }

      // Skills Page Mobile open category drilldown
      const skillMobOpenBtn = target.closest("[data-skills-mob-open]");
      if (skillMobOpenBtn) {
        mobileSkillDrilldownId = skillMobOpenBtn.getAttribute("data-skills-mob-open") || "infrastructure";
        activeSkillCategory = mobileSkillDrilldownId;
        mobileSkillDrillTab = "overview";
        refreshSkillsWorkbenchUI();
        const mobWb = skillMobOpenBtn.closest(".skills-mobile-workbench");
        if (mobWb && document.body.getAttribute("data-active-route") === "home") {
          mobWb.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        return;
      }

      // Skills Page Mobile back to overview
      const skillMobBackBtn = target.closest("[data-skills-mob-back]");
      if (skillMobBackBtn) {
        const mobWb = skillMobBackBtn.closest(".skills-mobile-workbench");
        mobileSkillDrilldownId = null;
        refreshSkillsWorkbenchUI();
        if (mobWb && document.body.getAttribute("data-active-route") === "home") {
          mobWb.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        return;
      }

      // Skills Page Mobile drilldown tabs
      const skillMobTabBtn = target.closest("[data-skills-mob-tab]");
      if (skillMobTabBtn) {
        mobileSkillDrillTab = skillMobTabBtn.getAttribute("data-skills-mob-tab") || "overview";
        refreshSkillsWorkbenchUI();
        return;
      }

      // Mobile sort toggle button
      if (target.closest("[data-chrono-mobile-sort-toggle]")) {
        activeChronoSort = activeChronoSort === "newest" ? "oldest" : "newest";
        const sortSel = document.querySelector("[data-proj-sort-select]");
        if (sortSel) sortSel.value = activeChronoSort;
        renderProjectsExplorerGrid();
        return;
      }

      // Featured Carousel Auto-Cycle Pause / Play toggle
      const carouselAutoplayBtn = target.closest("[data-carousel-autoplay-toggle]");
      if (carouselAutoplayBtn) {
        if (typeof window.__joshToggleCarouselAutoplay === "function") {
          window.__joshToggleCarouselAutoplay();
        }
        return;
      }

      // Featured Carousel Prev / Next buttons
      const carouselStepBtn = target.closest("[data-carousel-step]");
      if (carouselStepBtn) {
        const delta = parseInt(carouselStepBtn.getAttribute("data-carousel-step") || "1", 10);
        stepCarouselSlide(delta);
        return;
      }

      // Featured Carousel Pagination Dots
      const carouselDotBtn = target.closest("[data-carousel-dot]");
      if (carouselDotBtn) {
        const idx = parseInt(carouselDotBtn.getAttribute("data-carousel-dot") || "0", 10);
        goToCarouselSlide(idx);
        return;
      }

      // Featured Carousel Peek Card or Quick-Switcher Strip Card click -> switch active slide
      const carouselGotoCard = target.closest("[data-carousel-goto]");
      if (carouselGotoCard && !target.closest("a[href]")) {
        const idx = parseInt(carouselGotoCard.getAttribute("data-carousel-goto") || "0", 10);
        goToCarouselSlide(idx);
        return;
      }

      // Featured Carousel Quick Facts disclosure toggle
      const qfBtn = target.closest("[data-carousel-quick-facts]");
      if (qfBtn) {
        carouselQuickFactsOpen = !carouselQuickFactsOpen;
        renderFeaturedCarousel("none");
        return;
      }

      // Chronological Type Filter pills (All Projects, Professional Work, Independent Builds)
      const chronoTypeBtn = target.closest("[data-chrono-type]");
      if (chronoTypeBtn) {
        const chosenType = chronoTypeBtn.getAttribute("data-chrono-type") || "all";
        if (chosenType === "all") {
          activeChronoType = "all";
          activeChronoTopic = "";
        } else {
          activeChronoType = activeChronoType === chosenType ? "all" : chosenType;
        }
        syncChronoFilterPills();
        renderProjectsExplorerGrid();
        return;
      }

      // Chronological Topic Filter pills (Insurance, Data & Reporting, Infrastructure, AI & Automation, Web & Tools)
      const chronoTopicBtn = target.closest("[data-chrono-topic]");
      if (chronoTopicBtn) {
        const chosenTopic = chronoTopicBtn.getAttribute("data-chrono-topic") || "";
        activeChronoTopic = activeChronoTopic === chosenTopic ? "" : chosenTopic;
        syncChronoFilterPills();
        renderProjectsExplorerGrid();
        return;
      }

      // Detail Sidebar category jump links
      const detailJumpCat = target.closest("[data-detail-jump-cat]");
      if (detailJumpCat) {
        const cat = detailJumpCat.getAttribute("data-detail-jump-cat") || "all";
        if (cat === "all" || cat === "professional" || cat === "independent") {
          activeChronoType = cat;
          activeChronoTopic = "";
        } else {
          activeChronoType = "all";
          activeChronoTopic = cat;
        }
        syncChronoFilterPills();
        renderProjectsExplorerGrid();
        return;
      }

      // Reset filters button
      if (target.closest("[data-proj-clear-filters]")) {
        activeChronoType = "all";
        activeChronoTopic = "";
        activeChronoSort = "newest";
        activeProjectTag = "";
        activeProjectSearch = "";
        document.querySelectorAll("[data-proj-search-input]").forEach(inp => { inp.value = ""; });
        const sortSel = document.querySelector("[data-proj-sort-select]");
        if (sortSel) sortSel.value = "newest";
        syncChronoFilterPills();
        renderProjectsExplorerGrid();
        return;
      }

      // Timeline / Compact List view toggle
      const viewBtn = target.closest("[data-proj-view]");
      if (viewBtn) {
        activeProjectViewMode = viewBtn.getAttribute("data-proj-view") || "timeline";
        document.querySelectorAll("[data-proj-view]").forEach(btn => {
          const isAct = btn === viewBtn;
          btn.classList.toggle("is-active", isAct);
          btn.setAttribute("aria-pressed", isAct ? "true" : "false");
        });
        renderProjectsExplorerGrid();
        return;
      }

      // Career Page Chapter Filter buttons & Cutaway Floor overlays
      const careerChapBtn = target.closest("[data-career-chapter]");
      if (careerChapBtn) {
        const clickedChap = careerChapBtn.getAttribute("data-career-chapter") || "all";
        activeCareerChapter = (clickedChap !== "all" && activeCareerChapter === clickedChap) ? "all" : clickedChap;
        document.querySelectorAll(".career-floor-overlay[data-career-chapter]").forEach(btn => {
          btn.classList.toggle("is-active", activeCareerChapter !== "all" && btn.getAttribute("data-career-chapter") === activeCareerChapter);
        });
        document.querySelectorAll(".career-side-link[data-career-chapter]").forEach(btn => {
          btn.classList.toggle("is-active", btn.getAttribute("data-career-chapter") === activeCareerChapter);
        });
        const entriesHtml = renderCareerEntriesHtml();
        document.querySelectorAll("[data-career-entries-stack]").forEach(el => {
          el.innerHTML = entriesHtml;
        });
        document.querySelectorAll(".career-timeline-title-row").forEach(row => {
          row.innerHTML = `
            <h2>Career Timeline</h2>
            ${activeCareerChapter !== "all" ? `<button type="button" class="career-clear-chap-btn" data-career-chapter="all">Show all chapters &times;</button>` : ""}
          `;
        });
        return;
      }

      // Career Page Timeline View vs List View toggle
      const careerViewBtn = target.closest("[data-career-view]");
      if (careerViewBtn) {
        activeCareerViewMode = careerViewBtn.getAttribute("data-career-view") || "timeline";
        document.querySelectorAll("[data-career-view]").forEach(btn => {
          btn.classList.toggle("is-active", btn.getAttribute("data-career-view") === activeCareerViewMode);
        });
        const entriesHtml = renderCareerEntriesHtml();
        document.querySelectorAll("[data-career-entries-stack]").forEach(el => {
          el.innerHTML = entriesHtml;
        });
        return;
      }

      // Career Page Chapter Card expand/collapse drawer toggle
      const careerToggleCard = target.closest("[data-career-toggle-entry]");
      if (careerToggleCard && !target.closest("a")) {
        const entryId = careerToggleCard.getAttribute("data-career-toggle-entry") || "";
        if (entryId) {
          if (expandedCareerEntries.has(entryId)) expandedCareerEntries.delete(entryId);
          else expandedCareerEntries.add(entryId);
          const entriesHtml = renderCareerEntriesHtml();
          document.querySelectorAll("[data-career-entries-stack]").forEach(el => {
            el.innerHTML = entriesHtml;
          });
        }
        return;
      }

      // Career Page Left Sidebar Navigation
      const careerNavBtn = target.closest("[data-career-nav]");
      if (careerNavBtn) {
        const navKey = careerNavBtn.getAttribute("data-career-nav") || "overview";
        document.querySelectorAll(".career-side-link").forEach(btn => {
          btn.classList.toggle("is-active", btn === careerNavBtn);
        });
        if (navKey === "overview") {
          activeCareerChapter = "all";
          const entriesHtml = renderCareerEntriesHtml();
          document.querySelectorAll("[data-career-entries-stack]").forEach(el => {
            el.innerHTML = entriesHtml;
          });
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else if (navKey === "timeline") {
          document.getElementById("career-timeline-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (navKey === "skills") {
          document.getElementById("career-skills-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (navKey === "industries") {
          document.getElementById("career-industries-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (navKey === "education") {
          window.location.hash = "#about";
        }
        return;
      }

      // Career Page Watch My Story button
      if (target.closest("[data-career-watch-story]")) {
        const guideBtn = document.querySelector("[data-open-career-guide], [data-career-guide-open]");
        if (guideBtn) {
          guideBtn.click();
        } else {
          window.location.hash = "#about";
        }
        return;
      }

      // Career Page smooth scroll to timeline
      if (target.closest("[data-career-scroll-timeline]")) {
        event.preventDefault();
        const tlSec = document.getElementById("career-timeline-section");
        if (tlSec) {
          tlSec.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return;
      }

      // About Page smooth scroll to #about-connect
      if (target.closest("[data-about-scroll-connect]")) {
        event.preventDefault();
        const connectSec = document.getElementById("about-connect");
        if (connectSec) {
          connectSec.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return;
      }

      // About Page Lightbox Open
      const lbOpenBtn = target.closest("[data-about-lightbox-open]");
      if (lbOpenBtn) {
        lastAboutLightboxTrigger = lbOpenBtn;
        const idx = parseInt(lbOpenBtn.getAttribute("data-about-lightbox-open") || "0", 10);
        updateAboutLightbox(idx);
        return;
      }

      // About Page Lightbox Close
      if (target.closest("[data-about-lightbox-close]") || target.matches?.("[data-about-lightbox]")) {
        updateAboutLightbox(-1);
        return;
      }

      // About Page Lightbox Prev/Next Step
      const lbStepBtn = target.closest("[data-about-lightbox-step]");
      if (lbStepBtn) {
        const delta = parseInt(lbStepBtn.getAttribute("data-about-lightbox-step") || "1", 10);
        const total = ABOUT_PAGE_DATA.personal.length;
        const nextIdx = (activeAboutLightboxIdx + delta + total) % total;
        updateAboutLightbox(nextIdx);
        return;
      }

      // Detail Page Tabs
      const detailTabBtn = target.closest("[data-detail-tab]");
      if (detailTabBtn) {
        activeDetailTab = detailTabBtn.getAttribute("data-detail-tab") || "overview";
        const curSlug = detailSection?.querySelector("[data-upgraded-detail]")?.getAttribute("data-upgraded-detail");
        if (curSlug) renderProjectDetailWorkbench(curSlug);
        return;
      }

      // Detail Visuals Carousel Step
      const visualStepBtn = target.closest("[data-visual-step]");
      if (visualStepBtn) {
        const delta = parseInt(visualStepBtn.getAttribute("data-visual-step") || "1", 10);
        activeVisualSlide = (activeVisualSlide + delta + 5) % 5;
        detailSection?.querySelectorAll(".proj-visual-dot").forEach((dot, i) => {
          dot.classList.toggle("is-active", i === activeVisualSlide);
        });
        return;
      }

      if (target.closest("[data-cmd-open]")) {
        setCmdOpen(true);
        return;
      }

      if (target.closest("[data-cmd-close]") || target === cmdBackdrop) {
        setCmdOpen(false);
        return;
      }

      const cmdItemBtn = target.closest("[data-cmd-idx]");
      if (cmdItemBtn) {
        const idx = parseInt(cmdItemBtn.getAttribute("data-cmd-idx"), 10);
        const items = getFilteredCmdItems();
        executeCmdItem(items[idx]);
      }
    });

    document.addEventListener("change", event => {
      if (event.target?.matches?.("[data-proj-sort-select]")) {
        activeChronoSort = event.target.value || "newest";
        renderProjectsExplorerGrid();
      }
    });

    document.addEventListener("submit", event => {
      const form = event.target?.closest?.("[data-home-contact-form]");
      if (!form) return;
      event.preventDefault();

      const nameInp = form.querySelector("[data-contact-name]");
      const replyInp = form.querySelector("[data-contact-reply]");
      const msgInp = form.querySelector("[data-contact-message]");
      const activeTopicEl = form.querySelector("[data-contact-topic].is-active");
      const feedbackEl = form.querySelector("[data-contact-feedback]");

      const nameVal = (nameInp?.value || "").trim();
      const replyVal = (replyInp?.value || "").trim();
      const msgVal = (msgInp?.value || "").trim();
      const topicVal = activeTopicEl?.getAttribute("data-contact-topic") || "Solution Architecture";

      if (!nameVal || !replyVal || !msgVal) {
        if (feedbackEl) {
          feedbackEl.hidden = false;
          feedbackEl.className = "home-connect-feedback is-error";
          feedbackEl.textContent = "Please fill in your name, contact info and a brief message to prepare your connection note.";
        }
        if (!nameVal && nameInp) nameInp.focus();
        else if (!replyVal && replyInp) replyInp.focus();
        else if (!msgVal && msgInp) msgInp.focus();
        return;
      }

      const subject = `JoshBoyer.ca Connection — ${topicVal} (${nameVal})`;
      const bodyText = [
        `Hi Josh,`,
        ``,
        msgVal,
        ``,
        `---`,
        `From: ${nameVal}`,
        `Contact: ${replyVal}`,
        `Topic: ${topicVal}`
      ].join("\n");

      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        navigator.clipboard.writeText(bodyText).catch(() => {});
      }

      const mailtoHref = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
      if (feedbackEl) {
        feedbackEl.hidden = false;
        feedbackEl.className = "home-connect-feedback is-success";
        feedbackEl.innerHTML = `
          <div class="home-connect-feedback-top">
            <span class="home-connect-feedback-check" aria-hidden="true">&#10003;</span>
            <div>
              <strong>Connection note ready &amp; copied to clipboard</strong>
              <p data-contact-feedback-meta></p>
            </div>
          </div>
          <div class="home-connect-feedback-actions">
            <a class="home-feedback-btn-primary" href="${mailtoHref}">Open in Email Client &#8599;</a>
            <a class="home-feedback-btn-secondary" href="resume.html">Build Tailored R&eacute;sum&eacute; &rarr;</a>
          </div>
        `;
        const metaP = feedbackEl.querySelector("[data-contact-feedback-meta]");
        if (metaP) {
          metaP.textContent = `Topic: ${topicVal} · From ${nameVal}`;
        }
      }
    });

    document.addEventListener("input", event => {
      if (event.target?.matches?.("[data-proj-search-input]")) {
        activeProjectSearch = event.target.value || "";
        renderProjectsExplorerGrid();
      } else if (event.target?.matches?.("[data-skills-search]")) {
        activeSkillSearch = event.target.value || "";
        document.querySelectorAll("[data-skills-search]").forEach(inp => {
          if (inp !== event.target) inp.value = activeSkillSearch;
        });
        refreshSkillsWorkbenchUI();
      } else if (event.target?.matches?.("[data-detail-sidebar-search]")) {
        const q = (event.target.value || "").trim().toLowerCase();
        detailSection?.querySelectorAll(".proj-detail-featured-item").forEach(item => {
          item.style.display = !q || item.textContent.toLowerCase().includes(q) ? "" : "none";
        });
      } else if (event.target === cmdInput) {
        cmdSelectedIndex = 0;
        renderCmdResults();
      }
    });

    document.addEventListener("keydown", event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCmdOpen(!cmdOpen);
        return;
      }
      if (activeAboutLightboxIdx >= 0) {
        const total = ABOUT_PAGE_DATA.personal.length;
        if (event.key === "Escape") {
          event.preventDefault();
          updateAboutLightbox(-1);
          return;
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          updateAboutLightbox((activeAboutLightboxIdx + 1) % total);
          return;
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          updateAboutLightbox((activeAboutLightboxIdx - 1 + total) % total);
          return;
        }
      }
      if (cmdOpen) {
        const items = getFilteredCmdItems();
        if (event.key === "Escape") {
          event.preventDefault();
          setCmdOpen(false);
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          cmdSelectedIndex = (cmdSelectedIndex + 1) % Math.max(1, items.length);
          renderCmdResults();
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          cmdSelectedIndex = (cmdSelectedIndex - 1 + Math.max(1, items.length)) % Math.max(1, items.length);
          renderCmdResults();
        } else if (event.key === "Enter" && items[cmdSelectedIndex]) {
          event.preventDefault();
          executeCmdItem(items[cmdSelectedIndex]);
        }
        return;
      }

      // Keyboard Left/Right navigation when focus is inside any Featured Projects Carousel
      const activeCarouselSec = document.activeElement?.closest?.("[data-carousel-section]");
      if (activeCarouselSec && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        const delta = event.key === "ArrowRight" ? 1 : -1;
        stepCarouselSlide(delta);
        return;
      }

      // Keyboard Enter / Space activation for focusable non-button cards ([tabindex="0"])
      if (event.key === "Enter" || event.key === " ") {
        const focusedEl = document.activeElement;
        if (
          focusedEl &&
          focusedEl.getAttribute("tabindex") === "0" &&
          !focusedEl.matches("a, button, input, textarea, select") &&
          focusedEl.matches("[data-carousel-goto], [data-proj-link], [data-career-toggle-entry], [data-skills-cat], [data-skills-select-cat]")
        ) {
          event.preventDefault();
          focusedEl.click();
        }
      }
    });

    // Hover & focus synchronization for Interactive Capability Stack and Capability Overview Cards
    function handleStackHoverOrFocus(event) {
      const target = event.target?.closest ? event.target : event.target?.parentElement;
      if (!target) return;
      if (target.closest("[data-compact-skills-dock]")) return;
      const hoverTrigger = target.closest("[data-skills-stack-layer], [data-compact-skill-tile], .cap-overview-card[data-skills-select-cat], .skills-prof-strip-card[data-skills-select-cat], .cap-map-node[data-skills-select-cat]");
      if (hoverTrigger) {
        const catId = hoverTrigger.getAttribute("data-skills-stack-layer") || hoverTrigger.getAttribute("data-compact-skill-tile") || hoverTrigger.getAttribute("data-skills-select-cat");
        if (catId && hoveredSkillCategory !== catId) {
          hoveredSkillCategory = catId;
          syncStackVisualStateOnly();
        }
      }
    }

    function handleStackLeaveOrBlur(event) {
      const target = event.target?.closest ? event.target : event.target?.parentElement;
      if (!target) return;
      if (target.closest("[data-compact-skills-dock]")) return;
      const hoverTrigger = target.closest("[data-skills-stack-layer], [data-compact-skill-tile], .cap-overview-card[data-skills-select-cat], .skills-prof-strip-card[data-skills-select-cat], .cap-map-node[data-skills-select-cat]");
      if (hoverTrigger) {
        const relEl = event.relatedTarget?.closest ? event.relatedTarget : event.relatedTarget?.parentElement;
        if (relEl && hoverTrigger.contains(relEl)) return;
        const rel = relEl?.closest ? relEl.closest("[data-skills-stack-layer], [data-compact-skill-tile], .cap-overview-card[data-skills-select-cat], .skills-prof-strip-card[data-skills-select-cat], .cap-map-node[data-skills-select-cat]") : null;
        if (!rel && hoveredSkillCategory !== null) {
          hoveredSkillCategory = null;
          syncStackVisualStateOnly();
        }
      }
    }

    document.addEventListener("pointerover", handleStackHoverOrFocus);
    document.addEventListener("focusin", handleStackHoverOrFocus);
    document.addEventListener("pointerout", handleStackLeaveOrBlur);
    document.addEventListener("focusout", handleStackLeaveOrBlur);

    // Smooth "Cloud Glide" Section-Indent Auto-Scroll & Floating Parallax Controller (Desktop & Mobile)
    (function initCloudGlideScrollSystem() {
      if (typeof window === "undefined") return;
      const reduceMotionMq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
      let glideRafId = null;
      let settleTimerId = null;
      let parallaxRafId = null;
      let isTouchActive = false;
      let isProgrammaticGlide = false;
      let ignoreScrollUntil = 0;
      let lastSettledTargetY = -9999;
      let lastScrollY = window.scrollY || 0;
      let scrollDirection = 0;
      let smoothedScrollY = lastScrollY;

      function getHomeSectionTargets() {
        const homePage = document.querySelector('section[data-page="home"]');
        if (!homePage || homePage.hidden) return [];
        const sectionSpecs = [
          { sel: ".career-hero", offsetDelta: 0 },
          { sel: ".home-projects-carousel", offsetDelta: -4 },
          { sel: "#home-career-section .home-sum-inner", fallbackSel: "#home-career-section", offsetDelta: 24 },
          { sel: "#home-skills-section", offsetDelta: -8 },
          { sel: "#home-about-section, .home-sum-about", offsetDelta: 0 },
          { sel: "#home-connect", offsetDelta: 0 }
        ];
        const isMobile = window.innerWidth <= 768;
        const headerOffset = isMobile ? 76 : 64;
        const maxScrollY = Math.max(
          0,
          (document.documentElement.scrollHeight || document.body.scrollHeight || 0) - (window.innerHeight || 800)
        );
        const targets = [];
        sectionSpecs.forEach((spec, idx) => {
          const el = homePage.querySelector(spec.sel) || (spec.fallbackSel ? homePage.querySelector(spec.fallbackSel) : null);
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const rawTop = (window.scrollY || window.pageYOffset || 0) + rect.top;
          const computedY = idx === 0 ? 0 : Math.round(rawTop - headerOffset - (spec.offsetDelta || 0));
          const targetY = Math.max(0, Math.min(maxScrollY, computedY));
          targets.push({ el, idx, targetY, height: rect.height });
        });
        return targets;
      }

      function restoreNativeScrollBehavior() {
        if (document.documentElement) {
          document.documentElement.style.scrollBehavior = "";
        }
      }

      function cancelActiveGlide() {
        if (glideRafId) {
          cancelAnimationFrame(glideRafId);
          glideRafId = null;
        }
        if (isProgrammaticGlide) {
          isProgrammaticGlide = false;
          restoreNativeScrollBehavior();
        }
      }

      function startCloudGlideTo(targetY) {
        cancelActiveGlide();
        const startY = window.scrollY || window.pageYOffset || 0;
        const delta = targetY - startY;
        if (Math.abs(delta) < 3) return;
        lastSettledTargetY = targetY;
        isProgrammaticGlide = true;

        // Bypass CSS `html { scroll-behavior: smooth }` during the custom RAF pull-and-slide
        if (document.documentElement) {
          document.documentElement.style.scrollBehavior = "auto";
        }

        // Slow, deliberate magnetic pull + smooth viscous slide duration (~0.98s to 1.68s)
        const duration = Math.min(1680, Math.max(980, 760 + Math.abs(delta) * 3.4));
        const startTime = performance.now();

        function stepGlide(now) {
          const elapsed = now - startTime;
          const t = Math.min(1, elapsed / duration);
          // Gentle magnetic pull-in from rest (smoothstep entry) blended with a slow viscous glide into the indent
          const smoothEntry = t * t * (3 - 2 * t);
          const eased = 1 - Math.pow(1 - smoothEntry, 1.65);
          const nextY = startY + delta * eased;
          ignoreScrollUntil = performance.now() + 60;
          window.scrollTo(0, nextY);
          lastScrollY = nextY;

          if (t < 1) {
            glideRafId = requestAnimationFrame(stepGlide);
          } else {
            glideRafId = null;
            isProgrammaticGlide = false;
            ignoreScrollUntil = performance.now() + 120;
            restoreNativeScrollBehavior();
          }
        }

        glideRafId = requestAnimationFrame(stepGlide);
      }

      function evaluateSectionIndentSettle() {
        if (reduceMotionMq && reduceMotionMq.matches) return;
        if (isTouchActive || glideRafId || isProgrammaticGlide) return;
        const targets = getHomeSectionTargets();
        if (!targets.length) return;

        const currentY = window.scrollY || window.pageYOffset || 0;
        const vh = window.innerHeight || 800;
        const isMobile = window.innerWidth <= 768;
        // Indent capture radius: wide enough to gently catch and pull the view into the nearest section indent
        const captureRadius = isMobile ? Math.min(240, vh * 0.34) : Math.min(340, vh * 0.38);

        let bestMatch = null;
        let bestScore = Infinity;

        for (const item of targets) {
          const dist = item.targetY - currentY;
          const absDist = Math.abs(dist);
          if (absDist <= captureRadius) {
            // Slight directional preference in the direction of travel while still allowing settle-back if slightly overshot
            const againstDirection =
              (scrollDirection > 0 && dist < -captureRadius * 0.82) ||
              (scrollDirection < 0 && dist > captureRadius * 0.82);
            if (againstDirection) continue;
            const dirPenalty =
              (scrollDirection > 0 && dist < 0) || (scrollDirection < 0 && dist > 0) ? absDist * 1.18 : absDist;
            if (dirPenalty < bestScore) {
              bestScore = dirPenalty;
              bestMatch = item;
            }
          }
        }

        if (bestMatch && Math.abs(bestMatch.targetY - currentY) >= 4 && Math.abs(bestMatch.targetY - lastSettledTargetY) > 6) {
          startCloudGlideTo(bestMatch.targetY);
        }
      }

      function updateCloudParallaxTick() {
        const targetY = window.scrollY || window.pageYOffset || 0;
        smoothedScrollY += (targetY - smoothedScrollY) * 0.12;
        const workbench = document.querySelector(".home-summary-workbench");
        if (workbench) {
          const shift = ((smoothedScrollY % 1200) / 1200) * 28 - 14;
          workbench.style.setProperty("--cloud-glide-shift", `${shift.toFixed(2)}px`);
        }
        if (Math.abs(targetY - smoothedScrollY) > 0.4) {
          parallaxRafId = requestAnimationFrame(updateCloudParallaxTick);
        } else {
          parallaxRafId = null;
        }
      }

      function onUserScrollInterrupt() {
        cancelActiveGlide();
        lastSettledTargetY = -9999;
        if (settleTimerId) {
          clearTimeout(settleTimerId);
          settleTimerId = null;
        }
      }

      window.addEventListener("wheel", () => {
        onUserScrollInterrupt();
        settleTimerId = setTimeout(evaluateSectionIndentSettle, 210);
      }, { passive: true });

      window.addEventListener("touchstart", () => {
        isTouchActive = true;
        onUserScrollInterrupt();
      }, { passive: true });

      window.addEventListener("touchend", () => {
        isTouchActive = false;
        if (settleTimerId) clearTimeout(settleTimerId);
        settleTimerId = setTimeout(evaluateSectionIndentSettle, 240);
      }, { passive: true });

      window.addEventListener("keydown", ev => {
        if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "Home", "End"].includes(ev.key)) {
          onUserScrollInterrupt();
        }
      }, { passive: true });

      window.addEventListener("scroll", () => {
        const now = performance.now();
        const y = window.scrollY || window.pageYOffset || 0;
        if (!parallaxRafId && !(reduceMotionMq && reduceMotionMq.matches)) {
          parallaxRafId = requestAnimationFrame(updateCloudParallaxTick);
        }
        if (isProgrammaticGlide || now < ignoreScrollUntil) {
          lastScrollY = y;
          return;
        }
        if (Math.abs(y - lastScrollY) > 1) {
          scrollDirection = y > lastScrollY ? 1 : -1;
          lastScrollY = y;
        }
        if (settleTimerId) clearTimeout(settleTimerId);
        settleTimerId = setTimeout(evaluateSectionIndentSettle, isTouchActive ? 260 : 210);
      }, { passive: true });
    })();

    // 9B. Atmospheric Fluid & Cloud Microphysics Engine inside the Builds Section
    //     Implements:
    //     1. Convective Updraft & Adiabatic LCL Condensation / Anvil Spreading Lifecycle
    //     2. Potential-Flow Bow Pressure Wave ahead of moving objects
    //     3. Counter-Rotating Trailing Lamb-Oseen Wake Vortex Street (+/- Gamma wingtip dipoles)
    //     4. Turbulent Entrainment & Inhomogeneous Mixing Evaporation (thin filaments evaporate faster than dense cores)
    //     5. Evaporative Cooling Negative-Buoyancy Downdraft & Convective Re-Condensation
    (function initBuildsCloudPhysics() {
      if (typeof window === "undefined") return;

      const CLOUD_SPECS = [
        { sel: ".builds-cloud--stage-sea", plane: "back", ampX: 78, ampY: 16, speed: 0.00028, phase: 0.3, baseOpacity: 0.94, convFreq: 0.00038, zFreq: 0.00046, zAmp: 0.11, zPhase: 0.0 },
        { sel: ".builds-cloud--top-crown", plane: "back", ampX: 112, ampY: 18, speed: 0.00038, phase: 1.5, baseOpacity: 0.90, convFreq: 0.00048, zFreq: 0.00058, zAmp: 0.14, zPhase: 1.3 },
        { sel: ".builds-cloud--left-wing-back", plane: "back", ampX: 138, ampY: 20, speed: -0.00042, phase: 2.8, baseOpacity: 0.88, convFreq: 0.00052, zFreq: 0.00064, zAmp: 0.16, zPhase: 2.6 },
        { sel: ".builds-cloud--right-upper-back", plane: "back", ampX: 134, ampY: 19, speed: 0.00044, phase: 4.1, baseOpacity: 0.88, convFreq: 0.00050, zFreq: 0.00061, zAmp: 0.16, zPhase: 3.9 },
        { sel: ".builds-cloud--left-base-back", plane: "back", ampX: 98, ampY: 15, speed: -0.00034, phase: 5.2, baseOpacity: 0.90, convFreq: 0.00044, zFreq: 0.00052, zAmp: 0.12, zPhase: 5.1 },
        { sel: ".builds-wisp--cross-stream", plane: "weave", ampX: 168, ampY: 22, speed: 0.00054, phase: 0.9, baseOpacity: 0.72, convFreq: 0.00062, zFreq: 0.00074, zAmp: 0.18, zPhase: 0.8 },
        { sel: ".builds-wisp--left-mid", plane: "weave", ampX: 154, ampY: 20, speed: -0.00051, phase: 3.4, baseOpacity: 0.68, convFreq: 0.00058, zFreq: 0.00070, zAmp: 0.17, zPhase: 3.9 },
        { sel: ".card-edge-cloud--top", plane: "weave", ampX: 28, ampY: 7, speed: 0.00046, phase: 0.7, baseOpacity: 0.98, convFreq: 0.00058, zFreq: 0.00068, zAmp: 0.06, zPhase: 0.5 },
        { sel: ".card-edge-cloud--bottom", plane: "weave", ampX: 32, ampY: 8, speed: -0.00044, phase: 2.3, baseOpacity: 0.98, convFreq: 0.00056, zFreq: 0.00065, zAmp: 0.07, zPhase: 2.1 },
        { sel: ".card-edge-cloud--left", plane: "weave", ampX: 9, ampY: 18, speed: 0.00042, phase: 1.4, baseOpacity: 0.96, convFreq: 0.00052, zFreq: 0.00062, zAmp: 0.06, zPhase: 1.4 },
        { sel: ".card-edge-cloud--right", plane: "weave", ampX: 9, ampY: 18, speed: -0.00042, phase: 3.8, baseOpacity: 0.96, convFreq: 0.00052, zFreq: 0.00062, zAmp: 0.06, zPhase: 3.8 },
        { sel: ".loop-edge-cloud--left", plane: "loop", ampX: 16, ampY: 10, speed: 0.00040, phase: 1.1, baseOpacity: 0.98, convFreq: 0.00050, zFreq: 0.00058, zAmp: 0.07, zPhase: 1.2 },
        { sel: ".loop-edge-cloud--right", plane: "loop", ampX: 16, ampY: 10, speed: -0.00040, phase: 2.9, baseOpacity: 0.98, convFreq: 0.00050, zFreq: 0.00058, zAmp: 0.07, zPhase: 2.9 },
        { sel: ".loop-edge-cloud--top", plane: "loop", ampX: 26, ampY: 6, speed: 0.00038, phase: 4.2, baseOpacity: 0.94, convFreq: 0.00048, zFreq: 0.00054, zAmp: 0.05, zPhase: 4.0 }
      ];

      const stateMap = new Map();
      CLOUD_SPECS.forEach((spec, idx) => {
        const subParcels = [];
        for (let p = 0; p < 6; p++) {
          subParcels.push({
            dx: 0,
            dy: 0,
            vx: 0,
            vy: 0,
            rot: 0,
            vRot: 0,
            shear: 0,
            vShear: 0,
            zDepth: 0,
            vzDepth: 0,
            lwc: 1.0, // Liquid Water Content q_c in [0.08, 1.08]
            tke: 0,   // Turbulent Kinetic Energy
            phaseOffset: idx * 0.9 + p * 1.15
          });
        }
        stateMap.set(spec.sel, {
          spec,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          zDepth: 0,
          vzDepth: 0,
          rot: 0,
          vRot: 0,
          shear: 0,
          vShear: 0,
          tke: 0,
          lwc: 1.0,       // Liquid water content (1.0 = saturated cloud, < 1 = evaporating wake, > 1 = bow-rim flash condensation)
          buoyancy: 0,    // Thermal/evaporative-cooling vertical buoyancy
          subParcels
        });
      });

      // Trailing Lamb-Oseen Wake Vortex Street (fixed 6-slot ring buffer so active vortices are never evicted early)
      const MAX_VORTICES = 6;
      const wakeVortices = [];

      function spawnWakeVortexPair(x, y, ux, uy, speed, now) {
        const invSpd = 1 / (speed || 1);
        const nx = -uy * invSpd; // Left wingtip normal perpendicular to motion vector
        const ny = ux * invSpd;
        const wingspanHalf = 38; // Dipole separation b
        const gammaMag = Math.min(520, Math.max(95, speed * 15));

        // Left counter-rotating vortex (+Gamma) and Right counter-rotating vortex (-Gamma)
        wakeVortices.push(
          {
            x: x + nx * wingspanHalf,
            y: y + ny * wingspanHalf,
            vx: ux * 0.08 + nx * 0.18,
            vy: uy * 0.08 + ny * 0.18,
            gamma: gammaMag,
            r0: 58,
            bornAt: now,
            tke: Math.min(0.45, speed * 0.012)
          },
          {
            x: x - nx * wingspanHalf,
            y: y - ny * wingspanHalf,
            vx: ux * 0.08 - nx * 0.18,
            vy: uy * 0.08 - ny * 0.18,
            gamma: -gammaMag,
            r0: 58,
            bornAt: now,
            tke: Math.min(0.45, speed * 0.012)
          }
        );

        while (wakeVortices.length > MAX_VORTICES) {
          wakeVortices.shift();
        }
      }

      let pointerX = -9999;
      let pointerY = -9999;
      let pointerVx = 0;
      let pointerVy = 0;
      let smoothPtrX = -9999;
      let smoothPtrY = -9999;
      let smoothPtrVx = 0;
      let smoothPtrVy = 0;
      let pointerActiveUntil = 0;
      let lastVortexSpawnAt = 0;
      let globalStageTke = 0;
      let heroCloudRevealState = 0.0;
      let lastHeroRevealPerfNow = 0;

      // WebGL Photorealistic Volumetric Cumulus Cloud Renderer
      // Combines multi-scale Perlin-Worley cellular cauliflower domes, 6-octave rotational curl-warped FBM,
      // 4-step directional Beer-Lambert ray-marched self-shadowing, 3D dome surface normals, and live
      // Navier-Stokes / Lamb-Oseen wake vortex advection across TWO depth planes (Back z:2 & Front z:8).
      const webglPlanes = new Map();

      function initWebGLCloudRenderer(canvas, layerFlag) {
        if (!canvas) return null;
        if (webglPlanes.has(canvas)) return webglPlanes.get(canvas);
        let gl = null;
        try {
          gl =
            canvas.getContext("webgl", {
              alpha: true,
              premultipliedAlpha: true,
              antialias: false,
              depth: false,
              stencil: false,
              preserveDrawingBuffer: false
            }) ||
            canvas.getContext("experimental-webgl", {
              alpha: true,
              premultipliedAlpha: true,
              antialias: false,
              depth: false,
              stencil: false
            });
        } catch (_) {
          gl = null;
        }
        if (!gl) {
          webglPlanes.set(canvas, null);
          return null;
        }

        const vsSource = `
          attribute vec2 a_pos;
          void main() {
            gl_Position = vec4(a_pos, 0.0, 1.0);
          }
        `;

        const fsSource = `
          precision highp float;

          uniform vec2 u_resolution;
          uniform float u_dpr;
          uniform float u_time;
          uniform float u_layer;       // 0.0 = Background Cumulus Layer (behind cards), 1.0 = Foreground Cumulus Layer (in front of cards)
          uniform vec2 u_secBounds;    // x = top seam Y (Hero -> Builds), y = bottom seam Y (Builds -> Career)
          uniform vec4 u_mainCard;     // xy = center, zw = halfSize
          uniform vec4 u_stripRect;    // xy = center, zw = halfSize
          uniform float u_headerBottom;
          uniform float u_heroCloudReveal; // 0.0 = Hero cloud edge hidden during story video, 0..1 = right-to-left fade-in at end of video
          uniform vec4 u_subCards[6];
          uniform vec4 u_pointer;
          uniform vec4 u_vortices[6];

          // High-precision sinless hashes
          vec2 hash22(vec2 p) {
            vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
            p3 += dot(p3, p3.yzx + 33.33);
            return fract((p3.xx + p3.yz) * p3.zy);
          }

          // Full-Range Quintic 2D Gradient Noise in [0.0, 1.0] (C2-smooth, isotropic, natural cloud contrast)
          float gnoise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
            vec2 ga = hash22(i + vec2(0.0, 0.0)) * 2.0 - 1.0;
            vec2 gb = hash22(i + vec2(1.0, 0.0)) * 2.0 - 1.0;
            vec2 gc = hash22(i + vec2(0.0, 1.0)) * 2.0 - 1.0;
            vec2 gd = hash22(i + vec2(1.0, 1.0)) * 2.0 - 1.0;
            float va = dot(ga, f - vec2(0.0, 0.0));
            float vb = dot(gb, f - vec2(1.0, 0.0));
            float vc = dot(gc, f - vec2(0.0, 1.0));
            float vd = dot(gd, f - vec2(1.0, 1.0));
            float rawGrad = mix(mix(va, vb, u.x), mix(vc, vd, u.x), u.y);
            return smoothstep(-0.52, 0.52, rawGrad);
          }

          // C-infinity Quadratic Bezier Color Ramp (eliminates Mach bands & contour rings between shadow, midtone, and highlight)
          vec3 bezierPalette(vec3 cShadow, vec3 cMid, vec3 cHigh, float x) {
            float t = smoothstep(0.06, 0.94, clamp(x, 0.0, 1.0));
            return mix(mix(cShadow, cMid, t), mix(cMid, cHigh, t), t);
          }

          // Safe upward & downward smoothsteps (guarantees lowEdge < highEdge on WebGL 1.0 D3D11 for both normalized & pixel ranges)
          float safeStep(float lowEdge, float highEdge, float x) {
            float hi = max(lowEdge + 0.0001, highEdge);
            return smoothstep(lowEdge, hi, x);
          }
          float fadeDown(float lowEdge, float highEdge, float x) {
            float hi = max(lowEdge + 0.0001, highEdge);
            return 1.0 - smoothstep(lowEdge, hi, x);
          }

          // Exact 2D Signed Distance Function to a Rounded Rectangle
          float sdRoundedBox(vec2 p, vec2 center, vec2 halfSize, float r) {
            vec2 q = abs(p - center) - (halfSize - vec2(r));
            return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
          }

          // Smooth C2 Interior Distance Helper (eliminates 45-degree diagonal miter creases inside rectangles)
          float smoothInterior(vec2 q) {
            vec2 a = max(-q, vec2(0.0));
            float k = 64.0;
            float h = max(k - abs(a.x - a.y), 0.0) / k;
            return -max(0.0, min(a.x, a.y) - h * h * k * 0.25);
          }

          // Smooth C1 Maximum (union of overlapping convex cumulus pillows without flat interference plateaus)
          float sMax(float a, float b, float k) {
            float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
            return mix(a, b, h) + k * h * (1.0 - h);
          }

          // Seamless 360-degree Periodic Non-Colinear Cumulus Dome Envelope:
          // - Evaluates overlapping circular-parabolic cloud pillows around angle in [-pi, pi]
          // - Uses wrapped integer cell indices so there is ZERO branch cut at +-pi
          // - Every pillow has a distinct peak height (0.02..1.00) and distinct bay depth so
          //   neither peaks nor bays ever align along a straight horizontal or vertical line!
          float cumulusDomeTrainPeriodic(float angle, float numCells, float t, float seed) {
            float cell = (angle / 6.2831853 + 0.5) * numCells;
            float k0 = floor(cell);
            float env = 0.0;
            for (int i = -1; i <= 1; i++) {
              float k = k0 + float(i);
              float kWrap = mod(mod(k, numCells) + numCells, numCells);
              float h1 = fract(sin(kWrap * 127.1 + seed * 311.7) * 43758.5453);
              float h2 = fract(sin(kWrap * 269.5 + seed * 183.3) * 43758.5453);
              float center = k + 0.5 + (h1 - 0.5) * 0.28 + 0.12 * sin(t * 0.22 + kWrap * 2.1 + seed);
              float width  = 0.54 + 0.18 * h2;
              float u = (cell - center) / width;
              float cap = pow(clamp(1.0 - u * u, 0.0, 1.0), 0.85);
              float wave1 = 0.5 + 0.5 * sin(kWrap * 2.15 + t * 0.20 + seed);
              float wave2 = 0.5 + 0.5 * cos(kWrap * 3.45 - t * 0.16 + seed * 1.7);
              float rawH  = smoothstep(0.14, 0.86, h2 * 0.42 + wave1 * 0.36 + wave2 * 0.22);
              float peakH = 0.04 + 0.96 * pow(rawH, 1.30);
              env = sMax(env, cap * peakH, 0.06);
            }
            return clamp(env, 0.0, 1.0);
          }

          // Soft, Broad Isotropic Cumulus Pillow Field for Varied Card Perimeter Billows
          // Uses wide, gentle wavelengths (420px, 220px, 115px) with soft gradients (zero blotches or swirls)
          vec3 sampleEdgePuffLobes(vec2 p, float t) {
            const mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);
            vec2 u1 = (p + vec2(t * 16.0, sin(t * 0.14) * 12.0)) / 420.0;
            float p420 = smoothstep(0.08, 0.92, gnoise(u1));

            vec2 u2 = rot * ((p + vec2(t * 22.0, -cos(t * 0.18 + 1.4) * 14.0)) / 220.0) + vec2(4.7, 9.1);
            float p220 = smoothstep(0.10, 0.90, gnoise(u2));

            vec2 u3 = rot * ((p + vec2(t * 28.0, sin(t * 0.22 + 2.7) * 10.0)) / 115.0) + vec2(11.3, 3.8);
            float p115 = smoothstep(0.12, 0.88, gnoise(u3));

            return vec3(p420, p220, p115);
          }

          // Plush, Velvety 6-Octave Atmospheric Cumulus FBM
          // (380px -> 195px -> 100px -> 50px -> 25px -> 12.5px)
          // Soft, billowing cumulus pillows with natural volume and zero blotchy/psychedelic contrast!
          // Returns vec3(macroWave, softPuffs, mistWisps) in [0.0, 1.0]
          vec3 sampleSoftCloudFBM(vec2 rawP, vec2 driftOffset, float t, float layerSeed) {
            const mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);

            // Horizontally-relaxed coordinates for soft, expansive cloud banks
            vec2 baseP = vec2((rawP.x + driftOffset.x) * 0.72, rawP.y + driftOffset.y) / 380.0 +
                         vec2(layerSeed, layerSeed * 0.61);

            // Gentle large-scale domain flow (0.28 amplitude -> natural cloud drift with zero swirls!)
            vec2 warp1 = vec2(
              gnoise(baseP * 0.76 + vec2(t * 0.009, 1.9)) - 0.5,
              gnoise(baseP * 0.76 + vec2(6.4, -t * 0.007)) - 0.5
            );
            vec2 q = baseP + warp1 * 0.28;

            // Octave 1 (380px): Broad, velvety cloud bank
            float n1 = gnoise(q);
            q = rot * q * 1.94 + vec2(7.3 + layerSeed, 11.9) + warp1 * 0.14;

            // Octave 2 (195px): Soft primary cumulus pillow
            float n2 = gnoise(q);
            q = rot * q * 1.96 + vec2(13.7, 5.4 + layerSeed);

            // Octave 3 (100px): Soft secondary cloud dome
            float n3 = gnoise(q);
            q = rot * q * 1.98 + vec2(4.9, 19.1);

            // Octave 4 (50px): Powdery vapor contour
            float n4 = gnoise(q);
            q = rot * q * 2.00 + vec2(21.4, 8.7);

            // Octave 5 (25px): Soft misty edge feather
            float n5 = gnoise(q);
            q = rot * q * 2.02 + vec2(9.2, 15.3);

            // Octave 6 (12.5px): Fine velvety rim diffusion
            float n6 = gnoise(q);

            // Natural cumulus pillow ranges [0.18..0.82] so cloud domes have plush, visible form with soft edges:
            float macroWave = smoothstep(0.18, 0.82, n1 * 0.58 + n2 * 0.42);
            float softPuffs = smoothstep(0.20, 0.80, n2 * 0.44 + n3 * 0.36 + n4 * 0.20);
            float mistWisps = smoothstep(0.20, 0.80, n4 * 0.44 + n5 * 0.36 + n6 * 0.20);

            return vec3(macroWave, softPuffs, mistWisps);
          }

          // Gentle, Swirl-Free Atmospheric Cushion Advection (zero tight whirlpools or spiral distortion)
          vec3 advectFluidDomain(vec2 p) {
            vec2 disp = vec2(0.0);
            float evapTke = 0.0;

            vec2 ptrPos = u_pointer.xy;
            vec2 ptrVel = u_pointer.zw;
            float ptrSpd = length(ptrVel);
            if (ptrSpd > 0.15 && ptrPos.x > -2000.0) {
              vec2 d = p - ptrPos;
              float rSq = dot(d, d);
              float radius = 320.0;
              if (rSq < radius * radius) {
                float dist = sqrt(rSq + 1.0);
                float coreReg = dist / sqrt(rSq + 96.0 * 96.0);
                vec2 rHat = (d / dist) * coreReg;
                vec2 uHat = ptrVel / ptrSpd;
                float align = dot(rHat, uHat);
                float tRad = clamp(1.0 - dist / radius, 0.0, 1.0);
                float prox = tRad * tRad * (3.0 - 2.0 * tRad);
                vec2 dipoleDir = (1.4 * align * rHat - uHat * 0.50) * coreReg;
                float strength = min(7.0, ptrSpd * 0.32) * prox;
                disp -= dipoleDir * strength + ptrVel * prox * 0.18;
                evapTke += prox * min(0.08, ptrSpd * 0.0035);
              }
            }

            return vec3(p + disp, clamp(evapTke, 0.0, 0.18));
          }

          void main() {
            // Convert WebGL fragCoord to CSS pixel coordinates (top-left origin matching getBoundingClientRect)
            vec2 rawP = vec2(gl_FragCoord.x / u_dpr, u_resolution.y - (gl_FragCoord.y / u_dpr));
            float t = u_time;
            float isFront = u_layer;

            // Section & Card Coordinates
            float secTop = u_secBounds.x;
            float secBot = u_secBounds.y;

            vec2 mCenter = u_mainCard.xy;
            vec2 mHalf   = u_mainCard.zw;

            float stripTop    = u_stripRect.y - u_stripRect.w;
            float stripBottom = u_stripRect.y + u_stripRect.w;

            float normScreenX = clamp(rawP.x / max(1.0, u_resolution.x), 0.0, 1.0);

            // Slow right-to-left horizontal float-in offset at the end of the Hero video so the top clouds
            // visibly float in from right to left as they condense into place:
            float preReveal = clamp((u_heroCloudReveal * 1.52 - (1.0 - normScreenX) * 0.52) / 0.50, 0.0, 1.0);
            float preRevealSmooth = preReveal * preReveal * (3.0 - 2.0 * preReveal);
            float topFloatZone = fadeDown(secTop - 160.0, secTop + 210.0, rawP.y);
            vec2 floatInOffset = vec2(-(1.0 - preRevealSmooth) * 165.0 * topFloatZone, (1.0 - preRevealSmooth) * 24.0 * topFloatZone);

            // Advect pixel coordinate through gentle cushion field
            vec3 advected = advectFluidDomain(rawP + floatInOffset);
            vec2 p = advected.xy;
            float evapTke = advected.z;

            // Cohesive LEFTWARD Drift (+X added to domain moves cloud formations toward -X / LEFT)
            float driftSpeed = 20.0;
            vec2 driftOffset = vec2(t * driftSpeed, 0.0);
            float layerSeed = 0.0;

            vec3 fbm = sampleSoftCloudFBM(p, driftOffset, t, layerSeed);
            float macroWave = fbm.x;
            float softPuffs = fbm.y;
            float mistWisps = fbm.z;

            // =========================================================================
            // SOFT DIFFUSE TOP-RIGHT SUN SCATTERING (Zero High-Frequency Embossing!)
            // - Uses 90px and 38px optical depth baselines on ONLY the broad
            //   macroWave (380px) and softPuffs (195px) pillows so lighting across the
            //   cloud sea forms soft, plush 3D cumulus pillows with velvety edges.
            // =========================================================================
            vec2 sunPos = vec2(u_resolution.x * 0.95, secTop - 250.0);
            vec2 toSun = sunPos - p;
            float sunDistPx = length(toSun) + 1.0;
            vec2 sunDir = toSun / sunDistPx;

            vec3 fbmSunFar  = sampleSoftCloudFBM(p + sunDir * 90.0, driftOffset, t, layerSeed);
            vec3 fbmSunNear = sampleSoftCloudFBM(p + sunDir * 38.0, driftOffset, t, layerSeed);

            // Soft 3D cloud pillow slope facing the top-right sun (zero mistWisps embossing!):
            float macroSlope = clamp(
              0.50 + (macroWave - fbmSunFar.x) * 0.85 + (softPuffs - fbmSunNear.y) * 0.42,
              0.0,
              1.0
            );
            // Soft forward-scattered golden/peach rim glow on upper-right cloud crests:
            float rimScatter = clamp(
              (macroWave - fbmSunNear.x) * 1.15 + (softPuffs - fbmSunNear.y) * 0.65,
              0.0,
              1.0
            );
            float softVolume = clamp(macroWave * 0.50 + softPuffs * 0.38 + mistWisps * 0.12, 0.0, 1.0);
            float pillowLight = clamp(softVolume * 0.48 + macroSlope * 0.44 + rimScatter * 0.14, 0.0, 1.0);

            // Smooth vertical billow displacement for section transitions & cumulus domes
            float billowDisp = (macroWave - 0.5) * 68.0 + (softPuffs - 0.5) * 32.0 + (mistWisps - 0.5) * 12.0;
            float wispyEdge = 0.64 + 0.36 * (softPuffs * 0.58 + mistWisps * 0.42);
            float wakeFade = 1.0 - evapTke * 0.30;

            // =========================================================================
            // 1. UNIFIED SOFT CUMULUS CLOUD FIELD (Hero -> Builds -> Career)
            //    - Billowing, soft-edged cumulus domes along the top Hero horizon
            //      that rapidly condense into a plush, continuous cloud bed.
            // =========================================================================
            float topCrestWave = (macroWave - 0.5) * 84.0 + (softPuffs - 0.5) * 38.0 + (mistWisps - 0.5) * 14.0;

            // Slow right-to-left wave progression across the Hero seam:
            float rtlBillowLead = (1.0 - (macroWave * 0.62 + softPuffs * 0.38)) * 0.14;
            float rtlDelay = (1.0 - normScreenX) * 0.58 + rtlBillowLead;
            float rtlLinear = clamp((u_heroCloudReveal * 1.64 - rtlDelay) / 0.48, 0.0, 1.0);
            float rtlReveal = rtlLinear * rtlLinear * (3.0 - 2.0 * rtlLinear);

            float fullTopHorizonY = secTop - 102.0 - topCrestWave * 0.78;
            float hiddenTopHorizonY = secTop + 56.0 - topCrestWave * 0.22;
            float topHorizonY = mix(hiddenTopHorizonY, fullTopHorizonY, rtlReveal);

            // Soft, powdery 58px vapor feather at the upper cloud crest that locks to 100% solid cloud below:
            float topSpanUp = mix(14.0, 58.0, rtlReveal);
            float topUpperEnv = safeStep(topHorizonY - topSpanUp, topHorizonY + 24.0, p.y);
            float topRimWispy = mix(
              0.48 + 0.52 * (softPuffs * 0.56 + mistWisps * 0.44),
              1.0,
              safeStep(topHorizonY - 14.0, topHorizonY + 24.0, p.y)
            );
            float topWakeMod = mix(0.80 + 0.20 * wakeFade, 1.0, safeStep(topHorizonY - 8.0, topHorizonY + 24.0, p.y));
            float topUpperFeather = clamp(safeStep(0.02, 0.84, topUpperEnv * topRimWispy) * topWakeMod, 0.0, 1.0);

            // =========================================================================
            // 2. SOFT ATMOSPHERIC SUNSET SCATTERING (C-Infinity Bezier Color Ramps)
            //    - Plush cumulus pillow shading with zero Mach bands or contour rings!
            // =========================================================================
            float isMobileCard = step(mHalf.x, 300.0);
            float sdMainRaw = sdRoundedBox(rawP, mCenter, mHalf, mix(28.0, 20.0, isMobileCard));

            // Soft cumulus dome contour for the bottom transition into Career:
            float botCrestWave = (macroWave - 0.5) * 86.0 + (softPuffs - 0.5) * 40.0 + (mistWisps - 0.5) * 14.0;
            float botHorizonY = secBot + mix(86.0, 24.0, isMobileCard) + botCrestWave * mix(0.72, 0.44, isMobileCard);
            float seaLowerEnv = fadeDown(botHorizonY - 20.0, botHorizonY + 26.0, p.y);
            float botRimWispy = mix(1.0, wispyEdge, safeStep(botHorizonY - 22.0, botHorizonY + 10.0, p.y));
            float botSeamLock = fadeDown(secBot + mix(22.0, 6.0, isMobileCard), secBot + mix(34.0, 16.0, isMobileCard), rawP.y);

            float seaLowerFeather = mix(
              1.0,
              clamp(max(safeStep(0.05, 0.72, seaLowerEnv * botRimWispy), botSeamLock), 0.0, 1.0),
              safeStep(secBot - 4.0, secBot + 16.0, rawP.y)
            );

            // Localized sunlit cumulus pillow behind the left title cluster:
            vec2 titleCenter = vec2(mCenter.x - mHalf.x + 245.0, 0.5 * (secTop + 26.0 + u_headerBottom));
            vec2 titleRel = (p + vec2((macroWave - 0.5) * 82.0, (softPuffs - 0.5) * 32.0) - titleCenter) / vec2(295.0, 58.0);
            float titleCushion = exp(-dot(titleRel, titleRel)) * (0.70 + 0.30 * macroWave);

            float verticalDepth = safeStep(fullTopHorizonY, mCenter.y + 30.0, p.y + billowDisp * 0.60);
            float baseSeaDensity = (0.82 + 0.10 * verticalDepth + 0.08 * softVolume) * (1.0 - 0.26 * titleCushion);
            float seaStrength = clamp(baseSeaDensity * (0.84 + 0.16 * wakeFade), 0.0, 1.0);
            float seaLight = clamp(pillowLight + titleCushion * 0.18, 0.0, 1.0);

            // Soft, Plush Cool Atmospheric Sky-Blue Palette (smooth quadratic Bezier curve -> zero rings!):
            vec3 greyBlueCol = bezierPalette(
              vec3(0.49, 0.62, 0.78),
              vec3(0.76, 0.85, 0.94),
              vec3(0.98, 0.99, 1.00),
              seaLight
            );
            vec3 baseGreyBlueSea = mix(vec3(0.93, 0.97, 1.00), greyBlueCol, seaStrength);

            // Soft Sunset Rose-Peach / Dusty Mauve Palette (matching the soft reference photo):
            vec3 rosePinkCol = bezierPalette(
              vec3(0.55, 0.53, 0.69),
              vec3(0.89, 0.65, 0.69),
              vec3(0.99, 0.86, 0.82),
              seaLight
            );

            // Soft Sunset Gold / Warm Apricot-Cream Palette (top-right near the sun):
            vec3 solarGoldCol = bezierPalette(
              vec3(0.64, 0.54, 0.55),
              vec3(0.97, 0.72, 0.39),
              vec3(1.00, 0.94, 0.76),
              seaLight
            );

            // Compute gently cloud-warped optical distance from the top-right sun:
            float topDomeRim = smoothstep(fullTopHorizonY + 60.0, fullTopHorizonY - 22.0, p.y);
            float sunDx = max(0.0, (0.98 - normScreenX) - (macroWave - 0.5) * 0.11 - (softPuffs - 0.5) * 0.05);
            float sunDy = max(0.0, (p.y - (secTop - 108.0) - (macroWave - 0.5) * 48.0) / 475.0);

            // Golden fiber stream at x ~ 0.74 feeds warm amber light into the upper-right clouds:
            float fiberStreamGlow = exp(-pow((normScreenX - 0.74) / 0.11, 2.0)) *
                                    fadeDown(fullTopHorizonY - 20.0, secTop + 110.0, p.y + topCrestWave * 0.42) * 0.16;

            float rightwardSunGate = safeStep(0.22, 0.72, normScreenX + (macroWave - 0.5) * 0.12);
            float sunCatchBoost = ((macroSlope - 0.45) * 0.15 + rimScatter * 0.12 + topDomeRim * 0.09) * rightwardSunGate;
            float sunOptDist = clamp(length(vec2(sunDx * 1.06, sunDy * 0.95)) - fiberStreamGlow - sunCatchBoost, 0.0, 1.3);

            // Smooth 3-stage spectral transition:
            float goldWeight = fadeDown(0.05, 0.37, sunOptDist) * (0.50 + 0.50 * seaLight) * safeStep(0.45, 0.75, normScreenX + (macroWave - 0.5) * 0.10);
            float pinkEnv    = fadeDown(0.16, 0.65, sunOptDist) * rightwardSunGate * (0.46 + 0.54 * clamp(macroSlope * 0.58 + seaLight * 0.42, 0.0, 1.0));

            vec3 pinkToGreyBlue = mix(baseGreyBlueSea, rosePinkCol, clamp(pinkEnv * 0.88, 0.0, 0.88));
            vec3 upperToMidCol  = mix(pinkToGreyBlue, solarGoldCol, clamp(goldWeight * 0.90, 0.0, 0.90));

            // Soft Cumulus Domes Overhanging Career:
            float careerDomeDepth = safeStep(secBot - 110.0, secBot + 48.0, p.y + botCrestWave * 0.72);
            float botLowerRim = clamp(1.0 - (botHorizonY + 12.0 - p.y) / 44.0, 0.0, 1.0);
            float botDomeLight = clamp(pillowLight * 0.66 + botLowerRim * 0.40 - careerDomeDepth * 0.09, 0.0, 1.0);
            vec3 deepCareerCol = bezierPalette(
              vec3(0.47, 0.60, 0.76),
              vec3(0.75, 0.85, 0.945),
              vec3(0.98, 0.99, 1.00),
              botDomeLight
            );

            // Shared continuous cloud color at (x, y) used by BOTH --back and --front:
            vec3 sharedCloudCol = mix(upperToMidCol, deepCareerCol, careerDomeDepth);
            float finalAlpha = 0.0;
            vec3 finalCol = sharedCloudCol;

            if (isFront < 0.5) {
              // =======================================================================
              // 3A. BACKGROUND LAYER (--back, z-index: 2, BEHIND Main Card):
              // =======================================================================
              finalCol = sharedCloudCol;
              finalAlpha = clamp(topUpperFeather * seaLowerFeather, 0.0, 1.0);
            } else {
              // =======================================================================
              // 3B. FOREGROUND LAYER (--front, z-index: 8, IN FRONT of Card Backing):
              //     - Soft, powdery, varied cloud cushion around the card perimeter
              //       (keeps the card interior 100% crystal-clear with zero smoke veil!)
              // =======================================================================
              vec3 edgeLobes = sampleEdgePuffLobes(p, t);
              float bayLobe420 = edgeLobes.x;
              float midLobe220 = edgeLobes.y;
              float fgLobe115  = edgeLobes.z;

              float rMain = mix(36.0, 20.0, isMobileCard);
              vec2 qMain = abs(rawP - mCenter) - (mHalf - vec2(rMain));
              vec2 aMain = max(-qMain, vec2(0.0));
              float kMain = mix(30.0, 14.0, isMobileCard);
              float hMain = max(kMain - abs(aMain.x - aMain.y), 0.0) / max(1.0, kMain);
              float dInMain = -max(0.0, min(aMain.x, aMain.y) - hMain * hMain * kMain * 0.25);
              float sdMainSmooth = length(max(qMain, 0.0)) + dInMain - rMain;
              float inDistMain = mix(max(0.0, -sdMainRaw), max(0.0, -sdMainSmooth), smoothstep(0.0, 6.0, max(0.0, -sdMainRaw)));

              // Normalized position inside the card [-1..1]:
              vec2 cardRel = (rawP - mCenter) / max(vec2(1.0), mHalf);

              // Protect left editorial text block & right HUD cards on desktop while burying the 4 rounded corners:
              vec2 leftCopyDist = max(abs(cardRel - vec2(-0.34, 0.02)) - vec2(0.50, 0.72), vec2(0.0));
              float inLeftCopy = 1.0 - smoothstep(0.0, 0.18, length(leftCopyDist));
              vec2 rightHudDist = max(abs(cardRel - vec2(0.68, 0.06)) - vec2(0.20, 0.56), vec2(0.0));
              float inRightHud = 1.0 - smoothstep(0.0, 0.14, length(rightHudDist));
              float openSkyAndCorners = 1.0 - clamp(max(inLeftCopy * 0.65, inRightHud * 0.60), 0.0, 0.68);
              float cornerProx = smoothstep(0.60, 0.95, abs(cardRel.x)) * smoothstep(0.54, 0.94, abs(cardRel.y));

              // Soft, broad cumulus billow variation around the card perimeter:
              float rawSurge = bayLobe420 * 0.46 + midLobe220 * 0.34 + softPuffs * 0.20;
              float billowSurge = smoothstep(0.16, 0.84, rawSurge);
              float cumulusRim  = smoothstep(0.16, 0.84, midLobe220 * 0.50 + fgLobe115 * 0.32 + mistWisps * 0.18);

              // Mobile top photo banner zone (allow deeper organic clouds across top 184px photo):
              float mobTopPhotoZone = fadeDown(mCenter.y - mHalf.y + 130.0, mCenter.y - mHalf.y + 195.0, rawP.y);

              // Scalloped opaque rim + corner pad (keeps rounded corners covered while varying edge depth):
              float cornerOpaquePad = mix(36.0, 14.0, isMobileCard) * cornerProx * (0.70 + 0.30 * cumulusRim);
              float desktopCore = (5.0 + billowSurge * (14.0 + 12.0 * cumulusRim)) * openSkyAndCorners + cornerOpaquePad;
              float mobileCore  = mix(
                2.2 + billowSurge * 4.5 + cornerOpaquePad * 0.45,
                3.5 + billowSurge * 8.0 + cornerOpaquePad,
                mobTopPhotoZone
              );
              float scallopedCore = mix(desktopCore, mobileCore, isMobileCard);

              // Wide, powdery feather (36px in open bays up to 102px on soft cloud banks; zero interior smoke):
              float desktopFeather = (36.0 + billowSurge * (42.0 + 28.0 * cumulusRim)) * openSkyAndCorners;
              float mobileFeather  = mix(
                10.0 + billowSurge * 12.0,
                18.0 + billowSurge * (22.0 + 14.0 * cumulusRim),
                mobTopPhotoZone
              );
              float featherSpan = mix(desktopFeather, mobileFeather, isMobileCard);

              float mainMistAlpha = 0.0;
              if (sdMainRaw > 0.0) {
                mainMistAlpha = fadeDown(1.5, 24.0, sdMainRaw);
              } else {
                float lobeWarpPx = (cumulusRim - 0.5) * featherSpan * 0.30;
                float warpedInDist = max(0.0, inDistMain - scallopedCore - lobeWarpPx);
                float inFrac = clamp(warpedInDist / max(10.0, featherSpan), 0.0, 1.0);
                float baseDecay = pow(1.0 - smoothstep(0.0, 1.0, inFrac), 1.38);
                float softSculpt = mix(
                  1.0,
                  0.64 + 0.36 * (softVolume * 0.60 + cumulusRim * 0.40),
                  smoothstep(0.0, 0.52, inFrac)
                );
                mainMistAlpha = clamp(baseDecay * softSculpt, 0.0, 1.0);
              }

              float fgCardAlpha = mainMistAlpha * topUpperFeather * seaLowerFeather;

              if (fgCardAlpha > 0.001) {
                finalCol = sharedCloudCol;
                finalAlpha = max(finalAlpha, fgCardAlpha);
              }
            }

            if (finalAlpha <= 0.003) {
              gl_FragColor = vec4(0.0);
              return;
            }

            gl_FragColor = vec4(finalCol * finalAlpha, finalAlpha);
          }
        `;

        function compileShader(type, src) {
          const sh = gl.createShader(type);
          if (!sh) return null;
          gl.shaderSource(sh, src);
          gl.compileShader(sh);
          if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
            gl.deleteShader(sh);
            return null;
          }
          return sh;
        }

        const vs = compileShader(gl.VERTEX_SHADER, vsSource);
        const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
        if (!vs || !fs) {
          webglPlanes.set(canvas, null);
          return null;
        }

        const prog = gl.createProgram();
        if (!prog) {
          webglPlanes.set(canvas, null);
          return null;
        }
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
          gl.deleteProgram(prog);
          webglPlanes.set(canvas, null);
          return null;
        }

        const quadBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
          gl.STATIC_DRAW
        );

        const aPos = gl.getAttribLocation(prog, "a_pos");
        const locs = {
          u_resolution: gl.getUniformLocation(prog, "u_resolution"),
          u_dpr: gl.getUniformLocation(prog, "u_dpr"),
          u_time: gl.getUniformLocation(prog, "u_time"),
          u_layer: gl.getUniformLocation(prog, "u_layer"),
          u_secBounds: gl.getUniformLocation(prog, "u_secBounds"),
          u_mainCard: gl.getUniformLocation(prog, "u_mainCard"),
          u_stripRect: gl.getUniformLocation(prog, "u_stripRect"),
          u_headerBottom: gl.getUniformLocation(prog, "u_headerBottom"),
          u_heroCloudReveal: gl.getUniformLocation(prog, "u_heroCloudReveal"),
          u_pointer: gl.getUniformLocation(prog, "u_pointer"),
          u_subCards: [],
          u_vortices: []
        };
        for (let i = 0; i < 6; i++) {
          locs.u_subCards.push(gl.getUniformLocation(prog, `u_subCards[${i}]`));
        }
        for (let i = 0; i < 6; i++) {
          locs.u_vortices.push(gl.getUniformLocation(prog, `u_vortices[${i}]`));
        }

        const planeState = {
          gl,
          canvas,
          layerFlag,
          prog,
          quadBuf,
          aPos,
          locs,
          lastW: 0,
          lastH: 0
        };
        webglPlanes.set(canvas, planeState);
        return planeState;
      }

      function renderWebGLCloudsFrame(section, secRect, now, isPointerLive) {
        const canvases = section.querySelectorAll("[data-builds-webgl-clouds]");
        if (!canvases.length) return;

        // Compute Hero cloud edge reveal state in sync with the Hero story video timing:
        // - Hidden (0.0) when site first loads or "Watch the story" is selected while the story plays (t < 22.85s)
        // - Slowly floats in (0.0 -> 1.0) at the end of the video (~6.5 seconds total)
        const dtHero =
          lastHeroRevealPerfNow > 0
            ? Math.min(0.1, Math.max(0.001, (now - lastHeroRevealPerfNow) * 0.001))
            : 0.016;
        lastHeroRevealPerfNow = now;
        const heroEl = document.querySelector('section[data-page="home"] .career-hero');
        const heroVid = heroEl ? heroEl.querySelector(".home-hero-video-player") : null;
        const isReducedMotion =
          window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (isReducedMotion || !heroEl || heroEl.classList.contains("use-static-fallback") || window.__FORCE_INSTANT_CLOUD_REVEAL) {
          heroCloudRevealState = 1.0;
        } else {
          const isJourneyActive =
            heroEl.classList.contains("is-journey-active") &&
            !heroEl.classList.contains("is-settled-final");
          const vTime = heroVid ? heroVid.currentTime || 0 : 0;

          if (isJourneyActive) {
            if (vTime < 22.85) {
              heroCloudRevealState = 0.0;
            } else {
              const targetClimbReveal = Math.max(0.0, Math.min(0.18, (vTime - 22.85) / 3.2));
              heroCloudRevealState +=
                (targetClimbReveal - heroCloudRevealState) * Math.min(1.0, dtHero * 2.4);
            }
          } else {
            heroCloudRevealState = Math.min(1.0, heroCloudRevealState + dtHero * 0.16);
          }
        }

        let anyRendered = false;
        const firstCanvas = canvases[0];
        const cRect = firstCanvas.getBoundingClientRect();
        const cssW = Math.max(1, Math.round(cRect.width));
        const cssH = Math.max(1, Math.round(cRect.height));
        const rawDpr = Math.min(window.devicePixelRatio || 1, 1.5);
        const maxScale = cssW * rawDpr > 1920 ? 1920 / cssW : rawDpr;
        const dpr = Math.max(0.75, maxScale);
        const bufW = Math.max(1, Math.round(cssW * dpr));
        const bufH = Math.max(1, Math.round(cssH * dpr));

        // Top & Bottom Section DOM Seams relative to overhanging canvas top
        const secTopY = secRect.top - cRect.top;
        const secBotY = secRect.bottom - cRect.top;

        // Measure Main Active Card relative to overhanging canvas
        // On mobile (<= 768px), .carousel-active-media-top is only the top 184px banner, so measure the full .carousel-active-card!
        const isMobileLayout = (window.innerWidth || cssW) <= 768;
        const mainCardEl = isMobileLayout
          ? section.querySelector(".carousel-active-card:not(.carousel-transition-ghost)") ||
            section.querySelector(".carousel-active-card")
          : section.querySelector(".carousel-active-card:not(.carousel-transition-ghost) .carousel-active-media-top") ||
            section.querySelector(".carousel-active-card:not(.carousel-transition-ghost)") ||
            section.querySelector(".carousel-active-card");
        let mainCx = cssW * 0.5;
        let mainCy = cssH * 0.46;
        let mainHw = cssW * 0.44;
        let mainHh = 230;
        if (mainCardEl) {
          const mr = mainCardEl.getBoundingClientRect();
          mainCx = mr.left - cRect.left + mr.width * 0.5;
          mainCy = mr.top - cRect.top + mr.height * 0.5;
          mainHw = mr.width * 0.5;
          mainHh = mr.height * 0.5;
        }

        // Measure Header bottom relative to overhanging canvas
        const headerEl = section.querySelector(".home-carousel-header");
        let headerBotY = secTopY + 96;
        if (headerEl) {
          const hr = headerEl.getBoundingClientRect();
          headerBotY = hr.bottom - cRect.top;
        }

        // Measure Sub-Cards Loop Viewport & up to 6 visible Sub-Cards relative to overhanging canvas
        const loopVpEl = section.querySelector(".home-all-projects-loop-viewport");
        const visibleSubRects = [];
        let stripCx = cssW * 0.5;
        let stripCy = secBotY - 90;
        let stripHw = cssW * 0.45;
        let stripHh = 50;
        if (loopVpEl) {
          const lr = loopVpEl.getBoundingClientRect();
          const subCards = loopVpEl.querySelectorAll(".carousel-strip-card");
          let minSubTop = lr.top;
          let maxSubBot = lr.top + 98;
          for (let i = 0; i < subCards.length; i++) {
            const sr = subCards[i].getBoundingClientRect();
            if (sr.right > lr.left - 24 && sr.left < lr.right + 24 && sr.width > 20) {
              const clampedBot = Math.min(sr.bottom, sr.top + 108);
              if (visibleSubRects.length === 0) {
                minSubTop = sr.top;
                maxSubBot = clampedBot;
              } else {
                if (sr.top < minSubTop) minSubTop = sr.top;
                if (clampedBot > maxSubBot) maxSubBot = clampedBot;
              }
              if (visibleSubRects.length < 6) {
                visibleSubRects.push({
                  cx: sr.left - cRect.left + sr.width * 0.5,
                  cy: sr.top - cRect.top + Math.min(sr.height, 104) * 0.5,
                  hw: sr.width * 0.5,
                  hh: Math.min(sr.height, 104) * 0.5
                });
              }
            }
          }
          stripCx = lr.left - cRect.left + lr.width * 0.5;
          stripCy = (minSubTop + maxSubBot) * 0.5 - cRect.top;
          stripHw = lr.width * 0.5;
          stripHh = Math.max(44, (maxSubBot - minSubTop) * 0.5);
        }

        for (let cIdx = 0; cIdx < canvases.length; cIdx++) {
          const canvas = canvases[cIdx];
          const layerFlag = canvas.getAttribute("data-builds-webgl-clouds") === "back" ? 0.0 : 1.0;
          const st = initWebGLCloudRenderer(canvas, layerFlag);
          if (!st) continue;
          anyRendered = true;

          const gl = st.gl;
          if (st.lastW !== bufW || st.lastH !== bufH) {
            canvas.width = bufW;
            canvas.height = bufH;
            st.lastW = bufW;
            st.lastH = bufH;
            gl.viewport(0, 0, bufW, bufH);
          }

          gl.useProgram(st.prog);
          gl.bindBuffer(gl.ARRAY_BUFFER, st.quadBuf);
          gl.enableVertexAttribArray(st.aPos);
          gl.vertexAttribPointer(st.aPos, 2, gl.FLOAT, false, 0, 0);

          gl.uniform2f(st.locs.u_resolution, cssW, cssH);
          gl.uniform1f(st.locs.u_dpr, dpr);
          gl.uniform1f(st.locs.u_time, now * 0.001);
          gl.uniform1f(st.locs.u_layer, st.layerFlag);
          gl.uniform2f(st.locs.u_secBounds, secTopY, secBotY);
          gl.uniform4f(st.locs.u_mainCard, mainCx, mainCy, mainHw, mainHh);
          gl.uniform1f(st.locs.u_headerBottom, headerBotY);
          gl.uniform1f(st.locs.u_heroCloudReveal, heroCloudRevealState);
          gl.uniform4f(st.locs.u_stripRect, stripCx, stripCy, stripHw, stripHh);

          for (let i = 0; i < 6; i++) {
            const sc = visibleSubRects[i];
            if (sc) {
              gl.uniform4f(st.locs.u_subCards[i], sc.cx, sc.cy, sc.hw, sc.hh);
            } else {
              gl.uniform4f(st.locs.u_subCards[i], -9999, -9999, 10, 10);
            }
          }

          if (smoothPtrX > -9000 && Math.hypot(smoothPtrVx, smoothPtrVy) > 0.08) {
            gl.uniform4f(
              st.locs.u_pointer,
              smoothPtrX - cRect.left,
              smoothPtrY - cRect.top,
              smoothPtrVx,
              smoothPtrVy
            );
          } else {
            gl.uniform4f(st.locs.u_pointer, -9999, -9999, 0, 0);
          }

          const vCount = wakeVortices.length;
          for (let i = 0; i < 6; i++) {
            const v = i < vCount ? wakeVortices[i] : null;
            if (v) {
              const ageSec = Math.max(0, (now - (v.bornAt || now)) * 0.001);
              const tIn = Math.min(1, ageSec / 0.48);
              const rampIn = tIn * tIn * (3 - 2 * tIn);
              const tOut = Math.max(0, Math.min(1, (2.2 - ageSec) / 0.85));
              const fadeOut = tOut * tOut * (3 - 2 * tOut);
              gl.uniform4f(
                st.locs.u_vortices[i],
                v.x - cRect.left,
                v.y - cRect.top,
                v.gamma * rampIn * fadeOut,
                v.rc || v.r0 || 58
              );
            } else {
              gl.uniform4f(st.locs.u_vortices[i], -9999, -9999, 0, 58);
            }
          }

          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

        if (anyRendered) {
          if (!section.classList.contains("has-webgl-clouds")) {
            section.classList.add("has-webgl-clouds");
          }
          const homePage = section.closest('section[data-page="home"]');
          if (homePage && !homePage.classList.contains("has-webgl-section-clouds")) {
            homePage.classList.add("has-webgl-section-clouds");
          }
        }
      }

      function triggerCardWakeShockwave(originX, originY, dirX = 1, strength = 1) {
        const now = performance.now();
        // Spawn a counter-rotating vortex pair representing the card's aerodynamic wake
        spawnWakeVortexPair(originX - dirX * 90, originY - 40, dirX * 28, -4, 32 * strength, now);
        spawnWakeVortexPair(originX + dirX * 90, originY + 40, dirX * 28, 4, 32 * strength, now);

        const section = document.querySelector(".home-projects-carousel");
        if (!section) return;
        let layerIdx = 0;
        stateMap.forEach(st => {
          const el = section.querySelector(st.spec.sel);
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width * 0.5;
          const cy = rect.top + rect.height * 0.5;
          const dx = cx - originX;
          const dy = cy - originY;
          const dist = Math.hypot(dx, dy) || 1;
          const radius = st.spec.plane === "weave" ? 680 : 760;
          if (dist < radius) {
            const falloff = Math.pow(1 - dist / radius, 1.35);
            const push = falloff * 18 * strength;
            st.vx += (dx / dist) * push + dirX * falloff * (st.spec.plane === "weave" ? 11 : 7.5);
            st.vy += (dy / dist) * push * 0.58;
            // Alternate forward and backward Z-depth surge across layers when carousel cards move
            const depthSign = layerIdx % 2 === 0 ? 1 : -1;
            st.vzDepth += depthSign * falloff * 0.065 * strength;
            st.vShear += dirX * falloff * 2.8;
            st.vRot += (dy > 0 ? 1 : -1) * dirX * falloff * 1.5;
            st.tke = Math.min(1.25, st.tke + falloff * 0.52 * strength);
          }
          layerIdx++;
        });
      }

      window.addEventListener("pointermove", ev => {
        const section = document.querySelector(".home-projects-carousel");
        if (!section) return;
        const secRect = section.getBoundingClientRect();
        if (ev.clientY < secRect.top - 140 || ev.clientY > secRect.bottom + 140) return;

        const now = performance.now();
        const dvx = pointerX > -9000 ? Math.max(-28, Math.min(28, ev.clientX - pointerX)) : 0;
        const dvy = pointerY > -9000 ? Math.max(-28, Math.min(28, ev.clientY - pointerY)) : 0;
        pointerX = ev.clientX;
        pointerY = ev.clientY;
        if (smoothPtrX < -9000) {
          smoothPtrX = pointerX;
          smoothPtrY = pointerY;
        }
        pointerVx = pointerVx * 0.68 + dvx * 0.32;
        pointerVy = pointerVy * 0.68 + dvy * 0.32;
        pointerActiveUntil = now + 240;

        // If user is actively dragging the carousel stage, couple the drag motion into the mist layers
        const stageEl = section.querySelector("[data-carousel-stage].is-dragging");
        if (stageEl && Math.abs(dvx) > 1.5) {
          let dragLayerIdx = 0;
          stateMap.forEach(st => {
            const parallaxFactor = st.spec.plane === "weave" ? 0.55 : 0.32;
            st.vx += dvx * parallaxFactor;
            st.vzDepth += (dragLayerIdx % 2 === 0 ? 1 : -1) * Math.min(0.025, Math.abs(dvx) * 0.0012);
            dragLayerIdx++;
          });
        }

        const speed = Math.hypot(pointerVx, pointerVy);
        if (speed > 5.8 && now - lastVortexSpawnAt > 165) {
          lastVortexSpawnAt = now;
          spawnWakeVortexPair(pointerX, pointerY, pointerVx, pointerVy, speed, now);
        }
      }, { passive: true });

      document.addEventListener("click", ev => {
        const inCarousel = ev.target.closest(
          ".projects-carousel-section [data-carousel-step], .projects-carousel-section [data-carousel-dot], .projects-carousel-section [data-carousel-goto], .projects-carousel-section .carousel-peek-card, .projects-carousel-section .carousel-strip-card"
        );
        if (inCarousel) {
          const stepBtn = ev.target.closest("[data-carousel-step]");
          const isPrev =
            (stepBtn && stepBtn.getAttribute("data-carousel-step") === "-1") ||
            Boolean(ev.target.closest(".carousel-peek-card.is-prev"));
          const section = inCarousel.closest(".projects-carousel-section") || document.querySelector(".home-projects-carousel");
          const centerCard = section ? section.querySelector(".carousel-center-wrap") : null;
          if (centerCard) {
            const r = centerCard.getBoundingClientRect();
            triggerCardWakeShockwave(r.left + r.width * 0.5, r.top + r.height * 0.5, isPrev ? -1 : 1, 0.35);
          }
        }
      });

      function stepCloudPhysics(now) {
        const homePage = document.querySelector('section[data-page="home"]');
        const section = homePage && !homePage.hidden ? homePage.querySelector(".home-projects-carousel") : null;
        if (section) {
          const secRect = section.getBoundingClientRect();
          const isVisible = secRect.bottom > -240 && secRect.top < (window.innerHeight || 900) + 240;
          if (isVisible) {
            const isPointerLive = now < pointerActiveUntil;
            if (pointerX > -9000) {
              smoothPtrX += (pointerX - smoothPtrX) * 0.28;
              smoothPtrY += (pointerY - smoothPtrY) * 0.28;
            }
            if (isPointerLive) {
              smoothPtrVx += (pointerVx - smoothPtrVx) * 0.24;
              smoothPtrVy += (pointerVy - smoothPtrVy) * 0.24;
              pointerVx *= 0.92;
              pointerVy *= 0.92;
            } else {
              pointerVx *= 0.85;
              pointerVy *= 0.85;
              smoothPtrVx *= 0.90;
              smoothPtrVy *= 0.90;
            }
            const pointerSpeed = Math.hypot(smoothPtrVx, smoothPtrVy);

            // Advance & decay trailing Lamb-Oseen wake vortices (viscous core growth + TKE dissipation)
            for (let i = wakeVortices.length - 1; i >= 0; i--) {
              const v = wakeVortices[i];
              const ageSec = (now - v.bornAt) * 0.001;
              if (ageSec > 2.25 || Math.abs(v.gamma) < 8) {
                wakeVortices.splice(i, 1);
                continue;
              }
              v.x += v.vx;
              v.y += v.vy;
              v.vx *= 0.96;
              v.vy *= 0.96;
              v.gamma *= 0.972;
              v.tke *= 0.95;
              // Lamb-Oseen viscous core expansion: r_c(t) = sqrt(r_0^2 + 4 * nu_t * t)
              v.rc = Math.sqrt(v.r0 * v.r0 + 4 * 680 * ageSec);
            }

            let maxObservedTke = 0;

            stateMap.forEach(st => {
              const el = section.querySelector(st.spec.sel);
              if (!el) return;

              const rect = el.getBoundingClientRect();
              const cx = rect.left + rect.width * 0.5;
              const cy = rect.top + rect.height * 0.5;

              // 1. Continuous Convective Formation + Forward/Backward Z-Depth Layer Flight
              const theta = now * st.spec.speed + st.spec.phase;
              const convCycle = Math.sin(now * st.spec.convFreq + st.spec.phase * 1.7);
              // Continuous forward-and-backward layer breathing (moving toward/away from viewer in layer)
              const zWave = Math.sin(now * (st.spec.zFreq || 0.00055) + (st.spec.zPhase || 0));
              const targetZDepth = zWave * (st.spec.zAmp || 0.14);

              const targetWindX = Math.sin(theta) * st.spec.ampX;
              // Updraft rises during condensation phase (convCycle > 0)
              const targetWindY = Math.cos(theta * 1.35) * st.spec.ampY - convCycle * 6.5 + st.buoyancy;

              // 2. Potential-Flow Bow Pressure Wave + 3D Depth Parting ahead of the moving cursor
              if (isPointerLive && pointerSpeed > 0.5) {
                const dx = cx - pointerX;
                const dy = cy - pointerY;
                const dist = Math.hypot(dx, dy) || 1;
                const radius = st.spec.plane === "weave" ? 520 : 580;

                if (dist < radius) {
                  const rx = dx / dist;
                  const ry = dy / dist;
                  const ux = pointerVx / pointerSpeed;
                  const uy = pointerVy / pointerSpeed;
                  // Alignment with object velocity vector (> 0 means ahead in the bow wave, < 0 means in the trailing wake)
                  const forwardAlignment = rx * ux + ry * uy;
                  const proximity = Math.pow(1 - dist / radius, 1.35);

                  // Potential dipole streamline displacement: parts mist layers laterally perpendicular to trajectory
                  const dipoleStrength = proximity * (1.45 + Math.min(3.8, pointerSpeed * 0.095));
                  const bowVx = (2 * forwardAlignment * rx - ux) * dipoleStrength;
                  const bowVy = (2 * forwardAlignment * ry - uy) * dipoleStrength * 0.68;

                  st.vx += bowVx + pointerVx * proximity * 0.11;
                  st.vy += bowVy + pointerVy * proximity * 0.075;

                  // Push mist layers forward/backward in Z-depth as cursor glides through the cloud
                  st.vzDepth += (forwardAlignment > 0 ? 0.012 : -0.014) * proximity * Math.min(2.2, pointerSpeed * 0.08);

                  // Cross-product torque: curls left-side clouds CCW and right-side clouds CW
                  const crossZ = ux * ry - uy * rx;
                  st.vRot += crossZ * proximity * (0.45 + Math.min(1.6, pointerSpeed * 0.04));
                  st.vShear += (pointerVx * 0.036) * proximity;

                  // Bow rim adiabatic compression vs wake entrainment TKE
                  if (forwardAlignment > 0.35 && dist > radius * 0.45) {
                    // Brief adiabatic flash-condensation at the outer bow rim
                    st.lwc = Math.min(1.06, st.lwc + proximity * 0.014);
                  } else {
                    // Wake turbulent kinetic energy injection (drives entrainment & evaporation)
                    st.tke = Math.min(1.25, st.tke + proximity * (0.048 + Math.min(0.10, pointerSpeed * 0.0035)));
                  }
                }
              }

              // 3. Lamb-Oseen Trailing Wake Vortex Street Interaction
              for (let i = 0; i < wakeVortices.length; i++) {
                const v = wakeVortices[i];
                const dx = cx - v.x;
                const dy = cy - v.y;
                const rSq = dx * dx + dy * dy;
                const maxRSq = 420 * 420;
                if (rSq < maxRSq && rSq > 4) {
                  const r = Math.sqrt(rSq);
                  const rcSq = (v.rc || 60) * (v.rc || 60);
                  // Lamb-Oseen tangential velocity: v_theta = (Gamma / (2*pi*r)) * (1 - exp(-r^2 / rc^2))
                  const coreFactor = 1 - Math.exp(-rSq / rcSq);
                  const vTheta = (v.gamma / (2 * Math.PI * r)) * coreFactor * 0.052;
                  // Tangential unit vector (-dy/r, dx/r)
                  st.vx += (-dy / r) * vTheta;
                  st.vy += (dx / r) * vTheta * 0.68;

                  // Gaussian vorticity core omega = (Gamma / (pi * rc^2)) * exp(-r^2 / rc^2)
                  const vortexProximity = Math.exp(-rSq / (rcSq * 2.2));
                  st.vRot += (v.gamma > 0 ? 1 : -1) * vortexProximity * 0.16;
                  st.vShear += (-dy / r) * vTheta * 0.12;
                  st.tke = Math.min(1.25, st.tke + vortexProximity * v.tke * 0.09);
                }
              }

              // 4. Turbulent Entrainment, Inhomogeneous Mixing Evaporation & Evaporative Cooling Buoyancy
              const prevLwc = st.lwc;
              const evapRate = st.tke * 0.048;
              const condRate = (1.0 - st.lwc) * (0.026 + Math.max(0, convCycle) * 0.014);
              st.lwc = Math.max(0.22, Math.min(1.06, st.lwc - evapRate + condRate));

              const dLwc = st.lwc - prevLwc;
              if (dLwc < 0) {
                // Evaporative cooling downdraft (sinks slightly as droplets evaporate)
                st.buoyancy = Math.min(14, st.buoyancy + (-dLwc) * 26);
              } else {
                // Convective warming restores upward loft
                st.buoyancy *= 0.94;
              }

              // Viscous dissipation of TKE (Kolmogorov cascade)
              st.tke *= 0.935;
              if (st.tke > maxObservedTke) maxObservedTke = st.tke;

              // 5. Navier-Stokes Damped Spring-Fluid Integration for Macro Cloud Formation + Z-Depth Layering
              st.vx += (targetWindX - st.x) * 0.016;
              st.vy += (targetWindY - st.y) * 0.018;
              st.vx *= 0.915;
              st.vy *= 0.915;
              st.x += st.vx;
              st.y += st.vy;

              st.vzDepth += (targetZDepth - st.zDepth) * 0.022;
              st.vzDepth *= 0.90;
              st.zDepth = Math.max(-0.24, Math.min(0.28, st.zDepth + st.vzDepth));

              st.vRot += (0 - st.rot) * 0.032;
              st.vRot *= 0.88;
              st.rot = Math.max(-7.5, Math.min(7.5, st.rot + st.vRot));

              // Ambient Kelvin-Helmholtz wind shear + vortex shear
              const targetShear = Math.cos(theta) * 2.4;
              st.vShear += (targetShear - st.shear) * 0.028;
              st.vShear *= 0.89;
              st.shear = Math.max(-12, Math.min(12, st.shear + st.vShear));

              // Anvil spreading + Z-depth forward/backward layer scaling (flying through the cloud)
              const evapDeficit = Math.max(0, 1 - st.lwc);
              const depthZoom = 1 + st.zDepth;
              const anvilSpreadX = depthZoom * (1 + convCycle * 0.04 + evapDeficit * 0.28 + st.tke * 0.12);
              const anvilSpreadY = depthZoom * (1 - convCycle * 0.02 + evapDeficit * 0.14 - st.buoyancy * 0.003);
              // Layers advancing forward toward the camera softly thin like passing through mist; receding layers condense
              const depthAlphaMod = 1 - st.zDepth * 0.22;
              const macroAlpha = Math.max(0.18, Math.min(1, st.spec.baseOpacity * st.lwc * depthAlphaMod));

              el.style.transform = `translate3d(${st.x.toFixed(1)}px, ${st.y.toFixed(1)}px, 0) rotate(${st.rot.toFixed(2)}deg) skewX(${st.shear.toFixed(2)}deg) scale(${anvilSpreadX.toFixed(3)}, ${anvilSpreadY.toFixed(3)})`;
              el.style.opacity = macroAlpha.toFixed(3);

              // 6. Sub-Parcel Microphysics (Inhomogeneous Mixing + Internal Layer Depth Breathing)
              const parcelEls = el.querySelectorAll("[data-cloud-parcel]");
              for (let p = 0; p < parcelEls.length && p < st.subParcels.length; p++) {
                const pEl = parcelEls[p];
                const sp = st.subParcels[p];
                const mass = parseFloat(pEl.getAttribute("data-parcel-mass") || "0.65");
                const susceptibility = Math.max(0.35, 1.35 - mass);

                const pPhase = now * 0.00072 + sp.phaseOffset;
                const convDriftX = Math.sin(pPhase) * (22 * susceptibility) + st.shear * 1.8 * susceptibility;
                const convDriftY = Math.cos(pPhase * 1.15) * (11 * susceptibility) + st.buoyancy * 0.65 * susceptibility;

                sp.vx += (convDriftX - sp.dx) * 0.042 + st.vx * 0.14 * susceptibility;
                sp.vy += (convDriftY - sp.dy) * 0.042 + st.vy * 0.12 * susceptibility;
                sp.vx *= 0.88;
                sp.vy *= 0.88;
                sp.dx = Math.max(-64, Math.min(64, sp.dx + sp.vx));
                sp.dy = Math.max(-36, Math.min(36, sp.dy + sp.vy));

                // Sub-parcel Z-depth counter-breathing (creates shifting internal mist layers moving forward & backward)
                const subZWave = Math.cos(pPhase * 0.85);
                const targetParcelLwc = Math.max(0.18, Math.min(1.04, (1.0 - evapDeficit * (0.45 + susceptibility * 0.75)) * (0.90 + subZWave * 0.12)));
                sp.lwc += (targetParcelLwc - sp.lwc) * 0.10;

                const pScaleX = 1 + subZWave * 0.11 * susceptibility + (1 - sp.lwc) * 0.22 * susceptibility;
                const pScaleY = 1 + Math.sin(pPhase * 0.85) * 0.09 * susceptibility + (1 - sp.lwc) * 0.12 * susceptibility;

                pEl.style.transformBox = "fill-box";
                pEl.style.transformOrigin = "center center";
                pEl.style.transform = `translate(${sp.dx.toFixed(1)}px, ${sp.dy.toFixed(1)}px) scale(${pScaleX.toFixed(3)}, ${pScaleY.toFixed(3)})`;
                pEl.style.opacity = sp.lwc.toFixed(3);
              }
            });

            // 7. Modulate SVG Filter Kolmogorov Turbulence & Alpha Erosion Thresholds during active wake entrainment
            globalStageTke += (maxObservedTke - globalStageTke) * 0.14;
            if (globalStageTke > 0.005) {
              const dispMaps = section.querySelectorAll("[data-cloud-disp-map]");
              for (let i = 0; i < dispMaps.length; i++) {
                const dm = dispMaps[i];
                const baseScale = parseFloat(dm.getAttribute("data-base-scale") || "84");
                const liveScale = baseScale + globalStageTke * 38;
                dm.setAttribute("scale", liveScale.toFixed(1));
              }
              const alphaMatrices = section.querySelectorAll("[data-cloud-alpha-matrix]");
              for (let i = 0; i < alphaMatrices.length; i++) {
                const am = alphaMatrices[i];
                const baseSlope = parseFloat(am.getAttribute("data-base-slope") || "1.15");
                const baseIntercept = parseFloat(am.getAttribute("data-base-intercept") || "-0.12");
                const liveSlope = baseSlope + globalStageTke * 0.22;
                const liveIntercept = baseIntercept - globalStageTke * 0.10;
                am.setAttribute(
                  "values",
                  `0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 ${liveSlope.toFixed(3)} ${liveIntercept.toFixed(3)}`
                );
              }
            }

            // Render Photorealistic Volumetric Cumulus Clouds on WebGL Canvas
            renderWebGLCloudsFrame(section, secRect, now, isPointerLive);

            pointerVx *= 0.85;
            pointerVy *= 0.85;
          }
        }
        requestAnimationFrame(stepCloudPhysics);
      }

      requestAnimationFrame(stepCloudPhysics);
    })();

    return { ARCH_NODES, EXPLODED_PARTS, TIMELINE_EXPLODED_SCENES, SCENE_WAYPOINTS, PROJECT_METADATA, PROJECTS_CATALOG, setCmdOpen };
  }

  return { ARCH_NODES, EXPLODED_PARTS, TIMELINE_EXPLODED_SCENES, SCENE_WAYPOINTS, PROJECT_METADATA, mount };
});
