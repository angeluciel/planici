import type {
  FieldType,
  FormStatus,
  FormType,
  SystemKey,
} from '@planici/schemas';

export const FORM_REPOSITORY = Symbol('FORM_REPOSITORY');

/** Opaque handle of an open transaction, created by the persistence adapter. */
export type TransactionHandle = { readonly __transaction: unique symbol };

export type StoredFormOption = { id: string; label: string };

/** A field as stored in a version, with the metadata shared by every version. */
export type StoredFormField = {
  id: string;
  type: FieldType;
  systemKey: SystemKey | null;
  label: string;
  helpText: string | null;
  sensitive: boolean;
  required: boolean;
  position: number;
  options: StoredFormOption[] | null;
};

export type StoredForm = {
  id: string;
  tenantId: string;
  type: FormType;
  name: string;
  nameKey: string;
  description: string | null;
  status: FormStatus;
  latestVersion: number;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
  /** Fields of the latest version, in display order. */
  fields: StoredFormField[];
};

export type FormSummaryRow = Pick<
  StoredForm,
  | 'id'
  | 'type'
  | 'name'
  | 'nameKey'
  | 'description'
  | 'status'
  | 'latestVersion'
  | 'updatedAt'
> & { fieldCount: number };

export interface FormRepository {
  /** Sorted by type, then `name_key`, then id. */
  list(
    tenantId: string,
    filter: { type?: FormType; includeArchived: boolean },
  ): Promise<FormSummaryRow[]>;

  findById(tenantId: string, formId: string): Promise<StoredForm | null>;

  /** Fields of one published version, in display order, with current metadata. */
  findVersionFields(
    tenantId: string,
    formId: string,
    version: number,
  ): Promise<StoredFormField[] | null>;

  /** Runs `work` in one tenant-scoped transaction (all-or-nothing, R10). */
  transaction<T>(
    tenantId: string,
    work: (tx: TransactionHandle) => Promise<T>,
  ): Promise<T>;

  /** Locks the template row (`FOR UPDATE`) and reads it. */
  lockById(
    tx: TransactionHandle,
    tenantId: string,
    formId: string,
  ): Promise<StoredForm | null>;

  /** Locks the tenant row and counts its templates (R19). */
  countForTenantLocked(
    tx: TransactionHandle,
    tenantId: string,
  ): Promise<number>;

  /** Throws the name-taken error on a `name_key` unique violation. */
  insert(tx: TransactionHandle, form: StoredForm): Promise<void>;

  /** Metadata, status and revision of the template row. */
  updateRow(
    tx: TransactionHandle,
    form: Omit<StoredForm, 'fields'>,
  ): Promise<void>;

  /** Writes field and option metadata, plus the rows of a newly published version. */
  publishVersion(
    tx: TransactionHandle,
    form: StoredForm,
    version: number,
  ): Promise<void>;

  deleteForm(
    tx: TransactionHandle,
    tenantId: string,
    formId: string,
  ): Promise<void>;
}
