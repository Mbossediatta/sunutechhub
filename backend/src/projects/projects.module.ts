import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module.js';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';
import { ShowcaseProjectsService } from './showcase-projects.service.js';

@Module({
  imports: [CoursesModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ShowcaseProjectsService],
  exports: [ProjectsService, ShowcaseProjectsService],
})
export class ProjectsModule {}
