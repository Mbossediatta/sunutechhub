import { PaymentMethod, PaymentObject } from '@prisma/client';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { ReceiptPdfService } from './receipt-pdf.service.js';

describe('ReceiptPdfService', () => {
  it('creates a readable one-page receipt for a confirmed payment', async () => {
    const service = new ReceiptPdfService();
    const pdf = await service.build({
      reference: 'STH-2026-0001',
      object: PaymentObject.INSCRIPTION_BASE,
      amountBeforePromo: 25000,
      discountAmount: 5000,
      amountPaid: 20000,
      currency: 'XOF',
      method: PaymentMethod.WAVE,
      providerReference: 'PAYTECH-0001',
      createdAt: new Date('2026-05-01T10:00:00.000Z'),
      paidAt: new Date('2026-05-01T10:05:00.000Z'),
      user: { name: 'Aminata Diop', email: 'aminata@example.com' },
      course: { title: 'Développement web' },
    });

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    const document = await PDFDocument.load(pdf);
    expect(document.getPageCount()).toBe(1);
    expect(document.getPage(0).getSize()).toEqual({ width: 595, height: 842 });
  });
});
