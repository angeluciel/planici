# @planici/schemas — the contract between web and api

Owner: `contracts-owner`. This is the dependency hub: web and api agents wait on changes here.

- One folder per bounded context (`src/auth/`): `requests.ts`, `responses.ts`, `errors.ts`, per-flow files.
- Export `XSchema` (Zod) and `XInput` / `XResponse` (inferred types) from `src/index.ts`.
- Breaking a schema = breaking both apps. Prefer additive changes; list consumers in the PR.
- After editing: `pnpm --filter @planici/schemas build`, then update `.ai/context/contracts.md`.
