import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { DynamoDBClient, CreateTableCommand, DeleteTableCommand, ScanCommand, TransactWriteItemsCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
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

integration('DynamoDB: generated replies stay in session history, replay with ownership and disappear on clear', async () => {
  await fixture(async (store, identity, { rows, secondStore }) => {
    const request = input(identity, 'The visitor shared a private detail.');
    const first = await store.beginTurn(request, signal);
    const replyText = 'A private generated follow-up that must not remain in the accounting ledger.';
    const result = { kind: 'answer', reply: { text: replyText, basis: 'general_knowledge' },
      answer: { blocks: ['canonical public evidence'] }, trace: [{ stage: 'context', state: 'completed' }] };
    const completion = { turn: first.turn, actualCosts: { openai: 30, anthropic: 0 }, result,
      historyEntry: { text: request.text, result, requestId: 'untrusted-caller-value' } };
    assert.equal((await store.completeTurn(completion, signal)).published, true);
    const all = await rows();
    const ledger = all.find(row => row.pk?.S?.startsWith('REQUEST#'))!;
    assert.ok(!JSON.stringify(ledger).includes(replyText));
    assert.ok(!Object.hasOwn(JSON.parse(ledger.result!.S!), 'reply'));
    assert.equal(ledger.resultDigest?.S, digest(JSON.stringify(result)));
    const history = (await store.requireSession(identity, signal)).history;
    assert.equal(history[0]?.requestId, first.turn.requestId);
    assert.deepEqual(history[0]?.result, result);
    const found = await secondStore().findTurn(identity, request.requestId, request.digest, signal);
    assert.deepEqual(found?.turn.result, result);
    assert.deepEqual((await store.beginTurn(request, signal)).turn.result, result);
    await assert.rejects(store.findTurn({ ...identity, visitorId: 'another-private-visitor' }, request.requestId, request.digest, signal), { code: 'SESSION_EXPIRED' });
    await store.completeTurn(completion, signal);
    assert.equal((await rows()).find(row => row.sk?.S === 'ALL')?.used?.N, '30');
    assert.equal((await store.requireSession(identity, signal)).history.length, 1);
    const conflicting = { ...completion, result: { ...result, reply: { text: 'Changed output' } } };
    assert.equal((await store.completeTurn(conflicting, signal)).published, false);
    assert.deepEqual((await store.requireSession(identity, signal)).history[0]?.result, result);
    await store.clear(identity, signal);
    const cleared = await rows();
    assert.ok(!JSON.stringify(cleared).includes(replyText));
    assert.ok(!JSON.stringify(cleared).includes(request.text));
    assert.equal(cleared.find(row => row.sk?.S === 'ALL')?.used?.N, '30');
    await assert.rejects(store.findTurn(identity, request.requestId, request.digest, signal), { code: 'SESSION_EXPIRED' });
  });
});

integration('DynamoDB: late completion after clear never persists generated text or restores history', async () => {
  await fixture(async (store, identity, { rows }) => {
    const request = input(identity, 'A private input awaiting its answer.');
    const first = await store.beginTurn(request, signal);
    await store.clear(identity, signal);
    const reply = 'Late private generated text';
    const result = { kind: 'answer', reply: { text: reply }, answer: { blocks: ['public canonical content'] } };
    const completed = await store.completeTurn({ turn: first.turn, actualCosts: { openai: 70, anthropic: 0 }, result,
      historyEntry: { text: request.text, result } }, signal);
    assert.equal(completed.published, false);
    const all = await rows();
    assert.ok(!JSON.stringify(all).includes(reply));
    assert.ok(!JSON.stringify(all).includes(request.text));
    assert.equal(all.find(row => row.sk?.S === 'ALL')?.used?.N, '70');
    assert.equal(all.find(row => row.pk?.S?.startsWith('SESSION#'))?.history?.S, '[]');
  });
});

integration('DynamoDB: cancelled and legacy results replay canonical evidence without recovering generated reply', async () => {
  await fixture(async (store, identity, { tableName }) => {
    const request = input(identity);
    const first = await store.beginTurn(request, signal);
    const canonical = { kind: 'answer', answer: { blocks: ['public canonical fact'] } };
    const full = { ...canonical, reply: { text: 'Only the session may retain this generated text.' } };
    await store.completeTurn({ turn: first.turn, actualCosts: { openai: 10, anthropic: 0 }, result: full,
      historyEntry: { text: request.text, result: full } }, signal);
    await store.cancel(identity, request.requestId, signal);
    assert.deepEqual((await store.findTurn(identity, request.requestId, request.digest, signal))?.turn.result, canonical);

    const secondIdentity = await store.openSession({ visitorId }, signal);
    const legacyRequest = input({ visitorId, credential: secondIdentity.credential });
    const legacy = await store.beginTurn(legacyRequest, signal);
    await store.completeTurn({ turn: legacy.turn, actualCosts: { openai: 10, anthropic: 0 }, result: canonical,
      historyEntry: { text: legacyRequest.text, result: canonical } }, signal);
    await client!.send(new UpdateItemCommand({
      TableName: tableName, Key: { pk: { S: `REQUEST#${legacy.turn.sessionId}` }, sk: { S: legacy.turn.requestId } },
      UpdateExpression: 'REMOVE resultDigest'
    }));
    assert.deepEqual((await store.findTurn(legacyRequest.identity, legacyRequest.requestId, legacyRequest.digest, signal))?.turn.result, canonical);
    assert.equal((await store.completeTurn({ turn: legacy.turn, actualCosts: { openai: 10, anthropic: 0 }, result: canonical }, signal)).published, false);
  });
});

integration('DynamoDB: 3-point time boundaries for session expiry and active turn lease expiry', async () => {
  await fixture(async (store, identity, { clock, nextSession, rows }) => {
    const session = await store.requireSession(identity, signal);
    const expiresAt = session.expiresAt;
    const req1 = input(identity, 'Boundary test question');

    // Session expiry: expiresAt - 1 succeeds
    clock.time = expiresAt - 1;
    const validAtMinusOne = await store.requireSession(identity, signal);
    assert.equal(validAtMinusOne.id, session.id);

    // Session expiry: exact expiresAt fails closed
    clock.time = expiresAt;
    await assert.rejects(store.requireSession(identity, signal), { code: 'SESSION_EXPIRED' });
    await assert.rejects(store.beginTurn(req1, signal), { code: 'SESSION_EXPIRED' });
    await assert.rejects(store.findTurn(identity, req1.requestId, req1.digest, signal), { code: 'SESSION_EXPIRED' });

    // Session expiry: expiresAt + 1 fails closed
    clock.time = expiresAt + 1;
    await assert.rejects(store.requireSession(identity, signal), { code: 'SESSION_EXPIRED' });
    await assert.rejects(store.beginTurn(req1, signal), { code: 'SESSION_EXPIRED' });

    // Active turn lease expiry: leaseExpiresAt - 1, leaseExpiresAt, leaseExpiresAt + 1
    clock.time = now;
    const freshIdentity = await nextSession('private-visitor-lease-0002');
    const started1 = await store.beginTurn(input(freshIdentity, 'Turn 1'), signal);
    const lease1ExpiresAt = now + 120_000;

    // Point 1: leaseExpiresAt - 1 -> still active, second turn blocked with REQUEST_ACTIVE
    clock.time = lease1ExpiresAt - 1;
    assert.equal(await store.isCancelled(started1.turn, signal), false);
    await assert.rejects(store.beginTurn(input(freshIdentity, 'Turn 2 blocked'), signal), { code: 'REQUEST_ACTIVE' });

    // Point 2: exact leaseExpiresAt -> lease expired, isCancelled is true, late completion settles cost but does not publish history
    clock.time = lease1ExpiresAt;
    assert.equal(await store.isCancelled(started1.turn, signal), true);
    const lateResult = { kind: 'answer', reply: { text: 'Late reply at exact lease boundary' }, answer: { blocks: ['approved fact'] } };
    const lateComplete = await store.completeTurn({
      turn: started1.turn,
      actualCosts: { openai: 45, anthropic: 0 },
      result: lateResult,
      historyEntry: { text: 'Turn 1', result: lateResult }
    }, signal);
    assert.equal(lateComplete.published, false);
    assert.equal((await store.requireSession(freshIdentity, signal)).history.length, 0);

    // Turn 2 can now start at exact leaseExpiresAt
    const started2 = await store.beginTurn(input(freshIdentity, 'Turn 2 started at boundary'), signal);
    assert.equal(started2.kind, 'started');
    const lease2ExpiresAt = clock.time + 120_000;

    // Point 3: lease2ExpiresAt + 1 -> lease expired, Turn 3 can start
    clock.time = lease2ExpiresAt + 1;
    assert.equal(await store.isCancelled(started2.turn, signal), true);
    const started3 = await store.beginTurn(input(freshIdentity, 'Turn 3 started after boundary'), signal);
    assert.equal(started3.kind, 'started');
    assert.equal((await rows()).find(row => row.sk?.S === 'ALL')?.used?.N, String(45 + 1000 + 1000));
  });
});

integration('DynamoDB: multi-component spend reservation and settlement breakdown metadata persist and settle atomically', async () => {
  await fixture(async (store, identity, { rows, secondStore }) => {
    const req = {
      ...input(identity, 'Evaluate my cloud architecture job requirements'),
      reservations: { openai: 11_060, anthropic: 10_804 },
      reservationComponents: {
        embeddingMicros: 256,
        openaiGenerationMicros: 10_804,
        anthropicGenerationMicros: 10_804
      }
    };
    const started = await store.beginTurn(req, signal);
    assert.equal(started.kind, 'started');
    assert.deepEqual(started.turn.reservationComponents, req.reservationComponents);

    const beforeRows = await rows();
    assert.equal(beforeRows.find(row => row.sk?.S === 'ALL')?.used?.N, '21864');
    assert.equal(beforeRows.find(row => row.sk?.S === 'openai')?.used?.N, '11060');
    assert.equal(beforeRows.find(row => row.sk?.S === 'anthropic')?.used?.N, '10804');

    const result = { kind: 'answer', answer: { blocks: ['canonical claim'] } };
    const chargeComponents = { embeddingMicros: 18, generationMicros: 162, mcpCalls: 2, retrievalMatched: 4 };
    const settled = await store.completeTurn({
      turn: started.turn,
      actualCosts: { openai: 180, anthropic: 0 },
      chargeComponents,
      result,
      historyEntry: { text: req.text, result }
    }, signal);
    assert.equal(settled.published, true);

    const afterRows = await rows();
    assert.equal(afterRows.find(row => row.sk?.S === 'ALL')?.used?.N, '180');
    assert.equal(afterRows.find(row => row.sk?.S === 'openai')?.used?.N, '180');
    assert.equal(afterRows.find(row => row.sk?.S === 'anthropic')?.used?.N, '0');

    const lookedUp = await secondStore().getRequest(identity, req.requestId, req.digest, signal);
    assert.equal(lookedUp?.kind, 'finished');
    assert.deepEqual(lookedUp?.turn.reservationComponents, req.reservationComponents);
    assert.deepEqual(lookedUp?.turn.actualCosts, { openai: 180, anthropic: 0 });
    assert.deepEqual(lookedUp?.turn.chargeComponents, chargeComponents);

    // Verify failTurn and cancelTurn on a second turn
    const req2 = input(identity, 'Second turn that fails after embedding');
    const started2 = await store.beginTurn(req2, signal);
    assert.equal(await store.cancelTurn(identity, req2.requestId, signal), 'requested');
    const failed = await store.failTurn({
      turn: started2.turn,
      actualCosts: { openai: 40, anthropic: 0 },
      chargeComponents: { embeddingMicros: 40, generationMicros: 0, mcpCalls: 0, retrievalMatched: 0 },
      code: 'upstream_failure',
      retryable: true
    }, signal);
    assert.equal(failed.published, false);
    assert.equal((await rows()).find(row => row.sk?.S === 'ALL')?.used?.N, '220');
  });
});

integration('DynamoDB: 8-stage trace (routing, retrieval, mcp, context, budget, provider, validation, settlement) persists and replays across 18 frames', async () => {
  const { createEventValidator } = require('../../../chat/contracts/index.cjs') as {
    createEventValidator(input: { requestId: string; generation: string; corpus: unknown }): { accept(value: unknown): void }
  };
  const corpus = require('../../../chat/knowledge/corpus.json') as { corpusVersion: string };

  await fixture(async (store, identity, { secondStore }) => {
    const req = input(identity, 'Show me Josh Boyer takeover tooling and Medavie details');
    const started = await store.beginTurn(req, signal);
    const trace = [
      { stage: 'context', state: 'completed', elapsedMs: 2, durationMs: 2, corpusVersion: corpus.corpusVersion, claimCount: 16 },
      { stage: 'routing', state: 'completed', elapsedMs: 5, durationMs: 3, routingMode: 'portfolio_mcp', needsRetrieval: true, requestedTools: ['search_public_evidence', 'get_case_study'] },
      { stage: 'budget', state: 'completed', elapsedMs: 8, durationMs: 3, reservedMicros: 1000, priceVersion: 'test-prices-v1' },
      { stage: 'retrieval', state: 'started', elapsedMs: 10 },
      { stage: 'retrieval', state: 'completed', elapsedMs: 28, durationMs: 18, retrievalMode: 'hybrid', matchedCount: 5, corpusVersion: corpus.corpusVersion, embeddingModel: 'text-embedding-3-small', indexVersion: 's3vec-v1' },
      { stage: 'mcp', state: 'started', elapsedMs: 30, mcpMethod: 'initialize' },
      { stage: 'mcp', state: 'completed', elapsedMs: 34, durationMs: 4, mcpMethod: 'initialize', toolOutcome: 'completed' },
      { stage: 'mcp', state: 'started', elapsedMs: 35, mcpMethod: 'tools/list' },
      { stage: 'mcp', state: 'completed', elapsedMs: 39, durationMs: 4, mcpMethod: 'tools/list', toolOutcome: 'completed' },
      { stage: 'mcp', state: 'started', elapsedMs: 40, mcpMethod: 'tools/call', toolName: 'search_public_evidence', toolCallId: 'tool-takeover-1' },
      { stage: 'mcp', state: 'completed', elapsedMs: 55, durationMs: 15, mcpMethod: 'tools/call', toolName: 'search_public_evidence', toolCallId: 'tool-takeover-1', toolOutcome: 'completed' },
      { stage: 'mcp', state: 'started', elapsedMs: 56, mcpMethod: 'tools/call', toolName: 'get_case_study', toolCallId: 'tool-takeover-2' },
      { stage: 'mcp', state: 'completed', elapsedMs: 70, durationMs: 14, mcpMethod: 'tools/call', toolName: 'get_case_study', toolCallId: 'tool-takeover-2', toolOutcome: 'completed' },
      { stage: 'provider', state: 'started', elapsedMs: 72, attempt: 1, provider: 'openai', model: 'gpt-6-luna', reservedMicros: 400 },
      { stage: 'provider', state: 'failed', elapsedMs: 95, durationMs: 23, attempt: 1, provider: 'openai', model: 'gpt-6-luna', usageStatus: 'unknown', chargedMicros: 400, code: 'upstream_failure' },
      { stage: 'provider', state: 'started', elapsedMs: 96, attempt: 2, provider: 'anthropic', model: 'claude-haiku-5-5', reservedMicros: 600 },
      { stage: 'provider', state: 'completed', elapsedMs: 140, durationMs: 44, attempt: 2, provider: 'anthropic', model: 'claude-haiku-5-5', usageStatus: 'known', inputTokens: 320, outputTokens: 64, chargedMicros: 96 },
      { stage: 'validation', state: 'started', elapsedMs: 141, attempt: 2 },
      { stage: 'validation', state: 'completed', elapsedMs: 146, durationMs: 5, attempt: 2, corpusVersion: corpus.corpusVersion, claimCount: 2 }
    ];
    const settlement = { reservedMicros: 1000, chargedMicros: 496, priceVersion: 'test-prices-v1' };
    const result = {
      kind: 'answer',
      reply: { kind: 'portfolio', text: 'Here are the verified takeover tooling and Medavie integration details.', suggestions: ['What about NEXUS?'] },
      answer: { blocks: ['canonical takeover block'] },
      trace,
      settlement
    };

    const completed = await store.completeTurn({
      turn: started.turn,
      actualCosts: { openai: 400, anthropic: 96 },
      chargeComponents: { embeddingMicros: 12, generationMicros: 484, mcpCalls: 2, retrievalMatched: 5 },
      result,
      historyEntry: { text: req.text, result }
    }, signal);
    assert.equal(completed.published, true);

    const replayed = await secondStore().getRequest(identity, req.requestId, req.digest, signal);
    assert.equal(replayed?.kind, 'finished');
    const savedResult = replayed?.turn.result as typeof result;
    assert.equal(savedResult.trace.length, 19);
    assert.deepEqual(savedResult.trace, trace);

    // Validate all 19 stored frames + replayed settlement frame with A01's createEventValidator
    const validator = createEventValidator({ requestId: req.requestId, generation: started.turn.generation, corpus });
    let seq = 0;
    for (const point of savedResult.trace) {
      validator.accept({ schemaVersion: '1.0.0', requestId: req.requestId, generation: started.turn.generation, seq: ++seq, event: 'trace', data: point });
    }
    validator.accept({
      schemaVersion: '1.0.0',
      requestId: req.requestId,
      generation: started.turn.generation,
      seq: ++seq,
      event: 'trace',
      data: { stage: 'settlement', state: 'completed', elapsedMs: null, replayed: true, ...savedResult.settlement }
    });
  });
});

integration('DynamoDB: canary privacy enforcement across REQ#, SESSION#, BUDGET# and VISITOR# before and after clear()', async () => {
  const corpus = require('../../../chat/knowledge/corpus.json') as { corpusVersion: string };
  const canaryPrompt = 'CANARY-A12-PROMPT-991';
  const canaryReply = 'CANARY-A12-REPLY-992';
  const canaryJobText = 'CANARY-A12-JOBTEXT-993';

  await fixture(async (store, identity, { rows }) => {
    const visitorMessage = `Please compare this job description: ${canaryPrompt} and ${canaryJobText}`;
    const req = input(identity, visitorMessage);
    const started = await store.beginTurn(req, signal);

    // Attempting to store raw jobText or prompt on result must be rejected by runtime privacy guard
    await assert.rejects(store.completeTurn({
      turn: started.turn,
      actualCosts: { openai: 50, anthropic: 0 },
      result: { kind: 'answer', answer: { blocks: [] }, jobText: canaryJobText }
    }, signal), { code: 'INVALID_REQUEST' });

    const validResult = {
      kind: 'answer',
      reply: {
        kind: 'portfolio',
        text: `Conversational synthesis that stays only in active session: ${canaryReply}`,
        suggestions: ['Tell me about NEXUS']
      },
      answer: { blocks: ['canonical claim without untrusted text'] },
      trace: [
        { stage: 'context', state: 'completed', elapsedMs: 1, durationMs: 1, corpusVersion: corpus.corpusVersion, claimCount: 16 },
        { stage: 'routing', state: 'completed', elapsedMs: 3, durationMs: 2, routingMode: 'portfolio_mcp', needsRetrieval: true, requestedTools: ['compare_job_requirements'] },
        { stage: 'retrieval', state: 'started', elapsedMs: 4 },
        { stage: 'retrieval', state: 'completed', elapsedMs: 12, durationMs: 8, retrievalMode: 'hybrid', matchedCount: 3, corpusVersion: corpus.corpusVersion },
        { stage: 'mcp', state: 'started', elapsedMs: 13, mcpMethod: 'tools/call', toolName: 'compare_job_requirements', toolCallId: 'tool-job-1' },
        { stage: 'mcp', state: 'completed', elapsedMs: 25, durationMs: 12, mcpMethod: 'tools/call', toolName: 'compare_job_requirements', toolCallId: 'tool-job-1', toolOutcome: 'completed' }
      ],
      settlement: { reservedMicros: 1000, chargedMicros: 50, priceVersion: 'test-prices-v1' }
    };

    const settled = await store.completeTurn({
      turn: started.turn,
      actualCosts: { openai: 50, anthropic: 0 },
      chargeComponents: { embeddingMicros: 10, generationMicros: 40, mcpCalls: 1, retrievalMatched: 3 },
      result: validResult,
      historyEntry: { text: req.text, result: validResult }
    }, signal);
    assert.equal(settled.published, true);

    const beforeClearRows = await rows();
    const reqRowsBefore = beforeClearRows.filter(row => row.pk?.S?.startsWith('REQUEST#'));
    const budgetRowsBefore = beforeClearRows.filter(row => row.pk?.S?.startsWith('BUDGET#'));
    const visitorRowsBefore = beforeClearRows.filter(row => row.pk?.S?.startsWith('VISITOR#'));
    const sessionRowsBefore = beforeClearRows.filter(row => row.pk?.S?.startsWith('SESSION#'));

    assert.equal(reqRowsBefore.length, 1);
    assert.ok(budgetRowsBefore.length >= 2);
    assert.equal(visitorRowsBefore.length, 1);
    assert.equal(sessionRowsBefore.length, 1);

    // Durable REQ#, BUDGET#, and VISITOR# items must contain 0 occurrences of all 3 canaries even BEFORE clear()
    const nonSessionJsonBefore = JSON.stringify([...reqRowsBefore, ...budgetRowsBefore, ...visitorRowsBefore]);
    for (const canary of [canaryPrompt, canaryReply, canaryJobText]) {
      assert.equal(nonSessionJsonBefore.includes(canary), false, `Forbidden canary ${canary} leaked into durable ledger before clear()`);
    }

    // SESSION# holds the active conversation prior to clear()
    const sessionJsonBefore = JSON.stringify(sessionRowsBefore);
    assert.equal(sessionJsonBefore.includes(canaryReply), true);

    // Clear session and verify 0 occurrences across ALL DynamoDB items (REQ#, SESSION#, BUDGET#, VISITOR#)
    await store.clear(identity, signal);
    const afterClearRows = await rows();
    const allDynamoJsonAfter = JSON.stringify(afterClearRows);
    for (const canary of [canaryPrompt, canaryReply, canaryJobText]) {
      assert.equal(allDynamoJsonAfter.includes(canary), false, `Forbidden canary ${canary} remained in DynamoDB after clear()`);
    }
  });
});

test.after(() => client?.destroy());
