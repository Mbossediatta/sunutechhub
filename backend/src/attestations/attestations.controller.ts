import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedRequest } from '../common/guards/jwt-auth.guard.js';
import { AttestationsService } from './attestations.service.js';
import { RevokeAttestationDto } from './dto/revoke-attestation.dto.js';
import { UpdateVisibilityDto } from './dto/update-visibility.dto.js';

@Controller('attestations')
export class AttestationsController {
  constructor(private readonly attestations: AttestationsService) {}

  @Get('mine')
  listMine(@Req() request: AuthenticatedRequest) {
    return this.attestations.listMine(request.user.id);
  }

  @Post('free-course/:courseId')
  issueFreeCourse(
    @Param('courseId') courseId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.attestations.issueFreeCourse(request.user.id, courseId);
  }

  @Public()
  @Get('verify/:number')
  verify(@Param('number') number: string) {
    return this.attestations.verify(number);
  }

  @Get(':number/pdf')
  async pdf(
    @Param('number') number: string,
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    const pdf = await this.attestations.buildPdf(number, request.user.id);
    response
      .setHeader('Content-Type', 'application/pdf')
      .setHeader('Content-Disposition', `attachment; filename="${number}.pdf"`)
      .send(pdf);
  }

  @Patch(':number/visibility')
  updateVisibility(
    @Param('number') number: string,
    @Body() body: UpdateVisibilityDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.attestations.updateVisibility(number, request.user.id, body);
  }
}

@Roles(UserRole.ADMIN)
@Controller('admin/attestations')
export class AdminAttestationsController {
  constructor(private readonly attestations: AttestationsService) {}

  @Get()
  list() {
    return this.attestations.listAdmin();
  }

  @Patch(':number/revoke')
  revoke(
    @Param('number') number: string,
    @Body() body: RevokeAttestationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.attestations.revoke(number, request.user.id, body);
  }
}
