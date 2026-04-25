import { IsDateString, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

export class CreateMealHistoryDto {
  @IsString()
  menuItemId!: string;

  @IsOptional()
  @IsDateString()
  eatenAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
