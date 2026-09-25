---
name: drizzle-migration
description: Change the Planici Postgres schema with Drizzle (tables, columns, indexes, enums) and generate the migration safely. Use for any database change in apps/api.
---
# Drizzle migration

1. Edit/add `apps/api/src/database/schema/<table>.ts`; export it from `schema/index.ts`.
   - snake_case columns, `idx_<table>_<cols>` names, uuid PKs as in existing tables.
   - Tenant-scoped data: `tenantId` NOT NULL, FK tenants (cascade), index on it.
   - Enforce business rules in the DB when possible (unique / exclusion constraints, e.g. no overlapping appointments).
2. Generate: `pnpm --filter api exec drizzle-kit generate --name <snake_case_change>`.
3. Read the generated SQL. Check for destructive ops (drop/rename); for those, write an expand → migrate → contract plan in db.md instead.
4. Never edit `drizzle/meta/**`. Never edit an already-merged migration; add a new one.
5. Verify with `pnpm --filter api test:e2e` (Testcontainers applies all migrations).
6. Mirror the change in `docs/schema.dbml` and the db-schema card.
