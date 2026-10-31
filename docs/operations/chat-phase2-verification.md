# Chat Phase 2 verification

Version: 1.1 | Date: 2026-10-31 | Scope: private operator pilot

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
| Gateway billing/cache controls | Authentication and BYOK required; no configured retries; initial six log records uncached with `wholesale:false` |
| Gateway payload inspection | Request, response and prompt payload fields absent/empty in the initial six records |
| AWS log inspection | Both completed provider receipts and rejection receipts observed; no detected prompt, credential or sensitive-header content in the three log groups |
| Production isolation | Homepage 200; `/api/twin` and `/twin-drawer.js` remain 410 before and after deployment |

The runtime token is distinct from management/deployment tokens. A subsequent dashboard inspection confirmed that it also had Read permission; this was removed. The saved runtime policy now contains **AI Gateway Run only**, and live reads of Gateway settings and logs return 403. Its earlier settings-update attempt also returned 403. The dedicated management token had all 17 AI permissions selected; its saved policy now contains only **AI Gateway Read + Write**, and the management verification still passes. Both policies remain scoped to the selected Cloudflare account. No token values were rotated and no management token is stored in AWS.

After narrowing both policies, the deployed provider probes passed again with known usage: OpenAI returned 11 input / 5 output tokens (Gateway receipt `01a191d1-a093-7615-bb13-a4514cfe7e42`); Anthropic returned 16 input / 4 output tokens (`01a191d1-a92a-74af-af5c-aec2ce804450`). First-byte/complete timings were 2,516/4,379 ms and 409/1,266 ms respectively. These remain individual observations, not a latency target qualification.

Provider-key routing is verified; monthly credit attribution and provider invoices are not. Application spending reservations, sessions and visitor limits remain Phase 3 work. Keep this endpoint operator-only.

## Recovery and local verification

Recovery preserved all ten retained resources and the four existing secret versions before credential provisioning. The logging policy now belongs to the retained role, with log access confined to this AWS project and Region. Secret values are outside CloudFormation ownership. API Gateway's normalised log destination ARN is reflected in the CDK context.

Local verification: 232 root tests plus 47 cloud-package tests; TypeScript checks and builds pass. Lint has zero errors and 53 existing warnings. The pinned CDK tooling has the two moderate dependency advisories recorded in its [infrastructure notes](../../infra/aws/README.md); runtime dependency checks found none.

Raw deployment, drift, request and sanitised log receipts remain locally outside the repository. The portfolio homepage and legacy-removal endpoints are checked separately from this isolated pilot. Next: sessions, durable spending reservations and cache-augmented generation (CAG), followed by retrieval-augmented generation (RAG) and Model Context Protocol (MCP) tools. Voice remains deferred.
