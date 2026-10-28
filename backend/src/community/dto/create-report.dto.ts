import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateReportDto {
  @ValidateIf((report) => !report.answerId)
  @IsString()
  questionId?: string;

  @ValidateIf((report) => !report.questionId)
  @IsString()
  answerId?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  details?: string;
}
