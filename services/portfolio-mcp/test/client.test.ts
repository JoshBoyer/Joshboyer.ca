import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import {
  createMcpHttpHandler,
  createPortfolioMcpClient,
  MAX_MCP_REQUEST_BYTES,
  MAX_MCP_RESPONSE_BYTES,
  McpClientError,
  MCP_PROTOCOL_VERSION,
  MCP_SERVER_NAME,
  TOOL_NAMES,
  validateMcpEndpoint,
  verifySigV4Request,
  type AwsCredentials,
  type CompareJobRequirementsOutput,
  type GetCaseStudyOutput,
  type McpCallReceipt,
  type McpTraceEvent,
  type SearchPublicEvidenceOutput,
  type ToolRegistry
} from '../src/index.js';

const contracts = require('../../../chat/contracts/index.cjs') as {
  assertValid(name: string, value: unknown): unknown;
  createEventValidator(options: { requestId: string; generation: string; corpus: unknown }): {
    accept(event: unknown): boolean;
  };
};
const corpus = require('../../../chat/knowledge/corpus.json') as {
  corpusVersion: string;
  claims: Array<{
    id: string;
    chunkId: string;
    projectId: string;
    title: string;
    period: string;
    text: string;
    qualificationNotes: string[];
    sourceIds: string[];
  }>;
  sources: Array<{ id: string; url: string; revision: string }>;
};

const TEST_CREDENTIALS: AwsCredentials = Object.freeze({
  accessKeyId: 'ASIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  sessionToken: 'AQoDYXdzEJr1234567890SessionTokenExample'
});

const SAMPLE_CLAIM = corpus.claims[0]!;
const RAW_SOURCE = corpus.sources[0]!;
const SAMPLE_SOURCE = {
  id: RAW_SOURCE.id,
  url: RAW_SOURCE.url,
  revision: RAW_SOURCE.revision
};

function createTestTools(): ToolRegistry {
  const searchOut: SearchPublicEvidenceOutput = {
    schemaVersion: '1.0.0',
    corpusVersion: corpus.corpusVersion,
    retrievalMode: 'deterministic',
    matches: [
      {
        chunkId: SAMPLE_CLAIM.chunkId,
        claimId: SAMPLE_CLAIM.id,
        projectId: SAMPLE_CLAIM.projectId,
        title: SAMPLE_CLAIM.title,
        period: SAMPLE_CLAIM.period,
        score: 9.5,
        text: SAMPLE_CLAIM.text,
        qualificationNotes: [...SAMPLE_CLAIM.qualificationNotes],
        sourceIds: [...SAMPLE_CLAIM.sourceIds],
        url: SAMPLE_SOURCE.url
      }
    ]
  };
  const caseOut: GetCaseStudyOutput = {
    schemaVersion: '1.0.0',
    corpusVersion: corpus.corpusVersion,
    projectId: SAMPLE_CLAIM.projectId,
    chunkId: SAMPLE_CLAIM.chunkId,
    claimId: SAMPLE_CLAIM.id,
    title: SAMPLE_CLAIM.title,
    period: SAMPLE_CLAIM.period,
    text: SAMPLE_CLAIM.text,
    decision: 'Established canonical integration contract.',
    process: ['Reviewed mappings', 'Verified synchronization rules'],
    technicalGuidance: 'Preserved explicit source boundaries.',
    outcome: 'Supported live provider integration.',
    tags: ['integrations', 'mapping'],
    qualificationNotes: [...SAMPLE_CLAIM.qualificationNotes],
    sources: [SAMPLE_SOURCE]
  };
  const compareOut: CompareJobRequirementsOutput = {
    schemaVersion: '1.0.0',
    corpusVersion: corpus.corpusVersion,
    matches: [
      {
        requirement: 'Integration analysis and XML/REST mapping',
        status: 'supported',
        claimIds: [SAMPLE_CLAIM.id],
        projectIds: [SAMPLE_CLAIM.projectId],
        qualificationNotes: [...SAMPLE_CLAIM.qualificationNotes]
      }
    ],
    gaps: ['Formal Architect title is not claimed'],
    qualificationSummary: ['Historical responsibilities do not create a formal Architect job title.'],
    noticeCodes: ['limited_evidence']
  };
  return {
    search_public_evidence: async () => structuredClone(searchOut),
    get_case_study: async () => structuredClone(caseOut),
    compare_job_requirements: async () => structuredClone(compareOut)
  };
}

async function withLoopbackServer(
  listener: http.RequestListener,
  run: (endpoint: string) => Promise<void>
): Promise<void> {
  const server = http.createServer(listener);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;
  const endpoint = `http://127.0.0.1:${address.port}/api/chat/_mcp`;
  try {
    await run(endpoint);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

test('PortfolioMcpClient signs requests with AWS SigV4 (us-east-2/execute-api) over real loopback HTTP and emits valid A01 trace events', async () => {
  const capturedRequests: Array<{
    headers: http.IncomingHttpHeaders;
    bodyBytes: Uint8Array;
  }> = [];
  const mcpHandler = createMcpHttpHandler({
    tools: createTestTools(),
    requireIamContext: false,
    requireSigV4: true,
    sigV4Credentials: TEST_CREDENTIALS
  });

  await withLoopbackServer(
    (req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        capturedRequests.push({
          headers: { ...req.headers },
          bodyBytes: Buffer.concat(chunks)
        });
      });
      mcpHandler(req, res);
    },
    async endpoint => {
      let clock = 1_730_380_000_000;
      const traceEvents: McpTraceEvent[] = [];
      const callReceipts: McpCallReceipt[] = [];

      const client = createPortfolioMcpClient({
        endpoint,
        allowLoopbackForTests: true,
        credentials: async () => TEST_CREDENTIALS,
        now: () => {
          clock += 12;
          return clock;
        },
        onTrace: ev => traceEvents.push(ev),
        onReceipt: rec => callReceipts.push(rec)
      });

      const { initializeResult, tools } = await client.connectAndVerify();
      assert.equal(initializeResult.protocolVersion, MCP_PROTOCOL_VERSION);
      assert.equal(initializeResult.serverInfo.name, MCP_SERVER_NAME);
      assert.deepEqual(tools.map(t => t.name), [...TOOL_NAMES]);

      await client.notifyInitialized();

      const searchCall = await client.callTool(
        'search_public_evidence',
        { query: 'Medavie provider integration', limit: 2 },
        { toolCallId: 'tool-search-1' }
      );
      assert.equal(searchCall.output.retrievalMode, 'deterministic');
      assert.equal(searchCall.receipt.toolOutcome, 'completed');
      assert.equal(searchCall.receipt.toolCallId, 'tool-search-1');

      const caseCall = await client.callTool(
        'get_case_study',
        { projectId: 'nexus' },
        { toolCallId: 'tool-case-2' }
      );
      assert.equal(caseCall.output.projectId, SAMPLE_CLAIM.projectId);

      const compareCall = await client.callTool(
        'compare_job_requirements',
        { jobText: 'Requires integration mapping and SQL reconciliation.' },
        { toolCallId: 'tool-compare-3' }
      );
      assert.equal(compareCall.output.matches.length, 1);

      // Verify all 6 HTTP requests (init, list, notifyInitialized, 3 tool calls) were signed with AWS4-HMAC-SHA256 for us-east-2/execute-api
      assert.equal(capturedRequests.length, 6);
      for (const req of capturedRequests) {
        const auth = String(req.headers.authorization ?? '');
        assert.match(
          auth,
          /^AWS4-HMAC-SHA256 Credential=ASIAIOSFODNN7EXAMPLE\/\d{8}\/us-east-2\/execute-api\/aws4_request, SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date;x-amz-security-token, Signature=[0-9a-f]{64}$/
        );
        assert.equal(req.headers['x-amz-security-token'], TEST_CREDENTIALS.sessionToken);
        const headerMap = Object.fromEntries(
          Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
        );
        const verification = verifySigV4Request(
          {
            method: 'POST',
            path: '/api/chat/_mcp',
            headers: headerMap,
            bodyBytes: req.bodyBytes
          },
          TEST_CREDENTIALS
        );
        assert.equal(verification.valid, true);
        assert.equal(verification.region, 'us-east-2');
        assert.equal(verification.service, 'execute-api');

        // Verify three-point SigV4 clock skew boundary around signing timestamp (maxClockSkewMs = 300_000)
        const amzDate = headerMap['x-amz-date']!;
        const iso = `${amzDate.slice(0, 4)}-${amzDate.slice(4, 6)}-${amzDate.slice(6, 8)}T${amzDate.slice(9, 11)}:${amzDate.slice(11, 13)}:${amzDate.slice(13, 15)}Z`;
        const signedMs = Date.parse(iso);
        for (const [offsetMs, expectedValid] of [
          [299_999, true],
          [300_000, true],
          [300_001, false]
        ] as const) {
          const skewCheck = verifySigV4Request(
            {
              method: 'POST',
              path: '/api/chat/_mcp',
              headers: headerMap,
              bodyBytes: req.bodyBytes
            },
            TEST_CREDENTIALS,
            { now: () => signedMs + offsetMs, maxClockSkewMs: 300_000 }
          );
          assert.equal(skewCheck.valid, expectedValid);
        }
      }

      // Verify every emitted McpTraceEvent satisfies A01's traceData schema and stream validator
      assert.equal(traceEvents.length, 10); // 5 started + 5 completed
      const requestId = '11111111-2222-4333-8444-555555555555';
      const generation = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
      const streamValidator = contracts.createEventValidator({ requestId, generation, corpus });
      let seq = 1;
      let elapsed = 5;
      for (const point of traceEvents) {
        elapsed += point.durationMs ?? 1;
        const traceData = { ...point, elapsedMs: elapsed };
        contracts.assertValid('traceData', traceData);
        streamValidator.accept({
          schemaVersion: '1.0.0',
          requestId,
          generation,
          seq: seq++,
          event: 'trace',
          data: traceData
        });
      }
      assert.equal(callReceipts.length, 5);
    }
  );
});

test('Server SigV4 verification rejects unsigned, wrong-secret, or payload-tampered requests and enforces 16383/16384/16385 request bytes over loopback HTTP', async () => {
  const mcpHandler = createMcpHttpHandler({
    tools: createTestTools(),
    requireIamContext: false,
    requireSigV4: false
  });
  const sigV4Handler = createMcpHttpHandler({
    tools: createTestTools(),
    requireIamContext: false,
    requireSigV4: true,
    sigV4Credentials: TEST_CREDENTIALS
  });

  await withLoopbackServer(sigV4Handler, async endpoint => {
    // 1. Unsigned direct fetch -> 403
    const unsignedRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
    });
    assert.equal(unsignedRes.status, 403);

    // 2. Signed with wrong secret key -> 403, client throws McpClientError('MCP_UNAUTHORIZED')
    const wrongKeyClient = createPortfolioMcpClient({
      endpoint,
      allowLoopbackForTests: true,
      credentials: {
        accessKeyId: TEST_CREDENTIALS.accessKeyId,
        secretAccessKey: 'WRONG_SECRET_KEY_THAT_MUST_FAIL_VERIFICATION'
      }
    });
    await assert.rejects(
      () => wrongKeyClient.listTools(),
      (err: unknown) => err instanceof McpClientError && err.code === 'MCP_UNAUTHORIZED'
    );
  });

  // 3. Real HTTP loopback 16383 / 16384 / 16385 byte request boundary
  await withLoopbackServer(mcpHandler, async endpoint => {
    for (const [byteCount, expectedStatus] of [
      [MAX_MCP_REQUEST_BYTES - 1, 200],
      [MAX_MCP_REQUEST_BYTES, 200],
      [MAX_MCP_REQUEST_BYTES + 1, 413]
    ] as const) {
      const prefix = '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{"_pad":"';
      const suffix = '"}}';
      const body = prefix + 'x'.repeat(byteCount - Buffer.byteLength(prefix + suffix, 'utf8')) + suffix;
      assert.equal(Buffer.byteLength(body, 'utf8'), byteCount);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body
      });
      assert.equal(res.status, expectedStatus);
    }
  });
});

test('validateMcpEndpoint and PortfolioMcpClient reject non-us-east-2, non-HTTPS, userinfo, query strings, and unauthorized hosts', () => {
  const prodUrl = validateMcpEndpoint('https://abc1234567.execute-api.us-east-2.amazonaws.com/dev/api/chat/_mcp');
  assert.equal(prodUrl.hostname, 'abc1234567.execute-api.us-east-2.amazonaws.com');

  assert.throws(
    () => validateMcpEndpoint('http://127.0.0.1:4321/api/chat/_mcp', false),
    (err: unknown) => err instanceof McpClientError && err.code === 'INVALID_MCP_ENDPOINT'
  );
  assert.equal(validateMcpEndpoint('http://127.0.0.1:4321/api/chat/_mcp', true).hostname, '127.0.0.1');

  const hostileEndpoints = [
    'https://abc1234567.execute-api.us-east-1.amazonaws.com/dev/api/chat/_mcp',
    'http://abc1234567.execute-api.us-east-2.amazonaws.com/dev/api/chat/_mcp',
    'https://user:pass@abc1234567.execute-api.us-east-2.amazonaws.com/dev/api/chat/_mcp',
    'https://abc1234567.execute-api.us-east-2.amazonaws.com/dev/api/chat/_mcp?foo=bar',
    'https://abc1234567.execute-api.us-east-2.amazonaws.com/dev/api/chat/_mcp#hash',
    'https://abc1234567.execute-api.us-east-2.amazonaws.com/dev/api/chat/messages',
    'https://evil.example/dev/api/chat/_mcp',
    'file:///etc/passwd'
  ];
  for (const bad of hostileEndpoints) {
    assert.throws(
      () => validateMcpEndpoint(bad, true),
      (err: unknown) => err instanceof McpClientError && err.code === 'INVALID_MCP_ENDPOINT',
      `Expected ${bad} to be rejected`
    );
  }
});

test('PortfolioMcpClient rejects unexpected tool discovery, invalid tool outputs, and 32767/32768/32769 response byte boundaries', async () => {
  // 1. Unexpected tool in tools/list (e.g. aws_admin) rejected by client
  await withLoopbackServer(
    (req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => {
        const reqBody = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { id: string | number };
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: reqBody.id,
            result: {
              tools: [
                {
                  name: 'aws_admin',
                  description: 'Rogue admin tool',
                  inputSchema: { type: 'object' },
                  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
                }
              ]
            }
          })
        );
      });
    },
    async endpoint => {
      const client = createPortfolioMcpClient({
        endpoint,
        allowLoopbackForTests: true,
        credentials: TEST_CREDENTIALS
      });
      await assert.rejects(
        () => client.listTools(),
        (err: unknown) => err instanceof McpClientError && err.code === 'UNEXPECTED_TOOL_DISCOVERY'
      );
    }
  );

  // 2. Response byte boundary at 32767, 32768, and 32769 bytes
  let responseTargetBytes: number = MAX_MCP_RESPONSE_BYTES;
  await withLoopbackServer(
    (_req, res) => {
      const baseResult: CompareJobRequirementsOutput = {
        schemaVersion: '1.0.0',
        corpusVersion: corpus.corpusVersion,
        matches: [],
        gaps: [],
        qualificationSummary: ['Summary A'],
        noticeCodes: ['limited_evidence']
      };
      const compact = JSON.stringify({
        jsonrpc: '2.0',
        id: 'tool-bound-1',
        result: {
          content: [{ type: 'text', text: JSON.stringify(baseResult) }],
          structuredContent: baseResult,
          isError: false
        }
      });
      const padCount = Math.max(0, responseTargetBytes - Buffer.byteLength(compact, 'utf8'));
      const rawBody = compact + ' '.repeat(padCount);
      assert.equal(Buffer.byteLength(rawBody, 'utf8'), responseTargetBytes);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(rawBody);
    },
    async endpoint => {
      const client = createPortfolioMcpClient({
        endpoint,
        allowLoopbackForTests: true,
        credentials: TEST_CREDENTIALS
      });

      for (const [bytes, shouldPass] of [
        [MAX_MCP_RESPONSE_BYTES - 1, true],
        [MAX_MCP_RESPONSE_BYTES, true],
        [MAX_MCP_RESPONSE_BYTES + 1, false]
      ] as const) {
        responseTargetBytes = bytes;
        if (shouldPass) {
          const res = await client.callTool(
            'compare_job_requirements',
            { jobText: 'Check response size' },
            { toolCallId: 'tool-bound-1' }
          );
          assert.equal(res.receipt.toolOutcome, 'completed');
        } else {
          await assert.rejects(
            () =>
              client.callTool(
                'compare_job_requirements',
                { jobText: 'Check response size' },
                { toolCallId: 'tool-bound-1' }
              ),
            (err: unknown) => err instanceof McpClientError && err.code === 'MCP_RESPONSE_TOO_LARGE'
          );
        }
      }
    }
  );
});

test('PortfolioMcpClient enforces three-point timeout boundary (4999, 5000, 5001 ms), barrier cancellation, and never leaks CANARY-A10-MCP-SECRET', async () => {
  const CANARY = 'CANARY-A10-MCP-SECRET';
  const traces: McpTraceEvent[] = [];
  const receipts: McpCallReceipt[] = [];
  let simulatedElapsedMs = 0;

  const mcpHandler = createMcpHttpHandler({
    tools: createTestTools(),
    requireIamContext: false,
    requireSigV4: true,
    sigV4Credentials: TEST_CREDENTIALS
  });

  // 1. Three-point timeout boundary (4999ms pass, 5000ms pass, 5001ms MCP_TIMEOUT) using injected clock
  await withLoopbackServer(
    (req, res) => {
      mcpHandler(req, res);
    },
    async endpoint => {
      let currentClock = 1_730_380_000_000;
      const client = createPortfolioMcpClient({
        endpoint,
        allowLoopbackForTests: true,
        credentials: TEST_CREDENTIALS,
        timeoutMs: 5_000,
        now: () => currentClock,
        fetchImpl: async (url, init) => {
          const response = await fetch(url, init);
          currentClock += simulatedElapsedMs;
          return response;
        },
        onTrace: t => traces.push(t),
        onReceipt: r => receipts.push(r)
      });

      for (const [elapsed, shouldPass] of [
        [4_999, true],
        [5_000, true],
        [5_001, false]
      ] as const) {
        currentClock = 1_730_380_000_000;
        simulatedElapsedMs = elapsed;
        if (shouldPass) {
          const out = await client.callTool(
            'search_public_evidence',
            { query: `Boundary ${CANARY}` },
            { toolCallId: `tool-clock-${elapsed}` }
          );
          assert.equal(out.receipt.durationMs, elapsed);
        } else {
          await assert.rejects(
            () =>
              client.callTool(
                'search_public_evidence',
                { query: `Boundary ${CANARY}` },
                { toolCallId: `tool-clock-${elapsed}` }
              ),
            (err: unknown) => {
              assert.ok(err instanceof McpClientError);
              assert.equal(err.code, 'MCP_TIMEOUT');
              assert.equal(err.message.includes(CANARY), false);
              return true;
            }
          );
        }
      }
    }
  );

  // 2. Barrier-controlled abort signal cancellation while request is in flight (zero wall-clock sleep)
  const abortController = new AbortController();
  await withLoopbackServer(
    (req, res) => {
      req.on('close', () => {
        if (!res.writableEnded) res.end();
      });
      // Immediately signal the caller barrier once request arrives at server
      abortController.abort();
    },
    async endpoint => {
      const client = createPortfolioMcpClient({
        endpoint,
        allowLoopbackForTests: true,
        credentials: TEST_CREDENTIALS,
        timeoutMs: 5_000,
        onTrace: t => traces.push(t),
        onReceipt: r => receipts.push(r)
      });

      await assert.rejects(
        () =>
          client.callTool(
            'search_public_evidence',
            { query: `Query containing ${CANARY}` },
            { toolCallId: 'tool-timeout-1', signal: abortController.signal }
          ),
        (err: unknown) => {
          assert.ok(err instanceof McpClientError);
          assert.equal(err.code, 'MCP_TIMEOUT');
          assert.equal(err.message.includes(CANARY), false);
          return true;
        }
      );

      // Verify invalid client-side input/tool rejection also never leaks CANARY
      await assert.rejects(
        () =>
          client.callTool(
            'compare_job_requirements',
            { jobText: `\u0000${CANARY}` },
            { toolCallId: 'tool-bad-input-1' }
          ),
        (err: unknown) => {
          assert.ok(err instanceof McpClientError);
          assert.equal(err.code, 'INVALID_TOOL_INPUT');
          assert.equal(err.message.includes(CANARY), false);
          return true;
        }
      );

      assert.equal(JSON.stringify(traces).includes(CANARY), false);
      assert.equal(JSON.stringify(receipts).includes(CANARY), false);
      assert.equal(receipts.some(r => r.toolOutcome === 'timeout'), true);
    }
  );
});
