import { IsEmail, MaxLength } from 'class-validator';

export class MagicLinkRequestDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;
}
