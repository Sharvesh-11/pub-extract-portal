import { NextResponse } from 'next/server';
import { PlanRepository } from '@/services/repositories/PlanRepository';

const planRepo = new PlanRepository();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = await planRepo.create(body.gymId, body.batchId, {
      name: body.name || 'New Plan',
      duration: body.duration || '',
      price: body.price || '',
      status: 'ready'
    });
    return NextResponse.json({ id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
