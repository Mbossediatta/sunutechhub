import {
  IsIn,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class TipNarrationUploadDto {
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  filename!: string;

  @IsInt()
  @Min(3)
  @Max(50 * 1024 * 1024)
  size!: number;

  @IsString()
  @IsIn(['audio/mpeg', 'video/mp4'])
  @MaxLength(30)
  contentType!: string;
}
