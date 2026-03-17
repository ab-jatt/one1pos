import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ProductionOrdersService } from './production-orders.service';

@Controller('production-orders')
export class ProductionOrdersController {
  constructor(private readonly productionService: ProductionOrdersService) {}

  @Get()
  findAll(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productionService.findAll({
      branchId: req.user.branchId,
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.productionService.findOne(id, req.user.branchId);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.productionService.create(dto, req.user.branchId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.productionService.update(id, dto, req.user.branchId);
  }

  @Post(':id/issue')
  issueMaterials(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.productionService.issueMaterials(id, dto, req.user.branchId);
  }

  @Post(':id/receive')
  receiveGoods(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.productionService.receiveGoods(id, dto, req.user.branchId);
  }

  @Post(':id/return')
  returnMaterials(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.productionService.returnMaterials(id, dto, req.user.branchId);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string, @Req() req: any) {
    return this.productionService.updateStatus(id, status, req.user.branchId);
  }

  @Delete(':id')
  cancel(@Param('id') id: string, @Req() req: any) {
    return this.productionService.cancel(id, req.user.branchId);
  }
}
