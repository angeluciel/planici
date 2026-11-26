import { createCipheriv, randomBytes, randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import type { Field, FormType } from '@planici/schemas';
import type { Database } from '@src/database/database.module.js';
import type { TenantTransaction } from '@modules/tenants/infrastructure/persistence/tenant-scope.js';
import {
  CURRENT_FIELD_VALUE_KEY_VERSION,
  FieldValueCipher,
} from '@shared/crypto/field-value.cipher.js';
import { RecordService } from '@src/modules/records/application/record.service.js';
import { RecordValueUnreadableError } from '@src/modules/records/domain/errors/record.errors.js';
import type { RecordVersionField } from '@src/modules/records/domain/record-version.js';
import type {
  RecordFormReader,
  RecordTemplateHead,
  StoredRecordVersion,
} from '@src/modules/records/ports/record-form.reader.js';
import type {
  RecordRepository,
  StoredRecord,
  StoredValue,
} from '@src/modules/records/ports/record.repository.js';

// U-svc: RecordService against an in-memory repository and form reader, with
// the real AES-256-GCM cipher and a key made for this run. Describes behavior
// as built: the e2e specs cover the same flows through Postgres; these pin the
// paths they do not reach, above all that a value which cannot be read fails
// with record.value-unreadable and nothing of the cipher's own error (R10).

const TENANT = 'studio-ana-4f9k2m7x1q';
const OTHER_TENANT = 'studio-bia-7h3n5p8r2t';
const FORM_ID = randomUUID();
const KEY = randomBytes(32);
const CREATED = new Date('2026-11-01T12:00:00.000Z');

const tx = { executor: 'transaction' } as unknown as TenantTransaction;
const pool = { executor: 'pool' } as unknown as Database;

function fieldOf(
  type: Field['type'],
  extra: Partial<RecordVersionField> = {},
): RecordVersionField {
  return {
    id: randomUUID(),
    label: `Campo ${type}`,
    type,
    required: false,
    sensitive: false,
    sensitiveLock: null,
    requiredLock: false,
    helpText: null,
    options: null,
    systemKey: null,
    ...extra,
  };
}

const NAME = fieldOf('full_name', { systemKey: 'client.name', required: true });
const PHONE = fieldOf('phone', { systemKey: 'client.phone', required: true });
const PROFESSION = fieldOf('text', { required: true });
const NEWSLETTER = fieldOf('yes_no');
const NOTES = fieldOf('long_text');
const PRESENT = { 'client.name': true, 'client.phone': true };

type Row = StoredRecord & { tenantId: string };

function world(
  over: {
    template?: Partial<RecordTemplateHead>;
    version?: StoredRecordVersion | null;
  } = {},
) {
  const template: RecordTemplateHead = {
    id: FORM_ID,
    type: 'client',
    name: 'Ficha',
    status: 'active',
    latestVersion: 2,
    ...over.template,
  };
  const version: StoredRecordVersion | null =
    over.version === undefined
      ? {
          id: randomUUID(),
          number: 2,
          fields: [NAME, PHONE, PROFESSION, NEWSLETTER, NOTES],
        }
      : over.version;

  const rows = new Map<string, Row>();
  const values = new Map<string, StoredValue[]>();
  const own = (tenantId: string, id: string) => {
    const row = rows.get(id);
    return row && row.tenantId === tenantId ? row : null;
  };
  const valueKey = (tenantId: string, id: string) => `${tenantId}/${id}`;

  const forms: RecordFormReader = {
    lockTemplateForShare: vi.fn(
      async (_tx, tenantId: string, formId: string) =>
        tenantId === TENANT && formId === template.id ? template : null,
    ),
    findVersion: vi.fn(
      async (_executor, tenantId: string, formId: string, number: number) =>
        tenantId === TENANT &&
        formId === template.id &&
        version !== null &&
        number === version.number
          ? version
          : null,
    ),
  };

  const records: RecordRepository = {
    lockForUpdate: vi.fn(async (_tx, tenantId: string, id: string) =>
      own(tenantId, id),
    ),
    find: vi.fn(async (_executor, tenantId: string, id: string) =>
      own(tenantId, id),
    ),
    insert: vi.fn(async (_tx, record) => {
      rows.set(record.id, {
        id: record.id,
        tenantId: record.tenantId,
        formId: record.formId,
        formVersionId: record.formVersionId,
        versionNumber: version?.number ?? 0,
        revision: 1,
        createdAt: CREATED,
        updatedAt: CREATED,
        formType: template.type,
        formName: template.name,
        formStatus: template.status,
        formLatestVersion: template.latestVersion,
      });
    }),
    listValues: vi.fn(
      async (_executor, tenantId: string, id: string) =>
        values.get(valueKey(tenantId, id)) ?? [],
    ),
    insertValues: vi.fn(async (_tx, tenantId: string, id: string, added) => {
      const key = valueKey(tenantId, id);
      values.set(key, [...(values.get(key) ?? []), ...added]);
    }),
    deleteValues: vi.fn(async (_tx, tenantId: string, id: string) => {
      values.delete(valueKey(tenantId, id));
    }),
    touch: vi.fn(async (_tx, tenantId: string, id: string) => {
      const row = own(tenantId, id);
      if (row) row.revision += 1;
    }),
  };

  const service = new RecordService(
    forms,
    records,
    new FieldValueCipher(KEY.toString('base64')),
    pool,
  );

  /** Creates a record through the service, as a create handler does. */
  async function create(answers: Record<string, unknown>): Promise<string> {
    const draft = await service.openForCreate(tx, TENANT, 'client', {
      formId: FORM_ID,
      formVersion: 2,
    });
    return draft.insert(draft.checkValues(answers));
  }

  const storedValues = (id: string) => values.get(valueKey(TENANT, id)) ?? [];

  return { service, forms, records, values, storedValues, create };
}

type Thrown = { status: number; code: string };

async function failure(work: () => Promise<unknown>): Promise<Thrown> {
  try {
    await work();
  } catch (error) {
    const { status, code } = error as Thrown;
    return { status, code };
  }
  throw new Error('the call succeeded');
}

/** Seals `plaintext` exactly as the cipher stores a value, without JSON-encoding it. */
function sealRaw(
  plaintext: string,
  context: { tenantId: string; formRecordId: string; fieldId: string },
): Buffer {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', KEY, nonce);
  cipher.setAAD(
    Buffer.from(
      [
        CURRENT_FIELD_VALUE_KEY_VERSION,
        context.tenantId,
        context.formRecordId,
        context.fieldId,
      ].join('|'),
      'utf8',
    ),
  );
  const body = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  return Buffer.concat([nonce, body, cipher.getAuthTag()]);
}

describe('RecordService.openForCreate', () => {
  it('locks the template for share in the caller transaction, scoped to the tenant', async () => {
    const { service, forms } = world();

    await service.openForCreate(tx, TENANT, 'client', {
      formId: FORM_ID,
      formVersion: 2,
    });

    expect(forms.lockTemplateForShare).toHaveBeenCalledWith(
      tx,
      TENANT,
      FORM_ID,
    );
    expect(forms.findVersion).toHaveBeenCalledWith(tx, TENANT, FORM_ID, 2);
  });

  it.each<{
    name: string;
    over?: Parameters<typeof world>[0];
    tenantId?: string;
    type?: FormType;
    formVersion?: number;
    expected: Thrown;
  }>([
    {
      name: "another tenant's template",
      tenantId: OTHER_TENANT,
      expected: { status: 400, code: 'formId.invalid' },
    },
    {
      name: 'a template of another type',
      type: 'service',
      expected: { status: 422, code: 'formType.mismatch' },
    },
    {
      name: 'an archived template',
      over: { template: { status: 'archived' } },
      expected: { status: 409, code: 'form.archived' },
    },
    {
      name: 'a version older than the latest',
      formVersion: 1,
      expected: { status: 409, code: 'record.form-changed' },
    },
    {
      name: 'a latest version with no stored row',
      over: { version: null },
      expected: { status: 400, code: 'formId.invalid' },
    },
  ])('refuses $name and writes nothing', async (c) => {
    const { service, records } = world(c.over);

    const thrown = await failure(() =>
      service.openForCreate(tx, c.tenantId ?? TENANT, c.type ?? 'client', {
        formId: FORM_ID,
        formVersion: c.formVersion ?? 2,
      }),
    );

    expect(thrown).toEqual(c.expected);
    expect(records.insert).not.toHaveBeenCalled();
    expect(records.insertValues).not.toHaveBeenCalled();
  });
});

describe('a record draft', () => {
  async function draft() {
    const w = world();
    return w.service.openForCreate(tx, TENANT, 'client', {
      formId: FORM_ID,
      formVersion: 2,
    });
  }

  it('lists only the version system fields, in version order', async () => {
    expect((await draft()).systemFields).toEqual([NAME, PHONE]);
  });

  it('tells whether the version requires a system field', async () => {
    const d = await draft();

    expect(d.isRequired('client.phone')).toBe(true);
    expect(d.isRequired('client.email')).toBe(false);
  });

  it('inserts revision 1 and one encrypted row per answered custom field', async () => {
    const w = world();

    const id = await w.create({
      [PROFESSION.id]: 'Dentista',
      [NEWSLETTER.id]: false,
    });

    expect(w.records.insert).toHaveBeenCalledWith(tx, {
      id,
      tenantId: TENANT,
      formId: FORM_ID,
      formVersionId: expect.any(String),
    });
    const stored = w.storedValues(id);
    expect(stored.map((row) => row.fieldId)).toEqual([PROFESSION.id]);
    expect(stored[0]?.keyVersion).toBe(CURRENT_FIELD_VALUE_KEY_VERSION);
    expect(stored[0]?.ciphertext.toString('utf8')).not.toContain('Dentista');
  });

  it('never stores a false yes_no or an undefined value, even when handed one directly', async () => {
    const w = world();
    const d = await w.service.openForCreate(tx, TENANT, 'client', {
      formId: FORM_ID,
      formVersion: 2,
    });

    const id = await d.insert({
      [PROFESSION.id]: 'Dentista',
      [NEWSLETTER.id]: false,
      [NOTES.id]: undefined,
    });

    expect(w.storedValues(id).map((row) => row.fieldId)).toEqual([
      PROFESSION.id,
    ]);
  });
});

describe('RecordService.read', () => {
  it('returns the custom answers decrypted and false for an unanswered yes_no', async () => {
    const w = world();
    const id = await w.create({ [PROFESSION.id]: 'Dentista' });

    const record = await w.service.read(TENANT, id, PRESENT);

    expect(record).toEqual({
      form: {
        id: FORM_ID,
        name: 'Ficha',
        version: 2,
        latestVersion: 2,
        status: 'active',
      },
      revision: 1,
      values: { [PROFESSION.id]: 'Dentista', [NEWSLETTER.id]: false },
      missingRequired: [],
      createdAt: CREATED.toISOString(),
      updatedAt: CREATED.toISOString(),
    });
  });

  it('lists the required fields without a value, system ones by presence', async () => {
    const w = world();
    const id = await w.create({
      [PROFESSION.id]: 'Dentista',
      [NOTES.id]: 'Prefere manhãs',
    });
    // a required answer with no stored row, as after a value set was replaced
    const stored = w.storedValues(id);
    stored.splice(
      stored.findIndex((row) => row.fieldId === PROFESSION.id),
      1,
    );

    const record = await w.service.read(TENANT, id, {
      'client.name': true,
      'client.phone': false,
    });

    expect(record?.missingRequired).toEqual([PHONE.id, PROFESSION.id]);
  });

  it('skips stored rows that are not custom fields of the version, without decrypting them', async () => {
    const w = world();
    const id = await w.create({ [PROFESSION.id]: 'Dentista' });
    w.storedValues(id).push(
      { fieldId: NAME.id, keyVersion: 1, ciphertext: Buffer.from('garbage') },
      {
        fieldId: randomUUID(),
        keyVersion: 1,
        ciphertext: Buffer.from('garbage'),
      },
    );

    const record = await w.service.read(TENANT, id, PRESENT);

    expect(Object.keys(record?.values ?? {}).sort()).toEqual(
      [PROFESSION.id, NEWSLETTER.id].sort(),
    );
  });

  it('answers null for a record of another tenant', async () => {
    const w = world();
    const id = await w.create({ [PROFESSION.id]: 'Dentista' });

    await expect(w.service.read(OTHER_TENANT, id, PRESENT)).resolves.toBeNull();
    expect(w.records.listValues).not.toHaveBeenCalled();
  });

  it('answers null when the record version can no longer be read', async () => {
    const w = world();
    const id = await w.create({ [PROFESSION.id]: 'Dentista' });
    vi.mocked(w.forms.findVersion).mockResolvedValueOnce(null);

    await expect(w.service.read(TENANT, id, PRESENT)).resolves.toBeNull();
  });

  it('reads in the caller transaction when given one, and on the pool otherwise', async () => {
    const w = world();
    const id = await w.create({ [PROFESSION.id]: 'Dentista' });

    await w.service.read(TENANT, id, PRESENT, tx);
    await w.service.read(TENANT, id, PRESENT);

    expect(vi.mocked(w.records.find).mock.calls.map((call) => call[0])).toEqual(
      [tx, pool],
    );
    expect(
      vi.mocked(w.records.listValues).mock.calls.map((call) => call[0]),
    ).toEqual([tx, pool]);
  });

  describe('a stored value that cannot be read', () => {
    async function readWith(
      tamper: (row: StoredValue, ids: { id: string }) => void,
    ): Promise<unknown> {
      const w = world();
      const id = await w.create({ [PROFESSION.id]: 'Dentista' });
      const [row] = w.storedValues(id);
      if (!row) throw new Error('no stored value');
      tamper(row, { id });
      return w.service.read(TENANT, id, PRESENT).then(
        () => {
          throw new Error('the read succeeded');
        },
        (error: unknown) => error,
      );
    }

    function expectUnreadable(error: unknown) {
      expect(error).toBeInstanceOf(RecordValueUnreadableError);
      expect(error).toMatchObject({
        status: 500,
        code: 'record.value-unreadable',
        message: 'record error: record.value-unreadable',
      });
      expect((error as Error).cause).toBeUndefined();
    }

    it('fails with record.value-unreadable when the ciphertext was altered', async () => {
      const error = await readWith((row) => {
        row.ciphertext = Buffer.from(row.ciphertext);
        row.ciphertext[14] = (row.ciphertext[14] ?? 0) ^ 0xff;
      });

      expectUnreadable(error);
    });

    it('fails when the value was copied from another record (the ids are bound to it)', async () => {
      const w = world();
      const source = await w.create({ [PROFESSION.id]: 'Dentista' });
      const target = await w.create({ [PROFESSION.id]: 'Advogada' });
      const [copied] = w.storedValues(source);
      const [own] = w.storedValues(target);
      if (!copied || !own) throw new Error('no stored value');
      own.ciphertext = copied.ciphertext;

      const error = await w.service
        .read(TENANT, target, PRESENT)
        .catch((e: unknown) => e);

      expectUnreadable(error);
    });

    it('fails when the row names a key version this build does not have', async () => {
      const error = await readWith((row) => {
        row.keyVersion = CURRENT_FIELD_VALUE_KEY_VERSION + 1;
      });

      expectUnreadable(error);
    });

    it('does not pass on the parse error, which would quote the plaintext', async () => {
      const plaintext = 'not json: 123.456.789-09';
      const error = await readWith((row, { id }) => {
        row.ciphertext = sealRaw(plaintext, {
          tenantId: TENANT,
          formRecordId: id,
          fieldId: row.fieldId,
        });
      });

      expectUnreadable(error);
      expect(JSON.stringify(error)).not.toContain('123.456.789-09');
      expect((error as Error).message).not.toContain('123.456.789-09');
      expect((error as Error).stack ?? '').not.toContain('123.456.789-09');
    });
  });
});

describe('RecordService.openForUpdate', () => {
  async function created() {
    const w = world();
    const id = await w.create({ [PROFESSION.id]: 'Dentista' });
    return { ...w, id };
  }

  it('replaces the value set and raises the revision by 1', async () => {
    const w = await created();

    const draft = await w.service.openForUpdate(tx, TENANT, w.id, 'client', {
      formVersion: 2,
      revision: 1,
    });
    await draft.replace(draft.checkValues({ [PROFESSION.id]: 'Advogada' }));

    expect(w.records.lockForUpdate).toHaveBeenCalledWith(tx, TENANT, w.id);
    const record = await w.service.read(TENANT, w.id, PRESENT);
    expect(record?.revision).toBe(2);
    expect(record?.values[PROFESSION.id]).toBe('Advogada');
    expect(w.storedValues(w.id)).toHaveLength(1);
  });

  it.each<{
    name: string;
    tenantId?: string;
    type?: FormType;
    formVersion?: number;
    revision?: number;
    versionGone?: boolean;
    expected: Thrown;
  }>([
    {
      name: "another tenant's record",
      tenantId: OTHER_TENANT,
      expected: { status: 404, code: 'record.not-found' },
    },
    {
      name: 'a record of another type',
      type: 'service',
      expected: { status: 404, code: 'record.not-found' },
    },
    {
      name: 'a form version other than the record one',
      formVersion: 3,
      expected: { status: 409, code: 'record.form-changed' },
    },
    {
      name: 'a stale revision',
      revision: 0,
      expected: { status: 409, code: 'record.revision-conflict' },
    },
    {
      name: 'a record whose version can no longer be read',
      versionGone: true,
      expected: { status: 404, code: 'record.not-found' },
    },
  ])('refuses $name and changes nothing', async (c) => {
    const w = await created();
    if (c.versionGone)
      vi.mocked(w.forms.findVersion).mockResolvedValueOnce(null);

    const thrown = await failure(() =>
      w.service.openForUpdate(
        tx,
        c.tenantId ?? TENANT,
        w.id,
        c.type ?? 'client',
        {
          formVersion: c.formVersion ?? 2,
          revision: c.revision ?? 1,
        },
      ),
    );

    expect(thrown).toEqual(c.expected);
    expect(w.records.deleteValues).not.toHaveBeenCalled();
    expect(w.records.touch).not.toHaveBeenCalled();
  });
});
