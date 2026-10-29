import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ReviewProjectDto } from './dto/review-project.dto.js';
import type { SubmitProjectDto } from './dto/submit-project.dto.js';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  listPublished() {
    return this.prisma.courseProject.findMany({
      where: { status: ProjectStatus.APPROVED },
      include: {
        user: { select: { id: true, name: true, city: true } },
        course: { select: { id: true, title: true, subjects: true } },
      },
      orderBy: { reviewedAt: 'desc' },
    });
  }

  async getPublished(id: string) {
    const project = await this.prisma.courseProject.findFirst({
      where: { id, status: ProjectStatus.APPROVED },
      include: {
        user: { select: { id: true, name: true, city: true } },
        course: { select: { id: true, title: true, subjects: true } },
      },
    });
    if (!project) throw new NotFoundException('Projet introuvable.');
    return project;
  }

  listMine(userId: string) {
    return this.prisma.courseProject.findMany({
      where: { userId },
      include: { course: { select: { id: true, title: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async submit(userId: string, courseId: string, input: SubmitProjectDto) {
    const [course, registration] = await Promise.all([
      this.prisma.course.findFirst({
        where: { id: courseId, active: true },
        select: { id: true },
      }),
      this.prisma.courseRegistration.findUnique({
        where: { userId_courseId: { userId, courseId } },
      }),
    ]);
    if (!course) throw new NotFoundException('Cours introuvable.');
    if (!registration)
      throw new ForbiddenException(
        'Une inscription au cours est nécessaire pour rendre un projet.',
      );

    return this.prisma.courseProject.create({
      data: {
        userId,
        courseId,
        title: input.title.trim(),
        description: input.description.trim(),
        link: input.link,
      },
    });
  }

  listForReview() {
    return this.prisma.courseProject.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
      },
      orderBy: { submittedAt: 'asc' },
    });
  }

  async review(id: string, reviewerId: string, input: ReviewProjectDto) {
    if (
      input.status === ProjectStatus.NEEDS_IMPROVEMENT &&
      !input.reviewNote?.trim()
    ) {
      throw new BadRequestException(
        'Ajoutez un commentaire pour indiquer les améliorations attendues.',
      );
    }
    const project = await this.prisma.courseProject.findUnique({
      where: { id },
      select: { id: true, status: true, reviewNote: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable.');

    const reviewedAt = new Date();
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.courseProject.update({
        where: { id },
        data: {
          status: input.status,
          reviewNote: input.reviewNote?.trim() ?? null,
          reviewerId,
          reviewedAt,
        },
      });
      await transaction.adminAuditLog.create({
        data: {
          actorUserId: reviewerId,
          action: 'PROJECT_REVIEWED',
          entity: 'CourseProject',
          entityId: id,
          before: {
            status: project.status,
            reviewNote: project.reviewNote,
          },
          after: {
            status: updated.status,
            reviewNote: updated.reviewNote,
          },
        },
      });
      return updated;
    });
  }
}
