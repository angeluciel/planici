import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type ServiceResponse, ServiceIdSchema } from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { JwtAccessGuard } from '@modules/auth/http/jwt-access.guard.js';
import { ActiveTenantGuard } from '@modules/tenants/http/active-tenant.guard.js';
import { CurrentMembership } from '@modules/tenants/http/current-tenant.decorator.js';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';
import { ZodParam } from '@shared/http/zod-validation.pipe.js';
import { ServiceNotFoundError } from '../../domain/errors/service.errors.js';
import { GetServiceQuery } from './get-service.query.js';

@ApiTags(routesV1.services.root)
@Controller({ path: routesV1.services.root, version: '1' })
export class GetServiceHttpController {
  constructor(private readonly queries: QueryBus) {}

  @ApiBearerAuth()
  @Get(':serviceId')
  @UseGuards(JwtAccessGuard, ActiveTenantGuard)
  get(
    @CurrentMembership() membership: Membership,
    @Param(
      'serviceId',
      new ZodParam(ServiceIdSchema, () => new ServiceNotFoundError()),
    )
    serviceId: string,
  ): Promise<ServiceResponse> {
    return this.queries.execute(new GetServiceQuery(membership, serviceId));
  }
}
