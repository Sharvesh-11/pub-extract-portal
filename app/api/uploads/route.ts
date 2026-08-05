import { NextResponse } from 'next/server';
import { QueueService } from '@/services/domain/QueueService';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { rateLimit } from '@/lib/rate-limit';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const queueService = new QueueService();

export async function POST(req: Request) {
  // Apply rate limiting: 100 uploads per minute per IP
  const rateLimitResponse = rateLimit(req, 100, 60000);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const formData = await req.formData();
    const batchId = formData.get('batchId') as string;
    const gymId = formData.get('gymId') as string;
    const file = formData.get('image') as File;

    if (!batchId || !gymId || !file) {
      logger.warn('Upload missing required fields', { batchId, gymId, fileName: file?.name });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name);
    const fileName = `${uuidv4()}${ext}`;
    
    const filePath = await storage.saveFile(fileName, buffer);
    await queueService.enqueueJob(batchId, gymId, filePath, file.name);

    logger.info('File queued for extraction', { batchId, fileName: file.name, jobId: filePath });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    logger.error('Upload failed', { error: e.message });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
