import type {
  CompareJobRequirementsInput,
  CompareJobRequirementsOutput,
  JobRequirementMatch,
  ToolExecutionContext
} from '../types.js';

interface CorpusClaim {
  readonly id: string;
  readonly chunkId: string;
  readonly projectId: string;
  readonly title: string;
  readonly period: string;
  readonly text: string;
  readonly sourceIds: readonly string[];
  readonly qualificationNotes: readonly string[];
}

interface CorpusQualification {
  readonly id: string;
  readonly label: string;
  readonly aliases: readonly string[];
  readonly note: string;
}

interface CorpusData {
  readonly schemaVersion: '1.0.0';
  readonly corpusVersion: string;
  readonly claims: readonly CorpusClaim[];
  readonly qualifications: readonly CorpusQualification[];
  readonly boundaries: readonly string[];
}

const contracts = require('../../../../chat/contracts/index.cjs') as {
  assertCorpusCompatible(value: unknown): unknown;
  assertToolInput(name: string, value: unknown): CompareJobRequirementsInput;
  assertToolOutput(name: string, value: unknown): CompareJobRequirementsOutput;
};
const { validateArtifacts } = require('../../../../chat/knowledge/validate.cjs') as {
  validateArtifacts(value: { corpus: unknown; cag: unknown; chunksManifest: unknown }): boolean;
};
const corpus = require('../../../../chat/knowledge/corpus.json') as CorpusData;
const cag = require('../../../../chat/knowledge/cag-context.json') as unknown;
const chunksManifest = require('../../../../chat/knowledge/chunks-manifest.json') as unknown;

validateArtifacts({ corpus, cag, chunksManifest });
contracts.assertCorpusCompatible(corpus);

const claimsById = new Map<string, CorpusClaim>(corpus.claims.map(claim => [claim.id, claim]));
const qualificationsById = new Map<string, CorpusQualification>(
  corpus.qualifications.map(qual => [qual.id, qual])
);

function getClaimQualifications(claimIds: readonly string[], extraNotes: readonly string[] = []): readonly string[] {
  const notes: string[] = [];
  for (const id of claimIds) {
    const claim = claimsById.get(id);
    if (claim) {
      for (const note of claim.qualificationNotes) {
        if (!notes.includes(note) && notes.length < 16) {
          notes.push(note);
        }
      }
    }
  }
  for (const extra of extraNotes) {
    if (extra && !notes.includes(extra) && notes.length < 16) {
      notes.push(extra);
    }
  }
  return Object.freeze(notes);
}

function getQualNote(qualId: string, fallback: string): string {
  return qualificationsById.get(qualId)?.note ?? fallback;
}

interface CanonicalRequirementRule {
  readonly id: string;
  readonly pattern: RegExp;
  readonly requirement: string;
  readonly status: 'supported' | 'partial' | 'unsupported';
  readonly claimIds: readonly string[];
  readonly projectIds: readonly string[];
  readonly qualificationNotes: readonly string[];
  readonly gapLabel?: string;
}

const CANONICAL_REQUIREMENT_RULES: readonly CanonicalRequirementRule[] = Object.freeze([
  {
    id: 'sql_reconciliation',
    pattern: /\b(?:sql|oracle|database|queries|query|financial\s+reconciliation|transaction[\s-]+history|payment\s+team|data\s+reconciliation|reconcil(?:e|iation))\b/i,
    requirement: 'SQL reporting, query remediation, and financial transaction reconciliation',
    status: 'supported',
    claimIds: Object.freeze(['claim-experience-sql']),
    projectIds: Object.freeze(['sql']),
    qualificationNotes: getClaimQualifications(['claim-experience-sql'])
  },
  {
    id: 'claims_takeover_vba',
    pattern: /\b(?:vba|excel|add-in|takeover|claims[\s-]+history|batch\s+preparation|data\s+migration|data\s+loading|xml\s+batch|error\s+reconciliation|receiving[\s-]+system)\b/i,
    requirement: 'Data validation, XML batch preparation, and claims-history loading (Excel VBA)',
    status: 'supported',
    claimIds: Object.freeze(['claim-experience-takeover']),
    projectIds: Object.freeze(['takeover']),
    qualificationNotes: getClaimQualifications(['claim-experience-takeover'])
  },
  {
    id: 'insurance_rules_renewals',
    pattern: /\b(?:renewal|renewals|underwriting|rating\s+rules|eligibility|p&c|property\s+and\s+casualty|policy\s+administration|new[\s-]+business|endorsements|policy\s+rules|exception\s+routing)\b/i,
    requirement: 'P&C insurance rating, underwriting rules, and renewal eligibility automation',
    status: 'supported',
    claimIds: Object.freeze(['claim-experience-renewals', 'claim-experience-newbusiness', 'claim-experience-workflows']),
    projectIds: Object.freeze(['renewals', 'newbusiness', 'workflows']),
    qualificationNotes: getClaimQualifications(
      ['claim-experience-renewals', 'claim-experience-newbusiness', 'claim-experience-workflows'],
      ['Do not add numerical renewal rates from another source. Those rates are absent from this approved reusable dataset.']
    )
  },
  {
    id: 'broker_api_integrations',
    pattern: /\b(?:soap|xml|rest|restful|api|apis|csio|acord|al3|edocs|broker|payload|field\s+mapping|mappings|inquiry|quoting|c#|\.net|dotnet|portal|document\s+upload)\b/i,
    requirement: 'Broker portal, REST/SOAP/XML integration, field mapping, and C#/.NET application delivery',
    status: 'supported',
    claimIds: Object.freeze(['claim-experience-inquiry', 'claim-experience-upload', 'claim-experience-workflows']),
    projectIds: Object.freeze(['inquiry', 'upload', 'workflows']),
    qualificationNotes: getClaimQualifications(['claim-experience-inquiry', 'claim-experience-upload', 'claim-experience-workflows'])
  },
  {
    id: 'functional_analysis_specs',
    pattern: /\b(?:functional\s+analyst|systems\s+analyst|business\s+analyst|requirements|stakeholder|specification|specifications|solution\s+review|discovery|gap\s+analysis|\banalyst\b)\b/i,
    requirement: 'Functional analysis, requirements discovery, data mapping, and developer guidance',
    status: 'supported',
    claimIds: Object.freeze(['claim-experience-claims', 'claim-experience-continuity', 'claim-experience-takeover', 'claim-experience-workflows']),
    projectIds: Object.freeze(['claims', 'continuity', 'takeover', 'workflows']),
    qualificationNotes: getClaimQualifications(['claim-experience-claims', 'claim-experience-workflows'])
  },
  {
    id: 'infrastructure_and_support',
    pattern: /\b(?:infrastructure|network|networking|server|active\s+directory|exchange|esxi|virtualization|hardware|desktop|laptop|technical\s+support|troubleshooting|dell|noc|headquarters|swing[\s-]+migration)\b/i,
    requirement: 'Infrastructure migration, network/server administration, and client hardware diagnosis',
    status: 'supported',
    claimIds: Object.freeze(['claim-experience-headquarters', 'claim-experience-foundations', 'claim-experience-dell']),
    projectIds: Object.freeze(['headquarters', 'foundations', 'dell']),
    qualificationNotes: getClaimQualifications(['claim-experience-dell', 'claim-experience-foundations', 'claim-experience-headquarters'])
  },
  {
    id: 'provider_sync_partial',
    pattern: /\b(?:provider\s+data|provider\s+integration|providerregistry|adjudication|scheduled\s+sync|synchronization|event\s+table|pub\/?sub|publish[\s/-]*subscribe)\b/i,
    requirement: 'Provider data synchronization, scheduled event-table publishing, and REST consumer support',
    status: 'partial',
    claimIds: Object.freeze(['claim-experience-claims', 'claim-experience-provider-sync-review']),
    projectIds: Object.freeze(['claims']),
    qualificationNotes: getClaimQualifications(['claim-experience-claims', 'claim-experience-provider-sync-review']),
    gapLabel: 'Sole backend service implementation for provider synchronization (developers implemented interfaces)'
  },
  {
    id: 'reporting_continuity_partial',
    pattern: /\b(?:reporting\s+continuity|compatibility\s+extract|downstream\s+reporting|interim\s+sql|permanent\s+extract|reporting\s+migration|continuity)\b/i,
    requirement: 'Downstream reporting continuity analysis, approved compatibility design, and operational interim SQL',
    status: 'partial',
    claimIds: Object.freeze(['claim-experience-continuity']),
    projectIds: Object.freeze(['continuity']),
    qualificationNotes: getClaimQualifications(['claim-experience-continuity']),
    gapLabel: 'Permanent reporting compatibility extract go-live and modernization remain unconfirmed/proposed'
  },
  {
    id: 'ai_agentic_capstone_partial',
    pattern: /\b(?:ai|llm|agent|agentic|multi-agent|rag|mcp|model\s+routing|nexus|prompt|evaluation|orchestration)\b/i,
    requirement: 'AI-assisted platform architecture, scoped context, and multi-agent routing (independent capstone)',
    status: 'partial',
    claimIds: Object.freeze(['claim-experience-nexus']),
    projectIds: Object.freeze(['nexus']),
    qualificationNotes: getClaimQualifications(['claim-experience-nexus']),
    gapLabel: 'Employer production delivery of multi-agent AI platforms (NEXUS is an independent capstone under active development)'
  },
  {
    id: 'formal_architect_unsupported',
    pattern: /\b(?:principal\s+architect|solutions\s+architect|enterprise\s+architect|formal\s+architect|staff\s+architect|lead\s+architect|architect\s+title|\barchitect\b)\b/i,
    requirement: 'Formal Architect job title or executive architecture authority',
    status: 'unsupported',
    claimIds: Object.freeze([]),
    projectIds: Object.freeze([]),
    qualificationNotes: Object.freeze([
      'Claims architecture describes work, not a claimed formal Architect title.',
      'Responsibility does not imply a formal Architect job title.',
      'Positioning and responsibilities do not create a formal job title. Keep independent projects separate from employer experience.'
    ]),
    gapLabel: 'Formal Architect job title is not established (historical responsibilities do not create a formal Architect title)'
  },
  {
    id: 'kafka_broker_unsupported',
    pattern: /\b(?:kafka|rabbitmq|kinesis|eventhub|message[\s-]+broker|real[\s-]+time\s+streaming|realtime\s+streaming|event\s+streaming)\b/i,
    requirement: 'Production Kafka or real-time message-broker implementation',
    status: 'unsupported',
    claimIds: Object.freeze([]),
    projectIds: Object.freeze([]),
    qualificationNotes: Object.freeze([
      getQualNote(
        'qual-message-broker',
        'Scheduled table-backed publish/subscribe and REST solution review are supported. Broker-based or real-time implementation is not established.'
      ),
      'Requirements, mappings and support do not imply sole service development or a Kafka implementation.'
    ]),
    gapLabel: 'Production Kafka or real-time message-broker implementation is not established in the approved public evidence'
  },
  {
    id: 'certifications_degrees_unsupported',
    pattern: /\b(?:certified|certification|certifications|togaf|pmp|cissp|bachelor|bachelor's|master's|masters|degree)\b/i,
    requirement: 'Unlisted formal degrees or active vendor/professional certifications (TOGAF, PMP, CISSP, AWS)',
    status: 'unsupported',
    claimIds: Object.freeze([]),
    projectIds: Object.freeze([]),
    qualificationNotes: Object.freeze([
      getQualNote(
        'qual-cert',
        'Corpus v12 records a 2006 Canadore advanced diploma, a combined 2014 McMaster certificate and PSM I in 2019. Do not infer other credentials or current vendor-certification standing.'
      )
    ]),
    gapLabel: 'Active vendor certifications, PMP/TOGAF/CISSP credentials, or university degrees beyond recorded diploma/certificate credentials'
  },
  {
    id: 'named_insurance_platform_unsupported',
    pattern: /\b(?:guidewire|duck\s+creek|sapiens|fineos)\b/i,
    requirement: 'Administration or development on named commercial insurance suites (Guidewire, Duck Creek, Sapiens, FINEOS)',
    status: 'unsupported',
    claimIds: Object.freeze([]),
    projectIds: Object.freeze([]),
    qualificationNotes: Object.freeze([
      getQualNote('qual-platform', 'Experience on this named insurance platform is not established in this dataset.')
    ]),
    gapLabel: 'Experience on named commercial insurance platforms (Guidewire, Duck Creek, Sapiens, FINEOS) is not established'
  },
  {
    id: 'named_cloud_platform_unsupported',
    pattern: /\b(?:aws|amazon\s+web\s+services|azure|gcp|google\s+cloud)\b/i,
    requirement: 'Established employer production delivery or certification on named cloud platforms (AWS, Azure, GCP)',
    status: 'unsupported',
    claimIds: Object.freeze([]),
    projectIds: Object.freeze([]),
    qualificationNotes: Object.freeze([
      getQualNote('qual-cloud', 'Experience or certification on this named platform is not established in this dataset.')
    ]),
    gapLabel: 'Established employer production experience or certification on named cloud platforms (AWS, Azure, GCP)'
  },
  {
    id: 'json_standards_unsupported',
    pattern: /\b(?:json\s+schema|json\s+standards|acord\s+json|csio\s+json|\bjson\b)\b/i,
    requirement: 'Hands-on insurance JSON standards implementation',
    status: 'unsupported',
    claimIds: Object.freeze([]),
    projectIds: Object.freeze([]),
    qualificationNotes: Object.freeze([
      getQualNote(
        'qual-json',
        'Hands-on JSON standards experience is not established in the approved employer evidence. SOAP/XML and REST are supported separately.'
      )
    ]),
    gapLabel: 'Hands-on JSON insurance standards experience (SOAP/XML and REST are supported separately)'
  },
  {
    id: 'people_management_unsupported',
    pattern: /\b(?:people\s+management|direct\s+reports|manage\s+a\s+team|managed\s+a\s+team|hiring|performance\s+reviews|engineering\s+manager|people\s+leader)\b/i,
    requirement: 'Formal people management, hiring, and direct-report performance review remit',
    status: 'unsupported',
    claimIds: Object.freeze([]),
    projectIds: Object.freeze([]),
    qualificationNotes: Object.freeze([
      getQualNote('qual-management', 'Technical guidance is supported; formal people-management scope is not established.')
    ]),
    gapLabel: 'Formal people-management remit and direct-report authority'
  },
  {
    id: 'eligibility_clearance_unsupported',
    pattern: /\b(?:clearance|security\s+clearance|secret\s+clearance|citizenship|work\s+authorization|bilingual|french|relocate|relocation)\b/i,
    requirement: 'Security clearance, bilingual proficiency, or relocation eligibility',
    status: 'unsupported',
    claimIds: Object.freeze([]),
    projectIds: Object.freeze([]),
    qualificationNotes: Object.freeze([
      getQualNote('qual-eligibility', 'Eligibility, language proficiency and location commitments require direct confirmation.')
    ]),
    gapLabel: 'Security clearance, language proficiency, and location commitments require direct confirmation'
  },
  {
    id: 'other_named_tech_unsupported',
    pattern: /\b(?:python|java|kubernetes|k8s|docker|terraform|salesforce|snowflake|databricks|golang|rust|react|angular)\b/i,
    requirement: 'Employer production proficiency in additional named stacks (Python, Java, Kubernetes, Docker, Terraform, Salesforce, Snowflake, Databricks)',
    status: 'unsupported',
    claimIds: Object.freeze([]),
    projectIds: Object.freeze([]),
    qualificationNotes: Object.freeze([
      getQualNote(
        'qual-othertech',
        'Additional technologies require evidence of context and personal depth; a project dependency is not a proficiency claim.'
      )
    ]),
    gapLabel: 'Established employer depth in unlisted tech stacks (Python, Java, Kubernetes, Docker, Terraform, Salesforce, Snowflake, Databricks)'
  }
]);

export async function compareJobRequirements(
  args: CompareJobRequirementsInput,
  context?: ToolExecutionContext
): Promise<CompareJobRequirementsOutput> {
  if (context?.signal?.aborted) {
    throw new Error('TOOL_ABORTED');
  }

  const validated = contracts.assertToolInput('compare_job_requirements', args);
  const normalizedText = validated.jobText.replace(/[’‘]/g, "'");

  const matches: JobRequirementMatch[] = [];
  const gaps: string[] = [];
  const qualificationSummary: string[] = [];

  for (const rule of CANONICAL_REQUIREMENT_RULES) {
    if (matches.length >= 12) {
      break;
    }
    if (rule.pattern.test(normalizedText)) {
      matches.push({
        requirement: rule.requirement,
        status: rule.status,
        claimIds: [...rule.claimIds],
        projectIds: [...rule.projectIds],
        qualificationNotes: [...rule.qualificationNotes]
      });
      if (rule.gapLabel && !gaps.includes(rule.gapLabel) && gaps.length < 12) {
        gaps.push(rule.gapLabel);
      }
      for (const note of rule.qualificationNotes) {
        if (!qualificationSummary.includes(note) && qualificationSummary.length < 16) {
          qualificationSummary.push(note);
        }
      }
    }
  }

  if (matches.length === 0) {
    const fallbackNote =
      'Absence from the approved evidence means not established here; it does not prove a person has never had that experience.';
    const titleBoundary =
      'Positioning and responsibilities do not create a formal job title. Keep independent projects separate from employer experience.';
    matches.push({
      requirement: 'Role-specific requirements not established in the approved public portfolio corpus',
      status: 'unsupported',
      claimIds: [],
      projectIds: [],
      qualificationNotes: [fallbackNote, titleBoundary]
    });
    gaps.push('Specific role requirements were not matched to established public portfolio evidence');
    qualificationSummary.push(fallbackNote, titleBoundary);
  } else {
    const coreBoundary =
      'Positioning and responsibilities do not create a formal job title. Keep independent projects separate from employer experience.';
    if (!qualificationSummary.includes(coreBoundary) && qualificationSummary.length < 16) {
      qualificationSummary.push(coreBoundary);
    }
  }

  const hasUnsupported = matches.some(m => m.status === 'unsupported');
  const hasSupported = matches.some(m => m.status === 'supported');
  const noticeCodes: string[] = ['limited_evidence'];
  if (hasUnsupported || !hasSupported) {
    noticeCodes.push('unsupported_evidence');
  }

  const output: CompareJobRequirementsOutput = {
    schemaVersion: '1.0.0',
    corpusVersion: corpus.corpusVersion,
    matches,
    gaps,
    qualificationSummary,
    noticeCodes
  };

  return contracts.assertToolOutput('compare_job_requirements', output);
}

export const compare_job_requirements = compareJobRequirements;
