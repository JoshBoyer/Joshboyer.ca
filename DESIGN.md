# Design System — JoshBoyer.ca

## Aesthetic Direction & World
- **World:** Architectural Telemetry & Dependency Workbench.
- **Point of View:** Refuses polite, static white-card corporate résumé templates in favor of a high-contrast, dark obsidian-slate architectural environment (`#070b14` / `#0c1220`) where system boundaries, payload mappings, SQL reconciliation flows, and governed AI execution (**NEXUS**) are inspectable first-class citizens.
- **Physical Scene:** An architect's late-evening telemetry and dependency workstation—high-contrast structural hairlines (`1px`), crisp tabular coordinates, and zero decorative neon halos or nested card clutter.

## Color Tokens (`dist/architect-workbench.css`)
- `--bg-void: #070b14` — Primary page ground.
- `--bg-surface: #0c1220` — Primary architectural panels and proof surfaces.
- `--bg-elevated: #11192c` — Interactive controls, active tabs, and toolbars.
- `--bg-panel: #162038` — Hover states and emphasized inspection surfaces.
- `--ink: #ecf2fc` — Primary body copy (>13:1 contrast on `--bg-void`).
- `--ink-bright: #ffffff` — Display headings and active labels.
- `--muted: #9eb0ce` — Secondary tinted slate copy (>7.5:1 contrast on `--bg-void` / `--bg-surface`, never neutral gray).
- `--blue: #60a5fa` — Interactive text links, active phase indicators, and focus outlines (>7.2:1 contrast on dark surfaces).
- `--blue-fill: #1d4ed8` — Primary action button fill with `#ffffff` text (>6.7:1 contrast).
- `--cyan: #22d3ee` — Active dependency traces, node telemetry codes, and X-Ray inspector highlights.
- `--emerald: #34d399` — Verified production delivery status badges and data-flow traces.
- `--amber: #fbbf24` — Completed analysis/design and proposal status distinctions.
- `--line: #1e2d4a` / `--line-bright: #2e446e` — Structural `1px` dividers and panel boundaries.

## Typography & Hierarchy
- **Display & UI Face:** `Manrope` (`assets/manrope-regular.ttf`, `assets/manrope-extrabold.ttf`), weights `400–800`, tight display tracking (`-0.035em` to `-0.04em`), balanced headings (`text-wrap: balance`).
- **Capstone Wordmark Face:** `Audiowide` (`assets/audiowide.ttf`) reserved exclusively for **NEXUS** brand headings and run links.
- **Telemetry & Data Face:** System tabular monospace (`--mono: ui-monospace, "Cascadia Mono", "SFMono-Regular", Menlo, Monaco, Consolas, monospace`) with `font-variant-numeric: tabular-nums` used strictly for node coordinates (`L01 // DIAG` through `L06 // NEXUS`), scroll progress (`TRACE // 00%`), keyboard shortcuts (`Ctrl+K`), and data-flow pipelines.
- **Scale & Reading Floor:**
  - `h1`: `clamp(44px, 4.8vw, 70px)`, line-height `1.07`
  - `h2`: `clamp(30px, 3.35vw, 48px)`, line-height `1.12`
  - `h3`: `clamp(25px, 2.5vw, 34px)`, line-height `1.25`
  - Body & metadata `<p>` / `<li>` floor: `14px` (`0.875rem`), line-height `1.65–1.9`, measure `54ch–67ch`.

## Interactive Components & Signature Mechanics (`dist/architect-workbench.js`)
1. **Interactive System Dependency Workbench (`[data-arch-workbench]`):**
   - Lives in the first viewport inside `.solution-perspective`.
   - Renders a 6-node SVG dependency topology (`L01 // DIAG` → `L02 // DEPS` → `L03 // INFRA` → `L04 // RULES` → `L05 // CLAIMS` → `L06 // NEXUS`) with animated upstream trace pulses and a live telemetry readout (`BOUNDARY`, `MECHANISM`, `COMPOUNDS TO`, delivery status pill, and direct case study link).
2. **Perforated Select-Rail Scrubber (`.career-scrubber-rail`):**
   - Sticky horizontal phase rail above `.career-tree` displaying live scroll trace percentage (`TRACE // 00%–100%`) and 1-click phase jumping across all 6 career chapters.
3. **Hands-on System Inspector / X-Ray Mode (`[data-xray-master]` & `.xray-inspector-drawer`):**
   - Toggled globally from the sticky header (`X-Ray Inspector` button or keyboard shortcut `X`) or per-phase (`Inspect Architecture +`).
   - Reveals structured `SYSTEM BOUNDARY`, `ARCHITECTURAL MECHANISM`, `VERIFICATION STATUS`, and pipeline flow diagrams on career phases and case study detail views (`#project-detail`) while keeping verified narrative HTML bytes intact.
4. **Interactive Case-Study Explorer & Command Palette (`Ctrl+K`):**
   - Layer filter bar on `#projects` (`All Layers`, `Payloads & APIs`, `Rules & Underwriting`, `Data, SQL & ETL`, `Hardware & Infra`, `AI & Governed Work`) + live keyword search + per-row telemetry badges.
   - Global `Ctrl+K` modal palette for keyboard-driven navigation (`↑`/`↓`/`Enter`/`Esc`) across all 16 studies, career phases, and tools.
