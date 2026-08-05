import { NextResponse } from 'next/server';
import { CommitService } from '@/services/domain/CommitService';

const commitService = new CommitService();

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { gymId } = await req.json();
    await commitService.commitBatch(params.id, gymId);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
