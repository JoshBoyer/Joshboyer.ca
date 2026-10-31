import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';
import { parseKeyring, verifiedBody, verifyEnvelope } from '../src/envelope.js';
import { prepareProbe, probeFrames } from '../src/core.js';
import { createAuthorizer } from '../src/authorizer.js';
import { ServiceError } from '../src/errors.js';
import { CONFIG, ENV, KEY, KEYRING, NOW, fixtures, signedEvent } from './fixtures.js';
import type { APIGatewayRequestAuthorizerEvent } from 'aws-lambda';

const signal = () => new AbortController().signal;

test('edge and Lambda share a fixed canonical signing vector', () => {
  const event = signedEvent();
  assert.equal(event.headers!['x-chat-body-sha256'], 'd76d41ab9f98ad7d0f1ca5695f8e0250bb8683eef53dce5c107431d816e37983');
  assert.equal(event.headers!['x-chat-signature'], '86eAYzfSzbxpytpoPucRvqQpqcsn2Y-ye28nHvdDGMI');
  const envelope = verifyEnvelope(event, parseKeyring(KEYRING), NOW);
  assert.equal(verifiedBody(event, envelope).toString(), event.body);
});

test('envelope rejects forgery, method/path/query changes and stale/future timestamps', () => {
  const ring = parseKeyring(KEYRING);
  const mutations = [
    (e: ReturnType<typeof signedEvent>) => { e.headers!['x-chat-signature'] = 'a'.repeat(43); },
    (e: ReturnType<typeof signedEvent>) => { e.headers!['x-chat-context'] = 'visitor'; },
    (e: ReturnType<typeof signedEvent>) => { e.httpMethod = 'GET'; },
    (e: ReturnType<typeof signedEvent>) => { e.path = '/api/chat/%5fprobe'; },
    (e: ReturnType<typeof signedEvent>) => { e.queryStringParameters = { extra: 'true' }; },
    (e: ReturnType<typeof signedEvent>) => { e.headers!['x-chat-key-id'] = 'unknown'; },
    (e: ReturnType<typeof signedEvent>) => { delete e.headers!['x-chat-nonce']; },
    (e: ReturnType<typeof signedEvent>) => { e.headers!['X-Chat-Nonce'] = e.headers!['x-chat-nonce']; },
    (e: ReturnType<typeof signedEvent>) => { e.multiValueHeaders = { 'x-chat-nonce': [e.headers!['x-chat-nonce']!, e.headers!['x-chat-nonce']!] }; }
  ];
  for (const mutate of mutations) {
    const event = signedEvent(); mutate(event);
    assert.throws(() => verifyEnvelope(event, ring, NOW), { code: 'UNAUTHORISED' });
  }
  assert.throws(() => verifyEnvelope(signedEvent(undefined, NOW - 61), ring, NOW));
  assert.throws(() => verifyEnvelope(signedEvent(undefined, NOW + 6), ring, NOW));
  assert.doesNotThrow(() => verifyEnvelope(signedEvent(undefined, NOW - 60), ring, NOW));
});

test('body hash binds exact bytes and handles API Gateway base64 without ambiguous decoding', () => {
  const event = signedEvent();
  const envelope = verifyEnvelope(event, parseKeyring(KEYRING), NOW);
  const encoded = { ...event, isBase64Encoded: true, body: Buffer.from(event.body!).toString('base64') };
  assert.equal(verifiedBody(encoded, envelope).toString(), event.body);
  assert.throws(() => verifiedBody({ ...encoded, body: encoded.body + '\n' }, envelope));
  assert.throws(() => verifiedBody({ ...event, body: event.body + ' ' }, envelope), { code: 'UNAUTHORISED' });
  assert.throws(() => verifiedBody({ ...event, headers: { ...event.headers, 'content-type': 'text/plain' } }, envelope), { status: 415 });
});

test('rotation permits only the explicit current and previous canonical keys', () => {
  const ring = parseKeyring(JSON.stringify({ activeKeyId: 'k2', keys: { k1: KEY.toString('base64url'), k2: Buffer.alloc(32, 9).toString('base64url') } }));
  assert.doesNotThrow(() => verifyEnvelope(signedEvent(), ring, NOW));
  for (const invalid of ['{}', '{"configured":false}', JSON.stringify({ activeKeyId: 'k1', keys: { k1: 'short' } }), JSON.stringify({ activeKeyId: 'missing', keys: { k1: KEY.toString('base64url') } })]) {
    assert.throws(() => parseKeyring(invalid), { code: 'CREDENTIAL_UNAVAILABLE' });
  }
});

test('invalid auth, body and credential states make zero provider calls', async () => {
  const bodies = ['{"provider":"openai","text":"do something else"}', '{"provider":"openai","provider":"anthropic"}', '{"provider":"bedrock"}', '{"provider":"openai","history":[]}', 'x'.repeat(257)];
  for (const body of bodies) {
    const f = fixtures();
    await assert.rejects(prepareProbe(signedEvent(body), CONFIG, f.dependencies, signal()));
    assert.deepEqual(f.calls, { fetch: 0, nonce: 0 });
  }
  const f = fixtures();
  f.secrets.set(CONFIG.providerSecretArns.openai, '{"configured":false}');
  await assert.rejects(prepareProbe(signedEvent(), CONFIG, f.dependencies, signal()), { code: 'CREDENTIAL_UNAVAILABLE' });
  assert.deepEqual(f.calls, { fetch: 0, nonce: 0 });
});

test('nonce conflicts fail closed and a prepared probe cannot invoke twice', async () => {
  const f = fixtures();
  let consumed = false;
  f.dependencies.nonces.consume = async () => {
    if (consumed) throw new ServiceError('REPLAY_REJECTED', 403);
    consumed = true;
  };
  const first = await prepareProbe(signedEvent(), CONFIG, f.dependencies, signal());
  await assert.rejects(prepareProbe(signedEvent(), CONFIG, f.dependencies, signal()), { code: 'REPLAY_REJECTED' });
  assert.equal(f.calls.fetch, 0);
  assert.equal((await first.run()).text, 'OK');
  await assert.rejects(first.run(), { code: 'PROBE_ALREADY_STARTED' });
  assert.equal(f.calls.fetch, 1);
});

test('expiry is checked again after secret retrieval', async () => {
  const f = fixtures();
  let now = NOW * 1000;
  f.dependencies.now = () => now;
  const read = f.dependencies.secrets.read;
  f.dependencies.secrets.read = async (id, s) => { const value = await read(id, s); now += 22_000; return value; };
  await assert.rejects(prepareProbe(signedEvent(), CONFIG, f.dependencies, signal()), { code: 'UNAUTHORISED' });
  assert.deepEqual(f.calls, { fetch: 0, nonce: 0 });
});

test('progress is yielded before the model call and errors have fixed safe frames', async () => {
  const f = fixtures();
  const prepared = await prepareProbe(signedEvent(), CONFIG, f.dependencies, signal());
  const stream = probeFrames(prepared);
  assert.match((await stream.next()).value!, /^event: status/);
  assert.equal(f.calls.fetch, 0);
  assert.match((await stream.next()).value!, /^event: result/);
  assert.equal(f.calls.fetch, 1);
  assert.match((await stream.next()).value!, /"ok":true/);
  const errorStream = probeFrames({ provider: 'openai', async run() { throw new Error('sensitive-private-error'); } });
  let result = '';
  for await (const frame of errorStream) result += frame;
  assert.doesNotMatch(result, /sensitive-private-error/);
  assert.match(result, /"chargeStatus":"unknown"/);
  assert.match(result, /"ok":false/);
});

test('authorizer grants only exact current method ARN and never reveals failures', async () => {
  const f = fixtures();
  const authorizer = createAuthorizer({ secrets: f.dependencies.secrets, env: ENV, now: () => NOW * 1000 });
  const event = { ...signedEvent(), type: 'REQUEST', methodArn: 'arn:aws:execute-api:us-east-2:123456789012:abc123/dev/POST/api/chat/_probe', resource: '/api/chat/_probe', pathParameters: null, stageVariables: null, requestContext: {} } as APIGatewayRequestAuthorizerEvent;
  const result = await authorizer(event);
  const statement = result.policyDocument.Statement[0]!;
  assert.ok('Resource' in statement);
  assert.equal(statement.Resource, event.methodArn);
  await assert.rejects(authorizer({ ...event, methodArn: event.methodArn.replace('us-east-2', 'us-east-1') }), { message: 'Unauthorized' });
  await assert.rejects(authorizer({ ...event, headers: {} }), { message: 'Unauthorized' });
});

test('runtime config fixes the region, models and gateway path components', () => {
  for (const update of [{ AWS_REGION: 'us-west-2' }, { GATEWAY_ID: '../secret' }, { GATEWAY_ACCOUNT_ID: 'evil.example/path' }, { OPENAI_MODEL: 'unreviewed-model' }, { EDGE_SECRET_ARN: ENV.EDGE_SECRET_ARN.replace('us-east-2', 'us-east-1') }]) {
    assert.throws(() => loadConfig({ ...ENV, ...update }), { code: 'CONFIGURATION_UNAVAILABLE' });
  }
});
