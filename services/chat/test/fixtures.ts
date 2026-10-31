import { createHash, createHmac } from 'node:crypto';
import { loadConfig, type Provider } from '../src/config.js';
import { canonicalEnvelope, type RequestEvent } from '../src/envelope.js';
import type { Dependencies } from '../src/core.js';

export const NOW = 1793443200;
export const KEY = Buffer.from(Array.from({ length: 32 }, (_, i) => i));
export const KEYRING = JSON.stringify({ activeKeyId: 'k1', keys: { k1: KEY.toString('base64url') } });
const arn = (name: string) => `arn:aws:secretsmanager:us-east-2:123456789012:secret:/joshboyer/chat/dev/${name}-abcdef`;
export const ENV = {
  AWS_REGION: 'us-east-2', EDGE_SECRET_ARN: arn('edge'), OPENAI_SECRET_ARN: arn('openai'),
  ANTHROPIC_SECRET_ARN: arn('anthropic'), GATEWAY_SECRET_ARN: arn('gateway'),
  STATE_TABLE_NAME: 'portfolio-chat-dev-state', GATEWAY_ACCOUNT_ID: 'a'.repeat(32), GATEWAY_ID: 'joshboyer-chat-dev'
};
export const CONFIG = loadConfig(ENV);

export function signedEvent(body = '{"provider":"openai"}', timestamp = NOW): RequestEvent {
  const nonce = '11111111-1111-4111-8111-111111111111';
  const hash = createHash('sha256').update(body).digest('hex');
  const signature = createHmac('sha256', KEY).update(canonicalEnvelope('k1', String(timestamp), nonce, hash)).digest('base64url');
  return {
    httpMethod: 'POST', path: '/api/chat/_probe', body, isBase64Encoded: false,
    headers: {
      'content-type': 'application/json', 'x-chat-key-id': 'k1', 'x-chat-timestamp': String(timestamp),
      'x-chat-nonce': nonce, 'x-chat-body-sha256': hash, 'x-chat-context': 'phase2-operator', 'x-chat-signature': signature
    }, queryStringParameters: null, multiValueQueryStringParameters: null
  };
}

export function responseBody(provider: Provider): Record<string, unknown> {
  return provider === 'openai' ? {
    id: 'resp-test', status: 'completed', output: [
      { type: 'reasoning', summary: [] },
      { type: 'message', content: [{ type: 'output_text', text: 'OK' }] }
    ], usage: { input_tokens: 10, output_tokens: 2, total_tokens: 12, input_tokens_details: { cached_tokens: 0 }, output_tokens_details: { reasoning_tokens: 0 } }
  } : {
    id: 'msg-test', stop_reason: 'end_turn', content: [{ type: 'text', text: 'OK' }],
    usage: { input_tokens: 10, output_tokens: 2, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }
  };
}

export function fixtures(): { dependencies: Dependencies; calls: { fetch: number; nonce: number }; secrets: Map<string, string> } {
  const secrets = new Map([
    [CONFIG.edgeSecretArn, KEYRING], [CONFIG.providerSecretArns.openai, 'openai-test-key-0000000000000000'],
    [CONFIG.providerSecretArns.anthropic, 'anthropic-test-key-0000000000000000'], [CONFIG.gatewaySecretArn, 'gateway-test-key-0000000000000000']
  ]);
  const calls = { fetch: 0, nonce: 0 };
  const dependencies: Dependencies = {
    now: () => NOW * 1000,
    secrets: { async read(id) { const value = secrets.get(id); if (!value) throw new Error('secret'); return value; } },
    nonces: { async consume() { calls.nonce++; } },
    fetchImpl: async (url) => {
      calls.fetch++;
      return Response.json(responseBody(String(url).includes('/openai/') ? 'openai' : 'anthropic'), { headers: { 'cf-aig-log-id': 'gateway-log-test', 'x-request-id': 'openai-request-test', 'request-id': 'anthropic-request-test' } });
    }
  };
  return { dependencies, calls, secrets };
}
