import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TenantsModule } from '@modules/tenants/tenants.module.js';
import { FieldValueCipher } from '@shared/crypto/field-value.cipher.js';
import { RecordService } from './application/record.service.js';
import { DrizzleRecordFormReader } from './infrastructure/persistence/record-form.drizzle.reader.js';
import { DrizzleRecordRepository } from './infrastructure/persistence/record.drizzle.repository.js';
import { RECORD_FORM_READER } from './ports/record-form.reader.js';
import { RECORD_REPOSITORY } from './ports/record.repository.js';
import { RECORD_VALUE_CIPHER } from './ports/record-value.cipher.js';

/**
 * SPEC-0003's in-process record service. It has no routes: SPEC-0004 and
 * SPEC-0005 import this module and call `RecordService` inside their own
 * transaction. It never imports `FormsModule`; it reads the template tables
 * through its own reader and builds its own cipher.
 */
@Module({
  imports: [TenantsModule],
  providers: [
    RecordService,
    { provide: RECORD_FORM_READER, useClass: DrizzleRecordFormReader },
    { provide: RECORD_REPOSITORY, useClass: DrizzleRecordRepository },
    {
      provide: RECORD_VALUE_CIPHER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new FieldValueCipher(config.getOrThrow<string>('FIELD_VALUES_KEY')),
    },
  ],
  exports: [RecordService],
})
export class RecordsModule {}
