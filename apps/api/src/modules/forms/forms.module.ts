import { type DynamicModule, Module, type Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '@modules/auth/auth.module.js';
import { TenantsModule } from '@modules/tenants/tenants.module.js';
import { FieldValueCipher } from '@shared/crypto/field-value.cipher.js';
import { ArchiveFormHandler } from './commands/archive-form/archive-form.handler.js';
import { ArchiveFormHttpController } from './commands/archive-form/archive-form.http.controller.js';
import { CreateFormHandler } from './commands/create-form/create-form.handler.js';
import { CreateFormHttpController } from './commands/create-form/create-form.http.controller.js';
import { DeleteFormHandler } from './commands/delete-form/delete-form.handler.js';
import { DeleteFormHttpController } from './commands/delete-form/delete-form.http.controller.js';
import { UnarchiveFormHandler } from './commands/unarchive-form/unarchive-form.handler.js';
import { UnarchiveFormHttpController } from './commands/unarchive-form/unarchive-form.http.controller.js';
import { UpdateFormHandler } from './commands/update-form/update-form.handler.js';
import { UpdateFormHttpController } from './commands/update-form/update-form.http.controller.js';
import { DrizzleFormRecordStore } from './infrastructure/persistence/form-record.drizzle.store.js';
import { DrizzleFormRepository } from './infrastructure/persistence/form.drizzle.repository.js';
import { ZeroRecordHistoryReader } from './infrastructure/adapters/zero-record-history.reader.js';
import { FIELD_VALUE_CIPHER } from './ports/field-value.cipher.js';
import { FORM_RECORD_STORE } from './ports/form-record-store.js';
import { FORM_REPOSITORY } from './ports/form-repository.js';
import { RECORD_HISTORY_READER } from './ports/record-history.reader.js';
import {
  SYSTEM_FIELD_PRESENCE,
  type SystemFieldPresence,
} from './ports/system-field-presence.js';
import { GetFormHandler } from './queries/get-form/get-form.handler.js';
import { GetFormHttpController } from './queries/get-form/get-form.http.controller.js';
import { GetFormVersionHandler } from './queries/get-form-version/get-form-version.handler.js';
import { GetFormVersionHttpController } from './queries/get-form-version/get-form-version.http.controller.js';
import { ListFormsHandler } from './queries/list-forms/list-forms.handler.js';
import { ListFormsHttpController } from './queries/list-forms/list-forms.http.controller.js';
import { PreviewFormChangesHandler } from './queries/preview-form-changes/preview-form-changes.handler.js';
import { PreviewFormChangesHttpController } from './queries/preview-form-changes/preview-form-changes.http.controller.js';

export type FormsModuleOptions = {
  /**
   * Adapter for `SystemFieldPresence`. The clients module provides the real one
   * (SPEC-0004); `app.module.ts` passes the class, so FormsModule and
   * ClientsModule never import each other.
   */
  systemFieldPresence: Type<SystemFieldPresence>;
};

const commandHandlers = [
  CreateFormHandler,
  UpdateFormHandler,
  ArchiveFormHandler,
  UnarchiveFormHandler,
  DeleteFormHandler,
];

const queryHandlers = [
  ListFormsHandler,
  GetFormHandler,
  GetFormVersionHandler,
  PreviewFormChangesHandler,
];

const httpControllers = [
  ListFormsHttpController,
  CreateFormHttpController,
  GetFormHttpController,
  UpdateFormHttpController,
  PreviewFormChangesHttpController,
  GetFormVersionHttpController,
  ArchiveFormHttpController,
  UnarchiveFormHttpController,
  DeleteFormHttpController,
];

@Module({})
export class FormsModule {
  static forRoot(options: FormsModuleOptions): DynamicModule {
    return {
      module: FormsModule,
      imports: [CqrsModule, JwtModule.register({}), AuthModule, TenantsModule],
      controllers: httpControllers,
      providers: [
        ...commandHandlers,
        ...queryHandlers,
        { provide: FORM_REPOSITORY, useClass: DrizzleFormRepository },
        { provide: FORM_RECORD_STORE, useClass: DrizzleFormRecordStore },
        { provide: RECORD_HISTORY_READER, useClass: ZeroRecordHistoryReader },
        {
          provide: SYSTEM_FIELD_PRESENCE,
          useClass: options.systemFieldPresence,
        },
        {
          provide: FIELD_VALUE_CIPHER,
          inject: [ConfigService],
          useFactory: (config: ConfigService) =>
            new FieldValueCipher(config.getOrThrow<string>('FIELD_VALUES_KEY')),
        },
      ],
      exports: [FORM_REPOSITORY, FORM_RECORD_STORE],
    };
  }
}
