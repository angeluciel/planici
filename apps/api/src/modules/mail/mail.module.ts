import { Global, Module } from '@nestjs/common';
import { ConsoleMailer } from './providers/console.mailer.js';
import { SesMailer } from './providers/ses.mailer.js';
import { MAILER } from './mail.service.js';
import { mailConfig } from '@config/namespaces/mail.config.js';
import { ConfigType } from '@nestjs/config';

@Global()
@Module({
  providers: [
    ConsoleMailer,
    SesMailer,
    {
      provide: MAILER,
      inject: [mailConfig.KEY, ConsoleMailer, SesMailer],
      useFactory: (
        config: ConfigType<typeof mailConfig>,
        console: ConsoleMailer,
        ses: SesMailer,
      ) => (config.driver === 'ses' ? ses : console),
    },
  ],
  exports: [MAILER],
})
export class MailModule {}
