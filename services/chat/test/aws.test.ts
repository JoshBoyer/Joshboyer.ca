import test from 'node:test';
import assert from 'node:assert/strict';
import type { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { AwsNonces, AwsSecrets } from '../src/aws.js';
import { CONFIG, NOW } from './fixtures.js';

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
