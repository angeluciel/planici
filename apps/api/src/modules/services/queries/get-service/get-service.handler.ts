import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { ServiceResponse } from '@planici/schemas';
import { ServicePresenter } from '../../application/present-service.js';
import { ServiceNotFoundError } from '../../domain/errors/service.errors.js';
import {
  SERVICE_REPOSITORY,
  type ServiceRepository,
} from '../../ports/service.repository.js';
import { GetServiceQuery } from './get-service.query.js';

@QueryHandler(GetServiceQuery)
export class GetServiceHandler implements IQueryHandler<GetServiceQuery> {
  constructor(
    @Inject(SERVICE_REPOSITORY) private readonly services: ServiceRepository,
    private readonly presenter: ServicePresenter,
  ) {}

  async execute(query: GetServiceQuery): Promise<ServiceResponse> {
    query.membership.assertCanManage();

    const service = await this.services.find(
      query.membership.tenant.id,
      query.serviceId,
    );
    if (!service) throw new ServiceNotFoundError();

    return this.presenter.present(service);
  }
}
