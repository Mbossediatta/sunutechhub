import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseContentType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { PricingService } from '../pricing/pricing.service.js';
import type { CreateCourseDto } from './dto/create-course.dto.js';
import type { UpdateCourseDto } from './dto/update-course.dto.js';
import type { UpdateCoursePricesDto } from './dto/update-course-prices.dto.js';

const COURSE_PRICE_FIELDS = [
  'basePrice',
  'advancedPrice',
  'upgradePrice',
  'attestationPrice',
] as const;

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  async list() {
    const [courses, defaults] = await Promise.all([
      this.prisma.course.findMany({
        where: { active: true },
        include: {
          _count: {
            select: {
              contents: {
                where: {
                  published: true,
                  type: {
                    in: [CourseContentType.VIDEO, CourseContentType.RESOURCE],
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.pricing.getValues(),
    ]);
    return courses.map(({ _count, ...course }) =>
      this.withPrices(
        { ...course, lessons: _count.contents || course.lessons },
        defaults,
      ),
    );
  }

  async listAdmin() {
    const [courses, defaults] = await Promise.all([
      this.prisma.course.findMany({
        include: { _count: { select: { registrations: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.pricing.getValues(),
    ]);
    return courses.map((course) => this.withPrices(course, defaults));
  }

  async get(id: string) {
    const [course, defaults] = await Promise.all([
      this.prisma.course.findFirst({ where: { id, active: true } }),
      this.pricing.getValues(),
    ]);
    if (!course) throw new NotFoundException('Cours introuvable.');
    return this.withPrices(course, defaults);
  }

  create(input: CreateCourseDto) {
    return this.prisma.course.create({
      data: {
        title: input.title.trim(),
        description: input.description.trim(),
        language: input.language?.trim() || 'Français',
        level: input.level?.trim() || 'Débutant',
        instructorName: input.instructorName?.trim() || 'Sunu Tech Hub',
        duration: input.duration?.trim() || '',
        coverImageUrl: input.coverImageUrl?.trim() || null,
        lessons: input.lessons ?? 0,
        subjects: this.cleanSubjects(input.subjects ?? []),
        isFree: input.isFree ?? false,
        active: input.active ?? true,
      },
    });
  }

  async update(id: string, input: UpdateCourseDto) {
    const current = await this.prisma.course.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Cours introuvable.');
    const updated = await this.prisma.course.update({
      where: { id },
      data: {
        ...input,
        title: input.title?.trim(),
        description: input.description?.trim(),
        language: input.language?.trim(),
        level: input.level?.trim(),
        instructorName: input.instructorName?.trim(),
        duration: input.duration?.trim(),
        subjects:
          input.subjects === undefined
            ? undefined
            : this.cleanSubjects(input.subjects),
      },
    });
    return updated;
  }

  async updatePrices(
    id: string,
    input: UpdateCoursePricesDto,
    adminId: string,
  ) {
    const current = await this.prisma.course.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Cours introuvable.');

    await this.prisma.$transaction(async (transaction) => {
      const updateData: Record<string, string | number | boolean | null> = {};
      for (const [key, newValue] of Object.entries(input)) {
        if (newValue === undefined) continue;
        updateData[key] = newValue;

        if (
          COURSE_PRICE_FIELDS.includes(
            key as (typeof COURSE_PRICE_FIELDS)[number],
          )
        ) {
          const oldValue = current[key as (typeof COURSE_PRICE_FIELDS)[number]];
          if (oldValue !== newValue) {
            await transaction.priceChange.create({
              data: {
                key: `cours.${key}`,
                courseId: id,
                oldValue: oldValue === null ? null : String(oldValue),
                newValue: newValue === null ? 'null' : String(newValue),
                modifiedBy: adminId,
              },
            });
          }
        } else if (key === 'isFree' && current.isFree !== newValue) {
          await transaction.priceChange.create({
            data: {
              key: 'cours.isFree',
              courseId: id,
              oldValue: String(current.isFree),
              newValue: String(newValue),
              modifiedBy: adminId,
            },
          });
        }
      }
      await transaction.course.update({ where: { id }, data: updateData });
    });
    const [updated, defaults] = await Promise.all([
      this.prisma.course.findUnique({ where: { id } }),
      this.pricing.getValues(),
    ]);
    if (!updated) throw new NotFoundException('Cours introuvable.');
    return this.withPrices(updated, defaults);
  }

  async enrollFree(userId: string, id: string) {
    const course = await this.prisma.course.findFirst({
      where: { id, active: true },
    });
    if (!course) throw new NotFoundException('Cours introuvable.');
    if (!course.isFree) {
      throw new ConflictException(
        'Ce cours nécessite une inscription payante.',
      );
    }

    return this.prisma.courseRegistration.upsert({
      where: { userId_courseId: { userId, courseId: id } },
      update: { level: 'BASE', startsAt: null, endsAt: null },
      create: {
        userId,
        courseId: id,
        level: 'BASE',
        startsAt: null,
        endsAt: null,
      },
      select: {
        id: true,
        courseId: true,
        level: true,
        startsAt: true,
        endsAt: true,
      },
    });
  }

  listEnrollments(userId: string) {
    return this.prisma.courseRegistration.findMany({
      where: { userId },
      include: { course: { select: { id: true, title: true, isFree: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async listEnrolledContent(userId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, active: true },
      select: { id: true },
    });
    if (!course) throw new NotFoundException('Cours introuvable.');

    const now = new Date();
    const registration = await this.prisma.courseRegistration.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { startsAt: true, endsAt: true },
    });
    if (
      !registration ||
      (registration.startsAt !== null && registration.startsAt > now) ||
      (registration.endsAt !== null && registration.endsAt <= now)
    ) {
      throw new ForbiddenException(
        'Inscris-toi à ce cours pour accéder à ses leçons et séances.',
      );
    }

    return this.prisma.courseContent.findMany({
      where: { courseId, published: true },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        url: true,
        scheduledAt: true,
        position: true,
      },
    });
  }

  async listAdminContent(courseId: string) {
    await this.requireCourse(courseId);
    return this.prisma.courseContent.findMany({
      where: { courseId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createContent(
    courseId: string,
    input: {
      type: CourseContentType;
      title: string;
      description?: string;
      url: string;
      scheduledAt?: string | null;
      position?: number;
      published?: boolean;
    },
  ) {
    await this.requireCourse(courseId);
    const scheduledAt = this.contentSchedule(input.type, input.scheduledAt);
    return this.prisma.courseContent.create({
      data: {
        courseId,
        type: input.type,
        title: input.title.trim(),
        description: input.description?.trim() ?? '',
        url: input.url.trim(),
        scheduledAt,
        position: input.position ?? 0,
        published: input.published ?? false,
      },
    });
  }

  async updateContent(
    courseId: string,
    contentId: string,
    input: {
      type?: CourseContentType;
      title?: string;
      description?: string;
      url?: string;
      scheduledAt?: string | null;
      position?: number;
      published?: boolean;
    },
  ) {
    const current = await this.prisma.courseContent.findFirst({
      where: { id: contentId, courseId },
    });
    if (!current) throw new NotFoundException('Contenu du cours introuvable.');

    const type = input.type ?? current.type;
    const scheduledInput =
      input.scheduledAt === undefined
        ? current.scheduledAt?.toISOString() ?? null
        : input.scheduledAt;
    const scheduledAt = this.contentSchedule(type, scheduledInput);

    return this.prisma.courseContent.update({
      where: { id: contentId },
      data: {
        type: input.type,
        title: input.title?.trim(),
        description: input.description?.trim(),
        url: input.url?.trim(),
        scheduledAt,
        position: input.position,
        published: input.published,
      },
    });
  }

  async deleteContent(courseId: string, contentId: string) {
    const result = await this.prisma.courseContent.deleteMany({
      where: { id: contentId, courseId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Contenu du cours introuvable.');
    }
    return { deleted: true };
  }

  private async requireCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });
    if (!course) throw new NotFoundException('Cours introuvable.');
  }

  private contentSchedule(type: CourseContentType, value?: string | null) {
    if (type === CourseContentType.LIVE_SESSION) {
      if (!value) {
        throw new BadRequestException(
          'Une séance en direct doit avoir une date et une heure.',
        );
      }
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException('La date de la séance est invalide.');
      }
      return date;
    }
    if (value) {
      throw new BadRequestException(
        'La date est réservée aux séances en direct.',
      );
    }
    return null;
  }

  private withPrices<
    T extends {
      isFree: boolean;
      basePrice: number | null;
      advancedPrice: number | null;
      upgradePrice: number | null;
      attestationPrice: number | null;
    },
  >(course: T, defaults: Awaited<ReturnType<PricingService['getValues']>>) {
    return {
      ...course,
      prices: {
        base: course.isFree
          ? 0
          : (course.basePrice ?? defaults.prix_cours_base),
        advanced: course.isFree
          ? 0
          : (course.advancedPrice ?? defaults.prix_cours_avance),
        upgrade: course.isFree
          ? 0
          : (course.upgradePrice ?? defaults.prix_passage_avance),
        attestation: course.attestationPrice ?? defaults.prix_attestation,
        accessDays: defaults.duree_acces_jours,
        currency: defaults.devise,
      },
    };
  }

  private cleanSubjects(subjects: string[]) {
    return [...new Set(subjects.map((subject) => subject.trim()).filter(Boolean))];
  }
}
