# Chat service — Phase 2

Version: 0.1 | Date: 2026-10-31 | Scope: authenticated operator probe

This package proves the backend path from a signed Cloudflare edge request through AWS to Cloudflare AI Gateway and one selected provider. It accepts only `POST /api/chat/_probe` with `{"provider":"openai"}` or `{"provider":"anthropic"}`. The prompt is fixed: `Reply with exactly OK.` Public chat, sessions, retrieval, tool execution and spending reservations belong to later phases.

```text
Signed edge envelope
         |
REQUEST authoriser (no cache)
         |
Verify bytes + claim nonce in DynamoDB
         |
Progress event -> Gateway -> provider
         |
Validated OK + usage receipt
```

## Build and test

From this directory, run `npm ci`, `npm run check`, `npm test` and `npm run build`. The build bundles CommonJS `build/handler.js` and `build/authorizer.js`, each exporting `handler`, for the Node.js 24 Lambda runtime. Tests use Node's built-in test runner and injected transports; they make no AWS or provider requests. Build artifacts and dependencies are ignored by Git.

## Configuration and secrets

`AWS_REGION` must be `us-east-2`. Required environment variables are `EDGE_SECRET_ARN`, `OPENAI_SECRET_ARN`, `ANTHROPIC_SECRET_ARN`, `GATEWAY_SECRET_ARN`, `STATE_TABLE_NAME`, `GATEWAY_ACCOUNT_ID` and `GATEWAY_ID`. Only secret identifiers enter Lambda configuration. The authoriser needs only the Region and edge secret identifier. Optional model variables are `OPENAI_MODEL` and `ANTHROPIC_MODEL`; the current explicit allowlist is `gpt-6-luna` and `claude-haiku-5-5` respectively.

Provider and Gateway secrets contain raw API tokens. The edge secret contains `{"activeKeyId":"k1","keys":{"k1":"<canonical-base64url-key>"}}`, with one or two explicit keys of 32–64 bytes. Retain the previous key while requests signed with it remain valid; rotate and remove it after the envelope lifetime plus the 30-second secret-cache lifetime. Missing, malformed or placeholder credentials fail closed. Cached values are never used after a failed refresh.

## Signed envelope

The **Hash-based Message Authentication Code (HMAC)** is a tamper-evident seal over the request, using SHA-256 and a shared secret. The base64url signature covers these newline-separated fields, without a trailing newline:

```text
chat-edge-v1
<key ID>
<Unix timestamp in seconds>
<lowercase UUID v4 nonce>
POST
/api/chat/_probe
<lowercase SHA-256 of exact body bytes>
phase2-operator
```

Headers are `x-chat-key-id`, `x-chat-timestamp`, `x-chat-nonce`, `x-chat-body-sha256`, `x-chat-context` and `x-chat-signature`. Duplicate protected headers, different paths/methods, query parameters, timestamps older than 60 seconds or more than 5 seconds ahead are rejected. The handler checks the body hash independently, including canonical API Gateway base64 decoding. Bodies are capped at 256 bytes and one literal provider field; duplicate JSON keys and extra fields are rejected.

The authoriser only checks the envelope. Before inference, the handler atomically writes `pk=NONCE#<key ID>#<nonce>`, `sk=REPLAY` with an absence condition. Its 120-second **time to live (TTL)** is cleanup, not the authority check; code always checks timestamp expiry. A duplicate or uncertain write never permits a paid call.

## Provider and stream behaviour

Only `https://gateway.ai.cloudflare.com/v1/<account>/<gateway>/openai/responses` and `/anthropic/v1/messages` are constructed. OpenAI uses `Authorization`; Anthropic uses `x-api-key`. Both supply Gateway authentication and `cf-aig-no-wholesale:true`, `cf-aig-collect-log-payload:false`, `cf-aig-skip-cache:true`. Gateway configuration must also require credentials (`byok_only:true`), disable retries, and disable payload-exporting Logpush. The application does not retry, fall back or follow redirects.

The output limit is 32 tokens, the complete handler deadline at most 25 seconds, and the response-body cap 64 KiB. Cancellation applies through response-body consumption, not only receipt of headers. AWS SDK calls share the request's abort signal and have one configured attempt.

Successful streams contain `status`, `result`, `done`; failure after progress contains `error`, `done`. These are operator probe frames, not the public chat contract. The first progress frame precedes inference. Only the exact `OK` answer passes the probe; raw model content is not streamed. Safe errors do not expose request bodies, credentials or provider error text.

CloudWatch receives structured request/provider/outcome/timing/usage receipts. Prompt and response text, request headers, secret values and raw exceptions are excluded.

Usage receipts preserve numeric token detail, including cache lifetime buckets and optional reasoning counts. Anthropic input totals include ordinary input plus cache reads and creation. Missing/invalid token totals are `unknown`, never zero. Optional missing breakdown fields remain `null`. Token totals do not establish a currency charge or credit attribution; billing verification and a versioned spending controller remain separate work. A failed/cancelled inference has `chargeStatus:unknown` conservatively.

## Verification boundary

Offline tests cover shared signing vectors, authentication and byte tampering, duplicate fields/headers, expiry and rotation, nonce conflicts, SDK cache/conditional-write behaviour, provider routing/authentication, cancellation, response limits, usage and early progress. Infrastructure deployment, end-to-end streaming and actual provider-key billing need separate live evidence.

The cross-package integration test imports the actual edge Worker and passes its signed bytes through API Gateway-shaped headers/base64, the authoriser, backend validation and streamed probe output for both providers. AWS storage and provider HTTP transports remain mocked in that test; it also verifies replay and body-tampering rejection before an additional model call.

References: [Lambda response streaming](https://docs.aws.amazon.com/lambda/latest/dg/config-rs-write-functions.html), [AWS SDK v3](https://github.com/aws/aws-sdk-js-v3), [OpenAI Gateway routing](https://developers.cloudflare.com/ai-gateway/usage/providers/openai/), [Anthropic Gateway routing](https://developers.cloudflare.com/ai-gateway/usage/providers/anthropic/), [Gateway billing controls](https://developers.cloudflare.com/ai-gateway/features/unified-billing/), [Anthropic API version](https://platform.claude.com/docs/en/api/migration-2026-10-21).
