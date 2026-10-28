import { IsString, MaxLength, MinLength } from 'class-validator';

export class RevokeAttestationDto {
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}
