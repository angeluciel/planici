import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import type { FormType } from '@planici/schemas';
import { DRIZZLE } from '@src/database/database.constants.js';
import type { Database } from '@src/database/database.module.js';
import {
  formFieldOptions,
  formFields,
  forms,
  formVersionFieldOptions,
  formVersionFields,
  formVersions,
  tenants,
} from '@src/database/schema/index.js';
import { TenantScope } from '@modules/tenants/infrastructure/persistence/tenant-scope.js';
import { FormNameTakenError } from '../../domain/errors/form.errors.js';
import type {
  FormRepository,
  FormSummaryRow,
  StoredForm,
  StoredFormField,
  StoredFormOption,
  TransactionHandle,
} from '../../ports/form-repository.js';
import {
  type Executor,
  fromHandle,
  toHandle,
  uniqueViolationOf,
} from './transaction.js';

const NAME_KEY_INDEX = 'idx_forms_tenant_name_key';

type FormRow = typeof forms.$inferSelect;

@Injectable()
export class DrizzleFormRepository implements FormRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly scope: TenantScope,
  ) {}

  async list(
    tenantId: string,
    filter: { type?: FormType; includeArchived: boolean },
  ): Promise<FormSummaryRow[]> {
    const conditions = [eq(forms.tenantId, tenantId)];
    if (filter.type) conditions.push(eq(forms.type, filter.type));
    if (!filter.includeArchived) conditions.push(eq(forms.status, 'active'));

    const fieldCount = sql<number>`(
      select count(*)::int
        from ${formVersionFields}
        join ${formVersions} on ${formVersions.id} = ${formVersionFields.versionId}
       where ${formVersions.formId} = ${forms.id}
         and ${formVersions.number} = ${forms.latestVersion}
    )`;

    const rows = await this.db
      .select({
        id: forms.id,
        type: forms.type,
        name: forms.name,
        nameKey: forms.nameKey,
        description: forms.description,
        status: forms.status,
        latestVersion: forms.latestVersion,
        updatedAt: forms.updatedAt,
        fieldCount,
      })
      .from(forms)
      .where(and(...conditions))
      .orderBy(asc(forms.type), asc(forms.nameKey), asc(forms.id));

    return rows;
  }

  async findById(tenantId: string, formId: string): Promise<StoredForm | null> {
    const [row] = await this.db
      .select()
      .from(forms)
      .where(and(eq(forms.id, formId), eq(forms.tenantId, tenantId)))
      .limit(1);

    return row ? this.withFields(this.db, row) : null;
  }

  async findVersionFields(
    tenantId: string,
    formId: string,
    version: number,
  ): Promise<StoredFormField[] | null> {
    return this.loadFields(this.db, tenantId, formId, version);
  }

  transaction<T>(
    tenantId: string,
    work: (tx: TransactionHandle) => Promise<T>,
  ): Promise<T> {
    return this.scope.run(tenantId, (tx) => work(toHandle(tx)));
  }

  async lockById(
    tx: TransactionHandle,
    tenantId: string,
    formId: string,
  ): Promise<StoredForm | null> {
    const executor = fromHandle(tx);
    const [row] = await executor
      .select()
      .from(forms)
      .where(and(eq(forms.id, formId), eq(forms.tenantId, tenantId)))
      .for('update')
      .limit(1);

    return row ? this.withFields(executor, row) : null;
  }

  async countForTenantLocked(
    tx: TransactionHandle,
    tenantId: string,
  ): Promise<number> {
    const executor = fromHandle(tx);
    await executor
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .for('update');

    const [row] = await executor
      .select({ total: sql<number>`count(*)::int` })
      .from(forms)
      .where(eq(forms.tenantId, tenantId));

    return row?.total ?? 0;
  }

  async insert(tx: TransactionHandle, form: StoredForm): Promise<void> {
    try {
      await fromHandle(tx).insert(forms).values({
        id: form.id,
        tenantId: form.tenantId,
        type: form.type,
        name: form.name,
        nameKey: form.nameKey,
        description: form.description,
        status: form.status,
        latestVersion: form.latestVersion,
        revision: form.revision,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
      });
    } catch (error) {
      throw this.translate(error);
    }
  }

  async updateRow(
    tx: TransactionHandle,
    form: Omit<StoredForm, 'fields'>,
  ): Promise<void> {
    try {
      await fromHandle(tx)
        .update(forms)
        .set({
          name: form.name,
          nameKey: form.nameKey,
          description: form.description,
          status: form.status,
          revision: form.revision,
          updatedAt: form.updatedAt,
        })
        .where(and(eq(forms.id, form.id), eq(forms.tenantId, form.tenantId)));
    } catch (error) {
      throw this.translate(error);
    }
  }

  async publishVersion(
    tx: TransactionHandle,
    form: StoredForm,
    version: number,
  ): Promise<void> {
    const executor = fromHandle(tx);
    const { tenantId } = form;

    await this.writeFieldMetadata(executor, form);

    const [existing] = await executor
      .select({ id: formVersions.id })
      .from(formVersions)
      .where(
        and(
          eq(formVersions.formId, form.id),
          eq(formVersions.tenantId, tenantId),
          eq(formVersions.number, version),
        ),
      )
      .limit(1);
    // a published version is immutable (R15): only its metadata is rewritten
    if (existing) return;

    const versionId = randomUUID();
    await executor
      .update(forms)
      .set({ latestVersion: version })
      .where(and(eq(forms.id, form.id), eq(forms.tenantId, tenantId)));
    await executor.insert(formVersions).values({
      id: versionId,
      tenantId,
      formId: form.id,
      number: version,
    });

    if (form.fields.length > 0) {
      await executor.insert(formVersionFields).values(
        form.fields.map((field, position) => ({
          versionId,
          fieldId: field.id,
          tenantId,
          position,
          required: field.required,
        })),
      );
    }

    const optionRows = form.fields.flatMap((field) =>
      (field.options ?? []).map((option, position) => ({
        versionId,
        optionId: option.id,
        fieldId: field.id,
        tenantId,
        position,
      })),
    );
    if (optionRows.length > 0)
      await executor.insert(formVersionFieldOptions).values(optionRows);
  }

  async deleteForm(
    tx: TransactionHandle,
    tenantId: string,
    formId: string,
  ): Promise<void> {
    await fromHandle(tx)
      .delete(forms)
      .where(and(eq(forms.id, formId), eq(forms.tenantId, tenantId)));
  }

  /** Field and option rows: new ones inserted, known ones get the current metadata. */
  private async writeFieldMetadata(
    executor: Executor,
    form: StoredForm,
  ): Promise<void> {
    const { tenantId } = form;
    if (form.fields.length === 0) return;

    await executor
      .insert(formFields)
      .values(
        form.fields.map((field) => ({
          id: field.id,
          tenantId,
          formId: form.id,
          type: field.type,
          systemKey: field.systemKey,
          label: field.label,
          helpText: field.helpText,
          sensitive: field.sensitive,
        })),
      )
      .onConflictDoUpdate({
        target: formFields.id,
        set: {
          label: sql`excluded.label`,
          helpText: sql`excluded.help_text`,
          sensitive: sql`excluded.sensitive`,
          updatedAt: sql`now()`,
        },
        setWhere: and(
          eq(formFields.tenantId, tenantId),
          eq(formFields.formId, form.id),
        ),
      });

    const options = form.fields.flatMap((field) =>
      (field.options ?? []).map((option) => ({
        id: option.id,
        tenantId,
        fieldId: field.id,
        label: option.label,
      })),
    );
    if (options.length === 0) return;

    await executor
      .insert(formFieldOptions)
      .values(options)
      .onConflictDoUpdate({
        target: formFieldOptions.id,
        set: { label: sql`excluded.label` },
        setWhere: eq(formFieldOptions.tenantId, tenantId),
      });
  }

  private async withFields(
    executor: Executor,
    row: FormRow,
  ): Promise<StoredForm> {
    const fields =
      (await this.loadFields(
        executor,
        row.tenantId,
        row.id,
        row.latestVersion,
      )) ?? [];

    return { ...row, fields };
  }

  /** Fields of one version in display order, with current metadata; null if it does not exist. */
  private async loadFields(
    executor: Executor,
    tenantId: string,
    formId: string,
    version: number,
  ): Promise<StoredFormField[] | null> {
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
        position: formVersionFields.position,
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

    const optionsByField = new Map<string, StoredFormOption[]>();
    for (const option of optionRows) {
      const list = optionsByField.get(option.fieldId) ?? [];
      list.push({ id: option.id, label: option.label });
      optionsByField.set(option.fieldId, list);
    }

    return rows.map((row) => ({
      ...row,
      systemKey: row.systemKey as StoredFormField['systemKey'],
      options:
        row.type === 'select' ? (optionsByField.get(row.id) ?? []) : null,
    }));
  }

  private translate(error: unknown): unknown {
    return uniqueViolationOf(error) === NAME_KEY_INDEX
      ? new FormNameTakenError()
      : error;
  }
}
