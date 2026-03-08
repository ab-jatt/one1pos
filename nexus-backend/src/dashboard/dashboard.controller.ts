import { Controller, Get, Query, Req } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  getOverview(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getOverview(req.user.branchId, startDate, endDate);
  }

  @Get('sales-trend')
  getSalesTrend(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getSalesTrend(req.user.branchId, startDate, endDate);
  }

  @Get('profit-trend')
  getProfitTrend(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getProfitTrend(req.user.branchId, startDate, endDate);
  }

  @Get('stock-distribution')
  getStockDistribution(@Req() req: any) {
    return this.dashboardService.getStockDistribution(req.user.branchId);
  }

  @Get('top-products')
  getTopProducts(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getTopProducts(req.user.branchId, startDate, endDate);
  }

  @Get('recent-orders')
  getRecentOrders(@Req() req: any, @Query('limit') limit?: string) {
    return this.dashboardService.getRecentOrders(
      req.user.branchId,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('stats')
  getStats(@Req() req: any) {
    return this.dashboardService.getStats(req.user.branchId);
  }

  @Get('sales-data')
  getSalesData(@Req() req: any) {
    return this.dashboardService.getSalesData(req.user.branchId);
  }
}
