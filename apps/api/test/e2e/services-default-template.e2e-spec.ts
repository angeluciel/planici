import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestContext } from '../setup/test-app.js';
import {
  createClientBody,
  formsApi,
  seedManyForms,
  signUpOwner,
  type Session,
} from '../utils/forms-fixtures.js';
import {
  SERVICE_SYSTEM_INPUTS_LABELLED,
  withoutDefaultServiceTemplate,
} from '../utils/services-fixtures.js';

// E-sdef: the default "Serviço" template (SPEC-0005 plan, Tests)

let ctx: TestContext;
let ana: Session;

beforeAll(async () => {
  ctx = await createTestApp();
});

beforeEach(async () => {
  await ctx.truncate();
  ana = await signUpOwner(ctx, 'studio-ana');
});

afterAll(async () => {
  await ctx?.close();
});

type ReadField = { id: string } & Record<string, unknown>;

const withoutIds = (fields: ReadField[]) =>
  fields.map(({ id: _id, ...field }) => field);

const templatesOfType = async (
  type: 'service' | 'client',
  session: Session,
  { includeArchived = false } = {},
) => {
  const response = await formsApi(ctx.app, session)
    .list({ type, includeArchived: String(includeArchived) })
    .expect(200);
  return response.body.forms as { id: string; name: string; status: string }[];
};

const serviceTemplates = (
  session: Session,
  options: { includeArchived?: boolean } = {},
) => templatesOfType('service', session, options);

// the fields of version 1, without ids, and what the template read shows
async function describeTemplate(session: Session, formId: string) {
  const api = formsApi(ctx.app, session);
  const read = (await api.read(formId).expect(200)).body;
  const version = (await api.version(formId, 1).expect(200)).body;
  const { id: _id, name: _name, createdAt: _c, updatedAt: _u, ...form } = read;
  return {
    form: { ...form, fields: withoutIds(read.fields) },
    version: { ...version, fields: withoutIds(version.fields) },
  };
}

describe('a tenant that was just created', () => {
  it('AC-0005-01 has one service template, "Serviço", whose version 1 has only the three service system fields, all required', async () => {
    const templates = await serviceTemplates(ana, { includeArchived: true });

    expect(
      templates.map((template) => [template.name, template.status]),
    ).toEqual([['Serviço', 'active']]);
    const { version } = await describeTemplate(ana, templates[0]!.id);
    expect(
      version.fields.map((field: ReadField) => [
        field.systemKey,
        field.required,
      ]),
    ).toEqual([
      ['service.name', true],
      ['service.duration', true],
      ['service.price', true],
    ]);
  });

  it('AC-0005-63 labels the duration system field "Duração"', async () => {
    const [seeded] = await serviceTemplates(ana);

    const { version } = await describeTemplate(ana, seeded!.id);

    const duration = version.fields.find(
      (field: ReadField) => field.systemKey === 'service.duration',
    );
    expect(duration).toMatchObject({ label: 'Duração', type: 'duration' });
  });

  it('AC-0005-01 stores "Serviço" like POST /v1/forms stores a template with the service system fields', async () => {
    const [seeded] = await serviceTemplates(ana);
    expect(seeded?.name).toBe('Serviço');
    const created = await formsApi(ctx.app, ana)
      .create({
        type: 'service',
        name: 'Modelo de referência',
        fields: SERVICE_SYSTEM_INPUTS_LABELLED,
      })
      .expect(201);

    const fromSeed = await describeTemplate(ana, seeded!.id);
    const fromApi = await describeTemplate(ana, created.body.id);

    expect(fromSeed).toEqual(fromApi);
  });

  it('AC-0005-01 leaves the client template "Cliente" in place beside it', async () => {
    const clients = await templatesOfType('client', ana, {
      includeArchived: true,
    });

    expect(clients.map((template) => template.name)).toEqual(['Cliente']);
  });
});

describe('the backfill (planici_backfill_service_templates, as the migration runs it)', () => {
  const backfill = () =>
    ctx.pool.query('select planici_backfill_service_templates()');

  it('AC-0005-46 gives a tenant with no service template a "Serviço" with only the service system fields', async () => {
    await withoutDefaultServiceTemplate(ctx, ana);
    expect(await serviceTemplates(ana, { includeArchived: true })).toEqual([]);

    await backfill();

    const templates = await serviceTemplates(ana, { includeArchived: true });
    expect(
      templates.map((template) => [template.name, template.status]),
    ).toEqual([['Serviço', 'active']]);
    const { version } = await describeTemplate(ana, templates[0]!.id);
    expect(version.fields.map((field: ReadField) => field.systemKey)).toEqual([
      'service.name',
      'service.duration',
      'service.price',
    ]);
  });

  it('AC-0005-47 leaves a tenant whose only service template is archived with just that template', async () => {
    await withoutDefaultServiceTemplate(ctx, ana);
    const created = await formsApi(ctx.app, ana)
      .create({
        type: 'service',
        name: 'Sessão',
        fields: SERVICE_SYSTEM_INPUTS_LABELLED,
      })
      .expect(201);
    await formsApi(ctx.app, ana).archive(created.body.id).expect(200);

    await backfill();

    const templates = await serviceTemplates(ana, { includeArchived: true });
    expect(
      templates.map((template) => [template.name, template.status]),
    ).toEqual([['Sessão', 'archived']]);
  });

  it('AC-0005-59 leaves a tenant whose client template is named "Serviço" without a service template, and the client template unchanged', async () => {
    await withoutDefaultServiceTemplate(ctx, ana);
    const created = await formsApi(ctx.app, ana)
      .create(createClientBody('Serviço'))
      .expect(201);
    const before = await describeTemplate(ana, created.body.id);

    await backfill();

    expect(await serviceTemplates(ana, { includeArchived: true })).toEqual([]);
    const clients = await templatesOfType('client', ana, {
      includeArchived: true,
    });
    expect(
      clients
        .map((template) => template.name)
        .sort((a, b) => a.localeCompare(b)),
    ).toEqual(['Cliente', 'Serviço']);
    expect(await describeTemplate(ana, created.body.id)).toEqual(before);
  });

  it('AC-0005-60 leaves a tenant with 200 templates without a service template and with 200 templates', async () => {
    await withoutDefaultServiceTemplate(ctx, ana);
    // the seeded "Cliente" stays: 199 more make 200 client templates
    await seedManyForms(ctx.pool, ana.tenantId, 199, 0);
    const count = async () =>
      (
        await ctx.pool.query(
          'select count(*)::int as n from forms where tenant_id = $1',
          [ana.tenantId],
        )
      ).rows[0].n as number;
    expect(await count()).toBe(200);

    await backfill();

    expect(await serviceTemplates(ana, { includeArchived: true })).toEqual([]);
    expect(await count()).toBe(200);
  });
});
