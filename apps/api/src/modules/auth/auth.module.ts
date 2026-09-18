import { Module } from '@nestjs/common';
import { LoginHandler } from './application/commands/login/login.handler.js';
import { LogoutHandler } from './application/commands/logout/logout.handler.js';
import { RefreshSessionHandler } from './application/commands/refresh-session/refresh-session.handler.js';
import { RegisterUserHandler } from './application/commands/register-user/register-user.handler.js';
import { RequestEmailCodeHandler } from './application/commands/request-email-code/request-email-code.handler.js';
import { RequestPasswordResetHandler } from './application/commands/request-password-reset/request-password-reset.handler.js';
import { ResetPasswordHandler } from './application/commands/reset-password/reset-password.handler.js';
import { VerifyEmailCodeHandler } from './application/commands/verify-email-code/verify-email-code.handler.js';
import { SendPasswordResetEmailHandler } from './application/event-handlers/send-password-reset-email.handler.js';
import { SendVerificationEmailHandler } from './application/event-handlers/send-verification-email.handler.js';
import { CheckAvailabilityHandler } from './application/queries/check-availability/check-availability.handler.js';
import { GetCurrentUserHandler } from './application/queries/get-current-user/get-current-user.handler.js';
import { EMAIL_VERIFICATION_REPOSITORY } from './application/repositories/email-verification.repository.js';
import { LOGIN_ATTEMPT_REPOSITORY } from './application/repositories/login-attempt.repository.js';
import { PASSWORD_RESET_REPOSITORY } from './application/repositories/password-reset.repository.js';
import { REFRESH_TOKEN_REPOSITORY } from './application/repositories/refresh-token.repository.js';
import { USER_REPOSITORY } from './application/repositories/user.repository.js';
import { GOOGLE_VERIFIER } from './application/services/google-verifier.js';
import { TOKEN_SERVICE } from './application/services/token.service.js';
import { DrizzleEmailVerificationRepository } from './infrastructure/persistence/email-verification.drizzle.repository.js';
import { DrizzleLoginAttemptRepository } from './infrastructure/persistence/login-attempt.drizzle.repository.js';
import { DrizzlePasswordResetRepository } from './infrastructure/persistence/password-reset.drizzle.repository.js';
import { DrizzleRefreshTokenRepository } from './infrastructure/persistence/refresh-token.drizzle.repository.js';
import { DrizzleUserRepository } from './infrastructure/persistence/user.drizzle.repository.js';
import { GoogleTokenVerifier } from './infrastructure/services/google-token.verifier.js';
import { JwtTokenService } from './infrastructure/services/jwt-token.service.js';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { SessionFactory } from './application/services/section.factory.js';
import { PasswordHasher } from '@shared/crypto/password.hasher.js';
import { TokenGenerator } from '@shared/crypto/token.generator.js';
import { JwtAccessGuard } from './http/jwt-access.guard.js';
import { LoginHttpController } from './application/commands/login/login.http.controller.js';
import { LogoutHttpController } from './application/commands/logout/logout.http.controller.js';
import { RegisterUserHttpController } from './application/commands/register-user/register-user.http.controller.js';
import { ResetPasswordHttpController } from './application/commands/reset-password/reset-password.http.controller.js';
import { RefreshSessionHttpController } from './application/commands/refresh-session/refresh-session.http.controller.js';
import { VerifyEmailCodeHttpController } from './application/commands/verify-email-code/verify-email-code.http.controller.js';
import { RequestEmailCodeHttpController } from './application/commands/request-email-code/request-email-code.http.controller.js';
import { RequestPasswordResetHttpController } from './application/commands/request-password-reset/request-password-reset.http.controller.js';
import { GetCurrentUserHttpController } from './application/queries/get-current-user/get-current-user.http.js';
import { CheckAvailabilityHttpController } from './application/queries/check-availability/check-availability.http.js';

const commandHandlers = [
  RequestEmailCodeHandler,
  VerifyEmailCodeHandler,
  RegisterUserHandler,
  LoginHandler,
  RefreshSessionHandler,
  LogoutHandler,
  RequestPasswordResetHandler,
  ResetPasswordHandler,
];

const queryHandlers = [GetCurrentUserHandler, CheckAvailabilityHandler];

const eventHandlers = [
  SendVerificationEmailHandler,
  SendPasswordResetEmailHandler,
];

// As ports são linkadas nos adapters aqui
// Handlers dependem da interface, entao um repositorio pode ser trocado sem tocar nele

const adapters = [
  { provide: USER_REPOSITORY, useClass: DrizzleUserRepository },
  {
    provide: EMAIL_VERIFICATION_REPOSITORY,
    useClass: DrizzleEmailVerificationRepository,
  },
  {
    provide: PASSWORD_RESET_REPOSITORY,
    useClass: DrizzlePasswordResetRepository,
  },
  {
    provide: REFRESH_TOKEN_REPOSITORY,
    useClass: DrizzleRefreshTokenRepository,
  },
  {
    provide: LOGIN_ATTEMPT_REPOSITORY,
    useClass: DrizzleLoginAttemptRepository,
  },
  {
    provide: TOKEN_SERVICE,
    useClass: JwtTokenService,
  },
  {
    provide: GOOGLE_VERIFIER,
    useClass: GoogleTokenVerifier,
  },
];

const httpControllers = [
  LoginHttpController,
  LogoutHttpController,
  RegisterUserHttpController,
  ResetPasswordHttpController,
  RefreshSessionHttpController,
  VerifyEmailCodeHttpController,
  RequestEmailCodeHttpController,
  RequestPasswordResetHttpController,
  GetCurrentUserHttpController,
  CheckAvailabilityHttpController,
];

@Module({
  imports: [CqrsModule, JwtModule.register({})],
  controllers: [...httpControllers],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    ...eventHandlers,
    ...adapters,
    SessionFactory,
    PasswordHasher,
    TokenGenerator,
    JwtAccessGuard,
  ],
  exports: [JwtAccessGuard],
})
export class AuthModule {}
