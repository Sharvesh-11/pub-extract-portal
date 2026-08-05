import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export class BatchRepository {
  async create(gymId: string, batchName: string) {
    const id = uuidv4();
    await query(
      'INSERT INTO import_batches (id, "gymId", "batchName", status) VALUES ($1, $2, $3, $4)',
      [id, gymId, batchName, 'waiting']
    );
    return id;
  }

  async findById(id: string) {
    const res = await query('SELECT * FROM import_batches WHERE id = $1', [id]);
    return res.rows[0];
  }

  async updateStatus(id: string, status: string) {
    await query('UPDATE import_batches SET status = $1, "updatedAt" = NOW() WHERE id = $2', [status, id]);
  }
  
  async updateProgress(id: string, progress: number) {
    await query('UPDATE import_batches SET progress = $1, "updatedAt" = NOW() WHERE id = $2', [progress, id]);
  }
}
