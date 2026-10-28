import {
  Body,
  Controller,
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
import { CommunityService } from './community.service.js';
import { CreateAnswerDto } from './dto/create-answer.dto.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { CreateJobDto } from './dto/create-job.dto.js';
import { CreateQuestionDto } from './dto/create-question.dto.js';
import { CreateReportDto } from './dto/create-report.dto.js';
import { ReviewJobDto } from './dto/review-job.dto.js';
import { ReviewReportDto } from './dto/review-report.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';

@Controller()
export class CommunityController {
  constructor(private readonly community: CommunityService) {}

  @Public()
  @Get('questions')
  listQuestions() {
    return this.community.listQuestions();
  }

  @Public()
  @Get('questions/:id')
  getQuestion(@Param('id') id: string) {
    return this.community.getQuestion(id);
  }

  @Post('questions')
  createQuestion(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateQuestionDto,
  ) {
    return this.community.createQuestion(request.user.id, body);
  }

  @Post('questions/:id/answers')
  createAnswer(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateAnswerDto,
  ) {
    return this.community.createAnswer(request.user.id, id, body);
  }

  @Post('reports')
  createReport(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateReportDto,
  ) {
    return this.community.createReport(request.user.id, body);
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/community/questions')
  listAdminQuestions() {
    return this.community.listAdminQuestions();
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/community/reports')
  listReports() {
    return this.community.listReports();
  }

  @Roles(UserRole.ADMIN)
  @Post('admin/community/reports/:id/review')
  reviewReport(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body() body: ReviewReportDto,
  ) {
    return this.community.reviewReport(id, request.user.id, body);
  }

  @Public()
  @Get('events')
  listEvents() {
    return this.community.listEvents();
  }

  @Post('events/:id/register')
  registerForEvent(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.community.registerForEvent(request.user.id, id);
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/events')
  listAdminEvents() {
    return this.community.listEvents(true);
  }

  @Roles(UserRole.ADMIN)
  @Post('admin/events')
  createEvent(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateEventDto,
  ) {
    return this.community.createEvent(request.user.id, body);
  }

  @Roles(UserRole.ADMIN)
  @Patch('admin/events/:id')
  updateEvent(@Param('id') id: string, @Body() body: UpdateEventDto) {
    return this.community.updateEvent(id, body);
  }

  @Public()
  @Get('jobs')
  listJobs() {
    return this.community.listJobs();
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/jobs')
  listAdminJobs() {
    return this.community.listJobs(true);
  }

  @Roles(UserRole.ADMIN)
  @Post('admin/jobs')
  createJob(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateJobDto,
  ) {
    return this.community.createJob(request.user.id, body);
  }

  @Roles(UserRole.ADMIN)
  @Patch('admin/jobs/:id/review')
  reviewJob(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body() body: ReviewJobDto,
  ) {
    return this.community.reviewJob(id, request.user.id, body);
  }
}
