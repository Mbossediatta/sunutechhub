import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module.js';
import {
  AdminCoursesController,
  CoursesController,
  TrainerCoursesController,
} from './courses.controller.js';
import { CoursesService } from './courses.service.js';
import { CourseContentMailerService } from './course-content-mailer.service.js';
import { SupabaseCourseStorageService } from './supabase-course-storage.service.js';

@Module({
  imports: [PricingModule],
  controllers: [
    CoursesController,
    AdminCoursesController,
    TrainerCoursesController,
  ],
  providers: [
    CoursesService,
    CourseContentMailerService,
    SupabaseCourseStorageService,
  ],
  exports: [CoursesService, SupabaseCourseStorageService],
})
export class CoursesModule {}
