import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '@src/database/database.constants.js';
import type { Database } from '@src/database/database.module.js';
import { TENANT_SESSION_VAR } from '@src/database/schema/index.js';
import { InvalidTenantIdError } from './tenant-unit-of-work.errors.js';
import type { TenantTx, TenantUnitOfWork } from './tenant-unit-of-work.port.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class DrizzleTenantUnitOfWork implements TenantUnitOfWork {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async run<T>(
    tenantId: string,
    work: (tx: TenantTx) => Promise<T>,
  ): Promise<T> {
    if (typeof tenantId !== 'string' || !UUID_RE.test(tenantId))
      throw new InvalidTenantIdError(tenantId);

    return this.db.transaction(async (tx) => {
      // Bound parameter ($1 over the wire), not a string-interpolated
      // `SET LOCAL app.current_tenant = '<value>'` — AC5. `set_config`'s
      // 3rd arg (`is_local = true`) makes it `SET LOCAL`-scoped: discarded
      // automatically on commit/rollback — AC3.
      await tx.execute(
        sql`select set_config(${TENANT_SESSION_VAR}, ${tenantId}, true)`,
      );

      return work(tx);
    });
  }
}
