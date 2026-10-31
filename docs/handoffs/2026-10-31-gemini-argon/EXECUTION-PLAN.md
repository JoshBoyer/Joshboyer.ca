# Completion plan and agent ownership

Version: 1.0 | Date: 2026-10-31 | Lead: Argon in Gemini

## Target

Finish a secure, conversational, visually convincing **private demo** with real CAG, retrieval and read-only MCP execution. Preserve the existing AWS/Gateway/provider-key design. Make the request pipeline inspectable in a separate side panel without turning the conversation into a log viewer.

The reference image is inspiration for composition and interaction, not a specification of facts or live capabilities. Start from the current implementation, not a second chat stack.

## Requirements ledger

| ID | Must be true at completion | Current state |
| --- | --- | --- |
| R01 | General-purpose natural conversation, relevant follow-ups, no impersonation or invented actions | Implemented; broader qualification incomplete |
| R02 | Main chat contains conversation; evidence and traces stay in a separate selectable panel | Implemented; current mobile/browser matrix incomplete |
| R03 | Reference-inspired visual treatment with accessible, responsive controls and approved assets | Partly implemented; reference fidelity not complete |
| R04 | Portfolio evidence is approved, public-only and versioned; qualifications survive retrieval | CAG foundation implemented; RAG not built |
| R05 | Real bounded hybrid retrieval, pinned embeddings, version alignment and index rollback | Not built |
| R06 | Real MCP initialize/list/call over authenticated transport; only three approved read-only tools | Not built |
| R07 | Application decides authority, models, tools and spend; browser/model cannot grant permissions | Generation path implemented; retrieval/tool extensions pending |
| R08 | Atomic reservations cover every generation, embedding, fallback and chargeable tool operation | Generation implemented; retrieval/tool accounting pending |
| R09 | Replay, cancellation, clear, expiry and restarts preserve privacy and do not duplicate spend | Implemented for current path; extend and requalify for tools |
| R10 | Traces describe real actions and measured timings; no raw secrets, prompts or private reasoning | Implemented for generation; retrieval/tool traces pending |
| R11 | Exact deployed caller, clean-checkout tests, adversarial cases, latency/cost and billing attribution are evidenced | Partial |
| R12 | Public access and voice remain disabled; no new provider or administrative connection is exposed | Required throughout |

## Operating model: 24 subagents, one integrator

Argon is the lead and is **not counted** among the 24 subagents in [the manifest](agent-workstreams.json). The manifest gives every workstream an owner, paths, dependencies and acceptance output. Run bounded waves at the actual platform limit. Twenty-four roles do not justify twenty-four simultaneous writers in shared files.

Before dispatch, discover the actual Gemini/Argon agent interface, authentication, model selection, maximum active workers and cost controls. No standalone Argon command was verified in this workspace. Do not invent invocation syntax, raise permissions, change providers or spend without bounds to satisfy a headcount.

Every implementation agent gets a separate worktree and branch from the frozen integration base. Every brief must say: **“You are not alone in the codebase. Do not revert other agents’ work. Edit only your owned paths; request integration changes from their owner.”** Only Argon integrates branches. Shared contract changes go through A01; orchestration changes through A05; main UI integration through A16.

| Agent | Responsibility | Exclusive source ownership / boundary |
| --- | --- | --- |
| A01 | Requirements and contracts | `chat/contracts/`; requirement ledger; approve interface changes |
| A02 | Baseline and runtime inventory | Read-only source; baseline report and exact clean-checkout commands |
| A03 | Threat model and privacy design | Read-only design review; threat/privacy report |
| A04 | Visual and interaction specification | Reference interpretation and acceptance screens; no source edits |
| A05 | Conversation orchestration | `services/chat/src/chat.ts`, `cag.ts`, orchestration tests |
| A06 | Providers and bounded routing | `chat-provider.ts`, `config.ts`, new routing module and provider tests |
| A07 | Public knowledge and CAG | `chat/knowledge/`, export builder and knowledge tests |
| A08 | Ingestion and embeddings | New ingestion modules/scripts and ingestion tests |
| A09 | Retrieval and ranking | New `services/chat/src/retrieval/` modules and retrieval tests |
| A10 | MCP transport and authentication | MCP server entry, transport, auth and package setup |
| A11 | MCP tool implementations | MCP `tools/` and tool-specific tests |
| A12 | Sessions, replay and privacy | `state.ts`, state tests; no second persistence system |
| A13 | Budget accounting | `chat-pricing.ts`, budget policy and cost tests |
| A14 | Edge and local adapters | `services/edge/`, `worker.mjs`, `serve.cjs`; public paths remain disabled |
| A15 | AWS infrastructure | `infra/aws/`; stable logical IDs, least privilege and reviewed changesets |
| A16 | Chat frontend integration | `dist/chat-assistant.js`, primary UI behaviour tests |
| A17 | Visual implementation and assets | `dist/chat-assistant.css`, private preview HTML, approved visual assets |
| A18 | Details-panel module | Extracted panel module and tests after A16 establishes the interface |
| A19 | Accessibility and mobile review | Read-only browser review; source fixes returned to A16/A17/A18 |
| A20 | Request trace semantics | `trace.ts`, trace-specific tests; shared schema changes requested from A01 |
| A21 | Cross-system functional qualification | Dedicated spike integration tests; independent caller evidence |
| A22 | Adversarial and answer-quality evaluation | Dedicated adversarial tests and existing `chat/evaluation/` fixtures/results |
| A23 | Cost, operations and observability | Probe tools, operator runbooks, billing/log-retention evidence |
| A24 | Independent final reviewer | Read-only review from clean checkout; final qualification report |

A18 must not edit the current monolithic UI alongside A16. Until a module boundary exists, A18 supplies a patch/specification to A16. A14 excludes A17's `services/edge/chat-preview.html`; A10 excludes A11's tool source/tests. Argon owns shared package/build files and integration-only documentation. The manifest gives exact paths and exclusions. The same rule applies to test files: a new owner does not acquire someone else's existing test file because it is convenient. Read the dirty checkout's applicable instructions before moving into isolated worktrees; do not copy its uncommitted changes into worker branches.

Carry forward the [existing architecture](../../architecture/chat-implementation-plan.md): private S3/S3 Vectors, evaluated OpenAI embeddings through Gateway, and stateless Streamable HTTP MCP with API Gateway `AWS_IAM`. The tool catalogue is exactly `search_public_evidence`, `get_case_study`, and `compare_job_requirements`. Semantic search belongs in the chat service; the search tool uses bounded deterministic public evidence. The current corpus excludes numerical renewal rates. Verify service support, pin the SDK/model/index configuration and record any unresolved compatibility issue before implementation. General conversation may correctly skip retrieval/tools.

## Waves and gates

### Wave 0 — Recover and freeze

Argon verifies the repository, checkpoint ancestry, current remote state and deployed identities. Preserve the dirty user workspace; create an isolated integration worktree. Read repo instructions and the local Gemini instructions. Record the actual agent/concurrency interface and a separate development-agent spending allowance; the application's US$25 cap does not control Gemini development usage.

**Gate G0:** requirement ledger accepted as the current interpretation; all 24 planned workstreams registered; preservation and worker ownership recorded. No implementation starts on assumptions about credentials or production exposure.

### Wave 1 — Discovery and design

A01–A04 inspect the actual code, current screenshot, reference image and tests. Freeze the retrieval/MCP/trace contracts, privacy model, model-routing authority and visual specification. A02 runs the exact source checkpoint in a clean environment. Existing failures are classified by test name against the current base.

**Gate G1:** no unsettled architecture question is delegated as an implementation task. Decide whether any model selector/context/settings tab in the reference is needed. “JEV” and the model names shown in that image remain placeholders until explicitly defined and approved.

### Wave 2 — Build the backend completion slice

Run A05–A15 and A20 in dependency order from the manifest, with as much parallelism as file ownership permits. Complete public-only ingestion and retrieval; add real authenticated MCP; extend cost reservation before enabling those calls; integrate bounded routing and trace receipts. Keep the existing session, signature and private-access primitives.

**Gate G2:** an actual deployed private request proves `question → approved context/retrieval → authenticated MCP tool → provider → validated references → reply + trace`, with trace evidence for each action. Demonstrate a real MCP protocol exchange. A stub, local function renamed as a tool, canned search result or screenshot is not sufficient.

### Wave 3 — Finish the experience

A16–A19 implement and review the visual specification and interaction flow, with A20's trace contract from Wave 2. Keep conversation primary. Evidence, tools, context and trace views show observed data for the selected request. On narrow screens, use an accessible side drawer with keyboard focus and Escape behaviour. Preserve state when inspecting older requests.

Reference direction: clear identity, calm glass/paper layers, a readable central conversation and a dedicated inspection column. Use an approved existing portrait or an explicitly reviewed asset; do not publish the user's uncommitted personal images or lift mockup text as factual copy. Honour reduced motion and contrast. Keep microphone controls out of scope.

**Gate G3:** desktop and mobile screenshots plus actual browser interactions prove conversation, selection, panel tabs, tool activity, cancellation, retry, clear, refresh and focus behaviour. No false stage, fabricated source, credential, prompt or hidden reasoning appears in the panel.

### Wave 4 — Qualify and fix

A21–A23 run independent functional, adversarial, answer-quality and operational checks. Send fixes back to file owners; do not relax assertions or suppress failures. Repeat changed tests as required by local Gemini guidance. Classify simulations separately from real database, protocol, provider, browser and deployment evidence.

**Gate G4:** all critical cases pass, actual provider billing/credit attribution is recorded, and representative latency/cost distributions are measured. Document unresolved noncritical limits; never call a single fast request a p95 result.

### Wave 5 — Independent completion review

A24 receives the frozen code and requirements, not a preselected “green” conclusion. Reproduce from a clean checkout, verify the deployed caller and operator path, and try to refute each completion claim. Argon prepares the delivery report and rollback instructions.

**Gate G5:** the spike is a qualified private release candidate. Public activation still requires Josh's explicit decision. Stop rather than silently enable it.

## Security and privacy test matrix

| Boundary | Required hostile/failure cases |
| --- | --- |
| Browser/edge | Missing or forged access, wrong Origin, cross-site mutation, oversized/duplicate fields, no arbitrary model/tool/history input |
| Signed origin | Wrong method/path/body/context, expired/future signatures, reused nonce, duplicate headers, no paid work after rejection |
| Sessions | Cross-session access, immediate expiry, clear while model/tool waits, late events, disconnect, same-ID changed payload |
| Spending | Concurrent aggregate/provider reservations, unused fallback release, ambiguous charges, embeddings/retries/tool context, monthly rollover |
| Retrieval | Private-corpus canaries, version/dimension mismatch, stale/inactive facts, empty/irrelevant results, provider outage and index rollback |
| MCP | Invalid discovery, unauthorized invoke, unexpected tools, schema/output excess, timeout, prompt injection, arbitrary URLs and admin-tool requests |
| Answers | General conversation without fake portfolio citations; unsupported certification/title/metric; proposal described as live; citation laundering |
| Retention | No free-written reply, job text, retrieved private text, tool arguments or generated summary in the 100-day ledger or metadata logs |
| UI | General and portfolio turns, suggestions, older-request selection during new work, cancelled retry, clear, reload, mobile dialog/focus and safe text/link rendering |

## Release evidence and rollback

Record exact source SHA, all test totals including skips, OS/database/runtime, package/model/index versions, deployed Worker version and AWS stack state. Keep canary/fuzz seeds and before/after failing test evidence. Separate facts into implemented, tested, real-path qualified, deployed and live-verified.

Use the existing private disable flag as the first rollback. Keep budgets and retained data intact. Apply infrastructure changes through reviewed CDK/CloudFormation changesets in `us-east-2`; do not hotswap, create another permanent stack, replace stateful logical IDs or expose a direct model endpoint as a shortcut.

Suggested final report: unmet requirements first; ledger with evidence; verification totals; deployment and rollback; remaining limitations; explicit statement that public access and voice remain off.
