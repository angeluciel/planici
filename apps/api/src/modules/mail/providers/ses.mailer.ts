import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { mailConfig } from '@/config/namespaces/mail.config.js';
import type { Mailer, MailMessage } from '../mail.service.js';

/**
 * Transactional e-mail sent via AWS SES
 */
@Injectable()
export class SesMailer implements Mailer {
  private readonly logger = new Logger(SesMailer.name);
  private readonly client: SESv2Client;

  constructor(
    @Inject(mailConfig.KEY)
    private readonly config: ConfigType<typeof mailConfig>,
  ) {
    this.client = new SESv2Client({ region: config.region });
  }

  async send(message: MailMessage): Promise<void> {
    await this.client.send(
      new SendEmailCommand({
        FromEmailAddress: this.config.from,
        Destination: { ToAddresses: [message.to] },
        Content: {
          Simple: {
            Subject: { Data: message.subject, Charset: 'UTF-8' },
            Body: {
              Html: { Data: message.html, Charset: 'UTF-8' },
              Text: { Data: message.text, Charset: 'UTF-8' },
            },
          },
        },
      }),
    );
    this.logger.log(`Sent "${message.subject}" to ${message.to}`);
  }
}
