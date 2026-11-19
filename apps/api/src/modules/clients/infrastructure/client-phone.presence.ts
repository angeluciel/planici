import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DRIZZLE } from '@src/database/database.constants.js';
import type { Database } from '@src/database/database.module.js';
import { clients, formRecords } from '@src/database/schema/index.js';
import type { SystemFieldPresence } from '@modules/forms/ports/system-field-presence.js';
import { guardQuery } from './persistence/guard-query.js';

/** The clients adapter of `SystemFieldPresence` (SPEC-0004 plan, API). */
@Injectable()
export class ClientPhonePresence implements SystemFieldPresence {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  findRecordIdsWithoutClientPhone(
    tenantId: string,
    formId: string,
  ): Promise<string[]> {
    return guardQuery(async () => {
      const rows = await this.db
        .select({ id: clients.formRecordId })
        .from(clients)
        .innerJoin(formRecords, eq(formRecords.id, clients.formRecordId))
        .where(
          and(
            eq(clients.tenantId, tenantId),
            eq(formRecords.tenantId, tenantId),
            eq(formRecords.formId, formId),
            isNull(clients.phone),
          ),
        );

      return rows.map((row) => row.id);
    });
  }
}
