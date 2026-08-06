import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { BatchService } from '@/services/domain/BatchService';

const batchService = new BatchService();

export async function GET() {
  const gyms = await batchService.getGyms();
  return NextResponse.json(gyms);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const newGym = await batchService.createGym(body.name);
    return NextResponse.json(newGym);
  } catch (error) {
    console.error('Error creating gym:', error);
    return NextResponse.json({ error: 'Failed to create gym' }, { status: 500 });
  }
}
