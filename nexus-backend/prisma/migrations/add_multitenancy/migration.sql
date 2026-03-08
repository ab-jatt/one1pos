-- ============================================================
-- Migration: Multi-tenancy additions
--   1. Branch.ownerId (new column)
--   2. Plan table (new)
--   3. Subscription table (new)
--   4. Category.branchId + branch FK + unique constraint change
--   5. Role enum: add OWNER, migrate ADMIN → OWNER
--   6. User.branchId: make non-nullable
-- ============================================================

-- 1. Branch: add ownerId (default to empty string; caller can UPDATE after)
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "ownerId" TEXT NOT NULL DEFAULT '';

-- 2. Plan table
CREATE TABLE IF NOT EXISTS "Plan" (
  "id"          TEXT             NOT NULL,
  "name"        TEXT             NOT NULL,
  "price"       DOUBLE PRECISION NOT NULL,
  "maxUsers"    INTEGER          NOT NULL,
  "maxProducts" INTEGER          NOT NULL,
  CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- 3. Subscription table
CREATE TABLE IF NOT EXISTS "Subscription" (
  "id"        TEXT             NOT NULL,
  "branchId"  TEXT             NOT NULL,
  "planId"    TEXT             NOT NULL,
  "status"    TEXT             NOT NULL,
  "startDate" TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endDate"   TIMESTAMP(3),
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_branchId_key'
  ) THEN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_branchId_key" UNIQUE ("branchId");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_branchId_fkey'
  ) THEN
    ALTER TABLE "Subscription"
      ADD CONSTRAINT "Subscription_branchId_fkey"
      FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_planId_fkey'
  ) THEN
    ALTER TABLE "Subscription"
      ADD CONSTRAINT "Subscription_planId_fkey"
      FOREIGN KEY ("planId") REFERENCES "Plan"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- 4a. Category: add branchId column (nullable first, populate, then NOT NULL)
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "branchId" TEXT;

UPDATE "Category" SET "branchId" = 'main-branch-id' WHERE "branchId" IS NULL;

ALTER TABLE "Category" ALTER COLUMN "branchId" SET NOT NULL;

-- 4b. Drop old global unique on Category.name
ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_name_key";

-- 4c. Add new branch-scoped unique
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Category_branchId_name_key'
  ) THEN
    ALTER TABLE "Category"
      ADD CONSTRAINT "Category_branchId_name_key" UNIQUE ("branchId", "name");
  END IF;
END $$;

-- 4d. Add FK from Category to Branch
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Category_branchId_fkey'
  ) THEN
    ALTER TABLE "Category"
      ADD CONSTRAINT "Category_branchId_fkey"
      FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- 5. Role enum: add OWNER value and migrate ADMIN rows to OWNER
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'OWNER';

-- Commit the enum addition before using it in UPDATE
-- (PostgreSQL requires new enum values to be committed before use
--  in the same transaction; we use a separate DO block)

-- 6. User.branchId: populate NULLs then make non-nullable
UPDATE "User" SET "branchId" = 'main-branch-id' WHERE "branchId" IS NULL;
ALTER TABLE "User" ALTER COLUMN "branchId" SET NOT NULL;
