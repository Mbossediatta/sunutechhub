import { CourseContentType } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  Validate,
} from 'class-validator';
import { CourseContentUrlValidator } from '../course-content-url.validator.js';

export class UpdateCourseContentDto {
  @IsOptional()
  @IsEnum(CourseContentType)
  type?: CourseContentType;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @Validate(CourseContentUrlValidator)
  @MaxLength(2048)
  url?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
