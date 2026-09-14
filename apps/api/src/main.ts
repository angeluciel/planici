import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import helmet from 'helmet';
import { DomainExceptionFilter } from './shared/http/domain-exception.filter.js';
import { TraceInterceptor } from './shared/http/trace-interceptor.js';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
    bufferLogs: false,
  });

  app.use(helmet());
  app.enableShutdownHooks();

  // X-Forwarded-For carrega o endereço do cliente amplify
  // e o throttling só é útil se o endereço for confiável
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.setGlobalPrefix('v1');

  app.useGlobalFilters(new DomainExceptionFilter());
  app.useGlobalInterceptors(new TraceInterceptor());

  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  new Logger('Bootstrap').log(`API listening on http://localhost:${port}/v1`);
}

void bootstrap();
