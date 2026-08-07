import { getClient, query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { AuditService } from './AuditService';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';

const audit = new AuditService();

export class CommitService {
  async commitBatch(batchId: string, gymId: string) {
    const client = await getClient();
    try {
      await client.query('BEGIN');



      // 2. Check all members are READY and confident
      const memRes = await client.query('SELECT * FROM extracted_members WHERE "batchId" = $1', [batchId]);
      const members = memRes.rows;
      if (members.length === 0) {
        throw new Error('No members to commit.');
      }

      for (const m of members) {
        if (m.status !== 'READY') {
          throw new Error(`Member ${m.name || m.contact_no} is not READY. Please fix validation errors.`);
        }
        if (Number(m.confidence || 0) < 80) {
          throw new Error(`Member ${m.name || m.contact_no} needs review (low confidence). Please review and edit.`);
        }
      }

      // 3. Process Plans
      const plansRes = await client.query('SELECT * FROM membership_plans WHERE "batchId" = $1', [batchId]);
      const plans = plansRes.rows;
      const planMap = new Map<string, string>(); // stagedPlanId -> prodPlanId

      for (const p of plans) {
        // Reuse existing plan?
        const existingPlan = await client.query('SELECT id FROM prod_membership_plans WHERE "gymId" = $1 AND LOWER(name) = LOWER($2)', [gymId, p.name]);
        if (existingPlan.rows.length > 0) {
          planMap.set(p.id, existingPlan.rows[0].id);
        } else {
          const newPlanId = uuidv4();
          await client.query(`
            INSERT INTO prod_membership_plans (id, "gymId", name, duration, price) 
            VALUES ($1, $2, $3, $4, $5)
          `, [newPlanId, gymId, p.name, p.duration, p.price]);
          planMap.set(p.id, newPlanId);
        }
      }

      // 4. Process Members
      for (const m of members) {
        const prodPlanId = m.membershipPlanId ? planMap.get(m.membershipPlanId) : null;
        
        let shouldOverwrite = true;
        if (m.contact_no) {
          const res = await client.query('SELECT date FROM prod_members WHERE "gymId" = $1 AND contact_no = $2', [gymId, m.contact_no]);
          if (res.rows.length > 0) {
            const existingDateStr = res.rows[0].date;
            if (existingDateStr && m.date) {
               const d1 = Date.parse(m.date);
               const d2 = Date.parse(existingDateStr);
               if (!isNaN(d1) && !isNaN(d2)) {
                   shouldOverwrite = d1 >= d2;
               }
            }
          }
        }
        
        const newMemberId = uuidv4();
        await client.query(`
          INSERT INTO prod_members (id, "gymId", "membershipPlanId", name, contact_no, date, plan_duration, price)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT ("gymId", contact_no) DO UPDATE SET
            name = EXCLUDED.name,
            date = EXCLUDED.date,
            plan_duration = EXCLUDED.plan_duration,
            price = EXCLUDED.price,
            "membershipPlanId" = EXCLUDED."membershipPlanId",
            "updatedAt" = NOW()
          WHERE $9 = true
        `, [newMemberId, gymId, prodPlanId, m.name, m.contact_no, m.date, m.plan_duration, m.price, shouldOverwrite]);
      }

      // 5. Update Batch Status
      await client.query(`UPDATE import_batches SET status = 'committed', "updatedAt" = NOW() WHERE id = $1`, [batchId]);

      // 6. Log Audit Event
      await audit.logEvent(batchId, 'user', 'Batch', batchId, 'Production committed', null, null, client);

      await client.query('COMMIT');
      
      // Files are now permanently kept in batches/{batchId}/ structure

    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}
