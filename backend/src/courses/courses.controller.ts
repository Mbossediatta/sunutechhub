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
import { UpdateLessonProgressDto } from './dto/update-lesson-progress.dto.js';
import { CreateCoursePdfUploadDto } from './dto/create-course-pdf-upload.dto.js';
import { DeleteCoursePdfUploadDto } from './dto/delete-course-pdf-upload.dto.js';
import { VerifyCoursePdfUploadDto } from './dto/verify-course-pdf-upload.dto.js';
import { CreateCourseBannerUploadDto } from './dto/create-course-banner-upload.dto.js';
import { VerifyCourseBannerUploadDto } from './dto/verify-course-banner-upload.dto.js';
import { DeleteCourseBannerUploadDto } from './dto/delete-course-banner-upload.dto.js';
import { CoursesService } from './courses.service.js';
import { SupabaseCourseStorageService } from './supabase-course-storage.service.js';

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
  listContent(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.courses.listEnrolledContent(request.user.id, id);
  }

  @Get(':id/content/:contentId/file')
  getContentFile(
    @Param('id') id: string,
    @Param('contentId') contentId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.courses.getEnrolledContentFileUrl(
      request.user.id,
      id,
      contentId,
    );
  }

  @Get(':id/progress')
  getProgress(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.courses.getProgress(request.user.id, id);
  }

  @Patch(':id/progress/:contentId')
  updateProgress(
    @Param('id') id: string,
    @Param('contentId') contentId: string,
    @Body() body: UpdateLessonProgressDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.courses.updateProgress(
      request.user.id,
      id,
      contentId,
      body.completed,
    );
  }
}

@Roles(UserRole.ADMIN)
@Controller('admin/courses')
export class AdminCoursesController {
  constructor(
    private readonly courses: CoursesService,
    private readonly storage: SupabaseCourseStorageService,
  ) {}

  @Get()
  list() {
    return this.courses.listAdmin();
  }

  @Post()
  create(@Body() body: CreateCourseDto) {
    return this.courses.create(body);
  }

  @Post('banner/upload-url')
  createBannerUploadUrl(@Body() body: CreateCourseBannerUploadDto) {
    return this.storage.createSignedBannerUpload(
      body.filename,
      body.size,
      body.contentType,
    );
  }

  @Post('banner/verify-upload')
  async verifyBannerUpload(@Body() body: VerifyCourseBannerUploadDto) {
    const coverImageUrl = await this.storage.verifyUploadedBanner(
      body.path,
      body.size,
      body.contentType,
    );
    return { coverImageUrl };
  }

  @Delete('banner/upload')
  deleteTemporaryBannerUpload(@Body() body: DeleteCourseBannerUploadDto) {
    return this.storage.deleteCourseBanner(body.path);
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

  @Post(':courseId/content/upload-url')
  createPdfUploadUrl(
    @Param('courseId') courseId: string,
    @Body() body: CreateCoursePdfUploadDto,
  ) {
    return this.storage.createSignedUpload(
      courseId,
      body.filename,
      body.size,
      body.contentType,
    );
  }

  @Post(':courseId/content/verify-upload')
  verifyPdfUpload(
    @Param('courseId') courseId: string,
    @Body() body: VerifyCoursePdfUploadDto,
  ) {
    return this.storage
      .verifyUploadedPdf(courseId, body.path, body.size)
      .then((path) => ({ path }));
  }

  @Delete(':courseId/content/upload')
  deleteTemporaryPdfUpload(
    @Param('courseId') courseId: string,
    @Body() body: DeleteCoursePdfUploadDto,
  ) {
    return this.storage.deleteCoursePdf(courseId, body.path);
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
