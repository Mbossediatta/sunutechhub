import { IsString, MaxLength } from 'class-validator';

export class DeleteCourseBannerUploadDto {
  @IsString()
  @MaxLength(300)
  path!: string;
}
