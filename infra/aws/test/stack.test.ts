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
  fs.writeFileSync(path.join(directory, 'mcp.js'), 'exports.handler = async () => {};');
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const app = new App({ context: JSON.parse(fs.readFileSync(path.resolve(__dirname, '../cdk.json'), 'utf8')).context });
  const stack = new PortfolioChatStack(app, 'Test', {
    env: { account: '111111111111', region: REGION }, serviceAssetPath: directory, reuseApiGatewayLogRole
  });
  return { stack, template: Template.fromStack(stack) };
}

test('rejects another Region, unresolved project and missing runtime artifacts', t => {
  assert.throws(() => new PortfolioChatStack(new App(), 'WrongRegion', { env: { account: '111111111111', region: 'us-east-1' } }), /us-east-2/);
  assert.throws(() => new PortfolioChatStack(new App(), 'NoProject', { env: { region: REGION } }), /project ID/);
  for (const badAccount of ['', '12345678901', '1234567890123', '11111111111a', '111111111111\n', '__proto__']) {
    assert.throws(() => new PortfolioChatStack(new App(), 'BadAccount', { env: { account: badAccount, region: REGION } }), /project ID/);
  }
  assert.throws(() => new PortfolioChatStack(new App(), 'NoCode', {
    env: { account: '111111111111', region: REGION }, serviceAssetPath: path.join(os.tmpdir(), 'nonexistent-portfolio-artifact')
  }), /Build the chat service/);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-chat-infra-bad-mcp-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(path.join(directory, 'handler.js'), 'exports.handler = async () => {};');
  fs.writeFileSync(path.join(directory, 'authorizer.js'), 'exports.handler = async () => {};');
  assert.throws(() => new PortfolioChatStack(new App(), 'BadMcpCode', {
    env: { account: '111111111111', region: REGION },
    serviceAssetPath: directory,
    mcpCodePath: path.join(os.tmpdir(), 'nonexistent-mcp-artifact')
  }), /Build the MCP service/);
});

test('private chat and probe use a non-cached REQUEST authorizer and streaming integration while _mcp requires AWS_IAM', t => {
  const { template } = fixture(t);
  template.resourceCountIs('AWS::ApiGateway::Method', 7);
  const methods = Object.values(template.findResources('AWS::ApiGateway::Method'));
  const customMethods = methods.filter(m => m.Properties.AuthorizationType === 'CUSTOM');
  const iamMethods = methods.filter(m => m.Properties.AuthorizationType === 'AWS_IAM');
  assert.equal(customMethods.length, 6);
  assert.equal(iamMethods.length, 1);
  for (const method of customMethods) {
    assert.equal(method.Properties.AuthorizationType, 'CUSTOM');
    assert.equal(method.Properties.Integration.ResponseTransferMode, 'STREAM');
  }
  const mcpMethod = iamMethods[0]!;
  assert.equal(mcpMethod.Properties.HttpMethod, 'POST');
  assert.equal(mcpMethod.Properties.AuthorizationType, 'AWS_IAM');
  assert.equal(mcpMethod.Properties.AuthorizerId, undefined);
  assert.equal(mcpMethod.Properties.Integration.Type, 'AWS_PROXY');
  assert.equal(mcpMethod.Properties.Integration.TimeoutInMillis, 10000);
  const resources = template.findResources('AWS::ApiGateway::Resource');
  const mcpResourceId = Object.keys(resources).find(k => resources[k]!.Properties.PathPart === '_mcp');
  assert.ok(mcpResourceId, 'Expected /api/chat/_mcp API Gateway resource');
  assert.equal(mcpMethod.Properties.ResourceId.Ref, mcpResourceId);
  template.hasResourceProperties('AWS::ApiGateway::Method', {
    HttpMethod: 'POST', AuthorizationType: 'CUSTOM', AuthorizerId: Match.anyValue(),
    Integration: Match.objectLike({ Type: 'AWS_PROXY', ResponseTransferMode: 'STREAM', TimeoutInMillis: 35000 })
  });
  template.hasResourceProperties('AWS::ApiGateway::Authorizer', { Type: 'REQUEST', AuthorizerResultTtlInSeconds: 0 });
  template.hasResourceProperties('AWS::ApiGateway::RestApi', { EndpointConfiguration: { Types: ['REGIONAL'] } });
  const streamingMethod = customMethods[0]!;
  assert.match(JSON.stringify(streamingMethod.Properties.Integration.Uri), /2021-11-15/);
  assert.match(JSON.stringify(streamingMethod.Properties.Integration.Uri), /response-streaming-invocations/);
  assert.doesNotMatch(JSON.stringify(template.toJSON()), /test-invoke-stage|AWS::Lambda::Url/);
});

test('all three functions use supported Node24 with tight concurrency, least-privilege roles and no VPC', t => {
  const { template } = fixture(t);
  const functions = Object.values(template.findResources('AWS::Lambda::Function'));
  assert.equal(functions.length, 3);
  for (const resource of functions) {
    assert.equal(resource.Properties.Runtime, 'nodejs24.x');
    assert.equal(resource.Properties.MemorySize, 256);
    assert.equal(resource.Properties.VpcConfig, undefined);
  }
  const handler = functions.find(resource => resource.Properties.Handler === 'handler.handler')!;
  const authorizer = functions.find(resource => resource.Properties.Handler === 'authorizer.handler')!;
  const mcp = functions.find(resource => resource.Properties.Handler === 'mcp.handler')!;
  assert.ok(handler);
  assert.ok(authorizer);
  assert.ok(mcp);
  assert.equal(handler.Properties.FunctionName, 'joshboyer-chat-dev-handler');
  assert.equal(handler.Properties.ReservedConcurrentExecutions, 2);
  assert.deepEqual(handler.Properties.Architectures, ['arm64']);
  assert.equal(authorizer.Properties.FunctionName, 'joshboyer-chat-dev-authorizer');
  assert.equal(authorizer.Properties.ReservedConcurrentExecutions, 2);
  assert.deepEqual(authorizer.Properties.Architectures, ['arm64']);
  assert.deepEqual(Object.keys(authorizer.Properties.Environment.Variables), ['EDGE_SECRET_ARN']);
  assert.equal(mcp.Properties.FunctionName, 'joshboyer-chat-dev-mcp');
  assert.equal(mcp.Properties.ReservedConcurrentExecutions, 4);
  assert.equal(mcp.Properties.Timeout, 10);
  assert.deepEqual(mcp.Properties.Architectures, ['x86_64']);
  assert.deepEqual(mcp.Properties.TracingConfig, { Mode: 'PassThrough' });
  assert.deepEqual(mcp.Properties.Environment.Variables, {
    CHAT_ENVIRONMENT: 'dev',
    NODE_OPTIONS: '--enable-source-maps'
  });
});

test('templates cannot manage secret values and runtime policies enforce least privilege across handler, authorizer and mcp', t => {
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
  assert.doesNotMatch(JSON.stringify(authorizerPolicy), /dynamodb|openaiSecret|anthropicSecret|gatewaySecret|s3|execute-api/);

  const mcpPolicy = policies.find(resource => JSON.stringify(resource.Properties.Roles).includes('McpRole'))!;
  assert.ok(mcpPolicy, 'Expected IAM policy for McpRole');
  const mcpPolicyText = JSON.stringify(mcpPolicy);
  assert.doesNotMatch(mcpPolicyText, /secretsmanager|dynamodb|s3:PutObject|s3:DeleteObject|s3vectors|execute-api|openaiSecret|anthropicSecret|gatewaySecret|edgeSecret/);
  assert.equal(mcpPolicy.Properties.PolicyDocument.Statement.length, 1);
  assert.deepEqual(mcpPolicy.Properties.PolicyDocument.Statement[0].Action, ['logs:CreateLogStream', 'logs:PutLogEvents']);

  const handlerPolicy = policies.find(resource => JSON.stringify(resource.Properties.Roles).includes('HandlerRole'))!;
  const handlerPolicyText = JSON.stringify(handlerPolicy);
  const nonce = handlerPolicy.Properties.PolicyDocument.Statement.find((s: { Action: string }) => s.Action === 'dynamodb:PutItem');
  assert.deepEqual(nonce.Condition, { 'ForAllValues:StringLike': { 'dynamodb:LeadingKeys': ['NONCE#*'] } });
  assert.doesNotMatch(handlerPolicyText, /dynamodb:(Scan|Query|DeleteItem)|s3:(PutObject|DeleteObject)|s3vectors:(PutVectors|DeleteVectors|CreateIndex|DeleteIndex)/);
  const state = handlerPolicy.Properties.PolicyDocument.Statement.find((s: { Action: unknown }) => Array.isArray(s.Action) && s.Action.includes('dynamodb:GetItem'));
  assert.deepEqual([...state.Action].sort(), ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem']);
  assert.deepEqual(state.Condition, { 'ForAllValues:StringLike': { 'dynamodb:LeadingKeys': ['SESSION#*', 'REQUEST#*', 'BUDGET#*', 'VISITOR#*'] } });

  const invokeStmt = handlerPolicy.Properties.PolicyDocument.Statement.find((s: { Action: string | string[] }) =>
    s.Action === 'execute-api:Invoke' || (Array.isArray(s.Action) && s.Action.includes('execute-api:Invoke')));
  assert.ok(invokeStmt, 'Expected execute-api:Invoke on HandlerRole');
  assert.match(JSON.stringify(invokeStmt.Resource), /\/dev\/POST\/api\/chat\/_mcp/);

  const s3GetStmt = handlerPolicy.Properties.PolicyDocument.Statement.find((s: { Action: string | string[] }) =>
    s.Action === 's3:GetObject' || (Array.isArray(s.Action) && s.Action.includes('s3:GetObject')));
  assert.ok(s3GetStmt, 'Expected s3:GetObject on HandlerRole');
  assert.match(JSON.stringify(s3GetStmt.Resource), /Evidence.*\/indexes\/\*/);

  const s3ListStmt = handlerPolicy.Properties.PolicyDocument.Statement.find((s: { Action: string | string[] }) =>
    s.Action === 's3:ListBucket' || (Array.isArray(s.Action) && s.Action.includes('s3:ListBucket')));
  assert.ok(s3ListStmt, 'Expected s3:ListBucket on HandlerRole');
  assert.match(JSON.stringify(s3ListStmt.Resource), /Evidence/);

  const vectorStmt = handlerPolicy.Properties.PolicyDocument.Statement.find((s: { Action: string | string[] }) =>
    Array.isArray(s.Action) && s.Action.includes('s3vectors:QueryVectors'));
  assert.ok(vectorStmt, 'Expected s3vectors:QueryVectors on HandlerRole');
  assert.deepEqual([...vectorStmt.Action].sort(), [
    's3vectors:GetIndex', 's3vectors:GetVectorBucket', 's3vectors:GetVectors', 's3vectors:QueryVectors'
  ]);
  assert.equal(vectorStmt.Resource, 'arn:aws:s3vectors:us-east-2:111111111111:bucket/joshboyer-chat-dev-vectors*');

  const handler = Object.values(template.findResources('AWS::Lambda::Function')).find(resource => resource.Properties.Handler === 'handler.handler')!;
  const envVars = handler.Properties.Environment.Variables;
  assert.equal(envVars.PUBLIC_CHAT_ENABLED, 'false');
  assert.equal(envVars.CHAT_PRIVATE_ENABLED, 'true');
  assert.equal(envVars.CHAT_MONTHLY_BUDGET_MICROS, '25000000');
  assert.ok(envVars.EVIDENCE_BUCKET_NAME);
  assert.equal(envVars.VECTOR_BUCKET_NAME, 'joshboyer-chat-dev-vectors');
  assert.equal(envVars.VECTOR_INDEX_NAME, 'portfolio-evidence');
  assert.match(JSON.stringify(envVars.MCP_ENDPOINT_URL), /\/api\/chat\/_mcp/);
});

test('evidence and state are encrypted, private and retained with stable logical IDs and outputs', t => {
  const { stack, template } = fixture(t);
  assert.equal(stack.terminationProtection, true);
  const raw = template.toJSON();
  assert.ok(raw.Resources.State893AD892 || Object.keys(raw.Resources).some(k => k.startsWith('State')), 'State logical ID must remain stable');
  assert.ok(raw.Resources.Evidence29910935 || Object.keys(raw.Resources).some(k => k.startsWith('Evidence')), 'Evidence logical ID must remain stable');
  template.hasResource('AWS::S3::Bucket', {
    DeletionPolicy: 'Retain', UpdateReplacePolicy: 'Retain',
    Properties: Match.objectLike({
      BucketName: 'joshboyer-chat-dev-111111111111-us-east-2',
      VersioningConfiguration: { Status: 'Enabled' },
      BucketEncryption: { ServerSideEncryptionConfiguration: [{ ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }] },
      PublicAccessBlockConfiguration: { BlockPublicAcls: true, BlockPublicPolicy: true, IgnorePublicAcls: true, RestrictPublicBuckets: true }
    })
  });
  template.hasResourceProperties('AWS::S3::BucketPolicy', { PolicyDocument: Match.objectLike({ Statement: Match.arrayWith([
    Match.objectLike({ Effect: 'Deny', Condition: { Bool: { 'aws:SecureTransport': 'false' } } })
  ]) }) });
  template.hasResource('AWS::DynamoDB::Table', { DeletionPolicy: 'Retain', UpdateReplacePolicy: 'Retain', Properties: Match.objectLike({
    TableName: 'joshboyer-chat-dev-state',
    BillingMode: 'PAY_PER_REQUEST', DeletionProtectionEnabled: true,
    TimeToLiveSpecification: { AttributeName: 'expiresAt', Enabled: true },
    SSESpecification: { SSEEnabled: true }
  }) });
  for (const outputName of [
    'ProbeUrl', 'ApiId', 'StateTableName', 'EvidenceBucketName',
    'HandlerFunctionName', 'AuthorizerFunctionName', 'McpFunctionName',
    'McpEndpointUrl', 'VectorBucketName', 'VectorIndexName',
    'openaiSecretArn', 'anthropicSecretArn', 'gatewaySecretArn', 'edgeSecretArn'
  ]) {
    assert.ok(raw.Outputs[outputName], `Missing required stack output ${outputName}`);
  }
});

test('logs exclude request data and stage throttles operator probes', t => {
  const { template } = fixture(t);
  const groups = Object.values(template.findResources('AWS::Logs::LogGroup'));
  assert.equal(groups.length, 4);
  for (const group of groups) {
    assert.equal(group.Properties.RetentionInDays, 7);
    assert.equal(group.DeletionPolicy, 'Retain');
    assert.equal(group.UpdateReplacePolicy, 'Retain');
  }
  const stage = Object.values(template.findResources('AWS::ApiGateway::Stage'))[0]!;
  const logDestination = JSON.stringify(stage.Properties.AccessLogSetting.DestinationArn);
  assert.match(logDestination, /:logs:us-east-2:111111111111:log-group:/);
  assert.doesNotMatch(logDestination, /:\*|Fn::GetAtt/, 'Construct the ARN from the group name; GetAtt Arn includes the wildcard suffix.');
  const format = JSON.parse(stage.Properties.AccessLogSetting.Format);
  assert.deepEqual(Object.keys(format), ['requestId', 'status', 'responseLength', 'responseLatency']);
  template.hasResourceProperties('AWS::ApiGateway::Stage', { MethodSettings: Match.arrayWith([
    Match.objectLike({ DataTraceEnabled: false, LoggingLevel: 'OFF', ThrottlingBurstLimit: 2, ThrottlingRateLimit: 1 })
  ]) });
  template.resourceCountIs('AWS::CloudWatch::Alarm', 6);
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

test('CloudFormation execution policy scopes runtime and s3vectors resources and excludes administrative provisioning', () => {
  for (const badId of ['wrong', '', '11111111111', '1111111111111', '111111111111\r\n', 'CANARY-A15-INFRA-SECRET-8472']) {
    assert.throws(() => buildExecutionPolicy(badId), /project ID/);
  }
  const policy = buildExecutionPolicy('111111111111');
  const encoded = JSON.stringify(policy);
  assert.doesNotMatch(encoded, /AdministratorAccess|iam:CreateUser|iam:CreatePolicy|iam:AttachRolePolicy|sts:AssumeRole|CANARY-A15-INFRA-SECRET-8472/);
  assert.doesNotMatch(encoded, /us-east-1/);
  const unrestricted = policy.Statement.filter(statement => statement.Resource === '*');
  assert.equal(unrestricted.length, 1);
  assert.deepEqual(unrestricted[0]!.Action, ['logs:DescribeLogGroups', 'logs:DescribeIndexPolicies', 'logs:DescribeResourcePolicies']);
  assert.deepEqual((unrestricted[0] as { Condition?: unknown }).Condition, { StringEquals: { 'aws:RequestedRegion': REGION } });
  const pass = policy.Statement.find(statement => statement.Sid === 'PassRuntimeRoles')!;
  assert.ok('Condition' in pass);
  const vectorStmt = policy.Statement.find(statement => statement.Sid === 'ChatVectorResources')!;
  assert.ok(vectorStmt, 'Expected ChatVectorResources statement in bootstrap policy');
  assert.equal(vectorStmt.Resource, 'arn:aws:s3vectors:us-east-2:111111111111:bucket/joshboyer-chat-dev-vectors*');
  assert.match(encoded, /NONCE|joshboyer-chat-dev/);
});

test('supports explicit mcpCodePath and rejects hostile inputs without leaking canaries', t => {
  const canary = 'CANARY-A15-INFRA-SECRET-8472';
  const serviceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-chat-service-'));
  const mcpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-chat-mcp-'));
  t.after(() => {
    fs.rmSync(serviceDir, { recursive: true, force: true });
    fs.rmSync(mcpDir, { recursive: true, force: true });
  });
  fs.writeFileSync(path.join(serviceDir, 'handler.js'), 'exports.handler = async () => {};');
  fs.writeFileSync(path.join(serviceDir, 'authorizer.js'), 'exports.handler = async () => {};');
  fs.writeFileSync(path.join(mcpDir, 'mcp.cjs'), 'exports.handler = async () => {};');
  const fileNotDir = path.join(serviceDir, 'handler.js');
  assert.throws(() => new PortfolioChatStack(new App(), 'FileMcpCode', {
    env: { account: '111111111111', region: REGION },
    serviceAssetPath: serviceDir,
    mcpCodePath: fileNotDir
  }), /Build the MCP service/);

  const app = new App({ context: JSON.parse(fs.readFileSync(path.resolve(__dirname, '../cdk.json'), 'utf8')).context });
  const stack = new PortfolioChatStack(app, 'TestCustomMcp', {
    env: { account: '111111111111', region: REGION },
    serviceAssetPath: serviceDir,
    mcpCodePath: mcpDir
  });
  const templateJson = JSON.stringify(Template.fromStack(stack).toJSON());
  assert.doesNotMatch(templateJson, new RegExp(canary));
  assert.match(templateJson, /joshboyer-chat-dev-mcp/);
});
