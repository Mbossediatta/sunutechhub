import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateAnnouncementDto } from './dto/create-announcement.dto.js';
import type { UpdateAnnouncementDto } from './dto/update-announcement.dto.js';
import type { UpdatePlatformSettingsDto } from './dto/update-platform-settings.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { queueNewsletterCampaign } from './newsletter.service.js';

const DEFAULT_SETTINGS = {
  platformName: 'Sunu Tech Hub',
  contactEmail: '',
  logoUrl: '',
  websiteUrl: '',
  attestationSignatureUrl: '',
} as const;

@Injectable()
export class PlatformSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    const records = await this.prisma.platformSetting.findMany({
      where: {
        key: {
          in: Object.keys(DEFAULT_SETTINGS),
        },
      },
    });
    const saved = Object.fromEntries(
      records.map(({ key, value }) => [key, value]),
    );
    return { ...DEFAULT_SETTINGS, ...saved };
  }

  async updateSettings(input: UpdatePlatformSettingsDto) {
    const entries = Object.entries(input);
    if (!entries.length) return this.getSettings();
    await this.prisma.$transaction(
      entries.map(([key, value]) =>
        this.prisma.platformSetting.upsert({
          where: { key },
          update: { value: value ?? '' },
          create: { key, value: value ?? '' },
        }),
      ),
    );
    return this.getSettings();
  }

  getAdminData() {
    return Promise.all([
      this.getSettings(),
      this.prisma.announcement.findMany({ orderBy: { updatedAt: 'desc' } }),
    ]).then(([settings, announcements]) => ({ settings, announcements }));
  }

  async getPublishedAnnouncements() {
    return this.prisma.announcement.findMany({
      where: { published: true },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { id: true, title: true, body: true, link: true },
    });
  }

  async createAnnouncement(input: CreateAnnouncementDto) {
    return this.prisma.announcement.create({
      data: {
        title: input.title.trim(),
        body: input.body.trim(),
        link: input.link?.trim() || null,
      },
    });
  }

  async updateAnnouncement(id: string, input: UpdateAnnouncementDto) {
    const current = await this.prisma.announcement.findUnique({
      where: { id },
    });
    if (!current) throw new NotFoundException('Annonce introuvable.');
    const data = {
      title: input.title?.trim(),
      body: input.body?.trim(),
      link: input.link === undefined ? undefined : input.link?.trim() || null,
      published: input.published,
    };

    if (input.published === true && !current.published) {
      return this.prisma.$transaction(async (transaction) => {
        const published = await transaction.announcement.updateMany({
          where: { id, published: false },
          data: { ...data, published: true },
        });
        if (!published.count) {
          const announcement = await transaction.announcement.findUnique({
            where: { id },
          });
          if (!announcement)
            throw new NotFoundException('Annonce introuvable.');
          return { ...announcement, newsletterQueued: 0 };
        }

        const announcement = await transaction.announcement.findUnique({
          where: { id },
        });
        if (!announcement) throw new NotFoundException('Annonce introuvable.');
        const queued = await queueNewsletterCampaign(transaction, {
          key: `announcement:${id}`,
          announcementId: id,
          subject: announcement.title,
          body: announcement.body,
          link: announcement.link,
        });
        return { ...announcement, newsletterQueued: queued };
      });
    }

    return this.prisma.announcement.update({
      where: { id },
      data,
    });
  }

  async deleteAnnouncement(id: string) {
    const current = await this.prisma.announcement.findUnique({
      where: { id },
    });
    if (!current) throw new NotFoundException('Annonce introuvable.');
    await this.prisma.announcement.delete({ where: { id } });
    return { success: true };
  }
}
