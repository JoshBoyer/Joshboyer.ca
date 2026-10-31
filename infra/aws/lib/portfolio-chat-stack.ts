import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  CfnOutput, CfnParameter, Duration, RemovalPolicy, Stack, StackProps,
  aws_apigateway as apigateway, aws_cloudwatch as cloudwatch,
  aws_dynamodb as dynamodb, aws_iam as iam, aws_lambda as lambda,
  aws_logs as logs, aws_s3 as s3, aws_secretsmanager as secretsmanager
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export const REGION = 'us-east-2';
export const PREFIX = 'joshboyer-chat-dev';
export const VECTOR_BUCKET_NAME = `${PREFIX}-vectors`;
export const VECTOR_INDEX_NAME = 'portfolio-evidence';

export interface PortfolioChatStackProps extends StackProps {
  readonly serviceAssetPath?: string;
  readonly mcpCodePath?: string;
  readonly reuseApiGatewayLogRole?: boolean;
}

export class PortfolioChatStack extends Stack {
  constructor(scope: Construct, id: string, props: PortfolioChatStackProps) {
    if (props.env?.region !== REGION) throw new Error(`Chat infrastructure must use ${REGION}.`);
    const account = props.env.account ?? '';
    if (typeof account !== 'string' || account.length !== 12 || !/^[0-9]{12}$/.test(account)) {
      throw new Error('An explicit AWS project ID is required.');
    }
    super(scope, id, { ...props, terminationProtection: true });

    const serviceAssetPath = props.serviceAssetPath ?? path.resolve(__dirname, '../../../services/chat/build');
    for (const file of ['handler.js', 'authorizer.js']) {
      const target = path.join(serviceAssetPath, file);
      if (!fs.existsSync(target) || !fs.lstatSync(target).isFile() || fs.lstatSync(target).isSymbolicLink()) {
        throw new Error(`Build the chat service before synthesis: missing regular file ${file}.`);
      }
    }
    const code = lambda.Code.fromAsset(serviceAssetPath);
    let mcpCode = code;
    if (props.mcpCodePath !== undefined) {
      if (
        typeof props.mcpCodePath !== 'string' ||
        props.mcpCodePath.length === 0 ||
        !fs.existsSync(props.mcpCodePath) ||
        fs.lstatSync(props.mcpCodePath).isSymbolicLink() ||
        !fs.lstatSync(props.mcpCodePath).isDirectory()
      ) {
        throw new Error('Build the MCP service before synthesis: invalid mcpCodePath.');
      }
      const mcpCandidates = ['mcp.js', 'mcp.cjs', 'handler.js', 'index.js', 'index.cjs'];
      const hasBundle = mcpCandidates.some(file => {
        const candidate = path.join(props.mcpCodePath!, file);
        return fs.existsSync(candidate) && fs.lstatSync(candidate).isFile() && !fs.lstatSync(candidate).isSymbolicLink();
      });
      if (!hasBundle) {
        throw new Error('Build the MCP service before synthesis: missing regular handler bundle in mcpCodePath.');
      }
      mcpCode = lambda.Code.fromAsset(props.mcpCodePath);
    }
    const gatewayAccountId = new CfnParameter(this, 'GatewayAccountId', {
      type: 'String', allowedPattern: '^[a-f0-9]{32}$',
      description: 'Cloudflare account identifier; not a credential.'
    });
    const gatewayId = new CfnParameter(this, 'GatewayId', {
      type: 'String', default: 'joshboyer-chat-dev', allowedPattern: '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'
    });
    const openaiModel = new CfnParameter(this, 'OpenAiModel', {
      type: 'String', default: 'gpt-6-luna', allowedValues: ['gpt-6-luna']
    });
    const anthropicModel = new CfnParameter(this, 'AnthropicModel', {
      type: 'String', default: 'claude-haiku-5-5', allowedValues: ['claude-haiku-5-5']
    });

    const state = new dynamodb.Table(this, 'State', {
      tableName: `${PREFIX}-state`, partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'expiresAt', pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      deletionProtection: true, removalPolicy: RemovalPolicy.RETAIN
    });
    const evidence = new s3.Bucket(this, 'Evidence', {
      bucketName: `${PREFIX}-${this.account}-${REGION}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true, versioned: true, objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: RemovalPolicy.RETAIN
    });

    const secrets = Object.fromEntries(['openai', 'anthropic', 'gateway', 'edge'].map(name => {
      const secret = new secretsmanager.CfnSecret(this, `${name}Secret`, {
        name: `/joshboyer/chat/dev/${name}`,
        // Value ownership stays outside CloudFormation so future updates cannot reset credentials.
        description: `Portfolio chat dev ${name}; provision the value separately using temporary credentials.`
      });
      secret.applyRemovalPolicy(RemovalPolicy.RETAIN);
      return [name, secret];
    })) as Record<'openai' | 'anthropic' | 'gateway' | 'edge', secretsmanager.CfnSecret>;

    const handlerLogs = new logs.LogGroup(this, 'HandlerLogs', {
      logGroupName: `/aws/lambda/${PREFIX}-handler`, retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.RETAIN
    });
    const authorizerLogs = new logs.LogGroup(this, 'AuthorizerLogs', {
      logGroupName: `/aws/lambda/${PREFIX}-authorizer`, retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.RETAIN
    });
    const mcpLogs = new logs.LogGroup(this, 'McpLogs', {
      logGroupName: `/aws/lambda/${PREFIX}-mcp`, retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.RETAIN
    });
    const handlerRole = new iam.Role(this, 'HandlerRole', {
      roleName: `${PREFIX}-handler`, assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    });
    const authorizerRole = new iam.Role(this, 'AuthorizerRole', {
      roleName: `${PREFIX}-authorizer`, assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    });
    const mcpRole = new iam.Role(this, 'McpRole', {
      roleName: `${PREFIX}-mcp`, assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    });
    handlerLogs.grantWrite(handlerRole);
    authorizerLogs.grantWrite(authorizerRole);
    mcpLogs.grantWrite(mcpRole);
    handlerRole.addToPolicy(new iam.PolicyStatement({
      actions: ['secretsmanager:GetSecretValue'], resources: Object.values(secrets).map(secret => secret.ref)
    }));
    authorizerRole.addToPolicy(new iam.PolicyStatement({
      actions: ['secretsmanager:GetSecretValue'], resources: [secrets.edge.ref]
    }));
    handlerRole.addToPolicy(new iam.PolicyStatement({
      actions: ['dynamodb:PutItem'], resources: [state.tableArn],
      conditions: { 'ForAllValues:StringLike': { 'dynamodb:LeadingKeys': ['NONCE#*'] } }
    }));
    handlerRole.addToPolicy(new iam.PolicyStatement({
      actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem'],
      resources: [state.tableArn],
      conditions: { 'ForAllValues:StringLike': { 'dynamodb:LeadingKeys': ['SESSION#*', 'REQUEST#*', 'BUDGET#*', 'VISITOR#*'] } }
    }));
    handlerRole.addToPolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [evidence.arnForObjects('indexes/*')]
    }));
    handlerRole.addToPolicy(new iam.PolicyStatement({
      actions: ['s3:ListBucket'],
      resources: [evidence.bucketArn]
    }));
    handlerRole.addToPolicy(new iam.PolicyStatement({
      actions: ['s3vectors:QueryVectors', 's3vectors:GetVectors', 's3vectors:GetIndex', 's3vectors:GetVectorBucket'],
      resources: [`arn:aws:s3vectors:${REGION}:${this.account}:bucket/${VECTOR_BUCKET_NAME}*`]
    }));

    const handler = new lambda.Function(this, 'Handler', {
      functionName: `${PREFIX}-handler`, code, handler: 'handler.handler',
      runtime: lambda.Runtime.NODEJS_24_X, architecture: lambda.Architecture.ARM_64,
      memorySize: 256, timeout: Duration.seconds(60), reservedConcurrentExecutions: 2,
      role: handlerRole, logGroup: handlerLogs, loggingFormat: lambda.LoggingFormat.JSON,
      environment: {
        OPENAI_SECRET_ARN: secrets.openai.ref, ANTHROPIC_SECRET_ARN: secrets.anthropic.ref,
        GATEWAY_SECRET_ARN: secrets.gateway.ref, EDGE_SECRET_ARN: secrets.edge.ref,
        STATE_TABLE_NAME: state.tableName, GATEWAY_ACCOUNT_ID: gatewayAccountId.valueAsString,
        GATEWAY_ID: gatewayId.valueAsString, OPENAI_MODEL: openaiModel.valueAsString,
        ANTHROPIC_MODEL: anthropicModel.valueAsString,
        EVIDENCE_BUCKET_NAME: evidence.bucketName,
        VECTOR_BUCKET_NAME,
        VECTOR_INDEX_NAME,
        CHAT_PRIVATE_ENABLED: 'true', PUBLIC_CHAT_ENABLED: 'false', PROBE_ENABLED: 'false',
        CHAT_MONTHLY_BUDGET_MICROS: '25000000', CHAT_OPENAI_BUDGET_MICROS: '25000000',
        CHAT_ANTHROPIC_BUDGET_MICROS: '25000000', CHAT_DAILY_VISITOR_TURNS: '16'
      }
    });
    const authorizerHandler = new lambda.Function(this, 'AuthorizerHandler', {
      functionName: `${PREFIX}-authorizer`, code, handler: 'authorizer.handler',
      runtime: lambda.Runtime.NODEJS_24_X, architecture: lambda.Architecture.ARM_64,
      memorySize: 256, timeout: Duration.seconds(10), reservedConcurrentExecutions: 2,
      role: authorizerRole, logGroup: authorizerLogs, loggingFormat: lambda.LoggingFormat.JSON,
      environment: { EDGE_SECRET_ARN: secrets.edge.ref }
    });
    const mcpHandler = new lambda.Function(this, 'McpFunction', {
      functionName: `${PREFIX}-mcp`, code: mcpCode, handler: 'mcp.handler',
      runtime: lambda.Runtime.NODEJS_24_X, architecture: lambda.Architecture.X86_64,
      memorySize: 256, timeout: Duration.seconds(10), reservedConcurrentExecutions: 4,
      role: mcpRole, logGroup: mcpLogs, loggingFormat: lambda.LoggingFormat.JSON,
      environment: {
        CHAT_ENVIRONMENT: 'dev',
        NODE_OPTIONS: '--enable-source-maps'
      }
    });
    (mcpHandler.node.defaultChild as lambda.CfnFunction).tracingConfig = { mode: 'PassThrough' };

    const accessLogs = new logs.LogGroup(this, 'ApiAccessLogs', {
      logGroupName: '/joshboyer/chat/dev/api', retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.RETAIN
    });
    let accountLogging: apigateway.CfnAccount | undefined;
    if (!props.reuseApiGatewayLogRole) {
      const apiLogPolicy = new iam.PolicyDocument({ statements: [
        new iam.PolicyStatement({
          // The regional account setting rejects a single-group scope. Keep the complete
          // logging action set bounded to this project and Region, only on the service role.
          actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:DescribeLogStreams', 'logs:GetLogEvents', 'logs:PutLogEvents', 'logs:FilterLogEvents'],
          resources: [`arn:${this.partition}:logs:${REGION}:${this.account}:log-group:*`]
        }),
        // This list operation has no resource-level IAM scope.
        new iam.PolicyStatement({ actions: ['logs:DescribeLogGroups'], resources: ['*'] })
      ] });
      const apiLogRole = new iam.Role(this, 'ApiLogRole', {
        roleName: `${PREFIX}-apigateway-logs`, assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
        // Preserve the retained policy's name so importing the role updates it in place.
        inlinePolicies: { ApiLogPolicy4B32349C: apiLogPolicy }
      });
      apiLogRole.applyRemovalPolicy(RemovalPolicy.RETAIN);
      accountLogging = new apigateway.CfnAccount(this, 'ApiAccountLogging', { cloudWatchRoleArn: apiLogRole.roleArn });
      accountLogging.applyRemovalPolicy(RemovalPolicy.RETAIN);
      accountLogging.node.addDependency(apiLogRole);
    }
    const api = new apigateway.RestApi(this, 'Api', {
      restApiName: `${PREFIX}-api`, endpointTypes: [apigateway.EndpointType.REGIONAL],
      cloudWatchRole: false, deployOptions: {
        stageName: 'dev', throttlingRateLimit: 1, throttlingBurstLimit: 2,
        loggingLevel: apigateway.MethodLoggingLevel.OFF, dataTraceEnabled: false, metricsEnabled: false,
        accessLogDestination: new apigateway.LogGroupLogDestination(accessLogs),
        accessLogFormat: apigateway.AccessLogFormat.custom(JSON.stringify({
          requestId: '$context.requestId', status: '$context.status',
          responseLength: '$context.responseLength', responseLatency: '$context.responseLatency'
        }))
      }
    });
    if (accountLogging) api.deploymentStage.node.addDependency(accountLogging);
    const authorizer = new apigateway.RequestAuthorizer(this, 'EdgeAuthorizer', {
      handler: authorizerHandler, resultsCacheTtl: Duration.seconds(0),
      identitySources: [apigateway.IdentitySource.header('x-chat-signature')]
    });
    const chat = api.root.addResource('api').addResource('chat');
    const probe = chat.addResource('_probe');
    probe.addMethod('POST', new apigateway.LambdaIntegration(handler, {
      proxy: true, responseTransferMode: apigateway.ResponseTransferMode.STREAM,
      timeout: Duration.seconds(35), allowTestInvoke: false
    }), { authorizer, authorizationType: apigateway.AuthorizationType.CUSTOM });
    const mcp = chat.addResource('_mcp');
    mcp.addMethod('POST', new apigateway.LambdaIntegration(mcpHandler, {
      proxy: true, timeout: Duration.seconds(10), allowTestInvoke: false
    }), { authorizationType: apigateway.AuthorizationType.IAM });
    const mcpEndpointUrl = `https://${api.restApiId}.execute-api.${REGION}.amazonaws.com/dev/api/chat/_mcp`;
    handler.addEnvironment('MCP_ENDPOINT_URL', mcpEndpointUrl);
    handlerRole.addToPolicy(new iam.PolicyStatement({
      actions: ['execute-api:Invoke'],
      resources: [`arn:${this.partition}:execute-api:${REGION}:${this.account}:${api.restApiId}/dev/POST/api/chat/_mcp`]
    }));
    const chatIntegration = new apigateway.LambdaIntegration(handler, {
      proxy: true, responseTransferMode: apigateway.ResponseTransferMode.STREAM,
      timeout: Duration.seconds(65), allowTestInvoke: false
    });
    const chatAuthorization = { authorizer, authorizationType: apigateway.AuthorizationType.CUSTOM };
    chat.addResource('config').addMethod('GET', chatIntegration, chatAuthorization);
    const session = chat.addResource('session');
    session.addMethod('POST', chatIntegration, chatAuthorization);
    session.addMethod('DELETE', chatIntegration, chatAuthorization);
    chat.addResource('messages').addMethod('POST', chatIntegration, chatAuthorization);
    chat.addResource('requests').addResource('{requestId}').addResource('cancel').addMethod('POST', chatIntegration, chatAuthorization);
    for (const [id, type] of [['Default4xx', apigateway.ResponseType.DEFAULT_4XX], ['Default5xx', apigateway.ResponseType.DEFAULT_5XX]] as const) {
      api.addGatewayResponse(id, {
        type, responseHeaders: { 'Cache-Control': "'no-store'", 'Content-Type': "'application/json'" },
        templates: { 'application/json': '{"error":"request_rejected"}' }
      });
    }

    for (const [name, fn] of [['handler', handler], ['authorizer', authorizerHandler], ['mcp', mcpHandler]] as const) {
      for (const [metricName, metric] of [['errors', fn.metricErrors()], ['throttles', fn.metricThrottles()]] as const) {
        new cloudwatch.Alarm(this, `${name}-${metricName}`, {
          alarmName: `${PREFIX}-${name}-${metricName}`, metric: metric.with({ period: Duration.minutes(1), statistic: 'Sum' }),
          threshold: 1, evaluationPeriods: 1, comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
          treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
      }
    }

    new CfnOutput(this, 'ProbeUrl', { value: api.urlForPath('/api/chat/_probe') });
    new CfnOutput(this, 'ApiId', { value: api.restApiId });
    new CfnOutput(this, 'StateTableName', { value: state.tableName });
    new CfnOutput(this, 'EvidenceBucketName', { value: evidence.bucketName });
    new CfnOutput(this, 'HandlerFunctionName', { value: handler.functionName });
    new CfnOutput(this, 'AuthorizerFunctionName', { value: authorizerHandler.functionName });
    new CfnOutput(this, 'McpFunctionName', { value: mcpHandler.functionName });
    new CfnOutput(this, 'McpEndpointUrl', { value: mcpEndpointUrl });
    new CfnOutput(this, 'VectorBucketName', { value: VECTOR_BUCKET_NAME });
    new CfnOutput(this, 'VectorIndexName', { value: VECTOR_INDEX_NAME });
    for (const [name, secret] of Object.entries(secrets)) new CfnOutput(this, `${name}SecretArn`, { value: secret.ref });
  }
}
