import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { TransactionHandle } from '@modules/forms/ports/form-repository.js';
import {
  ClientDeleteConfirmationRequiredError,
  ClientHasHistoryError,
  ClientNotFoundError,
} from '../../domain/errors/client.errors.js';
import {
  CLIENT_HISTORY_READER,
  type ClientHistoryReader,
} from '../../ports/client-history.reader.js';
import {
  CLIENT_REPOSITORY,
  type ClientRepository,
} from '../../ports/client.repository.js';
import { DeleteClientCommand } from './delete-client.command.js';

@CommandHandler(DeleteClientCommand)
export class DeleteClientHandler implements ICommandHandler<DeleteClientCommand> {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
    @Inject(CLIENT_HISTORY_READER)
    private readonly history: ClientHistoryReader,
  ) {}

  async execute(command: DeleteClientCommand): Promise<void> {
    const { membership, clientId, payload } = command;
    membership.assertCanManage();
    const tenantId = membership.tenant.id;

    await this.clients.transaction(tenantId, async (tx) => {
      // the row lock holds off a concurrent edit while the checks run
      const client = await this.clients.lockById(tx, tenantId, clientId);
      if (!client) throw new ClientNotFoundError();

      // SPEC-0004 section 6 order: 404, typed name, history (R8, R7)
      if (payload.confirmName?.trim() !== client.name) {
        throw new ClientDeleteConfirmationRequiredError();
      }

      const hasHistory = await this.history.hasHistory(
        tenantId,
        clientId,
        tx as unknown as TransactionHandle,
      );
      if (hasHistory) throw new ClientHasHistoryError();

      // the cascade removes the client row and its values
      await this.clients.deleteRecord(tx, tenantId, client.formRecordId);
    });
  }
}
