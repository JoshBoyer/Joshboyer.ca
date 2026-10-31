import { ServiceError } from './errors.js';

export const REGION = 'us-east-2';
export const PROBE_PATH = '/api/chat/_probe';
export const PROBE_PROMPT = 'Reply with exactly OK.';
export const MODELS = Object.freeze({ openai: ['gpt-6-luna'], anthropic: ['claude-haiku-5-5'] });
export type Provider = keyof typeof MODELS;
export type Env = Record<string, string | undefined>;

export interface Config {
  edgeSecretArn: string;
  providerSecretArns: Record<Provider, string>;
  gatewaySecretArn: string;
  stateTable: string;
  gatewayAccountId: string;
  gatewayId: string;
  models: Record<Provider, string>;
}

function required(env: Env, name: string, pattern: RegExp): string {
  const value = env[name];
  if (!value || !pattern.test(value)) throw new ServiceError('CONFIGURATION_UNAVAILABLE', 503);
  return value;
}

const arn = /^arn:aws:secretsmanager:us-east-2:\d{12}:secret:[A-Za-z0-9/_+=.@-]{1,512}$/;

export function edgeConfig(env: Env): { edgeSecretArn: string } {
  if (env.AWS_REGION !== REGION) throw new ServiceError('CONFIGURATION_UNAVAILABLE', 503);
  return { edgeSecretArn: required(env, 'EDGE_SECRET_ARN', arn) };
}

export function loadConfig(env: Env): Config {
  const models = { openai: env.OPENAI_MODEL ?? MODELS.openai[0]!, anthropic: env.ANTHROPIC_MODEL ?? MODELS.anthropic[0]! };
  if (!MODELS.openai.includes(models.openai) || !MODELS.anthropic.includes(models.anthropic)) {
    throw new ServiceError('CONFIGURATION_UNAVAILABLE', 503);
  }
  return {
    ...edgeConfig(env),
    providerSecretArns: {
      openai: required(env, 'OPENAI_SECRET_ARN', arn),
      anthropic: required(env, 'ANTHROPIC_SECRET_ARN', arn)
    },
    gatewaySecretArn: required(env, 'GATEWAY_SECRET_ARN', arn),
    stateTable: required(env, 'STATE_TABLE_NAME', /^[A-Za-z0-9_.-]{3,255}$/),
    gatewayAccountId: required(env, 'GATEWAY_ACCOUNT_ID', /^[a-f0-9]{32}$/),
    gatewayId: required(env, 'GATEWAY_ID', /^[a-z0-9][a-z0-9-]{0,63}$/),
    models
  };
}

export function credential(value: string): string {
  if (!/^[A-Za-z0-9_.-]{16,2048}$/.test(value)) throw new ServiceError('CREDENTIAL_UNAVAILABLE', 503);
  return value;
}
