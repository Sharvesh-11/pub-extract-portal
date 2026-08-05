import { NextResponse } from 'next/server';
import { PlanService } from '@/services/domain/PlanService';

const planService = new PlanService();

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    await planService.updatePlan(params.id, body);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
