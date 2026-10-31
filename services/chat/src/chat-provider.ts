import { credential, EMBEDDING_DIMENSIONS, EMBEDDING_MODELS, type Config, type Provider } from './config.js';
import { CAG_VERSION, MAX_OUTPUT_TOKENS, MAX_PROVIDER_REQUEST_BYTES, MAX_SELECTION_BYTES, selectionSchema, SYSTEM_PREFIX } from './cag.js';
import { ServiceError, record, safeError } from './errors.js';
import { normaliseUsage, type Fetch, type Usage } from './provider.js';

export const MAX_EMBEDDING_INPUT_BYTES = 8192;
export const MAX_EMBEDDING_BATCH_SIZE = 32;
export const MAX_EMBEDDING_BATCH_BYTES = 65536;
export const MAX_EMBEDDING_QUERY_RESPONSE_BYTES = 65536;
export const MAX_EMBEDDING_BATCH_RESPONSE_BYTES = 524288;

export interface ChatProviderResult {
  provider: Provider; model: string; text: string; usage: Usage;
  providerRequestId?: string; gatewayRequestId?: string;
}

export interface EmbeddingUsage {
  status: 'known' | 'unknown';
  promptTokens: number | null;
  inputTokens: number | null;
  totalTokens: number | null;
}

export interface EmbeddingCallOptions {
  config: Config;
  input: string | readonly string[];
  apiKey?: string;
  providerKey?: string;
  gatewayToken?: string;
  gatewayKey?: string;
  signal?: AbortSignal;
  fetchImpl?: Fetch;
}

export interface EmbeddingResult {
  provider: 'openai';
  model: string;
  dimensions: number;
  embedding: number[];
  embeddings: number[][];
  usage: EmbeddingUsage;
  providerRequestId?: string;
  gatewayRequestId?: string;
}

export interface EmbeddingReceipt {
  event: 'provider_embedding';
  requestId: string;
  outcome: 'completed' | 'failed' | 'rejected';
  durationMs: number;
  provider: 'openai';
  model: string;
  dimensions: number;
  batchSize?: number;
  usage?: EmbeddingUsage;
  providerRequestId?: string;
  gatewayRequestId?: string;
  code?: string;
  chargeStatus?: 'not_started' | 'unknown';
}

function requestId(value: unknown): string | undefined {
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(value) ? value : undefined;
}

function positiveCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= 1_000_000 ? value : null;
}

export function normaliseEmbeddingUsage(value: unknown): EmbeddingUsage {
  if (!record(value)) {
    return { status: 'unknown', promptTokens: null, inputTokens: null, totalTokens: null };
  }
  const prompt = positiveCount(value.prompt_tokens ?? value.input_tokens);
  const total = positiveCount(value.total_tokens);
  const known = prompt !== null && total !== null && prompt === total;
  return {
    status: known ? 'known' : 'unknown',
    promptTokens: known ? prompt : null,
    inputTokens: known ? prompt : null,
    totalTokens: known ? total : null
  };
}

function isEmbeddingResult(value: unknown): value is EmbeddingResult {
  return record(value) && value.provider === 'openai' && typeof value.model === 'string' &&
    typeof value.dimensions === 'number' && Array.isArray(value.embeddings) && record(value.usage);
}

export function embeddingReceipt(reqId: string, durationMs: number, resultOrError: EmbeddingResult | unknown, started = true): EmbeddingReceipt {
  const safeId = /^[A-Za-z0-9-]{1,128}$/.test(reqId) ? reqId : 'unavailable';
  const duration = Math.max(0, Math.floor(Number.isFinite(durationMs) ? durationMs : 0));
  if (isEmbeddingResult(resultOrError)) {
    return {
      event: 'provider_embedding',
      requestId: safeId,
      outcome: 'completed',
      durationMs: duration,
      provider: 'openai',
      model: resultOrError.model,
      dimensions: resultOrError.dimensions,
      batchSize: resultOrError.embeddings.length,
      usage: resultOrError.usage,
      ...(resultOrError.providerRequestId ? { providerRequestId: resultOrError.providerRequestId } : {}),
      ...(resultOrError.gatewayRequestId ? { gatewayRequestId: resultOrError.gatewayRequestId } : {})
    };
  }
  const failure = safeError(resultOrError, started);
  return {
    event: 'provider_embedding',
    requestId: safeId,
    outcome: started ? 'failed' : 'rejected',
    durationMs: duration,
    provider: 'openai',
    model: EMBEDDING_MODELS.openai[0]!,
    dimensions: EMBEDDING_DIMENSIONS,
    code: failure.code,
    chargeStatus: failure.chargeStatus
  };
}

export function providerBody(provider: Provider, config: Config, userContext: string): string {
  const model = config.models[provider];
  const body = provider === 'openai' ? {
    model, instructions: SYSTEM_PREFIX, input: [{ role: 'user', content: userContext }],
    reasoning: { effort: 'none' }, max_output_tokens: MAX_OUTPUT_TOKENS, store: false, service_tier: 'default',
    text: { format: { type: 'json_schema', name: 'portfolio_selection', strict: true, schema: selectionSchema } }
  } : {
    model, system: SYSTEM_PREFIX, messages: [{ role: 'user', content: userContext }],
    thinking: { type: 'disabled' }, max_tokens: MAX_OUTPUT_TOKENS, service_tier: 'standard_only',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: selectionSchema } }
  };
  const serialized = JSON.stringify(body);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_PROVIDER_REQUEST_BYTES) throw new ServiceError('INVALID_REQUEST', 400);
  return serialized;
}

async function boundedBody(response: Response, signal: AbortSignal, max = 65536): Promise<unknown> {
  const length = response.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > max)) {
    await response.body?.cancel(); throw new ServiceError('PROVIDER_RESPONSE_INVALID', 502, 'unknown');
  }
  if (!response.body) throw new ServiceError('PROVIDER_RESPONSE_INVALID', 502, 'unknown');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  const cancel = () => { void reader.cancel().catch(() => undefined); };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    while (true) {
      signal.throwIfAborted();
      const item = await reader.read();
      if (item.done) break;
      size += item.value.byteLength;
      if (size > max) throw new ServiceError('PROVIDER_RESPONSE_INVALID', 502, 'unknown');
      chunks.push(item.value);
    }
    signal.throwIfAborted();
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))) as unknown;
  } finally {
    signal.removeEventListener('abort', cancel);
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

function validateEmbeddingInput(input: unknown): { payload: string | string[]; expectedCount: number; maxResponseBytes: number } {
  const checkItem = (value: unknown): number => {
    if (typeof value !== 'string' || value.includes('\u0000') || !value.trim()) {
      throw new ServiceError('INVALID_REQUEST', 400, 'not_started');
    }
    const bytes = Buffer.byteLength(value, 'utf8');
    if (bytes < 1 || bytes > MAX_EMBEDDING_INPUT_BYTES) {
      throw new ServiceError('INVALID_REQUEST', 400, 'not_started');
    }
    return bytes;
  };
  if (typeof input === 'string') {
    checkItem(input);
    return { payload: input, expectedCount: 1, maxResponseBytes: MAX_EMBEDDING_QUERY_RESPONSE_BYTES };
  }
  if (Array.isArray(input)) {
    if (input.length < 1 || input.length > MAX_EMBEDDING_BATCH_SIZE) {
      throw new ServiceError('INVALID_REQUEST', 400, 'not_started');
    }
    let totalBytes = 0;
    const copied: string[] = [];
    for (const item of input) {
      totalBytes += checkItem(item);
      if (totalBytes > MAX_EMBEDDING_BATCH_BYTES) {
        throw new ServiceError('INVALID_REQUEST', 400, 'not_started');
      }
      copied.push(item);
    }
    return { payload: copied, expectedCount: copied.length, maxResponseBytes: MAX_EMBEDDING_BATCH_RESPONSE_BYTES };
  }
  throw new ServiceError('INVALID_REQUEST', 400, 'not_started');
}

export async function callEmbedding(options: EmbeddingCallOptions, fetchImpl?: Fetch): Promise<EmbeddingResult> {
  if (!record(options) || !record(options.config)) throw new ServiceError('CONFIGURATION_UNAVAILABLE', 503, 'not_started');
  const { config } = options;
  const model = config.embeddingModel ?? EMBEDDING_MODELS.openai[0]!;
  if (!EMBEDDING_MODELS.openai.includes(model) ||
      !/^[a-f0-9]{32}$/.test(config.gatewayAccountId) ||
      !/^[a-z0-9][a-z0-9-]{0,63}$/.test(config.gatewayId)) {
    throw new ServiceError('CONFIGURATION_UNAVAILABLE', 503, 'not_started');
  }
  if (options.apiKey !== undefined && options.providerKey !== undefined && options.apiKey !== options.providerKey) {
    throw new ServiceError('CREDENTIAL_UNAVAILABLE', 503, 'not_started');
  }
  if (options.gatewayToken !== undefined && options.gatewayKey !== undefined && options.gatewayToken !== options.gatewayKey) {
    throw new ServiceError('CREDENTIAL_UNAVAILABLE', 503, 'not_started');
  }
  const apiKey = credential(options.apiKey ?? options.providerKey ?? '');
  const gatewayToken = credential(options.gatewayToken ?? options.gatewayKey ?? '');
  const { payload, expectedCount, maxResponseBytes } = validateEmbeddingInput(options.input);
  const signal = options.signal ?? AbortSignal.timeout(15000);
  const url = `https://gateway.ai.cloudflare.com/v1/${config.gatewayAccountId}/${config.gatewayId}/openai/embeddings`;
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    authorization: `Bearer ${apiKey}`,
    'cf-aig-authorization': `Bearer ${gatewayToken}`,
    'cf-aig-no-wholesale': 'true',
    'cf-aig-Cache-Ttl': '0',
    'cf-aig-Skip-Cache': 'true',
    'cf-aig-Collect-Log-Payload': 'false',
    'cf-aig-Max-Attempts': '1',
    'cf-aig-Request-Timeout': '15000'
  };
  const body = JSON.stringify({
    model,
    input: payload,
    dimensions: EMBEDDING_DIMENSIONS,
    encoding_format: 'float'
  });
  signal.throwIfAborted();
  try {
    const response = await (fetchImpl ?? options.fetchImpl ?? fetch)(url, {
      method: 'POST',
      headers,
      body,
      signal,
      redirect: 'error'
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new ServiceError(response.status === 429 ? 'PROVIDER_RATE_LIMITED' : 'PROVIDER_REJECTED', 502, 'unknown');
    }
    const value = await boundedBody(response, signal, maxResponseBytes);
    if (!record(value) || (value.model !== undefined && value.model !== model) ||
        !Array.isArray(value.data) || value.data.length !== expectedCount) {
      throw new ServiceError('PROVIDER_RESPONSE_INVALID', 502, 'unknown');
    }
    const ordered: Array<number[] | undefined> = Array.from({ length: expectedCount });
    for (const item of value.data) {
      if (!record(item) || typeof item.index !== 'number' || !Number.isInteger(item.index) ||
          item.index < 0 || item.index >= expectedCount || ordered[item.index] !== undefined ||
          !Array.isArray(item.embedding) || item.embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new ServiceError('PROVIDER_RESPONSE_INVALID', 502, 'unknown');
      }
      const vector: number[] = [];
      for (const component of item.embedding) {
        if (typeof component !== 'number' || !Number.isFinite(component)) {
          throw new ServiceError('PROVIDER_RESPONSE_INVALID', 502, 'unknown');
        }
        vector.push(component);
      }
      ordered[item.index] = vector;
    }
    if (ordered.some(vec => vec === undefined)) {
      throw new ServiceError('PROVIDER_RESPONSE_INVALID', 502, 'unknown');
    }
    const embeddings = ordered as number[][];
    return {
      provider: 'openai',
      model,
      dimensions: EMBEDDING_DIMENSIONS,
      embedding: embeddings[0]!,
      embeddings,
      usage: normaliseEmbeddingUsage(value.usage),
      providerRequestId: requestId(response.headers.get('x-request-id') ?? value.id),
      gatewayRequestId: requestId(response.headers.get('cf-aig-log-id') ?? response.headers.get('cf-aig-request-id'))
    };
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(signal.aborted ? 'PROVIDER_DEADLINE' : 'PROVIDER_UNAVAILABLE', 502, 'unknown');
  }
}

export async function callChatProvider(options: {
  provider: Provider; config: Config; providerKey: string; gatewayKey: string;
  userContext: string; signal: AbortSignal; fetchImpl?: Fetch;
}): Promise<ChatProviderResult> {
  const { provider, config, signal } = options;
  const providerKey = credential(options.providerKey), gatewayKey = credential(options.gatewayKey);
  const body = providerBody(provider, config, options.userContext);
  const base = `https://gateway.ai.cloudflare.com/v1/${config.gatewayAccountId}/${config.gatewayId}`;
  const url = provider === 'openai' ? `${base}/openai/responses` : `${base}/anthropic/v1/messages`;
  const headers: Record<string, string> = {
    'content-type': 'application/json', 'cf-aig-authorization': `Bearer ${gatewayKey}`,
    'cf-aig-no-wholesale': 'true', 'cf-aig-collect-log-payload': 'false', 'cf-aig-skip-cache': 'true'
  };
  if (provider === 'openai') headers.authorization = `Bearer ${providerKey}`;
  else { headers['x-api-key'] = providerKey; headers['anthropic-version'] = '2026-10-21'; }
  signal.throwIfAborted();
  try {
    const response = await (options.fetchImpl ?? fetch)(url, { method: 'POST', headers, body, signal, redirect: 'error' });
    if (!response.ok) {
      await response.body?.cancel();
      throw new ServiceError(response.status === 429 ? 'PROVIDER_RATE_LIMITED' : 'PROVIDER_REJECTED', 502, 'unknown');
    }
    const value = await boundedBody(response, signal);
    if (!record(value) || (value.model !== undefined && value.model !== config.models[provider])) throw new ServiceError('PROVIDER_RESPONSE_INVALID', 502, 'unknown');
    let text = '';
    let refused = false;
    if (provider === 'openai') {
      if (value.status !== 'completed' || !Array.isArray(value.output)) throw new ServiceError('PROVIDER_RESPONSE_INVALID', 502, 'unknown');
      for (const item of value.output) {
        if (!record(item) || item.type !== 'message' || !Array.isArray(item.content)) continue;
        for (const block of item.content) {
          if (record(block) && block.type === 'refusal') refused = true;
          if (record(block) && block.type === 'output_text' && typeof block.text === 'string') text += block.text;
        }
      }
    } else {
      if (!['end_turn', 'refusal'].includes(String(value.stop_reason)) || !Array.isArray(value.content)) throw new ServiceError('PROVIDER_RESPONSE_INVALID', 502, 'unknown');
      refused = value.stop_reason === 'refusal';
      for (const block of value.content) {
        if (record(block) && block.type === 'refusal') refused = true;
        if (record(block) && block.type === 'text' && typeof block.text === 'string') text += block.text;
      }
    }
    if (refused) {
      // A provider safety refusal ends this attempt successfully; never route
      // around it by asking the fallback provider the same harmful request.
      text = JSON.stringify({ schemaVersion: '1.0.0', corpusVersion: CAG_VERSION, kind: 'refusal',
        text: 'I can’t help with that request. I can help with a safer alternative or explain the topic at a high level.',
        suggestions: [], claimIds: [], noticeCodes: [] });
    }
    if (!text || Buffer.byteLength(text, 'utf8') > MAX_SELECTION_BYTES) throw new ServiceError('PROVIDER_RESPONSE_INVALID', 502, 'unknown');
    return {
      provider, model: config.models[provider], text, usage: normaliseUsage(provider, value.usage),
      providerRequestId: requestId(response.headers.get(provider === 'openai' ? 'x-request-id' : 'request-id') ?? value.id),
      gatewayRequestId: requestId(response.headers.get('cf-aig-log-id') ?? response.headers.get('cf-aig-request-id'))
    };
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(signal.aborted ? 'PROVIDER_DEADLINE' : 'PROVIDER_UNAVAILABLE', 502, 'unknown');
  }
}
