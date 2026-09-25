---
name: plan-backlog
description: Turn the Planici RFC (MVP scope, RF/RN requirements, flows) into a reviewed backlog of Linear issues with domains, acceptance criteria and dependencies. Use when there are no tickets yet, or when asked to plan/split a feature or milestone into issues.
---
# Plan backlog (RFC → Linear)

Never create Linear issues before the human approves the draft. Creating 40 wrong issues is worse than none.

## 1. Gather (delegate, don't read the RFC yourself)
- Ask **spec-analyst** to refresh `.ai/context/requirements.md` first (fill the RF/RN → implemented? table),
  then draft `.ai/backlog/draft.md` using the format below, limited to the scope the human asked for
  (default: the MVP list in the requirements card, excluding what's already implemented).
- In parallel, ask **design-analyst** to list the Figma frame/node for each UI flow in `.ai/backlog/figma-map.md`.
- Optional sizing: ask **data-steward** for the tables each epic needs (1 line each). No code is written.

## 2. Draft format (`.ai/backlog/draft.md`)
```
## EPIC: <name>  (RFC refs: RF-xx, RN-yy)
### [ID-TMP-01] <imperative title>
- domains: contracts, db, api, web          ← drives which agents feature-pipeline runs
- size: S | M | L                            (L = split it)
- blocked by: ID-TMP-00
- figma: <node id or —>
- acceptance criteria:
  - Given … When … Then …
- out of scope: …
```
Rules: one issue = one reviewable PR (≈ 1–2 days). Vertical slices (contract + db + api + web for one
behavior) beat horizontal ones ("all tables"). Put cross-cutting groundwork (tenant_id/RLS, CI fixes) first as
its own issues. Every criterion cites an RF/RN id or is marked `assumption`.

## 3. Review with the human
Show: epic list, issue count per epic, the dependency order (a numbered critical path), and all `assumption`s
and open questions. Apply their edits to draft.md. Loop until they say "create".

## 4. Create in Linear
- Ask which team/project to use if unknown. Create labels if missing: `area:contracts|db|api|web|platform|design`, `size:S|M|L`.
- Create epics as parent issues (or a project milestone, if the human prefers), then children with the
  description = criteria + RFC refs + figma, labels from domains/size.
- Create "blocked by" relations from the `blocked by` lines, mapping ID-TMP → real ids.
- Write `.ai/backlog/linear-map.md` (ID-TMP → PLA-xx) and report: created N issues, critical path, first 3 to start.
