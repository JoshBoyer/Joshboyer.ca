'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const privateRoutes = [
  '/chat/knowledge/corpus.json', '/chat/knowledge/cag-context.json',
  '/chat/contracts/schema.json', '/chat/evaluation/golden-questions.json',
  '/tools/build-chat-knowledge.cjs', '/JOSH-BOYER-PORTFOLIO-CORPUS.md',
  '/knowledge/career/PORTFOLIO-CONTENT-REVIEW-2026-10-28.md'
];
const disabledChatApiRoutes = [
  '/api/chat',
  '/api/chat/',
  '/api/chat/_mcp',
  '/api/chat/_probe',
  '/api/chat/session',
  '/api/chat/clear',
  '/api/chat/cancel',
  '/api/chat/request/11111111-1111-4111-8111-111111111111',
  '/api/chat/requests/11111111-1111-4111-8111-111111111111/cancel',
  '/api/chat/messages',
  '/api/chat/config',
  '/API/CHAT/_MCP',
  '/Api/Chat/_Probe'
];
const previewRoutes = ['/chat-preview', '/chat-preview.html', '/CHAT-PREVIEW.HTML'];

function loadProductionWorker(files) {
  let assetCalls = 0;
  let legacyCalls = 0;
  const source = fs.readFileSync(path.join(root, 'worker.mjs'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace(/^export \{PortfolioState\}.*;\r?\n/gm, '')
    .replace('export default', 'globalThis.handler =');
  const context = {
    Response, Request, Headers, URL, files,
    previous: { fetch() { legacyCalls++; throw new Error('Unexpected legacy dispatch'); } },
    contact() { throw new Error('Unexpected contact dispatch'); },
    byteRange() { throw new Error('Unexpected range request'); }, mediaSlice() {}
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  const env = { ASSETS: { fetch() { assetCalls++; return new Response('asset'); } } };
  const ctx = { waitUntil() {}, passThroughOnException() {} };
  return {
    fetch: (reqPath, init) => context.handler.fetch(new Request('https://joshboyer.ca' + reqPath, init), env, ctx),
    get assetCalls() { return assetCalls; },
    get legacyCalls() { return legacyCalls; }
  };
}

test('local public server cannot expose chat artifacts or private career sources', async () => {
  const { server } = require('../serve.cjs');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    for (const route of privateRoutes) {
      const response = await fetch(base + route);
      assert.equal(response.status, 404, route);
      await response.arrayBuffer();
    }
    const response = await fetch(base + '/career-evidence.v3.json');
    assert.equal(response.status, 200);
    assert.equal((await response.json()).schemaVersion, '1.0.0');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
test('production wrapper rejects chat artifacts before asset or legacy dispatch', async () => {
  const files = JSON.parse(fs.readFileSync(path.join(root, 'public-manifest.json'), 'utf8'));
  for (const route of privateRoutes) assert.ok(!files.some(file => file.path === route), route);
  const worker = loadProductionWorker(files);
  for (const route of privateRoutes) {
    const response = await worker.fetch(route);
    assert.equal(response.status, 404, route);
  }
  assert.equal(worker.assetCalls, 0);
  assert.equal(worker.legacyCalls, 0);
});

test('worker.mjs and serve.cjs keep /api/chat/* (including _mcp and _probe) and /chat-preview disabled with 404 unavailable and no-store', async () => {
  const files = JSON.parse(fs.readFileSync(path.join(root, 'public-manifest.json'), 'utf8'));
  const worker = loadProductionWorker(files);
  const { server } = require('../serve.cjs');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    for (const route of disabledChatApiRoutes) {
      for (const method of ['GET', 'POST', 'DELETE']) {
        const init = {
          method,
          headers: {
            'Content-Type': 'application/json',
            Cookie: '__Host-jb_chat_access=1800003600.' + 'a'.repeat(43)
          },
          ...(method === 'GET' ? {} : { body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }) })
        };
        const workerRes = await worker.fetch(route, init);
        assert.equal(workerRes.status, 404, `worker.mjs ${method} ${route}`);
        assert.equal(workerRes.headers.get('Cache-Control'), 'no-store', `worker.mjs Cache-Control ${route}`);
        assert.deepEqual(await workerRes.json(), { schemaVersion: '1.0.0', error: { code: 'unavailable', retryable: false } });

        const localRes = await fetch(base + route, init);
        assert.equal(localRes.status, 404, `serve.cjs ${method} ${route}`);
        assert.equal(localRes.headers.get('Cache-Control'), 'no-store', `serve.cjs Cache-Control ${route}`);
        assert.deepEqual(await localRes.json(), { schemaVersion: '1.0.0', error: { code: 'unavailable', retryable: false } });
      }
    }
    for (const previewRoute of previewRoutes) {
      const workerRes = await worker.fetch(previewRoute);
      assert.equal(workerRes.status, 404, `worker.mjs ${previewRoute}`);
      assert.equal(workerRes.headers.get('Cache-Control'), 'no-store');
      await workerRes.arrayBuffer();

      const localRes = await fetch(base + previewRoute);
      assert.equal(localRes.status, 404, `serve.cjs ${previewRoute}`);
      assert.equal(localRes.headers.get('Cache-Control'), 'no-store');
      await localRes.arrayBuffer();
    }
    assert.equal(worker.assetCalls, 0);
    assert.equal(worker.legacyCalls, 0);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
test('hostile path, header and cookie inputs with canary fail closed on worker.mjs and serve.cjs without leaking', async () => {
  const canary = 'CANARY-A14-TOKEN-771';
  const files = JSON.parse(fs.readFileSync(path.join(root, 'public-manifest.json'), 'utf8'));
  const worker = loadProductionWorker(files);
  const { server } = require('../serve.cjs');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const hostileRoutes = [
    '/api/chat/%2e%2e/session',
    '/api/chat/%252e%252e/session',
    '/api/chat/..%2fsession',
    '/api/chat/%00',
    '/api/chat/%0d%0a',
    '/__proto__',
    '/api/chat/__proto__',
    `/api/chat/_mcp?canary=${canary}`,
    `/chat-preview?canary=${canary}`
  ];
  const http = require('node:http');
  const rawGet = reqPath => new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: server.address().port,
      path: reqPath,
      method: 'GET',
      headers: { Connection: 'close', Cookie: `__Host-jb_chat_access=${canary}`, 'X-Canary': canary }
    }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.end();
  });
  try {
    for (const route of hostileRoutes) {
      const headers = { Cookie: `__Host-jb_chat_access=${canary}`, 'X-Canary': canary };
      const workerRes = await worker.fetch(route, { headers });
      assert.ok([403, 404].includes(workerRes.status), `worker.mjs status ${workerRes.status} for ${route}`);
      const workerText = await workerRes.text();
      assert.ok(!workerText.includes(canary), `worker.mjs leaked canary on ${route}`);
      assert.ok(!JSON.stringify([...workerRes.headers]).includes(canary));

      const localRes = await fetch(base + route, { headers });
      assert.ok([403, 404].includes(localRes.status), `serve.cjs status ${localRes.status} for ${route}`);
      const localText = await localRes.text();
      assert.ok(!localText.includes(canary), `serve.cjs leaked canary on ${route}`);
      assert.ok(!JSON.stringify([...localRes.headers]).includes(canary));

      const rawRes = await rawGet(route);
      assert.ok([403, 404].includes(rawRes.status), `serve.cjs raw HTTP status ${rawRes.status} for ${route}`);
      assert.ok(!rawRes.body.includes(canary), `serve.cjs raw HTTP leaked canary on ${route}`);
      assert.ok(!JSON.stringify(rawRes.headers).includes(canary));
    }
    const rawTraversalToIndex = await rawGet('/chat/%2e%2e/index.html');
    assert.equal(rawTraversalToIndex.status, 403);
    assert.equal(worker.assetCalls, 0);
    assert.equal(worker.legacyCalls, 0);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
