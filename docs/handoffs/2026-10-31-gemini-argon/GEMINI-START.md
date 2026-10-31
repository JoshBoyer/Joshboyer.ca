# Paste into Gemini / Argon

Version: 1.0 | Date: 2026-10-31

```text
Argon, act as lead coordinator for completing the JoshBoyer.ca private AI
assistant spike. Use 24 distinct, scoped subagent workstreams from the handoff
manifest. Run them in bounded dependency waves at the actual platform limit;
do not claim 20+ subagents launched unless you can identify their real jobs.

Workspace: C:\Users\boyer\Downloads\Projects\Joshboyer.ca
Repository: https://github.com/JoshBoyer/Joshboyer.ca
Handoff branch: codex/chat-conversation-panel
Preserved conversational source checkpoint:
ef53778832429cd2f4d2e39e47945c1328b19db5

First read:
1. AGENTS.md, CLAUDE.md, GEMINI.md and applicable local Gemini instructions.
2. docs/handoffs/2026-10-31-gemini-argon/README.md
3. CURRENT-STATE.md, EXECUTION-PLAN.md and agent-workstreams.json there.
4. The real code, tests and current deployed configuration before planning fixes.

The user wants general-purpose natural conversation with guardrails, not a
lookup-only assistant. Evidence and traces belong in a side panel. The attached
reference image supplies visual direction only; its facts, metrics, model names,
JEV label and depicted tools are not verified implementation requirements.

Complete real CAG/RAG/MCP execution and private qualification. Keep the current
AWS us-east-2 + Cloudflare AI Gateway + owner API-key design. Voice and public
activation remain out of scope. Never expose development-agent, AWS admin or
arbitrary MCP capabilities to the assistant.

Do not modify or discard the dirty user's workspace. Fetch the branch and create
an isolated integration worktree. Record baseline SHA, dirty files, unpushed
commits, deployment identities and any pre-existing failures. Preserve unique
work before all destructive operations. Only the integrator merges worker work.

Treat Argon as the lead role. Discover the actual installed Gemini/Antigravity
orchestration interface and its concurrency/cost limits. A standalone Argon CLI
was not verified; do not invent commands or silently raise permissions. Register
all 24 manifest workstreams with named owners and dependencies. Every worker
must be told it is not alone and may edit only its owned files.

Start with a concise requirements ledger and a four-agent discovery wave. Freeze
interfaces before build waves. Main orchestration, shared contracts and the
current monolithic frontend each have one writer. Extract modules before allowing
other writers to own them. Review agents do not silently fix source files.

Preserve the security invariants: private edge access, signed origin envelope,
nonce protection, server-owned sessions, immediate expiry/generation revocation,
atomic total/provider budgets, unknown-charge retention, no paid duplicate run,
and no credentials or raw prompts in traces/logs. Reserve embedding/tool/fallback
costs before invoking them. Free-written replies remain only in expiring session
history; the long-retention ledger must not acquire personal/tool/request text.

General conversational prose is model-written. Canonical evidence and valid IDs
do not prove prose true. Test unsupported career claims, prompt injection and
citation laundering. Explicit safety refusals must not trigger provider fallback.

Use real DynamoDB, the actual private HTTP caller, actual MCP initialize/list/call,
and selected bounded live provider calls where required. Label simulations honestly.
Do not reduce assertions, add skips, hide failures, fabricate trace stages or call
scaffolding finished. Follow the local Gemini determinism/adversarial requirements.

Prove the final SHA from a clean checkout, collect real browser desktop/mobile
evidence and measured cost/latency, and have A24 independently review it. Report
unmet requirements first. Finish with a qualified PRIVATE release candidate and
rollback instructions. Public access must remain disabled unless Josh separately
authorizes release.

Begin by reporting recovered state, the exact orchestration interface you found,
the 24-agent roster and first-wave assignments. Then proceed with the authorized
work without routine confirmation requests. Escalate only material unresolved
architecture, permission, cost or destructive decisions.
```
