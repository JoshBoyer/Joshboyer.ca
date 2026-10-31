# Chat foundation

Version: 1.0 | Date: 2026-10-31 | Scope: local Phase 1

This is the foundation for a source-backed portfolio assistant. It defines what chat can accept and say, and prepares approved evidence for later retrieval. It does not start a server, contact an AI provider, deploy infrastructure or enable website chat.

Think of it as a checked reference shelf plus a strict order form. The model will select approved claims; the application will render the actual claim text and its qualifications.

```text
Approved public JSON
         |
         v
Deterministic export + integrity checks
         |
         +--> Canonical claims / RAG chunks
         +--> Versioned CAG context
                    |
Model selects IDs -> validated claim blocks
```

**Retrieval-Augmented Generation (RAG)** finds evidence relevant to a question. These artifacts prepare its inputs; semantic search is not implemented yet. **Cache-Augmented Generation (CAG)** supplies a stable context pack; provider caching is not implemented yet. **Model Context Protocol (MCP)** gives the later backend a standard tool interface; Phase 1 defines the three allowed tool inputs, without exposing or executing a tool server.

## Use and verify

Run commands from the repository root:

```powershell
npm run build:chat-knowledge
npm run check:chat-knowledge
npm test
npm run lint
npm run build
```

The export reads only `dist/career-evidence.v3.json` as evidence. It checks public project anchors against `dist/index.html` without importing HTML content. Regeneration writes fixed paths under `chat/knowledge/`; the ordinary build only checks freshness. No API keys or cloud access are needed.

| Area | Purpose |
| --- | --- |
| [Contracts](contracts/README.md) | Strict request, stream, model selection and tool schemas; deterministic answer rendering |
| `knowledge/` | Checked-in corpus, CAG context, provenance and artifact validation |
| [Evaluation](evaluation/README.md) | Golden questions and offline evidence/contract regressions |
| `../tools/build-chat-knowledge.cjs` | Fixed-source exporter and freshness check |

## Evidence and authority

- Canonical career claims preserve approved text. Rendering attaches both claim and role qualifications; a real source ID cannot validate invented prose.
- `active` means eligible for publication, not deployed or live. Delivery boundaries remain in the original periods, outcomes and qualifications.
- Source URLs identify public portfolio accounts, not independent corroboration. Two chunks linking to the same case study do not establish two delivered systems.
- The public JSON deliberately omits numeric renewal rates. Those questions remain unsupported here even though other approved website content includes rates. Adding knowledge requires a reviewed source update followed by regeneration.
- Private `knowledge/`, raw career documents, credentials and the administrative AWS toolkit are excluded. Nothing under `chat/` enters the public manifest.
- The artifact version binds selected content and export policy. Raw input hashes detect source changes, including changes that leave selected content unchanged. CAG and RAG must use the same corpus version.

**Technical note:** Schemas validate structure, not authority. Later services must still authenticate sessions and MCP workloads, enforce budgets and cancellation, validate tool results, and reject stale corpus versions. Treat user text and retrieved content as data, never permission to call an administrative tool.

## Integration ahead

Continue with Phase 2 of the [implementation plan](../docs/architecture/chat-implementation-plan.md): reviewable AWS infrastructure and the authenticated Cloudflare AI Gateway provider path. Follow with sessions and budgets, real retrieval/MCP execution, then the website interface. Provider, cloud, browser-chat and billing behaviour still require deployed qualification. Voice remains deferred.

## Verification record — 2026-10-31

- `npm test`: 196 passed, including the original 136 and 60 new contract, knowledge, evaluation and publication-boundary tests. No failures or skips.
- `npm run build`: passed syntax checks for 66 JavaScript files, security checks for 70 runtime text files, artifact freshness and the existing 348-file public allowlist. The public manifest and deployed runtime files did not change.
- `npm run lint`: zero errors; 53 existing warnings outside the new chat implementation.
- `npm audit --omit=dev`: zero findings. The full audit reports the same five moderate ESLint/minimatch dependency findings as an audit of the baseline lockfile; no automatic dependency downgrade was applied.
- A separate review identified mismatched export/renderer bounds. The exporter now enforces consumer compatibility for the entire corpus, including non-CAG claims, with regression coverage.

These results qualify the local foundation. They do not establish hosted chat, model quality, live retrieval, MCP authentication, provider billing or voice functionality.

JSON Schema validation uses pinned Ajv in [strict mode](https://ajv.js.org/strict-mode.html), with no input coercion or silent removal of unknown fields.
