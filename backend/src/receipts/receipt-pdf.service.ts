import { Injectable } from '@nestjs/common';
import { PaymentMethod, PaymentObject } from '@prisma/client';
import { PDFDocument, PDFFont, StandardFonts, rgb } from 'pdf-lib';

export interface ReceiptPayment {
  reference: string;
  object: PaymentObject;
  amountBeforePromo: number;
  discountAmount: number;
  amountPaid: number;
  currency: string;
  method: PaymentMethod;
  providerReference: string | null;
  createdAt: Date;
  paidAt: Date | null;
  user: { name: string; email: string };
  course: { title: string } | null;
}

const money = new Intl.NumberFormat('fr-FR');

function cleanPdfText(value: string) {
  return value
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function wrapText(
  value: string,
  maxWidth: number,
  font: PDFFont,
  size: number,
) {
  const words = cleanPdfText(value).split(' ');
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  return lines.length ? lines : ['-'];
}

@Injectable()
export class ReceiptPdfService {
  async build(payment: ReceiptPayment) {
    const document = await PDFDocument.create();
    const page = document.addPage([595, 842]);
    const regular = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    const navy = rgb(14 / 255, 22 / 255, 48 / 255);
    const blue = rgb(43 / 255, 78 / 255, 255 / 255);
    const violet = rgb(124 / 255, 92 / 255, 255 / 255);
    const muted = rgb(93 / 255, 105 / 255, 132 / 255);
    const pale = rgb(245 / 255, 247 / 255, 255 / 255);
    const green = rgb(20 / 255, 116 / 255, 87 / 255);
    const itemName = this.getItemName(
      payment.object,
      payment.course?.title ?? 'Cours',
    );
    const paidAt = payment.paidAt ?? payment.createdAt;
    const formatDate = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Africa/Dakar',
    });

    page.drawRectangle({
      x: 0,
      y: 680,
      width: 595,
      height: 162,
      color: navy,
    });
    page.drawRectangle({ x: 0, y: 680, width: 595, height: 6, color: violet });
    page.drawRectangle({ x: 48, y: 770, width: 40, height: 40, color: blue });
    page.drawText('</>', {
      x: 55,
      y: 783,
      font: bold,
      size: 15,
      color: rgb(1, 1, 1),
    });
    page.drawText('Sunu Tech Hub', {
      x: 101,
      y: 792,
      font: bold,
      size: 18,
      color: rgb(1, 1, 1),
    });
    page.drawText('REÇU NUMÉRIQUE', {
      x: 101,
      y: 775,
      font: regular,
      size: 7,
      color: rgb(205 / 255, 214 / 255, 238 / 255),
    });
    page.drawText('REÇU DE PAIEMENT', {
      x: 48,
      y: 724,
      font: bold,
      size: 23,
      color: rgb(1, 1, 1),
    });
    page.drawText('JUSTIFICATIF DE TRANSACTION', {
      x: 49,
      y: 704,
      font: regular,
      size: 9,
      color: rgb(205 / 255, 214 / 255, 238 / 255),
    });

    page.drawRectangle({
      x: 48,
      y: 621,
      width: 499,
      height: 38,
      color: rgb(232 / 255, 248 / 255, 242 / 255),
      borderColor: rgb(194 / 255, 231 / 255, 218 / 255),
      borderWidth: 0.7,
    });
    page.drawText('PAIEMENT CONFIRMÉ', {
      x: 64,
      y: 635,
      font: bold,
      size: 10,
      color: green,
    });
    page.drawText(cleanPdfText(`Émis le ${formatDate.format(paidAt)}`), {
      x: 345,
      y: 635,
      font: regular,
      size: 9,
      color: muted,
    });

    const cardY = 500;
    page.drawRectangle({
      x: 48,
      y: cardY,
      width: 499,
      height: 103,
      color: pale,
      borderColor: rgb(224 / 255, 229 / 255, 241 / 255),
      borderWidth: 0.7,
    });
    page.drawText('PAYÉ PAR', {
      x: 64,
      y: 581,
      font: bold,
      size: 8,
      color: muted,
    });
    const customerLines = wrapText(payment.user.name, 275, bold, 13);
    customerLines.slice(0, 2).forEach((line, index) => {
      page.drawText(line, {
        x: 64,
        y: 560 - index * 16,
        font: bold,
        size: 13,
        color: navy,
      });
    });
    wrapText(payment.user.email, 275, regular, 9)
      .slice(0, 2)
      .forEach((line, index) => {
        page.drawText(line, {
          x: 64,
          y: 526 - index * 11,
          font: regular,
          size: 9,
          color: muted,
        });
      });
    page.drawText('RÉFÉRENCE DU REÇU', {
      x: 365,
      y: 581,
      font: bold,
      size: 8,
      color: muted,
    });
    wrapText(payment.reference, 160, bold, 9)
      .slice(0, 3)
      .forEach((line, index) => {
        page.drawText(line, {
          x: 365,
          y: 561 - index * 12,
          font: bold,
          size: 9,
          color: navy,
        });
      });

    page.drawText('DÉTAIL DE LA TRANSACTION', {
      x: 48,
      y: 467,
      font: bold,
      size: 9,
      color: muted,
    });
    page.drawRectangle({ x: 48, y: 426, width: 499, height: 29, color: navy });
    page.drawText('DESCRIPTION', {
      x: 63,
      y: 437,
      font: bold,
      size: 8,
      color: rgb(1, 1, 1),
    });
    page.drawText('MONTANT', {
      x: 455,
      y: 437,
      font: bold,
      size: 8,
      color: rgb(1, 1, 1),
    });

    let itemY = 395;
    const itemLines = wrapText(itemName, 355, bold, 10).slice(0, 3);
    itemLines.forEach((line, index) => {
      page.drawText(line, {
        x: 63,
        y: itemY - index * 13,
        font: bold,
        size: 10,
        color: navy,
      });
    });
    page.drawText(
      cleanPdfText(
        `${money.format(payment.amountBeforePromo)} ${payment.currency}`,
      ),
      { x: 410, y: itemY, font: regular, size: 9, color: navy },
    );
    page.drawLine({
      start: { x: 63, y: 358 },
      end: { x: 532, y: 358 },
      thickness: 0.7,
      color: rgb(224 / 255, 229 / 255, 241 / 255),
    });

    let summaryY = 335;
    if (payment.discountAmount > 0) {
      page.drawText('Réduction', {
        x: 310,
        y: summaryY,
        font: regular,
        size: 9,
        color: muted,
      });
      page.drawText(
        cleanPdfText(
          `- ${money.format(payment.discountAmount)} ${payment.currency}`,
        ),
        { x: 430, y: summaryY, font: regular, size: 9, color: green },
      );
      summaryY -= 22;
    }
    page.drawRectangle({
      x: 48,
      y: summaryY - 38,
      width: 499,
      height: 51,
      color: pale,
    });
    page.drawText('TOTAL PAYÉ', {
      x: 64,
      y: summaryY - 7,
      font: bold,
      size: 9,
      color: muted,
    });
    page.drawText(
      cleanPdfText(`${money.format(payment.amountPaid)} ${payment.currency}`),
      {
        x: 365,
        y: summaryY - 12,
        font: bold,
        size: 18,
        color: blue,
      },
    );

    const paymentDetailsY = summaryY - 73;
    page.drawText('MOYEN DE PAIEMENT', {
      x: 48,
      y: paymentDetailsY,
      font: bold,
      size: 8,
      color: muted,
    });
    page.drawText(
      payment.method === PaymentMethod.WAVE ? 'Wave' : 'Orange Money',
      { x: 48, y: paymentDetailsY - 17, font: bold, size: 10, color: navy },
    );
    page.drawText('RÉFÉRENCE PAYTECH', {
      x: 300,
      y: paymentDetailsY,
      font: bold,
      size: 8,
      color: muted,
    });
    wrapText(payment.providerReference ?? 'Non communiquée', 235, regular, 9)
      .slice(0, 2)
      .forEach((line, index) => {
        page.drawText(line, {
          x: 300,
          y: paymentDetailsY - 17 - index * 12,
          font: regular,
          size: 9,
          color: navy,
        });
      });

    page.drawLine({
      start: { x: 48, y: 93 },
      end: { x: 547, y: 93 },
      thickness: 0.7,
      color: rgb(224 / 255, 229 / 255, 241 / 255),
    });
    page.drawText('Merci pour votre confiance.', {
      x: 48,
      y: 72,
      font: bold,
      size: 10,
      color: navy,
    });
    page.drawText(
      'Ce document confirme le paiement indiqué ci-dessus. Conservez-le pour vos dossiers.',
      { x: 48, y: 55, font: regular, size: 8, color: muted },
    );
    page.drawText('Sunu Tech Hub', {
      x: 461,
      y: 72,
      font: bold,
      size: 9,
      color: blue,
    });

    return Buffer.from(await document.save());
  }

  private getItemName(object: PaymentObject, courseTitle: string) {
    const title = cleanPdfText(courseTitle);
    switch (object) {
      case PaymentObject.INSCRIPTION_BASE:
        return `Inscription - version de base - ${title}`;
      case PaymentObject.INSCRIPTION_AVANCE:
        return `Inscription - version avancée - ${title}`;
      case PaymentObject.PASSAGE_AVANCE:
        return `Passage à la version avancée - ${title}`;
      case PaymentObject.ATTESTATION:
        return `Attestation de réussite - ${title}`;
    }
  }
}
