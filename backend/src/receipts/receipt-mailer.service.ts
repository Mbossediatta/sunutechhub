import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ReceiptMailerService {
  private readonly logger = new Logger(ReceiptMailerService.name);
  private warnedMissingConfig = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
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
        await transporter.sendMail({
          from,
          to: message.recipient,
          subject: message.subject,
          text: message.text,
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
