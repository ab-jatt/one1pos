import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { WarehouseMovementsService } from './warehouse-movements.service';

@Controller('warehouse-movements')
export class WarehouseMovementsController {
  constructor(private readonly movementsService: WarehouseMovementsService) {}

  @Get()
  findAll(
    @Query('branchId') branchId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('productId') productId?: string,
    @Query('movementType') movementType?: string,
    @Query('referenceType') referenceType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.movementsService.findAll({
      branchId,
      warehouseId,
      productId,
      movementType: movementType as any,
      referenceType,
      startDate,
      endDate,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('balances')
  getStockBalances(
    @Query('branchId') branchId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('productId') productId?: string,
  ) {
    return this.movementsService.getStockBalances({ branchId, warehouseId, productId });
  }

  @Post('adjustment')
  createAdjustment(@Body() dto: any) {
    return this.movementsService.createAdjustment(dto);
  }

  @Post('transfer')
  transferStock(@Body() dto: any) {
    return this.movementsService.transferStock(dto);
  }

  @Get('transfers')
  findAllTransfers(
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.movementsService.findAllTransfers({
      branchId,
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }
}
