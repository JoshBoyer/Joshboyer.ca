# Imported portfolio text

Version: 1.0 | Captured: 2026-10-18

Source: `dist/index.html`; text extraction retains archived case templates as evidence.

## project-nexus

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

## project-lowkey

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

## project-workshop42

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

## project-dell

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

## project-foundations

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

## project-headquarters

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

## project-inquiry

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

## project-newbusiness

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

## project-workflows

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

## project-changes

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

## project-renewals

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

## project-upload

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

## project-claims

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

## project-takeover

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

## project-continuity

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

## project-sql

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

## Home, Projects and About

Josh Boyer — Business context. Technical depth.

Skip to content

Josh Boyer.

Menu

Home

Projects

About

Experience at a glance ↗

Business context.

Technical depth.

Practical delivery.

I'm Josh. A technology generalist with 20 years in technology, deep insurance experience, and a habit of following the problem all the way through.

Explore my experience All case studies Build a tailored resume

AI-generated conceptual image of connected systems and design choices. Not an actual employer facility, project model or portrait.

Make complexity

understandable.

I look beyond the initial request: uncover missed requirements, connect business needs with system constraints, evaluate tradeoffs, and guide delivery with the people doing the work.

Built through support, infrastructure, insurance systems and hands-on delivery.

A career built

through connections.

Each new responsibility builds on what came before. Support became systems. Systems became insurance integrations. Today, that foundation shapes how I approach solutions.

The personal story

Pause all motion

Illustrative scenes. Mobile starts still; play any scene to explore it.

2006SupportDell

AI-generated illustrative context for hardware support. Not actual employer or project photography; equipment, documents and screen content are illustrative. Authored motion is not live traffic, actual claims or employer activity.

PlayOriginal imageOriginal image

Dell · 2006 · Latitude / OptiPlex support

Start with the real problem.

Latitude and OptiPlex support on Dell's Gloves Off team. Time to understand the fault, resolve the issue on the first call and reduce callbacks.

Hardware support

2007–2009SystemsHarris / Ottawa Computer Services

AI-generated illustrative context for systems migration. Not actual employer or project photography; equipment, documents and screen content are illustrative. Authored motion is not live traffic, actual claims or employer activity.

PlayOriginal imageOriginal image

Harris · 2007–2009 · NOC and infrastructure projects

Follow the dependencies.

From NOC work to racks, networks, identity and email. Repeatable Small Business Server swing migrations made the relationships between services impossible to ignore.

Migration story

2009 onwardInfrastructureGrenville

AI-generated illustrative context for headquarters infrastructure. Not actual employer or project photography; equipment, documents and screen content are illustrative. Authored motion is not live traffic, actual claims or employer activity.

PlayOriginal imageOriginal image

Grenville · within 2009–2022 · overlapping work

Infrastructure that works.

A headquarters is more than a network diagram. I worked from technical design through the build and move, connecting physical constraints with what the business needed to operate.

Networking, AV, security, cooling and resilient power.

UPS and generator considerations within the infrastructure plan.

Bare-metal blade centre transition to ESXi.

Inside the headquarters move

What carried into the next chapter

Operational dependencies became a practical foundation for analysis and design: understand what needs to keep working while something changes.

Mid-2010s–2022AnalysisGrenville · overlapping responsibilities

AI-generated illustrative context for insurance integration. Not actual employer or project photography; equipment, documents and screen content are illustrative. Authored motion is not live traffic, actual claims or employer activity.

PlayOriginal imageOriginal image

Grenville · business rules, broker workflows and integration

Connecting insurance systems.

Bring business meaning across the interface. I designed and implemented policy rules and worked through broker requirements, payload mappings and integration failures.

Policy inquiry, new business, commercial quoting and policy changes.

Rating and underwriting rules; renewal eligibility and human exceptions.

SOAP/XML and later REST integration work, plus authenticated document upload.

Broker integration story

Explore the connected work

Policy inquiry New business Policy changes Renewal rules Document upload

2022–presentSolution Design & ArchitectureMedavie · ongoing

AI-generated illustrative context for claims and SQL design. Not actual employer or project photography; equipment, documents and screen content are illustrative. Authored motion is not live traffic, actual claims or employer activity.

PlayOriginal imageOriginal image

Current professional work · Medavie · 2022–present

Designing business solutions.

Understand the current state. Shape the change. My work connects provider/B2B integration requirements, claims-data transitions and the reporting detail that helps a solution hold together.

Solution review, provider synchronization requirements and field mappings.

Production takeover-history validation, XML loading and reconciliation tooling.

Hand-written SQL, financial report logic and reporting-continuity analysis.

Provider integration work

Explore the current work

Claims-data transition SQL and reconciliation Reporting continuity

The modern reporting exchange remains a proposal; continuity mapping is completed analysis/design. Current work continues alongside the independent builds below.

Alongside my professional workCapstoneNEXUS · active development

A foundation, put into practice.

NEXUS brings the career foundation together: business context, system boundaries, deliberate execution and evidence. My independent capstone keeps me close to implementation while the professional work continues.

NEXUS

Scoped context, explainable routing and recoverable execution. An AI-assisted work system in active development.

Run NEXUS → run.nexus (opens in a new tab)Capstone case study

Professional work continues at Medavie. NEXUS grows alongside it as my capstone.

Read the fuller career account

Experience, in detail.

Support, systems, infrastructure, analysis and solution design: overlapping chapters that build toward architectural work.

Follow the path

SupportInfrastructureIntegrationsSolution designToday

01

2006–2009Dell / Harris

Technical support / NOC & project technician

Start with the

real problem.

I joined Dell in September 2006, supporting Latitude laptops and OptiPlex desktops on the ‘Gloves Off’ team. We could spend more time with a client to resolve the issue on the first call and reduce callbacks. At Harris, that support foundation grew into NOC work, complete rack installations and migrations across connected services. I learned to follow the real problem across hardware, networks, identity and email—and to make the process repeatable.

Contributions

Latitude and OptiPlex hardware support, with time to work through the issue.

NOC nodes and corporate support, progressing to racks, switches, firewalls and servers.

Repeatable Small Business Server swing migrations across data, email and identity.

Career evidence: Josh’s first-person account, supported by the earlier career résumés. No resolution-rate metric is asserted.

More context +

At Dell, first-call resolution and fewer callbacks mattered more than optimizing each call’s duration. At Harris, I installed, updated and replaced NOC nodes, handled password/email resets and desktop/laptop support, then worked on client rack installations and Harris’s own firewalls, switches and servers. Exchange, BlackBerry Enterprise Server, Active Directory groups and Group Policy were part of that connected environment. I later moved to Grenville because I wanted to focus on one company.

02

2009–2022Grenville

Systems / network administration

Make the foundation

work in real life.

At Grenville, I took headquarters technical infrastructure from design through the build and move, accounting for networking, AV, security, cooling and resilient power. I am proud of the smooth transition. The broader infrastructure work also included moving a bare-metal blade centre to ESXi. As a network administrator colleague took more daily operations, I moved toward projects and analysis, carrying forward a practical understanding of the dependencies that make a design work in real life.

Contributions

HQ design through build and move: networking, AV, security and cooling.

UPS and generator considerations within the infrastructure plan.

Bare-metal blade centre transition to ESXi.

Professional evidence: infrastructure planning and virtualization work; no internal diagrams published.

More context +

This chapter connects solution design with physical constraints, operational dependencies and hands-on implementation.

03

2010s–2022Grenville

Analysis, business rules and development · overlapping responsibilities

Connect the rules.

Connect the systems.

At Grenville, I personally designed and implemented P&C rating and underwriting rules. I connected that work to broker inquiry, new business, quoting and policy changes—diagnosing requests, testing integrations and directing UI changes to capture missing risk information. I helped shape messages that let users correct issues, refer for review or bind where allowed. Renewal automation sharpened the same principle: classify eligible standard cases, while preserving a clear path for human judgment.

Contributions

Personal design and implementation of rating, underwriting and renewal rules.

Broker inquiry/new business, change comparison and actionable portal messages.

Renewal framework separating eligible standard policies from human-review exceptions.

Evidence: Josh’s first-person account and prior career sources. Rules architecture is a responsibility, not an invented formal title.

More context +

Broker desktop clients used SOAP/XML requests; the backend later used REST. TAM and Epic integrations worked through Bravado/Bravado1. I mapped and transformed fields and values across CSIO/ACORD payloads and proprietary backend fields. Toward the end of Grenville, I performed current/future-state analysis and wrote specifications for a planned restructuring of policy administration, business classes and organization. This was analysis/design work, not a delivered replacement platform.

04

2022–presentMedavie

Functional analyst / claims architecture work

See the current state.

Shape what's next.

At Medavie, I work across the detail of claims systems and the design of change. That includes provider-integration requirements, an Excel tool that turns inconsistent takeover history into validated XML, and hand-written SQL and financial report reconciliation. A supposed reporting assignment turned out to be a daily ETL integration. Understanding that distinction shaped the continuity mapping and the modernization proposal. The recurring question is practical: what has to keep working while the system changes?

Contributions

Provider-integration requirements, gap analysis and mappings alongside architects.

Production takeover-history validation, XML transformation and reconciliation tooling.

Hand-written claims SQL, financial report logic and reporting-continuity analysis.

Evidence: current first-person account, supported by earlier career sources. Delivered tooling, completed analysis and open proposals are distinguished in the case studies.

More context +

The reporting continuity mapping is analysis/design; the modern Power BI or alternative exchange remains a proposal. The provider-registry case confirms solution review, mappings and scheduled synchronization requirements. Frontend-replacement details stay in draft until their exact scope is confirmed. Employer financial totals, private schemas and claim data are omitted.

05

TodayIndependent projects

Hands-on software and systems design

Keep learning.

Keep building.

Independent projects give me room to work directly with new tools and practical constraints. NEXUS applies my systems experience to AI-assisted work with context, control and evidence. These projects keep the feedback loop close: build something, inspect how it behaves, and use what I learn to shape the next iteration.

Contributions

NEXUS: scoped context, explainable routing and recoverable execution.

Evidence: implemented NEXUS software mechanisms; the broader product remains in active development.

More context +

NEXUS remains in active development. Project studies distinguish implemented mechanisms from the broader product vision.

Explore the projects →

Broad perspective.

Practical next steps.

I'm interested in technical solutions architecture and forward-deployed work: close to the problem, the people and the implementation.

More about how I work

Experience, made concrete.

Each chapter adds to the foundation.

Professional stories first, then the independent builds that keep me learning.

All workProfessionalCapstone

A foundation, built over time.

From a hardware fault to an insurance rule or a claims-data transition, the scope has grown. These stories show the decisions, implementation and lessons that connect the work.

Periods are approximate where project dates are not established. At Grenville (2009–2022), infrastructure, analysis and development overlapped; each new responsibility built on what came before.

01

September 2006 · early careerDell

Dell Latitude and OptiPlex support

A hardware fault is disruptive enough without asking the client to keep calling back. On Dell’s Gloves Off team, we could spend more time working through the issue instead of optimizing each call’s duration.

Latitude / OptiPlex hardware support

Read the case study →

02

2007–2009Harris

Small Business Server swing migrations

Customers were outgrowing Microsoft Small Business Server, where Exchange and Active Directory roles shared a combined environment. Moving to separated infrastructure required careful handling of data, email and identity dependencies.

NOC / project technician

Read the case study →

03

Approximately 2014Grenville

Headquarters infrastructure and move

A headquarters move brings networking, AV, security, cooling and resilient power into one physical environment. The technical plan also has to support the build, move and operational transition.

Systems administration / technical design contributor

Read the case study →

04

Within 2009–2022 · overlapping workGrenville

Broker policy inquiry

A broker inquiry needs to return information that is useful in the broker’s own workflow. Policy, billing and claims information crosses system boundaries, and the meaning of the fields has to survive the exchange.

Business analysis, mappings and integration testing

Read the case study →

05

2010 onward · overlapping workGrenville

Auto and residential new-business integration

A new-business workflow cannot rate or underwrite a risk properly if the interface does not collect the information the rules need. Auto and residential submissions had to connect broker inputs, validation and the insurance decision.

Requirements, UI specifications and hands-on rules implementation

Read the case study →

06

2010 onward · overlapping workGrenville

Commercial quoting and broker integration

Early commercial quoting and broker new-business workflows needed the right risk information, consistent insurance meaning and useful decisions. Inquiry, upload and download flows crossed broker payloads, proprietary backend fields and interfaces that had to be diagnosed and tested.

Policy rules design and implementation; analysis and integration contribution

Read the case study →

07

Within Grenville tenure · 2009–2022Grenville

Policy-change comparison and validation

A policy change can alter risk and rating in ways that differ from new business or renewal. Users needed to understand what they were changing before submission, and the system needed to validate those changes in the correct business context.

Analysis, policy rules implementation and UI/integration design

Read the case study →

08

Within Grenville tenure · 2009–2022Grenville

Renewal eligibility and exception routing

Standard policies could be eligible for automatic renewal, while exceptions still required insurance judgment. The challenge was to make that classification explicit without treating every policy as suitable for automation.

Framework design and hands-on rating/underwriting rules implementation

Read the case study →

09

2013–2018 source range · approximately 2018Grenville

Document upload into policy records

External insurance adjuster users needed an authenticated way to submit supporting documents and images directly into policy-management records. Ad-hoc email delivery left the workflow fragmented; the goal was a controlled submission path tied to the backend record.

Systems analyst / hands-on developer and integration contributor

Read the case study →

10

2022–present · parallel workstreamsMedavie

Provider data for claims adjudication

Provider integration needs the information required for adjudication, with clear requirements and mappings across source and consumer systems.

Functional analyst, working alongside architects and delivery teams

Read the case study →

11

2022–present · project date not establishedMedavie

Takeover-history validation and XML loading

When a group changes insurers, its prior claim history needs to inform benefit and limit adjudication. The history arrives in inconsistent spreadsheets or data derived from PDFs, while the receiving adjudication system expects a defined XML structure.

Excel tooling, validation and data transformation

Read the case study →

12

2022–present · overlapping migration workMedavie

Preserving a daily claims reporting feed

I was assigned what sounded like a Power BI report. Looking at the real process, I recognized a daily flat-file ETL integration through legacy COBOL/Interblue, feeding a client’s Cognos reporting. The migration question was how to preserve that contract as adjudication data moved to the new system.

Current-state analysis and continuity mapping design

Read the case study →

13

2022–present · overlapping reporting workMedavie

Claims SQL and financial reconciliation

Claims reporting has to make sense against the financial reporting it feeds. While the extract and modernization decision remained open, the immediate work still needed an understanding of report logic and a way to reconcile the claims information.

Hands-on SQL, financial report logic and reconciliation

Read the case study →

The capstone.

The same curiosity, with a closer build-and-learn loop.

Active development

NEXUS

Context, decisions and execution, connected.

An AI-assisted work system with scoped context, explainable model routing, evaluation and recoverable execution.

TypeScript · React/Vite · PostgreSQL · Redis

Inside NEXUS ↗

A generalist.

By experience.

I like understanding how things fit together—and getting into the details that make them work.

Barron Canyon · AlgonquinIllustrative portrait composition.

I started in hardware support at Dell, where we had time to work through a client’s problem. At Harris, the scope grew from NOC work to racks, networks, identity and email migrations. I moved to Grenville because I wanted to focus on one company, and the work grew with me: headquarters infrastructure, insurance rules, broker integrations and hands-on development.

At Medavie, I bring that foundation into claims analysis, integration requirements, data transitions and reporting. I still like getting into the implementation: building an Excel tool, writing SQL or tracing an interface failure. That detail helps me see what a solution will ask of the people and systems around it.

I am interested in technical solutions architecture and forward-deployed work because they bring those perspectives together: understand the problem, design the change and stay close enough to the implementation to learn from it. Outside work, NEXUS keeps that build-and-learn loop going.

Away from the screen: Workshop42 (opens in a new tab).

See what I’m building →

Experience at a glance.

2006

DellTechnical support

2007

HarrisNOC / project technician

2009

GrenvilleSystems / network administration

2010s–2022

GrenvilleSystems analyst / business rules architect

2022–present

MedavieFunctional analyst · Claims architecture work

About the résumé +

This private prototype includes a career overview. A tailored résumé download has not been attached yet.

JavaScript is required for the three-page navigation and project details. The professional journey is available above.
