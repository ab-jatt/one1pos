-- Add STAFF role for store-level role-based access
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'STAFF';

-- Extend User for Firebase-auth linkage and account lifecycle
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "firebaseUid" TEXT,
  ADD COLUMN IF NOT EXISTS "firstName" TEXT,
  ADD COLUMN IF NOT EXISTS "lastName" TEXT,
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "createdById" TEXT;

-- Ensure firebase UID is globally unique when provided
CREATE UNIQUE INDEX IF NOT EXISTS "User_firebaseUid_key" ON "User"("firebaseUid");
