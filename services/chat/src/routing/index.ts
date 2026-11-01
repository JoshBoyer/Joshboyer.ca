import { types } from 'node:util';

const contracts = require('../../../../chat/contracts/index.cjs') as {
  TOOL_NAMES: readonly ('search_public_evidence' | 'get_case_study' | 'compare_job_requirements')[];
  PROJECT_IDS: readonly (
    | 'dell' | 'foundations' | 'headquarters' | 'inquiry' | 'workflows'
    | 'newbusiness' | 'renewals' | 'upload' | 'claims' | 'takeover'
    | 'continuity' | 'sql' | 'nexus'
  )[];
  FACETS: readonly (
    | 'insurance' | 'standards' | 'rules' | 'integrations' | 'mapping'
    | 'claims' | 'sql' | 'validation' | 'analysis' | 'guidance'
    | 'infrastructure' | 'application' | 'execution' | 'speech' | 'soap'
    | 'rest' | 'xml' | 'reconciliation' | 'pubsub' | 'automation'
  )[];
  LIMITS: { maxMessageBytes: number; maxQueryBytes: number; maxToolsPerTurn: number };
  assertToolInput(name: string, value: unknown): unknown;
  assertValid(name: string, value: unknown): unknown;
};

export type ToolName = (typeof contracts.TOOL_NAMES)[number];
export type ProjectId = (typeof contracts.PROJECT_IDS)[number];
export type Facet = (typeof contracts.FACETS)[number];
export type RoutingMode = 'cag_only' | 'rag' | 'mcp' | 'rag_and_mcp';
export type TraceRoutingMode = 'general' | 'portfolio_cag' | 'portfolio_rag' | 'portfolio_mcp';

export interface RequestedToolCall {
  name: ToolName;
  arguments: Record<string, unknown>;
  slug?: string;
  projectId?: ProjectId;
  focusAreas?: Facet[];
}

export interface RoutingTraceData {
  routingMode: TraceRoutingMode;
  needsRetrieval: boolean;
  requestedTools?: ToolName[];
}

export interface TurnRoutePlan {
  routingMode: RoutingMode;
  traceRoutingMode: TraceRoutingMode;
  needsRetrieval: boolean;
  requestedTools: RequestedToolCall[];
  requestedToolNames: ToolName[];
  traceData: RoutingTraceData;
}

export interface TurnRouteInput {
  message: string;
  history?: ReadonlyArray<{ role: string; text: string }>;
  enableRag?: boolean;
  enableMcp?: boolean;
}

export const MAX_ROUTED_TOOLS_PER_TURN = 2;

const PROJECT_MATCHERS: ReadonlyArray<{
  projectId: ProjectId;
  slug: string;
  pattern: RegExp;
  requiresSecondarySearch?: boolean;
}> = Object.freeze([
  { projectId: 'nexus', slug: 'project-nexus', pattern: /\b(?:project-nexus|nexus)\b/i },
  { projectId: 'nexus', slug: 'lowkey', pattern: /\b(?:lowkey|workshop\s*42|ws42(?:\.ca)?)\b/i, requiresSecondarySearch: true },
  { projectId: 'takeover', slug: 'guidewire-policy-takeover', pattern: /\b(?:guidewire-policy-takeover|policy-takeover|takeover|claims-history\s+loading|excel\s+vba\s+add-in)\b/i },
  { projectId: 'renewals', slug: 'guidewire-renewal-automation', pattern: /\b(?:guidewire-renewal-automation|renewal-automation|renewals|renewal\s+eligibility)\b/i },
  { projectId: 'claims', slug: 'medavie-claims-integration', pattern: /\b(?:medavie-claims-integration|claims-integration|providerregistry|claims\s+adjudication|provider\s+sync(?:hronization)?)\b/i },
  { projectId: 'continuity', slug: 'reporting-data-continuity', pattern: /\b(?:reporting-data-continuity|data-continuity|continuity|compatibility\s+extract|interim\s+sql\s+reports?)\b/i },
  { projectId: 'sql', slug: 'financial-sql-remediation', pattern: /\b(?:financial-sql-remediation|sql-remediation|financial\s+reconciliation|claims\s+sql)\b/i },
  { projectId: 'dell', slug: 'dell-enterprise-support', pattern: /\b(?:dell-enterprise-support|gloves\s+off|optiplex|latitude)\b/i },
  { projectId: 'foundations', slug: 'foundations', pattern: /\b(?:foundations|small\s+business\s+server|swing\s+migrations?|sbs\s+swing)\b/i },
  { projectId: 'headquarters', slug: 'headquarters', pattern: /\b(?:headquarters|hq\s+move|blade\s+centre|esxi)\b/i },
  { projectId: 'inquiry', slug: 'inquiry', pattern: /\b(?:broker\s+policy\s+inquiry|policy\s+inquiry|\binquiry\b)\b/i },
  { projectId: 'workflows', slug: 'workflows', pattern: /\b(?:commercial\s+quoting|csio|acord|al3|edocs|\bworkflows\b)\b/i },
  { projectId: 'newbusiness', slug: 'newbusiness', pattern: /\b(?:newbusiness|new-business|new\s+business\s+integration)\b/i },
  { projectId: 'upload', slug: 'upload', pattern: /\b(?:document\s+upload|upload\s+portal|\bupload\b)\b/i }
]);

const FACET_MATCHERS: ReadonlyArray<{ facet: Facet; pattern: RegExp }> = Object.freeze([
  { facet: 'insurance', pattern: /\b(?:insurance|p&c|policy|policies|underwriting|rating|guidewire)\b/i },
  { facet: 'standards', pattern: /\b(?:csio|acord|al3|edocs|standards?)\b/i },
  { facet: 'rules', pattern: /\b(?:rules?|eligibility|underwriting|rating)\b/i },
  { facet: 'integrations', pattern: /\b(?:integrations?|api|apis|sync(?:hronization)?|interfaces?)\b/i },
  { facet: 'mapping', pattern: /\b(?:mappings?|mapped|field\s+mapping|payloads?)\b/i },
  { facet: 'claims', pattern: /\b(?:claims?|adjudication|takeover)\b/i },
  { facet: 'sql', pattern: /\b(?:sql|queries|database|reports?|reporting)\b/i },
  { facet: 'validation', pattern: /\b(?:validation|validate|schema)\b/i },
  { facet: 'analysis', pattern: /\b(?:analyst|analysis|functional|requirements?)\b/i },
  { facet: 'guidance', pattern: /\b(?:guidance|architecture|architect|direction)\b/i },
  { facet: 'infrastructure', pattern: /\b(?:infrastructure|server|network|esxi|blade|headquarters|dell)\b/i },
  { facet: 'application', pattern: /\b(?:application|c#|\.net|vba|excel|portal|add-in)\b/i },
  { facet: 'execution', pattern: /\b(?:delivery|production|migration|rollout)\b/i },
  { facet: 'soap', pattern: /\b(?:soap)\b/i },
  { facet: 'rest', pattern: /\b(?:rest|restful)\b/i },
  { facet: 'xml', pattern: /\b(?:xml)\b/i },
  { facet: 'reconciliation', pattern: /\b(?:reconciliation|reconcile|finance|financial)\b/i },
  { facet: 'pubsub', pattern: /\b(?:pub\/?sub|kafka|event\s+table)\b/i },
  { facet: 'automation', pattern: /\b(?:automation|automate|automated|batch)\b/i }
]);

const JOB_FIT_PATTERN = /\b(?:job\s+description|jd\b|requirements?\s+fit|role\s+comparison|role\s+requirements?|hiring\s+for|candidate\s+fit|compare\s+job|good\s+fit\s+for\s+this\s+role|responsibilities\s*:|qualifications\s*:|compare\s+.*\brequirements?\b)\b/i;
const DIRECT_MCP_ONLY_PATTERN = /\b(?:direct\s+case\s+study\s+lookup|only\s+run\s+get_case_study)\b/i;
const FOLLOW_UP_ONLY_PATTERN = /^\s*(?:can\s+you\s+)?(?:expand|elaborate|tell\s+me\s+more)\s+on\s+that(?:\s+earlier\s+point|\s+previous\s+point)?[?.!\s]*$/i;
const PORTFOLIO_SIGNAL_PATTERN = /\b(?:josh(?:\s+boyer)?|boyer|portfolio|career|experience|background|resume|r[eé]sum[eé]|employers?|grenville|economical|definity|medavie|harris|dell|certifications?|certified|clearances?|architect\s+title|formal\s+architect|metrics?|automation\s+rates?|guidewire|vba|underwriting|broker|insurance|capstone|ws42(?:\.ca)?|workshop\s*42|linkedin|makerworld|apex\s+monitor|voyager\s+canoe)\b/i;

function isSafePlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || types.isProxy(value)) return false;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, desc] of Object.entries(descriptors)) {
    if (key === '__proto__' || 'get' in desc || 'set' in desc || !desc.enumerable) return false;
  }
  return true;
}

function wellFormed(text: string): string {
  const candidate = text as string & { toWellFormed?: () => string };
  if (typeof candidate.toWellFormed === 'function') return candidate.toWellFormed();
  return text.replace(/[\uD800-\uDFFF]/g, '\uFFFD');
}

function sanitizeBoundedUtf8(raw: string, maxBytes: number): string {
  // Strip NUL bytes, ASCII control chars and Unicode line/paragraph separators
  const cleaned = wellFormed(raw)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[\r\n\u2028\u2029]/g, ' ');
  const trimmed = cleaned.trim();
  if (!trimmed) return '';
  if (Buffer.byteLength(trimmed, 'utf8') <= maxBytes && trimmed.length <= maxBytes) {
    return trimmed;
  }
  let out = '';
  let bytes = 0;
  for (const ch of trimmed) {
    const charBytes = Buffer.byteLength(ch, 'utf8');
    if (bytes + charBytes > maxBytes || out.length + ch.length > maxBytes) break;
    out += ch;
    bytes += charBytes;
  }
  return out.trim();
}

function extractFacets(text: string): Facet[] {
  const matched: Facet[] = [];
  for (const item of FACET_MATCHERS) {
    if (item.pattern.test(text) && !matched.includes(item.facet)) {
      matched.push(item.facet);
      if (matched.length >= 5) break;
    }
  }
  return matched;
}

function extractProjects(text: string): Array<{ projectId: ProjectId; slug: string; requiresSecondarySearch?: boolean }> {
  const found: Array<{ projectId: ProjectId; slug: string; requiresSecondarySearch?: boolean }> = [];
  for (const matcher of PROJECT_MATCHERS) {
    if (matcher.pattern.test(text) && !found.some(item => item.projectId === matcher.projectId)) {
      found.push({
        projectId: matcher.projectId,
        slug: matcher.slug,
        ...(matcher.requiresSecondarySearch ? { requiresSecondarySearch: true } : {})
      });
    }
  }
  // Also match standalone "dell" or "claims" or "sql" when asked as a focused case/role deep dive rather than a multi-employer list
  const multiEmployerList = /\bgrenville\b.*\bmedavie\b|\bmedavie\b.*\bdell\b/i.test(text);
  if (!multiEmployerList && found.length === 0) {
    if (/\bdell\b/i.test(text) && /\b(?:support|role|work|project|case\s+study|what\s+did\s+josh)\b/i.test(text)) {
      found.push({ projectId: 'dell', slug: 'dell-enterprise-support' });
    } else if (/\bclaims\b/i.test(text) && /\b(?:medavie|project|case\s+study|integration|provider)\b/i.test(text)) {
      found.push({ projectId: 'claims', slug: 'medavie-claims-integration' });
    }
  }
  return found;
}

function cagOnlyPlan(): TurnRoutePlan {
  const traceData: RoutingTraceData = { routingMode: 'general', needsRetrieval: false };
  contracts.assertValid('traceData', { stage: 'routing', state: 'completed', elapsedMs: 0, ...traceData });
  return {
    routingMode: 'cag_only',
    traceRoutingMode: 'general',
    needsRetrieval: false,
    requestedTools: [],
    requestedToolNames: [],
    traceData
  };
}

export function toRoutingTraceData(plan: Pick<TurnRoutePlan, 'routingMode' | 'needsRetrieval' | 'requestedTools'>): RoutingTraceData {
  const requestedToolNames: ToolName[] = [];
  for (const tool of plan.requestedTools) {
    if (contracts.TOOL_NAMES.includes(tool.name) && !requestedToolNames.includes(tool.name)) {
      requestedToolNames.push(tool.name);
    }
  }
  const traceRoutingMode: TraceRoutingMode =
    requestedToolNames.length > 0 || plan.routingMode === 'mcp' || plan.routingMode === 'rag_and_mcp'
      ? 'portfolio_mcp'
      : plan.needsRetrieval || plan.routingMode === 'rag'
        ? 'portfolio_rag'
        : 'general';
  const traceData: RoutingTraceData = {
    routingMode: traceRoutingMode,
    needsRetrieval: Boolean(plan.needsRetrieval),
    ...(requestedToolNames.length > 0 ? { requestedTools: requestedToolNames.slice(0, contracts.LIMITS.maxToolsPerTurn) } : {})
  };
  contracts.assertValid('traceData', { stage: 'routing', state: 'completed', elapsedMs: 0, ...traceData });
  return traceData;
}

export function planTurnRoute(input: TurnRouteInput): TurnRoutePlan {
  try {
    if (!isSafePlainObject(input) || typeof input.message !== 'string') {
      return cagOnlyPlan();
    }
    const rawMessage = input.message;
    const boundedMessage = sanitizeBoundedUtf8(rawMessage, contracts.LIMITS.maxMessageBytes);
    if (!boundedMessage) {
      return cagOnlyPlan();
    }

    const enableRag = input.enableRag !== false;
    const enableMcp = input.enableMcp !== false;

    let historyText = '';
    if (Array.isArray(input.history) && !types.isProxy(input.history)) {
      const safeEntries: string[] = [];
      for (const entry of input.history.slice(-4)) {
        if (isSafePlainObject(entry) && typeof entry.text === 'string') {
          const cleaned = sanitizeBoundedUtf8(entry.text, 512);
          if (cleaned) safeEntries.push(cleaned);
        }
      }
      historyText = safeEntries.join(' ');
    }

    // Pure follow-up question referencing prior portfolio history -> RAG only
    if (FOLLOW_UP_ONLY_PATTERN.test(boundedMessage) && PORTFOLIO_SIGNAL_PATTERN.test(historyText)) {
      const traceData: RoutingTraceData = { routingMode: 'portfolio_rag', needsRetrieval: true };
      contracts.assertValid('traceData', { stage: 'routing', state: 'completed', elapsedMs: 0, ...traceData });
      return {
        routingMode: 'rag',
        traceRoutingMode: 'portfolio_rag',
        needsRetrieval: true,
        requestedTools: [],
        requestedToolNames: [],
        traceData
      };
    }

    const isDirectMcpLookup = !enableRag || DIRECT_MCP_ONLY_PATTERN.test(boundedMessage);
    const isJobFit = JOB_FIT_PATTERN.test(boundedMessage);
    const matchedProjects = extractProjects(boundedMessage);
    const isPortfolioQuestion = isJobFit || matchedProjects.length > 0 || PORTFOLIO_SIGNAL_PATTERN.test(boundedMessage);

    if (!isPortfolioQuestion) {
      return cagOnlyPlan();
    }

    const candidateTools: RequestedToolCall[] = [];
    const facets = extractFacets(boundedMessage);

    const pushValidatedTool = (tool: RequestedToolCall) => {
      if (!enableMcp) return;
      if (candidateTools.length >= MAX_ROUTED_TOOLS_PER_TURN) return;
      if (candidateTools.some(existing => existing.name === tool.name)) return;
      const argsCopy = { ...tool.arguments };
      contracts.assertToolInput(tool.name, argsCopy);
      candidateTools.push({
        ...tool,
        arguments: argsCopy
      });
    };

    if (isJobFit) {
      const jobText = sanitizeBoundedUtf8(rawMessage, contracts.LIMITS.maxMessageBytes) || 'Job requirements comparison';
      const focusAreas: Facet[] = facets.length > 0 ? facets : ['analysis', 'integrations', 'automation'];
      pushValidatedTool({
        name: 'compare_job_requirements',
        arguments: { jobText },
        focusAreas
      });
    }

    if (matchedProjects.length > 0) {
      const primaryProject = matchedProjects[0]!;
      pushValidatedTool({
        name: 'get_case_study',
        arguments: { projectId: primaryProject.projectId },
        projectId: primaryProject.projectId,
        slug: primaryProject.slug
      });
      if ((matchedProjects.length > 1 || primaryProject.requiresSecondarySearch) && !isDirectMcpLookup) {
        const query = sanitizeBoundedUtf8(rawMessage, contracts.LIMITS.maxQueryBytes) || primaryProject.projectId;
        pushValidatedTool({
          name: 'search_public_evidence',
          arguments: {
            query,
            limit: 4,
            ...(facets.length > 0 ? { filters: { facets } } : {})
          }
        });
      }
    }

    if (candidateTools.length === 0 && enableMcp) {
      const query = sanitizeBoundedUtf8(rawMessage, contracts.LIMITS.maxQueryBytes) || 'Josh Boyer portfolio';
      pushValidatedTool({
        name: 'search_public_evidence',
        arguments: {
          query,
          limit: 4,
          ...(facets.length > 0 ? { filters: { facets } } : {})
        }
      });
    }

    const hasTools = candidateTools.length > 0;
    const needsRetrieval = isDirectMcpLookup && hasTools ? false : true;
    const routingMode: RoutingMode = hasTools && needsRetrieval
      ? 'rag_and_mcp'
      : hasTools
        ? 'mcp'
        : needsRetrieval
          ? 'rag'
          : 'cag_only';

    const requestedToolNames = candidateTools.map(tool => tool.name);
    const traceData = toRoutingTraceData({ routingMode, needsRetrieval, requestedTools: candidateTools });

    return {
      routingMode,
      traceRoutingMode: traceData.routingMode,
      needsRetrieval,
      requestedTools: candidateTools,
      requestedToolNames,
      traceData
    };
  } catch {
    return cagOnlyPlan();
  }
}
