import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  Req,
} from '@nestjs/common';
import { ExchangesService } from './exchanges.service';
import { CreateExchangeDto } from './dto/create-exchange.dto';

@Controller('exchanges')
export class ExchangesController {
  constructor(private readonly exchangesService: ExchangesService) {}

  @Post()
  create(@Req() req: any, @Body() createExchangeDto: CreateExchangeDto) {
    return this.exchangesService.create({ ...createExchangeDto, branchId: req.user.branchId });
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('customerId') customerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.exchangesService.findAll({
      branchId: req.user.branchId,
      customerId,
      startDate,
      endDate,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.exchangesService.findOne(id, req.user.branchId);
  }

  @Get('number/:exchangeNumber')
  findByExchangeNumber(@Param('exchangeNumber') exchangeNumber: string, @Req() req: any) {
    return this.exchangesService.findByExchangeNumber(exchangeNumber, req.user.branchId);
  }

  @Patch(':id/cancel')
  cancel(
    @Req() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.exchangesService.cancel(id, reason || 'No reason provided', req.user.userId, req.user.branchId);
  }

  @Patch(':id/adjust')
  adjustAmount(
    @Req() req: any,
    @Param('id') id: string,
    @Body('adjustedAmount') adjustedAmount: number,
    @Body('adjustmentReason') adjustmentReason: string,
  ) {
    return this.exchangesService.adjustAmount(id, adjustedAmount, adjustmentReason, req.user.userId, req.user.branchId);
  }

  @Patch(':id/payment')
  processPayment(
    @Req() req: any,
    @Param('id') id: string,
    @Body('paymentMethod') paymentMethod: 'CASH' | 'CARD' | 'CREDIT',
  ) {
    return this.exchangesService.processPayment(id, paymentMethod, req.user.userId, req.user.branchId);
  }
}
