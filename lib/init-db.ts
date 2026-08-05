import { query } from './db';

async function main() {
  await query(`
    CREATE TABLE IF NOT EXISTS gyms (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS import_batches (
      id UUID PRIMARY KEY,
      "gymId" UUID REFERENCES gyms(id),
      "batchName" TEXT NOT NULL,
      status TEXT NOT NULL,
      progress NUMERIC DEFAULT 0,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS membership_plans (
      id UUID PRIMARY KEY,
      "gymId" UUID REFERENCES gyms(id),
      "batchId" UUID REFERENCES import_batches(id),
      name TEXT NOT NULL,
      duration TEXT,
      price TEXT,
      status TEXT NOT NULL,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS extracted_members (
      id UUID PRIMARY KEY,
      "gymId" UUID REFERENCES gyms(id),
      "batchId" UUID REFERENCES import_batches(id),
      "membershipPlanId" UUID REFERENCES membership_plans(id),
      "fullName" TEXT,
      phone TEXT,
      email TEXT,
      gender TEXT,
      dob TEXT,
      address TEXT,
      "joinDate" TEXT,
      duration TEXT,
      price TEXT,
      confidence NUMERIC,
      status TEXT NOT NULL,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS validation_results (
      id UUID PRIMARY KEY,
      "memberId" UUID REFERENCES extracted_members(id),
      rule TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS duplicate_candidates (
      id UUID PRIMARY KEY,
      "memberId" UUID REFERENCES extracted_members(id),
      "targetMemberId" UUID REFERENCES extracted_members(id),
      similarity NUMERIC NOT NULL,
      reason TEXT NOT NULL,
      resolved BOOLEAN DEFAULT FALSE,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS processing_reports (
      id UUID PRIMARY KEY,
      "batchId" UUID REFERENCES import_batches(id),
      "membersFound" INT DEFAULT 0,
      "plansCreated" INT DEFAULT 0,
      "mergedMembers" INT DEFAULT 0,
      "validationErrors" INT DEFAULT 0,
      "processingTime" NUMERIC DEFAULT 0,
      "overallConfidence" NUMERIC DEFAULT 0,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS prod_membership_plans (
      id UUID PRIMARY KEY,
      "gymId" UUID REFERENCES gyms(id),
      name TEXT NOT NULL,
      duration TEXT,
      price TEXT,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS prod_members (
      id UUID PRIMARY KEY,
      "gymId" UUID REFERENCES gyms(id),
      "membershipPlanId" UUID REFERENCES prod_membership_plans(id),
      "fullName" TEXT,
      phone TEXT,
      email TEXT,
      gender TEXT,
      dob TEXT,
      address TEXT,
      "joinDate" TEXT,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id UUID PRIMARY KEY,
      "batchId" UUID REFERENCES import_batches(id),
      actor TEXT NOT NULL,
      entity TEXT NOT NULL,
      "entityId" UUID,
      "actionType" TEXT NOT NULL,
      "previousValue" JSONB,
      "newValue" JSONB,
      "createdAt" TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS job_queue (
      id UUID PRIMARY KEY,
      "batchId" UUID REFERENCES import_batches(id),
      "gymId" UUID REFERENCES gyms(id),
      "filePath" TEXT NOT NULL,
      "fileName" TEXT NOT NULL,
      status TEXT NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
      error TEXT,
      attempts INT DEFAULT 0,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );

    -- Insert mock gyms if empty
    INSERT INTO gyms (id, name, status)
    VALUES 
      ('00000000-0000-0000-0000-000000000001', 'Muscle Fitness Garage', 'active'),
      ('00000000-0000-0000-0000-000000000002', 'PowerHouse Gym', 'active'),
      ('00000000-0000-0000-0000-000000000003', 'Titan Fitness', 'active')
    ON CONFLICT (id) DO NOTHING;
  `);
  console.log("Database initialized");
  process.exit(0);
}

main().catch(console.error);
