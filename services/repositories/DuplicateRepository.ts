import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export class DuplicateRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async create(memberId: string, targetMemberId: string, similarity: number, reason: string) {
    const id = uuidv4();
    await query(
      'INSERT INTO duplicate_candidates (id, "memberId", "targetMemberId", similarity, reason) VALUES ($1, $2, $3, $4, $5)',
      [id, memberId, targetMemberId, similarity, reason]
    );
    return id;
  }
}
