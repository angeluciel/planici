import { guardQuery as guard } from '@shared/list/guard-query.js';
import { AuthPersistenceError } from '../../domain/errors/auth.errors.js';

export { pgErrorOf } from '@shared/list/guard-query.js';

/**
 * Runs a query and rethrows any failure as `AuthPersistenceError`: Drizzle's
 * message carries the query parameters, which hold e-mails and hashes.
 */
export function guardQuery<T>(query: () => Promise<T>): Promise<T> {
  return guard(
    query,
    (code, constraint) => new AuthPersistenceError(code, constraint),
  );
}
