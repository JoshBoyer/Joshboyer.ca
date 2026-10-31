import type {
  AwsCredentials,
  CredentialProvider,
  McpCallReceipt,
  McpInitializeResult,
  McpServerReceipt,
  McpToolDefinition,
  McpTraceEvent,
  ToolInputMap,
  ToolName,
  ToolOutputMap,
  ToolRegistry
} from './types.js';

export * from './types.js';
export {
  PORTFOLIO_MCP_TOOLS,
  createMcpHttpHandler,
  createMcpServer,
  isSafeJsonValue,
  verifySigV4Request
} from './server.js';
export {
  McpClientError,
  PortfolioMcpClient,
  Sha256,
  createPortfolioMcpClient,
  validateMcpEndpoint,
  type McpClientErrorCode
} from './client.js';
export { createMcpLambdaHandler, handler } from './handler.js';
export * from './tools/index.js';

export interface McpHttpRequest {
  readonly method: string;
  readonly path: string;
  readonly headers: Record<string, string | string[] | undefined>;
  readonly bodyBytes: Uint8Array;
  readonly iamIdentity?: {
    readonly userArn?: string | null;
    readonly caller?: string | null;
    readonly accountId?: string | null;
  };
  readonly requestId?: string;
  readonly signal?: AbortSignal;
}

export interface McpHttpResponse {
  readonly statusCode: number;
  readonly headers: Record<string, string>;
  readonly body: string;
  readonly receipt: McpServerReceipt;
}

export interface McpServerOptions {
  readonly tools?: ToolRegistry;
  readonly requireIamContext?: boolean;
  readonly requireSigV4?: boolean;
  readonly sigV4Credentials?: AwsCredentials;
  readonly allowedCallerArnPrefix?: string;
  readonly allowedAccountId?: string;
  readonly allowedOrigins?: readonly string[];
  readonly toolDeadlineMs?: number;
  readonly now?: () => number;
  readonly onReceipt?: (receipt: McpServerReceipt) => void;
}

export interface PortfolioMcpServer {
  handleHttpRequest(request: McpHttpRequest): Promise<McpHttpResponse>;
}

export interface McpClientOptions {
  readonly endpoint: string;
  readonly credentials?: AwsCredentials | CredentialProvider;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
  readonly allowLoopbackForTests?: boolean;
  readonly now?: () => number;
  readonly onTrace?: (event: McpTraceEvent) => void;
  readonly onReceipt?: (receipt: McpCallReceipt) => void;
}

export interface PortfolioMcpClientInterface {
  initialize(signal?: AbortSignal): Promise<{ result: McpInitializeResult; receipt: McpCallReceipt }>;
  notifyInitialized(signal?: AbortSignal): Promise<void>;
  listTools(signal?: AbortSignal): Promise<{ tools: readonly McpToolDefinition[]; receipt: McpCallReceipt }>;
  callTool<N extends ToolName>(
    toolName: N,
    args: ToolInputMap[N],
    options?: { toolCallId?: string; signal?: AbortSignal }
  ): Promise<{ output: ToolOutputMap[N]; receipt: McpCallReceipt }>;
  connectAndVerify(signal?: AbortSignal): Promise<{
    initializeResult: McpInitializeResult;
    tools: readonly McpToolDefinition[];
    receipts: [McpCallReceipt, McpCallReceipt];
  }>;
}
