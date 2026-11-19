import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestContext } from '../setup/test-app.js';
import {
  createClientBody,
  formsApi,
  signUpOwner,
  type Session,
} from '../utils/forms-fixtures.js';
import { withoutDefaultTemplate } from '../utils/clients-fixtures.js';

// E-def: the default "Cliente" template (SPEC-0004 plan, Tests)

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

const clientTemplates = async (
  session: Session,
  { includeArchived = false } = {},
) => {
  const response = await formsApi(ctx.app, session)
    .list({ type: 'client', includeArchived: String(includeArchived) })
    .expect(200);
  return response.body.forms as { id: string; name: string; status: string }[];
};

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
  it('AC-0004-01 has one client template, "Cliente", whose version 1 has only the three system fields', async () => {
    const templates = await clientTemplates(ana, { includeArchived: true });

    expect(
      templates.map((template) => [template.name, template.status]),
    ).toEqual([['Cliente', 'active']]);
    const { version } = await describeTemplate(ana, templates[0]!.id);
    expect(
      version.fields.map((field: ReadField) => [
        field.systemKey,
        field.required,
      ]),
    ).toEqual([
      ['client.name', true],
      ['client.email', true],
      ['client.phone', false],
    ]);
  });

  it('AC-0004-01 stores "Cliente" like POST /v1/forms stores a template with the client system fields (Decision 4)', async () => {
    const [seeded] = await clientTemplates(ana);
    expect(seeded?.name).toBe('Cliente');
    const created = await formsApi(ctx.app, ana)
      .create(createClientBody('Modelo de referência'))
      .expect(201);

    const fromSeed = await describeTemplate(ana, seeded!.id);
    const fromApi = await describeTemplate(ana, created.body.id);

    expect(fromSeed).toEqual(fromApi);
  });
});

describe('the backfill (planici_backfill_client_templates, as the migration runs it)', () => {
  const backfill = () =>
    ctx.pool.query('select planici_backfill_client_templates()');

  it('AC-0004-46 gives a tenant with no client template a "Cliente" with only the client system fields', async () => {
    await withoutDefaultTemplate(ctx, ana);
    expect(await clientTemplates(ana, { includeArchived: true })).toEqual([]);

    await backfill();

    const templates = await clientTemplates(ana, { includeArchived: true });
    expect(
      templates.map((template) => [template.name, template.status]),
    ).toEqual([['Cliente', 'active']]);
    const { version } = await describeTemplate(ana, templates[0]!.id);
    expect(version.fields.map((field: ReadField) => field.systemKey)).toEqual([
      'client.name',
      'client.email',
      'client.phone',
    ]);
  });

  it('AC-0004-47 leaves a tenant whose only client template is archived with just that template', async () => {
    await withoutDefaultTemplate(ctx, ana);
    const created = await formsApi(ctx.app, ana)
      .create(createClientBody('Ficha'))
      .expect(201);
    await formsApi(ctx.app, ana).archive(created.body.id).expect(200);

    await backfill();

    const templates = await clientTemplates(ana, { includeArchived: true });
    expect(
      templates.map((template) => [template.name, template.status]),
    ).toEqual([['Ficha', 'archived']]);
  });
});
