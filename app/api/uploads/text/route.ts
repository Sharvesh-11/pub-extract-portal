import { NextResponse } from 'next/server';
import { QueueService } from '@/services/domain/QueueService';
import { logger } from '@/lib/logger';
import { rateLimit } from '@/lib/rate-limit';

const queueService = new QueueService();

export async function POST(req: Request) {
  // Apply rate limiting: 100 uploads per minute per IP
  const rateLimitResponse = rateLimit(req, 100, 60000);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { batchId, gymId, text } = await req.json();

    if (!batchId || !gymId || !text) {
      logger.warn('Text upload missing required fields', { batchId, gymId });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use the sourceText parameter for the raw text and use mimeType 'text/plain'
    const fileName = `Text Upload - ${new Date().toISOString()}`;
    await queueService.enqueueJob(batchId, gymId, null, fileName, 'text/plain', text);

    logger.info('Text queued for extraction', { batchId, length: text.length });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    logger.error('Text upload failed', { error: e.message });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
