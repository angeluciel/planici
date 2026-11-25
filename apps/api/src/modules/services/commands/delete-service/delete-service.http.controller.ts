import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ServiceIdSchema,
  type DeleteServiceRequestInput,
  DeleteServiceRequestSchema,
} from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { JwtAccessGuard } from '@modules/auth/http/jwt-access.guard.js';
import { ActiveTenantGuard } from '@modules/tenants/http/active-tenant.guard.js';
import { CurrentMembership } from '@modules/tenants/http/current-tenant.decorator.js';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';
import { ZodBody, ZodParam } from '@shared/http/zod-validation.pipe.js';
import { ServiceNotFoundError } from '../../domain/errors/service.errors.js';
import { DeleteServiceCommand } from './delete-service.command.js';

@ApiTags(routesV1.services.root)
@Controller({ path: routesV1.services.root, version: '1' })
export class DeleteServiceHttpController {
  constructor(private readonly commands: CommandBus) {}

  /** Confirmed delete: `POST /<resource>/:id/delete` with a body (api-convention). */
  @ApiBearerAuth()
  @Post(':serviceId/delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAccessGuard, ActiveTenantGuard)
  async delete(
    @CurrentMembership() membership: Membership,
    @Param(
      'serviceId',
      new ZodParam(ServiceIdSchema, () => new ServiceNotFoundError()),
    )
    serviceId: string,
    @Body(new ZodBody(DeleteServiceRequestSchema))
    body: DeleteServiceRequestInput,
  ): Promise<void> {
    await this.commands.execute(
      new DeleteServiceCommand(membership, serviceId, body),
    );
  }
}
