import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateInstructorDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;
}
