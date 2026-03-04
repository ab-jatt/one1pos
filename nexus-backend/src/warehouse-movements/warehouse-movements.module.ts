import { Module } from '@nestjs/common';
import { WarehouseMovementsController } from './warehouse-movements.controller';
import { WarehouseMovementsService } from './warehouse-movements.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [WarehouseMovementsController],
  providers: [WarehouseMovementsService, PrismaService],
  exports: [WarehouseMovementsService],
})
export class WarehouseMovementsModule {}
