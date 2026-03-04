import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // ── New comprehensive endpoints ────────────────────────────────

  @Get('overview')
  getOverview(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getOverview(startDate, endDate);
  }

  @Get('sales-trend')
  getSalesTrend(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getSalesTrend(startDate, endDate);
  }

  @Get('profit-trend')
  getProfitTrend(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getProfitTrend(startDate, endDate);
  }

  @Get('stock-distribution')
  getStockDistribution() {
    return this.dashboardService.getStockDistribution();
  }

  @Get('top-products')
  getTopProducts(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getTopProducts(startDate, endDate);
  }

  @Get('recent-orders')
  getRecentOrders(@Query('limit') limit?: string) {
    return this.dashboardService.getRecentOrders(
      limit ? parseInt(limit, 10) : 10,
    );
  }

  // ── Legacy endpoints (backward compatible) ────────────────────

  @Get('stats')
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('sales-data')
  getSalesData() {
    return this.dashboardService.getSalesData();
  }
}
