# Portfolio AI chat implementation plan

Version: 1.4 | Date: 2026-10-31 | Status: Private conversational assistant and evidence panel; public chat disabled

## Decision in one screen

Build a small, inspectable chat assistant for JoshBoyer.ca. Keep the existing static website and Cloudflare delivery. Run the application backend on AWS in **us-east-2**, route model requests through **Cloudflare AI Gateway**, and use Josh's own OpenAI and Anthropic API keys and eligible provider credits.

Local Agent Toolkit setup is complete and independently verified; see the [setup record](../operations/aws-agent-toolkit-setup.md). Phase 1 provides strict contracts, deterministic public-only knowledge artifacts and canonical rendering; see the [chat foundation](../../chat/README.md). Phase 2 verified both provider-key routes; see its [verification record](../operations/chat-phase2-verification.md). Phase 3 adds durable sessions, spending reservations and CAG, with the frontend shell brought forward for private qualification. See the [private runbook](../operations/chat-phase3-private.md). Public chat, retrieval and tool execution remain ahead.

Josh expanded the private assistant to general-purpose conversation with guardrails on October 31. It can discuss broader topics and use conversational history, while grounding Josh-specific claims in approved portfolio evidence. Evidence and traces belong in a separate request-details panel. Finding wider public evidence, comparing job requirements through tools, and voice remain later phases. Delivered work, analysis/design, proposals and independent projects must stay distinct.

- **Cache-Augmented Generation (CAG):** a short, versioned pack of approved facts and boundaries always accompanies the question. Provider prompt caching may reuse this prefix; a cache hit is an optimisation, not a correctness dependency.
- **Retrieval-Augmented Generation (RAG):** search the approved public evidence for the particular question, then attach the relevant passages and source identifiers.
- **Model Context Protocol (MCP):** a standard interface through which the backend calls a small set of authenticated, read-only portfolio tools.

```text
Visitor in the existing website
              |
              v
Cloudflare Worker: /api/chat/*
              |
              v
AWS REST API + chat Lambda (us-east-2)
    |         |          |
    v         v          v
 Sessions   Evidence   Portfolio MCP
 / budgets  / search   read-only tools
              |
 Chat Lambda -> Cloudflare AI Gateway
              |
              v
       OpenAI / Anthropic APIs
       Josh's keys and credits
```

The **AWS Agent Toolkit** installed for development is a separate administrative connection. The public assistant must never receive that connection, its credentials, or its AWS administration tools.

## Scope and existing repository

The current site is static HTML, CSS and JavaScript in `dist/`. `worker.mjs` serves production assets; `serve.cjs` serves local development. Private `knowledge/` material and `JOSH-BOYER-PORTFOLIO-CORPUS.md` stay outside the web root and outside the ingestion pipeline.

| Existing area | Reuse or treatment |
| --- | --- |
| `worker.mjs`, `serve.cjs`, `functions/api/twin/[[route]].js` | Preserve deliberate HTTP 410 responses for `/api/twin/*`, `/api/explore`, `/api/config` and retired assets. Introduce `/api/chat/*`. |
| `dist/career-evidence.v3.json` | Starting public evidence source; reconcile against current approved public claims before export. Dataset version alone is not proof of freshness. |
| `dist/resume-engine.js`, `dist/career-guide-engine.js` | Wrap useful deterministic matching and qualification logic behind tested backend adapters. |
| `lib/llm-providers.cjs` | Reference for provider calls, deadlines and structured output. Implement fresh Gateway adapters rather than exposing retired runtime code. |
| `dist/twin-drawer.js`, `dist/twin-voice.js` | UX reference only. New chat component has no voice dependencies. |
| `public-manifest.json`, `tools/build-manifest.cjs` | Explicitly allowlist new chat assets. Never publish a directory wholesale. |
| Existing Content Security Policy | Keep browser network requests on the website's own origin through the Worker proxy. |

Known legacy issues to avoid: a fallback signing secret, process-local session/budget counters, discarded provider usage, an obsolete VBA qualification, and validation that accepts invented claims when paired with an existing but irrelevant citation ID.

No React migration, voice activation, calendar writes, general web browsing, uploads, email sending or public access to arbitrary MCP servers in this phase. `PRODUCT.md` currently describes a client without external runtime calls; implementation must update that capability description explicitly while preserving the static frontend and approved career copy.

## AWS project and deployment constraints

- AWS experience: **new AWS experience**. Selected Region: **us-east-2**. CLI profile: **joshboyer-portfolio**. Requested guidance: **medium**.
- Setup verification on 2026-10-31: named-profile authentication succeeded; AWS reports an **ACTIVE FREE** plan with **US$100** remaining AWS credits and a plan expiration of **2027-04-30**. This is a point-in-time observation, not a future spending guarantee. OpenAI and Anthropic balances were not inspected.
- All Regional application resources remain in us-east-2. Toolkit configuration/catalogue calls use us-east-1 because the toolkit service requires it; this does not move the application.
- Before provisioning, verify the actual project identity, assigned Region, Free/Paid plan, supported services, permissions and spend-limit state. Service eligibility does not mean usage is free.
- Do not enable advanced features or upgrade the project as an incidental setup step.
- Current managed project policies deny `iam:*Provider*`. Therefore the usual GitHub OpenID Connect (OIDC) provider creation cannot be assumed to work. OIDC is a way for a deployment job to obtain temporary credentials without storing an AWS access key.
- Start with reproducible deployment from the authenticated local CLI. Add cloud deployment automation only after an allowed temporary-credential mechanism is verified. Do not work around project controls with stored long-lived AWS keys.
- Proposed Infrastructure as Code (IaC), meaning reproducible resource definitions: an isolated TypeScript AWS Cloud Development Kit (CDK) package under `infra/aws/`. Qualify bootstrap permissions first. If bootstrap is restricted, use reviewed CloudFormation with an explicitly managed deployment-artifact bucket; preserve the same resource design.

## Proposed components

| Component | Responsibility and boundary |
| --- | --- |
| Existing Cloudflare Worker | Same-origin proxy, early body/method checks, visitor challenge/rate controls, signed forwarding to AWS; no model decisions. Preserve contact/media handling. |
| Regional API Gateway **REST API** | Authenticated application ingress and streamed responses. Use REST because response streaming is supported there; do not assume HTTP API has the same capability. |
| Chat Lambda, TypeScript | Session ownership, retrieval, bounded tool loop, provider routing, validation, spending reservations, cancellation and response events. Use a supported Node.js runtime pinned at implementation. |
| DynamoDB on-demand | Expiring sessions, request/idempotency records, per-session and global budget reservations, cancellation state and short-lived anti-replay records. |
| Private S3 + S3 Vectors | Versioned approved chunks/manifests and their search vectors. No standing search cluster is needed for this corpus. |
| Portfolio MCP Lambda | Separate authenticated tool endpoint with a read-only execution role. Receives only the data needed for the named tool. |
| Secrets Manager | Dedicated provider keys, Gateway authentication and edge-signing secrets. Retrieve with least privilege and cache with rotation awareness. |
| CloudWatch | Redacted structured logs, metrics and a small alarm set. No raw messages or job descriptions by default. |
| Cloudflare AI Gateway | Provider traffic, usage visibility and explicit provider-key billing. Not the session store, authorisation system or source of factual truth. |

Keep Lambda outside a customer VPC unless an actual private-network requirement appears. Default outbound connectivity permits calls to AI Gateway without a paid NAT gateway. Avoid provisioned concurrency, reserved model throughput and always-running databases initially.

### Edge and session security

Use a signed, short-lived edge envelope: timestamp, nonce, method, canonical request target, digest of the exact forwarded body bytes and opaque visitor/session context, protected with a dedicated rotating secret. Reject missing, expired, replayed or altered envelopes before retrieval or model calls. API Gateway request authorisation can validate envelope headers; set `authorizerResultTtlInSeconds: 0` so authorisation is evaluated for every envelope. The backend must independently verify the body digest and atomically consume the nonce. Specify canonicalisation for encoded paths, repeated headers and base64-encoded request bodies; test the complete proxy path. Do not treat CORS, an origin header or an API key as visitor authentication.

Use opaque, Secure, HttpOnly, SameSite cookies. Keep history server-side; the browser cannot submit system messages, choose arbitrary models, supply tool results, or select another visitor's session. Validate Origin and cross-site request protection for mutating operations. Expiry is checked in code: DynamoDB time-to-live deletion is asynchronous.

The origin endpoint remains internet-addressable unless additional ingress restrictions are introduced. Invalid requests must not reach paid inference; monitor authoriser and ingress abuse costs separately. Keep request sizes, concurrency and deadlines bounded at both edge and backend.

### Gateway and provider billing

Use provider-native Gateway endpoints with dedicated keys from the provider organisations that receive Josh's credits. Store the keys in AWS; supply the correct provider headers to Gateway. Require Gateway authentication and enable **Require provider credentials** (`byok_only: true`). Test that absent credentials fail instead of falling through to Cloudflare Unified Billing.

Select one evaluated primary model and one explicitly configured fallback. No automatic model alias upgrades, cheapest-model guesses or uncontrolled retry chains. Permit at most one fallback before a validated answer begins, and reserve its possible cost first. Do not bypass Gateway when it is unavailable.

Disable shared answer caching for personalised chat. Prefer metadata-only Gateway logging (`cf-aig-collect-log-payload: false`) and inspect all configured logging/export paths; that header does not govern every downstream export. Provider prompt-prefix caching is separate from Gateway whole-response caching.

Provider credits are separate balances, not transferable AWS funds. They can expire and may be shared with Josh's other projects. Grant availability must be checked in the provider's billing interface; a successful API response alone does not prove which credit paid for it.

The us-east-2 selection governs AWS resources; it does not guarantee that Cloudflare or the external model providers process data in that Region. Document the actual provider retention/location settings and send only the approved public corpus plus the visitor's disclosed input.

## Knowledge and answer pipeline

1. **Export approved public knowledge.** Build from an explicit allowlist of public evidence and selected public case-study content. Exclude private archives, raw questionnaires, internal schemas and local source documents. Preserve formal-title limits and delivery-status distinctions.
2. **Create one versioned manifest.** Each chunk contains a stable ID, approved claim IDs, public URL/anchor, source status, content digest, corpus version and active flag. CAG and RAG use this same manifest.
3. **Build the CAG pack.** Include identity, scope, core facts, disallowed inferences and a small source map. Keep stable instructions/tools/approved facts first, dynamic retrieval and conversation last. Do not assume a cache hit on low traffic.
4. **Create embeddings.** An embedding is a numeric representation used to find similar text. Use an evaluated OpenAI embedding model through Gateway, with model version/dimensions/distance metric pinned. Query and corpus vectors must use the same model/configuration. Anthropic generation fallback does not remove this retrieval dependency.
5. **Publish an index version.** Write chunks and vectors to a new version, test retrieval and source resolution, then atomically switch the active manifest pointer. Retain the previous version for rollback. Never mix CAG version A with vectors from version B.
6. **Retrieve a bounded result set.** Combine semantic search with existing deterministic keyword/qualification matching. Cap chunks and context size. Filter inactive or superseded evidence. Exact ranking/fusion weights are chosen through an evaluation set, not assumed from legacy weights.
7. **Run the bounded orchestration loop.** Assemble trusted instructions, untrusted visitor text and labelled source passages separately. Execute only authorised tools, with argument/result schemas and budgets.
8. **Validate before display.** The model returns bounded conversational prose separately from approved claim IDs. Validate the response shape, byte limits and identifiers, then render prose as inert text. Render the evidence panel from canonical fields only. This replaces the earlier canonical-only chat restriction at Josh's explicit request: reference validation does not prove generated prose true or relevant. General replies identify the absence of live retrieval; unsupported portfolio claims should be acknowledged. Test semantic behaviour separately from transport/schema safety.
9. **Return a trace receipt.** Show public sources, corpus version, which tools ran and a brief explanation of why sources were selected. Show observable actions, not private chain-of-thought, raw prompts, secret configuration or provider credentials.

Open-ended interpretation must be labelled as interpretation and grounded in the displayed sources. A second model's approval is not sufficient to guarantee factual correctness. Maintain regression cases for fabricated certifications, changed job titles, exaggerated metrics and proposed work described as live.

If embeddings or vector search fail, report degraded retrieval and use the approved deterministic search/CAG path where sufficient. If all model providers fail, offer relevant approved source links and a clear retry state. Never silently answer from model memory about Josh's career.

## Real MCP tools

Implement a stateless **Streamable HTTP** MCP server: each request uses fresh transport state, while any required application state lives in DynamoDB. The chat backend is the MCP client; the model proposes tool calls but cannot grant itself authority.

| Tool | Inputs | Output and limits |
| --- | --- | --- |
| `search_public_evidence` | Bounded query; allowlisted filters | Deterministic keyword/facet search returning approved chunk IDs, short passages, scores and public URLs; capped result count. Semantic embedding search stays in chat Lambda. |
| `get_case_study` | Allowlisted case-study ID | Canonical public case facts and source links; no arbitrary path or URL fetching. |
| `compare_job_requirements` | Length-limited pasted job text | Matched requirements, evidence IDs, gaps and qualification boundaries; no invented experience or job-application submission. |

Defer résumé document generation unless added as a separate, explicitly scoped increment. Existing deterministic résumé logic remains usable without granting a tool write access.

Protect the internal MCP endpoint with API Gateway `AWS_IAM` authorisation, using the chat role's temporary credentials and a signing-capable HTTP client. Scope `execute-api:Invoke` permission to the exact API, stage, method and path; keep that path outside the public Worker proxy allowlist. IAM cannot distinguish tool names inside an MCP request: enforce the three-tool allowlist and argument policies in MCP application code. Qualify SDK transport compatibility before proceeding; no anonymous fallback. Validate Origin when supplied, plus protocol version, schemas, output size and tool deadlines. Pin the tool catalogue; reject unexpected tools returned by discovery.

No dynamic MCP URLs, arbitrary browser fetch, shell, file write, email/calendar actions, cloud administration, credential access, sampling or delegated agents. Tool annotations such as read-only are descriptive; execution roles and code enforce the restriction. The tool service cannot invoke models or spend provider credits independently.

Acceptance must prove MCP `initialize`, `tools/list` and `tools/call` over the actual transport. Renaming local functions as tools does not establish an MCP demonstration.

## Chat experience and contract

Keep vanilla JavaScript. Add a small lazy-loaded chat drawer with starter questions, source links, visible tool activity, cancel, clear and retry. Provide keyboard operation, focus return, mobile layout and accessible status announcements. The existing site must remain usable when chat is disabled or unavailable.

Proposed public endpoints:

- `GET /api/chat/config`: public capabilities and availability only.
- `POST /api/chat/session`: issue or resume the caller's opaque session.
- `POST /api/chat/messages`: length-limited text, allowlisted page context and client-generated request ID; no client-supplied history or instructions.
- `POST /api/chat/requests/{id}/cancel`: authorise ownership and signal cancellation.
- `DELETE /api/chat/session`: clear the session and invalidate access.

Stream **Server-Sent Events (SSE)**, a one-way stream of typed server updates consumed through `fetch`: `status`, `tool_start`, `tool_end`, `answer_block`, `sources`, `done`, `error`. Give events sequence numbers and a request ID. Bind each idempotency record to the session identity and canonical payload digest: the same ID with different content is rejected. Do not automatically replay a disconnected POST. Retrying an identical request must not start a second paid run.

Send progress early; send factual answer blocks only after validation. This intentionally favours grounded output over immediate unvalidated token display. No microphone permission, speech code or audio storage in v1.

Set an application deadline well below AWS's maximum stream duration. A closed browser does not guarantee Lambda has stopped: propagate aborts where supported and use an authenticated cancellation flag plus deadlines. If a provider charge is uncertain after cancellation, retain the reservation until reconciliation rather than refunding automatically.

## Spending, privacy and failure rules

- Initial proposed public-demo allowance: **US$25 equivalent of model usage per month**, configurable independently for each provider and in aggregate. This is a proposed product limit, not a provisioned billing setting or the full credit balance.
- Starting limits to evaluate: 8 turns/session, 8 KB message text, at most 4 tools and 3 total model invocations per turn, 60-second turn deadline, 1 active turn/session. A fallback consumes the same invocation allowance.
- Atomically reserve maximum permitted token/tool cost before work; reconcile actual usage exactly once. Include embedding calls, retries, tool-result context, reasoning tokens and any provider-hosted tool charges. Use a versioned price table and conservative treatment of unknown usage.
- Use conditional writes and a request ledger so concurrent Lambda instances cannot overspend the allowance. Do not rely on in-memory counters. Bound ingestion and evaluation spending separately.
- Separate session/global request limits from spend limits. Prevent session resets from resetting visitor allowances; trusted edge context must not be spoofable by browser headers.
- Store minimal session data with a proposed 24-hour expiry; enforce expiry immediately in application code. Clear first revokes the session generation and signals cancellation, then deletes active history. Late writes and UI events for the revoked generation are rejected. Retain the separate request/budget ledger until settlement, even if the conversation is cleared or expires. Document any remaining operational-log retention. Never log job-description bodies by default.
- Log request IDs, corpus/model versions, tool names, timings, token totals, estimated cost and outcome codes. Proposed operational retention: 7 days. Redact inputs, headers, credentials and source text.
- Cloudflare and provider billing features supplement application controls. AWS project spend limits only govern AWS charges; they cannot cap calls charged directly by OpenAI or Anthropic.
- Initial AWS infrastructure allowance remains **US$2–10/month** at the previously modelled low traffic, subject to actual Region, logging, request and security configuration. Confirm with the deployed pilot; this is not a guaranteed cap. Existing Cloudflare charges remain separate.

## Implementation sequence and exit criteria

| Phase | Work and likely files | Exit evidence |
| --- | --- | --- |
| 0. Local AWS setup | Agent Toolkit, named profile, preserved MCP configuration, project rules; no application deployment | CLI identity works; toolkit catalogue loads; correct profile configured; fresh-session MCP handshake documented. |
| 1. Contracts and knowledge | `chat/contracts/`, `chat/knowledge/`, `tools/build-chat-knowledge.cjs`, fixtures | Deterministic public-only export, canonical claims, source integrity and version checks. Golden questions include unsupported/hostile cases. |
| 2. Infrastructure and provider path | `infra/aws/`, `services/chat/`, Gateway settings | Reviewable IaC diff; temporary credential deployment; authenticated edge path; both provider-key routes work through Gateway; no billing fallback. |
| 3. Sessions, budgets and CAG | `services/chat/src/{session,budget,providers,validation,telemetry}` | Concurrency/idempotency/expiry tests pass; conversational replies remain distinct from canonical evidence; missing secrets fail closed. |
| 4. RAG and MCP | `services/portfolio-mcp/`, retrieval/ingestion modules | Real protocol tool calls, hybrid retrieval evaluation, index rollback and degraded-search tests; no administrative capability exposure. |
| 5. Website chat | `dist/chat-assistant.js`, `dist/chat-assistant.css`, minimal mount, public manifest, edge/local adapters | Same-origin stream works; source receipts, cancel/clear/retry and accessible interaction pass; legacy 410/contact/media paths preserved. |
| 6. Private qualification | Browser, deployed integration, adversarial and cost evaluation | Observed billing attribution, privacy checks, end-to-end tool/retrieval trace and measured latency/quality/cost. Public flag remains off until this passes. |
| 7. Public release | Feature flag, documented rollback/runbook | Enable deliberately, observe traffic and errors, verify actual production callers. Revert by disabling chat without affecting the portfolio. |

Original planning estimate: **5–8 focused development days**, including deployed qualification, after access and provider credentials are ready. Josh authorised Phase 3 and the frontend shell together on October 31, with private access until chat, security and spending are verified. The shell is implemented ahead of Phase 4 to support that qualification; it does not claim retrieval or MCP capabilities. Public release still requires its own deliberate step.

## Verification and release evidence

Keep existing `npm test`, `npm run check`, `npm run lint`, `npm run check:security` and `npm run build`. Record existing warnings/failures and distinguish them from regressions. New TypeScript packages need their own typecheck and meaningful unit/integration tests; the current syntax check does not cover them. Extend the security scan to the new runtime directories.

Required new tests:

- Public-manifest boundary, private corpus exclusion and unchanged legacy tombstones.
- Missing/rotated secrets; forged, expired, replayed and body-altered edge envelopes; cross-session access; immediate expiry and clear.
- Simultaneous spend reservations; identical retries versus same-ID/different-payload requests; disconnects, unknown usage and exactly-once reconciliation; clear/expiry during an active turn cannot restore history or display a late answer.
- Gateway authentication, required provider credentials, no Unified Billing fallback and no direct-provider bypass.
- MCP allowlists, protocol exchange, workload authentication, schema/output limits, timeouts, hostile tool text and refusal of arbitrary URLs or admin tools.
- Corpus/index version mismatch, superseded claims, bad source anchors, retrieval failure and stale cache behaviour.
- Invented certifications, titles and metrics accompanied by valid but irrelevant citation IDs; conflicting or missing evidence; prompt injection in job text and retrieved content.
- End-to-end SSE through Cloudflare and AWS; answer validation before display; cancellation state; safe text/link rendering; keyboard and mobile interaction.
- Live provider usage and billing-credit attribution, redacted logs at every layer, and an explicit distinction between mocked checks and deployed evidence.

Proposed pilot targets: all critical factual/security regression cases pass; at least 90% expected-source retrieval on the curated answerable set; first progress event under 2 seconds and validated answer under 15 seconds at p95 on a recorded test workload. These are acceptance targets to measure, not current capabilities.

## Voice later

Keep the orchestration function text-in/typed-events-out so voice can become another client. A later phase can add transcription, speech generation, interruption handling and audio-specific consent/retention, while reusing the same sessions, tools, evidence, budgets and validation. Voice has its own latency and cost qualification; no voice services are provisioned now.

## Source references

Checked 2026-10-31; recheck relevant service behaviour at implementation.

- [AWS Agent Toolkit setup](https://raw.githubusercontent.com/aws/agent-toolkit-for-aws/refs/heads/main/setup-instructions/setup.md) and [new experience rules](https://raw.githubusercontent.com/aws/agent-toolkit-for-aws/refs/heads/main/rules/aws-starter-rules.md).
- [Supported services](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html) and [managed project policies](https://docs.aws.amazon.com/accounts/latest/reference/scps-and-rcps-for-projects.html).
- [API Gateway response streaming](https://docs.aws.amazon.com/apigateway/latest/developerguide/response-transfer-mode.html) and [Lambda integration](https://docs.aws.amazon.com/apigateway/latest/developerguide/response-transfer-mode-lambda.html).
- [S3 Vectors Regions and quotas](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-vectors-regions-quotas.html), [index configuration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-vectors-indexes.html), [pricing](https://aws.amazon.com/s3/pricing/).
- [DynamoDB transactions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transactions.html) and [expired-item behaviour](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ttl-expired-items.html).
- [Gateway provider endpoints](https://developers.cloudflare.com/ai-gateway/usage/providers/), [credential precedence and billing controls](https://developers.cloudflare.com/ai-gateway/features/unified-billing/), [logging](https://developers.cloudflare.com/ai-gateway/observability/logging/).
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk), including stateless Streamable HTTP transports and authorisation middleware. Pin a stable release at implementation.
- [OpenAI API credits](https://developers.openai.com/api/docs/guides/chatgpt-api-credits) and [Anthropic API credits](https://support.claude.com/en/articles/17154008-monthly-api-credits-for-max-ultra-and-team-plans).
