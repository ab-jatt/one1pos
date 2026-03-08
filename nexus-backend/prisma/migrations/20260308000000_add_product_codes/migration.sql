-- AlterTable: add productCode and barcode columns to Product
ALTER TABLE "Product" ADD COLUMN "productCode" TEXT;
ALTER TABLE "Product" ADD COLUMN "barcode" TEXT;

-- Backfill productCode for existing products using their SKU value
UPDATE "Product" SET "productCode" = "sku" WHERE "productCode" IS NULL;

-- CreateIndex: unique constraints
CREATE UNIQUE INDEX "Product_productCode_key" ON "Product"("productCode");
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");
