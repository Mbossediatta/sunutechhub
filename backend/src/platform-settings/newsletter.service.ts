import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  createNewsletterUnsubscribeToken,
  isValidNewsletterUnsubscribeToken,
} from './newsletter-unsubscribe-token.js';

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

type NewsletterCampaign = {
  key: string;
  subject: string;
  body: string;
  link: string | null;
  announcementId?: string;
  eventId?: string;
};

export async function queueNewsletterCampaign(
  transaction: Prisma.TransactionClient,
  campaign: NewsletterCampaign,
) {
  const [users, subscribers] = await Promise.all([
    transaction.user.findMany({
      where: { newsletterSubscribed: true },
      select: { id: true, email: true, name: true },
    }),
    transaction.newsletterSubscriber.findMany({
      where: { unsubscribedAt: null },
      select: { id: true, email: true },
    }),
  ]);
  const recipients = new Map<
    string,
    {
      userId: string | null;
      subscriberId: string | null;
      recipientEmail: string;
      recipientName: string;
    }
  >();

  for (const subscriber of subscribers) {
    const email = subscriber.email.trim().toLowerCase();
    recipients.set(email, {
      userId: null,
      subscriberId: subscriber.id,
      recipientEmail: email,
      recipientName: '',
    });
  }
  for (const user of users) {
    const email = user.email.trim().toLowerCase();
    if (!recipients.has(email)) {
      recipients.set(email, {
        userId: user.id,
        subscriberId: null,
        recipientEmail: email,
        recipientName: user.name,
      });
    }
  }

  if (!recipients.size) return 0;
  const queued = await transaction.newsletterDelivery.createMany({
    data: [...recipients.values()].map((recipient) => ({
      ...recipient,
      campaignKey: campaign.key,
      announcementId: campaign.announcementId,
      eventId: campaign.eventId,
      subject: campaign.subject,
      body: campaign.body,
      link: campaign.link,
    })),
    skipDuplicates: true,
  });
  return queued.count;
}

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);
  private warnedMissingConfig = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async subscribe(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    await this.prisma.newsletterSubscriber.upsert({
      where: { email: normalizedEmail },
      update: { subscribedAt: new Date(), unsubscribedAt: null },
      create: { email: normalizedEmail },
    });
    return {
      success: true,
      message: 'Inscription à la newsletter confirmée.',
    };
  }

  async unsubscribe(userId: string, token: string) {
    if (!userId) {
      throw new BadRequestException('Le lien de désabonnement est invalide.');
    }
    const secret = this.config.getOrThrow<string>('JWT_SECRET');
    if (!isValidNewsletterUnsubscribeToken(userId, token, secret)) {
      throw new BadRequestException('Le lien de désabonnement est invalide.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    await Promise.all([
      this.prisma.user.updateMany({
        where: { id: userId, newsletterSubscribed: true },
        data: { newsletterSubscribed: false, newsletterSubscribedAt: null },
      }),
      user
        ? this.prisma.newsletterSubscriber.updateMany({
            where: { email: user.email, unsubscribedAt: null },
            data: { unsubscribedAt: new Date() },
          })
        : Promise.resolve({ count: 0 }),
    ]);
    return { success: true };
  }

  async unsubscribeSubscriber(subscriberId: string, token: string) {
    const secret = this.config.getOrThrow<string>('JWT_SECRET');
    if (
      !subscriberId ||
      !isValidNewsletterUnsubscribeToken(subscriberId, token, secret)
    ) {
      throw new BadRequestException('Le lien de désabonnement est invalide.');
    }

    const subscriber = await this.prisma.newsletterSubscriber.findUnique({
      where: { id: subscriberId },
      select: { email: true },
    });
    if (!subscriber) return { success: true };
    await Promise.all([
      this.prisma.newsletterSubscriber.updateMany({
        where: { id: subscriberId, unsubscribedAt: null },
        data: { unsubscribedAt: new Date() },
      }),
      this.prisma.user.updateMany({
        where: { email: subscriber.email, newsletterSubscribed: true },
        data: { newsletterSubscribed: false, newsletterSubscribedAt: null },
      }),
    ]);
    return { success: true };
  }

  queueEventNotification(
    transaction: Prisma.TransactionClient,
    event: {
      id: string;
      title: string;
      description: string;
      startsAt: Date;
      location: string;
      mode: string;
      active: boolean;
    },
  ) {
    if (!event.active || event.startsAt <= new Date()) return Promise.resolve(0);
    const frontendUrl = this.config
      .get<string>('FRONTEND_URL')
      ?.replace(/\/+$/, '');
    const details = [
      event.description,
      `Date : ${new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'Africa/Dakar',
      }).format(event.startsAt)}`,
      `Lieu : ${event.location}`,
      `Format : ${event.mode === 'ONLINE' ? 'En ligne' : 'Présentiel'}`,
    ].join('\n\n');
    return queueNewsletterCampaign(transaction, {
      key: `event:${event.id}`,
      eventId: event.id,
      subject: `Nouvel événement : ${event.title}`,
      body: details,
      link: frontendUrl ? `${frontendUrl}/evenements` : null,
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async sendPendingAnnouncements() {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const password =
      this.config.get<string>('SMTP_PASSWORD') ||
      this.config.get<string>('SMTP_PASS');
    const from = this.config.get<string>('SMTP_FROM');
    const frontendUrl = this.config
      .get<string>('FRONTEND_URL')
      ?.replace(/\/+$/, '');
    if (!host || !user || !password || !from || !frontendUrl) {
      if (!this.warnedMissingConfig) {
        this.logger.warn(
          'Les e-mails de newsletter restent en attente : configurez SMTP et FRONTEND_URL.',
        );
        this.warnedMissingConfig = true;
      }
      return;
    }
    this.warnedMissingConfig = false;

    const now = new Date();
    const deliveries = await this.prisma.newsletterDelivery.findMany({
      where: {
        sentAt: null,
        cancelledAt: null,
        nextAttemptAt: { lte: now },
        OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
      },
      orderBy: { createdAt: 'asc' },
      take: 25,
    });
    if (!deliveries.length) return;

    const transporter = nodemailer.createTransport({
      host,
      port: Number(this.config.get<string>('SMTP_PORT', '587')),
      secure: this.config.get<string>('SMTP_SECURE') === 'true',
      auth: { user, pass: password },
    });

    try {
      for (const delivery of deliveries) {
        const claimed = await this.prisma.newsletterDelivery.updateMany({
          where: {
            id: delivery.id,
            sentAt: null,
            cancelledAt: null,
            OR: [{ lockedUntil: null }, { lockedUntil: { lt: new Date() } }],
          },
          data: { lockedUntil: new Date(Date.now() + 5 * 60_000) },
        });
        if (!claimed.count) continue;

        const [currentUser, currentSubscriber] = await Promise.all([
          delivery.userId
            ? this.prisma.user.findUnique({
                where: { id: delivery.userId },
                select: { newsletterSubscribed: true },
              })
            : null,
          delivery.subscriberId
            ? this.prisma.newsletterSubscriber.findUnique({
                where: { id: delivery.subscriberId },
                select: { unsubscribedAt: true },
              })
            : null,
        ]);
        if (
          (delivery.userId && !currentUser?.newsletterSubscribed) ||
          (delivery.subscriberId && currentSubscriber?.unsubscribedAt) ||
          (!delivery.userId && !delivery.subscriberId)
        ) {
          await this.prisma.newsletterDelivery.update({
            where: { id: delivery.id },
            data: { cancelledAt: new Date(), lockedUntil: null },
          });
          continue;
        }

        const unsubscribeId = delivery.subscriberId ?? delivery.userId;
        if (!unsubscribeId) {
          throw new Error(`L’envoi newsletter ${delivery.id} n’a pas d’abonné associé.`);
        }
        const token = createNewsletterUnsubscribeToken(
          unsubscribeId,
          this.config.getOrThrow<string>('JWT_SECRET'),
        );
        const unsubscribeUrl = new URL(
          '/newsletter/desabonnement',
          frontendUrl,
        );
        unsubscribeUrl.searchParams.set(
          delivery.subscriberId ? 'subscriberId' : 'userId',
          unsubscribeId,
        );
        unsubscribeUrl.searchParams.set('token', token);
        const title = escapeHtml(delivery.subject);
        const body = escapeHtml(delivery.body).replace(/\r?\n/g, '<br>');
        const recipientName = escapeHtml(delivery.recipientName);
        const greeting = recipientName ? `Bonjour ${recipientName},` : 'Bonjour,';
        const safeUnsubscribeUrl = escapeHtml(unsubscribeUrl.toString());
        const link = delivery.link
          ? `<p style="margin:24px 0"><a href="${escapeHtml(delivery.link)}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#2b4eff;color:#fff;text-decoration:none;font-weight:700">En savoir plus</a></p>`
          : '';
        const text = [
          greeting,
          '',
          delivery.subject,
          delivery.body,
          delivery.link ?? '',
          '',
          `Pour ne plus recevoir la newsletter : ${unsubscribeUrl.toString()}`,
          '',
          'Sunu Tech Hub',
        ]
          .filter(Boolean)
          .join('\n');
        const html = `<!doctype html>
<html lang="fr"><body style="margin:0;padding:24px 12px;background:#f3f5fa;font-family:Arial,Helvetica,sans-serif;color:#111830">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:620px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden">
    <tr><td style="padding:24px 30px;background:#0e1630;color:#fff;font-size:20px;font-weight:700">Sunu Tech Hub</td></tr>
    <tr><td style="padding:28px 30px"><p>${greeting}</p><h1 style="font-size:23px;line-height:1.3">${title}</h1><p style="color:#4d5870;line-height:1.7">${body}</p>${link}<p style="margin-top:32px;font-size:12px;color:#667085">Tu reçois cet e-mail parce que tu as choisi de t’abonner à la newsletter Sunu Tech Hub. <a href="${safeUnsubscribeUrl}" style="color:#4d5870">Se désabonner</a>.</p></td></tr>
  </table>
</body></html>`;

        try {
          await transporter.sendMail({
            from,
            subject: `Sunu Tech Hub — ${delivery.subject}`,
            text,
            html,
            to: delivery.recipientEmail,
          });
          await this.prisma.newsletterDelivery.update({
            where: { id: delivery.id },
            data: { sentAt: new Date(), lockedUntil: null, lastError: null },
          });
        } catch (error) {
          const attempts = delivery.attempts + 1;
          const retryMinutes = Math.min(360, 2 ** Math.min(attempts, 8));
          const detail =
            error instanceof Error ? error.message : 'Erreur SMTP inconnue.';
          await this.prisma.newsletterDelivery.update({
            where: { id: delivery.id },
            data: {
              attempts,
              lastError: detail.slice(0, 1000),
              nextAttemptAt: new Date(Date.now() + retryMinutes * 60_000),
              lockedUntil: null,
            },
          });
          this.logger.error(
            `Échec d’envoi de l’e-mail de newsletter ${delivery.id}; nouvel essai dans ${retryMinutes} minutes.`,
          );
        }
      }
    } finally {
      await transporter.close();
    }
  }
}
