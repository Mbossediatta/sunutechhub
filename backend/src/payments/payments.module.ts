import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module.js';
import {
  AdminPaymentsController,
  PaymentsController,
  PayTechWebhookController,
} from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { PayTechService } from './paytech.service.js';

@Module({
  imports: [PricingModule],
  controllers: [
    PaymentsController,
    PayTechWebhookController,
    AdminPaymentsController,
  ],
  providers: [PaymentsService, PayTechService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
