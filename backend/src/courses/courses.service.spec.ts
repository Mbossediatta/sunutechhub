import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { PricingService } from '../pricing/pricing.service.js';
import { CoursesService } from './courses.service.js';
import { SupabaseCourseStorageService } from './supabase-course-storage.service.js';

describe('CoursesService course content', () => {
  let courses: CoursesService;
  const prisma = {
    user: {
      findUnique: vi.fn(),
    },
    course: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    courseRegistration: {
      findUnique: vi.fn(),
    },
    courseContent: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    courseContentNotification: {
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
    lessonProgress: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  };
  const pricing = {
    getValues: vi.fn().mockResolvedValue({
      prix_cours_base: 1000,
      prix_cours_avance: 3000,
      prix_passage_avance: 2000,
      prix_attestation: 2000,
      duree_acces_jours: 30,
      devise: 'FCFA',
    }),
  };
  const storage = {
    isStoragePath: (value: string) => value.startsWith('storage://'),
    createSignedDownloadUrl: vi.fn(),
    deleteCoursePdf: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: PrismaService, useValue: prisma },
        { provide: PricingService, useValue: pricing },
        { provide: SupabaseCourseStorageService, useValue: storage },
      ],
    }).compile();
    courses = module.get(CoursesService);
  });

  it('refuses course content when the member has no active registration', async () => {
    prisma.course.findFirst.mockResolvedValue({ id: 'course-1' });
    prisma.courseRegistration.findUnique.mockResolvedValue(null);

    await expect(
      courses.listEnrolledContent('member-1', 'course-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.courseContent.findMany).not.toHaveBeenCalled();
  });

  it('refuses course content after the registration has expired', async () => {
    prisma.course.findFirst.mockResolvedValue({ id: 'course-1' });
    prisma.courseRegistration.findUnique.mockResolvedValue({
      startsAt: null,
      endsAt: new Date(Date.now() - 60_000),
    });

    await expect(
      courses.listEnrolledContent('member-1', 'course-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.courseContent.findMany).not.toHaveBeenCalled();
  });

  it('returns only published items in course order to an active member', async () => {
    prisma.course.findFirst.mockResolvedValue({ id: 'course-1' });
    prisma.courseRegistration.findUnique.mockResolvedValue({
      startsAt: null,
      endsAt: null,
    });
    prisma.courseContent.findMany.mockResolvedValue([
      {
        id: 'lesson-1',
        title: 'Première leçon',
        url: 'https://example.com/lesson',
      },
    ]);

    await expect(
      courses.listEnrolledContent('member-1', 'course-1'),
    ).resolves.toEqual([
      {
        id: 'lesson-1',
        title: 'Première leçon',
        url: 'https://example.com/lesson',
      },
    ]);
    expect(prisma.courseContent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { courseId: 'course-1', published: true },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      }),
    );
  });

  it('creates a temporary PDF link only after verifying active course access', async () => {
    prisma.course.findFirst.mockResolvedValue({ id: 'course-1' });
    prisma.courseRegistration.findUnique.mockResolvedValue({
      startsAt: null,
      endsAt: null,
    });
    prisma.courseContent.findFirst.mockResolvedValue({
      url: 'storage://courses/course-1/file.pdf',
    });
    storage.createSignedDownloadUrl.mockResolvedValue(
      'https://storage.example/file.pdf?token=signed',
    );

    await expect(
      courses.getEnrolledContentFileUrl('member-1', 'course-1', 'content-1'),
    ).resolves.toEqual({
      url: 'https://storage.example/file.pdf?token=signed',
    });
    expect(prisma.courseContent.findFirst).toHaveBeenCalledWith({
      where: { id: 'content-1', courseId: 'course-1', published: true },
      select: { url: true },
    });
    expect(storage.createSignedDownloadUrl).toHaveBeenCalledWith(
      'storage://courses/course-1/file.pdf',
    );
  });

  it('uses the published lesson and resource count on public course cards', async () => {
    prisma.course.findMany.mockResolvedValue([
      {
        id: 'course-1',
        title: 'Introduction au python',
        description: 'Apprendre Python.',
        isFree: false,
        basePrice: null,
        advancedPrice: null,
        upgradePrice: null,
        attestationPrice: null,
        lessons: 0,
        _count: { contents: 1 },
      },
    ]);

    const [course] = await courses.list();

    expect(course.lessons).toBe(1);
    expect(course).not.toHaveProperty('_count');
    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          _count: {
            select: {
              contents: {
                where: {
                  published: true,
                  type: { in: ['VIDEO', 'RESOURCE'] },
                },
              },
            },
          },
        },
      }),
    );
  });

  it('uses the actual lesson and resource count in the admin course list', async () => {
    prisma.course.findMany.mockResolvedValue([
      {
        id: 'course-1',
        title: 'Introduction au python',
        description: 'Apprendre Python.',
        isFree: false,
        basePrice: null,
        advancedPrice: null,
        upgradePrice: null,
        attestationPrice: null,
        lessons: 0,
        _count: { registrations: 3, contents: 4 },
      },
    ]);

    const [course] = await courses.listAdmin();

    expect(course.lessons).toBe(4);
    expect(course._count.registrations).toBe(3);
    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          _count: {
            select: {
              registrations: true,
              contents: {
                where: {
                  type: { in: ['VIDEO', 'RESOURCE'] },
                },
              },
            },
          },
          instructor: { select: { id: true, name: true, email: true } },
        },
      }),
    );
  });

  it('creates instructor courses as unpublished drafts assigned to their creator', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'trainer-1',
      name: 'Formateur',
      role: 'FORMATEUR',
    });
    prisma.course.create.mockResolvedValue({
      id: 'course-1',
      active: false,
    });

    await courses.createTrainerCourse('trainer-1', {
      title: 'Cours de test',
      description: 'Description du cours de test.',
    });

    expect(prisma.course.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          instructorId: 'trainer-1',
          instructorName: 'Formateur',
          isFree: false,
          active: false,
        }),
      }),
    );
  });

  it('does not let a trainer edit content on another instructor’s course', async () => {
    prisma.course.findFirst.mockResolvedValue(null);

    await expect(
      courses.updateTrainerContent('trainer-1', 'course-2', 'lesson-1', {
        title: 'Modification non autorisée',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.courseContent.update).not.toHaveBeenCalled();
  });

  it('returns progress only for the trainer’s assigned course', async () => {
    prisma.course.findFirst.mockResolvedValue({
      id: 'course-1',
      title: 'Cours de test',
      registrations: [
        {
          level: 'BASE',
          createdAt: new Date('2026-10-01T00:00:00.000Z'),
          endsAt: null,
          user: { id: 'member-1', name: 'Membre' },
        },
      ],
      _count: { contents: 2 },
    });
    prisma.lessonProgress.findMany.mockResolvedValue([{ userId: 'member-1' }]);

    await expect(
      courses.getTrainerProgress('trainer-1', 'course-1'),
    ).resolves.toMatchObject({
      totalLessons: 2,
      students: [{ id: 'member-1', completed: 1 }],
    });
    expect(prisma.course.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'course-1', instructorId: 'trainer-1' },
      }),
    );
  });

  it('queues an email notification for active course members when content is published', async () => {
    const transaction = {
      courseContent: {
        create: vi.fn().mockResolvedValue({
          id: 'content-1',
          published: true,
        }),
      },
      courseRegistration: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { user: { email: 'member@example.com', name: 'Membre' } },
          ]),
      },
      courseContentNotification: {
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    prisma.course.findUnique.mockResolvedValue({ id: 'course-1' });
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    );

    await courses.createContent('course-1', {
      type: 'VIDEO',
      title: 'Nouvelle leçon',
      url: 'https://example.com/lesson',
      published: true,
    });

    expect(transaction.courseRegistration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          courseId: 'course-1',
          AND: expect.any(Array),
        }),
        select: { user: { select: { email: true, name: true } } },
      }),
    );
    expect(
      transaction.courseContentNotification.createMany,
    ).toHaveBeenCalledWith({
      data: [
        {
          contentId: 'content-1',
          recipient: 'member@example.com',
          recipientName: 'Membre',
        },
      ],
      skipDuplicates: true,
    });
  });

  it('returns completed lesson progress only to an actively registered member', async () => {
    prisma.course.findFirst.mockResolvedValue({ id: 'course-1' });
    prisma.courseRegistration.findUnique.mockResolvedValue({
      startsAt: null,
      endsAt: null,
    });
    prisma.courseContent.findMany.mockResolvedValue([
      {
        id: 'lesson-1',
        type: 'VIDEO',
        title: 'Variables',
        progress: [{ completedAt: new Date('2026-10-28T12:00:00Z') }],
      },
      {
        id: 'lesson-2',
        type: 'RESOURCE',
        title: 'Exercices',
        progress: [],
      },
    ]);

    await expect(courses.getProgress('member-1', 'course-1')).resolves.toEqual({
      courseId: 'course-1',
      total: 2,
      completed: 1,
      lessons: [
        {
          id: 'lesson-1',
          type: 'VIDEO',
          title: 'Variables',
          completedAt: new Date('2026-10-28T12:00:00Z'),
        },
        {
          id: 'lesson-2',
          type: 'RESOURCE',
          title: 'Exercices',
          completedAt: null,
        },
      ],
    });
  });

  it('refuses to record progress when the member has no active registration', async () => {
    prisma.course.findFirst.mockResolvedValue({ id: 'course-1' });
    prisma.courseRegistration.findUnique.mockResolvedValue(null);

    await expect(
      courses.updateProgress('member-1', 'course-1', 'lesson-1', true),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.lessonProgress.upsert).not.toHaveBeenCalled();
  });
});
