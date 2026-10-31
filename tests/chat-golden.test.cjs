'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { renderAnswer, assertValid } = require('../chat/contracts/index.cjs');

const root = path.resolve(__dirname, '..');
const fixtures = JSON.parse(fs.readFileSync(path.join(root, 'chat/evaluation/golden-questions.json'), 'utf8'));
const corpus = JSON.parse(fs.readFileSync(path.join(root, 'chat/knowledge/corpus.json'), 'utf8'));
const claimsById = new Map(corpus.claims.map(claim => [claim.id, claim]));
const sourcesById = new Map(corpus.sources.map(source => [source.id, source]));

function selectionFor(fixture) {
  return {
    schemaVersion: '1.0.0',
    corpusVersion: corpus.corpusVersion,
    claimIds: [...fixture.expected.claimIds],
    noticeCodes: [...fixture.expected.noticeCodes]
  };
}

test('golden fixtures distinguish authored expectations from model evaluation', () => {
  assert.equal(fixtures.evaluationVersion, '1.0.0');
  assert.equal(fixtures.schemaVersion, '1.0.0');
  assert.match(fixtures.scope, /not submitted to a model or retriever/);
  assert.equal(new Set(fixtures.cases.map(fixture => fixture.id)).size, fixtures.cases.length);
  assert.deepEqual(new Set(fixtures.cases.map(fixture => fixture.category)), new Set(['answerable', 'limited', 'unsupported', 'hostile']));

  for (const fixture of fixtures.cases) {
    assert.ok(fixture.question.trim(), fixture.id);
    const expected = fixture.expected;
    assert.deepEqual(expected.claimIds, expected.chunkIds.map(id => `claim-${id}`), fixture.id);
    assert.equal(new Set(expected.claimIds).size, expected.claimIds.length, fixture.id);
    if (expected.outcome === 'unsupported') {
      assert.deepEqual(expected.claimIds, [], fixture.id);
      assert.deepEqual(expected.noticeCodes, ['unsupported_evidence'], fixture.id);
      assert.deepEqual(expected.minimumExpectedSources, [], fixture.id);
    } else {
      assert.ok(expected.claimIds.length > 0, fixture.id);
      assert.ok(expected.minimumExpectedSources.length > 0, fixture.id);
      assert.deepEqual(expected.noticeCodes, expected.outcome === 'limited' ? ['limited_evidence'] : [], fixture.id);
    }
  }
});

for (const fixture of fixtures.cases) {
  test(`offline golden selection: ${fixture.id}`, () => {
    const selection = selectionFor(fixture);
    assertValid('answerSelection', selection);
    const answer = renderAnswer(selection, corpus);
    assertValid('renderedAnswer', answer);
    assert.equal(answer.corpusVersion, corpus.corpusVersion);

    const claimBlocks = answer.blocks.filter(block => block.kind === 'claim');
    const noticeBlocks = answer.blocks.filter(block => block.kind === 'notice');
    assert.deepEqual(claimBlocks.map(block => block.claimId), fixture.expected.claimIds);
    assert.deepEqual(noticeBlocks.map(block => block.code), fixture.expected.noticeCodes);
    assert.equal(answer.blocks.length, claimBlocks.length + noticeBlocks.length);

    const expectedSourceIds = new Set();
    for (const block of claimBlocks) {
      const claim = claimsById.get(block.claimId);
      assert.ok(claim, `${fixture.id}: unknown approved claim`);
      assert.deepEqual(block, {
        kind: 'claim', claimId: claim.id, title: claim.title, period: claim.period,
        text: claim.text, qualificationNotes: claim.qualificationNotes, sourceIds: claim.sourceIds
      });
      claim.sourceIds.forEach(id => expectedSourceIds.add(id));
    }

    for (const requirement of fixture.expected.qualificationNeedles) {
      const block = claimBlocks.find(item => item.claimId === requirement.claimId);
      assert.ok(block, `${fixture.id}: missing qualified claim ${requirement.claimId}`);
      assert.ok(block.qualificationNotes.some(note => note.includes(requirement.text)), `${fixture.id}: missing qualification ${requirement.text}`);
    }

    assert.deepEqual(new Set(answer.sources.map(source => source.id)), expectedSourceIds);
    assert.equal(answer.sources.length, expectedSourceIds.size);
    for (const id of fixture.expected.minimumExpectedSources) assert.ok(expectedSourceIds.has(id), `${fixture.id}: missing source ${id}`);
    for (const source of answer.sources) {
      const approved = sourcesById.get(source.id);
      assert.deepEqual(source, { id: approved.id, url: approved.url, revision: approved.revision });
    }

    // Notices come from the fixed catalogue, never from question text.
    for (const block of noticeBlocks) {
      const noticeOnly = renderAnswer({ ...selection, claimIds: [], noticeCodes: [block.code] }, corpus);
      assert.deepEqual(noticeOnly.blocks, [block]);
      assert.deepEqual(noticeOnly.sources, []);
    }
  });
}

test('selection cannot carry invented prose, citations or administrative tool instructions', () => {
  const valid = selectionFor(fixtures.cases.find(fixture => fixture.id === 'independent-nexus'));
  const invalidPayloads = [
    { ...valid, text: 'Josh is CISSP-certified and deployed employer AI agents.' },
    { ...valid, answer: 'The permanent extract is live.' },
    { ...valid, sources: [{ id: 'source-nexus', url: 'https://example.com/fabricated' }] },
    { ...valid, tool: 'aws_admin', arguments: { action: 'read_secrets' } },
    { ...valid, claimIds: [{ id: 'claim-experience-nexus', text: 'Invented claim' }] },
    { ...valid, noticeCodes: ['invented_notice'] }
  ];
  for (const payload of invalidPayloads) assert.throws(() => renderAnswer(payload, corpus));
});

test('unknown, archived and wrong-version claims are rejected rather than rendered', () => {
  const valid = selectionFor(fixtures.cases[0]);
  for (const id of ['claim-fabricated-cissp', 'claim-experience-lowkey']) {
    assert.throws(() => renderAnswer({ ...valid, claimIds: [id] }, corpus));
  }
  const differentVersion = `sha256:${'0'.repeat(64)}` === corpus.corpusVersion ? `sha256:${'1'.repeat(64)}` : `sha256:${'0'.repeat(64)}`;
  assert.throws(() => renderAnswer({ ...valid, corpusVersion: differentVersion }, corpus));
  assert.throws(() => renderAnswer({ ...valid, schemaVersion: '2.0.0' }, corpus));
});

test('hostile question fixtures cannot alter the fixed unsupported rendering', () => {
  const baseline = fixtures.cases.find(fixture => fixture.id === 'unsupported-cissp');
  const expectedAnswer = renderAnswer(selectionFor(baseline), corpus);
  for (const fixture of fixtures.cases.filter(item => item.category === 'hostile')) {
    // This deliberately bypasses selection: it checks rendering, not injection detection.
    assert.deepEqual(renderAnswer(selectionFor(fixture), corpus), expectedAnswer);
  }
});
