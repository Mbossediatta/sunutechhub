import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { CommunityService } from './community.service.js';

describe('CommunityService answer interactions', () => {
  const prisma = {
    communityAnswer: { findFirst: vi.fn() },
    communityAnswerLike: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    communityAnswerComment: { create: vi.fn() },
    communityQuestion: { findFirst: vi.fn() },
  };
  let community: CommunityService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    community = module.get(CommunityService);
  });

  it('creates an answer like and returns its current count', async () => {
    prisma.communityAnswer.findFirst.mockResolvedValue({ id: 'answer-1' });
    prisma.communityAnswerLike.count.mockResolvedValue(3);
    prisma.communityAnswerLike.findUnique.mockResolvedValue({
      answerId: 'answer-1',
    });

    await expect(
      community.setAnswerLike('member-1', 'answer-1', true),
    ).resolves.toEqual({ liked: true, count: 3 });
    expect(prisma.communityAnswerLike.createMany).toHaveBeenCalledWith({
      data: [{ userId: 'member-1', answerId: 'answer-1' }],
      skipDuplicates: true,
    });
  });

  it('does not allow liking an unavailable answer', async () => {
    prisma.communityAnswer.findFirst.mockResolvedValue(null);

    await expect(
      community.setAnswerLike('member-1', 'answer-1', true),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.communityAnswerLike.createMany).not.toHaveBeenCalled();
  });

  it('creates a comment on a visible answer', async () => {
    prisma.communityAnswer.findFirst.mockResolvedValue({ id: 'answer-1' });
    prisma.communityAnswerComment.create.mockResolvedValue({
      id: 'comment-1',
      body: 'Merci pour cette précision.',
    });

    await expect(
      community.createAnswerComment(
        'member-1',
        'answer-1',
        '  Merci pour cette précision.  ',
      ),
    ).resolves.toMatchObject({
      id: 'comment-1',
      body: 'Merci pour cette précision.',
    });
    expect(prisma.communityAnswerComment.create).toHaveBeenCalledWith({
      data: {
        answerId: 'answer-1',
        userId: 'member-1',
        body: 'Merci pour cette précision.',
      },
      include: { user: { select: { id: true, name: true } } },
    });
  });
});
