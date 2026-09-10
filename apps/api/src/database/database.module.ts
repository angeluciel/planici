import {
  Global,
  Inject,
  Logger,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { databaseConfig } from '@/config/namespaces/database.config.js';
import { DRIZZLE, PG_POOL } from '@/database/database.constants.js';
import * as schema from './schema/index.js';

export type Database = ReturnType<typeof drizzle<typeof schema>>;

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [databaseConfig.KEY],
      useFactory: (config: ConfigType<typeof databaseConfig>) =>
        new Pool({
          connectionString: config.url,
          max: config.poolMax,
          ssl: config.ssl ? { rejectUnauthorized: true } : undefined,
        }),
    },
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      useFactory: (pool: Pool) => drizzle(pool, { schema }),
    },
  ],
  exports: [DRIZZLE, PG_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
    this.logger.log('Postgres pool closed');
  }
}
