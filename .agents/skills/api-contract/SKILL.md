---
name: api-contract
description: Add or change a Zod request/response/error schema in packages/schemas shared by apps/web and apps/api. Use whenever an endpoint's input or output shape changes.
---
# API contract

1. Put it in `packages/schemas/src/<context>/` (`requests.ts`, `responses.ts`, `errors.ts`, or a flow file like `register.ts`).
2. Name `XSchema`; export `type XInput = z.input<…>` and `type XData = z.output<…>` (or `XResponse`).
3. Error messages are i18n keys (`"field.rule"`), and web must have both locales for them (note it in contracts.md for web-engineer).
4. New error codes → append to the context's `*_ERROR_CODES` tuple, never reorder.
5. Re-export from `src/index.ts`. `pnpm --filter @planici/schemas build && pnpm typecheck`.
6. Breaking change? List every import site (`grep -r "<Name>" apps/`) in contracts.md so the orchestrator re-runs those owners.
