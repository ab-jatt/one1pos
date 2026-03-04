import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AdjustPointsDto {
  @IsInt()
  @IsNotEmpty()
  points: number; // Can be positive (add) or negative (subtract)

  @IsString()
  @IsOptional()
  reason?: string;
}
