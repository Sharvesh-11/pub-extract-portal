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
    
    const membersWithValidations = members.map(m => {
      return {
        ...m,
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
