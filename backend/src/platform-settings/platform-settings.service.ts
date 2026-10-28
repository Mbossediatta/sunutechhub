import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateAnnouncementDto,
} from './dto/create-announcement.dto.js';
import type {
  UpdateAnnouncementDto,
} from './dto/update-announcement.dto.js';
import type {
  UpdatePlatformSettingsDto,
} from './dto/update-platform-settings.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

const DEFAULT_SETTINGS = {
  platformName: 'Sunu Tech Hub',
  contactEmail: '',
  logoUrl: '',
  websiteUrl: '',
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
    const saved = Object.fromEntries(records.map(({ key, value }) => [key, value]));
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
    const current = await this.prisma.announcement.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Annonce introuvable.');
    return this.prisma.announcement.update({
      where: { id },
      data: {
        title: input.title?.trim(),
        body: input.body?.trim(),
        link: input.link === undefined ? undefined : input.link?.trim() || null,
        published: input.published,
      },
    });
  }

  async deleteAnnouncement(id: string) {
    const current = await this.prisma.announcement.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Annonce introuvable.');
    await this.prisma.announcement.delete({ where: { id } });
    return { success: true };
  }
}
