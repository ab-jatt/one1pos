console.log('🚀 Running seed script...');

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Return a date that is `daysAgo` days before now, at the given hour (UTC). */
function daysBack(daysAgo: number, hour = 12): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return d;
}

/** Pick a random integer in [min, max]. */
function rnd(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Pick `n` unique random indices from [0, len). */
function pickIndices(n: number, len: number): number[] {
  const pool = Array.from({ length: len }, (_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

// ─── Order-number counter ─────────────────────────────────────────────────────
let orderSeq = 1;
function nextOrderNumber(): string {
  return `ORD-${String(orderSeq++).padStart(6, '0')}`;
}

async function main() {
  // ─── 0. Clear ALL tables in safe dependency order ──────────────────────────
  console.log('🧹 Clearing existing data...');
  await prisma.auditLog.deleteMany({});
  await prisma.productionOrderItem.deleteMany({});
  await prisma.productionOrder.deleteMany({});
  await prisma.stockTransferItem.deleteMany({});
  await prisma.stockTransfer.deleteMany({});
  await prisma.warehouseMovement.deleteMany({});
  await prisma.warehouseLocation.deleteMany({});
  await prisma.warehouse.deleteMany({});
  await prisma.payrollItem.deleteMany({});
  await prisma.payrollRecord.deleteMany({});
  await prisma.purchaseOrderItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.exchangeIssuedItem.deleteMany({});
  await prisma.exchangeReturnItem.deleteMany({});
  await prisma.exchange.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.stock.deleteMany({});
  await prisma.customerLedger.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.shift.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.branch.deleteMany({});
  await prisma.setting.deleteMany({});
  console.log('✅ Tables cleared');

  // ─── 1. Branch ────────────────────────────────────────────────────────────
  const branch = await prisma.branch.create({
    data: {
      id: 'main-branch-id',
      name: 'Main Branch',
      address: '123 Main Street, Downtown',
      phone: '+1-555-0100',
      currency: 'USD',
      taxRate: 0.08,
    },
  });
  console.log('✅ Branch created');

  // ─── 2. Users ─────────────────────────────────────────────────────────────
  const adminHash   = await bcrypt.hash('admin123', 10);
  const cashierHash = await bcrypt.hash('cashier123', 10);

  const adminUser = await prisma.user.create({
    data: {
      id: 'admin-user-id',
      email: 'admin@nexuspos.com',
      password: adminHash,
      name: 'System Admin',
      role: 'OWNER',
      permissions: ['all'],
      branchId: branch.id,
    },
  });

  const cashierUser = await prisma.user.create({
    data: {
      id: 'cashier-user-id',
      email: 'cashier@nexuspos.com',
      password: cashierHash,
      name: 'John Cashier',
      role: 'CASHIER',
      permissions: ['pos', 'inventory.view'],
      branchId: branch.id,
    },
  });

  const cashierUser2 = await prisma.user.create({
    data: {
      email: 'cashier2@nexuspos.com',
      password: cashierHash,
      name: 'Maria Lopez',
      role: 'CASHIER',
      permissions: ['pos'],
      branchId: branch.id,
    },
  });
  console.log('✅ Users created (admin@nexuspos.com / admin123, cashier@nexuspos.com / cashier123)');

  // ─── 3. Categories ────────────────────────────────────────────────────────
  const beverages  = await prisma.category.create({ data: { name: 'Beverages',   branchId: branch.id } });
  const snacks     = await prisma.category.create({ data: { name: 'Snacks',      branchId: branch.id } });
  const bakery     = await prisma.category.create({ data: { name: 'Bakery',      branchId: branch.id } });
  const electronics = await prisma.category.create({ data: { name: 'Electronics', branchId: branch.id } });
  const dairy      = await prisma.category.create({ data: { name: 'Dairy',       branchId: branch.id } });
  console.log('✅ Categories created');

  // ─── 4. Products ─────────────────────────────────────────────────────────
  //  [name, sku, price, costPrice, categoryId]
  const productDefs = [
    // Beverages (0-4)
    { name: 'Espresso',        sku: 'SKU-ESP-001', productCode: 'PRD-000001', barcode: '4006381333931', price: 3.50,  costPrice: 1.20, categoryId: beverages.id,   image: 'https://picsum.photos/seed/espresso/200/200' },
    { name: 'Cappuccino',      sku: 'SKU-CAP-002', productCode: 'PRD-000002', barcode: '4006381333932', price: 4.50,  costPrice: 1.50, categoryId: beverages.id,   image: 'https://picsum.photos/seed/cappuccino/200/200' },
    { name: 'Latte',           sku: 'SKU-LAT-003', productCode: 'PRD-000003', barcode: '4006381333933', price: 4.75,  costPrice: 1.60, categoryId: beverages.id,   image: 'https://picsum.photos/seed/latte/200/200' },
    { name: 'Orange Juice',    sku: 'SKU-OJ-006',  productCode: 'PRD-000004', barcode: '4006381333934', price: 4.00,  costPrice: 1.20, categoryId: beverages.id,   image: 'https://picsum.photos/seed/orangejuice/200/200' },
    { name: 'Iced Tea',        sku: 'SKU-ICT-013', productCode: 'PRD-000005', barcode: '4006381333935', price: 3.25,  costPrice: 0.90, categoryId: beverages.id,   image: 'https://picsum.photos/seed/icedtea/200/200' },
    // Bakery (5-7)
    { name: 'Croissant',       sku: 'SKU-CRO-004', productCode: 'PRD-000006', barcode: '4006381333936', price: 3.00,  costPrice: 1.00, categoryId: bakery.id,      image: 'https://picsum.photos/seed/croissant/200/200' },
    { name: 'Blueberry Muffin',sku: 'SKU-MUF-007', productCode: 'PRD-000007', barcode: '4006381333937', price: 3.25,  costPrice: 1.10, categoryId: bakery.id,      image: 'https://picsum.photos/seed/muffin/200/200' },
    { name: 'Cheese Danish',   sku: 'SKU-DAN-008', productCode: 'PRD-000008', barcode: '4006381333938', price: 3.50,  costPrice: 1.15, categoryId: bakery.id,      image: 'https://picsum.photos/seed/danish/200/200' },
    // Snacks (8-9)
    { name: 'Chocolate Chip Cookie', sku: 'SKU-COO-005', productCode: 'PRD-000009', barcode: '4006381333939', price: 2.50, costPrice: 0.80, categoryId: snacks.id, image: 'https://picsum.photos/seed/cookie/200/200' },
    { name: 'Potato Chips',    sku: 'SKU-CHP-009', productCode: 'PRD-000010', barcode: '4006381333940', price: 2.00,  costPrice: 0.60, categoryId: snacks.id,      image: 'https://picsum.photos/seed/chips/200/200' },
    // Dairy (10)
    { name: 'Whole Milk 1L',   sku: 'SKU-MLK-010', productCode: 'PRD-000011', barcode: '4006381333941', price: 3.50,  costPrice: 2.00, categoryId: dairy.id,       image: 'https://picsum.photos/seed/milk/200/200' },
    // Electronics (11-12)
    { name: 'USB-C Cable',     sku: 'SKU-USB-011', productCode: 'PRD-000012', barcode: '4006381333942', price: 12.99, costPrice: 4.50, categoryId: electronics.id, image: 'https://picsum.photos/seed/usbcable/200/200' },
    { name: 'Wireless Earbuds',sku: 'SKU-EAR-012', productCode: 'PRD-000013', barcode: '4006381333943', price: 29.99, costPrice: 12.00, categoryId: electronics.id, image: 'https://picsum.photos/seed/earbuds/200/200' },
  ];

  const products = await Promise.all(
    productDefs.map((d) =>
      prisma.product.create({
        data: {
          name:        d.name,
          sku:         d.sku,
          productCode: d.productCode,
          barcode:     d.barcode,
          price:       d.price,
          costPrice:   d.costPrice,
          categoryId:  d.categoryId,
          image:       d.image,
        },
      })
    )
  );
  console.log('✅ Products created');

  // ─── 5. Stock ─────────────────────────────────────────────────────────────
  // Stagger quantities so stock-distribution chart is varied
  const stockQtys = [120, 95, 85, 70, 110, 60, 55, 40, 90, 130, 45, 30, 20];
  await Promise.all(
    products.map((p, i) =>
      prisma.stock.create({
        data: {
          branchId:  branch.id,
          productId: p.id,
          quantity:  stockQtys[i] ?? 50,
          minStock:  10,
        },
      })
    )
  );
  console.log('✅ Stock created');

  // ─── 6. Customers ─────────────────────────────────────────────────────────
  const customers = await Promise.all([
    prisma.customer.create({ data: { name: 'John Doe',      email: 'john@example.com',    phone: '+1-555-0101', points: 150,  balance: 0 } }),
    prisma.customer.create({ data: { name: 'Jane Smith',    email: 'jane@example.com',    phone: '+1-555-0102', points: 200,  balance: 25.50 } }),
    prisma.customer.create({ data: { name: 'Bob Wilson',    email: 'bob@example.com',     phone: '+1-555-0103', points: 75,   balance: 0 } }),
    prisma.customer.create({ data: { name: 'Alice Johnson', email: 'alice@example.com',   phone: '+1-555-0104', points: 320,  balance: 50.00 } }),
    prisma.customer.create({ data: { name: 'Charlie Brown', email: 'charlie@example.com', phone: '+1-555-0105', points: 45,   balance: 0 } }),
  ]);
  console.log('✅ Customers created');

  // ─── 7. Suppliers ─────────────────────────────────────────────────────────
  const suppliers = await Promise.all([
    prisma.supplier.create({ data: { name: 'Coffee Beans Co.',       contactPerson: 'Mike Johnson',  email: 'sales@coffeebeans.com',    phone: '+1-555-0200', paymentTerms: 'Net 30' } }),
    prisma.supplier.create({ data: { name: 'Bakery Supplies Inc.',   contactPerson: 'Sarah Lee',     email: 'orders@bakerysupplies.com',phone: '+1-555-0201', paymentTerms: 'Net 15' } }),
    prisma.supplier.create({ data: { name: 'Tech Gadgets Wholesale', contactPerson: 'David Chen',    email: 'wholesale@techgadgets.com',phone: '+1-555-0202', paymentTerms: 'Net 45' } }),
    prisma.supplier.create({ data: { name: 'Fresh Dairy Farms',      contactPerson: 'Emma Wilson',   email: 'orders@freshdairy.com',    phone: '+1-555-0203', paymentTerms: 'Due on Receipt' } }),
  ]);
  console.log('✅ Suppliers created');

  // ─── 8. Employees ─────────────────────────────────────────────────────────
  const empUsers = await Promise.all([
    prisma.user.create({ data: { email: 'emily@nexuspos.com',   password: 'x', name: 'Emily Davis',     role: 'MANAGER', permissions: ['all'], branchId: branch.id } }),
    prisma.user.create({ data: { email: 'michael@nexuspos.com', password: 'x', name: 'Michael Chen',    role: 'CASHIER', permissions: ['pos', 'inventory.view'], branchId: branch.id } }),
    prisma.user.create({ data: { email: 'sarah@nexuspos.com',   password: 'x', name: 'Sarah Thompson',  role: 'CASHIER', permissions: ['pos'], branchId: branch.id } }),
    prisma.user.create({ data: { email: 'james@nexuspos.com',   password: 'x', name: 'James Rodriguez', role: 'MANAGER', permissions: ['inventory', 'reports'], branchId: branch.id } }),
    prisma.user.create({ data: { email: 'lisa@nexuspos.com',    password: 'x', name: 'Lisa Park',       role: 'CASHIER', permissions: ['pos'], branchId: branch.id } }),
  ]);

  const employees = await Promise.all([
    prisma.employee.create({ data: { userId: empUsers[0].id, department: 'Management', position: 'Store Manager',     salary: 5500, status: 'ACTIVE',    joinDate: new Date('2024-01-15') } }),
    prisma.employee.create({ data: { userId: empUsers[1].id, department: 'Sales',      position: 'Senior Cashier',    salary: 3200, status: 'ACTIVE',    joinDate: new Date('2024-03-20') } }),
    prisma.employee.create({ data: { userId: empUsers[2].id, department: 'Sales',      position: 'Cashier',           salary: 2800, status: 'ACTIVE',    joinDate: new Date('2024-06-01') } }),
    prisma.employee.create({ data: { userId: empUsers[3].id, department: 'Operations', position: 'Inventory Manager', salary: 4200, status: 'ACTIVE',    joinDate: new Date('2024-02-10') } }),
    prisma.employee.create({ data: { userId: empUsers[4].id, department: 'Sales',      position: 'Cashier',           salary: 2800, status: 'ON_LEAVE',  joinDate: new Date('2024-08-15') } }),
  ]);
  console.log('✅ Employees created');

  // ─── 9. Orders – 60 orders spread across last 30 days ────────────────────
  //  Cashiers and customers to rotate through
  const cashierIds  = [cashierUser.id, cashierUser2.id];
  const customerIds = [null, ...customers.map((c) => c.id)]; // null = walk-in

  // Template order "recipes": arrays of [productIndex, quantity]
  const recipes: [number, number][][] = [
    [[0, 2], [5, 1]],                          // 2× Espresso + Croissant
    [[1, 1], [6, 1], [8, 1]],                  // Cappuccino + Muffin + Cookie
    [[2, 1], [7, 1]],                          // Latte + Cheese Danish
    [[3, 2], [9, 2]],                          // 2× OJ + 2× Chips
    [[11, 1]],                                 // USB-C Cable only
    [[12, 1], [1, 1]],                         // Earbuds + Cappuccino
    [[0, 1], [4, 1], [8, 2]],                  // Espresso + Iced Tea + 2× Cookie
    [[5, 2], [6, 1], [3, 1]],                  // 2× Croissant + Muffin + OJ
    [[10, 2]],                                 // 2× Whole Milk
    [[1, 2], [2, 1], [7, 1]],                  // 2× Cappuccino + Latte + Danish
    [[0, 3], [9, 1]],                          // 3× Espresso + Chips
    [[3, 1], [4, 2], [5, 1], [8, 1]],          // OJ + 2× Iced Tea + Croissant + Cookie
    [[11, 2], [9, 3]],                         // 2× USB-C + 3× Chips
    [[2, 2], [6, 2]],                          // 2× Latte + 2× Muffin
    [[0, 1], [1, 1], [2, 1]],                  // 1 of each coffee
  ];

  // Distribute 60 orders: 1-3 per day over 30 days (older days slightly fewer)
  const orderDates: { daysAgo: number; hour: number }[] = [];
  for (let day = 0; day <= 29; day++) {
    const count = day < 5 ? rnd(1, 3) : rnd(2, 4); // recent days busier
    for (let k = 0; k < count; k++) {
      orderDates.push({ daysAgo: day, hour: rnd(8, 20) });
    }
  }

  const PAYMENT_METHODS: ('CASH' | 'CARD' | 'WALLET')[] = ['CASH', 'CARD', 'WALLET'];

  for (const { daysAgo, hour } of orderDates) {
    const recipe  = recipes[rnd(0, recipes.length - 1)];
    const cashier = cashierIds[rnd(0, cashierIds.length - 1)];
    const custId  = customerIds[rnd(0, customerIds.length - 1)];
    const pm      = PAYMENT_METHODS[rnd(0, 2)];
    const taxRate = 0.08;
    const discount = rnd(0, 10) > 8 ? rnd(1, 5) : 0; // ~10% chance of a discount

    let subtotal = 0;
    const items = recipe.map(([pi, qty]) => {
      const prod = products[pi];
      const lineTotal = Number(prod.price) * qty;
      subtotal += lineTotal;
      return { productId: prod.id, quantity: qty, price: Number(prod.price), cost: Number(prod.costPrice) };
    });

    const tax   = Math.round(subtotal * taxRate * 100) / 100;
    const total = Math.round((subtotal + tax - discount) * 100) / 100;
    const ts    = daysBack(daysAgo, hour);

    await prisma.order.create({
      data: {
        orderNumber: nextOrderNumber(),
        cashierId:   cashier,
        branchId:    branch.id,
        customerId:  custId,
        status:      'COMPLETED',
        subtotal,
        tax,
        discount,
        total,
        createdAt:   ts,
        updatedAt:   ts,
        items:    { create: items },
        payments: { create: { method: pm, amount: total, processedAt: ts } },
      },
    });
  }
  console.log(`✅ ${orderDates.length} orders created (spread over last 30 days)`);

  // ─── 10. Transactions (INCOME + EXPENSE) over last 30 days ───────────────
  const txns: {
    description: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    category: string;
    daysAgo: number;
  }[] = [
    // Regular monthly expenses
    { description: 'Rent Payment',               amount: 2500, type: 'EXPENSE', category: 'Rent',      daysAgo: 28 },
    { description: 'Employee Payroll',           amount: 4500, type: 'EXPENSE', category: 'Payroll',   daysAgo: 27 },
    { description: 'Utility Bills – Electricity',amount: 350,  type: 'EXPENSE', category: 'Utilities', daysAgo: 26 },
    { description: 'Internet & Phone',           amount: 120,  type: 'EXPENSE', category: 'Utilities', daysAgo: 25 },
    { description: 'Coffee Beans Restock',       amount: 800,  type: 'EXPENSE', category: 'Inventory', daysAgo: 24 },
    { description: 'Bakery Supplies Restock',    amount: 450,  type: 'EXPENSE', category: 'Inventory', daysAgo: 22 },
    { description: 'Cleaning Supplies',          amount: 85,   type: 'EXPENSE', category: 'Operations',daysAgo: 20 },
    { description: 'POS Software Subscription', amount: 99,   type: 'EXPENSE', category: 'Software',  daysAgo: 18 },
    { description: 'Tech Gadgets Restock',       amount: 600,  type: 'EXPENSE', category: 'Inventory', daysAgo: 16 },
    { description: 'Marketing – Social Ads',     amount: 200,  type: 'EXPENSE', category: 'Marketing', daysAgo: 14 },
    { description: 'Dairy Restock',              amount: 180,  type: 'EXPENSE', category: 'Inventory', daysAgo: 12 },
    { description: 'Part-time Staff Pay',        amount: 900,  type: 'EXPENSE', category: 'Payroll',   daysAgo: 10 },
    { description: 'Equipment Maintenance',      amount: 250,  type: 'EXPENSE', category: 'Operations',daysAgo: 8 },
    { description: 'Water & Waste Services',     amount: 75,   type: 'EXPENSE', category: 'Utilities', daysAgo: 6 },
    { description: 'Coffee Beans Mid-month',     amount: 400,  type: 'EXPENSE', category: 'Inventory', daysAgo: 4 },
    { description: 'Insurance Premium',          amount: 320,  type: 'EXPENSE', category: 'Insurance', daysAgo: 2 },
    // Income entries (supplement to POS orders)
    { description: 'Catering Event Revenue',     amount: 850,  type: 'INCOME',  category: 'Catering',  daysAgo: 21 },
    { description: 'Corporate Order – TechCo',  amount: 520,  type: 'INCOME',  category: 'B2B Sales', daysAgo: 15 },
    { description: 'Gift Card Sales',            amount: 300,  type: 'INCOME',  category: 'Gift Cards',daysAgo: 9 },
    { description: 'Weekend Event Revenue',      amount: 1200, type: 'INCOME',  category: 'Events',    daysAgo: 3 },
  ];

  await Promise.all(
    txns.map((t) => {
      const d = daysBack(t.daysAgo);
      return prisma.transaction.create({
        data: {
          description: t.description,
          amount:      t.amount,
          type:        t.type,
          category:    t.category,
          date:        d,
          branchId:    branch.id,
        },
      });
    })
  );
  console.log('✅ Transactions created');

  // ─── 11. Purchase Orders ──────────────────────────────────────────────────
  await Promise.all([
    prisma.purchaseOrder.create({
      data: {
        supplierId: suppliers[0].id, branchId: branch.id, status: 'RECEIVED', total: 430,
        items: { create: [
          { productId: products[0].id, quantity: 100, cost: 1.20 },
          { productId: products[1].id, quantity: 100, cost: 1.50 },
          { productId: products[2].id, quantity: 100, cost: 1.60 },
        ]},
      },
    }),
    prisma.purchaseOrder.create({
      data: {
        supplierId: suppliers[1].id, branchId: branch.id, status: 'PENDING', total: 320,
        items: { create: [
          { productId: products[5].id, quantity: 150, cost: 1.00 },
          { productId: products[6].id, quantity: 100, cost: 1.10 },
          { productId: products[7].id, quantity:  50, cost: 1.15 },
        ]},
      },
    }),
    prisma.purchaseOrder.create({
      data: {
        supplierId: suppliers[2].id, branchId: branch.id, status: 'PENDING', total: 825,
        items: { create: [
          { productId: products[11].id, quantity: 50, cost: 4.50 },
          { productId: products[12].id, quantity: 50, cost: 12.00 },
        ]},
      },
    }),
  ]);
  console.log('✅ Purchase orders created');

  // ─── 12. Audit Logs ───────────────────────────────────────────────────────
  await Promise.all([
    prisma.auditLog.create({ data: { userId: adminUser.id,  action: 'User Login',     module: 'Authentication', details: 'Admin logged in',                  ipAddress: '192.168.1.100' } }),
    prisma.auditLog.create({ data: { userId: cashierUser.id,action: 'Order Created',  module: 'POS',            details: 'Created first seeded order',        ipAddress: '192.168.1.101' } }),
    prisma.auditLog.create({ data: { userId: adminUser.id,  action: 'Product Added',  module: 'Inventory',      details: 'Added Wireless Earbuds to catalogue',ipAddress: '192.168.1.100' } }),
    prisma.auditLog.create({ data: { userId: adminUser.id,  action: 'Employee Added', module: 'HR',             details: 'Onboarded Sarah Thompson',          ipAddress: '192.168.1.100' } }),
  ]);
  console.log('✅ Audit logs created');

  // ─── 13. Settings ─────────────────────────────────────────────────────────
  await Promise.all([
    prisma.setting.create({ data: { key: 'tax_rate',     value: '0.08' } }),
    prisma.setting.create({ data: { key: 'currency',     value: 'USD' } }),
    prisma.setting.create({ data: { key: 'app_name',     value: 'Nexus POS' } }),
    prisma.setting.create({ data: { key: 'timezone',     value: 'America/New_York' } }),
  ]);
  console.log('✅ Settings created');

  console.log('');
  console.log('🎉 Seed complete!');
  console.log(`   Branch   : ${branch.name}`);
  console.log(`   Products : ${products.length}`);
  console.log(`   Customers: ${customers.length}`);
  console.log(`   Orders   : ${orderDates.length} (last 30 days)`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
