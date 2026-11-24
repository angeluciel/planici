import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { FormTemplate as FormTemplateDto } from '@planici/schemas';
import { FormLimitReachedError } from '../../domain/errors/form.errors.js';
import { FieldPolicy } from '../../domain/field-policy.js';
import { FormTemplate } from '../../domain/form-template.js';
import { FormName } from '../../domain/value-objects/form-name.vo.js';
import {
  FORM_REPOSITORY,
  type FormRepository,
} from '../../ports/form-repository.js';
import { CreateFormCommand } from './create-form.command.js';

/** R19: a tenant has at most 200 templates, archived ones included. */
export const FORMS_PER_TENANT_MAX = 200;

@CommandHandler(CreateFormCommand)
export class CreateFormHandler implements ICommandHandler<CreateFormCommand> {
  constructor(
    @Inject(FORM_REPOSITORY) private readonly forms: FormRepository,
  ) {}

  async execute(command: CreateFormCommand): Promise<FormTemplateDto> {
    const { membership, payload } = command;
    membership.assertCanManage();
    const tenantId = membership.tenant.id;

    // order (plan, Decision 3): shape (pipe), field rules, cap, name (the insert)
    const fields = FieldPolicy.plan(
      { formType: payload.type, mode: 'create', current: [] },
      payload.fields,
    );
    const template = FormTemplate.create({
      tenantId,
      type: payload.type,
      name: FormName.create(payload.name),
      description: payload.description ?? null,
      fields,
    });

    await this.forms.transaction(tenantId, async (tx) => {
      const total = await this.forms.countForTenantLocked(tx, tenantId);
      if (total >= FORMS_PER_TENANT_MAX) throw new FormLimitReachedError();

      await this.forms.insert(tx, template.toStored());
      await this.forms.publishVersion(tx, template.toStored(), 1);
    });

    // a new template has no records
    return template.toPublic({
      recordCount: 0,
      recordsOnOlderVersions: 0,
      recordsWithHistory: 0,
      valueCounts: new Map(),
    });
  }
}
