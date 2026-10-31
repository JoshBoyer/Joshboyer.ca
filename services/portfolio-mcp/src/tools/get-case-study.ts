import type {
  CaseStudySource,
  GetCaseStudyInput,
  GetCaseStudyOutput,
  ToolExecutionContext
} from '../types.js';

interface CorpusRole {
  readonly id: string;
  readonly qualificationNotes: readonly string[];
}

interface CorpusData {
  readonly schemaVersion: '1.0.0';
  readonly corpusVersion: string;
  readonly roles: readonly CorpusRole[];
}

interface ManifestCaseStudy {
  readonly projectId: string;
  readonly chunkId: string;
  readonly claimId: string;
  readonly roleId: string;
  readonly title: string;
  readonly period: string;
  readonly text: string;
  readonly decision: string;
  readonly process: readonly string[];
  readonly technicalGuidance: string;
  readonly outcome: string;
  readonly tags: readonly string[];
  readonly qualificationNotes: readonly string[];
  readonly sources: readonly CaseStudySource[];
}

interface ChunksManifestData {
  readonly schemaVersion: '1.0.0';
  readonly corpusVersion: string;
  readonly caseStudies: readonly ManifestCaseStudy[];
}

const contracts = require('../../../../chat/contracts/index.cjs') as {
  ContractError: new (code: string, message: string) => Error & { code: string };
  assertCorpusCompatible(value: unknown): unknown;
  assertToolInput(name: string, value: unknown): GetCaseStudyInput;
  assertToolOutput(name: string, value: unknown): GetCaseStudyOutput;
};
const { validateArtifacts } = require('../../../../chat/knowledge/validate.cjs') as {
  validateArtifacts(value: { corpus: unknown; cag: unknown; chunksManifest: unknown }): boolean;
};
const corpus = require('../../../../chat/knowledge/corpus.json') as CorpusData;
const cag = require('../../../../chat/knowledge/cag-context.json') as unknown;
const chunksManifest = require('../../../../chat/knowledge/chunks-manifest.json') as ChunksManifestData;

validateArtifacts({ corpus, cag, chunksManifest });
contracts.assertCorpusCompatible(corpus);

const rolesById = new Map<string, CorpusRole>(corpus.roles.map(role => [role.id, role]));

const CASE_STUDIES_BY_PROJECT = new Map<string, GetCaseStudyOutput>();
for (const entry of chunksManifest.caseStudies) {
  const role = rolesById.get(entry.roleId);
  const mergedQualifications: string[] = [];
  for (const note of entry.qualificationNotes) {
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

  const canonicalOutput: GetCaseStudyOutput = Object.freeze({
    schemaVersion: '1.0.0',
    corpusVersion: chunksManifest.corpusVersion,
    projectId: entry.projectId,
    chunkId: entry.chunkId,
    claimId: entry.claimId,
    title: entry.title,
    period: entry.period,
    text: entry.text,
    decision: entry.decision,
    process: Object.freeze([...entry.process]) as unknown as string[],
    technicalGuidance: entry.technicalGuidance,
    outcome: entry.outcome,
    tags: Object.freeze([...entry.tags]) as unknown as string[],
    qualificationNotes: Object.freeze(mergedQualifications) as unknown as string[],
    sources: Object.freeze(
      entry.sources.map(src => Object.freeze({ id: src.id, url: src.url, revision: src.revision }))
    ) as unknown as CaseStudySource[]
  });

  contracts.assertToolOutput('get_case_study', canonicalOutput);
  CASE_STUDIES_BY_PROJECT.set(entry.projectId, canonicalOutput);
}

export async function getCaseStudy(
  args: GetCaseStudyInput,
  context?: ToolExecutionContext
): Promise<GetCaseStudyOutput> {
  if (context?.signal?.aborted) {
    throw new Error('TOOL_ABORTED');
  }

  const validated = contracts.assertToolInput('get_case_study', args);
  const study = CASE_STUDIES_BY_PROJECT.get(validated.projectId);
  if (!study) {
    throw new contracts.ContractError('INVALID_CONTRACT', 'Requested projectId is not in the approved case studies.');
  }

  const output: GetCaseStudyOutput = {
    schemaVersion: '1.0.0',
    corpusVersion: study.corpusVersion,
    projectId: study.projectId,
    chunkId: study.chunkId,
    claimId: study.claimId,
    title: study.title,
    period: study.period,
    text: study.text,
    decision: study.decision,
    process: [...study.process],
    technicalGuidance: study.technicalGuidance,
    outcome: study.outcome,
    tags: [...study.tags],
    qualificationNotes: [...study.qualificationNotes],
    sources: study.sources.map(src => ({ id: src.id, url: src.url, revision: src.revision }))
  };

  return contracts.assertToolOutput('get_case_study', output);
}

export const get_case_study = getCaseStudy;
