const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const career = require('../dist/career-reference.js');

test('every career chapter evidence link resolves to an approved case template', () => {
  const html = fs.readFileSync(path.join(__dirname, '../dist/index.html'), 'utf8');
  const slugs = new Set([...html.matchAll(/<template id="project-([^"]+)"/g)].map(match => match[1]));
  for (const chapter of career.CHAPTERS) {
    for (const [slug] of chapter.links) assert.ok(slugs.has(slug), `${chapter.id}: missing evidence ${slug}`);
  }
});

