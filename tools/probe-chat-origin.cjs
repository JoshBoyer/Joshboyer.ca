'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const REGION = 'us-east-2';
const PROFILE = 'joshboyer-portfolio';
const STACK = 'PortfolioChatDev';
const TABLE = 'joshboyer-chat-dev-state';
const EDGE_SECRET = '/joshboyer/chat/dev/edge';
const PROBE_PATH = '/api/chat/_probe';
const VALID_BODY = '{"provider":"openai"}';
const INVALID_BODY = '{"negativeProbe":true}';
const HTTP_PACING_MS = 1100;

class ProbeError extends Error {
  constructor(code, observedStatus) {
    super(code);
    this.name = 'ProbeError';
    this.code = code;
    if (observedStatus !== undefined) this.observedStatus = observedStatus;
  }
}

function ensure(condition, code) { if (!condition) throw new ProbeError(code); }
function record(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }

function parseKeyring(raw) {
  let data;
  try { data = JSON.parse(raw); } catch { throw new ProbeError('EDGE_KEYRING_INVALID'); }
  ensure(typeof raw === 'string' && raw.length <= 512 && record(data) &&
    Object.keys(data).sort().join(',') === 'activeKeyId,keys' && record(data.keys) &&
    typeof data.activeKeyId === 'string' && Object.hasOwn(data.keys, data.activeKeyId), 'EDGE_KEYRING_INVALID');
  const entries = Object.entries(data.keys);
  ensure(entries.length >= 1 && entries.length <= 2, 'EDGE_KEYRING_INVALID');
  for (const [id, encoded] of entries) {
    ensure(/^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(id) && typeof encoded === 'string' && /^[A-Za-z0-9_-]{43,86}$/.test(encoded), 'EDGE_KEYRING_INVALID');
    const bytes = Buffer.from(encoded, 'base64url');
    ensure(bytes.length >= 32 && bytes.length <= 64 && bytes.toString('base64url') === encoded, 'EDGE_KEYRING_INVALID');
  }
  return data;
}

function signedHeaders(keyring, timestamp, nonce, signedBody) {
  ensure(Number.isSafeInteger(timestamp) && timestamp > 0 &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(nonce), 'PROBE_ENVELOPE_INVALID');
  const keyId = keyring.activeKeyId;
  const digest = crypto.createHash('sha256').update(signedBody).digest('hex');
  const canonical = ['chat-edge-v1', keyId, String(timestamp), nonce, 'POST', PROBE_PATH, digest, 'phase2-operator'].join('\n');
  return {
    'content-type': 'application/json', 'x-chat-key-id': keyId,
    'x-chat-timestamp': String(timestamp), 'x-chat-nonce': nonce,
    'x-chat-body-sha256': digest, 'x-chat-context': 'phase2-operator',
    'x-chat-signature': crypto.createHmac('sha256', Buffer.from(keyring.keys[keyId], 'base64url')).update(canonical).digest('base64url')
  };
}

async function boundedResponse(response, signal) {
  ensure(response.body, 'ORIGIN_RESPONSE_INVALID');
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', abort, { once: true });
  try {
    while (true) {
      signal.throwIfAborted();
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      ensure(size <= 4096, 'ORIGIN_RESPONSE_INVALID');
      chunks.push(Buffer.from(part.value));
    }
    signal.throwIfAborted();
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    ensure(record(data), 'ORIGIN_RESPONSE_INVALID');
    return data;
  } catch (error) {
    if (error instanceof ProbeError) throw error;
    throw new ProbeError('ORIGIN_RESPONSE_INVALID');
  } finally {
    signal.removeEventListener('abort', abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

function createProbe(dependencies = {}) {
  const env = dependencies.env ?? process.env;
  const execute = dependencies.execute ?? execFileSync;
  const fetcher = dependencies.fetcher ?? fetch;
  const now = dependencies.now ?? Date.now;
  const sleep = dependencies.sleep ?? (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)));
  const randomUUID = dependencies.randomUUID ?? crypto.randomUUID;
  const platform = dependencies.platform ?? process.platform;
  const loadSdk = dependencies.loadSdk ?? (() => {
    const requireService = createRequire(path.join(ROOT, 'services/chat/package.json'));
    return { ...requireService('@aws-sdk/client-secrets-manager'), ...requireService('@aws-sdk/client-dynamodb') };
  });
  let clients = [];

  function awsCommand(args) {
    const options = { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000, maxBuffer: 1048576 };
    try { return execute('aws', args, options); } catch (error) {
      if (error.code !== 'ENOENT' || platform !== 'win32' || !env.LOCALAPPDATA) throw new ProbeError('AWS_COMMAND_FAILED');
      try { return execute(path.join(env.LOCALAPPDATA, 'Programs/Amazon/AWSCLIV2/aws.exe'), args, options); }
      catch { throw new ProbeError('AWS_COMMAND_FAILED'); }
    }
  }

  function commandJson(args) {
    try { return JSON.parse(awsCommand(args)); }
    catch (error) { if (error instanceof ProbeError) throw error; throw new ProbeError('AWS_RESPONSE_INVALID'); }
  }

  async function verify() {
    const origin = env.AWS_ORIGIN;
    ensure(typeof origin === 'string' && /^https:\/\/[a-z0-9]{10}\.execute-api\.us-east-2\.amazonaws\.com\/dev$/.test(origin), 'AWS_ORIGIN_INVALID');
    const identity = commandJson(['sts', 'get-caller-identity', '--profile', PROFILE, '--region', REGION, '--output', 'json']);
    ensure(record(identity) && /^\d{12}$/.test(identity.Account), 'AWS_IDENTITY_INVALID');
    const exported = commandJson(['configure', 'export-credentials', '--profile', PROFILE, '--format', 'process']);
    ensure(record(exported) && exported.Version === 1 && ['AccessKeyId', 'SecretAccessKey', 'SessionToken'].every(name =>
      typeof exported[name] === 'string' && exported[name].length > 0) &&
      Number.isFinite(Date.parse(exported.Expiration)) && Date.parse(exported.Expiration) > now() + 30000, 'AWS_TEMPORARY_CREDENTIALS_REQUIRED');
    const stackResponse = commandJson(['cloudformation', 'describe-stacks', '--stack-name', STACK,
      '--profile', PROFILE, '--region', REGION, '--output', 'json']);
    ensure(record(stackResponse) && Array.isArray(stackResponse.Stacks) && stackResponse.Stacks.length === 1, 'AWS_STACK_INVALID');
    const stack = stackResponse.Stacks[0];
    ensure(record(stack) && stack.StackName === STACK &&
      typeof stack.StackId === 'string' && stack.StackId.startsWith(`arn:aws:cloudformation:${REGION}:${identity.Account}:stack/${STACK}/`) &&
      ['CREATE_COMPLETE', 'UPDATE_COMPLETE', 'UPDATE_ROLLBACK_COMPLETE'].includes(stack.StackStatus) && Array.isArray(stack.Outputs), 'AWS_STACK_INVALID');
    const output = name => stack.Outputs.filter(row => row.OutputKey === name).map(row => row.OutputValue);
    ensure(JSON.stringify(output('ProbeUrl')) === JSON.stringify([origin + PROBE_PATH]) &&
      JSON.stringify(output('StateTableName')) === JSON.stringify([TABLE]), 'AWS_STACK_TARGET_MISMATCH');
    let sdk;
    try { sdk = loadSdk(); } catch { throw new ProbeError('AWS_SDK_UNAVAILABLE'); }
    const clientConfig = { region: REGION, maxAttempts: 1, credentials: {
      accessKeyId: exported.AccessKeyId, secretAccessKey: exported.SecretAccessKey,
      sessionToken: exported.SessionToken, expiration: new Date(exported.Expiration)
    } };
    const secrets = new sdk.SecretsManagerClient(clientConfig);
    const dynamo = new sdk.DynamoDBClient(clientConfig);
    clients = [secrets, dynamo];
    let secret, table;
    try {
      secret = await secrets.send(new sdk.GetSecretValueCommand({ SecretId: EDGE_SECRET, VersionStage: 'AWSCURRENT' }), { abortSignal: AbortSignal.timeout(15000) });
      table = await dynamo.send(new sdk.DescribeTableCommand({ TableName: TABLE }), { abortSignal: AbortSignal.timeout(15000) });
    } catch { throw new ProbeError('AWS_TARGET_READ_FAILED'); }
    ensure(record(secret) && secret.Name === EDGE_SECRET && typeof secret.ARN === 'string' &&
      new RegExp(`^arn:aws:secretsmanager:${REGION}:${identity.Account}:secret:${EDGE_SECRET}-[A-Za-z0-9]{6}$`).test(secret.ARN), 'EDGE_SECRET_IDENTITY_MISMATCH');
    const keyring = parseKeyring(secret.SecretString);
    ensure(record(table.Table) && table.Table.TableName === TABLE &&
      table.Table.TableArn === `arn:aws:dynamodb:${REGION}:${identity.Account}:table/${TABLE}` &&
      table.Table.TableStatus === 'ACTIVE', 'STATE_TABLE_IDENTITY_MISMATCH');
    const checks = [];
    async function check(name, headers, body, expectedStatus, expectedCode) {
      // Leave room for the API stage's one-request-per-second token refill.
      if (checks.length) await sleep(HTTP_PACING_MS);
      const signal = AbortSignal.timeout(20000);
      let response;
      try { response = await fetcher(origin + PROBE_PATH, { method: 'POST', headers, body, redirect: 'error', signal }); }
      catch { throw new ProbeError('ORIGIN_REQUEST_FAILED'); }
      if (response.status !== expectedStatus) {
        await response.body?.cancel();
        throw new ProbeError(`UNEXPECTED_${name.toUpperCase()}_STATUS`, response.status);
      }
      const data = await boundedResponse(response, signal);
      if (expectedCode) ensure(data.error === expectedCode && data.chargeStatus === 'not_started', `UNEXPECTED_${name.toUpperCase()}_BODY`);
      const requestId = response.headers.get('x-amzn-requestid');
      checks.push({ check: name, status: response.status, passed: true,
        ...(requestId && /^[A-Za-z0-9-]{1,128}$/.test(requestId) ? { requestId } : {}) });
    }
    // Invalid bodies provide a second barrier if authorisation is accidentally weakened.
    await check('unsigned', { 'content-type': 'application/json' }, INVALID_BODY, 401);
    await check('expired', signedHeaders(keyring, Math.floor(now() / 1000) - 120, randomUUID(), INVALID_BODY), INVALID_BODY, 401);
    await check('tampered', signedHeaders(keyring, Math.floor(now() / 1000), randomUUID(), VALID_BODY), INVALID_BODY, 403, 'UNAUTHORISED');
    const nonce = randomUUID();
    const timestamp = Math.floor(now() / 1000);
    // Only seed a fresh nonce in the verified project table; never overwrite or
    // delete existing state. The backend must reject it before inference.
    try {
      await dynamo.send(new sdk.PutItemCommand({
        TableName: TABLE,
        Item: { pk: { S: `NONCE#${keyring.activeKeyId}#${nonce}` }, sk: { S: 'REPLAY' }, expiresAt: { N: String(timestamp + 120) } },
        ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)'
      }), { abortSignal: AbortSignal.timeout(15000) });
    } catch { throw new ProbeError('NONCE_SEED_FAILED'); }
    await check('replay', signedHeaders(keyring, timestamp, nonce, VALID_BODY), VALID_BODY, 403, 'REPLAY_REJECTED');
    return { status: 'verified', scope: 'negative-origin-probes', region: REGION, checks, seededNonces: 1 };
  }

  function close() { for (const client of clients) client.destroy(); clients = []; }
  return { verify, close };
}

async function runCli(args, dependencies = {}) {
  const write = dependencies.write ?? (value => process.stdout.write(value));
  const writeError = dependencies.writeError ?? (value => process.stderr.write(value));
  const probe = createProbe(dependencies);
  try {
    ensure(args.length === 1 && args[0] === 'verify', 'USAGE_verify');
    write(JSON.stringify(await probe.verify()) + '\n');
    return 0;
  } catch (error) {
    writeError(JSON.stringify({ status: 'failed', code: error instanceof ProbeError ? error.code : 'PROBE_FAILED',
      ...(error instanceof ProbeError && error.observedStatus !== undefined ? { observedStatus: error.observedStatus } : {}) }) + '\n');
    return 1;
  } finally { probe.close(); }
}

if (require.main === module) runCli(process.argv.slice(2)).then(code => { process.exitCode = code; });
module.exports = { createProbe, runCli, signedHeaders, parseKeyring, ProbeError };
