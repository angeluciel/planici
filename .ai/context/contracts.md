---
owner: contracts-owner
sources:
  - packages/schemas/src/**
verified_at: 375b5d9
---
# Contracts (@planici/schemas) — context card

## What it is
Zod schemas + inferred types shared by apps/api (validation via ZodBody pipe) and apps/web (forms, BFF).
Must be built (`pnpm --filter @planici/schemas build`) before dependents typecheck.

## Current exports
| File | Exports |
|---|---|
| src/common.ts | shared primitives |
| src/auth/register.ts | CreateUser, *StepSchema (account/password/terms/profile/verify-email), PASSWORD_*, SLUG_PATTERN, EMAIL_CODE_* |
| src/auth/requests.ts | PasswordSchema, CodeSchema, RequestEmailCode, VerifyEmailCode, Consent, RegisterRequest, LoginRequest (discriminated on `provider`), RefreshRequest, ForgotPassword, ResetPassword |
| src/auth/login.ts | EmailLoginSchema |
| src/auth/responses.ts | SessionResponse, … |
| src/auth/errors.ts | AUTH_ERROR_CODES, AuthErrorCode, ApiErrorBody |

## Conventions
- `XSchema` + `XInput` (z.input) / `XData` (z.output). Error messages are i18n keys (`code.required`).
- Error bodies: `ApiErrorBody` with a code from `*_ERROR_CODES`; web maps codes to i18n.
