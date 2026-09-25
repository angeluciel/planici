---
name: feature-pipeline
description: Orchestrate a Linear ticket or multi-domain change across the Planici domain agents in dependency waves. Use when askes to implement, fix or analyze a ticket that touches more than one of requirements, UI, contracts, db, api, web, platform.
---
# Feature pipeline

## 0. Setup
1. Fetch the Linear issue. `TICKET` = its identifier (e.g. `PLA-123`).
2. `mkdir -p .ai/work/$TICKET` and run `scripts/ai/stale-cards.sh`. For each stale card, queue a refresh by its owner.
3. Create `.ai/work/$TICKET/plan.md` from the table below (keep a Status column).

## 1. Dependency graph

| Wave | Agent | Needs (reads) | Produces | Skip when |
|---|---|---|---|---|
| 1 | spec-analyst | ticket, RFC | requirements.md | never |
| 1 | design-analyst | ticket, Figma | ui.md | no UI |
| 2 | contracts-owner | requirements, ui | contracts.md + packages/schemas | no API shape change |
| 2 | data-steward | requirements | db.md + migration | no persistence change |
| 3 | api-engineer | requirements, contracts, db | api.md + code | no API change |
| 3 | web-engineer | requirements, ui, contracts | web.md + code | no UI change |
| 3 | platform-engineer | any handoff mentioning env/services/CI | platform.md | nothing infra |
| 4 | quality-gate | diff, requirements | review.md | never |

Wave 1 agents both start immediately (design-analyst doesn't need requirements.md).
After wave 1, read the "Domains touched" line in requirements.md to decide which later agents run.
Launch every agent of a wave **in the same turn**. An agent starts as soon as its inputs exist; don't wait for the whole wave.
api-engineer and web-engineer can run in parallel because their paths don't overlap.

## 2. Briefs
Each brief is ≤ 10 lines: ticket id, goal (1 line), files to read under `.ai/work/$TICKET/`, output file, done-criteria.
Never paste source code or other agents' full output into a brief. Point to the file.

## 3. NEEDS routing
When a reply ends with a `needs` block:
1. Send `ask` to the `to` agent with a 3-line brief.
2. Append Q + A to `.ai/work/$TICKET/answers.md`.
3. Resume the asking agent: "Answer in answers.md#<n>, continue."
If the answer changes a contract or schema, re-run the dependent wave-3 agent.

## 4. Review loop
quality-gate FAIL → send each blocking issue to the owner named in review.md → re-run quality-gate. Stop after 2 loops and ask the human.

## 5. Close
Summarize in ≤ 15 lines (what shipped, tests, open questions), comment it on the Linear issue, propose a branch name
`feat/$TICKET-<slug>` and a conventional commit message. Don't push without being asked.
