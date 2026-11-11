import { describe, expect, it } from 'vitest';
import { diffSchema } from './schema-diff.js';

// U-diff: every row of SPEC-0001 section 3.3 decides whether a save publishes a
// version. `current` is the latest version as stored; `next` is the field list
// of the save, where a field without id is new.

type Option = { id: string; label: string };
type Current = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options: Option[] | null;
};
type Next = {
  id?: string;
  label: string;
  type: string;
  required?: boolean;
  sensitive?: boolean;
  helpText?: string | null;
  options?: { id?: string; label: string }[];
};

const current = (
  id: string,
  label: string,
  type = 'text',
  extra: Partial<Current> = {},
): Current => ({ id, label, type, required: false, options: null, ...extra });

const kept = (field: Current, extra: Partial<Next> = {}): Next => ({
  id: field.id,
  label: field.label,
  type: field.type,
  required: field.required,
  ...(field.options ? { options: field.options } : {}),
  ...extra,
});

const name = current('f-name', 'Nome completo', 'full_name', {
  required: true,
});
const email = current('f-email', 'E-mail', 'email', { required: true });
const hobby = current('f-hobby', 'Hobby');
const goal = current('f-goal', 'Objetivo');
const turno = current('f-turno', 'Turno', 'select', {
  options: [
    { id: 'o-manha', label: 'Manhã' },
    { id: 'o-tarde', label: 'Tarde' },
  ],
});

const base = [name, email, hobby, goal];

const diff = (cur: Current[], next: Next[]) =>
  diffSchema(cur as never, next as never);

describe('diffSchema (U-diff)', () => {
  describe('metadata: publishes nothing', () => {
    it('reports no change when the fields are untouched', () => {
      const result = diff(
        base,
        base.map((field) => kept(field)),
      );

      expect(result.schemaChanged).toBe(false);
      expect(result.added).toEqual([]);
      expect(result.removed).toEqual([]);
      expect(result.changed).toEqual([]);
    });

    it('AC-0001-20 treats a relabel, help text and protected flag as metadata', () => {
      const result = diff(
        base,
        base.map((field) =>
          field.id === 'f-goal'
            ? kept(field, {
                label: 'Meta principal',
                helpText: 'Descreva',
                sensitive: true,
              })
            : kept(field),
        ),
      );

      expect(result.schemaChanged).toBe(false);
      expect(result.changed).toEqual([]);
    });

    it('treats renaming a select option as metadata', () => {
      const result = diff(
        [name, turno],
        [
          kept(name),
          kept(turno, {
            options: [
              { id: 'o-manha', label: 'Manhã cedo' },
              { id: 'o-tarde', label: 'Tarde' },
            ],
          }),
        ],
      );

      expect(result.schemaChanged).toBe(false);
      expect(result.changed).toEqual([]);
    });
  });

  describe('schema: publishes a new version', () => {
    it('AC-0001-71 lists a new field under added, with its label, type and required', () => {
      const result = diff(base, [
        ...base.map((field) => kept(field)),
        { label: 'Peso', type: 'text', sensitive: true },
      ]);

      expect(result.schemaChanged).toBe(true);
      expect(result.added).toEqual([
        { label: 'Peso', type: 'text', required: false },
      ]);
      expect(result.removed).toEqual([]);
      expect(result.changed).toEqual([]);
    });

    it('AC-0001-71 lists a field absent from the next list under removed', () => {
      const result = diff(
        base,
        base.filter((field) => field.id !== 'f-hobby').map((f) => kept(f)),
      );

      expect(result.schemaChanged).toBe(true);
      expect(result.removed).toEqual([
        expect.objectContaining({ id: 'f-hobby', label: 'Hobby' }),
      ]);
      expect(result.added).toEqual([]);
      expect(result.changed).toEqual([]);
    });

    it('treats a field type change (a new field, SPEC-0002 R12) as removed plus added', () => {
      const result = diff(
        base,
        base.map((field) =>
          field.id === 'f-goal'
            ? { label: 'Objetivo', type: 'long_text' }
            : kept(field),
        ),
      );

      expect(result.schemaChanged).toBe(true);
      expect(result.removed).toEqual([
        expect.objectContaining({ id: 'f-goal' }),
      ]);
      expect(result.added).toEqual([
        { label: 'Objetivo', type: 'long_text', required: false },
      ]);
    });

    it('AC-0001-71 lists required turned on under changed with ["required"]', () => {
      const result = diff(
        base,
        base.map((field) =>
          field.id === 'f-goal' ? kept(field, { required: true }) : kept(field),
        ),
      );

      expect(result.schemaChanged).toBe(true);
      expect(result.changed).toEqual([
        expect.objectContaining({
          id: 'f-goal',
          label: 'Objetivo',
          changes: ['required'],
        }),
      ]);
    });

    it('lists required turned off under changed with ["required"]', () => {
      const result = diff(
        base,
        base.map((field) =>
          field.id === 'f-email'
            ? kept(field, { required: false })
            : kept(field),
        ),
      );

      expect(result.schemaChanged).toBe(true);
      expect(result.changed).toEqual([
        expect.objectContaining({ id: 'f-email', changes: ['required'] }),
      ]);
    });

    it('lists an added select option under changed with ["options"]', () => {
      const result = diff(
        [name, turno],
        [
          kept(name),
          kept(turno, {
            options: [...turno.options!, { label: 'Noite' }],
          }),
        ],
      );

      expect(result.schemaChanged).toBe(true);
      expect(result.changed).toEqual([
        expect.objectContaining({ id: 'f-turno', changes: ['options'] }),
      ]);
    });

    it('lists a removed select option under changed with ["options"]', () => {
      const result = diff(
        [name, turno],
        [
          kept(name),
          kept(turno, { options: [{ id: 'o-manha', label: 'Manhã' }] }),
        ],
      );

      expect(result.schemaChanged).toBe(true);
      expect(result.changed).toEqual([
        expect.objectContaining({ id: 'f-turno', changes: ['options'] }),
      ]);
    });

    it('lists every change a kept field has, once each', () => {
      const result = diff(
        [name, turno],
        [
          kept(name),
          kept(turno, {
            required: true,
            options: [{ id: 'o-manha', label: 'Manhã' }],
          }),
        ],
      );

      const [entry] = result.changed;
      expect(result.changed).toHaveLength(1);
      expect([...entry!.changes].sort()).toEqual(['options', 'required']);
    });

    it('lists a reordered field under changed with "position"', () => {
      const [first, second, third, fourth] = base;
      const result = diff(base, [
        kept(first!),
        kept(third!),
        kept(fourth!),
        kept(second!),
      ]);

      expect(result.schemaChanged).toBe(true);
      expect(result.added).toEqual([]);
      expect(result.removed).toEqual([]);
      expect(result.changed).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: second!.id,
            changes: expect.arrayContaining(['position']),
          }),
        ]),
      );
    });

    it('does not mark kept fields as moved when a field is inserted before them', () => {
      const [first, ...rest] = base;
      const result = diff(base, [
        kept(first!),
        { label: 'Peso', type: 'text', sensitive: true },
        ...rest.map((field) => kept(field)),
      ]);

      expect(result.schemaChanged).toBe(true);
      expect(result.added).toHaveLength(1);
      expect(result.changed).toEqual([]);
    });

    it('does not mark kept fields as moved when a field before them is removed', () => {
      const result = diff(
        base,
        base.filter((field) => field.id !== 'f-email').map((f) => kept(f)),
      );

      expect(result.schemaChanged).toBe(true);
      expect(result.removed).toHaveLength(1);
      expect(result.changed).toEqual([]);
    });
  });

  it('AC-0001-71 reports added, removed and changed together, leaving metadata out', () => {
    const result = diff(base, [
      ...base
        .filter((field) => field.id !== 'f-hobby')
        .map((field) =>
          field.id === 'f-goal'
            ? kept(field, { required: true })
            : field.id === 'f-name'
              ? kept(field, { label: 'Nome' })
              : kept(field),
        ),
      { label: 'Peso', type: 'text', sensitive: true },
    ]);

    expect(result.schemaChanged).toBe(true);
    expect(result.added.map((field) => field.label)).toEqual(['Peso']);
    expect(result.removed.map((field) => field.label)).toEqual(['Hobby']);
    expect(result.changed.map((field) => [field.label, field.changes])).toEqual(
      [['Objetivo', ['required']]],
    );
  });
});
