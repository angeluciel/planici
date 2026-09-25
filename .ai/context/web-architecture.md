---
owner: web-engineer
sources:
  - apps/web/src/**
  - apps/web/tests/**
  - packages/i18n/**
verified_at: 375b5d9
---
# Web architecture — context card

## Routing
`src/app/[lang]/` with groups `(auth)` (login, register w/ stepper) and `(legal)`. `src/proxy.ts` handles locale.
BFF routes: `src/app/api/auth/{availability,email/code,email/verify,me,password/forgot,password/reset,refresh,register,session}`.

## Data
`src/lib/api/client.ts` → per-flow modules (login, register, google, email-verification). Session cookies in `app/api/_lib/session.ts`.
Register draft persisted by `hooks/use-register-draft.ts` + `lib/register-draft.ts`.

## UI
Shared components in `src/components/` (button, input, input-otp, alert, checkbox, stepper, consent/*).
Tokens: see design-system card. Consent banner gates analytics (`consent/analytics-gate.tsx`).

## Gotchas
- apps/web has tests in `tests/` but **no `test` script** in package.json → turbo `test` skips web.
