---
name: drizzle-migration
description: Change the Planici Postgres schema with Drizzle (tables, columns, indexes, enums, constraints) and generate the migration safely. Use for any database change in apps/api.
---

# Drizzle migration

1. Edit or add `apps/api/src/database/schema/<table>.ts`; export it from `schema/index.ts`.
   - snake_case columns, `idx_<table>_<cols>` index names, PK style as in existing tables.
   - Tenant-scoped data: `tenant_id` NOT NULL, FK to tenants, index on it, and unique constraints scoped by tenant.
   - Enforce business rules in the database when possible (unique, check, exclusion constraints, such as no overlapping appointments).
2. Generate: `pnpm --filter api exec drizzle-kit generate --name <snake_case_change>`.
3. Read the generated SQL. For destructive operations (drop, rename, type narrowing), stop and write an
   expand → migrate → contract plan for the owner instead.
4. Never edit `drizzle/meta/**` (a hook blocks it). Never edit a migration that already reached `dev`; add a new one.
   Never use `drizzle-kit push` or `drop` (also blocked).
5. Verify with `pnpm --filter api test:e2e` (Testcontainers applies every migration from scratch).
6. Mirror the change in `docs/schema.dbml`.
7. Report what a rollback would lose.
