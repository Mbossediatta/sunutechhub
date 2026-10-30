import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator.js';
import { AuthService } from '../auth/auth.service.js';
import { CreateInstructorDto } from './dto/create-instructor.dto.js';
import { AdminService } from './admin.service.js';

@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly auth: AuthService,
  ) {}

  @Get('users')
  listUsers(@Query('search') search?: string) {
    return this.admin.listUsers(search);
  }

  @Get('instructors')
  listInstructors() {
    return this.admin.listInstructors();
  }

  @Post('instructors')
  createInstructor(@Body() body: CreateInstructorDto) {
    return this.auth.createInstructor(body);
  }

  @Get('courses')
  listCourses() {
    return this.admin.listCourses();
  }

  @Get('dashboard')
  getDashboard() {
    return this.admin.getDashboard();
  }
}
