import { NextResponse } from 'next/server';
import { ReviewService } from '@/services/domain/ReviewService';

const reviewService = new ReviewService();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get('batchId');
  if (!batchId) return NextResponse.json({ error: 'batchId required' }, { status: 400 });
  
  const workspace = await reviewService.getReviewWorkspace(batchId);
  return NextResponse.json(workspace);
}
