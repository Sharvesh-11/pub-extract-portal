import { NextResponse } from 'next/server';
import { MemberService } from '@/services/domain/MemberService';
import { MemberRepository } from '@/services/repositories/MemberRepository';

const memberService = new MemberService();
const memberRepo = new MemberRepository();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = await memberRepo.create(body.gymId, body.batchId, body.membershipPlanId || null, body, 'FLAGGED', 100);
    // Run validation initially
    await memberService.updateMember(id, body);
    return NextResponse.json({ id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
