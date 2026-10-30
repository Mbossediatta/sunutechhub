import { IsBoolean } from 'class-validator';

export class SetTipLikeDto {
  @IsBoolean()
  liked!: boolean;
}
