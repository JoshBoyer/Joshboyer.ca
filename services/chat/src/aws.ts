import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { REGION, credential, type Config } from './config.js';
import { callEmbedding } from './chat-provider.js';
import { ServiceError } from './errors.js';
import type { Envelope } from './envelope.js';
import { S3ObjectStore, S3VectorsStore, type AwsCredentials, type CredentialProvider } from './ingestion/s3-store.js';
import type { Fetch } from './provider.js';
import { createRetrievalEngine, type RetrievalEngine } from './retrieval/index.js';
import { createPortfolioMcpClient, type PortfolioMcpClientInterface } from '../../portfolio-mcp/src/index.js';

export interface SecretReader { read(arn: string, signal: AbortSignal): Promise<string> }
export interface NonceStore { consume(table: string, envelope: Envelope, nowSeconds: number, signal: AbortSignal): Promise<void> }
export interface AwsPhase4ClientOptions {
  config: Config;
  secrets: SecretReader;
  fetchImpl?: Fetch;
  credentials?: AwsCredentials | CredentialProvider;
  now?: () => number;
  allowLoopbackForTests?: boolean;
  s3Endpoint?: string;
  vectorsEndpoint?: string;
}
export interface AwsPhase4Clients {
  retrieval?: RetrievalEngine;
  mcpClient?: PortfolioMcpClientInterface;
  s3Store?: S3ObjectStore;
  vectorsStore?: S3VectorsStore;
}

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

export function createAwsPhase4Clients(options: AwsPhase4ClientOptions): AwsPhase4Clients {
  const { config, secrets, fetchImpl, credentials, now, allowLoopbackForTests, s3Endpoint, vectorsEndpoint } = options;
  const { evidenceBucket, vectorBucket, vectorIndex, mcpEndpoint } = config;

  let s3Store: S3ObjectStore | undefined;
  let vectorsStore: S3VectorsStore | undefined;
  let retrieval: RetrievalEngine | undefined;
  if (evidenceBucket && vectorBucket && vectorIndex) {
    s3Store = new S3ObjectStore({
      region: REGION,
      ...(s3Endpoint ? { endpoint: s3Endpoint } : {}),
      ...(allowLoopbackForTests !== undefined ? { allowLoopbackForTests } : {}),
      ...(fetchImpl ? { fetchImpl } : {}),
      ...(credentials ? { credentials } : {}),
      ...(now ? { now } : {})
    });
    vectorsStore = new S3VectorsStore({
      region: REGION,
      ...(vectorsEndpoint ? { endpoint: vectorsEndpoint } : {}),
      ...(allowLoopbackForTests !== undefined ? { allowLoopbackForTests } : {}),
      ...(fetchImpl ? { fetchImpl } : {}),
      ...(credentials ? { credentials } : {}),
      ...(now ? { now } : {})
    });
    retrieval = createRetrievalEngine({
      s3Store,
      vectorsStore,
      bucketName: evidenceBucket,
      vectorBucketName: vectorBucket,
      vectorIndexName: vectorIndex,
      providerConfig: config,
      ...(fetchImpl ? { fetchImpl } : {}),
      ...(now ? { now } : {}),
      embedQueryFn: async (inputText: string, signal?: AbortSignal) => {
        const effSignal = signal ?? AbortSignal.timeout(10_000);
        const [apiKeyRaw, gatewayTokenRaw] = await Promise.all([
          secrets.read(config.providerSecretArns.openai, effSignal),
          secrets.read(config.gatewaySecretArn, effSignal)
        ]);
        return callEmbedding({
          config,
          input: inputText,
          apiKey: credential(apiKeyRaw),
          gatewayToken: credential(gatewayTokenRaw),
          signal: effSignal,
          ...(fetchImpl ? { fetchImpl } : {})
        }, fetchImpl);
      }
    });
  }

  let mcpClient: PortfolioMcpClientInterface | undefined;
  if (mcpEndpoint) {
    mcpClient = createPortfolioMcpClient({
      endpoint: mcpEndpoint,
      ...(allowLoopbackForTests !== undefined ? { allowLoopbackForTests } : {}),
      ...(fetchImpl ? { fetchImpl } : {}),
      ...(credentials ? { credentials } : {}),
      ...(now ? { now } : {})
    });
  }

  return {
    ...(retrieval ? { retrieval } : {}),
    ...(mcpClient ? { mcpClient } : {}),
    ...(s3Store ? { s3Store } : {}),
    ...(vectorsStore ? { vectorsStore } : {})
  };
}

