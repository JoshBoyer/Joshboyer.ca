'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const forbidden = /(^|\/)(?:\.[^/]+|knowledge|node_modules|tests|corpus)(?:\/|$)|(?:^|\/)(?:AGENTS\.md|JOSH-BOYER-PORTFOLIO-CORPUS\.md)$|\.map$/i;
const credentials = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-(?:proj-|live_)?[A-Za-z0-9_-]{32,}\b|\bAKIA[A-Z0-9]{16}\b|\bgh[pousr]_[A-Za-z0-9]{30,}\b/;
let scanned = 0;
function walk(dir, rel = '') {
  for (const item of fs.readdirSync(dir, {withFileTypes:true})) {
    assert.ok(!item.isSymbolicLink(), 'Publication symlink requires review: ' + rel + item.name);
    const file = rel + item.name, full = path.join(dir,item.name);
    if (dir.startsWith(path.join(root,'dist'))) assert.ok(!forbidden.test(file), 'Private file in web root: ' + file);
    if (item.isDirectory()) walk(full,file+'/');
    else if (/\.(?:html|js|cjs|mjs|json|txt|css|svg)$/.test(file)) {
      assert.ok(!credentials.test(fs.readFileSync(full,'utf8')), 'Possible credential in runtime file: ' + file);
      scanned++;
    }
  }
}
for (const folder of ['dist','functions','lib','legacy']) walk(path.join(root,folder));
assert.ok(!credentials.test(fs.readFileSync(path.join(root,'worker.mjs'),'utf8')), 'Possible credential in Worker');
const html = fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
assert.doesNotMatch(html, /<script[^>]+src=["'][^"']*(?:twin-drawer|twin-voice|josh-3d-avatar|career-guide-ui)\.js/i);
assert.doesNotMatch(fs.readFileSync(path.join(root,'dist/career-guide.html'),'utf8'), /<script/i);
const config = JSON.parse(fs.readFileSync(path.join(root,'wrangler.json')));
assert.equal(config.vars.EXPLORE_AI_ENABLED, 'false');
assert.deepEqual(config.send_email[0].allowed_sender_addresses, ['noreply@joshboyer.ca']);
assert.equal(config.assets.run_worker_first, true);
console.log('Security guards passed: ' + scanned + ' runtime text files; private-file exclusion, high-confidence credential patterns, Twin shutdown and restricted sender preserved.');
