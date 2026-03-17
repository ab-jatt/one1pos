import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { AdjustPointsDto } from './dto/adjust-points.dto';
import { AdjustBalanceDto } from './dto/adjust-balance.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.customersService.findAll(req.user.branchId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.customersService.findOne(id, req.user.branchId);
  }

  @Get(':id/ledger')
  getLedger(
    @Param('id') id: string,
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.customersService.getLedger(id, req.user.branchId, startDate, endDate);
  }

  @Post()
  create(@Body() createCustomerDto: CreateCustomerDto, @Req() req: any) {
    return this.customersService.create(createCustomerDto, req.user.branchId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @Req() req: any,
  ) {
    return this.customersService.update(id, updateCustomerDto, req.user.branchId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.customersService.remove(id, req.user.branchId);
  }

  @Post(':id/points')
  adjustPoints(
    @Param('id') id: string,
    @Body() adjustPointsDto: AdjustPointsDto,
    @Req() req: any,
  ) {
    return this.customersService.adjustPoints(id, adjustPointsDto, req.user.branchId);
  }

  @Post(':id/balance')
  adjustBalance(
    @Param('id') id: string,
    @Body() adjustBalanceDto: AdjustBalanceDto,
    @Req() req: any,
  ) {
    return this.customersService.adjustBalance(id, adjustBalanceDto, req.user.branchId);
  }
}
