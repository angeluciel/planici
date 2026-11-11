import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  FormListResponse,
  type ListFormsQueryData,
  ListFormsQuerySchema,
} from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { JwtAccessGuard } from '@modules/auth/http/jwt-access.guard.js';
import { ActiveTenantGuard } from '@modules/tenants/http/active-tenant.guard.js';
import { CurrentMembership } from '@modules/tenants/http/current-tenant.decorator.js';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';
import { ZodBody } from '@shared/http/zod-validation.pipe.js';
import { ListFormsQuery } from './list-forms.query.js';

@ApiTags(routesV1.forms.root)
@Controller({ path: routesV1.forms.root, version: '1' })
export class ListFormsHttpController {
  constructor(private readonly queries: QueryBus) {}

  @ApiBearerAuth()
  @Get()
  @UseGuards(JwtAccessGuard, ActiveTenantGuard)
  list(
    @CurrentMembership() membership: Membership,
    @Query({
      schema: ListFormsQuerySchema,
      pipes: [new ZodBody(ListFormsQuerySchema)],
    })
    query: ListFormsQueryData,
  ): Promise<FormListResponse> {
    return this.queries.execute(new ListFormsQuery(membership, query));
  }
}
