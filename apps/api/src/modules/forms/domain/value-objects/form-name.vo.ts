import { FORM_NAME_MAX_LENGTH, textKey } from '@planici/schemas';
import { ValidationError } from '@shared/http/zod-validation.pipe.js';

/** Template name (R3, R4): `value` is what is shown, `key` decides uniqueness. */
export class FormName {
  private constructor(
    readonly value: string,
    readonly key: string,
  ) {}

  static create(raw: string): FormName {
    const normalised = raw.trim().replace(/\s+/g, ' ');

    if (!normalised) throw new ValidationError('formName.required', 'name');
    if (normalised.length > FORM_NAME_MAX_LENGTH)
      throw new ValidationError('formName.max', 'name');

    return new FormName(normalised, textKey(normalised));
  }

  toString(): string {
    return this.value;
  }
}
