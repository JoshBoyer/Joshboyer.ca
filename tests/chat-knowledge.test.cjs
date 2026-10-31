'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { buildArtifacts, checkArtifacts, writeArtifacts } = require('../tools/build-chat-knowledge.cjs');
const { validateCorpus, validateArtifacts, digest, sha256 } = require('../chat/knowledge/validate.cjs');
const policy = require('../chat/knowledge/policy.json');

const ROOT = path.resolve(__dirname, '..');
const INPUT = 'dist/career-evidence.v3.json';
const inputBytes = fs.readFileSync(path.join(ROOT, INPUT));
const input = JSON.parse(inputBytes);

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-chat-knowledge-'));
  fs.mkdirSync(path.join(root, 'dist'));
  fs.writeFileSync(path.join(root, INPUT), inputBytes);
  fs.copyFileSync(path.join(ROOT, 'dist/index.html'), path.join(root, 'dist/index.html'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function changeInput(root, change) {
  const data = JSON.parse(fs.readFileSync(path.join(root, INPUT), 'utf8'));
  change(data);
  fs.writeFileSync(path.join(root, INPUT), JSON.stringify(data));
}

function clonedArtifacts() {
  return structuredClone(buildArtifacts());
}

test('knowledge export is deterministic and checked-in artifacts are current', () => {
  assert.deepEqual(buildArtifacts(), buildArtifacts());
  assert.deepEqual(checkArtifacts(), buildArtifacts());
});

test('only eligible public chunks and their direct sources become canonical claims', () => {
  const { corpus } = buildArtifacts();
  const active = input.chunks.filter(chunk => chunk.active === true);
  assert.equal(corpus.chunks.length, 14);
  assert.equal(corpus.claims.length, active.length);
  assert.deepEqual(corpus.claims.map(claim => claim.chunkId).sort(), active.map(chunk => chunk.id).sort());
  assert.ok(!corpus.chunks.some(chunk => chunk.id === 'experience-lowkey'));
  assert.ok(!corpus.sources.some(source => source.id === 'source-lowkey'));
  assert.ok(!corpus.qualifications.some(qualification => qualification.id === 'qual-pubsub'));
  const referenced = new Set(corpus.claims.flatMap(claim => claim.sourceIds));
  assert.deepEqual(new Set(corpus.sources.map(source => source.id)), referenced);
  for (const claim of corpus.claims) {
    const sourceChunk = active.find(chunk => chunk.id === claim.chunkId);
    const role = input.roles.find(item => item.id === sourceChunk.roleId);
    assert.equal(claim.text, sourceChunk.resumeText);
    assert.equal(claim.period, sourceChunk.period);
    assert.deepEqual(claim.qualificationNotes, [...new Set([...sourceChunk.qualificationNotes, ...role.qualificationNotes])]);
    assert.ok(!Object.hasOwn(claim, 'status'));
  }
});

test('CAG is a bounded canonical subset with the same corpus version and boundaries', () => {
  const { corpus, cag } = buildArtifacts();
  assert.equal(cag.corpusVersion, corpus.corpusVersion);
  assert.ok(Buffer.byteLength(JSON.stringify(cag, null, 2) + '\n') <= policy.maxCagBytes);
  assert.deepEqual(cag.claims.map(claim => claim.chunkId), policy.cagChunkIds);
  for (const claim of cag.claims) assert.deepEqual(claim, corpus.claims.find(item => item.id === claim.id));
  assert.deepEqual(cag.boundaries, corpus.boundaries);
  assert.equal(validateArtifacts({ corpus, cag }), true);
});

test('provenance binds exact source bytes and extraction policy', () => {
  const { corpus } = buildArtifacts();
  assert.equal(corpus.provenance.inputPath, INPUT);
  assert.equal(corpus.provenance.inputSha256, sha256(inputBytes));
  assert.equal(corpus.provenance.policySha256, digest(policy));
  assert.equal(corpus.provenance.datasetVersion, input.datasetVersion);
  assert.equal(corpus.provenance.reviewedSourceCommit, input.reviewedSourceCommit);
});

test('private files, arbitrary fields and HTML body text are not ingested', t => {
  const root = fixture(t);
  const bait = 'PRIVATE_CONTENT_MUST_NEVER_ENTER_THE_EXPORT';
  fs.mkdirSync(path.join(root, 'knowledge'));
  fs.writeFileSync(path.join(root, 'knowledge', 'private.md'), bait);
  fs.writeFileSync(path.join(root, 'JOSH-BOYER-PORTFOLIO-CORPUS.md'), bait);
  fs.appendFileSync(path.join(root, 'dist/index.html'), `<p>${bait}</p>`);
  changeInput(root, data => {
    data.privateNotes = bait;
    data.person.email = bait;
    data.chunks[0].secret = bait;
    data.chunks[0].priority = bait;
    data.sources[0].internalPath = bait;
    data.summaries = [{ text: bait }];
    data.chunks.find(chunk => chunk.active === false).resumeText = bait;
  });
  assert.ok(!JSON.stringify(buildArtifacts({ root })).includes(bait));
});

test('mixed delivery stages and personal-project qualifications survive export', () => {
  const { corpus } = buildArtifacts();
  const continuity = corpus.claims.find(claim => claim.projectId === 'continuity');
  assert.match(continuity.text, /operational interim SQL reports/);
  assert.match(continuity.text, /permanent extract remains unconfirmed live/);
  assert.match(continuity.qualificationNotes.join(' '), /go-live remain unconfirmed/);
  const nexus = corpus.claims.find(claim => claim.projectId === 'nexus');
  assert.match(nexus.qualificationNotes.join(' '), /not employer experience/);
  assert.match(nexus.qualificationNotes.join(' '), /No employer delivery or production maturity/);
  assert.doesNotMatch(corpus.claims.find(claim => claim.projectId === 'renewals').text, /(?:80|60|40)\s*%/);
});

test('duplicate provider records retain the same source URL rather than artificial corroboration', () => {
  const { corpus } = buildArtifacts();
  const sources = new Map(corpus.sources.map(source => [source.id, source]));
  const provider = corpus.claims.filter(claim => claim.projectId === 'claims');
  assert.equal(provider.length, 2);
  assert.equal(new Set(provider.flatMap(claim => claim.sourceIds.map(id => sources.get(id).url))).size, 1);
});

test('source byte changes invalidate even unchanged dataset versions', t => {
  const root = fixture(t);
  const initial = writeArtifacts({ root });
  fs.appendFileSync(path.join(root, INPUT), '\n');
  const changed = buildArtifacts({ root });
  assert.equal(initial.corpus.provenance.datasetVersion, changed.corpus.provenance.datasetVersion);
  assert.notEqual(initial.corpus.corpusVersion, changed.corpus.corpusVersion);
  assert.throws(() => checkArtifacts({ root }), /Stale or missing/);
  writeArtifacts({ root });
  assert.deepEqual(checkArtifacts({ root }), changed);
});

test('failed input validation preserves the previous artifact files', t => {
  const root = fixture(t);
  writeArtifacts({ root });
  const before = fs.readFileSync(path.join(root, 'chat/knowledge/corpus.json'));
  changeInput(root, data => { delete data.chunks[0].resumeText; });
  assert.throws(() => writeArtifacts({ root }), /schema/);
  assert.deepEqual(fs.readFileSync(path.join(root, 'chat/knowledge/corpus.json')), before);
});

test('export rejects non-CAG records that exceed consumer contract limits', t => {
  for (const mutate of [
    (chunk) => { chunk.resumeText = 'x'.repeat(4100); },
    (chunk) => { chunk.title = 'x'.repeat(257); },
    (chunk) => { chunk.period = 'x'.repeat(129); },
    (chunk) => { chunk.qualificationNotes = ['x'.repeat(2049)]; },
    (chunk) => { chunk.qualificationNotes = Array.from({ length: 16 }, (_, i) => `Boundary ${i}`); },
    (chunk, data) => { data.sources.find(source => source.id === chunk.sourceRefs[0]).revision = 'x'.repeat(129); },
    (chunk, data) => {
      const source = data.sources.find(item => item.id === chunk.sourceRefs[0]);
      for (let i = 0; i < 16; i++) {
        const id = `source-headquarters-extra-${i}`;
        data.sources.push({ ...source, id });
        chunk.sourceRefs.push(id);
      }
    }
  ]) {
    const root = fixture(t);
    changeInput(root, data => mutate(data.chunks.find(chunk => chunk.id === 'experience-headquarters'), data));
    assert.throws(() => buildArtifacts({ root }), error => error.name === 'ContractError');
  }
});

test('new project anchors require consumer allowlist approval before export', t => {
  const root = fixture(t);
  changeInput(root, data => {
    data.chunks.find(chunk => chunk.id === 'experience-headquarters').projectId = 'new-project';
    data.sources.find(source => source.id === 'source-headquarters').path = 'index.html#projects/new-project';
  });
  fs.appendFileSync(path.join(root, 'dist/index.html'), '<template id="project-new-project"></template>');
  assert.throws(() => buildArtifacts({ root }), error => error.name === 'ContractError');
});

test('strict public input checks reject duplicate IDs, implicit eligibility and missing references', t => {
  for (const mutate of [
    data => { data.chunks.push(data.chunks[0]); },
    data => { data.sources.push(data.sources[0]); },
    data => { data.roles.push(data.roles[0]); },
    data => { delete data.chunks[0].active; },
    data => { data.chunks[0].active = 'true'; },
    data => { data.chunks[0].roleId = 'unknown'; },
    data => { data.chunks[0].sourceRefs = ['missing-source']; },
    data => { data.qualificationCatalog[0].active = 'true'; },
    data => { data.schemaVersion = '2.0.0'; }
  ]) {
    const root = fixture(t);
    changeInput(root, mutate);
    assert.throws(() => buildArtifacts({ root }));
  }
});

test('public source paths cannot fetch external, private, encoded or wrong-project locations', t => {
  for (const badPath of [
    '../knowledge/private.md', 'https://example.org/data', '//example.org/data',
    'index.html#projects/%2e%2e', 'index.html#projects/nexus', 'index.html?x=1#projects/dell'
  ]) {
    const root = fixture(t);
    changeInput(root, data => { data.sources.find(source => source.id === 'source-dell').path = badPath; });
    assert.throws(() => buildArtifacts({ root }), /public source path/);
  }
});

test('missing actual project templates fail source integrity checks', t => {
  const root = fixture(t);
  const file = path.join(root, 'dist/index.html');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('<template id="project-dell"', '<template id="not-a-project"'));
  assert.throws(() => buildArtifacts({ root }), /public project anchor/);
});

test('linked source and output directories cannot cross the repository boundary', t => {
  const outside = fixture(t);
  const sourceRoot = fixture(t);
  fs.rmSync(path.join(sourceRoot, 'dist'), { recursive: true });
  fs.symlinkSync(path.join(outside, 'dist'), path.join(sourceRoot, 'dist'), 'junction');
  assert.throws(() => buildArtifacts({ root: sourceRoot }), /Symbolic links/);
  const outputRoot = fixture(t);
  fs.symlinkSync(outside, path.join(outputRoot, 'chat'), 'junction');
  assert.throws(() => writeArtifacts({ root: outputRoot }), /Symbolic links/);
});

test('modified artifact shape, prose, relationships and digests fail closed', () => {
  for (const mutate of [
    artifacts => { artifacts.corpus.claims[0].text = 'Invented accomplishment'; },
    artifacts => { artifacts.corpus.claims[0].sourceIds = ['source-nexus']; },
    artifacts => { artifacts.corpus.claims[0].text = ''; },
    artifacts => { artifacts.corpus.claims[0].extra = 'invented'; },
    artifacts => { artifacts.corpus.sources[0].url = 'https://example.org/'; },
    artifacts => { artifacts.corpus.chunks[0].active = false; },
    artifacts => { artifacts.corpus.chunks[0].contentSha256 = '0'.repeat(64); },
    artifacts => { artifacts.corpus.claims.push(artifacts.corpus.claims[0]); },
    artifacts => { artifacts.corpus.provenance.inputSha256 = '0'.repeat(64); },
    artifacts => { artifacts.corpus.boundaries = []; },
    artifacts => { artifacts.cag.corpusVersion = `sha256:${'0'.repeat(64)}`; },
    artifacts => { artifacts.cag.claims[0].qualificationNotes = []; },
    artifacts => { artifacts.cag.contentSha256 = '0'.repeat(64); }
  ]) {
    const artifacts = clonedArtifacts();
    mutate(artifacts);
    assert.throws(() => validateArtifacts(artifacts));
  }
});

test('artifact validator rejects a consistently rehashed claim that differs from its chunk', () => {
  const { corpus } = clonedArtifacts();
  corpus.claims[0].text = 'Invented accomplishment';
  const { corpusVersion: _version, ...payload } = corpus;
  corpus.corpusVersion = `sha256:${digest(payload)}`;
  assert.throws(() => validateCorpus(corpus), /Canonical claim differs/);
});

test('CLI accepts only its fixed input and optional check mode', () => {
  const result = spawnSync(process.execPath, ['tools/build-chat-knowledge.cjs', '--input', 'knowledge/private.md'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage:/);
});
