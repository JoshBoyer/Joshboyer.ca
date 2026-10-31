import type { McpServerOptions } from './index.js';
import { createMcpServer } from './server.js';
import {
  MAX_MCP_REQUEST_BYTES,
  TOOL_NAMES,
  type McpLambdaContext,
  type McpLambdaEvent,
  type McpLambdaResult,
  type ToolRegistry
} from './types.js';

function isToolRegistry(value: ToolRegistry | McpServerOptions): value is ToolRegistry {
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every(k => (TOOL_NAMES as readonly string[]).includes(k));
}

function normalizeOptions(registryOrOptions?: ToolRegistry | McpServerOptions): McpServerOptions {
  if (!registryOrOptions) {
    return {
      requireIamContext: true,
      ...(process.env.ALLOWED_CALLER_ARN_PREFIX
        ? { allowedCallerArnPrefix: process.env.ALLOWED_CALLER_ARN_PREFIX }
        : {}),
      ...(process.env.AWS_ACCOUNT_ID ? { allowedAccountId: process.env.AWS_ACCOUNT_ID } : {})
    };
  }
  if (isToolRegistry(registryOrOptions)) {
    return {
      tools: registryOrOptions,
      requireIamContext: true,
      ...(process.env.ALLOWED_CALLER_ARN_PREFIX
        ? { allowedCallerArnPrefix: process.env.ALLOWED_CALLER_ARN_PREFIX }
        : {}),
      ...(process.env.AWS_ACCOUNT_ID ? { allowedAccountId: process.env.AWS_ACCOUNT_ID } : {})
    };
  }
  return {
    requireIamContext: registryOrOptions.requireIamContext ?? true,
    ...registryOrOptions
  };
}

function mergeEventHeaders(event: McpLambdaEvent): Record<string, string | string[] | undefined> {
  const merged: Record<string, string | string[] | undefined> = {};
  if (event.headers && typeof event.headers === 'object') {
    for (const [k, v] of Object.entries(event.headers)) {
      if (typeof v === 'string') merged[k.toLowerCase()] = v;
    }
  }
  if (event.multiValueHeaders && typeof event.multiValueHeaders === 'object') {
    for (const [k, v] of Object.entries(event.multiValueHeaders)) {
      if (Array.isArray(v) && v.length > 1) {
        merged[k.toLowerCase()] = v;
      } else if (Array.isArray(v) && v.length === 1 && typeof v[0] === 'string') {
        merged[k.toLowerCase()] ??= v[0];
      }
    }
  }
  return merged;
}

function decodeEventBody(event: McpLambdaEvent): Uint8Array {
  if (typeof event.body !== 'string' || event.body.length === 0) {
    return new Uint8Array(0);
  }
  const maxRawChars = event.isBase64Encoded ? Math.ceil(((MAX_MCP_REQUEST_BYTES + 2) * 4) / 3) + 16 : MAX_MCP_REQUEST_BYTES * 4 + 4;
  if (event.body.length > maxRawChars) {
    return new Uint8Array(MAX_MCP_REQUEST_BYTES + 1);
  }
  const buf = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

export function createMcpLambdaHandler(
  registryOrOptions?: ToolRegistry | McpServerOptions
): (
  event: McpLambdaEvent,
  context?: McpLambdaContext
) => Promise<McpLambdaResult> {
  const serverOptions = normalizeOptions(registryOrOptions);
  const server = createMcpServer(serverOptions);

  return async (
    event: McpLambdaEvent,
    context?: McpLambdaContext
  ): Promise<McpLambdaResult> => {
    const controller = new AbortController();
    const remainingMs = context?.getRemainingTimeInMillis?.();
    const deadlineMs =
      typeof remainingMs === 'number' && Number.isFinite(remainingMs)
        ? Math.max(1, Math.min(8_000, remainingMs - 500))
        : 8_000;
    const timer = setTimeout(() => controller.abort(), deadlineMs);

    try {
      const authorizerIam = (event.requestContext?.authorizer as { iam?: Record<string, unknown> } | null | undefined)?.iam;
      const identity = event.requestContext?.identity;
      const userArn =
        identity?.userArn ??
        (typeof authorizerIam?.userArn === 'string' ? authorizerIam.userArn : null);
      const caller =
        identity?.caller ??
        (typeof authorizerIam?.caller === 'string' ? authorizerIam.caller : null);
      const accountId =
        identity?.accountId ??
        event.requestContext?.accountId ??
        (typeof authorizerIam?.accountId === 'string' ? authorizerIam.accountId : null);

      const response = await server.handleHttpRequest({
        method: event.httpMethod ?? '',
        path: event.path ?? '',
        headers: mergeEventHeaders(event),
        bodyBytes: decodeEventBody(event),
        iamIdentity: {
          userArn,
          caller,
          accountId
        },
        requestId: context?.awsRequestId ?? event.requestContext?.requestId ?? 'mcp-lambda',
        signal: controller.signal
      });

      return {
        statusCode: response.statusCode,
        headers: {
          'content-type': 'application/json',
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff',
          'referrer-policy': 'no-referrer',
          ...(response.headers.allow ? { allow: response.headers.allow } : {})
        },
        body: response.body
      };
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  };
}

export const handler = createMcpLambdaHandler();
