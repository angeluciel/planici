import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { AvailabilityResponse } from '@planici/schemas';
import { TenantSlug } from '../../domain/value-objects/tenant-slug.vo.js';
import {
  TENANT_REPOSITORY,
  type TenantRepository,
} from '../../ports/repositories/tenant.repository.js';
import { CheckTenantSlugQuery } from './check-tenant-slug.query.js';

/** "already in use" hint for the tenant creation form */
@QueryHandler(CheckTenantSlugQuery)
export class CheckTenantSlugHandler implements IQueryHandler<CheckTenantSlugQuery> {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository,
  ) {}

  async execute(query: CheckTenantSlugQuery): Promise<AvailabilityResponse> {
    const taken = await this.tenants.slugExists(
      TenantSlug.create(query.slug).value,
    );

    return { available: !taken };
  }
}
