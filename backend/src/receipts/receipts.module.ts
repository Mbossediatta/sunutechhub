import { Module } from '@nestjs/common';
import { ReceiptMailerService } from './receipt-mailer.service.js';
import { ReceiptPdfService } from './receipt-pdf.service.js';

@Module({
  providers: [ReceiptMailerService, ReceiptPdfService],
  exports: [ReceiptPdfService],
})
export class ReceiptsModule {}
