import { ClientPersistenceError } from '../../domain/errors/client.errors.js';

type PgErrorShape = { code?: unknown; constraint?: unknown };

const PG_CODE = /^[0-9A-Z]{5}$/;
const IDENTIFIER = /^[\w$]{1,63}$/;

/** The Postgres code and constraint of a driver error, or a safe placeholder. */
export function pgErrorOf(error: unknown): {
  code: string;
  constraint: string;
} {
  const candidate = error instanceof Error && error.cause ? error.cause : error;
  const shape: PgErrorShape =
    typeof candidate === 'object' && candidate !== null ? candidate : {};

  return {
    code:
      typeof shape.code === 'string' && PG_CODE.test(shape.code)
        ? shape.code
        : 'unknown',
    constraint:
      typeof shape.constraint === 'string' && IDENTIFIER.test(shape.constraint)
        ? shape.constraint
        : '',
  };
}

/**
 * Runs a query and rethrows any failure as `ClientPersistenceError`: Drizzle's
 * message carries the query parameters, which hold client data (R13).
 */
export async function guardQuery<T>(query: () => Promise<T>): Promise<T> {
  try {
    return await query();
  } catch (error) {
    const { code, constraint } = pgErrorOf(error);

    throw new ClientPersistenceError(code, constraint);
  }
}
