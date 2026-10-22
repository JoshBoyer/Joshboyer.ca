---
version: 1
slug: career-reference
primary_target: dist/career-reference.js
related_targets:
  - dist/career-reference.css
---

# Career overview

Version: 1.0 | Updated: 2026-10-22

**Mode:** Experience. Help a hiring reviewer see how Josh's infrastructure, insurance and independent AI work connect, then inspect the supporting case studies.

**Visual authority:** Josh's attached Career-page reference, supplied October 22. Preserve its dark navy ground, gold headline/action emphasis, teal → blue → violet → gold career sequence, three-floor isometric illustration, wave timeline, four chapter cards and connected hexagonal skills composition.

**Implementation:** Dedicated static module and stylesheet, loaded before/after the shared workbench as appropriate. The shared workbench creates the route and supplies the existing detailed timeline. Native chapter disclosures, keyboard focus, skills filters and case-study links remain real controls around the conceptual raster artwork.

**Content boundaries:** Dell begins September 2006; Harris is 2007–2009; Grenville is 2009–2022; Medavie begins 2022. NEXUS is separate independent work. The reference's “18 years in insurance” and numeric proficiency scores are not evidence; show insurance since 2009 and concrete capability evidence instead. Preserve approved project templates and proof blocks.

**Responsive behaviour:** Four columns on desktop; two at intermediate widths; stacked chapter cards, two-column impact legend and single-column skills content on mobile. Keep the artwork visible and all text readable without horizontal scrolling. Reduced motion disables transitions and smooth journey scrolling.

**Verification:** Desktop 1440 × 1000 and mobile 390 × 844; chapter keyboard activation and case navigation; skills filtering; actual story-video playback; existing and evidence-link integrity tests; JavaScript syntax. No deployment performed.

**Artwork:** `dist/assets/career-layers-v1.webp`; generation prompt and provenance in `knowledge/design/career-layers-v1-provenance.md`.
