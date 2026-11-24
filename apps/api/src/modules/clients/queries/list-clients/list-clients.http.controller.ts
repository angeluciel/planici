import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  type ClientListResponse,
  type ListClientsQueryData,
  ListClientsQuerySchema,
} from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { JwtAccessGuard } from '@modules/auth/http/jwt-access.guard.js';
import { ActiveTenantGuard } from '@modules/tenants/http/active-tenant.guard.js';
import { CurrentMembership } from '@modules/tenants/http/current-tenant.decorator.js';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';
import { ZodBody } from '@shared/http/zod-validation.pipe.js';
import { ListClientsQuery } from './list-clients.query.js';

@ApiTags(routesV1.clients.root)
@Controller({ path: routesV1.clients.root, version: '1' })
export class ListClientsHttpController {
  constructor(private readonly queries: QueryBus) {}

  @ApiBearerAuth()
  @Get()
  @UseGuards(JwtAccessGuard, ActiveTenantGuard)
  list(
    @CurrentMembership() membership: Membership,
    @Query({
      schema: ListClientsQuerySchema,
      pipes: [new ZodBody(ListClientsQuerySchema)],
    })
    query: ListClientsQueryData,
  ): Promise<ClientListResponse> {
    return this.queries.execute(new ListClientsQuery(membership, query));
  }
}
