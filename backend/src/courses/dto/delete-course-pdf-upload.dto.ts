import { IsString, MaxLength, MinLength } from 'class-validator';

export class DeleteCoursePdfUploadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(400)
  path!: string;
}
