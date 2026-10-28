import { JobStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class ReviewJobDto {
  @IsEnum(JobStatus)
  status!: JobStatus;
}
