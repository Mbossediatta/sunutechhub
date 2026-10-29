import { IsIn, IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateCourseBannerUploadDto {
  @IsString()
  @MaxLength(180)
  filename!: string;

  @IsInt()
  @Min(13)
  @Max(5242880)
  size!: number;

  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  contentType!: string;
}
