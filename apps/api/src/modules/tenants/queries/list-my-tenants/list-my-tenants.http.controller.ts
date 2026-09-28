import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TenantListResponse } from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '@modules/auth/http/current-user.decorator.js';
import { JwtAccessGuard } from '@modules/auth/http/jwt-access.guard.js';
import { ListMyTenantsQuery } from './list-my-tenants.query.js';

@ApiTags(routesV1.tenants.root)
@Controller({
  path: routesV1.tenants.root,
  version: '1',
})
export class ListMyTenantsHttpController {
  constructor(private readonly queries: QueryBus) {}

  @ApiBearerAuth()
  @Get()
  @UseGuards(JwtAccessGuard)
  list(@CurrentUser() user: AuthenticatedUser): Promise<TenantListResponse> {
    return this.queries.execute(new ListMyTenantsQuery(user.id));
  }
}
