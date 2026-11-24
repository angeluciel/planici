import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
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
import { GetFormQuery } from './get-form.query.js';

@QueryHandler(GetFormQuery)
export class GetFormHandler implements IQueryHandler<GetFormQuery> {
  constructor(
    @Inject(FORM_REPOSITORY) private readonly forms: FormRepository,
    @Inject(FORM_RECORD_STORE) private readonly records: FormRecordStore,
    @Inject(RECORD_HISTORY_READER)
    private readonly history: RecordHistoryReader,
  ) {}

  async execute(query: GetFormQuery): Promise<FormTemplateDto> {
    const tenantId = query.membership.tenant.id;
    const stored = await this.forms.findById(tenantId, query.formId);
    if (!stored) throw new FormNotFoundError();

    return presentForm(
      FormTemplate.fromStored(stored),
      this.records,
      this.history,
    );
  }
}
