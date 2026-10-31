import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { Readable, type Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { AwsNonces, AwsSecrets, createAwsPhase4Clients, type AwsPhase4Clients, type NonceStore, type SecretReader } from './aws.js';
import { loadChatLimits, loadConfig } from './config.js';
import { prepareProbe, probeFrames } from './core.js';
import { safeError, ServiceError } from './errors.js';
import type { AwsCredentials, CredentialProvider } from './ingestion/s3-store.js';
import type { Fetch } from './provider.js';
import { failureReceipt, successReceipt } from './telemetry.js';
import { prepareChat, publicChatError } from './chat.js';
import { authenticateChat } from './private-request.js';
import { AwsChatState, type ChatStateStore } from './state.js';

declare const awslambda: {
  streamifyResponse(callback: (event: APIGatewayProxyEvent, stream: Writable, context: Context) => Promise<void>): unknown;
  HttpResponseStream: { from(stream: Writable, metadata: { statusCode: number; headers: Record<string, string> }): Writable }
};

export interface HandlerDependencies {
  secrets?: SecretReader;
  nonces?: NonceStore;
  state?: ChatStateStore;
  fetchImpl?: Fetch;
  credentials?: AwsCredentials | CredentialProvider;
  now?: () => number;
}

const headers = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' };

export function createHandler(overrides: HandlerDependencies = {}) {
  const dependencies = {
    secrets: overrides.secrets ?? new AwsSecrets(),
    nonces: overrides.nonces ?? new AwsNonces(),
    ...(overrides.fetchImpl ? { fetchImpl: overrides.fetchImpl } : {}),
    ...(overrides.now ? { now: overrides.now } : {})
  };
  let state: ChatStateStore | undefined = overrides.state;
  let cachedPhase4Key: string | undefined;
  let cachedPhase4: AwsPhase4Clients = {};

  return awslambda.streamifyResponse(async (event, rawStream, context) => {
    const controller = new AbortController();
    const isProbe = event.path === '/api/chat/_probe';
    const deadline = setTimeout(() => controller.abort(), Math.max(1, Math.min(isProbe ? 25_000 : 55_000, context.getRemainingTimeInMillis() - 2000)));
    const closed = () => controller.abort();
    rawStream.once('close', closed);
    let started = false;
    const startedAt = Date.now();
    try {
      if (isProbe && process.env.PROBE_ENABLED === 'false') throw new ServiceError('NOT_FOUND', 404);
      const config = loadConfig(process.env);
      if (!isProbe) {
        const request = await authenticateChat(event, config, dependencies, controller.signal);
        state ??= new AwsChatState({ tableName: config.stateTable, limits: loadChatLimits(process.env) });
        const phase4Key = `${config.evidenceBucket ?? ''}|${config.vectorBucket ?? ''}|${config.vectorIndex ?? ''}|${config.mcpEndpoint ?? ''}`;
        if (phase4Key !== cachedPhase4Key) {
          cachedPhase4 = createAwsPhase4Clients({
            config,
            secrets: dependencies.secrets,
            ...(overrides.fetchImpl ? { fetchImpl: overrides.fetchImpl } : {}),
            ...(overrides.credentials ? { credentials: overrides.credentials } : {}),
            ...(overrides.now ? { now: overrides.now } : {})
          });
          cachedPhase4Key = phase4Key;
        }
        const response = await prepareChat(request, config, {
          ...dependencies,
          state,
          ...(cachedPhase4.retrieval ? { retrieval: cachedPhase4.retrieval } : {}),
          ...(cachedPhase4.mcpClient ? { mcpClient: cachedPhase4.mcpClient } : {}),
          receipt(value) { console.info(JSON.stringify({ type: 'chat_usage', ...value })); }
        }, controller.signal);
        const responseHeaders: Record<string, string> = { ...headers,
          'content-type': response.events ? 'text/event-stream; charset=utf-8' : 'application/json' };
        if (response.sessionToken) responseHeaders['set-cookie'] = `__Host-jb_chat=${response.sessionToken}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=86400`;
        if (response.clearSession) responseHeaders['set-cookie'] = '__Host-jb_chat=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0';
        const stream = awslambda.HttpResponseStream.from(rawStream, { statusCode: response.statusCode, headers: responseHeaders });
        started = true;
        await pipeline(Readable.from(response.events ?? [JSON.stringify(response.body)]), stream);
        return;
      }
      const probe = await prepareProbe(event, config, dependencies, controller.signal);
      const stream = awslambda.HttpResponseStream.from(rawStream, { statusCode: 200, headers: { ...headers, 'content-type': 'text/event-stream; charset=utf-8' } });
      started = true;
      await pipeline(Readable.from(probeFrames({ provider: probe.provider, async run() {
        try {
          const result = await probe.run();
          console.info(JSON.stringify(successReceipt(context.awsRequestId, Date.now() - startedAt, result)));
          return result;
        } catch (error) {
          console.info(JSON.stringify(failureReceipt(context.awsRequestId, Date.now() - startedAt, error, true)));
          throw error;
        }
      } })), stream);
    } catch (error) {
      const failure = safeError(error, started);
      if (!started) console.info(JSON.stringify(failureReceipt(context.awsRequestId, Date.now() - startedAt, error, false)));
      if (!started && !rawStream.destroyed) {
        const publicFailure = publicChatError(error);
        const stream = awslambda.HttpResponseStream.from(rawStream, { statusCode: isProbe ? failure.status : publicFailure.statusCode, headers: { ...headers, 'content-type': 'application/json' } });
        await pipeline(Readable.from([JSON.stringify(isProbe ? { error: failure.code, chargeStatus: failure.chargeStatus } :
          { schemaVersion: '1.0.0', error: { code: publicFailure.code, retryable: publicFailure.retryable } })]), stream);
      }
    } finally {
      clearTimeout(deadline);
      controller.abort();
      rawStream.removeListener('close', closed);
    }
  });
}

export const handler = createHandler();
