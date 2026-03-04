-- Neon Database Schema Backup
-- Created: 2026-03-02

CREATE SCHEMA IF NOT EXISTS "public";
CREATE SCHEMA IF NOT EXISTS "neon_auth";

-- Types
CREATE TYPE "Role" AS ENUM('ADMIN', 'MANAGER', 'CASHIER');
CREATE TYPE "OrderStatus" AS ENUM('COMPLETED', 'PENDING', 'REFUNDED', 'CANCELLED');
CREATE TYPE "PaymentMethod" AS ENUM('CASH', 'CARD', 'WALLET', 'SPLIT', 'CREDIT');
CREATE TYPE "PurchaseOrderStatus" AS ENUM('PENDING', 'RECEIVED', 'CANCELLED');
CREATE TYPE "MovementType" AS ENUM('SALE', 'RESTOCK', 'ADJUSTMENT', 'RETURN', 'TRANSFER_IN', 'TRANSFER_OUT', 'DAMAGE', 'EXCHANGE_IN', 'EXCHANGE_OUT');
CREATE TYPE "TransactionType" AS ENUM('INCOME', 'EXPENSE');
CREATE TYPE "EmployeeStatus" AS ENUM('ACTIVE', 'ON_LEAVE', 'TERMINATED');
CREATE TYPE "ExchangeStatus" AS ENUM('COMPLETED', 'CANCELLED');
CREATE TYPE "ExchangePaymentStatus" AS ENUM('PENDING', 'PAID', 'REFUNDED', 'CREDIT_ISSUED', 'CREDIT_USED', 'NOT_APPLICABLE');
CREATE TYPE "WarehouseType" AS ENUM('RAW_MATERIAL', 'PRODUCTION', 'FINISHED_GOODS', 'SCRAP', 'GENERAL');
CREATE TYPE "WarehouseMovementType" AS ENUM('PURCHASE_RECEIVE', 'SALES_DISPATCH', 'PRODUCTION_ISSUE', 'PRODUCTION_RECEIVE', 'TRANSFER', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'RETURN_IN', 'RETURN_OUT');
CREATE TYPE "StockTransferStatus" AS ENUM('DRAFT', 'PENDING', 'APPROVED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ProductionOrderStatus" AS ENUM('DRAFT', 'MATERIALS_ISSUED', 'IN_PROGRESS', 'COMPLETED', 'RECEIVED', 'CANCELLED');

-- Tables
CREATE TABLE "_prisma_migrations" (
	"id" varchar(36) PRIMARY KEY,
	"checksum" varchar(64) NOT NULL,
	"finished_at" timestamp with time zone,
	"migration_name" varchar(255) NOT NULL,
	"logs" text,
	"rolled_back_at" timestamp with time zone,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_steps_count" integer DEFAULT 0 NOT NULL
);

CREATE TABLE "Branch" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"address" text,
	"phone" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"taxRate" numeric(5, 2) DEFAULT '0.08' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"deletedAt" timestamp
);

CREATE TABLE "Category" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp NOT NULL
);

CREATE TABLE "User" (
	"id" text PRIMARY KEY,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"role" "Role" DEFAULT 'CASHIER' NOT NULL,
	"permissions" text[],
	"avatar" text,
	"branchId" text,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"deletedAt" timestamp
);

CREATE TABLE "Customer" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"points" integer DEFAULT 0 NOT NULL,
	"balance" numeric(10, 2) DEFAULT '0' NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"deletedAt" timestamp
);

CREATE TABLE "Product" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"sku" text NOT NULL,
	"description" text,
	"image" text,
	"price" numeric(10, 2) NOT NULL,
	"costPrice" numeric(10, 2) NOT NULL,
	"categoryId" text NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"deletedAt" timestamp
);

CREATE TABLE "Stock" (
	"id" text PRIMARY KEY,
	"branchId" text NOT NULL,
	"productId" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"minStock" integer DEFAULT 10 NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp NOT NULL
);

CREATE TABLE "Supplier" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"contactPerson" text,
	"email" text,
	"phone" text,
	"address" text,
	"paymentTerms" text,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"deletedAt" timestamp
);

CREATE TABLE "Order" (
	"id" text PRIMARY KEY,
	"orderNumber" text NOT NULL,
	"customerId" text,
	"cashierId" text NOT NULL,
	"branchId" text NOT NULL,
	"status" "OrderStatus" DEFAULT 'COMPLETED' NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"tax" numeric(12, 2) NOT NULL,
	"discount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp NOT NULL
);

CREATE TABLE "OrderItem" (
	"id" text PRIMARY KEY,
	"orderId" text NOT NULL,
	"productId" text NOT NULL,
	"quantity" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"cost" numeric(10, 2) NOT NULL
);

CREATE TABLE "Payment" (
	"id" text PRIMARY KEY,
	"orderId" text NOT NULL,
	"method" "PaymentMethod" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"processedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "Transaction" (
	"id" text PRIMARY KEY,
	"branchId" text NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"type" "TransactionType" NOT NULL,
	"category" text NOT NULL,
	"referenceId" text,
	"orderId" text,
	"date" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp NOT NULL
);

CREATE TABLE "PurchaseOrder" (
	"id" text PRIMARY KEY,
	"supplierId" text NOT NULL,
	"branchId" text NOT NULL,
	"status" "PurchaseOrderStatus" DEFAULT 'PENDING' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"notes" text,
	"date" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp NOT NULL
);

CREATE TABLE "PurchaseOrderItem" (
	"id" text PRIMARY KEY,
	"purchaseOrderId" text NOT NULL,
	"productId" text NOT NULL,
	"quantity" integer NOT NULL,
	"cost" numeric(10, 2) NOT NULL
);

CREATE TABLE "Employee" (
	"id" text PRIMARY KEY,
	"userId" text NOT NULL,
	"department" text NOT NULL,
	"position" text NOT NULL,
	"salary" numeric(10, 2) NOT NULL,
	"status" "EmployeeStatus" DEFAULT 'ACTIVE' NOT NULL,
	"joinDate" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"deletedAt" timestamp
);

CREATE TABLE "Shift" (
	"id" text PRIMARY KEY,
	"employeeId" text NOT NULL,
	"startTime" timestamp NOT NULL,
	"endTime" timestamp,
	"type" text NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp NOT NULL
);

CREATE TABLE "PayrollRecord" (
	"id" text PRIMARY KEY,
	"periodStart" timestamp NOT NULL,
	"periodEnd" timestamp NOT NULL,
	"payDate" timestamp NOT NULL,
	"totalPaid" numeric(12, 2) NOT NULL,
	"status" text NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp NOT NULL
);

CREATE TABLE "PayrollItem" (
	"id" text PRIMARY KEY,
	"payrollRecordId" text NOT NULL,
	"employeeId" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"deductions" numeric(10, 2) DEFAULT '0' NOT NULL,
	"bonuses" numeric(10, 2) DEFAULT '0' NOT NULL
);

CREATE TABLE "AuditLog" (
	"id" text PRIMARY KEY,
	"userId" text,
	"action" text NOT NULL,
	"module" text NOT NULL,
	"details" text,
	"ipAddress" text,
	"timestamp" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "Setting" (
	"id" text PRIMARY KEY,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updatedAt" timestamp NOT NULL
);

CREATE TABLE "StockMovement" (
	"id" text PRIMARY KEY,
	"stockId" text NOT NULL,
	"type" "MovementType" NOT NULL,
	"reason" text,
	"referenceId" text,
	"createdById" text,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"closingStock" integer DEFAULT 0 NOT NULL,
	"openingStock" integer DEFAULT 0 NOT NULL,
	"quantityIn" integer DEFAULT 0 NOT NULL,
	"quantityOut" integer DEFAULT 0 NOT NULL
);

CREATE TABLE "CustomerLedger" (
	"id" text PRIMARY KEY,
	"customerId" text NOT NULL,
	"orderId" text,
	"type" text DEFAULT 'CREDIT' NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"description" text,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"exchangeId" text
);

CREATE TABLE "Exchange" (
	"id" text PRIMARY KEY,
	"exchangeNumber" text NOT NULL,
	"originalOrderId" text NOT NULL,
	"customerId" text,
	"branchId" text NOT NULL,
	"returnedTotal" numeric(12, 2) NOT NULL,
	"issuedTotal" numeric(12, 2) NOT NULL,
	"difference" numeric(12, 2) NOT NULL,
	"paymentMethod" "PaymentMethod",
	"status" "ExchangeStatus" DEFAULT 'COMPLETED' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"adjustedAmount" numeric(12, 2),
	"adjustedById" text,
	"adjustmentReason" text,
	"calculatedAmount" numeric(12, 2) NOT NULL,
	"paymentStatus" "ExchangePaymentStatus" DEFAULT 'PENDING' NOT NULL,
	"processedById" text
);

CREATE TABLE "ExchangeReturnItem" (
	"id" text PRIMARY KEY,
	"exchangeId" text NOT NULL,
	"productId" text NOT NULL,
	"quantity" integer NOT NULL,
	"unitPrice" numeric(10, 2) NOT NULL,
	"totalPrice" numeric(10, 2) NOT NULL
);

CREATE TABLE "ExchangeIssuedItem" (
	"id" text PRIMARY KEY,
	"exchangeId" text NOT NULL,
	"productId" text NOT NULL,
	"quantity" integer NOT NULL,
	"unitPrice" numeric(10, 2) NOT NULL,
	"totalPrice" numeric(10, 2) NOT NULL
);

CREATE TABLE "Warehouse" (
	"id" text PRIMARY KEY,
	"branchId" text NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"type" "WarehouseType" DEFAULT 'RAW_MATERIAL' NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"address" text,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"deletedAt" timestamp
);

CREATE TABLE "WarehouseLocation" (
	"id" text PRIMARY KEY,
	"warehouseId" text NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp NOT NULL
);

CREATE TABLE "WarehouseMovement" (
	"id" text PRIMARY KEY,
	"branchId" text NOT NULL,
	"productId" text NOT NULL,
	"fromWarehouseId" text,
	"toWarehouseId" text,
	"quantity" integer NOT NULL,
	"unitCost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"totalCost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"movementType" "WarehouseMovementType" NOT NULL,
	"referenceType" text,
	"referenceId" text,
	"notes" text,
	"createdById" text,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "StockTransfer" (
	"id" text PRIMARY KEY,
	"branchId" text NOT NULL,
	"transferNumber" text NOT NULL,
	"fromWarehouseId" text NOT NULL,
	"toWarehouseId" text NOT NULL,
	"status" "StockTransferStatus" DEFAULT 'DRAFT' NOT NULL,
	"notes" text,
	"createdById" text,
	"approvedById" text,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"completedAt" timestamp
);

CREATE TABLE "StockTransferItem" (
	"id" text PRIMARY KEY,
	"stockTransferId" text NOT NULL,
	"productId" text NOT NULL,
	"quantity" integer NOT NULL,
	"unitCost" numeric(10, 2) DEFAULT '0' NOT NULL
);

CREATE TABLE "ProductionOrder" (
	"id" text PRIMARY KEY,
	"branchId" text NOT NULL,
	"orderNumber" text NOT NULL,
	"productId" text NOT NULL,
	"quantity" integer NOT NULL,
	"completedQty" integer DEFAULT 0 NOT NULL,
	"status" "ProductionOrderStatus" DEFAULT 'DRAFT' NOT NULL,
	"rawMaterialCost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"totalCost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"startDate" timestamp,
	"completedDate" timestamp,
	"createdById" text,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp NOT NULL
);

CREATE TABLE "ProductionOrderItem" (
	"id" text PRIMARY KEY,
	"productionOrderId" text NOT NULL,
	"productId" text NOT NULL,
	"requiredQty" integer NOT NULL,
	"issuedQty" integer DEFAULT 0 NOT NULL,
	"returnedQty" integer DEFAULT 0 NOT NULL,
	"unitCost" numeric(10, 2) DEFAULT '0' NOT NULL
);

-- Neon Auth Tables (schema: neon_auth)
CREATE TABLE "neon_auth"."user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"email" text NOT NULL CONSTRAINT "user_email_key" UNIQUE,
	"emailVerified" boolean NOT NULL,
	"image" text,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"role" text,
	"banned" boolean,
	"banReason" text,
	"banExpires" timestamp with time zone
);

CREATE TABLE "neon_auth"."account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" uuid NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp with time zone,
	"refreshTokenExpiresAt" timestamp with time zone,
	"scope" text,
	"password" text,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL
);

CREATE TABLE "neon_auth"."session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"expiresAt" timestamp with time zone NOT NULL,
	"token" text NOT NULL CONSTRAINT "session_token_key" UNIQUE,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" uuid NOT NULL,
	"impersonatedBy" text,
	"activeOrganizationId" text
);

CREATE TABLE "neon_auth"."verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "neon_auth"."organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"slug" text NOT NULL CONSTRAINT "organization_slug_key" UNIQUE,
	"logo" text,
	"createdAt" timestamp with time zone NOT NULL,
	"metadata" text
);

CREATE TABLE "neon_auth"."member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organizationId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"role" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL
);

CREATE TABLE "neon_auth"."invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organizationId" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"inviterId" uuid NOT NULL
);

CREATE TABLE "neon_auth"."jwks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"publicKey" text NOT NULL,
	"privateKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"expiresAt" timestamp with time zone
);

CREATE TABLE "neon_auth"."project_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"endpoint_id" text NOT NULL CONSTRAINT "project_config_endpoint_id_key" UNIQUE,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"trusted_origins" jsonb NOT NULL,
	"social_providers" jsonb NOT NULL,
	"email_provider" jsonb,
	"email_and_password" jsonb,
	"allow_localhost" boolean NOT NULL
);

-- Unique Constraints
CREATE UNIQUE INDEX "Category_name_key" ON "Category" ("name");
CREATE UNIQUE INDEX "User_email_key" ON "User" ("email");
CREATE UNIQUE INDEX "Product_sku_key" ON "Product" ("sku");
CREATE UNIQUE INDEX "Stock_branchId_productId_key" ON "Stock" ("branchId","productId");
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order" ("orderNumber");
CREATE UNIQUE INDEX "Transaction_orderId_key" ON "Transaction" ("orderId");
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting" ("key");
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee" ("userId");
CREATE UNIQUE INDEX "Exchange_exchangeNumber_key" ON "Exchange" ("exchangeNumber");
CREATE UNIQUE INDEX "Warehouse_branchId_code_key" ON "Warehouse" ("branchId","code");
CREATE UNIQUE INDEX "WarehouseLocation_warehouseId_code_key" ON "WarehouseLocation" ("warehouseId","code");
CREATE UNIQUE INDEX "StockTransfer_transferNumber_key" ON "StockTransfer" ("transferNumber");
CREATE UNIQUE INDEX "ProductionOrder_orderNumber_key" ON "ProductionOrder" ("orderNumber");

-- Indexes for neon_auth
CREATE INDEX "account_userId_idx" ON "neon_auth"."account" ("userId");
CREATE INDEX "session_userId_idx" ON "neon_auth"."session" ("userId");
CREATE INDEX "verification_identifier_idx" ON "neon_auth"."verification" ("identifier");
CREATE INDEX "member_organizationId_idx" ON "neon_auth"."member" ("organizationId");
CREATE INDEX "member_userId_idx" ON "neon_auth"."member" ("userId");
CREATE INDEX "invitation_organizationId_idx" ON "neon_auth"."invitation" ("organizationId");
CREATE INDEX "invitation_email_idx" ON "neon_auth"."invitation" ("email");

-- Foreign Keys
ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_payrollRecordId_fkey" FOREIGN KEY ("payrollRecordId") REFERENCES "PayrollRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerLedger" ADD CONSTRAINT "CustomerLedger_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerLedger" ADD CONSTRAINT "CustomerLedger_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "Exchange"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Exchange" ADD CONSTRAINT "Exchange_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Exchange" ADD CONSTRAINT "Exchange_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Exchange" ADD CONSTRAINT "Exchange_originalOrderId_fkey" FOREIGN KEY ("originalOrderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Exchange" ADD CONSTRAINT "Exchange_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Exchange" ADD CONSTRAINT "Exchange_adjustedById_fkey" FOREIGN KEY ("adjustedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExchangeReturnItem" ADD CONSTRAINT "ExchangeReturnItem_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "Exchange"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExchangeReturnItem" ADD CONSTRAINT "ExchangeReturnItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExchangeIssuedItem" ADD CONSTRAINT "ExchangeIssuedItem_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "Exchange"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExchangeIssuedItem" ADD CONSTRAINT "ExchangeIssuedItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseLocation" ADD CONSTRAINT "WarehouseLocation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseMovement" ADD CONSTRAINT "WarehouseMovement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseMovement" ADD CONSTRAINT "WarehouseMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseMovement" ADD CONSTRAINT "WarehouseMovement_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WarehouseMovement" ADD CONSTRAINT "WarehouseMovement_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WarehouseMovement" ADD CONSTRAINT "WarehouseMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_stockTransferId_fkey" FOREIGN KEY ("stockTransferId") REFERENCES "StockTransfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductionOrderItem" ADD CONSTRAINT "ProductionOrderItem_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionOrderItem" ADD CONSTRAINT "ProductionOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Neon Auth Foreign Keys
ALTER TABLE "neon_auth"."account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE;
ALTER TABLE "neon_auth"."session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE;
ALTER TABLE "neon_auth"."member" ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "neon_auth"."organization"("id") ON DELETE CASCADE;
ALTER TABLE "neon_auth"."member" ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE;
ALTER TABLE "neon_auth"."invitation" ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "neon_auth"."organization"("id") ON DELETE CASCADE;
ALTER TABLE "neon_auth"."invitation" ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE;
