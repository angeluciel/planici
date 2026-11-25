import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { ServiceResponse } from '@planici/schemas';
import { ServicePresenter } from '../../application/present-service.js';
import {
  ServiceNotFoundError,
  ServiceStatusUnchangedError,
} from '../../domain/errors/service.errors.js';
import {
  SERVICE_REPOSITORY,
  type ServiceRepository,
} from '../../ports/service.repository.js';
import { InactivateServiceCommand } from './inactivate-service.command.js';

@CommandHandler(InactivateServiceCommand)
export class InactivateServiceHandler implements ICommandHandler<InactivateServiceCommand> {
  constructor(
    @Inject(SERVICE_REPOSITORY) private readonly services: ServiceRepository,
    private readonly presenter: ServicePresenter,
  ) {}

  async execute(command: InactivateServiceCommand): Promise<ServiceResponse> {
    const { membership, serviceId } = command;
    membership.assertCanManage();
    const tenantId = membership.tenant.id;

    return this.services.transaction(tenantId, async (tx) => {
      const service = await this.services.lockById(tx, tenantId, serviceId);
      if (!service) throw new ServiceNotFoundError();
      if (service.status === 'inactive')
        throw new ServiceStatusUnchangedError();

      // the service row only: the record's revision and updated_at stay (AC-0003-82),
      const updatedAt = await this.services.setStatus(
        tx,
        tenantId,
        serviceId,
        'inactive',
      );

      // while the service's own last update time moves (SPEC-0006 R9)
      return this.presenter.present(
        { ...service, status: 'inactive', updatedAt },
        tx,
      );
    });
  }
}
