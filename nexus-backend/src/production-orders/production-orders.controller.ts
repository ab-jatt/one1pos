import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ProductionOrdersService } from './production-orders.service';

@Controller('production-orders')
export class ProductionOrdersController {
  constructor(private readonly productionService: ProductionOrdersService) {}

  @Get()
  findAll(
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productionService.findAll({
      branchId,
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productionService.findOne(id);
  }

  @Post()
  create(@Body() dto: any) {
    return this.productionService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.productionService.update(id, dto);
  }

  @Post(':id/issue')
  issueMaterials(@Param('id') id: string, @Body() dto: any) {
    return this.productionService.issueMaterials(id, dto);
  }

  @Post(':id/receive')
  receiveGoods(@Param('id') id: string, @Body() dto: any) {
    return this.productionService.receiveGoods(id, dto);
  }

  @Post(':id/return')
  returnMaterials(@Param('id') id: string, @Body() dto: any) {
    return this.productionService.returnMaterials(id, dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.productionService.updateStatus(id, status);
  }

  @Delete(':id')
  cancel(@Param('id') id: string) {
    return this.productionService.cancel(id);
  }
}
