import { z } from 'zod';

const duration = z
  .string()
  .regex(/^\d+[smhd]$/, 'expected a duration like 15m, 24h or 30d');

/**
 * the one place process.env is read. */

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
  WEB_APP_URL: z.url().default('http://localhost:3000'),

  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  DATABASE_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  JWT_ACCESS_TTL: duration.default('15m'),
  JWT_REFRESH_TTL: duration.default('30d'),
  JWT_EMAIL_VERIFICATION_TTL: duration.default('30m'),

  BCRYPT_COST: z.coerce.number().int().min(10).max(15).default(12),
  EMAIL_CODE_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  EMAIL_CODE_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  EMAIL_CODE_RESEND_SECONDS: z.coerce.number().int().positive().default(60),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(60),
  LOGIN_MAX_FAILURES: z.coerce.number().int().positive().default(5),
  LOGIN_LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),

  GOOGLE_CLIENT_ID: z.string().default(''),

  /** Test-only escape hatch for the per-IP throttler. */
  THROTTLE_DISABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  MAIL_DRIVER: z.enum(['console', 'ses']).default('console'),
  SES_FROM_EMAIL: z.email().default('no-reply@planici.co'),
  AWS_REGION: z.string().default('us-east-1'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => ` - ${issue.path.join}(".")}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment:\n${issues}`);
  }
  return result.data;
}
