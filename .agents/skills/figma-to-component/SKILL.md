---
name: figma-to-component
description: Implement a Figma frame or component in apps/web using the Planici token layers, shared components, next-intl and accessibility rules. Use when building or updating UI from ui.md or a Figma link.
---
# Figma → component

1. Start from `ui.md`. Use the Figma MCP only for node ids listed there (design context + screenshot).
2. Reuse first: check `apps/web/src/components/` (button, input, input-otp, alert, checkbox, stepper).
3. Map every value to a **semantic** token (`styles/tokens/semantic/*`). Missing token → add to semantic layer, referencing a primitive; note it in web.md.
4. Page components go in the route's `_components/`; only generic pieces go in `src/components/`.
5. Strings via next-intl; add keys to `packages/i18n/messages/pt-BR.json` and `en-US.json`.
6. Forms: shared Zod schema from `@planici/schemas`, errors from i18n keys, visible labels, `aria-invalid`/`aria-describedby`, logical focus order.
7. Implement every state in ui.md (empty/loading/error/success/disabled).
8. Test in `apps/web/tests/` with Testing Library (behavior, not markup).
