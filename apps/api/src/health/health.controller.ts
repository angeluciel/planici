import { Controller, Get, Inject, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { Pool } from 'pg';
import { PG_POOL } from '@src/database/database.constants.js';

// TODO: implement sairyss controller per-action
// TODO: use config app.routes.ts
@Controller('health')
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get()
  async check(
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ status: string; database: string }> {
    try {
      await this.pool.query('select 1');
      res.status(200);
      return { status: 'ok', database: 'up' };
    } catch {
      // 503 so the ECS/ALB (and the Dockerfile HEALTHCHECK) fail closed when
      // the DB is unreachable, instead of reporting healthy on a 200.
      res.status(503);
      return { status: 'degraded', database: 'down' };
    }
  }
}
