import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { TenantListResponse } from '@planici/schemas';
import {
  TENANT_REPOSITORY,
  type TenantRepository,
} from '../../ports/repositories/tenant.repository.js';
import { ListMyTenantsQuery } from './list-my-tenants.query.js';

@QueryHandler(ListMyTenantsQuery)
export class ListMyTenantsHandler implements IQueryHandler<ListMyTenantsQuery> {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository,
  ) {}

  async execute(query: ListMyTenantsQuery): Promise<TenantListResponse> {
    const memberships = await this.tenants.listMemberships(query.userId);

    return { tenants: memberships.map((membership) => membership.toPublic()) };
  }
}
