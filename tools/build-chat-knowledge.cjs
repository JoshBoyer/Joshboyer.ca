'use strict';

const fs = require('node:fs');
const path = require('node:path');
const policy = require('../chat/knowledge/policy.json');
const { sha256, digest, validateArtifacts, createCag, createChunksManifest } = require('../chat/knowledge/validate.cjs');
const { assertCorpusCompatible, assertToolOutput } = require('../chat/contracts/index.cjs');

const ROOT = path.resolve(__dirname, '..');
const INPUT = 'dist/career-evidence.v3.json';
const ANCHORS = 'dist/index.html';
const OUTPUTS = Object.freeze({
  corpus: 'chat/knowledge/corpus.json',
  cag: 'chat/knowledge/cag-context.json',
  chunksManifest: 'chat/knowledge/chunks-manifest.json'
});
const CHUNK_FIELDS = ['id', 'kind', 'projectId', 'roleId', 'title', 'period', 'tags', 'decision', 'process', 'technicalGuidance', 'outcome', 'resumeText', 'sourceRefs', 'confidence', 'qualificationNotes'];
const ROLE_FIELDS = ['id', 'employer', 'title', 'period', 'scope', 'qualificationNotes'];

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

// Every path is fixed by this module. Reject links in every existing component,
// including output parents, before reading or writing any artifact.
function safePath(root, relative) {
  const base = path.resolve(root);
  requireCondition(fs.lstatSync(base).isDirectory() && !fs.lstatSync(base).isSymbolicLink(), 'Root must be a real directory');
  requireCondition(!path.isAbsolute(relative) && !relative.split(/[\\/]/).includes('..'), 'Unsafe relative path');
  let current = base;
  const parts = relative.split('/');
  for (const [index, part] of parts.entries()) {
    current = path.join(current, part);
    let stat;
    try { stat = fs.lstatSync(current); } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    requireCondition(!stat.isSymbolicLink(), 'Symbolic links are not allowed in knowledge paths');
    requireCondition(index === parts.length - 1 ? stat.isFile() : stat.isDirectory(), 'Unexpected knowledge path type');
  }
  return current;
}

function pick(record, fields) {
  requireCondition(record && typeof record === 'object' && !Array.isArray(record), 'Expected source record');
  return Object.fromEntries(fields.map(key => [key, record[key]]));
}

function indexRows(rows, name) {
  requireCondition(Array.isArray(rows) && rows.length <= 1024, `Invalid ${name} collection`);
  const index = new Map();
  for (const row of rows) {
    requireCondition(row && typeof row.id === 'string' && /^[a-z][a-z0-9-]{0,95}$/.test(row.id), `Invalid ${name} identifier`);
    requireCondition(!index.has(row.id), `Duplicate ${name} identifier`);
    index.set(row.id, row);
  }
  return index;
}

function sorted(rows) {
  return rows.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

function buildArtifacts({ root = ROOT } = {}) {
  const inputPath = safePath(root, INPUT);
  requireCondition(fs.statSync(inputPath).size <= 1024 * 1024, 'Knowledge input exceeds byte limit');
  const inputBytes = fs.readFileSync(inputPath);
  const input = JSON.parse(inputBytes.toString('utf8'));
  requireCondition(input.schemaVersion === '1.0.0', 'Unsupported public source schema version');
  const inputChunks = indexRows(input.chunks, 'chunk');
  const inputRoles = indexRows(input.roles, 'role');
  const inputSources = indexRows(input.sources, 'source');
  const inputQualifications = indexRows(input.qualificationCatalog, 'qualification');
  const html = fs.readFileSync(safePath(root, ANCHORS), 'utf8');
  const anchors = new Set([...html.matchAll(/<template\s+id="project-([a-z][a-z0-9-]*)"/g)].map(match => match[1]));
  const sourceIds = new Set();
  const roleIds = new Set();
  const chunks = [];
  const claims = [];
  for (const original of inputChunks.values()) {
    requireCondition(typeof original.active === 'boolean', 'Chunk publication eligibility must be explicit');
    if (!original.active) continue;
    const chunk = pick(original, CHUNK_FIELDS);
    requireCondition(anchors.has(chunk.projectId), 'Unknown public project anchor');
    const role = inputRoles.get(chunk.roleId);
    requireCondition(role && Array.isArray(role.qualificationNotes), 'Unknown role or missing role qualifications');
    requireCondition(Array.isArray(chunk.qualificationNotes), 'Missing chunk qualifications');
    requireCondition(Array.isArray(chunk.sourceRefs) && chunk.sourceRefs.length > 0, 'Missing chunk sources');
    chunk.qualificationNotes = [...new Set([...chunk.qualificationNotes, ...role.qualificationNotes])];
    for (const id of chunk.sourceRefs) {
      const source = inputSources.get(id);
      requireCondition(source && source.path === `index.html#projects/${chunk.projectId}`, 'Invalid or mismatched public source path');
      sourceIds.add(id);
    }
    roleIds.add(role.id);
    const claimId = `claim-${chunk.id}`;
    chunk.claimIds = [claimId];
    chunk.active = true;
    chunk.contentSha256 = digest(chunk);
    chunks.push(chunk);
    claims.push({
      id: claimId, chunkId: chunk.id, projectId: chunk.projectId, title: chunk.title,
      period: chunk.period, text: chunk.resumeText, sourceIds: chunk.sourceRefs,
      qualificationNotes: chunk.qualificationNotes
    });
  }
  const qualifications = [];
  for (const row of inputQualifications.values()) {
    requireCondition(row.active === undefined || typeof row.active === 'boolean', 'Invalid qualification eligibility');
    if (row.active !== false) qualifications.push(pick(row, ['id', 'label', 'aliases', 'note']));
  }
  const content = {
    schemaVersion: policy.schemaVersion,
    provenance: {
      inputPath: INPUT, inputSha256: sha256(inputBytes), datasetVersion: input.datasetVersion,
      sourceSchemaVersion: input.schemaVersion, reviewedSourceCommit: input.reviewedSourceCommit,
      scope: input.scope, editorialRevision: input.editorialRevision,
      extractionVersion: policy.extractionVersion, policySha256: digest(policy)
    },
    person: pick(input.person, ['name', 'positioning', 'summary']),
    roles: sorted([...roleIds].map(id => pick(inputRoles.get(id), ROLE_FIELDS))),
    sources: sorted([...sourceIds].map(id => {
      const source = inputSources.get(id);
      return { ...pick(source, ['id', 'revision', 'kind', 'confidence', 'note']), url: `${policy.publicOrigin}/${source.path.slice('index.html'.length)}` };
    })),
    claims: sorted(claims), chunks: sorted(chunks), qualifications: sorted(qualifications),
    boundaries: policy.boundaries
  };
  const corpus = { schemaVersion: content.schemaVersion, corpusVersion: `sha256:${digest(content)}`, ...content };
  const cag = createCag(corpus);
  validateArtifacts({ corpus, cag });
  assertCorpusCompatible(corpus);
  const chunksManifest = createChunksManifest(corpus);
  const artifacts = { corpus, cag, chunksManifest };
  validateArtifacts(artifacts);
  for (const cs of artifacts.chunksManifest.caseStudies) {
    assertToolOutput('get_case_study', {
      schemaVersion: policy.schemaVersion,
      corpusVersion: corpus.corpusVersion,
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
    });
  }
  return artifacts;
}

function serialise(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function checkArtifacts({ root = ROOT } = {}) {
  const expected = buildArtifacts({ root });
  for (const [key, relative] of Object.entries(OUTPUTS)) {
    const file = safePath(root, relative);
    requireCondition(fs.existsSync(file) && fs.readFileSync(file, 'utf8') === serialise(expected[key]), `Stale or missing knowledge artifact: ${relative}`);
  }
  return expected;
}

function writeArtifacts({ root = ROOT } = {}) {
  const artifacts = buildArtifacts({ root });
  // Validate every target before changing either file. A failed build never
  // replaces a previously valid export.
  const paths = Object.fromEntries(Object.entries(OUTPUTS).map(([key, relative]) => [key, safePath(root, relative)]));
  for (const [key, file] of Object.entries(paths)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, serialise(artifacts[key]), { flag: 'wx' });
    try { fs.renameSync(temporary, file); } finally {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
  }
  return artifacts;
}

if (require.main === module) {
  try {
    requireCondition(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--check'), 'Usage: node tools/build-chat-knowledge.cjs [--check]');
    const artifacts = process.argv[2] === '--check' ? checkArtifacts() : writeArtifacts();
    process.stdout.write(`Chat knowledge ${process.argv[2] === '--check' ? 'verified' : 'built'}: ${artifacts.corpus.claims.length} claims, ${artifacts.corpus.sources.length} sources, ${artifacts.corpus.corpusVersion}\n`);
  } catch (error) {
    process.stderr.write(`Chat knowledge: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { buildArtifacts, checkArtifacts, writeArtifacts };
