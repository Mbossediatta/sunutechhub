import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { PricingService } from '../pricing/pricing.service.js';
import { CoursesService } from './courses.service.js';

describe('CoursesService course content', () => {
  let courses: CoursesService;
  const prisma = {
    course: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
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

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: PrismaService, useValue: prisma },
        { provide: PricingService, useValue: pricing },
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
      { id: 'lesson-1', title: 'Première leçon' },
    ]);

    await expect(
      courses.listEnrolledContent('member-1', 'course-1'),
    ).resolves.toEqual([{ id: 'lesson-1', title: 'Première leçon' }]);
    expect(prisma.courseContent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { courseId: 'course-1', published: true },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      }),
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
});
