import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  AvailabilityResponse,
  type TenantSlugAvailabilityQuery,
  TenantSlugAvailabilityQuerySchema,
} from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { JwtAccessGuard } from '@modules/auth/http/jwt-access.guard.js';
import { ZodBody } from '@shared/http/zod-validation.pipe.js';
import { CheckTenantSlugQuery } from './check-tenant-slug.query.js';

@ApiTags(routesV1.tenants.root)
@Controller({
  path: routesV1.tenants.root,
  version: '1',
})
export class CheckTenantSlugHttpController {
  constructor(private readonly queries: QueryBus) {}

  @ApiBearerAuth()
  @Get('availability')
  @UseGuards(JwtAccessGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  availability(
    @Query({
      schema: TenantSlugAvailabilityQuerySchema,
      pipes: [new ZodBody(TenantSlugAvailabilityQuerySchema)],
    })
    query: TenantSlugAvailabilityQuery,
  ): Promise<AvailabilityResponse> {
    return this.queries.execute(new CheckTenantSlugQuery(query.slug));
  }
}
