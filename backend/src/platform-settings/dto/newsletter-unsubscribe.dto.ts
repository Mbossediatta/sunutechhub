import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class NewsletterUnsubscribeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  userId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  subscriberId?: string;

  @IsString()
  @MinLength(43)
  @MaxLength(43)
  token!: string;
}
