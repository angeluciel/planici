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
  type CreateFormRequestData,
  CreateFormRequestSchema,
  FormTemplate,
} from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { JwtAccessGuard } from '@modules/auth/http/jwt-access.guard.js';
import { ActiveTenantGuard } from '@modules/tenants/http/active-tenant.guard.js';
import { CurrentMembership } from '@modules/tenants/http/current-tenant.decorator.js';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';
import { ZodBody } from '@shared/http/zod-validation.pipe.js';
import { CreateFormCommand } from './create-form.command.js';

@ApiTags(routesV1.forms.root)
@Controller({ path: routesV1.forms.root, version: '1' })
export class CreateFormHttpController {
  constructor(private readonly commands: CommandBus) {}

  /** SPEC-0001 4.2: publishes version 1. */
  @ApiBearerAuth()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAccessGuard, ActiveTenantGuard)
  create(
    @CurrentMembership() membership: Membership,
    @Body(new ZodBody(CreateFormRequestSchema)) body: CreateFormRequestData,
  ): Promise<FormTemplate> {
    return this.commands.execute(new CreateFormCommand(membership, body));
  }
}
