# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Hiring managers, principal engineers, solutions architects, and technical leaders evaluating Josh Boyer for **technical solutions architecture** and **forward-deployed engineering/architecture** roles—positions that sit close to customer problems, business stakeholders, system boundaries, and hands-on implementation.

## Product Purpose

JoshBoyer.ca is an interactive personal portfolio and career-evidence system that demonstrates 20 years of technology generalist depth (beginning September 2006 at Dell), deep P&C and health/dental insurance systems experience (Grenville Mutual Insurance 2009–2022, Medavie Blue Cross 2022–present), and independent AI-assisted work-system architecture (**NEXUS**). Success means a visitor doesn't just read claims—they interactively inspect how Josh traces dependencies, bridges business rules and payloads, reconciles data transitions, and builds governed execution systems.

## Positioning

Unlike conventional developer portfolios that show isolated UI screenshots or generic résumé bullet points, JoshBoyer.ca treats career history and system design as an **inspectable architecture**: every chapter, integration boundary, SQL reconciliation flow, and NEXUS mechanism is backed by explicit evidence receipts, clear distinctions between delivered production work, completed analysis/design, and open proposals, and interactive telemetry that lets visitors probe how capabilities compound over time.

## Operating Context

Visitors arrive via desktop or mobile web browsers, often reviewing multiple candidates quickly before diving deep into specific architectural proof points (`#home`, `#projects`, `#projects/<slug>`, `#about`, plus `resume.html` and `career-guide.html`). They need immediate architectural authority in the first viewport, fast command/layer filtering across 14+ case studies, and an interactive "System Inspector / X-Ray" lens to toggle between executive business context and raw technical mechanisms (payloads, rules, SQL, schemas, failure modes, and provenance receipts).

## Capabilities and Constraints

- **Static portfolio and private chat:** The public portfolio is served from `dist/` using vanilla HTML, CSS and JavaScript. The private general-purpose assistant supports natural conversation, with canonical portfolio evidence and request traces in a separate panel. It uses same-origin requests through an authenticated Cloudflare Worker to an AWS backend and Cloudflare AI Gateway. Generated prose is distinct from verified source records. Public access remains disabled; voice, retrieval and MCP tools are later phases.
- **Career accuracy & corpus alignment (`JOSH-BOYER-PORTFOLIO-CORPUS.md` & `AGENTS.md`):**
  - Historical responsibilities do not create a formal Architect job title.
  - Dell starts September 2006 (Gloves Off team, Latitude/OptiPlex support; no resolution-rate percentage asserted).
  - Harris (2007–2009): NOC/project technician, repeatable SBS swing migrations across Exchange and Active Directory.
  - Grenville (2009–2022): overlapping infrastructure (HQ move, ESXi transition), systems analysis, P&C rating/underwriting rules, SOAP/XML and REST broker integrations, and user-reported renewal-only automation (~80% residential, ~60% commercial, ~40% farm/agri). Formal analyst transition date between 2014 and 2016 remains unresolved.
  - Medavie (2022–present): provider integration (solution review, mapping, scheduled event table + REST consumer; no Kafka/real-time broker claimed), production takeover-history Excel/VB/XML validation tooling, hand-written claims SQL and financial reconciliation, and completed reporting-continuity analysis/design (service go-live unconfirmed; modernization remains proposed).
  - Independent builds: **NEXUS** (`https://run.nexus/`) is the active independent capstone (scoped context, explainable routing, recoverable execution). LOWKEY and Workshop42 (`https://ws42.ca`) remain historical/personal evidence.
- **Automated verification:** Must pass `npm test` (`tests/living-scenes.test.cjs`, including SHA-256 integrity checks on the 16 `<template id="project-...">` blocks, the 5 `.proof-content` blocks, brand assets, and `living-scenes.js` invariants) and `npm run check`.

## Brand Commitments

- **Headline thesis:** "Business context. Technical depth. Practical delivery."
- **Visual & interactive commitment:** A sharp, high-contrast, edgy architectural identity (precision grid, technical mono telemetry, bold dark/high-contrast surfaces) paired with four signature interactive capabilities:
  1. Interactive System & Dependency Graph in the hero / career tree.
  2. Interactive Case-Study Explorer & Command Palette (`Ctrl+K` / `/` + layer filters across Payloads/APIs, Rules Engines, SQL/ETL, Infrastructure, AI).
  3. Hands-on "System Inspector / X-Ray" toggle on cards and phases to expose schemas, routing logic, failure modes, and evidence receipts alongside the preserved narrative.
  4. Rich kinetic canvas, precision cursor/node telemetry, and interactive phase controls.
- **Assets:** Official employer marks (`dell-official.svg`, `grenville-official.png`, `medavie-official.svg`), NEXUS folded-N mark (`nexus-mark.png`) and `Audiowide` wordmark, and preserved raster plates (`career-milestones-context.png`, `solution-design-hero-v1.png`, `nexus-governed-work-v1.png`, `barron-canyon-about.png`).

## Evidence on Hand

- 16 verified case study templates in `dist/index.html` and structured career evidence in `dist/career-evidence.v3.json`.
- Authoritative career narrative and boundaries in `JOSH-BOYER-PORTFOLIO-CORPUS.md`.
- No fabricated metrics, employer financial totals, private schemas, or unverified job titles may ever be introduced.

## Product Principles

1. **Inspectable Systems Over Static Prose:** Let visitors probe dependencies, filter by architectural layer, and toggle X-Ray technical telemetry rather than passively scrolling a wall of text.
2. **Evidence With Integrity:** Every interactive diagram, X-Ray overlay, and system node must strictly honor verified corpus facts and distinguish delivered systems, completed analysis, and proposals.
3. **Edgy Architectural Precision:** The interface itself is proof of technical craft—high-contrast telemetry, crisp structural hairlines, responsive kinetic feedback, and zero generic corporate fluff.
4. **Progressive Depth Without Friction:** First-time visitors grasp the thesis and capstone power in seconds; deep evaluators can command-search (`Ctrl+K`), inspect raw mechanisms, or jump straight to case receipts.
