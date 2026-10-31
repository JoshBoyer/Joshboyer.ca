export const MCP_PROTOCOL_VERSION = '2025-03-26' as const;
export const SUPPORTED_MCP_PROTOCOL_VERSIONS = Object.freeze(['2025-03-26', '2024-11-05'] as const);
export type SupportedMcpProtocolVersion = (typeof SUPPORTED_MCP_PROTOCOL_VERSIONS)[number];

export const MCP_SERVER_NAME = 'joshboyer-portfolio-mcp' as const;
export const MCP_SERVER_VERSION = '1.0.0' as const;
export const MCP_CLIENT_NAME = 'joshboyer-chat-orchestrator' as const;
export const MCP_CLIENT_VERSION = '1.0.0' as const;

export const MCP_ENDPOINT_PATH = '/api/chat/_mcp' as const;
export const MCP_STAGE_ENDPOINT_PATH = '/dev/api/chat/_mcp' as const;
export const MCP_REGION = 'us-east-2' as const;
export const MCP_SERVICE = 'execute-api' as const;

export const MAX_MCP_REQUEST_BYTES = 16_384 as const;
export const MAX_TOOL_OUTPUT_BYTES = 16_384 as const;
export const MAX_MCP_RESPONSE_BYTES = 32_768 as const;
export const DEFAULT_TOOL_DEADLINE_MS = 5_000 as const;
export const MAX_CLIENT_TIMEOUT_MS = 8_000 as const;

export const TOOL_NAMES = Object.freeze([
  'search_public_evidence',
  'get_case_study',
  'compare_job_requirements'
] as const);

export type ToolName = (typeof TOOL_NAMES)[number];
export type McpMethod = 'initialize' | 'tools/list' | 'tools/call';
export type ToolOutcome = 'completed' | 'error' | 'timeout' | 'skipped';

export interface SearchPublicEvidenceInput {
  query: string;
  limit?: number;
  filters?: {
    facets: string[];
  };
}

export interface SearchPublicEvidenceMatch {
  chunkId: string;
  claimId: string;
  projectId: string;
  title: string;
  period: string;
  score: number;
  text: string;
  qualificationNotes: string[];
  sourceIds: string[];
  url: string;
}

export interface SearchPublicEvidenceOutput {
  schemaVersion: '1.0.0';
  corpusVersion: string;
  retrievalMode: 'deterministic';
  matches: SearchPublicEvidenceMatch[];
}

export interface GetCaseStudyInput {
  projectId: string;
}

export interface CaseStudySource {
  id: string;
  url: string;
  revision: string;
}

export interface GetCaseStudyOutput {
  schemaVersion: '1.0.0';
  corpusVersion: string;
  projectId: string;
  chunkId: string;
  claimId: string;
  title: string;
  period: string;
  text: string;
  decision: string;
  process: string[];
  technicalGuidance: string;
  outcome: string;
  tags: string[];
  qualificationNotes: string[];
  sources: CaseStudySource[];
}

export interface CompareJobRequirementsInput {
  jobText: string;
}

export interface JobRequirementMatch {
  requirement: string;
  status: 'supported' | 'partial' | 'unsupported';
  claimIds: string[];
  projectIds: string[];
  qualificationNotes: string[];
}

export interface CompareJobRequirementsOutput {
  schemaVersion: '1.0.0';
  corpusVersion: string;
  matches: JobRequirementMatch[];
  gaps: string[];
  qualificationSummary: string[];
  noticeCodes: string[];
}

export interface ToolInputMap {
  search_public_evidence: SearchPublicEvidenceInput;
  get_case_study: GetCaseStudyInput;
  compare_job_requirements: CompareJobRequirementsInput;
}

export interface ToolOutputMap {
  search_public_evidence: SearchPublicEvidenceOutput;
  get_case_study: GetCaseStudyOutput;
  compare_job_requirements: CompareJobRequirementsOutput;
}

export interface ToolExecutionContext {
  readonly signal: AbortSignal;
  readonly requestId?: string;
  readonly callerArn?: string;
}

export type ToolHandler<N extends ToolName = ToolName> = (
  args: ToolInputMap[N],
  context: ToolExecutionContext
) => Promise<ToolOutputMap[N]> | ToolOutputMap[N];

export type ToolRegistry = {
  readonly [K in ToolName]?: ToolHandler<K>;
};

export interface McpToolAnnotations {
  readonly title?: string;
  readonly readOnlyHint: true;
  readonly destructiveHint: false;
  readonly idempotentHint: true;
  readonly openWorldHint: false;
}

export interface McpToolDefinition {
  readonly name: ToolName;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  readonly annotations: McpToolAnnotations;
}

export type JsonRpcId = string | number | null;

export type McpErrorCode =
  | 'PARSE_ERROR'
  | 'INVALID_REQUEST'
  | 'METHOD_NOT_FOUND'
  | 'UNSUPPORTED_PROTOCOL_VERSION'
  | 'UNKNOWN_TOOL'
  | 'INVALID_TOOL_INPUT'
  | 'INVALID_TOOL_OUTPUT'
  | 'TOOL_OUTPUT_TOO_LARGE'
  | 'TOOL_TIMEOUT'
  | 'TOOL_UNAVAILABLE'
  | 'TOOL_EXECUTION_FAILED'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'METHOD_NOT_ALLOWED'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'INTERNAL_ERROR';

export interface JsonRpcErrorObject {
  readonly code: number;
  readonly message: string;
  readonly data?: {
    readonly code: McpErrorCode;
    readonly retryable: boolean;
  };
}

export interface JsonRpcSuccessResponse<T = unknown> {
  readonly jsonrpc: '2.0';
  readonly id: JsonRpcId;
  readonly result: T;
}

export interface JsonRpcErrorResponse {
  readonly jsonrpc: '2.0';
  readonly id: JsonRpcId;
  readonly error: JsonRpcErrorObject;
}

export type JsonRpcResponse<T = unknown> = JsonRpcSuccessResponse<T> | JsonRpcErrorResponse;

export interface McpInitializeResult {
  readonly protocolVersion: typeof MCP_PROTOCOL_VERSION;
  readonly capabilities: {
    readonly tools: {
      readonly listChanged: false;
    };
  };
  readonly serverInfo: {
    readonly name: typeof MCP_SERVER_NAME;
    readonly version: typeof MCP_SERVER_VERSION;
  };
}

export interface McpToolsListResult {
  readonly tools: readonly McpToolDefinition[];
}

export interface McpToolCallResult<T = unknown> {
  readonly content: ReadonlyArray<{
    readonly type: 'text';
    readonly text: string;
  }>;
  readonly structuredContent: T;
  readonly isError: false;
}

export type PublicTraceErrorCode =
  | 'unavailable'
  | 'invalid_request'
  | 'deadline_exceeded'
  | 'upstream_failure'
  | 'validation_failed';

export interface McpTraceEvent {
  readonly stage: 'mcp';
  readonly state: 'started' | 'completed' | 'failed';
  readonly mcpMethod: McpMethod;
  readonly toolName?: ToolName;
  readonly toolCallId?: string;
  readonly toolOutcome?: ToolOutcome;
  readonly durationMs?: number;
  readonly code?: PublicTraceErrorCode;
}

export interface McpCallReceipt {
  readonly mcpMethod: McpMethod;
  readonly toolName?: ToolName;
  readonly toolCallId?: string;
  readonly toolOutcome: ToolOutcome;
  readonly durationMs: number;
}

export interface McpServerReceipt {
  readonly type: 'mcp_call';
  readonly requestId: string;
  readonly mcpMethod?: string;
  readonly toolName?: ToolName;
  readonly outcome: 'completed' | 'failed';
  readonly statusCode: number;
  readonly errorCode?: McpErrorCode;
  readonly durationMs: number;
}

export interface AwsCredentials {
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly sessionToken?: string;
  readonly expiration?: Date;
}

export type CredentialProvider = () => Promise<AwsCredentials>;

export interface McpLambdaIdentity {
  readonly userArn?: string | null;
  readonly caller?: string | null;
  readonly accountId?: string | null;
  readonly [key: string]: unknown;
}

export interface McpLambdaRequestContext {
  readonly accountId?: string;
  readonly requestId?: string;
  readonly authorizer?: Record<string, unknown> | null;
  readonly identity?: McpLambdaIdentity;
  readonly [key: string]: unknown;
}

export interface McpLambdaEvent {
  readonly httpMethod?: string;
  readonly path?: string;
  readonly headers?: Record<string, string | undefined> | null;
  readonly multiValueHeaders?: Record<string, string[] | undefined> | null;
  readonly body?: string | null;
  readonly isBase64Encoded?: boolean;
  readonly requestContext?: McpLambdaRequestContext;
  readonly [key: string]: unknown;
}

export interface McpLambdaContext {
  readonly awsRequestId?: string;
  getRemainingTimeInMillis?(): number;
}

export interface McpLambdaResult {
  readonly statusCode: number;
  readonly headers?: Record<string, string>;
  readonly body: string;
  readonly isBase64Encoded?: boolean;
}
