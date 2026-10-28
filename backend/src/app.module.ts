import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AttestationsModule } from './attestations/attestations.module.js';
import { AdminModule } from './admin/admin.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AppController } from './app.controller.js';
import { CoursesModule } from './courses/courses.module.js';
import { CommunityModule } from './community/community.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { PaymentsModule } from './payments/payments.module.js';
import { PricingModule } from './pricing/pricing.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { PromotionsModule } from './promotions/promotions.module.js';
import { ReceiptsModule } from './receipts/receipts.module.js';

function validateEnvironment(environment: Record<string, unknown>) {
  const jwtSecret = environment.JWT_SECRET;
  if (typeof jwtSecret !== 'string' || Buffer.byteLength(jwtSecret) < 32) {
    throw new Error('JWT_SECRET doit contenir au moins 32 caractères.');
  }
  if (
    typeof environment.DATABASE_URL !== 'string' ||
    !environment.DATABASE_URL
  ) {
    throw new Error('DATABASE_URL est obligatoire.');
  }
  return environment;
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    PricingModule,
    CoursesModule,
    CommunityModule,
    PromotionsModule,
    ProjectsModule,
    PaymentsModule,
    AttestationsModule,
    AdminModule,
    ReceiptsModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
