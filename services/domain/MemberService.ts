import { MemberRepository } from '../repositories/MemberRepository';
import { ValidationRepository } from '../repositories/ValidationRepository';
import { normalizeMember } from '../business/normalize';
import { validateMember } from '../business/validate';
import { AuditService } from './AuditService';

const memberRepo = new MemberRepository();
const valRepo = new ValidationRepository();
const audit = new AuditService();

export class MemberService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async updateMember(id: string, updates: any) {
    const existing = await memberRepo.findById(id);
    if (!existing) throw new Error('Member not found');
    
    // Convert DB model to Business logic model
    const rawData = {
      name: updates.name !== undefined ? updates.name : existing.name,
      contact_no: updates.contact_no !== undefined ? updates.contact_no : existing.contact_no,
      email: updates.email !== undefined ? updates.email : existing.email,
      plan_duration: updates.plan_duration !== undefined ? updates.plan_duration : existing.plan_duration,
      date: updates.date !== undefined ? updates.date : existing.date,
      price: updates.price !== undefined ? updates.price : existing.price,
      membershipPlanId: updates.membershipPlanId !== undefined ? updates.membershipPlanId : existing.membershipPlanId,
      // bump confidence to 100 on edit to clear "Needs Review"
      confidence: 100
    };

    const normalized = normalizeMember(rawData);
    const results = validateMember(normalized);
    const hasErrors = results.some(r => r.severity === 'error');
    const newStatus = hasErrors ? 'FLAGGED' : 'READY';

    // Map back to DB model
    const dbUpdates = {
      name: normalized.name || null,
      contact_no: normalized.contact_no || null,
      email: normalized.email || null,
      plan_duration: normalized.plan_duration || null,
      date: normalized.date || null,
      price: normalized.price || null,
      membershipPlanId: normalized.membershipPlanId,
      confidence: 100,
      status: newStatus
    };

    await memberRepo.update(id, dbUpdates);
    
    // Replace validation results
    await valRepo.deleteByMemberId(id);
    if (results.length > 0) {
      await valRepo.createBulk(id, results);
      if (hasErrors) {
         await audit.logEvent(existing.batchId, 'system', 'Member', id, 'Validation failed', null, { errors: results.filter(r => r.severity === 'error') });
      }
    }

    await audit.logEvent(existing.batchId, 'user', 'Member', id, 'User edited member', existing, dbUpdates);
    
    return { ...existing, ...dbUpdates };
  }

  async deleteMember(id: string) {
    const existing = await memberRepo.findById(id);
    if (existing) {
       await audit.logEvent(existing.batchId, 'user', 'Member', id, 'Member deleted', existing, null);
    }
    await memberRepo.delete(id);
  }
}
