import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { AwsChatState } from '../src/state.js';

const visitorId = 'private-visitor-test-0001';
const signal = new AbortController().signal;

test('state limits reject non-integer, negative and enlarged allowances before database access', () => {
  for (const monthlyBudgetMicros of [-1, 0.5, 25_000_001, Number.NaN]) {
    assert.throws(() => new AwsChatState({ tableName: 'test-state', limits: { monthlyBudgetMicros } }));
  }
  for (const dailyVisitorTurns of [0, 17, 1.5]) {
    assert.throws(() => new AwsChatState({ tableName: 'test-state', limits: { dailyVisitorTurns } }));
  }
  assert.throws(() => new AwsChatState({ tableName: 'test-state', limits: { providerBudgetMicros: { openai: 1.5, anthropic: 1 } } }));
});

test('session secrets are random and only hashes are persisted; writes require non-existing keys', async () => {
  const writes: Array<{ input: Record<string, unknown> }> = [];
  const client = { async send(command: { input: Record<string, unknown> }) { writes.push(command); return {}; } } as unknown as DynamoDBClient;
  const store = new AwsChatState({ tableName: 'test-state' }, client, () => 1_800_000_000_000);
  const first = await store.openSession({ visitorId }, signal);
  const second = await store.openSession({ visitorId }, signal);
  assert.match(first.credential, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(first.credential, second.credential);
  assert.notEqual(first.session.generation, second.session.generation);
  assert.equal(first.session.id, createHash('sha256').update(first.credential).digest('hex'));
  assert.equal(first.session.expiresAt, 1_800_086_400_000);
  assert.equal(first.session.remainingTurns, 8);
  assert.ok(!JSON.stringify(writes).includes(first.credential));
  assert.ok(!JSON.stringify(writes).includes(visitorId));
  assert.equal(writes[0]?.input.ConditionExpression, 'attribute_not_exists(pk)');
});

test('invalid identity and message bounds fail before database I/O', async () => {
  let calls = 0;
  const client = { async send() { calls++; throw new Error('must not run'); } } as unknown as DynamoDBClient;
  const store = new AwsChatState({ tableName: 'test-state' }, client);
  await assert.rejects(store.openSession({ visitorId: 'x' }, signal), { code: 'INVALID_REQUEST' });
  await assert.rejects(store.requireSession({ visitorId, credential: 'x' }, signal), { code: 'SESSION_EXPIRED' });
  await assert.rejects(store.beginTurn({
    identity: { visitorId, credential: 'a'.repeat(43) }, requestId: 'invalid', digest: 'a'.repeat(64),
    reservations: { openai: 1, anthropic: 1 }, priceVersion: 'test', text: 'hello'
  }, signal), { code: 'INVALID_REQUEST' });
  await assert.rejects(store.beginTurn({
    identity: { visitorId, credential: 'a'.repeat(43) }, requestId: '11111111-1111-4111-8111-111111111111', digest: 'a'.repeat(64),
    reservations: { openai: 1, anthropic: 1 }, priceVersion: 'test', text: 'é'.repeat(4097)
  }, signal), { code: 'INVALID_REQUEST' });
  assert.equal(calls, 0);
});

test('persistence failures are redacted and never retried by the state layer', async () => {
  let calls = 0;
  const client = { async send() { calls++; throw new Error('private-key-and-input'); } } as unknown as DynamoDBClient;
  const store = new AwsChatState({ tableName: 'test-state' }, client);
  await assert.rejects(store.openSession({ visitorId }, signal), { code: 'STATE_UNAVAILABLE', message: 'STATE_UNAVAILABLE' });
  assert.equal(calls, 1);
});
