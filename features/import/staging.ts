import { ExtractedMember, MembershipPlan } from '@/types';

export function createStagedMembers(
  rawRecords: any[],
  batch: { id: string },
  gym: { id: string }
): { members: ExtractedMember[], plans: MembershipPlan[] } {
  const members: ExtractedMember[] = [];
  const plans: MembershipPlan[] = [];

  for (const record of rawRecords) {
    const raw = record.rawJson;
    
    // Auto-create plan if enough info exists
    let planId = null;
    const pDuration = (raw.plan_duration || '').toString().trim();
    const pPrice = (raw.price || '').toString().trim();

    if (pDuration || pPrice) {
      let existingPlan = plans.find(p => p.duration === pDuration && p.price === pPrice);
      if (existingPlan) {
        planId = existingPlan.id;
      } else {
        planId = Math.random().toString(36).substring(7);
        plans.push({
          id: planId,
          gymId: gym.id,
          name: pDuration ? `${pDuration} Plan` : 'Custom Plan',
          duration: pDuration,
          price: pPrice,
          status: 'NEW_PLAN'
        });
      }
    }

    members.push({
      id: Math.random().toString(36).substring(7),
      gymId: gym.id,
      batchId: batch.id,
      sourceFileId: record.sourceImageId,
      status: 'RAW',
      confidence: raw.confidence ?? 100,
      rawExtraction: raw,
      normalizedData: {},
      membershipPlanId: planId,
      validationResults: [],
      duplicateCandidate: null,
      createdAt: new Date().toISOString()
    });
  }

  return { members, plans };
}
