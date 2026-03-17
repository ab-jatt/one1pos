-- Add APPROVED status and store-scoped sequential PO number support

-- 1) Extend PO status enum
ALTER TYPE "PurchaseOrderStatus" ADD VALUE IF NOT EXISTS 'APPROVED';

-- 2) Add poNumber column
ALTER TABLE "PurchaseOrder" ADD COLUMN "poNumber" TEXT;

-- 3) Backfill existing rows with store-scoped yearly sequence format: PO-YYYY-00001
WITH numbered AS (
  SELECT
    p."id",
    p."branchId",
    EXTRACT(YEAR FROM COALESCE(p."createdAt", NOW()))::INT AS yr,
    ROW_NUMBER() OVER (
      PARTITION BY p."branchId", EXTRACT(YEAR FROM COALESCE(p."createdAt", NOW()))::INT
      ORDER BY p."createdAt" ASC, p."id" ASC
    ) AS seq
  FROM "PurchaseOrder" p
)
UPDATE "PurchaseOrder" p
SET "poNumber" =
  'PO-' || numbered.yr::TEXT || '-' || LPAD(numbered.seq::TEXT, 5, '0')
FROM numbered
WHERE p."id" = numbered."id";

-- 4) Enforce required column + store-scoped uniqueness
ALTER TABLE "PurchaseOrder" ALTER COLUMN "poNumber" SET NOT NULL;
CREATE UNIQUE INDEX "PurchaseOrder_branchId_poNumber_key" ON "PurchaseOrder"("branchId", "poNumber");
