import { CommunityEventMode } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description!: string;

  @IsDateString()
  startsAt!: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(250)
  location!: string;

  @IsEnum(CommunityEventMode)
  mode!: CommunityEventMode;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}
