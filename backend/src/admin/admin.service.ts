import { Injectable } from '@nestjs/common';
import { CourseLevel, PaymentStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listCourses() {
    const [courses, defaults] = await Promise.all([
      this.prisma.course.findMany({
        include: { _count: { select: { registrations: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.priceSetting.findMany(),
    ]);
    const settings = new Map(defaults.map(({ key, value }) => [key, Number(value)]));
    return courses.map((course) => ({
      ...course,
      prices: {
        base: course.isFree
          ? 0
          : (course.basePrice ?? settings.get('prix_cours_base') ?? 0),
        advanced: course.isFree
          ? 0
          : (course.advancedPrice ?? settings.get('prix_cours_avance') ?? 0),
        upgrade:
          course.upgradePrice ?? settings.get('prix_passage_avance') ?? 0,
        attestation:
          course.attestationPrice ?? settings.get('prix_attestation') ?? 0,
        accessDays: settings.get('duree_acces_jours') ?? 0,
        currency: defaults.find(({ key }) => key === 'devise')?.value ?? 'FCFA',
      },
    }));
  }

  listUsers(search?: string) {
    const normalized = search?.trim();
    return this.prisma.user.findMany({
      where: normalized
        ? {
            OR: [
              { name: { contains: normalized, mode: 'insensitive' } },
              { email: { contains: normalized, mode: 'insensitive' } },
            ],
          }
        : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        registrations: {
          include: { course: { select: { id: true, title: true } } },
          orderBy: { updatedAt: 'desc' },
        },
        _count: {
          select: { registrations: true, payments: true, projects: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async getDashboard() {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setUTCHours(0, 0, 0, 0);
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now);
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const reminderWindow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const [
      members,
      administrators,
      newMembersWeek,
      newMembersMonth,
      activeRegistrations,
      baseRegistrations,
      advancedRegistrations,
      paidPayments,
      revenueDay,
      revenueWeek,
      revenueMonth,
      pendingProjects,
      projectsAwaitingReview,
      endingRegistrations,
      recentMembers,
      missingPricing,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: UserRole.MEMBER } }),
      this.prisma.user.count({ where: { role: UserRole.ADMIN } }),
      this.prisma.user.count({
        where: { role: UserRole.MEMBER, createdAt: { gte: weekStart } },
      }),
      this.prisma.user.count({
        where: { role: UserRole.MEMBER, createdAt: { gte: monthStart } },
      }),
      this.prisma.courseRegistration.count({
        where: { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      }),
      this.prisma.courseRegistration.count({
        where: {
          level: CourseLevel.BASE,
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        },
      }),
      this.prisma.courseRegistration.count({
        where: {
          level: CourseLevel.AVANCE,
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        },
      }),
      this.prisma.payment.count({ where: { status: PaymentStatus.PAID } }),
      this.revenueSince(dayStart),
      this.revenueSince(weekStart),
      this.revenueSince(monthStart),
      this.prisma.courseProject.count({ where: { status: 'PENDING' } }),
      this.prisma.courseProject.findMany({
        where: { status: 'PENDING' },
        include: {
          user: { select: { name: true, email: true } },
          course: { select: { title: true } },
        },
        orderBy: { submittedAt: 'asc' },
        take: 5,
      }),
      this.prisma.courseRegistration.count({
        where: { endsAt: { gt: now, lte: reminderWindow } },
      }),
      this.prisma.user.findMany({
        where: { role: UserRole.MEMBER },
        select: { id: true, name: true, email: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.priceSetting.count({
        where: {
          key: {
            in: [
              'prix_cours_base',
              'prix_cours_avance',
              'prix_passage_avance',
              'prix_attestation',
              'duree_acces_jours',
              'devise',
            ],
          },
        },
      }),
    ]);

    return {
      generatedAt: now,
      members,
      administrators,
      newMembersWeek,
      newMembersMonth,
      activeRegistrations,
      baseRegistrations,
      advancedRegistrations,
      paidPayments,
      revenue: {
        day: revenueDay,
        week: revenueWeek,
        month: revenueMonth,
        currency: 'FCFA',
      },
      pendingProjects,
      projectsAwaitingReview,
      endingRegistrations,
      recentMembers,
      pricingConfigured: missingPricing === 6,
    };
  }

  private async revenueSince(start: Date) {
    const aggregate = await this.prisma.payment.aggregate({
      where: { status: PaymentStatus.PAID, paidAt: { gte: start } },
      _sum: { amountPaid: true },
    });
    return aggregate._sum.amountPaid ?? 0;
  }
}
