# Current state and recovery map

Version: 1.0 | Captured: 2026-10-31, 10:14 EDT / 14:14 UTC

## Repository and preserved work

- Repository: <https://github.com/JoshBoyer/Joshboyer.ca>
- Local checkout: `C:\Users\boyer\Downloads\Projects\Joshboyer.ca`
- Branch: `codex/chat-conversation-panel`.
- Preserved source checkpoint: `ef53778832429cd2f4d2e39e47945c1328b19db5` — `Add conversational replies and separate request details`.
- Previous checkpoints: `c464ade` request traces; `4d9c5ce` private sessions/spending; `7369e9a` least-privilege token verification; `1a11dbd` private AWS provider pilot; `17bf876` contracts/knowledge.
- At capture, `origin/main...HEAD` was **1 commit only on main / 6 only on this branch**. This is not a merge qualification. Fetch again and inspect before integrating.

The following user work remains outside our commits. Do not stage, reset, revert or overwrite it:

```text
AGENTS.md
dist/architect-workbench.js
dist/portfolio-review.css
public-manifest.json
tests/contact-brand.test.cjs
tests/contact-draft.test.cjs
tests/contact-native.test.cjs
tests/contact-privacy.test.cjs
tests/contact-ui-api.test.cjs
tests/contact-worker.test.cjs
.env.example                                      (untracked)
dist/assets/personal/josh-curiosity-seated-sketching.png  (untracked)
dist/assets/personal/josh-curiosity-seated-younger-v1.png  (untracked)
```

A private recovery copy of the pre-preservation tracked diff and the three untracked files is in `C:\Users\boyer\.codex\setup\chat-spike-handoff-20261031`. It is not a product artifact and must not enter the public web root. New workers should use isolated worktrees from the handoff branch.

## Deployed private environment

| Setting | Observed value |
| --- | --- |
| AWS project | `099256072947` |
| Region / profile | `us-east-2` / `joshboyer-portfolio` |
| Stack | `PortfolioChatDev`, `UPDATE_COMPLETE`, termination protection enabled |
| AWS origin | `https://7fvk4i6eg7.execute-api.us-east-2.amazonaws.com/dev` |
| Functions | `joshboyer-chat-dev-handler`, `joshboyer-chat-dev-authorizer` |
| State table | `joshboyer-chat-dev-state` |
| Evidence bucket | `joshboyer-chat-dev-099256072947-us-east-2` — provisioned, no completed RAG ingestion |
| Cloudflare account / Gateway | `019f6ca21aafa442ceed0e09bdf76f7f` / `joshboyer-chat-dev` |
| Worker / latest observed version | `joshboyer-chat-dev` / `cda469e6-c859-4dce-b175-69b0d7c370f3` |
| Preview | <https://joshboyer-chat-dev.boyer-josh1985.workers.dev/chat-preview> |
| Flags | `CHAT_PRIVATE_ENABLED=true`, `PUBLIC_CHAT_ENABLED=false`, `PROBE_ENABLED=false` |

The Worker requires private access, creates Secure/HttpOnly/SameSite cookies and signs method, path, body hash, timestamp, nonce and session context before AWS. The authorizer and handler verify that envelope; DynamoDB prevents replay. The old unmetered provider probe is disabled. No production portfolio route was activated.

## Implemented application path

```text
Private chat UI
     |
Cloudflare Worker: access + signed envelope
     |
AWS API + Lambda
     |-- session / idempotency / spending
     |-- approved CAG context
     |-- bounded provider call through Gateway
     |-- conversational text + canonical evidence
     `-- trace / settlement / generation checks
```

- Static HTML/CSS/JavaScript remains the frontend; `dist/` is the web root. No React migration.
- `chat/contracts/` contains strict schemas, canonical evidence rendering and stream validation.
- `chat/knowledge/` contains 14 approved public claims and a seven-claim CAG pack, version `sha256:f42b9375285ed967b92742982e8c0c2de1692c3d29dadb71ff5e44089cffd9cf`.
- `services/chat/src/chat.ts` orchestrates sessions, provider calls, cancellation, evidence and stream output.
- `cag.ts` supplies prompts, conversation history and response validation; `chat-provider.ts` implements native provider requests; `chat-pricing.ts` supplies conservative accounting.
- `state.ts` uses real DynamoDB transactions. Sessions expire after 24 hours; one active turn; eight turns/session; 16 turns/day for the private operator identity.
- Aggregate and provider ceilings are US$25/month. Both possible provider calls are reserved before generation. Current maximum reservation is 10,804 microdollars/provider, 21,608 per turn. Unknown usage remains conservatively charged.
- Provider request cap: 49,152 bytes; output cap: 1,536 tokens; two attempts maximum; 50-second application deadline. These are application controls, not provider invoice or credit guarantees.
- Primary: `gpt-6-luna`; fallback: `claude-haiku-5-5`. No direct-provider bypass or wholesale billing fallback. Explicit safety refusals do not trigger another provider attempt.
- Model replies support general, portfolio, clarification and refusal kinds. They are generated prose, not semantically proven facts. Canonical evidence remains independently validated.
- Generated replies stay only in expiring session history. The 100-day ledger strips the reply, retains canonical evidence/trace/accounting and a result digest. Clear removes history; pending work cannot republish it. Future RAG/tool content must not bypass this boundary.
- The UI shows plain conversation and suggested questions. Evidence and Trace tabs live in a separate panel, with a mobile dialog. Earlier-request selection, cancellation, retry and clear have focused tests.

The existing architecture already chooses private S3 plus S3 Vectors for retrieval, evaluated OpenAI embeddings through Gateway, and a separate stateless Streamable HTTP MCP Lambda protected by API Gateway `AWS_IAM`. These are planned components, not implemented capabilities. Verify service availability and transport compatibility before building; return material changes to Argon rather than silently swapping the design. Read the [architecture plan](../../architecture/chat-implementation-plan.md) and [tool contracts](../../../chat/contracts/README.md).

The three allowed tools are `search_public_evidence`, `get_case_study` and `compare_job_requirements`. Use the existing `chat/evaluation/` directory for quality cases. General greetings should not invoke retrieval/tools unnecessarily; qualification must deliberately exercise each real path. The approved public evidence currently omits numerical renewal rates, even though some wider website content includes them. Do not import the reference image's metrics or silently expand the corpus.

## Verification evidence and limits

At the final capture, these were run in the existing Windows workspace:

| Check | Observed result |
| --- | --- |
| `npm test` | 277 tests, 277 pass, 0 fail/cancel/skip |
| `CHAT_TEST_DYNAMODB_ENDPOINT=http://127.0.0.1:8007` + service tests | 84 tests, 84 pass, 0 fail/cancel/skip |
| `npm run check:chat-cloud` | All three TypeScript packages passed |
| `npm run check:chat-client` | Generated public evidence current |
| `npm run check:security` | 123 runtime text files checked; passed |
| `git diff --check` | Passed |

Earlier unchanged edge/infrastructure suites passed 19 / 9 tests. Earlier lint had zero errors and 53 existing warnings. Do not relabel those as newly rerun checks. A clean checkout of the final handoff SHA, repeated-test determinism, full adversarial qualification and CI qualification remain receiving-team gates.

The local container `josh-chat-dynamodb-phase3` was running at `127.0.0.1:8007` at capture. Integration tests deliberately require that explicit local endpoint; without it, they skip. Do not claim skipped tests as qualification.

In the isolated checkout, install the root and three package lockfiles with `npm ci` / `npm --prefix <package> ci`, then run `npm test`, `npm run check`, `npm run check:chat-cloud`, `npm run check:chat-client` and `npm run check:security`. Run each cloud package's `test` script separately. For backend integration, first verify the local database is available, set `$env:CHAT_TEST_DYNAMODB_ENDPOINT = 'http://127.0.0.1:8007'`, then run `npm --prefix services/chat test`. Never substitute an AWS production table for that local test endpoint. Follow the [private runbook](../../operations/chat-phase3-private.md) for controlled deployment and live probes; routine tests do not establish live-provider results.

Live observations:

- Private provider path, unsigned/forged/expired/replayed/body-altered rejection, no wholesale fallback and payload-free Gateway log fields were previously verified. Read `docs/operations/chat-phase3-verification.md` for exact historical request IDs and boundaries.
- Current conversational greeting request `38c03917-9c9a-4134-ae74-abbfe78994db` completed in the actual signed-in browser. It returned a natural greeting, and the five trace stages were in the side panel. No console warnings/errors were observed at capture.
- Four fixed live evaluations used **local updated orchestration with real AWS state/Gateway**, not the deployed browser caller: queue explanation, contextual follow-up, unsupported certification, credential/action refusal. Exactly four model calls; session cleared; responses manually reviewed as sensible examples.
- New full browser flows remain unfinished: general/portfolio multi-turn use, suggestion clicks, selection while streaming, new-layout cancellation/retry/clear, mobile focus/overflow, reload and session continuity.
- Public-site observation remained `/` 200, `/api/twin` 410 and `/api/chat/config` 404. Public access remains prohibited without a new explicit release decision.

Private machine receipts are under `C:\Users\boyer\.codex\setup\aws-chat-phase2-20261031`: `handoff-root-tests.log`, `handoff-service-tests.log`, `private-conversation-eval.json`, deployment logs and earlier sanitized receipts. They are leads, not substitutes for rerunning required gates.

## Access without leaking credentials

Use the existing AWS profile and temporary credentials. AWS CLI is at `C:\Users\boyer\AppData\Local\Programs\Amazon\AWSCLIV2\aws.exe`. Application resources must stay in `us-east-2`; administrative toolkit calls use `us-east-1` only as required by that service.

Existing local secret names: `OPENAI_API_KEY`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_AI_GATEWAY_TOKEN`, `CLOUDFLARE_AI_GATEWAY_RUN_TOKEN`, `JOSH_CHAT_PROBE_TOKEN`. Anthropic's key was sourced from the ignored local `.env`. Use the existing operational helpers; never dump the environment or whole secret files. The Gateway runtime token has Run only; management has Read/Write only. Values are intentionally absent here.

Secrets Manager paths are `/joshboyer/chat/dev/{openai,anthropic,gateway,edge}`. Do not copy these values into Gemini prompts, child-agent briefs, logs, screenshots, URLs or repository files. The public assistant must never receive AWS Agent Toolkit or development-agent access.
