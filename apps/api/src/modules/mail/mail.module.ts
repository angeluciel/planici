import { Global, Logger, Module } from '@nestjs/common';
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
      ) => {
        const logger = new Logger('MailModule');
        const nodeEnv = process.env.NODE_ENV ?? 'development';
        const driver = config.driver === 'ses' ? 'ses' : 'console';

        if (nodeEnv === 'production' && driver !== 'ses') {
          throw new Error("MAIL_DRIVER must be 'ses' in production.");
        }
        if (nodeEnv !== 'production' && driver === 'ses') {
          throw new Error("MAIL_DRIVER 'ses' is only allowed in production.");
        }

        logger.log(
          driver === 'ses'
            ? `Mailer driver=ses region=${config.region} from=${config.from} env=${nodeEnv}`
            : `Mailer driver=console env=${nodeEnv} (messages are printed, not sent)`,
        );
        return driver === 'ses' ? ses : console;
      },
    },
  ],
  exports: [MAILER],
})
export class MailModule {}
