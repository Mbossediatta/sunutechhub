import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PlatformSettingsService } from './platform-settings.service.js';

describe('PlatformSettingsService newsletter delivery queue', () => {
  const announcement = {
    id: 'announcement-1',
    title: 'Nouvelle annonce',
    body: 'Une actualité est publiée.',
    link: null,
    published: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const transaction = {
    announcement: {
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    newsletterSubscriber: {
      findMany: vi.fn(),
    },
    newsletterDelivery: {
      createMany: vi.fn(),
    },
  };
  const prisma = {
    announcement: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(
      async (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    ),
  };
  let settings: PlatformSettingsService;

  beforeEach(() => {
    vi.clearAllMocks();
    settings = new PlatformSettingsService(
      prisma as unknown as PrismaService,
    );
    prisma.announcement.findUnique.mockResolvedValue({
      ...announcement,
      published: false,
    });
    transaction.announcement.updateMany.mockResolvedValue({ count: 1 });
    transaction.announcement.findUnique.mockResolvedValue(announcement);
    transaction.user.findMany.mockResolvedValue([
      {
        id: 'subscribed-user',
        email: 'member@example.com',
        name: 'Abonné',
      },
      {
        id: 'account-only',
        email: 'account@example.com',
        name: 'Compte abonné',
      },
    ]);
    transaction.newsletterSubscriber.findMany.mockResolvedValue([
      { id: 'newsletter-only', email: 'news@example.com' },
      { id: 'same-address', email: 'MEMBER@example.com' },
    ]);
    transaction.newsletterDelivery.createMany.mockResolvedValue({ count: 3 });
  });

  it('queues announcements for independent subscribers and opted-in accounts without duplicate emails', async () => {
    await expect(
      settings.updateAnnouncement('announcement-1', { published: true }),
    ).resolves.toMatchObject({ published: true, newsletterQueued: 3 });

    expect(transaction.user.findMany).toHaveBeenCalledWith({
      where: { newsletterSubscribed: true },
      select: { id: true, email: true, name: true },
    });
    expect(transaction.newsletterSubscriber.findMany).toHaveBeenCalledWith({
      where: { unsubscribedAt: null },
      select: { id: true, email: true },
    });
    expect(transaction.newsletterDelivery.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: null,
          subscriberId: 'newsletter-only',
          recipientEmail: 'news@example.com',
          recipientName: '',
          campaignKey: 'announcement:announcement-1',
          announcementId: 'announcement-1',
          eventId: undefined,
          subject: 'Nouvelle annonce',
          body: 'Une actualité est publiée.',
          link: null,
        },
        {
          userId: null,
          subscriberId: 'same-address',
          recipientEmail: 'member@example.com',
          recipientName: '',
          campaignKey: 'announcement:announcement-1',
          announcementId: 'announcement-1',
          eventId: undefined,
          subject: 'Nouvelle annonce',
          body: 'Une actualité est publiée.',
          link: null,
        },
        {
          userId: 'account-only',
          subscriberId: null,
          recipientEmail: 'account@example.com',
          recipientName: 'Compte abonné',
          campaignKey: 'announcement:announcement-1',
          announcementId: 'announcement-1',
          eventId: undefined,
          subject: 'Nouvelle annonce',
          body: 'Une actualité est publiée.',
          link: null,
        },
      ],
      skipDuplicates: true,
    });
  });

  it('does not queue a second newsletter when an already published announcement is edited', async () => {
    prisma.announcement.findUnique.mockResolvedValue(announcement);

    await settings.updateAnnouncement('announcement-1', {
      published: true,
      title: 'Titre modifié',
    });

    expect(prisma.announcement.update).toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(transaction.newsletterDelivery.createMany).not.toHaveBeenCalled();
  });

  it('does not publish an announcement that no longer exists', async () => {
    prisma.announcement.findUnique.mockResolvedValue(null);

    await expect(
      settings.updateAnnouncement('missing', { published: true }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
