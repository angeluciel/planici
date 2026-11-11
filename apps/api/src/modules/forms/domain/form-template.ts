import { randomUUID } from 'node:crypto';
import type {
  Field,
  FormTemplate as FormTemplateDto,
  FormType,
} from '@planici/schemas';
import type { StoredForm, StoredFormField } from '../ports/form-repository.js';
import {
  FormRevisionConflictError,
  FormStatusUnchangedError,
} from './errors/form.errors.js';
import { FieldPolicy } from './field-policy.js';
import type { FormName } from './value-objects/form-name.vo.js';

/** What the response needs besides the stored template. */
export type FormTemplateStats = {
  recordCount: number;
  recordsOnOlderVersions: number;
  recordsWithHistory: number;
  /** Records with a value, per field id. */
  valueCounts: ReadonlyMap<string, number>;
};

/** Public projection of one stored field (SPEC-0002 section 7). */
export function toPublicField(
  field: StoredFormField,
  valueCounts: ReadonlyMap<string, number>,
): Field {
  const locks = FieldPolicy.locks(field);

  return {
    id: field.id,
    label: field.label,
    type: field.type,
    required: field.required,
    sensitive: field.sensitive,
    sensitiveLock: locks.sensitiveLock,
    requiredLock: locks.requiredLock,
    helpText: field.helpText,
    options: field.options
      ? field.options.map(({ id, label }) => ({ id, label }))
      : null,
    systemKey: field.systemKey,
    valueCount: valueCounts.get(field.id) ?? 0,
  };
}

/** A form template with the fields of its latest version. */
export class FormTemplate {
  private constructor(private props: StoredForm) {}

  static fromStored(stored: StoredForm): FormTemplate {
    return new FormTemplate(structuredClone(stored));
  }

  /** Version 1 at revision 1 (R13). */
  static create(input: {
    tenantId: string;
    type: FormType;
    name: FormName;
    description: string | null;
    fields: StoredFormField[];
  }): FormTemplate {
    const now = new Date();

    return new FormTemplate({
      id: randomUUID(),
      tenantId: input.tenantId,
      type: input.type,
      name: input.name.value,
      nameKey: input.name.key,
      description: input.description,
      status: 'active',
      latestVersion: 1,
      revision: 1,
      createdAt: now,
      updatedAt: now,
      fields: input.fields,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get type(): FormType {
    return this.props.type;
  }

  get name(): string {
    return this.props.name;
  }

  get latestVersion(): number {
    return this.props.latestVersion;
  }

  get revision(): number {
    return this.props.revision;
  }

  get fields(): readonly StoredFormField[] {
    return this.props.fields;
  }

  /** R11: a save based on an outdated revision is rejected. */
  assertRevision(revision: number): void {
    if (revision !== this.props.revision) throw new FormRevisionConflictError();
  }

  rename(name: FormName): void {
    this.props.name = name.value;
    this.props.nameKey = name.key;
  }

  describe(description: string | null): void {
    this.props.description = description;
  }

  replaceFields(fields: StoredFormField[]): void {
    this.props.fields = fields;
  }

  /** Starts the next version; the caller stores its rows. */
  startNextVersion(): number {
    this.props.latestVersion += 1;
    return this.props.latestVersion;
  }

  archive(): void {
    if (this.props.status === 'archived') throw new FormStatusUnchangedError();
    this.props.status = 'archived';
  }

  unarchive(): void {
    if (this.props.status === 'active') throw new FormStatusUnchangedError();
    this.props.status = 'active';
  }

  /** The revision goes up on every stored change (R11). */
  markChanged(): void {
    this.props.revision += 1;
    this.props.updatedAt = new Date();
  }

  toStored(): StoredForm {
    return structuredClone(this.props);
  }

  toPublic(stats: FormTemplateStats): FormTemplateDto {
    return {
      id: this.props.id,
      type: this.props.type,
      name: this.props.name,
      description: this.props.description,
      status: this.props.status,
      version: this.props.latestVersion,
      revision: this.props.revision,
      recordCount: stats.recordCount,
      recordsOnOlderVersions: stats.recordsOnOlderVersions,
      recordsWithHistory: stats.recordsWithHistory,
      fields: this.props.fields.map((field) =>
        toPublicField(field, stats.valueCounts),
      ),
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
