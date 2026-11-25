---
id: SPEC-0005
title: Cadastro de serviços
status: Approved # Draft | Review | Approved | Implemented | Superseded
plan_status: Approved # Draft | Approved
version: 1.7
owner: Joao Izidoro
satisfies: [RF-11, RF-12, RF-13, RN-02, RN-06, RN-24, RN-25]
depends_on: [SPEC-0001, SPEC-0002, SPEC-0003, SPEC-0004, SPEC-0006]
phase: MVP
ticket: -
---

# SPEC-0005 — Cadastro de serviços

## 1. Purpose

The professional keeps a catalog of the services they offer, each created from a service template. Later a client
and a service are linked in an appointment. This addresses RFC §2.2.3 (UC-12–UC-15). "Serviço" and "Procedimento"
are the same entity (RN-22). Template filling is shared with clients in SPEC-0003.

## 2. Scope

**In scope**
- `/services` list with name search, status and template filters, total, sorting and infinite scroll, as the
  client list (SPEC-0006), on wide screens.
- On narrow screens, the owner's mobile design (2026-11-24): template chips, sections by template, swipe actions,
  an actions menu, undo after archiving (R14, R15).
- The **[Novo]** dropdown: pick a service template, or "Criar novo modelo".
- Service system attributes: name, duration, price.
- View, edit, inactivate, reactivate and delete a service.
- The default "Serviço" template for each tenant (D-6).

**Out of scope**
- Linking services to appointments (RF-20) and to plans (RF-15, post-MVP).
- Currencies other than BRL, price variations, promotional prices: post-MVP.
- Online booking visibility of a service (RF-23): the public-link spec.
- Service ranking (RF-31): post-MVP.
- The app header's notification bell and avatar dot (notifications are post-MVP) and any change to the shared
  header (§9 Q20).
- The mobile design on `/clients`: SPEC-0006 stays as it is (§9 Q16).

**Dependencies and amendments**
- SPEC-0001, SPEC-0002, SPEC-0003, SPEC-0004 and SPEC-0006 are implemented. The service create, read and update
  endpoints carry the record shapes and checks of SPEC-0003 §6–§7.
- §4.2 and §4.4 reuse the client behavior of SPEC-0004 by reference; §4.1 reuses the client list of SPEC-0004 §4.1
  as amended by SPEC-0006 (§9 Q8).
- On approval, this spec amends SPEC-0001 §3.2: the default label of `service.duration` becomes "Duração" (§9
  Q12). SPEC-0001 gets the note "amended by SPEC-0005" there, a version bump and a changelog line. Templates that
  already exist keep their label.
- The template editor's name for the `duration` field type becomes "Duração" / "Duration" (copy only, §9 Q26).
- AC-0005-15, -55, -58, -84, -99, -101, -111 and -114 need a service linked to an appointment, which only scheduling can
  create. Until scheduling exists, the link can be seeded directly.

## 3. Domain rules

- **R1.** Every service belongs to one tenant and is created from one active `service` template (RN-06,
  SPEC-0003 R1).
- **R2.** **Name**: required, trimmed, repeated spaces collapsed, 1–80 characters. (RN-06)
- **R3.** Names are unique per tenant, ignoring case and accents, counting inactive services. (owner decision,
  §9 Q1)
- **R4.** **Duration**: required, whole minutes, 5–1,440, any minute value. (RN-06; owner decision, §9 Q2)
- **R5.** **Price**: required, BRL, at least R$ 0,00, at most R$ 999.999,99, with at most 2 decimals. R$ 0,00 is
  allowed (free trial session). Create and update requests send the currency, which must be "BRL". (RN-06;
  `api-convention.md`, Money; owner decisions, §9 Q3 and Q9)
- **R6.** A service is `active` or `inactive`. Inactive services are hidden from the default list and cannot be
  used in new appointments or plans, but remain viewable, editable and searchable with the status filter, and stay
  in history and reports. (RF-12, RN-06, RN-16; as SPEC-0004 R6)
- **R7.** A service can be deleted permanently only if it has no linked history (appointments, plans or financial
  records). Otherwise the delete is rejected with 409 `service.has-history`. The view page then offers only
  "Arquivar"; on a narrow row, "Excluir" shows the reason with an "Arquivar" action instead of a dialog (R15).
  (RF-12, RN-06, RN-24; owner decisions, §9 Q7, as for clients in SPEC-0004 §9 Q5, and §9 Q15)
- **R8.** Archiving (inactivating) a service takes effect at once, with no confirmation; a toast offers
  "Desfazer", which reactivates it (owner decision, §9 Q14). Deleting requires typing the service name, and the
  server checks it:
  the typed name is compared with the service's name after trimming leading and trailing spaces, otherwise exactly,
  as for templates (SPEC-0001 R9) and clients (SPEC-0004 R8). (RN-25)
- **R9.** The default sort is by name (ignoring case and accents), then by `id`. Search uses the query after
  trimming; a blank query means no filter. A query of 2 or more characters matches services whose name contains
  it, ignoring case and accents. A 1-character query is rejected. (RF-13; trimming and blank query as SPEC-0004 R9)
- **R10.** Every tenant has a service template named "Serviço" containing only the service system fields, from the
  moment the tenant exists. It is an ordinary template: editable, archivable and deletable under the same rules as
  any other template (SPEC-0001 R8). An existing tenant gets it only if it has no service template at all, active
  or archived, the name "Serviço" is not taken by a template of another type (SPEC-0001 R4), and the tenant has
  fewer than 200 templates (SPEC-0001 R19). Any other existing tenant is left alone. (owner decisions,
  forms-overview.md D-6, SPEC-0004 §9 Q11 and §9 Q11 here)
- **R11.** **List.** The services list follows SPEC-0006 R1–R10, with services in place of clients (owner decision,
  §9 Q8):
  - a template filter over the tenant's service templates, active or archived; a well-formed id that is unknown,
    of another tenant or not a service template returns an empty list with a total of 0 (SPEC-0006 R1, R2);
  - a total of the services matching the search and filters, on every page (SPEC-0006 R3);
  - sorts `name` (default, R9), `-name` and `-updatedAt`, each ending with `id` (SPEC-0006 R4), and `form`
    (template name, then service name, then `id`; ignoring case and accents) for the narrow "Todos" (R14);
  - a cursor bound to the search, the status filter, the template filter and the sort (SPEC-0006 R5);
  - infinite scroll with pages of at most 50, and back to the top when the search, a filter, the sort or the layout
    changes (SPEC-0006 R7, R8);
  - a service's last update time, set when it is created and changed on every edit saved, inactivation and
    reactivation (SPEC-0006 R9);
  - wide and narrow layouts split at 48rem (SPEC-0006 R10). Wide screens follow SPEC-0006; narrow screens
    follow R14 and R15 instead of SPEC-0006 §4.6 (§9 Q21).
- **R12.** **Duration display.** A duration shows as minutes under one hour ("45min"), whole hours ("2h"), or hours
  and minutes ("1h 30min"). (owner decision, §9 Q12)
- **R13.** **Duration input.** The duration field accepts, ignoring case and spaces: hours and minutes ("1h 30",
  "1h30", "1h 30min"), whole hours ("1h"), or minutes ("90", "90min"). When hours are given, the minutes are 0–59.
  Anything else is unreadable, for example "1:30", "1h 75", decimals ("1,5h", "90.5") or "abc". The edit page fills
  the field with the display form of R12 ("1h 30min"), which is itself an accepted input. (owner decisions, §9 Q12
  and 2026-11-24 spec re-check)
- **R14.** **Narrow list.** On narrow screens `/services` follows the owner's mobile design (§9 Q13):
  - the title "Procedimentos/Consultas"; a search icon opens the name search of R9, which applies within the
    active chip (§9 Q20);
  - a horizontally scrollable row of chips: "Todos" (default), then one chip per service template, active or
    archived, that has at least one active service, by template name, then "Arquivados" when the tenant has at
    least one archived service. Exactly one chip is active. When the active chip disappears (its last service was
    archived, reactivated or deleted), "Todos" becomes active. While the chips load, "Todos" shows followed by
    placeholder chips; if they fail to load, "Todos" shows followed by a "Tentar novamente" chip that loads them
    again, and the list keeps working under "Todos" (§9 Q25);
  - "Todos" lists the active services grouped by template: a section header with the template's name, sections
    by template name, services by name within them (sort `form`). A section header is not repeated when the
    next page continues the same template. A template chip lists only that template's active services, by
    name, with no header. "Arquivados" lists the archived services, by name, with no header;
  - each row shows a status dot (one color for active, a muted one for archived, §9 Q17), the name, the duration
    (R12, §9 Q18) and the price ("R$ 150,00");
  - there is no status filter, template picker, sort control or total; infinite scroll and the closing block
    follow R11;
  - the floating "+" opens the fill-in page of the active chip's template when that template is active, or the
    [Novo] menu under "Todos", "Arquivados" and the chip of an archived template (§9 Q19, Q24).
- **R15.** **Row actions (narrow).** Swiping a row left reveals "Arquivar" and "Excluir" (red, with a trash
  icon); on an archived row, "Reativar" and "Excluir". The row snaps open when dragged past half the width of its
  actions or flicked fast; otherwise it snaps closed. Only one row is open at a time; tapping elsewhere or
  scrolling closes it. Vertical scrolling keeps working over the rows. A "⋯" button on each row, or a long press,
  opens a menu with the same actions. "Excluir" on a service with history opens no dialog and sends no request:
  the row snaps closed and a toast gives the reason, with an "Arquivar" action on an active row and no action on
  an archived one (R7). (owner design, §9 Q13, Q15 and Q23)
- **R16.** **Wording.** The services UI calls inactivating "Arquivar", an inactive service "Arquivado" and the
  inactive filter "Arquivados", on every screen. The contract keeps `inactive` (§7). (§9 Q22)

## 4. Behavior

### 4.1 List (`/services`)
On wide screens, SPEC-0004 §4.1 as amended by SPEC-0006 §4.1–§4.5 applies, with services in place of clients
(R11). Narrow screens follow R14 and R15 instead of SPEC-0006 §4.6. On both:
1. **Row content.** A wide-screen row shows the service's initials, its name (which opens the service view page,
   SPEC-0003 §4.2), below the name its duration (R12) and price ("R$ 150,00") in a quieter style, and the template
   badge on the right. An archived service carries the "Arquivado" badge just before the template badge (R16).
   A narrow row is described in R14; tapping it opens the view page.
2. **Search** matches the name only (R9). The hint for a short query is "Digite ao menos 2 caracteres para buscar."
3. **Total** (wide): "1 serviço" / "12 serviços".
4. **Template filter** (wide): the "Modelo" control lists the tenant's service templates. The status filter reads
   "Ativos", "Arquivados" and "Todos" (R16).
5. **Messages**: "Carregando mais serviços…", "Não foi possível carregar mais serviços.", and the closing block "Isso
   é tudo! Não há mais serviços por aqui."
6. **Narrow screens**: the floating "+" button is named "Novo serviço"; what it opens is R14.
7. **Title**: "Procedimentos/Consultas" on every screen (§9 Q22).

### 4.2 [Novo] dropdown
Same as SPEC-0004 §4.2, with active `service` templates and type `service` locked in the editor shortcut.

### 4.3 Create, view and edit
These follow SPEC-0003 §4.1–§4.3, plus R2–R5. The duration field is labelled "Duração" (§2, amendment of
SPEC-0001 §3.2). It accepts the forms of R13 and stores minutes; the edit page fills it as R13 says. The view page
shows the duration as R12. An unreadable duration (R13), or one outside R4, shows the inline error of
`serviceDuration.invalid` under Duração and sends no request (SPEC-0003 §4.1 step 4). Price is typed with a pt-BR mask ("150,00");
the page sends it with currency "BRL".

### 4.4 Archive, reactivate and delete
SPEC-0004 §4.4–§4.5 apply with service wording (R16), except (R7, R8, R15):
1. **Arquivar**, on the view page or a narrow row, takes effect at once, with no dialog. The service becomes
   inactive and its narrow row leaves the current chip. The toast "Serviço arquivado" offers "Desfazer", which
   reactivates it. While the request runs, the control is disabled; if it fails, an error toast appears and the
   service keeps its status. A 409 `service.status-unchanged` reloads the service (or the list) with the toast
   "O status deste serviço já foi alterado."
2. **Reativar**, on the view page or an archived narrow row, works as SPEC-0004 §4.4 step 2; the narrow row leaves
   "Arquivados".
3. **Excluir** opens the typed-name dialog (R8). On a narrow row whose service has history, it opens no dialog: the
   row snaps closed and the toast "Serviços já utilizados não podem ser excluídos." offers "Arquivar" (no action
   on an archived row, R15). If a delete
   returns 409 `service.has-history`, the dialog closes and the same toast appears; a narrow row snaps closed, and
   the view page reloads offering only "Arquivar".
4. A successful delete removes the narrow row, or returns from the view page to `/services`, with the toast
   "Serviço excluído".

The view page's delete hint is "Serviços já utilizados não podem ser excluídos". The server checks the typed name
(R8).
Services are also deleted when their template is deleted with "Sim, excluir tudo" (SPEC-0001 §4.6). That option is
offered only when no service of the template has linked history (R7). If any of them has, the template can only be
archived, and no service is deleted (SPEC-0001 R8).

## 5. Permissions and tenant isolation

| Action | Unauthenticated | Member | Owner | Other tenant |
| --- | --- | --- | --- | --- |
| List / search services | 401 | — (post-MVP) | 200, own tenant only | 404 `tenant.not-found` |
| List with another tenant's template as filter | 401 | — | 200, empty list, total 0 (R11) | — |
| Create service | 401 | — | 201 | 400 `formId.invalid` (SPEC-0003) |
| Read / update service | 401 | — | 200 | 404 `service.not-found` |
| Inactivate / reactivate | 401 | — | 200 | 404 `service.not-found` |
| Delete service | 401 | — | 204 | 404 `service.not-found` |

Name uniqueness (R3) is per tenant. Another tenant using the same name is never revealed.

A tenant context without membership returns 404 `tenant.not-found`. Every action above is tenant-scoped and
follows `api-convention.md`, Tenant context: a request without tenant context returns 400 `tenant.required`, and a
request whose active tenant is inactive (suspended) returns 403 `tenant.inactive`.

## 6. Errors

Template, template-version, revision and custom-field value errors are in SPEC-0003 §6.

| Situation | Status | `error` key | `field` |
| --- | --- | --- | --- |
| Name missing or blank | 422 | `serviceName.required` | `name` |
| Name over 80 characters | 422 | `serviceName.max` | `name` |
| Name used by another service of the tenant, active or inactive | 409 | `serviceName.taken` | `name` |
| Duration missing | 422 | `serviceDuration.required` | `durationMinutes` |
| Duration not a whole number in 5–1,440 | 422 | `serviceDuration.invalid` | `durationMinutes` |
| Price missing | 422 | `servicePrice.required` | `priceCents` |
| Price negative | 422 | `servicePrice.negative` | `priceCents` |
| Price above the maximum or not an integer | 422 | `servicePrice.invalid` | `priceCents` |
| Currency missing | 422 | `serviceCurrency.required` | `currency` |
| Currency anything but `"BRL"` | 422 | `serviceCurrency.invalid` | `currency` |
| Service unknown, malformed service id, or service of another tenant | 404 | `service.not-found` | — |
| Delete with the typed name missing or wrong (R8) | 400 | `deleteConfirmation.required` | `confirmName` |
| Delete with linked history | 409 | `service.has-history` | — |
| Inactivate an inactive / reactivate an active service | 409 | `service.status-unchanged` | — |
| Search query of 1 character after trimming | 422 | `serviceSearch.min` | `q` |
| `status` filter not `active`, `inactive` or `all` | 422 | `serviceStatus.invalid` | `status` |
| Template filter that is not a well-formed template id | 422 | `formId.invalid` (existing, SPEC-0003 §6) | `formId` |
| Sort that is not one of `name`, `-name`, `-updatedAt`, `form` | 422 | `serviceSort.invalid` | `sort` |
| `limit` outside 1–100 or not an integer | 422 | `limit.invalid` | `limit` |
| Cursor malformed, or issued for another search, status, template filter or sort | 422 | `cursor.invalid` | `after` |

**Check order for create and update.** Service checks run inside the order of SPEC-0003 §6. After its steps 1–4
(request shape, template or record, template version, revision), the checks run in this order, and the first
failure is the response (as SPEC-0004 §6; SPEC-0003 G-8):
1. Name, then duration, then price, then currency (`serviceName.*`, `serviceDuration.*`, `servicePrice.*`,
   `serviceCurrency.*`).
2. Custom values (SPEC-0003 §6 step 5).
3. `serviceName.taken`, last, because it needs the database.

So a blank name together with an invalid custom value returns `serviceName.required`.

**Other actions.** Delete: 404 `service.not-found`, then 400 `deleteConfirmation.required`, then 409
`service.has-history`, as for templates (SPEC-0001 §6) and clients (SPEC-0004 §6). Inactivate and reactivate: 404,
then 409 `service.status-unchanged`. List: `q`, `status`, `formId`, `sort`, `limit`, then `after` (as SPEC-0006 §6).

## 7. Contract impact

New, non-breaking. Consumers: `apps/web`; later the scheduling module.

- **Service** (response): `id`, `form` (`{ id, name, version, latestVersion, status }`), `revision` (int, SPEC-0003
  R14), `name`, `durationMinutes` (int), `priceCents` (int, centavos), `currency` (`"BRL"`), `values`,
  `missingRequired`, `status` (`active | inactive`), `hasHistory` (bool), `createdAt`, `updatedAt` (the last update
  time of R11, the same value the list reports).
- **ServiceSummary** (list item): `id`, `name`, `durationMinutes`, `priceCents`, `currency`, `formId`, `formName`,
  `status`, `updatedAt` (ISO-8601 UTC), `hasHistory` (bool, R15). `formName` feeds the template badge and the
  narrow section headers.
- **List**: query `q?` (trimmed; blank means no filter, R9), `status?` (`active` default, `inactive`, `all`),
  `formId?` (template filter, R11), `sort?` (`name` default, `-name`, `-updatedAt`, `form`), `limit?`, `after?`
  (`api-convention.md`, Pagination). Response `{ services: ServiceSummary[], nextCursor: string | null, total:
  number }`.
- **Service template summary** (the narrow chips, R14): `{ templates: { id, name, status, activeCount }[],
  archivedCount }` — the tenant's service templates, active or archived (`status`: `active | archived`), with at
  least one active service, by name, and the number of archived services. Read-only, tenant-scoped; its path is
  set in `/plan`.
- **Create request**: `formId`, `formVersion`, `name`, `durationMinutes`, `priceCents`, `currency` (`"BRL"`),
  `values`.
- **Update request**: `revision`, `formVersion`, `name`, `durationMinutes`, `priceCents`, `currency` (`"BRL"`),
  `values` (SPEC-0003 §7 semantics).
- **Inactivate / reactivate**: no body; response 200 with the full Service.
- **Delete**: body `{ confirmName }` (R8); response 204.
- Endpoint paths and verbs for inactivate, reactivate and delete are set in `/plan`, as for clients.
- **Money**: `priceCents` is an integer in centavos (`9999` = R$ 99,99) with `currency` beside it, in requests and
  responses, per `api-convention.md`, Money. It is the first monetary field in the contracts.
- The status value `inactive` is final in the contract. How it maps to `schema.dbml` `services.status`
  (`record_status`: `active | suspended | deleted`) is decided in `/plan`, as for clients (SPEC-0004 §9 Q3). So is
  how `priceCents` maps to `services.price` (`numeric(10,2)`).
- `schema.dbml` `services.price` is nullable and `duration_minutes` nullable; RN-06 makes both required. Fix in
  data modelling.

## 8. UI states

| Screen | State | Behavior | Copy key |
| --- | --- | --- | --- |
| `/services` | loading | Skeleton rows; no total | `services.list.loading` |
| `/services` | empty (no services at all) | "Nenhum serviço cadastrado." + [Novo]; no total | `services.list.empty` |
| `/services` | empty under the chosen filters | "Nenhum serviço com este filtro." (status or template); no total | `services.list.emptyFilter` |
| `/services` | no search results | "Nenhum serviço encontrado para “<q>”."; no total | `services.list.noResults` |
| `/services` | search too short | Hint "Digite ao menos 2 caracteres para buscar."; no request | `services.list.searchHint` |
| `/services` | error | "Não foi possível carregar os serviços." + retry; no total | `services.list.error` |
| `/services` | success, wide screen | Full-width rows: initials, name, duration and price, template badge on the right (4.1); total above them | `services.list.title`, `services.list.count` |
| `/services` | success, narrow screen | Title, search icon, chips; rows with status dot, name, duration, price; section headers under "Todos" (R14); no total | `services.list.title`, `services.list.chips.all`, `services.list.chips.archived`, `services.list.searchOpen` |
| `/services` | chips loading (narrow) | "Todos" followed by placeholder chips (R14) | `services.list.chips.loading` |
| `/services` | chips failed (narrow) | "Todos" followed by "Tentar novamente", which loads the chips again; the list keeps working under "Todos" (R14) | `services.list.chips.retry` |
| `/services` | archived service (wide) | "Arquivado" badge just before the template badge | `services.list.inactiveBadge` |
| `/services` | template filter (wide) | "Modelo" control with "Todos os modelos" and each service template; archived ones followed by "(arquivado)"; shown only with two or more service templates | `services.list.filter.form`, `services.list.filter.allForms`, `services.list.filter.archivedForm` |
| `/services` | sort (wide) | "Ordenar por" control with "Nome (A–Z)", "Nome (Z–A)", "Última atualização" | `services.list.sort.label`, `services.list.sort.nameAsc`, `services.list.sort.nameDesc`, `services.list.sort.updatedAt` |
| `/services` | narrow screen | No status filter, template picker, sort control or total; floating "+" opens the active chip's template or [Novo] (R14) | `services.new.floating` |
| Narrow row | swiped open | "Arquivar" (or "Reativar") and "Excluir" revealed; one row open at a time (R15) | `services.actions.archive`, `services.actions.reactivate`, `services.actions.delete` |
| Narrow row | actions menu | "⋯" button or long press opens a menu with the same actions | `services.actions.menu` |
| Narrow row | "Excluir" on a service with history | No dialog; row snaps closed; toast with the reason and "Arquivar" (4.4 step 3) | `services.delete.hasHistory`, `services.actions.archive` |
| `/services` | loading the next page | Indicator below the rows, "Carregando mais serviços…" | `services.list.loadingMore` |
| `/services` | next page failed | Rows kept; "Não foi possível carregar mais serviços." + retry; no automatic request until retry | `services.list.loadMoreError` |
| `/services` | end of list | Illustration (decorative) and "Isso é tudo! Não há mais serviços por aqui." below the last row | `services.list.end` |
| `/services` | next page loaded | Polite announcement of loaded / total, focus unchanged | `services.list.loadedCount` |
| [Novo] dropdown | no templates | Only "Criar novo modelo" + hint | `services.new.noTemplates` |
| Fill-in / view / edit | all states | As SPEC-0003 §8, with service wording | `services.form.*`, `services.view.*` |
| Fill-in | name taken | Inline under Nome | `validation.serviceName.taken` |
| Fill-in | duration unreadable or out of range | Inline under Duração; no request | `validation.serviceDuration.invalid` |
| Arquivar | done | No dialog; toast "Serviço arquivado" with "Desfazer" (4.4 step 1) | `services.toast.archived`, `services.toast.undo` |
| Arquivar / Reativar | in progress | Control disabled with spinner | `services.inactivate.inProgress`, `services.reactivate.inProgress` |
| Arquivar / Reativar | failed | Error toast; status kept | `services.inactivate.error`, `services.reactivate.error` |
| Arquivar / Reativar | status already changed (409) | Service reloaded + toast "O status deste serviço já foi alterado." | `services.status.unchanged` |
| Delete dialog | confirm | Typed name enables [Excluir] | `services.delete.confirm` |
| Delete dialog | in progress | [Excluir] disabled with spinner | `services.delete.inProgress` |
| Delete dialog | failed | Error toast; service kept | `services.delete.error` |
| Delete dialog | history found on delete (409) | Dialog closes; the view page reloads with only "Arquivar" + hint; a narrow row snaps closed with the toast of 4.4 step 3 | `services.delete.hasHistory` |
| Delete action | disabled (history) | Hint (4.4) | `services.delete.hasHistory` |
| Toasts | created / saved / archived / reactivated / deleted | — | `services.toast.*` |

Copy specific to services (other list copy as SPEC-0006 §8, under `services.*`):
- `services.list.count`: "{count, plural, one {# serviço} other {# serviços}}" / "{count, plural, one {# service}
  other {# services}}"
- `services.list.loadingMore`: "Carregando mais serviços…" / "Loading more services…"
- `services.list.end`: "Isso é tudo! Não há mais serviços por aqui." / "That's all! No more services here."
- `services.list.loadedCount`: "{loaded} de {total} serviços carregados" / "{loaded} of {total} services loaded"
- `services.new.floating`: "Novo serviço" / "New service"
- `validation.serviceSort.invalid`: "Ordenação inválida." / "Invalid sort."
- `services.list.title`: "Procedimentos/Consultas" / "Procedures/Consultations"
- `services.list.chips.all`: "Todos" / "All"; `services.list.chips.archived`: "Arquivados" / "Archived"
- `services.list.searchOpen`: "Buscar" / "Search" (the search icon's accessible name)
- `services.list.inactiveBadge`: "Arquivado" / "Archived"; the status filter's inactive option: "Arquivados" /
  "Archived"
- `services.actions.archive`: "Arquivar" / "Archive"; `.reactivate`: "Reativar" / "Reactivate"; `.delete`:
  "Excluir" / "Delete"; `.menu`: "Mais ações" / "More actions"
- `services.toast.archived`: "Serviço arquivado" / "Service archived"; `services.toast.undo`: "Desfazer" / "Undo"
- `services.delete.hasHistory`: "Serviços já utilizados não podem ser excluídos." / "Services already in use
  cannot be deleted."
- `services.list.chips.loading`: "Carregando modelos…" / "Loading templates…" (announced, not shown);
  `services.list.chips.retry`: "Tentar novamente" / "Try again"
- `forms.fields.types.duration`: "Duração" / "Duration" (was "Duração (minutos)" / "Duration (minutes)"; §9 Q26)

## 9. Open questions

| # | Question | Answer | Blocks |
| --- | --- | --- | --- |
| 1 | ~~Should service names be unique per tenant (R3)? The RFC does not say.~~ | **Decided (owner, 2026-11-24):** yes, ignoring case and accents, counting inactive services (R3). | — |
| 2 | ~~Duration bounds 5–1,440 minutes, any minute value?~~ | **Decided (owner, 2026-11-24):** yes; no 5-minute step (R4). | — |
| 3 | ~~Price R$ 0,00 allowed? Upper bound?~~ | **Decided (owner, 2026-11-24):** yes; max R$ 999.999,99 (R5). | — |
| 4 | ~~Money representation.~~ | **Decided (D-9):** `priceCents` + `currency` (`api-convention.md`, Money). | — |
| 5 | ~~Default "Serviço" template.~~ | **Decided (D-6):** yes. | — |
| 6 | ~~Should the service "description" (in `schema.dbml`) be a system field?~~ | **Decided in SPEC-0001 §3.2:** no. The service system fields are name, duration and price; a description is a custom long-text field when wanted. | — |
| 7 | ~~RF-12 says deleting a service with links "resulta em inativação". Should the API instead return 409 and the UI offer only "Inativar"?~~ | **Decided (owner, 2026-11-24, no preference stated; the proposed answer was taken):** yes, as for clients (SPEC-0004 §9 Q5) (R7). **Confirmed explicitly by the owner at approval, 2026-11-24.** | — |
| 8 | ~~Should `/services` follow the SPEC-0006 list pattern (SPEC-0006 Q19)?~~ | **Decided (owner, 2026-11-24):** yes (R11, §4.1, §7, §8). SPEC-0006 joins `depends_on`. | — |
| 9 | ~~Should create and update requests carry `currency`?~~ | **Decided (owner, 2026-11-24):** yes, required, only `"BRL"` (R5, §6, §7). | — |
| 10 | ~~`inUse` / `service.in-use` or SPEC-0004's `hasHistory` / `has-history`?~~ | **Decided (owner, 2026-11-24):** match SPEC-0004: `hasHistory`, `service.has-history`, `services.delete.hasHistory`. | — |
| 11 | ~~The "Serviço" backfill when the name is taken by a client template or the tenant has 200 templates.~~ | **Decided (owner, 2026-11-24):** leave that tenant alone (R10). | — |
| 12 | ~~Duration label "Duração (minutos)" (SPEC-0001 §3.2) vs typed "1h 30"; display format.~~ | **Decided (owner, 2026-11-24):** label "Duração" (amends SPEC-0001 §3.2 on approval, §2); input "1h 30", "1h" or minutes; display "45min", "2h", "1h 30min" (§4.3, R12). The full list of accepted inputs and the edit page's prefill were decided at the spec re-check (owner, 2026-11-24; R13). | — |
| 13 | ~~The owner's mobile Services design (2026-11-24) conflicts with the approved narrow layout (SPEC-0006 §4.6).~~ | **Decided (owner, 2026-11-24):** amend this spec now. Narrow screens get chips (one per template with active services, plus "Todos" and "Arquivados"), sections by template under "Todos", the row of R14, swipe actions, the actions menu and the toasts (R14, R15). | — |
| 14 | ~~R8 asked for a confirmation before inactivating; the design archives at once with "Desfazer".~~ | **Decided (owner, 2026-11-24):** archive at once, undo in the toast, on every screen (R8, §4.4). | — |
| 15 | ~~RN-25 requires typing the name before a permanent delete; the design swipes to "Excluir".~~ | **Decided (owner, 2026-11-24):** "Excluir" opens the typed-name dialog; a service with history shows the toast with "Arquivar" and no dialog (R7, R15). | — |
| 16 | ~~Apply the mobile design to `/clients` too?~~ | **Decided (owner, 2026-11-24):** services only; `/clients` keeps SPEC-0006. | — |
| 17 | ~~Meaning of the row's status dot.~~ | **Decided (owner, 2026-11-24):** active vs archived (R14). | — |
| 18 | ~~Duration on the narrow row: R12 or "80 min"?~~ | **Decided (owner, 2026-11-24):** R12 ("1h 20min"); the mock's text is a placeholder. | — |
| 19 | ~~Which template the floating "+" creates from.~~ | **Decided (owner, 2026-11-24):** the active chip's template; the [Novo] menu under "Todos" and "Arquivados" (R14). | — |
| 20 | ~~The header's search icon, bell and avatar dot.~~ | **Decided (owner, 2026-11-24):** only the search icon, which opens the name search on `/services`; the bell, the dot and the shared header are out of scope (§2). | — |
| 21 | ~~Wide screens under the mobile design.~~ | **Decided (owner, 2026-11-24):** wide screens keep SPEC-0006's rows, status filter, template picker, sort and total; only the actions change (R8, §4.4). | — |
| 22 | ~~Details the design leaves open, filled in by this amendment: "Arquivar" / "Arquivado" / "Arquivados" on every screen, not only on narrow ones (R16); "Reativar" in place of "Arquivar" on archived narrow rows (R15); chips ordered by template name; the "Arquivados" chip shown only when an archived service exists, and "Todos" active again when the active chip disappears (R14); the title "Procedimentos/Consultas" on every screen, while the sidebar keeps "Serviços" (§4.1).~~ | **Confirmed by the owner at approval, 2026-11-24.** | — |
| 23 | ~~R15's history toast offers "Arquivar" on an archived row too, whose service is already archived.~~ | **Decided (owner, 2026-11-24, plan review follow-up 7a):** on an archived row the toast has no action; active rows keep "Arquivar" (R15, §4.4). | — |
| 24 | ~~The chip of an archived template: new services need an active template, so what does the floating "+" open?~~ | **Decided (owner, 2026-11-24, follow-up 7b):** the [Novo] menu, as under "Todos"; the template summary carries each template's status (R14, §7). | — |
| 25 | ~~What the chips show while they load, and when they fail.~~ | **Decided (owner, 2026-11-24, follow-up 7c):** "Todos" plus placeholder chips while loading; "Todos" plus a "Tentar novamente" chip on failure, with the list still working under "Todos" (R14, §8). | — |
| 26 | ~~The template editor names the `duration` type "Duração (minutos)", though R13 accepts hours.~~ | **Decided (owner, 2026-11-24, follow-up 7d):** "Duração" / "Duration" (§2, §8). | — |

## 10. Acceptance criteria

### Agreed criteria

These follow from the RFC or from decisions the owner has taken (forms-overview.md §3 and §9 of this spec). In API
criteria, "a valid price" means priceCents 15000 with currency "BRL".

```
AC-0005-01
Given a tenant "studio-ana" that was just created
When  its owner opens the Novo dropdown on /services
Then  it shows "Criar novo modelo" followed by one template, "Serviço"
```

```
AC-0005-02
Given tenant "studio-ana" with active service templates "Serviço" and "Sessão", an archived service template "Antigo", and an active client template "Ficha"
When  its owner opens the Novo dropdown on /services
Then  it lists "Criar novo modelo", then "Serviço", "Sessão" in that order, and nothing else
```

```
AC-0005-03
Given an owner of "studio-ana"
When  they create a service from template "Serviço" with name "Sessão individual", durationMinutes 90, priceCents 15000 and currency "BRL"
Then  the response is 201 with name "Sessão individual", durationMinutes 90, priceCents 15000, currency "BRL", status "active"
```

```
AC-0005-04
Given an owner of "studio-ana"
When  they create a service from template "Serviço" with name "   " and a valid duration and price
Then  the response is 422 with { "error": "serviceName.required", "field": "name" }
```

```
AC-0005-05
Given tenant "studio-ana" with an inactive service "Sessão individual"
When  its owner creates a service named "sessao  individual"
Then  the response is 409 with { "error": "serviceName.taken", "field": "name" }
```

```
AC-0005-06
Given tenant "studio-bia" has a service "Sessão individual"
When  the owner of "studio-ana" creates a service named "Sessão individual"
Then  the response is 201
```

```
AC-0005-07
Given an owner creating a service
When  they submit durationMinutes 4
Then  the response is 422 with { "error": "serviceDuration.invalid", "field": "durationMinutes" }
```

```
AC-0005-08
Given an owner creating a service
When  they submit durationMinutes 1441
Then  the response is 422 with { "error": "serviceDuration.invalid", "field": "durationMinutes" }
```

```
AC-0005-09
Given an owner creating a service
When  they submit priceCents -1
Then  the response is 422 with { "error": "servicePrice.negative", "field": "priceCents" }
```

```
AC-0005-10
Given an owner creating a service
When  they submit priceCents 0
Then  the response is 201 with priceCents 0
```

```
AC-0005-11
Given an owner creating a service
When  they submit priceCents 100000000 (R$ 1.000.000,00)
Then  the response is 422 with { "error": "servicePrice.invalid", "field": "priceCents" }
```

```
AC-0005-12
Given services "Avaliação", "sessão" and "Retorno"
When  the owner opens /services
Then  they are listed in the order "Avaliação", "Retorno", "sessão"
```

```
AC-0005-13
Given an active service "Sessão individual"
When  the owner archives it
Then  the response is 200 with status "inactive"
And   it no longer appears in /services with the default filter
And   on a wide screen it appears with the "Arquivado" badge with copy key services.list.inactiveBadge under the "Arquivados" filter
```

```
AC-0005-14
Given a service without linked history
When  the owner types its name in the delete dialog and confirms
Then  the response is 204
And   reading it returns 404 with { "error": "service.not-found" }
```

```
AC-0005-15
Given a service "Sessão individual" with one linked appointment
When  the owner sends a delete request with confirmName "Sessão individual"
Then  the response is 409 with { "error": "service.has-history" }
And   the service still exists
```

```
AC-0005-16
Given a service of tenant "studio-bia"
When  the owner of "studio-ana" reads, updates, inactivates, reactivates or deletes it with "studio-ana" as active tenant
Then  each response is 404 with { "error": "service.not-found" }
And   the service in "studio-bia" is unchanged
```

```
AC-0005-17
Given a request with no access token
When  it lists or creates services
Then  the response is 401
```

```
AC-0005-18
Given tenant "studio-ana" with no services
When  its owner opens /services
Then  the empty state with copy key services.list.empty and a Novo button is shown
```

```
AC-0005-19
Given tenant "studio-ana" with 60 active services
When  its owner lists services with limit 25, then twice more passing each nextCursor as after
Then  the pages hold 25, 25 and 10 services in name order, with nextCursor null on the last page
```

```
AC-0005-20
Given the owner on the fill-in page of template "Serviço" with a valid name and duration
When  they type "150,00" in the price field and press Salvar
Then  the create request carries priceCents 15000 and currency "BRL"
```

```
AC-0005-21
Given services "Avaliação", "sessão" and "Retorno"
When  the owner searches /services for "SESSAO"
Then  the result lists only "sessão"
```

```
AC-0005-22
Given an owner of "studio-ana"
When  they create a service from template "Serviço" with name "  Sessão   individual " and a valid duration and price
Then  the response is 201 with name "Sessão individual"
```

```
AC-0005-23
Given an owner of "studio-ana"
When  they create a service from template "Serviço" with a name of 81 characters and a valid duration and price
Then  the response is 422 with { "error": "serviceName.max", "field": "name" }
```

```
AC-0005-24
Given an owner of "studio-ana"
When  they create a service from template "Serviço" with a valid name and price and no durationMinutes
Then  the response is 422 with { "error": "serviceDuration.required", "field": "durationMinutes" }
```

```
AC-0005-25
Given an owner of "studio-ana"
When  they create a service from template "Serviço" with a valid name and price and durationMinutes 90.5
Then  the response is 422 with { "error": "serviceDuration.invalid", "field": "durationMinutes" }
```

```
AC-0005-26
Given an owner of "studio-ana"
When  they create a service from template "Serviço" with a valid name and duration, currency "BRL" and no priceCents
Then  the response is 422 with { "error": "servicePrice.required", "field": "priceCents" }
```

```
AC-0005-27
Given an owner of "studio-ana"
When  they create a service from template "Serviço" with a valid name and duration, currency "BRL" and priceCents 15000.5
Then  the response is 422 with { "error": "servicePrice.invalid", "field": "priceCents" }
```

```
AC-0005-28
Given a service "Sessão individual" with durationMinutes 90 and priceCents 15000
When  the owner updates it with name "Sessão dupla", durationMinutes 120, priceCents 25000 and currency "BRL"
Then  the response is 200 with name "Sessão dupla", durationMinutes 120 and priceCents 25000
And   reading the service returns the same values
```

```
AC-0005-29
Given an inactive service "Sessão individual"
When  the owner reactivates it
Then  the response is 200 with status "active"
```

```
AC-0005-30
Given an inactive service "Sessão individual"
When  the owner inactivates it
Then  the response is 409 with { "error": "service.status-unchanged" }
```

```
AC-0005-31
Given a service "Sessão individual" without linked history
When  the owner sends a delete request with confirmName "Sessão"
Then  the response is 400 with { "error": "deleteConfirmation.required", "field": "confirmName" }
And   the service still exists
```

```
AC-0005-32
Given the owner in the delete dialog of service "Sessão individual"
When  they type "Sessão"
Then  Excluir is disabled
```

```
AC-0005-33
Given tenant "studio-bia" has a service "Pilates" and tenant "studio-ana" has a service "Sessão individual"
When  the owner of "studio-ana" lists services with status all, and then searches for "Pilates"
Then  the list holds only "Sessão individual"
And   the search returns no services
```

```
AC-0005-34
Given tenant "studio-bia" has an active service template "Pilates"
When  the owner of "studio-ana" creates a service from that template with "studio-ana" as active tenant
Then  the response is 400 with { "error": "formId.invalid", "field": "formId" }
And   no service is stored
```

```
AC-0005-35
Given tenant "studio-ana" with an active client template "Cliente"
When  its owner creates a service from "Cliente"
Then  the response is 422 with { "error": "formType.mismatch", "field": "formId" }
```

```
AC-0005-36
Given a user who owns "studio-ana" and has no membership in "studio-bia"
When  they list services with "studio-bia" as tenant context
Then  the response is 404 with { "error": "tenant.not-found" }
```

```
AC-0005-37
Given a request with no access token
When  it reads, updates, inactivates, reactivates or deletes a service
Then  each response is 401
```

```
AC-0005-38
Given an authenticated owner
When  they list services without a tenant context
Then  the response is 400 with { "error": "tenant.required" }
```

```
AC-0005-39
Given tenant "studio-ana" is suspended
When  its owner lists services
Then  the response is 403 with { "error": "tenant.inactive" }
```

```
AC-0005-40
Given an owner listing services
When  the request has q "a"
Then  the response is 422 with { "error": "serviceSearch.min", "field": "q" }
```

```
AC-0005-41
Given active services "Avaliação" and "Retorno"
When  the owner lists services with q "   "
Then  the response is 200 and lists both services
```

```
AC-0005-42
Given an owner listing services
When  the request has limit 101
Then  the response is 422 with { "error": "limit.invalid", "field": "limit" }
```

```
AC-0005-43
Given a nextCursor returned for a search with q "ava"
When  the owner lists services with q "ret" and that cursor as after
Then  the response is 422 with { "error": "cursor.invalid", "field": "after" }
```

```
AC-0005-44
Given an owner listing services
When  the request has status "deleted"
Then  the response is 422 with { "error": "serviceStatus.invalid", "field": "status" }
```

```
AC-0005-45
Given an owner of "studio-ana"
When  they read a service with id "abc"
Then  the response is 404 with { "error": "service.not-found" }
```

```
AC-0005-46
Given an existing tenant "studio-ana" with no service template, active or archived
When  the "Serviço" backfill runs
Then  "studio-ana" has a service template "Serviço" with only the service system fields
```

```
AC-0005-47
Given an existing tenant "studio-ana" whose only service template is the archived "Sessão"
When  the "Serviço" backfill runs
Then  "studio-ana" still has only the service template "Sessão"
```

```
AC-0005-48
Given an owner opening /services before the list has loaded
When  the page renders
Then  it shows skeleton rows with copy key services.list.loading
```

```
AC-0005-49
Given an owner on /services
When  the service list request fails with 500
Then  the error state with copy key services.list.error and a retry control is shown
```

```
AC-0005-50
Given services "Avaliação" and "Retorno"
When  the owner searches /services for "zzz"
Then  the page shows the state with copy key services.list.noResults, naming "zzz"
```

```
AC-0005-51
Given tenant "studio-ana" with no active service templates
When  its owner opens the Novo dropdown on /services
Then  it shows only "Criar novo modelo" and the hint with copy key services.new.noTemplates
```

```
AC-0005-52
Given an owner on /services
When  they type "a" in the search box
Then  no search request is sent
And   the hint with copy key services.list.searchHint is shown
```

```
AC-0005-53
Given tenant "studio-ana" whose only service "Sessão individual" is inactive
When  its owner opens /services with the default filter
Then  the page shows the state with copy key services.list.emptyFilter, not services.list.empty
```

```
AC-0005-54
Given tenant "studio-ana" with 120 active services and the first 50 shown on /services
When  the next page is requested and the request fails with 500
Then  the page shows copy key services.list.loadMoreError with a retry control
And   the first 50 services are still shown
```

```
AC-0005-55
Given a service "Sessão individual" with one linked appointment
When  the owner opens the service's view page
Then  no "Excluir" action is offered
And   "Arquivar" is offered with the hint with copy key services.delete.hasHistory
```

```
AC-0005-56
Given the owner on the fill-in page of template "Serviço" with a valid name and price
When  they type "1h 30" in the duration field and press Salvar
Then  the create request carries durationMinutes 90
```

```
AC-0005-57
Given a service "Sessão individual" from template "Serviço" with durationMinutes 90 and priceCents 15000
When  the owner opens /services on a wide screen
Then  its row shows "Sessão individual", "1h 30min", "R$ 150,00" and the template badge "Serviço"
```

```
AC-0005-58
Given a service "Sessão individual" with one linked appointment and a service "Avaliação" with none
When  the owner reads each of them
Then  "Sessão individual" has hasHistory true and "Avaliação" has hasHistory false
```

```
AC-0005-59
Given an existing tenant "studio-ana" with no service template and a client template named "Serviço"
When  the "Serviço" backfill runs
Then  "studio-ana" still has no service template
And   its client template "Serviço" is unchanged
```

```
AC-0005-60
Given an existing tenant "studio-ana" with no service template and 200 client templates
When  the "Serviço" backfill runs
Then  "studio-ana" still has no service template and 200 templates
```

```
AC-0005-61
Given a service "Avaliação" with durationMinutes 45
When  the owner opens its view page
Then  the duration shows "45min"
```

```
AC-0005-62
Given a service "Sessão dupla" with durationMinutes 120
When  the owner opens its view page
Then  the duration shows "2h"
```

```
AC-0005-63
Given a tenant "studio-ana" that was just created
When  its owner opens the fill-in page of template "Serviço"
Then  the duration field is labelled "Duração"
```

```
AC-0005-64
Given two simultaneous create requests in the same tenant with name "Sessão individual"
When  both are processed
Then  exactly one returns 201 and the other returns 409 with { "error": "serviceName.taken", "field": "name" }
```

```
AC-0005-65
Given services "Avaliação" and "Retorno"
When  the owner updates "Retorno" with name "avaliacao"
Then  the response is 409 with { "error": "serviceName.taken", "field": "name" }
And   "Retorno" keeps its name
```

```
AC-0005-66
Given an owner of "studio-ana"
When  they create a service from template "Serviço" with a valid name and duration, priceCents 15000 and currency "USD"
Then  the response is 422 with { "error": "serviceCurrency.invalid", "field": "currency" }
```

```
AC-0005-67
Given an owner of "studio-ana"
When  they create a service from template "Serviço" with a valid name and duration, priceCents 15000 and no currency
Then  the response is 422 with { "error": "serviceCurrency.required", "field": "currency" }
```

```
AC-0005-68
Given service "Avaliação" from template "Serviço" and service "Pilates solo" from template "Sessão"
When  the owner lists services with the id of "Sessão" as formId
Then  the list holds only "Pilates solo" with total 1
```

```
AC-0005-69
Given tenant "studio-ana" with services and an active client template "Cliente"
When  its owner lists services with the id of "Cliente" as formId
Then  the response is 200 with no services and total 0
```

```
AC-0005-70
Given tenant "studio-ana" with 60 active services
When  its owner lists services with limit 25
Then  the response holds 25 services and total 60
```

```
AC-0005-71
Given services "Avaliação", "sessão" and "Retorno"
When  the owner lists services with sort "-name"
Then  they are listed in the order "sessão", "Retorno", "Avaliação"
```

```
AC-0005-72
Given services "Avaliação" and "Retorno", and "Avaliação" was edited after "Retorno" was last changed
When  the owner lists services with sort "-updatedAt"
Then  "Avaliação" is listed before "Retorno"
```

```
AC-0005-73
Given an owner listing services
When  the request has sort "price"
Then  the response is 422 with { "error": "serviceSort.invalid", "field": "sort" }
```

```
AC-0005-74
Given an active service whose updatedAt is T
When  the owner inactivates it
Then  the response's updatedAt is later than T
```

```
AC-0005-75
Given tenant "studio-ana" with 3 active services
When  its owner opens /services and the last row comes into view
Then  the closing block with copy key services.list.end shows below the last row
```

_AC-0005-76 is withdrawn (v1.2): narrow screens group by template, not by letter (R14, §9 Q13). Its ID is not
reused._

```
AC-0005-76
Given services "Avaliação", "Retorno" and "Relaxamento"
When  the owner opens /services on a narrow screen
Then  the cards appear under the letter headings "A" and "R", in that order
```

```
AC-0005-77
Given the owner on the fill-in page of template "Serviço" with a valid name and price
When  they type "abc" in the duration field and press Salvar
Then  the inline error with copy key validation.serviceDuration.invalid shows under Duração
And   no request is sent
```

```
AC-0005-78
Given the owner on the fill-in page of template "Serviço" with a valid name and price
When  they type "3" in the duration field and press Salvar
Then  the inline error with copy key validation.serviceDuration.invalid shows under Duração
And   no request is sent
```

```
AC-0005-79
Given the owner on the fill-in page of template "Serviço" with a valid name and price
When  they type "1h 75" in the duration field and press Salvar
Then  the inline error with copy key validation.serviceDuration.invalid shows under Duração
And   no request is sent
```

```
AC-0005-80
Given a service "Sessão individual" with durationMinutes 90
When  the owner opens its edit page
Then  the duration field holds "1h 30min"
```

```
AC-0005-81
Given the owner on the edit page of a service with durationMinutes 90
When  they press Salvar without changing anything
Then  the update request carries durationMinutes 90
And   the response is 200
```

```
AC-0005-82
Given tenant "studio-bia" has a service template "Pilates" with a service "Pilates solo"
When  the owner of "studio-ana" lists services with the id of "Pilates" as formId and "studio-ana" as active tenant
Then  the response is 200 with no services and total 0
```

```
AC-0005-83
Given the owner on the view page of active service "Sessão individual"
And   the service is then archived in another tab
When  the owner presses "Arquivar"
Then  the page reloads the service, showing it as inactive, with the toast with copy key services.status.unchanged
```

```
AC-0005-84
Given the owner on the view page of service "Sessão individual" while it had no linked history
And   an appointment is then linked to the service
When  the owner confirms the delete dialog
Then  the dialog closes and the page offers only "Arquivar" with the hint with copy key services.delete.hasHistory
```

Narrow screens (R14, R15), from v1.2:

```
AC-0005-85
Given an owner on a narrow screen
When  they open /services
Then  the page title is "Procedimentos/Consultas"
```

```
AC-0005-86
Given service templates "Estéticos" with 2 active services, "Dermatologia" with 1 active service and "Laser" with none, and 1 archived service
When  the owner opens /services on a narrow screen
Then  the chips read "Todos", "Dermatologia", "Estéticos", "Arquivados" in that order, with "Todos" active
```

```
AC-0005-87
Given active services "Peeling" (template "Dermatologia"), "Facial" and "Botox" (template "Estéticos")
When  the owner opens /services on a narrow screen with "Todos" active
Then  the section "Dermatologia" lists "Peeling", then the section "Estéticos" lists "Botox", "Facial"
```

```
AC-0005-88
Given active services "Peeling" (template "Dermatologia") and "Facial" (template "Estéticos")
When  the owner taps the chip "Estéticos" on a narrow screen
Then  only "Facial" is listed, with no section header
And   "Estéticos" is the only active chip
```

```
AC-0005-89
Given an active service "Facial" and an archived service "Laser antigo"
When  the owner taps the chip "Arquivados" on a narrow screen
Then  only "Laser antigo" is listed
```

```
AC-0005-90
Given an active service "Sessão individual" with durationMinutes 90 and priceCents 15000
When  the owner opens /services on a narrow screen
Then  its row shows the active status dot, "Sessão individual", "1h 30min" and "R$ 150,00"
```

```
AC-0005-91
Given a narrow service row
When  the owner drags it left past half the width of its actions and releases it slowly
Then  the row stays open, showing "Arquivar" and "Excluir"
```

```
AC-0005-92
Given a narrow service row
When  the owner drags it left less than half the width of its actions and releases it slowly
Then  the row snaps closed
```

```
AC-0005-93
Given a narrow service row
When  the owner flicks it left fast, less than half the width of its actions
Then  the row snaps open
```

```
AC-0005-94
Given the narrow row of "Facial" is open
When  the owner opens the row of "Peeling"
Then  the row of "Facial" closes
```

```
AC-0005-95
Given the narrow row of "Facial" is open
When  the owner taps outside it, or scrolls the list
Then  the row closes
```

```
AC-0005-96
Given an active service "Facial" on a narrow screen
When  the owner swipes its row open and taps "Arquivar"
Then  the archive request is sent with no dialog
And   the row leaves the list and the toast with copy key services.toast.archived offers "Desfazer"
```

```
AC-0005-97
Given the owner just archived "Facial" and its toast is shown
When  they tap "Desfazer"
Then  the reactivate request for "Facial" is sent and "Facial" is listed again
```

```
AC-0005-98
Given an active service "Facial" without history on a narrow screen
When  the owner swipes its row open and taps "Excluir"
Then  the delete dialog asking to type "Facial" opens
```

```
AC-0005-99
Given an active service "Peeling" whose list item has hasHistory true, on a narrow screen
When  the owner swipes its row open and taps "Excluir"
Then  no dialog opens and no request is sent
And   the row snaps closed and the toast with copy key services.delete.hasHistory offers "Arquivar"
```

```
AC-0005-100
Given the toast of AC-0005-99 for "Peeling"
When  the owner taps its "Arquivar"
Then  the archive request for "Peeling" is sent and its row leaves the list
```

```
AC-0005-101
Given the delete dialog for "Facial" opened from its narrow row
And   an appointment is then linked to "Facial"
When  the owner types "Facial", confirms, and the response is 409 service.has-history
Then  the dialog closes, the row snaps closed and the toast with copy key services.delete.hasHistory offers "Arquivar"
```

```
AC-0005-102
Given an archived service "Laser antigo" under the chip "Arquivados" on a narrow screen
When  the owner swipes its row open
Then  "Reativar" and "Excluir" are revealed
```

```
AC-0005-103
Given a narrow service row of an active service
When  the owner activates its "⋯" button
Then  a menu offers "Arquivar" and "Excluir"
```

```
AC-0005-104
Given a narrow service row of an active service
When  the owner long-presses it
Then  the menu with "Arquivar" and "Excluir" opens
```

```
AC-0005-105
Given the chip "Estéticos" is active on a narrow screen
When  the owner taps the floating "+"
Then  the fill-in page of template "Estéticos" opens
```

```
AC-0005-106
Given the chip "Todos" is active on a narrow screen
When  the owner taps the floating "+"
Then  the Novo menu opens with "Criar novo modelo" and the active service templates
```

```
AC-0005-107
Given active services "Facial" and "Botox" (template "Estéticos") and "Peeling" (template "Dermatologia"), with the chip "Estéticos" active on a narrow screen
When  the owner taps the search icon and types "fac"
Then  only "Facial" is listed
```

```
AC-0005-108
Given services "Peeling" (template "Dermatologia"), "Facial" and "Botox" (template "Estéticos")
When  the owner lists services with sort "form"
Then  they are listed in the order "Peeling", "Botox", "Facial"
```

```
AC-0005-109
Given template "Estéticos" with 2 active services and 1 archived service, and template "Laser" with only 1 archived service
When  the owner reads the service template summary
Then  it lists only "Estéticos", with activeCount 2, and archivedCount is 2
```

```
AC-0005-110
Given tenant "studio-bia" has a service template "Pilates" with an active service
When  the owner of "studio-ana" reads the service template summary with "studio-ana" as active tenant
Then  "Pilates" is not in it
```

```
AC-0005-111
Given a service "Peeling" with one linked appointment and a service "Facial" with none
When  the owner lists services
Then  "Peeling" has hasHistory true and "Facial" has hasHistory false
```

```
AC-0005-112
Given the owner on the view page of active service "Facial"
When  they press "Arquivar"
Then  the archive request is sent with no dialog
And   the toast with copy key services.toast.archived offers "Desfazer"
```

```
AC-0005-113
Given template "Laser" whose only active service is "Laser facial", with the chip "Laser" active on a narrow screen
When  the owner archives "Laser facial" from its row
Then  the chip "Laser" is gone and "Todos" is the active chip
```

From v1.6 (§9 Q23–Q26):

```
AC-0005-114
Given an archived service "Laser antigo" whose list item has hasHistory true, under the chip "Arquivados" on a narrow screen
When  the owner swipes its row open and taps "Excluir"
Then  no dialog opens and no request is sent
And   the row snaps closed and the toast with copy key services.delete.hasHistory shows with no action
```

```
AC-0005-115
Given an archived template "Laser" with an active service "Laser facial", with the chip "Laser" active on a narrow screen
When  the owner taps the floating "+"
Then  the Novo menu opens with "Criar novo modelo" and the active service templates
```

```
AC-0005-116
Given an active template "Estéticos" and an archived template "Laser", each with one active service
When  the owner reads the service template summary
Then  "Estéticos" has status "active" and "Laser" has status "archived"
```

```
AC-0005-117
Given the service template summary has not loaded yet
When  the owner opens /services on a narrow screen
Then  the chip "Todos" shows, followed by placeholder chips
```

```
AC-0005-118
Given an active service "Facial" and a service template summary request that fails
When  the owner opens /services on a narrow screen
Then  the chips are "Todos" and "Tentar novamente" with copy key services.list.chips.retry
And   "Facial" is listed under "Todos"
```

```
AC-0005-119
Given the chips show "Tentar novamente" after a failed load, and template "Estéticos" has an active service
When  the owner taps "Tentar novamente" and the summary loads
Then  the chip "Estéticos" appears after "Todos"
```

```
AC-0005-120
Given the owner in the template editor of a service template
When  they clear the label of the duration system field
Then  the label input's placeholder reads "Duração" with copy key forms.fields.types.duration
```

### Provisional criteria

None. Every open question is answered.

## 11. Implementation plan

Drafted by `/plan` on 2026-11-24 and revised the same day for v1.2 (the mobile design: R14–R16, AC-0005-85 to
-113). It builds on SPEC-0003 §11, "What SPEC-0004 and SPEC-0005 rely on", points 1–8, and mirrors the clients slice
of SPEC-0004 §11 and the list of SPEC-0006 §11. Paths are repo-relative; `T` is
`apps/web/src/app/[lang]/(private)/orgs/[tenant]`.

### Scope

```scope
packages/schemas/src/services/*
packages/schemas/src/index.ts
packages/i18n/messages/pt-BR.json
packages/i18n/messages/en-US.json
apps/api/src/modules/services/*
apps/api/src/modules/clients/*
apps/api/src/shared/list/*
apps/api/src/app.module.ts
apps/api/src/config/app.routes.ts
apps/api/src/database/schema/services.ts
apps/api/src/database/schema/index.ts
apps/api/drizzle/0006_services.sql
apps/api/drizzle/0007_default_service_template.sql
apps/api/drizzle/meta/*
apps/api/src/modules/tenants/infrastructure/persistence/tenant.drizzle.repository.ts
apps/api/test/setup/test-app.ts
apps/api/test/utils/services-fixtures.ts
apps/api/test/e2e/services*
apps/api/test/e2e/clients*
apps/api/test/e2e/forms*
apps/api/test/e2e/form-*
apps/api/test/e2e/tenants*
apps/web/src/app/*/orgs/*/services/*
apps/web/src/app/*/orgs/*/clients/_components/*
apps/web/src/app/*/orgs/*/_components/list/*
apps/web/src/app/*/orgs/*/forms/_lib/draft.ts
apps/web/src/app/*/orgs/_components/sidebar/sidebar.tsx
apps/web/src/app/api/services/*
apps/web/src/app/api/_lib/http.ts
apps/web/src/components/ui/swipe-row*
apps/web/src/components/ui/menu.tsx
apps/web/src/components/ui/toast.tsx
apps/web/src/lib/api/services.ts
apps/web/src/lib/services/*
apps/web/tests/services-*
apps/web/tests/swipe-row*
apps/web/tests/clients-list.test.tsx
apps/web/tests/form-editor.test.tsx
apps/web/package.json
pnpm-lock.yaml
docs/schema.dbml
docs/specs/SPEC-0001-modelos-de-formulario.md
docs/specs/SPEC-0003-preenchimento-de-cadastro.md
docs/specs/SPEC-0005-servicos.md
```

`[lang]`, `(private)` and `[tenant]` become `*` because the lock uses bash globs. Paths outside the services folders:
- `apps/api/src/modules/clients/*`, `apps/api/src/shared/list/*`, `T/clients/_components/*`, `T/_components/list/*`
  and `apps/web/tests/clients-list.test.tsx`: the behavior-preserving extraction of G-1 and G-2. Client tests keep
  their assertions; only import paths may change.
- `tenant.drizzle.repository.ts`: `createWithOwner` seeds "Serviço" (R10).
- `test-app.ts`: the `serviceHistory` override (G-3).
- `clients*`, `forms*`, `form-*` (including `form-records*`), `tenants*` e2e: setup-only fixes for the new default
  template (G-6).
- `draft.ts`, `form-editor.test.tsx`: the "Duração" label (§2 amendment of SPEC-0001 §3.2).
- `sidebar.tsx`: "Serviços" gets its `services` path (today a disabled "em breve" entry).
- `swipe-row*` (component and its test): the reusable swipe row the owner asked for (G-8).
- `menu.tsx`: an optional controlled `open` / `onOpenChange`, so a long press can open the row's menu (R15).
  Additive; existing callers are unchanged.
- `apps/web/package.json`, `pnpm-lock.yaml`: the `motion` dependency (New dependencies), already changed in the
  working tree. They change only through pnpm, never by hand; the lock compares the base commit with the working
  tree, so they must be in scope.
- `toast.tsx`: `show` takes an optional `action` (`{ label, onClick }`, passed to sonner) for "Desfazer" and
  "Arquivar" (§4.4). Additive; existing callers are unchanged.
- The three spec files: changelog lines added by `/done`.

### Gaps and conflicts for the owner

Each needs a decision with the plan's approval. The proposal is what the rest of this plan assumes.

| # | Where | Gap or conflict | Proposal |
| --- | --- | --- | --- |
| G-1 | Web list | Every list piece of SPEC-0006 (`useLayout`, `useReachEnd`, `ListEnd`, toolbar, pickers, `Initials`, `letterOf`, badges, the infinite-query hook) lives in `T/clients/_components` and hard-codes the `clients` namespace, schemas and paths. Copying them would duplicate ~800 lines (SonarCloud gate, RNF-20). | Extract them, parameterized by namespace and fetcher, into `T/_components/list/`; clients and services both use them. A separate `refactor` commit; `clients-list.test.tsx` (59 tests) stays green with no assertion changed. |
| G-2 | API list helpers | Cursor signing (`client-cursor.ts`), `escapeLike`, `parseOrThrow` and `guardQuery` are clients-local. | Move them to `apps/api/src/shared/list/`, unchanged in behavior; each module keeps its own error classes. Services derive their cursor key with the context `"planici:services-cursor:v1"`, so a client cursor never decodes as a services cursor. Clients keep `"planici:list-cursor:v1"`. |
| G-3 | `hasHistory` | No appointments table exists. | `ServiceHistoryReader` port with `ZeroServiceHistoryReader` (always false), replaced in e2e through `createTestApp({ serviceHistory })`, as SPEC-0004 G-2. AC-0005-15, -55, -58 and -84 are verified **partly** until the first scheduling spec (Deferred checks). |
| G-4 | Storage vs `schema.dbml` | `schema.dbml` has `price numeric(10,2)`, nullable `duration_minutes`, `description`, and no link to a record. | Columns `price_cents integer`, `currency text`, `duration_minutes integer`, all NOT NULL with checks (R4, R5); `description` not created (§9 Q6); `form_record_id` as clients. `inactive` stored as `suspended`, as SPEC-0004 Decision 2. `schema.dbml` rewritten to match. |
| G-5 | Default template | R10's skip conditions in SQL. | `planici_seed_service_template(tenant)` skips when the tenant has any `service` template, any template whose `name_key` is `servico` (any type), or 200 or more templates. `createWithOwner` calls it right after the client seed. |
| G-6 | Existing e2e | A second default template changes template counts in existing setups (for example AC-0001-48 seeds 199). | Setup-only fixes, as SPEC-0004 changelog 1.5: remove the seeded "Serviço" first or seed one fewer. No assertion changes; any needed assertion change stops the work and comes back to the owner. |
| G-7 | SPEC-0003 §11 | Re-check SHOULD-FIX 9: SPEC-0003 §11 points to "SPEC-0005 §4.1" for duration and price formatting; it is now R12 and §4.3. | Fix the reference in the same `/done` edit that adds SPEC-0003's changelog line. |
| G-8 | Swipe row | The owner asked for a reusable swipe row. motion's drag needs pointer capture and layout sizes that jsdom does not provide, so a real drag cannot run in vitest. | `apps/web/src/components/ui/swipe-row.tsx`: `SwipeRowGroup` (context: which row is open; closes it on a pointer down outside it, or on any `scroll` event caught on `window` in the capture phase, since `/services` scrolls the page, not the group) and `SwipeRow` (`actions`, `menuLabel`, `onOpen`; motion `drag="x"` constrained to the actions' width, `dragElastic` 0.1, `touch-pan-y`, spring snap, a "⋯" menu button, long press 500 ms cancelled by 8 px of movement). The snap rule is a pure `decideSnap({ offset, velocity, actionsWidth })`: open when `-offset > actionsWidth / 2` or `-velocity > 500` px/s. Nothing services-specific inside. Tests: `decideSnap` table (AC-0005-91 to -93) and group behavior with `motion/react` stubbed so a test can fire `onDragEnd` with a chosen offset and velocity (AC-0005-94, -95). The feel on a real phone (iOS Safari, Android Chrome) is a manual check recorded at `/done`. |
| G-9 | `hasHistory` in the list | R15 needs `hasHistory` on every list item; the port of G-3 answers one service at a time. | `ServiceHistoryReader.withHistory(tenantId, serviceIds)` returns the ids with history, one call per page; the zero reader returns none. AC-0005-99, -101 and -111 join the partly verified criteria of G-3. |
| G-10 | Template summary path | §7 leaves the path to `/plan`. `GET /v1/services/templates` sits beside `GET /v1/services/:serviceId`; if `:serviceId` is registered first, "templates" is parsed as a malformed id and returns 404. | `GET /v1/services/templates`, with its controller listed before `GetServiceHttpController` in `services.module.ts`; E-slist asserts the 200 so a reorder fails a test. |
| G-11 | Narrow "Todos" sections | A page boundary can split a template's services. | The narrow list renders a section header only when an item's `formId` differs from the previous loaded item's (R14: no repeated header). No API change. |

### Contracts (`packages/schemas/src/services/`)

New, non-breaking. Consumers: `apps/api`, `apps/web`.

- `requests.ts`:
  - `ServiceAttributesSchema`: `name` (trim, collapse spaces, 1–80 → `serviceName.required`, `.max`),
    `durationMinutes` (int, 5–1,440 → `serviceDuration.required`, `.invalid`), `priceCents` (int, 0–99,999,999 →
    `servicePrice.required`, `.negative`, `.invalid`), `currency` (`"BRL"` → `serviceCurrency.required`,
    `.invalid`). Field order matches §6 step 1.
  - `ServiceCreateRequestSchema` / `ServiceUpdateRequestSchema`: the SPEC-0003 record envelopes plus the attributes,
    for the web's typing; the controller still parses the envelope first (SPEC-0003 §11 point 2).
  - `ListServicesQuerySchema`: `q` (trimmed, blank → no filter, 1 char → `serviceSearch.min`), `status`
    (`active` default, `inactive`, `all` → `serviceStatus.invalid`), `formId` (uuid → `formId.invalid`), `sort`
    (`SERVICE_SORTS` = `name`, `-name`, `-updatedAt`, `form` → `serviceSort.invalid`), `limit`, `after`
    (`pagination.ts`).
  - `DeleteServiceRequestSchema` (`confirmName`), `ServiceIdSchema`.
- `responses.ts`: `ServiceSchema` (§7 Service), `ServiceSummarySchema` (with `hasHistory`),
  `ServiceListResponseSchema` (`{ services, nextCursor, total }`), `ServiceTemplateSummarySchema`
  (`{ templates: { id, name, status, activeCount }[], archivedCount }`, `status` from `FORM_STATUSES`).
- `errors.ts`: `SERVICE_ERROR_CODES` with every key of §6 that is new.
- `index.ts` re-exports; `src/index.ts` exports `./services`.

### Persistence

- `apps/api/src/database/schema/services.ts`, exported from `schema/index.ts`. Table `services`: `id` (uuid PK),
  `tenant_id` (FK tenants, cascade), `form_record_id` (unique, FK `form_records`, cascade), `name`, `name_key`
  (`textKey(name)`), `duration_minutes`, `price_cents`, `currency` (default `'BRL'`), `status` (`record_status`,
  default `active`), `created_at`, `updated_at`.
- Checks: `ck_services_status` (`active`, `suspended`), `ck_services_duration` (5–1,440), `ck_services_price`
  (0–99,999,999), `ck_services_currency` (`= 'BRL'`).
- Indexes: `idx_services_tenant_name_key` unique `(tenant_id, name_key)` (R3; a 23505 on it → `serviceName.taken`,
  which also settles AC-0005-64); `idx_services_tenant_status_name` `(tenant_id, status, name_key, id)`. No
  `-updatedAt` or `form` index (as SPEC-0006 G-4): the `form` sort orders the join with `forms` by
  `forms.name_key`, which is unique per tenant (`idx_forms_tenant_name_key`); MVP lists are small.
- `0006_services.sql`: `pnpm --filter api exec drizzle-kit generate --name services`. Read the SQL before going on.
- `0007_default_service_template.sql`: `drizzle-kit generate --custom --name default_service_template`. Defines
  `planici_seed_service_template(tenant text)` (G-5; fields `service.name` "Nome" `text`, `service.duration`
  "Duração" `duration`, `service.price` "Preço" `money`, all required, version 1, the insert shape of `0005`) and
  `planici_backfill_service_templates()`, and runs the backfill once.
- `tenant.drizzle.repository.ts`: `createWithOwner` calls `select planici_seed_service_template(id)` in the
  tenant's transaction, after the client seed.
- Delete locks the row `for update`, checks history, then deletes the `form_records` row; the cascade removes the
  service. Deleting a template with "Sim, excluir tudo" cascades the same way.
- `docs/schema.dbml`: `services` rewritten (G-4).
- **Rollback**: dropping `services` loses every service; dropping the seed functions loses nothing, but the seeded
  "Serviço" templates stay unless deleted as ordinary templates. Both rollbacks are destructive and need the
  owner's authorization.

### API (`apps/api/src/modules/services/`)

Same layout as clients: `commands/{create,update,inactivate,reactivate,delete}-service/`,
`queries/{get-service,list-services,get-service-template-summary}/`, `application/present-service.ts`, `domain/`
(errors, search, request specs), `ports/` (`service.repository`, `service-history.reader`, `service-cursor-key`),
`infrastructure/` (Drizzle repository, `ZeroServiceHistoryReader`). Registered in `app.module.ts`; root `services`
in `app.routes.ts`; the summary controller precedes `GetServiceHttpController` (G-10). Every route: `JwtAccessGuard`,
`ActiveTenantGuard`, `membership.assertCanManage()`; `:serviceId`
through `ZodParam(ServiceIdSchema, () => new ServiceNotFoundError())`. No consent and no `SystemFieldPresence`
(`presenceFor('service')` is already `{}`).

| Route | Success | Errors, in order | ACs |
| --- | --- | --- | --- |
| `GET /v1/services` | 200 | `q`, `status`, `formId`, `sort`, `limit`, `after` (422) | 12, 19, 21, 33, 36, 38–44, 68–73, 82, 108, 111 |
| `GET /v1/services/templates` | 200 | tenant context only (400 / 403 / 404 as §5) | 109, 110, 116 |
| `POST /v1/services` | 201 | envelope (422); template 400 / 422 / 409; `record.form-changed`; name, duration, price, currency (422); values; `serviceName.taken` (409) | 03–11, 22–27, 34, 35, 64, 66, 67 |
| `GET /v1/services/:serviceId` | 200 | 404 `service.not-found` | 45, 58 |
| `PATCH /v1/services/:serviceId` | 200 | body (422, before the id, as clients); 404; `record.form-changed`; `record.revision-conflict`; attributes; values; taken | 28, 65 |
| `POST /v1/services/:serviceId/inactivate` | 200 | 404; 409 `service.status-unchanged` | 13, 30, 74 |
| `POST /v1/services/:serviceId/reactivate` | 200 | 404; 409 `service.status-unchanged` | 29 |
| `POST /v1/services/:serviceId/delete` | 204 | 404; 400 `deleteConfirmation.required`; 409 `service.has-history` | 14, 15, 31 |

- **Create**, in one transaction: `openForCreate(…, 'service', …)` → `parseOrThrow(ServiceAttributesSchema)` →
  `checkValues` → `draft.insert` → insert the service row → `present` (§6 check order; SPEC-0003 Decision 2).
- **Update**: `lockById` (404) → `openForUpdate` (`RecordNotFoundError` → `service.not-found`) → attributes →
  `checkValues` → `draft.replace` → update the row and `updated_at`.
- **Response**: `RecordService.read` (presence `{}`) merged with the row's attributes, `status`, `hasHistory`,
  `createdAt` and `updatedAt` from the service row (R11).
- **List**: `name_key like` search; filters joined to `forms` of type `service` in the tenant, so another tenant's
  or a client template gives an empty page with total 0; keyset sorts with the shared cursor (G-2), `-updatedAt`
  carrying microsecond text (SPEC-0006 G-6), `form` carrying `(forms.name_key, services.name_key, id)`; `count`
  with the same filters; `hasHistory` from one `withHistory` call per page (G-9).
- **Template summary**: one grouped query over the tenant's `service` forms joined to their services —
  templates with at least one active service, their `status`, `activeCount`, ordered by `forms.name_key`, then
  `id` — plus the
  count of inactive services. Same guards as the list.

### Web

| Route | Component |
| --- | --- |
| `T/services` | `ServicesList`: wide, SPEC-0006 behavior through the shared list of G-1; narrow, `ServicesNarrowList` (R14, R15) |
| `T/services/new?form=:id` | `NewServicePage` → `RecordForm mode="create"` |
| `T/services/[serviceId]` | `ServiceViewPage` → `RecordView` + `ServiceActions` |
| `T/services/[serviceId]/edit` | `ServiceEditPage` → `RecordForm mode="edit"` |

- `useServiceAdapter` (`entity: "services"`): `systemFields` for `service.name`, `service.duration` (input of R13,
  format of R12) and `service.price` (pt-BR mask, `formatPrice`); `currency: "BRL"` added to every request.
- `apps/web/src/lib/services/`: `parseDuration` (R13), `formatDuration` (R12), `parsePriceMask`, `formatPrice`.
- `NewServiceMenu`: active `service` templates; "Criar novo modelo" → `/forms/new?from=services` (already handled
  by the editor's redirect).
- `ServiceRows` (wide): initials, name, "1h 30min · R$ 150,00", badges (§4.1).
- Narrow (`T/services/_components/`), split by `useLayout` at 48rem:
  - `ServiceChips`: from `useServiceTemplateSummary` (TanStack Query over the summary route); "Todos", the
    templates, "Arquivados" when `archivedCount > 0`; the active chip kept in component state;
    falls back to "Todos" when its chip is gone (AC-0005-113). While the summary loads, "Todos" plus
    `aria-hidden` placeholder chips and the polite status `services.list.chips.loading`; on failure, "Todos" plus
    a "Tentar novamente" chip that refetches; the list query does not wait for the summary (R14).
  - `ServicesNarrowList`: the shared infinite query with `sort=form` under "Todos", `formId` + `sort=name` under a
    template chip, `status=inactive` under "Arquivados"; section headers by G-11; the search icon opens the shared
    search field.
  - `ServiceSwipeRow`: `SwipeRow` (G-8) with the status dot, name, R12 duration, price; actions "Arquivar" or
    "Reativar", and "Excluir".
  - `ServiceFab`: the floating "+" links to `/services/new?form=<chip>` under the chip of an active template,
    else ("Todos", "Arquivados", an archived template's chip) opens `NewServiceMenu` with the `floating` menu
    look.
- `ServiceActions` (view page) and `useServiceActions` (shared with the narrow rows): archive at once with the
  "Desfazer" toast action (reactivate), reactivate, the typed-name delete dialog, the `hasHistory` toast with its
  "Arquivar" action (none for an archived service, R15), the 409 reloads (§4.4, §8). Every success
  invalidates the list and summary queries.
- BFF `apps/web/src/app/api/services/**`: `GET`/`POST` list and create; `GET` `templates`; `GET`/`PATCH`
  `[serviceId]`; `POST` `[serviceId]/{inactivate,reactivate,delete}`; `_lib/services.ts` (`serviceIdParam` → 404
  `service.not-found`). `http.ts`: `"services"` joins the `resource` union. Browser wrapper
  `apps/web/src/lib/api/services.ts`.
- `sidebar.tsx`: "Serviços" → `services`. `draft.ts`: `service.duration` → "Duração". The editor's type name
  `forms.fields.types.duration` → "Duração" / "Duration" in both locales (§9 Q26).
- **Copy** (both locales, proposed): `services.*` mirrors `clients.*` (`list`, `new`, `inactivate`,
  `reactivate`, `status`, `delete`, `toast`) with the service wording of §4.1, §4.4 and §8 and R16
  ("Arquivar", "Arquivado", "Arquivados"; `services.inactivate.inProgress` "Arquivando…", `.error` "Não foi
  possível arquivar o serviço."), plus the §8 keys `services.list.title`, `.chips.*`, `.searchOpen`,
  `services.actions.*`, `services.toast.archived`, `.undo`. The existing `services.form`,
  `services.toast.created/saved` and `services.view` stay. New `validation.*`:

| Key | pt-BR | en-US |
| --- | --- | --- |
| `service.not-found` | Serviço não encontrado. | Service not found. |
| `service.has-history` | Serviços já utilizados não podem ser excluídos. | Services already in use cannot be deleted. |
| `service.status-unchanged` | O status deste serviço já foi alterado. | This service's status has already changed. |
| `serviceName.required` | Informe o nome do serviço. | Enter the service name. |
| `serviceName.max` | Use até 80 caracteres. | Use up to 80 characters. |
| `serviceName.taken` | Já existe um serviço com este nome. | A service with this name already exists. |
| `serviceDuration.required` | Informe a duração. | Enter the duration. |
| `serviceDuration.invalid` | Use de 5min a 24h, como "1h 30" ou "90". | Use 5min to 24h, such as "1h 30" or "90". |
| `servicePrice.required` | Informe o preço. | Enter the price. |
| `servicePrice.negative` | O preço não pode ser negativo. | The price cannot be negative. |
| `servicePrice.invalid` | Use um preço de até R$ 999.999,99. | Use a price up to R$ 999,999.99. |
| `serviceCurrency.required`, `.invalid` | Moeda inválida. | Invalid currency. |
| `serviceSearch.min` | Digite ao menos 2 caracteres para buscar. | Type at least 2 characters to search. |
| `serviceStatus.invalid` | Status inválido. | Invalid status. |
| `serviceSort.invalid` | Ordenação inválida. | Invalid sort. |

### Tests

Every test name starts with its AC ID. Files:
- **E-sv** `apps/api/test/e2e/services.e2e-spec.ts`: create, read, update, validation, isolation, auth.
- **E-slist** `services-list.e2e-spec.ts`: list, search, filters, sorts, total, pagination, tenant context.
- **E-slife** `services-lifecycle.e2e-spec.ts`: inactivate, reactivate, delete, history, cascades.
- **E-sdef** `services-default-template.e2e-spec.ts`: seed and backfill.
- **E-srec** `services-records.e2e-spec.ts`: SPEC-0003's service side.
- **U-sreq** `apps/api/src/modules/services/domain/service-requests.spec.ts`: the request schemas.
- **W-slist** `apps/web/tests/services-list.test.tsx`, **W-snarrow** `services-narrow.test.tsx` (R14, R15 with
  `matchMedia` narrow), **W-sform** `services-form.test.tsx`, **W-sview** `services-view.test.tsx`, **W-sval**
  `services-values.test.ts` (R12, R13, price mask), **W-swipe** `apps/web/tests/swipe-row.test.tsx` (G-8).
- Helpers: `apps/api/test/utils/services-fixtures.ts` (`servicesApi`, `serviceBody`, `seedService`,
  `FakeServiceHistory`), `apps/web/tests/services-harness.tsx`.

| AC | Test | What it checks |
| --- | --- | --- |
| 01 | E-sdef, W-slist | a new tenant's only service template is "Serviço"; the dropdown shows it after "Criar novo modelo" |
| 02 | W-slist | dropdown order and filtering (active service templates only) |
| 03–11, 22–27 | E-sv, U-sreq | create happy path and every attribute rule and bound |
| 05, 64, 65 | E-sv | name taken: inactive service, concurrent creates, update |
| 06 | E-sv | the same name in another tenant is accepted |
| 12, 21, 71, 72 | E-slist | default sort, search, `-name`, `-updatedAt` |
| 13 | E-slife, W-slist | 200 inactive and gone from the default filter; "Arquivado" badge under "Arquivados" (wide) |
| 14 | E-slife, W-sview | delete 204 then 404; the dialog flow |
| 15, 58 | E-slife | partly (G-3): 409 `service.has-history`; `hasHistory` true / false |
| 16, 17, 37 | E-sv | another tenant's service is 404 on every action; 401 without a token |
| 18, 48–54, 57, 75 | W-slist | empty, loading, error, noResults, noTemplates, searchHint, emptyFilter, load-more failure, wide row, end of list |
| 76 | — | withdrawn (v1.2) |
| 19, 40–44, 70, 73 | E-slist | pagination, query errors, total, `serviceSort.invalid` |
| 20, 56, 77–81 | W-sform, W-sval | price mask; duration input, rejection and edit prefill |
| 28 | E-sv | update happy path |
| 29, 30, 74 | E-slife | reactivate; status unchanged; `updatedAt` moves on inactivation |
| 31 | E-slife | wrong `confirmName` → 400, service kept |
| 32, 55, 61, 62, 83, 84, 112 | W-sview | dialog gate; history hint (55, 84 partly, G-3); duration display; 409 reloads; "Arquivar" with no dialog and the "Desfazer" toast |
| 33, 36, 38, 39, 82 | E-slist | list isolation; `tenant.not-found`, `tenant.required`, `tenant.inactive`; another tenant's template as filter |
| 34, 35 | E-sv | another tenant's template; `formType.mismatch` |
| 45 | E-sv | malformed id → 404 |
| 46, 47, 59, 60, 63 | E-sdef | backfill branches (none, archived, name clash, 200 templates); seeded label "Duração" |
| 66, 67 | E-sv, U-sreq | currency invalid / missing |
| 68, 69 | E-slist | template filter; client template as filter → total 0 |
| 85–90 | W-snarrow | title; chip order and visibility; "Todos" sections; template chip with no header; "Arquivados"; row content |
| 91–93 | W-swipe | `decideSnap` table: past half, short and slow, short and fast (G-8; feel checked by hand) |
| 94, 95 | W-swipe | one open row per group; an outside pointer down, and a `scroll` fired on `window`, close it (motion stubbed, G-8) |
| 96–98, 100, 102 | W-snarrow | swipe "Arquivar" (no dialog, row leaves, toast with "Desfazer"); "Desfazer" reactivates; "Excluir" opens the dialog; the toast's "Arquivar"; archived row actions |
| 99, 101 | W-snarrow | partly (G-3, G-9): `hasHistory` true → toast, no dialog, no request; 409 → dialog closes, toast |
| 103, 104 | W-snarrow | "⋯" menu; long press opens the same menu (fake timers) |
| 105, 106 | W-snarrow | floating "+" under a template chip and under "Todos" |
| 107 | W-snarrow | search within the active chip sends `q` with its `formId` |
| 108 | E-slist | sort `form` order and its cursor across pages |
| 109, 110 | E-slist | summary contents and counts; another tenant's template absent; the route answers 200, not 404 (G-10) |
| 111 | E-slist | partly (G-3, G-9): `hasHistory` per list item |
| 113 | W-snarrow | the active chip disappears after archiving → "Todos" active |
| 114 | W-snarrow | partly (G-3, G-9): archived row with `hasHistory` true → toast with no action, no dialog, no request |
| 115 | W-snarrow | floating "+" under an archived template's chip opens the [Novo] menu |
| 116 | E-slist | summary `status` for an active and an archived template |
| 117–119 | W-snarrow | chips while the summary loads; failure shows "Tentar novamente" and the list still loads; retry brings the chips |
| 120 | `apps/web/tests/form-editor.test.tsx` | cleared duration label → placeholder "Duração" |

**Deferred criteria this plan verifies**

| AC | Test | What it checks here |
| --- | --- | --- |
| AC-0003-02 to -14, -17, -19, -20, -22 to -24, -26, -30 to -45, -54 to -60, -62 to -69, -71, -72, -75, -76, -79, -81, -86 to -89 (service side) | E-srec | each case of `clients-records.e2e-spec.ts` that is not client-only, through the service endpoints (`service.not-found` where clients get `client.not-found`). AC-0003-73 and -74 are client-only (SPEC-0003 §11) |
| AC-0003-82 (service side) | E-slife | a service at revision 2 is inactivated and still reports revision 2 |
| §4.4 and SPEC-0001 Persistence, template delete (no AC id) | E-slife | "Sim, excluir tudo" on a service template removes its services and their `form_records` rows |
| SPEC-0001 Persistence, services | E-slife | after a service delete, both the `services` and the `form_records` rows are gone |

`/done` adds "`<AC ids>` verified with SPEC-0005, `<date>`" to SPEC-0003's changelog (closing its G-9) and
fixes the reference of G-7.

### Deferred checks

| AC | Status after this plan | Verified by |
| --- | --- | --- |
| AC-0005-15, -55, -58, -84, -99, -101, -111, -114 | partly: a fake `ServiceHistoryReader` stands in for appointments (G-3, G-9) | the first scheduling spec, unless the owner waives as for AC-0004-15, -33, -71 |
| AC-0005-91 to -95 | partly: snap rule and group logic in jsdom; the gesture itself by hand on a phone (G-8) | the manual check recorded at `/done` |

### Sequence

0. **Preconditions**: `plan_status` Approved; branch `feat/spec-0005-services`; Docker up for e2e.
1. **Contracts**: `packages/schemas/src/services/*`, U-sreq. `pnpm --filter @planici/schemas build && pnpm
   typecheck`.
2. **Refactors (G-1, G-2)**, behavior-preserving, own commit: move the API list helpers to `shared/list/` and the
   web list pieces to `T/_components/list/`. `pnpm --filter api test`, `pnpm --filter api test:e2e` (clients*)
   and `pnpm --filter web test` (clients-list) green with no assertion changed.
3. **Persistence**: `services.ts` → `0006_services` → `0007_default_service_template` → `createWithOwner` →
   `schema.dbml`. Run the full api e2e now; fix setups only (G-6).
4. **Failing tests**: fixtures, E-sv, E-slist, E-slife, E-sdef, E-srec; W-slist, W-sform, W-sview, W-sval. Each
   fails for the right reason (404 route, missing module, missing component).
5. **API**: 5a list and read (12, 19, 21, 33, 36, 38–45, 68–73, 82, 108, 111); 5b template summary (109, 110);
   5c create and update (03–11, 22–28, 34, 35, 64–67); 5d inactivate, reactivate, delete (13–16, 29–31, 58, 74);
   5e full api e2e, E-srec and E-sdef.
6. **Web**: 6a `lib/services` helpers, BFF, `lib/api/services.ts`; 6b `SwipeRow` and W-swipe, the `menu.tsx`
   and `toast.tsx` additions (own commit, before any services UI); 6c wide list and [Novo]; 6d narrow list,
   chips, sections, swipe rows, floating "+"; 6e fill-in, view, edit, actions; 6f sidebar, `draft.ts` label,
   the `duration` type name, `form-editor.test.tsx`, copy in both locales.
7. **Checks**: `pnpm lint && pnpm typecheck && pnpm test`, `pnpm --filter api test:e2e`; the manual swipe check of
   G-8 on a phone.

### Risks

| Risk | Cheapest early check |
| --- | --- |
| The new default template breaks template counts in existing e2e beyond setup fixes (G-6). | Step 3: run the full api e2e right after the migrations, before any new test. |
| The list extraction (G-1) changes client list behavior. | Step 2 is its own commit; `clients-list.test.tsx` and clients e2e must pass unchanged. |
| `textKey` folds "Sessão" / "sessao  individual" differently from R3's intent. | U-sreq case for AC-0005-05 in step 1, against `textKey`. |
| The seed function's insert shape drifts from what the forms API writes. | E-sdef compares the seeded "Serviço" field by field with an API-created service template, as SPEC-0004 Decision 4. |
| R13 parsing ambiguities ("90min", "1h30", "1H 30MIN"). | W-sval table of every R13 example, accepted and rejected, first in step 6a. |
| `GET /v1/services/templates` is captured by `:serviceId` (G-10). | The E-slist summary test in step 4 fails with 404 if the controller order is wrong. |
| motion's drag fights vertical scrolling or the chips' horizontal scroll on real devices. | Step 6b ends with the manual check on a phone, before the services UI is built on `SwipeRow`. |
| A long press also starts a drag, or a drag also fires the row's tap (opening the view page). | W-swipe: a drag past 8 px cancels the long-press timer and suppresses the click. |
| Base UI's menu cannot be opened from a long press without a trigger click. | Step 6b: the controlled `open` prop added to `menu.tsx`, covered by W-swipe. |

### New dependencies

- `motion` `^14.14.0` (`apps/web`): drag with velocity, constraints and spring snap for `SwipeRow` (R15, G-8),
  which CSS and pointer events alone would reimplement. It is already in the working tree's `apps/web/package.json`
  and `pnpm-lock.yaml`, uncommitted and not yet imported; the owner commits it with step 6b.

## 12. Changelog

| Version | Date | Change |
| --- | --- | --- |
| 0.1 | 2026-11-09 | Draft |
| 0.2 | 2026-11-09 | Owner answers D-6, D-9 recorded; `priceCents` restored; AC-0005-01 agreed; AC-0005-19 (pagination) added |
| 0.3 | 2026-11-09 | `form` in the response gains `latestVersion` (template versioning, SPEC-0001 v0.3) |
| 0.4 | 2026-11-09 | Owner Joao Izidoro set. Services can be deleted together with their template (SPEC-0001 D-13) |
| 0.5 | 2026-11-09 | Aligned with SPEC-0001 v0.5 (owner decision on SPEC-0001 Q7): deleting a template with its services is offered only when none has linked history (§4.4) |
| 0.6 | 2026-11-09 | Owner decision (SPEC-0001 review round 2): length keys use `.max` / `.min` (`serviceName.max`, `serviceSearch.min`); system fields are now SPEC-0001 §3.2 |
| 0.7 | 2026-11-09 | Aligned with SPEC-0003 v0.6 (owner decisions on the SPEC-0003 review): another tenant's template id returns 400 `formId.invalid` (§5); `revision` in the service response and update request (SPEC-0003 R14) |
| 0.8 | 2026-11-09 | Owner decision (SPEC-0004 review, §9 Q11): the "Serviço" backfill only adds the template to existing tenants with no service template at all (R10) |
| 0.9 | 2026-11-24 | Spec review round 1, changes that need no owner decision. RN-22 removed from `satisfies` (post-MVP; only its terminology is used); SPEC-0004 added to `depends_on`; §2 Dependencies added. R6, R8, R9 and R10 aligned with SPEC-0004 R6, R8, R9 and R11; R7 states the 409. §5 tenant context. §6: `deleteConfirmation.required`, `serviceStatus.invalid`, malformed id, search after trimming, check order (as SPEC-0004 §6). §7: list query semantics, inactivate/reactivate/delete bodies, status and price mapping deferred to `/plan`. §8: emptyFilter, searchHint, loading more and inactivate/reactivate/delete progress and failure rows. AC-0005-02, -03, -04, -12 and -16 rewritten; AC-0005-15 moved to provisional (Q7, Q10); AC-0005-20 to -58 added. Q6 closed (SPEC-0001 §3.2); Q7–Q12 added for the owner |
| 0.10 | 2026-11-24 | Owner answers to §9 Q1–Q3 and Q7–Q12 (Q7: no preference stated, so the proposed answer was taken). R3–R5 decided; R5 adds the currency in requests (Q9); R7 uses `service.has-history` (Q7, Q10); R10 leaves a tenant alone on a name clash or at 200 templates (Q11); new R11 (list follows SPEC-0006, Q8) and R12 (duration display, Q12). §2 adds SPEC-0006 to `depends_on` and the amendment of SPEC-0001 §3.2 to be applied on approval (label "Duração"). §4.1 rewritten on SPEC-0006; §4.3 duration input. §6: `serviceCurrency.*`, `serviceSort.invalid`, template filter, list check order. §7: `hasHistory`, `currency` in requests, `formId`, `sort`, `total`, `updatedAt`. §8 list rows and copy as SPEC-0006. All provisional criteria agreed (AC-0005-15 and -55 to -58 rewritten for `hasHistory` and the list layout); AC-0005-59 to -76 added |
| 0.11 | 2026-11-24 | Spec re-check: the 4 blocking items. New R13 (accepted duration inputs and the edit page's prefill; owner decision at the re-check), §4.3 points to it, §9 Q12 notes it. AC-0005-13 also checks the "Inativos" filter (R6). AC-0005-77 to -79 (unreadable or out-of-range duration), -80 and -81 (edit prefill), -82 (another tenant's template as list filter, §5), -83 (status changed elsewhere) and -84 (history found on delete) added. The re-check's SHOULD-FIX items are follow-ups, not applied |
| 1.0 | 2026-11-24 | Approved by Joao Izidoro, 2026-11-24, confirming §9 Q7 explicitly (409 `service.has-history` instead of RF-12's automatic inactivation). The amendment of SPEC-0001 §3.2 (§2) is applied (SPEC-0001 v1.6) |
| 1.1 | 2026-11-24 | §11 implementation plan drafted by `/plan` (`plan_status` Draft): scope, gaps G-1 to G-7 for the owner, contracts, persistence (`0006_services`, `0007_default_service_template`), API, web, tests mapping AC-0005-01 to -84 and SPEC-0003's service side, deferred checks, sequence, risks. The `scope` label is restored on the §11 fence (re-check SHOULD-FIX 7, first half) |
| 1.2 | 2026-11-24 | Amended at the owner's request with the mobile Services design (2026-11-24); `status` back to Review and `plan_status` Draft. §9 Q13–Q21 record the owner's answers; Q22 lists the details this amendment filled in, to confirm at approval. New R14 (narrow list: title, chips, sections by template, row, floating "+"), R15 (swipe actions, actions menu, history toast) and R16 ("Arquivar" wording). R7, R8 (archive at once with "Desfazer" instead of a confirmation), R11 (sort `form`; narrow screens follow R14/R15 instead of SPEC-0006 §4.6) changed. §2, §4.1, §4.4, §6, §7 (`hasHistory` on list items, sort `form`, the service template summary), §8 updated. AC-0005-13, -55, -83 and -84 reworded to "Arquivar"; AC-0005-76 withdrawn; AC-0005-85 to -113 added. §11 revised: scope (`swipe-row*`, `menu.tsx`, `toast.tsx`), G-8 to G-11, the summary route, the narrow web pieces, tests, deferred checks, sequence, risks, and the `motion` dependency |
| 1.3 | 2026-11-24 | Approved by Joao Izidoro, 2026-11-24, confirming the §9 Q22 details explicitly. `plan_status` stays Draft until the plan is reviewed and approved |
| 1.4 | 2026-11-24 | Plan review (`/spec-review SPEC-0005 plan`), the 3 blocking items: the AC-0003-82 row now checks revision after inactivation, and the "Sim, excluir tudo" check has its own row; `apps/web/package.json` and `pnpm-lock.yaml` join the scope (the `motion` dependency, changed only through pnpm); `SwipeRowGroup` closes the open row on a `scroll` caught on `window`, and W-swipe fires it there (AC-0005-95). The review's SHOULD-FIX items are follow-ups, not applied. `plan_status` stays Draft |
| 1.5 | 2026-11-24 | Plan approved by Joao Izidoro, 2026-11-24 (`plan_status` Approved), after the plan review and its re-check; the proposals of G-1 to G-11 are accepted with it. The review's SHOULD-FIX items stay numbered follow-ups |
| 1.6 | 2026-11-24 | Owner decisions on plan review follow-ups 7a–7d (§9 Q23–Q26): an archived narrow row's history toast has no action (R15, §4.4); the floating "+" opens the [Novo] menu under an archived template's chip, and the template summary carries each template's `status` (R14, §7); chips show placeholders while loading and "Tentar novamente" on failure (R14, §8); the editor's `duration` type name becomes "Duração" (§2, §8). AC-0005-114 to -120 added. §11 updated to match (contracts, API, web, copy, tests, deferred checks, sequence); scope unchanged. `status` and `plan_status` stay Approved: each change is an explicit owner decision |
| 1.7 | 2026-11-25 | Implemented per §11; `status` stays Approved until the owner accepts the behavior on a running system and the manual swipe check of G-8 (iOS Safari, Android Chrome) is recorded. Built: the services contracts and `validation.*` copy; the shared API list helpers (G-2) and web list pieces (G-1), behavior-preserving; the `services` table, `0006_services` and `0007_default_service_template` (seed and backfill of "Serviço"); the services module (list with sort `form` and `hasHistory`, template summary, create, read, update, archive, reactivate, delete); the BFF, `SwipeRow`, the menu and toast additions, and the wide and narrow `/services` UI with copy in both locales; sidebar link; "Duração" label and type name. All 119 in-scope criteria (AC-0005-76 withdrawn) have passing tests. Partly verified, per Deferred checks: AC-0005-15, -55, -58, -84, -99, -101, -111 and -114 (a fake `ServiceHistoryReader`; the first scheduling spec) and AC-0005-91 to -95 (jsdom; the manual phone check). Owner decision at review, 2026-11-25: the narrow list's carry-over of previous rows is dropped; a chip or search change shows the skeleton (§8) |
