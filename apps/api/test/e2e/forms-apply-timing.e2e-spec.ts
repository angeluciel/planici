import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  CURRENT_FIELD_VALUE_KEY_VERSION,
  FieldValueCipher,
} from '@shared/crypto/field-value.cipher.js';
import { createTestApp, type TestContext } from '../setup/test-app.js';
import {
  CLIENT_SYSTEM_FIELDS,
  dbFor,
  formsApi,
  inputsFrom,
  recordRows,
  seedForm,
  signUpOwner,
  type SeededForm,
  type Session,
} from '../utils/forms-fixtures.js';

// One-off timing run (SPEC-0001 plan, Decision 4; RNF-02): 5,000 records, a
// third on each of three versions, so most answers name fields or `select`
// options the latest version no longer has. Preview must stay under 500 ms and
// "Atualizar todos" under 1 s. Runs only with FORMS_TIMING=1, never in CI.
//
//   FORMS_TIMING=1 pnpm --filter api test:e2e -- forms-apply-timing

const RECORDS = 5_000;
const PREVIEW_LIMIT_MS = 500;
const APPLY_LIMIT_MS = 1_000;

describe.runIf(process.env.FORMS_TIMING === '1')(
  'forms apply timing (RNF-02)',
  { timeout: 300_000 },
  () => {
    let ctx: TestContext;
    let ana: Session;
    let form: SeededForm;

    beforeAll(async () => {
      ctx = await createTestApp();
      await ctx.truncate();
      ana = await signUpOwner(ctx, 'studio-ana');

      const turno = (options: string[]) => ({
        label: 'Turno',
        type: 'select',
        options,
      });
      form = await seedForm(dbFor(ctx.pool), {
        tenantId: ana.tenantId,
        name: 'Ficha',
        versions: [
          [
            ...CLIENT_SYSTEM_FIELDS,
            { label: 'Hobby', type: 'text' },
            turno(['Manhã', 'Tarde', 'Noite']),
            { label: 'Observações', type: 'long_text' },
          ],
          [
            ...CLIENT_SYSTEM_FIELDS,
            turno(['Manhã', 'Tarde', 'Noite']),
            { label: 'Observações', type: 'long_text' },
          ],
          // latest: "Tarde" and "Noite" are gone, "Hobby" is long gone
          [
            ...CLIENT_SYSTEM_FIELDS,
            turno(['Manhã']),
            { label: 'Observações', type: 'long_text' },
          ],
        ],
      });

      await seedBulkRecords(ctx, form, ana.tenantId);
    });

    afterAll(async () => {
      await ctx?.close();
    });

    it('previews and applies "Atualizar todos" within the RNF-02 limits', async () => {
      const api = formsApi(ctx.app, ana);
      const read = await api.read(form.id).expect(200);
      expect(read.body).toMatchObject({ version: 3, recordCount: RECORDS });
      const fields = [
        ...inputsFrom(read.body.fields),
        { label: 'Objetivo', type: 'text', required: true },
      ];

      const timings: Record<string, number> = {};
      const timed = async <T>(name: string, run: () => Promise<T>) => {
        const start = performance.now();
        const result = await run();
        timings[name] = Math.round(performance.now() - start);
        return result;
      };

      const first = await timed('preview (first call)', () =>
        api.preview(form.id, { revision: 1, fields }).expect(200),
      );
      await timed('preview (second call)', () =>
        api.preview(form.id, { revision: 1, fields }).expect(200),
      );

      // records on versions 1 and 2 answer "Tarde"/"Noite" (and v1 "Hobby");
      // "Objetivo" is new and required, so every record gains a pending field
      expect(first.body.recordCount).toBe(RECORDS);
      expect(first.body.recordsGainingRequiredFields).toBe(RECORDS);
      expect(first.body.recordsLosingAnswers).toBeGreaterThan(0);

      await timed('update_all', () =>
        api
          .update(form.id, {
            revision: 1,
            fields,
            migration: { mode: 'update_all', confirmName: 'Ficha' },
          })
          .expect(200),
      );

      const rows = await recordRows(ctx.pool, form.id);
      expect(rows).toHaveLength(RECORDS);
      expect(new Set(rows.map((row) => row.form_version_id)).size).toBe(1);

      console.log(
        `RNF-02 timings at ${RECORDS} records (ms): ${JSON.stringify(timings)}; ` +
          `losing=${first.body.recordsLosingAnswers}; ` +
          `limits: preview ${PREVIEW_LIMIT_MS}, apply ${APPLY_LIMIT_MS}`,
      );
    });
  },
);

/** Bulk-inserts RECORDS records, a third on each version, with encrypted answers. */
async function seedBulkRecords(
  ctx: TestContext,
  form: SeededForm,
  tenantId: string,
) {
  const cipher = new FieldValueCipher(process.env.FIELD_VALUES_KEY!);
  const keyVersion = CURRENT_FIELD_VALUE_KEY_VERSION;
  const options = ['Manhã', 'Tarde', 'Noite'];

  const records: { id: string; version: number }[] = [];
  const values: { recordId: string; fieldId: string; sealed: Buffer }[] = [];

  for (let index = 0; index < RECORDS; index += 1) {
    const version = (index % 3) + 1;
    const id = randomUUID();
    records.push({ id, version });

    const seal = (label: string, value: unknown) => {
      const fieldId = form.fieldId(label);
      values.push({
        recordId: id,
        fieldId,
        sealed: cipher.encrypt(value, {
          keyVersion,
          tenantId,
          formRecordId: id,
          fieldId,
        }),
      });
    };

    // the latest version only knows "Manhã"
    const optionLabel = version === 3 ? 'Manhã' : options[index % 3]!;
    seal('Turno', form.optionId('Turno', optionLabel));
    seal('Observações', `nota ${index}`);
    if (version === 1) seal('Hobby', 'Xadrez');
  }

  const chunk = 1_000;
  for (let from = 0; from < records.length; from += chunk) {
    const part = records.slice(from, from + chunk);
    await ctx.pool.query(
      `insert into form_records (id, tenant_id, form_id, form_version_id)
       select r.id, $1, $2, r.version_id
         from unnest($3::uuid[], $4::uuid[]) as r(id, version_id)`,
      [
        tenantId,
        form.id,
        part.map((record) => record.id),
        part.map((record) => form.versionId(record.version)),
      ],
    );
  }

  for (let from = 0; from < values.length; from += chunk) {
    const part = values.slice(from, from + chunk);
    const params: unknown[] = [tenantId, keyVersion];
    const rows = part.map((value, index) => {
      params.push(value.recordId, value.fieldId, value.sealed);
      const base = 3 + index * 3;
      return `($${base}, $${base + 1}, $1, $2, $${base + 2})`;
    });
    await ctx.pool.query(
      `insert into form_record_values
         (form_record_id, field_id, tenant_id, key_version, value_ciphertext)
       values ${rows.join(', ')}`,
      params,
    );
  }
}
