-- ============================================================
-- Migration: add_missing_tables
-- Adds Exchange, Warehouse, StockTransfer, ProductionOrder
-- and related sub-tables that were never included in migrations
-- despite being present in schema.prisma.
-- Also adds the exchangeId column to CustomerLedger and the
-- EXCHANGE_IN / EXCHANGE_OUT values to the MovementType enum.
-- ============================================================

-- ── New enums (idempotent) ───────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "ExchangeStatus" AS ENUM ('COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ExchangePaymentStatus" AS ENUM (
    'PENDING', 'PAID', 'REFUNDED',
    'CREDIT_ISSUED', 'CREDIT_USED', 'NOT_APPLICABLE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "WarehouseType" AS ENUM (
    'RAW_MATERIAL', 'PRODUCTION', 'FINISHED_GOODS', 'SCRAP', 'GENERAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "WarehouseMovementType" AS ENUM (
    'PURCHASE_RECEIVE', 'SALES_DISPATCH',
    'PRODUCTION_ISSUE', 'PRODUCTION_RECEIVE',
    'TRANSFER',
    'ADJUSTMENT_IN', 'ADJUSTMENT_OUT',
    'RETURN_IN', 'RETURN_OUT'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StockTransferStatus" AS ENUM (
    'DRAFT', 'PENDING', 'APPROVED', 'COMPLETED', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ProductionOrderStatus" AS ENUM (
    'DRAFT', 'MATERIALS_ISSUED', 'IN_PROGRESS',
    'COMPLETED', 'RECEIVED', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Extend existing MovementType enum ───────────────────────
ALTER TYPE "MovementType" ADD VALUE IF NOT EXISTS 'EXCHANGE_IN';
ALTER TYPE "MovementType" ADD VALUE IF NOT EXISTS 'EXCHANGE_OUT';

-- ── Add exchangeId to CustomerLedger ────────────────────────
ALTER TABLE "CustomerLedger" ADD COLUMN IF NOT EXISTS "exchangeId" TEXT;

-- ── Exchange ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Exchange" (
    "id"                TEXT                    NOT NULL,
    "exchangeNumber"    TEXT                    NOT NULL,
    "originalOrderId"   TEXT                    NOT NULL,
    "customerId"        TEXT,
    "branchId"          TEXT                    NOT NULL,
    "processedById"     TEXT,
    "returnedTotal"     DECIMAL(12,2)           NOT NULL,
    "issuedTotal"       DECIMAL(12,2)           NOT NULL,
    "calculatedAmount"  DECIMAL(12,2)           NOT NULL,
    "adjustedAmount"    DECIMAL(12,2),
    "adjustmentReason"  TEXT,
    "adjustedById"      TEXT,
    "difference"        DECIMAL(12,2)           NOT NULL,
    "paymentMethod"     "PaymentMethod",
    "paymentStatus"     "ExchangePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "status"            "ExchangeStatus"        NOT NULL DEFAULT 'COMPLETED',
    "notes"             TEXT,
    "createdAt"         TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3)            NOT NULL,

    CONSTRAINT "Exchange_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Exchange_exchangeNumber_key" ON "Exchange"("exchangeNumber");

-- ── ExchangeReturnItem ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ExchangeReturnItem" (
    "id"          TEXT         NOT NULL,
    "exchangeId"  TEXT         NOT NULL,
    "productId"   TEXT         NOT NULL,
    "quantity"    INTEGER      NOT NULL,
    "unitPrice"   DECIMAL(10,2) NOT NULL,
    "totalPrice"  DECIMAL(10,2) NOT NULL,

    CONSTRAINT "ExchangeReturnItem_pkey" PRIMARY KEY ("id")
);

-- ── ExchangeIssuedItem ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ExchangeIssuedItem" (
    "id"          TEXT         NOT NULL,
    "exchangeId"  TEXT         NOT NULL,
    "productId"   TEXT         NOT NULL,
    "quantity"    INTEGER      NOT NULL,
    "unitPrice"   DECIMAL(10,2) NOT NULL,
    "totalPrice"  DECIMAL(10,2) NOT NULL,

    CONSTRAINT "ExchangeIssuedItem_pkey" PRIMARY KEY ("id")
);

-- ── Warehouse ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Warehouse" (
    "id"        TEXT             NOT NULL,
    "branchId"  TEXT             NOT NULL,
    "name"      TEXT             NOT NULL,
    "code"      TEXT             NOT NULL,
    "type"      "WarehouseType"  NOT NULL DEFAULT 'GENERAL',
    "isDefault" BOOLEAN          NOT NULL DEFAULT false,
    "isActive"  BOOLEAN          NOT NULL DEFAULT true,
    "address"   TEXT,
    "createdAt" TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)     NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Warehouse_branchId_code_key" ON "Warehouse"("branchId", "code");

-- ── WarehouseLocation ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "WarehouseLocation" (
    "id"          TEXT         NOT NULL,
    "warehouseId" TEXT         NOT NULL,
    "name"        TEXT         NOT NULL,
    "code"        TEXT         NOT NULL,
    "isActive"    BOOLEAN      NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseLocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WarehouseLocation_warehouseId_code_key"
    ON "WarehouseLocation"("warehouseId", "code");

-- ── WarehouseMovement ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "WarehouseMovement" (
    "id"              TEXT                   NOT NULL,
    "branchId"        TEXT                   NOT NULL,
    "productId"       TEXT                   NOT NULL,
    "fromWarehouseId" TEXT,
    "toWarehouseId"   TEXT,
    "quantity"        INTEGER                NOT NULL,
    "unitCost"        DECIMAL(10,2)          NOT NULL DEFAULT 0,
    "totalCost"       DECIMAL(12,2)          NOT NULL DEFAULT 0,
    "movementType"    "WarehouseMovementType" NOT NULL,
    "referenceType"   TEXT,
    "referenceId"     TEXT,
    "notes"           TEXT,
    "createdById"     TEXT,
    "createdAt"       TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WarehouseMovement_pkey" PRIMARY KEY ("id")
);

-- ── StockTransfer ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "StockTransfer" (
    "id"              TEXT                 NOT NULL,
    "branchId"        TEXT                 NOT NULL,
    "transferNumber"  TEXT                 NOT NULL,
    "fromWarehouseId" TEXT                 NOT NULL,
    "toWarehouseId"   TEXT                 NOT NULL,
    "status"          "StockTransferStatus" NOT NULL DEFAULT 'DRAFT',
    "notes"           TEXT,
    "createdById"     TEXT,
    "approvedById"    TEXT,
    "createdAt"       TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3)         NOT NULL,
    "completedAt"     TIMESTAMP(3),

    CONSTRAINT "StockTransfer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StockTransfer_transferNumber_key" ON "StockTransfer"("transferNumber");

-- ── StockTransferItem ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "StockTransferItem" (
    "id"              TEXT         NOT NULL,
    "stockTransferId" TEXT         NOT NULL,
    "productId"       TEXT         NOT NULL,
    "quantity"        INTEGER      NOT NULL,
    "unitCost"        DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "StockTransferItem_pkey" PRIMARY KEY ("id")
);

-- ── ProductionOrder ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ProductionOrder" (
    "id"              TEXT                   NOT NULL,
    "branchId"        TEXT                   NOT NULL,
    "orderNumber"     TEXT                   NOT NULL,
    "productId"       TEXT                   NOT NULL,
    "quantity"        INTEGER                NOT NULL,
    "completedQty"    INTEGER                NOT NULL DEFAULT 0,
    "status"          "ProductionOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "rawMaterialCost" DECIMAL(12,2)          NOT NULL DEFAULT 0,
    "totalCost"       DECIMAL(12,2)          NOT NULL DEFAULT 0,
    "notes"           TEXT,
    "startDate"       TIMESTAMP(3),
    "completedDate"   TIMESTAMP(3),
    "createdById"     TEXT,
    "createdAt"       TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3)           NOT NULL,

    CONSTRAINT "ProductionOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductionOrder_orderNumber_key" ON "ProductionOrder"("orderNumber");

-- ── ProductionOrderItem ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ProductionOrderItem" (
    "id"                TEXT         NOT NULL,
    "productionOrderId" TEXT         NOT NULL,
    "productId"         TEXT         NOT NULL,
    "requiredQty"       INTEGER      NOT NULL,
    "issuedQty"         INTEGER      NOT NULL DEFAULT 0,
    "returnedQty"       INTEGER      NOT NULL DEFAULT 0,
    "unitCost"          DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "ProductionOrderItem_pkey" PRIMARY KEY ("id")
);

-- ── Foreign keys (idempotent — skip if constraint already exists) ──────────
DO $$ BEGIN ALTER TABLE "CustomerLedger" ADD CONSTRAINT "CustomerLedger_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "Exchange"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Exchange" ADD CONSTRAINT "Exchange_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Exchange" ADD CONSTRAINT "Exchange_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Exchange" ADD CONSTRAINT "Exchange_originalOrderId_fkey" FOREIGN KEY ("originalOrderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Exchange" ADD CONSTRAINT "Exchange_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Exchange" ADD CONSTRAINT "Exchange_adjustedById_fkey" FOREIGN KEY ("adjustedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ExchangeReturnItem" ADD CONSTRAINT "ExchangeReturnItem_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "Exchange"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ExchangeReturnItem" ADD CONSTRAINT "ExchangeReturnItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ExchangeIssuedItem" ADD CONSTRAINT "ExchangeIssuedItem_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "Exchange"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ExchangeIssuedItem" ADD CONSTRAINT "ExchangeIssuedItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "WarehouseLocation" ADD CONSTRAINT "WarehouseLocation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "WarehouseMovement" ADD CONSTRAINT "WarehouseMovement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "WarehouseMovement" ADD CONSTRAINT "WarehouseMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "WarehouseMovement" ADD CONSTRAINT "WarehouseMovement_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "WarehouseMovement" ADD CONSTRAINT "WarehouseMovement_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "WarehouseMovement" ADD CONSTRAINT "WarehouseMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_stockTransferId_fkey" FOREIGN KEY ("stockTransferId") REFERENCES "StockTransfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ProductionOrderItem" ADD CONSTRAINT "ProductionOrderItem_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ProductionOrderItem" ADD CONSTRAINT "ProductionOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
