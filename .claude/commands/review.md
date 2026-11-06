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
   evidence where it is wrong, fix the rest within the task scope. Then run the reviewer again.
4. Stop after two FAIL rounds and hand the remaining items to the owner.

On PASS, suggest `/done`.
