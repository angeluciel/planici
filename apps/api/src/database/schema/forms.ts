import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { fieldType, formStatus, formType } from './enums.js';
import { tenants } from './tenants.js';

const tenantId = () =>
  text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' });

/** Form template (SPEC-0001). Every row carries `tenant_id` (RN-02). */
export const forms = pgTable(
  'forms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: tenantId(),

    type: formType('type').notNull(),
    name: text('name').notNull(),
    // FormName value object: lowercase, accents stripped, whitespace collapsed (R4)
    nameKey: text('name_key').notNull(),
    description: text('description'),
    status: formStatus('status').notNull().default('active'),

    latestVersion: integer('latest_version').notNull(),
    revision: integer('revision').notNull().default(1),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_forms_tenant_name_key').on(table.tenantId, table.nameKey),
    index('idx_forms_tenant_type_status').on(
      table.tenantId,
      table.type,
      table.status,
    ),
    check('forms_latest_version_check', sql`${table.latestVersion} >= 1`),
    check('forms_revision_check', sql`${table.revision} >= 1`),
  ],
);

/** A published version; immutable once written (R15). */
export const formVersions = pgTable(
  'form_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: tenantId(),
    formId: uuid('form_id')
      .notNull()
      .references(() => forms.id, { onDelete: 'cascade' }),

    number: integer('number').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_form_versions_form_number').on(table.formId, table.number),
    index('idx_form_versions_tenant_id').on(table.tenantId),
  ],
);

/** Field identity plus metadata shared by every version (SPEC-0001 §3.3). */
export const formFields = pgTable(
  'form_fields',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: tenantId(),
    formId: uuid('form_id')
      .notNull()
      .references(() => forms.id, { onDelete: 'cascade' }),

    type: fieldType('type').notNull(),
    systemKey: text('system_key'),
    label: text('label').notNull(),
    helpText: text('help_text'),
    sensitive: boolean('sensitive').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_form_fields_form_system_key')
      .on(table.formId, table.systemKey)
      .where(sql`${table.systemKey} is not null`),
    index('idx_form_fields_form_id').on(table.formId),
    index('idx_form_fields_tenant_id').on(table.tenantId),
    // SPEC-0002 R4: system fields are never protected
    check(
      'ck_form_fields_system_not_sensitive',
      sql`${table.systemKey} is null or ${table.sensitive} = false`,
    ),
    // SPEC-0002 R5, R7: always-protected types are stored protected
    check(
      'ck_form_fields_always_protected',
      sql`${table.systemKey} is not null or ${table.type} not in ('email','phone','cpf','full_name','address') or ${table.sensitive} = true`,
    ),
    // SPEC-0002 §3.1: duration and money exist only as system fields
    check(
      'ck_form_fields_system_only_types',
      sql`${table.type} not in ('duration','money') or ${table.systemKey} is not null`,
    ),
  ],
);

/** `select` option identity and label. */
export const formFieldOptions = pgTable(
  'form_field_options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: tenantId(),
    fieldId: uuid('field_id')
      .notNull()
      .references(() => formFields.id, { onDelete: 'cascade' }),

    label: text('label').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_form_field_options_field_id').on(table.fieldId),
    index('idx_form_field_options_tenant_id').on(table.tenantId),
  ],
);

/** Which fields a version has, in which order, and whether required. */
export const formVersionFields = pgTable(
  'form_version_fields',
  {
    versionId: uuid('version_id')
      .notNull()
      .references(() => formVersions.id, { onDelete: 'cascade' }),
    fieldId: uuid('field_id')
      .notNull()
      .references(() => formFields.id, { onDelete: 'cascade' }),
    tenantId: tenantId(),

    position: integer('position').notNull(),
    required: boolean('required').notNull().default(false),
  },
  (table) => [
    primaryKey({
      name: 'form_version_fields_pkey',
      columns: [table.versionId, table.fieldId],
    }),
    unique('idx_form_version_fields_position').on(
      table.versionId,
      table.position,
    ),
    index('idx_form_version_fields_tenant_id').on(table.tenantId),
  ],
);

/** Which options a version's `select` field has, in which order. */
export const formVersionFieldOptions = pgTable(
  'form_version_field_options',
  {
    versionId: uuid('version_id')
      .notNull()
      .references(() => formVersions.id, { onDelete: 'cascade' }),
    optionId: uuid('option_id')
      .notNull()
      .references(() => formFieldOptions.id, { onDelete: 'cascade' }),
    fieldId: uuid('field_id').notNull(),
    tenantId: tenantId(),

    position: integer('position').notNull(),
  },
  (table) => [
    primaryKey({
      name: 'form_version_field_options_pkey',
      columns: [table.versionId, table.optionId],
    }),
    unique('idx_form_version_field_options_position').on(
      table.versionId,
      table.fieldId,
      table.position,
    ),
    index('idx_form_version_field_options_tenant_id').on(table.tenantId),
  ],
);

export type FormRow = typeof forms.$inferSelect;
export type NewFormRow = typeof forms.$inferInsert;
export type FormVersionRow = typeof formVersions.$inferSelect;
export type FormFieldRow = typeof formFields.$inferSelect;
export type FormFieldOptionRow = typeof formFieldOptions.$inferSelect;
export type FormVersionFieldRow = typeof formVersionFields.$inferSelect;
export type FormVersionFieldOptionRow =
  typeof formVersionFieldOptions.$inferSelect;
