import { Inject } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { SessionResponse } from '@planici/schemas';
import { authConfig } from '@/config/namespaces/auth.config.js';
import { PasswordHasher } from '@/shared/crypto/password.hasher.js';
import {
  AccountLockedError,
  InvalidCredentialsError,
} from '@/modules/auth/domain/errors/auth.errors.js';
import type { User } from '@/modules/auth/domain/user.entity.js';
import { Email } from '@/modules/auth/domain/value-objects/email.vo.js';
import {
  LOGIN_ATTEMPT_REPOSITORY,
  type LoginAttemptRepository,
} from '../../repositories/login-attempt.repository.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from './../../repositories/user.repository.js';
import {
  GOOGLE_VERIFIER,
  type GoogleVerifier,
} from './../../services/google-verifier.js';
import { SessionFactory } from '../../services/section.factory.js';
import { LoginCommand } from './login.command.js';

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(LOGIN_ATTEMPT_REPOSITORY)
    private readonly attempts: LoginAttemptRepository,
    @Inject(GOOGLE_VERIFIER) private readonly google: GoogleVerifier,
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
    private readonly hasher: PasswordHasher,
    private readonly sessions: SessionFactory,
  ) {}

  async execute(command: LoginCommand): Promise<SessionResponse> {
    const user =
      command.payload.provider === 'email'
        ? await this.withPassword(
            command.payload.email,
            command.payload.password,
            command.context.ip,
          )
        : await this.withGoogle(command.payload.idToken);

    user.assertCanAuthenticate();
    await this.users.recordLogin(user.id);

    return this.sessions.issue(user, command.context);
  }

  private async withPassword(
    rawEmail: string,
    password: string,
    ip: string | null,
  ): Promise<User> {
    const email = Email.create(rawEmail);

    // Per-account lockout, on top of the per-IP throttler
    const state = await this.attempts.find(email.value);
    if (state?.lockedUntil && state.lockedUntil.getTime() > Date.now())
      throw new AccountLockedError();

    const user = await this.users.findByEmail(email.value);

    if (!user || !user.passwordHash) {
      // spend the same time as a real bcrypt comparison and count the attempt
      await this.hasher.fakeVerify();
      await this.registerFailure(email.value, ip);
      throw new InvalidCredentialsError();
    }

    if (!(await this.hasher.verify(password, user.passwordHash))) {
      await this.registerFailure(email.value, ip);
      throw new InvalidCredentialsError();
    }

    await this.attempts.clear(email.value);
    return user;
  }

  private async registerFailure(
    email: string,
    ip: string | null,
  ): Promise<void> {
    const state = await this.attempts.registerFailure(
      email,
      ip,
      this.config.loginMaxFailures,
      this.config.loginLockoutMinutes,
    );

    if (state.lockedUntil && state.lockedUntil.getTime() > Date.now())
      throw new AccountLockedError();
  }

  private async withGoogle(idToken: string): Promise<User> {
    const account = await this.google.verify(idToken);

    const linked = await this.users.findByGoogleAccountId(
      account.providerAccountId,
    );
    if (linked) return linked;

    // The account was created with e-mail/password and is now signing with google =
    // link the identity rather than refusing
    const byEmail = account.emailVerified
      ? await this.users.findByEmail(account.email)
      : null;
    if (!byEmail) throw new InvalidCredentialsError();

    await this.users.linkGoogleIdentity(byEmail.id, {
      providerAccountId: account.providerAccountId,
      email: account.email,
    });

    return byEmail;
  }
}
