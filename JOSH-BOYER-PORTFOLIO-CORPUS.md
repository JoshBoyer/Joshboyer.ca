# Josh Boyer — portfolio, career and personal knowledge corpus

**Version:** 1.0 · **Compiled:** 2026-10-18 · **Latest career interview evidence:** 2026-10-15  
**Purpose:** A detailed, portable account of Josh's experience, work, projects, career direction and recorded background, with the original evidence kept recoverable.

## How to use this document

The first sections reconcile the current portfolio with its detailed career notes. The appendices retain the full text of the website's case studies and the older source bundle's questionnaire answers. This is a working knowledge document: historical accounts, proposed work and completed work are labelled where their differences matter.

**Evidence order:** latest explicit firsthand correction → current corroborated account → original firsthand questionnaire → older résumé or portfolio prose → assistant interpretation. A newer generated summary does not automatically overrule an older direct answer. Conflicts that lack a clear correction remain open.

**Source key:**

- **S1 — Current website:** `dist/index.html`, imported unchanged from `portfolio-visual-update/dist/index.html`; includes 16 case templates and the career narrative.
- **S2 — Structured evidence:** `dist/career-evidence.v3.json`, dataset `2026-10-15.3`; 15 evidence chunks, 14 currently active. Earlier v1/v2 datasets are preserved.
- **S3 — Early-career account:** `knowledge/career/EARLY-CAREER-ACCOUNT.md`; records Josh's Dell/Harris narration and the September 2006 correction.
- **S4 — Grenville account:** `knowledge/career/GRENVILLE-ACCOUNT.md`; records detailed firsthand scope and the corrected renewal figures.
- **S5 — Career evidence and follow-up:** `knowledge/career/CAREER-EVIDENCE.md`; chronology, source résumé references and October 15 provider/history/reporting clarifications.
- **S6 — Career story revision:** `knowledge/career/CAREER-STORY-REVISION.md`; useful earlier synthesis, with several questions later resolved by S5/S2.
- **S7 — Older build bundle:** `knowledge/source-documents/supplemental/portfoliobuildbundle.md`; includes a candidate profile, 11 earlier cases, writing drafts, interview notes and a section described by its author as the raw questionnaire transcript.
- **S8 — Earlier sites:** preserved `supplemental/older-portfolio-data.js` and `supplemental/older-blog-about.astro`; useful historical wording, not automatic confirmation of every claim.
- **S9 — Conversation archive:** `knowledge/conversations/`; the accessible portfolio implementation conversation and public messages from local portfolio browser-review sessions.
- **S10 — Project records:** `knowledge/source-documents/`, plus `knowledge/source-catalogue.json`; design decisions, release notes, proposals and validation records.

## 1. Profile and professional direction

Josh Boyer is a technology generalist with approximately twenty years of professional technology experience, beginning in 2006, and substantial insurance experience spanning property and casualty (**P&C**) and health/dental claims. His work connects business requirements with technical design, implementation, integration behaviour and operational troubleshooting. [S1–S5]

The recurring career pattern is to investigate the real problem, trace the systems and people affected, make the requirements explicit, and stay involved closely enough to help the solution work. His evidence includes hardware diagnosis, network and identity migrations, physical infrastructure planning, insurance rules, broker integration, authenticated applications, claims-data loading, Structured Query Language (**SQL**) reporting and independent software development.

Current positioning is **“Technology generalist | Insurance technology | Integration and solution design.”** The website's headline is **“Business context. Technical depth. Practical delivery.”** Its central message is that understanding the implementation improves the quality of the design. [S1, S2]

Josh is interested in **technical solutions architecture** and **forward-deployed work**—roles close to the customer problem, the people making decisions and the implementation. Architecture describes demonstrated responsibilities and a target direction. Historical job titles must remain the titles actually held; the portfolio does not establish a formal Architect title at every employer. [S1, S7]

### Recorded location, links and availability

- **Name:** Josh Boyer.
- **Location recorded in older material:** Ottawa, Ontario, Canada; the older bundle additionally identifies the Vernon/Winchester area. Current residence was not independently rechecked.
- **Email recorded in earlier portfolio material:** `boyer.josh1985@gmail.com`.
- **GitHub:** <https://github.com/JoshBoyer>.
- **LinkedIn used by the existing site configuration:** <https://www.linkedin.com/in/josh-boyer-1b770618/>. An older bundle contains a differently punctuated slug; the profile destination has not been checked in this import.
- **Personal making site:** <https://ws42.ca>.
- **NEXUS product link used by the portfolio:** <https://run.nexus/>.
- **Work arrangement recorded in the older blog:** open to remote or hybrid opportunities. Treat this as a recorded preference requiring confirmation for a specific application. [S7, S8]

The phone number in the original bundle remains available in its preserved source; it is not repeated in this digest's profile. No birth date, citizenship, security clearance, family details or language certification is established by the current career dataset.

## 2. Career chronology

| Period | Employer | Supported role or responsibility | Date confidence |
| --- | --- | --- | --- |
| September 2006–2007 | Dell Canada | Corporate hardware / technical support; Latitude and OptiPlex; Gloves Off team | September start is an explicit firsthand correction; exact departure date is not reconciled here. |
| 2007–2009 | Harris / Ottawa Computer Services | Network Operations Centre (**NOC**) and project technician; infrastructure and migration work | Broad résumé-supported period, expanded by firsthand narration. |
| 2009–2022 | Grenville Mutual Insurance | Systems/network administration, infrastructure projects, systems analysis, policy rules and integrations | Tenure is consistent; responsibilities overlap. |
| Mid-2010s–2022, overlapping Grenville tenure | Grenville Mutual Insurance | Systems analysis, rating/underwriting rules, broker integration and application work | Formal analyst transition differs between 2014 and 2016 in résumé sources. |
| 2022–present in the source account | Medavie / Medavie Blue Cross | Functional analyst; claims integration, solution review, data transitions and reporting | Earlier résumé sources give March 2022; current portfolio uses 2022–present. |
| Alongside professional work | Independent projects | NEXUS; historical LOWKEY; Workshop42 physical projects and personal lab work | Product-specific dates and maturity must be stated separately. |

The website's support → systems → infrastructure → analysis → solution design → independent builds sequence illustrates accumulated capability. It is not a series of mutually exclusive jobs. [S1–S6]

**Experience wording:** “About twenty years in technology” is consistent with a 2006 start. The older phrase “18 years in insurance technology” does not reconcile cleanly with insurance employment beginning in 2009 and must not be treated as a fresh exact calculation. [S1, S7, S8]

## 3. Dell — diagnosis and client communication

Josh joined Dell in **September 2006**, supporting Latitude laptops and OptiPlex desktops. He worked on the **Gloves Off** team. The team's model allowed enough time to investigate and resolve a client's problem, rather than optimizing the interaction primarily around short call duration. [S1–S3]

His contribution was practical hardware diagnosis: understand the symptom, work through the relevant hardware with the client, explain the next steps clearly, and try to prevent another call about the same unresolved issue. First-call resolution was the operating goal; the evidence does not provide a measured resolution percentage.

This chapter establishes an early working habit that recurs later: do not stop at the initial description of the problem. Understand what is actually failing and what the affected person needs to be able to do next.

**Case:** `#projects/dell`. **Supported tools/context:** Latitude, OptiPlex, hardware troubleshooting and client-facing technical explanation.

## 4. Harris — connected infrastructure and repeatable migrations

At Harris, the scope grew from NOC and corporate support into complete client infrastructure projects. Initial duties included installing, updating and replacing NOC nodes, resetting corporate passwords and email access, and supporting desktops and laptops. Later work included full racks, switches, firewalls and servers, as well as Harris's own internal infrastructure. [S1–S3]

Recorded technologies include Microsoft Exchange, Active Directory groups, Group Policy and BlackBerry Enterprise Server. The important technical thread was that network, email, identity and data changes affect each other.

### Small Business Server swing migrations

Customers outgrew Microsoft Small Business Server, which combined several infrastructure roles. Josh developed a repeatable **swing migration** process—a staged move between environments that keeps connected services and data in view—to separate those roles into infrastructure suited to the customer's growth.

His account specifically identifies Exchange and Active Directory dependencies, along with preserving data and email through the transition. A repeatable process is supported. A zero-loss guarantee, measured success rate or invented outage story is not.

Anonymized client contexts included aeronautics, fitness and power-services businesses; their public identities are not confirmed. Josh later moved to Grenville because he wanted to focus on one company. [S3]

**Case:** `#projects/foundations`. **Career value:** practical understanding of service dependencies, migration planning, repeatability and the consequences of change.

## 5. Grenville — infrastructure, insurance rules and integration

Grenville gave Josh overlapping responsibilities in a small technology team. He administered systems, carried infrastructure projects, moved into analysis, designed and implemented insurance rules, worked with vendors, and built application and support tooling. Another network administrator eventually took more daily operations as Josh concentrated on projects and analysis. [S1, S4]

### 5.1 Headquarters infrastructure and move

Josh took technical infrastructure from planning through the building work and the operational move. The supported scope connects networking, audiovisual systems (**AV**), physical security, cooling, resilient power and the infrastructure people needed on move-in. Uninterruptible power supply (**UPS**) and generator considerations were part of the technical plan. [S1, S4, S5]

He describes being proud of a smooth transition. The broader tenure also included moving a bare-metal blade centre to VMware ESXi; the exact virtualization project date is unestablished.

**Additional detail in the older firsthand questionnaire:** a 24,000-square-foot facility, a stated 2012 cutover, Cisco ASA, HP ProCurve switching, an APC 30 kW UPS, Kantech physical-access software and an ioProx-related product name with uncertain spelling. He recalled substantial difficulties getting the selected physical-access vendor's system working reliably. The older polished bundle adds cabling topology, conduit planning, virtual local area network (**VLAN**) segmentation, power/load planning, cooling calculations and server relocation. These details are retained as older source evidence; they have not all been independently revalidated. [S7]

**Date conflict:** the raw questionnaire says 2012; later career notes and the current case say approximately 2014. There is no explicit reconciliation in the imported material. Neither year should silently replace the other in a future résumé.

The older bundle also quotes a $5.3 million building budget and broad sole-ownership language. Those are not current approved public-case claims. Building cost must never be converted into a technology budget or a claim that Josh controlled that entire budget.

**Case:** `#projects/headquarters`.

### 5.2 Early policy download and broker data

The older questionnaire identifies daily policy download as Josh's first integration work. New-business, endorsement and renewal data went to brokerages through MASTERCOM and AL3/CSIO/ACORD-related formats. INI-file mappings connected items, coverages and risk fields such as firehall distance and roof type. New coverages or underwriting information required updates and testing; errors were investigated with brokers and their broker management system (**BMS**) providers. [S7]

The current approved account supports field, data and value transformations between CSIO/ACORD payloads and proprietary backend insurance fields, across residential, auto, farm and commercial workflows, in both upload and download directions. It establishes XML work and AL3/eDocs familiarity. Older references to JSON standards and some vendor names remain outside the current approved claim set. [S1, S2, S4]

### 5.3 Policy, billing and claims inquiry

Josh worked with business departments and his manager on requirements, mockups, mappings, request diagnosis and integration testing. Inquiry returned policy, billing and claims information, including downloadable Portable Document Format (**PDF**) documents, inside the broker's workflow. [S1, S4, S7]

The system boundary matters: information started in proprietary backend structures and had to arrive with the same meaning in the broker's system or portal. The supported interface history includes Simple Object Access Protocol (**SOAP**) requests carrying XML from desktop clients, with Representational State Transfer (**REST**) interfaces in the later backend.

The older questionnaire names Power Broker, TAM, Epic, SIG XP and CIM Data, with Brovada One as a portal context. Later summaries use Bravado/Bravado1 wording. These names should be checked against original implementation records before assuming identical vendor/product spellings.

A reported benefit was that brokers could investigate billing history directly, reducing calls to accounting. No measured call-reduction percentage is established. Claims inquiry let the broker retrieve an updated document as reserves and payments changed. [S7]

**Case:** `#projects/inquiry`.

### 5.4 Rating and underwriting rules

Josh personally designed and implemented rating and underwriting rules. He connected insurance requirements to the information collected, the mapped backend fields and the decision produced by the rules. The current sources support substantial hands-on rules work across residential, farm/agri and commercial contexts, together with auto underwriting and validation. [S1, S2, S4, S7]

The older questionnaire places the work in the Insurance Business System (**IBS**), built by MCCG, later described as Cognition+. It identifies a rules language, lookup tables and basic Java for edge cases. Modular rules and tables helped make rating changes more manageable and supported new products.

**Important boundary:** the older direct account explicitly says auto rating was regulated and vendor-managed. Josh handled auto underwriting logic and validation; it does not establish that he personally built the auto rate calculation. The current site's broad wording about “rating and underwriting” for auto should be read with that distinction.

### 5.5 The “vanilla policy” and fail-first design

Josh described a **vanilla policy** as a clean, standard risk that fit a defined coverage category, such as Plus, Standard or Limited. Cases outside those boundaries went to an underwriter. Examples in the earlier questionnaire contrast a newer home with modern natural-gas heating against an oil tank or a home with both a pool and daycare exposure. [S7]

The **fail-first** rule model began with referral as the default. Only after every required check passed could the outcome switch to an allowed automatic decision. This is deterministic business-rule automation: the result follows explicit conditions, rather than a learned model's prediction.

The same principle connected new business, endorsements and renewals, with transaction-specific differences. Human referral was a deliberate part of the design.

### 5.6 Auto and residential new business

The problem was incomplete risk information and a submission process burdened by manual intake. Josh worked on requirements, mappings, rules, missing-input validation, testing and interface specifications. The flow could ask for additional underwriting information that the BMS did not contain. [S1, S4, S7]

The older direct account describes this flow:

```text
Broker's BMS
    → mapped submission + missing risk questions
    → validation and underwriting rules
    → reject / refer / bind
    → backend policy record
    → policy number, data download and eDocs
```

Referral could create a backend record held for underwriting review. Suitable standard residential cases eventually achieved real-time bind with a policy number returned to the broker, followed by next-day data/documents associated with that number. The aim was to integrate with the broker's existing workflow and reduce the burden of another separate carrier portal. [S7]

“Weeks to minutes” appears in older prose as a qualitative comparison of mail, mailroom processing, re-keying and follow-up against an automated flow. It is not a measured universal service-level commitment.

**Case:** `#projects/newbusiness`.

### 5.7 Commercial quoting

Commercial risks often required more information than the broker's system stored. Josh worked with underwriting and vendor analysts/developers to define fields, values, interface stages, mappings and validation. The older account names Willis Towers Watson (**WTW**) as the development party. [S1, S4, S7]

His responsibility connected the requirements, workflow, data mapping and related rule implementation. **Vendor teams performed the commercial quoting application development.** It would be inaccurate to turn this into sole authorship of the entire commercial platform.

The additional information varied by commercial risk: a restaurant, place of worship and other businesses did not share one simple question set. The older account reports faster access to live quotes, without a defensible measured improvement percentage.

**Case:** `#projects/workflows`.

### 5.8 Policy changes and endorsements

The policy-change work made the proposed change visible before submission. The older questionnaire describes extracting the broker's complete changed policy, obtaining a comparison against inquiry data, returning a field-by-field comparison and gathering any missing information before applying validation, underwriting and rating. [S1, S4, S7]

Josh contributed comparison behaviour, rules, mappings, testing and interface/specification direction. New business, renewals and endorsements needed different transaction context. Outcomes could include correction, referral or binding where permitted.

**Case:** `#projects/changes`.

### 5.9 Renewal eligibility and exception routing

Josh personally designed the renewal classification framework and implemented rules that separated eligible standard renewals from cases requiring human review. The prior process involved underwriters manually opening policies, checking standards and discounts, renewing records and preparing documents. [S1, S4, S7]

**Corrected user-reported outcomes:**

| Renewal category | Approximate automation reported |
| --- | --- |
| Residential | 80% |
| Commercial | 60% |
| Farm/agri | 40% |

These figures are approximate, firsthand and **renewal-only**. They are not independently audited, are not rates for all insurance transactions and do not eliminate human review. Earlier “30–40% farm and commercial” wording is superseded by the later explicit correction. [S4]

The older questionnaire mentions a periodic property-value reassessment contributing to manual review, but the precise process name and cycle should be reconfirmed.

**Case:** `#projects/renewals`.

### 5.10 Authenticated document upload and support tooling

Josh built a C#/.NET portal that let external adjuster users submit supporting documents, quotes and images through an authenticated workflow into backend policy-management records. Proprietary REST Application Programming Interfaces (**APIs**) handled record placement. The implementation also used JavaScript, HTML, CSS and Bootstrap. [S1, S2, S4, S5]

Operational logging was part of the implementation. He also built an internal tool to retrieve/search logs and investigate recurring upload/download problems. This joined application delivery with the practical support path.

The portal became a **production business tool**. A résumé source gives a broad 2013–2018 range; a later summary places it approximately in 2018. No specific authentication protocol, encryption implementation or audited security certification is established.

**Case:** `#projects/upload`.

### 5.11 Late-tenure analysis

Toward the end of Grenville, Josh performed current/future-state analysis and wrote specifications for planned restructuring of policy administration, business classes and organizational structure. This is supported as analysis/design. A completed replacement platform is not established. [S4]

## 6. Medavie — claims integration, loading and reporting

Josh's recorded role is **Functional Analyst**, with claims adjudication, integration requirements, solution review, data transition and reporting responsibilities. He worked alongside architects, developers and delivery teams while remaining hands-on with tools and SQL. [S1, S2, S5]

### 6.1 Why the move

In the older questionnaire, Josh said Grenville let him wear many hats and encouraged learning. He encountered project-management, analysis and Agile frameworks that were difficult to apply in such a small team. Medavie offered the enterprise scale to experience those methods and structures. [S7]

He also described a practical enterprise trade-off: direct access to a chief executive or chief information officer is less available at scale, which can lengthen the path to decisions. This is a firsthand observation, not evidence of a particular failed governance process.

### 6.2 Provider data and synchronization solution review

Josh reviewed how ProviderRegistry changes reached adjudication, including source/consumer requirements, field mappings, missing information and synchronization behaviour. His account describes him as the solutions contributor reviewing the complete flow, rather than only providing generic subject-matter advice. [S1, S2, S5]

```text
Nightly publisher
    → event table
    → separate scheduled consumer
    → REST retrieval of provider data
    → adjudication system
```

This is **scheduled, table-backed publish/subscribe**: one job records changes and another scheduled job consumes them. The account supports solution review/design input, requirements and mappings. It does not establish Kafka, a dedicated message broker, real-time streaming, solo implementation or a separately confirmed go-live.

Source/destination platform acronyms remain unconfirmed; ProviderRegistry and adjudication system are the reliable generic names.

**Case:** `#projects/claims`. **Evidence chunks:** `experience-claims`, `experience-provider-sync-review`.

### 6.3 Takeover-history solution and loading tool

When a group changes insurers, prior claim history is needed so the new insurer can adjudicate accumulated benefit limits correctly. Incoming history could arrive in inconsistent spreadsheets or PDF-derived data. The receiving adjudication system expected a defined Extensible Markup Language (**XML**) structure. [S1, S2, S5, S7]

Josh researched the existing XML-based load, identified gaps, documented required schema changes in a solution document, helped define the solution with a developer, and guided implementation and maintenance. The account does **not** establish that he personally coded the schema changes.

He supported users with Excel templates, VB scripts and validation. The tooling ingested and mapped inconsistent data, checked types and values, generated schema-compatible XML, prepared manageable batch files and supported reconciliation of returned errors. The older questionnaire adds date/name/amount checks, splitting by file size or benefit, and consuming error XML to highlight affected rows. [S7]

The Excel tooling entered **production and was adopted by the team**. “VB scripts” is supported; the precise Visual Basic runtime—such as VBA versus VBScript—remains unresolved. Likewise, the exact public adjudication-platform spelling should not be invented from inconsistent earlier MAX/MAAX references.

The older questionnaire records AI assistance in workbook development. It supplies no independently established percentage of authorship or productivity gain.

**Case:** `#projects/takeover`. **Evidence chunk:** `experience-takeover`.

### 6.4 Recognizing a report that was actually a data feed

Josh was asked for what sounded like a Power BI report. Flat-file formatting looked familiar from earlier AL3/download work, so he questioned the request and traced the downstream consumer. The actual requirement was underlying data for the client's own processing and reporting, ultimately in Cognos. [S1, S2, S5]

Extract, Transform, Load (**ETL**) means moving and reshaping data between systems. Here, a PDF or spreadsheet report could look useful to a person while still failing the system that needed the data stream. This was the risk Josh identified; the account does not say such a wrong report was actually delivered.

His completed design connected:

```text
New adjudication system
    → REST export design
    → existing COBOL pipeline
    → InterBlue flat-file transformation
    → client Cognos processing/reporting
```

He raised the gap, explored ownership and available capacity with data warehouse/integration teams, and continued the design because he had identified and understood the dependency. Public wording should stay neutral about remit and resourcing.

**Confirmed:** compatibility/export and continuity-mapping analysis/design. **Unconfirmed:** REST service implementation and bridge go-live. A broader modern Power BI or alternative exchange remained a proposal. Older bundle wording that sounds like a completed deployed bridge is not sufficient to override that later boundary.

The older questionnaire reports AI assistance with mapping and an approximate “80%” initial mapping contribution. This is historical self-report without a documented benchmark or quality study; it is not a current approved performance claim.

**Case:** `#projects/continuity`. **Evidence chunk:** `experience-continuity`.

### 6.5 Claims SQL and financial reconciliation

Josh personally wrote claims-reporting SQL, developed/understood financial report logic, and reconciled and balanced claims against the financial view. This was hands-on query and reporting work, not only requirements passed to somebody else. [S1, S2]

Older portfolio/blog material explicitly names Oracle SQL. That extends the historical technology record, but the current canonical chunk deliberately says SQL. The wider extract/modernization decision remained open while reporting and balancing work continued.

**Case:** `#projects/sql`. **Evidence chunk:** `experience-sql`.

### 6.6 Earlier additional claims-modernization account

The older questionnaire describes technical analysis of an existing frontend/stack and current/future-state architectures for a vendor-facing modernization request. It calls the document a request for comment and discusses vendor proposals; later notes leave the exact RFI/RFC/RFP classification and implementation scope unresolved. [S6, S7]

The same older source records a high-priority takeover load interrupted by a system-build outage, with Josh escalating the deadline risk and leadership helping prioritize completion. It contains private scale figures, and the polished case count differs from the raw answer. Those figures remain in the historical questionnaire appendix as source evidence; they must not be silently promoted into the public portfolio.

## 7. Independent software and personal projects

### 7.1 NEXUS — current capstone

NEXUS applies Josh's systems experience to AI-assisted work with context, controlled execution and inspectable evidence. It is the **sole currently featured independent capstone**, alongside continuing professional work at Medavie. [S1, S2]

Implemented mechanisms described by the portfolio include:

- **Scoped context compilation:** collect relevant retrieval results, project decisions, graph relationships and source receipts for a piece of work.
- **Explainable model routing:** choose models under explicit constraints and retain a way to inspect that choice.
- **Planning, review and execution separation:** keep intended work distinct from its approval/review and actual execution.
- **Recoverable distributed execution:** durable commands and permissions allow Node execution to recover across process boundaries.
- **Evaluation and receipts:** deterministic checks, semantic evaluation, integration evidence and deployment receipts support review of outcomes.

Recorded technical foundation: a headless TypeScript core, React/Vite web interface, PostgreSQL, Redis, OpenAPI contracts and WebSockets. “Headless” means the core can operate independently of a particular graphical interface.

The public account describes implemented mechanisms in an **actively developing product**. It does not prove every vision feature has shipped, enterprise adoption, revenue, scale benchmarks or production maturity across all components. The NEXUS repository itself was not re-audited for this career digest.

**Case:** `#projects/nexus`. **Portfolio link:** <https://run.nexus/>.

### 7.2 LOWKEY — historical independent evidence

LOWKEY connects local speech recognition to native Windows text input and a Kotlin Android keyboard. Its name is written exactly **LOWKEY**, with a tilde mark in its branding. [S1, S2]

Recorded implementation includes React/TypeScript, Rust/Tauri 2, AudioWorklet audio capture, a dedicated Rust worker, Silero phrase detection, sherpa-onnx/Parakeet local decoding, optional local correction/dictionaries and fallback behaviour. Earlier project detail identifies cached 110M CTC and 0.6B v3 TDT INT8 model variants. The Android component is an Input Method Editor (**IME**)—a keyboard/input integration.

Source review found local decoding and no first-party audio-upload client. That is not a complete network audit. No trustworthy numerical speed benchmark, universal device-support claim or absolute security guarantee is established.

LOWKEY was **archived from current featured placement at Josh's request**. Its template and evidence remain preserved. It is independent-project evidence, not employer experience.

**Case:** `#projects/lowkey`; structured chunk `experience-lowkey` is inactive.

### 7.3 Workshop42 — making physical things

Workshop42 is the personal making context linked from About. The portfolio preserves real project photographs rather than invented representations. [S1]

- **Apex monitor riser:** printed legs supporting a wooden shelf; a practical desktop object involving structure, space and everyday use.
- **Voyager:** a dual-colour printed canoe model exploring shape and construction.

Workshop42 is no longer a featured capstone. Its project template remains recoverable and About retains a discreet link to <https://ws42.ca>.

### 7.4 Personal lab and older demos

The older blog describes a personal infrastructure lab with containerized Docker services, multi-provider AI workflows using Claude, OpenAI and Gemini, and full-stack application development. Its technology list also names n8n, PowerShell, Astro and Tailwind. [S8]

These are recorded personal-project claims, not automatically verified employer competencies. The lab's current operational state was not audited during this import.

## 8. Skills and evidence map

| Capability | Concrete supporting work | Boundary |
| --- | --- | --- |
| Problem diagnosis | Dell hardware; integration request failures; reporting-feed discovery | Do not invent incident rates or resolution metrics. |
| Infrastructure design | Harris migrations; Grenville headquarters; virtualization | Specific project dates and some older hardware details remain open. |
| Business/functional analysis | Broker workflows; planned policy restructuring; provider and claims requirements | Analysis is not automatically delivered implementation. |
| Insurance rules | Rating, underwriting, policy changes and renewals | Auto rate calculation is vendor-managed in the direct account. |
| Integration/data contracts | Broker field/value mapping; SOAP/XML; REST; provider synchronization | Do not infer JSON insurance standards, Kafka or real-time streaming. |
| Application development | Production C#/.NET upload portal; internal log tooling | No unsupported audited-security or sole-platform authorship claim. |
| Data transformation | Excel/VB/XML history load, validation, batching, reconciliation | Exact VB runtime and private schema details remain unresolved. |
| SQL/reporting | Personally written claims SQL; financial logic; balancing | Financial volumes and private queries are not reusable public claims. |
| Technical guidance | Vendor UI/specification direction; schema-change solution guidance | Technical leadership does not prove formal people management. |
| Independent product implementation | NEXUS; historical LOWKEY | Distinguish personal work from employer delivery and vision from implementation. |

### Technology inventory by evidence context

**Established in current career evidence:** C#/.NET; JavaScript/HTML/CSS/Bootstrap; SQL; Excel; XML; SOAP; REST; field/value mapping; log-search tooling; Exchange; Active Directory; Group Policy; BlackBerry Enterprise Server; networking/racks/firewalls/switches; VMware ESXi; rating/underwriting rules; AL3/eDocs familiarity.

**Established as independent-project technology in the portfolio:** TypeScript; React; Vite; PostgreSQL; Redis; OpenAPI; WebSockets; Rust; Tauri 2; sherpa-onnx; Parakeet; AudioWorklet; Silero; Kotlin Android IME.

**Recorded in older sources with context requiring care:** Oracle SQL; basic Java rule edge cases; MASTERCOM/INI mappings; named network/access-control products; Docker; n8n; PowerShell; Astro; Tailwind; multi-provider AI workflows.

**Not established merely by a job posting:** AWS/Azure/GCP certifications, Guidewire/Duck Creek/Sapiens/FINEOS experience, Kafka/RabbitMQ implementation, Kubernetes/Terraform proficiency, a formal management remit, security clearance or language certification. “Absent from this dataset” does not mean Josh lacks the skill; it means this corpus does not prove it.

## 9. Education and credentials recorded in older material

The older build bundle records:

- **Advanced Diploma, Computer Systems Technology — Networking**, Canadore College, 2006.
- **Business Analysis & IT Project Management Certificate**, McMaster.
- **Professional Scrum Master I (PSM I)**.

These items are preserved as **older-profile evidence**, not as newly verified credential records. The current v3 public résumé dataset omits education/certifications and therefore returns a qualification gap when a posting asks for them. That is a dataset limitation, not a determination that the credentials do not exist. Before adding them to a canonical résumé, verify exact award names, issuing bodies and dates from the original documents. [S2, S7]

## 10. Working style, motivations and interview narrative

The evidence suggests a useful professional narrative: **support taught diagnosis; infrastructure taught dependencies; insurance rules taught explicit decisions; integration taught preserving meaning across boundaries; claims work added enterprise-scale analysis and data continuity.** This is a synthesis of the cases, not a quotation. [S1–S7]

Josh's direct recorded motivations include wanting to focus on one company when leaving Harris, seeking enterprise scale and methodologies when moving from Grenville to Medavie, and retaining a strong connection to the P&C domain. He said most of his experience was in P&C, he still had contacts there, and he felt he had more to offer InsurTech. These are interview inputs, not a promise about a future employer or tenure. [S3, S7]

The portfolio emphasizes practical delivery, business context, technical depth, explaining complexity, examining assumptions, making dependencies visible, and guiding implementation collaboratively. It gives concrete evidence of both design and hands-on work; it should not flatten Josh into either requirements-only analysis or unsupported enterprise-architect branding.

### Useful interview examples

1. **A vague request with a hidden dependency:** recognizing the supposed Power BI report as a contractual data-feed requirement; tracing Cognos and preserving the compatibility design.
2. **Automation with a safe exception path:** the vanilla-policy framework and corrected renewal outcomes.
3. **Design carried into operation:** headquarters planning through build/move; authenticated upload with logging and support tooling.
4. **Repeatability instead of repeated manual effort:** swing migrations and takeover-history validation/XML preparation.
5. **Working across a vendor boundary:** commercial quoting requirements, mappings and rules, while accurately crediting vendor development.
6. **Technical guidance without overstating coding:** history-load solution documentation and developer guidance, plus user-facing Excel/VB tooling.

## 11. Writing themes and historical editorial material

The earlier build bundle includes draft articles and an idea bank. These are authored portfolio material, not independent evidence that every assertion in them has been verified or published. [S7]

Recorded themes include:

- Broker-native submission and bind workflows before current “agentic” terminology.
- Vanilla policies and deliberate human referral.
- Fail-first underwriting and explicit rule evidence.
- Deterministic decisions versus probabilistic model outputs.
- Structured insurance transactions versus documents that need extraction.
- The layers of an AI underwriting stack and the limits of marketing claims.
- AI-assisted mapping and workbook development, with human checking of exceptions.
- The career arc from physical infrastructure to insurance systems and independent AI work.
- Discovering that a report is actually an integration dependency.
- Raising delivery risk during a time-sensitive history load.

The current preferred brand is broader and less title-heavy than the older “Metal → Cloud → AI / Insurance Solutions Architect” framing. Writing should remain specific, defensible and in Josh's voice.

## 12. Website, résumé builder and preserved project state

The confirmed site is now copied into the `Joshboyer.ca` project. Its web root is `dist/`; it uses static HTML, CSS and JavaScript. `npm start` runs the imported local server at `http://127.0.0.1:4183/`. The server exposes only `dist/`, keeping this corpus and the research archive outside the website's served directory.

Current primary routes are Home, Projects and About. Sixteen case templates remain in the HTML: 13 professional studies and three independent/personal studies. NEXUS is the sole current independent capstone; LOWKEY and Workshop42 templates are historical evidence.

The source manifest identifies the imported visual revision as `portfolio-no-footer-barron-about-1`: shared portfolio footer removed, Barron Canyon About portrait composition present. Later notes record a requested seated-at-a-computer About image whose original transfer remained unverified. The prepared alternative is not treated as integrated merely because its snippets exist.

### Résumé and career-guide functions

The browser-local résumé builder uses approved prewritten evidence and deterministic topic matching. “Deterministic” means the same inputs and rules produce the same result. It supports reviewing evidence/qualification notes, selecting chunks, previewing and exporting text/selection data or using the browser print path. It does not establish an active model-backed career conversation.

Dataset `2026-10-15.3` includes five role groupings, 15 chunks, four professional summaries, source references, qualification notes and ranking/template policies. Fourteen chunks are active; LOWKEY is inactive. The browser-local career guide is likewise rule-based.

A separate `portfolio-sites-candidate` and `career-agent/` workstream exists in the source project. Historical records describe an unpublished backend candidate and unresolved authenticated-browser acceptance. Those records are preserved; the backend was not activated or moved into the website runtime by this import.

### Source locations

- **Original confirmed site:** `C:\Users\boyer\Documents\Codex\2026-10-13\task-7\portfolio-visual-update`.
- **Original broader project:** `C:\Users\boyer\Documents\Codex\2026-10-13\task-7`.
- **New working project:** `C:\Users\boyer\Downloads\Projects\Joshboyer.ca`.
- **Earlier static portfolio:** `C:\Users\boyer\Downloads\Projects\portfolio`; another older copy exists at `C:\Portfolio`.
- **Earlier Astro/React blog:** `C:\Users\boyer\Downloads\Projects\joshboyer-blog`.

## 13. Corrections, contradictions and open questions

| Item | Earlier statement | Current treatment |
| --- | --- | --- |
| Dell start | Older résumé used July 2006 | Explicit firsthand September 2006 correction takes precedence. |
| Grenville analyst transition | 2014 versus 2016 | Unresolved; use broad overlapping periods. |
| Headquarters move | Raw questionnaire says 2012; later material says approximately 2014 | Unresolved; retain both with their sources. |
| Insurance experience length | Older “18 years in insurance” | Use approximately twenty years total tech; do not repeat the insurance total as exact. |
| Commercial renewal automation | Older 30–40% grouping | Corrected to approximately 60% commercial; farm/agri approximately 40%; residential approximately 80%. |
| Auto rating | Broad current copy may imply personal rating implementation | Direct questionnaire assigns auto rates to vendor; Josh's auto underwriting/validation is supported. |
| Broker vendor/product spelling | Brovada / Bravado / Bravado1 and differing vendor references | Confirm exact products; do not invent a reconciliation. |
| JSON standards | Older questionnaire/prose mentions JSON | Current approved employer evidence does not establish hands-on JSON standards experience. |
| Provider pub/sub | Earlier generic gap notes | Later confirmed scheduled event-table/REST review is supported; broker/realtime implementation remains unestablished. |
| Takeover schema | Some broad wording could imply Josh coded it | Josh documented changes and guided a developer; personal schema coding is not established. |
| Macro language | VBA or VBScript implied in different sources | Use VB scripts until exact runtime is confirmed. |
| Platform names | MAX/MAAX and internal acronyms | Public generic adjudication labels until confirmed. |
| Continuity bridge | Older wording sounds delivered | Latest boundary is completed design; implementation/go-live unconfirmed. |
| Takeover scale | Earlier polished and raw figures differ | Historical private evidence only; do not put into public claims without fresh confirmation. |
| Education/certification | Older profile lists three credentials; v3 omits them | Preserve as recorded; verify original awards before adding to canonical dataset. |
| Language proficiency | Older site prose mentions English/French client work | Current approved dataset does not establish bilingual proficiency or a certified level. |
| Formal leadership | Guidance and escalation are supported | No inferred direct reports, hiring authority or performance-management remit. |
| Modernization frontend | Older RFC/RFP wording | Confirm document class, stack and authored/delivered scope. |
| About portrait | Barron composition present; later desk image requested | Current files determine what is integrated; later transfer remains unverified. |

Questions for a future factual update: exact formal job titles/dates; HQ year; credential award details; current location/work arrangement; precise VB runtime; platform/vendor spellings; continuity implementation status; frontend-modernization contribution; any defensible current metrics. No answer is inferred merely to make the narrative smoother.

## 14. Conversation and preservation coverage

The source-project archive preserves **716 document occurrences as 289 unique original documents**, using SHA-256 fingerprints to retain duplicate provenance without duplicating identical content. Supplemental earlier portfolio sources are preserved separately.

The accessible **“Build portfolio Git-tree redesign”** conversation was paginated to its beginning: **67 turns**. Public user, assistant and delegated-message text is retained in `knowledge/conversations/portfolio-redesign-complete.json`. Tool traces and private reasoning are omitted. The read interface can cap individual returned text items at 20,000 characters, so complete pagination is not a guarantee of a byte-for-byte platform transcript.

The local conversation archive preserves **23 portfolio browser-review sessions containing 985 public user/assistant messages**. Their source paths, message counts and file fingerprints are indexed. Many user-shaped messages in these sessions are agent delegations; they must not be mistaken for direct quotes from Josh.

The implementation thread points to parent conversation `01a1186a-75e1-7453-b817-9ac130a790fb`. Its read interface returned metadata but **no readable turns**. The source bundle's raw questionnaire and the dated firsthand-account summaries preserve substantial career narration, but this does not amount to an export of all historical ChatGPT conversations. Binary attachments and unrelated account conversations were not incorporated.

Original project files remain intact. The destination contains an exact website copy, readable source documents, a searchable source catalogue, structured evidence and this consolidated digest.

## 15. Original career-source references

The October 14/15 evidence notes record these upstream résumé documents. Their current live contents were not fetched during this compilation:

- Career résumé: <https://docs.google.com/document/d/1r_1xCl9pDyZlue3wt56EBzg77T71tC2jcilBKZ8iqTM>.
- Fortinet résumé: <https://docs.google.com/document/d/1h9JhQF9rj2Po6yA1oMavU5znPZTFLTebj4GZ9KHM_cc>.
- Secondary 2025 summary: <https://docs.google.com/document/d/1fqO6brsxAG5igXTxlAB5FOeW-_HuAy__19I7vqV0GWc>.
- Local résumé referenced by the historical notes: `C:\Users\boyer\OneDrive\Desktop\Resume\JoshBoyer_Resume_Insurity.docx`.

These are provenance references, not a claim that those upstream documents were reverified here. The following appendices retain the detailed local source text so this document remains useful on its own.

## Appendix A — Current website case studies, full extracted text

The following text is extracted from the imported HTML templates. It preserves the current source wording, including archived projects. Where it conflicts with a correction above, the correction remains explicit rather than silently rewriting the source. Navigation labels are retained.

### project-nexus

← All projects

NEXUS

AI-assisted work with context,

control and a trail of evidence.

Active development

The problem

Useful AI-assisted work needs more than a prompt. It needs the right context, explicit decisions, constrained execution and a way to inspect what happened.

Conceptual illustration · Context, review, execution and validation

Inside the implementation.

Ground the context

Scoped context compilation brings together retrieval, project decisions, graph relationships and source receipts.

Make choices explainable

Constraint-aware model routing makes the selection inspectable, with plans separated from review and execution.

Execute with recovery

Distributed Node execution uses durable commands and permissions so work can recover across process boundaries.

Keep the evidence

Deterministic and semantic evaluation, plus integration and deployment receipts, make outcomes available for review.

Technical foundation +

A headless TypeScript core, React/Vite web interface, PostgreSQL and Redis, with OpenAPI and WebSockets.

This study describes implemented mechanisms. NEXUS is in active development; the broader product vision is still evolving.

Run NEXUS → run.nexus (opens in a new tab)

### project-lowkey

← All projects

LOWKEY

Your voice, where you already write.

Local speech inference · Windows / Android

The idea

Connect local speech recognition to everyday input: native text entry on Windows and a dedicated Android keyboard.

Conceptual illustration · On-device speech and text input

From speech to input.

Capture the phrase

AudioWorklet capture and a dedicated Rust worker support the Windows flow, with Silero phrase detection.

Decode locally

Cached speech models run through sherpa-onnx / Parakeet. The application connects the result to native input.

Fit the vocabulary

Optional local correction, dictionaries and fallback behavior support the input workflow.

Technical foundation +

React / TypeScript, Rust / Tauri 2, sherpa-onnx / Parakeet, and a Kotlin Android IME. Cached model variants include 110M CTC and 0.6B v3 TDT INT8.

Source review found local decoding and no first-party audio-upload client. That review was not a network audit. No numerical speed benchmark or universal device-support claim is made here.

All professional work →

### project-workshop42

← All projects

Workshop42

Make it tangible.

Selected physical projects, photographed as built.

Apex monitor riser

Printed legs meet a wooden shelf. A practical desktop object shaped around structure, space and everyday use.

View Apex on MakerWorld ↗ (opens in a new tab)

The Voyager

A dual-color printed canoe model. A small exploration of shape, construction and the pleasure of making.

View Voyager on MakerWorld ↗ (opens in a new tab)

Visit Workshop42 ↗ (opens in a new tab)

### project-dell

← All projects

Dell · September 2006 · early career

Dell Latitude and OptiPlex support

Latitude / OptiPlex hardware support

Resolve the hardware issue

A hardware fault is disruptive enough without asking the client to keep calling back. On Dell’s Gloves Off team, we could spend more time working through the issue instead of optimizing each call’s duration.

Latitude and OptiPlex hardware

I supported Latitude laptops and OptiPlex desktops. The team’s approach gave me room to investigate with the client and aim to resolve the issue on the first call. The useful work was to understand the symptom and the hardware involved, then explain the next steps clearly.

Time for diagnosis

Spend enough time to work through the problem and reduce callbacks. Keep the person affected by the fault in view alongside the technical diagnosis.

A first-call focus

The team’s approach was to spend enough time with a client to resolve the issue on the first call and reduce callbacks. This describes the support model I worked within; a numerical resolution rate is not established.

Tools and integration context +

Latitude laptops · OptiPlex desktops · Hardware troubleshooting · Client communication

Evidence, dates and scope +

Josh’s first-person account confirms a September2006 start. The later Harris chapter follows the broad résumé-supported career period. No client records or numerical first-call-resolution result are included.

Next chapter: Small Business Server swing migrations →

### project-foundations

← All projects

Harris · 2007–2009

Small Business Server swing migrations

NOC / project technician

Outgrowing the combined environment

Infrastructure changes touch several connected services. A server or network migration also affects email, directories and the people who depend on them.

A repeatable swing migration

Started with NOC node installation, updates and replacements, plus corporate password/email resets and desktop/laptop support. Progressed to full rack installations, switches, firewalls and servers for clients. Developed a repeatable swing-migration process from Small Business Server to separated infrastructure, with practical attention to preserving data and email. Also supported Harris’s internal firewalls, switches and servers.

Separate the roles, preserve the information

Move from combined Exchange and Active Directory roles to separated infrastructure as the customer outgrows the original environment. Keep the data, email and identity dependencies visible through the migration process.

A reusable migration process

I developed a repeatable swing-migration process for customers moving beyond Small Business Server. Data and email preservation were central to the process, alongside the identity and service dependencies involved. The account does not establish a measured success rate or audited guarantee.

Network operations · Small Business Server · Exchange · Active Directory · Group Policy · BlackBerry Enterprise Server · Rack infrastructure

Evidence and date context +

Josh’s first-person account expands the résumé-supported Harris NOC and infrastructure scope. Client examples include anonymized aeronautics, fitness and power-services businesses; public naming is not confirmed. Dates remain a broad career period.

Public summaries describe the work without publishing employer-confidential artifacts or claiming sole ownership.

Next chapter: Headquarters infrastructure and move →

### project-headquarters

← All projects

Grenville · Approximately 2014

Headquarters infrastructure and move

Systems administration / technical design contributor

The building had to work on move-in

A headquarters move brings networking, AV, security and resilient power into one physical environment. The infrastructure plan has to account for both technical dependencies and everyday operation.

From technical plan through the move

Designed technical infrastructure from planning through the build and move/transition, accounting for networking, AV, security, cooling and resilient power. Worked through the practical dependencies that connected the plan to the occupied headquarters. The broader infrastructure scope included transitioning a bare-metal blade centre to ESXi; its exact date remains unestablished.

Cooling, power and connected services

Account for the practical environment, including cooling and resilient power, alongside networking and the systems people use. Carry the dependencies through design, build and the move rather than treating infrastructure as only a server-room concern.

The move and transition

I’m proud of the smooth transition and of taking the technical design through the build and move. The scope connected the infrastructure plan to the occupied building, including cooling, networking, AV, security and resilient power.

Infrastructure planning · Networking · Virtualization · Operational dependencies

Evidence and date context +

Career source material places HQ technical design around 2014. Budget and internal infrastructure artifacts are omitted.

Public summaries describe the work without publishing employer-confidential artifacts or claiming sole ownership.

Next chapter: Broker policy inquiry →

### project-inquiry

← All projects

Grenville · Within 2009–2022 · overlapping work

Broker policy inquiry

Business analysis, mappings and integration testing

Information inside the broker workflow

A broker inquiry needs to return information that is useful in the broker’s own workflow. Policy, billing and claims information crosses system boundaries, and the meaning of the fields has to survive the exchange.

Requests, mappings and documents

Worked on broker inquiry, including mockups and mappings and downloadable policy, billing and claims PDFs. Diagnosed requests and tested integrations across broker-management vendors. The broader mapping work included field, data and value transformations between CSIO/ACORD payloads and proprietary backend insurance fields.

Preserve the meaning of the response

Treat an inquiry as both a user workflow and a data contract. Trace the request, identify missing or mismatched information, and connect the returned values and documents to what the broker needs to do next. The interfaces included SOAP/XML requests from desktop clients, with REST used in the later backend.

Policy, billing and claims information

The inquiry workflow included downloadable policy, billing and claims PDFs. My contribution covered mockups, mappings, request diagnosis and integration testing, connecting broker-side requests to the proprietary backend information they needed.

Tools and integration context +

Broker inquiry · Field/value mappings · SOAP / XML · REST · Policy/billing/claims PDFs · Integration testing

Evidence, dates and scope +

Direct Grenville account and prior résumé/portfolio notes. Exact completion dates are not established. The period identifies the employer tenure; documents and policyholder data remain private.

Next chapter: Auto and residential new-business integration →

### project-newbusiness

← All projects

Grenville · 2010 onward · overlapping work

Auto and residential new-business integration

Requirements, UI specifications and hands-on rules implementation

Collect the missing risk information

A new-business workflow cannot rate or underwrite a risk properly if the interface does not collect the information the rules need. Auto and residential submissions had to connect broker inputs, validation and the insurance decision.

Rating and underwriting implementation

Personally designed and implemented P&C rating and underwriting rules. Diagnosed broker requests, tested integrations and directed UI/specification changes to collect missing risk information. The work combined requirements and technical guidance with testing and ongoing maintenance.

Correction, referral or bind

Make the required risk information explicit, validate it and return a useful next action. I helped design the messaging framework between the rules engine and broker portal so a user could correct an issue, refer the case for review or bind where allowed. The rules needed to distinguish new business from renewals and endorsements.

Rules connected to submission behavior

I implemented rating and underwriting rules and worked through broker requests, validation and missing risk inputs. The submission flow connected those rules to messages that let users correct an issue, refer the case or bind where allowed. The distinction between new business, renewals and endorsements remained part of the rule context.

Tools and integration context +

Auto / residential new business · Rating and underwriting · UI specifications · Validation · Broker integration · Actionable messages

Evidence, dates and scope +

Josh’s direct account expands the earlier source-supported new-business work from2010onward. This describes responsibility and implementation without inventing a formal Architect job title, project volume or universal automation rate.

Next chapter: Commercial quoting and broker integration →

### project-workflows

← All projects

Grenville · 2010 onward · overlapping work

Commercial quoting and broker integration

Policy rules design and implementation; analysis and integration contribution

Collect the right commercial risk information

Early commercial quoting and broker new-business workflows needed the right risk information, consistent insurance meaning and useful decisions. Inquiry, upload and download flows crossed broker payloads, proprietary backend fields and interfaces that had to be diagnosed and tested.

Rule implementation and vendor specifications

My responsibility was the core policy rules architecture: I personally designed and implemented rating and underwriting rules. Worked with broker-management vendors including TAM and Epic through Bravado/Bravado1. Mapped fields, data and values, and transformed CSIO/ACORD broker payloads into proprietary backend insurance fields across residential, auto, farm and commercial upload/download flows. Diagnosed requests, tested integrations and directed UI/specification changes to collect missing risk information. Implemented validation and rating for auto, residential and commercial new business and quoting.

Two-way data and actionable messages

Helped design a rules-engine-to-broker-portal messaging framework so users could correct issues, refer for review or bind where allowed. Inquiry included downloadable policy, billing and claims PDFs. The mapping work covered upload and download directions, not just a one-way interface. I worked with XML and was familiar with AL3 historical flat-file standards and eDocs.

Commercial quoting

Early commercial quoting was a substantial part of the work: defining fields and UI stages, mapping values and risk information, specifying behavior and implementing the related rules. I directed changes where the interface did not collect enough information. Vendor teams performed commercial quoting development; my contribution connected the requirements, user workflow, integration mappings and rule implementation.

The implementation scope

I implemented the rating, underwriting and validation rules and contributed the fields, mappings and UI specifications that commercial quoting needed. Vendor teams performed commercial quoting development. My work connected the insurance requirements, collected risk information and backend rule decisions across that boundary.

P&C judgment · Commercial quoting · Field/value mapping · CSIO / ACORD payloads · XML · AL3 familiarity · eDocs · SOAP / REST · Rules implementation

Evidence and scope +

Josh’s first-person Grenville account expands the résumé and portfolio-note evidence. “Main policy rules architect” describes responsibility, not a new formal job title. Earlier backend technology and other uncertain vendor names are omitted. Standards are named without asserting their formal relationship; hands-on JSON standards experience is not claimed.

Next chapter: Policy-change comparison and validation →

### project-changes

← All projects

Grenville · Within Grenville tenure · 2009–2022

Policy-change comparison and validation

Analysis, policy rules implementation and UI/integration design

Show the change before submission

A policy change can alter risk and rating in ways that differ from new business or renewal. Users needed to understand what they were changing before submission, and the system needed to validate those changes in the correct business context.

Comparison UI and contextual rules

Worked on a complex policy-change interface that showed changes before submission. Personally designed and implemented policy rules, with validation and rating that distinguished new business, renewals and endorsements. Field/data/value mapping and transformations kept broker payloads aligned with proprietary backend insurance fields. Diagnosed integration requests, tested behavior and directed specification/UI changes where the risk information was incomplete.

Validate the right transaction context

Separate the user’s proposed changes from the submitted transaction. Make comparison and validation visible, then return messages that allow correction, referral for human review or binding where the rules permit. Preserve insurance meaning across the broker interface and rule-engine boundary.

An explicit change workflow

The policy-change interface showed the proposed changes before submission. I worked on comparison, mappings, validation and rating rules that treated new business, renewals and endorsements differently, with correction, referral and bind decisions where permitted. The exact completion date is not established.

Endorsements · Insurance analysis · Change comparison · UI design · Validation · Rules implementation

Evidence and scope +

Direct first-person account. The date is the employer tenure, not a claim that this project ran throughout that period. No policyholder data or proprietary rule code is published.

Next chapter: Renewal eligibility and exception routing →

### project-renewals

← All projects

Grenville · Within Grenville tenure · 2009–2022

Renewal eligibility and exception routing

Framework design and hands-on rating/underwriting rules implementation

Which policies should renew automatically?

Standard policies could be eligible for automatic renewal, while exceptions still required insurance judgment. The challenge was to make that classification explicit without treating every policy as suitable for automation.

Eligibility classification and rules

Personally designed the renewal framework and implemented rules that classified eligible standard policies for automatic renewal and referred exceptions for human review. The approach distinguished residential, farm/agri and commercial renewal contexts rather than applying one blanket decision to all business.

Keep a deliberate human-review path

Automate the eligible standard cases and keep a deliberate referral path for exceptions. Design the classification around renewal-specific rating and underwriting requirements, with human judgment where the rules did not permit automatic processing.

Reported renewal automation

I reached about 80% residential renewal automation, about 40% farm/agri renewal automation and about 60% commercial renewal automation. These are approximate, user-reported outcomes from my account, not independently audited results. They describe renewal automation, with exceptions still going to human review.

Renewal framework · Insurance judgment · Exception classification · Rating rules · Underwriting rules · Human review

Evidence and scope +

Josh’s direct account, with his corrected figures: farm/agri about 40%, commercial about 60%, residential about 80%. Exact project dates are not established; the period shown is Grenville tenure.

Next chapter: Document upload into policy records →

### project-upload

← All projects

Grenville · 2013–2018 source range · approximately 2018

Document upload into policy records

Systems analyst / hands-on developer and integration contributor

From email to the policy record

External insurance adjuster users needed an authenticated way to submit supporting documents and images directly into policy-management records. Ad-hoc email delivery left the workflow fragmented; the goal was a controlled submission path tied to the backend record.

Authenticated submission through REST

Built a C#/.NET portal for authenticated submissions, using proprietary backend REST APIs to place documents directly into backend records. The implementation used JavaScript, HTML, CSS and Bootstrap alongside .NET. Added logging for operations and troubleshooting. The workflow handled supporting quotes, images and documents without exposing real files or internal endpoints here.

Put files directly in backend records

Replace ad-hoc email delivery with authenticated submission and direct backend record placement. Connect the privacy goal to the actual workflow and add logging so operational issues could be diagnosed. This describes the chosen application workflow, not a claim that all email is inherently insecure.

Internal support tooling

Built an internal tool to retrieve and search logs, diagnose recurring upload/download problems and guide their resolution. It brought operational troubleshooting alongside the integration workflow rather than leaving repeated failures as isolated support requests.

A production business tool

The application became a production business tool for authenticated submission of supporting documents and images into backend policy records. It replaced ad-hoc email delivery, with operational logging and an internal support tool for recurring upload/download issues. No audited security certification is asserted.

C# / .NET · JavaScript · API integration · Operational logging · Authenticated workflows

Evidence and date context +

Older résumé gives a 2013–2018 range; a later summary places it approximately in 2018. Production use and logging are supported by Josh’s account.

Public summaries describe the work without publishing employer-confidential artifacts or claiming sole ownership.

Next chapter: Provider data for claims adjudication →

### project-claims

← All projects

Medavie · 2022–present · parallel workstreams

Provider data for claims adjudication

Solution review, field mappings and synchronization requirements

Review the whole provider flow.

I was the solutions person reviewing how ProviderRegistry changes reached the adjudication system. That meant understanding the scheduled jobs, the event records and the REST calls together with the data adjudication actually needed.

Two scheduled jobs, one event table.

A nightly publisher job writes events into a table. A separate scheduled consumer reads those events and calls REST services to pull ProviderRegistry data into the adjudication system. The pattern is scheduled, table-backed publish/subscribe with REST retrieval.

Review the solution and the data contract.

I performed the solution review, confirmed field mappings and synchronization requirements, and connected the source-provider information with adjudication needs. I worked alongside architects and delivery teams, bringing the functional requirements and technical flow into the same review.

The confirmed contribution.

My contribution covered solution review/design input, requirements, mappings and synchronization. The account establishes that review work; it does not establish solo implementation or a separate go-live result.

Tools and integration context +

ProviderRegistry · Nightly publisher · Event table · Scheduled consumer · REST retrieval · Field mappings · Synchronization requirements

Evidence, dates and scope +

Josh’s direct follow-up account on2026-10-15 confirms the solution-review role and scheduled table-backed architecture. Kafka, message-broker and real-time implementation are not inferred. Internal source/destination acronyms remain unconfirmed, so generic ProviderRegistry and adjudication-system labels are used. No private schemas, clinical records or client identity are published.

Next chapter: Takeover-history validation and XML loading →

### project-takeover

← All projects

Medavie · 2022–present · project date not established

Takeover-history validation and XML loading

History-load analysis, schema design guidance and repeatable intake

Inconsistent history, a defined load schema

When a group changes insurers, its prior claim history needs to inform benefit and limit adjudication. The history arrives in inconsistent spreadsheets or data derived from PDFs, while the receiving adjudication system expects a defined XML structure.

Investigate the load and define the changes

I researched the existing XML-schema-based history-load solution in the adjudication system and documented its gaps and necessary schema changes in a solution document. I helped define the solution with the developer and guided development through implementation and maintenance. The schema changes were part of that guidance; I am not claiming to have personally coded them.

The Excel import and validation template

I supported end users with Excel templates, VB scripts and validation. The template generated the required XML and made data entry easier while ingesting and mapping inconsistent input. The precise VB runtime is not established here. The tooling validated field types and data, transformed it into the required takeover-history XML schema and prepared files for batch loading into adjudication claim tables. The surrounding work included manageable load files and error reconciliation.

Validate, transform and reconcile

Make the mapping and validation explicit before loading. Use a repeatable template rather than treating each incoming spreadsheet as a completely new manual exercise. Keep the output tied to the receiving schema and include a way to investigate rows that do not load as intended.

A production loading tool

The Excel tooling went into production and was adopted by the team. It provided a reusable process to map inconsistent history, validate types and data, export schema-matching XML and prepare manageable batch loads, with reconciliation for errors returned by the receiving system.

Tools and integration context +

Excel template · Type/data validation · Field mapping · XML export · Batch load preparation · Error reconciliation

Evidence, dates and scope +

Josh’s direct account and portfolio notes. VB scripts are confirmed; the precise runtime and public platform spelling remain unconfirmed. The contribution spans analysis, the solution document, development guidance through implementation and maintenance, and end-user tooling. Illustrative insurer/group names are not treated as customers. No private inputs, schemas or claim records are published.

Next chapter: Preserving a daily claims reporting feed →

### project-continuity

← All projects

Medavie · 2022–present · overlapping migration work

Preserving a daily claims reporting feed

Current-state analysis and continuity mapping design

The file format was the clue.

I was asked for what sounded like a Power BI report. As soon as I saw the output, I started questioning the request. The flat-file formatting looked familiar from my earlier AL3 and broker-download work. I identified a missed requirement: the client agreement called for underlying data for their own downstream processing and reporting. I needed to understand what was using that file.

A PDF would miss the point.

If I had treated it as ordinary reporting, the client could have received a PDF or an Excel spreadsheet instead of the ETL data stream their backend needed. That backend turned out to be Cognos. A perfectly readable report would still have been the wrong handoff.

Follow the file to its consumer.

I traced the feed to the client’s Cognos environment. I designed a new REST-based export from the adjudication system into the existing legacy COBOL pipeline. That pipeline transforms the exported data into an InterBlue flat file for Cognos. The design preserved a working compatibility path for the client’s own processing and reporting. The file crossed team boundaries, too. I raised the gap and looked for the right owner. My team covered adjudication; this involved multiple external systems and broader business reporting. I checked ownership and resourcing with the data warehouse and integration teams. That coordination clarified the available capacity, and I continued the design work based on the gap I had identified and the flow I had traced.

Compatibility designed; implementation unconfirmed

I completed the REST export and continuity-mapping design. Implementation of the service and go-live of the bridge remain unconfirmed. The design connects the new adjudication system to the existing downstream pipeline; it does not claim a delivered replacement for the client’s reporting environment. Earlier integration work had given me a useful clue here: recognize the file pattern, question the requested format, and find the system that needs to consume it.

Tools and integration context +

REST export design · ETL compatibility · COBOL transformation · InterBlue flat file · Client Cognos · Adjudication-data mapping · Migration continuity

Evidence, dates and scope +

Direct account, including the follow-up interview on 2026-10-15, and existing career mapping notes. The follow-up confirms the underlying-data requirement and REST-export compatibility design. Service implementation and bridge go-live remain unconfirmed; the uncertain intermediate acronym is omitted. No private file specification, transport-security claim or client identity is published.

Next chapter: Claims SQL and financial reconciliation →

### project-sql

← All projects

Medavie · 2022–present · overlapping reporting work

Claims SQL and financial reconciliation

Hands-on SQL, financial report logic and reconciliation

Align claims and financial views

Claims reporting has to make sense against the financial reporting it feeds. While the extract and modernization decision remained open, the immediate work still needed an understanding of report logic and a way to reconcile the claims information.

Hand-written SQL and report logic

Personally hand-wrote SQL for claims reporting. Understood and wrote financial reports, and reconciled and balanced claims against financial reporting. This was hands-on query and analysis work rather than only gathering requirements for somebody else to implement.

Reconcile while the extract decision is open

Understand what each report is counting and how its logic relates to the financial view. Keep reconciliation central while the wider exchange decision is unresolved. Distinguish work that supports today’s reporting from a proposal for a future reporting or integration approach.

Reporting and balancing work

I personally wrote SQL for claims reporting, wrote and understood financial reports, and reconciled and balanced claims against the financial view. The broader extract and modernization decision remained open. This case describes the query, report-logic and reconciliation work, without exposing financial volumes or private query records.

Tools and integration context +

SQL · Claims reporting · Financial report logic · Reconciliation · Balancing · Data analysis

Evidence, dates and scope +

Josh’s direct account confirms this as distinct hands-on reporting work. No currency, monthly financial volumes, database schemas, private queries or claim data are disclosed.

Next chapter: NEXUS →

## Appendix B — Older questionnaire answers, as preserved in the build bundle

Source: S7. This reproduces the source file's questionnaire section; it is not a freshly retrieved intake-system export. Spelling and older assertions are retained. The corrected renewal figures, unresolved HQ year, implementation limits and private historical scale figures must be interpreted using Section 13.

> Josh's original answers, unedited, as entered in the intake form. This is the primary source behind all content above — spelling/typos preserved. Where a section header repeats, it is because the questionnaire posed sub-questions (Q:) with Josh's replies (A:).

**Portfolio framing — About the portfolio**
- Q: How do you want to be known in one line? — A: Help me figure this out
- Q: Primary audience for the site? — A: Hiring Managers and Vendor recuiters
- Q: Which 3 stories should go live first? — A: HQ build, Rating and Underwriting New Busienss and Renewals, Integrating Provider data to support claim adjudication as part of a larger claim modernization program

**Era I — HQ Build**
- Q: Roughly what year was the cutover / move? — A: 2012
- Q: How big — seats and/or square footage? — A: 24000
- Q: Any measurable outcome? — A: Still in use today. Required very few technical adjustments since build
- Q: Notable gear / vendors? — A: Ciso ASA, Procurve HP Swiching, APC UPS 30KW, Kantech Software, ioproxy,
- Q: A hard moment or war story? — A: We had alot of issues with the Phsyical access system which was clearly a challenge for the selected Vendor.

**Era I — Policy Download (cutting my teeth)**
- Q: What was the actual task? — A: Each day we would download new business, endorcement, and renewal data to brokerages using MASTERCOM and AL3 CSIO/ACORD standards. This required ini file mapping for items and coverages as well as field data like firehall distance and roof type.
- Q: Why was this your 'learning to swim' moment? — A: This was my first intergration job I just didnt understand it at the time. It all grew from there from download issues and resolving them with brokers and broker managment sytem providers. To Working with Brover/ Willis Towers Watson on New business and policy change load using REST and XML and JSON formats
- Q: What broke that you had to figure out? — A: When new coverages or underwriting data was created mapping needed to be updated and tested. Eavh load usually had errors that required investigation with the broker.

**Era I — Policy / Claims / Billing Inquiry**
- Q: What did you build? — A: I worked with my manager to define requirements with our underwriting, claims and accounting departments. Mock up designs, provide mapping data from our internal endpoint data structure to CSIO/ACORD to be used to generate PDF artifacts pulled using realtime integration with the backend policy management system. Brokers could from their BMS (Powerbroker, TAM, EPIC, SIGXP, CIMDATA) directly or from a portal we provided though the Brovada One Platform.
- Q: What systems did it bridge? — A: IBS Policy, BIlling, and Claims to CSIO/acord standards to PDF artifact stored in the broke system.
- Q: Before / after for the people using it? — A: The biggest usecase we found was billing inquiry where overall calls to our accounting team was reduces once the broker could investigate billing related question directly by pulling the billing inquiry history. Likewise brokes could inquiry about the status of claims, seeing the artifact update as resevers and payments were made.

**Era II — Rating Layer**
- Q: What system did the rating engine live in? — A: IBS (Insurance Business System) built by MCCG (now Cognition+)
- Q: What did you build it IN? — A: Rules Language, lookup tables, Basic java code for edge cases
- Q: What was broken or manual before it? — A: Improved overall rate change and adjustment turnaround and accuracy. Implemented new rating for new products like Farm, Commercial, Agri. Rules were built to be modular
- Q: Any number? — A: turned rate changes from a week long process to a process that can be adjusted in near Realtime
- Q: Personal vs commercial — what lines did it cover? — A: Auto rating itself was regulated and handled by the vendor for call clients. We handled undersriting logic. and validation. I managed residential, farm, agri, and commercial business rating and underwriting rules

**Era II — New Business Load (Auto & Residential)**
- Q: What was the path? — A: The Idea was to provide solution that wasnt another portal the broker had to learn as that was the big theme at the time and brokers had to learn a new one for each carrier ontop of their own BMS. The goal with Brovada was direct integration with the broker management system extractign policy data directly and transporting that using mapping to acord/csio standard though a local client which provided the ability to add validation UI to request additional information that was not provider or not provided by the BMS system. THis allowed up to get the full picture of the claim and underwrite this data to bind in realtime
- Q: Walk the submission-to-issue flow briefly. — A: The broker would have a client answer the acord application which was either then manually entred into their BROKER system or was a built in form in their system. This data was then imported into the data structures their BMS used. They would use this system to provide further refined data and obtain quotes for the buisness from multiple carriers usingin things like applied Rater amoung other qouting providers at the time. (carriers would send in their rate books to these providers and work with them to validate rating for their risks so the vender could inclue them in the quoting results). anyway then the broker would select a carrier from the qoute with their client imput. before they would then need to mail or email the paper/pdf application along with banking information. with the new business load they clicked the load button within their BMS which would open the client and present any required questions to gather additional underwriting and risk assessment information required. the rules (i developed) would review the data and determine if to reject (error), refer (loads but not bound) or to fully bind and load the risk. in both refer or bind the data was fullend transformed from BMS to ACORD/CSIO to IBS data fields and values and structures. and a policy was created in the backend IBS policy system. these where then printed and sent via download to the broker via download (edocs for documents and reg download for the data) this broght both sytem post bind into sync (IBS and BMS) policies that were referred were loaded but held for manual review by and underwriter who then could find the risk directly and then the same document and download process was used.
- Q: The honest metric? — A: Yes before like the broker would print or email the application into the carrier if mailed that would take a day to phyically be sent then another to flow through the carriers mailroom and onboarding process. the risk then needed to manualy keyed from the application to the policy management system, additional information needed a phone call or email to the broker who then would need to gather and reply. finally once the data walll entered and complete an underwriting and rating result cold be created. the bind would be donwloaded the day aftert that but the documents would take weeks to arrive
- Q: What was automated vs left to a human? — A: I always based the idea on what i called "vanilla" policies, define what that looked like for each tier of coverage Plus, Standard, Limited, etc. if the policy did not fall cleanly into these buckets there were not vailla and kicked out for referal to an underwriter for review.
- Q: Was it real-time bind? How autonomous, honestly? — A: It took a while to gain confidence enough to do a true realtime bind but we did get there. For a simple single family home newer build with modern and complete home systems would bind with a policy number returned to the broker, they could then update their quote with the policy number, the following day our data download and edocs would download to the broker tagged with that same policy number which then loaded to their BMS automatically

**Era II — Commercial Quoting**
- Q: What did you build? — A: I worked from the analyst level and mapping with underwriting, wtw analyst and development to develop the UI flow, fields and values, stages and extensive UI, and policy/underwriting validation layers, gathering alot more detail that many BMS systems at the time did not store fore commercial risks. SO the portal was necessary as often commercial risks were tracked loosely in the BMS and more in a related spreadsheet and accounting system. So we defined and tested the requirements the development was completed by WTW.
- Q: What made commercial harder than personal lines? — A: The lack of BMS data and the amount of additional datapoints a commercial risk requires and varied depending pm renters insurance vs a restaurant or place of worship.
- Q: What did the portal replace? — A: Replaced alot of work for the broker and underwriting by providing a platform to submit these risks. Reduced the amoutn of time it took for a quote which was often manually completed by an underwriter but now could be quoted live in realtime

**Era II — Auto & Residential Policy Change**
- Q: Rules against the full re-rated policy image, or just the delta transaction? — A: the flow again was indented to start with the broker and their BMS system instead of a paper or email trigger. The broker would make the change in their BMS system, click the load button which would extract the current complete policy which included the change. Then a version of policy inquiry was used to create a field by field comparison. A UI was returned validating the intended change and requested any additional information required. this was then submitted to the rules engine and using underwriting rules and rating to again reject, refer, or bind the endorsement
- Q: The adoption / ease-of-use win? — A: Brokers were eager to support and use this toothing as endorsements often was the leave profitable work they can do but it can take a lot of their time. Brokers get commission and endorsements add little or remove some of that renewal commission. This allowed them to update their system and submit the change make the process alot faster for both them and their client.

**Era II — Underwriting Automation**
- Q: What did the referral / manual queue look like before? — A: Underwriters would monthly get a list and work as a team to manually open and review each policy. review the details against current underwriting standards, review discounts (to add or remove) based on the prior years. they would then manyally flip the policy to renewed, print the decs and riders then stuff mailers.
- Q: How did a rule decide go / no-go? — A: The rules again were based on this idea of "Vanilla" policies. Policies that had no red flags, updated/new equipment and structures like roof. If for example there was an oil tank heading that would be no go. where natural gas furnace was a much safer risk. If they had a pool and daycare or some other remarkable case the policy would be flagged for review. The system also opperated on a fail first idea meaning it favored referring to underwriting and was the rule until all the checkeds passed them it would flip to pass.
- Q: What surprised you about which cases still needed a human? — A: Oh I should mentioned before i forget alot of the 20% of claims where claism that required a 5 year evaluation or Im cant recall the term but we would update their price of their home which required a manual review as the process to get the updated price was manual.
- Q: Confirm the numbers — A: 80% residential Renewals, 30-40 for farm and commercial

**Era III — Takeover History Load**
- Q: What was the source data? — A: This is a very unstructured process in the health and life sector where when a group carrier takes over a group from another. They send the groups claims history to the new carrier so that that carrier can properly adjudicate physical and fiscal maximums , this data inludes the member then recepient of the treatment the dates, amounts submited, coinsurnace, eligible and payable amounts along with benefit types and some dental details. This is sent either in PDF or Excel document format which then needs to moved to a medavie format which can be used for eligibility validation (making sure the member exists in the new group) the data then must be formated into a new spreadsheet that maps to medavies claism system and loaded so that accumulation of physical and fiscal maximums can be properly totaled with new claims.
- Q: What kept breaking? — A: The data must go through similar audjudication logic but not exact. as this business already adjudicated and paid but it was done by another carrier. When loading the system using minimal data provided alot of adjustments to the adjuducation flow and validations were needed.
- Q: What did your reusable workbook actually do that saved the team? — A: I used AI to help develop a Excel Workbook Template based on Macros that would validate the data (searching for things like formatted dates, missing names, or amounts), then support exporting the data from Excel row column format to XML elements that the MAAX adudication system could ingest. This provided wasy to organize and slice the data to make loading easier to manage such as breaking down larger files into multiple load files or by benefit. Lastly the tool provided a way to consume the error xml provided by the system which them allows for highlighting of errored rows within the template.

**Era III — Claims Modernization**
- Q: What was YOUR specific scope on the program? — A: My first exposure to MAAX was writing a request for comment that vendors like CGI would provide and RFP for to modernize the UI. This required a deep analaysis of the existing technical stack and frontend frameworks and defining the current and future state achitectures clearly so the vendors could faily quote the effort required. THen my first format project stream role was to work on the integration (even through it was the adjudication stream) of provider data from the Medavie Provider Registry to the new MAAX system in order to support claim adjudication. I was resposible for underwriting the adjudication reuirements for provider data, understand the source system PRN and the existing provider consumer intergation sturture and provide solutions to close those data gaps. Next i worked on takeover history which takes claims history from other carriers and loads the claims data into the MAAX system for use with adjudication as well specificall accumulations. There was an existing takeover history load process at a company and MAAX system I had to review this company and system process and identify gaps them develop solutions outlining how to close them.
- Q: The one decision or catch you're proudest of? — A: We were loading Takeover History for a large group of high priority clients (400k lines and 60m in reimbursements) This load took planning over multiple days and files to complete. However mid load process we had a build to the system which failed and resulted in an outage for several days. these loads needed to be completed before these clients went live in just a few more days. I rasied this as a risk mid event and leadership quickly understood the priority of these loads and provided support to ensure we were able to compelte the loads before the deadline. Anotther was a the Report that was really a ETL, I was handed a report as one of the final tasks of the program to close up. upon review I found it was not that simple and part of a larger ETL pipeline still active in our lagacy system build in COBAL. The process extracted claims history daily from the lagacy systems into flat file format and transferred this to a client system. now that we were moving away from this legacy system this process would have stopped working as the source was chaning. however other systems also tied to this process made rebuilding the entire pipeline not possible given the timeline of the project. So I raised this as a risk and guided the solution providing mapping supprot and testing supprot from mapping our new systems data structure to our legacy which then outputed through endpoint a flat file and loaded it to the legacy mainframe to be picked up by the existing pipline and sent to the client without any require changes for the client.

**Era III — New API ↔ Old COBOL Job Chain**
- Q: What was the legacy job chain doing? — A: *(Josh pasted the takeover-outage + ETL story again here; the substantive COBOL content is captured under Claims Modernization above.)* The Report that was really an ETL... part of a larger ETL pipeline still active in our legacy system built in COBOL. The process extracted claims history daily from the legacy systems into flat file format and transferred this to a client system... rebuilding the entire pipeline was not possible given the timeline... So I raised this as a risk and guided the solution providing mapping and testing support — mapping our new system's data structure to our legacy, which then output through an endpoint a flat file and loaded it to the legacy mainframe to be picked up by the existing pipeline and sent to the client without any required changes for the client.
- Q: Why couldn't it just be ripped out? — A: Other legacy system were also tied into the data sent so we needed to shoehorn in out modern systems output so that process could continue.
- Q: How did you bridge modern API to mainframe batch without breaking either? — A: I used AI to help define the mapping required from out modernized system to the legacy and flat file format. I was able to provide the model with enough datapoints it could complete 80% of the mapping automatically leaving the exceptions for me to investigate. this prooved to be very acurate process and helped development complete their work more quickly. The developer was then to extract and transform this data into the flat format required. a script was then used to pull from the modern endpoint the flatfile and save it to the legacy mainframe for to be picked up.

**Bonus — Interview narrative**
- Q: Why leave Grenville P&C for Medavie health/dental? — A: During my time with Grenville I got to wear many hats, I also was encouraged to continue my learning and through this learning I often found frameworks (project management, Analsys techniques, or Agile for example) for processes that were helpful but struggled to implement due to our size. Medivie provided the scale I was looking for to experience these mythodologies and frameworks.
- Q: Hardest thing you learned about enterprise process at Medavie? — A: You cant just go talk to the CEO or even CIO. this makes sense due to scale but also can slow decision making.
- Q: Why should a P&C employer believe you'll stay in P&C this time? — A: The majority of my experience is in P&C and I still have contacts, and feel I have more to offer the insurtech sector

## Appendix C — Reusable résumé evidence, with stable identifiers

Source: S2, dataset `2026-10-15.3`. These are the exact prewritten résumé statements from the structured dataset. Active status controls current selection, not whether historical evidence is retained.

### experience-dell

**Title:** Latitude and OptiPlex support  
**Period:** 2006–2007  
**Current selection:** active

Supported Latitude laptops and OptiPlex desktops on Dell’s Gloves Off team, working through hardware diagnosis with clients and explaining the next steps clearly.

**Evidence references:** `source-dell`.

- No numerical first-call resolution rate is established.

### experience-foundations

**Title:** Small Business Server swing migrations  
**Period:** 2007–2009  
**Current selection:** active

Developed a repeatable Small Business Server swing-migration process, separating infrastructure roles while accounting for data, email and identity dependencies.

**Evidence references:** `source-foundations`.

- No audited preservation guarantee or exact project date is asserted.

### experience-headquarters

**Title:** Headquarters infrastructure and move  
**Period:** Approximately 2014  
**Current selection:** active

Carried headquarters infrastructure design from planning through build and move-in, accounting for networking, AV, security, cooling and resilient power.

**Evidence references:** `source-headquarters`.

- No budget or quantified reliability claim.
- The broader bare-metal blade centre to ESXi work has no established exact date.

### experience-inquiry

**Title:** Broker policy inquiry  
**Period:** Within 2009–2022; overlapping work  
**Current selection:** active

Connected broker inquiry workflows to backend policy, billing and claims information through mockups, field/value mappings, SOAP/XML request diagnosis and integration testing; REST was used in the later backend.

**Evidence references:** `source-inquiry`.

- Exact completion date is not established.
- Do not turn REST experience into unverified JSON standards experience.

### experience-workflows

**Title:** Commercial quoting and broker integration  
**Period:** 2010 onward; overlapping work  
**Current selection:** active

Designed and implemented P&C rating and underwriting rules, mapped CSIO/ACORD broker payloads to proprietary backend fields, and directed UI/specification changes so commercial quoting collected the required risk information.

**Evidence references:** `source-workflows`.

- Responsibility does not imply a formal Architect job title.
- Vendor teams performed commercial quoting development.
- AL3 and eDocs familiarity is supported; hands-on JSON standards experience is not claimed.

### experience-newbusiness

**Title:** Auto and residential new-business integration  
**Period:** 2010 onward; overlapping work  
**Current selection:** active

Implemented rating and underwriting rules and helped design broker-portal messages for correction, referral or binding, with validation that distinguished new business, renewals and endorsements.

**Evidence references:** `source-newbusiness`.

- No universal automation rate or project-volume claim.

### experience-renewals

**Title:** Renewal eligibility and exception routing  
**Period:** Within 2009–2022; project date not established  
**Current selection:** active

Designed the renewal eligibility framework and implemented rating and underwriting rules that classified standard policies for automatic renewal while referring exceptions for human review.

**Evidence references:** `source-renewals`.

- No independently audited automation result is inferred.

### experience-upload

**Title:** Authenticated document upload and support tooling  
**Period:** 2013–2018 source range; approximately 2018  
**Current selection:** active

Built a C#/.NET portal using REST APIs for authenticated submission into policy records, with operational logging and internal log-search tooling to investigate recurring integration issues.

**Evidence references:** `source-upload`.

- No audited security certification, encryption mechanism or authentication protocol is asserted.

### experience-claims

**Title:** Provider data for claims adjudication  
**Period:** 2022–present; parallel workstreams  
**Current selection:** active

Defined provider-integration adjudication requirements, analyzed source and consumer gaps, and contributed mappings alongside architects and delivery teams.

**Evidence references:** `source-claims`.

- ProviderRegistry solution review, field mappings and synchronization requirements are confirmed in the additional Oct15 firsthand account.
- No solo implementation or separate go-live claim; platform acronyms remain unconfirmed.

### experience-takeover

**Title:** Takeover-history validation and XML loading  
**Period:** 2022–present; project date not established  
**Current selection:** active

Researched the existing adjudication history-load solution, documented gaps and XML schema changes, guided development through implementation and maintenance, and supported end users with Excel templates, VB scripts and validation for repeatable XML-based intake.

**Evidence references:** `source-takeover`.

- The precise VB runtime and public platform spelling remain unconfirmed.
- Schema changes were defined and guided, not claimed as personally coded; no sole ownership or numeric improvement claim.
- No private schema or claim records are included.

### experience-continuity

**Title:** Claims reporting continuity mapping  
**Period:** 2022–present; overlapping migration work  
**Current selection:** active

Identified a missed requirement for underlying client data and completed continuity-mapping design for a REST-based adjudication export feeding an existing COBOL pipeline that transforms it into an InterBlue flat file for client Cognos processing and reporting; implementation/go-live remains unconfirmed.

**Evidence references:** `source-continuity`.

- Design contribution confirmed; REST service implementation and bridge go-live remain unconfirmed.
- Unconfirmed intermediate acronym is omitted.
- No private operational specification, client identity, schema or transport-security claim is published.

### experience-sql

**Title:** Claims SQL and financial reconciliation  
**Period:** 2022–present; overlapping reporting work  
**Current selection:** active

Hand-wrote SQL for claims reporting, developed financial report logic, and reconciled and balanced claims against the financial reporting view.

**Evidence references:** `source-sql`.

- No financial volumes, private queries or database schemas are published.

### experience-nexus

**Title:** NEXUS  
**Period:** Active development  
**Current selection:** active

Implemented scoped context compilation, explainable model routing, review/execution separation and recoverable distributed Node execution in NEXUS, using a headless TypeScript core, React/Vite, PostgreSQL/Redis, OpenAPI and WebSockets.

**Evidence references:** `source-nexus`.

- Independent project, not employer experience.
- Pub/sub architecture is not established by this approved public snapshot.
- Do not imply every product vision feature shipped.

### experience-lowkey

**Title:** LOWKEY  
**Period:** Active development  
**Current selection:** archived/inactive

Built local speech-to-input workflows in LOWKEY using React/TypeScript, Rust/Tauri 2 and sherpa-onnx/Parakeet, with AudioWorklet capture, phrase detection and a Kotlin Android keyboard.

**Evidence references:** `source-lowkey`.

- Independent project, not employer experience.
- No universal device support, NPU, speed or absolute-security claim.
- Local decoding/source review is not a network audit.
- Archived at Josh’s explicit request; excluded from current resume selections.

### experience-provider-sync-review

**Title:** ProviderRegistry synchronization solution review  
**Period:** 2022–present; exact project date not established  
**Current selection:** active

Reviewed the provider-registry integration design, including field mappings, scheduled publish/subscribe processing and REST-based data retrieval.

**Evidence references:** `source-provider-sync-review`.

- Scheduled table-backed publish/subscribe; no Kafka, message-broker or real-time implementation claim.
- Review/design contribution, not a claim of solo implementation or separate go-live.
- Source/destination platform acronyms remain unconfirmed; use ProviderRegistry and adjudication system.

## Appendix D — Compact term reference

**P&C:** property and casualty insurance. **BMS:** broker management system. **NOC:** network operations centre. **API:** application programming interface. **XML:** a structured data format. **REST/SOAP:** interface styles used to exchange data. **ETL:** extract, transform and load data between systems. **SQL:** database query language. **Underwriting:** deciding whether and on what terms to accept a risk. **Adjudication:** applying coverage and benefit rules to a claim. **Endorsement:** a policy change. **Reconciliation:** checking that related records and totals agree. **Provenance:** the source trail behind a statement.
