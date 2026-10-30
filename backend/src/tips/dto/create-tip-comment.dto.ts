import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTipCommentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  body!: string;
}
