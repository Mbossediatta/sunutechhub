import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import {
  createPaymentReturnToken,
  isValidPaymentReturnToken,
  PAYMENT_RETURN_TOKEN_TTL_SECONDS,
} from './payment-return-token.js';

interface PayTechCheckoutInput {
  itemName: string;
  amount: number;
  currency: string;
  reference: string;
  paymentId: string;
}

interface PayTechResponse {
  success?: boolean | number;
  token?: string;
  redirect_url?: string;
  redirectUrl?: string;
  message?: string;
}

@Injectable()
export class PayTechService {
  constructor(private readonly config: ConfigService) {}

  getConfigurationStatus() {
    const apiKeyConfigured = Boolean(
      this.config.get<string>('PAYTECH_API_KEY')?.trim(),
    );
    const apiSecretConfigured = Boolean(
      this.config.get<string>('PAYTECH_API_SECRET')?.trim(),
    );
    const environment = this.config.get<string>('PAYTECH_ENV', 'test');
    const isProduction =
      this.config.get<string>('NODE_ENV') === 'production';
    const issues: string[] = [];

    if (!apiKeyConfigured) issues.push('Clé API PayTech manquante.');
    if (!apiSecretConfigured) issues.push('Secret API PayTech manquant.');
    if (!['test', 'prod'].includes(environment)) {
      issues.push('PAYTECH_ENV doit être « test » ou « prod ».');
    }
    if (isProduction && environment !== 'prod') {
      issues.push('Le mode test PayTech est interdit en production.');
    }

    const frontendUrl = this.readUrl('FRONTEND_URL');
    if (!frontendUrl) {
      issues.push('FRONTEND_URL doit être une adresse web valide.');
    } else {
      if (this.isLocalHostname(frontendUrl.hostname)) {
        issues.push(
          'FRONTEND_URL doit être une adresse publique accessible à PayTech ; localhost n’est pas accepté.',
        );
      }
      if (this.isPlaceholderHostname(frontendUrl.hostname)) {
        issues.push(
          'FRONTEND_URL utilise encore une adresse d’exemple. Configurez le domaine de votre site ou une URL HTTPS de tunnel.',
        );
      }
      if (isProduction && frontendUrl.protocol !== 'https:') {
        issues.push('FRONTEND_URL doit utiliser HTTPS en production.');
      }
    }

    const callbackUrl = this.readUrl('PAYTECH_PUBLIC_API_URL');
    if (!callbackUrl) {
      issues.push(
        'PAYTECH_PUBLIC_API_URL doit être une adresse web valide.',
      );
    } else {
      if (this.isPlaceholderHostname(callbackUrl.hostname)) {
        issues.push(
          'PAYTECH_PUBLIC_API_URL utilise encore une adresse d’exemple. Configurez un domaine public HTTPS ou une URL HTTPS de tunnel.',
        );
      }
      if (callbackUrl.protocol !== 'https:') {
        issues.push(
          'PAYTECH_PUBLIC_API_URL doit utiliser HTTPS pour recevoir la notification PayTech.',
        );
      }
      if (this.isLocalHostname(callbackUrl.hostname)) {
        issues.push(
          'La notification PayTech ne peut pas atteindre une adresse locale.',
        );
      }
    }

    return {
      ready: issues.length === 0,
      environment:
        environment === 'test' || environment === 'prod'
          ? environment
          : 'invalid',
      apiKeyConfigured,
      apiSecretConfigured,
      callbackConfigured: callbackUrl !== null,
      callbackUsesHttps: callbackUrl?.protocol === 'https:',
      frontendConfigured: frontendUrl !== null,
      issues,
    };
  }

  isConfigured(): boolean {
    return this.getConfigurationStatus().ready;
  }

  async createCheckout(input: PayTechCheckoutInput) {
    const configuration = this.getConfigurationStatus();
    if (!configuration.ready) {
      throw new ServiceUnavailableException(
        `Configuration PayTech incomplète : ${configuration.issues.join(' ')}`,
      );
    }

    const apiKey = this.config.get<string>('PAYTECH_API_KEY');
    const apiSecret = this.config.get<string>('PAYTECH_API_SECRET');
    const publicApiUrl = this.config.get<string>('PAYTECH_PUBLIC_API_URL');
    if (!apiKey || !apiSecret || !publicApiUrl) {
      throw new ServiceUnavailableException(
        'Le paiement PayTech n’est pas encore configuré.',
      );
    }

    const environment = this.config.get<string>('PAYTECH_ENV', 'test');
    if (!['test', 'prod'].includes(environment)) {
      throw new ServiceUnavailableException(
        'PAYTECH_ENV doit être « test » ou « prod ».',
      );
    }
    if (
      this.config.get<string>('NODE_ENV') === 'production' &&
      environment !== 'prod'
    ) {
      throw new ServiceUnavailableException(
        'Le mode test PayTech est interdit en production.',
      );
    }
    const apiUrl = this.config.get<string>(
      'PAYTECH_API_URL',
      'https://paytech.sn/api/payment/request-payment',
    );
    const callbackBase = this.requireHttps(
      publicApiUrl,
      'PAYTECH_PUBLIC_API_URL',
    );
    const frontendUrl = this.readUrl('FRONTEND_URL');
    if (!frontendUrl) {
      throw new ServiceUnavailableException(
        'FRONTEND_URL doit être une adresse publique valide.',
      );
    }
    const successUrl = new URL('/paiement/succes', frontendUrl);
    successUrl.searchParams.set('reference', input.reference);
    const returnExpiresAt =
      Math.floor(Date.now() / 1000) + PAYMENT_RETURN_TOKEN_TTL_SECONDS;
    const returnToken = createPaymentReturnToken(
      input.reference,
      returnExpiresAt,
      this.config.getOrThrow<string>('JWT_SECRET'),
    );
    successUrl.searchParams.set('expires', String(returnExpiresAt));
    successUrl.searchParams.set('token', returnToken);
    const cancelUrl = new URL('/paiement/annule', frontendUrl);
    cancelUrl.searchParams.set('reference', input.reference);
    cancelUrl.searchParams.set('expires', String(returnExpiresAt));
    cancelUrl.searchParams.set('token', returnToken);
    let response: Response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          API_KEY: apiKey,
          API_SECRET: apiSecret,
        },
        body: JSON.stringify({
          item_name: input.itemName,
          item_price: input.amount,
          currency:
            input.currency.toUpperCase() === 'FCFA'
              ? 'XOF'
              : input.currency.toUpperCase(),
          ref_command: input.reference,
          command_name: input.itemName,
          target_payment: 'Wave, Orange Money',
          env: environment,
          ipn_url: `${callbackBase}/api/webhooks/paytech`,
          success_url: successUrl.toString(),
          cancel_url: cancelUrl.toString(),
          custom_field: JSON.stringify({ payment_id: input.paymentId }),
        }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      throw new ServiceUnavailableException(
        `PayTech est momentanément injoignable : ${error instanceof Error ? error.message : 'erreur réseau'}.`,
      );
    }

    const payload = (await response
      .json()
      .catch(() => null)) as PayTechResponse | null;
    if (
      !response.ok ||
      !payload ||
      !(payload.success === true || payload.success === 1)
    ) {
      throw new ServiceUnavailableException(
        payload?.message ?? 'PayTech n’a pas pu créer la session de paiement.',
      );
    }

    const checkoutUrl = payload.redirect_url ?? payload.redirectUrl;
    if (!checkoutUrl || !this.isTrustedCheckoutUrl(checkoutUrl)) {
      throw new ServiceUnavailableException(
        'PayTech a retourné une adresse de paiement invalide.',
      );
    }
    return { checkoutUrl, providerToken: payload.token ?? null };
  }

  verifyCallbackHashes(apiKeyHash: string, apiSecretHash: string): boolean {
    const apiKey = this.config.get<string>('PAYTECH_API_KEY');
    const apiSecret = this.config.get<string>('PAYTECH_API_SECRET');
    if (!apiKey || !apiSecret) return false;
    return (
      this.safeHashEqual(apiKeyHash, apiKey) &&
      this.safeHashEqual(apiSecretHash, apiSecret)
    );
  }

  verifyPaymentReturnToken(
    reference: string,
    expiresAt: number,
    token: string,
  ) {
    return isValidPaymentReturnToken(
      reference,
      expiresAt,
      token,
      this.config.getOrThrow<string>('JWT_SECRET'),
    );
  }

  private safeHashEqual(receivedHex: string, secret: string): boolean {
    const expected = Buffer.from(this.createSha256(secret), 'hex');
    if (!/^[\da-f]{64}$/i.test(receivedHex)) return false;
    const received = Buffer.from(receivedHex, 'hex');
    return (
      expected.length === received.length && timingSafeEqual(expected, received)
    );
  }

  private createSha256(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private readUrl(key: string) {
    const value = this.config.get<string>(key)?.trim();
    if (!value) return null;
    try {
      const url = new URL(value);
      if (
        (url.protocol !== 'https:' && url.protocol !== 'http:') ||
        url.username ||
        url.password
      ) {
        return null;
      }
      return url;
    } catch {
      return null;
    }
  }

  private isLocalHostname(hostname: string) {
    const normalized = hostname.toLowerCase();
    return (
      normalized === 'localhost' ||
      normalized === '::1' ||
      normalized === '0.0.0.0' ||
      normalized === '127.0.0.1' ||
      normalized.endsWith('.localhost')
    );
  }

  private isPlaceholderHostname(hostname: string) {
    const normalized = hostname.toLowerCase();
    return (
      normalized === 'example.com' ||
      normalized.endsWith('.example.com') ||
      normalized === 'example.org' ||
      normalized.endsWith('.example.org') ||
      normalized === 'example.net' ||
      normalized.endsWith('.example.net')
    );
  }

  private requireHttps(value: string, name: string) {
    const url = new URL(value);
    if (url.protocol !== 'https:') {
      throw new ServiceUnavailableException(
        `${name} doit utiliser HTTPS pour recevoir les notifications PayTech.`,
      );
    }
    return url.toString().replace(/\/+$/, '');
  }

  private isTrustedCheckoutUrl(value: string) {
    try {
      const url = new URL(value);
      return (
        url.protocol === 'https:' &&
        (url.hostname === 'paytech.sn' || url.hostname.endsWith('.paytech.sn'))
      );
    } catch {
      return false;
    }
  }
}
