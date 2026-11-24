import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { ClientResponse } from '@planici/schemas';
import { ClientPresenter } from '../../application/present-client.js';
import {
  ClientNotFoundError,
  ClientStatusUnchangedError,
} from '../../domain/errors/client.errors.js';
import {
  CLIENT_REPOSITORY,
  type ClientRepository,
} from '../../ports/client.repository.js';
import { InactivateClientCommand } from './inactivate-client.command.js';

@CommandHandler(InactivateClientCommand)
export class InactivateClientHandler implements ICommandHandler<InactivateClientCommand> {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
    private readonly presenter: ClientPresenter,
  ) {}

  async execute(command: InactivateClientCommand): Promise<ClientResponse> {
    const { membership, clientId } = command;
    membership.assertCanManage();
    const tenantId = membership.tenant.id;

    return this.clients.transaction(tenantId, async (tx) => {
      const client = await this.clients.lockById(tx, tenantId, clientId);
      if (!client) throw new ClientNotFoundError();
      if (client.status === 'inactive') throw new ClientStatusUnchangedError();

      // the client row only: the record's revision and updated_at stay (AC-0003-82),
      const updatedAt = await this.clients.setStatus(
        tx,
        tenantId,
        clientId,
        'inactive',
      );

      // while the client's own last update time moves (SPEC-0006 R9)
      return this.presenter.present(
        { ...client, status: 'inactive', updatedAt },
        tx,
      );
    });
  }
}
