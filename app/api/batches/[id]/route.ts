import { NextResponse } from 'next/server';
import { BatchService } from '@/services/domain/BatchService';

const batchService = new BatchService();

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const batch = await batchService.getBatch(params.id);
  return NextResponse.json(batch);
}
