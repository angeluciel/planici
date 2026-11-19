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
  ClientIdSchema,
  type DeleteClientRequestInput,
  DeleteClientRequestSchema,
} from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { JwtAccessGuard } from '@modules/auth/http/jwt-access.guard.js';
import { ActiveTenantGuard } from '@modules/tenants/http/active-tenant.guard.js';
import { CurrentMembership } from '@modules/tenants/http/current-tenant.decorator.js';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';
import { ZodBody, ZodParam } from '@shared/http/zod-validation.pipe.js';
import { ClientNotFoundError } from '../../domain/errors/client.errors.js';
import { DeleteClientCommand } from './delete-client.command.js';

@ApiTags(routesV1.clients.root)
@Controller({ path: routesV1.clients.root, version: '1' })
export class DeleteClientHttpController {
  constructor(private readonly commands: CommandBus) {}

  /** Confirmed delete: `POST /<resource>/:id/delete` with a body (api-convention). */
  @ApiBearerAuth()
  @Post(':clientId/delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAccessGuard, ActiveTenantGuard)
  async delete(
    @CurrentMembership() membership: Membership,
    @Param(
      'clientId',
      new ZodParam(ClientIdSchema, () => new ClientNotFoundError()),
    )
    clientId: string,
    @Body(new ZodBody(DeleteClientRequestSchema))
    body: DeleteClientRequestInput,
  ): Promise<void> {
    await this.commands.execute(
      new DeleteClientCommand(membership, clientId, body),
    );
  }
}
