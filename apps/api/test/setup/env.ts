import 'reflect-metadata';
import { inject } from 'vitest';

const databaseUrl = inject('testDatabaseUrl');

if (!databaseUrl) {
  throw new Error('E2E database was not initialized');
}

Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: databaseUrl,
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
