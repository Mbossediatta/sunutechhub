import { IsEmail, MaxLength } from 'class-validator';

export class NewsletterSubscribeDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;
}
