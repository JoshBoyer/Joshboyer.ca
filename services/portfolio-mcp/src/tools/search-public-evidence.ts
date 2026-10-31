import type {
  SearchPublicEvidenceInput,
  SearchPublicEvidenceMatch,
  SearchPublicEvidenceOutput,
  ToolExecutionContext
} from '../types.js';

interface CorpusRole {
  readonly id: string;
  readonly employer: string;
  readonly title: string;
  readonly period: string;
  readonly scope: string;
  readonly qualificationNotes: readonly string[];
}

interface CorpusQualification {
  readonly id: string;
  readonly label: string;
  readonly aliases: readonly string[];
  readonly note: string;
}

interface CorpusChunk {
  readonly id: string;
  readonly projectId: string;
  readonly roleId: string;
  readonly active: boolean;
  readonly qualificationNotes: readonly string[];
}

interface CorpusData {
  readonly schemaVersion: '1.0.0';
  readonly corpusVersion: string;
  readonly roles: readonly CorpusRole[];
  readonly qualifications: readonly CorpusQualification[];
  readonly chunks: readonly CorpusChunk[];
}

interface ManifestChunk {
  readonly id: string;
  readonly claimId: string;
  readonly kind: 'experience' | 'project';
  readonly projectId: string;
  readonly roleId: string;
  readonly title: string;
  readonly period: string;
  readonly confidence: string;
  readonly tags: readonly string[];
  readonly deliveryStatus: string;
  readonly decision: string;
  readonly process: readonly string[];
  readonly technicalGuidance: string;
  readonly outcome: string;
  readonly resumeText: string;
  readonly qualificationNotes: readonly string[];
  readonly sourceIds: readonly string[];
  readonly sourceUrls: readonly string[];
  readonly lexicalTokens: readonly string[];
}

interface ChunksManifestData {
  readonly schemaVersion: '1.0.0';
  readonly corpusVersion: string;
  readonly chunks: readonly ManifestChunk[];
}

const contracts = require('../../../../chat/contracts/index.cjs') as {
  assertCorpusCompatible(value: unknown): unknown;
  assertToolInput(name: string, value: unknown): SearchPublicEvidenceInput;
  assertToolOutput(name: string, value: unknown): SearchPublicEvidenceOutput;
};
const { validateArtifacts } = require('../../../../chat/knowledge/validate.cjs') as {
  validateArtifacts(value: { corpus: unknown; cag: unknown; chunksManifest: unknown }): boolean;
};
const corpus = require('../../../../chat/knowledge/corpus.json') as CorpusData;
const cag = require('../../../../chat/knowledge/cag-context.json') as unknown;
const chunksManifest = require('../../../../chat/knowledge/chunks-manifest.json') as ChunksManifestData;

validateArtifacts({ corpus, cag, chunksManifest });
contracts.assertCorpusCompatible(corpus);

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

const PROJECT_ALIASES: ReadonlyArray<{ projectId: string; pattern: RegExp; weight: number }> = Object.freeze([
  { projectId: 'nexus', pattern: /\b(?:project-nexus|nexus|multi-agent|capstone|lowkey|workshop42)\b/i, weight: 85 },
  { projectId: 'takeover', pattern: /\b(?:guidewire-policy-takeover|policy-takeover|takeover|claims-history|vba|excel|add-in)\b/i, weight: 85 },
  { projectId: 'renewals', pattern: /\b(?:guidewire-renewal-automation|renewal-automation|renewals?|renewal\s+eligibility)\b/i, weight: 85 },
  { projectId: 'claims', pattern: /\b(?:medavie-claims-integration|claims-integration|providerregistry|adjudication|provider\s+data|provider\s+sync(?:hronization)?|kafka|message[\s-]+broker)\b/i, weight: 80 },
  { projectId: 'continuity', pattern: /\b(?:reporting-data-continuity|data-continuity|continuity|compatibility\s+extract|interim\s+sql)\b/i, weight: 85 },
  { projectId: 'sql', pattern: /\b(?:financial-sql-remediation|sql-remediation|financial\s+reconciliation|claims\s+sql|oracle\s+sql|payment\s+team)\b/i, weight: 85 },
  { projectId: 'dell', pattern: /\b(?:dell-enterprise-support|dell|latitude|optiplex|gloves\s+off|september\s+2006)\b/i, weight: 85 },
  { projectId: 'foundations', pattern: /\b(?:foundations|small\s+business\s+server|swing[\s-]+migrations?|sbs|harris)\b/i, weight: 85 },
  { projectId: 'headquarters', pattern: /\b(?:headquarters|hq\s+move|blade\s+centre|esxi|resilient\s+power|cooling)\b/i, weight: 85 },
  { projectId: 'inquiry', pattern: /\b(?:broker\s+policy\s+inquiry|policy\s+inquiry|inquiry|soap\/xml)\b/i, weight: 80 },
  { projectId: 'workflows', pattern: /\b(?:commercial\s+quoting|csio|acord|al3|edocs|workflows)\b/i, weight: 80 },
  { projectId: 'newbusiness', pattern: /\b(?:newbusiness|new-business|new\s+business|endorsements|broker-portal)\b/i, weight: 80 },
  { projectId: 'upload', pattern: /\b(?:document\s+upload|upload\s+portal|upload|c#|\.net|log-search)\b/i, weight: 80 }
]);

const ROLE_ALIASES: ReadonlyArray<{ roleId: string; pattern: RegExp; weight: number }> = Object.freeze([
  { roleId: 'role-dell', pattern: /\b(?:dell|2006|2007)\b/i, weight: 40 },
  { roleId: 'role-harris', pattern: /\b(?:harris|noc|2008)\b/i, weight: 40 },
  { roleId: 'role-grenville', pattern: /\b(?:grenville|economical|definity|2009|2012|2013|2014|2016|2018)\b/i, weight: 35 },
  { roleId: 'role-medavie', pattern: /\b(?:medavie|blue\s+cross|2022|functional\s+analyst)\b/i, weight: 35 },
  { roleId: 'role-independent', pattern: /\b(?:independent|personal\s+projects?|capstone)\b/i, weight: 40 }
]);

interface IndexedChunk {
  readonly manifest: ManifestChunk;
  readonly titleLower: string;
  readonly titleTokens: ReadonlySet<string>;
  readonly tagSet: ReadonlySet<string>;
  readonly lexicalSet: ReadonlySet<string>;
  readonly primaryBodyLower: string;
  readonly secondaryBodyLower: string;
  readonly qualificationNotes: readonly string[];
  readonly primaryUrl: string;
}

const rolesById = new Map<string, CorpusRole>(corpus.roles.map(role => [role.id, role]));
const activeChunkIds = new Set<string>(
  corpus.chunks.filter(chunk => chunk.active !== false).map(chunk => chunk.id)
);

const INDEXED_CHUNKS: readonly IndexedChunk[] = Object.freeze(
  chunksManifest.chunks
    .filter(chunk => activeChunkIds.has(chunk.id))
    .map(chunk => {
      const role = rolesById.get(chunk.roleId);
      const mergedQualifications: string[] = [];
      for (const note of chunk.qualificationNotes) {
        if (!mergedQualifications.includes(note)) {
          mergedQualifications.push(note);
        }
      }
      if (role) {
        for (const note of role.qualificationNotes) {
          if (!mergedQualifications.includes(note)) {
            mergedQualifications.push(note);
          }
        }
      }
      const titleLower = chunk.title.replace(/[’‘]/g, "'").toLowerCase();
      const titleTokens = new Set<string>(
        Array.from(titleLower.matchAll(/[a-z0-9]+(?:-[a-z0-9]+)*/g), m => m[0]).filter(
          w => w.length >= 2 && !STOPWORDS.has(w)
        )
      );
      const primaryBodyLower = [chunk.resumeText, chunk.decision, chunk.outcome]
        .join(' ')
        .replace(/[’‘]/g, "'")
        .toLowerCase();
      const secondaryBodyLower = [
        ...chunk.process,
        chunk.technicalGuidance,
        ...mergedQualifications,
        role ? `${role.employer} ${role.title} ${role.scope}` : ''
      ]
        .join(' ')
        .replace(/[’‘]/g, "'")
        .toLowerCase();

      return Object.freeze({
        manifest: chunk,
        titleLower,
        titleTokens,
        tagSet: new Set(chunk.tags.map(t => t.toLowerCase())),
        lexicalSet: new Set(chunk.lexicalTokens.map(t => t.toLowerCase())),
        primaryBodyLower,
        secondaryBodyLower,
        qualificationNotes: Object.freeze(mergedQualifications),
        primaryUrl: chunk.sourceUrls[0] ?? `https://joshboyer.ca/#projects/${chunk.projectId}`
      });
    })
);

function tokenizeQuery(rawQuery: string): { normalizedQuery: string; tokens: string[] } {
  const normalizedQuery = rawQuery
    .replace(/[’‘]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  const tokenSet = new Set<string>();
  if (normalizedQuery.includes('c#')) {
    tokenSet.add('c#');
    tokenSet.add('csharp');
  }
  if (normalizedQuery.includes('.net')) {
    tokenSet.add('.net');
    tokenSet.add('dotnet');
  }
  if (normalizedQuery.includes('p&c')) {
    tokenSet.add('p&c');
    tokenSet.add('property and casualty');
  }
  if (normalizedQuery.includes('pub/sub') || normalizedQuery.includes('pubsub')) {
    tokenSet.add('pub/sub');
    tokenSet.add('pubsub');
  }

  for (const match of normalizedQuery.matchAll(/[a-z0-9]+(?:-[a-z0-9]+)*/g)) {
    const word = match[0];
    if (word.length >= 2 && word.length <= 64 && !STOPWORDS.has(word)) {
      tokenSet.add(word);
    }
    if (word.includes('-')) {
      for (const part of word.split('-')) {
        if (part.length >= 2 && part.length <= 64 && !STOPWORDS.has(part)) {
          tokenSet.add(part);
        }
      }
    }
  }

  return { normalizedQuery, tokens: [...tokenSet] };
}

function scoreChunk(
  item: IndexedChunk,
  normalizedQuery: string,
  tokens: readonly string[],
  requestedFacets: readonly string[]
): number {
  let score = 0;

  // 1. Facet filter match bonus
  if (requestedFacets.length > 0) {
    let matchedFacetCount = 0;
    for (const facet of requestedFacets) {
      if (item.tagSet.has(facet)) {
        matchedFacetCount += 1;
      }
    }
    if (matchedFacetCount === 0) {
      return 0;
    }
    score += matchedFacetCount * 25;
  }

  // 2. Direct projectId or chunkId mention
  if (tokens.includes(item.manifest.projectId) || tokens.includes(item.manifest.id)) {
    score += 110;
  }

  // 3. Project alias boosts
  for (const alias of PROJECT_ALIASES) {
    if (alias.projectId === item.manifest.projectId && alias.pattern.test(normalizedQuery)) {
      score += alias.weight;
    }
  }

  // 4. Role / employer alias boosts
  for (const roleAlias of ROLE_ALIASES) {
    if (roleAlias.roleId === item.manifest.roleId && roleAlias.pattern.test(normalizedQuery)) {
      score += roleAlias.weight;
    }
  }

  // 5. Title substring boost
  if (normalizedQuery.length >= 4 && item.titleLower.includes(normalizedQuery)) {
    score += 90;
  }

  // 6. Qualification alias boundary matching
  for (const qual of corpus.qualifications) {
    const queryMentionsQual = qual.aliases.some(a => normalizedQuery.includes(a.toLowerCase()));
    if (queryMentionsQual) {
      const chunkHasQual = qual.aliases.some(a => item.lexicalSet.has(a.toLowerCase()));
      if (chunkHasQual) {
        score += 35;
      }
    }
  }

  // 7. Per-token lexical & field scoring
  for (const token of tokens) {
    if (token === item.manifest.projectId || token === item.manifest.id) {
      score += 35;
    }
    if (item.titleTokens.has(token)) {
      score += 28;
    }
    if (item.tagSet.has(token)) {
      score += 22;
    }
    if (item.lexicalSet.has(token)) {
      score += 14;
    } else if (item.primaryBodyLower.includes(token)) {
      score += 12;
    } else if (item.secondaryBodyLower.includes(token)) {
      score += 8;
    }
  }

  if (score <= 0) {
    return 0;
  }

  return Math.min(1000, Math.round(score * 100) / 100);
}

export async function searchPublicEvidence(
  args: SearchPublicEvidenceInput,
  context?: ToolExecutionContext
): Promise<SearchPublicEvidenceOutput> {
  if (context?.signal?.aborted) {
    throw new Error('TOOL_ABORTED');
  }

  const validated = contracts.assertToolInput('search_public_evidence', args);
  const limit = validated.limit ?? 4;
  const requestedFacets = validated.filters?.facets ?? [];
  const { normalizedQuery, tokens } = tokenizeQuery(validated.query);

  const scored: Array<{ item: IndexedChunk; score: number }> = [];
  for (const item of INDEXED_CHUNKS) {
    const score = scoreChunk(item, normalizedQuery, tokens, requestedFacets);
    if (score > 0) {
      scored.push({ item, score });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.item.manifest.id < b.item.manifest.id ? -1 : a.item.manifest.id > b.item.manifest.id ? 1 : 0;
  });

  const matches: SearchPublicEvidenceMatch[] = scored.slice(0, limit).map(({ item, score }) => ({
    chunkId: item.manifest.id,
    claimId: item.manifest.claimId,
    projectId: item.manifest.projectId,
    title: item.manifest.title,
    period: item.manifest.period,
    score,
    text: item.manifest.resumeText,
    qualificationNotes: [...item.qualificationNotes],
    sourceIds: [...item.manifest.sourceIds],
    url: item.primaryUrl
  }));

  const output: SearchPublicEvidenceOutput = {
    schemaVersion: '1.0.0',
    corpusVersion: corpus.corpusVersion,
    retrievalMode: 'deterministic',
    matches
  };

  return contracts.assertToolOutput('search_public_evidence', output);
}

export const search_public_evidence = searchPublicEvidence;
