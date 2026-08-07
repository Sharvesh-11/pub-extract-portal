import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const gymId = params.id;
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');

    if (!gymId) {
      return NextResponse.json({ error: "gymId is required" }, { status: 400 });
    }

    if (!q || q.trim().length === 0) {
      return NextResponse.json({ members: [] });
    }

    const searchTerm = `%${q.trim()}%`;
    
    // Join with prod_membership_plans to get the plan name as well
    const res = await query(`
      SELECT 
        m.id, m.name, m.contact_no, m.date, m.plan_duration, m.price,
        p.name as plan_name
      FROM prod_members m
      LEFT JOIN prod_membership_plans p ON m."membershipPlanId" = p.id
      WHERE m."gymId" = $1 AND (m.name ILIKE $2 OR m.contact_no ILIKE $2)
      ORDER BY m.name ASC
      LIMIT 20
    `, [gymId, searchTerm]);

    return NextResponse.json({ members: res.rows });
  } catch (error: any) {
    logger.error("Member Search Error", { error: error.message });
    return NextResponse.json({ error: "Failed to search members" }, { status: 500 });
  }
}
