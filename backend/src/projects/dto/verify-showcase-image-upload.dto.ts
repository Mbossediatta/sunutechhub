import { IsInt, IsString, Min } from 'class-validator';

export class VerifyShowcaseImageUploadDto {
  @IsString()
  path!: string;

  @IsInt()
  @Min(1)
  size!: number;

  @IsString()
  contentType!: string;
}
