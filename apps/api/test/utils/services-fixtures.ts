import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { FieldInput, ServiceResponse } from '@planici/schemas';
import type { Pool } from 'pg';
import request from 'supertest';
// type-only: the services module does not exist until the implementation lands
import type { ServiceHistoryReader } from '@modules/services/ports/service-history.reader.js';
import type { TestContext } from '../setup/test-app.js';
import {
  formsApi,
  nameKeyOf,
  SERVICE_SYSTEM_INPUTS,
  type Session,
} from './forms-fixtures.js';
import { loadTemplate, type RecordTemplate } from './records-fixtures.js';

/**
 * Fixtures for SPEC-0005 tests (plan, Tests). They build on forms-fixtures.ts
 * and records-fixtures.ts, which are used unchanged: templates go through
 * SPEC-0001's API, services through `/v1/services`, bulk services straight into
 * the database, stored rows are read with the pool.
 */

// ---------------------------------------------------------------------------
// the HTTP client

/** `/v1/services` calls for one caller and one active tenant. */
export function servicesApi(
  app: INestApplication,
  session: { token?: string; tenantId?: string },
) {
  const call = (
    method: 'get' | 'post' | 'patch',
    path: string,
    body?: object,
  ) => {
    let req = request(app.getHttpServer())[method](`/v1/services${path}`);
    if (session.token)
      req = req.set('Authorization', `Bearer ${session.token}`);
    if (session.tenantId) req = req.set('X-Tenant-Id', session.tenantId);
    return body === undefined ? req : req.send(body);
  };

  return {
    list: (query: Record<string, string> = {}) => call('get', '').query(query),
    // the narrow chips (R14): GET /v1/services/templates (plan, G-10)
    templates: () => call('get', '/templates'),
    create: (body: object) => call('post', '', body),
    read: (id: string) => call('get', `/${id}`),
    update: (id: string, body: object) => call('patch', `/${id}`, body),
    inactivate: (id: string) => call('post', `/${id}/inactivate`),
    reactivate: (id: string) => call('post', `/${id}/reactivate`),
    remove: (id: string, body: object = {}) =>
      call('post', `/${id}/delete`, body),
  };
}

// ---------------------------------------------------------------------------
// request payload builders

export type ServiceAttrs = {
  name?: string;
  durationMinutes?: number;
  priceCents?: number;
  currency?: string;
};

/**
 * A create request with "a valid price" (SPEC-0005 §10: priceCents 15000,
 * currency "BRL") and a 90-minute duration unless `attrs` say otherwise.
 * `overrides` replace any key; a key set to `undefined` is left out of the
 * request.
 */
export function serviceBody(
  template: { id: string; version: number },
  attrs: ServiceAttrs = {},
  values: Record<string, unknown> = {},
  overrides: Record<string, unknown> = {},
) {
  return {
    formId: template.id,
    formVersion: template.version,
    name: attrs.name ?? 'Sessão individual',
    durationMinutes: attrs.durationMinutes ?? 90,
    priceCents: attrs.priceCents ?? 15000,
    currency: attrs.currency ?? 'BRL',
    values,
    ...overrides,
  };
}

/**
 * An update request that changes nothing, from the service as read. `changes`
 * replace any key; a key set to `undefined` is left out of the request.
 */
export function serviceUpdateBody(
  service: ServiceResponse,
  changes: Record<string, unknown> = {},
) {
  return {
    revision: service.revision,
    formVersion: service.form.version,
    name: service.name,
    durationMinutes: service.durationMinutes,
    priceCents: service.priceCents,
    currency: service.currency,
    values: service.values,
    ...changes,
  };
}

// ---------------------------------------------------------------------------
// templates

/**
 * The service system fields as the seeded "Serviço" has them (SPEC-0005 R10,
 * §2 amendment): `SERVICE_SYSTEM_INPUTS` with the duration labelled "Duração".
 */
export const SERVICE_SYSTEM_INPUTS_LABELLED: FieldInput[] =
  SERVICE_SYSTEM_INPUTS.map((input) =>
    input.systemKey === 'service.duration'
      ? { ...input, label: 'Duração' }
      : input,
  );

/**
 * The default "Serviço" template every tenant gets when it is created (R10).
 * Throws when the tenant has none, so a test that needs it fails with the
 * missing behavior named.
 */
export async function defaultServiceTemplate(
  ctx: TestContext,
  session: Session,
): Promise<RecordTemplate> {
  const list = await formsApi(ctx.app, session)
    .list({ type: 'service' })
    .expect(200);
  const found = (list.body.forms as { id: string; name: string }[]).find(
    (form) => form.name === 'Serviço',
  );
  if (!found) {
    throw new Error(
      'the tenant has no service template "Serviço" (SPEC-0005 R10: every tenant gets it when it is created)',
    );
  }
  return loadTemplate(ctx, session, found);
}

/**
 * Deletes the seeded "Serviço" through `POST /v1/forms/:id/delete`, for
 * criteria that fix the template list. Fails when there is none to delete.
 */
export async function withoutDefaultServiceTemplate(
  ctx: TestContext,
  session: Session,
): Promise<void> {
  const template = await defaultServiceTemplate(ctx, session);
  await formsApi(ctx.app, session)
    .remove(template.id, { confirmName: 'Serviço' })
    .expect(204);
}

// ---------------------------------------------------------------------------
// services through the API

/** Creates a service and returns it; fails the test on any other status. */
export async function createServiceVia(
  ctx: TestContext,
  session: Session,
  template: { id: string; version: number },
  attrs: ServiceAttrs = {},
  values: Record<string, unknown> = {},
): Promise<ServiceResponse> {
  const response = await servicesApi(ctx.app, session)
    .create(serviceBody(template, attrs, values))
    .expect(201);
  return response.body as ServiceResponse;
}

export async function readService(
  ctx: TestContext,
  session: Session,
  id: string,
): Promise<ServiceResponse> {
  const response = await servicesApi(ctx.app, session).read(id).expect(200);
  return response.body as ServiceResponse;
}

// ---------------------------------------------------------------------------
// seeding with SQL

export type SeedServiceInput = {
  tenantId: string;
  /** The template; the service is linked to its latest version. */
  formId: string;
  name: string;
  durationMinutes?: number;
  priceCents?: number;
  status?: 'active' | 'inactive';
  /**
   * The stored last update time (R11), any text Postgres reads as
   * `timestamptz`, microseconds included; `now()` when omitted.
   */
  updatedAt?: string;
};

/**
 * One service with its form record, written straight to the database, linked
 * to the template's latest version, at revision 1. `inactive` is stored as
 * `suspended` (plan, G-4).
 */
export async function seedService(
  pool: Pool,
  input: SeedServiceInput,
): Promise<{ id: string; formRecordId: string }> {
  const { rows } = await pool.query(
    `with record as (
       insert into form_records (id, tenant_id, form_id, form_version_id, revision)
       select $1::uuid, f.tenant_id, f.id, fv.id, 1
         from forms f
         join form_versions fv on fv.form_id = f.id and fv.number = f.latest_version
        where f.id = $2 and f.tenant_id = $3
       returning id
     )
     insert into services
       (tenant_id, form_record_id, name, name_key, duration_minutes,
        price_cents, currency, status, updated_at)
     select $3, record.id, $4, $5, $6, $7, 'BRL', $8::record_status,
            coalesce($9::timestamptz, now())
       from record
     returning id, form_record_id`,
    [
      randomUUID(),
      input.formId,
      input.tenantId,
      input.name,
      nameKeyOf(input.name),
      input.durationMinutes ?? 60,
      input.priceCents ?? 10000,
      input.status === 'inactive' ? 'suspended' : 'active',
      input.updatedAt ?? null,
    ],
  );
  if (!rows[0]) throw new Error('seedService found no template to link to');
  return { id: rows[0].id as string, formRecordId: rows[0].form_record_id };
}

/** `count` active services "Serviço 001" ... "Serviço NNN", in name order. */
export async function seedServices(
  pool: Pool,
  input: Omit<SeedServiceInput, 'name' | 'status'>,
  count: number,
): Promise<void> {
  for (let index = 1; index <= count; index += 1) {
    await seedService(pool, {
      ...input,
      name: `Serviço ${String(index).padStart(3, '0')}`,
    });
  }
}

// ---------------------------------------------------------------------------
// reading stored rows back

export type ServiceDbRow = {
  id: string;
  tenant_id: string;
  form_record_id: string;
  name: string;
  name_key: string;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  status: string;
  created_at: Date;
  updated_at: Date;
};

export async function serviceRow(
  pool: Pool,
  serviceId: string,
): Promise<ServiceDbRow | null> {
  const { rows } = await pool.query('select * from services where id = $1', [
    serviceId,
  ]);
  return (rows[0] as ServiceDbRow | undefined) ?? null;
}

export async function countServices(
  pool: Pool,
  tenantId: string,
): Promise<number> {
  const { rows } = await pool.query(
    'select count(*)::int as n from services where tenant_id = $1',
    [tenantId],
  );
  return rows[0].n as number;
}

// ---------------------------------------------------------------------------
// ports

/**
 * A fake `ServiceHistoryReader` whose history is set per service (G-3, G-9).
 * Pass it to `createTestApp({ serviceHistory })`.
 */
export class FakeServiceHistory implements ServiceHistoryReader {
  private readonly withHistoryIds = new Set<string>();

  setHistory(serviceId: string, hasHistory = true): void {
    if (hasHistory) this.withHistoryIds.add(serviceId);
    else this.withHistoryIds.delete(serviceId);
  }

  hasHistory(_tenantId: string, serviceId: string): Promise<boolean> {
    return Promise.resolve(this.withHistoryIds.has(serviceId));
  }

  /** The ids among `serviceIds` that have history, one call per list page (G-9). */
  withHistory(
    _tenantId: string,
    serviceIds: readonly string[],
  ): Promise<Set<string>> {
    return Promise.resolve(
      new Set(serviceIds.filter((id) => this.withHistoryIds.has(id))),
    );
  }
}
