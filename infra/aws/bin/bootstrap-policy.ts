import { buildExecutionPolicy } from '../lib/bootstrap-policy';

if (process.argv.length !== 3) throw new Error('Usage: npm run bootstrap:policy -- <AWS-project-id>');
process.stdout.write(JSON.stringify(buildExecutionPolicy(process.argv[2]!), null, 2) + '\n');
