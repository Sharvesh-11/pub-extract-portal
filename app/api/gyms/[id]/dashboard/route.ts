import { NextResponse } from 'next/server';
import { DashboardService } from '@/services/domain/DashboardService';

const dashboardService = new DashboardService();

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const dashboard = await dashboardService.getGymDashboard(params.id);
    return NextResponse.json(dashboard);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
