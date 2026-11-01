# JoshBoyer.ca AI Career Assistant — Verified Architecture & Observability Gap Assessment

Date: 2026-11-01
Branch: `argon/chat-phase4-integration`

---

## 1. Verified Current Architecture

Inspection of `infra/aws/lib/portfolio-chat-stack.ts`, `services/chat/src/`, `services/portfolio-mcp/src/`, `services/edge/src/`, and `dist/chat-assistant.js` confirms the following real runtime architecture:

| Layer | Deployed / Implemented Component | Source Files | Notes & Boundaries |
|---|---|---|---|
| **Edge & Access Control** | Cloudflare Worker (`joshboyer-chat-dev`) + Private Preview Token Gate + HMAC Request Signing (`x-chat-signature`) | `services/edge/src/worker.ts`, `services/edge/src/private-chat.ts` | Serves `/chat-preview` and static assets; proxies `/api/chat/*` to AWS `us-east-2`; handles `/api/chat/voice/*` for ElevenLabs TTS, Scribe STT, and Conversational AI WebSocket session setup. |
| **API Ingress (`us-east-2`)** | Amazon API Gateway Regional REST API (`joshboyer-chat-dev-api`) + Custom Request Authorizer Lambda (`joshboyer-chat-dev-authorizer`) | `infra/aws/lib/portfolio-chat-stack.ts` | Enforces zero-TTL custom edge signature verification on `/api/chat/*` and `AWS_IAM` SigV4 authorization on internal `/api/chat/_mcp`. |
| **Orchestration (`us-east-2`)** | AWS Lambda (`joshboyer-chat-dev-handler`, Node.js 24 ARM64) | `services/chat/src/chat.ts`, `services/chat/src/handler.ts`, `services/chat/src/routing/index.ts` | Executes deterministic turn routing (`planTurnRoute`), atomic cost reservation, hybrid RAG, MCP tool calls, model invocation, canonical output validation, and 8-stage SSE trace streaming. |
| **CAG (Cache-Augmented Generation)** | Two-Tier High-Level Career Corpus (`CAG_HIGH_LEVEL_CORPUS` + `chat/knowledge/cag-context.json` + `corpus.json`) | `services/chat/src/cag.ts`, `chat/knowledge/cag-context.json` | Always-loaded pinned baseline (~7,100 tokens, 15 verified claims, 5 chronological career eras, 6 domain pillars, 13 case studies, LinkedIn `josh-boyer-1b770618` & Workshop42 `ws42.ca`). |
| **RAG (Hybrid Retrieval)** | `RetrievalEngine` over Amazon S3 (`joshboyer-chat-dev-<account>-us-east-2`) + Amazon S3 Vectors (`joshboyer-chat-dev-vectors`, index `portfolio-evidence`, 1536-d `text-embedding-3-small`) + Deterministic BM25 | `services/chat/src/retrieval/index.ts`, `services/chat/src/ingestion/s3-store.ts` | Combines 1536-dimensional vector similarity with deterministic lexical BM25 scoring and qualification-boundary boosting (`topK = 4`). Gracefully falls back to deterministic lexical/CAG if vector store is unreachable. |
| **MCP Tools (`us-east-2`)** | AWS Lambda (`joshboyer-chat-dev-mcp`, JSON-RPC 2.0 over IAM SigV4) | `services/portfolio-mcp/src/server.ts`, `services/portfolio-mcp/src/tools/` | Exposes 3 read-only tools: `search_public_evidence`, `get_case_study`, and `compare_job_requirements` (max 2 tools per turn). |
| **State & Budget Ledger (`us-east-2`)** | Amazon DynamoDB (`joshboyer-chat-dev-state`) | `services/chat/src/state.ts`, `services/chat/src/budget-policy.ts` | Single-table design (`SESSION#*`, `REQUEST#*`, `BUDGET#*`, `VISITOR#*`, `NONCE#*`) enforcing per-visitor turn limits (16/day) and a $25/month atomic cost reservation & settlement ledger. |
| **Model Routing & Gateway** | Cloudflare AI Gateway → Primary `gpt-6-luna` (OpenAI) / Fallback `claude-haiku-5-5` (Anthropic) | `services/chat/src/chat-provider.ts`, `services/chat/src/config.ts` | Validates structured JSON selection against `chat/contracts/index.cjs` before emitting `conversation`, `answer_block`, and `sources` frames. |
| **Live Voice** | ElevenLabs Conversational AI WebSocket + TTS (`pcm_44100` / MP3) + Scribe STT + WebAudio VAD Barge-In | `dist/chat-assistant.js`, `tools/sync-elevenlabs-agent.cjs` | Uses Josh Boyer's professional voice clone (`2ccxXaT9cMefjPlK2Pwn`) with hands-free VAD interruption, Space/Escape keyboard barge-in, and live transcript grounding. |

### Conceptual Mockup vs. Real Deployed Infrastructure

The supplied conceptual design mockups show `CloudFront` and `Amazon OpenSearch` in the illustrative AWS diagram. Per the implementation directive (*"Do not assume that services shown in conceptual mockups are deployed. Do not introduce new infrastructure solely to match a mockup"*):
- **Edge Layer:** Represented truthfully as **Cloudflare Edge (Worker & AI Gateway)** (which performs the edge security, routing, and caching role shown conceptually as CloudFront).
- **Vector Search & Retrieval Layer:** Represented truthfully as **Amazon S3 + S3 Vectors (1536-d) & DynamoDB** (which performs the hybrid vector + metadata search role without provisioning a costly always-on OpenSearch cluster). Progressive tooltips explain this architectural choice directly in the UI.

---

## 2. Existing Trace Events & Telemetry Model

The backend emits validated SSE `trace` frames (`services/chat/src/trace.ts`) across 8 canonical stages:
1. `routing` (`routingMode`: `general` | `portfolio_cag` | `portfolio_rag` | `portfolio_mcp`, `needsRetrieval`, `requestedTools`, `elapsedMs`, `durationMs`)
2. `budget` (`reservedMicros`, `priceVersion`, `elapsedMs`, `durationMs`)
3. `retrieval` (`retrievalMode`: `hybrid` | `deterministic_only` | `cag_only` | `degraded` | `skipped`, `matchedCount`, `corpusVersion`, `indexVersion`, `embeddingModel`, `elapsedMs`, `durationMs`)
4. `mcp` (`attempt`, `toolCallId`, `toolName`, `mcpMethod`, `toolOutcome`, `elapsedMs`, `durationMs`)
5. `context` (`corpusVersion`, `claimCount`, `elapsedMs`, `durationMs`)
6. `provider` (`attempt`, `provider`, `model`, `usageStatus`, `inputTokens`, `outputTokens`, `cacheReadInputTokens`, `chargedMicros`, `elapsedMs`, `durationMs`)
7. `validation` (`attempt`, `provider`, `model`, `corpusVersion`, `claimCount`, `elapsedMs`, `durationMs`)
8. `settlement` (`reservedMicros`, `chargedMicros`, `priceVersion`, `elapsedMs`, `durationMs`)

### Mapping the 8 Backend Trace Stages to the 6 User-Facing Journey Steps

Both the recruiter-friendly **6-Step Journey** (`1. Intent` → `2. CAG` → `3. RAG` → `4. Context` → `5. Model` → `6. Response`) and the engineer-level **8-Stage Trace Timeline** are driven by the same shared turn event model:
- **Step 1 — Intent (`Understand your question`):** Driven by `status: accepted` + `trace: routing` (`routingMode`, `needsRetrieval`, `requestedTools`).
- **Step 2 — CAG (`Career knowledge (cached)`):** Driven by `trace: context` + pinned `CAG_HIGH_LEVEL_CORPUS` (`~7,100 tokens`, `claimCount`).
- **Step 3 — RAG (`Find additional information`):** Driven by `trace: retrieval` + `trace: mcp` (`retrievalMode`, `matchedCount`, `requestedTools`, `sources`).
- **Step 4 — Context (`Prepare context for the AI model`):** Driven by `trace: context` + `trace: budget` + token breakdown (`CAG` + `RAG` + `Conversation` + `System`).
- **Step 5 — Model (`Generate the answer`):** Driven by `trace: provider` (`model`, `inputTokens`, `outputTokens`, `durationMs`).
- **Step 6 — Response (`Deliver to you`):** Driven by `trace: validation` + `trace: settlement` + `conversation` / `answer_block` / `sources` / `done` + ElevenLabs voice status.

---

## 3. Current-State vs. Target-State Gap Matrix

| Area | Current State | Target State (Design References) | Planned Implementation |
|---|---|---|---|
| **Desktop Chat vs. Observability Balance** | Large 3-card pipeline below `.chat-messages` is always expanded in `Detailed` mode, leaving limited height for chat messages. | Chat-first layout with generous `.chat-messages` height, a **compact Live Execution Strip** (`Step X of 6 · ...` + 6-node horizontal progress bar + `View details →`), and an **expandable multi-tab bottom/docked drawer** (`Live process`, `Context stack`, `Sources`, `AWS architecture`, `Trace`, `Evidence`). | Add compact `[data-live-process-strip]` always visible below `.chat-messages` in `Detailed`/`Engineer` modes, with `[data-journey-drawer]` expandable on demand (or via `View details →` / step click) without crowding the chat. |
| **Right Inspector Summary ("This answer used...")** | Opens directly into Step 3 inspector without the top-level 4-item breakdown or timestamped vertical trace timeline. | Shows **"This answer used..."** (`CAG 58%`, `RAG 26%`, `Context assembly 11%`, `Model 5%` + `View full execution trace →` + `Key sources`), and switches cleanly to the **Timestamped Vertical Execution Timeline** (`10:24:01 Message received` ... `Streaming response`). | Add `[data-answer-used-summary]` card and timestamped vertical `[data-trace-timeline]` in the Right Inspector. |
| **Deterministic Trace Replay** | Backend supports idempotent replay of saved turns (`replayed: true`), but the UI lacks an interactive trace replay controller to step through a turn's execution. | Engineers can replay any completed turn deterministically (`▶ Replay`, `◀ Prev`, `Next ▶`, `Reset`) and watch the 6-step strip, step inspector, context bar, AWS stack nodes, and timeline advance step-by-step from recorded `TracePoint[]`. | Build deterministic `[data-trace-replay]` controller bound to the shared turn state machine (`replayStepIndex: 1..6`). |
| **Sources & Evidence Inspector** | Lists sources without category filter pills or visual relevance bars. | Filterable **"Sources used in this answer"** view (`All (n)`, `Career knowledge (n)`, `Retrieved sources (n)`) with `Career knowledge (CAG)` / `Retrieved source (RAG)` badges, grounded snippets, and percentage relevance bars (`92%`, `87%`, etc.). | Upgrade `renderSources` / `[data-sources-inspector]` with live filter tabs, CAG vs. RAG badges, relevance score bars, and expandable claim details. |
| **Contextual AWS Architecture** | Static 8-node row without step-specific highlighting or progressive plain-English explanations. | Step-aware AWS diagram highlighting the exact services used in the active/inspected step + **"What these services do"** progressive disclosure panel. | Bind `[data-pipe-stage]` active states to the active/inspected/replayed step (`1..6`) and add the `"What these services do"` explanation list. |
| **Mobile Experience (`<= 768px`)** | Desktop panels stack vertically on narrow viewports. | Dedicated mobile top header (`JB Josh Boyer` + `☰` nav drawer), `"Show more ⌄"` message clamp on long answers, compact mobile `Live process (X of 6)` bar above input, and slide-up **Mobile Bottom Sheet** (`Process | Context | Sources | AWS | Trace`). | Build intentional mobile layout (`@media (max-width: 768px)`), mobile nav drawer toggle, `"Show more"` clamp, and `[data-mobile-sheet]` bottom sheet. |
