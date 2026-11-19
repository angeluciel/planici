import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { recordStatus } from './enums.js';
import { formRecords } from './form-records.js';
import { tenants } from './tenants.js';
import { users } from './users.js';

/**
 * Client of SPEC-0004: the system attributes and the consent attestation. Custom
 * values live in `form_record_values` through the linked record (SPEC-0003 R5).
 * Every row carries `tenant_id` (RN-02).
 */
export const clients = pgTable(
  'clients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    // one-to-one; deleting the record deletes the client (R7)
    formRecordId: uuid('form_record_id')
      .notNull()
      .unique()
      .references(() => formRecords.id, { onDelete: 'cascade' }),

    // R2, normalised
    name: text('name').notNull(),
    // textKey(name): sort and search key (R9, R10)
    nameKey: text('name_key').notNull(),
    // R3, lowercased
    email: text('email').notNull(),
    // R4, digits only
    phone: text('phone'),
    // `inactive` of the contract is stored as `suspended`; `deleted` is never
    // stored, a delete is physical (SPEC-0004 plan, Decision 2)
    status: recordStatus('status').notNull().default('active'),

    // R12: the attestation, given once when the client is created
    consentAttestedBy: uuid('consent_attested_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    consentAttestedAt: timestamp('consent_attested_at', {
      withTimezone: true,
    }).notNull(),
    consentTextVersion: text('consent_text_version').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // R5: counts inactive clients; the race of AC-0004-20 ends here
    uniqueIndex('idx_clients_tenant_email').on(table.tenantId, table.email),
    // list order and keyset (R10)
    index('idx_clients_tenant_status_name').on(
      table.tenantId,
      table.status,
      table.nameKey,
      table.id,
    ),
    check(
      'clients_status_check',
      sql`${table.status} in ('active','suspended')`,
    ),
  ],
);

export type ClientRow = typeof clients.$inferSelect;
export type NewClientRow = typeof clients.$inferInsert;
