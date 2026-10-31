import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PayTechCallbackDto } from './paytech-callback.dto.js';

describe('PayTechCallbackDto', () => {
  it('converts an IPN form amount from text to a number', async () => {
    const callback = plainToInstance(PayTechCallbackDto, {
      type_event: 'sale_complete',
      ref_command: 'STH-reference-1',
      item_price: '1500',
      currency: 'XOF',
      api_key_sha256: 'a'.repeat(64),
      api_secret_sha256: 'b'.repeat(64),
      payment_method: 'Orange Money',
    });

    expect(callback.item_price).toBe(1500);
    await expect(validate(callback)).resolves.toHaveLength(0);
  });
});
