---
description: Independent review of the current diff against a spec (or a plain review without one)
argument-hint: [SPEC-XXXX] [base branch, default dev]
allowed-tools: Read, Glob, Grep, Bash(git diff:*), Bash(git status:*), Bash(.claude/bin/task-lock.sh status), Agent, Edit, Write
---

Review the current changes. Arguments: $ARGUMENTS

1. Delegate to the `reviewer` subagent. Brief it with: the spec ID (from the arguments or the active task lock,
   if any), the base commit or branch, and nothing else. Do not summarize your own work or argue for it
   in the brief.
2. Relay its report unchanged.
3. On FAIL, use skill `receiving-code-review`: verify each blocking item before fixing it, push back with
   evidence where it is wrong, fix the rest within the task scope. Fix only BLOCKING items here.
4. Then run the reviewer once more in re-check mode: brief it with "re-check", the earlier report's blocking
   items and the commit or diff they were fixed in. That is the last review round. If it still fails, hand the
   remaining items to the owner and stop.
5. SHOULD-FIX items never start another round. List them for the owner as follow-ups, numbered. Fix one now only
   when the owner picks it, then run the checks for the touched packages, not the reviewer.

Budget: one full review plus at most one re-check per task. On PASS (with or without should-fix items), suggest
`/done`.
