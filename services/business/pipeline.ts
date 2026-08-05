import { ExtractedMember } from '@/types';
import { normalizeMember } from './normalize';
import { validateMember } from './validate';
import { resolveMembers } from './member-resolver';

export interface PipelineStats {
  extractedCount: number;
  readyCount: number;
  flaggedCount: number;
  mergedCount: number;
  errorCount: number;
}

export function processMembers(rawStagedMembers: ExtractedMember[]): { members: ExtractedMember[], stats: PipelineStats } {
  const extractedCount = rawStagedMembers.length;
  
  // 1. Normalize and Validate
  rawStagedMembers.forEach(m => {
    m.normalizedData = normalizeMember(m.rawExtraction);
    m.validationResults = validateMember(m.normalizedData);
    
    const hasErrors = m.validationResults.some(r => r.severity === 'error');
    m.status = hasErrors ? 'FLAGGED' : 'READY';
  });

  // 2. Resolve duplicates
  const { members, mergedCount } = resolveMembers(rawStagedMembers);

  let readyCount = 0;
  let flaggedCount = 0;
  let errorCount = 0;
  
  members.forEach(m => {
    if (m.status === 'READY') readyCount++;
    if (m.status === 'FLAGGED') {
      flaggedCount++;
      errorCount += m.validationResults.filter(r => r.severity === 'error').length;
    }
  });

  return {
    members,
    stats: {
      extractedCount,
      readyCount,
      flaggedCount,
      mergedCount,
      errorCount
    }
  };
}
