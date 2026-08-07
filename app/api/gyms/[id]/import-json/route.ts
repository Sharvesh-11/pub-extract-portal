import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { createStagedMembers } from '@/features/import/staging';
import { processMembers } from '@/services/business/pipeline';
import { BatchService } from '@/services/domain/BatchService';
import { logger } from '@/lib/logger';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { batchId, members } = body;
    const gymId = params.id;

    if (!Array.isArray(members)) {
      return NextResponse.json({ error: "Members must be an array" }, { status: 400 });
    }

    const newImageRecords = members.map((r: any) => ({
      id: Math.random().toString(36).substring(7),
      sourceImageId: 'json_paste',
      rawJson: r,
    }));

    // Find gym
    const gRes = await query('SELECT * FROM gyms WHERE id = $1', [gymId]);
    if (gRes.rows.length === 0) return NextResponse.json({ error: "Gym not found" }, { status: 404 });
    const gym = gRes.rows[0];

    // Find batch
    const bRes = await query('SELECT * FROM import_batches WHERE id = $1', [batchId]);
    if (bRes.rows.length === 0) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    const batch = bRes.rows[0];

    // Stage
    const { members: staged, plans } = createStagedMembers(newImageRecords, batch, gym);
    
    // Process (this internally calls normalizeMember which normalizes contact_no and other fields)
    const { members: processed, stats } = processMembers(staged);

    // Persist Job Data
    const batchService = new BatchService();
    await batchService.persistJobData(batchId, gymId, processed, plans, stats);

    // Mark batch as completed since this bypasses async queues
    await batchService.updateBatchStatus(batchId, 'completed');

    return NextResponse.json({ success: true, processedCount: processed.length });

  } catch (error: any) {
    logger.error("JSON Import Error", { error: error.message });
    return NextResponse.json({ error: error.message || "Failed to process JSON import" }, { status: 500 });
  }
}
