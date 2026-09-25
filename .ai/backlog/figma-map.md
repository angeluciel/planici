# Figma mapping — plan-backlog step 1

Figma file: https://www.figma.com/design/rWWne0gLS6YsVEuz4c7Amg/Planici
File key: `rWWne0gLS6YsVEuz4c7Amg`

The file currently has **a single page** (`0:1` — "THUMBNAIL"). There are no dedicated
product-flow pages/frames. The only UI fragments that exist are small, low-fidelity mockups
embedded inside a hidden marketing/cover frame (`12:2 "file thumbnail"`), used to illustrate
the Figma file's own thumbnail — they are not full designed screens (no states, no real
fidelity, no separate frames per flow/breakpoint).

## Coverage table

| Flow | Frame name | Node id | Status |
|---|---|---|---|
| Tenant onboarding — post-signup welcome/setup | — | — | **missing** |
| Tenant onboarding — workspace creation form | — | — | **missing** |
| Services catalog — list | — | — | **missing** |
| Services catalog — create | — | — | **missing** |
| Services catalog — edit | — | — | **missing** |
| Services catalog — deactivate | — | — | **missing** |
| Clients — list | `/clientes` | `17:536` | **partial** (single low-fi list state only: cards grouped by initial + search bar; no empty/loading/error/disabled states, no create/delete affordance beyond a generic edit icon) |
| Clients — create | — | — | **missing** |
| Clients — edit | — | — | **missing** |
| Clients — detail | `/forms/:user-id/form=:id` | `17:465` | **partial** (reads like a client "ficha"/intake form — Nome, CPF, Número, Local, Endereço, Idade, Anotações — ambiguous whether it's meant as detail view or edit form; no states) |
| Clients — delete | — | — | **missing** |
| Agenda — calendar view (month/week/day) | "calendar" (design-guidelines illustration) | `204:715` | **missing** (decorative calendar graphic inside the design-guidelines section of the thumbnail page only — not a real, interactive agenda screen/frame) |
| Agenda — manual booking | — | — | **missing** |

## Other fragments found (not mapped to the 4 areas above)

- `/forms/new-form` (`17:312`) and its floating `dropdown` (`17:394`) — a generic form-builder mock, unclear which domain it belongs to. Not counted as coverage for any of the four flows above.

## Summary

- 14 flows checked across the 4 areas. **1 partial-covered by node** appears twice (clients list, clients detail); **all other 12 flows have zero mockups** — no onboarding, no services catalog, no client create/edit/delete, no agenda/calendar/booking screens.
- Confirms the RFC note: most mockups are still missing. Design work is needed before UI specs (`ui.md`) can be written for onboarding, services catalog, agenda, and client create/edit/delete/detail-confirmation.
- No breakpoint variants exist for the two partial frames (mobile-only, 402px width, iOS status-bar chrome).
