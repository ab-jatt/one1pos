import { Controller, Get, Query, Req } from '@nestjs/common';
import { WarehouseReportsService } from './warehouse-reports.service';

@Controller('warehouse-reports')
export class WarehouseReportsController {
  constructor(private readonly reportsService: WarehouseReportsService) {}

  @Get('stock-balance')
  getStockBalance(
    @Req() req: any,
    @Query('warehouseId') warehouseId?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.reportsService.getStockBalanceReport({ branchId: req.user.branchId, warehouseId, categoryId });
  }

  @Get('movements')
  getMovements(
    @Req() req: any,
    @Query('warehouseId') warehouseId?: string,
    @Query('productId') productId?: string,
    @Query('movementType') movementType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getStockMovementReport({
      branchId: req.user.branchId, warehouseId, productId, movementType, startDate, endDate,
    });
  }

  @Get('inventory-valuation')
  getInventoryValuation(@Req() req: any) {
    return this.reportsService.getInventoryValuationReport({ branchId: req.user.branchId });
  }

  @Get('production-consumption')
  getProductionConsumption(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('productionOrderId') productionOrderId?: string,
  ) {
    return this.reportsService.getProductionConsumptionReport({
      branchId: req.user.branchId, startDate, endDate, productionOrderId,
    });
  }

  @Get('finished-goods')
  getFinishedGoods(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getFinishedGoodsReport({ branchId: req.user.branchId, startDate, endDate });
  }

  @Get('low-stock')
  getLowStock(
    @Req() req: any,
    @Query('warehouseId') warehouseId?: string,
    @Query('threshold') threshold?: string,
  ) {
    return this.reportsService.getLowStockReport({
      branchId: req.user.branchId, warehouseId, threshold: threshold ? parseInt(threshold) : undefined,
    });
  }

  @Get('transfers')
  getTransfers(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getTransferReport({ branchId: req.user.branchId, startDate, endDate });
  }
}
