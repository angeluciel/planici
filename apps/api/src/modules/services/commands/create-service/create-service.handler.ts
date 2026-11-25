import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  type ServiceResponse,
  ServiceAttributesSchema,
  textKey,
} from '@planici/schemas';
import { RecordService } from '@modules/records/application/record.service.js';
import { parseOrThrow } from '@shared/list/parse-or-throw.js';
import { ServicePresenter } from '../../application/present-service.js';
import {
  SERVICE_REPOSITORY,
  type ServiceRepository,
} from '../../ports/service.repository.js';
import { CreateServiceCommand } from './create-service.command.js';

@CommandHandler(CreateServiceCommand)
export class CreateServiceHandler implements ICommandHandler<CreateServiceCommand> {
  constructor(
    @Inject(SERVICE_REPOSITORY) private readonly services: ServiceRepository,
    private readonly records: RecordService,
    private readonly presenter: ServicePresenter,
  ) {}

  async execute(command: CreateServiceCommand): Promise<ServiceResponse> {
    const { membership, payload } = command;
    membership.assertCanManage();
    const tenantId = membership.tenant.id;

    return this.services.transaction(tenantId, async (tx) => {
      // SPEC-0003 section 6 steps 2 to 4
      const draft = await this.records.openForCreate(tx, tenantId, 'service', {
        formId: payload.formId,
        formVersion: payload.formVersion,
      });

      // SPEC-0005 section 6 order: name, duration, price, currency, values, name taken
      const attributes = parseOrThrow(ServiceAttributesSchema, payload);

      const values = draft.checkValues(payload.values);
      const formRecordId = await draft.insert(values);

      const { id } = await this.services.insert(tx, {
        tenantId,
        formRecordId,
        name: attributes.name,
        nameKey: textKey(attributes.name),
        durationMinutes: attributes.durationMinutes,
        priceCents: attributes.priceCents,
      });

      const stored = await this.services.find(tenantId, id, tx);
      return this.presenter.present(stored!, tx);
    });
  }
}
