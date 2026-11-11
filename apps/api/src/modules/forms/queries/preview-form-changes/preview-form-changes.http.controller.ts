import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  FormChangePreviewResponse,
  FormIdSchema,
  type PreviewFormChangesRequestInput,
  PreviewFormChangesRequestSchema,
} from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { JwtAccessGuard } from '@modules/auth/http/jwt-access.guard.js';
import { ActiveTenantGuard } from '@modules/tenants/http/active-tenant.guard.js';
import { CurrentMembership } from '@modules/tenants/http/current-tenant.decorator.js';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';
import { ZodBody, ZodParam } from '@shared/http/zod-validation.pipe.js';
import { FormNotFoundError } from '../../domain/errors/form.errors.js';
import { PreviewFormChangesQuery } from './preview-form-changes.query.js';

@ApiTags(routesV1.forms.root)
@Controller({ path: routesV1.forms.root, version: '1' })
export class PreviewFormChangesHttpController {
  constructor(private readonly queries: QueryBus) {}

  /** POST because it carries the draft's fields; it stores nothing. */
  @ApiBearerAuth()
  @Post(':formId/preview')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAccessGuard, ActiveTenantGuard)
  preview(
    @CurrentMembership() membership: Membership,
    @Param('formId', new ZodParam(FormIdSchema, () => new FormNotFoundError()))
    formId: string,
    @Body(new ZodBody(PreviewFormChangesRequestSchema))
    body: PreviewFormChangesRequestInput,
  ): Promise<FormChangePreviewResponse> {
    return this.queries.execute(
      new PreviewFormChangesQuery(membership, formId, body),
    );
  }
}
