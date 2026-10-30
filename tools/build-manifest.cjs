'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const file = path.join(root,'public-manifest.json');
const entries = JSON.parse(fs.readFileSync(file));
const seen = new Set();
for (const entry of entries) {
  assert.ok(typeof entry.path === 'string' && entry.path.startsWith('/') && !entry.path.includes('..') && !entry.path.includes('\\'), 'Invalid manifest path');
  assert.ok(!seen.has(entry.path), 'Duplicate manifest path: ' + entry.path); seen.add(entry.path);
  const full = path.join(root,'dist',entry.path.slice(1));
  const stat = fs.lstatSync(full);
  assert.ok(stat.isFile() && !stat.isSymbolicLink(), 'Manifest target requires review: ' + entry.path);
  entry.size = stat.size;
}
// Preserve the approved public allowlist; never auto-publish every file in dist.
fs.writeFileSync(file,JSON.stringify(entries));
console.log('Validated ' + entries.length + ' approved public files and refreshed byte lengths.');
