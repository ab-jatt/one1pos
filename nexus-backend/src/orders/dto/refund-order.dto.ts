import { IsArray, IsEnum, IsOptional, IsString, ArrayMinSize, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum RefundAction {
  REFUND = 'REFUND',
  EXCHANGE = 'EXCHANGE',
}

export class RefundItemDto {
  @IsString()
  itemId: string; // OrderItem ID

  @IsNumber()
  @Min(1)
  quantity: number; // Quantity to refund (can be partial)
}

export class RefundOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RefundItemDto)
  @ArrayMinSize(1, { message: 'At least one item must be selected for refund' })
  items: RefundItemDto[]; // Items with quantities to refund

  @IsEnum(RefundAction)
  @IsOptional()
  action?: RefundAction;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  refundMethod?: string; // Original Payment, Store Credit, etc.
}
