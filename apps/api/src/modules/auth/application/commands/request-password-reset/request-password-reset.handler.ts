import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs';
import { RequestPasswordResetCommand } from './request-password-reset.command.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../repositories/user.repository.js';
import { Inject } from '@nestjs/common';
import {
  PASSWORD_RESET_REPOSITORY,
  type PasswordResetRepository,
} from '../../repositories/password-reset.repository.js';
import { authConfig } from '@/config/namespaces/auth.config.js';
import { TokenGenerator } from '@/shared/crypto/token.generator.js';
import type { ConfigType } from '@nestjs/config';
import { Email } from '@/modules/auth/domain/value-objects/email.vo.js';
import { hashSecret } from '@/shared/crypto/hash.js';
import { PasswordResetRequestedEvent } from '@/modules/auth/domain/events/auth.events.js';

@CommandHandler(RequestPasswordResetCommand)
export class RequestPasswordResetHandler implements ICommandHandler<RequestPasswordResetCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_RESET_REPOSITORY)
    private readonly resets: PasswordResetRepository,
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
    private readonly generator: TokenGenerator,
    private readonly events: EventBus,
  ) {}

  /**
   * Sempre tem sucesso from the caller viewpoint
   */
  async execute(command: RequestPasswordResetCommand): Promise<void> {
    const email = Email.create(command.email);
    const user = await this.users.findByEmail(email.value);

    if (!user?.isActive) return;

    const token = this.generator.opaqueToken();
    const expiresAt = new Date(
      Date.now() + this.config.passwordResetTtlMinutes * 60_000,
    );

    await this.resets.issue(user.id, hashSecret(token), expiresAt, command.ip);

    this.events.publish(
      new PasswordResetRequestedEvent(
        user.id,
        user.email,
        user.name,
        token,
        this.config.passwordResetTtlMinutes,
      ),
    );
  }
}
