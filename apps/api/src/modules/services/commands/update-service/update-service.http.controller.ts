import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  type ServiceResponse,
  ServiceIdSchema,
  RecordUpdateEnvelopeSchema,
  type RecordUpdateEnvelope,
} from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { JwtAccessGuard } from '@modules/auth/http/jwt-access.guard.js';
import { ActiveTenantGuard } from '@modules/tenants/http/active-tenant.guard.js';
import { CurrentMembership } from '@modules/tenants/http/current-tenant.decorator.js';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';
import { ZodBody, ZodParam } from '@shared/http/zod-validation.pipe.js';
import { ServiceNotFoundError } from '../../domain/errors/service.errors.js';
import { UpdateServiceCommand } from './update-service.command.js';

@ApiTags(routesV1.services.root)
@Controller({ path: routesV1.services.root, version: '1' })
export class UpdateServiceHttpController {
  constructor(private readonly commands: CommandBus) {}

  @ApiBearerAuth()
  @Patch(':serviceId')
  @UseGuards(JwtAccessGuard, ActiveTenantGuard)
  update(
    @CurrentMembership() membership: Membership,
    // the envelope (422) comes before the id's 404 (SPEC-0005 plan, API, routes)
    @Body(new ZodBody(RecordUpdateEnvelopeSchema))
    body: RecordUpdateEnvelope,
    @Param(
      'serviceId',
      new ZodParam(ServiceIdSchema, () => new ServiceNotFoundError()),
    )
    serviceId: string,
  ): Promise<ServiceResponse> {
    return this.commands.execute(
      new UpdateServiceCommand(membership, serviceId, body),
    );
  }
}
