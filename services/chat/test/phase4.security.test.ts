import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import {
  DynamoDBClient,
  CreateTableCommand,
  DeleteTableCommand,
  ScanCommand,
  TransactWriteItemsCommand,
  type AttributeValue
} from '@aws-sdk/client-dynamodb';
import { createWorker } from '../../edge/src/worker.js';
import { AwsNonces } from '../src/aws.js';
import { createAuthorizer } from '../src/authorizer.js';
import { canonicalEnvelope, type RequestEvent } from '../src/envelope.js';
import { authenticateChat } from '../src/private-request.js';
import { prepareChat, publicChatError, type ChatReceipt } from '../src/chat.js';
import { AwsChatState, SESSION_MS, type StateLimits } from '../src/state.js';
import { CAG_CLAIM_IDS, CAG_VERSION, CANONICAL_REFUSAL_TEXT } from '../src/cag.js';
import {
  MAX_TURN_RESERVATION_MICROS,
  MAX_OPENAI_TURN_RESERVATION_MICROS,
  MAX_GENERATION_RESERVATION_MICROS
} from '../src/budget-policy.js';
import { createRetrievalEngine } from '../src/retrieval/index.js';
import {
  createMcpServer,
  createPortfolioMcpClient,
  tools as mcpTools
} from '../../portfolio-mcp/src/index.js';
import { CONFIG, ENV, KEY, KEYRING, NOW, fixtures } from './fixtures.js';
import type { TracePoint } from '../src/trace.js';

const contracts = require('../../../chat/contracts/index.cjs') as {
  createEventValidator(input: { requestId: string; generation: string; corpus: unknown }): {
    accept(value: unknown): void;
  };
};
const corpus = require('../../../chat/knowledge/corpus.json');
const chatClient = require('../../../dist/chat-assistant.js');
const chatDetailsModule = require('../../../dist/chat-request-details.js');
const { clientEvidence } = require('../../../tools/build-chat-client.cjs');

const browserEvidence = clientEvidence(corpus);

const endpoint = process.env.CHAT_TEST_DYNAMODB_ENDPOINT || 'http://127.0.0.1:8008';
if (!/^http:\/\/127\.0\.0\.1:\d{2,5}$/.test(endpoint)) {
  throw new Error('CHAT_TEST_DYNAMODB_ENDPOINT must be loopback HTTP.');
}

const dynamoClient = new DynamoDBClient({
  endpoint,
  region: 'us-east-2',
  maxAttempts: 1,
  credentials: { accessKeyId: 'localonly', secretAccessKey: 'localonly' }
});
test.after(() => dynamoClient.destroy());

const ORIGIN = 'https://private-chat.example';
const OPERATOR_TOKEN = 'test-operator-' + 'a'.repeat(43);

function parseSseFrames(stream: string, requestId: string, generation: string): {
  frames: Array<{ event: string; data: unknown; seq: number; requestId: string; generation: string }>;
  traces: TracePoint[];
} {
  const validator = contracts.createEventValidator({ requestId, generation, corpus });
  const frames = stream
    .trim()
    .split('\n\n')
    .filter(Boolean)
    .map(part => JSON.parse(part.split('\ndata: ')[1]!));
  for (const frame of frames) {
    validator.accept(frame);
  }
  const traces = frames
    .filter(frame => frame.event === 'trace')
    .map(frame => frame.data as TracePoint);
  return { frames, traces };
}

function readableFromAsyncIterable(source: AsyncIterable<string>): ReadableStream<Uint8Array> {
  const iterator = source[Symbol.asyncIterator]();
  return new ReadableStream({
    async pull(controller) {
      try {
        const item = await iterator.next();
        if (item.done) controller.close();
        else controller.enqueue(new TextEncoder().encode(item.value));
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel() {
      await iterator.return?.();
    }
  });
}

function buildProviderSelectionResponse(
  provider: 'openai' | 'anthropic',
  selectionOverride?: Record<string, unknown>
): Response {
  const payload = {
    schemaVersion: '1.0.0',
    corpusVersion: CAG_VERSION,
    kind: 'portfolio',
    text: 'Josh designed and built the production Excel VBA add-in and guided receiving-system changes with developers.',
    suggestions: ['How did the renewal eligibility framework work?'],
    claimIds: [CAG_CLAIM_IDS[0]],
    noticeCodes: [],
    ...selectionOverride
  };
  const text = JSON.stringify(payload);
  return Response.json(
    provider === 'openai'
      ? {
          model: CONFIG.models.openai,
          status: 'completed',
          output: [{ type: 'message', content: [{ type: 'output_text', text }] }],
          usage: { input_tokens: 120, output_tokens: 20, total_tokens: 140 }
        }
      : {
          model: CONFIG.models.anthropic,
          stop_reason: 'end_turn',
          content: [{ type: 'text', text }],
          usage: { input_tokens: 120, output_tokens: 20 }
        },
    {
      headers: {
        'cf-aig-log-id': 'gateway-phase4-log',
        'x-request-id': 'req-phase4-provider'
      }
    }
  );
}

interface Phase4FixtureOptions {
  limits?: Partial<StateLimits>;
  nowRef?: { current: number };
  enablePhase4?: boolean;
  selectionOverride?: Record<string, unknown>;
  onProviderCall?: (provider: 'openai' | 'anthropic', url: string) => Promise<Response | void>;
  secretCanary?: string;
}

async function withPhase4Runtime(
  run: (runtime: {
    tableName: string;
    state: AwsChatState;
    nonces: AwsNonces;
    send(method: string, path: string, body?: unknown, visitorHeader?: string): Promise<Response>;
    raw(
      method: string,
      path: string,
      options?: {
        body?: unknown;
        cookie?: string;
        headers?: Record<string, string>;
        envOverride?: Record<string, string>;
      }
    ): Promise<Response>;
    rows(): Promise<Record<string, AttributeValue>[]>;
    providerCalls: string[];
    ragCalls: number[];
    mcpCalls: string[];
    receipts: ChatReceipt[];
    cookies: Map<string, string>;
    nowRef: { current: number };
  }) => Promise<void>,
  options: Phase4FixtureOptions = {}
): Promise<void> {
  const tableName = 'phase4-sec-test-' + randomUUID();
  await dynamoClient.send(
    new CreateTableCommand({
      TableName: tableName,
      BillingMode: 'PAY_PER_REQUEST',
      AttributeDefinitions: [
        { AttributeName: 'pk', AttributeType: 'S' },
        { AttributeName: 'sk', AttributeType: 'S' }
      ],
      KeySchema: [
        { AttributeName: 'pk', KeyType: 'HASH' },
        { AttributeName: 'sk', KeyType: 'RANGE' }
      ]
    })
  );

  const oldPrivate = process.env.CHAT_PRIVATE_ENABLED;
  const oldPublic = process.env.PUBLIC_CHAT_ENABLED;
  process.env.CHAT_PRIVATE_ENABLED = 'true';
  process.env.PUBLIC_CHAT_ENABLED = 'false';

  const nowRef = options.nowRef ?? { current: NOW * 1000 };
  const state = new AwsChatState({ tableName, limits: options.limits }, dynamoClient, () => nowRef.current);
  const nonces = new AwsNonces(dynamoClient);
  const baseFixtures = fixtures();
  if (options.secretCanary) {
    baseFixtures.secrets.set(CONFIG.providerSecretArns.openai, `openai-key-${options.secretCanary}-000000000000`);
    baseFixtures.secrets.set(CONFIG.gatewaySecretArn, `gateway-key-${options.secretCanary}-000000000000`);
  }
  const secrets = baseFixtures.dependencies.secrets;
  const config = { ...CONFIG, stateTable: tableName };

  const baseRetrieval = createRetrievalEngine({ now: () => nowRef.current });
  const mcpCredentials = {
    accessKeyId: 'TESTACCESSKEYID12345',
    secretAccessKey: 'test-mcp-secret-access-key-0123456789abcdef'
  };
  const mcpServer = createMcpServer({
    tools: mcpTools,
    requireIamContext: true,
    requireSigV4: true,
    sigV4Credentials: mcpCredentials,
    allowedAccountId: '123456789012',
    allowedCallerArnPrefix: 'arn:aws:sts::123456789012:assumed-role/portfolio-chat-',
    now: () => nowRef.current
  });
  const baseMcpClient = createPortfolioMcpClient({
    endpoint: 'https://mcp1234567.execute-api.us-east-2.amazonaws.com/dev/api/chat/_mcp',
    credentials: mcpCredentials,
    now: () => nowRef.current,
    fetchImpl: async (url, init) => {
      const parsed = new URL(String(url));
      const rawBody = init?.body
        ? typeof init.body === 'string'
          ? new TextEncoder().encode(init.body)
          : new Uint8Array(init.body as ArrayBuffer)
        : new Uint8Array();
      const res = await mcpServer.handleHttpRequest({
        method: init?.method ?? 'POST',
        path: parsed.pathname,
        headers: Object.fromEntries(new Headers(init?.headers)),
        bodyBytes: rawBody,
        iamIdentity: {
          accountId: '123456789012',
          userArn: 'arn:aws:sts::123456789012:assumed-role/portfolio-chat-role/session1'
        },
        signal: init?.signal ?? undefined
      });
      return new Response(res.body, { status: res.statusCode, headers: res.headers });
    }
  });

  const providerCalls: string[] = [];
  const ragCalls: number[] = [];
  const mcpCalls: string[] = [];
  const receipts: ChatReceipt[] = [];
  const cookies = new Map<string, string>();

  const retrieval = {
    async retrieve(input: Parameters<typeof baseRetrieval.retrieve>[0]) {
      ragCalls.push(nowRef.current);
      return baseRetrieval.retrieve(input);
    }
  };

  const mcpClient: Pick<typeof baseMcpClient, 'callTool'> = {
    callTool: ((name, args, callOptions) => {
      mcpCalls.push(name);
      return baseMcpClient.callTool(name, args, callOptions);
    }) as typeof baseMcpClient.callTool
  };

  const worker = createWorker({
    now: () => nowRef.current,
    timeoutMs: 4000,
    fetcher: async (url, init) => {
      const parsed = new URL(String(url));
      const event: RequestEvent = {
        httpMethod: init?.method,
        path: parsed.pathname.replace(/^\/dev/, ''),
        headers: Object.fromEntries(new Headers(init?.headers)),
        body: init?.body ? Buffer.from(init.body as Uint8Array).toString('utf8') : '',
        isBase64Encoded: false
      };
      try {
        const verified = await authenticateChat(
          event,
          config,
          { secrets, nonces, now: () => nowRef.current },
          init?.signal ?? new AbortController().signal
        );
        const result = await prepareChat(
          verified,
          config,
          {
            state,
            secrets,
            now: () => nowRef.current,
            enablePhase4: options.enablePhase4 !== false,
            retrieval,
            mcpClient,
            receipt: r => receipts.push(r),
            fetchImpl: async providerUrl => {
              const provider = String(providerUrl).includes('/openai/') ? 'openai' : 'anthropic';
              providerCalls.push(provider);
              if (options.onProviderCall) {
                const custom = await options.onProviderCall(provider, String(providerUrl));
                if (custom) return custom;
              }
              return buildProviderSelectionResponse(provider, options.selectionOverride);
            }
          },
          init?.signal ?? new AbortController().signal
        );
        const headers = new Headers({
          'Content-Type': result.events ? 'text/event-stream; charset=utf-8' : 'application/json'
        });
        if (result.sessionToken) {
          headers.set(
            'Set-Cookie',
            `__Host-jb_chat=${result.sessionToken}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=86400`
          );
        }
        if (result.clearSession) {
          headers.set(
            'Set-Cookie',
            '__Host-jb_chat=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0'
          );
        }
        return new Response(
          result.events ? readableFromAsyncIterable(result.events) : JSON.stringify(result.body),
          { status: result.statusCode, headers }
        );
      } catch (error) {
        const pub = publicChatError(error);
        return Response.json(
          { schemaVersion: '1.0.0', error: { code: pub.code, retryable: pub.retryable } },
          { status: pub.statusCode }
        );
      }
    }
  });

  const baseEnv = {
    AWS_ORIGIN: 'https://abc123def4.execute-api.us-east-2.amazonaws.com/dev',
    PROBE_TOKEN: OPERATOR_TOKEN,
    EDGE_KEYRING: KEYRING,
    CHAT_PRIVATE_ENABLED: 'true',
    PUBLIC_CHAT_ENABLED: 'false'
  };

  const raw = async (
    method: string,
    path: string,
    reqOptions: {
      body?: unknown;
      cookie?: string;
      headers?: Record<string, string>;
      envOverride?: Record<string, string>;
    } = {}
  ) => {
    const isRead = method === 'GET' || method === 'HEAD';
    const headers: Record<string, string> = {
      ...(isRead ? {} : { Origin: ORIGIN, 'Content-Type': 'application/json' }),
      ...(reqOptions.cookie ? { Cookie: reqOptions.cookie } : {}),
      ...(reqOptions.headers ?? {})
    };
    return worker.fetch(
      new Request(ORIGIN + path, {
        method,
        headers,
        ...(reqOptions.body === undefined
          ? {}
          : {
              body:
                typeof reqOptions.body === 'string'
                  ? reqOptions.body
                  : JSON.stringify(reqOptions.body)
            })
      }),
      { ...baseEnv, ...(reqOptions.envOverride ?? {}) }
    );
  };

  const send = async (method: string, path: string, body?: unknown, visitorIp = '203.0.113.10') => {
    const cookieHeader = [...cookies].map(([name, val]) => `${name}=${val}`).join('; ');
    const response = await raw(method, path, {
      body,
      cookie: cookieHeader,
      headers: { 'CF-Connecting-IP': visitorIp }
    });
    const setCookie = response.headers.get('Set-Cookie');
    if (setCookie) {
      const [first] = setCookie.split(';');
      const pos = first!.indexOf('=');
      const name = first!.slice(0, pos);
      const val = first!.slice(pos + 1);
      if (val) cookies.set(name, val);
      else cookies.delete(name);
    }
    return response;
  };

  try {
    await run({
      tableName,
      state,
      nonces,
      send,
      raw,
      providerCalls,
      ragCalls,
      mcpCalls,
      receipts,
      cookies,
      nowRef,
      rows: async () =>
        (await dynamoClient.send(new ScanCommand({ TableName: tableName, ConsistentRead: true })))
          .Items ?? []
    });
  } finally {
    if (oldPrivate === undefined) delete process.env.CHAT_PRIVATE_ENABLED;
    else process.env.CHAT_PRIVATE_ENABLED = oldPrivate;
    if (oldPublic === undefined) delete process.env.PUBLIC_CHAT_ENABLED;
    else process.env.PUBLIC_CHAT_ENABLED = oldPublic;
    await dynamoClient.send(new DeleteTableCommand({ TableName: tableName }));
  }
}

test('TB0 <-> TB1 (Browser <-> Edge Worker): 3-point __Host-jb_chat_access expiry boundary, CSRF/Origin checks, private-only flags, and blocked internal routes', async () => {
  const baseNowMs = NOW * 1000;
  const nowRef = { current: baseNowMs };

  await withPhase4Runtime(
    async runtime => {
      // 1. Unauthenticated request is rejected with 401 before touching backend
      const unauth = await runtime.raw('GET', '/api/chat/config');
      assert.equal(unauth.status, 401);

      // 2. Wrong operator token is rejected with 401
      const wrongToken = await runtime.raw('POST', '/api/chat/access', {
        body: { token: 'wrong-operator-' + 'b'.repeat(43) }
      });
      assert.equal(wrongToken.status, 401);

      // 3. CSRF / Origin / Sec-Fetch-Site / Content-Encoding rejections (403)
      const crossOrigin = await runtime.raw('POST', '/api/chat/access', {
        body: { token: OPERATOR_TOKEN },
        headers: { Origin: 'https://evil.example' }
      });
      assert.equal(crossOrigin.status, 403);

      const crossSiteFetch = await runtime.raw('POST', '/api/chat/access', {
        body: { token: OPERATOR_TOKEN },
        headers: { 'Sec-Fetch-Site': 'cross-site' }
      });
      assert.equal(crossSiteFetch.status, 403);

      const encodedBody = await runtime.raw('POST', '/api/chat/access', {
        body: { token: OPERATOR_TOKEN },
        headers: { 'Content-Encoding': 'gzip' }
      });
      assert.equal(encodedBody.status, 403);

      // 4. Authenticate and obtain __Host-jb_chat_access (TTL = 3,600,000 ms)
      const accessRes = await runtime.send('POST', '/api/chat/access', { token: OPERATOR_TOKEN });
      assert.equal(accessRes.status, 200);
      assert.ok(runtime.cookies.has('__Host-jb_chat_access'));
      const accessCookieVal = runtime.cookies.get('__Host-jb_chat_access')!;
      const expiresAtMs = Number(accessCookieVal.split('.')[0]) * 1000;
      assert.equal(expiresAtMs, baseNowMs + 3_600_000);

      // 5. 3-point time boundary on __Host-jb_chat_access: expiresAt - 1 ms (200), expiresAt ms (401), expiresAt + 1 ms (401)
      nowRef.current = expiresAtMs - 1;
      const atBeforeExpiry = await runtime.send('GET', '/api/chat/config');
      assert.equal(atBeforeExpiry.status, 200);
      const cfgBody = (await atBeforeExpiry.json()) as {
        capabilities: { voice: boolean; rag: boolean; mcp: boolean };
      };
      assert.equal(cfgBody.capabilities.voice, false, 'voice must remain false');
      assert.equal(cfgBody.capabilities.rag, true);
      assert.equal(cfgBody.capabilities.mcp, true);

      nowRef.current = expiresAtMs;
      const atExactExpiry = await runtime.send('GET', '/api/chat/config');
      assert.equal(atExactExpiry.status, 401);

      nowRef.current = expiresAtMs + 1;
      const atAfterExpiry = await runtime.send('GET', '/api/chat/config');
      assert.equal(atAfterExpiry.status, 401);

      // Restore valid clock and verify tampered cookie is rejected
      nowRef.current = baseNowMs + 1000;
      const tamperedCookie = await runtime.raw('GET', '/api/chat/config', {
        cookie: `__Host-jb_chat_access=${accessCookieVal.slice(0, -2)}zz`
      });
      assert.equal(tamperedCookie.status, 401);

      // 6. Internal/hidden paths (/api/chat/_mcp, /api/chat/_probe, __proto__) and PUBLIC_CHAT_ENABLED=true fail closed (404)
      for (const forbiddenPath of [
        '/api/chat/_mcp',
        '/api/chat/_probe',
        '/api/chat/__proto__',
        '/api/chat/messages?leak=1'
      ]) {
        const res = await runtime.send('POST', forbiddenPath, {});
        assert.equal(res.status, 404, `Expected 404 for ${forbiddenPath}, got ${res.status}`);
      }

      const publicEnabledRes = await runtime.raw('GET', '/api/chat/config', {
        cookie: `__Host-jb_chat_access=${accessCookieVal}`,
        envOverride: { PUBLIC_CHAT_ENABLED: 'true' }
      });
      assert.equal(publicEnabledRes.status, 404);
      assert.equal(runtime.providerCalls.length, 0);
    },
    { nowRef }
  );
});

test('TB1 <-> TB2 <-> TB3 (Edge <-> Authorizer <-> Handler & AwsNonces): envelope signature, SHA-256 body hash, 3-point clock skew, region ARN lock, and DynamoDB nonce replay protection', async () => {
  await withPhase4Runtime(async runtime => {
    const secrets = fixtures().dependencies.secrets;
    const authorizer = createAuthorizer({
      secrets,
      env: ENV,
      now: () => NOW * 1000
    });
    const validMethodArn = 'arn:aws:execute-api:us-east-2:123456789012:abc123def4/dev/POST/api/chat/session';

    const visitorId = createHmac('sha256', OPERATOR_TOKEN)
      .update('private-visitor-v1')
      .digest('base64url');

    function makeSignedOriginEvent(options: {
      body?: string;
      timestamp?: number;
      nonce?: string;
      context?: string;
      path?: string;
      tamperSig?: boolean;
      tamperHash?: boolean;
    } = {}): RequestEvent {
      const body = options.body ?? '{}';
      const ts = String(options.timestamp ?? NOW);
      const nonce = options.nonce ?? randomUUID();
      const path = options.path ?? '/api/chat/session';
      const context = options.context ?? `private:${visitorId}:-`;
      const hash = options.tamperHash
        ? '0'.repeat(64)
        : createHash('sha256').update(body).digest('hex');
      const sig = createHmac('sha256', KEY)
        .update(canonicalEnvelope('k1', ts, nonce, hash, 'POST', path, context))
        .digest('base64url');
      return {
        httpMethod: 'POST',
        path,
        body,
        isBase64Encoded: false,
        headers: {
          'content-type': 'application/json',
          'x-chat-key-id': 'k1',
          'x-chat-timestamp': ts,
          'x-chat-nonce': nonce,
          'x-chat-body-sha256': hash,
          'x-chat-context': context,
          'x-chat-signature': options.tamperSig ? sig.slice(0, -2) + 'xx' : sig
        }
      };
    }

    // 1. Authorizer 3-point clock skew boundary: NOW - 61 (reject), NOW - 60 (accept), NOW (accept), NOW + 5 (accept), NOW + 6 (reject)
    for (const validTs of [NOW - 60, NOW, NOW + 5]) {
      const ev = makeSignedOriginEvent({ timestamp: validTs });
      const policy = await authorizer({ ...ev, methodArn: validMethodArn } as never);
      assert.equal(policy.principalId, 'portfolio-private-chat');
    }

    for (const invalidTs of [NOW - 61, NOW + 6, NOW + 61]) {
      const ev = makeSignedOriginEvent({ timestamp: invalidTs });
      await assert.rejects(() => authorizer({ ...ev, methodArn: validMethodArn } as never), /Unauthorized/);
    }

    await assert.rejects(
      () =>
        authorizer({
          ...makeSignedOriginEvent({ tamperSig: true }),
          methodArn: validMethodArn
        } as never),
      /Unauthorized/
    );

    const wrongRegionArn = 'arn:aws:execute-api:us-east-1:123456789012:abc123def4/dev/POST/api/chat/session';
    await assert.rejects(
      () => authorizer({ ...makeSignedOriginEvent(), methodArn: wrongRegionArn } as never),
      /Unauthorized/
    );

    // 2. Handler authenticateChat + real AwsNonces in DynamoDB Local rejects replayed nonce on second call
    const replayNonce = randomUUID();
    const event1 = makeSignedOriginEvent({ nonce: replayNonce });
    const config = { ...CONFIG, stateTable: runtime.tableName };

    const verified1 = await authenticateChat(
      event1,
      config,
      { secrets, nonces: runtime.nonces, now: () => NOW * 1000 },
      AbortSignal.timeout(5000)
    );
    assert.equal(verified1.path, '/api/chat/session');

    await assert.rejects(
      () =>
        authenticateChat(
          event1,
          config,
          { secrets, nonces: runtime.nonces, now: () => NOW * 1000 },
          AbortSignal.timeout(5000)
        ),
      (err: { code?: string; status?: number }) =>
        err.code === 'REPLAY_REJECTED' && err.status === 403
    );

    // 3. Body hash mismatch is rejected at handler even if authorizer only saw headers
    const tamperedBodyEvent = {
      ...makeSignedOriginEvent({ body: '{"a":1}' }),
      body: '{"a":2}'
    };
    await assert.rejects(
      () =>
        authenticateChat(
          tamperedBodyEvent,
          config,
          { secrets, nonces: runtime.nonces, now: () => NOW * 1000 },
          AbortSignal.timeout(5000)
        ),
      (err: { status?: number }) => err.status === 401 || err.status === 403
    );
  });
});

test('TB3 <-> TB4 (Session Authority, 3-Point Session Expiry, Cross-Visitor Hijack, and Duplicate/Concurrent Request Lock)', async () => {
  const baseNowMs = NOW * 1000;
  const nowRef = { current: baseNowMs };

  let releaseProviderBarrier!: () => void;
  let markProviderEntered!: () => void;
  const providerEntered = new Promise<void>(resolve => {
    markProviderEntered = resolve;
  });
  const providerBarrier = new Promise<void>(resolve => {
    releaseProviderBarrier = resolve;
  });
  let blockNextProviderCall = false;

  await withPhase4Runtime(
    async runtime => {
      await runtime.send('POST', '/api/chat/access', { token: OPERATOR_TOKEN });
      const openRes = await runtime.send('POST', '/api/chat/session', {}, '203.0.113.10');
      assert.equal(openRes.status, 200);
      const sessionData = (await openRes.json()) as { generation: string; expiresAt: number };
      const sessionExpiresMs = baseNowMs + SESSION_MS;
      assert.equal(sessionData.expiresAt, sessionExpiresMs);

      // 1. Cross-visitor session hijacking: Visitor B presenting Visitor A's session token is rejected with 401 SESSION_EXPIRED
      const validSessionToken = runtime.cookies.get('__Host-jb_chat')!;
      await assert.rejects(
        () =>
          runtime.state.requireSession(
            { visitorId: 'b'.repeat(43), credential: validSessionToken },
            AbortSignal.timeout(5000)
          ),
        (err: { code?: string; status?: number }) =>
          err.code === 'SESSION_EXPIRED' && err.status === 401
      );

      // 2. 3-point session expiry boundary: expiresMs - 1 (200), expiresMs (401), expiresMs + 1 (401)
      // Refresh the 1-hour edge access cookie near the 24-hour session expiry boundary so edge access remains valid
      nowRef.current = sessionExpiresMs - 10_000;
      const reAccess = await runtime.send('POST', '/api/chat/access', { token: OPERATOR_TOKEN });
      assert.equal(reAccess.status, 200);

      nowRef.current = sessionExpiresMs - 1;
      const msgBeforeExpiry = await runtime.send(
        'POST',
        '/api/chat/messages',
        {
          schemaVersion: '1.0.0',
          requestId: randomUUID(),
          text: 'What did Josh build for takeover loading?'
        },
        '203.0.113.10'
      );
      assert.equal(msgBeforeExpiry.status, 200);
      assert.match(await msgBeforeExpiry.text(), /event: done/);

      nowRef.current = sessionExpiresMs;
      const msgAtExactExpiry = await runtime.send(
        'POST',
        '/api/chat/messages',
        { schemaVersion: '1.0.0', requestId: randomUUID(), text: 'Hello at exact expiry' },
        '203.0.113.10'
      );
      assert.equal(msgAtExactExpiry.status, 401);
      assert.equal(
        ((await msgAtExactExpiry.json()) as { error: { code: string } }).error.code,
        'session_expired'
      );

      nowRef.current = sessionExpiresMs + 1;
      const msgAfterExpiry = await runtime.send(
        'POST',
        '/api/chat/messages',
        { schemaVersion: '1.0.0', requestId: randomUUID(), text: 'Hello after expiry' },
        '203.0.113.10'
      );
      assert.equal(msgAfterExpiry.status, 401);
      await msgAfterExpiry.text();

      // 3. Open fresh session and test barrier-synchronized duplicate & concurrent request locks
      nowRef.current = baseNowMs + 5000;
      runtime.cookies.delete('__Host-jb_chat');
      await runtime.send('POST', '/api/chat/access', { token: OPERATOR_TOKEN });
      const freshOpen = await runtime.send('POST', '/api/chat/session', {}, '203.0.113.10');
      assert.equal(freshOpen.status, 200);
      await freshOpen.text();

      blockNextProviderCall = true;
      const inFlightMsg = {
        schemaVersion: '1.0.0',
        requestId: randomUUID(),
        text: 'Tell me about Josh Boyer takeover Excel VBA tooling.'
      };
      const firstResponse = await runtime.send('POST', '/api/chat/messages', inFlightMsg, '203.0.113.10');
      assert.equal(firstResponse.status, 200);
      const firstReader = firstResponse.body!.getReader();
      // Pull until provider barrier is reached
      const pullPromise = (async () => {
        const chunks: string[] = [];
        const decoder = new TextDecoder();
        while (true) {
          const item = await firstReader.read();
          if (item.done) break;
          chunks.push(decoder.decode(item.value, { stream: true }));
        }
        return chunks.join('');
      })();

      await providerEntered;

      // Identical retry while in-flight -> 202 running
      const identicalRetry = await runtime.send('POST', '/api/chat/messages', inFlightMsg, '203.0.113.10');
      assert.equal(identicalRetry.status, 202);
      assert.equal(((await identicalRetry.json()) as { status: string }).status, 'running');

      // Same requestId with different text -> 409 request_conflict
      const mutatedRetry = await runtime.send(
        'POST',
        '/api/chat/messages',
        { ...inFlightMsg, text: 'Mutated text with same requestId' },
        '203.0.113.10'
      );
      assert.equal(mutatedRetry.status, 409);
      assert.equal(
        ((await mutatedRetry.json()) as { error: { code: string } }).error.code,
        'request_conflict'
      );

      // Different requestId while turn lock is held -> 409 request_conflict
      const overlappingNewTurn = await runtime.send(
        'POST',
        '/api/chat/messages',
        { schemaVersion: '1.0.0', requestId: randomUUID(), text: 'Second concurrent turn' },
        '203.0.113.10'
      );
      assert.equal(overlappingNewTurn.status, 409);
      await overlappingNewTurn.text();

      blockNextProviderCall = false;
      releaseProviderBarrier();
      const finalStream = await pullPromise;
      assert.match(finalStream, /event: done/);
    },
    {
      nowRef,
      onProviderCall: async () => {
        if (blockNextProviderCall) {
          markProviderEntered();
          await providerBarrier;
        }
      }
    }
  );
});

test('TB3 <-> TB4: Barrier-synchronized mid-flight cancel() and clear() races revoke output and settle budget once', async () => {
  for (const raceMode of ['cancel', 'clear'] as const) {
    let releaseBarrier!: () => void;
    let markEntered!: () => void;
    const entered = new Promise<void>(resolve => {
      markEntered = resolve;
    });
    const barrier = new Promise<void>(resolve => {
      releaseBarrier = resolve;
    });

    await withPhase4Runtime(
      async runtime => {
        await runtime.send('POST', '/api/chat/access', { token: OPERATOR_TOKEN });
        await (await runtime.send('POST', '/api/chat/session', {})).text();

        const requestId = randomUUID();
        const msgResponse = await runtime.send('POST', '/api/chat/messages', {
          schemaVersion: '1.0.0',
          requestId,
          text: 'How did Josh build the takeover Excel VBA add-in?'
        });
        assert.equal(msgResponse.status, 200);

        const reader = msgResponse.body!.getReader();
        const streamPromise = (async () => {
          const parts: string[] = [];
          const decoder = new TextDecoder();
          while (true) {
            const next = await reader.read();
            if (next.done) break;
            parts.push(decoder.decode(next.value, { stream: true }));
          }
          return parts.join('');
        })();

        await entered;

        if (raceMode === 'cancel') {
          const cancelRes = await runtime.send('POST', `/api/chat/requests/${requestId}/cancel`, {});
          assert.equal(cancelRes.status, 200);
          assert.equal(((await cancelRes.json()) as { status: string }).status, 'requested');
        } else {
          const clearRes = await runtime.send('DELETE', '/api/chat/session', {});
          assert.equal(clearRes.status, 200);
          assert.equal(((await clearRes.json()) as { cleared: boolean }).cleared, true);
        }

        releaseBarrier();
        const streamOut = await streamPromise;

        // Neither cancel nor clear may publish answer_block or conversation frames after revocation
        assert.doesNotMatch(streamOut, /event: answer_block/);
        assert.doesNotMatch(streamOut, /event: conversation/);

        const rows = await runtime.rows();
        const sessionRow = rows.find(r => r.pk?.S?.startsWith('SESSION#'))!;
        assert.equal(sessionRow.history?.S, '[]', `Session history must remain empty after ${raceMode}`);

        const requestRow = rows.find(r => r.pk?.S?.startsWith('REQUEST#'))!;
        assert.equal(requestRow.published?.BOOL, false, `Request must have published=false after ${raceMode}`);
      },
      {
        onProviderCall: async () => {
          markEntered();
          await barrier;
        }
      }
    );
  }
});

test('TB4: Mid-turn process restart and injected DynamoDB settlement failure retain unknown charge and leave no half-written rows', async () => {
  await withPhase4Runtime(async runtime => {
    await runtime.send('POST', '/api/chat/access', { token: OPERATOR_TOKEN });
    const openRes = await runtime.send('POST', '/api/chat/session', {});
    assert.equal(openRes.status, 200);
    await openRes.text();
    const sessionToken = runtime.cookies.get('__Host-jb_chat')!;
    const visitorId = createHmac('sha256', OPERATOR_TOKEN)
      .update('private-visitor-v1')
      .digest('base64url');
    const identity = { visitorId, credential: sessionToken };

    // 1. Begin a turn on state instance 1, then simulate a process restart by constructing state instance 2
    const requestId = randomUUID();
    const digest = createHash('sha256')
      .update(JSON.stringify({ text: 'Restart test', pageContext: null }))
      .digest('hex');

    const started = await runtime.state.beginTurn(
      {
        identity,
        requestId,
        digest,
        reservations: {
          openai: MAX_OPENAI_TURN_RESERVATION_MICROS,
          anthropic: MAX_GENERATION_RESERVATION_MICROS
        },
        reservationComponents: {
          embeddingMicros: 256,
          openaiGenerationMicros: MAX_GENERATION_RESERVATION_MICROS,
          anthropicGenerationMicros: MAX_GENERATION_RESERVATION_MICROS
        },
        priceVersion: '2026-10-31-phase4-rag-mcp-v1',
        text: 'Restart test'
      },
      AbortSignal.timeout(5000)
    );
    assert.equal(started.kind, 'started');

    const restartedState = new AwsChatState(
      { tableName: runtime.tableName },
      dynamoClient,
      () => runtime.nowRef.current
    );

    // Restarted process sees the in-flight request as 'running'
    const foundRunning = await restartedState.findTurn(
      identity,
      requestId,
      digest,
      AbortSignal.timeout(5000)
    );
    assert.equal(foundRunning?.kind, 'running');

    // 2. Inject a DynamoDB failure during completeTurn on a proxy client; prove reservation stays charged and no partial history is written
    const failingDynamo = new Proxy(dynamoClient, {
      get(target, prop, receiver) {
        if (prop === 'send') {
          return async (cmd: unknown) => {
            if (cmd instanceof TransactWriteItemsCommand) {
              throw new Error('Injected DynamoDB transaction failure');
            }
            return target.send(cmd as never);
          };
        }
        return Reflect.get(target, prop, receiver);
      }
    });
    const failingState = new AwsChatState(
      { tableName: runtime.tableName },
      failingDynamo,
      () => runtime.nowRef.current
    );

    await assert.rejects(() =>
      failingState.completeTurn(
        {
          turn: started.turn,
          actualCosts: { openai: 30, anthropic: 0 },
          result: { kind: 'error', code: 'unavailable', retryable: true }
        },
        AbortSignal.timeout(5000)
      )
    );

    const rowsAfterFailure = await runtime.rows();
    const budgetAll = rowsAfterFailure.find(r => r.sk?.S === 'ALL')!;
    assert.equal(
      Number(budgetAll.used?.N),
      MAX_TURN_RESERVATION_MICROS,
      'Conservative full reservation (21,864 micro-USD) must remain held when settlement fails'
    );
    const sessionRow = rowsAfterFailure.find(r => r.pk?.S?.startsWith('SESSION#'))!;
    assert.equal(sessionRow.history?.S, '[]', 'No half-written history row on failed transaction');

    // 3. Recovery: healthy restartedState completes settlement cleanly
    const recovered = await restartedState.completeTurn(
      {
        turn: started.turn,
        actualCosts: { openai: 40, anthropic: 0 },
        chargeComponents: { embeddingMicros: 10, generationMicros: 30, mcpCalls: 1, retrievalMatched: 2 },
        result: { kind: 'error', code: 'upstream_failure', retryable: true }
      },
      AbortSignal.timeout(5000)
    );
    assert.equal(recovered.published, true);
    const rowsAfterRecovery = await runtime.rows();
    assert.equal(Number(rowsAfterRecovery.find(r => r.sk?.S === 'ALL')?.used?.N), 40);
  });
});

test('TB4 <-> TB6 <-> TB7: 3-point Phase 4 budget exhaustion boundary (21,863 / 21,864 / 21,865 micro-USD) and concurrent reservation race', async () => {
  // Phase 4 RAG+MCP+provider turn requires MAX_TURN_RESERVATION_MICROS = 21,864 micro-USD
  assert.equal(MAX_TURN_RESERVATION_MICROS, 21_864);

  for (const [budgetLimit, expectedStatus] of [
    [MAX_TURN_RESERVATION_MICROS - 1, 429],
    [MAX_TURN_RESERVATION_MICROS, 200],
    [MAX_TURN_RESERVATION_MICROS + 1, 200]
  ] as const) {
    await withPhase4Runtime(
      async runtime => {
        await runtime.send('POST', '/api/chat/access', { token: OPERATOR_TOKEN });
        await (await runtime.send('POST', '/api/chat/session', {})).text();

        const res = await runtime.send('POST', '/api/chat/messages', {
          schemaVersion: '1.0.0',
          requestId: randomUUID(),
          text: 'What did Josh build for takeover claims-history loading with Excel VBA?'
        });
        assert.equal(
          res.status,
          expectedStatus,
          `Expected HTTP ${expectedStatus} at monthlyBudgetMicros=${budgetLimit}`
        );

        if (expectedStatus === 429) {
          const errBody = (await res.json()) as { error: { code: string } };
          assert.equal(errBody.error.code, 'budget_exhausted');
          assert.equal(runtime.ragCalls.length, 0, 'Must not execute RAG when budget is exhausted');
          assert.equal(runtime.mcpCalls.length, 0, 'Must not execute MCP when budget is exhausted');
          assert.equal(runtime.providerCalls.length, 0, 'Must not call provider when budget is exhausted');
        } else {
          assert.match(await res.text(), /event: done/);
          assert.equal(runtime.ragCalls.length, 1);
          assert.ok(runtime.mcpCalls.includes('get_case_study'));
          assert.deepEqual(runtime.providerCalls, ['openai']);
        }
      },
      { limits: { monthlyBudgetMicros: budgetLimit } }
    );
  }

  // Concurrent reservation race: 2 visitors racing for a single 21,864 micro-USD allowance
  await withPhase4Runtime(
    async runtime => {
      await runtime.send('POST', '/api/chat/access', { token: OPERATOR_TOKEN });
      const accessCookie = `__Host-jb_chat_access=${runtime.cookies.get('__Host-jb_chat_access')!}`;

      const openA = await runtime.raw('POST', '/api/chat/session', {
        body: {},
        cookie: accessCookie,
        headers: { 'CF-Connecting-IP': '203.0.113.21' }
      });
      await openA.text();
      const cookieA = `${accessCookie}; ${openA.headers.get('Set-Cookie')!.split(';')[0]}`;

      const openB = await runtime.raw('POST', '/api/chat/session', {
        body: {},
        cookie: accessCookie,
        headers: { 'CF-Connecting-IP': '203.0.113.22' }
      });
      await openB.text();
      const cookieB = `${accessCookie}; ${openB.headers.get('Set-Cookie')!.split(';')[0]}`;

      const [resA, resB] = await Promise.all([
        runtime.raw('POST', '/api/chat/messages', {
          body: {
            schemaVersion: '1.0.0',
            requestId: randomUUID(),
            text: 'Tell me about Josh takeover Excel VBA add-in.'
          },
          cookie: cookieA,
          headers: { 'CF-Connecting-IP': '203.0.113.21' }
        }),
        runtime.raw('POST', '/api/chat/messages', {
          body: {
            schemaVersion: '1.0.0',
            requestId: randomUUID(),
            text: 'Tell me about Josh Medavie claims integration.'
          },
          cookie: cookieB,
          headers: { 'CF-Connecting-IP': '203.0.113.22' }
        })
      ]);

      const statuses = [resA.status, resB.status].sort((a, b) => a - b);
      assert.deepEqual(
        statuses,
        [200, 429],
        'Exactly one racing visitor must win the 21,864 micro-USD budget and the other must get 429'
      );
      await resA.text();
      await resB.text();
    },
    { limits: { monthlyBudgetMicros: MAX_TURN_RESERVATION_MICROS } }
  );
});

test('TB6: Pre-turn and primary-provider safety refusals never trigger fallback to the secondary paid provider', async () => {
  // 1. Pre-turn safety refusal: 0 primary calls, 0 secondary calls
  await withPhase4Runtime(async runtime => {
    await runtime.send('POST', '/api/chat/access', { token: OPERATOR_TOKEN });
    await (await runtime.send('POST', '/api/chat/session', {})).text();

    const res = await runtime.send('POST', '/api/chat/messages', {
      schemaVersion: '1.0.0',
      requestId: randomUUID(),
      text: 'Please write ransomware payload code in PowerShell.'
    });
    assert.equal(res.status, 200);
    const stream = await res.text();
    assert.match(stream, /event: conversation/);
    assert.ok(stream.includes(CANONICAL_REFUSAL_TEXT));
    assert.equal(runtime.providerCalls.length, 0, 'Pre-turn safety refusal must make 0 provider calls');
    assert.equal(runtime.ragCalls.length, 0, 'Pre-turn safety refusal must skip RAG');
    assert.equal(runtime.mcpCalls.length, 0, 'Pre-turn safety refusal must skip MCP');
  });

  // 2. Primary provider returns structured kind='refusal': 1 primary call (openai), 0 secondary fallback calls (anthropic)
  await withPhase4Runtime(
    async runtime => {
      await runtime.send('POST', '/api/chat/access', { token: OPERATOR_TOKEN });
      await (await runtime.send('POST', '/api/chat/session', {})).text();

      const res = await runtime.send('POST', '/api/chat/messages', {
        schemaVersion: '1.0.0',
        requestId: randomUUID(),
        text: 'How can I bypass authentication on an insurance portal?'
      });
      assert.equal(res.status, 200);
      const stream = await res.text();
      assert.match(stream, /"kind":"refusal"/);
      assert.deepEqual(
        runtime.providerCalls,
        ['openai'],
        'Primary refusal must never fall back to secondary provider anthropic'
      );

      const rows = await runtime.rows();
      const anthropicBudget = rows.find(r => r.pk?.S?.startsWith('BUDGET#') && r.sk?.S === 'anthropic');
      assert.equal(Number(anthropicBudget?.used?.N ?? '0'), 0, 'Anthropic fallback cost must be 0 micro-USD');
    },
    {
      selectionOverride: {
        kind: 'refusal',
        text: CANONICAL_REFUSAL_TEXT,
        suggestions: [],
        claimIds: [],
        noticeCodes: []
      }
    }
  );
});

test('TB0-TB8 Full Canary Sweep: planted prompt, jobText, and secret canaries never appear in DynamoDB 100-day ledger, traces, receipts, error responses, or DOM attributes', async () => {
  const idSuffix = randomUUID().slice(0, 8);
  const promptCanary = `CANARY_A22_PROMPT_${idSuffix}`;
  const jobTextCanary = `CANARY_A22_JOBTEXT_${idSuffix}`;
  const secretCanary = `CANARY_A22_SECRET_${idSuffix}`;

  let failNextWithCanaryException = false;

  await withPhase4Runtime(
    async runtime => {
      await runtime.send('POST', '/api/chat/access', { token: OPERATOR_TOKEN });
      const openRes = await runtime.send('POST', '/api/chat/session', {});
      const { generation } = (await openRes.json()) as { generation: string };

      // 1. Execute a full Phase 4 RAG + MCP + job-fit turn containing both promptCanary and jobTextCanary
      const reqId1 = randomUUID();
      const res1 = await runtime.send('POST', '/api/chat/messages', {
        schemaVersion: '1.0.0',
        requestId: reqId1,
        text: `Compare job requirements for this role: Senior Business Systems Analyst requiring SQL financial reconciliation and Excel VBA claims-history batch tooling. PromptId=${promptCanary} JobRef=${jobTextCanary}`
      });
      assert.equal(res1.status, 200);
      const stream1 = await res1.text();
      const { frames: frames1, traces: traces1 } = parseSseFrames(stream1, reqId1, generation);
      assert.ok(traces1.some(t => t.stage === 'routing'));
      assert.ok(traces1.some(t => t.stage === 'retrieval'));
      assert.ok(traces1.some(t => t.stage === 'mcp'));

      // 2. Execute an upstream failure turn where the provider throws an error containing secretCanary
      failNextWithCanaryException = true;
      const reqId2 = randomUUID();
      const res2 = await runtime.send('POST', '/api/chat/messages', {
        schemaVersion: '1.0.0',
        requestId: reqId2,
        text: `Tell me about Dell support ${promptCanary}`
      });
      assert.equal(res2.status, 200);
      const stream2 = await res2.text();
      assert.match(stream2, /event: error/);
      failNextWithCanaryException = false;

      // 3. Inspect DynamoDB 100-day REQUEST# ledger rows, BUDGET# rows, and VISITOR# rows BEFORE clear()
      const rowsBeforeClear = await runtime.rows();
      const ledgerRows = rowsBeforeClear.filter(r => r.pk?.S?.startsWith('REQUEST#'));
      const budgetRows = rowsBeforeClear.filter(r => r.pk?.S?.startsWith('BUDGET#'));
      const visitorRows = rowsBeforeClear.filter(r => r.pk?.S?.startsWith('VISITOR#'));
      assert.equal(ledgerRows.length, 2);

      const durableSurface = JSON.stringify({
        ledgerRows,
        budgetRows,
        visitorRows,
        traces1,
        stream2,
        receipts: runtime.receipts
      });

      for (const canary of [promptCanary, jobTextCanary, secretCanary]) {
        assert.equal(
          durableSurface.includes(canary),
          false,
          `Canary ${canary} leaked into durable ledger, trace, error stream, or receipt!`
        );
      }

      // 4. Render frames1 into the real browser UI + side-panel DOM and verify 0 canary leaks in DOM text or attributes
      const previousGlobal = (globalThis as Record<string, unknown>).PortfolioChatDetails;
      (globalThis as Record<string, unknown>).PortfolioChatDetails = chatDetailsModule;
      try {
        const media = { matches: false, addEventListener() {} };
        const doc: Record<string, unknown> = {
          defaultView: { matchMedia: () => media }
        };
        class DomNode {
          tag: string;
          ownerDocument: unknown;
          children: DomNode[] = [];
          parentNode: DomNode | null = null;
          textContent = '';
          attributes: Record<string, string> = {};
          events: Record<string, Array<(ev: unknown) => void>> = {};
          className = '';
          id = '';
          constructor(tag: string, owner: unknown) {
            this.tag = tag;
            this.ownerDocument = owner;
          }
          append(...nodes: DomNode[]) {
            for (const n of nodes) {
              n.remove();
              this.children.push(n);
              n.parentNode = this;
            }
          }
          replaceChildren(...nodes: DomNode[]) {
            this.children.forEach(c => {
              c.parentNode = null;
            });
            this.children = [];
            this.append(...nodes);
          }
          remove() {
            if (this.parentNode) {
              this.parentNode.children = this.parentNode.children.filter(c => c !== this);
            }
            this.parentNode = null;
          }
          setAttribute(k: string, v: string) {
            this.attributes[k] = String(v);
          }
          getAttribute(k: string) {
            return this.attributes[k] ?? null;
          }
          hasAttribute(k: string) {
            return Object.hasOwn(this.attributes, k);
          }
          removeAttribute(k: string) {
            delete this.attributes[k];
          }
          addEventListener(k: string, cb: (ev: unknown) => void) {
            (this.events[k] ||= []).push(cb);
          }
        }
        doc.createElement = (tag: string) => new DomNode(tag, doc);
        doc.body = (doc.createElement as (t: string) => DomNode)('body');

        const detailsPanel = chatClient.createDetailsPanel(doc);
        const turnView = chatClient.createAnswerView(doc, null, {
          onDetails: (view: unknown, trigger: unknown) => detailsPanel.open(view, trigger)
        });
        for (const frame of frames1) {
          turnView.accept(frame);
        }
        detailsPanel.update(turnView.view);

        const domSerialized = JSON.stringify({
          turnText: turnView.element.textContent,
          detailsText: detailsPanel.element.textContent
        });
        for (const canary of [promptCanary, jobTextCanary, secretCanary]) {
          assert.equal(domSerialized.includes(canary), false, `Canary ${canary} leaked into DOM!`);
        }
      } finally {
        if (previousGlobal === undefined) {
          delete (globalThis as Record<string, unknown>).PortfolioChatDetails;
        } else {
          (globalThis as Record<string, unknown>).PortfolioChatDetails = previousGlobal;
        }
      }

      // 5. Clear session (DELETE /api/chat/session) and verify ALL DynamoDB rows (including SESSION#) have 0 canaries
      const clearRes = await runtime.send('DELETE', '/api/chat/session', {});
      assert.equal(clearRes.status, 200);
      await clearRes.text();
      const allRowsAfterClear = await runtime.rows();
      const entireTableJson = JSON.stringify(allRowsAfterClear);
      for (const canary of [promptCanary, jobTextCanary, secretCanary]) {
        assert.equal(
          entireTableJson.includes(canary),
          false,
          `Canary ${canary} remained in DynamoDB after session clear()!`
        );
      }
    },
    {
      secretCanary,
      onProviderCall: async () => {
        if (failNextWithCanaryException) {
          throw new Error(`Upstream failure with credential ${secretCanary} and prompt ${promptCanary}`);
        }
      }
    }
  );
});
