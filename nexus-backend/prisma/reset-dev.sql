-- =============================================================================
-- DEV DATABASE RESET — NexusPOS
-- =============================================================================
-- Removes ALL application data while keeping schema, tables, and constraints.
-- Safe for development / testing only — DO NOT run against production.
--
-- Strategy: TRUNCATE all tables in one statement with CASCADE.
--   • CASCADE automatically handles FK constraints between listed tables.
--   • RESTART IDENTITY resets any sequences (no-op for UUID-only tables).
--
-- Run via:
--   $env:DATABASE_URL="postgresql://..." ; npx prisma db execute --stdin < prisma\reset-dev.sql
--   -- or from the project root:
--   npm run db:reset
-- =============================================================================

TRUNCATE TABLE
  -- ── Leaf / child tables (no other tables reference them) ──────────────────
  "AuditLog",
  "PayrollItem",
  "Shift",
  "StockMovement",
  "CustomerLedger",
  "ExchangeReturnItem",
  "ExchangeIssuedItem",
  "Payment",
  "OrderItem",
  "PurchaseOrderItem",
  "ProductionOrderItem",
  "StockTransferItem",
  "WarehouseLocation",
  "WarehouseMovement",

  -- ── Mid-level tables ──────────────────────────────────────────────────────
  "Transaction",       -- references Order (unique FK)
  "Exchange",          -- references Order, Customer
  "Order",             -- references User (cashier), Customer
  "PurchaseOrder",     -- references Supplier
  "ProductionOrder",   -- references Product
  "StockTransfer",     -- references Warehouse
  "Warehouse",         -- references Branch
  "Stock",             -- references Product
  "PayrollRecord",     -- references Branch
  "Employee",          -- references User
  "Setting",           -- references Branch
  "Subscription",      -- references Branch, Plan

  -- ── Core domain entities ──────────────────────────────────────────────────
  "Product",           -- references Category, Subcategory
  "Subcategory",       -- references Category, Branch
  "Category",          -- references Branch
  "Customer",          -- references Branch
  "Supplier",          -- references Branch
  "User",              -- references Branch

  -- ── Root tables ───────────────────────────────────────────────────────────
  "Branch",
  "Plan"

RESTART IDENTITY CASCADE;
