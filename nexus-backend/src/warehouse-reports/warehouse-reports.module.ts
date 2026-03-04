import { Module } from '@nestjs/common';
import { WarehouseReportsController } from './warehouse-reports.controller';
import { WarehouseReportsService } from './warehouse-reports.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [WarehouseReportsController],
  providers: [WarehouseReportsService, PrismaService],
})
export class WarehouseReportsModule {}
