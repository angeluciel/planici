import { Module } from '@nestjs/common';
import { ConfigModule } from '@config/config.module.js';
import { createObserveModule } from '@nestjs/observe';
import { DatabaseModule } from './database/database.module.js';
import { MailModule } from '@modules/mail/mail.module.js';
import { AuthModule } from '@modules/auth/auth.module.js';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { HealthController } from './health/health.controller.js';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { TenantsModule } from './modules/tenants/tenants.module.js';
import { FormsModule } from './modules/forms/forms.module.js';
import { RecordsModule } from './modules/records/records.module.js';
import { ClientsModule } from './modules/clients/clients.module.js';
import { ServicesModule } from './modules/services/services.module.js';
import { ClientPhonePresence } from './modules/clients/infrastructure/client-phone.presence.js';
import { PgDatabase } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';

export const { ObserveModule, ObserveInstrument } = createObserveModule({
  // pg-pool runs `new this.Promise(...)`; observe's proxy wraps native
  // constructors as plain functions, so every traced query threw a TypeError
  //
  // The Drizzle instance is skipped so the raw DrizzleQueryError, whose message
  // holds the query parameters (client data, SPEC-0004 R13), is never captured
  // above the repository, which rethrows it as ClientPersistenceError.
  skipInstrumentation: (instance) =>
    instance instanceof Pool || instance instanceof PgDatabase,
});

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    MailModule,
    AuthModule,
    TenantsModule,
    FormsModule.forRoot({ systemFieldPresence: ClientPhonePresence }),
    RecordsModule,
    ClientsModule,
    ServicesModule,
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
