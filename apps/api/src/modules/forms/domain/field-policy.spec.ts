import type { FieldInputData } from '@planici/schemas';
import { describe, expect, it } from 'vitest';
import type { StoredFormField } from '../ports/form-repository.js';
import { FieldPolicy, type FieldPolicyContext } from './field-policy.js';

// U-pol: SPEC-0002 section 11 (API). Rule order, defaults and locks of
// FieldPolicy with in-memory field lists. `plan` returns the fields of the next
// version or throws the first failing rule as a DomainError.

const stored = (
  over: Partial<StoredFormField> & Pick<StoredFormField, 'id' | 'label'>,
): StoredFormField => ({
  type: 'text',
  systemKey: null,
  helpText: null,
  sensitive: false,
  required: false,
  position: 0,
  options: null,
  ...over,
});

const NAME = stored({
  id: 'f-name',
  label: 'Nome completo',
  type: 'full_name',
  systemKey: 'client.name',
  required: true,
});
const EMAIL = stored({
  id: 'f-email',
  label: 'E-mail',
  type: 'email',
  systemKey: 'client.email',
  required: true,
});
const PHONE = stored({
  id: 'f-phone',
  label: 'Telefone',
  type: 'phone',
  systemKey: 'client.phone',
});
const PROF = stored({ id: 'f-prof', label: 'Profissão' });
const GOAL = stored({ id: 'f-goal', label: 'Objetivo' });
const TURNO = stored({
  id: 'f-turno',
  label: 'Turno',
  type: 'select',
  options: [
    { id: 'o-manha', label: 'Manhã' },
    { id: 'o-tarde', label: 'Tarde' },
  ],
});

const update = (...current: StoredFormField[]): FieldPolicyContext => ({
  formType: 'client',
  mode: 'update',
  current: [NAME, EMAIL, PHONE, ...current],
});
const create: FieldPolicyContext = {
  formType: 'client',
  mode: 'create',
  current: [],
};

// the three client system fields as an update request sends them: by id, no systemKey, no sensitive
const sys: FieldInputData[] = [
  { id: 'f-name', label: 'Nome completo', type: 'full_name', required: true },
  { id: 'f-email', label: 'E-mail', type: 'email', required: true },
  { id: 'f-phone', label: 'Telefone', type: 'phone', required: false },
];
// ... and as a create request sends them: by systemKey
const sysCreate: FieldInputData[] = [
  {
    systemKey: 'client.name',
    label: 'Nome completo',
    type: 'full_name',
    required: true,
  },
  {
    systemKey: 'client.email',
    label: 'E-mail',
    type: 'email',
    required: true,
  },
  {
    systemKey: 'client.phone',
    label: 'Telefone',
    type: 'phone',
    required: false,
  },
];

const input = (over: Record<string, unknown>) => over as FieldInputData;

function failure(context: FieldPolicyContext, fields: FieldInputData[]) {
  try {
    FieldPolicy.plan(context, fields);
  } catch (error) {
    const { code, field, status } = error as {
      code: string;
      field?: string;
      status: number;
    };
    return { error: code, field, status };
  }
  throw new Error('expected FieldPolicy.plan to throw');
}

const planned = (context: FieldPolicyContext, fields: FieldInputData[]) =>
  FieldPolicy.plan(context, fields);

describe('FieldPolicy.plan rules (U-pol)', () => {
  it('AC-0002-03 reports a missing system field at "fields"', () => {
    expect(failure(update(), [sys[0]!, sys[2]!])).toEqual({
      error: 'systemField.missing',
      field: 'fields',
      status: 422,
    });
  });

  it('AC-0002-04 answers 400 systemField.locked for a system field sent with another type', () => {
    const result = failure(update(), [
      sys[0]!,
      { ...sys[1]!, type: 'text' },
      sys[2]!,
    ]);

    expect(result).toEqual({
      error: 'systemField.locked',
      field: 'fields.1',
      status: 400,
    });
  });

  it('AC-0002-18 answers 400 fieldType.immutable for an existing custom field sent with another type', () => {
    const result = failure(update(PROF), [
      ...sys,
      { id: 'f-prof', label: 'Profissão', type: 'number' },
    ]);

    expect(result).toEqual({
      error: 'fieldType.immutable',
      field: 'fields.3.type',
      status: 400,
    });
  });

  it('AC-0002-11 rejects a new label equal to an earlier one ignoring case, accents and spaces', () => {
    const result = failure(update(PROF, GOAL), [
      ...sys,
      { id: 'f-prof', label: 'Profissão', type: 'text' },
      { id: 'f-goal', label: 'Objetivo', type: 'text' },
      { label: ' profissao ', type: 'text' },
    ]);

    expect(result).toEqual({
      error: 'fieldLabel.duplicate',
      field: 'fields.5.label',
      status: 422,
    });
  });

  it('AC-0002-41 rejects the same field id twice, at the later index', () => {
    const result = failure(update(PROF), [
      ...sys,
      { id: 'f-prof', label: 'Profissão', type: 'text' },
      { id: 'f-prof', label: 'Outra', type: 'text' },
    ]);

    expect(result).toEqual({
      error: 'fieldId.duplicate',
      field: 'fields.4.id',
      status: 422,
    });
  });

  it('AC-0002-43 rejects an option id repeated within one field, at the later option', () => {
    const result = failure(update(TURNO), [
      ...sys,
      {
        id: 'f-turno',
        label: 'Turno',
        type: 'select',
        options: [
          { id: 'o-manha', label: 'Manhã' },
          { id: 'o-manha', label: 'Tarde' },
        ],
      },
    ]);

    expect(result).toEqual({
      error: 'fieldOptionId.duplicate',
      field: 'fields.3.options.1.id',
      status: 422,
    });
  });

  it('AC-0002-42 rejects an option id that is not one of the field options', () => {
    const result = failure(update(TURNO), [
      ...sys,
      {
        id: 'f-turno',
        label: 'Turno',
        type: 'select',
        options: [
          { id: 'o-manha', label: 'Manhã' },
          { id: 'o-outro', label: 'Tarde' },
        ],
      },
    ]);

    expect(result).toEqual({
      error: 'fieldOptionId.unknown',
      field: 'fields.3.options.1.id',
      status: 422,
    });
  });

  it('AC-0002-28 rejects a system-only type on a new custom field', () => {
    expect(
      failure(update(), [...sys, { label: 'Valor', type: 'money' }]),
    ).toEqual({
      error: 'fieldType.invalid',
      field: 'fields.3.type',
      status: 422,
    });
  });

  it('AC-0002-29 rejects client.email with required false', () => {
    expect(
      failure(update(), [sys[0]!, { ...sys[1]!, required: false }, sys[2]!]),
    ).toEqual({
      error: 'fieldRequired.locked',
      field: 'fields.1.required',
      status: 422,
    });
  });

  it('AC-0002-13 rejects a yes_no field with required true', () => {
    expect(
      failure(update(), [
        ...sys,
        { label: 'Fuma', type: 'yes_no', required: true },
      ]),
    ).toEqual({
      error: 'fieldRequired.locked',
      field: 'fields.3.required',
      status: 422,
    });
  });

  it('AC-0002-30 accepts client.phone with required true', () => {
    const fields = planned(update(), [
      sys[0]!,
      sys[1]!,
      { ...sys[2]!, required: true },
    ]);

    expect(fields[2]).toMatchObject({
      systemKey: 'client.phone',
      required: true,
    });
  });

  it('AC-0002-45 rejects sensitive on a system field', () => {
    expect(
      failure(update(), [sys[0]!, { ...sys[1]!, sensitive: true }, sys[2]!]),
    ).toEqual({
      error: 'fieldSensitive.not-allowed',
      field: 'fields.1.sensitive',
      status: 422,
    });
  });

  it('AC-0002-45 rejects sensitive false on a system field too: it is never sent', () => {
    expect(
      failure(update(), [sys[0]!, { ...sys[1]!, sensitive: false }, sys[2]!])
        .error,
    ).toBe('fieldSensitive.not-allowed');
  });

  it('AC-0002-07 rejects a cpf field with sensitive false', () => {
    expect(
      failure(update(), [
        ...sys,
        { label: 'CPF', type: 'cpf', sensitive: false },
      ]),
    ).toEqual({
      error: 'fieldSensitive.locked',
      field: 'fields.3.sensitive',
      status: 422,
    });
  });

  it('AC-0002-09 rejects a number labelled "PESO (kg)" with sensitive false', () => {
    expect(
      failure(update(), [
        ...sys,
        { label: 'PESO (kg)', type: 'number', sensitive: false },
      ]),
    ).toEqual({
      error: 'fieldSensitive.locked',
      field: 'fields.3.sensitive',
      status: 422,
    });
  });

  it('AC-0002-12 rejects a select with one option', () => {
    expect(
      failure(update(), [
        ...sys,
        {
          label: 'Turno',
          type: 'select',
          options: [{ label: 'Manhã' }],
        },
      ]),
    ).toEqual({
      error: 'fieldOptions.required',
      field: 'fields.3.options',
      status: 422,
    });
  });

  it('AC-0002-35 rejects a select with 51 options', () => {
    const options = Array.from({ length: 51 }, (_, i) => ({
      label: `Opção ${i + 1}`,
    }));

    expect(
      failure(update(), [...sys, { label: 'Turno', type: 'select', options }]),
    ).toEqual({
      error: 'fieldOptions.max',
      field: 'fields.3.options',
      status: 422,
    });
  });

  it('AC-0002-44 rejects options on a text field', () => {
    expect(
      failure(update(), [
        ...sys,
        {
          label: 'Obs',
          type: 'text',
          options: [{ label: 'A' }, { label: 'B' }],
        },
      ]),
    ).toEqual({
      error: 'fieldOptions.not-allowed',
      field: 'fields.3.options',
      status: 422,
    });
  });

  it('AC-0002-38 rejects an option label that repeats an earlier one ignoring case and accents', () => {
    expect(
      failure(update(), [
        ...sys,
        {
          label: 'Turno',
          type: 'select',
          options: [{ label: 'Manhã' }, { label: ' manha ' }],
        },
      ]),
    ).toEqual({
      error: 'fieldOptionLabel.duplicate',
      field: 'fields.3.options.1.label',
      status: 422,
    });
  });

  it('AC-0002-31 rejects an id that is not in the latest version as unknown', () => {
    expect(
      failure(update(), [
        ...sys,
        { id: 'f-removed', label: 'Profissão', type: 'text' },
      ]),
    ).toEqual({ error: 'field.unknown', field: 'fields.3.id', status: 400 });
  });

  it('AC-0002-46 rejects systemKey on an update', () => {
    expect(
      failure(update(), [
        { ...sys[0]!, systemKey: 'client.name' },
        sys[1]!,
        sys[2]!,
      ]),
    ).toEqual({
      error: 'fieldSystemKey.not-allowed',
      field: 'fields.0.systemKey',
      status: 422,
    });
  });

  describe('create', () => {
    it('AC-0002-39 rejects a repeated system key at the later index', () => {
      expect(
        failure(create, [
          ...sysCreate,
          { systemKey: 'client.email', label: 'E-mail 2', type: 'email' },
        ]),
      ).toEqual({
        error: 'systemField.locked',
        field: 'fields.3',
        status: 422,
      });
    });

    it('AC-0002-40 rejects a system key that is not one of the template type', () => {
      expect(
        failure(create, [
          ...sysCreate,
          { systemKey: 'client.cpf', label: 'CPF', type: 'cpf' },
        ]),
      ).toEqual({
        error: 'systemField.locked',
        field: 'fields.3',
        status: 422,
      });
    });

    it('AC-0002-40 rejects a system key of the other template type', () => {
      expect(
        failure(create, [
          ...sysCreate,
          { systemKey: 'service.name', label: 'Nome', type: 'text' },
        ]).error,
      ).toBe('systemField.locked');
    });

    it('AC-0002-39 rejects a system entry with a type other than its fixed one on create', () => {
      expect(
        failure(create, [
          { ...sysCreate[0]!, type: 'text' },
          sysCreate[1]!,
          sysCreate[2]!,
        ]),
      ).toEqual({
        error: 'systemField.locked',
        field: 'fields.0',
        status: 422,
      });
    });

    it('AC-0002-20 rejects any id on create as unknown', () => {
      expect(
        failure(create, [
          ...sysCreate,
          { id: 'f-other', label: 'Profissão', type: 'text' },
        ]),
      ).toEqual({ error: 'field.unknown', field: 'fields.3.id', status: 400 });
    });

    it('AC-0002-01 accepts the three client system keys', () => {
      expect(planned(create, sysCreate).map((f) => f.systemKey)).toEqual([
        'client.name',
        'client.email',
        'client.phone',
      ]);
    });
  });

  describe('check order: the first failing rule of an entry wins', () => {
    it('AC-0002-41 repeated id wins over a systemKey on the repeated entry', () => {
      const result = failure(update(PROF), [
        ...sys,
        { id: 'f-prof', label: 'Profissão', type: 'text' },
        { id: 'f-prof', label: 'Profissão', type: 'text', systemKey: 'x' },
      ]);

      expect(result.error).toBe('fieldId.duplicate');
    });

    it('AC-0002-46 systemKey on an update wins over an unknown id', () => {
      const result = failure(update(), [
        ...sys,
        { id: 'f-removed', label: 'X', type: 'text', systemKey: 'client.cpf' },
      ]);

      expect(result.error).toBe('fieldSystemKey.not-allowed');
    });

    it('AC-0002-31 an unknown id wins over a system-only type', () => {
      const result = failure(update(), [
        ...sys,
        { id: 'f-removed', label: 'Valor', type: 'money' },
      ]);

      expect(result.error).toBe('field.unknown');
    });

    it('AC-0002-04 systemField.locked wins over fieldType.immutable on a system field', () => {
      const result = failure(update(), [
        sys[0]!,
        { ...sys[1]!, type: 'text' },
        sys[2]!,
      ]);

      expect(result.error).toBe('systemField.locked');
    });

    it('AC-0002-28 a system-only type wins over fieldType.immutable on an existing custom field', () => {
      const result = failure(update(PROF), [
        ...sys,
        { id: 'f-prof', label: 'Profissão', type: 'money' },
      ]);

      expect(result).toEqual({
        error: 'fieldType.invalid',
        field: 'fields.3.type',
        status: 422,
      });
    });

    it('AC-0002-28 the type wins over a duplicate label', () => {
      const result = failure(update(PROF), [
        ...sys,
        { id: 'f-prof', label: 'Profissão', type: 'text' },
        { label: 'profissao', type: 'duration' },
      ]);

      expect(result.error).toBe('fieldType.invalid');
    });

    it('AC-0002-11 a duplicate label wins over required', () => {
      const result = failure(update(PROF), [
        ...sys,
        { id: 'f-prof', label: 'Profissão', type: 'text' },
        { label: 'Profissão', type: 'yes_no', required: true },
      ]);

      expect(result.error).toBe('fieldLabel.duplicate');
    });

    it('AC-0002-13 required wins over protection', () => {
      const result = failure(update(), [
        ...sys,
        { label: 'Alergia', type: 'yes_no', required: true, sensitive: false },
      ]);

      expect(result.error).toBe('fieldRequired.locked');
    });

    it('AC-0002-45 a locked required wins over sensitive on a system field', () => {
      const result = failure(update(), [
        sys[0]!,
        { ...sys[1]!, required: false, sensitive: true },
        sys[2]!,
      ]);

      expect(result.error).toBe('fieldRequired.locked');
    });

    it('AC-0002-07 protection wins over options', () => {
      const result = failure(update(), [
        ...sys,
        {
          label: 'CPF',
          type: 'cpf',
          sensitive: false,
          options: [{ label: 'A' }],
        },
      ]);

      expect(result.error).toBe('fieldSensitive.locked');
    });

    it('AC-0002-44 not-allowed options on a non-select win over option label rules', () => {
      const result = failure(update(), [
        ...sys,
        {
          label: 'Obs',
          type: 'text',
          options: [{ label: 'A' }, { label: 'a' }],
        },
      ]);

      expect(result.error).toBe('fieldOptions.not-allowed');
    });

    it('AC-0002-43 options are walked in order: an unknown id at an earlier option wins over a repeat at a later one', () => {
      const result = failure(update(TURNO), [
        ...sys,
        {
          id: 'f-turno',
          label: 'Turno',
          type: 'select',
          options: [
            { id: 'o-x', label: 'A' },
            { id: 'o-x', label: 'a' },
          ],
        },
      ]);

      expect(result.error).toBe('fieldOptionId.unknown');
      expect(result.field).toBe('fields.3.options.0.id');
    });

    it('AC-0002-42 an unknown option id wins over a duplicate option label', () => {
      const result = failure(update(), [
        ...sys,
        {
          label: 'Turno',
          type: 'select',
          options: [{ label: 'Manhã' }, { id: 'o-x', label: 'manha' }],
        },
      ]);

      expect(result).toEqual({
        error: 'fieldOptionId.unknown',
        field: 'fields.3.options.1.id',
        status: 422,
      });
    });

    it('AC-0002-12 option count wins over option ids', () => {
      const result = failure(update(), [
        ...sys,
        {
          label: 'Turno',
          type: 'select',
          options: [{ id: 'o-x', label: 'A' }],
        },
      ]);

      expect(result.error).toBe('fieldOptions.required');
    });

    it('AC-0002-11 the first failing entry wins over a later one', () => {
      const result = failure(update(PROF), [
        ...sys,
        { label: 'CPF', type: 'cpf', sensitive: false },
        { id: 'f-prof', label: 'Profissão', type: 'number' },
      ]);

      expect(result.field).toBe('fields.3.sensitive');
    });

    it('AC-0002-03 an entry error wins over a missing system field', () => {
      const result = failure(update(), [
        sys[0]!,
        sys[2]!,
        { label: 'CPF', type: 'cpf', sensitive: false },
      ]);

      expect(result.error).toBe('fieldSensitive.locked');
    });
  });
});

describe('FieldPolicy.plan defaults (U-pol)', () => {
  it('AC-0002-06 a new plain field is neither required nor protected', () => {
    const fields = planned(update(), [
      ...sys,
      { label: 'Observações', type: 'long_text' },
    ]);

    expect(fields[3]).toMatchObject({
      label: 'Observações',
      required: false,
      sensitive: false,
    });
  });

  it('AC-0002-47 a new cpf field without sensitive is protected', () => {
    const fields = planned(update(), [...sys, { label: 'CPF', type: 'cpf' }]);

    expect(fields[3]).toMatchObject({ sensitive: true, required: false });
  });

  it('AC-0002-08 a new field with a protected label and no sensitive is protected', () => {
    const fields = planned(update(), [
      ...sys,
      { label: 'Diagnóstico principal', type: 'text' },
    ]);

    expect(fields[3]).toMatchObject({ sensitive: true });
  });

  it('AC-0002-08 a new field with a protected label may be sent sensitive true', () => {
    const fields = planned(update(), [
      ...sys,
      { label: 'Diagnóstico principal', type: 'text', sensitive: true },
    ]);

    expect(fields[3]).toMatchObject({ sensitive: true });
  });

  it('AC-0002-51 an existing field keeps its stored sensitive when it is omitted', () => {
    const objetivo = stored({
      id: 'f-goal',
      label: 'Objetivo',
      sensitive: true,
    });
    const fields = planned(update(objetivo), [
      ...sys,
      { id: 'f-goal', label: 'Objetivo', type: 'text' },
    ]);

    expect(fields[3]).toMatchObject({ id: 'f-goal', sensitive: true });
  });

  it('AC-0002-52 an existing field keeps its stored required when it is omitted', () => {
    const objetivo = stored({
      id: 'f-goal',
      label: 'Objetivo',
      required: true,
    });
    const fields = planned(update(objetivo), [
      ...sys,
      { id: 'f-goal', label: 'Objetivo', type: 'text' },
    ]);

    expect(fields[3]).toMatchObject({ id: 'f-goal', required: true });
  });

  it('AC-0002-23 an existing unprotected field turns protected when sent sensitive true', () => {
    const fields = planned(update(GOAL), [
      ...sys,
      { id: 'f-goal', label: 'Objetivo', type: 'text', sensitive: true },
    ]);

    expect(fields[3]).toMatchObject({ id: 'f-goal', sensitive: true });
  });

  it('AC-0002-27 an existing protected field is released when its label no longer matches and sensitive is false', () => {
    const alergia = stored({ id: 'f-all', label: 'Alergia', sensitive: true });
    const fields = planned(update(alergia), [
      ...sys,
      {
        id: 'f-all',
        label: 'Preferência de horário',
        type: 'text',
        sensitive: false,
      },
    ]);

    expect(fields[3]).toMatchObject({
      label: 'Preferência de horário',
      sensitive: false,
    });
  });

  it('AC-0002-10 an existing protected field stays protected when its label stops matching and sensitive is omitted', () => {
    const alergia = stored({ id: 'f-all', label: 'Alergia', sensitive: true });
    const fields = planned(update(alergia), [
      ...sys,
      { id: 'f-all', label: 'Preferência de horário', type: 'text' },
    ]);

    expect(fields[3]).toMatchObject({ sensitive: true });
  });

  it('AC-0002-09 an existing unprotected field relabelled to a protected term turns protected when sensitive is omitted', () => {
    const fields = planned(update(GOAL), [
      ...sys,
      { id: 'f-goal', label: 'Peso (kg)', type: 'text' },
    ]);

    expect(fields[3]).toMatchObject({ id: 'f-goal', sensitive: true });
  });

  it('AC-0002-09 an existing unprotected field relabelled to a protected term is rejected with sensitive false', () => {
    expect(
      failure(update(GOAL), [
        ...sys,
        { id: 'f-goal', label: 'Peso (kg)', type: 'text', sensitive: false },
      ]).error,
    ).toBe('fieldSensitive.locked');
  });

  it('AC-0002-13 a new yes_no field without required is not required', () => {
    const fields = planned(update(), [
      ...sys,
      { label: 'Fuma', type: 'yes_no' },
    ]);

    expect(fields[3]).toMatchObject({ required: false });
  });

  it('AC-0002-01 a system field never comes out protected', () => {
    const fields = planned(update(), sys);

    expect(fields.map((f) => f.sensitive)).toEqual([false, false, false]);
  });

  it('AC-0002-30 client.phone takes the sent required, default false', () => {
    expect(planned(update(), sys)[2]).toMatchObject({ required: false });
    expect(
      planned(update(), [
        sys[0]!,
        sys[1]!,
        input({ ...sys[2]!, required: true }),
      ])[2],
    ).toMatchObject({ required: true });
  });

  it('AC-0002-14 keeps the request order as the position', () => {
    const fields = planned(update(PROF, GOAL), [
      sys[0]!,
      { id: 'f-goal', label: 'Objetivo', type: 'text' },
      sys[1]!,
      { id: 'f-prof', label: 'Profissão', type: 'text' },
      sys[2]!,
    ]);

    expect(fields.map((f) => f.id)).toEqual([
      'f-name',
      'f-goal',
      'f-email',
      'f-prof',
      'f-phone',
    ]);
    expect(fields.map((f) => f.position)).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('FieldPolicy.locks (U-pol)', () => {
  const lockOf = (over: Partial<StoredFormField>) =>
    FieldPolicy.locks(stored({ id: 'x', label: 'Qualquer', ...over }));

  it('AC-0002-47 locks protection by type on an always-protected custom type', () => {
    expect(lockOf({ type: 'cpf' })).toEqual({
      requiredLock: false,
      sensitiveLock: 'type',
    });
  });

  it('AC-0002-08 locks protection by label on a label-check type', () => {
    expect(lockOf({ label: 'Diagnóstico principal' })).toEqual({
      requiredLock: false,
      sensitiveLock: 'label',
    });
  });

  it('AC-0002-06 has no lock on a plain custom field', () => {
    expect(lockOf({ label: 'Observações', type: 'long_text' })).toEqual({
      requiredLock: false,
      sensitiveLock: null,
    });
  });

  it('AC-0002-27 releases the lock when the label no longer matches', () => {
    expect(
      lockOf({ label: 'Preferência de horário', sensitive: true }),
    ).toEqual({ requiredLock: false, sensitiveLock: null });
  });

  it('AC-0002-13 locks required on a yes_no field', () => {
    expect(lockOf({ type: 'yes_no' })).toMatchObject({ requiredLock: true });
  });

  it('AC-0002-01 locks required on client.name and client.email, not on client.phone', () => {
    expect(FieldPolicy.locks(NAME).requiredLock).toBe(true);
    expect(FieldPolicy.locks(EMAIL).requiredLock).toBe(true);
    expect(FieldPolicy.locks(PHONE).requiredLock).toBe(false);
  });

  it('AC-0002-02 locks required on every service system field', () => {
    for (const [systemKey, type] of [
      ['service.name', 'text'],
      ['service.duration', 'duration'],
      ['service.price', 'money'],
    ] as const) {
      expect(lockOf({ systemKey, type }).requiredLock).toBe(true);
    }
  });

  it('AC-0002-45 never locks protection on a system field, whatever the type or label', () => {
    expect(FieldPolicy.locks(EMAIL).sensitiveLock).toBeNull();
    expect(FieldPolicy.locks(PHONE).sensitiveLock).toBeNull();
    expect(FieldPolicy.locks(NAME).sensitiveLock).toBeNull();
  });
});
