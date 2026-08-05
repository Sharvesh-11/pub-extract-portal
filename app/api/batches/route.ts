import { NextResponse } from 'next/server';
import { BatchService } from '@/services/domain/BatchService';

const batchService = new BatchService();

export async function POST(req: Request) {
  const body = await req.json();
  const id = await batchService.createBatch(body.gymId, body.batchName);
  return NextResponse.json({ id });
}
