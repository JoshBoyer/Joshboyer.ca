import test from 'node:test';
import assert from 'node:assert/strict';
import type { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import * as awsModule from '../src/aws.js';
import { AwsNonces, AwsSecrets } from '../src/aws.js';
import { CONFIG, NOW, fixtures } from './fixtures.js';
import type { KnowledgeChunksManifest } from '../src/ingestion/index.js';

const chunksManifest = require('../../../chat/knowledge/chunks-manifest.json') as KnowledgeChunksManifest;

test('secret cache uses AWSCURRENT, expires and never serves stale values after refresh failure', async () => {
  let now = 0;
  let calls = 0;
  let fail = false;
  const client = { async send(command: { input: unknown }, options: { abortSignal: AbortSignal }) {
    calls++;
    assert.deepEqual(command.input, { SecretId: CONFIG.edgeSecretArn, VersionStage: 'AWSCURRENT' });
    assert.ok(options.abortSignal);
    if (fail) throw new Error('secret-value-do-not-echo');
    return { SecretString: `secret-value-${calls}` };
  } } as unknown as SecretsManagerClient;
  const store = new AwsSecrets(client, () => now);
  const signal = new AbortController().signal;
  assert.equal(await store.read(CONFIG.edgeSecretArn, signal), 'secret-value-1');
  assert.equal(await store.read(CONFIG.edgeSecretArn, signal), 'secret-value-1');
  assert.equal(calls, 1);
  now = 30001;
  assert.equal(await store.read(CONFIG.edgeSecretArn, signal), 'secret-value-2');
  now += 30001; fail = true;
  await assert.rejects(store.read(CONFIG.edgeSecretArn, signal), { code: 'CREDENTIAL_UNAVAILABLE', message: 'CREDENTIAL_UNAVAILABLE' });
  const aborted = AbortSignal.abort();
  await assert.rejects(store.read(CONFIG.edgeSecretArn, aborted));
  assert.equal(calls, 3);
});

test('nonce claims use an atomic conditional write with short TTL and no read-before-write', async () => {
  let calls = 0;
  const client = { async send(command: { input: unknown }) {
    calls++;
    assert.deepEqual(command.input, {
      TableName: CONFIG.stateTable,
      Item: { pk: { S: 'NONCE#k1#test-nonce' }, sk: { S: 'REPLAY' }, expiresAt: { N: String(NOW + 120) } },
      ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)'
    });
  } } as unknown as DynamoDBClient;
  const store = new AwsNonces(client);
  await store.consume(CONFIG.stateTable, { keyId: 'k1', nonce: 'test-nonce', timestamp: NOW, bodyHash: 'unused', context: 'phase2-operator' }, NOW, new AbortController().signal);
  assert.equal(calls, 1);
});

test('nonce conflicts and uncertain persistence fail closed with safe errors', async () => {
  for (const [name, code] of [['ConditionalCheckFailedException', 'REPLAY_REJECTED'], ['TimeoutError', 'REPLAY_STORE_UNAVAILABLE']]) {
    let calls = 0;
    const client = { async send() { calls++; throw Object.assign(new Error('private-persistence-detail'), { name }); } } as unknown as DynamoDBClient;
    await assert.rejects(new AwsNonces(client).consume(CONFIG.stateTable, { keyId: 'k1', nonce: 'n', timestamp: NOW, bodyHash: 'h', context: 'phase2-operator' }, NOW, new AbortController().signal), { code, message: code });
    assert.equal(calls, 1);
  }
});

test('createAwsPhase4Clients returns empty dependencies when Phase 4 config is absent and wires RAG + MCP when configured', async () => {
  const createPhase4 = (awsModule as Record<string, unknown>).createAwsPhase4Clients as ((options: unknown) => Record<string, unknown>) | undefined;
  assert.equal(typeof createPhase4, 'function');

  const { dependencies } = fixtures();
  const empty = createPhase4!({ config: CONFIG, secrets: dependencies.secrets });
  assert.equal(empty.retrieval, undefined);
  assert.equal(empty.mcpClient, undefined);

  const urls: string[] = [];
  const firstChunk = chunksManifest.chunks[0]!;
  const unitVec = Array.from({ length: 1536 }, (_, idx) => (idx === 0 ? 1 : 0));
  const phase4Config = {
    ...CONFIG,
    evidenceBucket: 'joshboyer-chat-evidence-test',
    vectorBucket: 'joshboyer-chat-vectors-test',
    vectorIndex: 'portfolio-evidence-v1',
    mcpEndpoint: 'https://abc1234567.execute-api.us-east-2.amazonaws.com/dev/api/chat/_mcp'
  };

  const wired = createPhase4!({
    config: phase4Config,
    secrets: dependencies.secrets,
    credentials: { accessKeyId: 'AKIAIOSFODNN7EXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' },
    fetchImpl: async (url: string | URL | Request) => {
      const target = String(url);
      urls.push(target);
      if (target.includes('active-pointer.json')) {
        return Response.json({
          schemaVersion: '1.0.0',
          corpusVersion: chunksManifest.corpusVersion,
          activeIndexVersion: chunksManifest.indexVersion,
          indexVersion: chunksManifest.indexVersion,
          vectorBucketName: 'joshboyer-chat-vectors-test',
          indexName: 'portfolio-evidence-v1',
          embeddingModel: chunksManifest.embeddingModel,
          dimensions: chunksManifest.dimensions,
          chunkCount: chunksManifest.chunks.length,
          manifestSha256: chunksManifest.manifestSha256,
          updatedAt: '2026-10-31T00:00:00.000Z'
        });
      }
      if (target.includes('/openai/embeddings')) {
        return Response.json({
          object: 'list',
          model: 'text-embedding-3-small',
          data: [{ object: 'embedding', index: 0, embedding: unitVec }],
          usage: { prompt_tokens: 18, total_tokens: 18 }
        }, { headers: { 'x-request-id': 'emb-req-1', 'cf-aig-log-id': 'gw-emb-1' } });
      }
      if (target.includes('/QueryVectors')) {
        return Response.json({
          vectors: [{
            key: firstChunk.id,
            distance: 0.05,
            metadata: {
              chunkId: firstChunk.id,
              claimId: firstChunk.claimId,
              indexVersion: chunksManifest.indexVersion,
              corpusVersion: chunksManifest.corpusVersion,
              contentSha256: firstChunk.contentSha256
            }
          }]
        });
      }
      return new Response('', { status: 404 });
    }
  }) as {
    retrieval?: { retrieve(input: { query: string }): Promise<{ retrievalMode: string; chunkCount: number; embeddingUsage: { estimatedCostMicros: number } }> };
    mcpClient?: unknown;
  };

  assert.ok(wired.retrieval);
  assert.ok(wired.mcpClient);
  const res = await wired.retrieval!.retrieve({ query: 'Tell me about NEXUS architecture' });
  assert.equal(res.retrievalMode, 'hybrid');
  assert.equal(res.chunkCount, 4);
  assert.equal(res.embeddingUsage.estimatedCostMicros, 1);
  assert.ok(urls.some(u => u.includes('active-pointer.json')));
  assert.ok(urls.some(u => u.includes('/openai/embeddings')));
  assert.ok(urls.some(u => u.includes('/QueryVectors')));
});

