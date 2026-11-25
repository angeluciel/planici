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
  RecordCreateEnvelopeSchema,
  type RecordCreateEnvelope,
  type ServiceResponse,
} from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { JwtAccessGuard } from '@modules/auth/http/jwt-access.guard.js';
import { ActiveTenantGuard } from '@modules/tenants/http/active-tenant.guard.js';
import { CurrentMembership } from '@modules/tenants/http/current-tenant.decorator.js';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';
import { ZodBody } from '@shared/http/zod-validation.pipe.js';
import { CreateServiceCommand } from './create-service.command.js';

@ApiTags(routesV1.services.root)
@Controller({ path: routesV1.services.root, version: '1' })
export class CreateServiceHttpController {
  constructor(private readonly commands: CommandBus) {}

  /** SPEC-0005 section 6: the envelope here, the attributes in the handler. */
  @ApiBearerAuth()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAccessGuard, ActiveTenantGuard)
  create(
    @CurrentMembership() membership: Membership,
    @Body(new ZodBody(RecordCreateEnvelopeSchema))
    body: RecordCreateEnvelope,
  ): Promise<ServiceResponse> {
    return this.commands.execute(new CreateServiceCommand(membership, body));
  }
}
