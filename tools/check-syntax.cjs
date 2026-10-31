'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
let checked = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.wrangler', 'cdk.out'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && dir === root && entry.name === 'build') continue;
    if (entry.isDirectory() && /^services[/\\][^/\\]+[/\\]build$/.test(path.relative(root, full))) continue;
    if (entry.isDirectory()) walk(full);
    else if (/\.(?:js|cjs|mjs)$/.test(entry.name)) {
      const result = spawnSync(process.execPath, ['--check', full], { encoding: 'utf8' });
      if (result.status !== 0) { process.stderr.write(result.stderr); process.exit(1); }
      checked++;
    }
  }
}
walk(root);
console.log('Syntax checked ' + checked + ' JavaScript files, including Worker, Pages and vendor files.');
