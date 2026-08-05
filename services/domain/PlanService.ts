import { PlanRepository } from '../repositories/PlanRepository';
import { query } from '@/lib/db';
import { AuditService } from './AuditService';

const planRepo = new PlanRepository();
const audit = new AuditService();

export class PlanService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async updatePlan(id: string, updates: any) {
    const res = await query('SELECT * FROM membership_plans WHERE id = $1', [id]);
    const existing = res.rows[0];
    await planRepo.update(id, updates);
    if (existing) {
      await audit.logEvent(existing.batchId, 'user', 'Plan', id, 'User edited plan', existing, updates);
    }
  }
}
