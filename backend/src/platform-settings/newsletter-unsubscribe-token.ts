import { createHmac, timingSafeEqual } from 'node:crypto';

export function createNewsletterUnsubscribeToken(userId: string, secret: string) {
  return createHmac('sha256', secret)
    .update(`newsletter-unsubscribe:${userId}`)
    .digest('base64url');
}

export function isValidNewsletterUnsubscribeToken(
  userId: string,
  token: string,
  secret: string,
) {
  if (!/^[\da-zA-Z_-]{43}$/.test(token)) return false;
  const expected = createNewsletterUnsubscribeToken(userId, secret);
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
