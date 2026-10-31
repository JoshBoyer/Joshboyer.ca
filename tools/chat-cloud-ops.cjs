'use strict';

const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const REGION = 'us-east-2';
const PROFILE = 'joshboyer-portfolio';
const GATEWAY_ID = 'joshboyer-chat-dev';
const SECRET_PREFIX = '/joshboyer/chat/dev/';
const GATEWAY_SETTINGS = Object.freeze({
  authentication: true, byok_only: true, cache_ttl: 0,
  cache_invalidate_on_update: true, collect_logs: true,
  rate_limiting_interval: 60, rate_limiting_limit: 20,
  rate_limiting_technique: 'fixed', logpush: false
});

class OperationError extends Error {
  constructor(code) {
    super(code);
    this.name = 'OperationError';
    this.code = code;
  }
}

function requireCondition(condition, code) {
  if (!condition) throw new OperationError(code);
}

function secretInput(env, name) {
  const value = env[name];
  requireCondition(typeof value === 'string' && value.length >= 8 && value.length <= 8192 &&
    !/\s/.test(value) && ![...value].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127), `INPUT_${name}`);
  return value;
}

function runtimeCredential(env, name) {
  const value = secretInput(env, name);
  // Reject values the Lambda cannot use before replacing any working secret.
  requireCondition(/^[A-Za-z0-9_.-]{16,2048}$/.test(value), `INPUT_${name}`);
  return value;
}

function accountInput(env) {
  const value = env.CLOUDFLARE_ACCOUNT_ID;
  requireCondition(typeof value === 'string' && /^[a-f0-9]{32}$/.test(value), 'INPUT_CLOUDFLARE_ACCOUNT_ID');
  return value;
}

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validKeyring(raw) {
  let value;
  try { value = JSON.parse(raw); } catch { throw new OperationError('EDGE_KEYRING_INVALID'); }
  requireCondition(raw.length <= 512 && record(value) && Object.keys(value).sort().join(',') === 'activeKeyId,keys' &&
    typeof value.activeKeyId === 'string' && record(value.keys), 'EDGE_KEYRING_INVALID');
  const entries = Object.entries(value.keys);
  requireCondition(entries.length >= 1 && entries.length <= 2 && Object.hasOwn(value.keys, value.activeKeyId), 'EDGE_KEYRING_INVALID');
  for (const [id, encoded] of entries) {
    requireCondition(/^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(id) && typeof encoded === 'string' && /^[A-Za-z0-9_-]{43,86}$/.test(encoded), 'EDGE_KEYRING_INVALID');
    const bytes = Buffer.from(encoded, 'base64url');
    requireCondition(bytes.length >= 32 && bytes.length <= 64 && bytes.toString('base64url') === encoded, 'EDGE_KEYRING_INVALID');
  }
  return raw;
}

function isPlaceholder(raw) {
  try {
    const value = JSON.parse(raw);
    return record(value) && Object.keys(value).length === 1 && value.configured === false;
  } catch { return false; }
}

async function responseJson(response) {
  requireCondition(response.body, 'CLOUDFLARE_RESPONSE_INVALID');
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > 131072) {
        await reader.cancel();
        throw new OperationError('CLOUDFLARE_RESPONSE_INVALID');
      }
      chunks.push(Buffer.from(next.value));
    }
    const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    requireCondition(record(result) && result.success === true && record(result.result), 'CLOUDFLARE_RESPONSE_INVALID');
    return result.result;
  } catch (error) {
    if (error instanceof OperationError) throw error;
    throw new OperationError('CLOUDFLARE_RESPONSE_INVALID');
  } finally { reader.releaseLock(); }
}

function createOperations(dependencies = {}) {
  const env = dependencies.env ?? process.env;
  const fetcher = dependencies.fetcher ?? fetch;
  const execute = dependencies.execute ?? execFileSync;
  const readFile = dependencies.readFile ?? fs.readFileSync;
  const randomBytes = dependencies.randomBytes ?? crypto.randomBytes;
  const randomUUID = dependencies.randomUUID ?? crypto.randomUUID;
  const now = dependencies.now ?? Date.now;
  const platform = dependencies.platform ?? process.platform;
  const loadSdk = dependencies.loadSdk ?? (() => createRequire(path.join(ROOT, 'services/chat/package.json'))('@aws-sdk/client-secrets-manager'));
  let awsPromise;

  function awsCommand(args) {
    const options = { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000, maxBuffer: 1048576 };
    try { return execute('aws', args, options); } catch (error) {
      if (error.code !== 'ENOENT' || platform !== 'win32' || !env.LOCALAPPDATA) throw new OperationError('AWS_AUTH_FAILED');
      try { return execute(path.join(env.LOCALAPPDATA, 'Programs/Amazon/AWSCLIV2/aws.exe'), args, options); }
      catch { throw new OperationError('AWS_AUTH_FAILED'); }
    }
  }

  async function aws() {
    if (!awsPromise) awsPromise = (async () => {
      let identity, exported;
      try {
        identity = JSON.parse(awsCommand(['sts', 'get-caller-identity', '--profile', PROFILE, '--region', REGION, '--output', 'json']));
        exported = JSON.parse(awsCommand(['configure', 'export-credentials', '--profile', PROFILE, '--format', 'process']));
      } catch { throw new OperationError('AWS_AUTH_FAILED'); }
      requireCondition(record(identity) && /^[0-9]{12}$/.test(identity.Account), 'AWS_IDENTITY_INVALID');
      requireCondition(record(exported) && exported.Version === 1 &&
        ['AccessKeyId', 'SecretAccessKey', 'SessionToken'].every(key => typeof exported[key] === 'string' && exported[key].length > 0) &&
        Number.isFinite(Date.parse(exported.Expiration)) && Date.parse(exported.Expiration) > now() + 30000, 'AWS_TEMPORARY_CREDENTIALS_REQUIRED');
      let sdk;
      try { sdk = loadSdk(); } catch { throw new OperationError('AWS_SDK_UNAVAILABLE'); }
      const client = new sdk.SecretsManagerClient({
        region: REGION, maxAttempts: 1,
        credentials: {
          accessKeyId: exported.AccessKeyId, secretAccessKey: exported.SecretAccessKey,
          sessionToken: exported.SessionToken, expiration: new Date(exported.Expiration)
        }
      });
      return { client, sdk, account: identity.Account };
    })();
    return awsPromise;
  }

  function checkSecretIdentity(result, name, account) {
    requireCondition(record(result) && result.Name === name && typeof result.ARN === 'string' &&
      new RegExp(`^arn:aws:secretsmanager:${REGION}:${account}:secret:${name}-[A-Za-z0-9]{6}$`).test(result.ARN), 'AWS_SECRET_IDENTITY_MISMATCH');
  }

  async function confirmEmptySecret(connection, name) {
    let description;
    try {
      description = await connection.client.send(new connection.sdk.DescribeSecretCommand({ SecretId: name }), { abortSignal: AbortSignal.timeout(15000) });
    } catch { throw new OperationError('AWS_SECRET_READ_FAILED'); }
    checkSecretIdentity(description, name, connection.account);
    requireCondition(description.DeletedDate === undefined &&
      (description.VersionIdsToStages === undefined || record(description.VersionIdsToStages) && Object.keys(description.VersionIdsToStages).length === 0), 'AWS_SECRET_NOT_EMPTY');
    let versions;
    try {
      // DescribeSecret omits unlabelled versions. Include them so lost AWSCURRENT
      // labels never turn an existing credential into permission to initialise it.
      versions = await connection.client.send(new connection.sdk.ListSecretVersionIdsCommand({
        SecretId: name, IncludeDeprecated: true, MaxResults: 1
      }), { abortSignal: AbortSignal.timeout(15000) });
    } catch { throw new OperationError('AWS_SECRET_READ_FAILED'); }
    checkSecretIdentity(versions, name, connection.account);
    requireCondition(versions.NextToken === undefined &&
      (versions.Versions === undefined || Array.isArray(versions.Versions) && versions.Versions.length === 0), 'AWS_SECRET_NOT_EMPTY');
    return '{"configured":false}';
  }

  async function getSecret(connection, kind) {
    const name = SECRET_PREFIX + kind;
    let result;
    try {
      result = await connection.client.send(new connection.sdk.GetSecretValueCommand({ SecretId: name, VersionStage: 'AWSCURRENT' }), { abortSignal: AbortSignal.timeout(15000) });
    } catch (error) {
      if (error?.name === 'ResourceNotFoundException') return confirmEmptySecret(connection, name);
      throw new OperationError('AWS_SECRET_READ_FAILED');
    }
    checkSecretIdentity(result, name, connection.account);
    requireCondition(typeof result.SecretString === 'string' && result.SecretString.length > 0 && result.SecretString.length <= 8192, 'AWS_SECRET_VALUE_INVALID');
    return result.SecretString;
  }

  async function putSecret(connection, kind, value) {
    let result;
    const name = SECRET_PREFIX + kind;
    try {
      result = await connection.client.send(new connection.sdk.PutSecretValueCommand({
        SecretId: name, SecretString: value, ClientRequestToken: randomUUID()
      }), { abortSignal: AbortSignal.timeout(15000) });
    } catch { throw new OperationError('AWS_SECRET_WRITE_FAILED'); }
    checkSecretIdentity(result, name, connection.account);
    requireCondition(await getSecret(connection, kind) === value, 'AWS_SECRET_VERIFY_FAILED');
  }

  async function gateway() {
    const account = accountInput(env);
    const token = secretInput(env, 'CLOUDFLARE_AI_GATEWAY_TOKEN');
    const collection = `https://api.cloudflare.com/client/v4/accounts/${account}/ai-gateway/gateways`;
    const endpoint = collection + '/' + GATEWAY_ID;
    async function call(url, method = 'GET', body) {
      try {
        return await fetcher(url, {
          method, redirect: 'error', signal: AbortSignal.timeout(20000),
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          ...(body ? { body: JSON.stringify(body) } : {})
        });
      } catch { throw new OperationError('CLOUDFLARE_REQUEST_FAILED'); }
    }
    let response = await call(endpoint);
    let created = false;
    if (response.status === 404) {
      await response.body?.cancel();
      const creation = await call(collection, 'POST', { id: GATEWAY_ID, ...GATEWAY_SETTINGS });
      if (!creation.ok) {
        await creation.body?.cancel();
        throw new OperationError('GATEWAY_CREATE_FAILED');
      }
      await responseJson(creation);
      created = true;
      response = await call(endpoint);
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new OperationError('GATEWAY_READ_FAILED');
    }
    const result = await responseJson(response);
    requireCondition(result.id === GATEWAY_ID, 'GATEWAY_IDENTITY_MISMATCH');
    requireCondition(['retry_max_attempts', 'retry_delay', 'retry_backoff'].every(key =>
      result[key] === null || result[key] === undefined), 'GATEWAY_RETRIES_CONFIGURED');
    requireCondition(Object.entries(GATEWAY_SETTINGS).every(([key, value]) => result[key] === value), 'GATEWAY_SETTINGS_MISMATCH');
    return { command: 'gateway', status: created ? 'created' : 'verified', gatewayId: GATEWAY_ID };
  }

  async function secrets() {
    const desired = {
      openai: runtimeCredential(env, 'OPENAI_API_KEY'),
      anthropic: runtimeCredential(env, 'ANTHROPIC_API_KEY'),
      gateway: runtimeCredential(env, 'CLOUDFLARE_AI_GATEWAY_RUN_TOKEN')
    };
    requireCondition(desired.gateway !== env.CLOUDFLARE_AI_GATEWAY_TOKEN && desired.gateway !== env.CLOUDFLARE_API_TOKEN, 'GATEWAY_RUN_TOKEN_REQUIRED');
    const connection = await aws();
    const existing = {};
    // Check every target and the existing edge keyring before changing any secret.
    for (const kind of ['openai', 'anthropic', 'gateway', 'edge']) existing[kind] = await getSecret(connection, kind);
    const initialiseEdge = isPlaceholder(existing.edge);
    desired.edge = initialiseEdge
      ? JSON.stringify({ activeKeyId: 'k1', keys: { k1: randomBytes(32).toString('base64url') } })
      : validKeyring(existing.edge);
    validKeyring(desired.edge);
    let updated = 0;
    for (const [kind, value] of Object.entries(desired)) {
      if (existing[kind] === value) continue;
      await putSecret(connection, kind, value);
      updated++;
    }
    return { command: 'secrets', status: 'verified', updated, preserved: 4 - updated, edgeKeyring: initialiseEdge ? 'initialised' : 'preserved' };
  }

  async function edgeSecrets() {
    const token = secretInput(env, 'JOSH_CHAT_PROBE_TOKEN');
    requireCondition(/^[A-Za-z0-9_-]{43,128}$/.test(token), 'INPUT_JOSH_CHAT_PROBE_TOKEN');
    const account = accountInput(env);
    const cloudflareToken = secretInput(env, 'CLOUDFLARE_API_TOKEN');
    const configFile = path.join(ROOT, 'services/edge/wrangler.jsonc');
    let config;
    try { config = JSON.parse(readFile(configFile, 'utf8')); } catch { throw new OperationError('EDGE_CONFIG_INVALID'); }
    requireCondition(config.name === GATEWAY_ID && config.workers_dev === true && !config.routes && !config.env &&
      (!config.account_id || config.account_id === account), 'EDGE_CONFIG_INVALID');
    const connection = await aws();
    const keyring = validKeyring(await getSecret(connection, 'edge'));
    const childEnv = { ...env, CLOUDFLARE_API_TOKEN: cloudflareToken, CLOUDFLARE_ACCOUNT_ID: account, WRANGLER_SEND_METRICS: 'false', WRANGLER_LOG: 'error', CI: 'true' };
    for (const name of ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'CLOUDFLARE_AI_GATEWAY_TOKEN', 'CLOUDFLARE_AI_GATEWAY_RUN_TOKEN', 'JOSH_CHAT_PROBE_TOKEN', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'DEBUG']) delete childEnv[name];
    try {
      execute(process.execPath, [path.join(ROOT, 'services/edge/node_modules/wrangler/bin/wrangler.js'),
        'secret', 'bulk', '--config', configFile], {
        cwd: ROOT, encoding: 'utf8', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 90000, maxBuffer: 1048576, env: childEnv,
        input: JSON.stringify({ PROBE_TOKEN: token, EDGE_KEYRING: keyring })
      });
    } catch { throw new OperationError('EDGE_SECRET_WRITE_FAILED'); }
    return { command: 'edge-secrets', status: 'updated', secretCount: 2, worker: GATEWAY_ID };
  }

  async function close() {
    if (awsPromise) {
      try { (await awsPromise).client.destroy(); } catch { /* Preserve the original sanitised failure. */ }
    }
  }

  return { gateway, secrets, edgeSecrets, close };
}

async function runCli(args, dependencies = {}) {
  const write = dependencies.write ?? (value => process.stdout.write(value));
  const writeError = dependencies.writeError ?? (value => process.stderr.write(value));
  const operations = createOperations(dependencies);
  try {
    requireCondition(args.length === 1 && ['gateway', 'secrets', 'edge-secrets'].includes(args[0]), 'USAGE_gateway_secrets_edge-secrets');
    const command = { gateway: 'gateway', secrets: 'secrets', 'edge-secrets': 'edgeSecrets' }[args[0]];
    write(JSON.stringify(await operations[command]()) + '\n');
    return 0;
  } catch (error) {
    writeError(JSON.stringify({ status: 'failed', code: error instanceof OperationError ? error.code : 'OPERATION_FAILED' }) + '\n');
    return 1;
  } finally { await operations.close(); }
}

if (require.main === module) {
  runCli(process.argv.slice(2)).then(code => { process.exitCode = code; });
}

module.exports = { createOperations, runCli, OperationError, GATEWAY_SETTINGS };
