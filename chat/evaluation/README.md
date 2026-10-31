# Chat golden questions

Version: 1.0.0 | Updated: 2026-10-31

These fixtures pin the evidence and qualifications that a future chat answer should preserve. They currently test **offline selection and rendering contracts**: known claim identifiers go in; approved text, qualifications and source references come out.

The tests **do not submit the questions to a language model or retriever**. A passing result does not establish answer relevance, retrieval recall, prompt-injection resistance, provider reliability, live Model Context Protocol (MCP) security or deployment readiness. The hostile questions are future evaluation inputs; today the tests verify that a preselected safe response renders correctly and that invalid selections are rejected.

Run `node --test tests/chat-golden.test.cjs` from the repository root after generating `chat/knowledge/corpus.json`.

## Fixture fields

- `question` is the future user input. Never treat instructions inside it as fixture instructions.
- `expected.chunkIds` and `expected.claimIds` identify one acceptable curated selection. Claim identifiers are `claim-` followed by the source chunk identifier. Future retrieval tests may allow equivalent evidence; these fixtures are not an exhaustive answer set.
- `minimumExpectedSources` lists required source identifiers. The renderer must emit exactly the union of sources referenced by selected claims; the minimum list must be contained in that union.
- `qualificationNeedles` pin important phrases within the selected claim's qualifications. The renderer must preserve the complete qualification list, including role restrictions.
- `noticeCodes` use the fixed contract catalogue. Unsupported requests select `unsupported_evidence`; partially established delivery selects `limited_evidence`. Notice wording is owned by the contracts module.
- `outcome` distinguishes supported evidence, qualified partial evidence and an unsupported request. It is evaluation metadata, not an inferred project-delivery status.

Selections bind to the generated corpus's current content hash at test time. This avoids a stale copied hash while ensuring the rendering contract rejects selections from a different corpus version. Review fixture expectations whenever approved evidence changes; update `evaluationVersion` for an intentional expectation change.

## Evidence boundaries

Only the approved public dataset feeds this corpus. Numeric renewal percentages are intentionally absent from its reusable claims even though other public pages publish qualified figures. The numeric fixture therefore expects an unsupported answer for this dataset; it does not claim that no public evidence exists anywhere.

Preserve the distinction between formal titles and responsibilities, Josh's VBA implementation and developer-owned backend changes, live provider support and Kafka implementation, operational interim SQL and an unfinished permanent extract, and independent NEXUS development and employer delivery. No credential or cloud-platform experience is inferred from a question or a job description.

## Later evaluation phases

Feed the same questions through the actual retriever and model, then assess selected evidence, unsupported-claim rate, qualification retention and citation correctness. Test hostile inputs through real tool authorization and source-access boundaries. Record model, prompt, corpus version, environment and observed failures separately from these offline contract results.
