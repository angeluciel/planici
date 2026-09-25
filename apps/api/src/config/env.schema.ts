import { z } from 'zod';

const duration = z
  .string()
  .regex(/^\d+[smhd]$/, 'expected a duration like 15m, 24h or 30d');

/**
 * the one place process.env is read. */

/**
 * JOA-19 review N1: NODE_ENV has no silent default. Missing NODE_ENV fails
 * boot. `prod` is accepted and normalized to `production`; anything else is
 * rejected. This closes the "prod forgot to set NODE_ENV" fail-open hole,
 * since the production superRefine below (DATABASE_URL_APP required) only
 * fires when NODE_ENV strictly equals 'production'.
 */
const nodeEnv = z
  .string({ error: 'NODE_ENV is required' })
  .min(1, 'NODE_ENV is required')
  .transform((value, ctx) => {
    const normalized = value === 'prod' ? 'production' : value;
    if (
      normalized !== 'development' &&
      normalized !== 'test' &&
      normalized !== 'production'
    ) {
      ctx.addIssue({
        code: 'custom',
        message:
          "NODE_ENV must be 'development', 'test' or 'production' (or 'prod', normalized to 'production')",
      });
      return z.NEVER;
    }
    return normalized as 'development' | 'test' | 'production';
  });

export const envSchema = z
  .object({
    NODE_ENV: nodeEnv,
    PORT: z.coerce.number().int().positive().default(3333),
    CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
    WEB_APP_URL: z.url().default('http://localhost:3000'),

    DATABASE_URL: z.string().min(1),
    /**
     * Runtime app connection (non-owner, non-superuser, non-BYPASSRLS role —
     * JOA-19 AC6). Optional in development/test only, where `database.config.ts`
     * falls back to `DATABASE_URL`; in production it is required (fail closed
     * at boot — see the `superRefine` below) so the app can never silently run
     * as the owner/superuser role and bypass RLS.
     */
    DATABASE_URL_APP: z.string().min(1).optional(),
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

    OBSERVE_APP_KEY: z.string().min(1),
    OBSERVE_APP_SECRET: z.string().min(1),

    /**
     * Set by the Lambda runtime itself (never by us) whenever the process is
     * an AWS Lambda function. Used only as a deployed-runtime guard (see the
     * superRefine below) — not a general "are we serverless" flag.
     */
    AWS_LAMBDA_FUNCTION_NAME: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // JOA-19 AC6, fail closed: in production the app must connect with the
    // non-owner/non-superuser role. Falling back to `DATABASE_URL` (the
    // owner/migration role) is only acceptable in development/test.
    if (data.NODE_ENV === 'production' && !data.DATABASE_URL_APP) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL_APP'],
        message:
          'DATABASE_URL_APP is required in production (fail closed — DATABASE_URL fallback bypasses RLS, JOA-19 AC6)',
      });
    }

    // JOA-19 review N1: AWS_LAMBDA_FUNCTION_NAME is set by the Lambda
    // runtime whenever this process is a deployed Lambda function. If it's
    // present, NODE_ENV must resolve to production — covers "prod set to
    // development/test" (and, combined with NODE_ENV having no default
    // above, "prod forgot to set NODE_ENV" too).
    if (data.AWS_LAMBDA_FUNCTION_NAME && data.NODE_ENV !== 'production') {
      ctx.addIssue({
        code: 'custom',
        path: ['NODE_ENV'],
        message:
          'NODE_ENV must resolve to production when running on AWS Lambda (AWS_LAMBDA_FUNCTION_NAME is set)',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => ` - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment:\n${issues}`);
  }
  return result.data;
}
