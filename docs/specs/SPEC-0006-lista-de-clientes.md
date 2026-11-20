---
id: SPEC-0006
title: Lista de clientes — filtro por modelo, total e ordenação
status: Approved # Draft | Review | Approved | Implemented | Superseded
plan_status: Draft # Draft | Approved
version: 1.7
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
- A new layout (owner designs, 2026-11-19): on wide screens, a compact full-width list of client rows; on narrow
  screens, client cards grouped by initial letter (R10). Each row and card shows its template as a badge.
- A template filter on `/clients`.
- The total number of clients matching the current search and filters, shown above the list.
- Sorting the wide-screen list by name (A–Z, Z–A) or by last update (newest first). The narrow-screen list is
  always A–Z.
- Infinite scroll: the next page loads as the professional reaches the end of the list, replacing "Carregar mais".
  When there is nothing more to load, a message and an illustration close the list. (Owner request, 2026-11-19.)

**Out of scope**
- Last and next appointment columns: the scheduling spec, once appointments exist.
- Custom-field values as list columns: SPEC-0003 R9 stands (owner decision, 2026-11-19).
- Sorting by e-mail, phone or template (the e-mail sorts of v1.0 were dropped in v1.5).
- Client photos (`avatar_url`, post-MVP per SPEC-0004 §2): rows show initials.
- Remembering the chosen filters or sort between visits (§9 Q8).
- Moving other screens' data fetching to a library: a behavior-preserving refactor, no spec. The client list's own
  fetching is part of this plan (§11).
- The "Criar novo modelo" link of the [Novo] dropdown (§9 Q11): a separate fix restoring AC-0001-10.

**Dependencies and amendments**
- Builds on SPEC-0004 (Approved): its search (R9), status filter (§4.1 step 4), pagination (AC-0004-21 to -23)
  and list states (§8) are unchanged unless stated here.
- On approval, this spec amends these parts of SPEC-0004, each of which gets the note "amended by SPEC-0006",
  with a version bump and a changelog line (§9 Q12). SPEC-0004 v1.6 already carries notes from this spec's v1.0;
  where a part below already has one, that note is **rewritten** to match this version, not added to:
  - R10 (one fixed sort). Its v1.0 note ("four sorts, name or e-mail") is rewritten: three sorts, `name`, `-name`
    and `-updatedAt` (R4 here);
  - §4.1 step 2, the table and its Modelo column. Its v1.0 note ("the Modelo column is gone; the template is a
    filter") is rewritten: rows on wide screens and cards on narrow screens, each with a template badge, and a
    template filter on wide screens (§4.1, §4.6 here);
  - §4.1 step 5, the empty state, which now also covers the template filter (existing note, unchanged);
  - §4.1 step 6 ("Carregar mais"), replaced by infinite scroll (§4.5 here);
  - §4.2 step 1, the [Novo] trigger, which on narrow screens is a floating button (§4.6 step 5 here);
  - §6, the list check order (`q`, `status`, `limit`, `after`) and the `cursor.invalid` row, which now also covers
    a different template filter or sort (existing notes, unchanged);
  - §7 "Client": `updatedAt` becomes the client's last update time of R9 here, which also changes on inactivation
    and reactivation, so the client's page and the list report the same value (§7 here; owner decision, §9 Q30);
  - §7 "ClientSummary": adds `updatedAt` (§7 here);
  - §7 "List". Its v1.0 note is rewritten: query adds `formId?` and `sort?` (`name` default, `-name`, `-updatedAt`);
    response adds `total`;
  - §8, the "success" row, whose v1.0 note ("Nome, E-mail, Telefone, with the total above") is rewritten to the
    wide-screen rows and narrow-screen cards with the total above (§8 here); the "empty under the chosen filter"
    row (existing note, unchanged); and the "loading more" and "loading more failed" rows;
  - AC-0004-63, superseded by AC-0006-45.
- SPEC-0004 §11 Decision 9 (`createdAt` and `updatedAt` from the record) no longer holds for `updatedAt`; the
  revised plan (§11 here) records the change.
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
- **R4.** **Sort.** The list can be sorted by name ascending (the default, as SPEC-0004 R10), name descending, or
  last update, newest first. Name order ignores case and accents. Last-update order compares the client's last
  update time (R9) at full stored precision. Every sort ends with the client `id`, in the same direction, so pages
  never repeat or skip a client. (RF-09, amended; api-convention "Pagination", amended; owner decisions, §9 Q3, Q10
  and 2026-11-19 v1.5)
- **R5.** A cursor is bound to the search, the status filter, the template filter **and the sort** it was issued
  with. Sending it with any of them changed is rejected. (api-convention "Pagination", amended)
- **R6.** **Row content.** A wide-screen row shows the client's initials, name, e-mail, phone and a template badge.
  A narrow-screen card shows initials, name, e-mail, the date of the last update and a template badge. On both, an
  inactive client also carries the "Inativo" badge of SPEC-0004 §4.1 step 4, placed just before the template badge. Custom-field values
  never appear in the list (SPEC-0003 R9). (Owner designs and decisions, 2026-11-19, §9 Q20–Q23)
- **R7.** **Infinite scroll.** The list loads its next page when the professional reaches the end of the rows
  already loaded, by scrolling or by moving keyboard focus there, until the server reports no next page. There is no
  "Carregar mais" button. Pages still hold at most 50 clients (RNF-23, which allows "paginação ou scroll infinito").
  (Owner request, 2026-11-19)
- **R8.** **Back to the top.** When the search, a filter, the sort or the layout (§4.6 step 6) changes, the list
  returns to its top and loads from the first page. (Owner request, 2026-11-19)
- **R9.** **Last update.** A client's last update time is set when the client is created and changes on every edit
  saved, inactivation and reactivation. The client's page and the list report the same time (SPEC-0004 §7
  "Client", amended). (SPEC-0004 §4.3–§4.4; owner decisions, 2026-11-19 and §9 Q30)
- **R10.** **Layouts.** A screen is *narrow* when its viewport is under 48rem wide (RNF-16, breakpoint `md`), and
  *wide* otherwise. Wide screens follow §4.1; narrow screens follow §4.6. (Owner decision, §9 Q31)

## 4. Behavior

### 4.1 List (`/clients`)
Replaces SPEC-0004 §4.1 step 2 and step 6 (by 4.5). Steps 1, 3, 4 and 7 are unchanged; step 5 is extended by 4.2
step 7. This section describes wide screens; narrow screens follow §4.6 (R10).

2. The system lists active clients sorted by name (R4). Each client is a row across the full width of the content
   area, with no column headers (R6):
   - on the left, the client's initials, and beside them the name, which opens the client's page (SPEC-0004 §4.3);
   - below the name, the e-mail; below the e-mail, the phone, in a quieter style;
   - on the right, a badge with the template's name, in the same position on every row; for an inactive client,
     the "Inativo" badge just before it (SPEC-0004 §4.1 step 4).

   A client without a phone shows no phone line and no placeholder (§9 Q24). An archived template's badge shows its
   name alone, like an active one (§9 Q29).

### 4.2 Template filter
1. On wide screens, next to the status filter, a "Modelo" control offers "Todos os modelos" (the default) and every
   client template of the tenant by name, active and archived. Narrow screens have no template control (§4.6). An archived template's name is followed by "(arquivado)".
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
1. Above the list, on wide and narrow screens, the page shows the total of R3, for example "120 clientes" or
   "1 cliente".
2. The total is the number of matching clients, not the number of rows loaded so far. Every response carries it,
   and the page shows the one from the latest response. So loading the next page changes it only if matching
   clients were added or removed in the meantime (owner decision, §9 Q4).
3. The total is not shown while the list loads, in the error state, or in any empty state (no clients at all, no
   client under the chosen filters, no search results).

### 4.4 Sorting
1. On wide screens, an "Ordenar por" control next to the filters offers, in order, "Nome (A–Z)", "Nome (Z–A)" and
   "Última atualização" (R4). It shows the current sort. On first load it is "Nome (A–Z)".
2. "Última atualização" lists the most recently updated clients first (R9).
3. Choosing a sort reloads the list from the first page and returns to its top (R8). The search and filters stay as
   they were.
4. The next page (4.5) loads with the same search, filters and sort as the rows already shown (R5).
5. Narrow screens have no sort control: the list is always "Nome (A–Z)" (§4.6).
6. Leaving and reopening `/clients` starts again from "Nome (A–Z)" (§9 Q8).

### 4.5 Infinite scroll and end of list
1. When the last loaded row comes into view, by scrolling or by keyboard focus, and the latest response had a next
   page, the page requests the next page and appends its rows below (R7).
2. While it loads, a loading indicator with "Carregando mais clientes…" shows below the rows. Only one next-page
   request runs at a time.
3. If the next page fails, the loaded rows stay, and below them the page says "Não foi possível carregar mais
   clientes." with a retry. No further page is requested automatically until the professional presses retry.
4. When the latest response has no next page and the list has at least one row, a closing block shows below the
   last row: an illustration and the message "Isso é tudo! Não há mais clientes por aqui." (§9 Q15, Q16). This
   includes a list that fits in one page. Reaching the end again sends no request.
5. The illustration is decorative: assistive technology ignores it. Until the owner picks one, the block shows the
   message with an empty illustration slot (§9 Q15).
6. After each next page loads, assistive technology is told how many clients are loaded, for example "100 de 120
   clientes carregados", without moving focus.
7. The empty states (no clients, no client under the filters, no search results) show no closing block.
8. Everything in this section applies to the cards of narrow screens as it does to rows.

### 4.6 Narrow screens
Follows the owner's narrow-screen design (2026-11-19). Narrow is defined by R10.

1. Above the list: the search (SPEC-0004 R9), the status filter (SPEC-0004 §4.1 step 4) and the total (4.3). There
   is no template control and no sort control (§9 Q23).
2. Clients are cards sorted by name, A–Z, whatever sort was chosen on a wide screen. A list request from a narrow
   screen carries no sort and no template filter.
3. Before the first card of each initial letter, a heading shows that letter in upper case. The letter ignores case
   and accents ("Érica" goes under "E"). A name that does not start with a letter goes under "#" (§9 Q25).
4. A card shows (R6): the client's initials; the name, which opens the client's page; the e-mail below the name;
   the date of the last update (R9) as a short day and month in the page's language, for example "02/08", with the
   year added when it is not the current year (§9 Q26); a badge with the template's name; and, for an inactive
   client, the "Inativo" badge just before it (R6).
5. A floating button "+" at the bottom of the screen opens the [Novo] dropdown of SPEC-0004 §4.2. Its accessible
   name is "Novo cliente". It replaces the [Novo] button of wide screens (§9 Q27).
6. When the screen changes between wide and narrow, the search and the status filter stay. The list returns to its
   top and loads from the first page with the new layout's sort and template filter (R8). Going back to wide
   restores the template and sort last chosen there (§9 Q28).
7. When the next page starts with the same letter as the last loaded card, no second heading for that letter
   appears.

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
| Sort that is not one of `name`, `-name`, `-updatedAt` | 422 | `clientSort.invalid` | `sort` |
| Cursor issued for another search, status, template filter or sort (R5), or malformed | 422 | `cursor.invalid` (existing) | `after` |

**Check order for list**: `q`, `status`, `formId`, `sort`, `limit`, then `after` (amends SPEC-0004 §6).

`clientSort.invalid` needs pt-BR and en-US copy under `validation.*`, although the page never sends an invalid
value. `formId.invalid` reuses the existing key and copy (owner decision, §9 Q14).

## 7. Contract impact

Additive, non-breaking. Consumer: `apps/web`.

- **List query** adds:
  - `formId?`: a template id. Filters by template (R1, R2).
  - `sort?`: one of `name` (default), `-name`, `-updatedAt`. A leading `-` means descending (R4; owner decision,
    §9 Q10). There is no ascending `updatedAt`.
- **List response** adds `total`: integer, 0 or more, on every page (R3). It becomes
  `{ clients: ClientSummary[], nextCursor: string | null, total: number }`.
- **ClientSummary** adds `updatedAt`: the client's last update time (R9), an ISO-8601 UTC string. `formId` and
  `formName` stay; `formName` feeds the template badge (R6).
- **Client** (the single-client response of SPEC-0004 §7): `updatedAt` keeps its name and type, and now means the
  time of R9, so it also changes on inactivation and reactivation. `createdAt` is unchanged. Non-breaking for the
  only consumer, `apps/web` (owner decision, §9 Q30).

## 8. UI states

Rows of SPEC-0004 §8 not listed here are unchanged.

| Screen | State | Behavior | Copy key |
| --- | --- | --- | --- |
| `/clients` | success, wide screen | Full-width rows: initials, name, e-mail, phone, template badge on the right (4.1); total above them (4.3) | `clients.list.title`, `clients.list.count` |
| `/clients` | success, narrow screen | Cards under letter headings: initials, name, e-mail, last-update date, template badge (4.6); total above them | `clients.list.title`, `clients.list.count` |
| `/clients` | no phone (wide) | No phone line | — |
| `/clients` | inactive client (wide and narrow) | "Inativo" badge just before the template badge (R6) | `clients.list.inactiveBadge` |
| `/clients` | narrow screen, [Novo] | Floating "+" button opening the [Novo] dropdown (4.6 step 5) | `clients.new.floating` |
| `/clients` | template filter | "Modelo" control with "Todos os modelos" and each client template (4.2) | `clients.list.filter.form`, `clients.list.filter.allForms` |
| `/clients` | archived template in filter | Name followed by "(arquivado)" | `clients.list.filter.archivedForm` |
| `/clients` | templates loading | No template control yet; list works (4.2 step 3) | — |
| `/clients` | one client template or fewer | No template control | — |
| `/clients` | templates failed to load | No template control; list works | — |
| `/clients` | empty under the chosen filters | "Nenhum cliente com este filtro." (status or template); no total | `clients.list.emptyFilter` |
| `/clients` | empty, no search results, or error | As SPEC-0004 §8; no total | `clients.list.empty`, `clients.list.noResults`, `clients.list.error` |
| `/clients` | loading after a filter or sort change | Skeleton rows; no total | `clients.list.loading` |
| `/clients` | sort (wide) | "Ordenar por" control with "Nome (A–Z)", "Nome (Z–A)", "Última atualização"; shows the current one (4.4) | `clients.list.sort.label`, `clients.list.sort.nameAsc`, `clients.list.sort.nameDesc`, `clients.list.sort.updatedAt` |
| `/clients` | narrow screen | No template or sort control; always A–Z (4.6) | — |
| `/clients` | loading the next page | Indicator below the rows, "Carregando mais clientes…" (4.5 step 2) | `clients.list.loadingMore` |
| `/clients` | next page failed | Rows kept; "Não foi possível carregar mais clientes." + retry below them; no automatic request until retry (4.5 step 3) | `clients.list.loadMoreError`, `clients.form.retry` |
| `/clients` | end of list | Illustration (decorative; empty slot until chosen) and "Isso é tudo! Não há mais clientes por aqui." below the last row (4.5 steps 4–5) | `clients.list.end` |
| `/clients` | next page loaded | Polite announcement of loaded / total, focus unchanged (4.5 step 6) | `clients.list.loadedCount` |

Copy:
- `clients.list.count`: "{count, plural, one {# cliente} other {# clientes}}" / "{count, plural, one {# client}
  other {# clients}}"
- `clients.list.filter.form`: "Modelo" / "Template"
- `clients.list.filter.allForms`: "Todos os modelos" / "All templates"
- `clients.list.filter.archivedForm`: "{name} (arquivado)" / "{name} (archived)"
- `clients.list.sort.label`: "Ordenar por" / "Sort by"
- `clients.list.sort.nameAsc`: "Nome (A–Z)" / "Name (A–Z)"
- `clients.list.sort.nameDesc`: "Nome (Z–A)" / "Name (Z–A)"
- `clients.list.sort.updatedAt`: "Última atualização" / "Last updated"
- `clients.new.floating`: "Novo cliente" / "New client" (the floating button's accessible name)
- `validation.clientSort.invalid`: "Ordenação inválida." / "Invalid sort."
- `clients.list.loadingMore` (copy changed, the key no longer labels a button): "Carregando mais clientes…" /
  "Loading more clients…"
- `clients.list.end`: "Isso é tudo! Não há mais clientes por aqui." / "That's all! No more clients here." (§9 Q16)
- `clients.list.loadedCount`: "{loaded} de {total} clientes carregados" / "{loaded} of {total} clients loaded"

## 9. Open questions

| # | Question | Answer | Blocks |
| --- | --- | --- | --- |
| Q1 | RF-09 said only "buscar clientes por nome, e-mail ou telefone". Sorting and the total were not in the RFC. | Decided (owner, 2026-11-19): RF-09 amended to "O profissional pode buscar clientes por nome, e-mail ou telefone, filtrar por status e por modelo, ordenar por nome ou pela última atualização e ver quantos clientes foram encontrados." (v1.5 replaced "por nome ou e-mail".) | — |
| Q2 | `api-convention.md` said list responses have "no total count". | Decided (owner, 2026-11-19): convention amended; a list endpoint may return `total` (matching items, ignoring `limit` and `after`) when its spec asks for it. | — |
| Q3 | `api-convention.md` said each endpoint has "one fixed, stable sort". | Decided (owner, 2026-11-19): convention amended; an endpoint may document a closed set of sorts through `sort`, each ending with `id`, the first being the default; the cursor is bound to the filters and the sort. | — |
| Q4 | Total on every page, or only the first? | Decided (owner, 2026-11-19): every page; the page shows the latest response's total (4.3 step 2). | — |
| Q5 | Template filter with an unknown or another tenant's template: 200 empty, 404 or 422? | Decided (owner, 2026-11-19): 200 with an empty list and total 0 for any well-formed id (R2); 422 only for a malformed id. | — |
| Q6 | Show the template control when the tenant has a single client template? | Decided (owner, 2026-11-19): no; only with two or more client templates, active or archived. | — |
| Q7 | Archived templates in the filter? | Decided (owner, 2026-11-19): yes, with "(arquivado)" after the name, in name order with the active ones. Their clients are still listed (SPEC-0001 R8). | — |
| Q8 | Remember filters and sort between visits? | Decided (owner, 2026-11-20): no, as today; each visit starts with Ativos, Todos os modelos, Nome (A–Z). | — |
| Q9 | On narrow screens only Nome is shown, so the e-mail sort cannot be reached. | Superseded (v1.5): narrow screens are always A–Z by owner decision (Q23), and the e-mail sort is gone. | — |
| Q10 | Format of the `sort` value. | Decided (owner, 2026-11-19): a leading `-` means descending. Values since v1.5 (owner): `name`, `-name`, `-updatedAt`; the e-mail sorts are dropped. | — |
| Q11 | The owner asked to amend AC-0001-10 so "Criar novo modelo" goes to `/forms/new?type=client`. AC-0001-10 names no URL. The editor locks the type, returns to `/clients` on leave and opens the new-client page after saving only when the link carries `from=clients` (SPEC-0004 §4.2 step 4). With `?type=client` alone, AC-0001-10 fails. | AC-0001-10 is not amended. Restoring the `from=clients` link is a separate bug fix, outside this spec. | No (separate fix) |
| Q12 | How SPEC-0004 records the change. | Decided (owner, 2026-11-19): on approval of this spec, SPEC-0004 gets a version bump, the note "amended by SPEC-0006" on each part listed in §2, and a changelog line. | — |
| Q13 | Copy for the total while searching: "3 clientes" or "3 clientes encontrados"? | Decided (owner, 2026-11-20): the same `clients.list.count` copy in every case. | — |
| Q14 | A new `clientForm.invalid` key would duplicate SPEC-0003's `formId.invalid` for a malformed template id. | Decided (owner, 2026-11-19): reuse `formId.invalid` (422, field `formId`). | — |
| Q15 | Which illustration closes the list? | Owner picks an SVG later (owner, 2026-11-19). Until then the slot is empty and the message shows alone. The illustration is decorative, with no text of its own. | No |
| Q16 | Copy of the closing message. | Decided (owner, 2026-11-20): "Isso é tudo! Não há mais clientes por aqui." / "That's all! No more clients here." | — |
| Q17 | Infinite scroll can keep only the rows near the screen in the page, so the browser's find (Ctrl+F) would not see rows far from view. Acceptable? | Withdrawn (v1.5): the owner dropped row virtualization, so every loaded row stays in the page. | — |
| Q18 | Coming back from a client's page to the list: same scroll position and loaded pages, or the top? | Decided (owner, 2026-11-20): the top with the first page, as today (AC-0006-68). Restoring the position is a later improvement. | — |
| Q19 | The services list (SPEC-0005) should follow the same pattern (sort, total, infinite scroll, closing message "…não há mais serviços por aqui."). | Yes, written into SPEC-0005 when it is reviewed, reusing this spec's behavior. | No |
| Q20 | Which date does the narrow-screen card's date badge show? | Decided (owner, 2026-11-19): the client's last update (R9). | — |
| Q21 | The owner's designs show the template on each row. Keep the Modelo filter too? | Decided (owner, 2026-11-19): both, a badge on each row and the filter on wide screens. Reverses v1.0's "the template leaves the list". | — |
| Q22 | Which line goes under the name on narrow screens? | Decided (owner, 2026-11-19): the e-mail. | — |
| Q23 | Which controls do narrow screens have? | Decided (owner, 2026-11-19): the search and the status filter; always A–Z with letter headings. Decided (owner, 2026-11-20): the total is shown too. | — |
| Q24 | A wide-screen row for a client without a phone: "—", or no phone line? | Decided (owner, 2026-11-20): no phone line, since the row has no columns to keep aligned. | — |
| Q25 | Letter headings: how are accented, lower-case and non-letter initials grouped? | Decided (owner, 2026-11-20): upper case without accents ("Érica" under "E"); anything that is not a letter under "#", which comes where the name order puts it. | — |
| Q26 | Format of the narrow-screen date. | Decided (owner, 2026-11-20): day and month in the page's language ("02/08" in pt-BR), with the year when it is not the current year, in the browser's time zone. | — |
| Q27 | The mock's floating "+" button: what does it open? | Decided (owner, 2026-11-20): the [Novo] dropdown of SPEC-0004 §4.2, unchanged; it replaces the [Novo] button on narrow screens. | — |
| Q28 | When the screen changes between wide and narrow, what happens to the template filter and the sort? | Decided (owner, 2026-11-20): narrow drops them (it has no controls for them); going back to wide restores the last choice there. The search and the status filter stay. | — |
| Q29 | Badge of an archived template. | Decided (owner, 2026-11-20): the name alone; "(arquivado)" appears only in the filter. | — |
| Q30 | The client's page reports `updatedAt` from the record, which inactivation does not change (SPEC-0004 plan, Decision 9; AC-0003-82 keeps the revision), while R9 changes on inactivation and reactivation. Which meaning wins? | Decided (owner, 2026-11-20): R9's. SPEC-0004 §7 "Client" `updatedAt` is amended to it, so the page and the list agree (§2, §7). | — |
| Q31 | Where is the line between wide and narrow screens? | Decided (owner, 2026-11-20): 48rem, RNF-16's `md` breakpoint (R10). | — |

## 10. Acceptance criteria

UI criteria run on a wide screen (R10) unless they say "narrow screen".

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
Given an active client "Ana Souza" (ana@example.com, phone "(11) 98765-4321") from template "Anamnese"
When  the owner opens /clients
Then  the row of "Ana Souza" shows "AS", "Ana Souza", "ana@example.com", "(11) 98765-4321" and a badge "Anamnese"
And   the list has no column headers
```

```gherkin
AC-0006-09
Given an active client "Ana Souza" with no phone
When  the owner opens /clients
Then  the row of "Ana Souza" shows no phone line and no "—"
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
When  its owner opens /clients and scrolls to the end of the first 50 rows
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
Then  the page shows the state with copy key clients.list.empty, no total and no closing block
```

```gherkin
AC-0006-22
Given clients "Érica", "bruno" and "Ana"
When  the owner lists clients with sort "-name"
Then  they are listed in the order "Érica", "bruno", "Ana"
```

```gherkin
AC-0006-23
Given clients "Ana" last updated 2026-11-10, "Bruno" last updated 2026-11-18 and "Carla" last updated 2026-11-15
When  the owner lists clients with sort "-updatedAt"
Then  they are listed in the order "Bruno", "Carla", "Ana"
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
When  the owner lists clients with sort "-updatedAt" and that cursor as after
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
Then  the "Ordenar por" control shows "Nome (A–Z)"
And   it offers, in order, "Nome (A–Z)", "Nome (Z–A)", "Última atualização"
```

```gherkin
AC-0006-29
Given the owner on /clients sorted by "Nome (A–Z)"
When  they choose "Nome (Z–A)", and then "Nome (A–Z)"
Then  the first choice sends a list request with sort "-name" and the control shows "Nome (Z–A)"
And   the second choice sends a list request with sort "name" and the control shows "Nome (A–Z)"
```

```gherkin
AC-0006-30
Given the owner on /clients sorted by "Nome (Z–A)"
When  they choose "Última atualização"
Then  a list request is sent with sort "-updatedAt"
And   the control shows "Última atualização"
```

```gherkin
AC-0006-31
Given the owner on /clients with search "ana", status "Todos", "Anamnese" chosen in the Modelo control, and a second page loaded by scrolling
When  they choose "Última atualização"
Then  the next list request has q "ana", status "all", formId of "Anamnese", sort "-updatedAt" and no after
And   only that request's first page is shown
```

```gherkin
AC-0006-32
Given the owner sorted /clients by "Última atualização" and left the page
When  they open /clients again
Then  the first list request has no sort parameter
And   the control shows "Nome (A–Z)"
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
Given the owner on /clients sorted by "Última atualização", with "Anamnese" chosen in the Modelo control and more than 50 matching clients
When  they scroll to the end of the first 50 rows
Then  the list request has sort "-updatedAt", formId of "Anamnese" and the first page's nextCursor as after
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
Then  the page shows the state with copy key clients.list.emptyFilter, no total and no closing block
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
Given tenant "studio-ana" with client templates "Ficha" and "Anamnese" and client "Ana Souza"
When  its owner opens /clients on a narrow screen
Then  the search, the status filter and the total are shown
And   no "Ordenar por" control and no Modelo control are shown
And   the list request has no sort and no formId
```

```gherkin
AC-0006-41
Given the owner on /clients with search "ana", sorted by "Última atualização" and with "Anamnese" chosen in the Modelo control
When  the screen narrows
Then  a list request is sent with q "ana", the same status, no sort, no formId and no after
And   the list shows its first card at the top
```

```gherkin
AC-0006-42
Given an owner listing clients
When  the request has formId "not-an-id" and sort "phone"
Then  the response is 422 with { "error": "formId.invalid", "field": "formId" }
```

```gherkin
AC-0006-43
Given tenant "studio-ana" with 120 active clients and the first 50 shown on /clients
When  the owner scrolls until the 50th row is in view
Then  one list request is sent with the first page's nextCursor as after
And   the list shows 100 rows, the first 50 unchanged and in the same order
```

```gherkin
AC-0006-44
Given tenant "studio-ana" with 120 active clients and the first 50 shown on /clients
When  the owner moves keyboard focus with Tab to the name of the 50th client
Then  a list request is sent with the first page's nextCursor as after
```

```gherkin
AC-0006-45
Given tenant "studio-ana" with 120 active clients and the first 50 shown on /clients
When  the next-page request fails with 500
Then  the 50 rows stay and below them the page shows copy key clients.list.loadMoreError with a retry control
And   scrolling to the end again sends no request
And   pressing retry sends the request again and, when it answers, shows 100 rows
```

```gherkin
AC-0006-46
Given the owner on /clients with the first 50 of 120 clients shown
When  the next-page request has not answered yet
Then  below the rows the page shows the indicator with copy key clients.list.loadingMore
And   scrolling to the end again sends no second request
```

```gherkin
AC-0006-47
Given tenant "studio-ana" with 120 active clients
When  its owner scrolls /clients until all three pages have loaded
Then  below the 120th row the page shows the closing block with copy key clients.list.end
And   scrolling to the end again sends no request
```

```gherkin
AC-0006-48
Given tenant "studio-ana" with 3 active clients
When  its owner opens /clients
Then  below the 3 rows the page shows the closing block with copy key clients.list.end
```

```gherkin
AC-0006-49
Given clients "Ana Souza" and "Bruno Lima"
When  the owner searches /clients for "zzz"
Then  the page shows the state with copy key clients.list.noResults and no closing block
```

```gherkin
AC-0006-50
Given tenant "studio-ana" with 120 active clients and the first 50 shown on /clients
When  the second page loads
Then  a polite live region announces "100 de 120 clientes carregados" (copy key clients.list.loadedCount)
And   keyboard focus stays where it was
```

```gherkin
AC-0006-51
Given tenant "studio-ana" with 120 active clients
When  its owner opens /clients
Then  no "Carregar mais" button is shown
```

```gherkin
AC-0006-52
Given the closing block on /clients
When  it renders
Then  its illustration is hidden from assistive technology
And   the block's only accessible text is the clients.list.end message
```

```gherkin
AC-0006-53
Given an owner listing clients
When  the request has sort "updatedAt"
Then  the response is 422 with { "error": "clientSort.invalid", "field": "sort" }
```

```gherkin
AC-0006-54
Given tenant "studio-ana" with 60 active clients that all have the same last update time
When  its owner lists clients with sort "-updatedAt", then once more passing that response's nextCursor as after
Then  the pages hold 50 and 10 clients
And   no client appears twice and none is missing
```

```gherkin
AC-0006-55
Given clients "Ana Souza" and "Bruno Lima", where "Bruno Lima" was updated after "Ana Souza"
When  the owner saves an edit of the phone of "Ana Souza" and lists clients with sort "-updatedAt"
Then  "Ana Souza" is listed before "Bruno Lima"
```

```gherkin
AC-0006-56
Given active clients "Ana Souza" and "Bruno Lima", where "Bruno Lima" was updated after "Ana Souza"
When  the owner inactivates "Ana Souza" and lists clients with status "all" and sort "-updatedAt"
Then  "Ana Souza" is listed before "Bruno Lima"
```

```gherkin
AC-0006-57
Given a client "Ana Souza" whose last update was at 2026-11-18T15:30:00.000Z
When  the owner lists clients
Then  the entry of "Ana Souza" has updatedAt "2026-11-18T15:30:00.000Z"
```

```gherkin
AC-0006-58
Given tenant "studio-ana" with 120 active clients, and the owner on /clients scrolled down to the 80th row
When  they choose status "Todos"
Then  the list shows its first row at the top of the page
```

```gherkin
AC-0006-59
Given an active client "Ana Souza" (ana@example.com) from template "Anamnese", last updated on 2 August of the current year at 15:00 UTC, and a browser in the America/Sao_Paulo time zone with pt-BR
When  the owner opens /clients on a narrow screen
Then  the card of "Ana Souza" shows "AS", "Ana Souza", "ana@example.com", "02/08" and a badge "Anamnese"
And   it shows no phone
```

```gherkin
AC-0006-60
Given active clients "João Lima", "Érica Dias", "ana Reis" and "Eduardo Reis"
When  the owner opens /clients on a narrow screen
Then  the cards are in the order "ana Reis", "Eduardo Reis", "Érica Dias", "João Lima"
And   headings "A", "E" and "J" appear once each, right before "ana Reis", "Eduardo Reis" and "João Lima"
```

```gherkin
AC-0006-61
Given tenant "studio-ana" with 120 active clients, where the 50th and 51st by name both start with "M"
When  its owner, on a narrow screen, scrolls until the second page loads
Then  exactly one heading "M" is shown
```

```gherkin
AC-0006-62
Given active clients "7 Mares Estética" and "Ana Reis"
When  the owner opens /clients on a narrow screen
Then  "7 Mares Estética" is under the heading "#"
```

```gherkin
AC-0006-63
Given tenant "studio-ana" with active client template "Ficha"
When  its owner, on a narrow screen, presses the floating button named "Novo cliente" (copy key clients.new.floating)
Then  the [Novo] dropdown opens with "Criar novo modelo" and "Ficha"
And   no [Novo] button is shown at the top of the page
```

```gherkin
AC-0006-64
Given the owner on /clients sorted by "Última atualização" with "Anamnese" chosen, and the screen then narrowed
When  the screen widens again
Then  a list request is sent with sort "-updatedAt", formId of "Anamnese" and no after
And   the controls show "Última atualização" and "Anamnese"
```

```gherkin
AC-0006-65
Given archived template "Antigo" with active client "Carla Dias"
When  the owner opens /clients
Then  the badge of "Carla Dias" shows "Antigo", without "(arquivado)"
```

```gherkin
AC-0006-66
Given an inactive client "Ana Reis" from template "Ficha"
When  the owner opens /clients and chooses status "Todos"
Then  the row of "Ana Reis" shows the "Inativo" badge (copy key clients.list.inactiveBadge) right before the badge "Ficha"
```

```gherkin
AC-0006-67
Given an inactive client "Ana Reis" from template "Ficha"
When  the owner opens /clients on a narrow screen and chooses status "Todos"
Then  the card of "Ana Reis" shows the "Inativo" badge (copy key clients.list.inactiveBadge) right before the badge "Ficha"
```

```gherkin
AC-0006-68
Given tenant "studio-ana" with 120 active clients, and the owner on /clients with two pages loaded, scrolled down to the 80th row
When  they open the page of the 80th client and then go back to /clients
Then  the first list request has no after
And   the list shows its first row at the top of the page
```

```gherkin
AC-0006-69
Given an active client "Ana Souza"
When  the owner inactivates "Ana Souza", then reads her and lists clients with status "all"
Then  the read's updatedAt is later than before the inactivation
And   it equals the updatedAt of "Ana Souza" in the list
```

## 11. Implementation plan

> **Needs revision (v1.5).** The behavior amendments of v1.4 (infinite scroll, closing block) and v1.5 (wide-screen
> rows, narrow-screen cards, `-updatedAt` sort, `updatedAt` in `ClientSummary`, back-to-top) are not planned yet.
> Owner technical choice (2026-11-19): TanStack Query only, no Table and no Virtual. Once v1.5 is approved, `/plan`
> revises this section:
> - one client-list hook on `useInfiniteQuery`, shared by both layouts; search, status, template filter and sort in
>   the query key; next page fetched as the end of the list comes near; a failed page keeps the loaded pages;
> - separate components for the wide-screen row and the narrow-screen card, each layout passing its own sort and
>   template filter;
> - API: the `-updatedAt` keyset on `(updated_at, id)` descending, the email sorts removed, and whether an index on
>   `(tenant_id, status, updated_at, id)` is needed at MVP sizes;
> - the `@tanstack/react-table` and `@tanstack/react-virtual` packages removed by the owner with pnpm (G-3).
>
> The approval of v1.3 no longer applies; `plan_status` is Draft. The text below is the v1.3 plan, kept as the base
> for the revision.

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
| 1.4 | 2026-11-19 | Behavior amendment at the owner's request: infinite scroll replaces "Carregar mais" (R7, §4.5), with a closing message and an illustration slot left empty until the owner picks an SVG (Q15). AC-0006-19, -21, -31, -35 and -37 reworded; AC-0006-43 to -52 added; AC-0004-63 and SPEC-0004 §4.1 step 6 and the §8 "loading more" rows added to the amendments of §2. Q15–Q19 added. Status → Review; `plan_status` → Draft, §11 to be revised for Query, Table and Virtual after approval. |
| 1.5 | 2026-11-19 | Redesign from the owner's designs (n8n-style wide rows, mobile cards) and answers Q20–Q23. Wide screens: full-width rows with initials, name, e-mail, phone and a template badge, no column headers, an "Ordenar por" control (§4.1, §4.4). Narrow screens: cards under letter headings with e-mail, last-update date and template badge, search and status only, always A–Z, floating [Novo] button (§4.6). Sorts are now `name`, `-name`, `-updatedAt`; the e-mail sorts are dropped (R4, §6, §7, RF-09). `ClientSummary` gains `updatedAt` (R9, §7). Back to the top on any change (R8). The template badge returns to the rows; the template filter stays (Q21). Q9 superseded, Q17 withdrawn (no virtualization), Q24–Q29 proposed. AC-0006-08, -09, -23, -26, -28 to -32, -35, -40 and -41 reworded; AC-0006-53 to -65 added. Owner technical choice: TanStack Query only (§11 banner). Status stays Review; `plan_status` Draft. |
| 1.6 | 2026-11-20 | Spec review (2026-11-20) required changes 1–5 applied with the owner's picks. Q30: `updatedAt` means R9's time on the client's page too, so SPEC-0004 §7 "Client" is amended and the page and list agree (R9, §2, §7; AC-0006-69 added). §2 amendment list: SPEC-0004's v1.0 notes on R10, §4.1 step 2, §7 "List" and §8 "success" are rewritten, not added; §7 "Client" and "ClientSummary" listed separately; Decision 9 of SPEC-0004's plan noted. Q31: R10 defines narrow as under 48rem (RNF-16 `md`), wide otherwise; "desktop" and "mobile" removed. "Inativo" badge just before the template badge on rows and cards (R6, §4.1, §4.6, §8; AC-0006-66 and -67 added). Q8, Q13, Q16, Q18 and Q23–Q29 decided as proposed; AC-0006-68 added for Q18. Non-blocking review suggestions left as follow-ups. Status stays Review; `plan_status` Draft. |
| 1.7 | 2026-11-20 | Approved by Joao Izidoro, 2026-11-20, after the spec review and its re-check (both 2026-11-20), with all 69 criteria agreed. SPEC-0004 amended per §2 (its v1.7). `plan_status` stays Draft; `/plan` revises §11. |
