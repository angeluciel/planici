import { describe, expect, it } from 'vitest';
import { FormName } from './form-name.vo.js';

describe('FormName (U-name)', () => {
  it('trims and collapses internal whitespace (R3)', () => {
    expect(FormName.create('  Anamnese   inicial ').value).toBe(
      'Anamnese inicial',
    );
  });

  it('AC-0001-05 gives " anamnése " and "Anamnese" the same key (R4)', () => {
    expect(FormName.create(' anamnése ').key).toBe(
      FormName.create('Anamnese').key,
    );
    expect(FormName.create(' anamnése ').key).toBe('anamnese');
  });

  it('keeps the typed spelling in value and lowercases the key', () => {
    const name = FormName.create('Avaliação  Física');

    expect(name.value).toBe('Avaliação Física');
    expect(name.key).toBe('avaliacao fisica');
  });

  it('AC-0001-75 gives "Ficha" and "FICHA" the same key', () => {
    expect(FormName.create('FICHA').key).toBe(FormName.create('Ficha').key);
  });

  it('keeps names that differ by more than case and accents apart', () => {
    expect(FormName.create('Ficha 2').key).not.toBe(
      FormName.create('Ficha').key,
    );
  });

  it('AC-0001-03 rejects a blank name', () => {
    expect(() => FormName.create('   ')).toThrow(
      expect.objectContaining({ code: 'formName.required', field: 'name' }),
    );
  });

  it('AC-0001-04 rejects a name over 80 characters and accepts exactly 80', () => {
    expect(() => FormName.create('a'.repeat(81))).toThrow(
      expect.objectContaining({ code: 'formName.max', field: 'name' }),
    );
    expect(FormName.create('a'.repeat(80)).value).toHaveLength(80);
  });
});
