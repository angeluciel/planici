import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  DeleteConfirmationRequiredError,
  FormInUseError,
  FormNotFoundError,
  FormRecordsHaveHistoryError,
} from '../../domain/errors/form.errors.js';
import {
  FORM_RECORD_STORE,
  type FormRecordStore,
} from '../../ports/form-record-store.js';
import {
  FORM_REPOSITORY,
  type FormRepository,
} from '../../ports/form-repository.js';
import {
  RECORD_HISTORY_READER,
  type RecordHistoryReader,
} from '../../ports/record-history.reader.js';
import { DeleteFormCommand } from './delete-form.command.js';

@CommandHandler(DeleteFormCommand)
export class DeleteFormHandler implements ICommandHandler<DeleteFormCommand> {
  constructor(
    @Inject(FORM_REPOSITORY) private readonly forms: FormRepository,
    @Inject(FORM_RECORD_STORE) private readonly records: FormRecordStore,
    @Inject(RECORD_HISTORY_READER)
    private readonly history: RecordHistoryReader,
  ) {}

  async execute(command: DeleteFormCommand): Promise<void> {
    const { membership, formId, payload } = command;
    membership.assertCanManage();
    const tenantId = membership.tenant.id;

    await this.forms.transaction(tenantId, async (tx) => {
      // the row lock holds off record inserts until the counts below are final
      const stored = await this.forms.lockById(tx, tenantId, formId);
      if (!stored) throw new FormNotFoundError();

      // SPEC-0001 section 6 order: 404, typed name, in use, history
      if (payload.confirmName?.trim() !== stored.name)
        throw new DeleteConfirmationRequiredError();

      const { recordCount } = await this.records.counts(tenantId, formId, tx);
      if (recordCount > 0) {
        if (payload.deleteRecords !== true) throw new FormInUseError();

        const withHistory = await this.history.countRecordsWithHistory(
          tenantId,
          formId,
          tx,
        );
        if (withHistory > 0) throw new FormRecordsHaveHistoryError();

        await this.records.deleteAll(tx, tenantId, formId);
      }

      await this.forms.deleteForm(tx, tenantId, formId);
    });
  }
}
