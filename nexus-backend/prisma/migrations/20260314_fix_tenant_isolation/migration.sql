-- Fix multi-tenant isolation: Convert global unique constraints to branch-scoped ones
-- This migration ensures each store operates with its own independent data space

-- 1. Order.orderNumber: global → branch-scoped
-- Drop the old global unique index (if it exists)
DROP INDEX IF EXISTS "Order_orderNumber_key";
-- Create branch-scoped compound unique
CREATE UNIQUE INDEX IF NOT EXISTS "Order_branchId_orderNumber_key" ON "Order"("branchId", "orderNumber");

-- 2. Exchange.exchangeNumber: global → branch-scoped
DROP INDEX IF EXISTS "Exchange_exchangeNumber_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Exchange_branchId_exchangeNumber_key" ON "Exchange"("branchId", "exchangeNumber");

-- 3. StockTransfer.transferNumber: global → branch-scoped
DROP INDEX IF EXISTS "StockTransfer_transferNumber_key";
CREATE UNIQUE INDEX IF NOT EXISTS "StockTransfer_branchId_transferNumber_key" ON "StockTransfer"("branchId", "transferNumber");

-- 4. ProductionOrder.orderNumber: global → branch-scoped
DROP INDEX IF EXISTS "ProductionOrder_orderNumber_key";
CREATE UNIQUE INDEX IF NOT EXISTS "ProductionOrder_branchId_orderNumber_key" ON "ProductionOrder"("branchId", "orderNumber");

-- 5. Verify Category constraint is already branch-scoped (should already exist)
-- This is a safety check — if the old global constraint exists, replace it
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Category_name_key') THEN
        DROP INDEX "Category_name_key";
    END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "Category_branchId_name_key" ON "Category"("branchId", "name");

-- 6. Verify Subcategory constraint is already branch-scoped
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Subcategory_name_key') THEN
        DROP INDEX "Subcategory_name_key";
    END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "Subcategory_branchId_categoryId_name_key" ON "Subcategory"("branchId", "categoryId", "name");
