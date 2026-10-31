import { Type } from 'class-transformer';
import { IsNumber, IsString, MaxLength } from 'class-validator';

export class PayTechCallbackDto {
  @IsString()
  @MaxLength(40)
  type_event!: string;

  @IsString()
  @MaxLength(100)
  ref_command!: string;

  @Type(() => Number)
  @IsNumber()
  item_price!: number;

  @IsString()
  @MaxLength(8)
  currency!: string;

  @IsString()
  @MaxLength(64)
  api_key_sha256!: string;

  @IsString()
  @MaxLength(64)
  api_secret_sha256!: string;

  @IsString()
  @MaxLength(80)
  payment_method!: string;
}
