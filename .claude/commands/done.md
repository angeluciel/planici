---
description: Close the active task - final checks, honest status, commit plan, release the lock
allowed-tools: Read, Glob, Grep, Bash, Edit
---

Close the active task.

1. `.claude/bin/task-lock.sh status`. If nothing is locked, close the current piece of work the same way, without steps 4–5.
2. Run lint, typecheck and tests for the touched packages and consumers, including `pnpm --filter api test:e2e`
   when persistence or API behavior changed. Use skill `verification-before-completion`.
3. Report:
   - **ACs**: each in-scope AC → tests → actual result. Separate passing, failing, missing, skipped and unrun.
   - **Checks**: the commands you ran and their results.
   - **Review**: the latest reviewer verdict and any unresolved items.
   - **Scope**: if a task is locked, the output of `.claude/bin/task-lock.sh check`. It lists files changed outside
     the plan's scope, including Bash writes the edit hook never sees (`drizzle-kit generate`, `lint:fix`).
   - **Follow-ups**: things noticed and deliberately not done.
4. If every in-scope AC passes, update the spec's changelog with what was implemented. Set
   `status: Implemented` only if all of the spec's ACs are verified **and** the owner has said they accept the
   behavior on a running system. Otherwise leave the status and say what is missing.
5. `.claude/bin/task-lock.sh clear`.
6. **Commit plan**: branch (`feat/<slug>-spec-XXXX`, never named after a person or tool), then atomic commits,
   each with the exact files to stage and a conventional message ending in `[SPEC-XXXX]`.
   No `Co-Authored-By` or other AI attribution. Do not run any git command that changes state; the owner does.
