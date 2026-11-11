import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  FormIdSchema,
  FormTemplate,
  type UpdateFormRequestInput,
  UpdateFormRequestSchema,
} from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { JwtAccessGuard } from '@modules/auth/http/jwt-access.guard.js';
import { ActiveTenantGuard } from '@modules/tenants/http/active-tenant.guard.js';
import { CurrentMembership } from '@modules/tenants/http/current-tenant.decorator.js';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';
import { ZodBody, ZodParam } from '@shared/http/zod-validation.pipe.js';
import { FormNotFoundError } from '../../domain/errors/form.errors.js';
import { UpdateFormCommand } from './update-form.command.js';

@ApiTags(routesV1.forms.root)
@Controller({ path: routesV1.forms.root, version: '1' })
export class UpdateFormHttpController {
  constructor(private readonly commands: CommandBus) {}

  /** SPEC-0001 4.4: metadata, publication and Apply in one save. */
  @ApiBearerAuth()
  @Patch(':formId')
  @UseGuards(JwtAccessGuard, ActiveTenantGuard)
  update(
    @CurrentMembership() membership: Membership,
    @Param('formId', new ZodParam(FormIdSchema, () => new FormNotFoundError()))
    formId: string,
    @Body(new ZodBody(UpdateFormRequestSchema)) body: UpdateFormRequestInput,
  ): Promise<FormTemplate> {
    return this.commands.execute(
      new UpdateFormCommand(membership, formId, body),
    );
  }
}
