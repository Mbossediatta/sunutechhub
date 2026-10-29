import { PaymentMethod } from '@prisma/client';
import {
  Equals,
  IsEnum,
  Matches,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ConfirmPaymentDto {
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/\S/)
  providerReference!: string;

  @Equals(true)
  confirmedInPayTech!: boolean;
}
