import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.transactionsService.findAll(req.user.branchId);
  }

  @Get('stats')
  getStats(@Req() req: any) {
    return this.transactionsService.getFinancialStats(req.user.branchId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.transactionsService.create(dto, req.user.branchId);
  }
}
