import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import * as schemas from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { ZodBody } from '@src/shared/http/zod-validation.pipe.js';
import type { Request } from 'express';
import { LoginCommand } from './login.command.js';
import { contextOf } from '@src/modules/auth/http/request-context.js';

@ApiTags(routesV1.auth.root)
@Controller(routesV1.auth.root)
export class LoginHttpController {
  constructor(private readonly commands: CommandBus) {}

  @ApiOperation({ summary: 'Authenticate a user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User authenticated successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(
    @Body({
      schema: schemas.LoginRequestSchema,
      pipes: [new ZodBody(schemas.LoginRequestSchema)],
    })
    body: schemas.LoginRequestInput,
    @Req() request: Request,
  ): Promise<schemas.SessionResponse> {
    return this.commands.execute(new LoginCommand(body, contextOf(request)));
  }
}
