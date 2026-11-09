---
id: SPEC-0004
title: Cadastro de clientes
status: Draft # Draft | Review | Approved | Implemented | Superseded
plan_status: Draft # Draft | Approved
version: 0.2
owner: TBD
satisfies: [RF-07, RF-08, RF-09, RN-02, RN-04, RN-05, RN-24, RN-25]
depends_on: [SPEC-0001, SPEC-0002, SPEC-0003]
phase: MVP
ticket: -
---

# SPEC-0004 — Cadastro de clientes

## 1. Purpose

The professional keeps a list of their clients, each created from a client template, so every client carries the
information that professional needs (RFC §1, problem statement; §2.2.2, UC-07–UC-10). This spec covers the
`/clients` screens and the client-specific rules. Template filling is shared with services in SPEC-0003.

## 2. Scope

**In scope**
- `/clients` list, search and status filter.
- The **[Novo]** dropdown: pick a client template, or "Criar novo modelo".
- Client system attributes: name, e-mail, phone.
- E-mail uniqueness per tenant.
- View, edit, inactivate, reactivate and delete a client.
- The default "Cliente" template for each tenant (D-6).

**Out of scope**
- Client history of appointments and payments (RF-10): the scheduling and payments specs. The client view
  page leaves room for it.
- Importing clients (CSV), merging duplicates, client photo (`avatar_url`): post-MVP.
- Searching by custom-field values: post-MVP (SPEC-0003).
- Data export and erasure requests (RNF-13, RNF-14): handled manually through the DPO channel in the MVP.

## 3. Domain rules

- **R1.** Every client belongs to one tenant and is created from one active `client` template (RN-04, SPEC-0003 R1).
- **R2.** **Name**: required, trimmed, repeated spaces collapsed, 1–120 characters. (RN-04)
- **R3.** **E-mail**: required, trimmed, lowercased, valid address. (RN-04, `api-convention.md` normalisation)
- **R4.** **Phone**: optional unless the client's template makes `client.phone` required. When given, it follows
  the `phone` rule of SPEC-0003 §3.1. (RF-07, RN-04)
- **R5.** No two clients of the same tenant share an e-mail, after normalisation, **counting inactive clients**.
  (RN-04; counting inactive clients is an `assumption`)
- **R6.** A client is `active` or `inactive`. Inactive clients are hidden from the default list and from any future
  client picker (scheduling), but remain viewable, editable and searchable with the filter. (RF-08, RN-05)
- **R7.** A client can be deleted permanently only if it has no linked history (appointments, payments; later
  plans and extra forms). Otherwise it can only be inactivated. (RF-08, RN-05, RN-24)
- **R8.** Inactivating asks for confirmation. Deleting requires typing the client's name. (RN-25)
- **R9.** Search matches the query against name or e-mail, ignoring case and accents, as "contains", from 2
  characters. (RF-09)
- **R10.** The list is sorted by name (ignoring case and accents), then by creation order. (`assumption`)
- **R11.** Every tenant has a client template named "Cliente" containing only the client system
  fields, from the moment the tenant exists. It is an ordinary template: editable, archivable, deletable while
  unused. Existing tenants get it too. (owner decision, forms-overview.md D-6)

## 4. Behavior

### 4.1 List (`/clients`)
1. The professional opens `/clients`.
2. The system lists active clients with columns Nome, E-mail, Telefone, Modelo (R10). Custom-field values never
   appear here (SPEC-0003 R9).
3. A search box filters by name or e-mail as the professional types (R9; debounced).
4. A status filter offers "Ativos" (default), "Inativos" and "Todos". Inactive rows carry an "Inativo" badge.
5. Selecting a row opens the client view page (SPEC-0003 §4.2).

### 4.2 [Novo] dropdown
1. The professional presses **[Novo]**.
2. The dropdown shows **"Criar novo modelo"** first, a divider, then every **active** client template by name.
3. Picking a template opens the fill-in page for it (SPEC-0003 §4.1).
4. Picking "Criar novo modelo" opens the template editor with type `client` locked (SPEC-0001 §4.3). After saving,
   the professional lands on the fill-in page of the new template.
5. If there are no active client templates, the dropdown shows only "Criar novo modelo" and the hint "Crie um
   modelo para cadastrar clientes".

### 4.3 Create, view and edit
These follow SPEC-0003 §4.1–§4.3, plus R2–R5. The name, e-mail and phone inputs are the template's system fields,
in the template's position and with its labels.

### 4.4 Inactivate and reactivate
1. On the view page, **"Inativar"** asks "Inativar <name>? O cliente sai da lista principal, mas o histórico é
   mantido." On confirm, the client becomes inactive and the toast "Cliente inativado" appears.
2. On an inactive client, **"Reativar"** makes it active again without confirmation.

### 4.5 Delete
1. **"Excluir"** is offered only if the client has no linked history (R7). Otherwise only "Inativar" is offered,
   with the hint "Clientes com histórico não podem ser excluídos".
2. The dialog asks the professional to type the client's name. On confirm, the client and all its values are
   removed permanently and the professional returns to `/clients` with the toast "Cliente excluído".

## 5. Permissions and tenant isolation

| Action | Unauthenticated | Member | Owner | Other tenant |
| --- | --- | --- | --- | --- |
| List / search clients | 401 | — (post-MVP) | 200, own tenant only | 404 `tenant.not-found` |
| Create client | 401 | — | 201 | 422 `formId.invalid` (SPEC-0003) |
| Read / update client | 401 | — | 200 | 404 `client.not-found` |
| Inactivate / reactivate | 401 | — | 200 | 404 `client.not-found` |
| Delete client | 401 | — | 204 | 404 `client.not-found` |

E-mail uniqueness (R5) is per tenant. Another tenant using the same e-mail is never revealed.

## 6. Errors

Value errors for custom fields are in SPEC-0003 §6.

| Situation | Status | `error` key | `field` |
| --- | --- | --- | --- |
| Name missing or blank | 422 | `clientName.required` | `name` |
| Name over 120 characters | 422 | `clientName.too-long` | `name` |
| E-mail missing or blank | 422 | `email.required` (existing) | `email` |
| E-mail invalid | 422 | `email.invalid` (existing) | `email` |
| Phone required by template and missing | 422 | `phone.required` | `phone` |
| Phone invalid | 422 | `phone.invalid` | `phone` |
| E-mail used by another client of the tenant | 409 | `clientEmail.taken` | `email` |
| Client unknown or in another tenant | 404 | `client.not-found` | — |
| Delete with linked history | 409 | `client.has-history` | — |
| Inactivate an inactive / reactivate an active client | 409 | `client.status-unchanged` | — |
| Search query of 1 character | 422 | `clientSearch.too-short` | `q` |
| `limit` outside 1–100 or not an integer | 422 | `limit.invalid` | `limit` |
| Cursor malformed, or issued for other filters | 422 | `cursor.invalid` | `after` |

## 7. Contract impact

New, non-breaking. Consumers: `apps/web`.

- **Client** (response): `id`, `form` (`{ id, name, version, status }`), `name`, `email`, `phone` (string | null),
  `values`, `missingRequired`, `status` (`active | inactive`), `hasHistory` (bool), `createdAt`, `updatedAt`.
- **ClientSummary** (list item): `id`, `name`, `email`, `phone`, `formId`, `formName`, `status`.
- **List**: query `q?`, `status?` (`active` default, `inactive`, `all`), `limit?`, `after?` (`api-convention.md`, Pagination;
  sort: name ignoring case and accents, then `id`).
  Response `{ clients: ClientSummary[], nextCursor: string | null }`.
- **Create request**: `formId`, `formVersion`, `name`, `email`, `phone?`, `values`.
- **Update request**: `formVersion`, `name`, `email`, `phone?`, `values` (SPEC-0003 §7 semantics).
- **Inactivate / reactivate / delete**: no body. Endpoint convention to be set in `/plan` (same gap as SPEC-0001
  Q-5).
- `schema.dbml` `clients.status` uses `record_status` (`active | suspended | deleted`). The contract says
  `inactive`, mapping to be settled in data modelling (Q-3).

## 8. UI states

| Screen | State | Behavior | Copy key |
| --- | --- | --- | --- |
| `/clients` | loading | Skeleton rows | `clients.list.loading` |
| `/clients` | empty (no clients at all) | "Nenhum cliente cadastrado." + [Novo] | `clients.list.empty` |
| `/clients` | no search results | "Nenhum cliente encontrado para “<q>”." | `clients.list.noResults` |
| `/clients` | error | "Não foi possível carregar os clientes." + retry | `clients.list.error` |
| `/clients` | success | Table (4.1) | `clients.list.title` |
| `/clients` | loading more | "Carregar mais" button at list end while `nextCursor` is not null; spinner while loading | `clients.list.loadingMore` |
| [Novo] dropdown | no templates | Only "Criar novo modelo" + hint | `clients.new.noTemplates` |
| Fill-in / view / edit | all states | As SPEC-0003 §8, with client wording | `clients.form.*`, `clients.view.*` |
| Fill-in | e-mail taken | Inline under E-mail | `validation.clientEmail.taken` |
| Inactivate dialog | confirm | 4.4 step 1 | `clients.inactivate.confirm` |
| Delete dialog | confirm | Typed name enables [Excluir] | `clients.delete.confirm` |
| Delete action | disabled (history) | Hint (4.5 step 1) | `clients.delete.hasHistory` |
| Toasts | created / saved / inactivated / reactivated / deleted | — | `clients.toast.*` |

## 9. Open questions

| # | Question | Proposed answer | Blocks |
| --- | --- | --- | --- |
| 1 | Does e-mail uniqueness count inactive clients (R5)? | Yes; the error copy suggests checking "Inativos". | R5 |
| 2 | ~~Default "Cliente" template.~~ | **Decided (D-6):** yes. | — |
| 3 | Contract `inactive` vs `record_status` `suspended`. | Add `inactive` to the client status in data modelling; `suspended` is a tenant concept. | modelling |
| 4 | ~~Pagination.~~ | **Decided (D-9):** `limit` + `after` (`api-convention.md`). | — |
| 5 | RF-08 says deleting a client with history "results in inactivation". Here the UI offers "Inativar" instead and the API returns 409. Acceptable? | Yes: same outcome for the user, no silent change of meaning. | R7 |
| 6 | E-mail required (RN-04) vs. clients without e-mail. | See SPEC-0002 Q-3. | R3 |

## 10. Acceptance criteria

### Agreed criteria

These follow from the RFC or from decisions the owner has already taken (forms-overview.md §3).

```
AC-0004-01
Given a tenant "studio-ana" that was just created
When  its owner opens the Novo dropdown on /clients
Then  it shows "Criar novo modelo" followed by one template, "Cliente"
```

```
AC-0004-02
Given tenant "studio-ana" with active client templates "Ficha" and "Anamnese", an archived client template "Antigo", and a service template "Serviço"
When  its owner opens the Novo dropdown on /clients
Then  it lists "Criar novo modelo", then "Anamnese", "Ficha" in that order, and nothing else
```

```
AC-0004-03
Given tenant "studio-ana" with no active client templates
When  its owner opens the Novo dropdown on /clients
Then  it shows only "Criar novo modelo" and the hint with copy key clients.new.noTemplates
```

```
AC-0004-04
Given an owner on the fill-in page of template "Cliente"
When  they submit name "  Ana   Souza ", e-mail " ANA@Example.com "
Then  the response is 201 with name "Ana Souza", email "ana@example.com", phone null, status "active"
And   the browser shows the client view page with the toast clients.toast.created
```

```
AC-0004-05
Given an owner on the fill-in page of template "Cliente"
When  they submit an empty name
Then  the response is 422 with { "error": "clientName.required", "field": "name" }
```

```
AC-0004-06
Given an owner on the fill-in page of template "Cliente"
When  they submit e-mail "ana@"
Then  the response is 422 with { "error": "email.invalid", "field": "email" }
```

```
AC-0004-08
Given tenant "studio-bia" has a client with e-mail "ana@example.com"
When  the owner of "studio-ana" creates a client with e-mail "ana@example.com"
Then  the response is 201
```

```
AC-0004-09
Given a client template where client.phone is required
When  the owner creates a client from it without a phone
Then  the response is 422 with { "error": "phone.required", "field": "phone" }
```

```
AC-0004-10
Given two clients "Ana Souza" (ana@example.com) and "Bruno Lima" (bruno@studio.com)
When  the owner searches /clients for "SOUZA" and then for "studio"
Then  the first search lists only "Ana Souza"
And   the second lists only "Bruno Lima"
```

```
AC-0004-11
Given clients "Érica", "bruno" and "Ana"
When  the owner opens /clients
Then  they are listed in the order "Ana", "bruno", "Érica"
```

```
AC-0004-12
Given an active client "Ana Souza"
When  the owner inactivates it after confirming
Then  the response is 200 with status "inactive"
And   it no longer appears in /clients with the default filter
And   it appears with the "Inativo" badge under the "Inativos" filter
```

```
AC-0004-13
Given an inactive client "Ana Souza"
When  the owner reactivates it
Then  the response is 200 with status "active"
```

```
AC-0004-14
Given a client "Ana Souza" without linked history
When  the owner types "Ana Souza" in the delete dialog and confirms
Then  the response is 204
And   reading the client returns 404 with { "error": "client.not-found" }
```

```
AC-0004-15
Given a client with one linked appointment (once scheduling exists)
When  the owner sends a delete request
Then  the response is 409 with { "error": "client.has-history" }
And   the client still exists
And   the view page offered only "Inativar", with copy key clients.delete.hasHistory
```

```
AC-0004-16
Given a client of tenant "studio-bia"
When  the owner of "studio-ana" inactivates, reactivates or deletes it with "studio-ana" as active tenant
Then  each response is 404 with { "error": "client.not-found" }
And   the client in "studio-bia" is unchanged
```

```
AC-0004-17
Given a request with no access token
When  it lists or creates clients
Then  the response is 401
```

```
AC-0004-18
Given tenant "studio-ana" with no clients
When  its owner opens /clients
Then  the empty state with copy key clients.list.empty and a Novo button is shown
```

```
AC-0004-19
Given an owner on /clients
When  the client list request fails with 500
Then  the error state with copy key clients.list.error and a retry control is shown
```

```
AC-0004-20
Given two simultaneous create requests in the same tenant with e-mail "ana@example.com"
When  both are processed
Then  exactly one returns 201 and the other returns 409 with { "error": "clientEmail.taken", "field": "email" }
```

```
AC-0004-21
Given tenant "studio-ana" with 120 active clients
When  its owner lists clients without limit, then twice more passing each response's nextCursor as after
Then  the pages hold 50, 50 and 20 clients in name order
And   the first two nextCursor values are strings and the last is null
And   no client appears twice and none is missing
```

```
AC-0004-22
Given an owner listing clients
When  the request has limit 101
Then  the response is 422 with { "error": "limit.invalid", "field": "limit" }
```

```
AC-0004-23
Given a nextCursor returned for a search with q "ana"
When  the owner lists clients with q "bruno" and that cursor as after
Then  the response is 422 with { "error": "cursor.invalid", "field": "after" }
```

### Provisional criteria

These depend on open questions that are not answered yet. They are **not agreed behavior** and must not be turned into tests until the owner answers. On an answer, each one is confirmed, rewritten, or withdrawn (withdrawn IDs are not reused).

**AC-0004-07**: depends on §9 Q1 (uniqueness counts inactive clients).

```
AC-0004-07
Given tenant "studio-ana" with an inactive client whose e-mail is "ana@example.com"
When  its owner creates another client with e-mail "ANA@example.com "
Then  the response is 409 with { "error": "clientEmail.taken", "field": "email" }
And   the tenant still has exactly one client with that e-mail
```

## 11. Implementation plan

Written by `/plan` after the spec is Approved. Empty until then.

```

```

## 12. Changelog

| Version | Date | Change |
| --- | --- | --- |
| 0.1 | 2026-11-09 | Draft |
| 0.2 | 2026-11-09 | Owner answers D-6, D-9 recorded; AC-0004-01 agreed; AC-0004-21 to -23 (pagination) added |
