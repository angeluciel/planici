import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { FormVersionResponse } from '@planici/schemas';
import {
  FormNotFoundError,
  FormVersionNotFoundError,
} from '../../domain/errors/form.errors.js';
import { toPublicField } from '../../domain/form-template.js';
import {
  FORM_RECORD_STORE,
  type FormRecordStore,
} from '../../ports/form-record-store.js';
import {
  FORM_REPOSITORY,
  type FormRepository,
} from '../../ports/form-repository.js';
import { GetFormVersionQuery } from './get-form-version.query.js';

@QueryHandler(GetFormVersionQuery)
export class GetFormVersionHandler implements IQueryHandler<GetFormVersionQuery> {
  constructor(
    @Inject(FORM_REPOSITORY) private readonly forms: FormRepository,
    @Inject(FORM_RECORD_STORE) private readonly records: FormRecordStore,
  ) {}

  async execute(query: GetFormVersionQuery): Promise<FormVersionResponse> {
    const tenantId = query.membership.tenant.id;

    const form = await this.forms.findById(tenantId, query.formId);
    if (!form) throw new FormNotFoundError();

    const fields = await this.forms.findVersionFields(
      tenantId,
      form.id,
      query.version,
    );
    if (!fields) throw new FormVersionNotFoundError();

    const valueCounts = await this.records.valueCountsByField(
      tenantId,
      form.id,
    );

    return {
      version: query.version,
      fields: fields.map((field) => toPublicField(field, valueCounts)),
    };
  }
}
