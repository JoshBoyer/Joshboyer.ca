import { INPUT_TOKEN_ALLOWANCE, MAX_OUTPUT_TOKENS } from './cag.js';
import type { Provider } from './config.js';
import type { Usage } from './provider.js';

// Verified 2026-10-31 for standard service below either model's long-context tier:
// https://developers.openai.com/api/docs/models/gpt-6-luna
// https://platform.claude.com/docs/en/models/haiku-5-5/overview
// Both models: input $0.10/M, output $0.50/M. The allowance deliberately charges
// every input token at the higher $0.20/M cache-write rate, ignoring discounts.
// This is a conservative application allowance, not an invoice calculation.
export const PRICE_VERSION = '2026-10-31-standard-conversation-v2';
export const MAX_PROVIDER_RESERVATION_MICROS = Math.ceil((INPUT_TOKEN_ALLOWANCE * 200 + MAX_OUTPUT_TOKENS * 500) / 1000);

export function reserveCosts(providers: Provider[]): Record<Provider, number> {
  return { openai: providers.includes('openai') ? MAX_PROVIDER_RESERVATION_MICROS : 0,
    anthropic: providers.includes('anthropic') ? MAX_PROVIDER_RESERVATION_MICROS : 0 };
}

export function usageAllowance(usage: Usage): number {
  if (usage.status !== 'known' || usage.inputTokens === null || usage.outputTokens === null ||
      usage.inputTokens > INPUT_TOKEN_ALLOWANCE || usage.outputTokens > MAX_OUTPUT_TOKENS ||
      !Number.isSafeInteger(usage.inputTokens) || !Number.isSafeInteger(usage.outputTokens) ||
      usage.inputTokens < 0 || usage.outputTokens < 0) return MAX_PROVIDER_RESERVATION_MICROS;
  return Math.ceil((usage.inputTokens * 200 + usage.outputTokens * 500) / 1000);
}
