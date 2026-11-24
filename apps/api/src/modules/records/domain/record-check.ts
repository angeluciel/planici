import {
  RECORD_ERROR_CODES,
  customValueSchema,
  isBlankValue,
} from '@planici/schemas';
import { ValidationError } from '@shared/http/zod-validation.pipe.js';
import { RecordValueUnknownFieldError } from './errors/record.errors.js';
import type { RecordVersion } from './record-version.js';

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
  if (typeof values !== 'object' || values === null || Array.isArray(values)) {
    throw new ValidationError('values.invalid', 'values');
  }
  const input = values as Record<string, unknown>;
  const byId = new Map(version.fields.map((field) => [field.id, field]));

  // pass 1: keys
  for (const key of Object.keys(input)) {
    const field = byId.get(key);
    if (!field) throw new RecordValueUnknownFieldError(key);
    if (field.systemKey !== null) {
      throw new ValidationError('value.unknown-field', `values.${key}`);
    }
  }

  const custom = version.fields.filter((field) => field.systemKey === null);

  // pass 2: required (a yes_no is never required, SPEC-0002 R8)
  for (const field of custom) {
    if (
      field.required &&
      field.type !== 'yes_no' &&
      isBlankValue(input[field.id])
    ) {
      throw new ValidationError('value.required', `values.${field.id}`);
    }
  }

  // pass 3: type rules
  const out: Record<string, unknown> = {};
  for (const field of custom) {
    const value = input[field.id];
    if (isBlankValue(value)) continue;

    const parsed = customValueSchema(field).safeParse(value);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const code =
        issue && KNOWN_CODES.has(issue.message)
          ? issue.message
          : 'value.invalid';
      throw new ValidationError(
        code,
        ['values', field.id, ...(issue?.path ?? [])].join('.'),
      );
    }
    if (field.type === 'yes_no' && parsed.data === false) continue;
    out[field.id] = parsed.data;
  }

  return out;
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
