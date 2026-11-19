import { describe, expect, it } from 'vitest';
import { buildClientSearch, escapeLike } from './client-search.js';

// U-search: the search key, the LIKE escaping and the 4-digit phone rule of
// SPEC-0004 R9.

describe('search key', () => {
  it('AC-0004-43 ignores case and accents', () => {
    expect(buildClientSearch('GONÇALVES')?.key).toBe('goncalves');
    expect(buildClientSearch('Érica')?.key).toBe('erica');
  });

  it('trims and collapses spaces', () => {
    expect(buildClientSearch('  ana    souza ')?.key).toBe('ana souza');
  });

  it('AC-0004-52 returns no filter for a blank or missing query', () => {
    expect(buildClientSearch(undefined)).toBeNull();
    expect(buildClientSearch('')).toBeNull();
    expect(buildClientSearch('   ')).toBeNull();
  });
});

describe('like escaping', () => {
  it('escapes %, _ and the backslash', () => {
    expect(escapeLike('100%')).toBe('100\\%');
    expect(escapeLike('a_b')).toBe('a\\_b');
    expect(escapeLike('a\\b')).toBe('a\\\\b');
    expect(escapeLike('%_\\')).toBe('\\%\\_\\\\');
  });

  it('leaves other characters alone', () => {
    expect(escapeLike('ana souza')).toBe('ana souza');
  });

  it('wraps the escaped key in a contains pattern', () => {
    expect(buildClientSearch('50%_x')?.pattern).toBe('%50\\%\\_x%');
  });
});

describe('phone rule', () => {
  it('AC-0004-50 matches phones from 4 digits', () => {
    expect(buildClientSearch('98765')?.phonePattern).toBe('%98765%');
    expect(buildClientSearch('9876')?.phonePattern).toBe('%9876%');
  });

  it('AC-0004-51 does not match phones under 4 digits', () => {
    expect(buildClientSearch('987')?.phonePattern).toBeNull();
    expect(buildClientSearch('ana')?.phonePattern).toBeNull();
  });

  it('counts digits after removing non-digits', () => {
    expect(buildClientSearch('(11) 98')?.phonePattern).toBe('%1198%');
    expect(buildClientSearch('a1b2c3')?.phonePattern).toBeNull();
    expect(buildClientSearch('a1b2c3d4')?.phonePattern).toBe('%1234%');
  });

  it('still searches name and e-mail with the whole query', () => {
    const search = buildClientSearch('(11) 98');
    expect(search?.key).toBe('(11) 98');
    expect(search?.pattern).toBe('%(11) 98%');
  });
});
