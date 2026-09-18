import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MeResponse } from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '@src/modules/auth/http/current-user.decorator.js';
import { JwtAccessGuard } from '@src/modules/auth/http/jwt-access.guard.js';
import { GetCurrentUserQuery } from './get-current-user.query.js';

@ApiTags(routesV1.auth.root)
@Controller({
  path: routesV1.auth.root,
  version: '1',
})
export class GetCurrentUserHttpController {
  constructor(private readonly queries: QueryBus) {}

  @ApiBearerAuth()
  @Get('me')
  @UseGuards(JwtAccessGuard)
  me(@CurrentUser() user: AuthenticatedUser): Promise<MeResponse> {
    return this.queries.execute(new GetCurrentUserQuery(user.id));
  }
}
