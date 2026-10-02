import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '@src/database/database.constants.js';
import type { Database } from '@src/database/database.module.js';

export type TenantTransaction = Parameters<
  Parameters<Database['transaction']>[0]
>[0];

@Injectable()
export class TenantScope {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  run<T>(
    tenantId: string,
    work: (tx: TenantTransaction) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select set_config('app.current_tenant', ${tenantId}, true)`,
      );
      return work(tx);
    });
  }
}
