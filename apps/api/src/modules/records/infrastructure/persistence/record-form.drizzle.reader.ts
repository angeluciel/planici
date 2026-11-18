import { Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import {
  formFieldOptions,
  formFields,
  forms,
  formVersionFieldOptions,
  formVersionFields,
  formVersions,
} from '@src/database/schema/index.js';
import type { TenantTransaction } from '@modules/tenants/infrastructure/persistence/tenant-scope.js';
import type { RecordVersionField } from '../../domain/record-version.js';
import type {
  RecordExecutor,
  RecordFormReader,
  RecordTemplateHead,
  StoredRecordVersion,
} from '../../ports/record-form.reader.js';

@Injectable()
export class DrizzleRecordFormReader implements RecordFormReader {
  // no pool handle on purpose: every method runs on the executor its caller
  // passes (plan, "One connection per call")
  async lockTemplateForShare(
    tx: TenantTransaction,
    tenantId: string,
    formId: string,
  ): Promise<RecordTemplateHead | null> {
    const [row] = await tx
      .select({
        id: forms.id,
        type: forms.type,
        name: forms.name,
        status: forms.status,
        latestVersion: forms.latestVersion,
      })
      .from(forms)
      .where(and(eq(forms.id, formId), eq(forms.tenantId, tenantId)))
      .for('share')
      .limit(1);

    return row ?? null;
  }

  async findVersion(
    executor: RecordExecutor,
    tenantId: string,
    formId: string,
    version: number,
  ): Promise<StoredRecordVersion | null> {
    const [versionRow] = await executor
      .select({ id: formVersions.id })
      .from(formVersions)
      .where(
        and(
          eq(formVersions.formId, formId),
          eq(formVersions.tenantId, tenantId),
          eq(formVersions.number, version),
        ),
      )
      .limit(1);
    if (!versionRow) return null;

    const rows = await executor
      .select({
        id: formFields.id,
        type: formFields.type,
        systemKey: formFields.systemKey,
        label: formFields.label,
        helpText: formFields.helpText,
        sensitive: formFields.sensitive,
        required: formVersionFields.required,
      })
      .from(formVersionFields)
      .innerJoin(formFields, eq(formFields.id, formVersionFields.fieldId))
      .where(
        and(
          eq(formVersionFields.versionId, versionRow.id),
          eq(formVersionFields.tenantId, tenantId),
        ),
      )
      .orderBy(asc(formVersionFields.position));

    const optionRows = await executor
      .select({
        fieldId: formVersionFieldOptions.fieldId,
        id: formFieldOptions.id,
        label: formFieldOptions.label,
      })
      .from(formVersionFieldOptions)
      .innerJoin(
        formFieldOptions,
        eq(formFieldOptions.id, formVersionFieldOptions.optionId),
      )
      .where(
        and(
          eq(formVersionFieldOptions.versionId, versionRow.id),
          eq(formVersionFieldOptions.tenantId, tenantId),
        ),
      )
      .orderBy(
        asc(formVersionFieldOptions.fieldId),
        asc(formVersionFieldOptions.position),
      );

    const optionsByField = new Map<string, { id: string; label: string }[]>();
    for (const option of optionRows) {
      const list = optionsByField.get(option.fieldId) ?? [];
      list.push({ id: option.id, label: option.label });
      optionsByField.set(option.fieldId, list);
    }

    const fields: RecordVersionField[] = rows.map((row) => ({
      id: row.id,
      label: row.label,
      type: row.type,
      required: row.required,
      sensitive: row.sensitive,
      // the lock fields describe the template editor, not the fill-in page
      sensitiveLock: null,
      requiredLock: false,
      helpText: row.helpText,
      options:
        row.type === 'select' ? (optionsByField.get(row.id) ?? []) : null,
      systemKey: row.systemKey,
    }));

    return { id: versionRow.id, number: version, fields };
  }
}
