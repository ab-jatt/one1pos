import { Controller, Get, Query } from '@nestjs/common';
import { WarehouseReportsService } from './warehouse-reports.service';

@Controller('warehouse-reports')
export class WarehouseReportsController {
  constructor(private readonly reportsService: WarehouseReportsService) {}

  @Get('stock-balance')
  getStockBalance(
    @Query('branchId') branchId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.reportsService.getStockBalanceReport({ branchId, warehouseId, categoryId });
  }

  @Get('movements')
  getMovements(
    @Query('branchId') branchId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('productId') productId?: string,
    @Query('movementType') movementType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getStockMovementReport({
      branchId, warehouseId, productId, movementType, startDate, endDate,
    });
  }

  @Get('inventory-valuation')
  getInventoryValuation(@Query('branchId') branchId?: string) {
    return this.reportsService.getInventoryValuationReport({ branchId });
  }

  @Get('production-consumption')
  getProductionConsumption(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('productionOrderId') productionOrderId?: string,
  ) {
    return this.reportsService.getProductionConsumptionReport({
      branchId, startDate, endDate, productionOrderId,
    });
  }

  @Get('finished-goods')
  getFinishedGoods(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getFinishedGoodsReport({ branchId, startDate, endDate });
  }

  @Get('low-stock')
  getLowStock(
    @Query('branchId') branchId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('threshold') threshold?: string,
  ) {
    return this.reportsService.getLowStockReport({
      branchId, warehouseId, threshold: threshold ? parseInt(threshold) : undefined,
    });
  }

  @Get('transfers')
  getTransfers(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getTransferReport({ branchId, startDate, endDate });
  }
}
