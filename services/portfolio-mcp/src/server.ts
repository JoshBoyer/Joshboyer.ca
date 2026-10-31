import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { types } from 'node:util';
import type {
  AwsCredentials,
  McpHttpRequest,
  McpHttpResponse,
  McpServerOptions,
  PortfolioMcpServer
} from './index.js';
import {
  DEFAULT_TOOL_DEADLINE_MS,
  MAX_MCP_REQUEST_BYTES,
  MAX_MCP_RESPONSE_BYTES,
  MAX_TOOL_OUTPUT_BYTES,
  MCP_ENDPOINT_PATH,
  MCP_PROTOCOL_VERSION,
  MCP_REGION,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  MCP_SERVICE,
  MCP_STAGE_ENDPOINT_PATH,
  SUPPORTED_MCP_PROTOCOL_VERSIONS,
  TOOL_NAMES,
  type JsonRpcErrorResponse,
  type JsonRpcId,
  type JsonRpcSuccessResponse,
  type McpErrorCode,
  type McpInitializeResult,
  type McpServerReceipt,
  type McpToolCallResult,
  type McpToolDefinition,
  type ToolExecutionContext,
  type ToolHandler,
  type ToolName,
  type ToolRegistry
} from './types.js';

const contracts = require('../../../chat/contracts/index.cjs') as {
  TOOL_NAMES: readonly ToolName[];
  assertToolInput(name: string, value: unknown): unknown;
  assertToolOutput(name: string, value: unknown): unknown;
};
const rawSchema = require('../../../chat/contracts/schema.json') as {
  $defs: Record<string, Record<string, unknown>>;
};

function inlineRefs(node: unknown): unknown {
  if (node === null || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map(inlineRefs);
  const obj = node as Record<string, unknown>;
  if (typeof obj.$ref === 'string' && obj.$ref.startsWith('#/$defs/')) {
    const defName = obj.$ref.slice('#/$defs/'.length);
    const target = rawSchema.$defs[defName];
    if (target) {
      const resolved = inlineRefs(structuredClone(target)) as Record<string, unknown>;
      if (!resolved.type && Array.isArray(resolved.enum)) {
        return { type: 'string', ...resolved };
      }
      return resolved;
    }
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = inlineRefs(v);
  }
  return out;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const item of Object.values(value as Record<string, unknown>)) {
      deepFreeze(item);
    }
  }
  return value;
}

const READ_ONLY_ANNOTATIONS = deepFreeze({
  readOnlyHint: true as const,
  destructiveHint: false as const,
  idempotentHint: true as const,
  openWorldHint: false as const
});

export const PORTFOLIO_MCP_TOOLS: readonly McpToolDefinition[] = deepFreeze([
  {
    name: 'search_public_evidence',
    description:
      'Deterministic keyword and facet search over the approved public portfolio corpus returning qualified claims and public URLs.',
    inputSchema: inlineRefs(structuredClone(rawSchema.$defs.search_public_evidence)) as Record<string, unknown>,
    annotations: {
      title: 'Search Public Portfolio Evidence',
      ...READ_ONLY_ANNOTATIONS
    }
  },
  {
    name: 'get_case_study',
    description:
      'Retrieve canonical public case-study evidence, technical decisions, outcomes, and verified source links by allowlisted projectId.',
    inputSchema: inlineRefs(structuredClone(rawSchema.$defs.get_case_study)) as Record<string, unknown>,
    annotations: {
      title: 'Get Portfolio Case Study',
      ...READ_ONLY_ANNOTATIONS
    }
  },
  {
    name: 'compare_job_requirements',
    description:
      'Compare length-limited pasted job requirements deterministically against approved public portfolio claims, gaps, and qualifications.',
    inputSchema: inlineRefs(structuredClone(rawSchema.$defs.compare_job_requirements)) as Record<string, unknown>,
    annotations: {
      title: 'Compare Job Requirements',
      ...READ_ONLY_ANNOTATIONS
    }
  }
]);

const ALLOWED_TOOL_SET = new Set<string>(TOOL_NAMES);
const SUPPORTED_PROTOCOLS = new Set<string>(SUPPORTED_MCP_PROTOCOL_VERSIONS);
const ALLOWED_PATHS = new Set<string>([MCP_ENDPOINT_PATH, MCP_STAGE_ENDPOINT_PATH]);

const BASE_RESPONSE_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  'content-type': 'application/json',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer'
});

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function isSafeJsonValue(value: unknown, seen = new Set<object>()): boolean {
  try {
    if (value === null || typeof value !== 'object') return true;
    if (types.isProxy(value) || seen.has(value)) return false;
    seen.add(value);
    try {
      if (Array.isArray(value)) {
        if (Object.getPrototypeOf(value) !== Array.prototype || Object.getOwnPropertySymbols(value).length > 0) {
          return false;
        }
        const descriptors = Object.getOwnPropertyDescriptors(value);
        if (Object.keys(descriptors).length !== value.length + 1) return false;
        for (let i = 0; i < value.length; i += 1) {
          const desc = descriptors[i];
          if (!desc || 'get' in desc || 'set' in desc || !desc.enumerable || !isSafeJsonValue(desc.value, seen)) {
            return false;
          }
        }
        return true;
      }
      const proto = Object.getPrototypeOf(value);
      if ((proto !== Object.prototype && proto !== null) || Object.getOwnPropertySymbols(value).length > 0) {
        return false;
      }
      for (const [key, desc] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
        if (
          FORBIDDEN_KEYS.has(key) ||
          'get' in desc ||
          'set' in desc ||
          !desc.enumerable ||
          !isSafeJsonValue(desc.value, seen)
        ) {
          return false;
        }
      }
      return true;
    } finally {
      seen.delete(value);
    }
  } catch {
    return false;
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || types.isProxy(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  if ((proto !== Object.prototype && proto !== null) || Object.getOwnPropertySymbols(value).length > 0) {
    return false;
  }
  for (const [key, desc] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (FORBIDDEN_KEYS.has(key) || 'get' in desc || 'set' in desc || !desc.enumerable) {
      return false;
    }
  }
  return true;
}

function normalizeHeaders(
  headers: Record<string, string | string[] | undefined>
): { map: Record<string, string | undefined>; hasDuplicateCriticalHeader: boolean } {
  const map: Record<string, string | undefined> = {};
  const critical = new Set([
    'authorization',
    'content-type',
    'content-length',
    'content-encoding',
    'origin',
    'sec-fetch-site',
    'x-amz-date',
    'x-amz-content-sha256',
    'x-amz-security-token',
    'host'
  ]);
  let hasDuplicateCriticalHeader = false;
  for (const [rawKey, rawValue] of Object.entries(headers)) {
    const key = rawKey.toLowerCase();
    if (Array.isArray(rawValue)) {
      if (rawValue.length > 1 && critical.has(key)) {
        hasDuplicateCriticalHeader = true;
      }
      map[key] = rawValue[0];
    } else if (typeof rawValue === 'string') {
      if (key in map && critical.has(key)) {
        hasDuplicateCriticalHeader = true;
      }
      map[key] = rawValue;
    }
  }
  return { map, hasDuplicateCriticalHeader };
}

function safeJsonRpcId(rawId: unknown): JsonRpcId {
  if (typeof rawId === 'string' && rawId.length >= 1 && rawId.length <= 128 && !/[\u0000\r\n]/.test(rawId)) {
    return rawId;
  }
  if (typeof rawId === 'number' && Number.isInteger(rawId) && Number.isSafeInteger(rawId)) {
    return rawId;
  }
  return null;
}

function jsonRpcError(
  id: JsonRpcId,
  rpcCode: number,
  code: McpErrorCode,
  message: string,
  retryable = false
): JsonRpcErrorResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code: rpcCode,
      message,
      data: { code, retryable }
    }
  };
}

export function verifySigV4Request(
  request: {
    method: string;
    path: string;
    headers: Record<string, string | undefined>;
    bodyBytes: Uint8Array;
  },
  credentials?: AwsCredentials,
  options?: { now?: () => number; maxClockSkewMs?: number }
): { valid: boolean; accessKeyId?: string; region?: string; service?: string; payloadHash?: string } {
  const auth = request.headers.authorization;
  const amzDate = request.headers['x-amz-date'];
  const contentSha256 = request.headers['x-amz-content-sha256'];
  if (!auth || !amzDate || !contentSha256) return { valid: false };

  const match =
    /^AWS4-HMAC-SHA256 Credential=([A-Za-z0-9]+)\/(\d{8})\/([a-z0-9-]+)\/([a-z0-9-]+)\/aws4_request,\s*SignedHeaders=([a-z0-9;-]+),\s*Signature=([0-9a-f]{64})$/.exec(
      auth.trim()
    );
  if (!match) return { valid: false };

  const [, accessKeyId, dateStamp, region, service, signedHeadersRaw, signatureHex] = match;
  if (!accessKeyId || !dateStamp || !region || !service || !signedHeadersRaw || !signatureHex) {
    return { valid: false };
  }
  if (region !== MCP_REGION || service !== MCP_SERVICE) {
    return { valid: false, accessKeyId, region, service };
  }
  if (!/^\d{8}T\d{6}Z$/.test(amzDate) || !amzDate.startsWith(dateStamp)) {
    return { valid: false, accessKeyId, region, service };
  }
  if (options?.now) {
    const iso = `${amzDate.slice(0, 4)}-${amzDate.slice(4, 6)}-${amzDate.slice(6, 8)}T${amzDate.slice(9, 11)}:${amzDate.slice(11, 13)}:${amzDate.slice(13, 15)}Z`;
    const parsedTime = Date.parse(iso);
    const maxSkew = options.maxClockSkewMs ?? 300_000;
    if (!Number.isFinite(parsedTime) || Math.abs(options.now() - parsedTime) > maxSkew) {
      return { valid: false, accessKeyId, region, service };
    }
  }
  if (!/^[0-9a-f]{64}$/.test(contentSha256)) {
    return { valid: false, accessKeyId, region, service };
  }

  const computedPayloadHash = createHash('sha256').update(request.bodyBytes).digest('hex');
  const providedHashBuf = Buffer.from(contentSha256, 'hex');
  const computedHashBuf = Buffer.from(computedPayloadHash, 'hex');
  if (providedHashBuf.length !== computedHashBuf.length || !timingSafeEqual(providedHashBuf, computedHashBuf)) {
    return { valid: false, accessKeyId, region, service, payloadHash: computedPayloadHash };
  }

  const signedHeaders = signedHeadersRaw.split(';');
  const sortedUnique = [...new Set(signedHeaders)].sort();
  if (
    signedHeaders.length !== sortedUnique.length ||
    signedHeaders.some((h, idx) => h !== sortedUnique[idx]) ||
    !signedHeaders.includes('content-type') ||
    !signedHeaders.includes('host') ||
    !signedHeaders.includes('x-amz-content-sha256') ||
    !signedHeaders.includes('x-amz-date')
  ) {
    return { valid: false, accessKeyId, region, service, payloadHash: computedPayloadHash };
  }

  if (credentials) {
    if (accessKeyId !== credentials.accessKeyId) {
      return { valid: false, accessKeyId, region, service, payloadHash: computedPayloadHash };
    }
    if (credentials.sessionToken) {
      if (
        !signedHeaders.includes('x-amz-security-token') ||
        request.headers['x-amz-security-token'] !== credentials.sessionToken
      ) {
        return { valid: false, accessKeyId, region, service, payloadHash: computedPayloadHash };
      }
    }

    const canonicalHeaders = signedHeaders
      .map(headerName => {
        const val = request.headers[headerName];
        if (typeof val !== 'string') return null;
        return `${headerName}:${val.trim().replace(/\s+/g, ' ')}\n`;
      })
      .join('');
    if (canonicalHeaders.split('\n').length - 1 !== signedHeaders.length) {
      return { valid: false, accessKeyId, region, service, payloadHash: computedPayloadHash };
    }

    const canonicalRequest = [
      request.method.toUpperCase(),
      request.path,
      '',
      canonicalHeaders,
      signedHeadersRaw,
      computedPayloadHash
    ].join('\n');

    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      createHash('sha256').update(canonicalRequest, 'utf8').digest('hex')
    ].join('\n');

    const kDate = createHmac('sha256', `AWS4${credentials.secretAccessKey}`).update(dateStamp, 'utf8').digest();
    const kRegion = createHmac('sha256', kDate).update(region, 'utf8').digest();
    const kService = createHmac('sha256', kRegion).update(service, 'utf8').digest();
    const kSigning = createHmac('sha256', kService).update('aws4_request', 'utf8').digest();
    const expectedSignatureHex = createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

    const sigBuf = Buffer.from(signatureHex, 'hex');
    const expectedBuf = Buffer.from(expectedSignatureHex, 'hex');
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
      return { valid: false, accessKeyId, region, service, payloadHash: computedPayloadHash };
    }
  }

  return {
    valid: true,
    accessKeyId,
    region,
    service,
    payloadHash: computedPayloadHash
  };
}

function loadDefaultToolRegistry(): ToolRegistry {
  try {
    const mod = require('./tools/index.js') as Record<string, unknown>;
    if (mod && typeof mod === 'object' && mod.defaultToolRegistry && typeof mod.defaultToolRegistry === 'object') {
      return mod.defaultToolRegistry as ToolRegistry;
    }
  } catch {
    // Fallback to dynamic discovery in unbundled TS environments
  }
  for (const candidate of ['./tools/index.js', './tools/index.ts']) {
    try {
      const mod = require(candidate) as Record<string, unknown>;
      if (mod && typeof mod === 'object') {
        if (mod.defaultToolRegistry && typeof mod.defaultToolRegistry === 'object') {
          return mod.defaultToolRegistry as ToolRegistry;
        }
        if (mod.tools && typeof mod.tools === 'object') {
          return mod.tools as ToolRegistry;
        }
        if (typeof mod.createToolRegistry === 'function') {
          return (mod.createToolRegistry as () => ToolRegistry)();
        }
        const registry: Partial<Record<ToolName, ToolHandler<any>>> = {};
        const searchFn = mod.search_public_evidence ?? mod.searchPublicEvidence;
        const caseFn = mod.get_case_study ?? mod.getCaseStudy;
        const compareFn = mod.compare_job_requirements ?? mod.compareJobRequirements;
        if (typeof searchFn === 'function') {
          registry.search_public_evidence = searchFn as ToolHandler<'search_public_evidence'>;
        }
        if (typeof caseFn === 'function') {
          registry.get_case_study = caseFn as ToolHandler<'get_case_study'>;
        }
        if (typeof compareFn === 'function') {
          registry.compare_job_requirements = compareFn as ToolHandler<'compare_job_requirements'>;
        }
        if (Object.keys(registry).length > 0) return registry;
      }
    } catch {
      // Optional auto-discovery when A11 tools module is present
    }
  }
  return {};
}

export function createMcpServer(options: McpServerOptions = {}): PortfolioMcpServer {
  const now = options.now ?? Date.now;
  const requireIamContext = options.requireIamContext ?? true;
  const requireSigV4 = options.requireSigV4 ?? false;
  const toolDeadlineMs = Math.max(1, Math.min(DEFAULT_TOOL_DEADLINE_MS, options.toolDeadlineMs ?? DEFAULT_TOOL_DEADLINE_MS));
  const allowedOrigins = new Set(options.allowedOrigins ?? []);
  const explicitTools = options.tools;
  let cachedDefaultTools: ToolRegistry | undefined;

  function resolveToolHandler<N extends ToolName>(name: N): ToolHandler<N> | undefined {
    const source = explicitTools ?? (cachedDefaultTools ??= loadDefaultToolRegistry());
    if (!source || typeof source !== 'object') return undefined;
    if (!Object.hasOwn(source, name)) return undefined;
    const fn = (source as Record<string, unknown>)[name];
    return typeof fn === 'function' ? (fn as ToolHandler<N>) : undefined;
  }

  function finish(
    requestId: string,
    startedAt: number,
    statusCode: number,
    body: string,
    meta: {
      mcpMethod?: string;
      toolName?: ToolName;
      outcome: 'completed' | 'failed';
      errorCode?: McpErrorCode;
      extraHeaders?: Record<string, string>;
    }
  ): McpHttpResponse {
    const durationMs = Math.max(0, Math.round(now() - startedAt));
    const receipt: McpServerReceipt = {
      type: 'mcp_call',
      requestId,
      ...(meta.mcpMethod ? { mcpMethod: meta.mcpMethod } : {}),
      ...(meta.toolName ? { toolName: meta.toolName } : {}),
      outcome: meta.outcome,
      statusCode,
      ...(meta.errorCode ? { errorCode: meta.errorCode } : {}),
      durationMs
    };
    options.onReceipt?.(receipt);
    return {
      statusCode,
      headers: {
        ...BASE_RESPONSE_HEADERS,
        ...(meta.extraHeaders ?? {})
      },
      body,
      receipt
    };
  }

  return {
    async handleHttpRequest(request: McpHttpRequest): Promise<McpHttpResponse> {
      const startedAt = now();
      const requestId =
        typeof request.requestId === 'string' && request.requestId.length > 0 && request.requestId.length <= 128
          ? request.requestId
          : 'mcp-request';
      const { map: headers, hasDuplicateCriticalHeader } = normalizeHeaders(request.headers ?? {});

      if (!ALLOWED_PATHS.has(request.path)) {
        return finish(
          requestId,
          startedAt,
          404,
          JSON.stringify(jsonRpcError(null, -32004, 'NOT_FOUND', 'Endpoint not found.')),
          { outcome: 'failed', errorCode: 'NOT_FOUND' }
        );
      }

      if (request.method.toUpperCase() !== 'POST') {
        return finish(
          requestId,
          startedAt,
          405,
          JSON.stringify(jsonRpcError(null, -32005, 'METHOD_NOT_ALLOWED', 'Only POST is supported.')),
          { outcome: 'failed', errorCode: 'METHOD_NOT_ALLOWED', extraHeaders: { allow: 'POST' } }
        );
      }

      if (hasDuplicateCriticalHeader) {
        return finish(
          requestId,
          startedAt,
          400,
          JSON.stringify(jsonRpcError(null, -32600, 'INVALID_REQUEST', 'Duplicate security header rejected.')),
          { outcome: 'failed', errorCode: 'INVALID_REQUEST' }
        );
      }

      if (headers.origin !== undefined && !allowedOrigins.has(headers.origin)) {
        return finish(
          requestId,
          startedAt,
          403,
          JSON.stringify(jsonRpcError(null, -32001, 'UNAUTHORIZED', 'Cross-origin requests are not permitted.')),
          { outcome: 'failed', errorCode: 'UNAUTHORIZED' }
        );
      }

      if (headers['sec-fetch-site'] !== undefined && headers['sec-fetch-site'] !== 'none') {
        return finish(
          requestId,
          startedAt,
          403,
          JSON.stringify(jsonRpcError(null, -32001, 'UNAUTHORIZED', 'Browser fetch context is not permitted.')),
          { outcome: 'failed', errorCode: 'UNAUTHORIZED' }
        );
      }

      if (requireIamContext) {
        const userArn = request.iamIdentity?.userArn?.trim() ?? '';
        const caller = request.iamIdentity?.caller?.trim() ?? '';
        const accountId = request.iamIdentity?.accountId?.trim() ?? '';
        if (!userArn && !caller) {
          return finish(
            requestId,
            startedAt,
            403,
            JSON.stringify(jsonRpcError(null, -32001, 'UNAUTHORIZED', 'IAM caller authentication required.')),
            { outcome: 'failed', errorCode: 'UNAUTHORIZED' }
          );
        }
        if (options.allowedAccountId && accountId !== options.allowedAccountId) {
          return finish(
            requestId,
            startedAt,
            403,
            JSON.stringify(jsonRpcError(null, -32001, 'UNAUTHORIZED', 'IAM caller account is not authorized.')),
            { outcome: 'failed', errorCode: 'UNAUTHORIZED' }
          );
        }
        if (options.allowedCallerArnPrefix && !userArn.startsWith(options.allowedCallerArnPrefix)) {
          return finish(
            requestId,
            startedAt,
            403,
            JSON.stringify(jsonRpcError(null, -32001, 'UNAUTHORIZED', 'IAM caller role is not authorized.')),
            { outcome: 'failed', errorCode: 'UNAUTHORIZED' }
          );
        }
      }

      if (requireSigV4) {
        const verification = verifySigV4Request(
          {
            method: request.method,
            path: request.path,
            headers,
            bodyBytes: request.bodyBytes
          },
          options.sigV4Credentials
        );
        if (!verification.valid) {
          return finish(
            requestId,
            startedAt,
            403,
            JSON.stringify(jsonRpcError(null, -32001, 'UNAUTHORIZED', 'Invalid AWS SigV4 signature.')),
            { outcome: 'failed', errorCode: 'UNAUTHORIZED' }
          );
        }
      }

      const contentEncoding = headers['content-encoding']?.trim().toLowerCase();
      if (contentEncoding && contentEncoding !== 'identity') {
        return finish(
          requestId,
          startedAt,
          415,
          JSON.stringify(jsonRpcError(null, -32003, 'UNSUPPORTED_MEDIA_TYPE', 'Compressed payloads are not supported.')),
          { outcome: 'failed', errorCode: 'UNSUPPORTED_MEDIA_TYPE' }
        );
      }

      const contentType = headers['content-type']?.trim().toLowerCase() ?? '';
      if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/.test(contentType)) {
        return finish(
          requestId,
          startedAt,
          415,
          JSON.stringify(jsonRpcError(null, -32003, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json.')),
          { outcome: 'failed', errorCode: 'UNSUPPORTED_MEDIA_TYPE' }
        );
      }

      if (headers['content-length'] !== undefined) {
        const declaredLength = Number(headers['content-length']);
        if (!Number.isInteger(declaredLength) || declaredLength < 0) {
          return finish(
            requestId,
            startedAt,
            400,
            JSON.stringify(jsonRpcError(null, -32600, 'INVALID_REQUEST', 'Invalid Content-Length header.')),
            { outcome: 'failed', errorCode: 'INVALID_REQUEST' }
          );
        }
        if (declaredLength > MAX_MCP_REQUEST_BYTES) {
          return finish(
            requestId,
            startedAt,
            413,
            JSON.stringify(jsonRpcError(null, -32002, 'PAYLOAD_TOO_LARGE', 'Request body exceeds 16384 bytes.')),
            { outcome: 'failed', errorCode: 'PAYLOAD_TOO_LARGE' }
          );
        }
      }

      if (request.bodyBytes.byteLength > MAX_MCP_REQUEST_BYTES) {
        return finish(
          requestId,
          startedAt,
          413,
          JSON.stringify(jsonRpcError(null, -32002, 'PAYLOAD_TOO_LARGE', 'Request body exceeds 16384 bytes.')),
          { outcome: 'failed', errorCode: 'PAYLOAD_TOO_LARGE' }
        );
      }

      if (request.bodyBytes.byteLength === 0) {
        return finish(
          requestId,
          startedAt,
          400,
          JSON.stringify(jsonRpcError(null, -32700, 'PARSE_ERROR', 'Empty JSON-RPC request body.')),
          { outcome: 'failed', errorCode: 'PARSE_ERROR' }
        );
      }

      let parsed: unknown;
      try {
        const text = new TextDecoder('utf-8', { fatal: true }).decode(request.bodyBytes);
        parsed = JSON.parse(text);
      } catch {
        return finish(
          requestId,
          startedAt,
          400,
          JSON.stringify(jsonRpcError(null, -32700, 'PARSE_ERROR', 'Malformed JSON request body.')),
          { outcome: 'failed', errorCode: 'PARSE_ERROR' }
        );
      }

      if (Array.isArray(parsed) || !isPlainRecord(parsed)) {
        return finish(
          requestId,
          startedAt,
          400,
          JSON.stringify(jsonRpcError(null, -32600, 'INVALID_REQUEST', 'JSON-RPC batch arrays and non-objects are not allowed.')),
          { outcome: 'failed', errorCode: 'INVALID_REQUEST' }
        );
      }

      const rpcId = safeJsonRpcId(parsed.id);
      const allowedTopKeys = new Set(['jsonrpc', 'id', 'method', 'params']);
      if (
        parsed.jsonrpc !== '2.0' ||
        typeof parsed.method !== 'string' ||
        parsed.method.length === 0 ||
        parsed.method.length > 128 ||
        Object.keys(parsed).some(k => !allowedTopKeys.has(k))
      ) {
        return finish(
          requestId,
          startedAt,
          400,
          JSON.stringify(jsonRpcError(rpcId, -32600, 'INVALID_REQUEST', 'Invalid JSON-RPC 2.0 envelope.')),
          { outcome: 'failed', errorCode: 'INVALID_REQUEST' }
        );
      }

      const method = parsed.method;

      if (method === 'notifications/initialized') {
        if (parsed.params !== undefined && !isPlainRecord(parsed.params)) {
          return finish(
            requestId,
            startedAt,
            400,
            JSON.stringify(jsonRpcError(rpcId, -32600, 'INVALID_REQUEST', 'Invalid notification parameters.')),
            { mcpMethod: method, outcome: 'failed', errorCode: 'INVALID_REQUEST' }
          );
        }
        return finish(requestId, startedAt, 202, '', {
          mcpMethod: method,
          outcome: 'completed'
        });
      }

      if (rpcId === null) {
        return finish(
          requestId,
          startedAt,
          400,
          JSON.stringify(jsonRpcError(null, -32600, 'INVALID_REQUEST', 'JSON-RPC request requires a valid id.')),
          { mcpMethod: method, outcome: 'failed', errorCode: 'INVALID_REQUEST' }
        );
      }

      if (method === 'initialize') {
        if (!isPlainRecord(parsed.params)) {
          return finish(
            requestId,
            startedAt,
            200,
            JSON.stringify(jsonRpcError(rpcId, -32602, 'UNSUPPORTED_PROTOCOL_VERSION', 'Missing initialize parameters.')),
            { mcpMethod: 'initialize', outcome: 'failed', errorCode: 'UNSUPPORTED_PROTOCOL_VERSION' }
          );
        }
        const requestedProtocol = parsed.params.protocolVersion;
        if (typeof requestedProtocol !== 'string' || !SUPPORTED_PROTOCOLS.has(requestedProtocol)) {
          return finish(
            requestId,
            startedAt,
            200,
            JSON.stringify(jsonRpcError(rpcId, -32602, 'UNSUPPORTED_PROTOCOL_VERSION', 'Unsupported MCP protocol version.')),
            { mcpMethod: 'initialize', outcome: 'failed', errorCode: 'UNSUPPORTED_PROTOCOL_VERSION' }
          );
        }
        const result: McpInitializeResult = {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: {
            tools: {
              listChanged: false
            }
          },
          serverInfo: {
            name: MCP_SERVER_NAME,
            version: MCP_SERVER_VERSION
          }
        };
        const responsePayload: JsonRpcSuccessResponse<McpInitializeResult> = {
          jsonrpc: '2.0',
          id: rpcId,
          result
        };
        return finish(requestId, startedAt, 200, JSON.stringify(responsePayload), {
          mcpMethod: 'initialize',
          outcome: 'completed'
        });
      }

      if (method === 'tools/list') {
        if (parsed.params !== undefined && !isPlainRecord(parsed.params)) {
          return finish(
            requestId,
            startedAt,
            200,
            JSON.stringify(jsonRpcError(rpcId, -32602, 'INVALID_REQUEST', 'Invalid tools/list parameters.')),
            { mcpMethod: 'tools/list', outcome: 'failed', errorCode: 'INVALID_REQUEST' }
          );
        }
        const responsePayload: JsonRpcSuccessResponse<{ tools: readonly McpToolDefinition[] }> = {
          jsonrpc: '2.0',
          id: rpcId,
          result: {
            tools: PORTFOLIO_MCP_TOOLS
          }
        };
        return finish(requestId, startedAt, 200, JSON.stringify(responsePayload), {
          mcpMethod: 'tools/list',
          outcome: 'completed'
        });
      }

      if (method === 'tools/call') {
        if (!isPlainRecord(parsed.params)) {
          return finish(
            requestId,
            startedAt,
            200,
            JSON.stringify(jsonRpcError(rpcId, -32602, 'INVALID_TOOL_INPUT', 'Missing tools/call parameters.')),
            { mcpMethod: 'tools/call', outcome: 'failed', errorCode: 'INVALID_TOOL_INPUT' }
          );
        }

        const rawToolName = parsed.params.name;
        if (typeof rawToolName !== 'string' || !ALLOWED_TOOL_SET.has(rawToolName)) {
          return finish(
            requestId,
            startedAt,
            200,
            JSON.stringify(jsonRpcError(rpcId, -32602, 'UNKNOWN_TOOL', 'Tool is not in the portfolio catalogue.')),
            { mcpMethod: 'tools/call', outcome: 'failed', errorCode: 'UNKNOWN_TOOL' }
          );
        }
        const toolName = rawToolName as ToolName;

        const allowedParamKeys = new Set(['name', 'arguments', '_meta']);
        if (Object.keys(parsed.params).some(k => !allowedParamKeys.has(k))) {
          return finish(
            requestId,
            startedAt,
            200,
            JSON.stringify(jsonRpcError(rpcId, -32602, 'INVALID_TOOL_INPUT', 'Unexpected field in tools/call params.')),
            { mcpMethod: 'tools/call', toolName, outcome: 'failed', errorCode: 'INVALID_TOOL_INPUT' }
          );
        }

        const rawArgs = parsed.params.arguments ?? {};
        let validatedArgs: unknown;
        try {
          validatedArgs = contracts.assertToolInput(toolName, rawArgs);
        } catch {
          return finish(
            requestId,
            startedAt,
            200,
            JSON.stringify(jsonRpcError(rpcId, -32602, 'INVALID_TOOL_INPUT', 'Tool arguments do not match the portfolio contract.')),
            { mcpMethod: 'tools/call', toolName, outcome: 'failed', errorCode: 'INVALID_TOOL_INPUT' }
          );
        }

        const handler = resolveToolHandler(toolName);
        if (!handler) {
          return finish(
            requestId,
            startedAt,
            200,
            JSON.stringify(jsonRpcError(rpcId, -32603, 'TOOL_UNAVAILABLE', 'Portfolio tool handler is not available.', true)),
            { mcpMethod: 'tools/call', toolName, outcome: 'failed', errorCode: 'TOOL_UNAVAILABLE' }
          );
        }

        const controller = new AbortController();
        let timedOut = false;
        const timer = setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, toolDeadlineMs);
        const onOuterAbort = () => {
          timedOut = true;
          controller.abort();
        };
        if (request.signal) {
          if (request.signal.aborted) {
            clearTimeout(timer);
            return finish(
              requestId,
              startedAt,
              200,
              JSON.stringify(jsonRpcError(rpcId, -32000, 'TOOL_TIMEOUT', 'Portfolio tool execution timed out.', true)),
              { mcpMethod: 'tools/call', toolName, outcome: 'failed', errorCode: 'TOOL_TIMEOUT' }
            );
          }
          request.signal.addEventListener('abort', onOuterAbort, { once: true });
        }

        let rawOutput: unknown;
        const toolStartedAt = now();
        try {
          const context: ToolExecutionContext = Object.freeze({
            signal: controller.signal,
            requestId,
            ...(request.iamIdentity?.userArn ? { callerArn: request.iamIdentity.userArn } : {})
          });
          rawOutput = await Promise.race([
            Promise.resolve(handler(validatedArgs as never, context)),
            new Promise<never>((_resolve, reject) => {
              controller.signal.addEventListener('abort', () => reject(new Error('TOOL_ABORTED')), { once: true });
            })
          ]);
        } catch {
          if (timedOut || controller.signal.aborted || now() - toolStartedAt > toolDeadlineMs) {
            return finish(
              requestId,
              startedAt,
              200,
              JSON.stringify(jsonRpcError(rpcId, -32000, 'TOOL_TIMEOUT', 'Portfolio tool execution timed out.', true)),
              { mcpMethod: 'tools/call', toolName, outcome: 'failed', errorCode: 'TOOL_TIMEOUT' }
            );
          }
          return finish(
            requestId,
            startedAt,
            200,
            JSON.stringify(jsonRpcError(rpcId, -32603, 'TOOL_EXECUTION_FAILED', 'Portfolio tool execution failed.')),
            { mcpMethod: 'tools/call', toolName, outcome: 'failed', errorCode: 'TOOL_EXECUTION_FAILED' }
          );
        } finally {
          clearTimeout(timer);
          request.signal?.removeEventListener('abort', onOuterAbort);
        }

        if (now() - toolStartedAt > toolDeadlineMs) {
          return finish(
            requestId,
            startedAt,
            200,
            JSON.stringify(jsonRpcError(rpcId, -32000, 'TOOL_TIMEOUT', 'Portfolio tool execution timed out.', true)),
            { mcpMethod: 'tools/call', toolName, outcome: 'failed', errorCode: 'TOOL_TIMEOUT' }
          );
        }

        try {
          contracts.assertToolOutput(toolName, rawOutput);
        } catch {
          return finish(
            requestId,
            startedAt,
            200,
            JSON.stringify(
              jsonRpcError(rpcId, -32603, 'INVALID_TOOL_OUTPUT', 'Portfolio tool output failed contract validation.')
            ),
            { mcpMethod: 'tools/call', toolName, outcome: 'failed', errorCode: 'INVALID_TOOL_OUTPUT' }
          );
        }

        const serializedOutput = JSON.stringify(rawOutput);
        if (Buffer.byteLength(serializedOutput, 'utf8') > MAX_TOOL_OUTPUT_BYTES) {
          return finish(
            requestId,
            startedAt,
            200,
            JSON.stringify(
              jsonRpcError(rpcId, -32603, 'TOOL_OUTPUT_TOO_LARGE', 'Portfolio tool output exceeded 16384 bytes.')
            ),
            { mcpMethod: 'tools/call', toolName, outcome: 'failed', errorCode: 'TOOL_OUTPUT_TOO_LARGE' }
          );
        }

        const callResult: McpToolCallResult = {
          content: [{ type: 'text', text: serializedOutput }],
          structuredContent: rawOutput,
          isError: false
        };
        const responseEnvelope: JsonRpcSuccessResponse<McpToolCallResult> = {
          jsonrpc: '2.0',
          id: rpcId,
          result: callResult
        };
        const responseText = JSON.stringify(responseEnvelope);

        return finish(requestId, startedAt, 200, responseText, {
          mcpMethod: 'tools/call',
          toolName,
          outcome: 'completed'
        });
      }

      return finish(
        requestId,
        startedAt,
        200,
        JSON.stringify(jsonRpcError(rpcId, -32601, 'METHOD_NOT_FOUND', 'JSON-RPC method is not supported.')),
        { outcome: 'failed', errorCode: 'METHOD_NOT_FOUND' }
      );
    }
  };
}

export function createMcpHttpHandler(
  options: McpServerOptions = {}
): (req: IncomingMessage, res: ServerResponse) => void {
  const server = createMcpServer({
    ...options,
    requireIamContext: options.requireIamContext ?? false,
    requireSigV4: options.requireSigV4 ?? true
  });

  return (req: IncomingMessage, res: ServerResponse) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let aborted = false;

    req.on('data', (chunk: Buffer) => {
      totalBytes += chunk.byteLength;
      if (totalBytes <= MAX_MCP_REQUEST_BYTES + 1) {
        chunks.push(chunk);
      } else if (totalBytes > MAX_MCP_REQUEST_BYTES * 4) {
        aborted = true;
        req.destroy();
      }
    });

    req.on('error', () => {
      if (!res.writableEnded) {
        res.writeHead(400, BASE_RESPONSE_HEADERS);
        res.end(JSON.stringify(jsonRpcError(null, -32700, 'PARSE_ERROR', 'Request stream error.')));
      }
    });

    req.on('end', () => {
      if (aborted) return;
      const bodyBytes =
        totalBytes > MAX_MCP_REQUEST_BYTES
          ? new Uint8Array(MAX_MCP_REQUEST_BYTES + 1)
          : new Uint8Array(Buffer.concat(chunks, totalBytes));

      const rawUrl = req.url ?? '';
      const pathOnly = rawUrl.includes('?') ? rawUrl : rawUrl;

      void server
        .handleHttpRequest({
          method: req.method ?? '',
          path: pathOnly,
          headers: req.headers,
          bodyBytes
        })
        .then(result => {
          if (!res.writableEnded) {
            res.writeHead(result.statusCode, result.headers);
            res.end(result.body);
          }
        })
        .catch(() => {
          if (!res.writableEnded) {
            res.writeHead(500, BASE_RESPONSE_HEADERS);
            res.end(JSON.stringify(jsonRpcError(null, -32603, 'INTERNAL_ERROR', 'Internal MCP server error.', true)));
          }
        });
    });
  };
}
