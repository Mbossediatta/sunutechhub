import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from '@prisma/client';
import { PayTechService } from '../payments/paytech.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SecurityEventsService {
  private readonly logger = new Logger(SecurityEventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly payTech: PayTechService,
  ) {}

  async getOverview() {
    const now = new Date();
    const dayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const hourStart = new Date(now.getTime() - 60 * 60 * 1000);

    const [
      total,
      failedLogins,
      suspiciousRequests,
      denied,
      rateLimited,
      recentEvents,
      suspiciousSources,
    ] = await Promise.all([
      this.prisma.securityEvent.count({
        where: { createdAt: { gte: dayStart } },
      }),
      this.prisma.securityEvent.count({
        where: {
          eventType: 'LOGIN_FAILED',
          createdAt: { gte: dayStart },
        },
      }),
      this.prisma.securityEvent.count({
        where: {
          eventType: 'SUSPICIOUS_REQUEST',
          createdAt: { gte: dayStart },
        },
      }),
      this.prisma.securityEvent.count({
        where: {
          eventType: { in: ['ACCESS_DENIED', 'UNAUTHENTICATED_REQUEST'] },
          createdAt: { gte: dayStart },
        },
      }),
      this.prisma.securityEvent.count({
        where: {
          eventType: 'RATE_LIMITED',
          createdAt: { gte: dayStart },
        },
      }),
      this.prisma.securityEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          eventType: true,
          severity: true,
          sourceIp: true,
          userAgent: true,
          method: true,
          path: true,
          statusCode: true,
          reason: true,
          targetAccount: true,
          createdAt: true,
        },
      }),
      this.prisma.$queryRaw<Array<{ sourceIp: string; attempts: number }>>`
          SELECT "sourceIp", COUNT(*)::int AS attempts
          FROM "SecurityEvent"
          WHERE "eventType" = 'LOGIN_FAILED'
            AND "createdAt" >= ${hourStart}
            AND "sourceIp" IS NOT NULL
          GROUP BY "sourceIp"
          HAVING COUNT(*) >= 5
          ORDER BY attempts DESC
          LIMIT 20
        `,
    ]);

    return {
      generatedAt: now,
      retentionDays: 90,
      summary: { total, failedLogins, suspiciousRequests, denied, rateLimited },
      suspiciousSources,
      recentEvents,
    };
  }

  async getErrors() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const groups = await this.prisma.$queryRaw<
      Array<{
        eventType: string;
        path: string;
        statusCode: number;
        count: number;
        lastSeen: Date;
        totalGroups: number;
      }>
    >`
      WITH grouped AS (
        SELECT "eventType", "path", "statusCode",
          COUNT(*)::int AS count, MAX("createdAt") AS "lastSeen"
        FROM "SecurityEvent"
        WHERE "eventType" IN (
          'APPLICATION_ERROR',
          'PAYTECH_WEBHOOK_ERROR',
          'PAYTECH_WEBHOOK_REJECTED'
        )
          AND "createdAt" >= ${since}
        GROUP BY "eventType", "path", "statusCode"
      )
      SELECT grouped.*, COUNT(*) OVER()::int AS "totalGroups"
      FROM grouped
      ORDER BY "lastSeen" DESC
      LIMIT 200
    `;
    return {
      events: groups.map(({ totalGroups: _totalGroups, ...event }) => event),
      truncated: (groups[0]?.totalGroups ?? 0) > groups.length,
    };
  }

  getAuditLog(filters: {
    search?: string;
    action?: string;
    from?: Date;
    to?: Date;
  }) {
    return this.prisma.adminAuditLog.findMany({
      where: {
        action: filters.action || undefined,
        createdAt:
          filters.from || filters.to
            ? {
                gte: filters.from,
                lte: filters.to,
              }
            : undefined,
        OR: filters.search
          ? [
              { entity: { contains: filters.search, mode: 'insensitive' } },
              { entityId: { contains: filters.search, mode: 'insensitive' } },
              { action: { contains: filters.search, mode: 'insensitive' } },
              {
                actor: {
                  is: {
                    OR: [
                      {
                        name: {
                          contains: filters.search,
                          mode: 'insensitive',
                        },
                      },
                      {
                        email: {
                          contains: filters.search,
                          mode: 'insensitive',
                        },
                      },
                    ],
                  },
                },
              },
            ]
          : undefined,
      },
      include: {
        actor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async getOperationalStatus() {
    const staleBefore = new Date(Date.now() - 30 * 60 * 1000);
    let database: {
      status: 'OK' | 'ERROR';
      sizeBytes: string | null;
      lastMigration: { name: string; appliedAt: Date } | null;
      tables: Array<{ name: string; rows: number; sizeBytes: string }>;
      error?: string;
    };
    let stalePendingPayments: number | null = null;
    try {
      const [
        databaseSize,
        userSize,
        questionSize,
        paymentSize,
        lastMigration,
        members,
        questions,
        payments,
        stalePayments,
      ] = await Promise.all([
        this.prisma.$queryRaw<Array<{ sizeBytes: string }>>`
          SELECT pg_database_size(current_database())::text AS "sizeBytes"
        `,
        this.prisma.$queryRaw<Array<{ sizeBytes: string }>>`
          SELECT pg_total_relation_size('"User"')::text AS "sizeBytes"
        `,
        this.prisma.$queryRaw<Array<{ sizeBytes: string }>>`
          SELECT pg_total_relation_size('"CommunityQuestion"')::text AS "sizeBytes"
        `,
        this.prisma.$queryRaw<Array<{ sizeBytes: string }>>`
          SELECT pg_total_relation_size('"Payment"')::text AS "sizeBytes"
        `,
        this.prisma.$queryRaw<Array<{ name: string; appliedAt: Date }>>`
          SELECT "migration_name" AS name, "finished_at" AS "appliedAt"
          FROM "_prisma_migrations"
          WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL
          ORDER BY "finished_at" DESC
          LIMIT 1
        `,
        this.prisma.user.count(),
        this.prisma.communityQuestion.count(),
        this.prisma.payment.count(),
        this.prisma.payment.count({
          where: {
            status: PaymentStatus.PENDING,
            createdAt: { lte: staleBefore },
          },
        }),
      ]);
      stalePendingPayments = stalePayments;
      database = {
        status: 'OK',
        sizeBytes: databaseSize[0]?.sizeBytes ?? null,
        lastMigration: lastMigration[0] ?? null,
        tables: [
          {
            name: 'Membres',
            rows: members,
            sizeBytes: userSize[0]?.sizeBytes ?? '0',
          },
          {
            name: 'Questions',
            rows: questions,
            sizeBytes: questionSize[0]?.sizeBytes ?? '0',
          },
          {
            name: 'Paiements',
            rows: payments,
            sizeBytes: paymentSize[0]?.sizeBytes ?? '0',
          },
        ],
      };
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Erreur inconnue.';
      this.logger.error(`Diagnostic base de données indisponible : ${detail}`);
      database = {
        status: 'ERROR',
        sizeBytes: null,
        lastMigration: null,
        tables: [],
        error: 'Le diagnostic de la base de données a échoué.',
      };
    }

    const configured = (name: string) =>
      Boolean(this.config.get<string>(name)?.trim());
    const smtpConfigured =
      configured('SMTP_HOST') &&
      configured('SMTP_USER') &&
      (configured('SMTP_PASSWORD') || configured('SMTP_PASS')) &&
      configured('SMTP_FROM');
    const memory = process.memoryUsage();
    return {
      generatedAt: new Date(),
      backend: {
        status: 'OK',
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        memoryBytes: { rss: memory.rss, heapUsed: memory.heapUsed },
      },
      frontend: { status: 'OK' },
      database,
      integrations: {
        paytech: this.payTech.getConfigurationStatus(),
        email: { configured: smtpConfigured },
        sms: { configured: false, status: 'NOT_CONFIGURED' },
      },
      backups: {
        configured: false,
        status: 'NOT_CONFIGURED',
        message:
          'Aucun fournisseur de sauvegarde n’est configuré ; aucune sauvegarde n’est lancée depuis l’administration.',
      },
      observability: {
        slowQueries: { configured: false },
        errorHistoryDays: 7,
      },
      stalePendingPayments,
    };
  }
}
