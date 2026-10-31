# Chat Phase 2 verification

Version: 1.0 | Date: 2026-10-31 | Scope: private operator pilot

The AWS infrastructure and both provider-key routes are deployed and verified. This is the fixed-prompt operator test path; public chat remains a later phase. Use the [pilot runbook](chat-phase2-pilot.md) to repeat the checks.

```text
Authenticated operator
        |
        v
Cloudflare Worker -> AWS API + Lambda
                              |
                              v
                    AI Gateway -> provider
```

## Deployed resources

- AWS stack: `PortfolioChatDev`, selected Region `us-east-2`, temporary credentials through profile `joshboyer-portfolio`.
- Operator endpoint: `https://joshboyer-chat-dev.boyer-josh1985.workers.dev/api/chat/_probe`.
- Signed AWS endpoint: `https://7fvk4i6eg7.execute-api.us-east-2.amazonaws.com/dev/api/chat/_probe`.
- Gateway: `joshboyer-chat-dev`; Worker version: `995d8f2e-6213-4adc-b069-f691c52405f6`.
- Stack status `UPDATE_COMPLETE`, termination protection enabled, final CloudFormation drift `IN_SYNC` with zero drifted resources.
- Node.js 24 functions, separate authorisation and inference roles, private encrypted/versioned evidence bucket, protected DynamoDB state table, seven-day AWS logs. Provider credentials are stored in Secrets Manager; the Worker holds only its operator credential and signing keyring.

## Observed provider path

Both requests passed through the deployed Worker, AWS authoriser, Lambda, replay store and Gateway. Each returned the fixed answer `OK`, known usage and a final successful event.

| Provider/model | Input/output tokens | First byte | Completed | Gateway receipt |
| --- | --- | --- | --- | --- |
| OpenAI `gpt-6-luna` | 11 / 5 | 964 ms | 2,910 ms | `01a191ab-fd0f-7330-90d2-4a6b11ada654` |
| Anthropic `claude-haiku-5-5` | 16 / 4 | 559 ms | 1,477 ms | `01a191ac-0693-70ea-ae93-875f292638fd` |

These are two individual observations, not a percentile or load benchmark. Two earlier direct Gateway checks also passed. Three initial Worker attempts failed before reaching AWS because Workers rejects `redirect: "error"`; the deployed fix uses `manual` and rejects non-200 responses, including redirects. Regression tests cover 302/307 responses without forwarding signed headers.

## Security and billing evidence

| Check | Observed result |
| --- | --- |
| Worker missing/wrong operator credential | 401 / 401 |
| Worker unlisted route | 404 |
| Unconfigured Worker, before provisioning | 503 |
| AWS unsigned / expired signature | 401 / 401 |
| AWS altered body / consumed nonce | 403 / 403, inference not started |
| Gateway missing authentication | 401 for both provider routes |
| Gateway missing provider key | 400 for both routes; zero model tokens |
| Gateway billing/cache controls | Authentication and BYOK required; no configured retries; all six recorded requests uncached with `wholesale:false` |
| Gateway payload inspection | Request, response and prompt payload fields absent/empty in all six records |
| AWS log inspection | Both completed provider receipts and rejection receipts observed; no detected prompt, credential or sensitive-header content in the three log groups |
| Production isolation | Homepage 200; `/api/twin` and `/twin-drawer.js` remain 410 before and after deployment |

The runtime token is distinct from management/deployment tokens. Its attempt to update the existing Gateway settings was rejected with 403. It can read Gateway settings/logs; its Workers list returned no entries. The dashboard's exact selected permissions were not independently inspected, so this does not establish a strictly Run-only token. Confirm that policy before public qualification. No management token is stored in AWS.

Provider-key routing is verified; monthly credit attribution and provider invoices are not. Application spending reservations, sessions and visitor limits remain Phase 3 work. Keep this endpoint operator-only.

## Recovery and local verification

Recovery preserved all ten retained resources and the four existing secret versions before credential provisioning. The logging policy now belongs to the retained role, with log access confined to this AWS project and Region. Secret values are outside CloudFormation ownership. API Gateway's normalised log destination ARN is reflected in the CDK context.

Local verification: 232 root tests plus 47 cloud-package tests; TypeScript checks and builds pass. Lint has zero errors and 53 existing warnings. The pinned CDK tooling has the two moderate dependency advisories recorded in its [infrastructure notes](../../infra/aws/README.md); runtime dependency checks found none.

Raw deployment, drift, request and sanitised log receipts remain locally outside the repository. The portfolio homepage and legacy-removal endpoints are checked separately from this isolated pilot. Next: sessions, durable spending reservations and cache-augmented generation (CAG), followed by retrieval-augmented generation (RAG) and Model Context Protocol (MCP) tools. Voice remains deferred.
