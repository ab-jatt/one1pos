import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
} from '@nestjs/common';
import { ExchangesService } from './exchanges.service';
import { CreateExchangeDto } from './dto/create-exchange.dto';

@Controller('api/exchanges')
export class ExchangesController {
  constructor(private readonly exchangesService: ExchangesService) {}

  /**
   * Create a new exchange transaction
   * Supports optional amount adjustment with mandatory reason
   */
  @Post()
  create(@Body() createExchangeDto: CreateExchangeDto) {
    return this.exchangesService.create(createExchangeDto);
  }

  /**
   * Get all exchanges with optional filters
   */
  @Get()
  findAll(
    @Query('branchId') branchId?: string,
    @Query('customerId') customerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.exchangesService.findAll({
      branchId,
      customerId,
      startDate,
      endDate,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  /**
   * Get exchange by ID
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.exchangesService.findOne(id);
  }

  /**
   * Get exchange by exchange number
   */
  @Get('number/:exchangeNumber')
  findByExchangeNumber(@Param('exchangeNumber') exchangeNumber: string) {
    return this.exchangesService.findByExchangeNumber(exchangeNumber);
  }

  /**
   * Cancel an exchange
   * Reverses all stock movements and credit transactions
   */
  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string, 
    @Body('reason') reason: string,
    @Body('cancelledById') cancelledById?: string,
  ) {
    return this.exchangesService.cancel(id, reason || 'No reason provided', cancelledById);
  }

  /**
   * Adjust the exchange amount after creation
   * Only allowed for exchanges with PENDING payment status
   * Requires mandatory adjustment reason
   */
  @Patch(':id/adjust')
  adjustAmount(
    @Param('id') id: string,
    @Body('adjustedAmount') adjustedAmount: number,
    @Body('adjustmentReason') adjustmentReason: string,
    @Body('adjustedById') adjustedById: string,
  ) {
    return this.exchangesService.adjustAmount(id, adjustedAmount, adjustmentReason, adjustedById);
  }

  /**
   * Process payment for a pending exchange
   * Handles cash, card, or store credit payments
   */
  @Patch(':id/payment')
  processPayment(
    @Param('id') id: string,
    @Body('paymentMethod') paymentMethod: 'CASH' | 'CARD' | 'CREDIT',
    @Body('processedById') processedById?: string,
  ) {
    return this.exchangesService.processPayment(id, paymentMethod, processedById);
  }
}
