import { Module } from '@nestjs/common';
import { ProductionOrdersController } from './production-orders.controller';
import { ProductionOrdersService } from './production-orders.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ProductionOrdersController],
  providers: [ProductionOrdersService, PrismaService],
  exports: [ProductionOrdersService],
})
export class ProductionOrdersModule {}
