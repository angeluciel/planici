---
id: SPEC-0003
title: Preenchimento de cadastro a partir de modelo
status: Approved # Draft | Review | Approved | Implemented | Superseded
plan_status: Draft # Draft | Approved
version: 1.0
owner: Joao Izidoro
satisfies: [RF-40, RF-41, RF-42, RN-01, RN-02, RN-20, RN-21, RNF-07]
depends_on: [SPEC-0001, SPEC-0002]
phase: MVP
ticket: -
---

# SPEC-0003 — Preenchimento de cadastro a partir de modelo

## 1. Purpose

A **record** (cadastro), meaning one client or one service, is created by filling in the fields of one template.
This spec covers what is shared by both: how the template is rendered, how each value is validated, how protected
values are shown, and what a record looks like after its template changes. It addresses RFC §2.2.9 (UC-46–UC-48)
in the "one template per record" model (forms-overview.md D-4).

## 2. Scope

**In scope**
- Rendering a template as a fill-in page for a new record, and as view and edit pages for an existing one.
- Validation rules for each field type of SPEC-0002 §3.1.
- Display of protected values.
- Which template version a record is linked to, and how it is displayed and validated against it.
- What "Atualizar todos" does to a record (migration).
- Metadata changes (labels, help text, protection, option labels) shown on records of every version.
- Protection against two tabs overwriting the same record (R14).

**Out of scope**
- Client-specific rules (e-mail uniqueness, lists, inactivation): SPEC-0004.
- Service-specific rules (duration, price, lists, inactivation): SPEC-0005.
- The consent attestation on a client's first save (RFC §6, "Dados Sensíveis (art. 11)"; forms-overview.md
  D-12): SPEC-0004 R12.
- Changing a record's template: post-MVP (D-4).
- Moving a single record to the latest version on its own: post-MVP (SPEC-0001 Q6).
- Searching, filtering or exporting by custom-field values: post-MVP.
- Drafts and autosave of a half-filled record: post-MVP.
- Audit events (RFC §6, "Auditoria e Monitoramento"; RNF-11) for creating and editing records: the separate audit
  spec, as in SPEC-0001 §2 (owner decision, 2026-11-09).

**Dependencies**
- This spec depends on SPEC-0001 (templates, versions, "Atualizar todos") and SPEC-0002 (field types and
  attributes). Both are approved.
- The record endpoints belong to SPEC-0004 (clients) and SPEC-0005 (services), which embed the shapes of §7. Every
  API criterion here runs through them, so it can be verified only once they are implemented.
- AC-0003-19 also needs the client list of SPEC-0004. AC-0003-82 needs inactivation (SPEC-0004 §4.4).

## 3. Domain rules

- **R1.** A record is created from exactly one **active** template whose type matches the record (a client from a
  `client` template). It stays bound to that template, and is linked to the template's **latest published
  version** at the moment it is created. (D-4, RF-40, RN-21, SPEC-0001 R7, R16)
- **R2.** Pages show the fields of the record's **linked version**, in that version's order, with the current
  label and help text (metadata applies to every version, SPEC-0001 §3.3), and mark required ones. (RN-20, RN-21)
- **R3.** Each field holds at most one value. A blank value (empty, or whitespace only) or `null` means "no value"
  and is not stored. (owner decision, §9 Q6)
- **R4.** Values are validated by field type (§3.1). System-field values are also validated by SPEC-0004 or
  SPEC-0005.
- **R5.** `values` holds only the **custom** fields of the record's linked version (for a new record, the latest
  version). System-field values go in the record's top-level attributes (SPEC-0004/0005). A `values` key equal to a
  system field's id is rejected with 422 `value.unknown-field`. (RN-21; owner decision, 2026-11-09)
- **R6.** Required fields of the linked version, system fields included, must have a value on **every** save,
  create or edit. When "Atualizar todos" migrates a record to a version where a field it has no value for is
  required (a new required field, or an existing field turned required, SPEC-0002 R14), the record is migrated
  without that value and the field is pending (`missingRequired`). It is required at the next save. A pending
  system field fails with its own spec's error: for a client's phone, SPEC-0004 `phone.required` on `phone`.
  (RN-20, D-10; owner decision, 2026-11-09)
- **R7.** Every save states the template version the page was showing. A new record is rejected if a newer
  version was published since the page opened. An edit is rejected if the record was migrated since the page
  opened. Nothing is stored in either case. (owner decision, §9 Q5)
- **R8.** Template changes never delete or rewrite stored values, except an explicit "Atualizar todos" migration
  (R13). Metadata changes only change how values are shown. (RN-21)
- **R9.** Protected values are hidden by default on the record's view page and revealed per field on request.
  They are shown in plain text on the edit page. The record response includes protected values, and the UI masks
  them. No custom-field value, protected or not, appears in record lists or search results (SPEC-0004 §4.1).
  (forms-overview.md D-3; RFC §6; owner decisions, §9 Q2 and 2026-11-09)
- **R10.** No field value, protected or not, is written to logs or echoed in error responses. (RFC §6, "Auditoria e
  Monitoramento")
- **R11.** Custom-field values are encrypted at rest. (RFC §6, "Dados Sensíveis (art. 11)"; forms-overview.md
  Q-F)
- **R12.** A record and its values belong to one tenant. Another tenant's record behaves as not found. (RN-02)
- **R13.** Migrating a record ("Atualizar todos", SPEC-0001 R17) links it to the new version. Answers to fields
  that exist in both versions are kept unchanged. Answers to fields, or `select` options, that are not in the new
  version are deleted, which the professional confirmed by typing the template name (SPEC-0001 R18). New fields
  start empty. (RN-21, RN-25, D-10)
- **R14.** Every update states the record **revision** it was based on. An update based on an outdated revision
  is rejected with 409 `record.revision-conflict`, stores nothing, and never silently overwrites newer changes. A
  new record starts at revision 1, and the revision goes up on every stored change to its attributes or values,
  including a migration by "Atualizar todos". Inactivating or reactivating does not change it. (owner decision,
  2026-11-09; same pattern as SPEC-0001 R11)

### 3.1 Value rules per type

Input is normalised before validation: trimmed; for `cpf`, `phone` and `cep`, non-digits removed; the UF uppercased.

| Type | Accepts | Stored and shown as | Error key |
| --- | --- | --- | --- |
| `text` | 1–255 characters | trimmed | `value.max` |
| `long_text` | 1–5,000 characters, line breaks kept | trimmed | `value.max` |
| `number` | a number with at most 2 decimals, between −999,999,999.99 and 999,999,999.99. The UI accepts "72,5". | shown with a pt-BR decimal comma | `number.invalid` |
| `date` | a real calendar date between 1900-01-01 and 2100-12-31 | `dd/mm/aaaa` in pt-BR | `date.invalid` |
| `yes_no` | true / false; no value (absent or `null`) counts as false | "Sim" / "Não"; returned as `false` when it has no value | `value.invalid` |
| `select` | the id of one option of the record's linked version | option label | `option.invalid` |
| `email` | a valid address, lowercased | as stored | `email.invalid` |
| `phone` | 10 or 11 digits; the first two are a DDD on Anatel's list of area codes; 11-digit numbers start with 9 after the DDD | `(11) 98765-4321` | `phone.invalid` |
| `cpf` | 11 digits, valid check digits, not all identical | `000.000.000-00` | `cpf.invalid` |
| `full_name` | 1–120 characters, repeated spaces collapsed | as stored | `value.max` |
| `address` | CEP (8 digits), logradouro (1–120), número (1–10, "s/n" allowed), complemento (0–60), bairro (1–60), cidade (1–60), UF (one of the 27; lowercase accepted, stored uppercase) | one line, then CEP | `cep.invalid`, `uf.invalid`, `address.incomplete`, `value.max` |

The limits and formats in this table are owner decisions (§9 Q6). An optional `address` must be fully empty or
complete. Partial input fails with `address.incomplete`. Phone numbers are Brazilian only in the MVP (owner
decision, §9 Q4). A `yes_no` field is never required (SPEC-0002 R8), so having no value is always valid for it.

## 4. Behavior

### 4.1 Create a record
1. The professional picks a template in the **[Novo]** dropdown of `/clients` or `/services` (SPEC-0004/0005), or
   arrives from the template editor shortcut (SPEC-0001 §4.3).
2. The system opens the fill-in page (`/clients/new?form=:id`), titled "Novo cliente", with the subtitle
   "Modelo: <template name>". The page uses the template's latest version (R1). Fields appear in that version's
   order (R2). Required ones are marked with "*". Help text appears under the input. If the template is archived
   or does not exist, the page says "Este modelo não está disponível." with a way back. If it cannot be loaded,
   the page says "Não foi possível carregar o modelo." with a retry button.
3. The professional fills in the fields and presses **[Salvar]**.
4. The page validates every field with the §3.1 rules and shows **all** errors at once, focusing the first.
   The server re-validates and returns only the first issue (`api-convention.md`, Validation).
5. On success the system stores the record and opens its view page with the toast "Cliente cadastrado".
6. **[Cancelar]** returns to the list. If anything was typed, it asks "Descartar cadastro?" first.
7. If the save is rejected because the template was archived (409 `form.archived`) or deleted (400
   `formId.invalid`) since the page opened, the page says "Este modelo não está disponível." with a way back.

### 4.2 View a record
1. The view page lists the fields of the record's linked version, in that version's order, as label and value.
   Fields with no value show "—", except `yes_no` fields, which show "Não" (§3.1).
2. Protected values show as "••••••" with a **"Mostrar"** control per field. Revealing lasts until the page is
   left (R9).
3. The template name and "Versão N" are shown, and the name links to the template editor. If the record is on an
   older version than the latest, the page also says "Este cadastro usa uma versão anterior do modelo".
4. An unknown record id shows "Cadastro não encontrado." If the record cannot be loaded, the page says "Não foi
   possível carregar o cadastro." with a retry button.

### 4.3 Edit a record
1. **[Editar]** opens the fill-in page pre-filled with current values. Protected values are shown in plain text.
   An unknown record id shows "Cadastro não encontrado."
2. The edit page shows the fields of the record's linked version, not the latest one (R2). Saving follows 4.1
   steps 3–5 (toast "Alterações salvas"). Pending required fields from a migration must be filled (R6).
3. If a required field of the linked version has no value, the view page shows "Preenchimento pendente" next to
   it, so the professional is not surprised at the next save.
4. If the record was changed elsewhere since the edit page opened (another tab), the save is rejected (R14). The
   page shows "Este cadastro foi alterado em outra janela. Recarregue para ver a versão atual." and the typed
   values stay on screen until the professional reloads.

### 4.4 New version published while filling (R7)
1. The professional is filling in a new record, or editing one, and in another tab a new version is published (or
   "Atualizar todos" migrates the record being edited).
2. On **[Salvar]**, the system rejects the save and stores nothing.
3. The page reloads with the version the record now uses (the latest one, for a new record). It keeps every typed
   value whose field still exists, drops values of fields that are gone and `select` choices whose option is
   gone, and shows "O modelo foi atualizado. Revise os campos e salve novamente." Metadata-only changes never
   cause this.

## 5. Permissions and tenant isolation

| Action | Unauthenticated | Member | Owner | Other tenant |
| --- | --- | --- | --- | --- |
| Create record from template | 401 | — (post-MVP) | 201 | 400 `formId.invalid` (template of another tenant) |
| Read record | 401 | — | 200 | 404 `client.not-found` / `service.not-found` |
| Update record | 401 | — | 200 | 404 `client.not-found` / `service.not-found` |

A tenant context without membership returns 404 `tenant.not-found`, as in SPEC-0001 §5. Every action above is
tenant-scoped and follows `api-convention.md`, Tenant context: a request without tenant context returns 400
`tenant.required`, and a request whose active tenant is inactive (suspended) returns 403 `tenant.inactive`.

## 6. Errors

`<fieldId>` is the template field's id.

| Situation | Status | `error` key | `field` |
| --- | --- | --- | --- |
| Template id missing on create | 422 | `formId.required` | `formId` |
| Template id sent on update (changing the template is post-MVP) | 422 | `formId.not-allowed` | `formId` |
| Template id malformed | 422 | `formId.invalid` | `formId` |
| Template id well-formed but unknown, or of another tenant | 400 | `formId.invalid` | `formId` |
| Template type does not match (service template for a client) | 422 | `formType.mismatch` | `formId` |
| Template is archived (create only) | 409 | `form.archived` | `formId` |
| `formVersion` missing | 422 | `formVersion.required` | `formVersion` |
| `formVersion` not a positive integer | 422 | `formVersion.invalid` | `formVersion` |
| `formVersion` is not the version the record must use (R7) | 409 | `record.form-changed` | `formVersion` |
| `revision` missing on update | 422 | `recordRevision.required` | `revision` |
| `revision` not a positive integer | 422 | `recordRevision.invalid` | `revision` |
| Update based on an outdated revision (R14) | 409 | `record.revision-conflict` | `revision` |
| `values` missing or not an object | 422 | `values.invalid` | `values` |
| Required field without value | 422 | `value.required` | `values.<fieldId>` |
| A `values` key that is not a well-formed field id | 422 | `value.unknown-field` | `values.<key>` |
| A `values` key equal to a system field's id (R5) | 422 | `value.unknown-field` | `values.<fieldId>` |
| Value for a well-formed field id that is not in the record's version (including another tenant's field) | 400 | `value.unknown-field` | `values.<fieldId>` |
| Value of the wrong JSON type | 422 | `value.invalid` | `values.<fieldId>` |
| Text over its limit | 422 | `value.max` | `values.<fieldId>`; for an address, `values.<fieldId>.street`, `.number`, `.complement`, `.district` or `.city` |
| Type rule failed | 422 | `number.invalid`, `date.invalid`, `option.invalid`, `email.invalid`, `phone.invalid`, `cpf.invalid` | `values.<fieldId>` |
| Address part invalid | 422 | `cep.invalid`, `uf.invalid` | `values.<fieldId>.cep` / `.state` |
| Address partly filled | 422 | `address.incomplete` | `values.<fieldId>` |

After authentication and tenant context (§5), checks run in this order, and the first failure is the response
(owner decision, 2026-11-09):
1. Request shape (422): `formId`, `formVersion`, `revision` and `values` present where required and well-formed,
   no `formId` on update, and every `values` key a well-formed field id.
2. On create, the template: unknown or of another tenant (400), wrong type (422), archived (409). On update, the
   record: unknown or of another tenant (404).
3. The template version: `record.form-changed` (409).
4. On update, the revision: `record.revision-conflict` (409).
5. Field-level checks: `values` keys against the version, required fields, type rules, and the system-attribute
   rules of SPEC-0004/0005.

So an update outdated in both template version and revision gets `record.form-changed`, because the page must
reload with the record's new version. A save on an outdated version never reports a field error.

`email.invalid` already exists. All other keys are new and need pt-BR and en-US copy.

## 7. Contract impact

New, non-breaking. Consumers: `apps/web`. The client and service shapes in SPEC-0004/0005 embed these.

- **Value** by field type: `text`, `long_text`, `full_name`, `email`, `phone`, `cpf` → string (stored
  normalised); `number` → number; `date` → `YYYY-MM-DD` string; `yes_no` → boolean; `select` → option id
  (string); `address` → `{ cep, street, number, complement | null, district, city, state }`.
- **Record request (create)**: `formId` (required), `formVersion`, the system-field attributes of the type
  (SPEC-0004/0005), and `values`: object keyed by custom field id (R5); `null` means no value (R3).
- **Record request (update)**: `revision` (int, required, R14), `formVersion`, system-field attributes, `values` as
  the **full** set of custom values of the linked version (absent keys and `null` clear the value). No `formId`:
  changing a record's template is post-MVP.
- **Record response**: `id`, `form` (`{ id, name, version, latestVersion, status }`, where `version` is the linked
  version), `revision` (int, R14), system-field attributes, `values` (custom fields of the linked version that have a
  value, keyed by field id, protected values included, R9; a `yes_no` with no value is returned as `false`),
  `missingRequired` (ids of required fields of the linked version without a value, system fields included, R6),
  `status`, `createdAt`, `updatedAt`.
- Pages render a record with its linked version's fields, from the version read in SPEC-0001 §7.
- The value rules of §3.1 live once in the shared contracts and are used by the web fill-in page and the API.

## 8. UI states

`{entity}` is `clients` or `services`, matching SPEC-0004 §8 and SPEC-0005 §8.

| Screen | State | Behavior | Copy key |
| --- | --- | --- | --- |
| Fill-in | loading template | Skeleton of N field rows | `{entity}.form.loading` |
| Fill-in | template load error | "Não foi possível carregar o modelo." + retry | `{entity}.form.loadError` |
| Fill-in | template archived or not found | "Este modelo não está disponível." + back | `{entity}.form.unavailable` |
| Fill-in | template archived or deleted, found on save (4.1 step 7) | "Este modelo não está disponível." + back | `{entity}.form.unavailable` |
| Edit | record not found | "Cadastro não encontrado." + back to the list | `{entity}.form.notFound` |
| Fill-in | saving | [Salvar] disabled with spinner | `{entity}.form.saving` |
| Fill-in | validation errors | Inline per field, summary at top "Corrija N campos" | `{entity}.form.errorSummary` |
| Fill-in | template changed (4.4) | Banner, form reloaded | `{entity}.form.formChanged` |
| Edit | revision conflict (4.3 step 4) | Banner with [Recarregar]; typed values kept | `{entity}.form.revisionConflict` |
| Fill-in | unexpected error | "Não foi possível salvar. Tente novamente." Typed values kept | `{entity}.form.saveError` |
| Fill-in | dirty, leaving | "Descartar cadastro?" | `{entity}.form.discard` |
| Toast | created / saved | "Cliente cadastrado" / "Alterações salvas" | `{entity}.toast.created`, `{entity}.toast.saved` |
| View | loading | Skeleton | `{entity}.view.loading` |
| View | load error | "Não foi possível carregar o cadastro." + retry | `{entity}.view.loadError` |
| View | not found | "Cadastro não encontrado." | `{entity}.view.notFound` |
| View | empty value | "—"; a `yes_no` shows "Não" | — |
| View | protected value hidden / shown | "••••••" + "Mostrar" / value + "Ocultar" | `{entity}.view.reveal`, `{entity}.view.hide` |
| View | older version | "Este cadastro usa uma versão anterior do modelo" | `{entity}.view.olderVersion` |
| View | version badge | "Modelo: <name> · Versão N" | `{entity}.view.version` |
| View | required field missing | "Preenchimento pendente" badge | `{entity}.view.missingRequired` |

## 9. Open questions

| # | Question | Proposed answer | Blocks |
| --- | --- | --- | --- |
| 1 | ~~Required fields added later.~~ | **Decided (D-10):** records on older versions are unaffected; migrated records are flagged pending and required at their next save. | — |
| 2 | ~~Should a protected value come from the API only on explicit reveal, so reveals can be audited (RFC §6 audit logs)?~~ | **Decided (owner, 2026-11-09):** not in the MVP. The response includes protected values and the UI masks them (R9). | — |
| 3 | ~~Clearing values of archived fields.~~ | **Superseded (v0.3):** fields are no longer archived; older versions keep them (D-10). | — |
| 4 | ~~International phone numbers?~~ | **Decided (owner, 2026-11-09):** Brazilian numbers only in the MVP. | — |
| 5 | ~~Rejecting a stale template version (R7) vs. validating against the current template.~~ | **Decided (owner, 2026-11-09):** reject (R7). | — |
| 6 | ~~Value rules: one value per field and blank means no value (R3); the §3.1 limits and formats (number range and decimals, 1900–2100 dates, address part lengths, "s/n", phone DDD and leading 9, CPF not all identical).~~ | **Decided (owner, 2026-11-09):** accepted as written. A valid DDD is one on Anatel's list of area codes. A lowercase UF is accepted and stored uppercase. | — |

## 10. Acceptance criteria

### Agreed criteria

These follow from the RFC or from decisions the owner has taken (forms-overview.md §3 and §9 of this spec).
The owner approved every criterion below on 2026-11-09.

Each criterion applies to clients and services. Tests cover both; the examples use clients, so copy keys use the
`clients.` prefix.

```gherkin
AC-0003-01
Given an active client template "Ficha" whose Telefone is not required, with custom fields "Profissão" (text) and "Objetivo" (long_text), in that order after the system fields
When  the owner opens the fill-in page for "Ficha"
Then  the inputs appear in the order Nome completo, E-mail, Telefone, Profissão, Objetivo
And   Nome completo and E-mail are marked required, and Telefone is not
```

```gherkin
AC-0003-02
Given template "Ficha" with a required custom field "Profissão" whose id is P
When  the owner creates a client with valid system fields and no value for P
Then  the response is 422 with { "error": "value.required", "field": "values.P" }
And   no client is stored
```

```gherkin
AC-0003-03
Given template "Ficha" with a required field "Profissão" whose id is P
When  the owner creates a client with valid system fields and "   " for P
Then  the response is 422 with { "error": "value.required", "field": "values.P" }
And   no client is stored
```

```gherkin
AC-0003-04
Given a "cpf" field C
When  the owner submits "123.456.789-00" for C
Then  the response is 422 with { "error": "cpf.invalid", "field": "values.C" }
```

```gherkin
AC-0003-05
Given a "cpf" field C
When  the owner creates a client with "529.982.247-25" for C
Then  the response's values hold "52998224725" for C
```

```gherkin
AC-0003-06
Given a "phone" field T
When  the owner submits "(11) 8765-43210" for T
Then  the response is 422 with { "error": "phone.invalid", "field": "values.T" }
```

```gherkin
AC-0003-07
Given an optional "address" field A
When  the owner submits only cep "01310100" and city "São Paulo"
Then  the response is 422 with { "error": "address.incomplete", "field": "values.A" }
```

```gherkin
AC-0003-08
Given a "select" field S with options "Manhã" and "Tarde"
When  the owner submits an option id that is not one of them
Then  the response is 422 with { "error": "option.invalid", "field": "values.S" }
```

```gherkin
AC-0003-09
Given a "date" field D
When  the owner submits "2025-02-30"
Then  the response is 422 with { "error": "date.invalid", "field": "values.D" }
```

```gherkin
AC-0003-10
Given template "Ficha" whose latest version does not contain field "Hobby" (id H) any more
When  the owner creates a client with formVersion set to that latest version and a value for H
Then  the response is 400 with { "error": "value.unknown-field", "field": "values.H" }
```

```gherkin
AC-0003-11
Given an archived client template "Antigo"
When  the owner creates a client from it
Then  the response is 409 with { "error": "form.archived", "field": "formId" }
```

```gherkin
AC-0003-12
Given an active service template "Serviço padrão"
When  the owner creates a client with its id
Then  the response is 422 with { "error": "formType.mismatch", "field": "formId" }
```

```gherkin
AC-0003-13
Given a client template belonging to tenant "studio-bia"
When  the owner of "studio-ana" creates a client with that template id
Then  the response is 400 with { "error": "formId.invalid", "field": "formId" }
And   no client is stored in either tenant
```

```gherkin
AC-0003-14
Given the owner opened the fill-in page for "Ficha" while its latest version was 2
And   version 3 was then published
When  the owner submits the record with formVersion 2
Then  the response is 409 with { "error": "record.form-changed", "field": "formVersion" }
And   no client is stored
```

```gherkin
AC-0003-15
Given a client with value "Engenheira" for field "Profissão"
When  the owner relabels the field to "Ocupação"
Then  the template's version does not change
And   the client's view page shows "Ocupação: Engenheira"
```

```gherkin
AC-0003-16
Given a client on version 1 of "Ficha" with value "Corrida" for field "Hobby"
When  the owner removes "Hobby" and applies with "Manter existentes"
Then  the client's view and edit pages still show "Hobby" with "Corrida"
And   the fill-in page for a new client does not offer "Hobby"
```

```gherkin
AC-0003-17
Given a client migrated by "Atualizar todos" to a version where field "Profissão" (id P) is required, without a value for P
When  the owner edits only the client's phone and saves without "Profissão"
Then  the response is 422 with { "error": "value.required", "field": "values.P" }
```

```gherkin
AC-0003-18
Given a client with value "Hipertensão" in protected field "Diagnóstico"
When  the owner opens the client's view page
Then  "Diagnóstico" shows "••••••" and a "Mostrar" control
And   pressing "Mostrar" shows "Hipertensão" until the page is left
```

```gherkin
AC-0003-19
Given a protected field "Diagnóstico" with value "Hipertensão" in a client
When  the client list is requested
Then  the list response contains no custom-field values
```

```gherkin
AC-0003-20
Given a client with value "Hipertensão" in field "Diagnóstico"
When  the client is created, read, updated and fails validation once
Then  no application log line contains "Hipertensão"
```

```gherkin
AC-0003-21
Given an owner filling a record with three invalid fields
When  they press Salvar
Then  all three fields show inline errors, the summary says "Corrija 3 campos" (clients.form.errorSummary)
And   focus moves to the first invalid field
And   no request is sent
```

```gherkin
AC-0003-22
Given a client of tenant "studio-bia"
When  the owner of "studio-ana" reads it with "studio-ana" as active tenant
Then  the response is 404 with { "error": "client.not-found" }
```

```gherkin
AC-0003-23
Given "Ficha" at version 3
When  the owner creates a client from it
Then  the response is 201 with form.version 3 and form.latestVersion 3
```

```gherkin
AC-0003-24
Given a client on version 1 of "Ficha", with answers for "Profissão" and "Objetivo"
And   version 2 keeps "Profissão" and removes "Objetivo"
When  the owner applies version 2 with "Atualizar todos" and confirms the template name
Then  the client reports form version 2, keeps its "Profissão" answer and has no "Objetivo" answer
```

```gherkin
AC-0003-25
Given a client on version 1 of "Ficha" while the latest version is 2
When  the owner opens the client's view page
Then  it shows the fields of version 1 and the notice with copy key clients.view.olderVersion
```

```gherkin
AC-0003-26
Given the owner opened the edit page of a client on version 1 at revision 3
And   "Atualizar todos" then migrated that client to version 2, raising its revision to 4
When  the owner saves the edit with formVersion 1 and revision 3
Then  the response is 409 with { "error": "record.form-changed", "field": "formVersion" }
And   the client is unchanged by that save
```

```gherkin
AC-0003-27
Given a client whose protected "cpf" field C has value "52998224725"
When  the owner opens the view page and presses "Mostrar" on C
Then  C first shows "••••••" and then "529.982.247-25"
```

```gherkin
AC-0003-28
Given the owner typed values for "Profissão" and "Hobby" on the fill-in page for "Ficha" at version 2
And   version 3 keeps "Profissão" and removes "Hobby"
When  the save is rejected with record.form-changed
Then  the page shows "Ficha" at version 3 with the banner with copy key clients.form.formChanged
And   "Profissão" keeps its typed value and "Hobby" is no longer shown
```

```gherkin
AC-0003-29
Given the client of AC-0003-17, before any edit
When  the owner opens its view page
Then  "Profissão" shows the badge with copy key clients.view.missingRequired
```

```gherkin
AC-0003-30
Given a client on version 1 of "Ficha", and version 2 adds field "Objetivo" (id O)
When  the owner updates the client with formVersion 1 and a value for O
Then  the response is 400 with { "error": "value.unknown-field", "field": "values.O" }
```

```gherkin
AC-0003-31
Given a "text" field X
When  the owner submits 256 characters for X
Then  the response is 422 with { "error": "value.max", "field": "values.X" }
```

```gherkin
AC-0003-32
Given an optional "address" field A
When  the owner submits a complete address whose street has 121 characters
Then  the response is 422 with { "error": "value.max", "field": "values.A.street" }
```

```gherkin
AC-0003-33
Given a "number" field N
When  the owner submits 72.555 for N
Then  the response is 422 with { "error": "number.invalid", "field": "values.N" }
```

```gherkin
AC-0003-34
Given an "email" custom field E
When  the owner submits "ana@" for E
Then  the response is 422 with { "error": "email.invalid", "field": "values.E" }
```

```gherkin
AC-0003-35
Given an optional "address" field A
When  the owner submits a complete address with cep "0131010"
Then  the response is 422 with { "error": "cep.invalid", "field": "values.A.cep" }
```

```gherkin
AC-0003-36
Given an optional "address" field A
When  the owner submits a complete address with state "XX"
Then  the response is 422 with { "error": "uf.invalid", "field": "values.A.state" }
```

```gherkin
AC-0003-37
Given a "yes_no" field Y
When  the owner submits the string "sim" for Y
Then  the response is 422 with { "error": "value.invalid", "field": "values.Y" }
```

```gherkin
AC-0003-38
Given tenant "studio-bia" has a template with field id F
When  the owner of "studio-ana" creates a client from one of their templates with a value for F
Then  the response is 400 with { "error": "value.unknown-field", "field": "values.F" }
And   no client is stored in either tenant
```

```gherkin
AC-0003-39
Given a user who owns "studio-ana" and has no membership in "studio-bia"
When  they create a client with "studio-bia" as tenant context
Then  the response is 404 with { "error": "tenant.not-found" }
```

```gherkin
AC-0003-40
Given a request with no access token
When  it creates a client
Then  the response is 401
```

```gherkin
AC-0003-41
Given an active client template "Ficha" at version 2
When  the owner creates a client from it with valid system fields and a value for its custom field "Profissão"
Then  the response is 201 with id, form { id, name "Ficha", version 2, latestVersion 2, status "active" }, revision 1, the system-field attributes, values with "Profissão", missingRequired [], status "active", createdAt and updatedAt
```

```gherkin
AC-0003-42
Given a client with a value for its optional custom field "Hobby" (id H)
When  the owner updates the client with a values object that has no key H
Then  the response is 200
And   reading the client returns no value for H
```

```gherkin
AC-0003-43
Given a client created from template "Ficha", which is now archived
When  the owner updates the client with valid values
Then  the response is 200
```

```gherkin
AC-0003-44
Given a client with value "Corrida" in custom field "Hobby"
When  the database rows that store the client and its values are read directly
Then  no stored row contains "Corrida" in plain text
```

```gherkin
AC-0003-45
Given a client on version 1 whose "select" field "Turno" holds option "Tarde"
And   version 2 removes option "Tarde" from "Turno"
When  the owner applies version 2 with "Atualizar todos" and confirms the template name
Then  the client reports form version 2 and has no value for "Turno"
```

```gherkin
AC-0003-46
Given a client on version 2 of template "Ficha"
When  the owner opens the client's view page
Then  it shows "Modelo: Ficha · Versão 2" with copy key clients.view.version
```

```gherkin
AC-0003-47
Given an archived client template "Antigo"
When  the owner opens the fill-in page for "Antigo"
Then  the page shows copy key clients.form.unavailable with a way back
```

```gherkin
AC-0003-48
Given an owner on the fill-in page with typed values
When  they press Salvar and the response is 500
Then  the page shows copy key clients.form.saveError
And   every typed value is still on screen
```

```gherkin
AC-0003-49
Given an owner on the fill-in page who typed a value
When  they press Cancelar
Then  a confirmation with copy key clients.form.discard is shown before leaving
```

```gherkin
AC-0003-50
Given an owner of "studio-ana"
When  they open the view page of a client id that does not exist in "studio-ana"
Then  the page shows copy key clients.view.notFound
```

```gherkin
AC-0003-51
Given an owner opening the fill-in page for template "Ficha"
And   loading the template fails with a server error
When  the page renders
Then  it shows copy key clients.form.loadError with a retry button
And   pressing retry loads the template again
```

```gherkin
AC-0003-52
Given an owner opening the view page of an existing client
And   loading the client fails with a server error
When  the page renders
Then  it shows copy key clients.view.loadError with a retry button
And   pressing retry loads the client again
```

```gherkin
AC-0003-53
Given an owner of "studio-ana"
When  they open the edit page of a client id that does not exist in "studio-ana"
Then  the page shows copy key clients.form.notFound
```

```gherkin
AC-0003-54
Given an active client template "Ficha"
When  the owner creates a client without formVersion
Then  the response is 422 with { "error": "formVersion.required", "field": "formVersion" }
```

```gherkin
AC-0003-55
Given an active client template "Ficha"
When  the owner creates a client with values set to a list instead of an object
Then  the response is 422 with { "error": "values.invalid", "field": "values" }
```

```gherkin
AC-0003-56
Given an owner of "studio-ana"
When  they create a client with formId "abc"
Then  the response is 422 with { "error": "formId.invalid", "field": "formId" }
```

```gherkin
AC-0003-57
Given tenant "studio-ana" is suspended
When  its owner creates a client
Then  the response is 403 with { "error": "tenant.inactive" }
```

```gherkin
AC-0003-58
Given an authenticated owner
When  they create a client without a tenant context
Then  the response is 400 with { "error": "tenant.required" }
```

```gherkin
AC-0003-59
Given a client at revision 3, opened for editing in two tabs
When  tab A saves (revision becomes 4) and then tab B saves with revision 3
Then  tab B receives 409 with { "error": "record.revision-conflict", "field": "revision" }
And   the stored client matches tab A's save
```

```gherkin
AC-0003-60
Given a client at revision 3
When  the owner updates it without revision
Then  the response is 422 with { "error": "recordRevision.required", "field": "revision" }
And   the client is unchanged at revision 3
```

```gherkin
AC-0003-61
Given the situation of AC-0003-59
When  tab B receives the revision conflict
Then  it shows the banner with copy key clients.form.revisionConflict
And   tab B's typed values are still on screen
```

```gherkin
AC-0003-62
Given a client at revision 1
When  the owner updates it with revision 1 and valid values
Then  the response is 200 with revision 2
```

```gherkin
AC-0003-63
Given a client of tenant "studio-bia"
When  the owner of "studio-ana" updates it with "studio-ana" as active tenant
Then  the response is 404 with { "error": "client.not-found" }
And   the client is unchanged
```

```gherkin
AC-0003-64
Given an active client template "Ficha"
When  the owner creates a client without formId
Then  the response is 422 with { "error": "formId.required", "field": "formId" }
```

```gherkin
AC-0003-65
Given a client at revision 3
When  the owner updates it with revision 0
Then  the response is 422 with { "error": "recordRevision.invalid", "field": "revision" }
And   the client is unchanged at revision 3
```

```gherkin
AC-0003-66
Given a client created from template "Ficha", and another active client template "Anamnese"
When  the owner updates the client with formId set to the id of "Anamnese"
Then  the response is 422 with { "error": "formId.not-allowed", "field": "formId" }
And   the client is still on "Ficha"
```

```gherkin
AC-0003-67
Given the owner opened the fill-in page for "Ficha" while its latest version was 2, and both versions 2 and 3 have a "cpf" field C
And   version 3 was then published
When  the owner creates a client with formVersion 2 and "123.456.789-00" for C
Then  the response is 409 with { "error": "record.form-changed", "field": "formVersion" }
```

```gherkin
AC-0003-68
Given a client at revision 4 whose version has a "cpf" field C
When  the owner updates it with revision 3 and "123.456.789-00" for C
Then  the response is 409 with { "error": "record.revision-conflict", "field": "revision" }
```

```gherkin
AC-0003-69
Given template "Ficha" with an optional "yes_no" field "Fumante" (id F)
When  the owner creates a client with no value for F
Then  the response is 201 with values.F false
```

```gherkin
AC-0003-70
Given the client of AC-0003-69
When  the owner opens its view page
Then  "Fumante" shows "Não"
```

```gherkin
AC-0003-71
Given a client with value "Corrida" in its optional custom field "Hobby" (id H)
When  the owner updates the client with values.H set to null
Then  the response is 200
And   reading the client returns no value for H
```

```gherkin
AC-0003-72
Given template "Ficha" whose system field Nome completo has id N
When  the owner creates a client with a valid name and also a value for N in values
Then  the response is 422 with { "error": "value.unknown-field", "field": "values.N" }
```

```gherkin
AC-0003-73
Given a client on version 1 of "Ficha" with no phone
And   version 2 makes Telefone (field id T) required
When  the owner applies version 2 with "Atualizar todos" and confirms the template name
Then  the client reports form version 2 and its missingRequired contains T
```

```gherkin
AC-0003-74
Given the client of AC-0003-73
When  the owner updates it without a phone
Then  the response is 422 with { "error": "phone.required", "field": "phone" }
```

```gherkin
AC-0003-75
Given a "phone" field T, and DDD 20, which is not on Anatel's list of area codes
When  the owner submits "(20) 98765-4321" for T
Then  the response is 422 with { "error": "phone.invalid", "field": "values.T" }
```

```gherkin
AC-0003-76
Given an optional "address" field A
When  the owner creates a client with a complete address for A whose state is "sp"
Then  the response's values hold state "SP" for A
```

```gherkin
AC-0003-77
Given the owner on the fill-in page for "Ficha" with typed values
And   "Ficha" is then archived in another tab
When  they press Salvar
Then  the page shows copy key clients.form.unavailable with a way back
```

```gherkin
AC-0003-78
Given the owner on the fill-in page for "Ficha" with typed values
And   "Ficha" is then deleted in another tab
When  they press Salvar
Then  the page shows copy key clients.form.unavailable with a way back
```

```gherkin
AC-0003-79
Given an owner of "studio-ana"
When  they create a client with a well-formed template id that no template has
Then  the response is 400 with { "error": "formId.invalid", "field": "formId" }
```

```gherkin
AC-0003-80
Given the owner chose option "Tarde" for the "select" field "Turno" on the fill-in page for "Ficha" at version 2
And   version 3 keeps "Turno" but removes option "Tarde"
When  the save is rejected with record.form-changed
Then  the page shows "Ficha" at version 3 and "Turno" has no choice selected
```

```gherkin
AC-0003-81
Given a client at revision 2 on version 1 of "Ficha"
When  the owner applies version 2 with "Atualizar todos" and confirms the template name
Then  the client reports revision 3
```

```gherkin
AC-0003-82
Given a client at revision 2
When  the owner inactivates it (SPEC-0004 §4.4)
Then  the client still reports revision 2
```

```gherkin
AC-0003-83
Given a client with value "Hipertensão" in protected field "Diagnóstico"
When  the owner opens the client's edit page
Then  the "Diagnóstico" input shows "Hipertensão" in plain text
```

```gherkin
AC-0003-84
Given a client on version 1 of "Ficha" whose "select" field "Turno" holds option "Tarde"
And   the latest version is 2 and still has "Turno" with option "Tarde"
When  the owner relabels option "Tarde" to "Vespertino"
Then  the client's view page shows "Turno: Vespertino"
```

```gherkin
AC-0003-85
Given a client on version 1 of "Ficha" with value "Corrida" in field "Hobby"
And   the latest version is 2 and still has "Hobby"
When  the owner turns protection on for "Hobby"
Then  the client's view page shows "Hobby" as "••••••" with a "Mostrar" control
```

```gherkin
AC-0003-86
Given an active client template "Ficha"
When  the owner creates a client with formVersion 0
Then  the response is 422 with { "error": "formVersion.invalid", "field": "formVersion" }
```

```gherkin
AC-0003-87
Given an active client template "Ficha"
When  the owner creates a client whose values has the key "abc", which is not a well-formed field id
Then  the response is 422 with { "error": "value.unknown-field", "field": "values.abc" }
```

```gherkin
AC-0003-88
Given a "cpf" field C
When  the owner submits "123.456.789-00" for C and the response is 422 with cpf.invalid
Then  the response body contains neither "123.456.789-00" nor "12345678900"
```

```gherkin
AC-0003-89
Given the client of AC-0003-17, before any edit
When  the owner reads the client
Then  the response's missingRequired contains P
```

```gherkin
AC-0003-90
Given the owner opening the fill-in page for "Ficha" before the template has loaded
When  the page renders
Then  it shows the skeleton with copy key clients.form.loading
```

```gherkin
AC-0003-91
Given the owner on the fill-in page with valid values
When  they press Salvar and the response has not arrived yet
Then  Salvar is disabled and shows a spinner with copy key clients.form.saving
```

```gherkin
AC-0003-92
Given the owner opening a client's view page before the client has loaded
When  the page renders
Then  it shows the skeleton with copy key clients.view.loading
```

```gherkin
AC-0003-93
Given the owner on the fill-in page for "Ficha" with valid values
When  they press Salvar and the client is created
Then  the new client's view page opens with the toast with copy key clients.toast.created
```

```gherkin
AC-0003-94
Given the owner on the edit page of a client with valid changes
When  they press Salvar and the save succeeds
Then  the client's view page opens with the toast with copy key clients.toast.saved
```

```gherkin
AC-0003-95
Given a client with no value for its optional "text" field "Hobby"
When  the owner opens the client's view page
Then  "Hobby" shows "—"
```

```gherkin
AC-0003-96
Given the owner revealed protected field "Diagnóstico" on a client's view page with "Mostrar"
When  they press the control with copy key clients.view.hide
Then  "Diagnóstico" shows "••••••" again
```

## 11. Implementation plan

Drafted by `/plan` on 2026-11-10 against SPEC-0001's and SPEC-0002's plans (both still Draft). No forms code exists
yet, so every path those plans create is taken from them. `plan_status: Draft` until the owner approves it.

### Scope

```scope
packages/schemas/src/records/*
packages/schemas/src/index.ts
packages/i18n/messages/pt-BR.json
packages/i18n/messages/en-US.json
apps/api/src/modules/records/*
apps/api/src/app.module.ts
apps/api/test/utils/records-fixtures.ts
apps/api/test/e2e/form-records*
apps/web/src/app/*/orgs/*/_components/records/*
apps/web/src/components/ui/textarea.tsx
apps/web/tests/record-*
docs/specs/SPEC-0001-modelos-de-formulario.md
```

Paths with `[lang]` and `[tenant]` use `*`, because the lock matches bash globs. SPEC-0001's file is in the lock
only for the changelog line of AC-0001-10, the one criterion an earlier plan defers to this spec (Tests). There is
no migration, so `apps/api/drizzle/**` and `apps/api/src/database/**` are not in the lock.

### Boundary with SPEC-0001, SPEC-0002, SPEC-0004 and SPEC-0005

- **SPEC-0001's plan** creates `form_records`, `form_record_values`, `FieldValueCipher`, the version read and
  "Atualizar todos" (repoint records, delete answers, raise revisions). This plan changes none of it and adds no
  migration.
- **SPEC-0002's plan** adds the field rules to `FieldPolicy`. This plan reads fields as stored. It uses none of the
  six `FieldPolicy` points (SPEC-0001 plan, API) and imports no forms code.
- **This plan** adds no HTTP route, because §2 puts the record endpoints in SPEC-0004 and SPEC-0005. It builds:
  - the shared record contracts: the value rules per type (§3.1), the request envelopes, the record part of the
    response and the error keys;
  - a `RecordsModule` in the API. Its `RecordService` runs every record check of §6 and reads and writes the two
    record tables, inside the caller's transaction;
  - the shared web components for the fill-in, edit and view pages. SPEC-0004 and SPEC-0005 mount them on their
    routes with their own API adapter.
- **SPEC-0004 and SPEC-0005** add the endpoints, the `form_record_id` link on `clients` and `services` (SPEC-0001
  plan, Persistence), the system attributes, the routes and the BFF. They rely on the points listed under "What
  SPEC-0004 and SPEC-0005 rely on".
- SPEC-0001's plan says that "SPEC-0003's plan builds the record read/write API". Here that means the in-process
  `RecordService`, not endpoints (G-6, decided by the owner on 2026-11-10).

### Contracts (`packages/schemas/src/records/`)

New, non-breaking. Consumers: `apps/api` (`RecordsModule`, then the SPEC-0004 and SPEC-0005 controllers) and
`apps/web` (the record components, then the SPEC-0004 and SPEC-0005 adapters and BFF routes).

- `area-codes.ts`: `BRAZIL_AREA_CODES`, the 67 DDDs of Anatel's list, with the source and the date it was copied in
  a comment (Risks 6), and `BRAZIL_STATES`, the 27 UFs.
- `values.ts`: one schema per §3.1 type. Each normalises first (trim; digits only for `cpf`, `phone` and `cep`; UF
  uppercased; repeated spaces collapsed for `full_name`; e-mail lowercased), then checks the §3.1 limits with the
  §3.1 error keys.
  - `number`: a JSON number between −999,999,999.99 and 999,999,999.99 with `Number(n.toFixed(2)) === n`, so 72.55
    passes and 72.555 fails without float rounding errors.
  - `phone`: 10 or 11 digits, the first two in `BRAZIL_AREA_CODES`, and an 11-digit number has 9 after the DDD.
    Exported as `PhoneValueSchema` for SPEC-0004 R4.
  - `cpf`: 11 digits, valid check digits, not all identical. `date`: a `YYYY-MM-DD` string that is a real date
    between 1900-01-01 and 2100-12-31.
  - `email` declares its own `z.email({ error: "email.invalid" })` check in `values.ts`, then lowercases. It does not
    use `EmailSchema` (`common.ts`), which maps blank input to `email.required`; here blank is "no value".
  - `address`: `{ cep, street, number, complement, district, city, state }`, blank `complement` becomes `null`.
    Completeness is checked first, then the parts in that order (Decision 3).
  - A value of the wrong JSON type gives `value.invalid` at `values.<fieldId>`, also for an address part.
  - `isBlankValue(value)`: `null`, an empty or whitespace-only string, or an address whose parts are all blank (R3).
  - `customValueSchema(field)` picks the schema by type, with the field's options for `select`.
    `recordValuesSchema(fields)` builds the object schema the web form uses. It reports every issue, at paths
    `values.<fieldId>` and `values.<fieldId>.<part>`, and adds `value.required` for required fields. The API runs
    `customValueSchema` per field, in the order of Decision 3.
- `requests.ts`:
  - `RecordFormIdSchema`: missing → `formId.required`, not a uuid → `formId.invalid` (422).
  - `RecordFormVersionSchema`: missing → `formVersion.required`, not a positive integer → `formVersion.invalid`.
  - `RecordRevisionSchema`: missing → `recordRevision.required`, not a positive integer → `recordRevision.invalid`.
  - `RecordValuesInputSchema`: not a plain object → `values.invalid`. Values stay `unknown` here; step 5 checks
    them. The envelope then checks each key: one that is not a uuid → `value.unknown-field` at `values.<key>`, after
    the object fields (Decision 12).
  - `RecordCreateEnvelopeSchema` (`formId`, `formVersion`, `values`) and `RecordUpdateEnvelopeSchema` (`formId`
    present → `formId.not-allowed`, `revision`, `formVersion`, `values`). Both are loose objects: the system
    attributes and SPEC-0004's consent fields pass through and are parsed later, in SPEC-0004 §6 order. The first
    issue follows the order of Decision 12 (Risks 4).
- `responses.ts`: `RecordValueSchema` (string, number, boolean or address), `RecordFormRefSchema` (`{ id, name,
  version, latestVersion, status }`) and `RecordBaseSchema` (`form`, `revision`, `values` keyed by field id,
  `missingRequired`, `createdAt`, `updatedAt`). The entity adds `id`, its system attributes and `status`
  (SPEC-0004 §7, SPEC-0005 §7).
- `errors.ts`: `RECORD_ERROR_CODES`, the 24 new keys of §6. `email.invalid` already exists. SPEC-0004 reuses
  `phone.invalid` from here for `client.phone`.
- `src/index.ts` re-exports. i18n: `validation.*` for the 24 keys and the `clients.*` and `services.*` keys of §8, in
  both locales (Copy).

### Persistence

No schema change and no migration. The plan reads and writes SPEC-0001's tables: `forms`, `form_versions`,
`form_fields`, `form_field_options`, `form_version_fields`, `form_version_field_options`, `form_records` and
`form_record_values`. There is nothing to roll back.

- **Values.** One `form_record_values` row per custom field with a value (R3, R5), with `tenant_id`, `key_version`
  1 and `value_ciphertext`. The cipher is `FieldValueCipher` (AES-256-GCM, a new 12-byte nonce per row), with the
  associated data that SPEC-0001's plan fixes (`key_version`, `tenant_id`, `form_record_id`, `field_id`). The
  plaintext is the UTF-8 JSON of the normalised contract value (G-1). A `select` value is its option id. A
  `yes_no` value is stored only when it is `true` (Decision 6, G-2). The owner decided both on 2026-11-10, and
  SPEC-0001's plan uses the same format.
- **Writes.** A create inserts the `form_records` row (revision 1, the latest version's id), then its value rows.
  An update deletes the record's value rows, inserts the new set, raises `revision` by 1 and sets `updated_at`, all
  in the caller's `TenantScope.run` transaction (R14, Decision 4).
- **Locks** (Decision 5). A create reads the template row `for share`, so it waits for a template update, archive
  or delete in progress, then sees its result (R7, §4.1 step 7). An update reads the record row `for update`, so
  it waits for an "Atualizar todos" in progress, then sees the new version (R7). Both rely on SPEC-0001's delete
  locking the template row first and "Atualizar todos" repointing records before deleting answers (G-3, G-4,
  decided by the owner on 2026-11-10). A create that waited for a delete finds no template and gets 400
  `formId.invalid` (AC-0003-78's server side). It never reaches the foreign-key failure that SPEC-0001's Delete
  leaves to this plan.
- **Reads.** A read on its own takes no transaction (SPEC-0001 plan: RLS deferred). Inside a create or update, the
  caller passes its `tx` to `read`, because the record is not committed yet; a read from the pool would not see it
  and would need a second connection. Every query filters by `tenant_id`.

### API (`apps/api/src/modules/records/`)

No routes, controllers or guards. §5's guard criteria (AC-0003-39, -40, -57, -58) run on the SPEC-0004 and SPEC-0005
endpoints (Deferred checks).

Layout, as in `tenants`: `domain/` (`record-check.ts`, `record-version.ts`, `errors/record.errors.ts`), `ports/`
(`RecordFormReader`, `RecordRepository`), `infrastructure/persistence/` (Drizzle adapters and mappers over
SPEC-0001's tables), `application/record.service.ts` and `records.module.ts`.

- `RecordsModule` provides its own `FieldValueCipher` from `@shared/crypto/field-value.cipher.ts` with
  `FIELD_VALUES_KEY`, and exports `RecordService`. `app.module.ts` imports it, so the e2e tests can resolve the
  service before SPEC-0004 imports the module.
- It never imports `FormsModule`. It reads the template tables through `RecordFormReader`, so `FormsModule.forRoot`
  stays as SPEC-0001's plan fixes it (Decision 1).
- `RecordService` is an application service, not a CQRS handler, because it runs inside the caller's transaction.
  Every method takes the tenant id. Errors are `DomainError` subclasses with status, key and field; value errors
  use the shared `ValidationError` (422). No message carries an input value, and the module logs nothing (R10).

| Method | What it does | §6 step | Errors | ACs |
| --- | --- | --- | --- | --- |
| `openForCreate(tx, tenantId, type, { formId, formVersion })` | reads the template `for share` and the latest version's fields | 2, 3 | 400 `formId.invalid` (unknown or another tenant's), 422 `formType.mismatch`, 409 `form.archived`, then 409 `record.form-changed` when `formVersion` is not `latest_version` | 11–14, 23, 67, 79 |
| `openForUpdate(tx, tenantId, formRecordId, type, { formVersion, revision })` | reads the record `for update` and its linked version's fields | 3, 4 | 409 `record.form-changed` when `formVersion` is not the linked version's number, then 409 `record.revision-conflict`; an absent record throws `RecordNotFoundError`, which the caller turns into its own 404 | 26, 59, 63, 68 |
| `draft.checkValues(values)` | step 5 for custom values in three passes (Decision 3); returns the normalised values without blanks | 5 | 422 or 400 `value.unknown-field`, 422 `value.required`, 422 type keys | 02–10, 17, 30–38, 72, 75, 76 |
| `draft.systemFields`, `draft.isRequired(systemKey)` | the version's system fields and their `required`, for the caller's own checks (R6) | 5 | — | 74 (partly) |
| `draft.insert(values)` | inserts the record and its encrypted values; returns the record id | — | — | 05, 41, 44, 69 |
| `draft.replace(values)` | replaces the value set, raises `revision`, sets `updated_at` | — | — | 42, 43, 62, 71 |
| `read(tenantId, formRecordId, systemPresence, tx?)` | record, template, version and decrypted values, as `RecordBaseSchema`; with `tx`, inside the caller's transaction (Persistence, Reads) | — | `null` when absent or another tenant's | 22, 23, 24, 41, 69, 73, 81, 89 |

How the methods work:
- **Check order.** The caller runs §6 steps 1 (its `ZodBody` pipe), then `open…` (steps 2–4), then its own checks,
  then `checkValues` (step 5), then writes. A save on an outdated version or revision never reaches a field error
  (AC-0003-67, -68).
- **`missingRequired`** lists the required fields of the linked version that have no value. A custom field has no
  value when it has no row. A system field has none when `systemPresence[systemKey]` is false; SPEC-0004 passes
  `{ "client.phone": phone !== null }`, and SPEC-0005 passes `{}` (its system fields are always required and
  always present). A `yes_no` field is never required (SPEC-0002 R8).
- **`values` in a read** hold the linked version's custom fields with a row, plus `false` for every `yes_no` field
  without one (§7).
- **Tenant isolation.** Every query filters by `tenant_id`. A field id of another tenant is "not in the version"
  (400, AC-0003-38). Another tenant's record is `null` or `RecordNotFoundError` (AC-0003-22, -63).

### What SPEC-0004 and SPEC-0005 rely on

Their plans build on these points. A change to any of them amends this plan and theirs.
1. `ClientsModule` and `ServicesModule` import `RecordsModule` and inject `RecordService`.
2. Controllers parse the body with `ZodBody(RecordCreateEnvelopeSchema)` or `ZodBody(RecordUpdateEnvelopeSchema)`.
   System attributes and consent are parsed afterwards with their own schemas, in SPEC-0004 §6 order (G-8).
3. Create, in one `TenantScope.run`: `openForCreate` → entity checks (consent; name, e-mail, phone, with
   `isRequired("client.phone")` for `phone.required`) → `checkValues` → `insert` → insert the entity row with
   `form_record_id` → e-mail uniqueness → `read` with the same `tx`.
4. Update: find the entity by id and tenant (404 `client.not-found` or `service.not-found`) → `openForUpdate` with
   its `form_record_id` → entity checks → `checkValues` → `replace` → update the entity row → `read` with the same
   `tx`. Every accepted update goes through `replace`, so an attribute-only edit raises the revision too (R14).
5. The response spreads `read`'s result. The entity supplies `id` (its own id), its system attributes and
   `status`. `createdAt` and `updatedAt` come from the record.
6. `PhoneValueSchema` validates `client.phone` (SPEC-0004 R4). `phone.invalid` is one key for both.
7. Web: the routes mount `RecordForm` and `RecordView` (Web) with a `RecordAdapter`.
   - SPEC-0004 passes the consent checkbox through `extraFields`; its error counts in the error summary (SPEC-0004
     §4.3).
   - `systemFields` gives each system field its attribute, input, schema and view formatter, so SPEC-0005 shows
     duration and price in its own format (SPEC-0005 §4.1).
   - An error whose `field` names a rendered input, system attribute or `extraFields` input shows under it,
     whatever its status: 409 `clientEmail.taken` under E-mail (SPEC-0004 §8), 409 `serviceName.taken` under Nome
     (SPEC-0005 §8).
   - `onSaveError(error)` lets the entity handle its own errors before the default routing, for example 409
     `consentText.outdated` (SPEC-0004 §4.3: banner, text reloaded, typed values kept).
8. Their plans list this spec's deferred criteria in their test tables, include this file in their scope, and add
   `<AC ids> verified with SPEC-XXXX, <date>` to this changelog.

### Web (`apps/web/src/app/[lang]/(private)/orgs/[tenant]/_components/records/`)

No routes and no BFF here. SPEC-0004 and SPEC-0005 own `/clients/new?form=:id`, `/clients/[clientId]`,
`/clients/[clientId]/edit` and the `/services` equivalents, and mount these components there.

- `record-adapter.ts`: what an entity passes in.
  - `create(body)`, `read(id)` and `update(id, body)`, which reject with the API's `{ status, error, field }`.
  - `viewHref(id)`, `editHref(id)`, `listHref`.
  - `systemFields`: per system key, the request attribute (`name`, `email`, `phone`; `name`, `durationMinutes`,
    `priceCents`), its input component, its schema and its view formatter.
  - `onSaveError(error)`: optional; returns `true` when the entity handled the error itself.
  - Templates and versions load through SPEC-0001's `@/lib/api/forms` (form read, version read), used unchanged.
- `record-form.tsx` with `use-record-form.ts` (react-hook-form, `zodResolver`), for new and edit:
  - Loading: a 3-row skeleton (`.form.loading`). Load failure: `.form.loadError` with retry. A missing or archived
    template, or a template of the other type (Decision 9): `.form.unavailable` with a link to `listHref`. Edit
    of an unknown record: `.form.notFound`.
  - Title "Novo cliente", subtitle "Modelo: <name>" (§4.1 step 2). Fields in the version's order, "*" on required
    ones, help text under the input. System fields use `systemFields`; custom fields use `field-input.tsx`.
  - [Salvar] validates with `recordValuesSchema(fields)`, the system-field schemas and the `extraFields` schema:
    every error inline, the summary `.form.errorSummary` with the count, focus on the first invalid field, and no
    request.
  - Saving: [Salvar] disabled with a spinner (`.form.saving`). Success: SPEC-0001's toast (`.toast.created` or
    `.toast.saved`), then `viewHref`.
  - 409 `record.form-changed` (§4.4): reload the latest version (new record) or the record and its version (edit,
    taking the new revision). `remap-values.ts` keeps typed values whose field still exists, drops the rest and
    any `select` choice whose option is gone. Banner `.form.formChanged`.
  - 409 `record.revision-conflict`: banner `.form.revisionConflict` with [Recarregar]. Typed values stay until it
    is pressed; then the form resets from a new read.
  - 409 `form.archived` or 400 `formId.invalid` on save: `.form.unavailable` with the way back (§4.1 step 7).
  - Every other rejected save goes, in this order: to `onSaveError` when the adapter has one and it returns `true`;
    else under the input its `field` names (`values.<id>`, `values.<id>.<part>`, a system attribute or an
    `extraFields` input), whatever its status, so 409 `clientEmail.taken` shows under E-mail; else
    `.form.saveError`. A `field` with no input (`formVersion`, `revision`, `values`), no `field`, a 500 or a
    network failure all end in `.form.saveError`. Typed values are kept in every case.
  - Leaving with typed input: SPEC-0001's shared `use-leave-guard.ts` (G-7, decided by the owner on 2026-11-10) with
    `{entity}.form.discard`. It confirms in-app link clicks and uses `beforeunload` for tab close and reload.
    [Cancelar] shows the same confirmation (SPEC-0001's `dialog.tsx`) before going to `listHref`; with nothing
    typed it goes straight there.
  - Edit shows protected values in plain text (R9). `extraFields` renders above [Salvar].
- `record-view.tsx`:
  - Loading skeleton (`.view.loading`); load failure `.view.loadError` with retry; `.view.notFound`.
  - One label and value per field of the linked version, in order. No value: "—"; a `yes_no`: "Não". A system
    field's value is shown with its `systemFields` formatter, a custom field's with `format-value.ts`.
  - `protected-value.tsx`: "••••••" with "Mostrar", then the value with "Ocultar". The state lives in the
    component, so leaving the page masks again (R9).
  - `.view.version` with the template name linking to `/forms/:formId`; `.view.olderVersion` when `version` is
    below `latestVersion`; `.view.missingRequired` next to each field in `missingRequired`; [Editar] to `editHref`.
- `field-inputs/`: one input per §3.1 type. `masks.ts` formats phone, CPF and CEP while typing. The number input
  accepts "72,5" and "72.5" (Decision 7). `date` uses `<input type="date">`. `yes_no` uses the existing checkbox,
  `select` SPEC-0002's `select.tsx`, `long_text` a new `components/ui/textarea.tsx`. `address` is a group of seven
  inputs, with a UF select of `BRAZIL_STATES`.
- `format-value.ts`: the §3.1 "shown as" column. Number and date by the active locale through `Intl` (Decision 7),
  `yes_no` "Sim" / "Não", `select` the option's current label from the version read, phone `(11) 98765-4321`, CPF
  `000.000.000-00`, address on one line followed by the CEP.
- No Figma frame is referenced by this spec, so the pages use the existing token layers and components. The visual
  review happens on the running pages, in SPEC-0004.

### Copy

The spec gives pt-BR for the client UI states. Everything marked **proposed** needs the owner's confirmation
(Decision 10). Every key exists under `clients.` and `services.`.

| Key | pt-BR | en-US |
| --- | --- | --- |
| `{entity}.form.loading` / `.view.loading` | Carregando… (accessible name of the skeleton, **proposed**) | Loading… |
| `{entity}.form.loadError` | Não foi possível carregar o modelo. | Could not load the template. |
| `{entity}.form.unavailable` | Este modelo não está disponível. | This template is not available. |
| `{entity}.form.notFound` / `.view.notFound` | Cadastro não encontrado. | Record not found. |
| `{entity}.form.saving` | Salvando… (**proposed**) | Saving… |
| `{entity}.form.errorSummary` | Corrija {count, plural, one {# campo} other {# campos}} (singular **proposed**) | Fix {count, plural, one {# field} other {# fields}} |
| `{entity}.form.formChanged` | O modelo foi atualizado. Revise os campos e salve novamente. | The template was updated. Review the fields and save again. |
| `{entity}.form.revisionConflict` | Este cadastro foi alterado em outra janela. Recarregue para ver a versão atual. | This record was changed in another window. Reload to see the current version. |
| `{entity}.form.saveError` | Não foi possível salvar. Tente novamente. | Could not save. Try again. |
| `{entity}.form.discard` | Descartar cadastro? | Discard this record? |
| `{entity}.toast.created` | Cliente cadastrado / Serviço cadastrado (services **proposed**) | Client created / Service created |
| `{entity}.toast.saved` | Alterações salvas | Changes saved |
| `{entity}.view.loadError` | Não foi possível carregar o cadastro. | Could not load the record. |
| `{entity}.view.reveal` / `.view.hide` | Mostrar / Ocultar | Show / Hide |
| `{entity}.view.olderVersion` | Este cadastro usa uma versão anterior do modelo | This record uses an earlier version of the template |
| `{entity}.view.version` | Modelo: {name} · Versão {version} | Template: {name} · Version {version} |
| `{entity}.view.missingRequired` | Preenchimento pendente | Needs filling in |
| `{entity}.form.newTitle`, `.subtitle` | Novo cliente / Novo serviço (services **proposed**); Modelo: {name} | New client / New service; Template: {name} |
| `{entity}.form.save`, `.cancel`, `.edit`, `.reload`, `.retry`, `.back`, `.discardConfirm`, `.discardStay` | Salvar, Cancelar, Editar, Recarregar; Tentar novamente, Voltar, Descartar, Continuar editando (**proposed**) | Save, Cancel, Edit, Reload, Try again, Back, Discard, Keep editing |
| `{entity}.view.yes` / `.no` / `.empty` | Sim / Não / — | Yes / No / — |

`validation.*`, all **proposed**:

| Key | pt-BR | en-US |
| --- | --- | --- |
| `formId.required` | Escolha um modelo. | Choose a template. |
| `formId.not-allowed` | O modelo de um cadastro não pode ser trocado. | A record's template cannot be changed. |
| `formId.invalid` | Este modelo não está disponível. | This template is not available. |
| `formType.mismatch` | Este modelo é de outro tipo de cadastro. | This template is for another kind of record. |
| `form.archived` | Este modelo está arquivado. | This template is archived. |
| `formVersion.required` / `.invalid` | Versão do modelo ausente. / Versão do modelo inválida. | Template version missing. / Invalid template version. |
| `record.form-changed` | O modelo foi atualizado. Revise os campos e salve novamente. | The template was updated. Review the fields and save again. |
| `recordRevision.required` / `.invalid` | Revisão do cadastro ausente. / Revisão do cadastro inválida. | Record revision missing. / Invalid record revision. |
| `record.revision-conflict` | Este cadastro foi alterado em outra janela. | This record was changed in another window. |
| `values.invalid` | Valores do cadastro inválidos. | Invalid record values. |
| `value.required` | Preencha este campo. | Fill in this field. |
| `value.unknown-field` | Este campo não faz parte do modelo. | This field is not part of the template. |
| `value.invalid` | Valor inválido. | Invalid value. |
| `value.max` | Texto longo demais. | Text is too long. |
| `number.invalid` | Informe um número com até 2 casas decimais. | Enter a number with up to 2 decimal places. |
| `date.invalid` | Informe uma data válida entre 1900 e 2100. | Enter a valid date between 1900 and 2100. |
| `option.invalid` | Escolha uma das opções. | Choose one of the options. |
| `phone.invalid` | Informe um telefone com DDD válido. | Enter a phone number with a valid area code. |
| `cpf.invalid` / `cep.invalid` / `uf.invalid` | CPF inválido. / CEP inválido. / UF inválida. | Invalid CPF. / Invalid CEP. / Invalid state. |
| `address.incomplete` | Preencha o endereço completo ou deixe-o em branco. | Fill in the whole address or leave it blank. |

### Tests

Files:
- **U-val** `apps/api/src/modules/records/domain/record-values.spec.ts`: every §3.1 rule of
  `packages/schemas/src/records/values.ts`. It runs from the api because `packages/schemas` has no test runner, as
  SPEC-0002's U-terms does.
- **U-req** `apps/api/src/modules/records/domain/record-envelope.spec.ts`: the request envelopes through `ZodBody`,
  the pipe the SPEC-0004 and SPEC-0005 controllers use: status 422, key and field of the first issue.
- **U-chk** `apps/api/src/modules/records/domain/record-check.spec.ts`: the step 5 passes against in-memory
  versions, `missingRequired`, blanks and `yes_no`.
- **I-rec** `apps/api/test/e2e/form-records.e2e-spec.ts`: `RecordService` resolved from `createTestApp()` on the
  Testcontainers database, inside `TenantScope.run`, with templates created through SPEC-0001's `POST /v1/forms`.
  It asserts the thrown error's status, key and field, the read result and the stored rows.
- **I-mig** `apps/api/test/e2e/form-records-migration.e2e-spec.ts`: records after SPEC-0001's
  `PATCH /v1/forms/:formId` (metadata, "Manter existentes", "Atualizar todos"), read through `RecordService` and
  `GET /v1/forms/:formId/versions/:version`.
- **W-form** `apps/web/tests/record-form.test.tsx` and **W-view** `apps/web/tests/record-view.test.tsx`: the
  components with a fake `RecordAdapter`, a test `systemFields` config and a mocked `@/lib/api/forms`.
- Fixtures: `apps/api/test/utils/records-fixtures.ts` signs up the owner and creates the tenant with supertest, as
  `tenants.e2e-spec.ts` does (`test/utils/ApiClient.ts` is an empty file, and no plan fills it). It creates and
  changes templates with supertest through SPEC-0001's forms API, uses SPEC-0001's `forms-fixtures.ts` unchanged
  where seeding is quicker, and wraps `RecordService` calls in `TenantScope.run`.

Every test name starts with its AC ID, e.g. `it('AC-0003-04 rejects a CPF with wrong check digits', …)`. A test of a
partly verified criterion says so in its name. Both record types are covered: I-rec and I-mig run each case with a
`client` and a `service` template, and W-form and W-view with `clients` and `services`. The exceptions:
- AC-0003-12 checks each type against the other type's template.
- AC-0003-73 and -74 are client only, because `client.phone` is the only system field that can be optional
  (SPEC-0002 R3).
- AC-0003-01's service case expects Nome, Duração (minutos) and Preço all marked required.
- W-view's service cases show duration and price through the test config's `systemFields` formatters ("1h 30min",
  "R$ 150,00"), never as raw minutes or cents.

U-req asserts the first-issue order of Decision 12 with one request per adjacent pair, each breaking both rules
(for example, on create, `formVersion` 0 and `values` as a list → `formVersion.invalid`).

| AC | Test | What it checks here |
| --- | --- | --- |
| 01 | W-form | inputs in the order Nome completo, E-mail, Telefone, Profissão, Objetivo; "*" on the first two only |
| 02 | U-chk, I-rec | no value for required P → 422 `value.required` at `values.P`; no `form_records` row |
| 03 | U-chk, I-rec | "   " for P → as 02 |
| 04 | U-val, I-rec | "123.456.789-00" → 422 `cpf.invalid` at `values.C` |
| 05 | U-val, I-rec | "529.982.247-25" → the read holds "52998224725" |
| 06 | U-val, I-rec | "(11) 8765-43210" → 422 `phone.invalid` at `values.T` |
| 07 | U-val, I-rec | only cep and city → 422 `address.incomplete` at `values.A` |
| 08 | U-val, I-rec | an option id not of S → 422 `option.invalid` at `values.S` |
| 09 | U-val, I-rec | "2025-02-30" → 422 `date.invalid` at `values.D` |
| 10 | I-rec | H not in the latest version, `formVersion` latest, a value for H → 400 `value.unknown-field` at `values.H` |
| 11 | I-rec | archived "Antigo" → 409 `form.archived` at `formId` |
| 12 | I-rec | the other type's template → 422 `formType.mismatch` at `formId` |
| 13 | I-rec | "studio-bia"'s template from "studio-ana" → 400 `formId.invalid`; no `form_records` row in either tenant |
| 14 | I-rec | `formVersion` 2 after version 3 is published → 409 `record.form-changed` at `formVersion`; nothing stored |
| 15 | I-mig, W-view | relabel → `latest_version` unchanged, the version read says "Ocupação", the record holds "Engenheira"; W-view shows "Ocupação: Engenheira" |
| 16 | I-mig, W-form, W-view | remove "Hobby" with "Manter existentes" → the record stays on version 1 with "Corrida" and version 1 still has "Hobby"; view and edit show it; the new-record form on the latest version has no "Hobby" |
| 17 | I-mig | migrated to a version where P is required, update without P → 422 `value.required` at `values.P` |
| 18 | W-view | "••••••" with "Mostrar"; pressing it shows "Hipertensão"; after a remount it is masked again |
| 20 | I-rec | Nest logger, `console` and stdout/stderr captured through create, read, update and one failed validation: no line contains "Hipertensão" |
| 21 | W-form | three invalid fields → three inline errors, "Corrija 3 campos", focus on the first, adapter not called |
| 22 | I-rec | `read` as "studio-ana" of "studio-bia"'s record → `null` |
| 23 | I-rec | "Ficha" at version 3 → the read has `form.version` 3 and `form.latestVersion` 3 |
| 24 | I-mig | "Atualizar todos" to version 2 → the read has version 2, the "Profissão" answer and no "Objetivo" answer |
| 25 | I-mig, W-view | the read has version 1 and `latestVersion` 2; W-view shows version 1's fields and `clients.view.olderVersion` |
| 26 | I-mig | migrated to version 2 (revision 4), update with `formVersion` 1 and revision 3 → 409 `record.form-changed` at `formVersion`; record unchanged |
| 27 | W-view | protected cpf shows "••••••", then "529.982.247-25" |
| 28 | W-form | 409 `record.form-changed` → version 3 shown with `clients.form.formChanged`; "Profissão" keeps its value; "Hobby" is gone |
| 29 | W-view | P in `missingRequired` → `clients.view.missingRequired` next to "Profissão" |
| 30 | I-mig | record on version 1, `formVersion` 1 and a value for O of version 2 → 400 `value.unknown-field` at `values.O` |
| 31 | U-val, I-rec | 256 characters → 422 `value.max` at `values.X` |
| 32 | U-val, I-rec | a 121-character street → 422 `value.max` at `values.A.street` |
| 33 | U-val, I-rec | 72.555 → 422 `number.invalid` at `values.N` |
| 34 | U-val, I-rec | "ana@" → 422 `email.invalid` at `values.E` |
| 35 | U-val, I-rec | cep "0131010" → 422 `cep.invalid` at `values.A.cep` |
| 36 | U-val, I-rec | state "XX" → 422 `uf.invalid` at `values.A.state` |
| 37 | U-val, I-rec | "sim" for `yes_no` → 422 `value.invalid` at `values.Y` |
| 38 | I-rec | "studio-bia"'s field id F in "studio-ana"'s record → 400 `value.unknown-field` at `values.F`; nothing stored in either tenant |
| 41 | I-rec | the read after a create on version 2 has form `{ id, "Ficha", 2, 2, "active" }`, revision 1, "Profissão", `missingRequired` [], `createdAt`, `updatedAt`, and parses with `RecordBaseSchema` |
| 42 | I-rec | update without key H → the read has no H and H's row is gone |
| 43 | I-rec | archived template, update → stored, revision + 1 |
| 44 | I-rec | raw rows of `form_records` and `form_record_values` for the record: no column, as text or as bytes, contains "Corrida" in UTF-8 |
| 45 | I-mig | option "Tarde" removed with "Atualizar todos" → version 2, no "Turno" value |
| 46 | W-view | "Modelo: Ficha · Versão 2" through `clients.view.version` |
| 47 | W-form | archived template → `clients.form.unavailable` with a link to the list |
| 48 | W-form | adapter rejects with 500 → `clients.form.saveError`; every typed value still in its input |
| 49 | W-form | Cancelar after typing → `clients.form.discard` before any navigation; an in-app link click while dirty shows the same confirmation (G-7) |
| 50 | W-view | read rejects with 404 → `clients.view.notFound` |
| 51 | W-form | form read rejects with 500 → `clients.form.loadError`; retry calls the form read again |
| 52 | W-view | record read rejects with 500 → `clients.view.loadError`; retry reads again |
| 53 | W-form | edit, read rejects with 404 → `clients.form.notFound` |
| 54 | U-req | create without `formVersion` → 422 `formVersion.required` at `formVersion` |
| 55 | U-req | `values` as a list → 422 `values.invalid` at `values` |
| 56 | U-req | `formId` "abc" → 422 `formId.invalid` at `formId` |
| 59 | I-rec | revision 3: A's update → 4; B's update with 3 → 409 `record.revision-conflict` at `revision`; the read matches A's save |
| 60 | U-req | update without `revision` → 422 `recordRevision.required` at `revision`, before any read |
| 61 | W-form | 409 `record.revision-conflict` → `clients.form.revisionConflict` with [Recarregar]; typed values kept |
| 62 | I-rec | revision 1, update → the read has revision 2 |
| 63 | I-rec | `openForUpdate` as "studio-ana" on "studio-bia"'s record → `RecordNotFoundError`; record unchanged |
| 64 | U-req | create without `formId` → 422 `formId.required` at `formId` |
| 65 | U-req | revision 0 → 422 `recordRevision.invalid` at `revision` |
| 66 | U-req | `formId` on update → 422 `formId.not-allowed` at `formId` |
| 67 | I-rec | `formVersion` 2 after version 3 and an invalid cpf → 409 `record.form-changed`, not `cpf.invalid` |
| 68 | I-rec | revision 4, update with 3 and an invalid cpf → 409 `record.revision-conflict` |
| 69 | U-chk, I-rec | no value for "Fumante" → the read has `values.F` false; no value row |
| 70 | W-view | `values.F` false → "Fumante" shows "Não" |
| 71 | I-rec | `values.H` null → the read has no H |
| 72 | U-chk, I-rec | a value for system field id N → 422 `value.unknown-field` at `values.N` |
| 73 | I-mig | Telefone made required, "Atualizar todos" → version 2; with `client.phone` absent, `missingRequired` contains T |
| 74 | I-mig | after 73, the draft's `isRequired("client.phone")` is true (partly: `phone.required` itself is SPEC-0004's) |
| 75 | U-val, I-rec | "(20) 98765-4321" → 422 `phone.invalid` at `values.T` |
| 76 | U-val, I-rec | state "sp" → the read holds "SP" |
| 77 | W-form | save rejects with 409 `form.archived` → `clients.form.unavailable` |
| 78 | W-form | save rejects with 400 `formId.invalid` → `clients.form.unavailable` |
| 79 | I-rec | a random uuid as `formId` → 400 `formId.invalid` at `formId` |
| 80 | W-form | `record.form-changed`, option "Tarde" gone in version 3 → "Turno" has no choice |
| 81 | I-mig | revision 2, "Atualizar todos" → the read has revision 3 |
| 83 | W-form | edit → the "Diagnóstico" input holds "Hipertensão" in plain text |
| 84 | I-mig, W-view | option renamed → no new version; version 1's read labels the stored option "Vespertino"; W-view shows "Turno: Vespertino" |
| 85 | I-mig, W-view | protection on for "Hobby" → version 1's read has `sensitive` true; W-view masks it |
| 86 | U-req | `formVersion` 0 → 422 `formVersion.invalid` at `formVersion` |
| 87 | U-req | key "abc" → 422 `value.unknown-field` at `values.abc` |
| 88 | I-rec | the `cpf.invalid` error rendered by `DomainExceptionFilter` into a fake response contains neither "123.456.789-00" nor "12345678900" |
| 89 | I-mig | the record of 17, before any edit → `missingRequired` contains P |
| 90 | W-form | form read pending → skeleton with `clients.form.loading` |
| 91 | W-form | create pending → [Salvar] disabled with a spinner and `clients.form.saving` |
| 92 | W-view | record read pending → skeleton with `clients.view.loading` |
| 93 | W-form | create resolves → toast `clients.toast.created`, then `viewHref(id)` |
| 94 | W-form | update resolves → toast `clients.toast.saved`, then `viewHref(id)` |
| 95 | W-view | no value for "Hobby" → "—" |
| 96 | W-view | "Mostrar", then "Ocultar" (`clients.view.hide`) → "••••••" again |

AC-0003-19, -39, -40, -57, -58 and -82 have no test here (Deferred checks).

**Criterion deferred to this spec** by SPEC-0001's plan:

| AC | Test | What it checks here |
| --- | --- | --- |
| AC-0001-10 | W-form | partly: the fill-in form opened with the new template's id shows "Ficha nutricional"; the route that reads `?form=` is SPEC-0004's (G-5) |

At `/done`, SPEC-0001's changelog gets "AC-0001-10 partly verified with SPEC-0003, <date>", because `/done` step 4
uses "verified" only for a fully verified criterion. The route part is SPEC-0004's (G-5, decided by the owner on
2026-11-10); SPEC-0001's Deferred checks row names both specs.

SPEC-0002's plan defers AC-0002-19, -23 and -24 to SPEC-0004, not to this spec (its Deferred checks). This plan
neither verifies them nor edits SPEC-0002's file. AC-0003-84 and -85 already test the rename and protection cases.

Checks outside the AC table:
- **Option removed with "Manter existentes"** (I-mig and W-view, named `support …`): the record stays on its
  version, that version's read still lists "Tarde", and W-view shows "Tarde". It supports SPEC-0004's check of
  AC-0002-19 and claims no verification.
- **Save-error routing** (W-form, named `routing …`): a 409 whose `field` names a system attribute shows under
  that input; an `onSaveError` that returns `true` stops the default routing; a 422 at `revision` and a network
  failure show `.form.saveError` (Web).
- **R7 race** (I-rec, named `R7 …`). A second pool client holds the template row `for update`, as SPEC-0001's update
  does, and sets `latest_version` to 3. A create with `formVersion` 2 started meanwhile waits, and after the commit
  it gets 409 `record.form-changed`. The e2e pool has 2 connections (`test/setup/env.ts`), enough for the two
  transactions; the test runs nothing else meanwhile.

### Deferred checks

§2 says every API criterion runs through the SPEC-0004 and SPEC-0005 endpoints. Under `/done` step 4 these criteria
may stay partly verified or unverified when this spec is set `Implemented`: `/done` reports them as such, never as
passing, and lists them in the changelog line. The verifying spec's plan lists them in its test table, includes this
file in its scope, and adds `<AC ids> verified with SPEC-XXXX, <date>` to this changelog.

| AC | Status after this plan | Verified by |
| --- | --- | --- |
| 02–14, 17, 20, 23, 24, 26, 30–38, 41–45, 59, 62, 67–69, 71–73, 75, 76, 79, 81, 88, 89 | partly: `RecordService`'s result or error (status, key, field) and the stored rows; the HTTP response of the record endpoints is not checked | SPEC-0004 (clients), SPEC-0005 (services) |
| 54–56, 60, 64–66, 86, 87 | partly: the envelope schemas through `ZodBody`; the endpoints' pipes are not checked | SPEC-0004, SPEC-0005 |
| 22, 63 | partly: `RecordService` finds no record of another tenant; 404 `client.not-found` / `service.not-found` is the entity's | SPEC-0004, SPEC-0005 |
| 74 | partly: the version marks `client.phone` required; the 422 `phone.required` is not checked | SPEC-0004 |
| 19 | not checked: the client and service lists | SPEC-0004, SPEC-0005 |
| 39, 40, 57, 58 | not checked: authentication and tenant guards on the record endpoints | SPEC-0004, SPEC-0005 |
| 82 | not checked: inactivation | SPEC-0004 (SPEC-0005 §4.4 for services) |

The UI criteria are verified here on the shared components, for both entities. SPEC-0004 and SPEC-0005 mount them on
their routes and run W-form and W-view against their adapters (What SPEC-0004 and SPEC-0005 rely on, point 7).

### Sequence

0. **Prerequisites.** SPEC-0001 and SPEC-0002 `Implemented` (`task-lock.sh` checks `depends_on`). G-1 to G-4,
   which change SPEC-0001's code, were decided on 2026-11-10 and are in SPEC-0001's plan, ahead of its persistence
   step (SPEC-0001 plan, Sequence step 0). Risks 1 checks that its code follows them.
1. **Contracts.** U-val and U-req first, confirmed failing because the module is missing. Then
   `packages/schemas/src/records/*`, the export, the copy in both locales; build the package. AC-0003-54 to -56,
   -60, -64 to -66, -86 and -87 pass here.
2. **Failing tests** (written by `test-author`): U-chk, I-rec, I-mig, W-form, W-view and the fixtures, one test per
   AC as mapped. Confirm each fails because the behavior is missing.
3. **API, part 1.** `RecordsModule` with domain errors, `record-version.ts`, `record-check.ts`, the ports, the
   Drizzle adapters, the cipher provider, and the import in `app.module.ts`. U-chk passes.
4. **API, part 2**, two commits.
   - **4a** create and read: AC-0003-02 to -14, -20 (create and read), -23, -31 to -38, -41, -44, -67, -69, -72,
     -75, -76, -79, -88, and the R7 race.
   - **4b** update: AC-0003-20 (update), -22, -26, -30, -42, -43, -59, -62, -63, -68, -71. Then I-mig: AC-0003-15,
     -16, -17, -24, -25, -45, -73, -74, -81, -84, -85, -89 and the option-removal support check (API part).
5. **Web, part 1.** `textarea.tsx`, `field-inputs/`, `masks.ts`, `format-value.ts`, `remap-values.ts`,
   `record-adapter.ts`.
6. **Web, part 2**, three commits.
   - **6a** fill-in for a new record: AC-0003-01, -21, -28, -47 to -49, -51, -77, -78, -80, -90, -91, -93,
     AC-0001-10 (partly) and the save-error routing check.
   - **6b** edit: AC-0003-16 (edit part), -53, -61, -83, -94.
   - **6c** view: AC-0003-15, -16 (view part), -18, -25, -27, -29, -46, -50, -52, -70, -84, -85, -92, -95, -96 and
     the option-removal support check (view part).
7. **Checks.** `pnpm --filter @planici/schemas build`, `pnpm lint`, `pnpm typecheck`, `pnpm --filter api test`,
   `pnpm --filter api test:e2e`, `pnpm --filter web exec vitest run`. `apps/web` has no `test` script; see the
   owner action in SPEC-0001's plan, Sequence step 8.

### Decisions this plan makes (owner to confirm with the plan)

The spec leaves these open.

1. **No routes; a separate `RecordsModule`.** §2 puts the endpoints in SPEC-0004 and SPEC-0005. A module of its own
   keeps `FormsModule.forRoot` as SPEC-0001 fixes it and keeps this lock off SPEC-0001's and SPEC-0002's paths. The
   cost: reading the template tables repeats part of the forms repository.
2. **A two-phase service** (`open…`, then `checkValues`, then `insert` or `replace`), so SPEC-0004 §6 can put
   consent and the system attributes between §6 steps 4 and 5, and e-mail uniqueness last.
3. **Step 5 order.** Pass 1 checks every `values` key in request order: a system field's id gives 422, an id not in
   the version gives 400. Pass 2 checks required custom fields in version order, pass 3 the type rules in version
   order. Inside an address: completeness, then cep, street, number, complement, district, city, state.
4. **Every accepted update raises the revision by 1**, even when the values equal the stored ones. Finding "no
   change" would mean decrypting and comparing every value (R14 says "every stored change").
5. **Locks.** A create reads the template `for share`; an update reads the record `for update` (Persistence). Both
   rely on G-3 and G-4, which the owner decided on 2026-11-10.
6. **A `yes_no` value is stored only when it is `true`.** "No value" already reads as `false` everywhere (§3.1), so
   an explicit `false` row would add a difference nobody sees. The owner decided this as G-2 on 2026-11-10, together
   with its effect on SPEC-0001's and SPEC-0002's counts.
7. **Locale formats.** Number and date are shown in the active locale through `Intl` ("72,5" and dd/mm/aaaa in
   pt-BR). CPF, phone and CEP keep their Brazilian formats in every locale. The number input accepts "," or "." as
   the decimal separator and no thousands separator. The date input is `<input type="date">`.
8. **Text limits count UTF-16 code units** (Zod `.max`), as every other length in the contracts.
9. **A template of the other type on the fill-in page shows `.form.unavailable`.** The spec covers only archived and
   missing templates.
10. **Proposed copy** for every key marked "proposed" under Copy.
11. **Test level.** API criteria are checked on `RecordService` here and through HTTP in SPEC-0004 and SPEC-0005
    (Deferred checks), as §2 says.
12. **First-issue order of §6 step 1**, read literally from its list ("`formId`, `formVersion`, `revision` and
    `values` present where required and well-formed, no `formId` on update, and every `values` key a well-formed
    field id"):
    - create: `formId` (`formId.required`, then `formId.invalid`) → `formVersion` → `values` is an object
      (`values.invalid`) → each `values` key, in request order (`value.unknown-field`);
    - update: `formVersion` → `revision` → `values` is an object → `formId` present (`formId.not-allowed`) → each
      `values` key.

    The envelope schemas check the object fields first and run the `formId`-on-update and key checks after them,
    so the first issue follows this order whatever the property order of the request.

### Gaps and conflicts for the owner

Found while drafting against SPEC-0001's record storage and SPEC-0001, SPEC-0002 and SPEC-0004. This plan edits none
of those files. The owner decided G-1 to G-7 on 2026-11-10, each as proposed, and the decisions are written into
SPEC-0001's plan at the sections named below. This plan's Persistence, Decisions 5 and 6, the R7 race check and
Risks 8 build on them. G-8 and G-9 are still open.

| # | Where | Gap or conflict | Proposal or decision |
| --- | --- | --- | --- |
| G-1 | SPEC-0001 plan, Persistence | The plaintext of an encrypted value was not fixed. SPEC-0001's "Atualizar todos" decrypts `select` values and its fixtures seed encrypted values; this plan writes them. If the two disagreed, removed options would never be found. | **Decided (owner, 2026-11-10):** the cipher takes and returns the UTF-8 JSON of the normalised contract value; a `select` value is its option id. In SPEC-0001's Persistence ("Plaintext"). |
| G-2 | SPEC-0001 plan, counts; SPEC-0002 `valueCount` | Whether a `false` `yes_no` is stored changes `valueCount`, `recordsLosingAnswers` and SPEC-0002's "Este campo tem respostas em {count} cadastros". | **Decided (owner, 2026-11-10):** store only `true` (Decision 6). Removing a `yes_no` field then counts only "Sim" answers as lost, which matches what the view shows. In SPEC-0001's Persistence ("Plaintext") and API ("Counts"). |
| G-3 | SPEC-0001 plan, API, Delete | The delete did not say it locks the template row before counting records. A record created between the count and the delete would either fail the delete with a `RESTRICT` error (500) or survive a "Sim, excluir tudo". | **Decided (owner, 2026-11-10):** the delete reads the template `for update` first; archive and update already lock it. In SPEC-0001's API ("Delete"). A create that waited for that delete finds no template and gets 400 `formId.invalid` (Persistence, Locks). |
| G-4 | SPEC-0001 plan, API, Update ("Atualizar todos") | If answers were deleted before records were repointed, a record update holding its row lock could commit a value of a removed field after the delete, leaving a value outside the record's version. The bulk revision raise did not say it sets `updated_at`. | **Decided (owner, 2026-11-10):** repoint and raise revisions first, in one statement that also sets `updated_at`; then delete answers. In SPEC-0001's API ("Update" and "All records at once"). |
| G-5 | SPEC-0001 plan, Deferred checks, AC-0001-10 | It named SPEC-0003 to check "the new-client page". The page's route belongs to SPEC-0004, which also adds the consent checkbox to it (SPEC-0004 §4.3). | **Decided (owner, 2026-11-10):** SPEC-0003 checks the fill-in form opened with the template id and records AC-0001-10 as partly verified (Tests); SPEC-0004 checks the `/clients/new` route. SPEC-0001's Deferred checks row now names both. |
| G-6 | SPEC-0001 plan, Boundary | It said SPEC-0003's plan "builds the record read/write API", while SPEC-0003 §2 puts the endpoints in SPEC-0004 and SPEC-0005. | **Decided (owner, 2026-11-10):** "API" means the in-process `RecordService` (Boundary above). SPEC-0001's Boundary now says so. |
| G-7 | SPEC-0001 plan, Web; this spec §8 | §8 asks for "Descartar cadastro?" when leaving a dirty fill-in page. SPEC-0001's link interception lived inside `use-form-draft`, outside this lock. | **Decided (owner, 2026-11-10):** SPEC-0001 builds the shared hook `apps/web/src/hooks/use-leave-guard.ts`, and the caller passes the copy key. `use-form-draft` uses it with `forms.editor.unsaved`; this plan's fill-in form uses it with `{entity}.form.discard` (Web). This plan only imports the hook, so its scope does not change. |
| G-8 | This spec §6 step 5; SPEC-0004 §6 | §6 step 5 lists the system-attribute rules after the custom values. SPEC-0004 §6 checks name, e-mail and phone before them. | **Open.** Proposal: SPEC-0004's order wins for clients; the two-phase service allows it (Decision 2). SPEC-0005 has no order yet. |
| G-9 | SPEC-0005 status | SPEC-0005 is Draft, with provisional criteria. The service side of every deferred criterion, and the `/services` pages, wait for it. | **Open.** Proposal: no change here. The service is type-agnostic and tested with service templates. SPEC-0003 stays partly verified for services until SPEC-0005 ships. |

### Risks

1. **SPEC-0001's implementation departs from G-1 to G-4.** The owner decided them and they are in SPEC-0001's plan
   (2026-11-10), but if the code differs, this plan's encoding, counts or locks disagree with it. Cheapest check: at
   SPEC-0001's `/done`, compare the cipher plaintext, the `yes_no` rows, the delete lock and the order of the
   "Atualizar todos" statements with its plan, and amend this plan before `/implement SPEC-0003`.
2. **Most API criteria are only partly verified until SPEC-0004 and SPEC-0005** (§2). HTTP-only behavior (the pipe on
   each controller, guards, 201 and 200, logs over HTTP) can still break there. Cheapest check: SPEC-0004's plan
   maps every row of Deferred checks; the service keeps controllers thin.
3. **SPEC-0005 is Draft** (G-9).
4. **Zod issue order.** §6 step 1 depends on the first issue Zod reports. Zod follows the schema's key order and
   skips object-level checks while a field fails, which may not match Decision 12 by itself. U-req checks each
   adjacent pair of Decision 12 (Tests); a mismatch is fixed in the envelope schemas, never in the test.
5. **The component interface is shared** with SPEC-0004 and SPEC-0005 (`RecordAdapter`, `systemFields`,
   `extraFields`). Cheapest check: draft SPEC-0004's plan against "What SPEC-0004 and SPEC-0005 rely on" before
   step 5 here.
6. **Anatel's DDD list** is copied by hand (67 codes). The owner checks it against Anatel's published list before
   step 1. A later change to the list amends the contract, not this plan.
7. **Values leaving the process.** The module logs nothing and its errors carry keys only. `@nestjs/observe`
   (`app.module.ts`) ships traces and captured errors off the process; a grep of version 0.1.8's HTTP agent found no
   request-body capture. Cheapest check: AC-0003-20's log capture, and reading Observe's error capture before
   step 4. SPEC-0004 R13 names Sentry; the API uses Observe, which is SPEC-0004's to reconcile.
8. **Deadlocks.** A create locks the template (`for share`) and then inserts. An update locks only its record.
   "Atualizar todos" locks the template, then the records. No lock cycle, and the R7 race test runs the create path.
9. **E2e needs Docker** (Testcontainers). Without it, step 7 runs only the unit and web tests, and says so.

### New dependencies

None. Masks, CPF check digits and the DDD list are written here. `Intl`, `node:crypto`, react-hook-form,
`@hookform/resolvers`, `@base-ui/react` and Drizzle are already in use.

## 12. Changelog

| Version | Date | Change |
| --- | --- | --- |
| 0.1 | 2026-11-09 | Draft |
| 0.2 | 2026-11-09 | Owner answer D-8 recorded; `first_name` removed; AC-0003-04, -05, -07 agreed |
| 0.3 | 2026-11-09 | Template versioning (owner, D-10): records linked to a version; migration rules (R13); archived-field display removed; AC-0003-10, -14, -15, -16 rewritten; AC-0003-17 rewritten; AC-0003-23 to -26 added; criteria changes pending owner review |
| 0.4 | 2026-11-09 | Owner Joao Izidoro set |
| 0.5 | 2026-11-09 | Owner decision (SPEC-0001 review round 2): length keys use `.max` (`value.max`); schema vs metadata is now SPEC-0001 §3.3 |
| 0.6 | 2026-11-09 | Owner decisions (SPEC-0003 review): Q2, Q4 and Q5 decided (R7, R9, §3.1); well-formed but unknown or other-tenant ids (`formId.invalid`, `value.unknown-field`) use 400, malformed ids stay 422; copy keys are per entity (`{entity}.form.*`, `{entity}.view.*`); consent attestation belongs to SPEC-0004 (§2); record revision (R14, `record.revision-conflict`, `recordRevision.required`, `revision` in the contract). Review fixes: `select` accepts options of the linked version; `formVersion` and `values` errors; tenant-context errors (§5); load-error, not-found, revision-conflict and toast states (§4, §8); address paths and "trimmed" (§3.1, §6); AC-0003-05, -14, -17 and -25 split (new -27 to -30). AC-0003-01, -03, -05, -10, -13, -14, -17, -21, -23 and -25 changed; AC-0003-27 to -62 added; empty Provisional section removed; all pending owner review |
| 0.7 | 2026-11-09 | Owner confirmed the R14 revision rules (starts at 1, goes up on every stored change including migration, not on inactivate or reactivate), the precedence of `record.form-changed` over `record.revision-conflict` (§6), and the keys `formVersion.required`, `formVersion.invalid`, `values.invalid` and `recordRevision.required` |
| 0.8 | 2026-11-09 | Owner Joao Izidoro approved all pending criteria (AC-0003-01, -03, -05, -10, -13 to -17, -21, -23 to -62); all 62 criteria agreed |
| 0.9 | 2026-11-09 | R10 trace names the RFC §6 section correctly ("Auditoria e Monitoramento"); no behavior change |
| 0.10 | 2026-11-09 | Owner decisions (SPEC-0003 review round 2): check order (§6); `yes_no` with no value is false everywhere and `null` means no value (R3, §3.1, §4.2, §7); a system field's id in `values` gets 422 `value.unknown-field` (R5); `missingRequired` includes system fields and R6 covers fields turned required; R3 and the §3.1 limits accepted (§9 Q6: Anatel DDD list, lowercase UF stored uppercase); record audit events out of scope; template unavailable on save (§4.1 step 7, §8); dropped `select` choices on reload (§4.4); lists hide all custom values (R9). Review fixes: RN-01 and RNF-07 in `satisfies`; Dependencies note (§2); `formId.required`, `formId.not-allowed` and `recordRevision.invalid` (§6); `gherkin` and `scope` fences. AC-0003-06, -10, -22, -26 and -44 reworded and AC-0003-63 to -96 added, pending owner review |
| 1.0 | 2026-11-09 | Approved by Joao Izidoro, 2026-11-09, with all 96 criteria agreed |
