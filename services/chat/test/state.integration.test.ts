import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { DynamoDBClient, CreateTableCommand, DeleteTableCommand, ScanCommand, TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
import { AwsChatState, type Identity, type StateLimits } from '../src/state.js';

// Opt-in integration tests use only an explicitly selected loopback DynamoDB Local endpoint.
const endpoint = process.env.CHAT_TEST_DYNAMODB_ENDPOINT;
if (endpoint && !/^http:\/\/127\.0\.0\.1:\d{2,5}$/.test(endpoint)) throw new Error('CHAT_TEST_DYNAMODB_ENDPOINT must be loopback HTTP.');
const integration = endpoint ? test : test.skip;
const signal = new AbortController().signal;
const now = Date.UTC(2026, 9, 31, 15);
const visitorId = 'private-visitor-test-0001';
const client = endpoint ? new DynamoDBClient({
  endpoint, region: 'us-east-2', maxAttempts: 1, credentials: { accessKeyId: 'localonly', secretAccessKey: 'localonly' }
}) : undefined;
const digest = (text: string) => createHash('sha256').update(text).digest('hex');
const input = (identity: Identity, text = 'approved public question', requestId = randomUUID()) => ({
  identity, text, requestId, digest: digest(text), priceVersion: 'test-prices-v1', reservations: { openai: 400, anthropic: 600 }
});

async function fixture(run: (store: AwsChatState, identity: Identity, helpers: {
  tableName: string; clock: { time: number }; rows(): Promise<Record<string, import('@aws-sdk/client-dynamodb').AttributeValue>[]>;
  nextSession(visitor?: string): Promise<Identity>; secondStore(): AwsChatState;
}) => Promise<void>, limits?: Partial<StateLimits>) {
  if (!client) throw new Error('No local test client');
  const tableName = `chat-state-test-${randomUUID()}`;
  await client.send(new CreateTableCommand({
    TableName: tableName, BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [{ AttributeName: 'pk', AttributeType: 'S' }, { AttributeName: 'sk', AttributeType: 'S' }],
    KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }, { AttributeName: 'sk', KeyType: 'RANGE' }]
  }));
  const clock = { time: now };
  const store = new AwsChatState({ tableName, limits }, client, () => clock.time);
  const nextSession = async (visitor = visitorId): Promise<Identity> => {
    const created = await store.openSession({ visitorId: visitor }, signal);
    return { visitorId: visitor, credential: created.credential };
  };
  try {
    await run(store, await nextSession(), {
      tableName, clock, nextSession,
      secondStore: () => new AwsChatState({ tableName, limits }, client, () => clock.time),
      async rows() { return (await client!.send(new ScanCommand({ TableName: tableName, ConsistentRead: true }))).Items ?? []; }
    });
  } finally { await client.send(new DeleteTableCommand({ TableName: tableName })); }
}

integration('DynamoDB: session ownership and immediate expiry do not depend on TTL deletion', async () => {
  await fixture(async (store, identity, { clock }) => {
    const session = await store.requireSession(identity, signal);
    const resumed = await store.openSession(identity, signal);
    assert.equal(resumed.session.generation, session.generation);
    await assert.rejects(store.requireSession({ ...identity, visitorId: 'another-private-visitor' }, signal), { code: 'SESSION_EXPIRED' });
    clock.time = session.expiresAt;
    await assert.rejects(store.requireSession(identity, signal), { code: 'SESSION_EXPIRED' });
    await store.clear(identity, signal);
  });
});

integration('DynamoDB: identical request IDs replay, changed payload conflicts and charges reserve once', async () => {
  await fixture(async (store, identity, { rows, secondStore }) => {
    const request = input(identity);
    const first = await store.beginTurn(request, signal);
    assert.equal(first.kind, 'started');
    const second = await secondStore().beginTurn(request, signal);
    assert.equal(second.kind, 'running');
    await assert.rejects(store.beginTurn({ ...request, text: 'changed', digest: digest('changed') }, signal), { code: 'REQUEST_CONFLICT' });
    const budget = (await rows()).filter(row => row.pk?.S?.startsWith('BUDGET#'));
    assert.equal(budget.find(row => row.sk?.S === 'ALL')?.used?.N, '1000');
    const result = { kind: 'answer', answer: { blocks: ['approved claim'] } };
    const settled = await store.completeTurn({ turn: first.turn, actualCosts: { openai: 30, anthropic: 0 }, result, historyEntry: { text: request.text, result } }, signal);
    assert.equal(settled.published, true);
    const third = await store.beginTurn(request, signal);
    assert.equal(third.kind, 'finished');
    assert.deepEqual(third.turn.result, result);
    assert.equal((await store.requireSession(identity, signal)).history.length, 1);
    assert.equal(await store.isCancelled(first.turn, signal), false);
    const found = await secondStore().findTurn(identity, request.requestId, request.digest, signal);
    assert.equal(found?.kind, 'finished');
    assert.deepEqual(found?.turn.result, result);
    await assert.rejects(store.findTurn(identity, request.requestId, digest('different payload'), signal), { code: 'REQUEST_CONFLICT' });
    await assert.rejects(store.findTurn({ ...identity, visitorId: 'different-visitor-id' }, request.requestId, request.digest, signal), { code: 'SESSION_EXPIRED' });
  });
});

integration('DynamoDB: request lookup rejects expiry and clear but finished cancellation suppresses output', async () => {
  await fixture(async (store, identity, { clock }) => {
    const request = input(identity);
    assert.equal(await store.findTurn(identity, request.requestId, request.digest, signal), undefined);
    const started = await store.beginTurn(request, signal);
    assert.equal((await store.findTurn(identity, request.requestId, request.digest, signal))?.kind, 'running');
    await store.completeTurn({ turn: started.turn, actualCosts: { openai: 20, anthropic: 0 }, result: { kind: 'answer' } }, signal);
    assert.equal(await store.isCancelled(started.turn, signal), false);
    assert.equal(await store.cancel(identity, request.requestId, signal), 'already_finished');
    assert.equal(await store.isCancelled(started.turn, signal), true);
    clock.time += 24 * 60 * 60 * 1000;
    await assert.rejects(store.findTurn(identity, request.requestId, request.digest, signal), { code: 'SESSION_EXPIRED' });
    clock.time -= 24 * 60 * 60 * 1000;
    await store.clear(identity, signal);
    await assert.rejects(store.findTurn(identity, request.requestId, request.digest, signal), { code: 'SESSION_EXPIRED' });
  });
});

integration('DynamoDB: two simultaneous turns in one session cannot both start', async () => {
  await fixture(async (store, identity, { rows, secondStore }) => {
    const results = await Promise.allSettled([store.beginTurn(input(identity), signal), secondStore().beginTurn(input(identity), signal)]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(results.filter(result => result.status === 'rejected').length, 1);
    const all = await rows();
    assert.equal(all.filter(row => row.pk?.S?.startsWith('REQUEST#')).length, 1);
    assert.equal(all.find(row => row.sk?.S === 'ALL')?.used?.N, '1000');
    assert.equal(all.find(row => row.pk?.S?.startsWith('VISITOR#'))?.turns?.N, '1');
  });
});

integration('DynamoDB: simultaneous identical request IDs create only one paid reservation', async () => {
  await fixture(async (store, identity, { rows, secondStore }) => {
    const request = input(identity);
    const results = await Promise.allSettled([store.beginTurn(request, signal), secondStore().beginTurn(request, signal)]);
    assert.equal(results.filter(result => result.status === 'fulfilled' && result.value.kind === 'started').length, 1);
    assert.equal((await store.beginTurn(request, signal)).kind, 'running');
    const all = await rows();
    assert.equal(all.filter(row => row.pk?.S?.startsWith('REQUEST#')).length, 1);
    assert.equal(all.find(row => row.sk?.S === 'ALL')?.used?.N, '1000');
  });
});

integration('DynamoDB: ambiguous transaction response cannot start or refund work twice', async () => {
  await fixture(async (store, identity, { tableName, clock, rows }) => {
    let loseNextResponse = true;
    const uncertainClient = new Proxy(client!, {
      get(target, property) {
        if (property !== 'send') return Reflect.get(target, property);
        return async (command: Parameters<DynamoDBClient['send']>[0], options: { abortSignal: AbortSignal }) => {
          const result = await target.send(command, options);
          if (command instanceof TransactWriteItemsCommand && loseNextResponse) {
            loseNextResponse = false;
            throw new Error('Connection lost after database commit');
          }
          return result;
        };
      }
    });
    const uncertain = new AwsChatState({ tableName }, uncertainClient, () => clock.time);
    const request = input(identity);
    await assert.rejects(uncertain.beginTurn(request, signal), { code: 'STATE_UNAVAILABLE' });
    const recovered = await store.beginTurn(request, signal);
    assert.equal(recovered.kind, 'running');
    loseNextResponse = true;
    const completion = { turn: recovered.turn, actualCosts: { openai: 30, anthropic: 0 }, result: { kind: 'error' } };
    await assert.rejects(uncertain.completeTurn(completion, signal), { code: 'STATE_UNAVAILABLE' });
    await store.completeTurn(completion, signal);
    await store.completeTurn(completion, signal);
    assert.equal((await rows()).find(row => row.sk?.S === 'ALL')?.used?.N, '30');
  });
});

integration('DynamoDB: independent Lambda instances cannot overspend the shared aggregate budget', async () => {
  await fixture(async (store, identity, { nextSession, secondStore, rows }) => {
    const identities = [identity, await nextSession(), await nextSession(), await nextSession()];
    const results = await Promise.allSettled(identities.map((item, index) => (index % 2 ? store : secondStore()).beginTurn(input(item), signal)));
    assert.ok(results.filter(result => result.status === 'fulfilled').length <= 2);
    const used = Number((await rows()).find(row => row.sk?.S === 'ALL')?.used?.N ?? 0);
    assert.ok(used <= 2000);
    assert.equal(used, results.filter(result => result.status === 'fulfilled').length * 1000);
  }, { monthlyBudgetMicros: 2000 });
});

integration('DynamoDB: provider allowance can reject before the aggregate allowance is used', async () => {
  await fixture(async (store, identity, { nextSession }) => {
    await store.beginTurn(input(identity), signal);
    await assert.rejects(store.beginTurn(input(await nextSession()), signal), { code: 'BUDGET_EXHAUSTED' });
  }, { providerBudgetMicros: { openai: 400, anthropic: 10_000 } });
});

integration('DynamoDB: settlement is exactly once and keeps actual provider totals', async () => {
  await fixture(async (store, identity, { secondStore, rows }) => {
    const request = input(identity);
    const first = await store.beginTurn(request, signal);
    const completion = { turn: first.turn, actualCosts: { openai: 100, anthropic: 50 }, result: { kind: 'error', code: 'upstream_failure' } };
    await Promise.all([store.completeTurn(completion, signal), secondStore().completeTurn(completion, signal)]);
    await store.completeTurn(completion, signal);
    const all = await rows();
    assert.equal(all.find(row => row.sk?.S === 'ALL')?.used?.N, '150');
    assert.equal(all.find(row => row.sk?.S === 'openai')?.used?.N, '100');
    assert.equal(all.find(row => row.sk?.S === 'anthropic')?.used?.N, '50');
  });
});

integration('DynamoDB: clear revokes generation, removes input and blocks late history while preserving charged work', async () => {
  await fixture(async (store, identity, { rows }) => {
    const request = input(identity, 'a private job description');
    const first = await store.beginTurn(request, signal);
    await store.clear(identity, signal);
    assert.equal(await store.isCancelled(first.turn, signal), true);
    const result = { kind: 'answer', answer: { blocks: ['approved fact'] } };
    const completed = await store.completeTurn({ turn: first.turn, actualCosts: first.turn.reservations, result, historyEntry: { text: request.text, result } }, signal);
    assert.equal(completed.published, false);
    await assert.rejects(store.requireSession(identity, signal), { code: 'SESSION_EXPIRED' });
    const all = await rows();
    assert.ok(!JSON.stringify(all).includes(request.text));
    assert.equal(all.find(row => row.sk?.S === 'ALL')?.used?.N, '1000');
    assert.equal(all.find(row => row.pk?.S?.startsWith('REQUEST#'))?.status?.S, 'finished');
  });
});

integration('DynamoDB: cancel after expiry remains authorised and unknown dispatched cost is retained', async () => {
  await fixture(async (store, identity, { clock, rows }) => {
    const first = await store.beginTurn(input(identity), signal);
    clock.time += 24 * 60 * 60 * 1000;
    await assert.rejects(store.cancel({ ...identity, visitorId: 'wrong-visitor-identity' }, first.turn.requestId, signal), { code: 'SESSION_EXPIRED' });
    assert.equal(await store.cancel(identity, first.turn.requestId, signal), 'requested');
    assert.equal(await store.isCancelled(first.turn, signal), true);
    const result = await store.completeTurn({ turn: first.turn, actualCosts: first.turn.reservations, result: { kind: 'cancelled' } }, signal);
    assert.equal(result.published, false);
    assert.equal((await rows()).find(row => row.sk?.S === 'ALL')?.used?.N, '1000');
  });
});

integration('DynamoDB: visitor allowances survive clear and fresh sessions', async () => {
  await fixture(async (store, identity, { nextSession }) => {
    const first = await store.beginTurn(input(identity), signal);
    await store.clear(identity, signal);
    await store.completeTurn({ turn: first.turn, actualCosts: first.turn.reservations, result: { kind: 'cancelled' } }, signal);
    await assert.rejects(store.beginTurn(input(await nextSession()), signal), { code: 'RATE_LIMITED' });
  }, { dailyVisitorTurns: 1 });
});

integration('DynamoDB: eight-turn cap applies to settled and failed turns', async () => {
  await fixture(async (store, identity) => {
    for (let index = 0; index < 8; index++) {
      const begun = await store.beginTurn(input(identity), signal);
      await store.completeTurn({ turn: begun.turn, actualCosts: { openai: 0, anthropic: 0 }, result: { kind: 'error' } }, signal);
    }
    assert.equal((await store.requireSession(identity, signal)).remainingTurns, 0);
    await assert.rejects(store.beginTurn(input(identity), signal), { code: 'RATE_LIMITED' });
  });
});

integration('DynamoDB: expired active lease stays charged and same-ID retry never restarts work', async () => {
  await fixture(async (store, identity, { clock, rows }) => {
    const request = input(identity);
    const first = await store.beginTurn(request, signal);
    clock.time += 120_001;
    const repeated = await store.beginTurn(request, signal);
    assert.equal(repeated.kind, 'running');
    const next = await store.beginTurn(input(identity), signal);
    assert.equal(next.kind, 'started');
    assert.equal(await store.isCancelled(first.turn, signal), true);
    assert.equal((await rows()).find(row => row.sk?.S === 'ALL')?.used?.N, '2000');
  });
});

integration('DynamoDB: month rollover settles against the original reservation month', async () => {
  await fixture(async (store, identity, { clock, rows }) => {
    clock.time = Date.UTC(2026, 9, 31, 23, 59, 55);
    const first = await store.beginTurn(input(identity), signal);
    clock.time = Date.UTC(2026, 10, 1, 0, 0, 1);
    await store.completeTurn({ turn: first.turn, actualCosts: { openai: 20, anthropic: 0 }, result: { kind: 'error' } }, signal);
    assert.equal((await rows()).find(row => row.pk?.S === 'BUDGET#2026-10' && row.sk?.S === 'ALL')?.used?.N, '20');
    assert.ok(!(await rows()).some(row => row.pk?.S === 'BUDGET#2026-11'));
  });
});
