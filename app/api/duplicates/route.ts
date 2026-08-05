import { NextResponse } from 'next/server';
import { DuplicateService } from '@/services/domain/DuplicateService';

const duplicateService = new DuplicateService();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get('batchId');
  if (!batchId) return NextResponse.json({ error: 'batchId required' }, { status: 400 });
  
  const candidates = await duplicateService.getCandidatesForBatch(batchId);
  return NextResponse.json(candidates);
}
