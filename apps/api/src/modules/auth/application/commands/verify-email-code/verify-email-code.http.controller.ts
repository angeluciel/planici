import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { EmailVerifiedResponse, VerifyEmailCodeSchema } from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { ZodBody } from '@src/shared/http/zod-validation.pipe.js';
import { VerifyEmailCodeCommand } from './verify-email-code.command.js';

@ApiTags(routesV1.auth.root)
@Controller({
  path: routesV1.auth.root,
  version: '1',
})
export class VerifyEmailCodeHttpController {
  constructor(private readonly commands: CommandBus) {}

  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyEmailCode(
    @Body(new ZodBody(VerifyEmailCodeSchema))
    body: {
      email: string;
      code: string;
    },
  ): Promise<EmailVerifiedResponse> {
    return this.commands.execute(
      new VerifyEmailCodeCommand(body.email, body.code),
    );
  }
}
