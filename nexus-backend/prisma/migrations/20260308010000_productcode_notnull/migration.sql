-- Back-fill any NULL productCode values before making it NOT NULL
UPDATE "Product"
SET "productCode" = CONCAT('PRD-AUTO-', LEFT("id", 8))
WHERE "productCode" IS NULL;

-- Make productCode non-nullable
ALTER TABLE "Product" ALTER COLUMN "productCode" SET NOT NULL;
