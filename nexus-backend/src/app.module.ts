import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { CustomersModule } from './customers/customers.module';
import { OrdersModule } from './orders/orders.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { EmployeesModule } from './employees/employees.module';
import { TransactionsModule } from './transactions/transactions.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { ShiftsModule } from './shifts/shifts.module';
import { StockReportsModule } from './stock-reports/stock-reports.module';
import { ExchangesModule } from './exchanges/exchanges.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { WarehouseMovementsModule } from './warehouse-movements/warehouse-movements.module';
import { ProductionOrdersModule } from './production-orders/production-orders.module';
import { WarehouseReportsModule } from './warehouse-reports/warehouse-reports.module';
import { FirebaseModule } from './firebase/firebase.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    FirebaseModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    CustomersModule,
    OrdersModule,
    DashboardModule,
    SuppliersModule,
    EmployeesModule,
    TransactionsModule,
    PurchaseOrdersModule,
    AuditLogsModule,
    ShiftsModule,
    StockReportsModule,
    ExchangesModule,
    WarehousesModule,
    WarehouseMovementsModule,
    ProductionOrdersModule,
    WarehouseReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
