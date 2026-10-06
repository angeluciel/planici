import { registerAs } from '@nestjs/config';

export const mailConfig = registerAs('mail', () => ({
  driver: (process.env.MAIL_DRIVER ?? 'console') as 'console' | 'ses',
  from: process.env.SES_FROM_EMAIL ?? 'no-reply@joaoizidoro.com',
  region: process.env.AWS_REGION ?? 'us-east-2',
  webAppUrl: process.env.WEB_APP_URL ?? 'https://joaoizidoro.com',
}));
