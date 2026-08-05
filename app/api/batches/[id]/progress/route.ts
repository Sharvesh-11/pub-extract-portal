import { NextResponse } from 'next/server';
import { QueueService } from '@/services/domain/QueueService';
import { BatchService } from '@/services/domain/BatchService';

const queueService = new QueueService();
const batchService = new BatchService();

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const progress = await queueService.getProgress(params.id);
    const batch = await batchService.getBatch(params.id);
    return NextResponse.json({
      progress,
      status: batch?.status
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
