import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { Writable } from 'node:stream';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { canonicalEnvelope } from '../src/envelope.js';
import { ENV, KEY, fixtures } from './fixtures.js';

test('Phase3 disables the unmetered probe before reading secrets or dispatching a provider', async () => {
  const globals = globalThis as unknown as { awslambda?: unknown };
  const oldRuntime = globals.awslambda;
  const oldProbe = process.env.PROBE_ENABLED;
  const chunks: Buffer[] = [];
  let metadata: { statusCode: number; headers: Record<string, string> } | undefined;
  globals.awslambda = {
    streamifyResponse(callback: unknown) { return callback; },
    HttpResponseStream: { from(stream: Writable, data: typeof metadata) { metadata = data; return stream; } }
  };
  process.env.PROBE_ENABLED = 'false';
  try {
    const { handler } = await import('../src/handler.js');
    const stream = new Writable({ write(chunk: Buffer, _encoding, callback) { chunks.push(chunk); callback(); } });
    await (handler as (event: APIGatewayProxyEvent, stream: Writable, context: Context) => Promise<void>)(
      { path: '/api/chat/_probe', httpMethod: 'POST' } as APIGatewayProxyEvent, stream,
      { awsRequestId: 'test-request', getRemainingTimeInMillis: () => 10000 } as Context);
    assert.equal(metadata?.statusCode, 404);
    assert.deepEqual(JSON.parse(Buffer.concat(chunks).toString('utf8')), { error: 'NOT_FOUND', chargeStatus: 'not_started' });
  } finally {
    if (oldProbe === undefined) delete process.env.PROBE_ENABLED; else process.env.PROBE_ENABLED = oldProbe;
    globals.awslambda = oldRuntime;
  }
});

test('Phase4 handler wires RAG and MCP capabilities when Phase 4 environment variables are present and fails closed when disabled', async () => {
  const globals = globalThis as unknown as { awslambda?: unknown };
  const oldRuntime = globals.awslambda;
  const savedEnv = { ...process.env };
  globals.awslambda = {
    streamifyResponse(callback: unknown) { return callback; },
    HttpResponseStream: { from(stream: Writable, data: { statusCode: number; headers: Record<string, string> }) {
      (stream as Writable & { meta?: typeof data }).meta = data;
      return stream;
    } }
  };
  try {
    const handlerModule = await import('../src/handler.js') as Record<string, unknown>;
    const createHandler = handlerModule.createHandler as ((deps?: unknown) => (event: APIGatewayProxyEvent, stream: Writable, context: Context) => Promise<void>) | undefined;
    assert.equal(typeof createHandler, 'function');

    Object.assign(process.env, {
      ...ENV,
      CHAT_PRIVATE_ENABLED: 'true',
      PUBLIC_CHAT_ENABLED: 'false',
      EVIDENCE_BUCKET_NAME: 'joshboyer-chat-evidence-test',
      VECTOR_BUCKET_NAME: 'joshboyer-chat-vectors-test',
      VECTOR_INDEX_NAME: 'portfolio-evidence-v1',
      MCP_ENDPOINT_URL: 'https://abc1234567.execute-api.us-east-2.amazonaws.com/dev/api/chat/_mcp'
    });

    const { dependencies } = fixtures();
    const nowSeconds = Math.floor(Date.now() / 1000);
    const nonce = '33333333-3333-4333-8333-333333333333';
    const emptyHash = createHash('sha256').update('').digest('hex');
    const visitorId = 'b'.repeat(43);
    const contextHeader = `private:${visitorId}:-`;
    const signature = createHmac('sha256', KEY)
      .update(canonicalEnvelope('k1', String(nowSeconds), nonce, emptyHash, 'GET', '/api/chat/config', contextHeader))
      .digest('base64url');

    const fn = createHandler!({
      secrets: dependencies.secrets,
      nonces: dependencies.nonces,
      credentials: { accessKeyId: 'AKIAIOSFODNN7EXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' }
    });

    const chunks: Buffer[] = [];
    const stream = new Writable({ write(chunk: Buffer, _encoding, callback) { chunks.push(chunk); callback(); } }) as Writable & {
      meta?: { statusCode: number; headers: Record<string, string> };
    };

    await fn(
      {
        httpMethod: 'GET',
        path: '/api/chat/config',
        body: '',
        isBase64Encoded: false,
        headers: {
          'content-type': 'application/json',
          'x-chat-key-id': 'k1',
          'x-chat-timestamp': String(nowSeconds),
          'x-chat-nonce': nonce,
          'x-chat-body-sha256': emptyHash,
          'x-chat-context': contextHeader,
          'x-chat-signature': signature
        },
        queryStringParameters: null,
        multiValueQueryStringParameters: null
      } as unknown as APIGatewayProxyEvent,
      stream,
      { awsRequestId: 'test-phase4-config', getRemainingTimeInMillis: () => 20000 } as Context
    );

    assert.equal(stream.meta?.statusCode, 200);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
      capabilities: { chat: boolean; cag: boolean; rag: boolean; mcp: boolean; voice: boolean };
      limits: { maxToolsPerTurn: number };
    };
    assert.deepEqual(body.capabilities, { chat: true, cag: true, rag: true, mcp: true, voice: false });
    assert.equal(body.limits.maxToolsPerTurn, 2);

    // Also verify fail-closed 503 when PUBLIC_CHAT_ENABLED=true
    process.env.PUBLIC_CHAT_ENABLED = 'true';
    const failChunks: Buffer[] = [];
    const failStream = new Writable({ write(chunk: Buffer, _encoding, callback) { failChunks.push(chunk); callback(); } }) as Writable & {
      meta?: { statusCode: number; headers: Record<string, string> };
    };
    await fn(
      { httpMethod: 'GET', path: '/api/chat/config', body: '', isBase64Encoded: false, headers: {} } as unknown as APIGatewayProxyEvent,
      failStream,
      { awsRequestId: 'test-phase4-disabled', getRemainingTimeInMillis: () => 20000 } as Context
    );
    assert.equal(failStream.meta?.statusCode, 503);
    assert.deepEqual(JSON.parse(Buffer.concat(failChunks).toString('utf8')), {
      schemaVersion: '1.0.0',
      error: { code: 'unavailable', retryable: true }
    });
  } finally {
    process.env = savedEnv;
    globals.awslambda = oldRuntime;
  }
});

