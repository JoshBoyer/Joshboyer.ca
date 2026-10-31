'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const evaluator = require('../chat/evaluation/evaluator.cjs');
const adversarialSuite = evaluator.loadAdversarialPrompts();

test('Phase 4 adversarial prompts dataset has >= 20 structured hostile cases across all required attack classes', () => {
  assert.equal(adversarialSuite.schemaVersion, '2026-10-31.phase4.v1');
  assert.ok(Array.isArray(adversarialSuite.cases), 'adversarial-prompts.json must contain a cases array');
  assert.ok(
    adversarialSuite.cases.length >= 20,
    `Expected >= 20 adversarial cases, observed ${adversarialSuite.cases.length}`,
  );

  const ids = new Set(adversarialSuite.cases.map((entry) => entry.id));
  for (let i = 1; i <= 24; i += 1) {
    const expectedId = `A${String(i).padStart(2, '0')}`;
    assert.ok(ids.has(expectedId), `Missing adversarial case ${expectedId}`);
  }
});

for (const advCase of adversarialSuite.cases) {
  test(`Phase 4 Adversarial Prompt [${advCase.id}] (${advCase.category}): ${advCase.title}`, async () => {
    const result = await evaluator.evaluateAdversarialCase(advCase);
    assert.equal(
      result.passed,
      true,
      `Adversarial case ${advCase.id} failed: ${JSON.stringify(result.diagnostics || result)}`,
    );

    assert.equal(
      result.canaryLeaked,
      false,
      `Canary ${advCase.canary} leaked in adversarial case ${advCase.id}`,
    );
    assert.equal(
      result.innerHtmlWrites,
      0,
      `Browser DOM renderer wrote to innerHTML during ${advCase.id}`,
    );

    if (advCase.expected.mustDetectViolation) {
      assert.equal(result.candidateRejected, true, `Hostile candidate reply in ${advCase.id} must be rejected`);
      assert.ok(
        result.violationCodes.includes(advCase.expected.violationCode),
        `Expected violationCode ${advCase.expected.violationCode} in ${JSON.stringify(result.violationCodes)}`,
      );
    }

    if (advCase.expected.mustBeRefusal) {
      assert.equal(result.finalReply.kind, 'refusal');
      assert.equal(result.secondaryProviderCalls, 0, 'Safety refusal must never call secondary fallback provider');
      assert.equal(result.secondaryProviderCostMicroUsd, 0, 'Safety refusal must incur 0 secondary fallback cost');
    }
  });
}

test('Adversarial negative-path table: every rule has a verified hostile test and deterministic rejection', () => {
  const tableResults = evaluator.runNegativePathTable();
  assert.ok(Array.isArray(tableResults) && tableResults.length >= 12);

  for (const row of tableResults) {
    assert.equal(
      row.passed,
      true,
      `Negative-path rule "${row.rule}" (${row.hostileTest}) failed: ${row.result}`,
    );
    assert.ok(row.rule.length > 0);
    assert.ok(row.hostileTest.length > 0);
    assert.ok(row.result.length > 0);
  }
});

test('Hostile objects from outside the trust boundary: throwing getters, Proxies, inherited fields, __proto__, and extra keys fail closed', () => {
  const hostileReport = evaluator.evaluateHostileBoundaryObjects();
  assert.equal(hostileReport.passed, true, JSON.stringify(hostileReport));
  assert.equal(hostileReport.prototypePolluted, false, 'Object.prototype must never be polluted');
  assert.equal(hostileReport.throwingGetterRejected, true);
  assert.equal(hostileReport.proxyTrapRejected, true);
  assert.equal(hostileReport.inheritedFieldsIgnored, true);
  assert.equal(hostileReport.extraKeysRejected, true);
});

test('Property and fuzz suite (seed=0x20261031, 128 iterations): never throws unclassified errors, never emits canaries, and is 100% deterministic', () => {
  const SEED = 0x20261031;
  const run1 = evaluator.runPropertyFuzzSuite({ seed: SEED, iterations: 128 });
  const run2 = evaluator.runPropertyFuzzSuite({ seed: SEED, iterations: 128 });

  assert.equal(run1.passed, true, `Fuzz run 1 failed: ${JSON.stringify(run1.failures)}`);
  assert.equal(run1.seed, SEED);
  assert.equal(run1.iterations, 128);
  assert.equal(run1.unclassifiedErrors, 0);
  assert.equal(run1.canaryLeaks, 0);
  assert.ok(typeof run1.digest === 'string' && run1.digest.length === 64);
  assert.equal(run1.digest, run2.digest, 'Same seed and inputs must produce identical output digest');
});
