import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Throttle } from '@nestjs/throttler';
import {
  AvailabilityQuerySchema,
  type AvailabilityResponse,
  type EmailVerifiedResponse,
  ForgotPasswordSchema,
  type LoginRequestInput,
  LoginRequestSchema,
  type MeResponse,
  RefreshRequestSchema,
  type RegisterRequestInput,
  RegisterRequestSchema,
  RequestEmailCodeSchema,
  ResetPasswordSchema,
  type SessionResponse,
  VerifyEmailCodeSchema,
} from '@planici/schemas';
import type { Request } from 'express';
import { ZodBody } from '@/shared/http/zod-validation.pipe.js';
import { LoginCommand } from '../application/commands/login/login.command.js';
import { LogoutCommand } from '../application/commands/logout/logout.command.js';
import { RefreshSessionCommand } from '../application/commands/refresh-session/refresh-session.command.js';
import { RegisterUserCommand } from '../application/commands/register-user/register-user.command.js';
import { RequestEmailCodeCommand } from '../application/commands/request-email-code/request-email-code.command.js';
import { RequestPasswordResetCommand } from '../application/commands/request-password-reset/request-password-reset.command.js';
import { ResetPasswordCommand } from '../application/commands/reset-password/reset-password.command.js';
import { VerifyEmailCodeCommand } from '../application/commands/verify-email-code/verify-email-code.command.js';
import { CheckAvailabilityQuery } from '../application/queries/check-availability/check-availability.query.js';
import { GetCurrentUserQuery } from '../application/queries/get-current-user/get-current-user.query.js';
import {
  type AuthenticatedUser,
  CurrentUser,
} from './decorators/current-user.decorator.js';
import { JwtAccessGuard } from './guards/jwt-access.guard.js';

/**
 * parse -> hand to bus -> return
 */

@Controller('auth')
export class AuthController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  /** POST /auth/email/code - step one of the register */
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

  /** POST /auth/email/verify - exchanged the code f or a short-lived proof token */
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

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(
    @Body(new ZodBody(LoginRequestSchema)) body: LoginRequestInput,
    @Req() request: Request,
  ): Promise<SessionResponse> {
    return this.commands.execute(new LoginCommand(body, contextOf(request)));
  }

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

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Body(new ZodBody(RefreshRequestSchema)) body: { refreshToken: string },
  ): Promise<void> {
    await this.commands.execute(new LogoutCommand(body.refreshToken));
  }

  /**
   * POST /auth/password/forgot
   * 202 if the address exists or not, so a malicious dumbass cant figure if the email is registered
   */
  @Post('password/forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async forgotPassword(
    @Body(new ZodBody(ForgotPasswordSchema)) body: { email: string },
    @Req() request: Request,
  ): Promise<void> {
    await this.commands.execute(
      new RequestPasswordResetCommand(body.email, ipOf(request)),
    );
  }

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

  @Get('me')
  @UseGuards(JwtAccessGuard)
  me(@CurrentUser() user: AuthenticatedUser): Promise<MeResponse> {
    return this.queries.execute(new GetCurrentUserQuery(user.id));
  }

  @Get('availability')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  availability(
    @Query(new ZodBody(AvailabilityQuerySchema))
    query: {
      email?: string;
      slug?: string;
    },
  ): Promise<AvailabilityResponse> {
    const [field, value] = query.email
      ? (['email', query.email] as const)
      : (['slug', query.slug as string] as const);

    return this.queries.execute(new CheckAvailabilityQuery(field, value));
  }
}

function ipOf(request: Request): string | null {
  const forwarded = request.header('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? null;

  return request.ip ?? null;
}

function contextOf(request: Request): {
  ip: string | null;
  userAgent: string | null;
} {
  return { ip: ipOf(request), userAgent: request.header('user-agent') ?? null };
}
