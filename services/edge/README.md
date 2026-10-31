# Private chat transport probe

Version: 1.0 | Date: 2026-10-31 | Scope: Phase 2

This separate Worker tests the Cloudflare-to-AWS transport without enabling website chat. It accepts an operator credential and a provider name, signs the exact request bytes, then relays the AWS event stream. It has no model keys, static assets, email binding or production route.

```text
Authenticated operator
         |
         v
joshboyer-chat-dev Worker
         | signed request
         v
AWS API in us-east-2
```

## Configuration

| Binding | Storage | Meaning |
| --- | --- | --- |
| `AWS_ORIGIN` | Plain variable | Exact `https://<10-character-api-id>.execute-api.us-east-2.amazonaws.com/dev` origin |
| `PROBE_TOKEN` | Worker secret | Random operator token, 43–128 base64url characters |
| `EDGE_KEYRING` | Worker secret | Same signing keyring held by the AWS edge secret |

The keyring is JSON with exactly `activeKeyId` and `keys`. Each key ID begins with a letter and is at most 32 letters, digits, underscores or hyphens. One or two keys are accepted; each value is canonical, unpadded base64url encoding of 32–64 random bytes. The active ID must exist. A second key permits coordinated rotation; AWS must accept the active key before the Worker starts using it.

The checked-in origin targets the Phase 2 development API in `us-east-2`. Missing or invalid secrets make the Worker fail closed with HTTP 503. Provider credentials belong only in AWS Secrets Manager.

## Commands

From `services/edge`:

```powershell
npm ci
npm run check
npm test
npm run build
```

The build is a dry run. After reviewing the AWS stack output, set `vars.AWS_ORIGIN` to its exact origin and deploy deliberately with `npm run deploy`. Provision each secret through protected standard input to these explicit commands; do not put values on command lines or in the repository:

```powershell
npx wrangler secret put PROBE_TOKEN --config wrangler.jsonc
npx wrangler secret put EDGE_KEYRING --config wrangler.jsonc
```

**Technical note:** Every Wrangler command must name this configuration. The repository root contains the production Worker configuration, and automatic discovery can select it even from this nested package. The package scripts pin `--config wrangler.jsonc` for that reason. From the repository root, use `--config services/edge/wrangler.jsonc`.

To disable access, delete the `PROBE_TOKEN` secret using the same explicit configuration. To remove this isolated Worker, use `npx wrangler delete --config wrangler.jsonc` only after confirming its name is `joshboyer-chat-dev`.

## Request and signature

Only `POST /api/chat/_probe` is supported, with `Authorization: Bearer <operator-token>`, JSON content type, and a body containing exactly `{"provider":"openai"}` or `{"provider":"anthropic"}`. JSON whitespace is allowed. Duplicate fields, escaped field names, extra fields, queries and bodies over 256 bytes are rejected. This is an intentionally narrow probe format, not the public chat contract.

**Hash-based Message Authentication Code (HMAC)** proves that the trusted Worker signed the request. The signature uses SHA-256 and the decoded active key. The signed string joins these fields with a newline, without a final newline:

```text
chat-edge-v1
<key ID>
<Unix timestamp in whole seconds>
<UUID v4 nonce>
POST
/api/chat/_probe
<lowercase SHA-256 digest of exact body bytes>
phase2-operator
```

Headers are `x-chat-key-id`, `x-chat-timestamp`, `x-chat-nonce`, `x-chat-body-sha256`, `x-chat-context` and `x-chat-signature`. The signature is canonical base64url without padding. The Worker builds a fresh header set; incoming cookies, credentials, forwarded addresses and purported signatures never reach AWS.

The AWS authoriser checks the envelope; the backend also checks the actual body bytes and atomically consumes the nonce. A **nonce** is a one-use identifier that prevents a valid signed request from being replayed. This Worker does not replace those backend checks.

## Stream and limits

**Server-Sent Events (SSE)** carry one-way progress and results. The Worker passes chunks through without waiting for the complete response. It forwards only a successful SSE body with fixed no-store response headers, caps output at 65,536 bytes and enforces a 25-second deadline covering request-body reading, origin headers and the response stream. Caller cancellation aborts the origin request. An interruption after headers closes/errors the stream rather than inventing a successful completion event.

Errors contain fixed codes; no upstream error body or internal headers are forwarded. Request and response body logging is absent, and Worker observability is disabled in this configuration. Cloudflare platform metadata may still exist independently of application logs.

## Verification

Local tests cover both providers, the shared signature vector, spoofed credentials/headers, malformed input, origin restrictions, output limits, cancellation, timeouts, early stream delivery and configuration isolation. `npm run build` reports only the `AWS_ORIGIN` binding. These checks do not establish deployed transport or provider billing; those require the parent Phase 2 live probe.

References: [Workers streaming](https://developers.cloudflare.com/workers/runtime-apis/streams/), [Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/), [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/).
