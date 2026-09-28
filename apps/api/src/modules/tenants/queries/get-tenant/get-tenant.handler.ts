import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { TenantResponse } from '@planici/schemas';
import { GetTenantQuery } from './get-tenant.query.js';

@QueryHandler(GetTenantQuery)
export class GetTenantHandler implements IQueryHandler<GetTenantQuery> {
  async execute(query: GetTenantQuery): Promise<TenantResponse> {
    return query.membership.toPublic();
  }
}
