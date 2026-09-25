import { Module } from '@nestjs/common';
import { ConfigModule } from '@config/config.module.js';
import { createObserveModule } from '@nestjs/observe';
import { Pool } from 'pg';
import { DatabaseModule } from './database/database.module.js';
import { TenantUnitOfWorkModule } from '@shared/database/tenant-unit-of-work.module.js';
import { MailModule } from '@modules/mail/mail.module.js';
import { AuthModule } from '@modules/auth/auth.module.js';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { HealthController } from './health/health.controller.js';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

/**
 * JOA-39: `@nestjs/observe`'s automatic provider instrumentation wraps every
 * DI-resolved instance in a proxy that traces its methods. `pg-pool`'s
 * `BoundPool` stores the native `Promise` constructor as a plain instance
 * property (`this.Promise = options.Promise || Promise`, so callers can plug
 * in an alternate implementation) - the instrumentation proxy's `isClass`
 * check only recognizes ES `class` syntax (a regex on `fn.toString()`), so it
 * misclassifies that native constructor as a regular traceable method and
 * wraps it in a function that *calls* it (`Promise.apply(...)`) instead of
 * *constructing* it. `pg-pool`'s `Pool.prototype.query` then does
 * `new this.Promise(...)` internally for every call made without a callback
 * (which is every drizzle query, and the health check's own `pool.query`),
 * and `Promise.apply(...)` throws `TypeError: Promise constructor cannot be
 * invoked without 'new'`.
 *
 * `PG_POOL` (registered in `DatabaseModule`) is a raw `pg.Pool` instance, and
 * `DRIZZLE`'s factory is injected with whatever instance is in the DI
 * container for `PG_POOL` - so once the pool is instrumented, every drizzle
 * repository query is broken too, not just the health check's direct query.
 * Excluding `pg.Pool` instances here disables tracing on the pool only,
 * keeping HTTP/CQRS/etc. tracing intact everywhere else.
 */
export const { ObserveModule, ObserveInstrument } = createObserveModule({
  skipInstrumentation: (instance) => instance instanceof Pool,
});

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    TenantUnitOfWorkModule,
    MailModule,
    AuthModule,
    // per-IP route limit
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 60 }],
      skipIf: () => process.env.THROTTLE_DISABLED === 'true',
    }),
    ObserveModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        appKey: config.getOrThrow<string>('OBSERVE_APP_KEY'),
        appSecret: config.getOrThrow<string>('OBSERVE_APP_SECRET'),
        serviceId: 'planici-api-observe',
      }),
    }),
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
