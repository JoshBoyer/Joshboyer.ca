import type { ToolRegistry } from '../types.js';
import { compare_job_requirements, compareJobRequirements } from './compare-job-requirements.js';
import { get_case_study, getCaseStudy } from './get-case-study.js';
import { search_public_evidence, searchPublicEvidence } from './search-public-evidence.js';

export function createToolRegistry(): ToolRegistry {
  return Object.freeze({
    search_public_evidence,
    get_case_study,
    compare_job_requirements
  });
}

export const defaultToolRegistry: ToolRegistry = createToolRegistry();
export const tools: ToolRegistry = defaultToolRegistry;

export {
  compare_job_requirements,
  compareJobRequirements,
  get_case_study,
  getCaseStudy,
  search_public_evidence,
  searchPublicEvidence
};
