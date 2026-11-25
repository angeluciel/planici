import { textKey } from '@planici/schemas';
import { escapeLike } from '@shared/list/escape-like.js';

// Search of SPEC-0005 R9. Pure: it builds the key and the LIKE pattern; the
// repository puts them in the query.

export type ServiceSearch = {
  // textKey of the trimmed query: the part of the cursor filter and what is
  // matched against `name_key`
  key: string;
  // `%key%` with LIKE metacharacters escaped
  pattern: string;
};

/** The search for a query, or null when it is blank (no filter). */
export function buildServiceSearch(
  query: string | undefined,
): ServiceSearch | null {
  const key = textKey(query ?? '');

  if (key === '') return null;

  return { key, pattern: `%${escapeLike(key)}%` };
}
