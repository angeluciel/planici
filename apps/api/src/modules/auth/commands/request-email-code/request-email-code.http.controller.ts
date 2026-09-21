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
import { Throttle } from '@nestjs/throttler';
import { RequestEmailCodeSchema } from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { ipOf } from '@src/modules/auth/http/request-context.js';
import { ZodBody } from '@src/shared/http/zod-validation.pipe.js';
import { RequestEmailCodeCommand } from './request-email-code.command.js';
import type { Request } from 'express';

@ApiTags(routesV1.auth.root)
@Controller({
  path: routesV1.auth.root,
  version: '1',
})
export class RequestEmailCodeHttpController {
  constructor(private readonly commands: CommandBus) {}

  @Post('email/code')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async requestEmailCode(
    @Body(new ZodBody(RequestEmailCodeSchema)) body: { email: string },
    @Req() request: Request,
  ): Promise<void> {
    await this.commands.execute(
      new RequestEmailCodeCommand(body.email, ipOf(request)),
    );
  }
}
