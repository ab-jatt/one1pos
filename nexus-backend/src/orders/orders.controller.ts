import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { RefundOrderDto } from './dto/refund-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.ordersService.findAll(req.user.branchId);
  }

  @Get('stats')
  getStats(@Req() req: any) {
    return this.ordersService.getStats(req.user.branchId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.findOne(id, req.user.branchId);
  }

  @Get('number/:orderNumber')
  findByOrderNumber(@Param('orderNumber') orderNumber: string, @Req() req: any) {
    return this.ordersService.findByOrderNumber(orderNumber, req.user.branchId);
  }

  @Post()
  create(@Req() req: any, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto, req.user.branchId);
  }

  @Post(':id/refund')
  refund(@Param('id') id: string, @Body() refundOrderDto: RefundOrderDto, @Req() req: any) {
    return this.ordersService.refund(id, refundOrderDto, req.user.branchId);
  }
}
