import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ResetPasswordSchema } from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { ZodBody } from '@src/shared/http/zod-validation.pipe.js';
import { ResetPasswordCommand } from './reset-password.command.js';

@ApiTags(routesV1.auth.root)
@Controller({
  path: routesV1.auth.root,
  version: '1',
})
export class ResetPasswordHttpController {
  constructor(private readonly commands: CommandBus) {}

  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async resetPassword(
    @Body(new ZodBody(ResetPasswordSchema))
    body: {
      token: string;
      password: string;
    },
  ): Promise<void> {
    await this.commands.execute(
      new ResetPasswordCommand(body.token, body.password),
    );
  }
}
