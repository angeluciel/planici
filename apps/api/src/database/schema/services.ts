import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { recordStatus } from './enums.js';
import { formRecords } from './form-records.js';
import { tenants } from './tenants.js';

/**
 * Service of SPEC-0005: the system attributes. Custom values live in
 * `form_record_values` through the linked record (SPEC-0003 R5). Every row
 * carries `tenant_id` (RN-02).
 */
export const services = pgTable(
  'services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    // one-to-one; deleting the record deletes the service (R7)
    formRecordId: uuid('form_record_id')
      .notNull()
      .unique()
      .references(() => formRecords.id, { onDelete: 'cascade' }),

    // R2, normalised
    name: text('name').notNull(),
    // textKey(name): uniqueness, sort and search key (R3, R9)
    nameKey: text('name_key').notNull(),
    // R4: whole minutes, 5-1,440
    durationMinutes: integer('duration_minutes').notNull(),
    // R5: centavos, 0-99,999,999 (api-convention.md, Money)
    priceCents: integer('price_cents').notNull(),
    currency: text('currency').notNull().default('BRL'),
    // `inactive` of the contract is stored as `suspended`; `deleted` is never
    // stored, a delete is physical (SPEC-0005 plan, G-4)
    status: recordStatus('status').notNull().default('active'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // R3: counts inactive services; the race of AC-0005-64 ends here
    uniqueIndex('idx_services_tenant_name_key').on(
      table.tenantId,
      table.nameKey,
    ),
    // list order and keyset (R9)
    index('idx_services_tenant_status_name').on(
      table.tenantId,
      table.status,
      table.nameKey,
      table.id,
    ),
    check('ck_services_status', sql`${table.status} in ('active','suspended')`),
    check(
      'ck_services_duration',
      sql`${table.durationMinutes} between 5 and 1440`,
    ),
    check('ck_services_price', sql`${table.priceCents} between 0 and 99999999`),
    check('ck_services_currency', sql`${table.currency} = 'BRL'`),
  ],
);

export type ServiceRow = typeof services.$inferSelect;
export type NewServiceRow = typeof services.$inferInsert;
