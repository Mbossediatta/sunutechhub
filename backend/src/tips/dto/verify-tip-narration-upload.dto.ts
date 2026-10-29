import {
  IsIn,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class VerifyTipNarrationUploadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(400)
  path!: string;

  @IsInt()
  @Min(3)
  @Max(50 * 1024 * 1024)
  size!: number;

  @IsString()
  @IsIn(['audio/mpeg', 'video/mp4'])
  @MaxLength(30)
  contentType!: string;
}
