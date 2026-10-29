import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateTipDto {
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
  @IsString()
  @MinLength(20)
  @MaxLength(40_000)
  htmlContent?: string;

  @IsOptional()
  @IsString()
  @IsOptional()
  @MaxLength(400)
  narrationPath?: string | null;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
