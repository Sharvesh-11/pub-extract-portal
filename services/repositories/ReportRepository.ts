import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { PipelineStats } from '@/services/business/pipeline';

export class ReportRepository {
  async create(batchId: string, stats: PipelineStats) {
    const id = uuidv4();
    await query(
      `INSERT INTO processing_reports (id, "batchId", "membersFound", "plansCreated", "mergedMembers", "validationErrors", "processingTime", "overallConfidence")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, batchId, stats.extractedCount, 0, stats.mergedCount, stats.errorCount, 0, 0] // some fields will be updated by services
    );
    return id;
  }

  async findByBatchId(batchId: string) {
    const res = await query('SELECT * FROM processing_reports WHERE "batchId" = $1', [batchId]);
    return res.rows[0];
  }
}
