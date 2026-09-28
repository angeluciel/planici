import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TenantResponse } from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { JwtAccessGuard } from '@modules/auth/http/jwt-access.guard.js';
import type { Membership } from '../../domain/tenant.entity.js';
import { ActiveTenantGuard } from '../../http/active-tenant.guard.js';
import { CurrentMembership } from '../../http/current-tenant.decorator.js';
import { GetTenantQuery } from './get-tenant.query.js';

@ApiTags(routesV1.tenants.root)
@Controller({
  path: routesV1.tenants.root,
  version: '1',
})
export class GetTenantHttpController {
  constructor(private readonly queries: QueryBus) {}

  @ApiBearerAuth()
  @Get(':tenantId')
  @UseGuards(JwtAccessGuard, ActiveTenantGuard)
  get(@CurrentMembership() membership: Membership): Promise<TenantResponse> {
    return this.queries.execute(new GetTenantQuery(membership));
  }
}
