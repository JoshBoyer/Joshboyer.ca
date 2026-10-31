# Private assistant spike — Gemini / Argon handoff

Version: 1.0 | Captured: 2026-10-31, 10:14 EDT / 14:14 UTC

**Continue from the working private assistant; do not rebuild it.** Josh wants a conversational, general-purpose assistant with guardrails and a separate evidence/trace panel. Complete **Cache-Augmented Generation (CAG)**, the stable context pack; **Retrieval-Augmented Generation (RAG)**, evidence found for a question; and **Model Context Protocol (MCP)**, authenticated tool calls. Finish and qualify the spike privately. Voice and public release remain separate decisions.

The conversational implementation is preserved in commit **`ef53778832429cd2f4d2e39e47945c1328b19db5`**, on `codex/chat-conversation-panel`. This handoff is added after that checkpoint on the same branch. Fetch and verify the current branch before starting.

## Start here

1. Read [current state](CURRENT-STATE.md): code, deployments, evidence, gaps and protected work.
2. Read the [execution plan](EXECUTION-PLAN.md): requirements, 24-agent ownership, waves and gates.
3. Give [the start prompt](GEMINI-START.md) to Argon in Gemini.
4. Use [agent-workstreams.json](agent-workstreams.json) as the initial work queue. All entries begin as **planned**, not running or complete.
5. Use [status.json](status.json) for the captured machine-readable baseline, and the [existing architecture plan](../../architecture/chat-implementation-plan.md) for established technical decisions.

**Argon assumption:** Argon is Josh's named lead coordinator in Gemini/Antigravity, not an application model or a new runtime dependency. Gemini CLI and local Gemini guidance were found. No standalone `argon` executable or project-specific Argon invocation was verified. The start prompt requires capability discovery before dispatch.

## State in one screen

| Area | State |
| --- | --- |
| AWS and Gateway | Deployed private path, own provider keys, `us-east-2` |
| Conversation | Implemented and deployed; natural greeting observed through the real browser |
| Side panel | Implemented and deployed; Evidence/Trace separated from chat |
| Sessions, spending, clear/replay | Implemented; database and HTTP integration coverage |
| General-mode verification | 277 root / 84 backend tests passed in the current workspace; broader live browser and clean-checkout qualification remain |
| RAG and real MCP tools | Not implemented; main remaining engineering work |
| Mockup fidelity and full quality evaluation | Not complete |
| Public access / voice | Disabled / deferred |

## Visual reference

The supplied image is a **design reference**, not a source of career facts or proof of existing functionality. In particular, its model names, “JEV”, vector/web-search labels, tool receipts, timestamps, quantities and financial metrics are not verified requirements or evidence.

| Current private build | User's reference |
| --- | --- |
| [Current screenshot](assets/current-preview.jpg) | [Reference image](assets/reference-ui.png) |

Keep the useful direction: conversational centre, separate inspection panel, clear request status, approachable identity, and visible evidence. Implemented capabilities must determine the available controls and traces. Never display a fictional completed retrieval or tool stage to match the image.

## Completion boundary

The deliverable is a **private, tested, inspectable release candidate** with actual CAG/RAG/MCP execution and honest evidence. It is not permission to publish the assistant, activate voice, install arbitrary MCP servers, upgrade AWS, or expose administrative credentials.
