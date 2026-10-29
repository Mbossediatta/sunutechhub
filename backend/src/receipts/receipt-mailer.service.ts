import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReceiptPdfService } from './receipt-pdf.service.js';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

function formatAmount(amount: number, currency: string) {
  return `${new Intl.NumberFormat('fr-FR').format(amount)} ${escapeHtml(currency)}`;
}

function receiptItemName(payment: {
  object: string;
  course: { title: string } | null;
}) {
  const title = payment.course?.title;
  switch (payment.object) {
    case 'INSCRIPTION_BASE':
      return title
        ? `Inscription - version de base - ${title}`
        : 'Inscription - version de base';
    case 'INSCRIPTION_AVANCE':
      return title
        ? `Inscription - version avancée - ${title}`
        : 'Inscription - version avancée';
    case 'PASSAGE_AVANCE':
      return title
        ? `Passage à la version avancée - ${title}`
        : 'Passage à la version avancée';
    case 'ATTESTATION':
      return title
        ? `Attestation de réussite - ${title}`
        : 'Attestation de réussite';
    default:
      return title ?? 'Paiement';
  }
}

function receiptEmailHtml(payment: {
  reference: string;
  amountPaid: number;
  currency: string;
  method: string;
  providerReference: string | null;
  createdAt: Date;
  paidAt: Date | null;
  user: { name: string };
  course: { title: string } | null;
  object: string;
}) {
  const paidAt = payment.paidAt ?? payment.createdAt;
  const date = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Africa/Dakar',
  }).format(paidAt);
  const itemName = receiptItemName(payment);
  const method = payment.method === 'WAVE' ? 'Wave' : 'Orange Money';

  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:24px 12px;background:#f3f5fa;font-family:Arial,Helvetica,sans-serif;color:#111830">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden">
      <tr><td style="padding:28px 32px;background:#0e1630;border-bottom:5px solid #7c5cff">
        <div style="font-size:20px;font-weight:700;color:#ffffff">Sunu Tech Hub</div>
        <div style="margin-top:5px;font-size:11px;letter-spacing:1px;color:#cdd6ee">REÇU DE PAIEMENT</div>
      </td></tr>
      <tr><td style="padding:30px 32px 12px">
        <div style="display:inline-block;padding:8px 12px;border-radius:20px;background:#e8f8f2;color:#147457;font-size:12px;font-weight:700">PAIEMENT CONFIRMÉ</div>
        <h1 style="margin:18px 0 8px;font-size:23px;line-height:1.3">Merci pour votre paiement, ${escapeHtml(payment.user.name)}.</h1>
        <p style="margin:0;color:#5d6984;font-size:14px;line-height:1.6">Votre transaction a bien été confirmée. Retrouvez ci-dessous son récapitulatif et le reçu PDF détaillé en pièce jointe.</p>
      </td></tr>
      <tr><td style="padding:14px 32px 20px">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e0e5f1;border-radius:12px">
          <tr><td style="padding:16px 18px;border-bottom:1px solid #e0e5f1;color:#5d6984;font-size:13px">Objet</td><td style="padding:16px 18px;border-bottom:1px solid #e0e5f1;text-align:right;font-size:13px;font-weight:700">${escapeHtml(itemName)}</td></tr>
          <tr><td style="padding:16px 18px;border-bottom:1px solid #e0e5f1;color:#5d6984;font-size:13px">Date</td><td style="padding:16px 18px;border-bottom:1px solid #e0e5f1;text-align:right;font-size:13px">${escapeHtml(date)}</td></tr>
          <tr><td style="padding:16px 18px;border-bottom:1px solid #e0e5f1;color:#5d6984;font-size:13px">Moyen de paiement</td><td style="padding:16px 18px;border-bottom:1px solid #e0e5f1;text-align:right;font-size:13px">${method}</td></tr>
          <tr><td style="padding:16px 18px;border-bottom:1px solid #e0e5f1;color:#5d6984;font-size:13px">Référence Sunu Tech Hub</td><td style="padding:16px 18px;border-bottom:1px solid #e0e5f1;text-align:right;font-size:13px">${escapeHtml(payment.reference)}</td></tr>
          <tr><td style="padding:16px 18px;color:#5d6984;font-size:13px">Référence PayTech</td><td style="padding:16px 18px;text-align:right;font-size:13px">${escapeHtml(payment.providerReference ?? 'Non communiquée')}</td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:0 32px 26px">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f5f7ff;border-radius:12px">
          <tr><td style="padding:18px;color:#5d6984;font-size:13px;font-weight:700">TOTAL PAYÉ</td><td style="padding:18px;text-align:right;color:#2b4eff;font-size:22px;font-weight:700">${formatAmount(payment.amountPaid, payment.currency)}</td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:20px 32px;background:#f8f9fc;color:#5d6984;font-size:12px;line-height:1.6">Le reçu PDF joint reprend les informations de cette transaction. Conservez-le pour vos dossiers.<br><strong style="color:#111830">Sunu Tech Hub</strong></td></tr>
    </table>
  </body>
</html>`;
}

function receiptEmailText(payment: {
  reference: string;
  amountPaid: number;
  currency: string;
  method: string;
  providerReference: string | null;
  createdAt: Date;
  paidAt: Date | null;
  user: { name: string };
  course: { title: string } | null;
  object: string;
}) {
  const date = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Africa/Dakar',
  }).format(payment.paidAt ?? payment.createdAt);
  return [
    `Bonjour ${payment.user.name},`,
    '',
    'Votre paiement a été confirmé. Votre reçu PDF détaillé est joint à cet e-mail.',
    `Objet : ${receiptItemName(payment)}`,
    `Montant payé : ${formatAmount(payment.amountPaid, payment.currency)}`,
    `Date : ${date}`,
    `Moyen : ${payment.method === 'WAVE' ? 'Wave' : 'Orange Money'}`,
    `Référence Sunu Tech Hub : ${payment.reference}`,
    `Référence PayTech : ${payment.providerReference ?? 'Non communiquée'}`,
    '',
    'Merci pour votre confiance.',
    'Sunu Tech Hub',
  ].join('\n');
}

@Injectable()
export class ReceiptMailerService {
  private readonly logger = new Logger(ReceiptMailerService.name);
  private warnedMissingConfig = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly receiptPdf: ReceiptPdfService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async sendPendingReceipts() {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const password =
      this.config.get<string>('SMTP_PASSWORD') ||
      this.config.get<string>('SMTP_PASS');
    const from = this.config.get<string>('SMTP_FROM');
    if (!host || !user || !password || !from) {
      if (!this.warnedMissingConfig) {
        this.logger.warn(
          'Les reçus restent en attente : configurez SMTP_HOST, SMTP_USER, SMTP_PASSWORD (ou SMTP_PASS) et SMTP_FROM.',
        );
        this.warnedMissingConfig = true;
      }
      return;
    }
    this.warnedMissingConfig = false;

    const messages = await this.prisma.receiptOutbox.findMany({
      where: { sentAt: null, nextAttemptAt: { lte: new Date() } },
      orderBy: { createdAt: 'asc' },
      take: 25,
    });
    const transporter = nodemailer.createTransport({
      host,
      port: Number(this.config.get<string>('SMTP_PORT', '587')),
      secure: this.config.get<string>('SMTP_SECURE') === 'true',
      auth: { user, pass: password },
    });

    for (const message of messages) {
      try {
        const payment = await this.prisma.payment.findUnique({
          where: { id: message.paymentId },
          include: {
            user: { select: { name: true, email: true } },
            course: { select: { title: true } },
          },
        });
        if (!payment || payment.status !== PaymentStatus.PAID) {
          throw new Error(
            `Paiement confirmé introuvable pour le reçu ${message.id}.`,
          );
        }
        const pdf = await this.receiptPdf.build(payment);
        await transporter.sendMail({
          from,
          to: message.recipient,
          subject: message.subject,
          text: receiptEmailText(payment),
          html: receiptEmailHtml(payment),
          attachments: [
            {
              filename: `recu-sunu-tech-hub-${payment.reference.replace(/[^a-zA-Z0-9_-]/g, '-')}.pdf`,
              content: pdf,
              contentType: 'application/pdf',
            },
          ],
        });
        await this.prisma.receiptOutbox.update({
          where: { id: message.id },
          data: { sentAt: new Date(), lastError: null },
        });
      } catch (error) {
        const attempts = message.attempts + 1;
        const retryMinutes = Math.min(360, 2 ** Math.min(attempts, 8));
        const detail =
          error instanceof Error ? error.message : 'Erreur SMTP inconnue.';
        await this.prisma.receiptOutbox.update({
          where: { id: message.id },
          data: {
            attempts,
            lastError: detail.slice(0, 1000),
            nextAttemptAt: new Date(Date.now() + retryMinutes * 60_000),
          },
        });
        this.logger.error(
          `Échec d’envoi du reçu ${message.id}; nouvel essai dans ${retryMinutes} minutes.`,
        );
      }
    }
    await transporter.close();
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM, { timeZone: 'Africa/Dakar' })
  async sendUpcomingRenewalReminders() {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const password =
      this.config.get<string>('SMTP_PASSWORD') ||
      this.config.get<string>('SMTP_PASS');
    const from = this.config.get<string>('SMTP_FROM');
    if (!host || !user || !password || !from) return;

    const now = new Date();
    const reminderWindow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const registrations = await this.prisma.courseRegistration.findMany({
      where: {
        endsAt: { gt: now, lte: reminderWindow },
        reminderSentAt: null,
        user: { email: { not: '' } },
      },
      include: {
        user: { select: { email: true, name: true } },
        course: { select: { id: true, title: true } },
      },
      take: 100,
    });
    const transporter = nodemailer.createTransport({
      host,
      port: Number(this.config.get<string>('SMTP_PORT', '587')),
      secure: this.config.get<string>('SMTP_SECURE') === 'true',
      auth: { user, pass: password },
    });
    const frontendUrl = this.config
      .getOrThrow<string>('FRONTEND_URL')
      .replace(/\/+$/, '');

    for (const registration of registrations) {
      try {
        const endsAt = registration.endsAt;
        if (!endsAt) continue;
        await transporter.sendMail({
          from,
          to: registration.user.email,
          subject: `Rappel — votre accès au cours ${registration.course.title} arrive à échéance`,
          text: [
            `Bonjour ${registration.user.name},`,
            '',
            `Votre accès au cours « ${registration.course.title} » se termine le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'Africa/Dakar' }).format(endsAt)}.`,
            'Aucun prélèvement automatique ne sera effectué. Vous pouvez renouveler votre inscription manuellement si vous souhaitez continuer.',
            `${frontendUrl}/cours/${registration.course.id}`,
            '',
            'Sunu Tech Hub',
          ].join('\n'),
        });
        await this.prisma.courseRegistration.update({
          where: { id: registration.id },
          data: { reminderSentAt: new Date() },
        });
      } catch (error) {
        const detail =
          error instanceof Error ? error.message : 'Erreur SMTP inconnue.';
        this.logger.error(
          `Échec d’envoi du rappel pour l’inscription ${registration.id} : ${detail}`,
        );
      }
    }
    await transporter.close();
  }
}
