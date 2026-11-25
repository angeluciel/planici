import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  type ListServicesQueryData,
  ListServicesQuerySchema,
  type ServiceListResponse,
} from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { JwtAccessGuard } from '@modules/auth/http/jwt-access.guard.js';
import { ActiveTenantGuard } from '@modules/tenants/http/active-tenant.guard.js';
import { CurrentMembership } from '@modules/tenants/http/current-tenant.decorator.js';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';
import { ZodBody } from '@shared/http/zod-validation.pipe.js';
import { ListServicesQuery } from './list-services.query.js';

@ApiTags(routesV1.services.root)
@Controller({ path: routesV1.services.root, version: '1' })
export class ListServicesHttpController {
  constructor(private readonly queries: QueryBus) {}

  @ApiBearerAuth()
  @Get()
  @UseGuards(JwtAccessGuard, ActiveTenantGuard)
  list(
    @CurrentMembership() membership: Membership,
    @Query({
      schema: ListServicesQuerySchema,
      pipes: [new ZodBody(ListServicesQuerySchema)],
    })
    query: ListServicesQueryData,
  ): Promise<ServiceListResponse> {
    return this.queries.execute(new ListServicesQuery(membership, query));
  }
}
