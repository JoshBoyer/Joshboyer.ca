import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { DynamoDBClient, CreateTableCommand, DeleteTableCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { createWorker } from '../../edge/src/worker.js';
import { AwsNonces } from '../src/aws.js';
import { authenticateChat } from '../src/private-request.js';
import { prepareChat, publicChatError } from '../src/chat.js';
import { AwsChatState, type StateLimits } from '../src/state.js';
import { CAG_CLAIM_IDS, CAG_VERSION } from '../src/cag.js';
import { MAX_PROVIDER_RESERVATION_MICROS } from '../src/chat-pricing.js';
import { CONFIG, KEYRING, fixtures } from './fixtures.js';
import type { RequestEvent } from '../src/envelope.js';
import type { TracePoint } from '../src/trace.js';

const { createEventValidator } = require('../../../chat/contracts/index.cjs') as {
  createEventValidator(input: { requestId: string; generation: string; corpus: unknown }): { accept(value: unknown): void }
};
const corpus = require('../../../chat/knowledge/corpus.json');

function observedTraces(stream: string, requestId: string, generation: string): TracePoint[] {
  const validator = createEventValidator({ requestId, generation, corpus });
  const frames = stream.trim().split('\n\n').map(part => JSON.parse(part.split('\ndata: ')[1]!));
  frames.forEach(frame => validator.accept(frame));
  return frames.filter(frame => frame.event === 'trace').map(frame => frame.data as TracePoint);
}

const endpoint = process.env.CHAT_TEST_DYNAMODB_ENDPOINT;
if (endpoint && !/^http:\/\/127\.0\.0\.1:\d{2,5}$/.test(endpoint)) throw new Error('CHAT_TEST_DYNAMODB_ENDPOINT must be loopback HTTP.');
const integration = endpoint ? test : test.skip;
const client = endpoint ? new DynamoDBClient({ endpoint, region: 'us-east-2', maxAttempts: 1,
  credentials: { accessKeyId: 'localonly', secretAccessKey: 'localonly' } }) : undefined;
const ORIGIN = 'https://private-chat.example';
const TOKEN = 'test-operator-' + 'a'.repeat(43);
test.after(() => client?.destroy());

function selectionResponse(provider: 'openai' | 'anthropic', unknownUsage: boolean) {
  const text = JSON.stringify({ schemaVersion: '1.0.0', corpusVersion: CAG_VERSION, claimIds: [CAG_CLAIM_IDS[0]], noticeCodes: [] });
  return Response.json(provider === 'openai' ? {
    model: CONFIG.models.openai, status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text }] }],
    usage: unknownUsage ? {} : { input_tokens: 100, output_tokens: 10, total_tokens: 110 }
  } : {
    model: CONFIG.models.anthropic, stop_reason: 'end_turn', content: [{ type: 'text', text }],
    usage: unknownUsage ? {} : { input_tokens: 100, output_tokens: 10 }
  });
}

function readable(source: AsyncIterable<string>): ReadableStream<Uint8Array> {
  const iterator = source[Symbol.asyncIterator]();
  return new ReadableStream({ async pull(controller) {
    try {
      const item = await iterator.next();
      if (item.done) controller.close(); else controller.enqueue(new TextEncoder().encode(item.value));
    } catch (error) { controller.error(error); }
  }, async cancel() { await iterator.return?.(); } });
}

async function fixture(run: (runtime: {
  send(method: string, path: string, body?: unknown): Promise<Response>;
  raw(method: string, path: string, body?: unknown, cookie?: string): Promise<Response>;
  rows(): Promise<Record<string, import('@aws-sdk/client-dynamodb').AttributeValue>[]>;
  calls: string[]; cookies: Map<string, string>;
}) => Promise<void>, options: { limits?: Partial<StateLimits>; failOpenai?: boolean; unknownUsage?: boolean } = {}) {
  if (!client) throw new Error('No DynamoDB Local client');
  const tableName = 'phase3-http-test-' + randomUUID();
  await client.send(new CreateTableCommand({ TableName: tableName, BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [{ AttributeName: 'pk', AttributeType: 'S' }, { AttributeName: 'sk', AttributeType: 'S' }],
    KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }, { AttributeName: 'sk', KeyType: 'RANGE' }] }));
  const oldPrivate = process.env.CHAT_PRIVATE_ENABLED, oldPublic = process.env.PUBLIC_CHAT_ENABLED;
  process.env.CHAT_PRIVATE_ENABLED = 'true'; process.env.PUBLIC_CHAT_ENABLED = 'false';
  const state = new AwsChatState({ tableName, limits: options.limits }, client);
  const secrets = fixtures().dependencies.secrets;
  const nonces = new AwsNonces(client);
  const config = { ...CONFIG, stateTable: tableName };
  const calls: string[] = [], cookies = new Map<string, string>();
  const worker = createWorker({ fetcher: async (url, init) => {
    const parsed = new URL(String(url));
    const event: RequestEvent = {
      httpMethod: init?.method, path: parsed.pathname.replace(/^\/dev/, ''), headers: Object.fromEntries(new Headers(init?.headers)),
      body: init?.body ? Buffer.from(init.body as Uint8Array).toString('utf8') : '', isBase64Encoded: false
    };
    try {
      const request = await authenticateChat(event, config, { secrets, nonces }, init?.signal ?? new AbortController().signal);
      const result = await prepareChat(request, config, { state, secrets, fetchImpl: async providerUrl => {
        const provider = String(providerUrl).includes('/openai/') ? 'openai' : 'anthropic'; calls.push(provider);
        if (provider === 'openai' && options.failOpenai) throw new Error('ambiguous transport failure');
        return selectionResponse(provider, !!options.unknownUsage);
      } }, init?.signal ?? new AbortController().signal);
      const headers = new Headers({ 'Content-Type': result.events ? 'text/event-stream; charset=utf-8' : 'application/json' });
      if (result.sessionToken) headers.set('Set-Cookie', `__Host-jb_chat=${result.sessionToken}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=86400`);
      if (result.clearSession) headers.set('Set-Cookie', '__Host-jb_chat=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0');
      return new Response(result.events ? readable(result.events) : JSON.stringify(result.body), { status: result.statusCode, headers });
    } catch (error) {
      const value = publicChatError(error);
      return Response.json({ schemaVersion: '1.0.0', error: { code: value.code, retryable: value.retryable } }, { status: value.statusCode });
    }
  } });
  const env = { AWS_ORIGIN: 'https://abc123def4.execute-api.us-east-2.amazonaws.com/dev', PROBE_TOKEN: TOKEN,
    EDGE_KEYRING: KEYRING, CHAT_PRIVATE_ENABLED: 'true', PUBLIC_CHAT_ENABLED: 'false' };
  const raw = async (method: string, path: string, body?: unknown, cookie?: string) => worker.fetch(new Request(ORIGIN + path, {
    method, headers: { Origin: ORIGIN, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  }), env);
  const send = async (method: string, path: string, body?: unknown) => {
    const response = await raw(method, path, body, [...cookies].map(([name, value]) => `${name}=${value}`).join('; '));
    const setCookie = response.headers.get('Set-Cookie');
    if (setCookie) {
      const [first] = setCookie.split(';');
      const position = first!.indexOf('=');
      const name = first!.slice(0, position), value = first!.slice(position + 1);
      if (value) cookies.set(name, value); else cookies.delete(name);
    }
    return response;
  };
  try {
    await run({ send, raw, cookies, calls, rows: async () => (await client!.send(new ScanCommand({ TableName: tableName, ConsistentRead: true }))).Items ?? [] });
  } finally {
    if (oldPrivate === undefined) delete process.env.CHAT_PRIVATE_ENABLED; else process.env.CHAT_PRIVATE_ENABLED = oldPrivate;
    if (oldPublic === undefined) delete process.env.PUBLIC_CHAT_ENABLED; else process.env.PUBLIC_CHAT_ENABLED = oldPublic;
    await client.send(new DeleteTableCommand({ TableName: tableName }));
  }
}

async function loginAndOpen(runtime: Parameters<Parameters<typeof fixture>[0]>[0]) {
  const unauthenticated = await runtime.raw('GET', '/api/chat/config');
  assert.equal(unauthenticated.status, 401);
  assert.equal((await runtime.send('POST', '/api/chat/access', { token: TOKEN })).status, 200);
  const opened = await runtime.send('POST', '/api/chat/session', {});
  assert.equal(opened.status, 200);
  const body = await opened.json() as { generation: string };
  assert.match(body.generation, /^[a-f0-9-]{36}$/);
  assert.ok(runtime.cookies.has('__Host-jb_chat'));
  return body;
}

integration('private HTTP path uses real signed edge authentication and DynamoDB state for chat, replay and clear', async () => {
  await fixture(async runtime => {
    const opened = await loginAndOpen(runtime);
    const message = { schemaVersion: '1.0.0', requestId: randomUUID(), text: 'Tell me about Dell.' };
    const reply = await runtime.send('POST', '/api/chat/messages', message);
    assert.equal(reply.status, 200);
    const stream = await reply.text();
    assert.match(stream, /event: answer_block/); assert.match(stream, /event: sources/); assert.match(stream, /event: done/);
    assert.ok(stream.includes(opened.generation));
    const traces = observedTraces(stream, message.requestId, opened.generation);
    assert.equal(traces.find(point => point.stage === 'provider' && point.state === 'completed')?.inputTokens, 100);
    assert.equal(traces.at(-1)?.stage, 'settlement');
    assert.equal(traces.at(-1)?.state, 'completed');
    const replay = await runtime.send('POST', '/api/chat/messages', message);
    const replayedStream = await replay.text();
    assert.match(replayedStream, /event: answer_block/);
    const replayedTraces = observedTraces(replayedStream, message.requestId, opened.generation);
    assert.deepEqual(replayedTraces.slice(0, -1), traces.slice(0, -1));
    assert.equal(replayedTraces.at(-1)?.elapsedMs, null);
    assert.equal(replayedTraces.at(-1)?.replayed, true);
    assert.deepEqual(runtime.calls, ['openai']);
    let rows = await runtime.rows();
    assert.equal(rows.find(row => row.sk?.S === 'ALL')?.used?.N, '25');
    assert.equal(rows.filter(row => row.pk?.S?.startsWith('REQUEST#')).length, 1);
    const saved = JSON.parse(rows.find(row => row.pk?.S?.startsWith('REQUEST#'))!.result!.S!);
    assert.deepEqual(saved.trace, traces.slice(0, -1));
    assert.equal(saved.settlement.chargedMicros, 25);
    const conflict = await runtime.send('POST', '/api/chat/messages', { ...message, text: 'Different text' });
    assert.equal(conflict.status, 409); await conflict.text();
    const oldCookie = [...runtime.cookies].map(([name, value]) => `${name}=${value}`).join('; ');
    const clear = await runtime.send('DELETE', '/api/chat/session', {});
    assert.equal(clear.status, 200);
    assert.equal((await clear.json() as { cleared: boolean }).cleared, true);
    const afterClear = await runtime.raw('POST', '/api/chat/messages', message, oldCookie);
    assert.equal(afterClear.status, 401); await afterClear.text();
    rows = await runtime.rows();
    assert.equal(rows.find(row => row.sk?.S === 'ALL')?.used?.N, '25');
    assert.equal(rows.find(row => row.pk?.S?.startsWith('SESSION#'))?.history?.S, '[]');
    assert.deepEqual(runtime.calls, ['openai']);
  });
});

integration('overlapping HTTP turns are bounded and identical pending retries do not invoke another model', async () => {
  await fixture(async runtime => {
    await loginAndOpen(runtime);
    const message = { schemaVersion: '1.0.0', requestId: randomUUID(), text: 'Dell support experience?' };
    const first = await runtime.send('POST', '/api/chat/messages', message);
    const same = await runtime.send('POST', '/api/chat/messages', message);
    assert.equal(same.status, 202); assert.equal((await same.json() as { status: string }).status, 'running');
    const different = await runtime.send('POST', '/api/chat/messages', { ...message, requestId: randomUUID() });
    assert.equal(different.status, 409); await different.text();
    assert.match(await first.text(), /event: done/);
    assert.deepEqual(runtime.calls, ['openai']);
    const rows = await runtime.rows();
    assert.equal(rows.filter(row => row.pk?.S?.startsWith('REQUEST#')).length, 1);
  });
});

integration('zero budget rejects the real HTTP path before provider dispatch or request ledger creation', async () => {
  await fixture(async runtime => {
    await loginAndOpen(runtime);
    const response = await runtime.send('POST', '/api/chat/messages', { schemaVersion: '1.0.0', requestId: randomUUID(), text: 'Dell?' });
    assert.equal(response.status, 429);
    assert.equal((await response.json() as { error: { code: string } }).error.code, 'budget_exhausted');
    assert.equal(runtime.calls.length, 0);
    assert.equal((await runtime.rows()).filter(row => row.pk?.S?.startsWith('REQUEST#')).length, 0);
  }, { limits: { monthlyBudgetMicros: 0 } });
});

integration('unknown provider usage stays fully charged through the signed HTTP path', async () => {
  await fixture(async runtime => {
    const opened = await loginAndOpen(runtime);
    const requestId = randomUUID();
    const response = await runtime.send('POST', '/api/chat/messages', { schemaVersion: '1.0.0', requestId, text: 'Dell?' });
    const text = await response.text();
    assert.match(text, /event: done/);
    const trace = observedTraces(text, requestId, opened.generation);
    assert.equal(trace.find(point => point.stage === 'provider' && point.state === 'completed')?.usageStatus, 'unknown');
    assert.equal(trace.at(-1)?.chargedMicros, MAX_PROVIDER_RESERVATION_MICROS);
    const rows = await runtime.rows();
    assert.equal(Number(rows.find(row => row.sk?.S === 'ALL')?.used?.N), MAX_PROVIDER_RESERVATION_MICROS);
    assert.deepEqual(runtime.calls, ['openai']);
  }, { unknownUsage: true });
});

integration('fallback retains ambiguous primary charge and reconciles the second provider in DynamoDB', async () => {
  await fixture(async runtime => {
    const opened = await loginAndOpen(runtime);
    const requestId = randomUUID();
    const response = await runtime.send('POST', '/api/chat/messages', { schemaVersion: '1.0.0', requestId, text: 'Dell?' });
    const text = await response.text();
    assert.match(text, /event: done/);
    const trace = observedTraces(text, requestId, opened.generation);
    assert.deepEqual(trace.filter(point => point.stage === 'provider').map(point => [point.attempt, point.provider, point.state]),
      [[1, 'openai', 'started'], [1, 'openai', 'failed'], [2, 'anthropic', 'started'], [2, 'anthropic', 'completed']]);
    const rows = await runtime.rows();
    assert.equal(Number(rows.find(row => row.sk?.S === 'ALL')?.used?.N), MAX_PROVIDER_RESERVATION_MICROS + 25);
    assert.equal(Number(rows.find(row => row.pk?.S?.startsWith('BUDGET#') && row.sk?.S === 'openai')?.used?.N), MAX_PROVIDER_RESERVATION_MICROS);
    assert.equal(Number(rows.find(row => row.pk?.S?.startsWith('BUDGET#') && row.sk?.S === 'anthropic')?.used?.N), 25);
    assert.deepEqual(runtime.calls, ['openai', 'anthropic']);
  }, { failOpenai: true });
});
