import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SupabaseCourseStorageService } from '../courses/supabase-course-storage.service.js';
import { ShowcaseProjectsService } from './showcase-projects.service.js';

describe('ShowcaseProjectsService', () => {
  const prisma = {
    showcaseProject: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    showcaseProjectLike: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
    },
    showcaseProjectComment: {
      create: vi.fn(),
    },
  };
  const storage = {
    getPublicShowcaseImageUrl: vi.fn((path: string) =>
      path.replace('storage://', 'https://storage.example/'),
    ),
    createSignedShowcaseImageUpload: vi.fn(),
    verifyUploadedShowcaseImage: vi.fn(),
  };
  let service: ShowcaseProjectsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ShowcaseProjectsService(
      prisma as unknown as PrismaService,
      storage as unknown as SupabaseCourseStorageService,
    );
  });

  it('lists public community projects independently of course submissions', async () => {
    prisma.showcaseProject.findMany.mockResolvedValue([
      {
        id: 'showcase-1',
        imagePaths: ['storage://project-images/id-capture.png'],
      },
    ]);

    await expect(service.list()).resolves.toMatchObject([
      {
        id: 'showcase-1',
        imageUrls: ['https://storage.example/project-images/id-capture.png'],
      },
    ]);
    expect(prisma.showcaseProject.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' }, take: 100 }),
    );
  });

  it('publishes a project immediately and normalizes its content', async () => {
    prisma.showcaseProject.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'showcase-1', imagePaths: [], ...data }),
    );

    await expect(
      service.create('member-1', {
        title: '  Mon projet  ',
        description: '  Description assez longue pour le projet.  ',
        link: 'https://example.com',
        technologies: [' React ', 'React', 'TypeScript'],
        imagePaths: [],
      }),
    ).resolves.toMatchObject({
      userId: 'member-1',
      title: 'Mon projet',
      description: 'Description assez longue pour le projet.',
      technologies: ['React', 'TypeScript'],
    });
  });

  it('rejects project screenshots that were not uploaded through the verified flow', async () => {
    await expect(
      service.create('member-1', {
        title: 'Mon projet',
        description: 'Une description valide pour mon projet.',
        technologies: [],
        imagePaths: ['https://example.com/image.png'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.showcaseProject.create).not.toHaveBeenCalled();
  });

  it('persists likes idempotently and returns the resulting count', async () => {
    prisma.showcaseProject.findUnique.mockResolvedValue({ id: 'showcase-1' });
    prisma.showcaseProjectLike.createMany.mockResolvedValue({ count: 1 });
    prisma.showcaseProjectLike.count.mockResolvedValue(4);
    prisma.showcaseProjectLike.findUnique.mockResolvedValue({
      projectId: 'showcase-1',
    });

    await expect(
      service.setLike('member-1', 'showcase-1', true),
    ).resolves.toEqual({ liked: true, count: 4 });
    expect(prisma.showcaseProjectLike.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
  });

  it('creates a comment on an existing public project', async () => {
    prisma.showcaseProject.findUnique.mockResolvedValue({ id: 'showcase-1' });
    prisma.showcaseProjectComment.create.mockResolvedValue({
      id: 'comment-1',
      body: 'Très beau projet !',
    });

    await expect(
      service.createComment('member-2', 'showcase-1', {
        body: '  Très beau projet !  ',
      }),
    ).resolves.toMatchObject({ body: 'Très beau projet !' });
  });

  it('does not allow comments on missing projects', async () => {
    prisma.showcaseProject.findUnique.mockResolvedValue(null);

    await expect(
      service.createComment('member-2', 'missing', { body: 'Commentaire valide' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.showcaseProjectComment.create).not.toHaveBeenCalled();
  });
});
