import { IsString, MaxLength, MinLength } from 'class-validator';

export class GoogleAuthDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  code!: string;
}
