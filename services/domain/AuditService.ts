import { query, getClient } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export class AuditService {
  async logEvent(
    batchId: string, 
    actor: 'user' | 'system', 
    entity: 'Batch' | 'Member' | 'Plan' | 'Duplicate', 
    entityId: string | null, 
    actionType: string, 
    previousValue: any = null, 
    newValue: any = null,
    transactionClient?: any
  ) {
    const id = uuidv4();
    const q = `
      INSERT INTO audit_events (id, "batchId", actor, entity, "entityId", "actionType", "previousValue", "newValue")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    const params = [
      id, 
      batchId, 
      actor, 
      entity, 
      entityId, 
      actionType, 
      previousValue ? JSON.stringify(previousValue) : null, 
      newValue ? JSON.stringify(newValue) : null
    ];
    
    if (transactionClient) {
      await transactionClient.query(q, params);
    } else {
      await query(q, params);
    }
  }

  async getEventsForBatch(batchId: string) {
    const res = await query('SELECT * FROM audit_events WHERE "batchId" = $1 ORDER BY "createdAt" DESC', [batchId]);
    return res.rows;
  }
}
