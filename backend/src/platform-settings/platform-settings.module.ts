import { Module } from '@nestjs/common';
import {
  AdminPlatformSettingsController,
  PublicAnnouncementsController,
  PublicPlatformSettingsController,
} from './platform-settings.controller.js';
import { PlatformSettingsService } from './platform-settings.service.js';

@Module({
  controllers: [
    AdminPlatformSettingsController,
    PublicAnnouncementsController,
    PublicPlatformSettingsController,
  ],
  providers: [PlatformSettingsService],
})
export class PlatformSettingsModule {}
