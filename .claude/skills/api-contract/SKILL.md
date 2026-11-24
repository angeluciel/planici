---
name: api-contract
description: Add or change a Zod request/response/error schema in packages/schemas, shared by apps/web and apps/api. Use whenever an endpoint's input or output shape changes.
---

# API contract

1. Put it in `packages/schemas/src/<context>/` (`requests.ts`, `responses.ts`, `errors.ts`, or a flow file like `register.ts`).
2. Name it `XSchema`; export `type XInput = z.input<…>` and `type XData = z.output<…>` (or `XResponse`).
3. Normalization is part of the contract (trim, lowercase, max lengths). Reuse existing shared constants.
4. Error messages are i18n keys (`"field.rule"`). Add both locales in `packages/i18n` for every new key.
5. New error codes: append to the context's `*_ERROR_CODES` tuple. Never reorder or rename existing ones.
6. Follow `docs/architecture/api-convention.md`: no response wrapper, `{ error, field? }` errors, camelCase JSON.
7. Re-export from `src/index.ts`, then `pnpm --filter @planici/schemas build && pnpm typecheck`.
8. Breaking change? List every import site (`rg "<Name>" apps/`) in your report so both consumers are checked.
