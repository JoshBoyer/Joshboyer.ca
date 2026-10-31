# Phase 4 Private Chat Rollback Procedures (RAG, S3 Vectors & Portfolio MCP)

Version: 1.0 | Date: 2026-10-31 | Selected Region: `us-east-2` | AWS Profile: `joshboyer-portfolio`

This document defines the four-tier rollback and emergency containment procedures for Phase 4 of the JoshBoyer.ca private portfolio assistant (`PortfolioChatDev` in `us-east-2` and `joshboyer-chat-dev` on Cloudflare Workers).

---

## 1. Rollback Trigger Conditions

Initiate rollback immediately if any of the following conditions occur:

1. **Security or Privacy Invariant Violation:**
   - Any canary string (`CANARY-*`), credential, cookie, or raw visitor/assistant text is detected in CloudWatch logs, traces, receipts, or the 100-day DynamoDB `REQUEST#` ledger.
   - Public routes (`PUBLIC_CHAT_ENABLED`), probe routes (`PROBE_ENABLED`), or voice (`voice: true`) become unexpectedly active, or `/api/chat/_mcp` responds without valid `AWS_IAM` SigV4 authentication.
2. **Spend / Budget Anomaly:**
   - CloudWatch alarm `joshboyer-chat-dev-budget-rejections` or `joshboyer-chat-dev-provider-failures` enters `ALARM`.
   - `BUDGET#TOTAL` (`spentMicros + reservedMicros`) approaches the `25,000,000` micro-USD (`$25.00` USD) monthly ceiling unexpectedly.
3. **Knowledge Index Integrity Failure (`RAG`):**
   - `node tools/ingest-chat-knowledge.cjs --verify` or `node tools/chat-cloud-ops.cjs --verify-cloud` reports `INDEX_INTEGRITY_ERROR`, `INDEX_ARTIFACT_MISSING`, or `verified: false`.
   - Live turns emit `retrievalMode: "degraded"` or notice code `retrieval_degraded`.
4. **Portfolio MCP Server Degradation (`MCP`):**
   - CloudWatch alarm `joshboyer-chat-dev-mcp-errors` or `joshboyer-chat-dev-handler-p95-duration` (`> 12,000` ms) triggers.
   - Live turns emit `mcp` stage `state: "failed"` or notice code `tools_unavailable`.

---

## 2. Tier 1: Instant Edge Kill-Switch (`< 60 Seconds`, Zero AWS Redeploy)

To halt all private chat traffic, RAG embeddings, MCP calls, and LLM provider spend immediately at the Cloudflare Worker edge without waiting for a CloudFormation deployment:

### Procedure

1. Open [services/edge/wrangler.jsonc](file:///C:/Users/boyer/Downloads/Projects/Joshboyer.ca/build/worktrees/A23/services/edge/wrangler.jsonc) and set `CHAT_PRIVATE_ENABLED` to `"false"`:
   ```json
   "vars": {
     "AWS_ORIGIN": "https://7fvk4i6eg7.execute-api.us-east-2.amazonaws.com/dev",
     "GATEWAY_ID": "joshboyer-chat-dev",
     "CHAT_PRIVATE_ENABLED": "false",
     "PROBE_ENABLED": "false",
     "PUBLIC_CHAT_ENABLED": "false"
   }
   ```
2. Deploy the Cloudflare Worker:
   ```powershell
   npm --prefix services/edge run deploy
   ```
3. Verify the kill-switch is active:
   ```powershell
   curl.exe -i https://joshboyer-chat-dev.boyer-josh1985.workers.dev/api/chat/config
   ```
   - Expected result: HTTP `404` with `{"schemaVersion":"1.0.0","error":{"code":"unavailable","retryable":false}}`.
   - Zero requests are forwarded to `https://7fvk4i6eg7.execute-api.us-east-2.amazonaws.com/dev`.

---

## 3. Tier 2: RAG Knowledge Index Atomic Pointer Rollback (`us-east-2` S3 & S3 Vectors)

If a newly ingested knowledge index version is defective or mismatched, roll back the active pointer in `s3://joshboyer-chat-dev-099256072947-us-east-2/indexes/active-pointer.json` to a previously verified immutable index version (`indexes/<version>/manifest.json`, `indexes/<version>/vectors.json`, and `<version>:<chunkId>` records in `joshboyer-chat-dev-vectors`).

### Safety Guarantees

- `rollbackKnowledgeIndex` in [ingestor.ts](file:///C:/Users/boyer/Downloads/Projects/Joshboyer.ca/build/worktrees/A23/services/chat/src/ingestion/ingestor.ts) validates the target version's S3 manifest (`manifestSha256`), S3 vectors artifact (`embeddingsSha256`), and all 14 S3 Vectors records (`1536`-d `float32` vectors and metadata) **before** modifying `indexes/active-pointer.json`.
- If the target version is missing or corrupted in S3 or S3 Vectors, `rollbackKnowledgeIndex` fails closed (`ROLLBACK_TARGET_UNAVAILABLE` or `INDEX_INTEGRITY_ERROR`) and leaves the current `active-pointer.json` untouched.
- Warm `joshboyer-chat-dev-handler` Lambda instances refresh their pointer cache automatically within the `30,000` ms TTL (`DEFAULT_ACTIVE_POINTER_CACHE_TTL_MS`).

### Step-by-Step Procedure

1. **Inspect current cloud and index pointer status:**
   ```powershell
   node tools/chat-cloud-ops.cjs --status
   ```
   Check `ragCorpus.activePointer.activeIndexVersion` and `ragCorpus.activePointer.previousIndexVersion`.

2. **Preview the rollback target (`--dry-run`, `0` cloud mutations):**
   ```powershell
   node tools/chat-cloud-ops.cjs --rollback-index --dry-run
   # Or specify an explicit target version:
   node tools/chat-cloud-ops.cjs --rollback-index --dry-run --to idx-f42b9375285ed967-prev
   ```

3. **Execute the live atomic pointer rollback in `us-east-2`:**
   ```powershell
   # Roll back to previousIndexVersion recorded in active-pointer.json:
   node tools/ingest-chat-knowledge.cjs --rollback

   # Or roll back to an explicit verified indexVersion:
   node tools/ingest-chat-knowledge.cjs --rollback --to idx-f42b9375285ed967-prev
   # Equivalent cloud-ops command:
   node tools/chat-cloud-ops.cjs --rollback-index --to idx-f42b9375285ed967-prev
   ```

4. **Verify index integrity across both S3 Vectors indexes:**
   ```powershell
   node tools/ingest-chat-knowledge.cjs --verify
   $env:VECTOR_INDEX_NAME = "portfolio-evidence"; node tools/ingest-chat-knowledge.cjs --verify; Remove-Item Env:VECTOR_INDEX_NAME
   node tools/chat-cloud-ops.cjs --verify-cloud
   ```

---

## 4. Tier 3: AWS Lambda & CloudFormation Stack Rollback (`us-east-2`)

### Option A: Degrade Phase 4 to CAG-Only Mode (Disable RAG / MCP Only)

`resolvePhase4Mode` in [chat.ts](file:///C:/Users/boyer/Downloads/Projects/Joshboyer.ca/build/worktrees/A23/services/chat/src/chat.ts) enables RAG only when `EVIDENCE_BUCKET_NAME`, `VECTOR_BUCKET_NAME`, and `VECTOR_INDEX_NAME` are present, and enables MCP only when `MCP_ENDPOINT_URL` is present.

To disable MCP or RAG while keeping private CAG conversation live:
1. Update the environment variables on `joshboyer-chat-dev-handler` via CDK (`infra/aws/lib/portfolio-chat-stack.ts`) or AWS CLI to omit `MCP_ENDPOINT_URL` (disables MCP tools; `capabilities.mcp` becomes `false`, `maxToolsPerTurn` becomes `0`) and/or `EVIDENCE_BUCKET_NAME` (disables RAG retrieval; `capabilities.rag` becomes `false`).
2. Verify via `GET /api/chat/config` that `capabilities` reflects the disabled subsystem.

### Option B: Full CloudFormation Stack Rollback (`PortfolioChatDev`)

1. Check out the last known-good commit SHA in an isolated worktree.
2. Rebuild the Lambda bundles:
   ```powershell
   npm --prefix services/chat run build
   ```
3. Preview the CloudFormation diff against `us-east-2`:
   ```powershell
   npm --prefix infra/aws run diff -- PortfolioChatDev --profile joshboyer-portfolio
   ```
4. Deploy the rollback stack to `us-east-2`:
   ```powershell
   npm --prefix infra/aws run deploy -- PortfolioChatDev --require-approval never --profile joshboyer-portfolio --parameters GatewayAccountId=019f6ca21aafa442ceed0e09bdf76f7f
   ```
5. **Retention Guarantee:**
   - `joshboyer-chat-dev-state` (DynamoDB), `joshboyer-chat-dev-099256072947-us-east-2` (S3), and `joshboyer-chat-dev-vectors` (S3 Vectors) are configured with `DeletionPolicy: Retain` / `UpdateReplacePolicy: Retain`. Rolling back `PortfolioChatDev` preserves all 35-day monthly budget windows, 100-day redacted request ledgers, replay nonces, and versioned S3 / S3 Vectors artifacts.

---

## 5. Tier 4: Secret & Keyring Emergency Rotation

If the Cloudflare-to-AWS origin signing key (`/joshboyer/chat/dev/edge`) or operator access token (`PROBE_TOKEN`) is suspected compromised:

1. Generate a new 32-byte base64url key and update `/joshboyer/chat/dev/edge` in AWS Secrets Manager (`us-east-2`) with two keys (`activeKeyId` set to the new key ID, retaining the previous key briefly only if zero-downtime rotation is desired, or replacing with a single key to invalidate in-flight envelopes immediately).
2. Synchronize the Worker secrets and verify metadata without printing secret values:
   ```powershell
   node tools/chat-cloud-ops.cjs secrets
   node tools/chat-cloud-ops.cjs edge-secrets
   ```
3. Verify cloud and guardrail state:
   ```powershell
   node tools/chat-cloud-ops.cjs --verify-cloud
   ```
