import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

export class VerifyCourseBannerUploadDto {
  @IsString()
  @MaxLength(300)
  path!: string;

  @IsInt()
  @Min(13)
  @Max(5242880)
  size!: number;

  @IsString()
  @MaxLength(30)
  contentType!: string;
}
