import test from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

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
