---
id: SPEC-0006
title: Lista de clientes — filtro por modelo, total e ordenação
status: Approved # Draft | Review | Approved | Implemented | Superseded
plan_status: Approved # Draft | Approved
version: 1.3
owner: Joao Izidoro
satisfies: [RF-09, RN-02]
depends_on: [SPEC-0001, SPEC-0003, SPEC-0004]
phase: MVP
ticket: -
---

# SPEC-0006 — Lista de clientes: filtro por modelo, total e ordenação

## 1. Purpose

A professional with several client templates (for example "Anamnese adulto" and "Anamnese infantil") needs to
see the clients of one template, know how many clients match what they are looking at, and reorder the list.
This extends the `/clients` list of SPEC-0004 §4.1 under UC-10, "Buscar e filtrar clientes" (RFC §2.2.2, RF-09,
amended 2026-11-19).

## 2. Scope

**In scope**
- A template filter on `/clients`. The "Modelo" column leaves the list.
- The total number of clients matching the current search and filters, shown above the list.
- Sorting the list by name or e-mail, ascending or descending, from the column headers.

**Out of scope**
- Last and next appointment columns: the scheduling spec, once appointments exist.
- Custom-field values as list columns: SPEC-0003 R9 stands (owner decision, 2026-11-19).
- Sorting by phone or by template.
- Remembering the chosen filters or sort between visits (§9 Q8).
- Moving the list's data fetching to a library: a behavior-preserving refactor, no spec.
- The "Criar novo modelo" link of the [Novo] dropdown (§9 Q11): a separate fix restoring AC-0001-10.

**Dependencies and amendments**
- Builds on SPEC-0004 (Approved): its search (R9), status filter (§4.1 step 4), pagination (AC-0004-21 to -23)
  and list states (§8) are unchanged unless stated here.
- On approval, this spec amends these parts of SPEC-0004, each of which gets the note "amended by SPEC-0006",
  with a version bump and a changelog line (§9 Q12):
  - R10 (one fixed sort);
  - §4.1 step 2 (the Modelo column) and step 5 (the empty state now also covers the template filter);
  - §6, the list check order (`q`, `status`, `limit`, `after`) and the `cursor.invalid` row, which now also covers
    a different template filter or sort;
  - §7 "List";
  - §8, the "success" and "empty under the chosen filter" rows.
- RF-09 and `docs/architecture/api-convention.md` "Pagination" were amended on 2026-11-19 to allow the total and
  a documented set of sorts (§9 Q1–Q3).

## 3. Domain rules

- **R1.** **Template filter.** A list request can name one client template. The list then holds only the clients
  created from that template, whatever version they were filled with, whether the template is active or archived.
  It combines with the search (SPEC-0004 R9) and the status filter: a client is listed only if it matches all
  three. (RF-09, amended)
- **R2.** A template filter naming a well-formed template id that does not exist, belongs to another tenant, or is
  not a client template returns an empty list with a total of 0, the same response in every case, so another
  tenant's template is never revealed. A malformed template id is rejected. (RN-02; owner decision, §9 Q5)
- **R3.** **Total.** Every list response carries the number of the tenant's clients that match the search, the
  status filter and the template filter, regardless of `limit` and `after`. Clients of other tenants are never
  counted. (RF-09, amended; api-convention "Pagination", amended; owner decisions, §9 Q2 and Q4)
- **R4.** **Sort.** The list can be sorted by name ascending (the default, as SPEC-0004 R10), name descending,
  e-mail ascending or e-mail descending. Name order ignores case and accents. E-mail order compares the stored,
  normalised e-mail (SPEC-0004 R3). Every sort ends with the client `id`, in the same direction, so pages never
  repeat or skip a client. (RF-09, amended; api-convention "Pagination", amended; owner decisions, §9 Q3 and Q10)
- **R5.** A cursor is bound to the search, the status filter, the template filter **and the sort** it was issued
  with. Sending it with any of them changed is rejected. (api-convention "Pagination", amended)
- **R6.** List rows show name, e-mail and phone. The template is shown on the client's view page only (SPEC-0003
  §4.2). Custom-field values still never appear in the list (SPEC-0003 R9).

## 4. Behavior

### 4.1 List (`/clients`)
Replaces SPEC-0004 §4.1 step 2. Steps 1, 3, 4, 6 and 7 are unchanged; step 5 is extended by 4.2 step 7.

2. The system lists active clients with columns Nome, E-mail and Telefone, sorted by name (R4, R6). A client
   without a phone shows "—" in Telefone.

### 4.2 Template filter
1. Next to the status filter, a "Modelo" control offers "Todos os modelos" (the default) and every client template
   of the tenant by name, active and archived. An archived template's name is followed by "(arquivado)".
2. The control appears only when the tenant has two or more client templates, active or archived (owner
   decision, §9 Q6).
3. While the templates load, the control is not shown. The list loads and works meanwhile.
4. Choosing a template reloads the list from the first page with only that template's clients (R1). Choosing
   "Todos os modelos" removes the filter.
5. The search, the status filter and the sort stay as they were when the template changes.
6. If the templates cannot be loaded, the control is not shown and the list works without it.
7. If the tenant has clients but none match the chosen filters and there is no search, the page shows "Nenhum
   cliente com este filtro." (SPEC-0004 §4.1 step 5, now covering the template filter too).

### 4.3 Total
1. Above the list, the page shows the total of R3, for example "120 clientes" or "1 cliente".
2. The total is the number of matching clients, not the number of rows loaded so far. Every response carries it,
   and the page shows the one from the latest response. So loading a page with "Carregar mais" changes it only if
   matching clients were added or removed in the meantime (owner decision, §9 Q4).
3. The total is not shown while the list loads, in the error state, or in any empty state (no clients at all, no
   client under the chosen filters, no search results).

### 4.4 Sorting
1. The Nome and E-mail column headers are sort controls. Telefone is not.
2. The current sort is marked on its header, with its direction. On first load it is Nome, ascending.
3. Pressing the header of the current sort reverses its direction. Pressing the other sortable header sorts by
   that column, ascending.
4. A change of sort reloads the list from the first page. The search and filters stay as they were.
5. "Carregar mais" loads the next page with the same search, filters and sort as the rows already shown (R5).
6. On narrow screens only the Nome column is shown, so only the name sort is offered (§9 Q9). If the current sort
   is by e-mail when the screen narrows, the list keeps that order and the Nome header is not marked; pressing it
   sorts by name, ascending.
7. Leaving and reopening `/clients` starts again from Nome, ascending (§9 Q8).

## 5. Permissions and tenant isolation

| Action | Unauthenticated | Member | Owner | Other tenant |
| --- | --- | --- | --- | --- |
| List clients with template filter, sort and total | 401 | — (post-MVP) | 200, own tenant only | 404 `tenant.not-found` |
| Template filter naming another tenant's template | 401 | — | 200, empty list, total 0 (R2) | — |

Tenant context rules are those of SPEC-0004 §5: 400 `tenant.required`, 403 `tenant.inactive`.

## 6. Errors

The list errors of SPEC-0004 §6 still apply. New or extended:

| Situation | Status | `error` key | `field` |
| --- | --- | --- | --- |
| Template filter that is not a well-formed template id | 422 | `formId.invalid` (existing, SPEC-0003 §6) | `formId` |
| Sort that is not one of `name`, `-name`, `email`, `-email` | 422 | `clientSort.invalid` | `sort` |
| Cursor issued for another search, status, template filter or sort (R5), or malformed | 422 | `cursor.invalid` (existing) | `after` |

**Check order for list**: `q`, `status`, `formId`, `sort`, `limit`, then `after` (amends SPEC-0004 §6).

`clientSort.invalid` needs pt-BR and en-US copy under `validation.*`, although the page never sends an invalid
value. `formId.invalid` reuses the existing key and copy (owner decision, §9 Q14).

## 7. Contract impact

Additive, non-breaking. Consumer: `apps/web`.

- **List query** adds:
  - `formId?`: a template id. Filters by template (R1, R2).
  - `sort?`: one of `name` (default), `-name`, `email`, `-email`. A leading `-` means descending (R4; owner
    decision, §9 Q10).
- **List response** adds `total`: integer, 0 or more, on every page (R3). It becomes
  `{ clients: ClientSummary[], nextCursor: string | null, total: number }`.
- **ClientSummary** is unchanged. `formId` and `formName` stay in the response, although the page no longer shows
  them.

## 8. UI states

Rows of SPEC-0004 §8 not listed here are unchanged.

| Screen | State | Behavior | Copy key |
| --- | --- | --- | --- |
| `/clients` | success | Table with Nome, E-mail, Telefone (4.1); total above it (4.3) | `clients.list.title`, `clients.list.count` |
| `/clients` | no phone | "—" in Telefone | — |
| `/clients` | template filter | "Modelo" control with "Todos os modelos" and each client template (4.2) | `clients.list.filter.form`, `clients.list.filter.allForms` |
| `/clients` | archived template in filter | Name followed by "(arquivado)" | `clients.list.filter.archivedForm` |
| `/clients` | templates loading | No template control yet; list works (4.2 step 3) | — |
| `/clients` | one client template or fewer | No template control | — |
| `/clients` | templates failed to load | No template control; list works | — |
| `/clients` | empty under the chosen filters | "Nenhum cliente com este filtro." (status or template); no total | `clients.list.emptyFilter` |
| `/clients` | empty, no search results, or error | As SPEC-0004 §8; no total | `clients.list.empty`, `clients.list.noResults`, `clients.list.error` |
| `/clients` | loading after a filter or sort change | Skeleton rows; no total | `clients.list.loading` |
| `/clients` | sort | Nome / E-mail headers are buttons; the current one is marked with its direction | `clients.list.sort.ascending`, `clients.list.sort.descending` |
| `/clients` | narrow screen | Only Nome is shown and sortable (4.4 step 6) | — |

Copy:
- `clients.list.count`: "{count, plural, one {# cliente} other {# clientes}}" / "{count, plural, one {# client}
  other {# clients}}"
- `clients.list.filter.form`: "Modelo" / "Template"
- `clients.list.filter.allForms`: "Todos os modelos" / "All templates"
- `clients.list.filter.archivedForm`: "{name} (arquivado)" / "{name} (archived)"
- `clients.list.sort.ascending`: "Ordenado por {column}, crescente" / "Sorted by {column}, ascending"
- `clients.list.sort.descending`: "Ordenado por {column}, decrescente" / "Sorted by {column}, descending"
- `validation.clientSort.invalid`: "Ordenação inválida." / "Invalid sort."

## 9. Open questions

| # | Question | Answer | Blocks |
| --- | --- | --- | --- |
| Q1 | RF-09 said only "buscar clientes por nome, e-mail ou telefone". Sorting and the total were not in the RFC. | Decided (owner, 2026-11-19): RF-09 amended to "O profissional pode buscar clientes por nome, e-mail ou telefone, filtrar por status e por modelo, ordenar por nome ou e-mail e ver quantos clientes foram encontrados." | — |
| Q2 | `api-convention.md` said list responses have "no total count". | Decided (owner, 2026-11-19): convention amended; a list endpoint may return `total` (matching items, ignoring `limit` and `after`) when its spec asks for it. | — |
| Q3 | `api-convention.md` said each endpoint has "one fixed, stable sort". | Decided (owner, 2026-11-19): convention amended; an endpoint may document a closed set of sorts through `sort`, each ending with `id`, the first being the default; the cursor is bound to the filters and the sort. | — |
| Q4 | Total on every page, or only the first? | Decided (owner, 2026-11-19): every page; the page shows the latest response's total (4.3 step 2). | — |
| Q5 | Template filter with an unknown or another tenant's template: 200 empty, 404 or 422? | Decided (owner, 2026-11-19): 200 with an empty list and total 0 for any well-formed id (R2); 422 only for a malformed id. | — |
| Q6 | Show the template control when the tenant has a single client template? | Decided (owner, 2026-11-19): no; only with two or more client templates, active or archived. | — |
| Q7 | Archived templates in the filter? | Decided (owner, 2026-11-19): yes, with "(arquivado)" after the name, in name order with the active ones. Their clients are still listed (SPEC-0001 R8). | — |
| Q8 | Remember filters and sort between visits? | Proposed: no, as today; each visit starts with Ativos, Todos os modelos, Nome ascending. | No |
| Q9 | On narrow screens only Nome is shown, so the e-mail sort cannot be reached. | Proposed: accept for the MVP; narrow screens sort by name only (4.4 step 6). | No |
| Q10 | Format of the `sort` value. | Decided (owner, 2026-11-19): `name`, `-name`, `email`, `-email`; a leading `-` means descending. | — |
| Q11 | The owner asked to amend AC-0001-10 so "Criar novo modelo" goes to `/forms/new?type=client`. AC-0001-10 names no URL. The editor locks the type, returns to `/clients` on leave and opens the new-client page after saving only when the link carries `from=clients` (SPEC-0004 §4.2 step 4). With `?type=client` alone, AC-0001-10 fails. | AC-0001-10 is not amended. Restoring the `from=clients` link is a separate bug fix, outside this spec. | No (separate fix) |
| Q12 | How SPEC-0004 records the change. | Decided (owner, 2026-11-19): on approval of this spec, SPEC-0004 gets a version bump, the note "amended by SPEC-0006" on each part listed in §2, and a changelog line. | — |
| Q13 | Copy for the total while searching: "3 clientes" or "3 clientes encontrados"? | Proposed: the same `clients.list.count` copy in every case. | No |
| Q14 | A new `clientForm.invalid` key would duplicate SPEC-0003's `formId.invalid` for a malformed template id. | Decided (owner, 2026-11-19): reuse `formId.invalid` (422, field `formId`). | — |

## 10. Acceptance criteria

```gherkin
AC-0006-01
Given tenant "studio-ana" with client templates "Anamnese" and "Ficha", clients "Ana Souza" (Anamnese) and "Bruno Lima" (Ficha)
When  its owner lists clients with formId of "Anamnese"
Then  the response is 200 and lists only "Ana Souza"
And   the response has total 1
```

```gherkin
AC-0006-02
Given clients "Ana Souza" (Anamnese, active), "Ana Lima" (Anamnese, inactive) and "Ana Reis" (Ficha, active)
When  the owner lists clients with q "ana", status "all" and formId of "Anamnese"
Then  the list holds "Ana Lima" and "Ana Souza" and not "Ana Reis"
```

```gherkin
AC-0006-03
Given template "Antigo" is archived and has a client "Carla Dias"
When  the owner lists clients with formId of "Antigo"
Then  the list holds "Carla Dias"
```

```gherkin
AC-0006-04
Given tenant "studio-bia" has a client template "Ficha Bia" with a client "Bia Lima"
When  the owner of "studio-ana" lists clients with formId of "Ficha Bia"
Then  the response is 200 with an empty list and total 0
```

```gherkin
AC-0006-05
Given tenant "studio-ana" and a well-formed template id that no template has
When  its owner lists clients with that formId
Then  the response is 200 with an empty list and total 0
```

```gherkin
AC-0006-06
Given tenant "studio-ana" with a service template "Corte"
When  its owner lists clients with formId of "Corte"
Then  the response is 200 with an empty list and total 0
```

```gherkin
AC-0006-07
Given an owner listing clients
When  the request has formId "not-an-id"
Then  the response is 422 with { "error": "formId.invalid", "field": "formId" }
```

```gherkin
AC-0006-08
Given an active client "Ana Souza" from template "Anamnese"
When  the owner opens /clients
Then  the table headers are exactly Nome, E-mail, Telefone
And   the row of "Ana Souza" does not show "Anamnese"
```

```gherkin
AC-0006-09
Given an active client "Ana Souza" with no phone
When  the owner opens /clients
Then  the Telefone cell of "Ana Souza" shows "—"
```

```gherkin
AC-0006-10
Given tenant "studio-ana" with active client template "Ficha", archived client template "Antigo", active client template "Anamnese" and service template "Corte"
When  its owner opens the Modelo control on /clients
Then  it offers, in order, "Todos os modelos", "Anamnese", "Antigo (arquivado)", "Ficha"
```

```gherkin
AC-0006-11
Given tenant "studio-ana" whose only client template is "Cliente"
When  its owner opens /clients
Then  no Modelo control is shown
```

```gherkin
AC-0006-12
Given clients "Ana Souza" (Anamnese) and "Bruno Lima" (Ficha), and the owner on /clients with search "souza"
When  they choose "Anamnese" in the Modelo control
Then  a list request is sent with q "souza" and formId of "Anamnese", without after
And   the list shows only "Ana Souza"
And   the page shows "1 cliente"
```

```gherkin
AC-0006-13
Given the owner on /clients with "Anamnese" chosen in the Modelo control
When  they choose "Todos os modelos"
Then  the next list request has no formId
```

```gherkin
AC-0006-14
Given tenant "studio-ana" with clients only from template "Ficha", and client templates "Ficha" and "Anamnese"
When  its owner chooses "Anamnese" in the Modelo control with an empty search
Then  the page shows the state with copy key clients.list.emptyFilter, not clients.list.empty
```

```gherkin
AC-0006-15
Given tenant "studio-ana" with client templates "Ficha" and "Anamnese" and client "Ana Souza"
When  its owner opens /clients and the template request fails with 500
Then  no Modelo control is shown
And   the list shows "Ana Souza"
```

```gherkin
AC-0006-16
Given tenant "studio-ana" with 120 active clients
When  its owner lists clients with limit 10, then once more passing that response's nextCursor as after
Then  both responses hold 10 clients
And   both responses have total 120
```

```gherkin
AC-0006-17
Given active clients "Ana Souza" (souza@example.com), "Ana Lima" (lima@example.com) and "Bruno Lima" (bruno@example.com), and an inactive client "Ana Reis" (reis@example.com)
When  the owner lists clients with q "ana"
Then  the response has total 2
```

```gherkin
AC-0006-18
Given tenant "studio-bia" has 3 clients and tenant "studio-ana" has exactly 2 clients, both active
When  the owner of "studio-ana" lists clients with status "all"
Then  the response has total 2
```

```gherkin
AC-0006-19
Given tenant "studio-ana" with 120 active clients, and no client added or removed during the test
When  its owner opens /clients and presses Carregar mais
Then  the page shows "120 clientes" before and after the second page loads
```

```gherkin
AC-0006-20
Given tenant "studio-ana" with exactly one active client
When  its owner opens /clients
Then  the page shows "1 cliente"
```

```gherkin
AC-0006-21
Given tenant "studio-ana" with no clients
When  its owner opens /clients
Then  the page shows the state with copy key clients.list.empty and no total
```

```gherkin
AC-0006-22
Given clients "Érica", "bruno" and "Ana"
When  the owner lists clients with sort "-name"
Then  they are listed in the order "Érica", "bruno", "Ana"
```

```gherkin
AC-0006-23
Given clients "Zeca" (ana@example.com), "Ana" (zeca@example.com) and "Bruno" (bruno@example.com)
When  the owner lists clients with sort "email", and then with sort "-email"
Then  the first list is "Zeca", "Bruno", "Ana"
And   the second list is "Ana", "Bruno", "Zeca"
```

```gherkin
AC-0006-24
Given tenant "studio-ana" with 120 active clients, two of them both named "Mara", who are the 50th and 51st clients in descending name order
When  its owner lists clients with sort "-name" without limit, then twice more passing each nextCursor as after
Then  the pages hold 50, 50 and 20 clients in descending name order
And   one "Mara" is the last client of the first page and the other is the first client of the second page
And   no client appears twice and none is missing
```

```gherkin
AC-0006-25
Given an owner listing clients
When  the request has sort "phone"
Then  the response is 422 with { "error": "clientSort.invalid", "field": "sort" }
```

```gherkin
AC-0006-26
Given a nextCursor returned for a list with sort "name"
When  the owner lists clients with sort "email" and that cursor as after
Then  the response is 422 with { "error": "cursor.invalid", "field": "after" }
```

```gherkin
AC-0006-27
Given an owner listing clients
When  the request has q "a", formId "not-an-id" and sort "phone"
Then  the response is 422 with { "error": "clientSearch.min", "field": "q" }
```

```gherkin
AC-0006-28
Given an owner opening /clients
When  the list has loaded
Then  the Nome header is marked as sorted ascending and the E-mail header is not marked
And   the Telefone header is not a sort control
```

```gherkin
AC-0006-29
Given the owner on /clients sorted by Nome ascending
When  they press the Nome header, and then press it again
Then  the first press sends a list request with sort "-name" and marks Nome as descending
And   the second press sends a list request with sort "name" and marks Nome as ascending
```

```gherkin
AC-0006-30
Given the owner on /clients sorted by Nome descending
When  they press the E-mail header
Then  a list request is sent with sort "email"
And   E-mail is marked as ascending and Nome is not marked
```

```gherkin
AC-0006-31
Given the owner on /clients with search "ana", status "Todos", "Anamnese" chosen in the Modelo control, and a second page loaded with Carregar mais
When  they press the E-mail header
Then  the next list request has q "ana", status "all", formId of "Anamnese", sort "email" and no after
And   only that request's first page is shown
```

```gherkin
AC-0006-32
Given the owner sorted /clients by E-mail descending and left the page
When  they open /clients again
Then  the first list request has no sort parameter
And   the Nome header is marked as sorted ascending
```

```gherkin
AC-0006-33
Given the owner on /clients
When  they change the sort and the list request has not answered yet
Then  the page shows skeleton rows with copy key clients.list.loading and no total
```

```gherkin
AC-0006-34
Given a nextCursor returned for a list with formId of "Anamnese"
When  the owner lists clients with formId of "Ficha" and that cursor as after, and then with no formId and that cursor as after
Then  both responses are 422 with { "error": "cursor.invalid", "field": "after" }
```

```gherkin
AC-0006-35
Given the owner on /clients sorted by E-mail ascending, with "Anamnese" chosen in the Modelo control and more than 50 matching clients
When  they press Carregar mais
Then  the list request has sort "email", formId of "Anamnese" and the first page's nextCursor as after
```

```gherkin
AC-0006-36
Given an owner on /clients
When  the client list request fails with 500
Then  the page shows the state with copy key clients.list.error and no total
```

```gherkin
AC-0006-37
Given tenant "studio-ana" whose only client "Ana Souza" is inactive
When  its owner opens /clients with the default filter
Then  the page shows the state with copy key clients.list.emptyFilter and no total
```

```gherkin
AC-0006-38
Given clients "Ana Souza" and "Bruno Lima"
When  the owner searches /clients for "zzz"
Then  the page shows the state with copy key clients.list.noResults and no total
```

```gherkin
AC-0006-39
Given tenant "studio-ana" with client templates "Ficha" and "Anamnese" and client "Ana Souza"
When  its owner opens /clients and the template request has not answered yet
Then  no Modelo control is shown
And   the list shows "Ana Souza" once its request answers
```

```gherkin
AC-0006-40
Given an owner on /clients on a narrow screen, with client "Ana Souza"
When  the list has loaded
Then  only the Nome header is shown
And   it is a sort control marked as ascending
```

```gherkin
AC-0006-41
Given the owner on /clients sorted by E-mail ascending, and the screen then narrows
When  they press the Nome header
Then  before the press the Nome header is not marked as sorted
And   the press sends a list request with sort "name" and marks Nome as ascending
```

```gherkin
AC-0006-42
Given an owner listing clients
When  the request has formId "not-an-id" and sort "phone"
Then  the response is 422 with { "error": "formId.invalid", "field": "formId" }
```

## 11. Implementation plan

Drafted by `/plan` on 2026-11-19 against the code SPEC-0004 built (spec v1.6, `status: Approved`; its code is
committed, but the spec is not yet `Implemented`, see G-5). Revised in v1.2 after the plan review and the
count-cost research. Approved by the owner on 2026-11-19 (v1.3), with G-1 to G-4 decided as proposed; G-5 is an
owner action before `/implement`.

```scope
packages/schemas/src/clients/*
packages/i18n/messages/pt-BR.json
packages/i18n/messages/en-US.json
apps/api/src/modules/clients/*
apps/api/test/utils/clients-fixtures.ts
apps/api/test/e2e/clients-list*
apps/web/src/app/*/orgs/*/clients/_components/*
apps/web/src/app/api/clients/route.ts
apps/web/src/lib/api/clients.ts
apps/web/tests/clients-list.test.tsx
apps/web/tests/clients-harness.tsx
docs/specs/SPEC-0006-lista-de-clientes.md
```

### Owner decisions

G-1 to G-4 decided as proposed (Joao Izidoro, 2026-11-19). G-3 and G-5 are preconditions the owner completes before
`/implement` (Sequence step 0).

| # | Gap | Decision |
| --- | --- | --- |
| G-1 | The Modelo control needs archived client templates; the [Novo] menu fetches only active ones. Two fetches, or one? | One fetch in the list page, `GET /api/forms?type=client&includeArchived=true`. The page passes the templates to the menu, which keeps only the active ones (it already filters by `status`). The W-list test of AC-0004-02 asserts that no forms request carries `includeArchived=true`. That assertion becomes "the menu lists only the active templates", which the test already checks. AC-0004-02 itself does not change. |
| G-2 | AC-0006-40 and the narrow-screen part of AC-0006-41 depend on layout. The repo has no browser test runner, and jsdom has no media queries. | Checked by hand at `/review`, at 375 px and at 1280 px wide. The sort logic of AC-0006-41 is tested in W-list. |
| G-3 | `task-lock.sh check` compares the base commit with the working tree, so any uncommitted file outside the scope blocks the lock. Uncommitted today: `docs/RFC-segmented/02-engenharia-de-requisitos.md`, `docs/architecture/api-convention.md`, `docs/specs/SPEC-0004-clientes.md`, `docs/specs/SPEC-0006-lista-de-clientes.md` (untracked), `apps/web/package.json` and `pnpm-lock.yaml`. The W-list suite also has one failing test (AC-0001-10, the `?type=client` link, §9 Q11). The list polish is already committed (`6eefdb1`). | Before the lock, the owner makes these commits, each on its own: (a) the doc changes (RFC, convention, SPEC-0004, SPEC-0006); (b) the one-line link fix restoring AC-0001-10; (c) the TanStack packages, or removes them with pnpm (see New dependencies). Then the tree is clean and W-list starts green. |
| G-4 | Index for the e-mail sort. | None now. `idx_clients_tenant_email (tenant_id, email)` serves `status=all`. With a status filter, Postgres filters one tenant's clients, which is fine at MVP sizes. If it turns out slow, add an index in a later migration. |
| G-5 | SPEC-0004 is `status: Approved`. Its 1.5 changelog keeps it Approved "until the owner accepts the behavior on a running system". `task-lock.sh start` refuses a `depends_on` spec that is not `Implemented`, so `/implement` cannot lock. | The owner accepts SPEC-0004 on a running system and sets it to `Implemented` (version bump and changelog line) before `/implement`, as SPEC-0004's G-6 did for SPEC-0003. Only the owner can do this. |

### Contracts (`packages/schemas/src/clients/`)

- `requests.ts`, `ListClientsQuerySchema`. Key order is the check order (§6): `q`, `status`, `formId`, `sort`,
  `limit`, `after`.
  - `formId`: `RecordFormIdSchema.optional()` (records contract; malformed → `formId.invalid`).
  - `sort`: `z.enum(CLIENT_SORTS, { error: "clientSort.invalid" }).default("name")`, with
    `CLIENT_SORTS = ["name", "-name", "email", "-email"] as const` and `type ClientSort`.
- `responses.ts`: `ClientListResponseSchema` adds `total: z.number().int().nonnegative()`.
- `errors.ts`: append `"clientSort.invalid"` to `CLIENT_ERROR_CODES`. `formId.invalid` already exists in
  `RECORD_ERROR_CODES` and is reused (§9 Q14).
- i18n: `validation.clientSort.invalid` in pt-BR and en-US.
- Additive. The only consumer is `apps/web`. Its BFF parses the response with `ClientListResponseSchema`, so web
  fixtures must carry `total`.

### Persistence

No table, column, index or migration change (G-4). Nothing to roll back. The template filter uses the existing join
`clients → form_records (form_id) → forms`, which already carries `tenant_id` on every join. A template of
another tenant, an unknown id or a service template therefore matches no row (R2), with no extra lookup.

### API (`apps/api/src/modules/clients/`)

`GET /v1/clients` (route, guards and `membership.assertCanManage()` unchanged). Statuses 200, 400
`tenant.required`, 401, 403 `tenant.inactive`, 404 `tenant.not-found`, 422 (`clientSearch.min`,
`clientStatus.invalid`, `formId.invalid`, `clientSort.invalid`, `limit.invalid`, `cursor.invalid`).

- `domain/client-cursor.ts`:
  - `CursorFilter` gains `formId` (`''` when none) and `sort`. `decodeCursor` rejects any difference in them (R5).
  - `CursorPosition` becomes `{ key, id }`, where `key` is the last row's `name_key` for the name sorts and its
    `email` for the e-mail sorts.
  - The payload stays `{ f, n, i }`; `f` now holds four fields. Cursors issued before the deploy fail with 422
    `cursor.invalid` (Risks).
- `ports/client.repository.ts`:
  - `ClientListFilter` gains `formId: string | null` and `sort: ClientSort`. `after` becomes `{ key, id } | null`.
  - New `count(tenantId, filter: Omit<ClientListFilter, 'after' | 'take'>): Promise<number>`.
- `infrastructure/persistence/client.drizzle.repository.ts`:
  - `list`: when `formId` is set, add `eq(formRecords.formId, formId)`. Order by `(name_key, id)` or `(email, id)`,
    ascending or descending as `sort` says. The keyset compares with `>` when ascending and `<` when descending.
  - `count`: `count(*)::int` with the same joins and conditions as `list`, without the keyset and the limit.
  - Both go through `guardQuery`.
- `queries/list-clients/list-clients.handler.ts`:
  - Build the cursor filter from `status`, the search key, `formId` and `sort`.
  - **Single-page rule.** Run `list` first. If there is no `after` and `list` returned `limit` rows or fewer, the
    page holds every match, so `total` is the number of rows and `count` does not run. Otherwise run `count` after
    `list`, sequentially, not with `Promise.all`.
  - This skips the second scan for searches with up to 50 matches, where it costs most. The total stays exact and
    comes from the same snapshot as the rows. A request holds one pool connection, not two.
  - AC-0006-17 exercises the derived branch, AC-0006-16 the `count` branch.
  - Return `total`. The `nextCursor` key follows the sort.
- ACs: 01–07, 16–18, 22–27, 34, 42.

### Web

- `apps/web/src/app/api/clients/route.ts`: forward `formId` and `sort` too.
- `apps/web/src/lib/api/clients.ts`: `listClients` takes `formId?` and `sort?`.
- `clients/_components/clients-list.tsx`:
  - **Templates.** Fetch the client templates once (G-1). Show the Modelo control (the existing `Select`, `field`
    look, label `clients.list.filter.form`) only when there are 2 or more. Its options are `allForms` followed by
    the templates in API order, which is by `name_key`, then `id`, within a type (SPEC-0001 §11, `GET /v1/forms`).
    Archived templates are labelled with `archivedForm`. The control is hidden while the templates load and when
    the fetch fails.
  - **List state.** State `formId` (null) and `sort` (null means the default, so the first request has no `sort`,
    AC-0006-32). Any change of q, status, formId or sort restarts from the first page. "Carregar mais" sends all
    of them with the cursor.
  - **Empty check.** The "is there any client at all" request (SPEC-0004 Decision 6) also runs when a `formId` is
    chosen.
  - **Total.** Show `clients.list.count` above the table in the success state only. Every response replaces the
    shown total, "Carregar mais" included (§4.3 step 2). Today `loadMore` copies the previous page state, so it must
    take `total` from its own response.
  - **Columns.** Drop the Modelo column.
  - **Sorting.**
    - The Nome and E-mail headers render a `<button>` inside the `<th>`. The `<th>` carries `aria-sort`, and the
      button's accessible name adds `clients.list.sort.ascending` / `descending` for the current column.
    - Header rules follow §4.4. Pressing Nome while the sort is null sends `-name`.
    - Telefone stays plain text. On narrow screens only the Nome header is rendered (the existing `md:` classes).
- `new-client-menu.tsx`: takes the templates as a prop instead of fetching them (G-1).
- Extract the sortable header into `clients/_components/sort-header.tsx` if `clients-list.tsx` passes about 350
  lines.
- i18n:
  - Add `clients.list.count`, `clients.list.filter.form`, `clients.list.filter.allForms`,
    `clients.list.filter.archivedForm`, `clients.list.sort.ascending`, `clients.list.sort.descending`.
  - Remove `clients.list.columns.form`.
- ACs: 08–15, 19–21, 28–33, 35–41.

### Tests

API e2e is `apps/api/test/e2e/clients-list.e2e-spec.ts` (Testcontainers; new `describe('SPEC-0006 …')` blocks). It
uses `clients-fixtures.ts` (seeding clients for a given template) and the existing `archive(id)` helper of
`apps/api/test/utils/forms-fixtures.ts` (read only, not in scope). API unit tests are `domain/client-cursor.spec.ts` and `domain/client-requests.spec.ts`. Web
is `apps/web/tests/clients-list.test.tsx` (W-list), with `clients-harness.tsx` (`total` in `ListReply` and
`EMPTY_LIST`, `formId` and `sort` visible to `serveList` handlers).

| AC | File | Test name |
| --- | --- | --- |
| 01 | e2e clients-list | `AC-0006-01 filters by template and reports total 1` |
| 02 | e2e clients-list | `AC-0006-02 combines the template filter with q and status` |
| 03 | e2e clients-list | `AC-0006-03 lists the clients of an archived template` |
| 04 | e2e clients-list | `AC-0006-04 answers an empty list and total 0 for another tenant's template` |
| 05 | e2e clients-list | `AC-0006-05 answers an empty list and total 0 for an unknown template id` |
| 06 | e2e clients-list | `AC-0006-06 answers an empty list and total 0 for a service template` |
| 07 | e2e clients-list, unit client-requests | `AC-0006-07 rejects a malformed formId with formId.invalid` |
| 08 | W-list | `AC-0006-08 shows exactly Nome, E-mail, Telefone and no template` |
| 09 | W-list | `AC-0006-09 shows "—" for a client without a phone` |
| 10 | W-list | `AC-0006-10 offers Todos os modelos, then client templates by name, archived marked` |
| 11 | W-list | `AC-0006-11 shows no Modelo control with a single client template` |
| 12 | W-list | `AC-0006-12 choosing a template sends q and formId without after and shows "1 cliente"` |
| 13 | W-list | `AC-0006-13 choosing Todos os modelos drops formId` |
| 14 | W-list | `AC-0006-14 shows emptyFilter under a template with no clients` |
| 15 | W-list | `AC-0006-15 hides the Modelo control when templates fail and still lists` |
| 16 | e2e clients-list | `AC-0006-16 reports total 120 on two pages of limit 10` |
| 17 | e2e clients-list | `AC-0006-17 total follows the search and the status filter` |
| 18 | e2e clients-list | `AC-0006-18 total never counts another tenant's clients` |
| 19 | W-list | `AC-0006-19 keeps "120 clientes" after Carregar mais`; plus `§4.3 step 2 Carregar mais shows the total of its own response` (second page answers total 121, page shows "121 clientes") |
| 20 | W-list | `AC-0006-20 shows "1 cliente"` |
| 21 | W-list | `AC-0006-21 shows no total in the no-clients state` |
| 22 | e2e clients-list | `AC-0006-22 sorts by name descending ignoring case and accents` |
| 23 | e2e clients-list | `AC-0006-23 sorts by e-mail ascending and descending` |
| 24 | e2e clients-list | `AC-0006-24 pages a descending name sort with a tie at the page boundary` |
| 25 | e2e clients-list, unit client-requests | `AC-0006-25 rejects sort "phone" with clientSort.invalid` |
| 26 | e2e clients-list, unit client-cursor | `AC-0006-26 rejects a cursor issued for another sort` |
| 27 | unit client-requests, e2e clients-list | `AC-0006-27 checks q before formId and sort` |
| 28 | W-list | `AC-0006-28 marks Nome ascending on load; Telefone is not a sort control` |
| 29 | W-list | `AC-0006-29 toggles the name sort between -name and name` |
| 30 | W-list | `AC-0006-30 pressing E-mail sorts by email ascending` |
| 31 | W-list | `AC-0006-31 a sort change keeps search and filters and restarts at the first page` |
| 32 | W-list | `AC-0006-32 a new visit sends no sort and marks Nome ascending` |
| 33 | W-list | `AC-0006-33 shows skeleton rows and no total while a sort change loads` |
| 34 | e2e clients-list, unit client-cursor | `AC-0006-34 rejects a cursor issued for another template filter` |
| 35 | W-list | `AC-0006-35 Carregar mais sends sort, formId and the cursor` |
| 36 | W-list | `AC-0006-36 shows no total in the error state` |
| 37 | W-list | `AC-0006-37 shows no total in the emptyFilter state` |
| 38 | W-list | `AC-0006-38 shows no total in the noResults state` |
| 39 | W-list | `AC-0006-39 hides the Modelo control while templates load` |
| 40 | manual (G-2) | at `/review`: 375 px wide, only Nome shown and marked ascending |
| 41 | W-list + manual (G-2) | `AC-0006-41 pressing Nome while sorted by e-mail sorts by name ascending`; narrow layout by hand |
| 42 | unit client-requests, e2e clients-list | `AC-0006-42 checks formId before sort` |

Deferred checks: none. Every AC can be verified with code that exists.

Existing tests touched. Each changes shape only, not what it asserts:
- W-list AC-0004-02: the `includeArchived` assertion (G-1).
- SPEC-0004 W-list fixtures (`ListReply`, `EMPTY_LIST`): gain `total`.
- `client-requests.spec.ts`:
  - `lists the client error codes of §6, each once`: the list gains `clientSort.invalid`.
  - `defaults status to active and limit to 50`: the parsed output gains `sort: "name"`.
- `client-cursor.spec.ts`: the `filter` and `last` fixtures behind the AC-0004-21/-23 tests and the wrong-shape
  cases. `nameKey` becomes `key`, and the filter gains `formId` and `sort`.

AC-0004-21 to -23 must stay green, because the default sort and the cursor rules keep their behavior.

### Sequence

0. **Preconditions** (owner): G-3 commits made and the tree clean; SPEC-0004 set to `Implemented` (G-5).
1. **Contracts.** Schemas, error code, `validation.clientSort.invalid` copy.
   `pnpm --filter @planici/schemas build && pnpm --filter @planici/schemas typecheck`. The schemas package has no
   tests; `client-requests.spec.ts` covers the schema under `pnpm --filter api test`. Once `total` is required, the
   api typecheck and the SPEC-0004 W-list tests fail until steps 3 and 4. So the commit plan keeps the contract,
   API and harness changes in one commit; steps 1–4 are working steps, not separate commits.
2. **Failing tests.**
   - API unit and e2e for the API ACs.
   - Harness `total`, plus the W-list tests for the UI ACs.
   - Confirm they fail for the right reason.
3. **API.** Cursor, repository `list` and `count`, handler. `pnpm --filter api test && pnpm --filter api test:e2e`.
4. **Web.**
   - BFF and adapter.
   - List page: template control, total, sort headers, no Modelo column. Menu prop (G-1). i18n keys.
   - `pnpm --filter web lint && pnpm --filter web typecheck && pnpm --filter web test`.
5. **Close.** Whole-repo `pnpm lint && pnpm typecheck && pnpm test`. Manual check of AC-0006-40/41 (G-2). Update the
   changelog.

### Risks

| Risk | Cheapest early check |
| --- | --- |
| The §6 check order depends on the validation pipe answering the first issue in schema key order. | Write AC-0006-27/-42 unit tests first (step 2); they fail fast if the order differs. |
| `count(*)` repeats the list's predicates, including the unindexed `LIKE '%…%'` search. The single-page rule (API) skips it whenever the first page holds every match, but results longer than one page still scan twice, most of all when sorted by e-mail or with status "all". | Before or during step 3, run `EXPLAIN (ANALYZE, BUFFERS)` on Testcontainers postgres:17: one tenant with 5,000 clients plus 20,000 in other tenants, `ANALYZE`, then time `list` and `count` for no `q` (active, by name), a `q` matching nothing, a `q` matching most rows, and status "all" by e-mail. Repeat with 50,000. Revisit if the count's p95 passes 20 ms or a tenant passes 10,000 clients: a `pg_trgm` index if the search is the cost, or a capped count (a spec change). |
| The cursor payload changes, so a "Carregar mais" across the deploy fails with `cursor.invalid` and its retry fails too, until the page reloads. | Accept: a one-time edge at deploy. A reload fixes it. |
| Uncommitted files outside the scope, the AC-0001-10 failure, and SPEC-0004 not yet `Implemented` block the lock (G-3, G-5). | Owner preconditions, step 0. |
| The `Select` popup in jsdom for AC-0006-10/12/13. | Existing record-form tests already open a `Select`; reuse their pattern. |

### New dependencies

None for this plan.
- TanStack Table was considered and not used. Sort, filter and paging run on the server, and the table has two
  sortable headers, so a headless table library would add code rather than remove it.
- The working tree's `apps/web/package.json` already declares `@tanstack/react-query`, `@tanstack/react-table` and
  `@tanstack/react-virtual`, unused in `apps/web/src`. They are not part of this plan. The owner commits them
  separately, for the out-of-scope data-fetching refactor (§2), or removes them with pnpm before the lock (G-3).

## 12. Changelog

| Version | Date | Change |
| --- | --- | --- |
| 0.1 | 2026-11-19 | Draft from the `/clients` comparison with SimplePractice, Square, Acuity and Attio, and the owner's choices in conversation (template filter, total, sorting by name and e-mail). Q11 records why AC-0001-10 is not amended. |
| 0.2 | 2026-11-19 | Owner decisions Q1–Q7, Q10, Q12 and Q14 recorded; RF-09 and api-convention "Pagination" amended. Spec review fixes: total shown from the latest response (4.3); template control hidden while loading (4.2 step 3); "Carregar mais" keeps sort and filters (4.4 step 5); narrow-screen sort rule (4.4 step 6); `formId.invalid` reused; SPEC-0004 amendment list completed (§2); SPEC-0003 added to `depends_on`. AC-0006-01, -07, -12, -16, -18, -19, -24 and -32 reworded; AC-0006-34 to -42 added. Status → Review. |
| 1.0 | 2026-11-19 | Approved by Joao Izidoro, 2026-11-19, with all 42 criteria agreed. SPEC-0004 amended per §2 (its v1.6). |
| 1.1 | 2026-11-19 | Implementation plan (§11) drafted by `/plan` against the SPEC-0004 code: contract additions (`formId`, `sort`, `total`, `clientSort.invalid`), no migration, cursor bound to template filter and sort, repository `count`, list page template control, total and sort headers. Owner decisions G-1 to G-4 pending. `plan_status` stays Draft. |
| 1.2 | 2026-11-19 | Plan review (2026-11-19) required changes 1–6 applied: G-5 added (SPEC-0004 must be `Implemented` before the lock) and the intro corrected; G-3 rewritten for the current tree (polish committed in `6eefdb1`; docs, link fix and TanStack packages committed separately); TanStack packages in the tree declared out of plan; step 1 check uses `typecheck`, since the schemas package has no tests; existing tests touched listed in full; "Carregar mais" replaces the total, with a W-list check. Non-blocking: reuse `archive(id)`, cite SPEC-0001's template order, keep contract, API and harness in one commit. Count-cost research (owner choice): single-page rule in the handler, `list` then `count` sequentially; the measurement and revisit thresholds added under Risks. Owner decisions G-1 to G-5 pending. `plan_status` stays Draft. |
| 1.3 | 2026-11-19 | Plan approved by Joao Izidoro, 2026-11-19: §11 as revised in 1.2, with G-1 to G-4 decided as proposed. `plan_status` Approved. Before `/implement`: the G-3 commits and SPEC-0004 set to `Implemented` (G-5). |
