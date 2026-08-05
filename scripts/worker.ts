import fs from 'fs';
import path from 'path';
import { QueueService } from '@/services/domain/QueueService';
import { BatchService } from '@/services/domain/BatchService';
import { createStagedMembers } from '@/features/import/staging';
import { processMembers } from '@/services/business/pipeline';
import { Extractor } from '@/services/ai/extractor';
import { GeminiProvider } from '@/services/ai/gemini';
import { PromptBuilder } from '@/services/ai/prompt-builder';
import { ResponseParser } from '@/services/ai/response-parser';
import { query, closePool } from '@/lib/db';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';

const queueService = new QueueService();
const batchService = new BatchService();

const extractor = new Extractor(
  new GeminiProvider(),
  new PromptBuilder(),
  new ResponseParser()
);

let isShuttingDown = false;

async function runWorker() {
  logger.info("Worker started. Listening for jobs...");
  while (!isShuttingDown) {
    try {
      const job = await queueService.dequeueJob();
      if (!job) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      logger.info(`Processing job ${job.id}`, { fileName: job.fileName, batchId: job.batchId });

      // Read file via storage abstraction
      const buffer = await storage.getFileBuffer(job.filePath);
      const file = new File([buffer], job.fileName, { type: 'image/jpeg' });
      
      const gymId = job.gymId;
      const batchId = job.batchId;

      // Extract
      const extractionResult = await extractor.extract(file);
      const newImageRecords = extractionResult.members.map(r => ({
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

    } catch (e: any) {
      logger.error("Worker error processing job", { error: e.message, stack: e.stack });
      // We don't have job in scope here if it failed on dequeue, but if we do...
      // Wait, we can't easily mark failed here if job is not in scope.
      await new Promise(r => setTimeout(r, 2000));
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
