-- Multi-Tenant Branch Isolation Migration
-- Adds branchId to: Product, Customer, Supplier, AuditLog, Setting, PayrollRecord
-- Converts global unique constraints to branch-scoped compound uniques

-- Step 1: Add nullable branchId columns first
ALTER TABLE "Product" ADD COLUMN "branchId" TEXT;
ALTER TABLE "Customer" ADD COLUMN "branchId" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "branchId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "branchId" TEXT;
ALTER TABLE "Setting" ADD COLUMN "branchId" TEXT;
ALTER TABLE "PayrollRecord" ADD COLUMN "branchId" TEXT;

-- Step 2: Backfill branchId from existing data
-- For Product: derive branchId from the category's branchId
UPDATE "Product" p
SET "branchId" = c."branchId"
FROM "Category" c
WHERE p."categoryId" = c."id" AND p."branchId" IS NULL;

-- For any products without a valid category, fall back to the oldest branch
UPDATE "Product"
SET "branchId" = (SELECT "id" FROM "Branch" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "branchId" IS NULL;

-- For Customer: assign to oldest branch (since customers were global)
UPDATE "Customer"
SET "branchId" = (SELECT "id" FROM "Branch" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "branchId" IS NULL;

-- For Supplier: assign to oldest branch
UPDATE "Supplier"
SET "branchId" = (SELECT "id" FROM "Branch" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "branchId" IS NULL;

-- For AuditLog: derive from the user's branchId where possible
UPDATE "AuditLog" a
SET "branchId" = u."branchId"
FROM "User" u
WHERE a."userId" = u."id" AND a."branchId" IS NULL;
-- AuditLog without a user keeps branchId NULL (system events)

-- For Setting: assign to oldest branch (was global)
UPDATE "Setting"
SET "branchId" = (SELECT "id" FROM "Branch" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "branchId" IS NULL;

-- For PayrollRecord: derive from the first payroll item's employee's user's branch
UPDATE "PayrollRecord" pr
SET "branchId" = u."branchId"
FROM "PayrollItem" pi
JOIN "Employee" e ON pi."employeeId" = e."id"
JOIN "User" u ON e."userId" = u."id"
WHERE pi."payrollRecordId" = pr."id" AND pr."branchId" IS NULL;

-- Fallback for PayrollRecords without items
UPDATE "PayrollRecord"
SET "branchId" = (SELECT "id" FROM "Branch" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "branchId" IS NULL;

-- Step 3: Make required columns NOT NULL (AuditLog stays nullable)
ALTER TABLE "Product" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "Customer" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "Supplier" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "Setting" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "PayrollRecord" ALTER COLUMN "branchId" SET NOT NULL;

-- Step 4: Drop old global unique constraints on Product
DROP INDEX IF EXISTS "Product_sku_key";
DROP INDEX IF EXISTS "Product_productCode_key";
DROP INDEX IF EXISTS "Product_barcode_key";

-- Drop old global unique constraint on Setting
DROP INDEX IF EXISTS "Setting_key_key";

-- Step 5: Create branch-scoped compound unique constraints
CREATE UNIQUE INDEX "Product_branchId_sku_key" ON "Product"("branchId", "sku");
CREATE UNIQUE INDEX "Product_branchId_productCode_key" ON "Product"("branchId", "productCode");
CREATE UNIQUE INDEX "Product_branchId_barcode_key" ON "Product"("branchId", "barcode");
CREATE UNIQUE INDEX "Setting_branchId_key_key" ON "Setting"("branchId", "key");

-- Step 6: Add foreign key constraints
ALTER TABLE "Product" ADD CONSTRAINT "Product_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollRecord" ADD CONSTRAINT "PayrollRecord_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 7: Add indexes for query performance on branchId columns
CREATE INDEX "Product_branchId_idx" ON "Product"("branchId");
CREATE INDEX "Customer_branchId_idx" ON "Customer"("branchId");
CREATE INDEX "Supplier_branchId_idx" ON "Supplier"("branchId");
CREATE INDEX "AuditLog_branchId_idx" ON "AuditLog"("branchId");
CREATE INDEX "Setting_branchId_idx" ON "Setting"("branchId");
CREATE INDEX "PayrollRecord_branchId_idx" ON "PayrollRecord"("branchId");
