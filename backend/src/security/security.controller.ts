import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator.js';
import { SecurityEventsService } from './security-events.service.js';

function parseDate(value: string | undefined, field: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Le filtre « ${field} » est invalide.`);
  }
  return date;
}

@Roles(UserRole.ADMIN)
@Controller('admin/security')
export class SecurityController {
  constructor(private readonly securityEvents: SecurityEventsService) {}

  @Get('overview')
  getOverview() {
    return this.securityEvents.getOverview();
  }

  @Get('errors')
  getErrors() {
    return this.securityEvents.getErrors();
  }

  @Get('operations')
  getOperationalStatus() {
    return this.securityEvents.getOperationalStatus();
  }

  @Get('audit')
  getAuditLog(
    @Query('search') search?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = parseDate(from, 'from');
    const toDate = parseDate(to, 'to');
    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException(
        'La date de début doit précéder la date de fin.',
      );
    }
    return this.securityEvents.getAuditLog({
      search: search?.trim(),
      action: action?.trim(),
      from: fromDate,
      to: toDate,
    });
  }
}
