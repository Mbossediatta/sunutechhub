import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  level?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  instructorName?: string;

  @IsOptional()
  @IsString()
  instructorId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  duration?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  coverImageUrl?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  lessons?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  subjects?: string[];

  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
