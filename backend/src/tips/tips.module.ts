import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module.js';
import { AdminTipsController, TipsController } from './tips.controller.js';
import { TipsService } from './tips.service.js';

@Module({
  imports: [CoursesModule],
  controllers: [TipsController, AdminTipsController],
  providers: [TipsService],
})
export class TipsModule {}
