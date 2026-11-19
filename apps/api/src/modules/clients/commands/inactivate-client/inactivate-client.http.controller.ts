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
import { type ClientResponse, ClientIdSchema } from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { JwtAccessGuard } from '@modules/auth/http/jwt-access.guard.js';
import { ActiveTenantGuard } from '@modules/tenants/http/active-tenant.guard.js';
import { CurrentMembership } from '@modules/tenants/http/current-tenant.decorator.js';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';
import { ZodParam } from '@shared/http/zod-validation.pipe.js';
import { ClientNotFoundError } from '../../domain/errors/client.errors.js';
import { InactivateClientCommand } from './inactivate-client.command.js';

@ApiTags(routesV1.clients.root)
@Controller({ path: routesV1.clients.root, version: '1' })
export class InactivateClientHttpController {
  constructor(private readonly commands: CommandBus) {}

  @ApiBearerAuth()
  @Post(':clientId/inactivate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAccessGuard, ActiveTenantGuard)
  inactivate(
    @CurrentMembership() membership: Membership,
    @Param(
      'clientId',
      new ZodParam(ClientIdSchema, () => new ClientNotFoundError()),
    )
    clientId: string,
  ): Promise<ClientResponse> {
    return this.commands.execute(
      new InactivateClientCommand(membership, clientId),
    );
  }
}
