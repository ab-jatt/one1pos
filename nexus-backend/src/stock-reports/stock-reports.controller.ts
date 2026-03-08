import { Controller, Get, Post, Query, Body, Param, Req } from '@nestjs/common';
import { StockReportsService } from './stock-reports.service';

@Controller('stock-reports')
export class StockReportsController {
  constructor(private readonly stockReportsService: StockReportsService) {}

  @Get()
  getStockReport(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('productId') productId?: string,
  ) {
    return this.stockReportsService.getStockReport(req.user.branchId, startDate, endDate, productId);
  }

  @Get('movements')
  getAllMovements(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('productId') productId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.stockReportsService.getAllMovements(
      req.user.branchId,
      startDate,
      endDate,
      productId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Get('daily/:date')
  getDailySummary(
    @Req() req: any,
    @Param('date') date: string,
  ) {
    return this.stockReportsService.getDailyStockSummary(req.user.branchId, date);
  }

  @Post('adjustment')
  createAdjustment(
    @Req() req: any,
    @Body() body: {
      productId: string;
      adjustmentType: 'IN' | 'OUT';
      quantity: number;
      reason: string;
    },
  ) {
    return this.stockReportsService.createAdjustment(
      req.user.branchId,
      body.productId,
      body.adjustmentType,
      body.quantity,
      body.reason,
      req.user.userId,
    );
  }
}
