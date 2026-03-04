
console.log("🚀 Running seed script...");

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  console.log('🧹 Clearing existing data...');
  await prisma.auditLog.deleteMany({});
  await prisma.purchaseOrderItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.customerLedger.deleteMany({}); // Add this to fix foreign key constraint
  await prisma.stock.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.shift.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.branch.deleteMany({});

  // 1️⃣ Create a branch
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

  // 2️⃣ Create users
  const adminUser = await prisma.user.create({
    data: {
      id: 'admin-user-id',
      email: 'admin@nexuspos.com',
      password: 'hashed_password_123',
      name: 'System Admin',
      role: 'ADMIN',
      permissions: ['all'],
      branchId: branch.id,
    },
  });

  const cashierUser = await prisma.user.create({
    data: {
      id: 'cashier-user-id',
      email: 'cashier@nexuspos.com',
      password: 'hashed_password_456',
      name: 'John Cashier',
      role: 'CASHIER',
      permissions: ['pos', 'inventory.view'],
      branchId: branch.id,
    },
  });
  console.log('✅ Users created');

  // 3️⃣ Create categories
  const beverages = await prisma.category.create({
    data: { name: 'Beverages' },
  });

  const snacks = await prisma.category.create({
    data: { name: 'Snacks' },
  });

  const bakery = await prisma.category.create({
    data: { name: 'Bakery' },
  });

  const electronics = await prisma.category.create({
    data: { name: 'Electronics' },
  });

  const dairy = await prisma.category.create({
    data: { name: 'Dairy' },
  });
  console.log('✅ Categories created');

  // 4️⃣ Create products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Espresso',
        sku: 'SKU-ESP-001',
        description: 'Rich Italian espresso',
        price: 3.50,
        costPrice: 1.20,
        categoryId: beverages.id,
        image: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=200',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Cappuccino',
        sku: 'SKU-CAP-002',
        description: 'Classic cappuccino with foam',
        price: 4.50,
        costPrice: 1.50,
        categoryId: beverages.id,
        image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=200',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Latte',
        sku: 'SKU-LAT-003',
        description: 'Smooth caffe latte',
        price: 4.75,
        costPrice: 1.60,
        categoryId: beverages.id,
        image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=200',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Croissant',
        sku: 'SKU-CRO-004',
        description: 'Buttery French croissant',
        price: 3.00,
        costPrice: 1.00,
        categoryId: bakery.id,
        image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=200',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Chocolate Chip Cookie',
        sku: 'SKU-COO-005',
        description: 'Freshly baked cookie',
        price: 2.50,
        costPrice: 0.80,
        categoryId: snacks.id,
        image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=200',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Orange Juice',
        sku: 'SKU-OJ-006',
        description: 'Fresh squeezed orange juice',
        price: 4.00,
        costPrice: 1.20,
        categoryId: beverages.id,
        image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=200',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Blueberry Muffin',
        sku: 'SKU-MUF-007',
        description: 'Fresh blueberry muffin',
        price: 3.25,
        costPrice: 1.10,
        categoryId: bakery.id,
        image: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=200',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Cheese Danish',
        sku: 'SKU-DAN-008',
        description: 'Cream cheese danish pastry',
        price: 3.50,
        costPrice: 1.15,
        categoryId: bakery.id,
        image: 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=200',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Potato Chips',
        sku: 'SKU-CHP-009',
        description: 'Classic salted chips',
        price: 2.00,
        costPrice: 0.60,
        categoryId: snacks.id,
        image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=200',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Whole Milk',
        sku: 'SKU-MLK-010',
        description: 'Fresh whole milk 1L',
        price: 3.50,
        costPrice: 2.00,
        categoryId: dairy.id,
        image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200',
      },
    }),
    prisma.product.create({
      data: {
        name: 'USB-C Cable',
        sku: 'SKU-USB-011',
        description: 'Fast charging USB-C cable',
        price: 12.99,
        costPrice: 4.50,
        categoryId: electronics.id,
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Wireless Earbuds',
        sku: 'SKU-EAR-012',
        description: 'Bluetooth wireless earbuds',
        price: 29.99,
        costPrice: 12.00,
        categoryId: electronics.id,
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200',
      },
    }),
  ]);
  console.log('✅ Products created');

  // 4️⃣ Create stock for each product
  await Promise.all(
    products.map((product, index) =>
      prisma.stock.create({
        data: {
          branchId: branch.id,
          productId: product.id,
          quantity: 50 + index * 10,
          minStock: 10,
        },
      })
    )
  );
  console.log('✅ Stock created');

  // 6️⃣ Create customers
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-0101',
        points: 150,
        balance: 0,
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        phone: '+1-555-0102',
        points: 200,
        balance: 25.50,
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Bob Wilson',
        email: 'bob.wilson@example.com',
        phone: '+1-555-0103',
        points: 75,
        balance: 0,
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Alice Johnson',
        email: 'alice.johnson@example.com',
        phone: '+1-555-0104',
        points: 320,
        balance: 50.00,
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Charlie Brown',
        email: 'charlie.brown@example.com',
        phone: '+1-555-0105',
        points: 45,
        balance: 0,
      },
    }),
  ]);
  console.log('✅ Customers created');

  // 7️⃣ Create suppliers
  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        name: 'Coffee Beans Co.',
        contactPerson: 'Mike Johnson',
        email: 'sales@coffeebeans.com',
        phone: '+1-555-0200',
        address: '456 Supply Ave, Warehouse District',
        paymentTerms: 'Net 30',
      },
    }),
    prisma.supplier.create({
      data: {
        name: 'Bakery Supplies Inc.',
        contactPerson: 'Sarah Lee',
        email: 'orders@bakerysupplies.com',
        phone: '+1-555-0201',
        address: '789 Flour Street, Industrial Park',
        paymentTerms: 'Net 15',
      },
    }),
    prisma.supplier.create({
      data: {
        name: 'Tech Gadgets Wholesale',
        contactPerson: 'David Chen',
        email: 'wholesale@techgadgets.com',
        phone: '+1-555-0202',
        address: '321 Silicon Way, Tech Hub',
        paymentTerms: 'Net 45',
      },
    }),
    prisma.supplier.create({
      data: {
        name: 'Fresh Dairy Farms',
        contactPerson: 'Emma Wilson',
        email: 'orders@freshdairy.com',
        phone: '+1-555-0203',
        address: '555 Farm Road, Countryside',
        paymentTerms: 'Due on Receipt',
      },
    }),
  ]);
  console.log('✅ Suppliers created');

  // 8️⃣ Create employees (linked to Users)
  const employeeUser1 = await prisma.user.create({
    data: {
      email: 'emily.davis@nexuspos.com',
      password: 'hashed_password_emp1',
      name: 'Emily Davis',
      role: 'MANAGER',
      permissions: ['all'],
      branchId: branch.id,
    },
  });

  const employeeUser2 = await prisma.user.create({
    data: {
      email: 'michael.chen@nexuspos.com',
      password: 'hashed_password_emp2',
      name: 'Michael Chen',
      role: 'CASHIER',
      permissions: ['pos', 'inventory.view'],
      branchId: branch.id,
    },
  });

  const employeeUser3 = await prisma.user.create({
    data: {
      email: 'sarah.thompson@nexuspos.com',
      password: 'hashed_password_emp3',
      name: 'Sarah Thompson',
      role: 'CASHIER',
      permissions: ['pos'],
      branchId: branch.id,
    },
  });

  const employeeUser4 = await prisma.user.create({
    data: {
      email: 'james.rodriguez@nexuspos.com',
      password: 'hashed_password_emp4',
      name: 'James Rodriguez',
      role: 'MANAGER',
      permissions: ['inventory', 'products', 'reports'],
      branchId: branch.id,
    },
  });

  const employeeUser5 = await prisma.user.create({
    data: {
      email: 'lisa.park@nexuspos.com',
      password: 'hashed_password_emp5',
      name: 'Lisa Park',
      role: 'CASHIER',
      permissions: ['pos'],
      branchId: branch.id,
    },
  });

  const employees = await Promise.all([
    prisma.employee.create({
      data: {
        userId: employeeUser1.id,
        position: 'Store Manager',
        department: 'Management',
        salary: 5500,
        status: 'ACTIVE',
        joinDate: new Date('2024-01-15'),
      },
    }),
    prisma.employee.create({
      data: {
        userId: employeeUser2.id,
        position: 'Senior Cashier',
        department: 'Sales',
        salary: 3200,
        status: 'ACTIVE',
        joinDate: new Date('2024-03-20'),
      },
    }),
    prisma.employee.create({
      data: {
        userId: employeeUser3.id,
        position: 'Cashier',
        department: 'Sales',
        salary: 2800,
        status: 'ACTIVE',
        joinDate: new Date('2024-06-01'),
      },
    }),
    prisma.employee.create({
      data: {
        userId: employeeUser4.id,
        position: 'Inventory Manager',
        department: 'Operations',
        salary: 4200,
        status: 'ACTIVE',
        joinDate: new Date('2024-02-10'),
      },
    }),
    prisma.employee.create({
      data: {
        userId: employeeUser5.id,
        position: 'Cashier',
        department: 'Sales',
        salary: 2800,
        status: 'ON_LEAVE',
        joinDate: new Date('2024-08-15'),
      },
    }),
  ]);
  console.log('✅ Employees created');

  // 8️⃣.5️⃣ Create shifts for employees
  const shifts = await Promise.all([
    prisma.shift.create({
      data: {
        employeeId: employees[0].id,
        startTime: new Date('2026-01-06T08:00:00'),
        endTime: new Date('2026-01-06T16:00:00'),
        type: 'Morning',
      },
    }),
    prisma.shift.create({
      data: {
        employeeId: employees[0].id,
        startTime: new Date('2026-01-07T08:00:00'),
        endTime: new Date('2026-01-07T16:00:00'),
        type: 'Morning',
      },
    }),
    prisma.shift.create({
      data: {
        employeeId: employees[1].id,
        startTime: new Date('2026-01-06T14:00:00'),
        endTime: new Date('2026-01-06T22:00:00'),
        type: 'Evening',
      },
    }),
    prisma.shift.create({
      data: {
        employeeId: employees[2].id,
        startTime: new Date('2026-01-06T10:00:00'),
        endTime: new Date('2026-01-06T18:00:00'),
        type: 'Afternoon',
      },
    }),
  ]);
  console.log('✅ Shifts created');

  // 9️⃣ Create some sample orders
  const order1 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-000001',
      customerId: customers[0].id,
      cashierId: cashierUser.id,
      branchId: branch.id,
      status: 'COMPLETED',
      subtotal: 12.00,
      tax: 0.96,
      discount: 0,
      total: 12.96,
      items: {
        create: [
          { productId: products[0].id, quantity: 2, price: 3.50, cost: 1.20 },
          { productId: products[3].id, quantity: 1, price: 3.00, cost: 1.00 },
          { productId: products[4].id, quantity: 1, price: 2.50, cost: 0.80 },
        ],
      },
      payments: {
        create: { method: 'CASH', amount: 12.96 },
      },
    },
  });

  const order2 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-000002',
      customerId: customers[1].id,
      cashierId: cashierUser.id,
      branchId: branch.id,
      status: 'COMPLETED',
      subtotal: 42.98,
      tax: 3.44,
      discount: 5.00,
      total: 41.42,
      items: {
        create: [
          { productId: products[10].id, quantity: 1, price: 12.99, cost: 4.50 },
          { productId: products[11].id, quantity: 1, price: 29.99, cost: 12.00 },
        ],
      },
      payments: {
        create: { method: 'CARD', amount: 41.42 },
      },
    },
  });

  const order3 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-000003',
      cashierId: cashierUser.id,
      branchId: branch.id,
      status: 'COMPLETED',
      subtotal: 8.25,
      tax: 0.66,
      discount: 0,
      total: 8.91,
      items: {
        create: [
          { productId: products[1].id, quantity: 1, price: 4.50, cost: 1.50 },
          { productId: products[6].id, quantity: 1, price: 3.25, cost: 1.10 },
          { productId: products[4].id, quantity: 1, price: 2.50, cost: 0.80 },
        ],
      },
      payments: {
        create: { method: 'WALLET', amount: 8.91 },
      },
    },
  });
  console.log('✅ Orders created');

  // 🔟 Create transactions for accounting
  await Promise.all([
    prisma.transaction.create({
      data: {
        description: 'Daily Sales Revenue',
        amount: 1250.00,
        type: 'INCOME',
        category: 'Sales',
        date: new Date('2026-01-05'),
        branchId: branch.id,
      },
    }),
    prisma.transaction.create({
      data: {
        description: 'Rent Payment - January',
        amount: 2500.00,
        type: 'EXPENSE',
        category: 'Rent',
        date: new Date('2026-01-01'),
        branchId: branch.id,
      },
    }),
    prisma.transaction.create({
      data: {
        description: 'Utility Bills',
        amount: 350.00,
        type: 'EXPENSE',
        category: 'Utilities',
        date: new Date('2026-01-03'),
        branchId: branch.id,
      },
    }),
    prisma.transaction.create({
      data: {
        description: 'Inventory Purchase - Coffee Beans',
        amount: 800.00,
        type: 'EXPENSE',
        category: 'Inventory',
        date: new Date('2026-01-04'),
        branchId: branch.id,
      },
    }),
    prisma.transaction.create({
      data: {
        description: 'Weekend Sales Revenue',
        amount: 2100.00,
        type: 'INCOME',
        category: 'Sales',
        date: new Date('2026-01-04'),
        branchId: branch.id,
      },
    }),
    prisma.transaction.create({
      data: {
        description: 'Employee Payroll',
        amount: 4500.00,
        type: 'EXPENSE',
        category: 'Payroll',
        date: new Date('2026-01-01'),
        branchId: branch.id,
      },
    }),
    prisma.transaction.create({
      data: {
        description: 'Online Order Revenue',
        amount: 450.00,
        type: 'INCOME',
        category: 'Sales',
        date: new Date('2026-01-06'),
        branchId: branch.id,
      },
    }),
  ]);
  console.log('✅ Transactions created');

  // 1️⃣1️⃣ Create purchase orders
  await prisma.purchaseOrder.create({
    data: {
      supplierId: suppliers[0].id,
      branchId: branch.id,
      status: 'RECEIVED',
      total: 450.00,
      items: {
        create: [
          { productId: products[0].id, quantity: 100, cost: 1.20 },
          { productId: products[1].id, quantity: 100, cost: 1.50 },
          { productId: products[2].id, quantity: 100, cost: 1.60 },
        ],
      },
    },
  });

  await prisma.purchaseOrder.create({
    data: {
      supplierId: suppliers[1].id,
      branchId: branch.id,
      status: 'PENDING',
      total: 325.00,
      items: {
        create: [
          { productId: products[3].id, quantity: 150, cost: 1.00 },
          { productId: products[6].id, quantity: 100, cost: 1.10 },
          { productId: products[7].id, quantity: 50, cost: 1.15 },
        ],
      },
    },
  });

  await prisma.purchaseOrder.create({
    data: {
      supplierId: suppliers[2].id,
      branchId: branch.id,
      status: 'PENDING',
      total: 825.00,
      items: {
        create: [
          { productId: products[10].id, quantity: 50, cost: 4.50 },
          { productId: products[11].id, quantity: 50, cost: 12.00 },
        ],
      },
    },
  });
  console.log('✅ Purchase Orders created');

  // 1️⃣2️⃣ Create audit logs
  await Promise.all([
    prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'User Login',
        module: 'Authentication',
        details: 'Admin user logged in successfully',
        ipAddress: '192.168.1.100',
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: cashierUser.id,
        action: 'Order Created',
        module: 'POS',
        details: 'Created order ORD-000001 for $12.96',
        ipAddress: '192.168.1.101',
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'Product Added',
        module: 'Inventory',
        details: 'Added new product: Wireless Earbuds',
        ipAddress: '192.168.1.100',
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'Employee Created',
        module: 'HR',
        details: 'Added new employee: Sarah Thompson',
        ipAddress: '192.168.1.100',
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: cashierUser.id,
        action: 'Customer Points Adjusted',
        module: 'Customers',
        details: 'Added 50 points to customer John Doe',
        ipAddress: '192.168.1.101',
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'Settings Changed',
        module: 'Settings',
        details: 'Updated tax rate from 8% to 8.5%',
        ipAddress: '192.168.1.100',
      },
    }),
  ]);
  console.log('✅ Audit Logs created');

  console.log('🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());