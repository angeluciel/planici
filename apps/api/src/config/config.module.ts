import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validateEnv } from './env.schema.js';
import { authConfig } from './namespaces/auth.config.js';
import { databaseConfig } from './namespaces/database.config.js';
import { jwtConfig } from './namespaces/jwt.config.js';
import { mailConfig } from './namespaces/mail.config.js';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
      load: [databaseConfig, jwtConfig, authConfig, mailConfig],
      validate: validateEnv,
    }),
  ],
})
export class ConfigModule {}
