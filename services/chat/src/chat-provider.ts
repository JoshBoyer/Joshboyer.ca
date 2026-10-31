import { credential, type Config, type Provider } from './config.js';
import { MAX_OUTPUT_TOKENS, MAX_PROVIDER_REQUEST_BYTES, selectionSchema, SYSTEM_PREFIX } from './cag.js';
import { ServiceError, record } from './errors.js';
import { normaliseUsage, type Fetch, type Usage } from './provider.js';

export interface ChatProviderResult {
  provider: Provider; model: string; text: string; usage: Usage;
  providerRequestId?: string; gatewayRequestId?: string;
}

function requestId(value: unknown): string | undefined {
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(value) ? value : undefined;
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

async function boundedBody(response: Response, signal: AbortSignal): Promise<unknown> {
  const max = 65536;
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
    if (provider === 'openai') {
      if (value.status !== 'completed' || !Array.isArray(value.output)) throw new ServiceError('PROVIDER_RESPONSE_INVALID', 502, 'unknown');
      for (const item of value.output) {
        if (!record(item) || item.type !== 'message' || !Array.isArray(item.content)) continue;
        for (const block of item.content) {
          if (record(block) && block.type === 'refusal') throw new ServiceError('ANSWER_VALIDATION_FAILED', 502, 'unknown');
          if (record(block) && block.type === 'output_text' && typeof block.text === 'string') text += block.text;
        }
      }
    } else {
      if (value.stop_reason !== 'end_turn' || !Array.isArray(value.content)) throw new ServiceError('PROVIDER_RESPONSE_INVALID', 502, 'unknown');
      for (const block of value.content) if (record(block) && block.type === 'text' && typeof block.text === 'string') text += block.text;
    }
    if (!text || Buffer.byteLength(text, 'utf8') > 8192) throw new ServiceError('PROVIDER_RESPONSE_INVALID', 502, 'unknown');
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
