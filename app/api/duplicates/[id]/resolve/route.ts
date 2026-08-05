import { NextResponse } from 'next/server';
import { DuplicateService } from '@/services/domain/DuplicateService';

const duplicateService = new DuplicateService();

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { action } = await req.json();
    if (!['keep_existing', 'keep_new', 'merge', 'not_duplicate'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    await duplicateService.resolveCandidate(params.id, action as any);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
