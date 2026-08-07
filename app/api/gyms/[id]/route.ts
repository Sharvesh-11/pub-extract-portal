import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const gymId = params.id;
    if (!gymId) {
      return NextResponse.json({ error: "gymId is required" }, { status: 400 });
    }

    await query('DELETE FROM gyms WHERE id = $1', [gymId]);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("Delete Gym Error", { error: error.message });
    return NextResponse.json({ error: "Failed to delete gym" }, { status: 500 });
  }
}
