import { ConfigService } from '@nestjs/config';
import { PayTechService } from './paytech.service.js';

describe('PayTechService configuration status', () => {
  const configuration: Record<string, string> = {
    PAYTECH_API_KEY: 'test-key',
    PAYTECH_API_SECRET: 'test-secret',
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
