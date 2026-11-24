---
id: SPEC-0005
title: Cadastro de serviços
status: Draft # Draft | Review | Approved | Implemented | Superseded
plan_status: Draft # Draft | Approved
version: 0.11
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
  client list (SPEC-0006).
- The **[Novo]** dropdown: pick a service template, or "Criar novo modelo".
- Service system attributes: name, duration, price.
- View, edit, inactivate, reactivate and delete a service.
- The default "Serviço" template for each tenant (D-6).

**Out of scope**
- Linking services to appointments (RF-20) and to plans (RF-15, post-MVP).
- Currencies other than BRL, price variations, promotional prices: post-MVP.
- Online booking visibility of a service (RF-23): the public-link spec.
- Service ranking (RF-31): post-MVP.

**Dependencies and amendments**
- SPEC-0001, SPEC-0002, SPEC-0003, SPEC-0004 and SPEC-0006 are implemented. The service create, read and update
  endpoints carry the record shapes and checks of SPEC-0003 §6–§7.
- §4.2 and §4.4 reuse the client behavior of SPEC-0004 by reference; §4.1 reuses the client list of SPEC-0004 §4.1
  as amended by SPEC-0006 (§9 Q8).
- On approval, this spec amends SPEC-0001 §3.2: the default label of `service.duration` becomes "Duração" (§9
  Q12). SPEC-0001 gets the note "amended by SPEC-0005" there, a version bump and a changelog line. Templates that
  already exist keep their label.
- AC-0005-15, -55, -58 and -84 need a service linked to an appointment, which only scheduling can create. Until
  scheduling exists, the link can be seeded directly.

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
  records). Otherwise the delete is rejected with 409 `service.has-history`, and the UI offers only "Inativar".
  (RF-12, RN-06, RN-24; owner decision, §9 Q7, as for clients in SPEC-0004 §9 Q5)
- **R8.** Inactivating asks for confirmation. Deleting requires typing the service name, and the server checks it:
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
  - sorts `name` (default, R9), `-name` and `-updatedAt`, each ending with `id` (SPEC-0006 R4);
  - a cursor bound to the search, the status filter, the template filter and the sort (SPEC-0006 R5);
  - infinite scroll with pages of at most 50, and back to the top when the search, a filter, the sort or the layout
    changes (SPEC-0006 R7, R8);
  - a service's last update time, set when it is created and changed on every edit saved, inactivation and
    reactivation (SPEC-0006 R9);
  - wide and narrow layouts split at 48rem (SPEC-0006 R10).
- **R12.** **Duration display.** A duration shows as minutes under one hour ("45min"), whole hours ("2h"), or hours
  and minutes ("1h 30min"). (owner decision, §9 Q12)
- **R13.** **Duration input.** The duration field accepts, ignoring case and spaces: hours and minutes ("1h 30",
  "1h30", "1h 30min"), whole hours ("1h"), or minutes ("90", "90min"). When hours are given, the minutes are 0–59.
  Anything else is unreadable, for example "1:30", "1h 75", decimals ("1,5h", "90.5") or "abc". The edit page fills
  the field with the display form of R12 ("1h 30min"), which is itself an accepted input. (owner decisions, §9 Q12
  and 2026-11-24 spec re-check)

## 4. Behavior

### 4.1 List (`/services`)
SPEC-0004 §4.1 as amended by SPEC-0006 §4.1–§4.6 applies, with services in place of clients (R11), except:
1. **Row content.** A wide-screen row shows the service's initials, its name (which opens the service view page,
   SPEC-0003 §4.2), below the name its duration (R12) and price ("R$ 150,00") in a quieter style, and the template
   badge on the right. A narrow-screen card shows the initials, the name, the duration and price, the date of the
   last update and the template badge. An inactive service carries the "Inativo" badge just before the template
   badge.
2. **Search** matches the name only (R9). The hint for a short query is "Digite ao menos 2 caracteres para buscar."
3. **Total**: "1 serviço" / "12 serviços".
4. **Template filter**: the "Modelo" control lists the tenant's service templates.
5. **Messages**: "Carregando mais serviços…", "Não foi possível carregar mais serviços.", and the closing block "Isso
   é tudo! Não há mais serviços por aqui."
6. **Narrow screens**: the floating "+" button is named "Novo serviço".

### 4.2 [Novo] dropdown
Same as SPEC-0004 §4.2, with active `service` templates and type `service` locked in the editor shortcut.

### 4.3 Create, view and edit
These follow SPEC-0003 §4.1–§4.3, plus R2–R5. The duration field is labelled "Duração" (§2, amendment of
SPEC-0001 §3.2). It accepts the forms of R13 and stores minutes; the edit page fills it as R13 says. The view page
shows the duration as R12. An unreadable duration (R13), or one outside R4, shows the inline error of
`serviceDuration.invalid` under Duração and sends no request (SPEC-0003 §4.1 step 4). Price is typed with a pt-BR mask ("150,00");
the page sends it with currency "BRL".

### 4.4 Inactivate, reactivate and delete
Same as SPEC-0004 §4.4–§4.5, with service wording: "Inativar <name>? O serviço não poderá ser usado em novos
agendamentos, mas o histórico é mantido." The delete hint is "Serviços já utilizados não podem ser excluídos".
The server checks the typed name (R8).
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
| Sort that is not one of `name`, `-name`, `-updatedAt` | 422 | `serviceSort.invalid` | `sort` |
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
  `status`, `updatedAt` (ISO-8601 UTC). `formName` feeds the template badge.
- **List**: query `q?` (trimmed; blank means no filter, R9), `status?` (`active` default, `inactive`, `all`),
  `formId?` (template filter, R11), `sort?` (`name` default, `-name`, `-updatedAt`), `limit?`, `after?`
  (`api-convention.md`, Pagination). Response `{ services: ServiceSummary[], nextCursor: string | null, total:
  number }`.
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
| `/services` | success, narrow screen | Cards under letter headings: initials, name, duration and price, last-update date, template badge (4.1); total above them | `services.list.title`, `services.list.count` |
| `/services` | inactive service (wide and narrow) | "Inativo" badge just before the template badge | `services.list.inactiveBadge` |
| `/services` | template filter (wide) | "Modelo" control with "Todos os modelos" and each service template; archived ones followed by "(arquivado)"; shown only with two or more service templates | `services.list.filter.form`, `services.list.filter.allForms`, `services.list.filter.archivedForm` |
| `/services` | sort (wide) | "Ordenar por" control with "Nome (A–Z)", "Nome (Z–A)", "Última atualização" | `services.list.sort.label`, `services.list.sort.nameAsc`, `services.list.sort.nameDesc`, `services.list.sort.updatedAt` |
| `/services` | narrow screen | No template or sort control; always A–Z; floating "+" button opens [Novo] | `services.new.floating` |
| `/services` | loading the next page | Indicator below the rows, "Carregando mais serviços…" | `services.list.loadingMore` |
| `/services` | next page failed | Rows kept; "Não foi possível carregar mais serviços." + retry; no automatic request until retry | `services.list.loadMoreError` |
| `/services` | end of list | Illustration (decorative) and "Isso é tudo! Não há mais serviços por aqui." below the last row | `services.list.end` |
| `/services` | next page loaded | Polite announcement of loaded / total, focus unchanged | `services.list.loadedCount` |
| [Novo] dropdown | no templates | Only "Criar novo modelo" + hint | `services.new.noTemplates` |
| Fill-in / view / edit | all states | As SPEC-0003 §8, with service wording | `services.form.*`, `services.view.*` |
| Fill-in | name taken | Inline under Nome | `validation.serviceName.taken` |
| Fill-in | duration unreadable or out of range | Inline under Duração; no request | `validation.serviceDuration.invalid` |
| Inactivate dialog | confirm | 4.4 | `services.inactivate.confirm` |
| Inactivate / reactivate | in progress | Button disabled with spinner | `services.inactivate.inProgress`, `services.reactivate.inProgress` |
| Inactivate / reactivate | failed | Error toast; status kept | `services.inactivate.error`, `services.reactivate.error` |
| Inactivate / reactivate | status already changed (409) | Service reloaded + toast "O status deste serviço já foi alterado." | `services.status.unchanged` |
| Delete dialog | confirm | Typed name enables [Excluir] | `services.delete.confirm` |
| Delete dialog | in progress | [Excluir] disabled with spinner | `services.delete.inProgress` |
| Delete dialog | failed | Error toast; service kept | `services.delete.error` |
| Delete dialog | history found on delete (409) | Dialog closes, page reloads with only "Inativar" + hint | `services.delete.hasHistory` |
| Delete action | disabled (history) | Hint (4.4) | `services.delete.hasHistory` |
| Toasts | created / saved / inactivated / reactivated / deleted | — | `services.toast.*` |

Copy specific to services (other list copy as SPEC-0006 §8, under `services.*`):
- `services.list.count`: "{count, plural, one {# serviço} other {# serviços}}" / "{count, plural, one {# service}
  other {# services}}"
- `services.list.loadingMore`: "Carregando mais serviços…" / "Loading more services…"
- `services.list.end`: "Isso é tudo! Não há mais serviços por aqui." / "That's all! No more services here."
- `services.list.loadedCount`: "{loaded} de {total} serviços carregados" / "{loaded} of {total} services loaded"
- `services.new.floating`: "Novo serviço" / "New service"
- `validation.serviceSort.invalid`: "Ordenação inválida." / "Invalid sort."

## 9. Open questions

| # | Question | Answer | Blocks |
| --- | --- | --- | --- |
| 1 | ~~Should service names be unique per tenant (R3)? The RFC does not say.~~ | **Decided (owner, 2026-11-24):** yes, ignoring case and accents, counting inactive services (R3). | — |
| 2 | ~~Duration bounds 5–1,440 minutes, any minute value?~~ | **Decided (owner, 2026-11-24):** yes; no 5-minute step (R4). | — |
| 3 | ~~Price R$ 0,00 allowed? Upper bound?~~ | **Decided (owner, 2026-11-24):** yes; max R$ 999.999,99 (R5). | — |
| 4 | ~~Money representation.~~ | **Decided (D-9):** `priceCents` + `currency` (`api-convention.md`, Money). | — |
| 5 | ~~Default "Serviço" template.~~ | **Decided (D-6):** yes. | — |
| 6 | ~~Should the service "description" (in `schema.dbml`) be a system field?~~ | **Decided in SPEC-0001 §3.2:** no. The service system fields are name, duration and price; a description is a custom long-text field when wanted. | — |
| 7 | ~~RF-12 says deleting a service with links "resulta em inativação". Should the API instead return 409 and the UI offer only "Inativar"?~~ | **Decided (owner, 2026-11-24, no preference stated; the proposed answer was taken):** yes, as for clients (SPEC-0004 §9 Q5) (R7). | — |
| 8 | ~~Should `/services` follow the SPEC-0006 list pattern (SPEC-0006 Q19)?~~ | **Decided (owner, 2026-11-24):** yes (R11, §4.1, §7, §8). SPEC-0006 joins `depends_on`. | — |
| 9 | ~~Should create and update requests carry `currency`?~~ | **Decided (owner, 2026-11-24):** yes, required, only `"BRL"` (R5, §6, §7). | — |
| 10 | ~~`inUse` / `service.in-use` or SPEC-0004's `hasHistory` / `has-history`?~~ | **Decided (owner, 2026-11-24):** match SPEC-0004: `hasHistory`, `service.has-history`, `services.delete.hasHistory`. | — |
| 11 | ~~The "Serviço" backfill when the name is taken by a client template or the tenant has 200 templates.~~ | **Decided (owner, 2026-11-24):** leave that tenant alone (R10). | — |
| 12 | ~~Duration label "Duração (minutos)" (SPEC-0001 §3.2) vs typed "1h 30"; display format.~~ | **Decided (owner, 2026-11-24):** label "Duração" (amends SPEC-0001 §3.2 on approval, §2); input "1h 30", "1h" or minutes; display "45min", "2h", "1h 30min" (§4.3, R12). The full list of accepted inputs and the edit page's prefill were decided at the spec re-check (owner, 2026-11-24; R13). | — |

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
When  the owner inactivates it after confirming
Then  the response is 200 with status "inactive"
And   it no longer appears in /services with the default filter
And   it appears with the "Inativo" badge with copy key services.list.inactiveBadge under the "Inativos" filter
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
And   "Inativar" is offered with the hint with copy key services.delete.hasHistory
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
And   the service is then inactivated in another tab
When  the owner confirms "Inativar"
Then  the page reloads the service, showing it as inactive, with the toast with copy key services.status.unchanged
```

```
AC-0005-84
Given the owner on the view page of service "Sessão individual" while it had no linked history
And   an appointment is then linked to the service
When  the owner confirms the delete dialog
Then  the dialog closes and the page offers only "Inativar" with the hint with copy key services.delete.hasHistory
```

### Provisional criteria

None. Every open question is answered.

## 11. Implementation plan

Written by `/plan` after the spec is Approved. Empty until then.

```

```

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
