import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { BatchService } from '@/services/domain/BatchService';

const batchService = new BatchService();

export async function GET() {
  const gyms = await batchService.getGyms();
  return NextResponse.json(gyms);
}
