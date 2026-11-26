import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import type { Mailer } from '@modules/mail/mail.service.js';
import {
  EmailCodeRequestedEvent,
  PasswordResetRequestedEvent,
} from '../domain/events/auth.events.js';
import { SendPasswordResetEmailHandler } from './send-password-reset-email.handler.js';
import { SendVerificationEmailHandler } from './send-verification-email.handler.js';

// The mail is sent after the command answered: a mailer failure must not
// throw out of the event handler (it would surface as an unhandled rejection).

const mailConfig = {
  driver: 'console' as const,
  from: 'no-reply@example.com',
  region: 'us-east-2',
  webAppUrl: 'https://app.example.com',
};

let mailer: Mailer;
let logged: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  mailer = { send: vi.fn().mockResolvedValue(undefined) };
  logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('SendVerificationEmailHandler', () => {
  const event = new EmailCodeRequestedEvent('pro@planici.co', '482913', 15);

  it('mails the code to the requested address', async () => {
    await new SendVerificationEmailHandler(mailer).handle(event);

    const [message] = vi.mocked(mailer.send).mock.calls[0] ?? [];
    expect(message?.to).toBe('pro@planici.co');
    expect(message?.text).toContain('482913');
    expect(message?.html).toContain('482913');
  });

  it('logs a mailer failure instead of throwing', async () => {
    vi.mocked(mailer.send).mockRejectedValue(new Error('SES throttled'));

    await expect(
      new SendVerificationEmailHandler(mailer).handle(event),
    ).resolves.toBeUndefined();
    expect(logged).toHaveBeenCalledOnce();
  });
});

describe('SendPasswordResetEmailHandler', () => {
  const event = new PasswordResetRequestedEvent(
    'user-1',
    'pro@planici.co',
    'Ana',
    'reset/token+with=chars',
    60,
  );

  it('mails a link to the web app with the token URL-encoded', async () => {
    await new SendPasswordResetEmailHandler(mailer, mailConfig).handle(event);

    const [message] = vi.mocked(mailer.send).mock.calls[0] ?? [];
    expect(message?.to).toBe('pro@planici.co');
    expect(message?.text).toContain(
      'https://app.example.com/reset-password?token=reset%2Ftoken%2Bwith%3Dchars',
    );
  });

  it('logs a mailer failure instead of throwing', async () => {
    vi.mocked(mailer.send).mockRejectedValue(new Error('SES throttled'));

    await expect(
      new SendPasswordResetEmailHandler(mailer, mailConfig).handle(event),
    ).resolves.toBeUndefined();
    expect(logged).toHaveBeenCalledOnce();
  });
});
