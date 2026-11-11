import { randomUUID } from 'node:crypto';
import { HttpStatus } from '@nestjs/common';
import {
  type FieldInputData,
  type FormType,
  SYSTEM_KEY_FIELD_TYPES,
  SYSTEM_KEYS,
  type SystemKey,
} from '@planici/schemas';
import type {
  StoredFormField,
  StoredFormOption,
} from '../ports/form-repository.js';
import {
  FieldIdDuplicateError,
  FieldOptionIdUnknownError,
  FieldSystemKeyNotAllowedError,
  FieldTypeImmutableError,
  FieldUnknownError,
  SystemFieldLockedError,
  SystemFieldMissingError,
} from './errors/form.errors.js';

export type FieldPolicyContext = {
  formType: FormType;
  mode: 'create' | 'update';
  /** Fields of the latest version; none on create. */
  current: readonly StoredFormField[];
};

// `client.phone` is the only system field whose `required` the professional sets
const OPTIONAL_SYSTEM_KEYS: readonly string[] = ['client.phone'];

/**
 * Field rules SPEC-0001 needs (plan, "Boundary with SPEC-0002"): system-field
 * presence, the fixed `required` of system fields, `field.unknown` and the
 * interim locks. SPEC-0002 adds its rules here; handlers store and diff only
 * what `plan` returns, never the raw request list.
 */
export const FieldPolicy = {
  /**
   * Turns the request's field list into the fields of the next version, in
   * display order, with ids for new fields and normalised `required`,
   * `sensitive`, help text and options.
   */
  plan(
    context: FieldPolicyContext,
    inputs: readonly FieldInputData[],
  ): StoredFormField[] {
    const currentById = new Map(context.current.map((f) => [f.id, f]));
    const seenIds = new Set<string>();
    const seenSystemKeys = new Set<string>();
    const planned: StoredFormField[] = [];

    for (const [index, input] of inputs.entries()) {
      const existing = existingField(currentById, seenIds, input, index);
      const systemKey = existing
        ? existing.systemKey
        : systemKeyOf(context, seenSystemKeys, input, index);

      if (existing) seenIds.add(existing.id);
      if (systemKey) seenSystemKeys.add(systemKey);

      planned.push({
        id: existing?.id ?? randomUUID(),
        type: input.type,
        systemKey,
        label: input.label,
        helpText:
          input.helpText === undefined
            ? (existing?.helpText ?? null)
            : (input.helpText ?? null),
        sensitive: systemKey
          ? false
          : (input.sensitive ?? existing?.sensitive ?? false),
        required: requiredOf(input, existing, systemKey),
        position: index,
        options: optionsOf(input, existing, index),
      });
    }

    const required = SYSTEM_KEYS[context.formType] as readonly string[];
    const present = new Set<string | null>(planned.map((f) => f.systemKey));
    if (required.some((key) => !present.has(key)))
      throw new SystemFieldMissingError();

    return planned;
  },

  /** Interim locks, until SPEC-0002 replaces them with the full rules. */
  locks(field: Pick<StoredFormField, 'systemKey'>): {
    requiredLock: boolean;
    sensitiveLock: null;
  } {
    return {
      requiredLock:
        field.systemKey !== null &&
        !OPTIONAL_SYSTEM_KEYS.includes(field.systemKey),
      sensitiveLock: null,
    };
  },
};

function existingField(
  currentById: Map<string, StoredFormField>,
  seenIds: Set<string>,
  input: FieldInputData,
  index: number,
): StoredFormField | null {
  if (input.id === undefined) return null;

  // on create the latest version has no fields, so any id is unknown
  const existing = currentById.get(input.id);
  if (!existing) throw new FieldUnknownError(index);
  if (seenIds.has(existing.id)) throw new FieldIdDuplicateError(index);

  if (input.systemKey !== undefined)
    throw new FieldSystemKeyNotAllowedError(index);

  if (existing.type !== input.type) {
    if (existing.systemKey)
      throw new SystemFieldLockedError(index, HttpStatus.BAD_REQUEST);
    throw new FieldTypeImmutableError(index);
  }

  return existing;
}

function systemKeyOf(
  context: FieldPolicyContext,
  seen: Set<string>,
  input: FieldInputData,
  index: number,
): SystemKey | null {
  if (input.systemKey === undefined) return null;

  // a system key outside the template's type, repeated, or with another type
  const keys = SYSTEM_KEYS[context.formType] as readonly string[];
  const valid =
    context.mode === 'create' &&
    keys.includes(input.systemKey) &&
    !seen.has(input.systemKey) &&
    SYSTEM_KEY_FIELD_TYPES[input.systemKey as SystemKey] === input.type;

  if (!valid)
    throw context.mode === 'create'
      ? new SystemFieldLockedError(index, HttpStatus.UNPROCESSABLE_ENTITY)
      : new FieldSystemKeyNotAllowedError(index);

  return input.systemKey as SystemKey;
}

function requiredOf(
  input: FieldInputData,
  existing: StoredFormField | null,
  systemKey: SystemKey | null,
): boolean {
  if (systemKey === null) return input.required ?? existing?.required ?? false;

  // fixed on every system field except the one the professional chooses
  return OPTIONAL_SYSTEM_KEYS.includes(systemKey)
    ? (input.required ?? false)
    : true;
}

function optionsOf(
  input: FieldInputData,
  existing: StoredFormField | null,
  index: number,
): StoredFormOption[] | null {
  if (input.type !== 'select') return null;
  if (!input.options) return existing?.options ?? [];

  const known = new Map((existing?.options ?? []).map((o) => [o.id, o]));

  return input.options.map((option, optionIndex) => {
    if (option.id === undefined)
      return { id: randomUUID(), label: option.label };
    if (!known.has(option.id))
      throw new FieldOptionIdUnknownError(index, optionIndex);

    return { id: option.id, label: option.label };
  });
}
