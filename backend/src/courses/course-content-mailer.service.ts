import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service.js';

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

@Injectable()
export class CourseContentMailerService {
  private readonly logger = new Logger(CourseContentMailerService.name);
  private warnedMissingConfig = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async sendPendingNotifications() {
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
          'Les notifications de cours restent en attente : configurez les paramètres SMTP et FRONTEND_URL.',
        );
        this.warnedMissingConfig = true;
      }
      return;
    }
    this.warnedMissingConfig = false;

    const now = new Date();
    const notifications = await this.prisma.courseContentNotification.findMany({
      where: {
        sentAt: null,
        nextAttemptAt: { lte: now },
        OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
      },
      include: {
        content: {
          include: { course: { select: { id: true, title: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 25,
    });
    if (!notifications.length) return;

    const transporter = nodemailer.createTransport({
      host,
      port: Number(this.config.get<string>('SMTP_PORT', '587')),
      secure: this.config.get<string>('SMTP_SECURE') === 'true',
      auth: { user, pass: password },
    });

    try {
      for (const notification of notifications) {
        const claimed = await this.prisma.courseContentNotification.updateMany({
          where: {
            id: notification.id,
            sentAt: null,
            OR: [{ lockedUntil: null }, { lockedUntil: { lt: new Date() } }],
          },
          data: { lockedUntil: new Date(Date.now() + 5 * 60_000) },
        });
        if (!claimed.count) continue;

        const courseUrl = `${frontendUrl}/cours/${encodeURIComponent(notification.content.course.id)}`;
        const title = escapeHtml(notification.content.title);
        const courseTitle = escapeHtml(notification.content.course.title);
        const description = escapeHtml(
          notification.content.description ||
            'Un nouveau contenu est disponible dans votre espace de cours.',
        );
        const safeName = escapeHtml(notification.recipientName);
        const contentType = this.contentTypeLabel(notification.content.type);
        const text = [
          `Bonjour ${notification.recipientName},`,
          '',
          `Un nouveau contenu vient d’être publié dans votre cours « ${notification.content.course.title} » :`,
          `${notification.content.title} (${contentType})`,
          notification.content.description || '',
          '',
          `Retrouve-le dans ton espace de cours : ${courseUrl}`,
          '',
          'À bientôt,',
          'L’équipe Sunu Tech Hub',
        ]
          .filter(Boolean)
          .join('\n');
        const html = `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:24px 12px;background:#f3f5fa;font-family:Arial,Helvetica,sans-serif;color:#111830">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden">
      <tr><td style="padding:28px 32px;background:#0e1630;border-bottom:5px solid #7c5cff">
        <div style="font-size:20px;font-weight:700;color:#ffffff">Sunu Tech Hub</div>
        <div style="margin-top:5px;font-size:11px;letter-spacing:1px;color:#cdd6ee">NOUVEAU CONTENU DE COURS</div>
      </td></tr>
      <tr><td style="padding:30px 32px 12px">
        <div style="display:inline-block;padding:8px 12px;border-radius:20px;background:#f0edff;color:#6548d8;font-size:12px;font-weight:700">${contentType.toUpperCase()}</div>
        <h1 style="margin:18px 0 8px;font-size:23px;line-height:1.3">Bonjour ${safeName}, une nouveauté t’attend !</h1>
        <p style="margin:0;color:#5d6984;font-size:14px;line-height:1.6">Un nouveau contenu vient d’être publié dans ton cours <strong style="color:#111830">${courseTitle}</strong>.</p>
      </td></tr>
      <tr><td style="padding:14px 32px 24px">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e0e5f1;border-radius:12px">
          <tr><td style="padding:18px 20px">
            <div style="font-size:18px;font-weight:700;color:#111830">${title}</div>
            <p style="margin:9px 0 0;color:#5d6984;font-size:14px;line-height:1.6">${description}</p>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:0 32px 30px">
        <a href="${courseUrl}" style="display:inline-block;padding:13px 20px;border-radius:10px;background:#2b4eff;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700">Découvrir le contenu</a>
      </td></tr>
      <tr><td style="padding:20px 32px;background:#f8f9fc;color:#5d6984;font-size:12px;line-height:1.6">Tu reçois cet e-mail parce que tu es inscrit(e) à ce cours.<br><strong style="color:#111830">Sunu Tech Hub</strong></td></tr>
    </table>
  </body>
</html>`;

        try {
          await transporter.sendMail({
            from,
            to: notification.recipient,
            subject: `Nouveau contenu : ${notification.content.title} — ${notification.content.course.title}`,
            text,
            html,
          });
          await this.prisma.courseContentNotification.update({
            where: { id: notification.id },
            data: { sentAt: new Date(), lockedUntil: null, lastError: null },
          });
        } catch (error) {
          const attempts = notification.attempts + 1;
          const retryMinutes = Math.min(360, 2 ** Math.min(attempts, 8));
          const detail =
            error instanceof Error ? error.message : 'Erreur SMTP inconnue.';
          await this.prisma.courseContentNotification.update({
            where: { id: notification.id },
            data: {
              attempts,
              lastError: detail.slice(0, 1000),
              nextAttemptAt: new Date(Date.now() + retryMinutes * 60_000),
              lockedUntil: null,
            },
          });
          this.logger.error(
            `Échec d’envoi de la notification ${notification.id}; nouvel essai dans ${retryMinutes} minutes.`,
          );
        }
      }
    } finally {
      await transporter.close();
    }
  }

  private contentTypeLabel(type: string) {
    switch (type) {
      case 'VIDEO':
        return 'Leçon vidéo';
      case 'RESOURCE':
        return 'Support de cours';
      case 'LIVE_SESSION':
        return 'Séance en direct';
      default:
        return 'Contenu de cours';
    }
  }
}
