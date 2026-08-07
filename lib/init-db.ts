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
      "gymId" UUID REFERENCES gyms(id) ON DELETE CASCADE,
      "batchName" TEXT NOT NULL,
      status TEXT NOT NULL,
      progress NUMERIC DEFAULT 0,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS membership_plans (
      id UUID PRIMARY KEY,
      "gymId" UUID REFERENCES gyms(id) ON DELETE CASCADE,
      "batchId" UUID REFERENCES import_batches(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      duration TEXT,
      price TEXT,
      status TEXT NOT NULL,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS extracted_members (
      id UUID PRIMARY KEY,
      "gymId" UUID REFERENCES gyms(id) ON DELETE CASCADE,
      "batchId" UUID REFERENCES import_batches(id) ON DELETE CASCADE,
      "membershipPlanId" UUID REFERENCES membership_plans(id) ON DELETE CASCADE,
      name TEXT,
      contact_no TEXT,
      email TEXT,
      gender TEXT,
      dob TEXT,
      address TEXT,
      date TEXT,
      plan_duration TEXT,
      price TEXT,
      confidence NUMERIC,
      status TEXT NOT NULL,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS validation_results (
      id UUID PRIMARY KEY,
      "memberId" UUID REFERENCES extracted_members(id) ON DELETE CASCADE,
      rule TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS duplicate_candidates (
      id UUID PRIMARY KEY,
      "memberId" UUID REFERENCES extracted_members(id) ON DELETE CASCADE,
      "targetMemberId" UUID REFERENCES extracted_members(id) ON DELETE CASCADE,
      similarity NUMERIC NOT NULL,
      reason TEXT NOT NULL,
      resolved BOOLEAN DEFAULT FALSE,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS processing_reports (
      id UUID PRIMARY KEY,
      "batchId" UUID REFERENCES import_batches(id) ON DELETE CASCADE,
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
      "gymId" UUID REFERENCES gyms(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      duration TEXT,
      price TEXT,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS job_queue (
      id UUID PRIMARY KEY,
      "batchId" UUID REFERENCES import_batches(id) ON DELETE CASCADE,
      "gymId" UUID REFERENCES gyms(id) ON DELETE CASCADE,
      "filePath" TEXT,
      "fileName" TEXT NOT NULL,
      "mimeType" TEXT DEFAULT 'image/jpeg',
      "sourceText" TEXT,
      status TEXT NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
      error TEXT,
      attempts INT DEFAULT 0,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS prod_members (
      id UUID PRIMARY KEY,
      "gymId" UUID REFERENCES gyms(id) ON DELETE CASCADE,
      "batchId" UUID REFERENCES import_batches(id) ON DELETE CASCADE,
      "sourceFileId" UUID REFERENCES job_queue(id) ON DELETE CASCADE,
      "membershipPlanId" UUID REFERENCES prod_membership_plans(id) ON DELETE CASCADE,
      name TEXT,
      contact_no TEXT,
      date TEXT,
      plan_duration TEXT,
      price TEXT,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id UUID PRIMARY KEY,
      "batchId" UUID REFERENCES import_batches(id) ON DELETE CASCADE,
      actor TEXT NOT NULL,
      entity TEXT NOT NULL,
      "entityId" UUID,
      "actionType" TEXT NOT NULL,
      "previousValue" JSONB,
      "newValue" JSONB,
      "createdAt" TIMESTAMP DEFAULT NOW()
    );



    DO $$ BEGIN
      ALTER TABLE prod_members ADD CONSTRAINT unique_gym_phone UNIQUE ("gymId", contact_no);
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

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
