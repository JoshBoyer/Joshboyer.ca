import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { PortfolioChatStack, REGION } from '../lib/portfolio-chat-stack';
import { buildExecutionPolicy } from '../lib/bootstrap-policy';

function fixture(t: { after: (fn: () => void) => void }, reuseApiGatewayLogRole = false) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-chat-infra-'));
  fs.writeFileSync(path.join(directory, 'handler.js'), 'exports.handler = async () => {};');
  fs.writeFileSync(path.join(directory, 'authorizer.js'), 'exports.handler = async () => {};');
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const app = new App({ context: JSON.parse(fs.readFileSync(path.resolve(__dirname, '../cdk.json'), 'utf8')).context });
  const stack = new PortfolioChatStack(app, 'Test', {
    env: { account: '111111111111', region: REGION }, serviceAssetPath: directory, reuseApiGatewayLogRole
  });
  return { stack, template: Template.fromStack(stack) };
}

test('rejects another Region, unresolved project and missing runtime artifacts', () => {
  assert.throws(() => new PortfolioChatStack(new App(), 'WrongRegion', { env: { account: '111111111111', region: 'us-east-1' } }), /us-east-2/);
  assert.throws(() => new PortfolioChatStack(new App(), 'NoProject', { env: { region: REGION } }), /project ID/);
  assert.throws(() => new PortfolioChatStack(new App(), 'NoCode', {
    env: { account: '111111111111', region: REGION }, serviceAssetPath: path.join(os.tmpdir(), 'nonexistent-portfolio-artifact')
  }), /Build the chat service/);
});

test('only POST probe is available and uses a non-cached REQUEST authorizer', t => {
  const { template } = fixture(t);
  template.resourceCountIs('AWS::ApiGateway::Method', 1);
  template.hasResourceProperties('AWS::ApiGateway::Method', {
    HttpMethod: 'POST', AuthorizationType: 'CUSTOM', AuthorizerId: Match.anyValue(),
    Integration: Match.objectLike({ Type: 'AWS_PROXY', ResponseTransferMode: 'STREAM', TimeoutInMillis: 35000 })
  });
  template.hasResourceProperties('AWS::ApiGateway::Authorizer', { Type: 'REQUEST', AuthorizerResultTtlInSeconds: 0 });
  template.hasResourceProperties('AWS::ApiGateway::RestApi', { EndpointConfiguration: { Types: ['REGIONAL'] } });
  const method = Object.values(template.findResources('AWS::ApiGateway::Method'))[0]!;
  assert.match(JSON.stringify(method.Properties.Integration.Uri), /2021-11-15/);
  assert.match(JSON.stringify(method.Properties.Integration.Uri), /response-streaming-invocations/);
  assert.doesNotMatch(JSON.stringify(template.toJSON()), /test-invoke-stage|AWS::Lambda::Url/);
});

test('both functions use supported Node24 with tight concurrency and no VPC', t => {
  const { template } = fixture(t);
  const functions = Object.values(template.findResources('AWS::Lambda::Function'));
  assert.equal(functions.length, 2);
  for (const resource of functions) {
    assert.equal(resource.Properties.Runtime, 'nodejs24.x');
    assert.equal(resource.Properties.MemorySize, 256);
    assert.equal(resource.Properties.ReservedConcurrentExecutions, 2);
    assert.equal(resource.Properties.VpcConfig, undefined);
    assert.deepEqual(resource.Properties.Architectures, ['arm64']);
  }
  const authorizer = functions.find(resource => resource.Properties.Handler === 'authorizer.handler')!;
  assert.deepEqual(Object.keys(authorizer.Properties.Environment.Variables), ['EDGE_SECRET_ARN']);
});

test('templates cannot manage secret values and runtime policies separate edge authentication from provider access', t => {
  const { template } = fixture(t);
  const secrets = template.findResources('AWS::SecretsManager::Secret');
  assert.equal(Object.keys(secrets).length, 4);
  for (const resource of Object.values(secrets)) {
    assert.equal(resource.Properties.SecretString, undefined);
    assert.equal(resource.Properties.GenerateSecretString, undefined);
    assert.equal(resource.DeletionPolicy, 'Retain');
    assert.equal(resource.UpdateReplacePolicy, 'Retain');
  }
  const policies = Object.values(template.findResources('AWS::IAM::Policy'));
  const authorizerPolicy = policies.find(resource => JSON.stringify(resource.Properties.Roles).includes('AuthorizerRole'))!;
  const authorizerSecretStatement = authorizerPolicy.Properties.PolicyDocument.Statement.find((s: { Action: string }) => s.Action === 'secretsmanager:GetSecretValue');
  const edgeId = Object.entries(secrets).find(([, resource]) => resource.Properties.Name.endsWith('/edge'))![0];
  assert.deepEqual(authorizerSecretStatement.Resource, { Ref: edgeId });
  assert.doesNotMatch(JSON.stringify(authorizerPolicy), /dynamodb|openaiSecret|anthropicSecret|gatewaySecret/);
  const handlerPolicy = policies.find(resource => JSON.stringify(resource.Properties.Roles).includes('HandlerRole'))!;
  const nonce = handlerPolicy.Properties.PolicyDocument.Statement.find((s: { Action: string }) => s.Action === 'dynamodb:PutItem');
  assert.deepEqual(nonce.Condition, { 'ForAllValues:StringLike': { 'dynamodb:LeadingKeys': ['NONCE#*'] } });
  assert.doesNotMatch(JSON.stringify(handlerPolicy), /dynamodb:(GetItem|Scan|Query|DeleteItem)|s3:/);
});

test('evidence and state are encrypted, private and retained', t => {
  const { stack, template } = fixture(t);
  assert.equal(stack.terminationProtection, true);
  template.hasResource('AWS::S3::Bucket', {
    DeletionPolicy: 'Retain', UpdateReplacePolicy: 'Retain',
    Properties: Match.objectLike({
      VersioningConfiguration: { Status: 'Enabled' },
      BucketEncryption: { ServerSideEncryptionConfiguration: [{ ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }] },
      PublicAccessBlockConfiguration: { BlockPublicAcls: true, BlockPublicPolicy: true, IgnorePublicAcls: true, RestrictPublicBuckets: true }
    })
  });
  template.hasResourceProperties('AWS::S3::BucketPolicy', { PolicyDocument: Match.objectLike({ Statement: Match.arrayWith([
    Match.objectLike({ Effect: 'Deny', Condition: { Bool: { 'aws:SecureTransport': 'false' } } })
  ]) }) });
  template.hasResource('AWS::DynamoDB::Table', { DeletionPolicy: 'Retain', Properties: Match.objectLike({
    BillingMode: 'PAY_PER_REQUEST', DeletionProtectionEnabled: true,
    TimeToLiveSpecification: { AttributeName: 'expiresAt', Enabled: true },
    SSESpecification: { SSEEnabled: true }
  }) });
});

test('logs exclude request data and stage throttles operator probes', t => {
  const { template } = fixture(t);
  const groups = Object.values(template.findResources('AWS::Logs::LogGroup'));
  assert.equal(groups.length, 3);
  for (const group of groups) assert.equal(group.Properties.RetentionInDays, 7);
  const stage = Object.values(template.findResources('AWS::ApiGateway::Stage'))[0]!;
  const logDestination = JSON.stringify(stage.Properties.AccessLogSetting.DestinationArn);
  assert.match(logDestination, /:logs:us-east-2:111111111111:log-group:/);
  assert.doesNotMatch(logDestination, /:\*|Fn::GetAtt/, 'Construct the ARN from the group name; GetAtt Arn includes the wildcard suffix.');
  const format = JSON.parse(stage.Properties.AccessLogSetting.Format);
  assert.deepEqual(Object.keys(format), ['requestId', 'status', 'responseLength', 'responseLatency']);
  template.hasResourceProperties('AWS::ApiGateway::Stage', { MethodSettings: Match.arrayWith([
    Match.objectLike({ DataTraceEnabled: false, LoggingLevel: 'OFF', ThrottlingBurstLimit: 2, ThrottlingRateLimit: 1 })
  ]) });
  template.resourceCountIs('AWS::CloudWatch::Alarm', 4);
  template.resourceCountIs('AWS::ApiGateway::Account', 1);
  template.hasResource('AWS::IAM::Role', {
    DeletionPolicy: 'Retain', UpdateReplacePolicy: 'Retain',
    Properties: Match.objectLike({ RoleName: 'joshboyer-chat-dev-apigateway-logs',
      Policies: Match.arrayWith([Match.objectLike({ PolicyName: 'ApiLogPolicy4B32349C' })]) })
  });
});

test('an existing regional API logging role can be retained without creating an account setting', t => {
  const { template } = fixture(t, true);
  template.resourceCountIs('AWS::ApiGateway::Account', 0);
  assert.doesNotMatch(JSON.stringify(template.toJSON()), /joshboyer-chat-dev-apigateway-logs/);
});

test('API account logging waits for its complete scoped policy before role validation', t => {
  const { template } = fixture(t);
  const [roleId, role] = Object.entries(template.findResources('AWS::IAM::Role'))
    .find(([, resource]) => resource.Properties.RoleName === 'joshboyer-chat-dev-apigateway-logs')!;
  const policy = role.Properties.Policies[0];
  assert.equal(policy.PolicyName, 'ApiLogPolicy4B32349C', 'Recovery must update the retained policy by its original name.');
  const actions = policy.PolicyDocument.Statement.flatMap((statement: { Action: string | string[] }) => statement.Action);
  assert.deepEqual([...actions].sort(), [
    'logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:DescribeLogGroups', 'logs:DescribeLogStreams',
    'logs:FilterLogEvents', 'logs:GetLogEvents', 'logs:PutLogEvents'
  ]);
  const account = Object.values(template.findResources('AWS::ApiGateway::Account'))[0]!;
  assert.ok(account.DependsOn.includes(roleId), 'Role validation must wait for the embedded policy update.');
  assert.equal(template.findResources('AWS::IAM::Policy').ApiLogPolicy4B32349C, undefined);
  const groupActions = policy.PolicyDocument.Statement.find((statement: { Action: string | string[] }) =>
    Array.isArray(statement.Action) && statement.Action.includes('logs:CreateLogGroup'));
  assert.notEqual(groupActions.Resource, '*');
  assert.match(JSON.stringify(groupActions.Resource), /:logs:us-east-2:111111111111:log-group:\*/);
  const describe = policy.PolicyDocument.Statement.find((statement: { Action: string }) =>
    statement.Action === 'logs:DescribeLogGroups');
  assert.equal(describe.Resource, '*');
});

test('CloudFormation execution policy scopes runtime resources and excludes administrative provisioning', () => {
  assert.throws(() => buildExecutionPolicy('wrong'), /project ID/);
  const policy = buildExecutionPolicy('111111111111');
  const encoded = JSON.stringify(policy);
  assert.doesNotMatch(encoded, /AdministratorAccess|iam:CreateUser|iam:CreatePolicy|iam:AttachRolePolicy|sts:AssumeRole/);
  assert.doesNotMatch(encoded, /us-east-1/);
  const unrestricted = policy.Statement.filter(statement => statement.Resource === '*');
  assert.equal(unrestricted.length, 1);
  assert.deepEqual(unrestricted[0]!.Action, ['logs:DescribeLogGroups', 'logs:DescribeIndexPolicies', 'logs:DescribeResourcePolicies']);
  assert.deepEqual((unrestricted[0] as { Condition?: unknown }).Condition, { StringEquals: { 'aws:RequestedRegion': REGION } });
  const pass = policy.Statement.find(statement => statement.Sid === 'PassRuntimeRoles')!;
  assert.ok('Condition' in pass);
  assert.match(encoded, /NONCE|joshboyer-chat-dev/);
});
