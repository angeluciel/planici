import type { TransactionHandle } from './form-repository.js';

export const FORM_RECORD_STORE = Symbol('FORM_RECORD_STORE');

export type RecordCounts = {
  recordCount: number;
  recordsOnOlderVersions: number;
};

/** Counts and bulk writes over a template's records and values. */
export interface FormRecordStore {
  counts(
    tenantId: string,
    formId: string,
    tx?: TransactionHandle,
  ): Promise<RecordCounts>;

  /** Record count per template of the tenant (templates without records are absent). */
  recordCountsByForm(tenantId: string): Promise<Map<string, number>>;

  /** Records with a value, per field id (a `yes_no` has rows only for `true`). */
  valueCountsByField(
    tenantId: string,
    formId: string,
  ): Promise<Map<string, number>>;

  /** Distinct records, on any version, holding at least one lost answer. */
  countRecordsLosingAnswers(
    tenantId: string,
    formId: string,
    next: NextVersionShape,
    tx?: TransactionHandle,
  ): Promise<number>;

  /** Ids of records that would newly be pending on a custom required field. */
  findRecordIdsGainingRequiredFields(
    tenantId: string,
    formId: string,
    next: NextVersionShape,
  ): Promise<string[]>;

  /**
   * Of `recordIds`, those whose own version does not require `fieldId` (absent
   * or optional there): the records a newly required field would leave pending.
   */
  filterRecordIdsNotRequiring(
    tenantId: string,
    formId: string,
    fieldId: string,
    recordIds: string[],
  ): Promise<string[]>;

  /** Repoints every record to version `version` and raises its revision, in one statement. */
  repointAll(
    tx: TransactionHandle,
    tenantId: string,
    formId: string,
    version: number,
  ): Promise<void>;

  /** Deletes the lost answers of every record, on any version. */
  deleteLostAnswers(
    tx: TransactionHandle,
    tenantId: string,
    formId: string,
    next: NextVersionShape,
  ): Promise<void>;

  /** Deletes the template's record values and records. Returns the records deleted. */
  deleteAll(
    tx: TransactionHandle,
    tenantId: string,
    formId: string,
  ): Promise<number>;
}

/** What the next version keeps, used to decide which answers are lost. */
export type NextVersionShape = {
  fields: {
    id: string;
    type: string;
    required: boolean;
    /** System fields keep no rows in `form_record_values`. */
    system: boolean;
    optionIds: string[] | null;
  }[];
};
