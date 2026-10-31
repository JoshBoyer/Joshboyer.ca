# Chat infrastructure

Version: 1.1 | Date: 2026-10-31 | Scope: Private chat, RAG retrieval and MCP infrastructure (`us-east-2`)

This package defines the AWS side of the private portfolio assistant (`PUBLIC_CHAT_ENABLED=false`). Regional resources are locked to **us-east-2**; the deployment project must be supplied explicitly.

```text
Authenticated Cloudflare edge
             |
             v
REST API + edge-signature authoriser (CUSTOM) / internal MCP route (AWS_IAM)
             |
             +--> Streaming chat Lambda -> AI Gateway / S3 / S3 Vectors / DynamoDB
             |           |
             |           +--> SigV4 POST /api/chat/_mcp
             v
      Stateless MCP Lambda (read-only public corpus tools)
```

The authoriser verifies the signed request envelope on edge routes. The chat handler verifies the actual body, consumes a one-time nonce, enforces session and budget state in DynamoDB, queries read-only RAG evidence in S3 / S3 Vectors, and invokes the internal MCP route (`POST /api/chat/_mcp`) using AWS SigV4 (`AWS_IAM`). Authentication, body checks and provider behaviour are implemented in `services/chat/` and `services/portfolio-mcp/`; this package wires their permissions and runtime.

## Resources and boundaries

- One regional REST API exposes the edge-authenticated chat routes (`POST /api/chat/_probe`, `GET /api/chat/config`, `POST /api/chat/session`, `DELETE /api/chat/session`, `POST /api/chat/messages`, `POST /api/chat/requests/{requestId}/cancel`) with a zero-second-cache `REQUEST` authoriser and Lambda response streaming, plus the internal `POST /api/chat/_mcp` route protected by `AWS_IAM`.
- Three Node.js 24 Lambda functions have separate least-privilege roles and 256 MB memory: `handler` (ARM64, 60s timeout, 2 reserved executions), `authorizer` (ARM64, 10s timeout, 2 reserved executions), and `mcp` (`joshboyer-chat-dev-mcp`, x86_64, 10s timeout, 4 reserved executions). None has a VPC or function URL.
- DynamoDB uses on-demand billing, `pk`/`sk`, an `expiresAt` time-to-live field and point-in-time recovery. `HandlerRole` is scoped by `dynamodb:LeadingKeys` to `NONCE#*` (`PutItem`) and `SESSION#*`, `REQUEST#*`, `BUDGET#*`, `VISITOR#*` (`GetItem`, `PutItem`, `UpdateItem`). `McpRole` has zero DynamoDB permissions.
- A versioned S3 bucket holds approved evidence and index artifacts. Public access is blocked, encryption is enabled and HTTPS is required. `HandlerRole` has read-only `s3:GetObject` on `indexes/*`, `s3:ListBucket` on the evidence bucket, and read-only `s3vectors:QueryVectors`/`GetVectors`/`GetIndex`/`GetVectorBucket` on `joshboyer-chat-dev-vectors*`, plus `execute-api:Invoke` on `POST /api/chat/_mcp`. `McpRole` has zero S3, S3 Vectors, DynamoDB or Secrets Manager permissions.
- Four Secrets Manager resources separate OpenAI, Anthropic, Gateway and edge-signing credentials. Only the handler can read provider/Gateway values; the authoriser can read only the edge keyring; the MCP function can read none. Values are provisioned separately, never embedded in the template or Lambda environment.
- Four log groups retain data for seven days. API logs contain request ID, status, response size and latency only. Execution-body logging is disabled. Six alarms track function errors and throttles across `handler`, `authorizer`, and `mcp`; notification destinations are not configured by this package.
- State, secrets, evidence and logs are retained on deletion or replacement. The stack has termination protection. Cleanup must explicitly consider retained resources and any persisted data.

The stage permits one request/second with a burst of two. These controls limit throughput; they are not spending limits. The later session and budget phase must reserve provider cost before public inference is enabled.

## Build and inspect

Build `services/chat/` first. Synthesis requires real `build/handler.js` and `build/authorizer.js` bundles and will not substitute dummy runtime code.

```powershell
npm ci
npm run check
npm test
npm run synth -- --profile joshboyer-portfolio
npm run diff -- --profile joshboyer-portfolio
```

Tests synthesise isolated fixtures without AWS access. To synthesise the actual bundles without CLI credential discovery, set non-secret `CDK_DEFAULT_ACCOUNT` and `CDK_DEFAULT_REGION=us-east-2`, then run `npx tsx bin/app.ts`. That writes a local cloud assembly only. Deployment must use the real, verified project identity.

## Bootstrap and deployment

Use the authenticated `joshboyer-portfolio` profile. Check project plan, selected Region and existing resources first. The default CDK qualifier is `hnb659fds`.

Generate the scoped CloudFormation execution policy with:

```powershell
npm run --silent bootstrap:policy -- <12-digit-project-id>
```

Root orchestration creates that policy and passes its ARN to `cdk bootstrap --cloudformation-execution-policies`. The generator grants resource operations for this stack's named functions, roles, table, bucket, secrets, logs and alarms, plus reads of the CDK asset bucket and bootstrap-version parameter. It does not grant administrator access, create identity providers or create team members.

**Technical note:** API Gateway assigns API IDs during creation, so its control-plane permissions cover REST APIs in the selected Region. The CloudFormation read and drift checks require `logs:DescribeLogGroups`, `logs:DescribeIndexPolicies` and `logs:DescribeResourcePolicies`, which require resource `*`; these actions are limited by a `us-east-2` requested-Region condition. These are exceptions to otherwise named-resource permissions. The policy is for CloudFormation deployment; it must never be attached to either application function.

Deploy the reviewed assembly with `GatewayAccountId` and optional `GatewayId`, `OpenAiModel` and `AnthropicModel` parameters. Account and gateway IDs are configuration, not credentials. Current model defaults are `gpt-6-luna` and `claude-haiku-5-5`; changes require explicit allowlist updates.

API Gateway's log role is a regional project setting. When no role exists, this stack creates a scoped role and retains the setting. When a suitable existing role should be reused, set `CHAT_REUSE_API_LOG_ROLE=true` before synthesis. Inspect the current setting first; do not switch an existing deployed stack between modes casually.

The logging role includes all seven actions in AWS's API Gateway logging policy, including `logs:CreateLogGroup` even though the access-log group is pre-created. API Gateway rejected a single-group policy during the initial deployment; its dedicated service role therefore covers log groups in this project and `us-east-2`. `DescribeLogGroups` requires resource `*`. Application roles retain their individual log-group scope. The account setting explicitly depends on the role, whose embedded policy is installed as part of its update.

The CDK `logGroupDestinationArnWithoutWildcard` feature flag uses the same log destination ARN that API Gateway stores, avoiding false drift from its removal of a trailing `:*`.

If initial creation rolls back, inventory retained resources before retrying. Automatic import supports the named table, bucket, log groups and role, but the current auto-import list does not include Secrets Manager secrets or the generic `AWS::IAM::Policy` type. Use an explicit import change set for retained resources that require it, preserving logical IDs, then apply the full reviewed template. The logging policy is embedded in the imported role with its original name `ApiLogPolicy4B32349C`; recreating it as a separate policy fails if it already exists. Obtain identifiers from `get-template-summary` rather than guessing their field names. Do not delete retained credentials or data just to make a same-name create succeed.

The template creates four empty secret resources without `SecretString` or `GenerateSecretString`; it never owns credential values. The initial deployment used a `{"configured":false}` placeholder, which was removed from the template during recovery. Populate values through Secrets Manager using a private input channel before testing. Provider and Gateway values are raw credential strings; the edge secret is `{ "activeKeyId": "k1", "keys": { "k1": "<base64url-secret>" } }`. Never add credential values or generation settings to the template. When changing secret resource properties, review the change set for replacement and compare version IDs before and after deployment without reading values.

After deployment, verify the actual method/authoriser, key permissions, rejection paths, streaming frames and both provider routes. Local synthesis and tests do not establish successful deployment or provider billing attribution.

## Dependency note

On 2026-10-31 the pinned latest `aws-cdk-lib` 2.275.0 reports two moderate audit entries through `minimatch`, with no upstream fix offered by npm. This package runs during infrastructure synthesis; it is not included in Lambda bundles. Treat infrastructure source and glob patterns as trusted input. Runtime dependency results are reported separately.

## References

- [AWS response-streaming integration](https://docs.aws.amazon.com/apigateway/latest/developerguide/response-streaming-lambda-configure.html)
- [Supported Lambda runtimes](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html)
- [CDK bootstrap customisation](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping-customizing.html)
- [API Gateway logging permissions](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonAPIGatewayPushToCloudWatchLogs.html)
- [Automatic import requirements and supported types](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/import-resources-automatically.html)
- [CloudFormation secret value ownership](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-secretsmanager-secret.html)
