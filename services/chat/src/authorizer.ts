import type { APIGatewayAuthorizerResult, APIGatewayRequestAuthorizerEvent } from 'aws-lambda';
import { AwsSecrets, type SecretReader } from './aws.js';
import { edgeConfig, type Env } from './config.js';
import { parseKeyring, verifyEnvelope } from './envelope.js';

const secrets = new AwsSecrets();

export function createAuthorizer(options: { secrets: SecretReader; env: Env; now?: () => number }) {
  return async (event: APIGatewayRequestAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
    try {
      const config = edgeConfig(options.env);
      const keyring = parseKeyring(await options.secrets.read(config.edgeSecretArn, AbortSignal.timeout(4000)));
      verifyEnvelope(event, keyring, Math.floor((options.now ?? Date.now)() / 1000));
      const suffix = `/dev/${event.httpMethod}${event.path}`;
      if (!/^arn:aws:execute-api:us-east-2:\d{12}:[a-z0-9]+\//.test(event.methodArn) || !event.methodArn.endsWith(suffix)) throw new Error();
      return {
        principalId: 'portfolio-private-chat',
        policyDocument: { Version: '2012-10-17', Statement: [{ Action: 'execute-api:Invoke', Effect: 'Allow', Resource: event.methodArn }] }
      };
    } catch {
      // API Gateway recognises this exact error string. Do not expose the reason
      // or cache a decision across envelopes (the infrastructure TTL is zero).
      throw new Error('Unauthorized');
    }
  };
}

export const handler = createAuthorizer({ secrets, env: process.env });
