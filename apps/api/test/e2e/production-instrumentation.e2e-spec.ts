import { type INestApplication, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule, ObserveInstrument } from '@src/app.module.js';
import { PG_POOL } from '@src/database/database.constants.js';

/**
 * JOA-39: @nestjs/observe's automatic provider instrumentation is only wired
 * in via `NestFactory.create(AppModule, { instrument: ObserveInstrument })`
 * (see `src/main.ts`) - exactly what production boots with. The rest of the
 * e2e suite (test/setup/test-app.ts) boots the app with
 * `Test.createTestingModule({ imports: [AppModule] }).createNestApplication()`,
 * which never applies that option, so it never exercises this instrumentation
 * at all. That is the actual reason the rest of the suite passed while
 * production's `GET /api/health` reported `database: "down"` - the gap isn't
 * NODE_ENV, it's this bootstrap path.
 *
 * This spec boots the app the way `main.ts` does (env.ts already provides
 * production-like settings: real Testcontainers Postgres, non-owner
 * `DATABASE_URL_APP`, `DATABASE_SSL=false`) with `NODE_ENV` forced to
 * `production` to match the ticket's repro, and asserts every DB-touching
 * request succeeds - not just health, but a drizzle-backed command too, since
 * drizzle's `DRIZZLE` provider is constructed from the very same `PG_POOL`
 * instance the health check queries directly.
 */
describe('production-like bootstrap instrumentation (JOA-39)', () => {
  let app: INestApplication;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    process.env.NODE_ENV = 'production';

    app = await NestFactory.create(AppModule, {
      instrument: ObserveInstrument,
      logger: false,
    });
    app.enableVersioning({ type: VersioningType.URI });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('GET /health reports database "up" (not just HTTP 200)', async () => {
    const response = await request(app.getHttpServer()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('a drizzle-backed command succeeds through the same instrumented pg.Pool (blast radius: every DB call, not just health)', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/email/code')
      .send({ email: `joa39-blast-radius-${Date.now()}@planici.co` })
      .expect(202);
  });
});

/**
 * JOA-39 #8: the owner decided /health must report 503 (not 200) when the DB
 * check fails, so ECS/ALB (and the Dockerfile HEALTHCHECK) treat the
 * container as unhealthy instead of routing traffic to it. This exercises
 * the real HTTP layer with a failing pool, distinct from the unit spec.
 */
describe('GET /health with a failing pool (JOA-39)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const failingPool = {
      query: () => Promise.reject(new Error('connection refused')),
      end: () => Promise.resolve(),
    } as unknown as Pool;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PG_POOL)
      .useValue(failingPool)
      .compile();

    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 503 with database "down"', async () => {
    const response = await request(app.getHttpServer()).get('/health');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'degraded', database: 'down' });
  });
});
