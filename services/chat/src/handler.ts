import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { Readable, type Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { AwsNonces, AwsSecrets } from './aws.js';
import { loadConfig } from './config.js';
import { prepareProbe, probeFrames } from './core.js';
import { safeError } from './errors.js';
import { failureReceipt, successReceipt } from './telemetry.js';

declare const awslambda: {
  streamifyResponse(callback: (event: APIGatewayProxyEvent, stream: Writable, context: Context) => Promise<void>): unknown;
  HttpResponseStream: { from(stream: Writable, metadata: { statusCode: number; headers: Record<string, string> }): Writable }
};

const dependencies = { secrets: new AwsSecrets(), nonces: new AwsNonces() };
const headers = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' };

export const handler = awslambda.streamifyResponse(async (event, rawStream, context) => {
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), Math.max(1, Math.min(25_000, context.getRemainingTimeInMillis() - 1500)));
  const closed = () => controller.abort();
  rawStream.once('close', closed);
  let started = false;
  const startedAt = Date.now();
  try {
    const config = loadConfig(process.env);
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
      const stream = awslambda.HttpResponseStream.from(rawStream, { statusCode: failure.status, headers: { ...headers, 'content-type': 'application/json' } });
      await pipeline(Readable.from([JSON.stringify({ error: failure.code, chargeStatus: failure.chargeStatus })]), stream);
    }
  } finally {
    clearTimeout(deadline);
    controller.abort();
    rawStream.removeListener('close', closed);
  }
});
