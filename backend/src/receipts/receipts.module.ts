import { Module } from '@nestjs/common';
import { ReceiptMailerService } from './receipt-mailer.service.js';

@Module({
  providers: [ReceiptMailerService],
})
export class ReceiptsModule {}
