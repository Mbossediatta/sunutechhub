import { JobType } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateJobDto {
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  title!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  company!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  city!: string;

  @IsEnum(JobType)
  type!: JobType;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  level!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(8000)
  description!: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  applyUrl?: string;
}
