import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { FormTemplate as FormTemplateDto } from '@planici/schemas';
import { presentForm } from '../../application/present-form.js';
import {
  FormNotFoundError,
  MigrationConfirmationRequiredError,
  MigrationModeRequiredError,
} from '../../domain/errors/form.errors.js';
import { FieldPolicy } from '../../domain/field-policy.js';
import { FormTemplate } from '../../domain/form-template.js';
import { diffSchema } from '../../domain/schema-diff.js';
import { FormName } from '../../domain/value-objects/form-name.vo.js';
import { toNextVersionShape } from '../../domain/next-version-shape.js';
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
import { UpdateFormCommand } from './update-form.command.js';

@CommandHandler(UpdateFormCommand)
export class UpdateFormHandler implements ICommandHandler<UpdateFormCommand> {
  constructor(
    @Inject(FORM_REPOSITORY) private readonly forms: FormRepository,
    @Inject(FORM_RECORD_STORE) private readonly records: FormRecordStore,
    @Inject(RECORD_HISTORY_READER)
    private readonly history: RecordHistoryReader,
  ) {}

  async execute(command: UpdateFormCommand): Promise<FormTemplateDto> {
    const { membership, formId, payload } = command;
    membership.assertCanManage();
    const tenantId = membership.tenant.id;

    // metadata, publication and migration are stored together or not at all (R10)
    const template = await this.forms.transaction(tenantId, async (tx) => {
      const stored = await this.forms.lockById(tx, tenantId, formId);
      if (!stored) throw new FormNotFoundError();

      const template = FormTemplate.fromStored(stored);
      template.assertRevision(payload.revision);

      // an update without `fields` runs no field rule (plan, API point 6)
      const planned = payload.fields
        ? FieldPolicy.plan(
            { formType: stored.type, mode: 'update', current: stored.fields },
            payload.fields,
          )
        : null;

      if (payload.name !== undefined)
        template.rename(FormName.create(payload.name));
      if (payload.description !== undefined)
        template.describe(payload.description);
      template.markChanged();

      // writes the name first, so a clash (409) comes before the migration checks
      await this.forms.updateRow(tx, template.toStored());
      if (!planned) return template;

      const diff = diffSchema(stored.fields, planned);
      template.replaceFields(planned);

      if (!diff.schemaChanged) {
        // metadata applies to every version and publishes nothing (R14)
        await this.forms.publishVersion(
          tx,
          template.toStored(),
          stored.latestVersion,
        );
        return template;
      }

      const next = toNextVersionShape(planned);
      const { recordCount } = await this.records.counts(tenantId, formId, tx);
      const migration = payload.migration;

      if (recordCount > 0) {
        if (!migration) throw new MigrationModeRequiredError();

        if (migration.mode === 'update_all') {
          const losing = await this.records.countRecordsLosingAnswers(
            tenantId,
            formId,
            next,
            tx,
          );
          // R9 comparison: trimmed, otherwise exact
          if (losing > 0 && migration.confirmName?.trim() !== stored.name)
            throw new MigrationConfirmationRequiredError();
        }
      }

      const version = template.startNextVersion();
      await this.forms.publishVersion(tx, template.toStored(), version);

      if (recordCount > 0 && migration?.mode === 'update_all') {
        // repoint first, so a record update holding its lock makes this wait
        await this.records.repointAll(tx, tenantId, formId, version);
        await this.records.deleteLostAnswers(tx, tenantId, formId, next);
      }

      return template;
    });

    return presentForm(template, this.records, this.history);
  }
}
