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
    

  } catch (e: any) {
    health.status = 'degraded';
    health.database = 'error: ' + e.message;
    return NextResponse.json(health, { status: 503 });
  }

  return NextResponse.json(health);
}
