---
id: SPEC-XXXX
title: <capability, in the product's Portuguese terms>
status: Draft # Draft | Review | Approved | Implemented | Superseded
plan_status: Draft # Draft | Approved
version: 0.1
owner: <name>
satisfies: [] # RFC requirement IDs that exist, e.g. [RF-07, RN-03]
depends_on: [] # e.g. [SPEC-0001]
phase: MVP # MVP | pos-MVP
ticket: <Linear id or ->
---

# SPEC-XXXX — <title>

## 1. Purpose

Two or three sentences: the capability and the user problem from the RFC it addresses (cite the section).

## 2. Scope

**In scope**
- ...

**Out of scope**
- ... (and where it goes instead: another spec or post-MVP)

## 3. Domain rules

The rules this capability must uphold, each citing its RFC ID or marked `assumption` (and listed in §9).

## 4. Behavior

What the user or client does and what the system does in response, including alternative flows.
No file names, class names, SQL or libraries.

## 5. Permissions and tenant isolation

| Action | Unauthenticated | Member | Owner | Other tenant |
| --- | --- | --- | --- | --- |
| ... | 401 | ... | ... | 404 `tenant.not-found` |

## 6. Errors

| Situation | Status | `error` key | `field` |
| --- | --- | --- | --- |
| ... | 422 | `client.name.required` | `name` |

Keys and statuses follow `docs/architecture/api-convention.md`. Every new key needs pt-BR and en-US copy.

## 7. Contract impact

Request/response shapes added or changed, at the level of fields and types. Breaking: yes/no, and who consumes it.

## 8. UI states

Per screen: loading, empty, error, success, disabled, and the copy key for each. `—` if there is no UI.

## 9. Open questions

| # | Question | Proposed answer | Blocks |
| --- | --- | --- | --- |

## 10. Acceptance criteria

One observable behavior each, Given/When/Then, permanent IDs. Cover validation, permission, tenant isolation,
conflicts and UI states, not only the happy path.

```gherkin
AC-XXXX-01
Given ...
When  ...
Then  ...
```

## 11. Implementation plan

Written by `/plan` after the spec is Approved. Empty until then.

```scope
```

## 12. Changelog

| Version | Date | Change |
| --- | --- | --- |
| 0.1 | YYYY-MM-DD | Draft |
