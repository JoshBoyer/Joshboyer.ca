# Phase 4 Private Chat Operations Runbook (RAG, S3 Vectors & Portfolio MCP)

Version: 1.0 | Date: 2026-10-31 | Selected Region: `us-east-2` | AWS Profile: `joshboyer-portfolio`

This runbook documents the architecture, operational commands, cost/budget policies, CloudWatch alarms, and live `us-east-2` qualification benchmarks for Phase 4 of the JoshBoyer.ca private portfolio assistant.

For emergency containment and rollback procedures, see [chat-phase4-rollback.md](file:///C:/Users/boyer/Downloads/Projects/Joshboyer.ca/build/worktrees/A23/docs/operations/chat-phase4-rollback.md).

---

## 1. Phase 4 Architecture & Deployed Resources (`us-east-2`)

| Component | Identifier / Resource Name | Region | Purpose |
| :--- | :--- | :--- | :--- |
| **CloudFormation Stack** | `PortfolioChatDev` | `us-east-2` | Deploys API Gateway, 3 Lambdas, DynamoDB state table, S3 evidence bucket, S3 Vectors bucket/index, and CloudWatch alarms (`TerminationProtection: true`). |
| **Private Edge Worker** | `joshboyer-chat-dev` (`https://joshboyer-chat-dev.boyer-josh1985.workers.dev`) | Global (Cloudflare) | Enforces operator access token (`__Host-jb_chat_access`), blocks `/api/chat/_*` internal routes (`404`), and signs origin envelopes (`chat-edge-v1`). |
| **API Gateway Origin** | `7fvk4i6eg7` (`https://7fvk4i6eg7.execute-api.us-east-2.amazonaws.com/dev`) | `us-east-2` | Regional REST API (`1 req/s` rate limit, `2` burst limit). Public/private chat routes use custom Lambda authorizer; `POST /api/chat/_mcp` uses `AWS_IAM`. |
| **Chat Handler Lambda** | `joshboyer-chat-dev-handler` (Node.js 24, `512 MB`, `60s` timeout) | `us-east-2` | Streams NDJSON/SSE frames (`status`, `trace`, `conversation`, `answer_block`, `sources`, `done`, `error`), orchestrating routing, budget, RAG, MCP, LLM generation, validation, and settlement. |
| **Origin Authorizer Lambda** | `joshboyer-chat-dev-authorizer` (Node.js 24, `256 MB`, `5s` timeout) | `us-east-2` | Verifies HMAC-SHA256 `chat-edge-v1` signatures and consumes 120s replay nonces in DynamoDB before handler invocation. |
| **Portfolio MCP Lambda** | `joshboyer-chat-dev-mcp` (Node.js 24, `256 MB`, `10s` timeout) | `us-east-2` | Read-only JSON-RPC 2.0 MCP server (`2025-03-26` / `2025-06-18`) exposing `search_public_evidence`, `get_case_study`, and `compare_job_requirements`. |
| **State & Budget Table** | `joshboyer-chat-dev-state` (DynamoDB `PAY_PER_REQUEST`, PITR, Deletion Protection) | `us-east-2` | Stores `SESSION#`, `REQUEST#` (100-day redacted ledger), `BUDGET#YYYY-MM` (35-day monthly spend window), `VISITOR#` (daily turn count), and `NONCE#` (120s replay protection). |
| **RAG Evidence S3 Bucket** | `joshboyer-chat-dev-099256072947-us-east-2` | `us-east-2` | Stores versioned `indexes/<indexVersion>/manifest.json`, `indexes/<indexVersion>/vectors.json`, `indexes/history.json`, and `indexes/active-pointer.json` (`SSE-S3`, versioning enabled, public access blocked). |
| **S3 Vectors Bucket & Indexes** | `joshboyer-chat-dev-vectors` (`portfolio-evidence` & `portfolio-public-chunks`) | `us-east-2` | Stores `1536`-dimension `float32` cosine vectors keyed by `<indexVersion>:<chunkId>` with filterable metadata (`indexVersion`, `chunkId`, `claimId`, `projectId`). |
| **Cloudflare AI Gateway** | `joshboyer-chat-dev` (Account `019f6ca21aafa442ceed0e09bdf76f7f`) | Global | Authenticated BYOK proxy (`cf-aig-no-wholesale: true`, `collect_log_payload: false`, `cache_ttl: 0`, `max_attempts: 1`) for OpenAI (`gpt-6-luna`, `text-embedding-3-small`) and Anthropic (`claude-haiku-5-5`). |

### Mandatory Guardrail Flags

| Setting | Required Value | Verification Surface |
| :--- | :--- | :--- |
| `CHAT_PRIVATE_ENABLED` | `"true"` | `services/edge/wrangler.jsonc`, `joshboyer-chat-dev-handler` env |
| `PUBLIC_CHAT_ENABLED` | `"false"` | `services/edge/wrangler.jsonc`, `joshboyer-chat-dev-handler` env |
| `PROBE_ENABLED` | `"false"` | `services/edge/wrangler.jsonc`, `joshboyer-chat-dev-handler` env |
| `capabilities.voice` | `false` | `GET /api/chat/config` response |

---

## 2. Phase 4 Budget & Cost Policy (`2026-10-31-phase4-rag-mcp-v1`)

All paid operations reserve their worst-case ceiling atomically in `joshboyer-chat-dev-state` **before** any provider or embedding network call is dispatched, and settle down to actual usage only when bounded, validated token counts are returned (`services/chat/src/budget-policy.ts`):

| Parameter | Value (micro-USD) | USD Equivalent | Notes |
| :--- | ---: | ---: | :--- |
| `MONTHLY_BUDGET_CAP_MICROS` | `25,000,000` | `$25.00` | Hard monthly cap across `BUDGET#YYYY-MM` (`ALL`, `openai`, `anthropic`). |
| `MAX_GENERATION_RESERVATION_MICROS` | `10,804` | `$0.010804` | Per-provider ceiling (`48,000` input tokens @ `$0.20/M` + `2,408` output tokens @ `$0.50/M`). |
| `MAX_EMBEDDING_RESERVATION_MICROS` | `256` | `$0.000256` | Per-query / per-batch embedding ceiling (`8,192` tokens @ `$0.03125/M`). |
| `MAX_OPENAI_TURN_RESERVATION_MICROS` | `11,060` | `$0.011060` | OpenAI generation (`10,804`) + OpenAI query embedding (`256`). |
| **Turn Reservation (RAG / Embedding Active)** | **`21,864`** | **`$0.021864`** | OpenAI (`11,060`) + Anthropic fallback (`10,804`). |
| **Turn Reservation (General / CAG-Only / Refusal)** | **`21,608`** | **`$0.021608`** | OpenAI (`10,804`) + Anthropic fallback (`10,804`), `0` embedding reservation. |
| `MAX_INGESTION_RESERVATION_MICROS` | `512` | `$0.000512` | Offline ingestion ceiling (up to 2 batch calls; 14 chunks require 1 batch call = `256` micro-USD reserved). |

---

## 3. Standard Operational Commands

### 3.1 Cloud Control-Plane Status & Verification

```powershell
# Local dry-run status (0 cloud calls):
node tools/chat-cloud-ops.cjs --status --dry-run

# Live us-east-2 stack, pointer, S3 Vectors, and DynamoDB budget status:
node tools/chat-cloud-ops.cjs --status

# Full live us-east-2 control-plane, guardrail flag, and S3 Vectors integrity verification:
node tools/chat-cloud-ops.cjs --verify-cloud
```

### 3.2 RAG Knowledge Corpus Ingestion & Verification

```powershell
# 1. Validate corpus, CAG context, 14 chunks, and budget estimate locally (0 cloud spend):
node tools/ingest-chat-knowledge.cjs --dry-run

# 2. Run idempotent live ingestion to S3 and S3 Vectors in us-east-2:
node tools/ingest-chat-knowledge.cjs --ingest
$env:VECTOR_INDEX_NAME = "portfolio-evidence"; node tools/ingest-chat-knowledge.cjs --ingest; Remove-Item Env:VECTOR_INDEX_NAME

# 3. Verify active pointer, S3 manifest/vectors SHA-256 digests, and all 14 S3 Vectors keys:
node tools/ingest-chat-knowledge.cjs --verify
$env:VECTOR_INDEX_NAME = "portfolio-evidence"; node tools/ingest-chat-knowledge.cjs --verify; Remove-Item Env:VECTOR_INDEX_NAME
```

### 3.3 Phase 4 End-to-End Qualification Probe

```powershell
# 1. Local deterministic emulation (0 cloud spend, CI-safe):
node tools/probe-chat-phase4.cjs --dry-run

# 2. Built-in adversarial & boundary self-test suite:
node tools/probe-chat-phase4.cjs --self-test

# 3. Live us-east-2 qualification (RAG verify/rollback, SigV4 MCP, 3 private chat turns, DynamoDB ledger delta check):
$env:AWS_PROFILE = "joshboyer-portfolio"
$env:JOSH_CHAT_PROBE_TOKEN = [Environment]::GetEnvironmentVariable('JOSH_CHAT_PROBE_TOKEN', 'User')
node tools/probe-chat-phase4.cjs --live
Remove-Item Env:JOSH_CHAT_PROBE_TOKEN
```

---

## 4. CloudWatch Alarms (`us-east-2`)

The `PortfolioChatDev` stack provisions 8 CloudWatch alarms in `us-east-2`:

| Alarm Name | Metric / Source | Threshold | Operational Meaning |
| :--- | :--- | :--- | :--- |
| `joshboyer-chat-dev-handler-errors` | Lambda `Errors` (`joshboyer-chat-dev-handler`) | `>= 1` in `5 min` | Unhandled exception or module init error in chat handler. |
| `joshboyer-chat-dev-authorizer-errors` | Lambda `Errors` (`joshboyer-chat-dev-authorizer`) | `>= 1` in `5 min` | Authorizer failure (check `/joshboyer/chat/dev/edge` secret or DynamoDB nonce table). |
| `joshboyer-chat-dev-mcp-errors` | Lambda `Errors` (`joshboyer-chat-dev-mcp`) | `>= 1` in `5 min` | Unhandled failure in Portfolio MCP Lambda. |
| `joshboyer-chat-dev-handler-p95-duration` | Lambda `Duration` `p95` (`joshboyer-chat-dev-handler`) | `>= 12,000 ms` in `5 min` | Elevated end-to-end turn latency (provider or retrieval slowdown). |
| `joshboyer-chat-dev-api-5xx` | API Gateway `5XXError` (`joshboyer-chat-dev-api`) | `>= 1` in `5 min` | Origin API Gateway 5xx error. |
| `joshboyer-chat-dev-provider-failures` | Log Metric Filter `ProviderFailures` (`PortfolioChat/Operational`) | `>= 2` in `5 min` | Repeated upstream LLM/embedding failures via Cloudflare AI Gateway. |
| `joshboyer-chat-dev-budget-rejections` | Log Metric Filter `BudgetRejections` (`PortfolioChat/Operational`) | `>= 1` in `5 min` | Turn rejected due to budget exhaustion (`BUDGET_EXHAUSTED`). |
| `joshboyer-chat-dev-replay-rejections` | Log Metric Filter `ReplayRejections` (`PortfolioChat/Operational`) | `>= 3` in `5 min` | Repeated replay nonce or envelope signature rejections (`REPLAY_REJECTED`). |

---

## 5. Observed Live `us-east-2` Latency & Cost Benchmarks (2026-10-31)

Measured via `node tools/probe-chat-phase4.cjs --live` against `PortfolioChatDev` (`us-east-2`) and `https://joshboyer-chat-dev.boyer-josh1985.workers.dev`:

### 5.1 RAG Ingestion & Atomic Rollback Qualification (`us-east-2`)

- **Canonical Index Version:** `idx-f42b9375285ed967` (`14` chunks, `16,526` UTF-8 bytes, `1536` dimensions, `text-embedding-3-small`)
- **Manifest SHA-256:** `06fd66cd8ebf982ed5b260a5241180d05b66000a1da9f19bfc360d99b560dba7`
- **Embeddings SHA-256:** `51822d7bcd1bba1d4cce733771b20334f670b505eab262b1723fe4bf2549d07e`
- **Initial Ingestion Cost:** `256` micro-USD reserved, `92` micro-USD charged (`1` batch embedding call); subsequent idempotent `--ingest` runs charged `0` micro-USD (`reusedExisting: true`).
- **Atomic Pointer Rollback:** Verified live rollback from `idx-f42b9375285ed967` to `idx-f42b9375285ed967-prev` and re-activation back to `idx-f42b9375285ed967` (`postRollbackVerified: true`).

### 5.2 Deployed Portfolio MCP Server (`POST /dev/api/chat/_mcp`, `AWS_IAM` SigV4)

| Operation / Check | Outcome | Observed Latency (`ms`) | Details |
| :--- | :--- | ---: | :--- |
| Edge `/api/chat/_mcp` block check | Blocked (`404`) | — | Public/private edge rejects `/api/chat/_*` routes. |
| Unsigned origin `POST /dev/api/chat/_mcp` | Rejected (`403`) | — | API Gateway `AWS_IAM` rejects unsigned requests before Lambda invoke. |
| SigV4 `initialize` | `completed` | `270 ms` | `protocolVersion: "2025-03-26"`, `serverName: "joshboyer-portfolio-mcp"` |
| SigV4 `tools/list` | `completed` | `64 ms` | Discovered `["search_public_evidence", "get_case_study", "compare_job_requirements"]` |
| SigV4 `tools/call` (`search_public_evidence`) | `completed` | `61 ms` | `matchCount: 3` |
| SigV4 `tools/call` (`get_case_study`) | `completed` | `59 ms` | `projectId: "nexus"`, `claimId: "claim-experience-nexus"` |
| SigV4 `tools/call` (`compare_job_requirements`) | `completed` | `61 ms` | `matchCount: 5` |

### 5.3 Live End-to-End Private Chat Turns (`us-east-2`)

| Turn | Request ID | Routing Mode | TTFB (`firstByteMs`) | Total (`totalMs`) | Stage Durations (`ms`) | Reserved (micro-USD) | Charged (micro-USD) | Breakdown (`embedding` / `generation`) |
| :--- | :--- | :--- | ---: | ---: | :--- | ---: | ---: | :--- |
| **1. General Turn** | `0aae6744-4747-41e5-a412-ffb46e868627` | `general` (retrieval `skipped`) | `491 ms` | `4,249 ms` | `routing: 1`, `budget: 72`, `context: 0`, `provider: 2795`, `validation: 2`, `settlement: 119` | `21,608` | `716` | `0` / `716` (`3,205` in, `150` out) |
| **2. Portfolio RAG + MCP Turn** | `364d7816-7109-4c9d-adde-8e09210c0db4` | `portfolio_mcp` (`hybrid` RAG + `get_case_study`) | `373 ms` | `5,679 ms` | `routing: 1`, `budget: 99`, `retrieval: 959`, `mcp: 355`, `context: 1`, `provider: 2938`, `validation: 40`, `settlement: 119` | `21,864` | `1,001` | `1` / `1,000` (`4,541` in, `183` out) |
| **3. Safety Refusal Turn** | `9e94ea16-7d10-4682-ab02-88606240d02f` | `general` (pre-provider refusal) | `387 ms` | `1,047 ms` | `routing: 0`, `budget: 77`, `context: 0`, `settlement: 196` | `21,608` | `0` | `0` / `0` (provider not called) |

- **Latency Percentiles Across Live Qualification Turns:**
  - **TTFB (`firstByteMs`):** `min: 373 ms`, `p50: 387 ms`, `p95: 491 ms`, `max: 491 ms`
  - **Total (`totalMs`):** `min: 1,047 ms`, `p50: 4,249 ms`, `p95: 5,679 ms`, `max: 5,679 ms`
- **DynamoDB Budget Ledger Reconciliation (`BUDGET#2026-10` in `joshboyer-chat-dev-state`):**
  - `beforeTotalUsedMicros`: `26,052`
  - `afterTotalUsedMicros`: `27,769` (`openaiUsedMicros: 25,598`, `anthropicUsedMicros: 2,171`)
  - `ledgerDeltaMicros`: `1,717` micro-USD (`$0.001717` USD), matching `probeChargedMicros` (`716 + 1,001 + 0 = 1,717`) to the exact micro-USD (`ledgerDeltaMatchesStreamedSettlement: true`).
