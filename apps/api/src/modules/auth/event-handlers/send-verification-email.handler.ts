import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { EmailCodeRequestedEvent } from '../domain/events/auth.events.js';
import { Inject, Logger } from '@nestjs/common';
import { type Mailer, MAILER } from '@modules/mail/mail.service.js';
import { verificationCodeEmail } from '@modules/mail/template/auth.template.js';

@EventsHandler(EmailCodeRequestedEvent)
export class SendVerificationEmailHandler implements IEventHandler<EmailCodeRequestedEvent> {
  private readonly logger = new Logger(SendVerificationEmailHandler.name);

  constructor(@Inject(MAILER) private readonly mailer: Mailer) {}

  async handle(event: EmailCodeRequestedEvent): Promise<void> {
    try {
      await this.mailer.send(
        await verificationCodeEmail(event.email, {
          code: event.code,
          expiresInMinutes: event.expiresInMinutes,
          locale: 'en-US', //TODO: CHANGE so the locale is infered from ip or whatever else
          baseUrl: 'https://d34yicvl9up261.cloudfront.net',
        }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to send verification coe to ${event.email}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
