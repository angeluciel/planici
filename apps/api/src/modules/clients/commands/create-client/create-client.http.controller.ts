import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  type ClientResponse,
  RecordCreateEnvelopeSchema,
  type RecordCreateEnvelope,
} from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { JwtAccessGuard } from '@modules/auth/http/jwt-access.guard.js';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '@modules/auth/http/current-user.decorator.js';
import { ActiveTenantGuard } from '@modules/tenants/http/active-tenant.guard.js';
import { CurrentMembership } from '@modules/tenants/http/current-tenant.decorator.js';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';
import { ZodBody } from '@shared/http/zod-validation.pipe.js';
import { CreateClientCommand } from './create-client.command.js';

@ApiTags(routesV1.clients.root)
@Controller({ path: routesV1.clients.root, version: '1' })
export class CreateClientHttpController {
  constructor(private readonly commands: CommandBus) {}

  /** SPEC-0004 section 6: the envelope here, consent and attributes in the handler. */
  @ApiBearerAuth()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAccessGuard, ActiveTenantGuard)
  create(
    @CurrentMembership() membership: Membership,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodBody(RecordCreateEnvelopeSchema))
    body: RecordCreateEnvelope,
  ): Promise<ClientResponse> {
    return this.commands.execute(
      new CreateClientCommand(membership, user.id, body),
    );
  }
}
