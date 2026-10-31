'use strict';

const crypto = require('node:crypto');
const Ajv2020 = require('ajv/dist/2020');
const schema = require('./schema.json');
const policy = require('./policy.json');

const ajv = new Ajv2020({ strict: true, allErrors: true, coerceTypes: false, useDefaults: false, removeAdditional: false });
ajv.addSchema(schema);
const validateCorpusShape = ajv.compile({ $ref: `${schema.$id}#/$defs/corpus` });
const validateCagShape = ajv.compile({ $ref: `${schema.$id}#/$defs/cag` });
const validateChunksManifestShape = ajv.compile({ $ref: `${schema.$id}#/$defs/chunksManifest` });

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const MAX_EMBEDDING_TEXT_BYTES = 4096;
const STOPWORDS = new Set([
  'about', 'above', 'across', 'after', 'against', 'along', 'also', 'amid', 'among', 'an', 'and',
  'are', 'around', 'as', 'at', 'be', 'because', 'before', 'behind', 'below', 'beneath',
  'beside', 'besides', 'between', 'beyond', 'both', 'but', 'by', 'can', 'did', 'do',
  'does', 'done', 'down', 'during', 'each', 'either', 'for', 'from', 'had', 'has',
  'have', 'having', 'her', 'here', 'hers', 'him', 'his', 'how', 'if', 'in', 'into',
  'is', 'it', 'its', 'more', 'most', 'my', 'near', 'neither', 'no', 'nor', 'not', 'of',
  'off', 'on', 'once', 'only', 'onto', 'or', 'other', 'our', 'ours', 'out', 'outside',
  'over', 'own', 'same', 'she', 'should', 'since', 'so', 'some', 'such', 'than', 'that',
  'the', 'their', 'theirs', 'them', 'then', 'there', 'these', 'they', 'this', 'those',
  'through', 'to', 'too', 'toward', 'towards', 'under', 'until', 'up', 'upon', 'us',
  'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom',
  'whose', 'why', 'will', 'with', 'within', 'without', 'would', 'yet', 'you', 'your'
]);

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

function deriveDeliveryStatus(chunk) {
  requireCondition(chunk && typeof chunk === 'object' && !Array.isArray(chunk), 'Expected chunk object for deliveryStatus');
  if (chunk.roleId === 'role-independent' || chunk.kind === 'project') {
    return chunk.projectId === 'nexus' || /\bcapstone\b/i.test(chunk.outcome || '') ? 'independent_capstone' : 'historical_personal';
  }
  const combined = `${chunk.outcome || ''} ${chunk.resumeText || ''} ${chunk.technicalGuidance || ''} ${(chunk.qualificationNotes || []).join(' ')}`;
  if (/\bapproved\b.*\bdesign\b|\binterim\b|\bunconfirmed live\b|\bunfinished\b/i.test(combined)) {
    return 'approved_design_interim';
  }
  if (/\bcontinuing (?:functional |testing and production )?support\b|\bsole service development\b/i.test(combined)) {
    return 'implemented_supported';
  }
  return 'production';
}

function createEmbeddingText(chunk, deliveryStatus = deriveDeliveryStatus(chunk)) {
  return [
    `Title: ${chunk.title}`,
    `Period: ${chunk.period}`,
    `Project: ${chunk.projectId} (${chunk.kind}, ${deliveryStatus})`,
    `Claim: ${chunk.resumeText}`,
    `Decision: ${chunk.decision}`,
    `Process: ${chunk.process.join(' | ')}`,
    `Technical guidance: ${chunk.technicalGuidance}`,
    `Outcome: ${chunk.outcome}`,
    `Qualification boundaries: ${chunk.qualificationNotes.join(' | ')}`
  ].join('\n');
}

function extractLexicalTokens(chunk, role, qualifications) {
  const tokens = new Set([
    chunk.projectId.toLowerCase(),
    chunk.roleId.toLowerCase(),
    chunk.roleId.replace(/^role-/, '').toLowerCase()
  ]);
  for (const tag of chunk.tags || []) {
    tokens.add(tag.toLowerCase());
  }
  const combined = [
    chunk.title,
    chunk.period,
    role ? role.employer : '',
    role ? role.title : '',
    chunk.resumeText,
    chunk.decision,
    chunk.outcome,
    ...(chunk.process || []),
    chunk.technicalGuidance,
    ...(chunk.qualificationNotes || [])
  ].join(' ').replace(/[’‘]/g, "'").toLowerCase();

  if (combined.includes('c#')) {
    tokens.add('c#');
    tokens.add('csharp');
  }
  if (combined.includes('.net')) {
    tokens.add('.net');
    tokens.add('dotnet');
  }
  if (combined.includes('p&c')) {
    tokens.add('p&c');
    tokens.add('property and casualty');
  }
  if (combined.includes('pub/sub') || (chunk.tags || []).includes('pubsub')) {
    tokens.add('pub/sub');
    tokens.add('pubsub');
  }

  for (const match of combined.matchAll(/[a-z0-9]+(?:-[a-z0-9]+)*/g)) {
    const word = match[0];
    if (word.length >= 2 && word.length <= 64 && !STOPWORDS.has(word)) {
      tokens.add(word);
    }
    if (word.includes('-')) {
      for (const part of word.split('-')) {
        if (part.length >= 2 && part.length <= 64 && !STOPWORDS.has(part)) {
          tokens.add(part);
        }
      }
    }
  }

  const qualContext = [...(chunk.qualificationNotes || []), ...(chunk.tags || [])]
    .join(' ')
    .replace(/[’‘]/g, "'")
    .toLowerCase();
  for (const qualification of qualifications || []) {
    const aliases = qualification.aliases || [];
    const matched = aliases.some(alias => qualContext.includes(alias.toLowerCase())) ||
      (qualification.id === 'qual-message-broker' && (chunk.tags || []).includes('pubsub'));
    if (matched) {
      for (const alias of aliases) {
        tokens.add(alias.toLowerCase());
      }
    }
  }

  return [...tokens].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
}

function createChunksManifest(corpus) {
  const roles = uniqueIndex(corpus.roles, 'role');
  const sources = uniqueIndex(corpus.sources, 'source');
  const sortedChunks = [...corpus.chunks].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const chunks = sortedChunks.map(chunk => {
    const role = roles.get(chunk.roleId);
    requireCondition(role, 'Unknown chunk role');
    const deliveryStatus = deriveDeliveryStatus(chunk);
    const sourceUrls = [...new Set(chunk.sourceRefs.map(id => {
      const source = sources.get(id);
      requireCondition(source, 'Unknown chunk source');
      return source.url;
    }))];
    const embeddingText = createEmbeddingText(chunk, deliveryStatus);
    const lexicalTokens = extractLexicalTokens(chunk, role, corpus.qualifications);
    const entry = {
      id: chunk.id,
      claimId: `claim-${chunk.id}`,
      kind: chunk.kind,
      projectId: chunk.projectId,
      roleId: chunk.roleId,
      title: chunk.title,
      period: chunk.period,
      confidence: chunk.confidence,
      tags: [...chunk.tags],
      deliveryStatus,
      decision: chunk.decision,
      process: [...chunk.process],
      technicalGuidance: chunk.technicalGuidance,
      outcome: chunk.outcome,
      resumeText: chunk.resumeText,
      qualificationNotes: [...chunk.qualificationNotes],
      sourceIds: [...chunk.sourceRefs],
      sourceUrls,
      embeddingText,
      lexicalTokens
    };
    return { ...entry, contentSha256: digest(entry) };
  });

  const byProject = new Map();
  for (const chunk of chunks) {
    if (!byProject.has(chunk.projectId)) byProject.set(chunk.projectId, []);
    byProject.get(chunk.projectId).push(chunk);
  }
  const caseStudies = [...byProject.entries()]
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([projectId, projectChunks]) => {
      const primary = projectChunks.find(item => item.id === `experience-${projectId}`) || projectChunks[0];
      const role = roles.get(primary.roleId);
      const sourceIds = [...new Set(projectChunks.flatMap(item => item.sourceIds))];
      return {
        projectId,
        chunkId: primary.id,
        claimId: primary.claimId,
        chunkIds: projectChunks.map(item => item.id),
        claimIds: projectChunks.map(item => item.claimId),
        roleId: role.id,
        employer: role.employer,
        roleTitle: role.title,
        roleScope: role.scope,
        title: primary.title,
        period: primary.period,
        deliveryStatus: primary.deliveryStatus,
        deliveryStatuses: [...new Set(projectChunks.map(item => item.deliveryStatus))],
        text: primary.resumeText,
        decision: primary.decision,
        process: [...primary.process],
        technicalGuidance: primary.technicalGuidance,
        outcome: primary.outcome,
        tags: [...new Set(projectChunks.flatMap(item => item.tags))],
        qualificationNotes: [...new Set(projectChunks.flatMap(item => item.qualificationNotes))],
        sources: sourceIds.map(id => {
          const source = sources.get(id);
          return { id: source.id, url: source.url, revision: source.revision };
        })
      };
    });

  const manifest = {
    schemaVersion: policy.schemaVersion,
    corpusVersion: corpus.corpusVersion,
    indexVersion: `idx-${corpus.corpusVersion.slice(7, 23)}`,
    embeddingModel: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    chunks,
    caseStudies
  };
  return { ...manifest, manifestSha256: digest(manifest) };
}

function validateChunksManifest(chunksManifest, corpus) {
  validateCorpus(corpus);
  checkShape(validateChunksManifestShape, chunksManifest, 'Chunks manifest');
  requireCondition(chunksManifest.corpusVersion === corpus.corpusVersion, 'Chunks manifest corpus version mismatch');
  requireCondition(chunksManifest.indexVersion === `idx-${corpus.corpusVersion.slice(7, 23)}`, 'Chunks manifest index version mismatch');
  requireCondition(
    chunksManifest.embeddingModel === EMBEDDING_MODEL && chunksManifest.dimensions === EMBEDDING_DIMENSIONS,
    'Chunks manifest embedding configuration mismatch'
  );
  requireCondition(chunksManifest.chunks.length === corpus.chunks.length, 'Chunks manifest count mismatch');
  for (const entry of chunksManifest.chunks) {
    requireCondition(entry.contentSha256 === digest(omit(entry, 'contentSha256')), 'Manifest chunk content digest mismatch');
    requireCondition(
      Buffer.byteLength(entry.embeddingText, 'utf8') <= MAX_EMBEDDING_TEXT_BYTES,
      'Manifest chunk embedding text exceeds byte limit'
    );
    requireCondition(
      entry.embeddingText.includes('Qualification boundaries:') &&
      entry.qualificationNotes.every(note => entry.embeddingText.includes(note)),
      'Manifest chunk embedding text is missing qualification notes'
    );
    requireCondition(
      same(entry.lexicalTokens, [...new Set(entry.lexicalTokens)].sort((a, b) => a < b ? -1 : a > b ? 1 : 0)),
      'Manifest chunk lexical tokens must be unique and sorted'
    );
  }
  requireCondition(chunksManifest.manifestSha256 === digest(omit(chunksManifest, 'manifestSha256')), 'Chunks manifest digest mismatch');
  requireCondition(same(chunksManifest, createChunksManifest(corpus)), 'Chunks manifest differs from approved corpus');
  return true;
}

function validateArtifacts({ corpus, cag, chunksManifest }) {
  validateCorpus(corpus);
  checkShape(validateCagShape, cag, 'CAG context');
  requireCondition(cag.corpusVersion === corpus.corpusVersion, 'CAG corpus version mismatch');
  requireCondition(cag.contentSha256 === digest(omit(cag, 'contentSha256')), 'CAG content digest mismatch');
  requireCondition(same(cag, createCag(corpus)), 'CAG differs from approved corpus selection');
  requireCondition(Buffer.byteLength(JSON.stringify(cag, null, 2) + '\n', 'utf8') <= policy.maxCagBytes, 'CAG exceeds context byte limit');
  if (chunksManifest !== undefined) {
    validateChunksManifest(chunksManifest, corpus);
  }
  return true;
}

module.exports = {
  canonicalJson,
  sha256,
  digest,
  validateCorpus,
  validateArtifacts,
  validateChunksManifest,
  createCag,
  createChunksManifest,
  createEmbeddingText,
  deriveDeliveryStatus,
  extractLexicalTokens
};
