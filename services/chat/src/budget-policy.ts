import { types } from 'node:util';
import { INPUT_TOKEN_ALLOWANCE, MAX_OUTPUT_TOKENS } from './cag.js';
import type { EmbeddingUsage } from './chat-provider.js';
import type { Provider } from './config.js';
import { ServiceError } from './errors.js';
import type { Usage } from './provider.js';

// Verified 2026-10-31 for standard service below either model's long-context tier:
// https://developers.openai.com/api/docs/models/gpt-6-luna
// https://platform.claude.com/docs/en/models/haiku-5-5/overview
// Both models: input $0.10/M, output $0.50/M. The allowance deliberately charges
// every input token at the higher $0.20/M cache-write rate, ignoring discounts.
// OpenAI text-embedding-3-small is charged at a conservative $0.03125/M ceiling
// (32 micro-USD per 1,000 tokens, capped at 256 micro-USD for <= 8,192 tokens).
export const PRICE_VERSION = '2026-10-31-standard-conversation-v2';
export const PHASE4_PRICE_VERSION = '2026-10-31-phase4-rag-mcp-v1';

export const GENERATION_INPUT_RATE_MICROS_PER_1K = 200;
export const GENERATION_OUTPUT_RATE_MICROS_PER_1K = 500;

export const MAX_PROVIDER_RESERVATION_MICROS = Math.ceil(
  (INPUT_TOKEN_ALLOWANCE * GENERATION_INPUT_RATE_MICROS_PER_1K +
    MAX_OUTPUT_TOKENS * GENERATION_OUTPUT_RATE_MICROS_PER_1K) /
    1000
);
export const MAX_GENERATION_RESERVATION_MICROS = MAX_PROVIDER_RESERVATION_MICROS;

export const EMBEDDING_TOKEN_ALLOWANCE = 8_192;
export const EMBEDDING_RATE_MICROS_PER_1K = 32;
export const MAX_EMBEDDING_RESERVATION_MICROS = 256;

export const MAX_OPENAI_TURN_RESERVATION_MICROS =
  MAX_EMBEDDING_RESERVATION_MICROS + MAX_GENERATION_RESERVATION_MICROS;
export const MAX_TURN_RESERVATION_MICROS =
  MAX_OPENAI_TURN_RESERVATION_MICROS + MAX_GENERATION_RESERVATION_MICROS;

export const MAX_INGESTION_CHUNKS = 64;
export const MAX_INGESTION_UTF8_BYTES = 65_536;
export const MAX_INGESTION_CALLS = 2;
export const MAX_INGESTION_BATCH_CHUNKS = 32;
export const MAX_INGESTION_RESERVATION_MICROS =
  MAX_INGESTION_CALLS * MAX_EMBEDDING_RESERVATION_MICROS;

export const MONTHLY_BUDGET_CAP_MICROS = 25_000_000;
export const PROVIDER_BUDGET_CAP_MICROS = Object.freeze({
  openai: 25_000_000,
  anthropic: 25_000_000
} as const);

const ALLOWED_PROVIDERS: ReadonlySet<Provider> = new Set<Provider>(['openai', 'anthropic']);
const ALLOWED_PRICE_VERSIONS: ReadonlySet<string> = new Set<string>([
  PRICE_VERSION,
  PHASE4_PRICE_VERSION
]);

export interface EmbeddingUsageLike {
  status: 'known' | 'unknown';
  inputTokens?: number | null;
  promptTokens?: number | null;
  totalTokens?: number | null;
}

export interface ReservationComponents {
  embeddingMicros: number;
  openaiGenerationMicros: number;
  anthropicGenerationMicros: number;
}

export interface TurnReservationOptions {
  providers?: readonly Provider[];
  needsEmbedding: boolean;
  priceVersion?: string;
}

export interface TurnReservationPlan {
  reservations: Record<Provider, number>;
  reservationComponents: ReservationComponents;
  totalReservedMicros: number;
  priceVersion: string;
}

export interface ProviderAttemptSettlementInput {
  provider: Provider;
  dispatched: boolean;
  usage?: Usage | null;
}

export interface TurnSettlementCalculationInput {
  plan: TurnReservationPlan;
  embeddingDispatched: boolean;
  embeddingUsage?: EmbeddingUsage | EmbeddingUsageLike | null;
  attempts: ReadonlyArray<ProviderAttemptSettlementInput>;
  mcpCalls?: number;
  retrievalMatched?: number;
}

export interface ChargeComponents {
  embeddingMicros: number;
  generationMicros: number;
  mcpCalls: number;
  retrievalMatched: number;
}

export interface TurnSettlementSummary {
  actualCosts: Record<Provider, number>;
  refunds: Record<Provider, number>;
  chargeComponents: ChargeComponents;
  totalReservedMicros: number;
  totalChargedMicros: number;
  totalRefundedMicros: number;
  priceVersion: string;
  settlement: {
    reservedMicros: number;
    chargedMicros: number;
    priceVersion: string;
  };
}

export interface IngestionAllowanceInput {
  chunkCount: number;
  totalUtf8Bytes: number;
  maxCalls?: number;
}

export interface IngestionBudgetEstimate {
  chunkCount: number;
  totalUtf8Bytes: number;
  estimatedTokens: number;
  requiredCalls: number;
  maxCalls: number;
  estimatedMicros: number;
  reservedMicros: number;
  maxAllowedMicros: number;
  priceVersion: string;
}

function isSafePlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || types.isProxy(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    return false;
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, desc] of Object.entries(descriptors)) {
    if (key === '__proto__' || 'get' in desc || 'set' in desc || !desc.enumerable) {
      return false;
    }
  }
  return true;
}

function validateProvidersList(providers: unknown): Provider[] {
  if (!Array.isArray(providers) || types.isProxy(providers) || providers.length < 1 || providers.length > 2) {
    throw new ServiceError('INVALID_REQUEST', 400, 'not_started');
  }
  const seen = new Set<Provider>();
  const validated: Provider[] = [];
  for (const item of providers) {
    if (typeof item !== 'string' || !ALLOWED_PROVIDERS.has(item as Provider) || seen.has(item as Provider)) {
      throw new ServiceError('INVALID_REQUEST', 400, 'not_started');
    }
    seen.add(item as Provider);
    validated.push(item as Provider);
  }
  return validated;
}

export function reserveCosts(
  providers: readonly Provider[],
  options?: { needsEmbedding?: boolean }
): Record<Provider, number> {
  if (!Array.isArray(providers) || types.isProxy(providers)) {
    throw new ServiceError('INVALID_REQUEST', 400, 'not_started');
  }
  if (options !== undefined) {
    if (
      !isSafePlainObject(options) ||
      (options.needsEmbedding !== undefined && typeof options.needsEmbedding !== 'boolean')
    ) {
      throw new ServiceError('INVALID_REQUEST', 400, 'not_started');
    }
  }
  const embeddingMicros = options?.needsEmbedding ? MAX_EMBEDDING_RESERVATION_MICROS : 0;
  return {
    openai: (providers.includes('openai') ? MAX_PROVIDER_RESERVATION_MICROS : 0) + embeddingMicros,
    anthropic: providers.includes('anthropic') ? MAX_PROVIDER_RESERVATION_MICROS : 0
  };
}

export function usageAllowance(usage: Usage | undefined | null): number {
  try {
    if (!isSafePlainObject(usage)) {
      return MAX_PROVIDER_RESERVATION_MICROS;
    }
    if (
      usage.status !== 'known' ||
      usage.inputTokens === null ||
      usage.outputTokens === null ||
      typeof usage.inputTokens !== 'number' ||
      typeof usage.outputTokens !== 'number' ||
      !Number.isSafeInteger(usage.inputTokens) ||
      !Number.isSafeInteger(usage.outputTokens) ||
      usage.inputTokens < 0 ||
      usage.outputTokens < 0 ||
      usage.inputTokens > INPUT_TOKEN_ALLOWANCE ||
      usage.outputTokens > MAX_OUTPUT_TOKENS
    ) {
      return MAX_PROVIDER_RESERVATION_MICROS;
    }
    if (
      usage.totalTokens !== undefined &&
      (usage.totalTokens === null ||
        typeof usage.totalTokens !== 'number' ||
        !Number.isSafeInteger(usage.totalTokens) ||
        usage.totalTokens !== usage.inputTokens + usage.outputTokens)
    ) {
      return MAX_PROVIDER_RESERVATION_MICROS;
    }
    return Math.min(
      MAX_PROVIDER_RESERVATION_MICROS,
      Math.ceil(
        (usage.inputTokens * GENERATION_INPUT_RATE_MICROS_PER_1K +
          usage.outputTokens * GENERATION_OUTPUT_RATE_MICROS_PER_1K) /
          1000
      )
    );
  } catch {
    return MAX_PROVIDER_RESERVATION_MICROS;
  }
}

export function embeddingUsageAllowance(
  usage: EmbeddingUsage | EmbeddingUsageLike | undefined | null,
  dispatched = true
): number {
  if (dispatched === false) {
    return 0;
  }
  if (dispatched !== true) {
    return MAX_EMBEDDING_RESERVATION_MICROS;
  }
  try {
    if (!isSafePlainObject(usage) || usage.status !== 'known') {
      return MAX_EMBEDDING_RESERVATION_MICROS;
    }
    const rawTokens = usage.inputTokens !== undefined ? usage.inputTokens : usage.promptTokens;
    if (
      rawTokens === null ||
      rawTokens === undefined ||
      typeof rawTokens !== 'number' ||
      !Number.isSafeInteger(rawTokens) ||
      rawTokens < 0 ||
      rawTokens > EMBEDDING_TOKEN_ALLOWANCE
    ) {
      return MAX_EMBEDDING_RESERVATION_MICROS;
    }
    if (
      usage.promptTokens !== undefined &&
      (usage.promptTokens === null ||
        typeof usage.promptTokens !== 'number' ||
        !Number.isSafeInteger(usage.promptTokens) ||
        usage.promptTokens !== rawTokens)
    ) {
      return MAX_EMBEDDING_RESERVATION_MICROS;
    }
    if (
      usage.totalTokens !== undefined &&
      (usage.totalTokens === null ||
        typeof usage.totalTokens !== 'number' ||
        !Number.isSafeInteger(usage.totalTokens) ||
        usage.totalTokens !== rawTokens)
    ) {
      return MAX_EMBEDDING_RESERVATION_MICROS;
    }
    return Math.min(
      MAX_EMBEDDING_RESERVATION_MICROS,
      Math.max(1, Math.ceil((rawTokens * EMBEDDING_RATE_MICROS_PER_1K) / 1000))
    );
  } catch {
    return MAX_EMBEDDING_RESERVATION_MICROS;
  }
}

export function planTurnReservation(options: TurnReservationOptions): TurnReservationPlan {
  if (!isSafePlainObject(options) || typeof options.needsEmbedding !== 'boolean') {
    throw new ServiceError('INVALID_REQUEST', 400, 'not_started');
  }
  const providers =
    options.providers === undefined
      ? (['openai', 'anthropic'] as Provider[])
      : validateProvidersList(options.providers);
  const priceVersion = options.priceVersion ?? PHASE4_PRICE_VERSION;
  if (typeof priceVersion !== 'string' || !ALLOWED_PRICE_VERSIONS.has(priceVersion)) {
    throw new ServiceError('INVALID_REQUEST', 400, 'not_started');
  }

  const embeddingMicros = options.needsEmbedding ? MAX_EMBEDDING_RESERVATION_MICROS : 0;
  const openaiGenerationMicros = providers.includes('openai') ? MAX_GENERATION_RESERVATION_MICROS : 0;
  const anthropicGenerationMicros = providers.includes('anthropic') ? MAX_GENERATION_RESERVATION_MICROS : 0;

  const reservations: Record<Provider, number> = {
    openai: embeddingMicros + openaiGenerationMicros,
    anthropic: anthropicGenerationMicros
  };
  const totalReservedMicros = reservations.openai + reservations.anthropic;
  if (totalReservedMicros <= 0 || totalReservedMicros > MAX_TURN_RESERVATION_MICROS) {
    throw new ServiceError('INVALID_REQUEST', 400, 'not_started');
  }

  return {
    reservations,
    reservationComponents: {
      embeddingMicros,
      openaiGenerationMicros,
      anthropicGenerationMicros
    },
    totalReservedMicros,
    priceVersion
  };
}

function validateTurnReservationPlan(plan: unknown): TurnReservationPlan {
  if (
    !isSafePlainObject(plan) ||
    !isSafePlainObject(plan.reservations) ||
    !isSafePlainObject(plan.reservationComponents) ||
    typeof plan.priceVersion !== 'string' ||
    !ALLOWED_PRICE_VERSIONS.has(plan.priceVersion)
  ) {
    throw new ServiceError('INVALID_REQUEST', 400);
  }
  const { embeddingMicros, openaiGenerationMicros, anthropicGenerationMicros } = plan.reservationComponents;
  const { openai, anthropic } = plan.reservations;
  const { totalReservedMicros } = plan;

  if (
    (embeddingMicros !== 0 && embeddingMicros !== MAX_EMBEDDING_RESERVATION_MICROS) ||
    (openaiGenerationMicros !== 0 && openaiGenerationMicros !== MAX_GENERATION_RESERVATION_MICROS) ||
    (anthropicGenerationMicros !== 0 && anthropicGenerationMicros !== MAX_GENERATION_RESERVATION_MICROS) ||
    typeof openai !== 'number' ||
    typeof anthropic !== 'number' ||
    typeof totalReservedMicros !== 'number' ||
    !Number.isSafeInteger(openai) ||
    !Number.isSafeInteger(anthropic) ||
    !Number.isSafeInteger(totalReservedMicros) ||
    openai !== embeddingMicros + openaiGenerationMicros ||
    anthropic !== anthropicGenerationMicros ||
    totalReservedMicros !== openai + anthropic ||
    totalReservedMicros <= 0 ||
    totalReservedMicros > MAX_TURN_RESERVATION_MICROS
  ) {
    throw new ServiceError('INVALID_REQUEST', 400);
  }

  return {
    reservations: { openai, anthropic },
    reservationComponents: {
      embeddingMicros,
      openaiGenerationMicros,
      anthropicGenerationMicros
    },
    totalReservedMicros,
    priceVersion: plan.priceVersion
  };
}

export function settleTurnCharges(input: TurnSettlementCalculationInput): TurnSettlementSummary {
  if (
    !isSafePlainObject(input) ||
    typeof input.embeddingDispatched !== 'boolean' ||
    !Array.isArray(input.attempts) ||
    types.isProxy(input.attempts) ||
    input.attempts.length > 2
  ) {
    throw new ServiceError('INVALID_REQUEST', 400);
  }
  const plan = validateTurnReservationPlan(input.plan);

  if (input.embeddingDispatched && plan.reservationComponents.embeddingMicros <= 0) {
    throw new ServiceError('INVALID_REQUEST', 400);
  }

  const mcpCalls = input.mcpCalls ?? 0;
  const retrievalMatched = input.retrievalMatched ?? 0;
  if (
    typeof mcpCalls !== 'number' ||
    !Number.isSafeInteger(mcpCalls) ||
    mcpCalls < 0 ||
    mcpCalls > 4 ||
    typeof retrievalMatched !== 'number' ||
    !Number.isSafeInteger(retrievalMatched) ||
    retrievalMatched < 0 ||
    retrievalMatched > MAX_INGESTION_CHUNKS
  ) {
    throw new ServiceError('INVALID_REQUEST', 400);
  }

  const embeddingMicros = input.embeddingDispatched
    ? Math.min(
        plan.reservationComponents.embeddingMicros,
        embeddingUsageAllowance(input.embeddingUsage, true)
      )
    : 0;

  const seenProviders = new Set<Provider>();
  const genCharged: Record<Provider, number> = { openai: 0, anthropic: 0 };

  for (const attempt of input.attempts) {
    if (
      !isSafePlainObject(attempt) ||
      typeof attempt.provider !== 'string' ||
      !ALLOWED_PROVIDERS.has(attempt.provider as Provider) ||
      typeof attempt.dispatched !== 'boolean' ||
      seenProviders.has(attempt.provider as Provider)
    ) {
      throw new ServiceError('INVALID_REQUEST', 400);
    }
    const provider = attempt.provider as Provider;
    seenProviders.add(provider);
    const maxComponent =
      provider === 'openai'
        ? plan.reservationComponents.openaiGenerationMicros
        : plan.reservationComponents.anthropicGenerationMicros;

    if (attempt.dispatched) {
      if (maxComponent <= 0) {
        throw new ServiceError('INVALID_REQUEST', 400);
      }
      genCharged[provider] = Math.min(
        maxComponent,
        usageAllowance(attempt.usage as Usage | undefined | null)
      );
    }
  }

  const actualCosts: Record<Provider, number> = {
    openai: embeddingMicros + genCharged.openai,
    anthropic: genCharged.anthropic
  };
  if (
    actualCosts.openai < 0 ||
    actualCosts.openai > plan.reservations.openai ||
    actualCosts.anthropic < 0 ||
    actualCosts.anthropic > plan.reservations.anthropic
  ) {
    throw new ServiceError('INVALID_REQUEST', 400);
  }

  const refunds: Record<Provider, number> = {
    openai: plan.reservations.openai - actualCosts.openai,
    anthropic: plan.reservations.anthropic - actualCosts.anthropic
  };
  const generationMicros = genCharged.openai + genCharged.anthropic;
  const totalChargedMicros = actualCosts.openai + actualCosts.anthropic;
  const totalRefundedMicros = refunds.openai + refunds.anthropic;

  return {
    actualCosts,
    refunds,
    chargeComponents: {
      embeddingMicros,
      generationMicros,
      mcpCalls,
      retrievalMatched
    },
    totalReservedMicros: plan.totalReservedMicros,
    totalChargedMicros,
    totalRefundedMicros,
    priceVersion: plan.priceVersion,
    settlement: {
      reservedMicros: plan.totalReservedMicros,
      chargedMicros: totalChargedMicros,
      priceVersion: plan.priceVersion
    }
  };
}

export function estimateIngestionAllowance(input: IngestionAllowanceInput): IngestionBudgetEstimate {
  if (!isSafePlainObject(input)) {
    throw new ServiceError('INVALID_REQUEST', 400, 'not_started');
  }
  const { chunkCount, totalUtf8Bytes } = input;
  if (
    typeof chunkCount !== 'number' ||
    !Number.isSafeInteger(chunkCount) ||
    chunkCount < 1 ||
    chunkCount > MAX_INGESTION_CHUNKS ||
    typeof totalUtf8Bytes !== 'number' ||
    !Number.isSafeInteger(totalUtf8Bytes) ||
    totalUtf8Bytes < 1 ||
    totalUtf8Bytes > MAX_INGESTION_UTF8_BYTES
  ) {
    throw new ServiceError('INVALID_REQUEST', 400, 'not_started');
  }

  const requiredCalls = Math.ceil(chunkCount / MAX_INGESTION_BATCH_CHUNKS);
  const maxCalls = input.maxCalls === undefined ? requiredCalls : input.maxCalls;
  if (
    typeof maxCalls !== 'number' ||
    !Number.isSafeInteger(maxCalls) ||
    maxCalls < 1 ||
    maxCalls > MAX_INGESTION_CALLS ||
    requiredCalls > maxCalls
  ) {
    throw new ServiceError('INVALID_REQUEST', 400, 'not_started');
  }

  const estimatedTokens = Math.min(
    maxCalls * EMBEDDING_TOKEN_ALLOWANCE,
    totalUtf8Bytes
  );
  const reservedMicros = maxCalls * MAX_EMBEDDING_RESERVATION_MICROS;
  const estimatedMicros = Math.min(
    reservedMicros,
    Math.max(
      requiredCalls,
      Math.ceil((estimatedTokens * EMBEDDING_RATE_MICROS_PER_1K) / 1000)
    )
  );

  return {
    chunkCount,
    totalUtf8Bytes,
    estimatedTokens,
    requiredCalls,
    maxCalls,
    estimatedMicros,
    reservedMicros,
    maxAllowedMicros: MAX_INGESTION_RESERVATION_MICROS,
    priceVersion: PHASE4_PRICE_VERSION
  };
}
