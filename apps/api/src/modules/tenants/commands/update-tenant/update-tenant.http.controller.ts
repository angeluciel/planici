import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  TenantResponse,
  type UpdateTenantRequestInput,
  UpdateTenantRequestSchema,
} from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { JwtAccessGuard } from '@modules/auth/http/jwt-access.guard.js';
import { ZodBody } from '@shared/http/zod-validation.pipe.js';
import type { Membership } from '../../domain/tenant.entity.js';
import { ActiveTenantGuard } from '../../http/active-tenant.guard.js';
import { CurrentMembership } from '../../http/current-tenant.decorator.js';
import { UpdateTenantCommand } from './update-tenant.command.js';

@ApiTags(routesV1.tenants.root)
@Controller({
  path: routesV1.tenants.root,
  version: '1',
})
export class UpdateTenantHttpController {
  constructor(private readonly commands: CommandBus) {}

  @ApiBearerAuth()
  @Patch(':tenantId')
  @UseGuards(JwtAccessGuard, ActiveTenantGuard)
  update(
    @CurrentMembership() membership: Membership,
    @Body(new ZodBody(UpdateTenantRequestSchema))
    body: UpdateTenantRequestInput,
  ): Promise<TenantResponse> {
    return this.commands.execute(new UpdateTenantCommand(membership, body));
  }
}
