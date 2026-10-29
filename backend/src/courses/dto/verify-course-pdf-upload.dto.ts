import {
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class VerifyCoursePdfUploadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(400)
  path!: string;

  @IsInt()
  @Min(5)
  @Max(20 * 1024 * 1024)
  size!: number;
}
