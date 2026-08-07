import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { ExtractedMember } from '@/types';
import { AuditService } from './AuditService';

const audit = new AuditService();

export class DuplicateService {
  async runDuplicateDetection(batchId: string, gymId: string) {
    // 1. Fetch all members in this batch
    const batchMembersRes = await query('SELECT * FROM extracted_members WHERE "batchId" = $1', [batchId]);
    const batchMembers = batchMembersRes.rows;

    // 2. Fetch all other members for this gym (staged or production, simulated via extracted_members for now)
    const otherMembersRes = await query('SELECT * FROM extracted_members WHERE "gymId" = $1 AND "batchId" != $2', [gymId, batchId]);
    const otherMembers = otherMembersRes.rows;

    // Delete existing unresolved candidates for this batch to re-run
    const inBatchIds = batchMembers.map(m => m.id);
    if (inBatchIds.length > 0) {
      const inVars = inBatchIds.map((_, i) => `$${i+1}`).join(',');
      await query(`DELETE FROM duplicate_candidates WHERE "memberId" IN (${inVars}) AND resolved = FALSE`, inBatchIds);
    }

    // Combine pool to check against (batch members vs other members, and batch members vs themselves)
    for (let i = 0; i < batchMembers.length; i++) {
      const m1 = batchMembers[i];
      if (!m1.name && !m1.contact_no && !m1.email) continue; // Skip empty rows

      // Check against others in the same batch
      for (let j = i + 1; j < batchMembers.length; j++) {
        const m2 = batchMembers[j];
        const match = this.compareMembers(m1, m2);
        if (match) {
          await this.createCandidate(m1.id, m2.id, match.similarity, match.reason);
        }
      }

      // Check against other members in the gym
      for (const m2 of otherMembers) {
        const match = this.compareMembers(m1, m2);
        if (match) {
          await this.createCandidate(m1.id, m2.id, match.similarity, match.reason);
        }
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private compareMembers(m1: any, m2: any): { similarity: number, reason: string } | null {
    // Exact phone
    if (m1.contact_no && m2.contact_no && m1.contact_no === m2.contact_no) {
      return { similarity: 100, reason: 'Exact phone match' };
    }
    // Exact email
    if (m1.email && m2.email && m1.email.toLowerCase() === m2.email.toLowerCase()) {
      return { similarity: 100, reason: 'Exact email match' };
    }
    
    // High similarity name
    const n1 = (m1.name || '').toLowerCase().trim();
    const n2 = (m2.name || '').toLowerCase().trim();
    if (n1 && n2 && n1 === n2) {
      // Name + DOB
      if (m1.dob && m2.dob && m1.dob === m2.dob) {
        return { similarity: 95, reason: 'Name and DOB match' };
      }
      return { similarity: 85, reason: 'Exact name match' };
    }

    // Levenshtein or simple includes for high similarity
    if (n1 && n2 && n1.length > 4 && n2.length > 4) {
      if (n1.includes(n2) || n2.includes(n1)) {
        return { similarity: 80, reason: 'High similarity name' };
      }
    }

    return null;
  }

  private async createCandidate(memberId: string, targetMemberId: string, similarity: number, reason: string) {
    const id = uuidv4();
    await query(
      'INSERT INTO duplicate_candidates (id, "memberId", "targetMemberId", similarity, reason, resolved) VALUES ($1, $2, $3, $4, $5, FALSE)',
      [id, memberId, targetMemberId, similarity, reason]
    );
  }

  async getCandidatesForBatch(batchId: string) {
    // Get all candidates where the source member is in the batch
    const res = await query(`
      SELECT 
        dc.*, 
        row_to_json(m1.*) as source_member,
        row_to_json(m2.*) as target_member
      FROM duplicate_candidates dc
      JOIN extracted_members m1 ON dc."memberId" = m1.id
      JOIN extracted_members m2 ON dc."targetMemberId" = m2.id
      WHERE m1."batchId" = $1 AND dc.resolved = FALSE
    `, [batchId]);
    return res.rows;
  }

  async resolveCandidate(candidateId: string, action: 'keep_existing' | 'keep_new' | 'merge' | 'not_duplicate') {
    const res = await query('SELECT * FROM duplicate_candidates WHERE id = $1', [candidateId]);
    const candidate = res.rows[0];
    if (!candidate) throw new Error('Candidate not found');

    if (action === 'keep_existing') {
      // The new member (memberId) is a duplicate and should be discarded
      await query('DELETE FROM validation_results WHERE "memberId" = $1', [candidate.memberId]);
      await query('DELETE FROM duplicate_candidates WHERE "memberId" = $1 OR "targetMemberId" = $1', [candidate.memberId]);
      await query('DELETE FROM extracted_members WHERE id = $1', [candidate.memberId]);
    } else if (action === 'keep_new') {
      // The existing member (targetMemberId) is discarded
      // Note: If target is a production member in the future, this would archive them.
      // For now we just delete the target if it's staged.
      await query('DELETE FROM validation_results WHERE "memberId" = $1', [candidate.targetMemberId]);
      await query('DELETE FROM duplicate_candidates WHERE "memberId" = $1 OR "targetMemberId" = $1', [candidate.targetMemberId]);
      await query('DELETE FROM extracted_members WHERE id = $1', [candidate.targetMemberId]);
    } else if (action === 'merge') {
      // For merge, we take the new member's non-null fields and apply them to target, then delete new.
      const m1Res = await query('SELECT * FROM extracted_members WHERE id = $1', [candidate.memberId]);
      const m1 = m1Res.rows[0];
      const m2Res = await query('SELECT * FROM extracted_members WHERE id = $1', [candidate.targetMemberId]);
      const m2 = m2Res.rows[0];
      
      if (m1 && m2) {
        const merged = {
          name: m1.name || m2.name,
          contact_no: m1.contact_no || m2.contact_no,
          email: m1.email || m2.email,
          gender: m1.gender || m2.gender,
          dob: m1.dob || m2.dob,
          address: m1.address || m2.address,
          date: m1.date || m2.date,
          plan_duration: m1.plan_duration || m2.plan_duration,
          price: m1.price || m2.price,
          membershipPlanId: m1.membershipPlanId || m2.membershipPlanId
        };
        const keys = Object.keys(merged);
        const setClause = keys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');
        const values = keys.map(k => (merged as any)[k]);
        
        await query(`UPDATE extracted_members SET ${setClause}, "updatedAt" = NOW() WHERE id = $1`, [m2.id, ...values]);
        
        // Delete m1
        await query('DELETE FROM validation_results WHERE "memberId" = $1', [m1.id]);
        await query('DELETE FROM duplicate_candidates WHERE "memberId" = $1 OR "targetMemberId" = $1', [m1.id]);
        await query('DELETE FROM extracted_members WHERE id = $1', [m1.id]);
      }
    } else if (action === 'not_duplicate') {
      // Mark as resolved
      await query('UPDATE duplicate_candidates SET resolved = TRUE, "updatedAt" = NOW() WHERE id = $1', [candidateId]);
    }
    
    const mRes = await query('SELECT "batchId" FROM extracted_members WHERE id = $1', [candidate.memberId]);
    const bId = mRes.rows.length > 0 ? mRes.rows[0].batchId : (await query('SELECT "batchId" FROM extracted_members WHERE id = $1', [candidate.targetMemberId])).rows[0]?.batchId;
    if (bId) {
      await audit.logEvent(bId, 'user', 'Duplicate', candidateId, `Duplicate resolved: ${action}`, null, { action });
    }
  }
}
