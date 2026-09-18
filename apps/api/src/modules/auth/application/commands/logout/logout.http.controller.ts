import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags } from '@nestjs/swagger';
import { RefreshRequestSchema } from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { LogoutCommand } from './logout.command.js';
import { ZodBody } from '@src/shared/http/zod-validation.pipe.js';

@ApiTags(routesV1.auth.root)
@Controller({
  path: routesV1.auth.root,
  version: '1',
})
export class LogoutHttpController {
  constructor(private readonly commands: CommandBus) {}

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Body(new ZodBody(RefreshRequestSchema)) body: { refreshToken: string },
  ): Promise<void> {
    await this.commands.execute(new LogoutCommand(body.refreshToken));
  }
}
