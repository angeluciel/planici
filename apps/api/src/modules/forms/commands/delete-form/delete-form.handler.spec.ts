import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { DeleteFormRequestInput } from '@planici/schemas';
import {
  buildHandler,
  FakeFormPorts,
  ownerMembership,
  storedClientForm,
} from '../../../../../test/utils/forms-fixtures.js';
import { DeleteFormCommand } from './delete-form.command.js';
import { DeleteFormHandler } from './delete-form.handler.js';

// U-del: the delete check order of SPEC-0001 section 6 (404, 400, 409 in-use,
// 409 records-have-history) and the typed-name rule of R9

const TENANT = 'studio-ana-4f9k2m7x1q';

let ports: FakeFormPorts;
let handler: DeleteFormHandler;
let formId: string;

const remove = (
  payload: DeleteFormRequestInput,
  id = formId,
  tenant = TENANT,
) =>
  handler.execute(new DeleteFormCommand(ownerMembership(tenant), id, payload));

beforeEach(() => {
  const form = storedClientForm({ tenantId: TENANT, name: 'Ficha' });
  formId = form.id;
  ports = new FakeFormPorts(form);
  handler = buildHandler(DeleteFormHandler, ports);
});

describe('DeleteFormHandler', () => {
  it('AC-0001-13 deletes a template without records after the exact name', async () => {
    await remove({ confirmName: 'Ficha' });

    expect(ports.formDeleted).toBe(true);
    expect(ports.recordsDeleted).toBe(false);
  });

  it('R9 compares the typed name after trimming surrounding spaces', async () => {
    await remove({ confirmName: '  Ficha ' });

    expect(ports.formDeleted).toBe(true);
  });

  it('AC-0001-35 rejects a wrong typed name on a template without records', async () => {
    await expect(remove({ confirmName: 'ficha x' })).rejects.toMatchObject({
      code: 'deleteConfirmation.required',
      field: 'confirmName',
    });
    expect(ports.formDeleted).toBe(false);
  });

  it('AC-0001-70 compares the typed name with case', async () => {
    await expect(remove({ confirmName: 'ficha' })).rejects.toMatchObject({
      code: 'deleteConfirmation.required',
      field: 'confirmName',
    });
  });

  it('rejects a missing typed name', async () => {
    await expect(remove({})).rejects.toMatchObject({
      code: 'deleteConfirmation.required',
      field: 'confirmName',
    });
  });

  it('AC-0001-14 answers form.in-use for a template with records and no deleteRecords', async () => {
    ports.recordCount = 1;

    await expect(remove({ confirmName: 'Ficha' })).rejects.toMatchObject({
      code: 'form.in-use',
    });
    expect(ports.formDeleted).toBe(false);
    expect(ports.recordsDeleted).toBe(false);
  });

  it('AC-0001-33 rejects deleteRecords with a wrong typed name and deletes nothing', async () => {
    ports.recordCount = 3;

    await expect(
      remove({ deleteRecords: true, confirmName: 'ficha x' }),
    ).rejects.toMatchObject({
      code: 'deleteConfirmation.required',
      field: 'confirmName',
    });
    expect(ports.formDeleted).toBe(false);
    expect(ports.recordsDeleted).toBe(false);
  });

  it('AC-0001-31 deletes the records and the template with deleteRecords and the typed name', async () => {
    ports.recordCount = 3;

    await remove({ deleteRecords: true, confirmName: 'Ficha' });

    expect(ports.recordsDeleted).toBe(true);
    expect(ports.formDeleted).toBe(true);
  });

  it('AC-0001-34 answers form.records-have-history when a record has linked history', async () => {
    ports.recordCount = 3;
    ports.recordsWithHistory = 1;

    await expect(
      remove({ deleteRecords: true, confirmName: 'Ficha' }),
    ).rejects.toMatchObject({ code: 'form.records-have-history' });
    expect(ports.formDeleted).toBe(false);
    expect(ports.recordsDeleted).toBe(false);
  });
});

describe('DeleteFormHandler check order (section 6)', () => {
  it('checks form.not-found before the typed name', async () => {
    await expect(
      remove({ confirmName: 'wrong' }, randomUUID()),
    ).rejects.toMatchObject({ code: 'form.not-found' });
  });

  it('AC-0001-15 answers form.not-found to a template of another tenant', async () => {
    await expect(
      remove({ confirmName: 'Ficha' }, formId, 'studio-bia-8d2n5k0r3t'),
    ).rejects.toMatchObject({ code: 'form.not-found' });
    expect(ports.formDeleted).toBe(false);
  });

  it('checks the typed name before form.in-use', async () => {
    ports.recordCount = 3;

    await expect(remove({ confirmName: 'wrong' })).rejects.toMatchObject({
      code: 'deleteConfirmation.required',
    });
  });

  it('checks form.in-use before form.records-have-history', async () => {
    ports.recordCount = 3;
    ports.recordsWithHistory = 1;

    await expect(remove({ confirmName: 'Ficha' })).rejects.toMatchObject({
      code: 'form.in-use',
    });
  });

  it('checks the typed name before form.records-have-history', async () => {
    ports.recordCount = 3;
    ports.recordsWithHistory = 1;

    await expect(
      remove({ deleteRecords: true, confirmName: 'wrong' }),
    ).rejects.toMatchObject({ code: 'deleteConfirmation.required' });
  });
});
