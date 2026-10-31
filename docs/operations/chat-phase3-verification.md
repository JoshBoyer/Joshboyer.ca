# Phase 3 verification

Version: 1.1 | Date: 2026-10-31 | Status: Deployed private preview and request traces; public chat disabled

Phase 3 and the frontend shell are implemented. A real conversation passed through the private Cloudflare Worker, authenticated AWS API, Lambda, DynamoDB and Cloudflare AI Gateway. Public release is not part of this result. The [private runbook](chat-phase3-private.md) describes access and limits.

## Deployment

| Item | Verified result |
| --- | --- |
| AWS project / Region | `099256072947` / `us-east-2` |
| Stack | `PortfolioChatDev`, `UPDATE_COMPLETE`, termination protection retained |
| Drift | `IN_SYNC`, zero drifted resources |
| Worker | `joshboyer-chat-dev`, version `c43630cd-3cf2-4b6b-b982-209ae7095407` |
| Preview | <https://joshboyer-chat-dev.boyer-josh1985.workers.dev/chat-preview> |
| Private flags | Private chat enabled; public chat and unmetered probe disabled |
| Data resources | Existing retained DynamoDB table, secret resources and evidence bucket preserved |

The reviewed CloudFormation change set added authenticated chat routes, scoped table reads/updates, and updated the existing Lambda code/configuration. It did not replace the state table or secrets. Static preview assets use an explicit seven-file allowlist, with Worker authentication before asset delivery.

## Deployed conversation and accounting

The deployed HTTP probe used the fixed question about NEXUS and received canonical `claim-experience-nexus`, including its approved qualification and source receipt.

- Request: `a9351e8e-5b06-41ef-a763-fb0b1bfe31bd`.
- OpenAI `gpt-6-luna`: 2,872 input and 76 output tokens, one metadata-recorded provider invocation.
- First response byte: 979 ms; complete validated answer: 5,263 ms, one observed sample.
- Both providers initially reserved 7,143 microdollars each. Final conservative accounting: 613 microdollars for OpenAI, zero for the unused fallback.
- An identical retry returned the same canonical answer in 708 ms without another model call. Reusing the ID with different text returned `409`.
- Clear returned success; the persisted session was revoked, history was empty and no active request remained. Reusing its old cookie returned `401`.

The actual backend HTTP path returned `400` for a message with an extra field, `401` before private login, and the expected capability flags: chat/CAG enabled; RAG/MCP/voice disabled.

Anthropic `claude-haiku-5-5` was separately checked using the same local Phase 3 orchestrator against live AWS state and Gateway, with one model call. Request `fe0a7e4d-e13c-4bfd-9e20-20b4c36cdc48` returned the canonical NEXUS claim, used 5,155 input / 107 output tokens, and settled 1,085 microdollars. The session was cleared. This verifies the native structured-output adapter; the deployed primary remained OpenAI. Automatic fallback was exercised in integration tests, not deliberately induced in the deployed HTTP service.

These amounts are conservative application accounting, not provider invoice or credit-attribution evidence.

## Security and privacy

Direct-origin tests observed:

| Request | Status |
| --- | --- |
| Unsigned, expired or forged | `401` |
| Altered body | `403` |
| Valid signed configuration read | `200` |
| Replayed signed request | `403` |
| Wrong authority context | `401` |
| Old unmetered probe with valid signature | `404` |

Gateway records `01a19204-a7ab-775c-9039-c1d931001be2` and `01a19205-abf5-774c-95fc-66da37ef2656` confirmed successful provider calls, no shared-cache hit, no wholesale billing, and absent request/response/prompt payloads in the inspected log fields. AWS usage records contain model/usage identifiers and accounting metadata, not visitor text.

The public site still returned `200` for `/`, `410` for `/api/twin` and `/twin-drawer.js`, and `404` for `/api/chat/config`. No public chat was enabled.

## Automated and browser evidence

- Root suite: **266 passed**, no failures or skips.
- Chat service: **74 passed**, including **15 real DynamoDB Local state tests** and **5 real DynamoDB Local edge-to-backend integration tests**. Provider responses in those integration tests are fixtures.
- Edge: **19 passed**; infrastructure: **9 passed**.
- TypeScript checks, service/edge builds, syntax, security, public knowledge freshness and browser evidence freshness passed.
- ESLint: zero errors, 53 existing warnings outside the new implementation.
- Browser tests with fixture responses covered desktop and mobile layouts, canonical links, keyboard submission, cancellation, clear and focus return, with no console errors or horizontal overflow.
- The actual deployed login page was inspected in Chrome: clean console, usable form, and no protected shell scripts/styles loaded before authentication.

Spending tests include concurrent reservations, provider and aggregate limits, allowances surviving session resets, same-ID races, exactly-once settlement, unknown charges, month rollover, cancellation/clear/expiry, late writes and ambiguous transaction outcomes. Zero-budget rejection was exercised through the complete local signed HTTP path against real DynamoDB Local; it was not induced by changing the deployed project's active budget.

## Interactive request traces and signed-in browser follow-up

The signed-in preview now shows an expandable trace for each new request. The stream reports context selection, atomic reservation, provider attempts, answer validation and durable settlement. Each stage exposes only allowlisted metadata. Model/Gateway timing is a single measured HTTP round trip; internal provider timing and private reasoning are not inferred.

The live browser request `34085f11-000e-47bb-af0c-9e412b572e0d` returned the approved NEXUS answer and all five completed stages. Its visible provider duration was 2,826 ms, with 2,916 input tokens, 76 output tokens, 2,839 cache-read tokens and 74 cache-write tokens. The ledger independently confirmed one model call and a settled application allowance of 622 microdollars, with the unused fallback reservation released. The UI distinguishes the provider estimate from the committed settlement.

The operator completed sign-in before browser control. Browser checks exercised starter submission, Shift+Enter for a newline, Enter to send, focus return, public source navigation, expandable trace stages, keyboard toggling, and responsive layouts at 1,440×900 and 375×667. Trace details remained readable without horizontal overflow, and no console errors were observed.

A separate request was stopped after its provider stage began. Rechecking the same request remained stopped; AWS retained the uncertain primary charge conservatively and released the unused fallback. Cancelled output did not reappear. These are application-accounting observations, not a claim that cancellation prevented provider billing.

The final UI preserves an already-visible partial trace when a cancelled request is rechecked, labels it “Stopped · last reported activity”, and states that the last reported stage is not still running. The browser also verified clear returning to the starter state, restored composer focus, no remaining answer cards, and a successful immediate restart. New request `f3ca84d6-8c5b-4433-af1b-15db59326c26` completed with all five stages after that restart.

## Remaining qualification

Phase 4 RAG/MCP is not implemented. Broad adversarial/model-quality evaluation, representative latency distributions, provider billing-credit attribution and release approval remain future work. Current latency figures are individual samples, not p95 measurements. The preview stays private.

Sanitized machine receipts and browser screenshots are retained outside the web root in the local Codex setup directory. No credential, cookie or raw private request was added to the repository.
