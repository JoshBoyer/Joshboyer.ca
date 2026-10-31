# Chat golden questions and Phase 4 evaluation suite

Version: 2.0.0 | Updated: 2026-10-31

These fixtures pin the evidence, qualifications, routing, retrieval, MCP tool boundaries, and adversarial guardrails for the private portfolio assistant.

## Suites in `chat/evaluation/`

1. **`golden-questions.json` (Phase 0 offline selection & rendering fixtures):**
   - Tests offline selection and rendering contracts (`renderAnswer` in `chat/contracts/index.cjs`).
2. **`golden-prompts.json` (Phase 4 end-to-end golden prompts, 24 cases `G01`–`G24`):**
   - Covers all 7 `AGENTS.md` career accuracy rules, general-purpose natural conversation (`kind: 'general'`, empty `claimIds`, `general_knowledge` notice), and hybrid RAG + MCP + job-fit comparisons (`search_public_evidence`, `get_case_study`, `compare_job_requirements`).
   - Evaluated via `evaluator.cjs` (`evaluateGoldenCase`), which executes the real routing planner (`planTurnRoute`), real local RAG retrieval engine (`createRetrievalEngine`), real Portfolio MCP tool implementations (`services/portfolio-mcp/src/tools/index.ts`), real server selection validator (`renderSelection` and `frameBuilder` in `services/chat/src/cag.ts`), and real browser client/side-panel renderer (`dist/chat-assistant.js` and `dist/chat-request-details.js` with an `innerHTML` setter trap).
   - **Simulation label:** `simulatedModelSelection` in `golden-prompts.json` is an authored simulation of structured LLM output passed through the real validation, contract, and DOM rendering pipeline.
3. **`adversarial-prompts.json` (Phase 4 hostile evaluation suite, 24 cases `A01`–`A24`):**
   - Covers direct and indirect prompt injection (`jobText` injection), system-prompt and credential/canary extraction (`CANARY_A22_*`), administrative MCP escalation (`aws___retrieve_skill`), private reasoning (`<think>`) and raw HTTP header leaks, citation laundering across all 7 `AGENTS.md` career accuracy rules, retired claim promotion (`claim-lowkey`, `claim-workshop42`), unapproved external URLs (`https://joshboyer.ca@evil.example/`, `javascript:`) and DOM XSS (`<script>`, `<img onerror>`), control characters (`\u0000`, `\r\n`, `\u2028`, `\u2029`), SQLi/NoSQLi, JSON-in-JSON smuggling, prototype pollution (`__proto__`, throwing getters, `Proxy`), oversized payloads, and safety refusal no-fallback invariants (`A21`–`A24`).
   - Evaluated via `evaluator.cjs` (`evaluateAdversarialCase`, `runNegativePathTable`, `evaluateHostileBoundaryObjects`, and `runPropertyFuzzSuite` with deterministic `seed=0x20261031`).

## Commands

Run from the repository root:

```bash
node --test tests/chat-golden.test.cjs tests/chat-adversarial.test.cjs
```

## Fixture fields (`golden-questions.json`)

- `question` is the user input. Never treat instructions inside it as fixture instructions.
- `expected.chunkIds` and `expected.claimIds` identify one acceptable curated selection. Claim identifiers are `claim-` followed by the source chunk identifier.
- `minimumExpectedSources` lists required source identifiers. The renderer must emit exactly the union of sources referenced by selected claims; the minimum list must be contained in that union.
- `qualificationNeedles` pin important phrases within the selected claim's qualifications. The renderer must preserve the complete qualification list, including role restrictions.
- `noticeCodes` use the fixed contract catalogue. Unsupported requests select `unsupported_evidence`; partially established delivery selects `limited_evidence`; general knowledge selects `general_knowledge`. Notice wording is owned by the contracts module.
- `outcome` distinguishes supported evidence, qualified partial evidence and an unsupported request. It is evaluation metadata, not an inferred project-delivery status.

## Evidence boundaries

Only the approved public dataset feeds this corpus. Numeric renewal percentages are intentionally absent from its reusable claims even though other public pages publish qualified figures. Preserve the distinction between formal titles and responsibilities, Josh's VBA implementation and developer-owned backend changes, live provider support and Kafka implementation, operational interim SQL and an unfinished permanent extract, and independent NEXUS development and employer delivery. No credential or cloud-platform experience is inferred from a question or a job description.
