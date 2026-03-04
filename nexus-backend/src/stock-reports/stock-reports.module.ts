import { Module } from '@nestjs/common';
import { StockReportsController } from './stock-reports.controller';
import { StockReportsService } from './stock-reports.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [StockReportsController],
  providers: [StockReportsService, PrismaService],
  exports: [StockReportsService],
})
export class StockReportsModule {}
