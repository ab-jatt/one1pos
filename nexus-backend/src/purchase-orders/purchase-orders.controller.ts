import { Controller, Get, Post, Body, Param, Patch, Req } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';

@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.purchaseOrdersService.findAll(req.user.branchId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.purchaseOrdersService.findOne(id, req.user.branchId);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.purchaseOrdersService.create(dto, req.user.branchId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.purchaseOrdersService.update(id, dto, req.user.branchId);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string, @Req() req: any) {
    return this.purchaseOrdersService.updateStatus(id, status, req.user.branchId);
  }
}
