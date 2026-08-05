import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export class QueueService {
  async enqueueJob(batchId: string, gymId: string, filePath: string, fileName: string) {
    const id = uuidv4();
    await query(`
      INSERT INTO job_queue (id, "batchId", "gymId", "filePath", "fileName", status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
    `, [id, batchId, gymId, filePath, fileName]);
    return id;
  }

  async dequeueJob() {
    const res = await query(`
      UPDATE job_queue
      SET status = 'processing', "updatedAt" = NOW()
      WHERE id = (
        SELECT id FROM job_queue
        WHERE status = 'pending' OR (status = 'failed' AND attempts < 3)
        ORDER BY "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING *
    `);
    return res.rows[0];
  }

  async markJobCompleted(id: string) {
    await query(`UPDATE job_queue SET status = 'completed', "updatedAt" = NOW() WHERE id = $1`, [id]);
  }

  async markJobFailed(id: string, error: string) {
    await query(`
      UPDATE job_queue 
      SET status = 'failed', error = $2, attempts = attempts + 1, "updatedAt" = NOW() 
      WHERE id = $1
    `, [id, error]);
  }

  async getProgress(batchId: string) {
    const res = await query(`
      SELECT status, COUNT(*) as count 
      FROM job_queue 
      WHERE "batchId" = $1 
      GROUP BY status
    `, [batchId]);
    
    const progress = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total: 0
    };

    for (const row of res.rows) {
      const count = Number(row.count);
      progress[row.status as keyof typeof progress] = count;
      progress.total += count;
    }
    
    return progress;
  }
}
