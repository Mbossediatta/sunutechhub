import { IsString, MaxLength, MinLength } from 'class-validator';

export class MagicLinkVerifyDto {
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  token!: string;
}
