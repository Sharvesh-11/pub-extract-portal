import { NextResponse } from 'next/server';
import { AuditService } from '@/services/domain/AuditService';

const auditService = new AuditService();

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const events = await auditService.getEventsForBatch(params.id);
    return NextResponse.json(events);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
