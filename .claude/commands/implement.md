---
description: Implement an approved spec and plan, locked to the plan's scope
argument-hint: SPEC-XXXX [AC-XXXX-NN ...]
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent, mcp__figma, mcp__postgres
---

Implement $ARGUMENTS.

1. Run `.claude/bin/task-lock.sh start $ARGUMENTS`. It refuses unless the spec and plan are Approved,
   dependencies are Implemented and the plan has a scope block. If it refuses, report the reason and stop.
   Do not edit the spec to make it pass.
2. Follow the plan's sequence. Use the skills that apply (`api-contract`, `drizzle-migration`,
   `cqrs-command`, `figma-to-component`, `test-driven-development`).
3. Before production code, have the `test-author` subagent write failing tests for the in-scope ACs.
   Confirm they fail because the behavior is missing.
4. Implement until those tests pass. Then run lint, typecheck and tests for every touched package and
   its consumers (contract changes: both api and web).
5. If a needed edit is blocked by the scope lock, or the spec turns out wrong or incomplete: stop that part,
   describe the change you need and why, and wait for the owner. Never change acceptance criteria to fit the code.
   Unaffected work can continue.
6. Note follow-ups you noticed but did not do. Do not do them.

When done, run `/review $1`. Do not commit.
