# AWS Agent Toolkit setup record

Version: 1.0 | Date: 2026-10-31 | Status: Installed and verified

Agent Toolkit for AWS is installed for Codex and Claude Code. Application resources have not been provisioned. OpenAI, Anthropic and Cloudflare credentials were not read or configured during this setup.

## Project settings

| Setting | Value |
| --- | --- |
| AWS experience | New AWS experience |
| CLI profile | `joshboyer-portfolio` |
| Application Region | `us-east-2` |
| Toolkit service Region | `us-east-1` (required by the toolkit) |
| Guidance preference | Medium |
| AWS CLI | `2.39.3` |
| MCP proxy | `1.7.0` observed at verification |
| Project plan | Active Free plan; US$100 remaining AWS credits observed on setup date |
| Plan expiration | 2027-04-30, as reported by AWS |

The credit balance and plan state are observations, not a guarantee of future availability. Provider API credits remain separate.

## Completed verification

- PowerShell and `uv` available; AWS download endpoint reachable.
- Official Windows installer and downloaded MSI passed AWS signature verification.
- Browser login completed; `sts get-caller-identity` succeeded for the named profile.
- Toolkit wizard exited successfully.
- Remote catalogue returned **118 available skills**; **23 default skill directories** were installed for each detected agent's skill location.
- AWS MCP completed `initialize` and `tools/list` with **8 tools**, using the generated proxy configuration and named-profile environment.
- An authenticated `aws___search_documentation` call with topic `agent_skills` succeeded, followed by `aws___retrieve_skill` for the returned `connecting-lambda-to-api-gateway` skill. This verifies remote tool execution as well as discovery; no resource mutation was invoked.
- Both generated `aws-mcp` entries use `AWS_MCP_PROXY_PROFILES=joshboyer-portfolio`.
- Existing MCP server values were compared with backups and preserved. Codex's original configuration content was retained, with only the AWS entry appended.
- AWS rules were added once, between stable markers, in `AGENTS.md` and `CLAUDE.md`. The pre-existing `AGENTS.md` content was preserved.
- Repository checks: 136 tests passed; syntax checks covered 59 JavaScript files; security checks covered 62 runtime text files. No application runtime was changed.

Catalogue output initially failed under the Windows default character encoding. Retrying with `PYTHONUTF8=1`, `PYTHONIOENCODING=utf-8` and UTF-8 console output succeeded. This was an output-encoding failure, not failed AWS authentication.

Local installer receipts, configuration backups and MCP verification evidence are under `C:/Users/boyer/.codex/setup/aws-agent-toolkit-20261031/`, outside the repository and public web root. Treat configuration backups as private.

## Use in the next session

Close this Codex session and start a new one so it loads the installed rules, skills and AWS MCP configuration. The current session does not hot-load the new server into its native tool list; the connection was independently verified through the generated MCP transport.

Continue with [the chat implementation plan](../architecture/chat-implementation-plan.md), beginning with contracts and the approved public knowledge export. Keep the administrative AWS MCP tools entirely separate from the public chat assistant.

The setup guide states that login credentials are valid for 12 hours and can renew for 90 days without browser reauthentication. When login is required again:

```powershell
aws login --region us-east-2 --profile joshboyer-portfolio
```

To use another AWS project later, log in under another profile, add that profile name to the space-separated `AWS_MCP_PROXY_PROFILES` value in the relevant MCP configurations, and restart the AI tool. Do not replace this project's profile silently.

To reverse only this integration, remove the `aws-mcp` entries and the marked AWS rule blocks after checking for later changes. Do not overwrite whole configuration files with old backups if newer work exists.

## Sources

- [Requested AWS setup instructions](https://raw.githubusercontent.com/aws/agent-toolkit-for-aws/refs/heads/main/setup-instructions/setup.md)
- [New AWS experience rules](https://raw.githubusercontent.com/aws/agent-toolkit-for-aws/refs/heads/main/rules/aws-starter-rules.md)
- [Chat implementation plan](../architecture/chat-implementation-plan.md)
