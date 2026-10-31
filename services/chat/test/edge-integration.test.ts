import test from 'node:test';
import assert from 'node:assert/strict';
import type { APIGatewayRequestAuthorizerEvent } from 'aws-lambda';
import { createAuthorizer } from '../src/authorizer.js';
import { prepareProbe, probeFrames } from '../src/core.js';
import { ServiceError, safeError } from '../src/errors.js';
import type { RequestEvent } from '../src/envelope.js';
import { CONFIG, ENV, KEYRING, NOW, fixtures } from './fixtures.js';

const OPERATOR_TOKEN = 'operator-probe-test-token-'.padEnd(48, 'x');
const NONCE = '11111111-1111-4111-8111-111111111111';
const ORIGIN = 'https://abc1234567.execute-api.us-east-2.amazonaws.com/dev';

async function pipeline(tamperBody = false) {
  // Import the actual ESM Worker from the sibling package, not a second signer.
  const { createWorker } = await import('../../edge/src/worker.js');
  const f = fixtures();
  const consumed = new Set<string>();
  let gatewayCalls = 0;
  f.dependencies.nonces.consume = async (_table, envelope) => {
    const key = `${envelope.keyId}:${envelope.nonce}`;
    if (consumed.has(key)) throw new ServiceError('REPLAY_REJECTED', 403);
    consumed.add(key);
    f.calls.nonce++;
  };
  const authorizer = createAuthorizer({ secrets: f.dependencies.secrets, env: ENV, now: () => NOW * 1000 });
  const worker = createWorker({
    now: () => NOW * 1000,
    nonce: () => NONCE,
    fetcher: async (url, init) => {
      gatewayCalls++;
      assert.equal(String(url), ORIGIN + '/api/chat/_probe');
      assert.equal(init?.redirect, 'manual');
      const forwarded = new Headers(init?.headers);
      assert.equal(forwarded.get('authorization'), null, 'Operator bearer token must stop at the edge');
      assert.equal(forwarded.get('content-type'), 'application/json');
      const headers = Object.fromEntries(forwarded);
      const bytes = Buffer.from(init?.body as Uint8Array);
      const event: RequestEvent = {
        path: '/api/chat/_probe', httpMethod: 'POST', headers,
        multiValueHeaders: Object.fromEntries(Object.entries(headers).map(([key, value]) => [key, [value]])),
        queryStringParameters: null, multiValueQueryStringParameters: null,
        body: (tamperBody ? Buffer.from('{"provider":"anthropic"}') : bytes).toString('base64'),
        isBase64Encoded: true
      };
      try {
        const authorised = await authorizer({
          ...event, type: 'REQUEST', methodArn: 'arn:aws:execute-api:us-east-2:123456789012:abc1234567/dev/POST/api/chat/_probe',
          resource: '/api/chat/_probe', pathParameters: null, stageVariables: null, requestContext: {}
        } as APIGatewayRequestAuthorizerEvent);
        assert.equal(authorised.policyDocument.Statement[0]!.Effect, 'Allow');
        const prepared = await prepareProbe(event, CONFIG, f.dependencies, init!.signal!);
        const frames = probeFrames(prepared);
        const stream = new ReadableStream<Uint8Array>({
          async pull(controller) {
            const frame = await frames.next();
            if (frame.done) controller.close();
            else controller.enqueue(new TextEncoder().encode(frame.value));
          },
          async cancel() { await frames.return(undefined); }
        });
        return new Response(stream, { headers: { 'content-type': 'text/event-stream' } });
      } catch (error) {
        const failure = safeError(error);
        return Response.json({ error: failure.code }, { status: failure.status });
      }
    }
  });
  const env = { AWS_ORIGIN: ORIGIN, EDGE_KEYRING: KEYRING, PROBE_TOKEN: OPERATOR_TOKEN };
  return {
    calls: f.calls,
    gatewayCalls: () => gatewayCalls,
    request: (provider: string, token = OPERATOR_TOKEN) => worker.fetch(new Request('https://probe.example/api/chat/_probe', {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json; charset=utf-8' },
      body: ` { "provider" : "${provider}" }\n`
    }), env)
  };
}

for (const provider of ['openai', 'anthropic']) {
  test(`actual edge signs and streams the ${provider} path through backend validation`, async () => {
    const p = await pipeline();
    const response = await p.request(provider);
    assert.equal(response.status, 200);
    const body = await response.text();
    assert.match(body, /^event: status/);
    assert.match(body, new RegExp(`"provider":"${provider}"`));
    assert.match(body, /"text":"OK"/);
    assert.match(body, /event: done\ndata: \{"ok":true\}/);
    assert.equal(p.gatewayCalls(), 1);
    assert.deepEqual(p.calls, { nonce: 1, fetch: 1 });
  });
}

test('edge authentication, replay and signed-byte tampering cannot add a provider call', async () => {
  const p = await pipeline();
  const unauthorised = await p.request('openai', 'invalid-token'.padEnd(48, 'x'));
  assert.equal(unauthorised.status, 401);
  assert.equal(p.gatewayCalls(), 0);
  assert.deepEqual(p.calls, { nonce: 0, fetch: 0 });
  const first = await p.request('openai');
  assert.equal(first.status, 200);
  await first.text();
  const replay = await p.request('openai');
  assert.equal(replay.status, 502, 'The edge hides the rejected backend response');
  assert.deepEqual(p.calls, { nonce: 1, fetch: 1 });

  const tampered = await pipeline(true);
  const rejected = await tampered.request('openai');
  assert.equal(rejected.status, 502);
  assert.deepEqual(tampered.calls, { nonce: 0, fetch: 0 });
});
