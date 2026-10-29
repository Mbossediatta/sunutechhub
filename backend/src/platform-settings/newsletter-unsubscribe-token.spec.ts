import {
  createNewsletterUnsubscribeToken,
  isValidNewsletterUnsubscribeToken,
} from './newsletter-unsubscribe-token.js';

describe('newsletter unsubscribe tokens', () => {
  it('validates tokens for their matching account only', () => {
    const token = createNewsletterUnsubscribeToken('member-1', 'test-secret');

    expect(isValidNewsletterUnsubscribeToken('member-1', token, 'test-secret')).toBe(
      true,
    );
    expect(isValidNewsletterUnsubscribeToken('member-2', token, 'test-secret')).toBe(
      false,
    );
    expect(isValidNewsletterUnsubscribeToken('member-1', 'invalid', 'test-secret')).toBe(
      false,
    );
  });
});
