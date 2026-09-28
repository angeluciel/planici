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
import { Throttle } from '@nestjs/throttler';
import {
  type CreateTenantRequestInput,
  CreateTenantRequestSchema,
  TenantResponse,
} from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '@modules/auth/http/current-user.decorator.js';
import { JwtAccessGuard } from '@modules/auth/http/jwt-access.guard.js';
import { ZodBody } from '@shared/http/zod-validation.pipe.js';
import { CreateTenantCommand } from './create-tenant.command.js';

@ApiTags(routesV1.tenants.root)
@Controller({
  path: routesV1.tenants.root,
  version: '1',
})
export class CreateTenantHttpController {
  constructor(private readonly commands: CommandBus) {}

  @ApiBearerAuth()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAccessGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodBody(CreateTenantRequestSchema))
    body: CreateTenantRequestInput,
  ): Promise<TenantResponse> {
    return this.commands.execute(new CreateTenantCommand(user.id, body));
  }
}
