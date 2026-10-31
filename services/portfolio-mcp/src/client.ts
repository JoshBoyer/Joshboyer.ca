import { createHash, createHmac } from 'node:crypto';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import type { McpClientOptions, PortfolioMcpClientInterface } from './index.js';
import { isSafeJsonValue } from './server.js';
import {
  DEFAULT_TOOL_DEADLINE_MS,
  MAX_CLIENT_TIMEOUT_MS,
  MAX_MCP_REQUEST_BYTES,
  MAX_MCP_RESPONSE_BYTES,
  MCP_CLIENT_NAME,
  MCP_CLIENT_VERSION,
  MCP_ENDPOINT_PATH,
  MCP_PROTOCOL_VERSION,
  MCP_REGION,
  MCP_SERVER_NAME,
  MCP_SERVICE,
  MCP_STAGE_ENDPOINT_PATH,
  SUPPORTED_MCP_PROTOCOL_VERSIONS,
  TOOL_NAMES,
  type AwsCredentials,
  type CredentialProvider,
  type JsonRpcResponse,
  type McpCallReceipt,
  type McpInitializeResult,
  type McpMethod,
  type McpToolDefinition,
  type McpTraceEvent,
  type PublicTraceErrorCode,
  type ToolInputMap,
  type ToolName,
  type ToolOutcome,
  type ToolOutputMap
} from './types.js';

const contracts = require('../../../chat/contracts/index.cjs') as {
  TOOL_NAMES: readonly ToolName[];
  assertToolInput(name: string, value: unknown): unknown;
  assertToolOutput(name: string, value: unknown): unknown;
};

interface SmithyHttpRequestOptions {
  method: string;
  protocol: string;
  hostname: string;
  port?: number;
  path: string;
  headers: Record<string, string>;
  body: string;
}

interface SignedSmithyRequest {
  method: string;
  headers: Record<string, string>;
  body?: string;
}

interface SignatureV4Instance {
  sign(
    requestToSign: SmithyHttpRequestOptions,
    options?: { signingDate?: Date }
  ): Promise<SignedSmithyRequest>;
}

interface SignatureV4Constructor {
  new (options: {
    service: string;
    region: string;
    credentials: AwsCredentials | CredentialProvider;
    sha256: typeof Sha256;
    applyChecksum?: boolean;
  }): SignatureV4Instance;
}

interface HttpRequestConstructor {
  new (options: SmithyHttpRequestOptions): SmithyHttpRequestOptions;
}

function resolveChatRequire(): NodeRequire {
  return createRequire(path.resolve(__dirname, '../../chat/package.json'));
}

function loadSignatureV4(): SignatureV4Constructor {
  try {
    const mod = require('@smithy/signature-v4') as { SignatureV4: SignatureV4Constructor };
    return mod.SignatureV4;
  } catch {
    const mod = resolveChatRequire()('@smithy/signature-v4') as { SignatureV4: SignatureV4Constructor };
    return mod.SignatureV4;
  }
}

function loadHttpRequest(): HttpRequestConstructor {
  try {
    const mod = require('@smithy/core/protocols') as { HttpRequest: HttpRequestConstructor };
    return mod.HttpRequest;
  } catch {
    const mod = resolveChatRequire()('@smithy/core/protocols') as { HttpRequest: HttpRequestConstructor };
    return mod.HttpRequest;
  }
}

function loadDefaultCredentialProvider(): () => CredentialProvider {
  try {
    const mod = require('@aws-sdk/credential-provider-node') as { defaultProvider: () => CredentialProvider };
    return mod.defaultProvider;
  } catch {
    const mod = resolveChatRequire()('@aws-sdk/credential-provider-node') as { defaultProvider: () => CredentialProvider };
    return mod.defaultProvider;
  }
}

const SignatureV4 = loadSignatureV4();
const HttpRequest = loadHttpRequest();
const defaultCredentialProvider = loadDefaultCredentialProvider();

export class Sha256 {
  private readonly hash: ReturnType<typeof createHash> | ReturnType<typeof createHmac>;

  constructor(secret?: string | ArrayBuffer | ArrayBufferView) {
    if (secret !== undefined) {
      const key =
        typeof secret === 'string'
          ? secret
          : ArrayBuffer.isView(secret)
            ? Buffer.from(secret.buffer, secret.byteOffset, secret.byteLength)
            : Buffer.from(secret);
      this.hash = createHmac('sha256', key);
    } else {
      this.hash = createHash('sha256');
    }
  }

  update(data: string | ArrayBuffer | ArrayBufferView): void {
    const buf =
      typeof data === 'string'
        ? Buffer.from(data, 'utf8')
        : ArrayBuffer.isView(data)
          ? Buffer.from(data.buffer, data.byteOffset, data.byteLength)
          : Buffer.from(data);
    this.hash.update(buf);
  }

  async digest(): Promise<Uint8Array> {
    return new Uint8Array(this.hash.digest());
  }
}

export type McpClientErrorCode =
  | 'INVALID_MCP_ENDPOINT'
  | 'INVALID_CLIENT_CONFIG'
  | 'UNKNOWN_TOOL'
  | 'INVALID_TOOL_INPUT'
  | 'INVALID_TOOL_CALL_ID'
  | 'MCP_REQUEST_TOO_LARGE'
  | 'MCP_RESPONSE_TOO_LARGE'
  | 'MCP_TIMEOUT'
  | 'MCP_UNAUTHORIZED'
  | 'MCP_HTTP_ERROR'
  | 'MCP_PROTOCOL_ERROR'
  | 'MCP_REMOTE_ERROR'
  | 'UNEXPECTED_TOOL_DISCOVERY'
  | 'INVALID_TOOL_OUTPUT';

export class McpClientError extends Error {
  public receipt?: McpCallReceipt;

  constructor(
    public readonly code: McpClientErrorCode,
    message: string,
    public readonly retryable = false
  ) {
    super(message);
    this.name = 'McpClientError';
  }
}

const ALLOWED_TOOL_SET = new Set<string>(TOOL_NAMES);
const SUPPORTED_PROTOCOLS = new Set<string>(SUPPORTED_MCP_PROTOCOL_VERSIONS);
const TOOL_CALL_ID_PATTERN = /^tool-[a-zA-Z0-9_-]{1,64}$/;
const EXECUTE_API_HOST_PATTERN = /^[a-z0-9]{6,32}\.execute-api\.us-east-2\.amazonaws\.com$/;

export function validateMcpEndpoint(endpoint: string, allowLoopbackForTests = false): URL {
  if (
    typeof endpoint !== 'string' ||
    endpoint.length === 0 ||
    endpoint.length > 512 ||
    /[\u0000\r\n\\%?]/.test(endpoint) ||
    endpoint.includes('..')
  ) {
    throw new McpClientError('INVALID_MCP_ENDPOINT', 'MCP endpoint URL is invalid or contains forbidden characters.', false);
  }

  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new McpClientError('INVALID_MCP_ENDPOINT', 'MCP endpoint URL is malformed.', false);
  }

  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new McpClientError('INVALID_MCP_ENDPOINT', 'MCP endpoint URL must not include credentials, query, or hash.', false);
  }

  if (parsed.pathname !== MCP_STAGE_ENDPOINT_PATH && parsed.pathname !== MCP_ENDPOINT_PATH) {
    throw new McpClientError('INVALID_MCP_ENDPOINT', 'MCP endpoint path must be /dev/api/chat/_mcp or /api/chat/_mcp.', false);
  }

  if (parsed.protocol === 'https:') {
    if (parsed.port !== '' || !EXECUTE_API_HOST_PATTERN.test(parsed.hostname)) {
      throw new McpClientError(
        'INVALID_MCP_ENDPOINT',
        'HTTPS MCP endpoint must target execute-api in us-east-2.',
        false
      );
    }
    return parsed;
  }

  if (allowLoopbackForTests && parsed.protocol === 'http:' && parsed.hostname === '127.0.0.1') {
    const portNum = Number(parsed.port);
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      throw new McpClientError('INVALID_MCP_ENDPOINT', 'Loopback test MCP endpoint requires an explicit port.', false);
    }
    return parsed;
  }

  throw new McpClientError('INVALID_MCP_ENDPOINT', 'MCP endpoint protocol or host is not permitted.', false);
}

function mapErrorToTraceCode(code: McpClientErrorCode): PublicTraceErrorCode {
  switch (code) {
    case 'MCP_TIMEOUT':
      return 'deadline_exceeded';
    case 'UNKNOWN_TOOL':
    case 'INVALID_TOOL_INPUT':
    case 'INVALID_TOOL_CALL_ID':
    case 'MCP_REQUEST_TOO_LARGE':
      return 'invalid_request';
    case 'INVALID_TOOL_OUTPUT':
    case 'UNEXPECTED_TOOL_DISCOVERY':
    case 'MCP_RESPONSE_TOO_LARGE':
    case 'MCP_PROTOCOL_ERROR':
      return 'validation_failed';
    case 'MCP_UNAUTHORIZED':
    case 'INVALID_MCP_ENDPOINT':
    case 'INVALID_CLIENT_CONFIG':
      return 'unavailable';
    default:
      return 'upstream_failure';
  }
}

async function readBoundedResponseBytes(response: Response, maxBytes: number): Promise<Uint8Array> {
  const contentLength = response.headers.get('content-length');
  if (contentLength !== null) {
    const declared = Number(contentLength);
    if (Number.isFinite(declared) && declared > maxBytes) {
      try {
        await response.body?.cancel();
      } catch {
        // Ignore cancellation error
      }
      throw new McpClientError('MCP_RESPONSE_TOO_LARGE', 'MCP response exceeded 32768-byte limit.', false);
    }
  }

  if (!response.body) {
    const buf = new Uint8Array(await response.arrayBuffer());
    if (buf.byteLength > maxBytes) {
      throw new McpClientError('MCP_RESPONSE_TOO_LARGE', 'MCP response exceeded 32768-byte limit.', false);
    }
    return buf;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > maxBytes) {
          await reader.cancel();
          throw new McpClientError('MCP_RESPONSE_TOO_LARGE', 'MCP response exceeded 32768-byte limit.', false);
        }
        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }

  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return combined;
}

export class PortfolioMcpClient implements PortfolioMcpClientInterface {
  private readonly url: URL;
  private readonly signer: SignatureV4Instance;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly now: () => number;
  private readonly onTrace?: (event: McpTraceEvent) => void;
  private readonly onReceipt?: (receipt: McpCallReceipt) => void;
  private nextRequestCounter = 1;

  constructor(options: McpClientOptions) {
    this.url = validateMcpEndpoint(options.endpoint, options.allowLoopbackForTests ?? false);
    const timeoutMs = options.timeoutMs ?? DEFAULT_TOOL_DEADLINE_MS;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_CLIENT_TIMEOUT_MS) {
      throw new McpClientError(
        'INVALID_CLIENT_CONFIG',
        `MCP client timeoutMs must be an integer between 1 and ${MAX_CLIENT_TIMEOUT_MS}.`,
        false
      );
    }
    this.timeoutMs = timeoutMs;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? Date.now;
    this.onTrace = options.onTrace;
    this.onReceipt = options.onReceipt;

    const credentials: AwsCredentials | CredentialProvider =
      options.credentials ?? defaultCredentialProvider();

    this.signer = new SignatureV4({
      service: MCP_SERVICE,
      region: MCP_REGION,
      credentials,
      sha256: Sha256,
      applyChecksum: true
    });
  }

  private emitTrace(event: McpTraceEvent): void {
    this.onTrace?.(event);
  }

  private emitReceipt(receipt: McpCallReceipt): void {
    this.onReceipt?.(receipt);
  }

  private async sendSignedRpc<T>(
    mcpMethod: McpMethod,
    rpcId: string | number,
    params: Record<string, unknown>,
    meta: { toolName?: ToolName; toolCallId?: string; signal?: AbortSignal }
  ): Promise<{ result: T; durationMs: number }> {
    const startedAt = this.now();
    const bodyText = JSON.stringify({
      jsonrpc: '2.0',
      id: rpcId,
      method: mcpMethod,
      params
    });
    const bodyBytes = Buffer.from(bodyText, 'utf8');
    if (bodyBytes.byteLength > MAX_MCP_REQUEST_BYTES) {
      throw new McpClientError('MCP_REQUEST_TOO_LARGE', 'MCP request payload exceeds 16384 bytes.', false);
    }

    const bodySha256 = createHash('sha256').update(bodyBytes).digest('hex');
    const requestToSign = new HttpRequest({
      method: 'POST',
      protocol: this.url.protocol,
      hostname: this.url.hostname,
      ...(this.url.port ? { port: Number(this.url.port) } : {}),
      path: this.url.pathname,
      headers: {
        host: this.url.host,
        'content-type': 'application/json',
        'x-amz-content-sha256': bodySha256
      },
      body: bodyText
    });

    let signed: SignedSmithyRequest;
    try {
      signed = await this.signer.sign(requestToSign, {
        signingDate: new Date(this.now())
      });
    } catch {
      throw new McpClientError('MCP_UNAUTHORIZED', 'Failed to sign MCP request with AWS SigV4 credentials.', false);
    }

    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);
    const onOuterAbort = () => {
      timedOut = true;
      controller.abort();
    };
    if (meta.signal) {
      if (meta.signal.aborted) {
        clearTimeout(timer);
        throw new McpClientError('MCP_TIMEOUT', 'MCP request aborted before dispatch.', true);
      }
      meta.signal.addEventListener('abort', onOuterAbort, { once: true });
    }

    let responseBytes: Uint8Array;
    let statusCode: number;
    try {
      const response = await this.fetchImpl(this.url.toString(), {
        method: 'POST',
        headers: signed.headers,
        body: bodyText,
        redirect: 'error',
        signal: controller.signal
      });
      statusCode = response.status;
      responseBytes = await readBoundedResponseBytes(response, MAX_MCP_RESPONSE_BYTES);
    } catch (error) {
      if (error instanceof McpClientError) throw error;
      if (timedOut || controller.signal.aborted) {
        throw new McpClientError('MCP_TIMEOUT', 'MCP request timed out.', true);
      }
      throw new McpClientError('MCP_HTTP_ERROR', 'MCP transport request failed.', true);
    } finally {
      clearTimeout(timer);
      meta.signal?.removeEventListener('abort', onOuterAbort);
    }

    if (statusCode === 401 || statusCode === 403) {
      throw new McpClientError('MCP_UNAUTHORIZED', 'MCP server rejected IAM/SigV4 authentication.', false);
    }

    let parsed: JsonRpcResponse<T>;
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(responseBytes);
      parsed = JSON.parse(text) as JsonRpcResponse<T>;
    } catch {
      throw new McpClientError('MCP_PROTOCOL_ERROR', 'MCP server returned non-JSON payload.', false);
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || !isSafeJsonValue(parsed) || parsed.jsonrpc !== '2.0') {
      throw new McpClientError('MCP_PROTOCOL_ERROR', 'MCP server returned an invalid JSON-RPC 2.0 envelope.', false);
    }

    if ('error' in parsed && parsed.error) {
      const errDataCode = parsed.error.data?.code;
      if (errDataCode === 'TOOL_TIMEOUT') {
        throw new McpClientError('MCP_TIMEOUT', 'MCP tool timed out on server.', true);
      }
      if (errDataCode === 'UNAUTHORIZED') {
        throw new McpClientError('MCP_UNAUTHORIZED', 'MCP server rejected caller authentication.', false);
      }
      if (errDataCode === 'UNKNOWN_TOOL') {
        throw new McpClientError('UNKNOWN_TOOL', 'Tool is not in the portfolio catalogue.', false);
      }
      if (errDataCode === 'INVALID_TOOL_INPUT') {
        throw new McpClientError('INVALID_TOOL_INPUT', 'Tool arguments do not match the portfolio contract.', false);
      }
      if (errDataCode === 'INVALID_TOOL_OUTPUT' || errDataCode === 'TOOL_OUTPUT_TOO_LARGE') {
        throw new McpClientError('INVALID_TOOL_OUTPUT', 'MCP server rejected tool output.', false);
      }
      throw new McpClientError(
        'MCP_REMOTE_ERROR',
        'MCP server returned a JSON-RPC error.',
        Boolean(parsed.error.data?.retryable)
      );
    }

    if (statusCode !== 200 || !('result' in parsed) || parsed.id !== rpcId) {
      throw new McpClientError('MCP_PROTOCOL_ERROR', 'MCP response status or JSON-RPC id mismatch.', false);
    }

    const rawElapsedMs = Math.max(0, Math.round(this.now() - startedAt));
    if (rawElapsedMs > this.timeoutMs) {
      throw new McpClientError('MCP_TIMEOUT', 'MCP request timed out.', true);
    }
    const durationMs = Math.min(60_000, rawElapsedMs);
    return { result: parsed.result, durationMs };
  }

  async initialize(signal?: AbortSignal): Promise<{ result: McpInitializeResult; receipt: McpCallReceipt }> {
    const startedAt = this.now();
    const rpcId = `init-${this.nextRequestCounter++}`;
    this.emitTrace({
      stage: 'mcp',
      state: 'started',
      mcpMethod: 'initialize'
    });

    try {
      const { result, durationMs } = await this.sendSignedRpc<McpInitializeResult>(
        'initialize',
        rpcId,
        {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: {
            name: MCP_CLIENT_NAME,
            version: MCP_CLIENT_VERSION
          }
        },
        { signal }
      );

      if (
        !result ||
        typeof result !== 'object' ||
        typeof result.protocolVersion !== 'string' ||
        !SUPPORTED_PROTOCOLS.has(result.protocolVersion) ||
        result.serverInfo?.name !== MCP_SERVER_NAME ||
        typeof result.serverInfo?.version !== 'string' ||
        !result.capabilities ||
        typeof result.capabilities !== 'object' ||
        !result.capabilities.tools
      ) {
        throw new McpClientError('MCP_PROTOCOL_ERROR', 'MCP initialize response failed validation.', false);
      }

      const receipt: McpCallReceipt = {
        mcpMethod: 'initialize',
        toolOutcome: 'completed',
        durationMs
      };
      this.emitTrace({
        stage: 'mcp',
        state: 'completed',
        mcpMethod: 'initialize',
        toolOutcome: 'completed',
        durationMs
      });
      this.emitReceipt(receipt);
      return { result, receipt };
    } catch (error) {
      const durationMs = Math.max(0, Math.min(60_000, Math.round(this.now() - startedAt)));
      const clientErr =
        error instanceof McpClientError
          ? error
          : new McpClientError('MCP_HTTP_ERROR', 'MCP initialize failed.', true);
      const outcome: ToolOutcome = clientErr.code === 'MCP_TIMEOUT' ? 'timeout' : 'error';
      const receipt: McpCallReceipt = {
        mcpMethod: 'initialize',
        toolOutcome: outcome,
        durationMs
      };
      clientErr.receipt = receipt;
      this.emitTrace({
        stage: 'mcp',
        state: 'failed',
        mcpMethod: 'initialize',
        toolOutcome: outcome,
        durationMs,
        code: mapErrorToTraceCode(clientErr.code)
      });
      this.emitReceipt(receipt);
      throw clientErr;
    }
  }

  async notifyInitialized(signal?: AbortSignal): Promise<void> {
    const bodyText = JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    });
    const bodyBytes = Buffer.from(bodyText, 'utf8');
    const bodySha256 = createHash('sha256').update(bodyBytes).digest('hex');
    const requestToSign = new HttpRequest({
      method: 'POST',
      protocol: this.url.protocol,
      hostname: this.url.hostname,
      ...(this.url.port ? { port: Number(this.url.port) } : {}),
      path: this.url.pathname,
      headers: {
        host: this.url.host,
        'content-type': 'application/json',
        'x-amz-content-sha256': bodySha256
      },
      body: bodyText
    });
    const signed = await this.signer.sign(requestToSign, { signingDate: new Date(this.now()) });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const onOuterAbort = () => controller.abort();
    signal?.addEventListener('abort', onOuterAbort, { once: true });
    try {
      const res = await this.fetchImpl(this.url.toString(), {
        method: 'POST',
        headers: signed.headers,
        body: bodyText,
        redirect: 'error',
        signal: controller.signal
      });
      if (res.status !== 200 && res.status !== 202 && res.status !== 204) {
        throw new McpClientError('MCP_PROTOCOL_ERROR', 'MCP initialized notification rejected.', false);
      }
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onOuterAbort);
    }
  }

  async listTools(signal?: AbortSignal): Promise<{ tools: readonly McpToolDefinition[]; receipt: McpCallReceipt }> {
    const startedAt = this.now();
    const rpcId = `list-${this.nextRequestCounter++}`;
    this.emitTrace({
      stage: 'mcp',
      state: 'started',
      mcpMethod: 'tools/list'
    });

    try {
      const { result, durationMs } = await this.sendSignedRpc<{ tools: unknown }>(
        'tools/list',
        rpcId,
        {},
        { signal }
      );

      if (!result || typeof result !== 'object' || !Array.isArray(result.tools) || result.tools.length === 0 || result.tools.length > TOOL_NAMES.length) {
        throw new McpClientError('UNEXPECTED_TOOL_DISCOVERY', 'MCP server returned an invalid tools/list array.', false);
      }

      const seenNames = new Set<string>();
      const validatedTools: McpToolDefinition[] = [];
      for (const rawTool of result.tools) {
        if (!rawTool || typeof rawTool !== 'object' || Array.isArray(rawTool)) {
          throw new McpClientError('UNEXPECTED_TOOL_DISCOVERY', 'MCP tool definition is not a valid object.', false);
        }
        const candidate = rawTool as Record<string, unknown>;
        const name = candidate.name;
        if (typeof name !== 'string' || !ALLOWED_TOOL_SET.has(name) || seenNames.has(name)) {
          throw new McpClientError(
            'UNEXPECTED_TOOL_DISCOVERY',
            'MCP server returned an unapproved or duplicate tool in discovery.',
            false
          );
        }
        seenNames.add(name);
        const annotations = candidate.annotations as Record<string, unknown> | undefined;
        if (
          typeof candidate.description !== 'string' ||
          candidate.description.length === 0 ||
          !candidate.inputSchema ||
          typeof candidate.inputSchema !== 'object' ||
          !annotations ||
          annotations.readOnlyHint !== true ||
          annotations.destructiveHint !== false ||
          annotations.idempotentHint !== true ||
          annotations.openWorldHint !== false
        ) {
          throw new McpClientError(
            'UNEXPECTED_TOOL_DISCOVERY',
            'MCP tool definition is missing required read-only annotations or schema.',
            false
          );
        }
        validatedTools.push(rawTool as McpToolDefinition);
      }

      const receipt: McpCallReceipt = {
        mcpMethod: 'tools/list',
        toolOutcome: 'completed',
        durationMs
      };
      this.emitTrace({
        stage: 'mcp',
        state: 'completed',
        mcpMethod: 'tools/list',
        toolOutcome: 'completed',
        durationMs
      });
      this.emitReceipt(receipt);
      return { tools: validatedTools, receipt };
    } catch (error) {
      const durationMs = Math.max(0, Math.min(60_000, Math.round(this.now() - startedAt)));
      const clientErr =
        error instanceof McpClientError
          ? error
          : new McpClientError('MCP_HTTP_ERROR', 'MCP tools/list failed.', true);
      const outcome: ToolOutcome = clientErr.code === 'MCP_TIMEOUT' ? 'timeout' : 'error';
      const receipt: McpCallReceipt = {
        mcpMethod: 'tools/list',
        toolOutcome: outcome,
        durationMs
      };
      clientErr.receipt = receipt;
      this.emitTrace({
        stage: 'mcp',
        state: 'failed',
        mcpMethod: 'tools/list',
        toolOutcome: outcome,
        durationMs,
        code: mapErrorToTraceCode(clientErr.code)
      });
      this.emitReceipt(receipt);
      throw clientErr;
    }
  }

  async callTool<N extends ToolName>(
    toolName: N,
    args: ToolInputMap[N],
    options: { toolCallId?: string; signal?: AbortSignal } = {}
  ): Promise<{ output: ToolOutputMap[N]; receipt: McpCallReceipt }> {
    const startedAt = this.now();
    const toolCallId = options.toolCallId ?? `tool-${this.nextRequestCounter++}`;
    if (!TOOL_CALL_ID_PATTERN.test(toolCallId)) {
      throw new McpClientError('INVALID_TOOL_CALL_ID', 'Invalid toolCallId format.', false);
    }

    if (typeof toolName !== 'string' || !ALLOWED_TOOL_SET.has(toolName)) {
      throw new McpClientError('UNKNOWN_TOOL', 'Tool is not in the portfolio catalogue.', false);
    }

    try {
      contracts.assertToolInput(toolName, args);
    } catch {
      throw new McpClientError('INVALID_TOOL_INPUT', 'Tool arguments do not match the portfolio contract.', false);
    }

    this.emitTrace({
      stage: 'mcp',
      state: 'started',
      mcpMethod: 'tools/call',
      toolName,
      toolCallId
    });

    try {
      const { result, durationMs } = await this.sendSignedRpc<{
        content?: Array<{ type?: string; text?: string }>;
        structuredContent?: unknown;
        isError?: boolean;
      }>(
        'tools/call',
        toolCallId,
        {
          name: toolName,
          arguments: args as unknown as Record<string, unknown>
        },
        { toolName, toolCallId, signal: options.signal }
      );

      if (!result || typeof result !== 'object' || result.isError === true) {
        throw new McpClientError('MCP_REMOTE_ERROR', 'MCP tool call returned an error state.', false);
      }

      let candidateOutput: unknown = result.structuredContent;
      const firstContent = Array.isArray(result.content) ? result.content[0] : undefined;
      if (firstContent && firstContent.type === 'text' && typeof firstContent.text === 'string') {
        let parsedText: unknown;
        try {
          parsedText = JSON.parse(firstContent.text);
        } catch {
          throw new McpClientError('INVALID_TOOL_OUTPUT', 'MCP tool text content is not valid JSON.', false);
        }
        if (candidateOutput === undefined) {
          candidateOutput = parsedText;
        } else if (!isDeepStrictEqual(candidateOutput, parsedText)) {
          throw new McpClientError(
            'INVALID_TOOL_OUTPUT',
            'MCP tool structuredContent does not match text content.',
            false
          );
        }
      }

      let validatedOutput: ToolOutputMap[N];
      try {
        validatedOutput = contracts.assertToolOutput(toolName, candidateOutput) as ToolOutputMap[N];
      } catch {
        throw new McpClientError('INVALID_TOOL_OUTPUT', 'MCP tool output failed contract validation.', false);
      }

      const receipt: McpCallReceipt = {
        mcpMethod: 'tools/call',
        toolName,
        toolCallId,
        toolOutcome: 'completed',
        durationMs
      };
      this.emitTrace({
        stage: 'mcp',
        state: 'completed',
        mcpMethod: 'tools/call',
        toolName,
        toolCallId,
        toolOutcome: 'completed',
        durationMs
      });
      this.emitReceipt(receipt);
      return { output: validatedOutput, receipt };
    } catch (error) {
      const durationMs = Math.max(0, Math.min(60_000, Math.round(this.now() - startedAt)));
      const clientErr =
        error instanceof McpClientError
          ? error
          : new McpClientError('MCP_HTTP_ERROR', 'MCP tools/call failed.', true);
      const outcome: ToolOutcome = clientErr.code === 'MCP_TIMEOUT' ? 'timeout' : 'error';
      const receipt: McpCallReceipt = {
        mcpMethod: 'tools/call',
        toolName,
        toolCallId,
        toolOutcome: outcome,
        durationMs
      };
      clientErr.receipt = receipt;
      this.emitTrace({
        stage: 'mcp',
        state: 'failed',
        mcpMethod: 'tools/call',
        toolName,
        toolCallId,
        toolOutcome: outcome,
        durationMs,
        code: mapErrorToTraceCode(clientErr.code)
      });
      this.emitReceipt(receipt);
      throw clientErr;
    }
  }

  async connectAndVerify(signal?: AbortSignal): Promise<{
    initializeResult: McpInitializeResult;
    tools: readonly McpToolDefinition[];
    receipts: [McpCallReceipt, McpCallReceipt];
  }> {
    const init = await this.initialize(signal);
    const list = await this.listTools(signal);
    return {
      initializeResult: init.result,
      tools: list.tools,
      receipts: [init.receipt, list.receipt]
    };
  }
}

export function createPortfolioMcpClient(options: McpClientOptions): PortfolioMcpClient {
  return new PortfolioMcpClient(options);
}
