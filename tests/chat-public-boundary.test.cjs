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
  let assetCalls = 0;
  const source = fs.readFileSync(path.join(root, 'worker.mjs'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace(/^export \{PortfolioState\}.*;\r?\n/gm, '')
    .replace('export default', 'globalThis.handler =');
  const context = {
    Response, Request, Headers, URL, files,
    previous: { fetch() { throw new Error('Unexpected legacy dispatch'); } },
    contact() { throw new Error('Unexpected contact dispatch'); },
    byteRange() { throw new Error('Unexpected range request'); }, mediaSlice() {}
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  const env = { ASSETS: { fetch() { assetCalls++; return new Response('asset'); } } };
  for (const route of privateRoutes) {
    const response = await context.handler.fetch(new Request('https://joshboyer.ca' + route), env,
      { waitUntil() {}, passThroughOnException() {} });
    assert.equal(response.status, 404, route);
  }
  assert.equal(assetCalls, 0);
});
