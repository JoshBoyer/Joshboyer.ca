import { PREFIX, REGION } from './portfolio-chat-stack';

export function buildExecutionPolicy(projectId: string) {
  if (typeof projectId !== 'string' || projectId.length !== 12 || !/^[0-9]{12}$/.test(projectId)) {
    throw new Error('Expected a 12-digit AWS project ID.');
  }
  const arn = (service: string, resource: string) => `arn:aws:${service}:${REGION}:${projectId}:${resource}`;
  const statement = (Sid: string, Action: string[], Resource: string | string[]) => ({ Sid, Effect: 'Allow', Action, Resource });
  const bucket = `arn:aws:s3:::${PREFIX}-${projectId}-${REGION}`;
  const roles = `arn:aws:iam::${projectId}:role/${PREFIX}-*`;
  return {
    Version: '2012-10-17',
    Statement: [
      statement('RuntimeRoles', [
        'iam:CreateRole', 'iam:DeleteRole', 'iam:GetRole', 'iam:UpdateAssumeRolePolicy',
        'iam:PutRolePolicy', 'iam:GetRolePolicy', 'iam:DeleteRolePolicy',
        'iam:ListRolePolicies', 'iam:ListAttachedRolePolicies', 'iam:TagRole', 'iam:UntagRole'
      ], roles),
      { ...statement('PassRuntimeRoles', ['iam:PassRole'], roles),
        Condition: { StringEquals: { 'iam:PassedToService': ['lambda.amazonaws.com', 'apigateway.amazonaws.com'] } } },
      statement('ChatFunctions', [
        'lambda:CreateFunction', 'lambda:GetFunction', 'lambda:GetFunctionConfiguration',
        'lambda:UpdateFunctionCode', 'lambda:UpdateFunctionConfiguration', 'lambda:DeleteFunction',
        'lambda:AddPermission', 'lambda:RemovePermission', 'lambda:GetPolicy',
        'lambda:PutFunctionConcurrency', 'lambda:GetFunctionConcurrency', 'lambda:DeleteFunctionConcurrency',
        'lambda:ListTags', 'lambda:TagResource', 'lambda:UntagResource',
        'lambda:GetRuntimeManagementConfig', 'lambda:PutRuntimeManagementConfig'
      ], arn('lambda', `function:${PREFIX}-*`)),
      statement('ChatState', [
        'dynamodb:CreateTable', 'dynamodb:DescribeTable', 'dynamodb:UpdateTable', 'dynamodb:DeleteTable',
        'dynamodb:DescribeTimeToLive', 'dynamodb:UpdateTimeToLive',
        'dynamodb:DescribeContinuousBackups', 'dynamodb:UpdateContinuousBackups',
        'dynamodb:ListTagsOfResource', 'dynamodb:TagResource', 'dynamodb:UntagResource'
      ], arn('dynamodb', `table/${PREFIX}-state`)),
      statement('ChatEvidenceBucket', [
        's3:CreateBucket', 's3:DeleteBucket', 's3:ListBucket', 's3:GetBucket*',
        's3:GetEncryptionConfiguration', 's3:GetLifecycleConfiguration', 's3:GetReplicationConfiguration',
        's3:GetAccelerateConfiguration', 's3:GetObjectLockConfiguration',
        's3:PutBucketPolicy', 's3:DeleteBucketPolicy', 's3:PutEncryptionConfiguration',
        's3:PutBucketVersioning', 's3:PutBucketPublicAccessBlock', 's3:PutBucketOwnershipControls', 's3:PutBucketTagging'
      ], bucket),
      statement('ChatVectorResources', [
        's3vectors:CreateVectorBucket', 's3vectors:DeleteVectorBucket', 's3vectors:GetVectorBucket',
        's3vectors:ListVectorBuckets', 's3vectors:PutVectorBucketPolicy', 's3vectors:GetVectorBucketPolicy',
        's3vectors:DeleteVectorBucketPolicy', 's3vectors:CreateIndex', 's3vectors:DeleteIndex',
        's3vectors:GetIndex', 's3vectors:ListIndexes', 's3vectors:TagResource',
        's3vectors:UntagResource', 's3vectors:ListTagsForResource'
      ], arn('s3vectors', `bucket/${PREFIX}-vectors*`)),
      statement('ChatSecretResources', [
        'secretsmanager:CreateSecret', 'secretsmanager:DescribeSecret', 'secretsmanager:UpdateSecret',
        'secretsmanager:PutSecretValue', 'secretsmanager:DeleteSecret', 'secretsmanager:RestoreSecret',
        'secretsmanager:TagResource', 'secretsmanager:UntagResource', 'secretsmanager:GetResourcePolicy'
      ], arn('secretsmanager', 'secret:/joshboyer/chat/dev/*')),
      statement('ChatLogGroups', [
        'logs:CreateLogGroup', 'logs:DeleteLogGroup', 'logs:PutRetentionPolicy', 'logs:DeleteRetentionPolicy',
        'logs:TagResource', 'logs:UntagResource', 'logs:ListTagsForResource', 'logs:GetDataProtectionPolicy'
      ], [arn('logs', `log-group:/aws/lambda/${PREFIX}-*`), arn('logs', 'log-group:/joshboyer/chat/dev/api*')]),
      // CloudFormation's read/drift handler needs these list actions, which have no resource scope.
      { ...statement('DiscoverLogGroups', ['logs:DescribeLogGroups', 'logs:DescribeIndexPolicies', 'logs:DescribeResourcePolicies'], '*'),
        Condition: { StringEquals: { 'aws:RequestedRegion': REGION } } },
      statement('ChatAlarms', [
        'cloudwatch:PutMetricAlarm', 'cloudwatch:DeleteAlarms', 'cloudwatch:DescribeAlarms',
        'cloudwatch:TagResource', 'cloudwatch:UntagResource', 'cloudwatch:ListTagsForResource'
      ], arn('cloudwatch', `alarm:${PREFIX}-*`)),
      // REST API IDs are assigned by AWS; this is the regional control-plane scope.
      statement('RegionalRestApiControl', ['apigateway:GET', 'apigateway:POST', 'apigateway:PUT', 'apigateway:PATCH', 'apigateway:DELETE'], [
        `arn:aws:apigateway:${REGION}::/account`, `arn:aws:apigateway:${REGION}::/restapis`,
        `arn:aws:apigateway:${REGION}::/restapis/*`, `arn:aws:apigateway:${REGION}::/tags/*`
      ]),
      statement('ReadBootstrapAssets', ['s3:GetObject', 's3:GetObjectVersion'],
        `arn:aws:s3:::cdk-hnb659fds-assets-${projectId}-${REGION}/*`),
      statement('ReadBootstrapVersion', ['ssm:GetParameter', 'ssm:GetParameters'],
        arn('ssm', 'parameter/cdk-bootstrap/hnb659fds/version'))
    ]
  };
}
