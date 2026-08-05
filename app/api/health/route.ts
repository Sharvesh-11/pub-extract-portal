import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'unknown',
    memory: process.memoryUsage(),
    queue: { pending: 0, processing: 0 }
  };

  try {
    await query('SELECT 1');
    health.database = 'connected';
    
    const qRes = await query(`
      SELECT status, COUNT(*) as count 
      FROM job_queue 
      WHERE status IN ('pending', 'processing') 
      GROUP BY status
    `);
    
    for (const row of qRes.rows) {
      if (row.status === 'pending') health.queue.pending = Number(row.count);
      if (row.status === 'processing') health.queue.processing = Number(row.count);
    }
  } catch (e: any) {
    health.status = 'degraded';
    health.database = 'error: ' + e.message;
    return NextResponse.json(health, { status: 503 });
  }

  return NextResponse.json(health);
}
