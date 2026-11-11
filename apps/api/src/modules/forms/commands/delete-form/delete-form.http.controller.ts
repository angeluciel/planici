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
  type DeleteFormRequestInput,
  DeleteFormRequestSchema,
  FormIdSchema,
} from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { JwtAccessGuard } from '@modules/auth/http/jwt-access.guard.js';
import { ActiveTenantGuard } from '@modules/tenants/http/active-tenant.guard.js';
import { CurrentMembership } from '@modules/tenants/http/current-tenant.decorator.js';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';
import { ZodBody, ZodParam } from '@shared/http/zod-validation.pipe.js';
import { FormNotFoundError } from '../../domain/errors/form.errors.js';
import { DeleteFormCommand } from './delete-form.command.js';

@ApiTags(routesV1.forms.root)
@Controller({ path: routesV1.forms.root, version: '1' })
export class DeleteFormHttpController {
  constructor(private readonly commands: CommandBus) {}

  /** Confirmed delete: `POST /<resource>/:id/delete` with a body (api-convention). */
  @ApiBearerAuth()
  @Post(':formId/delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAccessGuard, ActiveTenantGuard)
  async delete(
    @CurrentMembership() membership: Membership,
    @Param('formId', new ZodParam(FormIdSchema, () => new FormNotFoundError()))
    formId: string,
    @Body(new ZodBody(DeleteFormRequestSchema)) body: DeleteFormRequestInput,
  ): Promise<void> {
    await this.commands.execute(
      new DeleteFormCommand(membership, formId, body),
    );
  }
}
