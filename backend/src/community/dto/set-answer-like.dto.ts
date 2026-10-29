import { IsBoolean } from 'class-validator';

export class SetAnswerLikeDto {
  @IsBoolean()
  liked!: boolean;
}
