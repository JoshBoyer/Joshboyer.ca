'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createOperations, runCli, GATEWAY_SETTINGS } = require('../tools/chat-cloud-ops.cjs');

const ACCOUNT = '123456789012';
const CF_ACCOUNT = 'a'.repeat(32);
const PREFIX = '/joshboyer/chat/dev/';
const KEYRING = JSON.stringify({ activeKeyId: 'k1', keys: { k1: Buffer.alloc(32, 7).toString('base64url') } });
const ENV = {
  CLOUDFLARE_ACCOUNT_ID: CF_ACCOUNT,
  CLOUDFLARE_AI_GATEWAY_TOKEN: 'test-only-management-token',
  CLOUDFLARE_AI_GATEWAY_RUN_TOKEN: 'test-only-run-token',
  CLOUDFLARE_API_TOKEN: 'test-only-workers-token',
  OPENAI_API_KEY: 'test-only-openai-key',
  ANTHROPIC_API_KEY: 'test-only-anthropic-key',
  JOSH_CHAT_PROBE_TOKEN: 'test-only-probe-token-' + 'x'.repeat(30)
};

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
}

function gatewayResponse(overrides = {}) {
  return json({ success: true, result: { id: 'joshboyer-chat-dev', ...GATEWAY_SETTINGS, ...overrides } });
}

function awsFixture(options = {}) {
  const values = new Map(['openai', 'anthropic', 'gateway', 'edge'].map(kind => [PREFIX + kind, '{"configured":false}']));
  if (options.empty) for (const name of values.keys()) values.set(name, undefined);
  if (options.keyring) values.set(PREFIX + 'edge', options.keyring);
  const commands = [], processes = [], clientConfigs = [];
  let destroyed = false;
  class GetSecretValueCommand { constructor(input) { this.input = input; } }
  class PutSecretValueCommand { constructor(input) { this.input = input; } }
  class DescribeSecretCommand { constructor(input) { this.input = input; } }
  class ListSecretVersionIdsCommand { constructor(input) { this.input = input; } }
  class SecretsManagerClient {
    constructor(config) { clientConfigs.push(config); }
    async send(command, requestOptions) {
      commands.push(command);
      assert.ok(requestOptions.abortSignal instanceof AbortSignal);
      if (options.failSdk) throw Object.assign(new Error(ENV.OPENAI_API_KEY), { response: ENV });
      const name = command.input.SecretId;
      if (!values.has(name)) throw Object.assign(new Error('Resource missing'), { name: 'ResourceNotFoundException' });
      if (command instanceof GetSecretValueCommand && values.get(name) === undefined) {
        throw Object.assign(new Error('Version missing'), { name: options.getErrorName ?? 'ResourceNotFoundException' });
      }
      if (command instanceof PutSecretValueCommand) values.set(name, command.input.SecretString);
      const result = { Name: name, ARN: `arn:aws:secretsmanager:us-east-2:${ACCOUNT}:secret:${name}-abcdef` };
      if (command instanceof GetSecretValueCommand) result.SecretString = values.get(name);
      if (command instanceof DescribeSecretCommand) result.VersionIdsToStages = values.get(name) === undefined ? {} : { existing: ['AWSCURRENT'] };
      if (command instanceof ListSecretVersionIdsCommand) result.Versions = values.get(name) === undefined ? [] : [{ VersionId: 'existing', VersionStages: ['AWSCURRENT'] }];
      return options.transform ? options.transform(result, command) : result;
    }
    destroy() { destroyed = true; }
  }
  function execute(file, args, processOptions) {
    processes.push({ file, args, options: processOptions });
    if (args[0].includes('wrangler')) {
      if (options.failWrangler) throw Object.assign(new Error(ENV.ANTHROPIC_API_KEY), { stdout: ENV.JOSH_CHAT_PROBE_TOKEN });
      return ENV.JOSH_CHAT_PROBE_TOKEN;
    }
    if (options.failAws) throw Object.assign(new Error(ENV.OPENAI_API_KEY), { stdout: ENV.ANTHROPIC_API_KEY });
    if (args[0] === 'sts') return JSON.stringify({ Account: ACCOUNT });
    return JSON.stringify({ Version: 1, AccessKeyId: 'example-temporary-key', SecretAccessKey: 'test-only-secret',
      SessionToken: 'test-only-session', Expiration: options.expired ? '2000-01-01T00:00:00Z' : '2099-01-01T00:00:00Z' });
  }
  return {
    dependencies: {
      env: { ...ENV, AWS_PROFILE: 'wrong-profile', AWS_REGION: 'wrong-region' }, execute,
      loadSdk: () => ({ SecretsManagerClient, GetSecretValueCommand, PutSecretValueCommand, DescribeSecretCommand, ListSecretVersionIdsCommand }),
      readFile: () => JSON.stringify({ name: 'joshboyer-chat-dev', workers_dev: true }),
      randomBytes: () => Buffer.alloc(32, 9), randomUUID: () => '11111111-1111-4111-8111-111111111111'
    },
    values, commands, processes, clientConfigs, GetSecretValueCommand, PutSecretValueCommand, DescribeSecretCommand, ListSecretVersionIdsCommand,
    get destroyed() { return destroyed; }
  };
}

test('existing gateway is verified without AWS access or mutation', async () => {
  const calls = [];
  const ops = createOperations({ env: ENV, execute() { throw new Error('Unexpected AWS'); }, fetcher: async (url, options) => {
    calls.push({ url, options }); return gatewayResponse();
  } });
  assert.deepEqual(await ops.gateway(), { command: 'gateway', status: 'verified', gatewayId: 'joshboyer-chat-dev' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai-gateway/gateways/joshboyer-chat-dev`);
  assert.equal(calls[0].options.method, 'GET');
  assert.equal(calls[0].options.redirect, 'error');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer ' + ENV.CLOUDFLARE_AI_GATEWAY_TOKEN);
  assert.ok(calls[0].options.signal instanceof AbortSignal);
});

test('gateway is created only after404 and re-read before reporting success', async () => {
  const calls = [];
  const ops = createOperations({ env: ENV, fetcher: async (url, options) => {
    calls.push({ url, options });
    if (calls.length === 1) return json({ error: 'missing' }, 404);
    if (calls.length === 2) return json({ success: true, result: { id: 'joshboyer-chat-dev' } });
    return gatewayResponse();
  } });
  assert.equal((await ops.gateway()).status, 'created');
  assert.deepEqual(calls.map(call => call.options.method), ['GET', 'POST', 'GET']);
  assert.match(calls[1].url, /\/ai-gateway\/gateways$/);
  assert.deepEqual(JSON.parse(calls[1].options.body), { id: 'joshboyer-chat-dev', ...GATEWAY_SETTINGS });
  assert.doesNotMatch(calls[1].options.body, /test-only|provider-key/);
});

test('gateway settings mismatches and authorisation errors never trigger writes', async () => {
  for (const response of [gatewayResponse({ byok_only: false }), gatewayResponse({ logpush: true }), gatewayResponse({ cache_ttl: 1 }), json({ error: ENV.OPENAI_API_KEY }, 403)]) {
    let calls = 0;
    const ops = createOperations({ env: ENV, fetcher: async () => { calls++; return response; } });
    await assert.rejects(ops.gateway(), /GATEWAY_(?:SETTINGS_MISMATCH|READ_FAILED)/);
    assert.equal(calls, 1);
  }
});

test('gateway verification accepts absent retries and rejects any configured retry field', async () => {
  const unconfigured = createOperations({ env: ENV, fetcher: async () => gatewayResponse({
    retry_max_attempts: null, retry_delay: null, retry_backoff: null
  }) });
  assert.equal((await unconfigured.gateway()).status, 'verified');
  for (const override of [
    { retry_max_attempts: 1 }, { retry_max_attempts: 0 }, { retry_delay: 100 }, { retry_backoff: 'constant' }
  ]) {
    const methods = [];
    const ops = createOperations({ env: ENV, fetcher: async (_url, options) => {
      methods.push(options.method);
      return gatewayResponse(override);
    } });
    await assert.rejects(ops.gateway(), { code: 'GATEWAY_RETRIES_CONFIGURED' });
    assert.deepEqual(methods, ['GET']);
  }
  for (const field of ['retry_max_attempts', 'retry_delay', 'retry_backoff']) assert.equal(Object.hasOwn(GATEWAY_SETTINGS, field), false);
});

test('gateway transport and oversized/invalid responses emit only fixed codes', async () => {
  for (const fetcher of [
    async () => { throw new Error(ENV.CLOUDFLARE_AI_GATEWAY_TOKEN); },
    async () => json({ success: false, errors: [ENV.OPENAI_API_KEY] }),
    async () => new Response('x'.repeat(131073)),
    async () => gatewayResponse({ id: 'other' })
  ]) {
    let output = '';
    const status = await runCli(['gateway'], { env: ENV, fetcher, write: value => { output += value; }, writeError: value => { output += value; } });
    assert.equal(status, 1);
    assert.doesNotMatch(output, /test-only|xxxxxxxx/);
    assert.match(output, /"status":"failed"/);
  }
});

test('secret provisioning checks all existing targets, uses temporary credentials and is idempotent', async () => {
  const fixture = awsFixture();
  const ops = createOperations(fixture.dependencies);
  assert.deepEqual(await ops.secrets(), { command: 'secrets', status: 'verified', updated: 4, preserved: 0, edgeKeyring: 'initialised' });
  assert.ok(fixture.commands.slice(0, 4).every(command => command instanceof fixture.GetSecretValueCommand));
  assert.equal(fixture.values.get(PREFIX + 'openai'), ENV.OPENAI_API_KEY);
  assert.equal(fixture.values.get(PREFIX + 'anthropic'), ENV.ANTHROPIC_API_KEY);
  assert.equal(fixture.values.get(PREFIX + 'gateway'), ENV.CLOUDFLARE_AI_GATEWAY_RUN_TOKEN);
  assert.equal(JSON.parse(fixture.values.get(PREFIX + 'edge')).activeKeyId, 'k1');
  const second = await ops.secrets();
  assert.equal(second.updated, 0);
  assert.equal(second.preserved, 4);
  assert.equal(fixture.commands.filter(command => command instanceof fixture.PutSecretValueCommand).length, 4);
  assert.deepEqual(fixture.processes[0].args, ['sts', 'get-caller-identity', '--profile', 'joshboyer-portfolio', '--region', 'us-east-2', '--output', 'json']);
  assert.deepEqual(fixture.processes[1].args, ['configure', 'export-credentials', '--profile', 'joshboyer-portfolio', '--format', 'process']);
  assert.equal(fixture.clientConfigs[0].region, 'us-east-2');
  assert.equal(fixture.clientConfigs[0].maxAttempts, 1);
  assert.equal(fixture.clientConfigs[0].credentials.sessionToken, 'test-only-session');
  await ops.close();
  assert.equal(fixture.destroyed, true);
});

test('a valid existing edge keyring is preserved byte for byte', async () => {
  const fixture = awsFixture({ keyring: KEYRING });
  const result = await createOperations(fixture.dependencies).secrets();
  assert.equal(result.updated, 3);
  assert.equal(result.edgeKeyring, 'preserved');
  assert.equal(fixture.values.get(PREFIX + 'edge'), KEYRING);
});

test('never-populated secrets require exact identity and zero versions including deprecated ones', async () => {
  const fixture = awsFixture({ empty: true });
  const result = await createOperations(fixture.dependencies).secrets();
  assert.equal(result.updated, 4);
  assert.equal(result.edgeKeyring, 'initialised');
  const firstWrite = fixture.commands.findIndex(command => command instanceof fixture.PutSecretValueCommand);
  assert.equal(firstWrite, 12);
  assert.equal(fixture.commands.filter(command => command instanceof fixture.DescribeSecretCommand).length, 4);
  const lists = fixture.commands.filter(command => command instanceof fixture.ListSecretVersionIdsCommand);
  assert.equal(lists.length, 4);
  for (const command of lists) assert.deepEqual(command.input, {
    SecretId: command.input.SecretId, IncludeDeprecated: true, MaxResults: 1
  });
  assert.equal(fixture.values.get(PREFIX + 'openai'), ENV.OPENAI_API_KEY);
  assert.equal(JSON.parse(fixture.values.get(PREFIX + 'edge')).activeKeyId, 'k1');
});

test('empty metadata fields may be omitted, but failed reads never establish an empty secret', async () => {
  const omitted = awsFixture({ empty: true, transform(result) {
    delete result.VersionIdsToStages;
    delete result.Versions;
    return result;
  } });
  assert.equal((await createOperations(omitted.dependencies).secrets()).updated, 4);

  for (const name of ['AccessDeniedException', 'DecryptionFailure', 'InternalServiceError']) {
    const fixture = awsFixture({ empty: true, getErrorName: name });
    await assert.rejects(createOperations(fixture.dependencies).secrets(), { code: 'AWS_SECRET_READ_FAILED' });
    assert.equal(fixture.commands.length, 1);
  }
});

test('missing, malformed, deleted and previously populated secrets cannot be initialised', async () => {
  const cases = [
    { code: 'AWS_SECRET_IDENTITY_MISMATCH', mutate: result => ({ ...result, Name: '/wrong-secret' }) },
    { code: 'AWS_SECRET_IDENTITY_MISMATCH', mutate: result => ({ ...result, ARN: result.ARN.replace(ACCOUNT, '999999999999') }) },
    { code: 'AWS_SECRET_IDENTITY_MISMATCH', mutate: result => ({ ...result, ARN: result.ARN.replace('us-east-2', 'us-east-1') }) },
    { code: 'AWS_SECRET_NOT_EMPTY', mutate: result => ({ ...result, DeletedDate: new Date() }) },
    { code: 'AWS_SECRET_NOT_EMPTY', mutate: result => ({ ...result, VersionIdsToStages: { existing: ['AWSPREVIOUS'] } }) },
    { code: 'AWS_SECRET_NOT_EMPTY', mutate: result => ({ ...result, VersionIdsToStages: null }) },
    { code: 'AWS_SECRET_NOT_EMPTY', mutate: result => ({ ...result, Versions: [{ VersionId: 'deprecated', VersionStages: [] }] }) },
    { code: 'AWS_SECRET_NOT_EMPTY', mutate: result => ({ ...result, Versions: null }) },
    { code: 'AWS_SECRET_NOT_EMPTY', mutate: result => ({ ...result, NextToken: 'more-versions' }) }
  ];
  for (const entry of cases) {
    const fixture = awsFixture({ empty: true, transform: entry.mutate });
    await assert.rejects(createOperations(fixture.dependencies).secrets(), { code: entry.code });
    assert.equal(fixture.commands.filter(command => command instanceof fixture.PutSecretValueCommand).length, 0);
  }
  const missing = awsFixture({ empty: true });
  missing.values.delete(PREFIX + 'gateway');
  await assert.rejects(createOperations(missing.dependencies).secrets(), { code: 'AWS_SECRET_READ_FAILED' });
  assert.equal(missing.commands.filter(command => command instanceof missing.PutSecretValueCommand).length, 0);
});

test('failed metadata reads and mismatched version-list identity cannot authorise initialisation', async () => {
  for (const kind of ['DescribeSecretCommand', 'ListSecretVersionIdsCommand']) {
    const fixture = awsFixture({ empty: true, transform(result, command) {
      if (command.constructor.name === kind) throw Object.assign(new Error('private failure'), { name: 'AccessDeniedException' });
      return result;
    } });
    await assert.rejects(createOperations(fixture.dependencies).secrets(), { code: 'AWS_SECRET_READ_FAILED' });
    assert.equal(fixture.commands.filter(command => command instanceof fixture.PutSecretValueCommand).length, 0);
  }
  const wrongList = awsFixture({ empty: true, transform(result, command) {
    return command.constructor.name === 'ListSecretVersionIdsCommand' ? { ...result, Name: '/other-secret' } : result;
  } });
  await assert.rejects(createOperations(wrongList.dependencies).secrets(), { code: 'AWS_SECRET_IDENTITY_MISMATCH' });
  assert.equal(wrongList.commands.filter(command => command instanceof wrongList.PutSecretValueCommand).length, 0);
});

test('missing inputs or management-token reuse fails before credential export', async () => {
  for (const env of [
    { ...ENV, OPENAI_API_KEY: undefined },
    { ...ENV, ANTHROPIC_API_KEY: 'line\nbreak' },
    { ...ENV, CLOUDFLARE_AI_GATEWAY_RUN_TOKEN: ENV.CLOUDFLARE_AI_GATEWAY_TOKEN },
    { ...ENV, CLOUDFLARE_AI_GATEWAY_RUN_TOKEN: ENV.CLOUDFLARE_API_TOKEN }
  ]) {
    let calls = 0;
    const ops = createOperations({ env, execute() { calls++; throw new Error(); } });
    await assert.rejects(ops.secrets(), /INPUT_|GATEWAY_RUN_TOKEN_REQUIRED/);
    assert.equal(calls, 0);
  }
});

test('credentials incompatible with the runtime cannot replace working secrets', async () => {
  for (const name of ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'CLOUDFLARE_AI_GATEWAY_RUN_TOKEN']) {
    for (const value of ['eightkey', 'x'.repeat(2049), 'invalid:key-value-12345', 'clé-provider-token-12345']) {
      const fixture = awsFixture({ keyring: KEYRING });
      fixture.dependencies.env[name] = value;
      const before = new Map(fixture.values);
      await assert.rejects(createOperations(fixture.dependencies).secrets(), { code: `INPUT_${name}` });
      assert.equal(fixture.processes.length, 0);
      assert.equal(fixture.commands.length, 0);
      assert.deepEqual(fixture.values, before);
    }
  }
});

test('wrong-project secrets, missing resources or invalid edge state cannot cause partial writes', async () => {
  for (const fixture of [
    awsFixture({ transform: result => ({ ...result, ARN: result.ARN.replace(ACCOUNT, '999999999999') }) }),
    awsFixture({ transform: result => ({ ...result, ARN: result.ARN.replace('us-east-2', 'us-east-1') }) }),
    awsFixture({ keyring: 'not-a-keyring' }), awsFixture({ failSdk: true })
  ]) {
    await assert.rejects(createOperations(fixture.dependencies).secrets(), /AWS_SECRET_|EDGE_KEYRING_INVALID/);
    assert.equal(fixture.commands.filter(command => command instanceof fixture.PutSecretValueCommand).length, 0);
  }
  const missing = awsFixture();
  missing.values.delete(PREFIX + 'edge');
  await assert.rejects(createOperations(missing.dependencies).secrets(), /AWS_SECRET_READ_FAILED/);
  assert.equal(missing.commands.filter(command => command instanceof missing.PutSecretValueCommand).length, 0);
});

test('expired credentials are rejected before creating an AWS client', async () => {
  const fixture = awsFixture({ expired: true });
  await assert.rejects(createOperations(fixture.dependencies).secrets(), /AWS_TEMPORARY_CREDENTIALS_REQUIRED/);
  assert.equal(fixture.clientConfigs.length, 0);
});

test('Windows AWS executable fallback is limited to command-not-found', async () => {
  const fixture = awsFixture();
  const baseExecute = fixture.dependencies.execute;
  const files = [];
  fixture.dependencies.platform = 'win32';
  fixture.dependencies.env.LOCALAPPDATA = 'C:/Users/example/AppData/Local';
  fixture.dependencies.execute = (file, args, options) => {
    files.push(file);
    if (file === 'aws') throw Object.assign(new Error('not found'), { code: 'ENOENT' });
    return baseExecute(file, args, options);
  };
  await createOperations(fixture.dependencies).secrets();
  assert.equal(files.length, 4);
  assert.equal(files[1], path.join(fixture.dependencies.env.LOCALAPPDATA, 'Programs/Amazon/AWSCLIV2/aws.exe'));
});

test('edge secret transfer uses only pinned Wrangler, explicit config and protected stdin', async () => {
  const fixture = awsFixture({ keyring: KEYRING });
  const result = await createOperations(fixture.dependencies).edgeSecrets();
  assert.deepEqual(result, { command: 'edge-secrets', status: 'updated', secretCount: 2, worker: 'joshboyer-chat-dev' });
  const child = fixture.processes.find(process => process.args[0].includes('wrangler'));
  assert.equal(child.file, process.execPath);
  assert.match(child.args[0].replaceAll('\\', '/'), /services\/edge\/node_modules\/wrangler\/bin\/wrangler\.js$/);
  assert.deepEqual(child.args.slice(1, 4), ['secret', 'bulk', '--config']);
  assert.match(child.args[4].replaceAll('\\', '/'), /services\/edge\/wrangler\.jsonc$/);
  assert.deepEqual(JSON.parse(child.options.input), { PROBE_TOKEN: ENV.JOSH_CHAT_PROBE_TOKEN, EDGE_KEYRING: KEYRING });
  assert.equal(child.options.env.CLOUDFLARE_ACCOUNT_ID, CF_ACCOUNT);
  assert.equal(child.options.env.CLOUDFLARE_API_TOKEN, ENV.CLOUDFLARE_API_TOKEN);
  assert.equal(child.options.env.OPENAI_API_KEY, undefined);
  assert.equal(child.options.env.ANTHROPIC_API_KEY, undefined);
  assert.equal(child.options.env.JOSH_CHAT_PROBE_TOKEN, undefined);
  assert.equal(child.options.env.CLOUDFLARE_AI_GATEWAY_TOKEN, undefined);
  assert.equal(child.options.windowsHide, true);
  for (const secret of Object.values(ENV).filter(value => value.startsWith('test-only'))) assert.ok(!child.args.join(' ').includes(secret));
});

test('wrong Worker config and uninitialised edge secret prevent Wrangler execution', async () => {
  for (const badConfig of [
    { name: 'josh-boyer-portfolio', workers_dev: true },
    { name: 'joshboyer-chat-dev', workers_dev: true, routes: ['joshboyer.ca/*'] },
    { name: 'joshboyer-chat-dev', workers_dev: true, account_id: 'b'.repeat(32) }
  ]) {
    const fixture = awsFixture({ keyring: KEYRING });
    fixture.dependencies.readFile = () => JSON.stringify(badConfig);
    await assert.rejects(createOperations(fixture.dependencies).edgeSecrets(), /EDGE_CONFIG_INVALID/);
    assert.equal(fixture.processes.length, 0);
  }
  const fixture = awsFixture();
  await assert.rejects(createOperations(fixture.dependencies).edgeSecrets(), /EDGE_KEYRING_INVALID/);
  assert.ok(fixture.processes.every(process => !process.args[0].includes('wrangler')));
});

test('CLI masks SDK, child-process and authentication errors without stdout or stack leakage', async () => {
  for (const [command, fixture] of [
    ['secrets', awsFixture({ failSdk: true })],
    ['secrets', awsFixture({ failAws: true })],
    ['edge-secrets', awsFixture({ keyring: KEYRING, failWrangler: true })]
  ]) {
    let output = '';
    const status = await runCli([command], { ...fixture.dependencies, write: value => { output += value; }, writeError: value => { output += value; } });
    assert.equal(status, 1);
    assert.doesNotMatch(output, /test-only|SecretAccessKey|SessionToken|stack|stdout/);
    assert.match(output, /"status":"failed"/);
  }
});

test('CLI rejects arbitrary command arguments before any cloud operation', async () => {
  let output = '', calls = 0;
  const status = await runCli(['secrets', '--profile', 'other'], {
    env: ENV, execute() { calls++; }, fetcher() { calls++; },
    write: value => { output += value; }, writeError: value => { output += value; }
  });
  assert.equal(status, 1);
  assert.equal(calls, 0);
  assert.match(output, /USAGE_/);
});
