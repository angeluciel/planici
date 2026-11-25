import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type ServiceResponse, ServiceIdSchema } from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { JwtAccessGuard } from '@modules/auth/http/jwt-access.guard.js';
import { ActiveTenantGuard } from '@modules/tenants/http/active-tenant.guard.js';
import { CurrentMembership } from '@modules/tenants/http/current-tenant.decorator.js';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';
import { ZodParam } from '@shared/http/zod-validation.pipe.js';
import { ServiceNotFoundError } from '../../domain/errors/service.errors.js';
import { InactivateServiceCommand } from './inactivate-service.command.js';

@ApiTags(routesV1.services.root)
@Controller({ path: routesV1.services.root, version: '1' })
export class InactivateServiceHttpController {
  constructor(private readonly commands: CommandBus) {}

  @ApiBearerAuth()
  @Post(':serviceId/inactivate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAccessGuard, ActiveTenantGuard)
  inactivate(
    @CurrentMembership() membership: Membership,
    @Param(
      'serviceId',
      new ZodParam(ServiceIdSchema, () => new ServiceNotFoundError()),
    )
    serviceId: string,
  ): Promise<ServiceResponse> {
    return this.commands.execute(
      new InactivateServiceCommand(membership, serviceId),
    );
  }
}
