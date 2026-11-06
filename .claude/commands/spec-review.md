---
description: Independent readiness review of a spec (or its plan) before the owner approves it
argument-hint: SPEC-XXXX [plan]
allowed-tools: Read, Glob, Grep, Agent
---

Review $ARGUMENTS.

Delegate to the `spec-reviewer` subagent. Brief it with the spec ID and whether to review the spec
or its Implementation plan (`plan` argument). Do not review it yourself first, and do not pass your opinion
of the spec into the brief: the point is a reader with fresh context.

Relay its verdict unchanged. If it lists required changes, offer to apply them; do not apply them unasked.

Never change `status` or `plan_status` to `Approved` yourself. Only the owner approves, by saying so
explicitly. When they do, set the field, bump `version`, and add a changelog line
`<version> — approved by <owner>, <date>`.
