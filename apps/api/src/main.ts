import 'reflect-metadata';

import { Logger, VersioningType } from '@nestjs/common';
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
import { routesV1 } from './config/app.routes.js';

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

  new Logger('Bootstrap').log(
    `API listening on http://localhost:${port}/${routesV1.version}`,
  );
}

void bootstrap();
