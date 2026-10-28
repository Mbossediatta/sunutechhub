import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedRequest } from '../common/guards/jwt-auth.guard.js';
import { ReviewProjectDto } from './dto/review-project.dto.js';
import { SubmitProjectDto } from './dto/submit-project.dto.js';
import { ProjectsService } from './projects.service.js';

@Controller()
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

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
