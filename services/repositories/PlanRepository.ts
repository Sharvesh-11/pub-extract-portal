import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export class PlanRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async create(gymId: string, batchId: string, data: any) {
    const id = uuidv4();
    await query(
      'INSERT INTO membership_plans (id, "gymId", "batchId", name, duration, price, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, gymId, batchId, data.name, data.duration, data.price, data.status]
    );
    return id;
  }

  async findByBatchId(batchId: string) {
    const res = await query('SELECT * FROM membership_plans WHERE "batchId" = $1', [batchId]);
    return res.rows;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async update(id: string, data: any) {
    const keys = Object.keys(data);
    if (keys.length === 0) return;
    
    const setClause = keys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');
    const values = keys.map(k => data[k]);
    
    await query(`UPDATE membership_plans SET ${setClause}, "updatedAt" = NOW() WHERE id = $1`, [id, ...values]);
  }
}

