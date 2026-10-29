import {
  createPaymentReturnToken,
  isValidPaymentReturnToken,
  PAYMENT_RETURN_TOKEN_TTL_SECONDS,
} from './payment-return-token.js';

describe('payment return token', () => {
  const now = 1_800_000_000;
  const expiresAt = now + PAYMENT_RETURN_TOKEN_TTL_SECONDS;

  it('validates a signed return link only for the matching reference', () => {
    const token = createPaymentReturnToken(
      'STH-reference-1',
      expiresAt,
      'test-secret',
    );

    expect(
      isValidPaymentReturnToken(
        'STH-reference-1',
        expiresAt,
        token,
        'test-secret',
        now,
      ),
    ).toBe(true);
    expect(
      isValidPaymentReturnToken(
        'STH-reference-2',
        expiresAt,
        token,
        'test-secret',
        now,
      ),
    ).toBe(false);
  });

  it('rejects expired, too distant, and malformed return links', () => {
    const token = createPaymentReturnToken(
      'STH-reference-1',
      expiresAt,
      'test-secret',
    );

    expect(
      isValidPaymentReturnToken(
        'STH-reference-1',
        now,
        token,
        'test-secret',
        now,
      ),
    ).toBe(false);
    expect(
      isValidPaymentReturnToken(
        'STH-reference-1',
        expiresAt + 1,
        token,
        'test-secret',
        now,
      ),
    ).toBe(false);
    expect(
      isValidPaymentReturnToken(
        'STH-reference-1',
        expiresAt,
        'invalid',
        'test-secret',
        now,
      ),
    ).toBe(false);
  });
});
