# Chat contracts

Version: 1.2 | Date: 2026-10-31 | Status: Private conversational replies and separate evidence

These contracts separate a model-written conversational reply from its supporting portfolio evidence. General-purpose discussion is allowed; facts about Josh should use the approved context. The application supplies exact canonical evidence and source links for the side panel.

```text
Model writes reply + selects claim IDs
             |
       +-----+------+
       v            v
  Chat reply    Evidence panel
                Canonical facts
```

**Canonical text** means the exact approved claim stored in the public evidence export. This guarantee applies to the evidence panel. The conversational reply is generated prose: schema validation and valid evidence identifiers do not prove its factual accuracy or relevance. Prompts, bounded output and evaluation reduce that risk; they do not turn generated prose into verified evidence.

`conversationSelection` accepts a bounded reply kind, text, suggested follow-ups and evidence identifiers. `conversationData` is the text-only browser projection. General replies without portfolio references receive a canonical `general_knowledge` notice explaining that no live sources were retrieved. Unsupported portfolio questions must include the `unsupported_evidence` notice.

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

`renderAnswer(selection, corpus)` returns `{schemaVersion, corpusVersion, blocks, sources}` for the evidence panel. This selection contains only claim IDs and closed notice codes. It cannot provide prose, URLs, qualifications or extra instructions. Claims keep every stored qualification; sources are projected to `{id, url, revision}`. Notice codes are `unsupported_evidence`, `limited_evidence`, `tools_unavailable`, `retrieval_degraded` and `general_knowledge`.

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

**Server-Sent Events (SSE)** deliver one-way updates. Each parsed frame has `schemaVersion`, `requestId`, `generation`, `seq`, `event` and `data`. Sequence numbers begin at 1 and increase by exactly 1. Event types are `status`, `trace`, `conversation`, `tool_start`, `tool_end`, `answer_block`, `sources`, `done` and `error`.

The optional `conversation` frame appears once, after completed trace/tool stages and before evidence. Its text is capped at 6,000 UTF-8 bytes; at most three suggestions are allowed, each capped at 200 bytes. The browser renders these as text. Canonical blocks, source links and trace metadata are rendered only in the request details panel. Older saved responses without a conversation frame remain readable.

`trace` is an additive private-client extension to the `1.0.0` wire contract. Deploy the updated client before the producer; older saved answers without trace data remain valid. A trace records actual application stages: approved context, budget reservation, provider attempts, answer validation and settlement. Each point has a closed stage/state, bounded relative timing and optional allowlisted usage/accounting identifiers. No prompt text, headers, credentials, arbitrary URLs or private reasoning are permitted. The Gateway/provider duration is one observed HTTP round trip; internal timings are not inferred.

At most 24 trace points may precede the answer. Numeric elapsed times must be monotonic, stage starts and outcomes must pair, and validation is tracked separately for each provider attempt. A completed settlement is emitted only after its durable commit. Replays use the saved original trace and accounting receipt; an unrecorded settlement time is `null` with `replayed: true`, rather than a fabricated duration.

`createEventValidator({requestId, generation, corpus})` returns `accept(event)`, `revoke()` and a read-only state snapshot. It verifies canonical blocks and source receipts as well as the event schema. Tool calls must pair correctly, stay inside the three-tool catalogue and not exceed four calls. Answer blocks follow completed tools, source receipts follow the complete answer, and successful completion requires the receipt. Cancellation or error may terminate an unfinished stream. Terminal and revoked streams reject every later frame. The in-memory state resets for each request; it is not a session or budget store.

The hosted implementation must still enforce:

1. **Idempotency** — repeating the same request must not create a second paid run. Bind the request ID to authenticated session identity and a canonical payload digest. An identical retry returns the existing result/state; the same ID with different text or page context is a conflict. A disconnected POST is not automatically replayed.
2. **Clear wins** — revoke the session generation and signal cancellation before deleting history. Reject subsequent writes and output for that generation. Generated replies live only in the expiring session history and are removed on clear; the separate request ledger keeps canonical evidence, accounting metadata and a result digest, not the generated reply. Authorised retries recover the reply from live session history.
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
