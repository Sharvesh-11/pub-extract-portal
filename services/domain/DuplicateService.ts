import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { ExtractedMember } from '@/types';
import { AuditService } from './AuditService';

const audit = new AuditService();

export class DuplicateService {
  async runDuplicateDetection(batchId: string, gymId: string) {
    // No-op: duplicate detection is now deterministic at commit time via contact_no
  }
}
