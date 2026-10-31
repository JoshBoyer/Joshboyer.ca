'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createProbe, runCli, signedHeaders, parseKeyring } = require('../tools/probe-chat-origin.cjs');

const NOW = 1793443200000;
const ACCOUNT = '123456789012';
const TABLE = 'joshboyer-chat-dev-state';
const SECRET = '/joshboyer/chat/dev/edge';
const ORIGIN = 'https://abc1234567.execute-api.us-east-2.amazonaws.com/dev';
const KEY = Buffer.from(Array.from({ length: 32 }, (_, i) => i));
const KEYRING = JSON.stringify({ activeKeyId: 'k1', keys: { k1: KEY.toString('base64url') } });

function fixture(options = {}) {
  const processes = [], commands = [], requests = [], clientConfigs = [], seeds = [], pauses = [];
  let destroyed = 0, uuid = 0;
  class GetSecretValueCommand { constructor(input) { this.input = input; } }
  class DescribeTableCommand { constructor(input) { this.input = input; } }
  class PutItemCommand { constructor(input) { this.input = input; } }
  class SecretsManagerClient {
    constructor(config) { clientConfigs.push(config); }
    async send(command, requestOptions) {
      commands.push(command);
      assert.ok(requestOptions.abortSignal instanceof AbortSignal);
      assert.deepEqual(command.input, { SecretId: SECRET, VersionStage: 'AWSCURRENT' });
      return { Name: SECRET, ARN: `arn:aws:secretsmanager:us-east-2:${options.secretAccount ?? ACCOUNT}:secret:${SECRET}-abcdef`, SecretString: KEYRING };
    }
    destroy() { destroyed++; }
  }
  class DynamoDBClient {
    constructor(config) { clientConfigs.push(config); }
    async send(command, requestOptions) {
      commands.push(command);
      assert.ok(requestOptions.abortSignal instanceof AbortSignal);
      assert.equal(command.input.TableName, TABLE);
      if (command instanceof DescribeTableCommand) return { Table: {
        TableName: TABLE, TableArn: `arn:aws:dynamodb:us-east-2:${options.tableAccount ?? ACCOUNT}:table/${TABLE}`, TableStatus: 'ACTIVE'
      } };
      assert.ok(command instanceof PutItemCommand);
      if (options.seedFails) throw new Error('private SDK failure');
      seeds.push(command.input);
      return {};
    }
    destroy() { destroyed++; }
  }
  const dependencies = {
    env: { AWS_ORIGIN: ORIGIN, AWS_PROFILE: 'ignored-profile', AWS_REGION: 'ignored-region' },
    now: () => NOW,
    sleep: async milliseconds => { pauses.push({ milliseconds, requests: requests.length }); },
    randomUUID: () => `11111111-1111-4111-8111-${String(++uuid).padStart(12, '0')}`,
    loadSdk: () => ({ SecretsManagerClient, DynamoDBClient, GetSecretValueCommand, DescribeTableCommand, PutItemCommand }),
    execute(file, args, processOptions) {
      processes.push({ file, args, options: processOptions });
      if (options.executeFails) throw new Error('private credential in CLI error');
      if (args[0] === 'sts') return JSON.stringify({ Account: ACCOUNT });
      if (args[0] === 'configure') return JSON.stringify({ Version: 1, AccessKeyId: 'temporary-test-id', SecretAccessKey: 'temporary-test-secret', SessionToken: 'temporary-test-session', Expiration: options.expired ? '2000-01-01T00:00:00Z' : '2099-01-01T00:00:00Z' });
      assert.equal(args[0], 'cloudformation');
      return JSON.stringify({ Stacks: [{
        StackName: 'PortfolioChatDev', StackId: `arn:aws:cloudformation:us-east-2:${options.stackAccount ?? ACCOUNT}:stack/PortfolioChatDev/test`,
        StackStatus: 'CREATE_COMPLETE', Outputs: [
          { OutputKey: 'ProbeUrl', OutputValue: (options.stackOrigin ?? ORIGIN) + '/api/chat/_probe' },
          { OutputKey: 'StateTableName', OutputValue: options.stackTable ?? TABLE }
        ]
      }] });
    },
    async fetcher(url, init) {
      requests.push({ url, init });
      assert.equal(url, ORIGIN + '/api/chat/_probe');
      assert.equal(init.method, 'POST'); assert.equal(init.redirect, 'error');
      assert.ok(init.signal instanceof AbortSignal);
      if (options.unexpectedStatus) return new Response('do not display response', { status: options.unexpectedStatus });
      if (options.hugeResponse) return new Response('x'.repeat(4097), { status: 401 });
      const headers = init.headers;
      if (!headers['x-chat-signature']) {
        assert.deepEqual(JSON.parse(init.body), { negativeProbe: true });
        return Response.json({ error: 'request_rejected' }, { status: 401 });
      }
      const canonical = ['chat-edge-v1', headers['x-chat-key-id'], headers['x-chat-timestamp'], headers['x-chat-nonce'], 'POST', '/api/chat/_probe', headers['x-chat-body-sha256'], 'phase2-operator'].join('\n');
      assert.equal(headers['x-chat-signature'], crypto.createHmac('sha256', KEY).update(canonical).digest('base64url'));
      if (Number(headers['x-chat-timestamp']) < NOW / 1000 - 60) {
        assert.deepEqual(JSON.parse(init.body), { negativeProbe: true });
        return Response.json({ error: 'request_rejected' }, { status: 401 });
      }
      if (crypto.createHash('sha256').update(init.body).digest('hex') !== headers['x-chat-body-sha256']) {
        assert.deepEqual(JSON.parse(init.body), { negativeProbe: true });
        return Response.json({ error: 'UNAUTHORISED', chargeStatus: 'not_started' }, { status: 403 });
      }
      assert.deepEqual(JSON.parse(init.body), { provider: 'openai' });
      assert.equal(seeds.length, 1, 'A valid signed body is never sent without seeding its nonce first');
      assert.equal(seeds[0].Item.pk.S, `NONCE#k1#${headers['x-chat-nonce']}`);
      return Response.json({ error: options.wrongReplayCode ? 'other' : 'REPLAY_REJECTED', chargeStatus: 'not_started' }, { status: 403, headers: { 'x-amzn-requestid': 'safe-request-id' } });
    }
  };
  return { dependencies, processes, commands, requests, clientConfigs, seeds, pauses, destroyed: () => destroyed };
}

test('negative origin runner fixes identity/region and seeds one unique nonce before replay', async () => {
  const f = fixture();
  const probe = createProbe(f.dependencies);
  const result = await probe.verify();
  probe.close();
  assert.deepEqual(result.checks.map(check => [check.check, check.status]), [['unsigned', 401], ['expired', 401], ['tampered', 403], ['replay', 403]]);
  assert.equal(result.seededNonces, 1);
  assert.equal(f.requests.length, 4);
  assert.deepEqual(f.pauses, [
    { milliseconds: 1100, requests: 1 },
    { milliseconds: 1100, requests: 2 },
    { milliseconds: 1100, requests: 3 }
  ]);
  assert.equal(f.destroyed(), 2);
  assert.equal(f.seeds[0].ConditionExpression, 'attribute_not_exists(pk) AND attribute_not_exists(sk)');
  assert.equal(f.seeds[0].Item.expiresAt.N, String(NOW / 1000 + 120));
  assert.equal(f.seeds[0].Item.sk.S, 'REPLAY');
  for (const command of f.processes) {
    assert.equal(command.options.windowsHide, true);
    assert.ok(command.args.includes('joshboyer-portfolio'));
    if (command.args[0] !== 'configure') assert.ok(command.args.includes('us-east-2'));
  }
  for (const config of f.clientConfigs) {
    assert.equal(config.region, 'us-east-2'); assert.equal(config.maxAttempts, 1);
    assert.equal(config.credentials.sessionToken, 'temporary-test-session');
  }
  assert.doesNotMatch(JSON.stringify(result), /temporary-test|signature|11111111|activeKeyId/);
});

test('origin signer agrees with the edge/backend fixed vector', () => {
  const headers = signedHeaders(parseKeyring(KEYRING), NOW / 1000, '11111111-1111-4111-8111-111111111111', '{"provider":"openai"}');
  assert.equal(headers['x-chat-signature'], '86eAYzfSzbxpytpoPucRvqQpqcsn2Y-ye28nHvdDGMI');
  assert.throws(() => parseKeyring('{"configured":false}'), { code: 'EDGE_KEYRING_INVALID' });
});

test('invalid destinations, wrong project resources and stale credentials cause no HTTP or nonce write', async () => {
  const cases = [
    { stackAccount: '999999999999' }, { stackOrigin: 'https://other12345.execute-api.us-east-2.amazonaws.com/dev' },
    { stackTable: 'other-table' }, { secretAccount: '999999999999' }, { tableAccount: '999999999999' }, { expired: true }
  ];
  for (const value of cases) {
    const f = fixture(value), probe = createProbe(f.dependencies);
    await assert.rejects(probe.verify()); probe.close();
    assert.equal(f.requests.length, 0); assert.equal(f.seeds.length, 0);
    assert.equal(f.pauses.length, 0);
  }
  const f = fixture();
  f.dependencies.env.AWS_ORIGIN = 'https://hostile.example/dev';
  await assert.rejects(createProbe(f.dependencies).verify(), { code: 'AWS_ORIGIN_INVALID' });
  assert.equal(f.processes.length, 0);
});

test('failed nonce seed never sends the valid replay body', async () => {
  const f = fixture({ seedFails: true });
  const probe = createProbe(f.dependencies);
  await assert.rejects(probe.verify(), { code: 'NONCE_SEED_FAILED' }); probe.close();
  assert.equal(f.requests.length, 3);
  assert.ok(f.requests.every(request => JSON.parse(request.init.body).negativeProbe));
});

test('unexpected success stops immediately and diagnostic output never includes secret or response data', async () => {
  for (const value of [{ unexpectedStatus: 200 }, { executeFails: true }, { hugeResponse: true }, { wrongReplayCode: true }]) {
    const f = fixture(value);
    let output = '';
    const code = await runCli(['verify'], { ...f.dependencies, write: text => { output += text; }, writeError: text => { output += text; } });
    assert.equal(code, 1);
    assert.doesNotMatch(output, /temporary-test|private credential|do not display response|signature|activeKeyId/);
    assert.equal(JSON.parse(output).status, 'failed');
    if (value.unexpectedStatus) { assert.equal(f.requests.length, 1); assert.equal(f.seeds.length, 0); }
  }
});

test('CLI requires an explicit verify command before any operation', async () => {
  const f = fixture();
  let output = '';
  assert.equal(await runCli([], { ...f.dependencies, writeError: text => { output += text; } }), 1);
  assert.match(output, /USAGE_verify/);
  assert.equal(f.processes.length, 0);
});
