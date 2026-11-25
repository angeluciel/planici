import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '@modules/auth/auth.module.js';
import { RecordsModule } from '@modules/records/records.module.js';
import { TenantsModule } from '@modules/tenants/tenants.module.js';
import { deriveCursorKey } from '@shared/list/list-cursor.js';
import { ServicePresenter } from './application/present-service.js';
import { CreateServiceHandler } from './commands/create-service/create-service.handler.js';
import { CreateServiceHttpController } from './commands/create-service/create-service.http.controller.js';
import { DeleteServiceHandler } from './commands/delete-service/delete-service.handler.js';
import { DeleteServiceHttpController } from './commands/delete-service/delete-service.http.controller.js';
import { InactivateServiceHandler } from './commands/inactivate-service/inactivate-service.handler.js';
import { InactivateServiceHttpController } from './commands/inactivate-service/inactivate-service.http.controller.js';
import { ReactivateServiceHandler } from './commands/reactivate-service/reactivate-service.handler.js';
import { ReactivateServiceHttpController } from './commands/reactivate-service/reactivate-service.http.controller.js';
import { UpdateServiceHandler } from './commands/update-service/update-service.handler.js';
import { UpdateServiceHttpController } from './commands/update-service/update-service.http.controller.js';
import { DrizzleServiceRepository } from './infrastructure/persistence/service.drizzle.repository.js';
import { ZeroServiceHistoryReader } from './infrastructure/zero-service-history.reader.js';
import { SERVICE_CURSOR_KEY } from './ports/service-cursor-key.js';
import { SERVICE_HISTORY_READER } from './ports/service-history.reader.js';
import { SERVICE_REPOSITORY } from './ports/service.repository.js';
import { GetServiceHandler } from './queries/get-service/get-service.handler.js';
import { GetServiceHttpController } from './queries/get-service/get-service.http.controller.js';
import { GetServiceTemplateSummaryHandler } from './queries/get-service-template-summary/get-service-template-summary.handler.js';
import { GetServiceTemplateSummaryHttpController } from './queries/get-service-template-summary/get-service-template-summary.http.controller.js';
import { ListServicesHandler } from './queries/list-services/list-services.handler.js';
import { ListServicesHttpController } from './queries/list-services/list-services.http.controller.js';

const commandHandlers = [
  CreateServiceHandler,
  UpdateServiceHandler,
  InactivateServiceHandler,
  ReactivateServiceHandler,
  DeleteServiceHandler,
];

const queryHandlers = [
  GetServiceHandler,
  ListServicesHandler,
  GetServiceTemplateSummaryHandler,
];

const httpControllers = [
  ListServicesHttpController,
  // before GetServiceHttpController: `GET /services/templates` must not be
  // parsed as a service id (plan, G-10)
  GetServiceTemplateSummaryHttpController,
  CreateServiceHttpController,
  GetServiceHttpController,
  UpdateServiceHttpController,
  InactivateServiceHttpController,
  ReactivateServiceHttpController,
  DeleteServiceHttpController,
];

/**
 * SPEC-0005: the `/v1/services` routes. The record checks and tables are
 * SPEC-0003's `RecordService`; this module owns the `services` table and the
 * list.
 */
@Module({
  imports: [
    CqrsModule,
    JwtModule.register({}),
    AuthModule,
    TenantsModule,
    RecordsModule,
  ],
  controllers: httpControllers,
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    ServicePresenter,
    { provide: SERVICE_REPOSITORY, useClass: DrizzleServiceRepository },
    { provide: SERVICE_HISTORY_READER, useClass: ZeroServiceHistoryReader },
    {
      provide: SERVICE_CURSOR_KEY,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        deriveCursorKey(
          config.getOrThrow<string>('JWT_SECRET'),
          'planici:services-cursor:v1',
        ),
    },
  ],
})
export class ServicesModule {}
