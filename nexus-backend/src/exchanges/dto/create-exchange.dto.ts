import {
  IsArray,
  IsOptional,
  IsString,
  ArrayMinSize,
  ValidateNested,
  IsNumber,
  Min,
  IsEnum,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class ExchangeReturnItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class ExchangeIssuedItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreateExchangeDto {
  @IsString()
  originalOrderId: string; // Reference to original sale

  @IsString()
  branchId: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  processedById?: string; // User processing the exchange

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExchangeReturnItemDto)
  @ArrayMinSize(1, { message: 'At least one return item is required' })
  returnedItems: ExchangeReturnItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExchangeIssuedItemDto)
  @ArrayMinSize(1, { message: 'At least one issued item is required' })
  issuedItems: ExchangeIssuedItemDto[];

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  // Amount adjustment fields
  @IsNumber()
  @IsOptional()
  adjustedAmount?: number; // Manual override of the calculated amount

  @ValidateIf((o) => o.adjustedAmount !== undefined && o.adjustedAmount !== null)
  @IsString()
  @IsNotEmpty({ message: 'Adjustment reason is required when adjusting amount' })
  adjustmentReason?: string; // Mandatory if adjustedAmount is provided

  @IsString()
  @IsOptional()
  adjustedById?: string; // User who made the adjustment

  @IsString()
  @IsOptional()
  notes?: string;
}
