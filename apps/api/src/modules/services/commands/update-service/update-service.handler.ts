import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  type ServiceResponse,
  ServiceAttributesSchema,
  textKey,
} from '@planici/schemas';
import { RecordService } from '@modules/records/application/record.service.js';
import { RecordNotFoundError } from '@modules/records/domain/errors/record.errors.js';
import { parseOrThrow } from '@shared/list/parse-or-throw.js';
import { ServicePresenter } from '../../application/present-service.js';
import { ServiceNotFoundError } from '../../domain/errors/service.errors.js';
import {
  SERVICE_REPOSITORY,
  type ServiceRepository,
} from '../../ports/service.repository.js';
import { UpdateServiceCommand } from './update-service.command.js';

@CommandHandler(UpdateServiceCommand)
export class UpdateServiceHandler implements ICommandHandler<UpdateServiceCommand> {
  constructor(
    @Inject(SERVICE_REPOSITORY) private readonly services: ServiceRepository,
    private readonly records: RecordService,
    private readonly presenter: ServicePresenter,
  ) {}

  async execute(command: UpdateServiceCommand): Promise<ServiceResponse> {
    const { membership, serviceId, payload } = command;
    membership.assertCanManage();
    const tenantId = membership.tenant.id;

    return this.services.transaction(tenantId, async (tx) => {
      const service = await this.services.lockById(tx, tenantId, serviceId);
      if (!service) throw new ServiceNotFoundError();

      // SPEC-0003 section 6 steps 3 and 4
      const draft = await this.records
        .openForUpdate(tx, tenantId, service.formRecordId, 'service', {
          formVersion: payload.formVersion,
          revision: payload.revision,
        })
        .catch((error: unknown) => {
          throw error instanceof RecordNotFoundError
            ? new ServiceNotFoundError()
            : error;
        });

      // SPEC-0005 section 6 order: attributes, values, name taken
      const attributes = parseOrThrow(ServiceAttributesSchema, payload);

      const values = draft.checkValues(payload.values);
      await draft.replace(values);

      await this.services.updateAttributes(tx, tenantId, serviceId, {
        name: attributes.name,
        nameKey: textKey(attributes.name),
        durationMinutes: attributes.durationMinutes,
        priceCents: attributes.priceCents,
      });

      const stored = await this.services.find(tenantId, serviceId, tx);
      return this.presenter.present(stored!, tx);
    });
  }
}
