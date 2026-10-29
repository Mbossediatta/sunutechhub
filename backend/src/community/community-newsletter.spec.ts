import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NewsletterService } from '../platform-settings/newsletter.service.js';
import { CommunityService } from './community.service.js';

describe('CommunityService event newsletter', () => {
  const event = {
    id: 'event-1',
    title: 'Atelier React',
    description: 'Un atelier pratique.',
    startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    endsAt: null,
    location: 'Dakar',
    mode: 'IN_PERSON',
    capacity: null,
    active: true,
    createdById: 'admin-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { registrations: 0 },
  };
  const transaction = {
    communityEvent: { create: vi.fn() },
  };
  const prisma = {
    $transaction: vi.fn(
      async (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    ),
  };
  const newsletter = {
    queueEventNotification: vi.fn(),
  };
  let community: CommunityService;

  beforeEach(() => {
    vi.clearAllMocks();
    transaction.communityEvent.create.mockResolvedValue(event);
    newsletter.queueEventNotification.mockResolvedValue(4);
    community = new CommunityService(
      prisma as unknown as PrismaService,
      newsletter as unknown as NewsletterService,
    );
  });

  it('creates an event and queues notifications in the same transaction', async () => {
    const result = await community.createEvent('admin-1', {
      title: ' Atelier React ',
      description: ' Un atelier pratique. ',
      startsAt: event.startsAt.toISOString(),
      location: ' Dakar ',
      mode: 'IN_PERSON',
    });

    expect(newsletter.queueEventNotification).toHaveBeenCalledWith(
      transaction,
      event,
    );
    expect(result).toMatchObject({ id: event.id, newsletterQueued: 4 });
  });

  it('does not create an event with an invalid end time', async () => {
    expect(() =>
      community.createEvent('admin-1', {
        title: 'Atelier React',
        description: 'Un atelier pratique.',
        startsAt: event.startsAt.toISOString(),
        endsAt: new Date(event.startsAt.getTime() - 1000).toISOString(),
        location: 'Dakar',
        mode: 'IN_PERSON',
      }),
    ).toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
