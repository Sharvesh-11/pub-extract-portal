import { NextResponse } from 'next/server';
import { BatchService } from '@/services/domain/BatchService';

const batchService = new BatchService();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { batchId, gymId, members, plans, stats } = body;
    
    await batchService.updateBatchStatus(batchId, 'processing');
    await batchService.persistStagedData(batchId, gymId, members, plans, stats);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
