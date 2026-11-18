import { expect, vi } from 'vitest';
import type { ArgumentsHost } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import type { FieldInput, FormType, RecordBase } from '@planici/schemas';
import type { Pool } from 'pg';
import { RecordService } from '@src/modules/records/application/record.service.js';
import {
  TenantScope,
  type TenantTransaction,
} from '@modules/tenants/infrastructure/persistence/tenant-scope.js';
import { DomainExceptionFilter } from '@shared/http/domain-exception.filter.js';
import type { TestContext } from '../setup/test-app.js';
import {
  CLIENT_SYSTEM_INPUTS,
  SERVICE_SYSTEM_INPUTS,
  formsApi,
  inputsFrom,
  type Session,
} from './forms-fixtures.js';

/**
 * Fixtures for SPEC-0003 tests (plan, Tests). They build on forms-fixtures.ts,
 * which is used unchanged: templates are created and changed through
 * SPEC-0001's API, records go through `RecordService` inside `TenantScope.run`,
 * stored rows are read with the pool.
 *
 * Names the plan does not fix, picked here: `createTemplate`, `changeTemplate`,
 * `RecordTemplate`, `createRecord`, `updateRecord`, `readRecord`,
 * `expectRecordError`, `storedBytesMatching`, `captureProcessOutput`,
 * `renderWithFilter`, `setRevision`, `recordRowOf`, `countRecords`.
 */

export const RECORD_TYPES = [
  'client',
  'service',
] as const satisfies readonly FormType[];

// ---------------------------------------------------------------------------
// the two plan fixtures: the service and the tenant scope

export function recordService(ctx: TestContext): RecordService {
  return ctx.app.get(RecordService);
}

/** Runs `work` in the caller's transaction, as the SPEC-0004 and SPEC-0005 handlers do. */
export function inTenant<T>(
  ctx: TestContext,
  tenantId: string,
  work: (tx: TenantTransaction) => Promise<T>,
): Promise<T> {
  return ctx.app.get(TenantScope).run(tenantId, work);
}

// ---------------------------------------------------------------------------
// templates, through POST and PATCH /v1/forms

type ReadField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  sensitive: boolean;
  helpText: string | null;
  options: { id: string; label: string }[] | null;
  systemKey: string | null;
};

export type RecordTemplate = {
  id: string;
  tenantId: string;
  type: FormType;
  name: string;
  /** The latest version, as the template read reports it. */
  version: number;
  fields: ReadField[];
  fieldId: (label: string) => string;
  optionId: (fieldLabel: string, optionLabel: string) => string;
  systemFieldId: (systemKey: string) => string;
};

function templateFrom(
  tenantId: string,
  body: {
    id: string;
    type: FormType;
    name: string;
    version: number;
    fields: ReadField[];
  },
): RecordTemplate {
  const find = (label: string) => {
    const field = body.fields.find((candidate) => candidate.label === label);
    if (!field) throw new Error(`template has no field "${label}"`);
    return field;
  };

  return {
    id: body.id,
    tenantId,
    type: body.type,
    name: body.name,
    version: body.version,
    fields: body.fields,
    fieldId: (label) => find(label).id,
    optionId: (fieldLabel, optionLabel) => {
      const option = find(fieldLabel).options?.find(
        (candidate) => candidate.label === optionLabel,
      );
      if (!option) throw new Error(`no option "${optionLabel}"`);
      return option.id;
    },
    systemFieldId: (systemKey) => {
      const field = body.fields.find(
        (candidate) => candidate.systemKey === systemKey,
      );
      if (!field)
        throw new Error(`template has no system field "${systemKey}"`);
      return field.id;
    },
  };
}

/** An active template of `type` at version 1 with the system fields and `custom` after them. */
export async function createTemplate(
  ctx: TestContext,
  session: Session,
  type: FormType,
  name: string,
  custom: FieldInput[] = [],
): Promise<RecordTemplate> {
  const system =
    type === 'client' ? CLIENT_SYSTEM_INPUTS : SERVICE_SYSTEM_INPUTS;
  const response = await formsApi(ctx.app, session)
    .create({ type, name, fields: [...system, ...custom] })
    .expect(201);

  return templateFrom(session.tenantId, response.body);
}

export async function loadTemplate(
  ctx: TestContext,
  session: Session,
  template: { id: string },
): Promise<RecordTemplate> {
  const response = await formsApi(ctx.app, session)
    .read(template.id)
    .expect(200);
  return templateFrom(session.tenantId, response.body);
}

/**
 * Changes a template through PATCH, with every field of the template as the
 * editor would send it back, by id. `edit` returns the new field list. Returns
 * the template as read afterwards (a new version when the schema changed).
 */
export async function changeTemplate(
  ctx: TestContext,
  session: Session,
  template: { id: string },
  edit: (inputs: FieldInput[]) => FieldInput[],
  migration?: { mode: 'keep' | 'update_all'; confirmName?: string },
): Promise<RecordTemplate> {
  const api = formsApi(ctx.app, session);
  const current = await api.read(template.id).expect(200);
  const fields = edit(inputsFrom(current.body.fields));

  await api
    .update(template.id, {
      revision: current.body.revision,
      fields,
      ...(migration ? { migration } : {}),
    })
    .expect(200);

  return loadTemplate(ctx, session, template);
}

/** Edits the input with the given label in a field list. */
export function withField(
  inputs: FieldInput[],
  label: string,
  patch: Partial<FieldInput>,
): FieldInput[] {
  return inputs.map((input) =>
    input.label === label ? { ...input, ...patch } : input,
  );
}

// ---------------------------------------------------------------------------
// record calls, as the entity handlers make them (plan, rely-on points 3 and 4)

export type SystemPresence = Record<string, boolean>;

/** open, check, insert in one transaction. Returns the new record id. */
export function createRecord(
  ctx: TestContext,
  tenantId: string,
  template: RecordTemplate,
  input: {
    values: Record<string, unknown>;
    /** Defaults to the template's latest version. */
    formVersion?: number;
    /** Defaults to the template's id. */
    formId?: string;
    /** Defaults to the template's type; set it to open a record of the other type. */
    type?: FormType;
  },
): Promise<string> {
  return inTenant(ctx, tenantId, async (tx) => {
    const draft = await recordService(ctx).openForCreate(
      tx,
      tenantId,
      input.type ?? template.type,
      {
        formId: input.formId ?? template.id,
        formVersion: input.formVersion ?? template.version,
      },
    );
    const checked = await draft.checkValues(input.values);
    return draft.insert(checked);
  });
}

/** open, check, replace in one transaction. */
export function updateRecord(
  ctx: TestContext,
  tenantId: string,
  recordId: string,
  type: FormType,
  input: {
    values: Record<string, unknown>;
    formVersion: number;
    revision: number;
  },
): Promise<void> {
  return inTenant(ctx, tenantId, async (tx) => {
    const draft = await recordService(ctx).openForUpdate(
      tx,
      tenantId,
      recordId,
      type,
      { formVersion: input.formVersion, revision: input.revision },
    );
    const checked = await draft.checkValues(input.values);
    await draft.replace(checked);
  });
}

/** `read` without a transaction, as a page read does. */
export function readRecord(
  ctx: TestContext,
  tenantId: string,
  recordId: string,
  presence: SystemPresence = {},
): Promise<RecordBase> {
  // `RecordService.read` returns null for an absent or foreign record. Most
  // tests read a record they just stored and dereference it, so the helper
  // types it as present; the tests of AC-0003-22 assert the null at runtime.
  return recordService(ctx).read(
    tenantId,
    recordId,
    presence,
  ) as Promise<RecordBase>;
}

/** The presence SPEC-0004 and SPEC-0005 pass: a client's phone is the only optional system field. */
export function presenceFor(type: FormType, phone = true): SystemPresence {
  return type === 'client' ? { 'client.phone': phone } : {};
}

// ---------------------------------------------------------------------------
// errors

export type ExpectedError = { status: number; code: string; field?: string };

/** Awaits `work`, which must reject with a DomainError of this status, key and field. */
export async function expectRecordError(
  work: Promise<unknown>,
  expected: ExpectedError,
): Promise<Error> {
  const error = await work.then(
    () => {
      throw new Error(`expected ${expected.code} but the call resolved`);
    },
    (rejection: unknown) => rejection,
  );

  const { status, code, field } = error as {
    status?: number;
    code?: string;
    field?: string;
  };
  expect({ status, code, field }).toEqual({
    status: expected.status,
    code: expected.code,
    field: expected.field,
  });

  return error as Error;
}

/** What DomainExceptionFilter writes for `error`, with a fake response. */
export function renderWithFilter(error: unknown): {
  status: number;
  body: unknown;
} {
  const out = { status: 0, body: undefined as unknown };
  const response = {
    status(code: number) {
      out.status = code;
      return response;
    },
    json(body: unknown) {
      out.body = body;
      return response;
    },
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;

  new DomainExceptionFilter().catch(error, host);
  return out;
}

// ---------------------------------------------------------------------------
// stored rows

export async function countRecords(
  pool: Pool,
  tenantId: string,
): Promise<number> {
  const { rows } = await pool.query(
    'select count(*)::int as n from form_records where tenant_id = $1',
    [tenantId],
  );
  return rows[0].n as number;
}

export async function recordRowOf(pool: Pool, recordId: string) {
  const { rows } = await pool.query(
    `select id, tenant_id, form_id, form_version_id, revision, created_at, updated_at
       from form_records where id = $1`,
    [recordId],
  );
  return (
    (rows[0] as
      | {
          id: string;
          tenant_id: string;
          form_id: string;
          form_version_id: string;
          revision: number;
          created_at: Date;
          updated_at: Date;
        }
      | undefined) ?? null
  );
}

export async function setRevision(
  pool: Pool,
  recordId: string,
  revision: number,
): Promise<void> {
  await pool.query('update form_records set revision = $2 where id = $1', [
    recordId,
    revision,
  ]);
}

/**
 * Looks for `needle` in every column of the record's `form_records` row and
 * `form_record_values` rows, as text and as bytes (UTF-8). Returns where it was
 * found and how many value rows exist, so a test can tell "nothing found" from
 * "nothing stored".
 */
export async function storedBytesMatching(
  pool: Pool,
  recordId: string,
  needle: string,
): Promise<{ valueRows: number; matches: string[] }> {
  const bytes = Buffer.from(needle, 'utf8');
  const matches: string[] = [];

  const scan = (table: string, rows: Record<string, unknown>[]) => {
    for (const row of rows) {
      for (const [column, value] of Object.entries(row)) {
        const found = Buffer.isBuffer(value)
          ? value.includes(bytes)
          : String(value).includes(needle);
        if (found) matches.push(`${table}.${column}`);
      }
    }
  };

  const record = await pool.query('select * from form_records where id = $1', [
    recordId,
  ]);
  const values = await pool.query(
    'select * from form_record_values where form_record_id = $1',
    [recordId],
  );
  scan('form_records', record.rows);
  scan('form_record_values', values.rows);

  return { valueRows: values.rows.length, matches };
}

// ---------------------------------------------------------------------------
// process output (AC-0003-20)

/**
 * Captures every line the process could log while it is active: the Nest
 * logger (static and instance calls), `console` and stdout/stderr. Output is
 * swallowed until `restore()`.
 */
export function captureProcessOutput() {
  const lines: string[] = [];
  const record = (...args: unknown[]) => {
    lines.push(
      args
        .map((arg) =>
          typeof arg === 'string' || Buffer.isBuffer(arg)
            ? String(arg)
            : safeStringify(arg),
        )
        .join(' '),
    );
  };
  const levels = ['log', 'error', 'warn', 'debug', 'verbose', 'fatal'] as const;
  const spies = [
    vi.spyOn(process.stdout, 'write').mockImplementation(((chunk: unknown) => {
      record(chunk);
      return true;
    }) as never),
    vi.spyOn(process.stderr, 'write').mockImplementation(((chunk: unknown) => {
      record(chunk);
      return true;
    }) as never),
    ...(['log', 'info', 'warn', 'error', 'debug'] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(record),
    ),
    ...levels.map((level) =>
      vi.spyOn(Logger, level).mockImplementation(record as never),
    ),
    ...levels.map((level) =>
      vi.spyOn(Logger.prototype, level).mockImplementation(record as never),
    ),
  ];

  return {
    lines,
    restore: () => spies.forEach((spy) => spy.mockRestore()),
  };
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}
