import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedRequest } from '../common/guards/jwt-auth.guard.js';
import { UserRole } from '@prisma/client';
import { PricingService } from './pricing.service.js';
import { UpdatePricingDto } from './dto/update-pricing.dto.js';
import { Public } from '../common/decorators/public.decorator.js';

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Public()
  @Get()
  getPublicPricing() {
    return this.pricing.getValues();
  }
}

@Roles(UserRole.ADMIN)
@Controller('admin/pricing')
export class AdminPricingController {
  constructor(private readonly pricing: PricingService) {}

  @Get()
  getPricing() {
    return this.pricing.getAdminValues();
  }

  @Patch()
  updatePricing(
    @Body() body: UpdatePricingDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.pricing.update(body, request.user.id);
  }
}
