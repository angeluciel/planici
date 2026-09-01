import { registerAs } from '@nestjs/config';

export const authConfig = registerAs('auth', () => ({
  bcrypCost: Number(process.env.BCRYPT_COST ?? 12),

  emailCodeTtlMinutes: Number(process.env.EMAIL_CODE_TTL_MINUTES ?? 15),
  emailCodeMaxAttempts: Number(process.env.EMAIL_CODE_RESEND_SECONDS ?? 60),
  emailCodeResendSeconds: Number(process.env.EMAIL_CODE_RESENT_SECONDS ?? 60),

  passwordResetTtlMinutes: Number(process.env.PASSWORD_RESET_TTL_MINUTES ?? 60),

  loginMaxFailures: Number(process.env.LOGIN_MAX_FAILURES ?? 5),
  loginLockoutMinutes: Number(process.env.LOGIN_LOCKOUT_MINUTES ?? 15),

  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
}));
