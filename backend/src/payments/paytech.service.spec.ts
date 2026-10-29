import { ConfigService } from '@nestjs/config';
import { afterEach, vi } from 'vitest';
import { PayTechService } from './paytech.service.js';
import { isValidPaymentReturnToken } from './payment-return-token.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PayTechService configuration status', () => {
  const configuration: Record<string, string> = {
    PAYTECH_API_KEY: 'test-key',
    PAYTECH_API_SECRET: 'test-secret',
    JWT_SECRET: 'test-jwt-secret',
    PAYTECH_ENV: 'test',
    PAYTECH_PUBLIC_API_URL: 'https://payments.example.sn',
    FRONTEND_URL: 'https://sunutechhub.sn',
    NODE_ENV: 'development',
  };
  let payTech: PayTechService;

  beforeEach(() => {
    payTech = new PayTechService(new ConfigService(configuration));
  });

  it('reports readiness without returning credentials', () => {
    const status = payTech.getConfigurationStatus();

    expect(status).toEqual({
      ready: true,
      environment: 'test',
      apiKeyConfigured: true,
      apiSecretConfigured: true,
      callbackConfigured: true,
      callbackUsesHttps: true,
      frontendConfigured: true,
      issues: [],
    });
    expect(JSON.stringify(status)).not.toContain('test-secret');
    expect(payTech.isConfigured()).toBe(true);
  });

  it('rejects a local or non-HTTPS callback address', () => {
    configuration.PAYTECH_PUBLIC_API_URL = 'http://localhost:4000';

    const status = payTech.getConfigurationStatus();

    expect(status.ready).toBe(false);
    expect(status.callbackUsesHttps).toBe(false);
    expect(status.issues).toContain(
      'PAYTECH_PUBLIC_API_URL doit utiliser HTTPS pour recevoir la notification PayTech.',
    );
    expect(status.issues).toContain(
      'La notification PayTech ne peut pas atteindre une adresse locale.',
    );
  });

  it('rejects a local frontend return address', () => {
    configuration.FRONTEND_URL = 'http://localhost:3000';

    const status = payTech.getConfigurationStatus();

    expect(status.ready).toBe(false);
    expect(status.issues).toContain(
      'FRONTEND_URL doit être une adresse publique accessible à PayTech ; localhost n’est pas accepté.',
    );
    configuration.FRONTEND_URL = 'https://sunutechhub.sn';
  });

  it('rejects the example callback URL from the environment template', () => {
    configuration.PAYTECH_PUBLIC_API_URL =
      'https://your-public-api.example.com';

    const status = payTech.getConfigurationStatus();

    expect(status.ready).toBe(false);
    expect(status.issues).toContain(
      'PAYTECH_PUBLIC_API_URL utilise encore une adresse d’exemple. Configurez un domaine public HTTPS ou une URL HTTPS de tunnel.',
    );
  });

  it('does not allow PayTech test mode in production', () => {
    configuration.PAYTECH_PUBLIC_API_URL = 'https://payments.example.sn';
    configuration.NODE_ENV = 'production';

    const status = payTech.getConfigurationStatus();

    expect(status.ready).toBe(false);
    expect(status.issues).toContain(
      'Le mode test PayTech est interdit en production.',
    );
  });
});

describe('PayTechService checkout methods', () => {
  it('offers Wave and Orange Money without a preferred method', async () => {
    let checkoutPayload: Record<string, unknown> | undefined;
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        checkoutPayload = JSON.parse(
          String(init?.body),
        ) as Record<string, unknown>;
        return new Response(
        JSON.stringify({
          success: 1,
          redirect_url: 'https://paytech.sn/payment/checkout/test-token',
        }),
        { status: 200 },
        );
      },
    );
    vi.stubGlobal('fetch', fetchMock);
    const service = new PayTechService(
      new ConfigService({
        PAYTECH_API_KEY: 'test-key',
        PAYTECH_API_SECRET: 'test-secret',
        JWT_SECRET: 'test-jwt-secret',
        PAYTECH_ENV: 'test',
        PAYTECH_PUBLIC_API_URL: 'https://payments.example.sn',
        PAYTECH_API_URL: 'https://paytech.sn/api/payment/request-payment',
        FRONTEND_URL: 'https://sunutechhub.sn',
        NODE_ENV: 'development',
      }),
    );

    await service.createCheckout({
      itemName: 'Cours test',
      amount: 1000,
      currency: 'FCFA',
      reference: 'STH-test-reference',
      paymentId: 'test-payment-id',
    });

    expect(checkoutPayload?.target_payment).toBe('Wave, Orange Money');
    const successUrl = new URL(String(checkoutPayload?.success_url));
    const cancelUrl = new URL(String(checkoutPayload?.cancel_url));
    expect(successUrl.origin + successUrl.pathname).toBe(
      'https://sunutechhub.sn/paiement/succes',
    );
    expect(cancelUrl.origin + cancelUrl.pathname).toBe(
      'https://sunutechhub.sn/paiement/annule',
    );
    for (const url of [successUrl, cancelUrl]) {
      const expiresAt = Number(url.searchParams.get('expires'));
      const token = url.searchParams.get('token') ?? '';
      expect(url.searchParams.get('reference')).toBe('STH-test-reference');
      expect(
        isValidPaymentReturnToken(
          'STH-test-reference',
          expiresAt,
          token,
          'test-jwt-secret',
        ),
      ).toBe(true);
    }
    expect(checkoutPayload?.ipn_url).toBe(
      'https://payments.example.sn/api/webhooks/paytech',
    );
  });
});
