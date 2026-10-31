import assert from 'node:assert/strict';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import test from 'node:test';
import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClient,
  ScanCommand
} from '@aws-sdk/client-dynamodb';
import { createWorker } from '../../edge/src/worker.js';
import { createMcpHttpHandler, verifySigV4Request } from '../../portfolio-mcp/src/server.js';
import { AwsNonces, createAwsPhase4Clients, type SecretReader } from '../src/aws.js';
import { PHASE4_PRICE_VERSION } from '../src/budget-policy.js';
import { CAG_VERSION, type StreamFrame } from '../src/cag.js';
import {
  prepareChat,
  publicChatError,
  type ChatSettings
} from '../src/chat.js';
import { loadConfig, type Provider } from '../src/config.js';
import { canonicalEnvelope, type RequestEvent } from '../src/envelope.js';
import {
  ingestKnowledgeIndex,
  S3ObjectStore,
  S3VectorsStore,
  sha256Hex,
  verifyAwsSigV4Request,
  type AwsCredentials
} from '../src/ingestion/index.js';
import { authenticateChat } from '../src/private-request.js';
import { AwsChatState, type StateLimits } from '../src/state.js';
import { validateTrace, type TracePoint } from '../src/trace.js';
import { CONFIG, KEY, KEYRING, NOW, fixtures } from './fixtures.js';

const CANONICAL_PHASE4_STAGES = [
  'routing',
  'budget',
  'retrieval',
  'mcp',
  'context',
  'provider',
  'validation',
  'settlement'
] as const;

const REPO_ROOT = path.resolve(__dirname, '../../..');
const DIST_ROOT = path.join(REPO_ROOT, 'dist');
const DYNAMODB_ENDPOINT = process.env.CHAT_TEST_DYNAMODB_ENDPOINT || 'http://127.0.0.1:8008';

const ORIGIN = 'https://chat-preview.joshboyer.ca';
const TOKEN = 'operator-access-token-0000000000000000000000000000';
const TEST_REGION = 'us-east-2';
const TEST_BUCKET = 'joshboyer-chat-dev-099256072947-us-east-2';
const TEST_VECTOR_BUCKET = 'joshboyer-chat-dev-vectors';
const TEST_VECTOR_INDEX = 'portfolio-public-chunks';

const TEST_AWS_CREDENTIALS: AwsCredentials = Object.freeze({
  accessKeyId: 'TESTACCESSKEYID12345',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  sessionToken: 'AQoDYXdzEJr1EXAMPLETOKEN998877665544'
});

const CANARY_JOB_TEXT = 'CANARY-P4-JOB-991827';
const CANARY_S3_ERROR = 'CANARY-S3-ERR-774102';
const CANARY_MCP_ERROR = 'CANARY-MCP-ERR-883920';
const CANARY_HOSTILE_INPUT = 'CANARY-HOSTILE-INPUT-551209';

function createTestDynamoClient(): DynamoDBClient {
  return new DynamoDBClient({
    region: TEST_REGION,
    endpoint: DYNAMODB_ENDPOINT,
    maxAttempts: 1,
    credentials: { accessKeyId: 'local', secretAccessKey: 'local' }
  });
}

function deterministicEmbeddingForText(text: string, dimensions = 1536): number[] {
  const lower = text.toLowerCase();
  const values = new Array<number>(dimensions).fill(0);

  const conceptMatchers: Array<[number, RegExp]> = [
    [0, /\b(nexus|capstone|multi-agent|orchestration|lowkey|workshop42|workshop 42)\b/i],
    [1, /\b(kafka|broker|real-time|realtime|event table|rest consumer|provider|medavie|claims|synchronization)\b/i],
    [2, /\b(renewal|renewals|80%|40%|60%|residential|farm|agri|commercial|october 30)\b/i],
    [3, /\b(takeover|vba|excel|add-in|addin|xml batch|reconciliation|onboarding|guidewire)\b/i],
    [4, /\b(continuity|interim sql|compatibility extract|modernization|payment team|financial)\b/i],
    [5, /\b(architect|job title|dell|september 2006|2009|2022|2014|2016|analyst transition|timeline|harris)\b/i],
    [6, /\b(portal|broker|inquiry|newbusiness|upload|grenville)\b/i]
  ];

  let matchedConcepts = 0;
  for (const [slot, regex] of conceptMatchers) {
    if (regex.test(lower)) {
      values[slot] = 100.0;
      matchedConcepts += 1;
    }
  }

  const seed = createHash('sha256').update(lower, 'utf8').digest();
  let sumSquares = values.reduce((acc, v) => acc + v * v, 0);
  for (let i = 16; i < dimensions; i += 1) {
    const byte = seed[i % seed.length] ?? 0;
    const raw = ((byte + ((i * 17) & 0xff)) % 251) - 125;
    const val = (raw === 0 ? 1 : raw) * (matchedConcepts > 0 ? 0.01 : 0.1);
    values[i] = val;
    sumSquares += val * val;
  }

  const norm = Math.sqrt(sumSquares);
  return values.map(v => Number((v / norm).toFixed(6)));
}

function cosineDistance(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom <= 0) return 1;
  return Math.max(0, Number((1 - dot / denom).toFixed(6)));
}

function readableFromEvents(events: AsyncIterable<string>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of events) {
          controller.enqueue(encoder.encode(event));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });
}

function parseFrames(streamText: string): StreamFrame[] {
  return streamText
    .trim()
    .split('\n\n')
    .filter(Boolean)
    .map(block => {
      const dataLine = block
        .split('\n')
        .find(line => line.startsWith('data: '));
      assert.ok(dataLine, `Expected data line in SSE block: ${block}`);
      return JSON.parse(dataLine.slice(6)) as StreamFrame;
    });
}

function parseTraces(streamText: string, requestId: string, generation: string): TracePoint[] {
  const frames = parseFrames(streamText);
  const traces: TracePoint[] = [];
  frames.forEach((frame, index) => {
    assert.equal(frame.requestId, requestId);
    assert.equal(frame.generation, generation);
    assert.equal(frame.seq, index + 1);
    if (frame.event === 'trace') {
      traces.push(frame.data as TracePoint);
    }
  });
  const nonSettlement = traces.filter(point => point.stage !== 'settlement');
  if (nonSettlement.length > 0) {
    validateTrace(nonSettlement);
  }
  return traces;
}

function buildSelectionPayload(options: {
  kind: 'portfolio' | 'general';
  text: string;
  suggestions: string[];
  claimIds: string[];
  noticeCodes?: string[];
}): string {
  return JSON.stringify({
    schemaVersion: '1.0.0',
    corpusVersion: CAG_VERSION,
    kind: options.kind,
    text: options.text,
    suggestions: options.suggestions,
    claimIds: options.claimIds,
    noticeCodes: options.noticeCodes ?? []
  });
}

function buildProviderHttpResponse(
  provider: Provider,
  selectionJson: string,
  unknownUsage = false
): Response {
  const body =
    provider === 'openai'
      ? {
          id: 'resp-phase4-01',
          model: CONFIG.models.openai,
          status: 'completed',
          output: [{ type: 'message', content: [{ type: 'output_text', text: selectionJson }] }],
          usage: unknownUsage
            ? {}
            : {
                input_tokens: 100,
                output_tokens: 10,
                total_tokens: 110,
                input_tokens_details: { cached_tokens: 0 },
                output_tokens_details: { reasoning_tokens: 0 }
              }
        }
      : {
          id: 'msg-phase4-01',
          model: CONFIG.models.anthropic,
          stop_reason: 'end_turn',
          content: [{ type: 'text', text: selectionJson }],
          usage: unknownUsage
            ? {}
            : {
                input_tokens: 100,
                output_tokens: 10,
                cache_read_input_tokens: 0,
                cache_creation_input_tokens: 0
              }
        };

  return Response.json(body, {
    status: 200,
    headers: {
      'cf-aig-log-id': 'cf-gw-phase4-log-01',
      'x-request-id': 'openai-req-phase4-01',
      'request-id': 'anthropic-req-phase4-01'
    }
  });
}

interface Phase4HarnessOptions {
  limits?: Partial<StateLimits>;
  settings?: Partial<ChatSettings>;
  failOpenai?: boolean;
  unknownUsage?: boolean;
}

interface CapturedProviderPayload {
  provider: Provider;
  userContext: {
    untrusted_question: string;
    untrusted_conversation: unknown[];
    approved_retrieved_chunks?: Array<{ id: string; claimId: string; title: string }>;
    approved_mcp_results?: Array<{ name: string; toolCallId: string; output: unknown }>;
    system_degraded_notices?: string[];
  };
}

/**
 * End-to-end Phase 4 qualification harness:
 * - Real DynamoDB Local table for `AwsNonces` and `AwsChatState`
 * - Real loopback HTTP server with AWS SigV4 verification for S3 (`s3`),
 *   Amazon S3 Vectors (`s3vectors`), and `PortfolioMcpServer` (`execute-api`)
 * - Real `ingestKnowledgeIndex` seeding the 25 canonical portfolio chunks & vectors
 * - Real `createWorker` -> `privateChat` -> `authenticateChat` -> `prepareChat` -> `createAwsPhase4Clients`
 * - Simulation boundary: Cloudflare AI Gateway (`/openai/embeddings`, `/openai/responses`, `/anthropic/v1/messages`)
 *   is emulated at the `fetchImpl` boundary with strict Gateway header verification.
 */
async function withPhase4Harness(
  run: (harness: {
    send: (method: string, reqPath: string, body?: unknown) => Promise<Response>;
    raw: (method: string, reqPath: string, body?: unknown, cookie?: string) => Promise<Response>;
    originInvoke: (event: RequestEvent) => Promise<{ statusCode: number; body?: unknown; streamText?: string }>;
    recreateOriginRuntime: () => void;
    cookies: Map<string, string>;
    counts: {
      s3GetPointer: number;
      s3GetManifest: number;
      s3GetChunks: number;
      s3PutObject: number;
      vectorsPut: number;
      vectorsQuery: number;
      mcpHttpCalls: number;
      mcpToolsCalled: string[];
      gatewayEmbeddings: number;
      providerCalls: Provider[];
      sigV4VerifiedServices: string[];
    };
    faults: {
      s3Status: number;
      vectorsStatus: number;
      mcpStatus: number;
      embeddingStatus: number;
      failOpenai: boolean;
      unknownUsage: boolean;
    };
    capturedPrompts: CapturedProviderPayload[];
    scanRows: () => Promise<Record<string, { S?: string; N?: string }>[]>;
    advanceClockMs: (deltaMs: number) => void;
    nowSeconds: () => number;
    tableName: string;
  }) => Promise<void>,
  options: Phase4HarnessOptions = {}
): Promise<void> {
  const dynamoClient = createTestDynamoClient();
  const tableName = `chat-phase4-${randomUUID()}`;
  await dynamoClient.send(
    new CreateTableCommand({
      TableName: tableName,
      BillingMode: 'PAY_PER_REQUEST',
      AttributeDefinitions: [
        { AttributeName: 'pk', AttributeType: 'S' },
        { AttributeName: 'sk', AttributeType: 'S' }
      ],
      KeySchema: [
        { AttributeName: 'pk', KeyType: 'HASH' },
        { AttributeName: 'sk', KeyType: 'RANGE' }
      ]
    })
  );

  let currentNowMs = NOW * 1000;
  const s3Objects = new Map<string, string>();
  const vectorBuckets = new Set<string>();
  const vectorIndexes = new Map<string, { dimension: number; dataType: string; distanceMetric: string }>();
  const vectorStore = new Map<string, { key: string; float32: number[]; metadata: Record<string, unknown> }>();

  const counts = {
    s3GetPointer: 0,
    s3GetManifest: 0,
    s3GetChunks: 0,
    s3PutObject: 0,
    vectorsPut: 0,
    vectorsQuery: 0,
    mcpHttpCalls: 0,
    mcpToolsCalled: [] as string[],
    gatewayEmbeddings: 0,
    providerCalls: [] as Provider[],
    sigV4VerifiedServices: [] as string[]
  };

  const faults = {
    s3Status: 0,
    vectorsStatus: 0,
    mcpStatus: 0,
    embeddingStatus: 0,
    failOpenai: Boolean(options.failOpenai),
    unknownUsage: Boolean(options.unknownUsage)
  };

  const capturedPrompts: CapturedProviderPayload[] = [];

  const mcpHandler = createMcpHttpHandler({
    requireIamContext: false,
    requireSigV4: true,
    sigV4Credentials: TEST_AWS_CREDENTIALS,
    now: () => currentNowMs,
    onReceipt: receipt => {
      if (receipt.mcpMethod === 'tools/call' && receipt.toolName) {
        counts.mcpToolsCalled.push(receipt.toolName);
      }
    }
  });

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('connection', 'close');
    const rawUrl = req.url ?? '/';
    const method = req.method ?? 'GET';

    if (rawUrl === '/api/chat/_mcp' || rawUrl === '/dev/api/chat/_mcp') {
      counts.mcpHttpCalls += 1;
      if (faults.mcpStatus > 0) {
        res.statusCode = faults.mcpStatus;
        res.setHeader('content-type', 'application/json');
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            error: {
              code: -32000,
              message: `Upstream MCP failure ${CANARY_MCP_ERROR}`,
              data: { code: 'TOOL_EXECUTION_FAILED', retryable: true }
            }
          })
        );
        return;
      }

      // Inspect SigV4 header before delegating to real createMcpHttpHandler
      const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
      if (authHeader.includes('/execute-api/aws4_request')) {
        counts.sigV4VerifiedServices.push('execute-api');
      }
      mcpHandler(req, res);
      return;
    }

    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const bodyBytes = Buffer.concat(chunks);
      const headers: Record<string, string | undefined> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        headers[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : v;
      }

      const isS3VectorsRoute =
        method === 'POST' &&
        /^\/(?:GetVectorBucket|CreateVectorBucket|GetIndex|CreateIndex|PutVectors|GetVectors|QueryVectors)$/.test(rawUrl);
      const expectedService = isS3VectorsRoute ? 's3vectors' : 's3';
      const sigCheck = verifyAwsSigV4Request(
        { method, path: rawUrl, headers, bodyBytes },
        TEST_AWS_CREDENTIALS,
        {
          expectedService,
          expectedRegion: TEST_REGION,
          now: () => currentNowMs,
          maxClockSkewMs: 300_000
        }
      );

      if (!sigCheck.valid) {
        res.statusCode = 403;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ message: 'InvalidSignatureException' }));
        return;
      }
      counts.sigV4VerifiedServices.push(expectedService);

      if (isS3VectorsRoute) {
        const op = rawUrl.slice(1);
        const payload = JSON.parse(bodyBytes.toString('utf8')) as Record<string, unknown>;
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
          vectorBuckets.add(String(payload.vectorBucketName ?? ''));
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
          counts.vectorsPut += 1;
          const indexKey = `${String(payload.vectorBucketName)}/${String(payload.indexName)}`;
          const items = Array.isArray(payload.vectors) ? payload.vectors : [];
          for (const item of items) {
            const rec = item as {
              key: string;
              data: { float32: number[] };
              metadata?: Record<string, unknown>;
            };
            vectorStore.set(`${indexKey}#${rec.key}`, {
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
          const found: Array<{
            key: string;
            data?: { float32: number[] };
            metadata?: Record<string, unknown>;
          }> = [];
          for (const key of keys) {
            const hit = vectorStore.get(`${indexKey}#${key}`);
            if (hit) {
              found.push({
                key: hit.key,
                ...(payload.returnData !== false ? { data: { float32: [...hit.float32] } } : {}),
                ...(payload.returnMetadata !== false ? { metadata: { ...hit.metadata } } : {})
              });
            }
          }
          res.statusCode = 200;
          res.end(JSON.stringify({ vectors: found }));
          return;
        }

        if (op === 'QueryVectors') {
          counts.vectorsQuery += 1;
          if (faults.vectorsStatus > 0) {
            res.statusCode = faults.vectorsStatus;
            res.end(
              JSON.stringify({
                __type: 'ServiceUnavailableException',
                message: `S3Vectors failure ${CANARY_S3_ERROR}`
              })
            );
            return;
          }
          const indexKey = `${String(payload.vectorBucketName)}/${String(payload.indexName)}`;
          const topK = Number(payload.topK ?? 5);
          const qVec = ((payload.queryVector as { float32: number[] }) ?? { float32: [] }).float32;
          const matches: Array<{
            key: string;
            distance: number;
            metadata: Record<string, unknown>;
          }> = [];
          for (const [fullKey, entry] of vectorStore.entries()) {
            if (!fullKey.startsWith(`${indexKey}#`)) continue;
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

      const normalizedPath = decodeURIComponent(rawUrl.replace(/^\/+/, ''));
      if (method === 'PUT') {
        counts.s3PutObject += 1;
        s3Objects.set(normalizedPath, bodyBytes.toString('utf8'));
        res.statusCode = 200;
        res.setHeader('etag', `"${sha256Hex(bodyBytes)}"`);
        res.end('');
        return;
      }

      if (method === 'GET') {
        if (normalizedPath.endsWith('/indexes/active-pointer.json')) {
          counts.s3GetPointer += 1;
        } else if (normalizedPath.endsWith('/manifest.json')) {
          counts.s3GetManifest += 1;
        } else if (normalizedPath.endsWith('/chunks.json')) {
          counts.s3GetChunks += 1;
        }

        if (faults.s3Status > 0) {
          res.statusCode = faults.s3Status;
          res.setHeader('content-type', 'application/xml');
          res.end(
            `<?xml version="1.0" encoding="UTF-8"?><Error><Code>ServiceUnavailable</Code><Message>${CANARY_S3_ERROR}</Message></Error>`
          );
          return;
        }

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

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;
  const endpointUrl = `http://127.0.0.1:${address.port}`;

  const oldPrivate = process.env.CHAT_PRIVATE_ENABLED;
  const oldPublic = process.env.PUBLIC_CHAT_ENABLED;
  process.env.CHAT_PRIVATE_ENABLED = 'true';
  process.env.PUBLIC_CHAT_ENABLED = 'false';

  const config = {
    ...loadConfig({
      AWS_REGION: TEST_REGION,
      EDGE_SECRET_ARN: CONFIG.edgeSecretArn,
      OPENAI_SECRET_ARN: CONFIG.providerSecretArns.openai,
      ANTHROPIC_SECRET_ARN: CONFIG.providerSecretArns.anthropic,
      GATEWAY_SECRET_ARN: CONFIG.gatewaySecretArn,
      STATE_TABLE_NAME: tableName,
      GATEWAY_ACCOUNT_ID: CONFIG.gatewayAccountId,
      GATEWAY_ID: CONFIG.gatewayId,
      EVIDENCE_BUCKET_NAME: TEST_BUCKET,
      VECTOR_BUCKET_NAME: TEST_VECTOR_BUCKET,
      VECTOR_INDEX_NAME: TEST_VECTOR_INDEX
    }),
    mcpEndpoint: `${endpointUrl}/api/chat/_mcp`
  };

  const secrets: SecretReader = fixtures().dependencies.secrets;
  const nonces = new AwsNonces(dynamoClient);

  const fetchImpl: typeof fetch = async (input, init) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    // Loopback S3, S3 Vectors, and Portfolio MCP requests go over the real node:http socket
    if (url.startsWith(endpointUrl)) {
      return fetch(input, init);
    }

    const reqHeaders = new Headers(init?.headers);
    assert.equal(reqHeaders.get('cf-aig-no-wholesale'), 'true');
    assert.equal(reqHeaders.get('cf-aig-collect-log-payload'), 'false');
    assert.equal(reqHeaders.get('cf-aig-skip-cache'), 'true');
    assert.ok(reqHeaders.get('cf-aig-authorization')?.startsWith('Bearer '));

    if (url.endsWith('/openai/embeddings')) {
      counts.gatewayEmbeddings += 1;
      assert.ok(reqHeaders.get('authorization')?.startsWith('Bearer '));
      if (faults.embeddingStatus > 0) {
        return new Response(
          JSON.stringify({ error: { message: `Embedding upstream failure ${CANARY_S3_ERROR}` } }),
          {
            status: faults.embeddingStatus,
            headers: { 'content-type': 'application/json', 'cf-aig-log-id': 'cf-gw-emb-err' }
          }
        );
      }

      const parsedBody = JSON.parse(String(init?.body ?? '{}')) as {
        model: string;
        input: string | string[];
        dimensions?: number;
      };
      const inputs = Array.isArray(parsedBody.input) ? parsedBody.input : [parsedBody.input];
      const dim = parsedBody.dimensions ?? 1536;
      const data = inputs.map((text, index) => ({
        object: 'embedding',
        index,
        embedding: deterministicEmbeddingForText(String(text), dim)
      }));

      return new Response(
        JSON.stringify({
          id: 'embd-phase4-01',
          object: 'list',
          model: parsedBody.model,
          data,
          usage: { prompt_tokens: 100, total_tokens: 100 }
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'x-request-id': 'req-emb-phase4-01',
            'cf-aig-log-id': 'cf-gw-emb-phase4-01'
          }
        }
      );
    }

    const provider: Provider = url.includes('/openai/') ? 'openai' : 'anthropic';
    counts.providerCalls.push(provider);
    if (provider === 'openai' && faults.failOpenai) {
      throw new Error('ambiguous transport failure after request dispatch');
    }

    const rawBody = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    let userContextRaw = '{}';
    if (provider === 'openai') {
      const inputItems = rawBody.input as Array<{ role: string; content: string | Array<{ text: string }> }>;
      const userMsg = inputItems.find(item => item.role === 'user');
      userContextRaw =
        typeof userMsg?.content === 'string'
          ? userMsg.content
          : (userMsg?.content?.[0]?.text ?? '{}');
    } else {
      const messages = rawBody.messages as Array<{ role: string; content: string }>;
      const userMsg = messages.find(item => item.role === 'user');
      userContextRaw = userMsg?.content ?? '{}';
    }

    const parsedContext = JSON.parse(userContextRaw) as CapturedProviderPayload['userContext'];
    capturedPrompts.push({ provider, userContext: parsedContext });

    const q = parsedContext.untrusted_question.toLowerCase();
    if (q.includes('http/2') || q.includes('multiplexing')) {
      return buildProviderHttpResponse(
        provider,
        buildSelectionPayload({
          kind: 'general',
          text: 'HTTP/2 multiplexing interleaves frames from multiple streams over a single TCP connection so application-layer messages do not wait behind one slow response.',
          suggestions: ['How does QUIC improve on TCP loss recovery?'],
          claimIds: []
        }),
        faults.unknownUsage
      );
    }

    if (q.includes('job description') || q.includes('compare job requirements')) {
      return buildProviderHttpResponse(
        provider,
        buildSelectionPayload({
          kind: 'portfolio',
          text: 'Josh has production SQL reporting and financial reconciliation experience, as well as Medavie provider integration analysis and support, whereas Kafka message-broker implementation and direct Guidewire PolicyCenter platform ownership are not established in the approved portfolio.',
          suggestions: ['What did the Medavie provider integration involve?'],
          claimIds: ['claim-experience-claims', 'claim-experience-sql'],
          noticeCodes: ['limited_evidence']
        }),
        faults.unknownUsage
      );
    }

    if (q.includes('takeover') || q.includes('vba') || q.includes('medavie')) {
      return buildProviderHttpResponse(
        provider,
        buildSelectionPayload({
          kind: 'portfolio',
          text: 'Josh personally designed and built the production Excel VBA add-in for claims-history validation, XML batch preparation and error reconciliation, and defined provider mappings and scheduled synchronization requirements for Medavie claims adjudication.',
          suggestions: [
            'How does the Excel VBA add-in handle error reconciliation?',
            'How was provider synchronization scheduled at Medavie?'
          ],
          claimIds: ['claim-experience-takeover', 'claim-experience-claims']
        }),
        faults.unknownUsage
      );
    }

    return buildProviderHttpResponse(
      provider,
      buildSelectionPayload({
        kind: 'portfolio',
        text: 'Josh supported Latitude and OptiPlex hardware diagnostics on Dell’s Gloves Off team.',
        suggestions: ['What did Josh work on at Grenville?'],
        claimIds: ['claim-experience-dell']
      }),
      faults.unknownUsage
    );
  };

  try {
    // Seed canonical knowledge index into loopback S3 & S3 Vectors before resetting test counters
    const seedS3Store = new S3ObjectStore({
      endpoint: endpointUrl,
      allowLoopbackForTests: true,
      credentials: TEST_AWS_CREDENTIALS,
      fetchImpl,
      now: () => currentNowMs
    });
    const seedVectorsStore = new S3VectorsStore({
      endpoint: endpointUrl,
      allowLoopbackForTests: true,
      credentials: TEST_AWS_CREDENTIALS,
      fetchImpl,
      now: () => currentNowMs
    });

    const ingestionReceipt = await ingestKnowledgeIndex({
      config,
      openAiApiKey: 'test-openai-credential-123456',
      gatewayToken: 'cf-test-gateway-valid-credential-123456',
      s3Store: seedS3Store,
      vectorStore: seedVectorsStore,
      fetchImpl,
      now: () => currentNowMs
    });
    assert.equal(ingestionReceipt.chunkCount, 14);
    assert.equal(ingestionReceipt.reusedExisting, false);
    assert.equal(ingestionReceipt.pointer.chunkCount, 14);

    // Reset counters after seed ingestion so turn assertions measure exact turn traffic
    counts.s3GetPointer = 0;
    counts.s3GetManifest = 0;
    counts.s3GetChunks = 0;
    counts.s3PutObject = 0;
    counts.vectorsPut = 0;
    counts.vectorsQuery = 0;
    counts.mcpHttpCalls = 0;
    counts.mcpToolsCalled.length = 0;
    counts.gatewayEmbeddings = 0;
    counts.providerCalls.length = 0;
    counts.sigV4VerifiedServices.length = 0;

    let state = new AwsChatState({ tableName, limits: options.limits }, dynamoClient, () => currentNowMs);
    let phase4Clients = createAwsPhase4Clients({
      config,
      secrets,
      fetchImpl,
      credentials: TEST_AWS_CREDENTIALS,
      allowLoopbackForTests: true,
      s3Endpoint: endpointUrl,
      vectorsEndpoint: endpointUrl,
      now: () => currentNowMs
    });

    const recreateOriginRuntime = () => {
      state = new AwsChatState({ tableName, limits: options.limits }, dynamoClient, () => currentNowMs);
      phase4Clients = createAwsPhase4Clients({
        config,
        secrets,
        fetchImpl,
        credentials: TEST_AWS_CREDENTIALS,
        allowLoopbackForTests: true,
        s3Endpoint: endpointUrl,
        vectorsEndpoint: endpointUrl,
        now: () => currentNowMs
      });
    };

    const originInvoke = async (
      event: RequestEvent
    ): Promise<{ statusCode: number; body?: unknown; streamText?: string }> => {
      const signal = AbortSignal.timeout(15_000);
      try {
        const verified = await authenticateChat(
          event,
          config,
          { secrets, nonces, now: () => currentNowMs },
          signal
        );
        const response = await prepareChat(
          verified,
          config,
          {
            state,
            secrets,
            fetchImpl,
            retrieval: phase4Clients.retrieval,
            mcpClient: phase4Clients.mcpClient,
            now: () => currentNowMs,
            ...(options.settings
              ? {
                  settings: {
                    primaryProvider: options.settings.primaryProvider ?? 'openai',
                    fallbackEnabled: options.settings.fallbackEnabled ?? true,
                    turnDeadlineMs: options.settings.turnDeadlineMs ?? 50_000,
                    ...(options.settings.enablePhase4Traces !== undefined
                      ? { enablePhase4Traces: options.settings.enablePhase4Traces }
                      : {}),
                    ...(options.settings.priceVersion !== undefined
                      ? { priceVersion: options.settings.priceVersion }
                      : {})
                  }
                }
              : {})
          },
          signal
        );
        if (response.events) {
          let streamText = '';
          for await (const chunk of response.events) {
            streamText += chunk;
          }
          return { statusCode: response.statusCode, streamText };
        }
        return { statusCode: response.statusCode, body: response.body };
      } catch (error) {
        const mapped = publicChatError(error);
        return {
          statusCode: mapped.statusCode,
          body: { schemaVersion: '1.0.0', error: { code: mapped.code, retryable: mapped.retryable } }
        };
      }
    };

    const worker = createWorker({
      now: () => currentNowMs,
      timeoutMs: 5000,
      fetcher: async (url, init) => {
        const parsed = new URL(String(url));
        const event: RequestEvent = {
          httpMethod: init?.method,
          path: parsed.pathname.replace(/^\/dev/, ''),
          headers: Object.fromEntries(new Headers(init?.headers)),
          body: init?.body ? Buffer.from(init.body as Uint8Array).toString('utf8') : '',
          isBase64Encoded: false
        };
        const signal = init?.signal ?? AbortSignal.timeout(15_000);
        try {
          const verified = await authenticateChat(
            event,
            config,
            { secrets, nonces, now: () => currentNowMs },
            signal
          );
          const result = await prepareChat(
            verified,
            config,
            {
              state,
              secrets,
              fetchImpl,
              retrieval: phase4Clients.retrieval,
              mcpClient: phase4Clients.mcpClient,
              now: () => currentNowMs,
              ...(options.settings
                ? {
                    settings: {
                      primaryProvider: options.settings.primaryProvider ?? 'openai',
                      fallbackEnabled: options.settings.fallbackEnabled ?? true,
                      turnDeadlineMs: options.settings.turnDeadlineMs ?? 50_000,
                      ...(options.settings.enablePhase4Traces !== undefined
                        ? { enablePhase4Traces: options.settings.enablePhase4Traces }
                        : {}),
                      ...(options.settings.priceVersion !== undefined
                        ? { priceVersion: options.settings.priceVersion }
                        : {})
                    }
                  }
                : {})
            },
            signal
          );
          const headers = new Headers({
            'Content-Type': result.events ? 'text/event-stream; charset=utf-8' : 'application/json'
          });
          if (result.sessionToken) {
            headers.set(
              'Set-Cookie',
              `__Host-jb_chat=${result.sessionToken}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=86400`
            );
          }
          if (result.clearSession) {
            headers.set('Set-Cookie', '__Host-jb_chat=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0');
          }
          return new Response(result.events ? readableFromEvents(result.events) : JSON.stringify(result.body), {
            status: result.statusCode,
            headers
          });
        } catch (error) {
          const mapped = publicChatError(error);
          return Response.json(
            { schemaVersion: '1.0.0', error: { code: mapped.code, retryable: mapped.retryable } },
            { status: mapped.statusCode }
          );
        }
      }
    });

    const env = {
      AWS_ORIGIN: 'https://abc123def4.execute-api.us-east-2.amazonaws.com/dev',
      PROBE_TOKEN: TOKEN,
      EDGE_KEYRING: KEYRING,
      CHAT_PRIVATE_ENABLED: 'true',
      PUBLIC_CHAT_ENABLED: 'false',
      CHAT_ASSETS: {
        async fetch(request: Request): Promise<Response> {
          const assetPath = new URL(request.url).pathname.replace(/^\/+/, '');
          const fullPath =
            assetPath === 'chat-preview.html'
              ? path.join(REPO_ROOT, 'services', 'edge', 'chat-preview.html')
              : path.join(DIST_ROOT, assetPath);
          try {
            const bytes = readFileSync(fullPath);
            return new Response(new Uint8Array(bytes), {
              status: 200,
              headers: assetPath === 'chat-preview.html' ? { 'Content-Type': 'text/html; charset=utf-8' } : {}
            });
          } catch {
            return new Response('Not found', { status: 404 });
          }
        }
      }
    };

    const cookies = new Map<string, string>();
    const raw = async (method: string, reqPath: string, body?: unknown, cookie?: string) =>
      worker.fetch(
        new Request(ORIGIN + reqPath, {
          method,
          headers: {
            Origin: ORIGIN,
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            ...(cookie ? { Cookie: cookie } : {})
          },
          ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) })
        }),
        env
      );

    const send = async (method: string, reqPath: string, body?: unknown) => {
      const cookieHeader = [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');
      const response = await raw(method, reqPath, body, cookieHeader);
      const setCookie = response.headers.get('Set-Cookie');
      if (setCookie) {
        const [first] = setCookie.split(';');
        const eqIdx = first!.indexOf('=');
        const name = first!.slice(0, eqIdx);
        const value = first!.slice(eqIdx + 1);
        if (value) cookies.set(name, value);
        else cookies.delete(name);
      }
      return response;
    };

    await run({
      send,
      raw,
      originInvoke,
      recreateOriginRuntime,
      cookies,
      counts,
      faults,
      capturedPrompts,
      scanRows: async () =>
        (await dynamoClient.send(new ScanCommand({ TableName: tableName, ConsistentRead: true }))).Items ?? [],
      advanceClockMs: (deltaMs: number) => {
        currentNowMs += deltaMs;
      },
      nowSeconds: () => Math.floor(currentNowMs / 1000),
      tableName
    });
  } finally {
    if (oldPrivate === undefined) delete process.env.CHAT_PRIVATE_ENABLED;
    else process.env.CHAT_PRIVATE_ENABLED = oldPrivate;
    if (oldPublic === undefined) delete process.env.PUBLIC_CHAT_ENABLED;
    else process.env.PUBLIC_CHAT_ENABLED = oldPublic;
    server.closeAllConnections?.();
    await new Promise<void>(resolve => server.close(() => resolve()));
    try {
      await dynamoClient.send(new DeleteTableCommand({ TableName: tableName }));
    } finally {
      dynamoClient.destroy();
    }
  }
}

async function authenticateOperatorAndOpenSession(harness: {
  send: (method: string, reqPath: string, body?: unknown) => Promise<Response>;
  raw: (method: string, reqPath: string, body?: unknown, cookie?: string) => Promise<Response>;
  cookies: Map<string, string>;
}): Promise<{ generation: string }> {
  const unauthConfig = await harness.raw('GET', '/api/chat/config');
  assert.equal(unauthConfig.status, 401);

  const loginRes = await harness.send('POST', '/api/chat/access', { token: TOKEN });
  assert.equal(loginRes.status, 200);
  assert.ok(harness.cookies.has('__Host-jb_chat_access'));

  const sessionRes = await harness.send('POST', '/api/chat/session', {});
  assert.equal(sessionRes.status, 200);
  const body = (await sessionRes.json()) as { generation: string };
  assert.match(body.generation, /^[0-9a-f-]{36}$/);
  assert.ok(harness.cookies.has('__Host-jb_chat'));
  return body;
}

test('Phase 4 E2E 1: Private edge access, binary portrait assets, internal route blocking, and Phase 4 config capabilities', async () => {
  await withPhase4Harness(async harness => {
    // Unauthenticated API requests fail closed with 401
    assert.equal((await harness.raw('GET', '/api/chat/config')).status, 401);
    assert.equal((await harness.raw('POST', '/api/chat/session', {})).status, 401);
    assert.equal(
      (await harness.raw('POST', '/api/chat/messages', { schemaVersion: '1.0.0', requestId: randomUUID(), text: 'Hi' })).status,
      401
    );

    // Unapproved /__private/chat* routes fail closed (404)
    assert.equal((await harness.raw('GET', '/__private/chat')).status, 404);
    assert.equal((await harness.raw('POST', '/__private/chat/access', { token: TOKEN })).status, 404);

    // Exchange operator token for __Host-jb_chat_access cookie
    const opened = await authenticateOperatorAndOpenSession(harness);
    assert.ok(opened.generation.length > 0);

    // Internal /api/chat/_mcp and /api/chat/_probe remain blocked at the private edge even after login
    assert.equal((await harness.send('POST', '/api/chat/_mcp', { jsonrpc: '2.0', id: 1, method: 'tools/list' })).status, 404);
    assert.equal((await harness.send('POST', '/api/chat/_probe', { provider: 'openai' })).status, 404);
    assert.equal((await harness.send('GET', '/__private/chat')).status, 404);

    // Verify HTML preview shell and static JS/CSS/JSON assets
    const previewRes = await harness.send('GET', '/chat-preview');
    assert.equal(previewRes.status, 200);
    assert.equal(previewRes.headers.get('Content-Type'), 'text/html; charset=utf-8');
    const previewHtml = await previewRes.text();
    assert.ok(previewHtml.includes('id="chat-assistant-root"'));
    assert.ok(previewHtml.includes('/chat-request-details.js'));
    assert.ok(previewHtml.includes('/chat-assistant.js'));
    assert.ok(previewHtml.includes('CAG + Hybrid RAG + MCP'));

    const detailsJsRes = await harness.send('GET', '/chat-request-details.js');
    assert.equal(detailsJsRes.status, 200);
    assert.equal(detailsJsRes.headers.get('Content-Type'), 'text/javascript; charset=utf-8');
    const detailsJsBytes = Buffer.from(await detailsJsRes.arrayBuffer());
    assert.equal(Buffer.compare(detailsJsBytes, readFileSync(path.join(DIST_ROOT, 'chat-request-details.js'))), 0);

    // Verify binary portrait assets match dist/ bytes exactly
    const smilingJpgRes = await harness.send('GET', '/assets/personal/josh-portrait-smiling.jpg');
    assert.equal(smilingJpgRes.status, 200);
    assert.equal(smilingJpgRes.headers.get('Content-Type'), 'image/jpeg');
    const smilingBytes = Buffer.from(await smilingJpgRes.arrayBuffer());
    assert.equal(
      Buffer.compare(smilingBytes, readFileSync(path.join(DIST_ROOT, 'assets/personal/josh-portrait-smiling.jpg'))),
      0
    );

    const vestWebpRes = await harness.send('GET', '/assets/optimized-extra/personal/josh-portrait-vest-640.webp');
    assert.equal(vestWebpRes.status, 200);
    assert.equal(vestWebpRes.headers.get('Content-Type'), 'image/webp');
    const vestBytes = Buffer.from(await vestWebpRes.arrayBuffer());
    assert.equal(
      Buffer.compare(
        vestBytes,
        readFileSync(path.join(DIST_ROOT, 'assets/optimized-extra/personal/josh-portrait-vest-640.webp'))
      ),
      0
    );

    const configRes = await harness.send('GET', '/api/chat/config');
    assert.equal(configRes.status, 200);
    const configBody = (await configRes.json()) as {
      schemaVersion: string;
      available: boolean;
      capabilities: { chat: boolean; cag: boolean; rag: boolean; mcp: boolean; voice: boolean };
      limits: { maxMessageBytes: number; maxTurns: number; maxToolsPerTurn: number; turnDeadlineMs: number };
    };
    assert.equal(configBody.schemaVersion, '1.0.0');
    assert.equal(configBody.available, true);
    assert.deepEqual(configBody.capabilities, {
      chat: true,
      cag: true,
      rag: true,
      mcp: true,
      voice: false
    });
    assert.deepEqual(configBody.limits, {
      maxMessageBytes: 8192,
      maxTurns: 8,
      maxToolsPerTurn: 2,
      turnDeadlineMs: 50_000
    });
  });
});

test('Phase 4 E2E 2: Portfolio RAG + MCP turn executes 8-stage trace, SigV4 S3/Vectors/MCP calls, DynamoDB settlement, and idempotent replay', async () => {
  await withPhase4Harness(async harness => {
    const opened = await authenticateOperatorAndOpenSession(harness);
    const requestId = randomUUID();
    const message = {
      schemaVersion: '1.0.0',
      requestId,
      text: "Tell me about Josh's Guidewire policy takeover Excel VBA add-in and Medavie provider sync integration."
    };

    const res = await harness.send('POST', '/api/chat/messages', message);
    assert.equal(res.status, 200);
    const streamText = await res.text();
    const frames = parseFrames(streamText);
    const traces = parseTraces(streamText, requestId, opened.generation);

    // Verify all 8 canonical Phase 4 stages appear in strict order
    const observedStageOrder: string[] = [];
    for (const point of traces) {
      if (observedStageOrder.at(-1) !== point.stage) {
        observedStageOrder.push(point.stage);
      }
    }
    assert.deepEqual(observedStageOrder, [...CANONICAL_PHASE4_STAGES]);

    // Stage 1: routing
    const routingDone = traces.find(t => t.stage === 'routing' && t.state === 'completed');
    assert.ok(routingDone);
    assert.equal(routingDone.routingMode, 'portfolio_mcp');
    assert.equal(routingDone.needsRetrieval, true);
    assert.deepEqual(routingDone.requestedTools, ['get_case_study', 'search_public_evidence']);

    // Stage 2: budget
    const budgetDone = traces.find(t => t.stage === 'budget' && t.state === 'completed');
    assert.ok(budgetDone);
    assert.equal(budgetDone.reservedMicros, 21_864);
    assert.equal(budgetDone.priceVersion, PHASE4_PRICE_VERSION);

    // Stage 3: retrieval
    const retrievalDone = traces.find(t => t.stage === 'retrieval' && t.state === 'completed');
    assert.ok(retrievalDone);
    assert.equal(retrievalDone.retrievalMode, 'hybrid');
    assert.equal(retrievalDone.matchedCount, 4);
    assert.equal(retrievalDone.embeddingModel, 'text-embedding-3-small');
    assert.ok(typeof retrievalDone.indexVersion === 'string' && retrievalDone.indexVersion.length > 0);

    // Stage 4: mcp (2 tool calls: get_case_study and search_public_evidence)
    const mcpCompleted = traces.filter(t => t.stage === 'mcp' && t.state === 'completed');
    assert.equal(mcpCompleted.length, 2);
    assert.deepEqual(
      mcpCompleted.map(t => t.toolName),
      ['get_case_study', 'search_public_evidence']
    );
    assert.ok(mcpCompleted.every(t => t.toolOutcome === 'completed'));

    // Verify SigV4 verification across all 3 AWS services (s3, s3vectors, execute-api)
    assert.equal(harness.counts.gatewayEmbeddings, 1);
    assert.equal(harness.counts.vectorsQuery, 1);
    assert.equal(harness.counts.mcpHttpCalls, 2);
    assert.deepEqual(harness.counts.mcpToolsCalled, ['get_case_study', 'search_public_evidence']);
    assert.ok(harness.counts.sigV4VerifiedServices.includes('s3'));
    assert.ok(harness.counts.sigV4VerifiedServices.includes('s3vectors'));
    assert.ok(harness.counts.sigV4VerifiedServices.includes('execute-api'));

    // Stage 5: context — verify retrieved chunks and MCP outputs were injected into the provider prompt
    assert.equal(harness.capturedPrompts.length, 1);
    const promptCtx = harness.capturedPrompts[0]!.userContext;
    assert.ok(Array.isArray(promptCtx.approved_retrieved_chunks));
    assert.equal(promptCtx.approved_retrieved_chunks.length, 4);
    assert.ok(Array.isArray(promptCtx.approved_mcp_results));
    assert.equal(promptCtx.approved_mcp_results.length, 2);
    assert.equal(promptCtx.approved_mcp_results[0]!.name, 'get_case_study');
    assert.equal(promptCtx.approved_mcp_results[1]!.name, 'search_public_evidence');

    // Stage 6 & 7: provider + validation
    const providerDone = traces.find(t => t.stage === 'provider' && t.state === 'completed');
    assert.ok(providerDone);
    assert.equal(providerDone.provider, 'openai');
    assert.equal(providerDone.inputTokens, 100);
    assert.equal(providerDone.outputTokens, 10);

    const validationDone = traces.find(t => t.stage === 'validation' && t.state === 'completed');
    assert.ok(validationDone);
    assert.equal(validationDone.claimCount, 2);
    assert.equal(validationDone.corpusVersion, CAG_VERSION);

    // Stage 8: settlement
    const settlementDone = traces.at(-1);
    assert.ok(settlementDone);
    assert.equal(settlementDone.stage, 'settlement');
    assert.equal(settlementDone.state, 'completed');
    assert.equal(settlementDone.reservedMicros, 21_864);
    assert.equal(settlementDone.chargedMicros, 29);
    assert.equal(settlementDone.priceVersion, PHASE4_PRICE_VERSION);

    // Verify conversation, answer_block, sources, and done SSE frames
    const convFrame = frames.find(f => f.event === 'conversation');
    assert.ok(convFrame);
    assert.equal((convFrame.data as { kind: string }).kind, 'portfolio');

    const blockFrames = frames.filter(f => f.event === 'answer_block');
    assert.equal(blockFrames.length, 2);
    assert.deepEqual(
      blockFrames.map(f => (f.data as { claimId: string }).claimId),
      ['claim-experience-takeover', 'claim-experience-claims']
    );

    const sourcesFrame = frames.find(f => f.event === 'sources');
    assert.ok(sourcesFrame);
    const sourcesData = sourcesFrame.data as { corpusVersion: string; sources: Array<{ id: string }> };
    assert.equal(sourcesData.corpusVersion, CAG_VERSION);
    assert.deepEqual(
      sourcesData.sources.map(s => s.id),
      ['source-takeover', 'source-claims']
    );

    const doneFrame = frames.at(-1);
    assert.ok(doneFrame);
    assert.equal(doneFrame.event, 'done');
    assert.deepEqual(doneFrame.data, { outcome: 'completed' });

    // Verify DynamoDB state ledger rows
    const rows = await harness.scanRows();
    assert.equal(rows.find(r => r.sk?.S === 'ALL')?.used?.N, '29');
    assert.equal(rows.find(r => r.sk?.S === 'openai')?.used?.N, '29');
    assert.equal(rows.find(r => r.sk?.S === 'anthropic')?.used?.N, '0');

    const reqRow = rows.find(r => r.pk?.S?.startsWith('REQUEST#'));
    assert.ok(reqRow);
    const savedReq = JSON.parse(reqRow.result!.S!) as {
      trace: TracePoint[];
      settlement: { reservedMicros: number; chargedMicros: number; priceVersion: string };
      reply?: unknown;
    };
    assert.equal(Object.hasOwn(savedReq, 'reply'), false);
    assert.equal(savedReq.settlement.chargedMicros, 29);
    assert.deepEqual(JSON.parse(reqRow.reservationComponents!.S!), {
      embeddingMicros: 256,
      openaiGenerationMicros: 10_804,
      anthropicGenerationMicros: 10_804
    });
    assert.deepEqual(JSON.parse(reqRow.chargeComponents!.S!), {
      embeddingMicros: 4,
      generationMicros: 25,
      mcpCalls: 2,
      retrievalMatched: 4
    });

    // Replay the exact requestId -> must return cached stream with replayed: true and 0 new upstream calls
    const replayRes = await harness.send('POST', '/api/chat/messages', message);
    assert.equal(replayRes.status, 200);
    const replayStream = await replayRes.text();
    const replayTraces = parseTraces(replayStream, requestId, opened.generation);
    assert.deepEqual(replayTraces.slice(0, -1), traces.slice(0, -1));
    assert.equal(replayTraces.at(-1)?.stage, 'settlement');
    assert.equal(replayTraces.at(-1)?.replayed, true);
    assert.equal(replayTraces.at(-1)?.elapsedMs, null);

    // Prove 0 extra embedding, vector query, MCP, or LLM calls occurred on replay
    assert.equal(harness.counts.gatewayEmbeddings, 1);
    assert.equal(harness.counts.vectorsQuery, 1);
    assert.equal(harness.counts.mcpHttpCalls, 2);
    assert.deepEqual(harness.counts.providerCalls, ['openai']);
  });
});

test('Phase 4 E2E 3: General-purpose conversation turn skips RAG and MCP, reserves 21608 micro-USD, and emits general_knowledge notice', async () => {
  await withPhase4Harness(async harness => {
    const opened = await authenticateOperatorAndOpenSession(harness);
    const requestId = randomUUID();
    const message = {
      schemaVersion: '1.0.0',
      requestId,
      text: 'Explain how HTTP/2 multiplexing prevents head-of-line blocking at the application layer.'
    };

    const res = await harness.send('POST', '/api/chat/messages', message);
    assert.equal(res.status, 200);
    const streamText = await res.text();
    const frames = parseFrames(streamText);
    const traces = parseTraces(streamText, requestId, opened.generation);

    const routingDone = traces.find(t => t.stage === 'routing' && t.state === 'completed');
    assert.ok(routingDone);
    assert.equal(routingDone.routingMode, 'general');
    assert.equal(routingDone.needsRetrieval, false);

    const budgetDone = traces.find(t => t.stage === 'budget' && t.state === 'completed');
    assert.ok(budgetDone);
    assert.equal(budgetDone.reservedMicros, 21_608);
    assert.equal(budgetDone.priceVersion, PHASE4_PRICE_VERSION);

    const retrievalSkipped = traces.find(t => t.stage === 'retrieval');
    assert.ok(retrievalSkipped);
    assert.equal(retrievalSkipped.state, 'completed');
    assert.equal(retrievalSkipped.retrievalMode, 'skipped');
    assert.equal(retrievalSkipped.matchedCount, 0);

    const mcpTrace = traces.find(t => t.stage === 'mcp');
    assert.equal(mcpTrace, undefined);

    assert.equal(harness.counts.gatewayEmbeddings, 0);
    assert.equal(harness.counts.vectorsQuery, 0);
    assert.equal(harness.counts.mcpHttpCalls, 0);
    assert.equal(harness.capturedPrompts[0]?.userContext.approved_retrieved_chunks, undefined);
    assert.equal(harness.capturedPrompts[0]?.userContext.approved_mcp_results, undefined);

    const convFrame = frames.find(f => f.event === 'conversation');
    assert.ok(convFrame);
    assert.equal((convFrame.data as { kind: string }).kind, 'general');

    const blockFrames = frames.filter(f => f.event === 'answer_block');
    assert.equal(blockFrames.length, 1);
    assert.equal((blockFrames[0]!.data as { kind: string; code: string }).kind, 'notice');
    assert.equal((blockFrames[0]!.data as { kind: string; code: string }).code, 'general_knowledge');

    const settlementDone = traces.at(-1);
    assert.ok(settlementDone);
    assert.equal(settlementDone.reservedMicros, 21_608);
    assert.equal(settlementDone.chargedMicros, 25);

    const rows = await harness.scanRows();
    const reqRow = rows.find(r => r.pk?.S?.startsWith('REQUEST#'));
    assert.ok(reqRow);
    assert.deepEqual(JSON.parse(reqRow.chargeComponents!.S!), {
      embeddingMicros: 0,
      generationMicros: 25,
      mcpCalls: 0,
      retrievalMatched: 0
    });
  });
});

test('Phase 4 E2E 4: Job-fit comparison turn invokes compare_job_requirements over SigV4 MCP, qualifies Kafka vs REST/table sync, and never persists raw jobText or canary in REQUEST# ledger', async () => {
  await withPhase4Harness(async harness => {
    const opened = await authenticateOperatorAndOpenSession(harness);
    const requestId = randomUUID();
    const message = {
      schemaVersion: '1.0.0',
      requestId,
      text: `Job description: SQL reporting and Kafka event streaming. ${CANARY_JOB_TEXT}`
    };

    const res = await harness.send('POST', '/api/chat/messages', message);
    assert.equal(res.status, 200);
    const streamText = await res.text();
    const frames = parseFrames(streamText);
    const traces = parseTraces(streamText, requestId, opened.generation);

    // Verify compare_job_requirements executed via MCP over SigV4 HTTP
    const mcpCompleted = traces.filter(t => t.stage === 'mcp' && t.state === 'completed');
    assert.ok(mcpCompleted.some(t => t.toolName === 'compare_job_requirements'));
    assert.ok(harness.counts.mcpToolsCalled.includes('compare_job_requirements'));

    // Verify the MCP tool output passed to the model explicitly flags Kafka as unsupported
    const promptCtx = harness.capturedPrompts[0]!.userContext;
    const compareResult = promptCtx.approved_mcp_results?.find(r => r.name === 'compare_job_requirements');
    assert.ok(compareResult);
    const output = compareResult.output as {
      matches: Array<{ requirement: string; status: string; qualificationNotes: string[] }>;
      gaps: string[];
    };
    const kafkaMatch = output.matches.find(item => item.requirement.toLowerCase().includes('kafka'));
    assert.ok(kafkaMatch, 'Expected Kafka requirement evaluation in compare_job_requirements matches');
    assert.equal(kafkaMatch.status, 'unsupported');
    assert.ok(output.gaps.some(gap => gap.toLowerCase().includes('kafka')));

    // Verify canonical claim blocks preserve Medavie Kafka qualification boundary
    const claimBlocks = frames
      .filter(f => f.event === 'answer_block' && (f.data as { kind: string }).kind === 'claim')
      .map(f => f.data as { claimId: string; qualificationNotes: string[] });
    const medavieClaim = claimBlocks.find(c => c.claimId === 'claim-experience-claims');
    assert.ok(medavieClaim);
    assert.ok(
      medavieClaim.qualificationNotes.some(note => note.includes('Kafka')),
      'Expected Medavie claim qualification note to disavow Kafka implementation'
    );

    // Verify CANARY_JOB_TEXT never appears in any SSE trace frame or 100-day REQUEST# ledger row
    for (const tracePoint of traces) {
      assert.equal(JSON.stringify(tracePoint).includes(CANARY_JOB_TEXT), false);
    }
    const rows = await harness.scanRows();
    const ledgerRows = rows.filter(r => !r.pk?.S?.startsWith('SESSION#'));
    for (const row of ledgerRows) {
      const serialized = JSON.stringify(row);
      assert.equal(
        serialized.includes(CANARY_JOB_TEXT),
        false,
        `Planted canary leaked into non-session DynamoDB row ${row.pk?.S}`
      );
      assert.equal(serialized.includes('Job description:'), false);
    }
  });
});

test('Phase 4 E2E 5: Process restart survival, request cancellation, and session clear preserve 100-day spend ledger while revoking session', async () => {
  await withPhase4Harness(async harness => {
    const opened = await authenticateOperatorAndOpenSession(harness);
    const requestId = randomUUID();
    const message = {
      schemaVersion: '1.0.0',
      requestId,
      text: "Tell me about Josh's Guidewire policy takeover Excel VBA add-in and Medavie provider sync integration."
    };

    const firstRes = await harness.send('POST', '/api/chat/messages', message);
    assert.equal(firstRes.status, 200);
    await firstRes.text();
    assert.equal(harness.counts.gatewayEmbeddings, 1);
    assert.equal(harness.counts.mcpHttpCalls, 2);

    // Simulate cold process restart by recreating AwsChatState & createAwsPhase4Clients against the same DynamoDB table
    harness.recreateOriginRuntime();

    // Replay after restart must succeed from DynamoDB with 0 new upstream calls
    const replayAfterRestart = await harness.send('POST', '/api/chat/messages', message);
    assert.equal(replayAfterRestart.status, 200);
    const replayStream = await replayAfterRestart.text();
    const replayTraces = parseTraces(replayStream, requestId, opened.generation);
    assert.equal(replayTraces.at(-1)?.stage, 'settlement');
    assert.equal(replayTraces.at(-1)?.replayed, true);
    assert.equal(harness.counts.gatewayEmbeddings, 1);
    assert.equal(harness.counts.mcpHttpCalls, 2);

    // Cancel the turn's request ID explicitly via POST /api/chat/requests/:id/cancel
    const cancelRes = await harness.send('POST', `/api/chat/requests/${requestId}/cancel`, {});
    assert.equal(cancelRes.status, 200);
    const cancelBody = (await cancelRes.json()) as { schemaVersion: string; requestId: string; status: string };
    assert.equal(cancelBody.schemaVersion, '1.0.0');
    assert.equal(cancelBody.requestId, requestId);
    assert.equal(cancelBody.status, 'already_finished');

    // Clear session via DELETE /api/chat/session
    const staleSessionCookie = harness.cookies.get('__Host-jb_chat')!;
    const accessCookie = harness.cookies.get('__Host-jb_chat_access')!;
    const clearRes = await harness.send('DELETE', '/api/chat/session', {});
    assert.equal(clearRes.status, 200);
    await clearRes.json();
    assert.equal(harness.cookies.has('__Host-jb_chat'), false);

    // Using the revoked session cookie after DELETE /api/chat/session fails closed with 401 session_expired
    const revokedAttempt = await harness.raw(
      'POST',
      '/api/chat/messages',
      { schemaVersion: '1.0.0', requestId: randomUUID(), text: 'Tell me about Dell.' },
      `__Host-jb_chat_access=${accessCookie}; __Host-jb_chat=${staleSessionCookie}`
    );
    assert.equal(revokedAttempt.status, 401);
    const revokedBody = (await revokedAttempt.json()) as { error: { code: string } };
    assert.equal(revokedBody.error.code, 'session_expired');

    // Verify DynamoDB SESSION# history is cleared while REQUEST# and BUDGET# rows remain intact
    const rows = await harness.scanRows();
    const sessionRow = rows.find(r => r.pk?.S?.startsWith('SESSION#'));
    assert.equal(sessionRow?.history?.S, '[]');
    assert.equal(rows.find(r => r.sk?.S === 'ALL')?.used?.N, '29');
    assert.equal(rows.filter(r => r.pk?.S?.startsWith('REQUEST#')).length, 1);
  });
});

test('Phase 4 E2E 6: Three-point boundaries (message byte length 8191/8192/8193 & envelope clock skew 59s/60s/61s) and degraded S3/MCP canary isolation', async () => {
  await withPhase4Harness(async harness => {
    await authenticateOperatorAndOpenSession(harness);

    // 1. Three-point message UTF-8 byte boundary: 8191 (below), 8192 (exact max), 8193 (above)
    for (const [byteLen, expectedStatus] of [
      [8191, 200],
      [8192, 200],
      [8193, 400]
    ] as const) {
      const prefix = 'Tell me about Dell ';
      const text = prefix + 'a'.repeat(byteLen - prefix.length);
      assert.equal(Buffer.byteLength(text, 'utf8'), byteLen);
      const res = await harness.send('POST', '/api/chat/messages', {
        schemaVersion: '1.0.0',
        requestId: randomUUID(),
        text
      });
      assert.equal(res.status, expectedStatus, `Expected status ${expectedStatus} for message length ${byteLen}`);
      await res.text();
    }

    // 2. Three-point origin envelope timestamp skew boundary: 59s (within), 60s (exact max), 61s (outside)
    const nowSec = harness.nowSeconds();
    const validPrivateContext = `private:${'a'.repeat(43)}:-`;
    for (const [skewSeconds, expectedStatus] of [
      [59, 200],
      [60, 200],
      [61, 403]
    ] as const) {
      const ts = String(nowSec - skewSeconds);
      const nonce = randomUUID();
      const body = '';
      const bodyHash = createHash('sha256').update(body).digest('hex');
      const canonical = canonicalEnvelope('k1', ts, nonce, bodyHash, 'GET', '/api/chat/config', validPrivateContext);
      const signature = createHmac('sha256', KEY).update(canonical).digest('base64url');
      const result = await harness.originInvoke({
        httpMethod: 'GET',
        path: '/api/chat/config',
        body,
        isBase64Encoded: false,
        headers: {
          'content-type': 'application/json',
          'x-chat-key-id': 'k1',
          'x-chat-timestamp': ts,
          'x-chat-nonce': nonce,
          'x-chat-body-sha256': bodyHash,
          'x-chat-context': validPrivateContext,
          'x-chat-signature': signature
        }
      });
      assert.equal(result.statusCode, expectedStatus, `Expected ${expectedStatus} at skew=${skewSeconds}s`);
    }

    // 3. Degraded S3 + S3 Vectors + MCP partial failure & canary isolation
    harness.recreateOriginRuntime();
    harness.faults.s3Status = 503;
    harness.faults.vectorsStatus = 503;
    harness.faults.mcpStatus = 503;
    const degradedReqId = randomUUID();
    const degradedRes = await harness.send('POST', '/api/chat/messages', {
      schemaVersion: '1.0.0',
      requestId: degradedReqId,
      text: `Tell me about Josh's Guidewire policy takeover Excel VBA add-in and Medavie provider sync. ${CANARY_HOSTILE_INPUT}`
    });
    assert.equal(degradedRes.status, 200);
    const degradedStream = await degradedRes.text();
    assert.equal(degradedStream.includes(CANARY_S3_ERROR), false);
    assert.equal(degradedStream.includes(CANARY_MCP_ERROR), false);
    assert.equal(degradedStream.includes(CANARY_HOSTILE_INPUT), false);

    const degradedFrames = parseFrames(degradedStream);
    const noticeCodes = degradedFrames
      .filter(f => f.event === 'answer_block' && (f.data as { kind: string }).kind === 'notice')
      .map(f => (f.data as { code: string }).code);
    assert.ok(noticeCodes.includes('retrieval_degraded'));
    assert.ok(noticeCodes.includes('tools_unavailable'));

    const allRows = await harness.scanRows();
    for (const row of allRows) {
      const dump = JSON.stringify(row);
      assert.equal(dump.includes(CANARY_S3_ERROR), false);
      assert.equal(dump.includes(CANARY_MCP_ERROR), false);
      if (!row.pk?.S?.startsWith('SESSION#')) {
        assert.equal(dump.includes(CANARY_HOSTILE_INPUT), false);
      }
    }
  });
});

test('Phase 4 E2E 7: Primary OpenAI failure after embedding dispatch retains unknown generation charge on OpenAI and falls back to Anthropic', async () => {
  await withPhase4Harness(
    async harness => {
      const opened = await authenticateOperatorAndOpenSession(harness);
      const requestId = randomUUID();
      const res = await harness.send('POST', '/api/chat/messages', {
        schemaVersion: '1.0.0',
        requestId,
        text: "Tell me about Josh's Guidewire policy takeover Excel VBA add-in."
      });
      assert.equal(res.status, 200);
      const streamText = await res.text();
      const traces = parseTraces(streamText, requestId, opened.generation);

      assert.deepEqual(harness.counts.providerCalls, ['openai', 'anthropic']);
      const failedProvider = traces.find(t => t.stage === 'provider' && t.state === 'failed');
      assert.ok(failedProvider);
      assert.equal(failedProvider.provider, 'openai');
      assert.equal(failedProvider.attempt, 1);
      assert.equal(failedProvider.usageStatus, 'unknown');
      assert.equal(failedProvider.chargedMicros, 10_804);

      const completedProvider = traces.find(t => t.stage === 'provider' && t.state === 'completed');
      assert.ok(completedProvider);
      assert.equal(completedProvider.provider, 'anthropic');
      assert.equal(completedProvider.attempt, 2);
      assert.equal(completedProvider.usageStatus, 'known');
      assert.equal(completedProvider.chargedMicros, 25);

      const settlement = traces.at(-1);
      assert.ok(settlement);
      // 4 micro-USD embedding + 10804 micro-USD unknown OpenAI generation + 25 micro-USD Anthropic generation = 10833 micro-USD
      assert.equal(settlement.reservedMicros, 21_864);
      assert.equal(settlement.chargedMicros, 10_833);

      const rows = await harness.scanRows();
      assert.equal(rows.find(r => r.sk?.S === 'ALL')?.used?.N, '10833');
      assert.equal(rows.find(r => r.sk?.S === 'openai')?.used?.N, '10808');
      assert.equal(rows.find(r => r.sk?.S === 'anthropic')?.used?.N, '25');
      const reqRow = rows.find(r => r.pk?.S?.startsWith('REQUEST#'));
      assert.ok(reqRow);
      assert.deepEqual(JSON.parse(reqRow.chargeComponents!.S!), {
        embeddingMicros: 4,
        generationMicros: 10_829,
        mcpCalls: 1,
        retrievalMatched: 4
      });
    },
    { failOpenai: true }
  );
});
