import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReceiptPdfService } from '../receipts/receipt-pdf.service.js';
import { PricingService } from '../pricing/pricing.service.js';
import { createPaymentReturnToken } from './payment-return-token.js';
import { PaymentsService } from './payments.service.js';
import { PayTechService } from './paytech.service.js';

describe('PaymentsService payment return verification', () => {
  const secret = 'payment-return-test-secret';
  const payment = {
    reference: 'STH-reference-1',
    status: 'PENDING',
    amountPaid: 1500,
    currency: 'FCFA',
    course: { id: 'course-1', title: 'Cours test' },
  };
  const prisma = {
    payment: { findUnique: vi.fn() },
  };
  const payTech = {
    verifyPaymentReturnToken: vi.fn(),
  };
  let service: PaymentsService;

  beforeEach(() => {
    vi.clearAllMocks();
    payTech.verifyPaymentReturnToken.mockImplementation(
      (reference: string, expiresAt: number, token: string) =>
        reference === payment.reference &&
        expiresAt === 1_800_000_100 &&
        token === createPaymentReturnToken(reference, expiresAt, secret),
    );
    prisma.payment.findUnique.mockResolvedValue(payment);
    service = new PaymentsService(
      prisma as unknown as PrismaService,
      {} as PricingService,
      payTech as unknown as PayTechService,
      {} as ReceiptPdfService,
    );
  });

  it('returns only safe payment status data when the signed return token is valid', async () => {
    const expiresAt = 1_800_000_100;
    const token = createPaymentReturnToken(
      payment.reference,
      expiresAt,
      secret,
    );

    await expect(
      service.getPaymentReturn(payment.reference, expiresAt, token),
    ).resolves.toEqual(payment);
    expect(prisma.payment.findUnique).toHaveBeenCalledWith({
      where: { reference: payment.reference },
      select: {
        reference: true,
        status: true,
        amountPaid: true,
        currency: true,
        course: { select: { id: true, title: true } },
      },
    });
  });

  it('does not expose payment details when the return token is invalid', async () => {
    payTech.verifyPaymentReturnToken.mockReturnValue(false);

    await expect(
      service.getPaymentReturn(payment.reference, 1_800_000_100, 'invalid'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.payment.findUnique).not.toHaveBeenCalled();
  });
});
