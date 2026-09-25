-- app-role.sql (JOA-39)
--
-- Idempotent creation/update of the restricted runtime role the api connects
-- with at query time (`DATABASE_URL_APP`). NOT a drizzle-kit migration (lives
-- outside apps/api/drizzle/ on purpose so drizzle-kit never tries to
-- track/diff it) — safe to (re)run on every fresh throwaway Postgres
-- container and against Neon.
--
-- Ports .ai/work/JOA-19/platform.md steps 1-3 (prose runbook) into a
-- versioned, parameterized script. See apps/api/src/database/schema/rls.ts
-- for why this role must never be a superuser, bypass RLS, or own a table.
--
-- Run as the owner/migration role (the same role `DATABASE_URL` / drizzle-kit
-- migrations use) — ALTER DEFAULT PRIVILEGES below is scoped to CURRENT_USER,
-- i.e. whichever role runs this script, so it must be run by the actual
-- migration/owner role in each environment:
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -v app_role=planici_app -v app_password='<strong-password>' \
--     -f apps/api/src/database/bootstrap/app-role.sql
--
-- :"app_role" / :'app_password' are psql variables (identifier / literal
-- interpolation respectively) — the database name is never hardcoded here,
-- it's read from current_database() at run time so the same script works
-- unmodified against local compose Postgres, Neon dev, and Neon prod.

\set ON_ERROR_STOP on

-- 1. Create the role if it doesn't exist yet (bare — attributes and password
--    are (re)applied unconditionally by the ALTER ROLE below, so this branch
--    only needs to make the role exist at all). \gexec runs whatever SQL
--    text the preceding query returns, 0 rows -> no-op -> idempotent.
SELECT format('CREATE ROLE %I', :'app_role')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_role')
\gexec

-- 2. (Re)apply login + password + the explicit non-bypassing attribute set
--    every run, whether the role was just created above or already existed.
--    Stating these explicitly (rather than relying on CREATE ROLE defaults)
--    means a future edit to this file can't silently regress the RLS
--    security boundary FORCE ROW LEVEL SECURITY relies on.
ALTER ROLE :"app_role" WITH
  LOGIN
  PASSWORD :'app_password'
  NOSUPERUSER
  NOBYPASSRLS
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION;

-- 3. Let it connect and use the schema (does not grant table access by
--    itself). GRANT CONNECT ON DATABASE needs an identifier, not an
--    expression, so route current_database() through format()/\gexec.
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'app_role')
\gexec

GRANT USAGE ON SCHEMA public TO :"app_role";

-- 4. DML on every table that exists today.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"app_role";

-- 5. Sequence usage, so INSERT with serial/identity/sequence-backed defaults
--    works. (Planici's PKs are uuid defaults, not sequences, but grant it
--    for completeness / any future sequence-backed column.)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"app_role";

-- 6. DML on every table created *in the future* by the role running this
--    script, without re-running the grants above after each migration.
--    ALTER DEFAULT PRIVILEGES only applies to objects created by the role
--    named here — CURRENT_USER is the role this script connects/runs as,
--    which must be the same owner/migration role drizzle-kit migrates with.
ALTER DEFAULT PRIVILEGES FOR ROLE CURRENT_USER IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app_role";
ALTER DEFAULT PRIVILEGES FOR ROLE CURRENT_USER IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO :"app_role";

-- Explicitly NOT granted: CREATE, DROP, ALTER, TRUNCATE, REFERENCES,
-- TRIGGER, table ownership. :"app_role" must never be able to run
-- migrations or change RLS policies on tables it can read/write.
