import { App, Tags } from 'aws-cdk-lib';
import { PortfolioChatStack, REGION } from '../lib/portfolio-chat-stack';

if (process.env.CDK_DEFAULT_REGION && process.env.CDK_DEFAULT_REGION !== REGION) {
  throw new Error(`The selected Region must be ${REGION}.`);
}
const app = new App({ outdir: process.env.CDK_OUTDIR ?? 'cdk.out' });
const stack = new PortfolioChatStack(app, 'PortfolioChatDev', {
  stackName: 'PortfolioChatDev',
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: REGION },
  reuseApiGatewayLogRole: process.env.CHAT_REUSE_API_LOG_ROLE === 'true'
});
Tags.of(stack).add('Project', 'JoshBoyerPortfolio');
Tags.of(stack).add('Component', 'Chat');
Tags.of(stack).add('Environment', 'dev');
app.synth();
