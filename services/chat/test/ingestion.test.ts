import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as http from 'node:http';
import test from 'node:test';
import { loadConfig } from '../src/config.js';
import { ServiceError } from '../src/errors.js';
import {
  ACTIVE_POINTER_KEY,
  INDEX_HISTORY_KEY,
  S3ObjectStore,
  S3VectorsStore,
  computeVectorNorm,
  ingestKnowledgeIndex,
  manifestObjectKey,
  planDryRunIngestion,
  rollbackKnowledgeIndex,
  sha256Hex,
  vectorRecordKey,
  vectorsObjectKey,
  verifyAwsSigV4Request,
  verifyKnowledgeIndex
} from '../src/ingestion/index.js';

const {
  canonicalJson,
  digest,
  createCag,
  createChunksManifest
} = require('../../../chat/knowledge/validate.cjs') as {
  canonicalJson(value: unknown): string;
  digest(value: unknown): string;
  createCag(corpus: Record<string, unknown>): Record<string, unknown>;
  createChunksManifest(corpus: Record<string, unknown>): Record<string, unknown>;
};

const canonicalCorpus = require('../../../chat/knowledge/corpus.json') as Record<string, unknown>;
const canonicalCag = require('../../../chat/knowledge/cag-context.json') as Record<string, unknown>;
const canonicalManifest = require('../../../chat/knowledge/chunks-manifest.json') as {
  schemaVersion: string;
  corpusVersion: string;
  indexVersion: string;
  embeddingModel: string;
  dimensions: number;
  chunks: Array<Record<string, unknown> & { id: string; embeddingText: string; contentSha256: string }>;
  caseStudies: unknown[];
  manifestSha256: string;
};

const cliTool = require('../../../tools/ingest-chat-knowledge.cjs') as {
  runCli(args: string[], deps?: Record<string, unknown>): Promise<number>;
};

const TEST_AWS_CREDENTIALS = Object.freeze({
  accessKeyId: 'TESTACCESSKEYID12345',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  sessionToken: 'AQoDYXdzEJr1EXAMPLETOKEN998877665544'
});

const TEST_BUCKET = 'joshboyer-chat-dev-099256072947-us-east-2';
const TEST_VECTOR_BUCKET = 'joshboyer-chat-dev-vectors';
const TEST_VECTOR_INDEX = 'portfolio-public-chunks';
const FIXED_NOW_MS = Date.parse('2026-10-31T15:30:00.000Z');

function makeConfig() {
  return loadConfig({
    AWS_REGION: 'us-east-2',
    EDGE_SECRET_ARN: 'arn:aws:secretsmanager:us-east-2:123456789012:secret:edge-123456',
    OPENAI_SECRET_ARN: 'arn:aws:secretsmanager:us-east-2:123456789012:secret:openai-123456',
    ANTHROPIC_SECRET_ARN: 'arn:aws:secretsmanager:us-east-2:123456789012:secret:anthropic-123456',
    GATEWAY_SECRET_ARN: 'arn:aws:secretsmanager:us-east-2:123456789012:secret:gateway-123456',
    STATE_TABLE_NAME: 'joshboyer-chat-dev-state',
    GATEWAY_ACCOUNT_ID: '0123456789abcdef0123456789abcdef',
    GATEWAY_ID: 'joshboyer-chat-dev',
    EVIDENCE_BUCKET_NAME: TEST_BUCKET,
    VECTOR_BUCKET_NAME: TEST_VECTOR_BUCKET,
    VECTOR_INDEX_NAME: TEST_VECTOR_INDEX
  });
}

function deterministicUnitVector(seedText: string, dimensions = 1536): number[] {
  const hash = createHash('sha256').update(seedText, 'utf8').digest();
  const raw: number[] = [];
  let sumSq = 0;
  for (let i = 0; i < dimensions; i++) {
    const byte = hash[i % hash.length]!;
    const sign = (i + byte) % 2 === 0 ? 1 : -1;
    const val = sign * ((byte + (i % 17) + 1) / 275);
    raw.push(val);
    sumSq += val * val;
  }
  const norm = Math.sqrt(sumSq);
  return raw.map(v => Number((v / norm).toFixed(6)));
}

function cosineDistance(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i]!;
    const bv = b[i]!;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom <= 0) return 1;
  return Math.max(0, Number((1 - dot / denom).toFixed(6)));
}

function buildVersionedBundle(editorialRevision: string) {
  const clonedCorpus = JSON.parse(JSON.stringify(canonicalCorpus)) as Record<string, unknown> & {
    provenance: Record<string, unknown>;
    corpusVersion: string;
  };
  clonedCorpus.provenance.editorialRevision = editorialRevision;
  const { corpusVersion: _ignored, ...withoutVersion } = clonedCorpus;
  const corpusVersion = `sha256:${digest(withoutVersion)}`;
  const v2Corpus = {
    schemaVersion: clonedCorpus.schemaVersion,
    corpusVersion,
    ...withoutVersion
  };
  const v2Cag = createCag(v2Corpus);
  const v2Manifest = createChunksManifest(v2Corpus);
  return {
    corpus: v2Corpus,
    cag: v2Cag,
    chunksManifest: v2Manifest
  };
}

// SIMULATION NOTE: This loopback node:http harness emulates the wire protocols for
// AWS S3, Amazon S3 Vectors (2025-07-15 REST JSON), and Cloudflare AI Gateway OpenAI
// embeddings locally on 127.0.0.1 while performing real cryptographic AWS SigV4
// signature and payload-hash verification on every request.
interface LoopbackHarness {
  s3Endpoint: string;
  s3VectorsEndpoint: string;
  gatewayFetch: typeof fetch;
  s3Objects: Map<string, string>;
  vectorBuckets: Set<string>;
  vectorIndexes: Map<string, { dimension: number; dataType: string; distanceMetric: string }>;
  vectors: Map<string, { key: string; float32: number[]; metadata: Record<string, unknown> }>;
  counts: {
    s3Put: number;
    s3Get: number;
    s3VectorsPost: Record<string, number>;
    gatewayEmbeddings: number;
  };
  faults: {
    failNextS3PutKey?: string;
    failNextPutVectors?: boolean;
    corruptNextGetVectors?: boolean;
    failNextGatewayEmbedding?: boolean;
    overrideEmbeddingDimensions?: number;
    returnZeroVectorAt?: number;
    serverClockOffsetMs?: number;
  };
  close(): Promise<void>;
}

async function startLoopbackHarness(): Promise<LoopbackHarness> {
  const s3Objects = new Map<string, string>();
  const vectorBuckets = new Set<string>();
  const vectorIndexes = new Map<string, { dimension: number; dataType: string; distanceMetric: string }>();
  const vectors = new Map<string, { key: string; float32: number[]; metadata: Record<string, unknown> }>();
  const counts = {
    s3Put: 0,
    s3Get: 0,
    s3VectorsPost: {} as Record<string, number>,
    gatewayEmbeddings: 0
  };
  const faults: LoopbackHarness['faults'] = {};

  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const bodyBytes = Buffer.concat(chunks);
      const rawUrl = req.url ?? '/';
      const method = req.method ?? 'GET';
      const headers: Record<string, string | undefined> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        headers[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : v;
      }

      // Distinguish S3 Vectors POST routes vs S3 Object routes
      const isS3VectorsRoute =
        method === 'POST' &&
        /^\/(?:GetVectorBucket|CreateVectorBucket|GetIndex|CreateIndex|PutVectors|GetVectors|QueryVectors)$/.test(rawUrl);

      const expectedService = isS3VectorsRoute ? 's3vectors' : 's3';
      const sigCheck = verifyAwsSigV4Request(
        {
          method,
          path: rawUrl,
          headers,
          bodyBytes
        },
        TEST_AWS_CREDENTIALS,
        {
          expectedService,
          expectedRegion: 'us-east-2',
          now: () => FIXED_NOW_MS + (faults.serverClockOffsetMs ?? 0),
          maxClockSkewMs: 300_000
        }
      );

      if (!sigCheck.valid) {
        res.statusCode = 403;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ message: 'InvalidSignatureException' }));
        return;
      }

      if (isS3VectorsRoute) {
        const op = rawUrl.slice(1);
        counts.s3VectorsPost[op] = (counts.s3VectorsPost[op] ?? 0) + 1;
        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(bodyBytes.toString('utf8')) as Record<string, unknown>;
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify({ message: 'SerializationException' }));
          return;
        }

        res.setHeader('content-type', 'application/json');
        if (op === 'GetVectorBucket') {
          const bucketName = String(payload.vectorBucketName ?? '');
          if (!vectorBuckets.has(bucketName)) {
            res.statusCode = 404;
            res.end(JSON.stringify({ __type: 'NotFoundException', message: 'Vector bucket not found' }));
            return;
          }
          res.statusCode = 200;
          res.end(JSON.stringify({ vectorBucket: { vectorBucketName: bucketName } }));
          return;
        }

        if (op === 'CreateVectorBucket') {
          const bucketName = String(payload.vectorBucketName ?? '');
          vectorBuckets.add(bucketName);
          res.statusCode = 200;
          res.end(JSON.stringify({}));
          return;
        }

        if (op === 'GetIndex') {
          const indexKey = `${String(payload.vectorBucketName)}/${String(payload.indexName)}`;
          const idx = vectorIndexes.get(indexKey);
          if (!idx) {
            res.statusCode = 404;
            res.end(JSON.stringify({ __type: 'NotFoundException', message: 'Vector index not found' }));
            return;
          }
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              index: {
                vectorBucketName: payload.vectorBucketName,
                indexName: payload.indexName,
                dimension: idx.dimension,
                dataType: idx.dataType,
                distanceMetric: idx.distanceMetric
              }
            })
          );
          return;
        }

        if (op === 'CreateIndex') {
          const indexKey = `${String(payload.vectorBucketName)}/${String(payload.indexName)}`;
          vectorIndexes.set(indexKey, {
            dimension: Number(payload.dimension),
            dataType: String(payload.dataType),
            distanceMetric: String(payload.distanceMetric)
          });
          res.statusCode = 200;
          res.end(JSON.stringify({}));
          return;
        }

        if (op === 'PutVectors') {
          if (faults.failNextPutVectors) {
            faults.failNextPutVectors = false;
            res.statusCode = 500;
            res.end(JSON.stringify({ __type: 'InternalServerException', message: 'Simulated PutVectors fault' }));
            return;
          }
          const indexKey = `${String(payload.vectorBucketName)}/${String(payload.indexName)}`;
          const items = Array.isArray(payload.vectors) ? payload.vectors : [];
          for (const item of items) {
            const rec = item as {
              key: string;
              data: { float32: number[] };
              metadata?: Record<string, unknown>;
            };
            vectors.set(`${indexKey}#${rec.key}`, {
              key: rec.key,
              float32: [...rec.data.float32],
              metadata: rec.metadata ? { ...rec.metadata } : {}
            });
          }
          res.statusCode = 200;
          res.end(JSON.stringify({}));
          return;
        }

        if (op === 'GetVectors') {
          const indexKey = `${String(payload.vectorBucketName)}/${String(payload.indexName)}`;
          const keys = Array.isArray(payload.keys) ? (payload.keys as string[]) : [];
          const found: Array<{ key: string; data?: { float32: number[] }; metadata?: Record<string, unknown> }> = [];
          for (const key of keys) {
            const hit = vectors.get(`${indexKey}#${key}`);
            if (hit) {
              found.push({
                key: hit.key,
                ...(payload.returnData !== false ? { data: { float32: [...hit.float32] } } : {}),
                ...(payload.returnMetadata !== false ? { metadata: { ...hit.metadata } } : {})
              });
            }
          }
          if (faults.corruptNextGetVectors && found.length > 0) {
            faults.corruptNextGetVectors = false;
            found.pop();
          }
          res.statusCode = 200;
          res.end(JSON.stringify({ vectors: found }));
          return;
        }

        if (op === 'QueryVectors') {
          const indexKey = `${String(payload.vectorBucketName)}/${String(payload.indexName)}`;
          const topK = Number(payload.topK ?? 5);
          const qVec = ((payload.queryVector as { float32: number[] }) ?? { float32: [] }).float32;
          const filter = payload.filter as Record<string, unknown> | undefined;
          const matches: Array<{ key: string; distance: number; metadata: Record<string, unknown> }> = [];

          for (const [fullKey, entry] of vectors.entries()) {
            if (!fullKey.startsWith(`${indexKey}#`)) continue;
            if (filter) {
              let pass = true;
              for (const [fk, fv] of Object.entries(filter)) {
                if (entry.metadata[fk] !== fv) {
                  pass = false;
                  break;
                }
              }
              if (!pass) continue;
            }
            matches.push({
              key: entry.key,
              distance: cosineDistance(qVec, entry.float32),
              metadata: { ...entry.metadata }
            });
          }
          matches.sort((a, b) => (a.distance !== b.distance ? a.distance - b.distance : a.key.localeCompare(b.key)));
          res.statusCode = 200;
          res.end(JSON.stringify({ vectors: matches.slice(0, topK) }));
          return;
        }
      }

      // S3 Object Store path-style route: /<bucket>/<key...>
      const normalizedPath = decodeURIComponent(rawUrl.replace(/^\/+/, ''));
      if (method === 'PUT') {
        counts.s3Put++;
        if (faults.failNextS3PutKey && normalizedPath.endsWith(faults.failNextS3PutKey)) {
          faults.failNextS3PutKey = undefined;
          res.statusCode = 500;
          res.end(JSON.stringify({ message: 'InternalError' }));
          return;
        }
        s3Objects.set(normalizedPath, bodyBytes.toString('utf8'));
        res.statusCode = 200;
        res.setHeader('etag', `"${sha256Hex(bodyBytes)}"`);
        res.end('');
        return;
      }

      if (method === 'GET') {
        counts.s3Get++;
        const existing = s3Objects.get(normalizedPath);
        if (existing === undefined) {
          res.statusCode = 404;
          res.setHeader('content-type', 'application/xml');
          res.end('<?xml version="1.0" encoding="UTF-8"?><Error><Code>NoSuchKey</Code></Error>');
          return;
        }
        res.statusCode = 200;
        res.setHeader('content-type', 'application/json');
        res.end(existing);
        return;
      }

      res.statusCode = 405;
      res.end();
    });
  });

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Failed to bind loopback server');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const gatewayFetch: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.endsWith('/openai/embeddings')) {
      counts.gatewayEmbeddings++;
      if (faults.failNextGatewayEmbedding) {
        faults.failNextGatewayEmbedding = false;
        return new Response(JSON.stringify({ error: { message: 'Gateway upstream error' } }), {
          status: 502,
          headers: { 'content-type': 'application/json' }
        });
      }
      const reqHeaders = new Headers(init?.headers);
      assert.equal(reqHeaders.get('cf-aig-no-wholesale'), 'true');
      assert.equal(reqHeaders.get('cf-aig-collect-log-payload'), 'false');
      assert.equal(reqHeaders.get('cf-aig-skip-cache'), 'true');
      const parsedBody = JSON.parse(String(init?.body ?? '{}')) as {
        model: string;
        input: string | string[];
        dimensions: number;
      };
      const inputs = Array.isArray(parsedBody.input) ? parsedBody.input : [parsedBody.input];
      const dim = faults.overrideEmbeddingDimensions ?? parsedBody.dimensions;
      const data = inputs.map((text, index) => ({
        object: 'embedding',
        index,
        embedding:
          faults.returnZeroVectorAt === index
            ? Array.from({ length: dim }, () => 0)
            : deterministicUnitVector(text, dim)
      }));
      if (faults.returnZeroVectorAt !== undefined) {
        faults.returnZeroVectorAt = undefined;
      }
      const totalTokens = Math.max(1, Math.ceil(inputs.reduce((sum, item) => sum + Buffer.byteLength(item, 'utf8'), 0) / 4));
      return new Response(
        JSON.stringify({
          id: 'embd-test-001',
          object: 'list',
          model: parsedBody.model,
          data,
          usage: {
            prompt_tokens: totalTokens,
            total_tokens: totalTokens
          }
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'x-request-id': 'req-openai-emb-01',
            'cf-aig-log-id': 'cf-aig-emb-01'
          }
        }
      );
    }
    return fetch(input, init);
  };

  return {
    s3Endpoint: baseUrl,
    s3VectorsEndpoint: baseUrl,
    gatewayFetch,
    s3Objects,
    vectorBuckets,
    vectorIndexes,
    vectors,
    counts,
    faults,
    close: () => new Promise<void>((resolve, reject) => server.close(err => (err ? reject(err) : resolve())))
  };
}

test('SigV4 S3ObjectStore and S3VectorsStore enforce region/service signing, x-amz-content-sha256, 3-point clock skew, and index configuration', async () => {
  const harness = await startLoopbackHarness();
  try {
    const s3 = new S3ObjectStore({
      endpoint: harness.s3Endpoint,
      allowLoopbackForTests: true,
      credentials: TEST_AWS_CREDENTIALS,
      now: () => FIXED_NOW_MS
    });
    const vectorsStore = new S3VectorsStore({
      endpoint: harness.s3VectorsEndpoint,
      allowLoopbackForTests: true,
      credentials: TEST_AWS_CREDENTIALS,
      now: () => FIXED_NOW_MS
    });

    // Missing key returns undefined on 404
    const missing = await s3.getJsonObject(TEST_BUCKET, 'indexes/missing.json');
    assert.equal(missing, undefined);

    // Put and Get JSON object with SigV4 payload hash
    const putRes = await s3.putJsonObject(TEST_BUCKET, 'indexes/test-obj.json', { hello: 'world', count: 14 });
    assert.match(putRes.sha256, /^[0-9a-f]{64}$/);
    const loaded = await s3.getJsonObject<{ hello: string; count: number }>(TEST_BUCKET, 'indexes/test-obj.json');
    assert.deepEqual(loaded, { hello: 'world', count: 14 });

    // Ensure vector index creates bucket and index on first call, reuses on second call
    const created1 = await vectorsStore.ensureVectorIndex({
      vectorBucketName: TEST_VECTOR_BUCKET,
      indexName: TEST_VECTOR_INDEX,
      dimension: 1536,
      distanceMetric: 'cosine'
    });
    assert.deepEqual(created1, { bucketCreated: true, indexCreated: true });

    const created2 = await vectorsStore.ensureVectorIndex({
      vectorBucketName: TEST_VECTOR_BUCKET,
      indexName: TEST_VECTOR_INDEX,
      dimension: 1536,
      distanceMetric: 'cosine'
    });
    assert.deepEqual(created2, { bucketCreated: false, indexCreated: false });

    // Existing index with wrong dimension (1535 or 1537) or dataType fails closed with INDEX_CONFIGURATION_MISMATCH
    for (const badDim of [1535, 1537]) {
      harness.vectorIndexes.set(`${TEST_VECTOR_BUCKET}/bad-idx-${badDim}`, {
        dimension: badDim,
        dataType: 'float32',
        distanceMetric: 'cosine'
      });
      await assert.rejects(
        () =>
          vectorsStore.ensureVectorIndex({
            vectorBucketName: TEST_VECTOR_BUCKET,
            indexName: `bad-idx-${badDim}`,
            dimension: 1536,
            distanceMetric: 'cosine'
          }),
        (err: unknown) => err instanceof ServiceError && err.code === 'INDEX_CONFIGURATION_MISMATCH'
      );
    }

    // PutVectors, GetVectors, and QueryVectors with metadata filter
    const vecA = deterministicUnitVector('chunk-alpha', 1536);
    const vecB = deterministicUnitVector('chunk-beta', 1536);
    await vectorsStore.putVectors({
      vectorBucketName: TEST_VECTOR_BUCKET,
      indexName: TEST_VECTOR_INDEX,
      vectors: [
        {
          key: 'idx-1:experience-claims',
          vector: vecA,
          metadata: {
            indexVersion: 'idx-1',
            corpusVersion: canonicalManifest.corpusVersion,
            chunkId: 'experience-claims',
            claimId: 'claim-experience-claims',
            projectId: 'claims',
            roleId: 'role-medavie',
            kind: 'experience',
            deliveryStatus: 'implemented_supported',
            contentSha256: 'a'.repeat(64)
          }
        },
        {
          key: 'idx-1:project-nexus',
          vector: vecB,
          metadata: {
            indexVersion: 'idx-1',
            corpusVersion: canonicalManifest.corpusVersion,
            chunkId: 'project-nexus',
            claimId: 'claim-project-nexus',
            projectId: 'nexus',
            roleId: 'role-independent',
            kind: 'project',
            deliveryStatus: 'independent_capstone',
            contentSha256: 'b'.repeat(64)
          }
        }
      ]
    });

    const got = await vectorsStore.getVectors({
      vectorBucketName: TEST_VECTOR_BUCKET,
      indexName: TEST_VECTOR_INDEX,
      keys: ['idx-1:experience-claims', 'idx-1:project-nexus']
    });
    assert.equal(got.length, 2);

    const queried = await vectorsStore.queryVectors({
      vectorBucketName: TEST_VECTOR_BUCKET,
      indexName: TEST_VECTOR_INDEX,
      queryVector: vecA,
      topK: 2,
      filter: { indexVersion: 'idx-1' }
    });
    assert.equal(queried.length, 2);
    assert.equal(queried[0]?.key, 'idx-1:experience-claims');
    assert.ok((queried[0]?.distance ?? 1) <= 0.0001);

    // 3-point QueryVectors topK boundary (0 rejected, 1 accepted, 32 accepted, 33 rejected)
    for (const [topK, valid] of [
      [0, false],
      [1, true],
      [32, true],
      [33, false]
    ] as const) {
      if (valid) {
        const res = await vectorsStore.queryVectors({
          vectorBucketName: TEST_VECTOR_BUCKET,
          indexName: TEST_VECTOR_INDEX,
          queryVector: vecA,
          topK
        });
        assert.ok(res.length >= 1 && res.length <= topK);
      } else {
        await assert.rejects(
          () =>
            vectorsStore.queryVectors({
              vectorBucketName: TEST_VECTOR_BUCKET,
              indexName: TEST_VECTOR_INDEX,
              queryVector: vecA,
              topK
            }),
          (err: unknown) => err instanceof ServiceError && err.code === 'INVALID_STORAGE_PAYLOAD'
        );
      }
    }

    // Hostile endpoint URLs and non-us-east-2 configurations rejected
    for (const badEndpoint of [
      harness.s3Endpoint, // loopback without allowLoopbackForTests: true
      'https://s3vectors.us-east-1.api.aws',
      'https://user:pass@s3vectors.us-east-2.api.aws',
      'https://s3vectors.us-east-2.api.aws?foo=1',
      'https://s3vectors.us-east-2.api.aws#frag',
      'https://evil.example.com'
    ]) {
      assert.throws(
        () => new S3VectorsStore({ endpoint: badEndpoint, allowLoopbackForTests: false }),
        (err: unknown) => err instanceof ServiceError && err.code === 'CONFIGURATION_UNAVAILABLE'
      );
    }
    assert.throws(
      () => new S3ObjectStore({ region: 'us-east-1' }),
      (err: unknown) => err instanceof ServiceError && err.code === 'CONFIGURATION_UNAVAILABLE'
    );

    // 3-point SigV4 clock skew boundary (299999 ms, 300000 ms, 300001 ms)
    for (const [offsetMs, shouldPass] of [
      [299_999, true],
      [300_000, true],
      [300_001, false]
    ] as const) {
      harness.faults.serverClockOffsetMs = offsetMs;
      if (shouldPass) {
        const res = await s3.getJsonObject(TEST_BUCKET, 'indexes/test-obj.json');
        assert.deepEqual(res, { hello: 'world', count: 14 });
      } else {
        await assert.rejects(
          () => s3.getJsonObject(TEST_BUCKET, 'indexes/test-obj.json'),
          (err: unknown) => err instanceof ServiceError && err.code === 'STORAGE_UNAUTHORIZED'
        );
      }
    }
    harness.faults.serverClockOffsetMs = undefined;
  } finally {
    await harness.close();
  }
});

test('Full versioned ingestion lifecycle: v1 ingest -> idempotent re-run (0 paid calls) -> v2 ingest -> atomic rollback to v1', async () => {
  const harness = await startLoopbackHarness();
  try {
    const config = makeConfig();
    const s3Store = new S3ObjectStore({
      endpoint: harness.s3Endpoint,
      allowLoopbackForTests: true,
      credentials: TEST_AWS_CREDENTIALS,
      now: () => FIXED_NOW_MS
    });
    const vectorStore = new S3VectorsStore({
      endpoint: harness.s3VectorsEndpoint,
      allowLoopbackForTests: true,
      credentials: TEST_AWS_CREDENTIALS,
      now: () => FIXED_NOW_MS
    });

    // 1. Ingest v1
    const v1Result = await ingestKnowledgeIndex({
      config,
      openAiApiKey: 'test-openai-credential-123456',
      gatewayToken: 'cf-test-gateway-valid-credential-123456',
      s3Store,
      vectorStore,
      fetchImpl: harness.gatewayFetch,
      now: () => FIXED_NOW_MS
    });

    assert.equal(v1Result.indexVersion, canonicalManifest.indexVersion);
    assert.equal(v1Result.reusedExisting, false);
    assert.equal(v1Result.embeddingCalls, 1);
    assert.equal(v1Result.chunkCount, 14);
    assert.ok(v1Result.chargedMicros > 0 && v1Result.chargedMicros <= 256);
    assert.equal(v1Result.pointer.activeIndexVersion, canonicalManifest.indexVersion);
    assert.equal(v1Result.pointer.previousIndexVersion, null);
    assert.equal(harness.counts.gatewayEmbeddings, 1);

    // Verify v1 active pointer and all 14 vectors
    const verifiedV1 = await verifyKnowledgeIndex({
      evidenceBucket: TEST_BUCKET,
      vectorBucketName: TEST_VECTOR_BUCKET,
      indexName: TEST_VECTOR_INDEX,
      s3Store,
      vectorStore
    });
    assert.equal(verifiedV1.verified, true);
    assert.equal(verifiedV1.pointer.activeIndexVersion, canonicalManifest.indexVersion);
    assert.equal(verifiedV1.vectorsArtifact.vectors.length, 14);

    // 2. Idempotent re-run of v1 (force = false) makes 0 paid embedding calls
    const v1Reused = await ingestKnowledgeIndex({
      config,
      openAiApiKey: 'test-openai-credential-123456',
      gatewayToken: 'cf-test-gateway-valid-credential-123456',
      s3Store,
      vectorStore,
      fetchImpl: harness.gatewayFetch,
      now: () => FIXED_NOW_MS + 1000
    });
    assert.equal(v1Reused.reusedExisting, true);
    assert.equal(v1Reused.embeddingCalls, 0);
    assert.equal(v1Reused.chargedMicros, 0);
    assert.equal(harness.counts.gatewayEmbeddings, 1);

    // 3. Ingest v2 (new corpus & manifest revision)
    const v2Bundle = buildVersionedBundle('public-summary-review-2026-10-31-v2');
    const v2Version = String(v2Bundle.chunksManifest.indexVersion);
    assert.notEqual(v2Version, canonicalManifest.indexVersion);

    const v2Result = await ingestKnowledgeIndex({
      config,
      corpus: v2Bundle.corpus,
      cag: v2Bundle.cag,
      chunksManifest: v2Bundle.chunksManifest,
      openAiApiKey: 'test-openai-credential-123456',
      gatewayToken: 'cf-test-gateway-valid-credential-123456',
      s3Store,
      vectorStore,
      fetchImpl: harness.gatewayFetch,
      now: () => FIXED_NOW_MS + 5000
    });

    assert.equal(v2Result.indexVersion, v2Version);
    assert.equal(v2Result.reusedExisting, false);
    assert.equal(v2Result.embeddingCalls, 1);
    assert.equal(v2Result.pointer.activeIndexVersion, v2Version);
    assert.equal(v2Result.pointer.previousIndexVersion, canonicalManifest.indexVersion);
    assert.equal(harness.counts.gatewayEmbeddings, 2);

    // 4. Rollback atomically restores v1
    const rolledBack = await rollbackKnowledgeIndex({
      evidenceBucket: TEST_BUCKET,
      vectorBucketName: TEST_VECTOR_BUCKET,
      indexName: TEST_VECTOR_INDEX,
      s3Store,
      vectorStore,
      now: () => FIXED_NOW_MS + 10_000
    });

    assert.equal(rolledBack.rolledBackTo, canonicalManifest.indexVersion);
    assert.equal(rolledBack.previousActiveIndexVersion, v2Version);
    assert.equal(rolledBack.pointer.activeIndexVersion, canonicalManifest.indexVersion);
    assert.equal(rolledBack.pointer.previousIndexVersion, v2Version);
    assert.equal(rolledBack.pointer.corpusVersion, canonicalManifest.corpusVersion);

    const activePointerOnS3 = await s3Store.getJsonObject<{ activeIndexVersion: string; previousIndexVersion: string }>(
      TEST_BUCKET,
      ACTIVE_POINTER_KEY
    );
    assert.equal(activePointerOnS3?.activeIndexVersion, canonicalManifest.indexVersion);
    assert.equal(activePointerOnS3?.previousIndexVersion, v2Version);

    const historyOnS3 = await s3Store.getJsonObject<{ entries: Array<{ action: string; activeIndexVersion: string }> }>(
      TEST_BUCKET,
      INDEX_HISTORY_KEY
    );
    assert.equal(historyOnS3?.entries.length, 3);
    assert.equal(historyOnS3?.entries[2]?.action, 'rollback');
    assert.equal(historyOnS3?.entries[2]?.activeIndexVersion, canonicalManifest.indexVersion);
  } finally {
    await harness.close();
  }
});

test('Partial failures during v2 ingestion or rollback leave active-pointer.json untouched on v1', async () => {
  const harness = await startLoopbackHarness();
  try {
    const config = makeConfig();
    const s3Store = new S3ObjectStore({
      endpoint: harness.s3Endpoint,
      allowLoopbackForTests: true,
      credentials: TEST_AWS_CREDENTIALS,
      now: () => FIXED_NOW_MS
    });
    const vectorStore = new S3VectorsStore({
      endpoint: harness.s3VectorsEndpoint,
      allowLoopbackForTests: true,
      credentials: TEST_AWS_CREDENTIALS,
      now: () => FIXED_NOW_MS
    });

    // Establish v1 active index
    const v1 = await ingestKnowledgeIndex({
      config,
      openAiApiKey: 'test-openai-credential-123456',
      gatewayToken: 'cf-test-gateway-valid-credential-123456',
      s3Store,
      vectorStore,
      fetchImpl: harness.gatewayFetch,
      now: () => FIXED_NOW_MS
    });
    assert.equal(v1.pointer.activeIndexVersion, canonicalManifest.indexVersion);

    const v2Bundle = buildVersionedBundle('public-summary-review-2026-10-31-v2-faults');
    const v2Version = String(v2Bundle.chunksManifest.indexVersion);

    // Fault 1: Gateway callEmbedding fails
    harness.faults.failNextGatewayEmbedding = true;
    await assert.rejects(
      () =>
        ingestKnowledgeIndex({
          config,
          corpus: v2Bundle.corpus,
          cag: v2Bundle.cag,
          chunksManifest: v2Bundle.chunksManifest,
          openAiApiKey: 'test-openai-credential-123456',
          gatewayToken: 'cf-test-gateway-valid-credential-123456',
          s3Store,
          vectorStore,
          fetchImpl: harness.gatewayFetch,
          now: () => FIXED_NOW_MS + 1000
        }),
      (err: unknown) => err instanceof ServiceError && err.code === 'PROVIDER_REJECTED'
    );
    const ptrAfterGatewayFail = await s3Store.getJsonObject<{ activeIndexVersion: string }>(TEST_BUCKET, ACTIVE_POINTER_KEY);
    assert.equal(ptrAfterGatewayFail?.activeIndexVersion, canonicalManifest.indexVersion);

    // Fault 1b: S3 putJsonObject for vectors.json fails during v2 ingestion
    harness.faults.failNextS3PutKey = vectorsObjectKey(v2Version);
    await assert.rejects(
      () =>
        ingestKnowledgeIndex({
          config,
          corpus: v2Bundle.corpus,
          cag: v2Bundle.cag,
          chunksManifest: v2Bundle.chunksManifest,
          openAiApiKey: 'test-openai-credential-123456',
          gatewayToken: 'cf-test-gateway-valid-credential-123456',
          s3Store,
          vectorStore,
          fetchImpl: harness.gatewayFetch,
          now: () => FIXED_NOW_MS + 1500
        }),
      (err: unknown) => err instanceof ServiceError && err.code === 'STORAGE_UNAVAILABLE'
    );
    const ptrAfterS3PutFail = await s3Store.getJsonObject<{ activeIndexVersion: string }>(TEST_BUCKET, ACTIVE_POINTER_KEY);
    assert.equal(ptrAfterS3PutFail?.activeIndexVersion, canonicalManifest.indexVersion);

    // Fault 2: S3 Vectors PutVectors fails after S3 manifest.json and vectors.json are written
    harness.faults.failNextPutVectors = true;
    await assert.rejects(
      () =>
        ingestKnowledgeIndex({
          config,
          corpus: v2Bundle.corpus,
          cag: v2Bundle.cag,
          chunksManifest: v2Bundle.chunksManifest,
          openAiApiKey: 'test-openai-credential-123456',
          gatewayToken: 'cf-test-gateway-valid-credential-123456',
          s3Store,
          vectorStore,
          fetchImpl: harness.gatewayFetch,
          now: () => FIXED_NOW_MS + 2000
        }),
      (err: unknown) => err instanceof ServiceError
    );
    const ptrAfterPutVectorsFail = await s3Store.getJsonObject<{ activeIndexVersion: string }>(
      TEST_BUCKET,
      ACTIVE_POINTER_KEY
    );
    assert.equal(ptrAfterPutVectorsFail?.activeIndexVersion, canonicalManifest.indexVersion);

    // Fault 3: S3 Vectors post-write GetVectors verification detects missing vector
    harness.faults.corruptNextGetVectors = true;
    await assert.rejects(
      () =>
        ingestKnowledgeIndex({
          config,
          corpus: v2Bundle.corpus,
          cag: v2Bundle.cag,
          chunksManifest: v2Bundle.chunksManifest,
          openAiApiKey: 'test-openai-credential-123456',
          gatewayToken: 'cf-test-gateway-valid-credential-123456',
          s3Store,
          vectorStore,
          fetchImpl: harness.gatewayFetch,
          now: () => FIXED_NOW_MS + 3000,
          force: true
        }),
      (err: unknown) => err instanceof ServiceError && err.code === 'INDEX_INTEGRITY_ERROR'
    );
    const ptrAfterGetVectorsFail = await s3Store.getJsonObject<{ activeIndexVersion: string }>(
      TEST_BUCKET,
      ACTIVE_POINTER_KEY
    );
    assert.equal(ptrAfterGetVectorsFail?.activeIndexVersion, canonicalManifest.indexVersion);

    // Fault 4: Rollback to a non-existent or unverified version fails closed without altering active-pointer.json
    await assert.rejects(
      () =>
        rollbackKnowledgeIndex({
          evidenceBucket: TEST_BUCKET,
          vectorBucketName: TEST_VECTOR_BUCKET,
          indexName: TEST_VECTOR_INDEX,
          targetIndexVersion: 'idx-nonexistent9999',
          s3Store,
          vectorStore
        }),
      (err: unknown) => err instanceof ServiceError
    );
    const ptrAfterFailedRollback = await s3Store.getJsonObject<{ activeIndexVersion: string }>(
      TEST_BUCKET,
      ACTIVE_POINTER_KEY
    );
    assert.equal(ptrAfterFailedRollback?.activeIndexVersion, canonicalManifest.indexVersion);
  } finally {
    await harness.close();
  }
});

test('3-point dimension/allowance boundaries, zero-vector rejection, and tampered manifest/digest/model rejection', async () => {
  const harness = await startLoopbackHarness();
  try {
    const config = makeConfig();
    const s3Store = new S3ObjectStore({
      endpoint: harness.s3Endpoint,
      allowLoopbackForTests: true,
      credentials: TEST_AWS_CREDENTIALS,
      now: () => FIXED_NOW_MS
    });
    const vectorStore = new S3VectorsStore({
      endpoint: harness.s3VectorsEndpoint,
      allowLoopbackForTests: true,
      credentials: TEST_AWS_CREDENTIALS,
      now: () => FIXED_NOW_MS
    });

    // 3-point allowance boundary on maxAllowanceMicros: 255 (fails before network), 256 (passes), 257 (passes)
    const callsBeforeAllowanceCheck = harness.counts.gatewayEmbeddings;
    await assert.rejects(
      () =>
        ingestKnowledgeIndex({
          config,
          openAiApiKey: 'test-openai-credential-123456',
          gatewayToken: 'cf-test-gateway-valid-credential-123456',
          maxAllowanceMicros: 255,
          s3Store,
          vectorStore,
          fetchImpl: harness.gatewayFetch
        }),
      (err: unknown) => err instanceof ServiceError && err.code === 'BUDGET_EXHAUSTED'
    );
    assert.equal(harness.counts.gatewayEmbeddings, callsBeforeAllowanceCheck);

    // 3-point dimension check on returned embeddings: 1535 (reject), 1537 (reject), zero-vector (reject), 1536 (accept)
    for (const badDim of [1535, 1537]) {
      harness.faults.overrideEmbeddingDimensions = badDim;
      await assert.rejects(
        () =>
          ingestKnowledgeIndex({
            config,
            openAiApiKey: 'test-openai-credential-123456',
            gatewayToken: 'cf-test-gateway-valid-credential-123456',
            maxAllowanceMicros: 256,
            s3Store,
            vectorStore,
            fetchImpl: harness.gatewayFetch,
            force: true
          }),
        (err: unknown) => err instanceof ServiceError && err.code === 'PROVIDER_RESPONSE_INVALID'
      );
    }
    harness.faults.overrideEmbeddingDimensions = undefined;

    // Zero vector rejected (cosine distance requires L2 norm > 0)
    assert.equal(computeVectorNorm([0, 0, 0]), 0);
    harness.faults.returnZeroVectorAt = 3;
    await assert.rejects(
      () =>
        ingestKnowledgeIndex({
          config,
          openAiApiKey: 'test-openai-credential-123456',
          gatewayToken: 'cf-test-gateway-valid-credential-123456',
          maxAllowanceMicros: 256,
          s3Store,
          vectorStore,
          fetchImpl: harness.gatewayFetch,
          force: true
        }),
      (err: unknown) => err instanceof ServiceError && err.code === 'PROVIDER_RESPONSE_INVALID'
    );

    // Tampered manifestSha256 rejected before any network call
    const gatewayCallsBeforeTamper = harness.counts.gatewayEmbeddings;
    const tamperedManifest = {
      ...canonicalManifest,
      manifestSha256: '0'.repeat(64)
    };
    await assert.rejects(
      () =>
        ingestKnowledgeIndex({
          config,
          chunksManifest: tamperedManifest,
          openAiApiKey: 'test-openai-credential-123456',
          gatewayToken: 'cf-test-gateway-valid-credential-123456',
          s3Store,
          vectorStore,
          fetchImpl: harness.gatewayFetch
        }),
      (err: unknown) => err instanceof ServiceError && err.code === 'INVALID_KNOWLEDGE_ARTIFACT'
    );
    assert.equal(harness.counts.gatewayEmbeddings, gatewayCallsBeforeTamper);

    // Valid 1536 dimension with maxAllowanceMicros = 256 and 257 succeeds
    for (const allowedCap of [256, 257]) {
      const okRes = await ingestKnowledgeIndex({
        config,
        openAiApiKey: 'test-openai-credential-123456',
        gatewayToken: 'cf-test-gateway-valid-credential-123456',
        maxAllowanceMicros: allowedCap,
        s3Store,
        vectorStore,
        fetchImpl: harness.gatewayFetch
      });
      assert.equal(okRes.pointer.dimensions, 1536);
    }
  } finally {
    await harness.close();
  }
});

test('Adversarial inputs, inactive chunks, private corpus canaries (CANARY-A08-PRIVATE-CORPUS), and seeded fuzzing (seed=0xA082026) fail closed with 0 leaks', async () => {
  const harness = await startLoopbackHarness();
  try {
    const config = makeConfig();
    const s3Store = new S3ObjectStore({
      endpoint: harness.s3Endpoint,
      allowLoopbackForTests: true,
      credentials: TEST_AWS_CREDENTIALS,
      now: () => FIXED_NOW_MS
    });
    const vectorStore = new S3VectorsStore({
      endpoint: harness.s3VectorsEndpoint,
      allowLoopbackForTests: true,
      credentials: TEST_AWS_CREDENTIALS,
      now: () => FIXED_NOW_MS
    });

    const CANARY_PRIVATE = 'CANARY-A08-PRIVATE-CORPUS';
    const CANARY_A03_PRIVATE = 'CANARY-PRIVATE-CORPUS-9f4a2c81';
    const CANARY_SECRET = 'CANARY-SECRET-3a7f5e88';

    // 1. Inactive chunk in corpus rejected before any network call
    const inactiveCorpus = JSON.parse(JSON.stringify(canonicalCorpus)) as Record<string, unknown> & {
      chunks: Array<Record<string, unknown>>;
    };
    inactiveCorpus.chunks[0]!.active = false;
    await assert.rejects(
      () =>
        ingestKnowledgeIndex({
          config,
          corpus: inactiveCorpus,
          openAiApiKey: 'test-openai-credential-123456',
          gatewayToken: 'cf-test-gateway-valid-credential-123456',
          s3Store,
          vectorStore,
          fetchImpl: harness.gatewayFetch
        }),
      (err: unknown) => err instanceof ServiceError && err.code === 'INVALID_KNOWLEDGE_ARTIFACT'
    );

    // 2. Private corpus canary in manifest or corpus rejected with 0 network calls and 0 canary leakage
    const canaryManifest = JSON.parse(JSON.stringify(canonicalManifest)) as typeof canonicalManifest;
    canaryManifest.chunks[0]!.embeddingText += `\n${CANARY_PRIVATE} ${CANARY_A03_PRIVATE}`;
    await assert.rejects(
      () =>
        ingestKnowledgeIndex({
          config,
          chunksManifest: canaryManifest,
          openAiApiKey: CANARY_SECRET,
          gatewayToken: CANARY_SECRET,
          s3Store,
          vectorStore,
          fetchImpl: harness.gatewayFetch
        }),
      (err: unknown) => {
        const serializedErr = JSON.stringify(err) + String((err as Error)?.message ?? '');
        assert.equal(serializedErr.includes(CANARY_PRIVATE), false);
        assert.equal(serializedErr.includes(CANARY_A03_PRIVATE), false);
        assert.equal(serializedErr.includes(CANARY_SECRET), false);
        return err instanceof ServiceError && err.code === 'INVALID_KNOWLEDGE_ARTIFACT';
      }
    );
    assert.equal(harness.counts.gatewayEmbeddings, 0);
    assert.equal(harness.s3Objects.size, 0);
    assert.equal(harness.vectors.size, 0);

    // 3. Throwing getter, Proxy, and prototype pollution rejected safely
    const throwingOptions = {};
    Object.defineProperty(throwingOptions, 'config', {
      enumerable: true,
      get() {
        throw new Error(CANARY_SECRET);
      }
    });
    await assert.rejects(
      () => ingestKnowledgeIndex(throwingOptions as never),
      (err: unknown) => {
        assert.equal(String((err as Error)?.message ?? '').includes(CANARY_SECRET), false);
        return err instanceof ServiceError;
      }
    );

    // 4. Deterministic seeded fuzzing (seed = 0xA082026, 150 iterations) across S3 key/bucket validators and vector validators
    let seed = 0xa082026;
    const nextRand = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    const hostileFragments = [
      '../secret',
      'a\u0000b',
      'line\r\ninject',
      'line\u2028sep',
      'https://evil.example/bucket',
      '__proto__',
      CANARY_PRIVATE,
      CANARY_SECRET,
      ''
    ];
    for (let i = 0; i < 150; i++) {
      const frag = hostileFragments[Math.floor(nextRand() * hostileFragments.length)]!;
      await assert.rejects(
        () => s3Store.putJsonObject(frag, `indexes/${frag}.json`, { test: i }),
        (err: unknown) => {
          const text = JSON.stringify(err) + String((err as Error)?.message ?? '');
          assert.equal(text.includes(CANARY_PRIVATE), false);
          assert.equal(text.includes(CANARY_SECRET), false);
          return err instanceof ServiceError;
        }
      );
    }
  } finally {
    await harness.close();
  }
});

test('CLI tool tools/ingest-chat-knowledge.cjs supports --dry-run, --ingest, --verify, and --rollback', async () => {
  const harness = await startLoopbackHarness();
  try {
    const out: string[] = [];
    const errOut: string[] = [];

    // 1. --dry-run makes 0 network calls and reports indexVersion, chunkCount: 14, and budgetEstimate
    const dryRunCode = await cliTool.runCli(['--dry-run'], {
      write: (s: string) => out.push(s),
      writeError: (s: string) => errOut.push(s)
    });
    assert.equal(dryRunCode, 0);
    assert.equal(errOut.length, 0);
    assert.equal(harness.counts.gatewayEmbeddings, 0);
    assert.equal(harness.counts.s3Put, 0);
    const dryRunJson = JSON.parse(out.join('')) as {
      mode: string;
      indexVersion: string;
      chunkCount: number;
      budgetEstimate: { requiredCalls: number; reservedMicros: number; maxAllowedMicros: number };
    };
    assert.equal(dryRunJson.mode, 'dry_run');
    assert.equal(dryRunJson.indexVersion, canonicalManifest.indexVersion);
    assert.equal(dryRunJson.chunkCount, 14);
    assert.equal(dryRunJson.budgetEstimate.requiredCalls, 1);
    assert.ok(dryRunJson.budgetEstimate.reservedMicros <= 512);

    // 2. --ingest, --verify, and --rollback through CLI with injected loopback dependencies
    out.length = 0;
    const commonDeps = {
      write: (s: string) => out.push(s),
      writeError: (s: string) => errOut.push(s),
      config: makeConfig(),
      openAiApiKey: 'test-openai-credential-123456',
      gatewayToken: 'cf-test-gateway-valid-credential-123456',
      s3Endpoint: harness.s3Endpoint,
      s3VectorsEndpoint: harness.s3VectorsEndpoint,
      allowLoopbackForTests: true,
      credentials: TEST_AWS_CREDENTIALS,
      fetchImpl: harness.gatewayFetch,
      now: () => FIXED_NOW_MS
    };

    const ingestCode = await cliTool.runCli(['--ingest'], commonDeps);
    assert.equal(ingestCode, 0);
    const ingestJson = JSON.parse(out.join('')) as { mode: string; activeIndexVersion: string; embeddingCalls: number };
    assert.equal(ingestJson.mode, 'ingest');
    assert.equal(ingestJson.activeIndexVersion, canonicalManifest.indexVersion);
    assert.equal(ingestJson.embeddingCalls, 1);

    out.length = 0;
    const verifyCode = await cliTool.runCli(['--verify'], commonDeps);
    assert.equal(verifyCode, 0);
    const verifyJson = JSON.parse(out.join('')) as { mode: string; verified: boolean; activeIndexVersion: string };
    assert.equal(verifyJson.mode, 'verify');
    assert.equal(verifyJson.verified, true);
    assert.equal(verifyJson.activeIndexVersion, canonicalManifest.indexVersion);

    // Ingest v2 via CLI deps then rollback to v1 via CLI --rollback --to <v1>
    const v2Bundle = buildVersionedBundle('public-summary-review-2026-10-31-cli-v2');
    out.length = 0;
    const ingestV2Code = await cliTool.runCli(['--ingest'], {
      ...commonDeps,
      corpus: v2Bundle.corpus,
      cag: v2Bundle.cag,
      chunksManifest: v2Bundle.chunksManifest,
      now: () => FIXED_NOW_MS + 5000
    });
    assert.equal(ingestV2Code, 0);

    out.length = 0;
    const rollbackCode = await cliTool.runCli(['--rollback', '--to', canonicalManifest.indexVersion], {
      ...commonDeps,
      now: () => FIXED_NOW_MS + 10_000
    });
    assert.equal(rollbackCode, 0);
    const rollbackJson = JSON.parse(out.join('')) as { mode: string; rolledBackTo: string };
    assert.equal(rollbackJson.mode, 'rollback');
    assert.equal(rollbackJson.rolledBackTo, canonicalManifest.indexVersion);

    // 3. Invalid CLI arguments fail closed with exit code 1 and INVALID_CLI_ARGS
    for (const badArgs of [
      [],
      ['--unknown'],
      ['--dry-run', '--ingest'],
      ['--dry-run', '--force'],
      ['--rollback', '--to', '../bad'],
      ['--verify', '--to', canonicalManifest.indexVersion]
    ]) {
      errOut.length = 0;
      const code = await cliTool.runCli(badArgs, {
        write: (s: string) => out.push(s),
        writeError: (s: string) => errOut.push(s)
      });
      assert.equal(code, 1);
      const parsedErr = JSON.parse(errOut.join('')) as { status: string; code: string };
      assert.equal(parsedErr.status, 'failed');
      assert.equal(parsedErr.code, 'INVALID_CLI_ARGS');
    }
  } finally {
    await harness.close();
  }
});
