# apps/web — Next.js 16 (App Router), React 19, next-intl

Read `.ai/context/web-architecture.md` and `.ai/context/design-system.md` first. Summary:

- Routes: `src/app/[lang]/(group)/<route>/page.tsx`; route-private components in `_components/`.
- BFF: `src/app/api/**/route.ts` proxies to the Nest API (session cookies in `api/_lib/session.ts`).
- Client API calls: `src/lib/api/*` → validate with `@planici/schemas`.
- Styling: CSS tokens in `src/styles/tokens/` (primitives → semantic → components). Never hardcode colors/spacing.
- i18n: all user-facing strings in `packages/i18n/messages/{pt-BR,en-US}.json` — update both.
- Accessibility is an MVP requirement: labels, focus states, keyboard flow on every form.
- Tests: `tests/*.test.tsx` (vitest + Testing Library).

Figma → component → skill `figma-to-component`.
