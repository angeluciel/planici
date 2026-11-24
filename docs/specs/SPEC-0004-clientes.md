---
id: SPEC-0004
title: Cadastro de clientes
status: Implemented # Draft | Review | Approved | Implemented | Superseded
plan_status: Approved # Draft | Approved
version: 1.8
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
  _Amended by SPEC-0006 R4: this is now the default of three sorts: `name`, `-name` and `-updatedAt` (last update,
  newest first)._
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
   appear here (SPEC-0003 R9). _Amended by SPEC-0006 §4.1 and §4.6: no table; full-width rows on wide screens and
   cards under letter headings on narrow screens (SPEC-0006 R10), each with a template badge; a template filter on
   wide screens (SPEC-0006 §4.2)._
3. A search box filters by name, e-mail or phone as the professional types (R9; debounced). With fewer than 2
   characters after trimming, the page sends no search and shows the hint "Digite ao menos 2 caracteres para
   buscar."; an empty box shows the unfiltered list.
4. A status filter offers "Ativos" (default), "Inativos" and "Todos". Inactive rows carry an "Inativo" badge. The
   search applies under every filter.
5. If the tenant has no clients at all, the page says "Nenhum cliente cadastrado." with [Novo]. If it has clients
   but none under the chosen filter, it says "Nenhum cliente com este filtro." _Amended by SPEC-0006 §4.2 step 7:
   "the chosen filter" covers the template filter too._
6. "Carregar mais" at the end of the list loads the next page. If that fails, the loaded rows stay and the page
   says "Não foi possível carregar mais clientes." with a retry. _Amended by SPEC-0006 §4.5: infinite scroll
   replaces "Carregar mais"; the failure keeps the rows and offers a retry, and a closing block ends the list._
7. Selecting a row opens the client view page (SPEC-0003 §4.2).

### 4.2 [Novo] dropdown
1. The professional presses **[Novo]**. _Amended by SPEC-0006 §4.6 step 5: on narrow screens the trigger is a
   floating "+" button named "Novo cliente"; the dropdown is unchanged._
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
| Cursor malformed, or issued for other filters (amended by SPEC-0006 R5: or another template filter or sort) | 422 | `cursor.invalid` | `after` |

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
`client.status-unchanged`. List: `q`, `status`, `limit`, then `after` (amended by SPEC-0006 §6: `q`, `status`,
`formId`, `sort`, `limit`, then `after`).

## 7. Contract impact

New, non-breaking. Consumers: `apps/web`.

- **Client** (response): `id`, `form` (`{ id, name, version, latestVersion, status }`), `revision` (int, SPEC-0003
  R14), `name`, `email`, `phone` (string | null), `values`, `missingRequired`, `status` (`active | inactive`),
  `hasHistory` (bool), `consentAttestation` (`{ attestedBy, attestedAt, textVersion }`, R12; `attestedBy` is the
  user id), `createdAt`, `updatedAt`. _Amended by SPEC-0006 §7 and R9: `updatedAt` is the client's last update
  time, set on creation and changed on every saved edit, inactivation and reactivation, the same value the list
  reports._
- **ClientSummary** (list item): `id`, `name`, `email`, `phone`, `formId`, `formName`, `status`. _Amended by
  SPEC-0006 §7: adds `updatedAt` (ISO-8601 UTC)._
- **List**: query `q?` (trimmed; blank means no filter, R9), `status?` (`active` default, `inactive`, `all`),
  `limit?`, `after?` (`api-convention.md`, Pagination; sort: name ignoring case and accents, then `id`, R10).
  Response `{ clients: ClientSummary[], nextCursor: string | null }`. _Amended by SPEC-0006 §7: query adds `formId?`
  and `sort?` (`name` default, `-name`, `-updatedAt`); response adds `total`._
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
| `/clients` | empty under the chosen filter | "Nenhum cliente com este filtro." (amended by SPEC-0006 §8: status or template filter) | `clients.list.emptyFilter` |
| `/clients` | no search results | "Nenhum cliente encontrado para “<q>”." | `clients.list.noResults` |
| `/clients` | search too short | Hint "Digite ao menos 2 caracteres para buscar."; no request | `clients.list.searchHint` |
| `/clients` | error | "Não foi possível carregar os clientes." + retry | `clients.list.error` |
| `/clients` | success | Table (4.1) (amended by SPEC-0006 §8: full-width rows on wide screens, cards under letter headings on narrow screens, with the total above) | `clients.list.title` |
| `/clients` | loading more | "Carregar mais" button at list end while `nextCursor` is not null; spinner while loading (amended by SPEC-0006 §8: no button; an indicator "Carregando mais clientes…" while the next page loads by infinite scroll) | `clients.list.loadingMore` |
| `/clients` | loading more failed | "Não foi possível carregar mais clientes." + retry; loaded rows kept (amended by SPEC-0006 §8: no automatic request until retry) | `clients.list.loadMoreError` |
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

_AC-0004-63 is superseded by AC-0006-45 (amended by SPEC-0006 §4.5: there is no "Carregar mais" button)._

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

Drafted by `/plan` on 2026-11-18 against the code of SPEC-0001 and SPEC-0002 (Implemented) and SPEC-0003
(implemented, status Approved until this spec gives it a route). It builds on SPEC-0003 §11, "What SPEC-0004 and
SPEC-0005 rely on", points 1–8, and changes one of them (G-1).

### Scope

```scope
packages/schemas/src/clients/*
packages/schemas/src/pagination.ts
packages/schemas/src/index.ts
packages/i18n/messages/pt-BR.json
packages/i18n/messages/en-US.json
apps/api/src/modules/clients/*
apps/api/src/app.module.ts
apps/api/src/config/app.routes.ts
apps/api/src/database/schema/clients.ts
apps/api/src/database/schema/index.ts
apps/api/drizzle/0004_clients.sql
apps/api/drizzle/0005_default_client_template.sql
apps/api/drizzle/meta/*
apps/api/src/modules/tenants/infrastructure/persistence/tenant.drizzle.repository.ts
apps/api/test/setup/test-app.ts
apps/api/test/utils/clients-fixtures.ts
apps/api/test/e2e/clients*
apps/api/test/e2e/forms*
apps/api/test/e2e/form-*
apps/api/test/e2e/tenants*
apps/web/src/app/*/orgs/*/clients/*
apps/web/src/app/*/orgs/*/_components/records/record-view.tsx
apps/web/src/app/api/clients/*
apps/web/src/app/api/_lib/http.ts
apps/web/src/lib/api/clients.ts
apps/web/tests/clients-*
apps/web/tests/record-view.test.tsx
docs/schema.dbml
docs/specs/SPEC-0001-modelos-de-formulario.md
docs/specs/SPEC-0002-campos-de-formulario.md
docs/specs/SPEC-0003-preenchimento-de-cadastro.md
```

Paths with `[lang]` and `[tenant]` use `*`, because the lock matches bash globs. Why the paths outside the clients
folders are here:
- `tenant.drizzle.repository.ts`: a new tenant gets "Cliente" in the transaction that creates it (Persistence,
  Decision 4).
- `test/e2e/forms*`, `form-*`, `tenants*`: once every tenant starts with "Cliente", setup lines in SPEC-0001's,
  SPEC-0002's and SPEC-0003's e2e tests that assume an empty template list must change (Risks 2). Only setup lines
  change. An assertion that would have to change stops the work and goes to the owner.
- `record-view.tsx` and `record-view.test.tsx`: the additive `actions` prop of G-1, if the owner takes it.
- The three spec files: the changelog lines of the criteria this plan verifies for them (Tests, Deferred criteria),
  and SPEC-0003's "What SPEC-0004 and SPEC-0005 rely on", point 7, if G-1 is taken.

### Contracts (`packages/schemas/src/clients/`)

New, non-breaking. Consumers: `apps/api` (`ClientsModule`) and `apps/web` (BFF routes, `@/lib/api/clients`, the
clients pages). Nothing existing changes shape.

- `pagination.ts` (package root, because SPEC-0005 and later lists reuse it): `LimitQuerySchema` (optional string of
  a canonical integer 1–100, default 50, else `limit.invalid`) and `CursorQuerySchema` (optional non-empty string,
  else `cursor.invalid`). The cursor stays opaque to the contract; only the API decodes it (API, List).
- `consent.ts`: `CLIENT_CONSENT_TEXT_VERSION = "1"` (§9 Q8). The text itself is copy (`clients.form.consent`), so it
  ships with the web app; the version is the shared constant both apps compare (R12, §7).
- `requests.ts`:
  - `ClientIdSchema`: `z.uuid({ error: "client.not-found" })`, so a malformed id is a 404 (AC-0004-73).
  - `ClientNameSchema`: trim, collapse spaces, 1–120 (`clientName.required`, `clientName.max`). R2.
  - `ClientEmailSchema`: `EmailSchema` from `common.ts` (`email.required`, `email.invalid`, lowercased). R3.
  - `ClientPhoneSchema`: missing, `null` or blank → `null`; otherwise `PhoneValueSchema` from `records/values.ts`
    (`phone.invalid`, digits only). R4, SPEC-0003 point 6.
  - `ClientAttributesSchema`: `{ name, email, phone? }`, keys in that order, so the first issue follows §6 step 2.
  - `ClientConsentCreateSchema`: `consentAttested` must be the literal `true` (`consentAttested.required` for missing,
    `false` or any other value), then `consentTextVersion` a non-empty string (`consentTextVersion.required`).
    `consentText.outdated` is the API's, because it compares with the current version (API, Create).
  - `ClientConsentUpdateSchema`: `consentAttested` present → `consentAttested.not-allowed`, then
    `consentTextVersion` present → `consentTextVersion.not-allowed`.
  - `ClientCreateRequestSchema` and `ClientUpdateRequestSchema`: SPEC-0003's envelopes intersected with consent and
    attributes. The web app's types; the API parses the parts in §6 order instead (API, Check order).
  - `ListClientsQuerySchema`: `q` (trimmed; blank → `undefined`; 1 character → `clientSearch.min`), `status`
    (`active` default, `inactive`, `all`, else `clientStatus.invalid`), `limit`, `after`, in that key order (§6,
    "List: `q`, `status`, `limit`, then `after`").
  - `DeleteClientRequestSchema`: `{ confirmName?: string }`; the comparison is the API's (R8).
- `responses.ts`: `ClientSchema` = `RecordBaseSchema` extended with `id`, `name`, `email`, `phone` (string | null),
  `status` (`active | inactive`), `hasHistory`, `consentAttestation` (`{ attestedBy, attestedAt, textVersion }`).
  `ClientSummarySchema` (`id`, `name`, `email`, `phone`, `formId`, `formName`, `status`) and
  `ClientListResponseSchema` (`{ clients, nextCursor: string | null }`). No summary field can carry a custom value
  (SPEC-0003 R9, AC-0003-19).
- `errors.ts`: `CLIENT_ERROR_CODES`, append-only, as `RECORD_ERROR_CODES`: `consentAttested.required`,
  `consentTextVersion.required`, `consentText.outdated`, `consentAttested.not-allowed`,
  `consentTextVersion.not-allowed`, `clientName.required`, `clientName.max`, `phone.required`, `clientEmail.taken`,
  `client.not-found`, `client.has-history`, `client.status-unchanged`, `clientSearch.min`, `clientStatus.invalid`,
  `limit.invalid`, `cursor.invalid`. `email.required`, `email.invalid`, `phone.invalid` and
  `deleteConfirmation.required` already exist and are reused.
- `clients/index.ts` re-exports the folder; `src/index.ts` re-exports it and `pagination.js`.

### Persistence

New table `clients` in `apps/api/src/database/schema/clients.ts`, generated as `0004_clients.sql`
(`drizzle-kit generate --name clients`), plus the custom migration `0005_default_client_template.sql`
(`drizzle-kit generate --custom --name default_client_template`).

| Column | Type | Rule |
| --- | --- | --- |
| `id` | uuid pk, `gen_random_uuid()` | the client id of every route |
| `tenant_id` | text not null → `tenants(id)` on delete cascade | RN-02; tenant erasure (SPEC-0001 Persistence) |
| `form_record_id` | uuid not null unique → `form_records(id)` on delete cascade | one-to-one link (SPEC-0001 Persistence); deleting the record deletes the client |
| `name` | text not null | R2, normalised |
| `name_key` | text not null | `textKey(name)`: sort and search key (R9, R10) |
| `email` | text not null | R3, lowercased |
| `phone` | text null | R4, digits only |
| `status` | `record_status` not null default `active`, check `status in ('active','suspended')` | Decision 2 |
| `consent_attested_by` | uuid not null → `users(id)` on delete restrict | R12 |
| `consent_attested_at` | timestamptz not null | R12 |
| `consent_text_version` | text not null | R12 |
| `created_at`, `updated_at` | timestamptz not null default now() | row bookkeeping; the response takes both from the record (SPEC-0003 point 5) |

Indexes: `idx_clients_tenant_email` unique on `(tenant_id, email)` (R5, counting inactive clients; AC-0004-20's race
ends at this index); `idx_clients_tenant_status_name` on `(tenant_id, status, name_key, id)` (list order and keyset,
R10); `idx_clients_form_record_id` is the unique constraint's own index.

- **Not added** from `docs/schema.dbml`'s `clients`: `avatar_url` (post-MVP, §2), `notes` (an ordinary custom field,
  SPEC-0001 §3.2), `custom_fields` (values live in `form_record_values`, SPEC-0003 R5), `preferences` (no spec uses
  it). `schema.dbml` is updated to the table above, closing forms-overview.md C-5.
- **Writes** run in one `TenantScope.run`, in the order of SPEC-0003 point 3 (create) and 4 (update). Every query
  filters by `tenant_id`.
- **Delete** locks the client row `for update`, then deletes its `form_records` row; the cascade removes the client
  row and its values in the same transaction (§4.5 step 2). A template delete with "Sim, excluir tudo" already
  deletes the records, so its clients go with them (SPEC-0001 Persistence; AC-0001-31).
- **Default template** (R11, Decision 4). `0005` creates the function `planici_seed_client_template(tenant text)`. It
  inserts "Cliente" (`name_key` "cliente", revision 1, version 1) with the three client system fields of SPEC-0001
  §3.2 (Nome completo, E-mail required; Telefone optional) and their version-1 rows, exactly as `POST /v1/forms`
  stores a template with `CLIENT_SYSTEM_INPUTS`. It does nothing when the tenant already has a client template,
  active or archived, or a template whose `name_key` is "cliente" (G-3). `0005` also creates
  `planici_backfill_client_templates()`, which calls the seed for every tenant, and runs it once (the backfill).
  E-def calls the same function with tenants in place, so the loop the migration runs is the loop under test
  (AC-0004-46, -47). `createWithOwner` calls the seed inside the transaction that inserts the tenant, so no tenant
  exists without it.
- **Rollback.** `0004` only creates a table; dropping it loses every client's attributes and consent attestation.
  Their records would stay as orphan `form_records` rows. `0005` adds a function and template rows; dropping the
  function loses nothing, while deleting the seeded templates is an ordinary template delete. Both rollbacks are
  destructive and need the owner's authorization.

### API (`apps/api/src/modules/clients/`)

Layout as `forms`: `commands/` (create, update, inactivate, reactivate, delete), `queries/` (list, get), `domain/`
(`client-cursor.ts`, `client-search.ts`, `errors/client.errors.ts`), `ports/` (`ClientRepository`,
`ClientHistoryReader`, `CLIENT_CONSENT_VERSION`), `infrastructure/` (Drizzle repository, `ZeroClientHistoryReader`,
`ClientPhonePresence`), `application/present-client.ts`, `clients.module.ts`. `ClientsModule` imports `CqrsModule`,
`AuthModule`, `TenantsModule` and `RecordsModule` (SPEC-0003 point 1). Every route uses
`@UseGuards(JwtAccessGuard, ActiveTenantGuard)` and `membership.assertCanManage()` (owner only; members are
post-MVP, §5). `routesV1.clients` joins `app.routes.ts`.

| Route | Success | Errors, in order | ACs |
| --- | --- | --- | --- |
| `GET /v1/clients?q&status&limit&after` | 200 `{ clients, nextCursor }` | 401; 400 `tenant.required`; 404 `tenant.not-found`; 403 `tenant.inactive`; 422 `clientSearch.min`, `clientStatus.invalid`, `limit.invalid`, `cursor.invalid` | 10, 11, 21–23, 34, 35, 40, 43, 44, 50–52, 60, 61, 72 |
| `POST /v1/clients` | 201 Client | guards; SPEC-0003 §6 steps 1–4; §6 check order below | 04–09, 17, 20, 24–26, 37–39, 55, 56, 58, 59, 74 |
| `GET /v1/clients/:clientId` | 200 Client | guards; 404 `client.not-found` (malformed, unknown, other tenant) | 14, 73 |
| `PATCH /v1/clients/:clientId` | 200 Client | guards; envelope (422); 404; SPEC-0003 steps 3–4; §6 check order | 27, 28, 41, 42, 75 |
| `POST /v1/clients/:clientId/inactivate` | 200 Client | guards; 404; 409 `client.status-unchanged` | 12, 16, 36, 45 |
| `POST /v1/clients/:clientId/reactivate` | 200 Client | guards; 404; 409 `client.status-unchanged` | 13, 16, 45 |
| `POST /v1/clients/:clientId/delete` with `{ confirmName }` | 204 | guards; 404; 400 `deleteConfirmation.required`; 409 `client.has-history` | 14–16, 45, 54 |

This settles §7's open paths as SPEC-0001 settled its own (§9 Q5): a delete that needs a confirmation is `POST
/<resource>/:id/delete` with a body, and status changes are `POST` actions (Decision 1).

**Check order (create).** The pipe runs `RecordCreateEnvelopeSchema` (§6 step 1). Then, in one `TenantScope.run`:
`openForCreate(tx, tenantId, "client", …)` (steps 2–4) → `ClientConsentCreateSchema`, then `consentText.outdated` when
`consentTextVersion` is not `CLIENT_CONSENT_VERSION` → `ClientAttributesSchema` (name, e-mail, phone format) →
`phone.required` when `draft.isRequired("client.phone")` and phone is `null` → `draft.checkValues(values)` → `draft.insert`
→ insert the client row with `form_record_id` and the attestation (`attestedBy` the caller's user id, `attestedAt`
`now()`) → a unique violation on `idx_clients_tenant_email` becomes 409 `clientEmail.taken` → `read` with the same `tx`.
This is SPEC-0003 point 3 with §6's order (SPEC-0003 G-8). A rejected e-mail rolls back the record as well, so no
orphan record is left (AC-0004-07, -20).

**Check order (update).** Pipe: `RecordUpdateEnvelopeSchema`. Then in one transaction: find the client by id and tenant,
`for update` (404) → `openForUpdate` with its `form_record_id` → `ClientConsentUpdateSchema` → `ClientAttributesSchema` →
`phone.required` → `checkValues` → `replace` → update the client row (`name`, `name_key`, `email`, `phone`,
`updated_at`) → unique violation → 409 → `read`. The attestation columns are never written on update (AC-0004-27).

**Response.** `present-client.ts` spreads `RecordService.read(tenantId, formRecordId, { "client.phone": phone !== null },
tx?)`, then `id`, `name`, `email`, `phone`, `status` (`suspended` → `inactive`), `hasHistory` from
`ClientHistoryReader`, and `consentAttestation` (SPEC-0003 point 5).

**List** (R9, R10, Decision 3). `status` maps to `where status = …` (`all`: no filter). With `q`: `name_key like
%k%` or `email like %k%`, where `k = textKey(q)` with `%`, `_` and `\` escaped; and, when `q` holds 4 or more digits
after removing non-digits, `or phone like %digits%`. Order `name_key, id`; fetch `limit + 1` rows to know whether a
next page exists. The cursor is `<payload>.<mac>`, both base64url: the payload is the JSON `{ f, n, i }`, where `f` is
the filter it was issued for (`status` and `textKey(q)`) and `n` and `i` are the last row's `name_key` and `id`; the
mac is HMAC-SHA256 of the payload. The key is derived once at startup as HMAC-SHA256(`JWT_SECRET`,
"planici:list-cursor:v1"), so no new environment variable is needed and the JWT key itself never signs a cursor. The
API answers 422 `cursor.invalid` for a cursor that does not split into two parts, a mac that does not match
(compared in constant time, so any edit of `n`, `i` or `f` fails), a payload without that shape, or an `f` different
from the request's filter (`api-convention.md`, Pagination: "malformed or tampered"). The next page is
`(name_key, id) > (n, i)` (Decision 3). The summary's `formName` comes from a join on `forms`.

**Inactivate and reactivate.** Lock the client row; 404; 409 when the status already is the target; set `status` and
`updated_at` on the client row only. The record's `revision` and `updated_at` do not change (AC-0003-82).

**History** (R7). `ClientHistoryReader.hasHistory(tenantId, clientId, tx?)`. Scheduling and payments do not exist, so
`ZeroClientHistoryReader` returns `false`; tests replace it (G-2). Delete checks it inside the transaction, after the
typed name (§6, Other actions).

**`SystemFieldPresence`** (SPEC-0001 plan, API). `ClientPhonePresence.findRecordIdsWithoutClientPhone(tenantId,
formId)` returns the `form_record_id` of the template's clients with `phone is null`, filtered by `tenant_id`.
`app.module.ts` passes it to `FormsModule.forRoot` instead of `ZeroSystemFieldPresence`.

**Consent version.** `CLIENT_CONSENT_VERSION` is a provider whose default value is `CLIENT_CONSENT_TEXT_VERSION`, so
AC-0004-55 can run with "2" through `createTestApp({ consentTextVersion: "2" })` without changing the contract.

**Client data out of logs and errors** (R13, Risks 1).
- Error messages are fixed keys; no error, log line or response carries a name, e-mail, phone or value.
- Drizzle 0.45's `DrizzleQueryError` message is `Failed query: <sql>\nparams: <params>`, so any unexpected database
  error on a client write would carry the client's name and e-mail. `DomainExceptionFilter` logs the stack of
  unexpected errors, and `@nestjs/observe` copies the stack and message of errors thrown through instrumented
  providers. The clients repository therefore catches every error of its queries and rethrows
  `ClientPersistenceError` with a fixed message, the Postgres `code` and the constraint name only, and no `cause`.
  `app.module.ts` adds the Drizzle instance to Observe's `skipInstrumentation`, as it already does for `Pool`, so the
  raw error is never captured above the repository. The Step 4 gate checks both points (Sequence).

### Web

Routes under `apps/web/src/app/[lang]/(private)/orgs/[tenant]/clients/`, replacing the stub page:

| Route | What it mounts |
| --- | --- |
| `/clients` | `ClientsList`: search, status filter, table, [Novo] menu, "Carregar mais" |
| `/clients/new?form=:id` | `<RecordForm adapter mode="create" formId extraFields={consent} />`; without `form`, a redirect to `/clients` |
| `/clients/[clientId]` | `<RecordView adapter recordId actions={ClientActions} />` (G-1) |
| `/clients/[clientId]/edit` | `<RecordForm adapter mode="edit" recordId />` (no consent, AC-0004-31) |

- **BFF** (`apps/web/src/app/api/clients/`): `route.ts` (GET list, forwarding only `q`, `status`, `limit`, `after`;
  POST create), `[clientId]/route.ts` (GET, PATCH), `[clientId]/inactivate`, `/reactivate`, `/delete` (POST), each
  as the forms routes do, with `parseUpstream(ClientSchema | ClientListResponseSchema)`. A malformed id is a 404
  `client.not-found` before any upstream call. `consent/route.ts` (GET) returns `{ version: CLIENT_CONSENT_TEXT_VERSION,
  text }` with the text from the server's own messages for the request locale. `_lib/http.ts` gains the `clients`
  resource.
- **`@/lib/api/clients.ts`**: `listClients`, `createClient`, `getClient`, `updateClient`, `inactivateClient`,
  `reactivateClient`, `deleteClient`, `getConsentText`, each resolving to `{ ok: true, … } | ApiFailure`.
- **Adapter** (`clients/_components/client-adapter.ts`): `entity: "clients"`, `type: "client"`, the calls above,
  hrefs, and `systemFields` for `client.name` (`name`, `Input`, `ClientNameSchema`, plain text), `client.email`
  (`email`, `Input type="email"`, `ClientEmailSchema`), `client.phone` (`phone`, the phone input with SPEC-0003's mask,
  `ClientPhoneSchema`, `(11) 98765-4321`). `onSaveError` handles `consentText.outdated` (below) and returns `false`
  for anything else, so `clientEmail.taken` shows under E-mail through the default routing (SPEC-0003 point 7).
- **Consent** (`consent-field.tsx`, R12, §4.3). The page loads the text through `getConsentText()` (BFF). Because the
  BFF runs the deployed code, a page opened before a deploy still gets the current text after a 409 (Decision 5).
  `extraFields`: `initial { consentAttested: false, consentTextVersion: <loaded version> }`, a schema that turns an
  unchecked box into `consentAttested.required`, and a render of `Checkbox` with the text and its inline error, above
  [Salvar]; the error counts in the error summary. On 409 `consentText.outdated`, `onSaveError` reloads the text,
  sets the box to unchecked and the version to the new one through the `onChange` the last render received, shows the
  `clients.form.consentOutdated` banner and returns `true`; typed values stay (AC-0004-57).
- **List** (`clients-list.tsx`). Search input debounced 300 ms; under 2 characters after trimming, no request and the
  `clients.list.searchHint` hint (a blank box lists everything). Status `Select` (Ativos, Inativos, Todos). Table
  Nome, E-mail, Telefone (formatted), Modelo; an "Inativo" badge on inactive rows; a row opens the view page. States:
  skeleton rows (`loading`), `empty` (no clients at all: the first page of `status=all` without `q` is empty),
  `emptyFilter`, `noResults` with the query, `error` with retry, "Carregar mais" with `loadingMore` and
  `loadMoreError` with retry, keeping loaded rows. A change of `q` or status restarts from page one and discards the
  cursor (`api-convention.md`). Telling `empty` from `emptyFilter` costs one extra `status=all&limit=1` request when
  the filtered first page is empty (Decision 6).
- **[Novo] menu** (`new-client-menu.tsx`, `Menu`): "Criar novo modelo" → `/forms/new?from=clients` (the editor
  already sends the professional to `/clients/new?form=<id>` after saving, AC-0001-10), a divider, then the active
  client templates from `listForms({ type: "client" })`, in the order the API returns (`name_key`). With none, the
  `clients.new.noTemplates` hint.
- **Actions on the view page** (`client-actions.tsx`, through G-1's `actions`): an "Inativo" badge when inactive;
  "Inativar" with a confirm dialog (§4.4 step 1), "Reativar" without one; each disabled with a spinner while it runs,
  an error toast on failure with the status unchanged, and on 409 `client.status-unchanged` a reload plus
  `clients.status.unchanged`. "Excluir" only when `hasHistory` is false, else the `clients.delete.hasHistory` hint;
  the delete dialog enables [Excluir] when the typed name equals the client's name after trimming (R8), sends
  `confirmName`, shows the spinner, toasts on failure, and on 409 `client.has-history` closes and reloads. On 204,
  `/clients` with `clients.toast.deleted`.
- No Figma frame is referenced by this spec, so the pages use the existing token layers and components (`Input`,
  `Select`, `Menu`, `Dialog`, `Checkbox`, `Skeleton`, `Button`, `useToast`), as SPEC-0001's list and dialogs do.

**Copy** (both locales). The spec gives the pt-BR of most states (§4, §8, §9 Q8). Keys marked **proposed** need the
owner's confirmation (Decision 7); every en-US string is proposed.

| Key | pt-BR |
| --- | --- |
| `clients.list.title` | Clientes (**proposed**) |
| `clients.list.loading` | Carregando clientes… (**proposed**) |
| `clients.list.empty`, `.emptyFilter`, `.noResults`, `.searchHint`, `.error`, `.loadMoreError` | as §4.1 and §8 |
| `clients.list.loadingMore` | Carregar mais |
| `clients.list.search`, `.status.active`, `.status.inactive`, `.status.all`, `.inactiveBadge` | Buscar por nome, e-mail ou telefone (**proposed**); Ativos; Inativos; Todos; Inativo |
| `clients.list.columns.*` | Nome, E-mail, Telefone, Modelo |
| `clients.new.button`, `.createTemplate`, `.noTemplates` | Novo; Criar novo modelo; Crie um modelo para cadastrar clientes |
| `clients.form.consent` | the version "1" text of §9 Q8 |
| `clients.form.consentOutdated` | O texto de consentimento foi atualizado. Leia e confirme novamente. |
| `clients.inactivate.action`, `.confirm`, `.confirmButton`, `.inProgress`, `.error` | Inativar; §4.4 step 1; Inativar (**proposed**); Inativando… (**proposed**); Não foi possível inativar o cliente. |
| `clients.reactivate.action`, `.inProgress`, `.error` | Reativar; Reativando… (**proposed**); Não foi possível reativar o cliente. |
| `clients.status.unchanged` | O status deste cliente já foi alterado. |
| `clients.delete.action`, `.confirm`, `.confirmLabel`, `.inProgress`, `.error`, `.hasHistory` | Excluir; Excluir <name> permanentemente? Esta ação não pode ser desfeita. (**proposed**); Digite o nome do cliente para confirmar (**proposed**); Excluindo… (**proposed**); Não foi possível excluir o cliente.; Clientes com histórico não podem ser excluídos |
| `clients.toast.inactivated`, `.reactivated`, `.deleted` | Cliente inativado; Cliente reativado; Cliente excluído |
| `validation.consentAttested.required` | Confirme o consentimento do titular para salvar. (**proposed**) |
| `validation.consentAttested.not-allowed`, `consentTextVersion.required`, `consentTextVersion.not-allowed`, `consentText.outdated` | O consentimento já foi registrado. / Versão do texto de consentimento ausente. / O consentimento já foi registrado. / O texto de consentimento foi atualizado. (**proposed**) |
| `validation.clientName.required`, `clientName.max` | Informe o nome do cliente. / Use no máximo 120 caracteres. (**proposed**) |
| `validation.phone.required`, `clientEmail.taken` | Informe o telefone. / Já existe um cliente com este e-mail. (**proposed**) |
| `validation.client.not-found`, `client.has-history`, `client.status-unchanged` | Cliente não encontrado. / Clientes com histórico não podem ser excluídos. / O status deste cliente já foi alterado. (**proposed**) |
| `validation.clientSearch.min`, `clientStatus.invalid`, `limit.invalid`, `cursor.invalid` | Digite ao menos 2 caracteres para buscar. / Filtro de status inválido. / Limite inválido. / Recarregue a lista. (**proposed**) |

### Tests

Every test name starts with its AC ID, as in SPEC-0003. A test of a partly verified criterion says so in its name.
API e2e tests use `createTestApp()` and the `/v1` prefix; web tests use `forms-harness.tsx` and `record-harness.tsx`.

Files:
- **U-req** `apps/api/src/modules/clients/domain/client-requests.spec.ts`: the client schemas of `packages/schemas`
  (it runs from the api, as SPEC-0003's U-val). **U-cur** `client-cursor.spec.ts` and **U-search**
  `client-search.spec.ts` beside it: cursor encode, decode, filter binding and tamper checks (an edited `n`, `i` or
  `f` with the old mac, a wrong mac, a missing part → `cursor.invalid`); `textKey`, the `like` escaping and the
  4-digit phone rule.
- **E-cl** `apps/api/test/e2e/clients.e2e-spec.ts`: create, read, update, consent, attributes, uniqueness, logs.
- **E-list** `clients-list.e2e-spec.ts`; **E-life** `clients-lifecycle.e2e-spec.ts` (inactivate, reactivate,
  delete); **E-def** `clients-default-template.e2e-spec.ts`.
- **E-rec** `clients-records.e2e-spec.ts`: SPEC-0003's deferred criteria through `/v1/clients`.
- **E-tpl** `clients-templates.e2e-spec.ts`: SPEC-0001's and SPEC-0002's deferred criteria, reading clients through
  `/v1/clients`.
- Fixtures `apps/api/test/utils/clients-fixtures.ts`: `clientsApi(app, session)` (as `formsApi`), `clientBody(template,
  attrs, values?)` with consent, `seedClient` for the 120-client lists, `clientRow`, and `withoutDefaultTemplate(ctx,
  session)`, which deletes the seeded "Cliente" through `POST /v1/forms/:id/delete` for criteria that fix the
  template list. `createTestApp` gains `clientHistory` and `consentTextVersion` options.
- **W-list** `apps/web/tests/clients-list.test.tsx`, **W-cform** `clients-form.test.tsx`, **W-cview**
  `clients-view.test.tsx`, with `apps/web/tests/clients-harness.tsx` (the BFF transport faked as in
  `forms-harness.tsx`, the real adapter and copy).

| AC | Test | What it checks |
| --- | --- | --- |
| 01 | E-def, W-list | a tenant created through `POST /v1/tenants` lists one client template, "Cliente", whose version 1 has only the three system fields; the menu shows "Criar novo modelo", a divider, "Cliente" |
| 02 | E-tpl, W-list | after `withoutDefaultTemplate`: `GET /v1/forms?type=client` → "Anamnese", "Ficha"; the menu renders exactly those after "Criar novo modelo" |
| 03 | W-list | no active client template → only "Criar novo modelo" and `clients.new.noTemplates` |
| 04 | E-cl, W-cform | 201 with "Ana Souza", "ana@example.com", phone null, "active"; the page toasts `clients.toast.created` and opens the view |
| 05, 06, 37, 38, 39 | E-cl | 422 `clientName.required` / `email.invalid` / `clientName.max` / `email.required` / `phone.invalid` at their fields |
| 07 | E-cl | inactive "ana@example.com" → 409 `clientEmail.taken`; one client with that e-mail; no new `form_records` row |
| 08 | E-cl | same e-mail in another tenant → 201 |
| 09 | E-cl | template with `client.phone` required, no phone → 422 `phone.required` |
| 10, 43, 50, 51, 52 | E-list | "SOUZA" and "studio"; "goncalves" finds "Érica Gonçalves"; "98765" finds the phone; "987" does not; `q` "   " lists both |
| 11 | E-list | order "Ana", "bruno", "Érica" |
| 12 | E-life, W-list | 200 `inactive`; absent under the default filter, present under `inactive`; the row shows "Inativo" |
| 13 | E-life | 200 `active` |
| 14 | E-life, W-cview | 204; `GET` → 404 `client.not-found`; no `form_records` or value rows left; the dialog enables [Excluir] only for "Ana Souza" |
| 15 | E-life | partly (G-2): with a fake `ClientHistoryReader` reporting history → 409 `client.has-history`; client kept |
| 16 | E-life | another tenant's client: inactivate, reactivate, delete → 404 each; its row unchanged |
| 17, 45 | E-cl, E-life | no token: list, create, inactivate, reactivate, delete → 401 |
| 18, 19, 48, 49, 53, 62, 63 | W-list | `empty` with [Novo]; `error` with retry; `noResults` naming "zzz"; skeleton; "a" sends nothing and shows the hint; `emptyFilter`; load-more failure keeps 50 rows and shows retry |
| 20 | E-cl | two concurrent creates with "ana@example.com" → one 201, one 409 `clientEmail.taken` |
| 21, 22, 23 | E-list | 120 clients → pages of 50, 50, 20, cursors string, string, null, no repeats or gaps; `limit` 101 → 422; a "ana" cursor with `q` "bruno" → 422 `cursor.invalid` |
| 24 | E-cl | `consentAttestation` `{ U, now, "1" }`, with `attestedAt` between request and response |
| 25, 26, 56, 58 | E-cl | 422 `consentAttested.required` (missing; false; blank name and false) / `consentTextVersion.required`; nothing stored |
| 27 | E-cl | attestation set to 2026-11-09T10:00:00Z in the row, name updated → attestation unchanged |
| 28, 75 | E-cl | update with `consentAttested` / `consentTextVersion` → 422 `.not-allowed`; client unchanged |
| 29, 30, 31, 57 | W-cform | unchecked box with `clients.form.consent` above Salvar; unchecked submit → inline error, no request; edit shows no box; 409 `consentText.outdated` → new text, box unchecked, banner, typed values kept |
| 32 | E-cl | Nest logger, `console` and stdout/stderr captured through create, read, a rejected update: no line holds "Ana Souza", "ana@example.com" or "bia@example.com"; the 409 body holds no address |
| 33 | W-cview, E-life | partly (G-2): `hasHistory` true → no "Excluir", "Inativar" with the hint; the API read reports `hasHistory` true with the fake reader |
| 34, 35, 60, 61 | E-list | another tenant's clients never listed or found; foreign tenant context → 404 `tenant.not-found`; suspended tenant → 403 `tenant.inactive`; no context → 400 `tenant.required` |
| 36 | E-life | inactivate an inactive client → 409 `client.status-unchanged` |
| 40, 72 | E-list | `q` "a" → 422 `clientSearch.min`; `status` "deleted" → 422 `clientStatus.invalid` |
| 41, 42 | E-cl | update to a taken e-mail → 409, e-mail kept; "ANA@Example.com" → 200 "ana@example.com" |
| 44 | E-list | "ana" with `inactive` → "Ana Lima"; with `all` → both |
| 46, 47 | E-def | setup: a tenant whose seeded "Cliente" is deleted through `POST /v1/forms/:id/delete` (no client template left), and a second tenant whose "Cliente" is deleted and whose "Ficha" is created and archived. Then `select planici_backfill_client_templates()`, the function the migration runs: the first tenant has "Cliente" with only the three system fields; the second still has only "Ficha" |
| 54 | E-life | `confirmName` "Ana" → 400 `deleteConfirmation.required`; client kept |
| 55 | E-cl | `createTestApp({ consentTextVersion: "2" })`, version "1" sent → 409 `consentText.outdated` at `consentTextVersion`; nothing stored |
| 59 | E-cl | "Ficha" with an invalid cpf and a taken e-mail → 422 `cpf.invalid` (values before uniqueness) |
| 64, 65, 66, 67, 68, 69, 70 | W-cview | spinners with the `.inProgress` keys; 500 toasts with the status or client kept; 409 `client.status-unchanged` → reload showing inactive and the toast |
| 71 | W-cview | partly (G-2): delete → 409 `client.has-history` → dialog closed, reload, only "Inativar" with the hint |
| 73 | E-cl | `GET /v1/clients/abc` → 404 `client.not-found` |
| 74 | E-cl | partly (Risks 1, G-4): a test-only `check (false)` constraint on `clients` makes the insert fail → 500 `unexpected`; the response, the filter's log and the captured output hold neither "Ana Souza" nor "ana@example.com"; the error that reaches the filter has the fixed message |

**Deferred criteria this plan verifies** (rows in SPEC-0001, SPEC-0002 and SPEC-0003's Deferred checks):

| AC | Test | What it checks here |
| --- | --- | --- |
| AC-0003-02 to -14, -17, -20, -23, -24, -26, -30 to -38, -41 to -45, -59, -62, -67 to -69, -71 to -73, -75, -76, -79, -81, -88, -89 | E-rec | each criterion's request through `POST`/`PATCH`/`GET /v1/clients`: the HTTP status and body `{ error, field }`, or the read; client side only |
| AC-0003-54 to -56, -60, -64 to -66, -86, -87 | E-rec | the same envelope cases through the client endpoints' pipes |
| AC-0003-22, -63 | E-rec | another tenant's client: `GET` and `PATCH` → 404 `client.not-found` |
| AC-0003-74 | E-rec | Telefone made required with "Atualizar todos", update without phone → 422 `phone.required` |
| AC-0003-19 | E-rec | the list response for a client with "Hipertensão" holds no custom value (no `values` key in any summary, no "Hipertensão" anywhere in the body) |
| AC-0003-39, -40, -57, -58 | E-rec | create with a foreign tenant → 404; no token → 401; suspended → 403; no context → 400 |
| AC-0003-82 | E-rec | revision 2, inactivate → the read still has revision 2 |
| AC-0001-10 | W-list, W-cform | "Criar novo modelo" links to `/forms/new?from=clients`; `/clients/new?form=<id>` mounts the fill-in form for that template (the editor's redirect is SPEC-0001's W-ed) |
| AC-0001-12, -14, -20, -23, -24, -26 to -28, -31 to -33 | E-tpl | each Then about clients, through `/v1/clients`: read and update after archive; client kept after `form.in-use`; `form.version` reported after each change; 404 `client.not-found` after "Sim, excluir tudo"; client unchanged after a failed or archived delete. -12's dropdown: archived "Ficha nutricional" absent from `GET /v1/forms?type=client`. -28's induced failure as SPEC-0001's own test does it |
| AC-0001 §4.7 step 4 | E-tpl | with the real `ClientPhonePresence`: preview after turning Telefone required counts the clients with no phone, never another tenant's |
| AC-0002-16, -19, -23, -24, -26 | E-tpl, W-cview | the client reads: the "Profissão" answers on version 1; "Tarde" still stored and labelled by version 1; "Hobby" `sensitive` in version 1's read (masked in W-cview, through SPEC-0003's `protected-value`); "Período da tarde"; the "text" answers of T |

SPEC-0001's AC-0001-34, -57 and -58 stay with the first scheduling or payments spec (owner waiver, 2026-11-10 and
2026-11-11); this plan does not touch them.

At `/done`, each spec's changelog gets one line: SPEC-0001 "AC-0001-10, -12, -14, -20, -23, -24, -26 to -28, -31 to
-33 and §4.7 step 4 verified with SPEC-0004, <date>"; SPEC-0002 "AC-0002-16, -19, -23, -24, -26 verified with
SPEC-0004, <date>"; SPEC-0003 "client side of <ids> verified with SPEC-0004, <date>; service side waits for SPEC-0005",
because SPEC-0003's rows name both specs.

### Deferred checks

| AC | Status after this plan | Verified by |
| --- | --- | --- |
| AC-0004-15, -33, -71 | partly: a fake `ClientHistoryReader` (`createTestApp({ clientHistory })`) and a mocked `hasHistory`; no real linked appointment exists | the first scheduling or payments spec, if the owner waives as for AC-0001-34 (G-2) |
| AC-0004-74 | partly: the API side (Observe and logs); there is no Sentry in the code, and the web app sends nothing to error tracking | the spec that adds Sentry, if any (G-4) |

### Sequence

0. **Gate: dependency status** (G-6). `task-lock.sh start` fails while SPEC-0003 is not `Implemented`
   (`.claude/bin/task-lock.sh`, the `depends_on` loop), and the script has no waiver. Before `/implement`, the owner
   takes the action G-6 names. SPEC-0001 and SPEC-0002 are Implemented.
1. **Contracts.** U-req, U-cur, U-search first, failing on the missing module. Then `packages/schemas/src/clients/*`,
   `pagination.ts`, the exports, the copy in both locales; build the package.
2. **Persistence**, in this order, because `drizzle-kit` numbers migrations by generation order: `clients.ts` and
   `index.ts`, then `drizzle-kit generate --name clients` (→ `0004_clients.sql`, read it), then `drizzle-kit generate
   --custom --name default_client_template` (→ `0005_default_client_template.sql`), then write the seed function, the
   backfill function and its single call into `0005`; update `docs/schema.dbml`. Nothing is claimed to pass here: the
   tests come in step 3.
3. **Failing tests** (`test-author`): E-cl, E-list, E-life, E-def, E-rec, E-tpl, W-list, W-cform, W-cview, fixtures,
   harness, `test-app.ts` options. Each fails because the behavior is missing.
4. **API.** Gate first (Risks 1): confirm that Observe's `skipInstrumentation` can exclude the Drizzle instance and
   that the repository's wrapped error is what the filter and Observe see. If not, stop and ask the owner.
   - **4a** create, read, update with consent: AC-0004-04 to -09, -17, -20, -24 to -28, -32, -37 to -39, -41, -42,
     -55, -56, -58, -59, -73 to -75 and E-rec.
   - **4b** list: AC-0004-10, -11, -21 to -23, -34, -35, -40, -43, -44, -50 to -52, -60, -61, -72, AC-0003-19.
   - **4c** inactivate, reactivate, delete, history: AC-0004-12 to -16, -36, -45, -54, AC-0003-82.
   - **4d** default template on tenant creation (`createWithOwner` calls the seed) and `ClientPhonePresence` in
     `app.module.ts`: AC-0004-01, -46, -47, E-tpl. Then run the whole API e2e suite, with `0004` and `0005` both in
     place, list every test of SPEC-0001, SPEC-0002, SPEC-0003 or the tenants that now fails, and fix each in its
     setup lines only (Risks 2). A failure that needs an assertion change stops the work and goes to the owner.
5. **Web.**
   - **5a** BFF routes, `_lib/http.ts`, `@/lib/api/clients.ts`, the adapter.
   - **5b** list and [Novo] menu: W-list.
   - **5c** fill-in, edit and consent: W-cform, AC-0001-10.
   - **5d** G-1's `actions` prop in `record-view.tsx` (with a test in `record-view.test.tsx`), then the view page
     and its actions: W-cview.
6. **Checks.** `pnpm --filter @planici/schemas build`, `pnpm lint`, `pnpm typecheck`, `pnpm --filter api test`,
   `pnpm --filter api test:e2e`, `pnpm --filter web test`. Then the owner tries the pages on a running system, which
   SPEC-0003 also waits for.

### Decisions this plan makes

The owner confirmed Decisions 1–9 as written, including Decision 2 (`record_status`, `inactive` stored as
`suspended`) and the proposed copy, on 2026-11-18. Plan approval is still pending.

1. **Routes**: `POST /v1/clients/:clientId/inactivate`, `/reactivate` and `/delete` (with `{ confirmName }`),
   matching the forms routes and `api-convention.md` (§7 left them to `/plan`).
2. **Status in the database** (§9 Q3): `clients.status` uses `record_status`, as `schema.dbml` says; `inactive` is
   stored as `suspended`, with a check that forbids `deleted` (a delete is physical, R7). The mapper is the only place
   that knows. Alternative: a new `client_status` enum (`active`, `inactive`), which `schema.dbml` would then change to.
3. **Search and cursor**: `name_key` column with `textKey`; `like` contains-match without `pg_trgm` or `unaccent`
   (no extension, no new index type; tenant lists are small in the MVP); a cursor bound to its filter and signed with
   HMAC-SHA256 under a key derived from `JWT_SECRET`, so a tampered cursor is 422 `cursor.invalid` as
   `api-convention.md` requires (API, List).
4. **Default template through a SQL function** used by both the backfill and `createWithOwner`, in the tenant's
   transaction. It keeps tenants and forms modules apart and leaves one definition of "Cliente". The cost: the
   function repeats how `POST /v1/forms` stores a template; E-def compares the seeded template with one created
   through the API, field by field, so a later change to the forms tables shows up there. Alternative: a forms-side
   `TenantCreatedEvent` handler, which is not atomic (a failure leaves a tenant without "Cliente") and still needs a
   SQL backfill.
5. **Consent text served by the BFF** (`GET /api/clients/consent`), so the page shows the deployed text and version,
   not the bundle it loaded with. No API endpoint: the version is a shared constant, the text is copy.
6. **`empty` vs `emptyFilter`** costs one `status=all&limit=1` request only when a filtered first page is empty.
7. **Proposed copy** for every key marked so under Copy, and all en-US strings.
8. **Consent attestation columns on `clients`**, not a separate table: one attestation per client, never updated
   (R12). `consent_attested_by` restricts a user delete; erasure is manual (§2).
9. **`createdAt`/`updatedAt` come from the record** (SPEC-0003 point 5), so inactivating does not change the
   response's `updatedAt`. _Amended by SPEC-0006 R9: `updatedAt` no longer comes from the record; it is the
   client's last update time, which inactivation and reactivation change. `createdAt` is unchanged. SPEC-0006's
   plan carries the change._

### Gaps and conflicts for the owner

The owner decided G-1 to G-6 on 2026-11-18, each as proposed.

| # | Where | Gap or conflict | Decision |
| --- | --- | --- | --- |
| G-1 | SPEC-0003 point 7 | `RecordView` takes only `adapter` and `recordId`. The view page needs the loaded client for "Inativar", "Reativar", "Excluir", the badge and `hasHistory`, and a reload after a 409. | **Decided (owner, 2026-11-18):** add an optional `actions?: (record, reload) => ReactNode` prop to `RecordView`, additive, with its test in `record-view.test.tsx`; this plan amends SPEC-0003 point 7 at `/implement` step 5d. |
| G-2 | §2 Dependencies; AC-0004-15, -33, -71 | "The history can be seeded directly", but there is no appointment or payment table to seed. | **Decided (owner, 2026-11-18):** test with a fake `ClientHistoryReader`; the three stay partly verified until the first scheduling or payments spec, as for AC-0001-34 (Deferred checks). |
| G-3 | R11; SPEC-0001 R4 | A tenant with no client template but another template named "Cliente" (a service template) cannot get a second "Cliente": `name_key` is unique per tenant. §9 Q11 covered tenants with a client template or 200 templates, not this one. | **Decided (owner, 2026-11-18):** the seed skips such a tenant. The seed does not check the 200-template cap (R19): a tenant with 200 templates and no client template gets "Cliente" as its 201st, since the cap only blocks new creates. |
| G-4 | R13, AC-0004-74; SPEC-0003 Risks 7 | R13 and AC-0004-74 name Sentry; the code has no Sentry. The API's error tracking is `@nestjs/observe`. | **Decided (owner, 2026-11-18):** "error tracking" means Observe for this plan; AC-0004-74 checks the API side and stays partly verified for Sentry. |
| G-5 | SPEC-0005 R10 | The same seed rule applies to "Serviço", but SPEC-0005 is Draft. | **Decided (owner, 2026-11-18):** seed "Cliente" only. SPEC-0005's plan adds `planici_seed_service_template` the same way. |
| G-6 | Sequence step 0; `.claude/bin/task-lock.sh` | SPEC-0003 is Approved, not Implemented, until a route exists, and this spec `depends_on` it. `task-lock.sh start` refuses any dependency that is not `Implemented` and has no waiver, so `/implement` cannot start. | **Decided (owner, 2026-11-18):** option (a). Before `/implement`, SPEC-0003 is set `status: Implemented`, with a changelog line saying the owner accepts its code, that the running-system check of its pages happens at this spec's `/done`, and that its Deferred checks stay open. |

### Risks

1. **Client data in errors** (R13). Drizzle's error message holds the query parameters. Cheapest check: the Step 4
   gate and AC-0004-74's forced failure. If Observe cannot skip the Drizzle instance, the wrapper alone may not be
   enough, and the owner decides.
2. **Default template breaks other specs' tests.** Every tenant now starts with "Cliente". AC-0001-48 seeds 200
   templates (now 201), AC-0001-59 seeds its own "Cliente" (now a name clash), and any test listing all templates
   sees one more. Cheapest check: the full e2e run in Sequence step 4d. Fixes stay in setup lines (seed 199, reuse the seeded "Cliente",
   `withoutDefaultTemplate`); an assertion change goes to the owner.
3. **The seed function drifts from the forms tables.** A later SPEC-0001 or SPEC-0002 change to how templates are
   stored would need the function updated. E-def compares the seeded template with an API-created one, so the drift
   fails a test.
4. **Search cost.** `like '%k%'` scans the tenant's rows. Fine for MVP lists; a tenant with many thousands of
   clients would need `pg_trgm`, a later migration with no contract change.
5. **Dependency status** (G-6). `/implement` cannot lock the task until the owner takes G-6's action (Sequence step 0).
6. **E2e needs Docker** (Testcontainers). Without it, step 6 runs only unit and web tests, and says so.
7. **The shared web interface** (SPEC-0003 point 7). G-1 changes it; consent uses only what exists (`extraFields`,
   `onSaveError`, the `onChange` of the last render).

### New dependencies

None. The cursor, search normalisation and SQL function use what the code already has (`textKey`, Zod, Drizzle,
`drizzle-kit --custom`).

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
| 1.1 | 2026-11-18 | Implementation plan (§11) drafted by `/plan` against the code of SPEC-0001, SPEC-0002 and SPEC-0003: `clients` table and migrations `0004`–`0005` (default "Cliente" seed and backfill), the client endpoints, list search and cursor, the `/clients` pages on SPEC-0003's components, the deferred criteria of SPEC-0001, SPEC-0002 and SPEC-0003, Decisions 1–9 and gaps G-1 to G-6 for the owner. plan_status Draft |
| 1.2 | 2026-11-18 | Plan review (2026-11-18): required changes 1–4 applied. 1: the separate-branch e2e run in step 0 is gone; the full suite runs in step 4d, after `0004` and `0005` are generated in that order (step 2). 2: the list cursor is signed with HMAC-SHA256 under a key derived from `JWT_SECRET`, so a tampered cursor is 422 `cursor.invalid` (`api-convention.md`); U-cur tests tampering. 3: G-6 names the owner action that unblocks `task-lock.sh start` (SPEC-0003 set Implemented, or SPEC-0003 removed from `depends_on` for the run). 4: `0005` adds `planici_backfill_client_templates()`, which E-def calls with tenants in place for AC-0004-46 and -47; the pass claim moved from step 2 to step 4d. Should-fix items 1–6 left as follow-ups. plan_status Draft |
| 1.3 | 2026-11-18 | Owner decisions (Joao Izidoro, 2026-11-18): G-1 to G-6 decided as proposed (G-1 `actions` prop on `RecordView`; G-2 fake history reader, AC-0004-15, -33, -71 partly verified; G-3 seed skips a tenant with another "Cliente"; G-4 Observe as error tracking, AC-0004-74 partly verified; G-5 "Cliente" only; G-6 option (a), SPEC-0003 set Implemented before `/implement`). Decisions 1–9 and the proposed copy confirmed. plan_status Draft: plan approval pending |
| 1.4 | 2026-11-18 | Plan approved by Joao Izidoro, 2026-11-18: §11 as revised in 1.1 to 1.3, after the plan review and its re-check (ready for approval). Should-fix items 1–6 of the review (lock order, AC-0004-74 constraint cleanup, rollback wording, `schema.dbml` tenant id type, `drizzle/meta/*` in scope, the two history readers) stay follow-ups. Before `/implement`, SPEC-0003 is set Implemented (G-6). plan_status Approved |
| 1.5 | 2026-11-19 | Implemented per §11. Built: client contracts (`packages/schemas/src/clients/`, `pagination.ts`, `ClientConsentTextSchema`) and copy; table `clients` (`0004`) and the "Cliente" seed and backfill functions (`0005`), seeded in `createWithOwner`'s transaction; `ClientsModule` (list with search and HMAC-signed cursor, create, read, update with consent in the §6 order, inactivate, reactivate, delete), `ClientPhonePresence` for `FormsModule`, Drizzle skipped by Observe and client query errors wrapped with fixed messages; the BFF, `@/lib/api/clients`, the `/clients` list, [Novo] menu, fill-in with consent, edit and view pages with actions (`RecordView` `actions`, G-1). All 75 criteria have passing tests (U-req, U-cur, U-search, E-cl, E-list, E-life, E-def, E-rec, E-tpl, W-list, W-cform, W-cview). Partly verified, per Deferred checks: AC-0004-15, -33, -71 (fake history reader; first scheduling or payments spec) and -74 (Observe and logs; no Sentry). Owner decision during implementation: AC-0001-32's test reads "unchanged" as the client data, with `form.status` "archived" (2026-11-19). Review: one blocking item (consent response shape outside `packages/schemas`), fixed; re-check PASS. Status stays Approved until the owner accepts the behavior on a running system |
| 1.6 | 2026-11-19 | Amended by SPEC-0006 (approved by Joao Izidoro, 2026-11-19): R10 is the default of four sorts; §4.1 step 2 drops the Modelo column and step 5 covers the template filter; §6 list check order and `cursor.invalid` row; §7 "List" adds `formId`, `sort` and `total`; §8 "success" and "empty under the chosen filter" rows. Each place carries the note "amended by SPEC-0006". No criterion of this spec changes. |
| 1.7 | 2026-11-20 | Amended by SPEC-0006 v1.7 (approved by Joao Izidoro, 2026-11-20). Rewritten notes: R10 (three sorts `name`, `-name`, `-updatedAt`), §4.1 step 2 (rows and cards with a template badge, template filter on wide screens), §7 "List" (`sort` values), §8 "success" row. New notes: §4.1 step 6 and §8 "loading more" and "loading more failed" rows (infinite scroll), §4.2 step 1 (floating [Novo] on narrow screens), §7 "Client" (`updatedAt` is the last update time, changed on inactivation and reactivation), §7 "ClientSummary" (adds `updatedAt`), §11 Decision 9. AC-0004-63 superseded by AC-0006-45. Status stays Approved. |
| 1.8 | 2026-11-20 | Status Implemented: Joao Izidoro accepts the behavior on a running system, 2026-11-20, as implemented per §11 (1.5), so SPEC-0006, which `depends_on` this spec, can start `/implement` (SPEC-0006 §11, G-5). The parts marked "amended by SPEC-0006" (v1.6, v1.7) describe SPEC-0006's behavior and are built and verified by SPEC-0006. |
