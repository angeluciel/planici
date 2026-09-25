import { fileURLToPath } from 'node:url';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import type { TestProject } from 'vitest/node';

/**
 * JOA-19 AC6: the app's runtime connection must NOT be the migrations/owner
 * role. In this Testcontainers bootstrap that role is also a real Postgres
 * superuser — superusers bypass RLS unconditionally, even with
 * `FORCE ROW LEVEL SECURITY` (see `.ai/work/JOA-19/answers.md` #2). So,
 * after migrating with the bootstrap/owner role, provision a second,
 * non-superuser, non-BYPASSRLS, non-owner role with DML-only grants and
 * hand its connection string to the app under test via `DATABASE_URL_APP`
 * (wired in `env.ts`) — this is what makes the "zero cross-tenant leakage"
 * e2e proof (AC2/AC7) meaningful instead of a false positive.
 */
const APP_ROLE = 'planici_test_app';
const APP_ROLE_PASSWORD = 'planici_test_app';

export default async function setup(project: TestProject) {
  const container = await new PostgreSqlContainer('postgres:17')
    .withDatabase('planici_test')
    .withStartupTimeout(120_000)
    .start();

  try {
    const pool = new Pool({
      connectionString: container.getConnectionUri(),
      max: 1,
    });

    try {
      await migrate(drizzle(pool), {
        migrationsFolder: fileURLToPath(
          new URL('../../drizzle/', import.meta.url),
        ),
      });

      await provisionAppRole(pool);
    } finally {
      await pool.end();
    }

    project.provide('testDatabaseUrl', container.getConnectionUri());
    project.provide(
      'testDatabaseUrlApp',
      withRole(container.getConnectionUri(), APP_ROLE, APP_ROLE_PASSWORD),
    );
  } catch (error) {
    await container.stop();
    throw error;
  }

  return async () => {
    await container.stop();
  };
}

/**
 * Non-superuser, non-owner, non-BYPASSRLS role with DML grants only — no
 * CREATE/CREATEDB/CREATEROLE, no table ownership. `TRUNCATE` is included
 * because `test/setup/test-app.ts` truncates domain tables between specs.
 */
async function provisionAppRole(pool: Pool): Promise<void> {
  const db = drizzle(pool);

  await db.execute(
    sql.raw(
      `create role ${APP_ROLE} login password '${APP_ROLE_PASSWORD}' ` +
        'nosuperuser nocreatedb nocreaterole noreplication nobypassrls',
    ),
  );
  await db.execute(sql.raw(`grant usage on schema public to ${APP_ROLE}`));
  await db.execute(
    sql.raw(
      `grant select, insert, update, delete, truncate on all tables in schema public to ${APP_ROLE}`,
    ),
  );
  await db.execute(
    sql.raw(
      `grant usage, select on all sequences in schema public to ${APP_ROLE}`,
    ),
  );
}

/** Swaps the `user:pass@` segment of a Postgres connection URI for a different role's credentials. */
function withRole(uri: string, user: string, password: string): string {
  return uri.replace(/^(postgres(?:ql)?:\/\/)[^@]+@/, `$1${user}:${password}@`);
}

declare module 'vitest' {
  export interface ProvidedContext {
    testDatabaseUrl: string;
    testDatabaseUrlApp: string;
  }
}
