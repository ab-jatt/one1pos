import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';

@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  findAll(@Query('branchId') branchId?: string) {
    return this.warehousesService.findAll(branchId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.warehousesService.findOne(id);
  }

  @Get(':id/stock')
  getStockBalances(@Param('id') id: string) {
    return this.warehousesService.getStockBalances(id);
  }

  @Post()
  create(@Body() dto: any) {
    return this.warehousesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.warehousesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.warehousesService.remove(id);
  }

  @Post(':id/locations')
  addLocation(@Param('id') id: string, @Body() dto: any) {
    return this.warehousesService.addLocation(id, dto);
  }
}
