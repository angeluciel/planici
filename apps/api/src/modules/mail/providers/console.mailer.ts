import { Injectable, Logger } from '@nestjs/common';
import type { Mailer, MailMessage } from '../mail.service.js';

/**
 * Dev and Test transport. Prints the message instead of sending the e-mail via ses
 */
@Injectable()
export class ConsoleMailer implements Mailer {
  private readonly logger = new Logger(ConsoleMailer.name);

  async send(message: MailMessage): Promise<void> {
    this.logger.log(
      `\n--- mail to ${message.to}\n${message.subject}\n${message.text}\n---`,
    );
  }
}
