---
id: SPEC-0004
title: Cadastro de clientes
status: Approved # Draft | Review | Approved | Implemented | Superseded
plan_status: Draft # Draft | Approved
version: 1.0
owner: Joao Izidoro
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
- `/clients` list, search (name, e-mail, phone) and status filter.
- The **[Novo]** dropdown: pick a client template, or "Criar novo modelo".
- Client system attributes: name, e-mail, phone.
- E-mail uniqueness per tenant.
- View, edit, inactivate, reactivate and delete a client.
- The default "Cliente" template for each tenant (D-6).
- The consent attestation on a client's first save (R12; RFC §6, "Dados Sensíveis (art. 11)"; forms-overview.md
  D-12).

**Out of scope**
- Client history of appointments and payments (RF-10): the scheduling and payments specs. The client view
  page leaves room for it.
- Importing clients (CSV), merging duplicates, client photo (`avatar_url`): post-MVP.
- Searching by custom-field values: post-MVP (SPEC-0003).
- Data export and erasure requests (RNF-13, RNF-14): handled manually through the DPO channel in the MVP.
- Consent revocation (LGPD art. 8 §5): handled manually through the DPO channel in the MVP (RFC §6; owner
  decision, 2026-11-09).
- Audit events (RFC §6, "Auditoria e Monitoramento"; RNF-11) for creating, editing, inactivating, reactivating
  and deleting clients: the separate audit spec, which is MVP, as in SPEC-0001 §2 and SPEC-0003 §2 (owner
  decision, 2026-11-09).

**Dependencies**
- This spec depends on SPEC-0001, SPEC-0002 and SPEC-0003, all approved. The client create, read and update
  endpoints carry the record shapes and checks of SPEC-0003 §6–§7.
- SPEC-0003's criteria that create a client assume the consent of R12 is given, as defined in §10 below.
- AC-0004-15, -33 and -71 need a client with linked history, which only scheduling or payments can create. Until
  those exist, the history can be seeded directly.

## 3. Domain rules

- **R1.** Every client belongs to one tenant and is created from one active `client` template (RN-04, SPEC-0003 R1).
- **R2.** **Name**: required, trimmed, repeated spaces collapsed, 1–120 characters. (RN-04)
- **R3.** **E-mail**: required, trimmed, lowercased, valid address. (RN-04, `api-convention.md` normalisation)
- **R4.** **Phone**: optional unless the client's template makes `client.phone` required. When given, it follows
  the `phone` rule of SPEC-0003 §3.1. (RF-07, RN-04)
- **R5.** No two clients of the same tenant share an e-mail, after normalisation, **counting inactive clients**.
  (RN-04; owner decision, §9 Q1)
- **R6.** A client is `active` or `inactive`. Inactive clients are hidden from the default list and from any future
  client picker (scheduling), but remain viewable, editable and searchable with the filter. (RF-08, RN-05)
- **R7.** A client can be deleted permanently only if it has no linked history (appointments, payments; later
  plans and extra forms). Otherwise the delete is rejected with 409 `client.has-history`, and the UI offers only
  "Inativar". (RF-08, RN-05, RN-24; owner decision, §9 Q5)
- **R8.** Inactivating asks for confirmation. Deleting requires typing the client's name, and the server checks
  it: the typed name is compared with the client's name after trimming leading and trailing spaces, otherwise
  exactly, as for templates (SPEC-0001 R9). (RN-25; owner decision, §9 Q9)
- **R9.** Search uses the query after trimming. A blank query means no filter. A query of 2 or more characters
  matches clients whose name or e-mail contains it, ignoring case and accents. If the query has 4 or more digits
  once non-digits are removed, it also matches clients whose phone contains those digits. A 1-character query is
  rejected. (RF-09, amended; owner decisions, §9 Q7 and 2026-11-09)
- **R10.** The list is sorted by name (ignoring case and accents), then by `id`. (owner decision, 2026-11-09)
- **R11.** Every tenant has a client template named "Cliente" containing only the client system fields, from the
  moment the tenant exists. It is an ordinary template: editable, archivable and deletable under the same rules as
  any other template (SPEC-0001 R8). An existing tenant gets it only if it has no client template at all, active
  or archived; any other existing tenant is left alone. (owner decisions, forms-overview.md D-6 and §9 Q11)
- **R12.** A client can be created only if the professional attests, as data controller, that they obtained the
  client's specific and highlighted consent for the processing of sensitive data (LGPD art. 11, I). The
  attestation is given once per client, when the client is saved for the first time. The create request sends the
  version of the attestation text the page showed. If it is not the current version, the create is rejected with
  409 `consentText.outdated` and the page reloads the current text, so the version shown, recorded and current is
  always the same. The system records who attested (`attestedBy`, the user id), when, and that text version.
  Every client needs it, including clients created from the default "Cliente" template. Later edits do not ask
  for it again and never change the recorded attestation. (RFC §6, "Dados Sensíveis (art. 11)"; owner decisions,
  forms-overview.md D-12, §9 Q10 and 2026-11-09)
- **R13.** Client personal data (name, e-mail, phone) and field values never appear in application logs, error
  responses or error-tracking events (Sentry, RFC §6). Client data is removed from an error-tracking event before
  it is sent (SPEC-0003 R10). The professional's user id, including `attestedBy`, may appear in audit logs, since
  it identifies the actor. (RFC §6, "Auditoria e Monitoramento"; owner decisions, 2026-11-09)

## 4. Behavior

### 4.1 List (`/clients`)
1. The professional opens `/clients`.
2. The system lists active clients with columns Nome, E-mail, Telefone, Modelo (R10). Custom-field values never
   appear here (SPEC-0003 R9).
3. A search box filters by name, e-mail or phone as the professional types (R9; debounced). With fewer than 2
   characters after trimming, the page sends no search and shows the hint "Digite ao menos 2 caracteres para
   buscar."; an empty box shows the unfiltered list.
4. A status filter offers "Ativos" (default), "Inativos" and "Todos". Inactive rows carry an "Inativo" badge. The
   search applies under every filter.
5. If the tenant has no clients at all, the page says "Nenhum cliente cadastrado." with [Novo]. If it has clients
   but none under the chosen filter, it says "Nenhum cliente com este filtro."
6. "Carregar mais" at the end of the list loads the next page. If that fails, the loaded rows stay and the page
   says "Não foi possível carregar mais clientes." with a retry.
7. Selecting a row opens the client view page (SPEC-0003 §4.2).

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

On the fill-in page for a **new** client, an unchecked checkbox with the attestation text (§9 Q8) appears above
**[Salvar]** (R12). Saving without checking it shows an inline error under the checkbox, with the other field
errors, and sends no request. The edit page does not show the checkbox.

If the create is rejected with `consentText.outdated`, the page shows the current attestation text with the
checkbox unchecked and the banner "O texto de consentimento foi atualizado. Leia e confirme novamente." Typed
values stay on screen.

### 4.4 Inactivate and reactivate
1. On the view page, **"Inativar"** asks "Inativar <name>? O cliente sai da lista principal, mas o histórico é
   mantido." On confirm, the client becomes inactive and the toast "Cliente inativado" appears.
2. On an inactive client, **"Reativar"** makes it active again without confirmation, with the toast "Cliente
   reativado".
3. While the request runs, the button is disabled with a spinner. If it fails, a toast says "Não foi possível
   inativar o cliente." (or "reativar") and the client keeps its status.
4. If the client's status was already changed elsewhere (409 `client.status-unchanged`), the page reloads the
   client and the toast says "O status deste cliente já foi alterado."

### 4.5 Delete
1. **"Excluir"** is offered only if the client has no linked history (R7). Otherwise only "Inativar" is offered,
   with the hint "Clientes com histórico não podem ser excluídos".
2. The dialog asks the professional to type the client's name; **[Excluir]** is enabled only when it matches. The
   server checks the typed name too (R8). On confirm, the client and all its values are removed permanently and
   the professional returns to `/clients` with the toast "Cliente excluído".
3. While the request runs, [Excluir] is disabled with a spinner. If it fails, a toast says "Não foi possível
   excluir o cliente." and the client is kept.
4. If the client gained history since the page opened (409 `client.has-history`), the dialog closes and the page
   reloads, offering only "Inativar" with the hint of step 1.
5. Clients are also deleted, without their own dialog, when the professional deletes their template and chooses
   "Sim, excluir tudo" (SPEC-0001 §4.6). That option is offered only when no client of the template has linked
   history (R7). If any of them has, the template can only be archived, and no client is deleted (SPEC-0001 R8).

## 5. Permissions and tenant isolation

| Action | Unauthenticated | Member | Owner | Other tenant |
| --- | --- | --- | --- | --- |
| List / search clients | 401 | — (post-MVP) | 200, own tenant only | 404 `tenant.not-found` |
| Create client | 401 | — | 201 | 400 `formId.invalid` (SPEC-0003) |
| Read / update client | 401 | — | 200 | 404 `client.not-found` |
| Inactivate / reactivate | 401 | — | 200 | 404 `client.not-found` |
| Delete client | 401 | — | 204 | 404 `client.not-found` |

E-mail uniqueness (R5) is per tenant. Another tenant using the same e-mail is never revealed.

A tenant context without membership returns 404 `tenant.not-found`. Every action above is tenant-scoped and
follows `api-convention.md`, Tenant context: a request without tenant context returns 400 `tenant.required`, and a
request whose active tenant is inactive (suspended) returns 403 `tenant.inactive`.

## 6. Errors

Template, template-version, revision and custom-field value errors are in SPEC-0003 §6.

| Situation | Status | `error` key | `field` |
| --- | --- | --- | --- |
| Create with `consentAttested` anything but `true` (missing, false, other value) | 422 | `consentAttested.required` | `consentAttested` |
| Create without `consentTextVersion` | 422 | `consentTextVersion.required` | `consentTextVersion` |
| Create with a `consentTextVersion` that is not the current version (R12) | 409 | `consentText.outdated` | `consentTextVersion` |
| `consentAttested` sent on update | 422 | `consentAttested.not-allowed` | `consentAttested` |
| `consentTextVersion` sent on update | 422 | `consentTextVersion.not-allowed` | `consentTextVersion` |
| Name missing or blank | 422 | `clientName.required` | `name` |
| Name over 120 characters | 422 | `clientName.max` | `name` |
| E-mail missing or blank | 422 | `email.required` (existing) | `email` |
| E-mail invalid | 422 | `email.invalid` (existing) | `email` |
| Phone required by template and missing | 422 | `phone.required` | `phone` |
| Phone invalid | 422 | `phone.invalid` | `phone` |
| E-mail used by another client of the tenant | 409 | `clientEmail.taken` | `email` |
| Client unknown, malformed client id, or client of another tenant | 404 | `client.not-found` | — |
| Delete with the typed name missing or wrong (R8) | 400 | `deleteConfirmation.required` | `confirmName` |
| Delete with linked history | 409 | `client.has-history` | — |
| Inactivate an inactive / reactivate an active client | 409 | `client.status-unchanged` | — |
| Search query of 1 character after trimming | 422 | `clientSearch.min` | `q` |
| `status` filter not `active`, `inactive` or `all` | 422 | `clientStatus.invalid` | `status` |
| `limit` outside 1–100 or not an integer | 422 | `limit.invalid` | `limit` |
| Cursor malformed, or issued for other filters | 422 | `cursor.invalid` | `after` |

**Check order for create and update.** Client checks run inside the order of SPEC-0003 §6. After its steps 1–4
(request shape, template or record, template version, revision), the checks run in this order, and the first
failure is the response (owner decision, 2026-11-09):
1. Consent. On create: `consentAttested.required`, then `consentTextVersion.required`, then
   `consentText.outdated`. On update: `consentAttested.not-allowed`, then `consentTextVersion.not-allowed`.
2. Name, then e-mail, then phone format (`clientName.*`, `email.*`, `phone.*`).
3. Custom values (SPEC-0003 §6 step 5).
4. `clientEmail.taken`, last, because it needs the database.

So a blank name with `consentAttested` false returns `consentAttested.required`.

**Other actions.** Delete: 404 `client.not-found`, then 400 `deleteConfirmation.required`, then 409
`client.has-history`, as for templates (SPEC-0001 §6). Inactivate and reactivate: 404, then 409
`client.status-unchanged`. List: `q`, `status`, `limit`, then `after`.

## 7. Contract impact

New, non-breaking. Consumers: `apps/web`.

- **Client** (response): `id`, `form` (`{ id, name, version, latestVersion, status }`), `revision` (int, SPEC-0003
  R14), `name`, `email`, `phone` (string | null), `values`, `missingRequired`, `status` (`active | inactive`),
  `hasHistory` (bool), `consentAttestation` (`{ attestedBy, attestedAt, textVersion }`, R12; `attestedBy` is the
  user id), `createdAt`, `updatedAt`.
- **ClientSummary** (list item): `id`, `name`, `email`, `phone`, `formId`, `formName`, `status`.
- **List**: query `q?` (trimmed; blank means no filter, R9), `status?` (`active` default, `inactive`, `all`),
  `limit?`, `after?` (`api-convention.md`, Pagination; sort: name ignoring case and accents, then `id`, R10).
  Response `{ clients: ClientSummary[], nextCursor: string | null }`.
- **Create request**: `formId`, `formVersion`, `name`, `email`, `phone?`, `values`, `consentAttested` (must be
  `true`, R12), `consentTextVersion` (string, the version of the attestation text the page showed). The current
  version is part of the shared contract, so the web app and the API agree on it.
- **Update request**: `revision`, `formVersion`, `name`, `email`, `phone?`, `values` (SPEC-0003 §7 semantics). No
  `consentAttested` or `consentTextVersion`.
- **Inactivate / reactivate**: no body; response 200 with the full Client.
- **Delete**: body `{ confirmName }` (R8); response 204.
- Endpoint paths and verbs for inactivate, reactivate and delete are set in `/plan` (same gap as SPEC-0001 Q-5).
- The status value `inactive` is final in the contract. How it maps to `schema.dbml` `clients.status`
  (`record_status`: `active | suspended | deleted`) is decided in `/plan` (owner decision, §9 Q3).

## 8. UI states

| Screen | State | Behavior | Copy key |
| --- | --- | --- | --- |
| `/clients` | loading | Skeleton rows | `clients.list.loading` |
| `/clients` | empty (no clients at all) | "Nenhum cliente cadastrado." + [Novo] | `clients.list.empty` |
| `/clients` | empty under the chosen filter | "Nenhum cliente com este filtro." | `clients.list.emptyFilter` |
| `/clients` | no search results | "Nenhum cliente encontrado para “<q>”." | `clients.list.noResults` |
| `/clients` | search too short | Hint "Digite ao menos 2 caracteres para buscar."; no request | `clients.list.searchHint` |
| `/clients` | error | "Não foi possível carregar os clientes." + retry | `clients.list.error` |
| `/clients` | success | Table (4.1) | `clients.list.title` |
| `/clients` | loading more | "Carregar mais" button at list end while `nextCursor` is not null; spinner while loading | `clients.list.loadingMore` |
| `/clients` | loading more failed | "Não foi possível carregar mais clientes." + retry; loaded rows kept | `clients.list.loadMoreError` |
| [Novo] dropdown | no templates | Only "Criar novo modelo" + hint | `clients.new.noTemplates` |
| Fill-in / view / edit | all states | As SPEC-0003 §8, with client wording | `clients.form.*`, `clients.view.*` |
| Fill-in | e-mail taken | Inline under E-mail | `validation.clientEmail.taken` |
| Fill-in (new client) | consent checkbox | Unchecked checkbox with the attestation text (4.3) | `clients.form.consent` |
| Fill-in (new client) | consent not checked | Inline under the checkbox | `validation.consentAttested.required` |
| Fill-in (new client) | consent text outdated | Current text, checkbox unchecked, banner; typed values kept (4.3) | `clients.form.consentOutdated` |
| Inactivate dialog | confirm | 4.4 step 1 | `clients.inactivate.confirm` |
| Inactivate / reactivate | in progress | Button disabled with spinner | `clients.inactivate.inProgress`, `clients.reactivate.inProgress` |
| Inactivate / reactivate | failed | Error toast; status kept | `clients.inactivate.error`, `clients.reactivate.error` |
| Inactivate / reactivate | status already changed (409) | Client reloaded + toast | `clients.status.unchanged` |
| Delete dialog | confirm | Typed name enables [Excluir] | `clients.delete.confirm` |
| Delete dialog | in progress | [Excluir] disabled with spinner | `clients.delete.inProgress` |
| Delete dialog | failed | Error toast; client kept | `clients.delete.error` |
| Delete dialog | history found on delete (409) | Dialog closes, page reloads with only "Inativar" + hint | `clients.delete.hasHistory` |
| Delete action | disabled (history) | Hint (4.5 step 1) | `clients.delete.hasHistory` |
| Toasts | created / saved / inactivated / reactivated / deleted | — | `clients.toast.*` |

## 9. Open questions

| # | Question | Proposed answer | Blocks |
| --- | --- | --- | --- |
| 1 | ~~Does e-mail uniqueness count inactive clients (R5)?~~ | **Decided (owner, 2026-11-09):** yes (R5). | — |
| 2 | ~~Default "Cliente" template.~~ | **Decided (D-6):** yes. | — |
| 3 | ~~Contract `inactive` vs `record_status` `suspended`.~~ | **Decided (owner, 2026-11-09):** `inactive` is final in the contract; the database mapping is decided in `/plan`. | — |
| 4 | ~~Pagination.~~ | **Decided (D-9):** `limit` + `after` (`api-convention.md`). | — |
| 5 | ~~RF-08 says deleting a client with history "results in inactivation". Here the UI offers "Inativar" instead and the API returns 409. Acceptable?~~ | **Decided (owner, 2026-11-09):** yes (R7). | — |
| 6 | ~~E-mail required (RN-04) vs. clients without e-mail.~~ | **Decided in SPEC-0001 §9 Q12:** keep it required, per RN-04. RFC §3.3.1 amended to "nome e e-mail". | — |
| 7 | ~~Should `/clients` search also match the phone number?~~ | **Decided (owner, 2026-11-09):** yes, the phone digits, from 4 digits (R9). RF-09 amended. | — |
| 8 | ~~Wording and version of the consent attestation text (R12).~~ | **Decided (owner, 2026-11-09):** text version "1": "Declaro que obtive do titular, de forma específica e destacada, o consentimento para o tratamento dos dados pessoais registrados neste cadastro, inclusive dados de saúde, quando houver, para as finalidades do atendimento, conforme a LGPD." Legal review of the text is a launch item (forms-overview.md §7). Any change of wording needs a new version. | — |
| 9 | ~~The client delete had no body, so the typed name was checked only in the browser. Should the server check it, as for templates (SPEC-0001 R9)?~~ | **Decided (owner, 2026-11-09):** yes (R8, §7). | — |
| 10 | ~~R12 recorded the version "shown", but the server recorded the "current" one. They differ if the text changes while a page is open.~~ | **Decided (owner, 2026-11-09):** the request sends the version shown; if it is not current, 409 `consentText.outdated` and the page reloads the text (R12). | — |
| 11 | ~~What does the "Cliente" backfill do for an existing tenant that already has a client template, or a template named "Cliente" (SPEC-0001 R4), or 200 templates (SPEC-0001 R19)?~~ | **Decided (owner, 2026-11-09):** only tenants with no client template at all get "Cliente"; others are left alone (R11). The same rule applies to "Serviço" (SPEC-0005). | — |

## 10. Acceptance criteria

In API criteria, "with consent" means the create request has `consentAttested` true and `consentTextVersion`
"1", the current version (§9 Q8). In UI criteria it means the consent checkbox is checked.

### Agreed criteria

These follow from the RFC or from decisions the owner has taken (forms-overview.md §3 and §9 of this spec).
The owner approved every criterion below on 2026-11-09.

```gherkin
AC-0004-01
Given a tenant "studio-ana" that was just created
When  its owner opens the Novo dropdown on /clients
Then  it shows "Criar novo modelo" followed by one template, "Cliente"
```

```gherkin
AC-0004-02
Given tenant "studio-ana" with active client templates "Ficha" and "Anamnese", an archived client template "Antigo", and a service template "Serviço"
When  its owner opens the Novo dropdown on /clients
Then  it lists "Criar novo modelo", then "Anamnese", "Ficha" in that order, and nothing else
```

```gherkin
AC-0004-03
Given tenant "studio-ana" with no active client templates
When  its owner opens the Novo dropdown on /clients
Then  it shows only "Criar novo modelo" and the hint with copy key clients.new.noTemplates
```

```gherkin
AC-0004-04
Given an owner on the fill-in page of template "Cliente"
When  they submit name "  Ana   Souza " and e-mail " ANA@Example.com " with the consent checkbox checked
Then  the response is 201 with name "Ana Souza", email "ana@example.com", phone null, status "active"
And   the browser shows the client view page with the toast clients.toast.created
```

```gherkin
AC-0004-05
Given an owner of "studio-ana"
When  they create a client from template "Cliente" with consent and an empty name
Then  the response is 422 with { "error": "clientName.required", "field": "name" }
```

```gherkin
AC-0004-06
Given an owner of "studio-ana"
When  they create a client from template "Cliente" with consent and e-mail "ana@"
Then  the response is 422 with { "error": "email.invalid", "field": "email" }
```

```gherkin
AC-0004-07
Given tenant "studio-ana" with an inactive client whose e-mail is "ana@example.com"
When  its owner creates another client with consent and e-mail "ANA@example.com "
Then  the response is 409 with { "error": "clientEmail.taken", "field": "email" }
And   the tenant still has exactly one client with that e-mail
```

```gherkin
AC-0004-08
Given tenant "studio-bia" has a client with e-mail "ana@example.com"
When  the owner of "studio-ana" creates a client with consent and e-mail "ana@example.com"
Then  the response is 201
```

```gherkin
AC-0004-09
Given a client template where client.phone is required
When  the owner creates a client from it with consent and without a phone
Then  the response is 422 with { "error": "phone.required", "field": "phone" }
```

```gherkin
AC-0004-10
Given two clients "Ana Souza" (ana@example.com) and "Bruno Lima" (bruno@studio.com)
When  the owner searches /clients for "SOUZA" and then for "studio"
Then  the first search lists only "Ana Souza"
And   the second lists only "Bruno Lima"
```

```gherkin
AC-0004-11
Given clients "Érica", "bruno" and "Ana"
When  the owner opens /clients
Then  they are listed in the order "Ana", "bruno", "Érica"
```

```gherkin
AC-0004-12
Given an active client "Ana Souza"
When  the owner inactivates it after confirming
Then  the response is 200 with status "inactive"
And   it no longer appears in /clients with the default filter
And   it appears with the "Inativo" badge under the "Inativos" filter
```

```gherkin
AC-0004-13
Given an inactive client "Ana Souza"
When  the owner reactivates it
Then  the response is 200 with status "active"
```

```gherkin
AC-0004-14
Given a client "Ana Souza" without linked history
When  the owner types "Ana Souza" in the delete dialog and confirms
Then  the response is 204
And   reading the client returns 404 with { "error": "client.not-found" }
```

```gherkin
AC-0004-15
Given a client "Ana Souza" with one linked appointment
When  the owner sends a delete request with confirmName "Ana Souza"
Then  the response is 409 with { "error": "client.has-history" }
And   the client still exists
```

```gherkin
AC-0004-16
Given a client of tenant "studio-bia"
When  the owner of "studio-ana" inactivates, reactivates or deletes it with "studio-ana" as active tenant
Then  each response is 404 with { "error": "client.not-found" }
And   the client in "studio-bia" is unchanged
```

```gherkin
AC-0004-17
Given a request with no access token
When  it lists or creates clients
Then  the response is 401
```

```gherkin
AC-0004-18
Given tenant "studio-ana" with no clients
When  its owner opens /clients
Then  the empty state with copy key clients.list.empty and a Novo button is shown
```

```gherkin
AC-0004-19
Given an owner on /clients
When  the client list request fails with 500
Then  the error state with copy key clients.list.error and a retry control is shown
```

```gherkin
AC-0004-20
Given two simultaneous create requests with consent in the same tenant with e-mail "ana@example.com"
When  both are processed
Then  exactly one returns 201 and the other returns 409 with { "error": "clientEmail.taken", "field": "email" }
```

```gherkin
AC-0004-21
Given tenant "studio-ana" with 120 active clients
When  its owner lists clients without limit, then twice more passing each response's nextCursor as after
Then  the pages hold 50, 50 and 20 clients in name order
And   the first two nextCursor values are strings and the last is null
And   no client appears twice and none is missing
```

```gherkin
AC-0004-22
Given an owner listing clients
When  the request has limit 101
Then  the response is 422 with { "error": "limit.invalid", "field": "limit" }
```

```gherkin
AC-0004-23
Given a nextCursor returned for a search with q "ana"
When  the owner lists clients with q "bruno" and that cursor as after
Then  the response is 422 with { "error": "cursor.invalid", "field": "after" }
```

```gherkin
AC-0004-24
Given the owner of "studio-ana", whose user id is U
When  they create a client from template "Cliente" with valid fields and consent
Then  the response is 201 with consentAttestation.attestedBy U and consentAttestation.textVersion "1"
And   consentAttestation.attestedAt lies between sending the request and receiving the response
```

```gherkin
AC-0004-25
Given the owner of "studio-ana"
When  they create a client from template "Cliente" with valid fields, consentTextVersion "1" and no consentAttested
Then  the response is 422 with { "error": "consentAttested.required", "field": "consentAttested" }
And   no client is stored
```

```gherkin
AC-0004-26
Given the owner of "studio-ana"
When  they create a client from template "Cliente" with valid fields, consentTextVersion "1" and consentAttested false
Then  the response is 422 with { "error": "consentAttested.required", "field": "consentAttested" }
And   no client is stored
```

```gherkin
AC-0004-27
Given a client whose consent was attested by user U at 2026-11-09T10:00:00Z with text version "1"
When  the owner updates the client's name
Then  the response is 200 with consentAttestation unchanged: attestedBy U, attestedAt 2026-11-09T10:00:00Z, textVersion "1"
```

```gherkin
AC-0004-28
Given an existing client
When  the owner updates it with consentAttested true
Then  the response is 422 with { "error": "consentAttested.not-allowed", "field": "consentAttested" }
And   the client is unchanged
```

```gherkin
AC-0004-29
Given the owner on the fill-in page for a new client from "Cliente"
When  the page renders
Then  it shows an unchecked checkbox with copy key clients.form.consent above Salvar
```

```gherkin
AC-0004-30
Given the owner on the fill-in page for a new client, with valid fields and the consent checkbox unchecked
When  they press Salvar
Then  the checkbox shows the inline error with copy key validation.consentAttested.required
And   no request is sent
```

```gherkin
AC-0004-31
Given an existing client
When  the owner opens its edit page
Then  no consent checkbox is shown
```

```gherkin
AC-0004-32
Given another client with e-mail "bia@example.com"
When  a client "Ana Souza" with e-mail "ana@example.com" is created with consent, read, then updated to e-mail "bia@example.com" and rejected with clientEmail.taken
Then  no application log line written during the create, the read or the update contains "Ana Souza", "ana@example.com" or "bia@example.com"
And   the error response contains no e-mail address
```

```gherkin
AC-0004-33
Given a client "Ana Souza" with one linked appointment
When  the owner opens the client's view page
Then  no "Excluir" action is offered
And   "Inativar" is offered with the hint with copy key clients.delete.hasHistory
```

```gherkin
AC-0004-34
Given tenant "studio-bia" has a client "Bia Lima" and tenant "studio-ana" has a client "Ana Souza"
When  the owner of "studio-ana" lists clients with status all, and then searches for "Lima"
Then  the list holds only "Ana Souza"
And   the search returns no clients
```

```gherkin
AC-0004-35
Given a user who owns "studio-ana" and has no membership in "studio-bia"
When  they list clients with "studio-bia" as tenant context
Then  the response is 404 with { "error": "tenant.not-found" }
```

```gherkin
AC-0004-36
Given an inactive client "Ana Souza"
When  the owner inactivates it
Then  the response is 409 with { "error": "client.status-unchanged" }
```

```gherkin
AC-0004-37
Given an owner of "studio-ana"
When  they create a client from template "Cliente" with consent and a name of 121 characters
Then  the response is 422 with { "error": "clientName.max", "field": "name" }
```

```gherkin
AC-0004-38
Given an owner of "studio-ana"
When  they create a client from template "Cliente" with consent and e-mail "   "
Then  the response is 422 with { "error": "email.required", "field": "email" }
```

```gherkin
AC-0004-39
Given an owner of "studio-ana"
When  they create a client from template "Cliente" with consent and phone "(11) 8765-43210"
Then  the response is 422 with { "error": "phone.invalid", "field": "phone" }
```

```gherkin
AC-0004-40
Given an owner listing clients
When  the request has q "a"
Then  the response is 422 with { "error": "clientSearch.min", "field": "q" }
```

```gherkin
AC-0004-41
Given clients "Ana Souza" (ana@example.com) and "Bruno Lima" (bruno@example.com)
When  the owner updates "Bruno Lima" with e-mail "ana@example.com"
Then  the response is 409 with { "error": "clientEmail.taken", "field": "email" }
And   "Bruno Lima" keeps e-mail "bruno@example.com"
```

```gherkin
AC-0004-42
Given a client "Ana Souza" with e-mail "ana@example.com"
When  the owner updates it with e-mail "ANA@Example.com"
Then  the response is 200 with email "ana@example.com"
```

```gherkin
AC-0004-43
Given a client "Érica Gonçalves"
When  the owner searches /clients for "goncalves"
Then  the result lists "Érica Gonçalves"
```

```gherkin
AC-0004-44
Given an active client "Ana Souza" and an inactive client "Ana Lima"
When  the owner searches for "ana" with status inactive, and then with status all
Then  the first search lists only "Ana Lima"
And   the second lists both clients
```

```gherkin
AC-0004-45
Given a request with no access token
When  it inactivates, reactivates or deletes a client
Then  each response is 401
```

```gherkin
AC-0004-46
Given an existing tenant "studio-ana" with no client template, active or archived
When  the "Cliente" backfill runs
Then  "studio-ana" has a client template "Cliente" with only the client system fields
```

```gherkin
AC-0004-47
Given an existing tenant "studio-ana" whose only client template is the archived "Ficha"
When  the "Cliente" backfill runs
Then  "studio-ana" still has only the client template "Ficha"
```

```gherkin
AC-0004-48
Given clients "Ana Souza" and "Bruno Lima"
When  the owner searches /clients for "zzz"
Then  the page shows the state with copy key clients.list.noResults, naming "zzz"
```

```gherkin
AC-0004-49
Given an owner opening /clients before the list has loaded
When  the page renders
Then  it shows skeleton rows with copy key clients.list.loading
```

```gherkin
AC-0004-50
Given a client "Ana Souza" with phone "11987654321"
When  the owner searches /clients for "98765"
Then  the result lists "Ana Souza"
```

```gherkin
AC-0004-51
Given a client "Ana Souza" (ana@example.com) with phone "11987654321"
When  the owner searches /clients for "987"
Then  the result does not list "Ana Souza"
```

```gherkin
AC-0004-52
Given active clients "Ana Souza" and "Bruno Lima"
When  the owner lists clients with q "   "
Then  the response is 200 and lists both clients
```

```gherkin
AC-0004-53
Given an owner on /clients
When  they type "a" in the search box
Then  no search request is sent
And   the hint with copy key clients.list.searchHint is shown
```

```gherkin
AC-0004-54
Given a client "Ana Souza" without linked history
When  the owner sends a delete request with confirmName "Ana"
Then  the response is 400 with { "error": "deleteConfirmation.required", "field": "confirmName" }
And   the client still exists
```

```gherkin
AC-0004-55
Given the current consent text version is "2"
When  the owner creates a client with valid fields, consentAttested true and consentTextVersion "1"
Then  the response is 409 with { "error": "consentText.outdated", "field": "consentTextVersion" }
And   no client is stored
```

```gherkin
AC-0004-56
Given the owner of "studio-ana"
When  they create a client from template "Cliente" with valid fields, consentAttested true and no consentTextVersion
Then  the response is 422 with { "error": "consentTextVersion.required", "field": "consentTextVersion" }
And   no client is stored
```

```gherkin
AC-0004-57
Given the owner on the fill-in page for a new client with typed values and the consent checkbox checked
When  they press Salvar and the response is 409 with consentText.outdated
Then  the page shows the current attestation text with the checkbox unchecked and the banner with copy key clients.form.consentOutdated
And   the typed values are still on screen
```

```gherkin
AC-0004-58
Given the owner of "studio-ana"
When  they create a client from template "Cliente" with a blank name and consentAttested false
Then  the response is 422 with { "error": "consentAttested.required", "field": "consentAttested" }
```

```gherkin
AC-0004-59
Given a client with e-mail "ana@example.com", and template "Ficha" with a "cpf" field C
When  the owner creates a client from "Ficha" with consent, a valid name, e-mail "ana@example.com" and "123.456.789-00" for C
Then  the response is 422 with { "error": "cpf.invalid", "field": "values.C" }
```

```gherkin
AC-0004-60
Given tenant "studio-ana" is suspended
When  its owner lists clients
Then  the response is 403 with { "error": "tenant.inactive" }
```

```gherkin
AC-0004-61
Given an authenticated owner
When  they list clients without a tenant context
Then  the response is 400 with { "error": "tenant.required" }
```

```gherkin
AC-0004-62
Given tenant "studio-ana" whose only client "Ana Souza" is inactive
When  its owner opens /clients with the default filter
Then  the page shows the state with copy key clients.list.emptyFilter, not clients.list.empty
```

```gherkin
AC-0004-63
Given tenant "studio-ana" with 120 active clients, and the first 50 shown on /clients
When  the owner presses Carregar mais and the request fails with 500
Then  the page shows copy key clients.list.loadMoreError with a retry control
And   the first 50 clients are still shown
```

```gherkin
AC-0004-64
Given the owner confirmed "Inativar" on an active client
When  the response has not arrived yet
Then  the button is disabled and shows a spinner with copy key clients.inactivate.inProgress
```

```gherkin
AC-0004-65
Given an active client "Ana Souza"
When  the owner confirms "Inativar" and the response is 500
Then  the toast with copy key clients.inactivate.error is shown
And   the view page still shows "Ana Souza" as active
```

```gherkin
AC-0004-66
Given an inactive client "Ana Souza"
When  the owner presses "Reativar" and the response is 500
Then  the toast with copy key clients.reactivate.error is shown
And   the view page still shows "Ana Souza" as inactive
```

```gherkin
AC-0004-67
Given the owner pressed "Reativar" on an inactive client
When  the response has not arrived yet
Then  the button is disabled and shows a spinner with copy key clients.reactivate.inProgress
```

```gherkin
AC-0004-68
Given the owner confirmed the delete dialog for a client without linked history
When  the response has not arrived yet
Then  Excluir is disabled and shows a spinner with copy key clients.delete.inProgress
```

```gherkin
AC-0004-69
Given a client "Ana Souza" without linked history
When  the owner confirms the delete dialog and the response is 500
Then  the toast with copy key clients.delete.error is shown
And   the client still exists
```

```gherkin
AC-0004-70
Given the owner on the view page of active client "Ana Souza"
And   the client is then inactivated in another tab
When  the owner confirms "Inativar"
Then  the page reloads the client, showing it as inactive, with the toast with copy key clients.status.unchanged
```

```gherkin
AC-0004-71
Given the owner on the view page of client "Ana Souza" while it had no linked history
And   an appointment is then linked to the client
When  the owner confirms the delete dialog
Then  the dialog closes and the page offers only "Inativar" with the hint with copy key clients.delete.hasHistory
```

```gherkin
AC-0004-72
Given an owner listing clients
When  the request has status "deleted"
Then  the response is 422 with { "error": "clientStatus.invalid", "field": "status" }
```

```gherkin
AC-0004-73
Given an owner of "studio-ana"
When  they read a client with id "abc"
Then  the response is 404 with { "error": "client.not-found" }
```

```gherkin
AC-0004-74
Given a create of client "Ana Souza" with e-mail "ana@example.com" that fails with an unexpected server error
When  the error is reported to error tracking
Then  the error-tracking event contains neither "Ana Souza" nor "ana@example.com"
```

```gherkin
AC-0004-75
Given an existing client
When  the owner updates it with consentTextVersion "1"
Then  the response is 422 with { "error": "consentTextVersion.not-allowed", "field": "consentTextVersion" }
And   the client is unchanged
```

## 11. Implementation plan

Written by `/plan` after the spec is Approved. Empty until then.

```scope
```

## 12. Changelog

| Version | Date | Change |
| --- | --- | --- |
| 0.1 | 2026-11-09 | Draft |
| 0.2 | 2026-11-09 | Owner answers D-6, D-9 recorded; AC-0004-01 agreed; AC-0004-21 to -23 (pagination) added |
| 0.3 | 2026-11-09 | `form` in the response gains `latestVersion` (template versioning, SPEC-0001 v0.3) |
| 0.4 | 2026-11-09 | Owner Joao Izidoro set. Clients can be deleted together with their template (SPEC-0001 D-13); Q7 (search by phone) added |
| 0.5 | 2026-11-09 | Aligned with SPEC-0001 v0.5 (owner decision on SPEC-0001 Q7): deleting a template with its clients is offered only when none has linked history (§4.5); R11 says the default "Cliente" template follows SPEC-0001 R8 |
| 0.6 | 2026-11-09 | Owner decision (SPEC-0001 review round 2): length keys use `.max` / `.min` (`clientName.max`, `clientSearch.min`) |
| 0.7 | 2026-11-09 | §9 Q6 points to SPEC-0001 §9 Q12, where the e-mail question moved |
| 0.8 | 2026-11-09 | Owner decisions (SPEC-0003 review): consent attestation on the first save (R12, §2, §4.3, §6, §7, §8, §9 Q8; AC-0004-24 to -31 pending owner review); another tenant's template id returns 400 `formId.invalid` (§5); `revision` in the client response and update request (SPEC-0003 R14) |
| 0.9 | 2026-11-09 | Owner decisions: consent rules confirmed (R12 says `attestedBy` is the user id, never logged, and that every client needs the attestation); §9 Q8 decided, text version "1" with the owner's draft text, legal review before launch; AC-0004-32 (attestation not logged) added, pending owner review |
| 0.10 | 2026-11-09 | Owner decisions: §9 Q1 decided (uniqueness counts inactive clients), AC-0004-07 agreed, Provisional section removed; consent text version "1" reworded (§9 Q8: "de forma específica e destacada", "para as finalidades do atendimento"); the v0.9 "never logged" wording for `attestedBy` replaced by R13 (client data and field values never in logs or error responses; the user id may appear in audit logs); AC-0004-32 rewritten for R13, pending owner review |
| 0.11 | 2026-11-09 | Owner decisions (SPEC-0004 review): check order (§6); ties sort by `id` (R10); Q3, Q5, Q6 and Q7 decided (search by phone digits from 4 digits, RF-09 amended); `q` trimmed, blank means no filter (R9); client audit events and consent revocation out of scope (§2); server checks the typed name on delete (R8, §9 Q9); the request sends the consent text version shown, 409 `consentText.outdated` (R12, §9 Q10); backfill only for tenants with no client template (R11, §9 Q11); R13 covers error tracking; RFC §3.3.1 amended. Review fixes: consent added to the client-creating criteria; Dependencies note (§2); tenant-context errors (§5); new error rows and check order of the other actions (§6); inactivate, reactivate and delete bodies (§7); list, inactivate, reactivate and delete states (§4, §8); `gherkin` and `scope` fences. AC-0004-04 to -09, -15, -20 and -24 to -32 reworded and AC-0004-33 to -75 added, pending owner review |
| 1.0 | 2026-11-09 | Approved by Joao Izidoro, 2026-11-09, with all 75 criteria agreed |
