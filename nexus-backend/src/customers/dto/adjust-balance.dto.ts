import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum BalanceTransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export class AdjustBalanceDto {
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  amount: number;

  @IsEnum(BalanceTransactionType)
  @IsNotEmpty()
  type: BalanceTransactionType;

  @IsString()
  @IsOptional()
  note?: string;
}
