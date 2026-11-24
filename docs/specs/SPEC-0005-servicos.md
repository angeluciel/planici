---
id: SPEC-0005
title: Cadastro de serviços
status: Draft # Draft | Review | Approved | Implemented | Superseded
plan_status: Draft # Draft | Approved
version: 0.8
owner: Joao Izidoro
satisfies: [RF-11, RF-12, RF-13, RN-02, RN-06, RN-22, RN-24, RN-25]
depends_on: [SPEC-0001, SPEC-0002, SPEC-0003]
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

## 3. Domain rules

- **R1.** Every service belongs to one tenant and is created from one active `service` template (RN-06,
  SPEC-0003 R1).
- **R2.** **Name**: required, trimmed, repeated spaces collapsed, 1–80 characters. (RN-06)
- **R3.** Names are unique per tenant, ignoring case and accents, counting inactive services. (`assumption`, Q-1)
- **R4.** **Duration**: required, whole minutes, 5–1,440. (RN-06; limits are `assumption`)
- **R5.** **Price**: required, BRL, at least R$ 0,00, at most R$ 999.999,99, with at most 2 decimals. R$ 0,00 is
  allowed (free trial session). (RN-06; bounds and zero are `assumption`)
- **R6.** A service is `active` or `inactive`. Inactive services cannot be used in new appointments or plans, but
  stay in history and reports. (RF-12, RN-06, RN-16)
- **R7.** A service can be deleted permanently only if it is not linked to appointments, plans or financial
  records. Otherwise it can only be inactivated. (RF-12, RN-06, RN-24)
- **R8.** Inactivating asks for confirmation. Deleting requires typing the service name. (RN-25)
- **R9.** The list is sorted by name (ignoring case and accents). Search matches name only, ignoring case and
  accents, as "contains", from 2 characters. (RF-13; search is an `assumption`)
- **R10.** Every tenant has a service template named "Serviço" containing only the service
  system fields. An existing tenant gets it only if it has no service template at all, active or archived; any
  other existing tenant is left alone. (owner decisions, forms-overview.md D-6 and SPEC-0004 §9 Q11)

## 4. Behavior

### 4.1 List (`/services`)
1. The professional opens `/services`.
2. The system lists active services with columns Nome, Duração ("1h 30min"), Preço ("R$ 150,00"), Modelo (R9).
3. Search by name and a status filter (Ativos / Inativos / Todos) work as on `/clients` (SPEC-0004 §4.1).
4. Selecting a row opens the service view page (SPEC-0003 §4.2).

### 4.2 [Novo] dropdown
Same as SPEC-0004 §4.2, with active `service` templates and type `service` locked in the editor shortcut.

### 4.3 Create, view and edit
These follow SPEC-0003 §4.1–§4.3, plus R2–R5. Duration is typed as hours and minutes ("1h 30") or minutes, and
stored as minutes. Price is typed with a pt-BR mask ("150,00").

### 4.4 Inactivate, reactivate and delete
Same as SPEC-0004 §4.4–§4.5, with service wording: "Inativar <name>? O serviço não poderá ser usado em novos
agendamentos, mas o histórico é mantido." The delete hint is "Serviços já utilizados não podem ser excluídos".
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
| Service unknown or in another tenant | 404 | `service.not-found` | — |
| Delete while linked | 409 | `service.in-use` | — |
| Inactivate an inactive / reactivate an active service | 409 | `service.status-unchanged` | — |
| Search query of 1 character | 422 | `serviceSearch.min` | `q` |
| `limit` outside 1–100 or not an integer | 422 | `limit.invalid` | `limit` |
| Cursor malformed, or issued for other filters | 422 | `cursor.invalid` | `after` |

## 7. Contract impact

New, non-breaking. Consumers: `apps/web`; later the scheduling module.

- **Service** (response): `id`, `form` (`{ id, name, version, latestVersion, status }`), `revision` (int, SPEC-0003
  R14), `name`, `durationMinutes` (int), `priceCents` (int, centavos), `currency` (`"BRL"`), `values`,
  `missingRequired`, `status` (`active | inactive`), `inUse` (bool), `createdAt`, `updatedAt`.
- **ServiceSummary** (list item): `id`, `name`, `durationMinutes`, `priceCents`, `currency`, `formId`,
  `formName`, `status`.
- **List**: query `q?`, `status?`, `limit?`, `after?` (`api-convention.md`, Pagination; sort: name, then `id`). Response
  `{ services: ServiceSummary[], nextCursor: string | null }`.
- **Create request**: `formId`, `formVersion`, `name`, `durationMinutes`, `priceCents`, `values`.
- **Update request**: `revision`, `formVersion`, `name`, `durationMinutes`, `priceCents`, `values` (SPEC-0003 §7
  semantics).
- **Money**: `priceCents` is an integer in centavos (`9999` = R$ 99,99) with `currency` beside it, per
  `api-convention.md`, Money. It is the first monetary field in the contracts.
- `schema.dbml` `services.price` is nullable and `duration_minutes` nullable; RN-06 makes both required. Fix in
  data modelling.

## 8. UI states

| Screen | State | Behavior | Copy key |
| --- | --- | --- | --- |
| `/services` | loading | Skeleton rows | `services.list.loading` |
| `/services` | empty | "Nenhum serviço cadastrado." + [Novo] | `services.list.empty` |
| `/services` | no search results | "Nenhum serviço encontrado para “<q>”." | `services.list.noResults` |
| `/services` | error | "Não foi possível carregar os serviços." + retry | `services.list.error` |
| `/services` | success | Table (4.1) | `services.list.title` |
| [Novo] dropdown | no templates | Only "Criar novo modelo" + hint | `services.new.noTemplates` |
| Fill-in / view / edit | all states | As SPEC-0003 §8, with service wording | `services.form.*`, `services.view.*` |
| Fill-in | name taken | Inline under Nome | `validation.serviceName.taken` |
| Inactivate dialog | confirm | 4.4 | `services.inactivate.confirm` |
| Delete dialog | confirm | Typed name enables [Excluir] | `services.delete.confirm` |
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
| 6 | Should the service "description" (in `schema.dbml`) be a system field? | No: a custom long-text field when wanted. | §3.2 of SPEC-0001 |

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
Given tenant "studio-ana" with an active client template "Ficha" and an active service template "Sessão"
When  its owner opens the Novo dropdown on /services
Then  it lists "Criar novo modelo", then "Sessão", and not "Ficha"
```

```
AC-0005-03
Given an owner on the fill-in page of template "Serviço"
When  they submit name "Sessão individual", duration "1h 30", price "150,00"
Then  the response is 201 with name "Sessão individual", durationMinutes 90, priceCents 15000, currency "BRL", status "active"
And   the list shows the row "Sessão individual | 1h 30min | R$ 150,00"
```

```
AC-0005-04
Given an owner on the fill-in page of template "Serviço"
When  they submit an empty name
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
When  the owner opens /services and then searches for "SESSAO"
Then  the list order is "Avaliação", "Retorno", "sessão"
And   the search lists only "sessão"
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
AC-0005-15
Given a service linked to one appointment (once scheduling exists)
When  the owner sends a delete request
Then  the response is 409 with { "error": "service.in-use" }
And   the service still exists
And   the view page offered only "Inativar", with copy key services.delete.inUse
```

```
AC-0005-16
Given a service of tenant "studio-bia"
When  the owner of "studio-ana" reads, updates, inactivates or deletes it with "studio-ana" as active tenant
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
