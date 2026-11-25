import { guardQuery as guard, pgErrorOf } from '@shared/list/guard-query.js';
import { ClientPersistenceError } from '../../domain/errors/client.errors.js';

export { pgErrorOf };

/**
 * Runs a query and rethrows any failure as `ClientPersistenceError`: Drizzle's
 * message carries the query parameters, which hold client data (R13).
 */
export function guardQuery<T>(query: () => Promise<T>): Promise<T> {
  return guard(
    query,
    (code, constraint) => new ClientPersistenceError(code, constraint),
  );
}
