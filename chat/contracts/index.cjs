'use strict';

const Ajv2020 = require('ajv/dist/2020');
const { isDeepStrictEqual } = require('node:util');
const schema = require('./schema.json');
const { validateCorpus } = require('../knowledge/validate.cjs');

const SCHEMA_VERSION = '1.0.0';
const LIMITS = Object.freeze({
  maxMessageBytes: 8192,
  maxQueryBytes: 1024,
  maxTurns: 8,
  maxToolsPerTurn: 4,
  maxClaims: 8,
  maxNotices: 3,
  turnDeadlineMs: 60000
});
const NOTICE_TEXT = Object.freeze({
  unsupported_evidence: 'The approved public evidence does not establish that claim.',
  limited_evidence: 'This answer is limited to the approved public evidence and its stated qualifications.',
  tools_unavailable: 'The portfolio tools are unavailable. This answer uses only the approved context available for this request.',
  retrieval_degraded: 'Search is running with reduced capability. Relevant public evidence may be missing.'
});
const TOOL_NAMES = Object.freeze([...schema.$defs.toolName.enum]);
const PROJECT_IDS = Object.freeze([...schema.$defs.projectId.enum]);
const PAGE_CONTEXTS = Object.freeze([...schema.$defs.pageContext.enum]);
const FACETS = Object.freeze([...schema.$defs.facet.enum]);

const ajv = new Ajv2020({
  strict: true,
  allErrors: true,
  coerceTypes: false,
  useDefaults: false,
  removeAdditional: false,
  ownProperties: true
});
ajv.addSchema(schema);
const validators = new Map();

class ContractError extends Error {
  constructor(code, message, errors = []) {
    super(message);
    this.name = 'ContractError';
    this.code = code;
    this.errors = errors;
  }
}

function validatorFor(name) {
  if (!Object.hasOwn(schema.$defs, name)) {
    throw new ContractError('UNKNOWN_CONTRACT', 'Unknown chat contract.');
  }
  if (!validators.has(name)) {
    validators.set(name, ajv.getSchema(`${schema.$id}#/$defs/${name}`));
  }
  return validators.get(name);
}

function validate(name, value) {
  const validator = validatorFor(name);
  const validShape = validator(value);
  // Error details are structural only; never echo visitor text or supplied credentials.
  const errors = validShape ? [] : validator.errors.map(error => ({
    path: error.instancePath,
    keyword: error.keyword
  }));
  const textLimits = {
    messageRequest: ['text', LIMITS.maxMessageBytes],
    search_public_evidence: ['query', LIMITS.maxQueryBytes],
    compare_job_requirements: ['jobText', LIMITS.maxMessageBytes]
  };
  const textLimit = textLimits[name];
  if (textLimit && typeof value?.[textLimit[0]] === 'string' &&
      Buffer.byteLength(value[textLimit[0]], 'utf8') > textLimit[1]) {
    errors.push({ path: `/${textLimit[0]}`, keyword: 'maxUtf8Bytes' });
  }
  return { valid: errors.length === 0, errors };
}

function assertValid(name, value) {
  const result = validate(name, value);
  if (!result.valid) {
    throw new ContractError('INVALID_CONTRACT', 'Chat value does not match its contract.', result.errors);
  }
  return value;
}

function assertToolInput(name, value) {
  if (!TOOL_NAMES.includes(name)) {
    throw new ContractError('UNKNOWN_TOOL', 'Tool is not in the portfolio catalogue.');
  }
  return assertValid(name, value);
}

function indexCorpus(corpus) {
  try {
    validateCorpus(corpus);
  } catch {
    throw new ContractError('INVALID_CORPUS', 'The approved corpus failed integrity validation.');
  }
  if (!corpus || corpus.schemaVersion !== SCHEMA_VERSION ||
      !validate('corpusVersion', corpus.corpusVersion).valid ||
      !Array.isArray(corpus.claims) || corpus.claims.length > 512 ||
      !Array.isArray(corpus.sources) || corpus.sources.length > 128) {
    throw new ContractError('INVALID_CORPUS', 'The approved corpus has an invalid shape.');
  }
  const sources = new Map();
  for (const source of corpus.sources) {
    const publicSource = { id: source?.id, url: source?.url, revision: source?.revision };
    assertValid('source', publicSource);
    if (sources.has(publicSource.id)) {
      throw new ContractError('INVALID_CORPUS', 'Duplicate source identifier in corpus.');
    }
    sources.set(publicSource.id, publicSource);
  }
  const claims = new Map();
  for (const claim of corpus.claims) {
    assertValid('claimRecord', claim);
    if (claims.has(claim.id) || claim.id !== `claim-${claim.chunkId}` ||
        claim.sourceIds.some(id => !sources.has(id))) {
      throw new ContractError('INVALID_CORPUS', 'Corpus claim has duplicate or unresolved identifiers.');
    }
    claims.set(claim.id, {
      kind: 'claim',
      claimId: claim.id,
      title: claim.title,
      period: claim.period,
      text: claim.text,
      qualificationNotes: [...claim.qualificationNotes],
      sourceIds: [...claim.sourceIds]
    });
  }
  return { corpusVersion: corpus.corpusVersion, claims, sources };
}

function noticeBlock(code) {
  return { kind: 'notice', code, text: NOTICE_TEXT[code] };
}

function assertCorpusCompatible(corpus) {
  indexCorpus(corpus);
  return corpus;
}

function renderAnswer(selection, corpus) {
  assertValid('answerSelection', selection);
  const indexed = indexCorpus(corpus);
  if (selection.corpusVersion !== indexed.corpusVersion) {
    throw new ContractError('CORPUS_MISMATCH', 'Answer and evidence versions do not match.');
  }
  const blocks = [];
  const sourceIds = new Set();
  for (const id of selection.claimIds) {
    const block = indexed.claims.get(id);
    if (!block) throw new ContractError('UNKNOWN_CLAIM', 'Answer selected an unapproved claim.');
    blocks.push(block);
    block.sourceIds.forEach(sourceId => sourceIds.add(sourceId));
  }
  blocks.push(...selection.noticeCodes.map(noticeBlock));
  const answer = {
    schemaVersion: SCHEMA_VERSION,
    corpusVersion: indexed.corpusVersion,
    blocks,
    sources: [...sourceIds].map(id => indexed.sources.get(id))
  };
  return assertValid('renderedAnswer', answer);
}

function streamError(message) {
  throw new ContractError('INVALID_STREAM', message);
}

function createEventValidator({ requestId, generation, corpus }) {
  assertValid('uuid', requestId);
  assertValid('uuid', generation);
  // Snapshot canonical fields so later mutation of the caller's object cannot change a stream.
  const indexed = indexCorpus(corpus);
  let nextSequence = 1;
  let terminal = false;
  let revoked = false;
  let receiptSent = false;
  let answerStarted = false;
  const toolCalls = new Map();
  const pendingTools = new Set();
  const claimIds = new Set();
  const noticeCodes = new Set();
  const sourceIds = new Set();
  const traceStages = new Map();
  let traceCount = 0;
  let lastTraceTime = 0;

  function accept(event) {
    assertValid('streamEvent', event);
    if (revoked || terminal) streamError('Stream is closed or revoked.');
    if (event.requestId !== requestId || event.generation !== generation) {
      streamError('Event belongs to a different request or session generation.');
    }
    if (event.seq !== nextSequence) streamError('Event sequence is not contiguous.');
    const data = event.data;

    // Commit state only after the event is fully checked, allowing a caller to reject bad frames.
    switch (event.event) {
      case 'trace': {
        if (answerStarted || receiptSent || traceCount >= 24 ||
            (data.elapsedMs !== null && data.elapsedMs < lastTraceTime) ||
            (data.durationMs !== undefined && data.elapsedMs !== null && data.durationMs > data.elapsedMs) ||
            (data.chargedMicros !== undefined && data.reservedMicros !== undefined && data.chargedMicros > data.reservedMicros) ||
            (data.provider === 'openai' && data.model !== 'gpt-6-luna') ||
            (data.provider === 'anthropic' && data.model !== 'claude-haiku-5-5')) {
          streamError('Trace is late, oversized or has invalid timing.');
        }
        const key = ['provider', 'validation'].includes(data.stage) ? `${data.stage}-${data.attempt ?? 1}` : data.stage;
        const previous = traceStages.get(key);
        if (previous && previous !== 'started' || previous === 'started' && data.state === 'started' ||
            !previous && ['provider', 'validation'].includes(data.stage) && data.state !== 'started') {
          streamError('Trace stage transition is invalid.');
        }
        if (data.elapsedMs !== null) lastTraceTime = data.elapsedMs;
        traceStages.set(key, data.state);
        traceCount += 1;
        break;
      }
      case 'status':
        if (answerStarted || receiptSent) streamError('Progress cannot follow answer output.');
        break;
      case 'tool_start':
        if (answerStarted || receiptSent || toolCalls.has(data.toolCallId) ||
            toolCalls.size >= LIMITS.maxToolsPerTurn) {
          streamError('Tool start is duplicate, late or over the per-turn limit.');
        }
        toolCalls.set(data.toolCallId, data.name);
        pendingTools.add(data.toolCallId);
        break;
      case 'tool_end':
        if (!pendingTools.has(data.toolCallId) || toolCalls.get(data.toolCallId) !== data.name) {
          streamError('Tool end does not match a pending tool call.');
        }
        pendingTools.delete(data.toolCallId);
        break;
      case 'answer_block': {
        if (receiptSent || pendingTools.size || [...traceStages.values()].includes('started')) streamError('Answer is late or a tool or trace stage is still pending.');
        const canonical = data.kind === 'claim' ? indexed.claims.get(data.claimId) : noticeBlock(data.code);
        if (!canonical || !isDeepStrictEqual(canonical, data)) {
          streamError('Answer block does not match approved canonical text.');
        }
        if (data.kind === 'claim') {
          if (claimIds.has(data.claimId) || claimIds.size >= LIMITS.maxClaims) {
            streamError('Claim is duplicated or over the answer limit.');
          }
          claimIds.add(data.claimId);
          data.sourceIds.forEach(id => sourceIds.add(id));
        } else {
          if (noticeCodes.has(data.code) || noticeCodes.size >= LIMITS.maxNotices) {
            streamError('Notice is duplicated or over the answer limit.');
          }
          noticeCodes.add(data.code);
        }
        answerStarted = true;
        break;
      }
      case 'sources': {
        const canonical = [...sourceIds].map(id => indexed.sources.get(id));
        if (!answerStarted || receiptSent || data.corpusVersion !== indexed.corpusVersion ||
            !isDeepStrictEqual(data.sources, canonical)) {
          streamError('Source receipt does not match this answer and corpus.');
        }
        receiptSent = true;
        break;
      }
      case 'done':
        if (data.outcome !== 'cancelled' && (!answerStarted || !receiptSent || pendingTools.size || [...traceStages.values()].includes('started'))) {
          streamError('Completed answer is missing blocks, a source receipt or tool completion.');
        }
        terminal = true;
        break;
      case 'error':
        terminal = true;
        break;
      default:
        streamError('Unsupported event.');
    }
    nextSequence += 1;
    return true;
  }

  return Object.freeze({
    accept,
    revoke() { revoked = true; },
    get state() { return { nextSequence, terminal, revoked }; }
  });
}

module.exports = {
  SCHEMA_VERSION,
  LIMITS,
  NOTICE_TEXT,
  TOOL_NAMES,
  PROJECT_IDS,
  PAGE_CONTEXTS,
  FACETS,
  ContractError,
  validate,
  assertValid,
  assertToolInput,
  assertCorpusCompatible,
  renderAnswer,
  createEventValidator
};
