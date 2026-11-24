import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type ClientResponse, ClientIdSchema } from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { JwtAccessGuard } from '@modules/auth/http/jwt-access.guard.js';
import { ActiveTenantGuard } from '@modules/tenants/http/active-tenant.guard.js';
import { CurrentMembership } from '@modules/tenants/http/current-tenant.decorator.js';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';
import { ZodParam } from '@shared/http/zod-validation.pipe.js';
import { ClientNotFoundError } from '../../domain/errors/client.errors.js';
import { GetClientQuery } from './get-client.query.js';

@ApiTags(routesV1.clients.root)
@Controller({ path: routesV1.clients.root, version: '1' })
export class GetClientHttpController {
  constructor(private readonly queries: QueryBus) {}

  @ApiBearerAuth()
  @Get(':clientId')
  @UseGuards(JwtAccessGuard, ActiveTenantGuard)
  get(
    @CurrentMembership() membership: Membership,
    @Param(
      'clientId',
      new ZodParam(ClientIdSchema, () => new ClientNotFoundError()),
    )
    clientId: string,
  ): Promise<ClientResponse> {
    return this.queries.execute(new GetClientQuery(membership, clientId));
  }
}
