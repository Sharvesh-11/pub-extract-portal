import { query, getClient } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export class MemberRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async create(gymId: string, batchId: string, planId: string | null, data: any, status: string, confidence: number) {
    const id = uuidv4();
    await query(
      `INSERT INTO extracted_members (id, "gymId", "batchId", "membershipPlanId", "fullName", phone, email, gender, dob, address, "joinDate", duration, price, confidence, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        id, gymId, batchId, planId, 
        data.name || null, data.phoneNumber || null, data.email || null, data.gender || null, 
        data.dateOfBirth || null, data.address || null, data.joinDate || null, 
        data.duration || null, data.price || null, confidence, status
      ]
    );
    return id;
  }

  async findByBatchId(batchId: string) {
    const res = await query('SELECT * FROM extracted_members WHERE "batchId" = $1 ORDER BY "createdAt" ASC', [batchId]);
    return res.rows;
  }

  async findById(id: string) {
    const res = await query('SELECT * FROM extracted_members WHERE id = $1', [id]);
    return res.rows[0];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async update(id: string, data: any) {
    // Dynamically update fields
    const keys = Object.keys(data);
    if (keys.length === 0) return;
    
    const setClause = keys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');
    const values = keys.map(k => data[k]);
    
    await query(`UPDATE extracted_members SET ${setClause}, "updatedAt" = NOW() WHERE id = $1`, [id, ...values]);
  }

  async delete(id: string) {
    await query('DELETE FROM validation_results WHERE "memberId" = $1', [id]);
    await query('DELETE FROM duplicate_candidates WHERE "memberId" = $1 OR "targetMemberId" = $1', [id]);
    await query('DELETE FROM extracted_members WHERE id = $1', [id]);
  }
}

