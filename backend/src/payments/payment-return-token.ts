import { createHmac, timingSafeEqual } from 'node:crypto';

export const PAYMENT_RETURN_TOKEN_TTL_SECONDS = 24 * 60 * 60;

export function createPaymentReturnToken(
  reference: string,
  expiresAt: number,
  secret: string,
) {
  return createHmac('sha256', secret)
    .update(`payment-return:${reference}:${expiresAt}`)
    .digest('base64url');
}

export function isValidPaymentReturnToken(
  reference: string,
  expiresAt: number,
  token: string,
  secret: string,
  now = Math.floor(Date.now() / 1000),
) {
  if (
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= now ||
    expiresAt > now + PAYMENT_RETURN_TOKEN_TTL_SECONDS ||
    !/^[\da-zA-Z_-]{43}$/.test(token)
  ) {
    return false;
  }

  const expected = createPaymentReturnToken(reference, expiresAt, secret);
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
