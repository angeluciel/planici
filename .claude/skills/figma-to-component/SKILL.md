---
name: figma-to-component
description: Implement a Figma frame or component in apps/web using Planici's token layers, shared components, next-intl and accessibility rules. Use when building or updating UI from a Figma link or node id.
---

# Figma → component

1. Use the Figma MCP only for the node ids the spec or the owner gives you (design context and screenshot).
2. Reuse first: check `apps/web/src/components/` before creating anything.
3. Map every value to a **semantic** token (`apps/web/src/styles/tokens/semantic/*`). For a missing token, add it to the
   semantic layer referencing a primitive, and mention it in your report. No raw hex, px spacing or font values.
4. Page-specific components go in the route's `_components/`; only generic pieces go in `src/components/`.
5. Strings through next-intl. Add keys to both `packages/i18n/messages/pt-BR.json` and `en-US.json`.
6. Forms use the shared Zod schema from `@planici/schemas` and error i18n keys, with visible labels,
   `aria-invalid`/`aria-describedby`, and a logical focus order.
7. Implement every state: loading, empty, error, success, disabled.
8. Test in `apps/web/tests/` with Testing Library: query by role and label, assert behavior, not markup.
9. Next.js 16 differs from older versions: when unsure about an API, read `apps/web/AGENTS.md` and the docs it points to
   (or use Context7) before writing code.
