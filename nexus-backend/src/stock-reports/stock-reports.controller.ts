import { Controller, Get, Post, Query, Body, Param } from '@nestjs/common';
import { StockReportsService } from './stock-reports.service';

@Controller('stock-reports')
export class StockReportsController {
  constructor(private readonly stockReportsService: StockReportsService) {}

  /**
   * GET /api/stock-reports
   * Get comprehensive stock report with date filters and optional product filter
   */
  @Get()
  getStockReport(
    @Query('branchId') branchId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('productId') productId?: string,
  ) {
    const branch = branchId || 'main-branch-id';
    return this.stockReportsService.getStockReport(branch, startDate, endDate, productId);
  }

  /**
   * GET /api/stock-reports/movements
   * Get all stock movements with pagination
   */
  @Get('movements')
  getAllMovements(
    @Query('branchId') branchId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('productId') productId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const branch = branchId || 'main-branch-id';
    return this.stockReportsService.getAllMovements(
      branch,
      startDate,
      endDate,
      productId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  /**
   * GET /api/stock-reports/daily/:date
   * Get daily stock summary for a specific date
   */
  @Get('daily/:date')
  getDailySummary(
    @Param('date') date: string,
    @Query('branchId') branchId: string,
  ) {
    const branch = branchId || 'main-branch-id';
    return this.stockReportsService.getDailyStockSummary(branch, date);
  }

  /**
   * POST /api/stock-reports/adjustment
   * Create a manual stock adjustment
   */
  @Post('adjustment')
  createAdjustment(
    @Body() body: {
      branchId?: string;
      productId: string;
      adjustmentType: 'IN' | 'OUT';
      quantity: number;
      reason: string;
      userId?: string;
    },
  ) {
    const branchId = body.branchId || 'main-branch-id';
    return this.stockReportsService.createAdjustment(
      branchId,
      body.productId,
      body.adjustmentType,
      body.quantity,
      body.reason,
      body.userId,
    );
  }
}
