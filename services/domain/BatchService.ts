import { BatchRepository } from '../repositories/BatchRepository';
import { GymRepository } from '../repositories/GymRepository';
import { PlanRepository } from '../repositories/PlanRepository';
import { MemberRepository } from '../repositories/MemberRepository';
import { ValidationRepository } from '../repositories/ValidationRepository';
import { ReportRepository } from '../repositories/ReportRepository';
import { ExtractedMember, MembershipPlan } from '@/types';
import { PipelineStats } from '../business/pipeline';
import { DuplicateService } from './DuplicateService';
import { AuditService } from './AuditService';

const batchRepo = new BatchRepository();
const gymRepo = new GymRepository();
const planRepo = new PlanRepository();
const memberRepo = new MemberRepository();
const valRepo = new ValidationRepository();
const reportRepo = new ReportRepository();
const dupService = new DuplicateService();
const audit = new AuditService();

export class BatchService {
  async getGyms() {
    return await gymRepo.findAll();
  }

  async createBatch(gymId: string, batchName: string) {
    return await batchRepo.create(gymId, batchName);
  }

  async getBatch(batchId: string) {
    return await batchRepo.findById(batchId);
  }

  async updateBatchStatus(batchId: string, status: string, progress?: number) {
    await batchRepo.updateStatus(batchId, status);
    if (progress !== undefined) {
      await batchRepo.updateProgress(batchId, progress);
    }
  }

  async persistStagedData(batchId: string, gymId: string, members: ExtractedMember[], plans: MembershipPlan[], stats: PipelineStats) {
    // Save Plans
    const planIdMap = new Map<string, string>();
    for (const p of plans) {
      const dbId = await planRepo.create(gymId, batchId, {
        name: p.name,
        duration: p.duration,
        price: p.price,
        status: p.status
      });
      planIdMap.set(p.id, dbId);
    }

    // Save Members
    for (const m of members) {
      const dbPlanId = m.membershipPlanId ? planIdMap.get(m.membershipPlanId) : null;
      
      const dbMemberId = await memberRepo.create(
        gymId, 
        batchId, 
        dbPlanId || null, 
        m.normalizedData, 
        m.status, 
        m.confidence
      );

      if (m.validationResults.length > 0) {
        await valRepo.createBulk(dbMemberId, m.validationResults);
      }
    }

    // Save Report
    await reportRepo.create(batchId, stats);
    
    // Run Duplicate Detection
    await dupService.runDuplicateDetection(batchId, gymId);

    await batchRepo.updateStatus(batchId, 'completed');
    
    // Log extraction completed
    await audit.logEvent(batchId, 'system', 'Batch', batchId, 'Extraction completed', null, stats);
  }

  async persistJobData(batchId: string, gymId: string, members: ExtractedMember[], plans: MembershipPlan[], stats: PipelineStats) {
    // Save Plans
    const planIdMap = new Map<string, string>();
    for (const p of plans) {
      // Avoid duplicate plans inside same batch if possible? Just try to reuse if exists.
      const existing = await planRepo.findByBatchId(batchId);
      const matched = existing.find((e: any) => e.name.toLowerCase() === p.name.toLowerCase());
      if (matched) {
        planIdMap.set(p.id, matched.id);
      } else {
        const dbId = await planRepo.create(gymId, batchId, {
          name: p.name,
          duration: p.duration,
          price: p.price,
          status: p.status
        });
        planIdMap.set(p.id, dbId);
      }
    }

    // Save Members
    for (const m of members) {
      const dbPlanId = m.membershipPlanId ? planIdMap.get(m.membershipPlanId) : null;
      
      const dbMemberId = await memberRepo.create(
        gymId, 
        batchId, 
        dbPlanId || null, 
        m.normalizedData, 
        m.status, 
        m.confidence
      );

      if (m.validationResults.length > 0) {
        await valRepo.createBulk(dbMemberId, m.validationResults);
      }
    }

    // Save Report
    await reportRepo.increment(batchId, stats);
    
    // Run Duplicate Detection (Incrementally recalculate)
    await dupService.runDuplicateDetection(batchId, gymId);
  }
}
