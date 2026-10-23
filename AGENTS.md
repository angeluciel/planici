# Planici - agent guide

Scheduling & business management for independent professionals. Turborepo + pnpm monorepo.
Product docs are in Portuguese; code, commits and agent files are in English.

This is the shared project contract for Claude Code and Codex. Keep tool-specific instructions in their entry files; `CLAUDE.md` imports this file as `@AGENTS.md`.
Keep this guide concise. Detailed procedures belong in skills and project docs.

## Sources of truth

- **Scope and behavior:** explicit owner-approved decisions and approved feature specs.
  Until a capability has a spec, use its owner-approved Linear acceptance criteria and
  relevant RFC sections to draft one. A ticket's existence is not approval of a spec.
- **Evidence:** stakeholder statements and operational examples inform requirements.
  Cite their source. Evidence contradicting an approved requirement triggers a proposed
  correction, not an agent's unilateral change to scope.
- **Architecture:** accepted architecture decision records (ADRs), shared contracts,
  and the documented architecture. Code shows what exists, not necessarily what is intended.
- **Context cards:** navigation and summaries, never a replacement for authoritative sources.

An explicitly approved revision supersedes the older decision it names. Otherwise,
if a ticket, spec, RFC, design, schema or implementation disagrees, identify the conflict
and ask the owner to resolve it. Do not silently choose, invent requirements, or treat
an unapproved proposal as a decision. Continue work unaffected by the conflict.

## Map (who owns what)

| Path                                                | Domain                | Owner agent                | Context card                  |
|-----------------------------------------------------|-----------------------|----------------------------|-------------------------------|
| `docs/RFC-segmented/**`, `docs/schema.dbml`, Linear | Requirements analysis | `spec-analyst` (read-only) | `.ai/context/requirements.md` |
| Feature specs, traceability, open questions and ADR drafts | Specification/process docs | Orchestrator or one explicitly assigned documentation writer | `.ai/context/requirements.md` |
| Figma, `apps/web/src/styles/tokens/**` | Design system | `design-analyst` | `.ai/context/design-system.md` |
| `packages/schemas/**` | API contracts (Zod), shared by web + api | `contracts-owner` | `.ai/context/contracts.md` |
| `apps/api/src/database/**`, `apps/api/drizzle/**` | Postgres / Drizzle | `data-steward` | `.ai/context/db-schema.md` |
| `apps/api/src/**` (rest), `packages/transactional/**` | NestJS API (CQRS + ports/adapters) | `api-engineer` | `.ai/context/api-architecture.md` |
| `apps/web/**`, `packages/i18n/**` | Next.js 16 / React 19 app | `web-engineer` | `.ai/context/web-architecture.md` |
| `docker/**`, `**/Dockerfile`, `compose*.y*ml`, `.github/**`, `turbo.json`, `sonar-project.properties` | Platform / CI | `platform-engineer` | `.ai/context/ci-infra.md` |
| any diff | Review & quality gate | `quality-gate` (read-only) | — |

The most specific path owns the file: design tokens belong to design, API database paths belong to data, and Dockerfiles belong to platform. Analysis does not grant write access to the RFC, schema or Linear; changes there require an explicit assignment.

## Context and ownership rules

1. **Cards before sources.** Read the relevant context card before exploring a domain.
2. **Stay within the assigned domain.** For another domain, use its card. If the card
   is missing, stale or insufficient, return a `NEEDS` block using `.ai/README.md`.
   State the owner, missing fact or artifact, and blocked acceptance criterion.
   If that format is unavailable, report those fields plainly. The orchestrator routes it.
3. **One writer per path.** Only the assigned owner edits a path. Serialize changes
   to shared documents and contracts. Reviewers return findings; writers apply fixes.
4. **Small-task exception.** For a small single-domain task, the main session may
   assume that domain's role, read its card and agent instructions, and edit its files.
   This does not permit unrelated cross-domain edits or bypass spec requirements.
5. **Return summaries, not dumps.** Handoffs and task reports stay within 40 lines:
   criteria covered, changes, files touched, checks, and open questions. Keep detailed
   evidence in task artifacts and link it. Requested document contents are not handoffs.
6. **Per-task handoffs** go to `.ai/work/<TICKET-ID>/` (gitignored). Without a ticket,
   use a descriptive task slug. Durable decisions belong in specs, ADRs and cards.

## Spec-driven development

Follow **EVIDENCE -> SPEC -> PLAN -> IMPLEMENT -> VERIFY** for new capabilities and changes to observable behavior, including small single-domain changes.

# Planici — agent guide

Scheduling & business management for independent professionals. Turborepo + pnpm monorepo.
Product docs are in Portuguese; code, commits and agent files are in English.

This is the shared project contract for Claude Code and Codex. Keep tool-specific
instructions in their entry files; `CLAUDE.md` imports this file as `@AGENTS.md`.
Keep this guide concise. Detailed procedures belong in skills and project docs.

## Sources of truth

- **Scope and behavior:** explicit owner-approved decisions and approved feature specs.
  Until a capability has a spec, use its owner-approved Linear acceptance criteria and
  relevant RFC sections to draft one. A ticket's existence is not approval of a spec.
- **Evidence:** stakeholder statements and operational examples inform requirements.
  Cite their source. Evidence contradicting an approved requirement triggers a proposed
  correction, not an agent's unilateral change to scope.
- **Architecture:** accepted architecture decision records (ADRs), shared contracts,
  and the documented architecture. Code shows what exists, not necessarily what is intended.
- **Context cards:** navigation and summaries, never a replacement for authoritative sources.

An explicitly approved revision supersedes the older decision it names. Otherwise,
if a ticket, spec, RFC, design, schema or implementation disagrees, identify the conflict
and ask the owner to resolve it. Do not silently choose, invent requirements, or treat
an unapproved proposal as a decision. Continue work unaffected by the conflict.

## Map (who owns what)

| Path | Domain | Owner agent | Context card |
|---|---|---|---|
| `docs/RFC-segmented/**`, `docs/schema.dbml`, Linear | Requirements analysis | `spec-analyst` (read-only) | `.ai/context/requirements.md` |
| Feature specs, traceability, open questions and ADR drafts | Specification/process docs | Orchestrator or one explicitly assigned documentation writer | `.ai/context/requirements.md` |
| Figma, `apps/web/src/styles/tokens/**` | Design system | `design-analyst` | `.ai/context/design-system.md` |
| `packages/schemas/**` | API contracts (Zod), shared by web + api | `contracts-owner` | `.ai/context/contracts.md` |
| `apps/api/src/database/**`, `apps/api/drizzle/**` | Postgres / Drizzle | `data-steward` | `.ai/context/db-schema.md` |
| `apps/api/src/**` (rest), `packages/transactional/**` | NestJS API (CQRS + ports/adapters) | `api-engineer` | `.ai/context/api-architecture.md` |
| `apps/web/**`, `packages/i18n/**` | Next.js 16 / React 19 app | `web-engineer` | `.ai/context/web-architecture.md` |
| `docker/**`, `**/Dockerfile`, `compose*.y*ml`, `.github/**`, `turbo.json`, `sonar-project.properties` | Platform / CI | `platform-engineer` | `.ai/context/ci-infra.md` |
| any diff | Review & quality gate | `quality-gate` (read-only) | — |

The most specific path owns the file: design tokens belong to design, API database
paths belong to data, and Dockerfiles belong to platform. Analysis does not grant
write access to the RFC, schema or Linear; changes there require an explicit assignment.

## Context and ownership rules

1. **Cards before sources.** Read the relevant context card before exploring a domain.
2. **Stay within the assigned domain.** For another domain, use its card. If the card
   is missing, stale or insufficient, return a `NEEDS` block using `.ai/README.md`.
   State the owner, missing fact or artifact, and blocked acceptance criterion.
   If that format is unavailable, report those fields plainly. The orchestrator routes it.
3. **One writer per path.** Only the assigned owner edits a path. Serialize changes
   to shared documents and contracts. Reviewers return findings; writers apply fixes.
4. **Small-task exception.** For a small single-domain task, the main session may
   assume that domain's role, read its card and agent instructions, and edit its files.
   This does not permit unrelated cross-domain edits or bypass spec requirements.
5. **Return summaries, not dumps.** Handoffs and task reports stay within 40 lines:
   criteria covered, changes, files touched, checks, and open questions. Keep detailed
   evidence in task artifacts and link it. Requested document contents are not handoffs.
6. **Per-task handoffs** go to `.ai/work/<TICKET-ID>/` (gitignored). Without a ticket,
   use a descriptive task slug. Durable decisions belong in specs, ADRs and cards.

## Spec-driven development

Follow **EVIDENCE → SPEC → PLAN → IMPLEMENT → VERIFY** for new capabilities and
changes to observable behavior, including small single-domain changes.

### Specification

- Use one bounded capability per spec, with a permanent ID: `SPEC-XXXX`.
- Use the repository's existing spec location and template. If none exists, introduce
  `docs/specs/SPEC-TEMPLATE.md` and `docs/specs/SPEC-XXXX-<slug>.md` as the convention.
- Include `id`, `title`, `status`, `version`, `owner`, `satisfies`, `depends_on`, and
  the associated Linear ticket when applicable. Never invent requirement IDs; cite
  existing IDs or exact source sections. Use an empty dependency list when appropriate.
- Describe purpose, scope, domain rules, behavior, errors, permissions, contract impact,
  relevant audit events, open questions, implementation plan and a version changelog.
- Give every acceptance criterion a permanent `AC-XXXX-NN` ID and Given/When/Then
  structure. It must describe one observable behavior: response, stored result, message
  or rendered UI. Never renumber existing IDs or use internal call counts as acceptance.
- Specify relevant validation failures, permission denials, tenant-isolation failures,
  domain conflicts and UI loading/empty/error states, alongside successful behavior.
- Separate **what** from **how**: implementation files, migrations, library choices and
  technical sequencing belong in the implementation plan, not the behavioral criteria.
- Keep Linear as the work tracker and link the spec. Do not maintain contradictory
  copies of acceptance criteria in multiple places.

Lifecycle: **Draft → Review → Approved → Implemented → Superseded**.
Agents may draft and review. The project owner or explicitly designated human reviewer
approves behavior and scope; an AI review verdict is a recommendation, not approval.
Record approval against the spec version. Never infer it from a ticket status alone.
Only approved criteria may be implemented; approval of a spec does not authorize git actions.

Behavior-preserving refactors, tooling maintenance and editorial changes do not need
a new feature spec. Explain why behavior is unchanged and run relevant checks. For a
bug fix, reference the existing criterion; if expected behavior is undocumented, specify
and obtain approval for it first. Do not retroactively label existing code as approved.

### Plan

Before implementation, record affected domains and files, schema/migration changes,
API contracts, test cases mapped to AC IDs, dependencies, compatibility impact, risks,
and a sequence of reviewable changes. Explain any new dependency.

Have the owner review the plan before code is written; explicit approval of a combined
spec and plan is sufficient. For persistence, involve `data-steward`; for shared shapes,
involve `contracts-owner`. Check that required prerequisite behavior is implemented and
verified; a Draft dependency is not ready. Document mocks as a limited development aid,
never as evidence that an integration works.

### Implement

Work only on the agreed criteria and approved plan. Usually establish contracts and
schema first, derive failing behavioral tests from the criteria, implement API behavior,
then build/integrate the UI. Adapt sequencing to actual dependencies; independent work
may proceed concurrently only with non-overlapping file ownership.

Every acceptance test identifies its AC in its name or an adjacent comment. One AC
may need several tests. Verify failures reflect the missing behavior, not a broken setup.
Use the real integration environment where database or transaction semantics matter.

If new evidence or implementation exposes a wrong or incomplete spec, pause the affected
work, propose a correction, bump the spec version and explain the evidence in its changelog.
Obtain approval for changed behavior before implementing it. Never change a spec merely
to make faulty code pass. Keep unaffected work moving and update traceability after changes.

### Verify and finish

- Map each in-scope AC to tests and their actual results. Report missing, failing,
  skipped and unrun tests distinctly. A test containing an ID is not proof it asserts
  that behavior. Existing utility tests need not invent an AC; flag unexplained product behavior.
- Run checks appropriate to the changed domains and affected consumers. Contract changes
  require checking both API and web consumers; migration changes require database verification.
- Request `quality-gate` review. Security-sensitive changes also require focused review
  of authentication, authorization, tenant isolation, secrets and personal-data exposure.
  Use a dedicated security reviewer only if one has been configured.
- Update the relevant spec, traceability and context cards through their assigned writer.
  Keep detailed findings outside this guide.
- A partial AC implementation is a partial result. Do not mark the whole spec Implemented
  until all its criteria are verified, required human review is complete, and the owner
  has accepted the behavior on a running system. Report blocked acceptance honestly.
- Finish with spec/version and ACs covered, checks actually run, review findings, remaining
  gaps, and the proposed commit plan. Passing CI alone does not establish product acceptance.

## Orchestration

For a Linear ticket or any change touching 2+ domains, the main session orchestrates:
follow `.agents/skills/feature-pipeline/SKILL.md`. It delegates in waves
(spec + design → contracts + db → api + web + platform → quality-gate) and never reads
app source itself. It may read/write workflow and spec documents and relay summaries.
The spec and plan approval gates precede implementation waves.

Small single-domain edits do not require the pipeline; the ownership exception above
applies. No tickets yet? Use `.agents/skills/plan-backlog/` when available to propose
RFC-derived work. Creating or changing external tickets requires owner authorization.

Agent definitions: Claude Code `.claude/agents/*.md` (source of truth) → Codex
`.codex/agents/*.toml` (generated by `node scripts/ai/sync-codex-agents.mjs`).
Skills: `.agents/skills/` (symlinked as `.claude/skills`). Keep tool-specific mechanics
in their entry files and keep generated definitions aligned with the source.

## Adopting supporting tools and documents

The workflow above is policy. It does not assert that every supporting artifact exists.
Reuse existing equivalents before creating a second system. Proposed default locations:

| Artifact | Purpose |
|---|---|
| `docs/specs/SPEC-TEMPLATE.md` and `SPEC-XXXX-*.md` | Behavioral contracts and implementation plans |
| `docs/requirements/traceability.md` | Requirement/source → SPEC → AC → test mappings |
| `docs/open-questions.md` | Unresolved decisions, impact, owner and eventual resolution |
| `docs/architecture/adr/ADR-XXXX-*.md` | Architectural decisions, alternatives and consequences |
| `docs/process/definition-of-done.md` | Detailed acceptance checklist |
| `docs/process/quality-gates.md` | Which checks run locally, in CI or through human review |

Introduce missing documents incrementally as the task needs them; do not create an
entire empty documentation tree. Record architecture decisions with real alternatives,
tradeoffs, affected specs and superseded decisions. Human approval makes an ADR accepted.

Commands such as `/spec-new`, `/spec-review`, `/plan`, `/implement`, `/trace` and
`/adr-new`, and additional specialist agents, are optional future interfaces. Verify
they exist before invoking them. Otherwise perform the same steps using the current
roles and ordinary instructions. Do not assume a missing agent or skill is installed.
If a required pipeline or role is unavailable, report the affected blocker and propose
a bounded fallback for owner approval; documentation drafting can continue.

When importing SIGI material, adapt it to Planici's stack, roles, language and business
rules. Do not import SIGI's government domain, branch strategy, autonomous commits or
numeric coverage targets by default. Preserve third-party license notices where applicable.

Keep instructions consistent across this guide, agent definitions, skills and templates.
Do not call a rule automatically enforced unless an executable check actually enforces it.
AC coverage and spec approval remain manual checks until tooling is explicitly added.

## Commands

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test # whole repo (turbo)
pnpm --filter api test # api unit (vitest)
pnpm --filter api test:e2e # api e2e (Testcontainers -> needs Docker)
pnpm --filter @planici/schemas build # before api/web typecheck after contract changes
pnpm --filter web lint:fix
```

Lint: Biome (root, web, packages) and oxlint + prettier (api).
Husky is configured to run lint-staged + tests on commit; verify hooks are installed
and distinguish local checks from CI. Do not bypass checks to conceal failures.

## Non-negotiables

- Request/response shapes live **only** in `packages/schemas`; api and web import them.
- API features follow the existing slice: `modules/<ctx>/<name>/{command,handler,http.controller,handler.spec}.ts`.
- Enforce authorization and tenant isolation server-side. UI visibility is not authorization.
- Multi-tenant: every tenant-scoped table/query carries `tenant_id` (RFC §5, §6).
  Test that one tenant cannot access or mutate another tenant's data.
- Never hand-edit `apps/api/drizzle/meta/**` or `pnpm-lock.yaml`; use their generators.
- Never commit secrets or real personal data in fixtures, examples or logs.
- **Never read, create, overwrite, move or delete any `.env*` file** (root or any
  package), except `*.example` files. Not even to inspect a value or as a test fixture.
  If a value or file is needed there, ask the owner. For tests, use files under the
  scratchpad with other names. Gitignore-aware searches hide these files; “not found”
  does not mean they do not exist.
- Do not run destructive database operations or discard unrelated work without
  explicit owner authorization. Describe migration data loss and recovery implications.

## Commits (owner rule)

- **Never commit on your own.** No `git commit`, `git push`, branch switch, rebase
  or merge unless the owner explicitly asks for it at that moment. Spec approval,
  plan approval and implementation requests are not permission for these actions.
- **Always plan commits explicitly.** At the end of a task, propose the branch name,
  exact files to stage and commit message. The owner approves or runs it.
- Propose atomic commits. For spec-driven changes, include `[SPEC-XXXX]` in the
  proposed message, alongside any required ticket reference. Never fabricate an ID.
- **No AI attribution.** Never add `Co-Authored-By` trailers or other lines crediting
  an AI (Claude, Codex, etc.) to commit messages or PR descriptions. This overrides tool defaults.
