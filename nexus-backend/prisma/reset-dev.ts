/**
 * DEV DATABASE RESET — NexusPOS
 * ============================================================
 * Deletes ALL application data in correct FK dependency order.
 * Schema, tables, and constraints are left fully intact.
 *
 * Usage:
 *   npx ts-node prisma/reset-dev.ts
 *   -- or:
 *   npm run db:reset:ts
 * ============================================================
 * DEVELOPMENT / TESTING ONLY — never run against production.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetDatabase(): Promise<void> {
  console.log('⚠️  DEV RESET: deleting all application data…\n');

  // ── 1. Pure leaf tables (nothing references them) ────────────────────────
  await prisma.auditLog.deleteMany({});
  console.log('  ✓ AuditLog');

  await prisma.payrollItem.deleteMany({});
  console.log('  ✓ PayrollItem');

  await prisma.shift.deleteMany({});
  console.log('  ✓ Shift');

  await prisma.stockMovement.deleteMany({});
  console.log('  ✓ StockMovement');

  await prisma.customerLedger.deleteMany({});
  console.log('  ✓ CustomerLedger');

  await prisma.exchangeIssuedItem.deleteMany({});
  console.log('  ✓ ExchangeIssuedItem');

  await prisma.exchangeReturnItem.deleteMany({});
  console.log('  ✓ ExchangeReturnItem');

  await prisma.payment.deleteMany({});
  console.log('  ✓ Payment');

  await prisma.orderItem.deleteMany({});
  console.log('  ✓ OrderItem');

  await prisma.purchaseOrderItem.deleteMany({});
  console.log('  ✓ PurchaseOrderItem');

  await prisma.productionOrderItem.deleteMany({});
  console.log('  ✓ ProductionOrderItem');

  await prisma.stockTransferItem.deleteMany({});
  console.log('  ✓ StockTransferItem');

  await prisma.warehouseLocation.deleteMany({});
  console.log('  ✓ WarehouseLocation');

  await prisma.warehouseMovement.deleteMany({});
  console.log('  ✓ WarehouseMovement');

  // ── 2. Mid-level: tables that reference the leaf parents above ───────────
  // Transaction has a unique FK → Order; must go before Order
  await prisma.transaction.deleteMany({});
  console.log('  ✓ Transaction');

  // Exchange references Order
  await prisma.exchange.deleteMany({});
  console.log('  ✓ Exchange');

  // Orders reference User (cashier) and Customer
  await prisma.order.deleteMany({});
  console.log('  ✓ Order');

  await prisma.purchaseOrder.deleteMany({});
  console.log('  ✓ PurchaseOrder');

  await prisma.productionOrder.deleteMany({});
  console.log('  ✓ ProductionOrder');

  await prisma.stockTransfer.deleteMany({});
  console.log('  ✓ StockTransfer');

  await prisma.warehouse.deleteMany({});
  console.log('  ✓ Warehouse');

  await prisma.stock.deleteMany({});
  console.log('  ✓ Stock');

  await prisma.payrollRecord.deleteMany({});
  console.log('  ✓ PayrollRecord');

  await prisma.setting.deleteMany({});
  console.log('  ✓ Setting');

  await prisma.subscription.deleteMany({});
  console.log('  ✓ Subscription');

  // ── 3. Core domain entities ──────────────────────────────────────────────
  // Employee references User; delete before User
  await prisma.employee.deleteMany({});
  console.log('  ✓ Employee');

  // Product references Category and Subcategory; delete before both
  await prisma.product.deleteMany({});
  console.log('  ✓ Product');

  // Subcategory references Category; delete before Category
  await prisma.subcategory.deleteMany({});
  console.log('  ✓ Subcategory');

  await prisma.category.deleteMany({});
  console.log('  ✓ Category');

  await prisma.customer.deleteMany({});
  console.log('  ✓ Customer');

  await prisma.supplier.deleteMany({});
  console.log('  ✓ Supplier');

  // ── 4. Root tables ───────────────────────────────────────────────────────
  // User references Branch; delete before Branch
  await prisma.user.deleteMany({});
  console.log('  ✓ User');

  // Branch is the tenant root
  await prisma.branch.deleteMany({});
  console.log('  ✓ Branch');

  // Plan is a standalone config table
  await prisma.plan.deleteMany({});
  console.log('  ✓ Plan');

  console.log('\n✅ Database reset complete — all tables are empty.');
  console.log('   Run `npm run db:seed` to populate with fresh development data.');
}

resetDatabase()
  .catch((err) => {
    console.error('❌ Reset failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
