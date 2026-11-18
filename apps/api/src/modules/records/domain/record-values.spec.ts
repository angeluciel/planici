import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  BRAZIL_AREA_CODES,
  BRAZIL_STATES,
  PhoneValueSchema,
  customValueSchema,
  isBlankValue,
  recordValuesSchema,
  type Field,
} from '@planici/schemas';

// U-val: the section 3.1 value rules of packages/schemas/src/records/values.ts
// (SPEC-0003 plan, Tests). It runs from the api because packages/schemas has
// no test runner.

function fieldOf(type: Field['type'], extra: Partial<Field> = {}): Field {
  return {
    id: randomUUID(),
    label: 'Campo',
    type,
    required: false,
    sensitive: false,
    sensitiveLock: null,
    requiredLock: false,
    helpText: null,
    options: null,
    systemKey: null,
    valueCount: 0,
    ...extra,
  };
}

type Outcome =
  | { ok: true; data: unknown }
  | { ok: false; code: string; path: PropertyKey[] };

function parse(field: Field, input: unknown): Outcome {
  const result = customValueSchema(field).safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  const issue = result.error.issues[0]!;
  return { ok: false, code: issue.message, path: issue.path };
}

// the first issue of the form-level schema, with the path relative to `values`
function firstFormIssue(fields: Field[], values: Record<string, unknown>) {
  const result = recordValuesSchema(fields).safeParse(values);
  if (result.success) return null;
  const issue = result.error.issues[0]!;
  const path =
    issue.path[0] === 'values' ? issue.path.slice(1) : [...issue.path];
  return { code: issue.message, field: ['values', ...path].join('.') };
}

const accepted = (data: unknown): Outcome => ({ ok: true, data });
const rejected = (
  code: string,
): Pick<Extract<Outcome, { ok: false }>, 'ok' | 'code'> => ({
  ok: false,
  code,
});
const codeOf = (outcome: Outcome) => (outcome.ok ? 'accepted' : outcome.code);

const ADDRESS = {
  cep: '01310100',
  street: 'Avenida Paulista',
  number: '1000',
  complement: 'Sala 2',
  district: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
};

const EXPECTED_AREA_CODES = [
  ...Array.from({ length: 9 }, (_, i) => 11 + i), // 11-19
  21,
  22,
  24,
  27,
  28,
  ...[31, 32, 33, 34, 35, 37, 38],
  ...Array.from({ length: 9 }, (_, i) => 41 + i), // 41-49
  51,
  53,
  54,
  55,
  ...Array.from({ length: 9 }, (_, i) => 61 + i), // 61-69
  71,
  73,
  74,
  75,
  77,
  79,
  ...Array.from({ length: 9 }, (_, i) => 81 + i), // 81-89
  ...Array.from({ length: 9 }, (_, i) => 91 + i), // 91-99
].map(String);

describe('contract constants', () => {
  it("§3.1 BRAZIL_AREA_CODES is the owner's confirmed list of 67 DDDs", () => {
    expect([...BRAZIL_AREA_CODES].map(String).sort()).toEqual(
      EXPECTED_AREA_CODES.toSorted(),
    );
    expect(EXPECTED_AREA_CODES).toHaveLength(67);
  });

  it('§3.1 BRAZIL_STATES is the 27 UFs', () => {
    expect([...BRAZIL_STATES].sort()).toEqual(
      [
        'AC',
        'AL',
        'AP',
        'AM',
        'BA',
        'CE',
        'DF',
        'ES',
        'GO',
        'MA',
        'MT',
        'MS',
        'MG',
        'PA',
        'PB',
        'PR',
        'PE',
        'PI',
        'RJ',
        'RN',
        'RS',
        'RO',
        'RR',
        'SC',
        'SP',
        'SE',
        'TO',
      ].sort(),
    );
  });
});

describe('cpf', () => {
  const cpf = fieldOf('cpf');

  it('AC-0003-04 rejects a CPF with wrong check digits', () => {
    expect(parse(cpf, '123.456.789-00')).toMatchObject(rejected('cpf.invalid'));
  });

  it('AC-0003-05 stores a valid CPF as its 11 digits', () => {
    expect(parse(cpf, '529.982.247-25')).toEqual(accepted('52998224725'));
  });

  it('§3.1 rejects an all-identical CPF and a CPF that is not 11 digits', () => {
    expect(codeOf(parse(cpf, '111.111.111-11'))).toBe('cpf.invalid');
    expect(codeOf(parse(cpf, '5299822472'))).toBe('cpf.invalid');
    expect(codeOf(parse(cpf, '529982247250'))).toBe('cpf.invalid');
  });

  it('§3.1 accepts another valid CPF', () => {
    expect(parse(cpf, '111.444.777-35')).toEqual(accepted('11144477735'));
  });
});

describe('phone', () => {
  const phone = fieldOf('phone');

  it('AC-0003-06 rejects an 11-digit number whose first digit after the DDD is not 9', () => {
    expect(parse(phone, '(11) 8765-43210')).toMatchObject(
      rejected('phone.invalid'),
    );
  });

  it('AC-0003-75 rejects DDD 20, which is not on the area-code list', () => {
    expect(parse(phone, '(20) 98765-4321')).toMatchObject(
      rejected('phone.invalid'),
    );
  });

  it('§3.1 stores a mobile and a landline number as digits', () => {
    expect(parse(phone, '(11) 98765-4321')).toEqual(accepted('11987654321'));
    expect(parse(phone, '(11) 3456-7890')).toEqual(accepted('1134567890'));
  });

  it('§3.1 accepts exactly the DDDs of the list', () => {
    const listed = new Set(EXPECTED_AREA_CODES);
    for (let ddd = 10; ddd <= 99; ddd++) {
      const expected = listed.has(String(ddd)) ? 'accepted' : 'phone.invalid';
      expect([ddd, codeOf(parse(phone, `${ddd}34567890`))]).toEqual([
        ddd,
        expected,
      ]);
    }
  });

  it('§3.1 rejects numbers with too few or too many digits', () => {
    expect(codeOf(parse(phone, '(11) 4567-890'))).toBe('phone.invalid');
    expect(codeOf(parse(phone, '(11) 98765-43210'))).toBe('phone.invalid');
  });

  it('§3.1 exports PhoneValueSchema for the client phone with the same rules', () => {
    expect(PhoneValueSchema.safeParse('(11) 98765-4321')).toMatchObject({
      success: true,
      data: '11987654321',
    });
    const bad = PhoneValueSchema.safeParse('(20) 98765-4321');
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0]?.message).toBe('phone.invalid');
  });
});

describe('address', () => {
  const address = fieldOf('address');
  const asForm = (value: unknown) =>
    firstFormIssue([address], { [address.id]: value });

  it('AC-0003-07 rejects an address with only the CEP and the city', () => {
    const partial = { cep: '01310100', city: 'São Paulo' };

    expect(parse(address, partial)).toMatchObject(
      rejected('address.incomplete'),
    );
    expect(asForm(partial)).toEqual({
      code: 'address.incomplete',
      field: `values.${address.id}`,
    });
  });

  it('AC-0003-32 rejects a 121-character street at its own path', () => {
    const value = { ...ADDRESS, street: 'a'.repeat(121) };

    expect(parse(address, value)).toMatchObject(rejected('value.max'));
    expect(asForm(value)).toEqual({
      code: 'value.max',
      field: `values.${address.id}.street`,
    });
  });

  it('AC-0003-35 rejects a 7-digit CEP at its own path', () => {
    const value = { ...ADDRESS, cep: '0131010' };

    expect(parse(address, value)).toMatchObject(rejected('cep.invalid'));
    expect(asForm(value)).toEqual({
      code: 'cep.invalid',
      field: `values.${address.id}.cep`,
    });
  });

  it('AC-0003-36 rejects the state XX at its own path', () => {
    const value = { ...ADDRESS, state: 'XX' };

    expect(parse(address, value)).toMatchObject(rejected('uf.invalid'));
    expect(asForm(value)).toEqual({
      code: 'uf.invalid',
      field: `values.${address.id}.state`,
    });
  });

  it('AC-0003-76 stores a lowercase state uppercased', () => {
    expect(parse(address, { ...ADDRESS, state: 'sp' })).toMatchObject({
      ok: true,
      data: { state: 'SP' },
    });
  });

  it('§3.1 normalises the CEP to digits and a blank complement to null', () => {
    expect(
      parse(address, { ...ADDRESS, cep: '01310-100', complement: '   ' }),
    ).toMatchObject({ ok: true, data: { cep: '01310100', complement: null } });
  });

  it('§3.1 accepts "s/n" as the number and rejects an 11-character number', () => {
    expect(parse(address, { ...ADDRESS, number: 's/n' }).ok).toBe(true);
    expect(codeOf(parse(address, { ...ADDRESS, number: '12345678901' }))).toBe(
      'value.max',
    );
  });

  it('§3.1 gives a part of the wrong JSON type value.invalid at its path', () => {
    expect(asForm({ ...ADDRESS, street: 5 })).toEqual({
      code: 'value.invalid',
      field: `values.${address.id}.street`,
    });
  });

  it('Decision 3 checks completeness first, then the parts in the order cep, street, state', () => {
    expect(codeOf(parse(address, { ...ADDRESS, city: '', cep: '1' }))).toBe(
      'address.incomplete',
    );
    expect(
      parse(address, {
        ...ADDRESS,
        cep: '1',
        street: 'a'.repeat(121),
        state: 'XX',
      }),
    ).toMatchObject(rejected('cep.invalid'));
    expect(
      parse(address, { ...ADDRESS, street: 'a'.repeat(121), state: 'XX' }),
    ).toMatchObject(rejected('value.max'));
  });
});

describe('select', () => {
  const options = [
    { id: randomUUID(), label: 'Manhã' },
    { id: randomUUID(), label: 'Tarde' },
  ];
  const select = fieldOf('select', { options });

  it('AC-0003-08 rejects an id that is not one of the options', () => {
    expect(parse(select, randomUUID())).toMatchObject(
      rejected('option.invalid'),
    );
  });

  it('§3.1 accepts the id of one option as is', () => {
    expect(parse(select, options[1]!.id)).toEqual(accepted(options[1]!.id));
  });
});

describe('date', () => {
  const date = fieldOf('date');

  it('AC-0003-09 rejects 2025-02-30, which is not a real date', () => {
    expect(parse(date, '2025-02-30')).toMatchObject(rejected('date.invalid'));
  });

  it('§3.1 accepts real dates from 1900-01-01 to 2100-12-31 only', () => {
    expect(parse(date, '2025-02-28')).toEqual(accepted('2025-02-28'));
    expect(parse(date, '1900-01-01')).toEqual(accepted('1900-01-01'));
    expect(parse(date, '2100-12-31')).toEqual(accepted('2100-12-31'));
    expect(codeOf(parse(date, '1899-12-31'))).toBe('date.invalid');
    expect(codeOf(parse(date, '2101-01-01'))).toBe('date.invalid');
    expect(codeOf(parse(date, '30/01/2025'))).toBe('date.invalid');
  });

  it('§3.1 accepts a leap day only in a leap year', () => {
    expect(parse(date, '2024-02-29').ok).toBe(true);
    expect(codeOf(parse(date, '2025-02-29'))).toBe('date.invalid');
  });
});

describe('text lengths', () => {
  it('AC-0003-31 rejects 256 characters in a text field', () => {
    const text = fieldOf('text');

    expect(parse(text, 'a'.repeat(256))).toMatchObject(rejected('value.max'));
    expect(parse(text, 'a'.repeat(255)).ok).toBe(true);
  });

  it('§3.1 trims text and counts the limit after trimming', () => {
    const text = fieldOf('text');

    expect(parse(text, '  Engenheira  ')).toEqual(accepted('Engenheira'));
    expect(parse(text, ` ${'a'.repeat(255)} `).ok).toBe(true);
  });

  it('§3.1 keeps line breaks in long_text and limits it to 5,000 characters', () => {
    const longText = fieldOf('long_text');

    expect(parse(longText, 'linha 1\nlinha 2')).toEqual(
      accepted('linha 1\nlinha 2'),
    );
    expect(parse(longText, 'a'.repeat(5000)).ok).toBe(true);
    expect(codeOf(parse(longText, 'a'.repeat(5001)))).toBe('value.max');
  });

  it('§3.1 collapses repeated spaces in full_name and limits it to 120 characters', () => {
    const name = fieldOf('full_name');

    expect(parse(name, '  Ana   Maria  Souza ')).toEqual(
      accepted('Ana Maria Souza'),
    );
    expect(parse(name, 'a'.repeat(120)).ok).toBe(true);
    expect(codeOf(parse(name, 'a'.repeat(121)))).toBe('value.max');
  });
});

describe('number', () => {
  const number = fieldOf('number');

  it('AC-0003-33 rejects 72.555, which has three decimals', () => {
    expect(parse(number, 72.555)).toMatchObject(rejected('number.invalid'));
  });

  it('§3.1 accepts up to 2 decimals within the range of nine digits', () => {
    expect(parse(number, 72.55)).toEqual(accepted(72.55));
    expect(parse(number, 72.5)).toEqual(accepted(72.5));
    expect(parse(number, -999_999_999.99)).toEqual(accepted(-999_999_999.99));
    expect(parse(number, 999_999_999.99)).toEqual(accepted(999_999_999.99));
    expect(codeOf(parse(number, 1_000_000_000))).toBe('number.invalid');
    expect(codeOf(parse(number, -1_000_000_000))).toBe('number.invalid');
  });
});

describe('email', () => {
  const email = fieldOf('email');

  it('AC-0003-34 rejects "ana@"', () => {
    expect(parse(email, 'ana@')).toMatchObject(rejected('email.invalid'));
  });

  it('§3.1 stores a valid address trimmed and lowercased', () => {
    expect(parse(email, '  Ana@Example.COM ')).toEqual(
      accepted('ana@example.com'),
    );
  });
});

describe('yes_no and wrong JSON types', () => {
  it('AC-0003-37 rejects the string "sim" for a yes_no field', () => {
    expect(parse(fieldOf('yes_no'), 'sim')).toMatchObject(
      rejected('value.invalid'),
    );
  });

  it('§3.1 accepts true and false for a yes_no field', () => {
    const yesNo = fieldOf('yes_no');

    expect(parse(yesNo, true)).toEqual(accepted(true));
    expect(parse(yesNo, false)).toEqual(accepted(false));
  });

  it('§3.1 gives a value of the wrong JSON type value.invalid', () => {
    expect(codeOf(parse(fieldOf('text'), 5))).toBe('value.invalid');
    expect(codeOf(parse(fieldOf('number'), '72'))).toBe('value.invalid');
  });
});

describe('blank values (R3)', () => {
  it('R3 treats null, empty and whitespace-only strings as no value', () => {
    expect(isBlankValue(null)).toBe(true);
    expect(isBlankValue('')).toBe(true);
    expect(isBlankValue('   ')).toBe(true);
    expect(isBlankValue('\n\t ')).toBe(true);
  });

  it('R3 treats an address whose parts are all blank as no value', () => {
    expect(
      isBlankValue({
        cep: '',
        street: ' ',
        number: '',
        complement: null,
        district: '',
        city: '',
        state: '',
      }),
    ).toBe(true);
  });

  it('R3 treats any other value as a value, including false and 0', () => {
    expect(isBlankValue('Engenheira')).toBe(false);
    expect(isBlankValue(false)).toBe(false);
    expect(isBlankValue(0)).toBe(false);
    expect(isBlankValue({ ...ADDRESS, complement: null })).toBe(false);
    expect(isBlankValue({ cep: '01310100', city: 'São Paulo' })).toBe(false);
  });
});

describe('recordValuesSchema', () => {
  it('§3.1 reports every issue at values.<fieldId> and adds value.required', () => {
    const required = fieldOf('text', { required: true });
    const cpf = fieldOf('cpf');
    const email = fieldOf('email');

    const result = recordValuesSchema([required, cpf, email]).safeParse({
      [cpf.id]: '123.456.789-00',
      [email.id]: 'ana@',
    });

    expect(result.success).toBe(false);
    const issues = (result.error?.issues ?? []).map((issue) => {
      const path =
        issue.path[0] === 'values' ? issue.path.slice(1) : issue.path;
      return [issue.message, ['values', ...path].join('.')];
    });
    expect(issues).toEqual(
      expect.arrayContaining([
        ['value.required', `values.${required.id}`],
        ['cpf.invalid', `values.${cpf.id}`],
        ['email.invalid', `values.${email.id}`],
      ]),
    );
    expect(issues).toHaveLength(3);
  });

  it('R3 accepts null and blank strings for optional fields', () => {
    const text = fieldOf('text');
    const cpf = fieldOf('cpf');

    expect(
      recordValuesSchema([text, cpf]).safeParse({
        [text.id]: '   ',
        [cpf.id]: null,
      }).success,
    ).toBe(true);
  });

  it('R3 rejects a blank value for a required field with value.required', () => {
    const required = fieldOf('text', { required: true });

    expect(firstFormIssue([required], { [required.id]: '   ' })).toEqual({
      code: 'value.required',
      field: `values.${required.id}`,
    });
  });
});
