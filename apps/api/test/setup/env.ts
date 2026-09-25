import 'reflect-metadata';
import { inject } from 'vitest';

const databaseUrl = inject('testDatabaseUrl');
const databaseUrlApp = inject('testDatabaseUrlApp');

if (!databaseUrl || !databaseUrlApp) {
  throw new Error('E2E database was not initialized');
}

Object.assign(process.env, {
  NODE_ENV: 'test',
  // Owner/migration role — kept for fixture seeding that must bypass RLS
  // (e.g. the tenant-isolation e2e test seeding `_rls_probe` rows for two
  // tenants). Never used by the app's own runtime pool anymore.
  DATABASE_URL: databaseUrl,
  // Runtime app connection (JOA-19 AC6): non-superuser, non-owner,
  // non-BYPASSRLS role with DML-only grants — see database.global-setup.ts.
  DATABASE_URL_APP: databaseUrlApp,
  DATABASE_SSL: 'false',
  DATABASE_POOL_MAX: '2',

  JWT_SECRET: 'test-only-access-secret-00000000',
  JWT_REFRESH_SECRET: 'test-only-refresh-secret-00000000',

  OBSERVE_APP_KEY: 'test-key',
  OBSERVE_APP_SECRET: 'test-secret',

  MAIL_DRIVER: 'console',
  WEB_APP_URL: 'http://localhost:3000',
  BCRYPT_COST: '10',
  THROTTLE_DISABLED: 'true',
});
