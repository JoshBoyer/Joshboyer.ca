# Gemini / Argon entry point

Version: 1.0 | Date: 2026-10-31

Read `AGENTS.md` and `CLAUDE.md`, then `docs/handoffs/2026-10-31-gemini-argon/README.md` and its linked handoff files before changing this project.

Josh requested that Gemini continue the private chat spike with **Argon as lead coordinator and 24 scoped subagents**. The roster is a plan, not evidence that those agents have launched. Discover the installed orchestration interface and concurrency limits rather than inventing Argon commands.

Current product decisions: general-purpose conversation with guardrails; portfolio evidence and traces in a separate side panel; AWS `us-east-2`, Cloudflare AI Gateway and Josh's own provider keys; RAG/MCP next; voice later; public access remains disabled.

Model-written conversational text is an explicitly requested product output. Validate its structure, render it safely and distinguish it from canonical evidence. Do not reinterpret a generic prohibition on raw provider responses as a requirement to restore lookup-only chat. Raw HTTP responses, exceptions, secrets and private reasoning remain prohibited in UI/logs.

Use an isolated checkout for new work. The current working directory contains unrelated user edits that must remain recoverable.
