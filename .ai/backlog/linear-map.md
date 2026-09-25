# Backlog → Linear map

Team: João Pedro M Izidoro (JOA) · Project: Planici · Epics = project milestones.
Created 2026-09-24/25 from `.ai/backlog/draft.md`. Decisions: `.ai/backlog/answers.md`.

| ID-TMP | Linear | Milestone | Title | Blocked by |
|---|---|---|---|---|
| 01 | JOA-19 | Tenant foundation | Establish tenant-scoped RLS pattern | — |
| 03 | JOA-21 | Tenant foundation | Create tenant during onboarding | JOA-19 |
| 04 | JOA-23 | Tenant foundation | Resolve active tenant context per request | JOA-19, JOA-21 |
| 21 | JOA-20 | Services | Shared delete confirmation dialog (RN-25) | — |
| 05 | JOA-24 | Services | Create service | JOA-19, JOA-23 |
| 06 | JOA-27 | Services | List services | JOA-24 |
| 07 | JOA-28 | Services | Edit / inactivate / delete service | JOA-24, JOA-20 |
| 22 | JOA-22 | Clients | Field-level encryption for sensitive client free text | JOA-19 |
| 08 | JOA-25 | Clients | Create client | JOA-19, JOA-23, JOA-22 |
| 09 | JOA-29 | Clients | Search / list clients | JOA-25 |
| 10 | JOA-30 | Clients | Edit / inactivate / delete client | JOA-25, JOA-20 |
| 12 | JOA-26 | Agenda | Configure fixed availability (outline) | JOA-23 |
| 13 | JOA-31 | Agenda | Free / one-off availability windows (outline) | JOA-26 |
| 14 | JOA-32 | Agenda | Manual time blocks (outline) | JOA-26 |
| 15 | JOA-33 | Agenda | Availability resolution engine (outline) | JOA-26, JOA-31, JOA-32 |
| 16 | JOA-34 | Agenda | Create manual appointment + overbooking constraint (outline) | JOA-33, JOA-24, JOA-25 |
| 17 | JOA-36 | Agenda | Edit / cancel appointment (outline) | JOA-34 |
| 18 | JOA-37 | Agenda | Daily / weekly agenda view (outline) | JOA-34 |
| 19 | JOA-35 | Public booking | Public booking link (outline) | JOA-33 |
| 20 | JOA-38 | Public booking | Confirm / decline pending request (outline) | JOA-35, JOA-34 |

Not created: ID-TMP-02 (dropped, RBAC is post-MVP), ID-TMP-11 (client history, returns with the Payments epic).

## Pending
- Agenda + Public booking issues are outlines: acceptance criteria and size labels still to be added (spec-analyst detailing pass).
- Web parts wait for Figma frames in file rWWne0gLS6YsVEuz4c7Amg; re-run design-analyst to update figma-map.md and the issues' Figma refs.
