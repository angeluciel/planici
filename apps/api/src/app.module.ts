import { Module } from '@nestjs/common';
import { ConfigModule } from '@config/config.module.js';
import { createObserveModule } from '@nestjs/observe';
import { DatabaseModule } from './database/database.module.js';
import { MailModule } from '@modules/mail/mail.module.js';
import { AuthModule } from '@modules/auth/auth.module.js';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { HealthController } from './health/health.controller.js';
import { APP_GUARD } from '@nestjs/core';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    MailModule,
    AuthModule,
    // per-IP route limit
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 60 }],
      skipIf: () => process.env.THROTTLE_DISABLED === 'true',
    }),
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'api',
    }),
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
