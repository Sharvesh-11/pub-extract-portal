import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { ValidationResult } from '@/types';

export class ValidationRepository {
  async createBulk(memberId: string, results: ValidationResult[]) {
    for (const r of results) {
      await query(
        'INSERT INTO validation_results (id, "memberId", rule, message, severity) VALUES ($1, $2, $3, $4, $5)',
        [uuidv4(), memberId, r.field, r.message, r.severity]
      );
    }
  }

  async findByMemberIds(memberIds: string[]) {
    if (memberIds.length === 0) return [];
    // Using simple IN clause for small batch
    const inVars = memberIds.map((_, i) => `$${i+1}`).join(',');
    const res = await query(`SELECT * FROM validation_results WHERE "memberId" IN (${inVars})`, memberIds);
    return res.rows;
  }

  async deleteByMemberId(memberId: string) {
    await query('DELETE FROM validation_results WHERE "memberId" = $1', [memberId]);
  }
}

