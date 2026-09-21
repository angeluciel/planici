import { Body, Controller, Post, Req } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  type RegisterRequestInput,
  RegisterRequestSchema,
  SessionResponse,
} from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { ZodBody } from '@src/shared/http/zod-validation.pipe.js';
import { RegisterUserCommand } from './register-user.command.js';
import { contextOf } from '@src/modules/auth/http/request-context.js';
import type { Request } from 'express';

@ApiTags(routesV1.auth.root)
@Controller({
  path: routesV1.auth.root,
  version: '1',
})
export class RegisterUserHttpController {
  constructor(private readonly commands: CommandBus) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(
    @Body(new ZodBody(RegisterRequestSchema)) body: RegisterRequestInput,
    @Req() request: Request,
  ): Promise<SessionResponse> {
    return this.commands.execute(
      new RegisterUserCommand(body, contextOf(request)),
    );
  }
}
