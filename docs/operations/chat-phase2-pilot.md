# Chat cloud pilot

Version: 1.0 | Date: 2026-10-31 | Scope: Phase 2 operator test path

Phase 2 connects an authenticated test Worker to AWS in **us-east-2**, then sends one small request through Cloudflare AI Gateway using Josh's provider keys. The only prompt is `Reply with exactly OK.` Public chat, sessions, budgets, retrieval, MCP execution and voice remain later phases.

Deployment and observed checks are recorded in the [Phase 2 verification](chat-phase2-verification.md).

```text
Operator token
      |
      v
Isolated Cloudflare test Worker
      | signed request
      v
AWS REST API + authoriser
      |
      v
Lambda -> AI Gateway -> provider key billing
      |
      +-> DynamoDB replay receipt
```

The **authoriser** checks the signature before the application runs. The application checks the actual body and consumes a unique **nonce**, a value that can be used only once, before inference. Provider keys live in Secrets Manager; the Worker receives only an operator token and the edge-signing keyring.

## Local verification

Use Node.js 24 and the authenticated AWS profile `joshboyer-portfolio`. Install the three isolated packages once:

```powershell
npm ci
npm --prefix services/chat ci
npm --prefix services/edge ci
npm --prefix infra/aws ci
npm test
npm run check:chat-cloud
npm run test:chat-cloud
npm run build
npm run build:chat-cloud
```

The root build remains the static-site build. The explicit cloud commands check TypeScript, execute the cloud-package tests, bundle the service/Worker and synthesise the AWS template. Synthesis uses the named AWS profile; infrastructure tests also support an offline fixture. [Infrastructure instructions](../../infra/aws/README.md) describe bootstrap and deployment.

## Credentials

| Environment variable | Use |
| --- | --- |
| `OPENAI_API_KEY` | OpenAI API billing/credits |
| `ANTHROPIC_API_KEY` | Anthropic API billing/credits |
| `CLOUDFLARE_ACCOUNT_ID` | Selected Cloudflare account; not secret |
| `CLOUDFLARE_API_TOKEN` | Existing Worker deployment access |
| `CLOUDFLARE_AI_GATEWAY_TOKEN` | AI Gateway Read + Write; operator management only |
| `CLOUDFLARE_AI_GATEWAY_RUN_TOKEN` | AI Gateway Run only; stored in AWS for inference |
| `JOSH_CHAT_PROBE_TOKEN` | Random, dedicated operator credential for the isolated Worker |
| `JOSH_CHAT_PROBE_URL` | Deployed test Worker URL ending in `/api/chat/_probe` |

Scope the Cloudflare tokens to the selected account. Cloudflare's Run permission is account-scoped, not restricted to a single gateway. Never use the management or general deployment token as the runtime token. The helper rejects reuse of those token values.

Credentials are process inputs to the operations helper, not command-line arguments. On Windows, hydrate an existing user environment value with `[Environment]::GetEnvironmentVariable('<name>', 'User')`; do not print it. The existing ignored `.env` may supply a provider key, but only copy the needed key into the process. Do not place real values in examples, templates, deployment outputs or committed configuration.

The provisioning operator needs `GetSecretValue`, `PutSecretValue`, `DescribeSecret` and `ListSecretVersionIds` for the four named secrets. The last two distinguish a new empty secret from an existing secret whose current-version label is missing. Application roles receive only `GetSecretValue` for their required secrets.

## Provision and verify

1. Verify AWS identity, Region, project plan and existing API Gateway log-role setting. Review the generated CloudFormation execution policy and CDK diff. Bootstrap with that scoped policy, then deploy `PortfolioChatDev` with the Cloudflare `GatewayAccountId` parameter. Keep outputs outside the repository.
2. Run `node tools/chat-cloud-ops.cjs gateway`. It creates `joshboyer-chat-dev` only if absent, or verifies existing settings. A mismatch fails instead of silently overwriting settings.
3. Run `node tools/chat-cloud-ops.cjs secrets`. It verifies all four fixed secret identities and writes the separate provider/Run credentials. It initialises an edge keyring only from a verified, never-populated secret or the legacy `{"configured":false}` placeholder. Repeating it preserves unchanged values and existing valid signing keys. Secret values stay outside the infrastructure template.
4. Put the deployed AWS origin, including `/dev`, in `services/edge/wrangler.jsonc`. Set the Worker deployment token/account in the process. Run `npm --prefix services/edge run deploy`, then `node tools/chat-cloud-ops.cjs edge-secrets` with the dedicated operator token. The Worker fails closed until configured.
5. Set `JOSH_CHAT_PROBE_URL` and run `node tools/probe-chat-cloud.cjs`. Check both provider receipts, early streaming progress and known usage. Run its `--negative` checks and inspect the redacted AWS/Gateway logs.
6. Set `AWS_ORIGIN` to the stack's origin including `/dev`, then run `node tools/probe-chat-origin.cjs verify`. It verifies the project and stack outputs before testing unsigned, expired, body-altered and previously consumed envelopes. It seeds one fresh, expiring DynamoDB nonce for the replay check; it does not intentionally invoke a model. Expected statuses are 401, 401, 403 and 403, with `chargeStatus:not_started` on the application rejections.

Every Wrangler command must name `services/edge/wrangler.jsonc` explicitly, or run an edge package script that does so. Wrangler can otherwise discover the root production configuration. The test Worker has no production routes, assets, contact-mail binding or legacy Durable Object.

## Billing and privacy controls

The gateway requires authentication and **Bring Your Own Key (BYOK)** billing. `byok_only:true` and the request header `cf-aig-no-wholesale:true` prevent Cloudflare Unified Billing fallback. Provider credentials are sent using their native authentication headers; they are not stored as Cloudflare BYOK keys.

Requests disable response caching and payload logging. Gateway metadata remains available; Logpush is disabled. The gateway is created without a retry or fallback configuration. The application makes one attempt, rejects redirects and bounds the entire response read. Verify observed upstream attempts before claiming exactly-once billing; cancellation or an ambiguous failure may still incur provider charges.

AWS throughput controls and the operator credential constrain this pilot. They do **not** replace the durable spending reservations required before public chat. Keep the operator token private and never ship it to a browser bundle. Logs contain identifiers, outcome, timings and numeric usage rather than prompts, headers or keys.

## Stop or recover

- To stop inference quickly, set the handler's reserved concurrency to zero using the named AWS profile, then reconcile that change in infrastructure before restoring service. The static portfolio remains independent.
- Redeploy the previous reviewed service/Worker version to roll back code. Preserve valid signing keys unless deliberately rotating them. During rotation, retain the previous key briefly for in-flight requests; never accept unsigned fallback traffic.
- The stack has termination protection. Data, secrets, logs and the regional API Gateway log role/policy are retained. Deleting a stack is not a complete cleanup; inventory retained resources and data first.
- The `CDKToolkit` bootstrap and its scoped execution policy support deployment. Do not delete or broaden them incidentally.

## Evidence boundary

Offline tests establish contract and control behaviour with mocked services. A successful infrastructure deployment establishes resource creation. Only observed requests through the deployed Worker, AWS API and both Gateway provider routes establish the live path. Neither a token's presence nor a successful API call alone proves monthly credit attribution; inspect the provider's billing records separately.

Sources: [Gateway billing controls](https://developers.cloudflare.com/ai-gateway/features/unified-billing/), [Gateway authentication](https://developers.cloudflare.com/ai-gateway/configuration/authentication/), [Gateway logging](https://developers.cloudflare.com/ai-gateway/observability/logging/), [AWS streaming integration](https://docs.aws.amazon.com/apigateway/latest/developerguide/response-streaming-lambda-configure.html).
