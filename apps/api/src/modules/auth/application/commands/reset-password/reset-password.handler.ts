import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs';
import { hashSecret } from '@/shared/crypto/hash.js';
import { PasswordHasher } from '@/shared/crypto/password.hasher.js';
import {
  ExpiredTokenError,
  InvalidTokenError,
} from '../../../domain/errors/auth.errors.js';
import { PasswordChangedEvent } from '../../../domain/events/auth.events.js';
import { Password } from '../../../domain/value-objects/password.vo.js';
import {
  LOGIN_ATTEMPT_REPOSITORY,
  type LoginAttemptRepository,
} from '../../repositories/login-attempt.repository.js';
import {
  PASSWORD_RESET_REPOSITORY,
  type PasswordResetRepository,
} from '../../repositories/password-reset.repository.js';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../repositories/refresh-token.repository.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../repositories/user.repository.js';
import { ResetPasswordCommand } from './reset-password.command.js';

@CommandHandler(ResetPasswordCommand)
export class ResetPasswordHandler implements ICommandHandler<ResetPasswordCommand> {
  constructor(
    @Inject(PASSWORD_RESET_REPOSITORY)
    private readonly resets: PasswordResetRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(LOGIN_ATTEMPT_REPOSITORY)
    private readonly attempts: LoginAttemptRepository,
    private readonly hasher: PasswordHasher,
    private readonly events: EventBus,
  ) {}

  async execute(command: ResetPasswordCommand): Promise<void> {
    const stored = await this.resets.findByTokenHash(hashSecret(command.token));

    if (!stored || stored.consumedAt) throw new InvalidTokenError();
    if (stored.expiresAt.getTime() <= Date.now()) throw new ExpiredTokenError();

    const user = await this.users.findById(stored.userId);
    if (!user) throw new InvalidTokenError();
    // um reset de senha nn pode pular a politica de senha segura
    const password = Password.create(command.password);

    await this.users.updatePassword(
      user.id,
      await this.hasher.hash(password.expose()),
    );
    await this.resets.consume(stored.id);

    // invalida todas as sessões em caso de logout ou troca de senha
    await this.refreshTokens.revokeAllForUser(user.id, 'password-changed');

    // se consegue resetar a senha, nao precisa desconectar
    await this.attempts.clear(user.email);

    this.events.publish(new PasswordChangedEvent(user.id, user.email));
  }
}
