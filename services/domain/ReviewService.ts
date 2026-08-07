import { query } from '@/lib/db';
import { MemberRepository } from '../repositories/MemberRepository';
import { PlanRepository } from '../repositories/PlanRepository';
import { ValidationRepository } from '../repositories/ValidationRepository';
import { ReportRepository } from '../repositories/ReportRepository';

const memberRepo = new MemberRepository();
const planRepo = new PlanRepository();
const valRepo = new ValidationRepository();
const reportRepo = new ReportRepository();

export class ReviewService {
  async getReviewWorkspace(batchId: string) {
    const members = await memberRepo.findByBatchId(batchId);
    const plans = await planRepo.findByBatchId(batchId);
    const report = await reportRepo.findByBatchId(batchId);
    
    // Attach validation results to members
    const memberIds = members.map(m => m.id);
    const validations = await valRepo.findByMemberIds(memberIds);
    
    let prodMap = new Map();
    if (members.length > 0) {
      const gymId = members[0].gymId;
      const prodRes = await query('SELECT contact_no, date, "updatedAt" FROM prod_members WHERE "gymId" = $1', [gymId]);
      for (const pm of prodRes.rows) {
        if (pm.contact_no) prodMap.set(pm.contact_no, pm);
      }
    }

    const membersWithValidations = members.map(m => {
      return {
        ...m,
        existingProdMember: m.contact_no && prodMap.has(m.contact_no) ? { date: prodMap.get(m.contact_no).date, updatedAt: prodMap.get(m.contact_no).updatedAt } : null,
        validationResults: validations.filter(v => v.memberId === m.id)
      };
    });

    return {
      members: membersWithValidations,
      plans,
      report
    };
  }
}
