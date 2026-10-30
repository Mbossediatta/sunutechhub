import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SupabaseCourseStorageService } from '../courses/supabase-course-storage.service.js';
import { TipsService } from './tips.service.js';

describe('TipsService', () => {
  const prisma = {
    tip: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tipLike: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
    },
    tipComment: {
      create: vi.fn(),
    },
  };
  const storage = {
    createSignedDownloadUrl: vi.fn(),
    deleteTipNarration: vi.fn(),
  };
  let tips: TipsService;

  beforeEach(() => {
    vi.clearAllMocks();
    tips = new TipsService(
      prisma as unknown as PrismaService,
      storage as unknown as SupabaseCourseStorageService,
    );
  });

  it('lists only published tips for public visitors', async () => {
    prisma.tip.findMany.mockResolvedValue([]);

    await tips.listPublished();

    expect(prisma.tip.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { published: true },
        select: expect.objectContaining({ htmlContent: true }),
      }),
    );
  });

  it('returns the sandbox content and a signed narration link for a published tip', async () => {
    prisma.tip.findFirst.mockResolvedValue({
      slug: 'raccourci-clavier-ab12cd34',
      title: 'Raccourci clavier',
      description: '',
      htmlContent: '<html></html>',
      narrationPath: 'storage://tips/abc123-voix.mp3',
      createdAt: new Date(),
    });
    storage.createSignedDownloadUrl.mockResolvedValue(
      'https://storage.example/signed.mp4',
    );

    await expect(
      tips.getPublished('raccourci-clavier-ab12cd34'),
    ).resolves.toMatchObject({
      htmlContent: '<html></html>',
      narrationUrl: 'https://storage.example/signed.mp4',
      narrationFormat: 'mp3',
    });
    expect(prisma.tip.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'raccourci-clavier-ab12cd34', published: true },
      }),
    );
  });

  it('does not disclose unpublished tips to public visitors', async () => {
    prisma.tip.findFirst.mockResolvedValue(null);

    await expect(tips.getPublished('draft-tip')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(storage.createSignedDownloadUrl).not.toHaveBeenCalled();
  });

  it('creates an idempotent like for a published tip', async () => {
    prisma.tip.findFirst.mockResolvedValue({ id: 'tip-1' });
    prisma.tipLike.createMany.mockResolvedValue({ count: 1 });
    prisma.tipLike.count.mockResolvedValue(1);
    prisma.tipLike.findUnique.mockResolvedValue({ tipId: 'tip-1' });

    await expect(tips.setLike('user-1', 'tip-slug', true)).resolves.toEqual({
      liked: true,
      count: 1,
    });
    expect(prisma.tipLike.createMany).toHaveBeenCalledWith({
      data: [{ userId: 'user-1', tipId: 'tip-1' }],
      skipDuplicates: true,
    });
  });

  it('does not allow comments on unpublished tips', async () => {
    prisma.tip.findFirst.mockResolvedValue(null);

    await expect(
      tips.createComment('user-1', 'draft-tip', { body: 'Bon conseil' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.tipComment.create).not.toHaveBeenCalled();
  });

  it('creates a trimmed comment for a published tip', async () => {
    prisma.tip.findFirst.mockResolvedValue({ id: 'tip-1' });
    prisma.tipComment.create.mockResolvedValue({
      id: 'comment-1',
      body: 'Astuce utile',
    });

    await tips.createComment('user-1', 'tip-slug', {
      body: '  Astuce utile  ',
    });

    expect(prisma.tipComment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { tipId: 'tip-1', userId: 'user-1', body: 'Astuce utile' },
      }),
    );
  });

  it('requires a verified MP3 or MP4 narration path before creating a tip', async () => {
    expect(() =>
      tips.create({
        title: 'Astuce test',
        htmlContent: '<html><body>Astuce animée</body></html>',
        narrationPath: 'https://attacker.example/file.mp4',
      }),
    ).toThrow(BadRequestException);
    expect(prisma.tip.create).not.toHaveBeenCalled();
  });

  it('creates a draft tip using a unique public slug', async () => {
    prisma.tip.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'tip-1', ...data }),
    );
    const narrationPath = 'storage://tips/abc123-voix.mp3';

    const created = await tips.create({
      title: 'Astuce clavier',
      description: 'Un raccourci utile.',
      htmlContent: '<html><body>Animation</body></html>',
      narrationPath,
    });

    expect(created).toMatchObject({
      title: 'Astuce clavier',
      narrationPath,
      published: false,
    });
    expect(created.slug).toMatch(/^astuce-clavier-[a-f0-9]{8}$/);
  });

  it('creates a draft tip without a voice-over', async () => {
    prisma.tip.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'tip-2', ...data }),
    );

    await expect(
      tips.create({
        title: 'Astuce sans audio',
        htmlContent: '<html><body>Animation</body></html>',
      }),
    ).resolves.toMatchObject({
      narrationPath: null,
      published: false,
    });
  });

  it('returns a published tip without requesting an audio link when there is no narration', async () => {
    prisma.tip.findFirst.mockResolvedValue({
      slug: 'astuce-sans-audio',
      title: 'Astuce sans audio',
      description: '',
      htmlContent: '<html><body>Animation</body></html>',
      narrationPath: null,
      createdAt: new Date(),
    });

    await expect(tips.getPublished('astuce-sans-audio')).resolves.toMatchObject(
      {
        narrationUrl: null,
        narrationFormat: null,
      },
    );
    expect(storage.createSignedDownloadUrl).not.toHaveBeenCalled();
  });
});
