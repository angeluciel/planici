import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { TransactionHandle } from '@modules/forms/ports/form-repository.js';
import {
  ServiceDeleteConfirmationRequiredError,
  ServiceHasHistoryError,
  ServiceNotFoundError,
} from '../../domain/errors/service.errors.js';
import {
  SERVICE_HISTORY_READER,
  type ServiceHistoryReader,
} from '../../ports/service-history.reader.js';
import {
  SERVICE_REPOSITORY,
  type ServiceRepository,
} from '../../ports/service.repository.js';
import { DeleteServiceCommand } from './delete-service.command.js';

@CommandHandler(DeleteServiceCommand)
export class DeleteServiceHandler implements ICommandHandler<DeleteServiceCommand> {
  constructor(
    @Inject(SERVICE_REPOSITORY) private readonly services: ServiceRepository,
    @Inject(SERVICE_HISTORY_READER)
    private readonly history: ServiceHistoryReader,
  ) {}

  async execute(command: DeleteServiceCommand): Promise<void> {
    const { membership, serviceId, payload } = command;
    membership.assertCanManage();
    const tenantId = membership.tenant.id;

    await this.services.transaction(tenantId, async (tx) => {
      // the row lock holds off a concurrent edit while the checks run
      const service = await this.services.lockById(tx, tenantId, serviceId);
      if (!service) throw new ServiceNotFoundError();

      // SPEC-0005 section 6 order: 404, typed name, history (R8, R7)
      if (payload.confirmName?.trim() !== service.name) {
        throw new ServiceDeleteConfirmationRequiredError();
      }

      const hasHistory = await this.history.hasHistory(
        tenantId,
        serviceId,
        tx as unknown as TransactionHandle,
      );
      if (hasHistory) throw new ServiceHasHistoryError();

      // the cascade removes the service row and its values
      await this.services.deleteRecord(tx, tenantId, service.formRecordId);
    });
  }
}
