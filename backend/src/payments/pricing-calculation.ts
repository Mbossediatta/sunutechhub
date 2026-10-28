import { PromotionType } from '@prisma/client';

export function calculateDiscount(
  amount: number,
  type: PromotionType,
  value: number,
): number {
  if (type === PromotionType.PERCENTAGE) {
    return Math.min(amount, Math.round((amount * value) / 100));
  }
  return Math.min(amount, value);
}

export function addAccessDays(start: Date, days: number): Date {
  return new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
}
