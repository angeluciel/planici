import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags } from '@nestjs/swagger';
import { RefreshRequestSchema, SessionResponse } from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { ZodBody } from '@src/shared/http/zod-validation.pipe.js';
import { RefreshSessionCommand } from './refresh-session.command.js';
import { contextOf } from '@src/modules/auth/http/request-context.js';
import type { Request } from 'express';

@ApiTags(routesV1.auth.root)
@Controller({
  path: routesV1.auth.root,
  version: '1',
})
export class RefreshSessionHttpController {
  constructor(private readonly commands: CommandBus) {}

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @Body(new ZodBody(RefreshRequestSchema)) body: { refreshToken: string },
    @Req() request: Request,
  ): Promise<SessionResponse> {
    return this.commands.execute(
      new RefreshSessionCommand(body.refreshToken, contextOf(request)),
    );
  }
}
