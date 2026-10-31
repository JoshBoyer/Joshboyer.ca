# Private portfolio chat

Version: 1.1 | Date: 2026-10-31 | Status: Private general-purpose conversation

Phase 3 turns the fixed provider probe into a private conversation service. The existing portfolio remains static. Open the separate [private preview](https://joshboyer-chat-dev.boyer-josh1985.workers.dev/chat-preview) and use the operator token stored in the Windows user environment as `JOSH_CHAT_PROBE_TOKEN`. Never put that token into a URL, source file, browser storage or chat message.

See the [verification record](chat-phase3-verification.md) for observed deployed results and remaining release qualification.

```text
Private preview + HttpOnly cookies
                 |
      Cloudflare signed request
                 |
       AWS session + budget ledger
                 |
        Cloudflare AI Gateway
                 |
          OpenAI / Anthropic
```

## What is available

- General-purpose conversation, technical explanations and contextual follow-ups. The model writes the reply; the server validates its structure and bounds. For Josh-specific questions, the **cache-augmented generation (CAG)** fact pack supplies approved evidence.
- Streaming progress, validated answers and source links, bounded conversation history, explicit retry, cancellation and clear.
- A separate request-details panel contains Evidence and Trace tabs. Evidence wording remains canonical; generated chat prose is not a factual guarantee. Trace shows actual context, reservation, provider, validation and settlement events. Opening these details does not start another model call.
- OpenAI `gpt-6-luna` primary and one Anthropic `claude-haiku-5-5` fallback. The browser cannot select a model or provide history, system messages or tool output.
- A private sign-in screen and one-hour access cookie. Chat session cookies are separate, opaque, Secure, HttpOnly and SameSite=Strict. Chat sessions expire after 24 hours; expiry is checked in application code.

Retrieval-augmented generation (RAG), Model Context Protocol (MCP) tooling and voice remain disabled. The current CAG pack contains seven of the fourteen approved public claims. General questions can use model knowledge; unsupported claims about Josh should receive an evidence limitation. The assistant must not claim live research, account access or actions it cannot perform. Explicit provider safety refusals do not trigger a fallback attempt.

## Spending and lifecycle controls

| Control | Enforced setting |
| --- | --- |
| Aggregate model allowance | US$25/month in conservative application accounting |
| Per-provider ceiling | US$25/month, also constrained by the aggregate allowance |
| Private operator turns | 16/day across session resets |
| Session turns | 8, with one active request |
| Message | 8,192 UTF-8 bytes; complete HTTP body at most 12,288 bytes |
| Model calls | At most two: primary and one fallback |
| Provider request/output | At most 48 KiB serialized input and 1,536 output tokens |
| Turn deadline | 50 seconds; outer handler/edge deadlines also bounded |

**Reservation** means holding the largest permitted charge before making a provider call. DynamoDB transactions update the request ledger, session lock, visitor allowance, aggregate budget and provider budgets together. Repeating an identical request returns its saved result; reusing its identifier with different content fails.

Amounts are integer USD microdollars. The versioned allowance table conservatively charges all input at US$0.20/million tokens and output at US$0.50/million, with an input token bound based on serialized bytes plus overhead. Standard service tiers and the short-context limit are explicit. This is a spending guard, not an exact invoice estimator. Prices were checked against [OpenAI's model page](https://developers.openai.com/api/docs/models/gpt-6-luna) and [Anthropic's model page](https://platform.claude.com/docs/en/models/haiku-5-5/overview).

Missing/ambiguous usage after dispatch consumes the full reservation. A crash leaves its reservation counted. Unused fallback reservations are released only during exactly-once settlement. A timed-out active lease may permit another bounded turn after 120 seconds; it does not release the abandoned charge or allow the same request to run again.

Clear first revokes the generation and removes active history. Cancellation and clear suppress later output. Neither resets the visitor allowance nor erases unsettled charges. Generated replies and raw visitor text stay in the 24-hour session history; clear removes them. Expiry is immediate for application access, while DynamoDB time-to-live deletion is asynchronous. The 100-day request ledger contains canonical evidence, accounting metadata and a digest, without generated reply text. Authorised retries recover the original reply from active session history. Operational logs retain metadata for seven days. Provider retention follows the provider's own settings; this is not a zero-retention claim. AWS credits do not cover OpenAI/Anthropic charges, and provider credit attribution needs a billing-console check.

## Private access and deployment

Both the Worker and Lambda explicitly set `CHAT_PRIVATE_ENABLED=true`, `PUBLIC_CHAT_ENABLED=false`, and `PROBE_ENABLED=false`. The old unmetered `/api/chat/_probe` no longer accepts calls in this deployment. The existing operator secret is used only to exchange for a private access cookie.

The Worker serves an explicit seven-file preview allowlist, runs before static assets and checks access before serving the shell. Requests carry an HMAC over the exact method, path, body hash, timestamp, nonce and opaque visitor/session context. AWS verifies it again and atomically consumes the nonce. The browser cannot override that context. Mutations also require the exact Origin and reject cross-site requests.

The public portfolio and local static server explicitly reject `/api/chat/*`; no chat button, API proxy or new public asset allowlist entry is activated there. The preview uses a separate Workers deployment. The public site's contact/media paths and retired AI `410` responses remain intact.

Build and check from the repository root:

```powershell
npm test
npm run check:chat-cloud
npm run test:chat-cloud
npm run build:chat-cloud
```

To include the real local DynamoDB transaction tests, start the official DynamoDB Local image on a loopback-only port and set `CHAT_TEST_DYNAMODB_ENDPOINT=http://127.0.0.1:8007` before the service test command. Without that explicit setting, those tests are skipped and must not be reported as verified.

The existing deployment profile is `joshboyer-portfolio`, selected Region `us-east-2`, stack `PortfolioChatDev`. Review the CDK diff/change set before applying it. Retain the state table, secret resources and evidence bucket. The private preview deploy command is `npm --prefix services/edge run deploy`; its explicit configuration prevents accidental deployment of the production portfolio Worker.

For one bounded deployed smoke check, hydrate `JOSH_CHAT_PROBE_TOKEN` from its Windows user environment value, set `JOSH_CHAT_PREVIEW_URL` to the exact preview origin above, and run:

```powershell
node tools/probe-chat-private.cjs --output <private-receipt-path>
```

The probe checks login, capabilities, strict input, one canonical answer, replay, conflict and clear. It makes one new paid chat turn and does not print tokens, cookies or raw model output. Confirm its request ID against the AWS ledger and metadata logs when verifying invocation counts.

## Rollback and next work

To disable access, deploy the Worker with `CHAT_PRIVATE_ENABLED=false`; this rejects the preview and chat routes while preserving the unrelated portfolio. Keep `PUBLIC_CHAT_ENABLED=false`. Disable Lambda private access as a second layer if needed. Do not redeploy the old unmetered probe as a spending-control rollback.

Next is Phase 4 retrieval and authenticated read-only MCP tools. Public release remains a separate step after adversarial, privacy, model-quality, cost and browser qualification; this private deployment does not authorise it.
