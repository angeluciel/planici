import { sql } from 'drizzle-orm';
import {
  check,
  customType,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { formFields, forms, formVersions } from './forms.js';
import { tenants } from './tenants.js';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

const tenantId = () =>
  text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' });

/**
 * Shared record of SPEC-0003. RESTRICT on template and version: a template
 * delete never removes records by accident (SPEC-0001 Persistence).
 */
export const formRecords = pgTable(
  'form_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: tenantId(),
    formId: uuid('form_id')
      .notNull()
      .references(() => forms.id, { onDelete: 'restrict' }),
    formVersionId: uuid('form_version_id')
      .notNull()
      .references(() => formVersions.id, { onDelete: 'restrict' }),

    revision: integer('revision').notNull().default(1),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_form_records_tenant_form').on(table.tenantId, table.formId),
    index('idx_form_records_version').on(table.formVersionId),
  ],
);

/**
 * Custom-field values only (SPEC-0003 R5), AES-256-GCM encrypted (R11).
 * One row per (record, field).
 */
export const formRecordValues = pgTable(
  'form_record_values',
  {
    formRecordId: uuid('form_record_id')
      .notNull()
      .references(() => formRecords.id, { onDelete: 'cascade' }),
    fieldId: uuid('field_id')
      .notNull()
      .references(() => formFields.id, { onDelete: 'restrict' }),
    tenantId: tenantId(),

    keyVersion: smallint('key_version').notNull(),
    valueCiphertext: bytea('value_ciphertext').notNull(),

    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: 'form_record_values_pkey',
      columns: [table.formRecordId, table.fieldId],
    }),
    index('idx_form_record_values_field_id').on(table.fieldId),
    index('idx_form_record_values_tenant_id').on(table.tenantId),
    check(
      'form_record_values_key_version_check',
      sql`${table.keyVersion} >= 1`,
    ),
  ],
);

export type FormRecordRow = typeof formRecords.$inferSelect;
export type FormRecordValueRow = typeof formRecordValues.$inferSelect;
