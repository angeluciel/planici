import {
  ALWAYS_PROTECTED_TYPES,
  LABEL_CHECK_TYPES,
  PROTECTED_TERMS,
  labelHasProtectedTerm,
  protectionLock,
} from '@planici/schemas';
import { describe, expect, it } from 'vitest';

// U-terms: SPEC-0002 section 3.4. The list lives in packages/schemas (no test
// runner there), so it is exercised from the api, the way web and api share it.

const stripAccents = (text: string) =>
  text.normalize('NFD').replace(/\p{M}+/gu, '');

describe('protected terms (U-terms)', () => {
  it('AC-0002-08 lists every section 3.4 term (spot check of each group)', () => {
    for (const term of [
      'cpf',
      'endereço',
      'nascimento',
      'alergia',
      'religião',
      'ssn',
      'cartão sus',
      'opinião política',
    ]) {
      expect(PROTECTED_TERMS).toContain(term);
    }
  });

  describe.each(PROTECTED_TERMS.map((term) => [term]))('term "%s"', (term) => {
    it('AC-0002-08 matches as written', () => {
      expect(labelHasProtectedTerm(term)).toBe(true);
    });

    it('AC-0002-08 matches in upper case', () => {
      expect(labelHasProtectedTerm(term.toUpperCase())).toBe(true);
    });

    it('AC-0002-08 matches without accents', () => {
      expect(labelHasProtectedTerm(stripAccents(term))).toBe(true);
    });

    it('AC-0002-08 matches inside a phrase', () => {
      expect(labelHasProtectedTerm(`Informe seu ${term} atual`)).toBe(true);
    });

    it('AC-0002-08 matches before punctuation', () => {
      expect(labelHasProtectedTerm(`${term}: detalhes`)).toBe(true);
    });
  });

  it('AC-0002-09 matches "PESO (kg)" through the bounding parenthesis', () => {
    expect(labelHasProtectedTerm('PESO (kg)')).toBe(true);
    expect(protectionLock('number', 'PESO (kg)')).toBe('label');
  });

  it('AC-0002-09 locks "Peso da mochila": a false positive is accepted', () => {
    expect(labelHasProtectedTerm('Peso da mochila')).toBe(true);
    expect(protectionLock('text', 'Peso da mochila')).toBe('label');
  });

  it('AC-0002-08 does not match a term inside a longer word ("Receptor" vs "cep")', () => {
    expect(labelHasProtectedTerm('Receptor')).toBe(false);
    expect(protectionLock('text', 'Receptor')).toBeNull();
  });

  it.each([
    ['Pesquisa', 'peso'],
    ['Corrida', 'cor'],
    ['Ridge', 'rg'],
    ['Spisso', 'pis'],
    ['Telefonema', 'telefone'],
  ])(
    'AC-0002-08 does not match "%s" (contains "%s" inside a word)',
    (label) => {
      expect(labelHasProtectedTerm(label)).toBe(false);
    },
  );

  it('AC-0002-08 does not match an ordinary label', () => {
    expect(labelHasProtectedTerm('Preferência de horário')).toBe(false);
    expect(labelHasProtectedTerm('Profissão')).toBe(false);
    expect(labelHasProtectedTerm('Observações')).toBe(false);
  });

  it('AC-0002-08 matches "Diagnóstico principal" and locks a text field by label', () => {
    expect(protectionLock('text', 'Diagnóstico principal')).toBe('label');
  });

  describe('protectionLock', () => {
    it.each(ALWAYS_PROTECTED_TYPES.map((type) => [type]))(
      'AC-0002-47 locks the always-protected type "%s" by type, whatever the label',
      (type) => {
        expect(protectionLock(type, 'Qualquer rótulo')).toBe('type');
        expect(protectionLock(type, 'Alergia')).toBe('type');
      },
    );

    it.each(LABEL_CHECK_TYPES.map((type) => [type]))(
      'AC-0002-08 applies the label check to "%s"',
      (type) => {
        expect(protectionLock(type, 'Alergia')).toBe('label');
        expect(protectionLock(type, 'Preferência de horário')).toBeNull();
      },
    );
  });
});
