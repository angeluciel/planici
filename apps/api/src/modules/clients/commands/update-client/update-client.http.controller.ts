import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  type ClientResponse,
  ClientIdSchema,
  RecordUpdateEnvelopeSchema,
  type RecordUpdateEnvelope,
} from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { JwtAccessGuard } from '@modules/auth/http/jwt-access.guard.js';
import { ActiveTenantGuard } from '@modules/tenants/http/active-tenant.guard.js';
import { CurrentMembership } from '@modules/tenants/http/current-tenant.decorator.js';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';
import { ZodBody, ZodParam } from '@shared/http/zod-validation.pipe.js';
import { ClientNotFoundError } from '../../domain/errors/client.errors.js';
import { UpdateClientCommand } from './update-client.command.js';

@ApiTags(routesV1.clients.root)
@Controller({ path: routesV1.clients.root, version: '1' })
export class UpdateClientHttpController {
  constructor(private readonly commands: CommandBus) {}

  @ApiBearerAuth()
  @Patch(':clientId')
  @UseGuards(JwtAccessGuard, ActiveTenantGuard)
  update(
    @CurrentMembership() membership: Membership,
    // the envelope (422) comes before the id's 404 (SPEC-0004 plan, API, routes)
    @Body(new ZodBody(RecordUpdateEnvelopeSchema))
    body: RecordUpdateEnvelope,
    @Param(
      'clientId',
      new ZodParam(ClientIdSchema, () => new ClientNotFoundError()),
    )
    clientId: string,
  ): Promise<ClientResponse> {
    return this.commands.execute(
      new UpdateClientCommand(membership, clientId, body),
    );
  }
}
