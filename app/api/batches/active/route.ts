import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const gymId = searchParams.get('gymId');
  if (!gymId) return NextResponse.json({ error: 'gymId required' }, { status: 400 });
  
  // Find the most recent batch for this gym
  const res = await query('SELECT * FROM import_batches WHERE "gymId" = $1 ORDER BY "createdAt" DESC LIMIT 1', [gymId]);
  
  if (res.rows.length === 0) {
    return NextResponse.json(null);
  }
  return NextResponse.json(res.rows[0]);
}
