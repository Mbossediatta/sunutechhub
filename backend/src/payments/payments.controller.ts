import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedRequest } from '../common/guards/jwt-auth.guard.js';
import { CheckoutDto } from './dto/checkout.dto.js';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto.js';
import { PayTechCallbackDto } from './dto/paytech-callback.dto.js';
import { PaymentsService } from './payments.service.js';
import { PayTechService } from './paytech.service.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('checkout')
  checkout(@Body() body: CheckoutDto, @Req() request: AuthenticatedRequest) {
    return this.payments.checkout(request.user.id, body);
  }

  @Get('mine')
  listMine(@Req() request: AuthenticatedRequest) {
    return this.payments.listMine(request.user.id);
  }

  @Get(':reference/status')
  getStatus(
    @Param('reference') reference: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.payments.getStatus(reference, request.user.id);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('return')
  paymentReturn(
    @Query('reference') reference: string,
    @Query('expires') expires: string,
    @Query('token') token: string,
  ) {
    const expiresAt = Number(expires);
    if (!Number.isSafeInteger(expiresAt)) {
      return this.payments.getPaymentReturn(reference, Number.NaN, token);
    }
    return this.payments.getPaymentReturn(reference, expiresAt, token);
  }

  @Get(':reference/receipt')
  async receipt(
    @Param('reference') reference: string,
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    const pdf = await this.payments.buildReceiptPdf(reference, request.user.id);
    response
      .setHeader('Content-Type', 'application/pdf')
      .setHeader(
        'Content-Disposition',
        `attachment; filename="recu-paiement.pdf"; filename*=UTF-8''${encodeURIComponent(`${reference}-recu.pdf`)}`,
      )
      .send(pdf);
  }

  @Post(':reference/cancel')
  cancel(
    @Param('reference') reference: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.payments.cancelMine(reference, request.user.id);
  }
}

@Public()
@Controller('webhooks/paytech')
export class PayTechWebhookController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  handle(@Body() body: PayTechCallbackDto) {
    return this.payments.handlePayTechCallback(body);
  }
}

@Roles(UserRole.ADMIN)
@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly payTech: PayTechService,
  ) {}

  @Get()
  list() {
    return this.payments.listAdmin();
  }

  @Get('status')
  getProviderStatus() {
    return this.payTech.getConfigurationStatus();
  }

  @Post(':reference/confirm')
  confirmPayment(
    @Param('reference') reference: string,
    @Body() body: ConfirmPaymentDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.payments.confirmPaymentManually(
      reference,
      request.user.id,
      body,
    );
  }

  @Post('resend-receipts')
  resendReceipts(@Req() request: AuthenticatedRequest) {
    return this.payments.queueReceiptResend(request.user.id);
  }
}
