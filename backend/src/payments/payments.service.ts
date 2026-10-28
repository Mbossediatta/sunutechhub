import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CourseLevel,
  PaymentMethod,
  PaymentObject,
  PaymentStatus,
  ProjectStatus,
  PromotionType,
  RedemptionStatus,
} from '@prisma/client';
import { randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { PricingService } from '../pricing/pricing.service.js';
import type { CheckoutDto } from './dto/checkout.dto.js';
import type { PayTechCallbackDto } from './dto/paytech-callback.dto.js';
import { addAccessDays, calculateDiscount } from './pricing-calculation.js';
import { PayTechService } from './paytech.service.js';

const ENROLLMENT_OBJECTS = new Set<PaymentObject>([
  PaymentObject.INSCRIPTION_BASE,
  PaymentObject.INSCRIPTION_AVANCE,
  PaymentObject.PASSAGE_AVANCE,
]);

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly payTech: PayTechService,
  ) {}

  async checkout(userId: string, input: CheckoutDto) {
    const payTechConfiguration = this.payTech.getConfigurationStatus();
    if (!payTechConfiguration.ready) {
      throw new ServiceUnavailableException(
        `Configuration PayTech incomplète : ${payTechConfiguration.issues.join(' ')}`,
      );
    }

    const [user, course, defaults, registration] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true },
      }),
      this.prisma.course.findFirst({
        where: { id: input.courseId, active: true },
      }),
      this.pricing.getValues(),
      this.prisma.courseRegistration.findUnique({
        where: { userId_courseId: { userId, courseId: input.courseId } },
      }),
    ]);
    if (!user) throw new UnauthorizedException('Compte introuvable.');
    if (!course) throw new NotFoundException('Cours introuvable.');

    const now = new Date();
    const registrationActive = Boolean(
      registration && (!registration.endsAt || registration.endsAt > now),
    );
    let object = input.object;
    let level: CourseLevel | null = null;
    let amountBeforePromo: number;
    let projectId: string | null = null;

    if (input.object === PaymentObject.ATTESTATION) {
      const project = await this.prisma.courseProject.findFirst({
        where: { userId, courseId: course.id, status: ProjectStatus.APPROVED },
        orderBy: { reviewedAt: 'desc' },
        select: { id: true },
      });
      if (!project) {
        throw new ForbiddenException(
          'L’attestation de réussite est disponible après validation du projet.',
        );
      }
      amountBeforePromo = course.attestationPrice ?? defaults.prix_attestation;
      projectId = project.id;
    } else {
      if (course.isFree) {
        throw new ConflictException(
          'Ce cours est gratuit : inscrivez-vous sans passer par le paiement.',
        );
      }

      if (input.object === PaymentObject.INSCRIPTION_BASE) {
        if (registrationActive && registration?.level === CourseLevel.AVANCE) {
          throw new ConflictException(
            'Une inscription avancée est active; elle ne peut pas être remplacée par la version de base.',
          );
        }
        object = PaymentObject.INSCRIPTION_BASE;
        level = CourseLevel.BASE;
        amountBeforePromo = course.basePrice ?? defaults.prix_cours_base;
      } else {
        level = CourseLevel.AVANCE;
        if (registrationActive && registration?.level === CourseLevel.BASE) {
          object = PaymentObject.PASSAGE_AVANCE;
          amountBeforePromo =
            course.upgradePrice ?? defaults.prix_passage_avance;
        } else {
          object = PaymentObject.INSCRIPTION_AVANCE;
          amountBeforePromo =
            course.advancedPrice ?? defaults.prix_cours_avance;
        }
      }
    }

    const reference = `STH-${randomUUID()}`;
    const payment = await this.prisma.$transaction(async (transaction) => {
      let promotion: {
        id: string;
        code: string;
        type: PromotionType;
        value: number;
      } | null = null;
      let currentPromotion: {
        active: boolean;
        startsAt: Date;
        expiresAt: Date;
        usageLimit: number | null;
        usedCount: number;
      } | null = null;
      let discountAmount = 0;
      if (input.promoCode) {
        promotion = await transaction.promotion.findUnique({
          where: { code: input.promoCode.toUpperCase() },
          select: { id: true, code: true, type: true, value: true },
        });
        if (!promotion)
          throw new BadRequestException('Code promotionnel invalide.');

        currentPromotion = await transaction.promotion.findUnique({
          where: { id: promotion.id },
          select: {
            active: true,
            startsAt: true,
            expiresAt: true,
            usageLimit: true,
            usedCount: true,
          },
        });
        if (
          !currentPromotion?.active ||
          currentPromotion.startsAt > now ||
          currentPromotion.expiresAt <= now
        ) {
          throw new BadRequestException(
            'Ce code promotionnel n’est pas actif.',
          );
        }
        if (
          currentPromotion.usageLimit !== null &&
          currentPromotion.usedCount >= currentPromotion.usageLimit
        ) {
          throw new BadRequestException(
            'Ce code promotionnel a atteint sa limite d’utilisation.',
          );
        }
        discountAmount = calculateDiscount(
          amountBeforePromo,
          promotion.type,
          promotion.value,
        );
      }

      const amountPaid = amountBeforePromo - discountAmount;
      const created = await transaction.payment.create({
        data: {
          reference,
          userId,
          courseId: course.id,
          registrationId: registration?.id,
          projectId,
          promotionId: promotion?.id,
          object,
          level,
          method: PaymentMethod.WAVE,
          amountBeforePromo,
          amountPaid,
          discountAmount,
          currency: defaults.devise,
          accessDays: ENROLLMENT_OBJECTS.has(object)
            ? defaults.duree_acces_jours
            : 0,
          promoCode: promotion?.code,
        },
      });

      if (promotion && currentPromotion) {
        if (currentPromotion.usageLimit !== null) {
          const reservation = await transaction.promotion.updateMany({
            where: {
              id: promotion.id,
              usedCount: { lt: currentPromotion.usageLimit },
            },
            data: { usedCount: { increment: 1 } },
          });
          if (reservation.count !== 1) {
            throw new BadRequestException(
              'Ce code promotionnel a atteint sa limite d’utilisation.',
            );
          }
        } else {
          await transaction.promotion.update({
            where: { id: promotion.id },
            data: { usedCount: { increment: 1 } },
          });
        }
        await transaction.promotionRedemption.create({
          data: { promotionId: promotion.id, paymentId: created.id },
        });
      }
      return created;
    });

    if (payment.amountPaid === 0) {
      await this.markPaid(payment.id, payment.method);
      return this.getForUser(payment.id, userId);
    }

    try {
      const checkout = await this.payTech.createCheckout({
        itemName: this.getItemName(payment.object, course.title),
        amount: payment.amountPaid,
        currency: payment.currency,
        reference: payment.reference,
        paymentId: payment.id,
      });
      return this.prisma.payment.update({
        where: { id: payment.id },
        data: checkout,
        select: {
          id: true,
          reference: true,
          object: true,
          status: true,
          amountBeforePromo: true,
          amountPaid: true,
          discountAmount: true,
          currency: true,
          checkoutUrl: true,
          createdAt: true,
        },
      });
    } catch (error) {
      await this.releaseFailedPayment(payment.id, PaymentStatus.FAILED);
      throw error;
    }
  }

  async handlePayTechCallback(callback: PayTechCallbackDto) {
    if (
      !this.payTech.verifyCallbackHashes(
        callback.api_key_sha256,
        callback.api_secret_sha256,
      )
    ) {
      throw new UnauthorizedException('Notification PayTech invalide.');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { reference: callback.ref_command },
    });
    if (!payment)
      throw new NotFoundException('Paiement correspondant introuvable.');

    if (callback.type_event === 'sale_complete') {
      if (
        payment.amountPaid !== callback.item_price ||
        (payment.currency.toUpperCase() === 'FCFA'
          ? 'XOF'
          : payment.currency.toUpperCase()) !== callback.currency.toUpperCase()
      ) {
        throw new BadRequestException(
          'Le montant ou la devise de la notification ne correspond pas au paiement.',
        );
      }
      const actualMethod = this.parsePayTechMethod(callback.payment_method);
      await this.markPaid(payment.id, actualMethod);
      return { received: true };
    }

    if (
      callback.type_event === 'sale_canceled' ||
      callback.type_event === 'sale_failed'
    ) {
      await this.releaseFailedPayment(
        payment.id,
        callback.type_event === 'sale_canceled'
          ? PaymentStatus.CANCELLED
          : PaymentStatus.FAILED,
      );
    }
    return { received: true };
  }

  listMine(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      select: {
        id: true,
        reference: true,
        object: true,
        level: true,
        status: true,
        amountBeforePromo: true,
        amountPaid: true,
        discountAmount: true,
        currency: true,
        method: true,
        promoCode: true,
        createdAt: true,
        paidAt: true,
        checkoutUrl: true,
        course: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  listAdmin() {
    return this.prisma.payment.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async cancelMine(reference: string, userId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { reference, userId },
    });
    if (!payment) throw new NotFoundException('Paiement introuvable.');
    if (payment.status !== PaymentStatus.PENDING) {
      throw new ConflictException(
        'Seul un paiement en attente peut être annulé.',
      );
    }
    await this.releaseFailedPayment(payment.id, PaymentStatus.CANCELLED);
    return { reference, status: PaymentStatus.CANCELLED };
  }

  private async getForUser(paymentId: string, userId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, userId },
      select: {
        id: true,
        reference: true,
        object: true,
        level: true,
        status: true,
        amountBeforePromo: true,
        amountPaid: true,
        discountAmount: true,
        currency: true,
        createdAt: true,
        paidAt: true,
      },
    });
    if (!payment) throw new NotFoundException('Paiement introuvable.');
    return payment;
  }

  private async markPaid(paymentId: string, method: PaymentMethod) {
    await this.prisma.$transaction(async (transaction) => {
      const payment = await transaction.payment.findUnique({
        where: { id: paymentId },
        include: {
          user: { select: { id: true, name: true, email: true } },
          course: { select: { id: true, title: true, instructorName: true } },
        },
      });
      if (!payment) throw new NotFoundException('Paiement introuvable.');
      if (payment.status === PaymentStatus.PAID) return;
      if (payment.status !== PaymentStatus.PENDING) {
        throw new ConflictException('Ce paiement n’est plus en attente.');
      }

      const paidAt = new Date();
      await transaction.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.PAID, method, paidAt },
      });

      if (payment.object === PaymentObject.ATTESTATION) {
        if (!payment.courseId || !payment.projectId || !payment.course) {
          throw new ConflictException(
            'Les informations du cours ou du projet validé sont manquantes.',
          );
        }
        await transaction.attestation.create({
          data: {
            number: `STH-${paidAt.getUTCFullYear()}-${randomBytes(6).toString('hex').toUpperCase()}`,
            userId: payment.userId,
            courseId: payment.courseId,
            paymentId: payment.id,
          },
        });
      } else if (ENROLLMENT_OBJECTS.has(payment.object)) {
        if (!payment.courseId || !payment.level) {
          throw new ConflictException(
            'Les informations d’inscription au cours sont manquantes.',
          );
        }
        const oldRegistration = await transaction.courseRegistration.findUnique(
          {
            where: {
              userId_courseId: {
                userId: payment.userId,
                courseId: payment.courseId,
              },
            },
          },
        );
        const isUpgrade = payment.object === PaymentObject.PASSAGE_AVANCE;
        const baseAccessStillActive = Boolean(
          oldRegistration?.endsAt && oldRegistration.endsAt > paidAt,
        );
        const accessStart =
          isUpgrade && baseAccessStillActive
            ? (oldRegistration?.startsAt ?? paidAt)
            : oldRegistration?.endsAt && oldRegistration.endsAt > paidAt
              ? oldRegistration.endsAt
              : paidAt;
        const accessEnd =
          isUpgrade && baseAccessStillActive
            ? (oldRegistration?.endsAt ??
              addAccessDays(paidAt, payment.accessDays))
            : addAccessDays(accessStart, payment.accessDays);
        const registration = await transaction.courseRegistration.upsert({
          where: {
            userId_courseId: {
              userId: payment.userId,
              courseId: payment.courseId,
            },
          },
          update: {
            level: payment.level,
            startsAt: accessStart,
            endsAt: accessEnd,
            reminderSentAt:
              isUpgrade && baseAccessStillActive
                ? (oldRegistration?.reminderSentAt ?? null)
                : null,
          },
          create: {
            userId: payment.userId,
            courseId: payment.courseId,
            level: payment.level,
            startsAt: accessStart,
            endsAt: accessEnd,
          },
        });
        await transaction.payment.update({
          where: { id: payment.id },
          data: { registrationId: registration.id },
        });
      }

      await transaction.promotionRedemption.updateMany({
        where: { paymentId: payment.id, status: RedemptionStatus.RESERVED },
        data: { status: RedemptionStatus.REDEEMED },
      });
      if (payment.user.email) {
        const courseTitle = payment.course?.title ?? 'Cours';
        const object = this.getItemName(payment.object, courseTitle);
        const date = new Intl.DateTimeFormat('fr-FR', {
          dateStyle: 'long',
          timeZone: 'Africa/Dakar',
        }).format(paidAt);
        await transaction.receiptOutbox.upsert({
          where: { paymentId: payment.id },
          update: {},
          create: {
            paymentId: payment.id,
            recipient: payment.user.email,
            subject: `Reçu de paiement — ${object}`,
            text: [
              `Bonjour ${payment.user.name},`,
              '',
              'Nous confirmons la réception de votre paiement.',
              `Objet : ${object}`,
              `Montant payé : ${new Intl.NumberFormat('fr-FR').format(payment.amountPaid)} ${payment.currency}`,
              `Date : ${date}`,
              `Référence : ${payment.reference}`,
              '',
              'Sunu Tech Hub',
            ].join('\n'),
          },
        });
      }
    });
  }

  private async releaseFailedPayment(paymentId: string, status: PaymentStatus) {
    await this.prisma.$transaction(async (transaction) => {
      const payment = await transaction.payment.findUnique({
        where: { id: paymentId },
        select: {
          status: true,
          redemption: { select: { id: true, promotionId: true, status: true } },
        },
      });
      if (!payment || payment.status !== PaymentStatus.PENDING) return;
      await transaction.payment.update({
        where: { id: paymentId },
        data: { status },
      });

      if (payment.redemption?.status === RedemptionStatus.RESERVED) {
        await transaction.promotionRedemption.update({
          where: { id: payment.redemption.id },
          data: { status: RedemptionStatus.RELEASED },
        });
        await transaction.promotion.update({
          where: { id: payment.redemption.promotionId },
          data: { usedCount: { decrement: 1 } },
        });
      }
    });
  }

  private getItemName(object: PaymentObject, courseTitle: string) {
    switch (object) {
      case PaymentObject.INSCRIPTION_BASE:
        return `Inscription de base — ${courseTitle}`;
      case PaymentObject.INSCRIPTION_AVANCE:
        return `Inscription avancée — ${courseTitle}`;
      case PaymentObject.PASSAGE_AVANCE:
        return `Passage à la version avancée — ${courseTitle}`;
      case PaymentObject.ATTESTATION:
        return `Attestation de réussite — ${courseTitle}`;
    }
  }

  private parsePayTechMethod(method: string): PaymentMethod {
    const normalized = method.toLowerCase();
    if (normalized.includes('wave')) return PaymentMethod.WAVE;
    if (normalized.includes('orange')) return PaymentMethod.ORANGE_MONEY;
    throw new BadRequestException(
      'PayTech a retourné un moyen de paiement non pris en charge.',
    );
  }
}
