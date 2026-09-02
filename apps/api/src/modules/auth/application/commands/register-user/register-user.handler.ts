import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs';
import type { SessionResponse } from '@planici/schemas';
import { PasswordHasher } from '@/shared/crypto/password.hasher.js';
import {
  EmailTakenError,
  InvalidTokenError,
  SlugTakenError,
} from '@/modules/auth/domain/errors/auth.errors.js';
import { UserRegisteredEvent } from '@/modules/auth/domain/events/auth.events.js';
import { Email } from '@/modules/auth/domain/value-objects/email.vo.js';
import { Password } from '@/modules/auth/domain/value-objects/password.vo.js';
import { Slug } from '@/modules/auth/domain/value-objects/slug.vo.js';
import {
  type ConsentData,
  type GoogleIdentityData,
  USER_REPOSITORY,
  type UserRepository,
} from '../../repositories/user.repository.js';
import {
  GOOGLE_VERIFIER,
  type GoogleVerifier,
} from '../../services/google-verifier.js';
import { SessionFactory } from '../../services/section.factory.js';
import {
  TOKEN_SERVICE,
  type TokenService,
} from '../../services/token.service.js';
import { RegisterUserCommand } from './register-user.command.js';

@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler implements ICommandHandler<RegisterUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(GOOGLE_VERIFIER) private readonly google: GoogleVerifier,
    private readonly hasher: PasswordHasher,
    private readonly sessions: SessionFactory,
    private readonly events: EventBus,
  ) {}

  async execute(command: RegisterUserCommand): Promise<SessionResponse> {
    const { payload, context } = command;

    const email = Email.create(payload.email);
    const slug = Slug.create(payload.slug);

    let passwordHash: string | null = null;
    let identity: GoogleIdentityData | undefined;

    if (payload.provider === 'email') {
      // the address must be the one the code was sent to
      const verifiedEmail = await this.tokens.verifyEmailVerificationToken(
        payload.emailVerificationToken,
      );
      if (verifiedEmail !== email.value) throw new InvalidTokenError();

      passwordHash = await this.hasher.hash(
        Password.create(payload.password).expose(),
      );
    } else {
      const account = await this.google.verify(payload.idToken);
      if (account.email !== email.value) throw new InvalidTokenError();

      identity = {
        providerAccountId: account.providerAccountId,
        email: account.email,
      };
    }

    if (await this.users.emailExists(email.value)) throw new EmailTakenError();
    if (await this.users.slugExists(slug.value)) throw new SlugTakenError();

    const user = await this.users.create(
      {
        email: email.value,
        slug: slug.value,
        name: payload.name,
        surname: payload.surname,
        passwordHash,
        emailVerified: true,
      },
      this.consentRows(command),
      identity,
    );

    this.events.publish(
      new UserRegisteredEvent(user.id, user.email, user.name),
    );

    return this.sessions.issue(user, context);
  }

  /**
   * For a traceable record of the acceptance
   * */
  private consentRows(command: RegisterUserCommand): ConsentData[] {
    const { consent } = command;
    const base = {
      version: consent.termsVersion,
      acceptedAt: new Date(consent.acceptedAt),
      ip: command.context.ip,
      userAgent: command.context.userAgent,
    };

    return [
      { ...base, document: 'terms_of_service', granted: true },
      { ...base, document: 'privacy_policy', granted: true },
      { ...base, document: 'marketing', granted: consent.marketingOptIn },
    ];
  }
}
