import { Inject, Injectable } from '@nestjs/common';
import { type SQL, sql } from 'drizzle-orm';
import { DRIZZLE } from '@src/database/database.constants.js';
import type { Database } from '@src/database/database.module.js';
import {
  FIELD_VALUE_CIPHER,
  type FieldValueCipher,
} from '../../ports/field-value.cipher.js';
import type {
  FormRecordStore,
  NextVersionShape,
  RecordCounts,
} from '../../ports/form-record-store.js';
import type { TransactionHandle } from '../../ports/form-repository.js';
import { type Executor, fromHandle } from './transaction.js';

type LostAnswer = { recordId: string; fieldId: string };

/** A uuid[] parameter; `string_to_array('', ',')` is the empty array. */
const uuidArray = (ids: readonly string[]): SQL =>
  sql`string_to_array(${ids.join(',')}, ',')::uuid[]`;

/**
 * Counts and bulk writes over a template's records and values. Every statement
 * covers all of the template's records at once, on any version (plan, "All
 * records at once"); only removed `select` options need decrypting.
 */
@Injectable()
export class DrizzleFormRecordStore implements FormRecordStore {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    @Inject(FIELD_VALUE_CIPHER) private readonly cipher: FieldValueCipher,
  ) {}

  async counts(
    tenantId: string,
    formId: string,
    tx?: TransactionHandle,
  ): Promise<RecordCounts> {
    const rows = await this.rows<{ total: number; older: number }>(
      tx ? fromHandle(tx) : this.db,
      sql`select count(*)::int as total,
                 (count(*) filter (where r.form_version_id is distinct from v.id))::int as older
            from form_records r
            join forms f on f.id = r.form_id
            left join form_versions v
              on v.form_id = f.id and v.number = f.latest_version
           where r.tenant_id = ${tenantId} and r.form_id = ${formId}`,
    );

    return {
      recordCount: rows[0]?.total ?? 0,
      recordsOnOlderVersions: rows[0]?.older ?? 0,
    };
  }

  async recordCountsByForm(tenantId: string): Promise<Map<string, number>> {
    const rows = await this.rows<{ form_id: string; total: number }>(
      this.db,
      sql`select form_id, count(*)::int as total
            from form_records
           where tenant_id = ${tenantId}
           group by form_id`,
    );

    return new Map(rows.map((row) => [row.form_id, row.total]));
  }

  async valueCountsByField(
    tenantId: string,
    formId: string,
  ): Promise<Map<string, number>> {
    const rows = await this.rows<{ field_id: string; total: number }>(
      this.db,
      sql`select v.field_id, count(*)::int as total
            from form_record_values v
           where v.tenant_id = ${tenantId}
             and v.field_id in (select id from form_fields
                                 where form_id = ${formId} and tenant_id = ${tenantId})
           group by v.field_id`,
    );

    return new Map(rows.map((row) => [row.field_id, row.total]));
  }

  async countRecordsLosingAnswers(
    tenantId: string,
    formId: string,
    next: NextVersionShape,
    tx?: TransactionHandle,
  ): Promise<number> {
    const executor = tx ? fromHandle(tx) : this.db;
    const ids = new Set(
      await this.recordIdsWithAbsentFields(executor, tenantId, formId, next),
    );
    const lost = await this.lostOptionAnswers(executor, tenantId, formId, next);
    for (const answer of lost) ids.add(answer.recordId);

    return ids.size;
  }

  async findRecordIdsGainingRequiredFields(
    tenantId: string,
    formId: string,
    next: NextVersionShape,
  ): Promise<string[]> {
    const requiredIds = next.fields
      .filter((field) => field.required && !field.system)
      .map((field) => field.id);
    if (requiredIds.length === 0) return [];

    // no value yet, and the record's own version did not already require it
    const pending = await this.rows<{ id: string }>(
      this.db,
      sql`select distinct r.id
            from form_records r
           cross join unnest(${uuidArray(requiredIds)}) as f(id)
           where r.tenant_id = ${tenantId} and r.form_id = ${formId}
             and not exists (
                   select 1 from form_record_values v
                    where v.form_record_id = r.id and v.field_id = f.id)
             and not exists (
                   select 1 from form_version_fields vf
                    where vf.version_id = r.form_version_id
                      and vf.field_id = f.id and vf.required)`,
    );

    // a lost `select` answer leaves the field pending, whatever its own version said
    const ids = new Set(pending.map((row) => row.id));
    const required = new Set(requiredIds);
    const lost = await this.lostOptionAnswers(this.db, tenantId, formId, next);
    for (const answer of lost)
      if (required.has(answer.fieldId)) ids.add(answer.recordId);

    return [...ids];
  }

  async filterRecordIdsNotRequiring(
    tenantId: string,
    formId: string,
    fieldId: string,
    recordIds: string[],
  ): Promise<string[]> {
    if (recordIds.length === 0) return [];

    const rows = await this.rows<{ id: string }>(
      this.db,
      sql`select r.id
            from form_records r
           where r.tenant_id = ${tenantId} and r.form_id = ${formId}
             and r.id = any(${uuidArray(recordIds)})
             and not exists (
                   select 1 from form_version_fields vf
                    where vf.version_id = r.form_version_id
                      and vf.field_id = ${fieldId} and vf.required)`,
    );

    return rows.map((row) => row.id);
  }

  async repointAll(
    tx: TransactionHandle,
    tenantId: string,
    formId: string,
    version: number,
  ): Promise<void> {
    await fromHandle(tx).execute(
      sql`update form_records
             set form_version_id = (
                   select id from form_versions
                    where form_id = ${formId} and number = ${version}
                      and tenant_id = ${tenantId}),
                 revision = revision + 1,
                 updated_at = now()
           where tenant_id = ${tenantId} and form_id = ${formId}`,
    );
  }

  async deleteLostAnswers(
    tx: TransactionHandle,
    tenantId: string,
    formId: string,
    next: NextVersionShape,
  ): Promise<void> {
    const executor = fromHandle(tx);
    const keptIds = next.fields.map((field) => field.id);

    await executor.execute(
      sql`delete from form_record_values v
           where v.tenant_id = ${tenantId}
             and v.field_id in (select id from form_fields
                                 where form_id = ${formId} and tenant_id = ${tenantId})
             and v.field_id <> all(${uuidArray(keptIds)})`,
    );
    const lost = await this.lostOptionAnswers(executor, tenantId, formId, next);
    if (lost.length === 0) return;

    await executor.execute(
      sql`delete from form_record_values v
           using unnest(${uuidArray(lost.map((a) => a.recordId))},
                        ${uuidArray(lost.map((a) => a.fieldId))})
                 as p(record_id, field_id)
           where v.form_record_id = p.record_id and v.field_id = p.field_id
             and v.tenant_id = ${tenantId}`,
    );
  }

  async deleteAll(
    tx: TransactionHandle,
    tenantId: string,
    formId: string,
  ): Promise<number> {
    // the values go with their records (ON DELETE CASCADE)
    const rows = await this.rows<{ id: string }>(
      fromHandle(tx),
      sql`delete from form_records
           where tenant_id = ${tenantId} and form_id = ${formId}
           returning id`,
    );

    return rows.length;
  }

  /** Records holding a value for a field the next version does not keep. */
  private async recordIdsWithAbsentFields(
    executor: Executor,
    tenantId: string,
    formId: string,
    next: NextVersionShape,
  ): Promise<string[]> {
    const rows = await this.rows<{ id: string }>(
      executor,
      sql`select distinct v.form_record_id as id
            from form_record_values v
           where v.tenant_id = ${tenantId}
             and v.field_id in (select id from form_fields
                                 where form_id = ${formId} and tenant_id = ${tenantId})
             and v.field_id <> all(${uuidArray(next.fields.map((f) => f.id))})`,
    );

    return rows.map((row) => row.id);
  }

  /**
   * Answers to a kept `select` field that name an option the next version does
   * not keep. Independent of the record's current version, so it gives the same
   * answer before and after "Atualizar todos" repoints the records. Only fields
   * that ever had another option are read and decrypted.
   */
  private async lostOptionAnswers(
    executor: Executor,
    tenantId: string,
    formId: string,
    next: NextVersionShape,
  ): Promise<LostAnswer[]> {
    const selects = next.fields.filter(
      (field) => field.type === 'select' && field.optionIds,
    );
    if (selects.length === 0) return [];

    const keptOptions = new Map(
      selects.map((field) => [field.id, new Set(field.optionIds)]),
    );
    const allOptionIds = selects.flatMap((field) => field.optionIds ?? []);

    const rows = await this.rows<{
      form_record_id: string;
      field_id: string;
      key_version: number;
      value_ciphertext: Buffer;
    }>(
      executor,
      sql`select v.form_record_id, v.field_id, v.key_version, v.value_ciphertext
            from form_record_values v
            join form_records r on r.id = v.form_record_id
           where r.tenant_id = ${tenantId} and r.form_id = ${formId}
             and v.tenant_id = ${tenantId}
             and v.field_id = any(${uuidArray(selects.map((f) => f.id))})
             and exists (
               select 1 from form_field_options o
                where o.field_id = v.field_id
                  and o.id <> all(${uuidArray(allOptionIds)}))`,
    );

    const lost: LostAnswer[] = [];
    for (const row of rows) {
      const value = this.cipher.decrypt(row.value_ciphertext, {
        keyVersion: row.key_version,
        tenantId,
        formRecordId: row.form_record_id,
        fieldId: row.field_id,
      });
      if (
        typeof value !== 'string' ||
        !keptOptions.get(row.field_id)?.has(value)
      )
        lost.push({ recordId: row.form_record_id, fieldId: row.field_id });
    }

    return lost;
  }

  private async rows<T>(executor: Executor, query: SQL): Promise<T[]> {
    const result = await executor.execute(query);
    return result.rows as T[];
  }
}
