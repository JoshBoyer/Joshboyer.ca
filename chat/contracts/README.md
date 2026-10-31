# Chat contracts

Version: 1.0 | Date: 2026-10-31 | Status: Local contracts and validation; no hosted chat

These contracts define what the future chat service may accept and display. The model selects approved facts; the application supplies the actual words and their qualifications.

```text
Model selects claim IDs
         |
         v
Verified public corpus
         |
         v
Canonical text + qualifications + sources
```

**Canonical text** means the exact approved claim stored in the public evidence export. Attaching a valid citation to invented prose is not allowed. This prevents fabricated career wording; it does not prove that a selected fact answers the visitor's question. Relevance still needs the retrieval and model evaluation in later phases.

## Files and API

- `schema.json`: JSON Schema 2020-12 definitions. The contract version is `1.0.0`.
- `index.cjs`: strict Ajv validation, byte limits, canonical rendering and an in-memory stream validator. Ajv rejects invalid values without coercion, defaults or removing extra fields. See [Ajv schemas](https://ajv.js.org/json-schema.html) and [strict mode](https://ajv.js.org/strict-mode.html).
- `../knowledge/corpus.json`: trusted build artifact; never replace it with a client or model supplied object.

```javascript
const { assertValid, assertToolInput, renderAnswer } = require('./index.cjs');
const corpus = require('../knowledge/corpus.json');

assertValid('messageRequest', {
  schemaVersion: '1.0.0',
  requestId: '11111111-1111-4111-8111-111111111111',
  text: 'Tell me about the public portfolio.',
  pageContext: '#career'
});
assertToolInput('get_case_study', { projectId: 'nexus' });
const answer = renderAnswer({
  schemaVersion: '1.0.0',
  corpusVersion: corpus.corpusVersion,
  claimIds: [corpus.claims[0].id],
  noticeCodes: []
}, corpus);
```

`validate(name, value)` returns `{valid, errors}`; errors contain only structural paths and keywords. `assertValid` and `assertToolInput` return the unchanged value or throw `ContractError`. Error codes are `UNKNOWN_CONTRACT`, `UNKNOWN_TOOL`, `INVALID_CONTRACT`, `INVALID_CORPUS`, `CORPUS_MISMATCH`, `UNKNOWN_CLAIM` and `INVALID_STREAM`. Do not send raw exceptions or supplied values to visitors or logs.

`assertCorpusCompatible(corpus)` returns the unchanged corpus or throws `ContractError`. The export builder calls it after knowledge validation to check every claim and source against the consumer's stricter length, cardinality and allowlist constraints. A valid knowledge artifact must also be usable by the renderer; fail the build rather than discover an incompatible unselected claim during a visitor's request.

`renderAnswer(selection, corpus)` returns `{schemaVersion, corpusVersion, blocks, sources}`. The selection contains only claim IDs and closed notice codes. It cannot provide prose, URLs, qualifications or extra instructions. Claims keep every stored qualification; sources are projected to `{id, url, revision}`. Notice codes are `unsupported_evidence`, `limited_evidence`, `tools_unavailable` and `retrieval_degraded`.

The renderer checks the knowledge schema, content digests and claim/source relationships before use. **Technical note:** a content hash detects inconsistent artifacts; it does not establish authorship or approval. Trust comes from the approved export and controlled deployment path. Multiple source IDs may refer to the same public page; they are not independent corroboration.

## Public request and response definitions

| Route | Request definition | Response definition |
| --- | --- | --- |
| `GET /api/chat/config` | No body | `configResponse` |
| `POST /api/chat/session` | `emptyRequest` (`{}`) | `sessionResponse` |
| `POST /api/chat/messages` | `messageRequest` | `streamEvent` frames |
| `POST /api/chat/requests/{id}/cancel` | `cancelRequest` validates the path ID as `{requestId}`; empty body | `cancelResponse` |
| `DELETE /api/chat/session` | `emptyRequest` (`{}`) | `clearResponse` |

Session credentials belong in a Secure, HttpOnly, SameSite cookie. `sessionResponse.generation` is an opaque generation identifier used to reject late output after a clear; it is not a credential. `expiresAt` is Unix time in milliseconds. The backend must check expiry on every relevant operation.

Messages allow a UUID request ID, nonblank text and an optional page identifier from the closed allowlist. They cannot submit history, system messages, model choices, credentials, claims or tool results. Version 1 limits message/job text to **8,192 UTF-8 bytes** and search text to 1,024 bytes. The JavaScript wrapper enforces bytes in addition to the schema's character bound. Future HTTP handlers must also cap the complete request body before parsing.

`configResponse` exposes only availability, capability flags and bounded public limits. Voice is always false in this version. These definitions do not activate a route or capability.

## Stream contract and lifecycle

**Server-Sent Events (SSE)** deliver one-way updates. Each parsed frame has `schemaVersion`, `requestId`, `generation`, `seq`, `event` and `data`. Sequence numbers begin at 1 and increase by exactly 1. Event types are `status`, `tool_start`, `tool_end`, `answer_block`, `sources`, `done` and `error`.

`createEventValidator({requestId, generation, corpus})` returns `accept(event)`, `revoke()` and a read-only state snapshot. It verifies canonical blocks and source receipts as well as the event schema. Tool calls must pair correctly, stay inside the three-tool catalogue and not exceed four calls. Answer blocks follow completed tools, source receipts follow the complete answer, and successful completion requires the receipt. Cancellation or error may terminate an unfinished stream. Terminal and revoked streams reject every later frame. The in-memory state resets for each request; it is not a session or budget store.

The hosted implementation must still enforce:

1. **Idempotency** — repeating the same request must not create a second paid run. Bind the request ID to authenticated session identity and a canonical payload digest. An identical retry returns the existing result/state; the same ID with different text or page context is a conflict. A disconnected POST is not automatically replayed.
2. **Clear wins** — revoke the session generation and signal cancellation before deleting history. Reject subsequent writes and output for that generation. Retain the separate request/budget ledger until usage is reconciled, including unknown provider charges.
3. **Authority and limits** — verify the signed edge envelope, ownership, expiry, anti-replay state, request rates and spending reservations before inference. Schema validation alone does not authenticate or authorise a caller.
4. **Safe transport** — cap frame/body sizes before parsing, validate before display, render as text, and accept links only from verified source records. Do not stream raw model tokens as factual answers.

## Tool boundary

**Model Context Protocol (MCP)** gives the future backend a standard tool interface. Phase 1 defines only the argument contracts:

| Tool | Allowed arguments |
| --- | --- |
| `search_public_evidence` | Nonblank `query`, optional `limit` from 1–6 and optional `filters.facets` from the public facet catalogue |
| `get_case_study` | One active, allowlisted `projectId` |
| `compare_job_requirements` | Nonblank, bounded `jobText` |

No argument grants URL fetching, file access, arbitrary tool selection or cloud administration. Job text and retrieved passages remain untrusted data, even when the schema accepts them. The later MCP service must validate tool discovery, output schemas, workload authentication and deadlines; these local functions are not an MCP server.

## Verification scope

Run `node --test tests/chat-contracts.test.cjs` from the repository root. Tests exercise injection-shaped inputs, byte limits, canonical facts, corpus mismatch/tampering, event ordering, tool pairing and clear-generation rejection. They do not verify HTTP endpoints, persistent sessions, provider calls, actual MCP transport, billing or browser rendering.
