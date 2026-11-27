import 'reflect-metadata';

import { Logger, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  DocumentBuilder,
  SwaggerDocumentOptions,
  SwaggerModule,
} from '@nestjs/swagger';
import { createSchema } from 'zod-openapi';
import helmet from 'helmet';

import { AppModule, ObserveInstrument } from './app.module.js';
import { DomainExceptionFilter } from './shared/http/domain-exception.filter.js';
import { TraceInterceptor } from './shared/http/trace-interceptor.js';
import { applyTrustedCallers } from './shared/http/trusted-callers.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
    bufferLogs: false,
  });

  app.use(helmet());
  app.enableShutdownHooks();

  // SPEC-0009 R5: only the web app (TRUSTED_CALLERS) may state the client
  // address; the throttler and the stored addresses read it from request.ip.
  applyTrustedCallers(
    app,
    app.get(ConfigService).getOrThrow<string>('TRUSTED_CALLERS'),
  );

  app.setGlobalPrefix('/api');

  app.enableVersioning({
    type: VersioningType.URI,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Planici API')
    .setDescription('Planici HTTP API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const swaggerOptions: SwaggerDocumentOptions = {
    standardSchemaConverter: (schema, { schemaType }) => {
      const converted = createSchema(schema as never, {
        io: schemaType,
        openapiVersion: '3.0.0',
      });

      return {
        schema: converted.schema,
        components: converted.components,
      };
    },

    operationIdFactory: (_controllerKey, methodKey) => methodKey,
  };

  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig, swaggerOptions);

  SwaggerModule.setup('docs', app, documentFactory, {
    jsonDocumentUrl: 'docs/openapi.json',
  });

  app.useGlobalFilters(new DomainExceptionFilter());
  app.useGlobalInterceptors(new TraceInterceptor());

  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  const port = Number(process.env.PORT ?? 3000);

  await app.listen(port);

  new Logger('Bootstrap').log(`API listening on http://localhost:${port}/api`);
}

void bootstrap();
