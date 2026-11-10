---
description: Write the implementation plan for an approved spec, including the scope that /implement locks
argument-hint: SPEC-XXXX
allowed-tools: Read, Edit, Glob, Grep, Agent, mcp__postgres
---

Produce the implementation plan for $ARGUMENTS and write it into the spec's `## Implementation plan` section.

1. Read the spec. If `status` is not `Approved`, stop and say so.
2. Explore the code the change touches. Use the skills that apply: `api-contract`, `drizzle-migration`,
   `cqrs-command`, `figma-to-component`.
3. Write the plan:
   - **Scope** — a fenced block that `/implement` turns into the edit lock. One glob per line, repo-relative,
     including test paths. As narrow as possible; `*` crosses directories.
     ````
     ```scope
     packages/schemas/src/clients/*
     apps/api/src/modules/clients/*
     apps/api/src/database/schema/clients.ts
     apps/api/src/database/schema/index.ts
     apps/api/drizzle/*.sql
     apps/api/test/e2e/clients*
     ```
     ````
   - **Contracts** — schemas added/changed, error keys, breaking or not, consumers.
   - **Persistence** — tables, columns, constraints, indexes, the migration, and what a rollback loses.
   - **API** — method, path, status codes, guards, ACs covered.
   - **Web** — routes, components, states, i18n keys.
   - **Tests** — for every in-scope AC, the test file and test name, so an unmapped AC is visible now.
     - Deferred checks: ACs that can only be verified once another spec is implemented. List each with the spec
       that will verify it. When this plan verifies ACs deferred from an earlier spec, list them in the test table
       and include that spec's file in the scope block.
   - **Sequence** — commit-sized steps: contracts → schema/migration → failing tests → api → web.
   - **Risks** — what could invalidate the plan and the cheapest way to find out early.
   - **New dependencies** — each justified. None by default.
4. Leave `plan_status: Draft`.

Do not write code. Stop and suggest `/spec-review $ARGUMENTS plan`, then wait for the owner's approval.
