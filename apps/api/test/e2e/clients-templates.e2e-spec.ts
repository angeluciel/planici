import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ClientResponse, FieldInput } from '@planici/schemas';
import { createTestApp, type TestContext } from '../setup/test-app.js';
import {
  failUpdatesOfRecord,
  formsApi,
  inputsFrom,
  signUpOwner,
  valueRowCount,
  versionCount,
  type Session,
} from '../utils/forms-fixtures.js';
import {
  changeTemplate,
  createTemplate,
  loadTemplate,
  withField,
  type RecordTemplate,
} from '../utils/records-fixtures.js';
import {
  clientRow,
  clientsApi,
  createClientVia,
  readClient,
  updateBody,
  withoutDefaultTemplate,
} from '../utils/clients-fixtures.js';

// E-tpl: SPEC-0001's and SPEC-0002's deferred criteria, reading clients
// through /v1/clients (SPEC-0004 plan, Tests)

let ctx: TestContext;
let ana: Session;
let bia: Session;

const asAna = () => clientsApi(ctx.app, ana);
const formsOfAna = () => formsApi(ctx.app, ana);

beforeAll(async () => {
  ctx = await createTestApp();
});

beforeEach(async () => {
  await ctx.truncate();
  ana = await signUpOwner(ctx, 'studio-ana');
  bia = await signUpOwner(ctx, 'studio-bia');
});

afterAll(async () => {
  await ctx?.close();
});

const text = (label: string, extra: Partial<FieldInput> = {}): FieldInput => ({
  label,
  type: 'text',
  ...extra,
});

const SHIFT: FieldInput = {
  label: 'Turno',
  type: 'select',
  options: [{ label: 'Manhã' }, { label: 'Tarde' }, { label: 'Noite' }],
};

const KEEP = { mode: 'keep' } as const;
const UPDATE_ALL = { mode: 'update_all', confirmName: 'Ficha' } as const;

const ficha = (custom: FieldInput[] = [], name = 'Ficha', session = ana) =>
  createTemplate(ctx, session, 'client', name, custom);

const add =
  (...fields: FieldInput[]) =>
  (inputs: FieldInput[]) => [...inputs, ...fields];

const without = (label: string) => (inputs: FieldInput[]) =>
  inputs.filter((input) => input.label !== label);

/** `count` clients on the template's current version, "Cliente 1" ... . */
async function clientsOn(
  template: RecordTemplate,
  count: number,
  values: (index: number) => Record<string, unknown> = () => ({}),
  session = ana,
): Promise<ClientResponse[]> {
  const clients: ClientResponse[] = [];
  for (let index = 1; index <= count; index += 1) {
    clients.push(
      await createClientVia(
        ctx,
        session,
        template,
        { name: `Cliente ${index}`, email: `cliente${index}@example.com` },
        values(index),
      ),
    );
  }
  return clients;
}

const readAll = (clients: { id: string }[], session = ana) =>
  Promise.all(clients.map((client) => readClient(ctx, session, client.id)));

const recordIdOf = async (clientId: string) =>
  (await clientRow(ctx.pool, clientId))!.form_record_id;

// the labelled options of a field in one published version, by its read
async function versionField(
  template: { id: string },
  version: number,
  fieldId: string,
) {
  const response = await formsOfAna().version(template.id, version).expect(200);
  return (
    response.body.fields as {
      id: string;
      label: string;
      type: string;
      sensitive: boolean;
      options: { id: string; label: string }[] | null;
    }[]
  ).find((field) => field.id === fieldId);
}

describe('the template list behind the Novo dropdown', () => {
  it('AC-0004-02 lists the active client templates "Anamnese", "Ficha" and nothing else', async () => {
    await withoutDefaultTemplate(ctx, ana);
    await ficha([], 'Ficha');
    await ficha([], 'Anamnese');
    const archived = await ficha([], 'Antigo');
    await formsOfAna().archive(archived.id).expect(200);
    await createTemplate(ctx, ana, 'service', 'Serviço');

    const response = await formsOfAna().list({ type: 'client' }).expect(200);

    expect(
      response.body.forms.map((form: { name: string }) => form.name),
    ).toEqual(['Anamnese', 'Ficha']);
  });

  it('AC-0001-12 archives the template, drops it from the active client templates and keeps its client readable and editable', async () => {
    const template = await ficha([], 'Ficha nutricional');
    const [client] = await clientsOn(template, 1);

    const archived = await formsOfAna().archive(template.id).expect(200);

    expect(archived.body.status).toBe('archived');
    const list = await formsOfAna().list({ type: 'client' }).expect(200);
    expect(
      list.body.forms.map((form: { name: string }) => form.name),
    ).not.toContain('Ficha nutricional');
    const current = await readClient(ctx, ana, client!.id);
    await asAna()
      .update(client!.id, updateBody(current, { name: 'Ana Maria' }))
      .expect(200);
  });
});

describe('delete and archive with clients', () => {
  it('AC-0001-14 answers 409 form.in-use without deleteRecords and keeps the template and the client', async () => {
    const template = await ficha();
    const [client] = await clientsOn(template, 1);

    const response = await formsOfAna()
      .remove(template.id, { confirmName: 'Ficha' })
      .expect(409);

    expect(response.body).toEqual({ error: 'form.in-use' });
    await formsOfAna().read(template.id).expect(200);
    await asAna().read(client!.id).expect(200);
  });

  it('AC-0001-31 deletes the template with its clients after the typed name', async () => {
    const template = await ficha();
    const clients = await clientsOn(template, 3);

    await formsOfAna()
      .remove(template.id, { deleteRecords: true, confirmName: 'Ficha' })
      .expect(204);

    const read = await formsOfAna().read(template.id).expect(404);
    expect(read.body).toEqual({ error: 'form.not-found' });
    for (const client of clients) {
      const response = await asAna().read(client.id).expect(404);
      expect(response.body).toEqual({ error: 'client.not-found' });
    }
  });

  it('AC-0001-32 archives instead of deleting, hides the template by default and keeps the 3 clients unchanged', async () => {
    const template = await ficha();
    const clients = await clientsOn(template, 3);

    await formsOfAna().archive(template.id).expect(200);

    const list = await formsOfAna().list({ type: 'client' }).expect(200);
    expect(
      list.body.forms.map((form: { id: string }) => form.id),
    ).not.toContain(template.id);
    expect((await formsOfAna().read(template.id).expect(200)).body.status).toBe(
      'archived',
    );
    // "unchanged" is the client's data; `form.status` is the template's own
    // state, which the read reports (SPEC-0003 RecordFormRef). Owner, 2026-11-19.
    const after = await readAll(clients);
    expect(after.map((client) => client.form.status)).toEqual(
      clients.map(() => 'archived'),
    );
    expect(after).toEqual(
      clients.map((client) => ({
        ...client,
        form: { ...client.form, status: 'archived' },
      })),
    );
  });

  it('AC-0001-33 rejects deleteRecords with a wrong typed name and keeps the template and the 3 clients', async () => {
    const template = await ficha();
    const clients = await clientsOn(template, 3);

    const response = await formsOfAna()
      .remove(template.id, { deleteRecords: true, confirmName: 'ficha x' })
      .expect(400);

    expect(response.body).toEqual({
      error: 'deleteConfirmation.required',
      field: 'confirmName',
    });
    await formsOfAna().read(template.id).expect(200);
    expect(await readAll(clients)).toEqual(clients);
  });
});

describe('metadata changes and "Manter existentes"', () => {
  it('AC-0001-20 keeps version 2 for a rename, a relabel and a protected flag and leaves 5 clients on version 2', async () => {
    const first = await ficha([text('Objetivo')]);
    const second = await changeTemplate(ctx, ana, first, add(text('Hobby')));
    expect(second.version).toBe(2);
    const clients = await clientsOn(second, 5);
    const read = (await formsOfAna().read(second.id).expect(200)).body;
    const fields = inputsFrom(read.fields).map((field) =>
      field.label === 'Objetivo'
        ? { ...field, label: 'Meta principal', sensitive: true }
        : field,
    );

    const response = await formsOfAna()
      .update(second.id, {
        revision: read.revision,
        name: 'Ficha renomeada',
        fields,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      name: 'Ficha renomeada',
      version: 2,
      revision: read.revision + 1,
    });
    const current = await readAll(clients);
    expect(current.map((client) => client.form.version)).toEqual([
      2, 2, 2, 2, 2,
    ]);
  });

  it('AC-0001-23 keeps 3 clients on version 1 without Objetivo and puts a new client on version 2 with it', async () => {
    const first = await ficha();
    const clients = await clientsOn(first, 3);

    const second = await changeTemplate(
      ctx,
      ana,
      first,
      add(text('Objetivo')),
      KEEP,
    );

    expect(second.version).toBe(2);
    const goal = second.fieldId('Objetivo');
    for (const client of await readAll(clients)) {
      expect(client.form).toMatchObject({ version: 1, latestVersion: 2 });
      expect(client.values[goal]).toBeUndefined();
    }
    expect((await versionField(second, 1, goal)) === undefined).toBe(true);
    const created = await createClientVia(
      ctx,
      ana,
      second,
      { name: 'Nova Cliente', email: 'nova@example.com' },
      { [goal]: 'Ganhar massa' },
    );
    expect(created.form.version).toBe(2);
    expect(created.values[goal]).toBe('Ganhar massa');
  });
});

describe('"Atualizar todos"', () => {
  it('AC-0001-24 moves 2 clients on version 1 and 1 on version 3 to version 4', async () => {
    const first = await ficha();
    const onFirst = await clientsOn(first, 2);
    const second = await changeTemplate(
      ctx,
      ana,
      first,
      add(text('Hobby')),
      KEEP,
    );
    const third = await changeTemplate(
      ctx,
      ana,
      second,
      add(text('Meta')),
      KEEP,
    );
    expect(third.version).toBe(3);
    const onThird = await createClientVia(ctx, ana, third, {
      name: 'Cliente 3',
      email: 'cliente3@example.com',
    });

    const fourth = await changeTemplate(
      ctx,
      ana,
      third,
      add(text('Objetivo')),
      UPDATE_ALL,
    );

    expect(fourth.version).toBe(4);
    const current = await readAll([...onFirst, onThird]);
    expect(current.map((client) => client.form.version)).toEqual([4, 4, 4]);
  });

  describe('a template with 4 clients, 2 of which answer "Hobby"', () => {
    const setup = async () => {
      const template = await ficha([text('Hobby')]);
      const hobby = template.fieldId('Hobby');
      const clients = await clientsOn(template, 4, (index) =>
        index <= 2 ? { [hobby]: 'Xadrez' } : {},
      );
      const read = (await formsOfAna().read(template.id).expect(200)).body;
      const fields = inputsFrom(read.fields).filter(
        (field) => field.label !== 'Hobby',
      );
      return { template, hobby, clients, revision: read.revision, fields };
    };

    it('AC-0001-26 rejects "Atualizar todos" without the typed name and keeps version 1 and both answers', async () => {
      const { template, hobby, clients, revision, fields } = await setup();

      const response = await formsOfAna()
        .update(template.id, {
          revision,
          fields,
          migration: { mode: 'update_all' },
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'migration.confirmation-required',
        field: 'migration.confirmName',
      });
      expect((await loadTemplate(ctx, ana, template)).version).toBe(1);
      expect(
        await valueRowCount(ctx.pool, { formId: template.id, fieldId: hobby }),
      ).toBe(2);
      expect(
        (await readAll(clients)).map((client) => client.form.version),
      ).toEqual([1, 1, 1, 1]);
    });

    it('AC-0001-27 moves all 4 clients to version 2 and drops the Hobby answers after the typed name', async () => {
      const { template, hobby, clients, revision, fields } = await setup();

      const response = await formsOfAna()
        .update(template.id, {
          revision,
          fields,
          migration: { mode: 'update_all', confirmName: 'Ficha' },
        })
        .expect(200);

      expect(response.body.version).toBe(2);
      const current = await readAll(clients);
      expect(current.map((client) => client.form.version)).toEqual([
        2, 2, 2, 2,
      ]);
      for (const client of current) {
        expect(client.values[hobby]).toBeUndefined();
      }
    });
  });

  it('AC-0001-28 stores nothing when migrating one of 3 clients fails and leaves all 3 on version 1', async () => {
    const template = await ficha();
    const clients = await clientsOn(template, 3);
    const read = (await formsOfAna().read(template.id).expect(200)).body;
    const dropTrigger = await failUpdatesOfRecord(
      ctx.pool,
      await recordIdOf(clients[1]!.id),
    );

    try {
      const response = await formsOfAna()
        .update(template.id, {
          revision: read.revision,
          fields: [...inputsFrom(read.fields), text('Objetivo')],
          migration: { mode: 'update_all' },
        })
        .expect(500);

      expect(response.body).toEqual({ error: 'unexpected' });
    } finally {
      await dropTrigger();
    }

    expect((await loadTemplate(ctx, ana, template)).version).toBe(1);
    expect(await versionCount(ctx.pool, template.id)).toBe(1);
    expect(await readAll(clients)).toEqual(clients);
  });
});

describe('preview with the real client phone presence', () => {
  const previewPhoneRequired = async (template: RecordTemplate) => {
    const read = (await formsOfAna().read(template.id).expect(200)).body;
    const response = await formsOfAna()
      .preview(template.id, {
        revision: read.revision,
        fields: withField(inputsFrom(read.fields), 'Telefone', {
          required: true,
        }),
      })
      .expect(200);
    return response.body as {
      recordCount: number;
      recordsGainingRequiredFields: number;
    };
  };

  it('AC-0001 §4.7 step 4: counts the clients with no phone when Telefone becomes required', async () => {
    const template = await ficha();
    await createClientVia(ctx, ana, template, {
      name: 'Sem Telefone 1',
      email: 'um@example.com',
    });
    await createClientVia(ctx, ana, template, {
      name: 'Com Telefone',
      email: 'dois@example.com',
      phone: '11987654321',
    });
    await createClientVia(ctx, ana, template, {
      name: 'Sem Telefone 2',
      email: 'tres@example.com',
    });

    const preview = await previewPhoneRequired(template);

    expect(preview).toMatchObject({
      recordCount: 3,
      recordsGainingRequiredFields: 2,
    });
  });

  it("AC-0001 §4.7 step 4: never counts another tenant's clients with no phone", async () => {
    const template = await ficha();
    await createClientVia(ctx, ana, template, {
      name: 'Sem Telefone',
      email: 'um@example.com',
    });
    const theirs = await ficha([], 'Ficha', bia);
    await clientsOn(theirs, 2, () => ({}), bia);

    const preview = await previewPhoneRequired(template);

    expect(preview).toMatchObject({
      recordCount: 1,
      recordsGainingRequiredFields: 1,
    });
  });
});

describe('answers after a field or option change (SPEC-0002)', () => {
  it('AC-0002-16 keeps 3 clients on version 1 with their Profissão answers after the field is removed', async () => {
    const first = await ficha([text('Profissão')]);
    const profession = first.fieldId('Profissão');
    const clients = await clientsOn(first, 3, (index) => ({
      [profession]: `Profissão ${index}`,
    }));

    const second = await changeTemplate(
      ctx,
      ana,
      first,
      without('Profissão'),
      KEEP,
    );

    expect(second.version).toBe(2);
    expect(second.fields.map((field) => field.label)).not.toContain(
      'Profissão',
    );
    const current = await readAll(clients);
    expect(current.map((client) => client.form.version)).toEqual([1, 1, 1]);
    expect(current.map((client) => client.values[profession])).toEqual([
      'Profissão 1',
      'Profissão 2',
      'Profissão 3',
    ]);
  });

  it('AC-0002-19 keeps the answer "Tarde" on version 1 after the option is removed from the latest version', async () => {
    const first = await ficha([SHIFT]);
    const shift = first.fieldId('Turno');
    const afternoon = first.optionId('Turno', 'Tarde');
    const [client] = await clientsOn(first, 1, () => ({ [shift]: afternoon }));

    const second = await changeTemplate(
      ctx,
      ana,
      first,
      (inputs) =>
        inputs.map((input) =>
          input.label === 'Turno'
            ? {
                ...input,
                options: input.options?.filter((o) => o.id !== afternoon),
              }
            : input,
        ),
      KEEP,
    );

    expect(second.version).toBe(2);
    const latest = await versionField(second, 2, shift);
    expect(latest?.options?.map((option) => option.label)).toEqual([
      'Manhã',
      'Noite',
    ]);
    const current = await readClient(ctx, ana, client!.id);
    expect(current.form.version).toBe(1);
    expect(current.values[shift]).toBe(afternoon);
    const onVersionOne = await versionField(second, 1, shift);
    expect(
      onVersionOne?.options?.find((option) => option.id === afternoon)?.label,
    ).toBe('Tarde');
  });

  // the masking itself is W-cview; here the version and the stored answer
  it('AC-0002-23 marks Hobby protected in version 1 without publishing a version and the client on version 1 keeps its answer', async () => {
    const first = await ficha([text('Hobby')]);
    const hobby = first.fieldId('Hobby');
    const [client] = await clientsOn(first, 1, () => ({ [hobby]: 'Corrida' }));
    const second = await changeTemplate(
      ctx,
      ana,
      first,
      add(text('Objetivo')),
      KEEP,
    );
    expect(second.version).toBe(2);

    const protectedTemplate = await changeTemplate(ctx, ana, second, (inputs) =>
      withField(inputs, 'Hobby', { sensitive: true }),
    );

    expect(protectedTemplate.version).toBe(2);
    expect((await versionField(second, 1, hobby))?.sensitive).toBe(true);
    const current = await readClient(ctx, ana, client!.id);
    expect(current.form.version).toBe(1);
    expect(current.values[hobby]).toBe('Corrida');
  });

  it('AC-0002-24 shows the renamed option "Período da tarde" to a client on an older version and publishes no version', async () => {
    const first = await ficha([SHIFT]);
    const shift = first.fieldId('Turno');
    const afternoon = first.optionId('Turno', 'Tarde');
    const [client] = await clientsOn(first, 1, () => ({ [shift]: afternoon }));
    const second = await changeTemplate(
      ctx,
      ana,
      first,
      add(text('Objetivo')),
      KEEP,
    );
    expect(second.version).toBe(2);

    const renamed = await changeTemplate(ctx, ana, second, (inputs) =>
      inputs.map((input) =>
        input.label === 'Turno'
          ? {
              ...input,
              options: input.options?.map((option) =>
                option.id === afternoon
                  ? { ...option, label: 'Período da tarde' }
                  : option,
              ),
            }
          : input,
      ),
    );

    expect(renamed.version).toBe(2);
    const current = await readClient(ctx, ana, client!.id);
    expect(current.form.version).toBe(1);
    expect(current.values[shift]).toBe(afternoon);
    const onVersionOne = await versionField(renamed, 1, shift);
    expect(
      onVersionOne?.options?.find((option) => option.id === afternoon)?.label,
    ).toBe('Período da tarde');
  });

  it('AC-0002-26 keeps 2 clients on version 1 with their text answers when a number field "Peso" replaces the text one', async () => {
    const first = await ficha([text('Peso')]);
    const weight = first.fieldId('Peso');
    const clients = await clientsOn(first, 2, (index) => ({
      [weight]: `${70 + index} kg`,
    }));

    const second = await changeTemplate(
      ctx,
      ana,
      first,
      (inputs) => [
        ...inputs.filter((i) => i.label !== 'Peso'),
        { label: 'Peso', type: 'number' },
      ],
      KEEP,
    );

    expect(second.version).toBe(2);
    const latest = second.fields.find((field) => field.label === 'Peso');
    expect(latest?.type).toBe('number');
    expect(latest?.id).not.toBe(weight);
    const current = await readAll(clients);
    expect(current.map((client) => client.form.version)).toEqual([1, 1]);
    expect(current.map((client) => client.values[weight])).toEqual([
      '71 kg',
      '72 kg',
    ]);
    expect((await versionField(second, 1, weight))?.type).toBe('text');
  });
});
