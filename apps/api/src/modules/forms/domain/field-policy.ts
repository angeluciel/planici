import { randomUUID } from 'node:crypto';
import { HttpStatus } from '@nestjs/common';
import {
  type FieldInputData,
  type FormType,
  protectionLock,
  type ProtectionLock,
  SYSTEM_KEY_FIELD_TYPES,
  SYSTEM_KEYS,
  type SystemKey,
  textKey,
} from '@planici/schemas';
import type {
  StoredFormField,
  StoredFormOption,
} from '../ports/form-repository.js';
import {
  FieldIdDuplicateError,
  FieldLabelDuplicateError,
  FieldOptionIdDuplicateError,
  FieldOptionIdUnknownError,
  FieldOptionLabelDuplicateError,
  FieldOptionsMaxError,
  FieldOptionsNotAllowedError,
  FieldOptionsRequiredError,
  FieldRequiredLockedError,
  FieldSensitiveLockedError,
  FieldSensitiveNotAllowedError,
  FieldSystemKeyNotAllowedError,
  FieldTypeImmutableError,
  FieldTypeInvalidError,
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
const SYSTEM_ONLY_TYPES: readonly string[] = ['duration', 'money'];
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 50;

/**
 * Field rules of SPEC-0001 and SPEC-0002 (section 11, "Check order"). Handlers
 * store and diff only what `plan` returns, never the raw request list.
 */
export const FieldPolicy = {
  /**
   * Walks `inputs` in array order and throws the first failing rule. Returns
   * the fields of the next version, in display order, with ids for new fields
   * and normalised `required`, `sensitive`, help text and options.
   */
  plan(
    context: FieldPolicyContext,
    inputs: readonly FieldInputData[],
  ): StoredFormField[] {
    const currentById = new Map(context.current.map((f) => [f.id, f]));
    const seenIds = new Set<string>();
    const seenSystemKeys = new Set<string>();
    const seenLabels = new Set<string>();
    const planned: StoredFormField[] = [];

    for (const [index, input] of inputs.entries()) {
      const existing = existingField(
        context,
        currentById,
        seenIds,
        input,
        index,
      );
      const systemKey = existing
        ? existing.systemKey
        : systemKeyOf(context, seenSystemKeys, input, index);

      if (existing) seenIds.add(existing.id);
      if (systemKey) seenSystemKeys.add(systemKey);

      checkType(input, existing, systemKey, index);

      const label = textKey(input.label);
      if (seenLabels.has(label)) throw new FieldLabelDuplicateError(index);
      seenLabels.add(label);

      checkRequired(input, systemKey, index);
      const sensitive = sensitiveOf(input, existing, systemKey, index);
      const options = optionsOf(input, existing, index);

      planned.push({
        id: existing?.id ?? randomUUID(),
        type: input.type,
        systemKey,
        label: input.label,
        helpText:
          input.helpText === undefined
            ? (existing?.helpText ?? null)
            : (input.helpText ?? null),
        sensitive,
        required: requiredOf(input, existing, systemKey),
        position: index,
        options,
      });
    }

    const required = SYSTEM_KEYS[context.formType] as readonly string[];
    const present = new Set<string | null>(planned.map((f) => f.systemKey));
    if (required.some((key) => !present.has(key)))
      throw new SystemFieldMissingError();

    return planned;
  },

  /** Computed, never stored (SPEC-0002 section 11, "Computed locks"). */
  locks(field: Pick<StoredFormField, 'systemKey' | 'type' | 'label'>): {
    requiredLock: boolean;
    sensitiveLock: ProtectionLock | null;
  } {
    if (field.systemKey !== null)
      return {
        requiredLock: !OPTIONAL_SYSTEM_KEYS.includes(field.systemKey),
        sensitiveLock: null,
      };

    return {
      requiredLock: field.type === 'yes_no',
      sensitiveLock: protectionLock(field.type, field.label),
    };
  },
};

function existingField(
  context: FieldPolicyContext,
  currentById: Map<string, StoredFormField>,
  seenIds: Set<string>,
  input: FieldInputData,
  index: number,
): StoredFormField | null {
  if (input.id !== undefined && seenIds.has(input.id))
    throw new FieldIdDuplicateError(index);

  if (context.mode === 'update' && input.systemKey !== undefined)
    throw new FieldSystemKeyNotAllowedError(index);

  if (input.id === undefined) return null;

  // on create the latest version has no fields, so any id is unknown
  const existing = currentById.get(input.id);
  if (!existing) throw new FieldUnknownError(index);

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

function checkType(
  input: FieldInputData,
  existing: StoredFormField | null,
  systemKey: SystemKey | null,
  index: number,
): void {
  if (existing?.systemKey && existing.type !== input.type)
    throw new SystemFieldLockedError(index, HttpStatus.BAD_REQUEST);
  if (systemKey === null && SYSTEM_ONLY_TYPES.includes(input.type))
    throw new FieldTypeInvalidError(index);
  if (existing && existing.type !== input.type)
    throw new FieldTypeImmutableError(index);
}

function checkRequired(
  input: FieldInputData,
  systemKey: SystemKey | null,
  index: number,
): void {
  if (input.required === undefined) return;

  const fixed =
    systemKey !== null && !OPTIONAL_SYSTEM_KEYS.includes(systemKey)
      ? true
      : input.type === 'yes_no'
        ? false
        : null;

  if (fixed !== null && input.required !== fixed)
    throw new FieldRequiredLockedError(index);
}

function sensitiveOf(
  input: FieldInputData,
  existing: StoredFormField | null,
  systemKey: SystemKey | null,
  index: number,
): boolean {
  if (systemKey !== null) {
    if (input.sensitive !== undefined)
      throw new FieldSensitiveNotAllowedError(index);
    return false;
  }

  const locked = protectionLock(input.type, input.label) !== null;
  if (locked && input.sensitive === false)
    throw new FieldSensitiveLockedError(index);

  return locked || (input.sensitive ?? existing?.sensitive ?? false);
}

function requiredOf(
  input: FieldInputData,
  existing: StoredFormField | null,
  systemKey: SystemKey | null,
): boolean {
  if (systemKey === null) {
    if (input.type === 'yes_no') return false;
    return input.required ?? existing?.required ?? false;
  }

  // fixed on every system field except the one the professional chooses
  return OPTIONAL_SYSTEM_KEYS.includes(systemKey)
    ? (input.required ?? existing?.required ?? false)
    : true;
}

function optionsOf(
  input: FieldInputData,
  existing: StoredFormField | null,
  index: number,
): StoredFormOption[] | null {
  if (input.type !== 'select') {
    if (input.options !== undefined)
      throw new FieldOptionsNotAllowedError(index);
    return null;
  }
  if (!input.options) {
    if (!existing) throw new FieldOptionsRequiredError(index);
    return existing.options ?? [];
  }

  if (input.options.length < MIN_OPTIONS)
    throw new FieldOptionsRequiredError(index);
  if (input.options.length > MAX_OPTIONS) throw new FieldOptionsMaxError(index);

  const known = new Set((existing?.options ?? []).map((o) => o.id));
  const seenIds = new Set<string>();
  const seenLabels = new Set<string>();

  return input.options.map((option, optionIndex) => {
    if (option.id !== undefined) {
      if (seenIds.has(option.id))
        throw new FieldOptionIdDuplicateError(index, optionIndex);
      seenIds.add(option.id);
      if (!known.has(option.id))
        throw new FieldOptionIdUnknownError(index, optionIndex);
    }

    const key = textKey(option.label);
    if (seenLabels.has(key))
      throw new FieldOptionLabelDuplicateError(index, optionIndex);
    seenLabels.add(key);

    return { id: option.id ?? randomUUID(), label: option.label };
  });
}
