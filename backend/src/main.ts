import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isIP } from 'node:net';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);
  const trustedProxyIps = config
    .get<string>('TRUSTED_PROXY_IPS', '')
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean);
  if (trustedProxyIps.some((address) => isIP(address) === 0)) {
    throw new Error(
      'TRUSTED_PROXY_IPS doit contenir uniquement des adresses IP.',
    );
  }
  app
    .getHttpAdapter()
    .getInstance()
    .set(
      'trust proxy',
      trustedProxyIps.length ? trustedProxyIps : ['loopback'],
    );
  const origins = config
    .get<string>('CORS_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(helmet());
  app.enableCors({ origin: origins, credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();
  await app.listen(Number(config.get<string>('PORT', '4000')), '0.0.0.0');
}
await bootstrap();
