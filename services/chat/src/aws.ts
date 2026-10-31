import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { REGION } from './config.js';
import { ServiceError } from './errors.js';
import type { Envelope } from './envelope.js';

export interface SecretReader { read(arn: string, signal: AbortSignal): Promise<string> }
export interface NonceStore { consume(table: string, envelope: Envelope, nowSeconds: number, signal: AbortSignal): Promise<void> }

export class AwsSecrets implements SecretReader {
  private cache = new Map<string, { value: string; until: number }>();
  constructor(private client = new SecretsManagerClient({ region: REGION, maxAttempts: 1 }), private now = Date.now) {}

  async read(arn: string, signal: AbortSignal): Promise<string> {
    signal.throwIfAborted();
    const cached = this.cache.get(arn);
    if (cached && cached.until > this.now()) return cached.value;
    try {
      const result = await this.client.send(new GetSecretValueCommand({ SecretId: arn, VersionStage: 'AWSCURRENT' }), { abortSignal: signal });
      const value = result.SecretString;
      if (typeof value !== 'string' || !value.length || value.length > 8192) throw new Error();
      this.cache.set(arn, { value, until: this.now() + 30_000 });
      return value;
    } catch {
      throw new ServiceError('CREDENTIAL_UNAVAILABLE', 503);
    }
  }
}

export class AwsNonces implements NonceStore {
  constructor(private client = new DynamoDBClient({ region: REGION, maxAttempts: 1 })) {}

  async consume(table: string, envelope: Envelope, nowSeconds: number, signal: AbortSignal): Promise<void> {
    try {
      await this.client.send(new PutItemCommand({
        TableName: table,
        Item: {
          pk: { S: `NONCE#${envelope.keyId}#${envelope.nonce}` },
          sk: { S: 'REPLAY' },
          expiresAt: { N: String(nowSeconds + 120) }
        },
        ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)'
      }), { abortSignal: signal });
    } catch (error) {
      if (error instanceof Error && error.name === 'ConditionalCheckFailedException') throw new ServiceError('REPLAY_REJECTED', 403);
      // An uncertain conditional write is never retried with a paid invocation.
      throw new ServiceError('REPLAY_STORE_UNAVAILABLE', 503);
    }
  }
}
