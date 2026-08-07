import fs from 'fs';
import path from 'path';
import { QueueService } from '@/services/domain/QueueService';
import { BatchService } from '@/services/domain/BatchService';
import { createStagedMembers } from '@/features/import/staging';
import { processMembers } from '@/services/business/pipeline';
import { extractData } from '@/services/ai/extractor';
import { parseSpreadsheet } from '@/services/business/spreadsheet-parser';
import { query, closePool } from '@/lib/db';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';

const queueService = new QueueService();
const batchService = new BatchService();



let isShuttingDown = false;

async function runWorker() {
  logger.info("Worker started. Running stale job recovery...");
  
  try {
    const res = await query(`
      UPDATE job_queue 
      SET status = 'pending', attempts = attempts + 1, "updatedAt" = NOW()
      WHERE status = 'processing' 
      AND "updatedAt" < NOW() - INTERVAL '5 minutes'
    `);
    if (res.rowCount && res.rowCount > 0) {
      logger.info(`Recovered ${res.rowCount} stale jobs stuck in processing state.`);
    }
  } catch (e: any) {
    logger.error("Failed to recover stale jobs", { error: e.message });
  }

  logger.info("Worker listening for jobs...");
  while (!isShuttingDown) {
      let job: any;
      try {
        job = await queueService.dequeueJob();
      } catch (e: any) {
        logger.error("Worker error dequeueing job", { error: e.message });
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      
      if (!job) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      try {

      logger.info(`Processing job ${job.id}`, { fileName: job.fileName, batchId: job.batchId });

      const gymId = job.gymId;
      const batchId = job.batchId;
      const mimeType = job.mimeType || 'image/jpeg';

      let extractedMembersList: any[] = [];
      
      if (mimeType === 'text/plain') {
        logger.info(`Sending raw text to AI for extraction`, { jobId: job.id });
        const extractionResult = await extractData(
          { text: job.sourceText, mimeType: 'text/plain' },
          'Gym Payment Receipt'
        );
        extractedMembersList = extractionResult.members;
      } else {
        // Read file via storage abstraction
        const buffer = await storage.getFileBuffer(job.filePath);
        
        if (mimeType.includes('spreadsheet') || mimeType.includes('csv')) {
          logger.info(`Parsing spreadsheet natively`, { jobId: job.id });
          extractedMembersList = parseSpreadsheet(buffer);
        } else {
          logger.info(`Sending to AI for extraction`, { jobId: job.id, mimeType });
          const extractionResult = await extractData(
            { base64: buffer.toString('base64'), mimeType },
            'Gym Payment Receipt'
          );
          extractedMembersList = extractionResult.members;
        }
      }

      if (extractedMembersList.length === 0) {
        await queueService.markJobCompleted(job.id, true);
        logger.info(`Completed job ${job.id} (no data found)`);
        
        const prog = await queueService.getProgress(batchId);
        if (prog.pending === 0 && prog.processing === 0) {
           const bRes = await query('SELECT status FROM import_batches WHERE id = $1', [batchId]);
           if (bRes.rows.length > 0 && bRes.rows[0].status !== 'completed' && bRes.rows[0].status !== 'committed') {
             await batchService.updateBatchStatus(batchId, 'completed');
             logger.info(`Batch ${batchId} marked as completed`);
           }
        }
      } else {
        const newImageRecords = extractedMembersList.map(r => ({
          id: Math.random().toString(36).substring(7),
          sourceImageId: job.id,
          rawJson: r,
        }));

        // Find gym
        const gRes = await query('SELECT * FROM gyms WHERE id = $1', [gymId]);
        const gym = gRes.rows[0];

        // Find batch
        const bRes = await query('SELECT * FROM import_batches WHERE id = $1', [batchId]);
        const batch = bRes.rows[0];

        // Stage
        const { members, plans } = createStagedMembers(newImageRecords, batch, gym);
        
        // Process
        const { members: processed, stats } = processMembers(members);

        // Persist Job Data
        await batchService.persistJobData(batchId, gymId, processed, plans, stats);

        await queueService.markJobCompleted(job.id);
        logger.info(`Completed job ${job.id}`);
        
        // Check if batch is entirely complete
        const prog = await queueService.getProgress(batchId);
        if (prog.pending === 0 && prog.processing === 0) {
           if (batch.status !== 'completed' && batch.status !== 'committed') {
             await batchService.updateBatchStatus(batchId, 'completed');
             logger.info(`Batch ${batchId} marked as completed`);
           }
        }
      }

      } catch (e: any) {
        logger.error("Worker error processing job", { error: e.message, stack: e.stack, jobId: job.id });
        await queueService.markJobFailed(job.id, e.message);
        
        // Still check if batch should be marked completed if this was the last job
        const prog = await queueService.getProgress(job.batchId);
        if (prog.pending === 0 && prog.processing === 0) {
           const bRes = await query('SELECT status FROM import_batches WHERE id = $1', [job.batchId]);
           if (bRes.rows.length > 0) {
             const batch = bRes.rows[0];
             if (batch.status !== 'completed' && batch.status !== 'committed') {
               await batchService.updateBatchStatus(job.batchId, 'completed');
             }
           }
        }
      }
  }
  
  logger.info("Worker shutdown complete.");
  await closePool();
  process.exit(0);
}

// Graceful Shutdown
process.on('SIGINT', () => {
  logger.info("Received SIGINT. Shutting down gracefully...");
  isShuttingDown = true;
});

process.on('SIGTERM', () => {
  logger.info("Received SIGTERM. Shutting down gracefully...");
  isShuttingDown = true;
});

process.on('uncaughtException', (err) => {
  logger.error("Uncaught Exception", { error: err.message, stack: err.stack });
});

runWorker();
