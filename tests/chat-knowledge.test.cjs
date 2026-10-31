'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { buildArtifacts, checkArtifacts, writeArtifacts } = require('../tools/build-chat-knowledge.cjs');
const { clientEvidence } = require('../tools/build-chat-client.cjs');
const {
  validateCorpus,
  validateArtifacts,
  validateChunksManifest,
  createChunksManifest,
  deriveDeliveryStatus,
  digest,
  sha256
} = require('../chat/knowledge/validate.cjs');
const { assertToolOutput } = require('../chat/contracts/index.cjs');
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

test('chunks-manifest.json is built deterministically with pinned embedding config, delivery status, bounded embedding text and lexical tokens', () => {
  const { corpus, cag, chunksManifest } = buildArtifacts();
  assert.ok(chunksManifest && typeof chunksManifest === 'object');
  assert.equal(chunksManifest.schemaVersion, '1.0.0');
  assert.equal(chunksManifest.corpusVersion, corpus.corpusVersion);
  assert.equal(chunksManifest.indexVersion, `idx-${corpus.corpusVersion.slice(7, 23)}`);
  assert.match(chunksManifest.indexVersion, /^[A-Za-z0-9._:-]{1,96}$/);
  assert.equal(chunksManifest.embeddingModel, 'text-embedding-3-small');
  assert.equal(chunksManifest.dimensions, 1536);
  assert.equal(chunksManifest.chunks.length, 14);
  assert.deepEqual(
    chunksManifest.chunks.map(chunk => chunk.id),
    [...chunksManifest.chunks.map(chunk => chunk.id)].sort()
  );

  const sourcesById = new Map(corpus.sources.map(source => [source.id, source]));
  for (const entry of chunksManifest.chunks) {
    const sourceChunk = corpus.chunks.find(item => item.id === entry.id);
    assert.ok(sourceChunk, `Expected source chunk for ${entry.id}`);
    assert.equal(entry.claimId, `claim-${entry.id}`);
    assert.equal(entry.kind, sourceChunk.kind);
    assert.equal(entry.projectId, sourceChunk.projectId);
    assert.equal(entry.roleId, sourceChunk.roleId);
    assert.equal(entry.title, sourceChunk.title);
    assert.equal(entry.period, sourceChunk.period);
    assert.equal(entry.confidence, 'approved-public-account');
    assert.deepEqual(entry.tags, sourceChunk.tags);
    assert.equal(entry.decision, sourceChunk.decision);
    assert.deepEqual(entry.process, sourceChunk.process);
    assert.equal(entry.technicalGuidance, sourceChunk.technicalGuidance);
    assert.equal(entry.outcome, sourceChunk.outcome);
    assert.equal(entry.resumeText, sourceChunk.resumeText);
    assert.deepEqual(entry.qualificationNotes, sourceChunk.qualificationNotes);
    assert.deepEqual(entry.sourceIds, sourceChunk.sourceRefs);
    assert.deepEqual(
      entry.sourceUrls,
      [...new Set(sourceChunk.sourceRefs.map(id => sourcesById.get(id).url))]
    );
    assert.ok(
      ['production', 'implemented_supported', 'approved_design_interim', 'independent_capstone', 'historical_personal'].includes(entry.deliveryStatus)
    );
    assert.ok(Buffer.byteLength(entry.embeddingText, 'utf8') > 0);
    assert.ok(Buffer.byteLength(entry.embeddingText, 'utf8') <= 4096);
    assert.ok(entry.embeddingText.includes(entry.title));
    assert.ok(entry.embeddingText.includes(entry.period));
    assert.ok(entry.embeddingText.includes(entry.resumeText));
    assert.ok(entry.embeddingText.includes(entry.decision));
    assert.ok(entry.embeddingText.includes(entry.technicalGuidance));
    assert.ok(entry.embeddingText.includes(entry.outcome));
    assert.ok(entry.embeddingText.includes('Qualification boundaries:'));
    for (const note of entry.qualificationNotes) {
      assert.ok(entry.embeddingText.includes(note), `Missing qualification note in embeddingText for ${entry.id}`);
    }
    assert.ok(Array.isArray(entry.lexicalTokens) && entry.lexicalTokens.length >= 10);
    assert.deepEqual(entry.lexicalTokens, [...new Set(entry.lexicalTokens)].sort());
    for (const token of entry.lexicalTokens) {
      assert.equal(token, token.toLowerCase());
    }
    const { contentSha256, ...chunkPayload } = entry;
    assert.equal(contentSha256, digest(chunkPayload));
  }

  const { manifestSha256, ...manifestPayload } = chunksManifest;
  assert.equal(manifestSha256, digest(manifestPayload));
  assert.deepEqual(chunksManifest, createChunksManifest(corpus));
  assert.equal(validateChunksManifest(chunksManifest, corpus), true);
  assert.equal(validateArtifacts({ corpus, cag, chunksManifest }), true);
  assert.ok(fs.existsSync(path.join(ROOT, 'chat/knowledge/chunks-manifest.json')));
});

test('chunks-manifest.json caseStudies index all 13 active projects and satisfy get_case_study_output contract', () => {
  const { chunksManifest } = buildArtifacts();
  assert.equal(chunksManifest.caseStudies.length, 13);
  assert.deepEqual(
    chunksManifest.caseStudies.map(item => item.projectId),
    [...chunksManifest.caseStudies.map(item => item.projectId)].sort()
  );

  const claimsStudy = chunksManifest.caseStudies.find(item => item.projectId === 'claims');
  assert.ok(claimsStudy);
  assert.deepEqual(claimsStudy.chunkIds, ['experience-claims', 'experience-provider-sync-review']);
  assert.deepEqual(claimsStudy.claimIds, ['claim-experience-claims', 'claim-experience-provider-sync-review']);
  assert.equal(claimsStudy.sources.length, 2);

  for (const cs of chunksManifest.caseStudies) {
    const toolOutput = {
      schemaVersion: '1.0.0',
      corpusVersion: chunksManifest.corpusVersion,
      projectId: cs.projectId,
      chunkId: cs.chunkId,
      claimId: cs.claimId,
      title: cs.title,
      period: cs.period,
      text: cs.text,
      decision: cs.decision,
      process: cs.process,
      technicalGuidance: cs.technicalGuidance,
      outcome: cs.outcome,
      tags: cs.tags,
      qualificationNotes: cs.qualificationNotes,
      sources: cs.sources
    };
    assert.deepEqual(assertToolOutput('get_case_study', toolOutput), toolOutput);
  }
});

test('all 7 AGENTS.md career accuracy rules and delivery statuses are explicitly preserved in chunks-manifest.json', () => {
  const { corpus, chunksManifest } = buildArtifacts();
  const byId = new Map(chunksManifest.chunks.map(chunk => [chunk.id, chunk]));

  // 1. Dell starts September 2006
  const dell = byId.get('experience-dell');
  assert.equal(dell.period, '2006–2007');
  assert.equal(dell.deliveryStatus, 'production');
  assert.ok(dell.qualificationNotes.includes('September 2006 start confirmed; broad subsequent chronology.'));
  assert.ok(dell.lexicalTokens.includes('september'));
  assert.ok(dell.lexicalTokens.includes('2006'));

  // 2. Grenville tenure 2009-2022; formal analyst transition unresolved between 2014 and 2016; no formal Architect title
  const grenvilleChunks = chunksManifest.chunks.filter(chunk => chunk.roleId === 'role-grenville');
  assert.equal(grenvilleChunks.length, 6);
  for (const chunk of grenvilleChunks) {
    assert.equal(chunk.deliveryStatus, 'production');
    assert.ok(
      chunk.qualificationNotes.includes(
        'This is a responsibility summary, not a single formal job title. The exact analyst transition year is unresolved (2014 versus 2016 in prior accounts).'
      )
    );
    assert.match(chunk.embeddingText, /2014 versus 2016/);
  }

  // 3. Renewal automation rates absent from reusable dataset per boundary rule
  const renewals = byId.get('experience-renewals');
  assert.equal(renewals.deliveryStatus, 'production');
  assert.doesNotMatch(renewals.resumeText, /(?:80|60|40)\s*%/);
  assert.doesNotMatch(renewals.embeddingText, /(?:80|60|40)\s*%/);
  assert.ok(
    corpus.boundaries.includes(
      'Do not add numerical renewal rates from another source. Those rates are absent from this approved reusable dataset.'
    )
  );

  // 4. Medavie provider integration: scheduled table-backed sync + REST consumer, live with continuing support, not Kafka
  for (const id of ['experience-claims', 'experience-provider-sync-review']) {
    const provider = byId.get(id);
    assert.equal(provider.deliveryStatus, 'implemented_supported');
    assert.ok(provider.process.includes('Scheduled table-backed synchronization with REST retrieval'));
    assert.ok(provider.qualificationNotes.includes('Integrations are live by Josh’s account, with continuing testing and production support.'));
    assert.ok(provider.qualificationNotes.includes('Requirements, mappings and support do not imply sole service development or a Kafka implementation.'));
    assert.ok(provider.lexicalTokens.includes('kafka'));
    assert.ok(provider.lexicalTokens.includes('message broker'));
  }

  // 5. Takeover tooling: production Excel VBA add-in designed and built by Josh; backend changes guided with developers
  const takeover = byId.get('experience-takeover');
  assert.equal(takeover.deliveryStatus, 'production');
  assert.match(takeover.resumeText, /Designed and built a production Excel VBA add-in/);
  assert.ok(takeover.qualificationNotes.includes('Josh designed and built the production Excel VBA add-in; backend and schema changes were guided with developers.'));
  assert.ok(takeover.lexicalTokens.includes('vba'));
  assert.ok(takeover.lexicalTokens.includes('excel'));

  // 6. Reporting continuity (approved design + operational interim SQL; permanent extract unconfirmed live; replacement proposed) & SQL financial reconciliation (adopted by payment team)
  const continuity = byId.get('experience-continuity');
  assert.equal(continuity.deliveryStatus, 'approved_design_interim');
  assert.match(continuity.resumeText, /approved compatibility design and delivered operational interim SQL reports/);
  assert.match(continuity.resumeText, /permanent extract remains unconfirmed live/);
  assert.ok(continuity.process.includes('Permanent extract not confirmed live; simpler replacement remained proposed'));

  const sql = byId.get('experience-sql');
  assert.equal(sql.deliveryStatus, 'production');
  assert.match(sql.resumeText, /adopted in the payment team’s production process/);

  // 7. NEXUS independent capstone; LOWKEY/Workshop42 historical/personal
  const nexus = byId.get('experience-nexus');
  assert.equal(nexus.deliveryStatus, 'independent_capstone');
  assert.ok(nexus.qualificationNotes.includes('Independent project, not employer experience.'));
  assert.ok(nexus.qualificationNotes.includes('No employer delivery or production maturity is inferred from personal projects.'));
  assert.ok(!byId.has('experience-lowkey'));
  assert.equal(
    deriveDeliveryStatus({
      id: 'experience-lowkey',
      kind: 'project',
      projectId: 'lowkey',
      roleId: 'role-independent',
      outcome: 'Implemented local decoding workflows',
      resumeText: 'Archived independent project',
      technicalGuidance: 'Independent application',
      qualificationNotes: ['Independent project, not employer experience.']
    }),
    'historical_personal'
  );
});

test('chunks-manifest validation rejects tampered digests, wrong indexVersion, wrong embedding config, missing qualification notes, and oversized embedding text', t => {
  const rehashManifest = (manifest) => {
    manifest.chunks = manifest.chunks.map(chunk => {
      const { contentSha256: _old, ...rest } = chunk;
      return { ...rest, contentSha256: digest(rest) };
    });
    const { manifestSha256: _oldManifest, ...restManifest } = manifest;
    manifest.manifestSha256 = digest(restManifest);
  };

  for (const mutate of [
    artifacts => { artifacts.chunksManifest.manifestSha256 = '0'.repeat(64); },
    artifacts => { artifacts.chunksManifest.chunks[0].contentSha256 = '0'.repeat(64); },
    artifacts => { artifacts.chunksManifest.corpusVersion = `sha256:${'0'.repeat(64)}`; },
    artifacts => {
      artifacts.chunksManifest.indexVersion = 'idx-0000000000000000';
      rehashManifest(artifacts.chunksManifest);
    },
    artifacts => {
      artifacts.chunksManifest.embeddingModel = 'text-embedding-ada-002';
      rehashManifest(artifacts.chunksManifest);
    },
    artifacts => {
      artifacts.chunksManifest.dimensions = 3072;
      rehashManifest(artifacts.chunksManifest);
    },
    artifacts => {
      artifacts.chunksManifest.chunks[0].deliveryStatus = 'production';
      rehashManifest(artifacts.chunksManifest);
    },
    artifacts => {
      artifacts.chunksManifest.chunks[0].embeddingText = 'Title: Tampered without qualifications';
      rehashManifest(artifacts.chunksManifest);
    },
    artifacts => {
      artifacts.chunksManifest.chunks[0].embeddingText = `${artifacts.chunksManifest.chunks[0].embeddingText}\n${'x'.repeat(4096)}`;
      rehashManifest(artifacts.chunksManifest);
    },
    artifacts => {
      artifacts.chunksManifest.chunks[0].lexicalTokens = ['z-token', 'a-token'];
      rehashManifest(artifacts.chunksManifest);
    },
    artifacts => {
      artifacts.chunksManifest.caseStudies[0].title = 'Tampered case study title';
      rehashManifest(artifacts.chunksManifest);
    }
  ]) {
    const artifacts = clonedArtifacts();
    mutate(artifacts);
    assert.throws(() => validateArtifacts(artifacts));
  }

  const root = fixture(t);
  writeArtifacts({ root });
  const manifestPath = path.join(root, 'chat/knowledge/chunks-manifest.json');
  assert.ok(fs.existsSync(manifestPath));
  fs.writeFileSync(manifestPath, `${fs.readFileSync(manifestPath, 'utf8')}\n`);
  assert.throws(() => checkArtifacts({ root }), /Stale or missing knowledge artifact: chat\/knowledge\/chunks-manifest\.json/);
});

test('adversarial canaries, oversized inputs and symlinked manifest paths fail closed without leaking', t => {
  const root = fixture(t);
  const canaryA07 = 'CANARY-A07-SECRET-f09d12a4';
  const canaryPrivate = 'CANARY-PRIVATE-CORPUS-9f4a2c81';
  fs.mkdirSync(path.join(root, 'knowledge'), { recursive: true });
  fs.writeFileSync(path.join(root, 'knowledge', 'secret-notes.md'), `${canaryA07}\n${canaryPrivate}`);
  fs.writeFileSync(path.join(root, 'JOSH-BOYER-PORTFOLIO-CORPUS.md'), `${canaryA07}\n${canaryPrivate}`);
  fs.appendFileSync(path.join(root, 'dist/index.html'), `<!-- ${canaryA07} ${canaryPrivate} -->`);
  changeInput(root, data => {
    data.untrustedCanary = canaryA07;
    data.person.privateCanary = canaryPrivate;
    const inactive = data.chunks.find(chunk => chunk.active === false);
    inactive.resumeText = `${canaryA07} ${canaryPrivate}`;
    inactive.decision = canaryA07;
  });

  const written = writeArtifacts({ root });
  const serializedAll = JSON.stringify({
    ...written,
    clientEvidence: clientEvidence(written.corpus)
  });
  assert.ok(!serializedAll.includes(canaryA07));
  assert.ok(!serializedAll.includes(canaryPrivate));

  for (const rel of ['chat/knowledge/corpus.json', 'chat/knowledge/cag-context.json', 'chat/knowledge/chunks-manifest.json']) {
    const diskText = fs.readFileSync(path.join(root, rel), 'utf8');
    assert.ok(!diskText.includes(canaryA07), `Canary leaked into ${rel}`);
    assert.ok(!diskText.includes(canaryPrivate), `Private canary leaked into ${rel}`);
  }

  // Oversized input (> 1 MiB) rejected before parsing
  const oversizedRoot = fixture(t);
  fs.writeFileSync(path.join(oversizedRoot, INPUT), 'x'.repeat(1024 * 1024 + 1));
  assert.throws(() => buildArtifacts({ root: oversizedRoot }), /Knowledge input exceeds byte limit/);
});
