import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { UpdateFormRequestInput } from '@planici/schemas';
import type { StoredForm } from '../../ports/form-repository.js';
import {
  buildHandler,
  FakeFormPorts,
  ownerMembership,
  storedClientForm,
} from '../../../../../test/utils/forms-fixtures.js';
import { UpdateFormCommand } from './update-form.command.js';
import { UpdateFormHandler } from './update-form.handler.js';

// U-upd: the update check order and the migration rules (SPEC-0001 plan,
// "Update": 404, revision, field rules, name clash, migration mode, typed name)

const TENANT = 'studio-ana-4f9k2m7x1q';

let form: StoredForm;
let ports: FakeFormPorts;
let handler: UpdateFormHandler;

const inputs = (stored: StoredForm = form) =>
  stored.fields.map((field) => ({
    id: field.id,
    label: field.label,
    type: field.type,
    required: field.required,
  }));

const newField = (label = 'Objetivo') => ({ label, type: 'text' as const });

const update = (
  payload: UpdateFormRequestInput,
  formId = form.id,
  tenantId = TENANT,
) =>
  handler.execute(
    new UpdateFormCommand(ownerMembership(tenantId), formId, payload),
  );

beforeEach(() => {
  form = storedClientForm({ tenantId: TENANT, revision: 3 });
  form.fields.push({
    id: randomUUID(),
    type: 'text',
    systemKey: null,
    label: 'Hobby',
    helpText: null,
    sensitive: false,
    required: false,
    position: 3,
    options: null,
  });
  ports = new FakeFormPorts(form);
  handler = buildHandler(UpdateFormHandler, ports);
});

describe('UpdateFormHandler check order', () => {
  it('answers form.not-found first, whatever else is wrong', async () => {
    await expect(
      update(
        {
          revision: 99,
          fields: [{ id: randomUUID(), label: '', type: 'text' }],
        },
        randomUUID(),
      ),
    ).rejects.toMatchObject({ code: 'form.not-found' });
  });

  it('AC-0001-15 answers form.not-found to a template of another tenant', async () => {
    await expect(
      update(
        { revision: 3, name: 'Hijacked' },
        form.id,
        'studio-bia-8d2n5k0r3t',
      ),
    ).rejects.toMatchObject({ code: 'form.not-found' });
    expect(ports.form).toMatchObject({ name: 'Ficha', revision: 3 });
  });

  it('AC-0001-08 answers form.revision-conflict before the field rules', async () => {
    await expect(
      update({
        revision: 2,
        fields: [...inputs(), { id: randomUUID(), ...newField() }],
      }),
    ).rejects.toMatchObject({
      code: 'form.revision-conflict',
      field: 'revision',
    });
    expect(ports.form).toMatchObject({ revision: 3, latestVersion: 1 });
  });

  it('answers field.unknown (field rules) before the migration mode', async () => {
    ports.recordCount = 3;

    await expect(
      update({
        revision: 3,
        fields: [...inputs(), { id: randomUUID(), ...newField() }],
      }),
    ).rejects.toMatchObject({ code: 'field.unknown' });
  });

  it('AC-0001-22 answers migration.mode-required before the typed name', async () => {
    ports.recordCount = 3;
    ports.recordsLosingAnswers = 2;

    await expect(
      update({
        revision: 3,
        fields: inputs().filter((field) => field.label !== 'Hobby'),
      }),
    ).rejects.toMatchObject({
      code: 'migration.mode-required',
      field: 'migration.mode',
    });
  });
});

describe('UpdateFormHandler migration', () => {
  it('AC-0001-22 rejects a schema change over records without a mode and stores nothing', async () => {
    ports.recordCount = 3;

    await expect(
      update({ revision: 3, fields: [...inputs(), newField()] }),
    ).rejects.toMatchObject({
      code: 'migration.mode-required',
      field: 'migration.mode',
    });

    expect(ports.form).toMatchObject({ latestVersion: 1, revision: 3 });
  });

  it('AC-0001-26 rejects update_all that deletes answers without confirmName and stores nothing', async () => {
    ports.recordCount = 4;
    ports.recordsLosingAnswers = 2;

    await expect(
      update({
        revision: 3,
        fields: inputs().filter((field) => field.label !== 'Hobby'),
        migration: { mode: 'update_all' },
      }),
    ).rejects.toMatchObject({
      code: 'migration.confirmation-required',
      field: 'migration.confirmName',
    });

    expect(ports.form).toMatchObject({ latestVersion: 1, revision: 3 });
    expect(ports.recordsRepointed).toBe(false);
    expect(ports.lostAnswersDeleted).toBe(false);
  });

  it('AC-0001-26 rejects update_all with a typed name that differs in case', async () => {
    ports.recordCount = 4;
    ports.recordsLosingAnswers = 2;

    await expect(
      update({
        revision: 3,
        fields: inputs().filter((field) => field.label !== 'Hobby'),
        migration: { mode: 'update_all', confirmName: 'ficha' },
      }),
    ).rejects.toMatchObject({ code: 'migration.confirmation-required' });
  });

  it('AC-0001-27 migrates after the typed name, trimmed (R9), and raises the revision by 1', async () => {
    ports.recordCount = 4;
    ports.recordsLosingAnswers = 2;

    const result = await update({
      revision: 3,
      fields: inputs().filter((field) => field.label !== 'Hobby'),
      migration: { mode: 'update_all', confirmName: ' Ficha ' },
    });

    expect(result).toMatchObject({ version: 2, revision: 4 });
    expect(ports.form).toMatchObject({ latestVersion: 2, revision: 4 });
    expect(ports.recordsRepointed).toBe(true);
    expect(ports.lostAnswersDeleted).toBe(true);
  });

  it('AC-0001-24 needs no typed name when update_all deletes no answer', async () => {
    ports.recordCount = 3;
    ports.recordsLosingAnswers = 0;

    const result = await update({
      revision: 3,
      fields: [...inputs(), newField()],
      migration: { mode: 'update_all' },
    });

    expect(result).toMatchObject({ version: 2 });
    expect(ports.recordsRepointed).toBe(true);
  });

  it('AC-0001-23 keeps existing records with "keep": publishes without repointing', async () => {
    ports.recordCount = 3;

    const result = await update({
      revision: 3,
      fields: [...inputs(), newField()],
      migration: { mode: 'keep' },
    });

    expect(result).toMatchObject({ version: 2, revision: 4 });
    expect(ports.recordsRepointed).toBe(false);
    expect(ports.lostAnswersDeleted).toBe(false);
  });

  it('AC-0001-28 stores nothing when deleting the lost answers fails (R10)', async () => {
    ports.recordCount = 4;
    ports.recordsLosingAnswers = 2;
    ports.deleteLostAnswers = () => Promise.reject(new Error('boom'));

    await expect(
      update({
        revision: 3,
        fields: inputs().filter((field) => field.label !== 'Hobby'),
        migration: { mode: 'update_all', confirmName: 'Ficha' },
      }),
    ).rejects.toThrow('boom');

    expect(ports.form).toMatchObject({ latestVersion: 1, revision: 3 });
    expect(ports.recordsRepointed).toBe(false);
  });
});

describe('UpdateFormHandler publication', () => {
  it('AC-0001-20 stores a metadata-only save without a version, even over records', async () => {
    ports.recordCount = 5;

    const result = await update({
      revision: 3,
      name: 'Ficha renomeada',
      fields: inputs().map((field) =>
        field.label === 'Hobby' ? { ...field, label: 'Passatempo' } : field,
      ),
    });

    expect(result).toMatchObject({
      name: 'Ficha renomeada',
      version: 1,
      revision: 4,
    });
    expect(ports.recordsRepointed).toBe(false);
  });

  it('AC-0001-21 publishes the next version of a template without records', async () => {
    const result = await update({
      revision: 3,
      fields: [...inputs(), newField()],
    });

    expect(result).toMatchObject({ version: 2, revision: 4 });
    expect(ports.form).toMatchObject({ latestVersion: 2 });
  });

  it('runs no field rule and publishes nothing when the request has no fields (plan, API point 6)', async () => {
    ports.recordCount = 3;

    const result = await update({ revision: 3, description: 'Nova descrição' });

    expect(result).toMatchObject({
      description: 'Nova descrição',
      version: 1,
      revision: 4,
    });
    expect(result.fields).toHaveLength(form.fields.length);
  });

  it('AC-0001-75 accepts a rename that changes only the case of its own name', async () => {
    const result = await update({ revision: 3, name: 'FICHA' });

    expect(result).toMatchObject({ name: 'FICHA', revision: 4 });
  });
});
