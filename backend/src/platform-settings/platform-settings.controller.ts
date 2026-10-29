import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CreateAnnouncementDto } from './dto/create-announcement.dto.js';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto.js';
import { UpdatePlatformSettingsDto } from './dto/update-platform-settings.dto.js';
import { NewsletterUnsubscribeDto } from './dto/newsletter-unsubscribe.dto.js';
import { NewsletterSubscribeDto } from './dto/newsletter-subscribe.dto.js';
import { PlatformSettingsService } from './platform-settings.service.js';
import { NewsletterService } from './newsletter.service.js';

@Public()
@Controller('platform-settings')
export class PublicPlatformSettingsController {
  constructor(private readonly settings: PlatformSettingsService) {}

  @Get()
  getSettings() {
    return this.settings.getSettings();
  }
}

@Public()
@Controller('announcements')
export class PublicAnnouncementsController {
  constructor(private readonly settings: PlatformSettingsService) {}

  @Get()
  getAnnouncements() {
    return this.settings.getPublishedAnnouncements();
  }
}

@Public()
@Controller('newsletter')
export class PublicNewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('subscribe')
  subscribe(@Body() body: NewsletterSubscribeDto) {
    return this.newsletter.subscribe(body.email);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('unsubscribe')
  unsubscribe(@Body() body: NewsletterUnsubscribeDto) {
    if (body.subscriberId) {
      return this.newsletter.unsubscribeSubscriber(
        body.subscriberId,
        body.token,
      );
    }
    return this.newsletter.unsubscribe(body.userId ?? '', body.token);
  }
}

@Roles(UserRole.ADMIN)
@Controller('admin/settings')
export class AdminPlatformSettingsController {
  constructor(private readonly settings: PlatformSettingsService) {}

  @Get()
  getAdminData() {
    return this.settings.getAdminData();
  }

  @Patch()
  updateSettings(@Body() body: UpdatePlatformSettingsDto) {
    return this.settings.updateSettings(body);
  }

  @Post('announcements')
  createAnnouncement(@Body() body: CreateAnnouncementDto) {
    return this.settings.createAnnouncement(body);
  }

  @Patch('announcements/:id')
  updateAnnouncement(
    @Param('id') id: string,
    @Body() body: UpdateAnnouncementDto,
  ) {
    return this.settings.updateAnnouncement(id, body);
  }

  @Delete('announcements/:id')
  deleteAnnouncement(@Param('id') id: string) {
    return this.settings.deleteAnnouncement(id);
  }
}
