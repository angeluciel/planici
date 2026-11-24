---
id: SPEC-0005
title: Cadastro de serviços
status: Draft # Draft | Review | Approved | Implemented | Superseded
plan_status: Draft # Draft | Approved
version: 0.9
owner: Joao Izidoro
satisfies: [RF-11, RF-12, RF-13, RN-02, RN-06, RN-24, RN-25]
depends_on: [SPEC-0001, SPEC-0002, SPEC-0003, SPEC-0004]
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
- `/services` list and name search.
- The **[Novo]** dropdown: pick a service template, or "Criar novo modelo".
- Service system attributes: name, duration, price.
- View, edit, inactivate, reactivate and delete a service.
- The default "Serviço" template for each tenant (D-6).

**Out of scope**
- Linking services to appointments (RF-20) and to plans (RF-15, post-MVP).
- Currencies other than BRL, price variations, promotional prices: post-MVP.
- Online booking visibility of a service (RF-23): the public-link spec.
- Service ranking (RF-31): post-MVP.

**Dependencies**
- SPEC-0001, SPEC-0002 and SPEC-0003 are implemented. The service create, read and update endpoints carry the
  record shapes and checks of SPEC-0003 §6–§7.
- §4.1, §4.2 and §4.4 reuse the client behavior of SPEC-0004 by reference.
- AC-0005-15, -55 and -58 need a service linked to an appointment, which only scheduling can create. Until
  scheduling exists, the link can be seeded directly.

## 3. Domain rules

- **R1.** Every service belongs to one tenant and is created from one active `service` template (RN-06,
  SPEC-0003 R1).
- **R2.** **Name**: required, trimmed, repeated spaces collapsed, 1–80 characters. (RN-06)
- **R3.** Names are unique per tenant, ignoring case and accents, counting inactive services. (`assumption`, Q-1)
- **R4.** **Duration**: required, whole minutes, 5–1,440. (RN-06; limits are `assumption`)
- **R5.** **Price**: required, BRL, at least R$ 0,00, at most R$ 999.999,99, with at most 2 decimals. R$ 0,00 is
  allowed (free trial session). (RN-06; bounds and zero are `assumption`)
- **R6.** A service is `active` or `inactive`. Inactive services are hidden from the default list and cannot be
  used in new appointments or plans, but remain viewable, editable and searchable with the status filter, and stay
  in history and reports. (RF-12, RN-06, RN-16; as SPEC-0004 R6)
- **R7.** A service can be deleted permanently only if it is not linked to appointments, plans or financial
  records. Otherwise the delete is rejected with 409 `service.in-use`, and the UI offers only "Inativar". (RF-12,
  RN-06, RN-24; the 409 instead of RF-12's automatic inactivation is §9 Q7)
- **R8.** Inactivating asks for confirmation. Deleting requires typing the service name, and the server checks it:
  the typed name is compared with the service's name after trimming leading and trailing spaces, otherwise exactly,
  as for templates (SPEC-0001 R9) and clients (SPEC-0004 R8). (RN-25)
- **R9.** The list is sorted by name (ignoring case and accents), then by `id`. Search uses the query after
  trimming; a blank query means no filter. A query of 2 or more characters matches services whose name contains
  it, ignoring case and accents. A 1-character query is rejected. (RF-13; search is an `assumption`; trimming and
  blank query as SPEC-0004 R9)
- **R10.** Every tenant has a service template named "Serviço" containing only the service system fields, from the
  moment the tenant exists. It is an ordinary template: editable, archivable and deletable under the same rules as
  any other template (SPEC-0001 R8). An existing tenant gets it only if it has no service template at all, active
  or archived; any other existing tenant is left alone. What the backfill does when the name or the template limit
  is in the way is §9 Q11. (owner decisions, forms-overview.md D-6 and SPEC-0004 §9 Q11)

## 4. Behavior

### 4.1 List (`/services`)
1. The professional opens `/services`.
2. The system lists active services with columns Nome, Duração ("1h 30min"), Preço ("R$ 150,00"), Modelo (R9).
3. Search by name and a status filter (Ativos / Inativos / Todos) work as on `/clients` (SPEC-0004 §4.1).
4. Selecting a row opens the service view page (SPEC-0003 §4.2).

_Steps 2 and 3 wait on §9 Q8: whether `/services` follows the SPEC-0006 list pattern, which replaced the table of
SPEC-0004 §4.1._

### 4.2 [Novo] dropdown
Same as SPEC-0004 §4.2, with active `service` templates and type `service` locked in the editor shortcut.

### 4.3 Create, view and edit
These follow SPEC-0003 §4.1–§4.3, plus R2–R5. Duration is typed as hours and minutes ("1h 30") or minutes, and
stored as minutes. Price is typed with a pt-BR mask ("150,00"). The duration label and display format wait on
§9 Q12.

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
| Create service | 401 | — | 201 | 400 `formId.invalid` (SPEC-0003) |
| Read / update service | 401 | — | 200 | 404 `service.not-found` |
| Inactivate / reactivate | 401 | — | 200 | 404 `service.not-found` |
| Delete service | 401 | — | 204 | 404 `service.not-found` |

A tenant context without membership returns 404 `tenant.not-found`. Every action above is tenant-scoped and
follows `api-convention.md`, Tenant context: a request without tenant context returns 400 `tenant.required`, and a
request whose active tenant is inactive (suspended) returns 403 `tenant.inactive`.

## 6. Errors

Template, template-version, revision and custom-field value errors are in SPEC-0003 §6.

| Situation | Status | `error` key | `field` |
| --- | --- | --- | --- |
| Name missing or blank | 422 | `serviceName.required` | `name` |
| Name over 80 characters | 422 | `serviceName.max` | `name` |
| Name used by another service of the tenant | 409 | `serviceName.taken` | `name` |
| Duration missing | 422 | `serviceDuration.required` | `durationMinutes` |
| Duration not a whole number in 5–1,440 | 422 | `serviceDuration.invalid` | `durationMinutes` |
| Price missing | 422 | `servicePrice.required` | `priceCents` |
| Price negative | 422 | `servicePrice.negative` | `priceCents` |
| Price above the maximum or not an integer | 422 | `servicePrice.invalid` | `priceCents` |
| Service unknown, malformed service id, or service of another tenant | 404 | `service.not-found` | — |
| Delete with the typed name missing or wrong (R8) | 400 | `deleteConfirmation.required` | `confirmName` |
| Delete while linked | 409 | `service.in-use` | — |
| Inactivate an inactive / reactivate an active service | 409 | `service.status-unchanged` | — |
| Search query of 1 character after trimming | 422 | `serviceSearch.min` | `q` |
| `status` filter not `active`, `inactive` or `all` | 422 | `serviceStatus.invalid` | `status` |
| `limit` outside 1–100 or not an integer | 422 | `limit.invalid` | `limit` |
| Cursor malformed, or issued for other filters | 422 | `cursor.invalid` | `after` |

**Check order for create and update.** Service checks run inside the order of SPEC-0003 §6. After its steps 1–4
(request shape, template or record, template version, revision), the checks run in this order, and the first
failure is the response (as SPEC-0004 §6; SPEC-0003 G-8):
1. Name, then duration, then price (`serviceName.*`, `serviceDuration.*`, `servicePrice.*`).
2. Custom values (SPEC-0003 §6 step 5).
3. `serviceName.taken`, last, because it needs the database.

So a blank name together with an invalid custom value returns `serviceName.required`.

**Other actions.** Delete: 404 `service.not-found`, then 400 `deleteConfirmation.required`, then 409
`service.in-use`, as for templates (SPEC-0001 §6) and clients (SPEC-0004 §6). Inactivate and reactivate: 404, then
409 `service.status-unchanged`. List: `q`, `status`, `limit`, then `after` (if §9 Q8 adopts the SPEC-0006 list:
`q`, `status`, `formId`, `sort`, `limit`, then `after`).

## 7. Contract impact

New, non-breaking. Consumers: `apps/web`; later the scheduling module.

- **Service** (response): `id`, `form` (`{ id, name, version, latestVersion, status }`), `revision` (int, SPEC-0003
  R14), `name`, `durationMinutes` (int), `priceCents` (int, centavos), `currency` (`"BRL"`), `values`,
  `missingRequired`, `status` (`active | inactive`), `inUse` (bool), `createdAt`, `updatedAt`.
- **ServiceSummary** (list item): `id`, `name`, `durationMinutes`, `priceCents`, `currency`, `formId`,
  `formName`, `status`.
- **List**: query `q?` (trimmed; blank means no filter, R9), `status?` (`active` default, `inactive`, `all`),
  `limit?`, `after?` (`api-convention.md`, Pagination; sort: name ignoring case and accents, then `id`, R9).
  Response `{ services: ServiceSummary[], nextCursor: string | null }`. If §9 Q8 adopts the SPEC-0006 list, the
  query adds `formId?` and `sort?`, and the response adds `total` (SPEC-0006 §7).
- **Create request**: `formId`, `formVersion`, `name`, `durationMinutes`, `priceCents`, `values`.
- **Update request**: `revision`, `formVersion`, `name`, `durationMinutes`, `priceCents`, `values` (SPEC-0003 §7
  semantics).
- Whether create and update requests also carry `currency` is §9 Q9.
- **Inactivate / reactivate**: no body; response 200 with the full Service.
- **Delete**: body `{ confirmName }` (R8); response 204.
- Endpoint paths and verbs for inactivate, reactivate and delete are set in `/plan`, as for clients.
- **Money**: `priceCents` is an integer in centavos (`9999` = R$ 99,99) with `currency` beside it, per
  `api-convention.md`, Money. It is the first monetary field in the contracts.
- The status value `inactive` is final in the contract. How it maps to `schema.dbml` `services.status`
  (`record_status`: `active | suspended | deleted`) is decided in `/plan`, as for clients (SPEC-0004 §9 Q3). So is
  how `priceCents` maps to `services.price` (`numeric(10,2)`).
- `schema.dbml` `services.price` is nullable and `duration_minutes` nullable; RN-06 makes both required. Fix in
  data modelling.

## 8. UI states

| Screen | State | Behavior | Copy key |
| --- | --- | --- | --- |
| `/services` | loading | Skeleton rows | `services.list.loading` |
| `/services` | empty (no services at all) | "Nenhum serviço cadastrado." + [Novo] | `services.list.empty` |
| `/services` | empty under the chosen filter | "Nenhum serviço com este filtro." | `services.list.emptyFilter` |
| `/services` | no search results | "Nenhum serviço encontrado para “<q>”." | `services.list.noResults` |
| `/services` | search too short | Hint "Digite ao menos 2 caracteres para buscar."; no request | `services.list.searchHint` |
| `/services` | error | "Não foi possível carregar os serviços." + retry | `services.list.error` |
| `/services` | success | Table (4.1); layout waits on §9 Q8 | `services.list.title` |
| `/services` | loading more | Indicator while the next page loads; how the next page is requested waits on §9 Q8 | `services.list.loadingMore` |
| `/services` | loading more failed | "Não foi possível carregar mais serviços." + retry; loaded rows kept | `services.list.loadMoreError` |
| [Novo] dropdown | no templates | Only "Criar novo modelo" + hint | `services.new.noTemplates` |
| Fill-in / view / edit | all states | As SPEC-0003 §8, with service wording | `services.form.*`, `services.view.*` |
| Fill-in | name taken | Inline under Nome | `validation.serviceName.taken` |
| Inactivate dialog | confirm | 4.4 | `services.inactivate.confirm` |
| Inactivate / reactivate | in progress | Button disabled with spinner | `services.inactivate.inProgress`, `services.reactivate.inProgress` |
| Inactivate / reactivate | failed | Error toast; status kept | `services.inactivate.error`, `services.reactivate.error` |
| Inactivate / reactivate | status already changed (409) | Service reloaded + toast "O status deste serviço já foi alterado." | `services.status.unchanged` |
| Delete dialog | confirm | Typed name enables [Excluir] | `services.delete.confirm` |
| Delete dialog | in progress | [Excluir] disabled with spinner | `services.delete.inProgress` |
| Delete dialog | failed | Error toast; service kept | `services.delete.error` |
| Delete dialog | in use found on delete (409) | Dialog closes, page reloads with only "Inativar" + hint | `services.delete.inUse` |
| Delete action | disabled (in use) | Hint (4.4) | `services.delete.inUse` |
| Toasts | created / saved / inactivated / reactivated / deleted | — | `services.toast.*` |

## 9. Open questions

| # | Question | Proposed answer | Blocks |
| --- | --- | --- | --- |
| 1 | Should service names be unique per tenant (R3)? The RFC does not say. | Yes. Two "Sessão individual" in a dropdown would be ambiguous when scheduling. | R3 |
| 2 | Duration bounds 5–1,440 minutes, any minute value? | Yes; no 5-minute step. | R4 |
| 3 | Price R$ 0,00 allowed? Upper bound? | Yes; max R$ 999.999,99. | R5 |
| 4 | ~~Money representation.~~ | **Decided (D-9):** `priceCents` + `currency` (`api-convention.md`, Money). | — |
| 5 | ~~Default "Serviço" template.~~ | **Decided (D-6):** yes. | — |
| 6 | ~~Should the service "description" (in `schema.dbml`) be a system field?~~ | **Decided in SPEC-0001 §3.2:** no. The service system fields are name, duration and price; a description is a custom long-text field when wanted. | — |
| 7 | RF-12 says deleting a service with links "resulta em inativação". Here the API returns 409 `service.in-use` and the UI offers only "Inativar" (R7). Acceptable? forms-overview C-7 leaves this unreviewed for services. | Yes, as decided for clients (SPEC-0004 §9 Q5). | R7, AC-0005-15, -55, §8 delete rows |
| 8 | Should `/services` follow the SPEC-0006 list pattern (sort options, total, infinite scroll, closing message "…não há mais serviços por aqui."), as SPEC-0006 Q19 proposes? | Yes: §4.1 becomes "SPEC-0004 §4.1 as amended by SPEC-0006 applies, with service fields", SPEC-0006 joins `depends_on`, and §7 gains `formId?`, `sort?`, `total` and the meaning of `updatedAt`. | §4.1 steps 2–3, §7 List, §8 list rows, AC-0005-57 |
| 9 | Should create and update requests carry `currency`? `api-convention.md` (Money) says to send the ISO 4217 code beside the amount; §7 sends only `priceCents`. | Yes: `currency` required, only `"BRL"` accepted; anything else returns 422 `serviceCurrency.invalid`. | §6, §7 |
| 10 | This spec names a service with linked records `inUse`, `service.in-use` and `services.delete.inUse`; SPEC-0004 names the same idea `hasHistory`, `client.has-history` and `clients.delete.hasHistory`. Which naming? | Match SPEC-0004: `hasHistory`, `service.has-history`, `services.delete.hasHistory`. | §6, §7, §8, AC-0005-15, -55, -58 |
| 11 | The "Serviço" backfill (R10) for an existing tenant with no service template: what if a client template is already named "Serviço" (SPEC-0001 R4, names unique across types), or the tenant already has 200 templates (SPEC-0001 R19)? | Leave that tenant alone; its owner creates a service template with "Criar novo modelo". | R10 |
| 12 | SPEC-0001 §3.2 labels the duration field "Duração (minutos)", but §4.3 accepts "1h 30". Which label, and how are durations under one hour and whole hours shown? | Label "Duração" (SPEC-0001 §3.2 amended); input accepts "1h 30", "1h" or minutes ("90"); display "45min", "2h", "1h 30min". | §4.3, AC-0005-56, -57 |

## 10. Acceptance criteria

### Agreed criteria

These follow from the RFC or from decisions the owner has already taken (forms-overview.md §3).

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
When  they create a service from template "Serviço" with name "Sessão individual", durationMinutes 90 and priceCents 15000
Then  the response is 201 with name "Sessão individual", durationMinutes 90, priceCents 15000, currency "BRL", status "active"
```

```
AC-0005-04
Given an owner of "studio-ana"
When  they create a service from template "Serviço" with name "   " and a valid duration and price
Then  the response is 422 with { "error": "serviceName.required", "field": "name" }
```

```
AC-0005-06
Given tenant "studio-bia" has a service "Sessão individual"
When  the owner of "studio-ana" creates a service named "Sessão individual"
Then  the response is 201
```

```
AC-0005-09
Given an owner creating a service
When  they submit priceCents -1
Then  the response is 422 with { "error": "servicePrice.negative", "field": "priceCents" }
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
```

```
AC-0005-14
Given a service not linked to any appointment, plan or payment
When  the owner types its name in the delete dialog and confirms
Then  the response is 204
And   reading it returns 404 with { "error": "service.not-found" }
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
Then  the create request carries priceCents 15000
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
When  they create a service from template "Serviço" with a valid name and duration and no priceCents
Then  the response is 422 with { "error": "servicePrice.required", "field": "priceCents" }
```

```
AC-0005-27
Given an owner of "studio-ana"
When  they create a service from template "Serviço" with a valid name and duration and priceCents 15000.5
Then  the response is 422 with { "error": "servicePrice.invalid", "field": "priceCents" }
```

```
AC-0005-28
Given a service "Sessão individual" with durationMinutes 90 and priceCents 15000
When  the owner updates it with name "Sessão dupla", durationMinutes 120 and priceCents 25000
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
Given a service "Sessão individual" not linked to any appointment, plan or payment
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
Given tenant "studio-ana" with 120 active services and the first page shown on /services
When  the next page is requested and the request fails with 500
Then  the page shows copy key services.list.loadMoreError with a retry control
And   the services of the first page are still shown
```

### Provisional criteria

These depend on open questions that are not answered yet. They are **not agreed behavior** and must not be turned into tests until the owner answers. On an answer, each one is confirmed, rewritten, or withdrawn (withdrawn IDs are not reused).

**AC-0005-05**: depends on §9 Q1 (service-name uniqueness).

```
AC-0005-05
Given tenant "studio-ana" with an inactive service "Sessão individual"
When  its owner creates a service named "sessao  individual"
Then  the response is 409 with { "error": "serviceName.taken", "field": "name" }
```

**AC-0005-07**: depends on §9 Q2 (duration bounds).

```
AC-0005-07
Given an owner creating a service
When  they submit durationMinutes 4
Then  the response is 422 with { "error": "serviceDuration.invalid", "field": "durationMinutes" }
```

**AC-0005-08**: depends on §9 Q2 (duration bounds).

```
AC-0005-08
Given an owner creating a service
When  they submit durationMinutes 1441
Then  the response is 422 with { "error": "serviceDuration.invalid", "field": "durationMinutes" }
```

**AC-0005-10**: depends on §9 Q3 (R$ 0,00 allowed).

```
AC-0005-10
Given an owner creating a service
When  they submit priceCents 0
Then  the response is 201 with priceCents 0
```

**AC-0005-11**: depends on §9 Q3 (price upper bound).

```
AC-0005-11
Given an owner creating a service
When  they submit priceCents 100000000 (R$ 1.000.000,00)
Then  the response is 422 with { "error": "servicePrice.invalid", "field": "priceCents" }
```

**AC-0005-15**: depends on §9 Q7 (409 instead of automatic inactivation) and Q10 (naming).

```
AC-0005-15
Given a service "Sessão individual" with one linked appointment
When  the owner sends a delete request with confirmName "Sessão individual"
Then  the response is 409 with { "error": "service.in-use" }
And   the service still exists
```

**AC-0005-55**: depends on §9 Q7 and Q10.

```
AC-0005-55
Given a service "Sessão individual" with one linked appointment
When  the owner opens the service's view page
Then  no "Excluir" action is offered
And   "Inativar" is offered with the hint with copy key services.delete.inUse
```

**AC-0005-56**: depends on §9 Q12 (duration input).

```
AC-0005-56
Given the owner on the fill-in page of template "Serviço" with a valid name and price
When  they type "1h 30" in the duration field and press Salvar
Then  the create request carries durationMinutes 90
```

**AC-0005-57**: depends on §9 Q8 (list layout) and Q12 (duration display).

```
AC-0005-57
Given a service "Sessão individual" from template "Serviço" with durationMinutes 90 and priceCents 15000
When  the owner opens /services
Then  its row shows "Sessão individual", "1h 30min", "R$ 150,00" and "Serviço"
```

**AC-0005-58**: depends on §9 Q10 (naming).

```
AC-0005-58
Given a service "Sessão individual" with one linked appointment and a service "Avaliação" with none
When  the owner reads each of them
Then  "Sessão individual" has inUse true and "Avaliação" has inUse false
```

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
