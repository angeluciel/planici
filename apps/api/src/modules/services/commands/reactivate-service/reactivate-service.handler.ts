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
import { ReactivateServiceCommand } from './reactivate-service.command.js';

@CommandHandler(ReactivateServiceCommand)
export class ReactivateServiceHandler implements ICommandHandler<ReactivateServiceCommand> {
  constructor(
    @Inject(SERVICE_REPOSITORY) private readonly services: ServiceRepository,
    private readonly presenter: ServicePresenter,
  ) {}

  async execute(command: ReactivateServiceCommand): Promise<ServiceResponse> {
    const { membership, serviceId } = command;
    membership.assertCanManage();
    const tenantId = membership.tenant.id;

    return this.services.transaction(tenantId, async (tx) => {
      const service = await this.services.lockById(tx, tenantId, serviceId);
      if (!service) throw new ServiceNotFoundError();
      if (service.status === 'active') throw new ServiceStatusUnchangedError();

      // the service row only: the record's revision and updated_at stay (AC-0003-82),
      const updatedAt = await this.services.setStatus(
        tx,
        tenantId,
        serviceId,
        'active',
      );

      // while the service's own last update time moves (SPEC-0006 R9)
      return this.presenter.present(
        { ...service, status: 'active', updatedAt },
        tx,
      );
    });
  }
}
