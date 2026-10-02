import { Controller, Get, Inject, Logger } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '@src/database/database.constants.js';
import { HealthCheckError } from './health.error.js';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get()
  async check(): Promise<{ status: string; database: string }> {
    try {
      await this.pool.query('select 1');
      return { status: 'ok', database: 'up' };
    } catch (err) {
      this.logger.error(
        'Database health check failed',
        err instanceof Error ? err.stack : err,
      );
      throw new HealthCheckError();
    }
  }
}
