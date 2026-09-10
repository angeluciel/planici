import { beforeEach, describe, expect, vi, it } from 'vitest';
import { hashSecret } from '@/shared/crypto/hash.js';
import {
  ExpiredCodeError,
  InvalidCodeError,
  TooManyCodeAttemptsError,
} from '@/modules/auth/domain/errors/auth.errors.js';
import type {
  EmailVerification,
  EmailVerificationRepository,
} from '../../repositories/email-verification.repository.js';
import type { TokenService } from '../../services/token.service.js';
import { VerifyEmailCodeCommand } from './verify-email-code.command.js';
import { VerifyEmailCodeHandler } from './verify-email-code.handler.js';

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

function verification(
  overrides: Partial<EmailVerification> = {},
): EmailVerification {
  return {
    id: 'verification-1',
    email: 'pro@planici.co',
    codeHash: hashSecret('123456'),
    attempts: 0,
    expiresAt: new Date(Date.now() + 60_000),
    consumedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('VerifyEmailCodeHandler', () => {
  let repository: EmailVerificationRepository;
  let tokens: TokenService;
  let handler: VerifyEmailCodeHandler;

  beforeEach(() => {
    repository = {
      issue: vi.fn(),
      findActive: vi.fn(),
      findLatest: vi.fn(),
      incrementAttempts: vi.fn().mockResolvedValue(1),
      consume: vi.fn(),
    };

    tokens = {
      signAccessToken: vi.fn(),
      issueRefreshToken: vi.fn(),
      signEmailVerificationToken: vi
        .fn()
        .mockResolvedValue({ token: 'proof-token', expiresIn: 1800 }),
      verifyEmailVerificationToken: vi.fn(),
    };

    handler = new VerifyEmailCodeHandler(repository, tokens, config);
  });

  it('exchanges a correct code for a proof token and burns the code', async () => {
    vi.mocked(repository.findActive).mockResolvedValue(verification());

    const result = await handler.execute(
      new VerifyEmailCodeCommand('pro@planici.co', '123456'),
    );

    expect(result.emailVerificationToken).toBe('proof-token');
    expect(repository.consume).toHaveBeenCalledWith('verification-1');
  });

  it('rejects an expired code', async () => {
    vi.mocked(repository.findActive).mockResolvedValue(
      verification({ expiresAt: new Date(Date.now() - 1) }),
    );

    await expect(
      handler.execute(new VerifyEmailCodeCommand('pro@planici.co', '123456')),
    ).rejects.toBeInstanceOf(ExpiredCodeError);
  });

  it('counts a wrong code against the attempt cap', async () => {
    vi.mocked(repository.findActive).mockResolvedValue(verification());

    await expect(
      handler.execute(new VerifyEmailCodeCommand('pro@planici.co', '000000')),
    ).rejects.toBeInstanceOf(InvalidCodeError);
    expect(repository.incrementAttempts).toHaveBeenCalledWith('verification-1');
    expect(repository.consume).not.toHaveBeenCalled();
  });

  it('switches to `code.attempts` once the cap is reached, so guessing stops', async () => {
    vi.mocked(repository.findActive).mockResolvedValue(verification());
    vi.mocked(repository.incrementAttempts).mockResolvedValue(
      config.emailCodeMaxAttempts,
    );

    await expect(
      handler.execute(new VerifyEmailCodeCommand('pro@planici.co', '000000')),
    ).rejects.toBeInstanceOf(TooManyCodeAttemptsError);
  });

  it('refuses further attempts on a code already at the cap', async () => {
    vi.mocked(repository.findActive).mockResolvedValue(
      verification({ attempts: config.emailCodeMaxAttempts }),
    );

    await expect(
      handler.execute(new VerifyEmailCodeCommand('pro@planici.co', '123456')),
    ).rejects.toBeInstanceOf(TooManyCodeAttemptsError);
  });

  it('treats a missing code as invalid rather than revealing nothing was issued', async () => {
    vi.mocked(repository.findActive).mockResolvedValue(null);

    await expect(
      handler.execute(new VerifyEmailCodeCommand('pro@planici.co', '123456')),
    ).rejects.toBeInstanceOf(InvalidCodeError);
  });
});
