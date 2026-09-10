import { EmailCodeRequestedEvent } from '@/modules/auth/domain/events/auth.events.js';
import { CommandHandler, type ICommandHandler, EventBus } from '@nestjs/cqrs';
import { RequestEmailCodeCommand } from './request-email-code.command.js';
import {
  EMAIL_VERIFICATION_REPOSITORY,
  type EmailVerificationRepository,
} from '../../repositories/email-verification.repository.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../repositories/user.repository.js';
import { authConfig } from '@/config/namespaces/auth.config.js';
import type { ConfigType } from '@nestjs/config';
import { TokenGenerator } from '@/shared/crypto/token.generator.js';
import { Inject } from '@nestjs/common';
import { Email } from '@/modules/auth/domain/value-objects/email.vo.js';
import {
  CodeRateLimitedError,
  EmailTakenError,
} from '@/modules/auth/domain/errors/auth.errors.js';
import { hashSecret } from '@/shared/crypto/hash.js';

@CommandHandler(RequestEmailCodeCommand)
export class RequestEmailCodeHandler implements ICommandHandler<RequestEmailCodeCommand> {
  constructor(
    @Inject(EMAIL_VERIFICATION_REPOSITORY)
    private readonly verifications: EmailVerificationRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
    private readonly generator: TokenGenerator,
    private readonly events: EventBus,
  ) {}

  async execute(command: RequestEmailCodeCommand): Promise<void> {
    const email = Email.create(command.email);

    // runs before the account actually exists, so the addres being taken is an answer here
    if (await this.users.emailExists(email.value)) throw new EmailTakenError();

    const latest = await this.verifications.findLatest(email.value);
    if (latest && this.withinCooldown(latest.createdAt))
      throw new CodeRateLimitedError();

    const code = this.generator.emailCode();
    const expiresAt = new Date(
      Date.now() + this.config.emailCodeTtlMinutes * 60_000,
    );

    await this.verifications.issue(
      email.value,
      hashSecret(code),
      expiresAt,
      command.ip,
    );

    this.events.publish(
      new EmailCodeRequestedEvent(
        email.value,
        code,
        this.config.emailCodeTtlMinutes,
      ),
    );
  }

  private withinCooldown(createdAt: Date): boolean {
    return (
      Date.now() - createdAt.getTime() <
      this.config.emailCodeResendSeconds * 1000
    );
  }
}
