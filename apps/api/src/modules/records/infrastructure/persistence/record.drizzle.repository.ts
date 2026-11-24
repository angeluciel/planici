import { Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import {
  formRecords,
  formRecordValues,
  forms,
  formVersions,
} from '@src/database/schema/index.js';
import type { TenantTransaction } from '@modules/tenants/infrastructure/persistence/tenant-scope.js';
import type { RecordExecutor } from '../../ports/record-form.reader.js';
import type {
  NewStoredValue,
  RecordRepository,
  StoredRecord,
  StoredValue,
} from '../../ports/record.repository.js';

@Injectable()
export class DrizzleRecordRepository implements RecordRepository {
  async lockForUpdate(
    tx: TenantTransaction,
    tenantId: string,
    recordId: string,
  ): Promise<StoredRecord | null> {
    const [locked] = await tx
      .select({ id: formRecords.id })
      .from(formRecords)
      .where(
        and(eq(formRecords.id, recordId), eq(formRecords.tenantId, tenantId)),
      )
      .for('update')
      .limit(1);
    if (!locked) return null;

    return this.find(tx, tenantId, recordId);
  }

  async find(
    executor: RecordExecutor,
    tenantId: string,
    recordId: string,
  ): Promise<StoredRecord | null> {
    const [row] = await executor
      .select({
        id: formRecords.id,
        formId: formRecords.formId,
        formVersionId: formRecords.formVersionId,
        versionNumber: formVersions.number,
        revision: formRecords.revision,
        createdAt: formRecords.createdAt,
        updatedAt: formRecords.updatedAt,
        formType: forms.type,
        formName: forms.name,
        formStatus: forms.status,
        formLatestVersion: forms.latestVersion,
      })
      .from(formRecords)
      .innerJoin(forms, eq(forms.id, formRecords.formId))
      .innerJoin(formVersions, eq(formVersions.id, formRecords.formVersionId))
      .where(
        and(eq(formRecords.id, recordId), eq(formRecords.tenantId, tenantId)),
      )
      .limit(1);

    return row ?? null;
  }

  async insert(
    tx: TenantTransaction,
    record: {
      id: string;
      tenantId: string;
      formId: string;
      formVersionId: string;
    },
  ): Promise<void> {
    await tx.insert(formRecords).values({
      id: record.id,
      tenantId: record.tenantId,
      formId: record.formId,
      formVersionId: record.formVersionId,
      revision: 1,
    });
  }

  async listValues(
    executor: RecordExecutor,
    tenantId: string,
    recordId: string,
  ): Promise<StoredValue[]> {
    return executor
      .select({
        fieldId: formRecordValues.fieldId,
        keyVersion: formRecordValues.keyVersion,
        ciphertext: formRecordValues.valueCiphertext,
      })
      .from(formRecordValues)
      .where(
        and(
          eq(formRecordValues.formRecordId, recordId),
          eq(formRecordValues.tenantId, tenantId),
        ),
      );
  }

  async insertValues(
    tx: TenantTransaction,
    tenantId: string,
    recordId: string,
    values: NewStoredValue[],
  ): Promise<void> {
    if (values.length === 0) return;

    await tx.insert(formRecordValues).values(
      values.map((value) => ({
        formRecordId: recordId,
        fieldId: value.fieldId,
        tenantId,
        keyVersion: value.keyVersion,
        valueCiphertext: value.ciphertext,
      })),
    );
  }

  async deleteValues(
    tx: TenantTransaction,
    tenantId: string,
    recordId: string,
  ): Promise<void> {
    await tx
      .delete(formRecordValues)
      .where(
        and(
          eq(formRecordValues.formRecordId, recordId),
          eq(formRecordValues.tenantId, tenantId),
        ),
      );
  }

  async touch(
    tx: TenantTransaction,
    tenantId: string,
    recordId: string,
  ): Promise<void> {
    await tx
      .update(formRecords)
      .set({
        revision: sql`${formRecords.revision} + 1`,
        updatedAt: sql`now()`,
      })
      .where(
        and(eq(formRecords.id, recordId), eq(formRecords.tenantId, tenantId)),
      );
  }
}
