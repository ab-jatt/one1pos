import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';

@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.warehousesService.findAll(req.user.branchId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.warehousesService.findOne(id, req.user.branchId);
  }

  @Get(':id/stock')
  getStockBalances(@Param('id') id: string, @Req() req: any) {
    return this.warehousesService.getStockBalances(id, req.user.branchId);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.warehousesService.create(dto, req.user.branchId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.warehousesService.update(id, dto, req.user.branchId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.warehousesService.remove(id, req.user.branchId);
  }

  @Post(':id/locations')
  addLocation(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.warehousesService.addLocation(id, dto, req.user.branchId);
  }
}
