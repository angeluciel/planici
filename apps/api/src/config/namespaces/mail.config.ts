import { registerAs } from '@nestjs/config';

export const mailConfig = registerAs('mail', () => ({
  driver: (process.env.MAIL_DRIVER ?? 'console') as 'console' | 'ses',
  from: process.env.SES_FROM_EMAIL ?? 'no-reply@planici.co',
  region: process.env.AWS_REGION ?? 'us-east-1',
  //TODO: CHANGE URL
  // Base URL for links inside transactional e-mails (like pwd reset)
  webAppUrl: process.env.WEB_APP_URL ?? 'http://localhost:3000',
}));
