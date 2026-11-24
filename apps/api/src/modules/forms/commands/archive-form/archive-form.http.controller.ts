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
import { FormIdSchema, FormTemplate } from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { JwtAccessGuard } from '@modules/auth/http/jwt-access.guard.js';
import { ActiveTenantGuard } from '@modules/tenants/http/active-tenant.guard.js';
import { CurrentMembership } from '@modules/tenants/http/current-tenant.decorator.js';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';
import { ZodParam } from '@shared/http/zod-validation.pipe.js';
import { FormNotFoundError } from '../../domain/errors/form.errors.js';
import { ArchiveFormCommand } from './archive-form.command.js';

@ApiTags(routesV1.forms.root)
@Controller({ path: routesV1.forms.root, version: '1' })
export class ArchiveFormHttpController {
  constructor(private readonly commands: CommandBus) {}

  @ApiBearerAuth()
  @Post(':formId/archive')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAccessGuard, ActiveTenantGuard)
  archive(
    @CurrentMembership() membership: Membership,
    @Param('formId', new ZodParam(FormIdSchema, () => new FormNotFoundError()))
    formId: string,
  ): Promise<FormTemplate> {
    return this.commands.execute(new ArchiveFormCommand(membership, formId));
  }
}
