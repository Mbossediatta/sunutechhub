import { PaymentObject } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CheckoutDto {
  @IsString()
  @MaxLength(100)
  courseId!: string;

  @IsEnum(PaymentObject)
  object!: PaymentObject;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{3,32}$/)
  promoCode?: string;
}
