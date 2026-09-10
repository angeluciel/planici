import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { VerifyEmailCodeCommand } from './verify-email-code.command.js';
import { Inject } from '@nestjs/common';
import {
  EMAIL_VERIFICATION_REPOSITORY,
  type EmailVerificationRepository,
} from '../../repositories/email-verification.repository.js';
import {
  TOKEN_SERVICE,
  type TokenService,
} from '../../services/token.service.js';
import { authConfig } from '@/config/namespaces/auth.config.js';
import type { ConfigType } from '@nestjs/config';
import { EmailVerifiedResponse } from '@planici/schemas';
import { Email } from '@/modules/auth/domain/value-objects/email.vo.js';
import {
  ExpiredCodeError,
  InvalidCodeError,
  TooManyCodeAttemptsError,
} from '@/modules/auth/domain/errors/auth.errors.js';
import { secretsMatch } from '@/shared/crypto/hash.js';

/**
 * Troca o codigo por um token de vida curta.
 * O resto do registro apresenta esse token ao inves de `emailConfirmed: true`
 */
@CommandHandler(VerifyEmailCodeCommand)
export class VerifyEmailCodeHandler implements ICommandHandler<VerifyEmailCodeCommand> {
  constructor(
    @Inject(EMAIL_VERIFICATION_REPOSITORY)
    private readonly verifications: EmailVerificationRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
  ) {}

  async execute(
    command: VerifyEmailCodeCommand,
  ): Promise<EmailVerifiedResponse> {
    const email = Email.create(command.email);
    const verification = await this.verifications.findActive(email.value);

    if (!verification) throw new InvalidCodeError();
    if (verification.expiresAt.getTime() <= Date.now())
      throw new ExpiredCodeError();
    if (verification.attempts >= this.config.emailCodeMaxAttempts)
      throw new TooManyCodeAttemptsError();

    if (!secretsMatch(command.code, verification.codeHash)) {
      const attempts = await this.verifications.incrementAttempts(
        verification.id,
      );
      throw attempts >= this.config.emailCodeMaxAttempts
        ? new TooManyCodeAttemptsError()
        : new InvalidCodeError();
    }

    await this.verifications.consume(verification.id);

    const { token, expiresIn } = await this.tokens.signEmailVerificationToken(
      email.value,
    );

    return { emailVerificationToken: token, expiresIn };
  }
}
