import type { NextVersionShape } from '../ports/form-record-store.js';
import type { StoredFormField } from '../ports/form-repository.js';

/** What the next version keeps, as the record store needs it. */
export function toNextVersionShape(
  fields: readonly StoredFormField[],
): NextVersionShape {
  return {
    fields: fields.map((field) => ({
      id: field.id,
      type: field.type,
      required: field.required,
      system: field.systemKey !== null,
      optionIds: field.options ? field.options.map((o) => o.id) : null,
    })),
  };
}
