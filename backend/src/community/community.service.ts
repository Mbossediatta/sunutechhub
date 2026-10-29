import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { NewsletterService } from '../platform-settings/newsletter.service.js';
import type { CreateAnswerDto } from './dto/create-answer.dto.js';
import type { CreateEventDto } from './dto/create-event.dto.js';
import type { CreateJobDto } from './dto/create-job.dto.js';
import type { CreateQuestionDto } from './dto/create-question.dto.js';
import type { CreateReportDto } from './dto/create-report.dto.js';
import type { ReviewJobDto } from './dto/review-job.dto.js';
import type { ReviewReportDto } from './dto/review-report.dto.js';
import type { UpdateEventDto } from './dto/update-event.dto.js';

const questionSummary = {
  id: true,
  title: true,
  body: true,
  subjects: true,
  status: true,
  createdAt: true,
  user: { select: { id: true, name: true } },
  _count: { select: { answers: { where: { hidden: false } } } },
} as const;

@Injectable()
export class CommunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly newsletter: NewsletterService,
  ) {}

  listQuestions() {
    return this.prisma.communityQuestion.findMany({
      where: { status: { in: ['OPEN', 'SOLVED'] } },
      select: questionSummary,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getQuestion(id: string) {
    const question = await this.prisma.communityQuestion.findFirst({
      where: { id, status: { in: ['OPEN', 'SOLVED'] } },
      include: {
        user: { select: { id: true, name: true } },
        answers: {
          where: { hidden: false },
          include: {
            user: { select: { id: true, name: true } },
            _count: {
              select: {
                likes: true,
                comments: true,
              },
            },
            comments: {
              include: { user: { select: { id: true, name: true } } },
              orderBy: { createdAt: 'desc' },
              take: 50,
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!question) throw new NotFoundException('Question introuvable.');
    return question;
  }

  createQuestion(userId: string, input: CreateQuestionDto) {
    return this.prisma.communityQuestion.create({
      data: {
        title: input.title.trim(),
        body: input.body.trim(),
        subjects: [
          ...new Set(
            (input.subjects ?? [])
              .map((subject) => subject.trim())
              .filter(Boolean),
          ),
        ],
        userId,
      },
      select: questionSummary,
    });
  }

  async createAnswer(
    userId: string,
    questionId: string,
    input: CreateAnswerDto,
  ) {
    const question = await this.prisma.communityQuestion.findFirst({
      where: { id: questionId, status: { in: ['OPEN', 'SOLVED'] } },
      select: { id: true, status: true },
    });
    if (!question) throw new NotFoundException('Question introuvable.');
    if (question.status === 'SOLVED') {
      throw new ConflictException(
        'Cette question est résolue et ne reçoit plus de réponses.',
      );
    }
    return this.prisma.communityAnswer.create({
      data: { questionId, userId, body: input.body.trim() },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  async getLikedAnswers(userId: string, questionId: string) {
    const question = await this.prisma.communityQuestion.findFirst({
      where: { id: questionId, status: { in: ['OPEN', 'SOLVED'] } },
      select: { id: true },
    });
    if (!question) throw new NotFoundException('Question introuvable.');

    const likes = await this.prisma.communityAnswerLike.findMany({
      where: { userId, answer: { questionId, hidden: false } },
      select: { answerId: true },
    });
    return likes.map(({ answerId }) => answerId);
  }

  async setAnswerLike(userId: string, answerId: string, liked: boolean) {
    const answer = await this.prisma.communityAnswer.findFirst({
      where: {
        id: answerId,
        hidden: false,
        question: { status: { in: ['OPEN', 'SOLVED'] } },
      },
      select: { id: true },
    });
    if (!answer) throw new NotFoundException('Réponse introuvable.');

    if (liked) {
      await this.prisma.communityAnswerLike.createMany({
        data: [{ userId, answerId }],
        skipDuplicates: true,
      });
    } else {
      await this.prisma.communityAnswerLike.deleteMany({
        where: { userId, answerId },
      });
    }

    const [count, existingLike] = await Promise.all([
      this.prisma.communityAnswerLike.count({ where: { answerId } }),
      this.prisma.communityAnswerLike.findUnique({
        where: { userId_answerId: { userId, answerId } },
        select: { answerId: true },
      }),
    ]);
    return { liked: Boolean(existingLike), count };
  }

  async createAnswerComment(userId: string, answerId: string, body: string) {
    const answer = await this.prisma.communityAnswer.findFirst({
      where: {
        id: answerId,
        hidden: false,
        question: { status: { in: ['OPEN', 'SOLVED'] } },
      },
      select: { id: true },
    });
    if (!answer) throw new NotFoundException('Réponse introuvable.');

    return this.prisma.communityAnswerComment.create({
      data: { answerId, userId, body: body.trim() },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  async createReport(reporterId: string, input: CreateReportDto) {
    const hasQuestion = Boolean(input.questionId);
    const hasAnswer = Boolean(input.answerId);
    if (hasQuestion === hasAnswer) {
      throw new BadRequestException(
        'Un signalement doit cibler une question ou une réponse, pas les deux.',
      );
    }
    if (hasQuestion) {
      const question = await this.prisma.communityQuestion.findUnique({
        where: { id: input.questionId },
        select: { id: true },
      });
      if (!question) throw new NotFoundException('Question introuvable.');
    } else {
      const answer = await this.prisma.communityAnswer.findUnique({
        where: { id: input.answerId },
        select: { id: true },
      });
      if (!answer) throw new NotFoundException('Réponse introuvable.');
    }
    return this.prisma.contentReport.create({
      data: {
        reporterId,
        questionId: input.questionId,
        answerId: input.answerId,
        reason: input.reason.trim(),
        details: input.details?.trim() || null,
      },
      select: { id: true, status: true, createdAt: true },
    });
  }

  listAdminQuestions() {
    return this.prisma.communityQuestion.findMany({
      select: questionSummary,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  listReports() {
    return this.prisma.contentReport.findMany({
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        reviewer: { select: { id: true, name: true } },
        question: {
          select: { id: true, title: true, body: true, status: true },
        },
        answer: {
          select: {
            id: true,
            body: true,
            hidden: true,
            question: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      take: 200,
    });
  }

  async reviewReport(id: string, reviewerId: string, input: ReviewReportDto) {
    const report = await this.prisma.contentReport.findUnique({
      where: { id },
      select: { id: true, questionId: true, answerId: true },
    });
    if (!report) throw new NotFoundException('Signalement introuvable.');

    return this.prisma.$transaction(async (transaction) => {
      if (input.hideTarget) {
        if (report.questionId) {
          await transaction.communityQuestion.update({
            where: { id: report.questionId },
            data: { status: 'HIDDEN' },
          });
        } else if (report.answerId) {
          await transaction.communityAnswer.update({
            where: { id: report.answerId },
            data: { hidden: true },
          });
        }
      }
      return transaction.contentReport.update({
        where: { id },
        data: {
          status: input.status,
          reviewerId,
          reviewedAt: new Date(),
        },
      });
    });
  }

  listEvents(includeInactive = false) {
    return this.prisma.communityEvent.findMany({
      where: includeInactive
        ? undefined
        : { active: true, startsAt: { gte: new Date() } },
      include: { _count: { select: { registrations: true } } },
      orderBy: { startsAt: 'asc' },
      take: 200,
    });
  }

  createEvent(adminId: string, input: CreateEventDto) {
    const startsAt = new Date(input.startsAt);
    const endsAt = input.endsAt ? new Date(input.endsAt) : null;
    if (endsAt && endsAt <= startsAt) {
      throw new BadRequestException(
        'La fin de l’événement doit être postérieure à son début.',
      );
    }
    return this.prisma.$transaction(async (transaction) => {
      const event = await transaction.communityEvent.create({
        data: {
          title: input.title.trim(),
          description: input.description.trim(),
          startsAt,
          endsAt,
          location: input.location.trim(),
          mode: input.mode,
          capacity: input.capacity ?? null,
          createdById: adminId,
        },
        include: { _count: { select: { registrations: true } } },
      });
      const newsletterQueued =
        await this.newsletter.queueEventNotification(transaction, event);
      return { ...event, newsletterQueued };
    });
  }

  async updateEvent(id: string, input: UpdateEventDto) {
    const current = await this.prisma.communityEvent.findUnique({
      where: { id },
      select: { id: true, startsAt: true, endsAt: true },
    });
    if (!current) throw new NotFoundException('Événement introuvable.');
    const nextStart = input.startsAt
      ? new Date(input.startsAt)
      : current.startsAt;
    const nextEnd =
      input.endsAt === undefined
        ? current.endsAt
        : input.endsAt === null
          ? null
          : new Date(input.endsAt);
    if (nextEnd && nextEnd <= nextStart) {
      throw new BadRequestException(
        'La fin de l’événement doit être postérieure à son début.',
      );
    }
    return this.prisma.communityEvent.update({
      where: { id },
      data: {
        ...input,
        startsAt: input.startsAt ? nextStart : undefined,
        endsAt: input.endsAt === undefined ? undefined : nextEnd,
        title: input.title?.trim(),
        description: input.description?.trim(),
        location: input.location?.trim(),
      },
      include: { _count: { select: { registrations: true } } },
    });
  }

  async registerForEvent(userId: string, eventId: string) {
    return this.prisma.$transaction(
      async (transaction) => {
        const event = await transaction.communityEvent.findFirst({
          where: { id: eventId, active: true, startsAt: { gt: new Date() } },
          select: {
            id: true,
            capacity: true,
            _count: { select: { registrations: true } },
          },
        });
        if (!event) throw new NotFoundException('Événement introuvable.');
        const existing = await transaction.eventRegistration.findUnique({
          where: { eventId_userId: { eventId, userId } },
          select: { id: true },
        });
        if (existing) return { registered: true, alreadyRegistered: true };
        if (
          event.capacity !== null &&
          event._count.registrations >= event.capacity
        ) {
          throw new ConflictException('Cet événement a atteint sa capacité.');
        }
        await transaction.eventRegistration.create({
          data: { eventId, userId },
        });
        return { registered: true, alreadyRegistered: false };
      },
      { isolationLevel: 'Serializable' },
    );
  }

  listJobs(includeUnpublished = false) {
    return this.prisma.jobOffer.findMany({
      where: includeUnpublished ? undefined : { status: JobStatus.PUBLISHED },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  createJob(adminId: string, input: CreateJobDto) {
    return this.prisma.jobOffer.create({
      data: {
        ...input,
        title: input.title.trim(),
        company: input.company.trim(),
        city: input.city.trim(),
        level: input.level.trim(),
        description: input.description.trim(),
        createdById: adminId,
      },
    });
  }

  async reviewJob(id: string, reviewerId: string, input: ReviewJobDto) {
    const job = await this.prisma.jobOffer.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!job) throw new NotFoundException('Offre introuvable.');
    return this.prisma.jobOffer.update({
      where: { id },
      data: { status: input.status, reviewedById: reviewerId },
    });
  }
}
