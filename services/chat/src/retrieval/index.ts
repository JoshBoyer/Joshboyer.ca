import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { types } from 'node:util';

import {
  embeddingUsageAllowance,
  MAX_EMBEDDING_RESERVATION_MICROS,
} from '../budget-policy.js';
import {
  callEmbedding,
  type EmbeddingResult,
} from '../chat-provider.js';
import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODELS,
  MODELS,
  type Config,
  type Provider,
} from '../config.js';
import { ServiceError } from '../errors.js';
import {
  ACTIVE_POINTER_KEY,
  DEFAULT_VECTOR_BUCKET_NAME,
  DEFAULT_VECTOR_INDEX_NAME,
  EXPECTED_CHUNK_COUNT,
  INDEX_VERSION_PATTERN,
  PINNED_EMBEDDING_MODEL,
  S3ObjectStore,
  S3VectorsStore,
  type ActiveIndexPointer,
  type KnowledgeChunkManifestEntry,
  type KnowledgeChunksManifest,
} from '../ingestion/index.js';
import type { Fetch } from '../provider.js';

const requireFromHere = createRequire(path.resolve(__dirname, '../../package.json'));

const { canonicalJson, digest } = requireFromHere(
  '../../chat/knowledge/validate.cjs',
) as {
  canonicalJson(value: unknown): string;
  digest(value: unknown): string;
};

const defaultCorpus = requireFromHere('../../chat/knowledge/corpus.json') as Record<
  string,
  unknown
>;
const defaultPolicy = requireFromHere('../../chat/knowledge/policy.json') as Record<
  string,
  unknown
>;
const defaultChunksManifest = requireFromHere(
  '../../chat/knowledge/chunks-manifest.json',
) as KnowledgeChunksManifest;

export const DEFAULT_RETRIEVAL_TOP_K = 4;
export const MIN_RETRIEVAL_TOP_K = 1;
export const MAX_RETRIEVAL_TOP_K = 6;
export const DEFAULT_ACTIVE_POINTER_CACHE_TTL_MS = 60_000;
export const MAX_PROMPT_CONTEXT_CHARS = 8_000;
export const MAX_NORMALIZED_QUERY_BYTES = 1_024;

export const QUALIFICATION_BOUNDARY_IDS = Object.freeze([
  'ev-medavie-integration',
  'ev-grenville-Portals',
  'ev-takeover-tooling',
  'ev-reporting-continuity',
  'ev-career-timeline',
  'ev-nexus-capstone',
] as const);

export type QualificationBoundaryId = (typeof QUALIFICATION_BOUNDARY_IDS)[number];

export type RetrievalMode =
  | 'cag'
  | 'cag+rag'
  | 'cag+mcp'
  | 'cag+rag+mcp'
  | 'degraded';

export type TraceRetrievalMode =
  | 'hybrid'
  | 'deterministic_only'
  | 'cag_only'
  | 'degraded'
  | 'skipped';

export type DegradedReasonCode = 'RAG_UNAVAILABLE' | 'MODEL_DEGRADED';

export type RetrievalErrorCode =
  | 'INVALID_TOP_K'
  | 'RETRIEVAL_MANIFEST_TAMPERED'
  | 'RETRIEVAL_CHUNK_DIGEST_MISMATCH'
  | 'RETRIEVAL_UNAPPROVED_SOURCE_PATH'
  | 'RETRIEVAL_UNKNOWN_EVIDENCE_ID'
  | 'RETRIEVAL_INACTIVE_CHUNK'
  | 'RETRIEVAL_INDEX_VERSION_MISMATCH';

export class RetrievalIntegrityError extends Error {
  readonly code: RetrievalErrorCode;

  constructor(code: RetrievalErrorCode, message: string) {
    super(message);
    this.name = 'RetrievalIntegrityError';
    this.code = code;
  }
}

export class RetrievalBoundsError extends Error {
  readonly code = 'INVALID_TOP_K' as const;

  constructor(message: string) {
    super(message);
    this.name = 'RetrievalBoundsError';
  }
}

export interface RetrievedChunk {
  id: string;
  chunkId: string;
  claimId: string;
  evidenceId: QualificationBoundaryId;
  title: string;
  section: string;
  period: string;
  text: string;
  resumeText: string;
  decision: string;
  outcome: string;
  technicalGuidance: string;
  sourcePath: string;
  sourceAnchor: string;
  sourceTier: string;
  sourceLabel: string;
  sourceIds: string[];
  sourceUrls: string[];
  deliveryStatus: string;
  qualificationNote: string;
  qualificationNotes: string[];
  projectId: string;
  roleId: string;
  tags: string[];
  contentSha256: string;
  semanticScore: number;
  lexicalScore: number;
  qualificationBoost: number;
  combinedScore: number;
  matchedQualifications: QualificationBoundaryId[];
}

export interface RetrievalCitation {
  evidenceId: QualificationBoundaryId;
  chunkId: string;
  claimId: string;
  title: string;
  section: string;
  sourcePath: string;
  sourceAnchor: string;
  sourceTier: string;
  sourceLabel: string;
  sourceIds: string[];
  sourceUrls: string[];
  deliveryStatus: string;
  qualificationNote: string;
  contentSha256: string;
  score: number;
}

export interface RetrievalEmbeddingUsage {
  status: 'known' | 'unknown' | 'not_attempted';
  dispatched: boolean;
  inputTokens: number;
  outputTokens: 0;
  totalTokens: number;
  estimatedCostMicros: number;
  model: string;
  providerRequestId?: string;
  gatewayRequestId?: string;
}

export interface RetrievalTraceDetail {
  stage: 'retrieval';
  state: 'completed';
  elapsedMs: number;
  retrievalMode: TraceRetrievalMode;
  matchedCount: number;
  corpusVersion: string;
  indexVersion: string;
  embeddingModel: string;
  durationMs: number;
}

export interface RetrievalResult {
  mode: RetrievalMode;
  retrievalMode: TraceRetrievalMode;
  degraded: boolean;
  degradedReasonCode?: DegradedReasonCode;
  corpusVersion: string;
  indexVersion: string;
  chunkCount: number;
  topK: number;
  chunks: RetrievedChunk[];
  citations: RetrievalCitation[];
  matchedQualifications: QualificationBoundaryId[];
  promptContext: string;
  embeddingAttempted: boolean;
  embeddingUsage: RetrievalEmbeddingUsage;
  pointerCacheHit: boolean;
  rejectedVectorCount: number;
  traceDetail: RetrievalTraceDetail;
}

export interface RetrievalProviderConfig {
  gatewayAccountId: string;
  gatewayId: string;
  embeddingModel?: string;
  models?: Record<Provider, string>;
}

export interface RetrievalEngineOptions {
  s3Store?: S3ObjectStore;
  vectorsStore?: S3VectorsStore;
  bucketName?: string;
  vectorBucketName?: string;
  vectorIndexName?: string;
  pointerKey?: string;
  providerConfig?: RetrievalProviderConfig | Config;
  apiKey?: string;
  gatewayToken?: string;
  fetchImpl?: Fetch;
  embedQueryFn?: (
    input: string,
    signal?: AbortSignal,
  ) => Promise<EmbeddingResult>;
  manifestPath?: string;
  corpusPath?: string;
  policyPath?: string;
  manifest?: unknown;
  corpus?: unknown;
  policy?: unknown;
  cacheTtlMs?: number;
  now?: () => number;
  strictPointerVersion?: boolean;
}

export interface RetrieveEvidenceInput {
  query: unknown;
  topK?: unknown;
  bypassPointerCache?: boolean;
  mcpActive?: boolean;
  strictPointerVersion?: boolean;
  signal?: AbortSignal;
}

export interface RetrievalEngine {
  retrieve(input: RetrieveEvidenceInput): Promise<RetrievalResult>;
  invalidatePointerCache(): void;
}

const APPROVED_SOURCE_PATHS = new Set<string>([
  'dist/career-evidence.v3.json',
  'AGENTS.md',
  'CLAUDE.md',
  'dist/index.html',
]);

const APPROVED_EVIDENCE_ID_SET = new Set<string>(QUALIFICATION_BOUNDARY_IDS);

const CANONICAL_CHUNK_KEYS = new Set<string>([
  'id',
  'claimId',
  'kind',
  'projectId',
  'roleId',
  'title',
  'period',
  'confidence',
  'tags',
  'deliveryStatus',
  'decision',
  'process',
  'technicalGuidance',
  'outcome',
  'resumeText',
  'qualificationNotes',
  'sourceIds',
  'sourceUrls',
  'embeddingText',
  'lexicalTokens',
  'contentSha256',
]);

const CHUNK_TO_EVIDENCE_ID: Readonly<Record<string, QualificationBoundaryId>> =
  Object.freeze({
    'experience-claims': 'ev-medavie-integration',
    'experience-provider-sync-review': 'ev-medavie-integration',
    'experience-renewals': 'ev-grenville-Portals',
    'experience-inquiry': 'ev-grenville-Portals',
    'experience-newbusiness': 'ev-grenville-Portals',
    'experience-upload': 'ev-grenville-Portals',
    'experience-workflows': 'ev-grenville-Portals',
    'experience-takeover': 'ev-takeover-tooling',
    'experience-continuity': 'ev-reporting-continuity',
    'experience-sql': 'ev-reporting-continuity',
    'experience-dell': 'ev-career-timeline',
    'experience-foundations': 'ev-career-timeline',
    'experience-headquarters': 'ev-career-timeline',
    'experience-nexus': 'ev-nexus-capstone',
  });

const BOUNDARY_CANONICAL_QUALIFICATION: Readonly<
  Record<QualificationBoundaryId, string>
> = Object.freeze({
  'ev-medavie-integration':
    "Medavie provider integration includes solution review, mapping and synchronization requirements, followed by support of implemented/live integrations by Josh's account. Its scheduled event table and REST consumer do not establish Kafka or real-time broker implementation.",
  'ev-grenville-Portals':
    'Corrected renewal automation: approximately 80% residential and 40% farm/agri; Josh reconfirmed commercial renewal automation at 60% on October 30, 2026 (superseding the earlier reconfirmation caveat). All are user-reported and renewal-only.',
  'ev-takeover-tooling':
    'Takeover tooling is production/team-adopted. Josh researched and documented the solution, guided receiving-system changes with developers, and personally designed and built the production Excel VBA add-in for validation, XML batches and error reconciliation.',
  'ev-reporting-continuity':
    'Reporting continuity has approved analysis/design and operational interim SQL; the permanent compatibility extract is not confirmed live. Corrected financial-report SQL was adopted by the payment team in its existing pipeline. Modernization remains proposed.',
  'ev-career-timeline':
    'Historical responsibilities do not create a formal Architect job title. Dell starts September 2006. Grenville tenure is 2009–2022; its formal analyst transition is unresolved between 2014 and 2016.',
  'ev-nexus-capstone':
    'NEXUS is the current independent capstone. LOWKEY and Workshop42 remain historical/personal evidence.',
});

interface BoundaryRuleSpec {
  id: QualificationBoundaryId;
  patterns: readonly RegExp[];
  primaryChunkIds: readonly string[];
  secondaryChunkIds: readonly string[];
}

const BOUNDARY_RULES: readonly BoundaryRuleSpec[] = Object.freeze([
  {
    id: 'ev-medavie-integration',
    patterns: [
      /\bkafka\b/i,
      /\brabbitmq\b/i,
      /\bmessage[- ]broker\b/i,
      /\breal[- ]?time\b/i,
      /\bevent[- ]table\b/i,
      /\bscheduled event\b/i,
      /\brest consumer\b/i,
      /\bprovider (?:integration|sync|synchronization|registry|data)\b/i,
      /\bclaims adjudication\b/i,
    ],
    primaryChunkIds: ['experience-provider-sync-review', 'experience-claims'],
    secondaryChunkIds: [],
  },
  {
    id: 'ev-grenville-Portals',
    patterns: [
      /\brenewal(?:s)?\b/i,
      /\b80%\b/,
      /\b40%\b/,
      /\b60%\b/,
      /\bresidential\b/i,
      /\bfarm(?:\/agri)?\b/i,
      /\boctober 30\b/i,
      /\breconfirmed\b/i,
      /\brenewal-only\b/i,
    ],
    primaryChunkIds: ['experience-renewals'],
    secondaryChunkIds: [
      'experience-workflows',
      'experience-newbusiness',
      'experience-inquiry',
      'experience-upload',
    ],
  },
  {
    id: 'ev-takeover-tooling',
    patterns: [
      /\btakeover\b/i,
      /\bvba\b/i,
      /\bexcel\b/i,
      /\badd-?in\b/i,
      /\bxml batch(?:es|ing)?\b/i,
      /\berror reconciliation\b/i,
      /\breceiving[- ]system\b/i,
      /\bclaims[- ]history\b/i,
      /\bpolicy onboarding\b/i,
    ],
    primaryChunkIds: ['experience-takeover'],
    secondaryChunkIds: ['experience-claims'],
  },
  {
    id: 'ev-reporting-continuity',
    patterns: [
      /\bcontinuity\b/i,
      /\binterim sql\b/i,
      /\bcompatibility extract\b/i,
      /\bmodernization\b/i,
      /\bpayment team\b/i,
      /\bfinancial[- ]report(?:ing)? sql\b/i,
      /\bdownstream reporting\b/i,
    ],
    primaryChunkIds: ['experience-continuity'],
    secondaryChunkIds: ['experience-sql'],
  },
  {
    id: 'ev-career-timeline',
    patterns: [
      /\barchitect\b/i,
      /\bjob title\b/i,
      /\bformal title\b/i,
      /\bdell\b/i,
      /\bseptember 2006\b/i,
      /\b2006\b/,
      /\b2009[–-]2022\b/,
      /\b2014\b/,
      /\b2016\b/,
      /\banalyst transition\b/i,
      /\bcareer timeline\b/i,
      /\bharris computer\b/i,
    ],
    primaryChunkIds: ['experience-dell', 'experience-headquarters'],
    secondaryChunkIds: ['experience-foundations', 'experience-workflows'],
  },
  {
    id: 'ev-nexus-capstone',
    patterns: [
      /\bnexus\b/i,
      /\bcapstone\b/i,
      /\blowkey\b/i,
      /\bworkshop\s?42\b/i,
      /\bmulti-agent\b/i,
      /\bai orchestration\b/i,
      /\bindependent (?:ai|project|capstone|architecture)\b/i,
    ],
    primaryChunkIds: ['experience-nexus'],
    secondaryChunkIds: [],
  },
]);

function isSafePlainObject(value: unknown): value is Record<string, unknown> {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    types.isProxy(value)
  ) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    return false;
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, desc] of Object.entries(descriptors)) {
    if (key === '__proto__' || 'get' in desc || 'set' in desc || !desc.enumerable) {
      return false;
    }
  }
  return true;
}

function omitKey(
  obj: Record<string, unknown>,
  keyToOmit: string,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([k]) => k !== keyToOmit),
  );
}

function loadJsonIfPath(
  filePath: string | undefined,
  fallback: unknown,
): unknown {
  if (!filePath) return fallback;
  return JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
}

function validateApprovedSourcePath(sourcePath: unknown): string {
  if (
    typeof sourcePath !== 'string' ||
    !sourcePath.trim() ||
    sourcePath.includes('..') ||
    sourcePath.includes('\\') ||
    sourcePath.startsWith('knowledge/') ||
    !APPROVED_SOURCE_PATHS.has(sourcePath)
  ) {
    throw new RetrievalIntegrityError(
      'RETRIEVAL_UNAPPROVED_SOURCE_PATH',
      'Chunk or corpus references an unapproved or private sourcePath',
    );
  }
  return sourcePath;
}

interface VerifiedManifestBundle {
  manifest: KnowledgeChunksManifest;
  corpusVersion: string;
  indexVersion: string;
  embeddingModel: string;
  sourcePath: string;
  chunksById: Map<string, KnowledgeChunkManifestEntry>;
}

function verifyManifestAndCorpus(
  rawManifest: unknown,
  rawCorpus: unknown,
  rawPolicy: unknown,
): VerifiedManifestBundle {
  if (
    !isSafePlainObject(rawManifest) ||
    !isSafePlainObject(rawCorpus) ||
    !isSafePlainObject(rawPolicy)
  ) {
    throw new RetrievalIntegrityError(
      'RETRIEVAL_MANIFEST_TAMPERED',
      'Knowledge manifest, corpus, or policy is not a valid plain object',
    );
  }

  const provenance = isSafePlainObject(rawCorpus.provenance)
    ? rawCorpus.provenance
    : null;
  const corpusInputPath = validateApprovedSourcePath(provenance?.inputPath);

  const corpusSources = new Set<string>();
  if (Array.isArray(rawCorpus.sources)) {
    for (const s of rawCorpus.sources) {
      if (isSafePlainObject(s) && typeof s.id === 'string') {
        corpusSources.add(s.id);
      }
    }
  }

  const activeCorpusChunks = new Map<string, Record<string, unknown>>();
  const approvedClaimIds = new Set<string>();
  if (Array.isArray(rawCorpus.chunks)) {
    for (const c of rawCorpus.chunks) {
      if (isSafePlainObject(c) && typeof c.id === 'string') {
        if (c.active === false || c.id === 'experience-lowkey') {
          continue;
        }
        activeCorpusChunks.set(c.id, c);
        if (Array.isArray(c.claimIds)) {
          for (const cid of c.claimIds) {
            if (typeof cid === 'string') approvedClaimIds.add(cid);
          }
        }
      }
    }
  }

  const manifestObj = rawManifest as Record<string, unknown>;
  const rawChunks = manifestObj.chunks;
  if (!Array.isArray(rawChunks)) {
    throw new RetrievalIntegrityError(
      'RETRIEVAL_MANIFEST_TAMPERED',
      'Manifest chunks array is missing',
    );
  }

  const seenIds = new Set<string>();
  const chunksById = new Map<string, KnowledgeChunkManifestEntry>();

  for (const rawChunk of rawChunks) {
    if (!isSafePlainObject(rawChunk)) {
      throw new RetrievalIntegrityError(
        'RETRIEVAL_CHUNK_DIGEST_MISMATCH',
        'Manifest chunk entry is not a plain object',
      );
    }

    const chunkId = rawChunk.id;
    if (
      typeof chunkId !== 'string' ||
      chunkId === 'experience-lowkey' ||
      rawChunk.active === false ||
      !activeCorpusChunks.has(chunkId)
    ) {
      throw new RetrievalIntegrityError(
        'RETRIEVAL_INACTIVE_CHUNK',
        `Inactive or unapproved chunk '${String(chunkId)}' rejected`,
      );
    }

    if (seenIds.has(chunkId)) {
      throw new RetrievalIntegrityError(
        'RETRIEVAL_MANIFEST_TAMPERED',
        `Duplicate chunk ID '${chunkId}' in manifest`,
      );
    }
    seenIds.add(chunkId);

    // Validate optional explicit sourcePath on chunk
    if (rawChunk.sourcePath !== undefined) {
      validateApprovedSourcePath(rawChunk.sourcePath);
    }

    // Validate sourceIds and sourceUrls on chunk
    if (
      !Array.isArray(rawChunk.sourceIds) ||
      rawChunk.sourceIds.length === 0 ||
      !rawChunk.sourceIds.every(
        (sid) => typeof sid === 'string' && corpusSources.has(sid),
      ) ||
      !Array.isArray(rawChunk.sourceUrls) ||
      rawChunk.sourceUrls.length === 0 ||
      !rawChunk.sourceUrls.every(
        (url) =>
          typeof url === 'string' &&
          /^https:\/\/joshboyer\.ca\/#projects\/[a-z0-9-]+$/.test(url),
      )
    ) {
      throw new RetrievalIntegrityError(
        'RETRIEVAL_UNAPPROVED_SOURCE_PATH',
        `Chunk '${chunkId}' has unapproved sourceIds or sourceUrls`,
      );
    }

    // Validate evidenceId (if present) and claimId
    if (rawChunk.evidenceId !== undefined) {
      if (
        typeof rawChunk.evidenceId !== 'string' ||
        !APPROVED_EVIDENCE_ID_SET.has(rawChunk.evidenceId)
      ) {
        throw new RetrievalIntegrityError(
          'RETRIEVAL_UNKNOWN_EVIDENCE_ID',
          `Chunk '${chunkId}' references unknown evidenceId '${String(rawChunk.evidenceId)}'`,
        );
      }
    }

    if (
      typeof rawChunk.claimId !== 'string' ||
      !approvedClaimIds.has(rawChunk.claimId) ||
      !CHUNK_TO_EVIDENCE_ID[chunkId]
    ) {
      throw new RetrievalIntegrityError(
        'RETRIEVAL_UNKNOWN_EVIDENCE_ID',
        `Chunk '${chunkId}' has unapproved claimId '${String(rawChunk.claimId)}'`,
      );
    }

    // Check extra non-canonical keys or mutated fields via contentSha256
    const hasExtraMutatedField = Object.keys(rawChunk).some(
      (k) =>
        !CANONICAL_CHUNK_KEYS.has(k) &&
        k !== 'sourcePath' &&
        k !== 'evidenceId',
    );
    const computedChunkDigest = digest(omitKey(rawChunk, 'contentSha256'));
    if (
      hasExtraMutatedField ||
      typeof rawChunk.contentSha256 !== 'string' ||
      rawChunk.contentSha256 !== computedChunkDigest
    ) {
      throw new RetrievalIntegrityError(
        'RETRIEVAL_CHUNK_DIGEST_MISMATCH',
        `Chunk '${chunkId}' failed contentSha256 integrity verification`,
      );
    }

    chunksById.set(
      chunkId,
      rawChunk as unknown as KnowledgeChunkManifestEntry,
    );
  }

  const computedManifestDigest = digest(omitKey(manifestObj, 'manifestSha256'));
  if (
    manifestObj.schemaVersion !== '1.0.0' ||
    typeof manifestObj.corpusVersion !== 'string' ||
    manifestObj.corpusVersion !== rawCorpus.corpusVersion ||
    typeof manifestObj.indexVersion !== 'string' ||
    !INDEX_VERSION_PATTERN.test(manifestObj.indexVersion) ||
    manifestObj.embeddingModel !== PINNED_EMBEDDING_MODEL ||
    manifestObj.dimensions !== EMBEDDING_DIMENSIONS ||
    rawChunks.length !== EXPECTED_CHUNK_COUNT ||
    typeof manifestObj.manifestSha256 !== 'string' ||
    manifestObj.manifestSha256 !== computedManifestDigest ||
    canonicalJson(manifestObj).includes('CANARY-')
  ) {
    throw new RetrievalIntegrityError(
      'RETRIEVAL_MANIFEST_TAMPERED',
      'Manifest digest or metadata failed canonical verification',
    );
  }

  return {
    manifest: rawManifest as unknown as KnowledgeChunksManifest,
    corpusVersion: manifestObj.corpusVersion,
    indexVersion: manifestObj.indexVersion,
    embeddingModel: manifestObj.embeddingModel,
    sourcePath: corpusInputPath,
    chunksById,
  };
}

export function validateTopK(topK: unknown): number {
  if (topK === undefined) {
    return DEFAULT_RETRIEVAL_TOP_K;
  }
  if (
    typeof topK !== 'number' ||
    !Number.isSafeInteger(topK) ||
    topK < MIN_RETRIEVAL_TOP_K ||
    topK > MAX_RETRIEVAL_TOP_K
  ) {
    throw new RetrievalBoundsError(
      `topK must be an integer between ${MIN_RETRIEVAL_TOP_K} and ${MAX_RETRIEVAL_TOP_K}`,
    );
  }
  return topK;
}

/**
 * Normalizes untrusted visitor query text without throwing on hostile objects, Proxies,
 * throwing getters, NUL bytes, or control characters. The normalized query is used only
 * for token matching and query embedding and is NEVER echoed into chunks, citations,
 * promptContext, or traceDetail.
 */
function normalizeUntrustedQuery(rawQuery: unknown): {
  normalizedText: string;
  queryTokens: string[];
} {
  if (typeof rawQuery !== 'string') {
    return { normalizedText: '', queryTokens: [] };
  }

  let cleaned = rawQuery
    .replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (Buffer.byteLength(cleaned, 'utf8') > MAX_NORMALIZED_QUERY_BYTES) {
    cleaned = Buffer.from(cleaned, 'utf8')
      .subarray(0, MAX_NORMALIZED_QUERY_BYTES)
      .toString('utf8')
      .replace(/\uFFFD/g, '')
      .trim();
  }

  const lower = cleaned.toLowerCase();
  const rawTokens = lower
    .split(/[^a-z0-9%/-]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && t !== '__proto__' && t !== 'constructor' && t !== 'prototype');

  const seen = new Set<string>();
  const queryTokens: string[] = [];
  for (const token of rawTokens) {
    if (!seen.has(token)) {
      seen.add(token);
      queryTokens.push(token);
    }
    if (queryTokens.length >= 64) break;
  }

  return { normalizedText: cleaned, queryTokens };
}

function detectQueryBoundaries(normalizedText: string): QualificationBoundaryId[] {
  if (!normalizedText) return [];
  const matched: QualificationBoundaryId[] = [];
  for (const rule of BOUNDARY_RULES) {
    if (rule.patterns.some((re) => re.test(normalizedText))) {
      matched.push(rule.id);
    }
  }
  return matched;
}

function computeLexicalAndQualificationScore(
  chunk: KnowledgeChunkManifestEntry,
  normalizedQuery: string,
  queryTokens: readonly string[],
  matchedBoundaries: readonly QualificationBoundaryId[],
): {
  lexicalScore: number;
  qualificationBoost: number;
  chunkMatchedBoundaries: QualificationBoundaryId[];
} {
  const chunkTokenSet = new Set<string>(
    chunk.lexicalTokens.map((t) => t.toLowerCase()),
  );
  for (const tag of chunk.tags) {
    chunkTokenSet.add(tag.toLowerCase());
  }
  chunkTokenSet.add(chunk.projectId.toLowerCase());
  chunkTokenSet.add(chunk.roleId.toLowerCase());

  let tokenHits = 0;
  const titleLower = chunk.title.toLowerCase();
  const embedLower = chunk.embeddingText.toLowerCase();

  for (const qt of queryTokens) {
    if (chunkTokenSet.has(qt)) {
      tokenHits += 1.0;
    } else if (titleLower.includes(qt)) {
      tokenHits += 0.85;
    } else if (embedLower.includes(qt)) {
      tokenHits += 0.5;
    }
  }

  const denom = Math.max(1, Math.min(queryTokens.length, 10));
  const rawLexical = queryTokens.length > 0 ? Math.min(1, tokenHits / denom) : 0;

  let qualificationBoost = 0;
  const chunkEvidenceId = CHUNK_TO_EVIDENCE_ID[chunk.id]!;
  const chunkMatchedBoundaries: QualificationBoundaryId[] = [];

  for (const boundaryId of matchedBoundaries) {
    const spec = BOUNDARY_RULES.find((r) => r.id === boundaryId);
    if (!spec) continue;
    const primaryIndex = spec.primaryChunkIds.indexOf(chunk.id);
    const secondaryIndex = spec.secondaryChunkIds.indexOf(chunk.id);
    if (primaryIndex !== -1) {
      qualificationBoost += 0.55 - primaryIndex * 0.04;
      chunkMatchedBoundaries.push(boundaryId);
    } else if (secondaryIndex !== -1) {
      qualificationBoost += 0.25 - secondaryIndex * 0.03;
      chunkMatchedBoundaries.push(boundaryId);
    } else if (chunkEvidenceId === boundaryId) {
      qualificationBoost += 0.15;
      chunkMatchedBoundaries.push(boundaryId);
    }
  }

  // Specific phrase boosts for exact disambiguation within shared roles/projects
  if (
    chunk.id === 'experience-sql' &&
    /\b(payment team|financial[- ]report(?:ing)? sql)\b/i.test(normalizedQuery)
  ) {
    qualificationBoost += 0.35;
  }
  if (
    chunk.id === 'experience-continuity' &&
    /\b(compatibility extract|interim sql|modernization|reporting continuity)\b/i.test(
      normalizedQuery,
    )
  ) {
    qualificationBoost += 0.35;
  }

  return {
    lexicalScore: Number(rawLexical.toFixed(6)),
    qualificationBoost: Number(Math.min(1, qualificationBoost).toFixed(6)),
    chunkMatchedBoundaries,
  };
}

function buildProviderAdapterConfig(
  cfg: RetrievalProviderConfig | Config,
): Config {
  return {
    edgeSecretArn: 'edgeSecretArn' in cfg ? cfg.edgeSecretArn : '',
    providerSecretArns:
      'providerSecretArns' in cfg
        ? cfg.providerSecretArns
        : { openai: '', anthropic: '' },
    gatewaySecretArn: 'gatewaySecretArn' in cfg ? cfg.gatewaySecretArn : '',
    stateTable: 'stateTable' in cfg ? cfg.stateTable : '',
    gatewayAccountId: cfg.gatewayAccountId,
    gatewayId: cfg.gatewayId,
    models: cfg.models ?? {
      openai: MODELS.openai[0]!,
      anthropic: MODELS.anthropic[0]!,
    },
    embeddingModel: cfg.embeddingModel ?? EMBEDDING_MODELS.openai[0]!,
  };
}

function formatBoundedPromptContext(
  chunks: readonly RetrievedChunk[],
  corpusVersion: string,
  indexVersion: string,
): string {
  const lines: string[] = [
    `Approved Portfolio Retrieval Context (corpusVersion=${corpusVersion}, indexVersion=${indexVersion}):`,
  ];

  for (const chunk of chunks) {
    const entryBlock = [
      `---`,
      `Chunk ID: ${chunk.id} | Claim ID: ${chunk.claimId} | Evidence ID: ${chunk.evidenceId}`,
      `Title: ${chunk.title} (${chunk.period})`,
      `Delivery Status: ${chunk.deliveryStatus} | Source: ${chunk.sourceUrls[0] ?? chunk.sourcePath}`,
      `Summary: ${chunk.resumeText}`,
      `Decision & Outcome: ${chunk.decision} -> ${chunk.outcome}`,
      `Qualification Boundary: ${chunk.qualificationNote}`,
    ].join('\n');

    const candidate = `${lines.join('\n')}\n${entryBlock}`;
    if (candidate.length > MAX_PROMPT_CONTEXT_CHARS) {
      break;
    }
    lines.push(entryBlock);
  }

  return lines.join('\n').slice(0, MAX_PROMPT_CONTEXT_CHARS);
}

interface CachedPointerState {
  pointer: ActiveIndexPointer;
  cachedAtMs: number;
}

export function createRetrievalEngine(
  options: RetrievalEngineOptions = {},
): RetrievalEngine {
  const rawOptions: unknown = options;
  if (!isSafePlainObject(rawOptions)) {
    throw new RetrievalIntegrityError(
      'RETRIEVAL_MANIFEST_TAMPERED',
      'RetrievalEngineOptions must be a plain object',
    );
  }

  const rawManifest = loadJsonIfPath(
    options.manifestPath,
    options.manifest ?? defaultChunksManifest,
  );
  const rawCorpus = loadJsonIfPath(
    options.corpusPath,
    options.corpus ?? defaultCorpus,
  );
  const rawPolicy = loadJsonIfPath(
    options.policyPath,
    options.policy ?? defaultPolicy,
  );

  const verified = verifyManifestAndCorpus(rawManifest, rawCorpus, rawPolicy);
  const cacheTtlMs = options.cacheTtlMs ?? DEFAULT_ACTIVE_POINTER_CACHE_TTL_MS;
  const nowFn = options.now ?? Date.now;
  const pointerKey = options.pointerKey ?? ACTIVE_POINTER_KEY;

  let cachedPointerState: CachedPointerState | null = null;

  const hasSemanticBackend = Boolean(
    options.s3Store &&
      options.vectorsStore &&
      options.bucketName &&
      (options.embedQueryFn ||
        (options.providerConfig && options.apiKey && options.gatewayToken)),
  );

  function extractPointerIndexVersion(
    pointer: Record<string, unknown>,
  ): string | null {
    if (
      typeof pointer.activeIndexVersion === 'string' &&
      pointer.activeIndexVersion.length > 0
    ) {
      return pointer.activeIndexVersion;
    }
    if (
      typeof pointer.indexVersion === 'string' &&
      pointer.indexVersion.length > 0
    ) {
      return pointer.indexVersion;
    }
    return null;
  }

  function isPointerMatchingManifest(pointer: Record<string, unknown>): boolean {
    const ptrVersion = extractPointerIndexVersion(pointer);
    if (!ptrVersion || ptrVersion !== verified.indexVersion) {
      return false;
    }
    if (
      typeof pointer.corpusVersion === 'string' &&
      pointer.corpusVersion !== verified.corpusVersion
    ) {
      return false;
    }
    if (
      typeof pointer.manifestSha256 === 'string' &&
      pointer.manifestSha256 !== verified.manifest.manifestSha256
    ) {
      return false;
    }
    return true;
  }

  return {
    invalidatePointerCache(): void {
      cachedPointerState = null;
    },

    async retrieve(input: RetrieveEvidenceInput): Promise<RetrievalResult> {
      const startMs = nowFn();
      const rawInput: unknown = input;
      if (!isSafePlainObject(rawInput)) {
        throw new RetrievalBoundsError('RetrieveEvidenceInput must be a plain object');
      }

      const topK = validateTopK(input.topK);
      const strictPointer =
        input.strictPointerVersion ?? options.strictPointerVersion ?? false;
      const mcpActive = input.mcpActive === true;
      const { normalizedText, queryTokens } = normalizeUntrustedQuery(input.query);
      const detectedBoundaries = detectQueryBoundaries(normalizedText);

      let mode: RetrievalMode = mcpActive ? 'cag+mcp' : 'cag';
      let retrievalMode: TraceRetrievalMode = 'deterministic_only';
      let degraded = false;
      let degradedReasonCode: DegradedReasonCode | undefined;
      let pointerCacheHit = false;
      let embeddingAttempted = false;
      let rejectedVectorCount = 0;

      let embeddingUsage: RetrievalEmbeddingUsage = {
        status: 'not_attempted',
        dispatched: false,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCostMicros: 0,
        model: verified.embeddingModel,
      };

      const semanticScoresByChunkId = new Map<string, number>();

      if (hasSemanticBackend && normalizedText.length > 0) {
        const s3Store = options.s3Store!;
        const vectorsStore = options.vectorsStore!;
        const bucketName = options.bucketName!;
        const nowMs = nowFn();

        let activePointer: Record<string, unknown> | null = null;

        // 1. Check active-pointer TTL cache (valid strictly when elapsed < cacheTtlMs, i.e., ttl - 1 is hit, ttl and ttl + 1 are expired)
        if (
          cachedPointerState !== null &&
          !input.bypassPointerCache &&
          cacheTtlMs > 0 &&
          nowMs - cachedPointerState.cachedAtMs < cacheTtlMs
        ) {
          const candidate = cachedPointerState.pointer as unknown as Record<
            string,
            unknown
          >;
          if (isPointerMatchingManifest(candidate)) {
            activePointer = candidate;
            pointerCacheHit = true;
          } else {
            cachedPointerState = null;
          }
        } else {
          cachedPointerState = null;
        }

        // 2. Fetch active-pointer.json from S3 on cache miss / expiry / bypass
        if (!activePointer) {
          try {
            const loaded = await s3Store.getJsonObject<Record<string, unknown>>(
              bucketName,
              pointerKey,
              input.signal,
            );
            if (loaded && isSafePlainObject(loaded)) {
              activePointer = loaded;
            }
          } catch {
            activePointer = null;
          }

          if (!activePointer) {
            cachedPointerState = null;
            mode = 'degraded';
            retrievalMode = 'degraded';
            degraded = true;
            degradedReasonCode = 'RAG_UNAVAILABLE';
          } else if (!isPointerMatchingManifest(activePointer)) {
            cachedPointerState = null;
            if (strictPointer) {
              throw new RetrievalIntegrityError(
                'RETRIEVAL_INDEX_VERSION_MISMATCH',
                'Active index pointer version or digest does not match canonical manifest',
              );
            }
            mode = 'degraded';
            retrievalMode = 'degraded';
            degraded = true;
            degradedReasonCode = 'RAG_UNAVAILABLE';
            activePointer = null;
          } else {
            cachedPointerState = {
              pointer: activePointer as unknown as ActiveIndexPointer,
              cachedAtMs: nowMs,
            };
          }
        }

        // 3. Perform query embedding via Gateway and query S3 Vectors when active pointer is verified
        if (activePointer && !degraded) {
          let queryVector: number[] | null = null;
          embeddingAttempted = true;

          try {
            let embRes: EmbeddingResult;
            if (options.embedQueryFn) {
              embRes = await options.embedQueryFn(normalizedText, input.signal);
            } else {
              const cfg = buildProviderAdapterConfig(options.providerConfig!);
              embRes = await callEmbedding(
                {
                  config: cfg,
                  input: normalizedText,
                  apiKey: options.apiKey!,
                  gatewayToken: options.gatewayToken!,
                  ...(input.signal ? { signal: input.signal } : {}),
                  ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
                },
                options.fetchImpl,
              );
            }

            queryVector = embRes.embedding;
            const costMicros = embeddingUsageAllowance(embRes.usage, true);
            const inputTokens =
              embRes.usage.status === 'known' && embRes.usage.inputTokens !== null
                ? embRes.usage.inputTokens
                : 0;
            embeddingUsage = {
              status: embRes.usage.status,
              dispatched: true,
              inputTokens,
              outputTokens: 0,
              totalTokens: inputTokens,
              estimatedCostMicros: costMicros,
              model: embRes.model,
              ...(embRes.providerRequestId
                ? { providerRequestId: embRes.providerRequestId }
                : {}),
              ...(embRes.gatewayRequestId
                ? { gatewayRequestId: embRes.gatewayRequestId }
                : {}),
            };
          } catch (error) {
            const dispatched = !(
              error instanceof ServiceError &&
              error.chargeStatus === 'not_started'
            );
            embeddingUsage = {
              status: dispatched ? 'unknown' : 'not_attempted',
              dispatched,
              inputTokens: 0,
              outputTokens: 0,
              totalTokens: 0,
              estimatedCostMicros: dispatched
                ? MAX_EMBEDDING_RESERVATION_MICROS
                : 0,
              model: verified.embeddingModel,
            };
            mode = 'degraded';
            retrievalMode = 'degraded';
            degraded = true;
            degradedReasonCode = 'MODEL_DEGRADED';
          }

          if (queryVector && !degraded) {
            try {
              const vectorBucketName =
                options.vectorBucketName ??
                (typeof activePointer.vectorBucketName === 'string'
                  ? activePointer.vectorBucketName
                  : DEFAULT_VECTOR_BUCKET_NAME);
              const vectorIndexName =
                options.vectorIndexName ??
                (typeof activePointer.indexName === 'string'
                  ? activePointer.indexName
                  : DEFAULT_VECTOR_INDEX_NAME);

              const vectorHits = await vectorsStore.queryVectors(
                {
                  vectorBucketName,
                  indexName: vectorIndexName,
                  topK: verified.manifest.chunks.length,
                  queryVector,
                  filter: { indexVersion: verified.indexVersion },
                },
                input.signal,
              );

              for (const hit of vectorHits) {
                const meta = hit.metadata;
                const chunkId =
                  typeof meta.chunkId === 'string' ? meta.chunkId : '';
                const canonicalChunk = verified.chunksById.get(chunkId);

                if (
                  !canonicalChunk ||
                  chunkId === 'experience-lowkey' ||
                  meta.indexVersion !== verified.indexVersion ||
                  meta.corpusVersion !== verified.corpusVersion ||
                  meta.contentSha256 !== canonicalChunk.contentSha256 ||
                  (meta.sourcePath !== undefined &&
                    meta.sourcePath !== verified.sourcePath) ||
                  (meta.evidenceId !== undefined &&
                    meta.evidenceId !== CHUNK_TO_EVIDENCE_ID[chunkId])
                ) {
                  rejectedVectorCount += 1;
                  continue;
                }

                const sim = Math.max(0, Math.min(1, 1 - hit.distance));
                semanticScoresByChunkId.set(
                  chunkId,
                  Number(sim.toFixed(6)),
                );
              }

              mode = mcpActive ? 'cag+rag+mcp' : 'cag+rag';
              retrievalMode = 'hybrid';
            } catch {
              mode = 'degraded';
              retrievalMode = 'degraded';
              degraded = true;
              degradedReasonCode = 'RAG_UNAVAILABLE';
            }
          }
        }
      }

      // 4. Score and rank all verified active chunks
      const scoredChunks: RetrievedChunk[] = [];
      const allMatchedQualifications = new Set<QualificationBoundaryId>(
        detectedBoundaries,
      );

      for (const chunk of verified.manifest.chunks) {
        const evidenceId = CHUNK_TO_EVIDENCE_ID[chunk.id]!;
        const semanticScore = semanticScoresByChunkId.get(chunk.id) ?? 0;
        const {
          lexicalScore,
          qualificationBoost,
          chunkMatchedBoundaries,
        } = computeLexicalAndQualificationScore(
          chunk,
          normalizedText,
          queryTokens,
          detectedBoundaries,
        );

        const combinedScore =
          retrievalMode === 'hybrid'
            ? Number(
                (
                  semanticScore * 0.45 +
                  lexicalScore * 0.35 +
                  qualificationBoost * 0.65
                ).toFixed(6),
              )
            : Number((lexicalScore * 0.55 + qualificationBoost * 0.75).toFixed(6));

        const canonicalBoundaryNote =
          BOUNDARY_CANONICAL_QUALIFICATION[evidenceId];
        const mergedNotes: string[] = [canonicalBoundaryNote];
        for (const note of chunk.qualificationNotes) {
          if (!mergedNotes.includes(note)) {
            mergedNotes.push(note);
          }
        }
        const qualificationNote = mergedNotes.join(' ');
        const sourceAnchor = chunk.sourceUrls[0] ?? `https://joshboyer.ca/#projects/${chunk.projectId}`;

        const effectiveBoundaries =
          chunkMatchedBoundaries.length > 0
            ? chunkMatchedBoundaries
            : [evidenceId];

        scoredChunks.push({
          id: chunk.id,
          chunkId: chunk.id,
          claimId: chunk.claimId,
          evidenceId,
          title: chunk.title,
          section: chunk.projectId,
          period: chunk.period,
          text: chunk.embeddingText,
          resumeText: chunk.resumeText,
          decision: chunk.decision,
          outcome: chunk.outcome,
          technicalGuidance: chunk.technicalGuidance,
          sourcePath: verified.sourcePath,
          sourceAnchor,
          sourceTier: chunk.confidence,
          sourceLabel: `${chunk.title} (${chunk.period})`,
          sourceIds: [...chunk.sourceIds],
          sourceUrls: [...chunk.sourceUrls],
          deliveryStatus: chunk.deliveryStatus,
          qualificationNote,
          qualificationNotes: mergedNotes,
          projectId: chunk.projectId,
          roleId: chunk.roleId,
          tags: [...chunk.tags],
          contentSha256: chunk.contentSha256,
          semanticScore,
          lexicalScore,
          qualificationBoost,
          combinedScore,
          matchedQualifications: effectiveBoundaries,
        });
      }

      scoredChunks.sort((a, b) => {
        if (b.combinedScore !== a.combinedScore) {
          return b.combinedScore - a.combinedScore;
        }
        if (b.qualificationBoost !== a.qualificationBoost) {
          return b.qualificationBoost - a.qualificationBoost;
        }
        if (b.lexicalScore !== a.lexicalScore) {
          return b.lexicalScore - a.lexicalScore;
        }
        return a.id.localeCompare(b.id);
      });

      const selectedChunks = scoredChunks.slice(0, topK);
      for (const c of selectedChunks) {
        for (const q of c.matchedQualifications) {
          allMatchedQualifications.add(q);
        }
      }

      const citations: RetrievalCitation[] = selectedChunks.map((c) => ({
        evidenceId: c.evidenceId,
        chunkId: c.chunkId,
        claimId: c.claimId,
        title: c.title,
        section: c.section,
        sourcePath: c.sourcePath,
        sourceAnchor: c.sourceAnchor,
        sourceTier: c.sourceTier,
        sourceLabel: c.sourceLabel,
        sourceIds: c.sourceIds,
        sourceUrls: c.sourceUrls,
        deliveryStatus: c.deliveryStatus,
        qualificationNote: c.qualificationNote,
        contentSha256: c.contentSha256,
        score: c.combinedScore,
      }));

      const promptContext = formatBoundedPromptContext(
        selectedChunks,
        verified.corpusVersion,
        verified.indexVersion,
      );

      const durationMs = Math.max(0, Math.round(nowFn() - startMs));
      const traceDetail: RetrievalTraceDetail = {
        stage: 'retrieval',
        state: 'completed',
        elapsedMs: durationMs,
        retrievalMode,
        matchedCount: selectedChunks.length,
        corpusVersion: verified.corpusVersion,
        indexVersion: verified.indexVersion,
        embeddingModel: verified.embeddingModel,
        durationMs,
      };

      return {
        mode,
        retrievalMode,
        degraded,
        ...(degradedReasonCode ? { degradedReasonCode } : {}),
        corpusVersion: verified.corpusVersion,
        indexVersion: verified.indexVersion,
        chunkCount: selectedChunks.length,
        topK,
        chunks: selectedChunks,
        citations,
        matchedQualifications: [...allMatchedQualifications],
        promptContext,
        embeddingAttempted,
        embeddingUsage,
        pointerCacheHit,
        rejectedVectorCount,
        traceDetail,
      };
    },
  };
}

let defaultEngineInstance: RetrievalEngine | null = null;

export async function retrieveEvidence(
  input: RetrieveEvidenceInput,
  options?: RetrievalEngineOptions,
): Promise<RetrievalResult> {
  if (options) {
    return createRetrievalEngine(options).retrieve(input);
  }
  if (!defaultEngineInstance) {
    defaultEngineInstance = createRetrievalEngine();
  }
  return defaultEngineInstance.retrieve(input);
}
