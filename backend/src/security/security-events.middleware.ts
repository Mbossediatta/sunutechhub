import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { NextFunction, Request, Response } from 'express';
import { isIP } from 'node:net';
import { PrismaService } from '../prisma/prisma.service.js';

function normalizeIp(value: string | undefined) {
  if (!value) return null;
  return value.startsWith('::ffff:') ? value.slice(7) : value;
}

function isTrustedProxy(request: Request, trustedProxyIps: string[]) {
  const remoteAddress = normalizeIp(request.socket.remoteAddress);
  if (!remoteAddress) return false;
  if (['127.0.0.1', '::1'].includes(remoteAddress)) return true;
  return trustedProxyIps.includes(remoteAddress);
}

type EventDetails = {
  eventType: string;
  severity: string;
  reason?: string;
};

export function detectSuspiciousRequest(request: Request) {
  const input =
    `${request.path} ${request.originalUrl.split('?').slice(1).join('?')} ${JSON.stringify(request.body ?? {})}`.slice(
      0,
      10_000,
    );
  if (
    /(?:union\s+(?:all\s+)?select|drop\s+table|(?:'|%27)\s*(?:or|and)\s+['"\d])/i.test(
      input,
    )
  ) {
    return 'SQL_INJECTION_PROBE';
  }
  if (/<\s*script\b/i.test(input)) return 'XSS_PROBE';
  if (/(?:\.\.[/\\]){1,}/i.test(input)) return 'PATH_TRAVERSAL_PROBE';
  return null;
}

export function maskAccount(value: unknown) {
  if (typeof value !== 'string') return null;
  const account = value.trim().toLowerCase();
  if (!account || account.length > 254) return null;
  const [name, domain] = account.split('@');
  if (domain) return `${name.slice(0, 1)}***@${domain}`;
  return `${account.slice(0, 1)}***`;
}

export function classifyEvent(
  request: Request,
  statusCode: number,
): EventDetails | null {
  const path = request.path;
  const suspiciousReason = detectSuspiciousRequest(request);
  if (suspiciousReason) {
    return {
      eventType: 'SUSPICIOUS_REQUEST',
      severity: 'HIGH',
      reason: suspiciousReason,
    };
  }
  const isLogin =
    request.method === 'POST' &&
    (path === '/api/auth/login' ||
      path === '/api/auth/magic-link/verify' ||
      path === '/api/auth/google/callback');

  if (statusCode >= 500) {
    if (path.startsWith('/api/webhooks/paytech')) {
      return {
        eventType: 'PAYTECH_WEBHOOK_ERROR',
        severity: 'HIGH',
        reason: 'PAYTECH_WEBHOOK_SERVER_ERROR',
      };
    }
    return {
      eventType: 'APPLICATION_ERROR',
      severity: 'HIGH',
      reason: 'HTTP_5XX',
    };
  }
  if (path.startsWith('/api/webhooks/paytech') && statusCode >= 400) {
    return {
      eventType: 'PAYTECH_WEBHOOK_REJECTED',
      severity: 'HIGH',
      reason: 'HTTP_4XX',
    };
  }
  if (
    statusCode >= 400 &&
    (statusCode === 413 ||
      request.get('content-type')?.includes('multipart/form-data')) &&
    path.includes('/projects')
  ) {
    return {
      eventType: 'UPLOAD_REJECTED',
      severity: 'MEDIUM',
      reason: `HTTP_${statusCode}`,
    };
  }
  if (statusCode === 429) {
    return {
      eventType: 'RATE_LIMITED',
      severity: 'MEDIUM',
      reason: 'RATE_LIMIT_EXCEEDED',
    };
  }
  if (statusCode === 401) {
    return isLogin
      ? { eventType: 'LOGIN_FAILED', severity: 'MEDIUM' }
      : { eventType: 'UNAUTHENTICATED_REQUEST', severity: 'MEDIUM' };
  }
  if (statusCode === 403) {
    return { eventType: 'ACCESS_DENIED', severity: 'MEDIUM' };
  }
  if (isLogin && statusCode < 400) {
    return { eventType: 'LOGIN_SUCCESS', severity: 'INFO' };
  }
  if (
    path.startsWith('/api/admin/') &&
    ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method) &&
    statusCode < 400
  ) {
    return { eventType: 'ADMIN_ACTION', severity: 'INFO' };
  }
  if (path.startsWith('/api/webhooks/paytech') && statusCode < 400) {
    return { eventType: 'PAYTECH_WEBHOOK_ACCEPTED', severity: 'INFO' };
  }
  return null;
}

@Injectable()
export class SecurityEventsMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityEventsMiddleware.name);
  private readonly trustedProxyIps: string[];

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.trustedProxyIps = config
      .get<string>('TRUSTED_PROXY_IPS', '')
      .split(',')
      .map((ip) => normalizeIp(ip.trim()))
      .filter((ip): ip is string => Boolean(ip && isIP(ip)));
  }

  use(request: Request, response: Response, next: NextFunction) {
    response.once('finish', () => {
      const event = classifyEvent(request, response.statusCode);
      if (!event) return;

      const authenticatedRequest = request as Request & {
        user?: { id?: string };
      };
      const sourceIp = isTrustedProxy(request, this.trustedProxyIps)
        ? request.ip
        : request.socket.remoteAddress;
      const body = request.body as { email?: unknown } | undefined;
      void this.prisma.securityEvent
        .create({
          data: {
            ...event,
            sourceIp: sourceIp?.slice(0, 100) ?? null,
            userAgent: request.get('user-agent')?.slice(0, 500) ?? null,
            method: request.method,
            path: request.path.slice(0, 500),
            statusCode: response.statusCode,
            reason: event.reason ?? null,
            targetAccount:
              event.eventType === 'LOGIN_FAILED'
                ? maskAccount(body?.email)
                : null,
            userId: authenticatedRequest.user?.id ?? null,
          },
        })
        .catch((error: unknown) => {
          const detail =
            error instanceof Error ? error.message : 'Erreur inconnue.';
          this.logger.error(
            `Impossible d’enregistrer un événement sécurité : ${detail}`,
          );
        });
    });
    next();
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { timeZone: 'Africa/Dakar' })
  async deleteExpiredEvents() {
    const retentionDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.securityEvent.deleteMany({
      where: { createdAt: { lt: retentionDate } },
    });
    if (result.count > 0) {
      this.logger.log(`${result.count} anciens événements sécurité supprimés.`);
    }
  }
}
