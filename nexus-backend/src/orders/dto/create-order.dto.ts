import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentMethodDto {
  CASH = 'CASH',
  CARD = 'CARD',
  CREDIT = 'CREDIT',
  WALLET = 'WALLET',
  SPLIT = 'SPLIT',
}

export class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsNotEmpty()
  cashierId: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsEnum(PaymentMethodDto)
  @IsNotEmpty()
  paymentMethod: PaymentMethodDto;

  @IsNumber()
  @IsOptional()
  @Min(0)
  discount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  pointsRedeemed?: number;
}
