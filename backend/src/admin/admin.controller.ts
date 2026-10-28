import { Controller, Get, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator.js';
import { AdminService } from './admin.service.js';

@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  listUsers(@Query('search') search?: string) {
    return this.admin.listUsers(search);
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
