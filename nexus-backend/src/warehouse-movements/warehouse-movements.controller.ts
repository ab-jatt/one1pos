import { Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import { WarehouseMovementsService } from './warehouse-movements.service';

@Controller('warehouse-movements')
export class WarehouseMovementsController {
  constructor(private readonly movementsService: WarehouseMovementsService) {}

  @Get()
  findAll(
    @Req() req: any,
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
      branchId: req.user.branchId,
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
    @Req() req: any,
    @Query('warehouseId') warehouseId?: string,
    @Query('productId') productId?: string,
  ) {
    return this.movementsService.getStockBalances({ branchId: req.user.branchId, warehouseId, productId });
  }

  @Post('adjustment')
  createAdjustment(@Req() req: any, @Body() dto: any) {
    return this.movementsService.createAdjustment({ ...dto, branchId: req.user.branchId });
  }

  @Post('transfer')
  transferStock(@Req() req: any, @Body() dto: any) {
    return this.movementsService.transferStock({ ...dto, branchId: req.user.branchId });
  }

  @Get('transfers')
  findAllTransfers(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.movementsService.findAllTransfers({
      branchId: req.user.branchId,
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }
}
