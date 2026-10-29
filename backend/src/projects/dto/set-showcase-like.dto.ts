import { IsBoolean } from 'class-validator';

export class SetShowcaseLikeDto {
  @IsBoolean()
  liked!: boolean;
}
