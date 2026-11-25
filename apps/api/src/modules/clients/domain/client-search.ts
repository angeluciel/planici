import { textKey } from '@planici/schemas';
import { escapeLike } from '@shared/list/escape-like.js';

// Search of SPEC-0004 R9. Pure: it builds the keys and LIKE patterns; the
// repository puts them in the query.

const PHONE_MIN_DIGITS = 4;

export type ClientSearch = {
  // textKey of the trimmed query: the part of the cursor filter and what is
  // matched against `name_key`
  key: string;
  // `%key%` with LIKE metacharacters escaped; for `name_key` and `email`
  pattern: string;
  // `%digits%` when the query holds 4 or more digits, else null; for `phone`
  phonePattern: string | null;
};

/** The search for a query, or null when it is blank (no filter). */
export function buildClientSearch(
  query: string | undefined,
): ClientSearch | null {
  const key = textKey(query ?? '');

  if (key === '') return null;

  const digits = key.replace(/\D/g, '');

  return {
    key,
    pattern: `%${escapeLike(key)}%`,
    phonePattern: digits.length >= PHONE_MIN_DIGITS ? `%${digits}%` : null,
  };
}
