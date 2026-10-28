import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedRequest } from '../common/guards/jwt-auth.guard.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { UpdateCoursePricesDto } from './dto/update-course-prices.dto.js';
import { CreateCourseContentDto } from './dto/create-course-content.dto.js';
import { UpdateCourseContentDto } from './dto/update-course-content.dto.js';
import { CoursesService } from './courses.service.js';

@Controller('courses')
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Public()
  @Get()
  list() {
    return this.courses.list();
  }

  @Public()
  @Get(':id')
  get(@Param('id') id: string) {
    return this.courses.get(id);
  }

  @Post(':id/enroll-free')
  enrollFree(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.courses.enrollFree(request.user.id, id);
  }

  @Get('enrollments/mine')
  listEnrollments(@Req() request: AuthenticatedRequest) {
    return this.courses.listEnrollments(request.user.id);
  }

  @Get(':id/content')
  listContent(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.courses.listEnrolledContent(request.user.id, id);
  }

}

@Roles(UserRole.ADMIN)
@Controller('admin/courses')
export class AdminCoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  list() {
    return this.courses.listAdmin();
  }

  @Post()
  create(@Body() body: CreateCourseDto) {
    return this.courses.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateCourseDto) {
    return this.courses.update(id, body);
  }

  @Patch(':id/prices')
  updatePrices(
    @Param('id') id: string,
    @Body() body: UpdateCoursePricesDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.courses.updatePrices(id, body, request.user.id);
  }

  @Get(':courseId/content')
  listContent(@Param('courseId') courseId: string) {
    return this.courses.listAdminContent(courseId);
  }

  @Post(':courseId/content')
  createContent(
    @Param('courseId') courseId: string,
    @Body() body: CreateCourseContentDto,
  ) {
    return this.courses.createContent(courseId, body);
  }

  @Patch(':courseId/content/:contentId')
  updateContent(
    @Param('courseId') courseId: string,
    @Param('contentId') contentId: string,
    @Body() body: UpdateCourseContentDto,
  ) {
    return this.courses.updateContent(courseId, contentId, body);
  }

  @Delete(':courseId/content/:contentId')
  deleteContent(
    @Param('courseId') courseId: string,
    @Param('contentId') contentId: string,
  ) {
    return this.courses.deleteContent(courseId, contentId);
  }
}
