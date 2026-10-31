'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const REGION = 'us-east-2';
const PROFILE = 'joshboyer-portfolio';
const PREFIX = 'joshboyer-chat-dev';
const DEFAULT_VECTOR_BUCKET = 'joshboyer-chat-dev-vectors';
const DEFAULT_VECTOR_INDEX = 'portfolio-public-chunks';
const SECRET_PREFIX = '/joshboyer/chat/dev/';

function ensureTsxRegistered() {
  if (!require.extensions['.ts']) {
    const chatRequire = createRequire(path.join(ROOT, 'services/chat/package.json'));
    chatRequire('tsx/cjs');
  }
}

function loadIngestionModule() {
  ensureTsxRegistered();
  return require('../services/chat/src/ingestion/index.ts');
}

function loadConfigModule() {
  ensureTsxRegistered();
  return require('../services/chat/src/config.ts');
}

class CliUsageError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = 'CliUsageError';
    this.code = code;
  }
}

function parseCliArgs(args) {
  if (!Array.isArray(args) || args.length === 0) {
    throw new CliUsageError(
      'INVALID_CLI_ARGS',
      'Usage: node tools/ingest-chat-knowledge.cjs (--dry-run | --ingest [--force] | --verify [--index-version <v>] | --rollback [--to <indexVersion>])'
    );
  }
  let mode = null;
  let force = false;
  let targetIndexVersion;
  let verifyIndexVersion;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') {
      if (mode !== null) throw new CliUsageError('INVALID_CLI_ARGS', 'Multiple modes specified');
      mode = 'dry_run';
    } else if (arg === '--ingest') {
      if (mode !== null) throw new CliUsageError('INVALID_CLI_ARGS', 'Multiple modes specified');
      mode = 'ingest';
    } else if (arg === '--verify') {
      if (mode !== null) throw new CliUsageError('INVALID_CLI_ARGS', 'Multiple modes specified');
      mode = 'verify';
    } else if (arg === '--rollback') {
      if (mode !== null) throw new CliUsageError('INVALID_CLI_ARGS', 'Multiple modes specified');
      mode = 'rollback';
    } else if (arg === '--force') {
      force = true;
    } else if (arg === '--to') {
      const next = args[++i];
      if (!next || typeof next !== 'string' || !/^idx-[a-z0-9][a-z0-9_-]{1,48}$/.test(next)) {
        throw new CliUsageError('INVALID_CLI_ARGS', 'Missing or invalid --to <indexVersion>');
      }
      targetIndexVersion = next;
    } else if (arg === '--index-version') {
      const next = args[++i];
      if (!next || typeof next !== 'string' || !/^idx-[a-z0-9][a-z0-9_-]{1,48}$/.test(next)) {
        throw new CliUsageError('INVALID_CLI_ARGS', 'Missing or invalid --index-version <indexVersion>');
      }
      verifyIndexVersion = next;
    } else {
      throw new CliUsageError('INVALID_CLI_ARGS', `Unknown CLI argument: ${String(arg)}`);
    }
  }

  if (!mode) {
    throw new CliUsageError('INVALID_CLI_ARGS', 'One of --dry-run, --ingest, --verify, or --rollback is required');
  }
  if (force && mode !== 'ingest') {
    throw new CliUsageError('INVALID_CLI_ARGS', '--force is only valid with --ingest');
  }
  if (targetIndexVersion !== undefined && mode !== 'rollback') {
    throw new CliUsageError('INVALID_CLI_ARGS', '--to is only valid with --rollback');
  }
  if (verifyIndexVersion !== undefined && mode !== 'verify') {
    throw new CliUsageError('INVALID_CLI_ARGS', '--index-version is only valid with --verify');
  }

  return {
    mode,
    force,
    targetIndexVersion,
    verifyIndexVersion
  };
}

function runAwsCli(args, env, execute = execFileSync) {
  const options = {
    encoding: 'utf8',
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30000,
    maxBuffer: 1048576
  };
  try {
    return execute('aws', args, options);
  } catch (error) {
    if (error.code === 'ENOENT' && process.platform === 'win32' && env.LOCALAPPDATA) {
      return execute(path.join(env.LOCALAPPDATA, 'Programs/Amazon/AWSCLIV2/aws.exe'), args, options);
    }
    throw new CliUsageError('AWS_AUTH_FAILED', 'Failed to invoke AWS CLI');
  }
}

function resolveGatewayAccountId(env) {
  if (typeof env.GATEWAY_ACCOUNT_ID === 'string' && /^[a-f0-9]{32}$/.test(env.GATEWAY_ACCOUNT_ID)) {
    return env.GATEWAY_ACCOUNT_ID;
  }
  if (typeof env.CLOUDFLARE_ACCOUNT_ID === 'string' && /^[a-f0-9]{32}$/.test(env.CLOUDFLARE_ACCOUNT_ID)) {
    return env.CLOUDFLARE_ACCOUNT_ID;
  }
  try {
    const wranglerRaw = fs.readFileSync(path.join(ROOT, 'services/edge/wrangler.jsonc'), 'utf8');
    const parsed = JSON.parse(wranglerRaw);
    if (parsed && typeof parsed.account_id === 'string' && /^[a-f0-9]{32}$/.test(parsed.account_id)) {
      return parsed.account_id;
    }
  } catch {
    // Fall through to default verified Gateway account ID if wrangler.jsonc cannot be read
  }
  return '019f6ca21aafa442ceed0e09bdf76f7f';
}

async function resolveLiveAwsConnection(dependencies = {}) {
  const env = dependencies.env ?? process.env;
  const profile = env.AWS_PROFILE ?? PROFILE;
  const identityRaw = runAwsCli(
    ['sts', 'get-caller-identity', '--profile', profile, '--region', REGION, '--output', 'json'],
    env,
    dependencies.execute
  );
  const exportedRaw = runAwsCli(
    ['configure', 'export-credentials', '--profile', profile, '--format', 'process'],
    env,
    dependencies.execute
  );
  const identity = JSON.parse(identityRaw);
  const exported = JSON.parse(exportedRaw);
  if (!identity || !/^[0-9]{12}$/.test(String(identity.Account))) {
    throw new CliUsageError('AWS_IDENTITY_INVALID', 'Invalid AWS project identity');
  }
  if (
    !exported ||
    typeof exported.AccessKeyId !== 'string' ||
    typeof exported.SecretAccessKey !== 'string'
  ) {
    throw new CliUsageError('AWS_CREDENTIALS_INVALID', 'Missing exported AWS credentials');
  }
  const credentials = {
    accessKeyId: exported.AccessKeyId,
    secretAccessKey: exported.SecretAccessKey,
    ...(exported.SessionToken ? { sessionToken: exported.SessionToken } : {})
  };
  return {
    account: String(identity.Account),
    credentials
  };
}

async function readSecretsManagerCredentials(account, credentials) {
  const chatRequire = createRequire(path.join(ROOT, 'services/chat/package.json'));
  const sdk = chatRequire('@aws-sdk/client-secrets-manager');
  const client = new sdk.SecretsManagerClient({
    region: REGION,
    maxAttempts: 1,
    credentials
  });
  try {
    const readOne = async name => {
      const res = await client.send(
        new sdk.GetSecretValueCommand({
          SecretId: `${SECRET_PREFIX}${name}`,
          VersionStage: 'AWSCURRENT'
        }),
        { abortSignal: AbortSignal.timeout(15000) }
      );
      if (typeof res.SecretString !== 'string' || !res.SecretString.trim()) {
        throw new CliUsageError('SECRET_UNAVAILABLE', `Secret ${name} is empty`);
      }
      return res.SecretString.trim();
    };
    const [openAiApiKey, gatewayToken] = await Promise.all([readOne('openai'), readOne('gateway')]);
    return {
      openAiApiKey,
      gatewayToken,
      account
    };
  } finally {
    client.destroy();
  }
}

async function runCli(args = process.argv.slice(2), dependencies = {}) {
  const write = dependencies.write ?? (value => process.stdout.write(value));
  const writeError = dependencies.writeError ?? (value => process.stderr.write(value));
  const env = dependencies.env ?? process.env;

  try {
    const parsedArgs = parseCliArgs(args);
    const ingestion = loadIngestionModule();

    if (parsedArgs.mode === 'dry_run') {
      const plan = ingestion.planDryRunIngestion({
        corpus: dependencies.corpus,
        cag: dependencies.cag,
        chunksManifest: dependencies.chunksManifest,
        maxAllowanceMicros: dependencies.maxAllowanceMicros
      });
      write(
        `${JSON.stringify({
          mode: 'dry_run',
          status: 'verified',
          indexVersion: plan.indexVersion,
          corpusVersion: plan.corpusVersion,
          manifestSha256: plan.manifestSha256,
          embeddingModel: plan.embeddingModel,
          dimensions: plan.dimensions,
          chunkCount: plan.chunkCount,
          totalUtf8Bytes: plan.totalUtf8Bytes,
          budgetEstimate: plan.budgetEstimate
        })}\n`
      );
      return 0;
    }

    let credentials = dependencies.credentials;
    let account = dependencies.account ?? '099256072947';
    if (!credentials) {
      const liveAws = await resolveLiveAwsConnection(dependencies);
      credentials = liveAws.credentials;
      account = liveAws.account;
    }

    const evidenceBucket =
      dependencies.evidenceBucket ??
      dependencies.config?.evidenceBucket ??
      env.EVIDENCE_BUCKET_NAME ??
      `${PREFIX}-${account}-${REGION}`;
    const vectorBucketName =
      dependencies.vectorBucketName ??
      dependencies.config?.vectorBucket ??
      env.VECTOR_BUCKET_NAME ??
      DEFAULT_VECTOR_BUCKET;
    const indexName =
      dependencies.indexName ??
      dependencies.config?.vectorIndex ??
      env.VECTOR_INDEX_NAME ??
      DEFAULT_VECTOR_INDEX;

    const s3Store =
      dependencies.s3Store ??
      new ingestion.S3ObjectStore({
        region: REGION,
        endpoint: dependencies.s3Endpoint,
        allowLoopbackForTests: dependencies.allowLoopbackForTests === true,
        credentials,
        fetchImpl: dependencies.s3FetchImpl,
        now: dependencies.now
      });

    const vectorStore =
      dependencies.vectorStore ??
      new ingestion.S3VectorsStore({
        region: REGION,
        endpoint: dependencies.s3VectorsEndpoint,
        allowLoopbackForTests: dependencies.allowLoopbackForTests === true,
        credentials,
        fetchImpl: dependencies.s3VectorsFetchImpl,
        now: dependencies.now
      });

    if (parsedArgs.mode === 'verify') {
      const verified = await ingestion.verifyKnowledgeIndex({
        evidenceBucket,
        vectorBucketName,
        indexName,
        indexVersion: parsedArgs.verifyIndexVersion,
        s3Store,
        vectorStore
      });
      write(
        `${JSON.stringify({
          mode: 'verify',
          status: 'verified',
          verified: verified.verified,
          activeIndexVersion: verified.pointer.activeIndexVersion,
          previousIndexVersion: verified.pointer.previousIndexVersion,
          corpusVersion: verified.pointer.corpusVersion,
          manifestSha256: verified.pointer.manifestSha256,
          embeddingsSha256: verified.pointer.embeddingsSha256,
          chunkCount: verified.pointer.chunkCount,
          vectorBucketName: verified.pointer.vectorBucketName,
          indexName: verified.pointer.indexName
        })}\n`
      );
      return 0;
    }

    if (parsedArgs.mode === 'rollback') {
      const rolledBack = await ingestion.rollbackKnowledgeIndex({
        evidenceBucket,
        vectorBucketName,
        indexName,
        targetIndexVersion: parsedArgs.targetIndexVersion,
        s3Store,
        vectorStore,
        now: dependencies.now
      });
      write(
        `${JSON.stringify({
          mode: 'rollback',
          status: 'completed',
          rolledBackTo: rolledBack.rolledBackTo,
          previousActiveIndexVersion: rolledBack.previousActiveIndexVersion,
          pointer: rolledBack.pointer
        })}\n`
      );
      return 0;
    }

    // Mode === 'ingest'
    let openAiApiKey = dependencies.openAiApiKey ?? env.OPENAI_API_KEY;
    let gatewayToken = dependencies.gatewayToken ?? env.CLOUDFLARE_AI_GATEWAY_RUN_TOKEN;
    if (!openAiApiKey || !gatewayToken) {
      const secrets = await readSecretsManagerCredentials(account, credentials);
      openAiApiKey = openAiApiKey ?? secrets.openAiApiKey;
      gatewayToken = gatewayToken ?? secrets.gatewayToken;
    }

    let config = dependencies.config;
    if (!config) {
      const { loadConfig } = loadConfigModule();
      config = loadConfig({
        AWS_REGION: REGION,
        EDGE_SECRET_ARN: `arn:aws:secretsmanager:${REGION}:${account}:secret:${SECRET_PREFIX}edge-000000`,
        OPENAI_SECRET_ARN: `arn:aws:secretsmanager:${REGION}:${account}:secret:${SECRET_PREFIX}openai-000000`,
        ANTHROPIC_SECRET_ARN: `arn:aws:secretsmanager:${REGION}:${account}:secret:${SECRET_PREFIX}anthropic-000000`,
        GATEWAY_SECRET_ARN: `arn:aws:secretsmanager:${REGION}:${account}:secret:${SECRET_PREFIX}gateway-000000`,
        STATE_TABLE_NAME: `${PREFIX}-state`,
        GATEWAY_ACCOUNT_ID: resolveGatewayAccountId(env),
        GATEWAY_ID: env.GATEWAY_ID ?? PREFIX,
        EVIDENCE_BUCKET_NAME: evidenceBucket,
        VECTOR_BUCKET_NAME: vectorBucketName,
        VECTOR_INDEX_NAME: indexName
      });
    }

    const result = await ingestion.ingestKnowledgeIndex({
      config,
      openAiApiKey,
      gatewayToken,
      evidenceBucket,
      vectorBucketName,
      indexName,
      corpus: dependencies.corpus,
      cag: dependencies.cag,
      chunksManifest: dependencies.chunksManifest,
      force: parsedArgs.force,
      s3Store,
      vectorStore,
      fetchImpl: dependencies.fetchImpl,
      now: dependencies.now
    });

    write(
      `${JSON.stringify({
        mode: 'ingest',
        status: 'completed',
        activeIndexVersion: result.pointer.activeIndexVersion,
        previousIndexVersion: result.pointer.previousIndexVersion,
        corpusVersion: result.corpusVersion,
        manifestSha256: result.manifestSha256,
        embeddingsSha256: result.embeddingsSha256,
        chunkCount: result.chunkCount,
        reusedExisting: result.reusedExisting,
        embeddingCalls: result.embeddingCalls,
        reservedMicros: result.reservedMicros,
        chargedMicros: result.chargedMicros
      })}\n`
    );
    return 0;
  } catch (error) {
    const code =
      error && typeof error.code === 'string' && /^[A-Z0-9_]{3,64}$/.test(error.code)
        ? error.code
        : 'INGESTION_FAILED';
    writeError(`${JSON.stringify({ status: 'failed', code })}\n`);
    return 1;
  }
}

if (require.main === module) {
  runCli(process.argv.slice(2)).then(code => {
    process.exitCode = code;
  });
}

module.exports = {
  parseCliArgs,
  runCli,
  CliUsageError
};
