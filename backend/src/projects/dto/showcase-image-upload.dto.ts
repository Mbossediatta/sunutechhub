import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class ShowcaseImageUploadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  filename!: string;

  @IsInt()
  @Min(1)
  size!: number;

  @IsString()
  contentType!: string;
}
