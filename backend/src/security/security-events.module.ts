import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module.js';
import { SecurityController } from './security.controller.js';
import { SecurityEventsMiddleware } from './security-events.middleware.js';
import { SecurityEventsService } from './security-events.service.js';

@Module({
  imports: [PaymentsModule],
  controllers: [SecurityController],
  providers: [SecurityEventsMiddleware, SecurityEventsService],
  exports: [SecurityEventsMiddleware],
})
export class SecurityEventsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityEventsMiddleware).forRoutes('*');
  }
}
