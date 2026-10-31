'use strict';

const crypto = require('node:crypto');
const Ajv2020 = require('ajv/dist/2020');
const schema = require('./schema.json');
const policy = require('./policy.json');

const ajv = new Ajv2020({ strict: true, allErrors: true, coerceTypes: false, useDefaults: false, removeAdditional: false });
ajv.addSchema(schema);
const validateCorpusShape = ajv.compile({ $ref: `${schema.$id}#/$defs/corpus` });
const validateCagShape = ajv.compile({ $ref: `${schema.$id}#/$defs/cag` });

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function digest(value) {
  return sha256(canonicalJson(value));
}

function omit(value, key) {
  return Object.fromEntries(Object.entries(value).filter(([name]) => name !== key));
}

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function checkShape(validate, value, name) {
  requireCondition(validate(value), `${name} does not match knowledge schema`);
}

function uniqueIndex(rows, name) {
  const index = new Map();
  for (const row of rows) {
    requireCondition(!index.has(row.id), `Duplicate ${name} identifier`);
    index.set(row.id, row);
  }
  return index;
}

function same(a, b) {
  return canonicalJson(a) === canonicalJson(b);
}

function validateCorpus(corpus) {
  checkShape(validateCorpusShape, corpus, 'Corpus');
  const roles = uniqueIndex(corpus.roles, 'role');
  const sources = uniqueIndex(corpus.sources, 'source');
  const claims = uniqueIndex(corpus.claims, 'claim');
  uniqueIndex(corpus.qualifications, 'qualification');
  uniqueIndex(corpus.chunks, 'chunk');
  const usedSources = new Set();
  const usedRoles = new Set();
  requireCondition(corpus.claims.length === corpus.chunks.length, 'Expected one canonical claim per chunk');
  for (const chunk of corpus.chunks) {
    const role = roles.get(chunk.roleId);
    requireCondition(role, 'Unknown chunk role');
    usedRoles.add(role.id);
    requireCondition(role.qualificationNotes.every(note => chunk.qualificationNotes.includes(note)), 'Missing role qualification');
    requireCondition(chunk.contentSha256 === digest(omit(chunk, 'contentSha256')), 'Chunk content digest mismatch');
    for (const id of chunk.sourceRefs) {
      const source = sources.get(id);
      requireCondition(source, 'Unknown chunk source');
      requireCondition(source.url === `${policy.publicOrigin}/#projects/${chunk.projectId}`, 'Source does not match chunk project');
      usedSources.add(id);
    }
    const expectedId = `claim-${chunk.id}`;
    const claim = claims.get(expectedId);
    requireCondition(claim && same(chunk.claimIds, [expectedId]), 'Unknown or inconsistent canonical claim');
    requireCondition(same(claim, {
      id: expectedId, chunkId: chunk.id, projectId: chunk.projectId, title: chunk.title,
      period: chunk.period, text: chunk.resumeText, sourceIds: chunk.sourceRefs,
      qualificationNotes: chunk.qualificationNotes
    }), 'Canonical claim differs from approved chunk');
  }
  requireCondition(usedSources.size === sources.size, 'Unreferenced corpus source');
  requireCondition(usedRoles.size === roles.size, 'Unreferenced corpus role');
  requireCondition(corpus.provenance.policySha256 === digest(policy), 'Extraction policy mismatch');
  requireCondition(same(corpus.boundaries, policy.boundaries), 'Knowledge boundaries mismatch');
  requireCondition(corpus.corpusVersion === `sha256:${digest(omit(corpus, 'corpusVersion'))}`, 'Corpus version digest mismatch');
  return true;
}

function createCag(corpus) {
  const claimsByChunk = new Map(corpus.claims.map(claim => [claim.chunkId, claim]));
  const claims = policy.cagChunkIds.map(id => {
    const claim = claimsByChunk.get(id);
    requireCondition(claim, 'Required CAG claim is not active');
    return claim;
  });
  const sourceIds = new Set(claims.flatMap(claim => claim.sourceIds));
  const result = {
    schemaVersion: policy.schemaVersion,
    corpusVersion: corpus.corpusVersion,
    person: corpus.person,
    roles: corpus.roles,
    claims,
    sources: corpus.sources.filter(source => sourceIds.has(source.id)),
    qualifications: corpus.qualifications,
    boundaries: corpus.boundaries
  };
  return { ...result, contentSha256: digest(result) };
}

function validateArtifacts({ corpus, cag }) {
  validateCorpus(corpus);
  checkShape(validateCagShape, cag, 'CAG context');
  requireCondition(cag.corpusVersion === corpus.corpusVersion, 'CAG corpus version mismatch');
  requireCondition(cag.contentSha256 === digest(omit(cag, 'contentSha256')), 'CAG content digest mismatch');
  requireCondition(same(cag, createCag(corpus)), 'CAG differs from approved corpus selection');
  requireCondition(Buffer.byteLength(JSON.stringify(cag, null, 2) + '\n', 'utf8') <= policy.maxCagBytes, 'CAG exceeds context byte limit');
  return true;
}

module.exports = { canonicalJson, sha256, digest, validateCorpus, validateArtifacts, createCag };
