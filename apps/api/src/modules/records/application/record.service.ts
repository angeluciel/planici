import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { FormType, RecordBase } from '@planici/schemas';
import { DRIZZLE } from '@src/database/database.constants.js';
import type { Database } from '@src/database/database.module.js';
import type { TenantTransaction } from '@modules/tenants/infrastructure/persistence/tenant-scope.js';
import {
  CURRENT_FIELD_VALUE_KEY_VERSION,
  type FieldValueCipher,
  type FieldValueContext,
} from '@shared/crypto/field-value.cipher.js';
import {
  RecordFormArchivedError,
  RecordFormChangedError,
  RecordFormIdInvalidError,
  RecordFormTypeMismatchError,
  RecordNotFoundError,
  RecordRevisionConflictError,
  RecordValueUnreadableError,
} from '../domain/errors/record.errors.js';
import { checkRecordValues, missingRequired } from '../domain/record-check.js';
import type {
  RecordVersion,
  RecordVersionField,
} from '../domain/record-version.js';
import {
  RECORD_FORM_READER,
  type RecordExecutor,
  type RecordFormReader,
} from '../ports/record-form.reader.js';
import {
  RECORD_REPOSITORY,
  type RecordRepository,
} from '../ports/record.repository.js';
import { RECORD_VALUE_CIPHER } from '../ports/record-value.cipher.js';

type DraftDeps = {
  tx: TenantTransaction;
  tenantId: string;
  version: RecordVersion;
  records: RecordRepository;
  cipher: FieldValueCipher;
};

/** The two-phase part both drafts share: check the values, then write them. */
abstract class RecordDraft {
  constructor(protected readonly deps: DraftDeps) {}

  /** The version's system fields, for the caller's own checks (R6). */
  get systemFields(): RecordVersionField[] {
    return this.deps.version.fields.filter((field) => field.systemKey !== null);
  }

  /** Whether the version requires the system field, e.g. `client.phone`. */
  isRequired(systemKey: string): boolean {
    return this.deps.version.fields.some(
      (field) => field.systemKey === systemKey && field.required,
    );
  }

  /** Step 5 for the custom values (plan, Decision 3). Returns them normalised, without blanks. */
  checkValues(values: unknown): Record<string, unknown> {
    return checkRecordValues(this.deps.version, values);
  }

  protected sealed(recordId: string, values: Record<string, unknown>) {
    const { tenantId, cipher } = this.deps;
    return Object.entries(values)
      .filter(([, value]) => value !== undefined && value !== false)
      .map(([fieldId, value]) => {
        const context: FieldValueContext = {
          keyVersion: CURRENT_FIELD_VALUE_KEY_VERSION,
          tenantId,
          formRecordId: recordId,
          fieldId,
        };
        return {
          fieldId,
          keyVersion: context.keyVersion,
          ciphertext: cipher.encrypt(value, context),
        };
      });
  }
}

export class RecordCreateDraft extends RecordDraft {
  constructor(
    deps: DraftDeps,
    private readonly formId: string,
    private readonly formVersionId: string,
  ) {
    super(deps);
  }

  /** Inserts the record (revision 1) and its encrypted values. Returns the record id. */
  async insert(values: Record<string, unknown>): Promise<string> {
    const { tx, tenantId, records } = this.deps;
    const id = randomUUID();

    await records.insert(tx, {
      id,
      tenantId,
      formId: this.formId,
      formVersionId: this.formVersionId,
    });
    await records.insertValues(tx, tenantId, id, this.sealed(id, values));
    return id;
  }
}

export class RecordUpdateDraft extends RecordDraft {
  constructor(
    deps: DraftDeps,
    private readonly recordId: string,
  ) {
    super(deps);
  }

  /** Replaces the value set, raises `revision` by 1 and sets `updated_at` (R14, Decision 4). */
  async replace(values: Record<string, unknown>): Promise<void> {
    const { tx, tenantId, records } = this.deps;

    await records.deleteValues(tx, tenantId, this.recordId);
    await records.insertValues(
      tx,
      tenantId,
      this.recordId,
      this.sealed(this.recordId, values),
    );
    await records.touch(tx, tenantId, this.recordId);
  }
}

/**
 * The record checks of SPEC-0003 section 6 and the two record tables. It runs
 * inside the caller's transaction (SPEC-0004 and SPEC-0005 handlers), so it is
 * an application service and not a CQRS handler. No error it throws carries a
 * value (R10), and it logs nothing.
 */
@Injectable()
export class RecordService {
  constructor(
    @Inject(RECORD_FORM_READER) private readonly forms: RecordFormReader,
    @Inject(RECORD_REPOSITORY) private readonly records: RecordRepository,
    @Inject(RECORD_VALUE_CIPHER) private readonly cipher: FieldValueCipher,
    @Inject(DRIZZLE) private readonly db: Database,
  ) {}

  /** §6 steps 2 and 3 on create. */
  async openForCreate(
    tx: TenantTransaction,
    tenantId: string,
    type: FormType,
    input: { formId: string; formVersion: number },
  ): Promise<RecordCreateDraft> {
    const template = await this.forms.lockTemplateForShare(
      tx,
      tenantId,
      input.formId,
    );
    if (!template) throw new RecordFormIdInvalidError();
    if (template.type !== type) throw new RecordFormTypeMismatchError();
    if (template.status === 'archived') throw new RecordFormArchivedError();
    if (input.formVersion !== template.latestVersion) {
      throw new RecordFormChangedError();
    }

    const stored = await this.forms.findVersion(
      tx,
      tenantId,
      template.id,
      template.latestVersion,
    );
    if (!stored) throw new RecordFormIdInvalidError();

    return new RecordCreateDraft(
      {
        tx,
        tenantId,
        version: { number: stored.number, fields: stored.fields },
        records: this.records,
        cipher: this.cipher,
      },
      template.id,
      stored.id,
    );
  }

  /**
   * §6 steps 2 to 4 on update. An absent record, or one of another tenant or
   * type, throws `RecordNotFoundError`; the caller turns it into its own 404.
   */
  async openForUpdate(
    tx: TenantTransaction,
    tenantId: string,
    formRecordId: string,
    type: FormType,
    input: { formVersion: number; revision: number },
  ): Promise<RecordUpdateDraft> {
    const record = await this.records.lockForUpdate(tx, tenantId, formRecordId);
    if (!record || record.formType !== type) throw new RecordNotFoundError();

    if (input.formVersion !== record.versionNumber) {
      throw new RecordFormChangedError();
    }
    if (input.revision !== record.revision) {
      throw new RecordRevisionConflictError();
    }

    const stored = await this.forms.findVersion(
      tx,
      tenantId,
      record.formId,
      record.versionNumber,
    );
    if (!stored) throw new RecordNotFoundError();

    return new RecordUpdateDraft(
      {
        tx,
        tenantId,
        version: { number: stored.number, fields: stored.fields },
        records: this.records,
        cipher: this.cipher,
      },
      record.id,
    );
  }

  /**
   * The record as `RecordBaseSchema`, or `null` when it is absent or another
   * tenant's. With `tx` it runs in the caller's transaction (the record may not
   * be committed yet); without it, on the pool.
   */
  async read(
    tenantId: string,
    formRecordId: string,
    systemPresence: Record<string, boolean>,
    tx?: TenantTransaction,
  ): Promise<RecordBase | null> {
    const executor: RecordExecutor = tx ?? this.db;

    const record = await this.records.find(executor, tenantId, formRecordId);
    if (!record) return null;

    const stored = await this.forms.findVersion(
      executor,
      tenantId,
      record.formId,
      record.versionNumber,
    );
    if (!stored) return null;

    const rows = await this.records.listValues(
      executor,
      tenantId,
      formRecordId,
    );
    const customIds = new Set(
      stored.fields
        .filter((field) => field.systemKey === null)
        .map((field) => field.id),
    );
    const answers: Record<string, unknown> = {};
    for (const row of rows) {
      if (!customIds.has(row.fieldId)) continue;
      answers[row.fieldId] = this.decrypt(tenantId, formRecordId, row);
    }

    const version: RecordVersion = {
      number: stored.number,
      fields: stored.fields,
    };
    const values: Record<string, unknown> = {};
    for (const field of stored.fields) {
      if (field.systemKey !== null) continue;
      if (answers[field.id] !== undefined) values[field.id] = answers[field.id];
      else if (field.type === 'yes_no') values[field.id] = false;
    }

    return {
      form: {
        id: record.formId,
        name: record.formName,
        version: record.versionNumber,
        latestVersion: record.formLatestVersion,
        status: record.formStatus,
      },
      revision: record.revision,
      values: values as RecordBase['values'],
      missingRequired: missingRequired(version, answers, systemPresence),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  // The cipher's own errors are not passed on: a JSON.parse SyntaxError quotes
  // the plaintext, and Observe copies error messages (plan, Risks 7).
  private decrypt(
    tenantId: string,
    formRecordId: string,
    row: { fieldId: string; keyVersion: number; ciphertext: Buffer },
  ): unknown {
    try {
      return this.cipher.decrypt(row.ciphertext, {
        keyVersion: row.keyVersion,
        tenantId,
        formRecordId,
        fieldId: row.fieldId,
      });
    } catch {
      throw new RecordValueUnreadableError();
    }
  }
}
