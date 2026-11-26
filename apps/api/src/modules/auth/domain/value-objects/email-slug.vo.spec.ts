import { describe, expect, it } from 'vitest';
import { Email } from './email.vo.js';
import { Slug } from './slug.vo.js';

type Thrown = { status: number; code: string; field?: string };

function failure(work: () => unknown): Thrown {
  try {
    work();
  } catch (error) {
    const { status, code, field } = error as Thrown;
    return { status, code, field };
  }
  throw new Error('no error thrown');
}

describe('Email', () => {
  it('trims and lowercases the address', () => {
    const email = Email.create('  Pro@Planici.CO ');

    expect(email.value).toBe('pro@planici.co');
    expect(`${email}`).toBe('pro@planici.co');
  });

  it.each([
    ['', 'email.required'],
    ['   ', 'email.required'],
    ['pro', 'email.invalid'],
    ['pro@', 'email.invalid'],
  ])('refuses %j with %s on the email field', (raw, code) => {
    expect(failure(() => Email.create(raw))).toEqual({
      status: 422,
      code,
      field: 'email',
    });
  });
});

describe('Slug', () => {
  it('trims and lowercases the slug', () => {
    const slug = Slug.create('  Ana-Souza ');

    expect(slug.value).toBe('ana-souza');
    expect(`${slug}`).toBe('ana-souza');
  });

  it.each([
    ['', 'slug.required'],
    ['   ', 'slug.required'],
    ['ana souza', 'slug.pattern'],
    ['-ana', 'slug.pattern'],
    ['ana--souza', 'slug.pattern'],
    ['ana_souza', 'slug.pattern'],
  ])('refuses %j with %s on the slug field', (raw, code) => {
    expect(failure(() => Slug.create(raw))).toEqual({
      status: 422,
      code,
      field: 'slug',
    });
  });
});
