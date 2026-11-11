import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { FormTemplate as FormTemplateDto } from '@planici/schemas';
import { presentForm } from '../../application/present-form.js';
import { FormNotFoundError } from '../../domain/errors/form.errors.js';
import { FormTemplate } from '../../domain/form-template.js';
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
import { ArchiveFormCommand } from './archive-form.command.js';

@CommandHandler(ArchiveFormCommand)
export class ArchiveFormHandler implements ICommandHandler<ArchiveFormCommand> {
  constructor(
    @Inject(FORM_REPOSITORY) private readonly forms: FormRepository,
    @Inject(FORM_RECORD_STORE) private readonly records: FormRecordStore,
    @Inject(RECORD_HISTORY_READER)
    private readonly history: RecordHistoryReader,
  ) {}

  async execute(command: ArchiveFormCommand): Promise<FormTemplateDto> {
    const { membership, formId } = command;
    membership.assertCanManage();
    const tenantId = membership.tenant.id;

    const template = await this.forms.transaction(tenantId, async (tx) => {
      const stored = await this.forms.lockById(tx, tenantId, formId);
      if (!stored) throw new FormNotFoundError();

      const template = FormTemplate.fromStored(stored);
      template.archive();
      // the revision goes up on every stored change (R11)
      template.markChanged();
      await this.forms.updateRow(tx, template.toStored());

      return template;
    });

    return presentForm(template, this.records, this.history);
  }
}
