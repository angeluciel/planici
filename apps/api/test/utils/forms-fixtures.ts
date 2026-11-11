import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { FieldInput, FormType } from '@planici/schemas';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import type { Pool } from 'pg';
import request from 'supertest';
import * as schema from '@src/database/schema/index.js';
import type {
  StoredForm,
  StoredFormField,
  TransactionHandle,
} from '@modules/forms/ports/form-repository.js';
import { Membership, Tenant } from '@modules/tenants/domain/tenant.entity.js';
import {
  CURRENT_FIELD_VALUE_KEY_VERSION,
  FieldValueCipher,
} from '@shared/crypto/field-value.cipher.js';
import type { TestContext } from '../setup/test-app.js';

/**
 * Fixtures for SPEC-0001 tests. Templates, versions, fields, options, records
 * and encrypted values are written straight to the database (plan section 2,
 * Dependencies), values with the real FieldValueCipher in the plan's plaintext
 * format: UTF-8 JSON, a `select` value is its option id, a `yes_no` is stored
 * only when true. Fixtures follow the SPEC-0002 input rules: no `sensitive` on
 * system fields, protected-type or section 3.4 labels are seeded protected.
 */

// ---------------------------------------------------------------------------
// users, tenants and the HTTP client

export type Session = { token: string; tenantId: string };

export async function signUp(
  ctx: TestContext,
  email: string,
  slug: string,
): Promise<string> {
  const api = () => request(ctx.app.getHttpServer());
  await api().post('/v1/auth/email/code').send({ email }).expect(202);

  const mail = await ctx.mailer.waitFor(email);
  const code = /\b(\d{6})\b/.exec(mail.text ?? '')?.[1];
  if (!code) throw new Error(`No verification code in: ${mail.text}`);
  const verified = await api()
    .post('/v1/auth/email/verify')
    .send({ email, code })
    .expect(200);

  const response = await api()
    .post('/v1/auth/register')
    .send({
      provider: 'email',
      email,
      password: 'password123!',
      emailVerificationToken: verified.body.emailVerificationToken,
      name: 'Ana',
      surname: 'Souza',
      slug,
      consent: {
        acceptedTerms: true,
        marketingOptIn: false,
        termsVersion: '2026-01-01',
        acceptedAt: new Date().toISOString(),
      },
    })
    .expect(201);

  return response.body.accessToken as string;
}

/** Registers a user and creates a workspace they own. */
export async function signUpOwner(
  ctx: TestContext,
  slug: string,
): Promise<Session> {
  const token = await signUp(ctx, `${slug}@planici.co`, slug);
  const created = await request(ctx.app.getHttpServer())
    .post('/v1/tenants')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: `Studio ${slug}`, slug })
    .expect(201);

  return { token, tenantId: created.body.id as string };
}

/** `/v1/forms` calls for one caller and one active tenant. */
export function formsApi(
  app: INestApplication,
  session: { token?: string; tenantId?: string },
) {
  const call = (
    method: 'get' | 'post' | 'patch',
    path: string,
    body?: object,
  ) => {
    let req = request(app.getHttpServer())[method](`/v1/forms${path}`);
    if (session.token)
      req = req.set('Authorization', `Bearer ${session.token}`);
    if (session.tenantId) req = req.set('X-Tenant-Id', session.tenantId);
    return body === undefined ? req : req.send(body);
  };

  return {
    list: (query: Record<string, string> = {}) => call('get', '').query(query),
    create: (body: object) => call('post', '', body),
    read: (id: string) => call('get', `/${id}`),
    update: (id: string, body: object) => call('patch', `/${id}`, body),
    preview: (id: string, body: object) => call('post', `/${id}/preview`, body),
    version: (id: string, version: string | number) =>
      call('get', `/${id}/versions/${version}`),
    archive: (id: string) => call('post', `/${id}/archive`),
    unarchive: (id: string) => call('post', `/${id}/unarchive`),
    remove: (id: string, body: object = {}) =>
      call('post', `/${id}/delete`, body),
  };
}

// ---------------------------------------------------------------------------
// request payload builders

export const CLIENT_SYSTEM_INPUTS: FieldInput[] = [
  {
    systemKey: 'client.name',
    label: 'Nome completo',
    type: 'full_name',
    required: true,
  },
  { systemKey: 'client.email', label: 'E-mail', type: 'email', required: true },
  {
    systemKey: 'client.phone',
    label: 'Telefone',
    type: 'phone',
    required: false,
  },
];

export const SERVICE_SYSTEM_INPUTS: FieldInput[] = [
  { systemKey: 'service.name', label: 'Nome', type: 'text', required: true },
  {
    systemKey: 'service.duration',
    label: 'Duração (minutos)',
    type: 'duration',
    required: true,
  },
  {
    systemKey: 'service.price',
    label: 'Preço',
    type: 'money',
    required: true,
  },
];

/** A create request for a client template with the given custom fields. */
export function createClientBody(
  name: string,
  custom: FieldInput[] = [],
  extra: Record<string, unknown> = {},
) {
  return {
    type: 'client',
    name,
    fields: [...CLIENT_SYSTEM_INPUTS, ...custom],
    ...extra,
  };
}

type ResponseField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  sensitive: boolean;
  helpText: string | null;
  options: { id: string; label: string }[] | null;
  systemKey: string | null;
};

/**
 * The field list of an update or preview request that changes nothing: every
 * field of the response, by id, without `systemKey` (not sent on updates) and
 * without `sensitive` on system fields.
 */
export function inputsFrom(fields: ResponseField[]): FieldInput[] {
  return fields.map((field) => ({
    id: field.id,
    label: field.label,
    type: field.type,
    required: field.required,
    ...(field.systemKey ? {} : { sensitive: field.sensitive }),
    helpText: field.helpText,
    ...(field.options
      ? { options: field.options.map(({ id, label }) => ({ id, label })) }
      : {}),
  })) as FieldInput[];
}

/** `count` new custom text fields, labelled "Campo 1" ... "Campo N". */
export function manyCustomFields(count: number): FieldInput[] {
  return Array.from({ length: count }, (_, index) => ({
    label: `Campo ${index + 1}`,
    type: 'text',
  })) as FieldInput[];
}

// ---------------------------------------------------------------------------
// seeding with Drizzle

export type SeedField = {
  label: string;
  type?: string;
  systemKey?: string;
  required?: boolean;
  sensitive?: boolean;
  helpText?: string | null;
  /** Option labels of a `select` field, in this version. */
  options?: string[];
};

export const CLIENT_SYSTEM_FIELDS: SeedField[] = [
  {
    systemKey: 'client.name',
    label: 'Nome completo',
    type: 'full_name',
    required: true,
  },
  { systemKey: 'client.email', label: 'E-mail', type: 'email', required: true },
  {
    systemKey: 'client.phone',
    label: 'Telefone',
    type: 'phone',
    required: false,
  },
];

export const SERVICE_SYSTEM_FIELDS: SeedField[] = [
  { systemKey: 'service.name', label: 'Nome', type: 'text', required: true },
  {
    systemKey: 'service.duration',
    label: 'Duração (minutos)',
    type: 'duration',
    required: true,
  },
  { systemKey: 'service.price', label: 'Preço', type: 'money', required: true },
];

export type SeedFormInput = {
  tenantId: string;
  name: string;
  type?: FormType;
  status?: 'active' | 'archived';
  description?: string | null;
  revision?: number;
  /**
   * Fields of version 1, 2, ... Fields are identified across versions by label
   * (options by label inside their field). The latest version is the last one.
   * Defaults to one version with the system fields of the type.
   */
  versions?: SeedField[][];
};

export type SeededForm = {
  id: string;
  tenantId: string;
  latestVersion: number;
  versionId: (version: number) => string;
  fieldId: (label: string) => string;
  optionId: (fieldLabel: string, optionLabel: string) => string;
  fieldLabels: string[];
};

export type TestDb = NodePgDatabase<typeof schema>;

export function dbFor(pool: Pool): TestDb {
  return drizzle(pool, { schema });
}

export function nameKeyOf(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export async function seedForm(
  db: TestDb,
  input: SeedFormInput,
): Promise<SeededForm> {
  const type = input.type ?? 'client';
  const versions = input.versions ?? [
    type === 'client' ? CLIENT_SYSTEM_FIELDS : SERVICE_SYSTEM_FIELDS,
  ];
  const formId = randomUUID();

  await db.insert(schema.forms).values({
    id: formId,
    tenantId: input.tenantId,
    type,
    name: input.name,
    nameKey: nameKeyOf(input.name),
    description: input.description ?? null,
    status: input.status ?? 'active',
    latestVersion: versions.length,
    revision: input.revision ?? 1,
  });

  const fieldIds = new Map<string, string>();
  const optionIds = new Map<string, string>();
  const versionIds: string[] = [];

  for (const [index, fields] of versions.entries()) {
    const versionId = randomUUID();
    versionIds.push(versionId);
    await db.insert(schema.formVersions).values({
      id: versionId,
      tenantId: input.tenantId,
      formId,
      number: index + 1,
    });

    for (const [position, field] of fields.entries()) {
      let fieldId = fieldIds.get(field.label);
      if (!fieldId) {
        fieldId = randomUUID();
        fieldIds.set(field.label, fieldId);
        await db.insert(schema.formFields).values({
          id: fieldId,
          tenantId: input.tenantId,
          formId,
          type: (field.type ?? 'text') as never,
          systemKey: field.systemKey ?? null,
          label: field.label,
          helpText: field.helpText ?? null,
          sensitive: field.sensitive ?? false,
        });
      }

      await db.insert(schema.formVersionFields).values({
        versionId,
        fieldId,
        tenantId: input.tenantId,
        position,
        required: field.required ?? false,
      });

      for (const [optionPosition, optionLabel] of (
        field.options ?? []
      ).entries()) {
        const key = `${field.label}\u0000${optionLabel}`;
        let optionId = optionIds.get(key);
        if (!optionId) {
          optionId = randomUUID();
          optionIds.set(key, optionId);
          await db.insert(schema.formFieldOptions).values({
            id: optionId,
            tenantId: input.tenantId,
            fieldId,
            label: optionLabel,
          });
        }
        await db.insert(schema.formVersionFieldOptions).values({
          versionId,
          optionId,
          fieldId,
          tenantId: input.tenantId,
          position: optionPosition,
        });
      }
    }
  }

  return {
    id: formId,
    tenantId: input.tenantId,
    latestVersion: versions.length,
    versionId: (version) => versionIds[version - 1]!,
    fieldId: (label) => {
      const id = fieldIds.get(label);
      if (!id) throw new Error(`seed has no field "${label}"`);
      return id;
    },
    optionId: (fieldLabel, optionLabel) => {
      const id = optionIds.get(`${fieldLabel}\u0000${optionLabel}`);
      if (!id) throw new Error(`seed has no option "${optionLabel}"`);
      return id;
    },
    fieldLabels: [...fieldIds.keys()],
  };
}

export type SeedRecordInput = {
  form: SeededForm;
  version: number;
  /** Answers by field label; a `select` answer is the option label. */
  answers?: Record<string, string | number | boolean>;
  revision?: number;
};

export type SeededRecord = { id: string };

let cipher: FieldValueCipher | undefined;
function valueCipher(): FieldValueCipher {
  cipher ??= new FieldValueCipher(process.env.FIELD_VALUES_KEY!);
  return cipher;
}

/** One record on `version`, with encrypted values for its answers. */
export async function seedRecord(
  db: TestDb,
  input: SeedRecordInput,
): Promise<SeededRecord> {
  const recordId = randomUUID();
  const { form } = input;

  await db.insert(schema.formRecords).values({
    id: recordId,
    tenantId: form.tenantId,
    formId: form.id,
    formVersionId: form.versionId(input.version),
    revision: input.revision ?? 1,
  });

  for (const [label, answer] of Object.entries(input.answers ?? {})) {
    // a yes_no is stored only when true (SPEC-0003 section 3.1)
    if (answer === false) continue;

    const fieldId = form.fieldId(label);
    const [field] = await db
      .select({ type: schema.formFields.type })
      .from(schema.formFields)
      .where(sql`${schema.formFields.id} = ${fieldId}`);
    const plaintext =
      field?.type === 'select' && typeof answer === 'string'
        ? form.optionId(label, answer)
        : answer;

    await db.insert(schema.formRecordValues).values({
      formRecordId: recordId,
      fieldId,
      tenantId: form.tenantId,
      keyVersion: CURRENT_FIELD_VALUE_KEY_VERSION,
      valueCiphertext: valueCipher().encrypt(plaintext, {
        keyVersion: CURRENT_FIELD_VALUE_KEY_VERSION,
        tenantId: form.tenantId,
        formRecordId: recordId,
        fieldId,
      }),
    });
  }

  return { id: recordId };
}

export async function seedRecords(
  db: TestDb,
  form: SeededForm,
  versions: number[],
  answers: (
    index: number,
  ) => Record<string, string | number | boolean> = () => ({}),
): Promise<SeededRecord[]> {
  const records: SeededRecord[] = [];
  for (const [index, version] of versions.entries()) {
    records.push(
      await seedRecord(db, { form, version, answers: answers(index) }),
    );
  }
  return records;
}

/** `count` bare templates (no versions), `archived` of them archived. */
export async function seedManyForms(
  pool: Pool,
  tenantId: string,
  count: number,
  archived: number,
): Promise<void> {
  await pool.query(
    `insert into forms (tenant_id, type, name, name_key, status, latest_version)
     select $1, 'client', 'Modelo ' || n, 'modelo ' || n,
            (case when n <= $3 then 'archived' else 'active' end)::form_status, 1
       from generate_series(1, $2::int) as n`,
    [tenantId, count, archived],
  );
}

// ---------------------------------------------------------------------------
// reading stored rows back

export async function formRow(pool: Pool, formId: string) {
  const { rows } = await pool.query(
    `select id, tenant_id, type, name, status, latest_version, revision
       from forms where id = $1`,
    [formId],
  );
  return (
    (rows[0] as
      | {
          id: string;
          tenant_id: string;
          type: string;
          name: string;
          status: string;
          latest_version: number;
          revision: number;
        }
      | undefined) ?? null
  );
}

export async function countForms(pool: Pool, tenantId: string) {
  const { rows } = await pool.query(
    'select count(*)::int as n from forms where tenant_id = $1',
    [tenantId],
  );
  return rows[0].n as number;
}

export async function versionCount(pool: Pool, formId: string) {
  const { rows } = await pool.query(
    'select count(*)::int as n from form_versions where form_id = $1',
    [formId],
  );
  return rows[0].n as number;
}

export type RecordRow = {
  id: string;
  form_version_id: string;
  revision: number;
  updated_at: Date;
};

export async function recordRows(pool: Pool, formId: string) {
  const { rows } = await pool.query(
    `select id, form_version_id, revision, updated_at
       from form_records where form_id = $1 order by id`,
    [formId],
  );
  return rows as RecordRow[];
}

export async function valueRowCount(
  pool: Pool,
  where: { formId?: string; recordId?: string; fieldId?: string },
) {
  const { rows } = await pool.query(
    `select count(*)::int as n
       from form_record_values v
       join form_records r on r.id = v.form_record_id
      where ($1::uuid is null or r.form_id = $1)
        and ($2::uuid is null or v.form_record_id = $2)
        and ($3::uuid is null or v.field_id = $3)`,
    [where.formId ?? null, where.recordId ?? null, where.fieldId ?? null],
  );
  return rows[0].n as number;
}

export const ERASURE_TABLES = [
  'forms',
  'form_versions',
  'form_fields',
  'form_field_options',
  'form_version_fields',
  'form_version_field_options',
  'form_records',
  'form_record_values',
] as const;

export async function rowsPerTable(pool: Pool, tenantId: string) {
  const result: Record<string, number> = {};
  for (const table of ERASURE_TABLES) {
    const { rows } = await pool.query(
      `select count(*)::int as n from ${table} where tenant_id = $1`,
      [tenantId],
    );
    result[table] = rows[0].n as number;
  }
  return result;
}

/**
 * Makes the update of one record fail (AC-0001-28). Returns a function that
 * drops the trigger again.
 */
export async function failUpdatesOfRecord(
  pool: Pool,
  recordId: string,
): Promise<() => Promise<void>> {
  const suffix = recordId.replaceAll('-', '');
  await pool.query(`
    create function fail_record_update_${suffix}() returns trigger as $$
    begin
      if old.id = '${recordId}' then
        raise exception 'test trigger: update of record ${recordId} fails';
      end if;
      return new;
    end
    $$ language plpgsql`);
  await pool.query(`
    create trigger fail_record_update_${suffix}
      before update on form_records
      for each row execute function fail_record_update_${suffix}()`);

  return async () => {
    await pool.query(
      `drop trigger if exists fail_record_update_${suffix} on form_records`,
    );
    await pool.query(`drop function if exists fail_record_update_${suffix}()`);
  };
}

/** A fake `RecordHistoryReader` whose history is set per template. */
export class FakeRecordHistory {
  private readonly byForm = new Map<string, number>();

  setHistory(formId: string, records: number): void {
    this.byForm.set(formId, records);
  }

  countRecordsWithHistory(_tenantId: string, formId: string): Promise<number> {
    return Promise.resolve(this.byForm.get(formId) ?? 0);
  }
}

// ---------------------------------------------------------------------------
// in-memory ports for handler specs (fake ports, no database)

/** A client template at `latestVersion` with its system fields. */
export function storedClientForm(
  overrides: Partial<StoredForm> = {},
): StoredForm {
  const field = (
    systemKey: StoredFormField['systemKey'],
    label: string,
    type: StoredFormField['type'],
    required: boolean,
    position: number,
  ): StoredFormField => ({
    id: randomUUID(),
    type,
    systemKey,
    label,
    helpText: null,
    sensitive: false,
    required,
    position,
    options: null,
  });

  return {
    id: randomUUID(),
    tenantId: 'studio-ana-4f9k2m7x1q',
    type: 'client',
    name: 'Ficha',
    nameKey: 'ficha',
    description: null,
    status: 'active',
    latestVersion: 1,
    revision: 1,
    createdAt: new Date('2026-11-01T12:00:00.000Z'),
    updatedAt: new Date('2026-11-01T12:00:00.000Z'),
    fields: [
      field('client.name', 'Nome completo', 'full_name', true, 0),
      field('client.email', 'E-mail', 'email', true, 1),
      field('client.phone', 'Telefone', 'phone', false, 2),
    ],
    ...overrides,
  };
}

/** The owner of `tenantId`, as the active-tenant guard hands it to handlers. */
export function ownerMembership(tenantId: string): Membership {
  return new Membership(
    Tenant.fromProps({
      id: tenantId,
      name: 'Studio Ana',
      slug: 'studio-ana',
      status: 'active',
      plan: 'free',
      trialStartedAt: null,
      createdAt: new Date('2026-09-01T12:00:00.000Z'),
      updatedAt: new Date('2026-09-01T12:00:00.000Z'),
    }),
    'owner',
  );
}

/**
 * One object that fakes every port a forms handler may need: FormRepository,
 * FormRecordStore, RecordHistoryReader and SystemFieldPresence. Their method
 * names do not collide, so the same object is passed for every constructor
 * parameter and the spec does not depend on the parameter order (the port
 * shapes are provisional, plan step 2b). A transaction that throws restores
 * the stored template, like a real rollback, so a spec can assert on what is
 * stored without looking at calls.
 */
export class FakeFormPorts {
  form: StoredForm | null;
  recordCount = 0;
  recordsOnOlderVersions = 0;
  recordsLosingAnswers = 0;
  recordIdsGainingRequiredFields: string[] = [];
  recordsWithHistory = 0;
  recordIdsWithoutClientPhone: string[] = [];

  /** Set by the writes below; what a spec asserts on. */
  recordsDeleted = false;
  formDeleted = false;
  recordsRepointed = false;
  lostAnswersDeleted = false;

  constructor(form: StoredForm | null) {
    this.form = form;
  }

  // FormRepository
  list = () => Promise.resolve([]);

  findById(tenantId: string, formId: string): Promise<StoredForm | null> {
    return Promise.resolve(this.visible(tenantId, formId));
  }

  findVersionFields = () => Promise.resolve(null);

  async transaction<T>(
    _tenantId: string,
    work: (tx: TransactionHandle) => Promise<T>,
  ): Promise<T> {
    const snapshot = {
      form: this.form && structuredClone(this.form),
      recordsDeleted: this.recordsDeleted,
      formDeleted: this.formDeleted,
      recordsRepointed: this.recordsRepointed,
      lostAnswersDeleted: this.lostAnswersDeleted,
    };
    try {
      return await work({} as TransactionHandle);
    } catch (error) {
      Object.assign(this, snapshot);
      throw error;
    }
  }

  lockById(
    _tx: TransactionHandle,
    tenantId: string,
    formId: string,
  ): Promise<StoredForm | null> {
    const found = this.visible(tenantId, formId);
    return Promise.resolve(found && structuredClone(found));
  }

  countForTenantLocked = () => Promise.resolve(0);

  insert = () => Promise.resolve();

  updateRow(
    _tx: TransactionHandle,
    form: Omit<StoredForm, 'fields'>,
  ): Promise<void> {
    this.form = { ...form, fields: this.form?.fields ?? [] };
    return Promise.resolve();
  }

  publishVersion(
    _tx: TransactionHandle,
    form: StoredForm,
    version: number,
  ): Promise<void> {
    this.form = { ...form, latestVersion: version };
    return Promise.resolve();
  }

  deleteForm(): Promise<void> {
    this.formDeleted = true;
    this.form = null;
    return Promise.resolve();
  }

  // FormRecordStore
  counts() {
    return Promise.resolve({
      recordCount: this.recordCount,
      recordsOnOlderVersions: this.recordsOnOlderVersions,
    });
  }

  valueCountsByField = () => Promise.resolve(new Map<string, number>());

  countRecordsLosingAnswers = () => Promise.resolve(this.recordsLosingAnswers);

  findRecordIdsGainingRequiredFields = () =>
    Promise.resolve(this.recordIdsGainingRequiredFields);

  /** Ids whose own version does not require the field; null keeps every id passed in. */
  recordIdsNotRequiring: string[] | null = null;

  filterRecordIdsNotRequiring = (
    _tenantId: string,
    _formId: string,
    _fieldId: string,
    recordIds: string[],
  ) =>
    Promise.resolve(
      recordIds.filter(
        (id) =>
          this.recordIdsNotRequiring === null ||
          this.recordIdsNotRequiring.includes(id),
      ),
    );

  repointAll(): Promise<void> {
    this.recordsRepointed = true;
    return Promise.resolve();
  }

  deleteLostAnswers(): Promise<void> {
    this.lostAnswersDeleted = true;
    return Promise.resolve();
  }

  deleteAll(): Promise<number> {
    this.recordsDeleted = true;
    return Promise.resolve(this.recordCount);
  }

  // RecordHistoryReader
  countRecordsWithHistory = () => Promise.resolve(this.recordsWithHistory);

  // SystemFieldPresence
  findRecordIdsWithoutClientPhone = () =>
    Promise.resolve(this.recordIdsWithoutClientPhone);

  private visible(tenantId: string, formId: string): StoredForm | null {
    return this.form &&
      this.form.tenantId === tenantId &&
      this.form.id === formId
      ? this.form
      : null;
  }
}

/** Builds a handler with `ports` for every constructor parameter. */
export function buildHandler<T>(
  handler: new (...args: never[]) => T,
  ports: FakeFormPorts,
): T {
  return Reflect.construct(handler, Array(6).fill(ports)) as T;
}
