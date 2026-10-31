'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { renderAnswer, assertCorpusCompatible, NOTICE_TEXT, PAGE_CONTEXTS } = require('../chat/contracts/index.cjs');

function clientEvidence(corpus) {
  assertCorpusCompatible(corpus);
  const claims = [];
  const sources = new Map();
  for (const claim of corpus.claims) {
    const answer = renderAnswer({
      schemaVersion: '1.0.0', corpusVersion: corpus.corpusVersion,
      claimIds: [claim.id], noticeCodes: []
    }, corpus);
    claims.push(answer.blocks[0]);
    answer.sources.forEach(source => sources.set(source.id, source));
  }
  // Only canonical public display fields cross this boundary. The provenance and
  // local file paths in the source artifact are not needed in the browser.
  return {
    schemaVersion: '1.0.0', corpusVersion: corpus.corpusVersion,
    claims, sources: [...sources.values()],
    notices: Object.entries(NOTICE_TEXT).map(([code, text]) => ({ kind: 'notice', code, text })),
    pageContexts: PAGE_CONTEXTS
  };
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const corpus = JSON.parse(fs.readFileSync(path.join(root, 'chat/knowledge/corpus.json'), 'utf8'));
  const content = JSON.stringify(clientEvidence(corpus), null, 2) + '\n';
  const target = path.join(root, 'dist/chat-evidence.json');
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== content) {
      throw new Error('Browser chat evidence is stale. Run node tools/build-chat-client.cjs.');
    }
    console.log('Browser chat evidence matches the approved public corpus.');
  } else {
    fs.writeFileSync(target, content);
    console.log('Built canonical public browser evidence.');
  }
}

module.exports = { clientEvidence };
