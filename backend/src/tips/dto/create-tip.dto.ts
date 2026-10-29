import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTipDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsString()
  @MinLength(20)
  @MaxLength(40_000)
  htmlContent!: string;

  @IsString()
  @IsOptional()
  @MaxLength(400)
  narrationPath?: string | null;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
