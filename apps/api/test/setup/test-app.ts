import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { AppModule } from '@/app.module.js';
import {
  MAILER,
  type Mailer,
  type MailMessage,
} from '@/modules/mail/mail.service.js';
import { DomainExceptionFilter } from '@/shared/http/domain-exception.filter.js';
import { inject } from 'vitest';
import { PG_POOL } from '@/database/database.constants.js';

// captura o e-mail enviado
export class CapturingMailer implements Mailer {
  readonly sent: MailMessage[] = [];

  async send(message: MailMessage): Promise<void> {
    this.sent.push(message);
  }

  lastTo(email: string): MailMessage | undefined {
    return [...this.sent].reverse().find((message) => message.to === email);
  }

  // envio pelo event bus pro código HTTP chegar antes do e-mail
  async waitFor(
    email: string,
    { timeoutMs = 2_000 }: { after?: number; timeoutMs?: number } = {},
  ): Promise<MailMessage> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const message = this.lastTo(email);
      if (message) return message;

      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error(`No mail to ${email} within ${timeoutMs}ms`);
  }

  clear(): void {
    this.sent.length = 0;
  }
}

export type TestContext = {
  app: INestApplication;
  mailer: CapturingMailer;
  pool: Pool;
  truncate: () => Promise<void>;
  close: () => Promise<void>;
};

export async function createTestApp(): Promise<TestContext> {
  const mailer = new CapturingMailer();
  const expectedUrl = inject('testDatabaseUrl');

  if (
    process.env.NODE_ENV !== 'test' ||
    !expectedUrl ||
    process.env.DATABASE_URL !== expectedUrl
  ) {
    throw new Error('Test app required the provisioned E2E database');
  }

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MAILER)
    .useValue(mailer)
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('v1');
  app.useGlobalFilters(new DomainExceptionFilter());
  await app.init();

  const pool = app.get<Pool>(PG_POOL);

  const truncate = async () => {
    await pool.query(
      'truncate table users, user_identities, user_consents, email_verifications, password_reset_tokens, refresh_tokens, login_attempts, tenant_memberships, tenants restart identity cascade',
    );
    mailer.clear();
  };

  return {
    app,
    mailer,
    pool,
    truncate,
    close: () => app.close(),
  };
}

export function codeFrom(message: MailMessage | undefined): string {
  const match = /\b(\d{6})\b/.exec(message?.text ?? '');
  if (!match?.[1])
    throw new Error(`No verification code in: ${message?.text ?? '<no mail>'}`);

  return match[1];
}

export function resetTokenFrom(message: MailMessage | undefined): string {
  const match = /reset-password\?token=([^\s"]+)/.exec(message?.text ?? '');
  if (!match?.[1])
    throw new Error(`No reset token in: ${message?.text ?? '<no mail>'}`);

  return decodeURIComponent(match[1]);
}
