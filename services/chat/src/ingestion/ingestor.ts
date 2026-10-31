import {
  embeddingUsageAllowance,
  estimateIngestionAllowance,
  MAX_INGESTION_RESERVATION_MICROS,
  type IngestionBudgetEstimate
} from '../budget-policy.js';
import { callEmbedding, embeddingReceipt, type EmbeddingReceipt } from '../chat-provider.js';
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODELS, type Config } from '../config.js';
import { ServiceError } from '../errors.js';
import type { Fetch } from '../provider.js';
import {
  isSafeJsonValue,
  isSafePlainObject,
  S3ObjectStore,
  S3VectorsStore,
  sha256Hex,
  validateEmbeddingVector,
  validateS3BucketName,
  validateVectorBucketName,
  validateVectorIndexName,
  type StoredVectorRecord
} from './s3-store.js';

const {
  canonicalJson,
  digest,
  validateArtifacts
} = require('../../../../chat/knowledge/validate.cjs') as {
  canonicalJson(value: unknown): string;
  digest(value: unknown): string;
  validateArtifacts(input: { corpus: unknown; cag: unknown; chunksManifest: unknown }): boolean;
};

const defaultCorpus = require('../../../../chat/knowledge/corpus.json') as Record<string, unknown>;
const defaultCag = require('../../../../chat/knowledge/cag-context.json') as Record<string, unknown>;
const defaultChunksManifest = require('../../../../chat/knowledge/chunks-manifest.json') as KnowledgeChunksManifest;

export const ACTIVE_POINTER_KEY = 'indexes/active-pointer.json';
export const INDEX_HISTORY_KEY = 'indexes/history.json';
export const DEFAULT_VECTOR_BUCKET_NAME = 'joshboyer-chat-dev-vectors';
export const DEFAULT_VECTOR_INDEX_NAME = 'portfolio-public-chunks';
export const EXPECTED_CHUNK_COUNT = 14;
export const PINNED_EMBEDDING_MODEL = 'text-embedding-3-small';
export const INDEX_VERSION_PATTERN = /^idx-[a-z0-9][a-z0-9_-]{1,48}$/;

export interface KnowledgeChunkManifestEntry {
  id: string;
  claimId: string;
  kind: string;
  projectId: string;
  roleId: string;
  title: string;
  period: string;
  confidence: string;
  tags: string[];
  deliveryStatus: string;
  decision: string;
  process: string[];
  technicalGuidance: string;
  outcome: string;
  resumeText: string;
  qualificationNotes: string[];
  sourceIds: string[];
  sourceUrls: string[];
  embeddingText: string;
  lexicalTokens: string[];
  contentSha256: string;
}

export interface KnowledgeChunksManifest {
  schemaVersion: '1.0.0';
  corpusVersion: string;
  indexVersion: string;
  embeddingModel: string;
  dimensions: number;
  chunks: KnowledgeChunkManifestEntry[];
  caseStudies: unknown[];
  manifestSha256: string;
}

export interface ChunkVectorMetadata extends Record<string, unknown> {
  indexVersion: string;
  corpusVersion: string;
  chunkId: string;
  claimId: string;
  projectId: string;
  roleId: string;
  kind: string;
  deliveryStatus: string;
  contentSha256: string;
}

export interface StoredChunkVectorEntry {
  key: string;
  chunkId: string;
  claimId: string;
  projectId: string;
  roleId: string;
  kind: string;
  deliveryStatus: string;
  contentSha256: string;
  vectorSha256: string;
  vector: number[];
}

export interface VersionedVectorsArtifact {
  schemaVersion: '1.0.0';
  indexVersion: string;
  corpusVersion: string;
  manifestSha256: string;
  embeddingModel: 'text-embedding-3-small';
  dimensions: 1536;
  chunkCount: number;
  vectors: StoredChunkVectorEntry[];
  embeddingsSha256: string;
}

export interface ActiveIndexPointer {
  schemaVersion: '1.0.0';
  activeIndexVersion: string;
  previousIndexVersion: string | null;
  corpusVersion: string;
  manifestSha256: string;
  embeddingsSha256: string;
  embeddingModel: 'text-embedding-3-small';
  dimensions: 1536;
  vectorBucketName: string;
  indexName: string;
  chunkCount: number;
  activatedAt: string;
}

export interface IndexHistoryEntry {
  action: 'ingest' | 'rollback';
  activeIndexVersion: string;
  previousIndexVersion: string | null;
  corpusVersion: string;
  manifestSha256: string;
  embeddingsSha256: string;
  timestamp: string;
}

export interface IndexHistoryArtifact {
  schemaVersion: '1.0.0';
  entries: IndexHistoryEntry[];
}

export interface DryRunIngestionPlan {
  indexVersion: string;
  corpusVersion: string;
  manifestSha256: string;
  embeddingModel: 'text-embedding-3-small';
  dimensions: 1536;
  chunkCount: number;
  totalUtf8Bytes: number;
  budgetEstimate: IngestionBudgetEstimate;
}

export interface IngestKnowledgeOptions {
  config: Config;
  openAiApiKey: string;
  gatewayToken: string;
  s3Store: S3ObjectStore;
  vectorStore: S3VectorsStore;
  evidenceBucket?: string;
  vectorBucketName?: string;
  indexName?: string;
  corpus?: unknown;
  cag?: unknown;
  chunksManifest?: unknown;
  indexVersion?: string;
  maxAllowanceMicros?: number;
  force?: boolean;
  signal?: AbortSignal;
  fetchImpl?: Fetch;
  now?: () => number;
}

export interface IngestionResult {
  indexVersion: string;
  corpusVersion: string;
  manifestSha256: string;
  embeddingsSha256: string;
  chunkCount: number;
  reusedExisting: boolean;
  embeddingCalls: number;
  reservedMicros: number;
  chargedMicros: number;
  pointer: ActiveIndexPointer;
  receipt?: EmbeddingReceipt;
}

export interface VerifyKnowledgeIndexOptions {
  evidenceBucket: string;
  vectorBucketName?: string;
  indexName?: string;
  indexVersion?: string;
  expectedCorpusVersion?: string;
  s3Store: S3ObjectStore;
  vectorStore: S3VectorsStore;
  signal?: AbortSignal;
}

export interface VerifyKnowledgeIndexResult {
  verified: true;
  pointer: ActiveIndexPointer;
  manifest: KnowledgeChunksManifest;
  vectorsArtifact: VersionedVectorsArtifact;
}

export interface RollbackKnowledgeIndexOptions {
  evidenceBucket: string;
  vectorBucketName?: string;
  indexName?: string;
  targetIndexVersion?: string;
  allowedCorpusVersions?: readonly string[];
  s3Store: S3ObjectStore;
  vectorStore: S3VectorsStore;
  signal?: AbortSignal;
  now?: () => number;
}

export interface RollbackKnowledgeIndexResult {
  rolledBackTo: string;
  previousActiveIndexVersion: string;
  pointer: ActiveIndexPointer;
}

export function manifestObjectKey(indexVersion: string): string {
  if (typeof indexVersion !== 'string' || !INDEX_VERSION_PATTERN.test(indexVersion)) {
    throw new ServiceError('INVALID_KNOWLEDGE_ARTIFACT', 400);
  }
  return `indexes/${indexVersion}/manifest.json`;
}

export function vectorsObjectKey(indexVersion: string): string {
  if (typeof indexVersion !== 'string' || !INDEX_VERSION_PATTERN.test(indexVersion)) {
    throw new ServiceError('INVALID_KNOWLEDGE_ARTIFACT', 400);
  }
  return `indexes/${indexVersion}/vectors.json`;
}

export function vectorRecordKey(indexVersion: string, chunkId: string): string {
  if (
    typeof indexVersion !== 'string' ||
    !INDEX_VERSION_PATTERN.test(indexVersion) ||
    typeof chunkId !== 'string' ||
    !/^[a-z][a-z0-9-]{0,95}$/.test(chunkId)
  ) {
    throw new ServiceError('INVALID_KNOWLEDGE_ARTIFACT', 400);
  }
  return `${indexVersion}:${chunkId}`;
}

function omitKey(obj: Record<string, unknown>, key: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key));
}

function validateManifestOnly(manifest: unknown): KnowledgeChunksManifest {
  if (!isSafePlainObject(manifest) || !isSafeJsonValue(manifest)) {
    throw new ServiceError('INVALID_KNOWLEDGE_ARTIFACT', 400);
  }
  const m = manifest as unknown as KnowledgeChunksManifest;
  if (
    m.schemaVersion !== '1.0.0' ||
    typeof m.corpusVersion !== 'string' ||
    !/^sha256:[0-9a-f]{64}$/.test(m.corpusVersion) ||
    typeof m.indexVersion !== 'string' ||
    !INDEX_VERSION_PATTERN.test(m.indexVersion) ||
    m.embeddingModel !== PINNED_EMBEDDING_MODEL ||
    m.dimensions !== EMBEDDING_DIMENSIONS ||
    !Array.isArray(m.chunks) ||
    m.chunks.length !== EXPECTED_CHUNK_COUNT ||
    typeof m.manifestSha256 !== 'string' ||
    !/^[0-9a-f]{64}$/.test(m.manifestSha256)
  ) {
    throw new ServiceError('INVALID_KNOWLEDGE_ARTIFACT', 400);
  }

  const serializedManifest = canonicalJson(m);
  if (serializedManifest.includes('CANARY-')) {
    throw new ServiceError('INVALID_KNOWLEDGE_ARTIFACT', 400);
  }

  const seenIds = new Set<string>();
  for (const chunk of m.chunks) {
    if (
      !isSafePlainObject(chunk) ||
      typeof chunk.id !== 'string' ||
      !/^[a-z][a-z0-9-]{0,95}$/.test(chunk.id) ||
      chunk.id === 'experience-lowkey' ||
      seenIds.has(chunk.id) ||
      typeof chunk.embeddingText !== 'string' ||
      !chunk.embeddingText.includes('Qualification boundaries:') ||
      !Array.isArray(chunk.qualificationNotes) ||
      !chunk.qualificationNotes.every(note => typeof note === 'string' && chunk.embeddingText.includes(note)) ||
      typeof chunk.contentSha256 !== 'string' ||
      chunk.contentSha256 !== digest(omitKey(chunk as unknown as Record<string, unknown>, 'contentSha256'))
    ) {
      throw new ServiceError('INVALID_KNOWLEDGE_ARTIFACT', 400);
    }
    seenIds.add(chunk.id);
  }

  const computedManifestDigest = digest(omitKey(m as unknown as Record<string, unknown>, 'manifestSha256'));
  if (m.manifestSha256 !== computedManifestDigest) {
    throw new ServiceError('INVALID_KNOWLEDGE_ARTIFACT', 400);
  }
  return m;
}

export function planDryRunIngestion(options?: {
  corpus?: unknown;
  cag?: unknown;
  chunksManifest?: unknown;
  indexVersion?: string;
  maxAllowanceMicros?: number;
}): DryRunIngestionPlan {
  if (options !== undefined && !isSafePlainObject(options)) {
    throw new ServiceError('INVALID_REQUEST', 400);
  }
  const corpus = options?.corpus ?? defaultCorpus;
  const cag = options?.cag ?? defaultCag;
  const chunksManifest = options?.chunksManifest ?? defaultChunksManifest;

  if (!isSafePlainObject(corpus) || !isSafePlainObject(cag) || !isSafePlainObject(chunksManifest)) {
    throw new ServiceError('INVALID_KNOWLEDGE_ARTIFACT', 400);
  }

  // Reject any private corpus paths, non-public scope, inactive chunks, or planted canaries before validation
  const provenance = isSafePlainObject(corpus.provenance) ? corpus.provenance : undefined;
  const rawChunks = Array.isArray(corpus.chunks) ? corpus.chunks : [];
  if (
    !provenance ||
    provenance.inputPath !== 'dist/career-evidence.v3.json' ||
    typeof provenance.scope !== 'string' ||
    !provenance.scope.includes('Approved public portfolio text only') ||
    rawChunks.length !== EXPECTED_CHUNK_COUNT ||
    rawChunks.some(c => !isSafePlainObject(c) || c.active !== true || c.id === 'experience-lowkey') ||
    canonicalJson(corpus).includes('CANARY-') ||
    canonicalJson(chunksManifest).includes('CANARY-')
  ) {
    throw new ServiceError('INVALID_KNOWLEDGE_ARTIFACT', 400);
  }

  try {
    validateArtifacts({ corpus, cag, chunksManifest });
  } catch {
    throw new ServiceError('INVALID_KNOWLEDGE_ARTIFACT', 400);
  }

  const validatedManifest = validateManifestOnly(chunksManifest);
  if (validatedManifest.corpusVersion !== corpus.corpusVersion) {
    throw new ServiceError('INVALID_KNOWLEDGE_ARTIFACT', 400);
  }

  const indexVersion = options?.indexVersion ?? validatedManifest.indexVersion;
  if (typeof indexVersion !== 'string' || !INDEX_VERSION_PATTERN.test(indexVersion)) {
    throw new ServiceError('INVALID_KNOWLEDGE_ARTIFACT', 400);
  }

  let totalUtf8Bytes = 0;
  for (const chunk of validatedManifest.chunks) {
    const bytes = Buffer.byteLength(chunk.embeddingText, 'utf8');
    if (bytes < 1 || bytes > 4096) {
      throw new ServiceError('INVALID_KNOWLEDGE_ARTIFACT', 400);
    }
    totalUtf8Bytes += bytes;
  }

  const budgetEstimate = estimateIngestionAllowance({
    chunkCount: validatedManifest.chunks.length,
    totalUtf8Bytes,
    maxCalls: 1
  });

  const maxAllowanceMicros = options?.maxAllowanceMicros ?? MAX_INGESTION_RESERVATION_MICROS;
  if (
    typeof maxAllowanceMicros !== 'number' ||
    !Number.isSafeInteger(maxAllowanceMicros) ||
    maxAllowanceMicros < 1 ||
    maxAllowanceMicros > MAX_INGESTION_RESERVATION_MICROS
  ) {
    throw new ServiceError('INVALID_REQUEST', 400);
  }
  if (budgetEstimate.requiredCalls !== 1 || budgetEstimate.reservedMicros > maxAllowanceMicros) {
    throw new ServiceError('BUDGET_EXHAUSTED', 429);
  }

  return {
    indexVersion,
    corpusVersion: validatedManifest.corpusVersion,
    manifestSha256: validatedManifest.manifestSha256,
    embeddingModel: PINNED_EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    chunkCount: validatedManifest.chunks.length,
    totalUtf8Bytes,
    budgetEstimate
  };
}

function buildVectorsArtifact(
  manifest: KnowledgeChunksManifest,
  indexVersion: string,
  embeddings: ReadonlyArray<readonly number[]>
): VersionedVectorsArtifact {
  if (embeddings.length !== manifest.chunks.length) {
    throw new ServiceError('PROVIDER_RESPONSE_INVALID', 502, 'unknown');
  }
  const vectors: StoredChunkVectorEntry[] = manifest.chunks.map((chunk, idx) => {
    const rawVector = embeddings[idx];
    const vector = validateEmbeddingVector(rawVector, EMBEDDING_DIMENSIONS, 'PROVIDER_RESPONSE_INVALID');
    const key = vectorRecordKey(indexVersion, chunk.id);
    return {
      key,
      chunkId: chunk.id,
      claimId: chunk.claimId,
      projectId: chunk.projectId,
      roleId: chunk.roleId,
      kind: chunk.kind,
      deliveryStatus: chunk.deliveryStatus,
      contentSha256: chunk.contentSha256,
      vectorSha256: sha256Hex(canonicalJson(vector)),
      vector
    };
  });

  const base = {
    schemaVersion: '1.0.0' as const,
    indexVersion,
    corpusVersion: manifest.corpusVersion,
    manifestSha256: manifest.manifestSha256,
    embeddingModel: PINNED_EMBEDDING_MODEL as 'text-embedding-3-small',
    dimensions: EMBEDDING_DIMENSIONS as 1536,
    chunkCount: manifest.chunks.length,
    vectors
  };
  return {
    ...base,
    embeddingsSha256: digest(base)
  };
}

function validateVectorsArtifact(
  artifact: unknown,
  manifest: KnowledgeChunksManifest,
  expectedIndexVersion: string
): VersionedVectorsArtifact {
  if (!isSafePlainObject(artifact) || !isSafeJsonValue(artifact)) {
    throw new ServiceError('INDEX_INTEGRITY_ERROR', 502);
  }
  const a = artifact as unknown as VersionedVectorsArtifact;
  if (
    a.schemaVersion !== '1.0.0' ||
    a.indexVersion !== expectedIndexVersion ||
    a.corpusVersion !== manifest.corpusVersion ||
    a.manifestSha256 !== manifest.manifestSha256 ||
    a.embeddingModel !== PINNED_EMBEDDING_MODEL ||
    a.dimensions !== EMBEDDING_DIMENSIONS ||
    a.chunkCount !== manifest.chunks.length ||
    !Array.isArray(a.vectors) ||
    a.vectors.length !== manifest.chunks.length ||
    typeof a.embeddingsSha256 !== 'string' ||
    a.embeddingsSha256 !== digest(omitKey(a as unknown as Record<string, unknown>, 'embeddingsSha256'))
  ) {
    throw new ServiceError('INDEX_INTEGRITY_ERROR', 502);
  }

  for (let i = 0; i < manifest.chunks.length; i++) {
    const chunk = manifest.chunks[i]!;
    const entry = a.vectors[i];
    if (!isSafePlainObject(entry)) {
      throw new ServiceError('INDEX_INTEGRITY_ERROR', 502);
    }
    const expectedKey = vectorRecordKey(expectedIndexVersion, chunk.id);
    const vec = validateEmbeddingVector(entry.vector, EMBEDDING_DIMENSIONS, 'INDEX_INTEGRITY_ERROR');
    if (
      entry.key !== expectedKey ||
      entry.chunkId !== chunk.id ||
      entry.claimId !== chunk.claimId ||
      entry.projectId !== chunk.projectId ||
      entry.roleId !== chunk.roleId ||
      entry.kind !== chunk.kind ||
      entry.deliveryStatus !== chunk.deliveryStatus ||
      entry.contentSha256 !== chunk.contentSha256 ||
      entry.vectorSha256 !== sha256Hex(canonicalJson(vec))
    ) {
      throw new ServiceError('INDEX_INTEGRITY_ERROR', 502);
    }
  }
  return a;
}

function validateActivePointer(value: unknown): ActiveIndexPointer {
  if (!isSafePlainObject(value) || !isSafeJsonValue(value)) {
    throw new ServiceError('INDEX_INTEGRITY_ERROR', 502);
  }
  const p = value as unknown as ActiveIndexPointer;
  if (
    p.schemaVersion !== '1.0.0' ||
    typeof p.activeIndexVersion !== 'string' ||
    !INDEX_VERSION_PATTERN.test(p.activeIndexVersion) ||
    (p.previousIndexVersion !== null &&
      (typeof p.previousIndexVersion !== 'string' || !INDEX_VERSION_PATTERN.test(p.previousIndexVersion))) ||
    typeof p.corpusVersion !== 'string' ||
    !/^sha256:[0-9a-f]{64}$/.test(p.corpusVersion) ||
    typeof p.manifestSha256 !== 'string' ||
    !/^[0-9a-f]{64}$/.test(p.manifestSha256) ||
    typeof p.embeddingsSha256 !== 'string' ||
    !/^[0-9a-f]{64}$/.test(p.embeddingsSha256) ||
    p.embeddingModel !== PINNED_EMBEDDING_MODEL ||
    p.dimensions !== EMBEDDING_DIMENSIONS ||
    typeof p.vectorBucketName !== 'string' ||
    typeof p.indexName !== 'string' ||
    p.chunkCount !== EXPECTED_CHUNK_COUNT ||
    typeof p.activatedAt !== 'string' ||
    !Number.isFinite(Date.parse(p.activatedAt))
  ) {
    throw new ServiceError('INDEX_INTEGRITY_ERROR', 502);
  }
  validateVectorBucketName(p.vectorBucketName);
  validateVectorIndexName(p.indexName);
  return p;
}

async function verifyStoredVectorsMatch(
  vectorStore: S3VectorsStore,
  vectorBucketName: string,
  indexName: string,
  manifest: KnowledgeChunksManifest,
  vectorsArtifact: VersionedVectorsArtifact,
  indexVersion: string,
  signal?: AbortSignal
): Promise<void> {
  const expectedKeys = manifest.chunks.map(chunk => vectorRecordKey(indexVersion, chunk.id));
  const storedRecords: StoredVectorRecord[] = await vectorStore.getVectors(
    {
      vectorBucketName,
      indexName,
      keys: expectedKeys,
      returnData: true,
      returnMetadata: true
    },
    signal
  );

  if (storedRecords.length !== expectedKeys.length) {
    throw new ServiceError('INDEX_INTEGRITY_ERROR', 502);
  }
  const byKey = new Map<string, StoredVectorRecord>();
  for (const rec of storedRecords) {
    if (byKey.has(rec.key)) {
      throw new ServiceError('INDEX_INTEGRITY_ERROR', 502);
    }
    byKey.set(rec.key, rec);
  }

  for (let i = 0; i < manifest.chunks.length; i++) {
    const chunk = manifest.chunks[i]!;
    const expectedEntry = vectorsArtifact.vectors[i]!;
    const key = vectorRecordKey(indexVersion, chunk.id);
    const found = byKey.get(key);
    if (!found || !found.data || !found.metadata) {
      throw new ServiceError('INDEX_INTEGRITY_ERROR', 502);
    }
    const storedVec = validateEmbeddingVector(found.data.float32, EMBEDDING_DIMENSIONS, 'INDEX_INTEGRITY_ERROR');
    if (sha256Hex(canonicalJson(storedVec)) !== expectedEntry.vectorSha256) {
      throw new ServiceError('INDEX_INTEGRITY_ERROR', 502);
    }
    const meta = found.metadata;
    if (
      meta.indexVersion !== indexVersion ||
      meta.corpusVersion !== manifest.corpusVersion ||
      meta.chunkId !== chunk.id ||
      meta.claimId !== chunk.claimId ||
      meta.projectId !== chunk.projectId ||
      meta.roleId !== chunk.roleId ||
      meta.kind !== chunk.kind ||
      meta.deliveryStatus !== chunk.deliveryStatus ||
      meta.contentSha256 !== chunk.contentSha256
    ) {
      throw new ServiceError('INDEX_INTEGRITY_ERROR', 502);
    }
  }
}

async function activatePointerAndRecordHistory(params: {
  s3Store: S3ObjectStore;
  evidenceBucket: string;
  action: 'ingest' | 'rollback';
  indexVersion: string;
  corpusVersion: string;
  manifestSha256: string;
  embeddingsSha256: string;
  vectorBucketName: string;
  indexName: string;
  chunkCount: number;
  nowIso: string;
  signal?: AbortSignal;
}): Promise<ActiveIndexPointer> {
  const {
    s3Store,
    evidenceBucket,
    action,
    indexVersion,
    corpusVersion,
    manifestSha256,
    embeddingsSha256,
    vectorBucketName,
    indexName,
    chunkCount,
    nowIso,
    signal
  } = params;

  const existingPointerRaw = await s3Store.getJsonObject<unknown>(evidenceBucket, ACTIVE_POINTER_KEY, signal);
  let previousIndexVersion: string | null = null;
  if (existingPointerRaw !== undefined) {
    const existingPointer = validateActivePointer(existingPointerRaw);
    if (
      action === 'ingest' &&
      existingPointer.activeIndexVersion === indexVersion &&
      existingPointer.manifestSha256 === manifestSha256 &&
      existingPointer.embeddingsSha256 === embeddingsSha256 &&
      existingPointer.corpusVersion === corpusVersion &&
      existingPointer.vectorBucketName === vectorBucketName &&
      existingPointer.indexName === indexName
    ) {
      return existingPointer;
    }
    previousIndexVersion =
      existingPointer.activeIndexVersion !== indexVersion
        ? existingPointer.activeIndexVersion
        : existingPointer.previousIndexVersion;
  }

  const pointer: ActiveIndexPointer = {
    schemaVersion: '1.0.0',
    activeIndexVersion: indexVersion,
    previousIndexVersion,
    corpusVersion,
    manifestSha256,
    embeddingsSha256,
    embeddingModel: PINNED_EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    vectorBucketName,
    indexName,
    chunkCount,
    activatedAt: nowIso
  };

  const existingHistoryRaw = await s3Store.getJsonObject<unknown>(evidenceBucket, INDEX_HISTORY_KEY, signal);
  const existingEntries: IndexHistoryEntry[] =
    isSafePlainObject(existingHistoryRaw) && Array.isArray(existingHistoryRaw.entries)
      ? (existingHistoryRaw.entries as IndexHistoryEntry[]).slice(-31)
      : [];

  const historyArtifact: IndexHistoryArtifact = {
    schemaVersion: '1.0.0',
    entries: [
      ...existingEntries,
      {
        action,
        activeIndexVersion: indexVersion,
        previousIndexVersion,
        corpusVersion,
        manifestSha256,
        embeddingsSha256,
        timestamp: nowIso
      }
    ]
  };

  await s3Store.putJsonObject(evidenceBucket, INDEX_HISTORY_KEY, historyArtifact, signal);
  await s3Store.putJsonObject(evidenceBucket, ACTIVE_POINTER_KEY, pointer, signal);
  return pointer;
}

export async function ingestKnowledgeIndex(options: IngestKnowledgeOptions): Promise<IngestionResult> {
  if (!isSafePlainObject(options) || !isSafePlainObject(options.config)) {
    throw new ServiceError('CONFIGURATION_UNAVAILABLE', 503, 'not_started');
  }
  const { config, s3Store, vectorStore, signal } = options;
  if (!(s3Store instanceof S3ObjectStore) || !(vectorStore instanceof S3VectorsStore)) {
    throw new ServiceError('CONFIGURATION_UNAVAILABLE', 503, 'not_started');
  }

  const evidenceBucket = validateS3BucketName(options.evidenceBucket ?? config.evidenceBucket);
  const vectorBucketName = validateVectorBucketName(
    options.vectorBucketName ?? config.vectorBucket ?? DEFAULT_VECTOR_BUCKET_NAME
  );
  const indexName = validateVectorIndexName(
    options.indexName ?? config.vectorIndex ?? DEFAULT_VECTOR_INDEX_NAME
  );

  // Step 1: Validate Manifest, Corpus, and Budget Allowance BEFORE any network/provider call
  const dryRunPlan = planDryRunIngestion({
    corpus: options.corpus,
    cag: options.cag,
    chunksManifest: options.chunksManifest,
    indexVersion: options.indexVersion,
    maxAllowanceMicros: options.maxAllowanceMicros
  });

  const manifest = validateManifestOnly(options.chunksManifest ?? defaultChunksManifest);
  const indexVersion = dryRunPlan.indexVersion;
  const nowFn = options.now ?? Date.now;
  const nowIso = new Date(nowFn()).toISOString();

  // Step 2: Idempotency / Reuse Check (if force !== true)
  if (options.force !== true) {
    const existingManifestRaw = await s3Store.getJsonObject<unknown>(
      evidenceBucket,
      manifestObjectKey(indexVersion),
      signal
    );
    const existingVectorsRaw = await s3Store.getJsonObject<unknown>(
      evidenceBucket,
      vectorsObjectKey(indexVersion),
      signal
    );
    if (existingManifestRaw !== undefined && existingVectorsRaw !== undefined) {
      try {
        const storedManifest = validateManifestOnly(existingManifestRaw);
        if (
          storedManifest.manifestSha256 === manifest.manifestSha256 &&
          storedManifest.corpusVersion === manifest.corpusVersion
        ) {
          const storedVectors = validateVectorsArtifact(existingVectorsRaw, manifest, indexVersion);
          await verifyStoredVectorsMatch(
            vectorStore,
            vectorBucketName,
            indexName,
            manifest,
            storedVectors,
            indexVersion,
            signal
          );
          const pointer = await activatePointerAndRecordHistory({
            s3Store,
            evidenceBucket,
            action: 'ingest',
            indexVersion,
            corpusVersion: manifest.corpusVersion,
            manifestSha256: manifest.manifestSha256,
            embeddingsSha256: storedVectors.embeddingsSha256,
            vectorBucketName,
            indexName,
            chunkCount: manifest.chunks.length,
            nowIso,
            signal
          });
          return {
            indexVersion,
            corpusVersion: manifest.corpusVersion,
            manifestSha256: manifest.manifestSha256,
            embeddingsSha256: storedVectors.embeddingsSha256,
            chunkCount: manifest.chunks.length,
            reusedExisting: true,
            embeddingCalls: 0,
            reservedMicros: 0,
            chargedMicros: 0,
            pointer
          };
        }
      } catch {
        // Existing artifacts are incomplete or mismatched; proceed to fresh ingestion.
      }
    }
  }

  // Step 3: Bounded OpenAI Embedding via Cloudflare AI Gateway (single batch call of 14 chunks)
  const startedAt = nowFn();
  const embeddingTexts = manifest.chunks.map(chunk => chunk.embeddingText);
  const embeddingResult = await callEmbedding(
    {
      config,
      input: embeddingTexts,
      apiKey: options.openAiApiKey,
      gatewayToken: options.gatewayToken,
      signal,
      fetchImpl: options.fetchImpl
    },
    options.fetchImpl
  );
  const durationMs = Math.max(0, Math.round(nowFn() - startedAt));

  if (
    embeddingResult.model !== EMBEDDING_MODELS.openai[0] ||
    embeddingResult.dimensions !== EMBEDDING_DIMENSIONS ||
    embeddingResult.embeddings.length !== manifest.chunks.length
  ) {
    throw new ServiceError('PROVIDER_RESPONSE_INVALID', 502, 'unknown');
  }

  const vectorsArtifact = buildVectorsArtifact(manifest, indexVersion, embeddingResult.embeddings);
  const chargedMicros = embeddingUsageAllowance(embeddingResult.usage, true);
  const receipt = embeddingReceipt(`ingest-${indexVersion}`, durationMs, embeddingResult, true);

  // Step 4: Write Versioned S3 Artifacts & S3 Vectors BEFORE updating active-pointer.json
  await s3Store.putJsonObject(evidenceBucket, manifestObjectKey(indexVersion), manifest, signal);
  await s3Store.putJsonObject(evidenceBucket, vectorsObjectKey(indexVersion), vectorsArtifact, signal);

  await vectorStore.ensureVectorIndex(
    {
      vectorBucketName,
      indexName,
      dimension: EMBEDDING_DIMENSIONS,
      distanceMetric: 'cosine'
    },
    signal
  );

  await vectorStore.putVectors(
    {
      vectorBucketName,
      indexName,
      vectors: vectorsArtifact.vectors.map(entry => ({
        key: entry.key,
        vector: entry.vector,
        metadata: {
          indexVersion,
          corpusVersion: manifest.corpusVersion,
          chunkId: entry.chunkId,
          claimId: entry.claimId,
          projectId: entry.projectId,
          roleId: entry.roleId,
          kind: entry.kind,
          deliveryStatus: entry.deliveryStatus,
          contentSha256: entry.contentSha256
        } satisfies ChunkVectorMetadata
      }))
    },
    signal
  );

  // Post-write verification in S3 Vectors before switching pointer
  await verifyStoredVectorsMatch(
    vectorStore,
    vectorBucketName,
    indexName,
    manifest,
    vectorsArtifact,
    indexVersion,
    signal
  );

  // Step 5: Atomic Pointer Activation
  const pointer = await activatePointerAndRecordHistory({
    s3Store,
    evidenceBucket,
    action: 'ingest',
    indexVersion,
    corpusVersion: manifest.corpusVersion,
    manifestSha256: manifest.manifestSha256,
    embeddingsSha256: vectorsArtifact.embeddingsSha256,
    vectorBucketName,
    indexName,
    chunkCount: manifest.chunks.length,
    nowIso,
    signal
  });

  return {
    indexVersion,
    corpusVersion: manifest.corpusVersion,
    manifestSha256: manifest.manifestSha256,
    embeddingsSha256: vectorsArtifact.embeddingsSha256,
    chunkCount: manifest.chunks.length,
    reusedExisting: false,
    embeddingCalls: 1,
    reservedMicros: dryRunPlan.budgetEstimate.reservedMicros,
    chargedMicros,
    pointer,
    receipt
  };
}

export async function verifyKnowledgeIndex(
  options: VerifyKnowledgeIndexOptions
): Promise<VerifyKnowledgeIndexResult> {
  if (!isSafePlainObject(options)) {
    throw new ServiceError('INVALID_REQUEST', 400);
  }
  const { s3Store, vectorStore, signal } = options;
  if (!(s3Store instanceof S3ObjectStore) || !(vectorStore instanceof S3VectorsStore)) {
    throw new ServiceError('CONFIGURATION_UNAVAILABLE', 503);
  }
  const evidenceBucket = validateS3BucketName(options.evidenceBucket);

  const pointerRaw = await s3Store.getJsonObject<unknown>(evidenceBucket, ACTIVE_POINTER_KEY, signal);
  if (pointerRaw === undefined) {
    throw new ServiceError('INDEX_POINTER_MISSING', 404);
  }
  const pointer = validateActivePointer(pointerRaw);

  const targetVersion = options.indexVersion ?? pointer.activeIndexVersion;
  if (typeof targetVersion !== 'string' || !INDEX_VERSION_PATTERN.test(targetVersion)) {
    throw new ServiceError('INVALID_KNOWLEDGE_ARTIFACT', 400);
  }

  const vectorBucketName = validateVectorBucketName(options.vectorBucketName ?? pointer.vectorBucketName);
  const indexName = validateVectorIndexName(options.indexName ?? pointer.indexName);

  const manifestRaw = await s3Store.getJsonObject<unknown>(
    evidenceBucket,
    manifestObjectKey(targetVersion),
    signal
  );
  const vectorsRaw = await s3Store.getJsonObject<unknown>(
    evidenceBucket,
    vectorsObjectKey(targetVersion),
    signal
  );
  if (manifestRaw === undefined || vectorsRaw === undefined) {
    throw new ServiceError('INDEX_ARTIFACT_MISSING', 404);
  }

  const manifest = validateManifestOnly(manifestRaw);
  if (options.expectedCorpusVersion !== undefined && manifest.corpusVersion !== options.expectedCorpusVersion) {
    throw new ServiceError('CORPUS_VERSION_MISMATCH', 409);
  }

  const vectorsArtifact = validateVectorsArtifact(vectorsRaw, manifest, targetVersion);
  if (targetVersion === pointer.activeIndexVersion) {
    if (
      pointer.manifestSha256 !== manifest.manifestSha256 ||
      pointer.embeddingsSha256 !== vectorsArtifact.embeddingsSha256 ||
      pointer.corpusVersion !== manifest.corpusVersion
    ) {
      throw new ServiceError('INDEX_INTEGRITY_ERROR', 502);
    }
  }

  await verifyStoredVectorsMatch(
    vectorStore,
    vectorBucketName,
    indexName,
    manifest,
    vectorsArtifact,
    targetVersion,
    signal
  );

  return {
    verified: true,
    pointer,
    manifest,
    vectorsArtifact
  };
}

export async function rollbackKnowledgeIndex(
  options: RollbackKnowledgeIndexOptions
): Promise<RollbackKnowledgeIndexResult> {
  if (!isSafePlainObject(options)) {
    throw new ServiceError('INVALID_REQUEST', 400);
  }
  const { s3Store, vectorStore, signal } = options;
  if (!(s3Store instanceof S3ObjectStore) || !(vectorStore instanceof S3VectorsStore)) {
    throw new ServiceError('CONFIGURATION_UNAVAILABLE', 503);
  }
  const evidenceBucket = validateS3BucketName(options.evidenceBucket);

  const currentPointerRaw = await s3Store.getJsonObject<unknown>(evidenceBucket, ACTIVE_POINTER_KEY, signal);
  if (currentPointerRaw === undefined) {
    throw new ServiceError('INDEX_POINTER_MISSING', 404);
  }
  const currentPointer = validateActivePointer(currentPointerRaw);

  const targetIndexVersion = options.targetIndexVersion ?? currentPointer.previousIndexVersion;
  if (
    !targetIndexVersion ||
    typeof targetIndexVersion !== 'string' ||
    !INDEX_VERSION_PATTERN.test(targetIndexVersion) ||
    targetIndexVersion === currentPointer.activeIndexVersion
  ) {
    throw new ServiceError('ROLLBACK_TARGET_UNAVAILABLE', 409);
  }

  const vectorBucketName = validateVectorBucketName(options.vectorBucketName ?? currentPointer.vectorBucketName);
  const indexName = validateVectorIndexName(options.indexName ?? currentPointer.indexName);

  // Verify target version artifacts and all 14 S3 Vectors keys BEFORE changing active-pointer.json
  const verifiedTarget = await verifyKnowledgeIndex({
    evidenceBucket,
    vectorBucketName,
    indexName,
    indexVersion: targetIndexVersion,
    s3Store,
    vectorStore,
    signal
  });

  if (
    options.allowedCorpusVersions !== undefined &&
    !options.allowedCorpusVersions.includes(verifiedTarget.manifest.corpusVersion)
  ) {
    throw new ServiceError('CORPUS_VERSION_MISMATCH', 409);
  }

  const nowFn = options.now ?? Date.now;
  const nowIso = new Date(nowFn()).toISOString();

  const updatedPointer = await activatePointerAndRecordHistory({
    s3Store,
    evidenceBucket,
    action: 'rollback',
    indexVersion: targetIndexVersion,
    corpusVersion: verifiedTarget.manifest.corpusVersion,
    manifestSha256: verifiedTarget.manifest.manifestSha256,
    embeddingsSha256: verifiedTarget.vectorsArtifact.embeddingsSha256,
    vectorBucketName,
    indexName,
    chunkCount: verifiedTarget.manifest.chunks.length,
    nowIso,
    signal
  });

  return {
    rolledBackTo: targetIndexVersion,
    previousActiveIndexVersion: currentPointer.activeIndexVersion,
    pointer: updatedPointer
  };
}
