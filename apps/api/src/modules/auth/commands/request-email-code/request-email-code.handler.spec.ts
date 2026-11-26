import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventBus } from '@nestjs/cqrs';
import { hashSecret } from '@shared/crypto/hash.js';
import type { TokenGenerator } from '@shared/crypto/token.generator.js';
import {
  CodeRateLimitedError,
  EmailTakenError,
} from '@modules/auth/domain/errors/auth.errors.js';
import { EmailCodeRequestedEvent } from '@modules/auth/domain/events/auth.events.js';
import type {
  EmailVerification,
  EmailVerificationRepository,
} from '../../ports/repositories/email-verification.repository.js';
import type { UserRepository } from '../../ports/repositories/user.repository.js';
import { RequestEmailCodeCommand } from './request-email-code.command.js';
import { RequestEmailCodeHandler } from './request-email-code.handler.js';

const config = {
  emailCodeMaxAttempts: 3,
  emailCodeTtlMinutes: 15,
  emailCodeResendSeconds: 60,
  bcryptCost: 4,
  passwordResetTtlMinutes: 60,
  loginMaxFailures: 5,
  loginLockoutMinutes: 15,
  googleClientId: '',
};

function sentSecondsAgo(seconds: number): EmailVerification {
  return {
    id: 'verification-1',
    email: 'pro@planici.co',
    codeHash: hashSecret('111111'),
    attempts: 0,
    expiresAt: new Date(Date.now() + 60_000),
    consumedAt: null,
    createdAt: new Date(Date.now() - seconds * 1000),
  };
}

describe('RequestEmailCodeHandler', () => {
  let verifications: EmailVerificationRepository;
  let users: UserRepository;
  let events: EventBus;
  let handler: RequestEmailCodeHandler;

  beforeEach(() => {
    verifications = {
      findLatest: vi.fn().mockResolvedValue(null),
      issue: vi.fn(),
    } as unknown as EmailVerificationRepository;
    users = {
      emailExists: vi.fn().mockResolvedValue(false),
    } as unknown as UserRepository;
    events = { publish: vi.fn() } as unknown as EventBus;

    handler = new RequestEmailCodeHandler(
      verifications,
      users,
      config,
      { emailCode: () => '482913' } as unknown as TokenGenerator,
      events,
    );
  });

  const request = (email = '  Pro@Planici.co ') =>
    handler.execute(new RequestEmailCodeCommand(email, '203.0.113.7'));

  it('stores only the hash of the code and mails the code itself', async () => {
    await request();

    expect(verifications.issue).toHaveBeenCalledWith(
      'pro@planici.co',
      hashSecret('482913'),
      expect.any(Date),
      '203.0.113.7',
    );
    expect(vi.mocked(verifications.issue).mock.calls[0]).not.toContain(
      '482913',
    );
    const [event] = vi.mocked(events.publish).mock.calls[0] ?? [];
    expect(event).toBeInstanceOf(EmailCodeRequestedEvent);
    expect(event).toMatchObject({
      email: 'pro@planici.co',
      code: '482913',
      expiresInMinutes: 15,
    });
  });

  it('makes the code expire after emailCodeTtlMinutes', async () => {
    const before = Date.now();

    await request();

    const expiresAt = vi.mocked(verifications.issue).mock.calls[0]?.[2];
    expect(expiresAt?.getTime()).toBeGreaterThanOrEqual(before + 15 * 60_000);
    expect(expiresAt?.getTime()).toBeLessThanOrEqual(Date.now() + 15 * 60_000);
  });

  it('refuses a new code within emailCodeResendSeconds of the last one, and mails nothing', async () => {
    vi.mocked(verifications.findLatest).mockResolvedValue(sentSecondsAgo(30));

    await expect(request()).rejects.toBeInstanceOf(CodeRateLimitedError);
    expect(verifications.issue).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('sends a new code once the cooldown has passed', async () => {
    vi.mocked(verifications.findLatest).mockResolvedValue(sentSecondsAgo(61));

    await request();

    expect(verifications.issue).toHaveBeenCalledOnce();
    expect(events.publish).toHaveBeenCalledOnce();
  });

  it('answers email.taken for an address that already has an account', async () => {
    vi.mocked(users.emailExists).mockResolvedValue(true);

    await expect(request()).rejects.toBeInstanceOf(EmailTakenError);
    expect(verifications.findLatest).not.toHaveBeenCalled();
    expect(verifications.issue).not.toHaveBeenCalled();
  });
});
