import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { PasswordResetRequestedEvent } from '../../domain/events/auth.events.js';
import { Inject, Logger } from '@nestjs/common';
import { MAILER, type Mailer } from '@modules/mail/mail.service.js';
import { mailConfig } from '@config/namespaces/mail.config.js';
import { type ConfigType } from '@nestjs/config';
import { passwordResetEmail } from '@modules/mail/template/auth.template.js';

@EventsHandler(PasswordResetRequestedEvent)
export class SendPasswordResetEmailHandler implements IEventHandler<PasswordResetRequestedEvent> {
  private readonly logger = new Logger(SendPasswordResetEmailHandler.name);

  constructor(
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(mailConfig.KEY)
    private readonly config: ConfigType<typeof mailConfig>,
  ) {}

  async handle(event: PasswordResetRequestedEvent): Promise<void> {
    const link = `${this.config.webAppUrl}/reset-password?token=${encodeURIComponent(event.token)}`;

    try {
      await this.mailer.send(
        await passwordResetEmail(event.email, {
          name: event.name,
          link,
          locale: 'en-US',
          baseUrl: 'https://d34yicvl9up261.cloudfront.net',
        }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to send reset link to ${event.email}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
