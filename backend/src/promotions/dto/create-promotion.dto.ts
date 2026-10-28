import { PromotionType } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreatePromotionDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{3,32}$/)
  code!: string;

  @IsEnum(PromotionType)
  type!: PromotionType;

  @IsInt()
  @Min(1)
  value!: number;

  @IsISO8601()
  expiresAt!: string;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000000)
  usageLimit?: number;
}
