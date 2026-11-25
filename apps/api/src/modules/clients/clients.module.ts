import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { CLIENT_CONSENT_TEXT_VERSION } from '@planici/schemas';
import { AuthModule } from '@modules/auth/auth.module.js';
import { RecordsModule } from '@modules/records/records.module.js';
import { TenantsModule } from '@modules/tenants/tenants.module.js';
import { ClientPresenter } from './application/present-client.js';
import { CreateClientHandler } from './commands/create-client/create-client.handler.js';
import { CreateClientHttpController } from './commands/create-client/create-client.http.controller.js';
import { DeleteClientHandler } from './commands/delete-client/delete-client.handler.js';
import { DeleteClientHttpController } from './commands/delete-client/delete-client.http.controller.js';
import { InactivateClientHandler } from './commands/inactivate-client/inactivate-client.handler.js';
import { InactivateClientHttpController } from './commands/inactivate-client/inactivate-client.http.controller.js';
import { ReactivateClientHandler } from './commands/reactivate-client/reactivate-client.handler.js';
import { ReactivateClientHttpController } from './commands/reactivate-client/reactivate-client.http.controller.js';
import { UpdateClientHandler } from './commands/update-client/update-client.handler.js';
import { UpdateClientHttpController } from './commands/update-client/update-client.http.controller.js';
import { deriveCursorKey } from '@shared/list/list-cursor.js';
import { ZeroClientHistoryReader } from './infrastructure/zero-client-history.reader.js';
import { DrizzleClientRepository } from './infrastructure/persistence/client.drizzle.repository.js';
import { CLIENT_CONSENT_VERSION } from './ports/client-consent-version.js';
import { CLIENT_CURSOR_KEY } from './ports/client-cursor-key.js';
import { CLIENT_HISTORY_READER } from './ports/client-history.reader.js';
import { CLIENT_REPOSITORY } from './ports/client.repository.js';
import { GetClientHandler } from './queries/get-client/get-client.handler.js';
import { GetClientHttpController } from './queries/get-client/get-client.http.controller.js';
import { ListClientsHandler } from './queries/list-clients/list-clients.handler.js';
import { ListClientsHttpController } from './queries/list-clients/list-clients.http.controller.js';

const commandHandlers = [
  CreateClientHandler,
  UpdateClientHandler,
  InactivateClientHandler,
  ReactivateClientHandler,
  DeleteClientHandler,
];

const queryHandlers = [GetClientHandler, ListClientsHandler];

const httpControllers = [
  ListClientsHttpController,
  CreateClientHttpController,
  GetClientHttpController,
  UpdateClientHttpController,
  InactivateClientHttpController,
  ReactivateClientHttpController,
  DeleteClientHttpController,
];

/**
 * SPEC-0004: the `/v1/clients` routes. The record checks and tables are
 * SPEC-0003's `RecordService`; this module owns the `clients` table, the
 * consent attestation and the list.
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
    ClientPresenter,
    { provide: CLIENT_REPOSITORY, useClass: DrizzleClientRepository },
    { provide: CLIENT_HISTORY_READER, useClass: ZeroClientHistoryReader },
    { provide: CLIENT_CONSENT_VERSION, useValue: CLIENT_CONSENT_TEXT_VERSION },
    {
      provide: CLIENT_CURSOR_KEY,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        deriveCursorKey(
          config.getOrThrow<string>('JWT_SECRET'),
          'planici:list-cursor:v1',
        ),
    },
  ],
})
export class ClientsModule {}
