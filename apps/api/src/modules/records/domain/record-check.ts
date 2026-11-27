import {
  RECORD_ERROR_CODES,
  customValueSchema,
  isBlankValue,
} from '@planici/schemas';
import { ValidationError } from '@shared/http/zod-validation.pipe.js';
import { RecordValueUnknownFieldError } from './errors/record.errors.js';
import type { RecordVersion, RecordVersionField } from './record-version.js';

const KNOWN_CODES: ReadonlySet<string> = new Set([
  ...RECORD_ERROR_CODES,
  'email.invalid',
]);

/**
 * Step 5 of SPEC-0003 section 6 for the custom values, in three passes
 * (plan, Decision 3): every key in request order, then the required fields in
 * version order, then the type rules in version order. Returns the normalised
 * values without blanks (R3); a `yes_no` that is false has no value (Decision
 * 6). Throws the first failure.
 */
export function checkRecordValues(
  version: RecordVersion,
  values: unknown,
): Record<string, unknown> {
  const input = valuesObject(values);
  checkKeys(version, input);

  const custom = version.fields.filter((field) => field.systemKey === null);
  checkRequired(custom, input);
  return checkTypes(custom, input);
}

/** The values envelope: a plain object, or `values.invalid`. */
function valuesObject(values: unknown): Record<string, unknown> {
  if (typeof values !== 'object' || values === null || Array.isArray(values)) {
    throw new ValidationError('values.invalid', 'values');
  }
  return values as Record<string, unknown>;
}

/** Pass 1: every key, in request order, is a custom field of the version. */
function checkKeys(
  version: RecordVersion,
  input: Record<string, unknown>,
): void {
  const byId = new Map(version.fields.map((field) => [field.id, field]));
  for (const key of Object.keys(input)) {
    const field = byId.get(key);
    if (!field) throw new RecordValueUnknownFieldError(key);
    if (field.systemKey !== null) {
      throw new ValidationError('value.unknown-field', `values.${key}`);
    }
  }
}

/**
 * Pass 2: the required fields in version order (a yes_no is never required,
 * SPEC-0002 R8).
 */
function checkRequired(
  custom: readonly RecordVersionField[],
  input: Record<string, unknown>,
): void {
  for (const field of custom) {
    if (
      field.required &&
      field.type !== 'yes_no' &&
      isBlankValue(input[field.id])
    ) {
      throw new ValidationError('value.required', `values.${field.id}`);
    }
  }
}

/**
 * Pass 3: the type rules in version order. Returns the normalised values,
 * leaving out blanks and a `yes_no` that is false.
 */
function checkTypes(
  custom: readonly RecordVersionField[],
  input: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of custom) {
    const value = input[field.id];
    if (isBlankValue(value)) continue;

    const parsed = customValueSchema(field).safeParse(value);
    if (!parsed.success) throw issueError(field.id, parsed.error.issues[0]);
    if (field.type === 'yes_no' && parsed.data === false) continue;
    out[field.id] = parsed.data;
  }

  return out;
}

/**
 * The failure of a value from its first issue: the issue's error key, or
 * `value.invalid` when it has none, at `values.<fieldId>` plus the issue path.
 */
function issueError(
  fieldId: string,
  issue: { message: string; path: readonly PropertyKey[] } | undefined,
): ValidationError {
  const code =
    issue && KNOWN_CODES.has(issue.message) ? issue.message : 'value.invalid';
  return new ValidationError(
    code,
    ['values', fieldId, ...(issue?.path ?? [])].join('.'),
  );
}

/**
 * Ids of the required fields of the version without a value, in version order
 * (R6). A custom field has none when it has no stored value; a system field
 * when `systemPresence[systemKey]` is false. A `yes_no` is never listed.
 */
export function missingRequired(
  version: RecordVersion,
  storedValues: Record<string, unknown>,
  systemPresence: Record<string, boolean>,
): string[] {
  return version.fields
    .filter((field) => {
      if (!field.required || field.type === 'yes_no') return false;
      if (field.systemKey !== null) {
        return systemPresence[field.systemKey] === false;
      }
      return storedValues[field.id] === undefined;
    })
    .map((field) => field.id);
}
