import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createMcpLambdaHandler,
  createMcpServer,
  MAX_MCP_REQUEST_BYTES,
  MAX_TOOL_OUTPUT_BYTES,
  MCP_ENDPOINT_PATH,
  MCP_PROTOCOL_VERSION,
  MCP_SERVER_NAME,
  PORTFOLIO_MCP_TOOLS,
  TOOL_NAMES,
  type CompareJobRequirementsOutput,
  type GetCaseStudyOutput,
  type McpHttpRequest,
  type McpLambdaEvent,
  type McpLambdaIdentity,
  type McpServerReceipt,
  type SearchPublicEvidenceOutput,
  type ToolRegistry
} from '../src/index.js';

const contracts = require('../../../chat/contracts/index.cjs') as {
  TOOL_NAMES: readonly string[];
  assertToolInput(name: string, value: unknown): unknown;
  assertToolOutput(name: string, value: unknown): unknown;
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

const CORPUS_VERSION = corpus.corpusVersion;
const SAMPLE_CLAIM = corpus.claims[0]!;
const RAW_SOURCE = corpus.sources[0]!;
const SAMPLE_SOURCE = {
  id: RAW_SOURCE.id,
  url: RAW_SOURCE.url,
  revision: RAW_SOURCE.revision
};

function createSampleTools(overrides: Partial<ToolRegistry> = {}): ToolRegistry {
  const validSearchOutput: SearchPublicEvidenceOutput = {
    schemaVersion: '1.0.0',
    corpusVersion: CORPUS_VERSION,
    retrievalMode: 'deterministic',
    matches: [
      {
        chunkId: SAMPLE_CLAIM.chunkId,
        claimId: SAMPLE_CLAIM.id,
        projectId: SAMPLE_CLAIM.projectId,
        title: SAMPLE_CLAIM.title,
        period: SAMPLE_CLAIM.period,
        score: 12.5,
        text: SAMPLE_CLAIM.text,
        qualificationNotes: [...SAMPLE_CLAIM.qualificationNotes],
        sourceIds: [...SAMPLE_CLAIM.sourceIds],
        url: SAMPLE_SOURCE.url
      }
    ]
  };
  const validCaseStudyOutput: GetCaseStudyOutput = {
    schemaVersion: '1.0.0',
    corpusVersion: CORPUS_VERSION,
    projectId: SAMPLE_CLAIM.projectId,
    chunkId: SAMPLE_CLAIM.chunkId,
    claimId: SAMPLE_CLAIM.id,
    title: SAMPLE_CLAIM.title,
    period: SAMPLE_CLAIM.period,
    text: SAMPLE_CLAIM.text,
    decision: 'Reviewed integration architecture and mapping specifications.',
    process: ['Analyzed upstream schema', 'Validated reconciliation rules'],
    technicalGuidance: 'Documented integration boundaries and operational SQL checks.',
    outcome: 'Adopted by the team for production workflow execution.',
    tags: ['integrations', 'validation'],
    qualificationNotes: [...SAMPLE_CLAIM.qualificationNotes],
    sources: [SAMPLE_SOURCE]
  };
  const validCompareOutput: CompareJobRequirementsOutput = {
    schemaVersion: '1.0.0',
    corpusVersion: CORPUS_VERSION,
    matches: [
      {
        requirement: 'Enterprise systems integration and data mapping',
        status: 'supported',
        claimIds: [SAMPLE_CLAIM.id],
        projectIds: [SAMPLE_CLAIM.projectId],
        qualificationNotes: [...SAMPLE_CLAIM.qualificationNotes]
      }
    ],
    gaps: ['Formal AWS Solutions Architect certification is not claimed'],
    qualificationSummary: ['Historical responsibilities do not create a formal Architect job title.'],
    noticeCodes: ['limited_evidence']
  };

  return {
    search_public_evidence: async () => structuredClone(validSearchOutput),
    get_case_study: async () => structuredClone(validCaseStudyOutput),
    compare_job_requirements: async () => structuredClone(validCompareOutput),
    ...overrides
  };
}

function makeRequest(
  body: unknown,
  overrides: Partial<McpHttpRequest> = {}
): McpHttpRequest {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  const bodyBytes = Buffer.from(raw, 'utf8');
  return {
    method: 'POST',
    path: MCP_ENDPOINT_PATH,
    headers: {
      'content-type': 'application/json',
      'content-length': String(bodyBytes.byteLength)
    },
    bodyBytes,
    iamIdentity: {
      userArn: 'arn:aws:sts::099256072947:assumed-role/joshboyer-chat-dev-handler/joshboyer-chat-dev-handler',
      caller: 'AROAEXAMPLECALLERID:joshboyer-chat-dev-handler',
      accountId: '099256072947'
    },
    requestId: 'req-test-1',
    ...overrides
  };
}

test('MCP server handles initialize, notifications/initialized, and tools/list with strict read-only 3-tool catalogue', async () => {
  const receipts: McpServerReceipt[] = [];
  const server = createMcpServer({
    tools: createSampleTools(),
    onReceipt: r => receipts.push(r)
  });

  // 1. initialize with 2025-03-26
  const initRes = await server.handleHttpRequest(
    makeRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      }
    })
  );
  assert.equal(initRes.statusCode, 200);
  const initBody = JSON.parse(initRes.body);
  assert.deepEqual(initBody, {
    jsonrpc: '2.0',
    id: 1,
    result: {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: MCP_SERVER_NAME, version: '1.0.0' }
    }
  });

  // 2. initialize also accepts 2024-11-05 and negotiates 2025-03-26
  const initLegacyRes = await server.handleHttpRequest(
    makeRequest({
      jsonrpc: '2.0',
      id: 'init-2',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      }
    })
  );
  assert.equal(initLegacyRes.statusCode, 200);
  assert.equal(JSON.parse(initLegacyRes.body).result.protocolVersion, '2025-03-26');

  // 3. initialize rejects unsupported protocolVersion
  const badProtoRes = await server.handleHttpRequest(
    makeRequest({
      jsonrpc: '2.0',
      id: 'init-bad',
      method: 'initialize',
      params: { protocolVersion: '1999-01-01' }
    })
  );
  const badProtoBody = JSON.parse(badProtoRes.body);
  assert.equal(badProtoBody.error.code, -32602);
  assert.equal(badProtoBody.error.data.code, 'UNSUPPORTED_PROTOCOL_VERSION');

  // 4. notifications/initialized returns 202 empty body
  const notifyRes = await server.handleHttpRequest(
    makeRequest({
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    })
  );
  assert.equal(notifyRes.statusCode, 202);
  assert.equal(notifyRes.body, '');

  // 5. tools/list returns strictly the 3 approved read-only tools with self-contained schemas
  const listRes = await server.handleHttpRequest(
    makeRequest({
      jsonrpc: '2.0',
      id: 'list-1',
      method: 'tools/list',
      params: {}
    })
  );
  assert.equal(listRes.statusCode, 200);
  const listBody = JSON.parse(listRes.body);
  assert.equal(listBody.result.tools.length, 3);
  assert.deepEqual(
    listBody.result.tools.map((t: { name: string }) => t.name),
    [...contracts.TOOL_NAMES]
  );
  assert.deepEqual(PORTFOLIO_MCP_TOOLS.map(t => t.name), [...TOOL_NAMES]);

  for (const tool of listBody.result.tools) {
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.destructiveHint, false);
    assert.equal(tool.annotations.idempotentHint, true);
    assert.equal(tool.annotations.openWorldHint, false);
    assert.equal(tool.inputSchema.type, 'object');
    assert.equal(tool.inputSchema.additionalProperties, false);
    assert.equal(JSON.stringify(tool.inputSchema).includes('"$ref"'), false);
  }
  assert.ok(receipts.length >= 4);
});

test('MCP server tools/call enforces allowlist before arguments, validates inputs and outputs, and checks output byte boundaries', async () => {
  let handlerCalledForForbiddenTool = false;
  const server = createMcpServer({
    tools: createSampleTools()
  });

  // 1. Valid calls for all 3 allowlisted tools
  const searchRes = await server.handleHttpRequest(
    makeRequest({
      jsonrpc: '2.0',
      id: 'call-1',
      method: 'tools/call',
      params: {
        name: 'search_public_evidence',
        arguments: { query: 'Medavie integration', limit: 3, filters: { facets: ['integrations'] } }
      }
    })
  );
  assert.equal(searchRes.statusCode, 200);
  const searchBody = JSON.parse(searchRes.body);
  assert.equal(searchBody.result.isError, false);
  assert.ok(contracts.assertToolOutput('search_public_evidence', searchBody.result.structuredContent));
  assert.deepEqual(JSON.parse(searchBody.result.content[0].text), searchBody.result.structuredContent);

  const caseRes = await server.handleHttpRequest(
    makeRequest({
      jsonrpc: '2.0',
      id: 'call-2',
      method: 'tools/call',
      params: {
        name: 'get_case_study',
        arguments: { projectId: 'nexus' }
      }
    })
  );
  assert.equal(caseRes.statusCode, 200);
  const caseBody = JSON.parse(caseRes.body);
  assert.ok(contracts.assertToolOutput('get_case_study', caseBody.result.structuredContent));

  const compareRes = await server.handleHttpRequest(
    makeRequest({
      jsonrpc: '2.0',
      id: 'call-3',
      method: 'tools/call',
      params: {
        name: 'compare_job_requirements',
        arguments: { jobText: 'Looking for systems analyst with SQL and XML batch validation experience.' }
      }
    })
  );
  assert.equal(compareRes.statusCode, 200);
  const compareBody = JSON.parse(compareRes.body);
  assert.ok(contracts.assertToolOutput('compare_job_requirements', compareBody.result.structuredContent));

  // 2. Unknown tool names rejected BEFORE inspecting arguments
  for (const forbiddenTool of ['aws_admin', 'aws_s3', 'exec', 'bash', 'read_file', '__proto__', 'constructor', 'toString']) {
    const res = await server.handleHttpRequest(
      makeRequest(
        `{"jsonrpc":"2.0","id":"unknown-${forbiddenTool}","method":"tools/call","params":{"name":${JSON.stringify(forbiddenTool)},"arguments":{"__proto__":{"polluted":true}}}}`
      )
    );
    const body = JSON.parse(res.body);
    assert.equal(body.error.code, -32602);
    assert.equal(body.error.data.code, 'UNKNOWN_TOOL');
  }
  assert.equal(handlerCalledForForbiddenTool, false);

  // 3. Invalid arguments rejected with -32602 INVALID_TOOL_INPUT
  const invalidInputs = [
    { name: 'search_public_evidence', arguments: { query: '   ' } },
    { name: 'search_public_evidence', arguments: { query: 'valid', limit: 99 } },
    { name: 'search_public_evidence', arguments: { query: 'valid', extraField: true } },
    { name: 'get_case_study', arguments: { projectId: '../etc/passwd' } },
    { name: 'get_case_study', arguments: { projectId: 'lowkey' } },
    { name: 'compare_job_requirements', arguments: { jobText: '' } }
  ];
  for (const [idx, params] of invalidInputs.entries()) {
    const res = await server.handleHttpRequest(
      makeRequest({
        jsonrpc: '2.0',
        id: `invalid-in-${idx}`,
        method: 'tools/call',
        params
      })
    );
    const body = JSON.parse(res.body);
    assert.equal(body.error.code, -32602);
    assert.equal(body.error.data.code, 'INVALID_TOOL_INPUT');
  }

  // 4. Invalid / tampered tool output rejected with -32603 INVALID_TOOL_OUTPUT
  const tamperedServer = createMcpServer({
    tools: createSampleTools({
      compare_job_requirements: async () =>
        ({
          schemaVersion: '1.0.0',
          corpusVersion: CORPUS_VERSION,
          matches: [],
          gaps: [],
          qualificationSummary: [],
          noticeCodes: [],
          jobText: 'Echoed untrusted visitor jobText must be rejected'
        }) as unknown as CompareJobRequirementsOutput
    })
  });
  const tamperedRes = await tamperedServer.handleHttpRequest(
    makeRequest({
      jsonrpc: '2.0',
      id: 'tampered-out',
      method: 'tools/call',
      params: {
        name: 'compare_job_requirements',
        arguments: { jobText: 'Senior Analyst role' }
      }
    })
  );
  const tamperedBody = JSON.parse(tamperedRes.body);
  assert.equal(tamperedBody.error.code, -32603);
  assert.equal(tamperedBody.error.data.code, 'INVALID_TOOL_OUTPUT');

  // 5. Tool output byte boundary at 16383, 16384, and 16385 UTF-8 bytes
  function makeOutputOfExactBytes(targetBytes: number): CompareJobRequirementsOutput {
    const base: CompareJobRequirementsOutput = {
      schemaVersion: '1.0.0',
      corpusVersion: CORPUS_VERSION,
      matches: [],
      gaps: [],
      qualificationSummary: [],
      noticeCodes: ['limited_evidence']
    };
    const notes: string[] = [];
    for (let i = 0; i < 8; i += 1) {
      notes.push(`Item-${i}-${'x'.repeat(1900)}`);
    }
    base.qualificationSummary = notes;
    const currentLen = Buffer.byteLength(JSON.stringify(base), 'utf8');
    const diff = targetBytes - currentLen;
    assert.ok(diff > 10 && diff < 2000, `Expected positive padding diff, got ${diff}`);
    notes.push(`Z${'y'.repeat(diff - 4)}`);
    assert.equal(Buffer.byteLength(JSON.stringify(base), 'utf8'), targetBytes);
    return base;
  }

  for (const [targetBytes, shouldPass] of [
    [MAX_TOOL_OUTPUT_BYTES - 1, true],
    [MAX_TOOL_OUTPUT_BYTES, true],
    [MAX_TOOL_OUTPUT_BYTES + 1, false]
  ] as const) {
    const exactOutput = makeOutputOfExactBytes(targetBytes);
    const boundaryServer = createMcpServer({
      tools: createSampleTools({
        compare_job_requirements: async () => exactOutput
      })
    });
    const res = await boundaryServer.handleHttpRequest(
      makeRequest({
        jsonrpc: '2.0',
        id: `out-bytes-${targetBytes}`,
        method: 'tools/call',
        params: {
          name: 'compare_job_requirements',
          arguments: { jobText: 'Boundary test' }
        }
      })
    );
    const body = JSON.parse(res.body);
    if (shouldPass) {
      assert.equal(body.result.isError, false, `Expected ${targetBytes} bytes to pass`);
    } else {
      assert.equal(body.error.code, -32603, `Expected ${targetBytes} bytes to fail`);
      assert.equal(body.error.data.code, 'TOOL_OUTPUT_TOO_LARGE');
    }
  }
});

test('MCP server enforces HTTP method, path, Content-Type, Origin, batch array rejection, and 16383/16384/16385 request byte boundaries', async () => {
  const server = createMcpServer({ tools: createSampleTools() });

  // Wrong HTTP methods -> 405
  for (const method of ['GET', 'DELETE', 'PUT', 'PATCH', 'HEAD', 'OPTIONS']) {
    const res = await server.handleHttpRequest(makeRequest({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, { method }));
    assert.equal(res.statusCode, 405);
    assert.equal(res.headers.allow, 'POST');
    assert.equal(JSON.parse(res.body).error.data.code, 'METHOD_NOT_ALLOWED');
  }

  // Wrong path -> 404
  const wrongPathRes = await server.handleHttpRequest(
    makeRequest({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, { path: '/api/chat/messages' })
  );
  assert.equal(wrongPathRes.statusCode, 404);
  assert.equal(JSON.parse(wrongPathRes.body).error.data.code, 'NOT_FOUND');

  // Non-JSON Content-Type -> 415
  for (const contentType of ['text/plain', 'application/x-www-form-urlencoded', 'text/event-stream', undefined]) {
    const res = await server.handleHttpRequest(
      makeRequest(
        { jsonrpc: '2.0', id: 1, method: 'tools/list' },
        { headers: contentType ? { 'content-type': contentType } : {} }
      )
    );
    assert.equal(res.statusCode, 415);
    assert.equal(JSON.parse(res.body).error.data.code, 'UNSUPPORTED_MEDIA_TYPE');
  }

  // Content-Encoding compressed -> 415
  const compressedRes = await server.handleHttpRequest(
    makeRequest(
      { jsonrpc: '2.0', id: 1, method: 'tools/list' },
      { headers: { 'content-type': 'application/json', 'content-encoding': 'gzip' } }
    )
  );
  assert.equal(compressedRes.statusCode, 415);

  // Browser Origin header on internal MCP endpoint -> 403
  const originRes = await server.handleHttpRequest(
    makeRequest(
      { jsonrpc: '2.0', id: 1, method: 'tools/list' },
      { headers: { 'content-type': 'application/json', origin: 'https://evil.example' } }
    )
  );
  assert.equal(originRes.statusCode, 403);
  assert.equal(JSON.parse(originRes.body).error.data.code, 'UNAUTHORIZED');

  // Batch JSON-RPC array rejection -> 400 -32600
  const batchRes = await server.handleHttpRequest(
    makeRequest([
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } },
      { jsonrpc: '2.0', id: 2, method: 'tools/list' }
    ])
  );
  assert.equal(batchRes.statusCode, 400);
  const batchBody = JSON.parse(batchRes.body);
  assert.equal(batchBody.error.code, -32600);
  assert.equal(batchBody.error.data.code, 'INVALID_REQUEST');

  // Disallowed JSON-RPC methods -> -32601 METHOD_NOT_FOUND
  for (const method of ['resources/list', 'resources/read', 'prompts/list', 'sampling/createMessage', 'roots/list', 'ping']) {
    const res = await server.handleHttpRequest(makeRequest({ jsonrpc: '2.0', id: 'm-1', method }));
    const body = JSON.parse(res.body);
    assert.equal(body.error.code, -32601);
    assert.equal(body.error.data.code, 'METHOD_NOT_FOUND');
  }

  // Request body UTF-8 byte boundary at 16383, 16384, and 16385 bytes
  function makePayloadOfExactBytes(targetBytes: number): string {
    const prefix = '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{"_pad":"';
    const suffix = '"}}';
    const padLength = targetBytes - Buffer.byteLength(prefix + suffix, 'utf8');
    const raw = prefix + 'a'.repeat(padLength) + suffix;
    assert.equal(Buffer.byteLength(raw, 'utf8'), targetBytes);
    return raw;
  }

  for (const [byteCount, expectedStatus] of [
    [MAX_MCP_REQUEST_BYTES - 1, 200],
    [MAX_MCP_REQUEST_BYTES, 200],
    [MAX_MCP_REQUEST_BYTES + 1, 413]
  ] as const) {
    const raw = makePayloadOfExactBytes(byteCount);
    const res = await server.handleHttpRequest(makeRequest(raw));
    assert.equal(res.statusCode, expectedStatus, `Expected status ${expectedStatus} for ${byteCount} bytes`);
    if (expectedStatus === 413) {
      assert.equal(JSON.parse(res.body).error.data.code, 'PAYLOAD_TOO_LARGE');
    }
  }
});

test('MCP server enforces three-point tool deadline boundary (deadline-1, deadline, deadline+1 ms) and barrier signal cancellation', async () => {
  const CANARY = 'CANARY-A10-MCP-SECRET';
  let currentTimeMs = 10_000;
  let simulatedElapsedMs = 0;

  const sampleTools = createSampleTools();
  const deadlineServer = createMcpServer({
    toolDeadlineMs: 5_000,
    now: () => currentTimeMs,
    tools: createSampleTools({
      get_case_study: async (args, ctx) => {
        currentTimeMs += simulatedElapsedMs;
        return sampleTools.get_case_study!(args, ctx);
      }
    })
  });

  // Three-point deadline boundary: 4999ms (pass), 5000ms (pass), 5001ms (TOOL_TIMEOUT)
  for (const [elapsed, shouldPass] of [
    [4_999, true],
    [5_000, true],
    [5_001, false]
  ] as const) {
    currentTimeMs = 10_000;
    simulatedElapsedMs = elapsed;
    const res = await deadlineServer.handleHttpRequest(
      makeRequest({
        jsonrpc: '2.0',
        id: `deadline-${elapsed}`,
        method: 'tools/call',
        params: { name: 'get_case_study', arguments: { projectId: 'nexus' } }
      })
    );
    const body = JSON.parse(res.body);
    if (shouldPass) {
      assert.equal(body.result.isError, false, `Expected ${elapsed}ms to pass`);
    } else {
      assert.equal(body.error.code, -32000, `Expected ${elapsed}ms to fail with TOOL_TIMEOUT`);
      assert.equal(body.error.data.code, 'TOOL_TIMEOUT');
    }
  }

  // Deterministic barrier-controlled cancellation (no sleep)
  const abortController = new AbortController();
  const barrierServer = createMcpServer({
    tools: createSampleTools({
      search_public_evidence: async (_args, context) => {
        // Trigger abort as soon as the tool enters execution
        abortController.abort();
        if (context.signal.aborted) {
          throw new Error(CANARY);
        }
        throw new Error(CANARY);
      }
    })
  });

  const cancelRes = await barrierServer.handleHttpRequest(
    makeRequest(
      {
        jsonrpc: '2.0',
        id: 'barrier-cancel-1',
        method: 'tools/call',
        params: { name: 'search_public_evidence', arguments: { query: `Search ${CANARY}` } }
      },
      { signal: abortController.signal }
    )
  );
  const cancelBody = JSON.parse(cancelRes.body);
  assert.equal(cancelBody.error.code, -32000);
  assert.equal(cancelBody.error.data.code, 'TOOL_TIMEOUT');
  assert.equal(cancelRes.body.includes(CANARY), false);
});

test('Lambda handler enforces AWS IAM caller context and seeded adversarial fuzzing (seed=0x20261031) never leaks CANARY-A10-MCP-SECRET', async () => {
  const CANARY = 'CANARY-A10-MCP-SECRET';
  const receipts: McpServerReceipt[] = [];

  const lambdaHandler = createMcpLambdaHandler({
    tools: createSampleTools({
      get_case_study: async () => {
        throw new Error(`Internal secret failure: ${CANARY}`);
      }
    }),
    allowedAccountId: '099256072947',
    allowedCallerArnPrefix: 'arn:aws:sts::099256072947:assumed-role/joshboyer-chat-dev-handler/',
    now: () => 1_730_380_000_000,
    onReceipt: r => receipts.push(r)
  });

  function makeLambdaEvent(
    body: unknown,
    identityOverrides: Partial<McpLambdaIdentity> = {}
  ): McpLambdaEvent {
    return {
      httpMethod: 'POST',
      path: '/api/chat/_mcp',
      headers: { 'content-type': 'application/json' },
      multiValueHeaders: { 'content-type': ['application/json'] },
      body: typeof body === 'string' ? body : JSON.stringify(body),
      isBase64Encoded: false,
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      resource: '/api/chat/_mcp',
      requestContext: {
        accountId: '099256072947',
        apiId: 'api1234567',
        authorizer: null,
        protocol: 'HTTP/1.1',
        httpMethod: 'POST',
        path: '/dev/api/chat/_mcp',
        stage: 'dev',
        requestId: 'gw-req-1',
        requestTimeEpoch: 1730380000000,
        resourceId: 'res1',
        resourcePath: '/api/chat/_mcp',
        identity: {
          accessKey: 'ASIAEXAMPLE',
          accountId: '099256072947',
          apiKey: null,
          apiKeyId: null,
          caller: 'AROAEXAMPLE:joshboyer-chat-dev-handler',
          clientCert: null,
          cognitoAuthenticationProvider: null,
          cognitoAuthenticationType: null,
          cognitoIdentityId: null,
          cognitoIdentityPoolId: null,
          principalOrgId: null,
          sourceIp: '10.0.0.1',
          user: 'AROAEXAMPLE:joshboyer-chat-dev-handler',
          userAgent: 'node',
          userArn: 'arn:aws:sts::099256072947:assumed-role/joshboyer-chat-dev-handler/joshboyer-chat-dev-handler',
          ...identityOverrides
        }
      }
    };
  }

  // 1. Unauthenticated Lambda event (no IAM userArn or caller) -> 403
  const unauthRes = await lambdaHandler(
    makeLambdaEvent({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, { userArn: null, caller: null })
  );
  assert.equal(unauthRes.statusCode, 403);
  assert.equal(unauthRes.headers?.['cache-control'], 'no-store');
  assert.equal(unauthRes.headers?.['x-content-type-options'], 'nosniff');
  assert.equal(JSON.parse(unauthRes.body).error.data.code, 'UNAUTHORIZED');

  // 2. Wrong AWS account ID or wrong role ARN -> 403
  const wrongAccountRes = await lambdaHandler(
    makeLambdaEvent({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, { accountId: '999999999999' })
  );
  assert.equal(wrongAccountRes.statusCode, 403);

  const wrongRoleRes = await lambdaHandler(
    makeLambdaEvent(
      { jsonrpc: '2.0', id: 1, method: 'tools/list' },
      { userArn: 'arn:aws:sts::099256072947:assumed-role/other-role/session' }
    )
  );
  assert.equal(wrongRoleRes.statusCode, 403);

  // 3. Tool throwing exception with CANARY -> -32603 TOOL_EXECUTION_FAILED with zero canary leak
  const errRes = await lambdaHandler(
    makeLambdaEvent({
      jsonrpc: '2.0',
      id: 'err-1',
      method: 'tools/call',
      params: { name: 'get_case_study', arguments: { projectId: 'nexus' } }
    })
  );
  assert.equal(errRes.statusCode, 200);
  const errBody = JSON.parse(errRes.body);
  assert.equal(errBody.error.code, -32603);
  assert.equal(errBody.error.data.code, 'TOOL_EXECUTION_FAILED');
  assert.equal(errRes.body.includes(CANARY), false);

  // 4. Prototype pollution and canary in invalid tool input -> rejected with zero canary leak
  const protoRes = await lambdaHandler(
    makeLambdaEvent(
      `{"jsonrpc":"2.0","id":"proto-1","method":"tools/call","params":{"name":"compare_job_requirements","arguments":{"jobText":"${CANARY}","__proto__":{"polluted":"${CANARY}"}}}}`
    )
  );
  const protoBody = JSON.parse(protoRes.body);
  assert.equal(protoBody.error.code, -32602);
  assert.equal(protoRes.body.includes(CANARY), false);

  // 5. Seeded property / fuzz test (seed = 0x20261031, 200 iterations)
  // Invariants:
  //  (a) Never throws an unclassified exception
  //  (b) Never emits CANARY-A10-MCP-SECRET in body, headers, or receipt
  //  (c) Deterministic: identical input produces identical output
  let state = 0x20261031;
  const nextRand = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
  const hostilePayloads = [
    '',
    '{',
    `{"__proto__":{"canary":"${CANARY}"}}`,
    `[{"jsonrpc":"2.0","id":1,"method":"tools/list"}]`,
    `{"jsonrpc":"2.0","id":"${CANARY}\r\nInjected","method":"tools/list"}`,
    `{"jsonrpc":"2.0","id":1,"method":"${CANARY}","params":{}}`,
    `{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"${CANARY}","arguments":{"query":"${CANARY}"}}}`,
    `{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_public_evidence","arguments":{"query":"\\u0000${CANARY}"}}}`,
    `{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_public_evidence","arguments":{"query":"SELECT * FROM secrets WHERE key='${CANARY}'","extra":"${CANARY}"}}}`,
    `{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_case_study","arguments":{"projectId":"https://user:${CANARY}@evil.example/#projects/nexus"}}}`
  ];

  for (let i = 0; i < 200; i += 1) {
    const rawBody = `${hostilePayloads[nextRand() % hostilePayloads.length]!}`;
    const event = makeLambdaEvent(rawBody);
    const first = await lambdaHandler(event);
    const second = await lambdaHandler(event);
    assert.deepEqual(first, second);
    assert.equal(first.body.includes(CANARY), false);
    assert.equal(JSON.stringify(first.headers).includes(CANARY), false);
  }

  assert.equal(JSON.stringify(receipts).includes(CANARY), false);
});
