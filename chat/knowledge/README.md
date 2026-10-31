# Approved chat knowledge

Version: 1.0 | Date: 2026-10-31 | Status: Local export and validation

The chat assistant gets a prepared evidence pack, like a folder of approved quotations. It cannot expand that folder by following links. This directory is outside the website's public root.

`corpus.json` holds the approved material for **Retrieval-Augmented Generation (RAG)**: finding relevant evidence before answering. `cag-context.json` is a smaller, stable pack for **Cache-Augmented Generation (CAG)**. `chunks-manifest.json` prepares the 14 active canonical chunks and 13 project case studies with deterministic `indexVersion` (`idx-<hash16>`), pinned embedding configuration (`text-embedding-3-small`, `1536` dimensions), explicit `deliveryStatus`, bounded qualification-preserving `embeddingText` (`<= 4,096` UTF-8 bytes), and normalized `lexicalTokens` for S3/S3 Vectors ingestion, hybrid retrieval and read-only MCP tools. This build step prepares the deterministic artifacts; it does not call a model, create embeddings, populate a search index or establish a provider cache hit.

```text
Approved public JSON
        |
        v
Validated export
  |        |             |
  v        v             v
Corpus   CAG pack   Chunks manifest
```

Run `node tools/build-chat-knowledge.cjs` to regenerate all three files. Run the same command with `--check` to reject missing or stale output without changing it. The CLI accepts no input/output path overrides. The optional `root` argument on the exported JavaScript functions exists for isolated build tests, not visitor input.

## Evidence boundary

The sole content input is `dist/career-evidence.v3.json`. The builder reads `dist/index.html` only to verify that every referenced project template exists; it does not extract its prose. Private `knowledge/`, the historical career corpus, linked documents, earlier datasets, résumé layout definitions and arbitrary extra fields are excluded.

Only chunks with `active === true` are exported. Each produces one **canonical claim**: the exact approved `resumeText`, title and period, attached to its chunk's sources and the combined chunk/role qualifications. The retrieval record also retains its decision, process, technical guidance and outcome. Both preserve the qualifications. Tags and qualification aliases are matching hints, never proof of proficiency.

Referenced roles and sources are retained; unused sources are omitted. Inactive qualifications are omitted. The independent-role description still explains that LOWKEY is archived, but its inactive evidence chunk and source are not exported. Provider integration has two evidence records pointing to one public case: these are not independent corroboration or two separate deliveries.

Publication eligibility does not mean production delivery. `chunks-manifest.json` derives an explicit canonical `deliveryStatus` (`production`, `implemented_supported`, `approved_design_interim`, `independent_capstone`, `historical_personal`) from the approved chunk and qualifications while keeping `corpus.json` and `cag-context.json` unchanged. Preserve the source's distinction between live interim reporting, approved design and the unconfirmed permanent extract. The current reusable JSON deliberately omits numerical renewal rates; adding them requires a reviewed change to that approved input.

## Version and integrity

`schema.json` defines strict artifact shapes. `validate.cjs` also checks references, qualifications, claim-to-chunk equality, policy equality and content digests. The builder additionally runs the chat consumer's corpus check, so a record outside the smaller CAG pack cannot bypass message limits or the public-project allowlist. A **SHA-256 digest** is a fingerprint: a changed value gives a different fingerprint. It detects drift; it is not a digital signature or evidence of editorial approval.

The corpus version fingerprints the entire selected payload, extraction policy fingerprint and provenance, including the exact input-file bytes. Whitespace changes in the input therefore require regeneration even if `datasetVersion` was not changed. No build time is inserted. Every chunk has its own content fingerprint; the CAG pack has one too and must exactly match its prescribed subset of the same corpus version.

`policy.json` pins the CAG selection and inference boundaries. It caps the serialised CAG pack at 24,000 UTF-8 bytes; this is a byte limit, not a token count. A future model adapter must still measure its model's actual token budget.

Output files are individually replaced after validation. A filesystem failure between replacements can leave a mismatched pair, which `--check` rejects. Deployment must use only a fully validated pair; atomic hosted version publication belongs to the later ingestion phase.

The runtime must treat these files as trusted build artifacts, never accept a visitor-supplied corpus, and still render them as text. Source approval comes from review of the allowlisted input in version control. Digest verification cannot turn maliciously rewritten source content into approved evidence.
