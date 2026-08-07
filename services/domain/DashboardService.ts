import { query } from '@/lib/db';

export class DashboardService {
  async getGymDashboard(gymId: string) {
    const batchesRes = await query(`
      SELECT b.*, 
             r."membersFound", r."plansCreated", r."mergedMembers", r."validationErrors", r."overallConfidence",
             (
               SELECT COUNT(*) FROM job_queue j 
               WHERE j."batchId" = b.id 
               AND (
                 (j.status = 'processing' AND j."updatedAt" < NOW() - INTERVAL '2 minutes') 
                 OR 
                 (j.status = 'failed' AND j.attempts >= 3 AND j."updatedAt" < NOW() - INTERVAL '2 minutes')
               )
             ) as stale_jobs
      FROM import_batches b
      LEFT JOIN processing_reports r ON b.id = r."batchId"
      WHERE b."gymId" = $1
      ORDER BY b."createdAt" DESC
    `, [gymId]);

    const batches = batchesRes.rows;
    
    // Calculate aggregate statistics
    let membersImported = 0;
    let plansCreated = 0;
    let duplicates = 0;
    let validationErrors = 0;
    let totalConfidence = 0;
    let countWithConfidence = 0;

    for (const b of batches) {
      membersImported += Number(b.membersFound || 0);
      plansCreated += Number(b.plansCreated || 0);
      duplicates += Number(b.mergedMembers || 0);
      validationErrors += Number(b.validationErrors || 0);
      
      const conf = Number(b.overallConfidence || 0);
      if (conf > 0) {
        totalConfidence += conf;
        countWithConfidence++;
      }
    }

    const avgConfidence = countWithConfidence > 0 ? (totalConfidence / countWithConfidence).toFixed(1) : 0;

    return {
      batches,
      stats: {
        membersImported,
        plansCreated,
        duplicates,
        validationErrors,
        avgConfidence
      }
    };
  }
}
