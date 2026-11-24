import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildHandler,
  FakeFormPorts,
  ownerMembership,
  storedClientForm,
} from '../../../../../test/utils/forms-fixtures.js';
import { ArchiveFormCommand } from './archive-form.command.js';
import { ArchiveFormHandler } from './archive-form.handler.js';

// U-arch: archive raises the template revision by 1 (R11) and rejects a template
// that already has the target status

const TENANT = 'studio-ana-4f9k2m7x1q';

let ports: FakeFormPorts;
let handler: ArchiveFormHandler;
let formId: string;

const run = (id = formId, tenant = TENANT) =>
  handler.execute(new ArchiveFormCommand(ownerMembership(tenant), id));

describe('ArchiveFormHandler', () => {
  beforeEach(() => {
    const form = storedClientForm({
      tenantId: TENANT,
      status: 'active',
      revision: 3,
    });
    formId = form.id;
    ports = new FakeFormPorts(form);
    handler = buildHandler(ArchiveFormHandler, ports);
  });

  it('AC-0001-12 returns the template as archived', async () => {
    const result = await run();

    expect(result).toMatchObject({ id: formId, status: 'archived' });
  });

  it('R11 raises the stored revision by 1 and returns it', async () => {
    const result = await run();

    expect(result.revision).toBe(4);
    expect(ports.form).toMatchObject({ status: 'archived', revision: 4 });
  });

  it('does not publish a version', async () => {
    const result = await run();

    expect(result.version).toBe(1);
    expect(ports.form?.latestVersion).toBe(1);
  });

  it('AC-0001-47 rejects a template that already is archived and keeps its revision', async () => {
    ports.form = { ...ports.form!, status: 'archived' };

    await expect(run()).rejects.toMatchObject({
      code: 'form.status-unchanged',
    });
    expect(ports.form?.revision).toBe(3);
  });

  it('AC-0001-15 answers form.not-found to an unknown template', async () => {
    await expect(run(randomUUID())).rejects.toMatchObject({
      code: 'form.not-found',
    });
  });

  it('AC-0001-15 answers form.not-found to a template of another tenant', async () => {
    await expect(run(formId, 'studio-bia-8d2n5k0r3t')).rejects.toMatchObject({
      code: 'form.not-found',
    });
    expect(ports.form?.status).toBe('active');
  });
});
