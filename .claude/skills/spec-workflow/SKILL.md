---
name: spec-workflow
description: Planici's spec-driven development rules - spec format, acceptance-criteria style, IDs, statuses, approvals and how to handle a spec that turns out wrong. Use when creating, editing, reviewing or implementing anything under docs/specs/, when asked whether behavior is specified, or before changing observable behavior.
---

# Spec workflow

`EVIDENCE → SPEC → PLAN → IMPLEMENT → VERIFY`, driven by `/spec-new`, `/spec-review`, `/plan`, `/implement`, `/review`, `/done`.

## Sources of truth

- **Scope and behavior**: owner-approved specs. Before a spec exists, owner-approved Linear acceptance criteria
  and the RFC (`docs/RFC-segmented/`) are input for drafting one. A ticket's existence is not approval.
- **Architecture and API shape**: `docs/architecture/api-convention.md`, `packages/schemas`, the existing code slices.
  Code shows what exists, not necessarily what is intended.
- Conflicts between ticket, spec, RFC, schema and code: name them and ask the owner. Never pick one silently.

## Files and IDs

- One bounded capability per spec: `docs/specs/SPEC-XXXX-<slug>.md`, from `SPEC-TEMPLATE.md`.
- Numbers are permanent. A retired spec becomes `Superseded`; its number is never reused.
- ACs are `AC-XXXX-NN`, numbered within their spec, never renumbered or reused. Tests reference them.
- `satisfies` cites RFC requirement IDs that exist. Never invent an ID.

## Status

`status`: `Draft → Review → Approved → Implemented → Superseded`
`plan_status`: `Draft → Approved`

Agents draft and review. Only the owner approves, explicitly, in the conversation. Record it as a version bump and
changelog line. Never infer approval from a ticket status or an AI review verdict.
Only `Approved` specs with an `Approved` plan may be implemented (`task-lock.sh` checks this).

## A valid acceptance criterion

**Observable** (HTTP response, stored row, message, rendered UI), **atomic**, **Given/When/Then**.

```gherkin
AC-0003-04
Given a tenant "studio-ana" with a client whose e-mail is "ana@example.com"
When  its owner creates another client with e-mail "ANA@example.com "
Then  the response is 409 with { "error": "client.email-taken", "field": "email" }
And   the tenant still has exactly one client with that e-mail
```

Not valid:
- "Handle errors gracefully." — which error, which key, which status?
- "Validate the client correctly." — "correctly" is doing all the work.
- "Create a client and send an e-mail." — two criteria under one ID.
- "The handler calls `repo.save()` once." — implementation, not behavior.

## Coverage rule

For each happy path, also specify:
- validation failures (field, error key, 422);
- permission denial;
- tenant isolation (another tenant's resource behaves as not found);
- domain conflicts;
- for UI: loading, empty, error and success states, and the copy key for each.

## What a spec must not contain

File names, class names, SQL and library choices belong only in `## Implementation plan`, written by `/plan`
after approval. The behavioral part stays readable by the owner.

## When the spec is wrong

When implementation or new evidence shows a spec is wrong or incomplete:
1. Stop the affected work.
2. Propose the correction to the owner, with the evidence.
3. After approval: amend, bump `version`, add a changelog line saying what was learned, update the plan's scope if needed.
4. Resume.

Never change a spec to make code pass. Never leave code and spec disagreeing.

## Not every change needs a spec

Behavior-preserving refactors, tooling and editorial changes don't need one: state why behavior is unchanged and run
the checks. A bug fix references the AC it restores. If the expected behavior is undocumented, specify it and get
it approved first. Do not retroactively label existing code as approved.
