import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateCoursePricesDto {
  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  basePrice?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  advancedPrice?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  upgradePrice?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  attestationPrice?: number | null;
}
