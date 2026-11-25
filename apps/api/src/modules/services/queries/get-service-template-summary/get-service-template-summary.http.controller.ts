import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { ServiceTemplateSummary } from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { JwtAccessGuard } from '@modules/auth/http/jwt-access.guard.js';
import { ActiveTenantGuard } from '@modules/tenants/http/active-tenant.guard.js';
import { CurrentMembership } from '@modules/tenants/http/current-tenant.decorator.js';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';
import { GetServiceTemplateSummaryQuery } from './get-service-template-summary.query.js';

@ApiTags(routesV1.services.root)
@Controller({ path: routesV1.services.root, version: '1' })
export class GetServiceTemplateSummaryHttpController {
  constructor(private readonly queries: QueryBus) {}

  /** The narrow chips (SPEC-0005 R14). Registered before `GET :serviceId` (plan, G-10). */
  @ApiBearerAuth()
  @Get('templates')
  @UseGuards(JwtAccessGuard, ActiveTenantGuard)
  summary(
    @CurrentMembership() membership: Membership,
  ): Promise<ServiceTemplateSummary> {
    return this.queries.execute(new GetServiceTemplateSummaryQuery(membership));
  }
}
