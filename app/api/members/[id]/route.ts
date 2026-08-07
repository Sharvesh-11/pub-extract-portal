import { NextResponse } from 'next/server';
import { MemberService } from '@/services/domain/MemberService';
import { query } from '@/lib/db';

const memberService = new MemberService();

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const updated = await memberService.updateMember(params.id, body);
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get('type') === 'prod') {
      await query('DELETE FROM prod_members WHERE id = $1', [params.id]);
      return NextResponse.json({ success: true });
    }
    await memberService.deleteMember(params.id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
