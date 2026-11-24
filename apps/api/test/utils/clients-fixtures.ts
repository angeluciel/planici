import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { ClientResponse } from '@planici/schemas';
import type { Pool } from 'pg';
import request from 'supertest';
import type { ClientHistoryReader } from '@modules/clients/ports/client-history.reader.js';
import type { TestContext } from '../setup/test-app.js';
import {
  CLIENT_SYSTEM_INPUTS,
  formsApi,
  nameKeyOf,
  type Session,
} from './forms-fixtures.js';
import { loadTemplate, type RecordTemplate } from './records-fixtures.js';

/**
 * Fixtures for SPEC-0004 tests (plan, Tests). They build on forms-fixtures.ts
 * and records-fixtures.ts, which are used unchanged: templates go through
 * SPEC-0001's API, clients through `/v1/clients`, bulk clients straight into
 * the database, stored rows are read with the pool.
 */

// ---------------------------------------------------------------------------
// the HTTP client

/** `/v1/clients` calls for one caller and one active tenant. */
export function clientsApi(
  app: INestApplication,
  session: { token?: string; tenantId?: string },
) {
  const call = (
    method: 'get' | 'post' | 'patch',
    path: string,
    body?: object,
  ) => {
    let req = request(app.getHttpServer())[method](`/v1/clients${path}`);
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
    inactivate: (id: string) => call('post', `/${id}/inactivate`),
    reactivate: (id: string) => call('post', `/${id}/reactivate`),
    remove: (id: string, body: object = {}) =>
      call('post', `/${id}/delete`, body),
  };
}

/** The user id of a session: the `sub` claim of its access token. */
export function userIdOf(session: Session): string {
  const payload = session.token.split('.')[1];
  if (!payload) throw new Error('access token is not a JWT');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    .sub as string;
}

// ---------------------------------------------------------------------------
// request payload builders

export type ClientAttrs = {
  name?: string;
  email?: string;
  phone?: string | null;
};

/**
 * A create request "with consent" (SPEC-0004 §10): `consentAttested` true and
 * `consentTextVersion` "1". `overrides` replace any key; a key set to
 * `undefined` is left out of the request.
 */
export function clientBody(
  template: { id: string; version: number },
  attrs: ClientAttrs = {},
  values: Record<string, unknown> = {},
  overrides: Record<string, unknown> = {},
) {
  return {
    formId: template.id,
    formVersion: template.version,
    name: attrs.name ?? 'Ana Souza',
    email: attrs.email ?? 'ana@example.com',
    ...('phone' in attrs ? { phone: attrs.phone } : {}),
    values,
    consentAttested: true,
    consentTextVersion: '1',
    ...overrides,
  };
}

/**
 * An update request that changes nothing, from the client as read. `changes`
 * replace any key; a key set to `undefined` is left out of the request.
 */
export function updateBody(
  client: ClientResponse,
  changes: Record<string, unknown> = {},
) {
  return {
    revision: client.revision,
    formVersion: client.form.version,
    name: client.name,
    email: client.email,
    phone: client.phone,
    values: client.values,
    ...changes,
  };
}

// ---------------------------------------------------------------------------
// templates

/**
 * The default "Cliente" template every tenant gets when it is created (R11).
 * Throws when the tenant has none, so a test that needs it fails with the
 * missing behavior named.
 */
export async function defaultTemplate(
  ctx: TestContext,
  session: Session,
): Promise<RecordTemplate> {
  const list = await formsApi(ctx.app, session)
    .list({ type: 'client' })
    .expect(200);
  const found = (list.body.forms as { id: string; name: string }[]).find(
    (form) => form.name === 'Cliente',
  );
  if (!found) {
    throw new Error(
      'the tenant has no client template "Cliente" (SPEC-0004 R11: every tenant gets it when it is created)',
    );
  }
  return loadTemplate(ctx, session, found);
}

/**
 * Deletes the seeded "Cliente" through `POST /v1/forms/:id/delete`, for criteria
 * that fix the template list (plan, Tests). Fails when there is none to delete.
 */
export async function withoutDefaultTemplate(
  ctx: TestContext,
  session: Session,
): Promise<void> {
  const template = await defaultTemplate(ctx, session);
  await formsApi(ctx.app, session)
    .remove(template.id, { confirmName: 'Cliente' })
    .expect(204);
}

/** An active client template whose Telefone is required, at version 1. */
export async function createPhoneRequiredTemplate(
  ctx: TestContext,
  session: Session,
  name = 'Ficha',
): Promise<RecordTemplate> {
  const response = await formsApi(ctx.app, session)
    .create({
      type: 'client',
      name,
      fields: CLIENT_SYSTEM_INPUTS.map((input) =>
        input.systemKey === 'client.phone'
          ? { ...input, required: true }
          : input,
      ),
    })
    .expect(201);
  return loadTemplate(ctx, session, response.body);
}

// ---------------------------------------------------------------------------
// clients through the API

/** Creates a client with consent and returns it; fails the test on any other status. */
export async function createClientVia(
  ctx: TestContext,
  session: Session,
  template: { id: string; version: number },
  attrs: ClientAttrs = {},
  values: Record<string, unknown> = {},
): Promise<ClientResponse> {
  const response = await clientsApi(ctx.app, session)
    .create(clientBody(template, attrs, values))
    .expect(201);
  return response.body as ClientResponse;
}

export async function readClient(
  ctx: TestContext,
  session: Session,
  id: string,
): Promise<ClientResponse> {
  const response = await clientsApi(ctx.app, session).read(id).expect(200);
  return response.body as ClientResponse;
}

// ---------------------------------------------------------------------------
// seeding with SQL

export type SeedClientInput = {
  tenantId: string;
  /** The user recorded as having attested (R12). */
  userId: string;
  /** The template; the client is linked to its latest version. */
  formId: string;
  name: string;
  email: string;
  phone?: string | null;
  status?: 'active' | 'inactive';
  /**
   * The stored last update time (SPEC-0006 R9), any text Postgres reads as
   * `timestamptz`, microseconds included; `now()` when omitted.
   */
  updatedAt?: string;
};

/**
 * One client with its form record, written straight to the database, linked
 * to the template's latest version, at revision 1. `inactive` is stored as
 * `suspended` (plan, Decision 2).
 */
export async function seedClient(
  pool: Pool,
  input: SeedClientInput,
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
     insert into clients
       (tenant_id, form_record_id, name, name_key, email, phone, status,
        consent_attested_by, consent_attested_at, consent_text_version,
        updated_at)
     select $3, record.id, $4, $5, $6, $7, $8::record_status, $9::uuid, now(), '1',
            coalesce($10::timestamptz, now())
       from record
     returning id, form_record_id`,
    [
      randomUUID(),
      input.formId,
      input.tenantId,
      input.name,
      nameKeyOf(input.name),
      input.email,
      input.phone ?? null,
      input.status === 'inactive' ? 'suspended' : 'active',
      input.userId,
      input.updatedAt ?? null,
    ],
  );
  if (!rows[0]) throw new Error('seedClient found no template to link to');
  return { id: rows[0].id as string, formRecordId: rows[0].form_record_id };
}

/** Sets the last update time of every client of a tenant to `at` (SPEC-0006 AC-0006-54). */
export async function setUpdatedAt(
  pool: Pool,
  tenantId: string,
  at: string,
): Promise<void> {
  await pool.query(
    'update clients set updated_at = $2::timestamptz where tenant_id = $1',
    [tenantId, at],
  );
}

/** `count` active clients "Cliente 001" ... "Cliente NNN", in name order. */
export async function seedClients(
  pool: Pool,
  input: Omit<SeedClientInput, 'name' | 'email' | 'phone' | 'status'>,
  count: number,
): Promise<void> {
  for (let index = 1; index <= count; index += 1) {
    const label = String(index).padStart(3, '0');
    await seedClient(pool, {
      ...input,
      name: `Cliente ${label}`,
      email: `cliente${label}@example.com`,
    });
  }
}

// ---------------------------------------------------------------------------
// reading stored rows back

export type ClientDbRow = {
  id: string;
  tenant_id: string;
  form_record_id: string;
  name: string;
  name_key: string;
  email: string;
  phone: string | null;
  status: string;
  consent_attested_by: string;
  consent_attested_at: Date;
  consent_text_version: string;
  created_at: Date;
  updated_at: Date;
};

export async function clientRow(
  pool: Pool,
  clientId: string,
): Promise<ClientDbRow | null> {
  const { rows } = await pool.query('select * from clients where id = $1', [
    clientId,
  ]);
  return (rows[0] as ClientDbRow | undefined) ?? null;
}

export async function countClients(
  pool: Pool,
  tenantId: string,
): Promise<number> {
  const { rows } = await pool.query(
    'select count(*)::int as n from clients where tenant_id = $1',
    [tenantId],
  );
  return rows[0].n as number;
}

export async function countClientsWithEmail(
  pool: Pool,
  tenantId: string,
  email: string,
): Promise<number> {
  const { rows } = await pool.query(
    'select count(*)::int as n from clients where tenant_id = $1 and email = $2',
    [tenantId, email],
  );
  return rows[0].n as number;
}

// ---------------------------------------------------------------------------
// ports

/** A fake `ClientHistoryReader` whose history is set per client (G-2). */
export class FakeClientHistory implements ClientHistoryReader {
  private readonly withHistory = new Set<string>();

  setHistory(clientId: string, hasHistory = true): void {
    if (hasHistory) this.withHistory.add(clientId);
    else this.withHistory.delete(clientId);
  }

  hasHistory(_tenantId: string, clientId: string): Promise<boolean> {
    return Promise.resolve(this.withHistory.has(clientId));
  }
}
