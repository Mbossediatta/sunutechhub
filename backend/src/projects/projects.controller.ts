import { Body, Controller, Get, Param, Post, Put, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedRequest } from '../common/guards/jwt-auth.guard.js';
import { ReviewProjectDto } from './dto/review-project.dto.js';
import { SubmitProjectDto } from './dto/submit-project.dto.js';
import { ProjectsService } from './projects.service.js';
import { ShowcaseProjectsService } from './showcase-projects.service.js';
import { CreateShowcaseCommentDto } from './dto/create-showcase-comment.dto.js';
import { CreateShowcaseProjectDto } from './dto/create-showcase-project.dto.js';
import { SetShowcaseLikeDto } from './dto/set-showcase-like.dto.js';
import { ShowcaseImageUploadDto } from './dto/showcase-image-upload.dto.js';
import { VerifyShowcaseImageUploadDto } from './dto/verify-showcase-image-upload.dto.js';

@Controller()
export class ProjectsController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly showcaseProjects: ShowcaseProjectsService,
  ) {}

  @Public()
  @Get('showcase-projects')
  listShowcaseProjects() {
    return this.showcaseProjects.list();
  }

  @Public()
  @Get('showcase-projects/:id')
  getShowcaseProject(@Param('id') id: string) {
    return this.showcaseProjects.get(id);
  }

  @Post('showcase-projects')
  createShowcaseProject(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateShowcaseProjectDto,
  ) {
    return this.showcaseProjects.create(request.user.id, body);
  }

  @Get('showcase-projects/:id/like')
  hasLikedShowcaseProject(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.showcaseProjects.hasLiked(request.user.id, id);
  }

  @Put('showcase-projects/:id/like')
  setShowcaseProjectLike(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body() body: SetShowcaseLikeDto,
  ) {
    return this.showcaseProjects.setLike(request.user.id, id, body.liked);
  }

  @Post('showcase-projects/:id/comments')
  createShowcaseProjectComment(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateShowcaseCommentDto,
  ) {
    return this.showcaseProjects.createComment(request.user.id, id, body);
  }

  @Post('showcase-project-images/upload-url')
  createShowcaseProjectImageUpload(@Body() body: ShowcaseImageUploadDto) {
    return this.showcaseProjects.createImageUploadUrl(body);
  }

  @Post('showcase-project-images/verify-upload')
  verifyShowcaseProjectImageUpload(@Body() body: VerifyShowcaseImageUploadDto) {
    return this.showcaseProjects.verifyImageUpload(body);
  }

  @Public()
  @Get('projects/public')
  listPublished() {
    return this.projects.listPublished();
  }

  @Public()
  @Get('projects/public/:id')
  getPublished(@Param('id') id: string) {
    return this.projects.getPublished(id);
  }

  @Get('projects/mine')
  listMine(@Req() request: AuthenticatedRequest) {
    return this.projects.listMine(request.user.id);
  }

  @Post('courses/:courseId/projects')
  submit(
    @Param('courseId') courseId: string,
    @Body() body: SubmitProjectDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.projects.submit(request.user.id, courseId, body);
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/projects')
  listForReview() {
    return this.projects.listForReview();
  }

  @Roles(UserRole.ADMIN)
  @Post('admin/projects/:id/review')
  review(
    @Param('id') id: string,
    @Body() body: ReviewProjectDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.projects.review(id, request.user.id, body);
  }
}
