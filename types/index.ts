export interface Gym {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

export interface UploadedFile {
  id: string;
  batchId: string;
  originalFile: File;
  originalPreview: string;
}

export interface ImportBatch {
  id: string;
  gymId: string;
  name: string;
  createdAt: string;
  status: 'waiting' | 'processing' | 'completed' | 'failed';
  uploadedFiles: UploadedFile[];
  processingProgress: number;
}

export interface ProcessingJob {
  id: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  fileName: string;
}

export interface ExtractionResult {
  id: string;
  sourceImageId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawJson: any; 
}

export interface ValidationResult {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  passed: boolean;
}

export interface DuplicateCandidate {
  matchedMemberId: string;
  similarity: number;
  reason: string;
}

export interface ExtractedMember {
  id: string;
  gymId: string;
  batchId: string;
  sourceFileId: string;
  status: 'RAW' | 'NORMALIZED' | 'VALIDATED' | 'FLAGGED' | 'READY';
  confidence: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawExtraction: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  normalizedData: any;
  membershipPlanId: string | null;
  validationResults: ValidationResult[];
  duplicateCandidate: DuplicateCandidate | null;
  createdAt: string;
}

export interface MembershipPlan {
  id: string;
  gymId: string;
  name: string;
  duration: string;
  price: string;
  status: 'MATCHED_EXISTING' | 'NEW_PLAN';
}
