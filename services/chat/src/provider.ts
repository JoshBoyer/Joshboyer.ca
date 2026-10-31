import { credential, PROBE_PROMPT, type Config, type Provider } from './config.js';
import { ServiceError, record } from './errors.js';

type NumericTree = { [key: string]: number | NumericTree };
export interface Usage {
  status: 'known' | 'unknown';
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  cacheReadInputTokens: number | null;
  cacheWriteInputTokens: number | null;
  reasoningOutputTokens: number | null;
  providerDetails: NumericTree | null;
}
export interface ProbeResult {
  provider: Provider;
  model: string;
  text: string;
  finishReason: string;
  usage: Usage;
  providerRequestId?: string;
  gatewayRequestId?: string;
}
export type Fetch = typeof fetch;

function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

// Preserve numeric usage detail, including future cache lifetime buckets, without
// copying text or arbitrary response objects into operational receipts.
function numericTree(value: unknown, depth = 0): NumericTree | null {
  if (!record(value) || depth > 3 || Object.keys(value).length > 24) return null;
  const result: NumericTree = {};
  for (const [key, child] of Object.entries(value)) {
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(key)) return null;
    const number = count(child);
    if (number !== null) result[key] = number;
    else if (record(child)) {
      const nested = numericTree(child, depth + 1);
      if (nested === null) return null;
      result[key] = nested;
    } else if (child !== null) return null;
  }
  return result;
}

export function normaliseUsage(provider: Provider, value: unknown): Usage {
  const usage = record(value) ? value : {};
  const numericFields = ['input_tokens', 'output_tokens', 'total_tokens', 'input_tokens_details', 'output_tokens_details',
    'cache_read_input_tokens', 'cache_creation_input_tokens', 'cache_creation', 'server_tool_use'];
  const details = numericTree(Object.fromEntries(Object.entries(usage).filter(([key]) => numericFields.includes(key))));
  const input = count(usage.input_tokens);
  const output = count(usage.output_tokens);
  const inputDetails = record(usage.input_tokens_details) ? usage.input_tokens_details : {};
  const outputDetails = record(usage.output_tokens_details) ? usage.output_tokens_details : {};
  const read = count(provider === 'openai' ? inputDetails.cached_tokens : usage.cache_read_input_tokens);
  const write = count(provider === 'openai' ? inputDetails.cache_write_tokens : usage.cache_creation_input_tokens);
  const reasoning = count(provider === 'openai' ? outputDetails.reasoning_tokens : outputDetails.thinking_tokens);
  const optionalInvalid = [
    provider === 'openai' ? inputDetails.cached_tokens : usage.cache_read_input_tokens,
    provider === 'openai' ? inputDetails.cache_write_tokens : usage.cache_creation_input_tokens,
    provider === 'openai' ? outputDetails.reasoning_tokens : outputDetails.thinking_tokens
  ].some(item => item !== undefined && item !== null && count(item) === null);
  const allInput = input === null ? null : input + (provider === 'anthropic' ? (read ?? 0) + (write ?? 0) : 0);
  const calculated = allInput !== null && output !== null ? allInput + output : null;
  const reported = count(usage.total_tokens);
  const known = details !== null && !optionalInvalid && input !== null && output !== null &&
    calculated !== null && Number.isSafeInteger(calculated) &&
    (provider !== 'openai' || reported === calculated) &&
    (provider !== 'openai' || (read ?? 0) <= input && (write ?? 0) <= input) &&
    (reasoning ?? 0) <= output;
  return {
    status: known ? 'known' : 'unknown', inputTokens: allInput, outputTokens: output,
    totalTokens: known ? calculated : null, cacheReadInputTokens: read,
    cacheWriteInputTokens: write, reasoningOutputTokens: reasoning, providerDetails: details
  };
}

function requestId(value: unknown): string | undefined {
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(value) ? value : undefined;
}

async function boundedJson(response: Response, signal: AbortSignal): Promise<unknown> {
  const maxBytes = 64 * 1024;
  const length = response.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > maxBytes)) {
    await response.body?.cancel();
    throw new ServiceError('PROVIDER_RESPONSE_INVALID', 502, 'unknown');
  }
  if (!response.body) throw new ServiceError('PROVIDER_RESPONSE_INVALID', 502, 'unknown');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', abort, { once: true });
  try {
    while (true) {
      signal.throwIfAborted();
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > maxBytes) throw new ServiceError('PROVIDER_RESPONSE_INVALID', 502, 'unknown');
      chunks.push(part.value);
    }
    signal.throwIfAborted();
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } finally {
    signal.removeEventListener('abort', abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

function parseResult(provider: Provider, model: string, body: unknown, headers: Headers): ProbeResult {
  if (!record(body)) throw new ServiceError('PROVIDER_RESPONSE_INVALID', 502, 'unknown');
  let text = '';
  let finishReason = '';
  if (provider === 'openai') {
    if (body.status !== 'completed' || !Array.isArray(body.output)) throw new ServiceError('PROVIDER_RESPONSE_INVALID', 502, 'unknown');
    for (const item of body.output) {
      if (!record(item) || item.type !== 'message' || !Array.isArray(item.content)) continue;
      for (const block of item.content) if (record(block) && block.type === 'output_text' && typeof block.text === 'string') text += block.text;
    }
    finishReason = 'completed';
  } else {
    if (!Array.isArray(body.content) || body.stop_reason !== 'end_turn') throw new ServiceError('PROVIDER_RESPONSE_INVALID', 502, 'unknown');
    for (const block of body.content) if (record(block) && block.type === 'text' && typeof block.text === 'string') text += block.text;
    finishReason = 'end_turn';
  }
  if (text.trim() !== 'OK') throw new ServiceError('UNEXPECTED_PROBE_OUTPUT', 502, 'unknown');
  return {
    provider, model, text: 'OK', finishReason, usage: normaliseUsage(provider, body.usage),
    providerRequestId: requestId(headers.get(provider === 'openai' ? 'x-request-id' : 'request-id') ?? body.id),
    gatewayRequestId: requestId(headers.get('cf-aig-log-id') ?? headers.get('cf-aig-request-id'))
  };
}

export async function callProvider(options: {
  provider: Provider; config: Config; providerKey: string; gatewayKey: string;
  signal: AbortSignal; fetchImpl?: Fetch;
}): Promise<ProbeResult> {
  const { provider, config, signal } = options;
  const providerKey = credential(options.providerKey);
  const gatewayKey = credential(options.gatewayKey);
  const model = config.models[provider];
  const base = `https://gateway.ai.cloudflare.com/v1/${config.gatewayAccountId}/${config.gatewayId}`;
  const url = provider === 'openai' ? `${base}/openai/responses` : `${base}/anthropic/v1/messages`;
  const headers: Record<string, string> = {
    'content-type': 'application/json', 'cf-aig-authorization': `Bearer ${gatewayKey}`,
    'cf-aig-no-wholesale': 'true', 'cf-aig-collect-log-payload': 'false', 'cf-aig-skip-cache': 'true'
  };
  let body: Record<string, unknown>;
  if (provider === 'openai') {
    headers.authorization = `Bearer ${providerKey}`;
    body = { model, input: PROBE_PROMPT, reasoning: { effort: 'none' }, max_output_tokens: 32, store: false };
  } else {
    headers['x-api-key'] = providerKey;
    headers['anthropic-version'] = '2026-10-21';
    body = { model, messages: [{ role: 'user', content: PROBE_PROMPT }], thinking: { type: 'disabled' }, output_config: { effort: 'low' }, max_tokens: 32 };
  }
  signal.throwIfAborted();
  try {
    const response = await (options.fetchImpl ?? fetch)(url, { method: 'POST', headers, body: JSON.stringify(body), signal, redirect: 'error' });
    if (!response.ok) {
      await response.body?.cancel();
      throw new ServiceError(response.status === 429 ? 'PROVIDER_RATE_LIMITED' : 'PROVIDER_REJECTED', 502, 'unknown');
    }
    return parseResult(provider, model, await boundedJson(response, signal), response.headers);
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(signal.aborted ? 'PROVIDER_DEADLINE' : 'PROVIDER_UNAVAILABLE', 502, 'unknown');
  }
}
