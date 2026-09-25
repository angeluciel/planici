import { Module } from '@nestjs/common';
import { TENANT_UNIT_OF_WORK } from './tenant-unit-of-work.port.js';
import { DrizzleTenantUnitOfWork } from './tenant-unit-of-work.service.js';

/**
 * `DatabaseModule` is `@Global()`, so `DRIZZLE` is already available app-wide
 * — no need to import it here explicitly.
 */
@Module({
  providers: [
    { provide: TENANT_UNIT_OF_WORK, useClass: DrizzleTenantUnitOfWork },
  ],
  exports: [TENANT_UNIT_OF_WORK],
})
export class TenantUnitOfWorkModule {}
