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

      // 1. Check for duplicates
      const dupRes = await client.query(`
        SELECT COUNT(*) FROM duplicate_candidates 
        WHERE "memberId" IN (SELECT id FROM extracted_members WHERE "batchId" = $1)
        AND resolved = FALSE
      `, [batchId]);
      if (Number(dupRes.rows[0].count) > 0) {
        throw new Error('Cannot commit with unresolved duplicates. Please resolve them first.');
      }

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
        
        // Try to find existing member by exact phone or email
        let existingMemberId = null;
        if (m.contact_no) {
          const res = await client.query('SELECT id FROM prod_members WHERE "gymId" = $1 AND phone = $2', [gymId, m.contact_no]);
          if (res.rows.length > 0) existingMemberId = res.rows[0].id;
        }
        if (!existingMemberId && m.email) {
          const res = await client.query('SELECT id FROM prod_members WHERE "gymId" = $1 AND LOWER(email) = LOWER($2)', [gymId, m.email]);
          if (res.rows.length > 0) existingMemberId = res.rows[0].id;
        }

        if (existingMemberId) {
          // Update existing
          const updates = {
            fullName: m.name,
            phone: m.contact_no,
            email: m.email,
            gender: m.gender,
            dob: m.dob,
            address: m.address,
            joinDate: m.date,
            membershipPlanId: prodPlanId,
            batchId: batchId,
            sourceFileId: m.sourceFileId
          };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const keys = Object.keys(updates).filter(k => (updates as any)[k] !== null && (updates as any)[k] !== undefined && (updates as any)[k] !== '');
          if (keys.length > 0) {
            const setClause = keys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const values = keys.map(k => (updates as any)[k]);
            await client.query(`UPDATE prod_members SET ${setClause}, "updatedAt" = NOW() WHERE id = $1`, [existingMemberId, ...values]);
          }
        } else {
          // Insert new
          const newMemberId = uuidv4();
          await client.query(`
            INSERT INTO prod_members (id, "gymId", "batchId", "sourceFileId", "membershipPlanId", "fullName", phone, email, gender, dob, address, "joinDate")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          `, [newMemberId, gymId, batchId, m.sourceFileId, prodPlanId, m.name, m.contact_no, m.email, m.gender, m.dob, m.address, m.date]);
        }
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
