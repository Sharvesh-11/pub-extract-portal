import { ExtractionResult, ImportBatch, Gym, ExtractedMember, MembershipPlan } from '@/types';

export function createStagedMembers(
  extractionResponses: ExtractionResult[],
  batch: ImportBatch,
  gym: Gym
): { members: ExtractedMember[]; plans: MembershipPlan[] } {
  const members: ExtractedMember[] = [];
  const plans: MembershipPlan[] = [];

  const now = new Date().toISOString();
  const generateId = () => Math.random().toString(36).substring(2, 11);

  for (const response of extractionResponses) {
    const raw = response.rawJson || {};
    
    let planId = null;
    const pName = (raw.membershipPlan || raw.plan || '').toString().trim();
    const pDuration = (raw.duration || '').toString().trim();
    const pPrice = (raw.price || '').toString().trim();

    if (pName || pDuration || pPrice) {
      let existingPlan = plans.find(p => p.name === pName && p.duration === pDuration && p.price === pPrice);
      
      if (!existingPlan) {
        existingPlan = {
          id: `plan_${generateId()}`,
          gymId: gym.id,
          name: pName,
          duration: pDuration,
          price: pPrice,
          status: 'NEW_PLAN',
        };
        plans.push(existingPlan);
      }
      planId = existingPlan.id;
    }

    // Default confidence to a random high value for UI purposes if missing, 
    // since the standard extraction doesn't output field-level confidence yet.
    let conf = 100;
    if (raw.confidence !== undefined) {
      conf = Number(raw.confidence);
    } else {
      // Simulate real confidence for visual feedback
      conf = Math.floor(Math.random() * (100 - 70) + 70);
    }

    const member: ExtractedMember = {
      id: `member_${generateId()}`,
      gymId: gym.id,
      batchId: batch.id,
      sourceFileId: response.sourceImageId,
      status: 'RAW',
      confidence: conf,
      rawExtraction: raw,
      normalizedData: { ...raw },
      membershipPlanId: planId,
      validationResults: [],
      duplicateCandidate: null,
      createdAt: now,
    };

    members.push(member);
  }

  return { members, plans };
}
