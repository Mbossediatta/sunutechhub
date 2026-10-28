import { PromotionType } from '@prisma/client';
import { addAccessDays, calculateDiscount } from './pricing-calculation.js';

describe('pricing calculations', () => {
  it('calculates percentage promotions without exceeding the amount', () => {
    expect(calculateDiscount(3000, PromotionType.PERCENTAGE, 25)).toBe(750);
    expect(calculateDiscount(1000, PromotionType.PERCENTAGE, 100)).toBe(1000);
  });

  it('caps fixed promotions at the purchase amount', () => {
    expect(calculateDiscount(1000, PromotionType.FIXED, 500)).toBe(500);
    expect(calculateDiscount(1000, PromotionType.FIXED, 5000)).toBe(1000);
  });

  it('adds the configured access period in whole days', () => {
    const start = new Date('2026-01-01T10:00:00.000Z');
    expect(addAccessDays(start, 30).toISOString()).toBe(
      '2026-01-31T10:00:00.000Z',
    );
  });
});
