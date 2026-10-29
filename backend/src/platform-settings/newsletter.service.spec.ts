import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { createNewsletterUnsubscribeToken } from './newsletter-unsubscribe-token.js';
import { NewsletterService } from './newsletter.service.js';

describe('NewsletterService', () => {
  const secret = 'newsletter-test-secret';
  const prisma = {
    user: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    newsletterSubscriber: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    newsletterDelivery: {
      createMany: vi.fn(),
    },
  };
  const campaignTransaction = {
    user: prisma.user,
    newsletterSubscriber: prisma.newsletterSubscriber,
    newsletterDelivery: prisma.newsletterDelivery,
  };
  const config = {
    getOrThrow: vi.fn(() => secret),
    get: vi.fn((key: string) =>
      key === 'FRONTEND_URL' ? 'https://sunutechhub.sn' : undefined,
    ),
  };
  let newsletter: NewsletterService;

  beforeEach(() => {
    vi.clearAllMocks();
    newsletter = new NewsletterService(
      prisma as unknown as PrismaService,
      config as unknown as ConfigService,
    );
    prisma.user.updateMany.mockResolvedValue({ count: 1 });
    prisma.user.findUnique.mockResolvedValue({ email: 'member@example.com' });
    prisma.newsletterSubscriber.updateMany.mockResolvedValue({ count: 1 });
    prisma.newsletterSubscriber.upsert.mockResolvedValue({
      id: 'subscriber-1',
    });
    prisma.newsletterSubscriber.findMany.mockResolvedValue([
      { id: 'subscriber-1', email: 'news@example.com' },
    ]);
    prisma.user.findMany.mockResolvedValue([]);
    prisma.newsletterDelivery.createMany.mockResolvedValue({ count: 1 });
  });

  it('subscribes an email without requiring a member account', async () => {
    await expect(
      newsletter.subscribe('  NEWS@example.com  '),
    ).resolves.toMatchObject({ success: true });

    expect(prisma.newsletterSubscriber.upsert).toHaveBeenCalledWith({
      where: { email: 'news@example.com' },
      update: expect.objectContaining({ unsubscribedAt: null }),
      create: { email: 'news@example.com' },
    });
  });

  it('unsubscribes only the account protected by the valid signed link', async () => {
    const userId = 'member-1';
    const token = createNewsletterUnsubscribeToken(userId, secret);

    await expect(newsletter.unsubscribe(userId, token)).resolves.toEqual({
      success: true,
    });
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: userId, newsletterSubscribed: true },
      data: { newsletterSubscribed: false, newsletterSubscribedAt: null },
    });
    expect(prisma.newsletterSubscriber.updateMany).toHaveBeenCalledWith({
      where: { email: 'member@example.com', unsubscribedAt: null },
      data: { unsubscribedAt: expect.any(Date) },
    });
  });

  it('unsubscribes a standalone subscriber and any matching member account', async () => {
    const subscriberId = 'subscriber-1';
    const token = createNewsletterUnsubscribeToken(subscriberId, secret);
    prisma.newsletterSubscriber.findUnique.mockResolvedValue({
      email: 'news@example.com',
    });

    await expect(
      newsletter.unsubscribeSubscriber(subscriberId, token),
    ).resolves.toEqual({ success: true });
    expect(prisma.newsletterSubscriber.updateMany).toHaveBeenCalledWith({
      where: { id: subscriberId, unsubscribedAt: null },
      data: { unsubscribedAt: expect.any(Date) },
    });
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { email: 'news@example.com', newsletterSubscribed: true },
      data: { newsletterSubscribed: false, newsletterSubscribedAt: null },
    });
  });

  it('rejects invalid unsubscribe links without changing subscription state', async () => {
    await expect(
      newsletter.unsubscribe('member-1', 'invalid'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it('queues a newsletter email for subscribers when an upcoming event is created', async () => {
    const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await expect(
      newsletter.queueEventNotification(
        campaignTransaction as unknown as Prisma.TransactionClient,
        {
          id: 'event-1',
          title: 'Atelier React',
          description: 'Un atelier pratique.',
          startsAt,
          location: 'Dakar',
          mode: 'IN_PERSON',
          active: true,
        },
      ),
    ).resolves.toBe(1);
    expect(prisma.newsletterDelivery.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            campaignKey: 'event:event-1',
            eventId: 'event-1',
            recipientEmail: 'news@example.com',
            subject: 'Nouvel événement : Atelier React',
            link: 'https://sunutechhub.sn/evenements',
          }),
        ],
        skipDuplicates: true,
      }),
    );
  });
});
