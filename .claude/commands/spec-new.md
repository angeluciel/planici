---
description: Draft a new Planici spec from the RFC and existing specs
argument-hint: <short description of the capability, or a Linear ticket id>
allowed-tools: Read, Write, Edit, Glob, Grep, mcp__linear
---

Draft a new specification for: $ARGUMENTS

Load the `spec-workflow` skill first and follow it.

1. If a Linear ticket is given, read it. A ticket's acceptance criteria are input, not approval.
2. Read `docs/specs/SPEC-TEMPLATE.md`, the existing specs in `docs/specs/`, and only the RFC sections
   that apply (`docs/RFC-segmented/README.md` is the index; requirements and business rules are in `02-*`,
   flows in `03-*`, security in `06-*`). Read `docs/architecture/api-convention.md` for error and status rules.
3. Identify the RF/RN IDs this capability satisfies, quoting their RFC section. If it satisfies none,
   stop and say so: that needs an owner decision before it needs a spec.
4. Take the next free `SPEC-XXXX` number and write `docs/specs/SPEC-XXXX-<slug>.md` from the template,
   `status: Draft`, `plan_status: Draft`, version `0.1`. Leave the Implementation plan empty.
5. Put every gap or contradiction in the spec's Open questions section with a proposed answer.
   Never fill a gap by inventing a requirement.

Do not write production code or tests.

Report in under 15 lines: path, AC range, requirements covered, assumptions, blocking open questions.
Then suggest `/spec-review SPEC-XXXX`.
