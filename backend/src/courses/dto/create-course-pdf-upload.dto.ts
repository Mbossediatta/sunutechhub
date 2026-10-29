import { IsIn, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateCoursePdfUploadDto {
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  filename!: string;

  @IsInt()
  @Min(5)
  @Max(20 * 1024 * 1024)
  size!: number;

  @IsIn(['application/pdf'])
  contentType!: string;
}
