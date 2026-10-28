import { ContentReportStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class ReviewReportDto {
  @IsEnum(ContentReportStatus)
  status!: ContentReportStatus;

  @IsOptional()
  @IsBoolean()
  hideTarget?: boolean;
}
