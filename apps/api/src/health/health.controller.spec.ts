import type { Response } from 'express';
import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { HealthController } from '@src/health/health.controller.js';

function createResSpy(): Response {
  const res = { status: vi.fn() } as unknown as Response;
  (res.status as ReturnType<typeof vi.fn>).mockReturnValue(res);
  return res;
}

describe('HealthController', () => {
  it('returns 200 with database "up" when the DB check succeeds', async () => {
    const pool = {
      query: vi.fn().mockResolvedValue(undefined),
    } as unknown as Pool;
    const controller = new HealthController(pool);
    const res = createResSpy();

    const body = await controller.check(res);

    expect(body).toEqual({ status: 'ok', database: 'up' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(pool.query).toHaveBeenCalledWith('select 1');
  });

  it('returns 503 with database "down" when the DB check fails (e.g. a failing pool)', async () => {
    const pool = {
      query: vi.fn().mockRejectedValue(new Error('connection refused')),
    } as unknown as Pool;
    const controller = new HealthController(pool);
    const res = createResSpy();

    const body = await controller.check(res);

    expect(body).toEqual({ status: 'degraded', database: 'down' });
    expect(res.status).toHaveBeenCalledWith(503);
  });
});
