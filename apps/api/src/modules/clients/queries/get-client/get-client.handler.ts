import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { ClientResponse } from '@planici/schemas';
import { ClientPresenter } from '../../application/present-client.js';
import { ClientNotFoundError } from '../../domain/errors/client.errors.js';
import {
  CLIENT_REPOSITORY,
  type ClientRepository,
} from '../../ports/client.repository.js';
import { GetClientQuery } from './get-client.query.js';

@QueryHandler(GetClientQuery)
export class GetClientHandler implements IQueryHandler<GetClientQuery> {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
    private readonly presenter: ClientPresenter,
  ) {}

  async execute(query: GetClientQuery): Promise<ClientResponse> {
    query.membership.assertCanManage();

    const client = await this.clients.find(
      query.membership.tenant.id,
      query.clientId,
    );
    if (!client) throw new ClientNotFoundError();

    return this.presenter.present(client);
  }
}
