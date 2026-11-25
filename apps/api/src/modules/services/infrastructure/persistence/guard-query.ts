import { guardQuery as guard, pgErrorOf } from '@shared/list/guard-query.js';
import { ServicePersistenceError } from '../../domain/errors/service.errors.js';

export { pgErrorOf };

/**
 * Runs a query and rethrows any failure as `ServicePersistenceError`: Drizzle's
 * message carries the query parameters.
 */
export function guardQuery<T>(query: () => Promise<T>): Promise<T> {
  return guard(
    query,
    (code, constraint) => new ServicePersistenceError(code, constraint),
  );
}
