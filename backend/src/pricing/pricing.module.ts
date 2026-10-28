import { Module } from '@nestjs/common';
import {
  AdminPricingController,
  PricingController,
} from './pricing.controller.js';
import { PricingService } from './pricing.service.js';

@Module({
  controllers: [PricingController, AdminPricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
