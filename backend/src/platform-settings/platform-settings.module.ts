import { Module } from '@nestjs/common';
import {
  AdminPlatformSettingsController,
  PublicAnnouncementsController,
  PublicNewsletterController,
  PublicPlatformSettingsController,
} from './platform-settings.controller.js';
import { PlatformSettingsService } from './platform-settings.service.js';
import { NewsletterService } from './newsletter.service.js';

@Module({
  controllers: [
    AdminPlatformSettingsController,
    PublicAnnouncementsController,
    PublicNewsletterController,
    PublicPlatformSettingsController,
  ],
  providers: [PlatformSettingsService, NewsletterService],
  exports: [NewsletterService],
})
export class PlatformSettingsModule {}
