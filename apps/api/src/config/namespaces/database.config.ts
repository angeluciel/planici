import { registerAs } from '@nestjs/config';

/**
 * The NestJS app's runtime pool connects with `DATABASE_URL_APP` — a
 * non-owner, non-superuser, non-BYPASSRLS role with DML grants only — so RLS
 * policies (JOA-19) actually apply to it (AC6). `drizzle-kit` (migrations,
 * `drizzle.config.ts`) keeps using `DATABASE_URL` (the owner/migration
 * role) directly and is untouched by this.
 *
 * Falls back to `DATABASE_URL` when `DATABASE_URL_APP` isn't set, so
 * development/test environments that haven't provisioned the separate role
 * (see `.ai/work/JOA-19/answers.md` #2/#4) keep working. In production this
 * fallback never happens in practice: `env.schema.ts` fails env validation
 * at boot when `NODE_ENV=production` and `DATABASE_URL_APP` is unset
 * (fail closed, JOA-19 AC6).
 */
export const databaseConfig = registerAs('database', () => ({
  url: (process.env.DATABASE_URL_APP || process.env.DATABASE_URL) as string,
  poolMax: Number(process.env.DATABASE_POOL_MAX ?? 10),
  ssl: process.env.DATABASE_SSL === 'true',
}));
