import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { AttestationsService } from './attestations.service.js';

describe('AttestationsService free course certificates', () => {
  const transaction = {
    course: { findFirst: vi.fn() },
    courseRegistration: { findUnique: vi.fn() },
    courseContent: { findMany: vi.fn() },
    lessonProgress: { count: vi.fn() },
    attestation: { upsert: vi.fn() },
  };
  const prisma = {
    $transaction: vi.fn(),
  };
  let attestations: AttestationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation((callback) => callback(transaction));
    transaction.course.findFirst.mockResolvedValue({
      id: 'course-1',
      isFree: true,
    });
    transaction.courseRegistration.findUnique.mockResolvedValue({
      startsAt: null,
      endsAt: null,
    });
    transaction.courseContent.findMany.mockResolvedValue([
      { id: 'lesson-1' },
      { id: 'lesson-2' },
    ]);
    transaction.lessonProgress.count.mockResolvedValue(2);
    transaction.attestation.upsert.mockResolvedValue({
      number: 'STH-2026-ABC123',
      issuedAt: new Date('2026-10-29T12:00:00.000Z'),
    });
    attestations = new AttestationsService(
      prisma as unknown as PrismaService,
      {} as ConfigService,
    );
  });

  it('refuses to issue a free-course certificate for a paid course', async () => {
    transaction.course.findFirst.mockResolvedValue({
      id: 'course-1',
      isFree: false,
    });

    await expect(
      attestations.issueFreeCourse('member-1', 'course-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction.attestation.upsert).not.toHaveBeenCalled();
  });

  it('requires an active course registration', async () => {
    transaction.courseRegistration.findUnique.mockResolvedValue(null);

    await expect(
      attestations.issueFreeCourse('member-1', 'course-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction.courseContent.findMany).not.toHaveBeenCalled();
  });

  it('refuses courses without published content', async () => {
    transaction.courseContent.findMany.mockResolvedValue([]);

    await expect(
      attestations.issueFreeCourse('member-1', 'course-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction.lessonProgress.count).not.toHaveBeenCalled();
  });

  it('requires every published item to be marked complete', async () => {
    transaction.lessonProgress.count.mockResolvedValue(1);

    await expect(
      attestations.issueFreeCourse('member-1', 'course-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction.attestation.upsert).not.toHaveBeenCalled();
  });

  it('issues an idempotent certificate after all published items are complete', async () => {
    await expect(
      attestations.issueFreeCourse('member-1', 'course-1'),
    ).resolves.toMatchObject({ number: 'STH-2026-ABC123' });

    expect(transaction.attestation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { freeCourseKey: 'member-1:course-1' },
        update: {},
        create: expect.objectContaining({
          userId: 'member-1',
          courseId: 'course-1',
          freeCourseKey: 'member-1:course-1',
        }),
      }),
    );
  });
});
